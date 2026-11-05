// The screens over the play: the HUD (hearts, belly, the quest, the hotbar, prompts, notes), the craft and satchel
// menus, the Dev Tools with its live sliders and cheats, and the glyph prompts that follow the device last used.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px;

// the label for an action on the device last used: a PlayStation or Xbox glyph on a pad, the key or mouse otherwise
DQ.glyph = action => {
  const I = DQ.game.input;
  if (I.lastDevice === 'gamepad' && DQ.PAD_OF[action] !== undefined) {
    const set = DQ.GLYPHS[DQ.game.settings.glyphs === 'Xbox' ? 'Xbox' : 'PlayStation'];
    return set[DQ.PAD_OF[action]];
  }
  return I.label(action);
};

// ---- the HUD -----------------------------------------------------------------------------------------------------------
DQ.drawHUD = (r, p) => {
  const b = p.builder, W = r.W, H = r.H;
  r.overlay(g => {
    // the quest, top left
    const q = p.current();
    const qy = 6;
    if (q) {
      E.ui.box(g, 6, qy, Math.min(W - 12, 176), 30, { bg: ['#1c1a34', '#0e0c1c'], border: '#d9b77c', alpha: 0.85 });
      E.font.text(g, DQ.CHAPTER_TITLE.toUpperCase().slice(0, 30), 12, qy + 4, '#d9b77c', { shadow: '#000', scale: 1 });
      E.font.text(g, q.title, 12, qy + 13, '#ffffff', { shadow: '#000' });
      E.font.text(g, q.text.slice(0, 44), 12, qy + 22, '#c8c2e6', { shadow: '#000', font: 'tiny' });
    } else {
      E.ui.box(g, 6, qy, 176, 16, { bg: '#1c1a34', border: '#d9b77c', alpha: 0.85 });
      E.font.text(g, 'FREE PLAY: BUILD ANYTHING', 12, qy + 5, '#ffe27a', { shadow: '#000' });
    }
    // the clock and the town, top right
    const hh = Math.floor(p.hour), mm = Math.floor((p.hour - hh) * 60);
    const clock = 'DAY ' + p.day + '  ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (p.isNight ? '  NIGHT' : '  DAY');
    const lvl = p.townLevel ? 'TOWN LV ' + p.townLevel : 'NO TOWN YET';
    E.ui.box(g, W - 154, 6, 148, 30, { bg: ['#1c1a34', '#0e0c1c'], border: '#8fc8ff', alpha: 0.85 });
    E.font.text(g, clock, W - 148, 10, '#ffffff', { shadow: '#000', align: 'left' });
    E.font.text(g, lvl + '  CHEER ' + Math.floor(p.cheer), W - 148, 22, '#ff9ad0', { shadow: '#000' });
    // hearts and belly, bottom left
    E.ui.hearts(g, 8, H - 26, b.hp, b.maxHp);
    E.ui.bar(g, 8, H - 14, 60, 4, b.belly / 100, '#f5a540');
    E.font.text(g, 'BELLY', 72, H - 16, '#f5c880', { shadow: '#000', font: 'tiny' });
    // the hotbar, bottom centre: eight slots, the selected one lifted
    const slot = 20, gap = 3, total = 8 * (slot + gap) - gap, x0 = Math.round(W / 2 - total / 2), y0 = H - slot - 8;
    for (let i = 0; i < 8; i++) {
      const id = p.hotbar[i], x = x0 + i * (slot + gap), sel = i === p.sel;
      E.ui.box(g, x, y0 - (sel ? 3 : 0), slot, slot, { bg: sel ? ['#3a3370', '#221e44'] : ['#1c1a34', '#100e1e'], border: sel ? '#ffe27a' : '#4a4670', alpha: 0.9 });
      if (id && DQ.ITEMS[id]) {
        const it = DQ.ITEMS[id];
        px.rect(g, x + 5, y0 - (sel ? 3 : 0) + 4, slot - 10, slot - 10, it.color || '#ffffff');
        const n = p.count(id);
        if (n > 0) E.font.text(g, String(n), x + slot - 2, y0 - (sel ? 3 : 0) + slot - 8, '#ffffff', { shadow: '#000', font: 'tiny', align: 'right' });
      }
      E.font.text(g, String(i + 1), x + 2, y0 - (sel ? 3 : 0) + 2, '#9c96c4', { font: 'tiny' });
    }
    const it = p.hotbar[p.sel] && DQ.ITEMS[p.hotbar[p.sel]];
    if (it) E.font.text(g, it.name, Math.round(W / 2), y0 - 14, '#ffffff', { shadow: '#000', align: 'center' });
    // the prompts, bottom right: the keys or buttons for what you can do now
    const prompts = [[DQ.glyph('attack'), 'Break / strike'], [DQ.glyph('place'), 'Place'], [DQ.glyph('use'), 'Use / talk'], [DQ.glyph('craft'), 'Craft'], [DQ.glyph('satchel'), 'Satchel']];
    let py = H - 12 * prompts.length - 4;
    for (const [k, t] of prompts) { E.font.text(g, k + '  ' + t, W - 6, py, '#e8e4ff', { shadow: '#000', font: 'tiny', align: 'right' }); py += 12; }
    // the notes: one or more, centre top, fading
    let ny = 44;
    for (const n of p.popups) {
      if (!n.text) continue;
      const a = Math.min(1, n.t / 0.6);
      E.font.text(g, n.text, Math.round(W / 2), ny, n.color, { shadow: '#000', align: 'center', alpha: a });
      ny += 12;
    }
    if (p.dead) E.font.text(g, 'You came unstitched...', Math.round(W / 2), Math.round(H / 2) - 6, '#ff9a9a', { shadow: '#000', align: 'center', scale: 2 });
    if (p.siege && p.siege.wave && !p.siege.done) E.font.text(g, 'NIGHT SIEGE  wave ' + p.siege.wave + ' / 3', Math.round(W / 2), 6, '#ff9a9a', { shadow: '#000', align: 'center' });
  });
};

