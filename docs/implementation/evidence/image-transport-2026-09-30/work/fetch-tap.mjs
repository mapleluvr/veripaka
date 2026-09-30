// Temporary, read-only transport observation. Never records request headers,
// URLs with credentials/query strings, or modifies provider/user configuration.
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = process.env.VISION_TAP_DIR;
if (!root) throw new Error('VISION_TAP_DIR required');
await mkdir(root, { recursive: true });
await appendFile(path.join(root, 'tap-loaded.ndjson'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }) + '\n');
let sequence = 0;
function observe(original) {
return async function(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!url.pathname.endsWith('/chat/completions')) return original(input, init);
  const id = `${process.pid}-${++sequence}`;
  const body = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.clone().text() : undefined;
  if (!body) throw new Error('Cannot observe Chat Completions body without changing request');
  const parsed = JSON.parse(body);
  if (parsed.model !== 'deepseek-flash') throw new Error('Unexpected model in diagnostic');
  await writeFile(path.join(root, `${id}.request.json`), body, { flag: 'wx' });
  const metadata = { id, at: new Date().toISOString(), method: init?.method ?? input.method ?? 'GET', path: url.pathname, bodySha256: createHash('sha256').update(body).digest('hex') };
  try {
    const response = await original(input, init);
    Object.assign(metadata, { status: response.status, contentType: response.headers.get('content-type'), requestId: response.headers.get('x-request-id') });
    await writeFile(path.join(root, `${id}.response-meta.json`), JSON.stringify(metadata, null, 2));
    response.clone().text().then(text => writeFile(path.join(root, `${id}.response.txt`), text, { flag: 'wx' })).catch(error => writeFile(path.join(root, `${id}.capture-error.txt`), error.name));
    return response;
  } catch (error) {
    await writeFile(path.join(root, `${id}.fetch-error.json`), JSON.stringify({ ...metadata, errorName: error.name }, null, 2));
    throw error;
  }
};
}
// Pi installs npm undici's fetch during startup. Preserve that transport and
// observe its replacement rather than silently losing the preload observer.
let observed = observe(globalThis.fetch);
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  enumerable: true,
  get: () => observed,
  set: implementation => {
    observed = observe(implementation);
    void appendFile(path.join(root, 'fetch-install.ndjson'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }) + '\n');
  },
});
