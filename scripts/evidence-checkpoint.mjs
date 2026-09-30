import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const repository = fileURLToPath(new URL('../', import.meta.url));
const cli = path.resolve(process.argv[2] ?? path.join(repository, 'dist/src/cli/main.js'));
const base = path.join(repository, '.temp', `evidence-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`);
const reference = path.join(repository, 'examples/backend');
const records = [];
await mkdir(base, { recursive: true });
async function copy(name) {
  const root = path.join(base, name);
  await cp(reference, root, { recursive: true, filter: source => !source.split(path.sep).includes('.veripaka') });
  return root;
}
async function call(root, args) {
  const child = spawn(process.execPath, [cli, '--project', root, ...args, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
  const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  const json = JSON.parse(stdout);
  records.push({ root, args, exitCode, stderr, response: json });
  await writeFile(path.join(base, 'calls.json'), JSON.stringify(records, null, 2));
  return { exitCode, ...json };
}
async function prepare(root) {
  const response = await call(root, ['apply', 'backend', '--input', 'verification-input.json']);
  assert.equal(response.exitCode, 0, JSON.stringify(response));
  return response.data.runId;
}
try {
  const normal = await copy('normal');
  const normalRun = await prepare(normal);
  assert.equal((await call(normal, ['run', normalRun])).data.verdict, 'scoped-pass');
  for (const [name, before, after] of [
    ['bad-boundary', "if (!settings || !['light', 'dark'].includes(settings.theme))", 'if (false)'],
    ['bad-persistence', 'await writeFile(file, JSON.stringify({ theme: settings.theme }));', '/* known-bad object: persistence write omitted */'],
  ]) {
    const root = await copy(name);
    const file = path.join(root, 'src/server.mjs');
    const source = await readFile(file, 'utf8');
    assert.ok(source.includes(before));
    await writeFile(file, source.replace(before, after));
    assert.equal((await call(root, ['run', await prepare(root)])).data.verdict, 'fail');
  }
  const missing = await copy('missing-evidence');
  const missingId = await prepare(missing);
  await call(missing, ['run', missingId, '--capture-only']);
  const missingDir = path.join(missing, '.veripaka/runs', missingId);
  const missingExecution = JSON.parse(await readFile(path.join(missingDir, 'execution.json'), 'utf8'));
  await rm(path.join(missingDir, missingExecution.artifacts.events));
  assert.equal((await call(missing, ['run', 'finalize', missingId])).data.verdict, 'inconclusive');

  const secondRun = await prepare(normal);
  await call(normal, ['run', secondRun, '--capture-only']);
  const runs = path.join(normal, '.veripaka/runs');
  const previous = JSON.parse(await readFile(path.join(runs, normalRun, 'execution.json'), 'utf8'));
  const current = JSON.parse(await readFile(path.join(runs, secondRun, 'execution.json'), 'utf8'));
  await cp(path.join(runs, normalRun, previous.artifacts.events), path.join(runs, secondRun, current.artifacts.events));
  assert.equal((await call(normal, ['run', 'finalize', secondRun])).data.reason, 'EVIDENCE_DIGEST_MISMATCH');

  const imported = await copy('imported-claim');
  const importedId = await prepare(imported);
  await writeFile(path.join(imported, 'claimed-result.json'), JSON.stringify({ verdict: 'scoped-pass', ingestion: 'managed-command', verification: 'verified', invocationId: previous.invocationId }));
  assert.equal((await call(imported, ['run', 'collect', importedId, '--input', 'claimed-result.json'])).data.acceptedAsExecutableEvidence, false);
  assert.equal((await call(imported, ['run', 'finalize', importedId])).data.verdict, 'inconclusive');
  await writeFile(path.join(base, 'checkpoint.json'), JSON.stringify({ completedAt: new Date().toISOString(), cli, node: process.version, platform: process.platform, scenarios: ['normal', 'bad-boundary', 'bad-persistence', 'missing-evidence', 'old-report-substitution', 'imported-claim'], status: 'passed', callsFile: 'calls.json', limits: 'Local same-permission integrity checks, not tamper-proof attestation or proof of coverage sufficiency.' }, null, 2));
  process.stdout.write(`${JSON.stringify({ status: 'passed', directory: base, calls: records.length })}\n`);
} catch (error) {
  await writeFile(path.join(base, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
  process.stderr.write(`${error.stack}\nPreserved at ${base}\n`);
  process.exitCode = 1;
}
