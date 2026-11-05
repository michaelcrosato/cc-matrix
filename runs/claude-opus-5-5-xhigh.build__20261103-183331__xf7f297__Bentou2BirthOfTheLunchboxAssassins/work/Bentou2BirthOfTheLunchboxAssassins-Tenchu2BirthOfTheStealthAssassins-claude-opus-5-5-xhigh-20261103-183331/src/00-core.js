/* =====================================================================================================================
 * BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * An original isometric ninja stealth-action game, a playful riff on Tenchu 2: Birth of the Stealth Assassins.
 * CORE LOOP: take a mission at the shop, pack your bento of ninja tools, slip into a lantern-lit night location unseen,
 * silence guards with Silent Cuts, reach the target, survive the boss, escape, and earn a rank that unlocks new tools.
 * The source files are concatenated in order inside one IIFE (tools/build.mjs): E, px, clamp, lerp, approach, TAU are
 * in scope, and every file's top-level names are visible to the files after it.
 * Content (levels, enemies, tools, bosses, lines) is data in registries (B.def); systems talk through the event bus.
 * ===================================================================================================================== */
const B = {};                       // the shared namespace (window.__BENTOU)
B.version = '1.0.0';
if (typeof window !== 'undefined') window.__BENTOU = B;
const REG = {};
/** register a piece of content: B.def('tool', 'shuriken', {...}) */
B.def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
B.get = (kind, id) => (REG[kind] || {})[id];
B.all = kind => Object.values(REG[kind] || {});
B.ids = kind => Object.keys(REG[kind] || {});

/* ---- the event bus: noise, seen, detected, alert, bodyFound, silentCut, kill, damage, heroDeath, toolUsed, objective,
 * checkpoint, bell, boss, missionEnd ... Score, the HUD, the music, barks, the hub and the tests all listen ---- */
const BUS = {};
B.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => B.off(ev, fn); };
B.off = (ev, fn) => { const l = BUS[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
B.emit = (ev, data) => {
  const l = BUS[ev]; if (!l) return;
  for (const f of l.slice()) { try { f(data || {}); } catch (e) { if (typeof game !== 'undefined') game.fail('bus ' + ev, e); else throw e; } }
};

/* ---- randomness: rand() is gameplay (Math.random: seeded by the hub and the tests); crand is cosmetic (draw only) ---- */
const rand = () => Math.random();
const randR = (a, b) => a + (b - a) * Math.random();
const randI = (a, b) => Math.floor(a + (b - a + 1) * Math.random());
const pickR = list => list[Math.floor(Math.random() * list.length)];
const crandS = E.rng(20261103);
const crand = () => crandS();
const cpick = list => list[Math.floor(crandS() * list.length)];

/* ---- small helpers ---- */
const T16 = 16;
const D2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ANG = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cellC = c => (c + .5) * T16;             // a cell's centre in world units
const toCell = v => Math.floor(v / T16);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const safeMedia = q => { try { return !!(typeof matchMedia === 'function' && matchMedia(q).matches); } catch (e) { return false; } };
const deepCopy = o => JSON.parse(JSON.stringify(o));
B.util = { D2, ANG, cellC, toCell, fmtTime, deepCopy };
