// FIGURE SKATING (free skate) — winter · Glory Ice Palace · rhythm: "Waltz of the Yikes" in 3/4, a chart of step
// sequences, spins, jumps (holds), Coach's Corner (call and response) and the QUAD YIKES. TES + PCS in the kiss & cry.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, MU = O.music;
const LANES = ['left', 'down', 'up', 'right', 'action'];
const BAR = 12;
// the song: 48 bars of 3/4 (12 steps a bar) at 138 bpm, about 63 s
const PROG = ['C', 'C', 'G', 'G', 'C', 'Am', 'F', 'G', 'F', 'C', 'G', 'G', 'C', 'F', 'G', 'C'];
const MEL_A = ['C5:8 E5:4', 'G5:8 E5:4', 'F5:8 D5:4', 'B4:12', 'C5:4 E5:4 G5:4', 'C6:8 B5:4', 'A5:4 G5:4 F5:4', 'G5:12', 'A5:8 F5:4', 'E5:8 C5:4', 'D5:4 E5:4 F5:4', 'G5:12', 'E5:4 F5:4 G5:4', 'A5:8 G5:4', 'F5:4 E5:4 D5:4', 'C5:12'];
const MEL_B = ['G5:4 A5:4 B5:4', 'C6:8 G5:4', 'A5:4 G5:4 F5:4', 'E5:12', 'F5:4 G5:4 A5:4', 'B5:8 D6:4', 'C6:8 B5:4', 'C6:12'];
const PROG_B = ['G', 'C', 'F', 'C', 'F', 'G', 'G', 'C'];
const melody = MEL_A.concat(MEL_B, MEL_A, MEL_B), chords = PROG.concat(PROG_B, PROG, PROG_B);
const SONG = E.songs.oly_waltz = { bpm: 138, steps: 4, loop: false, len: 48 * BAR, tracks: [
  { wave: 'triangle', vol: .16, notes: melody.map(MU.L).join(' | ') },
  { wave: 'square', vol: .04, notes: chords.map(c => { const n = MU.chord(c, 4); return ['.', '.', '.', '.', n[1], '-', n[2], '-', n[1], '-', n[2], '-'].join(' '); }).join(' | ') },
  { wave: 'triangle', vol: .22, notes: chords.map(c => MU.chord(c, 2)[0] + ' - - - . . . . . . . .').join(' | ') },
  { wave: 'drums', notes: MU.rep('k . . . h . . . h . . .', 48) },
  { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: chords.map(c => { const n = MU.chord(c, 5); return [n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1]].join(' '); }).join(' | ') }] };
// the chart: parts of bars, each bar a pattern of [step, lane, kind] (kind: x tap, h hold of n steps, c call)
const PARTS = [
  { name: 'INTRO', bars: 4, pat: b => b < 2 ? [] : [[0, 1], [8, 2]] },
  { name: 'STEP SEQUENCE A', bars: 8, pat: b => [[0, b % 2 ? 0 : 3], [4, b % 2 ? 3 : 0], [8, [1, 2][b % 2]]] },
  { name: 'JUMP COMBO 1', bars: 4, pat: b => b % 2 === 0 ? [[0, 4, 'h', 6], [8, 2]] : [[0, 0], [4, 3], [8, 4, 'h', 3]] },
  { name: 'SPIRAL & SPIN', bars: 8, pat: b => b % 4 === 0 ? [[0, 2], [6, 2]] : b % 4 === 2 ? [[0, 1], [4, 1], [8, 1]] : [[0, b % 2 ? 3 : 0], [8, 2]] },
  { name: "COACH'S CORNER", bars: 8, pat: b => { const call = [[[0, 0], [4, 3], [8, 2]], [[0, 1], [6, 1], [8, 3]], [[0, 2], [4, 0], [8, 4]], [[0, 3], [4, 3], [6, 0], [8, 1]]][b % 4]; return call.map(n => b < 4 ? [n[0], n[1], 'c'] : [n[0], n[1]]); } },
  { name: 'STEP SEQUENCE B', bars: 8, pat: b => [[0, b % 4], [2, (b + 2) % 4], [4, (b + 1) % 4], [8, (b + 3) % 4], [10, b % 2 ? 1 : 2]] },
  { name: 'JUMP COMBO 2 (QUAD YIKES)', bars: 4, pat: b => b === 0 ? [[0, 4, 'h', 16]] : b === 1 ? [[8, 2]] : b === 2 ? [[0, 0], [4, 3], [8, 4, 'h', 3]] : [[0, 1], [8, 2]] },
  { name: 'FINALE', bars: 4, pat: b => b < 3 ? [[0, b % 2 ? 0 : 3], [4, 2], [8, 1]] : [[0, 4, 'h', 8]] }
];
const CHART = (() => {
  const lanes = LANES.map(() => []), total = PARTS.reduce((m, p) => m + p.bars, 0) * BAR; for (const l of lanes) for (let i = 0; i < total; i++) l.push('.');
  let bar = 0, parts = [];
  for (const P of PARTS) { parts.push({ name: P.name, from: bar * BAR, to: (bar + P.bars) * BAR }); for (let b = 0; b < P.bars; b++) for (const [st, ln, kind, len] of P.pat(b)) { const i = (bar + b) * BAR + st; if (kind === 'h') { lanes[ln][i] = 'h'; for (let k = 1; k < len; k++) if (i + k < total) lanes[ln][i + k] = '='; } else lanes[ln][i] = kind === 'c' ? 'c' : 'x'; } bar += P.bars; }
  return { lanes: lanes.map(l => l.join('')), parts, total };
})();
O.FIGURE_CHART = CHART;
const RINK_W = 240, RINK_H = 120;
const PATH = new E.Path([[-170, 0, 0], [-120, -60, 0], [0, -20, 0], [120, -60, 0], [170, 0, 0], [120, 60, 0], [0, 20, 0], [-120, 60, 0]], { closed: true, smooth: 'catmull' });

