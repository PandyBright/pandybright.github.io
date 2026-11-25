CREATE TABLE IF NOT EXISTS guestbook_notes (
  id INTEGER PRIMARY KEY,
  message TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL
);
