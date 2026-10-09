#!/usr/bin/env node
import {loadImage,animate} from './node.js';
import {createRenderer,mMask,effects,rotations,intros} from './core.js';
const usage=`monster-ascii [file.png|file.svg] [options]
Without a file the built-in capital M is used.
  --effect ${effects.join('|')}
  --rotation ${rotations.join('|')}   (spin3d effect)
  --intro ${intros.join('|')}   play once before the animation
  --width 60  --height 30  --speed 1  --fps 30  --depth 0.24  --tilt 0.16
  --color '#0071bc'  --ramp ' .:-=+*#%@'  --light x,y,z  --invert
  --time seconds   print one frame at that time instead of the static one when not on a terminal`;
const numbers=['width','height','fps','speed','depth','tilt','time'],flags=['invert'];
try {
  const args=process.argv.slice(2),options={};
  if(args.includes('--help')||args.includes('-h')){console.log(usage);process.exit(0);}
  const file=args[0]&&!args[0].startsWith('--')?args.shift():undefined;
  while(args.length){
    const key=args.shift()?.slice(2);
    if(flags.includes(key)){options[key]=true;continue;}
    const v=args.shift();
    if(![...numbers,'effect','rotation','intro','color','ramp','light'].includes(key)||v===undefined)throw new Error('Invalid option');
    if(key==='intro'&&!intros.includes(v))throw new Error('Unknown intro: '+v);
    options[key]=numbers.includes(key)?Number(v):key==='light'?v.split(',').map(Number):v;
    if(typeof options[key]==='number'&&(!Number.isFinite(options[key])||(['width','height','fps'].includes(key)&&options[key]<=0)))throw new Error('Invalid number');
  }
  const mask=file?await loadImage(file):mMask(),{time,...settings}=options;
  if(!process.stdout.isTTY||process.env.NO_COLOR||process.env.TERM==='dumb')console.log(createRenderer(mask,time===undefined?{...settings,effect:'static'}:settings)(time??0).text);
  else {const stop=animate(mask,settings);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stop();process.exit(0);});if(settings.effect==='static')setTimeout(()=>{stop();process.exit(0);},settings.intro?3000:1000);}
} catch(error){console.error(error.message);process.exitCode=1;}