O.defEvent({
  id: 'figure', name: 'FIGURE SKATING', short: 'Figure', season: 'winter', venueName: 'GLORY ICE PALACE', music: null, view: 'threequarter',
  format: { type: 'program', attempts: 1 }, highlights: 0, maxTime: 80, roundName: 'PROGRAM',
  measure: { unit: 'pts', better: 'higher', fmt: v => v.toFixed(2), wr: [228.56, 'BON', 'COCO BONBON'], qualify: { Easy: 120, Normal: 150, Hard: 180 }, seedStep: -7 },
  points: v => Math.min(1200, 5.3 * v),
  tune: { perfectMs: [45, 15, 120, 1, 'Perfect window (ms)'], greatMs: [90, 30, 180, 1, 'Great window (ms)'], goodMs: [135, 50, 260, 1, 'Good window (ms)'], lifeDrain: [.1, 0, .3, .005, 'Life lost per miss'], tesScale: [130, 60, 200, 1, 'Technical score max'], pcsWeight: [2, .5, 3, .05, 'Components weight'] },
  howto: { goal: 'Skate the free program to the music. Hit each note on the line; hold the jump notes through the jump. In Coach\'s Corner, watch first, then answer.', rows: [[['left', 'right'], 'EDGE STEPS'], [['up'], 'SPIRAL'], [['down'], 'SIT SPIN'], [['action'], 'HOLD: JUMP · RELEASE: LAND'], [['turbo'], 'STAR POWER']] },
  yikesKinds: ['fall'], turboName: 'STAR POWER!',
  laurel: { id: 'fullcombo', name: 'FULL COMBO', text: 'Skate a program without a single miss', test: (ctx, a) => !!(ctx.s && ctx.s.rh && ctx.s.rh.counts.miss === 0 && ctx.s.rh.done && !ctx.s.rh.failed) },
  hub: { ok: false }, attract: { seconds: 22, setup(ctx) { ctx.w.attractFrom = CHART.parts[6].from - 12; } },
  phases: CHART.parts.map(p => p.name),
  canTurbo: ctx => !!(ctx.s && ctx.s.phase === 'program'),
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'figure'); ctx.w.plush = []; ctx.w.spots = 0; ctx.w.mascot = Art.makeYikesy(8); },
  start(ctx, a) {
    ctx.s = { a, phase: 'intro', pt: 0, rh: null, d: 0, move: null, moveT: 0, falls: 0, air: 0, spin: 0, lean: 0, star: 0, tes: null, pcs: null, score: null, comps: null, kiss: 0, fallT: 0, fromStep: 0 };
    if (O.sandbox) return;
    const s = ctx.s, T = ctx.T;
    s.rh = new E.Rhythm(game, { song: SONG, chart: CHART.lanes, lanes: LANES, windows: { perfect: T.perfectMs * O.windowScale(), great: T.greatMs * O.windowScale(), good: T.goodMs * O.windowScale() }, life: .6, lead: 1.8, voice: { wave: 'square', vol: .14, dur: .09 }, on: { judge: (j, n) => onJudge(ctx, j, n), fail: () => { ctx.cue('fall', { a }); } } });
    if (O.difficulty() === 'Easy') { let k = 0; s.rh.notes = s.rh.notes.filter(n => n.call || n.end > n.step || (k++ % 2 === 0)); }
    s.fromStep = ctx.w.attractFrom && a.cheat ? ctx.w.attractFrom : 0;
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a; s.pt += dt;
    if (O.sandbox) { simulate(ctx); s.phase = 'done'; return; }
    const rh = s.rh, A = game.audio;
    if (s.phase === 'intro') { if (s.pt > (ctx.meet.mode === 'attract' ? .4 : 2)) { s.phase = 'program'; s.pt = 0; rh.start(); if (s.fromStep) { rh.notes = rh.notes.filter(n => n.step >= s.fromStep + 8); rh.notes.forEach(n => { n.step -= s.fromStep; n.end -= s.fromStep; }); } ctx.cue('start', { a }); O.Crowd.set(.5); } }
    else if (s.phase === 'program') {
      const I = a.I, star = a.turboT > 0;
      const prox = { pressed: l => (l === 'left' && I.Lf) || (l === 'right' && I.Rt) || (l === 'up' && I.U) || (l === 'down' && I.D) || (l === 'action' && I.A), released: l => l === 'action' && (I.Au || (!I.Ad && rh.down[4])) };
      if (star) rh.windows = { perfect: 1e3, great: 1e3, good: 1e3 }; else { const T = ctx.T, ws = O.windowScale(); rh.windows = { perfect: T.perfectMs * ws, great: T.greatMs * ws, good: T.goodMs * ws }; }
      const keep = rh.game; rh.game = { input: prox, audio: A, time: game.time }; try { rh.update(); } finally { rh.game = keep; }
      if (rh.done) { s.phase = 'final'; s.pt = 0; if (!rh.failed) { ctx.cue('extra', { a }); O.CrowdAudio.cheer(); } else ctx.yikes(a, 'fall', { sub: 'THE PROGRAM IS OVER' }); }
      const pos = A.pos; s.d = (pos.step || 0) / (CHART.total) * PATH.length * 2.2;
    } else if (s.phase === 'final') { if (s.pt > 1.6) { score(ctx); s.phase = 'kiss'; s.pt = 0; O.Music.play('table'); } }
    else if (s.phase === 'kiss') { s.kiss += dt; if (s.pt > 5.5) s.phase = 'done'; }
    animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.score,
  attemptInfo: ctx => ({ tes: ctx.s.tes, pcs: ctx.s.pcs, falls: ctx.s.falls, comps: ctx.s.comps }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(); if (!s || s.a !== a || s.phase !== 'program' || !s.rh) return I;
    const rh = s.rh, perfect = a.cheat === 'perfect', bs = a.bs; if (bs.r === undefined) bs.r = ctx.rng('bot:' + a.id);
    for (const q of rh.ahead()) {
      const n = q.note; if (n.call || n.j || n.botDone) continue;
      if (q.dt <= .004 && q.dt > -.05) { n.botDone = true; if (!perfect && bs.r() > a.skill + .05) continue; const L = LANES[n.lane]; if (L === 'left') I.Lf = true; else if (L === 'right') I.Rt = true; else if (L === 'up') I.U = true; else if (L === 'down') I.D = true; else { I.A = true; I.Ad = true; bs.hold = n; } }
    }
    if (bs.hold) { const spb = 60 / SONG.bpm / SONG.steps, endT = (bs.hold.end - game.audio.pos.step) * spb; if (endT > .01) I.Ad = true; else { I.Au = true; bs.hold = null; } }
    if (a.hype >= 1 && s.rh && game.audio.pos.step > CHART.parts[6].from - 4) I.T = true;
    return I;
  },
  onTurbo(ctx, a) { ctx.s.star = 4; a.turboT = Math.max(a.turboT, 4); },
  cam(ctx, dt) { const s = ctx.s; const p = s && s.phase !== 'kiss' ? PATH.at(s.d % PATH.length) : { x: 190, y: 70 }; const w = ctx.w; w.cx = w.cx === undefined ? p.x : w.cx + (p.x - w.cx) * Math.min(1, dt * 3); w.cy = w.cy === undefined ? p.y : w.cy + (p.y - w.cy) * Math.min(1, dt * 3); game.focus(w.cx * .6, w.cy * .5, 10); },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    game.lights.enabled = true; game.lights.ambient = .5;
    Art.sky(g, r.bw, r.bh, ['#0a0818', '#1a1430', '#2a2040']);
    const top = r.w(0, -RINK_H - 40, 0)[1];
    Art.stands(g, 0, Math.min(top - 60, r.w(0, -RINK_H - 20, 50)[1]), r.bw, top + 4, { tiers: 3, seed: 91, scroll: r.ix, dark: true, bg: '#1a1430', lip: '#2a2040', rail: '#6a6e88' });
    // the ice
    Art.quad(r, [[-RINK_W - 10, -RINK_H - 10, 0], [RINK_W + 10, -RINK_H - 10, 0], [RINK_W + 10, RINK_H + 10, 0], [-RINK_W - 10, RINK_H + 10, 0]], '#e8f4fb');
    for (let i = 0; i < 70; i++) { const h = O.hash('sc' + i), x = (h % (RINK_W * 2)) - RINK_W, y = ((h >>> 9) % (RINK_H * 2)) - RINK_H, L = 6 + h % 18, an = (h % 628) / 100; Art.wline(r, [x, y, 0], [x + Math.cos(an) * L, y + Math.sin(an) * L, 0], '#c8dcec'); }
    Art.wline(r, [0, -RINK_H, 0], [0, RINK_H, 0], '#e23b2e', 2); for (const ex of [-RINK_W * .55, RINK_W * .55]) for (let k = 0; k < 24; k++) { const a0 = k / 24 * Math.PI * 2; Art.wline(r, [ex + Math.cos(a0) * 26, Math.sin(a0) * 26, 0], [ex + Math.cos(a0 + .26) * 26, Math.sin(a0 + .26) * 26, 0], '#3a7ad8'); }
    // reflections of the spotlights on the ice
    ctx.w.spots += 1 / 60;
    for (let k = 0; k < 3; k++) { const sx = Math.sin(ctx.w.spots * .4 + k * 2) * RINK_W * .7, sy = Math.cos(ctx.w.spots * .3 + k) * RINK_H * .6; game.lights.add(sx, sy, 0, 90, .8, { color: ['#ffd0f0', '#d0e8ff', '#fff0c0'][k] }); }
    // the boards with banners
    for (let x = -RINK_W - 10; x <= RINK_W + 10; x += 30) { r.queue(x, -RINK_H - 10, 0, gg => r.box(gg, x, -RINK_H - 14, 0, x + 30, -RINK_H - 10, 9, '#f4f4f4', ['#2f7fe0', '#ff7fb8', '#f2b632', '#6a3fc8'][((Math.floor(x / 30) % 4) + 4) % 4])); }
    for (let x = -RINK_W - 10; x <= RINK_W + 10; x += 30) r.queue(x, RINK_H + 10, 0, gg => r.box(gg, x, RINK_H + 10, 0, x + 30, RINK_H + 14, 6, '#f4f4f4', '#c8ccd8'));
    // the kiss & cry: bench, flowers, a giant plush mascot
    r.queue(RINK_W - 40, RINK_H + 30, 0, gg => { r.box(gg, RINK_W - 80, RINK_H + 24, 0, RINK_W - 10, RINK_H + 40, 10, '#ff7fb8', '#c84a88'); const p = r.w(RINK_W - 40, RINK_H + 30, 12); E.font.text(gg, 'KISS & CRY', p[0] - 22, p[1] - 14, '#ffffff', { font: 'tiny', outline: '#c84a88' }); for (let i = 0; i < 5; i++) { const q = r.w(RINK_W - 76 + i * 14, RINK_H + 26, 12); px.disc(gg, q[0], q[1] - 3, 3, ['#ff4a6a', '#ffe066', '#ff9ad0', '#ffffff', '#ff7a1a'][i]); px.rect(gg, q[0], q[1], 1, 4, '#3a8a3a'); } });
    Art.drawYikesy(r, ctx.w.mascot, RINK_W - 20, RINK_H + 34, 10); ctx.w.mascot.update(1 / 60, { squash: Math.sin(t * 4) * .1 });
    // plush toys thrown on the ice after star power
    for (const p of ctx.w.plush) { p.t += 1 / 60; const z = Math.max(0, p.z - p.t * 120 + p.t * p.t * 40); r.queue(p.x, p.y, z, gg => { const q = r.w(p.x, p.y, z); px.disc(gg, q[0], q[1] - 3, 3, '#f8f8ff'); px.rect(gg, q[0] - 1, q[1] - 7, 2, 2, '#ff7a1a'); }); }
    if (!s) return;
    const a = s.a, p = s.phase === 'kiss' || s.phase === 'done' ? { x: RINK_W - 45, y: RINK_H + 34 } : PATH.at(s.d % PATH.length), z = s.air;
    r.shadow(p.x, p.y, 7, .35);
    r.actor(p.x, p.y, z, (gg, ox, oy) => a.rig.draw(gg, ox, oy, r.view), { ghost: a.turboT > 0 ? { color: '#ff9ad0', life: .35, alpha: .5, owner: a.rig } : undefined });
    if (a.turboT > 0 && !O.sandbox && Math.floor(t * 30) % 2) game.particles.glints(p.x, p.y, 20, 2, ['#ff9ad0', '#9ad0ff', '#ffe066', '#a0ffb0'][Math.floor(t * 8) % 4], 14);
    game.lights.add(p.x, p.y, 40, 70, 1, { color: '#ffffff' });
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return; const a = s.a, rh = s.rh;
    if (rh && (s.phase === 'program' || s.phase === 'intro')) drawHighway(ctx, g, W, H);
    if (rh) { UI.text(g, 'COMBO ' + rh.combo, W - 100, 36, '#ffe066', { scale: 2 }); UI.text(g, 'LIFE', W - 100, 56, '#ffffff'); UI.bar(g, W - 70, 57, 56, 6, rh.life, rh.life < .25 ? '#ff6b6b' : '#ff9ad0'); const part = CHART.parts.slice().reverse().find(p => (game.audio.pos.step || 0) + (s.fromStep || 0) >= p.from); if (part && s.phase === 'program') UI.text(g, part.name, 14, 56, part.name.startsWith('COACH') ? '#6fe0c0' : '#ffe066'); if (part && part.name.startsWith('COACH') && s.phase === 'program') { const ans = (game.audio.pos.step || 0) + (s.fromStep || 0) >= part.from + 4 * BAR; UI.text(g, ans ? 'YOUR TURN!' : 'WATCH THE COACH...', W / 2 - UI.tw(ans ? 'YOUR TURN!' : 'WATCH THE COACH...', 2) / 2, 60, '#6fe0c0', { scale: 2 }); } }
    if (s.lastJ && s.lastJT > 0) { s.lastJT -= 1 / 60; const c = { perfect: '#4fe0a8', great: '#7fb2ff', good: '#ffe066', miss: '#ff6b6b' }[s.lastJ]; UI.text(g, s.lastJ.toUpperCase(), W / 2 - UI.tw(s.lastJ.toUpperCase(), 3) / 2, 84, c, { scale: 3 }); }
    if (s.phase === 'kiss' && s.tes != null) {
      UI.panel(g, W / 2 - 150, 40, 300, 150, { title: 'KISS & CRY', alpha: .92 });
      const rows = [['TECHNICAL (TES)', s.tes.toFixed(2)], ['COMPONENTS (PCS)', s.pcs.toFixed(2)], ['FALLS', s.falls ? '-' + s.falls.toFixed(2) : '0.00']];
      rows.forEach(([k, v], i) => { if (s.kiss > .4 + i * .5) { UI.text(g, k, W / 2 - 140, 60 + i * 16, '#ffffff'); UI.text(g, v, W / 2 + 130 - UI.tw(v, 1), 60 + i * 16, '#ffe066'); } });
      if (s.kiss > 2) { UI.text(g, 'TOTAL', W / 2 - 140, 112, '#f2b632', { scale: 2 }); E.font.text(g, s.score.toFixed(2), W / 2 + 130 - E.font.width(s.score.toFixed(2), { scale: 3 }), 108, '#ffe066', { scale: 3, shadow: '#000', outline: false }); }
      if (s.kiss > 2.6) { const st = O.standings(ctx).filter(x => x.a !== a && x.perf != null).slice(0, 2); st.forEach((x, i) => UI.text(g, 'TO BEAT: ' + x.a.name + ' ' + x.perf.toFixed(2), W / 2 - 140, 140 + i * 12, '#aab0d0')); }
    }
    O.HUD.flame(g, 14, 70, a);
  }
});
function drawHighway(ctx, g, W, H) {
  const s = ctx.s, rh = s.rh, a = s.a, x0 = 56, x1 = W - 12, y0 = H - 104, gap = 17, lead = 1.8;
  px.blend(g, .78, 'normal', () => px.rect(g, 0, y0 - 12, W, gap * 5 + 14, '#070914'));
  for (let i = 0; i < 5; i++) { const y = y0 + i * gap; px.rect(g, x0, y, x1 - x0, 1, '#2a2f55'); const inp = a.inp || game.input, dev = O.Prompt.device(inp); if (i < 4 && dev !== 'gamepad') O.Prompt.drawCode(g, inp, ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'][i], 12, y - 5, 1); else O.Prompt.icon(g, 12, y - 5, LANES[i], { inp }); }
  px.rect(g, x0, y0 - 8, 2, gap * 5, '#ffffff'); px.rect(g, x0 - 1, y0 - 8, 1, gap * 5, '#f2b632');
  const cols = ['#ff9ad0', '#7fb2ff', '#4fe0a8', '#ffb060', '#ffe066'];
  for (const q of rh.ahead()) {
    const n = q.note, y = y0 + n.lane * gap, x = Math.round(x0 + q.dt / lead * (x1 - x0)), xe = q.dtEnd !== undefined ? Math.round(x0 + q.dtEnd / lead * (x1 - x0)) : x;
    if (x > x1 + 10) continue;
    if (n.end > n.step) { px.rect(g, Math.max(x0, x), y - 2, Math.max(0, Math.min(x1, xe) - Math.max(x0, x)), 5, n.lane === 4 ? '#c8a030' : '#3a6aa8'); }
    if (n.j && n.j !== 'miss' && !(n.end > n.step)) continue;
    const c = n.call ? '#6fe0c0' : cols[n.lane], R = 5;
    if (x >= x0 - 4) { px.disc(g, x, y, R + 1, '#05060e'); px.disc(g, x, y, R, c); px.disc(g, x - 1, y - 1, 2, '#ffffff'); if (n.call) E.font.text(g, 'C', x - 2, y - 3, '#05060e', { font: 'tiny', outline: false }); }
  }
}
function onJudge(ctx, j, n) {
  const s = ctx.s, a = s.a; s.lastJ = j; s.lastJT = .5;
  const lane = LANES[n.lane];
  if (j === 'miss') { if (n.end > n.step || (s.move === 'jump')) fall(ctx); return; }
  if (lane === 'left' || lane === 'right') { s.move = 'edge'; s.moveT = .45; s.lean = lane === 'left' ? -.35 : .35; }
  else if (lane === 'up') { s.move = 'spiral'; s.moveT = .9; ctx.cue('spin', { a }, { cool: 9 }); }
  else if (lane === 'down') { s.move = 'sit'; s.moveT = 1; }
  else if (lane === 'action') { if (n.end > n.step && !s.jumpN) { s.move = 'jump'; s.jumpN = n; s.moveT = 99; game.audio.sfx('whoosh', { vol: .4 }); if (n.end - n.step >= 12) ctx.cue('quad', { a }, { prio: 4 }); } else { s.move = 'land'; s.moveT = .6; s.jumpN = null; ctx.cue('jump', { a }, { cool: 6 }); game.audio.sfx('crunch', { vol: .3 }); } }
  if (j === 'perfect') ctx.hype(a, .03);
  if (!O.sandbox) O.Crowd.bump(.35 + s.rh.combo / 80);
}
function fall(ctx) { const s = ctx.s; if (O.god(s.a)) return; s.falls++; s.move = 'fall'; s.moveT = 1.2; s.jumpN = null; s.air = 0; ctx.yikes(s.a, 'fall'); ctx.sfx('thunk'); }
function score(ctx) {
  const s = ctx.s, rh = s.rh, T = ctx.T, notes = rh.notes.filter(n => !n.call);
  const val = n => n.end > n.step ? (n.end - n.step >= 12 ? 5 : 3) : 1, max = notes.reduce((m, n) => m + val(n), 0);
  const mult = { perfect: 1, great: .8, good: .5, miss: 0 }, got = notes.reduce((m, n) => m + val(n) * (n.dropped ? 0 : mult[n.j] || 0), 0);
  const acc = got / Math.max(1, max), combo = rh.maxCombo / Math.max(1, notes.length), perf = rh.counts.perfect / Math.max(1, notes.length);
  s.tes = +(T.tesScale * acc).toFixed(2);
  const comps = [10 * acc, 10 * combo, 10 * acc * Math.max(0, 1 - s.falls * .15), 10 * perf, rh.failed ? 4 : 10 * Math.min(1, acc + .02)].map(v => +clamp(v, 0, 10).toFixed(2));
  s.comps = comps; s.pcs = +(comps.reduce((m, v) => m + v, 0) * T.pcsWeight).toFixed(2);
  s.score = +Math.max(0, s.tes + s.pcs - s.falls).toFixed(2);
  if (!O.sandbox) { O.CrowdAudio.applause(); if (s.score > 200) O.CrowdAudio.cheer(); }
  if (ctx.s.a.turbos) for (let i = 0; i < 14; i++) ctx.w.plush.push({ x: (O.hash('pl' + i) % 300) - 150, y: (O.hash('py' + i) % 160) - 80, z: 80 + i * 6, t: 0 });
}
function simulate(ctx) {
  const s = ctx.s, a = s.a, r = ctx.rng('prog:' + a.id), T = ctx.T, acc = clamp(a.skill * (.9 + r() * .14) + (a.cheat ? 1 : 0), .2, 1);
  s.falls = a.cheat ? 0 : (r() < (1 - a.skill) * .9 ? 1 : 0) + (r() < (1 - a.skill) * .4 ? 1 : 0);
  s.tes = +(T.tesScale * Math.pow(acc, 1.25)).toFixed(2); const c = [0, 1, 2, 3, 4].map(() => +clamp(10 * Math.pow(acc, 1.15) + (r() - .5) * .6, 0, 10).toFixed(2)); s.comps = c; s.pcs = +(c.reduce((m, v) => m + v, 0) * T.pcsWeight).toFixed(2);
  s.score = +Math.max(0, s.tes + s.pcs - s.falls).toFixed(2);
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig;
  const p = s.phase === 'kiss' || s.phase === 'done' ? null : PATH.at(s.d % PATH.length), ahead = p ? PATH.at((s.d + 6) % PATH.length) : null;
  const facing = p ? Math.atan2(ahead.y - p.y, ahead.x - p.x) : Math.PI / 2;
  if (s.moveT > 0) s.moveT -= dt; else if (s.move !== 'jump') s.move = null;
  const st = { x: p ? p.x : RINK_W - 45, y: p ? p.y : RINK_H + 34, z: 0, facing, vx: 0, vy: 0 };
  s.lean *= Math.pow(.02, dt);
  s.air = 0; rig.spin = 0;
  O.Pose.rot(rig, 0, s.lean);
  if (s.phase === 'intro') { O.Pose.set(rig, 'skateGlide'); }
  else if (s.phase === 'final') { O.Pose.set(rig, 'finalPose'); st.expr = 'smile'; }
  else if (s.phase === 'kiss' || s.phase === 'done') { O.Pose.clear(rig); st.pose = s.score > 180 ? 'cheer' : 'wave'; st.expr = 'smile'; st.facing = -Math.PI / 2; }
  else if (s.move === 'jump') { O.Pose.set(rig, 'skateJump'); const spb = 60 / SONG.bpm / SONG.steps, n = s.jumpN, u = n ? clamp((game.audio.pos.step - n.step) / Math.max(1, n.end - n.step), 0, 1) : 0; s.air = Math.sin(u * Math.PI) * (n && n.end - n.step >= 12 ? 26 : 14); st.facing = facing + u * Math.PI * 2 * (n && n.end - n.step >= 12 ? 5 : 2.5); void spb; }
  else if (s.move === 'spiral') O.Pose.set(rig, 'skateSpiral');
  else if (s.move === 'sit') { O.Pose.set(rig, 'sitSpin'); st.facing = facing + (1 - s.moveT) * Math.PI * 8 * (1 - s.moveT); }
  else if (s.move === 'land') O.Pose.set(rig, 'skateLand');
  else if (s.move === 'fall') { O.Pose.set(rig, 'skateFall'); st.expr = 'wince'; }
  else { O.Pose.set(rig, 'skateGlide'); }
  st.z = s.air;
  rig.update(dt, st);
}
})();