// ---- craft and satchel: an E.Menu of recipes (or of the bag) ---------------------------------------------------------
DQ.openCraft = (p, game, onClose) => {
  const recs = DQ.RECIPES.filter(rc => rc.known || p.notions[rc.notion]);
  const items = recs.map(rc => {
    const ok = p.canCraft(rc);
    return { label: p.recipeLabel(rc), disabled: !ok, rec: rc };
  });
  if (!items.length) items.push({ label: 'Nothing yet. Get a notion first.', disabled: true });
  const m = new E.Menu(game, items, {
    x: 'center', y: 30, title: 'CRAFT', box: true,
    onPick(i, item) {
      if (!item.rec) return;
      if (DQ.net && DQ.net.client) { DQ.net.cr.push(item.rec.id); return; }   // a client asks the host
      if (!p.craft(item.rec)) p.popup('You need: ' + p.recipeLabel(item.rec).split('  [')[1].replace(']', ''), '#ffb0b0', 2.5);
    },
    onCancel() { onClose && onClose(); },
  });
  return m;
};
DQ.openSatchel = (p, game, onClose) => {
  const ids = Object.keys(p.bag).filter(id => p.bag[id] > 0);
  const items = ids.map(id => ({ label: DQ.itemName(id) + '  x' + p.bag[id], id }));
  if (!items.length) items.push({ label: 'Empty. Break something first.', disabled: true });
  const m = new E.Menu(game, items, {
    x: 'center', y: 30, title: 'SATCHEL  (pick to set in slot ' + (p.sel + 1) + ')', box: true,
    onPick(i, item) { if (item.id) { if (DQ.net && DQ.net.client) DQ.net.hot.push([p.sel, item.id]); else p.hotbar[p.sel] = item.id; p.popup('Slot ' + (p.sel + 1) + ': ' + DQ.itemName(item.id), '#ffffff', 2); onClose && onClose(); } },
    onCancel() { onClose && onClose(); },
  });
  return m;
};

