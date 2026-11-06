// Your body: five segments, syrettes, four field surgeries, burning, going down, and blackwater fever on a timetable.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { clamp, lerp } from '../core/rng.js';
const SURGERIES = [
  { clip: 'Surgery1', props: ['p-pliers', 'w-arm'], extra: 'p-bullet', sounds: [[0.8, 'pliers'], [1.6, 'grunt'], [2.1, 'pliers'], [2.7, 'grunt-big']], blood: [2.8] , line: 'PLIERS.' },
  { clip: 'Surgery2', props: ['p-knife', 'w-thigh'], leg: true, sounds: [[1, 'knife-dig'], [1.8, 'grunt'], [2.3, 'knife-dig'], [2.9, 'grunt-big']], blood: [1.3, 2.5], line: 'THERE IS METAL IN THE THIGH.' },
  { clip: 'Surgery3', props: [], sounds: [[2.1, 'finger-snap'], [2.2, 'grunt-big']], blood: [], line: 'THE FINGER GOES BACK.' },
  { clip: 'Surgery4', props: ['p-lighter', 'p-flame', 'w-burn'], sounds: [[0.6, 'lighter'], [1.4, 'cauterise'], [2.1, 'grunt'], [2.8, 'grunt-big']], blood: [], line: 'SKIN IS ONLY A SUGGESTION.' },
];
const FEVER_LINES = ['THE FEVER.', 'THE FEVER AGAIN.', 'THE GROUND MOVES. IT IS NOT THE GROUND.', 'THE TIMETABLE RUNS ON TIME.', 'YOU ARE LATE ALREADY.'];
export class Body {
  hp = 100; syrettes = 3; maxSyrettes = 3; tablets = 0; lastHit = -99; burning = 0; burnClear = 0; heartT = 0; syretteT = 0; syretteLock = 0; surgery = null; surgeryT = 0; surgeryIndex = 0; lastDamage = 'bullet'; dead = false; swim = 0;
  fever = 'none'; feverIn = 0; feverT = 0; feverAct = 1; feverOn = false; tabletHold = 0; clearT = 0; feverLineN = 0; heartVoice = null; colorDrain = 0; downT = 0; healHold = 0; heartbeatT = 0; burnScreen = 0; hurtFlash = 0; lastDir = 0;
  constructor(game) { this.game = game; }
  get segments() { return Math.ceil(this.hp / 20); }
  moveFactor() { return this.surgery ? 0 : (this.feverOn ? 0.82 : 1); }
  resetAll() {
    this.hp = 100; this.syrettes = 3; this.maxSyrettes = 3; this.tablets = 0; this.burning = 0; this.surgery = null; this.dead = false; this.fever = 'none'; this.feverOn = false; this.swim = 0; this.feverIn = 0; this.feverAct = 1; this.colorDrain = 0; this.hurtFlash = 0; this.burnScreen = 0; this.lastHit = -99;
  }
  scheduleFever() {
    const r = this.game.rng.fever;
    const shrink = this.feverAct - 1;
    this.feverIn = Math.max(1, TUNING.feverMinutes - shrink + r.range(-2, 2)) * 60;
  }
  hurt(amount, kind = 'bullet', from, opts) {
    const g = this.game;
    if (g.dev.god || this.dead || g.player.seat?.invuln || g.round?.isClient) return;
    const a = amount * TUNING.playerDamageTaken;
    if (a <= 0) return;
    this.hp = Math.max(0, this.hp - a);
    this.lastHit = g.time;
    this.lastDamage = kind;
    this.hurtFlash = 1;
    if (from) { const dx = from[0] - g.player.feet.x, dz = from[1] - g.player.feet.z; this.lastDir = Math.atan2(dx, dz); this.dirFlash = 1; }
    g.sfx.play(kind === 'fire' ? 'grunt' : 'grunt', { volume: 0.5, pitch: g.rng.fx.range(-2, 2) });
    g.ctx.engine.shake.add(clamp(a * 0.02, 0.05, 0.4));
    g.rumble(0.5, 0.1);
    g.hudTouch('health');
    if (this.surgery && kind !== 'fire') this.interruptSurgery();
    if (this.hp <= 0) this.down();
  }
  catchFire() {
    if (this.game.dev.god) return;
    if (this.burning <= 0) { this.game.sfx.play('grunt-big', { volume: 0.6 }); this.game.events.emit('player-burning'); }
    this.burning = 1; this.burnClear = 0;
  }
  useSyrette() {
    const g = this.game;
    if (this.syrettes <= 0 || this.syretteT > 0 || this.surgery) return false;
    this.syretteT = 0.8;
    g.vm.showProp('p-syrette');
    g.vm.named.Leg.visible = true;
    g.vm.play('Syrette', { onEnd: () => { g.vm.named.Leg.visible = false; g.vm.showGun(g.weapons.gun?.id ?? 'cane', false); } });
    g.sfx.play('syrette', { volume: 0.7 });
    return true;
  }
  startSurgery() {
    const g = this.game;
    if (this.surgery || this.dead) return false;
    let which = this.surgeryIndex++ % 3;
    if (this.lastDamage === 'fire') which = 3;
    const s = SURGERIES[which];
    this.surgery = s; this.surgeryT = 0; this.surgeryKind = which;
    this.surgerySounds = [...s.sounds]; this.surgeryBlood = [...s.blood];
    g.vm.showProp(...s.props);
    if (s.leg) g.vm.named.Leg.visible = true;
    const dur = g.vm.play(s.clip, { keep: true });
    this.surgeryDur = dur;
    g.events.emit('surgery', which);
    g.say('', s.line, 2.2);
    return true;
  }
  interruptSurgery() {
    const g = this.game;
    this.surgery = null;
    g.vm.named.Leg.visible = false;
    g.vm.endAction();
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
    g.notice('INTERRUPTED', 1.2);
  }
  finishSurgery() {
    const g = this.game;
    this.surgery = null;
    this.hp = Math.max(this.hp, 40);
    if (g.round?.isClient) g.round.evQ.push(['patched']);
    g.vm.named.Leg.visible = false;
    g.vm.endAction();
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
    g.hudTouch('health');
    g.events.emit('surgery-done');
  }
  down() {
    const g = this.game;
    if (this.dead) return;
    this.interruptIfAny();
    g.events.emit('player-down');
    if (g.round) { g.round.localDown(); return; }
    const buddy = g.actors.rescuer();
    if (buddy) g.actors.startRescue(buddy);
    else { this.dead = true; g.gameOver(); }
  }
  interruptIfAny() { if (this.surgery) this.interruptSurgery(); }
  fixedUpdate(ctx, dt) {
    const g = this.game, a = g.actions;
    const time = g.time;
    // Regeneration only to the top of the current segment, 5 s after damage.
    if (time - this.lastHit > 5 && this.hp > 0 && !this.burning && !g.round?.isClient) {
      const top = Math.min(100, Math.ceil(this.hp / 20) * 20);
      if (this.hp < top) this.hp = Math.min(top, this.hp + dt * 6);
    }
    // Burning.
    if (this.burning > 0) {
      const onFuel = g.fire.state[g.fire.idOf(g.player.feet.x, g.player.feet.z)] === 1;
      if (!onFuel) this.burnClear += dt; else this.burnClear = 0;
      if (g.player.wading || this.burnClear >= 2) this.burning = 0;
      else this.hurt(TUNING.fireDamage * dt, 'fire');
      this.burnScreen = 1;
    } else this.burnScreen = Math.max(0, this.burnScreen - dt * 2);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    if (this.dirFlash > 0) this.dirFlash -= dt * 1.4;
    // Syrette and surgery.
    if (this.syretteT > 0) {
      this.syretteT -= dt;
      if (this.syretteT <= 0) { this.syrettes--; this.hp = Math.min(100, this.hp + 40); if (g.round?.isClient) g.round.evQ.push(['heal']); g.hudTouch('health'); g.events.emit('syrette'); }
    }
    if (g.canAct() && !g.mapUp) {
      if (a.take('heal')) {
        if (this.hp < 20) this.startSurgery();
        else if (this.syrettes > 0 && this.hp < 100) this.useSyrette();
        else if (this.syrettes <= 0) { g.notice('NO SYRETTES', 1.2); }
      }
    }
    if (this.surgery) {
      this.surgeryT += dt;
      while (this.surgerySounds.length && this.surgerySounds[0][0] <= this.surgeryT) { const [, s] = this.surgerySounds.shift(); g.sfx.play(s, { volume: 0.8 }); }
      while (this.surgeryBlood.length && this.surgeryBlood[0] <= this.surgeryT) { this.surgeryBlood.shift(); const e = g.player.eye, f = g.player.forward(); ctx.particles.burst('blood', [e.x + f.x * 0.45, e.y + f.y * 0.45 - 0.05, e.z + f.z * 0.45], { count: 18, direction: [0, 0.3, 0] }); }
      if (this.surgery.extra && this.surgeryT > 2.8) g.vm.named[this.surgery.extra].visible = true;
      if (this.surgeryT >= this.surgeryDur) this.finishSurgery();
    }
    // Heartbeat below 20.
    const low = this.hp < 20 && this.hp > 0;
    this.colorDrain = lerp(this.colorDrain, low ? 1 : 0, 1 - Math.exp(-dt * 3));
    if (low) { this.heartbeatT -= dt; if (this.heartbeatT <= 0) { this.heartbeatT = 0.8; g.sfx.play('heartbeat', { volume: 0.8 }); g.rumble(0.3, 0.05); } }
    this.feverStep(ctx, dt);
  }
  feverStep(ctx, dt) {
    const g = this.game, a = g.actions;
    if (g.round || g.dev.noFever) { if (this.feverOn) this.clearFever(); return; }
    if (!g.story.feverRunning && this.fever === 'none') return;
    if (this.fever === 'none') {
      if (!g.actors.scriptedFeverHold) this.feverIn -= dt;
      if (this.feverIn <= 0) this.startFever();
    } else if (this.fever === 'on') {
      this.feverT += dt;
      this.swim = lerp(this.swim, g.settings.feverReduced ? 0.4 : 1, 1 - Math.exp(-dt * 1.2));
      this.heartbeatT -= dt;
      if (this.heartbeatT <= 0) { this.heartbeatT = 0.9; g.sfx.play('heartbeat', { volume: 0.6 }); }
      // Tablet: hold 1 s.
      if (g.canHands() && a.down('tablet') && this.tablets > 0) {
        if (this.tabletHold === 0) { if (!g.player.seat) { g.vm.showProp('p-tablet', 'p-pill'); g.vm.play('Tablet', { onEnd: () => g.vm.showGun(g.weapons.gun?.id ?? 'cane', false) }); } g.sfx.play('tablet-bottle', { volume: 0.6 }); }
        this.tabletHold += dt;
        if (this.tabletHold >= 1) { this.tablets--; this.tabletHold = 0; this.fever = 'clearing'; this.clearT = 5; g.events.emit('tablet'); g.sfx.play('tablet-swallow', { volume: 0.5 }); g.hudTouch('health'); }
      } else this.tabletHold = 0;
      const limit = this.feverLimit ?? 25;
      if (this.feverT > limit) this.collapse();
    } else if (this.fever === 'clearing') {
      this.clearT -= dt;
      this.swim = lerp(this.swim, 0, 1 - Math.exp(-dt * 1.4));
      if (this.clearT <= 0) this.clearFever();
    }
    this.bodySway = this.swim;
    const cam = g.cam;
    if (this.swim > 0.01) {
      const t = g.time;
      cam.roll = Math.sin(t * 0.7) * 0.05 * this.swim;
      cam.kickYaw += Math.sin(t * 0.9) * 0.0012 * this.swim;
      cam.kickPitch += Math.cos(t * 1.1) * 0.0009 * this.swim;
    } else cam.roll = 0;
  }
  startFever(opts = {}) {
    const g = this.game;
    this.fever = 'on'; this.feverOn = true; this.feverT = 0; this.tabletHold = 0;
    this.feverLimit = opts.limit ?? 25;
    if (!opts.silent) g.say('', FEVER_LINES[this.feverLineN++ % FEVER_LINES.length], 3);
    g.sfx.play('fever-onset', { volume: 0.7 });
    g.music.setMood?.('fever');
    g.events.emit('fever-start');
  }
  clearFever() {
    const g = this.game;
    this.fever = 'none'; this.feverOn = false; this.swim = 0; g.cam.roll = 0; this.bodySway = 0;
    this.scheduleFever();
    g.events.emit('fever-clear');
    g.music.setMood?.(null);
  }
  /** Ignored for 25 s or no tablets: you wake at the nearest safehouse or the clinic hours later, with 20% of your stones gone. */
  collapse() {
    const g = this.game;
    if (g.scene.active || g.player.trainSeat) return;   // it waits for the scene to end, or for you to get off the train
    this.fever = 'none'; this.feverOn = false; this.swim = 0; g.cam.roll = 0;
    this.scheduleFever();
    g.events.emit('fever-collapse');
    g.collapseAway();
  }
}
