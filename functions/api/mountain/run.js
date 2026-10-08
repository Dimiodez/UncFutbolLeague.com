import { getSession, json, sameOrigin, randomToken } from '../../_lib/auth.js';
import { consumeRateLimit } from '../../_lib/rate-limit.js';
import { ensureMountain, validateCheckpoint, VERSION, STAT_KEYS } from '../../_lib/mountain.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Leaderboard unavailable.' }, 503);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const user = await getSession(request, env);
  if (!user) return json({ error: 'Sign in with Discord before starting to save your run.' }, 401);
  const rate = await consumeRateLimit(env, { scope: 'mountain-run', subject: String(user.discord_id), limit: 40 });
  if (!rate.success) return json({ error: 'Please wait a minute before trying again.' }, 429);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 5000) throw Error();
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object') throw Error();
  } catch { return json({ error: 'Invalid run.' }, 400); }
  await ensureMountain(env);
  const now = Math.floor(Date.now() / 1000);
  if (body.action === 'start') {
    const id = randomToken();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM mountain_runs WHERE expires_at < ?').bind(now),
      env.DB.prepare('INSERT INTO mountain_runs (id,discord_id,version,started_at,expires_at) VALUES (?,?,?,?,?)')
        .bind(id, String(user.discord_id), VERSION, now, now + 172800),
    ]);
    return json({ id });
  }
  if (body.action !== 'checkpoint' || typeof body.id !== 'string' || body.id.length > 100) return json({ error: 'Invalid run.' }, 400);
  const run = await env.DB.prepare('SELECT * FROM mountain_runs WHERE id=? AND discord_id=? AND version=?')
    .bind(body.id, String(user.discord_id), VERSION).first();
  if (!run || run.finished || run.expires_at < now) return json({ error: 'Run expired or already saved.' }, 409);
  let stats;
  try { stats = validateCheckpoint(body, run, now); }
  catch { return json({ error: 'Run could not be validated.' }, 400); }
  const token = randomToken();
  const finished = body.level === 10;
  const statements = [env.DB.prepare('UPDATE mountain_runs SET level=?,stats=?,finished=?,commit_token=? WHERE id=? AND level=? AND finished=0')
    .bind(body.level, JSON.stringify(stats), finished ? 1 : 0, token, run.id, run.level)];
  if (finished) statements.push(env.DB.prepare(`INSERT INTO mountain_bests (discord_id,version,${STAT_KEYS.join(',')},achieved_at)
    SELECT discord_id,version,?,?,?,?,?,?,? FROM mountain_runs WHERE id=? AND commit_token=?
    ON CONFLICT(discord_id,version) DO UPDATE SET
    ${STAT_KEYS.map(key => `${key}=excluded.${key}`).join(',')},achieved_at=excluded.achieved_at
    WHERE excluded.activePlayMs<mountain_bests.activePlayMs OR (excluded.activePlayMs=mountain_bests.activePlayMs AND excluded.totalDeaths<mountain_bests.totalDeaths)`)
    .bind(...STAT_KEYS.map(key => stats[key]), now, run.id, token));
  const saved = await env.DB.batch(statements);
  if (!saved[0].meta.changes) return json({ error: 'Checkpoint already saved.' }, 409);
  return json({ ok: true, finished });
}
