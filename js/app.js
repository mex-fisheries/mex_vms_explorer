// app.js — Application state and boot sequence

import { initMap, renderFrame, renderTrack, clearTrack, loadPorts, setPortsVisible, loadMpas, setMpasVisible, loadFishingRegions, setFishingRegionsVisible, loadVoronoiPorts, setVoronoiPortsVisible, isReady } from './map.js';
import { loadMonth } from './tracks.js';
import { applyFilters, initFilterControls, updateFilterCount, resetFilters } from './filters.js';
import { initAnimation, updateSlider, stopPlayback } from './animation.js';
import { updateTopbar, showVesselDetail, hideVesselDetail, initSidebarToggle, initVesselSearch } from './ui.js';
import { daysInMonth, formatDate } from './utils.js';
import { setLang, getLang, applyTranslations, t } from './i18n.js';

// --- Global application state -----------------------------------------------
export const State = {
  manifest:    null,
  registry:    null,
  ports:       null,
  monthData:   null,

  currentYear:  null,
  currentMonth: null,
  currentDay:   1,

  dateRange:    [],   // flat array of { year, month, day }
  dateIndex:    0,    // current position in dateRange (single-day playback)

  // Track-range slider: defines what's drawn for the SELECTED vessel only
  trackIdxStart: 0,
  trackIdxEnd:   0,
  trackUserAdjusted: false,  // becomes true once user drags the track-range slider

  allowedVis:   new Set(),
  selectedRnpa: null,
  selectedVi:   null,

  isPlaying:    false,
  playbackSpeed: 150,
  colorBy:      'gear',

  filters: {
    species: new Set([0, 1, 2, 3, 4, 5]),
    gear:    new Set([0, 1, 2, 3])
  }
};

// --- Helpers ----------------------------------------------------------------
export function monthExists(year, month) {
  if (!State.manifest) return false;
  return State.manifest.months.some(m => m.year === year && m.month === month);
}

function buildDateRange(manifest) {
  const range = [];
  for (const m of manifest.months) {
    const maxDay = daysInMonth(m.year, m.month);
    for (let d = 1; d <= maxDay; d++) {
      range.push({ year: m.year, month: m.month, day: d });
    }
  }
  return range;
}

// --- Boot -------------------------------------------------------------------
async function boot() {
  setLoading(t('loadingData'));

  try {
    const [manifest, registry, ports, mpasGeojson, regionsGeojson, voronoiGeojson] = await Promise.all([
      fetch('data/manifest.json').then(r => r.json()),
      fetch('data/vessel_registry.json').then(r => r.json()),
      fetch('data/ports.json').then(r => r.json()).catch(() => []),
      fetch('data/mpas.json').then(r => r.json()).catch(() => null),
      fetch('data/fishing_regions.json').then(r => r.json()).catch(() => null),
      fetch('data/voronoi_ports.json').then(r => r.json()).catch(() => null)
    ]);

    State.manifest = manifest;
    State.registry = registry;
    State.ports    = ports;

    // Build the continuous date range from manifest
    State.dateRange = buildDateRange(manifest);
    State.dateIndex = 0;

    // Default track range = whole first month (matches old single-month-track behavior)
    setTrackRangeToCurrentMonth();

    await initMapAsync();

    initFilterControls(onFilterChange);
    initAnimation(onDayStep, onMonthChange);
    initVesselSearch(registry, onVesselClick);
    initTrackRangeSlider();
    initSidebarToggle();

    // Vessel detail close button
    document.getElementById('vessel-detail-close').addEventListener('click', () => {
      deselectVessel();
    });

    // Spatial layer toggles
    document.getElementById('toggle-ports').addEventListener('change', (e) => {
      setPortsVisible(e.target.checked);
    });
    document.getElementById('toggle-mpas').addEventListener('change', (e) => {
      setMpasVisible(e.target.checked);
    });
    document.getElementById('toggle-regions').addEventListener('change', (e) => {
      setFishingRegionsVisible(e.target.checked);
    });
    document.getElementById('toggle-voronoi').addEventListener('change', (e) => {
      setVoronoiPortsVisible(e.target.checked);
    });

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
      const next = getLang() === 'es' ? 'en' : 'es';
      setLang(next);
      document.getElementById('lang-toggle').textContent = next === 'es' ? 'EN' : 'ES';
      updateTopbar();
      updateSlider();       // refresh date label in new language
      updateTrackSlider();  // refresh track-range labels
    });

    loadPorts(ports);
    if (mpasGeojson) loadMpas(mpasGeojson);
    if (regionsGeojson) loadFishingRegions(regionsGeojson);
    if (voronoiGeojson) loadVoronoiPorts(voronoiGeojson);
    applyTranslations();

    // Load the first available month
    const first = State.dateRange[0];
    State.currentYear  = first.year;
    State.currentMonth = first.month;
    State.currentDay   = first.day;
    State.monthData    = await loadMonth(first.year, first.month);
    prefetchAdjacent(first.year, first.month);

    onFilterChange();
    updateSlider();
    hideLoading();

  } catch (err) {
    console.error('Boot failed:', err);
    setLoading(`Error: ${err.message}`);
  }
}

