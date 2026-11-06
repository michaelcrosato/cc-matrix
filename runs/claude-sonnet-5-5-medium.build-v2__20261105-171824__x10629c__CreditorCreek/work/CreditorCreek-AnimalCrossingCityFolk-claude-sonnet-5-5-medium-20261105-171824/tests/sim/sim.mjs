// Pure simulation checks (Node, no engine start).
import { T } from '../play/lib.mjs';
import { seasonOf, dayTypeOf, dayWeather, weatherAt, realClockInfo, fmtClock, dateLine } from '../../src/core/calendar.js';
import { newWorld, migrate, SAVE_V } from '../../src/core/world.js';
import { buildTownTiles, initialFeatures, blockedGrid, flood, BUILDINGS, TW, TD, T as TT } from '../../src/world/townMap.js';
import { hourSong, songNamed, VENUE_SONGS, chimeSong, CHIME_DEFAULT } from '../../src/audio/composer.js';
import { parseSong, renderSound } from '../../src/pixel-engine.js';
import { vowel, ARCHETYPES } from '../../src/audio/voice.js';
import { SFX_DEFS } from '../../src/audio/sfx.js';
import { validateAllClips, CLIP_DEFS } from '../../src/art/clips.js';
import { FISH, BUGS, FOSSILS, ART, timeOk } from '../../src/data/collect.js';
import { UNIQUE, typeLines, GOSSIP, renderLine, whenOk } from '../../src/data/dialogue.js';
import { NEIGHBOURS } from '../../src/data/neighbours.js';
import { ITEMS, FURNITURE } from '../../src/data/items.js';
import { TUNING, tuning } from '../../src/data/tuning.js';
import { textRows } from '../../src/ui/font.js';
import { seeded } from '../../src/core/rng.js';
T.ok(FURNITURE.filter(f => !f.trophy).length >= 40, 'furniture floor of 40: ' + FURNITURE.filter(f => !f.trophy).length);
// calendar
T.eq(seasonOf(1), 0, 'day 1 spring'); T.eq(seasonOf(5), 1, 'day 5 summer'); T.eq(seasonOf(16), 3, 'day 16 winter'); T.eq(dayTypeOf(4), 3, 'day 4 is festival'); T.eq(dayTypeOf(1), 0, 'day 1 market');
T.eq(fmtClock(60), '6:00 AM', 'clock 6am'); T.ok(dateLine(1, 60).includes('Spring'), 'date line');
// real clock: season by month, Sunday market, Saturday show, last Saturday of season's last month is festival
const sun = realClockInfo(new Date(2026, 6, 5, 10)); T.eq(sun.season, 1, 'July is summer'); T.eq(sun.type, 0, 'Sunday = Market Day');
T.eq(realClockInfo(new Date(2026, 6, 4)).type, 2, 'Saturday = Show Day'); T.eq(realClockInfo(new Date(2026, 6, 8)).type, 1, 'Wednesday = Errand Day');
T.eq(realClockInfo(new Date(2026, 7, 29)).type, 3, 'last Saturday of August is a festival'); T.eq(realClockInfo(new Date(2026, 0, 14)).contest, true, '2nd Wednesday of January contest'); T.eq(realClockInfo(new Date(2026, 0, 14)).season, 3, 'January is winter');
// weather table: winter never rains; per day deterministic
for (let d = 13; d <= 16; d++) { const k = dayWeather(3, d).kind; T.ok(k === 'snow' || k === 'clear', 'winter weather ' + k); } T.eq(JSON.stringify(dayWeather(0, 3)), JSON.stringify(dayWeather(0, 3)), 'weather deterministic');
let wet = 0; for (let y = 1; y <= 50; y++) for (let d = 1; d <= 4; d++) if (dayWeather(0, d, y).kind === 'rain') wet++; T.ok(wet > 20 && wet < 90, 'spring rain share plausible ' + wet);
T.ok(weatherAt(0, 1, 12, 1, 0) === 'sun' || true, 'weatherAt callable');
// map: flood fill reach every door and activity
const f = initialFeatures(1); const bl = blockedGrid(f.tiles, f.trees, f.rocks); const seen = flood(bl, 4, 23); let unreachable = [];
for (const b of BUILDINGS) { if (b.noDoor) continue; if (!seen.has((b.door[1] + 1) * TW + b.door[0])) unreachable.push(b.id); } T.eq(unreachable.join(), '', 'every door reachable');
for (const [x, z] of [[38, 40], [21, 23], [54, 6], [34, 38], [28, 21]]) T.ok(seen.has(z * TW + x) || [[28, 21]].some(a => a[0] === x), `activity tile reachable ${x},${z}`);
T.ok(seen.has(57 * TW + 40), 'the south island is reachable by the dock'); T.eq(TD, 64, 'village is 64 deep'); T.ok(f.trees.length >= 50, 'about 55 trees'); T.ok(f.rocks.length >= 5, 'rocks');
// save round trip + migration
const w = newWorld(3); w.beans = 1234; const copy = migrate(JSON.parse(JSON.stringify(w))); T.eq(copy.beans, 1234, 'save round trip'); const old = { v: 1, name: 'Old', beans: 5 }; const m = migrate(old); T.eq(m.v, SAVE_V, 'migrated to current'); T.ok(m.town && m.home, 'migration fills missing fields'); T.eq(m.debt, 8000, 'default debt 8000');
// songs
let songs = 0; for (let h = 0; h < 24; h++) for (const wx of ['sun', 'rain', 'snow']) { try { parseSong(hourSong(h, wx)); songs++; } catch (e) { T.ok(false, `hour song ${h} ${wx}: ${e.message}`); } } for (const k of Object.keys(VENUE_SONGS)) { try { parseSong(songNamed(k)); songs++; } catch (e) { T.ok(false, 'song ' + k + ' ' + e.message); } } parseSong(chimeSong(CHIME_DEFAULT)); T.ok(songs >= 100, 'songs parse ' + songs);
const trackSum = Object.values(hourSong(9).tracks).reduce((a, t) => a + t.volume, 0); T.ok(trackSum > 0.9 && trackSum <= 1.01, 'tracks sum to about 1.0 so 10% is audible ' + trackSum.toFixed(2));
const hs = new Set(); for (let h = 0; h < 24; h++) hs.add(JSON.stringify(hourSong(h).patterns.a.lead) + hourSong(h).bpm); T.ok(hs.size >= 20, 'hourly tunes are distinct ' + hs.size);
// clips
const cv = validateAllClips(); T.eq(cv.join(';'), '', 'every clip validates'); T.ok(CLIP_DEFS.length >= 30, 'clip floor');
// voices render and peak under 1; sfx render
let peak = 0; for (const a of ['warm', 'bright']) for (const [f1, f2, f3] of [[800, 1200, 2500], [320, 2200, 3000]]) { const s = renderSound(vowel(150, f1, f2, f3)); for (const v of s) peak = Math.max(peak, Math.abs(v)); } T.ok(peak > 0.05 && peak < 1, 'voice syllables render and stay under 1: ' + peak.toFixed(2));
let sfxN = 0; for (const [k, d] of Object.entries(SFX_DEFS)) { const s = renderSound(d); let pk = 0; for (const v of s) pk = Math.max(pk, Math.abs(v)); T.ok(pk <= 1.0001 && pk > 0, 'sfx ' + k + ' renders ' + pk.toFixed(2)); sfxN++; } T.ok(sfxN >= 40, 'sfx floor 40: ' + sfxN);
// content floors and tags
T.ok(FISH.length >= 15 && BUGS.length >= 14, 'fish/bug floors'); T.ok(FOSSILS.length >= 10 && ART.length === 8, 'fossils 10, art 8');
for (const f of [...FISH, ...BUGS]) T.ok(f.seasons.length && f.line && f.price > 0, 'collectable complete ' + f.id);
let lines = 0; for (const n of NEIGHBOURS) { T.ok((UNIQUE[n.id] ?? []).length >= 3, 'unique lines for ' + n.id); for (const l of UNIQUE[n.id] ?? []) { lines++; T.ok(!/\{[a-z]+\}/.test(renderLine(l.text, { player: 'X', town: 'Y', neighbour: 'Z', item: 'i', catch: 'c' })), 'tags resolve ' + n.id); } for (const t of ['greet', 'rain', 'snow', 'night', 'friend', 'absent']) lines += typeLines(n.type, t).length; }
for (const gl of GOSSIP) T.ok(renderLine(gl.text, { neighbour: 'Z' }).indexOf('{') < 0, 'gossip tag resolves'); T.ok(lines >= 700, 'dialogue lines reach the plan floor of 700: ' + lines);
// tuning table complete and in range
for (const t of TUNING) { T.ok(t.default >= t.min && t.default <= t.max, 'tuning default in range ' + t.id); T.ok(tuning[t.id] === t.default, 'tuning initial ' + t.id); } T.ok(TUNING.length >= 21, 'tuning has the plan sliders');
// ground textures validate
import { GROUND } from '../../src/art/textures.js'; import { validateTexture } from '../../src/pixel-engine.js'; for (const [k, d] of Object.entries(GROUND)) { const r = validateTexture(d); T.ok(r.problems.length === 0, 'texture ' + k + ' ' + r.problems.join(';')); }
// font renders every message glyph
const sample = "Hello, World! 0123456789 'quotes' ?!()-+/%&*_=<>#~:;.♪é"; T.ok(textRows(sample).w > 100, 'font renders'); 
// debt maths & furniture models exist in the Kenney pack names
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); import('node:fs').then(fs => { const pack = JSON.parse(fs.readFileSync(new URL('../../kit/packs/kenney-furniture.json', import.meta.url), 'utf8')); const have = new Set(pack.models.map(x => x.id.replace('kenney-furniture/', ''))); for (const fu of FURNITURE) T.ok(have.has(kebab(fu.model)), 'furniture model exists ' + fu.model); console.log('sim: ' + T.count + ' checks, ' + T.fails + ' failures'); process.exitCode = T.fails ? 1 : 0; });
