/* BATZOOKA BASEBALL: dev mode (from the pause menu). Live sliders for the balance numbers with a reset to defaults,
   plus tools: fill the meter, force a homer, set the count, load the bases, skip a half-inning, slow motion, god mode. */
BZ.devTools = [
  ['Fill Batzooka meters', M => { M.sides[0].meter = M.sides[1].meter = 100; }],
  ['Next hit is a home run', M => { M.forceHomer = !M.forceHomer; }],
  ['Load the bases', M => { M.runners = []; for (let b = 1; b <= 3; b++) { const o = BZ.off(), a = o.actors[(o.order + b) % 9]; addRunner(a, b); } }],
  ['Clear the bases', M => { M.runners = []; }],
  ['Add a run (batting team)', M => { M.score[M.half]++; M.line[M.half][M.inn - 1] = (M.line[M.half][M.inn - 1] || 0) + 1; }],
  ['Add an out', M => { M.outs = Math.min(2, M.outs + 1); }],
  ['Set count 3-2', M => { M.balls = 3; M.strikes = 2; }],
  ['Clear count', M => { M.balls = 0; M.strikes = 0; }],
  ['End this half-inning', M => { M.outs = 3; }],
  ['Skip to the last inning', M => { M.inn = Math.max(M.inn, M.innings); }],
  ['Slow motion on / off', M => { game.timeScale = game.timeScale < 1 ? 1 : .35; }],
  ['Auto-play my side (CPU)', M => { for (const s of M.sides) if (s.human) { s.wasHuman = true; s.human = false; } else if (s.wasHuman) { s.human = true; s.wasHuman = false; } }],
  ['Show the hit box / sweet spot', M => { BZ.showBox = !BZ.showBox; }],
  ['Close dev mode', M => { }]
];
BZ.devTools.unshift(['Reset sliders to defaults', M => { BZ.resetTune(); BZ.rebuildPark(); }]);
BZ.openDev = (scene) => {
  scene.dev = { open: true, running: false, i: 0, scroll: 0, keys: Object.keys(BZ.TUNE_META), msg: 'DEV MODE' };
  game.input.consumeAll();
};
BZ.devRows = scene => {
  const d = scene.dev, rows = [];
  rows.push({ kind: 'toggle', label: 'Keep the game running', get: () => d.running, set: v => { d.running = v; } });
  for (const k of d.keys) { const m = BZ.TUNE_META[k]; rows.push({ kind: 'slider', key: k, label: m[0], min: m[2], max: m[3], step: m[4], def: m[5], group: m[1] }); }
  BZ.devTools.forEach((t, i) => rows.push({ kind: 'btn', label: t[0] + (t[0].startsWith('Next hit') && BZ.M.forceHomer ? '  [ON]' : ''), fn: t[1], close: i === BZ.devTools.length - 1 }));
  return rows;
};
BZ.devUpdate = (scene, dt) => {
  const d = scene.dev, I = game.input, rows = BZ.devRows(scene), n = rows.length, vis = d.vis || 14;
  if (I.pressed('cancel') || I.pressed('pause') || I.pressed('start')) { d.open = false; game.timeScale = game.timeScale; I.consumeAll(); return; }
  if (I.repeat('up', .3, .09)) d.i = (d.i + n - 1) % n;
  if (I.repeat('down', .3, .09)) d.i = (d.i + 1) % n;
  const row = rows[d.i];
  d.scroll = clamp(d.scroll, d.i - vis + 1, d.i);
  const dir = (I.repeat('right', .3, .05) ? 1 : 0) - (I.repeat('left', .3, .05) ? 1 : 0);
  if (row.kind === 'slider' && dir) { const v = clamp(Math.round((BZ.TUNE[row.key] + dir * row.step * (I.down('turbo') ? 5 : 1)) / row.step) * row.step, row.min, row.max); BZ.TUNE[row.key] = +v.toFixed(4); if (row.key === 'fence') BZ.rebuildPark(); }
  if (row.kind === 'toggle' && (dir || I.pressed('confirm'))) row.set(!row.get());
  if (row.kind === 'btn' && I.pressed('confirm')) { row.fn(BZ.M); BZ.sfx('coin'); d.msg = row.label.toUpperCase(); if (row.close) d.open = false; I.consumeAll(); }
  // the mouse: hover picks a row, a click acts; the wheel scrolls
  const ptr = I.pointer && I.pointer();
  if (ptr && I.lastDevice === 'mouse' && d.rects) {
    const S = game.screen.S; const px_ = ptr[0] / S, py_ = ptr[1] / S;
    for (const rc of d.rects) if (px_ >= rc.x && px_ <= rc.x + rc.w && py_ >= rc.y && py_ <= rc.y + rc.h) {
      d.i = rc.i; const rw = rows[rc.i];
      if (I.pressed('swing')) { if (rw.kind === 'btn') { rw.fn(BZ.M); if (rw.close) d.open = false; } else if (rw.kind === 'toggle') rw.set(!rw.get()); else if (rw.kind === 'slider') { const k = clamp((px_ - rc.sx) / rc.sw, 0, 1); const v = rw.min + (rw.max - rw.min) * k; BZ.TUNE[rw.key] = +(Math.round(v / rw.step) * rw.step).toFixed(4); if (rw.key === 'fence') BZ.rebuildPark(); } }
    }
  }
  if (!d.open) { game.input.consumeAll(); }
};
BZ.devDraw = (scene, g, r) => {
  const d = scene.dev, rows = BZ.devRows(scene), W_ = r.W, H_ = r.H, rh = 11, vis = Math.max(6, Math.floor((H_ - 56) / rh)); d.vis = vis;
  const x = 4, y = 18, w = Math.min(250, W_ - 8);
  px.rect(g, x, y - 14, w, vis * rh + 40, 'rgba(6,8,22,.94)'); px.rect(g, x, y - 14, w, 1, '#7affc0');
  E.font.text(g, 'DEV MODE  -  ' + (d.running ? 'LIVE' : 'FROZEN'), x + 4, y - 10, '#7affc0', { shadow: '#000', outline: false });
  d.rects = [];
  d.scroll = clamp(d.scroll, d.i - vis + 1, d.i); const start = clamp(d.scroll, 0, Math.max(0, rows.length - vis));
  for (let k = 0; k < vis; k++) {
    const i = start + k, row = rows[i]; if (!row) break; const yy = y + k * rh, sel = i === d.i;
    if (sel) px.rect(g, x + 2, yy - 1, w - 4, rh - 1, 'rgba(122,255,192,.18)');
    E.font.text(g, row.label, x + 6, yy + 2, sel ? '#ffffff' : '#b8b8d8', { shadow: '#000', outline: false });
    let sx = 0, sw = 0;
    if (row.kind === 'slider') {
      const v = BZ.TUNE[row.key]; sw = 70; sx = x + w - sw - 36;
      px.rect(g, sx, yy + 4, sw, 3, '#2a2a48'); px.rect(g, sx, yy + 4, sw * (v - row.min) / (row.max - row.min), 3, v === row.def ? '#8888cc' : '#ffb030');
      px.rect(g, sx + sw * (row.def - row.min) / (row.max - row.min), yy + 2, 1, 7, '#ffffff');
      E.font.text(g, String(+v.toFixed(2)), x + w - 32, yy + 2, '#ffe070', { shadow: '#000', outline: false });
    } else if (row.kind === 'toggle') E.font.text(g, row.get() ? 'ON' : 'OFF', x + w - 28, yy + 2, row.get() ? '#7aff9a' : '#ff8a8a', { shadow: '#000', outline: false });
    d.rects.push({ i, x, y: yy - 1, w, h: rh - 1, sx, sw });
  }
  const f = y + vis * rh + 2;
  BZ.prompt(g, game, x + 4, f, 'up', ''); E.font.text(g, 'Move', x + 30, f + 2, '#aaaacc', { outline: false });
  BZ.prompt(g, game, x + 70, f, 'left', ''); E.font.text(g, 'Adjust (hold Turbo = x5)', x + 96, f + 2, '#aaaacc', { outline: false });
  E.font.text(g, d.msg || '', x + 4, f + 12, '#7affc0', { outline: false });
  if (BZ.showBox) { }
};

