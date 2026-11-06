// The Medley: one round, the same lane code on one screen and online. Plus Family Hour's join screen.
import { THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { backdrop, laneCamera, place } from '../art/stage.js';
import { blankInput, BotDriver, GhostDriver, LocalDriver, PadDriver } from '../core/drivers.js';
import { CAST_LOOKS, SEAT_LOOKS, SEAT_PALETTE, BOT_NAMES } from '../data/classmates.js';
import { MEDLEY, medleyWindow } from '../data/medley.js';
import { POSES } from '../data/poses.js';
import { REPS } from '../data/reps.js';
import { ACT } from '../data/activities.js';
import { TITLE } from '../data/title.js';
import { BARKS } from '../data/lines.js';
import { center, plate, plateCenter, sanitize, say, textWidth, wrap } from '../ui/font.js';
import { promptBar, prompt } from '../ui/prompts.js';
import { note, panel, star } from '../ui/widgets.js';
import { Menu } from '../ui/menu.js';
import { BaseScene } from './base.js';
import { headerView, HeaderSim, makeBlob } from './activity/header.js';
import { hoopView, HoopSim } from './activity/hoop.js';
import { PoseSim, poseView } from './activity/poses.js';
import { repView, RepSim } from './activity/reps.js';
import { stepView, StepSim } from './activity/step.js';
const { Vector3 } = THREE;

const VIEWS = { poses: poseView, reps: repView, hoop: hoopView, step: stepView, header: headerView };
const AWARD_TEXT = { Stillest: 'Barely moved. It was unsettling.', 'Most Apologetic': 'Kept perfect time, and seemed sorry.', 'Hardest Head': 'Coconuts have asked for your details.' };
export function buildSim(id, env, rng, lane) {
  const eventS = MEDLEY.eventSeconds;
  if (POSES[id]) return { view: 'poses', sim: new PoseSim({ ...POSES[id], hold: eventS - 6 }, env, rng) };
  if (REPS[id]) { const r = REPS[id]; return { view: 'reps', sim: new RepSim({ ...r, reps: Math.max(1, Math.floor(eventS / r.tempo) - 2) }, env, rng) }; }
  if (id === 'hoop') return { view: 'hoop', sim: new HoopSim(ACT.hoop, env, rng, { seconds: eventS }) };
  if (id === 'step') return { view: 'step', sim: new StepSim(ACT.step, env, rng, { maxBars: 23 }) };
  return { view: 'header', sim: new HeaderSim(ACT.header, env, rng, { width: 0.8, seconds: eventS }) };
}
export const normScore = (e, id, raw) => { const n = typeof MEDLEY.events[e].norm === 'number' ? MEDLEY.events[e].norm : MEDLEY.events[e].norm[id] ?? 100; return Math.max(0, Math.min(1000, Math.round((raw / n) * 1000))); };
export const medleyXs = (n) => (n === 1 ? [0] : n === 2 ? [-1.4, 1.4] : n === 3 ? [-2.2, 0, 2.2] : [-3, -1, 1, 3]);

export class MedleyScene extends BaseScene {
  id = 'medley'; part = 'card'; t = 0; ev = -1; lanes = []; picks = []; out = blankInput(); v = new Vector3(); sentResult = false; ended = false; cardState = null; canPause = true; startTime = -Infinity;
  get session() { return this.args.session ?? null; }
  camera() { const n = this.args.session ? this.args.session.players.length : this.args.players?.length ?? 4; return laneCamera(n > 3 ? 4 : 3); }
  async build(ctx) {
    this.ctx = ctx;
    backdrop(ctx, 'plaza');
    App.music('plaza');
    ctx.particles.register('confetti', { count: [18, 26], life: [0.8, 1.6], speed: [2, 4], gravity: 5, size: [1, 2], colors: ['red', 'sand', 'cyan', 'lime', 'orange'], radius: 0.5 });
    const seats = this.session ? this.session.players.map((p, i) => ({ id: p.id, name: sanitize(p.name), color: p.color, me: p.id === this.session.me, seat: i })) : this.args.players;
    const xs = medleyXs(seats.length);
    const pick = ctx.random.fork('medley-picks');
    this.picks = MEDLEY.events.map((e) => pick.pick(e.picks));
    this.botRng = ctx.random.fork('medley-bots');
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i], avatar = await makeAvatar(ctx, s.kind === 'bot' ? (CAST_LOOKS[s.cast] ?? SEAT_LOOKS[i]) : SEAT_LOOKS[s.seat ?? i]);
      avatar.setAt(xs[i], 0, 0.8, 0);
      place(ctx, 'yoga-mat', xs[i], 0.002, 0.8, { palette: { mat: SEAT_PALETTE[s.seat ?? i], stripe: 'white' } });
      const lane = { i, x: xs[i], z: 0.8, avatar, name: s.name, seat: s.seat ?? i, id: s.id ?? i, total: 0, evScores: [0, 0, 0], alive: true, small: true, kind: s.kind };
      lane.driver = this.makeDriverFor(ctx, s);
      this.lanes.push(lane);
    }
    this.mine = this.lanes.find((l) => l.driver.kind === 'local' || l.driver.kind === 'pad') ?? this.lanes[0];
    if (this.session) this.bindSession(ctx);
    else { this.part = 'count'; this.t = 0; this.startTime = 0; }
    this.simT = -3;
  }
  makeShadow(ctx) { return makeBlob(ctx); }
  makeDriverFor(ctx, s) {
    if (this.session) return s.me ? new LocalDriver(App.lanesEnv(ctx)) : new GhostDriver();
    if (s.kind === 'pad') return new PadDriver(s.index);
    if (s.kind === 'keys') return new LocalDriver(App.lanesEnv(ctx), { noPad: true });
    return new BotDriver(s.skill ?? 'average', this.botRng.fork(s.name));
  }
  bindSession(ctx) {
    const H = globalThis.AIHub;
    this.off = [
      H.on('card', (c) => { this.cardState = c; }),
      H.on('start', () => { this.part = 'count'; this.startTime = 0; App.music('plaza'); this.beginGhosts(); }),
      H.on('message', (d, from) => { const l = this.lanes.find((q) => q.id === from); if (l && l.driver.kind === 'ghost') l.driver.receive(d); }),
      H.on('leave', ({ id }) => { const l = this.lanes.find((q) => q.id === id); if (l) { l.leaving = 1; l.avatar.play('Wave'); } }),
      H.on('time-up', () => this.finishRound(true)),
      H.on('end', () => this.onEnd()),
    ];
    this.onDirectKey = (e) => { if (e.code === 'Enter' && this.part === 'card') H.answer('ready'); else if (e.code === 'KeyM' && this.part === 'card') H.answer('more'); };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.onDirectKey);
  }
  beginGhosts() {
    if (this.ghostTimer) return;
    this.ghostTimer = setInterval(() => this.sendGhost(), 100);
  }
  sendGhost() {
    if (this.ended) return;
    const H = globalThis.AIHub, l = this.mine, s = l.sim, st = l.avatar.clipState();
    const dot = s?.dot;
    H.send({ a: this.ev, x: +(dot?.x ?? s?.x ?? 0).toFixed(3), y: +(dot?.y ?? 0).toFixed(3), c: st.c, t: st.t, s: this.totalOf(l) }, { reliable: false });
    H.progress({ score: this.totalOf(l), label: this.ev >= 0 ? MEDLEY.events[this.ev].name : 'Ready' });
  }
  totalOf(l) { return l.evScores.reduce((a, b) => a + b, 0); }
  now() { if (this.session) { const t = globalThis.AIHub.time(); return t === -Infinity ? -Infinity : t / 1000; } return this.t - 3; }
  startEvent(ctx, e) {
    this.ev = e; const id = this.picks[e], env = App.simEnv(ctx);
    const clip = ctx.random.fork(`event-${e}`);
    for (const l of this.lanes) {
      if (l.objs) { /* header pools stay parked out of sight */ }
      for (const o of l.viewObjects ?? []) o.visible = false;
      if (l.driver.kind === 'ghost') { const r = buildSim(id, env, clip.fork('ghost'), l); l.view = r.view; l.sim = null; l.displaySim = r.sim; if (VIEWS[r.view].enter && r.view !== 'header' && r.view !== 'reps') { l.sim = null; } }
      else { const r = buildSim(id, env, clip.fork('same-world'), l); l.view = r.view; l.sim = r.sim; }
    }
    const view = VIEWS[this.lanes[0].view];
    this.viewName = this.lanes[0].view;
    for (const l of this.lanes) {
      const old = l.sim; if (!old && l.displaySim) l.sim = l.displaySim;
      if (this.viewName === 'poses') poseView.enter(this, l, l.sim.pose);
      else view.enter(this, l);
      if (!old) { l.ghostDisplay = true; l.sim = null; }
    }
    App.music({ poses: 'still', reps: 'shed', hoop: 'hoop', step: 'step', header: 'lagoon' }[this.viewName]);
    App.barkLine(`${MEDLEY.events[e].name}: ${ACT[id].name}.`, 'coach', 2.4);
    this.partEv = 'event';
  }
  endEvent(e) {
    for (const l of this.lanes) {
      if (l.sim) { const raw = VIEWS[l.view].score(l.sim); l.evScores[e] = normScore(e, this.picks[e], raw); l.sim = null; }
      l.avatar.lean.x = 0; l.avatar.lean.y = 0; l.avatar.play('Idle');
    }
    App.sfx('chimeIn');
    this.lastScores = this.lanes.map((l) => l.evScores[e]);
    this.ev = e; this.partEv = 'gap';
  }
  tick(ctx, dt) {
    if (this.ended) return;
    if (!this.session && App.blocked()) return;
    this.t += dt;
    const now = this.now();
    if (this.part === 'count' && now >= 0) { this.part = 'play'; this.playStart = 0; this.nextEv = 0; this.partEv = 'gap'; }
    if (this.part !== 'play') return;
    const i = this.nextEv;
    if (this.partEv === 'event') {
      const w = medleyWindow(this.ev);
      for (const l of this.lanes) {
        if (!l.sim || l.sim.done) continue;
        l.driver.read(this.out, l.sim, dt);
        l.sim.step(dt, this.out);
        if (this.out.x || this.out.y) l.touched = true;
      }
      if (this.session) { const me = this.mine; if (me.sim) me.evScores[this.ev] = normScore(this.ev, this.picks[this.ev], VIEWS[me.view].score(me.sim)); }
      if (now >= w.end) { this.endEvent(this.ev); this.nextEv = this.ev + 1; if (this.nextEv >= MEDLEY.events.length) this.finishRound(false); }
    } else if (i < MEDLEY.events.length && now >= medleyWindow(i).start) this.startEvent(ctx, i);
  }
  frame(ctx, dt, rdt, free) {
    this.frameT = (this.frameT ?? 0) + rdt;
    this.canPause = this.part !== 'card' && this.part !== 'ended';
    if (this.part === 'card') this.cardInput(ctx);
    for (const l of this.lanes) {
      const d = l.driver;
      if (d.kind === 'ghost' && d.seen) {
        d.lerp(dt); const same = this.ev === d.a && this.partEv === 'event';
        l.avatar.root.visible = l.leaving ? true : same || this.part !== 'play' || this.partEv !== 'event';
        if (same) { l.avatar.setClipState(d.c, d.t); l.avatar.lean.x = d.x; l.avatar.lean.y = d.y; }
      } else if (l.sim && this.partEv === 'event') VIEWS[l.view].update(this, l, dt);
      if (l.leaving) { l.leaving += dt; l.avatar.root.position.z += dt * 1.2; if (l.leaving > 2.4) l.avatar.root.visible = false; else if (l.leaving > 1.2) l.avatar.play('Walk'); }
      l.avatar.update(dt);
    }
    if (this.part === 'podium' && free && !this.session) this.menu?.update(ctx, rdt);
    if (this.part === 'podium' && this.session) { /* Quitting is the hub's. */ }
    if (!this.session && this.part === 'podium' && !this.menu) this.podiumMenu();
  }
  cardInput(ctx) {
    const i = ctx.input, H = globalThis.AIHub; if (!H) return;
    if (i.wasPressed('PadCross')) H.answer('ready');
    if (i.wasPressed('PadTriangle')) H.answer('more');
    if (i.wasPressed('MouseLeft')) H.answer('ready');
  }
  finishRound(timeUp) {
    if (this.sentResult) return;
    this.sentResult = true;
    if (timeUp && this.partEv === 'event' && this.ev >= 0) this.endEvent(this.ev);
    this.part = 'podium'; this.partEv = 'done';
    this.ranking = [...this.lanes].sort((a, b) => this.scoreOf(b) - this.scoreOf(a));
    this.awards = MEDLEY.events.map((e, i) => { let best = this.lanes[0]; for (const l of this.lanes) if (l.evScores[i] > best.evScores[i]) best = l; return { title: e.award, lane: best, detail: AWARD_TEXT[e.award] }; });
    App.music('evening');
    this.ctx.particles.burst('confetti', [this.ranking[0].x, 2.4, 0.8]);
    this.ranking[0].avatar.play('Victory', { once: true });
    if (this.session) {
      const me = this.mine, total = this.totalOf(me);
      const myAwards = this.awards.filter((a) => a.lane === me).map((a) => ({ title: a.title, detail: a.detail }));
      globalThis.AIHub.result({ score: total, stats: { Stillness: me.evScores[0], Beat: me.evScores[1], Lean: me.evScores[2] }, awards: myAwards });
      if (this.ghostTimer) this.sendGhost();
    }
  }
  scoreOf(l) { return this.session && l.driver.kind === 'ghost' ? l.driver.s : this.totalOf(l); }
  onEnd() {
    this.ended = true;
    if (this.ghostTimer) clearInterval(this.ghostTimer);
    if (this.onDirectKey && typeof window !== 'undefined') window.removeEventListener('keydown', this.onDirectKey);
    App.voice.stop(); this.ctx.audio.stopMusic?.(); this.ctx.audio.stopLoops?.(); this.ctx.audio.setMuted?.(true);
    this.part = 'ended';
  }
  podiumMenu() {
    this.menu = new Menu({ items: [{ label: 'Rematch', on: () => App.go('medley', { players: this.args.players }) }, { label: 'Back to the menu', on: () => App.go('title', { page: 'main' }) }], onBack: () => App.go('title', { page: 'main' }), scale: 1, rowH: 14, w: 180 });
  }
  dispose() { if (this.ghostTimer) clearInterval(this.ghostTimer); for (const o of this.off ?? []) o?.(); }
  screenOf(x, y, z) { const v = this.v.set(x, y, z).project(this.ctx.camera.camera), h = this.ctx.hud; return { x: ((v.x + 1) / 2) * h.width, y: ((1 - v.y) / 2) * h.height }; }
  drawCard(hud) {
    const W = hud.width, H = hud.height, c = this.cardState;
    const sc = Math.max(1, Math.min(4, Math.floor((W - 12) / textWidth(TITLE, 1)))), tw = textWidth(TITLE, sc);
    say(hud, (W - tw) / 2, 10, TITLE, { scale: sc, color: 'white', shadow: 'navy' });
    const goal = wrap('Score the most across three events. Stay in the circle.', Math.floor((W - 16) / 6));
    goal.forEach((l, i) => plateCenter(hud, 14 + 7 * sc + i * 11, l, { color: 'white' }));
    this.lanes.forEach((l) => {
      const p = this.screenOf(l.x, 2.15, l.z), ready = c?.ready?.includes(l.id);
      const nw = textWidth(l.name) + (ready ? 12 : 0), nx = Math.max(6, Math.min(W - 6 - nw, p.x - nw / 2));
      plate(hud, nx, Math.max(22 + 7 * sc + goal.length * 11, p.y - 14), l.name, { color: ['red', 'sky', 'lime', 'sand'][l.seat] ?? 'white' });
      if (ready) hud.rect(nx + nw - 8, Math.max(23 + 7 * sc + goal.length * 11, p.y - 13), 7, 7, 'lime');
    });
    // How to play, for the device in use. Stacked when the window is narrow.
    const rows = [['lean', 'Lean'], ['breath', 'Breathe'], ['feet', 'Step']];
    const across = W >= 300, h = across ? 26 : 12 + rows.length * 13, y = H - 20 - h;
    panel(hud, 6, y, W - 12, h, 'white', 'teal');
    let x = 12;
    rows.forEach(([a, v], i) => { if (across) x = prompt(hud, x, y + 3, a, v, { color: 'ink', shadow: false }) + 8; else prompt(hud, 12, y + 4 + i * 13, a, v, { color: 'ink', shadow: false }); });
    const left = c?.left === null || c?.left === undefined ? (c?.starting ? 'Starting' : c?.paused ? 'Paused' : '') : `${Math.ceil(c.left / 1000)} s`;
    if (left) say(hud, W - 12 - textWidth(left), y + h - 11, left, { color: 'teal', shadow: false });
    promptBar(hud, [['confirm', c?.ready?.includes(this.session?.me) ? 'Ready!' : 'Ready'], ['more', c?.asked ? 'More: asked' : 'More time']]);
    App.lastCardPrompts = true;
  }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    if (this.part === 'card') return this.drawCard(hud);
    if (this.part === 'ended') return;
    if (this.part === 'count') { const n = this.session ? Math.ceil(-this.now()) : Math.ceil(3 - this.t); center(hud, H / 2 - 20, String(Math.max(1, n)), { scale: 5, color: 'sand' }); plateCenter(hud, H / 2 + 20, 'Everyone wobbles.', { color: 'white' }); return; }
    if (this.part === 'podium') return this.drawPodium(hud);
    const now = this.now();
    if (this.partEv === 'event') {
      const w = medleyWindow(this.ev), left = Math.max(0, Math.ceil(w.end - now));
      plate(hud, 8, 6, `${MEDLEY.events[this.ev].name}: ${ACT[this.picks[this.ev]].name}`.slice(0, Math.floor((W - 60) / 6)), { color: 'white' });
      const ls = String(left); say(hud, W - 12 - textWidth(ls, 2), 6, ls, { scale: 2, color: 'sand' });
    } else {
      const nx = this.nextEv ?? 0, w = nx < 3 ? medleyWindow(nx) : null;
      if (w) { plateCenter(hud, 14, nx === 0 ? 'First event' : `Next: ${MEDLEY.events[nx].name}`, { scale: 2, color: 'white' }); center(hud, 36, `${Math.max(0, Math.ceil(w.start - now))}`, { scale: 3, color: 'sand' }); }
    }
    this.lanes.forEach((l) => {
      const headY = Math.max(32, this.screenOf(l.x, 2.25, l.z).y - 28), p = this.screenOf(l.x + (l.sim?.x ?? 0), 2.25, l.z);
      const bx = Math.max(28, Math.min(W - 28, p.x)), by = headY + 2;
      if (l.driver.kind === 'ghost') {
        if (l.driver.a === this.ev) { const s = String(l.driver.s); say(hud, bx - textWidth(s) / 2, by + 8, s, { color: 'white' }); }
      } else if (l.sim && this.partEv === 'event') {
        const box = { x: Math.round(bx), y: Math.round(by), r: 22, seat: SEAT_PALETTE[l.seat] };
        VIEWS[l.view].draw(this, hud, l, box, false);
        if (l === this.mine) { App.dialCenter.x = box.x; App.dialCenter.y = box.y; }
      }
      const name = l.name.slice(0, 10), tot = this.scoreOf(l), ty = H - 40;
      const sx = Math.round(Math.max(12, Math.min(W - 12 - name.length * 6, this.screenOf(l.x, 0, l.z + 0.4).x - name.length * 3)));
      plate(hud, sx, ty, name, { color: 'white' }); plate(hud, sx, ty + 10, String(tot), { color: 'sand' });
      note(sx, ty, name.length * 6, 18, 'lane-label');
    });
    if (!App.attract && this.partEv === 'event') {
      const v = this.viewName;
      promptBar(hud, v === 'step' ? [['feet', 'Left, right']] : v === 'hoop' ? [['lean', 'Circle, flick']] : v === 'poses' ? [['lean', 'Lean'], ['breath', 'Breathe']] : [['lean', 'Lean']]);
    }
  }
  drawPodium(hud) {
    const W = hud.width, H = hud.height, w = Math.min(W - 24, 340), x = (W - w) / 2, y = 12;
    panel(hud, x, y, w, Math.min(H - 40, 200), 'white', 'teal');
    center(hud, y + 6, 'The Medley', { scale: 2, color: 'teal', shadow: false });
    (this.ranking ?? []).forEach((l, i) => {
      const yy = y + 26 + i * 14;
      star(hud, x + 12, yy - 1, i === 0, 1);
      say(hud, x + 26, yy, `${i + 1}. ${l.name}`.slice(0, 26), { color: 'ink', shadow: false, scale: 1 });
      const s = String(this.scoreOf(l)); say(hud, x + w - 12 - textWidth(s), yy, s, { color: 'plum', shadow: false });
    });
    let yy = y + 26 + (this.ranking?.length ?? 0) * 14 + 4;
    for (const a of this.awards ?? []) { say(hud, x + 12, yy, `${a.title}: ${a.lane.name}`.slice(0, 40), { color: 'teal', shadow: false }); yy += 10; }
    for (const l of wrap(BARKS.classmates.coach[0], 52).slice(0, 2)) { center(hud, yy + 2, l, { color: 'slate', shadow: false }); yy += 10; }
    if (this.menu) { this.menu.y = H - 16 - 12 - 2 * 14 - 8; this.menu.draw(hud); promptBar(hud, [['confirm', 'Select']]); }
  }
  status() { return `medley | ${this.part} | ev ${this.ev} | ${this.partEv ?? ''} | ${this.lanes.map((l) => this.scoreOf(l)).join(',')}`; }
  debugDot() { const d = this.mine?.sim?.dot; return d ? `${d.x.toFixed(2)},${d.y.toFixed(2)}` : '-'; }
  fingerprint() { return this.status(); }
}

