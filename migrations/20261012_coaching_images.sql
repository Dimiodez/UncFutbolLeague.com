ALTER TABLE coaching_posts ADD COLUMN byline TEXT NOT NULL DEFAULT '' CHECK(length(byline)<=80);
ALTER TABLE coaching_posts ADD COLUMN images TEXT NOT NULL DEFAULT '[]'
  CHECK(json_valid(images) AND json_type(images)='array' AND json_array_length(images)<=5);
