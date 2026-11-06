import * as THREE from 'three/webgpu';
import { makeWorld, addGroundPlane } from '../physics/world.js';
import { Balancer } from '../physics/balancer.js';
import { Ragdoll } from '../physics/ragdoll.js';
import { makeDoll } from '../art/doll.js';
import { T } from '../core/tuning.js';
import { rng, cosRange } from '../core/rng.js';
import { Brain } from '../input/bot.js';
import { screenToWorld, worldToScreen } from '../render/cameraRig.js';
import { Disc } from '../ui/disc.js';
import { el, txt } from '../ui/ui.js';
import { D } from '../data/dialogue.js';
import { SEATS } from '../data/config.js';
export const DIFFICULTY = { gentle: { ankle: 1.25, dist: .65, win: 1.4 }, standard: { ankle: 1, dist: 1, win: 1 }, honest: { ankle: .9, dist: 1.2, win: .8 } };
const rad = (d) => d * Math.PI / 180;
export const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
export class EventBase {
  static id = 'base'; static title = ''; static discipline = ''; static instructor = 'trudy'; static place = ''; static sentence = ''; static can = ''; static cant = ''; static verbs = [['lean', 'Lean']]; static couch = false; static session = false; static tiers = [{}, {}, {}]; static music = 'balance'; static palette = null; static standing = true; static diagram = 'lean';
  constructor(game, opts = {}) {
    this.game = game; this.opts = opts; this.cls = this.constructor; this.tierIndex = opts.tier || 0; this.tier = this.cls.tiers[Math.min(this.tierIndex, this.cls.tiers.length - 1)];
    this.god = !!opts.god; this.sessionMode = !!opts.session; this.attract = !!opts.attract;
    this.phase = 'countdown'; this.t = 0; this.playT = 0; this.count = 3; this.lanes = []; this.disposed = false; this.timeLimit = 60; this.usesBreath = false; this.stepping = true;
    this.diff = DIFFICULTY[game.settings?.difficulty || 'standard'] || DIFFICULTY.standard;
    this.group = new THREE.Group(); this.world = null; this.objects = []; this.gulls = []; this.widgets = {}; this.anim = []; this.laneSpacing = 3.2; this.camYaw = 0;
    this.r = rng(`event-${this.cls.id}`); this.barkT = 4; this.falls = 0; this.gustQueue = []; this.tickers = [];
  }
  worldOpts() { return { iterations: 8 }; }
  balanceOpts() { return {}; }
  groundY() { return 0; }
  build(laneSpecs) {
    this.makeEventWorld();
    this.game.scene.add(this.group);
    this.buildSet();
    laneSpecs.forEach((s, i) => this.addLane(s, i, laneSpecs.length));
    this.start();
    this.setupHud();
    this.placeCamera(true);
  }
  makeEventWorld() { this.world = makeWorld({ ...this.worldOpts(), gravity: T.gravity }); this.ground = addGroundPlane(this.world, this.groundY()); }
  buildSet() {} start() {} fixedPlay() {} frameLane() {} preStep() {} onFall() {} onRecover() {} onFlail() {} setupHud2() {}
  placeCamera() {}
  laneX(i, n) { return (i - (n - 1) / 2) * this.laneSpacing; }
  addLane(spec, i, n) {
    const lane = { id: i, kind: spec.kind || 'local', ctrl: spec.ctrl || null, seat: spec.seat ?? i, name: spec.name || `Player ${i + 1}`, colour: spec.colour || SEATS[i % 4], fallen: false, score: 0, form: 0, props: [], skill: spec.skill || 'average', x: this.laneX(i, n), z: 0, sway: 0, tremor: 0, gusts: [], wishX: 0, wishZ: 0, in: { x: 0, z: 0, lf: 0, rf: 0, hop: false, hopHeld: false, flail: false, breath: false }, breathHist: [], breathSync: false, ph: this.r() * 6.28, baseClip: 'idle', falls: 0, flailN: 0, zone: null, brace: null, extraX: 0, extraZ: 0, medalForm: 0 };
    lane.doll = makeDoll({ paint: lane.colour, hat: spec.hat || 'none', skin: spec.skin, width: spec.width || 1, height: spec.height || 1 });
    lane.doll.group.position.set(lane.x, this.groundY(), lane.z); this.group.add(lane.doll.group);
    lane.doll.setFace(this.faceYaw ?? 0);
    if (lane.kind === 'bot') lane.brain = new Brain(lane.skill, i + 1);
    if (lane.kind !== 'ghost' && this.cls.standing !== false) { lane.bal = new Balancer(this.world, i, lane.x, this.groundY(), lane.z, this.balanceOpts()); lane.bal.mods.ankle = this.diff.ankle * (this.god ? 3 : 1); }
    this.lanes.push(lane); return lane;
  }
  localLanes() { return this.lanes.filter(l => l.kind === 'local'); }
  setupHud() {
    const hud = this.game.ui.hud; hud.innerHTML = '';
    if (this.opts.noHud) return;
    this.hudEl = el('div'); hud.appendChild(this.hudEl);
    const wrap = el('div', 'discwrap'); this.hudEl.appendChild(wrap);
    const n = this.lanes.filter(l => l.kind === 'local' || (this.attract && l.id === 0));
    const group = n.length > 1; if (group) wrap.classList.add('group');
    for (const l of n) {
      const col = el('div', 'playercol'); wrap.appendChild(col);
      if (this.showDisc !== false) l.disc = new Disc(col, group ? 14 : 22, group ? l.name : null, l.colour);
      else if (group) col.appendChild(txt('div', 'gaugeTag', l.name));
      // Each player's prompts follow their own device.
      if (group && l.ctrl) { const list = el('div', 'playerprompts'); for (const [v, w] of this.cls.verbs) { const p = el('span', 'prompt'); const g = el('span', 'pg'); g.dataset.verb = v; g.dataset.dev = l.ctrl.device === 'pad' ? 'pad' : 'kbm'; p.append(g, txt('span', '', w)); list.appendChild(p); } col.appendChild(list); }
    }
    this.bigEl = txt('div', 'hudbig', ''); this.timeEl = txt('div', 'hudtime', ''); this.numEl = el('div', 'hudnum'); this.msgEl = el('div', 'hudmsg'); this.widgetEl = el('div', 'widget');
    this.hudEl.append(this.timeEl, this.numEl, this.msgEl, this.bigEl, this.widgetEl);
    if (this.usesBreath) { this.breathEl = el('div', 'breathring'); this.breathEl.innerHTML = `<svg viewBox="-60 -60 120 120" width="${innerHeight * .13}" height="${innerHeight * .13}"><circle r="50" fill="#FFF8EE" stroke="#1A1420" stroke-width="5"/><circle class="br" r="20" fill="#7FD6C8" stroke="#1A1420" stroke-width="4"/></svg>`; this.brEl = this.breathEl.querySelector('.br'); const lbl = el('div', 'gaugeTag'); this.breathLbl = lbl; this.breathEl.appendChild(lbl); this.hudEl.appendChild(this.breathEl); }
    if (!this.attract && !group) { const pb = this.game.ui.bottom(this.cls.verbs); this.hudEl.appendChild(pb); }
    this.setupHud2();
    this.game.ui.refreshGlyphs(this.hudEl);
  }
  setMsg(t) { if (!this.msgEl) return; if (this._msg === t) return; this._msg = t; this.msgEl.innerHTML = ''; if (t) this.msgEl.appendChild(txt('span', '', t)); }
  setBig(t) { if (this.bigEl && this._big !== t) { this._big = t; this.bigEl.textContent = t; } }
  setNum(v, label = '') { if (this.numEl) { const s = `${v}|${label}`; if (this._num === s) return; this._num = s; this.numEl.textContent = String(v); if (label) this.numEl.appendChild(txt('small', '', label)); } }
  setTime(sec) { if (this.timeEl) { const s = sec == null ? '' : String(Math.max(0, Math.ceil(sec))); if (s !== this._time) { this._time = s; this.timeEl.textContent = s; this.timeEl.style.display = s ? '' : 'none'; } } }
  // ---------- lane input ----------
  readInput(lane, dt) {
    const I = lane.in;
    if (lane.kind === 'local') {
      const c = lane.ctrl || this.game.input.merged;
      const [x, z] = screenToWorld(this.moveMode ? c.moveX : c.x, this.moveMode ? c.moveZ : c.z, this.camYaw);
      I.x = x; I.z = z; I.lf = c.lf; I.rf = c.rf; I.hop = c.hop; I.hopHeld = c.hopHeld; I.flail = c.flail; I.breath = c.breath; I.tapA = c.tapA; I.tapD = c.tapD; I.keys = c.keysDown; I.dev = c.activeDevice || c.device; I.rawX = c.x; I.rawZ = c.z;
    } else if (lane.kind === 'bot') {
      const b = this.botInput(lane.id, this.playT, lane.skill, dt) || {};
      I.x = b.x || 0; I.z = b.z || 0; I.lf = b.lf || 0; I.rf = b.rf || 0; I.hop = !!b.hop; I.hopHeld = !!b.hopHeld; I.flail = !!b.flail; I.breath = !!b.breath; I.tapA = false; I.tapD = false; I.keys = false; I.dev = 'pad';
    }
    lane.wishX = I.x; lane.wishZ = I.z;
  }
  botBrain(lane) { return lane.brain || (lane.brain = new Brain(this.game.testBotSkill || lane.skill, lane.id + 1)); }
  botInput() { return { x: 0, z: 0 }; }
  /** Dev and test: the bot playing a local lane, in screen space for the pad it presses. */
  botPad(i, skill, dt) { const lane = this.lanes[i]; if (!lane) return null; if (!lane.brain || lane.brain.name !== skill) lane.brain = new Brain(skill, i + 1); lane.brain.gainMul = this.opts.botGain ?? 1; if (this.phase !== 'play') return { x: 0, z: 0 }; const b = this.botInput(i, this.playT, skill, dt) || {}; const [sx, sz] = worldToScreen(b.x || 0, b.z || 0, this.camYaw); return { ...b, x: sx, z: sz }; }
  // ---------- fixed step ----------
  fixed(dt) {
    if (this.disposed) return;
    this.t += dt;
    if (this.phase === 'countdown') {
      const was = Math.ceil(this.count); this.count -= dt; const now = Math.ceil(this.count);
      if (was !== now && now > 0) this.game.audio.sfx('tick', { high: false });
      this.setBig(now > 0 ? String(now) : '');
      if (this.count <= 0) { this.phase = 'play'; this.playT = 0; this.game.audio.sfx('whistle'); this.setBig(''); this.onPlayStart?.(); }
    } else if (this.phase === 'play') this.playT += dt;
    for (const lane of this.lanes) if (lane.kind !== 'ghost') this.readInput(lane, dt);
    if (this.phase === 'play') this.fixedPlay(dt);
    for (const lane of this.lanes) this.stepLane(lane, dt);
    if (this.stepping && this.world) this.world.step();
    for (const lane of this.lanes) this.postLane(lane, dt);
    if (this.phase === 'play') this.postPlay?.(dt);
    for (const f of this.tickers) f(dt);
    if (this.barkT > 0) this.barkT -= dt;
  }
  stepLane(lane, dt) {
    if (!lane.bal) return;
    const b = lane.bal;
    if (lane.fallen) { b.step(dt, 0, 0); return; }
    if (lane.in.flail && this.flailOk !== false) { if (b.flail()) { lane.flailN++; lane.flailT = .35; lane.doll.rig.play('flail', .05); this.game.audio.sfx('clack', { f: 1600 }); this.onFlail(lane); } }
    if (lane.flailT > 0) { lane.flailT -= dt; if (lane.flailT <= 0) lane.doll.rig.play(lane.baseClip, .15); }
    this.breathTick(lane, dt);
    // Slow forcing the player has to see and counter by hand.
    const t = b.t, ph = lane.ph, mult = (lane.breathSync ? .6 : 1) * this.diff.dist;
    const sway = lane.sway * T.swayScale * mult, tr = lane.tremor * T.tremorScale * mult;
    let nx = sway * (Math.sin(t * .9 + ph) * .6 + Math.sin(t * 1.73 + ph * 2.1) * .4) + tr * (Math.sin(t * 8.2 + 1.1) * .6 + Math.sin(t * 18.3) * .4);
    let nz = sway * (Math.sin(t * .77 + ph * 1.7) * .6 + Math.sin(t * 1.51 + ph * .6) * .4) + tr * (Math.sin(t * 7.1 + 2.3) * .6 + Math.sin(t * 15.7 + .7) * .4);
    for (let i = lane.gusts.length - 1; i >= 0; i--) { const g = lane.gusts[i]; if (g.delay > 0) { g.delay -= dt; continue; } nx += g.x * this.diff.dist; nz += g.z * this.diff.dist; g.left -= dt; if (g.left <= 0) lane.gusts.splice(i, 1); }
    b.nx = nx + lane.extraX; b.nz = nz + lane.extraZ;
    lane.extraX = 0; lane.extraZ = 0;
    this.preStep(lane, dt);
    b.step(dt, lane.wishX, lane.wishZ);
  }
  breathTick(lane, dt) {
    if (!this.usesBreath) return;
    const phase = (this.t % 8) / 8, growing = phase < .5, auto = this.game.settings?.autoBreathe;
    const inSync = auto || (growing ? !!lane.in.breath : !lane.in.breath);
    lane.breathHist.push(inSync ? 1 : 0); const N = 960; if (lane.breathHist.length > N) lane.breathHist.shift();
    if (lane.breathHist.length % 30 === 0 || lane.breathHist.length === N) { let s = 0; for (const v of lane.breathHist) s += v; lane.breathSync = lane.breathHist.length >= 480 && s / lane.breathHist.length >= .7; }
  }
  postLane(lane, dt) {
    if (!lane.bal) return;
    const b = lane.bal;
    if (lane.fallen) {
      lane.recover -= dt;
      if (lane.recover <= 0) this.recover(lane);
      return;
    }
    if (!b.free && (b.angle || 0) > rad(T.fallAngle)) {
      if (this.god || this.noFall) b.reset(); else this.fall(lane);
    } else if ((b.angle || 0) > rad(T.fallAngle * .72) && lane.nearCd !== true) { lane.nearCd = true; this.game.rumble(lane, .4, .2); if (lane.id === 0) { const f = lane.bal.foot.translation(); this.game.comic('WOBBLE', f.x, f.y + 2, f.z, '#FFF8EE', .6, .6); } if (lane.kind === 'local' && this.barkT <= 0) this.bark('trudy', 'nearFall'); }
    else if ((b.angle || 0) < rad(18)) lane.nearCd = false;
  }
  fall(lane) {
    if (lane.fallen) return;
    lane.fallen = true; lane.recover = T.recoverTime; lane.falls++; this.falls++; lane.gusts.length = 0;
    const b = lane.bal, v = b.body.linvel();
    b.setEnabled(false);
    lane.ragdoll = new Ragdoll(this.world, lane.doll, this.group, v, { x: (b.leanX > 0 ? .08 : -.08), y: .05, z: (b.leanZ > 0 ? .08 : -.08) });
    this.game.audio.sfx('clatter'); this.game.comic('CLACK!', lane.x, 1.4 + this.groundY(), lane.z); this.game.rumble(lane, 1, .35); this.game.hitstop(.05); this.game.rig.shake(.08);
    this.onFall(lane);
    if (lane.kind === 'local') { this.game.addFall(); this.bark(this.cls.instructor === 'trudy' ? 'trudy' : (this.r() < .5 ? 'trudy' : this.cls.instructor), 'fall'); }
  }
  recover(lane) {
    if (!lane.fallen) return;
    lane.fallen = false;
    if (lane.ragdoll) { lane.ragdoll.remove(); lane.ragdoll = null; }
    lane.bal.setEnabled(true); lane.bal.reset();
    lane.doll.rig.play(lane.baseClip, .1); lane.doll.land(); this.game.audio.sfx('spring');
    this.onRecover(lane);
  }
  bark(who, key, vars) { if (this.attract || this.phase === 'done' || this.barkT > 0) return; this.barkT = 5; this.game.bark(who, key, vars); }
  gust(lane, x, z, dur = .5, delay = 0) { lane.gusts.push({ x: x * T.gustForce, z: z * T.gustForce, left: dur, delay }); }
  forceGust(mag = 3) { for (const l of this.lanes) if (l.bal) this.gust(l, mag, 0); }
  forceFall() { for (const l of this.lanes) if (l.bal && !l.fallen && l.kind !== 'ghost') this.fall(l); }
  forceThing() {}
  // ---------- frame ----------
  frame(dt) {
    if (this.disposed) return;
    for (const lane of this.lanes) {
      if (lane.ragdoll) lane.ragdoll.sync();
      lane.doll.tick(dt);
      if (lane.ragdoll) lane.ragdoll.sync();
      if (lane.bal && !lane.fallen && !lane.customPose) { const f = lane.bal.foot.translation(); lane.doll.group.position.set(f.x, f.y, f.z); lane.doll.setLeanFromQuat(lane.bal.body.rotation()); }
      this.frameLane(lane, dt);
      if (lane.disc && lane.bal) {
        const [cx, cz] = worldToScreen(lane.bal.cobX, lane.bal.cobZ, this.camYaw), [wx, wz] = worldToScreen(lane.wishX, lane.wishZ, this.camYaw);
        let zone = lane.zone; if (zone && this.camYaw) { const [zx, zz] = worldToScreen(zone.x, zone.z, this.camYaw); zone = { x: zx, z: zz, r: zone.r }; }
        let br = lane.brace; if (br && this.camYaw) { const [zx, zz] = worldToScreen(br.x, br.z, this.camYaw); br = { x: zx, z: zz }; }
        lane.disc.update(dt, cx, cz, wx, wz, zone, br);
      }
    }
    for (const a of this.anim) a.tick(dt);
    if (this.brEl) {
      const phase = (this.t % 8) / 8, g = phase < .5 ? phase * 2 : (1 - phase) * 2;
      this.brEl.setAttribute('r', (14 + g * 34).toFixed(1));
      const l = this.lanes[0]; this.brEl.setAttribute('fill', l && l.breathSync ? '#8FE07A' : '#7FD6C8');
      const w = phase < .5 ? 'In' : 'Out'; if (this.breathLbl.textContent !== w) { this.breathLbl.textContent = w; this.game.audio.sfx(phase < .5 ? 'breathIn' : 'breathOut'); }
    }
    this.placeCamera(false);
    this.frame2?.(dt);
  }
  // ---------- result ----------
  finish() { if (this.phase === 'done') return; this.phase = 'done'; this.game.audio.sfx('whistle'); for (const l of this.lanes) { if (l.kind !== 'ghost' && !l.fallen) l.doll.rig.play(this.winClip || 'cheer', .2); } this.setBig(''); }
  forceFinish() { this.finish(); }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: Math.round(l.form), label: 'Form', stats: `Floor Exercises: ${l.falls}` }; }
  /** Current session-score estimate. */
  liveForm(i) { return this.lanes[i]?.form || 0; }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const l of this.lanes) { if (l.ragdoll) { l.ragdoll = null; } if (l.disc) l.disc.remove(); l.brain = null; }
    this.group.removeFromParent();
    this.group.traverse?.((o) => { if (o.isSprite && o.material) o.material.dispose(); });
    this.onDispose?.();
    if (this.world) { this.world.free(); this.world = null; }
    this.game.ui.hud.innerHTML = '';
  }
  bodyCount() { return this.world ? this.world.bodies.len() : 0; }
  hasNaN() { if (!this.world) return false; let bad = false; this.world.bodies.forEach((b) => { const p = b.translation(); if (!Number.isFinite(p.x + p.y + p.z)) bad = true; }); return bad; }
  crowd(list, spec = {}) { // non-physics spectators
    for (const g of list) { const d = makeDoll({ paint: g.paint, hat: g.hat, skin: g.skin, height: g.height || 1, width: g.width || 1 }); d.group.position.set(g.x, g.y ?? this.groundY(), g.z); d.setFace(g.yaw ?? 0); d.rig.play(g.clip || spec.clip || 'clap', 0); d.rig.mixer.setTime(cosRange(0, 1)); this.group.add(d.group); this.anim.push(d); }
  }
  /** Where another player's ghost stands, for a seat offset along x. */
  ghostPos(x) { return [x, this.groundY(), 0]; }
  add(o, x, y, z) { if (x !== undefined) o.position.set(x, y, z); this.group.add(o); return o; }
}
export const pickLine = (who, key) => D[who]?.[key];
