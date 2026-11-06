// The store and debt, Town Hall & Post, Museum, Mothwick's. Each host's talk is a generator.
import { THREE, buildModel, toonMaterial, PALETTE, setLookLayer } from '../engine.js';
import { G, bus } from '../state.js';
import { HOSTS_TALK, postLetter } from './talk.js';
import { Script, say, ask, Toasts, until, fill } from '../ui/dialogue.js';
import { GANDER, HOSTS, TYPE_LINES } from '../data/lines.js';
import { UI, menu } from '../ui/kit.js';
import { pocketsScreen, itemCard, keyboardScreen, catalogueScreen, chimeScreen, patternStudio, mailScreen, readLetter } from '../ui/screens.js';
import { ITEMS, sellPriceOf, buyPriceOf, FISH_LIST, BUG_LIST, FOSSIL_LIST, ART_LIST } from '../data/items.js';
import { T } from '../dev/tuning.js';
import { earn, giveItem, remember, friendGain, info, debtTotalFor, hasItem, addEnt, entAt, isFree, museumCount } from '../core/world.js';
import { fmt, rngOf, clamp } from '../core/util.js';
import { NPC } from '../actors/npcs.js';
import { CAST, NEIGHBOURS, nameOf } from '../data/cast.js';
import { cheesePrice } from './days.js';
import { rebuildRoom, ensureRoom } from '../world/places.js';
import { itemDef, BONES } from '../art/models.js';
import { buildFurn } from '../world/rooms.js';
import { paintingTexture } from '../art/textures.js';
const R = () => rngOf(`${G.world.seed}:s:${G.world.clock.day}:${G.world.clock.minute}:${G.time}`);
const line = (arr) => R().pick(arr);
export const storeTier = (w) => (w.p.spent >= 120000 ? 3 : w.p.spent >= 25000 ? 2 : 1);
export const debtLeft = (w) => w.p.debt;
// ---- Mrs. Gander
HOSTS_TALK.gander = function* (actor) {
  const w = G.world; yield say('gander', line(GANDER.greet), { actor });
  for (;;) {
    const opts = ['Sell something', w.p.debt > 0 ? `Pay debt (${fmt(w.p.debt)})` : w.p.tier < 4 ? 'Talk about the house' : 'Admire the deed', 'Chat', 'Bye'];
    const p = yield ask('gander', 'Now then.', opts, { actor, cancel: 3 });
    if (p === 0) yield* sellFlow(actor);
    else if (p === 1) { if (w.p.debt > 0) yield* payFlow(actor); else yield* upgradeFlow(actor); }
    else if (p === 2) yield say('gander', line(GANDER.misc), { actor });
    else { yield say('gander', "Mind how you go. It's all on the ledger.", { actor }); return; }
  }
};
function* sellFlow(actor) {
  const w = G.world; let done = false; const s = pocketsScreen({ title: 'Sell to Mrs. Gander', quote: true, pickLabel: 'Sell', onPick: (e, i, scr) => { const it = ITEMS[e.id]; if (it.noSell || sellPriceOf(e, T) <= 0) { Toasts.add("I shan't be taking that, dear."); return; } const price = sellPriceOf(e, T); UI.push(itemCard(it, { title: it.name, text: e.from ? `A gift from ${nameOf(e.from)}. They will hear about this.` : 'She has already written the number down.', price, yes: 'Sell', no: 'Keep', onYes: () => { w.p.pockets[i] = null; earn(w, price); w.stats.sold += price; G.ctx.audio.play('pickup'); Toasts.add(`+${fmt(price)} beans`); remember(w, e.from ? 'soldGift' : 'sold', { item: it.name, who: e.from }); bus.emit('sold', it, e, price); if (e.id === 'cheesewheel') bus.emit('cheeseSold', price, e.paid ?? 100); } })); }, onClose: () => { done = true; } }); UI.push(s); yield until(() => done);
  yield say('gander', line(GANDER.sell), { actor, tags: { item: 'its' } });
}
function* payFlow(actor) {
  const w = G.world; let amt = null; const steps = [1000, 5000, 10000, 50000, w.p.debt].filter((v, i, a) => v > 0 && v <= Math.min(w.p.debt, w.p.beans || 0) && a.indexOf(v) === i);
  const opts = steps.map((v) => `${fmt(v)} beans`); if (w.p.beans > 0 && !steps.includes(Math.min(w.p.beans, w.p.debt))) { steps.push(Math.min(w.p.beans, w.p.debt)); opts.push(`All I have (${fmt(Math.min(w.p.beans, w.p.debt))})`); } opts.push('Never mind');
  if (steps.length === 0) { yield say('gander', "With what, dear? I've seen your pockets. Figuratively. So far.", { actor }); return; }
  const p = yield ask('gander', `You owe ${fmt(w.p.debt)} beans. I know you know. I just enjoy saying it.`, opts, { actor, cancel: opts.length - 1 });
  if (p >= steps.length) return; const v = steps[p]; w.p.beans -= v; w.p.debt -= v; w.p.paidTotal += v; G.ctx.audio.play('stamp'); bus.emit('paid', v);
  if (w.p.debt <= 0) { w.p.debt = 0; if (w.p.tier >= 4) { w.flags.deed = true; remember(w, 'deed'); giveItem(w, 'b_medal_s'); yield say('gander', GANDER.final[0], { actor }); } else yield say('gander', GANDER.paidTier[0], { actor }); bus.emit('debtCleared', w.p.tier); }
  else yield say('gander', line(GANDER.pay), { actor });
}
function* upgradeFlow(actor) {
  const w = G.world; if (w.p.tier >= 4) { yield say('gander', w.flags.deed ? "Yes. It's gold-edged. No, I don't want to talk about it." : 'That is quite enough house, dear.', { actor }); return; }
  const next = w.p.tier + 1; const cost = Math.round(debtTotalFor(next - 1) * T.debt); const p = yield ask('gander', `A bigger place, then? Tier ${next}: ${fmt(cost)} beans added. No rush. Not that there was ever a choice about the rush.`, ['Build it', 'Not yet'], { actor, cancel: 1 });
  if (p === 0) { upgradeHome(next); yield say('gander', "It'll be up by the time you've walked home. Don't ask how. I've billed you for not asking.", { actor }); }
}
export function upgradeHome(tier) { const w = G.world; w.p.tier = tier; w.p.debt += Math.round(debtTotalFor(tier - 1) * T.debt); const def = ROOM(tier); Object.assign(ROOM_HOME, def); G.view.setHomeModel(tier); if (G.rooms.home) rebuildRoom('home'); bus.emit('homeTier', tier); }
import { ROOM_DEFS } from '../world/rooms.js';
const ROOM_HOME = ROOM_DEFS.home; const ROOM = (t) => (t <= 1 ? { w: 6, d: 6 } : { w: 8, d: 8 });
export function homeDoors(w) { const out = []; if (w.p.tier >= 3) out.push({ x: -0.3, z: 3, to: 'home_annex', tx: 3, tz: 5.3, kind: 'wall', label: 'The Annex' }); if (w.p.tier >= 4) out.push({ x: 1, z: -0.3, to: 'home_up', tx: 4, tz: 7.3, kind: 'back', label: 'Upstairs' }); return out; }
// ---- Clementine
HOSTS_TALK.clementine = function* (actor) {
  const w = G.world; yield say('clementine', line(HOSTS.clementine), { actor });
  for (;;) {
    const opts = ['Post a letter', 'Bean Jar', 'Catalogue', 'Town rating', 'Village Chime', 'Bye'];
    const p = yield ask('clementine', 'What can the bee and I do for you?', opts, { actor, cancel: 5 });
    if (p === 0) yield* letterFlow(actor);
    else if (p === 1) yield* jarFlow(actor);
    else if (p === 2) { let done = false; const s = catalogueScreen(); const orig = s.input; UI.push(s); yield until(() => !UI.stack.includes(s)); }
    else if (p === 3) { const [text, hint] = townRating(w); yield say('clementine', `${text} | The bee says: ${hint}`, { actor }); bus.emit('rating'); }
    else if (p === 4) { const s = chimeScreen(); UI.push(s); yield until(() => !UI.stack.includes(s)); yield say('clementine', 'Lovely. It sounds exactly like itself.', { actor }); }
    else { yield say('clementine', "Take care. There's no hurry. There's never any hurry.", { actor }); return; }
  }
};
export function* letterFlow(actor) {
  const w = G.world; const list = [...NEIGHBOURS.filter((n) => !['gone', 'notyet'].includes(w.npcs[n].moved)), 'gran']; const names = list.map((n) => CAST[n].short ?? CAST[n].name).slice(0, 8);
  const p = yield ask('clementine', 'Who is it to?', [...names.slice(0, 5), 'Someone else…'], { actor, cancel: 5 }); let to = list[p]; if (p === 5) { const p2 = yield ask('clementine', 'And now?', [...names.slice(5), 'Never mind'], { actor, cancel: names.length - 5 }); if (p2 >= names.length - 5) return; to = list[5 + p2]; }
  let text = null; const k = keyboardScreen({ title: `Dear ${CAST[to].short ?? CAST[to].name}…`, max: 90, lines: true, opaque: false, onDone: (t) => { text = t; }, onCancel: () => { text = false; } }); UI.push(k); yield until(() => text !== null); if (!text) return;
  let gift = null; const g = yield ask('clementine', 'Attach a gift?', ['Yes', 'No'], { actor, cancel: 1 }); if (g === 0) { let d = false; UI.push(pocketsScreen({ title: 'Attach a gift', pickLabel: 'Attach', onPick: (e, i, s) => { gift = e; w.p.pockets[i] = null; UI.pop(s); d = true; }, onClose: () => { d = true; } })); yield until(() => d); }
  G.ctx.audio.play('stamp'); postLetter(to, text, gift); bus.emit('posted', to, text); yield say('clementine', "Your letter's stamped. A bee has been living in the stamp drawer. We've agreed to share.", { actor });
}
function* jarFlow(actor) {
  const w = G.world; const p = yield ask('clementine', `You have ${fmt(w.p.jar)} beans in the Jar. It pays half a percent a season. We are very interested.`, ['Deposit', 'Withdraw', 'Never mind'], { actor, cancel: 2 });
  if (p === 2) return; const amts = [1000, 5000, 20000]; const src = p === 0 ? w.p.beans : w.p.jar; const opts = amts.filter((a) => a <= src).map((a) => fmt(a)); if (src > 0) opts.push(`All (${fmt(src)})`); opts.push('Never mind'); const q = yield ask('clementine', 'How much?', opts, { actor, cancel: opts.length - 1 }); if (q === opts.length - 1) return; const v = q < opts.length - 2 ? amts.filter((a) => a <= src)[q] : src; if (p === 0) { w.p.beans -= v; w.p.jar += v; } else { w.p.jar -= v; w.p.beans += v; } G.ctx.audio.play('pickup'); bus.emit('jar'); yield say('clementine', 'Done. The bee counted it. It came out fine. It always comes out fine.', { actor });
}
export function townRating(w) {
  const ents = Object.values(w.ents); const trees = ents.filter((e) => e.t === 'tree').length, flowers = ents.filter((e) => e.t === 'flower' && !e.wilted).length, weeds = ents.filter((e) => e.t === 'weed').length, litter = ents.filter((e) => e.t === 'item' || e.t === 'hole').length;
  let score = 50; if (trees >= 40 && trees <= 70) score += 20; else score -= Math.min(20, Math.abs(trees - 55) / 2); score += Math.min(20, flowers * 0.8); score -= Math.min(25, weeds * 1.5); score -= Math.min(10, litter); score = clamp(Math.round(score), 0, 100); w.rating = score;
  const text = score >= 80 ? 'The town looks wonderful. I checked twice, out of habit.' : score >= 60 ? 'The town is doing fine. I said fine, and I meant it.' : score >= 40 ? "It's a town. It has things in it. Some of them are weeds." : 'It has the look of a place that has stopped opening its post.';
  const hint = trees < 40 ? 'More trees.' : trees > 70 ? 'Fewer trees. There is such a thing.' : flowers < 15 ? 'More flowers. Water them. That is what they ask.' : weeds > 3 ? 'Pull the weeds. Yes, those.' : litter > 4 ? 'Things are lying about.' : 'Carry on. Nobody needs you to, but do.';
  return [text, hint];
}
// ---- Dr. Quill and the museum wings
HOSTS_TALK.quill = function* (actor) {
  const w = G.world; if (!w.flags.museumOpen && w.clock.day < 2 && !w.flags.day1Fossil) { yield say('quill', "We open tomorrow! Or we've been open for years! Come back when I've found the door.", { actor }); return; }
  w.flags.museumOpen = true; yield say('quill', line(HOSTS.quill), { actor });
  for (;;) {
    const opts = ['Donate something', 'Identify a fossil', 'Chat', 'Bye'];
    const p = yield ask('quill', 'What have you brought me?', opts, { actor, cancel: 3 });
    if (p === 0) yield* donateFlow(actor);
    else if (p === 1) yield* appraiseFlow(actor);
    else if (p === 2) yield say('quill', line(HOSTS.quill), { actor });
    else return;
  }
};
const wingOf = (it) => ({ fish: 'fish', bug: 'bug', fossil: 'fossil', art: 'art' }[it.cat]);
function* appraiseFlow(actor) {
  const w = G.world; const i = hasItem(w, 'fossil_unk'); if (i < 0) { yield say('quill', "You've nothing unidentified. Well. You, yourself, a bit. But no fossils.", { actor }); return; }
  const e = w.p.pockets[i]; const real = e.real ?? 'trilobite'; const it = ITEMS[real]; w.p.pockets[i] = { id: real }; w.almanac.seen[real] = (w.almanac.seen[real] ?? 0) + 1; G.ctx.audio.play('reveal'); bus.emit('appraised', it); yield say('quill', `A fossil! Or a very confident potato! Let me see… it's ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}! ${it.line}`, { actor });
}
function* donateFlow(actor) {
  const w = G.world; let chosen = null; UI.push(pocketsScreen({ title: 'Donate to the Museum', pickLabel: 'Donate', onPick: (e, i, s) => { chosen = { e, i }; UI.pop(s); }, onClose: () => { chosen = chosen ?? false; } })); yield until(() => chosen !== null); if (!chosen) return;
  const { e, i } = chosen, it = ITEMS[e.id], wing = wingOf(it);
  if (!wing) { if (e.id === 'fossil_unk') { yield say('quill', "Identify it first! It might be a fossil! It might be my lunch!", { actor }); return; } yield say('quill', "It's very nice! It isn't a fish, bug, fossil or painting, though. I checked by licking it.", { actor }); return; }
  if (it.cat === 'art' && e.forged) { w.p.pockets[i] = null; remember(w, 'forgery'); w.stats.forgeries = (w.stats.forgeries ?? 0) + 1; bus.emit('forgery'); const a = NPC.actors.quill; a.play('Cry', { then: 'Idle' }); yield say('quill', "Oh. Oh, no. There's an extra earring. Or a missing star. I can tell, even at this distance. | I'm not angry. I'm just very, very disappointed. I'll keep it in the basement, with the others. | Don't go to that magpie.", { actor }); return; }
  if (w.museum[wing][it.id]) { yield say('quill', "We've got one! It's lovely! Two would just make the first one anxious!", { actor }); return; }
  w.p.pockets[i] = null; w.museum[wing][it.id] = w.name; G.ctx.audio.play('reveal'); bus.emit('donated', it, wing); remember(w, 'donated', { item: it.name }); if (G.rooms['m_' + wing]) syncWing('m_' + wing);
  const a = NPC.actors.quill; a.play('QuillBall', { then: 'Idle' }); const total = { fish: FISH_LIST.length, bug: BUG_LIST.length, fossil: FOSSIL_LIST.length, art: ART_LIST.length }[wing]; const n = Object.keys(w.museum[wing]).length;
  yield say('quill', `It's perfect! It's already in the ${{ fish: 'Aquarium', bug: 'Insectarium', fossil: 'Fossil Hall', art: 'Gallery' }[wing]}! I'm so happy I've rolled up! Could somebody— thank you!`, { actor });
  if (n >= total && !w.flags['plaque_' + wing]) { w.flags['plaque_' + wing] = true; earn(w, 10000); yield say('quill', `The wing is full! There's a plaque with your name on it! ${w.name.split('').reverse().join('')}. Have I got that right? Here's ten thousand beans for the spelling.`, { actor }); }
}
/** Each donated thing appears in place in its wing. */
export function syncWing(id) {
  const r = G.rooms[id]; if (!r) return; const w = G.world; const wing = r.def.wing; r.exh ??= new Map(); const list = { fish: FISH_LIST, bug: BUG_LIST, fossil: FOSSIL_LIST, art: ART_LIST }[wing];
  list.forEach((it, i) => { const have = !!w.museum[wing][it.id]; let o = r.exh.get(it.id); if (have && !o) { o = exhibit(r, wing, it, i); r.group.add(o); r.exh.set(it.id, o); } if (o) o.visible = have; });
}
function exhibit(r, wing, it, i) {
  const g = new THREE.Group(); const cols = wing === 'art' ? 4 : 6; const x = r.ox + 1.1 + (i % cols) * ((r.def.w - 2) / (cols - 1)); const z = wing === 'art' ? 0.05 : 0.9 + Math.floor(i / cols) * 1.5;
  if (wing === 'art') { const tex = paintingTexture(it.art, false); const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.08), toonMaterial(PALETTE.sand)); const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), toonMaterial(PALETTE.white, { map: tex })); pic.position.z = 0.05; frame.position.y = 0; g.add(frame, pic); g.position.set(x + (i >= 4 ? 0 : 0), i >= 4 ? 1.1 : 2.3, z + 0.05); g.position.x = r.ox + 1.3 + (i % 4) * 2.4; return g; }
  if (wing === 'fish') { const tank = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.9), toonMaterial(PALETTE.cyan)); tank.position.y = 0.9; const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1), toonMaterial(PALETTE.plum)); base.position.y = 0.22; g.add(base, tank); const m = buildModel(itemDef(it), {}).object; m.position.set(0, 0.75, 0.48); g.add(m); g.userData.swim = m; }
  else if (wing === 'bug') { const dome = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), toonMaterial(PALETTE.lime)); dome.position.y = 0.75; const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 0.9), toonMaterial(PALETTE.plum)); base.position.y = 0.17; g.add(base, dome); const m = buildModel(itemDef(it), {}).object; m.position.set(0, 0.8, 0.44); g.add(m); g.userData.flutter = m; }
  else { const spot = { moat_tail: [1.2, 1.1], moat_torso: [2.4, 1.1], moat_skull: [3.6, 1.1], regret_torso: [5.8, 1.1], regret_neck: [7, 1.1], regret_skull: [8.2, 1.1], trilobite: [1.6, 3.3], ammonite: [3.6, 3.3], amberfly: [6.4, 3.3], tooth: [8.4, 3.3] }[it.id]; const m = buildModel(BONES[it.id], {}).object; m.traverse((q) => { if (q.isMesh) q.castShadow = true; }); g.add(m); g.position.set(r.ox + spot[0], 0, spot[1]); r.place.rects.push({ x0: r.ox + spot[0] - 0.6, z0: spot[1] - 0.5, x1: r.ox + spot[0] + 0.6, z1: spot[1] + 0.5 }); return g; }
  g.position.set(x, 0, z); r.place.rects.push({ x0: x - 0.55, z0: z - 0.5, x1: x + 0.55, z1: z + 0.5 }); return g;
}
export function animateWings(t) { const p = G.world.p.place; const r = G.rooms[p]; if (!r?.exh) return; for (const o of r.exh.values()) { if (o.userData.swim) { const m = o.userData.swim; m.position.x = Math.sin(t + o.position.x) * 0.3; m.rotation.y = Math.cos(t + o.position.x) > 0 ? Math.PI / 2 : -Math.PI / 2; } if (o.userData.flutter) { const m = o.userData.flutter; m.position.y = 0.8 + Math.sin(t * 4 + o.position.x) * 0.15; m.position.x = Math.sin(t * 2 + o.position.x) * 0.2; } } }
// ---- Madame Mothwick
HOSTS_TALK.mothwick = function* (actor) {
  yield say('mothwick', line(HOSTS.mothwick), { actor }); const p = yield ask('mothwick', 'Well? What is it? Do not tell me.', ["See today's rail", 'Pattern studio', 'Bye'], { actor, cancel: 2 });
  if (p === 0) yield* railFlow(G.world.moth?.stock ?? [], 'mothwick', actor); else if (p === 1) yield* patternFlow(actor); else yield say('mothwick', 'Go! No, wait. Go!', { actor });
};
export function* railFlow(stock, host, actor) { const w = G.world; let left = true; while (left) { const items = stock.filter((s) => !s.sold); if (!items.length) { yield say(host, 'That is everything. You have eaten me out of shop.', { actor }); return; } const p = yield ask(host, 'Look, but do not breathe on it.', [...items.slice(0, 5).map((s) => `${ITEMS[s.id].name}, ${fmt(buyPriceOf(ITEMS[s.id], T))}`), 'Leave it'], { actor, cancel: Math.min(items.length, 5) }); if (p >= Math.min(items.length, 5)) return; const s = items[p]; yield* buyItem(s, host, actor); } }
export function* buyItem(s, host, actor, priceOverride) {
  const w = G.world, it = ITEMS[s.id], price = priceOverride ?? buyPriceOf(it, T); if (w.p.beans < price) { yield say(host, host === 'gander' ? "You haven't the beans, dear. I've checked. I check often." : "You haven't the beans. Everyone can tell.", { actor }); return false; } if (G.world.p.pockets.indexOf(null) < 0) { yield say(host, 'Your pockets are full. How do you walk?', { actor }); return false; }
  let ans = null; UI.push(itemCard(it, { price, yes: 'Buy', no: 'Leave it', onYes: () => { ans = true; }, onNo: () => { ans = false; } })); yield until(() => ans !== null); if (!ans) return false;
  w.p.beans -= price; w.p.spent += price; s.sold = true; giveItem(w, { id: it.id }); w.catalog[it.id] = true; G.ctx.audio.play('pickup'); remember(w, 'bought', { item: it.name }); bus.emit('bought', it); if (s.onBuy) s.onBuy(); if (host === 'gander') { const t = storeTier(w); if (t !== w.flags.storeTier) { w.flags.storeTier = t; G.view.setStoreModel(t); } } return true;
}
export function* patternFlow(actor) { let slot = 0; const s = patternStudio((sl) => { slot = sl; }); UI.push(s); yield until(() => !UI.stack.includes(s)); const w = G.world; const p = yield ask('mothwick', 'You have made a *thing*. Where shall it live? I shall try very hard not to eat it.', ['On my shirt', 'On my umbrella', 'As a ground tile by my door', 'As a sign by my door', 'Nowhere yet'], { actor, cancel: 4 }); if (p === 0) { w.p.look.pattern = slot; G.player.rebuild(); bus.emit('patternWorn'); } else if (p === 1) { w.p.look.umbrella = 'u_pattern'; w.p.look.umbPattern = slot; G.player.umb = null; bus.emit('patternUmbrella'); } else if (p === 2 || p === 3) { const spots = [[72, 37], [76, 37], [71, 38], [77, 38], [73, 38], [75, 38], [70, 37], [78, 37]]; const sp = spots.find(([x, z]) => !entAt(w, x, z)); if (sp) { addEnt(w, { t: p === 2 ? 'pattile' : 'patsign', slot, x: sp[0] + 0.5, z: sp[1] + 0.5 }); G.ctx.audio.play('thud'); w.stats.patternPlaced = (w.stats.patternPlaced ?? 0) + 1; bus.emit('patternPlaced'); } } }
// ---- Store shelves: real objects, walk up, press
export function syncStoreShelves() {
  const r = G.rooms.store; if (!r) return; const w = G.world; if (r.stockDay === w.shop.day) return; r.stockDay = w.shop.day; r.stock?.forEach((o) => r.group.remove(o.obj)); r.stock = [];
  const spots = [[4.4, 1.2], [5, 1.2], [5.6, 1.2], [7.4, 1.2], [8, 1.2], [8.6, 1.2], [4.4, 4.2], [5, 4.2], [5.6, 4.2], [7.4, 4.2], [8, 4.2], [8.6, 4.2], [1, 5.5], [2.3, 5.5], [1, 6.7], [2.3, 6.7], [3.6, 6.7]];
  w.shop.stock.forEach((s, i) => { const sp = spots[i]; if (!sp) return; const it = ITEMS[s.id]; const o = new THREE.Group(); try { if (it.cat === 'furn' && !sp[0]) throw 0; const m = it.cat === 'furn' ? buildFurn(it.model, it.palette).object : buildModel(itemDef(it), {}).object; m.scale.setScalar(it.cat === 'furn' ? 0.45 : 0.9); o.add(m); } catch { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), toonMaterial(PALETTE.orange)); o.add(m); } o.position.set(r.ox + sp[0], sp[1] > 5 ? 0 : 0.86, sp[1]); r.group.add(o); r.stock.push({ s, obj: o, x: r.ox + sp[0], z: sp[1] + (sp[1] > 5 ? 0 : 0.5) }); o.visible = !s.sold; });
}
export function storeTargets(r) { const out = []; syncStoreShelves(); for (const st of r.stock ?? []) { if (st.s.sold) continue; const it = ITEMS[st.s.id]; out.push({ kind: 'shelf', x: st.x, z: st.z, reach: 1.1, label: it.name, verb: 'Look at', act: () => Script.run((function* () { const ok = yield* buyItem(st.s, 'gander', NPC.actors.gander); if (ok) { st.obj.visible = false; if (it.cat === 'tool') { } } })()) }); } return out; }
