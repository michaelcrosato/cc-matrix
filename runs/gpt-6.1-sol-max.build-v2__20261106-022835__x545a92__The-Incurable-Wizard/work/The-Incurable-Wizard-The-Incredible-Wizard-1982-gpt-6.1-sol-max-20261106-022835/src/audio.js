(function (root) {
  'use strict';
  const I = root.IW;
  const songs = {
    title: {
      bpm: 94,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.28,
          notes: 'D3 - . A3 . F3 . E3 | D3 - . C3 A2 - . .',
        },
        {
          wave: 'pulse12',
          vol: 0.12,
          notes: 'D5 . . A4 . . F5 . | E5 . D5 . A4 - . .',
        },
      ],
    },
    hunt: {
      bpm: 108,
      steps: 4,
      tracks: [
        {
          name: 'floor',
          wave: 'triangle',
          vol: 0.24,
          notes: 'D2 . . D3 . . A2 . | F2 . . C3 A2 . . .',
        },
        {
          wave: 'sine',
          vol: 0.13,
          notes: 'D4 . . . . A4 . . | F4 . . . E4 . . .',
        },
        {
          name: 'pulse',
          wave: 'drums',
          vol: 0.1,
          notes: 'k . . h . . k . | k . h . . h . h',
        },
      ],
    },
    chase: {
      bpm: 144,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.22,
          notes: 'D3 . A3 . F3 . E3 . | D3 . A3 . C4 . A3 .',
        },
        {
          wave: 'pulse12',
          vol: 0.12,
          notes: 'D5 . A5 . C5 . F5 . | E5 . A5 . C6 . A5 .',
        },
      ],
    },
    wizard: {
      bpm: 116,
      steps: 4,
      tracks: [
        {
          wave: 'saw',
          vol: 0.1,
          notes: 'D2 - . Eb2 . . A2 . | D2 - . Eb2 A1 - . .',
        },
        {
          wave: 'pulse12',
          vol: 0.09,
          notes: 'D5 . Eb5 . . A4 . . | F5 . E5 . Eb5 - . .',
        },
        {
          wave: 'drums',
          vol: 0.12,
          notes: 'k . . h s . . h | k . k . s . h .',
        },
      ],
    },
    victory: {
      bpm: 112,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.28,
          notes: 'D3 - A3 - B3 - G3 - | D4 - - - - - . .',
        },
        {
          wave: 'pulse12',
          vol: 0.12,
          notes: 'D5 . F#5 . A5 . B5 . | D6 - - - A5 - D6 -',
        },
      ],
    },
    defeat: {
      bpm: 76,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.22,
          notes: 'D3 - C3 - Bb2 - A2 - | D2 - - - . . . .',
        },
      ],
    },
  };
  const fx = {
    blocked: { wave: 'sine', freq: 180, to: 120, dur: 0.025, vol: 0.025 },
    fire: { wave: 'pulse12', freq: 760, to: 180, dur: 0.09, vol: 0.2 },
    ready: { wave: 'sine', freq: 1120, to: 1580, dur: 0.055, vol: 0.055 },
    impact: { wave: 'noise', freq: 440, to: 100, dur: 0.055, vol: 0.08 },
    kill: { wave: 'square', freq: 390, to: 70, dur: 0.18, vol: 0.16 },
    bell: {
      wave: 'sine',
      freq: 880,
      to: 876,
      dur: 1.1,
      vol: 0.25,
      arp: [0, 12, 7],
      step: 0.065,
    },
    portal: { wave: 'triangle', freq: 180, to: 1400, dur: 0.28, vol: 0.18 },
    chase: { wave: 'pulse12', freq: 650, to: 1350, dur: 0.3, vol: 0.18 },
    teleport: { wave: 'saw', freq: 900, to: 140, dur: 0.35, vol: 0.12 },
    lightning: { wave: 'noise', freq: 1800, to: 80, dur: 0.15, vol: 0.13 },
    lightningBlock: { wave: 'sine', freq: 1400, to: 700, dur: 0.12, vol: 0.15 },
    hurt: { wave: 'square', freq: 280, to: 45, dur: 0.4, vol: 0.2 },
    catch: {
      wave: 'triangle',
      freq: 500,
      to: 1800,
      dur: 0.3,
      vol: 0.22,
      arp: [0, 4, 7, 12],
      step: 0.05,
    },
    banish: {
      wave: 'saw',
      freq: 65,
      to: 750,
      dur: 0.6,
      vol: 0.2,
      arp: [0, 7, 12],
      step: 0.1,
    },
    escape: { wave: 'triangle', freq: 600, to: 180, dur: 0.3, vol: 0.15 },
    respawn: { wave: 'sine', freq: 300, to: 900, dur: 0.4, vol: 0.16 },
  };
  I.SONGS = songs;
  I.FX = fx;
  class Sound {
    constructor(game) {
      this.game = game;
      this.key = null;
      this.lastEvent = 0;
      this.voiceHandles = [];
      this.stopped = false;
      this.lastFoot = -1;
    }
    music(key) {
      if (this.key === key) return;
      this.key = key;
      this.game.audio.music(key ? songs[key] : null, { sync: true });
    }
    update(world, dt, quiet = false) {
      if (this.stopped) return;
      let key = !world
        ? 'title'
        : world.status === 'victory'
          ? 'victory'
          : world.status === 'defeat'
            ? 'defeat'
            : world.phase === 'Familiar'
              ? 'chase'
              : world.phase === 'Intrusion'
                ? 'wizard'
                : 'hunt';
      this.music(key);
      if (world && key === 'hunt' && this.musicRoom !== world.roomIndex) {
        this.musicRoom = world.roomIndex;
        this.game.audio.tempo(108 + world.roomIndex * 3);
      }
      if (!world) return;
      for (const e of world.events) {
        if (e.id <= this.lastEvent) continue;
        this.lastEvent = e.id;
        if (quiet) continue;
        const f = fx[e.type];
        if (f)
          this.game.audio.sfx(f, {
            pan:
              e.x === undefined
                ? 0
                : Math.max(-0.8, Math.min(0.8, (e.x / 336 - 0.5) * 1.6)),
          });
        if (['entry', 'apparition', 'banish'].includes(e.type))
          this.voice(e.id);
      }
      const beat = Math.floor(
        world.roomTime * (1 + Math.min(0.3, world.roomTime * 0.003)),
      );
      if (
        beat !== this.lastFoot &&
        world.enemies.some((e) => e.kind !== 'hopper' && !world.visible(e))
      ) {
        this.lastFoot = beat;
        if (!quiet)
          this.game.audio.sfx({
            wave: 'sine',
            freq: 85,
            to: 42,
            dur: 0.12,
            vol: 0.045,
          });
      }
    }
    voice(seed) {
      const a = this.game.audio,
        c = a.ctx,
        bus = a.bus('voice');
      if (!c || !bus || this.stopped) return;
      for (let i = 0; i < 6; i++) {
        const n = (seed * 31 + i * 17) % 7,
          o = c.createOscillator(),
          f = c.createBiquadFilter(),
          g = c.createGain(),
          t = c.currentTime + i * 0.075,
          d = 0.06 + n * 0.005;
        o.type = i % 2 ? 'triangle' : 'sawtooth';
        o.frequency.setValueAtTime(150 + n * 33, t);
        o.frequency.exponentialRampToValueAtTime(210 + n * 25, t + d);
        f.type = 'bandpass';
        f.frequency.setValueAtTime(700 + n * 220, t);
        f.Q.value = 2;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(f);
        f.connect(g);
        g.connect(bus);
        o.start(t);
        o.stop(t + d + 0.015);
        o.onended = () => {
          o.disconnect();
          f.disconnect();
          g.disconnect();
        };
        this.voiceHandles.push(o);
      }
      this.voiceHandles = this.voiceHandles.slice(-36);
    }

    stop() {
      this.stopped = true;
      this.music(null);
      for (const h of this.voiceHandles) {
        try {
          h.stop?.();
        } catch {}
      }
      this.voiceHandles = [];
      const a = this.game.audio;
      if (a.ctx) {
        a._master.gain.value = 0;
        try {
          a.ctx.suspend();
        } catch {}
      }
    }
    resume() {
      this.stopped = false;
      this.key = null;
      this.game.audio.applyVolume();
      if (this.game.audio.ctx?.state === 'suspended')
        this.game.audio.ctx.resume().catch(() => {});
    }
  }
  I.Sound = Sound;
})(globalThis);
