// What can be done from here: the target list, the chevron, the context prompt, the tools.
import { THREE } from '../engine.js';
import { G, bus } from '../state.js';
import { NPC, isAwake } from '../actors/npcs.js';
import { BUILDINGS, LANDMARK, BENCHES, CITY } from '../world/layout.js';
import { Trans, enterRoom, exitRoom, setPlace, ensureRoom } from '../world/places.js';
import { addEnt, removeEnt, entAt, giveItem, pocketFree, remember, info, hasItem, takeItem, earn, isFree } from '../core/world.js';
import { ITEMS, TOOL_ORDER, sellPriceOf } from '../data/items.js';
import { T } from '../dev/tuning.js';
import { angleDelta, clamp, rngOf, fmt } from '../core/util.js';
import { Nature, collect } from './nature.js';
import { Script, say, ask, Toasts } from '../ui/dialogue.js';
import { BEDTIME } from '../data/lines.js';
import { CAST, NEIGHBOURS, nameOf } from '../data/cast.js';
import { ROOM_DEFS } from '../world/rooms.js';
import { hourOf } from '../core/calendar.js';
let extra = [];
export const addTargets = (f) => extra.push(f);
export const resetTargets = () => { extra = []; };
const tgt = (o) => ({ reach: 1.3, ...o });
export function allTargets() {
  const w = G.world, place = w.p.place, out = [];
  if (G.demo?.noTargets) return out;
  for (const n of NPC.talkable()) { const c = CAST[n.id]; if (n.id === 'vesper' && !G.yearInfo?.vesperHere) continue; out.push(tgt({ kind: 'npc', id: n.id, x: n.x, z: n.z, reach: 1.7, label: c.name, verb: 'Talk', act: () => G.talk(n.id) })); }
  if (place === 'town') {
    for (const b of BUILDINGS) out.push(tgt({ kind: 'door', id: b.id, x: b.door[0], z: b.door[1], reach: 1.4, label: labelOf(b), verb: 'Enter', act: () => doorAct(b) }));
    out.push(tgt({ kind: 'stop', x: LANDMARK.busStop[0], z: LANDMARK.busStop[1], reach: 1.6, label: 'Bus Stop', verb: 'Wait for the bus', act: () => G.bus?.call('town') }));
    out.push(tgt({ kind: 'notice', x: LANDMARK.notice[0], z: LANDMARK.notice[1] + 0.6, reach: 1.4, label: 'Notice Board', verb: 'Read', act: () => G.readNotice() }));
    out.push(tgt({ kind: 'mail', x: LANDMARK.mailbox[0], z: LANDMARK.mailbox[1], reach: 1.3, label: 'Mailbox', verb: 'Check', act: () => G.openMail() }));
    out.push(tgt({ kind: 'bell', x: LANDMARK.bell[0], z: LANDMARK.bell[1], reach: 1.7, label: 'The Old Bell', verb: 'Ring', act: () => G.ringBell() }));
    for (const be of BENCHES) out.push(tgt({ kind: 'bench', x: be.x, z: be.z, reach: 1.3, label: be.lookout ? 'Lookout Bench' : 'Bench', verb: 'Sit', act: () => G.sitOn(be) }));
    const fx = w.p.x, fz = w.p.z;
    for (const e of Object.values(w.ents)) { const dx = e.x - fx, dz = e.z - fz; if (dx * dx + dz * dz > 30) continue; const t = entTarget(e); if (t) out.push(t); }
    if (G.yearInfo?.rindHere) out.push(tgt({ kind: 'stall', x: LANDMARK.rindStall[0], z: LANDMARK.rindStall[1] + 0.9, reach: 1.5, label: 'Cheese Stall', verb: 'Browse', act: () => G.talk('rind') }));
  } else if (place === 'city') {
    for (const f of CITY.fronts) out.push(tgt({ kind: 'door', id: f.id, x: f.door[0] + CITY.ox, z: f.door[1] + CITY.oz, reach: 1.5, label: ROOM_DEFS[f.room].label, verb: 'Enter', act: () => G.cityDoor(f) }));
    out.push(tgt({ kind: 'door', id: 'tent', x: CITY.tent[0] + CITY.ox, z: CITY.tent[1] + 2.2, reach: 1.5, label: "Madame Nibbles' Tent", verb: 'Enter', act: () => enterRoom('tent') }));
    out.push(tgt({ kind: 'stop', x: CITY.stop[0] + CITY.ox, z: CITY.stop[1], reach: 1.8, label: 'Bus Stop', verb: 'Go home', act: () => G.bus?.call('city') }));
    for (const c of G.crowdList?.() ?? []) out.push(tgt({ kind: 'person', x: c.x, z: c.z, reach: 1.5, label: c.name, verb: 'Listen', act: () => G.crowdTalk(c) }));
  } else {
    const r = G.rooms[place];
    if (r?.exitAt) out.push(tgt({ kind: 'exit', x: r.exitAt[0], z: r.exitAt[1] + 0.2, reach: 1.2, label: 'Outside', verb: 'Leave', act: () => exitRoom() }));
    for (const d of r?.doors ?? []) out.push(tgt({ kind: 'door', x: d.wx, z: d.wz, reach: 1.5, label: d.label ?? ROOM_DEFS[d.to].label, verb: 'Go', act: () => Trans.go(() => setPlace(d.to, G.rooms[d.to] ? G.rooms[d.to].ox + d.tx : ensureRoom(d.to).ox + d.tx, d.tz, 0), 'fade', 4) }));
    for (const p of r?.props ?? []) out.push(tgt({ kind: 'prop', id: p.id, x: p.wx, z: p.wz, reach: 1.5, label: p.label, verb: p.verb ?? 'Look', act: () => G.useProp(p, r) }));
    for (const f of G.roomTargets?.(r) ?? []) out.push(tgt(f));
  }
  for (const f of extra) for (const t of f(place)) out.push(tgt(t));
  return out;
}
const labelOf = (b) => ({ museum: 'Museum', hall: 'Town Hall & Post', store: "Mrs. Gander's", mothwick: "Mothwick's", home: 'Your Place' }[b.id] ?? `${CAST[houseOwner(b)]?.short ?? CAST[houseOwner(b)]?.name}'s`);
const houseOwner = (b) => (b.id === 'rocco' && G.world.npcs.fitch?.moved === 'here' ? 'fitch' : b.id);
function doorAct(b) {
  const w = G.world; const h = hourOf(w.clock);
  if (w.guest && b.id === 'home') return Toasts.add("It's your host's home. Knock politely, by leaving.");
  if (b.id === 'home') { if (w.p.tier === 0) return Script.run((function* () { yield say('narrator', "It's a shack with no roof. Mrs. Gander says you can sleep here when you've done your errands."); })()); return enterRoom('home'); }
  if (b.id === 'store') { if ((h < 8 || h >= 22) && !G.noHours) return Script.run((function* () { yield say('gander', ['We are closed, dear. Your debt, however, is open all night.'][0]); })()); return enterRoom('store'); }
  if (b.room.startsWith('h_')) { const owner = houseOwner(b); const room = 'h_' + owner; if (w.npcs[owner]?.moved === 'gone') return Toasts.add('Empty. Somebody swept. It smells of trophies.'); const st = w.npcs[owner]; if (st.place === room || (owner === 'rocco' && st.place === 'h_rocco')) { if (!isAwake(owner, w)) { const line = rngOf(`${w.clock.minute}`).pick(BEDTIME); return Script.run((function* () { yield say(owner, line); })()); } return enterRoom(room); } return Toasts.add(`${CAST[owner].short ?? CAST[owner].name} isn't home. The door looks smug about it.`); }
  return enterRoom(b.room);
}
function entTarget(e) {
  const base = { x: e.x, z: e.z, ent: e };
  switch (e.t) {
    case 'tree': return tgt({ ...base, kind: 'tree', reach: 1.5, label: e.kind === 'pear' ? 'Pear Tree' : e.kind === 'pine' ? 'Pine' : 'Palm', verb: 'Shake', act: () => shakeTree(e) });
    case 'flower': return tgt({ ...base, kind: 'flower', label: ITEMS[`fl_${e.sp}_${e.c}`]?.name ?? 'Flower', verb: 'Pick', act: () => pickFlower(e) });
    case 'weed': return tgt({ ...base, kind: 'weed', label: 'Weed', verb: 'Pull', act: () => pullWeed(e) });
    case 'shell': return tgt({ ...base, kind: 'pick', label: ITEMS[e.it]?.name ?? 'Shell', verb: 'Pick up', act: () => pickEnt(e) });
    case 'item': return tgt({ ...base, kind: 'pick', label: ITEMS[e.it]?.name ?? 'Thing', verb: 'Pick up', act: () => pickEnt(e) });
    case 'snowball': return tgt({ ...base, kind: 'snow', reach: 1.5 + (e.size ?? 0.5) / 2, label: 'Snowball', verb: 'Push', act: () => pushSnow(e) });
    case 'snowman': return tgt({ ...base, kind: 'snowman', reach: 1.6, label: 'Snowman', verb: 'Talk', act: () => G.snowmanTalk(e) });
    case 'beanstalk': return (e.age ?? 0) >= 2 ? tgt({ ...base, kind: 'pick', label: 'Beanstalk', verb: 'Harvest', act: () => harvestStalk(e) }) : tgt({ ...base, kind: 'look', label: 'Beanstalk', verb: 'Look', act: () => Toasts.add('It is growing. You did not hear that from anyone.') });
    case 'sapling': return tgt({ ...base, kind: 'look', label: e.mayor ? "The Mayor's Sapling" : 'Sapling', verb: 'Look', act: () => Toasts.add(e.wet ? 'It looks grateful, in a leafy way.' : 'It looks thirsty. So would you.') });
    default: return null;
  }
}
// ---- Bare-hand verbs
export function shakeTree(e) { const w = G.world, p = G.player, v = G.view.ents.get(e.id); if (w.guest) { G.visit.session.send({ t: 'do', a: 'shake', id: e.id }); p.actor.play('ShakeTree', { then: 'Idle' }); p.busy = 0.5; if (v) v.shake = 0.5; G.ctx.audio.play('shake'); return; } p.actor.play('ShakeTree', { then: 'Idle' }); p.busy = 0.5; if (v) v.shake = 0.5; G.ctx.audio.play('shake'); G.ctx.particles.burst(G.view.seasonNow === 3 ? 'sparkle' : 'leaf', [e.x, 2.6, e.z], { count: 8 }); bus.emit('shake', e);
  setTimeout0(() => { if (e.fruit > 0) { const kind = e.fruitKind ?? 'pear'; const n = e.fruit; for (let i = 0; i < n; i++) dropNear(e, kind); e.fruit = 0; e.regrow = T.fruitRegrow; w.dirty = true; G.ctx.audio.play('thud'); } if (e.drop === 'bag') { dropNear(e, 'bag', 800); e.drop = null; } else if (e.drop === 'furn') { dropNear(e, rngOf(e.id + w.clock.day).pick(['c_chair', 'bear', 'plant1', 'books', 'c_lamp'])); e.drop = null; } else if (e.drop === 'wasp') { e.drop = null; Nature.wasps(e.x, e.z); Toasts.add('A nest fell out. It would like a word.'); } }, 0.35); }
