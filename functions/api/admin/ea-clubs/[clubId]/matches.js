import { getSession, json } from '../../../../_lib/auth.js';
import { eaMatchCenterStatus, fetchUfbService, recentMatchList } from '../../../../_lib/ea-match-center.js';

export async function onRequestGet({ request, env, params }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  const clubId = String(params.clubId || '');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(clubId)) return json({ error: 'Invalid linked club.' }, 400);
  const status = eaMatchCenterStatus(env);
  if (!status.connected) return json({ ...status, error: 'The bot has not been connected to the website yet.' }, 503);
  try {
    const result = await fetchUfbService(env, `/admin/linked-clubs/${encodeURIComponent(clubId)}/matches`);
    return json({ ...result.status, club: result.data?.club || null, matches: recentMatchList(result.data), partial: result.data?.partial === true });
  } catch (error) {
    const responseStatus = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 502;
    console.error(JSON.stringify({ message: 'Unable to load UFB recent matches', clubId, error: error instanceof Error ? error.message : String(error) }));
    return json({ ...status, error: responseStatus === 404 ? 'That linked club was not found in the bot.' : 'Recent EA matches are temporarily unavailable.' }, responseStatus);
  }
}
