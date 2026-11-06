// Title, main menu, on-call, operating log, about, settings. After 10 s idle the attract mode starts.
import { THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go } from '../core/nav.js';
import { Menu } from '../ui/menu.js';
import { SettingsScreen } from '../ui/settings.js';
import { ctext, mtext, textW, wrap, prompts, ekg, bar } from '../ui/hud.js';
import { buildSet } from '../view/sets.js';
import { OPS } from '../content/ops/index.js';
import { CAMPAIGN, isUnlocked } from '../sim/campaign.js';
import { ABOUT } from '../content/about.js';
import { LOOK } from '../core/look.js';
import { TITLE, TAGLINE } from '../core/meta.js';
import { DIFFS } from '../core/config.js';
const IDLE_MS = 10000;
export class MenuStage {
  name = 'Menu';
  constructor(a = {}) { this.a = a; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; ctx.engine.setLook(LOOK(0.9, 0.55, 0)); this.screen = this.a.screen || 'title';
    const { ensureKit } = await import('../view/sets.js'); await ensureKit();
    this.set = buildSet(ctx, 'or7'); ctx.engine.sun.intensity = 0.25; ctx.engine.ambient.intensity = 0.22; this.cam = new THREE.Vector3(0, 4.6, 8.6);
    app.director.start(ctx, 'title', 0); this.swallow = this.a.swallow ? 0.6 : 0; this.idleStart = performance.now(); this.sub = null; this.logI = 0; this.aboutI = 0;
    this.buildMain(ctx); app.applySettings(ctx); ctx.input.preventKeys.add('Tab');
    if (typeof document !== 'undefined' && ctx.engine.container) ctx.engine.container.style.cursor = '';
    this.lastAct = app.devices.activity; app.attractActive = false;
  }
  cameraTarget() { return new THREE.Vector3(0, 1.6, 0); }
  status() { return `menu ${this.screen}`; }
  buildMain(ctx) {
    const s = app.save, has = s.next > 0 && s.next < CAMPAIGN.length;
    const items = [];
    if (has) items.push({ label: 'CONTINUE', onSelect: () => this.continueGame(ctx) });
    items.push({ label: has ? 'NEW SHIFT' : 'ON CALL', onSelect: () => this.openDiff(ctx) });
    items.push({ label: 'OPERATING LOG', onSelect: () => (this.screen = 'log') }, { label: 'CONSULT', onSelect: () => go.consult(ctx) }, { label: 'SETTINGS', onSelect: () => { this.screen = 'settings'; this.sub = new SettingsScreen(app, ctx, () => { this.screen = 'main'; this.sub = null; }); } }, { label: 'ABOUT', onSelect: () => { this.screen = 'about'; this.aboutI = 0; } });
    this.main = new Menu(items);
  }
  openDiff(ctx) {
    this.screen = 'diff'; const pick = (d) => { app.save.difficulty = d; app.settings.difficulty = d; app.save.next = 0; app.save.quietOn = false; app.flush(); this.startShift(ctx); };
    this.diff = new Menu([{ label: 'INTERN', value: 'TIME +40%, DRAIN -40%, TWO CODE BLUE SAVES', onSelect: () => pick('intern') }, { label: 'RESIDENT', value: 'THE INTENDED SHIFT', onSelect: () => pick('resident') }, { label: 'ATTENDING', value: 'TIME -20%, DRAIN +30%, NO HINTS', onSelect: () => pick('attending') }]); this.diff.i = 1;
  }
  startShift(ctx) { app.save.next = 0; go.story(ctx, 'ep1', { next: () => go.briefing(ctx, 'op1') }); }
  continueGame(ctx) { const st = CAMPAIGN[Math.min(app.save.next, CAMPAIGN.length - 1)]; if (st.op) go.story(ctx, st.scene, { next: () => go.briefing(ctx, st.op) }); else go.story(ctx, st.scene, { next: () => go.credits(ctx) }); }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices; dev.poll(dt, ctx); let nav = dev.nav; this.t += dt; this.set.update(dt, this.t);
    const cam = ctx.camera.camera; cam.position.set(Math.sin(this.t * 0.15) * 1.2, 3.8 + Math.sin(this.t * 0.1) * 0.3, 8.8); cam.fov = 46; cam.updateProjectionMatrix(); cam.lookAt(0, 1.5, 0); cam.updateMatrixWorld?.(true);
    if (this.swallow > 0) { this.swallow -= dt; if (this.swallow > 0 || nav.any) { nav = dev.emptyNav(); } }
    if (dev.activity !== this.lastAct) { this.lastAct = dev.activity; this.idleStart = performance.now(); }
    if (performance.now() - this.idleStart > IDLE_MS && !this.noAttract) { app.attractActive = true; return go.attractStart(ctx); }
    hud.clear(); const w = hud.width, h = hud.height; this.nav = nav;
    if (this.screen === 'title') this.drawTitle(ctx, hud, nav, dt);
    else if (this.screen === 'main') { this.drawHeader(hud); const r = this.main.update(nav, app, dt, ctx.audio); this.main.draw(hud, 108, { rowH: 24 }); prompts(hud, app, [{ act: 'nav', label: 'MOVE' }, { act: 'confirm', label: 'SELECT' }], 'center', h - 14); if (r === 'back') this.screen = 'title'; }
    else if (this.screen === 'diff') { this.drawHeader(hud); ctext(hud, 100, 'CHOOSE A DIFFICULTY', { color: 'sand' }); const r = this.diff.update(nav, app, dt, ctx.audio); this.diff.draw(hud, 124, { rowH: 26 }); prompts(hud, app, [{ act: 'confirm', label: 'BEGIN' }, { act: 'back', label: 'BACK' }], 'center', h - 14); if (r === 'back') this.screen = 'main'; }
    else if (this.screen === 'settings') { this.sub.update(nav, dt); this.sub.draw(hud); }
    else if (this.screen === 'log') this.drawLog(ctx, hud, nav);
    else if (this.screen === 'about') this.drawAbout(ctx, hud, nav);
  }
  drawHeader(hud) { ctext(hud, 20, TITLE, { scale: 3, color: 'white' }); ctext(hud, 50, TAGLINE.toUpperCase(), { color: 'sand' }); hud.rect(0, 0, hud.width, 6, 'ink'); }
  drawTitle(ctx, hud, nav, dt) {
    const w = hud.width, h = hud.height; hud.rect(0, 0, w, 30, 'ink'); hud.rect(0, h - 50, w, 50, 'ink');
    ekg(hud, 40, 70, w - 80, 40, this.t, 1.1, 'lime', 0); ctext(hud, 86, TITLE, { scale: 4, color: 'white' }); ctext(hud, 120, TAGLINE.toUpperCase(), { scale: 1, color: 'sand' });
    ctext(hud, 20, 'A SURGICAL DRAMA IN PIXEL ART', { color: 'mist' });
    if (((this.t * 1.6) | 0) % 2 === 0) prompts(hud, app, [{ act: 'any', label: 'PRESS TO BEGIN' }], 'center', h - 40);
    ctext(hud, h - 12, 'THE TRUTH, STAT.', { color: 'slate' });
    if (nav.any && nav.confirm || nav.click || (nav.any && !nav.hover)) { ctx.audio.play('uiOk'); this.screen = 'main'; }
  }
  drawLog(ctx, hud, nav) {
    const w = hud.width, h = hud.height; hud.rect(0, 0, w, h, 'night'); ctext(hud, 8, 'OPERATING LOG', { scale: 2, color: 'sand' });
    if (nav.x) { this.logI = (this.logI + nav.x + OPS.length) % OPS.length; ctx.audio.play('uiMove'); } if (nav.tabL) this.logI = (this.logI + OPS.length - 1) % OPS.length; if (nav.tabR) this.logI = (this.logI + 1) % OPS.length;
    const op = OPS[this.logI], c = app.save.cleared[op.id], un = isUnlocked(app.save, op.id), cw = 300, cx = Math.round((w - cw) / 2);
    hud.rect(cx - 2, 36, cw + 4, 190, 'slate'); hud.rect(cx, 38, cw, 186, 'white');
    hud.text(cx + 10, 46, `OP ${this.logI + 1}`, { color: 'red', shadow: false }); hud.text(cx + 10, 58, op.title, { color: 'ink', scale: 2, shadow: false });
    if (un) { hud.text(cx + 10, 82, op.patient.name, { color: 'navy', shadow: false }); wrap(hud, op.patient.hook, cw - 24).slice(0, 3).forEach((l, i) => hud.text(cx + 10, 94 + i * 10, l, { color: 'ink', shadow: false }));
      if (c) { hud.text(cx + cw - 70, 50, c.best, { scale: 5, color: { S: 'sand', A: 'lime', B: 'sky', C: 'orange' }[c.best], shadow: 'ink' }); hud.text(cx + 10, 132, `BEST SCORE ${c.bestScore}   PLAYS ${c.plays}`, { color: 'navy', shadow: false }); wrap(hud, op.patient.followUp[c.best] || op.patient.followUp.C, cw - 24).slice(0, 3).forEach((l, i) => hud.text(cx + 10, 148 + i * 10, l, { color: 'ink', shadow: false })); if (c.pristine) hud.text(cx + 10, 184, 'PRISTINE', { color: 'sand', shadow: 'ink' }); }
      else hud.text(cx + 10, 132, 'NOT YET OPERATED ON.', { color: 'mist', shadow: false }); hud.text(cx + 10, 205, 'PRESS TO REPLAY THIS OPERATION', { color: 'green', shadow: false }); }
    else { hud.text(cx + 10, 100, 'LOCKED. FINISH THE PREVIOUS SHIFT.', { color: 'red', shadow: false }); }
    ctext(hud, 232, `< ${this.logI + 1} / ${OPS.length} >`, { color: 'white' }); prompts(hud, app, [{ act: 'nav', label: 'FLIP' }, { act: 'confirm', label: 'REPLAY' }, { act: 'back', label: 'BACK' }], 'center', h - 14);
    if (nav.back || nav.rclick) { this.screen = 'main'; ctx.audio.play('uiBack'); } if ((nav.confirm || nav.click) && un) go.briefing(ctx, op.id, { replay: true });
  }
  drawAbout(ctx, hud, nav) {
    const w = hud.width, h = hud.height, pages = ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'];
    hud.rect(0, 0, w, h, 'night'); ctext(hud, 6, 'ABOUT', { scale: 2, color: 'sand' });
    if (nav.x) { this.aboutI = (this.aboutI + nav.x + 5) % 5; ctx.audio.play('uiMove'); this.aboutScroll = 0; } if (nav.tabL) this.aboutI = (this.aboutI + 4) % 5; if (nav.tabR) this.aboutI = (this.aboutI + 1) % 5;
    ctext(hud, 28, `< ${pages[this.aboutI]} >`, { color: 'white', scale: 1 }); const lines = []; const B = ABOUT;
    if (this.aboutI === 0) for (const [k, v] of B.source) { lines.push({ t: k, c: 'sand' }); wrap(hud, v, w - 60).forEach((l) => lines.push({ t: l, c: 'white' })); }
    else if (this.aboutI === 4) for (const l of B.credits) wrap(hud, l || ' ', w - 60).forEach((x) => lines.push({ t: x, c: 'white' }));
    else { const arr = [B.testing, B.engine, B.prompt][this.aboutI - 1]; for (const [q, a] of arr) { wrap(hud, q, w - 60).forEach((l) => lines.push({ t: l, c: 'sand' })); wrap(hud, a, w - 60).forEach((l) => lines.push({ t: l, c: 'white' })); lines.push({ t: ' ', c: 'white' }); } }
    this.aboutScroll = this.aboutScroll || 0; const vis = 17; if (nav.y) this.aboutScroll = Math.max(0, Math.min(Math.max(0, lines.length - vis), this.aboutScroll + nav.y * 3)); if (nav.wheel) this.aboutScroll = Math.max(0, Math.min(Math.max(0, lines.length - vis), this.aboutScroll + Math.sign(nav.wheel) * 3));
    lines.slice(this.aboutScroll, this.aboutScroll + vis).forEach((l, i) => hud.text(30, 44 + i * 12, l.t, { color: l.c }));
    if (lines.length > vis) bar(hud, w - 16, 44, 4, 200, this.aboutScroll / Math.max(1, lines.length - vis), 'sand');
    prompts(hud, app, [{ act: 'nav', label: 'PAGE / SCROLL' }, { act: 'back', label: 'BACK' }], 'center', h - 14); if (nav.back || nav.rclick) { this.screen = 'main'; ctx.audio.play('uiBack'); }
  }
  dispose() {}
}
