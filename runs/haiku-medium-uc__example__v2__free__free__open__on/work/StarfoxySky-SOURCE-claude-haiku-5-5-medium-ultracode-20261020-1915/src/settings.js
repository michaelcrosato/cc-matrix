// Persistent player settings and campaign progress (localStorage).

const SETTINGS_KEY = 'starfoxysky.settings.v1';
const PROGRESS_KEY = 'starfoxysky.progress.v1';

export const DEFAULT_SETTINGS = {
  invertX: false,
  invertY: false,
  sensitivity: 100,      // percent of base stick speed
  difficulty: 'normal',  // 'rookie' | 'normal' | 'ace'
  masterVol: 80,
  musicVol: 60,
  sfxVol: 90,
  shake: true,
  rumble: true,
  subtitles: true,
  glyphs: 'ps',          // 'ps' | 'xbox' | 'keys'
};

function readJSON(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return { ...fallback };
  }
}

export const settings = readJSON(SETTINGS_KEY, DEFAULT_SETTINGS);

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage blocked: keep in memory */ }
}

// progress.done[missionId] = { medal: 'gold' | 'silver' | 'bronze', score: number }
export const progress = readJSON(PROGRESS_KEY, { done: {} });

export function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* storage blocked */ }
}

export function resetProgress() {
  progress.done = {};
  saveProgress();
}

const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };

// Keeps the best medal and the best score for each mission.
export function recordClear(missionId, medal, score) {
  const prev = progress.done[missionId];
  const bestMedal = prev && MEDAL_RANK[prev.medal] > MEDAL_RANK[medal] ? prev.medal : medal;
  progress.done[missionId] = { medal: bestMedal, score: Math.max(score, prev ? prev.score : 0) };
  saveProgress();
}
