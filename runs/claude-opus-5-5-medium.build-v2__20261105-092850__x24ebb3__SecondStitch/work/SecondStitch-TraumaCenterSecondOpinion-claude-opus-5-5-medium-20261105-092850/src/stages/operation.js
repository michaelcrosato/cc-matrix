// The operating stage. Solo/couch: steps the sim in fixedUpdate. Attract: the bot, cheating. Session: a driver feeds state.
import { PALETTE, THREE, setLookLayer, buildModel } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { createOp, step, drainEvents, cloneState, defOf, dev, hashSim } from '../sim/op.js';
import { createBot, botInput } from '../sim/bot.js';
import { results } from '../sim/scoring.js';
import { aimPoint, validTargets } from '../sim/entities.js';
import { TOOLS } from '../sim/tools.js';
import { OPS } from '../content/ops/index.js';
import { FieldView, TABLE_GAP } from '../view/field.js';
import { HandView, PLAYER_GLOVES } from '../view/hands.js';
import { StrainViews } from '../view/strains.js';
import { BustView } from '../view/bust.js';
import { OpHud } from '../ui/hud.js';
import { TOOL_ICONS } from '../content/icons.js';
import { BTN, deadzone } from '../input/devices.js';
import { flickSlot, integrateTip, nearTarget, strokeDir, toolAtSlot } from '../input/cursor.js';
import { heightAt } from '../content/arenas.js';
import { PauseOverlay } from '../ui/pause.js';
import { Fx } from '../view/fx.js';
import { MenuFail } from '../ui/fail.js';

const { Vector3, Mesh, BoxGeometry, MeshBasicMaterial } = THREE;
const AIM = { off: 0, low: 1, high: 2 }; // the setting scales the balance value
const o = new Vector3(), d = new Vector3(), proj = new Vector3();

export class OperationStage extends Stage {
  name = 'operation';
  constructor(opts = {}) {
    super();
    this.opts = opts;
    this.def = OPS[opts.op ?? 'op1'];
    this.tips = [];
    this.seatBind = opts.seats ?? [{ device: 'auto' }];
    this.loops = {}; this.loopOn = {};
    this.paused = false; this.pause = null; this.ended = null; this.endT = 0; this.fail = null;
    this.intro = opts.demo ? 0.3 : 1.1;
    this.quietA = 0; this.smear = 0; this.look = { sat: 1, vig: 0.3, spread: 0 };
    this.frameStep = 0; this.simSpeed = 1; this.bots = {}; this.hitbox = false; this.speedAcc = 0;
    this.ekgT = 0; this.heartT = 0; this.tilt = { x: 0, z: 0 }; this.mouseOn = false; this.camX = 0; this.camXTarget = 0;
  }
  async build(ctx) {
    const { engine } = ctx;
    const seats = this.opts.seats ? this.opts.seats.length : (this.def.seats ?? 1);
    const cheats = this.opts.demo ? { god: true, infComposure: true, unlimitedMistakes: true, freezeClock: true } : { ...(app.flags.cheats ?? {}) };
    if (this.opts.state) this.sim = this.opts.state;
    else {
      this.sim = this.opts.resume ?? createOp(this.def, { seed: this.opts.seed ?? app.urlFlags.seed ?? 1, seats, difficulty: this.opts.difficulty ?? app.save.difficulty ?? 'resident', stage: this.opts.stage ?? 0, cheats, cfg: app.config, retried: !!this.opts.retried, gifts: this.opts.gifts ?? null });
      if (this.opts.demo) this.sim.saves = 99;
    }
    // Lighting: warm surgical. Much more washes the tissue out.
    engine.setSunDirection([0.25, 1, 0.35]);
    engine.sun.intensity = 0.9; engine.ambient.color.setHex(0xfff0e0); engine.ambient.intensity = 0.55;
    ctx.scene.background = new THREE.Color(0x0a0a10);
    this.lamp = ctx.lights.request({ position: [0, 5.2, 0.4], intensity: 3.6, radius: 15, color: 0xfff6e0 });
    this.field = new FieldView(ctx, this.def.arena, this.sim.tables.length, this.opts.seed ?? 5);
    const shared = (this.opts.seats || this.opts.net) && this.sim.seats.length > 1; // gloves follow the seat
    this.hands = this.sim.seats.map((s, i) => new HandView(ctx, this.field, i, shared ? PLAYER_GLOVES[i] : undefined));
    this.strains = new StrainViews(ctx, this.field);
    this.hud = new OpHud(app, ctx);
    this.fx = new Fx(ctx, this.field, app);
    for (const s of this.sim.seats) { this.tips[s.i] = { x: s.x, z: s.z, tool: s.tool, table: s.table, wheelHeld: false, lastMouse: 0, giftLatch: false, flickT: 0 }; }
    this.ghosts = [];
    this.loops = {
      drain: ctx.audio.loop('drainLoop', { volume: 0 }), gel: ctx.audio.loop('gelLoop', { volume: 0 }), laser: ctx.audio.loop('laserLoop', { volume: 0 }), scan: ctx.audio.loop('scanLoop', { volume: 0 }), drone: ctx.audio.loop('drone', { volume: 0 }),
    };
    // comm bust, for a real 3D face in the strip
    this.commBusts = {};
    this.bustBack = new Mesh(new BoxGeometry(0.34, 0.34, 0.01), new MeshBasicMaterial({ color: 0x1a1f2b }));
    ctx.scene.add(this.bustBack);
    app.devices.hideCursor = true;
    app.director?.play(this.sim.music);
    if (this.opts.net) this.opts.net.attach(this);
    app.applyLook(1, 0.3, 0);
    // Cameras: dive from above.
    this.updateCamera(ctx, 0);
  }
  fresh() { return new OperationStage({ ...this.opts, resume: null }); }
  fingerprint() { return hashSim(this.sim); }
  onReady(ctx) { this.mouseOn = app.devices.last !== 'pad'; void ctx; }
  status() { const s = this.sim; return `${s.opId} stage=${s.stage} vitals=${Math.round(s.tables[0].vitals)} t=${Math.round(s.clock)} score=${s.score} phase=${s.phase}`; }
  dispose() { app.devices.hideCursor = false; this.opts.net?.detach?.(); }

