// The body: health in five segments, syrettes, field surgery, burning, blackwater fever and tablets.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { consume, held } from '../core/actions.js';
import { SURGERY } from '../content/surgery.js';

export class BodySystem {
  name = 'body';
  hp = 100; sinceHurt = 99; burning = false; burnOutT = 0; lastType = 'bullet';
  heal = null;            // { kind:'syrette'|'tablet'|'surgery', t, dur, scene }
  fever = { active: false, t: 0, next: 0, ignored: 0, clear: 0, count: 0 };
  lastDamageAt = -99; playedSeconds = 0; heartbeat = 0; lookT = 0; lookKey = '';
  setup(g) {
    this.g = g; this.rng = g.ctx.random.fork('body');
    g.hurt = (d, type, from) => this.hurt(d, type, from);
    g.setPlayerOnFire = (why) => this.ignite(why);
    this.fever.next = this.nextInterval();
  }
  nextInterval() { return Math.max(30, (TUNING.feverMinutes - this.fever.count * 0) * 60 + this.rng.range(-2, 2) * 60); }
  segments() { return Math.ceil(this.hp / 20); }
  hurt(d, type = 'bullet', from) {
    const g = this.g; if (g.godMode || this.hp <= 0 || g.mode === 'title') return;
    d *= TUNING.playerDamageTaken;
    if (d <= 0) return;
    this.hp = Math.max(0, this.hp - d); this.sinceHurt = 0; this.lastType = type; this.lastDamageAt = g.ctx.time;
    g.camState.punch = (g.camState.punch || 0) + 0.04; g.ctx.engine.shake.add(Math.min(0.5, d / 60));
    g.rumble?.(0.6, 0.2, 90); g.sfx?.('hurt'); g.events.emit('hurt', d, type);
    if (this.heal && this.heal.kind === 'surgery') this.cancelHeal('INTERRUPTED.');
    if (this.heal && this.heal.kind === 'syrette' && this.heal.t < 0.15) { /* still fine */ }
    if (this.hp <= 0) g.onPlayerDown?.(type);
  }
  ignite(why) {
    if (this.burning || this.g.godMode) return;
    if (this.g.world.kindAt(this.g.player.feet.x, this.g.player.feet.z) === 4) return;
    this.burning = true; this.burnOutT = 0; this.lastType = 'fire'; this.g.sfx?.('ignite'); this.g.events.emit('playerburn', why);
  }
  addHp(n) { this.hp = Math.min(100, this.hp + n); }
  fixed(g, dt) {
    if (g.mode === 'play' || g.mode === 'round') {
      this.playedSeconds += dt;
      this.sinceHurt += dt;
      // regen to the top of the current segment
      if (this.sinceHurt > 5 && this.hp > 0 && !this.burning) { const cap = Math.ceil(this.hp / 20) * 20; if (this.hp < cap) this.hp = Math.min(cap, this.hp + 8 * dt); }
      // burning
      if (this.burning) {
        this.hurt(TUNING.fireDamage * dt, 'fire');
        const f = g.player.feet;
        const inFuel = g.fire && (g.fire.stateAt(f.x, f.z) === 1);
        const water = g.world.kindAt(f.x, f.z) === 4;
        this.burnOutT = inFuel ? 0 : this.burnOutT + dt;
        if (water || this.burnOutT > 2) { this.burning = false; this.g.sfx?.('extinguish'); }
      }
      this.feverTick(g, dt);
      this.healTick(g, dt);
    }
  }
  // ---- healing ----
  healTick(g, dt) {
    const input = g.ctx.input;
    if (!this.heal) {
      if (g.mapUp || g.player.seated || g.dialogueOn) return;
      if (consume(input, 'syrette')) this.beginHeal();
      else if (this.fever.active && consume(input, 'tablet')) this.beginTablet();
      else if (!this.fever.active && consume(input, 'tablet')) g.say?.('NO FEVER. KEEP THEM.', 'player', 1.5);
      return;
    }
    const h = this.heal; h.t += dt;
    if (h.kind === 'syrette' || h.kind === 'tablet') {
      if (!held(input, h.kind === 'syrette' ? 'syrette' : 'tablet')) return this.cancelHeal('');
    }
    if (h.t >= h.dur) this.finishHeal();
  }
  beginHeal() {
    const g = this.g, w = g.weapons;
    if (this.hp < 20 && this.hp > 0) return this.beginSurgery();
    if (this.hp >= 100) { g.say?.('FINE FOR NOW.', 'player', 1); return; }
    if (w.syrettes <= 0) { g.say?.('NO SYRETTES.', 'player', 1.2); return; }
    this.heal = { kind: 'syrette', t: 0, dur: 0.8 };
    g.itemView('syrette', 0.8); g.sfx?.('syrette');
  }
  beginTablet() {
    const g = this.g, w = g.weapons;
    if (w.tablets <= 0) { g.say?.('NO TABLETS.', 'player', 1.4); return; }
    this.heal = { kind: 'tablet', t: 0, dur: 1.0 };
    g.itemView('tablet', 1.0); g.sfx?.('tablet');
  }
  beginSurgery() {
    const g = this.g;
    const fire = this.lastType === 'fire';
    const scene = fire ? SURGERY[3] : SURGERY[this.rng.int(0, 2)];
    this.heal = { kind: 'surgery', t: 0, dur: scene.dur, scene };
    g.surgeryActive = true; g.itemView(scene.view, scene.dur, scene.clip);
    scene.sounds.forEach(([t, s]) => g.ctx.tweens.call(t * scene.dur, () => { if (this.heal && this.heal.scene === scene) g.sfx?.(s); }));
    g.say?.(scene.line, 'player', 2.5);
    g.events.emit('surgery', scene.id);
  }
  cancelHeal(msg) {
    const g = this.g; this.heal = null; g.surgeryActive = false; g.itemHide?.();
    if (msg) g.say?.(msg, 'player', 1.2);
  }
  finishHeal() {
    const g = this.g, h = this.heal; this.heal = null; g.surgeryActive = false; g.itemHide?.();
    if (h.kind === 'syrette') { g.weapons.syrettes--; this.addHp(40); this.sinceHurt = 0; }
    else if (h.kind === 'tablet') { g.weapons.tablets--; this.fever.clear = 5; g.say?.('THE WORLD SETTLES.', 'player', 2); }
    else if (h.kind === 'surgery') { this.hp = Math.max(this.hp, 40); this.sinceHurt = 0; this.burning = false; g.sfx?.('grunt'); }
    g.events.emit('healed', h.kind);
  }
  // ---- fever ----
  feverTick(g, dt) {
    const f = this.fever;
    if (g.cutscene) return;
    if (!f.active) {
      if (g.noFever) return;
      f.t += dt;
      if (f.t >= f.next) this.startFever('THE FEVER.');
    } else if (f.clear > 0) {
      f.clear -= dt; if (f.clear <= 0) { f.active = false; f.ignored = 0; f.t = 0; f.count++; f.next = Math.max(60, this.nextInterval() - f.count * 0); g.events.emit('feverend'); }
    } else {
      f.ignored += dt;
      if (f.ignored >= 25) { f.active = false; f.ignored = 0; f.t = 0; g.collapse?.(); }
    }
  }
  startFever(line) {
    const g = this.g, f = this.fever; f.active = true; f.ignored = 0; f.clear = 0; f.t = 0;
    g.say?.(line || 'THE FEVER.', 'player', 3); g.events.emit('fever'); g.sfx?.('fever_onset');
  }
  /** 0..1 how deep the fever grips the view */
  feverLevel() { const f = this.fever; if (!f.active) return 0; if (f.clear > 0) return Math.min(1, f.clear / 5); return Math.min(1, 0.35 + f.ignored / 25 * 0.65); }
  lowHealth() { return this.hp < 20 ? 1 - this.hp / 20 : 0; }
  // ---- look ----
  frame(g, dt) {
    const fl = this.feverLevel() * (g.settings?.reduceFever ? 0.4 : 1), lh = this.lowHealth();
    // sway: roll and pitch wobble
    g.camState.roll = fl * Math.sin(g.ctx.time * 0.9) * 0.05 + (g.camState.shakeRoll || 0);
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = 1 / 15;
      const key = [fl.toFixed(2), lh.toFixed(2), this.burning ? 1 : 0, g.hour8()].join(',');
      if (key !== this.lookKey) {
        this.lookKey = key;
        const L = g.look; const sc = L.scene;
        sc[0].params.saturation = 1.05 - fl * 0.5 - lh * 0.6; sc[0].params.warmth = 0.04 + fl * 0.1 + (this.burning ? 0.1 : 0); sc[0].params.brightness = -fl * 0.04;
        sc[1].params.spread = fl * 4; sc[2].params.intensity = 0.28 + fl * 0.3 + lh * 0.3;
        g.ctx.engine.setLook(L);
      }
    }
    const f = g.player.feet; this.speedNow = Math.sqrt(g.player.speed2 || 0);
  }
  state() { return { hp: Math.round(this.hp), burning: this.burning, fever: { active: this.fever.active, level: +this.feverLevel().toFixed(2), ignored: +this.fever.ignored.toFixed(1), next: Math.round(this.fever.next - this.fever.t) }, healing: this.heal ? this.heal.kind : null }; }
}
