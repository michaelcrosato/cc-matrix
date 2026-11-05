/* 00-core: the engine alias, constants, random streams, the event bus, registries and STATE (the one thing saved). */
const E = My3D2dge, { px, clamp, lerp, approach } = E;
let game = null;                                   // the E.Game, made in 99-start
const TAU = Math.PI * 2, T = 16;
const HEADLESS = typeof document === 'undefined';
const W = c => (c + .5) * T;                       // a cell's centre in world units
const at = (cx, cy, z = 0) => ({ x: W(cx), y: W(cy), z });
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clockStr = h => { h = ((h % 24) + 24) % 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor(h % 1 * 60)).padStart(2, '0'); };
const parseClock = s => { const [a, b] = String(s).split(':').map(Number); return a + (b || 0) / 60; };
const money = n => '$' + Math.round(n).toLocaleString('en-US');

/* ---- random streams: never Math.random in anything that changes play ---- */
const RNG = { world: E.rng(1412), sim: E.rng(187), cos: E.rng(22), bots: E.rng(555) };
const reseed = (seed) => { RNG.world = E.rng(seed ^ 1412); RNG.sim = E.rng(seed ^ 187); RNG.cos = E.rng(seed ^ 22); RNG.bots = E.rng(seed ^ 555); };

/* ---- the event bus: systems announce, meters/toasts/stats/debug listen ---- */
const bus = {
  h: {},
  on(k, f) { (this.h[k] = this.h[k] || []).push(f); return () => { this.h[k] = this.h[k].filter(x => x !== f); }; },
  emit(k, d) { for (const f of (this.h[k] || []).slice()) try { f(d); } catch (e) { if (typeof game !== 'undefined' && game) game.fail('bus ' + k, e); } }
};

/* ---- registries: def(kind, id, spec) / get(kind, id) ---- */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});

/* ---- STATE: the save. Systems rebuild themselves from it ---- */
const FLAGS0 = () => ({ odessaRespect: false, pocketsMet: false, coreyCI: false, coreyPackage: false, wireUp: false, reupSpot: null, dilemma: null,
  sweep: false, wallOff: false, rookFree: true, lossOn: null, pigeonTrust: 0, promise: false, canary: false, coreyExposed: false, coreyRescued: false,
  momSafe: false, path: null, i5: null, danaKnown: false, teeShort: false, rookDrew: false, ops1: null, ops2: null, ops4: null, dutch: null,
  coreyBail: null, payphoneChoice: null, stashSpot: 'v1412', heardS34: false, rookBoxed: false, affidavitTries: 0, vanBurned: false, daleEscaped: false,
  burners: false, serials: false, amended: false, raidPlan: null, countRunner: null, easyPhoto: false, pigeonRunner: false });
function newState() {
  return { v: 1, ep: 1, beat: 'e1.cold', played: 0, tips: {}, unlocked: 1, done: {},
    meters: { brass: 60, heat: 10, legal: 0, case: 0, fund: 200 }, flags: FLAGS0(),
    photos: [], evidence: [], facts: [], board: { pins: {}, links: [] },
    numbers: {}, wire: { logs: [], ids: {}, voiceprints: [], heard: {} }, cipher: { dir: 'cw', solved: { cw: false, ccw: false }, decoded: {} },
    crew: { discipline: 1, goodwill: 0, count: 0, stash: 'v1412', phones: 'payphones', knows: [] },
    stats: { photos: 0, made: 0, minimized: 0, violations: 0, chases: 0, tails: 0, retries: 0, logged: 0 } };
}
let STATE = newState();
const F = () => STATE.flags;
const hasFact = f => STATE.facts.includes(f);
function addFact(f, quiet) { if (!f || hasFact(f)) return false; STATE.facts.push(f); bus.emit('fact', { fact: f, quiet }); return true; }
function addEvidence(ev) {   // { id, kind, ref, pts, text, line }
  if (STATE.evidence.some(e => e.id === ev.id)) return null;
  const e = Object.assign({ ep: STATE.ep }, ev); STATE.evidence.push(e); bus.emit('evidence', e); return e;
}
const evidence = id => STATE.evidence.find(e => e.id === id);
const knownNumber = id => STATE.numbers[id] && STATE.numbers[id].known;
const tip = (id) => { if (STATE.tips[id]) return false; STATE.tips[id] = 1; return true; };
const restoreState = d => { STATE = Object.assign(newState(), JSON.parse(JSON.stringify(d))); STATE.flags = Object.assign(FLAGS0(), STATE.flags); bus.emit('restore', STATE); };

/* ---- strong language (App. G bleep list) ---- */
const BLEEP = /\b(motherfuck\w*|fuck\w*|shit\w*|bitch\w*|ass|damn)\b/gi;
const clean = s => (typeof game !== 'undefined' && game && game.settings && game.settings.language === 'bleeped') ? String(s).replace(BLEEP, '—') : String(s);

/* the 5x7 pixel font has ASCII and a few symbols: map the typography the writing uses onto it (canvas text only) */
const FONT_MAP = { '·': '-', '…': '...', '—': '--', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '⟲': '<', '⟳': '>', '☎': 'T', '◆': '*', '●': '*', '▲': '^', 'é': 'e' };
const fontFix = s => typeof s === 'string' ? s.replace(/[·…—–’‘“”⟲⟳☎◆●▲é]/g, c => FONT_MAP[c]) : s;
for (const k of ['text', 'title']) { const f = E.font[k]; if (f) E.font[k] = function (g, str, ...a) { return f.call(E.font, g, fontFix(str), ...a); }; }
for (const k of ['width', 'wrap']) { const f = E.font[k]; if (f) E.font[k] = function (str, ...a) { return f.call(E.font, fontFix(str), ...a); }; }
