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
