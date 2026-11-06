// The title: a live 3D Foghorn scene, slow camera, fog. CONTINUE, NEW CLAIM, NIGHT SHIFT, SETTINGS, ABOUT.
// Ten seconds idle starts the attract mode. Touch-only: a panel, a settings button, attract behind.
import { app, goto } from '../core/app.js';
import { TITLE, TAGLINE, HEADLESS } from '../config.js';
import { hasSave, loadSave } from '../core/save.js';
import { Run } from '../core/run.js';
import { DIFFICULTY } from '../data/tuning.js';
import { WorldFx } from '../game/world.js';
import { SONGS } from '../audio/songs.js';
import { openSettings } from './settings.js';
import { openAbout } from './about.js';
import { Area } from '../game/area.js';
import { registerParticles } from '../game/fx.js';
import { buildModel, THREE, PALETTE, toonMaterial, textureMap } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';

const { Mesh, BoxGeometry, Vector3 } = THREE;
export const IDLE_SECONDS = 10;

export class TitleScene {
  name = 'title';
  constructor(o = {}) { this.o = o; this.idle = 0; this.lastActivity = -1; this.t = 0; this.look = new Vector3(0, 8, -40); this.target = new Vector3(); }

  async setup(ctx) {
    app.init(ctx.engine);
    this.ctx = ctx;
    app.area = null;
    app.closeAll();
    registerParticles(ctx.particles);
    this.world = new WorldFx(ctx);
    this.world.setMood('dusk');
    ctx.engine.sun.intensity = 0.85;
    this.world.addWater({ y: -0.2, size: [320, 320] });
    this.world.addBackdrop([
      ['foghorn-tower', 0, -1, -46, {}],
      ['cliff-silhouette', -56, -1, -66, { params: { w: 90, h: 24 }, seed: 3 }],
      ['cliff-silhouette', 60, -1, -74, { params: { w: 80, h: 18 }, seed: 8 }],
      ['abbey-far', 76, -1, -120, { scale: 1.1 }],
      ['sea-stack', -26, -1, -28, { params: { h: 10 }, seed: 4 }],
      ['sea-stack', 26, -1, -22, { params: { h: 7 }, seed: 9 }],
      ['mail-boat', 10, -1.1, -8, { turn: 110 }],
      ['rowboat', -6, -0.5, -3, { turn: 30 }],
    ]);
    ctx.lights.request({ position: [0, 18, -44], color: 0xffa040, intensity: 26, radius: 40, flicker: 'pulse', priority: 5 });
    const rig = ctx.camera;
    rig.zoomable = false;
    rig.step = () => {
      const t = this.t * 0.06;
      rig.camera.position.set(Math.sin(t) * 7, 4.5 + Math.sin(t * 0.7) * 1.2, 14 + Math.cos(t) * 4);
      rig.focus.set(0, 4, -20);
      if (rig.camera.fov !== 42) { rig.camera.fov = 42; rig.camera.updateProjectionMatrix(); }
      rig.camera.lookAt(this.look);
    };
    app.mix.play(SONGS.title, 'title', 0.3);
    this.hornT = 6;
    this.loop = ctx.audio.loop('seaLoop', { volume: 0.6 });
    this.menu = new TitleMenu(this);
    app.open(this.menu);
    this.lastActivity = app.device.activity;
    if (!HEADLESS) app.device.onLeaveTouchOnly = () => { this.touchPanel = false; };
  }

  ready() { if (typeof window !== 'undefined') window.__GAME__ = this; app.syncTime(); }
  cameraTarget() { return this.target; }

  update(ctx, dt) {
    app.device.poll(ctx.input);
    const { ui } = app;
    ui.begin(ctx);
    ctx.hud.clear();
    if (app.transitioning) { app.mix.update(ui.dt); return; }
    this.t += dt;
    this.world.update(dt, this.look);
    this.hornT -= dt;
    if (this.hornT <= 0) { this.hornT = 26; ctx.audio.play('foghorn', { volume: 0.5 }); }
    app.updateTop(ctx, ui);
    ui.end();
    app.mix.update(ui.dt);
    // Attract: 10 s with no input on the title or any menu reached from it.
    const inLobby = app.top?.lobby;
    if (app.device.activity !== this.lastActivity) { this.lastActivity = app.device.activity; this.idle = 0; }
    else if (!inLobby) this.idle += ui.dt;
    if (this.idle >= IDLE_SECONDS && !app.transitioning && !inLobby && !this.o.noAttract) {
      this.idle = 0;
      app.scenes.attract();
    }
  }

  status() { return `title idle ${this.idle.toFixed(1)}`; }
  dispose() { this.world.dispose(); }
}

