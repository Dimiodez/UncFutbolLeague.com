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
  await env.DB.prepare(`INSERT INTO byot_history (id,title,event_date,lifecycle_status,champion,finalist,champion_score,finalist_score,roster_json)
    VALUES ('season-2-aggregate-preseason','Finger Poppers FC win the Aggregate BYOT crown','2026-09-29','completed','Finger Poppers FC','Swamp City FC',4,1,'["Luis","Bravo","John","LoTech","Klee","Cam","London","Bigs","DirtBradley","Ripp"]')
    ON CONFLICT(id) DO NOTHING`).run();
  await env.DB.prepare(`UPDATE byot_history SET roster_json='["Luis","Bravo","John","LoTech","Klee","Cam","London","Bigs","DirtBradley","Ripp"]'
    WHERE id='season-2-aggregate-preseason' AND (roster_json IS NULL OR roster_json='[]')`).run();
}
