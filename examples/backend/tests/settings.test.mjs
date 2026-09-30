import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startService } from '../src/server.mjs';

test('api rejects unsupported theme without changing stored state', async () => {
  const data = await mkdtemp(path.join(os.tmpdir(), 'veripaka-boundary-'));
  const app = await startService(data);
  try {
    const response = await fetch(`${app.url}/settings`, { method: 'PUT', body: JSON.stringify({ theme: 'invalid' }) });
    assert.equal(response.status, 400);
    assert.deepEqual(await (await fetch(`${app.url}/settings`)).json(), { theme: 'light' });
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});

test('settings survive service restart', async () => {
  const data = await mkdtemp(path.join(os.tmpdir(), 'veripaka-persistence-'));
  let app = await startService(data);
  try {
    assert.equal((await fetch(`${app.url}/settings`, { method: 'PUT', body: JSON.stringify({ theme: 'dark' }) })).status, 200);
    await app.close();
    app = await startService(data);
    assert.deepEqual(await (await fetch(`${app.url}/settings`)).json(), { theme: 'dark' });
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});
