// Tremolo: a shivering web on the beating heart, five reeds around a mass (section 8). It plays like a rhythm game: inject on the flare after the beat.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;
const inWindow = S => S.beatT !== undefined && S.t - S.beatT < .3;
G.beatWindow = inWindow;

def('tremolo', {
  strain: true, sings: true, r: 12, prio: 3, ghost: o => ({ k: 'tremolo', x: o.x, y: o.y }),
  hazard: o => .6 * o.amp,
  init(o, S) {
    o.amp = 1; o.stage = 1; o.burn = 0; o.wakeT = 6; o.pinT = 0; o.crawlS = 0; o.cutT = 3; o.req = true; o.burnNeedAll = 3 * T.strainHealth; o.ox = o.x; o.oy = o.y; o.hx = o.x; o.hy = o.y;
    for (let i = 0; i < (o.reeds ?? 5); i++) { const a = i / (o.reeds ?? 5) * 6.283 - 1.57; Op().spawn(S, { type: 'reed', x: o.x + Math.cos(a) * 38, y: o.y + Math.sin(a) * 26, owner: o.id, req: false }); }
  },
  accept(o, t, S) { if (o.stage === 2 && t === 'cautery') return 'Burn'; if (o.stage === 2 && o.crawling && t === 'forceps') return 'Pin'; if (o.stage === 3 && t === 'forceps') return 'Pull'; return null; },
  burnNeed: o => 1e9,
  burning(S, h, o, dt) { o.burn += dt; S.ev.push(['tremBurn', o.x, o.y]); if (o.burn >= o.burnNeedAll / 2 && !o.crawling) { o.crawling = true; o.wakeT = 4; S.ev.push(['tremTear', o.x, o.y]); S.ev.push(['sayp', 'crawl']); } if (o.burn >= o.burnNeedAll) { o.stage = 3; o.crawling = false; o.pull = { ax: Math.cos(o.pullAng ?? -1.2), ay: Math.sin(o.pullAng ?? -1.2), depth: 40, prog: 0, t: 0, tears: 0, par: 2.2, max: 46 }; o.ox = o.x; o.oy = o.y; o.burnT = 0; S.ev.push(['strainHit', o.x, o.y]); S.ev.push(['sayp', 'lastpull']); Score().award(S, h, o.x, o.y, h.dirty ? 'Clean' : 'Textbook', 120); } },
  grip(S, h, o) { if (o.stage === 2) { o.pinT = 2; S.ev.push(['grip', o.x, o.y, h.id]); } },
  hold(S, h, o, dt) { if (o.stage === 3) G.Tools.pullStep(S, h, o, dt); else { o.pinT = 2; } },
  release(S, h, o) { if (o.stage === 3 && o.free) { const far = U.dist(o.x, o.y, o.ox, o.oy) >= 24 || !U.inCavity(o.x, o.y, 4); if (far) { S.jitter = null; S.ev.push(['dish', o.x, o.y, h.id]); S.ev.push(['strainDead', o.x, o.y]); for (const r of S.objs) if (r.type === 'reed' && r.owner === o.id) r.done = true; Op().finishObj(S, o, h, o.pull.tears ? 'Clean' : 'Textbook', 400, 'forceps'); } } },
  freed(S, h, o) { },
  step(o, S, w) {
    S.jitter = o.done || o.stage === 3 ? null : { x: o.x, y: o.y, r: 70, amp: o.amp };
    if (o.stage === 1) { if (o.amp <= .21) { o.stage = 2; S.ev.push(['shellCrack', o.x, o.y]); S.ev.push(['sayp', 'crack']); G.Score.charge(S, 15); } }
    else if (o.stage === 2) {
      o.wakeT -= w; if (o.wakeT <= 0) { o.wakeT = 6; const r = S.objs.find(q => q.type === 'reed' && q.owner === o.id && q.sedated); if (r) { r.sedated = false; o.amp = Math.min(1, o.amp + .2); S.ev.push(['reedWake', r.x, r.y]); } }
      if (o.crawling) { o.pinT -= w; if (o.pinT <= 0 && o.vessel) { const len = U.polyLen(o.vessel); o.crawlS = (o.crawlS + w * 16 * T.strainSpeed); const s = o.crawlS % (len * 2), q = U.polyAt(o.vessel, s < len ? s : len * 2 - s); o.x = q.x; o.y = q.y; o.cutT -= w; if (o.cutT <= 0) { o.cutT = 3; if (S.objs.filter(q2 => q2.type === 'laceration' && !q2.done).length < 5) Op().spawn(S, { type: 'laceration', x: o.x, y: o.y, r: 7, req: false, ang: U.rnd(S) * 3 }); S.ev.push(['beadBite', o.x, o.y]); } } }
    }
    if (S.t - (o.singT ?? -9) > 1.6) { o.singT = S.t; S.ev.push(['tremSing', o.x, o.amp]); }
  },
  onDone(S) { S.jitter = null; },
  job(o, S, h) {
    const reeds = S.objs.filter(q => q.type === 'reed' && q.owner === o.id && !q.sedated && !q.done);
    if (o.stage === 1 || (o.stage === 2 && reeds.length && o.amp > .6)) { if (reeds.length) return { tool: 'syringe', o: reeds[0] }; }
    if (o.stage === 2) return { tool: 'cautery', o, plan: 'tremBurn' };
    if (o.stage === 3) return { tool: 'forceps', o, plan: 'tremPull' };
    return null;
  },
});
def('reed', {
  strain: true, r: 4, worth: 50, ghost: o => ({ k: 'reed', x: o.x, y: o.y }),
  init(o) { o.sedated = false; },
  accept: (o, t) => t === 'syringe' && !o.sedated ? 'Sedate' : null,
  doseWindow: (o, S) => inWindow(S),
  dose(S, h, o, q) {
    const c = Op().byId(S, o.owner);
    if (inWindow(S)) { o.sedated = true; if (c) c.amp = Math.max(0, c.amp - .2); S.ev.push(['sedate', o.x, o.y]); Score().award(S, h, o.x, o.y, q, 60); if (S.tut && S.tut.tool === 'syringe') S.tut = null; }
    else { S.ev.push(['reedSpit', o.x, o.y]); Score().hurt(S, 2 * T.strainDamage); S.flow = 0; if (S.objs.filter(q2 => q2.type === 'laceration' && !q2.done).length < 6) Op().spawn(S, { type: 'laceration', x: o.x + U.range(S, -8, 8), y: o.y + 10, r: 6, req: false, ang: 1 }); S.ev.push(['say', 'beat']); }
  },
});

