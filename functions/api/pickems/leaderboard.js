import { json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const requestedWeek = Number(url.searchParams.get('week'));
  const weekly = Number.isInteger(requestedWeek) && requestedWeek > 0;
  const where = weekly ? 'WHERE m.week = ?' : '';
  const statement = env.DB.prepare(`
    SELECT u.display_name AS displayName, u.username, u.avatar_url AS avatarUrl,
      SUM(CASE
        WHEN m.home_score IS NULL OR m.away_score IS NULL THEN 0
        WHEN p.choice = CASE WHEN m.home_score > m.away_score THEN 'home' WHEN m.home_score < m.away_score THEN 'away' ELSE 'draw' END THEN 1
        ELSE 0 END) AS score,
      SUM(CASE WHEN m.home_score IS NOT NULL AND m.away_score IS NOT NULL THEN 1 ELSE 0 END) AS scoredMatches,
      COUNT(*) AS picksMade
    FROM picks p
    JOIN users u ON u.discord_id = p.discord_id AND u.status = 'active'
    JOIN pickem_matches m ON m.id = p.match_id
    ${where}
    GROUP BY u.discord_id, u.display_name, u.username, u.avatar_url
    ORDER BY score DESC, picksMade DESC, u.display_name COLLATE NOCASE ASC
    LIMIT 100
  `);
  const result = weekly ? await statement.bind(requestedWeek).all() : await statement.all();
  return json({ scope: weekly ? 'weekly' : 'season', week: weekly ? requestedWeek : null, entries: result.results });
}
