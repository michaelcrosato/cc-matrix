// Every id resolves; restrictions are satisfiable; every test has medals; all text fits the 60-character line and 4-line card.
import { suite } from './_lib.mjs';
import { CAR_IDS, CAR_INFO, MARQUES, PHYSICS, SHOWROOMS } from '../../src/game/data/cars.js';
import { TRACKS } from '../../src/game/data/tracks.js';
import { EVENTS, EVENT_IDS, AI_TUNES } from '../../src/game/data/events.js';
import { LICENCES, TESTS, TEST_IDS } from '../../src/game/data/licences.js';
import { PARTS, PART_IDS, SETUP_SLIDERS, TILES } from '../../src/game/data/parts.js';
import { TYRES } from '../../src/game/data/tyres.js';
import { HANDBOOK, LINES, MAP_PLACES, SPEAKERS, TIPS } from '../../src/game/data/text.js';
import { SONGS } from '../../src/game/data/songs.js';
import { SFX } from '../../src/game/audio/sfx.js';
import { CAR_MODELS } from '../../src/game/models/cars.js';
import { BUILDING_DEFS } from '../../src/game/models/buildings.js';
import { checkModel } from '../../src/pixel-engine.js';
import { eligible } from '../../src/game/sim/career.js';
import { fullInstall, specOf } from '../../src/game/sim/tuning.js';
const t = suite();
t.eq(CAR_IDS.length, 14, 'fourteen cars');
for (const id of CAR_IDS) {
  const i = CAR_INFO[id];
  t.ok(PHYSICS[id], `${id} has a physics row`); t.ok(MARQUES[i.marque], `${id} has a marque`); t.ok(CAR_MODELS[id], `${id} has a model`);
  t.ok(Array.isArray(i.text) && i.text.length <= 4, `${id} brochure is at most 4 lines`);
  for (const l of i.text) t.ok(l.length <= 60, `${id} brochure line too long: ${l}`);
  t.ok(i.fenn, `${id} has a line from Mr. Fenn`);
  const r = checkModel(CAR_MODELS[id].def); t.eq(r.problems.length, 0, `${id} model has problems: ${r.problems.join('; ')}`);
}
for (const [id, d] of Object.entries(BUILDING_DEFS)) t.eq(checkModel(d).problems.length, 0, `building ${id}: ${checkModel(d).problems.join('; ')}`);
t.eq(new Set(CAR_IDS.map((id) => PHYSICS[id].layout)).size, 5, 'all five layouts');
for (const s of SHOWROOMS) for (const c of s.cars) t.ok(CAR_INFO[c], `${s.id} lists a real car`);
t.ok(SHOWROOMS[0].cars.every((c) => CAR_INFO[c].price <= 15000), 'every used car is affordable from the start');
for (const id of EVENT_IDS) {
  const e = EVENTS[id];
  for (const r of e.rounds) t.ok(TRACKS[r.track], `${id} round ${r.track} resolves`);
  for (const p of e.pool) { const [c, tune] = Array.isArray(p) ? p : [p]; t.ok(CAR_INFO[c], `${id} pool ${c}`); if (tune) t.ok(AI_TUNES[tune], `${id} tune ${tune}`); }
  if (e.prizeCar) t.ok(CAR_INFO[e.prizeCar], `${id} prize car`);
  for (const l of e.needs) t.ok(LICENCES[l], `${id} needs ${l}`);
  // Winnable with a car obtainable by then: at least one buyable or prize car qualifies, stock.
  t.ok(CAR_IDS.some((c) => eligible(e, c, null).ok && (CAR_INFO[c].price > 0 || c !== e.prizeCar)), `${id} has a qualifying car`);
  t.ok(e.intro.length <= 120, `${id} intro fits`);
}
// Every car can be obtained, and every circuit is driven somewhere in the career.
{ const prizes = new Set([...Object.values(EVENTS).map((e) => e.prizeCar), ...Object.values(LICENCES).map((l) => l.allGold.car)].filter(Boolean)); for (const id of CAR_IDS) t.ok(SHOWROOMS.some((s) => s.cars.includes(id)) || prizes.has(id), `every car can be obtained: ${id}`); const used = new Set([...Object.values(EVENTS).flatMap((e) => e.rounds.map((r) => r.track)), ...Object.values(TESTS).map((x) => x.track)]); for (const k of Object.keys(TRACKS)) t.ok(used.has(k), `every circuit is driven in the career: ${k}`); }
t.ok(eligible(EVENTS.dawn, 'kite', null).ok, 'the Kite qualifies for the Dawn Patrol Cup');
t.ok(!eligible(EVENTS.fellow, 'ginga', null).ok, 'the Ginga is refused by the Front-Drive Fellowship');
t.ok(eligible(EVENTS.feather, 'moth', null).ok, 'the Moth qualifies for the Featherweight');
t.ok(!eligible(EVENTS.dawn, 'kite', fullInstall(['stage3', 'intake'])).ok, 'a tuned Kite can exceed the limit');
for (const id of TEST_IDS) {
  const T = TESTS[id]; t.ok(T.medals && T.medals.gold < T.medals.silver && T.medals.silver < T.medals.bronze, `${id} has ordered medals`);
  t.ok(CAR_INFO[T.carId], `${id} car`); t.ok(TRACKS[T.track], `${id} track`); for (const l of T.brief) t.ok(l.length <= 60, `${id} brief line too long: ${l}`); t.ok(T.brief.length <= 4, `${id} brief fits a card`); t.ok(T.tip.length <= 80, `${id} tip`);
}
for (const l of Object.values(LICENCES)) { t.eq(l.tests.length, 4, `${l.id} has four tests`); for (const x of l.tests) t.ok(TESTS[x], `${l.id} test ${x}`); }
for (const id of PART_IDS) { t.ok(TILES.some((x) => x.id === PARTS[id].cat), `${id} has a tile`); t.ok(PARTS[id].line.length <= 60, `${id} line fits`); t.ok(PARTS[id].price > 0, `${id} has a price`); }
for (const s of SETUP_SLIDERS) for (const n of s.needs) t.ok(PARTS[n], `${s.id} needs ${n}`);
for (const k of Object.keys(TYRES)) t.ok(TYRES[k].line.length <= 60, `${k} tyre line fits`);
for (const p of HANDBOOK) { for (const l of p.lines ?? []) t.ok(l.length <= 60, `handbook line too long: ${l}`); t.ok((p.lines ?? []).length <= 4, `${p.title} fits`); }
for (const l of TIPS) t.ok(l.length <= 90, `tip fits: ${l}`);
for (const m of MAP_PLACES) { t.ok(m.blurb.length <= 60, `${m.id} blurb`); }
t.eq(MAP_PLACES.length, 9, 'nine places on the map');
for (const s of Object.values(LINES)) for (const l of Object.values(s)) for (const x of [].concat(l)) t.ok(/^[A-Z0-9 .,:;!?'"()\-+/%#=<>{}]*$/.test(x), `line uses the font: ${x}`);
t.eq(Object.keys(SPEAKERS).length, 4, 'four speakers');
// Songs: every track in a pattern has the same step count; only allowed waves; at least eight pieces.
t.ok(Object.keys(SONGS).length >= 9, 'eight pieces and a fanfare');
for (const [id, s] of Object.entries(SONGS)) { for (const tk of Object.values(s.tracks)) t.ok(['square', 'triangle', 'saw', 'sine', 'noise'].includes(tk.wave), `${id} wave`); for (const [pn, p] of Object.entries(s.patterns)) { const counts = Object.entries(p).map(([k, v]) => [k, v.trim().split(/\s+/).length]), n = counts[0][1]; for (const [k, c] of counts) t.eq(c, n, `${id}/${pn}/${k} steps`); t.ok(n % 16 === 0 || id === 'fanfare', `${id}/${pn} whole bars`); for (const k of Object.keys(p)) t.ok(s.tracks[k], `${id}/${pn}/${k} has an instrument`); } for (const o of s.order) t.ok(s.patterns[o], `${id} order ${o}`); }
for (const v of Object.values(SFX)) t.ok(v.wave, 'sound has a wave');
void specOf;
t.done();
