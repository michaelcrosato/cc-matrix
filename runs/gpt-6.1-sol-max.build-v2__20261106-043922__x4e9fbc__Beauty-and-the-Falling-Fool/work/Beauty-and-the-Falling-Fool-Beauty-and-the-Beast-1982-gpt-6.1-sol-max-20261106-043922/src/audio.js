/* Original score, chip effects and tiny synthesized gibberish. No audio files. */
(() => {
  const F = FF;
  const tunes = {
    climb: {
      bpm: 112,
      steps: 4,
      tracks: [
        {
          name: 'melody',
          wave: 'pulse',
          vol: 0.11,
          notes:
            'D5 . F5 A5 . G5 F5 . E5 . C5 E5 . D5 . . | D5 . F5 A5 . C6 A5 . G5 . E5 C5 D5 - . .',
        },
        {
          name: 'bass',
          wave: 'triangle',
          vol: 0.16,
          notes:
            'D3 . . A3 . . D4 . C3 . . G3 . . C4 . | Bb2 . . F3 . . Bb3 . A2 . . E3 A3 . . .',
        },
        {
          name: 'drums',
          wave: 'drums',
          vol: 0.12,
          notes: 'k . h . . . h . s . h . . . h .',
        },
      ],
    },
    upper: {
      bpm: 122,
      steps: 4,
      tracks: [
        {
          wave: 'pulse12',
          vol: 0.09,
          notes:
            'F5 . A5 . C6 . A5 G5 F5 . E5 G5 A5 . . . | G5 . Bb5 . D6 . C6 A5 G5 . F5 E5 D5 - . .',
        },
        {
          wave: 'triangle',
          vol: 0.15,
          notes: 'D3 . A3 . F3 . C4 . Bb2 . F3 . A2 . E3 .',
        },
        { wave: 'drums', vol: 0.12, notes: 'k . h . s . h . k . h . s h h .' },
      ],
    },
    heart: {
      bpm: 150,
      steps: 4,
      tracks: [
        {
          wave: 'square',
          vol: 0.08,
          notes:
            'D5 F5 A5 C6 A5 F5 E5 G5 C6 E6 C6 G5 F5 A5 D6 F6 | E6 C6 A5 F5 E5 G5 C6 E6 D6 A5 F5 E5 D5 - . .',
        },
        {
          wave: 'triangle',
          vol: 0.14,
          notes: 'D3 . D4 . C3 . C4 . Bb2 . Bb3 . A2 . A3 .',
        },
        { wave: 'drums', vol: 0.12, notes: 'k h h . s . h h' },
      ],
    },
    rescue: {
      bpm: 116,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.2,
          notes:
            'D5 . F5 . A5 . C6 . D6 - - . A5 F5 D5 . | G5 . B5 . D6 . E6 . D6 - - - . . . .',
        },
        {
          wave: 'pulse',
          vol: 0.08,
          notes: 'D4 . . A4 . . D5 . G4 . . B4 . . D5 .',
        },
      ],
    },
  };
  F.synthVoice = (ctx, bus, time, freq = 240) => {
    const nodes = [];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator(),
        gain = ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(
        freq * [1, 1.28, 0.9, 1.13][i],
        time + i * 0.075,
      );
      o.frequency.exponentialRampToValueAtTime(
        freq * (i % 2 ? 1.2 : 0.8),
        time + i * 0.075 + 0.055,
      );
      gain.gain.setValueAtTime(0, time + i * 0.075);
      gain.gain.linearRampToValueAtTime(0.035, time + i * 0.075 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.075 + 0.065);
      o.connect(gain).connect(bus);
      o.start(time + i * 0.075);
      o.stop(time + i * 0.075 + 0.07);
      nodes.push(o);
    }
    return nodes;
  };
  class Sound {
    constructor(game) {
      this.game = game;
      this.last = 0;
      this.phrase = null;
      this.active = false;
      this.nodes = [];
      this.played = 0;
    }
    activate() {
      this.active = true;
    }
    stop() {
      this.game.audio.music(null);
      for (const n of this.nodes)
        try {
          n.stop();
        } catch {}
      this.nodes = [];
      this.phrase = null;
    }
    update(w, { silent = false } = {}) {
      if (silent || !this.active) {
        if (this.phrase) this.stop();
        return;
      }
      const a = this.game.audio,
        phase = w.rescued
          ? 'rescue'
          : w.powered()
            ? 'heart'
            : w.section > 1
              ? 'upper'
              : 'climb';
      if (this.phrase !== phase) {
        this.phrase = phase;
        a.music(tunes[phase], { sync: true, fade: 0.2 });
      }
      const cues = {
        jump: 'jump2',
        land: 'step',
        climb: 'door',
        heart: 'powerup',
        smash: 'stomp',
        tell: 'blip',
        launch: 'whoosh',
        bumper: 'bump',
        drop: 'charge',
        split: 'punch',
        impact: 'bump',
        hit: 'hurt',
        expiry: 'cancel',
        pursuit: 'oneup',
        checkpoint: 'secret',
        rescue: 'secret',
        departed: 'warp',
      };
      for (const e of w.events) {
        if (e.id <= this.last) continue;
        this.last = e.id;
        if (cues[e.type]) {
          a.sfx(cues[e.type], {
            vol: e.type === 'tell' ? 0.35 : 0.7,
            pitch: e.kind === 'bat' ? 0.7 : 1,
          });
          this.played++;
        }
        if (['heart', 'pursuit', 'hit', 'rescue'].includes(e.type) && a.ready) {
          this.nodes.push(
            ...F.synthVoice(
              a.ctx,
              a.bus('voice'),
              a.ctx.currentTime,
              e.type === 'pursuit' ? 115 : e.type === 'heart' ? 420 : 240,
            ),
          );
          if (this.nodes.length > 80) this.nodes = this.nodes.slice(-20);
        }
      }
      const left = w.powerUntil - w.time;
      if (
        left > 0 &&
        left < 1.5 &&
        this.lastExpiryTick !== Math.floor(w.time * 4)
      ) {
        this.lastExpiryTick = Math.floor(w.time * 4);
        a.sfx({ wave: 'triangle', freq: 660, to: 440, dur: 0.05, vol: 0.1 });
      }
      const warning = w
        .windows()
        .some(
          (win) =>
            win.phase === 'warning' &&
            w.actors.some(
              (p) =>
                p.traversal?.id === win.id ||
                (Math.abs(p.body.x - win.x) < 16 &&
                  Math.abs(p.body.z - win.z0) < 3),
            ),
        );
      const beat = Math.floor(w.time * 5);
      if (warning && this.lastTick !== beat) {
        this.lastTick = beat;
        a.sfx({ wave: 'triangle', freq: 880, to: 660, dur: 0.035, vol: 0.12 });
      }
    }
  }
  F.Sound = Sound;
})();
