// Lane staging: up to 4 mats in a row, each with its own driver (local, bot, pad or ghost), a Dot and an avatar.
import { ActivityBase } from './base.js';
import { Dot } from '../../core/dot.js';
import { LocalDriver, BotDriver, PadDriver, GhostDriver, blank } from '../../core/drivers.js';
import { T } from '../../core/tunables.js';
import { makeAvatar, PLAYER_LOOKS, NPC_LOOKS, clipNames } from '../../art/avatar.js';
import { place, tileFloor, slab } from '../../art/world.js';
import { disc, ring, line, panel } from '../../ui/widgets.js';
import { say } from '../../ui/font.js';
import { BARKS, pick } from '../../data/lines.js';
import { THREE, buildModel, PALETTE, toonMaterial, glowMaterial, SpringChain } from '../../../pixel-engine.js';
import { MODELS } from '../../art/models.js';
import { norm as norm2 } from '../../core/medley.js';

const SEAT_COLORS = ['red', 'blue', 'green', 'sand'];
export function laneCamera(n = 3, aspect = null) {
  aspect ??= (typeof innerWidth !== 'undefined' && innerHeight ? innerWidth / innerHeight : 16 / 9);
  const f = Math.max(1, (16 / 9) / aspect);
  const cfg = n >= 4 ? { position: [0, 3, 9.5], target: [0, 1, 0], fov: 32 } : { position: [0, 2.3, 8.2], target: [0, 1.15, 0], fov: 30 };
  const t = cfg.target, p = cfg.position;
  return { preset: 'fixed', fov: cfg.fov, target: t, position: [t[0] + (p[0] - t[0]) * f, t[1] + (p[1] - t[1]) * f, t[2] + (p[2] - t[2]) * f] };
}
export const matXs = (n) => (n >= 4 ? [-3, -1, 1, 3] : n === 3 ? [-2.2, 0, 2.2] : n === 2 ? [-1.1, 1.1] : [0]);
const V = new THREE.Vector3();

