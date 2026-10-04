#!/usr/bin/env node
import {loadImage,animate,ansiFrame} from './node.js';
import {createRenderer} from './core.js';
try {
  const args=process.argv.slice(2),file=args.shift(),options={};
  if(!file||file==='--help'){console.log('monster-ascii <file.png|file.svg> [--effect spin3d] [--width 60] [--color #0071bc] [--fps 30] [--speed 1]');process.exit(file?0:1);}
  while(args.length){const key=args.shift()?.slice(2),v=args.shift();if(!['effect','width','color','fps','speed','ramp','height','depth','tilt'].includes(key)||v===undefined)throw new Error('Invalid option');options[key]=['width','fps','speed','height','depth','tilt'].includes(key)?Number(v):v;if(typeof options[key]==='number'&&(!Number.isFinite(options[key])||(['width','height','fps'].includes(key)&&options[key]<=0)))throw new Error('Invalid number');}
  const mask=await loadImage(file);
  if(!process.stdout.isTTY||process.env.NO_COLOR||process.env.TERM==='dumb')console.log(createRenderer(mask,{...options,effect:'static'})(0).text);
  else {const stop=animate(mask,options);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stop();process.exit(0);});if(options.effect==='static')setTimeout(()=>{stop();process.exit(0);},1000);}
} catch(error){console.error(error.message);process.exitCode=1;}
