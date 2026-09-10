import { sha256 } from './auth.js';

const createRateLimitTable = env => env.DB.prepare(`
  CREATE TABLE IF NOT EXISTS rate_limits (
    scope TEXT NOT NULL,
    subject_hash TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scope, subject_hash)
  )
`).run();

export async function consumeRateLimit(env, { scope, subject, limit, windowSeconds = 60 }) {
  if (!env.DB || !subject) return { success: true, retryAfter: 0 };
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const subjectHash = await sha256(`${scope}:${subject}`);
  const increment = () => env.DB.prepare(`
      INSERT INTO rate_limits (scope, subject_hash, window_start, request_count, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(scope, subject_hash) DO UPDATE SET
        request_count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.request_count + 1 ELSE 1 END,
        window_start = excluded.window_start,
        updated_at = datetime('now')
      RETURNING request_count
    `).bind(scope, subjectHash, windowStart).first();
  let row;
  try {
    row = await increment();
  } catch (error) {
    if (!String(error instanceof Error ? error.message : error).includes('no such table: rate_limits')) throw error;
    await createRateLimitTable(env);
    row = await increment();
  }
  const count = Number(row?.request_count || 1);
  const retryAfter = Math.max(1, windowStart + windowSeconds - Math.floor(Date.now() / 1000));
  return { success: count <= limit, retryAfter };
}
