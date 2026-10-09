import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRenderer,mMask,intros,introFrame,colorAt} from '../src/core.js';
const target=createRenderer(mMask(96),{width:70,height:34})(.3),visible=f=>f.chars.filter(c=>c!==' ').length;
const atHome=f=>f.chars.filter((c,i)=>c!==' '&&c===target.chars[i]).length;
test('the API lists the intros',()=>assert.deepEqual(intros,['assemble','rain','scatter','decode','sweep','dissolve']));
for(const name of intros)test(name+' runs from start to the exact target frame',()=>{
  assert.equal(introFrame(target,name,1,5),target);assert.equal(introFrame(target,name,1.5,5),target);
  for(const p of [0,.1,.3,.5,.7,.9,.99]){
    const f=introFrame(target,name,p,5);
    assert.equal(f.width,70);assert.equal(f.height,34);assert.equal(f.chars.length,70*34);
    const lines=f.text.split('\n');assert.equal(lines.length,34);assert.ok(lines.every(l=>l.length===70));
    assert.ok(f.brightness.every(Number.isFinite));assert.ok(f.chars.every(c=>typeof c==='string'&&c.length===1));
    assert.ok(visible(f)<=visible(target)+(name==='sweep'?34*4:0));assert.ok(f.brightness.every(v=>colorAt(['#000000','#ffffff'],v).every(Number.isFinite)));
  }
  assert.ok(atHome(introFrame(target,name,0,5))<visible(target)*(name==='scatter'?.5:.05),name+' starts mostly away from the final form');
  assert.ok(atHome(introFrame(target,name,.99,5))>visible(target)*.8,name+' is nearly done at 0.99');
  assert.deepEqual(introFrame(target,name,.5,9),introFrame(target,name,.5,9));
});
test('assemble starts fully outside the grid and enters from every side and corner',()=>{
  assert.equal(visible(introFrame(target,'assemble',0,3)),0);
  const sides=new Set();
  for(const p of [.2,.25,.3,.35,.4]){const f=introFrame(target,'assemble',p,3);f.chars.forEach((c,i)=>{if(c===' ')return;const x=i%70,y=(i-x)/70;sides.add((x<10?'l':x>=60?'r':'m')+(y<5?'t':y>=29?'b':'m'));});}
  for(const s of ['lt','mt','rt','lm','rm','lb','mb','rb'])assert.ok(sides.has(s),'nothing enters near '+s);
});
test('different seeds give different paths',()=>assert.notEqual(introFrame(target,'assemble',.5,1).text,introFrame(target,'assemble',.5,2).text));
test('unknown intro is rejected',()=>{
  assert.throws(()=>introFrame(target,'nope',.5),/Unknown intro/);
  const r=spawnSync(process.execPath,[new URL('../src/cli.js',import.meta.url).pathname,'--intro','nope'],{encoding:'utf8',env:{...process.env,NO_COLOR:'1'}});
  assert.equal(r.status,1);assert.match(r.stderr,/Unknown intro/);
});
