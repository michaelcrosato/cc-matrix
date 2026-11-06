// What pressing on a thing in your pockets offers. Wear, eat, plant, bury, place.
import { ITEMS } from '../data/items.js';
import { removeSlot, addItem, addBeans, hasRoom } from './economy.js';
import { tileChar, tileInfo } from '../world/tiles.js';
import { remember } from './memory.js';
import { PATTERN_COLORS } from './patterns.js';
import { narrate } from './say.js';

const closeAll = (g, m) => { g.ui.pop(m); while (g.ui.top && (g.ui.top.id === 'pockets' || g.ui.top.id === 'pocketAction')) g.ui.pop(); };
function frontTile(g) {
  const p = g.player;
  return [Math.floor(p.x + Math.sin(p.facing) * 0.9), Math.floor(p.z + Math.cos(p.facing) * 0.9)];
}
export function wear(g, i, slot) {
  const w = g.world;
  const it = ITEMS[slot.id];
  const look = w.player.look;
  removeSlot(g, i);
  const giveBack = (id) => { if (id) { if (!addItem(g, id) && false) return; } };
  if (it.cat === 'clothes') { giveBack(look.outfit); look.outfit = slot.id; look.pattern = null; }
  else if (it.cat === 'hat') { giveBack(look.hatItem); look.hatItem = slot.id; }
  else if (it.cat === 'glasses') { giveBack(look.glassesItem); look.glassesItem = slot.id; }
  else if (it.cat === 'umbrella') { giveBack(look.umbrella); look.umbrella = slot.id; }
  g.player.applyLook();
  remember(g, 'outfit', { item: it.name });
  g.sound('uiConfirm');
  g.events.emit('wore', { id: slot.id });
}
function plantable(g, tx, tz) {
  const inf = tileInfo(tileChar(tx, tz));
  return inf.walk && inf.surface !== 'dock' && inf.surface !== 'plaza' && !g.world.town.objects[`${tx},${tz}`] && !g.town.solid[tz * 80 + tx];
}
export function pocketActions(g, i, slot) {
  const w = g.world;
  const it = ITEMS[slot.id];
  const out = [];
  const inTown = g.place === g.town;
  const atHome = g.place?.key !== undefined;
  const add = (label, action) => out.push({ label, action });
  switch (it?.cat) {
    case 'clothes': case 'hat': case 'glasses': case 'umbrella':
      add('Wear', (gg, m) => { wear(gg, i, slot); closeAll(gg, m); });
      break;
    case 'furniture':
      if (atHome) add('Place here', (gg, m) => { closeAll(gg, m); gg.openPlacement(i); });
      break;
    case 'wall':
      if (atHome) add('Hang here', (gg, m) => { const r = gg.place.roomData; const old = r.wall; r.wall = slot.id; removeSlot(gg, i); addItem(gg, old); gg.place.rebuild(); gg.events.emit('wallpaper', { id: slot.id }); closeAll(gg, m); });
      break;
    case 'floor':
      if (atHome) add('Lay it here', (gg, m) => { const r = gg.place.roomData; const old = r.floor; r.floor = slot.id; removeSlot(gg, i); addItem(gg, old); gg.place.rebuild(); gg.events.emit('floorLaid', { id: slot.id }); closeAll(gg, m); });
      break;
    case 'fruit':
      add('Eat', (gg, m) => { removeSlot(gg, i); gg.player.pose('Eat'); gg.sound('chew'); gg.events.emit('ate', { id: slot.id }); closeAll(gg, m); gg.ui.toastMsg(`You eat the ${it.name.toLowerCase()}. It's ${it.foreign ? 'not from here' : 'fine'}.`); });
      if (inTown && (it.foreign || slot.id === 'pear')) add('Plant', (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg('Not here. Find a clear patch of ground.'); return; }
        removeSlot(gg, i);
        w.town.objects[`${tx},${tz}`] = { k: 'sapling', stage: 0, kind: 'pear', fruitItem: slot.id, wet: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound('dig');
        gg.events.emit('planted', { what: slot.id });
        closeAll(gg, m);
      });
      break;
    case 'plant':
      if (inTown) add('Plant', (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg('Not here. Find a clear patch of ground.'); return; }
        removeSlot(gg, i);
        w.town.objects[`${tx},${tz}`] = { k: 'sapling', stage: 0, kind: 'pear', wet: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound('dig');
        gg.events.emit('planted', { what: 'sapling' });
        closeAll(gg, m);
      });
      break;
    case 'seed': case 'flower':
      if (inTown) add('Plant', (gg, m) => {
        const [tx, tz] = frontTile(gg);
        if (!plantable(gg, tx, tz)) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg('Not here. Find a clear patch of ground.'); return; }
        removeSlot(gg, i);
        const species = it.species;
        const color = it.color ?? ((tx + tz) % 3);
        w.town.objects[`${tx},${tz}`] = { k: 'flower', species, color, wet: 0, wilt: 0 };
        gg.town.dirty.add(`${tx},${tz}`);
        gg.sound('dirtFall');
        gg.events.emit('planted', { what: 'flower', species });
        closeAll(gg, m);
      });
      break;
    case 'bag':
      add('Open it', (gg, m) => { removeSlot(gg, i); addBeans(gg, it.beans, 'bag'); gg.sound('beanLots'); gg.ui.toastMsg(`+${it.beans.toLocaleString('en-US')} beans`); gg.events.emit('openedBag', {}); closeAll(gg, m); });
      break;
    case 'record':
      if (atHome && g.place.hasFunc('stereo')) add('Play it', (gg, m) => { w.home.stereo = it.song; gg.music.refresh(); closeAll(gg, m); gg.events.emit('stereo', { song: it.song }); });
      break;
    default: break;
  }
  if (slot.id === 'patternKit' && inTown) {
    const put = (k) => (gg, m) => {
      const [tx, tz] = frontTile(gg);
      if (!plantable(gg, tx, tz)) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg('Not here. Find a clear patch of ground.'); return; }
      removeSlot(gg, i);
      w.town.objects[`${tx},${tz}`] = { k, slot: slot.slot ?? 0 };
      gg.town.dirty.add(`${tx},${tz}`);
      gg.sound('drop');
      gg.events.emit('patternPlaced', { k });
      closeAll(gg, m);
    };
    add('Lay it here', put('pattern'));
    add('Put up a sign', put('patternSign'));
  }
  if (slot.id === 'medicine') add('Take it', (gg, m) => { removeSlot(gg, i); w.player.puffy = false; if (gg.player.eyeL) gg.player.eyeL.scale.x = 1; gg.sound('chew'); gg.ui.toastMsg('You feel told off. Your face goes back.'); gg.events.emit('cured', {}); closeAll(gg, m); });
  if (slot.id === 'coffeeBean') add('Drink it', (gg, m) => { removeSlot(gg, i); w.player.buffUntil = gg.absMinute() + 120; gg.sound('chew'); closeAll(gg, m); });
  if (it?.cat !== 'tool' && it?.cat !== 'quest') add('Drop it', (gg, m) => {
    if (!inTown) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg('Not indoors. Somebody will have words.'); return; }
    const [tx, tz] = frontTile(gg);
    if (!plantable(gg, tx, tz)) { gg.sound('uiError'); closeAll(gg, m); gg.ui.toastMsg("There's no room to drop it there."); return; }
    removeSlot(gg, i);
    if (gg.net?.role === 'guest') gg.net.t.send({ t: 'do', a: 'gift', at: [tx, tz], item: slot.id });
    else { w.town.objects[`${tx},${tz}`] = { k: 'drop', item: slot.id }; gg.town.dirty.add(`${tx},${tz}`); gg.net?.t.send({ t: 'ev', k: 'obj', key: `${tx},${tz}`, o: w.town.objects[`${tx},${tz}`] }); }
    gg.sound('drop');
    closeAll(gg, m);
  });
  return out;
}
export { PATTERN_COLORS, hasRoom, narrate };
