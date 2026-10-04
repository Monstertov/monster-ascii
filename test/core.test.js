import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {deflateSync} from 'node:zlib';
import {rotate,imageMask,createRenderer,createModel,effects,colorAt} from '../src/core.js';import {decodePNG} from '../src/png.js';
const mask={width:16,height:12,data:Float32Array.from({length:192},(_,i)=>i%16>2&&i%16<12&&i>32&&i<160?1:0)};
test('rotation preserves length and maps Y quarter turn',()=>{const p=rotate(1,2,3,.7,.2);assert.ok(Math.abs(p.reduce((a,v)=>a+v*v,0)-14)<1e-10);assert.ok(Math.abs(rotate(1,0,0,Math.PI/2,0)[2]+1)<1e-10);});
test('mapping respects alpha and luminance',()=>{assert.deepEqual(Array.from(imageMask(2,1,[255,255,255,255,0,0,0,0]).data),[1,0]);});
test('extrusion includes front back and side walls',()=>{const p=createModel(mask);for(const n of [0,1,2])assert.ok(p.some(v=>v[n+3]!==0));});
for(const effect of effects)test(effect+' dimensions and animation',()=>{const r=createRenderer(mask,{width:80,height:40,effect}),a=r(0),b=r(2);assert.equal(a.text.split('\n').length,40);assert.ok(a.text.split('\n').every(l=>l.length===80));assert.ok(a.chars.some(c=>c!==' '));if(effect==='static')assert.equal(a.text,b.text);else assert.notEqual(a.text,b.text);});
test('colors interpolate',()=>{assert.deepEqual(colorAt(['#000000','#ffffff'],.5),[128,128,128]);});
function chunk(tag,data){const b=Buffer.concat([Buffer.from(tag),data]);let crc=0xffffffff;for(const v of b){crc^=v;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([n,b,c]);}
for(let filter=0;filter<=4;filter++)test('PNG filter '+filter,()=>{const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;const b=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([filter,12,34,56,255]))),chunk('IEND',Buffer.alloc(0))]);assert.deepEqual(Array.from(decodePNG(b).data),[12,34,56,255]);b[45]^=1;assert.throws(()=>decodePNG(b));});
test('reject malformed PNG',()=>assert.throws(()=>decodePNG(Buffer.alloc(10))));
