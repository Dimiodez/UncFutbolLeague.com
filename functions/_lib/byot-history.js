export async function ensureByotHistory(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS byot_history (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_date TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'completed' CHECK (lifecycle_status IN ('upcoming','live','completed','archived')),
    champion TEXT NOT NULL,
    finalist TEXT NOT NULL,
    champion_score INTEGER,
    finalist_score INTEGER,
    roster_json TEXT NOT NULL DEFAULT '[]',
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`INSERT INTO byot_history (id,title,event_date,lifecycle_status,champion,finalist,champion_score,finalist_score,roster_json)
    VALUES ('inaugural','Pistoleros CF lift the first crown','2026-09-04','completed','Pistoleros CF','UFL Lyon',5,2,'["Dez","Gucci","Dloww","Luis"]')
    ON CONFLICT(id) DO NOTHING`).run();
}
