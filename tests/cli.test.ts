import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const cli = fileURLToPath(new URL('../src/cli/main.js', import.meta.url));
const reference = fileURLToPath(new URL('../../examples/backend/', import.meta.url));
interface Envelope { data?: any; error?: { code: string; message: string }; ok: boolean }
async function invoke(root: string, args: string[]) {
  const child = spawn(process.execPath, [cli, '--project', root, ...args, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  assert.equal(stderr, '', `CLI leaked unexpected stderr: ${stderr}`);
  let value: Envelope;
  try { value = JSON.parse(stdout); } catch { throw new Error(`Invalid JSON stdout (exit ${code}): ${stdout}`); }
  return { code, ...value };
}
async function fixture(t: TestContext): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'veripaka-cli-'));
  await cp(reference, root, { recursive: true, filter: source => !source.split(path.sep).includes('.veripaka') });
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function prepare(root: string): Promise<string> {
  const response = await invoke(root, ['apply', 'backend', '--input', 'verification-input.json']);
  assert.equal(response.code, 0, JSON.stringify(response));
  return response.data.runId as string;
}
async function replace(root: string, file: string, before: string, after: string) {
  const destination = path.join(root, file);
  const text = await readFile(destination, 'utf8');
  assert.ok(text.includes(before), `Mutation point missing: ${before}`);
  await writeFile(destination, text.replace(before, after));
}

test('create/find/show/lint and real command pass preserve uncovered goals', async t => {
  const root = await fixture(t);
  assert.equal((await invoke(root, ['init'])).code, 0);
  assert.equal((await invoke(root, ['init'])).data.created.length, 0);
  assert.equal((await invoke(root, ['recipe', 'new', 'new-method'])).code, 0);
  assert.equal((await invoke(root, ['recipe', 'show', 'new-method'])).data.recipe.status, 'draft');
  assert.equal((await invoke(root, ['recipe', 'lint'])).code, 0);
  assert.equal((await invoke(root, ['find', 'settings'])).data.length, 2);
  const id = await prepare(root);
  const result = await invoke(root, ['run', id]);
  assert.equal(result.code, 0, JSON.stringify(result));
  assert.equal(result.data.verdict, 'scoped-pass');
  assert.equal(result.data.checks.length, 2);
  assert.equal(result.data.provenance.verification, 'verified');
  assert.match(result.data.goals[2].uncovered, /Not promised/);
  assert.deepEqual((await invoke(root, ['run', 'finalize', id])).data, result.data);
  assert.equal((await invoke(root, ['run', id])).error?.code, 'RUN_ALREADY_STARTED');
});

for (const [label, before, after, failedKey] of [
  ['boundary', "if (!settings || !['light', 'dark'].includes(settings.theme))", 'if (false)', 'api-contract/reject-invalid-theme'],
  ['persistence', 'await writeFile(file, JSON.stringify({ theme: settings.theme }));', '/* intentionally omit the real persistence write in this bad object */', 'settings-persistence/survives-restart'],
] as const) test(`known-bad ${label} object fails its real behavior check`, async t => {
  const root = await fixture(t);
  await replace(root, 'src/server.mjs', before, after);
  const id = await prepare(root);
  const result = await invoke(root, ['run', id]);
  assert.equal(result.code, 1, JSON.stringify(result));
  assert.equal(result.data.verdict, 'fail');
  assert.equal(result.data.checks.find((c: any) => c.key === failedKey).status, 'fail');
});

test('source change after apply is blocked rather than called a current pass', async t => {
  const root = await fixture(t);
  const id = await prepare(root);
  await writeFile(path.join(root, 'src', 'new-file.mjs'), 'export const changed = true;\n');
  const result = await invoke(root, ['run', id]);
  assert.equal(result.code, 3);
  assert.equal(result.data.verdict, 'blocked');
  assert.equal(result.data.reason, 'SOURCE_DRIFT');
});

