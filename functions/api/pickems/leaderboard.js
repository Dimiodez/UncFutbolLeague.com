import { json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const requestedWeek = Number(url.searchParams.get('week'));
  const weekly = Number.isInteger(requestedWeek) && requestedWeek > 0;

  const seasonResponse = await env.ASSETS.fetch(new URL('/pickems-app/season-data.json', request.url));
  if (!seasonResponse.ok) return json({ error: 'Official UFL results are temporarily unavailable.' }, 503);
  const season = await seasonResponse.json();
  const officialResults = new Map();
  for (const week of season.weeks ?? []) {
    for (const [id,,, homeScore, awayScore] of week.matches ?? []) {
      if (homeScore === null || awayScore === null) continue;
      officialResults.set(String(id), homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw');
    }
  }

  const where = weekly ? 'AND m.week = ?' : '';
  const statement = env.DB.prepare(`
    SELECT u.discord_id AS discordId, u.display_name AS displayName, u.username,
      u.avatar_url AS avatarUrl, p.match_id AS matchId, p.choice
    FROM picks p
    JOIN users u ON u.discord_id = p.discord_id AND u.status = 'active'
    JOIN pickem_matches m ON m.id = p.match_id
    WHERE 1 = 1 ${where}
    ORDER BY u.display_name COLLATE NOCASE ASC
  `);
  const result = weekly ? await statement.bind(requestedWeek).all() : await statement.all();
  const members = new Map();
  for (const row of result.results) {
    if (!members.has(row.discordId)) members.set(row.discordId, {
      displayName: row.displayName, username: row.username, avatarUrl: row.avatarUrl,
      score: 0, scoredMatches: 0, picksMade: 0
    });
    const member = members.get(row.discordId);
    member.picksMade += 1;
    const outcome = officialResults.get(String(row.matchId));
    if (outcome) {
      member.scoredMatches += 1;
      if (row.choice === outcome) member.score += 1;
    }
  }
  const entries = [...members.values()]
    .sort((a, b) => b.score - a.score || b.picksMade - a.picksMade || a.displayName.localeCompare(b.displayName))
    .slice(0, 100);
  return json({ scope: weekly ? 'weekly' : 'season', week: weekly ? requestedWeek : null, entries });
}
