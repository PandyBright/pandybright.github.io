const countries = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

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
    const message = JSON.parse(body + decoder.decode())?.message;
    return typeof message === "string" && message.trim() && message.length <= 500 ? message.trim() : null;
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
      const { results } = await env.DB.prepare(
        "SELECT message, location, created_at FROM guestbook_notes ORDER BY id DESC LIMIT 50"
      ).all();
      return json(results);
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (origin !== env.SITE_ORIGIN) return json({ error: "Forbidden origin" }, 403);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.POST_LIMIT.limit({ key: ip });
    if (!success) return json({ error: "Too many notes" }, 429);

    const message = await parseMessage(request);
    if (!message) return json({ error: "A message of 1–500 characters is required" }, 400);

    const location = visitorLocation(request.cf);
    await env.DB.prepare("INSERT INTO guestbook_notes (message, location, created_at) VALUES (?1, ?2, ?3)")
      .bind(message, location, new Date().toISOString()).run();
    return json({ ok: true }, 201);
  },
};
