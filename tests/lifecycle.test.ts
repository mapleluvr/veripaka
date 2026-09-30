import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import os from 'node:os';

const cli = path.resolve(process.env.VERIPAKA_TEST_CLI ?? fileURLToPath(new URL('../src/cli/main.js', import.meta.url)));
const reference = fileURLToPath(new URL('../../examples/backend/', import.meta.url));
function start(root: string, args: string[]) {
  const child = spawn(process.execPath, [cli, '--project', root, ...args, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
  return new Promise<{ code: number | null; data: any; error: any }>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => { try { assert.equal(stderr, ''); resolve({ code, ...JSON.parse(stdout) }); } catch (e) { reject(e); } });
  });
}
function alive(pid: number): boolean { try { process.kill(pid, 0); return true; } catch { return false; } }

test('owned process tree times out and a second project invocation is busy', { timeout: 20_000 }, async t => {
  const root = await mkdtemp(path.join(process.env.VERIPAKA_TEST_ARTIFACTS ?? os.tmpdir(), 'veripaka-lifecycle-'));
  await cp(reference, root, { recursive: true, filter: source => !source.split(path.sep).includes('.veripaka') });
  if (!process.env.VERIPAKA_TEST_ARTIFACTS) t.after(() => rm(root, { recursive: true, force: true }));
  const config = path.join(root, 'docs/verification/project.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('timeoutMs: 15000', 'timeoutMs: 3500'));
  await writeFile(path.join(root, 'tests/settings.test.mjs'), `import test from 'node:test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
test('api rejects unsupported theme without changing stored state', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
  await writeFile(new URL('../.veripaka/child-pid.json', import.meta.url), JSON.stringify({pid: child.pid}));
  await new Promise(() => {});
});
`);
  const first = await start(root, ['apply', 'backend', '--input', 'verification-input.json']);
  const second = await start(root, ['apply', 'backend', '--input', 'verification-input.json']);
  assert.equal(first.code, 0); assert.equal(second.code, 0);
  const running = start(root, ['run', first.data.runId]);
  const pidFile = path.join(root, '.veripaka/child-pid.json');
  let pid = 0;
  for (let i = 0; i < 100; i++) {
    try { pid = JSON.parse(await readFile(pidFile, 'utf8')).pid; if (pid) break; } catch {}
    await delay(20);
  }
  assert.ok(pid > 0, 'The owned grandchild must actually start');
  assert.ok(alive(pid));
  t.after(async () => {
    if (!alive(pid)) return;
    if (process.platform === 'win32') {
      await new Promise(resolve => spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }).once('close', resolve));
    } else process.kill(pid, 'SIGKILL');
  });
  const busy = await start(root, ['run', second.data.runId]);
  assert.equal(busy.error?.code, 'PROJECT_BUSY');
  const result = await running;
  assert.equal(result.code, 3, JSON.stringify(result));
  assert.equal(result.data.verdict, 'inconclusive');
  assert.equal(result.data.reason, 'TIMEOUT');
  assert.equal(result.data.execution, 'interrupted');
  for (let i = 0; i < 50 && alive(pid); i++) await delay(20);
  assert.equal(alive(pid), false, 'Timeout must terminate the actual owned grandchild, not only its parent');
  assert.deepEqual((await start(root, ['run', 'finalize', first.data.runId])).data, result.data, 'An intact interrupted terminal result must remain readable');
});
