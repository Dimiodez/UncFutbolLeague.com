import { getSession, json, publicUser } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getSession(request, env);
    return json({ authenticated: Boolean(user), user: publicUser(user), configured: Boolean(env.DB && env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.OWNER_DISCORD_ID) });
  } catch {
    return json({ authenticated: false, user: null, configured: false }, 200);
  }
}
