CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL,
  gender_probability INTEGER NOT NULL,
  sample_size INTEGER NOT NULL,
  age INTEGER NOT NULL,
  age_group TEXT NOT NULL,
  country_id TEXT NOT NULL,
  country_probability INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
