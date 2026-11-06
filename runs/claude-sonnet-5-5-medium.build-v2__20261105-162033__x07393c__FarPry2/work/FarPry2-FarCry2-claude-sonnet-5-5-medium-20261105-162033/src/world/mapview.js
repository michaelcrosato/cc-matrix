// The paper map in your hands (a DataTexture on a plane on the camera), the tracker and the monocular. The world never stops.
import { THREE, toonMaterial, PALETTE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';
import { drawText, wrap, textWidth } from '../ui/pixfont.js';
import { SITES, POSTS, TRIGS, RAIL_HALTS } from '../content/sites.js';
import { ROADS, RIVER, RAIL, RAIL_SPUR, SCARS } from '../content/roads.js';
import { HARROW_NOTES } from '../content/notes.js';
import { HALF, CELLS } from './terrain.js';
import { FN, ST } from './fire.js';
import { pressed, held, consume } from '../core/actions.js';

const MW = 320, MH = 240, MAP = 240; // map area is MAP x MH; the rest is the margin
const rgb = (name) => { const c = new THREE.Color(PALETTE[name]); return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]; };
export class MapSystem {
  name = 'map';
  data = new Uint8Array(MW * MH * 4); base = null; up = 0; target = false; cursor = { x: 120, y: 120 }; zoomed = false; redrawT = 0; hover = null; trackerT = 0; trackerOn = false; monoOn = false; markers = [];
  setup(g) {
    this.g = g; g.mapSys = this; g.mapUp = false; g.waypoint = null;
    const tex = new THREE.DataTexture(this.data, MW, MH, THREE.RGBAFormat); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.needsUpdate = true; this.tex = tex;
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.375), toonMaterial(0xffffff, { map: tex }));
    this.plane.castShadow = false; this.plane.frustumCulled = false;
    this.holder = new THREE.Group(); this.holder.position.set(0, -0.6, -0.5); this.holder.rotation.x = -0.25; this.holder.add(this.plane); this.holder.visible = false;
    setLookLayer(this.holder, 'actors');
    g.ctx.scene.add(g.ctx.camera.camera); g.ctx.camera.camera.add(this.holder);
    const hb = buildModel('vm-map-hands', { catalog: CATALOG }); hb.object.rotation.y = Math.PI; hb.object.position.set(0, -0.26, 0.08); hb.object.scale.setScalar(0.45); hb.object.traverse((o) => { o.frustumCulled = false; }); this.holder.add(hb.object);
    if (!g.session) { this.bake(); this.redraw(true); }
    g.addMarker = (m) => { this.markers.push(m); }; g.waypointTo = (x, z) => { g.waypoint = { x, z }; };
    g.extraPrompts = () => this.prompts();
  }
  put(x, y, c) { if (x < 0 || y < 0 || x >= MW || y >= MH) return; const i = ((MH - 1 - y) * MW + x) * 4; this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255; }
  w2m(x, z) { return [Math.round((x + HALF) / 1280 * MAP), Math.round((z + HALF) / 1280 * MH)]; }
  m2w(mx, my) { return [mx / MAP * 1280 - HALF, my / MH * 1280 - HALF]; }
  line(a, b, c, dash = 0) { let [x0, y0] = a; const [x1, y1] = b; const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, n = 0; for (;;) { if (!dash || (n++ % dash) < dash - 1) this.put(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } }
  poly(pts, c, dash = 0) { for (let i = 0; i < pts.length - 1; i++) this.line(this.w2m(...pts[i]), this.w2m(...pts[i + 1]), c, dash); }
  bake() {
    const g = this.g, t = g.world.terrain; const paper = rgb('sand'), edge = rgb('plum'), margin = rgb('mist');
    const contour = (rgb('orange')), water = rgb('teal');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) this.put(x, y, x < MAP ? paper : margin);
    const hs = new Float32Array(MAP * MH);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MAP; x++) { const [wx, wz] = this.m2w(x, y); hs[y * MAP + x] = t.heightAt(wx, wz); }
    for (let y = 0; y < MH - 1; y++) for (let x = 0; x < MAP - 1; x++) { const h = Math.floor(hs[y * MAP + x] / 8); if (h !== Math.floor(hs[y * MAP + x + 1] / 8) || h !== Math.floor(hs[(y + 1) * MAP + x] / 8)) this.put(x, y, contour); }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MAP; x++) { const [wx, wz] = this.m2w(x, y); const k = g.world.kindAt(wx, wz); if (k === 3) this.put(x, y, rgb('white')); else if (k === 7) this.put(x, y, rgb('plum')); }
    this.poly(RIVER, water); this.poly(RIVER.map(([a, b]) => [a + 8, b]), water);
    for (const R of ROADS) this.poly(R.pts, rgb('red'));
    this.poly(RAIL, rgb('ink'), 3); this.poly(RAIL_SPUR, rgb('ink'), 3);
    this.base = new Uint8Array(this.data);
  }
  redraw(force) {
    const g = this.g; this.data.set(this.base);
    // burn scars
    const f = g.fireSys.grid;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MAP; x++) { const [wx, wz] = this.m2w(x, y); const s = f.stateAt(wx, wz); if (s === ST.BURNT || s === ST.BURNING) { if ((x + y) % 2 === 0 || s === ST.BURNING) this.put(x, y, s === ST.BURNING ? rgb('orange') : rgb('night')); } else if (s === ST.REGROWING && (x + y) % 3 === 0) this.put(x, y, rgb('green')); }
    // sites seen
    const ink = rgb('ink'), red = rgb('red');
    for (const s of SITES) { if (s.kind === 'flat') continue; const [mx, my] = this.w2m(s.at[0], s.at[1]); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.put(mx + dx, my + dy, ink); drawText((x, y, c) => this.put(x, y, c), mx + 3, my - 2, s.name, ink); }
    for (const p of POSTS) { const [mx, my] = this.w2m(p.at[0], p.at[1]); this.put(mx, my, red); this.put(mx + 1, my, red); this.put(mx, my + 1, red); drawText((x, y, c) => this.put(x, y, c), mx + 3, my - 2, p.id, red); }
    TRIGS.forEach(([x, z], i) => { if (g.story.trig.includes(i)) { const [mx, my] = this.w2m(x, z); this.put(mx, my - 1, rgb('green')); this.put(mx, my, rgb('green')); this.put(mx - 1, my, rgb('green')); this.put(mx + 1, my, rgb('green')); } });
    for (const h of RAIL_HALTS) if (g.story.halts.includes(h.id)) { const [mx, my] = this.w2m(h.at[0], h.at[1]); this.put(mx, my + 2, ink); this.put(mx + 1, my + 2, ink); }
    // the column walking the scar (late story)
    if (g.story.flags.column) for (let i = 0; i < 6; i++) { const q = SCARS.B[Math.min(SCARS.B.length - 1, Math.floor(g.story.flags.column * (SCARS.B.length - 1)))]; const [mx, my] = this.w2m(q[0], q[1]); this.put(mx + i % 3, my + 2 + (i / 3 | 0), rgb('lime')); }
    for (const m of this.markers) { const [mx, my] = this.w2m(m.x, m.z); this.put(mx, my, rgb('cyan')); this.put(mx + 1, my + 1, rgb('cyan')); this.put(mx - 1, my - 1, rgb('cyan')); }
    // waypoint
    if (g.waypoint) { const [mx, my] = this.w2m(g.waypoint.x, g.waypoint.z); const c = rgb('orange'); for (let d = -2; d <= 2; d++) { this.put(mx + d, my + d, c); this.put(mx + d, my - d, c); } }
    // player arrow
    const p = g.player.feet, [px, py] = this.w2m(p.x, p.z); const yaw = g.ctx.camera.yaw; const tipx = Math.round(px - Math.sin(yaw) * 5), tipy = Math.round(py - Math.cos(yaw) * 5); this.line([px, py], [tipx, tipy], rgb('blue')); for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) this.put(px + d, py + e, rgb('blue'));
    // cursor
    if (this.target) { const c = rgb('white'); const cx = Math.round(this.cursor.x), cy = Math.round(this.cursor.y); for (let d = -3; d <= 3; d++) { this.put(cx + d, cy, ink); this.put(cx, cy + d, ink); } this.put(cx, cy, c); if (this.hover) drawText((x, y, c2) => this.put(x, y, c2), Math.min(MAP - 30, cx + 5), Math.max(2, cy - 10), this.hover.name, rgb('night')); }
    // margin: GPS (clock and wind), mission step, Harrow's notes
    for (let y = 0; y < 18; y++) for (let x = MAP + 2; x < MW - 2; x++) this.put(x, y, rgb('night'));
    const hr = Math.floor(g.world.hour), mn = Math.floor((g.world.hour % 1) * 60); drawText((x, y, c) => this.put(x, y, c), MAP + 5, 3, `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')} D${g.world.day}`, rgb('lime'));
    const wd = g.world.wind; const wx = MAP + 62, wy = 9; this.line([wx, wy], [Math.round(wx + wd.dir[0] * Math.min(8, 2 + wd.speed)), Math.round(wy + wd.dir[1] * Math.min(8, 2 + wd.speed))], rgb('orange')); drawText((x, y, c) => this.put(x, y, c), MAP + 5, 11, `WIND ${wd.speed.toFixed(0)}`, rgb('sand'));
    let ty = 24; const col = rgb('night');
    const step = g.missions?.stepText?.(); if (step) { drawText((x, y, c) => this.put(x, y, c), MAP + 4, ty, 'TO DO', rgb('red')); ty += 7; for (const l of wrap(step, 18).slice(0, 5)) { drawText((x, y, c) => this.put(x, y, c), MAP + 4, ty, l, col); ty += 6; } ty += 4; }
    drawText((x, y, c) => this.put(x, y, c), MAP + 4, ty, 'E.H. WRITES', rgb('red')); ty += 7;
    for (const i of g.story.trig.slice(-2)) for (const l of wrap(HARROW_NOTES[g.story.trig.indexOf(i) % HARROW_NOTES.length], 18).slice(0, 8)) { if (ty > MH - 8) break; drawText((x, y, c) => this.put(x, y, c), MAP + 4, ty, l, col); ty += 6; }
    this.tex.needsUpdate = true;
  }
  prompts() { const g = this.g; if (!this.target) return []; return [{ action: 'use', verb: 'SET WAYPOINT', progress: 0 }, { action: 'map', verb: 'LOWER THE MAP', progress: 0 }]; }
  raise(on) {
    const g = this.g; if (this.target === on || !this.base) return; this.target = on; g.mapUp = on; g.camState.enabled = !on; g.sfx('paper'); if (on) { this.redraw(); this.cursor.x = Math.max(0, Math.min(MAP - 1, this.w2m(g.player.feet.x, g.player.feet.z)[0])); this.cursor.y = this.w2m(g.player.feet.x, g.player.feet.z)[1]; }
    if (on && g.weapons) g.weapons.views.hidden = true; else if (!g.vehSys.seat) g.weapons.views.hidden = false;
  }
  fixed(g, dt) {
    const scripted = !!g.mission?.mapPrompt;
    if ((!g.canMove() && !scripted) || g.ui.screen || g.surgeryActive) { if (this.target) this.raise(false); return; }
    const input = g.ctx.input;
    if ((g.mode === 'play' || scripted) && consume(input, 'map')) this.raise(!this.target);
    if (this.target) {
      const k = g.device === 'pad' ? 0.35 : 0.25; this.cursor.x = Math.max(0, Math.min(MAP - 1, this.cursor.x + input.mouseDelta.x * k * (this.zoomed ? 0.5 : 1))); this.cursor.y = Math.max(0, Math.min(MH - 1, this.cursor.y + input.mouseDelta.y * k * (this.zoomed ? 0.5 : 1)));
      this.hover = null; for (const s of SITES) { const [mx, my] = this.w2m(s.at[0], s.at[1]); if (Math.hypot(mx - this.cursor.x, my - this.cursor.y) < 5) this.hover = s; }
      if (consume(input, 'use') || input.consumePress('MouseLeft')) { const [wx, wz] = this.hover ? this.hover.at : this.m2w(this.cursor.x, this.cursor.y); g.waypoint = { x: wx, z: wz }; g.sfx('ui_confirm'); g.events.emit('waypoint', wx, wz); }
      if (consume(input, 'weapon') || input.wheel) this.zoomed = !this.zoomed;
    }
    // tracker
    const wantTracker = held(input, 'tracker') && g.story.tracker && !this.target && !g.vehSys.seat;
    if (wantTracker !== this.trackerOn) { this.trackerOn = wantTracker; const w = g.weapons; if (wantTracker) { w.views.show('tracker'); w.views.play('raise'); } else { const c = w.current(); w.views.show(c.vm); w.refreshLook(); } }
    if (this.trackerOn) this.trackerTick(g, dt);
    const wantMono = held(input, 'monocular') && !this.target && !g.vehSys.seat && g.story.monocular;
    if (wantMono !== this.monoOn) { this.monoOn = wantMono; g.monocularOn = wantMono; const w = g.weapons; if (wantMono) { w.views.show('monocular'); w.views.play('eye'); } else if (!this.trackerOn) { const c = w.current(); w.views.show(c.vm); w.refreshLook(); } }
    if (this.monoOn) this.monoTag(g);
  }
  trackerTick(g, dt) {
    const f = g.player.feet; let best = 1e9;
    for (const c of g.sitesSys.cases) if (!c.taken) best = Math.min(best, Math.hypot(c.x - f.x, c.z - f.z));
    this.nearest = best; this.trackerT -= dt; const near = best < 60;
    const interval = near ? 0.12 + best / 60 * 0.8 : 2.2;
    if (this.trackerT <= 0 && best < 400) { this.trackerT = interval; g.sfx('tracker_beep', { pitch: near ? 4 : 0, volume: near ? 0.8 : 0.4 }); g.weapons.views.play('beep'); const it = g.weapons.views.cur; if (it?.nodes.Mag) it.nodes.Mag.visible = near; if (it?.nodes.Bolt) it.nodes.Bolt.visible = !near; }
  }
  monoTag(g) {
    const cam = g.ctx.camera.camera, o = new THREE.Vector3(), d = new THREE.Vector3(); cam.getWorldPosition(o); cam.getWorldDirection(d);
    for (const s of g.soldierSys.list) { if (!s.alive) continue; const to = new THREE.Vector3(s.pos.x - o.x, s.pos.y + 1 - o.y, s.pos.z - o.z); const dist = to.length(); if (dist > 220) continue; to.normalize(); if (to.dot(d) > 0.985) { s.taggedUntil = g.ctx.time + 8; } }
    g.markers = g.soldierSys.list.filter((s) => s.alive && s.taggedUntil > g.ctx.time).map((s) => ({ x: s.pos.x, y: s.pos.y + 2.4, z: s.pos.z, text: 'V', color: s.faction === 'concord' ? 'sky' : 'orange' }));
  }
  frame(g, dt) {
    const k = this.target ? 1 : 0; this.up += (k - this.up) * Math.min(1, dt * 12 / 0.4 * 0.4);
    this.holder.visible = this.up > 0.02; this.holder.position.y = -0.6 + this.up * 0.6; this.plane.material.opacity = 1;
    if (this.target) { this.redrawT -= dt; if (this.redrawT <= 0) { this.redrawT = 0.5; this.redraw(); } }
    if (!this.monoOn && g.markers?.length && !g.missionMarkers) g.markers = g.markers.filter((m) => false);
    g.weapons.scopedMono = this.monoOn;
  }
  state() { return { map: { up: this.target, waypoint: this.g.waypoint ? [Math.round(this.g.waypoint.x), Math.round(this.g.waypoint.z)] : null, tracker: this.trackerOn, monocular: this.monoOn } }; }
}
