// map.js — MapLibre GL setup and layer management

import { State } from './app.js';
import { vesselColor } from './utils.js';
import { t } from './i18n.js';

let map = null;
let onVesselClick = null;

// Initialize the MapLibre GL map
export function initMap(clickCallback) {
  onVesselClick = clickCallback;

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        basemap: {
          type: 'raster',
          tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>'
        }
      },
      layers: [{
        id: 'basemap',
        type: 'raster',
        source: 'basemap'
      }]
    },
    center: [-100, 22],   // center of Mexico
    zoom: 4.5,
    minZoom: 2,
    maxZoom: 14
  });

  map.on('load', () => {
    _addPolygonLayers();
    _addVesselLayers();
    _addTrackLayers();
    _addPortLayer();
    _addInteractions();
  });

  return map;
}

// ----- Layer setup -----------------------------------------------------------

function _addVesselLayers() {
  // Source: GeoJSON updated on every frame render
  map.addSource('vessels', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Unselected vessels: colored dots
  map.addLayer({
    id: 'vessels-circle',
    type: 'circle',
    source: 'vessels',
    filter: ['!=', ['get', 'rnpa'], ''],  // show all by default; updated when vessel selected
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        4, 3,
        8, 6,
        12, 10
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.85,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': 'rgba(0,0,0,0.15)'
    }
  });

  // Highlight ring for the selected vessel
  map.addLayer({
    id: 'vessels-selected',
    type: 'circle',
    source: 'vessels',
    filter: ['==', ['get', 'rnpa'], ''],  // hidden until a vessel is selected
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        4, 7,
        8, 12,
        12, 18
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#1a1d23'
    }
  });
}

function _addTrackLayers() {
  // Track line for selected vessel
  map.addSource('track-line', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'track-line',
    type: 'line',
    source: 'track-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#4b5563',
      'line-width': 1.5,
      'line-opacity': 0.5,
      'line-dasharray': [2, 2]
    }
  });

  // Day markers along the track
  map.addSource('track-dots', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'track-dots',
    type: 'circle',
    source: 'track-dots',
    paint: {
      'circle-radius': 3,
      'circle-color': '#4b5563',
      'circle-opacity': 0.6,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(0,0,0,0.2)'
    }
  });
}

function _addPolygonLayers() {
  // Port Voronoi "service areas" — added first so they render beneath MPAs/regions/ports
  map.addSource('voronoi-ports', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'voronoi-ports-fill',
    type: 'fill',
    source: 'voronoi-ports',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#f59e0b',
      'fill-opacity': 0.06
    }
  });
  map.addLayer({
    id: 'voronoi-ports-outline',
    type: 'line',
    source: 'voronoi-ports',
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#b45309',
      'line-width': 0.8,
      'line-opacity': 0.5
    }
  });

  // MPAs — filled polygons (added before vessel layers so vessels draw on top)
  map.addSource('mpas', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'mpas-fill',
    type: 'fill',
    source: 'mpas',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#ef4444',
      'fill-opacity': 0.15
    }
  });
  map.addLayer({
    id: 'mpas-outline',
    type: 'line',
    source: 'mpas',
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#ef4444',
      'line-width': 1,
      'line-opacity': 0.6
    }
  });

  // Fishing regions — outline only
  map.addSource('fishing-regions', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'fishing-regions-fill',
    type: 'fill',
    source: 'fishing-regions',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.08
    }
  });
  map.addLayer({
    id: 'fishing-regions-outline',
    type: 'line',
    source: 'fishing-regions',
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#3b82f6',
      'line-width': 1.5,
      'line-opacity': 0.6
    }
  });
}

function _addPortLayer() {
  map.addSource('ports', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  map.addLayer({
    id: 'ports-circle',
    type: 'circle',
    source: 'ports',
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': 5,
      'circle-color': '#fbbf24',
      'circle-opacity': 0.8,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(0,0,0,0.25)'
    }
  });

  // Port name tooltips are handled via popups on hover instead of symbol labels
  // (symbol layers require a glyphs source which raster basemaps don't provide)
}

function _addInteractions() {
  // Pointer cursor on hover
  map.on('mouseenter', 'vessels-circle', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'vessels-circle', () => {
    map.getCanvas().style.cursor = '';
  });

  // Click vessel
  map.on('click', 'vessels-circle', (e) => {
    const feature = e.features[0];
    if (feature && onVesselClick) {
      onVesselClick(feature.properties.rnpa);
    }
  });

  // Click empty area → deselect (but not when clicking a polygon/port feature)
  map.on('click', (e) => {
    const layers = ['vessels-circle', 'ports-circle', 'voronoi-ports-fill', 'mpas-fill', 'fishing-regions-fill']
      .filter(id => map.getLayer(id));
    const features = map.queryRenderedFeatures(e.point, { layers });
    if (features.length === 0 && onVesselClick) {
      onVesselClick(null);
    }
  });

  // Name-tooltip popups for ports, Voronoi areas, MPAs, and fishing regions
  _addFeaturePopup('ports-circle',          f => _labelWithId(f.properties.name, f.properties.id));
  _addFeaturePopup('voronoi-ports-fill',    f => _labelWithId(f.properties.port_name, f.properties.port_id));
  _addFeaturePopup('mpas-fill',             f => _escapeHtml(f.properties.name || '—'));
  _addFeaturePopup('fishing-regions-fill',  f => `${_escapeHtml(t('region'))} ${_escapeHtml(f.properties.region)}`);
}