function dropNear(e, it, value) { const w = G.world; for (const [dx, dz] of [[1, 1], [-1, 1], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, -1], [2, 0], [0, 2], [-2, 0]]) { const tx = Math.floor(e.x) + dx, tz = Math.floor(e.z) + dz; if (!entAt(w, tx, tz) && G.places.town.tileWalkable(tx, tz)) { addEnt(w, { t: 'item', it, value, x: tx + 0.5, z: tz + 0.5 }); return; } } }
export const setTimeout0 = (f, s) => Script.run((function* () { yield s; f(); })(), { background: true });
function pickFlower(e) { const w = G.world; if (w.guest) return Toasts.add("It's not your flower. Your host would notice."); if (!collect(`fl_${e.sp}_${e.c}`)) return; removeEnt(w, e); pickAnim(); }
function pickAnim() { const p = G.player; p.actor.play('PickUp', { then: 'Idle', restart: true }); p.busy = 0.3; G.ctx.audio.play('pickup'); }
function pullWeed(e) { const w = G.world; if (w.guest) return Toasts.add('It is not your weed. It is a very nice weed.'); if (!giveItem(w, { id: 'weed' })) return Toasts.add('Your pockets are full of better weeds.'); removeEnt(w, e); pickAnim(); w.stats.weedsPulled++; G.ctx.particles.burst('dirt', [e.x, 0.2, e.z], { count: 4 }); bus.emit('weed'); }
function pickEnt(e) { const w = G.world; if (w.guest) { G.visit.session.send({ t: 'do', a: 'pick', id: e.id }); pickAnim(); return; } const entry = e.value ? { id: e.it, value: e.value } : { id: e.it }; if (!collect(e.it, entry)) return; removeEnt(w, e); pickAnim(); }
function pushSnow(e) { const w = G.world, p = G.player; const f = Math.atan2(e.x - p.x, e.z - p.z); const nx = e.x + Math.sin(f), nz = e.z + Math.cos(f); if (!G.places.town.walkable(nx, nz, 0.3)) return Toasts.add('It has nowhere to go. Same.'); delete0(w, e); e.x = nx; e.z = nz; e.size = Math.min(1.6, (e.size ?? 0.5) + 0.12); w.grid.set(Math.floor(nx) + ',' + Math.floor(nz), e.id); w.dirty = true; p.actor.play('PushSnow', { then: 'Idle' }); p.busy = 0.25; G.ctx.audio.play('snowPack'); G.tryStackSnow?.(e); }
const delete0 = (w, e) => { w.grid.delete(Math.floor(e.x) + ',' + Math.floor(e.z)); };
function harvestStalk(e) { const w = G.world; if (!giveItem(w, { id: 'bag', value: e.value * 3 })) return Toasts.add('No room for this much bean.'); removeEnt(w, e); pickAnim(); w.stats.tripled = (w.stats.tripled ?? 0) + 1; remember(w, 'stalk', { value: e.value * 3 }); bus.emit('stalk'); Script.run((function* () { yield say('gander', "Beans are currency, dear. You can't plant them."); yield say('ozzie', "You can absolutely plant them. You didn't hear it from me."); yield say('narrator', `The bag you buried came back with friends: ${fmt(e.value * 3)} beans' worth.`); })()); }
// ---- Targeting
const CONE = (35 * Math.PI) / 180;
export function chooseTarget() {
  const w = G.world, p = G.player, all = allTargets(); G.lastTargets = all; let best = null, bs = 1e9;
  const f = w.p.facing;
  for (const t of all) { const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz); if (d > t.reach) continue; const off = Math.abs(angleDelta(f, Math.atan2(dx, dz))); if (off > CONE && d > 0.75) continue; const s = d + off * 0.6 + (t.kind === 'npc' ? -0.3 : t.kind === 'fest' ? -0.6 : 0); if (s < bs) { bs = s; best = t; } }
  return best;
}
export function hoverTarget(c) { const [gx, gz] = G.view.rayGround(c.input.pointer.x, c.input.pointer.y, G.place?.heightAt(G.world.p.x, G.world.p.z) ?? 0); let best = null, bs = 1.1; for (const t of G.lastTargets ?? []) { const d = Math.hypot(t.x - gx, t.z - gz); if (d < bs) { bs = d; best = t; } } return { target: best, gx, gz }; }
// ---- Tools
export function equip(id) { const w = G.world; if (id && !w.p.tools.includes(id)) return; w.p.tool = id; G.player.refreshTool(); G.ctx.audio.play('uiTick'); G.toolRing = 1.2; }
export function cycleTool(d) { const w = G.world, list = w.p.tools; if (!list.length) return; const i = list.indexOf(w.p.tool); const n = i < 0 ? (d > 0 ? 0 : list.length - 1) : i + d; const next = n < 0 || n >= list.length ? null : list[n]; equip(next); G.toolRing = 1.2; }
const TOOL_VERB = { net: 'Swing', rod: 'Cast', shovel: 'Dig', axe: 'Chop', can: 'Water', sling: 'Shoot' };
export function toolVerb() { const w = G.world, t = w.p.tool; if (!t) return null; if (G.player.fishing) return 'Reel'; if (t === 'shovel') { const [tx, tz] = G.player.frontTile(); const e = entAt(w, tx, tz); if (e?.t === 'hole') return hasItem(w, 'bag') >= 0 ? 'Bury beans' : 'Fill'; if (e?.t === 'rock') return 'Hit'; if (e?.t === 'stump') return 'Dig out'; } return TOOL_VERB[t]; }
export function toolDown(aimX, aimZ) {
  const w = G.world, p = G.player, t = w.p.tool;
  if (aimX != null) w.p.facing = Math.atan2(aimX - p.x, aimZ - p.z);
  if (!t) { if (!p.gagUsed) { p.gagUsed = true; Toasts.add("You can't jump. You're in escrow."); } return; }
  if (w.p.place !== 'town' && t !== 'net') return Toasts.add("Not indoors, dear. It's in the terms.");
  switch (t) {
    case 'net': p.state = 'netReady'; p.actor.play('NetReady'); G.ctx.audio.play('netReady'); break;
    case 'rod': if (p.fishing) reel(); else cast(); break;
    case 'shovel': shovel(); break;
    case 'axe': axe(); break;
    case 'can': water(); break;
    case 'sling': p.actor.play('Slingshot', { then: 'Idle', restart: true }); p.busy = 0.5; G.ctx.audio.play('slingStretch'); setTimeout0(() => Nature.shootBalloon(aimX, aimZ), 0.25); break;
  }
}
export function toolUp() { const p = G.player; if (p.state === 'netReady') { p.state = 'free'; netSweep(); } }
function netSweep() {
  const w = G.world, p = G.player; p.actor.play('NetSweep', { then: 'Idle', restart: true }); p.busy = 0.42; G.ctx.audio.play('netSwing');
  setTimeout0(() => {
    const f = w.p.facing; let caught = null;
    for (const b of G.bugs) { const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz); if (d <= 1.8 && Math.abs(angleDelta(f, Math.atan2(dx, dz))) <= Math.PI / 4 && b.y < 2.8) { caught = b; break; } }
    if (caught) { G.ctx.audio.play('netHit'); G.ctx.particles.burst('sparkle', [caught.x, 1, caught.z], { count: 6 }); Nature.group.remove(caught.mesh); G.bugs.splice(G.bugs.indexOf(caught), 1); collect(caught.it); return; }
    for (const n of NPC.talkable()) { if (!w.npcs[n.id] && !CAST[n.id]) continue; const dx = n.x - p.x, dz = n.z - p.z; if (Math.hypot(dx, dz) < 1.7 && Math.abs(angleDelta(f, Math.atan2(dx, dz))) < Math.PI / 4 && w.npcs[n.id]) { G.ctx.audio.play('bonk'); w.npcs[n.id].friend = Math.max(0, w.npcs[n.id].friend - 2); remember(w, 'bonk', { who: n.id }); bus.emit('bonk', n.id); NPC.actors[n.id].play('Shock', { then: 'Idle', restart: true }); Toasts.add(`You netted ${CAST[n.id].short ?? CAST[n.id].name}. They will remember that.`); return; } }
  }, 0.2);
}
function cast() {
  const w = G.world, p = G.player, [fx, fz] = p.front(3); const Pl = G.place;
  if (!Pl.isWater(fx, fz)) return Toasts.add('You need water for that. It helps the fish feel at home.');
  p.state = 'fishing'; p.actor.play('Cast', { hold: true, restart: true }); G.ctx.audio.play('cast');
  const fishing = { x: fx, z: fz, t: 0, stage: 'fly', nibbles: 0, nib: 0, fish: null, dip: 0, kind: Pl.waterKind(fx, fz) }; p.fishing = fishing;
  setTimeout0(() => { if (p.fishing !== fishing) return; fishing.stage = 'wait'; G.ctx.audio.play('plop'); G.ctx.particles.burst('splash', [fx, -0.2, fz], { count: 5 }); fishing.wait = 0.8; }, 0.4);
}
function reel() {
  const p = G.player, f = p.fishing; if (!f) return;
  p.fishing = null; p.state = 'free'; p.busy = 0.3; G.ctx.audio.play('reel');
  if (f.stage === 'bite' && f.fish) {
    p.actor.play('Reel', { then: 'Idle' }); const fish = f.fish; Nature.group.remove(fish.mesh); G.fish.splice(G.fish.indexOf(fish), 1); G.ctx.audio.play('splash'); G.ctx.particles.burst('splash', [f.x, -0.2, f.z]); G.rumble?.(0.4, 0.15);
    // Old Boot: a small chance anywhere
    const boot = rngOf(`${G.world.seed}:boot:${G.time}`).chance(0.07); collect(boot ? 'boot' : fish.it);
  } else { p.actor.play('Idle'); if (f.fish) { f.fish.state = 'flee'; f.fish.t = 1.2; f.fish.vx = (f.fish.x - f.x) * 1.5 + 0.4; f.fish.vz = (f.fish.z - f.z) * 1.5; G.ctx.audio.play('flee'); Toasts.add('It got away. No other penalty. You will think about it, though.'); } }
}
export function fishingFixed(dt) {
  const p = G.player, f = p.fishing; if (!f || f.stage === 'fly') return; const r = Nature.rng;
  if (f.stage === 'wait') { f.wait -= dt; if (f.wait <= 0) { let best = null, bd = 25; for (const s of G.fish) { const d = (s.x - f.x) ** 2 + (s.z - f.z) ** 2; if (d < bd && s.state === 'drift') { bd = d; best = s; } } if (best) { f.fish = best; f.stage = 'come'; best.state = 'hook'; } else f.wait = 1; } return; }
  const s = f.fish; if (!s) return;
  if (f.stage === 'come') { const d = Math.hypot(f.x - s.x, f.z - s.z); if (d > 0.35) { s.x += ((f.x - s.x) / d) * dt * 1.1; s.z += ((f.z - s.z) / d) * dt * 1.1; s.ang = Math.atan2(f.x - s.x, f.z - s.z); } else { f.stage = 'nibble'; f.nibbles = r.int(1, Math.max(1, T.maxNibbles)); if (T.maxNibbles === 0) f.nibbles = 0; f.t = r.range(0.7, 1.6); } return; }
  if (f.stage === 'nibble') { f.t -= dt; f.dip = Math.max(0, (f.dip ?? 0) - dt * 0.6); if (f.t <= 0) { if (f.nibbles > 0) { f.nibbles--; f.dip = 0.08; G.ctx.audio.play('plip'); G.rumble?.(0.15, 0.08); f.t = r.range(0.5, 1.4); } else { f.stage = 'bite'; f.t = T.biteWindow; f.dip = 0.35; G.ctx.audio.play('bite'); G.ctx.particles.burst('splash', [f.x, -0.2, f.z]); G.rumble?.(0.9, 0.3); bus.emit('bite'); G.biteFlash = 0.6; } } return; }
  if (f.stage === 'bite') { f.t -= dt; if (f.t <= 0) { f.stage = 'missed'; s.state = 'flee'; s.t = 1.2; s.vx = 1; s.vz = 0.5; f.fish = null; p.fishing = null; p.state = 'free'; p.actor.play('Idle'); G.ctx.audio.play('flee'); Toasts.add('Too slow. It has told the others.'); } }
}
function shovel() {
  if (G.world.guest) return Toasts.add('No digging on visits. It is in the terms.');
  const w = G.world, p = G.player, [tx, tz] = p.frontTile(), P = G.place, e = entAt(w, tx, tz); p.actor.play('Dig', { then: 'Idle', restart: true }); p.busy = 0.75; const fx = tx + 0.5, fz = tz + 0.5;
  setTimeout0(() => {
    if (e?.t === 'rock') { G.ctx.audio.play('hitRock'); G.ctx.engine.shake.add(G.cameraShake ? 0.15 : 0); G.ctx.particles.burst('impact', [e.x, 0.6, e.z]); if (e.pay) { e.pay = 0; earn(w, 500); Toasts.add('Beans fly out of the rock! 500 of them. Rocks are a scam, but a nice one.'); G.ctx.audio.play('reveal'); bus.emit('rockPay'); } else if (rngOf(`${e.id}:${w.clock.day}:${w.clock.minute}`).chance(0.4)) { const sp = Nature.spawnBug(ITEMS.pillbug, e.x, e.z + 0.8, 0.15, 'rock'); Toasts.add('A pill bug comes out and refuses to comment.'); } return; }
    if (e?.t === 'stump') { removeEnt(w, e); G.ctx.audio.play('dig'); G.ctx.particles.burst('wood', [fx, 0.3, fz]); return; }
    if (e?.t === 'hole') { const i = hasItem(w, 'bag'); if (i >= 0) { const bag = w.p.pockets[i]; w.p.pockets[i] = null; removeEnt(w, e); addEnt(w, { t: 'buried', value: bag.value ?? 1000, x: fx, z: fz, day: w.clock.day }); G.ctx.audio.play('fill'); w.stats.buried = (w.stats.buried ?? 0) + 1; remember(w, 'buried'); bus.emit('buried'); return Toasts.add("You've planted money. Somewhere, a goose stirs."); } removeEnt(w, e); G.ctx.audio.play('fill'); return; }
    if (e?.t === 'crack') { removeEnt(w, e); G.ctx.audio.play('digMetal'); G.ctx.particles.burst('dirt', [fx, 0.1, fz]); G.ctx.engine.shake.add(G.cameraShake ? 0.1 : 0); G.rumble?.(0.5, 0.15); addEnt(w, { t: 'hole', x: fx, z: fz }); w.stats.fossils = (w.stats.fossils ?? 0) + 1; bus.emit('dug', e); collect('fossil_unk', { id: 'fossil_unk', real: e.real }); return; }
    if (e?.t === 'sparkle') { removeEnt(w, e); addEnt(w, { t: 'hole', x: fx, z: fz }); G.ctx.audio.play('digMetal'); collect('bag', { id: 'bag', value: Math.round(e.value * (w.p.buffs.luckFinds ? 1.5 : 1)) }, { reveal: true }); return; }
    if (e?.t === 'buried') { removeEnt(w, e); giveItem(w, { id: 'bag', value: e.value }); return; }
    if (e) return Toasts.add('Something is already there. It has rights.');
    const c = P.ch(tx, tz); if (!'.su'.includes(c)) return Toasts.add('Not here. The ground has its own lawyer.');
    G.ctx.audio.play('dig'); G.ctx.particles.burst('dirt', [fx, 0.1, fz]); addEnt(w, { t: 'hole', x: fx, z: fz });
  }, 0.4);
}
function axe() {
  if (G.world.guest) return Toasts.add("You can't fell your host's trees. They've got a goose.");
  const w = G.world, p = G.player, [tx, tz] = p.frontTile(), e = entAt(w, tx, tz); p.actor.play('Chop', { then: 'Idle', restart: true }); p.busy = 0.65;
  setTimeout0(() => { if (!e || e.t !== 'tree') return G.ctx.audio.play('netSwing'); G.ctx.audio.play('chop'); G.ctx.particles.burst('wood', [e.x, 0.9, e.z]); const v = G.view.ents.get(e.id); if (v) v.shake = 0.3; e.hits = (e.hits ?? 0) + 1; if (e.hits >= 3) { G.ctx.audio.play('treeFall'); removeEnt(w, e); addEnt(w, { t: 'stump', x: e.x, z: e.z }); G.ctx.particles.burst('leaf', [e.x, 2, e.z], { count: 14 }); w.stats.felled = (w.stats.felled ?? 0) + 1; remember(w, 'felled'); } }, 0.3);
}
function water() {
  const w = G.world, p = G.player, [tx, tz] = p.frontTile(); p.actor.play('Water', { then: 'Idle', restart: true }); p.busy = 0.7; G.ctx.audio.play('water'); G.ctx.particles.burst('splash', [tx + 0.5, 0.5, tz + 0.5], { count: 6 });
  let n = 0; for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const e = entAt(w, tx + dx, tz + dz); if (e?.t === 'flower') { e.wet = 1; e.dry = 0; if (e.wilted) { e.wilted = false; w.dirty = true; } n++; } if (e?.t === 'sapling') { e.wet = 1; n++; bus.emit('watered', e); } }
  if (n) { w.stats.watered = (w.stats.watered ?? 0) + n; bus.emit('wateredFlowers'); }
}
