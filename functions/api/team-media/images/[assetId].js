import {json} from '../../../_lib/auth.js';
import {imageResponse} from '../../../_lib/player-photos.js';
export async function onRequestGet({env,params}){
 if(!env.DB||!env.PLAYER_PHOTOS||!/^[a-f0-9-]{36}$/.test(params.assetId))return json({error:'Image not found.'},404);
 // Only the current published logo/stadium is public, never player originals.
 const row=await env.DB.prepare('SELECT a.object_key,a.content_type FROM team_media_assets a JOIN team_media_publications p ON p.asset_id=a.id WHERE a.id=? LIMIT 1').bind(params.assetId).first();
 if(!row)return json({error:'Image not found.'},404);
 const image=await env.PLAYER_PHOTOS.get(row.object_key);
 return image?imageResponse(image,row.content_type,true):json({error:'Image not found.'},404);
}
