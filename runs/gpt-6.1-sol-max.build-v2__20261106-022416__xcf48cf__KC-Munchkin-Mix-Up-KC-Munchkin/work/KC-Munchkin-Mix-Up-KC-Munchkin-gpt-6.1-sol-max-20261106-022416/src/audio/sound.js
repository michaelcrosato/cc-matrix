(function (M) {
  "use strict";
  const SONG = {
    bpm: 116,
    steps: 4,
    tracks: [
      {
        name: "grin",
        wave: "triangle",
        vol: 0.28,
        notes:
          "D5 . F5 A5 . G5 F5 . | E5 . G5 B5 . A5 G5 . | F5 . A5 C6 . B5 A5 G5 | E5 . C5 E5 D5 - . .",
      },
      {
        name: "patter",
        wave: "pulse12",
        vol: 0.09,
        notes: ". . A4 . . . D5 . | . . B4 . . . E5 . | . . C5 . . . F5 . | . . A4 . . C5 . .",
      },
      {
        name: "tummy",
        wave: "triangle",
        vol: 0.3,
        notes:
          "D3 . A3 . D3 . F3 . | C3 . G3 . C3 . E3 . | Bb2 . F3 . Bb2 . D3 . | A2 . E3 . A2 . C#3 .",
      },
      {
        name: "mischief",
        wave: "square",
        vol: 0.07,
        on: false,
        notes:
          "A5 . D6 . C6 . A5 . | B5 . E6 . D6 . B5 . | C6 . F6 . E6 . C6 . | A5 G5 F5 E5 D5 - . .",
      },
      { name: "feet", wave: "drums", vol: 0.08, notes: "k . . h . . s . k . h . s . . h" },
    ],
  };
  const SFX = {
    bite: { wave: "triangle", freq: 560, to: 250, dur: 0.085, vol: 0.28 },
    power: {
      wave: "pulse12",
      freq: 330,
      to: 990,
      dur: 0.3,
      vol: 0.24,
      arp: [0, 4, 7],
      step: 0.065,
    },
    catch: { wave: "square", freq: 440, to: 900, dur: 0.22, vol: 0.2, arp: [0, 7, 12], step: 0.06 },
    warning: { wave: "triangle", freq: 680, to: 310, dur: 0.22, vol: 0.24 },
    "gate-warn": { wave: "sine", freq: 180, to: 310, dur: 0.13, vol: 0.22 },
    "gate-turn": { wave: "triangle", freq: 220, to: 420, dur: 0.18, vol: 0.18 },
    tunnel: { wave: "sine", freq: 870, to: 220, dur: 0.19, vol: 0.24 },
    chirp: { wave: "triangle", freq: 480, to: 1440, dur: 0.21, vol: 0.25, arp: [0, 7], step: 0.08 },
    hit: { wave: "saw", freq: 230, to: 65, dur: 0.35, vol: 0.18 },
    respawn: { wave: "sine", freq: 220, to: 660, dur: 0.2, vol: 0.2 },
    clear: { wave: "triangle", freq: 440, dur: 0.5, vol: 0.26, arp: [0, 4, 7, 12], step: 0.1 },
    victory: {
      wave: "triangle",
      freq: 294,
      dur: 0.8,
      vol: 0.26,
      arp: [0, 4, 7, 12, 16, 12],
      step: 0.11,
    },
    failure: { wave: "triangle", freq: 294, to: 73, dur: 0.65, vol: 0.2 },
    bump: { wave: "sine", freq: 130, to: 80, dur: 0.06, vol: 0.08 },
  };
  // Shared by live voices and OfflineAudioContext verification. No files, speech APIs or encoded samples.
  function phoneme(ctx, bus, time, freq, duration, volume, vowel = 0) {
    const o = ctx.createOscillator(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq, time);
    o.frequency.exponentialRampToValueAtTime(freq * 1.12, time + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime([880, 1350, 580, 1900][vowel % 4], time);
    filter.Q.value = 3.2;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    o.start(time);
    o.stop(time + duration + 0.01);
    return o;
  }
  class Sound {
    constructor(game) {
      this.game = game;
      this.audio = game.audio;
      this.unlocked = false;
      this.ended = false;
      this.lastEvent = 0;
      this.voices = [];
      this.voiceCooldown = 0;
      this.lastLast = false;
      this.paused = false;
    }
    unlock() {
      if (this.unlocked || this.ended) return;
      this.unlocked = true;
      this.audio.bus("sfx");
      if (this.audio.ctx?.state === "suspended") this.audio.ctx.resume().catch(() => {});
      this.audio.music(SONG, { sync: true });
    }
    babble(kind = "grin") {
      if (!this.unlocked || this.ended || !this.audio.ctx || this.game.real < this.voiceCooldown)
        return;
      const c = this.audio.ctx,
        b = this.audio.bus("voice"),
        base = kind === "alarm" ? 190 : kind === "laugh" ? 280 : 240,
        seq = kind === "laugh" ? [0, 7, 4, 7, 12, 7] : kind === "alarm" ? [7, 0, 3] : [0, 4, 2, 7];
      this.voiceCooldown = this.game.real + 1.1;
      for (let i = 0; i < seq.length; i++)
        this.voices.push(
          phoneme(c, b, c.currentTime + i * 0.085, base * 2 ** (seq[i] / 12), 0.09, 0.18, i),
        );
      if (this.voices.length > 64) this.voices.splice(0, this.voices.length - 64);
    }
    events(events) {
      for (const e of events) {
        if (e.id <= this.lastEvent) continue;
        this.lastEvent = e.id;
        if (!this.unlocked || this.ended) continue;
        if (SFX[e.type])
          this.audio.sfx(SFX[e.type], {
            pitch:
              e.type === "catch"
                ? 1 + e.points / 40
                : e.type === "bite"
                  ? 1 + Number(e.food.slice(1)) * 0.012
                  : 1,
          });
        if (e.type === "hit") this.babble("alarm");
        if (e.type === "go") this.babble();
        if (e.type === "clear" || e.type === "victory") this.babble("laugh");
      }
    }
    update(world, paused = false) {
      if (!this.unlocked || this.ended) return;
      const last = world && world.remaining <= 3 && world.phase === "playing";
      if (last !== this.lastLast) {
        this.audio.layer("mischief", last ? 0.07 : 0, 0.3);
        this.lastLast = last;
      }
      if (paused !== this.paused) {
        this.paused = paused;
        for (const node of this.voices)
          try {
            node.stop();
          } catch {}
        this.voices = [];
        if (this.audio.ctx) {
          this.audio._sfxBus.gain.value = paused ? 0 : this.audio.sfxVolume;
          this.audio._voiceBus.gain.value = paused ? 0 : this.audio.voiceVolume;
        }
      }
    }
    end() {
      this.ended = true;
      this.audio.music(null);
      this.audio.mute(true);
      for (const node of this.voices)
        try {
          node.stop();
        } catch {}
      this.voices = [];
      if (this.audio.ctx) this.audio.ctx.suspend().catch(() => {});
    }
  }
  M.SONG = SONG;
  M.SFX = SFX;
  M.phoneme = phoneme;
  M.Sound = Sound;
})(globalThis.Mix);
