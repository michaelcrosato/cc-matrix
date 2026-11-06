import { suite } from './lib.mjs';
import { CAR_LIST, CARS, SHOWROOMS, showroomCars, PAINTS } from '../../src/game/data/cars.js';
import { TESTS, LICENCES, TEST } from '../../src/game/data/licences.js';
import { EVENTS } from '../../src/game/data/events.js';
import { TRACKS } from '../../src/game/data/tracks.js';
import { PARTS, CATEGORIES, SETTINGS } from '../../src/game/data/parts.js';
import { TYRES } from '../../src/game/data/tyres.js';
import { HANDBOOK, TIPS, PLACES, CONTROLS_TEXT } from '../../src/game/data/text.js';
import { SONGS, SONG_FOR } from '../../src/game/data/songs.js';
import { CAR_DEF } from '../../src/game/models/cars.js';
import { parseSong, checkModel } from '../../src/pixel-engine.js';
import { specOf } from '../../src/game/sim/tuning.js';
import { carQualifies } from '../../src/game/sim/career.js';
import { CATALOG, PROP_DEFS } from '../../src/game/models/props.js';
import { GAME_CLIPS } from '../../src/game/animation/clips.js';
const t = suite();
t.ok(CAR_LIST.length === 14, '14 cars'); const layouts = new Set(CAR_LIST.map((c) => c.phys.layout)); t.ok(['FF', 'FR', 'MR', 'RR', '4WD'].every((l) => layouts.has(l)), 'all five layouts');
for (const c of CAR_LIST) { t.ok(c.brochure && c.brochure.length > 40, `brochure ${c.id}`); t.ok(CAR_DEF[c.id], `model ${c.id}`); t.ok(c.cylinders > 0 && c.exhaust.cut > 0, `sound data ${c.id}`); t.ok(PAINTS.includes(c.paint), `paint ${c.id}`); t.ok(c.phys.gears?.length >= 5, `gears ${c.id}`); }
t.ok(showroomCars('used').length === 3 && showroomCars('used').every((c) => c.price <= 15000), 'three used cars you can afford');
const stocked = new Set(SHOWROOMS.flatMap((r) => showroomCars(r.id, true).map((c) => c.id))); const prizes = new Set([...EVENTS.map((e) => e.prizeCar), ...LICENCES.map((l) => l.goldCar)]); for (const c of CAR_LIST) t.ok(stocked.has(c.id) || prizes.has(c.id), `obtainable ${c.id}`);
t.ok(TESTS.length === 12, '12 tests'); for (const x of TESTS) { t.ok(TRACKS[x.track], `track ${x.id}`); t.ok((x.runs ?? [x.carId]).every((c) => CARS[c]), `car ${x.id}`); t.ok(x.medals && x.medals.gold < x.medals.silver && x.medals.silver < x.medals.bronze, `medals ${x.id}`); t.ok(x.brief?.length > 10 && x.tip && x.lesson, `text ${x.id}`); }
for (const l of LICENCES) t.ok(l.tests.length === 4 && l.tests.every((i) => TEST[i]), `licence ${l.id}`);
t.ok(EVENTS.length === 8, '8 events'); t.ok(EVENTS.reduce((a, e) => a + e.rounds.length, 0) === 22, 'twenty-two races');
for (const e of EVENTS) { for (const r of e.rounds) t.ok(TRACKS[r.track], `round track ${e.id}`); for (const [id] of e.pool) t.ok(CARS[id], `pool ${e.id} ${id}`); t.ok(e.pace[0] < e.pace[1], `pace ${e.id}`); t.ok(e.intro?.length > 8, `intro ${e.id}`); const win = CAR_LIST.some((c) => carQualifies(e, c.id, {}).ok); t.ok(win, `restriction satisfiable ${e.id}`); }
// obtainable by then: each event's limit can be met by a car on sale or won earlier
t.ok(carQualifies(EVENTS[0], 'kite', {}).ok && carQualifies(EVENTS[1], 'kite', {}).ok, 'the first car can enter the first events');
t.ok(carQualifies(EVENTS[2], 'kite', {}).ok, 'the Kite is a featherweight'); t.ok(carQualifies(EVENTS[3], 'ginga', {}).ok, 'the Ginga is a rear-drive car');
for (const p of PARTS) { t.ok(CATEGORIES.some((c) => c.id === p.cat), `part cat ${p.id}`); t.ok(p.line && p.line.length <= 60, `part line fits ${p.id}`, `${p.line?.length}`); t.ok(p.price > 0, `price ${p.id}`); }
for (const k of TYRES) t.ok(k.line.length <= 60, `tyre line ${k.id}`); for (const c of CATEGORIES) t.ok(c.line.length <= 60, `cat line ${c.id}`); for (const s of SETTINGS) t.ok(s.line.length <= 60 && s.min < s.max, `setting ${s.id}`);
for (const pg of HANDBOOK) { t.ok(pg.lines.length <= 5, `handbook lines ${pg.title}`); for (const l of pg.lines) t.ok(l.length <= 60, `handbook fit: ${l}`, `${l.length}`); } for (const l of [...CONTROLS_TEXT.pad, ...CONTROLS_TEXT.kb]) t.ok(l.length <= 60, `controls fit ${l}`);
t.ok(TIPS.length >= 3, 'tips'); t.ok(PLACES.length === 9, 'nine buildings'); for (const pl of PLACES) t.ok(pl.blurb.length <= 60, `blurb ${pl.id}`);
t.ok(Object.keys(SONGS).length === 8, 'eight songs'); for (const [k, s] of Object.entries(SONGS)) { let parsed = null; try { parsed = parseSong(s); } catch (e) { t.ok(false, `song ${k}`, e.message); } t.ok(parsed?.notes?.length > 20, `song has notes ${k}`); for (const tr of Object.values(s.tracks)) t.ok(['square', 'triangle', 'saw', 'sine', 'noise'].includes(tr.wave), `wave ${k}`); } for (const v of Object.values(SONG_FOR)) t.ok(SONGS[v], `song for ${v}`);
for (const d of PROP_DEFS) { const r = checkModel(d, { catalog: CATALOG }); t.ok(r.problems.length === 0, `model ${d.id}`, r.problems[0]); }
t.ok(GAME_CLIPS.length >= 10, 'ten new clips'); for (const n of ['PitJack', 'PitWheelGun', 'PitFuel', 'MarshalFlag', 'ExaminerClipboard', 'DealerPresent', 'MechanicWipe', 'PodiumCheer', 'PodiumBow', 'CrowdCheer']) t.ok(GAME_CLIPS.some((c) => c.name === n), `clip ${n}`);
t.ok(specOf('kite', {}).ps === 148, 'spec'); t.ok(specOf('kite', { parts: { engine: 3 } }).ps === 200, 'stage 3 adds a third', `${specOf('kite', { parts: { engine: 3 } }).ps}`);
t.done();
