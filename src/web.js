import {imageMask,createRenderer,colorAt,introFrame,introSpeed,intros} from './core.js';
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
/** Assemble from the edges of the browser window: characters fly on a fixed canvas above the page into their cells of the hidden pre.
 * paint(frame, now) draws the live frame, stop() removes the canvas. */
function viewportIntro(pre,o,start) {
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),range=document.createRange(),W=innerWidth,H=innerHeight,paths=[],born=[];let painted=false;
  canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647';document.body.append(canvas);
  // Every cell gets a start point spread evenly along the whole window border, corners included, a little outside it.
  const path=i=>paths[i]??=(()=>{const s=Math.random()*2*(W+H),m=10+Math.random()*50,[x,y]=s<W?[s,-m]:s<W+H?[W+m,s-W]:s<2*W+H?[2*W+H-s,H+m]:[-m,2*(W+H)-s];return {x,y,delay:Math.random()*.45};})();
  return {paint(frame,now){
    const dpr=devicePixelRatio||1,w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr),p=(now-start)/o.introDuration,solid=!Array.isArray(o.color)&&o.color!=='brightness';
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    // Targets are read every frame, so scrolling or resizing during the intro still lands on the art.
    range.selectNodeContents(pre);const r=range.getBoundingClientRect(),cs=getComputedStyle(pre),cw=r.width/frame.width,lh=r.height/frame.height;
    ctx.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;const m=ctx.measureText('M'),base=(lh-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent;
    let fill=solid?o.color??'#0071bc':null,alpha=1;ctx.fillStyle=fill;ctx.globalAlpha=1;
    frame.chars.forEach((c,i)=>{
      if(c===' '){born[i]=undefined;return;}
      // A cell that fills while the animation turns fades in instead of popping up.
      born[i]??=painted?now:-Infinity;
      const q=path(i),k=1-(1-Math.min(1,Math.max(0,(p-q.delay)/.55)))**3,a=k>=1?1:Math.min(1,(now-born[i])/150),x=i%frame.width,tx=r.left+x*cw,ty=r.top+(i-x)/frame.width*lh+base;
      if(a!==alpha)ctx.globalAlpha=alpha=a;
      if(!solid){const next=`rgb(${colorAt(o.color,frame.brightness[i]).join(',')})`;if(next!==fill)ctx.fillStyle=fill=next;}
      ctx.fillText(c,q.x+(tx-q.x)*k,q.y+(ty-q.y)*k);
    });
    painted=true;
  },stop(){canvas.remove();}};
}
/** Mount selectable ASCII text. Source is an image URL, a mask or omitted for the letter M. Returns update, setMask, playIntro and destroy methods. */
export async function mount(element,source,options={}) {
  if(options.intro&&!intros.includes(options.intro)) throw new Error('Unknown intro: '+options.intro);
  const mask=typeof source==='string'?await loadImage(source):source??textMask();let render=createRenderer(mask);
  const pre=document.createElement('pre'),cw=cellWidth();pre.style.cssText=`margin:0;overflow:visible;flex-shrink:0;white-space:pre;font-family:monospace;font-weight:600;line-height:${2*cw};letter-spacing:0;user-select:text`;
  element.setAttribute('aria-label',options.label??'Animated ASCII art');pre.setAttribute('aria-hidden','true');element.append(pre);
  let o={width:60,fps:30,introDuration:2000,...options},visible=true,id,last=-Infinity,destroyed=false,phase=0,before=performance.now(),intro=null,pending=!!o.intro&&o.autoplayIntro===false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now=performance.now()){
    // The animation keeps running during an intro and speeds up as the characters arrive, so both read as one motion.
    const p=intro?(now-intro.start)/o.introDuration:1;
    if(!motion.matches&&!pending)phase+=Math.min(1,Math.max(0,now-before)/1000)*(o.speed??1)*introSpeed(p);before=now;
    let frame=render(motion.matches?0:phase,{...o,speed:1});
    // The draw that reaches the end shows the plain frame, so the handover never skips or repeats a pose.
    if(intro){if(p>=1)intro.done();else if(intro.overlay)intro.overlay.paint(frame,now);else frame=introFrame(frame,intro.name,p,intro.seed);}
    pre.style.visibility=pending||intro?.overlay?'hidden':'';
    const fitW=element.clientWidth/(frame.width*cw),fitH=element.clientHeight/(frame.height*2*cw);
    pre.style.fontSize=Math.max(1,typeof o.fontSize==='number'?o.fontSize:o.fontSize==='fit'?Math.min(fitW,fitH||fitW):Math.min(12,fitW))+'px';
    if(Array.isArray(o.color)||o.color==='brightness') {
      const fragment=document.createDocumentFragment();let run='',rgb=null;
      const flush=()=>{if(!run)return;if(rgb){const span=document.createElement('span');span.style.color=rgb;span.textContent=run;fragment.append(span);}else fragment.append(run);run='';};
      frame.chars.forEach((c,i)=>{const next=c===' '?null:`rgb(${colorAt(o.color,frame.brightness[i]).join(',')})`;if(next!==rgb){flush();rgb=next;}run+=c;if((i+1)%frame.width===0&&i<frame.chars.length-1)run+='\n';});
      flush();pre.replaceChildren(fragment);pre.style.color='';
    } else {pre.textContent=frame.text;pre.style.color=o.color??'#0071bc';}
    return frame;
  }
  // Intros draw every frame, ignoring the fps cap, so the flight stays smooth.
  function tick(now){if(destroyed)return;if((!visible&&!intro?.overlay)||document.hidden||motion.matches)before=now;else if(intro||now-last>=1000/o.fps-5){draw(now);last=now;}id=requestAnimationFrame(tick);}
  const resize=new ResizeObserver(()=>draw());resize.observe(element);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
  const refresh=()=>{last=-Infinity;before=performance.now();draw();};motion.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
  draw();id=requestAnimationFrame(tick);
  const handle={update(next){o={...o,...next};draw();},setMask(next){render=createRenderer(next);draw();},
    playIntro(name=o.intro){
      if(!intros.includes(name))return Promise.reject(new Error('Unknown intro: '+name));
      intro?.done();pending=false;
      if(motion.matches){draw();return Promise.resolve();}
      return new Promise(resolve=>{const run={name,seed:Math.random()*2**32>>>0,start:performance.now()};
        run.done=()=>{clearTimeout(run.timer);run.overlay?.stop();intro=null;resolve();};
        // Draws end the intro; the timer only covers pages that stop drawing, such as hidden tabs.
        run.timer=setTimeout(()=>{run.done();draw();},o.introDuration+250);
        if(name==='assemble'&&o.introFrom==='viewport')run.overlay=viewportIntro(pre,o,run.start);
        intro=run;draw(run.start);});
    },
    destroy(){intro?.done();destroyed=true;cancelAnimationFrame(id);resize.disconnect();observer.disconnect();motion.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);pre.remove();}};
  if(o.intro&&!pending)handle.playIntro();
  return handle;
}
