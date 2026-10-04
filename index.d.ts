export interface Mask {width:number; height:number; data:ArrayLike<number>}
export type Effect = 'spin3d'|'wave'|'glitch'|'scan'|'breathe'|'static';
export interface Options {width?:number; height?:number; ramp?:string; effect?:Effect; speed?:number; depth?:number; tilt?:number; color?:string|string[]; fps?:number; label?:string}
export interface Frame {width:number; height:number; brightness:Float32Array; chars:string[]; text:string}
export const effects:Effect[];
export function clamp(v:number,lo?:number,hi?:number):number;
export function imageMask(width:number,height:number,rgba:ArrayLike<number>):Mask;
export function rotate(x:number,y:number,z:number,angle:number,tilt:number):number[];
export function createModel(mask:Mask,depth?:number):number[][];
export function createRenderer(mask:Mask,options?:Options):(seconds?:number,overrides?:Options)=>Frame;
export function colorAt(color:string|string[],v:number):number[];
