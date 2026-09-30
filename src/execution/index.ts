import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Execution, Result } from '../contracts.js';
import { atomicJson, exists, fileDigest, safePath, VError, writeSealed } from '../files.js';
import { assertCurrent, loadPlan } from '../planning/index.js';
import { finalizeLocked } from '../evidence/index.js';
import { acquire } from './lock.js';

async function terminateTree(child: ChildProcess): Promise<'terminated' | 'unknown'> {
  if (!child.pid) return 'unknown';
  if (process.platform === 'win32') {
    return await new Promise(resolve => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.once('error', () => resolve('unknown'));
      killer.once('exit', code => resolve(code === 0 ? 'terminated' : 'unknown'));
    });
  }
  try { process.kill(-child.pid, 'SIGKILL'); return 'terminated'; }
  catch { return 'unknown'; }
}

// Cancellation must bypass the execution lock: the owner retains it until cleanup finishes.
// Acknowledgement means requested, not terminated; the original run owns the final result.
export async function cancel(root: string, runId: string) {
  const { directory, planDigest } = await loadPlan(root, runId);
  const file = await safePath(directory, 'execution.json', false);
  if (!await exists(file) || await exists(await safePath(directory, 'result.json', false))) throw new VError('RUN_NOT_RUNNING', 'Only an active run can receive a cancellation request', 3);
  const execution: Execution = JSON.parse(await readFile(file, 'utf8'));
  if (execution.schema !== 'veripaka.execution/v0' || execution.runId !== runId || execution.planDigest !== planDigest || execution.status !== 'running' || !execution.invocationId) throw new VError('RUN_NOT_RUNNING', 'No active invocation for this plan', 3);
  await atomicJson(await safePath(directory, 'cancel.json', false), { schema: 'veripaka.cancel/v0', runId, invocationId: execution.invocationId, planDigest, requestedAt: new Date().toISOString() });
  return { runId, status: 'cancellation-requested', nextAction: 'Wait for the original run to return its result; inspect execution.cleanup before recovering any retained lock.' };
}

