import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {deflateSync} from 'node:zlib';
import {rotate,imageMask,createRenderer,createModel,effects,colorAt,mMask} from '../src/core.js';import {decodePNG} from '../src/png.js';import {loadImage} from '../src/node.js';
const mask={width:16,height:12,data:Float32Array.from({length:192},(_,i)=>i%16>2&&i%16<12&&i>32&&i<160?1:0)};
test('rotation preserves length and maps Y quarter turn',()=>{const p=rotate(1,2,3,.7,.2);assert.ok(Math.abs(p.reduce((a,v)=>a+v*v,0)-14)<1e-10);assert.ok(Math.abs(rotate(1,0,0,Math.PI/2,0)[2]+1)<1e-10);});
test('mapping respects alpha and luminance',()=>{assert.deepEqual(Array.from(imageMask(2,1,[255,255,255,255,0,0,0,0]).data),[1,0]);});
test('extrusion includes front back and side walls',()=>{const p=createModel(mask);for(const n of [0,1,2])assert.ok(p.some(v=>v[n+3]!==0));});
for(const effect of effects)test(effect+' dimensions and animation',()=>{const r=createRenderer(mask,{width:80,height:40,effect}),a=r(0),b=r(2);assert.equal(a.text.split('\n').length,40);assert.ok(a.text.split('\n').every(l=>l.length===80));assert.ok(a.chars.some(c=>c!==' '));if(effect==='static')assert.equal(a.text,b.text);else assert.notEqual(a.text,b.text);});
test('colors interpolate',()=>{assert.deepEqual(colorAt(['#000000','#ffffff'],.5),[128,128,128]);});
function chunk(tag,data){const b=Buffer.concat([Buffer.from(tag),data]);let crc=0xffffffff;for(const v of b){crc^=v;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([n,b,c]);}
for(let filter=0;filter<=4;filter++)test('PNG filter '+filter,()=>{const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;const b=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([filter,12,34,56,255]))),chunk('IEND',Buffer.alloc(0))]);assert.deepEqual(Array.from(decodePNG(b).data),[12,34,56,255]);b[45]^=1;assert.throws(()=>decodePNG(b));});
test('reject malformed PNG',()=>assert.throws(()=>decodePNG(Buffer.alloc(10))));
test('M mask has two stems, a V and an empty gap below it',()=>{
  const m=mMask(64),at=(x,y)=>m.data[Math.floor(y*64)*64+Math.floor(x*64)];
  assert.equal(m.width,64);assert.equal(m.height,64);assert.ok(m.data.every(v=>v>=0&&v<=1));
  assert.equal(at(.1,.5),1);assert.equal(at(.9,.5),1);assert.equal(at(.5,.6),1);assert.equal(at(.35,.85),0);assert.equal(at(.5,.9),0);assert.equal(at(.02,.5),0);
  for(let y=0;y<64;y++)for(let x=0;x<32;x++)assert.ok(Math.abs(m.data[y*64+x]-m.data[y*64+63-x])<1e-6);
});
test('M mask survives a PNG file round trip',async()=>{
  const m=mMask(48),rows=Buffer.alloc(48*(48*4+1));
  for(let y=0;y<48;y++)for(let x=0;x<48;x++)rows.set([255,255,255,Math.round(m.data[y*48+x]*255)],y*(48*4+1)+1+x*4);
  const header=Buffer.alloc(13);header.writeUInt32BE(48);header.writeUInt32BE(48,4);header[8]=8;header[9]=6;
  const dir=mkdtempSync(join(tmpdir(),'ascii-')),file=join(dir,'m.png');
  try{
    writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
    const back=await loadImage(file);assert.equal(back.width,48);
    for(let i=0;i<m.data.length;i++)assert.ok(Math.abs(back.data[i]-m.data[i])<=1/255+1e-6);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
