// ui.js — Vessel detail panel, topbar, search, CSV download

import { State } from './app.js';
import { t, getLang, speciesLabels, gearLabels } from './i18n.js';
import { formatDate } from './utils.js';

// Update the top bar stats line
export function updateTopbar() {
  document.getElementById('stat-date').textContent =
    formatDate(State.currentYear, State.currentMonth, State.currentDay);
  document.getElementById('stat-vessels').textContent =
    `${State.allowedVis?.size ?? '—'} ${t('vessels')}`;
}

// Show the vessel detail side panel for the given RNPA.
// trackPoints: [{year,month,day,lat,lon,speed,n}]; startEntry/endEntry: {year,month,day}.
export function showVesselDetail(rnpa, vessel, trackPoints, startEntry, endEntry) {
  document.getElementById('vessel-detail').classList.remove('hidden');
  document.getElementById('vd-name').textContent  = vessel.name || rnpa;
  document.getElementById('vd-rnpa').textContent  = `RNPA: ${rnpa}`;

  // Metadata rows — only Species and Gear
  const metaRows = [
    [t('species'), _speciesLabel(vessel.target)],
    [t('gear'),    _gearLabel(vessel.gear)]
  ];

  const metaEl = document.getElementById('vd-meta');
  metaEl.innerHTML = metaRows.map(([k, v]) =>
    `<div class="vd-row"><span class="vd-key">${k}</span><span class="vd-val">${v}</span></div>`
  ).join('');

  // Pings chart (x = ISO date, y = number of VMS pings) — date axis spans full range
  if (trackPoints && trackPoints.length > 0) {
    const xs    = trackPoints.map(p => `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`);
    const pings = trackPoints.map(p => p.n);

    const startStr = startEntry
      ? `${startEntry.year}-${String(startEntry.month).padStart(2,'0')}-${String(startEntry.day).padStart(2,'0')}`
      : xs[0];
    const endStr = endEntry
      ? `${endEntry.year}-${String(endEntry.month).padStart(2,'0')}-${String(endEntry.day).padStart(2,'0')}`
      : xs[xs.length - 1];

    const trace = {
      x: xs,
      y: pings,
      type: 'bar',
      marker: { color: '#34d399' },
      hovertemplate: getLang() === 'es'
        ? '%{x}: %{y} señales<extra></extra>'
        : '%{x}: %{y} pings<extra></extra>'
    };

    const layout = {
      margin: { t: 4, r: 10, b: 30, l: 35 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#5f6b7a', size: 10 },
      xaxis: {
        type: 'date',
        gridcolor: '#d0d5dd',
        zerolinecolor: '#d0d5dd',
        tickfont: { color: '#5f6b7a', size: 9 },
        range: [startStr, endStr],
        nticks: 5
      },
      yaxis: {
        gridcolor: '#d0d5dd',
        zerolinecolor: '#d0d5dd',
        rangemode: 'tozero',
        tickfont: { color: '#5f6b7a', size: 9 }
      },
      showlegend: false,
      bargap: 0.15
    };

    Plotly.react('vd-chart', [trace], layout, { responsive: true, displayModeBar: false });
  } else {
    document.getElementById('vd-chart').innerHTML =
      `<div style="color:#5f6b7a;font-size:12px;padding:8px">${t('noTrackData')}</div>`;
  }

  // CSV download button
  const downloadEl = document.getElementById('vd-download');
  if (trackPoints && trackPoints.length > 0) {
    downloadEl.innerHTML = `<button class="download-btn" id="btn-download-csv">${t('downloadCsv')}</button>`;
    document.getElementById('btn-download-csv').addEventListener('click', () => {
      _downloadCsv(rnpa, vessel, trackPoints, startEntry, endEntry);
    });
  } else {
    downloadEl.innerHTML = '';
  }
}

export function hideVesselDetail() {
  document.getElementById('vessel-detail').classList.add('hidden');
}

// Sidebar toggle (mobile)
export function initSidebarToggle() {
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// --- Vessel search -----------------------------------------------------------

export function initVesselSearch(registry, onSelect) {
  const input = document.getElementById('vessel-search');
  const results = document.getElementById('vessel-search-results');

  // Build a flat list of { rnpa, name } for fast searching
  const vessels = Object.entries(registry.vessels)
    .map(([rnpa, v]) => ({ rnpa, name: v.name || rnpa }))
    .sort((a, b) => a.name.localeCompare(b.name));

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.classList.remove('open');
      results.innerHTML = '';
      return;
    }

    const matches = vessels
      .filter(v => v.name.toLowerCase().includes(query))
      .slice(0, 10);

    if (matches.length === 0) {
      results.innerHTML = `<div class="search-result-item" style="cursor:default;color:var(--text-dim)">${t('noMatches')}</div>`;
      results.classList.add('open');
      return;
    }

    results.innerHTML = matches.map(v =>
      `<div class="search-result-item" data-rnpa="${v.rnpa}"><span class="result-name">${_escapeHtml(v.name)}</span><span class="result-rnpa">${v.rnpa}</span></div>`
    ).join('');
    results.classList.add('open');

    results.querySelectorAll('.search-result-item[data-rnpa]').forEach(el => {
      el.addEventListener('click', () => {
        onSelect(el.dataset.rnpa);
        input.value = '';
        results.classList.remove('open');
        results.innerHTML = '';
      });
    });
  });

  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.remove('open');
    }
  });
}

// --- Helpers -----------------------------------------------------------------

function _speciesLabel(target) {
  if (!target) return '—';
  const labels = speciesLabels();
  const active = labels.filter((_, i) => target[i] === 1);
  return active.length ? active.join(', ') : '—';
}

function _gearLabel(gear) {
  if (!gear) return '—';
  const labels = gearLabels();
  const active = labels.filter((_, i) => gear[i] === 1);
  return active.length ? active.join(', ') : '—';
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _downloadCsv(rnpa, vessel, trackPoints, startEntry, endEntry) {
  const header = 'date,lat,lon,speed_knots,n_pings';
  const rows = trackPoints.map(p => {
    const dateStr = `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
    return `${dateStr},${p.lat},${p.lon},${p.speed},${p.n}`;
  });
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (vessel.name || rnpa).replace(/[^a-zA-Z0-9]/g, '_');
  const fmt = (e) => e ? `${e.year}${String(e.month).padStart(2,'0')}${String(e.day).padStart(2,'0')}` : '';
  a.href = url;
  a.download = `${name}_${fmt(startEntry)}_${fmt(endEntry)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
