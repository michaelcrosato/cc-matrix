#!/usr/bin/env python3
"""Applies OutBloom's engine changes (CHANGES.md) to a pristine my-3d2dge.js v0.85.2.
Usage: python3 engine/patch-engine.py <pristine my-3d2dge.js> <out my-3d2dge.js> <road-ob.js>"""
import sys, re
src, out, roadf = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf8').read()
n_changes = 0
def rep(old, new, count=1):
    global s, n_changes
    if s.count(old) < 1:
        raise SystemExit('patch failed, not found: ' + old[:120])
    s = s.replace(old, new, count); n_changes += 1

# ---- E3: analog input (trigger values), input.analog(action), input.setAnalog(action, v) ----
rep("this.held = new Set(); this.clock = 0;", "this.held = new Set(); this.padValues = []; this._analog = {}; this.clock = 0;")
rep("      this.padPrev = []; this.padMove = [0, 0]; this.padAim = null; this.padAxes = [];\n      this.padIndex",
    "      this.padPrev = []; this.padMove = [0, 0]; this.padAim = null; this.padAxes = []; this.padValues = [];\n      this.padIndex")
# E4 (inside the same loop): while AIHub is active, Options (button 9) is ignored while Create (button 8) is held
rep("      p.buttons.forEach((b, i) => { const on = b.pressed; if (on && !this.padPrev[i]) this.press('Pad' + i);",
    "      const hubCombo = typeof window !== 'undefined' && window.AIHub && window.AIHub.active && p.buttons[8] && p.buttons[8].pressed;   // (OutBloom E4: Create + Options is the hub's)\n"
    "      this.padValues = Array.from(p.buttons, b => (b && typeof b.value === 'number' && b.value > 0 ? b.value : b && b.pressed ? 1 : 0));\n"
    "      p.buttons.forEach((b, i) => { const on = b.pressed && !(hubCombo && i === 9); if (on && !this.padPrev[i]) this.press('Pad' + i);")
rep("  down(a) { const m = this.map[a];",
    "  /** OutBloom E3: how far an action is pressed, 0..1: the largest of its gamepad buttons' values (the triggers are\n"
    "   *  progressive), 1 for a held key or a held Act:, or the value a test or bot set with setAnalog */\n"
    "  analog(a) {\n"
    "    const set = this._analog[a]; if (set !== undefined) return set;\n"
    "    const m = this.map[a]; if (!m || this._suppressed.has(a)) return 0; let v = 0;\n"
    "    for (const c of m) { if (/^Pad\\d+$/.test(c)) { const pv = this.padValues[+c.slice(3)] || 0; if (pv > v) v = pv; } else if (this.held.has(c)) v = 1; }\n"
    "    return clamp(v, 0, 1);\n"
    "  }\n"
    "  /** OutBloom E3: fix an action's analog value (tests, bots): null or undefined lets the devices speak again */\n"
    "  setAnalog(a, v) { if (v === null || v === undefined) delete this._analog[a]; else this._analog[a] = clamp(+v || 0, 0, 1); }\n"
    "  down(a) { const m = this.map[a];")

# ---- E5: button symbols default to PlayStation, with Xbox as the other choice ----
rep("glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']]",
    "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']]")
rep("this.glyphs = 'auto';", "this.glyphs = 'playstation';")

# ---- E6 / E7: instruments, chords, accents, slides, a bigger drum kit, sends (delay, reverb), a voice bus, loops ----
rep("const DRUMS = {\n  k:", "const INSTRUMENTS = {};   // (OutBloom E6) name -> (audio, freq, time, dur, vol, bus, o) => schedules a note\nE.INSTRUMENTS = INSTRUMENTS;\nconst DRUMS = {\n  k:")
rep("  t: [{ wave: 'triangle', freq: 180, to: 90, dur: .16, vol: .45 }]\n};",
    "  t: [{ wave: 'triangle', freq: 180, to: 90, dur: .16, vol: .45 }],\n"
    "  // OutBloom E6: claps, rim, congas, cowbell, shaker, timbale, ride, high tom\n"
    "  p: [{ wave: 'noise', freq: 1400, dur: .03, vol: .3 }, { wave: 'noise', freq: 1300, dur: .03, vol: .26, delay: .012 }, { wave: 'noise', freq: 1200, dur: .11, vol: .3, delay: .024 }],\n"
    "  r: [{ wave: 'square', freq: 1700, to: 900, dur: .025, vol: .16 }, { wave: 'noise', freq: 3200, dur: .02, vol: .16 }],\n"
    "  g: [{ wave: 'sine', freq: 210, to: 170, dur: .2, vol: .5 }],\n"
    "  G: [{ wave: 'sine', freq: 330, to: 290, dur: .14, vol: .42 }],\n"
    "  b: [{ wave: 'square', freq: 800, dur: .09, vol: .12 }, { wave: 'square', freq: 540, dur: .09, vol: .12 }],\n"
    "  z: [{ wave: 'noise', freq: 9000, dur: .05, vol: .09, filter: 'highpass', attack: .02 }],\n"
    "  m: [{ wave: 'triangle', freq: 520, to: 440, dur: .16, vol: .3 }, { wave: 'noise', freq: 2500, dur: .05, vol: .14 }],\n"
    "  y: [{ wave: 'noise', freq: 6000, dur: .35, vol: .07, filter: 'bandpass', q: 3 }, { wave: 'square', freq: 3400, dur: .2, vol: .015 }],\n"
    "  T: [{ wave: 'triangle', freq: 260, to: 150, dur: .14, vol: .45 }]\n};")
