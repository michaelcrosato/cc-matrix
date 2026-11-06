// Title: a live 3D Foghorn scene, slow camera, fog. Idle for 10 seconds: attract.
import { glowMaterial, PALETTE, THREE } from '../../pixel-engine.js';
import { TITLE, TAGLINE } from '../config.js';
import { DIFFICULTY } from '../data/tuning.js';
import { registerSfx } from '../audio/sfx.js';
import { registerVoices } from '../audio/voice.js';
import { device, pollPads } from '../core/device.js';
import { applyMood, addWater, addBackdrops, place } from '../game/world.js';
import { registerParticles } from '../game/fx.js';
import { SettingsScreen } from './settings.js';
import { AboutScreen } from './about.js';
import { LobbyScreen } from './lobby.js';
export const IDLE_SECONDS = 10;
export class TitleScene {
  constructor(app) { this.app = app; this.name = 'title'; this.waters = []; this.s = { focus: 0 }; this.idle = 0; this.sub = null; this.t = 0; this.levelFree = true; this.lastMoved = -1; }
  setup(ctx) {
    this.ctx = ctx; this.app.attach(ctx.engine); registerSfx(ctx.audio); registerVoices(ctx.audio); registerParticles(ctx); this.app.area = null; applyMood(this, 'title'); ctx.engine.setCamera?.({ preset: 'third', fov: 55 }, { syncUrl: false });
    addWater(this, 400, 400, -0.2); place(this, 'foghorn', 22, -1, -40, 0.4, { shadow: false }); addBackdrops(this, [['backdrop-cliff', -36, -3, -52], ['backdrop-cliff', 60, -3, -70, 1], ['abbey-far', -80, -2, -110], ['sea-stack', -14, -2, -24], ['sea-stack', 8, -2, -18, 1]]); this.buoy = place(this, 'buoy', -3, -0.6, -8); this.gl = ctx.lights.request({ position: [22, 17, -36], color: 0xffa040, intensity: 40, radius: 60, flicker: 'pulse' });
    const rig = ctx.camera; rig.zoomable = false; this.target = new THREE.Vector3(); rig.step = () => { const t = this.t; rig.camera.position.set(Math.sin(t * 0.05) * 3, 3.2 + Math.sin(t * 0.13) * 0.4, 12 + Math.cos(t * 0.05)); rig.camera.lookAt(10 + Math.sin(t * 0.04) * 4, 7, -40); rig.focus.set(8, 0, -20); if (rig.camera.fov !== 42) { rig.camera.fov = 42; rig.camera.updateProjectionMatrix(); } };
    this.app.mix.play('title', 0.1); this.hornT = 8;
  }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = this; }
  cameraTarget() { return this.target ?? (this.target = new THREE.Vector3()); }
  items() { const a = []; if (this.app.hasSave()) a.push({ label: 'CONTINUE', id: 'continue' }); a.push({ label: 'NEW CLAIM', id: 'new' }, { label: 'NIGHT SHIFT', id: 'shift' }, { label: 'SETTINGS', id: 'settings' }, { label: 'ABOUT', id: 'about' }); return a; }
  /** Title fits at scale 3, else scale 2 on two lines. */
  drawTitle(ui) { const m = ui.measure(TITLE, 3); if (m.width < ui.W - 20) { ui.center(26, TITLE, { scale: 3, color: 'sand', shadow: 'plum' }); return 54; } const w = TITLE.split(' '), a = w.slice(0, Math.ceil(w.length / 2)).join(' '), b = w.slice(Math.ceil(w.length / 2)).join(' '); ui.center(20, a, { scale: 2, color: 'sand', shadow: 'plum' }); ui.center(38, b, { scale: 2, color: 'sand', shadow: 'plum' }); return 58; }
  update(ctx, dt) {
    const ui = this.app.ui; ui.begin(ctx); pollPads(); const real = dt || 1 / 60; this.t += real; for (const w of this.waters) w.update(ctx.physics.time, ctx.engine.sunDir); this.app.mix.update(real); this.hornT -= dt; if (this.hornT <= 0) { this.hornT = 26; ctx.audio.play('horndrop', { volume: 0.7 }); }
    const moved = device.moved !== this.lastMoved || ui.confirm || ui.back || ctx.input.anyDown(['Touch']) ; if (device.moved !== this.lastMoved) { this.lastMoved = device.moved; this.idle = 0; } else this.idle += real;
    if (device.touchOnly && !device.padSeen && !device.keySeen) return this.touchOnly(ui);
    if (this.sub) { this.sub.update(ui); if (this.sub.done) this.sub = null; if (this.idle >= IDLE_SECONDS && !this.sub?.noAttract && !this.app.loading) { this.sub = null; this.app.startAttract(); } return; }
    if (this.idle >= IDLE_SECONDS && !this.app.loading) { this.app.startAttract(); return; }
    const ty = this.drawTitle(ui); ui.center(ty + 3, TAGLINE, { color: 'mist' });
    if (this.pick) { this.diffMenu(ui); return; }
    const items = this.items(), i = ui.list(this.s, items, { x: ui.W / 2 - 70, y: 112, w: 140, rowH: 19 }); ui.prompts([['confirm', 'SELECT']]);
    if (i >= 0) { const id = items[i].id; if (id === 'continue') this.app.continueGame(); if (id === 'new') { this.pick = { focus: 1 }; } if (id === 'shift') this.sub = new LobbyScreen(this.app); if (id === 'settings') this.sub = new SettingsScreen(this.app); if (id === 'about') this.sub = new AboutScreen(this.app); }
  }
  diffMenu(ui) { const keys = Object.keys(DIFFICULTY), items = keys.map((k) => ({ label: DIFFICULTY[k].name })); ui.center(100, 'NEW CLAIM: CHOOSE YOUR COVER', { color: 'sand' }); const i = ui.list(this.pick, items, { x: ui.W / 2 - 80, y: 118, w: 160, rowH: 19 }); ui.center(182, DIFFICULTY[keys[this.pick.focus]].about, { color: 'mist' }); ui.prompts([['confirm', 'SIGN'], ['back', 'BACK']]); if (ui.back) { this.pick = null; ui.sound('uiback'); } if (i >= 0) this.app.newGame(keys[i]); }
  touchOnly(ui) { if (!this.touchAttractDone) { this.touchAttractDone = true; } this.app.startAttract(true); }
  status() { return `title idle ${this.idle.toFixed(1)}`; }
}
