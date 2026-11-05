/* ---- DEV MODE: opened from the pause menu, or with the Backquote key during a match. A full-screen panel over the
 * paused match: live sliders for the gameplay variables (with a reset to defaults), toggles for play aids, jumps to
 * the situations the tests and balance passes need, and the match's snapshot. Values apply at once. ---- */
G.devFlags = { slow: false, autoBat: false, autoBowl: false, infiniteHype: false, noChaos: false, muteCommentary: false, trajectory: false, invincible: false };
G.TOGGLE_DEFS = [
  ['slow', 'Slow motion (0.35x)'], ['autoBat', 'Auto-bat (the CPU bats for you)'], ['autoBowl', 'Auto-bowl (the CPU bowls for you)'],
  ['infiniteHype', 'Infinite Hype'], ['noChaos', 'No chaos events'], ['muteCommentary', 'Mute commentary'],
  ['trajectory', 'Show the predicted ball path'], ['invincible', 'Invincible batter (no wickets)']
];
G.dev = {
  open: false, tab: 0, row: 0, dragging: null,
  tabs: ['TUNING', 'TOGGLES', 'JUMP', 'INFO'],
  toggle() { this.open ? this.close() : this.show(); },
  show() {
    this.open = true; this.row = 0; this.tab = 0;
    if (G.match && G.match.phase === 'flight') G.match.dev_wasFlight = true;
    if (G.game.paused) G.game.resume();
    G.game.audio.sfx('select', { vol: .3 });
  },
  openFromPause() { this.show(); },
  close() { this.open = false; G.game.audio.sfx('cancel', { vol: .3 }); },
  rows() {
    if (this.tab === 0) return [{ kind: 'reset', label: 'RESET ALL TO DEFAULTS' }].concat(G.TUNE_DEFS.map(d => ({ kind: 'slider', def: d })));
    if (this.tab === 1) return G.TOGGLE_DEFS.map(([k, l]) => ({ kind: 'toggle', key: k, label: l }));
    if (this.tab === 2) return [
      { kind: 'act', label: 'SKIP TO THE LAST OVER', fn: () => { const I = G.match.I; I.over = Math.max(0, I.overs - 1); } },
      { kind: 'act', label: 'ADD 20 RUNS', fn: () => { G.match.I.runs += 20; } },
      { kind: 'act', label: 'FULL HYPE FOR BOTH SIDES', fn: () => { G.match.hype = [100, 100]; } },
      { kind: 'act', label: 'TRIGGER A RAIN DELAY (2ND INNINGS)', fn: () => { if (G.match.I.k === 1) { G.match.rainUsed = false; G.match.chaosNow = 'rain'; G.match.setPhase('setup', 0.2); } } },
      { kind: 'act', label: 'TRIGGER DORIS THE COW', fn: () => { G.match.chaosNow = 'cow'; G.match.setPhase('setup', 0.2); } },
      { kind: 'act', label: 'SPAWN AN ITEM', fn: () => { G.match.items[G.match.battingSide] = null; G.match.spawnItem(); } },
      { kind: 'act', label: 'UNLOCK ALL TEAMS', fn: () => { const P = G.profile(); P.unlocks = G.TEAMS.map((_, i) => i); G.saveProfile(P); } },
      { kind: 'act', label: 'WIN THE CHAPTER (STORY)', fn: () => { G.match.phase = 'end'; G.match.result = { kind: 'chase', winner: 0, wicketsLeft: 1, margin: 0, A: 0, B: 0 }; G.matchEnded(G.match); } }
    ];
    return [
      { kind: 'info', label: 'SCENE ' + G.game.sceneName },
      { kind: 'info', label: 'PHASE ' + (G.match ? G.match.phase : '-') + '  t ' + (G.match ? G.match.t.toFixed(1) : '') },
      { kind: 'info', label: 'SCORE ' + (G.match ? G.match.I.runs + '/' + G.match.I.wkts + ' (' + G.match.I.legal + ' legal)' : '-') },
      { kind: 'info', label: 'LAST BALL ' + (G.lastBall ? G.lastBall.reason + ' ' + G.lastBall.grade + ' ' + G.lastBall.delivery : '-') },
      { kind: 'info', label: 'BAKED FLOORS ' + (G.map && G.map.floors ? G.map.floors.size || Object.keys(G.map.floors).length : '-') },
      { kind: 'info', label: 'TUNING CHANGED ' + G.tuneChanged().length }
    ];
  },
  update(dt) {
    const I = G.game.input;
    const rows = this.rows();
    if (I.pressed('cancel') || I.pressed('pause') || I.pressed('block')) { I.consumeAll(); return this.close(); }
    if (I.pressed('run')) { this.tab = (this.tab + 1) % this.tabs.length; this.row = 0; }
    if (I.pressed('up')) this.row = (this.row + rows.length - 1) % rows.length;
    if (I.pressed('down')) this.row = (this.row + 1) % rows.length;
    const row = rows[this.row];
    const dir = I.pressed('right') ? 1 : I.pressed('left') ? -1 : (I.repeat && (I.repeat('right', .4, .1) ? 1 : I.repeat('left', .4, .1) ? -1 : 0)) || 0;
    if (row && row.kind === 'slider' && dir) {
      const d = row.def;
      G.tuneSet(d.key, G.tune[d.key] + dir * d.step * (I.down('shot') ? 5 : 1));
    }
    if (row && (I.pressed('confirm') || I.pressed('shot'))) {
      if (row.kind === 'reset') { G.tuneReset(); G.game.audio.sfx('confirm', { vol: .4 }); }
      else if (row.kind === 'toggle') { G.devFlags[row.key] = !G.devFlags[row.key]; G.devApply(); }
      else if (row.kind === 'act') row.fn();
      else if (row.kind === 'slider') G.tuneSet(row.def.key, G.tune[row.def.key] === row.def.def ? row.def.def : row.def.def);
    }
    if (row && row.kind === 'slider' && I.pressed('block')) G.tuneSet(row.def.key, row.def.def);
    G.devApply();
    I.consumeAll();
  },
  draw(r) {
    const rows = this.rows();
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#07060dee');
      E.font.text(g, 'DEV MODE', 8, 6, '#ffe08a', { scale: 2, outline: '#0b0814' });
      this.tabs.forEach((t, k) => E.font.text(g, t, 120 + k * 52, 10, k === this.tab ? '#ffffff' : '#7a7498', { font: 'tiny', outline: '#0b0814' }));
      const top = Math.max(0, this.row - 9);
      rows.slice(top, top + 13).forEach((row, k) => {
        const idx = top + k, y = 30 + k * 13, sel = idx === this.row;
        if (sel) px.rect(g, 6, y - 2, r.W - 12, 12, '#2f2a52');
        const label = row.kind === 'slider' ? row.def.label : row.label || '';
        E.font.text(g, label, 12, y, sel ? '#ffe08a' : '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
        if (row.kind === 'slider') {
          const d = row.def, v = G.tune[d.key], k2 = (v - d.min) / (d.max - d.min);
          const bx = Math.round(r.W * 0.52), bw = Math.round(r.W * 0.25);
          px.rect(g, bx, y + 2, bw, 3, '#2a2634'); px.rect(g, bx, y + 2, Math.round(bw * clamp(k2, 0, 1)), 3, v === d.def ? '#7a7498' : '#ffd23a');
          E.font.text(g, String(+v.toFixed(3)) + (v === d.def ? '' : ' (def ' + d.def + ')'), r.W - 12, y, v === d.def ? '#c8c0e0' : '#ffe08a', { font: 'tiny', align: 'right', outline: '#0b0814' });
        }
        if (row.kind === 'toggle') E.font.text(g, G.devFlags[row.key] ? 'ON' : 'OFF', r.W - 12, y, G.devFlags[row.key] ? '#5fd38a' : '#8a8498', { font: 'tiny', align: 'right', outline: '#0b0814' });
      });
      G.promptRow(g, [['shot', 'CHANGE'], ['pause', 'CLOSE'], ['run', 'NEXT TAB']], 6, r.H - 12);
    });
  }
};
// the toggles reach the match: slow motion, the auto play, hype, chaos and the commentary's voices
G.devApply = () => {
  const f = G.devFlags, m = G.match;
  G.game.timeScale = 1;
  G.slowT = f.slow ? 1e9 : (G.slowT && G.slowT > 1e8 ? 0 : G.slowT);
  if (!m) return;
  m.cfg.autoBat = !!(f.autoBat || (m.cfg.mode === 'attract'));
  m.cfg.autoBowl = !!(f.autoBowl || (m.cfg.mode === 'attract'));
  if (f.infiniteHype) m.hype = [100, 100];
  m.cfg.noChaos = !!f.noChaos;
  m.cfg.invincible = !!f.invincible;
  if (f.noChaos) m.chaosNow = null;
};
G.pauseItems = () => [
  ['Restart match', () => { if (G.cfg && G.game.sceneName === 'match') G.startMatch(G.cfg, G.matchOpts); }],
  ['Dev mode', () => G.dev.openFromPause()]
];
