/* MASH TV — 18-session: the AI Hub session around the Lightning Round: the join (connect, then ready with no key press), the
 * card (our own: the line-up, the answers, the time left), the start, the play (host or mirror), the Esc overlay that never
 * pauses, and the end (§14.2). Outside a session none of this runs. */

MT.sessionStart = (info) => {
  const G = MT.G, N = MT.NET;
  N.info = info; N.host = !!info.isHost; N.server = !!info.server; N.me = info.me; N.on = true;
  const seats = info.players.map(p => p.id);
  MT.seedAll(info.seed || 7);
  const run = MT.startRun({ mode: 'session', diff: 'contestant', slots: seats, seed: info.seed || 7 });
  run.players = seats.map(id => ({ slot: id, input: (!info.server && id === info.me) ? G.input : null, remote: info.server || id !== info.me, c: null }));
  run.diff = MT.DIFF.contestant;
  const meta = (n) => { const el = typeof document !== 'undefined' && document.querySelector('meta[name="' + n + '"]'); return el ? el.getAttribute('content') : ''; };
  N.meta = { goal: meta('hub:session-goal'), howto: meta('hub:session-howto') };
  const h = MT.hub();
  h.on('card', c => { N.card = c; });
  h.on('start', () => { N.started = true; });
  h.on('message', (data, from) => MT.netOnMessage(data, from));
  h.on('leave', ({ id, reason }) => {
    const p = run.players.find(q => q.slot === id); if (!p || !p.c) return;
    p.c.state = 'out'; p.c.lives = 0; N.leftIds[id] = reason; MT.banner(MT.safeName(info.players.find(q => q.id === id)?.name) + ' LEFT THE STUDIO', '#ff3344', 2.5);
    MT.sfx('confetti'); MT.netCheckAllLeft(run);
  });
  h.on('time-up', () => { if (N.host && MT.PLAY.W) MT.netFinish(run, false); });
  h.on('end', ({ reason, standings }) => { N.endReason = reason; N.endStandings = standings || null; N.ended = true; G.input.clear && G.input.clear(); G.audio.stopMusic && G.audio.stopMusic(.3); G.audio.mute(true); });
};
MT.netCheckAllLeft = (run) => { if (MT.NET.host && run.players.every(p => !p.c || p.c.state === 'out') && !MT.NET.finished) MT.netFinish(run, false); };