class TitleMenu {
  frozen = false;
  name = 'title-menu';
  constructor(scene) { this.scene = scene; }

  drawTitle(ctx, ui) {
    // Title: scale 3 if it fits, otherwise scale 2 split into two lines at a space.
    const { W } = ui;
    let y = 22;
    if (ui.width(TITLE, 4) <= W - 24) {
      ui.centerText(y, TITLE, { scale: 4, color: 'sand', shadow: 'ink' }); y += 36;
    } else if (ui.width(TITLE, 3) <= W - 24) {
      ui.centerText(y, TITLE, { scale: 3, color: 'sand', shadow: 'ink' }); y += 28;
    } else {
      // Narrower still, a portrait tablet or phone: scale 2 on as many lines as it takes, or scale 1.
      const scale = TITLE.split(' ').every((word) => ui.width(word, 2) <= W - 12) ? 2 : 1;
      y = ui.centerWrap(y, TITLE, { scale, color: 'sand', shadow: 'ink' });
      y += 2;
    }
    y = ui.centerWrap(y, TAGLINE, { color: 'mist', shadow: 'ink' });
    return y + 7;
  }

  update(ctx, ui) {
    const { hud, W, H } = ui;
    const below = this.drawTitle(ctx, ui);
    if (app.device.touchOnly) { this.touchPanel(ctx, ui, below); return; }
    const w = 170; const x = (W - w) >> 1;
    let y = Math.max(92, (H >> 1) - 20);
    const entries = [];
    if (hasSave()) entries.push(['continue', 'CONTINUE', () => continueClaim()]);
    entries.push(['new', 'NEW CLAIM', () => app.open(new DifficultyMenu())]);
    entries.push(['shift', 'NIGHT SHIFT', () => app.scenes.nightShiftMenu()]);
    entries.push(['settings', 'SETTINGS', () => openSettings()]);
    entries.push(['about', 'ABOUT', () => openAbout()]);
    for (const [id, label, fn] of entries) {
      if (ui.item(id, x, y, w, label, { h: 19 })) { ctx.audio.play('uiConfirm'); fn(); }
      y += 21;
    }
    ui.promptBar([['confirm', 'SELECT']]);
  }

  touchPanel(ctx, ui, below = 0) {
    const { W, H, hud } = ui;
    const w = Math.min(W - 12, 320);
    const x = (W - w) >> 1;
    const lines = ui.fitLines('CONTROLLER OR KEYBOARD REQUIRED', w - 12);
    const h = 8 + lines.length * 9 + 5 + 18 + 6;
    const y = Math.max(below, (H >> 1) - (h >> 1));
    hud.rect(x, y, w, h, 'slate');
    hud.rect(x + 1, y + 1, w - 2, h - 2, 'ink');
    const after = ui.centerWrap(y + 8, 'CONTROLLER OR KEYBOARD REQUIRED', { color: 'sand' }, x, w);
    const bw = Math.min(w - 16, 120);
    if (ui.item('touchSettings', x + ((w - bw) >> 1), after + 5, bw, 'SETTINGS', { h: 18, scale: 1 })) openSettings();
  }
}

class DifficultyMenu {
  frozen = false;
  name = 'difficulty';
  update(ctx, ui) {
    const { W, H } = ui;
    ui.dim();
    ui.heading('NEW CLAIM', 20);
    const w = 260; const x = (W - w) >> 1;
    let y = 66;
    for (const key of ['assisted', 'standard', 'professional']) {
      if (ui.focus === null && key === 'standard') ui.focus = key;
      const d = DIFFICULTY[key];
      if (ui.item(key, x, y, w, d.label, { h: 19 })) {
        ctx.audio.play('uiConfirm');
        startNewClaim(key);
        return;
      }
      y += 22;
    }
    const cur = DIFFICULTY[ui.focus] ?? DIFFICULTY.standard;
    ui.centerText(y + 12, cur.text, { color: 'mist' });
    ui.promptBar([['confirm', 'SIGN'], ['back', 'BACK']]);
    if (ui.nav.back) { ctx.audio.play('uiBack'); app.close(this); }
  }
}

export function startNewClaim(difficulty = 'standard', area = 'quay', o = {}) {
  app.run = new Run();
  app.run.difficulty = difficulty;
  return goto(new Area(area, o));
}

export function continueClaim() {
  const s = loadSave();
  if (!s) return null;
  app.run = Run.from(s.data);
  app.run.checkpoint = { area: s.area, entry: s.entry, data: s.data, pos: s.pos };
  return goto(new Area(s.area, { entry: s.entry, start: s.pos ?? undefined }));
}
export { PALETTE, toonMaterial, textureMap, Mesh, BoxGeometry, buildModel, MODELS };
