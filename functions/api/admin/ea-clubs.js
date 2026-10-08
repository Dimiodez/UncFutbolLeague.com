import { getSession, json } from '../../_lib/auth.js';
import { eaMatchCenterStatus, fetchUfbService, linkedClubList } from '../../_lib/ea-match-center.js';

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  const status = eaMatchCenterStatus(env);
  if (!status.connected) return json({ ...status, clubs: [] });
  try {
    const result = await fetchUfbService(env, '/admin/linked-clubs');
    return json({ ...result.status, clubs: linkedClubList(result.data) });
  } catch (error) {
    console.error(JSON.stringify({ message: 'Unable to load UFB linked clubs', error: error instanceof Error ? error.message : String(error) }));
    return json({ ...status, connection: 'unavailable', clubs: [], error: 'The bot connection is configured but unavailable.' }, 502);
  }
}
