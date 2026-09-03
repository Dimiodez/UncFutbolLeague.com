const encoder = new TextEncoder();

export const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

export function readCookie(request, name) {
  const cookies = request.headers.get('cookie') || '';
  for (const item of cookies.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return '';
}

export function randomToken(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const sessionCookie = token => `__Host-ufl_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
export const clearSessionCookie = '__Host-ufl_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
export const oauthCookie = state => `__Host-ufl_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
export const clearOauthCookie = '__Host-ufl_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

export function requireConfiguration(env) {
  const required = ['DB', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'OWNER_DISCORD_ID'];
  return required.filter(key => !env[key]);
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin;
}

export async function getSession(request, env) {
  if (!env.DB) return null;
  const token = readCookie(request, '__Host-ufl_session');
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT u.discord_id, u.username, u.display_name, u.avatar_url, u.role, u.status, u.created_at
    FROM sessions s JOIN users u ON u.discord_id = s.discord_id
    WHERE s.id_hash = ? AND s.expires_at > datetime('now')
  `).bind(hash).first();
  if (!row || row.status !== 'active') return null;
  if (String(row.discord_id) === String(env.OWNER_DISCORD_ID)) row.role = 'owner';
  return row;
}

export function publicUser(user) {
  return user ? {
    id: user.discord_id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    role: user.role,
    createdAt: user.created_at
  } : null;
}
