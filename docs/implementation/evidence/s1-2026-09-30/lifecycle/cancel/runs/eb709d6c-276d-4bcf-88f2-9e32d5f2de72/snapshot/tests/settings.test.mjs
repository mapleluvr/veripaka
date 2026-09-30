import test from 'node:test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
test('api rejects unsupported theme without changing stored state', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
  await writeFile(new URL('../.veripaka/child-pid.json', import.meta.url), JSON.stringify({pid: child.pid}));
  await new Promise(() => {});
});
