import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC } = G, TUNE = KC.TUNE;
  const pair = (gap, ids = ['taro', 'negi']) => { const a = new KC.Karateka(ids[0], 0, { x: 150 }), b = new KC.Karateka(ids[1], 1, { x: 150 }); a.R = Object.assign({}, a.R, { stats: { walk: 1, reach: 1, speed: 1 }, signature: null }); b.R = Object.assign({}, b.R, { stats: { walk: 1, reach: 1, speed: 1 } }); b.x = a.x + (a.w + b.w) / 2 + gap; return [a, b]; };
  const B = { o: {}, arena: [-999, 999] }, check = (a, b) => KC.Bout.prototype.check.call(B, a, b);
  const run = (a, b, until) => { for (let k = 0; k < 600; k++) { a.step(1 / 120, b, [-999, 999]); b.step(1 / 120, a, [-999, 999]); const r = check(a, b); if (r) return r; if (until && until()) break; if (a.st !== 'tech') break; } return null; };
  // frame totals (ground techniques): startup + active + recovery in 120 Hz steps
  for (const id of ['frontKick', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'frontSweep', 'block', 'backRoll']) {
    const [a, b] = pair(200), T = KC.TECH[id]; a.start(id, b); let n = 0; while (a.st === 'tech' && n < 900) { a.step(1 / 120, b, [-999, 999]); n++; }
    const want = (T.kind === 'block' ? KC.U.steps(T.f[0]) + KC.U.steps(TUNE.blockWindow) + KC.U.steps(T.f[2]) : KC.U.steps(T.f[0]) + KC.U.steps(T.f[1]) + KC.U.steps(T.f[2]));
    t.check('frame total ' + id, Math.abs(n - want) <= 1, n + ' vs ' + want);
  }
  // close substitutions
  { const [a, b] = pair(8); a.start('frontKick', b); t.check('front kick close -> reverse punch', a.tech === 'revPunch', a.tech); }
  { const [a, b] = pair(14); a.start('upLunge', b); t.check('upper lunge close -> round kick', a.tech === 'roundKick', a.tech); }
  { const [a, b] = pair(6); a.start('midLunge', b); t.check('middle lunge very close -> reverse punch', a.tech === 'revPunch', a.tech); }
  // measured contact gap (the Technique Lab) within 4 u of the table (max reach + travel) for ground techniques
  for (const id of KC.SCORING) { const T = KC.TECH[id]; if (T.air) continue; const m = KC.Lab.measure(id); t.check('measured gap ' + id, m && Math.abs(m.max - m.table) <= 4, m); }
  for (const id of ['jumpSide', 'jumpBack']) { const m = KC.Lab.measure(id); t.check('air technique lands from range ' + id, m && m.max > 10, m); }
  // height rules
  { const [a, b] = pair(20); b.st = 'crouch'; a.start('roundKick', b); t.check('high whiffs on a croucher', !run(a, b)); }
  { const [a, b] = pair(20); b.st = 'crouch'; a.start('squatPunch', b); t.check('squat punch hits a croucher', !!run(a, b)); }
  { const [a, b] = pair(15); b.start('jump', a); for (let k = 0; k < 14; k++) b.step(1 / 120, a); a.start('lowKick', b); t.check('low whiffs on a jumper', !run(a, b, () => b.z <= 0)); }
  { const [a, b] = pair(8); b.start('jump', a); for (let k = 0; k < 12; k++) b.step(1 / 120, a); a.start('upperPunch', b); const r = run(a, b); t.check('upper punch hits a jumper (anti-air)', !!r && !r.block, r); }
  // block: high and mid blocked, low not; attacker recoil +10 frames
  { const [a, b] = pair(20); b.start('block', a); b.step(1 / 120, a); a.start('roundKick', b); for (let k = 0; k < a.S; k++) { a.step(1 / 120, b); } b.k = 3; b.ph = 'a'; const r = check(a, b); t.check('block stops a round kick', r && r.block, r); }
  { const [a, b] = pair(20); a.start('lowKick', b); for (let k = 0; k < a.S; k++) a.step(1 / 120, b); b.start('block', a); b.step(1 / 120, a); b.step(1 / 120, a); b.step(1 / 120, a); const r = check(a, b); t.check('low kick goes through a block', r && !r.block, r); }
  { const G2 = loadGame(), K2 = G2.KC; const a = new K2.Karateka('taro', 0, { x: 150 }), b = new K2.Karateka('negi', 1, { x: 190 }); const bout = new K2.Bout({ fighters: [a, b], intro: false }); bout.phase = 'fight'; a.x = 150; b.x = 150 + (a.w + b.w) / 2 + 20; a.st = b.st = 'idle'; a.poseName = b.poseName = null; b.start('block', a); b.step(1 / 120, a); a.start('frontKick', b); for (let k = 0; k < 40; k++) { a.step(1 / 120, b); b.step(1 / 120, a); if (a.ph === 'a') { b.k = 2; b.ph = 'a'; bout.detect(); break; } } t.check('a blocked attacker gets +10 recovery frames', a.extraR === K2.U.steps(10) && a.blocked, a.extraR); }
  // quality -> points (golden cases)
  const pts = (id, q, counter) => { const T = KC.TECH[id], [lo, hi] = T.pts; let p = Math.min(hi, Math.max(lo, lo + Math.round((hi - lo) * q / 100) * 100)); if (counter) p = Math.min(1000, Math.round(p * TUNE.counterMul / 100) * 100); return p; };
  t.check('round kick q=1 -> 600 FULL', pts('roundKick', 1) === 600); t.check('round kick q=.5 -> 500 HALF', pts('roundKick', .5) === 500 && 500 < TUNE.fullAt);
  t.check('round kick q=.15 -> 300', pts('roundKick', .15) === 300); t.check('front kick counter -> 400 HALF', pts('frontKick', 1, true) === 400);
  t.check('back kick counter -> 800 FULL', pts('backKick', 1, true) === 800); t.check('upper lunge q=.15 -> 600 FULL', pts('upLunge', .15) === 600);
  { const [a, b] = pair(29); a.start('roundKick', b); const r = run(a, b); t.check('a clean full-reach round kick scores 600', r && r.pts === 600 && r.full, r); }
  { const [a, b] = pair(20); b.start('roundKick', a); a.start('backKick', b); const r = run(a, b); t.check('a hit mid-technique is a COUNTER', r && r.counter, r); }
  // flips cross over a foe within 70
  { const [a, b] = pair(60); a.start('frontFlip', b); for (let k = 0; k < 200; k++) { a.step(1 / 120, b); } t.check('front somersault crosses over', a.x > b.x, [a.x, b.x]); }
  // spins end facing the foe
  { const [a, b] = pair(60); a.start('turnBackKick', b); for (let k = 0; k < 300 && a.st === 'tech'; k++) a.step(1 / 120, b); a.step(1 / 120, b); t.check('a spin ends facing the foe', a.face === 1); }
};