export async function run(root: string, runId: string, captureOnly = false): Promise<Result | { runId: string; status: string; nextAction: string }> {
  const release = await acquire(root);
  let retainLock = false;
  try {
    const { plan, directory, planDigest } = await loadPlan(root, runId);
    const executionPath = await safePath(directory, 'execution.json', false);
    if (await exists(executionPath) || await exists(await safePath(directory, 'result.json', false))) throw new VError('RUN_ALREADY_STARTED', 'Apply a new plan instead of reusing a started run');
    try { await assertCurrent(plan); }
    catch (error) {
      const blocked: Execution = {
        schema: 'veripaka.execution/v0', runId, attemptId: randomUUID(), invocationId: randomUUID(), planDigest,
        startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), executable: plan.runtime.executable,
        argv: [], cwd: root, exitCode: null, signal: null, status: 'blocked', cleanup: 'not-needed', reason: error instanceof VError ? error.code : 'PREFLIGHT_FAILED',
      };
      await writeSealed(executionPath, blocked);
      return await finalizeLocked(root, runId);
    }
    const attemptId = randomUUID();
    const invocationId = randomUUID();
    const attempt = await safePath(directory, `attempts/${attemptId}`, false);
    await mkdir(attempt, { recursive: true });
    const eventsFile = path.join(attempt, 'events.ndjson');
    const cancelFile = await safePath(directory, 'cancel.json', false);
    const argv = ['--test', '--test-concurrency=1', '--test-reporter', pathToFileURL(plan.runtime.reporterPath).href, '--test-reporter-destination', eventsFile, ...plan.binding.testFiles];
    const execution: Execution = {
      schema: 'veripaka.execution/v0', runId, attemptId, invocationId, planDigest,
      startedAt: new Date().toISOString(), executable: plan.runtime.executable, argv, cwd: plan.projectRoot,
      exitCode: null, signal: null, status: 'running', cleanup: 'not-needed',
    };
    await atomicJson(executionPath, execution);
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.NODE_PATH;
    delete env.NODE_TEST_CONTEXT;
    Object.assign(env, { VERIPAKA_RUN_ID: runId, VERIPAKA_ATTEMPT_ID: attemptId, VERIPAKA_INVOCATION_ID: invocationId, VERIPAKA_PLAN_DIGEST: planDigest, VERIPAKA_MAX_OUTPUT_BYTES: String(plan.binding.maxOutputBytes) });
    const child = spawn(plan.runtime.executable, argv, { cwd: plan.projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
    execution.pid = child.pid;
    const output: Record<'stdout' | 'stderr', Buffer[]> = { stdout: [], stderr: [] };
    let outputSize = 0;
    let stopReason: string | undefined;
    let closed = false;
    let finished = false;
    let stopping: Promise<void> | undefined;
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = () => { if (!finished) { finished = true; resolve(); } }; });
    const stop = (reason: string): void => {
      if (stopping || closed) return;
      stopReason = reason;
      stopping = (async () => {
        execution.cleanup = await terminateTree(child);
        if (execution.cleanup === 'unknown') {
          retainLock = true;
          child.unref();
          child.stdout?.destroy(); child.stderr?.destroy();
          finish();
        } else if (closed) finish();
      })();
      void stopping.catch(() => { execution.cleanup = 'unknown'; retainLock = true; finish(); });
    };
    child.once('error', error => { stopReason = `SPAWN_ERROR: ${error.message}`; finish(); });
    child.once('close', (code, signal) => {
      closed = true; execution.exitCode = code; execution.signal = signal;
      if (stopping) void stopping.then(finish, finish); else finish();
    });
    for (const stream of ['stdout', 'stderr'] as const) child[stream]!.on('data', (chunk: Buffer) => {
      const remaining = Math.max(0, plan.binding.maxOutputBytes - outputSize);
      if (remaining > 0) output[stream].push(chunk.subarray(0, remaining));
      outputSize += chunk.length;
      if (outputSize > plan.binding.maxOutputBytes) stop('OUTPUT_LIMIT');
    });
    const timeout = setTimeout(() => stop('TIMEOUT'), plan.binding.timeoutMs);
    const poll = setInterval(() => {
      void stat(eventsFile).then(s => { if (s.size > plan.binding.maxOutputBytes) stop('OUTPUT_LIMIT'); }).catch(() => {});
      void readFile(cancelFile, 'utf8').then(text => {
        const request = JSON.parse(text);
        if (request.schema === 'veripaka.cancel/v0' && request.runId === runId && request.invocationId === invocationId && request.planDigest === planDigest) stop('CANCELLED');
      }).catch(() => {});
    }, 100);
    const interrupt = () => stop('CANCELLED');
    process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
    try {
      await atomicJson(executionPath, execution);
      await done;
    } finally {
      clearTimeout(timeout); clearInterval(poll);
      process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
    }
    execution.endedAt = new Date().toISOString();
    execution.status = execution.cleanup === 'unknown' ? 'indeterminate' : stopReason || execution.signal ? 'interrupted' : 'completed';
    if (stopReason) execution.reason = stopReason;
    if (execution.signal && !execution.reason) execution.reason = `SIGNAL_${execution.signal}`;
    await writeFile(path.join(attempt, 'stdout.log'), Buffer.concat(output.stdout), { flag: 'wx' });
    await writeFile(path.join(attempt, 'stderr.log'), Buffer.concat(output.stderr), { flag: 'wx' });
    if (await exists(eventsFile)) {
      execution.artifacts = { events: `attempts/${attemptId}/events.ndjson`, stdout: `attempts/${attemptId}/stdout.log`, stderr: `attempts/${attemptId}/stderr.log` };
      execution.digests = { events: await fileDigest(eventsFile), stdout: await fileDigest(path.join(attempt, 'stdout.log')), stderr: await fileDigest(path.join(attempt, 'stderr.log')) };
    } else { execution.reason ??= 'MISSING_REPORT'; }
    await writeSealed(executionPath, execution);
    if (captureOnly) return { runId, status: 'captured-not-finalized', nextAction: `run finalize ${runId}` };
    return await finalizeLocked(root, runId);
  } finally {
    if (!retainLock) await release();
  }
}
