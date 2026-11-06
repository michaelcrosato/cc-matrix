// The village's pulse: what changes overnight, on the hour, and while you were away.
import { COLS, ROWS, tileChar, tileInfo, walkableTile, key } from '../world/tiles.js';
import { dayStream, Stream } from '../core/rng.js';
import { tuning } from '../dev/tuning.js';
import { ITEMS, FLOWER_COLORS } from '../data/items.js';
import { saveWorld, SESSION_KEY } from '../core/save.js';
import { store } from '../core/storage.js';
import { sendMail, deliverMail, neighbourLetters, seasonalGranLetter } from './mail.js';
import { dailyFavours } from './favours.js';
import { calendar } from '../core/calendar.js';
import { villageDay } from '../core/calendar.js';
import { rebuildAllObjects } from '../world/objectsView.js';
import { storyMorning } from './story.js';
import { BUILDINGS, LANDMARKS } from '../data/town.js';
import { cheeseDayReset } from './cheese.js';
import { rollHomeRating } from './rating.js';
import { playChime } from './bell.js';
import { saveNow } from './session.js';
import { remember } from './memory.js';

const empty = (w, x, z) => !w.town.objects[`${x},${z}`];
function occupied(g, x, z) {
  const t = g.town;
  return t.solid[z * COLS + x] === 1;
}
function randomSpot(g, rng, surfaces, tries = 60, region = null) {
  const w = g.world;
  for (let i = 0; i < tries; i++) {
    const x = region ? rng.int(region[0], region[2]) : rng.int(2, COLS - 3);
    const z = region ? rng.int(region[1], region[3]) : rng.int(2, ROWS - 3);
    const c = tileChar(x, z);
    const info = tileInfo(c);
    if (!info.walk || !surfaces.includes(info.surface)) continue;
    if (!empty(w, x, z) || occupied(g, x, z)) continue;
    return [x, z];
  }
  return null;
}
/** The overnight step: runs at 05:00 of the new day, or under the bed's almanac page. */
export function newDay(g) {
  const w = g.world;
  w.clock.day += 1;
  w.clock.daysPlayed += 1;
  w.stats.days += 1;
  if (villageDay(w.clock.day).calendarDay === 1) w.clock.year += w.clock.day > 1 ? 1 : 0;
  const c = calendar(w, g.realNow);
  w.mail.sentToday = 0;
  g.weatherKey = null;
  dailyRespawn(g, c);
  growNight(g, c);
  dailyFavours(g);
  cheeseDayReset(g, c);
  storyMorning(g, c);
  seasonalGranLetter(g, c);
  neighbourLetters(g, c);
  if (w.player.luck) w.player.luck = null;
  if (w.player.puffy && (w.flags.stungDay ?? 0) < w.clock.day) w.player.puffy = false;
  if (c.show === true) rollHomeRating(g);
  if (c.season !== g.season) {
    g.seasonChanging = true;
    const interest = Math.floor(w.player.jar * 0.005);
    if (interest > 0) { w.player.jar += interest; sendMail(g, { from: 'clementine', body: `Dear {player},\nYour Bean Jar earned ${interest} beans of interest. We are very interested.\nClementine`, arriveDay: w.clock.day }); }
    g.events.emit('jarInterest', { interest });
  }
  if (Object.values(w.town.objects).filter((o) => o.k === 'weed').length > 15 && !w.story.day1Active) remember(g, 'noWeeds', {});
  g.life.resetDay();
  g.festivals.resetDay();
  g.npcs.scatter();
  g.events.emit('day', { day: w.clock.day });
}
/** Weeds, cracks, shells, wasps and the rest. Deterministic per day. */
export function dailyRespawn(g, c = calendar(g.world, g.realNow)) {
  const w = g.world;
  const o = w.town.objects;
  const rng = dayStream(w, 'respawn');
  // weeds
  const weeds = Object.values(o).filter((x) => x.k === 'weed').length;
  for (let i = 0; i < tuning.weedsPerDay && weeds + i < 40; i++) { const s = randomSpot(g, rng, ['lawn']); if (s) { o[`${s[0]},${s[1]}`] = { k: 'weed' }; g.town.dirty.add(`${s[0]},${s[1]}`); } }
  // clean yesterday's dig spots and shells
  for (const [k, v] of Object.entries(o)) {
    if (v.k === 'crack' || v.k === 'sparkle' || v.k === 'shell') { delete o[k]; g.town.dirty.add(k); }
    if (v.k === 'hole' && !v.buried && (rng.chance(0.6))) { delete o[k]; g.town.dirty.add(k); }
    if (v.k === 'tree') { v.wasp = false; v.hasBag = false; v.hasFurniture = false; }
  }
  // three star cracks a day hide fossils; a sparkle spot hides a bag
  for (let i = 0; i < 3; i++) { const s = randomSpot(g, rng, ['lawn', 'sand']); if (s) { o[`${s[0]},${s[1]}`] = { k: 'crack', item: 'unknownFossil' }; g.town.dirty.add(`${s[0]},${s[1]}`); } }
  const sp = randomSpot(g, rng, ['lawn', 'sand']);
  if (sp) { o[`${sp[0]},${sp[1]}`] = { k: 'sparkle', item: 'bagOfBeans' }; g.town.dirty.add(`${sp[0]},${sp[1]}`); }
  // six shells
  const shells = ['shellCommon', 'shellCommon', 'shellScallop', 'shellSand', 'shellCowrie', 'shellConch'];
  for (let i = 0; i < 6; i++) { const s = randomSpot(g, rng, ['sand'], 60, [2, 49, 77, 57]); if (s) { o[`${s[0]},${s[1]}`] = { k: 'shell', item: shells[i] }; g.town.dirty.add(`${s[0]},${s[1]}`); } }
  // driftwood oddity
  const dw = randomSpot(g, rng, ['sand'], 60, [2, 49, 77, 57]);
  if (dw) { o[`${dw[0]},${dw[1]}`] = { k: 'driftwood', item: rng.pick(['driftLog', 'driftBottle', 'driftSpoon']) }; g.town.dirty.add(`${dw[0]},${dw[1]}`); }
  // trees: one with a bag or furniture, one with a wasp nest; fruit regrows
  const trees = Object.entries(o).filter(([, v]) => v.k === 'tree' && v.stage >= 3);
  if (trees.length) {
    const t1 = rng.pick(trees)[1]; if (rng.chance(0.5)) t1.hasBag = true; else t1.hasFurniture = true;
    const t2 = rng.pick(trees)[1]; if (t2 !== t1 && c.season !== 3) t2.wasp = true;
  }
  // mushrooms in autumn woods
  if (c.season === 2) for (let i = 0; i < 4; i++) { const s = randomSpot(g, rng, ['lawn'], 60, i < 2 ? [3, 3, 15, 13] : [64, 17, 77, 33]); if (s) { o[`${s[0]},${s[1]}`] = { k: 'drop', item: 'mushroom' }; g.town.dirty.add(`${s[0]},${s[1]}`); } }
  // one rock a day pays out
  const rocks = Object.entries(o).filter(([, v]) => v.k === 'rock');
  for (const [, r] of rocks) { r.pays = false; r.hits = 0; }
  if (rocks.length) rng.pick(rocks)[1].pays = true;
}
function growNight(g, c) {
  const w = g.world;
  const o = w.town.objects;
  const rng = dayStream(w, 'grow');
  const today = w.clock.day;
  const entries = Object.entries(o);
  for (const [k, v] of entries) {
    if (v.k === 'tree') {
      if (v.kind !== 'pine' && (v.fruit ?? 0) === 0 && (v.regrow ?? 0) <= today) { v.fruit = 3; g.town.dirty.add(k); }
    } else if (v.k === 'sapling') {
      v.stage = (v.stage ?? 0) + 1;
      g.town.dirty.add(k);
      if (v.stage >= 3) { o[k] = { k: 'tree', kind: v.kind ?? 'pear', fruit: v.fruitItem ? 3 : 0, fruitItem: v.fruitItem, regrow: 0, stage: 3, hits: 0 }; g.events.emit('saplingGrown', { k }); }
    } else if (v.k === 'beanstalk') {
      v.stage = (v.stage ?? 0) + 1;
      g.town.dirty.add(k);
    } else if (v.k === 'flower') {
      if (v.wet !== today - 1 && !rainedYesterday(g)) { v.wilt = (v.wilt ?? 0) + 1; if (v.wilt >= 2) g.town.dirty.add(k); }
      else { v.wilt = 0; g.town.dirty.add(k); }
    }
  }
  // Hybrids: beside touching same-species pairs that were watered
  for (const [k, v] of entries) {
    if (v.k !== 'flower' || v.wet !== today - 1) continue;
    const [x, z] = k.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const nk = `${x + dx},${z + dz}`;
      const n = o[nk];
      if (!n || n.k !== 'flower' || n.species !== v.species || n.wet !== today - 1) continue;
      if (!rng.chance(tuning.hybridChance)) continue;
      const spots = [[x + dx * 2, z + dz * 2], [x - dx, z - dz], [x + dz, z + dx], [x - dz, z - dx]];
      for (const [sx, sz] of spots) {
        if (!o[`${sx},${sz}`] && walkableTile(sx, sz) && !occupied(g, sx, sz)) {
          const color = v.color === n.color ? (v.color + 2) % FLOWER_COLORS.length : (v.color + n.color) % FLOWER_COLORS.length;
          o[`${sx},${sz}`] = { k: 'flower', species: v.species, color, wet: 0, wilt: 0, hybrid: true };
          g.town.dirty.add(`${sx},${sz}`);
          w.almanac.flowers[`${v.species}:${color}`] = true;
          w.stats.hybrids = (w.stats.hybrids ?? 0) + 1;
          g.events.emit('hybrid', { species: v.species, color });
          break;
        }
      }
    }
  }
  // Worn paths heal
  for (const k of Object.keys(w.town.wear)) {
    w.town.wear[k] -= 8;
    if (w.town.wear[k] <= 0) {
      delete w.town.wear[k];
      if (w.town.worn[k]) { delete w.town.worn[k]; const [x, z] = k.split(',').map(Number); g.town.terrain.rebuildTile(x, z); }
    }
  }
}
const rainedYesterday = (g) => g.world.flags.rainedDay === g.world.clock.day - 1;

