import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { CheckResult, Execution, Plan } from '../contracts.js';
import { fileDigest, safePath, slash, VError } from '../files.js';

const rowSchema = z.object({ kind: z.enum(['start', 'event', 'end']) }).passthrough();
const eventSchema = z.object({ type: z.string(), data: z.record(z.string(), z.unknown()) });
const outcomeSchema = z.object({
  name: z.string(), file: z.string(), nesting: z.number().int(),
  skip: z.union([z.boolean(), z.string()]).optional(), todo: z.union([z.boolean(), z.string()]).optional(),
  details: z.object({ type: z.string(), error: z.unknown().optional() }).passthrough(),
}).passthrough();
const summarySchema = z.object({
  success: z.boolean(),
  counts: z.object({ tests: z.number().int().nonnegative(), passed: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), todo: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(), suites: z.number().int().nonnegative() }).passthrough(),
}).passthrough();
const supportedEvents = new Set(['test:enqueue', 'test:dequeue', 'test:complete', 'test:start', 'test:pass', 'test:fail', 'test:summary', 'test:plan', 'test:diagnostic', 'test:stdout', 'test:stderr']);
function isAssertion(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const item = error as { code?: string; cause?: unknown };
  return item.code === 'ERR_ASSERTION' || isAssertion(item.cause);
}
export async function assertArtifacts(directory: string, execution: Execution): Promise<void> {
  if (!execution.artifacts || !execution.digests) throw new VError('MISSING_EVIDENCE', 'No sealed artifact manifest for this invocation', 3);
  for (const key of ['events', 'stdout', 'stderr'] as const) {
    const relative = execution.artifacts[key];
    if (relative !== `attempts/${execution.attemptId}/${key === 'events' ? 'events.ndjson' : `${key}.log`}`) throw new VError('EVIDENCE_PATH_MISMATCH', 'Artifact is not in this attempt', 3);
    if (await fileDigest(await safePath(directory, relative)) !== execution.digests[key]) throw new VError('EVIDENCE_DIGEST_MISMATCH', `Changed ${key} artifact`, 3);
  }
}
export async function evaluate(directory: string, plan: Plan, execution: Execution): Promise<CheckResult[]> {
  await assertArtifacts(directory, execution);
  const file = await safePath(directory, execution.artifacts!.events);
  const bytes = await readFile(file);
  if (bytes.length > plan.binding.maxOutputBytes) throw new VError('OUTPUT_LIMIT', 'Oversized report', 3);
  const lines = bytes.toString('utf8').trim().split('\n');
  const rows = lines.map(line => rowSchema.parse(JSON.parse(line)));
  const first = rows[0];
  const last = rows.at(-1);
  const identity = { runId: plan.runId, attemptId: execution.attemptId, invocationId: execution.invocationId, planDigest: execution.planDigest };
  if (first?.kind !== 'start' || first.schema !== 'veripaka.node-events/v0' || last?.kind !== 'end') throw new VError('INCOMPLETE_REPORT', 'Missing reporter start/end records', 3);
  for (const [key, value] of Object.entries(identity)) if (first[key] !== value || last[key] !== value) throw new VError('INVOCATION_MISMATCH', 'Report is not from this invocation', 3);
  if (first.nodeVersion !== plan.runtime.nodeVersion || last.eventCount !== rows.length - 2) throw new VError('REPORT_IDENTITY_MISMATCH', 'Reporter version/count mismatch', 3);
  const events = rows.slice(1, -1).map(row => {
    if (row.kind !== 'event') throw new VError('INVALID_EVENT_STREAM', 'Unexpected envelope inside event stream', 3);
    const event = eventSchema.parse(row.event);
    if (!supportedEvents.has(event.type)) throw new VError('UNSUPPORTED_EVENT', event.type, 3);
    return event;
  });
  const summaries = events.filter(e => e.type === 'test:summary' && e.data.file === undefined);
  if (summaries.length !== 1 || events.at(-1) !== summaries[0]) throw new VError('MISSING_RUNNER_SUMMARY', 'Expected one final native runner summary', 3);
  const summary = summarySchema.parse(summaries[0]!.data);
  if (summary.counts.tests === 0) throw new VError('NO_CASES', 'Native runner executed no tests', 3);
  if (summary.counts.suites !== 0) throw new VError('UNSUPPORTED_TEST_SHAPE', 'S1 supports named top-level tests without suites', 3);
  const outcomes = new Map<string, { type: string; data: z.infer<typeof outcomeSchema> }>();
  for (const event of events.filter(e => e.type === 'test:pass' || e.type === 'test:fail')) {
    const data = outcomeSchema.parse(event.data);
    if (data.nesting !== 0 || data.details.type !== 'test') throw new VError('UNSUPPORTED_TEST_SHAPE', 'Only unambiguous top-level test results are supported', 3);
    const relative = slash(path.relative(plan.projectRoot, data.file));
    if (!plan.binding.testFiles.map(slash).includes(relative)) throw new VError('UNBOUND_TEST_RESULT', data.file, 3);
    const key = `${relative}\0${data.name}`;
    if (outcomes.has(key)) throw new VError('DUPLICATE_TEST_RESULT', data.name, 3);
    outcomes.set(key, { type: event.type, data });
  }
  if (outcomes.size !== summary.counts.tests) throw new VError('INCOMPLETE_TEST_RESULTS', 'Result count does not match the native summary', 3);
  const checks = plan.checks.map(check => {
    const outcome = outcomes.get(`${check.file}\0${check.name}`);
    const result: CheckResult = { key: check.key, required: check.required, expected: check.expected, observed: 'Required test result is missing', status: 'inconclusive', evidence: [] };
    if (!outcome) return result;
    result.evidence = [`${execution.artifacts!.events}#${check.file}:${check.name}`];
    if (outcome.data.skip !== undefined && outcome.data.skip !== false || outcome.data.todo !== undefined && outcome.data.todo !== false) {
      result.observed = 'Test was skipped or marked todo';
    } else if (outcome.type === 'test:fail') {
      result.status = isAssertion(outcome.data.details.error) ? 'fail' : 'inconclusive';
      result.observed = JSON.stringify(outcome.data.details.error ?? { reason: 'runner-failure' });
    } else {
      result.status = 'pass'; result.observed = 'Native runner executed this named test and reported pass';
    }
    return result;
  });
  if (!summary.success || execution.exitCode !== 0) {
    for (const check of checks) if (check.status === 'pass') {
      check.status = 'inconclusive'; check.observed += '; the overall runner did not finish successfully';
    }
  }
  if (summary.success && (summary.counts.failed > 0 || summary.counts.cancelled > 0)) throw new VError('INCONSISTENT_SUMMARY', 'Native runner summary is inconsistent', 3);
  return checks;
}
