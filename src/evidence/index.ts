import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { parse } from 'yaml';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Execution, Plan, Result } from '../contracts.js';
import { atomicJson, exists, fileDigest, readSealed, safePath, VError, writeSealed } from '../files.js';
import { assertCurrent, loadPlan } from '../planning/index.js';
import { acquire } from '../execution/lock.js';
import { assertArtifacts, evaluate } from './node-test.js';

export async function finalizeLocked(root: string, runId: string): Promise<Result> {
  const { plan, directory, planDigest } = await loadPlan(root, runId);
  const resultFile = await safePath(directory, 'result.json', false);
  const executionFile = await safePath(directory, 'execution.json', false);
  let execution: Execution | undefined;
  let checks: Result['checks'] = plan.checks.map(c => ({ key: c.key, required: c.required, expected: c.expected, observed: 'No complete managed invocation', status: 'inconclusive', evidence: [] }));
  let reason: string | undefined;
  let verification: Result['provenance']['verification'] = 'unknown';
  try {
    if (await exists(executionFile)) {
      execution = await readSealed<Execution>(executionFile);
      if (execution.schema !== 'veripaka.execution/v0' || execution.runId !== runId || execution.planDigest !== planDigest || execution.executable !== plan.runtime.executable || execution.cwd !== plan.projectRoot) throw new VError('EXECUTION_IDENTITY_MISMATCH', 'Execution is not associated with this plan', 3);
    }
    await assertCurrent(plan);
    if (execution) {
      if (execution.status === 'completed') {
        checks = await evaluate(directory, plan, execution);
        verification = 'verified';
      } else reason = execution.reason ?? 'EXECUTION_INCOMPLETE';
    } else reason = 'NOT_STARTED';
  } catch (error) {
    verification = 'mismatch';
    reason = error instanceof VError ? error.code : 'INVALID_OR_MISSING_EVIDENCE';
  }
  // A historical terminal result is never rewritten. Its evidence must still be intact to reuse it.
  if (await exists(resultFile)) {
    if (verification === 'mismatch') throw new VError(reason!, 'Cannot reuse the terminal result with missing, changed or stale evidence', 3);
    if (execution?.artifacts) await assertArtifacts(directory, execution);
    return await readSealed<Result>(resultFile);
  }
  const required = checks.filter(c => c.required);
  const verdict: Result['verdict'] = required.some(c => c.status === 'fail') ? 'fail'
    : execution?.status === 'blocked' ? 'blocked'
    : !reason && required.length > 0 && required.every(c => c.status === 'pass') ? 'scoped-pass' : 'inconclusive';
  const result: Result = {
    schema: 'veripaka.result/v0', runId, kind: 'verification', verdict, verdictBasis: 'executable',
    execution: execution?.status ?? 'not-started', ...(reason ? { reason } : {}), subject: plan.subject, checks,
    goals: plan.input.goals,
    limits: [
      'Only the declared local source domain and mapped checks were assessed; coverage sufficiency is not mechanically proved.',
      'The reference tests establish their local source-to-service relationship; arbitrary existing endpoints are unsupported.',
      'Digests and managed capture are not protection against a malicious writer with the same OS permissions.',
      'Trial recipe maturity is not upgraded by this result.',
    ],
    provenance: { producer: execution?.pid ? 'node:test' : 'none', ingestion: execution?.pid ? 'managed-command' : 'none', verification, judge: 'executable', ...(execution?.pid ? { invocationId: execution.invocationId } : {}) },
    finalizedAt: new Date().toISOString(),
  };
  await writeSealed(resultFile, result);
  return result;
}
export async function finalize(root: string, runId: string): Promise<Result> {
  const release = await acquire(root);
  try { return await finalizeLocked(root, runId); } finally { await release(); }
}
export async function collect(root: string, runId: string, input: string) {
  const release = await acquire(root);
  try {
    const { directory } = await loadPlan(root, runId);
    if (await exists(await safePath(directory, 'result.json', false))) throw new VError('RUN_FINALIZED', 'New material requires a new run');
    const file = await safePath(root, input);
    if ((await stat(file)).size > 1_048_576) throw new VError('IMPORT_TOO_LARGE', 'Observation import limited to 1 MiB');
    const supplied: unknown = parse(await readFile(file, 'utf8'));
    const id = randomUUID();
    const destination = await safePath(directory, `imports/${id}.json`, false);
    await atomicJson(destination, { id, receivedAt: new Date().toISOString(), sourceDigest: await fileDigest(file), producer: 'caller-declared', ingestion: 'file-import', verification: 'unknown', material: supplied });
    return { id, ingestion: 'file-import', verification: 'unknown', acceptedAsExecutableEvidence: false, nextAction: 'Run the managed command. Imported claims do not satisfy required executable evidence.' };
  } finally { await release(); }
}
export const verdictExitCode = (result: Result): number => result.verdict === 'scoped-pass' ? 0 : result.verdict === 'fail' ? 1 : 3;