rep("this._ats = []; this._beats = []; this._fading = []; this._stings = []; this._fr = null; this._timer = null;",
    "this._ats = []; this._beats = []; this._fading = []; this._stings = []; this._fr = null; this._timer = null;\n"
    "    /** OutBloom E6: voiceVolume: 0..1 for voices (their own bus) */\n"
    "    this.voiceVolume = 1; this._loopsOn = true;")
rep("      this._musBus = c.createGain(); this._musBus.connect(this._master);\n      this.applyVolume();",
    "      this._musBus = c.createGain(); this._musBus.connect(this._master);\n"
    "      // OutBloom E6/E7: a voice bus; a bus for continuous loops (silent while paused); a tempo delay and two reverbs\n"
    "      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master);\n"
    "      this._loopBus = c.createGain(); this._loopBus.connect(this._sfxBus);\n"
    "      const imp = (sec, decay) => { const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (this._rnd() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; };\n"
    "      this._dly = c.createDelay(2); this._dly.delayTime.value = .375; this._dlyIn = c.createGain(); this._dlyFb = c.createGain(); this._dlyFb.gain.value = .3; this._dlyOut = c.createGain(); this._dlyOut.gain.value = .55;\n"
    "      const dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 3200;\n"
    "      this._dlyIn.connect(this._dly); this._dly.connect(dlf); dlf.connect(this._dlyFb); this._dlyFb.connect(this._dly); dlf.connect(this._dlyOut); this._dlyOut.connect(this._musBus);\n"
    "      try { this._rev = c.createConvolver(); this._rev.buffer = imp(2.4, 2.6); this._revIn = c.createGain(); this._revOut = c.createGain(); this._revOut.gain.value = .9; this._revIn.connect(this._rev); this._rev.connect(this._revOut); this._revOut.connect(this._musBus);\n"
    "        this._srev = c.createConvolver(); this._srev.buffer = imp(1.6, 2.2); this._srevIn = c.createGain(); this._srevOut = c.createGain(); this._srevOut.gain.value = this._srevAmt = .15; this._srevIn.connect(this._srev); this._srev.connect(this._srevOut); this._srevOut.connect(this._master);\n"
    "        this._sfxBus.connect(this._srevIn); this._voiceBus.connect(this._srevIn); } catch (e) { this._rev = null; }\n"
    "      this.applyVolume();")
