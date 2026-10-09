import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRenderer,mMask,intros,introFrame,introSpeed,colorAt} from '../src/core.js';
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
test('progress 1 is the live frame at any time',()=>{
  const render=createRenderer(mMask(96),{width:70,height:34});
  for(const t of [0,.7,1.9,4.2]){const live=render(t);for(const name of intros)assert.equal(introFrame(live,name,1,5),live);}
});
test('each cell keeps its own path while the target changes',()=>{
  const blank={width:70,height:34,brightness:new Float32Array(70*34).fill(.5),chars:Array(70*34).fill(' ')};
  const only={...blank,chars:blank.chars.map((c,i)=>i===1200?'X':c)},more={...blank,chars:blank.chars.map((c,i)=>i===1200?'X':[100,700,1900,2300].includes(i)?'.':c)};
  let seen=0;
  for(const name of ['assemble','rain','scatter'])for(const p of [.2,.4,.6]){
    const a=introFrame(only,name,p,11).chars.indexOf('X'),b=introFrame(more,name,p,11).chars.indexOf('X');
    assert.equal(a,b,name+' moved cell 1200 because other cells changed');seen+=a>=0;
  }
  assert.ok(seen>=6,'the moving cell is on the grid in most samples');
  assert.ok(Math.abs(introSpeed(0)-.3)<1e-12&&introSpeed(1)===1&&introSpeed(.5)>.3&&introSpeed(.5)<1);
});