function _addFeaturePopup(layerId, labelFn) {
  map.on('click', layerId, (e) => {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const labelHtml = labelFn(feature);
    new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'feature-popup' })
      .setLngLat(e.lngLat)
      .setHTML(`<div class="feature-popup-label">${labelHtml}</div>`)
      .addTo(map);
  });
  map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
}

function _labelWithId(name, id) {
  const n = _escapeHtml(name || '—');
  return id ? `${n} <span class="popup-id">(${_escapeHtml(id)})</span>` : n;
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ----- Public API ------------------------------------------------------------

// Compute the color string for a vessel record given current settings
function computeColor(vessel) {
  return vesselColor(vessel, State.colorBy) || '#34d399';
}

// Render all vessel positions for the current day
export function renderFrame(monthData, day, allowedVis, registry) {
  if (!map || !map.getSource('vessels')) return;

  const records = monthData.dayIndex.get(day) || [];
  const features = [];

  for (const rec of records) {
    if (!allowedVis.has(rec.vi)) continue;

    const rnpa = registry.idx_to_rnpa[rec.vi];
    const vessel = registry.vessels[rnpa];
    if (!vessel) continue;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [rec.lon, rec.lat] },
      properties: { rnpa, speed: rec.speed, color: computeColor(vessel) }
    });
  }

  map.getSource('vessels').setData({ type: 'FeatureCollection', features });

  // Update selection highlight filter
  const sel = State.selectedRnpa || '';
  map.setFilter('vessels-selected', ['==', ['get', 'rnpa'], sel]);
  map.setFilter('vessels-circle', sel
    ? ['!=', ['get', 'rnpa'], sel]
    : ['!=', ['get', 'rnpa'], '']
  );
}

// Draw the full-month track for a selected vessel
export function renderTrack(monthData, vi, registry) {
  if (!map) return;

  const coords = [];
  const dotFeatures = [];
  const sortedDays = [...monthData.dayIndex.keys()].sort((a, b) => a - b);

  for (const day of sortedDays) {
    const rec = (monthData.dayIndex.get(day) || []).find(r => r.vi === vi);
    if (!rec) continue;
    coords.push([rec.lon, rec.lat]);
    dotFeatures.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [rec.lon, rec.lat] },
      properties: { day, speed: rec.speed }
    });
  }

  map.getSource('track-line').setData({
    type: 'FeatureCollection',
    features: coords.length >= 2
      ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }]
      : []
  });

  map.getSource('track-dots').setData({ type: 'FeatureCollection', features: dotFeatures });
}

// Clear the track layers (when vessel deselected)
export function clearTrack() {
  if (!map) return;
  const empty = { type: 'FeatureCollection', features: [] };
  map.getSource('track-line')?.setData(empty);
  map.getSource('track-dots')?.setData(empty);
}

// Load port GeoJSON into the ports source
export function loadPorts(ports) {
  if (!map || !map.getSource('ports')) return;
  const features = ports.map(p => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    properties: { name: p.name, id: p.id }
  }));
  map.getSource('ports').setData({ type: 'FeatureCollection', features });
}

// Toggle port layer visibility
export function setPortsVisible(visible) {
  if (!map) return;
  const vis = visible ? 'visible' : 'none';
  map.setLayoutProperty('ports-circle', 'visibility', vis);
}

// Load MPA GeoJSON
export function loadMpas(geojson) {
  if (!map || !map.getSource('mpas')) return;
  map.getSource('mpas').setData(geojson);
}

// Toggle MPA layer visibility
export function setMpasVisible(visible) {
  if (!map) return;
  const vis = visible ? 'visible' : 'none';
  map.setLayoutProperty('mpas-fill', 'visibility', vis);
  map.setLayoutProperty('mpas-outline', 'visibility', vis);
}

// Load fishing regions GeoJSON
export function loadFishingRegions(geojson) {
  if (!map || !map.getSource('fishing-regions')) return;
  map.getSource('fishing-regions').setData(geojson);
}

// Toggle fishing regions layer visibility
export function setFishingRegionsVisible(visible) {
  if (!map) return;
  const vis = visible ? 'visible' : 'none';
  map.setLayoutProperty('fishing-regions-fill', 'visibility', vis);
  map.setLayoutProperty('fishing-regions-outline', 'visibility', vis);
}

// Load port Voronoi GeoJSON
export function loadVoronoiPorts(geojson) {
  if (!map || !map.getSource('voronoi-ports')) return;
  map.getSource('voronoi-ports').setData(geojson);
}

// Toggle port Voronoi layer visibility
export function setVoronoiPortsVisible(visible) {
  if (!map) return;
  const vis = visible ? 'visible' : 'none';
  map.setLayoutProperty('voronoi-ports-fill', 'visibility', vis);
  map.setLayoutProperty('voronoi-ports-outline', 'visibility', vis);
}

// Returns true once the map and all sources are ready
export function isReady() {
  return map && map.isStyleLoaded() && map.getSource('vessels');
}

export { map };
