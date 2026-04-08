// map.js — MapLibre GL setup and layer management

import { State } from './app.js';
import { vesselColor } from './utils.js';

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

  // Click empty area → deselect
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['vessels-circle'] });
    if (features.length === 0 && onVesselClick) {
      onVesselClick(null);
    }
  });
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

// Returns true once the map and all sources are ready
export function isReady() {
  return map && map.isStyleLoaded() && map.getSource('vessels');
}

export { map };