// ---- Dev Tools: live sliders for the important numbers, cheats, and a reset ---------------------------------------
DQ.DEV_CHEATS = [
  ['Give everything', p => { for (const id of Object.keys(DQ.ITEMS)) if (DQ.ITEMS[id].kind !== 'block') p.give(id, 20); p.give('gossamer', 1); p.notions = Object.fromEntries(Object.keys(DQ.NOTION_TEXT).map(k => [k, true])); }],
  ['Fill health and belly', p => { p.builder.hp = p.builder.maxHp; p.builder.belly = 100; }],
  ['Skip to morning', p => { p.sleepUntilMorning(); }],
  ['Skip to night', p => { p.clockT = Math.ceil(p.clockT / p.dayLen) * p.dayLen + p.dayLen * 19 / 24; p.stepClock(0); }],
  ['Spawn a Snag', p => { p.spawnNearBuilder(); }],
  ['Clear monsters', p => { for (const m of p.monsters) m.dead = true; p.monsters = []; }],
  ['Complete this quest', p => { const q = p.current(); if (q) p.flagDone(q.id); }],
  ['Toggle god mode', p => { DQ.god = !DQ.god; }],
];
DQ.devState = { row: 0 };
DQ.devRows = () => [...DQ.TUNING_DEFS.map(d => ({ kind: 'slider', d })), ...DQ.DEV_CHEATS.map(([label, fn]) => ({ kind: 'cheat', label, fn })), { kind: 'reset', label: 'Reset every slider to its default' }];
DQ.devUpdate = (I, p) => {
  const rows = DQ.devRows(), s = DQ.devState;
  if (I.pressed('up') || I.repeat && I.repeat('up', .35, .12)) s.row = (s.row + rows.length - 1) % rows.length;
  if (I.pressed('down') || I.repeat && I.repeat('down', .35, .12)) s.row = (s.row + 1) % rows.length;
  const row = rows[s.row];
  if (row.kind === 'slider') {
    const d = row.d;
    let v = DQ.tuning[d.key];
    if (I.pressed('left') || (I.repeat && I.repeat('left', .3, .08))) v = Math.max(d.min, +(v - d.step).toFixed(3));
    if (I.pressed('right') || (I.repeat && I.repeat('right', .3, .08))) v = Math.min(d.max, +(v + d.step).toFixed(3));
    DQ.tuning[d.key] = v;
  }
  if (I.pressed('confirm')) {
    if (row.kind === 'cheat' && p) row.fn(p);
    if (row.kind === 'reset') DQ.resetTuning();
  }
};
DQ.devDraw = (r, p) => {
  const rows = DQ.devRows(), s = DQ.devState;
  r.overlay(g => {
    E.ui.box(g, 10, 8, r.W - 20, r.H - 16, { bg: ['#14122a', '#0a0816'], border: '#d9b77c', alpha: 0.95 });
    E.font.text(g, 'DEV TOOLS', 18, 14, '#ffe27a', { scale: 2, shadow: '#000' });
    E.font.text(g, 'Up/down choose. Left/right change a slider. Confirm runs a cheat.', 18, 34, '#9c96c4', { shadow: '#000', font: 'tiny' });
    // twelve rows at a time, following the cursor, so the list fits any screen
    const VIS = 12, top = Math.max(0, Math.min(s.row - Math.floor(VIS / 2), rows.length - VIS));
    rows.slice(top, top + VIS).forEach((row, j) => {
      const i = top + j, y = 48 + j * 13;
      const sel = i === s.row, c = sel ? '#ffe27a' : '#e8e4ff';
      if (sel) E.ui.box(g, 14, y - 2, r.W - 28, 13, { bg: '#2d2858', border: '#ffe27a', alpha: 0.6 });
      if (row.kind === 'slider') {
        const d = row.d, v = DQ.tuning[d.key], f = (v - d.min) / (d.max - d.min);
        E.font.text(g, d.label, 20, y, c, { shadow: '#000' });
        E.ui.bar(g, Math.round(r.W * 0.48), y + 1, Math.round(r.W * 0.28), 6, f, sel ? '#ffe27a' : '#8fc8ff');
        E.font.text(g, String(v) + (d.key === 'dayMinutes' ? ' min' : ''), r.W - 22, y, c, { shadow: '#000', align: 'right' });
      } else if (row.kind === 'cheat') {
        E.font.text(g, row.label, 20, y, c, { shadow: '#000' });
      } else {
        E.font.text(g, row.label, 20, y, c, { shadow: '#000' });
      }
    });
    E.font.text(g, 'Cancel closes. God mode: ' + (DQ.god ? 'ON' : 'off'), 18, r.H - 22, '#9c96c4', { shadow: '#000', font: 'tiny' });
  });
};

// ---- glyphs on a title and a pause: what the player can press to go on ------------------------------------------------

