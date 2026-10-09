import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {decodePNG} from './png.js';
import {imageMask,createRenderer,colorAt,introFrame,introSpeed,intros} from './core.js';
export {decodePNG};
export async function loadImage(file) {
  let data=await readFile(file);
  if(/\.svg$/i.test(file)){
    const result=spawnSync('rsvg-convert',['-w','128',file],{maxBuffer:16*1024*1024});
    if(result.error?.code==='ENOENT')throw new Error('SVG input requires rsvg-convert (librsvg2-bin)');
    if(result.status!==0)throw new Error('SVG conversion failed: '+(result.stderr?.toString()??result.error));data=result.stdout;
  }
  const png=decodePNG(data);return imageMask(png.width,png.height,png.data);
}
export function ansiFrame(frame,color='#0071bc') {
  let result='';for(let i=0;i<frame.chars.length;i++){result+=`\x1b[38;2;${colorAt(color,frame.brightness[i]).join(';')}m${frame.chars[i]}`;if((i+1)%frame.width===0)result+='\x1b[0m\n';}return result+'\x1b[0m';
}
export function animate(mask,options={},stream=process.stdout) {
  if(options.intro&&!intros.includes(options.intro))throw new Error('Unknown intro: '+options.intro);
  const render=createRenderer(mask,options),start=performance.now(),intro=options.intro?options.introDuration??2000:0,seed=Math.random()*2**32>>>0;let timer,phase=0,last=start;
  // The animation runs during the intro too, speeding up as the characters arrive.
  const draw=()=>{const now=performance.now(),p=intro?(now-start)/intro:1;phase+=(now-last)/1000*introSpeed(p);last=now;const frame=render(phase);stream.write('\x1b[H'+ansiFrame(p<1?introFrame(frame,options.intro,p,seed):frame,options.color));};
  stream.write('\x1b[?1049h\x1b[?25l');draw();if(options.effect!=='static'||intro)timer=setInterval(draw,1000/(options.fps??30));
  return ()=>{clearInterval(timer);stream.write('\x1b[0m\x1b[?25h\x1b[?1049l');};
}