rep("applyVolume() { if (!this.ctx) return; this._master.gain.value = this.muted ? 0 : this.volume; this._sfxBus.gain.value = this.sfxVolume; this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); }",
    "applyVolume() { if (!this.ctx) return; this._master.gain.value = this.muted ? 0 : this.volume; this._sfxBus.gain.value = this.sfxVolume; this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1) * (this.musicDuck === undefined ? 1 : this.musicDuck);\n"
    "    if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume; if (this._loopBus) this._loopBus.gain.value = this._ducked || !this._loopsOn ? 0 : 1; }\n"
    "  /** OutBloom E6: the voice bus (babble) for a game's own scheduling, made at the first sound; null without sound */\n"
    "  get voiceBus() { return this._init() ? this._voiceBus : null; }\n"
    "  /** OutBloom E6: the effects bus (sound effects) for a game's own voices; null without sound */\n"
    "  get sfxBus() { return this._init() ? this._sfxBus : null; }\n"
    "  /** OutBloom E6: the reverb on effects and voices, 0..1 (a tunnel's echo), faded over fade seconds */\n"
    "  reverb(amount, fade = .5) { if (!this.ctx || !this._srevOut) return; const g = this._srevOut.gain, n = this.ctx.currentTime; this._srevAmt = clamp(amount, 0, 1.5); g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(this._srevAmt, n + Math.max(.02, fade)); }\n"
    "  /** OutBloom E6: music volume scale on top of the music setting (ducking under speech): 0..1, faded */\n"
    "  musicLevel(v, fade = .25) { this.musicDuck = clamp(v, 0, 1); if (!this.ctx) return; const g = this._musBus.gain, n = this.ctx.currentTime; g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(this.musicVolume * (this._ducked || this.ducked ? .35 : 1) * this.musicDuck, n + fade); }\n"
    "  /** OutBloom E7: a continuous voice (a car's engine, tyres, wind, bees, ambience): loop({ waves: [{ wave, mul, vol,\n"
    "   *  detune }], freq, vol, filter, f, q, pan, am: [rate, depth], shape, bus: 'sfx' | 'music' | 'voice', attack }) ->\n"
    "   *  { set({ freq, vol, f, q, pan, mix: [v...], rate }, ramp), stop(fade), params }. Silent while paused or muted; a\n"
    "   *  headless game (no sound) gets one that does nothing */\n"
    "  loop(sp = {}) {\n"
    "    const params = { freq: sp.freq || 110, vol: sp.vol === undefined ? .2 : sp.vol, f: sp.f || 2400, q: sp.q || .7, pan: sp.pan || 0 };\n"
    "    const dummy = { params, dead: false, set(p) { Object.assign(params, p); return this; }, stop() { this.dead = true; } };\n"
    "    if (!this._init() || !this.ctx) return dummy;\n"
    "    const c = this.ctx, now = c.currentTime, out = c.createGain(); out.gain.value = 0;\n"
    "    const pan = c.createStereoPanner ? c.createStereoPanner() : null; let node = out; if (pan) { pan.pan.value = params.pan; out.connect(pan); node = pan; }\n"
    "    node.connect(sp.bus === 'music' ? this._musBus : sp.bus === 'voice' ? this._voiceBus : this._loopBus);\n"
    "    const filt = c.createBiquadFilter(); filt.type = sp.filter || 'lowpass'; filt.frequency.value = params.f; filt.Q.value = params.q;\n"
    "    let into = filt; if (sp.shape) { const sh = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; cv[i] = Math.tanh(x * sp.shape); } sh.curve = cv; sh.connect(filt); into = sh; }\n"
    "    filt.connect(out);\n"
    "    let am = null; if (sp.am) { const lfo = c.createOscillator(), lg = c.createGain(), amg = c.createGain(); lfo.frequency.value = sp.am[0]; lg.gain.value = sp.am[1]; amg.gain.value = 1 - sp.am[1]; lfo.connect(lg); lg.connect(amg.gain); filt.disconnect(); filt.connect(amg); amg.connect(out); lfo.start(now); am = lfo; }\n"
    "    const oscs = [];\n"
    "    for (const w of sp.waves || [{ wave: sp.wave || 'saw' }]) {\n"
    "      let src; const g = c.createGain(); g.gain.value = w.vol === undefined ? 1 : w.vol;\n"
    "      if (w.wave === 'noise') { src = c.createBufferSource(); src.buffer = this._noise; src.loop = true; if (w.filter) { const nf = c.createBiquadFilter(); nf.type = w.filter; nf.frequency.value = w.f || 1000; nf.Q.value = w.q || 1; src.connect(nf); nf.connect(g); src._nf = nf; } else src.connect(g); src.start(now, this._rnd() * .5); }\n"
    "      else { src = c.createOscillator(); if (w.wave === 'pulse' || w.wave === 'pulse12') src.setPeriodicWave(this._pulse(w.wave === 'pulse' ? .25 : .125)); else src.type = w.wave === 'saw' ? 'sawtooth' : ['square', 'triangle', 'sine', 'sawtooth'].includes(w.wave) ? w.wave : 'sawtooth';\n"
    "        src.frequency.value = Math.max(10, params.freq * (w.mul || 1)); if (w.detune) src.detune.value = w.detune; src.connect(g); src.start(now); }\n"
    "      g.connect(into); oscs.push({ src, g, w });\n"
    "    }\n"
    "    const tc = r => Math.max(.005, r / 3);\n"
    "    const L = { params, dead: false,\n"
    "      set(p, ramp = .05) {\n"
    "        if (this.dead) return this; const n = c.currentTime; Object.assign(params, p);\n"
    "        if (p.freq !== undefined) for (const o of oscs) { if (o.src.frequency) o.src.frequency.setTargetAtTime(Math.max(10, p.freq * (o.w.mul || 1)), n, tc(ramp)); }\n"
    "        if (p.vol !== undefined) out.gain.setTargetAtTime(Math.max(0, p.vol), n, tc(ramp));\n"
    "        if (p.f !== undefined) filt.frequency.setTargetAtTime(clamp(p.f, 20, 18000), n, tc(ramp));\n"
    "        if (p.q !== undefined) filt.Q.setTargetAtTime(Math.max(.0001, p.q), n, tc(ramp));\n"
    "        if (p.pan !== undefined && pan) pan.pan.setTargetAtTime(clamp(p.pan, -1, 1), n, tc(ramp));\n"
    "        if (p.mix) p.mix.forEach((v, i) => { if (oscs[i]) oscs[i].g.gain.setTargetAtTime(Math.max(0, v), n, tc(ramp)); });\n"
    "        if (p.nf !== undefined) for (const o of oscs) if (o.src._nf) o.src._nf.frequency.setTargetAtTime(clamp(p.nf, 20, 18000), n, tc(ramp));\n"
    "        if (p.rate !== undefined) for (const o of oscs) if (o.src.playbackRate) o.src.playbackRate.setTargetAtTime(Math.max(.05, p.rate), n, tc(ramp));\n"
    "        if (p.amRate !== undefined && am) am.frequency.setTargetAtTime(p.amRate, n, tc(ramp));\n"
    "        return this;\n"
    "      },\n"
    "      stop(fade = .12) { if (this.dead) return; this.dead = true; const n = c.currentTime; out.gain.cancelScheduledValues(n); out.gain.setTargetAtTime(0, n, tc(fade)); setTimeout(() => { for (const o of oscs) { try { o.src.stop(); } catch (e) { /* gone */ } } if (am) try { am.stop(); } catch (e) { /* gone */ } try { node.disconnect(); } catch (e) { /* gone */ } }, fade * 1000 + 250); } };\n"
    "    out.gain.setTargetAtTime(params.vol, now, tc(sp.attack || .06));\n"
    "    return L;\n"
    "  }\n"
    "  /** OutBloom E7: loops on or off (a game's own pause, the end of a round) */\n"
    "  loops(on) { this._loopsOn = !!on; this.applyVolume(); }")
