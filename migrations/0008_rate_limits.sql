CREATE TABLE IF NOT EXISTS rate_limits (
  scope TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, subject_hash)
);

CREATE INDEX IF NOT EXISTS rate_limits_by_updated_at ON rate_limits(updated_at);