function initMapAsync() {
  return new Promise(resolve => {
    initMap(onVesselClick);
    const check = () => isReady() ? resolve() : setTimeout(check, 50);
    check();
  });
}

// --- Month change callback (from animation.js) ------------------------------
async function onMonthChange(year, month) {
  setLoading(`${t('loadingMonth')} ${year}/${String(month).padStart(2,'0')}...`);

  try {
    State.monthData = await loadMonth(year, month);
    prefetchAdjacent(year, month);

    // If the user hasn't customized the track range, follow the playback month
    if (!State.trackUserAdjusted) {
      setTrackRangeToCurrentMonth();
      updateTrackSlider();
      // Re-render the selected vessel's track for the new month, if any
      if (State.selectedRnpa) await applyTrackRange();
    }

    onFilterChange();
    hideLoading();

  } catch (err) {
    console.error('Failed to load month:', err);
    hideLoading();
  }
}

function prefetchAdjacent(year, month) {
  const next = month === 12 ? { year: year + 1, month: 1 }  : { year, month: month + 1 };
  const prev = month === 1  ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  if (monthExists(next.year, next.month)) loadMonth(next.year, next.month).catch(() => {});
  if (monthExists(prev.year, prev.month)) loadMonth(prev.year, prev.month).catch(() => {});
}