// ---- Animalese: each letter of a speech is sung. A vowel is a pitched buzz (a sawtooth) through three band filters at
// the vowel's formants, so it has the colour of a real vowel; a consonant is a burst of filtered noise (a hiss for s, f,
// sh; a click for b, d, k, p, t), and the voiced ones hum a little. The pitch rises and falls letter by letter.
DQ.FORMANTS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240], y: [270, 2290, 3010] };
DQ.speakLetter = (actx, dest, c, f0, when) => {
  const F = DQ.FORMANTS[c];
  if (F) {
    const dur = 0.14, osc = actx.createOscillator(), env = actx.createGain(), out = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, when); osc.frequency.linearRampToValueAtTime(f0 * 1.05, when + dur);
    env.gain.setValueAtTime(0.0001, when); env.gain.exponentialRampToValueAtTime(0.6, when + 0.015); env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(env);
    F.forEach((hz, k) => {
      const bp = actx.createBiquadFilter(), g = actx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = hz; bp.Q.value = 9 - k * 2;
      g.gain.value = [1, 0.6, 0.35][k];
      env.connect(bp); bp.connect(g); g.connect(out);
    });
    out.gain.value = 0.3; out.connect(dest);
    osc.start(when); osc.stop(when + dur + 0.02);
    return dur;
  }
  const dur = 0.07, buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * 0.1), actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource(), hp = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = buf;
  hp.type = 'bandpass'; hp.frequency.value = 'fsxzh'.includes(c) ? 4200 : 1500 + (c.charCodeAt(0) % 7) * 250; hp.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.35, when + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(hp); hp.connect(g); g.connect(dest);
  src.start(when); src.stop(when + dur + 0.01);
  if ('bdgvwmnlrz'.includes(c)) {
    const hum = actx.createOscillator(), hg = actx.createGain();
    hum.type = 'triangle'; hum.frequency.value = f0 * 0.6;
    hg.gain.setValueAtTime(0.0001, when); hg.gain.exponentialRampToValueAtTime(0.12, when + 0.01); hg.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    hum.connect(hg); hg.connect(dest); hum.start(when); hum.stop(when + dur + 0.01);
  }
  return dur;
};
// the speaker's voice for each letter (the dialog calls this as each letter shows)
DQ.animalese = name => {
  const key = DQ.voiceFor(name).replace('voice_', ''), f0 = (DQ.VOICES[key] || DQ.VOICES.builder).freq;
  return (idx, talk) => {
    const game = DQ.game, line = talk.pages[talk.i] || [];
    const text = (Array.isArray(line) ? line.join('\n') : String(line));
    const c = (text.charAt(idx) || String.fromCharCode(97 + ((idx * 7) % 26))).toLowerCase();
    if (c === ' ' || c === '\n') return;
    const code = c.charCodeAt(0), pitch = f0 * (0.9 + 0.22 * Math.sin(idx * 0.9 + code * 0.1));   // a sing-song rise and fall
    const actx = game.audio.ctx || (game.audio._init && game.audio._init());
    if (actx && actx.state !== 'closed') {
      const dest = game.audio._sfxBus || actx.destination;
      if (/[.!?,]/.test(c)) { const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.frequency.value = f0 * 0.5; g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2); return; }
      DQ.speakLetter(actx, dest, c, pitch, actx.currentTime + 0.005);
      return;
    }
    // no audio context (the headless tests): the same letters as short tones
    if (/[.!?,]/.test(c)) { game.audio.sfx({ wave: 'sine', freq: f0 * 0.6, to: f0 * 0.45, dur: 0.18, vol: 0.18 }); return; }
    const F = DQ.FORMANTS[c];
    if (F) game.audio.sfx({ wave: 'triangle', freq: pitch * F[0] / 500, to: pitch * F[1] / 900, dur: 0.11, vol: 0.2, vary: 0.05 });
    else { game.audio.sfx({ wave: 'noise', dur: 0.03, vol: 0.07 }); game.audio.sfx({ wave: 'square', freq: pitch * 1.25, to: pitch, dur: 0.05, vol: 0.1 }); }
  };
};
// ---- music: the score, written in code (one function a song), and the Animalese voices ---------------------------------
DQ.mkSong = (bpm, chords, mel, bass, drums) => {
  const tracks = [];
  tracks.push({ wave: 'square', vol: 0.10, notes: mel.join(' ') });
  tracks.push({ wave: 'triangle', vol: 0.14, notes: bass.join(' ') });
  if (drums) tracks.push({ wave: 'drums', vol: 0.5, notes: drums.join(' ') });
  return { bpm, steps: 4, tracks };
};
const bar = (...xs) => xs.join(' ');
DQ.SONGS = {
  title: DQ.mkSong(96,
    null,
    [bar('C5', '.', 'E5', '.', 'G5', '.', 'A5', '.'), bar('G5', '.', 'E5', '.', 'C5', '.', '.', '.'), bar('A4', '.', 'C5', '.', 'E5', '.', 'D5', '.'), bar('C5', '.', 'B4', '.', 'A4', '.', 'G4', '.')].flat(),
    [bar('C3', '-', 'C3', '-'), bar('G2', '-', 'G2', '-'), bar('A2', '-', 'A2', '-'), bar('F2', '-', 'F2', '-')].flat(),
    null),
  meadow: DQ.mkSong(118,
    null,
    [bar('E5', 'G5', 'A5', 'G5'), bar('E5', 'D5', 'C5', '.'), bar('D5', 'F5', 'A5', 'F5'), bar('G5', 'E5', 'D5', '.')].flat(),
    [bar('C3', '-', 'G2', '-'), bar('A2', '-', 'F2', '-'), bar('D3', '-', 'A2', '-'), bar('G2', '-', 'C3', '-')].flat(),
    [bar('k', '.', 'h', 'h', 's', '.', 'h', 'h'), bar('k', '.', 'h', 'h', 's', '.', 'h', 'h'), bar('k', '.', 'h', 'h', 's', '.', 'h', 'h'), bar('k', '.', 'h', 'h', 's', '.', 'h', 'h')].flat()),
  night: DQ.mkSong(84,
    null,
    [bar('A4', '.', 'C5', '.', 'E5', '.', 'C5', '.'), bar('G4', '.', 'B4', '.', 'D5', '.', 'B4', '.'), bar('F4', '.', 'A4', '.', 'C5', '.', 'A4', '.'), bar('E4', '.', 'G4', '.', 'B4', '.', 'G4', '.')].flat(),
    [bar('A2', '-', 'A2', '-'), bar('G2', '-', 'G2', '-'), bar('F2', '-', 'F2', '-'), bar('E2', '-', 'E2', '-')].flat(),
    null),
  siege: DQ.mkSong(150,
    null,
    [bar('E5', 'E5', 'G5', 'E5'), bar('D5', 'D5', 'F5', 'D5'), bar('C5', 'C5', 'E5', 'C5'), bar('B4', 'B4', 'D5', 'B4')].flat(),
    [bar('E2', 'E2', 'E2', 'E2'), bar('D2', 'D2', 'D2', 'D2'), bar('C2', 'C2', 'C2', 'C2'), bar('B1', 'B1', 'B1', 'B1')].flat(),
    [bar('k', 'k', 's', 'k'), bar('k', 'k', 's', 's'), bar('k', 'k', 's', 'k'), bar('k', 's', 'k', 's')].flat()),
  boss: DQ.mkSong(132,
    null,
    [bar('C4', 'C4', 'Eb4', 'C4'), bar('F4', 'F4', 'G4', 'Ab4'), bar('C4', 'C4', 'Eb4', 'C4'), bar('D4', 'Db4', 'C4', 'G3')].flat(),
    [bar('C2', '-', 'C2', 'C2'), bar('F2', '-', 'F2', 'F2'), bar('C2', '-', 'C2', 'C2'), bar('G2', '-', 'G2', 'G2')].flat(),
    [bar('k', 'k', 's', 'k'), bar('k', 'k', 's', 's'), bar('k', 'k', 's', 'k'), bar('k', 'k', 's', 's')].flat()),
};
// each speaker's voice: Animalese-style gibberish blips, pitched by the speaker (see the dialog's voice per speech)
DQ.VOICES = {
  hi: { wave: 'triangle', freq: 620, to: 780, dur: 0.07, vol: 0.22, vary: 0.22 },
  mid: { wave: 'square', freq: 460, to: 540, dur: 0.07, vol: 0.14, vary: 0.2 },
  low: { wave: 'triangle', freq: 260, to: 320, dur: 0.08, vol: 0.26, vary: 0.2 },
  granny: { wave: 'sine', freq: 520, to: 700, dur: 0.09, vol: 0.2, vary: 0.25 },
  builder: { wave: 'square', freq: 380, to: 440, dur: 0.06, vol: 0.1, vary: 0.3 },
};
})();