test('missing named required check cannot be filled by unrelated passing tests', async t => {
  const root = await fixture(t);
  await replace(root, 'docs/verification/recipes/settings-persistence/RECIPE.md', 'name: settings survive service restart', 'name: a required test that does not exist');
  const result = await invoke(root, ['run', await prepare(root)]);
  assert.equal(result.code, 3);
  assert.equal(result.data.verdict, 'inconclusive');
  assert.equal(result.data.checks.find((c: any) => c.key === 'settings-persistence/survives-restart').status, 'inconclusive');
});

test('plain PASS stdout cannot masquerade as a named test result', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'tests/settings.test.mjs'), 'console.log("PASS");\n');
  const result = await invoke(root, ['run', await prepare(root)]);
  assert.equal(result.code, 3);
  assert.equal(result.data.verdict, 'inconclusive');
});

test('all skipped tests do not form a scoped pass', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'tests/settings.test.mjs'), "import test from 'node:test';\ntest('api rejects unsupported theme without changing stored state', {skip: true}, () => {});\ntest('settings survive service restart', {skip: true}, () => {});\n");
  const result = await invoke(root, ['run', await prepare(root)]);
  assert.equal(result.code, 3);
  assert.ok(result.data.checks.every((c: any) => c.status === 'inconclusive'));
});

test('a prior run report cannot replace this invocation evidence', async t => {
  const root = await fixture(t);
  const first = await prepare(root);
  assert.equal((await invoke(root, ['run', first])).code, 0);
  const second = await prepare(root);
  assert.equal((await invoke(root, ['run', second, '--capture-only'])).code, 3);
  const directory = path.join(root, '.veripaka/runs');
  const previous = JSON.parse(await readFile(path.join(directory, first, 'execution.json'), 'utf8'));
  const current = JSON.parse(await readFile(path.join(directory, second, 'execution.json'), 'utf8'));
  await cp(path.join(directory, first, previous.artifacts.events), path.join(directory, second, current.artifacts.events));
  const result = await invoke(root, ['run', 'finalize', second]);
  assert.equal(result.code, 3);
  assert.equal(result.data.reason, 'EVIDENCE_DIGEST_MISMATCH');
  assert.equal(result.data.verdict, 'inconclusive');
});

test('deleted managed evidence and imported trust claims cannot produce pass', async t => {
  const root = await fixture(t);
  const id = await prepare(root);
  assert.equal((await invoke(root, ['run', id, '--capture-only'])).code, 3);
  const directory = path.join(root, '.veripaka/runs', id);
  const execution = JSON.parse(await readFile(path.join(directory, 'execution.json'), 'utf8'));
  await rm(path.join(directory, execution.artifacts.events));
  const result = await invoke(root, ['run', 'finalize', id]);
  assert.equal(result.code, 3);
  assert.equal(result.data.verdict, 'inconclusive');

  const importedRun = await prepare(root);
  await writeFile(path.join(root, 'self-report.json'), JSON.stringify({ verdict: 'scoped-pass', ingestion: 'managed-command', invocationId: execution.invocationId, verification: 'verified' }));
  const imported = await invoke(root, ['run', 'collect', importedRun, '--input', 'self-report.json']);
  assert.equal(imported.data.acceptedAsExecutableEvidence, false);
  assert.equal(imported.data.verification, 'unknown');
  const importedResult = await invoke(root, ['run', 'finalize', importedRun]);
  assert.equal(importedResult.code, 3);
  assert.equal(importedResult.data.reason, 'NOT_STARTED');
  assert.equal(importedResult.data.provenance.ingestion, 'none');
});

test('empty required sets, unsupported modes and unsafe paths stop before execution', async t => {
  const root = await fixture(t);
  await replace(root, 'docs/verification/recipes/api-contract/RECIPE.md', 'required: true', 'required: false');
  assert.equal((await invoke(root, ['apply', 'backend', '--input', 'verification-input.json'])).error?.code, 'EMPTY_REQUIRED_SET');
  await replace(root, 'docs/verification/recipes/api-contract/RECIPE.md', 'mode: command', 'mode: agent-guided');
  assert.equal((await invoke(root, ['apply', 'backend', '--input', 'verification-input.json'])).error?.code, 'HOST_REQUIRED');
  assert.equal((await invoke(root, ['apply', 'backend', '--input', '../outside.json'])).error?.code, 'UNSAFE_PATH');
});
