import {getSession,json,sameOrigin} from './auth.js';
const MAX_BYTES=900000;
export async function previewDraftsApi(request,env){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 try{
  const user=await getSession(request,env);
  if(!user)return json({error:'Sign in with Discord to save and open your account drafts.'},401);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS preview_account_drafts(discord_id TEXT PRIMARY KEY,payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const account={id:user.discord_id,name:user.display_name||user.username};
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT payload,revision,updated_at FROM preview_account_drafts WHERE discord_id=?').bind(user.discord_id).first();
   return json({account,revision:row?.revision||0,updatedAt:row?.updated_at||null,draft:row?JSON.parse(row.payload):null});
  }
  const raw=await request.text();if(new TextEncoder().encode(raw).length>MAX_BYTES)return json({error:'Account drafts must be smaller than 900 KB. Keep larger archives as a file backup.'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid draft data.'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid draft data.'},400);
  if(input.accountId!==user.discord_id)return json({error:'Your signed-in account changed. Refresh before saving.'},409);
  if(!Number.isSafeInteger(input.revision)||input.revision<0)return json({error:'Open the account draft status before saving.'},400);
  const d=input.draft;
  if(!d||d.version!==4||!Array.isArray(d.leagues)||d.leagues.length>20||!Array.isArray(d.seasons)||d.seasons.length>50||!Array.isArray(d.competitions)||d.competitions.length>100||d.leagues.some(l=>!l?.settings||typeof l.settings.league!=='string'||typeof l.settings.season!=='string'||!Array.isArray(l.settings.teams)))return json({error:'Not a supported league draft archive.'},400);
  const payload=JSON.stringify(d);
  // Compare-and-swap is one statement: two devices cannot overwrite the same revision.
  const result=input.revision===0
   ?await env.DB.prepare('INSERT OR IGNORE INTO preview_account_drafts(discord_id,payload,revision) VALUES(?,?,1)').bind(user.discord_id,payload).run()
   :await env.DB.prepare("UPDATE preview_account_drafts SET payload=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE discord_id=? AND revision=?").bind(payload,user.discord_id,input.revision).run();
  if(!result.meta.changes)return json({error:'Newer account drafts exist. Open them before saving again. Your browser drafts have not been changed.'},409);
  return json({saved:true,account,revision:input.revision+1});
 }catch(error){console.error('Preview account drafts unavailable',String(error));return json({error:'Account draft storage is unavailable. Your browser drafts are still on this device.'},503);}
}
