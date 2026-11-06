// A running world: fixed steps from intents, events to the view, menus and HUD on top. Solo, couch, attract and session all use this.
import { THREE, Timeline } from '../../pixel-engine.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { BANTER, DIALOG, SPEAKERS, SYSTEM } from '../data/dialog.js';
import { makeTuning, TUNING_DEFS } from '../data/tuning.js';
import { newWorld, addHero, stepWorld, applyCommand, interactTarget, simHash } from '../sim/step.js';
import { enterZone } from '../sim/world.js';
import { afterTalk, dialogFor, objective, visibleProp } from '../sim/quests.js';
import { botIntent, makeBot } from '../sim/bot.js';
import { refresh } from '../sim/hero.js';
import { loadHeroInto, saveHero } from '../sim/serialize.js';
import { WorldView } from '../view/view.js';
import { Hud } from '../ui/hud.js';
import { Menus } from '../ui/menus.js';
import { prompt } from '../ui/glyphs.js';
import { removePyx } from '../sim/rules.js';
import { PAD } from '../input/router.js';
import { drawOverlays } from '../ui/overlays.js';

const { Vector3 } = THREE;
const TUTORIALS = { move: { text: 'MOVE', action: 'move' }, attack: { text: 'ATTACK', action: 'skill0' }, dodge: { text: 'A RED MARK: DODGE THROUGH IT', action: 'dodge' }, potion: { text: 'DRINK YOUR POTION', action: 'potion' }, equip: { text: 'EQUIP YOUR UPGRADE', action: 'equip' }, interact: { text: 'TALK OR USE', action: 'interact' }, skills: { text: 'ASSIGN A SKILL', action: 'skills' }, lychgate: { text: 'TOUCH A LYCHGATE TO TRAVEL', action: 'map' }, plate: { text: 'THE PLATE RUNS. CATCH IT.', action: 'skill0' }, wagon: { text: 'STAY BY THE WAGON', action: 'move' } };

