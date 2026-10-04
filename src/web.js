import {imageMask,createRenderer,colorAt} from './core.js';
/** Load an SVG/PNG URL through canvas. */
export async function loadImage(source,size=128) {
  const img=new Image();img.crossOrigin='anonymous';img.src=source;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=Math.max(1,Math.round(size*img.naturalHeight/img.naturalWidth));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return imageMask(canvas.width,canvas.height,ctx.getImageData(0,0,canvas.width,canvas.height).data);
}
/** Rasterize text from a font through canvas into a mask `width` pixels wide, tight around the glyphs. */
export function textMask(text='M',{width=160,font='system-ui, sans-serif',weight=500}={}) {
  const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
  ctx.font=`${weight} 100px ${font}`;
  const m=ctx.measureText(text),ink=m.actualBoundingBoxLeft+m.actualBoundingBoxRight;
  if(!text.trim()||!(ink>0)) return {width:2,height:2,data:new Float32Array(4)};
  const size=100*(width-4)/ink,pad=2,top=m.actualBoundingBoxAscent*size/100,h=Math.ceil(top+m.actualBoundingBoxDescent*size/100)+2*pad;
  ctx.canvas.width=width;ctx.canvas.height=h;ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle='#fff';ctx.textBaseline='alphabetic';
  ctx.fillText(text,pad+m.actualBoundingBoxLeft*size/100,pad+top);
  return imageMask(width,h,ctx.getImageData(0,0,width,h).data);
}
let cell;
/** Width of one monospace character in em, measured once so rows can be drawn twice as tall as columns. */
function cellWidth() {if(cell)return cell;const ctx=document.createElement('canvas').getContext('2d');ctx.font='600 100px monospace';return cell=ctx.measureText('M').width/100;}
/** Mount selectable ASCII text. Source is an image URL, a mask or omitted for the letter M. Returns update, setMask and destroy methods. */
export async function mount(element,source,options={}) {
  const mask=typeof source==='string'?await loadImage(source):source??textMask();let render=createRenderer(mask);
  const pre=document.createElement('pre'),cw=cellWidth();pre.style.cssText=`margin:0;white-space:pre;font-family:monospace;font-weight:600;line-height:${2*cw};letter-spacing:0;user-select:text`;
  element.setAttribute('aria-label',options.label??'Animated ASCII art');pre.setAttribute('aria-hidden','true');element.append(pre);
  let o={width:60,fps:30,...options},visible=true,id,last=-Infinity,destroyed=false,phase=0,before=performance.now();
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now=performance.now()){
    if(!motion.matches)phase+=Math.min(1,Math.max(0,now-before)/1000)*(o.speed??1);before=now;
    const frame=render(motion.matches?0:phase,{...o,speed:1}),fitW=element.clientWidth/(frame.width*cw),fitH=element.clientHeight/(frame.height*2*cw);
    pre.style.fontSize=Math.max(1,typeof o.fontSize==='number'?o.fontSize:o.fontSize==='fit'?Math.min(fitW,fitH||fitW):Math.min(12,fitW))+'px';
    if(Array.isArray(o.color)||o.color==='brightness') {
      const fragment=document.createDocumentFragment();let run='',rgb=null;
      const flush=()=>{if(!run)return;if(rgb){const span=document.createElement('span');span.style.color=rgb;span.textContent=run;fragment.append(span);}else fragment.append(run);run='';};
      frame.chars.forEach((c,i)=>{const next=c===' '?null:`rgb(${colorAt(o.color,frame.brightness[i]).join(',')})`;if(next!==rgb){flush();rgb=next;}run+=c;if((i+1)%frame.width===0&&i<frame.chars.length-1)run+='\n';});
      flush();pre.replaceChildren(fragment);pre.style.color='';
    } else {pre.textContent=frame.text;pre.style.color=o.color??'#0071bc';}
  }
  function tick(now){if(destroyed)return;if(!visible||document.hidden||motion.matches)before=now;else if(now-last>=1000/o.fps-5){draw(now);last=now;}id=requestAnimationFrame(tick);}
  const resize=new ResizeObserver(()=>draw());resize.observe(element);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
  const refresh=()=>{last=-Infinity;before=performance.now();draw();};motion.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
  draw();id=requestAnimationFrame(tick);
  return {update(next){o={...o,...next};draw();},setMask(next){render=createRenderer(next);draw();},destroy(){destroyed=true;cancelAnimationFrame(id);resize.disconnect();observer.disconnect();motion.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);pre.remove();}};
}
