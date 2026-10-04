import type {Mask,Options,Frame} from '../index.js';
import type {Writable} from 'node:stream';
export function decodePNG(buffer:Buffer):{width:number;height:number;data:Uint8Array};
export function loadImage(file:string):Promise<Mask>;
export function ansiFrame(frame:Frame,color?:string|string[]):string;
export function animate(mask:Mask,options?:Options,stream?:Writable):()=>void;
