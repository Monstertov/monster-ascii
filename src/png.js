import {inflateSync} from 'node:zlib';
/** Decode noninterlaced PNG, all standard color types and bit depths. */
export function decodePNG(buffer) {
  if(!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG signature');
  let width,height,depth,type,palette,alpha,parts=[],ended=false;
  for(let p=8;p<buffer.length;){
    if(p+12>buffer.length)throw new Error('Truncated PNG');
    const n=buffer.readUInt32BE(p),tag=buffer.toString('ascii',p+4,p+8),data=buffer.subarray(p+8,p+8+n);
    if(p+12+n>buffer.length)throw new Error('Truncated PNG chunk');
    let crc=0xffffffff;for(const byte of buffer.subarray(p+4,p+8+n)){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    if(((crc^0xffffffff)>>>0)!==buffer.readUInt32BE(p+8+n))throw new Error('PNG CRC mismatch');
    if(tag==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];if(data[10]||data[11]||data[12])throw new Error('Unsupported PNG compression, filter or interlace');}
    if(tag==='PLTE')palette=data;if(tag==='tRNS')alpha=data;if(tag==='IDAT')parts.push(data);if(tag==='IEND'){ended=true;break;}p+=n+12;
  }
  const channels={0:1,2:3,3:1,4:2,6:4}[type];
  if(!ended||!width||!height||width*height>16000000||!channels||![1,2,4,8,16].includes(depth)||((type!==0&&type!==3)&&depth<8)||(type===3&&(depth===16||!palette)))throw new Error('Unsupported or invalid PNG');
  const stride=Math.ceil(width*channels*depth/8),bpp=Math.max(1,Math.ceil(channels*depth/8)),raw=inflateSync(Buffer.concat(parts),{maxOutputLength:(stride+1)*height});
  if(raw.length!==(stride+1)*height)throw new Error('Invalid PNG pixel data');
  const rows=Buffer.alloc(stride*height),rgba=new Uint8Array(width*height*4);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];if(filter>4)throw new Error('Invalid PNG filter');
    for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?rows[i-bpp]:0,b=y?rows[i-stride]:0,c=y&&x>=bpp?rows[i-stride-bpp]:0;rows[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}
    const sample=k=>{const bit=k*depth,offset=y*stride+(bit>>3);return depth===16?rows.readUInt16BE(offset):depth===8?rows[offset]:(rows[offset]>>(8-depth-(bit%8)))&((1<<depth)-1);};
    const max=2**depth-1,scale=n=>Math.round(n/max*255);
    for(let x=0;x<width;x++){
      const s=Array.from({length:channels},(_,k)=>sample(x*channels+k)),i=(y*width+x)*4;
      let r,g,b,a=255;
      if(type===3){if(s[0]*3+2>=palette.length)throw new Error('Invalid palette index');[r,g,b]=palette.subarray(s[0]*3,s[0]*3+3);a=alpha?.[s[0]]??255;}
      else if(type===0||type===4){r=g=b=scale(s[0]);if(type===4)a=scale(s[1]);else if(alpha&&s[0]===alpha.readUInt16BE(0))a=0;}
      else {[r,g,b]=s.slice(0,3).map(scale);if(type===6)a=scale(s[3]);else if(alpha&&s.every((v,k)=>v===alpha.readUInt16BE(k*2)))a=0;}
      rgba.set([r,g,b,a],i);
    }
  }
  return {width,height,data:rgba};
}
