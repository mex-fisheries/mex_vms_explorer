// ui.js — Vessel detail panel, month nav, and topbar updates

import { State } from './app.js';
import { MONTH_NAMES, GEAR_LABELS, SPECIES_LABELS, daysInMonth, formatDate } from './utils.js';

// Build the month navigation buttons from the manifest
export function buildMonthNav(manifest, onMonthSelect) {
  const container = document.getElementById('month-nav');
  container.innerHTML = '';

  for (const m of manifest.months) {
    const btn = document.createElement('button');
    btn.className = 'month-btn';
    btn.dataset.year  = m.year;
    btn.dataset.month = m.month;
    btn.textContent   = MONTH_NAMES[m.month - 1];
    btn.title = `${MONTH_NAMES[m.month - 1]} ${m.year} — ${m.n_vessels} vessels`;
    btn.addEventListener('click', () => onMonthSelect(m.year, m.month));
    container.appendChild(btn);
  }

  // Mark current month active
  updateActiveMonth();
}

export function updateActiveMonth() {
  document.querySelectorAll('.month-btn').forEach(btn => {
    const active =
      parseInt(btn.dataset.year)  === State.currentYear &&
      parseInt(btn.dataset.month) === State.currentMonth;
    btn.classList.toggle('active', active);
  });
}

// Update the top bar stats line
export function updateTopbar() {
  document.getElementById('stat-date').textContent =
    formatDate(State.currentYear, State.currentMonth, State.currentDay);
  document.getElementById('stat-vessels').textContent =
    `${State.allowedVis?.size ?? '—'} vessels`;
}

// Show the vessel detail side panel for the given RNPA
export function showVesselDetail(rnpa, vessel, trackPoints, year, month) {
  document.getElementById('vessel-detail').classList.remove('hidden');
  document.getElementById('vd-name').textContent  = vessel.name || rnpa;
  document.getElementById('vd-rnpa').textContent  = `RNPA: ${rnpa}`;

  // Metadata rows
  const metaRows = [
    ['Fleet',   vessel.fleet || '—'],
    ['State',   vessel.state || '—'],
    ['Port',    vessel.port  || '—'],
    ['Species', _speciesLabel(vessel.target)],
    ['Gear',    _gearLabel(vessel.gear)]
  ];

  const metaEl = document.getElementById('vd-meta');
  metaEl.innerHTML = metaRows.map(([k, v]) =>
    `<div class="vd-row"><span class="vd-key">${k}</span><span class="vd-val">${v}</span></div>`
  ).join('');

  // Speed chart
  if (trackPoints && trackPoints.length > 0) {
    const days   = trackPoints.map(p => p.day);
    const speeds = trackPoints.map(p => p.speed);

    const trace = {
      x: days,
      y: speeds,
      mode: 'lines+markers',
      line: { color: '#00b4d8', width: 1.5 },
      marker: { size: 4, color: '#00b4d8' },
      hovertemplate: 'Day %{x}: %{y} kn<extra></extra>'
    };

    const layout = {
      margin: { t: 4, r: 10, b: 30, l: 35 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#7a8aa0', size: 10 },
      xaxis: {
        title: '',
        gridcolor: '#2a3448',
        zerolinecolor: '#2a3448',
        tickfont: { color: '#7a8aa0', size: 9 }
      },
      yaxis: {
        title: '',
        gridcolor: '#2a3448',
        zerolinecolor: '#2a3448',
        rangemode: 'tozero',
        tickfont: { color: '#7a8aa0', size: 9 }
      },
      showlegend: false
    };

    Plotly.react('vd-chart', [trace], layout, { responsive: true, displayModeBar: false });
  } else {
    document.getElementById('vd-chart').innerHTML =
      '<div style="color:#7a8aa0;font-size:12px;padding:8px">No track data this month</div>';
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

// --- Helpers -----------------------------------------------------------------

function _speciesLabel(target) {
  if (!target) return '—';
  const active = SPECIES_LABELS.filter((_, i) => target[i] === 1);
  return active.length ? active.join(', ') : '—';
}

function _gearLabel(gear) {
  if (!gear) return '—';
  const active = GEAR_LABELS.filter((_, i) => gear[i] === 1);
  return active.length ? active.join(', ') : '—';
}
