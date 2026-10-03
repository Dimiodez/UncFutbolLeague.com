export function duplicateGroups(people){
 const groups=new Map();for(const p of people){const name=p.name.trim().toLowerCase();if(!groups.has(name))groups.set(name,[]);groups.get(name).push(p);}
 return [...groups.values()].filter(g=>g.length>1);
}
export function mergeConflict(keep,source){
 for(const division of ['6v6','10v10']){const a=keep.memberships[division]?.team,b=source.memberships[division]?.team;if(a&&b&&a!==b)return `Both records have different ${division} teams. Resolve their assignments before merging.`;}
 return null;
}
export function mergeStatements(env,keepId,sourceId,actor,backup){
 return [
  env.DB.prepare('INSERT INTO league_player_aliases(alias_id,canonical_id,created_by,backup_json) VALUES(?,?,?,?)').bind(sourceId,keepId,actor,JSON.stringify(backup)),
  env.DB.prepare(`INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key,metadata_json,updated_by,updated_at)
   SELECT ?,season,division,profile_id,team_key,metadata_json,updated_by,updated_at FROM league_roster_memberships WHERE player_id=?
   ON CONFLICT(player_id,season,division) DO UPDATE SET
    profile_id=CASE WHEN league_roster_memberships.team_key IS NULL AND excluded.team_key IS NOT NULL THEN excluded.profile_id ELSE league_roster_memberships.profile_id END,
    metadata_json=CASE WHEN league_roster_memberships.team_key IS NULL AND excluded.team_key IS NOT NULL THEN excluded.metadata_json ELSE league_roster_memberships.metadata_json END,
    team_key=COALESCE(league_roster_memberships.team_key,excluded.team_key)`).bind(keepId,sourceId),
  env.DB.prepare('UPDATE player_photo_submissions SET identity_id=? WHERE identity_id=?').bind(keepId,sourceId),
  env.DB.prepare('UPDATE player_photo_retired_assets SET identity_id=? WHERE identity_id=?').bind(keepId,sourceId),
  env.DB.prepare('INSERT OR IGNORE INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by,approved_at) SELECT ?,submission_id,portrait_key,approved_by,approved_at FROM player_photo_publications WHERE identity_id=?').bind(keepId,sourceId),
  env.DB.prepare('DELETE FROM player_photo_publications WHERE identity_id=?').bind(sourceId)
 ];
}
