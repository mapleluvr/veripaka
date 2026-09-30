// Post-run export of the Node program executed as a heredoc during capability
// characterization. Not represented as a preregistered source snapshot.
import {createRequire} from 'node:module';import {createServer} from 'node:http';import {randomUUID} from 'node:crypto';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/mapleland/AppData/Roaming/npm/node_modules/openclaw/node_modules/playwright-core');
const out=path.resolve('.temp/s2-start/browser-capability');await mkdir(out,{recursive:true});
const id=randomUUID();
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.setHeader('X-Probe-Identity',id);res.end(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:white;font:18px Arial}h1{position:absolute;left:24px;top:12px;font-size:24px}button{position:absolute;left:44px;top:108px;width:200px;height:48px;border:0;background:#16803c;color:white;font:18px Arial;border-radius:6px}#status{position:absolute;left:44px;top:180px}.cover{position:absolute;left:44px;top:108px;width:200px;height:48px;background:white;pointer-events:none}</style></head><body><h1>Settings</h1><button onclick="document.querySelector('#status').textContent='Saved'">Save settings</button>${req.url==='/covered'?'<div class="cover" aria-hidden="true"></div>':''}<div id="status" role="status">Not saved</div></body></html>`);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
let browserServer,browser,pid;const records=[];
try {
  browserServer=await chromium.launchServer({channel:'chrome',headless:true});pid=browserServer.process().pid;
  browser=await chromium.connect(browserServer.wsEndpoint());
  for(const [name,route] of [['normal','/'],['covered','/covered']]){
    const page=await browser.newPage({viewport:{width:380,height:250},deviceScaleFactor:1});
    const response=await page.goto(`http://127.0.0.1:${port}${route}`);
    const button=page.getByRole('button',{name:'Save settings'});
    const record={name,browser:browser.version(),url:page.url(),identity:response.headers()['x-probe-identity'],visible:await button.isVisible(),box:await button.boundingBox(),screenshot:path.join(out,`${name}.png`)};
    await page.screenshot({path:record.screenshot});await button.click();record.afterClick=await page.getByRole('status').textContent();records.push(record);await page.close();
  }
} finally {if(browser)await browser.close();if(browserServer)await browserServer.close();await new Promise(resolve=>server.close(resolve));}
let browserAlive=false;try{process.kill(pid,0);browserAlive=true;}catch{}
const report={node:process.version,playwright:'1.58.2',identity:id,records,cleanup:{browserPid:pid,browserAlive,serverListening:server.listening},limit:'Tool capability experiment only; parent-written controls, not autonomous recipe discovery.'};
await writeFile(path.join(out,'observations.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
