// The body: health segments, syrettes, field surgery, burns, going down, and blackwater fever (section 9).
import { TUNING } from '../core/tuning.js';
import { LOSS_LINES } from '../content/dialogue.js';
import { held, pressedFixed } from '../core/actions.js';
import { clamp } from '../world/geom.js';
import { mixin } from '../core/mixin.js';
import { FeverPart } from './fever.js';
import { SurgeryPart } from './surgery.js';
const SCENES = [
  { clip: 'SurgeryPliers', items: ['tool-pliers', 'prop-forearm'], sounds: [[0.6, 'pliers'], [1.7, 'pliers'], [2.3, 'knife'], [2.5, 'grunt']], blood: [2.3], label: 'PLIERS' },
  { clip: 'SurgeryKnife', items: ['tool-knife', 'prop-thigh'], sounds: [[0.8, 'knife'], [1.6, 'grunt'], [2.2, 'knife']], blood: [1.4, 2.2], label: 'KNIFE' },
  { clip: 'SurgeryFinger', items: [], sounds: [[1.9, 'finger-snap'], [2.1, 'grunt']], blood: [], label: 'FINGER' },
  { clip: 'SurgeryLighter', items: ['tool-lighter', 'prop-burn'], sounds: [[0.3, 'lighter'], [1.2, 'hiss'], [2.2, 'grunt']], blood: [], label: 'LIGHTER' },
];
export class Body {
  segments = 5; regenT = 0; lastDamageKind = 'bullet'; heartVoice = null;
  fever = 0; feverActive = false; feverT = 0; feverIgnored = 0; feverNext = 720; feverClear = 0; attacks = 0; tabletHold = 0; syretteHold = 0; surgeryN = 0;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('body'); this.resetFever(); }
  get p() { return this.game.player; }
  fixed(dt) {
    const p = this.p, game = this.game, input = this.ctx.input;
    if (game.mode !== 'play' && game.mode !== 'attract') return; // In a round the host keeps the books.
    this.regenT += dt;
    if (!p.surgery && !p.downT && this.regenT > 5 && p.hp > 0 && p.hp < this.segmentTop()) p.hp = Math.min(this.segmentTop(), p.hp + dt * 8);
    // Burns.
    const inFire = game.world.fire.isBurning(p.x, p.z);
    if (inFire && !p.vehicle && !game.cheats.god) p.catchFire();
    if (p.burning > 0) {
      p.burnClear = inFire ? 0 : p.burnClear + dt;
      if (p.burnClear > 2 || game.world.land.waterDepth(p.x, p.z) > 0.25 || game.cheats.god) { p.burning = 0; }
      else { game.damagePlayer(TUNING.fireDamage * dt, { fire: true }); }
    }
    // Scene of surgery.
    if (p.surgery) {
      const s = p.surgery; s.t += dt;
      for (const [at, name] of s.scene.sounds) if (!s.played?.[at] && s.t >= at) { (s.played ??= {})[at] = 1; game.audio.play(name); if (name === 'grunt') this.ctx.engine.shake.add(0.15); }
      for (const at of s.scene.blood) if (!s.bled?.[at] && s.t >= at) { (s.bled ??= {})[at] = 1; const e = p.eyeNow(); this.ctx.particles.burst('blood', [e.x, e.y - 0.5, e.z], { count: 12 }); game.flashBlood = 0.4; }
      if (s.t >= 4) { p.surgery = null; p.hp = Math.max(p.hp, 40); game.vm.endTool(); this.regenT = 0; game.hud.touch(); game.events.emit('surgeryDone', s.scene.label); }
      return;
    }
    if (!p.canAct()) { this.feverTick(dt); return; }
    // Syrette or surgery.
    if (held(input, 'heal') && !game.ui.top) {
      if (p.hp < 20 && !p.vehicle) { this.startSurgery(); input.clearQueued('PadL1', 'KeyQ'); }
      else if (p.syrettes > 0 && p.hp < 100 && !p.vehicle) {
        if (this.syretteHold === 0) { game.vm.playTool('Syrette', ['tool-syrette']); game.audio.play('cloth', { volume: 0.4 }); }
        this.syretteHold += dt;
        if (this.syretteHold >= 0.8) { this.syretteHold = -1e9; p.syrettes--; p.hp = Math.min(100, p.hp + 40); game.audio.play('syrette'); this.regenT = 0; game.hud.touch(); game.events.emit('syrette'); }
      }
    } else { if (this.syretteHold > 0 && this.syretteHold < 0.8) game.vm.endTool(); this.syretteHold = 0; }
    // Tablet.
    if (held(input, 'tablet') && !game.ui.top && p.tablets > 0) {
      if (this.tabletHold === 0) { game.vm.playTool('Tablet', ['tool-tablets', 'tool-tablet']); game.audio.play('tablet-bottle'); }
      this.tabletHold += dt;
      if (this.tabletHold >= 1 && this.tabletHold < 1e6) { this.tabletHold = 1e7; this.takeTablet(); }
    } else { if (this.tabletHold > 0 && this.tabletHold < 1) game.vm.endTool(); this.tabletHold = 0; }
    this.feverTick(dt);
    void pressedFixed;
  }
  /** Reaching zero. A friend comes, or the paperwork does. */
  down() {
    const game = this.game, p = this.p;
    if (p.downT || game.mode === 'attract') return;
    game.events.emit('playerDown');
    if (game.mode === 'round') return;
    game.combat.stopStream();
    const buddy = game.buddies.rescuer();
    if (buddy) { game.buddies.rescue(buddy); return; }
    game.gameOver(LOSS_LINES.died);
  }
  update(dt) {
    const p = this.p, game = this.game;
    const dying = p.hp < 20 && p.hp > 0 && game.mode === 'play';
    if (dying !== this.dying) this.dying = dying;
    this.beatT = (this.beatT ?? 0) - dt;
    if ((dying || this.feverActive) && this.beatT <= 0) { game.audio.play('heartbeat', { volume: dying ? 0.8 : 0.5 }); this.beatT = dying ? 0.8 : 1.15; }
    void clamp;
  }
}
mixin(Body, FeverPart, SurgeryPart);
