/* Killer Bee Night: original code-only instruments, effects, score and tiny babble. */
(function (global) {
  'use strict';

  const settings = [
    { key: 'music', value: 0.10 },
    { key: 'voice', group: 'Sound', label: 'Garden chatter', type: 'slider', value: 0.55, min: 0, max: 1, step: 0.05,
      apply(game, value) { game.audio.voiceVolume = value; game.audio.applyVolume(); } },
  ];

  const sounds = {
    'night-wing': { wave: 'triangle', freq: 113, vol: 0.018, dur: 0.3, vib: [28, 0.08] },
    'night-agitated': { wave: 'pulse12', freq: 166, vol: 0.012, dur: 0.3, vib: [36, 0.12] },
    'night-sting': [{ wave: 'triangle', freq: 450, to: 690, vol: 0.055, dur: 0.075 }, { wave: 'noise', freq: 3100, to: 1600, vol: 0.018, dur: 0.06 }],
    'night-recovery': { wave: 'sine', freq: 270, to: 480, vol: 0.065, dur: 0.23 },
    'night-loss': [{ wave: 'triangle', freq: 880, to: 170, vol: 0.15, dur: 0.24 }, { wave: 'noise', freq: 1450, to: 240, vol: 0.06, dur: 0.14 }],
    'night-ready': [{ wave: 'sine', freq: 740, to: 1110, vol: 0.13, dur: 0.15 }, { wave: 'triangle', freq: 1480, to: 2220, vol: 0.04, delay: 0.08, dur: 0.18 }],
    'night-dry': { wave: 'triangle', freq: 125, to: 100, vol: 0.07, dur: 0.075 },
    'night-ray': [{ wave: 'noise', freq: 7200, to: 220, vol: 0.2, dur: 0.28 }, { wave: 'pulse12', freq: 1280, to: 130, vol: 0.08, dur: 0.22 }, { wave: 'sine', freq: 90, to: 50, vol: 0.17, dur: 0.19 }],
    'night-warning': [{ wave: 'sine', freq: 523, vol: 0.09, dur: 0.08 }, { wave: 'sine', freq: 659, vol: 0.08, delay: 0.12, dur: 0.1 }],
    'night-mature': [{ wave: 'pulse12', freq: 330, to: 490, vol: 0.1, dur: 0.11 }, { wave: 'pulse12', freq: 490, to: 660, vol: 0.09, delay: 0.12, dur: 0.14 }],
    'night-collapse': [{ wave: 'noise', freq: 2200, to: 80, vol: 0.12, dur: 0.2 }, { wave: 'triangle', freq: 330, to: 65, vol: 0.18, dur: 0.26 }, { wave: 'sine', freq: 990, to: 1485, vol: 0.11, delay: 0.12, dur: 0.16 }],
    'night-refill': [{ wave: 'triangle', freq: 440, vol: 0.11, dur: 0.1 }, { wave: 'sine', freq: 660, vol: 0.11, delay: 0.08, dur: 0.14 }, { wave: 'sine', freq: 880, vol: 0.09, delay: 0.16, dur: 0.2 }],
    'night-pulse': [{ wave: 'sine', freq: 80, to: 210, vol: 0.19, dur: 0.38 }, { wave: 'noise', freq: 650, to: 1700, vol: 0.07, dur: 0.3 }],
    'night-expose': [{ wave: 'sine', freq: 440, to: 880, vol: 0.11, dur: 0.3 }, { wave: 'triangle', freq: 1320, vol: 0.045, delay: 0.12, dur: 0.3 }],
    'night-defeat': [{ wave: 'triangle', freq: 392, vol: 0.12, dur: 0.2 }, { wave: 'triangle', freq: 330, vol: 0.12, delay: 0.2, dur: 0.2 }, { wave: 'sine', freq: 220, to: 110, vol: 0.17, delay: 0.4, dur: 0.45 }],
    'night-ui': { wave: 'sine', freq: 660, to: 780, vol: 0.07, dur: 0.055 },
    'night-confirm': [{ wave: 'triangle', freq: 440, vol: 0.09, dur: 0.075 }, { wave: 'sine', freq: 880, vol: 0.09, delay: 0.06, dur: 0.12 }],
    'night-back': { wave: 'triangle', freq: 440, to: 280, vol: 0.07, dur: 0.085 },
  };

  // Sixty-four sixteenth notes: a quiet nocturnal waltz-like lilt over four square bars.
  const gardenSong = {
    bpm: 108, steps: 4, len: 64,
    tracks: [
      { name: 'dew', wave: 'nightBell', vol: 0.28, gate: 0.65,
        notes: 'E5 . B4 . G5 . E5 . D5 . . B4 . . A4 . | C5 . G4 . E5 . G5 . F#5 . E5 . D5 . . . | B4 . E5 . G5 . B5 . A5 . G5 . E5 . . . | D5 . B4 . A4 . F#4 . E5 . . . . . . .' },
      { name: 'roots', wave: 'triangle', vol: 0.18, gate: 0.8,
        notes: 'E3 - . . . . B2 . E3 - . . G3 . B2 . | C3 - . . . . G2 . C3 - . . E3 . G2 . | G2 - . . . . D3 . G2 - . . B2 . D3 . | D3 - . . . . A2 . B2 - . . . . B2 .' },
      { name: 'pollen', wave: 'sine', vol: 0.1,
        notes: '. . E6 . . . . B5 . . G6 . . . B5 . | . . E6 . . . . G5 . . E6 . . . G5 . | . . D6 . . . . B5 . . G6 . . . D6 . | . . F#6 . . . . D6 . . B5 . . . . .' },
      { name: 'chase', wave: 'pulse12', vol: 0.035, on: false,
        notes: 'E4 . B3 . E4 . G4 . E4 . B3 . E4 . B3 . | C4 . G3 . C4 . E4 . C4 . G3 . C4 . G3 . | G3 . D4 . G3 . B3 . G3 . D4 . G3 . D4 . | D4 . A3 . D4 . F#4 . B3 . F#4 . B3 . D4 .' },
      { name: 'feet', wave: 'drums', vol: 0.035, on: false,
        notes: 'k . . h . . h . k . . h . . h . | k . . h . . h . k . . h . . h . | k . . h . . h . k . . h . . h . | k . . h . . h . k . h . h . . h' },
    ],
  };
  const clearSong = { bpm: 132, steps: 4, len: 24, tracks: [
    { wave: 'nightBell', vol: 0.4, notes: 'E5 . G5 . B5 . E6 - G6 - . . F#6 . E6 . B5 - E6 - - - . .' },
    { wave: 'triangle', vol: 0.22, notes: 'E3 - - - G3 - - - B3 - - - D3 - - - E3 - - - - - . .' },
  ] };

  function bell(ctx, bus, time, freq, dur, volume) {
    for (const [ratio, amp] of [[1, 1], [2, 0.19], [3.01, 0.055]]) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = freq * ratio;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * amp, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.00001, time + Math.max(0.02, dur));
      oscillator.connect(gain); gain.connect(bus); oscillator.start(time); oscillator.stop(time + dur + 0.025);
    }
  }

  // Short changing formants give personality without intelligible speech or recorded samples.
  function babble(ctx, bus, variant, track) {
    const now = ctx.currentTime + 0.005;
    const pitches = variant % 2 ? [615, 840, 590] : [480, 710, 930, 640];
    pitches.forEach((pitch, index) => {
      const at = now + index * 0.075, end = at + 0.067;
      const oscillator = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(pitch, at);
      oscillator.frequency.exponentialRampToValueAtTime(pitch * (index % 2 ? 0.8 : 1.12), end);
      filter.type = 'bandpass'; filter.Q.value = 3.7;
      filter.frequency.setValueAtTime(1100 + ((index + variant) % 4) * 380, at);
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.09, at + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.00001, end);
      oscillator.connect(filter); filter.connect(gain); gain.connect(bus);
      oscillator.start(at); oscillator.stop(end + 0.015);
      track(oscillator);
    });
  }

  function create(game, options = {}) {
    const audio = game.audio;
    // Defining through the real settings model preserves any player's saved music choice.
    if (game.settings) {
      const old = game.settings.spec('music');
      game.settings.define(Object.assign({}, old, { key: 'music', value: 0.10 }));
      if (!game.settings.spec('voice')) game.settings.define(settings[1]);
    }
    Object.entries(sounds).forEach(([name, value]) => audio.define(name, value));
    audio.instrument('nightBell', bell);
    const silent = !!options.silent || !!game.headless;
    let unlocked = false, paused = false, stopped = false, lastPhase = '', lastStage = -1;
    let wing = null, agitated = null, stingClock = 0, voiceClock = 0, mode = 'garden';
    let played = 0, chatter = 0, raySounds = 0;
    const handles = [], voiceNodes = [], seen = new Set();
    const safe = fn => { if (!silent && unlocked && !paused && !stopped) try { return fn(); } catch (_) { /* Audio may be absent or suspended. */ } };

    function remember(handle) { if (handle) { handles.push(handle); if (handles.length > 80) handles.shift(); } return handle; }
    function sfx(name, data = {}) {
      return safe(() => { played++; if (name === 'night-ray') raySounds++; return remember(audio.sfx(name, data)); });
    }
    function speech(variant = 0) {
      if (voiceClock > 0) return;
      safe(() => {
        const bus = audio.bus('voice'); if (!bus || !audio.ready) return;
        chatter++; babble(audio.ctx, bus, variant, node => { voiceNodes.push(node); if (voiceNodes.length > 48) voiceNodes.shift(); });
      });
      voiceClock = 2.4;
    }
    function quiet() {
      if (wing) wing.stop(0.02); if (agitated) agitated.stop(0.02); wing = agitated = null;
      handles.splice(0).forEach(handle => { try { handle.stop(0.025); } catch (_) {} });
      voiceNodes.splice(0).forEach(node => { try { node.stop(); } catch (_) {} });
    }
    function music() {
      safe(() => { if (mode === 'garden') audio.music(gardenSong, { sync: true, fade: 0.25 }); });
    }
    function unlock() {
      if (silent) return false;
      unlocked = true; stopped = false;
      try { audio.bus('master'); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {}); } catch (_) {}
      music();
      return audio.ready;
    }
    function ui(kind = 'move') {
      sfx(kind === 'confirm' ? 'night-confirm' : kind === 'back' ? 'night-back' : 'night-ui');
    }
    function events(list, world) {
      if (!Array.isArray(list)) return;
      for (const event of list) {
        const name = String(event.type || event.name || event.kind || '').toLowerCase();
        const key = event.id === undefined ? [world && world.tick, name, event.player, event.target, event.rival].join(':') : event.id;
        if (seen.has(key)) continue;
        seen.add(key); if (seen.size > 400) seen.delete(seen.values().next().value);
        const pan = Number.isFinite(event.x) ? Math.max(-0.8, Math.min(0.8, (event.x - 192) / 240)) : 0;
        if (['ray', 'ray-fired', 'fire'].includes(name)) sfx('night-ray', { pan });
        else if (name === 'sting') { sfx('night-sting', { pan }); stingClock = 0.14; }
        else if (['dry', 'ray-empty', 'empty'].includes(name)) sfx('night-dry');
        else if (['bee-loss', 'beeloss', 'hurt', 'loss', 'damage'].includes(name)) sfx('night-loss', { pan });
        else if (['charge', 'recharge', 'ray-ready'].includes(name)) sfx('night-ready', { pan });
        else if (['kill', 'target-death', 'target-kill', 'collapse'].includes(name)) { sfx('night-collapse', { pan }); speech(2); }
        else if (['warning', 'spawn-warning', 'entrance'].includes(name)) sfx('night-warning', { pan });
        else if (['mature', 'maturation', 'guard', 'hunter'].includes(name)) sfx('night-mature', { pan });
        else if (['recover', 'recovery'].includes(name)) sfx('night-recovery', { pan });
        else if (['replenish', 'stage-start', 'encounter-start'].includes(name)) { sfx('night-refill'); speech(0); }
        else if (['pulse', 'boss-pulse'].includes(name)) sfx('night-pulse', { pan });
        else if (['expose', 'boss-expose', 'boss-open'].includes(name)) sfx('night-expose', { pan });
        else if (['clear', 'stage-clear', 'encounter-clear'].includes(name)) safe(() => { audio.sting(clearSong); speech(1); });
        else if (['defeat', 'fail', 'wipe'].includes(name)) sfx('night-defeat');
      }
    }
    function update(world, dt = 1 / 120) {
      voiceClock = Math.max(0, voiceClock - dt); stingClock = Math.max(0, stingClock - dt);
      if (!world || silent || !unlocked || paused || stopped) return;
      const phase = world.phase || 'play';
      const playing = ['play', 'playing', 'active', 'run'].includes(phase);
      const stage = world.stage === undefined ? world.encounter : world.stage;
      if (stage !== lastStage) { lastStage = stage; if (lastStage !== -1) sfx('night-refill'); }
      if (phase !== lastPhase) {
        if (['won', 'win', 'victory', 'ending'].includes(phase)) {
          quiet(); mode = 'ending'; safe(() => audio.music(clearSong, { sync: true, loop: false, restart: true })); speech(3);
        } else if (['failed', 'fail', 'defeat', 'lost'].includes(phase)) {
          quiet(); mode = 'defeat'; safe(() => audio.stopMusic(0.08)); sfx('night-defeat'); speech(1);
        } else if (playing && mode !== 'garden') { mode = 'garden'; music(); }
        lastPhase = phase;
      }
      if (!playing) { if (wing) wing.stop(); if (agitated) agitated.stop(); wing = agitated = null; return; }
      const rivals = world.rivals || world.enemies || [];
      const players = world.players || [];
      const hunters = rivals.filter(rival => rival.state === 'hunter' || rival.stage === 'hunter' || rival.stage === 2 || rival.state === 2).length;
      const low = players.some(player => player.bees > 0 && player.bees < 5);
      const pressure = Math.min(1, hunters * 0.22 + (low ? 0.25 : 0));
      safe(() => {
        if (!wing || !wing.playing) wing = remember(audio.sfx('night-wing', { loop: true, vary: 0 }));
        if (!agitated || !agitated.playing) agitated = remember(audio.sfx('night-agitated', { loop: true, vary: 0 }));
        if (agitated) agitated.set({ vol: pressure * 0.7 });
        if (audio.song && mode === 'garden') { audio.layer('chase', pressure, 0.25); audio.layer('feet', pressure * 0.7 + (Number(stage) >= 4 ? 0.15 : 0), 0.25); }
      });
      const stinging = players.some(player => player.stinging || player.contact || player.targetId != null && player.targetId !== -1);
      if (stinging && stingClock === 0) { sfx('night-sting', { pitch: players.some(player => player.focus) ? 1.18 : 1 }); stingClock = 0.14; }
    }
    function pause(on = true) {
      paused = !!on;
      if (paused) { quiet(); audio.stopMusic(0.035); }
      else if (!stopped) music();
    }
    function stop() {
      quiet(); stopped = true; audio.stopMusic(0.035);
      seen.clear(); lastPhase = ''; lastStage = -1; mode = 'garden'; voiceClock = stingClock = 0;
    }
    function diagnostics() {
      return { unlocked, silent, paused, stopped, effects: played, chatter, raySounds, ready: audio.ready,
        musicDefault: game.settings ? game.settings.default('music') : 0.1,
        musicVolume: audio.musicVolume, musicPlaying: !!audio.song, voiceVolume: audio.voiceVolume,
        liveWings: !!(wing && wing.playing) || !!(agitated && agitated.playing) };
    }
    return { unlock, update, events, ui, speech, pause, stop, diagnostics, testTone: () => sfx('night-ray') };
  }

  global.NightAudio = { create, settings, sounds, gardenSong, clearSong, bell, babble };
})(globalThis);
