// Fermata: an eye in the gyri. It raises domes where everything waits; its eye opens for .7 s the moment one falls (section 8).
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;

def('dome', {
  strain: true, optional: true, ghost: o => ({ k: 'dome', x: o.x, y: o.y, r: o.r }), accept: () => null, init(o) { o.r = o.r ?? 34; o.t = o.t ?? 5; o.req = false; },
  step(o, S, w) { o.t -= w; if (o.t <= 0) { o.done = true; S.ev.push(['domeFall', o.x, o.y]); const c = S.objs.find(q => q.type === 'eye' && !q.done && !q.hidden); if (c) G.OBJ.eye.onDomeFall(S, c, o); } },
});
def('eye', {
  strain: true, sings: true, r: 5, prio: 2, ghost: o => ({ k: 'eye', x: o.x, y: o.y, open: o.openT > 0 }),
  init(o, S) { o.openT = 0; o.hits = 0; o.need = o.need ?? 3; o.domeT = o.domeT ?? 1.4; o.cooldown = 0; o.req = true; o.spots = o.spots || [[o.x - 74, o.y - 22], [o.x + 70, o.y + 18], [o.x + 8, o.y - 40]]; o.rise = 0; },
  accept: (o, t) => t === 'cautery' && o.openT > 0 ? 'Burn' : null,
  burnNeed: () => .3 * T.strainHealth,
  burned(S, h, o, gr) { o.hits++; o.burnT = 0; o.openT = Math.min(o.openT, .06); S.ev.push(['eyeHit', o.x, o.y]); Score().award(S, h, o.x, o.y, gr, 120); if (o.hits >= o.need) { S.ev.push(['strainHit', o.x, o.y]); for (const d of S.objs) if (d.type === 'dome') d.done = true; Op().finishObj(S, o, h, null, 0, 'cautery'); } },
  onDomeFall(S, o, d) { o.openT = .7; o.burnT = 0; S.ev.push(['eyeOpen', o.x, o.y]); if (!S.flags.firstEye) { S.flags.firstEye = true; if (S.duo && S.doctor !== 'vale') { S.prompt = 'consult'; S.ev.push(['sayp', 'consultHint']); } } },
  step(o, S, w) {
    if (o.openT > 0) o.openT -= w;
    if (o.hidden && o.marked > 0) { o.hidden = false; S.ev.push(['found', o.x, o.y, 0]); o.openT = 4; o.need = o.hits + 1; }
    if (o.stage2) { if (!o.hidden && o.openT <= 0) o.openT = 2; return; }
    o.domeT -= w;
    if (o.domeT <= 0) { // up to three domes: one always over the eye
      const live = S.objs.filter(q => q.type === 'dome' && !q.done).length;
      if (live < 3) { const first = o.rise % 3 === 0, spot = first ? [o.x, o.y] : o.spots[o.rise % o.spots.length]; Op().spawn(S, { type: 'dome', x: spot[0], y: spot[1], r: 34, t: 5, req: false }); o.rise++; S.ev.push(['domeRise', spot[0], spot[1]]); }
      o.domeT = 4.2;
    }
    if (S.t - (o.singT ?? -9) > 3.6) { o.singT = S.t; S.ev.push(['fermSing', o.x]); }
  },
  job(o, S, h) { if (o.hidden && !(o.marked > 0)) return { tool: 'sonar', o }; return { tool: 'cautery', o, plan: 'eyeBurn' }; },
});
def('eyeRoot', {
  strain: true, r: 4, prio: 3, worth: 300, accept: (o, t) => t === 'forceps' ? 'Pull' : null, init(o) { G.mkPull(o, { depth: 30, max: o.max ?? 28, ang: o.ang ?? -1.3 }); },
  ghost: o => ({ k: 'eye', x: o.x, y: o.y, open: true }),
  bot: function* (o, S, B) { yield* B.tool('forceps'); yield* B.moveTo(() => o.x, () => o.y, undefined, 1.4); B.press(); yield; const p = o.pull, sp = p.max * .62, left = p.depth - p.prog + 3; yield* B.line(B.c.x + p.ax * left, B.c.y + p.ay * left, sp); yield; const dx = o.x - o.ox, dy = o.y - o.oy, l = Math.hypot(dx, dy) || 1; if (l < 28) yield* B.line(B.c.x + dx / l * (28 - l), B.c.y + dy / l * (28 - l), 100); B.release(); yield; yield; },
});

const reg = () => {
  const P = G.Bot.plans;
  P.eyeBurn = function* (o, S, B) {
    yield* B.tool('cautery'); const h = () => B.S.hands[B.i]; const sx = o.x + 2, sy = o.y;
    yield* B.moveTo(sx, sy, undefined, 1.5);
    // wait outside time: Long Breath helps when it can
    let w = 0; while (o.openT <= 0 && !o.done && w++ < 1200) yield;
    if (o.done) return;
    B.press(); let g = 0; while (o.openT > 0 && !o.done && g++ < 240) { if (h().heat > .93) break; yield; } B.release(); yield;
  };
};
if (G.Bot) reg(); else (G._after ||= []).push(reg);
})();
