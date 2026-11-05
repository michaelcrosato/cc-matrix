// technique: frame totals, reach (connects at the top of its band, whiffs past it), height rules, block rules, quality to
// points (golden cases), counters, aiuchi, spins end facing the foe, somersaults cross over
import { fresh, pair, tick } from './lib/util.mjs';
export default async t => {
  const { KC } = fresh();
  const run = (A, B, id, n = 200) => { A.ctlOn = true; A.startTech(id, B); let hit = null; for (let i = 0; i < n && !hit; i++) { tick(KC, A, B); hit = A.strike(B); } return hit; };
  // frame totals: a ground technique is busy for startup + active + recovery steps
  for (const id of ['frontKick', 'revPunch', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'midLunge', 'frontSweep', 'turnBackKick', 'backRound', 'backSweep', 'upperPunch', 'squatPunch', 'block', 'backRoll']) {
    const [A, B] = pair(KC, 100, 360); A.ctlOn = true; A.startTech(id, null); const T = A.fr.reduce((a, b) => a + b, 0); let n = 0; while (A.st === 'tech' && n < 400) { A.update(1 / 120, B); n++; }
    const t60 = KC.TECH[id].f.reduce((a, b) => a + b, 0) * 2;
    t.check('frames: ' + id + ' busy ' + T + ' steps (' + t60 + ' at 120 Hz)', Math.abs(n - T) <= 1 && (id === 'block' || Math.abs(T - t60) <= 3), n + ' vs ' + T);
  }
  // reach: from just inside the band's top it connects; from well past it, it whiffs (a standing dummy)
  for (const id of KC.SCORING) {
    const T = KC.TECH[id], [A0, B0] = pair(KC), band = A0.band(T);
    const place = gap => { const [A, B] = pair(KC, 100, 100); B.x = A.x + (A.w + B.w) / 2 + gap; return [A, B]; };
    let [A, B] = place(band[1] - 3); const h = run(A, B, id);
    t.check('reach: ' + id + ' connects from gap ' + (band[1] - 3), !!h && A.tech === id, A.tech);
    [A, B] = place(band[1] + 24); const w = run(A, B, id);
    t.check('reach: ' + id + ' whiffs from gap ' + (band[1] + 24), !w, w && JSON.stringify(w));
    void A0; void B0;
  }
  // height rules
  const H = KC.Karateka.heightOK, stub = { vz: 100 }, stubDown = { vz: -100 };
  t.check('high misses a croucher', !H('high', 'crouch', stub) && !H('high', 'roll', stub));
  t.check('mid misses a croucher; the squat punch hits it', !H('mid', 'crouch', stub) && H('midlow', 'crouch', stub));
  t.check('low misses a jumper and a somersault', !H('low', 'air', stub) && !H('low', 'flip', stub));
  t.check('the upper punch hits a rising jumper, not a falling one', H('rising', 'air', stub) && !H('rising', 'air', stubDown));
  t.check('a somersault: only high techniques and the upper punch', H('high', 'flip', stub) && !H('mid', 'flip', stub) && H('rising', 'flip', stub));
  t.check('jump kicks come down on crouchers', H('air', 'crouch', stub) && !H('air', 'roll', stub));
  { const [A, B] = pair(KC, 150, 150 + 18 + 24); B.ctlOn = true; B.control({ posture: 'd', press: null }); B.update(1 / 120, A); const h = run(A, B, 'roundKick'); t.check('a round kick passes over a crouch (in play)', !h); }
  // block: high and mid blocked, low not; the attacker recoils 10 frames more; the defender is free sooner
  for (const [id, blocked] of [['roundKick', true], ['frontKick', true], ['lowKick', false], ['frontSweep', false]]) {
    const [A, B] = pair(KC, 150, 150 + 18 + 20); B.ctlOn = true; B.startTech('block', A); A.ctlOn = true; A.startTech(id, B); let got = null;
    for (let i = 0; i < 80 && !got; i++) { tick(KC, A, B); const s = A.strike(B); if (s) got = B.blocks(A) ? 'block' : 'hit'; }
    t.check('block vs ' + id + ': ' + (blocked ? 'blocked' : 'not blocked'), got === (blocked ? 'block' : 'hit'), got);
    if (blocked && got === 'block') { const ex0 = A.extra; A.recoil(); B.guarded(A); t.check('a blocked ' + id + ' recoils 20 more steps; the guard ends early', A.extra === ex0 + 20 && B.phase === 'recover', A.extra + ' ' + B.phase); }
  }
  // quality to points (the golden cases)
  const P = (id, q) => KC.Bout.points(KC.TECH[id], q);
  t.check('round kick: q 1 gives 600 (full)', P('roundKick', 1) === 600);
  t.check('round kick: q .5 gives 500 (half)', P('roundKick', .5) === 500);
  t.check('round kick: q .15 gives 300', P('roundKick', .15) === 300);
  t.check('upper lunge: q .15 still 600 (full)', P('upLunge', .15) === 600);
  { const [A, B] = pair(KC); B.ctlOn = true; B.startTech('roundKick', A); const s = KC.Bout.prototype._score.call({}, A, B, { tech: 'frontKick', gap: 20, timingQ: 1, spacingQ: 1, prof: 'stand' }); t.check('a clean front kick counter: 400, a half', s.pts === 400 && !s.full && s.counter, JSON.stringify(s)); }
  { const [A, B] = pair(KC, 150, 250, 'kamaboko'); B.ctlOn = true; B.startTech('roundKick', A); const s = KC.Bout.prototype._score.call({}, A, B, { tech: 'backKick', gap: 20, timingQ: 1, spacingQ: 1, prof: 'stand' }); t.check('a clean back kick counter: 800, a full point', s.pts === 800 && s.full, JSON.stringify(s)); }
  // aiuchi: both land within 6 steps: no point
  { const [A, B] = pair(KC, 150, 150 + 18 + 22); const bout = new KC.Bout({ fighters: [A, B], seed: 3, rules: { intro: false } }); let aiuchi = false; bout.bus.on('aiuchi', () => { aiuchi = true; });
    for (let i = 0; i < 2000 && bout.phase !== 'fight'; i++) bout.update(1 / 120);
    A.x = 150; B.x = 150 + 18 + 22; A.control({ posture: 'n', press: 'r' }); B.control({ posture: 'n', press: 'l' }); bout.update(1 / 120); A.control(null); B.control(null);
    for (let i = 0; i < 120 && !aiuchi; i++) bout.update(1 / 120);
    t.check('aiuchi: simultaneous front kicks score nothing', aiuchi && bout.points[0] === 0 && bout.points[1] === 0, bout.points.join()); }
  // spins end facing the foe; a front somersault crosses over a foe within 70
  for (const id of ['backKick', 'turnBackKick', 'backRound']) { const [A, B] = pair(KC, 100, 360); A.ctlOn = true; A.startTech(id, B); for (let i = 0; i < 200 && A.st === 'tech'; i++) { A.update(1 / 120, B); A.pose(1 / 120); } for (let i = 0; i < 30; i++) A.pose(1 / 120); const ang = ((A.rig.facing % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); t.check('spin ' + id + ' ends facing the foe', Math.min(ang, 2 * Math.PI - ang) < .2, ang.toFixed(2)); }
  { const [A, B] = pair(KC, 150, 150 + 18 + 60); A.ctlOn = true; A.startTech('frontFlip', B); for (let i = 0; i < 200 && A.st !== 'idle'; i++) tick(KC, A, B); tick(KC, A, B, 2); t.check('a front somersault crosses a foe at gap 60', A.x > B.x && A.face === -1, A.x + ' ' + B.x); }
  { const [A, B] = pair(KC, 200, 300); A.ctlOn = true; A.startTech('backRoll', B); const x0 = A.x; for (let i = 0; i < 200 && A.st === 'tech'; i++) tick(KC, A, B); t.check('the back roll travels 90 back', Math.abs(x0 - A.x - 90) < 6, (x0 - A.x).toFixed(1)); }
};