/* ---- derby HUD and the Playbook ---- */
BZ.drawDerbyHud = (g, game, M, W_, H_) => {
  const D = M.derby, p = D.players[D.cur];
  px.rect(g, 4, 4, 150, 46, 'rgba(8,10,26,.82)'); px.rect(g, 4, 4, 150, 1, '#ffd23a');
  E.font.text(g, 'HOME RUN DERBY', 8, 8, '#ffd23a', { shadow: '#000', outline: false });
  E.font.text(g, p.name + '   OUTS ' + (D.outsMax - p.outs) + '/' + D.outsMax, 8, 19, '#ffffff', { shadow: '#000', outline: false });
  E.font.text(g, 'HR ' + p.hr + '   BEST ' + p.best + ' FT', 8, 30, '#9aff9a', { shadow: '#000', outline: false });
  E.font.text(g, 'SCORE ' + p.score + (p.streak > 1 ? '  x' + p.streak : ''), 8, 41, '#ffe070', { shadow: '#000', outline: false });
  if (D.players.length > 1) D.players.forEach((q, i) => E.font.text(g, q.name + ' ' + q.score, W_ - 6, 6 + i * 10, i === D.cur ? '#ffe070' : '#9898b8', { align: 'right', shadow: '#000', outline: false }));
  if (D.clockLimit) { const left = Math.max(0, D.clockLimit - M.clock); E.font.text(g, 'TIME ' + Math.ceil(left), W_ / 2, 6, left < 15 ? '#ff6a6a' : '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
  const m = M.sides[0].meter; px.rect(g, 4, 52, 100, 6, '#14162a'); px.rect(g, 5, 53, 98 * (m / 100), 4, m >= 100 ? '#ffee66' : '#ff9a30'); E.font.text(g, 'BATZOOKA', 108, 51, '#ffb030', { shadow: '#000', outline: false });
};
BZ.drawHelp = (g, game, W_, H_) => {
  px.rect(g, 0, 0, W_, H_, 'rgba(6,8,22,.94)');
  E.font.title(g, 'THE PLAYBOOK', W_ / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' });
  const I = game.input;
  const rows = [
    ['BATTING', [['stick', 'Move the bat ring to where the ball will cross'], ['swing', 'Swing as the ball reaches the plate'], ['tri', 'Hold + swing: bunt'], ['power', 'Full meter: BATZOOKA swing'], ['cir', 'Steal with a runner on']]],
    ['PITCHING', [['stick', 'Aim the pitch, then steer it in flight'], ['dive', 'Change pitch (hold: beanball!)'], ['swing', 'Throw'], ['power', 'Full meter: FIREBALL']]],
    ['FIELDING', [['stick', 'Chase the ball (the ring is you)'], ['th', 'Throw home'], ['t3', '3rd'], ['t2', '2nd'], ['t1', '1st'], ['dive', 'Dive / leap the wall'], ['sup', 'Full meter: ROCKET GLOVE']]],
    ['RUNNING', [['tri', 'Send runners forward'], ['cir', 'Recall them'], ['turbo', 'Turbo']]]
  ];
  let y = 30;
  for (const [h, items] of rows) {
    E.font.text(g, h, 14, y, '#7affc0', { shadow: '#000', outline: false }); y += 10;
    for (const [a, t] of items) { BZ.prompt(g, game, 20, y - 1, a, t); y += 12; }
    y += 3;
  }
  BZ.prompt(g, game, W_ / 2 - 40, H_ - 14, 'confirm', 'Back to the game');
};
