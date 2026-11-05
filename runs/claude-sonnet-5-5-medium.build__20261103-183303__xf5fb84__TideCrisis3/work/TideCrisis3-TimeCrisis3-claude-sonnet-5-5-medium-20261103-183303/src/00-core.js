// 00-core.js — TC namespace, registries, RNG, live tuning. Owns: shared constants. Reads: the engine (E).
// THE CORE LOOP: the camera rides the rail to the next area (WAIT) -> ACTION! starts the clock -> pop out and shoot
// -> duck when a crisis flash says a shot will hit -> reload in cover -> clear the area before TIME runs out -> ride on
// -> beat the boss -> STAGE CLEAR.
const E = My3D2dge, px = E.px;
const TC = { REG: {}, VERSION: '1.0' };
const def = (kind, id, spec) => { (TC.REG[kind] = TC.REG[kind] || {})[id] = spec; return spec; };
const reg = (kind, id) => (TC.REG[kind] || {})[id];
const clamp = E.clamp, lerp = E.lerp, TAU = Math.PI * 2, DEG = Math.PI / 180;
const hash32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cosmetic = mulberry(0xC0FFEE);          // cosmetic-only stream (particles); never read by the Sim
const smooth = t => t * t * (3 - 2 * t);

// Live tuning: every dev-panel slider is a path into `tune`. TUNE is the frozen default set.
const TUNE = {
  player: { godMode: 0, infAmmo: 0, lives: 5, iframes: 1.5, coverIn: .12, coverOut: .15, reload: .30, padSpeed: 1.6, assist: .6 },
  weapon: { hgDmg: 1, mgRate: 12, mgDmg: .45, sgPellets: 8, sgSpread: 5.5, glRadius: 48, glDmg: 6, ammoMul: 1 },
  enemy: { hpMul: 1, threatMul: 1, telegraphMul: 1, fireMul: 1, maxThreats: 0, minGap: .35, reactMul: 1, bossHp: 1 },
  time: { freeze: 0, sceneMul: 1, elite: 2, refill: 60, speed: 1 },
  view: { fov: 55, hitVol: 0, colliders: 0, rail: 0, ai: 0, threats: 0, perf: 0, freecam: 0, hideHud: 0 }
};
const deepCopy = o => JSON.parse(JSON.stringify(o));
const tune = deepCopy(TUNE);
function resetTune() { const d = deepCopy(TUNE); for (const k in d) Object.assign(tune[k], d[k]); }
Object.freeze(TUNE); for (const k in TUNE) Object.freeze(TUNE[k]);

const DIFF = {
  easy: { lives: 7, time: 1.25, threat: .75, maxT: -1, name: 'EASY' },
  normal: { lives: 5, time: 1, threat: 1, maxT: 0, name: 'NORMAL' },
  hard: { lives: 3, time: .85, threat: 1.25, maxT: 1, name: 'HARD' }
};
const PCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const AGENT = ['kai', 'rook', 'mari', 'juno'];
const AGENT_NAME = ['KAI', 'ROOK', 'MARI', 'JUNO'];
