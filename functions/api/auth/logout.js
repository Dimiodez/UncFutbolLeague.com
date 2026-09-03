import { clearSessionCookie, json, readCookie, sameOrigin, sha256 } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const token = readCookie(request, '__Host-ufl_session');
  if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie });
}
