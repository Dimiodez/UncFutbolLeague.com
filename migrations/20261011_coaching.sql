CREATE TABLE IF NOT EXISTS coaching_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(discord_id),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  hook TEXT NOT NULL CHECK(length(hook) BETWEEN 1 AND 220),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 30000),
  cover_key TEXT NOT NULL,
  cover_type TEXT NOT NULL CHECK(cover_type IN ('image/jpeg','image/png','image/webp')),
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','hidden','deleted')),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS coaching_posts_feed ON coaching_posts(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS coaching_posts_author ON coaching_posts(author_id, created_at DESC);
CREATE TABLE IF NOT EXISTS coaching_hearts (
  post_id TEXT NOT NULL REFERENCES coaching_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS coaching_moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES coaching_posts(id),
  actor_id TEXT NOT NULL REFERENCES users(discord_id),
  action TEXT NOT NULL CHECK(action IN ('hide','restore','delete')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
