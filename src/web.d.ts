import type {Mask,Options} from '../index.js';
export function loadImage(source:string,size?:number):Promise<Mask>;
export function mount(element:HTMLElement,source:string|Mask,options?:Options):Promise<{update(options:Options):void;destroy():void}>;