# the music's notes: instruments, chords (C4+E4+G4), accents (C4!), slides (C4~), the kit's case (G and T), sends
rep("""  _note(t, i, time, spb, bus) {
    const tok = t.tokens[i]; if (tok === '.' || tok === '-' || tok === '_') return;
    const vol = t.vol === undefined ? .18 : t.vol;
    if (t.wave === 'drums' || t.wave === 'noise') {
      const kit = DRUMS[tok[0].toLowerCase()]; if (!kit) { warn('drum:' + tok, 'music: drum token "' + tok + '" is unknown (k s h o c t or .)'); return; }
      for (const v of kit) this._voice(Object.assign({}, v, { vol: v.vol * vol / .18 }), bus, time);
      return;
    }
    let n = 1; while (i + n < t.tokens.length && t.tokens[i + n] === '-') n++;
    const f = noteFreq(tok); if (!f) { warn('note:' + tok, 'music: "' + tok + '" is not a note (use C4, F#3, Bb2, "." for rest, "-" to hold)'); return; }
    this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: true, attack: .006, vib: t.vib }, bus, time);
  }""", """  _note(t, i, time, spb, bus) {
    let tok = t.tokens[i]; if (tok === '.' || tok === '-' || tok === '_') return;
    const vol = t.vol === undefined ? .18 : t.vol; let acc = 1, slide = false;
    if (tok.length > 1 && tok.endsWith('!')) { acc = 1.45; tok = tok.slice(0, -1); }
    if (tok.length > 1 && tok.endsWith('~')) { slide = true; tok = tok.slice(0, -1); }
    if (t.wave === 'drums' || t.wave === 'noise') {
      for (const ch of tok.split('+')) {
        const kit = DRUMS[ch[0]] || DRUMS[ch[0].toLowerCase()]; if (!kit) { warn('drum:' + ch, 'music: drum token "' + ch + '" is unknown (k s h o c t p r g G b z m y T or .)'); continue; }
        for (const v of kit) this._voice(Object.assign({}, v, { vol: v.vol * vol * acc / .18 }), bus, time);
      }
      return;
    }
    let n = 1; while (i + n < t.tokens.length && t.tokens[i + n] === '-') n++;
    const parts = tok.split('+'), dur = n * spb * (t.gate || .9), each = vol * acc / Math.sqrt(parts.length), inst = t.inst && INSTRUMENTS[t.inst];
    for (const nt of parts) {
      const f = noteFreq(nt); if (!f) { warn('note:' + nt, 'music: "' + nt + '" is not a note (use C4, F#3, Bb2, "." for rest, "-" to hold)'); continue; }
      const freq = f * Math.pow(2, t.octave || 0);
      if (inst) { try { inst(this, freq, time, dur, each, bus, { slide, track: t, spb, accent: acc > 1 }); } catch (e) { warn('inst:' + t.inst, 'instrument "' + t.inst + '" failed: ' + e.message); } }
      else this._voice({ wave: t.wave || 'square', freq: slide ? freq * .94 : freq, to: slide ? freq : 0, dur, vol: each, hold: true, attack: .006, vib: t.vib }, bus, time);
    }
  }""")
