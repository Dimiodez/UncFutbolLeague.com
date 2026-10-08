import {getSession,json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {PLAYER_PHOTO_CATALOG} from './player-photo-catalog.js';
export const MAX_PHOTO_BYTES=5*1024*1024;
export const playerFor=id=>Object.hasOwn(PLAYER_PHOTO_CATALOG,String(id))?PLAYER_PHOTO_CATALOG[String(id)]:null;
export async function resolvePhotoPlayer(env,id){
 const existing=playerFor(id);
 if(existing){const alias=await env.DB.prepare('SELECT canonical_id FROM league_player_aliases WHERE alias_id=?').bind(existing.identity).first();return {...existing,identity:alias?.canonical_id||existing.identity};}
 if(typeof id!=='string'||!/^player-[a-f0-9-]{36}$/.test(id))return null;
 const player=await env.DB.prepare('SELECT p.id,p.discord_name,a.canonical_id FROM league_players p LEFT JOIN league_player_aliases a ON a.alias_id=p.id WHERE p.id=?').bind(id).first();
 return player?{id:player.id,name:player.discord_name,identity:player.canonical_id||player.id}:null;
}
export async function staffGuard(request,env,write=false){
  const actor=await getSession(request,env);
  if(!actor||!['owner','admin'].includes(actor.role))return {response:json({error:'Administrator access required.'},403)};
  if(write&&!sameOrigin(request))return {response:json({error:'Invalid request origin.'},403)};
  if(!env.PLAYER_PHOTOS)return {response:json({error:'Private photo storage is not enabled yet.'},503)};
  if(write){const limit=await consumeRateLimit(env,{scope:'player-photo-write',subject:actor.discord_id,limit:20,windowSeconds:3600});if(!limit.success)return {response:json({error:'Photo review limit reached. Try again later.'},429,{'retry-after':String(limit.retryAfter)})};}
  return {actor};
}
export async function boundedBytes(request,maximum=MAX_PHOTO_BYTES+16384){
  if(Number(request.headers.get('content-length'))>maximum)throw new Error('Upload exceeds the 5 MB limit.');
  const reader=request.body?.getReader();if(!reader)throw new Error('No upload supplied.');
  let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maximum){await reader.cancel();throw new Error('Upload exceeds the 5 MB limit.');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function photoForm(request){
  const bytes=await boundedBytes(request);
  return new Response(bytes,{headers:{'content-type':request.headers.get('content-type')||''}}).formData();
}
export async function validatePhoto(file,portrait=false){
  if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>MAX_PHOTO_BYTES)throw new Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());let type='';
  if(bytes.length>24&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)&&String.fromCharCode(...bytes.slice(12,16))==='IHDR')type='image/png';
  else if(bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
  else if(bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')type='image/webp';
  if(!type||file.type!==type)throw new Error('Unsupported image. JPEG, PNG and WebP only; SVG is not accepted.');
  if(portrait){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(type!=='image/png'||view.getUint32(16)!==512||view.getUint32(20)!==640)throw new Error('Approved portraits must be a 512 × 640 PNG.');}
  return {bytes,type};
}
export function imageResponse(object,type,publicImage=false){
  return new Response(object.body,{headers:{'content-type':type,'cache-control':publicImage?'public, max-age=0, must-revalidate':'private, no-store','content-disposition':'inline','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
}
