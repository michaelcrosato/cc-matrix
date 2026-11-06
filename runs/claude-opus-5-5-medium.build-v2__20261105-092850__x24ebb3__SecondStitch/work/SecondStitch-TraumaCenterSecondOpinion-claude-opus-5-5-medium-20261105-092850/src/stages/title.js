// Title and Main Menu: a dim OR-7, a swinging lamp, an EKG line through the title.
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { buildSet } from '../view/sets.js';
import { TITLE, TAGLINE } from '../core/meta.js';
import { Menu } from '../ui/menu.js';
import { SettingsScreen } from '../ui/settings.js';
import { DIFFICULTY } from '../core/config.js';
import { CAMPAIGN } from '../sim/campaign.js';
import { SCENES } from '../content/scenes/index.js';
import { OPS } from '../content/ops/index.js';

const WIDE = [[3.8, 2.7, 6.4], [0, 1.1, 0]];
export class TitleStage extends Stage {
  name = 'title';
  t = 0; ekg = 0;
  async build(ctx) {
    this.set = await buildSet(ctx, 'or7');
    this.rain = ctx.audio.loop('rain', { volume: 0.4 });
    app.director?.play('title');
    app.applyLook(1, 0.5, 0);
    setView(ctx, ...WIDE, 34);
  }
  status() { return 'title'; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt);
    app.director?.update(dt);
    const a = this.t * 0.1;
    setView(ctx, [WIDE[0][0] + Math.sin(a) * 0.6, WIDE[0][1], WIDE[0][2] + Math.cos(a) * 0.3], WIDE[1], 34);
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.clear();
    drawTitle(hud, W, Math.round(H * 0.28), this.t);
    const device = app.devices.last === 'pad';
    if (Math.floor(this.t * 1.6) % 2 === 0 || this.t < 0.6) {
      const y = Math.round(H * 0.72);
      const text = device ? 'PRESS {confirm}' : 'PRESS ENTER OR CLICK';
      const w = app.prompts.items(text, hud, 0xffffff).reduce((n, i) => n + i.w, 0);
      app.prompts.draw(hud, Math.round(W / 2 - w / 2), y, text, { width: w + 6 });
    }
    if (app.swallow > 0) { app.swallow -= dt; return; }
    if (app.touchGate) { if (app.devices.idle > 2) import('./flow.js').then(({ startAttract }) => startAttract()); return; }
    if (app.devices.anyPress) { ctx.audio.play('uiConfirm'); go(new MainMenuStage()); return; }
    if (app.devices.idle >= 10) import('./flow.js').then(({ startAttract }) => startAttract());
  }
}
export function drawTitle(hud, W, y, t) {
  const tw = hud.measure(TITLE, 4).width;
  const scale = tw > W - 24 ? 3 : 4;
  const w = hud.measure(TITLE, scale).width, x = Math.round(W / 2 - w / 2);
  hud.text(x + 2, y + 2, TITLE, { scale, color: 0x3c0d24, shadow: false });
  hud.text(x, y, TITLE, { scale, color: 0xf6f2e6, shadow: 0x5e1430 });
  // An EKG line draws itself through the title.
  const cy = y + Math.round((7 * scale) / 2), span = W - 20, head = (t * 180) % (span + 60);
  for (let i = 0; i < span; i++) {
    if (i > head) break;
    const k = (i % 120) / 120;
    const v = k < 0.34 ? 0 : k < 0.38 ? -3 : k < 0.42 ? 0 : k < 0.45 ? 15 : k < 0.5 ? -18 : k < 0.53 ? 4 : k < 0.62 ? 0 : k < 0.68 ? -3 : 0;
    const fade = head - i;
    if (fade < 120) hud.rect(10 + i, cy + v, 1, 1, fade < 12 ? 0xffffff : 0x46e0a0);
  }
  const sub = TAGLINE, sw = hud.measure(sub).width;
  hud.text(Math.round(W / 2 - sw / 2), y + 7 * scale + 10, sub, { color: 0x8ad0ff });
}

