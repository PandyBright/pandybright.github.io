CREATE TABLE IF NOT EXISTS visitor_map_places (
  id TEXT PRIMARY KEY NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  la REAL,
  lo REAL
);

CREATE TABLE IF NOT EXISTS visitor_map_recent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place TEXT NOT NULL REFERENCES visitor_map_places(id)
);
