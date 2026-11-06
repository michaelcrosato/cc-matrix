// Da Capo: three lobes on a glowing staff with repeat signs. Each opens on its own timer; the first kill starts ten seconds, and at zero the dead regrow, "from the top".
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;
const TIMES = { A: [6, 2.5], B: [7, 2.5], C: [9, 3] };
const isOpen = (o, S, c) => { const [p, d] = TIMES[o.kind], k = c ? c.speed : 1; return ((c ? c.t : S.t) + (o.off || 0)) % (p / k) < d / k; };
const kill = (S, h, o, grade) => { o.dead = true; o.stage = 0; o.burnT = 0; o.coatT = 0; S.ev.push(['lobeDead', o.x, o.y, o.kind]); Score().award(S, h, o.x, o.y, grade, 150); const c = Op().byId(S, o.owner); if (c && c.countdown <= 0) { c.countdown = c.limit; S.ev.push(['daCapoStart', c.x, c.y]); S.ev.push(['sayp', 'countdown']); } };

def('dacapo', {
  strain: true, sings: true, r: 0, prio: 3, ghost: o => ({ k: 'dacapo', x: o.x, y: o.y }),
  hazard: () => .3,
  init(o, S) {
    o.speed = o.speed ?? 1; o.limit = (o.limit ?? 10) * (S.k ? S.k.clock : 1); o.countdown = 0; o.t = 0; o.repeats = 0; o.beadT = 5; o.req = true;
    const sp = o.spread ?? 92; [['A', -sp, -16], ['B', 0, 18], ['C', sp, -16]].forEach(([kind, dx, dy], i) => Op().spawn(S, { type: 'lobe', kind, x: o.x + dx, y: o.y + dy, owner: o.id, off: i * .7, req: false }));
  },
  accept: () => null,
  step(o, S, w) {
    o.t += w; const lobes = S.objs.filter(q => q.type === 'lobe' && q.owner === o.id && !q.done);
    for (const l of lobes) { const was = l.open; l.open = !l.dead && isOpen(l, S, o); if (l.open && !was) S.ev.push(['lobeOpen', l.x, l.y, l.kind]); }
    if (o.countdown > 0) {
      o.countdown -= w;
      if (o.countdown <= 0) { o.countdown = 0; let any = false; for (const l of lobes) if (l.dead) { l.dead = false; any = true; } if (any) { o.repeats++; Score().hurt(S, 8 * T.strainDamage); S.ev.push(['daCapo', o.x, o.y]); S.ev.push(['sayp', 'fromtop']); } }
    }
    if (lobes.length && lobes.every(l => l.dead)) { for (const l of lobes) l.done = true; for (const b of S.objs) if (b.type === 'bead' && b.fromCapo) b.done = true; S.ev.push(['strainDead', o.x, o.y]); Op().finishObj(S, o, S.hands[0], o.repeats ? 'Clean' : 'Textbook', 400, 'none'); return; }
    if (o.speed > 1) { o.beadT -= w * T.spawnRate; if (o.beadT <= 0 && S.objs.filter(q => q.type === 'bead' && !q.done).length < 4) { o.beadT = 5; Op().spawn(S, { type: 'bead', x: o.x + U.range(S, -60, 60), y: o.y + U.range(S, -30, 30), req: false, fromCapo: true }); S.ev.push(['nestSpit', o.x, o.y]); } }
    if (S.t - (o.singT ?? -9) > 2.6) { o.singT = S.t; S.ev.push(['capoSing', o.x]); }
  },
  job(o, S, h) {
    const lobes = S.objs.filter(q => q.type === 'lobe' && q.owner === o.id && !q.done && !q.dead); if (!lobes.length) return null;
    // the bot goes to the lobe that opens soonest
    const order = lobes.map(l => { const [p] = TIMES[l.kind], per = p / o.speed, ph = (o.t + (l.off || 0)) % per; return { l, wait: l.open ? 0 : per - ph }; }).sort((a, b) => a.wait - b.wait), hi = Math.max(0, S.hands.indexOf(h)), best = order[hi % order.length].l;
    return { tool: best.kind === 'A' ? 'cautery' : best.kind === 'B' ? (best.stage ? 'forceps' : 'scalpel') : (best.stage ? 'salve' : 'syringe'), o: best, plan: 'lobe' };
  },
});
def('lobe', {
  strain: true, r: 8, reach: 6, worth: 150, ghost: o => ({ k: 'lobe', x: o.x, y: o.y, open: o.open, dead: o.dead, kind: o.kind }),
  init(o) { o.open = false; o.dead = false; o.stage = 0; o.coatT = 0; G.mkPull(o, { depth: 12, ang: -1.57 }); },
  accept(o, t) {
    if (o.dead || !o.open) return null;
    if (o.kind === 'A') return t === 'cautery' ? 'Burn' : null;
    if (o.kind === 'B') return t === 'scalpel' && !o.stage ? 'Slash' : t === 'forceps' && o.stage ? 'Pull' : null;
    return t === 'syringe' && !o.stage ? 'Dose' : t === 'salve' && o.stage ? 'Coat' : null;
  },
  burnNeed: (o, S) => (S.objs.some(c => c.id === o.owner && c.speed > 1) ? .8 : 1) * T.strainHealth, burned(S, h, o, gr) { kill(S, h, o, gr); },
  slashed(S, h, o) { if (o.stage) return; o.stage = 1; S.ev.push(['strainHit', o.x, o.y]); Score().award(S, h, o.x, o.y, 'Clean', 40); },
  dose(S, h, o, q) { o.stage = 1; S.ev.push(['sedate', o.x, o.y]); Score().award(S, h, o.x, o.y, q, 40); },
  coat(S, h, o, dt) { o.coatT += dt; if (o.coatT >= 1 * T.strainHealth) kill(S, h, o, 'Textbook'); },
  hold(S, h, o, dt) { G.Tools.pullStep(S, h, o, dt); if (o.free && o.pull.prog >= o.pull.depth) { h.held = 0; o.free = false; o.pull.prog = 0; o.pull.t = 0; o.x = o.ox; o.y = o.oy; S.ev.push(['dish', o.x, o.y, h.id]); kill(S, h, o, o.pull.tears ? 'Clean' : 'Textbook'); } },
  release(S, h, o) { if (!o.free) { o.x = o.ox; o.y = o.oy; } },
  torn(S, h, o) { },
});

