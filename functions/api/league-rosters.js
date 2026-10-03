import {json} from '../_lib/auth.js';
import {rosterSnapshot} from '../_lib/league-rosters.js';
export async function onRequestGet({env}){const {players}=await rosterSnapshot(env),aliases=await env.DB.prepare('SELECT alias_id,canonical_id FROM league_player_aliases').all();return json({players,aliases:Object.fromEntries(aliases.results.map(a=>[a.alias_id,a.canonical_id]))});}
