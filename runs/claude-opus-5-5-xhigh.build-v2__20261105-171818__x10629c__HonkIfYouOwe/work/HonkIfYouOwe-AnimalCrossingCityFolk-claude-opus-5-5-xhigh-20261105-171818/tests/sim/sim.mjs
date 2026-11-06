// Pure rules, in Node, under 10 s. Calendar, weather, drops, cheese, flowers, debt, saves, map, lines, songs, clips, voices.
import { villageDay, realDay, calendar, formatTime, FESTIVALS, CONTESTS } from '../../src/core/calendar.js';
import { weatherPlan, weatherAt, WEATHER_TABLE } from '../../src/core/weather.js';
import { FISH, fishNow, OLD_BOOT } from '../../src/data/fish.js';
import { BUGS, bugsNow } from '../../src/data/bugs.js';
import { FOSSILS } from '../../src/data/fossils.js';
import { ART } from '../../src/data/art.js';
import { ITEMS } from '../../src/data/items.js';
import { FURNITURE } from '../../src/data/furniture.js';
import { CLOTHES, HAT_ITEMS, GLASSES_ITEMS, UMBRELLAS } from '../../src/data/clothes.js';
import { cheeseCurve, CHEESE_PATTERNS, cheeseState } from '../../src/systems/cheese.js';
import { newWorld, migrate, saveWorld, loadWorld, SAVE_VERSION } from '../../src/core/save.js';
import { Stream } from '../../src/core/rng.js';
import { COLS, ROWS, tileChar, tileInfo, groundHeight, walkableTile } from '../../src/world/tiles.js';
import { BUILDINGS, LANDMARKS, LAMPS } from '../../src/data/town.js';
import { allLineTexts, resolveTags, KNOWN_TAGS, lineObjects } from '../../src/systems/lines.js';
import { allSongs, MOTIFS, TUNES, hourSong } from '../../src/audio/composer.js';
import { parseSong, validateClip, renderSound, checkModel, validateTexture } from '../../src/engine.js';
import { CLIPS } from '../../src/actors/clips.js';
import { voiceDefs, ARCHETYPES } from '../../src/audio/voice.js';
import { SFX_DEFS, LOOP_DEFS, SFX_COUNT } from '../../src/audio/sfx.js';
import { TUNING, tuning, setTuning, resetTuning } from '../../src/dev/tuning.js';
import { rateSoup, contestScores, snowmanPoints } from '../../src/systems/festivals/festivals.js';
import { HOME_TIERS } from '../../src/systems/economy.js';
import { fashionScore, FASHION_THEMES } from '../../src/systems/venues.js';
import { GRADES, gradeOf, scoreHome } from '../../src/systems/rating.js';
import { townScore } from '../../src/systems/townRating.js';
import { TYPE_LINES } from '../../src/data/dialogue/types.js';
import { UNIQUE, GOSSIP } from '../../src/data/dialogue/unique.js';
import { HOSTS, BALLAD } from '../../src/data/dialogue/hosts.js';
import { FAVOURS, NEIGHBOURS, POIS } from '../../src/data/neighbours.js';
import { ROOMS } from '../../src/data/rooms.js';
import { CITY_ROWS, CITY_DOORS } from '../../src/data/cityMap.js';
import { ALL_TEXTURES } from '../../src/art/textures.js';
import { PAINTINGS } from '../../src/art/paintings.js';
import { ICONS } from '../../src/art/icons.js';
import { GLYPHS } from '../../src/ui/font.js';
import { RIG } from '../../src/actors/rig.js';
import { CRITTERS, CROWD_SPECIES } from '../../src/art/critter.js';
import { TOWN_ROWS } from '../../src/data/townMap.js';
import { auctionLots, consignResult } from '../../src/ui/screens/auction.js';
import { SKETCHES } from '../../src/ui/screens/theatre.js';
import { fishLength } from '../../src/systems/festivals/festivals.js';

