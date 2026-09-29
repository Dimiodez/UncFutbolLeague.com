const DEFAULT_CHANNEL_ID = '1520080337806299181';
const MAX_SERVICE_BODY = 1_000_000;

export function eaMatchCenterStatus(env) {
  const channelId = String(env.UFB_EA_CHANNEL_ID || DEFAULT_CHANNEL_ID);
  const service = env.UFB_BOT;
  return {
    channelId,
    connected: Boolean(service && typeof service.fetch === 'function'),
    connection: service && typeof service.fetch === 'function' ? 'connected' : 'awaiting_bot'
  };
}

export async function fetchUfbService(env, path) {
  const status = eaMatchCenterStatus(env);
  if (!status.connected) return { status, data: null };
  const url = new URL(path, 'https://ufb.internal');
  url.searchParams.set('channelId', status.channelId);
  const response = await env.UFB_BOT.fetch(new Request(url, {
    headers: { accept: 'application/json', 'x-ufl-channel-id': status.channelId }
  }));
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_SERVICE_BODY) throw new Error('UFB service response is too large.');
  const text = await response.text();
  if (text.length > MAX_SERVICE_BODY) throw new Error('UFB service response is too large.');
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('UFB service returned invalid JSON.'); }
  if (!response.ok) {
    const error = new Error(typeof data?.error === 'string' ? data.error : 'UFB service request failed.');
    error.status = response.status;
    throw error;
  }
  return { status, data };
}

export function linkedClubList(value) {
  if (!value || !Array.isArray(value.clubs)) throw new Error('UFB service returned an invalid club list.');
  return value.clubs.slice(0, 250).map(club => ({
    id: String(club.id || ''),
    name: String(club.name || club.eaClubName || 'Linked club'),
    league: String(club.league || ''),
    eaClubId: String(club.eaClubId || ''),
    eaClubName: String(club.eaClubName || club.name || ''),
    platform: String(club.platform || 'common-gen5')
  })).filter(club => club.id && club.eaClubId);
}

export function recentMatchList(value) {
  if (!value || !Array.isArray(value.matches)) throw new Error('UFB service returned an invalid match list.');
  return value.matches.slice(0, 25);
}
