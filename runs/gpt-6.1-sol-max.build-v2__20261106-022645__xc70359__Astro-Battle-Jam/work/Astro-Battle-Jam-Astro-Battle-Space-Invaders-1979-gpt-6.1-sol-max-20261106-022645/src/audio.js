/* All sound is synthesized at runtime; no samples or encoded audio. */
(function (root) {
  const A = root.ABJ;
  A.synthTone = function (ctx, bus, at, { freq = 440, end = freq, dur = .12, vol = .1, wave = 'triangle' } = {}) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(20, freq), at); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + dur);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(Math.min(.3, Math.max(0, vol)), at + Math.min(.009, dur / 4)); gain.gain.exponentialRampToValueAtTime(.00001, at + dur);
    osc.connect(gain).connect(bus); osc.start(at); osc.stop(at + dur + .01); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    return osc;
  };
  class Audio {
    constructor(game) {
      this.game = game; this.a = game.audio; this.location = -1; this.boss = false; this.nodes = new Set(); this.marchAt = -1; this.eventsPlayed = 0; this.unlocked = false;
      const voices = {
        jamshot: { wave: 'pulse12', freq: 1080, to: 350, dur: .08, vol: .12 },
        jamkill: { wave: 'triangle', freq: 290, to: 72, dur: .16, vol: .2 },
        jamarmor: { wave: 'square', freq: 1550, to: 560, dur: .09, vol: .14 },
        jamerosion: { wave: 'noise', freq: 700, to: 160, dur: .07, vol: .075 },
        jampickup: { wave: 'sine', freq: 650, to: 1400, dur: .18, vol: .2, arp: [0, 4, 7], step: .04 },
        jamrepair: { wave: 'triangle', freq: 210, to: 880, dur: .34, vol: .2, arp: [0, 5, 9], step: .08 },
        jamloss: { wave: 'noise', freq: 1800, to: 60, dur: .55, vol: .32 },
        jambomb: { wave: 'sine', freq: 120, to: 55, dur: .16, vol: .17 },
        jamsaucer: { wave: 'sine', freq: 330, to: 660, dur: .5, vol: .14, vib: [12, .1] }
      };
      for (const [name, v] of Object.entries(voices)) this.a.define(name, v);
    }
    unlock() {
      if (this.unlocked || this.game.headless) return;
      this.unlocked = true;
      this.a.bus('master');
      const result = this.a.ctx?.resume();
      if (result?.catch) result.catch(() => {});
    }
    song(location, boss = false) {
      if (!this.unlocked || !this.a.ready) return;
      if (this.location === location && this.boss === boss) return;
      this.location = location; this.boss = boss;
      const melodic = ['E5 . . B4 . . G5 . F#5 . . D5 . . B4 .', 'A4 . E5 . . C5 . . B4 . . G4 E5 . . .', 'D5 . A4 . F5 . . E5 . C5 . . A4 . . .'];
      this.a.music({ bpm: boss ? 126 : 88 + location * 9, steps: 4, tracks: [
        { name: 'pulse', wave: 'triangle', vol: .19, notes: boss ? 'D2 . D3 . A2 . C3 . F2 . F3 . E2 . C3 .' : ['E2 . . . B2 . . . G2 . . . D3 . . .', 'A2 . . . E3 . . . C3 . . . G2 . . .', 'D2 . . . A2 . . . F2 . . . C3 . . .'][location] },
        { name: 'stars', wave: 'sine', vol: .12, notes: melodic[location] + ' . . . . . . . . . . . . . . . .' },
        { name: 'dust', wave: 'drums', vol: .14, notes: boss ? 'k . h . s . h . k . h h s . h .' : 'k . . . . . h . . . . . s . . .' }
      ] }, { fade: .6, sync: true });
    }
    bark(high = false) {
      if (!this.unlocked || !this.a.ready || this.nodes.size > 14) return;
      const ctx = this.a.ctx, bus = this.a.bus('voice'); if (!ctx || !bus) return;
      for (let i = 0; i < 4; i++) {
        const o = A.synthTone(ctx, bus, ctx.currentTime + i * .085, { freq: (high ? 310 : 145) * [1, 1.4, .9, 1.2][i], end: (high ? 500 : 210) * [1.1, .8, 1.3, .7][i], dur: .075, vol: .075, wave: 'sawtooth' });
        this.nodes.add(o); o.addEventListener('ended', () => this.nodes.delete(o), { once: true });
      }
    }
    event(e) {
      if (!this.unlocked || !this.a.ready) return;
      this.eventsPlayed++;
      const pan = Math.max(-1, Math.min(1, (e.x - 240) / 240));
      const sound = { shoot: 'jamshot', kill: 'jamkill', armor: 'jamarmor', erosion: 'jamerosion', pickup: 'jampickup', repair: 'jamrepair', loss: 'jamloss', bomb: 'jambomb', saucer: 'jamsaucer', 'saucer-hit': 'jampickup', 'emitter-break': 'jamloss', 'core-hit': 'jamarmor', 'no-repair': 'bump', extra: 'oneup', respawn: 'powerup', 'boss-open': 'charge' }[e.type];
      if (sound) this.a.sfx(sound, { pan, vary: .02 });
      if (e.type === 'march' && e.tick !== this.marchAt) {
        this.marchAt = e.tick; this.a.sfx({ wave: 'triangle', freq: [82.4, 73.4, 65.4, 61.7][e.beat % 4], to: 44, dur: .11, vol: .16 }, { vary: 0 });
      }
      if (['alert', 'core-exposed', 'boss-entry', 'clear'].includes(e.type)) this.bark(e.type === 'boss-entry');
      if (['loss', 'emitter-break'].includes(e.type) && this.game.settings.shake > 0 && !this.game.reduceMotion) this.game.shake(1.5);
      if (e.type === 'victory') { this.a.music({ bpm: 116, steps: 2, tracks: [{ wave: 'triangle', vol: .25, notes: 'C5 E5 G5 C6 - G5 A5 B5 C6 - - -' }, { wave: 'sine', vol: .2, notes: 'C3 . E3 . G3 . C4 . F3 . G3 . C3 - - -' }] }, { loop: false }); }
      if (e.type === 'defeat') this.a.music({ bpm: 90, steps: 2, tracks: [{ wave: 'triangle', vol: .22, notes: 'E4 . Eb4 . D4 . C4 - - -' }] }, { loop: false });
    }
    stop() { this.a.music(null); for (const n of this.nodes) { try { n.stop(); } catch {} } this.nodes.clear(); this.a.setVolume(0); }
  }
  A.Audio = Audio;
})(globalThis);
