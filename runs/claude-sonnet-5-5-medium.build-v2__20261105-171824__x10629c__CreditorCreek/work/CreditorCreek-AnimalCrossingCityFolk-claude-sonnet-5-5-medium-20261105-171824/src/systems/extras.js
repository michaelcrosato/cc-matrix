// Home room, chime editor, favours; further systems (bus, city, festivals...) are attached in their own modules.
import { THREE, toonMaterial, PALETTE, RenderView, Mirror } from '../engine.js';
import { ROOMS, furnMesh, rebuildShell } from '../world/rooms.js';
import { part } from '../world/scenery.js';
import { item, FURNITURE, WALLPAPER, FLOORS } from '../data/items.js';
import { W, H } from '../ui/controls.js';
import { songNamed, chimeSong, CHIME_DEFAULT } from '../audio/composer.js';
import { PocketsScreen } from '../ui/screens.js';
import { PLACES, registerPlace } from '../world/places.js';
import { FISH as FISH_, BUGS as BUGS_ } from '../data/collect.js';
import { buildFish, buildBugModel } from '../art/items3d.js';
const FDEF = Object.fromEntries(FURNITURE.map(f => [f.id, f]));
export const homeRoom = {
  refresh(g, def) {
    const w = g.world; const tier = w.homeTier; const isHome = def.id === 'home'; const size = isHome ? ([0, 6, 8, 8, 8][tier] ?? 8) : def.w; def.w = size; def.d = size; const pl = PLACES[def.id]; pl.w = size; pl.d = size; w.home.rooms ??= { annex: [], upstairs: [] }; const list = isHome ? w.home.furn : (w.home.rooms[def.id] ??= []);
    const grp = def.group; grp.userData.furn?.forEach(m => grp.remove(m)); grp.userData.furn = [];
    const wl = WALLPAPER.find(x => x.id === w.home.wall), fl = FLOORS.find(x => x.id === w.home.floor);
    const bl = []; for (let z = 0; z < def.d; z++) bl.push('.'.repeat(def.w)); const mark = (x, z, ww, dd) => { for (let zz = z; zz < z + dd; zz++) for (let xx = x; xx < x + ww; xx++) if (bl[zz]) bl[zz] = bl[zz].slice(0, xx) + '#' + bl[zz].slice(xx + 1); };
    const colorWalls = (g2) => { };
    def.props = []; g.sys.placement.recolor(g, def); if (def.id !== 'home') rebuildShell(def);
    for (const f of list) { const fd = FDEF[f.id]; if (!fd) continue; const m = furnMesh(fd.model, fd.tint, fd.grows ? 0.9 : 1); const ww = f.rot % 2 ? fd.d : fd.w, dd = f.rot % 2 ? fd.w : fd.d; m.position.set(f.x + ww / 2, 0, f.z + dd / 2); m.rotation.y = -f.rot * Math.PI / 2; grp.add(m); grp.userData.furn.push(m); if (!fd.rug) mark(f.x, f.z, ww, dd);
      if (fd.fn) def.props.push({ x: f.x + ww / 2, z: f.z + dd + 0.4, r: 1.8, label: { bed: 'Go to bed', seat: 'Sit', lamp: 'Switch lamp', stereo: 'Play the stereo', tv: 'Watch the plaza on TV', mirror: 'Use the mirror', clock: 'Check the clock', toilet: 'Flush (pointlessly)', tank: 'Peer at the tank', cage: 'Peer at the cage' }[fd.fn], run: (gg) => this.use(gg, f, fd, m) }); }
    for (const m of grp.userData.dust ?? []) grp.remove(m); grp.userData.dust = [];
    const nd = isHome ? Math.min(8, w.dust ?? 0) : 0; for (let i = 0; i < nd; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), toonMaterial(PALETTE.mist)); b.position.set(1 + (i * 2.3) % (def.w - 2), 0.18, 1.5 + (i * 1.7) % (def.d - 3)); grp.add(b); grp.userData.dust.push(b); const bx = b.position.x, bz = b.position.z; def.props.push({ x: bx, z: bz, r: 1.3, label: 'Stomp dust bunny', run: async (gg) => { w.dust--; gg.sfx('stomp'); gg.sparkle(def.ox + bx, def.oz + bz, 0.3, 'mist'); gg.ui.toast('Squish. It had it coming. (Cowardly, too.)'); gg.sys.homeRoom.refresh(gg, def); } }); }
    if (isHome && tier >= 3) def.props.push({ x: def.w - 0.8, z: 3, r: 1.5, label: 'Go through to the annex', run: (gg) => gg.sys.places.go(gg, 'annex', 'door', 'home') });
    if (isHome && tier >= 4) def.props.push({ x: 0.9, z: 3, r: 1.5, label: 'Climb the stairs', run: (gg) => gg.sys.places.go(gg, 'upstairs', 'door', 'home') });
    def.props.push({ x: def.w / 2, z: 0.9, label: 'Rearrange furniture', run: (gg) => gg.sys.placement.open(gg, def.id), r: 1.6 }, ...(isHome ? [{ x: def.w - 1, z: def.d - 0.6, label: 'Mailbox', run: (gg) => gg.sys.mail.mailbox(gg), r: 1.2 }] : []));
    this.critters(g, def, list); this.live(g, def, list, isHome);
    def.rows = bl; const g0 = PLACES[def.id]; g0.rows = bl; g0.grid = () => { const G = new (g0.GridCls)(def.w, def.d); const b = new Uint8Array(def.w * def.d); bl.forEach((row, z) => [...row].forEach((c, x) => { b[z * def.w + x] = c === '#' ? 1 : 0; })); G.set(b); return G; };
  },
  critters(g, def, list) {
    const u = def.group.userData; for (const c of u.critters ?? []) def.group.remove(c.mesh); u.critters = [];
    for (const f of list) { const fd = FDEF[f.id]; if (!fd || (fd.fn !== 'tank' && fd.fn !== 'cage')) continue; const ww = f.rot % 2 ? fd.d : fd.w, dd = f.rot % 2 ? fd.w : fd.d; const cx = f.x + ww / 2, cz = f.z + dd / 2; const W_ = g.world; const pool = fd.fn === 'tank' ? Object.keys(W_.coll.fish) : Object.keys(W_.coll.bug); const defs = (fd.fn === 'tank' ? FISH_ : BUGS_); const picks = pool.slice(0, 3); if (!picks.length) continue;
      if (fd.fn === 'tank') { const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), new THREE.MeshBasicNodeMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.35 })); glass.position.set(cx, 1.05, cz); def.group.add(glass); u.critters.push({ mesh: glass, still: true }); }
      picks.forEach((id, i) => { const d = defs.find(x => x.id === id); if (!d) return; const m = fd.fn === 'tank' ? buildFish(d) : buildBugModel(d); m.scale.setScalar(fd.fn === 'tank' ? 0.28 : 0.7); def.group.add(m); u.critters.push({ mesh: m, cx, cy: fd.fn === 'tank' ? 1.05 : 1.0, cz, ph: i * 2.1, kind: fd.fn }); }); }
  },
  /** TV shows a live feed of the plaza (RenderView); the mirror really reflects (Mirror). Attached only while home. */
  live(g, def, list, isHome) {
    const u = def.group.userData; for (const x of u.live ?? []) { try { x.stop?.(); x.dispose?.(); } catch {} if (x.obj) def.group.remove(x.obj); } u.live = [];
    const r = g.engine?.renderer; if (!r) return;
    for (const f of list) { const fd = FDEF[f.id]; if (!fd) continue; const ww = f.rot % 2 ? fd.d : fd.w, dd = f.rot % 2 ? fd.w : fd.d;
      if (fd.fn === 'tv') { const rv = new RenderView({ size: [160, 90], fov: 45, every: 4 }); rv.camera.position.set(21, 10, 30); rv.camera.lookAt(21, 0, 22); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), rv.screenMaterial()); scr.position.set(f.x + ww / 2, 0.62, f.z + dd / 2 + 0.06); RenderView.screen(scr); def.group.add(scr); const stop = rv.attach(r, g.ctx.scene); u.live.push({ obj: scr, stop, dispose: () => rv.dispose(), rv }); }
      if (fd.fn === 'mirror' && isHome) { const m = new Mirror({ size: [1.2, 1.7], tint: 0xcfe8ff, tintAmount: 0.1 }); m.mesh.position.set(f.x + ww / 2, 1.15, 0.12); def.group.add(m.mesh); const stop = m.attach(r, g.ctx.scene); u.live.push({ obj: m.mesh, stop, dispose: () => m.dispose(), m }); } }
  },
  async use(g, f, fd, mesh) {
    const w = g.world;
    if (fd.fn === 'bed') await g.sys.bed.use(g);
    else if (fd.fn === 'seat') { g.player.actor.play('Sit'); g.player.anim = 'Sit'; await g.say(null, 'You sit. The chair holds you without comment. The best kind of chair.'); g.player.anim = null; }
    else if (fd.fn === 'lamp') { f.on = !f.on; g.sfx('tick'); g.ui.toast(f.on ? 'Lamp on. A warm yellow lie about the afternoon.' : 'Lamp off.'); }
    else if (fd.fn === 'stereo') { const recs = w.vesper.songs ?? []; const n = recs.length; const idx = (f.track = ((f.track ?? -1) + 1) % (n + 2)); const nm = idx === 0 ? 'chime' : idx === 1 ? 'title' : 'vesper' + recs[idx - 2]; g.musicName = ''; if (idx === 0) g.ctx.audio.playMusic(chimeSong(w.chime), 'chime'); else g.setMusic(idx === 1 ? 'hall' : 'vesper' + recs[idx - 2]); g.ui.toast('Now playing: ' + (idx === 0 ? 'your Village Chime' : idx === 1 ? 'The house tune' : 'Vesper record ' + (idx - 1))); w.flags.stereoOn = true; }
    else if (fd.fn === 'tv') await g.say(null, `On the screen: the plaza. ${g.npcs.list.filter(n => !n.sleeping).slice(0, 2).map(n => n.name).join(' and ') || 'Nobody'} wander through. Riveting.`);
    else if (fd.fn === 'mirror') { const { LookScreen } = await import('./story.js'); g.ui.push(new LookScreen()); await g.ui.top.promise; }
    else if (fd.fn === 'clock') await g.say(null, `The clock says ${(await import('../core/calendar.js')).fmtClock(w.min)}. It is, as ever, correct about itself.`);
    else if (fd.fn === 'toilet') { g.sfx('flush'); g.ui.toast('Flush. The toilet has opinions about it.'); }
    else if (fd.fn === 'tank' || fd.fn === 'cage') await g.say(null, fd.fn === 'tank' ? `The tank holds ${Object.keys(w.coll.fish).length} kinds of fish you have caught, in memory.` : `The cage holds ${Object.keys(w.coll.bug).length} kinds of bug you have caught, in spirit.`);
  },
};
export const chimeEdit = {
  async open(g) {
    await new Promise((res) => { const ui = g.ui; const sc = { id: 'chime', freeze: true, steps: g.world.chime.slice(), c: 0, tick(ui2, dt, active) { const d = ui2.d, w = ui2.game.world; d.rect(0, 0, W, H, 'night'); d.panel(20, 14, 440, 240, { fill: 'white', trim: 'sand' }); d.text(240, 22, 'The Village Chime', 'navy', { align: 'center' });
        for (let i = 0; i < 16; i++) { const x = 30 + i * 26; d.rect(x, 40, 22, 120, i === this.c ? 'red' : 'mist'); const v = this.steps[i]; if (v >= 0) d.rect(x + 1, 40 + (7 - v) * 14 + 8, 20, 12, 'sky'); const hv = ui2.hit('c' + i, x, 40, 22, 120, active); if (hv.click) { this.c = i; const y = (ui2.c.ptr.y - 40) / 14; this.steps[i] = Math.max(-1, Math.min(7, 7 - Math.floor(y))); this.preview(ui2.game, i); } }
        d.text(240, 170, 'Up and down set the note. Left and right move along.', 'navy', { align: 'center' }); d.text(240, 184, 'Play with Confirm. Back saves the Chime.', 'navy', { align: 'center' });
        if (active) { const n = ui2.c.nav; if (n.x) this.c = (this.c + n.x + 16) % 16; if (n.y) { const v = this.steps[this.c]; this.steps[this.c] = Math.max(-1, Math.min(7, (v < 0 && n.y < 0 ? 3 : v) - n.y)); this.preview(ui2.game, this.c); } if (ui2.c.pressed('confirm')) { ui2.game.musicName = ''; ui2.game.ctx.audio.playMusic(chimeSong(this.steps), 'chime'); } if (ui2.c.backPressed()) { ui2.game.world.chime = this.steps; ui2.game.world.flags.chime = true; ui2.pop(this); res(); ui2.game.after(0.3, () => ui2.game.updateMusic(true)); } }
        ui2.prompt('confirm', 'Play'); ui2.prompt('back', 'Save'); }, preview(g2, i) { const v = this.steps[i]; if (v >= 0) g2.sfx('sparkle', { pitch: v * 2 - 6 }); } }; ui.push(sc); });
  },
};
export const bed = {
  async use(g) {
    const w = g.world; const c = await g.ask(null, 'Time for a lie down?', ['Sleep till morning', 'Nap till noon', 'Nap till dusk', 'Hibernate until the next festival', 'Not yet']);
    if (c === 4) return; if (c === 3) await g.say({ name: 'Mrs. Gander', type: 'hearth', pitch: 0.9 }, 'HONK. Hibernating? In this economy? You will wake up on the festival. And the interest will have *awoken* with you.');
    g.cutsceneStart(); g.setMusic('bed'); try { await g.engine.screen.cover('fade', { duration: 0.6 }); } catch {}
    w.cleanExit = true; g.sys.time.sleepTo(g, ['morning', 'noon', 'dusk', 'festival'][c]); g.sys.plant.grow(g); g.player.pos.x = ROOMS.home.ox + 3; g.player.pos.z = ROOMS.home.oz + 5.5;
    g.autosave?.('bed'); try { await g.engine.screen.reveal('fade', { duration: 0.6 }); } catch {} g.cutsceneEnd();
    await g.say(null, c === 0 ? `Good morning. It is ${['Spring', 'Summer', 'Autumn', 'Winter'][g.season]}. The goose has not forgotten.` : 'You wake up, mostly.'); g.updateMusic(true);
  },
};
export const placement = {
  async open(g, roomId) {
    g.placeRoomId = roomId ?? 'home';
    const rid = typeof g.placeRoomId === 'string' ? g.placeRoomId : 'home'; const w = g.world, def = ROOMS[rid]; const furn = rid === 'home' ? w.home.furn : w.home.rooms[rid]; await new Promise((res) => {
      const sc = { id: 'placement', freeze: true, held: null, cx: 2, cz: 2, rot: 0, noPrompts: false, tick(ui, dt, active) {
        const d = ui.d; d.rect(0, H - 20, W, 20, 'night'); const n = ui.c.nav; if (active) { if (n.x || n.y) { this.cx = Math.max(0, Math.min(def.w - 1, this.cx + n.x)); this.cz = Math.max(0, Math.min(def.d - 1, this.cz + n.y)); if (this.held) { this.held.x = this.cx; this.held.z = this.cz; } } if (ui.c.ptr.moved && ui.c.device === 'kb') { const p = g.groundPoint(ui.c.input.pointer.x, ui.c.input.pointer.y); if (p) { this.cx = Math.max(0, Math.min(def.w - 1, Math.floor(p.x - def.ox))); this.cz = Math.max(0, Math.min(def.d - 1, Math.floor(p.z - def.oz))); if (this.held) { this.held.x = this.cx; this.held.z = this.cz; } } }
          if (ui.c.pressed('confirm') || ui.c.ptr.left) { if (this.held) { if (this.valid(this.held)) { this.held = null; g.sfx('pick'); g.sys.homeRoom.refresh(g, def); } else g.ui.toast('Something is in the way. Or you are in the way of the door.'); } else { const f = furn.find(q => this.cx >= q.x && this.cx < q.x + (q.rot % 2 ? FDEF[q.id].d : FDEF[q.id].w) && this.cz >= q.z && this.cz < q.z + (q.rot % 2 ? FDEF[q.id].w : FDEF[q.id].d)); if (f) { this.held = f; g.sfx('tick'); } else this.pick(g); } }
          if (this.held && (ui.c.pressed('prevTool') || ui.c.pressed('nextTool') || ui.c.input.wasPressed('KeyR'))) { this.held.rot = (this.held.rot + 1) % 4; g.sys.homeRoom.refresh(g, def); }
          if (ui.c.backPressed()) { if (this.held) { furn.splice(furn.indexOf(this.held), 1); g.give(this.held.id); this.held = null; g.sys.homeRoom.refresh(g, def); } else { ui.pop(this); res(); } } }
        // cursor tile highlight via particles-free HUD marker
        const sp = g.sys.placement.screenOf(g, def.ox + this.cx + 0.5, def.oz + this.cz + 0.5); if (sp) { d.rect(sp[0] - 8, sp[1] - 4, 16, 8, this.held ? 'lime' : 'sand'); d.text(sp[0], sp[1] - 18, this.held ? FDEF[this.held.id].name : 'Pick', 'white', { align: 'center', shadow: 'ink' }); }
        d.text(8, H - 15, this.held ? 'Move it. Confirm to place. Rotate with L1/R1. Back to pocket it.' : 'Choose furniture to lift, or open Pockets (Tab) to place something.', 'white'); ui.prompt('confirm', this.held ? 'Place' : 'Lift'); ui.prompt('back', this.held ? 'Pocket' : 'Done'); if (!this.held && ui.c.pressed('pockets')) this.pick(g); },
        valid(f) { const fd = FDEF[f.id]; const ww = f.rot % 2 ? fd.d : fd.w, dd = f.rot % 2 ? fd.w : fd.d; if (f.x < 0 || f.z < 0 || f.x + ww > def.w || f.z + dd > def.d) return false; if (f.z + dd > def.d - 1 && Math.abs(f.x + ww / 2 - def.w / 2) < 1.6 && !fd.rug) return false; for (const o of furn) { if (o === f) continue; const od = FDEF[o.id]; if (od.rug || fd.rug) continue; const ow = o.rot % 2 ? od.d : od.w, odd = o.rot % 2 ? od.w : od.d; if (f.x < o.x + ow && f.x + ww > o.x && f.z < o.z + odd && f.z + dd > o.z) return false; } return true; },
        async pick(g2) { const s = await new Promise(r => g2.ui.push(new PocketsScreen({ title: 'Place which?', pick: r }))); if (!s) return; const it = item(s.id); if (it.kind === 'furniture') { g2.take(it.id); const f = { id: it.id, x: this.cx, z: this.cz, rot: 0 }; furn.push(f); this.held = f; g2.sys.homeRoom.refresh(g2, def); } else if (it.kind === 'wall' || it.kind === 'floor') { g2.take(it.id); w.home[it.kind] = it.id; g2.sys.homeRoom.refresh(g2, def); g2.sys.placement.recolor(g2, def); } } };
      g.ui.push(sc); }); g.sys.placement.recolor(g, def);
  },
  screenOf(g, x, z) { const cam = g.ctx.camera; const v = new THREE.Vector3(x, 0, z); try { v.project(cam.camera ?? cam.object ?? cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; } catch { return null; } },
  recolor(g, def) { const w = g.world; if (def.id !== 'home') return; const wl = WALLPAPER.find(x => x.id === w.home.wall), fl = FLOORS.find(x => x.id === w.home.floor); rebuildShell(def, { floor: fl?.color, wall: wl?.color }); }
};
import { registerPlace as _rp } from '../world/places.js';
import { Grid } from '../world/collide.js';
export function extras(g) {
  PLACES.home.GridCls = Grid;
  return { homeRoom, chimeEdit, bed, placement, catalogue, lostFound, ...(g.moreSystems?.() ?? {}) };
}

export const catalogue = {
  async open(g) {
    const w = g.world; const ids = Object.keys(w.owned).filter(id => ['furniture', 'clothes', 'wall', 'floor'].includes(item(id).kind) && !item(id).trophy);
    if (!ids.length) { await g.say(null, 'The catalogue is empty. You have owned nothing, a rare achievement.'); return; }
    const { ListScreen } = await import('../ui/screens.js');
    await new Promise(res => { const sc = new ListScreen({ title: 'Catalogue: reorder anything you have owned', items: () => ids.map(id => ({ label: item(id).name, value: Math.round(item(id).price * 1.1), sub: 'One item, one big card. It arrives by mail tomorrow.', item: item(id), id })), pickLabel: 'Order', onPick: (row) => { const cost = Math.round(item(row.id).price * 1.1); if (w.beans < cost) { g.ui.toast('Short on beans.'); return; } g.addBeans(-cost); g.sys.mail.queue(g, { from: 'The Catalogue', subject: 'Your order', body: `One ${item(row.id).name}, as requested. We have no memory of the previous one.`, gift: row.id, arriveDay: w.day + 1 }); g.sfx('cash'); g.ui.toast('Ordered: arrives tomorrow'); } }); g.ui.push(sc); sc.promise.then(res); });
  },
};

export const lostFound = {
  daily(g) { const w = g.world; w.lost ??= []; if (w.lost.filter(x => x.town).length < 4) w.lost.push({ id: ['seedpack', 'shell', 'pear', 'paper', 'cheesewrap'][Math.floor(g.rng() * 5)], town: true }); },
  async open(g) {
    const w = g.world; w.lost ??= []; const clem = g.sys.venues.host('clementine'); const c = await g.ask(clem, `The bin holds ${w.lost.length} thing${w.lost.length === 1 ? '' : 's'}, one glove among them. The bee has opinions on all of it.`, ['Look through the bin', 'Leave something', 'Never mind']);
    if (c === 0) { if (!w.lost.length) { await g.say(clem, 'Empty. Nothing is lost today. Eerie.'); return; } const { ListScreen } = await import('../ui/screens.js'); await new Promise(res => { const sc = new ListScreen({ title: 'Lost & Found', items: () => w.lost.map((l, i) => ({ label: item(l.id).name, sub: l.town ? 'Found by the bee.' : 'Left by you, for someone luckier (or you).', item: item(l.id), i })), pickLabel: 'Take', onPick: (row) => { if (g.give(row.item.id)) { w.lost.splice(row.i, 1); g.sfx('pickup'); } else g.ui.toast('Pockets full.'); return w.lost.length ? undefined : 'close'; } }); g.ui.push(sc); sc.promise.then(res); }); }
    else if (c === 1) { const { PocketsScreen } = await import('../ui/screens.js'); const s = await new Promise(res => g.ui.push(new PocketsScreen({ title: 'Leave which?', pick: res }))); if (!s) return; if (g.take(s.id)) { w.lost.push({ id: s.id }); g.sfx('pick'); await g.say(clem, 'Left. Logged. Lost, technically, by you, deliberately.'); } }
  },
};