// the join: connect with the card on, then ready() once: the card answers Ready and More time
MT.scenes.hubwait = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { const G = MT.G; const h = MT.hub(); h.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => { if (!info) { G.go('title', null, { fade: 0 }); return; } MT.sessionStart(info); G.go('sessioncard', null, { fade: 0 }); }); },
  update() {}, draw(r) { r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.text(g, 'JOINING THE STUDIO...', r.W / 2, r.H / 2, '#fff7e8', { scale: 2, align: 'center' })); }
};
// the card: our own (connect({card: true})): the players lined up, who is ready, how to win, this player's controls, the time
MT.scenes.sessioncard = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() {
    const N = MT.NET, h = MT.hub(); MT.cardRects = {};
    h.ready();   // loaded: the round can start, with no key press
    MT.music('theme');
    MT.say('LANCE', 'TONIGHT, ' + N.info.players.length + ' CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!', { prio: 5 });
    if (!MT._enterKeyBackstop) { MT._enterKeyBackstop = true; if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', e => { if (MT.G && MT.G.sceneName === 'sessioncard' && (e.code === 'Enter' || e.key === 'Enter')) MT.hub().answer('ready'); }); }
  },
  update(dt) {
    const G = MT.G, h = MT.hub(), N = MT.NET;
    for (const p of (G.players || [G.input])) {
      if (p.pressed('confirm') || p.pressed('start')) h.answer('ready');
      if (p.pressed('extra') || p.pressed('reset') && false) h.answer('more');
    }
    const c = MT.cardRects.ready, m = MT.cardRects.more, pt = G.input.clicked && G.input.clicked();
    if (pt && c && pt[0] >= c[0] && pt[0] <= c[0] + c[2] && pt[1] >= c[1] && pt[1] <= c[1] + c[3]) h.answer('ready');
    if (pt && m && pt[0] >= m[0] && pt[0] <= m[0] + m[2] && pt[1] >= m[1] && pt[1] <= m[1] + m[3]) h.answer('more');
    if (N.started && h.time() >= 0) G.go('play', { session: true }, { fade: 0 });
  },
  draw(r) {
    const N = MT.NET, card = N.card || {}, info = N.info, ready = card.ready || [];
    r.sky(['#140a34', '#3a1c66']);
    MT.drawSpotlights(r, 0);
    r.overlay(g => E.font.title(g, 'MASH TV', r.W / 2, 12, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    r.overlay(g => E.font.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, 40, '#2ee6ff', { scale: 1, align: 'center', shadow: '#000' }));
    const n = info.players.length;
    info.players.forEach((p, i) => {
      const x = Math.round(r.W * (.5 + (i - (n - 1) / 2) * .22)) - 40, y = 56, col = MT.slots[p.id % 4].color;
      r.overlay(g => {
        E.ui.box(g, x, y, 80, 60, { bg: ['#241240', '#0e061e'], border: col, alpha: .95 });
        E.font.text(g, MT.safeName(p.name), x + 40, y + 6, col, { scale: 1, align: 'center', shadow: '#000' });
        E.font.text(g, MT.LOOKS[p.id % 4].name, x + 40, y + 20, '#fff7e8', { scale: 1, align: 'center' });
        E.font.text(g, ready.includes(p.id) ? 'READY' : 'NOT YET', x + 40, y + 40, ready.includes(p.id) ? '#7ad06a' : '#ffcc33', { scale: 1, align: 'center' });
      });
    });
    const left = card.left, t = N.started ? (MT.hub().time() < 0 ? 'STARTING: ' + Math.ceil(-MT.hub().time() / 1000) : 'MASH!') : card.paused ? 'PAUSED: MORE TIME' : left != null ? 'STARTS IN ' + Math.ceil(left / 1000) : 'GET READY';
    r.overlay(g => E.font.text(g, t, r.W / 2, 124, '#ffcc33', { scale: 2, align: 'center', shadow: '#000' }));
    r.overlay(g => E.font.text(g, 'HOW TO WIN: ' + (N.meta.goal || 'GRAB THE MOST CASH, BEAT MASHY TOGETHER').toUpperCase(), r.W / 2, 150, '#fff7e8', { scale: 1, align: 'center', shadow: '#000', wrap: r.W - 40 }));
    const mine = MT.glyph;
    r.overlay(g => { const x = r.W / 2 - 62, y = 176; E.ui.box(g, x, y, 56, 18, { bg: ['#7ad06a', '#2a7a2a'], border: '#fff7e8', alpha: .95 }); E.font.text(g, 'READY', x + 28, y + 5, '#101010', { scale: 1, align: 'center' }); MT.cardRects.ready = [x, y, 56, 18]; });
    r.overlay(g => { const x = r.W / 2 + 6, y = 176; E.ui.box(g, x, y, 62, 18, { bg: ['#241240', '#0e061e'], border: '#ffcc33', alpha: .95 }); E.font.text(g, 'MORE TIME', x + 31, y + 5, '#fff7e8', { scale: 1, align: 'center' }); MT.cardRects.more = [x, y, 62, 18]; });
    r.overlay(g => { MT.glyph.prompt(g, 10, r.H - 26, [['confirm', 'READY'], ['extra', 'MORE TIME']], MT.G.input, { scale: 1 }); E.font.text(g, (N.meta.howto || 'MOVE LEFT STICK / WASD · FIRE RIGHT STICK / MOUSE · SLIDE SPACE / L2 · SHOWSTOPPER E / R1').toUpperCase(), 10, r.H - 40, '#8a7aa8', { scale: 1, wrap: r.W - 20 }); });
  }
};
// the end of the round (§14.2 end): the reason, and the standings if there are any
MT.scenes.sessionend = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() { MT.music('ending'); },
  update() {},
  draw(r) {
    const N = MT.NET, reason = N.endReason;
    r.sky(['#140a34', '#3a1c66']);
    const line = reason === 'finished' ? "THAT'S OUR SHOW!" : reason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : reason === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.';
    r.overlay(g => E.font.title(g, line, r.W / 2, r.H / 2 - 40, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    if (N.endStandings) N.endStandings.slice(0, 4).forEach((ids, i) => r.overlay(g => E.font.text(g, (i + 1) + '. ' + ids.map(id => MT.safeName((N.info.players.find(p => p.id === id) || {}).name)).join(' / '), r.W / 2, r.H / 2 + 6 + i * 12, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' })));
  }
};
// the Esc overlay in a session: volume, music, button symbols, close. It never pauses the round.
MT.netOverlay = { open: false, row: 0 };
MT.netOverlayRows = () => [
  { label: 'VOLUME  ' + Math.round(MT.G.audio.volume * 100) + '%', act: (d) => { MT.G.audio.setVolume(Math.max(0, Math.min(1, MT.G.audio.volume + (d || 0.1)))); } },
  { label: 'MUSIC  ' + (MT.G.audio.musicVolume > 0 ? 'ON' : 'OFF'), act: () => { MT.G.audio.musicVolume = MT.G.audio.musicVolume > 0 ? 0 : 0.7; MT.G.audio.applyVolume && MT.G.audio.applyVolume(); } },
  { label: 'BUTTON SYMBOLS  ' + (MT.G.settings.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), act: () => { MT.G.settings.set('glyphs', MT.G.settings.glyphs === 'xbox' ? 'playstation' : 'xbox'); } },
  { label: 'CLOSE', act: () => { MT.netOverlay.open = false; } }
];
MT.netOverlayUpdate = (G) => {
  const O = MT.netOverlay; const rows = MT.netOverlayRows();
  for (const p of (G.players || [G.input])) {
    if (p.pressed('down')) O.row = (O.row + 1) % rows.length;
    if (p.pressed('up')) O.row = (O.row + rows.length - 1) % rows.length;
    if (p.pressed('right')) rows[O.row].act(0.1);
    if (p.pressed('left')) rows[O.row].act(-0.1);
    if (p.pressed('confirm')) rows[O.row].act(0);
    if (p.pressed('cancel')) O.open = false;
  }
};
MT.netOverlayDraw = (r) => {
  const O = MT.netOverlay, rows = MT.netOverlayRows();
  r.overlay(g => { E.ui.box(g, r.W / 2 - 90, r.H / 2 - 50, 180, 100, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .97 }); E.font.text(g, 'SESSION OPTIONS', r.W / 2, r.H / 2 - 42, '#ffcc33', { scale: 1, align: 'center' }); });
  rows.forEach((row, i) => r.overlay(g => E.font.text(g, (i === O.row ? '> ' : '  ') + row.label, r.W / 2 - 80, r.H / 2 - 26 + i * 16, i === O.row ? '#ffffff' : '#c8c0e0', { scale: 1 })));
};
// a copy that is not the host: its own player moves at once (prediction), its intent goes to the host, and the host's
// snapshot replaces the rest; the rigs and the world are posed from what the snapshot says
MT.netClientStep = (G, dt) => {
  const N = MT.NET, W = MT.PLAY.W, run = MT.run; if (!W || !run) return;
  if (N.lastSnap && N.lastSnap !== N.appliedSnap) { N.appliedSnap = N.lastSnap; MT.netApply(W, N.lastSnap, run); }
  W.time += dt;
  const own = W.players.find(c => c.slot === N.me);
  const zero = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  const I = (own && !MT.netOverlay.open) ? MT.intentFrom(G.input, own, G, W) : zero;
  if (own && I.move && (I.move[0] || I.move[1]) && own.state === 'play') { own.x += I.move[0] * MT.T.playerSpeed * dt; own.y += I.move[1] * MT.T.playerSpeed * dt; W.wallClamp(own); }
  N.intentT = (N.intentT || 0) - dt;
  if (N.intentT <= 0) { N.intentT = 1 / 15; MT.netSendIntent(I); }
  for (const c of W.players) { if (!c.rig) c.rig = MT.lookRig(c.slot); c.rig.update(dt, c.rsState); }
  for (const e of W.enemies) { if (!e.rig && MT.RIGS[e.kind] && MT.RIGS[e.kind].kind !== 'custom') e.rig = MT.makeRig(MT.RIGS[e.kind]); if (e.rig) e.rig.update(dt, { x: e.x, y: e.y, z: e.z || 0, vx: 0, vy: 0, facing: e.face || 0, hurt: e.flash > 0, pose: e.wind > 0 ? 'cheer' : undefined }); }
  if (W.boss) W.boss.t = (W.boss.t || 0) + dt;
};
