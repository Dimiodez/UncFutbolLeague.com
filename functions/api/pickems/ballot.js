import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensurePickemCompetitionSchema, validPickemCompetition } from '../../_lib/pickems.js';
import { consumeRateLimit } from '../../_lib/rate-limit.js';

const validWeek = value => {
  const week = Number(value);
  return Number.isInteger(week) && week >= 1 && week <= 99 ? week : null;
};

export async function onRequestGet({ request, env }) {
  const user = await getSession(request, env);
  if (!user) return json({ error: 'Discord login required.' }, 401);
  await ensurePickemCompetitionSchema(env);
  const url = new URL(request.url);
  const week = validWeek(url.searchParams.get('week'));
  const competition = validPickemCompetition(url.searchParams.get('competition'));
  if (!week || !competition) return json({ error: 'Invalid Pick’em competition or gameweek.' }, 400);
  const [picks, tiebreaker] = await env.DB.batch([
    env.DB.prepare(`SELECT p.match_id AS matchId, p.choice FROM picks p JOIN pickem_matches m ON m.id = p.match_id WHERE p.discord_id = ? AND m.competition_key = ? AND m.week = ?`).bind(String(user.discord_id), competition, week),
    env.DB.prepare(`SELECT goals FROM pickem_tiebreakers_v2 WHERE discord_id = ? AND competition_key = ? AND week = ?`).bind(String(user.discord_id), competition, week)
  ]);
  return json({
    picks: Object.fromEntries(picks.results.map(row => [String(row.matchId), row.choice])),
    tiebreaker: tiebreaker.results[0]?.goals ?? null
  });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const user = await getSession(request, env);
  if (!user) return json({ error: 'Discord login required.' }, 401);
  const rate = await consumeRateLimit(env, { scope: 'pickems-ballot', subject: String(user.discord_id), limit: 20 });
  if (!rate.success) return json({ error: 'Too many ballot updates. Please wait a minute and try again.' }, 429, { 'retry-after': String(rate.retryAfter) });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid ballot.' }, 400); }
  const week = validWeek(body.week);
  const competition = validPickemCompetition(body.competition);
  const goals = Number(body.tiebreaker);
  if (!week || !competition || !Number.isInteger(goals) || goals < 0 || goals > 99 || !body.picks || typeof body.picks !== 'object') return json({ error: 'Complete the ballot and tiebreaker.' }, 400);
  await ensurePickemCompetitionSchema(env);
  const matches = await env.DB.prepare(`SELECT id FROM pickem_matches WHERE competition_key = ? AND week = ? AND home_score IS NULL AND away_score IS NULL AND scheduled_at > unixepoch() ORDER BY id`).bind(competition, week).all();
  if (!matches.results.length) return json({ error: 'Voting for this gameweek is closed.' }, 409);
  const expected = matches.results.map(row => String(row.id));
  if (expected.some(id => !['home','draw','away'].includes(body.picks[id])) || Object.keys(body.picks).some(id => !expected.includes(String(id)))) return json({ error: 'Submit one valid pick for every open match.' }, 400);
  const statements = expected.map(id => env.DB.prepare(`
    INSERT INTO picks (discord_id, match_id, choice) VALUES (?, ?, ?)
    ON CONFLICT(discord_id, match_id) DO UPDATE SET choice = excluded.choice, updated_at = datetime('now')
  `).bind(String(user.discord_id), Number(id), body.picks[id]));
  statements.push(env.DB.prepare(`
    INSERT INTO pickem_tiebreakers_v2 (discord_id, competition_key, week, goals) VALUES (?, ?, ?, ?)
    ON CONFLICT(discord_id, competition_key, week) DO UPDATE SET goals = excluded.goals, updated_at = datetime('now')
  `).bind(String(user.discord_id), competition, week, goals));
  await env.DB.batch(statements);
  return json({ ok: true, savedAt: new Date().toISOString() });
}
