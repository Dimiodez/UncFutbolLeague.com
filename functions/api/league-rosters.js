import {json} from '../_lib/auth.js';
import {rosterSnapshot} from '../_lib/league-rosters.js';
export async function onRequestGet({env}){const {players}=await rosterSnapshot(env);return json({players});}