  /* ---- input ---- */
  /** One-shot presses: read once per rendered frame, in update, and handed to the next sim step. */
  readEdges(ctx, seat, bind, dt) {
    const tip = this.tips[seat.i], input = ctx.input, devs = app.devices, sim = this.sim;
    const useKbm = bind.device === 'kbm' || bind.device === 'auto';
    const usePad = typeof bind.device === 'number' || bind.device === 'auto';
    const pad = usePad ? (typeof bind.device === 'number' ? devs.pads[bind.device] : devs.pads.find(Boolean)) : null;
    const p = (tip.pending ??= {});
    const current = () => p.tool ?? seat.tool;
    const choose = (t) => { tip.prevTool = current(); p.tool = t; this.hud.wheelT = 1; };
    const pickSlot = (i) => { const t = toolAtSlot(i); if (t && sim.tools.includes(t)) { if (t !== current()) { choose(t); ctx.audio.play('uiMove'); } else this.hud.wheelT = 1; } else if (t) ctx.audio.play('tick'); };
    const lastTool = () => { if (tip.prevTool && sim.tools.includes(tip.prevTool)) choose(tip.prevTool); };
    const stepTable = (d) => { const n = sim.tables.length, from = p.table ?? seat.table; p.table = (from + d + n) % n; };
    const rotating = seat.grab != null && sim.ents.find((e) => e.id === seat.grab)?.goal?.[2] != null;
    if (pad) {
      const hit = (b) => pad.buttons[b] > 0.5 && !(pad.prev[b] > 0.5);
      if (hit(BTN.CIRCLE)) p.drop = true;
      if (hit(BTN.R1)) lastTool();
      if (hit(BTN.SQUARE) && sim.tools.includes('syringe')) choose('syringe');
      if (hit(BTN.LEFT)) stepTable(-1);
      if (hit(BTN.RIGHT)) stepTable(1);
      if (hit(BTN.TRIANGLE)) { if (sim.tagOn) p.tag = true; else this.hud.prompt(this.def.patient.objective); }
      if (!rotating) {
        const slot = flickSlot(deadzone(pad.axes[2] ?? 0), deadzone(pad.axes[3] ?? 0));
        if (slot >= 0) { if (slot !== tip.flick) { pickSlot(slot); tip.flick = slot; this.hud.wheelSlot = slot; } this.hud.wheelT = 1; } else { tip.flick = -1; this.hud.wheelSlot = -1; }
      }
    }
    if (useKbm) {
      if (input.wasPressed('MouseRight', 'KeyK')) p.drop = true;
      for (let i = 1; i <= 8; i++) if (input.wasPressed(`Digit${i}`)) pickSlot(i - 1);
      if (rotating) { if (input.wheel) p.rot = (p.rot ?? 0) + Math.sign(input.wheel) * 3; } else {
        if (input.wasPressed('KeyQ')) lastTool();
        if (input.wheel) { const list = TOOLS.filter((t) => sim.tools.includes(t)); const at = list.indexOf(current()); choose(list[(at + Math.sign(input.wheel) + list.length) % list.length]); ctx.audio.play('uiMove'); }
        if (input.wasPressed('KeyE')) { if (sim.tagOn) p.tag = true; else this.hud.prompt(this.def.patient.objective); }
      }
      if (input.wasPressed('KeyF') && sim.tools.includes('syringe')) choose('syringe');
      if (input.wasPressed('Tab')) stepTable(1);
      // clicks on the wheel and table tabs
      const click = devs.click(input);
      if (click) {
        for (const h of this.hud.tabHit) if (click.x >= h.x && click.x <= h.x + h.w && click.y >= h.y && click.y <= h.y + h.h) { p.table = h.i; tip.wheelClick = 0.2; }
        for (const h of this.hud.wheelHit ?? []) if (click.x >= h.x && click.x <= h.x + h.w && click.y >= h.y && click.y <= h.y + h.h) { pickSlot(h.i); tip.wheelClick = 0.2; }
      }
      if (tip.wheelClick > 0) tip.wheelClick -= dt;
    }
  }
  /** What's held, for this sim step, plus any one-shot presses waiting from the last frame. */
  readSeat(ctx, seat, bind, dt) {
    const tip = this.tips[seat.i], input = ctx.input, devs = app.devices;
    const out = { x: tip.x, z: tip.z, tool: seat.tool, use: 0, gift: false, steady: false, drop: false, rot: 0, padL: false, padR: false, table: seat.table };
    const useKbm = bind.device === 'kbm' || bind.device === 'auto';
    const usePad = typeof bind.device === 'number' || bind.device === 'auto';
    const pad = usePad ? (typeof bind.device === 'number' ? devs.pads[bind.device] : devs.pads.find(Boolean)) : null;
    let sx = 0, sz = 0, steady = false, use = 0, gift = false, rot = 0;
    const rotating = seat.grab != null && this.sim.ents.find((e) => e.id === seat.grab)?.goal?.[2] != null;
    const p = tip.pending;
    if (p) {
      if (p.tool) out.tool = p.tool;
      if (p.table != null) out.table = p.table;
      if (p.tag) out.tag = true;
      if (p.drop) out.drop = true;
      if (p.rot) rot += p.rot;
      tip.pending = null;
    }
    if (pad) {
      const on = (b) => pad.buttons[b] > 0.5;
      sx += deadzone(pad.axes[0] ?? 0); sz += deadzone(pad.axes[1] ?? 0);
      use = Math.max(use, pad.buttons[BTN.R2] ?? 0, on(BTN.CROSS) ? 1 : 0);
      steady = steady || on(BTN.L1);
      const l2 = (pad.buttons[BTN.L2] ?? 0) > 0.3, r2 = (pad.buttons[BTN.R2] ?? 0) > 0.3;
      gift = gift || l2;
      if (l2) out.padL = true; if (r2) out.padR = true;
      if (rotating) rot += deadzone(pad.axes[2] ?? 0);
    }
    if (useKbm) {
      if (input.isDown('KeyD', 'ArrowRight')) sx += 1; if (input.isDown('KeyA', 'ArrowLeft')) sx -= 1;
      if (input.isDown('KeyS', 'ArrowDown')) sz += 1; if (input.isDown('KeyW', 'ArrowUp')) sz -= 1;
      if (input.isDown('ShiftLeft', 'ShiftRight')) steady = true;
      const mL = input.isDown('MouseLeft'), mR = input.isDown('MouseRight'), kJ = input.isDown('KeyJ'), kK = input.isDown('KeyK');
      if (mL || kJ) { use = 1; out.padL = true; }
      if (mR || kK) out.padR = true;
      if (input.isDown('Space')) gift = true;
      if (rotating) { if (input.isDown('KeyQ')) rot -= 1; if (input.isDown('KeyE')) rot += 1; }
      if (tip.wheelClick > 0) use = 0;
      // mouse: the tip follows exactly, on the surface not a plane
      if (devs.pointerMoved || (this.mouseOn && (mL || mR))) this.mouseOn = true;
      if (sx || sz) this.mouseOn = false;
      if (this.mouseOn && input.pointer.over !== false) this.mouseToTip(ctx, tip, seat);
    }
    if (pad && (Math.abs(sx) > 0 || Math.abs(sz) > 0)) this.mouseOn = false;
    const cfg = app.config;
    const assist = (AIM[app.settings.aim] ?? 1) * cfg.aimAssist;
    if (sx || sz) {
      const near = assist > 0 && nearTarget(this.sim, seat, tip.x, tip.z);
      integrateTip(tip, sx, sz, { speed: cfg.cursorSpeed * (app.settings.cursor ?? 1), steady, steadyFactor: cfg.steadyFactor, assist, near, stroke: assist > 0 ? strokeDir(this.sim, seat) : null, dt });
    }
    if (app.settings.giftToggle) {
      if (gift && !tip.giftPrev) tip.giftLatch = !tip.giftLatch;
      tip.giftPrev = gift;
      gift = tip.giftLatch;
    }
    out.x = tip.x; out.z = tip.z; out.use = use; out.gift = gift; out.steady = steady; out.rot = rot;
    // Rumble follows the tool.
    if (use > 0.15 && pad) this.toolRumble(seat, pad, use);
    return out;
  }
  toolRumble(seat, pad, use) {
    const f = this.ctx0Frame = (this.ctx0Frame ?? 0) + 1;
    if (f % 6) return;
    const R = { drain: [0.06, 0.2 * use], gel: [0, 0.1], laser: [0.03, 0.26], scalpel: [0.1, 0.06], suture: [0, 0.05], scanner: [0, 0.04], forceps: [0.12, 0.06], syringe: [0, 0.06] }[seat.tool];
    if (R) app.devices.rumble(pad.index, R[0], R[1], 90, app.settings.rumble && !app.demo);
  }
  mouseToTip(ctx, tip, seat) {
    const p = ctx.input.pointer;
    ctx.camera.rayAt(p.x, p.y, o, d);
    const offset = seat.table * TABLE_GAP;
    let y = 0, x = 0, z = 0;
    for (let i = 0; i < 4; i++) { const t = (y - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = heightAt(this.def.arena, x - offset, z, this.field.beat, this.field.breath); }
    tip.x = Math.max(-7.4, Math.min(7.4, x - offset));
    tip.z = Math.max(-4, Math.min(3.6, z));
  }

  gather(ctx, dt) {
    const sim = this.sim;
    const inputs = [];
    for (const seat of sim.seats) {
      const bind = this.seatBind[seat.i] ?? { device: 'bot', skill: 0.75 };
      if (bind.device === 'bot' || (this.def.partnerBot && seat.i === 1 && !this.opts.seats) || this.opts.demo || this.botOn) {
        const key = seat.i;
        this.bots[key] ??= createBot(key, this.opts.demo ? 0.92 : (seat.i === 0 ? (this.botSkill ?? 0.8) : 0.75), { cheat: !!this.opts.demo, zone: this.def.partnerBot ? (seat.i === 0 ? 'right' : 'left') : null });
        if (seat.i === 0 && this.botSkill != null) this.bots[key].skill = this.botSkill;
        const b = botInput(sim, this.bots[key]);
        inputs[seat.i] = b; this.tips[seat.i].x = b.x; this.tips[seat.i].z = b.z;
      } else inputs[seat.i] = this.readSeat(ctx, seat, bind, dt);
    }
    return inputs;
  }

  collectEdges(ctx, dt) {
    if (this.opts.demo || this.botOn) return;
    if (this.opts.net) {
      const seat = this.sim.seats[this.opts.net.mySeat];
      if (seat && !this.opts.net.server && window.AIHub.time() >= 0) this.readEdges(ctx, seat, { device: 'auto' }, dt);
      return;
    }
    for (const seat of this.sim.seats) {
      const bind = this.seatBind[seat.i];
      if (!bind || bind.device === 'bot' || (this.def.partnerBot && seat.i === 1 && !this.opts.seats)) continue;
      this.readEdges(ctx, seat, bind, dt);
    }
  }

  /* ---- fixed step ---- */
  fixedUpdate(ctx, dt) {
    if (this.opts.net) { this.opts.net.fixed?.(ctx, dt, this); return; }
    if (this.paused || this.fail || this.ended) return;
    if (this.intro > 0) return;
    if (this.frameStep > 0) this.frameStep--; else if (this.frameFreeze) return;
    this.speedAcc += this.simSpeed;
    const inputs = this.gather(ctx, dt);
    while (this.speedAcc >= 1) {
      this.speedAcc -= 1;
      step(this.sim, inputs);
      for (const i of inputs) if (i) { if (i.tag) i.tag = false; i.drop = false; }
    }
    this.frameInputs = inputs;
  }

  /* ---- per frame ---- */
  update(ctx, dt) {
    const devs = app.devices;
    devs.poll(ctx, dt);
    const sim = this.net?.state ?? this.sim;
    if (this.opts.demo) { this.updateDemo(ctx, dt); if (this.exited) return; }
    else if (!this.opts.net) {
      if (this.pause) {
        this.pause.update(ctx, dt);
        this.pause?.draw(ctx);
        this.hud.updateComm(0, ctx.audio);
        this.updateCamera(ctx, 0);
        this.silenceLoops();
        return;
      }
      if (this.fail) { this.field.update(sim, dt * 0.2); this.fail.update(ctx, dt); this.fail?.draw(ctx, dt); this.silenceLoops(); return; }
      if (devs.nav.pause && !this.ended && this.intro <= 0) { this.openPause(ctx); return; }
    }
    if (this.intro > 0) this.intro -= dt;
    else this.collectEdges(ctx, dt);
    const events = this.opts.net ? this.opts.net.drain() : drainEvents(sim);
    this.handleEvents(ctx, events, dt, sim);
    this.field.update(sim, dt);
    this.strains.update(sim, dt);
    // Draw hands, one per seat, on their tips.
    const mine = this.opts.net?.mySeat ?? 0;
    sim.seats.forEach((seat, i) => {
      const h = this.hands[i];
      if (!h) return;
      h.update(seat, dt, sim);
      h.setVisible(!seat.out);
    });
    this.updateGhosts(ctx, sim, dt);
    this.updateMood(ctx, sim, dt);
    this.updateCamera(ctx, dt, sim, mine);
    this.updateBust(ctx, dt);
    this.updateSound(ctx, sim, dt);
    // Bot view: dev action stays cheap
    const tipOf = sim.seats[mine] ?? sim.seats[0];
    this.hud.wheelT = Math.max(0, this.hud.wheelT - dt);
    this.drawHud(ctx, sim, dt, tipOf);
    this.fx.update(dt);
    if (sim.phase === 'won' || sim.phase === 'lost') this.onEnd(ctx, sim, dt);
    if (this.hitbox) this.drawHitbox(ctx, sim);
  }
  drawHud(ctx, sim, dt, seat) {
    const hud = ctx.hud;
    this.hud.draw(sim, dt, null, { objective: this.def.patient.objective, mySeat: seat.i, def: this.def });
    const mark = sim.hint;
    if (mark && !sim.noHint && (sim.phase === 'play')) {
      const p = this.toScreen(mark.x + seat.table * TABLE_GAP, this.field.surface(mark.x, mark.z) + 0.4, mark.z);
      const y = p.y - 10 + Math.sin(this.field.t * 6) * 2;
      hud.sprite(Math.round(p.x) - 4, Math.round(y), ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'], { x: 0xffd24d });
    }
    // Pulse the valid targets softly.
    const pulse = Math.floor(this.field.t * 3) % 2;
    if (sim.phase === 'play') for (const e of validTargets(sim, seat.tool, seat.table)) {
      const [ax, az] = aimPoint(e);
      const p = this.toScreen(ax + seat.table * TABLE_GAP, this.field.surface(ax, az) + 0.2, az), x = Math.round(p.x), y = Math.round(p.y), r = pulse ? 11 : 9;
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { hud.rect(x + cx * r - (cx > 0 ? 2 : 0), y + cz * r, 3, 1, 0xffffff); hud.rect(x + cx * r, y + cz * r - (cz > 0 ? 2 : 0), 1, 3, 0xffffff); }
      if (e.heat > 0) { hud.rect(x - 10, y - 15, 20, 3, 0x1a1f2b); hud.rect(x - 10, y - 15, Math.round(20 * e.heat), 3, 0xff8a4d); }
    }
    // Cut guides on the crown: drawn over the plates, since the paint lies under them.
    for (const e of sim.ents) {
      if (e.k !== 'incision' || e.look !== 'plateCut' || e.table !== seat.table) continue;
      const a = e.pts[0], z = e.pts[e.pts.length - 1];
      const n = 10; for (let i = 0; i <= n; i++) { if ((i + Math.floor(this.field.t * 8)) % 2) continue; const k = i / n, x = a[0] + (z[0] - a[0]) * k, w = a[1] + (z[1] - a[1]) * k; const q = this.toScreen(x + seat.table * TABLE_GAP, this.field.surface(x, w) + 0.3, w); hud.rect(Math.round(q.x), Math.round(q.y), 2, 2, 0xffffff); }
    }
    // The syringe's draw gauge, and the steady marker.
    const tp = this.toScreen(seat.x + seat.table * TABLE_GAP, this.field.surface(seat.x, seat.z), seat.z);
    if (seat.tool === 'syringe' && seat.drawing > 0) { hud.rect(Math.round(tp.x) + 8, Math.round(tp.y) - 12, 4, 16, 0x1a1f2b); hud.rect(Math.round(tp.x) + 8, Math.round(tp.y) + 4 - Math.round(16 * seat.drawing), 4, Math.round(16 * seat.drawing), seat.drawing >= 1 ? 0x7fffa0 : 0xff9ab0); }
    if (sim.heart && sim.phase === 'play') { const sys = sim.heart.phase < 0.35, r = sys ? 16 : 12; hud.rect(Math.round(tp.x) - r, Math.round(tp.y) - r, 2, 2, sys ? 0xff3a3a : 0x7fffa0); hud.rect(Math.round(tp.x) + r, Math.round(tp.y) - r, 2, 2, sys ? 0xff3a3a : 0x7fffa0); hud.rect(Math.round(tp.x) - r, Math.round(tp.y) + r, 2, 2, sys ? 0xff3a3a : 0x7fffa0); hud.rect(Math.round(tp.x) + r, Math.round(tp.y) + r, 2, 2, sys ? 0xff3a3a : 0x7fffa0); }
    // Seat icons in co-op
    if (sim.seats.length > 1) sim.seats.forEach((s) => {
      const p = this.toScreen(s.x + s.table * TABLE_GAP, this.field.surface(s.x, s.z) + 0.2, s.z);
      const col = (this.opts.net?.colors?.[s.i]) ?? [0x57c7ff, 0xff6b6b, 0x7fffa0, 0xffd24d][s.i];
      hud.rect(Math.round(p.x) + 5, Math.round(p.y) - 8, 3, 3, col);
      const icon = TOOL_ICONS[s.tool];
      if (icon) { hud.rect(Math.round(p.x) + 8, Math.round(p.y) - 13, 14, 13, 0x0d0b14); hud.sprite(Math.round(p.x) + 9, Math.round(p.y) - 12, icon.rows, icon.colors); }
    });
    if (sim.seats.length > 1 && !this.opts.net && (this.opts.seats)) this.hud.drawSeatWheels(sim, sim.seats, [0x57c7ff, 0xff6b6b, 0x7fffa0, 0xffd24d]);
    // Prompts strip (bottom-left over the strip, right of the bust)
    if (!this.opts.demo && !this.opts.net && sim.phase === 'play') {
      // Keep it short: only when nothing's being said.
      if (!this.hud.current && !this.hud.comm.length && !sim.voiceOff) app.prompts.strip(hud, 36, hud.height - 11, [['use', 'USE'], ['drop', 'DROP'], ['steady', 'STEADY'], ...(sim.giftOn ? [['gift', sim.seats[0].gift === 'look' ? 'LOOK' : 'QUIET']] : []), ['pause', 'PAUSE']]);
    }
    // Draw any overlay from net
    this.opts.net?.drawOverlay?.(ctx, sim);
  }
  toScreen(x, y, z) {
    const cam = this.ctx?.camera?.camera ?? app.ctx.camera.camera, hud = app.ctx.hud;
    proj.set(x, y, z).project(cam);
    return { x: ((proj.x + 1) / 2) * hud.width, y: ((1 - proj.y) / 2) * hud.height };
  }
  updateCamera(ctx, dt, sim = this.sim) {
    const seat = sim.seats[this.opts.net?.mySeat ?? 0] ?? sim.seats[0];
    this.camXTarget = seat.table * TABLE_GAP;
    this.camX += (this.camXTarget - this.camX) * Math.min(1, dt * 7);
    const asp = ctx.hud.width / ctx.hud.height, zoom = Math.max(1, (16 / 9) / asp);
    this.tilt.x += ((seat.x / 8) * 0.25 - this.tilt.x) * Math.min(1, dt * 3);
    this.tilt.z += ((seat.z / 5) * 0.25 - this.tilt.z) * Math.min(1, dt * 3);
    const f = Math.max(0, this.intro) / 1.1, e = f * f;
    const px = this.camX + this.tilt.x, py = 9.6 * zoom + e * 8, pz = 3.1 * zoom + this.tilt.z + e * 7;
    setView(ctx, [px, py, pz], [this.camX + this.tilt.x * 0.5, 0, 0.1 + this.tilt.z * 0.3], 44);
    this.lamp.position.set(this.camX, 5.2, 0.4);
  }
  updateMood(ctx, sim, dt) {
    const target = sim.quiet ? 1 : 0;
    this.quietA += (target - this.quietA) * Math.min(1, dt * 6);
    this.smear = Math.max(0, this.smear - dt * 1.5);
    const sat = 1 - this.quietA * 0.75, vig = 0.3 + this.quietA * 0.65, spread = this.smear * 0.02;
    const L = this.look;
    if (Math.abs(L.sat - sat) + Math.abs(L.vig - vig) + Math.abs(L.spread - spread) > 0.004) { L.sat = sat; L.vig = vig; L.spread = spread; app.applyLook(sat, vig, spread); }
    // lamp flicker below 15
    const v = sim.tables[sim.seats[0].table]?.vitals ?? 50;
    this.lamp.intensity = v < 15 && !app.settings.reduceFlash ? 3.6 - (Math.floor(this.field.t * 13) % 3 === 0 ? 2.2 : 0) : 3.6;
  }
  updateBust(ctx, dt) {
    const comm = this.hud.current;
    const who = comm?.who ?? null;
    if (who && !this.commBusts[who]) { this.commBusts[who] = new BustView(ctx, who); const r = this.commBusts[who].root; r.scale.setScalar(0.13); }
    const cam = ctx.camera.camera;
    const hud = ctx.hud, asp = hud.width / hud.height, D = 2, hh = Math.tan((44 * Math.PI) / 360) * D, hw = hh * asp;
    const nx = -1 + (17 / hud.width) * 2, ny = -1 + (15 / hud.height) * 2;
    for (const [id, b] of Object.entries(this.commBusts)) {
      const on = id === who;
      b.root.visible = on;
      if (!on) continue;
      b.update(dt);
      if (comm.talk > 0) b.talk(0.8);
      const m = /[!*]/.test(comm.text) ? (id === 'ilya' ? 'panic' : 'angry') : id === 'ilya' ? 'neutral' : 'stern';
      if (b.emotion !== m) b.setEmotion(m);
      b.root.position.set(nx * hw, ny * hh - 0.14, -D);
      cam.localToWorld(b.root.position);
      b.root.quaternion.copy(cam.quaternion);
    }
    this.bustBack.visible = !!who;
    this.bustBack.position.set(nx * hw, ny * hh, -D - 0.1);
    cam.localToWorld(this.bustBack.position);
    this.bustBack.quaternion.copy(cam.quaternion);
  }
  updateGhosts(ctx, sim, dt) {
    if (sim.ghost) {
      sim.seats.forEach((s, i) => {
        const tr = sim.ghost.seats[i];
        if (!tr) return;
        const k = sim.ghost.i * 3;
        if (k + 1 >= tr.length) return;
        this.ghosts[i] ??= (() => { const g = new HandView(ctx, this.field, i); g.setGhost(); return g; })();
        this.ghosts[i].setVisible(true);
        this.ghosts[i].update({ x: tr[k], z: tr[k + 1], tool: s.tool, table: s.table, useHeld: !!tr[k + 2], drawing: 0, grab: null }, dt, sim);
      });
    } else this.ghosts.forEach((g, i) => { if (i !== 9) g?.setVisible(false); });
    if (sim.mimic?.x != null) {
      this.mimicHand ??= (() => { const g = new HandView(ctx, this.field, 0); g.setGhost(); return g; })();
      this.mimicHand.setVisible(true);
      this.mimicHand.update({ x: sim.mimic.x, z: sim.mimic.z, tool: sim.seats[0].tool, table: 0, useHeld: !!sim.mimic.use, drawing: 0, grab: null }, dt, sim);
    } else this.mimicHand?.setVisible(false);
  }
  silenceLoops() { for (const v of Object.values(this.loops)) v.set({ volume: 0 }); }
  updateSound(ctx, sim, dt) {
    const L = this.loopOn;
    const vol = (name, on, v = 1) => this.loops[name]?.set({ volume: on ? v : 0 });
    const seat = sim.seats[this.opts.net?.mySeat ?? 0] ?? sim.seats[0];
    vol('drain', L.drain, 0.9); this.loops.drain?.set({ pitch: seat.useHeld ? 2 : 0 });
    vol('gel', L.gel, 0.8); vol('laser', L.laser, 0.8); vol('scan', seat.tool === 'scanner' && seat.useHeld, 0.8); vol('drone', sim.quiet, 1);
    this.loopOn = {};
    // EKG beep: rate and pitch follow vitals
    const v = sim.tables[seat.table]?.vitals ?? 50;
    if (sim.phase === 'play' && !sim.voiceOff) {
      this.ekgT -= dt * (sim.quiet ? 0.25 : 1);
      if (this.ekgT <= 0) { this.ekgT = v < 30 ? 0.42 : v < 60 ? 0.7 : 0.95; ctx.audio.play(v < 30 ? 'beepLow' : 'beep', { pitch: v < 30 ? 2 : 0 }); }
    }
    if (sim.quiet) { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 0.9; ctx.audio.play('heartbeat'); app.rumble(0.4, 0.1, 120); } }
    app.director?.update(dt, sim.phase === 'play' ? v : null, sim.music);
  }
  handleEvents(ctx, events, dt, sim) {
    const audio = ctx.audio;
    for (const e of events) {
      switch (e.t) {
        case 'say': this.hud.say(e.who, e.text); break;
        case 'prompt': this.hud.prompt(e.text); audio.play('reveal'); break;
        case 'sfx': if (e.id === 'tick') audio.play('tick'); else if (e.id) audio.play(e.id, { pan: e.x ? Math.max(-0.7, Math.min(0.7, e.x / 8)) : 0 }); break;
        case 'loop': if (e.on) this.loopOn[e.id] = true; break;
        case 'beam': this.loopOn.laser = true; if (e.on) { this.fx.smoke(e.x + e.table * TABLE_GAP, this.field.surface(e.x, e.z), e.z); } break;
        case 'scan': break;
        case 'rate': { const p = this.toScreen(e.x + (sim.seats[e.seat]?.table ?? 0) * TABLE_GAP, this.field.surface(e.x, e.z) + 0.5, e.z); this.hud.rating(e.r, p.x, p.y, e.pts, e.streak); audio.play(e.r === 'CLEAN' ? 'rateClean' : e.r === 'GOOD' ? 'rateGood' : e.r === 'SLOPPY' ? 'rateSloppy' : 'rateMistake', { pitch: e.r === 'CLEAN' ? Math.min(12, (e.streak ?? 0)) : 0 }); if (e.r === 'MISTAKE') { app.shake(0.5); app.rumble(0.8, 0.5, 220); app.flash('red', { duration: 0.1 }); } if (e.r === 'CLEAN' && e.streak % 5 === 0 && e.streak > 0 && !sim.voiceOff) this.hud.say('reyes', LINE_CLEAN[(e.streak / 5) % LINE_CLEAN.length]); break; }
        case 'stitch': audio.play('stitch', { pitch: (e.n ?? 0) * 1.2 }); this.fx.sparkAt(e.x + (e.table ?? 0) * TABLE_GAP, this.field.surface(e.x, e.z), e.z); app.rumble(0, 0.3, 40); break;
        case 'cutting': if (Math.floor(this.field.t * 18) !== this.lastSlice) { this.lastSlice = Math.floor(this.field.t * 18); audio.play('slice'); this.fx.blood(e.x + (e.table ?? 0) * TABLE_GAP, this.field.surface(e.x, e.z), e.z, 2); } break;
        case 'done': this.fx.done(e, sim); break;
        case 'dish': this.fx.toDish(e, sim.seats[e.seat]?.table ?? 0); this.dishN = ((this.dishN ?? 0) + 1) % 4; audio.play('tink', { pitch: this.dishN - 1 }); app.rumble(0.2, 0.2, 60); break;
        case 'placed': this.field.addPlaced(e); app.rumble(0.4, 0.2, 70); app.shake(0.1); break;
        case 'pinkUp': this.field.pinkUp(); audio.play('reveal'); break;
        case 'grab': app.rumble(0.3, 0.1, 40); break;
        case 'stage': break;
        case 'music': app.director?.play(e.id); break;
        case 'quiet': if (e.on) { audio.play('inhale'); ctx.engine.screen.shockwave([0, 1, 0], { strength: 0.3 }); } break;
        case 'look': audio.play('rewind'); this.smear = 1; app.flash('plum', { duration: 0.25 }); app.rumble(0.3, 0.6, 450); this.hud.popups.length = 0; break;
        case 'codeblue': if (e.on) { audio.play('flatline'); app.flash('red', { duration: 0.2 }); app.shake(0.4); } else { audio.play('reveal'); this.hud.say('pem', 'And he is back. Rhythm is ugly but it is a rhythm.'); } break;
        case 'shock': if (e.good) { audio.play('clear'); app.flash('white', { duration: 0.16 }); ctx.engine.hitstop(0.08); app.shake(0.7); app.rumble(1, 1, 300); this.hud.say('ilya', 'CLEAR!'); } else { audio.play('shockBad'); app.shake(0.3); app.rumble(0.3, 0.1, 120); } break;
        case 'massage': if (e.on) audio.play('flatline'); break;
        case 'squeeze': audio.play('squeeze'); app.shake(0.3); app.rumble(0.7, 0.4, 120); break;
        case 'beat': app.rumble(0.25, 0, 60); break;
        case 'knock': this.fx.knock(e.x, e.z); app.shake(0.3); app.rumble(0.5, 0.2, 110); break;
        case 'strainHit': this.fx.strainHit(e); app.flash('white', { duration: 0.06 }); ctx.engine.hitstop(0.05); app.shake(0.45); app.rumble(0.8, 0.6, 180); break;
        case 'strainDead': this.fx.strainDead(e); this.strains.deathAt(e); audio.play('strainHurt', { pitch: -6 }); app.shake(0.8); app.rumble(1, 1, 500); ctx.engine.hitstop(0.1); break;
        case 'wave': app.flash('blue', { duration: 0.2 }); app.shake(0.8); app.rumble(1, 0.6, 350); break;
        case 'fx': this.storyFx(ctx, e.id); break;
        case 'table': audio.play('uiMove'); break;
        case 'tool': this.hud.wheelT = 1; break;
        case 'tag': audio.play('reveal'); this.hud.prompt(e.doctor === 'ilya' ? 'DR. MARSH: THE QUIET' : 'DR. ACHTERBERG: THE SECOND LOOK'); break;
        case 'inject': this.fx.inject(e.x + (e.table ?? 0) * TABLE_GAP, this.field.surface(e.x, e.z), e.z); break;
        case 'lowVitals': audio.play('alarm'); break;
        case 'bpm': app.director?.setBpm(e.bpm); break;
        case 'won': case 'lost': break;
        default: break;
      }
    }
    void dt;
  }
  storyFx(ctx, id) {
    if (id === 'awaken') { app.flash('white', { duration: 0.4 }); ctx.audio.stopMusic?.(); ctx.audio.play('heartbeat'); ctx.engine.screen.shockwave([0, 1, 0], { strength: 0.6 }); }
    if (id === 'truth') { app.flash('red', { duration: 0.5 }); app.shake(1); }
    if (id === 'silence') { ctx.audio.playMusic(null); }
    if (id === 'burst') { app.flash('red', { duration: 0.25 }); app.shake(0.7); }
    if (id === 'reyesBack') { ctx.audio.play('reveal'); }
  }
  openPause(ctx) { this.paused = true; this.pause = new PauseOverlay(this, ctx); ctx.audio.play('uiConfirm'); app.devices.hideCursor = false; }
  closePause() { this.paused = false; this.pause = null; app.devices.hideCursor = true; }

  /* ---- ends ---- */
  onEnd(ctx, sim, dt) {
    if (this.opts.net) return;
    if (this.opts.demo) return;
    this.endT += dt;
    if (this.ended == null) {
      this.ended = sim.phase;
      if (sim.phase === 'lost') { ctx.audio.play('flatline'); app.director?.play('sad'); this.hud.say('reyes', 'Time of death...'); this.silenceLoops(); } else { app.director?.play('results'); this.silenceLoops(); }
    }
    if (sim.phase === 'lost' && this.endT > 1.2 && !this.fail) {
      this.fail = new MenuFail(this, ctx);
      app.devices.hideCursor = false;
    }
    if (sim.phase === 'won' && this.endT > 1.4 && !this.leaving) {
      this.leaving = true;
      this.opts.onWin?.(results(sim, this.def), sim);
    }
  }
  /** Retry from this stage: rank capped at B. */
  retryStage() {
    const cp = this.sim.checkpoint;
    if (!cp) { this.restart(); return; }
    const copy = structuredClone(cp);
    Object.assign(copy, { cfg: app.config, events: [], ring: [], checkpoint: cp, meta: this.sim.meta ?? {}, retried: true, checkpointStage: this.sim.checkpointStage });
    go(new OperationStage({ ...this.opts, resume: copy, stage: 0, retried: true }));
  }
  restart() { go(new OperationStage({ ...this.opts, resume: null, stage: 0, retried: false, difficulty: this.nextDifficulty ?? this.opts.difficulty })); }

  updateDemo(ctx, dt) {
    this.demoT = (this.demoT ?? 0) + dt;
    if (app.devices.anyInput && this.demoT > 0.3) { this.exited = true; app.exitAttract?.(); return; }
    if (this.demoT > (this.opts.demo.secs ?? 25) || this.sim.phase === 'won' || this.sim.phase === 'lost') { this.exited = true; app.nextAttract?.(); }
  }
  drawHitbox(ctx, sim) {
    const hud = ctx.hud;
    for (const e of sim.ents) {
      const p = this.toScreen(e.x + (e.table ?? 0) * TABLE_GAP, this.field.surface(e.x, e.z), e.z);
      hud.rect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3, 0x7fff00);
      hud.text(Math.round(p.x) + 3, Math.round(p.y) - 3, `${e.id}:${e.k}`, { color: 0x7fff00 });
    }
  }
}
const LINE_CLEAN = ["...Adequate. Don't let it go to your head. It's not attached to anything useful.", 'Fine. Do it again, so I know it was not an accident.', 'Hm. Someone taught you something.'];
void PALETTE; void setLookLayer; void buildModel; void cloneState; void defOf; void dev;