const reg = () => {
  const P = G.Bot.plans;
  P.lobe = function* (l, S, B, job) {
    const C = () => G.Op.byId(B.S, l.owner), tool = job.tool, h = () => B.S.hands[B.i];
    yield* B.tool(tool);
    const X = l.x, Y = l.y;
    if (tool === 'scalpel') { const r = 26, a = 1.1; yield* B.moveTo(X - Math.cos(a) * r, Y - Math.sin(a) * r, undefined, 3); let w = 0; while (!l.open && w++ < 1200 && !l.dead) yield; if (l.dead) return; B.press(); yield; yield* B.line(X + Math.cos(a) * r, Y + Math.sin(a) * r, 240); B.release(); yield; return; }
    yield* B.moveTo(X, Y, undefined, 2);
    let w = 0; while (!l.open && w++ < 1200 && !l.dead && !l.done) { if (tool === 'syringe' && !h().down && w > 10) { } yield; }
    if (l.dead || l.done) return;
    if (tool === 'cautery') { B.press(); let g = 0; while (l.open && !l.dead && !l.done && g++ < 300) { if (h().heat > .92) { B.release(); yield* B.hold(.3); B.press(); } yield; } B.release(); yield; }
    else if (tool === 'syringe') { B.press(); yield* B.hold(T.fillT + .02); B.release(); yield; yield* B.hold(T.syrCool); }
    else if (tool === 'salve') { B.press(); let g = 0; while (l.open && !l.dead && !l.done && g++ < 300) yield; B.release(); yield; }
    else if (tool === 'forceps') { B.press(); yield; const p = l.pull; yield* B.line(B.c.x + p.ax * (p.depth + 3), B.c.y + p.ay * (p.depth + 3), 70); yield; B.release(); yield; }
  };
};
if (G.Bot) reg(); else (G._after ||= []).push(reg);
})();
