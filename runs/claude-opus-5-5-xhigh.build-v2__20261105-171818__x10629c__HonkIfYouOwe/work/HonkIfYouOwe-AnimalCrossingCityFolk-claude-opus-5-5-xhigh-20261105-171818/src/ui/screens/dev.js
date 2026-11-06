// Dev mode: paged, pad-playable, still big type. Time, World, Player, Neighbours, Events, Collections, Debug, Save, Balance.
import { Menu } from '../ui.js';
import { YEAR_EVENTS } from '../../data/year.js';
import { lookEditor } from './lookEditor.js';
import { Actor } from '../../actors/rig.js';
import { CRITTER_DEFS } from '../../art/critter.js';
import { TUNING, tuning, setTuning, resetTuning } from '../../dev/tuning.js';
import { advanceTo } from './bed.js';
import { calendar, FESTIVALS, CONTESTS, villageDay } from '../../core/calendar.js';
import { BUILDINGS, LANDMARKS } from '../../data/town.js';
import { NEIGHBOUR_ORDER, NEIGHBOURS } from '../../data/neighbours.js';
import { ITEMS } from '../../data/items.js';
import { addItem, addBeans } from '../../systems/economy.js';
import { TOOL_ORDER, grantTool } from '../../systems/tools.js';
import { FISH } from '../../data/fish.js';
import { BUGS } from '../../data/bugs.js';
import { FOSSILS } from '../../data/fossils.js';
import { ART } from '../../data/art.js';
import { ALL_EMOTES } from './emote.js';
import { saveNow } from '../../systems/session.js';
import { loadWorld, saveWorld, clearSave, migrate } from '../../core/save.js';
import { installWorld, pimmVisit } from '../../systems/newgame.js';
import { offerFavour } from '../../systems/favours.js';
import { roccoLeaves } from '../../systems/story.js';
import { rebuildAllObjects } from '../../world/objectsView.js';
import { CONSTELLATIONS } from '../../systems/stargaze.js';
import { CITY_DOORS } from '../../data/cityMap.js';
import { sendMail } from '../../systems/mail.js';

