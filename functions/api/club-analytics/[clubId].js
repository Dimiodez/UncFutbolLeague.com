import { getSession, json } from '../../_lib/auth.js';
import { fetchUfbService } from '../../_lib/ea-match-center.js';
import { analyticsForClub, HOUSE_CLUB_IDS } from '../../_lib/club-analytics.js';

export async function onRequestGet({ request, env, params }) {
  const clubId = String(params.clubId || '');
  if (!/^\d{1,16}$/.test(clubId)) return json({ error: 'Invalid club.' }, 400);
  if (HOUSE_CLUB_IDS.has(clubId)) return json({ error: 'House-club analytics remain on their public club pages.' }, 404);
  const actor = await getSession(request, env);
  if (!actor) return json({ error: 'Sign in with Discord to view team analytics.', code: 'signin_required' }, 401);

  let access = ['owner', 'admin'].includes(actor.role) ? { allowed: true, role: actor.role } : null;
  if (!access) {
    try {
      const result = await fetchUfbService(env, `/club-access/${clubId}?discordId=${encodeURIComponent(String(actor.discord_id))}`);
      access = result.data;
    } catch (error) {
      if (error?.status === 403) return json({ error: 'These analytics are limited to this club’s managers and registered players.', code: 'team_access_required' }, 403);
      return json({ error: 'Team access could not be verified right now.', code: 'access_unavailable' }, 503);
    }
  }
  if (!access?.allowed) return json({ error: 'These analytics are limited to this club’s managers and registered players.', code: 'team_access_required' }, 403);
  const analytics = analyticsForClub(clubId);
  if (!analytics) return json({ error: 'Analytics are not ready for this club yet.' }, 404);
  return json({ access: { role: access.role || 'player' }, analytics });
}
