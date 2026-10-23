/** Schema-defined protobuf wire codec, matching iibin-py native C. */
export type FieldType = 'string'|'bytes'|'bool'|'int32'|'uint32'|'sint32'|'int64'|'uint64'|'sint64'|'fixed32'|'sfixed32'|'fixed64'|'sfixed64'|'float'|'double'|'message';
export interface Field { id:number; type:FieldType; repeated?:boolean; schema?:Fields }
export type Fields = Record<string,Field>;
export type Message = Record<string,unknown>;
const MAX=16*1024*1024;
const TYPES=new Set(['string','bytes','bool','int32','uint32','sint32','int64','uint64','sint64','fixed32','sfixed32','fixed64','sfixed64','float','double','message']);
const utf8=new TextEncoder(), text=new TextDecoder('utf-8',{fatal:true});
const wire=(t:FieldType)=>['string','bytes','message'].includes(t)?2:['double','fixed64','sfixed64'].includes(t)?1:['float','fixed32','sfixed32'].includes(t)?5:0;
function fail(message:string):never{throw new Error(`IIBIN: ${message}`)}
class Writer {
  private buf=new Uint8Array(128); length=0;
  reserve(n:number){const end=this.length+n;if(end>MAX)fail('message exceeds 16 MiB');if(end>this.buf.length){const next=new Uint8Array(Math.min(MAX,Math.max(end,this.buf.length*2)));next.set(this.buf);this.buf=next}}
  byte(v:number){this.reserve(1);this.buf[this.length++]=v}
  varint(v:bigint){do{this.byte(Number(v&127n)|(v>127n?128:0));v>>=7n}while(v)}
  bytes(v:Uint8Array){this.reserve(v.length);this.buf.set(v,this.length);this.length+=v.length}
  finish(){return this.buf.slice(0,this.length)}
}
class Reader {
  position=0; constructor(readonly bytes:Uint8Array){}
  varint():bigint{let n=0n;for(let i=0;i<10;i++){if(this.position>=this.bytes.length)fail('truncated varint');const c=this.bytes[this.position++];if(i===9&&c>1)fail('overflowing varint');n|=BigInt(c&127)<<BigInt(7*i);if(!(c&128))return n}return fail('invalid varint')}
  take(n:number){if(!Number.isSafeInteger(n)||n<0||n>this.bytes.length-this.position)fail('truncated field');const b=this.bytes.subarray(this.position,this.position+n);this.position+=n;return b}
  block(){const n=this.varint();if(n>BigInt(MAX))fail('length exceeds 16 MiB');return this.take(Number(n))}
  skip(w:number){if(w===0)this.varint();else if(w===2)this.block();else if(w===1)this.take(8);else if(w===5)this.take(4);else fail('unsupported wire type')}
}
function integer(v:unknown,t:FieldType){if(typeof v!=='bigint'&&(typeof v!=='number'||!Number.isSafeInteger(v)))return fail(`expected integer for ${t}; use bigint for 64-bit values`);const n=BigInt(v);const bits=t.includes('32')?32n:64n,unsigned=t.startsWith('u')||t.startsWith('fixed');if(n<(unsigned?0n:-(1n<<(bits-1n)))||n>(unsigned?(1n<<bits)-1n:(1n<<(bits-1n))-1n))fail(`${t} out of range`);return n}
function value(w:Writer,f:Field,v:unknown,depth:number){
 const t=f.type,k=wire(t);
 if(k===2){let b:Uint8Array;if(t==='string'){if(typeof v!=='string')fail('expected string');b=utf8.encode(v as string)}else if(t==='bytes'){if(!(v instanceof Uint8Array))fail('expected Uint8Array');b=v as Uint8Array}else b=encode(f.schema!,v as Message,depth+1);w.varint(BigInt(b.length));w.bytes(b);return}
 if(t==='float'||t==='double'){if(typeof v!=='number'||!Number.isFinite(v))fail('expected finite number');const b=new Uint8Array(t==='float'?4:8),d=new DataView(b.buffer);if(t==='float'){if(!Number.isFinite(Math.fround(v as number)))fail('float out of range');d.setFloat32(0,v as number,true)}else d.setFloat64(0,v as number,true);w.bytes(b);return}
 if(t==='bool'){if(typeof v!=='boolean')fail('expected bool');w.varint(v?1n:0n);return}
 let n=integer(v,t);if(k===0){if(t.startsWith('sint'))n=(n<<1n)^(n>>63n);else n=BigInt.asUintN(64,n);w.varint(n);return}
 n=BigInt.asUintN(k===5?32:64,n);for(let i=0;i<(k===5?4:8);i++){w.byte(Number(n&255n));n>>=8n}
}
function encode(fields:Fields,message:Message,depth:number):Uint8Array{
 if(depth>32)fail('message nesting exceeds 32');if(!message||typeof message!=='object'||Array.isArray(message))fail('expected message object');
 for(const key of Object.keys(message))if(!Object.hasOwn(fields,key))fail(`unknown field ${key}`);
 const w=new Writer();for(const [name,f]of Object.entries(fields)){if(!Object.hasOwn(message,name))continue;const v=message[name],tag=BigInt(f.id)*8n+BigInt(wire(f.type));if(f.repeated){if(!Array.isArray(v))fail('expected array');for(const item of v as unknown[]){w.varint(tag);value(w,f,item,depth)}}else{w.varint(tag);value(w,f,v,depth)}}return w.finish();
}
function readValue(r:Reader,f:Field,depth:number):unknown{
 const t=f.type,k=wire(t);if(k===2){const b=r.block();if(t==='string')return text.decode(b);if(t==='bytes')return b.slice();return decode(f.schema!,b,depth+1)}
 if(t==='float'||t==='double'){const b=r.take(t==='float'?4:8),v=new DataView(b.buffer,b.byteOffset,b.byteLength);const n=t==='float'?v.getFloat32(0,true):v.getFloat64(0,true);if(!Number.isFinite(n))fail('non-finite number');return n}
 let n=0n;if(k===0)n=r.varint();else{const b=r.take(k===5?4:8);for(let i=0;i<b.length;i++)n|=BigInt(b[i])<<BigInt(8*i)}
 if(t==='bool')return n!==0n;
 if(t.startsWith('sint')){if(t==='sint32'&&n>0xffffffffn)fail('sint32 out of range');n=(n>>1n)^(-(n&1n))}
 else if(t.startsWith('int')||t.startsWith('sfixed'))n=BigInt.asIntN(t.includes('32')?32:64,n);
 else if(t.includes('32')&&n>0xffffffffn)fail('uint32 out of range');
 return t.includes('64')?n:Number(n);
}
function decode(fields:Fields,b:Uint8Array,depth:number):Message{
 if(depth>32)fail('message nesting exceeds 32');const byId=new Map(Object.entries(fields).map(([name,f])=>[f.id,{name,f}]));const out:Message=Object.create(null),r=new Reader(b);
 while(r.position<b.length){const tag=r.varint();if(tag<8n||(tag>>3n)>=(1n<<29n))fail('invalid field tag');const id=Number(tag>>3n),k=Number(tag&7n),entry=byId.get(id);if(!entry){r.skip(k);continue}const {name,f}=entry,expected=wire(f.type);
  if(k===2&&expected!==2&&f.repeated){const packed=new Reader(r.block()),items=(out[name]??=[]) as unknown[];while(packed.position<packed.bytes.length)items.push(readValue(packed,f,depth));continue}
  if(k!==expected)fail(`wire mismatch for ${name}`);const v=readValue(r,f,depth);if(f.repeated)((out[name]??=[]) as unknown[]).push(v);else Object.defineProperty(out,name,{value:v,writable:true,enumerable:true,configurable:true});
 }return out;
}
function validate(fields:Fields,depth=0):Fields{
 if(depth>32||!fields||typeof fields!=='object'||Array.isArray(fields))fail('invalid schema');const ids=new Set<number>(),out:Fields=Object.create(null);
 for(const [name,original]of Object.entries(fields)){const f={...original};if(!name||!Number.isInteger(f.id)||f.id<1||f.id>=2**29||(f.id>=19000&&f.id<=19999)||ids.has(f.id)||!TYPES.has(f.type))fail(`invalid field ${name}`);ids.add(f.id);if(f.type==='message')f.schema=validate(f.schema!,depth+1);out[name]=Object.freeze(f)}return Object.freeze(out);
}
export class Schema {
 readonly fields:Fields;
 constructor(fields:Fields){this.fields=validate(fields)}
 encode(message:Message){return encode(this.fields,message,0)}
 decode(data:Uint8Array|ArrayBuffer){const b=data instanceof Uint8Array?data:new Uint8Array(data);if(b.byteLength>MAX)fail('message exceeds 16 MiB');return decode(this.fields,b,0)}
}
