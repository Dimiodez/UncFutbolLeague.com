export async function ensureFuncLayouts(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS func_layout_masters (
      template_key TEXT PRIMARY KEY,
      draft_json TEXT,
      published_json TEXT,
      published_version INTEGER NOT NULL DEFAULT 0,
      updated_by TEXT NOT NULL REFERENCES users(discord_id),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS func_layout_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      published_by TEXT NOT NULL REFERENCES users(discord_id),
      published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(template_key, version)
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS func_layout_history_by_template ON func_layout_history(template_key, version DESC)')
  ]);
}

export const FUNC_TEMPLATE_KEYS = new Set([
  'vintage', 'classic', 'midnight', 'beach', 'mountains', 'champions',
  'team-pum', 'team-jag', 'team-pal', 'team-ib', 'team-tab',
  'team-ham', 'team-nl', 'team-bay', 'team-com', 'team-goth'
]);

const LAYER_KEYS = [
  'photo', 'rating', 'position', 'crest', 'name',
  'stat-PAC', 'stat-SHO', 'stat-PAS', 'stat-DRI', 'stat-DEF', 'stat-PHY'
];

const finiteBetween = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function normalizeFuncLayoutConfig(value) {
  if (!value || typeof value !== 'object' || !value.layout || typeof value.layout !== 'object') return null;
  const layout = {};
  for (const key of LAYER_KEYS) {
    const item = value.layout[key];
    if (!item || !finiteBetween(item.x, 2, 98) || !finiteBetween(item.y, 2, 98) || !finiteBetween(item.scale, 0.45, 2.25)) return null;
    layout[key] = { x: Number(item.x), y: Number(item.y), scale: Number(item.scale) };
  }
  if (!value.colors || !validColor(value.colors.top) || !validColor(value.colors.name) || !validColor(value.colors.stats)) return null;
  if (!finiteBetween(value.photoFeather, 8, 55) || !finiteBetween(value.nameArc, -10, 10)) return null;
  return {
    layout,
    colors: { top: value.colors.top.toLowerCase(), name: value.colors.name.toLowerCase(), stats: value.colors.stats.toLowerCase() },
    photoFeather: Math.round(value.photoFeather),
    nameArc: Math.round(value.nameArc)
  };
}

export function parseConfig(value) {
  if (!value) return null;
  try { return normalizeFuncLayoutConfig(JSON.parse(value)); } catch { return null; }
}
