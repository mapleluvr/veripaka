import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile, readdir, readFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const project = path.resolve(process.argv[2] ?? path.join(repository, '.temp/installed-consumer'));
const pi = process.argv[3];
const label = process.argv[4] ?? 'cold-1';
const taskFile = process.argv[5] ? path.resolve(process.argv[5]) : undefined;
if (!pi || !/^[a-z0-9-]+$/.test(label) || process.argv.length > 6) throw new Error('Usage: node scripts/pi-smoke.mjs <consumer> <pi-cli.js> <label> [task-file]');
const requestedModel = 'Mapleluv-ChatCompletions/deepseek-flash:max';
const purpose = taskFile ? 'exploration' : 'reuse';
const skill = path.join(project, 'node_modules/veripaka/skills/veripaka/SKILL.md');
const skillBytes = await readFile(skill);
const reusePrompt = '请使用已加载的 veripaka Skill，在当前项目验证设置接口的非法输入边界，以及成功保存的设置是否跨服务重启保持。先找到项目验证方法入口并按方法执行，不要重新发明测试。不得修改源码、测试、Recipe、输入、plan 或 result；只允许 CLI 生成本次运行记录。不安装依赖、不操作项目之外的数据。不要复用历史 run 充当本次执行，保留未覆盖目标。最后报告本次 run ID、逐项结果、verdictBasis、证据路径和未覆盖范围。';
const prompt = taskFile ? await readFile(taskFile, 'utf8') : reusePrompt;
if (!prompt.trim()) throw new Error('Task file must not be empty');
const tools = purpose === 'exploration' ? 'read,write,edit,powershell,bash,grep,find,ls' : 'read,powershell,bash,grep,find,ls';
const args = [pi, '--model', requestedModel, '--no-extensions', '--no-session', '--no-context-files', '--no-skills', '--skill', skill, '--no-prompt-templates', '--no-themes', '--tools', tools, '--mode', 'json', '--print', prompt];
const group = path.join(repository, '.temp/pi-smoke', label);
await mkdir(group, { recursive: true });
// One invocation is one attempt. Retrying a label never overwrites prior samples.
const directory = await mkdtemp(path.join(group, 'attempt-'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
await writeFile(path.join(directory, 'prompt.txt'), prompt, { flag: 'wx' });
await writeFile(path.join(directory, 'skill.md'), skillBytes, { flag: 'wx' });
const runsDirectory = path.join(project, '.veripaka/runs');
const runIds = () => readdir(runsDirectory).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
const before = new Set(await runIds());
const timeoutMs = 300_000;
const metadata = { startedAt: new Date().toISOString(), requestedModel, purpose, label, project, args,
  promptDigest: digest(prompt), skillDigest: digest(skillBytes), timeoutMs, extensionsEnabled: false, status: 'running' };
async function saveMetadata() {
  await writeFile(path.join(directory, 'metadata.tmp'), JSON.stringify(metadata, null, 2));
  await rename(path.join(directory, 'metadata.tmp'), path.join(directory, 'metadata.json'));
}
await saveMetadata();
// Direct file descriptors retain partial logs even if this harness is interrupted.
const out = openSync(path.join(directory, 'events.ndjson'), 'wx');
const err = openSync(path.join(directory, 'stderr.log'), 'wx');
let timedOut = false, spawnError, cleanup = 'not-requested', cleanupTask;
const child = spawn(process.execPath, args, { cwd: project, stdio: ['ignore', out, err], windowsHide: true, detached: process.platform !== 'win32' });
const closed = new Promise(resolve => {
  child.once('error', error => { spawnError = error.message; });
  child.once('close', (code, signal) => resolve({ code, signal }));
});
const timeout = setTimeout(() => {
  timedOut = true;
  if (!child.pid) { cleanup = 'no-pid'; return; }
  if (process.platform === 'win32') {
    cleanupTask = new Promise(resolve => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.once('error', error => { cleanup = `unknown: ${error.message}`; resolve(); });
      killer.once('close', code => { if (!cleanup.startsWith('unknown:')) cleanup = `taskkill-exit-${code}`; resolve(); });
    });
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); cleanup = 'group-kill-requested'; }
    catch (error) { cleanup = `unknown: ${error.message}`; }
  }
}, timeoutMs);
const { code: exitCode, signal } = await closed;
clearTimeout(timeout);
if (cleanupTask) await cleanupTask;
closeSync(out); closeSync(err);
const stdout = await readFile(path.join(directory, 'events.ndjson'), 'utf8');
const events = [];
let eventParseError = false;
for (const line of stdout.split('\n').filter(line => line.trim())) {
  try {
    const event = JSON.parse(line);
    if (!event || typeof event !== 'object' || Array.isArray(event) || typeof event.type !== 'string') eventParseError = true;
    else events.push(event);
  } catch { eventParseError = true; }
}
const messages = events.filter(e => e.type === 'message_end' && e.message?.role === 'assistant').map(e => e.message);
const providerErrors = messages.filter(m => m.stopReason === 'error').map(m => m.errorMessage ?? 'unspecified provider error');
const last = events.at(-1);
// Legacy Pi ended at agent_end without willRetry. Current Pi must settle after
// automatic work; preserve native retry history even when recovery succeeds.
const settled = last?.type === 'agent_settled' || (last?.type === 'agent_end' && !Object.hasOwn(last, 'willRetry'));
const completed = exitCode === 0 && !timedOut && !spawnError && !eventParseError
  && messages.at(-1)?.stopReason === 'stop' && settled;
const newRuns = [];
for (const runId of (await runIds()).filter(id => !before.has(id))) {
  const result = await readFile(path.join(runsDirectory, runId, 'result.json'), 'utf8').then(JSON.parse).catch(() => null);
  newRuns.push({ runId, verdict: result?.verdict ?? null, verdictBasis: result?.verdictBasis ?? null });
}
Object.assign(metadata, { endedAt: new Date().toISOString(), exitCode, signal, timedOut, spawnError, cleanup,
  eventParseError, providerErrors, toolCalls: events.filter(e => e.type === 'tool_execution_start').length,
  observedModels: [...new Set(messages.map(m => `${m.provider}/${m.model}`))],
  responseModels: [...new Set(messages.map(m => m.responseModel).filter(Boolean))], newRuns,
  status: !completed ? 'incomplete' : purpose === 'exploration' ? 'completed-review-required'
    : newRuns.some(r => r.verdict === 'scoped-pass') ? 'candidate-success-review-events' : 'incomplete' });
await saveMetadata();
process.stdout.write(`${JSON.stringify({ directory, ...metadata })}\n`);
if (metadata.status === 'incomplete') process.exitCode = 1;
// No automatic replay: classify failures and inspect side effects first. A clean
// Pi terminal event is never a method-quality or product-verification verdict.
