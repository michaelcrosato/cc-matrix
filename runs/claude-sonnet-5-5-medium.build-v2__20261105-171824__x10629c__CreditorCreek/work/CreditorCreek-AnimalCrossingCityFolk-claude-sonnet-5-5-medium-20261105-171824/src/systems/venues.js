// Interiors and their hosts: store, hall, museum, Mothwick's, cottages, home; later the City venues add to ROOMS.
import { THREE } from '../engine.js';
import { Actor } from '../actors/actor.js';
import { HOSTS, NEIGHBOURS } from '../data/neighbours.js';
import { defRoom, ROOMS, furnMesh } from '../world/rooms.js';
import { part } from '../world/scenery.js';
import { item, FURNITURE, CLOTHES } from '../data/items.js';
import { FISH, BUGS, FOSSILS, ART } from '../data/collect.js';
import { HOST_LINES, GANDER, QUILL_MIS, renderLine } from '../data/dialogue.js';
import { ListScreen, PocketsScreen, confirmBox, TextEntry } from '../ui/screens.js';
import { HOME_TIERS } from './economy.js';
import { drawItemIcon } from '../ui/icons.js';
import { buildFish, buildBugModel, buildPainting, buildSkeleton } from '../art/items3d.js';
import { buildFossilSingle } from '../world/scenery.js';
import { buildModel } from '../engine.js';
import { chairDef, scopeDef, boardDef, rugDef, mailboxDef, cabinetDef, tableDef, trophyDef, shelfDef, counterDef, stageDef, seatDef, plinthDef } from '../art/models.js';
const prop = (grp, def, at, o = {}) => { const m = buildModel(def, o).object; m.position.set(...at); grp.add(m); return m; };
const hostActors = {};
const NPCISH = (id) => { const h = HOSTS[id]; return { id, name: h.name, type: h.type ?? 'hearth', pitch: h.pitch, voice: h.voice ?? (h.pitch > 1.2 ? 'squeak' : h.pitch < 0.7 ? 'gruff' : 'warm'), slow: h.slow, fast: h.fast, actor: hostActors[id] }; };
export const venues = {
  host(id) { return NPCISH(id); },
  updateRoomActors(g, dt) { const def = ROOMS[g.place]; if (def?.group?.userData.critters) for (const c of def.group.userData.critters) { if (c.still) continue; const t = g.t + c.ph; c.mesh.position.set(c.cx + Math.sin(t * (c.kind === 'tank' ? 0.9 : 1.7)) * 0.3, c.cy + Math.sin(t * 1.3) * (c.kind === 'tank' ? 0.1 : 0.2), c.cz + Math.cos(t * 0.7) * 0.15); c.mesh.rotation.y = Math.cos(t * (c.kind === 'tank' ? 0.9 : 1.7)) > 0 ? Math.PI / 2 : -Math.PI / 2; } if (!def?.actors) return; for (const a of def.actors) a.update(dt, g.t); },
  defineRooms() {
    if (ROOMS.store) return;
    defRoom({ id: 'store', w: 12, d: 9, floor: 'sand', wall: 'sand', music: 'store', name: "Mrs. Gander's" }); defRoom({ id: 'hall', w: 10, d: 8, floor: 'mist', wall: 'white', music: 'hall', name: 'Town Hall & Post' });
    defRoom({ id: 'museum', w: 18, d: 12, floor: 'white', wall: 'sky', music: 'museum', name: 'Museum', h: 4 }); defRoom({ id: 'mothwick', w: 10, d: 8, floor: 'plum', wall: 'mist', music: 'mothwick', name: "Mothwick's" });
    defRoom({ id: 'annex', w: 6, d: 6, floor: 'mist', wall: 'sky', music: 'hall', name: 'Annex', exitTo: 'home' }); defRoom({ id: 'upstairs', w: 8, d: 8, floor: 'sand', wall: 'white', music: 'hall', name: 'Upstairs', exitTo: 'home' });
    defRoom({ id: 'home', w: 8, d: 8, floor: 'orange', wall: 'sand', music: 'hall', name: 'Home' });
    for (const n of NEIGHBOURS) if (n.id !== 'fitch') defRoom({ id: 'house_' + n.id, w: 7, d: 6, floor: ['orange', 'sand', 'plum', 'mist', 'green', 'slate', 'night', 'white'][NEIGHBOURS.indexOf(n) % 8], wall: ['sand', 'white', 'mist', 'sky'][NEIGHBOURS.indexOf(n) % 4], music: 'hall', name: n.name + "'s house", owner: n.id });
  },
  dress(g, def) {
    const grp = def.group; def.props = []; const add = (m, x, z, y = 0, rot = 0) => { m.position.set(x, y, z); m.rotation.y = rot; grp.add(m); return m; };
    const bl = (x, z, w = 1, d = 1) => { const L = def; for (let zz = Math.floor(z); zz < Math.floor(z) + d; zz++) for (let xx = Math.floor(x); xx < Math.floor(x) + w; xx++) { if (def.rows[zz]) def.rows[zz] = def.rows[zz].slice(0, xx) + '#' + def.rows[zz].slice(xx + 1); } };
    const hostAt = (id, x, z, label, run, rot = 0) => { const h = HOSTS[id]; const a = new Actor({ species: h.species, c: h.color, a: h.accent, name: h.name }); a.setPos(x, z); a.yaw = rot; a.play('Idle'); grp.add(a.root); hostActors[id] = a; def.actors ??= []; def.actors.push(a); def.props.push({ x, z, label, run, r: 2 }); bl(x - 0.5, z - 0.5, 1, 1); return a; };
    const side = (m, x, z, rot = 0) => add(m, x, z, 0, rot);
    const sayHost = async (g2, id, lines) => { const h = NPCISH(id); await g2.say(h, lines[Math.floor(g2.rng() * lines.length)].text ?? lines[0]); };
    const grid = (id) => { /* rebuild collision after props */ import('../world/places.js').then(m => {}); };
    if (def.id === 'store') {
      hostAt('gander', 6, 2.2, 'Talk to Mrs. Gander', async (g2) => { const h = NPCISH('gander'); const c = await g2.ask(h, GANDER[Math.floor(g2.rng() * GANDER.length)].text, ['Pay debt', 'Sell', 'Deliver parcel', 'Bye']); if (c === 0) await g2.sys.economy.payDebt(g2); else if (c === 1) await g2.sys.economy.sellMenu(g2); else if (c === 2) { if (!(await g2.sys.errands.onGiveParcel(g2))) await g2.say(h, 'Parcels? Soup? I have no memory of any such thing. Put it on the counter, dear, and we will both forget.'); else await g2.say(h, "A parcel. Of soup. It is NOT soup. |...It is slightly soup. Thank you."); } }, 0);
      // shelves with real objects
      const stock = () => g.sys.economy.stock(g); def.shelfDefs = [];
      for (let i = 0; i < 8; i++) { const x = 1.8 + i * 1.2, z = 5.2; prop(grp, shelfDef, [x, 0, z], { params: { w: 1.0 } }); def.shelfDefs.push({ x, z: z + 0.8, slot: i }); const mesh = new THREE.Group(); mesh.position.set(x, 0.95, z); grp.add(mesh); def.shelfDefs[i].mesh = mesh;
        def.props.push({ x, z: z + 0.9, r: 1.3, hidden: () => !def.shelfDefs[i].item, label: () => { const it = def.shelfDefs[i].item; return it ? `${it.name}: ${Math.round((it.price || 400) * g.sys.economy.buyMult())} beans` : ''; }, run: async (g2) => { const it = def.shelfDefs[i].item; if (it) await g2.sys.economy.buy(g2, it); } }); }
      bl(1, 5.1, 10, 1);
      def.refreshShelves = (g2) => { const s = g2.sys.economy.stock(g2); const all = [...s.goods.slice(0, 5), ...s.tools.slice(0, 3)]; def.shelfDefs.forEach((sd, i) => { sd.item = all[i] ?? null; sd.mesh.clear(); if (sd.item) { const it = sd.item; if (it.kind === 'furniture') sd.mesh.add(furnMesh(it.model, it.tint, 0.55)); else { part(sd.mesh, 'box', [0.4, 0.4, 0.4], [0, 0.2, 0], it.kind === 'clothes' ? it.color : it.kind === 'tool' ? 'mist' : 'lime'); part(sd.mesh, 'ball', [0.2, 0.2, 0.2], [0, 0.55, 0], 'sand'); } } }); };
    } else if (def.id === 'hall') {
      hostAt('clementine', 5, 2.2, 'Talk to Clementine', async (g2) => { const h = NPCISH('clementine'); if (await g2.sys.errands.onTalkHost(g2, 'clementine')) return; if (g2.world.day >= 3 && !g2.world.flags.chime && !g2.world.flags.chimeAsked) { g2.world.flags.chimeAsked = true; await g2.say(h, 'The Old Bell has been plain for years. Would you compose its Village Chime? Sixteen steps. The bee has hummed a few for reference. They were all the same note.'); }
      const c = await g2.ask(h, HOST_LINES.clementine[Math.floor(g2.rng() * 2)].text, ['Bean Jar', 'Write a letter', 'Town rating', 'Village Chime', 'Catalogue', 'Bye']); if (c === 0) await g2.sys.economy.bank(g2); else if (c === 1) await g2.sys.mail.write(g2); else if (c === 2) { const r = g2.sys.rating.townScore(g2); await g2.say(h, `Your town rates ${r.grade}. ${r.weeds > 5 ? 'Weeds, mostly. The bee says: weeds.' : r.flowers < 6 ? 'Needs flowers. The bee agrees, loudly.' : 'Respectable. Tidy. The bee approves.'} ${r.trees < 40 ? 'More trees, dear.' : ''}`); } else if (c === 3) await g2.sys.chimeEdit.open(g2); else if (c === 4) await g2.sys.catalogue.open(g2); }, 0);
      prop(grp, mailboxDef, [1.2, 0, 1.2]); def.props.push({ x: 1.2, z: 2.3, label: () => `Mailbox${g.sys.mail.unread(g) ? ' (new!)' : ''}`, run: async (g2) => { await g2.sys.mail.mailbox(g2); }, r: 1.6 });
      prop(grp, cabinetDef, [8.3, 0, 1.2]); def.props.push({ x: 8.3, z: 2.2, label: 'Lost & Found', run: async (g2) => { await g2.sys.lostFound.open(g2); }, r: 1.6 });
      prop(grp, counterDef, [5, 0, 3.4]); bl(3.7, 3.1, 2.6, 1);
    } else if (def.id === 'museum') {
      hostAt('quill', 9, 2.4, 'Talk to Dr. Quill', async (g2) => { await g2.sys.museum.talk(g2); }, 0);
      // wings: four zones with display slots
      const WINGS = [['fish', 2, 5.5, FISH.filter(f => !f.junk)], ['bug', 6.6, 5.5, BUGS], ['fossil', 11, 5.5, FOSSILS], ['art', 15, 5.5, ART]]; def.displays = [];
      WINGS.forEach(([kind, wx, wz, list]) => { prop(grp, plinthDef, [wx + 1.2, 0, wz + 1], { palette: { pad: kind === 'fish' ? 'sky' : kind === 'bug' ? 'lime' : kind === 'fossil' ? 'sand' : 'plum' } });
        list.forEach((it, i) => { const m = new THREE.Group(); m.visible = false; grp.add(m);
          if (kind === 'art') { m.add(buildPainting(it.id)); m.position.set(wx + (i % 8) * 0.45 + 0.2, 1.6, 3.3 + Math.floor(i / 8) * 0.01); m.scale.setScalar(0.5); }
          else if (kind === 'fish') { part(m, 'box', [0.8, 0.6, 0.5], [0, 0.4, 0], 'cyan'); const f = buildFish(it); f.scale.setScalar(0.5); f.position.y = 0.45; m.add(f); m.position.set(wx + (i % 4) * 0.9, 0.1, wz + Math.floor(i / 4) * 0.8); }
          else if (kind === 'bug') { part(m, 'box', [0.6, 0.06, 0.6], [0, 0.15, 0], 'white'); const b = buildBugModel(it); b.position.y = 0.3; m.add(b); m.position.set(wx + (i % 4) * 0.9, 0.1, wz + Math.floor(i / 4) * 0.8); }
          else if (!it.set) { m.add(buildFossilSingle(i % 4)); m.position.set(wx + (i % 4) * 0.9, 0.1, wz + Math.floor(i / 4) * 0.8 + 1.4); }
          else m.visible = false;
          def.displays.push({ id: it.id, kind, mesh: m }); }); });
      def.skeletons = new THREE.Group(); def.skeletons.position.set(12.4, 0, 8.6); grp.add(def.skeletons);
      def.syncDisplays = (g2) => { for (const d of def.displays) if (!d.mesh.children.length || d.kind !== 'fossil' || !FOSSILS.find(f => f.id === d.id)?.set) d.mesh.visible = !!g2.world.donated[d.id]; def.skeletons.clear(); const don = g2.world.donated; const a = buildSkeleton('moatosaur', don), b2 = buildSkeleton('regretodon', don); a.position.set(0, 0, 0); b2.position.set(3.4, 0, 0); def.skeletons.add(a, b2); };
      bl(2, 5.4, 14, 3);
    } else if (def.id === 'mothwick') {
      hostAt('mothwick', 5, 2.2, 'Talk to Madame Mothwick', async (g2) => { await g2.sys.shops.mothwick(g2); }, 0);
      part(grp, 'box', [1, 2.2, 0.5], [1.2, 1.1, 1.0], 'sand'); part(grp, 'cyl', [0.8, 0.35, 0.8], [8, 0.2, 2.2], 'red'); bl(1, 1, 1, 1);
    } else if (def.id === 'annex' || def.id === 'upstairs') {
      part(grp, 'box', [1.6, 0.4, 1], [3, 0.2, 2.5], 'plum'); def.props.push({ x: 3, z: 2.5, r: 1.8, label: def.id === 'annex' ? 'A room for a hobby (empty, by choice)' : 'A plaque: "Here lived someone in debt."', run: async (g2) => { await g2.say(null, def.id === 'annex' ? 'The annex is mostly echo. The goose calls it an amenity.' : 'Upstairs. A gold-edged plaque. The goose has not stopped smiling, which is terrible.'); } });
    def.refreshHome = (g2) => g2.sys.homeRoom.refresh(g2, def);
    } else if (def.id === 'home') {
      def.props.push({ x: 7, z: 1.3, label: 'Mailbox', run: async (g2) => g2.sys.mail.mailbox(g2), r: 1.3, hidden: () => true });
      def.refreshHome = (g2) => g2.sys.homeRoom.refresh(g2, def);
    } else if (def.owner) {
      const n = NEIGHBOURS.find(q => q.id === def.owner); const spec = { id: 'x' }; // personalised props per type
      const set = { hearth: [['table', 3, 3, 'orange'], ['pot', 5.5, 1.2, 'slate']], sunshine: [['table', 3, 3, 'sand'], ['sun', 5.4, 1.2, 'sand']], grouch: [['chair', 3, 3, 'ink']], diva: [['rug', 3.5, 3, 'plum'], ['tiara', 5.5, 1.2, 'sand']], gogetter: [['trophy', 2, 1.2, 'sand'], ['trophy', 3.2, 1.2, 'sand'], ['bench', 4.5, 3.5, 'mist']], dreamer: [['books', 2, 1.2, 'plum'], ['scope', 5.5, 1.2, 'night']], schemer: [['board', 3.5, 0.5, 'orange'], ['box', 2, 3, 'sand']], auntie: [['rug', 3.5, 3, 'red'], ['wool', 5, 1.4, 'white']] }[n.type] ?? [];
      for (const [k, x, z, c] of set) { if (k === 'table') { prop(grp, tableDef, [x, 0, z], { palette: { top: c } }); } else if (k === 'rug') prop(grp, rugDef, [x, 0, z], { palette: { rug: c } }); else if (k === 'board') prop(grp, boardDef, [x, 0, z], { palette: { cork: c } }); else if (k === 'trophy') prop(grp, trophyDef, [x, 0, z]); else if (k === 'chair') prop(grp, chairDef, [x, 0, z], { palette: { wood: c } }); else if (k === 'scope') prop(grp, scopeDef, [x, 0, z], { palette: { tube: c } }); else part(grp, 'box', [0.7, 0.7, 0.7], [x, 0.35, z], c); }
      part(grp, 'box', [1.4, 0.5, 0.9], [5.5, 0.25, 4.5], 'red'); part(grp, 'box', [0.9, 0.5, 0.5], [5.5, 0.7, 4.3], 'white');
      def.props.push({ x: 3.5, z: 2.5, label: `${n.name} lives here`, run: async (g2) => { await g2.say(null, `${n.name}'s house. ${n.name} is, at this moment, ${g2.hour >= n.bed || g2.hour < n.wake ? 'asleep. It is tactless to be here.' : 'out. A lamp is on, in case anyone is thinking of burglary.'}`); }, r: 2.5 });
    }
    if (def.venue) { const v = def.venue; hostAt(v.host, def.w / 2, 2.2, 'Talk to ' + HOSTS[v.host].name, async (g2) => { await g2.sys.venues2[v.room](g2); }, 0); if (v.room === 'cafe') { part(grp, 'box', [2.4, 1, 0.8], [3, 0.5, 3.6], 'orange'); } if (v.room === 'theatre') prop(grp, stageDef, [5, 0, 1.5]); if (v.room === 'auction') { for (let i = 0; i < 6; i++) prop(grp, seatDef, [2 + (i % 3) * 3, 0, 5.5 + Math.floor(i / 3)]); } }
    // rebuild collision rows (mark '#' perimeter margins)
  },
  onEnter(g, id) { const def = ROOMS[id]; if (!def) return; def.refreshShelves?.(g); def.syncDisplays?.(g); def.refreshHome?.(g); },
  rebuildHome(g) { const d = ROOMS.home; if (d) { d.w = [7, 8, 8, 8, 8][g.world.homeTier] ?? 8; } },
};
export const museum = {
  async talk(g) {
    const w = g.world, q = NPCISH('quill'); const c = await g.ask(q, HOST_LINES.quill[Math.floor(g.rng() * 2)].text, ['Donate something', 'About the museum', 'Appraise a lump', 'Bye']);
    if (c === 1) { const have = ['fish', 'bug', 'fossil', 'art'].map(k => Object.keys(w.donated).filter(id => (k === 'fish' ? FISH : k === 'bug' ? BUGS : k === 'fossil' ? FOSSILS : ART).some(x => x.id === id)).length); await g.say(q, `Aquarium: ${have[0]}. Insectarium: ${have[1]}. Fossils: ${have[2]}. Gallery: ${have[3]}. I can see most of them. Roughly.`); return; }
    if (c === 2) { const lump = w.pockets.find(x => x.id === 'lump'); if (!lump) { await g.say(q, 'No lumps? Splendid. I was hoping to squint at one.'); return; } await g.say(q, QUILL_MIS[0]); const real = lump.real ?? 'trilobite'; lump.id = real; delete lump.real; g.sfx('reveal'); await g.say(q, `Under the lens: a ${item(real).name}! Not a potato at all. Mostly.`); return; }
    if (c !== 0) return;
    const s = await new Promise(res => g.ui.push(new PocketsScreen({ title: 'Donate to the Museum', pick: res }))); if (!s) return; const it = item(s.id);
    if (!['fish', 'bug', 'fossil', 'art'].includes(it.kind) || it.junk) { await g.say(q, `${QUILL_MIS[0]} ...Oh, it's a ${it.name}. That's no use to a museum. A shelf, perhaps.`); return; }
    if (w.donated[it.id]) { await g.say(q, 'I already have one. Two would be gluttony. Or taxidermy.'); return; }
    await g.say(q, QUILL_MIS[Math.floor(g.rng() * QUILL_MIS.length)]); await g.say(q, `It's a ${it.name}! Splendid! It goes in the hall at once!`); g.take(it.id); w.donated[it.id] = true; w.flags.donatedAny = true; g.sfx('reveal'); g.sys.memory.add(g, 'donate', { item: it.id }); g.sys.mail.queue(g, { from: 'Dr. Quill', subject: 'Thank you (I think)', body: `The ${it.name} is on display. I have admired it twice. Once for what it is, once for what I think it is. Yours squintingly, Q.`, arriveDay: g.world.day + 1 }); g.sparkle(g.player.pos.x, g.player.pos.z, 1.5); ROOMS.museum.syncDisplays(g); g.errandProgress?.('donate');
    { const qa = hostActors.quill; if (qa) { qa.play('Roll'); g.sfx('stomp'); g.after(2.4, () => qa.play('Idle')); } } await g.say(q, 'I\'m rolling into a ball. Pay no attention. It\'s joy.');
  },
};
export const shops = {
  async mothwick(g) {
    const w = g.world, m = NPCISH('mothwick'); const c = await g.ask(m, HOST_LINES.mothwick[Math.floor(g.rng() * 2)].text, ['Buy clothes', 'Sell clothes', 'Wardrobe', 'Pattern studio', 'Pattern on my shirt', 'Bye']);
    if (c === 0) { const list = CLOTHES.filter(x => !x.couture); await new Promise(res => { const sc = new ListScreen({ title: "Mothwick's", items: () => list.map(it => ({ label: it.name, value: `${Math.round(it.price * g.sys.economy.buyMult())}`, sub: `${it.slot}. Tags: ${(it.tags ?? []).join(', ')}`, item: it, it })), onPick: async (row) => { const it = row.it; const p = Math.round(it.price * g.sys.economy.buyMult()); if (w.beans < p) { g.ui.toast('Short on beans, darling.'); return; } if (!g.give(it.id)) { g.ui.toast('Pockets full.'); return; } g.addBeans(-p); g.sfx('cash'); w.owned[it.id] = true; g.ui.toast('Bought ' + it.name); }, pickLabel: 'Buy' }); g.ui.push(sc); sc.promise.then(res); }); }
    else if (c === 1) await g.sys.economy.sellMenu(g); else if (c === 2) { const s = await new Promise(res => g.ui.push(new PocketsScreen({ title: 'Wear what?', pick: res }))); if (s && item(s.id).kind === 'clothes') g.sys.wardrobe.wear(g, item(s.id)); } else if (c === 4) { const ok = w.patterns.findIndex(Boolean); if (ok < 0) await g.say(m, 'No patterns yet, darling. Open the studio first.'); else { w.look.pattern = w.look.pattern == null ? ok : null; g.player.rebuild(); await g.say(m, w.look.pattern == null ? 'Plain again. Brave.' : 'Your pattern, on your chest, in public. Magnificent.'); } } else if (c === 3) { const sl = await new Promise(res => { const sc = new ListScreen({ title: 'Pattern slot', items: Array.from({ length: 8 }, (_, i) => ({ label: `Slot ${i + 1}${w.patterns[i] ? ' (drawn)' : ''}`, sub: 'A 16 by 16 pattern for shirts, umbrellas, signs and your festival firework.', i })), onPick: () => 'close', pickLabel: 'Open' }); g.ui.push(sc); sc.promise.then(res); }); if (sl) { const { PatternStudio } = await import('../ui/pattern.js'); const ps = new PatternStudio(sl.i); g.ui.push(ps); await ps.promise; w.flags.pattern = true; } }
  },
};
