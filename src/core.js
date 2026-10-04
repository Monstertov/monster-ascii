/** @typedef {{width:number,height:number,data:ArrayLike<number>}} Mask */
/** @typedef {{width?:number,height?:number,ramp?:string,effect?:string,speed?:number,depth?:number,tilt?:number,color?:string|string[],fps?:number,label?:string}} Options */
export const effects = ['spin3d','wave','glitch','scan','breathe','static'];
export const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,v));
/** Convert RGBA pixels to coverage times luminance. @returns {Mask} */
export function imageMask(width,height,rgba) {
  if (rgba.length !== width*height*4) throw new Error('Invalid RGBA dimensions');
  const data = new Float32Array(width*height);
  for(let i=0;i<data.length;i++) data[i]=rgba[i*4+3]/255*(0.25+0.75*(0.2126*rgba[i*4]+0.7152*rgba[i*4+1]+0.0722*rgba[i*4+2])/255);
  return {width,height,data};
}
/** Rotate a point or surface normal about Y, then X. */
export function rotate(x,y,z,angle,tilt) {
  const a=x*Math.cos(angle)+z*Math.sin(angle), b=z*Math.cos(angle)-x*Math.sin(angle);
  return [a,y*Math.cos(tilt)-b*Math.sin(tilt),y*Math.sin(tilt)+b*Math.cos(tilt)];
}
/** Sample a closed extrusion surface, including boundary side walls. */
export function createModel(mask,depth=0.24) {
  const points=[]; const {width:w,height:h,data}=mask;
  const occupied=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&data[y*w+x]>0.03;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(occupied(x,y)) {
    const px=(x+.5-w/2)/w*2,py=(y+.5-h/2)/w*2,lum=data[y*w+x];
    for(const s of [-1,1]) points.push([px,py,s*depth/2,0,0,s,lum]);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) if(!occupied(x+dx,y+dy))
      for(let z=-depth/2;z<=depth/2+1e-6;z+=2/w) points.push([px+dx/w,py+dy/w,z,dx,dy,0,lum]);
  }
  return points;
}
/** @param {Mask} mask @param {Options} options */
export function createRenderer(mask,options={}) {
  let cachedDepth,model;
  return (seconds=0,overrides={})=>{
    const o={width:60,ramp:' .,:;irsXA253hMHGS#9B&@',effect:'spin3d',speed:1,depth:.24,tilt:.16,...options,...overrides};
    const w=Math.max(2,Math.floor(o.width)),h=Math.max(2,Math.floor(o.height??w*.5));
    if(!effects.includes(o.effect)) throw new Error('Unknown effect: '+o.effect);
    if(o.ramp.length<2) throw new Error('Ramp must contain at least two characters');
    const t=seconds*o.speed,brightness=new Float32Array(w*h),zbuf=new Float32Array(w*h).fill(-Infinity);
    if(o.effect==='spin3d') {
      if(cachedDepth!==o.depth){model=createModel(mask,o.depth);cachedDepth=o.depth;}
      const angle=t*.8,tilt=o.tilt+Math.sin(t*.5)*.12;
      for(const [x,y,z,nx,ny,nz,lum] of model) {
        const [rx,ry,rz]=rotate(x,y,z,angle,tilt),[a,b,c]=rotate(nx,ny,nz,angle,tilt);
        if(c<-.08) continue;
        const scale=.77/(1-rz*.18),cx=Math.floor(w/2+rx*w*.5*scale),cy=Math.floor(h/2+ry*w*.25*scale);
        if(cx<0||cx>=w||cy<0||cy>=h) continue;
        const i=cy*w+cx;
        if(rz>zbuf[i]){zbuf[i]=rz;brightness[i]=clamp((.28+.72*Math.max(0,-a*.35-b*.45+c*.82))*Math.sqrt(lum));}
      }
    } else {
      const scale=o.effect==='breathe'? .88+.07*Math.sin(t*2):.92;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const dy=o.effect==='wave'?Math.sin(x*.18-t*3)*1.8:0;
        const mx=Math.floor((x-w/2)/scale/w*mask.width+mask.width/2);
        const my=Math.floor((y-h/2+dy)/scale/(w*.5)*mask.width+mask.height/2);
        if(mx<0||mx>=mask.width||my<0||my>=mask.height) continue;
        let v=mask.data[my*mask.width+mx];
        if(o.effect==='scan') v*=.55+.45*Math.exp(-Math.pow((y-(t*12%(h+12)-6))/3,2));
        if(o.effect==='breathe') v*=.8+.2*Math.sin(t*2);
        if(o.effect==='glitch'&&v>0&&t%4<1.3) v=clamp(v+Math.sin(x*127+y*311+Math.floor(t*20))*Math.max(0,1-t%4/1.3));
        brightness[y*w+x]=v;
      }
    }
    const chars=Array.from(brightness,v=>o.ramp[Math.round(clamp(v)*(o.ramp.length-1))]);
    return {width:w,height:h,brightness,chars,text:Array.from({length:h},(_,y)=>chars.slice(y*w,(y+1)*w).join('')).join('\n')};
  };
}
/** Resolve single, gradient, or brightness colors to RGB. */
export function colorAt(color,v) {
  const parse=s=>{if(!/^#[0-9a-f]{6}$/i.test(s)) throw new Error('Color must be #rrggbb');return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));};
  if(Array.isArray(color)){const p=clamp(v)*(color.length-1),i=Math.floor(p),a=parse(color[i]),b=parse(color[Math.min(i+1,color.length-1)]);return a.map((n,k)=>Math.round(n+(b[k]-n)*(p-i)));}
  const rgb=parse(color==='brightness'?'#ffffff':color??'#0071bc');
  return color==='brightness'?rgb.map(n=>Math.round(n*clamp(v))):rgb;
}
