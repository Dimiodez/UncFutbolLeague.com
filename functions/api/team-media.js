import {json} from '../_lib/auth.js';
export async function onRequestGet({env}){
 if(!env.DB||!env.PLAYER_PHOTOS)return json({teams:{}});
 const rows=await env.DB.prepare("SELECT division,team_key,kind,asset_id FROM team_media_publications WHERE season='2'").all();
 const teams={};
 for(const row of rows.results){const key=`${row.division}:${row.team_key}`;teams[key]||={};teams[key][row.kind==='logo'?'logo':'image']=`/api/team-media/images/${row.asset_id}`;}
 return json({teams});
}
