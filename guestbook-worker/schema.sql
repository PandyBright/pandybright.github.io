CREATE TABLE IF NOT EXISTS guestbook_notes (
  id INTEGER PRIMARY KEY,
  message TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL,
  is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0, 1))
);

CREATE TABLE IF NOT EXISTS guestbook_replies (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES guestbook_notes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL,
  is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0, 1))
);

CREATE INDEX IF NOT EXISTS guestbook_replies_note_id ON guestbook_replies(note_id);

CREATE TABLE IF NOT EXISTS guestbook_note_likes (
  note_id INTEGER NOT NULL REFERENCES guestbook_notes(id) ON DELETE CASCADE,
  voter TEXT NOT NULL,
  PRIMARY KEY (note_id, voter)
);

CREATE TABLE IF NOT EXISTS guestbook_reply_likes (
  reply_id INTEGER NOT NULL REFERENCES guestbook_replies(id) ON DELETE CASCADE,
  voter TEXT NOT NULL,
  PRIMARY KEY (reply_id, voter)
);
