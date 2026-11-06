// Attract mode: 10 s idle on the title, then a looping demo played by the bot with every cheat on.
// Any input exits at once and does nothing else. A director over a list of clips; it survives any clip failing.
import { app, goto } from '../core/app.js';
import { Run } from '../core/run.js';
import { Area } from '../game/area.js';
import { Bot } from '../game/bot.js';
import { TITLE, HEADLESS } from '../config.js';
import { WEAPON_ORDER } from '../data/weapons.js';
import { makeItem } from '../game/caseModel.js';
import { SONGS } from '../audio/songs.js';
import { TitleScene } from './title.js';
import { openCase } from './case.js';
import { openShop, tuneWeapon } from './shop.js';

/** A demo loadout: everything, tuned. */
function attractRun(o = {}) {
  const r = new Run();
  while (r.caseLevel < 2) r.upgradeCase();
  r.addWeapon('scatter'); r.addWeapon('rifle'); r.addWeapon('harpoon');
  for (const w of WEAPON_ORDER) if (!r.case.find(w)) r.giveItem(w);
  r.case.addStack('ammoPistol', 50); r.case.addStack('ammoShells', 24); r.case.addStack('ammoRifle', 20); r.case.addStack('ammoBolts', 6);
  for (const id of ['flare', 'depth', 'oil', 'tin', 'samphire', 'dulse']) r.giveItem(id);
  r.money = 3000;
  r.chapter = o.chapter ?? 1;
  r.dameWith = !!o.dame;
  for (const f of o.flags ?? []) r.setFlag(f);
  return r;
}

const skipBeats = (area, ids) => { const d = app.run.areaData(area); for (const id of ids) d.beats[id] = true; };

export const ATTRACT_CLIPS = [
  { id: 'siege', seconds: 40, area: 'quay', start: [36, 18], chapter: 1, skip: ['arrival', 'tannoyHint', 'cottage', 'quayFront', 'shedHint'], flags: ['fathomMet'], plan: 'siege', caption: 'CLAIM 1: ACT OF GOD' },
  { id: 'case', seconds: 8, area: 'quay', start: [44, 8], chapter: 1, skip: ['arrival', 'tannoyHint', 'cottage', 'quayFront', 'shedHint', 'siege'], flags: ['fathomMet', 'foghornDone'], montage: 'case' },
  { id: 'shop', seconds: 8, area: 'quay', start: [46, 7], chapter: 1, skip: ['arrival', 'tannoyHint', 'cottage', 'quayFront', 'shedHint', 'siege'], flags: ['fathomMet', 'foghornDone'], montage: 'shop' },
  { id: 'cannery', seconds: 30, area: 'cannery', chapter: 2, dame: true, start: [24, 24], skip: ['canneryStart', 'cold', 'boost', 'flenserBurst'], flags: ['dameFreed', 'winchDoorOpen', 'winchStarted', 'winchDone'], plan: 'cannery', caption: 'CLAIM 2: WEAR AND TEAR' },
  { id: 'bosun', seconds: 25, area: 'yard', chapter: 2, dame: true, start: [17, 26], plan: 'bosun' },
  { id: 'causeway', seconds: 15, area: 'causeway', chapter: 3, dame: true, start: [7, 70], plan: 'causeway', caption: 'CLAIM 3: ACT OF COMMODORE' },
  { id: 'crypt', seconds: 15, area: 'abbey', chapter: 3, dame: true, start: [10, 24], skip: ['cloister', 'lens'], flags: ['lensSolved'], plan: 'crypt' },
  { id: 'bathysphere', seconds: 30, area: 'nave', chapter: 3, dame: false, start: [13, 30], plan: 'nave', caption: 'FINAL SETTLEMENT' },
  { id: 'launch', seconds: 15, area: 'launch', chapter: 3, plan: 'launch' },
  { id: 'card', seconds: 5, titleCard: true },
];

const CHEAT_BOT = (plan) => new Bot({ cheat: true, plan, aimError: 0.006, turnRate: 5, watchCut: 0.2, stuckLimit: 3 });

const PLANS = {
  siege: [{ until: () => false, loop: [[28, 15], [40, 14], [47, 14], [47, 26], [40, 29], [28, 29], [18, 29], [18, 22], [20, 15]], gotoIdle: [30, 18], range: 26 }],
  cannery: [{ until: () => false, gotoIdle: [24, 18], range: 26, loop: [[12, 16], [29, 16], [38, 24], [18, 24], [8, 11], [38, 11]] }],
  bosun: [{ until: () => false, range: 30 }],
  causeway: [
    { goto: [7.5, 56], run: true }, { goto: [7.5, 40], run: true }, { goto: [7.5, 26], run: true }, { goto: [7.5, 12], run: true }, { until: () => false, gotoIdle: [7.5, 4] },
  ],
  crypt: [{ goto: [11, 20], ignoreEnemies: true, skipIf: (a) => a.crypt }, { do: (a, b, it, dt) => { const C = a.crypt; if (!C) return false; const { info } = a.level; const x = info.x(C.leverDone ? 8 : 3); const z = info.z(C.leverDone ? 30.5 : 33); if (a.interact.current?.kind === 'lever') it.action = true; else b.steerTo(it, x, z, false, dt); return false; }, ignoreEnemies: true }],
  nave: [{ until: () => false, range: 40, gotoIdle: [13, 28] }],
  launch: [{ until: () => false }],
};

