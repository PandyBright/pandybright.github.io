const countries = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
const deviceKeyPattern = /^[a-f0-9]{64}$/;

async function verifyOwner(key, fingerprint) {
  if (typeof key !== "string" || !deviceKeyPattern.test(key) || !fingerprint) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return hex === fingerprint;
}

function visitorLocation(geo) {
  if (!geo?.country || !/^[A-Z]{2}$/.test(geo.country)) return null;
  const country = geo.country === "TW" ? "Taiwan" : countries.of(geo.country);
  if (!country) return null;

  const city = typeof geo.city === "string" ? geo.city.trim().slice(0, 100) : "";
  return city && city !== country ? `${city}, ${country}` : country;
}

async function parseMessage(request) {
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
    const { message, replyTo, ownerKey, verifyDevice } = JSON.parse(body + decoder.decode()) ?? {};
    if (verifyDevice === true) return { ownerKey, verifyDevice };
    if (typeof message !== "string" || !message.trim() || message.length > 500) return null;
    if (replyTo !== undefined && (!Number.isSafeInteger(replyTo) || replyTo < 1)) return null;
    return { message: message.trim(), replyTo, ownerKey };
  } catch {
    return null;
  }
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

    if (request.method === "GET") {
      const recent = "SELECT id FROM guestbook_notes ORDER BY id DESC LIMIT 50";
      const [notes, replies] = await env.DB.batch([
        env.DB.prepare("SELECT id, message, location, created_at, is_owner FROM guestbook_notes ORDER BY id DESC LIMIT 50"),
        env.DB.prepare(`SELECT note_id, message, location, created_at, is_owner FROM guestbook_replies
          WHERE note_id IN (${recent}) ORDER BY id`),
      ]);
      const threads = new Map(notes.results.map(note => [note.id, { ...note, replies: [] }]));
      for (const { note_id, ...reply } of replies.results) threads.get(note_id).replies.push(reply);
      return json([...threads.values()]);
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (origin !== env.SITE_ORIGIN) return json({ error: "Forbidden origin" }, 403);

    const data = await parseMessage(request);
    if (!data) return json({ error: "Invalid message or reply target" }, 400);
    if (data.verifyDevice) return json({ isOwner: await verifyOwner(data.ownerKey, env.OWNER_DEVICE_HASH) });

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.POST_LIMIT.limit({ key: ip });
    if (!success) return json({ error: "Too many notes" }, 429);

    const isOwner = await verifyOwner(data.ownerKey, env.OWNER_DEVICE_HASH);
    if (data.ownerKey !== undefined && !isOwner) return json({ error: "Owner device not paired" }, 403);

    const location = visitorLocation(request.cf);
    const createdAt = new Date().toISOString();
    if (data.replyTo !== undefined) {
      const result = await env.DB.prepare(
        "INSERT INTO guestbook_replies (note_id, message, location, created_at, is_owner) SELECT id, ?1, ?2, ?3, ?4 FROM guestbook_notes WHERE id = ?5"
      ).bind(data.message, location, createdAt, Number(isOwner), data.replyTo).run();
      if (!result.meta.changes) return json({ error: "Note not found" }, 404);
    } else {
      await env.DB.prepare("INSERT INTO guestbook_notes (message, location, created_at, is_owner) VALUES (?1, ?2, ?3, ?4)")
        .bind(data.message, location, createdAt, Number(isOwner)).run();
    }
    return json({ ok: true }, 201);
  },
};