export class MainMenuStage extends Stage {
  name = 'main';
  t = 0; sub = null;
  async build(ctx) {
    this.set = await buildSet(ctx, 'or7');
    this.rain = ctx.audio.loop('rain', { volume: 0.3 });
    app.director?.play('title');
    app.applyLook(1, 0.55, 0);
    const has = app.save.next > 0;
    const items = [];
    items.push({ label: has ? 'ON CALL: CONTINUE' : 'ON CALL: NEW SHIFT', id: has ? 'continue' : 'new', detail: has ? this.nextName() : 'A NIGHT SHIFT AT VERITY GENERAL.' });
    if (has) items.push({ label: 'NEW SHIFT', id: 'new', detail: 'START FROM THE BEGINNING.' });
    const hasLog = Object.keys(app.save.cleared).length > 0;
    items.push({ label: 'OPERATING LOG', id: 'log', disabled: !hasLog, detail: hasLog ? 'REPLAY WHAT YOU HAVE CLEARED.' : 'CLEAR AN OP FIRST.' });
    items.push({ label: 'CONSULT', id: 'consult', detail: 'UP TO FOUR PAIRS OF HANDS ON ONE PATIENT.' });
    items.push({ label: 'SETTINGS', id: 'settings', detail: 'SOUND, BUTTON GLYPHS, FEEL.' });
    items.push({ label: 'ABOUT', id: 'about', detail: 'SOURCE, TESTING, CREDITS.' });
    this.menu = new Menu(app, items, { x: 26, y: 96, rowH: 20, width: 180 });
    this.difficulty = null;
  }
  nextName() { const e = CAMPAIGN[app.save.next]; if (!e) return ''; if (e.scene) return `NEXT: ${SCENES[e.scene].title}`; if (e.op) return `NEXT: ${OPS[e.op].title}`; return 'NEXT: CREDITS'; }
  status() { return `main focus=${this.menu.focus}`; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt);
    app.director?.update(dt);
    const a = this.t * 0.14;
    setView(ctx, [WIDE[0][0] + Math.sin(a) * 1.4, WIDE[0][1] + 0.2, WIDE[0][2] + Math.cos(a) * 0.5], [WIDE[1][0] + 0.8, WIDE[1][1], WIDE[1][2]], 34);
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.clear();
    if (app.devices.idle >= 10) { import('./flow.js').then(({ startAttract }) => startAttract()); }
    if (this.sub) { this.sub.update(ctx, dt); this.sub?.draw(ctx); return; }
    if (this.difficulty) { this.updateDifficulty(ctx); return; }
    const titleW = hud.measure(TITLE, 3).width;
    hud.text(26, 32, TITLE, { scale: Math.min(3, Math.floor((W - 40) / (titleW / 3))), color: 0xf6f2e6, shadow: 0x5e1430 });
    hud.text(26, 60, TAGLINE, { color: 0x8ad0ff });
    const r = this.menu.update(ctx);
    hud.rect(16, 88, 200, this.menu.items.length * 20 + 6, 0x0d0b14);
    this.menu.draw(hud);
    const det = this.menu.items[this.menu.focus]?.detail;
    if (det) hud.text(26, H - 28, det, { color: 0x8a93a6 });
    app.prompts.strip(hud, 26, H - 13, [['confirm', 'SELECT'], ['back', 'TITLE']]);
    if (r === 'back') { go(new TitleStage()); return; }
    if (!r) return;
    switch (r.id) {
      case 'new': this.difficulty = new Menu(app, Object.entries(DIFFICULTY).map(([k, v]) => ({ label: v.label, id: k, detail: v.about })), { x: 26, y: 96, rowH: 20, width: 180, focus: 1 }); break;
      case 'continue': import('./flow.js').then(({ runCampaign }) => runCampaign(app.save.next)); break;
      case 'log': import('./log.js').then(({ LogStage }) => go(new LogStage())); break;
      case 'consult': import('./consult.js').then(({ ConsultStage }) => go(new ConsultStage())); break;
      case 'settings': this.sub = new SettingsScreen(ctx, () => { this.sub = null; }); break;
      case 'about': import('./about.js').then(({ AboutStage }) => go(new AboutStage())); break;
      default: break;
    }
  }
  updateDifficulty(ctx) {
    const { hud } = ctx, H = hud.height;
    hud.text(26, 62, 'PICK A DIFFICULTY', { color: 0xffd24d, scale: 2 });
    const r = this.difficulty.update(ctx);
    hud.rect(16, 88, 200, this.difficulty.items.length * 20 + 6, 0x0d0b14);
    this.difficulty.draw(hud);
    const det = this.difficulty.items[this.difficulty.focus]?.detail;
    if (det) hud.text(26, H - 28, det, { color: 0x8a93a6 });
    app.prompts.strip(hud, 26, H - 13, [['confirm', 'SELECT'], ['back', 'BACK']]);
    if (r === 'back') { this.difficulty = null; return; }
    if (r) {
      const scoresKeep = app.save.cleared;
      app.save.difficulty = r.id; app.save.next = 0; app.save.fails = {}; app.save.cleared = scoresKeep;
      app.persist();
      import('./flow.js').then(({ runCampaign }) => runCampaign(0));
    }
  }
}
