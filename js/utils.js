// utils.js — Color scales and shared helpers

import { getLang } from './i18n.js';

// Gear colors: [trawler, purse_seine, longline, other]
export const GEAR_COLORS = ['#f59e42', '#e05283', '#a78bfa', '#8b9daa'];

// Species colors: [finfish, sardine, shark, shrimp, tuna, other]
export const SPECIES_COLORS = ['#f59e42', '#e8d44d', '#e05283', '#f07c5a', '#a78bfa', '#8b9daa'];

// Month names
export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Get the primary color for a vessel (used when coloring by gear/species)
export function vesselColor(vessel, colorBy) {
  if (colorBy === 'gear') {
    const idx = vessel.gear.indexOf(1);
    return idx >= 0 ? GEAR_COLORS[idx] : '#555';
  }
  if (colorBy === 'species') {
    const idx = vessel.target.indexOf(1);
    return idx >= 0 ? SPECIES_COLORS[idx] : '#555';
  }
  return '#555';
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function formatDate(year, month, day) {
  const lang = getLang();
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}
