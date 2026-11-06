// Staccato: a swarm of beads hopping in bursts on a fixed beat, from hidden nests (section 8). tk-tk-tk on the beat, so the rhythm plays by ear.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;

def('staccato', {
  strain: true, sings: true, optional: true, accept: () => null, init(o) { o.t = 0; o.beat = 0; o.spawnT = 2; o.spawned = false; o.x = o.x ?? 213; o.y = o.y ?? 116; o.req = true; },
  step(o, S, w) {
    o.t += w; const beatLen = T.staccatoBeat; if (o.t >= beatLen) { o.t -= beatLen; o.beat++; S.ev.push(['tk', o.x]); }
    if (!o.spawned) { o.spawned = true; for (let i = 0; i < (o.beads || 0); i++) Op().spawn(S, { type: 'bead', x: o.x + U.range(S, -60, 60), y: o.y + U.range(S, -40, 40), req: false, ctrl: o.id }); }
    const nests = S.objs.filter(q => q.type === 'nest' && !q.done && !q.gone), beads = S.objs.filter(q => q.type === 'bead' && !q.done);
    if (nests.length) { o.spawnT -= w * T.spawnRate; if (o.spawnT <= 0 && beads.length < (o.maxBeads || 7)) { o.spawnT = o.every || 3; const n = nests[U.rnd(S) * nests.length | 0]; if (n.shellOff !== true) { Op().spawn(S, { type: 'bead', x: n.x, y: n.y, req: false, ctrl: o.id }); S.ev.push(['nestSpit', n.x, n.y]); } } }
    else { // when the last nest goes, the remaining beads die within 3 s
      if (!o.dying) { o.dying = 3; }
      o.dying -= w; if (o.dying <= 0) { for (const b of beads) { b.done = true; S.ev.push(['beadDie', b.x, b.y]); } }
      if (!beads.length) { o.done = true; S.ev.push(['strainDead', o.x, o.y]); Score().charge(S, 8); }
    }
  },
});
def('bead', {
  strain: true, sings: true, r: 3, optionalJob: true, prio: 2, hazard: 0, worth: 40, accept: (o, t) => t === 'cautery' && o.state !== 'air' ? 'Burn' : null, burnNeed: () => T.burnBead * T.strainHealth,
  ghost: o => ({ k: 'bead', x: o.x, y: o.y, tx: o.tx, ty: o.ty }),
  init(o) { o.state = 'ground'; o.t = 0; o.fx = o.x; o.fy = o.y; o.tx = o.x; o.ty = o.y; o.hop = 0; o.bite = false; o.squash = 0; o.req = false; },
  step(o, S, w) {
    o.t += w; o.squash = Math.max(0, o.squash - w * 6); const beat = T.staccatoBeat;
    if (o.state === 'ground') {
      // the closing ring shows the next landing .5 s ahead
      if (o.t >= beat - .5 && !o.planned) { o.planned = true; o.hop++; o.bite = o.hop % 3 === 0; let tx, ty; for (let k = 0; k < 6; k++) { const a = U.rnd(S) * 6.283, d = U.range(S, 18, 42); tx = o.x + Math.cos(a) * d; ty = o.y + Math.sin(a) * d * .8; if (U.inCavity(tx, ty, 14)) break; } if (!U.inCavity(tx, ty, 14)) { tx = G.CAV.x + (o.x - G.CAV.x) * .6; ty = G.CAV.y + (o.y - G.CAV.y) * .6; } o.tx = tx; o.ty = ty; o.fx = o.x; o.fy = o.y; }
      if (o.t >= beat) { o.state = 'air'; o.t = 0; o.planned = false; }
    } else {
      const u = Math.min(1, o.t / (.22)); o.x = U.lerp(o.fx, o.tx, u); o.y = U.lerp(o.fy, o.ty, u);
      if (u >= 1) { o.state = 'ground'; o.t = 0; o.squash = 1; S.ev.push(['beadLand', o.x, o.y]);
        if (o.bite) { const lac = S.objs.filter(q => q.type === 'laceration' && !q.done).length; if (lac < 7 && U.inCavity(o.x, o.y, 8)) Op().spawn(S, { type: 'laceration', x: o.x, y: o.y, r: 7, req: false, ang: U.rnd(S) * 3 }); Score().hurt(S, 2.5 * T.strainDamage); S.ev.push(['beadBite', o.x, o.y]); } }
    }
  },
  burned(S, h, o, gr) { S.ev.push(['beadDie', o.x, o.y]); Op().finishObj(S, o, h, gr, 40, 'cautery'); },
});
// a nest: find it with Sonar, slash its shell, pull it with Forceps
def('nest', {
  strain: true, sings: true, r: 8, hazard: .3, worth: 150, prio: 1,
  init(o) { G.mkPull(o, { depth: 14, ang: -1.2 }); o.shellOff = false; o.req = true; if (o.hidden === undefined) o.hidden = true; },
  ghost: o => ({ k: 'nest', x: o.x, y: o.y }),
  accept: (o, t) => t === 'scalpel' && !o.shellOff ? 'Slash' : t === 'forceps' && o.shellOff ? 'Pull' : null,
  slashed(S, h, o) { if (o.shellOff) return; o.shellOff = true; o.hidden = false; S.ev.push(['nestOpen', o.x, o.y]); Score().award(S, h, o.x, o.y, 'Clean', 60); },
  onDone(S, h, o) { o.gone = true; S.ev.push(['strainHit', o.x, o.y]); },
});
})();
