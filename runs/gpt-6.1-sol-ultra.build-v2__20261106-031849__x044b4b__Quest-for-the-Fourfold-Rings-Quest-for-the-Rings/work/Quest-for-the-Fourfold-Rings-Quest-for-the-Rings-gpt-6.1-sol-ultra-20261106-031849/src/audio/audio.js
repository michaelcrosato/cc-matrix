/* Fourfold Rings — original procedural score, effects and babble.
 * The native my-3D2dge ChipAudio owns the context, buses and music clock.
 * This module registers original instruments; no media files or network requests.
 */
(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({ master: 0.7, music: 0.1, sfx: 0.75, voice: 0.5 });
  const liveSources = new Set();
  const liveEffects = new Set();
  let native = null;
  let unlocked = false;
  let paused = false;
  let disposed = false;
  let scene = 'title';
  let playingScene = '';
  let volumes = { ...DEFAULTS };
  let captionHandler = null;
  let seed = 0x4f01d;
  let lastVoiceAt = -Infinity;
  let heard = new Set();
  let heardOrder = [];
  let eventCount = 0;
  const clamp = (v, d) => Number.isFinite(+v) ? Math.max(0, Math.min(1, +v)) : d;
  const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const freq = (note) => {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(note));
    if (!m) return 0;
    const n = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
    return 440 * 2 ** ((n - 69) / 12);
  };
  function trackedSource(src, nodeList, start, stop, tracked) {
    if (tracked) liveSources.add(src);
    src.onended = () => {
      liveSources.delete(src);
      for (const node of [src, ...nodeList]) { try { node.disconnect(); } catch (_) { /* already disconnected */ } }
    };
    src.start(start);
    src.stop(stop);
    return src;
  }
  function bell(ctx, bus, t, f, dur, vol, tracked = true) {
    const tail = Math.max(0.16, Math.min(1.8, dur * 1.9));
    for (const [ratio, weight] of [[1, 0.68], [2.76, 0.19], [4.05, 0.07]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(Math.max(25, f * ratio), t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * weight * 0.7, t + 0.007);
      g.gain.exponentialRampToValueAtTime(0.00001, t + tail);
      o.connect(g); g.connect(bus);
      trackedSource(o, [g], t, t + tail + 0.015, tracked);
    }
  }
  function harp(ctx, bus, t, f, dur, vol, tracked = true) {
    const o = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(Math.max(25, f), t);
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(Math.min(7000, f * 7), t); filter.Q.value = 0.6;
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, f * 1.2), t + Math.max(0.08, dur));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.62, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.00001, t + Math.max(0.09, dur * 1.2));
    o.connect(filter); filter.connect(g); g.connect(bus);
    trackedSource(o, [g, filter], t, t + Math.max(0.09, dur * 1.2) + 0.02, tracked);
  }
  function pipe(ctx, bus, t, f, dur, vol, tracked = true) {
    const tail = Math.max(0.12, dur);
    for (const [wave, detune, scale] of [['sine', -3, 0.7], ['triangle', 3, 0.3]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = Math.max(25, f); o.detune.value = detune;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * scale * 0.55, t + Math.min(0.09, tail * 0.25));
      g.gain.setValueAtTime(vol * scale * 0.4, t + tail * 0.65); g.gain.linearRampToValueAtTime(0, t + tail);
      o.connect(g); g.connect(bus);
      trackedSource(o, [g], t, t + tail + 0.02, tracked);
    }
  }
  function brass(ctx, bus, t, f, dur, vol, tracked = true) {
    const tail = Math.max(0.12, dur);
    for (const detune of [-5, 5]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.detune.value = detune;
      o.frequency.setValueAtTime(Math.max(25, f * 0.99), t); o.frequency.linearRampToValueAtTime(f, t + 0.05);
      filter.type = 'lowpass'; filter.frequency.value = Math.min(4000, f * 4); filter.Q.value = 0.5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.026);
      g.gain.setValueAtTime(vol * 0.16, t + tail * 0.65); g.gain.linearRampToValueAtTime(0, t + tail);
      o.connect(filter); filter.connect(g); g.connect(bus);
      trackedSource(o, [g, filter], t, t + tail + 0.02, tracked);
    }
  }
  function breath(ctx, bus, t, f, dur, vol, tracked = true) {
    const n = Math.ceil(ctx.sampleRate * Math.max(0.04, dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    // Local noise stream: effects do not consume gameplay randomness.
    let s = 0x7af12;
    for (let i = 0; i < n; i++) { s = Math.imul(s, 1664525) + 1013904223 | 0; d[i] = ((s >>> 0) / 2147483648 - 1); }
    const src = ctx.createBufferSource(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    src.buffer = buf; filter.type = 'bandpass'; filter.Q.value = 0.65;
    filter.frequency.setValueAtTime(Math.max(70, f), t); filter.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.45), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.65, t + Math.min(0.06, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.00001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(bus);
    trackedSource(src, [g, filter], t, t + dur + 0.02, tracked);
  }
  const instruments = { 'fourfold-bell': bell, 'fourfold-harp': harp, 'fourfold-pipe': pipe, 'fourfold-brass': brass, 'fourfold-breath': breath };
  const main = 'D5 - . . A4 . . . F5 - . . E5 . . . | D5 - . . C5 - . . A4 - - . . . . . | D5 - . . F5 . . . G5 - . . E5 - . . | C5 - . . A4 - . . D5 - - - . . . .';
  const bass = 'D2 - - . . . . . D3 . . . A2 . . . | Bb2 - - . . . . . F2 . . . A2 . . . | G2 - - . . . . . D3 . . . C3 . . . | A2 - - . . . . . D2 - . . . . . .';
  const base = (bpm, melody = main, tint = 'fourfold-harp') => ({ bpm, steps: 2, len: 64, tracks: [
    { name: 'luminous-thread', wave: tint, vol: 0.29, gate: 0.82, notes: melody },
    { name: 'understone', wave: 'fourfold-pipe', vol: 0.36, gate: 0.76, notes: bass },
    { name: 'dread', wave: 'fourfold-breath', vol: 0.04, on: false, notes: 'D2 . . . . . . . D2 . . . . . . .' }
  ] });
  const songs = {
    title: base(61, main, 'fourfold-bell'),
    courtyard: base(70, 'D5 . . . F5 - . . A5 . . . G5 - . . | F5 . . . D5 . . . E5 - - . . . . .'),
    dungeon: base(65),
    crystal: base(72, 'D6 . . . A5 . . . F6 - . . E6 . . . | D6 . . . C6 . . . A5 - . . . . . . | G5 . . . Bb5 - . . D6 . . . A5 . . . | E6 . . . C6 . . . D6 - - . . . . .', 'fourfold-bell'),
    inferno: base(79, 'D4 . . D4 A4 - . . F4 . . . E4 . . . | D4 . . . C4 - . . A3 - . . . . . .'),
    shifting: base(86, 'D5 . A4 . . . F5 . C5 . . . E5 . . . | D5 . C5 . . . A4 . E5 . . . . . . .'),
    final: { bpm: 95, steps: 2, len: 64, tracks: [
      { name: 'dragon', wave: 'fourfold-brass', vol: 0.23, notes: 'D3 - . . A3 - . . Eb3 - . . A3 - . . | D3 - . . F3 - . . E3 - . . A3 - . . | G3 - . . D4 - . . C4 - . . G3 - . . | A3 - . . C#4 - . . D4 - - - . . . .' },
      { name: 'understone', wave: 'fourfold-pipe', vol: 0.36, notes: bass },
      { name: 'dread', wave: 'fourfold-breath', vol: 0.09, notes: 'D2 . . . A2 . . . D2 . . . A2 . . .' },
      { name: 'seals', wave: 'fourfold-bell', vol: 0.2, notes: 'D5 . . . . . . . A5 . . . . . . . | F5 . . . . . . . E5 . . . . . . .' }
    ] },
    victory: { bpm: 92, steps: 2, len: 32, tracks: [
      { name: 'dawn', wave: 'fourfold-brass', vol: 0.25, notes: 'D4 . A4 . D5 - - . F#5 - E5 . D5 - . . | G4 . B4 . D5 - E5 . F#5 - E5 . D5 - - -' },
      { name: 'gold', wave: 'fourfold-bell', vol: 0.25, notes: 'D5 . . A5 . . D6 . F#6 - . E6 D6 - . . | G5 . . D6 . . E6 . F#6 - E6 . D6 - - -' },
      { name: 'home', wave: 'fourfold-pipe', vol: 0.34, notes: 'D3 - - - A2 - - - D3 - - - A2 - - - | G2 - - - B2 - - - A2 - - - D3 - - -' }
    ] }
  };
  songs.board = songs.courtyard;
  songs.map = songs.courtyard;
  songs.halls = songs.shifting;
  songs.finale = songs.final;
  const fanfare = { bpm: 112, steps: 2, len: 16, loop: false, tracks: [
    { wave: 'fourfold-brass', vol: 0.42, notes: 'D5 . A5 . D6 - A5 . F#5 - E5 . D5 - - -' },
    { wave: 'fourfold-bell', vol: 0.3, notes: 'D6 . A6 . D7 - . . F#6 - E6 . D6 - - -' },
    { wave: 'fourfold-pipe', vol: 0.35, notes: 'D3 - - - A2 - - - D3 - - - - - - -' }
  ] };
  const effectVoices = {
    step: [{ wave: 'fourfold-breath', freq: 220, dur: 0.055, vol: 0.10 }],
    sword: [{ wave: 'noise', freq: 1800, to: 400, dur: 0.16, vol: 0.22 }, { wave: 'triangle', freq: 300, to: 80, dur: 0.13, vol: 0.13 }],
    bolt: [{ wave: 'sine', freq: 780, to: 260, dur: 0.21, vol: 0.15 }, { wave: 'fourfold-bell', freq: 1174.7, dur: 0.1, vol: 0.11 }],
    hit: [{ wave: 'noise', freq: 500, to: 120, dur: 0.13, vol: 0.24 }, { wave: 'triangle', freq: 120, to: 60, dur: 0.12, vol: 0.19 }],
    deflect: [{ wave: 'fourfold-bell', freq: 1568, dur: 0.2, vol: 0.2 }, { wave: 'noise', freq: 3800, dur: 0.06, vol: 0.1 }],
    hurt: [{ wave: 'triangle', freq: 230, to: 95, dur: 0.2, vol: 0.23 }, { wave: 'noise', freq: 280, dur: 0.15, vol: 0.1 }],
    down: [{ wave: 'fourfold-pipe', freq: 146.8, dur: 0.55, vol: 0.25 }, { wave: 'sine', freq: 293.7, to: 73.4, dur: 0.45, vol: 0.14 }],
    revive: [{ wave: 'fourfold-bell', freq: 587.3, dur: 0.3, vol: 0.2 }, { wave: 'fourfold-bell', freq: 880, dur: 0.3, delay: 0.12, vol: 0.2 }, { wave: 'fourfold-bell', freq: 1174.7, dur: 0.5, delay: 0.25, vol: 0.22 }],
    pickup: [{ wave: 'fourfold-bell', freq: 1174.7, dur: 0.5, vol: 0.22 }, { wave: 'fourfold-bell', freq: 1760, dur: 0.5, delay: 0.12, vol: 0.17 }],
    pass: [{ wave: 'fourfold-harp', freq: 880, dur: 0.18, vol: 0.2 }, { wave: 'fourfold-bell', freq: 1174.7, dur: 0.3, delay: 0.08, vol: 0.14 }],
    drop: [{ wave: 'fourfold-bell', freq: 440, dur: 0.23, vol: 0.2 }],
    stun: [{ wave: 'fourfold-bell', freq: 1396.9, dur: 0.2, vol: 0.21 }, { wave: 'sine', freq: 880, to: 1396.9, dur: 0.16, vol: 0.15 }],
    ward: [{ wave: 'fourfold-pipe', freq: 587.3, dur: 0.4, vol: 0.2 }, { wave: 'fourfold-bell', freq: 1174.7, dur: 0.3, vol: 0.13 }],
    phase: [{ wave: 'sine', freq: 147, to: 1174, dur: 0.5, vol: 0.16 }, { wave: 'noise', freq: 450, to: 2200, dur: 0.37, vol: 0.09 }],
    cloak: [{ wave: 'fourfold-breath', freq: 1200, dur: 0.45, vol: 0.17 }, { wave: 'fourfold-harp', freq: 698.5, dur: 0.3, vol: 0.13 }],
    lure: [{ wave: 'fourfold-harp', freq: 987.8, dur: 0.22, vol: 0.17 }, { wave: 'fourfold-harp', freq: 1318.5, dur: 0.22, delay: 0.1, vol: 0.17 }],
    reveal: [{ wave: 'fourfold-bell', freq: 1760, dur: 0.38, vol: 0.17 }, { wave: 'fourfold-bell', freq: 2349.3, dur: 0.38, delay: 0.1, vol: 0.12 }],
    flame: [{ wave: 'fourfold-breath', freq: 900, dur: 0.85, vol: 0.31 }, { wave: 'triangle', freq: 74, to: 42, dur: 0.7, vol: 0.18 }],
    shift: [{ wave: 'fourfold-breath', freq: 170, dur: 0.65, vol: 0.3 }, { wave: 'triangle', freq: 62, to: 43, dur: 0.55, vol: 0.18 }],
    possession: [{ wave: 'fourfold-pipe', freq: 138.6, dur: 0.7, vol: 0.25 }, { wave: 'saw', freq: 277.2, to: 138.6, dur: 0.55, vol: 0.08 }],
    dragon: [{ wave: 'fourfold-breath', freq: 230, dur: 1.2, vol: 0.38 }, { wave: 'fourfold-brass', freq: 55, dur: 1.15, vol: 0.36 }],
    dodge: [{ wave: 'fourfold-breath', freq: 1400, dur: 0.14, vol: 0.16 }],
    menu: [{ wave: 'fourfold-harp', freq: 587.3, dur: 0.10, vol: 0.12 }],
    confirm: [{ wave: 'fourfold-harp', freq: 880, dur: 0.14, vol: 0.14 }],
    cancel: [{ wave: 'fourfold-harp', freq: 440, dur: 0.14, vol: 0.14 }],
    seal: [{ wave: 'fourfold-bell', freq: 587.3, dur: 0.65, vol: 0.24 }, { wave: 'fourfold-brass', freq: 293.7, dur: 0.45, vol: 0.24 }]
  };
  const aliases = {
    attack: 'sword', primary: 'sword', swing: 'sword', cast: 'bolt', guard: 'deflect', brace: 'ward', pulse: 'reveal',
    'hero-hurt': 'hurt', damage: 'hurt', 'hero-down': 'down', downed: 'down', 'hero-revive': 'revive', revived: 'revive',
    'ring-pickup': 'pickup', 'ring-drop': 'drop', 'ring-pass': 'pass', 'ring-return': 'pickup', recovery: 'pickup',
    'hazard-active': 'flame', 'hazard-shift': 'shift', 'wall-shift': 'shift', 'director-possession': 'possession',
    echo: 'possession', 'seal-bound': 'seal', binding: 'seal', 'room-enter': 'confirm', 'room-complete': 'seal',
    'menu-focus': 'menu', 'menu-confirm': 'confirm', 'menu-back': 'cancel', 'phase-end': 'phase', 'phase-return': 'phase', 'cloak-end': 'cloak', 'ward-block': 'deflect', 'fire-shot': 'bolt', 'spider-drop': 'hit', 'enemy-strike': 'sword'
  };
  function applyVolumes() {
    if (!native) return;
    native.volume = volumes.master;
    native.musicVolume = volumes.music;
    native.sfxVolume = volumes.sfx;
    native.voiceVolume = volumes.voice;
    native.applyVolume();
  }
  function stopOwned() {
    for (const src of liveSources) { try { src.stop(); } catch (_) { /* ended */ } }
    liveSources.clear();
    for (const handle of liveEffects) { try { handle.stop(0.01); } catch (_) { /* ended */ } }
    liveEffects.clear();
  }
  function canPlay() { return native && unlocked && !paused && !disposed && native.ctx && native.ctx.state === 'running'; }
  function playScene(force = false) {
    if (!canPlay() || (!force && playingScene === scene)) return;
    playingScene = scene;
    native.music(songs[scene] || songs.dungeon, { sync: false, fade: 0.04, restart: force });
  }
  function attach(audio) {
    if (native && native !== audio) { native.music(null); stopOwned(); }
    native = audio || null; disposed = false; playingScene = '';
    if (!native) return api;
    for (const [name, instrument] of Object.entries(instruments)) native.instrument(name, instrument);
    for (const [name, voices] of Object.entries(effectVoices)) native.define('fourfold-' + name, voices);
    applyVolumes();
    if (unlocked) unlock();
    return api;
  }
  async function unlock() {
    disposed = false;
    unlocked = true;
    if (!native) return false;
    try {
      // bus() is the public gesture-time initializer for the native synthesizer.
      native.bus('voice');
      if (native.ctx && native.ctx.state === 'suspended') await native.ctx.resume();
      applyVolumes(); playScene();
      return !!native.ready;
    } catch (_) { return false; }
  }
  function configure(settings = {}) {
    for (const key of Object.keys(DEFAULTS)) {
      const v = settings[key] ?? settings[key + 'Volume'];
      if (v !== undefined) volumes[key] = clamp(v, DEFAULTS[key]);
    }
    if (settings.captionHandler !== undefined) captionHandler = settings.captionHandler;
    applyVolumes();
    return { ...volumes };
  }
  function setScene(name) {
    const next = String(name || 'dungeon').toLowerCase();
    if (next === scene) { playScene(); return; }
    scene = next; playingScene = ''; playScene();
  }
  function sfx(name, options = {}) {
    if (!canPlay()) return;
    const handle = native.sfx('fourfold-' + name, { vary: 0, ...options });
    // Handles are retained only until the next pause/end; each sound itself has a finite envelope.
    if (handle && handle.playing) {
      liveEffects.add(handle);
      if (liveEffects.size > 64) liveEffects.delete(liveEffects.values().next().value);
    }
  }
  function babble(role = 'ringmaster', caption = '', force = false) {
    if (caption && captionHandler) captionHandler(String(caption), String(role));
    if (!canPlay()) return;
    const c = native.ctx, now = c.currentTime;
    if (!force && now - lastVoiceAt < 0.8) return;
    lastVoiceAt = now;
    const voice = {
      warrior: [155, 0.085, 650], wizard: [238, 0.095, 1150], phantom: [360, 0.11, 1700],
      changeling: [315, 0.065, 1400], ringmaster: [92, 0.11, 520], dragon: [63, 0.14, 350]
    }[String(role).toLowerCase()] || [220, 0.08, 1000];
    const syllables = Math.min(9, Math.max(3, caption ? Math.ceil(caption.length / 10) : 5));
    const bus = native.bus('voice');
    for (let i = 0; i < syllables; i++) {
      const t = now + 0.01 + i * (voice[1] + 0.035), d = voice[1] * (0.65 + rand() * 0.55);
      const o = c.createOscillator(), g = c.createGain(), formant = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(voice[0] * (0.86 + rand() * 0.4), t);
      o.frequency.exponentialRampToValueAtTime(voice[0] * (0.9 + rand() * 0.45), t + d);
      formant.type = 'bandpass'; formant.Q.value = 1.8;
      formant.frequency.setValueAtTime(voice[2] * (0.65 + rand() * 0.7), t);
      formant.frequency.linearRampToValueAtTime(voice[2] * (0.7 + rand() * 0.8), t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.012); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(formant); formant.connect(g); g.connect(bus);
      trackedSource(o, [g, formant], t, t + d + 0.015, true);
    }
  }
  function playFanfare() {
    if (!canPlay()) return;
    const c = native.ctx, bus = native.bus('music'), step = 60 / fanfare.bpm / fanfare.steps;
    for (const tr of fanfare.tracks) {
      const tokens = tr.notes.trim().split(/\s+/);
      for (let i = 0; i < tokens.length; i++) {
        const f = freq(tokens[i]); if (!f) continue;
        let n = 1; while (tokens[i + n] === '-') n++;
        instruments[tr.wave](c, bus, c.currentTime + 0.015 + i * step, f, n * step * 0.88, tr.vol);
      }
    }
  }
  function event(e) {
    if (typeof e === 'string') e = { type: e };
    if (!e || typeof e.type !== 'string') return;
    if (e.id !== undefined) {
      const id = String(e.id);
      if (heard.has(id)) return;
      heard.add(id); heardOrder.push(id);
      if (heardOrder.length > 512) heard.delete(heardOrder.shift());
    }
    eventCount++;
    const raw = e.type.toLowerCase().replace(/_/g, '-');
    if (raw === 'voice' || e.caption) babble(e.role || e.hero || 'ringmaster', e.caption || '', !!e.force);
    if (['secure', 'ring-secured', 'ring-secure', 'ring-delivered', 'ring-acquired'].includes(raw)) {
      playFanfare();
      return;
    }
    if (['victory', 'expedition-ended', 'expedition-won'].includes(raw)) {
      if (e.won === false) { sfx('down'); return; }
      setScene('victory');
      playFanfare();
      return;
    }
    let name = aliases[raw] || raw;
    if (raw === 'primary' || raw === 'attack') {
      name = { warrior: 'sword', wizard: 'bolt', phantom: 'reveal', changeling: 'lure' }[String(e.classId || e.class || e.hero || '').toLowerCase()] || 'sword';
    }
    if (raw === 'power') {
      const cls = String(e.classId || e.class || '').toLowerCase();
      // Wizard already emits its dedicated ward event before the generic power event.
      if (cls === 'wizard') return;
      name = { warrior: 'ward', phantom: 'phase', changeling: 'cloak' }[cls] || 'ward';
    }
    if (raw === 'director' && e.event === 'echo') name = 'possession';
    if (effectVoices[name]) sfx(name, e.pan === undefined ? {} : { pan: Math.max(-1, Math.min(1, e.pan)) });
  }
  function pause(on = true) {
    on = !!on;
    if (paused === on) return;
    paused = on;
    if (paused) { if (native) native.music(null); playingScene = ''; stopOwned(); }
    else playScene();
  }
  function dispose() {
    disposed = true; paused = false; playingScene = '';
    if (native) native.music(null);
    stopOwned(); heard = new Set(); heardOrder = []; lastVoiceAt = -Infinity;
  }
  function reset() {
    configure(DEFAULTS);
    return { ...volumes };
  }
  function tension(dread = 0) {
    if (canPlay() && native.song) native.layer('dread', Math.max(0, Math.min(1, +dread / 6)), 0.6);
  }
  // The same instruments can render without a DOM, realtime context, gesture or game.
  // Tests supply a genuine browser OfflineAudioContext and inspect its sample data.
  async function renderOffline(ctx, options = {}) {
    const levels = { ...DEFAULTS, ...(options.volumes || {}) };
    const master = ctx.createGain(); master.gain.value = clamp(levels.master, DEFAULTS.master); master.connect(ctx.destination);
    const buses = {};
    for (const key of ['music', 'sfx', 'voice']) {
      buses[key] = ctx.createGain(); buses[key].gain.value = clamp(levels[key], DEFAULTS[key]); buses[key].connect(master);
    }
    const start = 0.025;
    const mode = options.kind || 'effects';
    if (mode === 'music' || mode === 'all') {
      const song = songs[options.scene || 'title'] || songs.title;
      const spb = 60 / song.bpm / song.steps;
      const maxTime = ctx.length / ctx.sampleRate - 0.5;
      for (const tr of song.tracks) {
        if (tr.on === false) continue;
        const tokens = tr.notes.replace(/\|/g, ' ').trim().split(/\s+/);
        for (let i = 0; i < tokens.length && start + i * spb < maxTime; i++) {
          const f = freq(tokens[i]); if (!f) continue;
          let n = 1; while (tokens[i + n] === '-') n++;
          instruments[tr.wave](ctx, buses.music, start + i * spb, f, n * spb * (tr.gate || 0.9), tr.vol, false);
        }
      }
    }
    if (mode === 'effects' || mode === 'all') {
      const effects = options.effects || ['sword', 'bolt', 'revive', 'pickup', 'shift', 'flame'];
      for (let k = 0; k < effects.length; k++) {
        const voices = effectVoices[effects[k]] || effectVoices.pickup;
        const t = start + k * 0.75;
        for (const p of voices) {
          const f = typeof p.freq === 'string' ? freq(p.freq) : p.freq;
          const instrument = instruments[p.wave] || (p.wave === 'noise' ? breath : harp);
          instrument(ctx, buses.sfx, t + (p.delay || 0), f, p.dur, p.vol, false);
        }
      }
    }
    if (mode === 'voice') {
      // A fixed test utterance through the independent voice bus using the same formant structure.
      for (let i = 0; i < 7; i++) {
        const t = start + i * 0.12, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = 130 + (i % 3) * 19;
        f.type = 'bandpass'; f.Q.value = 1.8; f.frequency.value = 650 + (i % 4) * 160;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.012); g.gain.linearRampToValueAtTime(0, t + 0.08);
        o.connect(f); f.connect(g); g.connect(buses.voice);
        trackedSource(o, [g, f], t, t + 0.095, false);
      }
    }
    return ctx.startRendering();
  }
  function debug() {
    return { attached: !!native, unlocked, paused, disposed, scene, playingScene, volumes: { ...volumes }, context: native && native.ctx ? native.ctx.state : 'uncreated', activeSources: liveSources.size, effectsTracked: liveEffects.size, events: eventCount };
  }
  const api = { attach, unlock, configure, setScene, event, babble, pause, dispose, reset, tension, debug, renderOffline, defaults: DEFAULTS };
  root.RingAudio = api;
})(typeof window !== 'undefined' ? window : globalThis);
