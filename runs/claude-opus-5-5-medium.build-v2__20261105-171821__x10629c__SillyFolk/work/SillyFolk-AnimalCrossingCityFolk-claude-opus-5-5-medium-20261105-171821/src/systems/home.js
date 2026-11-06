// Your place: furniture that works, placement, wallpaper, bed, Bureau scoring, and item actions from the Pockets.
import { THREE, Mirror, RenderView, toonMaterial, PALETTE, buildModel } from '../engine.js';
import { G, bus } from '../state.js';
import { ITEMS, FURNITURE, EMOTE_CLIP, TOOL_ORDER, SONG_RECORDS } from '../data/items.js';
import { UI, panel, promptRow, menu, hit, hitAt } from '../ui/kit.js';
import { drawText, textWidth } from '../ui/font.js';
import { Script, say, ask, Toasts, until } from '../ui/dialogue.js';
import { buildFurn, matWall, matFloor, ROOM_DEFS } from '../world/rooms.js';
import { ensureRoom, rebuildRoom, setPlace, Trans } from '../world/places.js';
import { addEnt, entAt, isFree, giveItem, remember, info, addLetter, earn } from '../core/world.js';
import { T } from '../dev/tuning.js';
import { GANDER } from '../data/lines.js';
import { fmt, clamp, rngOf } from '../core/util.js';
import { nextFestivalDay } from '../core/calendar.js';
import { M } from '../audio/music.js';
import { equip } from './interact.js';
import { homeDoors } from './services.js';
import { LANDMARK } from '../world/layout.js';
import { itemDef } from '../art/models.js';
const homeRoomIds = () => ['home', 'home_annex', 'home_up'];
const isHome = (id) => homeRoomIds().includes(id);
export function homeState(id) { const w = G.world; return (w.home.rooms[id] ??= { furn: [], wall: null, floor: null }); }
export const wireHome = () => bus.on('roomMade', (r) => { if (isHome(r.id)) buildHomeRoom(r); });
export function buildHomeRoom(r) {
  const w = G.world, st = homeState(r.id); r.place.rects.length = 0; r.furn = new Map(); if (r.id === 'home') { r.def.doors = homeDoors(w); r.doors = []; for (const d of r.def.doors) { const m = new THREE.Mesh(new THREE.BoxGeometry(d.kind === 'wall' ? 0.1 : 1.4, 2.4, d.kind === 'wall' ? 1.4 : 0.1), toonMaterial(PALETTE.ink)); const x = r.ox + Math.max(0.05, d.x), z = Math.max(0.05, d.z); m.position.set(x, 1.2, z); r.group.add(m); r.doors.push({ ...d, wx: x, wz: z }); } }
  for (const f of st.furn) placeFurn(r, f);
  applyFinish(r);
  if (w.dust && r.id === 'home') spawnDust(r, w.dust);
}
export function applyFinish(r) { const st = homeState(r.id); if (st.wall) { const it = ITEMS[st.wall]; r.wb.material = matWall(it.a, it.b); r.wl.material = matWall(it.a, it.b); } if (st.floor) { const it = ITEMS[st.floor]; r.floor.material = matFloor(it.a, it.b); } }
export function placeFurn(r, f) { const it = ITEMS[f.id]; if (!it) return; const b = buildFurn(it.model, it.palette); const o = b.object; const [sw, sd] = rotSize(it, f.rot); o.position.set(r.ox + f.x + (sw - 1) / 2, 0, f.z + (sd - 1) / 2); o.rotation.y = ((f.rot ?? 0) * Math.PI) / 2; r.group.add(o); const rec = { f, o, it, r }; r.furn.set(f, rec); if (it.fn !== 'rug') r.place.rects.push(rec.rect = { x0: r.ox + f.x - 0.5 + 0.08, z0: f.z - 0.5 + 0.08, x1: r.ox + f.x - 0.5 + sw - 0.08, z1: f.z - 0.5 + sd - 0.08 }); wire(rec); return rec; }
export const rotSize = (it, rot = 0) => (rot % 2 ? [it.size[1], it.size[0]] : [it.size[0], it.size[1]]);
export function removeFurn(r, f) { const rec = r.furn.get(f); if (!rec) return; unwire(rec); r.group.remove(rec.o); if (rec.rect) r.place.rects.splice(r.place.rects.indexOf(rec.rect), 1); r.furn.delete(f); }
function lampKey(rec) { return rec.f.x + ',' + rec.f.z + ',' + rec.r.id; }
function wire(rec) {
  const w = G.world, { it, f, r, o } = rec;
  if (it.fn === 'lamp') { if (!w.home.lampsOff[lampKey(rec)]) rec.light = G.ctx.lights.request({ position: [r.ox + f.x, 1.5, f.z], color: 0xffd090, intensity: 6, radius: 5 }); }
  if (it.fn === 'tv') { const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), toonMaterial(PALETTE.navy)); scr.position.set(0, 0.42, 0.26); o.add(scr); rec.screen = scr; }
  if (it.fn === 'mirror') { rec.mirror = new Mirror({ size: [0.62, 1.4] }); rec.mirror.mesh.position.set(r.ox + f.x, 0.95, f.z + 0.02); r.group.add(rec.mirror.mesh); rec.stopMirror = rec.mirror.attach(G.ctx.engine.renderer, G.ctx.scene); rec.mirror.enabled = w.p.place === r.id; }
  if (it.fn === 'tank') { if (f.holds) showInside(rec); }
  if (it.fn === 'cage') { if (f.holds) showInside(rec); }
}
function unwire(rec) { rec.light?.release(); if (rec.stopMirror) { rec.stopMirror(); rec.mirror.enabled = false; rec.r.group.remove(rec.mirror.mesh); rec.mirror.dispose?.(); } if (rec.inside) rec.r.group.remove(rec.inside); }
function showInside(rec) { const it = ITEMS[rec.f.holds]; if (!it) return; if (rec.inside) rec.r.group.remove(rec.inside); const m = buildModel(itemDef(it), {}).object; m.position.set(rec.r.ox + rec.f.x, 0.5, rec.f.z + 0.1); m.scale.setScalar(0.7); rec.inside = m; rec.r.group.add(m); }
// TV: a live feed of the plaza while you're home
const TV = { view: null, stop: null };
export function tvSync(place) {
  const home = isHome(place); const r = G.rooms[place]; const hasTv = home && r && [...(r.furn?.values() ?? [])].some((x) => x.it.fn === 'tv');
  if (hasTv && !TV.view) { TV.view = new RenderView({ size: [120, 90], fov: 50 }); TV.view.every = 4; TV.view.camera.position.set(24, 7, 52); TV.view.camera.lookAt(24, 0.6, 38); RenderView.screen(r.group); }
  if (hasTv && !TV.stop) { TV.stop = TV.view.attach(G.ctx.engine.renderer, G.ctx.scene); for (const x of r.furn.values()) if (x.it.fn === 'tv' && x.screen) { x.screen.material = TV.view.screenMaterial(); } G.view.town.visible = true; TV.on = true; }
  if (!hasTv && TV.stop) { TV.stop(); TV.stop = null; TV.on = false; G.view.show(place); }
  for (const rid of homeRoomIds()) for (const x of G.rooms[rid]?.furn?.values() ?? []) if (x.mirror) x.mirror.enabled = rid === place;
}
G.roomTargets = (r) => {
  const out = []; if (!r) return out;
  if (isHome(r.id)) { for (const rec of r.furn?.values() ?? []) { const t = furnTarget(rec); if (t) out.push(t); } for (const d of r.dust ?? []) out.push({ kind: 'dust', x: d.x, z: d.z, reach: 1.3, label: 'Dust Bunny', verb: 'Stomp', act: () => stompDust(r, d) }); }
  if (r.id === 'store') out.push(...(G.storeTargets?.(r) ?? []));
  return out;
};
function furnTarget(rec) {
  const { it, f, r } = rec; const [sw, sd] = rotSize(it, f.rot); const x = r.ox + f.x - 0.5 + sw / 2, z = f.z - 0.5 + sd / 2; const fn = it.fn;
  const verb = { bed: 'Lie down', seat: 'Sit', lamp: rec.light ? 'Switch off' : 'Switch on', tv: 'Watch', stereo: 'Play', mirror: 'Look', tank: 'Look', cage: 'Look', clock: 'Check', toilet: 'Flush' }[fn] ?? 'Arrange';
  return { kind: 'furn', furn: rec, x, z, reach: Math.max(sw, sd) * 0.6 + 0.9, label: it.name, verb, act: () => useFurn(rec) };
}
function useFurn(rec) {
  const { it, f, r } = rec; const w = G.world;
  Script.run((function* () {
    const fn = it.fn;
    const extras = ['Move it', 'Put in pockets', 'Leave it'];
    if (fn === 'bed') { const p = yield ask('narrator', 'Bed. Bed saves everything. What do you want from it?', ['Sleep till morning', 'Nap till noon', 'Nap till dusk', 'Hibernate until the next festival', ...extras.slice(0, 2), 'Never mind'], { cancel: 6 }); if (p <= 3) { yield* sleepFlow(p); return; } if (p === 4) moveIt(rec); if (p === 5) pocketIt(rec); return; }
    if (fn === 'seat') { const p = yield ask('narrator', it.name + '.', ['Sit', ...extras], { cancel: 3 }); if (p === 0) { sit(r.ox + f.x, f.z); } if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    if (fn === 'lamp') { if (rec.light) { rec.light.release(); rec.light = null; w.home.lampsOff[lampKey(rec)] = 1; } else { delete w.home.lampsOff[lampKey(rec)]; rec.light = G.ctx.lights.request({ position: [r.ox + f.x, 1.5, f.z], color: 0xffd090, intensity: 6, radius: 5 }); } G.ctx.audio.play('uiTick'); bus.emit('lamp'); w.stats.lampUsed = true; const p = yield ask('narrator', 'Click.', ['Fine', ...extras.slice(0, 2)], { cancel: 0 }); if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    if (fn === 'tv') { w.stats.tvWatched = true; bus.emit('tv'); const p = yield ask('narrator', `The plaza, live. Mayor Trundle has moved. You think. It's the most exciting thing on.`, ['Keep watching', ...extras.slice(0, 2)], { cancel: 0 }); if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    if (fn === 'stereo') { const recs = w.p.records; const opts = [...recs.slice(0, 5).map((id) => ITEMS[id].name.replace('Vesper: ', '')), w.home.stereo ? 'Silence' : 'Leave it off', ...extras.slice(0, 2)]; const p = yield ask('narrator', recs.length ? 'Put something on?' : 'No records yet. Vesper plays on Show nights, on the plaza.', opts, { cancel: recs.length }); if (p < recs.length) { w.home.stereo = ITEMS[recs[p]].song; M.current = null; bus.emit('stereo', recs[p]); w.stats.stereoPlayed = true; } else if (p === Math.min(recs.length, 5)) { w.home.stereo = null; M.current = null; } else if (p === Math.min(recs.length, 5) + 1) moveIt(rec); else pocketIt(rec); return; }
    if (fn === 'mirror') { bus.emit('mirror'); w.stats.mirrorUsed = true; const p = yield ask('narrator', 'You, more or less. What are you? No, don\'t tell me.', ['Open wardrobe', ...extras.slice(0, 2), 'Leave it'], { cancel: 3 }); if (p === 0) { const s = G.wardrobe?.(); if (s) { UI.push(s); yield until(() => !UI.stack.includes(s)); } } if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    if (fn === 'tank' || fn === 'cage') { const cat = fn === 'tank' ? 'fish' : 'bug'; const i = w.p.pockets.findIndex((e) => e && ITEMS[e.id]?.cat === cat); const opts = i >= 0 ? [`Put in ${ITEMS[w.p.pockets[i].id].name}`, ...extras] : extras; const p = yield ask('narrator', f.holds ? `The ${ITEMS[f.holds].name} is doing fine. It has a lot to think about.` : `Empty. It needs a ${cat}.`, opts, { cancel: opts.length - 1 }); const off = i >= 0 ? 1 : 0; if (i >= 0 && p === 0) { f.holds = w.p.pockets[i].id; w.p.pockets[i] = null; showInside(rec); bus.emit('tankFilled'); } else if (p === off) moveIt(rec); else if (p === off + 1) pocketIt(rec); return; }
    if (fn === 'clock') { const p = yield ask('narrator', `It says it's ${timeNow()}. It has said worse.`, ['Fine', ...extras.slice(0, 2)], { cancel: 0 }); if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    if (fn === 'toilet') { G.ctx.audio.play('flush'); w.stats.flushed = (w.stats.flushed ?? 0) + 1; const p = yield ask('narrator', 'It flushes. Pointlessly. It is connected to nothing. Where does it go?', ['Do not ask', ...extras.slice(0, 2)], { cancel: 0 }); if (p === 1) moveIt(rec); if (p === 2) pocketIt(rec); return; }
    const p = yield ask('narrator', it.name + '.', extras, { cancel: 2 }); if (p === 0) moveIt(rec); if (p === 1) pocketIt(rec);
  })());
}
import { fmtTime } from '../core/util.js';
const timeNow = () => fmtTime(G.world.clock.minute);
function moveIt(rec) { UI.push(placementScreen(rec.it, rec.r, rec.f)); }
function pocketIt(rec) { const w = G.world; if (w.p.pockets.indexOf(null) < 0) return Toasts.add('Your pockets are full. Of what? You would know.'); const st = homeState(rec.r.id); removeFurn(rec.r, rec.f); st.furn.splice(st.furn.indexOf(rec.f), 1); giveItem(w, { id: rec.f.id }); tvSync(w.p.place); }
export function sit(x, z) { const p = G.player; G.ctx.audio.play('roll'); p.state = 'sit'; G.world.p.x = x; G.world.p.z = z; p.actor.play('Sit'); G.world.stats.sat = (G.world.stats.sat ?? 0) + 1; bus.emit('sit'); }
G.sitOn = (bench) => { if (bench.lookout && G.view.night > 0.3) return G.stargaze?.(bench); sit(bench.x, bench.z + 0.05); };
// ---- Placement mode: in-room grid, nothing else on screen
export function placementScreen(it, r, existing, onDone) {
  const w = G.world, st = homeState(r.id), def = r.def;
  const scr = { id: 'placement', title: 'Placement', item: it, x: existing?.x ?? Math.floor(def.w / 2), z: existing?.z ?? Math.floor(def.d / 2), rot: existing?.rot ?? 0, freezes: true, existing, get prompts() { return this._p; }, focusLabel() { return `${this.x},${this.z}`; },
    open() { if (existing) removeFurn(r, existing); const b = buildFurn(it.model, it.palette); this.ghost = b.object; r.group.add(this.ghost); G.player.actor.visible = false; },
    ok() { const [sw, sd] = rotSize(it, this.rot); if (this.x < 0 || this.z < 0 || this.x + sw > def.w || this.z + sd > def.d) return false; const fr = r.exitAt; for (let a = 0; a < sw; a++) for (let b = 0; b < sd; b++) { const cx = this.x + a, cz = this.z + b; if (Math.abs(cx - def.w / 2) < 1.5 && cz >= def.d - 1) return false; for (const o of st.furn) { if (o === existing) continue; const oi = ITEMS[o.id]; if (oi.fn === 'rug' || it.fn === 'rug') continue; const [ow, od] = rotSize(oi, o.rot); if (cx >= o.x && cx < o.x + ow && cz >= o.z && cz < o.z + od) return false; } } return true; },
    input(c) { const n = c.nav; if (n === 'left') this.x--; if (n === 'right') this.x++; if (n === 'up') this.z--; if (n === 'down') this.z++; this.x = clamp(this.x, 0, def.w - 1); this.z = clamp(this.z, 0, def.d - 1);
      if (c.moved) { const [gx, gz] = G.view.rayGround(c.input.pointer.x, c.input.pointer.y, 0); this.x = clamp(Math.floor(gx - r.ox + 0.5), 0, def.w - 1); this.z = clamp(Math.floor(gz + 0.5), 0, def.d - 1); }
      if (c.pressed('l1')) this.rot = (this.rot + 3) % 4; if (c.pressed('r1')) this.rot = (this.rot + 1) % 4;
      const [sw, sd] = rotSize(it, this.rot); this.ghost.position.set(r.ox + this.x + (sw - 1) / 2, 0.02, this.z + (sd - 1) / 2); this.ghost.rotation.y = (this.rot * Math.PI) / 2;
      if (c.confirm() || c.clickL()) { if (!this.ok()) { UI.sfx('uiNo'); return; } this.close(true); return; } if (c.back()) { UI.sfx('uiBack'); this.close(false); } },
    close(placed) { r.group.remove(this.ghost); G.player.actor.visible = true; UI.pop(this); if (placed) { const f = existing ?? { id: it.id }; f.x = this.x; f.z = this.z; f.rot = this.rot; if (!existing) st.furn.push(f); placeFurn(r, f); G.ctx.audio.play('thud'); bus.emit('placed', f); w.stats.placed = (w.stats.placed ?? 0) + 1; } else if (existing) { placeFurn(r, existing); } tvSync(w.p.place); onDone?.(placed); },
    draw(h) { const good = this.ok(); const [a, b] = G.view.project(r.ox + this.x, 0, this.z); h.sprite(a - 5, b - 28 + (Math.floor(UI.time * 3) % 2), ['#########', '.#######.', '..#####..', '...###...', '....#....'], { '#': good ? 'lime' : 'red' }, { shadow: false }); this._p = [['confirm', 'Put down'], ['l1', 'Turn'], ['back', 'Cancel']]; promptRow(h, 240, 252, this._p, { align: 'center', back: 'ink' }); drawText(h, 240, 8, it.name, { color: 'white', align: 'center', shadow: 'ink' }); } };
  return scr;
}
// ---- Bed
export function* sleepFlow(opt) {
  const w = G.world; if (opt === 3) yield say('gander', GANDER.hibernate[0]);
  M.override = 'lullaby'; G.ctx.audio.play('roll'); let done = false; Trans.go(() => { G.player.state = 'free'; G.sleepTo(opt); done = true; M.override = null; }, 'fade', 1.1); yield until(() => done); yield 0.4;
  G.afterBed?.();
}
// ---- Dust bunnies
function spawnDust(r, n) { const w = G.world; r.dust = []; const rng = rngOf(`${w.seed}:dust:${w.clock.day}`); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), toonMaterial(PALETTE.mist)); const d = { x: r.ox + rng.range(0.6, r.def.w - 0.6), z: rng.range(0.6, r.def.d - 1), m, vx: rng.range(-1, 1), vz: rng.range(-1, 1) }; m.position.set(d.x, 0.2, d.z); r.group.add(m); r.dust.push(d); } }
function stompDust(r, d) { const w = G.world; r.group.remove(d.m); r.dust.splice(r.dust.indexOf(d), 1); w.dust = Math.max(0, (w.dust ?? 1) - 1); G.ctx.audio.play('dust'); G.ctx.particles.burst('dust', [d.x, 0.1, d.z], { count: 6 }); bus.emit('dust'); Toasts.add('Got it. It was more scared of you.'); }
export function updateDust(dt) { const r = G.rooms[G.world.p.place]; if (!r?.dust) return; for (const d of r.dust) { const dx = d.x - G.world.p.x, dz = d.z - G.world.p.z, dd = Math.hypot(dx, dz); if (dd < 2) { d.vx = dx / dd * 2.4; d.vz = dz / dd * 2.4; } d.x = clamp(d.x + d.vx * dt, r.ox + 0.3, r.ox + r.def.w - 0.3); d.z = clamp(d.z + d.vz * dt, 0.3, r.def.d - 0.3); d.vx *= 0.99; d.vz *= 0.99; d.m.position.set(d.x, 0.2 + Math.abs(Math.sin(G.time * 10 + d.x)) * 0.08, d.z); } }
// ---- Bureau scoring
export function homeScore(w) {
  const all = []; for (const id of homeRoomIds()) for (const f of w.home.rooms[id]?.furn ?? []) { const it = ITEMS[f.id]; if (it) all.push({ ...f, it, room: id }); }
  let score = 0; const notes = []; const value = all.reduce((s, f) => s + f.it.price, 0); score += Math.min(30, value / 1000);
  const sets = {}; for (const f of all) if (f.it.set) sets[f.it.set] = (sets[f.it.set] ?? 0) + 1; let setBonus = 0; for (const [k, n] of Object.entries(sets)) if (n >= 4) setBonus += 15; score += Math.min(30, setBonus);
  const pal = {}; for (const f of all) { const c = f.it.palette?.wood ?? f.it.palette?.carpet; if (c) pal[c] = (pal[c] ?? 0) + 1; } const top = Math.max(0, ...Object.values(pal)); if (all.length && top / all.length > 0.55) score += 10;
  const lamps = all.filter((f) => f.it.fn === 'lamp'), seats = all.filter((f) => f.it.fn === 'seat'), rugs = all.filter((f) => f.it.fn === 'rug'), tables = all.filter((f) => /table|desk/.test(f.id + f.it.name.toLowerCase())), plants = all.filter((f) => f.it.fn === 'plant');
  if (lamps.some((l) => seats.some((s) => s.room === l.room && Math.abs(s.x - l.x) + Math.abs(s.z - l.z) <= 2))) score += 10; else notes.push('Your lamp hates your seat. Why does it hate your seat?');
  if (rugs.some((u) => tables.some((t) => t.room === u.room && Math.abs(t.x - u.x) + Math.abs(t.z - u.z) <= 1))) score += 10; else notes.push('A table with no rug under it is just a very low ceiling.');
  if (plants.length) score += 8; else notes.push('Nothing in here is growing. Except, in a sense, your debt.');
  if (w.home.stereo) score += 7; else notes.push('It is very quiet. I could hear you thinking. Please stop.');
  if (seats.length > 4) { score -= 8; notes.unshift('Too many chairs. Who are you expecting?'); }
  const area = homeRoomIds().reduce((s, id) => s + (w.home.rooms[id] ? ROOM_DEFS[id].w * ROOM_DEFS[id].d : 0), 0); if (all.length > area * 0.45) { score -= 10; notes.unshift('Clutter is not a style. I have checked.'); }
  score = clamp(Math.round(score), 0, 100); const grade = score >= 80 ? 'S' : score >= 60 ? 'A' : score >= 35 ? 'B' : 'C'; const critique = notes[0] ?? 'I have no notes. I have never had no notes. I am going to go and sit in the car.'; return { score, grade, critique, notes };
}
const GRADES = 'CBAS';
export function gradeReward(w, grade) { const prev = w.p.bestGrade; if (prev && GRADES.indexOf(grade) <= GRADES.indexOf(prev)) return null; w.p.bestGrade = grade; return { C: 'plant1', B: 'b_medal_b', A: 'b_medal_a', S: 'b_medal_s' }[grade]; }
export function bureauMail(w) { const r = homeScore(w); const reward = gradeReward(w, r.grade); w.mailQueue.push({ from: 'brisket', subject: 'Better Burrows Bureau: Result', body: `Your home has been assessed. Grade: ${r.grade}. "${r.critique}" Regards, Agent Brisket.`, gift: reward, at: w.clock.day + 1, bureau: r.grade }); bus.emit('bureau', r.grade); remember(w, 'grade', { grade: r.grade }); w.stats.bureau = (w.stats.bureau ?? 0) + 1; }
// ---- Pockets: what pressing on an item does
G.itemActions = (e, idx, scr) => {
  const w = G.world, it = ITEMS[e.id]; const acts = []; const here = w.p.place, inTown = here === 'town', atHome = isHome(here);
  const close = () => { UI.pop(pm); };
  const wear = (slot) => { w.p.look[slot] = e.id; if (slot === 'shirt') w.p.look.pattern = null; G.player.rebuild(); remember(w, 'outfit', { item: it.name }); G.ctx.audio.play('pickup'); bus.emit('wore', it); };
  switch (it.cat) {
    case 'shirt': acts.push(['Wear', () => wear('shirt')]); break; case 'hat': acts.push([w.p.look.hat === e.id ? 'Take off' : 'Wear', () => { w.p.look.hat = w.p.look.hat === e.id ? null : e.id; G.player.rebuild(); bus.emit('wore', it); }]); break; case 'glasses': acts.push([w.p.look.glasses === e.id ? 'Take off' : 'Wear', () => { w.p.look.glasses = w.p.look.glasses === e.id ? null : e.id; G.player.rebuild(); bus.emit('wore', it); }]); break; case 'umbrella': acts.push(['Carry when it rains', () => { w.p.look.umbrella = e.id; G.player.umb = null; Toasts.add('It looks like rain. It always looks like rain.'); }]); break;
    case 'tool': acts.push(['Keep with your tools', () => { if (!w.p.tools.includes(e.id)) w.p.tools.push(e.id); w.p.pockets[idx] = null; equip(e.id); bus.emit('toolGot', e.id); }]); break;
    case 'furn': if (atHome) acts.push(['Place it here', () => { w.p.pockets[idx] = null; UI.pop(scr); UI.push(placementScreen(it, G.rooms[here], null, (placed) => { if (!placed) giveItem(w, { id: e.id }); })); }]); else acts.push(['Only works at home', () => Toasts.add('It wants to be indoors. Your indoors.')]); break;
    case 'wall': if (atHome) acts.push(['Apply here', () => { const st = homeState(here); if (st.wall) giveItem(w, { id: st.wall }); st.wall = e.id; w.p.pockets[idx] = null; applyFinish(G.rooms[here]); bus.emit('wallpaper'); w.stats.papered = true; }]); break; case 'floor': if (atHome) acts.push(['Apply here', () => { const st = homeState(here); if (st.floor) giveItem(w, { id: st.floor }); st.floor = e.id; w.p.pockets[idx] = null; applyFinish(G.rooms[here]); bus.emit('flooring'); w.stats.floored = true; }]); break;
    case 'seed': if (inTown) acts.push(['Plant', () => plant(e, idx)]); break; case 'flower': if (inTown) acts.push(['Plant', () => plant(e, idx)]); break;
    case 'fruit': acts.push(['Eat', () => { w.p.pockets[idx] = null; G.ctx.audio.play('eat'); G.player.actor.play('Eat', { then: 'Idle' }); Toasts.add('Delicious, in a limited way.'); }]); if (it.foreign && inTown) acts.push(['Plant', () => plantFruit(e, idx)]); break;
    case 'food': acts.push(['Eat', () => { w.p.pockets[idx] = null; G.ctx.audio.play('eat'); Toasts.add('It looks back from the inside now.'); }]); break;
    case 'med': acts.push(['Take', () => { w.p.pockets[idx] = null; w.p.puffy = false; G.player.actor.puffy = false; G.ctx.audio.play('eat'); bus.emit('cured'); Toasts.add('Your face is your own again.'); }]); break;
    case 'bag': acts.push(['Open it', () => { w.p.pockets[idx] = null; earn(w, e.value ?? 1000); G.ctx.audio.play('reveal'); Toasts.add(`+${fmt(e.value ?? 1000)} beans. So much for planting them.`); }]); break;
    case 'record': acts.push(['Keep with your records', () => { if (!w.p.records.includes(e.id)) w.p.records.push(e.id); w.p.pockets[idx] = null; }]); break;
    case 'cheese': acts.push(['Smell it', () => { G.ctx.audio.play('cheeseSmell'); Toasts.add(e.id === 'cheesebad' ? 'You can hear it now.' : 'Up, it says. Mostly.'); }]); break;
  }
  acts.push(['Drop', () => { const P = G.place; if (!inTown) { Toasts.add('Not on the carpet.'); return; } const [tx, tz] = G.player.frontTile(); if (entAt(w, tx, tz) || !P.tileWalkable(tx, tz)) { Toasts.add('There is no room to drop it there.'); return; } if (w.guest) { G.visit.session.send({ t: 'do', a: 'drop', it: e.id, x: tx, z: tz }); w.p.pockets[idx] = null; G.visit.session.save(); G.ctx.audio.play('thud'); Toasts.add('Left as a gift. Your host will find it. Eventually.'); return; } addEnt(w, { t: 'item', it: e.id, value: e.value, x: tx + 0.5, z: tz + 0.5 }); w.p.pockets[idx] = null; G.ctx.audio.play('thud'); }]);
  acts.push(['Keep it', () => {}]);
  const pm = menu({ id: 'itemMenu', title: it.name, w: 200, x: 340, y: 40, dim: false, items: acts.map(([label, f]) => ({ label, action: () => { close(); f(); } })) }); UI.push(pm);
};
function plant(e, idx) { const w = G.world, it = ITEMS[e.id]; const [tx, tz] = G.player.frontTile(); if (e.id === 'sapling') { if (!isFree(w, tx, tz, 0)) return Toasts.add('Not there. It needs room to resent you.'); addEnt(w, { t: 'sapling', kind: 'pear', x: tx + 0.5, z: tz + 0.5, age: 0 }); w.p.pockets[idx] = null; G.ctx.audio.play('dig'); bus.emit('planted', 'sapling'); return; } if (!isFree(w, tx, tz, 0)) return Toasts.add('Not there. Somewhere with dirt.'); const sp = it.flower, cols = ITEMS['fl_' + sp + '_white'] ? 'white' : 'red'; const c = it.fc ?? (sp === 'tulip' ? 'red' : sp === 'daisy' ? 'white' : sp === 'cosmos' ? 'plum' : 'blue'); addEnt(w, { t: 'flower', sp, c, x: tx + 0.5, z: tz + 0.5, dry: 0, wet: 0 }); w.p.pockets[idx] = null; G.ctx.audio.play('dig'); bus.emit('planted', 'flower'); w.stats.planted = (w.stats.planted ?? 0) + 1; }
function plantFruit(e, idx) { const w = G.world; const [tx, tz] = G.player.frontTile(); if (!isFree(w, tx, tz, 0)) return Toasts.add('Not there.'); addEnt(w, { t: 'sapling', kind: 'pear', fruitKind: e.id, x: tx + 0.5, z: tz + 0.5, age: 0 }); w.p.pockets[idx] = null; G.ctx.audio.play('dig'); bus.emit('planted', 'sapling'); }

G.placeF = placeFurn; G.tvS = tvSync;
