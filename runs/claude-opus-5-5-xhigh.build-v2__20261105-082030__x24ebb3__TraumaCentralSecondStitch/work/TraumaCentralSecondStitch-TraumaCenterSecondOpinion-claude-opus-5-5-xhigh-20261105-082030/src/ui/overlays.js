// Screens on top of a stage: On Call, Pause, Failure, Settings, About, Dev Mode. All on the HUD canvas,
// navigable by pad, keys and mouse.
import { App } from '../app.js';
import { ABOUT_PAGES } from '../content/about.js';
import { OPS } from '../content/ops/index.js';
import { SCENES } from '../content/scenes/index.js';
import { DIFFICULTIES, resetConfig, SLIDERS } from '../core/config.js';
import { LOOK_CHOICES } from '../view/looks.js';
import { Menu } from './menu.js';

const pop = () => { App.overlays.pop(); };
const dim = (ui) => { for (let y = 0; y < ui.h; y += 2) ui.rect(0, y, ui.w, 1, 'ink'); };
const pct = (v) => `${Math.round(v * 100)}%`;

export class OnCallOverlay {
  constructor(stage) {
    this.stage = stage;
    const prog = App.save.progress;
    const items = [];
    if (prog && !prog.finished) items.push({ label: 'CONTINUE', blurb: `EPISODE ${Math.min(10, prog.episode + 1)} OF 10. ${DIFFICULTIES[prog.difficulty].label}.`, onConfirm: () => this.cont() });
    items.push({ label: 'NEW SHIFT', blurb: 'A STORM. 3 A.M. THE CHIEF IS UNREACHABLE.', onConfirm: () => this.pick() });
    this.menu = new Menu(App, items, { w: 170, y: 110, rows: 3, onBack: pop });
    this.pickMode = false;
  }
  async cont() { pop(); (await import('../stages/flow.js')).goCampaign(); }
  pick() {
    this.pickMode = true;
    const items = Object.values(DIFFICULTIES).map((d) => ({ label: d.label, blurb: d.blurb, onConfirm: () => this.begin(d.id) }));
    this.menu = new Menu(App, items, { w: 170, y: 110, rows: 3, start: 1, onBack: pop });
  }
  async begin(d) { App.newRun(d); App.save.settings.difficulty = d; pop(); (await import('../stages/flow.js')).goCampaign(); }
  update(ui) { this.menu.update(ui); }
  draw(ui) {
    dim(ui);
    ui.panel((ui.w - 230) / 2, 76, 230, 110);
    ui.center(84, this.pickMode ? 'DIFFICULTY' : 'ON CALL', { color: 'sand', scale: 2 });
    this.menu.draw(ui);
    ui.hints([['confirm', 'OK'], ['back', 'BACK']]);
  }
}

export class PauseOverlay {
  constructor(stage) {
    this.stage = stage;
    const isOp = !!stage.sim;
    const items = [{ label: 'RESUME', onConfirm: pop }];
    if (isOp) {
      items.push({ label: 'RETRY STAGE', blurb: 'BACK TO THE START OF THIS STAGE. RANK CAPPED AT B.', onConfirm: () => stage.retry() });
      items.push({ label: 'RESTART', blurb: 'THE WHOLE OPERATION AGAIN.', onConfirm: () => { pop(); stage.restart(); } });
    }
    items.push({ label: 'SETTINGS', onConfirm: () => App.overlays.push(new SettingsOverlay(stage)) });
    items.push({ label: 'DEV MODE', blurb: 'BALANCE, CHEATS, JUMP, ACTIONS, VIEW.', onConfirm: () => App.overlays.push(new DevOverlay(stage)) });
    items.push({ label: 'QUIT TO MENU', blurb: 'YOUR SHIFT IS SAVED AT THE LAST OPERATION.', onConfirm: async () => { pop(); (await import('../stages/flow.js')).toTitle(); } });
    this.menu = new Menu(App, items, { w: 170, y: 76, rows: 6, onBack: pop });
  }
  update(ui) {
    this.menu.update(ui);
    if (App.devices.nav.start && App.overlays[App.overlays.length - 1] === this && !App.devices.nav.back) pop();
  }
  draw(ui) {
    dim(ui);
    ui.panel((ui.w - 220) / 2, 44, 220, 142);
    ui.center(52, 'PAUSED', { color: 'sand', scale: 2 });
    this.menu.draw(ui);
    ui.hints([['confirm', 'OK'], ['back', 'RESUME']]);
  }
}