const fails = [];
let n = 0;
const ok = (c, m) => { n++; if (!c) fails.push(m); };
export function runSim() {
  // Calendar
  const d = [];
  for (let i = 1; i <= 16; i++) d.push(villageDay(i));
  ok(d[0].season === 0 && d[0].market && d[0].type === 0, 'day 1 spring market');
  ok(d[3].festival === 'seedToss', 'day 4 seed toss');
  ok(d[7].festival === 'lanternFloat', 'day 8 lantern');
  ok(d[11].festival === 'greatSoup', 'day 12 soup');
  ok(d[15].festival === 'longNight', 'day 16 long night');
  ok(d[5].contest === 'derby' && d[9].contest === 'bugOff' && d[13].contest === 'snowman', 'contests on the right days');
  ok(d[2].show && d[6].show && d[10].show && d[14].show, 'show nights');
  ok(villageDay(17).calendarDay === 1 && villageDay(17).season === 0, 'year rolls over');
  ok(formatTime(9 * 60 + 42) === '9:42 AM' && formatTime(0) === '12:00 AM' && formatTime(13 * 60) === '1:00 PM', 'time format');
  // Real Clock mapping (new day at 05:00)
  const at = (y, m, dd, h = 12) => new Date(y, m, dd, h).getTime();
  ok(realDay(at(2026, 2, 15)).season === 0 && realDay(at(2026, 4, 31)).season === 0, 'Mar-May spring');
  ok(realDay(at(2026, 5, 1)).season === 1 && realDay(at(2026, 7, 31)).season === 1, 'Jun-Aug summer');
  ok(realDay(at(2026, 8, 1)).season === 2 && realDay(at(2026, 10, 30)).season === 2, 'Sep-Nov autumn');
  ok(realDay(at(2026, 11, 1)).season === 3 && realDay(at(2026, 1, 1)).season === 3, 'Dec-Feb winter');
  const sun = new Date(2026, 2, 1); while (sun.getDay() !== 0) sun.setDate(sun.getDate() + 1);
  ok(realDay(sun.getTime() + 12 * 3600e3).market, 'Sunday is Market Day');
  const sat = new Date(2026, 2, 1); while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
  ok(realDay(sat.getTime() + 12 * 3600e3).show, 'Saturday is Show Day');
  ok(realDay(at(2026, 6, 8)).contest === 'derby', 'second Wed of July is the Derby');
  ok(realDay(at(2026, 6, 25)).festival === 'lanternFloat', 'last Sat of July is the Lantern Float');
  ok(realDay(at(2027, 0, 30)).festival === 'longNight', 'last Sat of January is the Long Night');
  const beforeFive = realDay(new Date(2026, 6, 26, 3).getTime());
  ok(beforeFive.festival === 'lanternFloat', 'new day at 05:00: 3am Sunday still Saturday');
  const rw = newWorld(1, { mode: 'real' }); rw.clock.realMs = at(2026, 6, 8);
  ok(calendar(rw).season === 1, 'Real Clock world reads the date');
  // Weather table
  for (let s = 0; s < 4; s++) {
    const counts = {};
    for (let i = 0; i < 2000; i++) { const p = weatherPlan(7, i, s); counts[p.kind] = (counts[p.kind] ?? 0) + 1; }
    for (const [kind, w] of WEATHER_TABLE[s]) ok(Math.abs(counts[kind] / 2000 - w / 100) < 0.05, `weather ${s} ${kind}: ${counts[kind]}`);
  }
  const pl = weatherPlan(3, 5, 0, 0);
  ok(pl.kind !== 'rain', 'rain slider at 0 stops rain');
  const wp = { kind: 'rain', start: 10, stop: 14, calm: 'sun' };
  ok(weatherAt(wp, 9) === 'sun' && weatherAt(wp, 11) === 'rain' && weatherAt(wp, 15) === 'sun', 'weather hours');
  // Content counts: floor → target
  ok(FISH.length + 1 >= 14, 'fish floor'); ok(BUGS.length >= 14, 'bug floor'); ok(FOSSILS.length === 10, 'ten fossils'); ok(ART.length === 8, 'eight paintings');
  ok(FURNITURE.length >= 40, 'furniture floor'); ok(CLOTHES.length >= 20, 'clothes floor'); ok(HAT_ITEMS.length >= 8, 'hats floor'); ok(GLASSES_ITEMS.length >= 3, 'glasses floor'); ok(UMBRELLAS.length >= 3, 'umbrella floor');
  ok(Object.keys(CRITTERS).length >= 26 && CROWD_SPECIES.length >= 6, 'cast');
  ok(SFX_COUNT >= 40, 'effects floor'); ok(MOTIFS.length >= 8, 'motif floor'); ok(CLIPS.length >= 30, 'clip floor');
  ok(FAVOURS.length >= 12, 'favour floor'); ok(Object.keys(BALLAD).length >= 20, 'ballad floor');
  ok(Object.keys(ICONS).length >= 45, 'icons'); ok(SKETCHES.length >= 3, 'sketches'); ok(FASHION_THEMES.length >= 5, 'themes');
  for (const f of [...FISH, OLD_BOOT]) ok(ITEMS[f.id]?.cat === 'fish' && f.line, `fish ${f.id} in the item table`);
  for (const b of BUGS) ok(ITEMS[b.id]?.cat === 'bug' && b.line, `bug ${b.id} in the item table`);
  for (const a of ART) { ok(ITEMS[a.id] && ITEMS[`${a.id}F`], `art ${a.id} and its forgery`); ok(PAINTINGS.some((p) => p.id === `art-${a.id}`) && PAINTINGS.some((p) => p.id === `art-${a.id}F`), `painting ${a.id}`); }
  // Drop tables: every fish and bug catchable sometime
  for (const f of FISH) { let found = false; for (const s of f.seasons) for (let h = 0; h < 24; h++) if (fishNow(f.where, s, h).includes(f)) found = true; ok(found, `${f.id} can be caught`); }
  for (const b of BUGS) { let found = false; for (const s of b.seasons) for (let h = 0; h < 24; h++) for (const rain of [true, false]) if (bugsNow(s, h, rain).includes(b)) found = true; ok(found, `${b.id} can be caught`); }
  ok(!bugsNow(0, 12, false).some((b) => b.id === 'snail') && bugsNow(0, 12, true).some((b) => b.id === 'snail'), 'snails only in rain');
  ok(fishNow('sea', 0, 12).length > 0 && fishNow('river', 3, 12).length > 0 && fishNow('pond', 3, 12).length > 0, 'water never empty');
  // Cheese patterns
  for (const pat of CHEESE_PATTERNS) {
    const p = []; for (let t = 0; t < 6; t++) p.push(cheeseCurve(pat, 100, t, new Stream(`c${t}`)));
    if (pat === 'Rising') ok(p[5] > p[0] && p[0] > 100, 'rising rises');
    if (pat === 'Falling') ok(p[5] < p[0] && p[0] < 110, 'falling falls');
    if (pat === 'Spike') ok(Math.max(...p) >= 300 && Math.max(...p) <= 620, `spike peak 3-6x: ${Math.max(...p)}`);
    if (pat === 'Wobble') ok(Math.max(...p) > 100 && Math.min(...p) < 100, 'wobble wobbles');
  }
  const cw = newWorld(5);
  const st = cheeseState(cw, 0, 1);
  ok(st.base >= 90 && st.base <= 110, 'Rind sells 90-110');
  // Debt math
  ok(HOME_TIERS.map((t) => t.debt).join() === '8000,30000,80000,150000', 'debt tiers');
  ok(newWorld(1).player.debt === 8000, 'start owing 8,000');
  // Soup
  ok(rateSoup(['mushroom', 'perch', 'pear']).good, 'a good soup');
  ok(!rateSoup(['oldBoot', 'cheeseOff', 'moth']).good, 'a bad soup');
  // Contests are neighbours' real scores from the same rules
  const cs = contestScores(9, 'derby', 6);
  ok(Object.values(cs).every((v) => v > 0), 'derby scores');
  ok(snowmanPoints(0.72, 1.1) === 100, 'best proportions');
  ok(snowmanPoints(0.3, 0.5) < 40, 'poor proportions');
  ok(fishLength(FISH[0], new Stream('l')) > 0, 'fish have lengths');
  // Fashion
  ok(fashionScore({ outfit: 'oilskin', hatItem: 'sou' }, { tags: ['damp', 'nautical'] }).score >= 3, 'damp outfit scores');
  ok(fashionScore({ outfit: 'tatteredShirt' }, { tags: ['damp', 'nautical'] }).score === 0, 'wrong outfit fails');
  // Bureau
  ok(gradeOf(0).g === 'C' && gradeOf(45).g === 'B' && gradeOf(95).g === 'A' && gradeOf(200).g === 'S', 'grades');
  const hw = newWorld(2);
  hw.home.rooms.main.items = [{ id: 'cottageLamp', x: 1, z: 1, rot: 0 }, { id: 'cottageChair', x: 2, z: 1, rot: 0 }, { id: 'cottageRug', x: 3, z: 3, rot: 0 }, { id: 'cottageTable', x: 3, z: 3, rot: 0 }, { id: 'pottedPlant', x: 5, z: 1, rot: 0 }];
  const hs = scoreHome(hw);
  ok(hs.notes.includes('lamp') && hs.notes.includes('rug') && hs.notes.includes('plant'), `cozy rules: ${hs.notes}`);
  ok(GRADES.every((x) => ITEMS[x.reward]), 'grade rewards exist');
  // Town rating
  const trw = newWorld(3);
  ok(townScore(trw).trees >= 40 && townScore(trw).trees <= 70, `starts with a good tree count: ${townScore(trw).trees}`);
  const objs = Object.values(trw.town.objects);
  ok(objs.filter((o) => o.k === 'rock').length >= 4, `rocks: ${objs.filter((o) => o.k === 'rock').length}`);
  // Auction and consignment are deterministic
  const lots = auctionLots(trw);
  ok(lots.length === 3 && lots.every((l) => l.limits.length === 3), 'three lots, three bidders');
  ok(consignResult(trw, 'perch', 150).price > 0, 'consignment pays');
  // Save round trip and migration
  const w = newWorld(11);
  w.player.beans = 1234; w.player.pockets[3] = { id: 'pear' };
  saveWorld(w, 'test:save');
  const back = loadWorld('test:save');
  ok(back.player.beans === 1234 && back.player.pockets[3].id === 'pear', 'save round trip');
  ok(JSON.stringify(back) === JSON.stringify(w), 'world is plain JSON');
  const old = JSON.parse(JSON.stringify(w)); old.v = 1; delete old.pimm; delete old.almanac.starNames;
  const mig = migrate(old);
  ok(mig.v === SAVE_VERSION && mig.pimm && mig.almanac.starNames, 'migration runs');
  // Map: rows, flood fill, every door, stop and activity reachable
  ok(TOWN_ROWS.length === ROWS && TOWN_ROWS.every((r) => r.length === COLS), 'map is 80x64');
  ok(CITY_ROWS.length === 24 && CITY_ROWS.every((r) => r.length === 40), 'City is 40x24');
  const solid = new Uint8Array(COLS * ROWS);
  for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) solid[z * COLS + x] = walkableTile(x + 0.5, z + 0.5) ? 0 : 1;
  for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) solid[z * COLS + x] = 1;
  const seen = new Set();
  const start = [Math.floor(LANDMARKS.busStop[0]), Math.floor(LANDMARKS.busStop[1])];
  const q = [start];
  seen.add(`${start[0]},${start[1]}`);
  while (q.length) {
    const [x, z] = q.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= COLS || nz >= ROWS || solid[nz * COLS + nx]) continue;
      if (Math.abs(groundHeight(nx + 0.5, nz + 0.5) - groundHeight(x + 0.5, z + 0.5)) > 0.8) continue;
      const k = `${nx},${nz}`;
      if (!seen.has(k)) { seen.add(k); q.push([nx, nz]); }
    }
  }
  for (const b of BUILDINGS) ok(seen.has(`${Math.floor(b.door[0])},${Math.floor(b.door[1])}`), `door of ${b.id} reachable`);
  for (const name of ['busStop', 'stallSpot', 'bridgeN', 'bridgeS']) { const [x, z] = LANDMARKS[name]; ok(seen.has(`${Math.floor(x)},${Math.floor(z)}`), `${name} reachable`); }
  for (const p of POIS) ok(seen.has(`${Math.floor(p.x)},${Math.floor(p.z)}`), `POI ${p.id} reachable`);
  ok(seen.has('72,8'), 'Lookout reachable');
  ok(seen.has('24,60'), 'Dock reachable');
  ok(seen.has('66,52'), 'Palm grove reachable');
  ok(seen.has('8,50'), 'Tide pools reachable');
  ok(seen.has('22,8') || seen.has('23,11'), 'Museum terrace reachable');
  for (const d of CITY_DOORS) ok(CITY_ROWS[Math.floor(d.tz)][Math.floor(d.tx)] !== '#', `City door ${d.id} on open ground`);
  for (const [id, r] of Object.entries(ROOMS)) { ok(r.exit, `room ${id} has a way out`); for (const p of r.props ?? []) ok(p.m, `prop in ${id}`); }
  // Lines: tags resolve; volumes
  const lines = allLineTexts();
  ok(lines.length >= 700, `line floor: ${lines.length}`);
  for (const t of lines) { for (const m of String(t).matchAll(/\{(\w+)\}/g)) ok(KNOWN_TAGS.has(m[1]), `unknown tag ${m[1]} in: ${t}`); ok(!resolveTags(String(t), { world: newWorld(1) }).match(/\{(player|town|debt|season)\}/), `tag unresolved: ${t}`); }
  for (const [type, banks] of Object.entries(TYPE_LINES)) { let c = 0; for (const l of Object.values(banks)) c += l.length; ok(c >= 40, `type ${type} has ${c} lines`); }
  for (const [id, l] of Object.entries(UNIQUE)) ok(l.length >= 12, `unique lines for ${id}: ${l.length}`);
  ok(GOSSIP.length >= 30, 'gossip floor');
  ok(HOSTS.gander.greet.length + HOSTS.gander.idle.length + HOSTS.gander.sell.length + HOSTS.gander.sold.length + HOSTS.gander.buy.length + HOSTS.gander.pay.length >= 25, 'Mrs. Gander speaks');
  for (const id of ['clementine', 'trundle', 'quill', 'mothwick', 'rind', 'vesper', 'hester', 'fleece', 'flavia', 'magda', 'bellows', 'pemberton', 'brisket', 'lou', 'nibbles', 'pimm']) { let c = 0; for (const v of Object.values(HOSTS[id])) c += Array.isArray(v) ? v.length : 1; ok(c >= 8, `host ${id}: ${c} lines`); }
  ok(lineObjects().every((l) => l.when && l.id && l.weight), 'lines are data');
  ok(!lines.join(' ').match(/\b(Nook|Resetti|Gyroid|Tom Nook|K\.K\.|Blathers|Isabelle|turnip)\b/i), 'no names from the series');
  // Songs parse; 24 hours each with variants
  const songs = allSongs();
  for (const [k, s] of Object.entries(songs)) { try { parseSong(s); ok(true, ''); } catch (e) { ok(false, `song ${k}: ${e.message}`); } }
  for (let h = 0; h < 24; h++) ok(hourSong(h) !== hourSong(h, 'rain') && hourSong(h) !== hourSong(h, 'snow'), `hour ${h} variants`);
  const distinct = new Set(); for (let h = 0; h < 24; h++) distinct.add(JSON.stringify(hourSong(h))); ok(distinct.size === 24, 'a different tune every hour');
  ok(Object.keys(TUNES).length >= 22, 'venues, festivals, records');
  // Hot mix: tracks sum to about 1.0
  const vol = (s) => Object.values(s.tracks).reduce((a, t) => a + (t.volume ?? 0.5), 0);
  for (const [k, s] of Object.entries(songs)) ok(vol(s) > 0.7 && vol(s) < 1.35, `${k} mix ${vol(s).toFixed(2)}`);
  // Clips validate
  for (const c of CLIPS) for (const p of validateClip(c, RIG)) ok(false, `clip ${c.name}: ${p}`);
  // Voices: render and peak under 1
  const defs = voiceDefs();
  for (const [name, def] of Object.entries(defs)) { const data = renderSound(def, 22050); let peak = 0; for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i])); ok(peak > 0.02 && peak <= 1, `voice ${name} peak ${peak}`); }
  ok(Object.keys(ARCHETYPES).length === 6, 'six voice archetypes');
  for (const [name, def] of Object.entries({ ...SFX_DEFS, ...LOOP_DEFS })) { const data = renderSound(def, 22050); ok(data.length > 0, `sound ${name}`); }
  // Tuning: sliders have defaults and clamp
  for (const t of TUNING) { ok(t.default >= t.min && t.default <= t.max, `tuning ${t.id}`); }
  setTuning('walkSpeed', 99); ok(tuning.walkSpeed === 6, 'slider clamps'); resetTuning(); ok(tuning.walkSpeed === 2.6, 'reset all');
  ok(TUNING.length >= 22, 'balance sliders');
  // Font covers everything the game says
  const chars = new Set(lines.join('').replace(/\{\w+\}/g, '').replace(/[*|~\n]/g, ''));
  const missing = [...chars].filter((c) => c !== ' ' && !GLYPHS[c]);
  ok(missing.length === 0, `font missing: ${missing.join('')}`);
  // Textures and tiles
  for (const t of [...ALL_TEXTURES, ...PAINTINGS]) ok(validateTexture(t).problems.length === 0, `texture ${t.id}: ${validateTexture(t).problems[0]}`);
  ok(tileInfo(tileChar(24, 40)).walk && !tileInfo(tileChar(40, 20)).walk, 'tile rules');
  ok(groundHeight(5, 5) === 2 && groundHeight(5, 20) === 0 && groundHeight(23, 14) > 0 && groundHeight(23, 14) < 2, 'terrace, ground and ramps');
  ok(LAMPS.length >= 6, 'lamps');
  ok(NEIGHBOURS.fitch.movesIn === 9, 'Fitch on day 9');
  ok(FESTIVALS.length === 4 && CONTESTS.filter(Boolean).length === 3, 'four festivals, three contests');
  return { n, fails };
}
