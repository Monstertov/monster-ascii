import type {Mask,Options} from '../index.js';
export function loadImage(source:string,size?:number):Promise<Mask>;
export function textMask(text?:string,options?:{width?:number;font?:string;weight?:number|string}):Mask;
export function mount(element:HTMLElement,source?:string|Mask,options?:Options):Promise<{update(options:Options):void;setMask(mask:Mask):void;destroy():void}>;
