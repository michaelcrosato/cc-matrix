// The operation: sim bridge, field and hands, HUD, events -> sound/juice, pause, dev mode, failure, results hand-off.
import { THREE, PALETTE, setLookLayer } from '../../pixel-engine.js';
import { app, ASSIST } from '../app.js';
import { go, swap } from '../core/nav.js';
import { cfg, resetConfig, DIFFS } from '../core/config.js';
import { createOp, step, drainEvents, result, forceFail, forceWin, hash } from '../sim/op.js';
import { newBot, botInput } from '../sim/bot.js';
import { startCodeBlue } from '../sim/core.js';
import { TOOL_OF, toolTargets } from '../sim/tools.js';
import { pointAt } from '../sim/geom.js';
import { BY_ID, OPS } from '../content/ops/index.js';
import { LINES, POOLS, WHO, pick } from '../content/lines.js';
import { FieldView, TB_DX } from '../view/field.js';
import { HandRig } from '../view/hands.js';
import { buildBust } from '../view/bust.js';
import { heightAt } from '../content/arenas.js';
import { Devices, readSeatInput, WHEEL } from '../input/devices.js';
import { drawOpHud, drawCodeBlue, drawMass, TOOL_NAMES } from '../ui/opHud.js';
import { Menu } from '../ui/menu.js';
import { ctext, mtext, prompts, wrap, textW, SEAT_PAL, line, tokens } from '../ui/hud.js';
import { SettingsScreen } from '../ui/settings.js';
import { DevUI } from '../ui/dev.js';
import { Speaker } from '../audio/speak.js';
import { LOOK, applyLook } from '../core/look.js';
import { registerSfx } from '../content/sfx.js';
const { Vector3 } = THREE;
const LINES_EMO = {};
const CAM = { pos: [0, 9.6, 3.1], tgt: [0, 0, 0.1] };
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export class OperationStage {
  name = 'Operation';
  constructor(a) { this.a = { difficulty: app.save.difficulty || 'resident', seed: 1, ...a }; this.def = BY_ID[a.opId]; this.ready0 = false; }
  async setup(ctx) {
    const a = this.a, def = this.def; this.ctx = ctx; this.t = 0; this.fx = ctx.random.fork('fx');
    ctx.input.preventKeys.add('Tab'); ctx.input.preventKeys.add('Space'); this.lookKey = '';
    ctx.audio.stopLoops();
    const eng = ctx.engine; eng.sun.intensity = 1.0; eng.sun.color.setHex(0xffffff); eng.ambient.intensity = 0.55; eng.ambient.color.setHex(0xfff0e0); eng.setSunDirection?.([0.25, 1, 0.35]);
    this.cheats = a.cheats ? { ...a.cheats } : { god: false, composure: false, freezeClock: false, unlimited: false };
    if (a.attract) { this.cheats = { god: true, composure: true, freezeClock: true, unlimited: true }; }
    const seatsDef = a.session ? [] : a.seatsDef || (def.partner ? [{ id: 0, doctor: 'ilya' }, { id: 1, doctor: 'sabine', bot: true }] : [{ id: 0, doctor: def.surgeon }]);
    if (a.session) { this.net = a.net; this.sim = this.net.sim; this.localIdx = this.net.localIdx; this.def = this.net.def; }
    else this.sim = createOp(def, { seed: a.seed, difficulty: a.difficulty, seats: seatsDef, startStage: a.startStage, cheat: this.cheats, quietOn: a.quietOn ?? app.save.quietOn, retried: a.retried, humans: a.humans ?? seatsDef.filter((s) => !s.bot).length, unlocked: a.startStage ? [...new Set([...def.tools, 'syringe'])] : undefined });
    const sim = this.sim; this.nT = sim.tables.length;
    this.field = new FieldView(ctx, def.arena, this.nT);
    for (let tb = 0; tb < this.nT; tb++) ctx.lights.request({ position: [tb * TB_DX, 5.2, 0.4], color: 0xffffff, intensity: 5, radius: 15 });
    this.rigs = sim.seats.map((s, i) => new HandRig(ctx.scene, i, s.doctor));
    this.srcs = a.session ? sim.seats.map((s, i) => (i === this.localIdx ? { kind: 'mix' } : null)) : a.srcs || sim.seats.map((s, i) => (i === 0 ? { kind: 'mix' } : { kind: 'pad', i: i - 1 }));
    this.bots = sim.seats.map((s, i) => (a.session ? null : s.bot || a.attract || a.botAll ? newBot(a.skill ?? (def.partner && s.bot ? 0.8 : 1), { region: def.partner ? (s.bot ? 'left' : 'right') : null, cheats: true }) : null));
    this.bots.forEach((b, i) => { if (b) { b.x = sim.seats[i].x; b.z = sim.seats[i].z; } });
    this.pend = sim.seats.map(() => ({})); this.st = sim.seats.map(() => ({})); this.lastTool = sim.seats.map(() => 'drain'); this.quick = sim.seats.map(() => null);
    this.speaker = new Speaker(app); this.comm = null; this.pops = []; this.camP = new Vector3(...CAM.pos); this.camT = new Vector3(...CAM.tgt); this.camX = 0;
    this.diveT = a.noDive || a.startStage || a.attract ? 9 : 0; this.state = 'play'; this.paused = false; this.sub = null; this.view = { hit: false, bot: false, skill: 0.8, speed: 1, stats: false };
    this.accum = 0; this.stepOnce = false; this.objective = ''; this.stageTitle = ''; this.stageTitleT = -9; this.ghost = null; this.hintCache = null; this.failCount = app.save.attempts?.[def.id] || 0; this.endT = 0;
    this.lookSt = { sat: 1, vig: 0.3, spread: 0, pix: app.settings.pixel || 1 }; this.lookTarget = { sat: 1, vig: 0.3, spread: 0 };
    ctx.particles.register('blood', { count: [5, 8], life: [0.4, 0.8], speed: [1, 3], gravity: 6, size: [1, 1], colors: ['red', 'plum', 'orange'] });
    ctx.particles.register('spark', { count: [6, 10], life: [0.2, 0.5], speed: [2, 5], gravity: 2, size: [1, 1], colors: ['white', 'sand', 'cyan'] });
    ctx.particles.register('foam', { count: [5, 9], life: [0.4, 0.9], speed: [0.5, 1.5], gravity: -1, size: [1, 2], colors: ['cyan', 'white', 'mist'] });
    ctx.particles.register('puff', { count: [6, 10], life: [0.5, 1], speed: [0.5, 1.2], gravity: -2, size: [1, 2], colors: ['mist', 'slate', 'white'] });
    if (!a.attract) { app.director.start(ctx, def.music, 0); }
    else app.director.start(ctx, def.music, 0);
    app.applySettings(ctx);
    this.act0 = app.devices.activity; this.attractT = 0;
    this.heartL = null; this.drainSnd = 0; this.lampT = 0;
    if (typeof document !== 'undefined') ctx.engine.container?.style && (ctx.engine.container.style.cursor = 'none');
    this.bust = null; this.commBust = null;
    window.__GAME__ && (window.__GAME__.op = this);
    ev0(this);
  }
  dispose(ctx) { try { if (ctx.engine.container) ctx.engine.container.style.cursor = ''; } catch {} }
  status() { const s = this.sim; return `${this.def.id} stage=${s.stage} vitals=${Math.round(s.tables[0].vitals)} t=${Math.round(s.t)} score=${s.score.pts} ${s.over || this.state}`; }
  fingerprint() { return String(hash(this.sim)); }
  cameraTarget() { return this.camT; }

  // ---- pick the surface point under the mouse ----
  pickFn(seatIdx) {
    const ctx = this.ctx, o = new Vector3(), d = new Vector3();
    return (nx, ny) => {
      ctx.camera.rayAt(nx, ny, o, d); let y = 0, x = 0, z = 0; const tb = this.sim.seats[seatIdx].tb, X0 = tb * TB_DX;
      for (let i = 0; i < 5; i++) { const t = (y - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = this.field.h(x - X0, z); }
      return [x - X0, z];
    };
  }
  toHud(wx, wy, wz) { const v = new Vector3(wx, wy, wz).project(this.ctx.camera.camera), h = this.ctx.hud; return [((v.x + 1) / 2) * h.width, ((1 - v.y) / 2) * h.height]; }
  tipHud(seat) { const X0 = seat.tb * TB_DX; return this.toHud(X0 + seat.x, this.field.h(seat.x, seat.z) + 0.3, seat.z); }

  fixedUpdate(ctx, dt) {
    if (!this.sim || this.state !== 'play' || this.paused || this.diveT < 1.2 || this.a.session) return;
    const sim = this.sim; let n = 0;
    this.accum += this.view.speed; if (this.stepOnce) { this.accum = Math.max(this.accum, 1); this.stepOnce = false; }
    while (this.accum >= 1 && n < 4) {
      this.accum -= 1; n++;
      const inputs = {};
      sim.seats.forEach((s, i) => {
        const bot = this.bots[i] || (this.view.bot ? (this.bots[i] = newBot(this.view.skill)) : null);
        if (bot && (this.a.attract || s.bot || this.view.bot || this.a.botAll)) { if (!bot.init) { bot.init = 1; bot.x = s.x; bot.z = s.z; } bot.skill = s.bot ? (this.def.partner ? 0.8 : bot.skill) : this.view.bot ? this.view.skill : bot.skill; inputs[s.id] = botInput(sim, s, bot); }
        else { const p = this.pend[i]; inputs[s.id] = { ...p }; p.tool = undefined; p.tbd = 0; p.tag = false; }
      });
      if (this.net?.override) this.net.override(inputs);
      step(sim, inputs);
      this.handleEvents(ctx, drainEvents(sim)); if (this.net) this.net.afterStep?.(sim);
      if (sim.over) break;
    }
  }

  update(ctx, dt) {
    const sim = this.sim, hud = ctx.hud, a = this.a, dev = app.devices; this.t += dt;
    dev.poll(dt, ctx); const nav = dev.nav; this.nav = nav;
    // attract mode exits on any real input
    if (a.attract) { if (dev.activity !== this.act0 && this.t > 0.4) return this.exitAttract(ctx); this.attractT += dt; if (this.attractT > a.attract.dur || sim.over) return this.nextAttract(ctx); }
    if (this.diveT < 9) this.diveT += dt;
    this.readInputs(ctx, dt);
    if (this.net) this.sessionTick(ctx, dt);
    // pause
    if (!a.attract && !a.session && this.state === 'play' && nav.pause && !this.paused && !this.sim.cb?.fib) { this.openPause(ctx); this.pauseGuard = true; }
    if (this.paused && this.sub) { if (this.pauseGuard) this.pauseGuard = false; else this.updateSub(ctx, dt); }
    // draw things
    this.speaker.update(ctx, dt); this.mouthT = this.speaker.mouth;
    const sd = this.paused ? 0 : dt;
    this.field.update(sim, this.t, dt);
    this.updateHands(ctx, dt); this.updateCamera(ctx, dt); this.updateLook(ctx, dt); this.updateLoops(ctx, dt);
    this.pops = this.pops.filter((p) => (p.life -= dt) > 0);
    app.director.update(ctx.time, { vitals: sim.tables[Math.min(this.humanSeat().tb, sim.tables.length - 1)].vitals, heartBpm: sim.heart?.bpm, base: this.def.music && this.def.music.startsWith('or-') ? this.def.music : null });
    this.drawHud(ctx, dt);
    if (sim.over && this.state === 'play' && !a.session) this.finish(ctx);
    if (this.state === 'win') { this.endT += dt; if (this.endT > 1.4 && !this.leaving) { this.leaving = true; this.toResults(ctx); } }
    if (this.state === 'fail') this.updateFail(ctx, dt);
  }
  sessionTick(ctx, dt) {
    const net = this.net, sim = this.sim; this.handleEvents(ctx, net.drain());
    const i = this.localIdx; if (i >= 0 && this.pend[i]) { net.sendLocal(this.pend[i], sim.seats[i], dt); const p = this.pend[i]; p.tool = undefined; p.tbd = 0; p.tag = false; }
    if (net.client) for (const s of sim.seats) { if (!s.local && s.tx !== undefined) { s.x += (s.tx - s.x) * Math.min(1, dt * 8); s.z += (s.tz - s.z) * Math.min(1, dt * 8); } }
    if (sim.over && this.state === 'play') { this.state = 'done'; }
    this.sessionClock = window.AIHub ? window.AIHub.time() : 0;
  }
  humanSeat() { if (this.localIdx !== undefined && this.sim.seats[this.localIdx]) return this.sim.seats[this.localIdx]; return this.sim.seats.find((s) => !s.bot) || this.sim.seats[0]; }

  readInputs(ctx, dt) {
    const sim = this.sim, dev = app.devices; if (this.a.attract || this.paused || this.state !== 'play') return;
    sim.seats.forEach((s, i) => {
      if (this.bots[i] && (s.bot || this.a.botAll)) return; const src = this.srcs[i]; if (!src) return;
      if (src.kind === 'pad' && !dev.pads[src.i]?.connected) { const p = this.pend[i]; p.use = p.use2 = false; return; }
      const out = readSeatInput(dev, ctx, src, this.st[i], this.pickFn(i)); const p = this.pend[i], st = this.st[i];
      // wheel: rotates a held fragment, otherwise cycles tools
      const w = st.wheelAcc || 0; st.wheelAcc = 0; let rot = out.rot;
      const holding = s.grab && sim.ents.find((e) => e.id === s.grab && e.rotT !== undefined);
      if (w) { if (holding) st.rotKick = 0.18 * Math.sign(w); else { const un = sim.unlocked.filter((t) => WHEEL.includes(t)); let k = un.indexOf(s.sel); k = (k + (w > 0 ? 1 : -1) + un.length) % un.length; out.tool = un[k]; } }
      if (st.rotKick) { rot = Math.sign(st.rotKick) * 1; st.rotKick -= Math.sign(st.rotKick) * dt; if (Math.abs(st.rotKick) < dt) st.rotKick = 0; }
      if (!holding) rot = 0;
      let use2 = out.use2; if (sim.cb || sim.mass) { if (out.gift) use2 = true; }
      const prevTool = s.sel;
      if (out.tool && out.tool !== prevTool && sim.unlocked.includes(out.tool)) { this.lastTool[i] = prevTool; }
      if (out.last && !holding) { const lt = this.lastTool[i]; out.tool = lt; this.lastTool[i] = s.sel; }
      if (out.keyTag && !holding && ctx.input.wasPressed('KeyE') === false) { }
      if (out.quick && sim.unlocked.includes('syringe')) { this.quick[i] = s.sel; out.tool = 'syringe'; }
      if (this.quick[i] && s.syr == null && !s.use && s.sel === 'syringe' && sim.t - (st.qt ?? 0) > 0.3) { if (!st.qa) st.qa = true; }
      Object.assign(p, { ax: out.ax, az: out.az, px: out.px, pz: out.pz, use: out.use, use2, force: out.force, steady: out.steady, rot });
      p.gift = sim.cb ? false : (app.settings.giftToggle && s.doctor === 'ilya' ? this.toggleGift(i, out.gift) : out.gift);
      if (out.tool) p.tool = out.tool; if (out.tbd) p.tbd = out.tbd; if (out.keyTag) p.tag = true;
      if (src.kind !== 'pad' && out.keyTag && sim.flags.tagOK) p.tag = true;
      if (out.keyTag && !sim.flags.tagOK) this.showObjective = 3;
      if (ctx.input.wasPressed('KeyE') && !sim.flags.tagOK) this.showObjective = 4;
    });
    // quick syringe: restore previous tool after the dose
    sim.seats.forEach((s, i) => { if (this.quick[i] && s.syr == null && !s.use && s.sel === 'syringe') { const q = this.quick[i]; if (this.st[i].qwait === undefined) this.st[i].qwait = 0; this.st[i].qwait += dt; if (this.st[i].qwait > 0.35) { this.pend[i].tool = q; this.quick[i] = null; this.st[i].qwait = undefined; } } else if (this.st[i]) this.st[i].qwait = undefined; });
    // mouse: left-click on the wheel selects a tool
    if (this.nav.click && this.view.wheelRects) for (const r of this.view.wheelRects) { const c = this.nav.click; if (c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3] && r[5]) { this.pend[0].tool = r[4]; this.ignoreClick = true; } }
  }
  toggleGift(i, down) { const st = this.st[i]; if (down && !st.gp) st.gOn = !st.gOn; st.gp = down; return !!st.gOn; }

  updateHands(ctx, dt) {
    const sim = this.sim;
    sim.seats.forEach((s, i) => {
      const r = this.rigs[i]; if (!r) return; const X0 = s.tb * TB_DX, y = this.field.h(s.x, s.z), grabbed = s.grab && sim.ents.find((e) => e.id === s.grab);
      r.vis = this.state !== 'win' && !(sim.cb);
      r.update(X0 + s.x, y, s.z, s.tool, s.use, dt, this.t, { draw: s.syr, lift: grabbed ? 0.5 : 0 });
    });
  }
  updateCamera(ctx, dt) {
    const sim = this.sim, cam = ctx.camera.camera, seat = this.humanSeat(), hud = ctx.hud, aspect = hud.width / hud.height, k = Math.max(1, (16 / 9) / aspect);
    const tx = seat.tb * TB_DX; this.camX += (tx - this.camX) * Math.min(1, dt * 7);
    const dive = ease(this.diveT / 1.4), d = 1 - dive;
    const drift = [Math.max(-0.25, Math.min(0.25, seat.x * 0.04)), Math.max(-0.2, Math.min(0.2, (seat.z) * 0.03))];
    const px = this.camX + CAM.pos[0] + drift[0] + 0 * d, py = CAM.pos[1] * k + d * 12, pz = CAM.pos[2] * k + d * 9 + drift[1];
    cam.position.set(px, py, pz); this.camT.set(this.camX + drift[0] * 0.5, 0, 0.1 + drift[1] * 0.3); cam.lookAt(this.camT);
    cam.updateMatrixWorld?.(true);
  }
  updateLook(ctx, dt) {
    const sim = this.sim, T = this.lookTarget, S = this.lookSt, vit = sim.tables[this.humanSeat().tb].vitals;
    T.sat = sim.quiet ? 0.25 : 1; T.vig = sim.quiet ? 0.7 : vit < 30 ? 0.5 : 0.3; T.spread = (this.rewindFx > 0 ? 0.012 : 0);
    if (this.rewindFx > 0) this.rewindFx -= dt;
    const k = Math.min(1, dt * 6); S.sat += (T.sat - S.sat) * k; S.vig += (T.vig - S.vig) * k; S.spread += (T.spread - S.spread) * k;
    const q = { sat: Math.round(S.sat * 25) / 25, vig: Math.round(S.vig * 25) / 25, spread: Math.round(S.spread * 500) / 500, pix: this.lookSt.pix };
    const mode = app.settings.look; if (mode === 'noir') q.sat = Math.min(q.sat, 0.3); if (mode === 'warm') q.sat = Math.min(1.3, q.sat * 1.15);
    this.lookKey = applyLook(ctx.engine, q, this.lookKey);
    // lamp flicker at very low vitals
    ctx.engine.sun.intensity = vit < 15 && !this.sim.cb ? 0.55 + (Math.sin(this.t * 40) > 0.3 ? 0.45 : 0) : 1.0;
  }
  updateLoops(ctx, dt) {
    const sim = this.sim, aud = ctx.audio; this.loopT = (this.loopT || 0) - dt;
    if (this.loopT <= 0) {
      this.loopT = 0.14;
      for (const s of sim.seats) {
        if (!s.use || sim.cb) continue;
        const vol = 1;
        if (s.tool === 'drain' && s.dwell) aud.play('drainLoop', { pitch: (s.force - 1) * 3, volume: 0.6 });
        else if (s.tool === 'laser') aud.play('laser', { volume: 0.5 });
        else if (s.tool === 'gel' && s.gelHold) aud.play('gelLoop', { volume: 0.5 });
        else if (s.tool === 'scalpel' && s.cut) aud.play('cutLoop', { volume: 0.6 });
        else if (s.tool === 'scanner') aud.play('fizz', { volume: 0.2, pitch: 7 });
        if (s.tool === 'laser' || s.tool === 'drain' || s.tool === 'gel') app.devices.rumble(this.srcs[s.id]?.i ?? 0, 0.1 + 0.3 * (s.force ?? 1), 0.0, 100);
      }
    }
    // heartbeat while the room is quiet; EKG beep follows vitals
    this.beepT = (this.beepT || 0) - dt; const v = sim.tables[Math.min(this.humanSeat().tb, sim.tables.length - 1)].vitals;
    if (sim.quiet) { this.hbT = (this.hbT || 0) - dt; if (this.hbT <= 0) { this.hbT = 0.9; aud.play('heartbeat'); app.devices.rumbleAll(0.1, 0.5, 120); } }
    if (this.beepT <= 0 && !sim.cb && !sim.quiet && !sim.heart) { this.beepT = 0.9 - (100 - v) / 220; aud.play('beep', { pitch: (100 - v) / 14 - 4, volume: 0.3 }); if (v < 30) aud.play('alarm', { volume: 0.12 }); }
    if (sim.heart && sim.heart.sys && !this.sysSnd) { this.sysSnd = true; aud.play('thump', { volume: 0.6 }); ctx.engine.shake.add(app.settings.shake ? 0.03 : 0); } if (sim.heart && !sim.heart.sys) this.sysSnd = false;
  }

  // ---- events: sim -> sound, juice, UI ----
  handleEvents(ctx, evs) {
    const aud = ctx.audio, sim = this.sim, dev = app.devices;
    const shake = (n) => { if (app.settings.shake) ctx.engine.shake.add(n); }, flash = (c, d) => { if (app.settings.flashes) ctx.engine.screen.flash(c, { duration: d }); };
    const wp = (e, off = 0.2) => { const X0 = (e.tb || 0) * TB_DX; return [X0 + (e.x ?? 0), this.field.h(e.x ?? 0, e.z ?? 0) + off, e.z ?? 0]; };
    for (const e of evs) {
      switch (e.e) {
        case 'rate': {
          const p = this.toHud(...wp(e, 0.6)); if (e.g !== 'mistake' || true) this.pops.push({ x: p[0], y: p[1] - 6, g: e.g, pts: e.pts, life: 1.1 });
          const rn = { clean: 'rateClean', good: 'rateGood', sloppy: 'rateSloppy', mistake: 'mistake' }[e.g];
          aud.play(rn, { pitch: e.g === 'clean' ? Math.min(12, (e.streak || 0)) : 0 });
          if (e.g === 'mistake') { shake(0.35); dev.rumble(e.seat ?? 0, 0.8, 1, 200); if (this.def.surgeon === 'ilya' && !this.def.noVoice) this.quip(ctx, 'mistake'); }
          if (e.g === 'clean') { dev.rumble(e.seat ?? 0, 0.3, 0.1, 60); if (e.streak === 4 || e.streak === 8) this.quip(ctx, 'streak'); else if (this.fx.chance(0.07)) this.quip(ctx, 'clean'); }
          break;
        }
        case 'fx': this.fxEvent(ctx, e, wp); break;
        case 'stitch': aud.play('stitch', { pitch: e.i * 2 - 2, volume: 0.9 }); ctx.particles.burst('spark', wp(e, 0.3), { count: 4 }); dev.rumble(e.seat ?? 0, 0.2, 0, 40); break;
        case 'say': this.say(ctx, e.key); break;
        case 'wrong': aud.play('wrong'); if (!this.def.noVoice) this.quip(ctx, 'wrongTool'); break;
        case 'unlock': this.say(ctx, null, `NEW INSTRUMENT: ${TOOL_NAMES[e.tool] || ''}`); break;
        case 'quiet': aud.play('quietIn', { pitch: e.on ? 0 : 6 }); break;
        case 'awaken': flash('white', 0.4); aud.play('quietIn'); this.say(ctx, null, 'THE QUIET AWAKENS. HOLD {gift} TO SLOW THE ROOM. COMPOSURE FUELS IT.'); this.stageTitle = 'THE QUIET'; this.stageTitleT = this.t; break;
        case 'rewind': aud.play('rewind'); this.rewindFx = 0.7; shake(0.4); flash('cyan', 0.25); this.ghost = { rows: e.ghost, t: 0, secs: e.secs }; dev.rumbleAll(0.2, 0.8, 300); break;
        case 'lookFail': aud.play('wrong'); break;
        case 'low': if (e.lv === 30) { aud.play('alarm'); this.quip(ctx, 'lowVitals'); } break;
        case 'codeblue': aud.play('flatline'); flash('white', 0.3); shake(0.4); break;
        case 'cbCharge': aud.play('charge'); dev.rumbleAll(0.3, 0.2, 1100); break;
        case 'shock': if (e.good) { aud.play('clear'); flash('white', 0.25); shake(0.8); ctx.engine.hitstop?.(0.12); dev.rumbleAll(1, 1, 300); } else { aud.play('mistake'); aud.play('wrong'); } break;
        case 'cbSaved': aud.play('chime'); break;
        case 'stage': this.onStage(ctx, e); break;
        case 'beat': break;
        case 'knock': aud.play('knock'); shake(0.3); dev.rumbleAll(0.3, 0.9, 200); this.say(ctx, null, 'THE LIVER *KNOCKS*. LANCE THE PORE.'); break;
        case 'exposed': aud.play('pop'); this.say(ctx, null, 'CORE EXPOSED. FORCEPS. PULL AWAY FROM IT AND HOLD.'); break;
        case 'strainHit': aud.play('strainHit'); ctx.particles.burst('blood', wp(e, 0.4), { count: 12 }); shake(0.5); ctx.engine.hitstop?.(0.08); dev.rumbleAll(0.8, 1, 250); break;
        case 'strainMiss': aud.play('splat'); break;
        case 'strainDead': aud.play('strainDead'); flash('white', 0.2); shake(0.8); ctx.engine.hitstop?.(0.2); ctx.particles.burst('puff', wp({ x: e.x, z: e.z, tb: e.tb }, 0.5), { count: 30 }); break;
        case 'weep': aud.play('weep', { volume: 0.5, pitch: this.fx.range(-4, 4) }); break;
        case 'splat': aud.play('splat'); break;
        case 'fizz': aud.play('fizz'); ctx.particles.burst('foam', wp(e, 0.3), { count: 5 }); break;
        case 'eyeOpen': aud.play('pop', { pitch: -5, volume: 0.5 }); break;
        case 'sob': aud.play('strainHit', { pitch: -4 }); this.say(ctx, null, 'THE SOB. PAINT 80% OF THE LINE WITH GEL IN SIX SECONDS!'); this.stageTitle = 'THE SOB'; this.stageTitleT = this.t; break;
        case 'wave': shake(0.8); aud.play('mistake'); break;
        case 'sobOk': aud.play('chime'); break;
        case 'round': this.stageTitle = `ROUND ${e.n}`; this.stageTitleT = this.t; break;
        case 'plateCut': aud.play('cutDone'); break;
        case 'plateLift': aud.play('hookPop'); break;
        case 'plateDead': aud.play('strainHit', { pitch: 3 }); shake(0.3); break;
        case 'arrest': aud.play('flatline'); this.stageTitle = 'ARREST'; this.stageTitleT = this.t; flash('white', 0.3); break;
        case 'massage': aud.play('massage', { pitch: e.n }); shake(0.2); dev.rumbleAll(0.1, 0.8, 100); break;
        case 'massMiss': aud.play('wrong'); break;
        case 'fib': aud.play('alarm'); this.stageTitle = 'FIBRILLATION'; this.stageTitleT = this.t; break;
        case 'flare': aud.play('splat', { pitch: -3 }); break;
        case 'bpm': this.say(ctx, null, `BETA-BLOCKER. HEART RATE ${Math.round(e.bpm)} BPM.`); break;
        case 'ghostCut': aud.play('cutStart', { pitch: -6, volume: 0.6 }); break;
        case 'tether2': this.say(ctx, null, 'TWO HANDS ON ONE TETHER. BOTH HOLD FORCEPS AND PULL!'); break;
        case 'bigPull': aud.play('strainDead'); flash('white', 0.4); shake(1); break;
        case 'reveal': aud.play('pop'); break;
        case 'dose': break;
        case 'tbSwitch': aud.play('swap'); break;
        case 'tag': aud.play('swap', { pitch: 4 }); this.say(ctx, null, 'TAGGED IN. GIFTS SWAPPED.'); break;
        case 'win': aud.play('fanfare'); this.state = 'win'; break;
        case 'fail': break;
        case 'prompt': this.say(ctx, null, 'PRESS {gift} FOR THE SECOND LOOK.'); break;
        case 'burst': if (e.n === 'clot') { shake(0.6); flash('red', 0.2); aud.play('mistake'); } break;
      }
    }
  }
  fxEvent(ctx, e, wp) {
    const aud = ctx.audio, dev = app.devices, p = e.x !== undefined ? wp(e, 0.3) : null, pad = e.seat ?? 0;
    switch (e.n) {
      case 'slurp': aud.play('slurp'); if (p) ctx.particles.burst('blood', p, { count: 5 }); dev.rumble(pad, 0.5, 0.2, 90); break;
      case 'grab': aud.play('grab'); dev.rumble(pad, 0.2, 0.4, 50); break;
      case 'dish': aud.play('hookPop'); ctx.tweens.call(0.12, () => aud.play('dish')); ctx.particles.burst('spark', p, { count: 10 }); ctx.engine.shake.add(app.settings.shake ? 0.12 : 0); dev.rumble(pad, 0.3, 0.8, 90); break;
      case 'tear': case 'oops': aud.play('mistake', { volume: 0.5 }); ctx.particles.burst('blood', p, { count: 10 }); break;
      case 'snap': aud.play('wrong'); break;
      case 'cutstart': aud.play('cutStart'); break;
      case 'cutdone': aud.play('cutDone'); ctx.particles.burst('spark', p, { count: 8 }); dev.rumble(pad, 0.3, 0.5, 80); break;
      case 'burn': aud.play('burn'); ctx.particles.burst('puff', p, { count: 10 }); dev.rumble(pad, 0.6, 0.6, 120); break;
      case 'ping': aud.play('ping'); ctx.particles.burst('spark', p, { count: 6, colors: ['cyan', 'white'] }); break;
      case 'gelok': aud.play('gelOk'); break;
      case 'place': aud.play('grab', { pitch: -4 }); ctx.particles.burst('spark', p, { count: 8 }); break;
      case 'nosnap': aud.play('wrong'); break;
      case 'syrload': aud.play('syrLoad'); break;
      case 'inject': aud.play('inject'); ctx.particles.burst('foam', p, { count: 10 }); dev.rumble(pad, 0.4, 0.8, 150); break;
      case 'knot': aud.play('knot'); break;
      case 'dressdone': aud.play('chime'); break;
      case 'sysnick': aud.play('mistake', { volume: 0.4 }); break;
      case 'pluck': aud.play('hookPop', { pitch: 4 }); ctx.engine.shake.add(app.settings.shake ? 0.2 : 0); break;
    }
  }
  quip(ctx, kind) {
    if (this.def.noVoice || this.a.attract) return; const who = this.def.comm && this.def.comm !== 'none' ? this.def.comm : (this.def.surgeon === 'sabine' ? 'reyes' : 'reyes');
    const wh = this.def.id === 'op4' || this.def.id === 'op6' && false ? 'sabine' : who; const key = `${wh}.${kind}`; if ((this.quipT ?? -9) > this.t - 6 && kind !== 'mistake') return; this.quipT = this.t;
    const pool = POOLS[key] || POOLS['reyes.' + kind]; if (!pool) return; const text = this.fx.pick(pool);
    this.sayRaw(ctx, wh, text);
  }
  say(ctx, key, raw) {
    if (raw) return this.sayRaw(ctx, 'system', raw, true);
    const L = LINES[key]; if (!L) return; if (this.def.noVoice && L.who !== 'system') { return this.sayRaw(ctx, 'system', L.text.join(' '), true); }
    const who = L.who; this.sayRaw(ctx, who, L.text.join(' '), who === 'system');
  }
  sayRaw(ctx, who, text, silent = false) {
    this.comm = { who, text, shown: '', emo: LINES_EMO[text] || 'stern' }; this.speaker.start(who === 'system' ? 'system' : who, text, { silent: silent || this.a.attract && false });
    this.commT = this.t; if (this.a.attract && who) { }
  }
  onStage(ctx, e) {
    this.objective = e.hint || ''; if (e.title || true) { this.stageTitle = (this.def.stages[e.i]?.title || e.id || '').toUpperCase().replace(/_/g, ' '); this.stageTitleT = this.t; }
    this.hintCache = null; app.director.request?.(this.def.music);
    if (e.i === 0) { this.stageTitle = this.def.title; this.stageTitleT = this.t; }
  }

  // ---- hint marker ----
  hintTarget() {
    const sim = this.sim, seat = this.humanSeat(), st = sim.def.stages[sim.stage]; if (!st?.hint || !sim.hintOn || sim.cb || sim.mass) return null;
    const hint = st.hint; if (hint === 'tables') { const lowest = sim.tables.map((t, i) => [t.vitals, i]).sort((a, b) => a[0] - b[0])[0][1]; if (lowest !== seat.tb) return null; }
    let cand = sim.ents.filter((e) => e.tb === seat.tb && !e.hid);
    const want = (e) => hint === 'dress' ? e.k === 'dress' : hint === 'move' ? e.k === 'marker' : hint === 'paddles' ? false : hint === 'scanner' ? false : TOOL_OF[e.k] === hint || (e.k === 'strain') && false;
    cand = cand.filter(want);
    if (hint === 'scanner') { cand = sim.ents.filter((e) => e.tb === seat.tb && (e.hid === 'scan' || (e.scanOnly && !e.shown) || (e.k === 'strain' && !sim.flags.scanned))); }
    if (!cand.length) return null;
    cand.sort((a, b) => Math.hypot(a.x - seat.x, a.z - seat.z) - Math.hypot(b.x - seat.x, b.z - seat.z)); const e = cand[0];
    let x = e.x, z = e.z; if (e.k === 'cut') [x, z] = pointAt(e.path, e.s); if (e.k === 'mask' && e.pts) { const i = e.got.findIndex((g) => !g); if (i >= 0) [x, z] = e.pts[i]; } if (e.k === 'dress') [x, z] = pointAt(e.path, e.s);
    return this.toHud(seat.tb * TB_DX + x, this.field.h(x, z) + 0.5, z);
  }

  updateCommBust(ctx, dt) {
    const cam = ctx.camera.camera, hud = ctx.hud; this.commBusts ??= {};
    const who = this.comm && this.comm.who !== 'system' && !this.def.noVoice ? this.comm.who : (this.def.noVoice ? null : (this.def.comm && this.def.comm !== 'none' ? this.def.comm : 'reyes'));
    for (const b of Object.values(this.commBusts)) b.group.visible = false;
    if (!who || this.diveT < 1.2 || this.paused || this.state !== 'play' && this.state !== 'win') return;
    let b = this.commBusts[who]; if (!b) { b = buildBust(who); b.group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = false; }); ctx.scene.add(b.group); this.commBusts[who] = b; }
    b.group.visible = true; b.setEmotion(this.comm?.emo || 'neutral'); b.update(dt, this.speaker.mouth, this.t);
    const nx = ((22 / hud.width) * 2) - 1, ny = 1 - ((52 / hud.height) * 2), d = 2.2;
    const v = new Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(d).add(cam.position);
    const sc = 0.062; b.group.scale.setScalar(sc); b.group.quaternion.copy(cam.quaternion);
    const off = new Vector3(0, -1.4 * sc, 0).applyQuaternion(cam.quaternion); b.group.position.copy(v).add(off);
  }
  drawHud(ctx, dt) {
    this.updateCommBust(ctx, dt);
    const hud = ctx.hud, sim = this.sim, seat = this.humanSeat(); hud.clear();
    if (this.comm) this.comm.shown = this.speaker.shown;
    const view = { sim, def: this.def, seat, comm: this.comm, mouth: this.speaker.mouth, pops: this.pops, hint: this.state === 'play' && !this.paused ? this.hintTarget() : null, objective: this.objective, stageTitle: this.stageTitle, stageTitleT: this.stageTitleT };
    if (this.diveT > 1.0) drawOpHud(hud, app, view, this.t); this.view.wheelRects = view.wheelRects;
    // reticles for every seat
    sim.seats.forEach((s, i) => {
      if (s.tb !== seat.tb && !(sim.seats.length > 1)) return; const p = this.tipHud(s), col = SEAT_PAL[i % 4]; const px = Math.round(p[0]), py = Math.round(p[1]);
      hud.rect(px - 5, py, 3, 1, col); hud.rect(px + 3, py, 3, 1, col); hud.rect(px, py - 5, 1, 3, col); hud.rect(px, py + 3, 1, 3, col);
      if (sim.seats.length > 1) hud.text(px + 6, py - 10, String(i + 1), { color: col });
      const tg = sim.ents.find((e) => false);
      if (sim.heart && (s === seat)) { const sys = sim.heart.sys; for (let a = 0; a < 6.28; a += 0.3) hud.rect(Math.round(px + Math.cos(a) * 9), Math.round(py + Math.sin(a) * 9), 1, 1, sys ? 'red' : 'lime'); }
      if (s.tool === 'scanner' && s.use) for (let a = 0; a < 6.28; a += 0.12) hud.rect(Math.round(px + Math.cos(a) * 36), Math.round(py + Math.sin(a) * 28), 1, 1, 'cyan');
    });
    // ghost hand trail (second look)
    if (this.ghost) { this.ghost.t += dt; const g = this.ghost; const n = g.rows.length; const k = Math.min(n - 1, Math.floor((g.t / g.secs) * n)); for (let r = Math.max(0, k - 12); r <= k; r++) { const row = g.rows[r][0]; if (!row) continue; const p = this.toHud(row[2] * TB_DX + row[0], 0.3, row[1]); hud.rect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3, r === k ? 'white' : 'cyan'); } if (g.t > g.secs) this.ghost = null; }
    if (sim.cb) drawCodeBlue(hud, app, sim, this.t); else if (sim.mass) drawMass(hud, app, sim, this.t);
    if (this.view.hit) for (const e of sim.ents) { if (e.tb !== seat.tb) continue; const p = this.toHud(seat.tb * TB_DX + e.x, 0.3, e.z); hud.rect(Math.round(p[0]) - 2, Math.round(p[1]) - 2, 5, 5, 'orange'); hud.text(Math.round(p[0]) + 4, Math.round(p[1]) - 3, e.id.slice(0, 8), { color: 'orange', shadow: 'ink' }); }
    if (this.view.stats) { hud.text(4, 44, `T ${sim.t.toFixed(1)} TICK ${sim.tick} ENTS ${sim.ents.length} FPS ${Math.round(1 / Math.max(dt, 0.001))}`, { color: 'yellow' in {} ? 'sand' : 'sand' }); }
    if (this.showObjective > 0) { this.showObjective -= dt; const st = sim.def.stages[sim.stage]; const l = LINES[st?.say]; if (l) { hud.rect(60, 58, hud.width - 120, 26, 'navy'); mtext(hud, 66, 62, tokens(app, l.text.join(' ')).slice(0, 110), { color: 'white' }); } }
    if (this.net && this.sessionClock < 0) { const n = Math.ceil(-this.sessionClock / 1000); hud.rect(0, 70, hud.width, 40, 'ink'); ctext(hud, 78, n > 0 ? String(n) : 'GO', { scale: 4, color: 'sand' }); }
    if (this.net && this.state === 'done') { hud.rect(0, 80, hud.width, 40, 'ink'); ctext(hud, 90, sim.over === 'win' ? 'THE PATIENT IS SAVED' : 'THE PATIENT IS LOST', { scale: 2, color: sim.over === 'win' ? 'lime' : 'red' }); }
    // prompts bar
    if (!this.paused && this.state === 'play' && this.t < 14 && !this.a.attract && !sim.cb && !sim.mass) prompts(hud, app, [{ act: 'move', label: 'MOVE' }, { act: 'use', label: 'USE' }, { act: 'tool', label: 'TOOL' }, { act: 'steady', label: 'STEADY' }, { act: 'pause', label: 'PAUSE' }], 4, 78);
    if (this.diveT < 1.4) { hud.rect(0, 0, hud.width, Math.round(hud.height * (1 - this.diveT / 1.4) * 0.12), 'ink'); }
    if (this.a.attract) { hud.rect(0, 0, hud.width, 0, 'ink'); ctext(hud, hud.height - 50 - 32 > 0 ? 40 : 40, 'DEMO - PRESS ANY BUTTON', { scale: 2, color: ((this.t * 2) | 0) % 2 ? 'sand' : 'white' }); }
    if (this.paused && this.sub) this.sub.draw?.(hud);
    if (this.state === 'fail') this.drawFail(hud);
    if (this.a.session && this.net?.drawOverlay) this.net.drawOverlay(hud);
  }

  // ---- pause / dev / settings ----
  openPause(ctx) {
    this.paused = true; ctx.audio.play('uiOk'); if (ctx.engine.container) ctx.engine.container.style.cursor = '';
    const resume = () => { this.paused = false; this.sub = null; if (ctx.engine.container) ctx.engine.container.style.cursor = 'none'; };
    this.resume = resume;
    const m = new Menu([
      { label: 'RESUME', onSelect: resume }, { label: 'RETRY STAGE', onSelect: () => this.restart(ctx, this.sim.stage, true) }, { label: 'RESTART', onSelect: () => this.restart(ctx, 0, false) },
      { label: 'SETTINGS', onSelect: () => { this.sub = new SettingsScreen(app, ctx, () => this.openPause2(ctx)); } }, { label: 'DEV MODE', onSelect: () => this.openDev(ctx) }, { label: 'QUIT TO MENU', onSelect: () => this.quit(ctx) },
    ]);
    this.sub = { menu: m, update: (nav, dt) => { const r = m.update(nav, app, dt, ctx.audio); if (r === 'back' || nav.pause) resume(); }, draw: (hud) => { hud.rect(0, 0, hud.width, hud.height, 'ink'); ctext(hud, 20, 'PAUSED', { scale: 3, color: 'sand' }); ctext(hud, 50, `${this.def.title}  -  ${this.def.patient.name}`, { color: 'mist' }); m.draw(hud, 74, { rowH: 24 }); prompts(hud, app, [{ act: 'nav', label: 'MOVE' }, { act: 'confirm', label: 'SELECT' }, { act: 'pause', label: 'RESUME' }], 'center', hud.height - 14); } };
  }
  openPause2(ctx) { this.openPause(ctx); }
  updateSub(ctx, dt) { this.sub.update(this.nav, dt); }
  openDev(ctx) {
    const sim = this.sim, ctxx = ctx;
    const host = { cheats: this.cheats, view: this.view, cfgChanged: () => { this.sim.clockMax = this.def.time * DIFFS[this.sim.diffId].time * cfg.timeMul; app.applySettings(ctx); }, cheatsChanged: () => { Object.assign(this.sim.cheat, this.cheats); },
      unlockAll: () => { app.save.unlockedAll = true; this.sim.unlocked = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner']; this.sim.giftsOn.quiet = this.sim.giftsOn.look = true; this.sim.awakened = true; this.sim.composureShown = true; app.flush(); },
      jumpOp: (id, stage) => { this.paused = false; this.a.opId = id; this.restart(ctx, stage, false, id); }, jumpScene: (id) => go.story(ctx, id, { back: 'menu' }),
      act: (k) => this.devAct(ctx, k), spawn: (k) => this.devSpawn(k), frameStep: () => { this.stepOnce = true; this.paused = false; this.paused = true; this.stepNow = true; } };
    this.dev = new DevUI(app, ctx, host, () => this.openPause(ctx)); this.sub = this.dev;
    // frame step runs a single sim step even while paused
    this.frameStepFn = host.frameStep; host.frameStep = () => { const s = this.sim; const inputs = {}; s.seats.forEach((q) => (inputs[q.id] = {})); step(s, inputs); this.handleEvents(ctx, drainEvents(s)); };
  }
  devAct(ctx, k) {
    const sim = this.sim;
    if (k === 'stage') { const st = sim.def.stages[sim.stage]; for (const e of [...sim.ents]) if (!st.until?.time) sim.ents.splice(sim.ents.indexOf(e), 1); sim.flags.scanned = true; sim.flags[st.until?.flag] = true; if (st.until?.done) sim.flags['done:' + st.until.done] = true; sim.stageT = 999; sim.cb = null; sim.mass = null; }
    if (k === 'win') forceWin(sim); if (k === 'fail') forceFail(sim, 'dev'); if (k === 'cb') { sim.tables[0].vitals = 0; startCodeBlue(sim, true); this.paused = false; this.resume?.(); }
    if (k === 'json') { try { console.log(JSON.stringify(sim.def, null, 1)); } catch {} this.say(ctx, null, 'OP JSON COPIED TO CONSOLE.'); }
  }
  devSpawn(k) {
    const sim = this.sim, s = this.humanSeat(), x = Math.max(-5, Math.min(5, s.x)), z = Math.max(-3, Math.min(2.5, s.z));
    const o = { pool: { k: 'pool', at: [x, z], r: 1 }, bleeder: { k: 'pool', at: [x, z], r: 0.6 }, laceration: { k: 'lac', at: [x - 0.6, z], a: 0, len: 1.4 }, hook: { k: 'hook', at: [x, z], a: 0.3, pull: 1.2, arc: 0.4 }, strain: { k: 'strain', sk: 'introit', x: 0, z: 0, hp: 2, timer: 4 } }[k];
    import('../sim/core.js').then((c) => c.spawn(sim, { ...o, tb: s.tb }));
  }
  restart(ctx, stage, retried, opId) {
    const def = this.def; const a = { ...this.a, startStage: stage, retried: retried || this.a.retried && stage > 0, opId: opId || this.a.opId, noDive: stage > 0, cheats: this.cheats };
    if (stage === 0) a.retried = false; if (!opId) { } swap(ctx, new OperationStage(a));
  }
  quit(ctx) { app.devices.rumbleAll(0, 0, 1); go.menu(ctx); }

  // ---- end of op ----
  finish(ctx) {
    const sim = this.sim;
    if (this.a.session) { this.state = 'done'; this.net?.onOver?.(sim); return; }
    if (sim.over === 'win') { this.state = 'win'; this.endT = 0; ctx.audio.play('fanfare'); return; }
    this.state = 'fail'; this.failMenu = null; this.failT = 0; ctx.audio.play('flatline'); ctx.audio.stopMusic?.();
    app.save.attempts[this.def.id] = (app.save.attempts[this.def.id] || 0) + 1; this.failCount = app.save.attempts[this.def.id]; app.flush();
    if (ctx.engine.container) ctx.engine.container.style.cursor = '';
  }
  updateFail(ctx, dt) {
    this.failT += dt;
    if (!this.failMenu) {
      const items = [{ label: 'RETRY FROM THIS STAGE', onSelect: () => this.restart(ctx, this.sim.stage, true) }, { label: 'RESTART', onSelect: () => this.restart(ctx, 0, false) }];
      if (this.failCount >= 2 && this.sim.diffId !== 'intern') items.push({ label: 'LOWER DIFFICULTY', onSelect: () => { app.save.difficulty = this.sim.diffId === 'attending' ? 'resident' : 'intern'; app.settings.difficulty = app.save.difficulty; app.flush(); this.a.difficulty = app.save.difficulty; this.restart(ctx, 0, false); } });
      items.push({ label: 'QUIT TO MENU', onSelect: () => this.quit(ctx) }); this.failMenu = new Menu(items);
    }
    if (this.failT > 1.5) this.failMenu.update(this.nav, app, dt, ctx.audio);
    if (this.a.attract) { }
  }
  drawFail(hud) {
    hud.rect(0, 0, hud.width, hud.height, 'ink'); line(hud, 0, 70, hud.width, 70, 'red'); const x = (this.failT * 160) % hud.width; hud.rect(x, 66, 4, 8, 'white');
    ctext(hud, 24, 'THE PATIENT IS LOST', { scale: 2, color: 'red' }); const why = { time: 'THE CLOCK RAN OUT.', vitals: 'VITALS REACHED ZERO.', mistakes: 'TOO MANY MISTAKES.', 'cold time': 'THE DONOR KIDNEY WENT COLD.', 'patient lost': 'A PATIENT WAS LOST.', 'code blue': 'THE CODE BLUE FAILED.' }[this.sim.why] || '';
    ctext(hud, 82, this.def.patient.name, { color: 'mist' }); ctext(hud, 96, why, { color: 'white' }); if (this.failT > 0.8) ctext(hud, 112, this.def.noVoice ? 'NO SIGNAL.' : 'NURSE REYES: "TIME OF DEATH..." (...SORRY, DOCTOR.)', { color: 'sand' });
    if (this.failMenu && this.failT > 1.5) this.failMenu.draw(hud, 140, { rowH: 22 });
  }
  toResults(ctx) {
    const sim = this.sim, res = result(sim, this.def);
    const a = this.a; if (a.consult) { go.results(ctx, { opId: this.def.id, res, sim: summarize(sim), consult: true, seats: sim.seats.length, srcs: this.srcs, a: this.a }); return; }
    go.results(ctx, { opId: this.def.id, res, sim: summarize(sim), a: this.a, difficulty: sim.diffId });
  }
  exitAttract(ctx) { app.attractActive = false; app.swallow = true; go.title(ctx, { swallow: true }); }
  nextAttract(ctx) { go.attractNext?.(ctx, this.a.attract); }
}
function summarize(sim) { return { score: sim.score, doses: sim.doses, unscriptedCB: sim.unscriptedCB, lookUsed: sim.lookUsed, clock: sim.clock, per: sim.score.per, hooks: sim.score.hooks || 0 }; }
function ev0(st) { }
