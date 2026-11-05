/* BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * Core loop: take a mission at the shop, pack your bento of ninja tools, slip into a lantern-lit night location unseen,
 * silence guards with Silent Cuts, reach the target, survive the boss, escape, and earn a rank that unlocks new tools.
 * 00-core: the shared namespace B, registries, the event bus, randomness and math helpers. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const B = {};
const CELL = 16;
const HEADLESS = typeof document === 'undefined' || typeof window === 'undefined' || !window.document || !window.document.body;
B.VERSION = '1.0.0';
B.HUB = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);

/* registries: content is data, registered by kind and id */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});
Object.assign(B, { def, get, all, REG });

/* the event bus: systems talk through events (noise, seen, detected, alert, bodyFound, silentCut, kill, damage,
 * heroDeath, toolUsed, objective, checkpoint, bell, boss, missionEnd) */
const BUS = {};
B.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => B.off(ev, fn); };
B.off = (ev, fn) => { const l = BUS[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
B.emit = (ev, data) => { const l = BUS[ev]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { if (B.game) B.game.fail('event ' + ev, e); else throw e; } } };

/* randomness: gameplay uses rand() (Math.random, seeded by the hub and the tests) in update only; drawing uses crand,
 * a cosmetic stream of its own, so it never shifts the game's numbers */
const rand = () => Math.random();
const crand = E.rng(0xB3770);
const rpick = l => l[Math.floor(rand() * l.length)];
const cpick = l => l[Math.floor(crand() * l.length)];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cc = v => (v + .5) * CELL;   // a cell's center in world units
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
Object.assign(B, { rand, crand, rpick, cpick, dist2, angTo, cc, fmtTime, hashStr });

/* ranks: bento grades, best first */
B.RANKS = [['Grand Kaiseki', 2600, '#e8b04a'], ['Makunouchi', 2000, '#d8402a'], ['Ekiben', 1400, '#c87a3a'], ['Hinomaru', 800, '#b8a890'], ['Leftovers', -1e9, '#7a6a5a']];
B.rankOf = score => B.RANKS.find(r => score >= r[1])[0];
B.rankIndex = name => B.RANKS.findIndex(r => r[0] === name);
B.rankColor = name => (B.RANKS.find(r => r[0] === name) || B.RANKS[4])[2];