export class FailOverlay {
  constructor(stage) {
    this.stage = stage;
    stage.fails = (stage.fails ?? 0) + 1;
    this.line = stage.failReason === 'clock' ? 'Time. Time of death...' : stage.failReason === 'mistakes' ? 'Doctor. Step away from the table. Time of death...' : stage.failReason === 'cold' ? 'The kidney is gone. So is she. Time of death...' : 'Time of death...';
    const items = [
      { label: 'RETRY FROM THIS STAGE', blurb: 'RANK CAPPED AT B.', onConfirm: () => stage.retry() },
      { label: 'RESTART', blurb: 'THE WHOLE OPERATION AGAIN.', onConfirm: () => { pop(); stage.restart(); } },
    ];
    const diff = stage.sim.diffId;
    if (stage.fails >= 2 && diff !== 'intern') {
      const lower = diff === 'attending' ? 'resident' : 'intern';
      items.unshift({ label: `LOWER TO ${DIFFICULTIES[lower].label}`, blurb: 'NOBODY WILL KNOW. REYES WILL KNOW.', onConfirm: () => { if (App.save.progress) { App.save.progress.difficulty = lower; App.persist(); } pop(); stage.restart(lower); } });
    }
    if (stage.mode !== 'story') items.push({ label: 'QUIT', onConfirm: async () => { pop(); (await import('../stages/flow.js')).toTitle(); } });
    else items.push({ label: 'QUIT TO MENU', onConfirm: async () => { pop(); (await import('../stages/flow.js')).toTitle(); } });
    this.menu = new Menu(App, items, { w: 220, y: 100, rows: 5 });
    this.t = 0;
  }
  update(ui, dt) { this.t += dt; if (this.t > 0.4) this.menu.update(ui); }
  draw(ui) {
    dim(ui);
    ui.rect(0, 52, ui.w, 30, 'ink');
    ui.center(55, 'FLATLINE', { color: 'red', scale: 2 });
    ui.center(74, `NURSE REYES: "${this.line}"`, { color: 'white' });
    ui.rect((ui.w - 250) / 2, 92, 250, 72, 'night');
    ui.outline((ui.w - 250) / 2, 92, 250, 72, 'red');
    this.menu.draw(ui);
  }
}

