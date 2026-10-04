import {createRenderer,mMask,effects,rotations} from '../src/core.js';
const mask=mMask(128);
const run=(name,options)=>{const r=createRenderer(mask,{width:80,height:40,...options});for(let i=0;i<30;i++)r(i/30);const start=performance.now();for(let i=0;i<300;i++)r(i/30);console.log(name+': '+((performance.now()-start)/300).toFixed(3)+' ms/frame');};
for(const effect of effects)run(effect,{effect});
for(const rotation of rotations)run('spin3d '+rotation,{rotation});