// --- Animation callbacks -----------------------------------------------------
function onDayStep(year, month, day) {
  if (!State.monthData) return;
  renderFrame(State.monthData, day, State.allowedVis, State.registry);
  updateTopbar();
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
async function onVesselClick(rnpa) {
  if (!rnpa || rnpa === State.selectedRnpa) {
    deselectVessel();
    return;
  }

  State.selectedRnpa = rnpa;
  State.selectedVi = State.registry.idx_to_rnpa.indexOf(rnpa);

  const vessel = State.registry.vessels[rnpa];
  if (!vessel) {
    deselectVessel();
    return;
  }

  // Render the selected vessel's track + detail chart over the current track range
  await applyTrackRange();
  // Refresh map frame so the selection-highlight filter is applied
  if (State.monthData) {
    renderFrame(State.monthData, State.currentDay, State.allowedVis, State.registry);
  }
  updateTrackHint();
}

function deselectVessel() {
  State.selectedRnpa = null;
  State.selectedVi   = null;
  clearTrack();
  hideVesselDetail();
  if (State.monthData) {
    renderFrame(State.monthData, State.currentDay, State.allowedVis, State.registry);
  }
  updateTrackHint();
}

// --- Track-range slider -----------------------------------------------------

function setTrackRangeToCurrentMonth() {
  const range = State.dateRange;
  const idx = State.dateIndex;
  if (range.length === 0 || idx == null) return;
  const target = range[idx];
  // Find first and last index in dateRange with same year+month
  let s = idx, e = idx;
  while (s > 0 && range[s - 1].year === target.year && range[s - 1].month === target.month) s--;
  while (e < range.length - 1 && range[e + 1].year === target.year && range[e + 1].month === target.month) e++;
  State.trackIdxStart = s;
  State.trackIdxEnd   = e;
}

function initTrackRangeSlider() {
  const sStart = document.getElementById('track-slider-start');
  const sEnd   = document.getElementById('track-slider-end');
  const max = State.dateRange.length - 1;
  sStart.max = max;
  sEnd.max   = max;
  updateTrackSlider();
  updateTrackHint();

  // input → cheap UI update only (labels + fill bar)
  sStart.addEventListener('input', () => {
    let s = parseInt(sStart.value, 10);
    if (s > State.trackIdxEnd) s = State.trackIdxEnd;
    State.trackIdxStart = s;
    updateTrackLabels();
    updateTrackFill();
  });
  sEnd.addEventListener('input', () => {
    let e = parseInt(sEnd.value, 10);
    if (e < State.trackIdxStart) e = State.trackIdxStart;
    State.trackIdxEnd = e;
    updateTrackLabels();
    updateTrackFill();
  });

  // change → fires only when user releases. Do the heavy work then.
  const onChange = () => {
    State.trackUserAdjusted = true;
    if (State.selectedRnpa) applyTrackRange();
  };
  sStart.addEventListener('change', onChange);
  sEnd.addEventListener('change', onChange);
}

function updateTrackSlider() {
  const sStart = document.getElementById('track-slider-start');
  const sEnd   = document.getElementById('track-slider-end');
  if (!sStart || !sEnd) return;
  const max = Math.max(0, State.dateRange.length - 1);
  sStart.max = max;
  sEnd.max   = max;
  sStart.value = State.trackIdxStart;
  sEnd.value   = State.trackIdxEnd;
  updateTrackLabels();
  updateTrackFill();
}

function updateTrackLabels() {
  const sEntry = State.dateRange[State.trackIdxStart];
  const eEntry = State.dateRange[State.trackIdxEnd];
  if (!sEntry || !eEntry) return;
  const fmt = (e) => formatDate(e.year, e.month, e.day);
  document.getElementById('track-label-start').textContent = fmt(sEntry);
  document.getElementById('track-label-end').textContent   = fmt(eEntry);
}

function updateTrackFill() {
  const fill = document.querySelector('#track-slider .dual-slider-fill');
  if (!fill) return;
  const max = Math.max(1, State.dateRange.length - 1);
  fill.style.left  = `${(State.trackIdxStart / max) * 100}%`;
  fill.style.right = `${100 - (State.trackIdxEnd / max) * 100}%`;
}

function updateTrackHint() {
  const hint = document.querySelector('.track-range-hint');
  const slider = document.getElementById('track-slider');
  if (!hint || !slider) return;
  const hasSelection = !!State.selectedRnpa;
  hint.classList.toggle('visible', !hasSelection);
  slider.classList.toggle('disabled', !hasSelection);
}

// Load any months spanning the track range, build chronological points for the
// selected vessel, then render its track + detail chart.
async function applyTrackRange() {
  if (!State.selectedRnpa || State.selectedVi == null) {
    clearTrack();
    return;
  }

  // Collect month keys spanning the range
  const monthKeys = new Set();
  for (let i = State.trackIdxStart; i <= State.trackIdxEnd; i++) {
    const d = State.dateRange[i];
    if (!d) continue;
    monthKeys.add(`${d.year}_${String(d.month).padStart(2, '0')}`);
  }

  // Show a small loading indication if many months need fetching (LRU may already have them)
  const monthsArr = await Promise.all([...monthKeys].map(async (key) => {
    const [yStr, mStr] = key.split('_');
    const data = await loadMonth(parseInt(yStr, 10), parseInt(mStr, 10));
    return [key, data];
  }));
  const months = new Map(monthsArr);

  // Build chronological points for this vessel
  const points = [];
  for (let i = State.trackIdxStart; i <= State.trackIdxEnd; i++) {
    const d = State.dateRange[i];
    const key = `${d.year}_${String(d.month).padStart(2, '0')}`;
    const md = months.get(key);
    if (!md) continue;
    const rec = (md.dayIndex.get(d.day) || []).find(r => r.vi === State.selectedVi);
    if (rec) {
      points.push({
        year: d.year, month: d.month, day: d.day,
        lat: rec.lat, lon: rec.lon, speed: rec.speed, n: rec.n
      });
    }
  }

  renderTrack(points);

  const vessel = State.registry.vessels[State.selectedRnpa];
  if (vessel) {
    showVesselDetail(
      State.selectedRnpa, vessel, points,
      State.dateRange[State.trackIdxStart],
      State.dateRange[State.trackIdxEnd]
    );
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
