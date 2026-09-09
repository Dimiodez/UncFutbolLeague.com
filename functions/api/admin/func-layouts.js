import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureFuncLayouts, FUNC_TEMPLATE_KEYS, normalizeFuncLayoutConfig, parseConfig } from '../../_lib/func-layouts.js';

const ownerOnly = actor => actor && actor.role === 'owner';

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!ownerOnly(actor)) return json({ error: 'Owner access required.' }, 403);
  await ensureFuncLayouts(env);
  const result = await env.DB.prepare(`SELECT template_key AS templateKey, draft_json AS draftJson,
    published_json AS publishedJson, published_version AS publishedVersion,
    updated_at AS updatedAt, published_at AS publishedAt
    FROM func_layout_masters ORDER BY template_key`).all();
  const layouts = {};
  for (const row of result.results) layouts[row.templateKey] = {
    draft: parseConfig(row.draftJson), published: parseConfig(row.publishedJson),
    publishedVersion: row.publishedVersion, updatedAt: row.updatedAt, publishedAt: row.publishedAt
  };
  return json({ layouts });
}

export async function onRequestPost({ request, env }) {
  const actor = await getSession(request, env);
  if (!ownerOnly(actor)) return json({ error: 'Owner access required.' }, 403);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  await ensureFuncLayouts(env);
  const body = await request.json().catch(() => null);
  const templateKey = typeof body?.templateKey === 'string' ? body.templateKey : '';
  const action = body?.action;
  const config = normalizeFuncLayoutConfig(body?.config);
  if (!FUNC_TEMPLATE_KEYS.has(templateKey) || !['save-draft', 'publish'].includes(action) || !config) return json({ error: 'Invalid FUNC master layout.' }, 400);
  const configJson = JSON.stringify(config);

  if (action === 'save-draft') {
    await env.DB.prepare(`INSERT INTO func_layout_masters (template_key,draft_json,updated_by)
      VALUES (?,?,?) ON CONFLICT(template_key) DO UPDATE SET draft_json=excluded.draft_json,
      updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(templateKey, configJson, String(actor.discord_id)).run();
    return json({ ok: true, action, templateKey });
  }

  const current = await env.DB.prepare('SELECT published_version AS version FROM func_layout_masters WHERE template_key=?').bind(templateKey).first();
  const version = Number(current?.version || 0) + 1;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO func_layout_masters (template_key,draft_json,published_json,published_version,updated_by,published_at)
      VALUES (?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(template_key) DO UPDATE SET
      draft_json=excluded.draft_json,published_json=excluded.published_json,published_version=excluded.published_version,
      updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP,published_at=CURRENT_TIMESTAMP`).bind(templateKey, configJson, configJson, version, String(actor.discord_id)),
    env.DB.prepare(`INSERT INTO func_layout_history (template_key,version,config_json,published_by)
      VALUES (?,?,?,?)`).bind(templateKey, version, configJson, String(actor.discord_id))
  ]);
  return json({ ok: true, action, templateKey, version });
}
