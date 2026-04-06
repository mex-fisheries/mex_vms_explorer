// animation.js — Day-level playback engine

import { State, monthExists } from './app.js';
import { daysInMonth } from './utils.js';

let rafId = null;
let lastStepTime = 0;
let onStep = null;    // callback: (year, month, day) → void
let onMonthChange = null;  // async callback: (year, month) → void

export function initAnimation(stepCb, monthChangeCb) {
  onStep       = stepCb;
  onMonthChange = monthChangeCb;

  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-prev').addEventListener('click', () => advance(-1));
  document.getElementById('btn-next').addEventListener('click', () => advance(+1));

  const scrubber = document.getElementById('day-scrubber');
  scrubber.addEventListener('input', () => {
    State.currentDay = parseInt(scrubber.value);
    updateDayLabel();
    onStep(State.currentYear, State.currentMonth, State.currentDay);
  });

  document.getElementById('playback-speed').addEventListener('change', (e) => {
    State.playbackSpeed = parseInt(e.target.value);
  });
}

function togglePlay() {
  State.isPlaying = !State.isPlaying;
  const btn = document.getElementById('btn-play');
  if (State.isPlaying) {
    btn.textContent = '⏸';
    btn.classList.add('playing');
    lastStepTime = 0;
    rafId = requestAnimationFrame(loop);
  } else {
    btn.textContent = '▶';
    btn.classList.remove('playing');
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function loop(timestamp) {
  if (timestamp - lastStepTime >= State.playbackSpeed) {
    lastStepTime = timestamp;
    advance(+1);
  }
  rafId = requestAnimationFrame(loop);
}

async function advance(delta) {
  const maxDay = daysInMonth(State.currentYear, State.currentMonth);
  let newDay = State.currentDay + delta;

  if (newDay > maxDay) {
    // Check if next month exists before advancing
    const changed = await changeMonth(+1);
    if (!changed) { stopPlayback(); return; }
    newDay = 1;
  } else if (newDay < 1) {
    // Check if previous month exists before going back
    const changed = await changeMonth(-1);
    if (!changed) { stopPlayback(); return; }
    newDay = daysInMonth(State.currentYear, State.currentMonth);
  }

  State.currentDay = newDay;
  updateScrubber();
  onStep(State.currentYear, State.currentMonth, State.currentDay);
}

// Returns true if the month change succeeded, false if the target month doesn't exist
async function changeMonth(delta) {
  let m = State.currentMonth + delta;
  let y = State.currentYear;
  if (m > 12) { m = 1;  y++; }
  if (m < 1)  { m = 12; y--; }

  // Don't advance if the target month isn't in the manifest
  if (!monthExists(y, m)) return false;

  State.currentMonth = m;
  State.currentYear  = y;

  if (onMonthChange) {
    // Pause during load to avoid rendering with stale data
    const wasPlaying = State.isPlaying;
    if (wasPlaying) {
      State.isPlaying = false;
      cancelAnimationFrame(rafId);
    }
    await onMonthChange(y, m);
    if (wasPlaying) {
      State.isPlaying = true;
      lastStepTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  return true;
}

export function updateScrubber() {
  const scrubber = document.getElementById('day-scrubber');
  const maxDay = daysInMonth(State.currentYear, State.currentMonth);
  scrubber.max   = maxDay;
  scrubber.value = State.currentDay;
  updateDayLabel();
}

function updateDayLabel() {
  document.getElementById('day-label').textContent = State.currentDay;
}

export function stopPlayback() {
  if (State.isPlaying) {
    State.isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
    document.getElementById('btn-play').classList.remove('playing');
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
