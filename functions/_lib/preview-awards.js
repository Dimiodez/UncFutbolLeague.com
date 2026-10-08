import {getSession,json,sameOrigin,sha256} from './auth.js';
import {validatePublication,publicationIdentity} from '../../league-awards-publication.js';
export async function previewAwardsApi(request,env){
 if(!env.DB)return json({error:'Award archive is not configured.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 try{
  if(request.method==='GET'){
   const result=await env.DB.prepare('SELECT id,revision,snapshot,published_at FROM preview_award_publications ORDER BY published_at DESC LIMIT 500').all();
   return json({publications:result.results.map(row=>({id:row.id,revision:row.revision,publishedAt:row.published_at,...JSON.parse(row.snapshot)}))});
  }
  if(!sameOrigin(request))return json({error:'Same-origin request required.'},403);
  const actor=await getSession(request,env);
  if(!actor)return json({error:'Sign in with Discord to publish.'},401);
  if(!['owner','admin'].includes(actor.role))return json({error:'Only a website owner or administrator can publish awards.'},403);
  const raw=await request.text();if(raw.length>64000)return json({error:'Lineup is too large.'},413);
  let checked;try{checked=validatePublication(JSON.parse(raw));}catch(error){return json({error:error.message},400);}
  const id=await sha256(publicationIdentity(checked));
  const snapshot=JSON.stringify({settings:checked.settings,leagueKey:checked.leagueKey,board:checked.board,weekNumber:checked.weekNumber});
  // Compare-and-swap, then preserve this exact successful revision in one transaction.
  const revision=checked.revision+1;
  const result=await env.DB.batch([
   env.DB.prepare(`INSERT INTO preview_award_publications(id,revision,snapshot,published_by) SELECT ?,?,?,? WHERE ?=0
    ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,published_by=excluded.published_by,published_at=datetime('now') WHERE preview_award_publications.revision=?`).bind(id,revision,snapshot,actor.discord_id,checked.revision,checked.revision),
   env.DB.prepare(`UPDATE preview_award_publications SET revision=?,snapshot=?,published_by=?,published_at=datetime('now') WHERE id=? AND revision=? AND ?>0`).bind(revision,snapshot,actor.discord_id,id,checked.revision,checked.revision),
   env.DB.prepare(`INSERT OR IGNORE INTO preview_award_revisions(publication_id,revision,snapshot,published_by) SELECT id,revision,snapshot,published_by FROM preview_award_publications WHERE id=? AND revision=? AND snapshot=? AND published_by=?`).bind(id,revision,snapshot,actor.discord_id)
  ]);
  if(!(result[0].meta.changes+result[1].meta.changes))return json({error:'This award was changed elsewhere. Reload the published version before replacing it.'},409);
  return json({published:true,id,revision});
 }catch(error){console.error('Preview award archive failed',String(error));return json({error:'Award archive is unavailable. Your local selection has not been changed.'},503);}
}
