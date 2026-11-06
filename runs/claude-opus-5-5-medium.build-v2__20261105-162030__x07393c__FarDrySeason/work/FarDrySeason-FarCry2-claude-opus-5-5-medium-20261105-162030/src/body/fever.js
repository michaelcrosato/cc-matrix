// The fever: its timetable, tablets, the onset and the collapse (section 9).
import { TUNING } from '../core/tuning.js';
import { FEVER_LINES } from '../content/dialogue.js';
import { clamp } from '../world/geom.js';
export class FeverPart {
  resetFever() { this.feverActive = false; this.fever = 0; this.feverNext = this.nextInterval(); this.feverIgnored = 0; }
  nextInterval() { const act = this.game.story?.act ?? 1; return Math.max(1, TUNING.feverMinutes - (act - 1) + this.rng.range(-2, 2)) * 60; }
  /** The segment top: health regenerates only to here. */
  segmentTop() { const hp = this.p.hp; return Math.min(100, Math.ceil(hp / 20 - 1e-6) * 20); }
  takeTablet() { const p = this.p, game = this.game; if (p.tablets <= 0) return false; p.tablets--; this.feverClear = 5; this.feverActive = false; this.feverNext = this.nextInterval(); this.feverIgnored = 0; game.hud.touch(); game.audio.play('tablet-bottle'); game.events.emit('tablet'); return true; }
  feverTick(dt) {
    const game = this.game, p = this.p;
    if (game.mode === 'round') return;
    if (game.cheats.noFever && !game.attract?.active) { this.fever = 0; this.feverActive = false; return; }
    if (this.feverClear > 0) { this.feverClear -= dt; this.fever = Math.max(0, this.fever - dt / 5); }
    if (!game.story?.feverOn) return;
    if (this.feverActive) {
      this.fever = clamp(this.fever + dt / 3, 0, 1);
      this.feverIgnored += dt;
      if (this.feverIgnored > 25 && !game.attract?.active) this.collapse();
    } else if (this.feverClear <= 0) {
      this.feverNext -= dt;
      if (this.feverNext <= 0) this.onset();
    }
    void p;
  }
  onset() {
    const game = this.game;
    this.feverActive = true; this.feverIgnored = 0; this.attacks++;
    game.talk.say('you', this.rng.pick(FEVER_LINES), 5);
    game.audio.play('heartbeat');
    game.events.emit('fever');
  }
  collapse() {
    const game = this.game, p = this.p;
    this.feverActive = false; this.fever = 0; this.feverNext = this.nextInterval();
    const loss = Math.floor(p.stones * 0.2); p.stones -= loss;
    game.events.emit('collapse', loss);
    game.blackout('YOU WAKE SOME HOURS LATER, LIGHTER BY ' + loss + ' STONES.', () => {
      game.world.advanceHours(6);
      const near = game.nearestRecovery();
      p.teleport(near[0], near[1]);
      p.hp = Math.max(p.hp, 50);
      if (game.buddies.available()) game.talk.playLines('buddy.carry'); else game.talk.playLines('fever.collapse');
    });
  }
}