rep("    for (const t of C.tracks) { t.gain = c.createGain(); t.gain.gain.value = C.vols[t.i]; t.gain.connect(bus); }",
    "    for (const t of C.tracks) { t.gain = c.createGain(); t.gain.gain.value = C.vols[t.i]; t.gain.connect(bus);\n"
    "      if (t.send) { if (t.send.delay && this._dlyIn) { const sg = c.createGain(); sg.gain.value = t.send.delay; t.gain.connect(sg); sg.connect(this._dlyIn); } if (t.send.reverb && this._revIn) { const sg = c.createGain(); sg.gain.value = t.send.reverb; t.gain.connect(sg); sg.connect(this._revIn); } } }\n"
    "    if (this._dly && C === this.song) this._dly.delayTime.setValueAtTime(Math.min(1.9, (C.src.delayBeats || .75) * 60 / C.bpm), c.currentTime);")

# ---- E8: the standard screens sized for a TV at ten feet (theme: { tv: '1' }) ----
rep("const SHELL_CSS = `", "const SHELL_CSS = `.esh-tv{font-size:var(--fs,clamp(18px,1.6vw,30px))}.esh-tv .esh-mod{width:min(var(--panel,900px),100%);padding:1.1em 1.4em}.esh-tv .esh-wide{width:min(var(--panel,900px),100%)}\n"
    ".esh-tv button{font-size:.8em;min-height:var(--btn,64px);padding:.45em .9em}.esh-tv button:focus,.esh-tv button:focus-visible{outline:var(--ring,4px) solid var(--accent);outline-offset:3px}\n"
    ".esh-tv h2{font-size:1.8em}.esh-tv .esh-k{font-size:.7em}.esh-tv .esh-m,.esh-tv .esh-row small,.esh-tv output{font-size:.72em}.esh-tv input[type=range]{width:min(260px,30vw);height:40px}\n"
    ".esh-tv .esh-bind button{font-size:.72em}.esh-tv .esh-bind small{font-size:.6em}.esh-tv .esh-sel{min-width:200px}.esh-tv .esh-toast{font-size:.85em}.esh-tv .esh-row{padding:.35em 0}\n")
rep("    for (const k in th) r.style.setProperty('--' + (k === 'titleFont' ? 'title' : k), th[k]);",
    "    for (const k in th) r.style.setProperty('--' + (k === 'titleFont' ? 'title' : k), th[k]);\n    if (th.tv) r.classList.add('esh-tv');   // (OutBloom E8)")

# ---- E1 / E2: the road module replaced by the extended one (forks, strands, grounds, strips, spans) ----
road = open(roadf, encoding='utf8').read()
start = s.index("/*!\nmy-3D2dge module ROAD v0.85.2")
end = s.index("})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);", s.index("E.Road = Road;", start)) + len("})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);")
s = s[:start] + road.rstrip('\n') + s[end:]
n_changes += 1

s = s.replace("my-3D2dge v0.85.2", "my-3D2dge v0.85.2", 1)
open(out, 'w', encoding='utf8').write(s)
print('engine patched:', n_changes, 'changes')