const refreshTime = (g) => { g.weatherKey = null; g.lastHour = -1; g.refreshSeason(true); g.sky.placeChanged(); g.life.placeSpecials(); g.festivals.resetDay(); g.npcs.scatter(); };
const pageMenu = (g, title, items) => {
  const m = new Menu({ id: `dev:${title}`, title: `Dev: ${title}`, items: [...items, { label: 'Back', action: (gg, mm) => gg.ui.pop(mm) }], x: 60, y: 44, w: 360, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm), prompts: [['confirm', 'Do'], ['back', 'Back']] });
  return m;
};
const timePage = (g) => {
  const w = g.world;
  return pageMenu(g, 'Time', [
    { label: 'Hour', value: () => Math.floor(w.clock.minute / 60), left: () => { w.clock.minute = (w.clock.minute + 1380) % 1440; refreshTime(g); }, right: () => { w.clock.minute = (w.clock.minute + 60) % 1440; refreshTime(g); }, action: () => {} },
    { label: 'Next day', action: () => { advanceTo(g, w.clock.day + 1, 8 * 60); refreshTime(g); g.events.emit('devNextDay', {}); } },
    { label: 'Set calendar day', value: () => villageDay(w.clock.day).calendarDay, left: () => { const d = villageDay(w.clock.day).calendarDay; advanceTo(g, w.clock.day + ((d + 14) % 16) + 0, w.clock.minute); refreshTime(g); }, right: () => { advanceTo(g, w.clock.day + 1, w.clock.minute); refreshTime(g); }, action: () => {} },
    { label: 'Next season', action: () => { const d = villageDay(w.clock.day); advanceTo(g, w.clock.day + (4 - (d.calendarDay - 1) % 4), 8 * 60); refreshTime(g); } },
    { label: 'Freeze time', value: () => (g.timeFrozen ? 'Yes' : 'No'), action: () => { g.timeFrozen = !g.timeFrozen; } },
    { label: 'Clock mode', value: () => w.clock.mode, action: () => { w.clock.mode = w.clock.mode === 'real' ? 'village' : 'real'; g.weatherKey = null; refreshTime(g); } },
  ]);
};
const worldPage = (g) => {
  const w = g.world;
  const places = [['Plaza', g.town, 24, 41], ['Bus stop', g.town, 8.5, 29], ...BUILDINGS.map((b) => [b.name, g.town, b.door[0], b.door[1] + 0.6]), ...NEIGHBOUR_ORDER.map((id) => [NEIGHBOURS[id].name, null, id]), ['The City', g.city, 2.5, 10]];
  return pageMenu(g, 'World', [
    { label: 'Weather', value: () => w.flags.forceWeather ?? 'natural', action: () => { const list = [null, 'sun', 'rain', 'storm', 'fog', 'wind', 'snow', 'clear']; const i = list.indexOf(w.flags.forceWeather ?? null); w.flags.forceWeather = list[(i + 1) % list.length]; g.weatherKey = null; } },
    { label: 'Teleport…', action: (gg) => gg.ui.push(pageMenu(gg, 'Teleport', places.map(([name, place, x, z]) => ({ label: name, action: (g2) => { g2.ui.popAll(); if (!place) { const a = g2.npcs.actor(x); g2.swapPlace(g2.town, a.x + 1, a.z + 1); } else g2.swapPlace(place, x, z); } })))) },
    { label: 'No-clip', value: () => (g.noclip ? 'On' : 'Off'), action: () => { g.noclip = !g.noclip; } },
    { label: 'Free camera', value: () => (g.freeCam ? 'On' : 'Off'), action: () => { g.freeCam = !g.freeCam; g.engine.setCamera(g.freeCam ? { preset: 'free' } : { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, { syncUrl: false }); g.fixedCam = g.freeCam; } },
    { label: 'Zoom-out overview', value: () => (g.camState.zoomOverride === 0.6 ? 'On' : 'Off'), action: () => { g.camState.zoomOverride = g.camState.zoomOverride === 0.6 ? undefined : 0.6; } },
  ]);
};
const playerPage = (g) => {
  const w = g.world;
  const categories = ['fish', 'bug', 'fossil', 'art', 'furniture', 'clothes', 'hat', 'glasses', 'umbrella', 'fruit', 'seed', 'bag', 'cheese', 'record', 'wall', 'floor'];
  return pageMenu(g, 'Player', [
    { label: 'Beans', value: () => w.player.beans.toLocaleString('en-US'), left: () => addBeans(g, -10000), right: () => addBeans(g, 10000), action: () => addBeans(g, 100000) },
    { label: 'Clear debt', value: () => w.player.debt.toLocaleString('en-US'), action: () => { w.player.debt = 0; } },
    { label: 'Home tier', value: () => w.player.homeTier, left: () => { w.player.homeTier = Math.max(1, w.player.homeTier - 1); g.town.refreshHome(); g.rooms.reset(); }, right: () => { w.player.homeTier = Math.min(4, w.player.homeTier + 1); g.town.refreshHome(); g.rooms.reset(); }, action: () => {} },
    { label: 'Give any item…', action: (gg) => gg.ui.push(pageMenu(gg, 'Give', categories.map((c) => ({ label: c, action: (g2) => { const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === c); g2.ui.push(pageMenu(g2, c, ids.map((id) => ({ label: ITEMS[id].name, action: (g3) => { addItem(g3, id); g3.sound('pickUp'); } })))); } })))) },
    { label: 'All tools', action: () => { for (const t of TOOL_ORDER) if (!w.player.tools.includes(t)) w.player.tools.push(t); grantTool(g, 'net'); } },
    { label: 'All emotes', action: () => { w.player.emotes = ALL_EMOTES.slice(); } },
    { label: 'Set look', action: () => { g.ui.popAll(); g.scripts.run(lookEditor(g, { title: 'Dev: look', free: true }), { name: 'devLook' }); } },
    { label: 'Empty pockets', action: () => { w.player.pockets.fill(null); } },
  ]);
};
const neighboursPage = (g) => pageMenu(g, 'Neighbours', [
  ...NEIGHBOUR_ORDER.map((id) => ({ label: NEIGHBOURS[id].name, value: () => g.world.npcs[id].friend, left: () => { g.world.npcs[id].friend = Math.max(0, g.world.npcs[id].friend - 10); }, right: () => { g.world.npcs[id].friend = Math.min(100, g.world.npcs[id].friend + 10); }, action: () => { offerFavour(g, id); g.sound('uiConfirm'); } })),
  { label: 'Move Rocco out, Fitch in, now', action: () => roccoLeaves(g) },
  { label: 'Show routines', value: () => (g.overlay.npc ? 'On' : 'Off'), action: () => { g.overlay.npc = !g.overlay.npc; } },
]);
const eventsPage = (g) => {
  const w = g.world;
  const go = (day, hour) => { const d = villageDay(w.clock.day).calendarDay; let add = (day - d + 16) % 16; if (add === 0 && hour * 60 < w.clock.minute) add = 16; advanceTo(g, w.clock.day + add, hour * 60); refreshTime(g); g.ui.popAll(); };
  return pageMenu(g, 'Events', [
    ...YEAR_EVENTS.map((ev) => ({ label: ev.name, action: () => go(ev.day, ev.hour) })),
    { label: 'Vesper, tonight', action: () => { w.flags.vesperForced = true; w.clock.minute = 20 * 60; refreshTime(g); g.ui.popAll(); } },
    { label: 'Inspector Pimm', action: () => { g.ui.popAll(); g.scripts.run(pimmVisit(g), { name: 'pimm' }); } },
    { label: 'Cheese day', action: () => { w.flags.rindForced = true; g.life.placeSpecials(); g.ui.popAll(); } },
    { label: 'Wasps', action: () => { g.ui.popAll(); g.life.startWasps(g.player.x + 3, g.player.z + 3); } },
    { label: 'A shooting star', action: () => { w.clock.minute = 22 * 60; refreshTime(g); g.ui.popAll(); g.swapPlace(g.town, LANDMARKS.lookoutBench[0], LANDMARKS.lookoutBench[1] + 1.2, Math.PI); } },
    { label: 'A balloon', action: () => { g.ui.popAll(); const b = g.life.launchBalloon({ z: Math.floor(g.player.z), gift: 'bagOfBeans' }); b.x = g.player.x - 6; } },
    { label: 'The ending', action: () => { go(16, 23.8); w.flags.lightsDoors = { a: 1, b: 1, c: 1, d: 1 }; } },
  ]);
};
const collectionsPage = (g) => {
  const w = g.world;
  const fill = (v) => {
    for (const [list, wing] of [[FISH, 'fish'], [BUGS, 'bug'], [FOSSILS, 'fossil'], [ART, 'art']]) {
      w.museum[wing] = v ? Object.fromEntries(list.map((x) => [x.id, true])) : {};
      w.almanac[wing] = v ? Object.fromEntries(list.map((x) => [x.id, 1])) : {};
    }
    if (v) for (const c of CONSTELLATIONS) w.almanac.stars[c.id] = true; else w.almanac.stars = {};
    g.rooms.reset();
  };
  return pageMenu(g, 'Collections', [{ label: 'Fill museum and Almanac', action: () => fill(true) }, { label: 'Empty museum and Almanac', action: () => fill(false) }]);
};
const debugPage = (g) => pageMenu(g, 'Debug', [
  { label: 'Collision tiles', value: () => (g.overlay.collision ? 'On' : 'Off'), action: () => { g.overlay.collision = !g.overlay.collision; } },
  { label: 'Nav paths', value: () => (g.overlay.nav ? 'On' : 'Off'), action: () => { g.overlay.nav = !g.overlay.nav; } },
  { label: 'Target', value: () => (g.overlay.target ? 'On' : 'Off'), action: () => { g.overlay.target = !g.overlay.target; } },
  { label: 'Neighbour state', value: () => (g.overlay.npc ? 'On' : 'Off'), action: () => { g.overlay.npc = !g.overlay.npc; } },
  { label: 'Cast line-up on the plaza', value: () => (g.lineup ? 'On' : 'Off'), action: () => toggleLineup(g) },
  { label: 'Engine state line', value: () => (g.overlay.engine ? 'On' : 'Off'), action: () => { g.overlay.engine = !g.overlay.engine; } },
  { label: 'Look switcher', value: () => g.devLook ?? 'none', action: () => { const names = ['none', 'pixel_world', 'dream', 'cel_cartoon', 'neon_nights', 'storybook']; const i = names.indexOf(g.devLook ?? 'none'); g.devLook = names[(i + 1) % names.length]; g.engine.setLook(g.engine.lookPresets[g.devLook]); } },
]);
/** Everyone with a name, standing in rows on the plaza, for checking silhouettes at game scale. */
export function toggleLineup(g) {
  if (g.lineup) { for (const a of g.lineup) a.remove(); g.lineup = null; g.actorOverride = null; return; }
  g.lineup = [];
  const over = {};
  Object.keys(CRITTER_DEFS).forEach((id, i) => {
    const a = new Actor(CRITTER_DEFS[id], { name: id, seed: i + 1 });
    a.x = 18 + (i % 7) * 2.2; a.z = 34.5 + Math.floor(i / 7) * 3.2; a.facing = 0.5;
    a.addTo(g.town.group);
    g.lineup.push(a);
    over[`lineup${i}`] = a;
  });
  g.actorOverride = over;
}
const savePage = (g) => pageMenu(g, 'Save', [
  { label: 'Save now', action: () => { if (g.demo) { g.ui.toastMsg('Not on a demo.'); return; } saveNow(g); g.ui.toastMsg('Saved.'); } },
  { label: 'Load', action: () => { const w = loadWorld(); if (w) { installWorld(g, w); g.swapPlace(g.town, w.player.x, w.player.z); g.ui.popAll(); } else g.ui.toastMsg('Nothing saved.'); } },
  { label: 'Reset save', action: () => { clearSave(); g.ui.toastMsg('The save is gone. The goose remembers.'); } },
  { label: 'Export save (JSON)', action: () => exportText(g, JSON.stringify(g.world), 'honk-save.json') },
  { label: 'Import save (JSON)', action: () => importText(g, (t) => { try { const w = migrate(JSON.parse(t)); saveWorld(w); installWorld(g, w); g.swapPlace(g.town, w.player.x, w.player.z); g.ui.popAll(); } catch { g.ui.toastMsg('That is not a save.'); } }) },
  { label: 'Export recording', action: () => exportText(g, JSON.stringify(g.engine.recording()), 'honk-recording.json') },
  { label: 'Replay this session', action: () => { const rec = g.engine.recording(); g.ui.popAll(); g.engine.replay(rec, () => g.engine.loadGame(new g.constructor(g.opts))).catch(() => g.ui.toastMsg('That replay did not take.')); } },
]);
function exportText(g, text, name) {
  g.lastExport = text;
  if (typeof document === 'undefined') { g.ui.toastMsg('Exported.'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  g.ui.toastMsg(`Exported ${name}.`);
}
function importText(g, fn) {
  if (typeof document === 'undefined') return;
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.json,application/json';
  i.onchange = () => { const f = i.files[0]; if (f) f.text().then(fn); };
  i.click();
}
const balancePage = (g) => {
  const items = TUNING.map((t) => ({
    label: t.label,
    value: () => { const v = tuning[t.id]; return Number.isInteger(t.step) ? v : v.toFixed(2); },
    left: () => { setTuning(t.id, tuning[t.id] - t.step); g.sound('uiTick'); g.events.emit('tuningChanged', { id: t.id }); },
    right: () => { setTuning(t.id, tuning[t.id] + t.step); g.sound('uiTick'); g.events.emit('tuningChanged', { id: t.id }); },
    action: () => { resetTuning(t.id); g.sound('uiCancel'); },
  }));
  items.push({ label: 'Reset All', action: () => { resetTuning(); g.sound('uiConfirm'); g.ui.toastMsg('All sliders back to their defaults.'); } });
  const m = pageMenu(g, 'Balance', items);
  m.promptList = [['confirm', 'Reset this one'], ['back', 'Back']];
  return m;
};
export function devScreen(g) {
  const items = [['Time', timePage], ['World', worldPage], ['Player', playerPage], ['Neighbours', neighboursPage], ['Events', eventsPage], ['Collections', collectionsPage], ['Debug', debugPage], ['Save', savePage], ['Balance', balancePage]].map(([label, fn]) => ({ label, action: (gg) => gg.ui.push(fn(gg)) }));
  items.push({ label: 'Back', action: (gg, m) => gg.ui.pop(m) });
  const m = new Menu({ id: 'dev', title: 'Dev Mode', items, x: 130, y: 44, w: 220, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm) });
  m.perPage = 10;
  return m;
}
export { calendar, FESTIVALS, CONTESTS, LANDMARKS, CITY_DOORS, sendMail, rebuildAllObjects };
