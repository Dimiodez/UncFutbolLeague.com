import {getSession, sameOrigin, json} from './auth.js';

export function normalizePlaylists(value) {
  if (!Array.isArray(value) || value.length > 5) throw new Error('Choose up to five playlists.');
  const seen = new Set();
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid playlist.');
    let url;
    try { url = new URL(item.url); } catch { throw new Error('Use the Share link for a YouTube playlist or album.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use the Share link for a YouTube playlist or album.');
    let provider, id, canonical;
    if (['youtube.com','www.youtube.com','music.youtube.com'].includes(url.hostname) && /^\/playlist\/?$/.test(url.pathname) && url.searchParams.getAll('list').length === 1 && /^[A-Za-z0-9_-]{10,100}$/.test(url.searchParams.get('list') || '')) {
      provider = 'youtube'; id = url.searchParams.get('list'); canonical = `https://www.youtube.com/playlist?list=${id}`;
    } else { throw new Error('Use the Share link for a YouTube playlist or album.'); }
    if (seen.has(`${provider}:${id}`)) throw new Error('That playlist is already on the list.');
    seen.add(`${provider}:${id}`);
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (!title || title.length > 80 || description.length > 240) throw new Error('Titles need 1–80 characters; descriptions allow up to 240.');
    return {title, description, url:canonical, provider, id};
  });
}

export async function soundApi(request, env) {
  try {
    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT revision, playlists FROM sound_settings WHERE id = 1').first();
      if (!row) return json({error:'Sound has not been configured yet.'},503);
      return json({revision:row.revision, playlists:normalizePlaylists(JSON.parse(row.playlists))});
    }
    if (request.method !== 'POST') return json({error:'Method not allowed.'},405,{'allow':'GET, POST'});
    if (!sameOrigin(request)) return json({error:'Same-origin request required.'},403);
    const user = await getSession(request,env);
    if (!user) return json({error:'Sign in with Discord first.'},401);
    if (!['owner','admin'].includes(user.role)) return json({error:'Only owners and admins can manage playlists.'},403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON required.'},415);
    // Read a bounded stream, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({error:'Missing settings.'},400);
    const chunks = []; let size = 0;
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 12000) { await reader.cancel(); return json({error:'Settings are too large.'},413); }
      chunks.push(value);
    }
    let data, playlists;
    try {
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
      data = JSON.parse(new TextDecoder().decode(bytes));
      playlists = normalizePlaylists(data.playlists);
      if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('Reload the playlist settings first.');
    } catch (error) { return json({error:error.message || 'Invalid settings.'},400); }
    const result = await env.DB.prepare("UPDATE sound_settings SET playlists = ?, revision = revision + 1, updated_by = ?, updated_at = datetime('now') WHERE id = 1 AND revision = ?")
      .bind(JSON.stringify(playlists),user.discord_id,data.revision).run();
    if (result.meta?.changes !== 1) return json({error:'Someone else updated Sound. Reload before saving again.'},409);
    return json({revision:data.revision+1,playlists});
  } catch (error) {
    console.error('Sound unavailable',error.name);
    return json({error:'Sound is temporarily unavailable. Please try again.'},503);
  }
}

