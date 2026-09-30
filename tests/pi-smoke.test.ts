import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const script = path.join(repository, 'scripts/pi-smoke.mjs');

// This is a CLI boundary double, NOT a model/E2E success sample. The real
// harness owns argument routing, process launch, log persistence and status.
async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'veripaka-pi-contract-'));
  const label = `contract-${path.basename(root).toLowerCase()}`;
  await mkdir(path.join(root, 'node_modules/veripaka/skills/veripaka'), { recursive: true });
  await writeFile(path.join(root, 'node_modules/veripaka/skills/veripaka/SKILL.md'), '# Boundary fixture\n');
  const pi = path.join(root, 'pi-boundary.mjs');
  await writeFile(pi, `
    import {readFile,writeFile} from 'node:fs/promises';
    await writeFile('received.json',JSON.stringify(process.argv.slice(2)));
    const marker=await readFile('marker.txt','utf8');
    if(marker==='malformed'){console.log('not a Pi event');}
    else if(marker==='json-null'){console.log('null');}
    else {
      console.log(JSON.stringify({type:'session',id:'boundary-fixture'}));
      if(marker==='current-recovered') {
        console.log(JSON.stringify({type:'message_end',message:{role:'assistant',stopReason:'error',errorMessage:'503 fixture unavailable'}}));
        console.log(JSON.stringify({type:'auto_retry_start',attempt:1,maxAttempts:3,delayMs:2000,errorMessage:'503 fixture unavailable'}));
        console.log(JSON.stringify({type:'auto_retry_end',success:true,attempt:1}));
      }
      console.log(JSON.stringify({type:'message_end',message:{role:'assistant',
        provider:'Mapleluv-ChatCompletions',model:'deepseek-flash',
        content:[{type:'text',text:marker}],
        stopReason:marker==='provider-error'?'error':'stop',
        ...(marker==='provider-error'?{errorMessage:'503 fixture unavailable'}:{})}}));
      console.log(JSON.stringify({type:'agent_end',messages:[],...(marker.startsWith('current-')?{willRetry:false}:{})}));
      if(marker==='current-success'||marker==='current-recovered')console.log(JSON.stringify({type:'agent_settled'}));
    }
  `);
  await writeFile(path.join(root, 'marker.txt'), 'first');
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(path.join(repository, '.temp/pi-smoke', label), { recursive: true, force: true });
  });
  async function run(task?: string) {
    const args = [script, root, pi, label, ...(task ? [task] : [])];
    const child = spawn(process.execPath, args, { cwd: repository, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', b => stdout += b);
    child.stderr.on('data', b => stderr += b);
    const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    assert.ok(stdout.trim(), `Harness must return metadata even for unusable Pi output: ${stderr}`);
    const data = JSON.parse(stdout);
    return { code, data, stderr, received: JSON.parse(await readFile(path.join(root, 'received.json'), 'utf8')) as string[] };
  }
  return { root, run };
}

test('pi harness sends only the required model and records the same invocation', async t => {
  const f = await fixture(t);
  const r = await f.run();
  assert.equal(r.received[r.received.indexOf('--model') + 1], 'Mapleluv-ChatCompletions/deepseek-flash:max');
  assert.equal(r.data.requestedModel, 'Mapleluv-ChatCompletions/deepseek-flash:max');
  assert.ok(r.received.includes('--no-extensions'));
  assert.ok(r.received.includes('--no-session'));
  assert.equal(r.data.purpose, 'reuse');
  assert.equal(r.code, 1, 'An assistant reply without a fresh run cannot qualify as reuse success');
});

test('repeating a task label retains both attempts and their original raw events', async t => {
  const f = await fixture(t);
  const first = await f.run();
  const original = await readFile(path.join(first.data.directory, 'events.ndjson'), 'utf8');
  await writeFile(path.join(f.root, 'marker.txt'), 'second');
  const second = await f.run();
  assert.notEqual(second.data.directory, first.data.directory);
  assert.equal(await readFile(path.join(first.data.directory, 'events.ndjson'), 'utf8'), original);
  assert.match(await readFile(path.join(second.data.directory, 'events.ndjson'), 'utf8'), /second/);
  assert.equal(JSON.parse(await readFile(path.join(first.data.directory, 'metadata.json'), 'utf8')).startedAt, first.data.startedAt);
});

test('an explicit exploration task reaches Pi unchanged and is frozen for review', async t => {
  const f = await fixture(t);
  const task = path.join(f.root, 'task.txt');
  const prompt = 'Explore the supplied object, choose observations, and create a candidate test.';
  await writeFile(task, prompt);
  const r = await f.run(task);
  assert.equal(r.received.at(-1), prompt);
  const tools = r.received[r.received.indexOf('--tools') + 1]!.split(',');
  assert.ok(tools.includes('write') && tools.includes('edit'));
  assert.equal(r.data.purpose, 'exploration');
  assert.equal(r.data.status, 'completed-review-required');
  assert.equal(r.code, 0);
  assert.equal(await readFile(path.join(r.data.directory, 'prompt.txt'), 'utf8'), prompt);
  await writeFile(task, 'changed later');
  assert.equal(await readFile(path.join(r.data.directory, 'prompt.txt'), 'utf8'), prompt);
});

test('exit zero is not a completed exploration without an intact successful Pi terminal event', async t => {
  const f = await fixture(t);
  const task = path.join(f.root, 'task.txt');
  await writeFile(task, 'Explore; do not claim a successful test just from a reply.');
  for (const marker of ['provider-error', 'malformed', 'json-null', 'current-unsettled']) {
    await t.test(marker, async () => {
      await writeFile(path.join(f.root, 'marker.txt'), marker);
      const r = await f.run(task);
      assert.equal(r.code, 1, marker);
      assert.equal(r.data.status, 'incomplete', marker);
      assert.equal(r.data.purpose, 'exploration', marker);
    });
  }
});

test('current Pi settled completion is recognized without erasing native transport retry errors', async t => {
  const f = await fixture(t);
  const task = path.join(f.root, 'task.txt');
  await writeFile(task, 'Observe the object and report uncertainty.');
  for (const [marker, errors] of [['current-success', []], ['current-recovered', ['503 fixture unavailable']]] as const) {
    await writeFile(path.join(f.root, 'marker.txt'), marker);
    const r = await f.run(task);
    assert.equal(r.code, 0, marker);
    assert.equal(r.data.status, 'completed-review-required', marker);
    assert.deepEqual(r.data.providerErrors, errors);
    assert.match(await readFile(path.join(r.data.directory, 'events.ndjson'), 'utf8'), /agent_settled/);
  }
});
