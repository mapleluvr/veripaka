// Diagnostic only: same configured provider/model. Credentials resolved in
// memory, sent only to that provider, never written to artifacts or stdout.
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve('.temp/vision-diagnosis');
const config = JSON.parse(await readFile('C:/Users/mapleland/.pi/agent/models.json', 'utf8'));
const auth = JSON.parse(await readFile('C:/Users/mapleland/.pi/agent/auth.json', 'utf8'));
const provider = config.providers['Mapleluv-ChatCompletions'];
const credential = auth['Mapleluv-ChatCompletions'];
let key = credential?.type === 'api_key' ? credential.key : provider.apiKey;
if (typeof key !== 'string' || key.startsWith('!')) throw new Error('Unsupported credential source for isolated probe');
key = key.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, a, b) => {
  const value = process.env[a ?? b];
  if (!value) throw new Error('Configured credential environment variable unavailable');
  return value;
});
const model = provider.models.find(m => m.id === 'deepseek-flash');
const endpoint = `${(model.baseUrl ?? provider.baseUrl).replace(/\/$/, '')}/chat/completions`;
const dir = await mkdtemp(path.join(root, 'direct-'));
const template = JSON.parse(await readFile(path.join(root, 'inline-captured-hwxAhU/21804-1.request.json'), 'utf8'));
const label = process.argv[2] ?? 'minimal';
let requests;
if (label === 'minimal') {
  const prompt = 'Read the six-character CODE and list the six shapes and their colors, in reading order, from the attached image. Return JSON with code and cells.';
  requests = [{ name: 'text-control', content: 'Reply exactly: TEXT_CONTROL_OK' }];
  for (const [name, file, mime] of [['png', '.temp/s2-start/capability-consumer/sample-a.png', 'image/png'], ['jpeg', '.temp/s2-start/capability-consumer/sample-a.jpg', 'image/jpeg']]) {
    const image = await readFile(file);
    requests.push({ name, imageSha256: createHash('sha256').update(image).digest('hex'), content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mime};base64,${image.toString('base64')}` } }] });
  }
} else if (label === 'transport') {
  const image = await readFile('.temp/vision-diagnosis/public-control/image.png');
  const source = JSON.parse(await readFile('.temp/vision-diagnosis/public-control/source.json', 'utf8'));
  const prompt = 'Describe three visible details and the dominant colors in this image. Do not identify the person or infer details merely from the URL.';
  const imageSha256 = createHash('sha256').update(image).digest('hex');
  requests = [
    { name: 'public-base64', imageSha256, content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/png;base64,${image.toString('base64')}` } }] },
    { name: 'public-url', imageSha256, content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: source.url } }] },
  ];
  const original = JSON.parse(await readFile('.temp/vision-diagnosis/direct-74DMpH/png.request.json', 'utf8'));
  const content = structuredClone(original.messages[0].content);
  content.find(c => c.type === 'image_url').image_url.detail = 'high';
  requests.push({ name: 'png-detail-high', content });
} else if (label === 'opaque') {
  const image = await readFile('.temp/vision-diagnosis/opaque-control/image.jpg');
  const source = JSON.parse(await readFile('.temp/vision-diagnosis/opaque-control/source.json', 'utf8'));
  const prompt = 'What is centered in the image? What is visible to its left and to its right? Describe one smaller object near the left side and one near the right side. Report only visible details.';
  requests = [
    { name: 'opaque-base64', imageSha256: source.sha256, content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image.toString('base64')}` } }] },
    { name: 'opaque-url', imageSha256: source.sha256, content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: source.url } }] },
  ];
} else throw new Error('Unknown experiment');
const registered = { at: new Date().toISOString(), label, provider: 'Mapleluv-ChatCompletions', model: 'deepseek-flash', reasoningEffort: 'max', hypothesis: label === 'minimal' ? 'Minimal text/image requests remove Pi system prompt, file wrappers and multiple images while retaining standard image_url, configured endpoint, model, reasoning and stream format.' : 'Compare the same public PNG as base64 data URI and HTTPS URL; separately change only detail=high on the prior synthetic PNG request. Public URL answers may be inferred from its name and are not standalone proof of vision.', cases: requests.map(({name,imageSha256})=>({name,imageSha256})) };
await writeFile(path.join(dir,'protocol.json'),JSON.stringify(registered,null,2));
for (const item of requests) {
  const body = { ...template, messages: [{ role: 'user', content: item.content }] };
  const text = JSON.stringify(body);
  if (text.includes(key)) throw new Error('Credential unexpectedly present in request body');
  await writeFile(path.join(dir,`${item.name}.request.json`),text);
  let response;
  try { response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: text, signal: AbortSignal.timeout(120000) }); }
  catch (error) { await writeFile(path.join(dir,`${item.name}.network-error.json`),JSON.stringify({name:error.name,at:new Date().toISOString()}));throw new Error('Provider access failed; preserved error type, do not change model'); }
  const raw = await response.text();
  await writeFile(path.join(dir,`${item.name}.response.txt`),raw);
  const chunks=[];for(const line of raw.split('\n'))if(line.startsWith('data: ')&&line.slice(6).trim()!=='[DONE]'){try{chunks.push(JSON.parse(line.slice(6)));}catch{}}
  const answer=chunks.map(c=>c.choices?.[0]?.delta?.content??'').join('');
  const summary={case:item.name,status:response.status,contentType:response.headers.get('content-type'),answer,responseModels:[...new Set(chunks.map(c=>c.model).filter(Boolean))],serverError:!response.ok};
  await writeFile(path.join(dir,`${item.name}.summary.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify({directory:dir,...summary}));
  if(!response.ok)throw new Error('Provider rejected request; raw response retained');
}
