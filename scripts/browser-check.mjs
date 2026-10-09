// Browser checks with Playwright (test-only install). Serves the repository itself.
// Usage: node scripts/browser-check.mjs [--publish]   --publish also rewrites the images used by the README.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {extname,join,normalize} from 'node:path';
import {spawnSync} from 'node:child_process';import {rotations} from '../src/core.js';
const root=new URL('..',import.meta.url).pathname,publish=process.argv.includes('--publish');
const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.md':'text/markdown'};
const server=createServer(async(req,res)=>{try{const file=join(root,normalize(new URL(req.url,'http://x').pathname));if(!file.startsWith(root))throw 0;const path=file.endsWith('/')?file+'index.html':file;res.setHeader('content-type',types[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),errors=[];
const open=async(path,viewport={width:1440,height:1000},options={})=>{const page=await browser.newPage({viewport,...options});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(base+path);await page.locator('pre').first().waitFor();return page;};
// Screenshots run on a fake clock so every pose is the same on each run.
const shoot=async(path,viewport,ms,files,selector)=>{
  const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:0});await page.goto(base+path);await page.locator('pre').first().waitFor();await page.clock.runFor(ms);
  for(const file of files)await (selector?page.locator(selector):page).screenshot({path:join(root,file),...(selector?{}:{fullPage:true})});await page.close();
};
const set=(page,id,value)=>page.evaluate(([id,value])=>{const el=document.getElementById(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},[id,value]);
const samples=async(page,count=12,gap=90)=>{const out=[];for(let i=0;i<count;i++){out.push(await page.locator('#stage pre').textContent());await page.waitForTimeout(gap);}return out;};
await mkdir(join(root,'screenshots'),{recursive:true});

const demo=await open('/docs/');
assert.equal(await demo.evaluate(()=>getComputedStyle(document.querySelector('#stage pre')).color),'rgb(0, 113, 188)');
assert.ok((await demo.locator('#stage pre').textContent()).split('\n').every(l=>l.length===110));
assert.ok((await demo.locator('#stage').boundingBox()).height>=420);
await set(demo,'speed','3');
for(const rotation of rotations){await set(demo,'rotation',rotation);assert.ok(new Set(await samples(demo,14,110)).size>1,rotation+' frames change');}
await set(demo,'rotation','tumble');await set(demo,'speed','1');
await set(demo,'fps','5');const slow=new Set(await samples(demo,40,25)).size;await set(demo,'fps','60');const fast=new Set(await samples(demo,40,25)).size;assert.ok(fast>slow+5,`fps cap: ${slow} frames at 5, ${fast} at 60`);await set(demo,'fps','30');
await set(demo,'width','60');assert.ok((await demo.locator('#stage pre').textContent()).split('\n').every(l=>l.length===60));await set(demo,'width','110');
await set(demo,'text','Hi');await demo.waitForTimeout(150);assert.ok((await demo.locator('#stage pre').textContent()).trim().length>0);await set(demo,'text','M');
await set(demo,'effect','wave');assert.ok(await demo.locator('#rotation').isDisabled());await set(demo,'effect','spin3d');
await set(demo,'preset','Custom');await set(demo,'custom','xy');await demo.waitForTimeout(100);assert.ok(/^[xy\n]+$/.test((await demo.locator('#stage pre').textContent()).replace(/ /g,'')));await set(demo,'preset','Classic');
await set(demo,'invert',true);await demo.waitForTimeout(100);assert.ok((await demo.locator('#stage pre').textContent()).startsWith('@'));await set(demo,'invert',false);
await set(demo,'color','#ff0000');await demo.waitForTimeout(100);assert.equal(await demo.evaluate(()=>getComputedStyle(document.querySelector('#stage pre')).color),'rgb(255, 0, 0)');
await set(demo,'mode','gradient');await demo.waitForTimeout(100);assert.ok(await demo.locator('#stage pre span').count()>10);await set(demo,'mode','solid');await set(demo,'color','#0071bc');
await set(demo,'background','#123456');assert.equal(await demo.evaluate(()=>getComputedStyle(document.querySelector('#stage')).backgroundColor),'rgb(18, 52, 86)');await set(demo,'background','#08131f');
await set(demo,'fontSize','20');await demo.waitForTimeout(100);assert.equal(await demo.evaluate(()=>getComputedStyle(document.querySelector('#stage pre')).fontSize),'20px');await set(demo,'fontSize','0');
await demo.click('#fullscreen');await demo.waitForTimeout(300);assert.equal(await demo.evaluate(()=>document.fullscreenElement?.id),'stage');await demo.keyboard.press('Escape');
await demo.evaluate(()=>document.exitFullscreen?.().catch(()=>{}));await demo.waitForTimeout(200);
const ink=t=>t.replace(/\s/g,'').length;await set(demo,'effect','static');await demo.waitForTimeout(100);const still=await demo.locator('#stage pre').textContent();
for(const intro of ['assemble','sweep']){await set(demo,'intro',intro);await demo.locator('#play').click();assert.ok(ink(await demo.locator('#stage pre').textContent())<ink(still)*.2,intro+' starts without the final art');await demo.waitForTimeout(2300);assert.equal(await demo.locator('#stage pre').textContent(),still,intro+' ends on the art');}
await set(demo,'intro','assemble');await set(demo,'introFrom',true);await demo.locator('#play').click();
assert.equal(await demo.locator('canvas').count(),1);assert.equal(await demo.evaluate(()=>getComputedStyle(document.querySelector('#stage pre')).visibility),'hidden');
assert.ok(await demo.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'no horizontal scroll during the flight');
await demo.waitForTimeout(2300);assert.equal(await demo.locator('canvas').count(),0);assert.equal(await demo.locator('#stage pre').textContent(),still,'viewport intro ends on the art');
await set(demo,'introFrom',false);await set(demo,'effect','spin3d');
await demo.emulateMedia({reducedMotion:'reduce'});await demo.waitForTimeout(150);const frozen=await demo.locator('#stage pre').textContent();await demo.waitForTimeout(500);assert.equal(await demo.locator('#stage pre').textContent(),frozen);
await demo.locator('#play').click();assert.equal(await demo.locator('#stage pre').textContent(),frozen,'reduced motion skips the intro');
console.log('Demo: every rotation animates, controls work, fps cap, fullscreen, intros, reduced motion static');

const spin=await open('/examples/spin.html',{width:800,height:700});
const a=await spin.locator('pre').textContent();await spin.waitForTimeout(500);assert.notEqual(await spin.locator('pre').textContent(),a);
assert.ok(await spin.evaluate(async()=>{
  const {mount}=await import('/src/web.js'),el=document.body.appendChild(document.createElement('div'));el.style.cssText='width:300px;height:300px';
  const h=await mount(el,undefined,{intro:'rain',introDuration:300,autoplayIntro:false}),pre=el.querySelector('pre'),hidden=getComputedStyle(pre).visibility==='hidden';
  await new Promise(r=>setTimeout(r,200));const waited=getComputedStyle(pre).visibility==='hidden';await h.playIntro();const shown=getComputedStyle(pre).visibility==='visible'&&pre.textContent.trim().length>0;h.destroy();el.remove();return hidden&&waited&&shown;
}),'autoplayIntro:false keeps the art hidden until playIntro resolves');
const grid=await open('/examples/rotations.html',{width:1100,height:640});assert.equal(await grid.locator('pre').count(),rotations.length);console.log('Examples: spin.html and rotations.html animate');

await shoot('/docs/',{width:1440,height:1000},2550,['screenshots/demo.png',...publish?['docs/demo.png']:[]]);
await shoot('/examples/spin.html',{width:800,height:700},550,['screenshots/spin.png',...publish?['examples/screenshots/spin.png']:[]]);
await shoot('/examples/rotations.html',{width:1100,height:640},450,['screenshots/rotations.png',...publish?['examples/screenshots/rotations.png']:[]]);
if(publish){
  const command='NO_COLOR=1 node src/cli.js --width 60 --time 0.55';
  const out=spawnSync('sh',['-c',command],{cwd:root,encoding:'utf8'}).stdout.replace(/\n+$/,'');
  const term=await browser.newPage({viewport:{width:960,height:620}});
  await term.setContent(`<body style="margin:0;background:#0b121a;color:#e6edf3;font:15px/1.25 'DejaVu Sans Mono',monospace"><pre style="margin:0;padding:24px 32px">$ ${command}\n\n${out.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre></body>`);
  await term.screenshot({path:join(root,'examples/screenshots/terminal.png')});
}
assert.deepEqual(errors,[]);console.log('No console errors');
await browser.close();server.close();