export class Play {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.router = game.router; this.ui = game.ui; this.voice = game.voice; this.music = game.music; this.settings = game.settings;
    this.view = new WorldView(ctx, this); this.hud = new Hud(ctx, game.ui, this); this.menus = new Menus(ctx, game.ui, this); this.baseLook = game.baseLook;
    this.world = null; this.bots = {}; this.botStates = {}; this.local = [0]; this.dialog = null; this.overlays = {}; this.devTime = 1; this.target = new Vector3(); this.focusOverride = null; this.saveT = 60; this.net = null; this.attract = null; this.autoDialog = false; this.scene = null; this.tutShown = {}; this.zoomNow = 1; this.deathShown = false; this.mood = 0; this.running = false; this.createPrev = [false, false, false, false];
  }
  // Start a world. All modes end up here.
  begin(world, { local = [0], bots = {}, net = null, attract = null } = {}) {
    if (this.world) this.view.reset();
    this.world = world; this.local = local; this.bots = bots; this.botStates = {}; this.net = net; this.attract = attract; this.dialog = null; this.scene = null; this.menus.stack = []; this.hud.toasts = []; this.hud.subs = []; this.tutShown = {}; this.running = true; this.overlays = {}; this.hud.tutShow = [];
    world.onlyLocal = true;
    this.view.zoneKey = null;
    if (world.zone) this.view.buildZone(world);
    this.game.menuOwner = null; this.ctx.engine.timeScale = 1; this.router.swallow();
    this.settingsChanged();
  }
  stop() { this.running = false; if (this.world) this.view.reset(); this.world = null; this.ctx.engine.timeScale = 1; this.game.menuOwner = null; }
  localSeats() { return this.local; }
  isSession() { return !!this.net; }
  showSeatRings() { return true; }
  soloRing() { return this.local.length <= 1 && !this.net; }
  showNumbers() { return this.settings.v.numbers; }
  feel() { return this.world?.tuning.feel ?? 1; }
  seatVisible = (seat) => this.local.includes(seat) || !!this.attract;
  addShake(v) { const k = v * this.settings.v.shake * this.feel(); if (k > 0) this.ctx.engine.shake.add(k); }
  hitstop(t) { if (this.net || this.feel() <= 0 || this.attract) return; this.ctx.engine.hitstop(t * this.feel()); }
  slowMo(t) { if (this.net) return; this.ctx.engine.timeScale = 0.25; this.slowT = t; }
  objective() { return this.world ? objective(this.world) : null; }
  isVisible(p) { return visibleProp(this.world, p); }
  bossInfo(w) { const b = w.boss; if (!b?.m || b.m.dead) return null; return { name: b.name, frac: b.m.hp / b.m.maxHp, ticks: b.ticks ?? [] }; }
  // Commands: local on the host, over the wire from a client.
  command(cmd, seat = this.local[0]) {
    if (this.net && !this.net.isHost) { this.net.sendCommand(cmd); return true; }
    return applyCommand(this.world, seat, cmd);
  }
  setTuning(k, v) { const w = this.world; w.tuning[k] = v; for (const h of w.heroes) refresh(w, h); }
  resetTuning() { const w = this.world; Object.assign(w.tuning, makeTuning()); for (const h of w.heroes) refresh(w, h); this.ui.ctx.audio.play('ui_ok'); }
  cycleTime() { this.devTime = this.devTime === 1 ? 2 : this.devTime === 2 ? 0.5 : 1; }
  addBot(cls) { const w = this.world; const taken = w.heroes.filter((h) => !h.left).map((h) => h.seat); const seat = [1, 2, 3].find((s) => !taken.includes(s)); if (seat === undefined) return; const h = addHero(w, { seat, cls, name: `${CLASSES[cls].name} BOT`, level: w.heroes[0].level }); this.bots[seat] = true; removePyx(w); return h; }
  removeBot() { const seat = Object.keys(this.bots).map(Number).filter((s) => s !== 0).pop(); if (seat === undefined) return; this.leaveSeat(seat); delete this.bots[seat]; }
  toggleBot(seat) { if (this.bots[seat]) delete this.bots[seat]; else this.bots[seat] = true; }
  joinSeat(seat, cls, pad) {
    const w = this.world; if (w.heroes.some((h) => h.seat === seat && !h.left)) return;
    const h = addHero(w, { seat, cls, name: `GUEST ${seat + 1}`, level: w.heroes[0].level });
    const g = this.game.save?.guests?.[cls]; if (g) { loadHeroInto(w, h, g); h.name = `GUEST ${seat + 1}`; while (h.level < w.heroes[0].level) { h.level++; } refresh(w, h); h.hp = h.stats.maxHp; }
    if (pad !== undefined) this.router.assign(pad, seat);
    if (!this.local.includes(seat)) this.local.push(seat);
    removePyx(w);
    this.hud.toast(`${CLASSES[cls].name} JOINS THE PARTY.`, 'lime');
    return h;
  }
  leaveSeat(seat) {
    const w = this.world; const h = w.heroes.find((q) => q.seat === seat && !q.left); if (!h) return;
    if (this.game.save && !this.bots[seat]) { this.game.save.guests[h.cls] = saveHero(h); }
    h.left = true; this.local = this.local.filter((s) => s !== seat); const pad = this.router.seatPad[seat]; if (pad >= 0) this.router.release(pad);
    this.hud.toast(`${h.name} LEAVES.`, 'mist');
  }
  speak(who, text) { this.voice.say(who, text); }
  say(who, text, o = {}) { this.hud.sub(who, text, o.t); this.voice.say(who, text); }

  // Fixed step: gather intents, step the sim.
  fixed(dt) {
    const w = this.world; if (!w || !this.running) return;
    if (this.net && !this.net.isHost) { this.net.fixed(dt); return; }
    if (this.net && !this.net.canStep()) return;
    const intents = {};
    for (const h of w.heroes) {
      if (h.left) continue;
      if (this.bots[h.seat]) {
        const b = (this.botStates[h.seat] ??= makeBot({ touchGates: !!this.game.testBot }));
        const cmds = []; intents[h.seat] = botIntent(w, h, b, cmds);
        this.botCmds = cmds; for (const c of cmds) applyCommand(w, h.seat, c);
      } else if (this.net) intents[h.seat] = this.net.intentFor(h.seat, w, this.view);
      else if (this.local.includes(h.seat)) intents[h.seat] = this.router.intentFor(h.seat, w, this.view);
    }
    const steps = this.devTime === 2 ? 2 : this.devTime === 0.5 ? (this.tickHalf = !this.tickHalf) ? 1 : 0 : 1;
    for (let i = 0; i < steps; i++) { stepWorld(w, intents); if (i === 0) for (const k in intents) { intents[k] = { ...intents[k], pressed: {} }; } }
    this.net?.afterStep?.(w);
    this.attract?.fixed?.(w);
  }
  // Rendered frame: events, camera, HUD, menus.
  update(dt) {
    const w = this.world; if (!w) return;
    const seat = this.local[0] ?? 0;
    const paused = !this.net && (this.menus.open || this.dialog?.pause || this.scene?.pause);
    if (!this.attract) this.ctx.engine.timeScale = paused ? 0 : this.slowT > 0 ? 0.25 : 1;
    if (this.slowT > 0) { this.slowT -= 1 / 60; }
    this.net?.update?.(dt);
    const events = w.events; w.events = [];
    if (this.net?.isHost) this.net.outgoing(events);
    for (const ev of events) { this.onEvent(w, ev); this.view.handle(w, ev); }
    const alpha = paused ? 1 : this.ctx.physics.alpha;
    const real = 1 / 60;
    this.view.update(w, dt, alpha, { localSeat: seat, localHero: w.heroes.find((h) => h.seat === seat) });
    this.updateCamera(w, dt, seat);
    this.voice.update(real);
    const fullMenu = this.menus.open && !['pause', 'death', 'knellresults'].includes(this.menus.top.type);
    if (this.hideHud || fullMenu) { /* the screen covers it */ } else if (!this.attract || this.attract.showHud) this.hud.draw(w, seat, paused ? 0 : (dt || real));
    if (this.overlays && Object.values(this.overlays).some(Boolean)) drawOverlays(this, w);
    this.updateTutorial(w, seat);
    this.autoSave(w, real);
    if (this.scene) this.drawScene(real);
    else if (this.dialog) this.drawDialog(real);
    else if (this.menus.open) this.menus.draw(w, this.game.menuOwner ?? seat);
    else if (!this.attract) this.controls(w, seat);
    this.handleJoins(w);
    this.deathWatch(w, seat);
  }
  controls(w, seat) {
    const inp = this.ctx.input; const m = this.ui.m; const r = this.router; const open = (t, d) => { this.game.menuOwner = this.seatFromMenu(); this.menus.push(t, d); };
    if (w.heroes.find((h) => h.seat === seat)?.levelPicks?.length) {
      const pick = (i) => this.command({ c: 'pick', i }, seat);
      if (inp.wasPressed('KeyZ')) pick(0); if (inp.wasPressed('KeyX')) pick(1); if (inp.wasPressed('KeyC')) pick(2);
      const pad = r.seatPad[seat]; if (pad >= 0) { if (r.padPress(pad, PAD.left)) pick(0); if (r.padPress(pad, PAD.up)) pick(1); if (r.padPress(pad, PAD.right)) pick(2); }
    }
    if (m.pause) { open('pause'); return; }
    if (inp.wasPressed('KeyI', 'KeyC')) { if (!w.heroes.find((h) => h.seat === seat)?.levelPicks?.length) open('hero', { tab: 0 }); return; }
    if (inp.wasPressed('KeyK')) { open('hero', { tab: 1 }); return; }
    if (inp.wasPressed('KeyL')) { open('hero', { tab: 4 }); return; }
    if (inp.wasPressed('KeyM', 'Tab') && !w.round) { open('map'); return; }
    for (let p = 0; p < 4; p++) {
      const s = r.padSeat[p]; if (s < 0) continue;
      if (r.padPress(p, PAD.up) && !w.round && !w.heroes.find((h) => h.seat === s)?.levelPicks?.length) { this.game.menuOwner = s; this.menus.push('map'); return; }
      const cr = r.padHeld(p, PAD.create);
      if (r.padHeld(p, PAD.options) && cr) r.createChord[p] = true;
      if (r.padRelease(p, PAD.create)) { if (!r.createChord[p]) { this.game.menuOwner = s; this.menus.push('hero', { seat: s, tab: 0 }); r.createChord[p] = false; return; } r.createChord[p] = false; }
    }
  }
  seatFromMenu() { return this.ui.m.seat ?? 0; }
  handleJoins(w) {
    const r = this.router;
    while (r.joinRequests.length) {
      const pad = r.joinRequests.shift(); if (this.net || this.attract) continue;
      const seat = [1, 2, 3].find((s) => !w.heroes.some((h) => h.seat === s && !h.left));
      if (seat === undefined) continue;
      r.assign(pad, seat);
      this.menus.push('joinclass', { seatJoin: seat, pad }); this.game.menuOwner = seat;
    }
    if (!this.padToast && r.padsSeen() >= 2 && r.padSeat.filter((s) => s >= 0).length < 2) { this.padToast = true; this.hud.toast('A SECOND PAD! PRESS OPTIONS ON IT TO JOIN.', 'sky', { big: false }); }
  }
  onMenusClosed() { this.router.swallow(); this.game.menuOwner = null; this.ctx.engine.timeScale = 1; this.game.persist?.(); }
  deathWatch(w, seat) {
    if (this.attract || this.net) return;
    const humans = w.heroes.filter((h) => this.local.includes(h.seat) && !h.left && !this.bots[h.seat]);
    const allDead = humans.length > 0 && humans.every((h) => h.dead);
    if (allDead && !this.menus.open && !this.dialog && !this.scene && humans[0].deadT > 0.9) { this.game.menuOwner = humans[0].seat; this.menus.push('death', { seat: humans[0].seat, text: SYSTEM.death }); }
    for (const h of humans) if (h.dead && !allDead && h.deadT > h.respawnWait * 2) this.command({ c: 'respawn', how: 'here' }, h.seat);
  }
  autoSave(w, dt) { if (this.attract || this.net || w.mode !== 'campaign') return; this.saveT -= dt; if (this.saveT <= 0) { this.saveT = 60; this.game.persist?.(); } }
  saveAndQuit() { this.game.persist?.(); this.game.shell.toMenu(); }
  // Events that mean something outside the view.
  onEvent(w, ev) {
    const seat = this.local[0] ?? 0;
    const mine = (s) => s === undefined || s < 0 || this.local.includes(s);
    switch (ev.t) {
      case 'toast': if (mine(ev.seat)) this.hud.toast(ev.text, ev.color, { big: ev.big, prompt: ev.prompt }); break;
      case 'banner': this.hud.banner = { text: ev.text, t: 2.8, big: ev.big }; break;
      case 'level': if (mine(ev.seat)) { this.hud.toast(SYSTEM.level, 'sand'); this.hud.toast(`LEVEL ${ev.level}`, 'sand', { big: true }); this.game.persist?.(); } break;
      case 'upgrade': if (mine(ev.seat)) this.hud.upgrade = { name: ev.name, rarity: ev.rarity, t: 8, uid: ev.uid }; break;
      case 'equip': if (this.hud.upgrade?.uid === ev.uid) this.hud.upgrade = null; break;
      case 'say': this.say(ev.who, ev.text); break;
      case 'banter': if (w.allies.some((a) => a.kind === 'pyx') && !this.voice.speaking) { const list = BANTER[ev.tag]; if (list && !(ev.rate && w.rngs.quest.next() > ev.rate)) this.say('pyx', list[(this.banterI = (this.banterI ?? 0) + 1) % list.length]); } break;
      case 'nores': if (mine(ev.seat)) { this.hud.flashSlots[ev.slot] = 0.3; this.ctx.audio.play('ui_error', { volume: 0.5 }); if (!this.noresT || this.ctx.engine.frame > this.noresT) { this.noresT = this.ctx.engine.frame + 200; this.say('hero', `Not enough ${ev.res}.`); } } break;
      case 'tutorial': if (mine(ev.seat)) { if (ev.show) this.showTut(ev.show); if (ev.id) this.doneTut(ev.id); } break;
      case 'quest': this.hud.toast(ev.text, 'sand'); this.game.persist?.(); break;
      case 'questdone': this.hud.toast(`QUEST DONE: ${ev.name}`, 'lime', { big: true }); break;
      case 'save': this.game.persist?.(); break;
      case 'music': if (!this.attract || true) this.music.play(ev.song); break;
      case 'bossphase': if (ev.phase === 3 && w.boss?.m?.type === 'malison') this.music.play('eventide3'); this.hud.banner = { text: `PHASE ${ev.phase}`, t: 1.5 }; break;
      case 'knell': if (ev.on) this.hud.toast(`THE KNELL: ${ev.mods.join(' ').toUpperCase()}`, 'mist'); break;
      case 'knellresults': if (!this.attract && !w.round) this.pendingResults = { ...ev, t: 2 }; break;
      case 'open': if (mine(ev.seat) && !this.attract) { if (!this.game.autoDismiss) { this.game.menuOwner = ev.seat; this.menus.push(ev.screen, ev); } this.lastOpen = ev.screen; } break;
      case 'npc': if (mine(ev.seat) && !this.attract) { this.lastNpc = ev.npc; this.startDialogFor(ev); } break;
      case 'dialog': if (!this.attract) this.startDialog(ev.key, { pause: true }); break;
      case 'cutscene': if (!this.attract) this.startBossScene(ev); break;
      case 'ending': if (!this.attract) this.game.shell?.onEnding?.(); break;
      case 'level_picks': break;
      case 'coffinend': break;
      case 'classswap': break;
      case 'loreread': this.hud.toast(`A BOOK: ${ev.title}`, 'sand'); break;
      default: break;
    }
    if (this.pendingResults) { this.pendingResults.t -= 1 / 60; if (this.pendingResults.t <= 0 && !this.menus.open) { this.game.menuOwner = seat; this.menus.push('knellresults', { ...this.pendingResults, noBack: false }); this.pendingResults = null; } }
  }
  startDialogFor(ev) {
    const d = ev.d; const npc = ev.npc;
    if (!d) return;
    this.startDialog(d.key, { pause: true, focus: { x: this.world.props.find((p) => p.id === ev.id)?.x, z: this.world.props.find((p) => p.id === ev.id)?.z }, after: () => { afterTalk(this.world, d); if (d.open) { this.game.menuOwner = ev.seat; if (!this.game.autoDismiss) this.menus.push(d.open); this.lastOpen = d.open; } } });
    void npc;
  }
  startDialog(key, o = {}) {
    const lines = DIALOG[key]; if (!lines) return;
    this.dialog = { lines, i: 0, pause: o.pause, after: o.after, focus: o.focus, key, holdT: 0, t: 0, spoke: false };
    if (this.autoDialog) { this.finishDialog(); }
  }
  finishDialog() { const d = this.dialog; this.dialog = null; this.voice.stop(); this.ctx.input.clearQueued(); this.router.swallow(); d?.after?.(); }
  drawDialog(dt) {
    const d = this.dialog; const ui = this.ui; const line = d.lines[d.i]; const m = ui.m;
    d.t += dt;
    if (!d.spoke) { d.spoke = true; this.voice.say(line.who, line.text); }
    const barH = 22; ui.rect(0, 0, ui.W, barH, 'ink');
    const sp = SPEAKERS[line.who] ?? SPEAKERS.hero; const W = Math.min(ui.W - 32, 420); const X = ui.W / 2 - W / 2; const lines = ui.wrap(line.text, W - 16); const H = 24 + lines.length * 9 + 14; const Y = ui.H - H - 6;
    ui.rect(0, Y - 6, ui.W, ui.H - Y + 6, 'ink'); ui.frame(X, Y, W, H, 'slate', 'night');
    ui.text(X + 8, Y + 6, sp.name, { color: sp.color }); lines.forEach((l, i) => ui.text(X + 8, Y + 18 + i * 9, l));
    if (line.choices && d.t > 0.15) {
      const CH = line.choices.length * 15 + 4; const cy = Y - CH - 2; ui.frame(X, cy, W, CH, 'slate', 'ink');
      line.choices.forEach((c, i) => { if (ui.button(`choice:${i}`, X + 3, cy + 3 + i * 15, W - 6, 14, c.label, { align: 'left' })) { this.voice.stop(); this.lastChoice = c.label; if (c.next) { const after = d.after; this.dialog = { lines: DIALOG[c.next], i: 0, pause: d.pause, after, focus: d.focus, key: c.next, holdT: 0, t: 0, spoke: false }; } else this.finishDialog(); } });
      return;
    }
    prompt(ui, X + W - 22, Y + H - 15, 'confirm');
    const held = m.holdConfirm || this.ctx.input.isDown('Enter', 'Space');
    if (held) { d.holdT += dt; if (d.holdT > 0.9) { this.finishDialog(); return; } } else d.holdT = 0;
    if (d.t > 0.15 && (m.confirm || m.back || this.router.click)) { d.i++; d.t = 0; d.spoke = false; this.voice.stop(); if (d.i >= d.lines.length) this.finishDialog(); else this.ctx.audio.play('ui_move'); }
  }
  startBossScene(ev) {
    this.bossFocus = { id: ev.focus, t: ev.dur };
    const lines = DIALOG[ev.key]; if (lines) this.say(lines[0].who, lines[0].text, { t: ev.dur });
  }
  // Cutscene: a Timeline for cues, lines and bars. Hold to skip.
  playScene(def) {
    const tl = new Timeline({ lines: def.lines.map(([at, until, who, text]) => ({ at, until, text, who })), cues: def.cues ?? [], duration: def.duration, bars: 0.6, onEnd: () => { const s = this.scene; this.scene = null; this.voice.stop(); this.ctx.input.clearQueued(); s?.after?.(); } });
    tl.play(); this.scene = { tl, pause: def.pause ?? true, after: def.after, black: def.black, last: null, credits: def.credits, t: 0, holdT: 0 };
    if (this.autoDialog) { tl.skip(); }
  }
  drawScene(dt) {
    const s = this.scene; const ui = this.ui; const tl = s.tl; const m = ui.m; s.t += dt; tl.update(dt); if (!this.scene) return;
    if (s.black !== false) { const k = typeof s.black === 'function' ? s.black(s.t) : 1; if (k) ui.rect(0, 0, ui.W, ui.H, 'ink'); }
    const bars = tl.bars(); const bh = Math.round(bars * 24); ui.rect(0, 0, ui.W, bh, 'ink'); ui.rect(0, ui.H - bh, ui.W, bh, 'ink');
    const line = tl.line();
    if (line && line.text) { if (s.last !== line) { s.last = line; this.voice.say(line.who ?? 'narrator', line.text); } const sp = SPEAKERS[line.who] ?? SPEAKERS.narrator; const lines = ui.wrap(line.text, Math.min(ui.W - 60, 420)); const y = ui.H * 0.62; if (line.who && line.who !== 'narrator') ui.textC(ui.W / 2, y - 12, sp.name, { color: sp.color }); lines.forEach((l, i) => ui.textC(ui.W / 2, y + i * 10, l, { color: 'white' })); }
    if (s.credits) s.credits(ui, s.t);
    const held = m.holdConfirm || m.holdBack || this.ctx.input.isDown('Enter', 'Space', 'Escape');
    if (held) { s.holdT += dt; ui.bar(ui.W / 2 - 40, ui.H - 12, 80, 4, s.holdT / 0.8, 'sand'); if (s.holdT > 0.8) tl.skip(); } else { s.holdT = 0; ui.textC(ui.W / 2, ui.H - 11, 'HOLD ANY BUTTON TO SKIP', { color: 'slate' }); }
  }
  showTut(id) { if (this.tutShown[id]) return; this.tutShown[id] = true; const t = TUTORIALS[id]; if (t) this.hud.tutShow.push({ id, ...t, t: 9 }); }
  doneTut(id) { this.hud.tutShow = this.hud.tutShow.filter((q) => q.id !== id); this.tutDone = this.tutDone ?? {}; this.tutDone[id] = true; }
  updateTutorial(w, seat) {
    if (this.hud.tutShow[0]) { this.hud.tutShow[0].t -= 1 / 60; if (this.hud.tutShow[0].t <= 0) this.hud.tutShow.shift(); }
    if (w.mode !== 'campaign' || this.attract || w.story.q > 1) return;
    const h = w.heroes.find((q) => q.seat === seat); if (!h) return;
    if (w.zone.id === 'yard' && !this.tutShown.move) { this.showTut('move'); this.showTut('attack'); }
    if ((h.walked ?? 0) > 2) this.doneTut('move'); if (h.kills > 0) this.doneTut('attack');
    if (h.hp < h.stats.maxHp * 0.6 && h.potionCd <= 0 && !this.tutShown.potion) this.showTut('potion');
    if (h.level >= 2 && !this.tutShown.skills) { this.showTut('skills'); this.ctx.tweens?.call?.(10, () => this.doneTut('skills')); }
    if (h.interactTarget && !this.tutShown.interact) this.showTut('interact');
  }
  updateCamera(w, dt, seat) {
    const cam = this.ctx.camera; const list = this.local.map((s) => w.heroes.find((h) => h.seat === s && !h.left)).filter(Boolean);
    const pts = list.length ? list : w.heroes.filter((h) => !h.left);
    let x = 0; let z = 0; for (const h of pts) { x += h.x; z += h.z; } const n = Math.max(1, pts.length); x /= n; z /= n;
    let spread = 0; for (const h of pts) spread = Math.max(spread, Math.hypot(h.x - x, h.z - z));
    if (pts.length === 0) { x = w.zone.w / 2; z = w.zone.h / 2; }
    if (this.bossFocus) { const m = w.monsters.find((q) => q.id === this.bossFocus.id); this.bossFocus.t -= dt; if (m && this.bossFocus.t > 0) { x = m.x; z = m.z; } else this.bossFocus = null; }
    if (this.dialog?.focus?.x !== undefined) { x = this.dialog.focus.x; z = this.dialog.focus.z; }
    if (this.attract?.camera) { const c = this.attract.camera(w); if (c) { x = c.x; z = c.z; } }
    const couchZoom = pts.length > 1 ? Math.max(0.62, 1 - Math.max(0, spread - 4) * 0.05) : 1;
    const dialogZoom = this.dialog ? 1.25 : w.zone.spec.kind === 'arena' && w.boss ? 0.68 : 1;
    // A hero off screen for 2 s teleports to seat 1.
    if (pts.length > 1) for (const h of pts) { if (Math.hypot(h.x - x, h.z - z) > 16) { h.offT = (h.offT ?? 0) + dt; if (h.offT > 2 && pts[0] !== h) { h.x = pts[0].x + 1; h.z = pts[0].z; h.px = h.x; h.pz = h.z; h.offT = 0; } } else h.offT = 0; }
    const tuningZoom = 11.5 / (w.tuning.viewHeight ?? 11.5);
    const target = couchZoom * dialogZoom * tuningZoom * this.settings.v.zoom * (this.attract?.zoom ?? 1);
    this.zoomNow += (target - this.zoomNow) * Math.min(1, (dt || 1 / 60) * 4);
    cam.setZoom(this.zoomNow);
    this.target.set(x, 0.9, z); this.view.focus.set(x, 0, z);
    const whl = this.router.wheel; if (whl && !this.menus.open) { this.settings.v.zoom = Math.max(0.7, Math.min(1.3, this.settings.v.zoom - Math.sign(whl) * 0.05)); }
  }
  settingsChanged() { /* volumes, glyphs and zoom read live */ }
  fingerprint() { return this.world ? String(simHash(this.world)) : ''; }
}
export { TUNING_DEFS, SKILLS, enterZone, newWorld, interactTarget, dialogFor };
