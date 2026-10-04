import test from 'node:test';import assert from 'node:assert/strict';
import {createRenderer,mMask,rotations,pose} from '../src/core.js';
const mask=mMask(96),times=[0,.4,.9,1.5,2.2,3.1,4.7];
test('the API lists all eight rotation modes',()=>assert.deepEqual(rotations,['spinY','spinX','roll','tumble','wobble','flip','orbit','bounce']));
for(const rotation of rotations){
  test(rotation+' frames have the right size, change over time and contain no NaN',()=>{
    const render=createRenderer(mask,{width:70,height:34,rotation}),frames=times.map(t=>render(t));
    for(const f of frames){
      assert.equal(f.width,70);assert.equal(f.height,34);assert.equal(f.chars.length,70*34);
      const lines=f.text.split('\n');assert.equal(lines.length,34);assert.ok(lines.every(l=>l.length===70));
      assert.ok(f.brightness.every(Number.isFinite));assert.ok(f.chars.every(c=>typeof c==='string'&&c.length===1));assert.ok(f.chars.some(c=>c!==' '));
    }
    assert.ok(new Set(frames.map(f=>f.text)).size>=4,rotation+' should not repeat frames');
  });
  test(rotation+' pose is a proper rotation with finite offsets',()=>{
    for(const t of times){
      const {m,dy=0,sy=1,fit=.77}=pose(rotation,t,.16);
      assert.ok([...m,dy,sy,fit].every(Number.isFinite));
      for(let i=0;i<3;i++){assert.ok(Math.abs(Math.hypot(m[i*3],m[i*3+1],m[i*3+2])-1)<1e-9);assert.ok(Math.abs(Math.hypot(m[i],m[i+3],m[i+6])-1)<1e-9);}
      const det=m[0]*(m[4]*m[8]-m[5]*m[7])-m[1]*(m[3]*m[8]-m[5]*m[6])+m[2]*(m[3]*m[7]-m[4]*m[6]);assert.ok(Math.abs(det-1)<1e-9);
    }
  });
}
test('flip holds between turns and ends each turn half a revolution later',()=>{
  const y=t=>pose('flip',t,0).m[2],a=y(0),b=y(2.2*.55+.01),c=y(2.2-.01);
  assert.ok(Math.abs(b-c)<1e-9);assert.ok(Math.abs(a)<1e-9);assert.ok(Math.abs(y(2.2))<1e-9);
});
test('bounce moves up and down',()=>{const ys=times.map(t=>pose('bounce',t).dy);assert.ok(Math.max(...ys)>.1&&Math.min(...ys)<-.1);});
test('unknown rotation and light are rejected',()=>{
  assert.throws(()=>createRenderer(mask)(0,{rotation:'nope'}),/Unknown rotation/);
  assert.throws(()=>createRenderer(mask)(0,{light:[1,2]}),/Light/);
  assert.throws(()=>pose('nope',0),/Unknown rotation/);
});
test('light direction and invert change the picture',()=>{
  const render=createRenderer(mask,{width:60,height:30}),base=render(.5).text;
  assert.notEqual(render(.5,{light:[.8,.4,.4]}).text,base);
  const flat=createRenderer(mask,{width:60,height:30,effect:'static'}),on=flat(0),off=flat(0,{invert:true});
  assert.equal(on.brightness[15*60+30]+off.brightness[15*60+30],1);assert.equal(on.brightness[0],0);assert.equal(off.brightness[0],1);
});
test('custom ramps with characters outside the BMP are indexed by character',()=>{
  const f=createRenderer(mask,{width:20,height:10,effect:'static',ramp:'.\u{1D538}'})(0);assert.ok(f.chars.every(c=>c==='.'||c==='\u{1D538}'));
});
