import { CAR_INFO, CAR_IDS, PHYS_ROWS } from '../../src/game/data/cars.js';
import { TRACKS } from '../../src/game/data/tracks.js';
import { EVENTS } from '../../src/game/data/events.js';
import { TESTS, LICENCES } from '../../src/game/data/licences.js';
import { MEDALS } from '../../src/game/data/medals.js';
import { PARTS, TYRES, SETTINGS } from '../../src/game/data/tyres_parts.js';
import { SONGS } from '../../src/game/data/songs.js';
import { qualifies } from '../../src/game/sim/career.js';
import { BODIES } from '../../src/game/models/cars.js';
import { installFor, tunedRow } from '../../src/game/sim/tuning.js';
const fits = (s, n = 60) => String(s).split(' ').every((w) => w.length <= n);
const lines = (s, n) => { let c = 0, l = ''; for (const w of String(s).toUpperCase().split(' ')) { if ((l + ' ' + w).trim().length > n) { c++; l = w; } else l = (l + ' ' + w).trim(); } return c + (l ? 1 : 0); };
export default async (t) => {
  for (const id of CAR_IDS) t.check(lines(CAR_INFO[id].text, 34) <= 8, 'attract brochure panel shows all of ' + id);
  for (const q of TESTS) { t.check(lines(q.brief, 52) <= 5, 'test brief fits its card ' + q.id); t.check(lines(q.brief, 31) <= 8, 'test brief fits the test-card panel ' + q.id); }
  for (const id of CAR_IDS) { const i = CAR_INFO[id]; t.check(!!PHYS_ROWS[id], 'physics row ' + id); t.check(i.text && i.text.length > 40, 'brochure ' + id); t.check(!!BODIES[i.body], 'body model ' + id); t.check(fits(i.text), 'brochure words ' + id); t.check(Math.ceil(i.text.length / 40) <= 8, 'brochure fits 2 pages ' + id); }
  t.check(CAR_IDS.length === 14, '14 cars'); for (const id of Object.keys(TRACKS)) t.check(!!TRACKS[id].corners.length, 'track ' + id);
  for (const q of TESTS) { t.check(!!MEDALS[q.id], 'medals ' + q.id); t.check(!!TRACKS[q.track], 'test track ' + q.id); for (const c of q.cars ?? [q.carId]) t.check(!!CAR_INFO[c], 'test car ' + q.id); t.check(q.brief.length < 220 && q.tip.length < 90, 'test text ' + q.id); t.check(MEDALS[q.id].gold < MEDALS[q.id].silver && MEDALS[q.id].silver < MEDALS[q.id].bronze, 'medal order ' + q.id); }
  t.check(TESTS.length === 12 && Object.keys(LICENCES).length === 3, '12 tests, 3 licences');
  for (const e of EVENTS) { for (const r of e.rounds) t.check(!!TRACKS[r.track], 'event track ' + e.id); for (const [c] of e.pool) t.check(!!CAR_INFO[c], 'pool car ' + e.id); if (e.prizeCar) t.check(!!CAR_INFO[e.prizeCar], 'prize car ' + e.id);
    // satisfiable: some car in the game qualifies when tuned/stock
    t.check(CAR_IDS.some((c) => !CAR_INFO[c].prize || true ? qualifies(c, { parts: [], settings: {} }, e.restrict).ok : false), 'event satisfiable ' + e.id); t.check(e.intro.length < 200, 'intro ' + e.id); }
  for (const [id, p] of Object.entries(PARTS)) t.check(p.about.length <= 60 && p.price > 0, 'part ' + id); for (const s of SETTINGS) for (const n of s.need) t.check(!!PARTS[n], 'setting part ' + s.key);
  for (const [k, s] of Object.entries(SONGS)) { for (const [pn, pat] of Object.entries(s.patterns)) { const lens = new Set(Object.values(pat).map((x) => x.split(' ').length)); t.check(lens.size === 1, `song ${k} ${pn} step counts`); } t.check(s.order.every((o) => s.patterns[o]), 'song order ' + k); }
  t.check(Object.keys(SONGS).length === 8, 'eight songs'); for (const tune of ['tuned', 'tunedHi']) t.check(tunedRow('kite', installFor(tune)).powerPS > 148, 'tune ' + tune);
};
