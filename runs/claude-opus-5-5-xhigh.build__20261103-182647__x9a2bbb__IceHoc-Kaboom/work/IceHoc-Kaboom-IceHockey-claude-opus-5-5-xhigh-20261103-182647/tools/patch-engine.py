# Applies Ice Hoc-Kaboom's engine changes to engine/my-3d2dge.js once (idempotent: each patch checks a marker).
import sys, io
src, p = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
def rep(old, new, marker):
    global s
    if marker in s: return
    if s.count(old) != 1: raise SystemExit('patch anchor not unique/missing: ' + old[:80] + ' count=' + str(s.count(old)))
    s = s.replace(old, new)

# 1. PlayStation face-button symbols in the 5x7 font
rep("const parseFont = (src, h) => {",
"""/* [ICE HOC-KABOOM] the PlayStation face-button symbols, so canvas prompts can print them */
Object.assign(G57, { '✕': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '○': '.....|.###.|#...#|#...#|#...#|.###.|.....',
  '□': '.....|#####|#...#|#...#|#...#|#####|.....', '△': '.....|..#..|.#.#.|.#.#.|#...#|#####|.....',
  '·': '..|..|..|##|##|..|..', '—': '......|......|......|######|......|......|......', '…': '.....|.....|.....|.....|.....|.....|#.#.#', '✓': '.....|....#|...##|#.##.|###..|.#...|.....',
  '☆': '..#..|..#..|##.##|#...#|.#.#.|#.#.#|.....', '◂': '...#|..##|.###|####|.###|..##|...#', '’': '#|#|.|.|.|.|.', '“': '#.#|#.#|...|...|...|...|...', '”': '#.#|#.#|...|...|...|...|...', '♦': '..#..|.###.|#####|.###.|..#..|.....|.....' });
const parseFont = (src, h) => {""", "the PlayStation face-button symbols")

# 2. AI Hub: Create (8) held -> Options (9) ignored
rep("p.buttons.forEach((b, i) => { const on = b.pressed;",
    "const createHeld = !!(p.buttons[8] && p.buttons[8].pressed);   /* [ICE HOC-KABOOM] Create + Options is AI Hub's: Options ignored while Create is held */\n      p.buttons.forEach((b, i) => { const on = b.pressed && !(i === 9 && createHeld);", "createHeld")
rep("const on = !!(p.buttons[9] && p.buttons[9].pressed), prev =",
    "const on = !!(p.buttons[9] && p.buttons[9].pressed && !(p.buttons[8] && p.buttons[8].pressed)), prev =", "p.buttons[9].pressed && !(p.buttons[8]")

# 3. Humanoid: hockey sticks as weapons, and a gear hook drawing extra parts into the rig's depth-sorted ops
rep("if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon))",
    "if (this.o.weapon && !['sword', 'gun', 'staff', 'stick', 'gstick'].includes(this.o.weapon))", "'stick', 'gstick'")
HD_END = """      } });
    }
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */"""
rep(HD_END, """      } });
    }
    /* [ICE HOC-KABOOM] o.gear(K): a game's own gear (hockey sticks, skates, pads, helmets, numbers) pushed into the same
       depth-sorted ops as the body: K = { g, ops, S, Sp, Q, J, u, cap, limb, slab, lq, dC, facingCam, rig, view, hd: true } */
    if (o.gear) o.gear({ g, ops, S, Sp, Q, J, u, cap, limb, slab, lq, dC, facingCam, rig: this, view, hd: true, tones, px });
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */""", "o.gear(K)")
CL_END = """      });
    }
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  _hat(g, Sp, J, r, H) {"""
rep(CL_END, """      });
    }
    if (o.gear) o.gear({ g, ops, S, Sp, Q, J, u: sc, lq, dC, rig: this, view, hd: false, tones, px, seg });   /* [ICE HOC-KABOOM] gear hook (classic style) */
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  _hat(g, Sp, J, r, H) {""", "gear hook (classic style)")

# 4. Audio: organ and brass waves, a lowpass on oscillator voices, a voice bus, audio.bus(name)
rep("      this._musBus = c.createGain(); this._musBus.connect(this._master);\n      this.applyVolume();",
    "      this._musBus = c.createGain(); this._musBus.connect(this._master);\n      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master);   /* [ICE HOC-KABOOM] a bus for spoken babble */\n      this.applyVolume();", "this._voiceBus = c.createGain()")
