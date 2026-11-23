const fs = require("node:fs");
const path = require("node:path");
const { resolveVisitorLocation, visitorLocationKey } = require("../assets/visitor-locations.js");

const cities = require("../assets/visitor-cities.json");
const archivePath = path.join(__dirname, "../assets/visitor-history.json");

async function updateArchive() {
  // The widget endpoint records a visit. Use the report's read-only feed to archive map locations.
  const source = new URL("https://www.supercounters.com/ajax-live-map/1741601");
  source.searchParams.set("_", Date.now());
  const response = await fetch(source, {
    headers: { "User-Agent": "PandyBrightVisitorArchive/1.0 (bot)" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Visitor map returned HTTP ${response.status}`);

  const points = await response.json();
  if (!Array.isArray(points)) throw new Error("Visitor map returned an unexpected response");

  const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
  const locations = new Map(archive.filter(location => location.address)
    .map(location => [visitorLocationKey(location), location]));
  for (const point of points) {
    const latLng = point?.latLng;
    if (!Array.isArray(latLng)) continue;
    const [la, lo] = latLng;
    const location = resolveVisitorLocation({ la, lo }, cities);
    if (location) locations.set(visitorLocationKey(location), location);
  }

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
