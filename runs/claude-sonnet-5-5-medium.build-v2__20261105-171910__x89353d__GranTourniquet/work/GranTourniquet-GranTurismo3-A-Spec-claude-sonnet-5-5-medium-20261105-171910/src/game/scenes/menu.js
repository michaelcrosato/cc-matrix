// MenuScene: title, map and every menu set live in one engine Game so music never restarts. Plan section 4 (Scenes), 7.
import { THREE, applySky, skyAt, PALETTE, setLookLayer } from '../../pixel-engine.js';
import { App, S, saveProfile, applySettings } from '../app.js';
import { Nav, SCREENS } from '../ui/nav.js';
import { buildIsland, buildShowroom, BUILDINGS } from '../render/stages.js';
import { loadCast } from '../models/cast.js';
import { currentCar, hasLicence } from '../sim/career.js';
import '../ui/screens/common.js';
import '../ui/screens/main.js';
import '../ui/screens/shops.js';
import '../ui/screens/misc.js';
import '../ui/screens/about.js';
import '../ui/screens/arcade.js';
import '../dev/devmode.js';
const { Vector3 } = THREE;
export class MenuScene {
  constructor(o = {}) { this.name = 'menu'; this.start = o; this.target = new Vector3(0, 2, 0); this.t = 0; this.goal = { pos: new Vector3(0, 30, 50), look: new Vector3(0, 2, 0) }; this.camPos = new Vector3(0, 30, 50); this.camLook = new Vector3(0, 2, 0); this.mode = 'map'; this.orbitA = 0; this.drag = 0; this.hourNow = 12; this.people = {}; this.subtitle = null; }
  async setup(ctx) {
    this.ctx = ctx; ctx.engine.input.gamepadButtons = {}; const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 6000; cam.fov = 50; cam.updateProjectionMatrix();
    for (const [n, d] of Object.entries({ spark: { count: [4, 8], life: [0.2, 0.5], speed: [3, 7], gravity: 10, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 200 }, foam: { count: [3, 6], life: [0.8, 1.6], speed: [0.3, 1], gravity: -0.3, size: [2, 4], colors: ['white', 'cyan'], radius: 0.5, max: 400 }, confetti: { count: [20, 30], life: [1.5, 3], speed: [3, 8], gravity: 6, drag: 0.6, size: [2, 2], colors: ['red', 'sand', 'cyan', 'lime', 'white', 'orange'], max: 600 } })) ctx.particles.register(n, d);
    this.island = buildIsland(ctx); ctx.scene.add(this.island.group); this.showroom = buildShowroom(ctx); ctx.scene.add(this.showroom.group); this.showroom.group.visible = false;
    this.cast = await loadCast(ctx); for (const role of ['arai', 'fenn', 'benno', 'dell']) { const p = await this.cast.make(role); p.root.visible = false; ctx.scene.add(p.root); this.people[role] = p; } this.people.arai.play('ExaminerClipboard'); this.people.fenn.play('Idle'); this.people.benno.play('MechanicWipe'); this.people.dell.play('Idle');
    this.nav = new Nav(() => {}); this.syncProfile(); App.ui.sounds = App.mix;
    const s = this.start; if (s.screen && s.screen !== 'title') { if (s.screen !== 'map') this.nav.push('map'); this.nav.push(s.screen, s.args ?? {}); } else this.nav.push('title');
    this.skyNow = this.start.screen && this.start.screen !== 'title' ? this.progressHour() : 18.5; this.setHour(this.skyNow);
    App.menuScene = this; this.ready_ = true;
  }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = App.api?.(this) ?? window.__GAME__; }
  progressHour() { const p = App.profile; if (!p.started && !p.cars.length) return 8.5; if (p.ending) return 22; if (hasLicence(p, 'A')) return 18.8; if (hasLicence(p, 'B')) return 15; if (hasLicence(p, 'C')) return 11.5; return 9.5; }
  setHour(h) { this.hourNow = h; const s = skyAt(h); applySky(this.ctx.engine, s); const e = this.ctx.engine; if (s.night > 0.2) { e.ambient.intensity = Math.max(e.ambient.intensity, 3.4 + 1.4 * s.night); } }
  syncProfile() { const c = currentCar(App.profile); this.island?.setParked(c?.carId ?? null, c); }
  // camera helpers
  camMap(focusId) { if (this.mode === 'show') this.snap = true; const b = BUILDINGS.find((q) => q.id === focusId); const fx = b ? b.x * 0.25 : 0, fz = b ? b.z * 0.25 : 0; this.mode = 'map'; this.goal.pos.set(fx * 0.4 + Math.sin(this.t * 0.07) * 6, 24, 44 + fz * 0.2); this.goal.look.set(fx, 3, fz - 2); }
  camTitle() { if (this.mode === 'show') this.snap = true; this.mode = 'map'; const a = this.t * 0.05; this.goal.pos.set(Math.sin(a) * 30, 16, 46 + Math.cos(a) * 6); this.goal.look.set(0, 6, 0); }
  camBuilding(id) { if (this.mode === 'show') this.snap = true; const b = BUILDINGS.find((q) => q.id === id); this.mode = 'map'; this.goal.pos.set(b.x + 5, 8, b.z + 17); this.goal.look.set(b.x, 3, b.z); }
  camShow(o = {}) { if (this.mode !== 'show') this.snap = true; this.mode = 'show'; this.show = { r: o.r ?? 9.5, h: o.h ?? 3, lookY: o.lookY ?? 1, drift: o.drift ?? 0.1, a: o.a, shift: o.shift ?? 2.4 }; this.showroom.group.visible = true; this.island.group.visible = false; }
  camMapMode() { this.showroom.group.visible = false; this.island.group.visible = true; }
  person(role, x, z, face, visible = true, clip) { const p = this.people[role]; p.root.visible = visible; if (visible) { p.root.position.set(x, 0.3, z); p.root.rotation.y = face; if (clip && p.name !== clip) p.play(clip); } return p; }
  hidePeople() { for (const p of Object.values(this.people)) p.root.visible = false; }
  say(text, speaker) { App.mix?.say(text, speaker); }
  cameraTarget() { return this.target; }
  status() { const t = this.nav?.top; return `menu ${t?.type ?? ''} focus=${App.ui.focus ?? ''}`; }
  fingerprint() { return String(this.nav?.depth ?? 0) + (this.nav?.top?.type ?? ''); }
  update(ctx, dt) {
    const A = App.actions, ui = App.ui; A.frame(ctx, dt); this.t += dt; ui.begin(ctx, A, dt);
    // camera
    const cam = ctx.camera.camera;
    if (this.mode === 'show') { const sh = this.show, a = (sh.a ?? 0) + this.t * sh.drift + this.drag; const cx = this.showroom.ox + Math.sin(a) * sh.r, cz = Math.cos(a) * sh.r; this.goal.pos.set(cx, sh.h, cz); this.goal.look.set(this.showroom.ox - Math.cos(a) * sh.shift, sh.lookY, Math.sin(a) * sh.shift); }
    if (this.snap) { this.camPos.copy(this.goal.pos); this.camLook.copy(this.goal.look); this.snap = false; }
    const k = 1 - Math.exp(-dt * 3.2); this.camPos.lerp(this.goal.pos, k); this.camLook.lerp(this.goal.look, k); cam.position.copy(this.camPos); cam.lookAt(this.camLook); this.target.copy(this.camLook);
    this.island.update(this.t, dt); this.showroom.update(this.t, dt, this.mode === 'show' && A.mouse.down && A.last === 'mouse' ? ctx.input.mouseDelta.x * 0.01 : 0);
    for (const p of Object.values(this.people)) if (p.root.visible) p.update(dt);
    // sky glides toward the progress hour
    const goal = this.nav.top?.type === 'title' ? 18.5 : this.progressHour(); if (Math.abs(this.skyNow - goal) > 0.01) { this.skyNow += Math.sign(goal - this.skyNow) * Math.min(Math.abs(goal - this.skyNow), dt * 0.8); this.setHour(this.skyNow); }
    ctx.hud.clear(); this.nav.draw(ctx, ui, this); this.drawSubtitle(ctx, ui, dt); ui.end();
    // attract after 10 s idle on title or map
    const top = this.nav.top?.type; if ((top === 'title' || top === 'map') && A.idle > 10 && !App.hubActive && !App.fastNoAttract) { A.lastAt = performance.now(); A.idle = 0; App.startAttract?.(this); }
  }
  drawSubtitle(ctx, ui, dt) { const s = App.mix?.subtitle; if (!s) return; const name = s.speaker ? ({ arai: 'MS. ARAI', benno: 'BENNO', fenn: 'MR. FENN', dell: 'DELL' }[s.speaker] ?? '') : ''; const lines = ui.wrap(s.text, 56).slice(0, 3), h = lines.length * 10 + 14, y = ui.H - 22 - h; ui.panel(ui.W / 2 - 170, y, 340, h, 'ink', 'slate'); ui.text(ui.W / 2 - 164, y + 3, name, { color: 'sand' }); lines.forEach((l, i) => ui.text(ui.W / 2 - 164, y + 13 + i * 10, l, { color: 'white' })); }
  dispose() { this.showroom?.lights?.forEach((l) => l.release?.()); App.menuScene = null; }
}