export class LaneActivity extends ActivityBase {
  /** Lane definitions: args.lanes = [{ kind, skill?, name?, look?, pad? }], else solo staging. */
  laneSpecs() {
    if (this.args.lanes) return this.args.lanes;
    return [{ kind: 'bot', skill: 'sloppy', name: 'Dennis', look: 'dennis' }, { kind: 'local', name: this.S?.name ?? 'You', look: this.S ? PLAYER_LOOKS[this.S.avatar ?? 0] : PLAYER_LOOKS[0] }, { kind: 'bot', skill: 'good', name: 'June', look: 'june' }];
  }
  get n() { return this.lanes.length; }
  get me() { return this.lanes.find((l) => l.kind === 'local') ?? this.lanes.find((l) => l.kind === 'pad') ?? this.lanes[0]; }
  get multi() { return this.lanes.filter((l) => l.kind === 'local' || l.kind === 'pad').length > 1; }
  camera = null;
  async stage(ctx) {
    const specs = this.laneSpecs();
    this.camera = laneCamera(Math.max(3, specs.length));
    const xs = matXs(specs.length);
    this.lanes = [];
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i], r = ctx.random.fork('lane' + i);
      const dot = new Dot(() => r.range(0, 1));
      let driver;
      if (sp.kind === 'local') driver = this.skill ? new BotDriver(this.skill, () => r.range(0, 1)) : new LocalDriver(this.app);
      else if (sp.kind === 'pad') driver = new PadDriver(sp.pad ?? 0);
      else if (sp.kind === 'ghost') driver = new GhostDriver();
      else driver = new BotDriver(sp.skill ?? 'average', () => r.range(0, 1));
      const look = typeof sp.look === 'string' ? NPC_LOOKS[sp.look] : (sp.look ?? PLAYER_LOOKS[i % 6]);
      const avatar = await makeAvatar(ctx, look);
      avatar.setPos(xs[i], 0, 0.8, 0); avatar.addTo(ctx.scene); avatar.play('Idle');
      const lane = { idx: i, pid: sp.pid, x: xs[i], kind: sp.kind, driver, dot, avatar, name: sp.name ?? `P${i + 1}`, skill: sp.skill, inp: blank(), st: {}, score: 0, seat: sp.seat ?? i, left: false, color: SEAT_COLORS[sp.seat ?? i] };
      if (sp.kind === 'bot' || (sp.kind === 'local' && this.skill)) lane.driver.skill = sp.skill ?? this.skill ?? 'average';
      this.lanes.push(lane);
    }
    this.classroom(ctx, xs);
    if (this.app.net && this.medley) this.app.net.begin(() => this.netState());
    this.coach = await makeAvatar(ctx, NPC_LOOKS.coach); this.coach.setPos(-3.9, 0.3, -0.5, 0.45); this.coach.addTo(ctx.scene); this.coach.play('Idle');
    this.coach.shadow.place(-3.9, 0.3, -0.5, 0);
    await this.stageExtra?.(ctx, xs);
  }
  classroom(ctx, xs) {
    tileFloor(ctx, 22, 12, [0, 0.0, 0]);
    place(ctx, 'dais', [-3.9, 0, -0.5], { scale: 0.55 });
    for (const x of xs) place(ctx, 'yoga-mat', [x, 0.0, 0.8], { palette: { mat: ['teal', 'sky', 'cyan', 'lime'][xs.indexOf(x) % 4] } });
    // backdrop: pavilion roof, palms, sea
    place(ctx, 'pavilion', [0, 0, -14], { scale: 1.5 });
    for (const [x, z, h] of [[-8, -4, 5], [8, -4.5, 5.5], [-6, -7, 4.2], [6.5, -7, 4.5]]) place(ctx, 'palm', [x, 0, z], { params: { h }, turn: x * 20 });
    slab(ctx, [60, 0.2, 14], [0, -0.12, -12], 'blue'); ctx.scene.add(slab(ctx, [60, 0.2, 14], [0, -0.1, -14], 'cyan'));
    this.beams = []; for (const [x, r] of [[-3, 0.3], [1, 0.25], [5, 0.35]]) { const bm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 14, 0.18), toonMaterial(PALETTE.white)); bm.position.set(x * 2, 6, -13); bm.rotation.z = r; ctx.scene.add(bm); this.beams.push(bm); }
    this.kevin = buildModel('kevin', { catalog: MODELS }).object; this.kevin.position.set(4.6, 1.15, -0.6); this.kevin.scale.setScalar(0.7); ctx.scene.add(this.kevin);
    ctx.particles.register('zen', { count: [1, 1], life: [2, 3], speed: [0.1, 0.25], gravity: -0.05, size: [1, 1], colors: ['white', 'sky', 'mist'] });
    this.motes = ctx.random.fork('motes');
    ctx.particles.register('sweat', { count: [3, 5], life: [0.4, 0.8], speed: [1, 2], gravity: 4, size: [1, 1], colors: ['cyan', 'sky', 'white'] });
    ctx.particles.register('confetti', { count: [10, 16], life: [0.8, 1.4], speed: [2, 5], gravity: 6, size: [1, 1], colors: ['red', 'sand', 'lime', 'sky', 'white', 'plum'] });
    ctx.particles.register('splash', { count: [14, 22], life: [0.5, 1], speed: [2, 6], gravity: 12, size: [1, 2], colors: ['white', 'cyan', 'sky'] });
    ctx.engine.setSunDirection?.([0.3, 0.9, 0.5]);
  }
  resetPlay() { for (const l of this.lanes) { l.dot.reset(); l.score = 0; l.st = {}; } this.resetLanes?.(); }
  // ---------- per fixed step ----------
  playFixed(dt, practice) {
    const ctx = this.ctx;
    for (const l of this.lanes) {
      if (l.kind === 'ghost' || l.left) continue;
      const d = l.driver, inp = l.inp;
      if (d.observe) { d.observe(l.dot, this.pt); }
      if (this.botControl && d instanceof BotDriver) { Object.assign(inp, { breath: false, stepL: false, stepR: false, confirm: false }); this.botControl(l, inp, dt); }
      else { this.botIntent?.(l, dt); d.read(inp, ctx, dt, this.pt); }
      if (l.kind === 'local' && this.cheat && !this.skill) { /* cheats only with a bot driver */ }
      this.laneStep(l, inp, dt, practice);
    }
  }
  /** m: per-activity modifiers handed to the Dot. */
  stepDot(l, inp, dt, m = {}) {
    const T2 = this.cheat ? { ...T, dotNoise: T.dotNoise * 0.4 } : T;
    m.noise = (m.noise ?? 1) * this.app.noise();
    if (this.god && l.kind === 'local') { l.dot.x *= 0.9; l.dot.y *= 0.9; }
    l.dot.step(dt, inp.x, inp.y, T2, m);
  }
  ringOf(base) { return this.app.ring(base) * (this.cheat ? 2 : 1) * (this.hard ? (this.A.hard.ringMul ?? 1) : 1); }
  // ---------- frame ----------
  frameTick(ctx, dt) {
    const t = this.t;
    for (const l of this.lanes) {
      if (l.kind === 'ghost') { this.ghostUpdate(l, dt); continue; }
      const dot = l.dot;
      const ringR = this.currentRing?.(l) ?? 0.4, dist = Math.hypot(dot.x, dot.y);
      l.avatar.setLean(dot.x, dot.y, Math.max(0, (dist - ringR) / ringR), Math.max(0, Math.min(1, (dist - ringR * 1.7) / 0.5)));
      this.poseLane?.(l, dt);
      l.avatar.update(dt);
    }
    this.coach.update(dt);
    if (!this.bob) { this.bobChain = new SpringChain({ segments: 4, length: 0.12, rest: [0, -1, 0] }); this.bob = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), toonMaterial(PALETTE.cyan)); this.bob.rotation.x = Math.PI; ctx.scene.add(this.bob); }
    { const cp = this.coach.root.position, R = [1, 0, 0], U = [0, 1, 0], F = [0, 0, 1]; this.bobChain.update(dt, { x: cp.x + 0.35, y: cp.y + 0.8, z: cp.z + 0.1 }, [R, U, F]); const tip = this.bobChain.points[this.bobChain.points.length - 1]; this.bob.position.set(tip.x, tip.y, tip.z); }
    for (const [i, bm] of (this.beams ?? []).entries()) bm.rotation.z = 0.3 + Math.sin(t * 0.4 + i) * 0.04;
    this.kevin.position.y = 1.15 + Math.sin(t * 2) * 0.02; this.kevin.rotation.y = Math.sin(t * 0.5) * 0.4;
    if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) ctx.particles.burst('zen', V.set(this.motes.range(-5, 5), this.motes.range(0.4, 3), this.motes.range(-2, 2)));
    this.extraFrame?.(ctx, dt);
  }
  /** Ghost lanes never simulate: they lerp the last message and show the clip they report. */
  ghostUpdate(l, dt) {
    const net = this.app.net, g = net?.ghosts.get(l.pid), d = l.driver;
    if (g) d.push(g);
    if (net?.left.has(l.pid) && !l.left) { l.left = true; l.leaveT = 0; l.avatar.play('Wave'); }
    if (l.left) { l.leaveT += dt; if (l.leaveT > 1.5) { l.avatar.play('Walk'); l.avatar.root.position.x += dt * 1.4; l.avatar.root.rotation.y = Math.PI / 2; } if (l.leaveT > 5) l.avatar.root.visible = false; l.avatar.update(dt); return; }
    l.avatar.root.visible = !!d.seen && d.a === this.event;
    d.lerp(Math.min(1, dt * 8));
    const name = clipNames()[d.c];
    if (name && l.avatar.root.visible) { l.avatar.play(name, { fade: 0.1 }); if (l.avatar.cur && l.avatar.cur.isRunning?.() !== undefined) { l.avatar.cur.paused = /Rep$|RepL$/.test(name); if (l.avatar.cur.paused) l.avatar.cur.time = d.t; } }
    l.avatar.setLean(d.x, d.y, 0, 0); l.avatar.update(dt); l.score = d.s;
  }
  netState() {
    const me = this.me, names = clipNames(), m = this.app.medley, st = m?.totals() ?? [0], mi = this.lanes.indexOf(me);
    return { a: this.event, x: me.dot.x, y: me.dot.y, c: Math.max(0, names.indexOf(me.avatar.curName)), t: me.avatar.cur?.time ?? 0, s: me.score, total: (st[mi] ?? 0) + (this.phase === 'play' ? norm2(this.actId, me.score) : 0), label: `Event ${this.event + 1}` };
  }
  // ---------- projecting avatars to the HUD ----------
  project(hud, x, y, z) {
    V.set(x, y, z).project(this.ctx.camera.camera);
    return [(V.x + 1) / 2 * hud.width, (1 - V.y) / 2 * hud.height];
  }
  dialFor(hud, l) {
    if (this.n <= 3 && !this.multi && l === this.me) return { cx: Math.floor(hud.width / 2), cy: 56, r: 44 };
    const [x, y] = this.project(hud, l.x, 2.15, 0.8);
    return { cx: Math.round(x), cy: Math.round(y - 22), r: 24 };
  }
  /** Dials for whoever should have one: just you when solo, everybody (small) when several play. */
  drawDials(hud, ringR) { for (const l of this.lanes) { if (l.kind === 'ghost' && !l.avatar.root.visible) continue; if (this.multi || this.n > 3 ? (l.kind !== 'bot') : l === this.me) this.drawDial(hud, l, ringR, l.kind === 'ghost' ? { hide: false } : {}); } }
  /** Draw a lane's dial: ring (>= 2 px thick), dot, crosshair; the mouse line when the mouse leans. */
  drawDial(hud, l, ringR, { hide = false, fade = 0, label = null } = {}) {
    const d = this.dialFor(hud, l), sc = d.r / 1.3;
    l.dialRect = d;
    if (l.driver.dial) { l.driver.dial.x = d.cx; l.driver.dial.y = d.cy; }
    disc(hud, d.cx, d.cy, d.r, 'night'); ring(hud, d.cx, d.cy, d.r, 'slate', 2);
    hud.rect(d.cx - d.r + 4, d.cy, d.r * 2 - 8, 1, 'navy'); hud.rect(d.cx, d.cy - d.r + 4, 1, d.r * 2 - 8, 'navy');
    const inside = Math.hypot(l.dot.x, l.dot.y) <= ringR;
    const rr = Math.max(4, Math.round(ringR * sc));
    const glow = Math.min(1, (l.st.inT ?? 0) / 4);
    ring(hud, d.cx, d.cy, rr, inside ? (glow > 0.6 ? 'white' : 'lime') : 'red', inside && glow > 0.3 ? 3 : 2);
    if (this.app.device.last === 'mouse' && l.kind === 'local' && !hide) {
      const p = this.app.ctx.input.pointer; const mx = (p.x + 1) / 2 * hud.width, my = (1 - p.y) / 2 * hud.height;
      line(hud, d.cx, d.cy, Math.max(d.cx - d.r, Math.min(d.cx + d.r, mx)), Math.max(d.cy - d.r, Math.min(d.cy + d.r, my)), 'navy', 1);
      hud.rect(Math.round(mx) - 3, my - 1, 7, 2, 'sand'); hud.rect(mx - 1, Math.round(my) - 3, 2, 7, 'sand');
    }
    if (!hide) { const px = Math.round(d.cx + l.dot.x * sc), py = Math.round(d.cy - l.dot.y * sc); disc(hud, px, py, d.r > 30 ? 4 : 3, 'ink'); disc(hud, px, py, d.r > 30 ? 3 : 2, inside ? 'lime' : 'sand'); }
    if (label) say(hud, d.cx, d.cy + d.r + 3, label, { anchor: 'c', color: 'white' });
  }
  /** Names and live scores under each mat. */
  drawTags(hud) {
    for (const l of this.lanes) {
      const [x, y] = this.project(hud, l.x, 0, 1.4);
      say(hud, Math.round(x), Math.round(y) + 3, `${l.name}`, { anchor: 'c', color: l.kind === 'local' ? 'sand' : 'white' });
      if (this.laneLabel) say(hud, Math.round(x), Math.round(y) + 13, this.laneLabel(l), { anchor: 'c', color: 'mist' });
    }
  }
  fingerprint() { return this.lanes.map((l) => `${l.dot.x.toFixed(3)},${l.dot.y.toFixed(3)},${Math.round(l.score)}`).join('|') + ':' + this.phase + ':' + this.pt.toFixed(2); }
  /** Swap the local player's driver (autopilot). */
  setDriver(skill) {
    const l = this.me; const r = this.ctx.random.fork('auto');
    if (skill === 'local') { l.driver = new LocalDriver(this.app); l.kind = 'local'; this.skill = null; return; }
    l.driver = new BotDriver(skill, () => r.range(0, 1)); this.skill = skill;
  }
}
