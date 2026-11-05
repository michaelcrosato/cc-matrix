// WIRETAP: core. The engine alias, constants, registries, the event bus, seeded randomness and the one save STATE.
const E = My3D2dge, { px, clamp, lerp } = E;
const T = 16, TAU = Math.PI * 2;
const HAS_DOM = typeof document !== 'undefined' && !!document.body;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });          // a cell's centre in world units
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const fmtTime = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* registries: content as data (people, missions, calls, ...). def(kind, id, spec) / get(kind, id) / all(kind) */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});

/* the event bus: systems tell, listeners (meters, toasts, the debug overlay) hear */
const BUS = { h: {}, on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => { this.h[ev] = this.h[ev].filter(f => f !== fn); }; },
  emit(ev, a, b) { for (const f of (this.h[ev] || []).slice()) { try { f(a, b); } catch (e) { if (typeof game !== 'undefined') game.fail('bus ' + ev, e); } } } };

/* seeded streams: never Math.random in anything that changes play */
const RNG = { world: E.rng(1004), sim: E.rng(2004), cos: E.rng(3004), reseed(s) { this.sim = E.rng(s); this.world = E.rng(s + 1); } };

/* the one save: everything a save holds (App. J) */
function freshState() {
  return { v: 1, ep: 1, beat: 'e1.cold', tips: {}, done: {},
    meters: { brass: 60, heat: 10, legal: 0, case: 0, fund: 200 },
    flags: { odessaRespect: false, pocketsMet: false, dreLine: false, coreyCI: false, wireUp: false, reupSpot: null, dilemma: null, sweep: false,
      wallOff: false, rookFree: true, lossOn: null, pigeonTrust: 0, promise: false, canary: false, coreyExposed: false, coreyRescued: false,
      momSafe: false, path: null, i5: null, danaKnown: false, teeShort: false, rookDrew: false, ops1: null, ops2: null, ops4: null,
      packageFound: false, heardPigeon: false, perjury: false, denied: 0, stashSpot: 'v1412', payphone: null, coreyFate: null, dutch: null },
    photos: [], evidence: [], facts: [],
    numbers: { P1: { n: '555-0187', known: false, user: null, dead: false }, P2: { n: '555-0143', known: false, user: null, dead: false },
      P3: { n: '555-0129', known: false, user: null, dead: false }, PG: { n: '555-0110', known: false, user: 'corey', dead: false },
      H1: { n: '555-0174', known: false, user: null, dead: false }, MB: { n: '555-0161', known: false, user: null, dead: false } },
    board: { pins: {}, links: [] },
    wire: { lines: {}, logs: [], ids: {}, voiceprints: ['dana', 'lou', 'hal', 'ren', 'navarre'] },
    cipher: { dir: 'cw', decoded: [] },
    crew: { count: 0, short: 0 },
    stats: { photos: 0, made: 0, minimized: 0, violations: 0, chases: 0, tails: 0, retries: 0 } };
}
let STATE = freshState();
const FL = () => STATE.flags, M = () => STATE.meters;
const hasFact = f => STATE.facts.includes(f);
function addFact(f, pts = 0, quiet) {
  if (hasFact(f)) return false;
  STATE.facts.push(f); if (pts) meter('case', pts, quiet ? null : 'Case');
  BUS.emit('fact', f); return true;
}
function addEvidence(ev) {
  if (STATE.evidence.some(e => e.id === ev.id)) return false;
  STATE.evidence.push(Object.assign({ pts: 1, t: Date.now() }, ev)); BUS.emit('evidence', ev); return true;
}
const hasEv = id => STATE.evidence.some(e => e.id === id);
/** change a meter (brass, heat, legal, case, fund); a toast tells the player what moved and why */
function meter(k, d, why) {
  const m = STATE.meters, was = m[k];
  m[k] = k === 'case' || k === 'fund' ? Math.max(0, m[k] + d) : clamp(m[k] + d, 0, 100);
  if (m[k] !== was) BUS.emit('meter', k, { d: m[k] - was, why });
  return m[k];
}
/** difficulty multipliers (Settings, Case difficulty) */
const DIFF = () => ({ rookie: { rise: .7, minWin: 10, brass: .7, lose: 16 }, detective: { rise: 1, minWin: 8, brass: 1, lose: 12 }, murder: { rise: 1.35, minWin: 6, brass: 1.3, lose: 9 } })[(typeof game !== 'undefined' && game.settings && game.settings.difficulty) || 'detective'] || { rise: 1, minWin: 8, brass: 1, lose: 12 };

/* strong language: the bleep list (Settings) */
const BLEEP = /\b(shit|fuck|fucking|motherfucker|bitch|ass|damn)\b/gi;
const clean = s => (typeof game !== 'undefined' && game.settings && game.settings.language === 'bleeped') ? String(s).replace(BLEEP, '—') : String(s);
