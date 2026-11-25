const countries = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
const deviceKeyPattern = /^[a-f0-9]{64}$/;
const ownerVote = "owner";
const notes = { table: "guestbook_notes", likes: "guestbook_note_likes", reference: "note_id" };
const replies = { table: "guestbook_replies", likes: "guestbook_reply_likes", reference: "reply_id" };

async function hashKey(key) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyOwner(key, fingerprint) {
  if (typeof key !== "string" || !deviceKeyPattern.test(key) || !fingerprint) return false;
  return await hashKey(key) === fingerprint;
}

async function voteIdentity(key, isOwner) {
  if (isOwner) return ownerVote;
  if (typeof key !== "string" || !deviceKeyPattern.test(key)) return null;
  return await hashKey(key);
}

function visitorLocation(geo) {
  if (!geo?.country || !/^[A-Z]{2}$/.test(geo.country)) return null;
  const country = geo.country === "TW" ? "Taiwan" : countries.of(geo.country);
  if (!country) return null;

  const city = typeof geo.city === "string" ? geo.city.trim().slice(0, 100) : "";
  return city && city !== country ? `${city}, ${country}` : country;
}

async function parseRequest(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json") || !request.body) return null;

  // Stop reading before parsing if the client exceeds the request size limit.
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }

  try {
    const data = JSON.parse(body + decoder.decode());
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function likeFields({ likes, reference }) {
  return `(SELECT COUNT(*) FROM ${likes} WHERE ${reference} = entry.id) AS like_count,
    EXISTS(SELECT 1 FROM ${likes} WHERE ${reference} = entry.id AND voter = ?1) AS liked,
    EXISTS(SELECT 1 FROM ${likes} WHERE ${reference} = entry.id AND voter = '${ownerVote}') AS owner_liked`;
}

function replyReference(kind, entry) {
  const { id, created_at, message, is_owner, location } = entry;
  return { kind, id, created_at, message, is_owner, location };
}

async function listEntries(db, voter) {
  const [noteRows, replyRows] = await db.batch([
    db.prepare(`SELECT id, message, location, created_at, is_owner, ${likeFields(notes)}
      FROM guestbook_notes entry ORDER BY id DESC LIMIT 50`).bind(voter),
    db.prepare(`SELECT id, note_id, message, location, created_at, is_owner, reply_to_id, reply_to_created_at,
      ${likeFields(replies)} FROM guestbook_replies entry
      WHERE note_id IN (SELECT id FROM guestbook_notes ORDER BY id DESC LIMIT 50) ORDER BY id`).bind(voter),
  ]);
  const threads = new Map(noteRows.results.map(note => [note.id, { ...note, replies: [] }]));
  const repliesById = new Map(replyRows.results.map(reply => [reply.id, reply]));
  for (const { note_id, reply_to_id, reply_to_created_at, ...reply } of replyRows.results) {
    const thread = threads.get(note_id);
    const parent = repliesById.get(reply_to_id);
    const replyTo = reply_to_id === null
      ? replyReference("note", thread)
      : parent?.note_id === note_id && parent.created_at === reply_to_created_at
        ? replyReference("reply", parent)
        : { kind: "reply", deleted: true, created_at: reply_to_created_at };
    thread.replies.push({ ...reply, reply_to: replyTo });
  }
  return [...threads.values()];
}

async function setLike(db, target, { id, createdAt, liked }, voter) {
  const { table, likes, reference } = target;
  const change = liked
    ? db.prepare(`INSERT OR IGNORE INTO ${likes} (${reference}, voter) SELECT id, ?1 FROM ${table} WHERE id = ?2 AND created_at = ?3`)
    : db.prepare(`DELETE FROM ${likes} WHERE voter = ?1 AND ${reference} IN (SELECT id FROM ${table} WHERE id = ?2 AND created_at = ?3)`);
  const query = db.prepare(`SELECT ${likeFields(target)} FROM ${table} entry WHERE id = ?2 AND created_at = ?3`);
  const [, updated] = await db.batch([change.bind(voter, id, createdAt), query.bind(voter, id, createdAt)]);
  return updated.results[0];
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = { "Cache-Control": "no-store", Vary: "Origin" };
    if (origin === env.SITE_ORIGIN) headers["Access-Control-Allow-Origin"] = origin;
    const json = (body, status = 200) => Response.json(body, { status, headers });

    if (new URL(request.url).pathname !== "/api/guestbook") return json({ error: "Not found" }, 404);
    if (origin && origin !== env.SITE_ORIGIN) return json({ error: "Forbidden origin" }, 403);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...headers, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type" },
      });
    }

    if (request.method === "GET") return json(await listEntries(env.DB, null));
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (origin !== env.SITE_ORIGIN) return json({ error: "Forbidden origin" }, 403);

    const data = await parseRequest(request);
    if (!data) return json({ error: "Invalid request" }, 400);
    const { action, ownerKey, voterKey } = data;
    const isOwner = await verifyOwner(ownerKey, env.OWNER_DEVICE_HASH);
    if (data.verifyDevice === true) return json({ isOwner });
    if (action === "list") {
      return json({ entries: await listEntries(env.DB, await voteIdentity(voterKey, isOwner)), isOwner });
    }
    if (ownerKey !== undefined && !isOwner) return json({ error: "Owner device not paired" }, 403);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (action === "like" || action === "delete") {
      if (action === "delete" && !isOwner) return json({ error: "Forbidden" }, 403);
      const { kind, id, createdAt } = data;
      const target = kind === "note" ? notes : kind === "reply" ? replies : null;
      if (!target || !Number.isSafeInteger(id) || id < 1 || typeof createdAt !== "string" || createdAt.length > 40) {
        return json({ error: "Invalid target" }, 400);
      }

      if (action === "delete") {
        await env.DB.prepare(`DELETE FROM ${target.table} WHERE id = ?1 AND created_at = ?2`).bind(id, createdAt).run();
        return json({ ok: true });
      }

      const voter = await voteIdentity(voterKey, isOwner);
      if (!voter || typeof data.liked !== "boolean") return json({ error: "Invalid star" }, 400);
      const { success } = await env.POST_LIMIT.limit({ key: `star:${ip}:${kind}:${id}` });
      if (!success) return json({ error: "Too many requests" }, 429);
      const updated = await setLike(env.DB, target, data, voter);
      return updated ? json(updated) : json({ error: "Message not found" }, 404);
    }

    const { message, replyTo, replyCreatedAt, replyToKind = "note" } = data;
    if (action !== undefined || typeof message !== "string" || !message.trim() || message.length > 500 ||
        (replyTo !== undefined && (!Number.isSafeInteger(replyTo) || replyTo < 1)) ||
        (replyToKind !== "note" && replyToKind !== "reply") ||
        (replyToKind === "reply" && (replyTo === undefined || replyCreatedAt === undefined)) ||
        (replyCreatedAt !== undefined && (typeof replyCreatedAt !== "string" || replyCreatedAt.length > 40))) {
      return json({ error: "Invalid message or reply target" }, 400);
    }

    const { success } = await env.POST_LIMIT.limit({ key: ip });
    if (!success) return json({ error: "Too many notes" }, 429);

    const location = visitorLocation(request.cf);
    const createdAt = new Date().toISOString();
    if (replyTo !== undefined) {
      const insert = replyToKind === "reply"
        ? `INSERT INTO guestbook_replies (note_id, message, location, created_at, is_owner, reply_to_id, reply_to_created_at)
           SELECT note_id, ?1, ?2, ?3, ?4, id, created_at FROM guestbook_replies WHERE id = ?5 AND created_at = ?6`
        : `INSERT INTO guestbook_replies (note_id, message, location, created_at, is_owner)
           SELECT id, ?1, ?2, ?3, ?4 FROM guestbook_notes WHERE id = ?5 AND (?6 IS NULL OR created_at = ?6)`;
      const result = await env.DB.prepare(insert)
        .bind(message.trim(), location, createdAt, Number(isOwner), replyTo, replyCreatedAt ?? null).run();
      if (!result.meta.changes) return json({ error: "Reply target not found" }, 404);
    } else {
      await env.DB.prepare("INSERT INTO guestbook_notes (message, location, created_at, is_owner) VALUES (?1, ?2, ?3, ?4)")
        .bind(message.trim(), location, createdAt, Number(isOwner)).run();
    }
    return json({ ok: true }, 201);
  },
};
