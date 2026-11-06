/* activities/step.js: Step Class. Four lanes on the music clock. Music is 10% by default, so the beat never depends on it:
 * a soft click on the sfx bus, and the instructor counts in gibberish. The rig steps when you press, not when the chart does. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const TIMING = { poor: { sd: 95, miss: .25 }, average: { sd: 62, miss: .08 }, good: { sd: 34, miss: .02 }, expert: { sd: 14, miss: 0 } };
const COUNT = ['one', 'two', 'tree', 'for'];
const NOINPUT = { pressed() { return false; }, released() { return false; }, down() { return false; } };
let beatHost = null; G.A.onBeat(b => { if (beatHost) beatHost(b); });
const stepSide = (k, side) => rig => { const b = G.moves.stepUp(k)(rig); if (side < 0) { const fl = b.footL, fr = b.footR; b.footL = [fr[0], -fr[1], fr[2]]; b.footR = [fl[0], -fl[1], fl[2]]; b.hip = [b.hip[0], -b.hip[1], b.hip[2]]; } return b; };
G.family('step', {
  camera: { zoom: false },
  setup(ctx) {
    const { tier } = ctx, ch = G.DATA.charts[ctx.chartName || (ctx.mode === 'class' || ctx.mode === 'round' || ctx.short ? (ctx.tierIdx ? 'stepB' : 'stepClass') : tier.chart)], base = G.SONGS[ch.song];
    const barSec = 60 / base.bpm * 4; const bars = Math.min(ch.bars, Math.ceil((ctx.durGiven || ch.bars * barSec) / barSec));
    ctx.song = Object.assign({}, base, { len: bars * 16 });
    ctx.dur = bars * barSec + .4; ctx.chart = ch; ctx.barSec = barSec; ctx.beat = 0; ctx.kick = 0; ctx.flash = 0;
    const w = { perfect: 45 * G.DEV.window, great: 90 * G.DEV.window, good: 135 * G.DEV.window };
    ctx.instructor = (ctx.mode === 'solo' || ctx.mode === 'games' || ctx.mode === 'attract') ? (G.S.instructor || 'birch') : null;
    if (ctx.instructor) { ctx.teacher = G.instructorRig(ctx.instructor, ctx.size * .9); ctx.teacherX = 104; ctx.teacherK = 0; ctx.teacherSide = 1; }
    if (ctx.mode !== 'class' && ctx.mode !== 'round') ctx.back = [['gertrude', -158, -28], ['marisol', 158, -30], ['kevin', 62, -36]].map(([id, x, y]) => ({ rig: G.regularRig(id, 1.4), x, y, k: 0, side: 1, poser: null }));
    const lanes = ctx.laneActions || ['stepL', 'stepD', 'stepU', 'stepR'];
    ctx.contestants.forEach((c, i) => {
      const proxy = Object.create(game); Object.defineProperty(proxy, 'input', { value: c.input || NOINPUT });
      c.rh = new E.Rhythm(proxy, { song: ctx.song, chart: ch, lanes: c.input ? (c.input.half || ctx.mode === 'class' ? ['left', 'down', 'up', 'right'] : lanes) : ['x', 'x', 'x', 'x'], windows: w, life: 1, lead: 1.5,
        on: { judge: (j, n) => { c.lastJ = j; c.jT = .5; if (j !== 'miss' && G.cue(ctx, c)) G.A.sfx('hit', { vol: j === 'perfect' ? 1 : .6 }); if (j === 'miss' && G.cue(ctx, c)) { G.A.sfx('miss'); if (c.input) c.input.rumble(.2, .08); } } } });
      if (ctx.contestants.length === 1) c.x = -92;
      c.k = 0; c.side = 1; c.botI = 0; c.lastJ = null; c.jT = 0; c.steps = 0;
      if (c.skill) { const T = TIMING[c.skill]; c.plan = c.rh.notes.map(() => ({ off: (c.rng() + c.rng() + c.rng() - 1.5) * T.sd * 1.15, skip: c.rng() < T.miss })); c.brain = c.brain || new G.BotBrain(c.skill, c.rng); }
    });
  },
  begin(ctx) { /* the music starts on the first step of play */
    const first = ctx.contestants[0]; first.rh.start(); for (const c of ctx.contestants.slice(1)) { c.rh.reset(); c.rh.started = true; }
    G.musicClaim('step'); beatHost = b => {
      ctx.beat = b; if (ctx.done) return; ctx.flash = 1;
      if (!ctx.quiet) { G.A.sfx(b % 4 === 0 ? 'clickUp' : 'click'); if (ctx.instructor && b % 2 === 0) G.say1(ctx.instructor, COUNT[(b >> 1) % 4]); }
      if (ctx.back) for (const q of ctx.back) { q.side = -q.side; q.k = 1; }
      if (ctx.teacher) { ctx.teacherSide = -ctx.teacherSide; ctx.teacherK = 1; }
    };
    ctx.begun = true;
  },
  stop(ctx) { beatHost = null; for (const c of ctx.contestants) if (c.rh) c.rh.done = true; },
  preview(dt, ctx) {
    G.stageCam(32, 10); if (ctx.done) { for (const c of ctx.contestants) c.benchY = 4; const t0 = ctx.teacher; ctx.teacher = null; G.celebrate(ctx, dt); ctx.teacher = t0; }
    if (!ctx.done)
    for (const c of ctx.contestants) { c.rig.body = stepSide(0, 1); c.rig.update(dt, { x: c.x, y: 4, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
    if (ctx.teacher) { ctx.teacherK = Math.max(0, ctx.teacherK - dt * 3); if (Math.floor(game.real * 2) !== Math.floor((game.real - dt) * 2)) { ctx.teacherK = 1; ctx.teacherSide = -ctx.teacherSide; } ctx.teacher.body = stepSide(Math.sin(ctx.teacherK * Math.PI), ctx.teacherSide); ctx.teacher.update(dt, { x: ctx.teacherX, y: -8, z: 0, vx: 0, vy: 0, facing: 1.57 }); }
    if (ctx.back) for (const q of ctx.back) { q.rig.body = stepSide(0, 1); q.rig.update(dt, { x: q.x, y: q.y, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
  },
  update(dt, ctx) {
    G.stageCam(32, 10);
    if (!ctx.begun) G.families.step.begin(ctx);
    ctx.flash = Math.max(0, ctx.flash - dt * 3);
    const A = G.A;
    for (const c of ctx.contestants) {
      const rh = c.rh; rh.windows.perfect = 45 * G.DEV.window; rh.windows.great = 90 * G.DEV.window; rh.windows.good = 135 * G.DEV.window;
      if (c.skill || (G.DEV.bot && c.local)) {   // a bot: each note a little off, by its skill
        if (!c.plan) { const T = TIMING[G.DEV.bot]; c.plan = rh.notes.map(() => ({ off: (c.rng() + c.rng() + c.rng() - 1.5) * T.sd, skip: c.rng() < T.miss })); }
        const s = A.pos.step, spb = 60 / ctx.song.bpm / ctx.song.steps;
        while (c.botI < rh.notes.length) { const n = rh.notes[c.botI], pl = c.plan[c.botI], when = n.step + pl.off / 1000 / spb; if (s < when) break; c.botI++; if (!pl.skip && !n.call && !n.j) { rh.hit(n.lane); rh.release(n.lane); c.k = 1; c.side = n.lane === 0 || n.lane === 2 ? -1 : 1; c.steps++; } }
      }
      const before = rh.counts.perfect + rh.counts.great + rh.counts.good, I = c.input;
      if (I && !(G.DEV.bot && c.local)) { const L = rh.lanes; let hit = false; for (let k = 0; k < 4; k++) if (L[k] !== 'x' && I.map[L[k]] && I.pressed(L[k])) { hit = true; c.k = 1; c.side = k === 0 || k === 2 ? -1 : 1; c.steps++; } }
      rh.life = 1; rh.update(); rh.life = 1;
      c.jT = Math.max(0, c.jT - dt);
      c.k = Math.max(0, c.k - dt * 3.2);
      c.rig.body = stepSide(Math.sin(c.k * Math.PI), c.side);
      c.rig.update(dt, { x: c.x, y: 4, z: 0, vx: 0, vy: 0, facing: 1.57, expr: c.jT > 0 && c.lastJ === 'miss' ? 'wince' : 'smile' });
    }
    if (ctx.teacher) { ctx.teacherK = Math.max(0, ctx.teacherK - dt * 3); ctx.teacher.body = stepSide(Math.sin(ctx.teacherK * Math.PI), ctx.teacherSide); ctx.teacher.update(dt, { x: ctx.teacherX, y: -8, z: 0, vx: 0, vy: 0, facing: 1.57 }); }
    if (ctx.back) for (const q of ctx.back) { q.k = Math.max(0, q.k - dt * 3); q.rig.body = stepSide(Math.sin(q.k * Math.PI), q.side); q.rig.update(dt, { x: q.x, y: q.y, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
    if (ctx.contestants[0].rh.done && ctx.time > 2) ctx.finished = true;
  },
  result(ctx, c) { const rh = c.rh, a = rh.counts.perfect + rh.counts.great + rh.counts.good + rh.counts.miss ? rh.accuracy : 0; return { pct: a, detail: 'Perfect ' + rh.counts.perfect + '. Great ' + rh.counts.great + '. Good ' + rh.counts.good + '. Missed ' + rh.counts.miss + '.' }; },
  bot() { /* notes are hit in update, on the music clock */ },
  ghost(ctx, c) { return { k: +c.k.toFixed(2), d: c.side }; },
  draw(r, ctx) {
    (G.ROOMS[ctx.def.room] || G.ROOMS.pier)(r, { dusk: G.roomDusk && G.roomDusk(), festive: ctx.mode === 'games' });
    const bench = (x, y) => { const p = r.w(x - 22, y + 8, 0), q = r.w(x + 22, y + 8, 0), a = r.w(x - 22, y - 8, 6), b = r.w(x + 22, y - 8, 6); r.queue(x, y - 6, 0, g => { px.poly(g, [[a[0], a[1]], [b[0], b[1]], [q[0], q[1] - 9], [p[0], p[1] - 9]], '#f5f7f7'); px.rect(g, p[0], p[1] - 9, q[0] - p[0], 9, '#2cc6e6'); px.rect(g, p[0] + 3, p[1] - 2, 5, 2, '#20404c'); px.rect(g, q[0] - 8, q[1] - 2, 5, 2, '#20404c'); }); };
    if (ctx.back) for (const q of ctx.back) { bench(q.x, q.y); G.drawRig(r, q.rig, q.x, q.y); }
    if (ctx.teacher) { bench(ctx.teacherX, -8); G.drawRig(r, ctx.teacher, ctx.teacherX, -8); }
    for (const c of ctx.contestants) { bench(c.x, 4); G.drawRig(r, c.rig, c.x, 4); }
    G.drawGhosts && G.drawGhosts(r, ctx);
    if (ctx.live) {
      const many = ctx.contestants.length > 1;
      r.overlay(g => { if (!many) { G.panel(g, game.W / 2 - 62, 26, 124, game.H - 36, { r: 8, bg: '#fbfdfdcc', shadow: false }); } });
      for (const c of ctx.contestants) { if (c.life) continue; const p = r.w(c.x, 0, 0); c.rh.draw(r, many ? { x: p[0], y: r.H - 26, dir: 'down', len: 118, gap: 15, size: 6, arrows: true, colors: ['#ff7a59', '#2cc6e6', '#6fcf8e', '#b08be0'] } : { x: r.W / 2, y: r.H - 26, dir: 'down', len: r.H - 66, gap: 28, size: 11, arrows: true, colors: ['#ff7a59', '#2cc6e6', '#6fcf8e', '#b08be0'] }); }
    }
  },
  hud(g, ctx) {
    const W = game.W, H = game.H, many = ctx.contestants.length > 1;
    if (ctx.live) G.drawTimer(g, G.left(ctx), { x: W - 34 });
    for (const c of ctx.contestants) { const x = many ? game.r.w(c.x, 0, 0)[0] : W / 2;
      if (c.jT > 0 && c.lastJ) txt(g, c.lastJ[0].toUpperCase() + c.lastJ.slice(1), x, many ? H - 62 : H / 2 - 30, c.lastJ === 'miss' ? '#e0553a' : '#14a8c8', { align: 'center', scale: many ? 1 : 2, shadow: '#ffffff' });
      if (!many && c.rh.combo > 3) txt(g, c.rh.combo + ' in a row', W / 2, H / 2 - 12, '#5f7f8a', { align: 'center', shadow: '#ffffff' });
      if (many) txt(g, c.name, x, H - 12, c.color, { align: 'center', shadow: '#ffffff' });
    }
    if (ctx.live && !many) G.prompts(g, [[game.input.lastDevice === 'gamepad' ? '=D-pad' : game.input.lastDevice === 'mouse' ? '=Buttons, wheel' : '=WASD / arrows', 'Step']], { x: W - 8, y: H - 18 });
    if (ctx.flash > 0 && !many) { const k = Math.round(ctx.flash * 5); px.rect(g, W / 2 - 60, H - 8, 120, 1 + k > 1 ? 2 : 1, '#2cc6e6'); }
  }
});
})();