rep("this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); }",
    "this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume === undefined ? 1 : this.voiceVolume; }\n  /** [ICE HOC-KABOOM] a bus's gain node to connect a sound graph of your own to: 'master' | 'sfx' | 'music' | 'voice' (null before sound starts) */\n  bus(name) { if (!this._init()) return null; return { master: this._master, sfx: this._sfxBus, music: this._musBus, voice: this._voiceBus }[name] || this._sfxBus; }", "bus(name) {")
rep("      if (wave === 'pulse' || wave === 'pulse12') src.setPeriodicWave(this._pulse(wave === 'pulse' ? .25 : .125));",
    """      if (wave === 'pulse' || wave === 'pulse12') src.setPeriodicWave(this._pulse(wave === 'pulse' ? .25 : .125));
      else if (wave === 'organ' || wave === 'brass') src.setPeriodicWave(this._harm(wave));   /* [ICE HOC-KABOOM] drawbar organ and brass */""", "this._harm(wave)")
rep("      src.connect(g); src.start(t);\n    }\n    g.connect(bus); src.stop(end + .05);",
    """      if (p.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = p.q || .8; f.frequency.setValueAtTime(p.lp, t); if (p.lpTo) f.frequency.exponentialRampToValueAtTime(p.lpTo, end); src.connect(f); f.connect(g); }   /* [ICE HOC-KABOOM] a lowpass on an oscillator (lp, lpTo, q) */
      else src.connect(g);
      src.start(t);
    }
    g.connect(bus); src.stop(end + .05);""", "a lowpass on an oscillator")
rep("  _voice(p, bus, t0, mul = 1) {",
    """  /* [ICE HOC-KABOOM] harmonic tables: an organ's drawbars (1, 2, 3, 4, 6, 8) and a brassy saw weighted to the odd harmonics */
  _harm(kind) {
    const key = 'h:' + kind; if (this._waves[key]) return this._waves[key];
    const N = 24, re = new Float32Array(N), im = new Float32Array(N);
    if (kind === 'organ') { const H = { 1: 1, 2: .8, 3: .55, 4: .4, 6: .2, 8: .15 }; for (const n in H) im[n] = H[n]; }
    else for (let n = 1; n < N; n++) im[n] = (n % 2 ? 1 : .55) / Math.pow(n, .85);
    return (this._waves[key] = this.ctx.createPeriodicWave(re, im));
  }
  _voice(p, bus, t0, mul = 1) {""", "_harm(kind) {")
rep("this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: true, attack: .006, vib: t.vib }, bus, time);",
    "this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: !t.decay, attack: t.attack || .006, vib: t.vib, lp: t.lp, q: t.q }, bus, time);   /* [ICE HOC-KABOOM] tracks take lp, q, attack and decay */", "tracks take lp, q, attack and decay")

# 5. Dialog: a voice function babbles each letter in the speaker's own voice
rep("    if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);",
    """    const vo = this._voiceFn || this.voice;   /* [ICE HOC-KABOOM] voice may be a function (ch, index, text, page), per say() too */
    if (typeof vo === 'function') { const txt = this._page.join(' '); for (let q = prev; q < Math.floor(this.shown); q++) vo(this._page.join('')[q] || ' ', q, txt, this.i); }
    else if (vo && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(vo);""", "_voiceFn || this.voice")
rep("    this.auto = o.auto || 0; this.modal = o.modal !== false; this._wait = 0;",
    "    this.auto = o.auto || 0; this.modal = o.modal !== false; this._wait = 0; this._voiceFn = o.voice || null;", "this._voiceFn = o.voice || null")

# 6. the floor bake cache: a match uses a few views and zooms (broadcast, overhead, fights, replays); keep 12, not 6
rep("if (Object.keys(this.floors).length > 6) this.floors = {};", "if (Object.keys(this.floors).length > 12) this.floors = {};   /* [ICE HOC-KABOOM] 12 bakes kept, not 6 */", "12 bakes kept")
io.open(p, 'w', encoding='utf8').write(s)
print('engine patched')
