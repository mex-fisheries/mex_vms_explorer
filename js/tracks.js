// tracks.js — Load and decode monthly track JSON files, with a small LRU cache

// Cache holds up to MAX_CACHED months in memory
const MAX_CACHED = 5;
const cache = new Map();  // key: "YYYY_MM" → decoded month object

// Decode a raw month JSON object into a day-indexed lookup for fast frame retrieval
function buildDayIndex(data) {
  // data.vi, data.day, data.lat, data.lon, data.spd are parallel arrays
  const dayIndex = new Map();
  const len = data.vi.length;
  for (let i = 0; i < len; i++) {
    const day = data.day[i];
    if (!dayIndex.has(day)) dayIndex.set(day, []);
    dayIndex.get(day).push({
      vi:    data.vi[i],
      lat:   data.lat[i],
      lon:   data.lon[i],
      speed: data.spd[i],
      n:     data.n ? data.n[i] : null
    });
  }
  return dayIndex;
}

// Fetch and cache a monthly track file
export async function loadMonth(year, month) {
  const key = `${year}_${String(month).padStart(2, '0')}`;
  if (cache.has(key)) return cache.get(key);

  const url = `data/tracks/${key}.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not load ${url}: ${resp.status}`);

  const data = await resp.json();
  data.dayIndex = buildDayIndex(data);

  // LRU eviction: drop oldest entry when over limit
  if (cache.size >= MAX_CACHED) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, data);
  return data;
}

// Return a GeoJSON FeatureCollection for the given day, filtered to allowed vessels.
// allowedVis: Set of vessel indices (integers) that pass current filters.
// registry.idx_to_rnpa: array mapping index → RNPA string.
// colorBy: 'speed' | 'gear' | 'species' | 'fleet' — determines what property to embed.
export function getFrame(monthData, day, allowedVis, registry, vesselColorFn) {
  const records = monthData.dayIndex.get(day) || [];
  const features = [];

  for (const rec of records) {
    if (!allowedVis.has(rec.vi)) continue;

    const rnpa = registry.idx_to_rnpa[rec.vi];
    const vessel = registry.vessels[rnpa];
    if (!vessel) continue;

    // Color is computed by the caller (vesselColorFn) based on colorBy setting
    const color = vesselColorFn(vessel, rec.speed);

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [rec.lon, rec.lat] },
      properties: {
        rnpa,
        speed: rec.speed,
        color
      }
    });
  }

  return { type: 'FeatureCollection', features };
}

// Return a GeoJSON LineString + day-point markers for a single vessel's full month.
// Used when a vessel is selected to draw its track.
export function getVesselTrack(monthData, vi, registry) {
  const coords = [];
  const points = [];

  // Iterate all days in order
  const sortedDays = [...monthData.dayIndex.keys()].sort((a, b) => a - b);
  for (const day of sortedDays) {
    const records = monthData.dayIndex.get(day);
    const rec = records.find(r => r.vi === vi);
    if (!rec) continue;

    coords.push([rec.lon, rec.lat]);
    points.push({ day, lat: rec.lat, lon: rec.lon, speed: rec.speed });
  }

  const rnpa = registry.idx_to_rnpa[vi];

  const line = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: { rnpa }
  };

  const dots = {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { rnpa, day: p.day, speed: p.speed }
    }))
  };

  return { line, dots, points };
}
