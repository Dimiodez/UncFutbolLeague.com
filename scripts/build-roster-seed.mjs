// One-time seed: preserve existing membership/profile IDs and confirmed identity aliases.
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const app=await readFile('app.js','utf8'),ctx=vm.createContext({window:{},URLSearchParams,console});
vm.runInContext(await readFile('pickems-app/season-data.js','utf8'),ctx);
vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+await readFile('league-season2.js','utf8')+await readFile('player-portraits.js','utf8')+await readFile('league-pages.js','utf8')+'\nglobalThis.seeds=leagueProvisionalSeasons;globalThis.aliases=leaguePlayerPortraits;globalThis.clubs=Object.fromEntries(["6v6","10v10"].map(division=>[division,Object.entries(leagueViewContext(new URLSearchParams({season:"2",division})).season.teams).map(([key,team])=>({key,name:team[0]}))]));',ctx);
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const schema=`CREATE TABLE IF NOT EXISTS league_players (
 id TEXT PRIMARY KEY, discord_name TEXT NOT NULL, normalized_name TEXT NOT NULL,
 created_by TEXT REFERENCES users(discord_id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS league_players_name ON league_players(normalized_name);
CREATE TABLE IF NOT EXISTS league_roster_memberships (
 player_id TEXT NOT NULL REFERENCES league_players(id), season TEXT NOT NULL,
 division TEXT NOT NULL CHECK(division IN ('6v6','10v10')), profile_id TEXT NOT NULL,
 team_key TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', updated_by TEXT REFERENCES users(discord_id),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(player_id,season,division)
);
CREATE INDEX IF NOT EXISTS league_roster_team ON league_roster_memberships(season,division,team_key);
`;
const statements=[],seen=new Set();
for(const [division,season] of Object.entries(ctx.seeds))for(const p of season.players){
 const alias=ctx.aliases.find(a=>a.playerIds.includes(String(p.id))),id=alias?alias.playerIds[0]:String(p.id),name=p.name.trim();
 if(!seen.has(id)){statements.push(`INSERT OR IGNORE INTO league_players(id,discord_name,normalized_name) VALUES(${quote(id)},${quote(name)},${quote(name.toLowerCase())});`);seen.add(id);}
 statements.push(`INSERT OR IGNORE INTO league_roster_memberships(player_id,season,division,profile_id,team_key,metadata_json) VALUES(${quote(id)},'2',${quote(division)},${quote(p.id)},${quote(p.club)},${quote(JSON.stringify(p))});`);
}
await writeFile('migrations/0012_league_rosters.sql',schema+statements.join('\n')+'\n');
await writeFile('functions/_lib/roster-clubs.js','// Generated roster assignment allowlist; rebuild when clubs change.\nexport const ROSTER_CLUBS = '+JSON.stringify(ctx.clubs,null,2)+';\n');
console.log(`Prepared ${seen.size} players without modifying existing archives.`);
