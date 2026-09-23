export const VERSION = 'sandy-1';
export async function ensureSandy(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sandy_runs (id TEXT PRIMARY KEY, discord_id TEXT NOT NULL, started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0, commit_token TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sandy_bests (discord_id TEXT PRIMARY KEY, score INTEGER NOT NULL, seconds INTEGER NOT NULL, combo INTEGER NOT NULL, achieved_at INTEGER NOT NULL)`)
  ]);
}

// Recompute scores from bounded event logs. This checks scoring rules and timing,
// not Phaser collision replay; it is a casual leaderboard, not cheat-proof ranking.
export function scoreRun(events, duration, wallSeconds) {
  if (!Array.isArray(events) || events.length > 16000 || !Number.isFinite(duration) || duration < 0 || duration > 7200 || duration > wallSeconds + 5) throw Error('Invalid duration');
  let score=0, combo=0, bestCombo=0, lives=3, lastTime=0, lastTouch=-1, lastDrop=-1, lastLife=-100;
  const cleared = new Set();
  for (const event of events) {
    if (!event || !Number.isFinite(event.t) || event.t < lastTime || event.t > duration + .01 || lives === 0) throw Error('Invalid event order');
    const t=event.t; lastTime=t;
    if (event.kind === 'touch') {
      if(t-lastTouch < .175) throw Error('Touches too fast');
      lastTouch=t;combo++;bestCombo=Math.max(bestCombo,combo);score+=100*Math.min(6,1+Math.floor(combo/5));
    } else if (event.kind === 'drop') {
      if(t-lastDrop < .34) throw Error('Drops too fast');
      lastDrop=t;lives--;combo=0;
    } else if (event.kind === 'life') {
      if(t<90 || t-lastLife<89 || lives>=3) throw Error('Invalid life');
      lastLife=t;lives++;
    } else if (event.kind === 'builder' || event.kind === 'castle') {
      const id=event.id;
      const spawnLimit=t<4?0:1+Math.ceil((t-4)*Math.sqrt(1+t/90)/8);
      if(!Number.isInteger(id)||id<0||id>spawnLimit||cleared.has(id)||(id===0&&event.kind!=='castle')) throw Error('Invalid obstacle');
      cleared.add(id);score+=event.kind==='builder'?150:250;
    } else throw Error('Unknown event');
  }
  if(lives!==0 || !events.length || Math.abs(lastTime-duration)>.05) throw Error('Run not finished');
  return {score,seconds:Math.floor(duration),combo:bestCombo};
}
