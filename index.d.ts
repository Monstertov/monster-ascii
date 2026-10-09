export interface Mask {width:number; height:number; data:ArrayLike<number>}
export type Effect = 'spin3d'|'wave'|'glitch'|'scan'|'breathe'|'static';
export type Rotation = 'spinY'|'spinX'|'roll'|'tumble'|'wobble'|'flip'|'orbit'|'bounce';
export type Intro = 'assemble'|'rain'|'scatter'|'decode'|'sweep'|'dissolve';
export interface Options {width?:number; height?:number; ramp?:string; effect?:Effect; rotation?:Rotation; speed?:number; depth?:number; tilt?:number; light?:[number,number,number]; invert?:boolean; color?:string|string[]; fps?:number; fontSize?:number|'fit'; label?:string; intro?:Intro|null; introDuration?:number; autoplayIntro?:boolean}
export interface Frame {width:number; height:number; brightness:Float32Array; chars:string[]; text:string}
export interface Pose {m:number[]; dy?:number; sy?:number; fit?:number}
export const effects:Effect[];
export const rotations:Rotation[];
export const intros:Intro[];
export function clamp(v:number,lo?:number,hi?:number):number;
export function imageMask(width:number,height:number,rgba:ArrayLike<number>):Mask;
export function mMask(size?:number):Mask;
export function rotate(x:number,y:number,z:number,angle:number,tilt:number):number[];
export function pose(rotation:Rotation,t:number,tilt?:number):Pose;
export function createModel(mask:Mask,depth?:number):number[][];
export function createRenderer(mask:Mask,options?:Options):(seconds?:number,overrides?:Options)=>Frame;
export function introFrame(frame:Frame,name:Intro,progress:number,seed?:number):Frame;
export function colorAt(color:string|string[],v:number):number[];
