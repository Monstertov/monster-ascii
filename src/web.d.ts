import type {Mask,Options,Intro} from '../index.js';
export function loadImage(source:string,size?:number):Promise<Mask>;
export function textMask(text?:string,options?:{width?:number;font?:string;weight?:number|string}):Mask;
export interface Handle {update(options:Options):void; setMask(mask:Mask):void; playIntro(name?:Intro):Promise<void>; destroy():void}
export function mount(element:HTMLElement,source?:string|Mask,options?:Options):Promise<Handle>;
