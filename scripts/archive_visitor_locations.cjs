const fs = require("node:fs");
const path = require("node:path");
const { resolveVisitorLocation, visitorLocationKey } = require("../assets/visitor-locations.js");

const cities = require("../assets/visitor-cities.json");
const archivePath = path.join(__dirname, "../assets/visitor-history.json");

async function updateArchive() {
  const source = new URL("https://service.supercounters.com/fc.php?id=1741601&w=4");
  source.searchParams.set("rand", Date.now());
  const response = await fetch(source, {
    headers: { "User-Agent": "PandyBrightVisitorArchive/1.0 (bot)" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Visitor map returned HTTP ${response.status}`);

  const payload = (await response.text()).match(/sc_show_map\(\s*1741601\s*,\s*["']\((\[.*?\])\)["']/s);
  if (!payload) throw new Error("Visitor map returned an unexpected response");

  const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
  const locations = new Map(archive.map(location => [visitorLocationKey(location), location]));
  for (const point of JSON.parse(payload[1])) {
    const location = resolveVisitorLocation(point, cities);
    if (location) locations.set(visitorLocationKey(location), location);
  }

  const newLocations = locations.size - archive.length;
  if (newLocations > 0) {
    const entries = [...locations.values()].map(location => `  ${JSON.stringify(location)}`);
    fs.writeFileSync(archivePath, `[\n${entries.join(",\n")}\n]\n`);
  }
  console.log(`Archived ${newLocations} additional locations (${locations.size} total).`);
}

updateArchive().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