export class AttractMode {
  name = 'attract';
  constructor(o = {}) { this.o = o; this.i = o.index ?? 0; this.t = 0; this.target = { x: 0, y: 0, z: 0 }; }

  async setup(ctx) {
    app.init(ctx.engine);
    app.attract = true;
    app.attractDirector = this;
    this.ctx = ctx;
    app.closeAll();
    this.lastActivity = app.device.activity;
    this.nextClip();
  }

  cameraTarget() { return this.target; }

  async nextClip() {
    const list = ATTRACT_CLIPS;
    let clip = list[this.i % list.length];
    this.i++;
    // The Case and Shop montages are menu screens, and a phone held upright is too narrow to read them.
    while (clip.montage && (this.ctx.hud?.width ?? 480) < 260) { clip = list[this.i % list.length]; this.i++; }
    this.clip = clip;
    try {
      await this.runClip(clip);
    } catch (e) {
      console.warn(`attract clip ${clip.id} failed: ${e?.message ?? e}`);
      this.failures = (this.failures ?? 0) + 1;
      if (this.failures < 30) setTimeout?.(() => this.nextClip(), 50);
    }
  }

  async runClip(clip) {
    const { engine } = this.ctx;
    if (clip.titleCard) {
      this.card = new AttractCard(this, clip.seconds);
      if (!app.fast) await engine.screen.cover('dissolve');
      await engine.loadGame(this.card);
      if (!app.fast) engine.screen.reveal('dissolve');
      return;
    }
    app.run = attractRun({ chapter: clip.chapter, dame: clip.dame, flags: clip.flags });
    if (clip.skip) skipBeats(clip.area, clip.skip);
    const bot = CHEAT_BOT(PLANS[clip.plan] ?? [{ until: () => false }]);
    const area = new AttractArea(clip, this, { bot, attract: true, noSave: true, start: clip.start });
    if (!app.fast) await engine.screen.cover('dissolve');
    engine.hud.clear();
    await engine.loadGame(area);
    if (!app.fast) engine.screen.reveal('dissolve');
  }

  exit() {
    if (this.exited) return;
    this.exited = true;
    app.attract = false;
    app.attractDirector = null;
    app.closeAll();
    app.dev.god = false;
    goto(new TitleScene());
  }
}

/** Overlay and clip clock, shared by areas and the title card. */
function drawOverlay(ui, caption) {
  const { hud, W, H } = ui;
  // On a narrow screen the title gives way, and the caption and the notice take as many lines as they need.
  const demoW = ui.width('DEMO') + 10;
  const titleW = ui.width(TITLE) + 10;
  const showTitle = demoW + titleW + 4 <= W;
  const sideW = Math.max(demoW, showTitle ? titleW : 0);
  const capLines = caption && ui.width(caption) + sideW * 2 + 4 > W ? ui.fitLines(caption, W - 8) : null;
  hud.rect(0, 0, W, 16 + (capLines ? capLines.length * 9 + 2 : 0), 'ink');
  ui.text(6, 5, 'DEMO', { color: 'orange' });
  if (showTitle) ui.text(W - ui.width(TITLE) - 6, 5, TITLE, { color: 'sand' });
  if (capLines) capLines.forEach((l, i) => ui.centerText(15 + i * 9, l, { color: 'mist' }));
  else if (caption) ui.centerText(5, caption, { color: 'mist' });
  const line = app.device.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON';
  const lines = ui.fitLines(line, W - 8);
  const bandH = 7 + lines.length * 9;
  hud.rect(0, H - bandH, W, bandH, 'ink');
  if (ui.blink(1.4) || app.device.touchOnly) lines.forEach((l, i) => ui.centerText(H - bandH + 4 + i * 9, l, { color: 'white' }));
}

function checkExit(director) {
  if (app.device.activity !== director.lastActivity) {
    director.lastActivity = app.device.activity;
    if (!app.device.touchOnly || director.padSeen?.()) { director.exit(); return true; }
  }
  return false;
}

class AttractArea extends Area {
  constructor(clip, director, o) {
    super(clip.area, o);
    this.clip = clip;
    this.loopDirector = director;
    this.clipT = 0;
  }

