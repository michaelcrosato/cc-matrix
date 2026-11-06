/** Live balance values. Dev Mode sliders write these; Reset copies DEFAULTS back. */
export const DEFAULTS = {
  vitalsDrainMul: 1,
  bleedDrain: 0.35,
  mistakePenalty: 6,
  maxMistakes: 5,
  timeLimitMul: 1,
  cursorSpeed: 10,
  steadyFactor: 0.4,
  aimAssist: 1,
  toolTol: 1,
  drainRate: 1.4,
  laserTime: 0.7,
  syringeDose: 18,
  syringeDraw: 0.45,
  composureGain: 7,
  quietScale: 0.25,
  quietDrain: 18,
  lookCost: 60,
  lookSeconds: 4,
  strainSpeed: 1,
  strainHp: 1,
  diesBpm: 72,
  blueZone: 0.2,
  coopScale: 0.25,
};

const live = structuredClone(DEFAULTS);

export function getConfig() {
  return live;
}

export function applySlider(key, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
    throw new Error(`unknown slider ${key}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`bad slider value ${key}`);
  live[key] = n;
  return live[key];
}

export function resetConfig() {
  for (const k of Object.keys(DEFAULTS)) live[k] = DEFAULTS[k];
  return live;
}

export const DIFFICULTY = {
  intern: { time: 1.4, drain: 0.6, blues: 2, hint: true },
  resident: { time: 1, drain: 1, blues: 1, hint: true },
  attending: { time: 0.8, drain: 1.3, blues: 1, hint: false },
};
