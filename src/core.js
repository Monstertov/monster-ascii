/** @typedef {{width:number,height:number,data:ArrayLike<number>}} Mask */
/** @typedef {{width?:number,height?:number,ramp?:string,effect?:string,rotation?:string,speed?:number,depth?:number,tilt?:number,light?:number[],invert?:boolean,color?:string|string[],fps?:number,fontSize?:number|'fit',label?:string}} Options */
export const effects = ['spin3d','wave','glitch','scan','breathe','static'];
/** Rotation modes of the spin3d effect. */
export const rotations = ['spinY','spinX','roll','tumble','wobble','flip','orbit','bounce'];
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
const rotX=a=>[1,0,0,0,Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a)],rotY=a=>[Math.cos(a),0,Math.sin(a),0,1,0,-Math.sin(a),0,Math.cos(a)],rotZ=a=>[Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a),0,0,0,1];
const mul=(a,b)=>Array.from({length:9},(_,k)=>{const i=k-k%3,j=k%3;return a[i]*b[j]+a[i+1]*b[3+j]+a[i+2]*b[6+j];});
/** Pose of a rotation mode at time t: row-major 3x3 matrix, vertical offset dy, squash sy and size fit. */
export function pose(rotation,t,tilt=.16) {
  const S=Math.sin,hold=(p,span)=>{const n=Math.floor(p),f=Math.min(1,(p-n)/span);return n+f*f*(3-2*f);};
  switch(rotation) {
    case 'spinY': return {m:mul(rotX(tilt+S(t*.5)*.12),rotY(t*.8))};
    case 'spinX': return {m:mul(rotY(S(t*.5)*.18),rotX(tilt+t*.8))};
    case 'roll': return {m:mul(rotX(tilt),mul(rotY(S(t*.5)*.3),rotZ(t*.8))),fit:.68};
    case 'tumble': return {m:mul(rotY(t*.8),rotX(tilt+t*.6)),fit:.68};
    case 'wobble': return {m:mul(rotX(tilt+S(t*1.1+1)*.3),mul(rotY(S(t*1.6)*.7),rotZ(S(t*1.3)*.14)))};
    case 'flip': return {m:mul(rotX(tilt),rotY(Math.PI*hold(t/2.2,.55)))};
    case 'orbit': {const p=t*.7;return {m:mul(rotZ(p),mul(rotX(.5),mul(rotZ(-p),rotY(t*.5)))),fit:.68};}
    case 'bounce': {const f=(t*.9)%1,h=4*f*(1-f);return {m:mul(rotX(tilt),rotY(t*.5)),dy:.2-.4*h,sy:1-.12*(1-h)**10,fit:.66};}
    default: throw new Error('Unknown rotation: '+rotation);
  }
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
/** Built-in capital M, no font needed. Coverage mask of size by size pixels. @returns {Mask} */
export function mMask(size=128) {
  const poly=[[0,1],[0,0],[.2,0],[.5,.48],[.8,0],[1,0],[1,1],[.8,1],[.8,.3],[.5,.78],[.2,.3],[.2,1]].map(([x,y])=>[.05+x*.9,.05+y*.9]),n=4,N=size*n,data=new Float32Array(size*size);
  for(let sy=0;sy<N;sy++){
    const y=(sy+.5)/N,xs=[];
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,ay]=poly[i],[bx,by]=poly[j];if((ay>y)!==(by>y))xs.push(ax+(y-ay)*(bx-ax)/(by-ay));}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2) for(let sx=Math.max(0,Math.ceil(xs[k]*N-.5));sx<Math.min(N,Math.ceil(xs[k+1]*N-.5));sx++) data[Math.floor(sy/n)*size+Math.floor(sx/n)]+=1/(n*n);
  }
  return {width:size,height:size,data};
}
/** @param {Mask} mask @param {Options} options */
export function createRenderer(mask,options={}) {
  let cachedDepth,model;
  return (seconds=0,overrides={})=>{
    const o={width:60,ramp:' .,:;irsXA253hMHGS#9B&@',effect:'spin3d',rotation:'spinY',speed:1,depth:.24,tilt:.16,light:[-.35,-.45,.82],invert:false,...options,...overrides};
    const w=Math.max(2,Math.floor(o.width)),h=Math.max(2,Math.floor(o.height??w*.5*Math.max(1,mask.height/mask.width))),ramp=Array.from(o.ramp);
    if(!effects.includes(o.effect)) throw new Error('Unknown effect: '+o.effect);
    if(!rotations.includes(o.rotation)) throw new Error('Unknown rotation: '+o.rotation);
    if(ramp.length<2) throw new Error('Ramp must contain at least two characters');
    if(!Array.isArray(o.light)||o.light.length!==3||!o.light.every(Number.isFinite)) throw new Error('Light must be [x,y,z]');
    const t=seconds*o.speed,brightness=new Float32Array(w*h),zbuf=new Float32Array(w*h).fill(-Infinity);
    if(o.effect==='spin3d') {
      if(cachedDepth!==o.depth){model=createModel(mask,o.depth);cachedDepth=o.depth;}
      const {m,dy=0,sy=1,fit=.77}=pose(o.rotation,t,o.tilt),len=Math.hypot(...o.light)||1,[lx,ly,lz]=o.light.map(v=>v/len);
      const l0=m[0]*lx+m[3]*ly+m[6]*lz,l1=m[1]*lx+m[4]*ly+m[7]*lz,l2=m[2]*lx+m[5]*ly+m[8]*lz;
      for(const [x,y,z,nx,ny,nz,lum] of model) {
        if(m[6]*nx+m[7]*ny+m[8]*nz<-.08) continue;
        const rz=m[6]*x+m[7]*y+m[8]*z,scale=fit/(1-rz*.18),cx=Math.floor(w/2+(m[0]*x+m[1]*y+m[2]*z)*w*.5*scale),cy=Math.floor(h/2+((m[3]*x+m[4]*y+m[5]*z)*sy+dy)*w*.25*scale);
        if(cx<0||cx>=w||cy<0||cy>=h) continue;
        const i=cy*w+cx;
        if(rz>zbuf[i]){zbuf[i]=rz;brightness[i]=clamp((.28+.72*Math.max(0,l0*nx+l1*ny+l2*nz))*Math.sqrt(lum));}
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
    if(o.invert) for(let i=0;i<brightness.length;i++) brightness[i]=1-brightness[i];
    const chars=Array.from(brightness,v=>ramp[Math.round(clamp(v)*(ramp.length-1))]);
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
