// app.js — Application state and boot sequence

import { initMap, renderFrame, renderTrack, clearTrack, loadPorts, setPortsVisible, isReady } from './map.js';
import { loadMonth } from './tracks.js';
import { applyFilters, initFilterControls, updateFilterCount, resetFilters } from './filters.js';
import { initAnimation, updateScrubber, stopPlayback } from './animation.js';
import { buildMonthNav, updateActiveMonth, updateTopbar, showVesselDetail, hideVesselDetail, initSidebarToggle, initVesselSearch } from './ui.js';
import { daysInMonth } from './utils.js';
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

// --- Boot -------------------------------------------------------------------
async function boot() {
  setLoading(t('loadingData'));

  try {
    const [manifest, registry, ports] = await Promise.all([
      fetch('data/manifest.json').then(r => r.json()),
      fetch('data/vessel_registry.json').then(r => r.json()),
      fetch('data/ports.json').then(r => r.json()).catch(() => [])
    ]);

    State.manifest = manifest;
    State.registry = registry;
    State.ports    = ports;

    await initMapAsync();

    buildMonthNav(manifest, selectMonth);
    initFilterControls(onFilterChange);
    initAnimation(onDayStep, onMonthChange);
    initVesselSearch(registry, onVesselClick);
    initSidebarToggle();

    // Vessel detail close button
    document.getElementById('vessel-detail-close').addEventListener('click', () => {
      deselectVessel();
    });

    // Ports toggle
    document.getElementById('toggle-ports').addEventListener('change', (e) => {
      setPortsVisible(e.target.checked);
    });

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
      const next = getLang() === 'es' ? 'en' : 'es';
      setLang(next);
      document.getElementById('lang-toggle').textContent = next === 'es' ? 'EN' : 'ES';
      updateTopbar();
    });

    loadPorts(ports);
    applyTranslations();

    const firstMonth = manifest.months[0];
    await selectMonth(firstMonth.year, firstMonth.month);

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

// --- Month selection ---------------------------------------------------------
async function selectMonth(year, month) {
  stopPlayback();
  setLoading(`${t('loadingMonth')} ${year}/${String(month).padStart(2,'0')}...`);

  try {
    State.currentYear  = year;
    State.currentMonth = month;
    State.currentDay   = 1;
    State.selectedRnpa = null;
    State.selectedVi   = null;

    State.monthData = await loadMonth(year, month);
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
  State.selectedVi = State.registry.idx_to_rnpa.indexOf(rnpa);

  const vessel = State.registry.vessels[rnpa];
  if (!vessel) return;

  renderTrack(State.monthData, State.selectedVi, State.registry);

  // Collect track data including hours for the detail chart
  const trackPoints = [];
  if (State.monthData) {
    const sortedDays = [...State.monthData.dayIndex.keys()].sort((a, b) => a - b);
    for (const day of sortedDays) {
      const rec = (State.monthData.dayIndex.get(day) || [])
        .find(r => r.vi === State.selectedVi);
      if (rec) trackPoints.push({ day, lat: rec.lat, lon: rec.lon, speed: rec.speed, n: rec.n });
    }
  }

  showVesselDetail(rnpa, vessel, trackPoints, State.currentYear, State.currentMonth);
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
