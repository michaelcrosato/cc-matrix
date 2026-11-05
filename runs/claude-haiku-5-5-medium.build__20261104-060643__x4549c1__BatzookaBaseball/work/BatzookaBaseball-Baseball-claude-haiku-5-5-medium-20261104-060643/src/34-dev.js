// Dev mode, from the pause menu: live sliders for every balance number (BZ.TUNE), grouped in tabs, with a reset to the
// defaults; a cheat for the Batzooka meter; and warps to a match, the derby, or a CPU game. It is not in an AI Hub
// session. Cancel returns to the scene it came from, unchanged.
BZ.devTabs = ['Pitching', 'Batting', 'Ball', 'Fielding', 'Batzooka', 'Game', 'Tools'];

BZ.devRows = tab => {
  if (tab === 'Tools') return [
    { kind: 'toggle', label: 'Batzooka always full', get: () => !!BZ.cheat.batzooka, set: v => { BZ.cheat.batzooka = v; } },
    { kind: 'action', label: 'Reset to defaults', run: () => BZ.resetTune() },
    { kind: 'action', label: 'Warp: a match', run: () => BZ.playBall(BZ.game) },
    { kind: 'action', label: 'Warp: the derby', run: () => BZ.game.go('derbySetup') },
    { kind: 'action', label: 'Warp: a CPU game', run: () => BZ.game.go('attract') }
  ];
  return Object.keys(BZ.TUNE_META).filter(k => BZ.TUNE_META[k].group === tab).map(k => ({ kind: 'slider', key: k }));
};

BZ.cheat = { batzooka: false };

BZ.devScene = {
  enter(data) {
    BZ.devBack = data && data.back ? data.back : 'title';
    BZ.devTab = BZ.devTab || 0; BZ.devRow = 0;
  },
  exit() {},
  update(dt) {
    const game = BZ.game, I = game.input;
    if (I.pressed('cancel')) { game.go(BZ.devBack, { resume: true }); return; }
    if (I.pressed('prevPitch')) BZ.devTab = (BZ.devTab + BZ.devTabs.length - 1) % BZ.devTabs.length, BZ.devRow = 0;
    if (I.pressed('nextPitch')) BZ.devTab = (BZ.devTab + 1) % BZ.devTabs.length, BZ.devRow = 0;
    const rows = BZ.devRows(BZ.devTabs[BZ.devTab]);
    if (I.pressed('down')) BZ.devRow = (BZ.devRow + 1) % rows.length;
    if (I.pressed('up')) BZ.devRow = (BZ.devRow + rows.length - 1) % rows.length;
    // the mouse: a row under the pointer has the focus; a click on a slider's left or right half steps it
    const p = game.input.pointer(), click = game.input.clicked();
    const rowAt = p ? BZ.devRowAt(game, p) : null;
    if (rowAt !== null && rowAt < rows.length) BZ.devRow = rowAt;
    const tabAt = click ? BZ.devTabAt(game, click) : null;
    if (tabAt !== null) { BZ.devTab = tabAt; BZ.devRow = 0; return; }
    const row = rows[BZ.devRow];
    const step = (I.pressed('right') ? 1 : 0) - (I.pressed('left') ? 1 : 0) + (click && rowAt === BZ.devRow && row && row.kind === 'slider' ? (click[0] > game.W / 2 ? 1 : -1) : 0);
    if (row && row.kind === 'slider') {
      if (step) BZ.bumpTune(row.key, step);
    } else if (row && row.kind === 'toggle' && (I.pressed('confirm') || (click && rowAt === BZ.devRow))) row.set(!row.get());
    else if (row && row.kind === 'action' && (I.pressed('confirm') || (click && rowAt === BZ.devRow))) row.run();
  },
  draw(r) {
    const W = r.W, H = r.H, tab = BZ.devTabs[BZ.devTab], rows = BZ.devRows(tab);
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'DEV MODE', W / 2, 10, { scale: 2, align: 'center' });
      // the tabs
      BZ.devTabs.forEach((t, i) => BZ.text(g, t.toUpperCase(), 14 + i * (W - 28) / BZ.devTabs.length, 46, i === BZ.devTab ? '#ffe6a0' : '#8a92b0', { scale: 1.1 }));
      rows.forEach((row, i) => {
        const y = 70 + i * 22, on = i === BZ.devRow;
        E.ui.box(g, 12, y - 3, W - 24, 18, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#2a2e40', alpha: .9 });
        const ink = on ? '#1a1020' : '#ffffff';
        if (row.kind === 'slider') {
          const m = BZ.TUNE_META[row.key], v = BZ.TUNE[row.key];
          BZ.text(g, m.label, 22, y, ink, { scale: 1.2, shadow: null });
          const bx = W * .5, bw = W * .26, f = (v - m.min) / (m.max - m.min);
          E.ui.bar(g, bx, y + 2, bw, 8, f, on ? '#1a1020' : '#7ad06a');
          BZ.text(g, String(Math.round(v * 100) / 100) + (m.def === v ? '' : ' *'), bx + bw + 10, y, ink, { scale: 1.2, shadow: null });
        } else if (row.kind === 'toggle') {
          BZ.text(g, row.label + ':  ' + (row.get() ? 'ON' : 'OFF'), 22, y, ink, { scale: 1.2, shadow: null });
        } else BZ.text(g, row.label, 22, y, ink, { scale: 1.2, shadow: null });
      });
      BZ.text(g, '* = changed from the default. ' + BZ.prompt('prevPitch', 'LESS') + ' ' + BZ.prompt('nextPitch', 'MORE') + ' TABS  ·  ' + BZ.prompt('cancel', 'BACK'), W / 2, H - 16, '#c8d0f0', { align: 'center', scale: 1, shadow: null });
    });
  }
};

// The row under a pointer (a row is 22 px high, from y = 70), and the tab under it.
BZ.devRowAt = (game, p) => {
  const i = Math.floor((p[1] - 67) / 22);
  return p[0] > 12 && p[0] < game.W - 12 && i >= 0 ? i : null;
};
BZ.devTabAt = (game, p) => {
  if (!p || p[1] < 40 || p[1] > 60) return null;
  const i = Math.floor((p[0] - 14) / ((game.W - 28) / BZ.devTabs.length));
  return i >= 0 && i < BZ.devTabs.length ? i : null;
};
