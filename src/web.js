import {imageMask,createRenderer,colorAt} from './core.js';
/** Load an SVG/PNG URL through canvas. */
export async function loadImage(source,size=128) {
  const img=new Image();img.crossOrigin='anonymous';img.src=source;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=Math.max(1,Math.round(size*img.naturalHeight/img.naturalWidth));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return imageMask(canvas.width,canvas.height,ctx.getImageData(0,0,canvas.width,canvas.height).data);
}
/** Mount selectable ASCII text. Returns update and destroy methods. */
export async function mount(element,source,options={}) {
  const mask=typeof source==='string'?await loadImage(source):source,render=createRenderer(mask);
  const pre=document.createElement('pre');pre.style.cssText='margin:0;white-space:pre;font-family:monospace;font-weight:600;line-height:1;letter-spacing:0;user-select:text';
  element.setAttribute('aria-label',options.label??'Animated ASCII logo');pre.setAttribute('aria-hidden','true');element.append(pre);
  let o={width:60,fps:30,...options},visible=true,id,last=-Infinity,destroyed=false,start=performance.now();
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now=performance.now()){
    const frame=render(motion.matches?0:(now-start)/1000,o);pre.style.fontSize=Math.max(1,Math.min(12,element.clientWidth/(frame.width*.61)))+'px';
    if(Array.isArray(o.color)||o.color==='brightness') {
      const fragment=document.createDocumentFragment();
      frame.chars.forEach((c,i)=>{const span=document.createElement('span');span.textContent=c;span.style.color=`rgb(${colorAt(o.color,frame.brightness[i]).join(',')})`;fragment.append(span);if((i+1)%frame.width===0&&i<frame.chars.length-1)fragment.append('\n');});pre.replaceChildren(fragment);
    } else {pre.textContent=frame.text;pre.style.color=o.color??'#0071bc';}
  }
  function tick(now){if(destroyed)return;if(visible&&!document.hidden&&!motion.matches&&now-last>=1000/o.fps){draw(now);last=now;}id=requestAnimationFrame(tick);}
  const resize=new ResizeObserver(()=>draw());resize.observe(element);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
  const refresh=()=>{last=-Infinity;draw();};motion.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
  draw();id=requestAnimationFrame(tick);
  return {update(next){o={...o,...next};draw();},destroy(){destroyed=true;cancelAnimationFrame(id);resize.disconnect();observer.disconnect();motion.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);pre.remove();}};
}