export class SettingsOverlay {
  constructor(stage) {
    this.stage = stage;
    const S = App.save.settings;
    const audio = App.ctx.audio;
    const step = (key, delta, min = 0, max = 1) => { S[key] = Math.round(Math.min(max, Math.max(min, S[key] + delta)) * 100) / 100; App.persist(); };
    const cycle = (key, list, dir) => { const i = list.indexOf(S[key]); S[key] = list[(i + dir + list.length) % list.length]; App.persist(); };
    const volMusic = (d) => { audio.setVolume('music', Math.round(Math.min(1, Math.max(0, audio.volume.music + d)) * 100) / 100); };
    const volSfx = (d) => { step('sound', d); audio.setVolume('sfx', S.sound); App.sfx('uiMove'); };
    const LOOKS = LOOK_CHOICES.map((l) => l[0]);
    const row = (label, value, onLeft, onRight, blurb) => ({ label, value, onLeft, onRight, blurb });
    const items = [
      row('MUSIC', () => pct(audio.volume.music), () => volMusic(-0.05), () => volMusic(0.05), 'MUSIC STARTS AT 10%.'),
      row('SOUND', () => pct(S.sound), () => volSfx(-0.05), () => volSfx(0.05)),
      row('VOICES', () => pct(S.voices), () => step('voices', -0.05), () => { step('voices', 0.05); App.voiceChar('reyes', 'ah', 0); }),
      row('BUTTON GLYPHS', () => (S.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), () => cycle('glyphs', ['playstation', 'xbox'], 1), () => cycle('glyphs', ['playstation', 'xbox'], 1)),
      row('AIM ASSIST', () => S.aimAssist.toUpperCase(), () => cycle('aimAssist', ['off', 'low', 'high'], -1), () => cycle('aimAssist', ['off', 'low', 'high'], 1), 'STICKS AND KEYS ONLY.'),
      row('CURSOR SPEED', () => pct(S.cursorSpeed), () => step('cursorSpeed', -0.05, 0.4, 2), () => step('cursorSpeed', 0.05, 0.4, 2)),
      row('RUMBLE', () => (S.rumble ? 'ON' : 'OFF'), () => { S.rumble = !S.rumble; App.persist(); }, () => { S.rumble = !S.rumble; App.persist(); App.rumble({ strong: 0.6, weak: 0.4, ms: 150 }); }),
      row('GIFT', () => S.giftMode.toUpperCase(), () => cycle('giftMode', ['hold', 'toggle'], 1), () => cycle('giftMode', ['hold', 'toggle'], 1), 'HOLD OR TOGGLE THE QUIET.'),
      row('LOOK', () => LOOK_CHOICES[Math.max(0, LOOKS.indexOf(S.look))][1], () => { cycle('look', LOOKS, -1); this.refreshLook(); }, () => { cycle('look', LOOKS, 1); this.refreshLook(); }, 'ANY OF THE ENGINE\'S LOOKS.'),
      row('PIXEL SIZE', () => String(S.pixelSize), () => { step('pixelSize', -1, 1, 4); this.refreshLook(); }, () => { step('pixelSize', 1, 1, 4); this.refreshLook(); }),
      row('SCREEN SHAKE', () => pct(S.shake), () => step('shake', -0.25), () => { step('shake', 0.25); App.shake(0.4); }),
      row('REDUCE FLASHES', () => (S.reduceFlashes ? 'ON' : 'OFF'), () => { S.reduceFlashes = !S.reduceFlashes; App.persist(); }, () => { S.reduceFlashes = !S.reduceFlashes; App.persist(); }),
      row('TEXT SPEED', () => pct(S.textSpeed), () => step('textSpeed', -0.25, 0.5, 3), () => step('textSpeed', 0.25, 0.5, 3)),
      row('DIFFICULTY', () => DIFFICULTIES[App.save.progress?.difficulty ?? S.difficulty].label, () => this.diff(-1), () => this.diff(1), 'APPLIES FROM THE NEXT OPERATION.'),
      { label: 'FULLSCREEN', value: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF'), onConfirm: () => this.fullscreen(), onRight: () => this.fullscreen(), onLeft: () => this.fullscreen() },
      { label: 'RESET', blurb: 'EVERYTHING HERE BACK TO DEFAULTS.', onConfirm: () => { App.resetSettings(); pop(); App.overlays.push(new SettingsOverlay(stage)); } },
    ];
    this.menu = new Menu(App, items, { w: 300, y: 42, rows: 8, onBack: pop, rowH: 18 });
  }
  diff(dir) {
    const list = Object.keys(DIFFICULTIES);
    const cur = App.save.progress?.difficulty ?? App.save.settings.difficulty;
    const next = list[(list.indexOf(cur) + dir + list.length) % list.length];
    App.save.settings.difficulty = next;
    if (App.save.progress) App.save.progress.difficulty = next;
    App.persist();
  }
  refreshLook() {
    App.engine._gameLook = null;
    App.engine.setLook(App.engine.look);
    if (this.stage.updateLook) this.stage.updateLook(App.ctx, true);
    else import('../view/looks.js').then((m) => m.applyLook(App.engine, App.save.settings));
  }
  fullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  update(ui) { this.menu.update(ui); }
  draw(ui) {
    dim(ui);
    ui.panel((ui.w - 340) / 2, 12, 340, ui.h - 30);
    ui.center(20, 'SETTINGS', { color: 'sand', scale: 2 });
    this.menu.draw(ui);
    ui.hints([['confirm', 'OK'], ['back', 'BACK']]);
  }
}

export class AboutOverlay {
  constructor() {
    this.page = 0;
    this.line = 0;
    this.pages = null;
  }
  layout(ui) {
    if (this.pages) return;
    const W = ui.w - 56;
    this.pages = [];
    for (const p of ABOUT_PAGES) {
      const lines = [];
      for (const [label, text] of p.rows) {
        if (label) lines.push({ t: label, c: 'sand' });
        for (const l of ui.wrap(String(text).toUpperCase().replace(/[^A-Z0-9 .,:;!?\-+%/()[\]'"#&*=<>]/g, ' '), W)) lines.push({ t: l, c: 'white' });
        lines.push({ t: '', c: 'white' });
      }
      const perPage = Math.floor((ui.h - 64) / 10);
      for (let i = 0; i < lines.length; i += perPage) this.pages.push({ title: p.title, lines: lines.slice(i, i + perPage) });
    }
  }
  update(ui) {
    const d = App.devices;
    this.layout(ui);
    const flip = (dir) => { this.page = (this.page + dir + this.pages.length) % this.pages.length; App.sfx('uiMove'); };
    if (d.nav.left || d.nav.tabL || d.nav.up) flip(-1);
    if (d.nav.right || d.nav.tabR || d.nav.down || d.nav.confirm || d.click) flip(1);
    if (d.wheel) flip(d.wheel > 0 ? 1 : -1);
    if (d.nav.back || d.rightClick) { App.sfx('uiBack'); pop(); }
  }
  draw(ui) {
    this.layout(ui);
    dim(ui);
    ui.panel(10, 8, ui.w - 20, ui.h - 22);
    const p = this.pages[this.page];
    ui.text(20, 14, p.title, { color: 'sand', scale: 2 });
    ui.right(ui.w - 20, 16, `${this.page + 1}/${this.pages.length}`, { color: 'mist' });
    p.lines.forEach((l, i) => ui.text(20, 36 + i * 10, l.t, { color: l.c, shadow: false }));
    ui.hints([['back', 'BACK']]);
  }
}

// ---------------------------------------------------------------- Dev Mode
const TABS = ['BALANCE', 'CHEATS', 'JUMP', 'ACTIONS', 'VIEW'];
export class DevOverlay {
  constructor(stage) {
    this.stage = stage;
    this.tab = 0;
    this.jumpOp = 0;
    this.jumpStage = 0;
    this.build();
  }
  build() {
    const cfg = App.config;
    const sim = this.stage.sim;
    const dv = App.devView;
    let items = [];
    if (this.tab === 0) {
      items = SLIDERS.map(([key, label, min, max, st]) => ({
        label,
        value: () => String(Math.round(cfg[key] * 100) / 100),
        onLeft: () => { cfg[key] = Math.max(min, Math.round((cfg[key] - st) * 1000) / 1000); },
        onRight: () => { cfg[key] = Math.min(max, Math.round((cfg[key] + st) * 1000) / 1000); },
      }));
      items.push({ label: 'RESET TO DEFAULTS', onConfirm: () => resetConfig(cfg) });
    } else if (this.tab === 1) {
      const ch = App.cheats;
      const tog = (label, key) => ({ label, value: () => (ch[key] ? 'ON' : 'OFF'), onConfirm: () => { ch[key] = !ch[key]; if (sim) sim.cheats = ch; }, onLeft: () => { ch[key] = !ch[key]; if (sim) sim.cheats = ch; }, onRight: () => { ch[key] = !ch[key]; if (sim) sim.cheats = ch; } });
      items = [tog('GOD VITALS', 'god'), tog('INFINITE COMPOSURE', 'infComposure'), tog('FREEZE CLOCK', 'freezeClock'), tog('UNLIMITED MISTAKES', 'unlimitedMistakes'),
        { label: 'UNLOCK ALL', value: () => (App.unlockAll ? 'ON' : 'OFF'), onConfirm: () => { App.unlockAll = !App.unlockAll; } }];
    } else if (this.tab === 2) {
      const ids = Object.keys(OPS);
      items = [
        { label: 'OPERATION', value: () => OPS[ids[this.jumpOp]].title, onLeft: () => { this.jumpOp = (this.jumpOp + ids.length - 1) % ids.length; this.jumpStage = 0; }, onRight: () => { this.jumpOp = (this.jumpOp + 1) % ids.length; this.jumpStage = 0; } },
        { label: 'STAGE', value: () => `${this.jumpStage + 1}: ${OPS[ids[this.jumpOp]].stages[this.jumpStage].id}`, onLeft: () => { const n = OPS[ids[this.jumpOp]].stages.length; this.jumpStage = (this.jumpStage + n - 1) % n; }, onRight: () => { const n = OPS[ids[this.jumpOp]].stages.length; this.jumpStage = (this.jumpStage + 1) % n; } },
        { label: 'GO TO THAT STAGE', onConfirm: async () => { App.overlays.length = 0; const { OperationStage } = await import('../stages/operation.js'); App.goto(new OperationStage({ opId: ids[this.jumpOp], startStage: this.jumpStage, mode: 'replay', difficulty: 'resident', cheats: App.cheats })); } },
        ...Object.keys(SCENES).map((id) => ({ label: `SCENE: ${SCENES[id].title}`, onConfirm: async () => { App.overlays.length = 0; const { StoryStage } = await import('../stages/story.js'); const { toTitle, CLOSE_CAM } = await import('../stages/flow.js'); App.goto(new StoryStage({ sceneId: id, onDone: () => toTitle() }), { camera: CLOSE_CAM }); } })),
      ];
    } else if (this.tab === 3) {
      const act = (label, fn) => ({ label, onConfirm: () => { if (sim) import('../sim/op.js').then((m) => fn(m.dev, m)); } });
      const closeAnd = (fn) => (dev, m) => { fn(dev, m); App.overlays.length = 0; };
      items = [
        act('COMPLETE STAGE', closeAnd((d) => d.completeStage(sim))),
        act('WIN OP', closeAnd((d) => d.winOp(sim))),
        act('FAIL OP', closeAnd((d) => d.failOp(sim))),
        act('TRIGGER CODE BLUE', closeAnd((d) => d.codeBlue(sim))),
        act('SPAWN POOL', (d) => d.spawn(sim, 'pool')),
        act('SPAWN BLEEDER', (d) => d.spawn(sim, 'bleeder')),
        act('SPAWN LACERATION', (d) => d.spawn(sim, 'laceration')),
        act('SPAWN HOOK', (d) => d.spawn(sim, 'hook')),
        act('SPAWN STRAIN', (d) => d.spawn(sim, 'strain')),
        { label: 'COPY OP JSON TO CONSOLE', onConfirm: () => { console.log(JSON.stringify(this.stage.def ?? {}, null, 1)); this.toast = 'COPIED TO CONSOLE'; } },
      ];
    } else {
      items = [
        { label: 'HITBOX OVERLAY', value: () => (dv.hitboxes ? 'ON' : 'OFF'), onConfirm: () => { dv.hitboxes = !dv.hitboxes; } },
        { label: 'BOT PLAYS', value: () => (dv.botPlays ? 'ON' : 'OFF'), onConfirm: () => { dv.botPlays = !dv.botPlays; } },
        { label: 'BOT SKILL', value: () => dv.botSkill.toFixed(2), onLeft: () => { dv.botSkill = Math.max(0, Math.round((dv.botSkill - 0.05) * 100) / 100); }, onRight: () => { dv.botSkill = Math.min(1, Math.round((dv.botSkill + 0.05) * 100) / 100); } },
        { label: 'SIM SPEED', value: () => `${dv.simSpeed.toFixed(1)}X`, onLeft: () => { dv.simSpeed = Math.max(0.1, Math.round((dv.simSpeed - 0.1) * 10) / 10); }, onRight: () => { dv.simSpeed = Math.min(3, Math.round((dv.simSpeed + 0.1) * 10) / 10); } },
        { label: 'FRAME STEP', value: () => (dv.frameStep ? 'ON' : 'OFF'), onConfirm: () => { dv.frameStep = !dv.frameStep; }, blurb: 'WITH IT ON, THE TICK BELOW ADVANCES THE SIM.' },
        { label: 'STEP ONE TICK', onConfirm: () => { dv.stepNow = true; } },
        { label: 'FPS AND SIM STATS', value: () => (dv.stats ? 'ON' : 'OFF'), onConfirm: () => { dv.stats = !dv.stats; } },
      ];
    }
    this.menu = new Menu(App, items, { w: 320, y: 46, rows: 11, rowH: 15, onBack: pop });
  }
  update(ui) {
    const d = App.devices;
    let tab = this.tab;
    if (d.nav.tabL) tab = (tab + TABS.length - 1) % TABS.length;
    if (d.nav.tabR) tab = (tab + 1) % TABS.length;
    if (d.click) {
      TABS.forEach((t, i) => {
        const x = this.tabX(ui, i);
        if (ui.hit(x, 22, 62, 14)) tab = i;
      });
    }
    if (tab !== this.tab) { this.tab = tab; App.sfx('uiMove'); this.build(); return; }
    this.menu.update(ui);
  }
  tabX(ui, i) { return (ui.w - TABS.length * 66) / 2 + i * 66; }
  draw(ui) {
    dim(ui);
    ui.panel((ui.w - 372) / 2, 6, 372, ui.h - 20);
    ui.center(10, 'DEV MODE', { color: 'lime' });
    TABS.forEach((t, i) => {
      const x = this.tabX(ui, i);
      ui.rect(x, 22, 62, 14, i === this.tab ? 'navy' : 'ink');
      ui.outline(x, 22, 62, 14, i === this.tab ? 'lime' : 'slate');
      ui.text(x + 4, 25, t, { color: i === this.tab ? 'lime' : 'mist', shadow: false });
    });
    this.menu.draw(ui);
    if (this.toast) ui.center(ui.h - 26, this.toast, { color: 'lime' });
    ui.hints([['tabs', 'TAB'], ['confirm', 'OK'], ['back', 'BACK']]);
  }
}
