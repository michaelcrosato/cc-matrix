// Every balance number the Dev Mode sliders can touch. `defaults` never changes; `config` is live.
export const SLIDERS = [
  ['vitalsDrain', 'VITALS DRAIN X', 0.2, 3, 0.05],
  ['bleedDrain', 'BLEED DRAIN /S', 0, 1.5, 0.05],
  ['mistakePenalty', 'MISTAKE COST', 0, 20, 1],
  ['maxMistakes', 'MAX MISTAKES (0=NONE)', 0, 12, 1],
  ['timeLimit', 'TIME LIMIT X', 0.4, 3, 0.05],
  ['cursorSpeed', 'CURSOR SPEED', 3, 24, 0.5],
  ['steadyFactor', 'STEADY FACTOR', 0.1, 1, 0.05],
  ['aimAssist', 'AIM ASSIST', 0, 1, 0.05],
  ['toolTolerance', 'TOOL TOLERANCE X', 0.5, 3, 0.05],
  ['drainRate', 'DRAIN RATE', 0.4, 5, 0.1],
  ['laserTime', 'LASER BURN TIME', 0.2, 2.5, 0.05],
  ['syringeDose', 'SYRINGE DOSE', 4, 50, 1],
  ['composureGain', 'COMPOSURE / CLEAN', 0, 25, 1],
  ['quietSlow', 'QUIET SLOW X', 0.05, 1, 0.05],
  ['quietDrain', 'QUIET DRAIN /S', 4, 50, 1],
  ['lookCost', 'SECOND LOOK COST', 10, 100, 5],
  ['lookSeconds', 'SECOND LOOK SECONDS', 1, 4, 0.5],
  ['strainSpeed', 'STRAIN SPEED X', 0.3, 3, 0.05],
  ['strainHp', 'STRAIN HP X', 0.34, 3, 0.33],
  ['irae', 'DIES IRAE BASE BPM', 40, 110, 2],
  ['codeBlueZone', 'CODE BLUE ZONE', 0.08, 0.6, 0.02],
  ['coopScale', 'CO-OP SCALE / SEAT', 0, 1, 0.05],
];

export const defaults = {
  vitalsDrain: 1, bleedDrain: 0.35, mistakePenalty: 6, maxMistakes: 5, timeLimit: 1,
  cursorSpeed: 10, steadyFactor: 0.4, aimAssist: 0.4, toolTolerance: 1,
  drainRate: 1.4, laserTime: 0.7, syringeDose: 18,
  composureGain: 7, quietSlow: 0.25, quietDrain: 18, lookCost: 60, lookSeconds: 4,
  strainSpeed: 1, strainHp: 1, irae: 72, codeBlueZone: 0.2, coopScale: 0.25,
};

export const config = { ...defaults };
export function resetConfig(target = config) { Object.assign(target, defaults); return target; }

export const DIFFICULTY = {
  intern: { label: 'INTERN', time: 1.4, drain: 0.6, saves: 2, hint: true, about: 'MORE TIME. SLOWER VITALS. TWO CODE BLUE SAVES.' },
  resident: { label: 'RESIDENT', time: 1, drain: 1, saves: 1, hint: true, about: 'THE SHIFT AS WRITTEN.' },
  attending: { label: 'ATTENDING', time: 0.8, drain: 1.3, saves: 1, hint: false, about: 'LESS TIME. NO HINT MARKER. NO MERCY.' },
};
