(() => {
  const map = document.querySelector(".visitor-map iframe");
  if (!map || location.origin !== "https://pandybright.github.io") return;

  const storeKey = "pandybright-visitor-map-visit";
  let alreadyCounted = false;
  try {
    const previous = Number(sessionStorage.getItem(storeKey));
    alreadyCounted = Date.now() - previous < 30 * 60 * 1000;
  } catch { /* Storage can be disabled. */ }

  const locations = fetch("https://pandybright-guestbook.pages.dev/api/guestbook?visitor-map=1", {
    method: alreadyCounted ? "GET" : "POST",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(10000)
  }).then(async response => {
    if (!response.ok) return null;
    const payload = await response.json();
    if (!Array.isArray(payload?.points)) return null;
    if (!alreadyCounted && payload.recorded) {
      try { sessionStorage.setItem(storeKey, String(Date.now())); } catch { /* Storage can be disabled. */ }
    }
    return payload.points;
  }).catch(() => null);

  function sendLocations(points) {
    // The sandboxed frame has an opaque origin. The payload contains public map points only.
    map.contentWindow?.postMessage({ visitorPoints: points }, "*");
  }

  locations.then(sendLocations);
  window.addEventListener("message", event => {
    if (event.source === map.contentWindow && event.origin === "null" && event.data === "visitor-map-ready") {
      locations.then(sendLocations);
    }
  });
})();
