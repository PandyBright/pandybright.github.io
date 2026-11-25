const visitorRegionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

function resolveVisitorLocation(point, cities, regions = {}) {
  const { la, lo, countryCode, city, area } = point ?? {};
  const region = typeof countryCode === "string" && /^[A-Z]{2}$/.test(countryCode)
    ? countryCode === "HK" ? "Hong Kong" : visitorRegionNames.of(countryCode) : undefined;
  if (countryCode === "ZZ") return;
  const hasCoordinates = Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  const localCity = /^[\p{Script=Latin}\p{M}\p{N}\p{P} ]+$/u.test(city ?? "") && city !== region ? city : "";
  const localArea = /^[\p{Script=Latin}\p{M}\p{N}\p{P} ]+$/u.test(area ?? "") && area !== region ? area : "";
  const cityName = localCity.toLowerCase();

  if (!hasCoordinates && cityName) {
    const namedCity = cities.find(entry => entry[3] === countryCode && entry[2].toLowerCase() === cityName);
    if (namedCity) return formatVisitorCity(namedCity);
  }
  const nearest = hasCoordinates && (!region || city || countryCode === "HK")
    ? closestVisitorCity(la, lo, region ? countryCode : undefined, cities) : undefined;
  if (nearest && (countryCode === "HK" || !cityName || nearest[2].toLowerCase() === cityName)) {
    return formatVisitorCity(nearest);
  }
  if (!region) return;

  if (hasCoordinates && (localCity || (localArea && countryCode !== "HK"))) {
    const district = countryCode === "HK" && localArea === "Hong Kong Island" ? "" : localArea;
    const address = [...new Set([localCity, district, region].filter(Boolean))].join(", ");
    return { la, lo, address };
  }
  const center = regions[countryCode];
  if (center) return { la: center[0], lo: center[1], address: region };
}

function closestVisitorCity(la, lo, countryCode, cities) {
  const maxOffset = 0.32;
  const hongKongLocalityOffset = 0.045;
  const radians = Math.PI / 180;
  let bestDistance = maxOffset ** 2;
  let nearest;

  // City data is sorted by latitude. Honor the reported country even near a border.
  for (const entry of cities) {
    const [lat, lon] = entry;
    const latitudeOffset = la - lat;
    if (latitudeOffset > maxOffset) continue;
    if (latitudeOffset < -maxOffset) break;
    if (countryCode && entry[3] !== countryCode) continue;
    const longitudeOffset = ((lo - lon + 540) % 360 - 180) * Math.cos((la + lat) * radians / 2);
    const distance = latitudeOffset ** 2 + longitudeOffset ** 2;
    if (entry[3] === "HK" && distance > hongKongLocalityOffset ** 2) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = entry;
    }
  }
  return nearest;
}

function formatVisitorCity([latitude, longitude, city, countryCode, area]) {
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

function visitorLocationKey({ address }) {
  return address;
}

function groupVisitorPoints(points, cities, regions) {
  const locations = new Map();
  for (const [index, point] of points.entries()) {
    const location = resolveVisitorLocation(point, cities, regions);
    if (!location) continue;
    const key = visitorLocationKey(location);
    const visits = Number.isSafeInteger(point.count) && point.count >= 0 ? point.count : Number(index < 50);
    const count = (locations.get(key)?.count ?? 0) + visits;
    locations.set(key, { ...location, count });
  }
  return [...locations.values()];
}

if (typeof module !== "undefined") module.exports = { resolveVisitorLocation, visitorLocationKey, groupVisitorPoints };
