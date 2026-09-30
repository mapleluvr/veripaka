import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import os from 'node:os';

const cli = path.resolve(process.env.VERIPAKA_TEST_CLI ?? fileURLToPath(new URL('../src/cli/main.js', import.meta.url)));
const launcher = path.resolve(process.env.VERIPAKA_TEST_LAUNCHER ?? fileURLToPath(new URL('../../skills/_shared/run-veripaka.mjs', import.meta.url)));
const reference = fileURLToPath(new URL('../../examples/backend/', import.meta.url));
const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function kill(pid: number) {
  if (!alive(pid)) return;
  if (process.platform === 'win32') await new Promise(resolve => spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }).once('close', resolve));
  else { try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} } }
}
async function waitFor<T>(read: () => Promise<T | undefined>, message: string): Promise<T> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) return value;
    await delay(25);
  }
  throw new Error(message);
}
async function fixture(t: TestContext, name: string) {
  const base = process.env.VERIPAKA_TEST_ARTIFACTS ?? os.tmpdir();
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, `veripaka-${name}-`));
  await cp(reference, root, { recursive: true, filter: source => !source.split(path.sep).includes('.veripaka') });
  const children: ChildProcess[] = [];
  const pids: number[] = [];
  const calls: unknown[] = [];
  t.after(async () => {
    for (const pid of [...pids, ...children.flatMap(c => c.pid ? [c.pid] : [])]) await kill(pid);
    if (process.env.VERIPAKA_TEST_ARTIFACTS) await writeFile(path.join(root, 'lifecycle-calls.json'), JSON.stringify(calls, null, 2));
    else await rm(root, { recursive: true, force: true });
  });
  function start(args: string[], entry = cli) {
    const child = spawn(process.execPath, [entry, '--project', root, ...args, '--json'], { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    children.push(child);
    let stdout = ''; let stderr = '';
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    return new Promise<{ code: number | null; data?: any; error?: any; stdout: string }>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', code => {
        let response: any;
        try { response = JSON.parse(stdout); } catch { response = {}; }
        calls.push({ entry, args, code, stdout, stderr });
        resolve({ code, ...response, stdout });
      });
    });
  }
  async function prepare() {
    const response = await start(['apply', 'backend', '--input', 'verification-input.json']);
    assert.equal(response.code, 0, response.stdout);
    return response.data.runId as string;
  }
  async function longTask() {
    await writeFile(path.join(root, 'tests/settings.test.mjs'), `import test from 'node:test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
test('api rejects unsupported theme without changing stored state', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
  await writeFile(new URL('../.veripaka/child-pid.json', import.meta.url), JSON.stringify({pid: child.pid}));
  await new Promise(() => {});
});
`);
  }
  async function started(runId: string) {
    const pid = await waitFor(async () => {
      try { return JSON.parse(await readFile(path.join(root, '.veripaka/child-pid.json'), 'utf8')).pid as number; } catch { return undefined; }
    }, 'Real owned grandchild did not start');
    pids.push(pid);
    const execution = await waitFor(async () => {
      try { const value = JSON.parse(await readFile(path.join(root, '.veripaka/runs', runId, 'execution.json'), 'utf8')); return value.pid ? value : undefined; } catch { return undefined; }
    }, 'Managed runner PID not recorded');
    pids.push(execution.pid);
    assert.equal(alive(pid), true);
    return { pid, execution };
  }
  return { root, calls, start, prepare, longTask, started };
}

// Break caught: a cancellation request must reach the active owner despite its project lock,
// never kill a different prepared run, and must not release ownership before tree cleanup.
test('explicit cancellation owns cleanup and leaves the other prepared run untouched', { timeout: 30_000 }, async t => {
  const f = await fixture(t, 'cancel');
  await f.longTask();
  const first = await f.prepare(); const second = await f.prepare();
  assert.equal((await f.start(['run', 'cancel', first])).error?.code, 'RUN_NOT_RUNNING');
  const running = f.start(['run', first], launcher);
  const { pid, execution } = await f.started(first);
  assert.equal((await f.start(['run', second])).error?.code, 'PROJECT_BUSY');
  assert.equal((await f.start(['run', 'cancel', second])).error?.code, 'RUN_NOT_RUNNING');
  assert.equal(alive(pid), true, 'Cancelling a prepared run must not kill the active run');
  const cancelled = await f.start(['run', 'cancel', first]);
  assert.equal(cancelled.code, 3, cancelled.stdout);
  assert.equal(cancelled.data?.status, 'cancellation-requested');
  const result = await running;
  assert.equal(result.code, 3, result.stdout);
  assert.equal(result.data?.reason, 'CANCELLED');
  assert.equal(result.data?.verdict, 'inconclusive');
  assert.equal(result.data?.execution, 'interrupted');
  const record = JSON.parse(await readFile(path.join(f.root, '.veripaka/runs', first, 'execution.json'), 'utf8'));
  assert.equal(record.cleanup, 'terminated');
  await waitFor(async () => !alive(pid) && !alive(execution.pid) ? true : undefined, 'Cancellation left an owned process alive');
  await assert.rejects(readFile(path.join(f.root, '.veripaka/locks/execution/owner.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(f.root, '.veripaka/runs', second, 'execution.json')), { code: 'ENOENT' });
  assert.deepEqual((await f.start(['run', 'finalize', first])).data, result.data, 'Intact cancelled terminal results are idempotent');
  assert.equal((await f.start(['run', 'cancel', first])).error?.code, 'RUN_NOT_RUNNING');
  f.calls.push({ observed: { grandchildAlive: alive(pid), runnerAlive: alive(execution.pid), cleanup: record.cleanup } });
  if (record.artifacts) {
    await rm(path.join(f.root, '.veripaka/runs', first, record.artifacts.stdout));
    const damaged = await f.start(['run', 'finalize', first]);
    assert.equal(damaged.code, 3);
    assert.equal(damaged.data, undefined, 'Idempotence must not bypass interrupted-artifact integrity checks');
  }
});

// Break caught: the launcher used to kill the CLI before it could seal a result/release its lock.
// This injects a Node signal event, NOT a claim that Windows process.kill delivers POSIX signals.
test('launcher SIGINT handler allows the CLI to finalize cancellation', { timeout: 30_000 }, async t => {
  const f = await fixture(t, 'launcher-signal');
  await f.longTask();
  const id = await f.prepare();
  const trigger = path.join(f.root, '.veripaka/signal');
  const wrapper = path.join(f.root, '.veripaka/signal-wrapper.mjs');
  await writeFile(wrapper, `import {existsSync} from 'node:fs';
const timer = setInterval(() => { if (existsSync(${JSON.stringify(trigger)})) { clearInterval(timer); process.emit('SIGINT'); } }, 25);
await import(${JSON.stringify(pathToFileURL(launcher).href)});
`);
  const running = f.start(['run', id], wrapper);
  const { pid } = await f.started(id);
  await writeFile(trigger, 'cancel');
  const result = await running;
  assert.equal(result.data?.reason, 'CANCELLED', `Launcher lost the terminal result: ${result.stdout}`);
  assert.equal(result.data?.verdict, 'inconclusive');
  assert.equal(result.code, 3);
  assert.equal(alive(pid), false);
  await assert.rejects(readFile(path.join(f.root, '.veripaka/locks/execution/owner.json')), { code: 'ENOENT' });
});