// Family Hour: each device claims a mat by pressing Cross or Enter.
export class JoinScene extends BaseScene {
  id = 'join'; attractable = true; claims = []; bots = true; prevPads = [];
  camera() { return laneCamera(4); }
  async build(ctx) {
    this.ctx = ctx; backdrop(ctx, 'plaza'); App.music('plaza');
    this.mats = medleyXs(4); this.avatars = [];
    for (let i = 0; i < 4; i++) { place(ctx, 'yoga-mat', this.mats[i], 0.002, 0.8, { palette: { mat: SEAT_PALETTE[i], stripe: 'white' } }); const a = await makeAvatar(ctx, SEAT_LOOKS[i]); a.setAt(this.mats[i], 0, 0.8); a.root.visible = false; a.shadow.visible = false; this.avatars.push(a); }
    App.say('One device, one mat. Please do not fight over the mats.', 'ounce');
  }
  claim(kind, index = 0) {
    if (this.claims.length >= 4 || this.claims.some((c) => c.kind === kind && c.index === index)) return;
    const seat = this.claims.length;
    this.claims.push({ kind, index, seat, name: kind === 'keys' ? 'Keyboard' : `Pad ${index + 1}` });
    const a = this.avatars[seat]; a.root.visible = true; a.shadow.visible = true; a.play('Wave', { once: true }); a.sq.kick(-2);
    App.sfx('menuConfirm');
  }
  v = new Vector3();
  frame(ctx, dt, rdt, free) {
    for (const a of this.avatars) a.update(dt);
    if (!free) return;
    const i = ctx.input;
    if (i.wasPressed('Enter', 'KeyE')) this.claim('keys');
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (let k = 0; k < (pads.length ?? 0); k++) { const p = pads[k]; if (!p) continue; const down = !!p.buttons[0]?.pressed; if (down && !this.prevPads[k]) this.claim('pad', k); this.prevPads[k] = down; }
    if (i.wasPressed('PadSquare', 'KeyR')) { this.bots = !this.bots; App.sfx('menuMove'); }
    if (i.wasPressed('PadTriangle', 'KeyM', 'Space')) this.begin();
    if (i.wasPressed('PadCircle', 'Escape', 'Backspace', 'MouseRight')) App.go('title', { page: 'main' });
    if (i.wasPressed('MouseLeft')) { if (this.claims.length) this.begin(); else this.claim('keys'); }
  }
  players() {
    const ps = this.claims.map((c) => ({ ...c, id: c.seat }));
    if (this.bots || !ps.length) {
      const cast = ['marguerite', 'dennis', 'june', 'coach'], skill = ['expert', 'average', 'good', 'good'];
      let b = 0;
      while (ps.length < 4 && b < 4) { ps.push({ kind: 'bot', seat: ps.length, name: BOT_NAMES[b] === 'Kevin' ? 'Coach' : BOT_NAMES[b], cast: cast[b], skill: skill[b], id: ps.length }); b++; }
    }
    return ps;
  }
  begin() { if (this.left) return; this.left = true; App.go('medley', { players: this.players() }); }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    center(hud, 12, 'Family Hour', { scale: W > 460 ? 3 : 2, color: 'white', shadow: 'navy' });
    plateCenter(hud, 38, 'Press your button to claim a mat. Up to four.', { color: 'white' });
    for (let i = 0; i < 4; i++) {
      const p = this.screenOf(this.mats[i], 2.1, 0.8), c = this.claims[i];
      const t = c ? c.name : this.bots ? 'Bot' : 'Empty'; plate(hud, Math.round(p.x - t.length * 3), Math.round(p.y) - 14, t, { color: c ? 'sand' : 'white' });
    }
    plate(hud, 14, H - 32, `Bots ${this.bots ? 'on' : 'off'}`, { color: 'white' });
    promptBar(hud, [['confirm', 'Claim'], ['alt', 'Bots'], ['more', 'Start'], ['back', 'Back']]);
  }
  screenOf(x, y, z) { const v = this.v.set(x, y, z).project(this.ctx.camera.camera), h = this.ctx.hud; return { x: ((v.x + 1) / 2) * h.width, y: ((1 - v.y) / 2) * h.height }; }
  status() { return `join | ${this.claims.length} claimed`; }
}
