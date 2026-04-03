// app.js — Application state and boot sequence
//
// Boot sequence:
//   1. Fetch manifest + registry + ports in parallel
//   2. Initialize MapLibre map
//   3. Populate filter UI (state list, month nav)
//   4. Load first available month's track data
//   5. Apply filters → render day 1
//   6. Wire up animation controls

import { initMap, renderFrame, renderTrack, clearTrack, loadPorts, setPortsVisible, isReady } from './map.js';
import { loadMonth } from './tracks.js';
import { applyFilters, populateStateFilter, initFilterControls, updateFilterCount, resetFilters } from './filters.js';
import { initAnimation, updateScrubber, stopPlayback } from './animation.js';
import { buildMonthNav, updateActiveMonth, updateTopbar, showVesselDetail, hideVesselDetail, initSidebarToggle } from './ui.js';
import { daysInMonth } from './utils.js';

// --- Global application state -----------------------------------------------
// Exported so other modules can read it (they must NOT write to it directly)
export const State = {
  manifest:    null,
  registry:    null,
  ports:       null,
  monthData:   null,

  currentYear:  null,
  currentMonth: null,
  currentDay:   1,

  allowedVis:   new Set(),  // vessel indices passing current filters
  selectedRnpa: null,
  selectedVi:   null,

  isPlaying:    false,
  playbackSpeed: 150,  // ms per day step
  colorBy:      'speed',

  filters: {
    fleet:   new Set(['large scale', 'small scale']),
    species: new Set([0, 1, 2, 3, 4, 5]),
    gear:    new Set([0, 1, 2, 3]),
    states:  new Set()
  }
};

// --- Boot -------------------------------------------------------------------
async function boot() {
  setLoading('Loading data...');

  try {
    // 1. Fetch manifest, registry, ports in parallel
    const [manifest, registry, ports] = await Promise.all([
      fetch('data/manifest.json').then(r => r.json()),
      fetch('data/vessel_registry.json').then(r => r.json()),
      fetch('data/ports.json').then(r => r.json()).catch(() => [])
    ]);

    State.manifest = manifest;
    State.registry = registry;
    State.ports    = ports;

    // 2. Initialize map (waits for style load internally)
    await initMapAsync();

    // 3. Populate UI
    populateStateFilter(registry);
    buildMonthNav(manifest, selectMonth);
    initFilterControls(onFilterChange);
    initAnimation(onDayStep, onMonthChange);
    initSidebarToggle();

    // Vessel detail close button
    document.getElementById('vessel-detail-close').addEventListener('click', () => {
      deselectVessel();
    });

    // Ports toggle
    document.getElementById('toggle-ports').addEventListener('change', (e) => {
      setPortsVisible(e.target.checked);
    });

    // Load ports into map
    loadPorts(ports);

    // 4. Load first month from manifest
    const firstMonth = manifest.months[0];
    await selectMonth(firstMonth.year, firstMonth.month);

    hideLoading();

  } catch (err) {
    console.error('Boot failed:', err);
    setLoading(`Error: ${err.message}`);
  }
}

// Wait for MapLibre style to load before resolving
function initMapAsync() {
  return new Promise(resolve => {
    initMap(onVesselClick);
    // Poll until style is loaded (maplibre fires 'load' event on the map object)
    const check = () => isReady() ? resolve() : setTimeout(check, 50);
    check();
  });
}

// --- Month selection ---------------------------------------------------------
async function selectMonth(year, month) {
  stopPlayback();
  setLoading(`Loading ${year}/${String(month).padStart(2,'0')}...`);

  try {
    State.currentYear  = year;
    State.currentMonth = month;
    State.currentDay   = 1;
    State.selectedRnpa = null;
    State.selectedVi   = null;

    State.monthData = await loadMonth(year, month);

    // Prefetch adjacent months in the background (fire and forget)
    prefetchAdjacent(year, month);

    clearTrack();
    hideVesselDetail();
    onFilterChange();
    updateActiveMonth();
    updateScrubber();
    hideLoading();

  } catch (err) {
    console.error('Failed to load month:', err);
    hideLoading();
    alert(`Could not load data for ${year}/${month}. Is the track file built?`);
  }
}

// Prefetch the months before and after the current one
function prefetchAdjacent(year, month) {
  const next = month === 12 ? { year: year + 1, month: 1 }  : { year, month: month + 1 };
  const prev = month === 1  ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  // Check if months exist in manifest before fetching
  const inManifest = (y, m) => State.manifest.months.some(mo => mo.year === y && mo.month === m);
  if (inManifest(next.year, next.month)) loadMonth(next.year, next.month).catch(() => {});
  if (inManifest(prev.year, prev.month)) loadMonth(prev.year, prev.month).catch(() => {});
}

// --- Animation callbacks -----------------------------------------------------
function onDayStep(year, month, day) {
  if (!State.monthData) return;
  renderFrame(State.monthData, day, State.allowedVis, State.registry);
  updateTopbar();
}

async function onMonthChange(year, month) {
  await selectMonth(year, month);
}

// --- Filter callback ---------------------------------------------------------
function onFilterChange() {
  if (!State.registry) return;
  State.allowedVis = applyFilters(State.registry);
  updateFilterCount(State.allowedVis, Object.keys(State.registry.vessels).length);

  if (State.monthData) {
    renderFrame(State.monthData, State.currentDay, State.allowedVis, State.registry);
  }
  updateTopbar();
}

// --- Vessel click ------------------------------------------------------------
function onVesselClick(rnpa) {
  if (!rnpa || rnpa === State.selectedRnpa) {
    deselectVessel();
    return;
  }

  State.selectedRnpa = rnpa;
  // Find the vessel index
  State.selectedVi = State.registry.idx_to_rnpa.indexOf(rnpa);

  const vessel = State.registry.vessels[rnpa];
  if (!vessel) return;

  // Draw the track for this vessel
  renderTrack(State.monthData, State.selectedVi, State.registry);

  // Collect speed-by-day data for the Plotly chart
  const trackPoints = [];
  if (State.monthData) {
    const sortedDays = [...State.monthData.dayIndex.keys()].sort((a, b) => a - b);
    for (const day of sortedDays) {
      const rec = (State.monthData.dayIndex.get(day) || [])
        .find(r => r.vi === State.selectedVi);
      if (rec) trackPoints.push({ day, speed: rec.speed });
    }
  }

  showVesselDetail(rnpa, vessel, trackPoints, State.currentYear, State.currentMonth);

  // Re-render to highlight selected vessel
  renderFrame(State.monthData, State.currentDay, State.allowedVis, State.registry);
}

function deselectVessel() {
  State.selectedRnpa = null;
  State.selectedVi   = null;
  clearTrack();
  hideVesselDetail();
  if (State.monthData) {
    renderFrame(State.monthData, State.currentDay, State.allowedVis, State.registry);
  }
}

// --- Loading overlay ---------------------------------------------------------
function setLoading(msg) {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loading-text').textContent = msg;
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

// --- Start -------------------------------------------------------------------
boot();
