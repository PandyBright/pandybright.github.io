const fs = require("node:fs");
const path = require("node:path");
const { resolveVisitorLocation, visitorLocationKey, groupVisitorPoints } = require("../assets/visitor-locations.js");

const cities = require("../assets/visitor-cities.json");
const archivePath = path.join(__dirname, "../assets/visitor-history.json");
const snapshotPath = path.join(__dirname, "../assets/visitor-recent.json");

async function fetchLiveLocations() {
  // The widget endpoint records a visit. Use the report's read-only feed to archive map locations.
  const source = new URL("https://www.supercounters.com/ajax-live-map/1741601");
  source.searchParams.set("_", Date.now());
  const response = await fetch(source, {
    headers: {
      "Accept": "application/json",
      "Referer": "https://www.supercounters.com/map/1741601",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "PandyBrightVisitorArchive/1.0 (bot)"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    const challenge = response.headers.get("cf-mitigated") === "challenge" ? " (Cloudflare challenge)" : "";
    throw new Error(`Visitor map returned HTTP ${response.status}${challenge}`);
  }

  const points = await response.json();
  if (!Array.isArray(points)) throw new Error("Visitor map returned an unexpected response");

  return points.flatMap(point => {
    if (!Array.isArray(point?.latLng)) return [];
    const [la, lo] = point.latLng;
    const location = resolveVisitorLocation({ la, lo }, cities);
    return location ? [location] : [];
  });
}

function importWidgetSnapshot(filename) {
  // Import an existing response without calling the widget endpoint, which records a visit.
  const source = fs.readFileSync(filename, "utf8");
  const payload = source.match(/^\s*sc_show_map\(\s*1741601\s*,\s*(['"])\((\[.*?\])\)\1\s*\);?\s*$/s);
  if (!payload) throw new Error("Unexpected visitor widget response");

  const locations = groupVisitorPoints(JSON.parse(payload[2]), cities);
  if (!locations.some(location => location.count > 0)) throw new Error("No visit counts in the captured response");
  const capturedAt = fs.statSync(filename).mtime.toISOString();
  if (fs.existsSync(snapshotPath)) {
    const previous = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    if (Date.parse(previous.capturedAt) > Date.parse(capturedAt)) {
      throw new Error("The captured response is older than the saved snapshot");
    }
  }
  const entries = locations.map(location => `    ${JSON.stringify(location)}`).join(",\n");
  fs.writeFileSync(snapshotPath, `{\n  "capturedAt": ${JSON.stringify(capturedAt)},\n  "locations": [\n${entries}\n  ]\n}\n`);
  return locations.map(({ la, lo, address }) => ({ la, lo, address }));
}

async function updateArchive() {
  const [option, filename] = process.argv.slice(2);
  if (option && (option !== "--widget-response" || !filename)) {
    throw new Error("Usage: node scripts/archive_visitor_locations.cjs [--widget-response FILE]");
  }
  const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
  const incoming = option ? importWidgetSnapshot(filename) : await fetchLiveLocations();
  const locations = new Map([...archive, ...incoming].filter(location => location.address)
    .map(location => [visitorLocationKey(location), location]));

  const entries = [...locations.values()];
  if (JSON.stringify(entries) !== JSON.stringify(archive)) {
    const lines = entries.map(location => `  ${JSON.stringify(location)}`);
    fs.writeFileSync(archivePath, `[\n${lines.join(",\n")}\n]\n`);
  }
  console.log(`Location archive contains ${entries.length} places.`);
}

updateArchive().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
