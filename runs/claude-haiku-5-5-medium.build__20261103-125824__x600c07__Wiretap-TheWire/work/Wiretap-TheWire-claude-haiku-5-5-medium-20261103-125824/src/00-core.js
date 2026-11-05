// WIRETAP: shared constants, random streams, save state, event bus.
const E = My3D2dge;
const TITLE = 'WIRETAP';
const SAVE_KEY = 'wiretap';

// Seeded random streams: gameplay never uses Math.random.
const RNG = { world: E.rng(7), sim: E.rng(11), cosmetic: E.rng(13) };
const rnd = (stream, a, b) => a + (b - a) * stream();

// Difficulty (PLAN §4.7): suspicion rise, minimization window, brass decay, tail tolerance.
const DIFF = {
  Rookie: { rise: .7, label: 'Rookie' },
  Detective: { rise: 1, label: 'Detective' },
  'Murder Police': { rise: 1.35, label: 'Murder Police' },
};

// Save state: the only thing the game writes to storage.
function freshState() {
  return {
    ep: 1,
    beat: 'cold',           // where Episode 1 is up to
    clock: 15 * 60,         // minutes after midnight on the mission clock (15:00)
    heat: 0,                // police heat, 0..100
    case: 0,                // case strength, from identifications and evidence
    fund: 200,              // detail money in dollars
    film: 30,               // shots left on the camera this mission
    photos: [],             // { id, subject, t, place, stars, act }
    faces: {},              // person id -> true once a ★Face photo has identified them
    roles: {},              // person id -> role read
    pockets: false,         // Pockets met
    burnedUntil: 0,         // seconds of game time until photos burn again
    made: 0,                // times the detail was made this episode
    tips: {},               // one-time tutorial hints shown
    done: false,
  };
}
let STATE = freshState();
function loadState() {
  const saved = E.store.get(SAVE_KEY, null);
  if (saved && saved.ep === 1 && saved.beat) STATE = Object.assign(freshState(), saved);
  return STATE;
}
function saveState() { E.store.set(SAVE_KEY, STATE); }
function resetState() { STATE = freshState(); saveState(); }

// Tiny event bus: systems publish, meters and toasts listen.
const bus = {
  handlers: Object.create(null),
  on(name, fn) { (this.handlers[name] = this.handlers[name] || []).push(fn); },
  emit(name, data) { for (const fn of this.handlers[name] || []) fn(data); },
};

// Cell <-> world helpers (world = (cell + .5) * 16).
const cellWorld = c => [(c[0] + .5) * 16, (c[1] + .5) * 16];
const worldCell = (x, y) => [Math.floor(x / 16), Math.floor(y / 16)];
const dirTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const clamp01 = v => Math.max(0, Math.min(1, v));
const fmtClock = m => {
  const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};
const fmtMoney = n => '$' + Math.round(n);
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
