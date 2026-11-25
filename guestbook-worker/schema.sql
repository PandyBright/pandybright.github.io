CREATE TABLE IF NOT EXISTS guestbook_notes (
  id INTEGER PRIMARY KEY,
  message TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guestbook_replies (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES guestbook_notes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS guestbook_replies_note_id ON guestbook_replies(note_id);
