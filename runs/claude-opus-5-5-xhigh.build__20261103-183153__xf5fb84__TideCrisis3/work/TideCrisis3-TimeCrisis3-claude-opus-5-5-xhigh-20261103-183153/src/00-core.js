/* 00-core: the TC namespace, units, content registries (def), the event helpers, the tuning tables (TUNE frozen
 * defaults, tune live values) and the difficulty tables. Reads nothing; everything else reads it.
 *
 * THE CORE LOOP: the camera rides the rail to the next area (WAIT) -> ACTION! starts the clock -> pop out and shoot ->
 * duck when a crisis flash says a shot will hit -> reload in cover -> clear the area before TIME runs out -> ride on ->
 * beat the boss -> STAGE CLEAR.
 */
const TC = (typeof window !== 'undefined' ? window : globalThis).TC = {};
const U = 16;                       // world units per metre
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const { clamp, lerp } = E;
const HEADLESS = typeof document === 'undefined';
TC.U = U; TC.HEADLESS = HEADLESS;

/* ---- registries: def(kind, id, spec) ---- */
const REG = {};
function def(kind, id, spec) { const k = REG[kind] || (REG[kind] = {}); spec.id = id; k[id] = spec; return spec; }
function reg(kind, id) { const k = REG[kind]; return k ? k[id] : undefined; }
function regAll(kind) { return Object.values(REG[kind] || {}); }
TC.REG = REG; TC.def = def; TC.reg = reg;

/* ---- small helpers ---- */
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const angWrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const lerpAng = (a, b, t) => a + angWrap(b - a) * t;
const fmt = n => Math.round(n).toLocaleString('en-US');
const pad2 = n => String(n).padStart(2, '0');
const deepClone = o => JSON.parse(JSON.stringify(o));
function deepFreeze(o) { Object.freeze(o); for (const k in o) if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k])) deepFreeze(o[k]); return o; }
function getPath(o, p) { for (const k of p.split('.')) o = o == null ? undefined : o[k]; return o; }
function setPath(o, p, v) { const ks = p.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
TC.fmt = fmt;

/* ---- tuning: the most important gameplay variables, live in dev mode, reset to TUNE ---- */
const TUNE = deepFreeze({
  player: { god: false, infAmmo: false, startLives: 0 /* 0: by difficulty */, iframes: 1.5, coverIn: .12, coverOut: .15, reload: .30, padSpeed: 1.6, assist: .6 },
  weapons: { hgDamage: 1, mgRate: 12, mgDamage: .45, sgPellets: 8, sgSpread: 5.5, glRadius: 48, glDamage: 6, ammoMul: 1 },
  enemy: { hpMul: 1, threatMul: 1, teleMul: 1, fireMul: 1, maxThreats: 0 /* 0: by stage */, minGap: .35, reactMul: 1, bossHpMul: 1 },
  time: { freeze: false, sceneMul: 1, eliteBonus: 2, refill: .6, speed: 1 },
  view: { fov: 55, hitVols: false, colliders: false, rails: false, aiLabels: false, threatDebug: false, perf: false, freeCam: false, hideHud: false }
});
let tune = deepClone(TUNE);
TC.TUNE = TUNE;
Object.defineProperty(TC, 'tune', { get: () => tune, set: v => { tune = v; } });
function resetTune() { tune = deepClone(TUNE); TC.emit('tune'); }
TC.resetTune = resetTune;

const DIFF = {
  easy: { name: 'EASY', lives: 7, time: 1.25, threat: .75, maxThreats: -1, hp: .85, react: 1.25 },
  normal: { name: 'NORMAL', lives: 5, time: 1, threat: 1, maxThreats: 0, hp: 1, react: 1 },
  hard: { name: 'HARD', lives: 3, time: .85, threat: 1.25, maxThreats: 1, hp: 1.2, react: .8 }
};
TC.DIFF = DIFF;

/* ---- a tiny event bus (presentation listens; the Sim emits through sim.events instead) ---- */
const BUS = {};
TC.on = (e, f) => { (BUS[e] || (BUS[e] = [])).push(f); return () => { BUS[e] = BUS[e].filter(g => g !== f); }; };
TC.emit = (e, ...a) => { for (const f of BUS[e] || []) f(...a); };

/* ---- palette for the UI ---- */
const UI = { bg0: '#10244a', bg1: '#081428', accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c8', green: '#5ad17a', ink: '#08142a' };
TC.UI = UI;
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
TC.SEAT_COLORS = SEAT_COLORS;
