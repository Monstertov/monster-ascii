import {loadImage} from '../src/node.js';import {createRenderer,effects} from '../src/core.js';
const mask=await loadImage(new URL('../docs/logo.png',import.meta.url).pathname);
for(const effect of effects){const r=createRenderer(mask,{width:80,height:40,effect});for(let i=0;i<30;i++)r(i/30);const start=performance.now();for(let i=0;i<300;i++)r(i/30);console.log(effect+': '+((performance.now()-start)/300).toFixed(3)+' ms/frame');}