/** Called when the hour changes: the bell, the mail, the tune. */
export function onHourChange(g, hour) {
  const w = g.world;
  g.life.placeSpecials();
  if (hour % 3 === 0 && g.place === g.town) g.life.spawnBugs();
  if (g.mode === 'play') {
    if (hour === 9) { const n = deliverMail(g); if (n) { g.sound('mailFlag'); } }
    if (!g.demo) g.autosave();
    if (g.place === g.town || g.place === g.city) playChime(g);
    g.events.emit('hour', { hour });
    g.festivals.onHour?.(hour);
    if (g.world.flags.rainedDay !== w.clock.day) { const k = g.sky?.kind; if (k === 'rain' || k === 'storm') w.flags.rainedDay = w.clock.day; }
  }
}
/** After a real day or more away: weeds, dust, mail and comments. Nothing is lost. */
export function handleAbsence(g, nowMs) {
  const w = g.world;
  const last = w.meta.lastSeenMs;
  w.meta.lastSeenMs = nowMs;
  if (!last || !nowMs) return 0;
  const days = Math.floor((nowMs - last) / 86400000);
  if (days < 1) return 0;
  const rng = new Stream(`${w.seed}:absence:${last}`);
  const o = w.town.objects;
  const weedsNow = Object.values(o).filter((x) => x.k === 'weed').length;
  const add = Math.min(40 - weedsNow, days * 3);
  for (let i = 0; i < add; i++) { const s = randomSpot(g, rng, ['lawn']); if (s) { o[`${s[0]},${s[1]}`] = { k: 'weed' }; g.town.dirty.add(`${s[0]},${s[1]}`); } }
  // Flowers wilt but don't die
  for (const [k, v] of Object.entries(o)) if (v.k === 'flower') { v.wilt = Math.max(v.wilt ?? 0, 2); g.town.dirty.add(k); }
  // Dust bunnies at home
  const dustCount = Math.min(8, w.home.dust.length + Math.min(8, days * rng.int(1, 3)));
  while (w.home.dust.length < dustCount) w.home.dust.push({ x: rng.range(1, 5), z: rng.range(1, 5) });
  // Mail piles up
  for (let i = 0; i < Math.min(3, days); i++) sendMail(g, { from: 'clementine', body: `Dear {player},\nWhile you were out, your post piled up. The bee has been sitting on it. It's warm.\nClementine`, arriveDay: w.clock.day });
  deliverMail(g, true);
  for (const id of Object.keys(w.npcs)) w.npcs[id].absentNote = true;
  w.flags.absentDays = days;
  g.events.emit('absence', { days });
  return days;
}
/** Mark a clean or unclean exit. Inspector Pimm cares. */
export function recordExit(g, clean) {
  store.set(SESSION_KEY, { open: !clean, ms: g.realNow ?? 0 });
}
export { rebuildAllObjects, sendMail, saveWorld, ITEMS, BUILDINGS, LANDMARKS, key, saveNow };
