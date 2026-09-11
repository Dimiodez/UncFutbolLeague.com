import {createGame,update,launch,advance} from '../../arcade-app/engine.mjs';
import {TEAM_NAMES} from '../../arcade-app/teams.mjs';
export const GAME_VERSION='cleat-v1';
export function initialGame(team,seed){if(!Object.hasOwn(TEAM_NAMES,team))throw new Error('Choose a valid club.');const g=createGame(team,Object.keys(TEAM_NAMES),seed);g.phase='ready';return g;}
export function replay(g,steps){
 if(!Array.isArray(steps)||steps.length>1400)throw new Error('Invalid gameplay packet.');let ticks=0;
 for(const step of steps){if(!Array.isArray(step))throw new Error('Invalid action.');if(typeof step[0]==='number'){
   const [x,n]=step;if(step.length!==2||!Number.isInteger(x)||x<0||x>640||!Number.isInteger(n)||n<1||n>1200||ticks+n>1200)throw new Error('Invalid movement.');
   for(let i=0;i<n;i++){if(!['ready','playing'].includes(g.phase))throw new Error('Run is not playing.');update(g,1/120,x);g.events=[];}ticks+=n;
 }else if(step[0]==='launch'&&step.length===1&&g.phase==='ready')launch(g);
 else if(step[0]==='advance'&&step.length===1&&g.phase==='levelup')advance(g);
 else if(step[0]==='aim'&&step.length===2&&g.phase==='ready'&&Number.isInteger(step[1])&&step[1]>=0&&step[1]<=640)update(g,0,step[1]);
 else throw new Error('Invalid game transition.');}
 g.events=[];return {game:g,ticks,finished:['over','won'].includes(g.phase)};
}
export async function ensureArcade(env){await env.DB.batch([
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS arcade_runs (id TEXT PRIMARY KEY, discord_id TEXT NOT NULL, version TEXT NOT NULL, team TEXT NOT NULL, state TEXT NOT NULL, seq INTEGER NOT NULL DEFAULT 0, ticks INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, commit_token TEXT, finished INTEGER NOT NULL DEFAULT 0)`),
 env.DB.prepare(`CREATE TABLE IF NOT EXISTS arcade_bests (discord_id TEXT NOT NULL, version TEXT NOT NULL, team TEXT NOT NULL, score INTEGER NOT NULL, level INTEGER NOT NULL, achieved_at INTEGER NOT NULL, PRIMARY KEY(discord_id,version))`)
]);}
