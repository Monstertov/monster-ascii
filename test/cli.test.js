import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rotations,mMask,createRenderer} from '../src/core.js';
const cli=new URL('../src/cli.js',import.meta.url).pathname,run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,NO_COLOR:'1'}});
test('the CLI prints the built-in M when no file is given',()=>{
  const r=run('--width','40');assert.equal(r.status,0);
  const lines=r.stdout.slice(0,-1).split('\n');assert.equal(lines.length,20);assert.ok(lines.every(l=>l.length===40));assert.equal(r.stdout.trimEnd(),createRenderer(mMask(),{width:40,effect:'static'})(0).text.trimEnd());
});
for(const rotation of rotations)test('--rotation '+rotation+' selects the mode',()=>{
  const a=run('--width','50','--rotation',rotation,'--time','0.4'),b=run('--width','50','--rotation',rotation,'--time','2.5');
  assert.equal(a.status,0);assert.equal(b.status,0);assert.notEqual(a.stdout,b.stdout);
  assert.equal(a.stdout.trimEnd(),createRenderer(mMask(),{width:50,rotation})(.4).text.trimEnd());
});
test('light, invert and bad options',()=>{
  assert.notEqual(run('--width','40','--time','1','--light','1,0,0.5').stdout,run('--width','40','--time','1').stdout);
  assert.notEqual(run('--width','40','--invert').stdout,run('--width','40').stdout);
  for(const bad of [['--rotation','nope','--time','0'],['--width','0'],['--bogus','1'],['--light','1,2','--time','0']]){const r=run(...bad);assert.equal(r.status,1);assert.ok(r.stderr.length>0);}
  const help=run('--help');assert.equal(help.status,0);for(const r of rotations)assert.ok(help.stdout.includes(r));
});
