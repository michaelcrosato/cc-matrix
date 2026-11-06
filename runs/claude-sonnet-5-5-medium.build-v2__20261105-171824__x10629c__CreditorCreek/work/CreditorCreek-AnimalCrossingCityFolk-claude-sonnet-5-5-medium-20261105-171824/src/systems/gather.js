// Reveal, pick-ups, trees, digging, flowers: the small verbs.
import { THREE, toonMaterial, PALETTE } from '../engine.js';
import { item, ITEMS } from '../data/items.js';
import { FISH, BUGS, FOSSILS, byId } from '../data/collect.js';
import { tuning } from '../data/tuning.js';
import { TW, T } from '../world/townMap.js';
import { QUILL_MIS } from '../data/dialogue.js';
import { seeded } from '../core/rng.js';
export const reveal = {
  async catchThing(g, def) {
    const w = g.world, p = g.player; const first = !w.coll[def.kind]?.[def.id] && !def.junk; const bucket = w.coll[def.kind]; if (bucket) bucket[def.id] = (bucket[def.id] ?? 0) + 1;
    if (def.kind === 'fish') w.stats.fish++; if (def.kind === 'bug') w.stats.bugs++;
    const ok = g.give(def.id); g.sys.memory.add(g, 'catch', { item: def.id }); g.errandProgress?.(def.kind === 'fish' ? 'fish' : def.kind === 'bug' ? 'bug' : def.kind, def); g.sys.contests?.onCatch?.(g, def);
    if (first) { p.hold = null; g.sfx('reveal'); const { buildCatchModel } = await import('../art/items3d.js'); const held = buildCatchModel(def); held.position.set(0, 1.05, 0); held.rotation.y = 0.6; p.actor.joints.Head.add(held); await p.act('HoldUp', 1.1); p.actor.joints.Head.remove(held); g.sparkle(p.pos.x, p.pos.z, 1.9); g.engine.screen?.flash?.('white', { duration: 0.08 }); await g.say(null, `You caught a ${def.name}! ${def.line}`); } else { g.sfx('pickup'); g.ui.toast(`${def.name}${ok ? '' : ' (pockets full: left on the ground)'}`); await p.act('PickUp', 0.35); }
    if (!ok) g.dropItem(def.id, p.pos.x + 0.8, p.pos.z + 0.8);
  },
};
export const items = {
  async pickup(g, it) { const w = g.world; const def = item(it.id); if (g.give(it.id, 1, it.real ? { real: it.real } : null)) { w.town.items.splice(w.town.items.indexOf(it), 1); g.town.syncItems(w.town.items); g.sfx('pickup'); g.ui.toast('Picked up: ' + def.name); await g.player.act('PickUp', 0.4); g.errandProgress?.('item', def); } else g.ui.toast('Your pockets are full. Even the lint left.'); },
};
export const trees = {
  async shake(g, t) {
    const w = g.world, p = g.player; if (t.stage < 2) { await g.say(null, 'A sapling. It would like to be left alone. It would also like water.'); return; }
    await p.act('ShakeTree', 0.8); g.sfx('shake'); g.shakeMesh(t); g.engine.shake?.add?.(0.1);
    const out = []; if (t.kind === 'pear' && t.fruit > 0) { for (let i = 0; i < t.fruit; i++) out.push('pear'); t.fruit = 0; }
    if (t.gift && !t.giftTaken) { out.push(t.gift); t.giftTaken = true; t.gift = null; }
    if (t.wasp && !t.waspDone) { t.waspDone = true; t.wasp = false; g.sfx('sting'); await this.wasps(g); return; }
    for (const id of out) { const a = g.rng() * 6.28; g.dropItem(id, t.x + 0.5 + Math.cos(a) * 1.3, t.z + 0.5 + Math.sin(a) * 1.3); }
    g.town.syncTrees(w.town.trees, g.season); g.sparkle(t.x + 0.5, t.z + 0.5, 2.2, 'lime');
    if (!out.length) g.ui.toast('Leaves fall. Nothing else does.');
  },
  async wasps(g) { const p = g.player; g.world.flags.sting = g.world.day; p.actor.play('Sting', { once: true, restart: true }); g.sfx('sting'); g.engine.shake?.add?.(0.4); await g.say(null, 'Wasps! They were not on the tree for the view. |Ow ow ow ow.'); g.world.flags.puffy = true; g.errandProgress?.('wasp'); g.sys.memory.add(g, 'sting'); },
  async chop(g) {
    if (g.visit?.role === 'guest') { g.ui.toast('Guests may not fell the host\'s trees. Manners.'); return; }
    const w = g.world, p = g.player; const f = verbsFront(g); const tx = Math.floor(f.x), tz = Math.floor(f.z); const t = w.town.trees.find(q => q.x === tx && q.z === tz && !q.felled);
    await p.act('Chop', 0.5); g.sfx('chop'); if (!t) { g.ui.toast('You chop the air. The air is fine.'); return; }
    t.hp--; g.shakeMesh(t); if (t.hp <= 0) { t.felled = true; t.stump = true; w.town.trees.splice(w.town.trees.indexOf(t), 1); w.town.holes.push({ x: t.x, z: t.z, stump: true }); g.dropItem('pear', t.x + 0.5, t.z + 1.5); g.syncAll(); g.sfx('stomp'); g.ui.toast('Timber! (Quietly.)'); }
  },
};
function verbsFront(g) { const p = g.player; const f = p.facing ?? { x: 0, z: 1 }; return { x: p.pos.x + f.x * 0.9, z: p.pos.z + f.z * 0.9 }; }
export const dig = {
  async use(g) {
    const w = g.world, p = g.player; const f = verbsFront(g); const tx = Math.floor(f.x), tz = Math.floor(f.z);
    const rock = w.town.rocks.find(r => r.x === tx && r.z === tz && !r.gone);
    await p.act('Dig', 0.8); g.sfx('dig');
    if (rock) { rock.hp--; g.sparkle(rock.x + 0.5, rock.z + 0.5, 0.8, 'mist'); g.engine.shake?.add?.(0.12); if (rock.payout) { g.dropItem('beanbag', rock.x + 0.5, rock.z + 1.4); } if (rock.hp <= 0) { rock.gone = true; g.syncAll(); const bug = g.rng() < 0.5; if (bug) { await g.sys.reveal.catchThing(g, BUGS.find(b => b.id === 'pillbug')); } } return; }
    const hole = w.town.holes.find(h => h.x === tx && h.z === tz);
    if (hole?.stump) { w.town.holes.splice(w.town.holes.indexOf(hole), 1); g.syncAll(); g.sfx('stomp'); g.ui.toast('Stump removed. The ground is relieved.'); g.dropItem('shell', tx + 0.5, tz + 1.2, true); return; }
    if (hole) { if (hole.buried) { g.ui.toast('Something is buried here. It is growing quietly.'); return; } w.town.holes.splice(w.town.holes.indexOf(hole), 1); g.syncAll(); g.sfx('dig'); return; }
    const crack = w.town.cracks.find(c => c.x === tx && c.z === tz && !c.dug); const tile = g.tiles[tz * TW + tx];
    if (tile !== T.GRASS && tile !== T.PATH && tile !== T.SAND && tile !== T.PLAZA || g.grid.solid(tx + 0.5, tz + 0.5)) { g.ui.toast("Can't dig here. It's a bad hole location."); return; }
    if (crack) { crack.dug = true; w.town.holes.push({ x: tx, z: tz }); g.syncAll(); if (crack.fossil) { const r = seeded('fossil', w.seed, w.day, tx, tz); const owned = Object.keys(w.coll.fossil); const id = FOSSILS[r.int(0, FOSSILS.length - 1)].id; g.dropItem('lump', tx + 0.5, tz + 1.3, true, id); await g.say(null, 'Something hard! |A fossil, or a very confident rock. Dr. Quill appraises these.'); g.errandProgress?.('dig'); } else { g.dropItem('beanbag', tx + 0.5, tz + 1.3); g.ui.toast('A bag of beans! Somebody buried their weekend.'); } }
    else { w.town.holes.push({ x: tx, z: tz }); g.syncAll(); if (g.rng() < (w.luck === w.day ? 0.4 : 0.15)) g.dropItem('shell', tx + 0.5, tz + 1.2); g.errandProgress?.('dig'); }
  },
  /** Bury a bag of beans: grows in 2 days, tripled. */
  bury(g, hole) { hole.buried = { day: g.world.day, year: g.world.year, n: 1000 }; },
};
export const flowers = {
  async water(g) {
    const w = g.world, p = g.player; const f = verbsFront(g); const tx = Math.floor(f.x), tz = Math.floor(f.z);
    await p.act('Water', 1.0); g.sfx('water'); let n = 0;
    for (const fl of w.town.flowers) if (Math.abs(fl.x - tx) <= 1 && Math.abs(fl.z - tz) <= 1) { fl.wet = 1; fl.wilt = false; fl.dry = 0; n++; g.sparkle(fl.x + 0.5, fl.z + 0.5, 0.6, 'sky'); }
    for (const t of w.town.trees) if (t.x === tx && t.z === tz && t.stage < 3) { t.watered = true; t.age = (t.age ?? 0) + 0.5; g.sparkle(t.x + 0.5, t.z + 0.5, 0.8, 'sky'); n++; g.errandProgress?.('water'); }
    for (const h of w.town.holes) if (h.x === tx && h.z === tz && h.buried) { h.buried.watered = true; n++; }
    if (g.sys.errands?.sapling && Math.hypot(tx + 0.5 - g.sys.errands.sapling.x, tz + 0.5 - g.sys.errands.sapling.z) < 1.5) { g.errandProgress?.('water'); n++; }
    g.syncAll(); if (!n) g.ui.toast('You water the ground. The ground says thanks, mostly.');
  },
  /** Plant a seed packet on this tile. */
  plant(g, tx, tz) { const w = g.world; if (w.town.flowers.find(q => q.x === tx && q.z === tz)) return false; w.town.flowers.push({ x: tx, z: tz, sp: Math.floor(g.rng() * 4), col: Math.floor(g.rng() * 4), wet: 0, age: 0 }); g.syncAll(); return true; },
};
