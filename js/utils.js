// utils.js — Color scales and shared helpers

// Speed color scale: blue (0 kn) → teal (5 kn) → yellow (10 kn) → red (15+ kn)
const SPEED_STOPS = [
  { at: 0,  color: [33,  102, 172] },  // dark blue (anchored/drifting)
  { at: 3,  color: [103, 169, 207] },  // light blue
  { at: 7,  color: [254, 224, 139] },  // yellow
  { at: 12, color: [244, 109,  67] },  // orange
  { at: 18, color: [215,  48,  39] }   // red (fast transit)
];

export function speedToColor(knots) {
  const stops = SPEED_STOPS;
  if (knots <= stops[0].at) return stops[0].color;
  if (knots >= stops[stops.length - 1].at) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    if (knots >= stops[i].at && knots <= stops[i + 1].at) {
      const t = (knots - stops[i].at) / (stops[i + 1].at - stops[i].at);
      return stops[i].color.map((c, j) => Math.round(c + t * (stops[i + 1].color[j] - c)));
    }
  }
  return stops[stops.length - 1].color;
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Gear colors: [trawler, purse_seine, longline, other]
export const GEAR_COLORS = ['#e67e22', '#3498db', '#2ecc71', '#95a5a6'];
export const GEAR_LABELS = ['Trawler', 'Purse Seine', 'Longline', 'Other'];

// Species colors: [finfish, sardine, shark, shrimp, tuna, other]
export const SPECIES_COLORS = ['#e74c3c', '#f39c12', '#9b59b6', '#e67e22', '#1abc9c', '#7f8c8d'];
export const SPECIES_LABELS = ['Finfish', 'Sardine', 'Shark', 'Shrimp', 'Tuna', 'Other'];

// Fleet colors
export const FLEET_COLORS = { 'large scale': '#3498db', 'small scale': '#e67e22' };

// Month names
export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Get the primary color for a vessel (used when coloring by gear/species/fleet)
export function vesselColor(vessel, colorBy) {
  if (colorBy === 'gear') {
    const idx = vessel.gear.indexOf(1);
    return idx >= 0 ? GEAR_COLORS[idx] : '#555';
  }
  if (colorBy === 'species') {
    const idx = vessel.target.indexOf(1);
    return idx >= 0 ? SPECIES_COLORS[idx] : '#555';
  }
  if (colorBy === 'fleet') {
    return FLEET_COLORS[vessel.fleet] || '#555';
  }
  return null; // 'speed' → color computed per-record from track data
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function formatDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
