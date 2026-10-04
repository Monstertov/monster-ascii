import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {decodePNG} from './png.js';
import {imageMask,createRenderer,colorAt} from './core.js';
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
  const render=createRenderer(mask,options),start=performance.now();let timer;
  const draw=()=>stream.write('\x1b[H'+ansiFrame(render((performance.now()-start)/1000),options.color));
  stream.write('\x1b[?1049h\x1b[?25l');draw();if(options.effect!=='static')timer=setInterval(draw,1000/(options.fps??30));
  return ()=>{clearInterval(timer);stream.write('\x1b[0m\x1b[?25h\x1b[?1049l');};
}
