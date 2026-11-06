// Dev Mode (from Pause): BALANCE sliders, CHEATS, JUMP, ACTIONS, VIEW. Tabs on L1/R1, Q/E or click.
import { Menu } from './menu.js';
import { ctext, prompts, textW } from './hud.js';
import { cfg, DEFAULTS, SLIDERS, resetConfig } from '../core/config.js';
import { OPS } from '../content/ops/index.js';
import { SCENES } from '../content/scenes.js';
const TABS = ['BALANCE', 'CHEATS', 'JUMP', 'ACTIONS', 'VIEW'];
export class DevUI {
  constructor(app, ctx, host, back) {
    this.app = app; this.ctx = ctx; this.host = host; this.back = back; this.tab = 0; this.jumpOp = 0; this.jumpStage = 0; this.sceneI = 0; this.menus = []; this.build(); this.tabRects = [];
  }
  build() {
    const h = this.host, c = h.cheats;
    const sl = SLIDERS.map(([k, label, lo, hi, st]) => ({ label, slider: true, value: () => (+cfg[k].toFixed(2)).toString(), frac: () => (cfg[k] - lo) / (hi - lo), onLeft: () => { cfg[k] = Math.max(lo, +(cfg[k] - st).toFixed(3)); h.cfgChanged?.(); }, onRight: () => { cfg[k] = Math.min(hi, +(cfg[k] + st).toFixed(3)); h.cfgChanged?.(); }, onSet: (f) => { cfg[k] = Math.round((lo + f * (hi - lo)) / st) * st; h.cfgChanged?.(); } }));
    sl.push({ label: 'RESET TO DEFAULTS', onSelect: () => { resetConfig(); this.app.applySettings(this.ctx); h.cfgChanged?.(); } });
    const tg = (label, key) => ({ label, value: () => (c[key] ? 'ON' : 'OFF'), onSelect: () => { c[key] = !c[key]; h.cheatsChanged?.(); }, onLeft: () => { c[key] = !c[key]; h.cheatsChanged?.(); }, onRight: () => { c[key] = !c[key]; h.cheatsChanged?.(); } });
    const cheats = [tg('GOD VITALS', 'god'), tg('INFINITE COMPOSURE', 'composure'), tg('FREEZE CLOCK', 'freezeClock'), tg('UNLIMITED MISTAKES', 'unlimited'), { label: 'UNLOCK ALL', onSelect: () => { h.unlockAll?.(); } }];
    const jump = [
      { label: 'OPERATION', value: () => `${this.jumpOp + 1} ${OPS[this.jumpOp].title}`, onLeft: () => { this.jumpOp = (this.jumpOp + OPS.length - 1) % OPS.length; this.jumpStage = 0; }, onRight: () => { this.jumpOp = (this.jumpOp + 1) % OPS.length; this.jumpStage = 0; } },
      { label: 'STAGE', value: () => `${this.jumpStage + 1} ${OPS[this.jumpOp].stages[this.jumpStage]?.id.toUpperCase()}`, onLeft: () => { const n = OPS[this.jumpOp].stages.length; this.jumpStage = (this.jumpStage + n - 1) % n; }, onRight: () => { this.jumpStage = (this.jumpStage + 1) % OPS[this.jumpOp].stages.length; } },
      { label: 'GO TO OPERATION', onSelect: () => h.jumpOp?.(OPS[this.jumpOp].id, this.jumpStage) },
      { label: 'STORY SCENE', value: () => SCENES[this.sceneI].title, onLeft: () => { this.sceneI = (this.sceneI + SCENES.length - 1) % SCENES.length; }, onRight: () => { this.sceneI = (this.sceneI + 1) % SCENES.length; } },
      { label: 'PLAY SCENE', onSelect: () => h.jumpScene?.(SCENES[this.sceneI].id) },
    ];
    const act = [
      { label: 'COMPLETE STAGE', onSelect: () => h.act('stage') }, { label: 'WIN OP', onSelect: () => h.act('win') }, { label: 'FAIL OP', onSelect: () => h.act('fail') }, { label: 'TRIGGER CODE BLUE', onSelect: () => h.act('cb') },
      ...['pool', 'bleeder', 'laceration', 'hook', 'strain'].map((k) => ({ label: 'SPAWN ' + k.toUpperCase(), onSelect: () => h.spawn(k) })), { label: 'COPY OP JSON TO CONSOLE', onSelect: () => h.act('json') },
    ];
    const view = [
      { label: 'HITBOX OVERLAY', value: () => (h.view.hit ? 'ON' : 'OFF'), onSelect: () => (h.view.hit = !h.view.hit), onLeft: () => (h.view.hit = !h.view.hit), onRight: () => (h.view.hit = !h.view.hit) },
      { label: 'BOT PLAYS', value: () => (h.view.bot ? 'ON' : 'OFF'), onSelect: () => (h.view.bot = !h.view.bot), onLeft: () => (h.view.bot = !h.view.bot), onRight: () => (h.view.bot = !h.view.bot) },
      { label: 'BOT SKILL', slider: true, value: () => h.view.skill.toFixed(2), frac: () => h.view.skill, onLeft: () => (h.view.skill = Math.max(0, +(h.view.skill - 0.05).toFixed(2))), onRight: () => (h.view.skill = Math.min(1, +(h.view.skill + 0.05).toFixed(2))), onSet: (f) => (h.view.skill = Math.round(f * 20) / 20) },
      { label: 'SIM SPEED', slider: true, value: () => h.view.speed.toFixed(1) + 'X', frac: () => (h.view.speed - 0.1) / 2.9, onLeft: () => (h.view.speed = Math.max(0.1, +(h.view.speed - 0.1).toFixed(1))), onRight: () => (h.view.speed = Math.min(3, +(h.view.speed + 0.1).toFixed(1))), onSet: (f) => (h.view.speed = Math.round((0.1 + f * 2.9) * 10) / 10) },
      { label: 'FRAME STEP', onSelect: () => h.frameStep?.() }, { label: 'FPS AND SIM STATS', value: () => (h.view.stats ? 'ON' : 'OFF'), onSelect: () => (h.view.stats = !h.view.stats), onLeft: () => (h.view.stats = !h.view.stats), onRight: () => (h.view.stats = !h.view.stats) },
    ];
    this.menus = [new Menu(sl), new Menu(cheats), new Menu(jump), new Menu(act), new Menu(view)];
  }
  update(nav, dt) {
    if (nav.tabL) this.tab = (this.tab + TABS.length - 1) % TABS.length; if (nav.tabR) this.tab = (this.tab + 1) % TABS.length;
    if (nav.click) for (let i = 0; i < TABS.length; i++) { const q = this.tabRects[i]; if (q && nav.click[0] >= q[0] && nav.click[0] < q[0] + q[2] && nav.click[1] >= q[1] && nav.click[1] < q[1] + q[3]) { this.tab = i; nav.click = null; } }
    const m = this.menus[this.tab]; const r = m.update(nav, this.app, dt, this.ctx.audio); if (r === 'back') this.back?.();
  }
  draw(hud) {
    hud.rect(0, 0, hud.width, hud.height, 'night'); ctext(hud, 4, 'DEV MODE', { scale: 2, color: 'orange' });
    let x = 20; TABS.forEach((t, i) => { const w = textW(hud, t) + 14; hud.rect(x, 26, w, 13, i === this.tab ? 'sand' : 'navy'); hud.text(x + 7, 29, t, { color: i === this.tab ? 'ink' : 'white', shadow: false }); this.tabRects[i] = [x, 26, w, 13]; x += w + 3; });
    const m = this.menus[this.tab], n = m.items.length, vis = this.tab === 0 ? 10 : 11; const sc = Math.max(0, Math.min(n - vis, m.i - 5));
    const items = m.items, oi = m.i; m.items = items.slice(sc, sc + vis); m.i = oi - sc; m.draw(hud, 46, { rowH: 19 }); m.items = items; m.i = oi; const rects = m.rects; m.rects = []; rects.forEach((q, k) => (m.rects[k + sc] = q));
    prompts(hud, this.app, [{ act: 'tabs', label: 'TAB' }, { act: 'confirm', label: 'SELECT' }, { act: 'back', label: 'BACK' }], 'center', hud.height - 12);
  }
}
