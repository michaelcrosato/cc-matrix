/* 57-ui-end: results (the rank stamp slams in, five big lines, Halo Time left, the instructor's line, a new postcard),
 * game over (the cracked halo; retry, continue from the last station, back), the ending (the finale on the platform,
 * then credits over the night line), the Driver's Log (records, postcards drawn by the rail renderer, stats) and
 * About & Credits (pixel pages). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T, SND = () => DH.Sound;
const inBox = (p, b) => p && b && p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;
/* ================= RESULTS ================= */
let RS = null;
DH.scenes.results = {
  input: DH.KEYS, camera: { zoom: false },
  enter(d) {
    const sum = d.sum, S = DH.STAGES[sum.stage], free = !!d.free, cards = (DH.Progress.get().postcards || []);
    RS = { sum, S, free, t: 0, stamped: false, cards: d.cards || (DH.lastCards || []), freeOpts: d.freeOpts };
    DH.lastCards = []; if (!free && !sum.tut) DH.boardAdd('ROOKIE', sum.score);
    SND().music(sum.rank === 'S' || sum.rank === 'A' ? 'results' : sum.rank === 'B' || sum.rank === 'C' ? 'resultsMid' : 'resultsLow');
    const items = [];
    const i = DH.CAREER.indexOf(sum.stage);
    if (!free && sum.stage === 'S5') items.push({ label: 'CONTINUE', onPick: () => game.go('ending', null, { fade: 'iris' }) });
    else if (!free && i >= 0 && DH.CAREER[i + 1] && DH.Progress.unlocked(DH.CAREER[i + 1])) items.push({ label: 'NEXT STAGE', onPick: () => game.go('briefing', { stage: DH.CAREER[i + 1] }, { fade: 'wipe' }) });
    items.push({ label: 'RETRY', onPick: () => game.go('briefing', { stage: sum.stage, free: free ? d.freeOpts : undefined }, { fade: 'wipe' }) });
    items.push(free ? { label: 'FREE RUN', onPick: () => game.go('freeRun', null, { fade: 'wipe' }) } : { label: 'HALO MAP', onPick: () => game.go('haloMap', { select: DH.Progress.nextCareer() }, { fade: 'wipe' }) });
    RS.menu = new DH.BigMenu(items, { w: 150, scale: 1, gap: 8 });
  },
  update(dt) {
    RS.t += dt; if (RS.t > 1.5 && !RS.stamped) { RS.stamped = true; game.audio.sfx('stamp'); game.shake(.3); game.input.rumble(.5, .2); }
    if (RS.t > 2) RS.menu.update(dt); else if (game.input.anyPressed()) RS.t = 2;
  },
  draw(r) {
    const s = RS.sum, S = RS.S, R = DH.route(S.route), last = R.stations.find(q => q.id === S.stops[S.stops.length - 1].id);
    DH.drawScenic(r, { route: S.route, s: (S.tutorial ? 880 : last.stop[6]) + 20, h: S.tod + .1, w: S.weather, dir: -1, x: -3.2, h0: 2.6, horizon: .5 });
    r.overlay(g => {
      const W = r.W, H = r.H, t = RS.t, wide = W >= 400, cx = wide ? Math.round(W * .38) : Math.round(W / 2);
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, S.tutorial ? 'DEPOT CERTIFICATE' : S.name, 12, 10, '#f2c230', { scale: 2, shadow: '#000' }); T(g, RS.free ? 'FREE RUN' : S.tutorial ? 'TUTORIAL' : 'RESULTS', 12, 28, '#c8d0e8', { shadow: '#000' });
      const lines = [];
      if (s.tut) { s.tut.marks.forEach((m, i) => lines.push(['MARK ' + (i + 1), m.label + '  ' + (m.err >= 0 ? '+' : '') + m.err.toFixed(2) + ' m' + (m.smooth ? '  SMOOTH' : ''), DH.JCOL[(DH.JUDGE.find(j => j[1] === m.label) || [])[4]] || '#ffffff'])); lines.push(['CALLS', s.calls.made + ' MADE', '#ffffff']); }
      else {
        const J = s.judgments.filter(j => !j.tut), cnt = k => J.filter(j => j.key === k).length;
        lines.push(['STOPS', [['PERFECT', cnt('perfect')], ['GREAT', cnt('great')], ['GOOD', cnt('good')], ['OK', cnt('ok')], ['OVER', cnt('overrun') + cnt('over')], ['SHORT', cnt('short')]].filter(q => q[1]).map(q => q[1] + ' ' + q[0]).join('  ') || 'NONE', '#ffe070']);
        lines.push(['PUNCTUALITY', s.onTime + ' OF ' + J.length + ' ON TIME', s.onTime === J.length ? '#ffe070' : '#ffffff']);
        lines.push(['CALLS & HORN', s.calls.great + ' GREAT CALLS  ·  ' + s.horns.made + '/' + s.horns.possible + ' HORN', '#4ae8ff']);
        lines.push(['SMOOTHNESS', s.smooth + ' SMOOTH  ·  RIDE ' + s.comfort + '%', '#ff9ad8']);
        lines.push(['PENALTIES', s.penalties ? s.penalties + (s.misc.spads ? '  (SPAD!)' : '') : 'NONE', s.penalties ? '#ff8a7a' : '#6aff8a']);
      }
      const x0 = 14, y0 = 48;
      lines.forEach(([a, b, c], i) => { const k = Math.min(1, Math.max(0, (t - .2 - i * .18) / .2)); if (k <= 0) return; px.blend(g, k, 'normal', () => { E.ui.box(g, x0, y0 + i * 22, Math.min(W - 28, wide ? W * .58 : W - 28), 19, { alpha: .75, bg: '#0a0c18', border: '#2a2a40' }); T(g, a, x0 + 6, y0 + i * 22 + 2, '#8a90b0', { font: 'tiny' }); T(g, b, x0 + 6, y0 + i * 22 + 9, c, { shadow: '#000' }); }); });
      const yb = y0 + lines.length * 22 + 4;
      if (t > 1.2) { T(g, 'HALO TIME LEFT  ' + Math.floor(s.grace) + ' s', x0, yb, '#f2c230', { shadow: '#000' }); T(g, 'SCORE  ' + s.score, x0, yb + 12, '#ffffff', { scale: 2, shadow: '#000' }); }
      // the stamp slams in
      const sx = wide ? W - Math.round(W * .17) - 8 : W - 44, sy = wide ? 74 : 60;
      if (t > 1.5) { const u = Math.min(1, (t - 1.5) / .18), sc = 3.2 - 2.2 * u; DH.stamp(g, sx, sy, s.tut ? (s.tut.passed ? 'S' : 'D') : s.rank, sc * (wide ? 1.4 : 1)); T(g, s.tut ? (s.tut.passed ? 'CERTIFIED' : 'TRY AGAIN') : 'RANK', sx, sy + 30, '#ff8a7a', { align: 'center', shadow: '#000' }); }
      if (t > 1.9) {
        const line = (S.results && S.results[s.tut ? 'A' : s.rank]) || '', who = 'hoshino', ch = DH.CHARS[who], w = wide ? Math.round(W * .34) : Math.min(W - 24, 300), x = wide ? W - w - 8 : Math.round((W - w) / 2), lines = F.wrap(line, w - 40), bh = Math.max(30, 14 + lines.length * 10), y = wide ? sy + 44 : Math.min(H - 86, yb + 34);
        E.ui.box(g, x, y, w, bh, { alpha: .85, bg: '#0a0c18', border: ch.col }); DH.CAST.hoshino.drawPortrait(g, x + 3, y + 3, 24, { bg: '#1a2a4a' }); T(g, ch.name, x + 32, y + 4, ch.col); lines.forEach((ln, i) => T(g, ln, x + 32, y + 14 + i * 10, '#f4f0e8'));
        if (!RS.said) { RS.said = true; DH.Babble.say(line, 'hoshino'); }
        RS.menu.w = wide ? w : 150; RS.menu.x = wide ? x : Math.round(W - 162); RS.menu.y = Math.max(y + bh + 6, Math.min(H - RS.menu.items.length * RS.menu.rowH - 26, y + bh + 10)); RS.menu.draw(g, W, H, { subs: false });
      }
      // a new postcard turns over
      if (RS.cards.length && t > 2.2) { const c = DH.POSTCARDS.find(q => q.id === RS.cards[0]), u = Math.min(1, (t - 2.2) / .4), w2 = Math.round(90 * Math.abs(Math.cos((1 - u) * Math.PI / 2))); E.ui.box(g, W - 110 + (90 - w2) / 2, 14, Math.max(2, w2), 56, { bg: ['#f8f0e0', '#e8dcc4'], border: '#c8a060' }); if (u >= 1) { T(g, 'NEW POSTCARD', W - 65, 20, '#8a3a2a', { align: 'center', font: 'tiny' }); T(g, F.wrap(c.title, 82)[0], W - 65, 32, '#3a2a1a', { align: 'center' }); T(g, 'from ' + c.from, W - 65, 46, '#6a5a4a', { align: 'center', font: 'tiny' }); } }
      if (t > 2) DH.promptLine(g, W, H, [['updown', 'CHOOSE'], ['confirm', 'OK']]);
    });
  }
};
/* ================= GAME OVER ================= */
let GO = null;
DH.scenes.gameOver = {
  input: DH.KEYS, camera: { zoom: false },
  enter(d) {
    GO = { d, t: 0 }; SND().music('over', { loop: false });
    const items = [{ label: 'RETRY STAGE', onPick: () => game.go('drive', { stage: d.stage, free: d.free ? d.freeOpts : undefined }, { fade: 'wipe' }) }];
    if (d.canContinue && DH.lastDrive) items.push({ label: 'CONTINUE FROM LAST STATION', sub: 'Halo Time back to the start, the score halved', onPick: () => game.go('drive', { resume: DH.lastDrive }, { fade: 'wipe' }) });
    items.push(d.free ? { label: 'FREE RUN', onPick: () => game.go('freeRun', null, { fade: 'wipe' }) } : { label: 'HALO MAP', onPick: () => game.go('haloMap', { select: d.stage }, { fade: 'wipe' }) });
    GO.menu = new DH.BigMenu(items, { w: 260, scale: 1, gap: 8 });
  },
  update(dt) { GO.t += dt; if (GO.t > 1) GO.menu.update(dt); },
  draw(r) {
    DH.drawScenic(r, 'over');
    r.overlay(g => {
      const W = r.W, H = r.H, t = GO.t; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#100408'));
      // the cracked halo
      const cx = W / 2, cy = Math.round(H * .26), R0 = 26;
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, gap = i % 15 < 2, drop = gap ? 0 : Math.max(0, t - .3) * (i % 7) * 3; if (gap) continue; px.rect(g, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0 * .35 + drop * drop * .4, 2, 2, i % 2 ? '#c89a20' : '#f2c230'); }
      F.title(g, 'OUT OF HALO TIME', Math.round(cx), cy + 18, { scale: 2, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 2 });
      const line = (DH.STAGES[GO.d.stage] || {}).gameOver || 'That\'s enough. Hand me the key.';
      E.ui.box(g, Math.round(W / 2 - 150), cy + 44, 300, 28, { alpha: .85, bg: '#0a0c18', border: '#f2c230' }); DH.CAST.hoshino.drawPortrait(g, Math.round(W / 2 - 147), cy + 47, 22, { bg: '#1a2a4a' }); T(g, line, Math.round(W / 2 - 120), cy + 54, '#f4f0e8');
      if (!GO.said && t > .5) { GO.said = true; DH.Babble.say(line, 'hoshino'); }
      GO.menu.y = cy + 84; if (t > 1) { GO.menu.draw(g, W, H); DH.promptLine(g, W, H, [['updown', 'CHOOSE'], ['confirm', 'OK']]); }
    });
  }
};
/* ================= THE ENDING ================= */
let EN = null;
const CREDITS = () => ['DENSHA DE HALO!', '', 'THE HALO LINE · AKARI CITY', '', 'An original homage to Densha de Go! (Taito).', 'Not affiliated with or endorsed by Taito.', '', 'GAME DESIGN, CODE, ART, SOUND', 'Anthropic Claude (claude-opus-5-5)', 'from a plan by claude-opus-5-5', '', 'ENGINE', 'my-3D2dge v0.85.2 by Michael Crosato (MIT)', 'the rail renderer: a fork of its ROAD module', '', 'ONLINE', 'AI Hub Session Protocol 1 (client 1.4.0)', '', 'THE CAST', 'Chief Instructor Tetsuo Hoshino', 'Conductor Mika Aoba', 'Haro-kun', 'Station Master Ota', 'Kota · Grandma Fuji · Kenji', 'Ren Kurosawa of the Sky Liner', 'Sato of the inner loop', '', 'Every sound is made in code.', 'Every voice is gibberish.', 'Every train left on time.', '', 'THANK YOU FOR RIDING', 'THE HALO LINE'];
DH.CREDITS = CREDITS;
DH.scenes.ending = {
  input: DH.KEYS, camera: { zoom: false },
  enter() {
    EN = { t: 0, phase: 'finale', talk: new E.Dialog(game, { lines: 3, speed: 38 }), lines: DH.FINALE.slice(), roll: 0, people: null };
    SND().music('evening');
    const next = () => { const l = EN.lines.shift(); if (!l) { EN.phase = 'credits'; EN.t = 0; return; } const ch = DH.CHARS[l.who]; EN.talk.voice = DH.dialogVoice(ch.voice); EN.talk.say(l.text, { name: ch.name, portrait: DH.portrait(l.who), portraitSize: 40, onDone: next, nameColor: ch.col }); };
    EN.next = next; next();
    // the platform: everyone bows
    EN.crowd = []; const R = DH.route('halo'), rr = E.rng(4);
    for (let i = 0; i < 18; i++) { const p = { s: 6 - i * 3.2, x: 2.6 + (i % 2) * .9, y: 1.1, kind: i % 4 ? 'staff' : 'commuter', i: i % 3, facing: -Math.PI / 2, col: '#24365e' }; p.rig = i === 0 ? DH.CAST.ota : i === 1 ? DH.CAST.hoshino : i === 2 ? DH.CAST.mika : new E.Humanoid(Object.assign({ size: 1, weapon: null }, { outfit: 'coat', sleeves: 'long', hat: { style: 'cap', color: '#1a2a4a' }, colors: { coat: '#24365e', cloth: '#24365e', pants: '#1e2c4e', glove: '#f8f8f4' } })); p.thing = DH.personThing(p); EN.crowd.push(p); }
  },
  update(dt) {
    EN.t += dt; const I = game.input;
    for (const p of EN.crowd) p.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: p.facing, pose: EN.t > 1 ? 'bow' : null });
    if (EN.phase === 'finale') { EN.talk.update(dt); if (I.pressed('cancel')) { EN.talk.close(); EN.lines.length = 0; EN.phase = 'credits'; EN.t = 0; } return; }
    EN.roll += dt * (I.down('confirm') ? 60 : 18);
    if (EN.t > 4 && I.pressed('cancel') || EN.roll > CREDITS().length * 14 + game.H + 60) { game.go('title', null, { fade: 'dissolve' }); }
  },
  draw(r) {
    if (EN.phase === 'finale') {
      const R = DH.route('halo'), rail = DH.railFor(R);
      rail.draw(r, { s: 16, x: 4.9, h: 2.6, dir: -1, horizon: .5, fov: 64 }, { grade: DH.railGrade(DH.grade(23.4)), sky: DH.skyFor(DH.grade(23.4), 'downtown', rail.headingAt(16) + Math.PI, 0, 64), t: game.time, actors: [{ items: DH.trainItems(EN._tr || (EN._tr = { s: 0, track: 'A', dir: 1, cars: 6, livery: 'h8000', lights: true, doors: 1, doorSide: 'R' }), R) }, { items: EN.crowd.map(p => { p.thing.s = R.wrap(p.s); p.thing.x = p.x; p.thing.y = p.y; return p.thing; }) }] });
      EN.talk.draw(r);
      r.overlay(g => { T(g, 'AKARI CENTRAL · 23:17', r.W / 2, 10, '#f2c230', { align: 'center', shadow: '#000' }); });
      return;
    }
    // credits over the night line: a high camera running round the ring
    const s = (EN.t * 32 + 18000) % DH.LOOP;
    DH.drawScenic(r, { route: 'halo', s, h: 23.6, dir: 1, x: 6, h0: 26, horizon: .5, train: { track: 'A', livery: 'h8000', cars: 6, from: s + 60, to: s + 60, period: 999 } });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      CREDITS().forEach((l, i) => { const y = Math.round(H + 20 + i * 14 - EN.roll); if (y < -20 || y > H + 20) return; const big = i === 0 || l === 'THANK YOU FOR RIDING' || l === 'THE HALO LINE'; T(g, l, W / 2, y, big ? '#ffe070' : /^[A-Z ,·!&()0-9.]+$/.test(l) && l.length < 34 ? '#f2c230' : '#e8e4f0', { align: 'center', scale: big ? 2 : 1, shadow: '#000' }); });
      DH.drawHaro(g, W - 30, H - 30 - Math.abs(Math.sin(EN.t * 3)) * 5, 1, EN.t);
      DH.promptLine(g, W, H, [['confirm', 'FASTER'], ['cancel', 'SKIP']]);
    });
  }
};
/* ================= DRIVER'S LOG ================= */
let LG = null; const PC_CACHE = new Map();
/** a postcard's picture: the rail renderer drawn into a small canvas, once */
const postcardImg = c => {
  if (PC_CACHE.has(c.id)) return PC_CACHE.get(c.id);
  if (game.headless) return null;
  const cv = E.mkCanvas(160, 100), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const sc = c.scene, R = DH.route(sc.route), rail = new E.Rail(R, { fov: 70, draw: 300 }), G = DH.grade(sc.h, sc.w || 'clear'), s = R.wrap(sc.s), plat = sc.cam === 'platform';
  for (const tr in R.signals) for (const sg of R.signals[tr]) sg.aspect = sg.force || 'G';
  const cam = plat ? { s: s + 40, x: 3.4, h: 2.6, dir: -1, horizon: .5, fov: 70 } : { s, x: 0, h: 2.9, dir: 1, horizon: .5, fov: 70 };
  const tr = { s: plat ? s : s + 120, track: 'A', dir: 1, cars: 6, livery: 'h8000', lights: true };
  rail.paint(g, { x: 0, y: 0, w: 160, h: 100 }, cam, { grade: DH.railGrade(G), sky: DH.skyFor(G, R.segs[rail.segAt(s)].zone, rail.headingAt(s) + (plat ? Math.PI : 0), .8, 70), t: 0, actors: [{ items: DH.trainItems(tr, R) }] });
  PC_CACHE.set(c.id, cv); return cv;
};
DH.postcardImg = postcardImg;
DH.scenes.driversLog = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { LG = { tab: 0, sel: 0, open: null, t: 0 }; SND().music('timetable'); DH.lastInput = game.real; },
  update(dt) {
    const I = game.input; LG.t += dt; DH.idleTick(dt);
    if (LG.open) { if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { LG.open = null; game.audio.sfx('back'); I.consumeAll(); } return; }
    if (I.pressed('cancel')) { game.audio.sfx('back'); game.go('title', null, { fade: 'wipe' }); return; }
    const ck = I.clicked(); if (ck && DH._logTabs) DH._logTabs.forEach((b, i) => { if (inBox(ck, b)) { LG.tab = i; LG.sel = 0; game.audio.sfx('move'); } });
    if (LG.tab === 1) {
      const n = 8, col = 4;
      if (I.repeat('right', .3, .15)) LG.sel = (LG.sel + 1) % n; if (I.repeat('left', .3, .15)) LG.sel = (LG.sel + n - 1) % n;
      if (I.repeat('down', .3, .15)) { if (LG.sel + col < n) LG.sel += col; else { LG.tab = 2; } } if (I.repeat('up', .3, .15)) { if (LG.sel - col >= 0) LG.sel -= col; else LG.tab = 0; }
      if (DH._pcBoxes) { if (I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; DH._pcBoxes.forEach((b, i) => { if (inBox(I.pointer(), b)) LG.sel = i; }); } if (ck) DH._pcBoxes.forEach((b, i) => { if (inBox(ck, b) && DH.Progress.get().postcards.includes(i + 1)) LG.open = i + 1; }); }
      if (I.pressed('confirm') && DH.Progress.get().postcards.includes(LG.sel + 1)) { LG.open = LG.sel + 1; game.audio.sfx('ok'); }
    } else { if (I.pressed('right') || I.pressed('down') && LG.tab === 0) { LG.tab = (LG.tab + 1) % 3; LG.sel = 0; game.audio.sfx('move'); } if (I.pressed('left') || I.pressed('up') && LG.tab === 2) { LG.tab = (LG.tab + 2) % 3; LG.sel = 0; game.audio.sfx('move'); } }
  },
  draw(r) {
    DH.drawScenic(r, 'log');
    r.overlay(g => {
      const W = r.W, H = r.H, p = DH.Progress.get(); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, 'DRIVER\'S LOG', 12, 10, '#f2c230', { scale: 2, shadow: '#000' });
      DH._logTabs = ['RECORDS', 'POSTCARDS', 'STATS'].map((nm, i) => { const b = { x: 12 + i * 92, y: 30, w: 86, h: 16 }; E.ui.box(g, b.x, b.y, b.w, b.h, { bg: i === LG.tab ? ['#3a3220', '#241c10'] : '#0a0c18', border: i === LG.tab ? '#f2c230' : '#3a3a50' }); T(g, nm, b.x + b.w / 2, b.y + 4, i === LG.tab ? '#ffe9a0' : '#a8a8c0', { align: 'center' }); return b; });
      const y0 = 54;
      if (LG.tab === 0) {
        DH.STAGE_ORDER.forEach((id, i) => {
          const S = DH.STAGES[id], y = y0 + i * 22, b = p.best[id];
          E.ui.box(g, 12, y, W - 24, 19, { alpha: .75, bg: '#0a0c18', border: '#2a2a40' }); T(g, id, 18, y + 6, '#f2c230'); T(g, S.name, 44, y + 6, DH.Progress.unlocked(id) ? '#ffffff' : '#6a6a7a');
          if (p.ranks[id]) DH.stamp(g, W - 30, y + 9, p.ranks[id], .55);
          if (b) T(g, b.score + '  ·  best ' + (b.err === null || b.err === undefined ? '--' : b.err.toFixed(2) + ' m') + '  ·  ' + b.perfect + ' PERFECT', W - 50, y + 6, '#c8d0e8', { align: 'right' });
          else T(g, DH.Progress.unlocked(id) ? 'NOT YET DRIVEN' : 'LOCKED', W - 50, y + 6, '#6a6a7a', { align: 'right' });
        });
      } else if (LG.tab === 1) {
        const cw = Math.min(96, Math.floor((W - 40) / 4)), ch = Math.round(cw * .78); DH._pcBoxes = [];
        DH.POSTCARDS.forEach((c, i) => {
          const x = 14 + (i % 4) * (cw + 4), y = y0 + Math.floor(i / 4) * (ch + 18), got = p.postcards.includes(c.id), sel = i === LG.sel;
          E.ui.box(g, x, y, cw, ch, { bg: got ? '#f8f0e0' : '#141420', border: sel ? '#f2c230' : '#3a3a50' });
          if (got) { const img = postcardImg(c); if (img) g.drawImage(img, 0, 0, 160, 100, x + 3, y + 3, cw - 6, ch - 6); } else T(g, '?', x + cw / 2, y + ch / 2 - 6, '#3a3a50', { align: 'center', scale: 2 });
          T(g, got ? c.title : '???', x + cw / 2, y + ch + 3, sel ? '#ffe9a0' : '#a8a8c0', { align: 'center', font: 'tiny' });
          DH._pcBoxes.push({ x, y, w: cw, h: ch });
        });
        T(g, p.postcards.length + ' OF 8 COLLECTED', 12 + 3 * 92 + 4, 34, '#c8d0e8', { shadow: '#000' });
      } else {
        const st = p.stats, items = [['KM DRIVEN', st.km.toFixed(1)], ['STOPS MADE', st.stops], ['PERFECT STOPS', st.perfect], ['CALLS MADE', st.calls]];
        items.forEach(([a, b], i) => { const x = 14 + (i % 2) * Math.round((W - 28) / 2), y = y0 + Math.floor(i / 2) * 60, w = Math.round((W - 36) / 2); E.ui.box(g, x, y, w, 52, { alpha: .8, bg: '#0a0c18', border: '#f2c230' }); T(g, a, x + w / 2, y + 8, '#8a90b0', { align: 'center' }); T(g, b, x + w / 2, y + 22, '#ffe070', { align: 'center', scale: 3, shadow: '#000' }); });
      }
      if (LG.open) {
        const c = DH.POSTCARDS.find(q => q.id === LG.open), w = Math.min(W - 20, 300), h = Math.min(H - 20, 200), x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
        E.ui.box(g, x, y, w, h, { bg: ['#fff8ea', '#efe4cc'], border: '#c8a060' }); const img = postcardImg(c), iw = Math.round(w * .5), ih = Math.round(iw * .62); if (img) g.drawImage(img, 0, 0, 160, 100, x + 8, y + 8, iw, ih);
        T(g, c.title, x + iw + 16, y + 10, '#3a2a1a', { scale: 1 }); T(g, 'from ' + c.from, x + iw + 16, y + 22, '#6a5a4a', { font: 'tiny' });
        F.wrap(c.note, w - 20).forEach((ln, i) => T(g, ln, x + 10, y + ih + 16 + i * 10, '#3a2a1a'));
        px.rect(g, x + w - 44, y + 8, 32, 40, '#d8c8a8'); DH.stamp(g, x + w - 28, y + 28, 'S', .6);
      }
      DH.promptLine(g, W, H, LG.open ? [['cancel', 'CLOSE']] : [['arrows', 'PAGE'], ['confirm', 'OPEN'], ['cancel', 'BACK']]);
    });
  }
};
/* ================= ABOUT & CREDITS ================= */
let AB = null;
DH.scenes.about = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { AB = { page: 0, scroll: 0 }; SND().music('timetable'); DH.lastInput = game.real; },
  update(dt) {
    const I = game.input, P = DH.ABOUT_PAGES(); DH.idleTick(dt);
    if (I.pressed('right')) { AB.page = (AB.page + 1) % P.length; AB.scroll = 0; game.audio.sfx('move'); }
    if (I.pressed('left')) { AB.page = (AB.page + P.length - 1) % P.length; AB.scroll = 0; game.audio.sfx('move'); }
    if (I.down('down')) AB.scroll += dt * 90; if (I.down('up')) AB.scroll -= dt * 90;
    const pa = I.padAim; if (pa) AB.scroll += pa[1] * dt * 120;
    if (DH._aboutWheel) { AB.scroll += DH._aboutWheel; DH._aboutWheel = 0; }
    const ck = I.clicked(); if (ck && DH._abTabs) DH._abTabs.forEach((b, i) => { if (inBox(ck, b)) { AB.page = i; AB.scroll = 0; } });
    AB.scroll = Math.max(0, Math.min(AB.scroll, AB.max || 0));
    if (I.pressed('cancel')) { game.audio.sfx('back'); game.go('title', null, { fade: 'wipe' }); }
  },
  draw(r) {
    DH.drawScenic(r, 'log');
    r.overlay(g => {
      const W = r.W, H = r.H, P = DH.ABOUT_PAGES(), pg = P[AB.page]; px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, 'ABOUT & CREDITS', 12, 8, '#f2c230', { scale: 2, shadow: '#000' });
      DH._abTabs = P.map((p, i) => { const tw = Math.floor((W - 24) / P.length), b = { x: 12 + i * tw, y: 26, w: tw - 3, h: 14 }; E.ui.box(g, b.x, b.y, b.w, b.h, { bg: i === AB.page ? ['#3a3220', '#241c10'] : '#0a0c18', border: i === AB.page ? '#f2c230' : '#3a3a50' }); T(g, p.tab, b.x + b.w / 2, b.y + 4, i === AB.page ? '#ffe9a0' : '#a8a8c0', { align: 'center', font: 'tiny' }); return b; });
      const x = 16, w = W - 32, top = 46, bottom = H - 26; g.save(); g.beginPath(); g.rect(0, top, W, bottom - top); g.clip();
      let y = top + 4 - AB.scroll;
      for (const [kind, text] of pg.body) {
        if (kind === 'h') { if (y > top - 12 && y < bottom) T(g, text, x, y, '#f2c230', { shadow: '#000' }); y += 12; continue; }
        for (const ln of F.wrap(text, w - (kind === 'li' ? 10 : 0))) { if (y > top - 10 && y < bottom) T(g, (kind === 'li' && ln === F.wrap(text, w - 10)[0] ? '• ' : kind === 'li' ? '  ' : '') + ln, x + (kind === 'li' ? 4 : 0), y, '#e8e4f0'); y += 10; }
        y += 4;
      }
      g.restore(); px.reset(g);
      AB.max = Math.max(0, y + AB.scroll - bottom + 10);
      if (AB.max > 0) { const k = AB.scroll / AB.max; px.rect(g, W - 6, top, 2, bottom - top, '#2a2a40'); px.rect(g, W - 7, top + k * (bottom - top - 16), 4, 16, '#f2c230'); }
      DH.promptLine(g, W, H, [['arrows', 'PAGE'], ['updown', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};
if (!game.headless && typeof addEventListener === 'function') addEventListener('wheel', e => { if (game.sceneName === 'about') DH._aboutWheel = (DH._aboutWheel || 0) + Math.sign(e.deltaY) * 24; }, { passive: true });
})();
