import { randomUUID } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { inputSchema, type Plan, type SnapshotFile } from '../contracts.js';
import { project, select, corpus } from '../catalog/index.js';
import { exists, safePath, walk, fileDigest, digest, VError, requireUnique, writeSealed, readSealed, slash } from '../files.js';

const reporterPath = fileURLToPath(new URL('../execution/node-test-reporter.js', import.meta.url));
export async function snapshot(root: string, roots: string[]): Promise<SnapshotFile[]> {
  const files = [...new Set((await Promise.all(roots.map(r => walk(root, r)))).flat())].sort();
  const result: SnapshotFile[] = [];
  let total = 0;
  for (const file of files) {
    const bytes = await readFile(await safePath(root, file));
    total += bytes.length;
    if (total > 32 * 1024 * 1024) throw new VError('SNAPSHOT_TOO_LARGE', 'S1 snapshots are limited to 32 MiB');
    result.push({ path: file, digest: digest(bytes), size: bytes.length });
  }
  return result;
}
export async function apply(root: string, selector: string, inputPath: string) {
  root = await realpath(root);
  const input = inputSchema.parse(parse(await readFile(await safePath(root, inputPath), 'utf8')));
  requireUnique(input.goals.map(g => g.id), 'goal IDs');
  const { config, relative } = await project(root);
  const { entries, profilePath } = await select(root, selector);
  const subject = config.subjects[input.subject];
  if (!subject) throw new VError('UNRESOLVED_SUBJECT', input.subject);
  if (subject.kind !== 'checkout') throw new VError('UNSUPPORTED_SUBJECT', 'S1 only supports explicitly declared local checkouts', 3);
  for (const { recipe } of entries) {
    if (recipe.kind !== 'verification' || recipe.execution.mode !== 'command') throw new VError('HOST_REQUIRED', 'Only command verification is executable in S1', 3);
    if (recipe.status === 'draft' || recipe.status === 'deprecated') throw new VError('RECIPE_NOT_APPLICABLE', `Recipe ${recipe.id} is ${recipe.status}`);
    if (!recipe.claims.some(c => c.required)) throw new VError('EMPTY_REQUIRED_SET', `Recipe ${recipe.id} has no required claims`);
    if (recipe.claims.some(c => c.judge !== 'executable')) throw new VError('UNSUPPORTED_JUDGE', 'S1 supports executable claims only', 3);
  }
  const refs = [...new Set(entries.map(e => e.recipe.execution.commandRef))];
  if (refs.length !== 1 || !refs[0]) throw new VError('UNSUPPORTED_BINDINGS', 'S1 requires one explicit command binding per plan');
  const commandRef = refs[0];
  const binding = config.commands[commandRef];
  if (!binding?.enabled) throw new VError('COMMAND_NOT_ENABLED', `Explicitly enable binding ${commandRef} before running`);
  if (binding.subject !== input.subject) throw new VError('SUBJECT_BINDING_MISMATCH', 'Command belongs to a different subject');
  requireUnique(binding.testFiles, 'test files');
  const checks = entries.flatMap(({ recipe }) => recipe.claims.map(c => ({ key: `${recipe.id}/${c.id}`, recipeId: recipe.id, id: c.id, required: c.required, expected: c.expected, source: c.source, file: slash(c.check.file), name: c.check.name })));
  requireUnique(checks.map(c => c.key), 'checks');
  requireUnique(checks.map(c => `${c.file}\0${c.name}`), 'runner check mappings');
  for (const check of checks) if (!binding.testFiles.map(slash).includes(check.file)) throw new VError('UNBOUND_TEST', check.file);
  for (const goal of input.goals) for (const key of goal.claims) if (!checks.some(c => c.key === key)) throw new VError('UNRESOLVED_GOAL_CLAIM', key);
  for (const check of checks.filter(c => c.required)) if (!input.goals.some(g => g.claims.includes(check.key))) throw new VError('UNMAPPED_REQUIRED_CLAIM', check.key);
  if (subject.sourceRoots.some(r => ['.veripaka', '.git', 'node_modules'].some(s => r === s || r.startsWith(`${s}/`)))) throw new VError('INVALID_SOURCE_DOMAIN', 'Declare application source/test roots, not runtime or dependency directories');
  const subjectFiles = await snapshot(root, subject.sourceRoots);
  for (const file of [subject.entrypoint, ...binding.testFiles]) if (!subjectFiles.some(f => f.path === slash(file))) throw new VError('INCOMPLETE_SOURCE_DOMAIN', `${file} must belong to the declared source snapshot`);
  const snapshotRoots = [...new Set([
    ...subject.sourceRoots, relative, inputPath,
    ...entries.map(e => slash(path.dirname(e.relative))),
    ...checks.map(c => c.source),
    ...(profilePath ? [profilePath] : []),
    ...(await exists(await safePath(root, '.veripaka/config.json', false)) ? ['.veripaka/config.json'] : []),
  ])];
  const frozen = await snapshot(root, snapshotRoots);
  const runId = randomUUID();
  const plan: Plan = {
    schema: 'veripaka.plan/v0', runId, createdAt: new Date().toISOString(), projectRoot: root,
    corpusRoot: await corpus(root), kind: 'verification', input, subject, binding, commandRef,
    checks, recipes: entries.map(e => e.recipe), snapshot: frozen, snapshotRoots,
    runtime: { executable: process.execPath, nodeVersion: process.version, reporterPath, reporterDigest: await fileDigest(reporterPath) },
  };
  const directory = await safePath(root, `.veripaka/runs/${runId}`, false);
  await mkdir(directory, { recursive: true });
  for (const item of frozen) {
    const bytes = await readFile(await safePath(root, item.path));
    if (digest(bytes) !== item.digest) throw new VError('SNAPSHOT_DRIFT', `Changed while freezing: ${item.path}`, 3);
    const destination = path.join(directory, 'snapshot', ...item.path.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
  }
  await writeSealed(path.join(directory, 'plan.json'), plan);
  await writeFile(path.join(directory, 'guide.md'), `# Frozen verification plan\n\nRun: ${runId}\nSubject: ${input.subject} (checkout)\n\n${input.goals.map(g => `- ${g.question}: ${g.claims.join(', ') || `uncovered: ${g.uncovered}`}`).join('\n')}\n\nRun this plan using the installed launcher. Read verdict, evidence and uncovered goals; exit code alone is insufficient.\n\n${entries.map(e => e.body).join('\n\n')}\n`, { flag: 'wx' });
  return { runId, status: 'prepared', plan: `.veripaka/runs/${runId}/plan.json`, nextAction: `run ${runId}` };
}
export async function loadPlan(root: string, runId: string): Promise<{ plan: Plan; directory: string; planDigest: string }> {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(runId)) throw new VError('INVALID_RUN_ID', runId);
  const directory = await safePath(root, `.veripaka/runs/${runId}`);
  const file = await safePath(directory, 'plan.json');
  const plan = await readSealed<Plan>(file);
  if (plan.schema !== 'veripaka.plan/v0' || plan.runId !== runId || plan.projectRoot !== await realpath(root)) throw new VError('PLAN_IDENTITY_MISMATCH', 'Plan does not belong to this project/run', 3);
  return { plan, directory, planDigest: await fileDigest(file) };
}
export async function assertCurrent(plan: Plan): Promise<void> {
  const current = await snapshot(plan.projectRoot, plan.snapshotRoots);
  if (JSON.stringify(current) !== JSON.stringify(plan.snapshot)) throw new VError('SOURCE_DRIFT', 'Declared source, recipe, input or configuration changed; create a new plan', 3);
  if (process.execPath !== plan.runtime.executable || process.version !== plan.runtime.nodeVersion || await fileDigest(reporterPath) !== plan.runtime.reporterDigest) throw new VError('RUNTIME_DRIFT', 'Node or the evidence reporter changed', 3);
}
