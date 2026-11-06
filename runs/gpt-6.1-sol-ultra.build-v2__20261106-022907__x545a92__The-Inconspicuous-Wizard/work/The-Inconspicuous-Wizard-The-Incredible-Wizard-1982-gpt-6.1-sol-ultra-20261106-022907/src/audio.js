/* Original compositions and synthesized character voices. No recorded audio. */
(() => {
  'use strict';
  const songs = {
    title: {
      bpm: 92,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.16,
          notes:
            'D3 - . A3 . F3 - . | D3 . E3 . A2 - . . | Bb2 - . F3 . E3 - . | A2 . C#3 . E3 - . .',
        },
        {
          wave: 'sine',
          vol: 0.12,
          notes:
            'D5 - . . A4 . F5 . | E5 - D5 . C#5 - . . | D5 . F5 - E5 . D5 . | C#5 - . A4 D5 - - .',
        },
        {
          wave: 'drums',
          vol: 0.04,
          notes:
            'k . . . . . h . | . . . . k . h . | k . . . . . h . | . . . . k . . .',
        },
      ],
    },
    hunt: {
      bpm: 106,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.13,
          notes:
            'D2 . D3 . A2 . D3 . | F2 . D3 . E2 . C#3 . | Bb1 . Bb2 . F2 . A2 . | A1 . E3 . A2 . C#3 .',
        },
        {
          wave: 'sine',
          vol: 0.12,
          notes:
            '. . A4 . . . F4 . | . . E4 . . . D4 . | . . F4 . . . E4 . | . . C#4 . E4 . A4 .',
        },
        {
          wave: 'drums',
          vol: 0.08,
          notes:
            'k . h . . . h . | k . h . s . h . | k . h . . . h . | k . h h s . h .',
        },
      ],
    },
    familiar: {
      bpm: 148,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.14,
          notes:
            'D3 . A3 . F3 . A3 . | E3 . A3 . C#3 . A3 . | Bb2 . F3 . D3 . F3 . | A2 . E3 . C#3 . A3 .',
        },
        {
          wave: 'sine',
          vol: 0.14,
          notes:
            'D5 F5 A5 . F5 E5 D5 . | C#5 E5 A5 . E5 D5 C#5 . | D5 F5 Bb5 . A5 F5 E5 . | C#5 E5 A5 . E5 . A4 .',
        },
        {
          wave: 'drums',
          vol: 0.08,
          notes: 'k . h h s . h . | k . h . s . h h',
        },
      ],
    },
    intrusion: {
      bpm: 128,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.14,
          notes:
            'D2 . D2 . Eb2 . A1 . | D2 . A1 . Eb2 . D2 . | Bb1 . Bb1 . B1 . F1 . | A1 . A1 . C#2 . E2 .',
        },
        {
          wave: 'pulse12',
          vol: 0.045,
          notes:
            'D5 . . Eb5 . A4 . . | D5 . F5 . E5 . C#5 . | Bb4 . . B4 . F4 . . | A4 . C#5 . E5 - . .',
        },
        {
          wave: 'drums',
          vol: 0.09,
          notes: 'k . h . s . h h | k . h h s . h .',
        },
      ],
    },
    victory: {
      bpm: 112,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.16,
          notes:
            'D3 - A3 . F#3 - A3 . | G3 - D4 . A3 - E4 . | B3 - F#4 . G3 - A3 . | D3 - - - . . . .',
        },
        {
          wave: 'sine',
          vol: 0.18,
          notes:
            'D5 . F#5 . A5 - . . | B5 . A5 . F#5 - E5 . | D5 . F#5 . A5 . C#6 . | D6 - - - . . . .',
        },
      ],
    },
    defeat: {
      bpm: 70,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.13,
          notes: 'D3 - . . A2 - . . | F2 - . . E2 - . . | D2 - - - . . . .',
        },
        {
          wave: 'sine',
          vol: 0.14,
          notes: 'A4 - F4 . E4 - C#4 . | D4 - - - . . . . | . . . . . . . .',
        },
      ],
    },
  };
  const sounds = {
    fire: { wave: 'pulse12', freq: 820, to: 180, dur: 0.095, vol: 0.12 },
    ready: { wave: 'sine', freq: 920, to: 1460, dur: 0.055, vol: 0.025 },
    blocked: { wave: 'triangle', freq: 145, to: 100, dur: 0.055, vol: 0.025 },
    wall: { wave: 'noise', freq: 340, to: 100, dur: 0.045, vol: 0.045 },
    kill: { wave: 'triangle', freq: 490, to: 75, dur: 0.19, vol: 0.15 },
    spawn: { wave: 'sine', freq: 200, to: 540, dur: 0.16, vol: 0.05 },
    bell: {
      wave: 'sine',
      freq: 1046.5,
      dur: 0.9,
      vol: 0.17,
      arp: [0, 7, 12],
      step: 0.045,
    },
    portal: { wave: 'triangle', freq: 220, to: 1760, dur: 0.23, vol: 0.12 },
    familiar: {
      wave: 'sine',
      freq: 1175,
      to: 1568,
      dur: 0.15,
      vol: 0.05,
      arp: [0, 3, 7],
      step: 0.035,
    },
    catch: {
      wave: 'triangle',
      freq: 587,
      dur: 0.3,
      vol: 0.15,
      arp: [0, 4, 7, 12],
      step: 0.075,
    },
    teleport: { wave: 'saw', freq: 80, to: 620, dur: 0.3, vol: 0.045 },
    lightning: { wave: 'noise', freq: 900, to: 160, dur: 0.16, vol: 0.1 },
    banish: {
      wave: 'triangle',
      freq: 146,
      to: 1600,
      dur: 0.65,
      vol: 0.16,
      arp: [0, 7, 12],
      step: 0.09,
    },
    hurt: { wave: 'saw', freq: 300, to: 45, dur: 0.32, vol: 0.09 },
    cloak: { wave: 'pulse12', freq: 95, to: 65, dur: 0.085, vol: 0.022 },
    radar: { wave: 'sine', freq: 1568, dur: 0.06, vol: 0.018 },
    award: {
      wave: 'triangle',
      freq: 784,
      dur: 0.28,
      vol: 0.12,
      arp: [0, 4, 7],
      step: 0.075,
    },
  };
  // A formant-filtered babble: each syllable has a finite source and gain envelope.
  function syllable(ctx, bus, time, pitch, vowel = 0, volume = 0.12) {
    const osc = ctx.createOscillator(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.35, time + 0.065);
    filter.type = 'bandpass';
    filter.frequency.value = [730, 1090, 390, 610, 860][vowel % 5];
    filter.Q.value = 4.3;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.105);
    osc.connect(filter).connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + 0.115);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    return osc;
  }
  class WizardAudio {
    constructor(game) {
      this.game = game;
      this.mode = null;
      this.unlocked = false;
      this.stopped = false;
      this.voices = new Set();
      this.lastEvent = 0;
      this.radarAt = 0;
      this.footAt = 0;
      for (const [k, v] of Object.entries(sounds))
        game.audio.define('warden-' + k, v);
    }
    unlock() {
      if (this.stopped) return;
      this.unlocked = true;
      this.game.audio.bus('voice');
      if (this.mode) this.game.audio.music(songs[this.mode], { sync: true });
    }
    music(mode) {
      if (this.mode === mode || this.stopped) return;
      this.mode = mode;
      if (this.unlocked)
        this.game.audio.music(songs[mode] || songs.hunt, {
          sync: true,
          fade: 0.4,
        });
    }
    sfx(name, x = 9) {
      if (!this.unlocked || this.stopped) return;
      this.game.audio.sfx('warden-' + (sounds[name] ? name : 'wall'), {
        pan: Math.max(-0.8, Math.min(0.8, (x - 9) / 12)),
        vol: name === 'radar' && this.game.settings.radarAssist ? 1.8 : 1,
      });
    }
    babble() {
      if (!this.unlocked || this.stopped) return;
      const a = this.game.audio,
        c = a.ctx,
        bus = a.bus('voice');
      if (!c || !bus) return;
      for (let i = 0; i < 7; i++) {
        const o = syllable(
          c,
          bus,
          c.currentTime + i * 0.12,
          110 + (i % 3) * 37,
          i,
          0.12,
        );
        this.voices.add(o);
        o.addEventListener('ended', () => this.voices.delete(o));
      }
    }
    events(s) {
      for (const ev of s.events || []) {
        if (ev.id <= this.lastEvent) continue;
        this.lastEvent = ev.id;
        const k = ev.type || ev.kind;
        const key =
          {
            'enemy-hit': 'kill',
            'wall-hit': 'wall',
            'wizard-rune': 'teleport',
            'wizard-appear': 'teleport',
            'wizard-teleport': 'teleport',
            'wizard-hit': 'banish',
            'wizard-banish': 'banish',
            'life-lost': 'hurt',
            'familiar-hit': 'catch',
            'familiar-escape': 'familiar',
            recovery: 'award',
            lightning: 'lightning',
            shot: 'fire',
            bolt: 'fire',
            impact: 'wall',
            enemyKilled: 'kill',
            enemyDeath: 'kill',
            resonator: 'bell',
            ring: 'bell',
            familiarCaught: 'catch',
            familiarEscape: 'familiar',
            wizardSpawn: 'teleport',
            wizardTeleport: 'teleport',
            wizardFire: 'lightning',
            wizardBanish: 'banish',
            damage: 'hurt',
            life: 'award',
            bonus: 'award',
            clear: 'award',
          }[k] || k;
        if (sounds[key]) this.sfx(key, ev.x);
        if (k === 'wizard-rune' || k === 'wizardSpawn' || k === 'intrusion')
          this.babble();
      }
      this.music(
        ['victory', 'defeat', 'familiar', 'intrusion'].includes(s.phase)
          ? s.phase
          : 'hunt',
      );
      const hidden = (s.enemies || []).find((e) => !e.visible);
      if (hidden && s.time > this.footAt) {
        this.footAt = s.time + (hidden.type === 'skitter' ? 0.4 : 0.75);
        this.sfx('cloak', hidden.x);
      }
      if ((s.enemies || []).some((e) => !e.visible) && s.time > this.radarAt) {
        this.radarAt = s.time + (this.game.settings.radarAssist ? 1.1 : 2.8);
        this.sfx('radar');
      }
    }
    silence() {
      for (const o of this.voices)
        try {
          o.stop();
        } catch {}
      this.voices.clear();
      this.game.audio.music(null);
      this.mode = null;
    }
    stop() {
      this.silence();
      this.stopped = true;
      if (this.game.audio.ctx) this.game.audio.ctx.suspend().catch(() => {});
    }
  }
  globalThis.WizardAudio = WizardAudio;
  globalThis.WizardAudioData = { songs, sounds, syllable };
})();