const reg = () => {
  const P = G.Bot.plans;
  P.tremBurn = function* (o, S, B) {
    yield* B.tool('cautery'); const h = () => B.S.hands[B.i];
    yield* B.moveTo(() => o.x, () => o.y, undefined, 2); B.press(); let guard = 0;
    while (!o.done && o.stage === 2 && guard++ < 420) { if (h().heat > .9 || h().lock > 0) { B.release(); yield* B.hold(.45); B.press(); } const dx = o.x - B.c.x, dy = o.y - B.c.y, d = Math.hypot(dx, dy); if (d > .5) B.steer(dx, dy, d, 300); yield; const reeds = B.S.objs.filter(q => q.type === 'reed' && q.owner === o.id && !q.sedated && !q.done); if (reeds.length >= 3) break; }
    B.release(); yield;
  };
  P.tremPull = function* (o, S, B) {
    yield* B.tool('forceps'); yield* B.moveTo(() => o.x, () => o.y, undefined, 1.5); B.press(); yield; const p = o.pull, sp = Math.min(38, p.max * .7); const left = p.depth - p.prog + 3; yield* B.line(B.c.x + p.ax * left, B.c.y + p.ay * left, sp); yield; const dx = o.x - o.ox, dy = o.y - o.oy, l = Math.hypot(dx, dy) || 1; if (l < 28) yield* B.line(B.c.x + dx / l * (28 - l), B.c.y + dy / l * (28 - l), 120); B.release(); yield; yield;
  };
};
if (G.Bot) reg(); else (G._after ||= []).push(reg);
})();
