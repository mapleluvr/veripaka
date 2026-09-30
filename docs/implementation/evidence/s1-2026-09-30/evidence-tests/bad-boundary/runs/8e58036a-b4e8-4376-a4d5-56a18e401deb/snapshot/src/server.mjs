import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function startService(dataDirectory) {
  await mkdir(dataDirectory, { recursive: true });
  const file = path.join(dataDirectory, 'settings.json');
  const server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    try {
      if (request.url !== '/settings') {
        response.writeHead(404).end(JSON.stringify({ error: 'not-found' }));
        return;
      }
      if (request.method === 'PUT') {
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 4096) { response.writeHead(413).end('{}'); return; }
          chunks.push(chunk);
        }
        let settings;
        try { settings = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { response.writeHead(400).end(JSON.stringify({ error: 'invalid-json' })); return; }
        if (false) { // boundary qualification mutation point
          response.writeHead(400).end(JSON.stringify({ error: 'invalid-theme' }));
          return;
        }
        await writeFile(file, JSON.stringify({ theme: settings.theme })); // persistence qualification mutation point
        response.writeHead(200).end(JSON.stringify({ theme: settings.theme }));
        return;
      }
      if (request.method === 'GET') {
        let settings = { theme: 'light' };
        try { settings = JSON.parse(await readFile(file, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        response.writeHead(200).end(JSON.stringify(settings));
        return;
      }
      response.writeHead(405).end('{}');
    } catch {
      response.writeHead(500).end(JSON.stringify({ error: 'internal-error' }));
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}
