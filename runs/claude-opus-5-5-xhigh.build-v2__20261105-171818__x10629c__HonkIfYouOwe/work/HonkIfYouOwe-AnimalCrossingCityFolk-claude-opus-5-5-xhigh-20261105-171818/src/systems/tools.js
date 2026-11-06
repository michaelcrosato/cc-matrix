// The six tools. Each verb has anticipation, an impact, a sound, a sparkle and usually a joke.
import { ITEMS } from '../data/items.js';
import { drawIcon } from '../art/icons.js';
import { panel, drawText } from '../ui/draw.js';
import { tileChar, tileInfo, waterKind, isWaterTile } from '../world/tiles.js';
import { addItem, hasRoom, findItem, removeSlot } from './economy.js';
import { revealCatch } from './reveal.js';
import { SOLID_KINDS } from '../world/town.js';
import { BUGS } from '../data/bugs.js';
import { remember } from './memory.js';
import { tuning } from '../dev/tuning.js';

export const TOOL_ORDER = ['net', 'rod', 'shovel', 'axe', 'can', 'slingshot'];
const TOOL_MODEL = { net: 'tool-net', rod: 'tool-rod', shovel: 'tool-shovel', axe: 'tool-axe', can: 'tool-can', slingshot: 'tool-slingshot' };
export function equip(g, tool, ring = true) {
  const w = g.world;
  w.player.tool = tool;
  g.player.hold(tool ? TOOL_MODEL[tool] : null);
  g.heldNet = false;
  g.life.endFishing?.();
  if (ring) g.toolRingT = 1.2;
}
export function cycleTool(g, d) {
  const w = g.world;
  const owned = TOOL_ORDER.filter((t) => w.player.tools.includes(t));
  if (!owned.length) return;
  const list = [null, ...owned];
  const i = list.indexOf(w.player.tool);
  const next = list[(i + d + list.length) % list.length];
  equip(g, next);
  g.sound('uiTab');
}
export function setToolByDigit(g, d) {
  const t = TOOL_ORDER[d - 1];
  const w = g.world;
  if (!w.player.tools.includes(t)) { g.sound('uiError'); return; }
  equip(g, w.player.tool === t ? null : t);
  g.sound('uiTab');
}
export function grantTool(g, tool) {
  const w = g.world;
  if (!w.player.tools.includes(tool)) w.player.tools.push(tool);
  equip(g, tool);
  g.events.emit('toolGained', { tool });
}
/** Ring of tools around you while cycling. */
export function drawToolRing(g, hud) {
  if (!(g.toolRingT > 0)) return;
  g.toolRingT -= 0.016;
  const w = g.world;
  const c = g.project(g.player.x, g.player.y + 1, g.player.z);
  if (!c) return;
  const owned = TOOL_ORDER.filter((t) => w.player.tools.includes(t));
  const n = owned.length;
  owned.forEach((t, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    const x = Math.round(c.x + Math.cos(a) * 42) - 11;
    const y = Math.round(c.y + Math.sin(a) * 36) - 11;
    const eq = w.player.tool === t;
    panel(hud, x, y, 22, 22, { fill: eq ? 'sand' : 'white', trim: eq ? 'orange' : 'mist' });
    drawIcon(hud, x + 3, y + 3, ITEMS[t].icon, ITEMS[t].iconColors);
  });
}
export function toolPrompt(g) {
  const w = g.world;
  const t = w.player.tool;
  if (!t || g.place !== g.town) return null;
  const f = g.life.fishing;
  if (t === 'rod' && f) return f.state === 'bite' ? 'REEL!' : 'Reel in';
  if (t === 'rod') return 'Cast';
  if (t === 'net') return g.heldNet ? 'Release to swing' : 'Ready the net';
  if (t === 'can') return 'Water';
  if (t === 'axe') return 'Chop';
  if (t === 'shovel') { const o = g.interact.tile ? w.town.objects[`${g.interact.tile[0]},${g.interact.tile[1]}`] : null; return o?.k === 'hole' ? 'Fill' : 'Dig'; }
  if (t === 'slingshot') return 'Fire';
  return null;
}
/** Tool button with the mouse aims at the cursor. */
export function toolInput(g, dt) {
  const inp = g.inp;
  const w = g.world;
  const tool = w.player.tool;
  const m = inp.mouse;
  const pressed = inp.useTool || (m.rclick && m.over);
  if (!tool) {
    if (pressed && !w.player.gagJump) { w.player.gagJump = true; g.ui.toastMsg("You can't jump. You're in escrow."); g.events.emit('gag', {}); }
    return;
  }
  if (g.place !== g.town) {
    if (pressed) g.sound('uiError');
    return;
  }
  if (pressed && m.rclick && g.interact.hoverPoint) { const h = g.interact.hoverPoint; g.player.faceToward(h.x, h.z); g.player.facing = Math.atan2(h.x - g.player.x, h.z - g.player.z); }
  if (tool === 'net') {
    if (pressed) { g.heldNet = true; g.player.play('NetReady', 0.06); }
    else if (g.heldNet && !inp.toolHeld) { g.heldNet = false; netSweep(g); }
    return;
  }
  if (!pressed) return;
  if (tool === 'rod') {
    if (g.life.fishing) g.life.reel();
    else g.life.cast();
    return;
  }
  if (tool === 'shovel' && g.net?.role !== 'guest') return g.scripts.run(useShovel(g), { name: 'shovel' });
  if (g.net?.role === 'guest' && (tool === 'axe' || tool === 'shovel')) { g.ui.toastMsg("Not in someone else's village."); return undefined; }
  if (tool === 'axe') return g.scripts.run(useAxe(g), { name: 'axe' });
  if (tool === 'can') return g.scripts.run(useCan(g), { name: 'can' });
  if (tool === 'slingshot') return g.scripts.run(useSling(g), { name: 'sling' });
  return undefined;
}
function netSweep(g) {
  const p = g.player;
  p.pose('NetSweep');
  g.sound('netSwing');
  const reachSq = 1.8 * 1.8;
  const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
  // Bugs in a 90° cone
  const caught = g.life.bugs.find((b) => {
    const dx = b.x - p.x, dz = b.z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > reachSq) return false;
    const d = Math.sqrt(d2) || 1;
    return (dx * fx + dz * fz) / d > 0.7 && !b.gone;
  });
  // Neighbours are also in the way, sometimes
  const bonked = !caught ? g.npcs.all().find((n) => n.actor.visible && Math.hypot(n.actor.x - p.x - fx * 1.0, n.actor.z - p.z - fz * 1.0) < 0.9 && n.actor.root.parent === g.place.group) : null;
  const wasps = g.life.waspsNear?.(p.x + fx, p.z + fz);
  g.scripts.run((function* () {
    yield 0.15;
    if (caught) {
      g.sound('netCatch');
      g.rumble(0.3, 80);
      g.life.catchBug(caught);
      yield* revealCatch(g, caught.def.id, caught.def.line, 'bug');
    } else if (bonked) {
      g.sound('bonk');
      const npc = bonked;
      g.world.npcs[npc.id].friend = Math.max(0, g.world.npcs[npc.id].friend - 2);
      g.world.stats.netBonks += 1;
      remember(g, 'bonk', { about: npc.id });
      npc.actor.play(npc.id === 'ozzie' ? 'PlayDead' : 'Shock', 0.05, { once: true });
      npc.emoting = true;
      g.events.emit('bonk', { id: npc.id });
    } else if (wasps) {
      g.life.netWasps();
      g.sound('netCatch');
    } else g.sound('netMiss');
  })(), { name: 'netResult', hold: !!caught });
}
function* useShovel(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const k = `${tx},${tz}`;
  const o = w.town.objects[k];
  const p = g.player;
  const info = tileInfo(tileChar(tx, tz));
  p.pose('Dig');
  yield 0.34;
  if (o?.k === 'stump') { g.sound('hitRock'); delete w.town.objects[k]; g.town.dirty.add(k); g.ui.toastMsg('You dug up the stump. It had nothing to say.'); g.sound('dirtFall'); g.events.emit('stumpOut', { k }); return; }
  if (o?.k === 'rock') { g.sound('hitRock'); g.rumble(0.3, 80); g.engine.hitstop(0.05); g.life.hitRock(tx, tz, o); return; }
  if (o?.k === 'hole') {
    g.sound('dirtFall');
    const fillItem = g.pendingBury;
    delete w.town.objects[k];
    g.town.dirty.add(k);
    g.ctx.particles.burst('dirt', [tx + 0.5, 0.2, tz + 0.5], { count: 6 });
    return;
  }
  if (!info.walk || info.surface === 'dock' || info.surface === 'plaza' && !o?.k || tileChar(tx, tz) === '^') {
    if (info.surface !== 'plaza' || o?.k !== 'crack') { g.sound('hitRock'); g.ui.toastMsg("That's not the sort of ground you can dig."); return; }
  }
  if (o && o.k !== 'crack' && o.k !== 'sparkle' && o.k !== 'weed') { g.sound('uiError'); return; }
  g.sound('dig');
  g.rumble(0.4, 100);
  g.ctx.particles.burst('dirt', [tx + 0.5, 0.25, tz + 0.5], { count: 10 });
  yield 0.1;
  const was = o;
  w.town.objects[k] = { k: 'hole', item: was?.item ?? null };
  g.town.dirty.add(k);
  g.events.emit('dug', { k, was: was?.k ?? null });
  if (was?.k === 'crack' || was?.k === 'sparkle') {
    w.town.objects[k].item = null;
    const item = was.item;
    if (!hasRoom(w)) { w.town.objects[k] = { k: 'drop', item }; g.town.dirty.add(k); g.ui.toastMsg('Your pockets are full. It stays on the ground.'); return; }
    addItem(g, item);
    g.events.emit('dugUp', { item });
    yield* revealCatch(g, item, ITEMS[item].line, 'find');
  }
}
function* useAxe(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const k = `${tx},${tz}`;
  const o = w.town.objects[k];
  const p = g.player;
  p.pose('Chop');
  yield 0.34;
  if (o?.k === 'tree' || o?.k === 'sapling') {
    g.sound('chop');
    g.rumble(0.4, 90);
    o.hits = (o.hits ?? 0) + 1;
    const v = g.town.objectViews.get(k);
    if (v) { g.ctx.tweens.value(0, 1, { duration: 0.3 }, (t) => { v.rotation.z = Math.sin(t * 20) * 0.04 * (1 - t); }); }
    g.ctx.particles.burst('sparkle', [tx + 0.5, 1, tz + 0.5], { count: 4, colors: ['sand', 'orange'] });
    if (o.hits >= 3 || o.k === 'sapling') {
      g.sound('treeFall');
      g.engine.shake.add(g.settings.shake ? 0.25 : 0);
      w.town.objects[k] = { k: 'stump' };
      g.town.dirty.add(k);
      g.ctx.particles.burst('leaf', [tx + 0.5, 2, tz + 0.5], { count: 20 });
      g.events.emit('treeFelled', { k });
      w.stats.trees = (w.stats.trees ?? 0) + 1;
    }
  } else if (o?.k === 'rock') { g.sound('hitRock'); g.life.hitRock(tx, tz, o); }
  else if (o?.k === 'stump') { g.sound('chop'); g.ui.toastMsg('The stump is unmoved. Try a shovel.'); }
  else g.sound('netMiss');
}
function* useCan(g) {
  const w = g.world;
  const [tx, tz] = g.interact.tile;
  const p = g.player;
  p.pose('Water');
  g.sound('waterPour');
  g.ctx.particles.burst('splash', [tx + 0.5, 0.5, tz + 0.5], { count: 10 });
  yield 0.5;
  let watered = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const k = `${tx + dx},${tz + dz}`;
    const o = w.town.objects[k];
    if (!o) continue;
    if (o.k === 'flower') { o.wet = w.clock.day; if (o.wilt) { o.wilt = 0; g.town.dirty.add(k); } watered++; }
    if (o.k === 'sapling') { o.wet = w.clock.day; watered++; if (o.mayor) g.events.emit('wateredMayorSapling', {}); }
  }
  if (watered) g.events.emit('watered', { n: watered });
}
function* useSling(g) {
  const p = g.player;
  // Aim at the nearest balloon ahead; with a mouse, the one under the cursor.
  const b = g.life.balloonAhead();
  p.pose('Slingshot');
  yield 0.4;
  g.sound('slingFire');
  g.life.fireShot(b);
}
export { waterKind, isWaterTile, SOLID_KINDS, BUGS, findItem, removeSlot, tuning };
