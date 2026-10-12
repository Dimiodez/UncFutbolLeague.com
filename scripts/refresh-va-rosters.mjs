// Explicit staff-run reconciliation, never an unattended name-based import.
// Backups/reports stay outside the published checkout. Default is read-only.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const output=process.env.UFL_ROSTER_AUDIT_DIR;
if(!output||!path.isAbsolute(output))throw Error('Set UFL_ROSTER_AUDIT_DIR to a private absolute backup directory.');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../league-season2.js',import.meta.url),'utf8')+';globalThis.links=leagueOfficialClubLinks;',ctx);
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
async function props(url){const r=await fetch(url);if(!r.ok)throw Error(`VA returned ${r.status}`);const m=(await r.text()).match(/data-page="([^"]+)"/);if(!m)throw Error('VA data missing');return JSON.parse(decode(m[1])).props;}
const clubs=[];
for(const division of ['6v6','10v10']){
 const season=JSON.parse(fs.readFileSync(new URL(`../pickems-app/seasons/s2-${division}.json`,import.meta.url),'utf8'));
 for(const team of season.teamDetails.filter(t=>t.registered!==false)){
  const key=Object.values(ctx.links[division]).find(t=>t.teamId===team.teamId)?.key||team.key;
  const p=await props(team.url);
  if(p.team?.id!==team.teamId||p.competitionInfo?.season?.id!==season.seasonId||p.competitionInfo?.competition?.id!==season.competitionId)throw Error(`Wrong team or season: ${team.name}`);
  const users=new Map((p.team.users||[]).map(u=>[u.id,u])),players=[],unregistered=[];
  for(const [position,details] of Object.entries(p.competitionInfo.squad||{}))for(const row of Object.values(details.players||{})){
   const u={...users.get(row.user?.id),...row.user};
   if(!Number.isInteger(u.id)||!u.name)throw Error(`Missing identity: ${team.name}`);
   const player={vaUserId:u.id,name:u.name,origin:u.origin_id||null,xbox:u.xbox_id||null,psn:u.psn_id||null,position};
   (position==='unregistered'?unregistered:players).push(player);
  }
  if(!players.length||new Set(players.map(p=>p.vaUserId)).size!==players.length)throw Error(`Empty or duplicate roster: ${team.name}`);
  clubs.push({division,key,name:team.name,url:team.url,players,unregistered});
 }
}
const token=fs.readFileSync(path.join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml'),'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
if(!token)throw Error('Cloudflare authorization unavailable');
async function query(sql){const r=await fetch('https://api.cloudflare.com/client/v4/accounts/c6fc6be01ae7f90232ab9d519cbcfbb0/d1/database/2e4969ed-3a15-4e07-b0a2-516fb480b58f/query',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({sql})});const d=await r.json();if(!r.ok||!d.success)throw Error(`Database operation failed: ${r.status} ${JSON.stringify(d.errors)}`);return d.result.map(x=>x.results);}
const [players,memberships,aliases,links,portraits,pickems]=await query(`SELECT * FROM league_players; SELECT * FROM league_roster_memberships; SELECT * FROM league_player_aliases; SELECT * FROM league_va_player_links; SELECT * FROM player_photo_publications; SELECT competition_key,COUNT(*) AS matches,(SELECT COUNT(*) FROM picks p JOIN pickem_matches pm ON p.match_id=pm.id WHERE pm.competition_key=m.competition_key) AS picks FROM pickem_matches m GROUP BY competition_key;`);
const observedAt=new Date().toISOString(),stamp=observedAt.replace(/[:.]/g,'-');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,`before-${stamp}.json`),JSON.stringify({observedAt,clubs,players,memberships,aliases,links,portraits,pickems},null,2));
const norm=v=>String(v||'').trim().toLowerCase(),fuzzy=v=>norm(v).replace(/[^a-z0-9]/g,'');
const aliasMap=new Map(aliases.map(a=>[a.alias_id,a.canonical_id]));
const canonical=id=>{const seen=new Set();while(aliasMap.has(id)){if(seen.has(id))throw Error('Identity alias cycle');seen.add(id);id=aliasMap.get(id);}return id;};
const people=new Map(players.filter(p=>!aliasMap.has(p.id)).map(p=>[p.id,p]));
const vaPeople=new Map();
for(const club of clubs)for(const p of club.players){if(!vaPeople.has(p.vaUserId))vaPeople.set(p.vaUserId,{...p,targets:[]});const person=vaPeople.get(p.vaUserId);if(person.targets.some(t=>t.division===club.division))throw Error('VA player appears on two teams in one division');person.targets.push({...p,division:club.division,key:club.key,url:club.url});}
const resolved=[],pending=[];
// Owner-confirmed on 2026-10-12. Target an existing canonical identity, not a new profile.
const confirmedNames=new Map([
 [39,['Cookie','Cookie Monster']],[3,['Bravo','BravoAnte']],[7,['zo','zo54']],
 [26,['liz','liz4']],[86,['NB','nb70']],[33,['ESpahr09','ESpahr09']],
 [37,['Ripp','Rippy Nolan']],[25,['LOW T (Bradical)','Low T (Bradical)']],
 [30,['Hockey Soon','Hockey Soon']],[97,['Kay!','K0zmic Kay']],
 [18,['hoobear','H00bear']],[59,['BN','BN95']],[101,['thughes','Tjhughes9']]
]);
const priorReview=process.env.UFL_PRIOR_ROSTER_REPORT?JSON.parse(fs.readFileSync(process.env.UFL_PRIOR_ROSTER_REPORT,'utf8')):null;
// Previously reviewed aliases stay unresolved across runs until explicitly linked.
const unresolvedBefore=new Set([93,3,7,26,86,37,25,30,97,18,82,33,46,59,92,39,78,101,...(priorReview?.pending||[]).map(p=>p.vaUserId)]);
// Owner explicitly confirmed these five are new people, not aliases.
for(const id of [93,82,46,92,78])unresolvedBefore.delete(id);
for(const p of vaPeople.values()){
 const linked=links.find(l=>l.va_user_id===p.vaUserId);
 const handles=p.targets.flatMap(t=>[t.origin,t.xbox,t.psn]).filter(Boolean).map(norm);
 const candidates=new Set(players.filter(old=>norm(old.discord_name)===norm(p.name)||handles.includes(norm(old.discord_name))).map(old=>canonical(old.id)));
 for(const m of memberships){const meta=JSON.parse(m.metadata_json||'{}');if([meta.origin,meta.xbox,meta.psn,meta.eaName,meta.gamertag].filter(Boolean).some(h=>handles.includes(norm(h))))candidates.add(canonical(m.player_id));}
 const similar=[...people.values()].filter(old=>fuzzy(old.discord_name)===fuzzy(p.name));
 let identity=linked?canonical(linked.player_id):candidates.size===1?[...candidates][0]:null;
 const confirmed=confirmedNames.get(p.vaUserId);
 if(confirmed&&!linked){
  const confirmedIds=new Set(players.filter(old=>[norm(confirmed[0]),norm(confirmed[1])].includes(norm(old.discord_name))).map(old=>canonical(old.id)));
  if(confirmedIds.size!==1)throw Error(`Confirmed alias requires exactly one canonical profile: ${p.name}`);
  identity=[...confirmedIds][0];
 }
 if(!identity&&candidates.size===0&&similar.length===1)identity=similar[0].id;
 if(!identity&&(candidates.size||similar.length||unresolvedBefore.has(p.vaUserId))){pending.push({...p,reason:'Identity requires review; do not create a duplicate',candidates:[...candidates],similar:similar.map(p=>p.discord_name)});continue;}
 if(identity&&links.some(l=>canonical(l.player_id)===identity&&l.va_user_id!==p.vaUserId)){pending.push({...p,reason:'Identity already linked to another VA account'});continue;}
 if(identity&&resolved.some(r=>r.identity===identity)){pending.push({...p,reason:'Two VA accounts match one player'});continue;}
 resolved.push({...p,identity:identity||`player-${randomUUID()}`,isNew:!identity,preferredName:confirmed?.[1]});
}
const q=v=>v==null?'NULL':`'${String(v).replaceAll("'","''")}'`;
const changes=[],sql=[];
// D1 multi-statement query is transactional; a failed guard aborts all changes.
sql.push('CREATE TABLE _va_refresh_guard(ok INTEGER NOT NULL CHECK(ok=1));');
for(const [table,rows] of [['league_players',players],['league_roster_memberships',memberships],['league_va_player_links',links],['league_player_aliases',aliases]]){
 sql.push(`INSERT INTO _va_refresh_guard VALUES ((SELECT COUNT(*) FROM ${table})=${rows.length});`);
 for(const row of rows)sql.push(`INSERT INTO _va_refresh_guard VALUES (EXISTS(SELECT 1 FROM ${table} WHERE ${Object.entries(row).map(([k,v])=>`${k} IS ${q(v)}`).join(' AND ')}));`);
}
for(const p of resolved){
 if(p.isNew)sql.push(`INSERT INTO league_players(id,discord_name,normalized_name) VALUES (${q(p.identity)},${q(p.name)},${q(norm(p.name))});`);
 if(p.preferredName&&people.get(p.identity)?.discord_name!==p.preferredName){
  if([...people.values()].some(old=>old.id!==p.identity&&norm(old.discord_name)===norm(p.preferredName)))throw Error('Confirmed display name conflicts with another player');
  sql.push(`UPDATE league_players SET discord_name=${q(p.preferredName)},normalized_name=${q(norm(p.preferredName))},updated_at=CURRENT_TIMESTAMP WHERE id=${q(p.identity)};`);
 }
 if(!links.some(l=>l.va_user_id===p.vaUserId))sql.push(`INSERT INTO league_va_player_links(va_user_id,player_id,va_name) VALUES (${p.vaUserId},${q(p.identity)},${q(p.name)});`);
 for(const t of p.targets){
  const old=memberships.find(m=>m.player_id===p.identity&&m.season==='2'&&m.division===t.division);
  const meta=JSON.parse(old?.metadata_json||'{}');
  const fields={vaUserId:p.vaUserId,vaName:p.name,origin:t.origin,xbox:t.xbox,psn:t.psn,vaPosition:t.position,vaSource:t.url};
  if(old?.team_key===t.key&&Object.entries(fields).every(([k,v])=>meta[k]===v))continue;
  const updated={...meta,...fields,vaObservedAt:observedAt};
  sql.push(`INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key,metadata_json) VALUES (${q(p.identity)},'2',${q(t.division)},${q(old?.profile_id||p.identity)},${q(t.key)},${q(JSON.stringify(updated))}) ON CONFLICT(player_id,season,division) DO UPDATE SET team_key=excluded.team_key,metadata_json=excluded.metadata_json,updated_at=CURRENT_TIMESTAMP;`);
  changes.push({name:people.get(p.identity)?.discord_name||p.name,identity:p.identity,division:t.division,from:old?.team_key||null,to:t.key});
 }
}
// Only fully resolved official rosters may release absent memberships to the pool.
// Keep the person, profile IDs, photos and other division; never delete a player.
for(const c of clubs){
 if(c.players.some(p=>pending.some(x=>x.vaUserId===p.vaUserId)))continue;
 const wanted=new Set(c.players.map(p=>resolved.find(r=>r.vaUserId===p.vaUserId)?.identity));
 for(const old of memberships.filter(m=>m.season==='2'&&m.division===c.division&&m.team_key===c.key&&!aliasMap.has(m.player_id)&&!wanted.has(m.player_id))){
  if(resolved.some(p=>p.identity===old.player_id&&p.targets.some(t=>t.division===old.division)))continue;
  sql.push(`UPDATE league_roster_memberships SET team_key=NULL,updated_at=CURRENT_TIMESTAMP WHERE player_id=${q(old.player_id)} AND season='2' AND division=${q(old.division)};`);
  changes.push({name:people.get(old.player_id)?.discord_name,identity:old.player_id,division:old.division,from:old.team_key,to:null});
 }
}
sql.push('DROP TABLE _va_refresh_guard;');
const report={observedAt,clubs:clubs.map(c=>({name:c.name,key:c.key,division:c.division,registered:c.players.length,unregistered:c.unregistered.length})),people:vaPeople.size,newPlayers:resolved.filter(p=>p.isNew).map(p=>({name:p.name,vaUserId:p.vaUserId})),changes,pending,pickems};
fs.writeFileSync(path.join(output,`plan-${stamp}.json`),JSON.stringify(report,null,2));
if(process.argv.includes('--apply')){
 const approvedNew=new Set((process.argv.find(arg=>arg.startsWith('--new-va-ids='))||'').split('=')[1]?.split(',').map(Number)||[]);
 if(resolved.some(p=>p.isNew&&!approvedNew.has(p.vaUserId)))throw Error('Review new identities, then explicitly allow their VA IDs using --new-va-ids. No changes applied.');
 await query(sql.join('\n'));
 const [after,afterLinks,afterPhotos,afterPlayers]=await query("SELECT * FROM league_roster_memberships; SELECT * FROM league_va_player_links; SELECT * FROM player_photo_publications; SELECT * FROM league_players;");
 for(const change of changes)if(!after.some(m=>m.player_id===change.identity&&m.season==='2'&&m.division===change.division&&m.team_key===change.to))throw Error('Live roster verification failed');
 for(const p of resolved)if(!afterLinks.some(l=>l.va_user_id===p.vaUserId&&canonical(l.player_id)===p.identity))throw Error('Live identity verification failed');
 for(const p of resolved)if(p.preferredName&&!afterPlayers.some(old=>old.id===p.identity&&old.discord_name===p.preferredName))throw Error('Preferred name verification failed');
 const canonicalNames=afterPlayers.filter(p=>!aliasMap.has(p.id)).map(p=>norm(p.discord_name));
 if(new Set(canonicalNames).size!==canonicalNames.length)throw Error('Duplicate canonical player names');
 const sortPhotos=rows=>JSON.stringify([...rows].sort((a,b)=>a.identity_id.localeCompare(b.identity_id)));
 if(sortPhotos(portraits)!==sortPhotos(afterPhotos))throw Error('Portrait publications changed');
 fs.writeFileSync(path.join(output,`verified-${stamp}.json`),JSON.stringify({after,afterLinks,afterPhotos,afterPlayers},null,2));
 report.applied=true;report.verified=true;
}
console.log(JSON.stringify(report,null,2));
