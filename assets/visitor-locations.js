const visitorRegionNames = new Intl.DisplayNames(["en"], { type: "region" });

function resolveVisitorLocation(point, cities) {
  const { la, lo } = point ?? {};
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return;

  const maxOffset = 0.32;
  const hongKongLocalityOffset = 0.045;
  const radians = Math.PI / 180;
  let bestDistance = maxOffset ** 2;
  let nearest;

  // IP geolocation is approximate. Skip distant matches and store only the city center.
  for (const entry of cities) {
    const [lat, lon] = entry;
    const latitudeOffset = la - lat;
    if (latitudeOffset > maxOffset) continue;
    if (latitudeOffset < -maxOffset) break;
    const longitudeOffset = ((lo - lon + 540) % 360 - 180) * Math.cos((la + lat) * radians / 2);
    const distance = latitudeOffset ** 2 + longitudeOffset ** 2;
    if (entry[3] === "HK" && distance > hongKongLocalityOffset ** 2) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = entry;
    }
  }

  if (!nearest) return;

  const [latitude, longitude, city, countryCode, area] = nearest;
  let address;
  if (countryCode === "HK") {
    if (!area) address = "Hong Kong";
    else if (area === "Hong Kong Island") address = `${city}, Hong Kong`;
    else address = `${city}, ${area}, Hong Kong`;
  } else {
    const region = visitorRegionNames.of(countryCode);
    address = [...new Set([city, area, region].filter(Boolean))].join(", ");
  }
  return { la: latitude, lo: longitude, address };
}

function visitorLocationKey({ la, lo, address }) {
  return `${la},${lo},${address}`;
}

if (typeof module !== "undefined") module.exports = { resolveVisitorLocation, visitorLocationKey };
