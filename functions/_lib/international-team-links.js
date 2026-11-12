import {json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {verifyEaClub} from '../../league-suite-runtime/functions/_lib/ea-club-search.js';
const COMPETITION='ufl-internationals';

// Called only behind the League Suite access gate, with its verified actor.
export async function internationalTeamLinksApi(request,env,{verify=verifyEaClub}={}){
 const actor=env.SUITE_ACTOR;
 if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Owner or administrator access required.'},403);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405,{allow:'GET, POST'});
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const competition=await env.DB.prepare('SELECT id,name,publish_results,shared_league_id FROM international_competitions WHERE id=?').bind(COMPETITION).first();
 if(!competition)return json({error:'The international competition has not been configured.'},404);
 const teams=(await env.DB.prepare('SELECT id,name,ea_club_id FROM international_teams WHERE competition_id=? ORDER BY name').bind(COMPETITION).all()).results;
 const active=!!(competition.publish_results&&competition.shared_league_id);
 if(request.method==='GET')return json({competition:{id:competition.id,name:competition.name,trackingSource:active?'league-suite':'virtual-arena'},teams:teams.map(t=>({id:t.id,name:t.name,eaClubId:t.ea_club_id||null})),linkedTeams:teams.filter(t=>t.ea_club_id).length});
 const limited=await consumeRateLimit(env,{scope:'international-team-link',subject:actor.discord_id,limit:15});
 if(!limited.success)return json({error:'Please wait a minute before linking again.'},429,{'retry-after':String(limited.retryAfter)});
 let payload;
 try{const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);payload=JSON.parse(raw);}catch{return json({error:'Invalid club selection.'},400);}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return json({error:'Invalid club selection.'},400);
 const team=teams.find(t=>t.id===payload.teamId);
 if(!team||!Object.hasOwn(payload,'expectedClubId'))return json({error:'Choose a national team from this competition.'},400);
 if((team.ea_club_id||null)!==payload.expectedClubId)return json({error:'This national team changed online. Refresh before linking.'},409);
 if(env.LEAGUE_SUITE_DB&&String(payload.club?.id||'')!==team.ea_club_id){const test=await env.LEAGUE_SUITE_DB.prepare('SELECT enabled FROM preview_league_results WHERE id=?').bind('ufl-internationals-ea-test-20261112').first();if(test?.enabled)return json({error:'Stop international test collection and review its saved club mappings before changing this national link.'},409);}
 if(active&&String(payload.club?.id||'')!==team.ea_club_id)return json({error:'International collection is already published. A club-ID change requires a reviewed, dated replacement.'},409);
 if(teams.some(t=>t.id!==team.id&&t.ea_club_id===payload.club?.id))return json({error:'That EA club is already linked to another national team.'},409);
 try{
  const club=await verify(payload.club);
  if(team.ea_club_id===club.id)return json({linked:true,teamId:team.id,club,note:'EA club verified. The existing national link is unchanged.'});
  // Additive/idempotent; older deployments need no destructive schema migration.
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS international_team_link_audit (id TEXT PRIMARY KEY,competition_id TEXT NOT NULL,team_id TEXT NOT NULL,actor TEXT NOT NULL,detail_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(competition_id,team_id) REFERENCES international_teams(competition_id,id))').run();
  const changes=await env.DB.batch([
   env.DB.prepare('INSERT INTO international_team_link_audit(id,competition_id,team_id,actor,detail_json) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM international_teams WHERE competition_id=? AND id=? AND ea_club_id IS ?) AND EXISTS(SELECT 1 FROM international_competitions WHERE id=? AND NOT(publish_results=1 AND shared_league_id IS NOT NULL))').bind(crypto.randomUUID(),COMPETITION,team.id,actor.discord_id,JSON.stringify({before:team.ea_club_id||null,after:club.id,clubName:club.name,platform:club.platform,verifiedAt:club.verifiedAt}),COMPETITION,team.id,team.ea_club_id||null,COMPETITION),
   env.DB.prepare('UPDATE international_teams SET ea_club_id=? WHERE competition_id=? AND id=? AND ea_club_id IS ? AND EXISTS(SELECT 1 FROM international_competitions WHERE id=? AND NOT(publish_results=1 AND shared_league_id IS NOT NULL))').bind(club.id,COMPETITION,team.id,team.ea_club_id||null,COMPETITION)
  ]);
  if(!changes[1].meta.changes)return json({error:'International setup changed while linking. Refresh and try again.'},409);
  return json({linked:true,teamId:team.id,club,note:'National EA club linked and saved online. Result sources, standings, rosters and migration activation are unchanged.'});
 }catch(error){return json({error:/UNIQUE constraint/.test(error.message)?'That EA club is already linked to another national team.':error.message},/unavailable/.test(error.message)?502:409);}
}
