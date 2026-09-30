import type { TestEvent } from 'node:test/reporters';

function json(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => v instanceof Error ? { ...v, name: v.name, message: v.message, stack: v.stack, cause: v.cause } : v);
}
export default async function* reporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  const identity = {
    runId: process.env.VERIPAKA_RUN_ID,
    attemptId: process.env.VERIPAKA_ATTEMPT_ID,
    invocationId: process.env.VERIPAKA_INVOCATION_ID,
    planDigest: process.env.VERIPAKA_PLAN_DIGEST,
  };
  const maxBytes = Number(process.env.VERIPAKA_MAX_OUTPUT_BYTES);
  if (Object.values(identity).some(v => !v) || !Number.isSafeInteger(maxBytes) || maxBytes < 1024) throw new Error('Reporter requires a managed Veripaka invocation');
  let bytes = 0;
  let count = 0;
  const emit = (value: unknown): string => {
    const line = `${json(value)}\n`;
    bytes += Buffer.byteLength(line);
    if (bytes > maxBytes) throw new Error('Veripaka event output limit exceeded');
    return line;
  };
  yield emit({ kind: 'start', schema: 'veripaka.node-events/v0', ...identity, nodeVersion: process.version });
  for await (const event of source) {
    count++;
    yield emit({ kind: 'event', event });
  }
  yield emit({ kind: 'end', ...identity, eventCount: count });
}
