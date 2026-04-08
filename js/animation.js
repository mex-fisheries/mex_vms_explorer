// animation.js — Day-level playback engine using absolute date index

import { State } from './app.js';
import { formatDate } from './utils.js';

let rafId = null;
let lastStepTime = 0;
let onStep = null;        // callback: (year, month, day) → void
let onMonthChange = null; // async callback: (year, month) → void

export function initAnimation(stepCb, monthChangeCb) {
  onStep        = stepCb;
  onMonthChange = monthChangeCb;

  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-prev').addEventListener('click', () => advance(-1));
  document.getElementById('btn-next').addEventListener('click', () => advance(+1));

  const slider = document.getElementById('date-slider');
  slider.addEventListener('input', () => {
    goToIndex(parseInt(slider.value));
  });

  document.getElementById('playback-speed').addEventListener('change', (e) => {
    State.playbackSpeed = parseInt(e.target.value);
  });
}

async function goToIndex(idx) {
  if (idx < 0 || idx >= State.dateRange.length) return;

  const entry = State.dateRange[idx];
  const monthChanged = entry.year !== State.currentYear || entry.month !== State.currentMonth;

  State.dateIndex  = idx;
  State.currentDay = entry.day;

  if (monthChanged) {
    State.currentYear  = entry.year;
    State.currentMonth = entry.month;

    if (onMonthChange) {
      const wasPlaying = State.isPlaying;
      if (wasPlaying) {
        State.isPlaying = false;
        cancelAnimationFrame(rafId);
      }

      await onMonthChange(entry.year, entry.month);

      if (wasPlaying) {
        State.isPlaying = true;
        lastStepTime = 0;
        rafId = requestAnimationFrame(loop);
      }
    }
  }

  updateSlider();
  onStep(State.currentYear, State.currentMonth, State.currentDay);
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
  if (!State.isPlaying) return;
  if (timestamp - lastStepTime >= State.playbackSpeed) {
    lastStepTime = timestamp;
    advance(+1);
  }
  if (State.isPlaying) {
    rafId = requestAnimationFrame(loop);
  }
}

async function advance(delta) {
  const newIdx = State.dateIndex + delta;
  if (newIdx < 0 || newIdx >= State.dateRange.length) {
    stopPlayback();
    return;
  }
  await goToIndex(newIdx);
}

export function updateSlider() {
  const slider = document.getElementById('date-slider');
  slider.max   = State.dateRange.length - 1;
  slider.value = State.dateIndex;
  updateDateLabel();
}

function updateDateLabel() {
  const entry = State.dateRange[State.dateIndex];
  if (!entry) return;
  document.getElementById('date-label').textContent =
    formatDate(entry.year, entry.month, entry.day);
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
