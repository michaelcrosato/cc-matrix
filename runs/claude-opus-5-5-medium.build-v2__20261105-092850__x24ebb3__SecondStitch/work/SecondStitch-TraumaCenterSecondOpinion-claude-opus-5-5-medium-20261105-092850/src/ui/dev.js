// Dev Mode: from Pause. Tabs on L1/R1, Q/E or click.
import { Menu } from './menu.js';
import { app } from '../core/app.js';
import { config, defaults, SLIDERS } from '../core/config.js';
import { applyLiveConfig, dev } from '../sim/op.js';
import { CAMPAIGN_OPS, OPS } from '../content/ops/index.js';
import { SCENES } from '../content/scenes/index.js';
import { go } from '../stages/stage.js';

const TABS = ['BALANCE', 'CHEATS', 'JUMP', 'ACTIONS', 'VIEW'];
export class DevScreen {
  constructor(stage, ctx, onBack) { this.stage = stage; this.ctx = ctx; this.onBack = onBack; this.tab = 0; this.rebuild(); this.tabHit = []; this.jumpOp = CAMPAIGN_OPS.indexOf(stage.sim?.opId); if (this.jumpOp < 0) this.jumpOp = 0; this.jumpStage = 0; this.jumpScene = 0; }
  rebuild() {
    const items = { BALANCE: this.balance(), CHEATS: this.cheats(), JUMP: this.jump(), ACTIONS: this.actions(), VIEW: this.view() }[TABS[this.tab]];
    const W = this.ctx.hud.width;
    this.menu = new Menu(app, items, { y: 46, rowH: 20, width: Math.min(360, W - 24), maxRows: Math.min(9, Math.floor((this.ctx.hud.height - 80) / 20)) });
  }
  /** Live, on the running op too. */
  setCfg(k, v) {
    const before = config[k], sim = this.stage.sim;
    config[k] = v;
    if (sim) applyLiveConfig(sim, k, v, before);
  }
  balance() {
    return [
      ...SLIDERS.map(([k, label, min, max, st]) => ({ label, sliderKey: k, value: () => (st < 1 ? config[k].toFixed(2) : String(config[k])), bar: () => (config[k] - min) / (max - min), adjust: (d) => this.setCfg(k, Math.max(min, Math.min(max, Math.round((config[k] + d * st) * 100) / 100))) })),
      { label: 'RESET TO DEFAULTS', action: () => { for (const k of Object.keys(defaults)) this.setCfg(k, defaults[k]); } },
    ];
  }
  cheats() {
    const sim = this.stage.sim, c = sim?.cheats ?? {};
    const t = (label, key) => ({ label, value: () => (c[key] ? 'ON' : 'OFF'), adjust: () => { c[key] = !c[key]; (app.flags.cheats ??= {})[key] = c[key]; } });
    return [t('GOD VITALS', 'god'), t('INFINITE COMPOSURE', 'infComposure'), t('FREEZE CLOCK', 'freezeClock'), t('UNLIMITED MISTAKES', 'unlimitedMistakes'),
      { label: 'UNLOCK ALL', action: () => { for (const id of CAMPAIGN_OPS) app.save.cleared[id] = true; app.persist(); this.toast('EVERY OP UNLOCKED'); } }];
  }
  jump() {
    const ids = Object.keys(SCENES);
    return [
      { label: 'OP', value: () => OPS[CAMPAIGN_OPS[this.jumpOp]].title, adjust: (d) => { this.jumpOp = (this.jumpOp + d + CAMPAIGN_OPS.length) % CAMPAIGN_OPS.length; this.jumpStage = 0; } },
      { label: 'STAGE', value: () => `${this.jumpStage + 1}/${OPS[CAMPAIGN_OPS[this.jumpOp]].stages.length} ${OPS[CAMPAIGN_OPS[this.jumpOp]].stages[this.jumpStage].id.toUpperCase()}`, adjust: (d) => { const n = OPS[CAMPAIGN_OPS[this.jumpOp]].stages.length; this.jumpStage = (this.jumpStage + d + n) % n; } },
      { label: 'GO TO OP', action: async () => { const { OperationStage } = await import('../stages/operation.js'); const { resultsThenBack } = await import('../stages/flow.js'); go(new OperationStage({ op: CAMPAIGN_OPS[this.jumpOp], stage: this.jumpStage, onWin: resultsThenBack(CAMPAIGN_OPS[this.jumpOp]) })); } },
      { label: 'SCENE', value: () => SCENES[ids[this.jumpScene]].title, adjust: (d) => { this.jumpScene = (this.jumpScene + d + ids.length) % ids.length; } },
      { label: 'GO TO SCENE', action: async () => { const { StoryStage } = await import('../stages/story.js'); const { backToMain } = await import('../stages/flow.js'); go(new StoryStage({ scene: ids[this.jumpScene], onDone: backToMain })); } },
    ];
  }
  actions() {
    const s = () => this.stage.sim;
    const spawnTypes = ['pool', 'bleeder', 'laceration', 'hook', 'strain'];
    return [
      { label: 'COMPLETE STAGE', action: () => { dev.completeStage(s()); this.onBack(); } },
      { label: 'WIN OP', action: () => { dev.winOp(s()); this.onBack(); } },
      { label: 'FAIL OP', action: () => { dev.failOp(s()); this.onBack(); } },
      { label: 'TRIGGER CODE BLUE', action: () => { dev.codeBlue(s()); this.onBack(); } },
      { label: 'SPAWN', value: () => spawnTypes[this.spawnIx ?? 0].toUpperCase(), adjust: (d) => { this.spawnIx = ((this.spawnIx ?? 0) + d + spawnTypes.length) % spawnTypes.length; }, action: () => { dev.spawn(s(), spawnTypes[this.spawnIx ?? 0]); this.toast('SPAWNED AT THE TIP'); } },
      { label: 'COPY OP JSON TO CONSOLE', action: () => { console.log(JSON.stringify(this.stage.def, null, 1)); this.toast('LOGGED TO THE CONSOLE'); } },
    ];
  }
  view() {
    const st = this.stage;
    return [
      { label: 'HITBOX OVERLAY', value: () => (st.hitbox ? 'ON' : 'OFF'), adjust: () => { st.hitbox = !st.hitbox; } },
      { label: 'BOT PLAYS', value: () => (st.botOn ? 'ON' : 'OFF'), adjust: () => { st.botOn = !st.botOn; } },
      { label: 'BOT SKILL', value: () => (st.botSkill ?? 0.8).toFixed(2), bar: () => st.botSkill ?? 0.8, adjust: (d) => { st.botSkill = Math.max(0.1, Math.min(1, Math.round(((st.botSkill ?? 0.8) + d * 0.05) * 100) / 100)); } },
      { label: 'SIM SPEED', value: () => `${st.simSpeed.toFixed(1)}X`, adjust: (d) => { st.simSpeed = Math.max(0.1, Math.min(3, Math.round((st.simSpeed + d * 0.1) * 10) / 10)); } },
      { label: 'FREEZE FOR FRAME STEP', value: () => (st.frameFreeze ? 'ON' : 'OFF'), adjust: () => { st.frameFreeze = !st.frameFreeze; } },
      { label: 'STEP ONE FRAME', action: () => { st.frameStep = 1; } },
      { label: 'FPS', value: () => String(Math.round(this.ctx.engine.fps)) },
      { label: 'SIM ENTITIES', value: () => String(st.sim?.ents.length ?? 0) },
      { label: 'SIM STAGE', value: () => `${st.sim?.stage ?? 0}` },
    ];
  }
  toast(text) { this.toastText = text; this.toastT = 2; }
  update(ctx, dt) {
    const n = app.devices.nav;
    if (n.tabL || n.tabR) { this.tab = (this.tab + (n.tabR ? 1 : -1) + TABS.length) % TABS.length; this.rebuild(); ctx.audio.play('uiMove'); }
    const click = app.devices.click(ctx.input);
    if (click) for (const h of this.tabHit) if (click.x >= h.x && click.x <= h.x + h.w && click.y >= h.y && click.y <= h.y + h.h) { this.tab = h.i; this.rebuild(); ctx.audio.play('uiMove'); return; }
    const r = this.menu.update(ctx);
    if (r === 'back') { this.onBack(); return; }
    if (r?.action) r.action();
    else if (r?.adjust) r.adjust(1);
    this.toastT = Math.max(0, (this.toastT ?? 0) - (dt ?? 1 / 60));
  }
  draw(ctx) {
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.rect(0, 0, W, H, 0x0d0b14);
    hud.text(8, 6, 'DEV MODE', { color: 0x7fffa0, scale: 2 });
    this.tabHit = [];
    let x = 8;
    TABS.forEach((t, i) => {
      const w = hud.measure(t).width + 8;
      hud.rect(x, 26, w, 11, i === this.tab ? 0x8a1f38 : 0x1a1f2b);
      hud.text(x + 4, 28, t, { color: i === this.tab ? 0xffffff : 0x8a93a6 });
      this.tabHit.push({ i, x, y: 26, w, h: 11 });
      x += w + 3;
    });
    this.menu.draw(hud);
    if (this.toastT > 0) hud.text(8, H - 26, this.toastText, { color: 0x7fffa0 });
    app.prompts.strip(hud, 8, H - 13, [['confirm', 'DO'], ['tabl', 'TAB'], ['tabr', 'TAB'], ['back', 'BACK']]);
  }
}
