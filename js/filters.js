// filters.js — Client-side vessel filtering
// All filtering happens against registry.vessels in memory — zero network requests.

import { State } from './app.js';

// Rebuild the set of vessel indices that pass all current filters.
// Returns a Set<number> of vessel indices (matching the vi field in track files).
export function applyFilters(registry) {
  const { filters } = State;
  const allowed = new Set();

  const entries = Object.entries(registry.vessels);
  const idxMap = Object.fromEntries(
    registry.idx_to_rnpa.map((rnpa, i) => [rnpa, i])
  );

  for (const [rnpa, vessel] of entries) {
    // Species filter: pass if vessel matches ANY enabled species index
    if (filters.species.size < 6) {
      const hasSpecies = [...filters.species].some(idx => vessel.target[idx] === 1);
      if (!hasSpecies) continue;
    }

    // Gear filter: pass if vessel matches ANY enabled gear index
    if (filters.gear.size < 4) {
      const hasGear = [...filters.gear].some(idx => vessel.gear[idx] === 1);
      if (!hasGear) continue;
    }

    // Vessel passes — add its integer index
    const vi = idxMap[rnpa];
    if (vi !== undefined) allowed.add(vi);
  }

  return allowed;
}

// Wire up all filter controls to call onChange() whenever anything changes
export function initFilterControls(onChange) {
  // Species chips
  document.querySelectorAll('#filter-species .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) {
        State.filters.species.add(idx);
      } else {
        State.filters.species.delete(idx);
      }
      onChange();
    });
  });

  // Gear chips
  document.querySelectorAll('#filter-gear .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) {
        State.filters.gear.add(idx);
      } else {
        State.filters.gear.delete(idx);
      }
      onChange();
    });
  });

  // Color by
  document.getElementById('color-by').addEventListener('change', (e) => {
    State.colorBy = e.target.value;
    onChange();
  });

  // Reset button
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    resetFilters();
    onChange();
  });
}

export function resetFilters() {
  State.filters.species = new Set([0, 1, 2, 3, 4, 5]);
  State.filters.gear    = new Set([0, 1, 2, 3]);

  // Reset chip UI
  document.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
}

export function updateFilterCount(allowedVis, total) {
  document.getElementById('filtered-count').textContent = allowedVis.size;
  document.getElementById('total-count').textContent = total;
}
