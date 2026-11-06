// Step Class (E.Rhythm)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const LANES = ['stepL', 'stepD', 'stepU', 'stepR'];
G.activity({
  id: 'step', family: 'step', discipline: 'Cardio', name: 'Step Class', room: 'pier', view: 'brawler', song: null, demoPose: 'Jumping Jacks', tier2Name: 'Four ways, faster', class: true,
  card: 'Step on the beat. Notes fall to the line. Press left or right as they land. The click is for you.',
  how: { pad: 'D-pad or left stick flicks. Left and right.', key: 'A and D, or the arrow keys.', mouse: 'Left and right mouse buttons. The wheel steps up and down.' },
  stars: [.5, .75, .92],
  tiers: [{ set: 'free', dur: 62, chart: 1, stars: [.5, .75, .92] }, { set: 'free', dur: 62, chart: 2, stars: [.5, .75, .92] }],
  setup(run) {
    let ch = G.CHARTS[run.T.chart], song = G.SONGS[ch.song]; const win = G.DEV.rhythmWin;
    if (run.shortRun) { ch = Object.assign({}, ch, { order: ch.order.split(' ').slice(0, 12).join(' ') }); song = Object.assign({}, song, { len: 192 }); run.dur = 32; }
    run.song = song; run.chart = ch; run.bpm = song.bpm; run.lanesUsed = run.T.chart === 1 ? [0, 3] : [0, 1, 2, 3];
    run.cs.forEach(c => {
      c.fake = { pressed: a => !!c.it.stepP[a], released: () => false };
      const proxy = Object.create(G.game); proxy.input = c.fake;
      c.rh = new E.Rhythm(proxy, { song, chart: { parts: ch.parts, order: ch.order }, lanes: LANES, windows: { perfect: 45 * win, great: 90 * win, good: 135 * win }, life: 1 });
      c.rh._gauge = function () { }; c.stepT = 9; c.stepK = 0; c.plan = {}; c.lastPress = 0; c.fig.tgt = 1.35;
    });
    run.beatN = 0; run.regs = ['gertrude', 'kevin', 'marisol'].map((id, i) => { const f = G.castFigure(id, { size: 1.5, x: -70 + i * 54, y: -18, tgt: 1.5 }); f.set('Idle_Subtle'); return f; });
    run.lastBeat = -1; run.counts = ['one', 'two', 'three', 'four'];
  },
  start(run) { run.cs.forEach(c => c.rh.start()); run.started = true; run.song && 0; },
  bot(run, c, bot, dt) {
    const sd = { poor: 100, average: 62, good: 38, expert: 22 }[bot.skill] || 40, spb = 60 / run.bpm / 4;
    if (!c.rh.started) return; const s = G.game.audio.pos.step;
    for (const a of LANES) c.it.stepP[a] = false;
    for (let i = 0; i < c.rh.notes.length; i++) { const n = c.rh.notes[i]; if (n.j || n.call) continue; if ((n.step - s) * spb > .25) break;
      if (c.plan[i] == null) c.plan[i] = (run.rng() + run.rng() + run.rng() - 1.5) * 1.6 * sd / 1000 + (bot.skill === 'poor' && run.rng() < .1 ? 9 : 0);
      if (c.plan[i] < 5 && (n.step - s) * spb <= c.plan[i] && !c.plan['d' + i]) { c.plan['d' + i] = 1; c.it.stepP[LANES[n.lane]] = true; }
    }
  },
  update(dt, run) {
    run.cs.forEach(c => {
      const proxyGame = c.rh.game; if (run.started) { c.rh.update(); }
      const any = LANES.some(a => c.it.stepP[a]); if (any) { c.stepT = 0; G.snd('step'); if (c.local) G.grunt && 0; }
      c.stepT += dt; const k = c.stepT < .32 ? Math.sin(Math.PI * c.stepT / .32) : 0; c.fig.rig.body = G.moves.stepUp(k, 5); c.fig.clip = null; c.fig.key = 'body';
      const L = c.rh.last; if (L && L.t !== c.lastJ) { c.lastJ = L.t; c.jt = .5; c.jv = L.j; if (L.j === 'perfect') G.game.particles.glints && G.game.particles.glints(c.fig.x, c.fig.y, 24, 2, '#bfeee0'); }
      c.jt = Math.max(0, (c.jt || 0) - dt);
    });
    // the beat: a soft click on the sfx bus (never depend on the music), the instructor counts
    const A = G.game.audio, p = A.pos; if (run.started && p && p.playing) { const beat = Math.floor(p.t * run.bpm / 60); if (beat !== run.lastBeat) { run.lastBeat = beat; const acc = beat % 4 === 0; G.snd(acc ? 'clickHi' : 'click'); if (run.inst) { G.babble(run.inst.name, ['o', 't', 'f', 'f'][beat % 4], 1.1); } run.cs.forEach(c => { c.fig.rig.kick && 0; }); } }
    const bp = p && p.t ? p.t * run.bpm / 60 : run.time * run.bpm / 60;
    run.regs.forEach((f, i) => { const ph = (bp + i * .25) % 2, k = ph < 1 ? Math.sin(Math.PI * ph) : 0; f.clip = null; f.key = 'body'; f.rig.body = G.moves.stepUp(k * .9, 4); f.update(dt); });
    if (run.inst) { const ph = bp % 2, k = ph < 1 ? Math.sin(Math.PI * ph) : 0; run.inst.clip = null; run.inst.key = 'body'; run.inst.rig.body = G.moves.stepUp(k, 5); run.inst.tgt = 1.5; }
  },
  hud(r, run) {
    G.drawTimer(r, run); G.nameTags(r, run);
    run.cs.forEach((c, i) => {
      const small = run.n > 1, s = run.slot(i), sx = small ? r.w(s.x, 12, 0)[0] : 66;
      c.rh.draw(r, { x: sx, y: r.H - (small ? 30 : 46), dir: 'down', len: small ? 70 : 150, gap: small ? 11 : 22, size: small ? 4 : 8, arrows: true });
      r.overlay(g => {
        if (!small) { G.txt(g, c.rh.combo > 1 ? c.rh.combo + ' combo' : '', sx, r.H - 36 - 160, C.ACC2, { align: 'center', scale: 1 }); G.txt(g, Math.round(c.rh.accuracy * 100) + '%', sx, 14, C.INK, { align: 'center', scale: 2 }); }
        if (c.jt > 0 && !small) G.txt(g, { perfect: 'Perfect', great: 'Great', good: 'Good', miss: 'Miss' }[c.jv] || '', sx + 74, r.H - 80 - (.5 - c.jt) * 20, c.jv === 'miss' ? C.DANGER : '#14a88c', { align: 'left', scale: 1 });
      });
    });
  },
  draw(r, run) {
    const bench = (x, y) => { const p = r.w(x, y, 0); r.overlay(g => { px.rect(g, p[0] - 16, p[1] - 6, 32, 6, '#ffffff'); px.rect(g, p[0] - 16, p[1] - 2, 32, 3, '#c8dde2'); px.rect(g, p[0] - 14, p[1], 2, 3, '#8a8f98'); px.rect(g, p[0] + 12, p[1], 2, 3, '#8a8f98'); }); };
    run.cs.forEach(c => bench(c.fig.x + 18, c.fig.y));
    run.regs.forEach(f => f.draw(r)); if (run.inst) run.inst.draw(r);
    run.cs.forEach(c => c.fig.draw(r));
  },
  result(run, c) { return { pct: G.clamp(c.rh.total ? c.rh.accuracy * (Object.values(c.rh.counts).reduce((a, b) => a + b, 0) / c.rh.total) : 0, 0, 1), detail: 'Grade ' + c.rh.grade + '  ·  Best combo ' + c.rh.maxCombo }; },
  finished(run) { return run.cs.every(c => c.rh.done) && run.started; },
  exit(run) { try { G.game.audio.music(null); } catch (e) {} }
});
})();