  async setup(ctx) {
    await super.setup(ctx);
    app.dev.god = true;
    if (this.clip.area === 'causeway') { this.tide.t = 110; this.tide.running = true; }
    if (this.clip.montage === 'case') this.startCaseMontage();
    if (this.clip.montage === 'shop') this.startShopMontage();
  }

  claimsParcel() {}
  checkpoint() {}

  fixedUpdate(ctx, dt) {
    this.clipT += dt;
    // Cinematic clips start themselves.
    if (this.clip.id === 'siege' && this.siege && !this.siege.active && !this.siege.horn && !this.attractStarted) {
      this.attractStarted = true;
      this.siege.prepare();
      this.siege.start();
      this.siege.t = 62;
      this.setMusic('siege');
      this.siege.killsAtStart = 0;
      for (const b of this.beats.pending) if (b.id === 'siege') this.beats.pending.splice(this.beats.pending.indexOf(b), 1);
    }
    if (this.clip.id === 'siege' && this.siege && this.clipT > 26 && !this.siege.horn) this.siege.foghorn();
    if (this.clip.id === 'crypt' && !this.triggeredCrypt && this.clipT > 1 && this.level.info.col(this.player.x) <= 12) {
      this.triggeredCrypt = true;
    }
    if (this.clip.id === 'bosun' && this.bosun && !this.bossLive && !this.cut && this.clipT > 2) {
      /* the bot walks in: the beat starts it */
    }
    super.fixedUpdate(ctx, dt);
  }

  update(ctx, dt) {
    if (checkExit(this.loopDirector)) return;
    if (this.clipT >= this.clip.seconds && !this.stopped) {
      this.stopped = true;
      this.loopDirector.nextClip();
      return;
    }
    super.update(ctx, dt);
    drawOverlay(app.ui, this.clip.caption);
  }

  /** Case montage: items picked, rotated, ARRANGE. */
  startCaseMontage() {
    this.setMusic('safe');
    const area = this;
    area.brain = null;
    area.bot = null;
    this.player.state = 'script';
    const screen = openCase(area, {});
    screen.frozen = false;
    const it = area.run.case.find('samphire');
    const moves = [
      [0.8, () => { screen.state.cx = it?.x ?? 0; screen.state.cy = it?.y ?? 0; }],
      [1.6, () => { if (it) { area.run.case.remove(it); screen.state.held = { item: it, from: { x: it.x, y: it.y, rot: it.rot } }; } }],
      [2.6, () => { if (screen.state.held) { screen.state.held.item.rot = !screen.state.held.item.rot; area.ctx.audio.play('rotate'); } }],
      [3.4, () => { if (screen.state.held) { screen.state.held.item.rot = !screen.state.held.item.rot; area.ctx.audio.play('rotate'); } }],
      [4.4, () => { if (screen.state.held) { const h = screen.state.held; const spot = area.run.case.findSpot(h.item); if (spot) { h.item.rot = spot.rot; area.run.case.place(h.item, spot.x, spot.y); } screen.state.held = null; area.ctx.audio.play('place'); } }],
      [5.6, () => { area.run.case.arrange(); area.ctx.audio.play('place'); }],
    ];
    for (const [t, fn] of moves) area.addDelayed(t, fn);
  }

  /** Shop montage: tune a gun. */
  startShopMontage() {
    const area = this;
    area.brain = null;
    area.bot = null;
    this.player.state = 'script';
    const screen = openShop(area);
    screen.frozen = false;
    for (const [t, stat] of [[2, 'power'], [3.6, 'rate'], [5, 'reload']]) {
      area.addDelayed(t, () => { tuneWeapon(area, 'pistol', stat); area.ctx.audio.play('tune'); });
    }
  }
}

class AttractCard {
  name = 'attract-card';
  constructor(director, seconds) { this.director = director; this.seconds = seconds; this.t = 0; this.target = { x: 0, y: 0, z: 0 }; }
  setup(ctx) { app.init(ctx.engine); ctx.engine.ambient.intensity = 0.2; app.mix.play(SONGS.title, 'title', 0.4); }
  cameraTarget() { return this.target; }
  update(ctx, dt) {
    app.device.poll(ctx.input);
    const { ui } = app;
    ui.begin(ctx);
    ctx.hud.clear();
    app.mix.update(ui.dt);
    if (checkExit(this.director)) return;
    this.t += dt;
    const { hud, W, H } = ui;
    hud.rect(0, 0, W, H, 'ink');
    ui.heading(TITLE, (H >> 1) - 26);
    ui.centerWrap((H >> 1) + 12, 'SOMEONE HAS TO READ THE SMALL PRINT', { color: 'mist' });
    drawOverlay(ui, '');
    ui.end();
    if (this.t >= this.seconds && !this.done) { this.done = true; this.director.nextClip(); }
  }
  status() { return `attract card ${this.t.toFixed(1)}`; }
}
export { makeItem, HEADLESS };
