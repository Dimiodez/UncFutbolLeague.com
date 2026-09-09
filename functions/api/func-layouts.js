import { json } from '../_lib/auth.js';
import { ensureFuncLayouts, parseConfig } from '../_lib/func-layouts.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ layouts: {} });
  await ensureFuncLayouts(env);
  const result = await env.DB.prepare(`SELECT template_key AS templateKey, published_json AS configJson,
    published_version AS version, published_at AS publishedAt
    FROM func_layout_masters WHERE published_json IS NOT NULL`).all();
  const layouts = {};
  for (const row of result.results) {
    const config = parseConfig(row.configJson);
    if (config) layouts[row.templateKey] = { ...config, version: row.version, publishedAt: row.publishedAt };
  }
  return json({ layouts });
}
