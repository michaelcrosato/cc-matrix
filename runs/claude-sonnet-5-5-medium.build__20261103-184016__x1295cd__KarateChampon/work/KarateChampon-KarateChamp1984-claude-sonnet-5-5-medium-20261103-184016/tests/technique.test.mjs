import { fresh, fightBout, run } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC } = G, Tn = KC.TUNE, S = KC.test;
  const hitAt = (id, gap, ids = ['taro', 'ebi'], setup) => {
    const b = fightBout(G, ids); const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + 18 + gap; a.frozen = d.frozen = false; if (setup) setup(a, d, b);
    a.start(id, d, 'n', 'r'); let hit = null; b.on('point', p => { hit = p; }); let n = 0; while ((a.tech || b.pending) && n++ < 500) { b.fightStep(); if (b.phase !== 'fight') break; } return { hit, b, a, d, n };
  };
  // frame totals (in 120 Hz steps)
  for (const tc of KC.TECH.filter(x => !x.util)) {
    const b = fightBout(G); const a = b.f[0]; a.x = 150; b.f[1].x = 300; a.frozen = false; a.start(tc.id, b.f[1], 'n', 'r'); const exp = tc.f.map(f => f * 2); let n = 0; a.fr[1] === exp[1] || 0;
    t.check(`${tc.id} frames match the table`, a.fr.every((v, i) => Math.abs(v - exp[i]) <= 1), a.fr.join(',') + ' vs ' + exp.join(','));
  }
  // measured reach: the largest starting gap that still hits, against a standing dummy (the gap at contact = start gap minus the body's travel), within 4 u of the table
  for (const tc of KC.SCORING.filter(x => !x.air)) {
    let best = -1; for (let g = 0; g <= 130; g += 1) { const r = hitAt(tc.id, g, ['taro', 'ebi']); if (r.hit) best = g; }
    const want = tc.reach[1] + Math.max(0, tc.travel); t.check(`${tc.id} contact gap ${best} within 4 of ${want}`, Math.abs(best - want) <= 4, best);
  }
  // air techniques hit at a distance and land
  for (const id of ['jumpSide', 'jumpBack']) { let best = -1; for (let g = 0; g <= 130; g += 2) if (hitAt(id, g).hit) best = g; t.check(`${id} hits at some gap`, best >= 20, best); }
  // height rules
  { const r = hitAt('roundKick', 10, ['taro', 'ebi'], (a, d, b) => { d.crouching = true; b.in[1].posture = 'd'; }); t.check('high techniques whiff against a crouching foe', !r.hit); }
  { const r = hitAt('lowKick', 10, ['taro', 'ebi'], (a, d) => { d.z = 20; d.vz = 0; d.air = true; d.tech = KC.TECHS.jump; d.state = 'tech'; d.t = 30; d.fr = [8, 78, 10]; }); t.check('low techniques whiff against an airborne foe', !r.hit); }
  { const r = hitAt('squatPunch', 14, ['taro', 'ebi'], (a, d, b) => { d.crouching = true; b.in[1].posture = 'd'; }); t.check('squatPunch hits a crouching foe', !!r.hit); }
  { const r = hitAt('frontKick', 10, ['taro', 'ebi'], (a, d, b) => { d.crouching = true; b.in[1].posture = 'd'; }); t.check('mid techniques whiff against a crouching foe', !r.hit); }
  { const r = hitAt('upperPunch', 8, ['taro', 'ebi'], (a, d) => { d.z = 20; d.vz = 100; d.air = true; d.tech = KC.TECHS.jump; d.state = 'tech'; d.t = 30; d.fr = [8, 78, 10]; }); t.check('upperPunch hits an airborne foe (anti-air)', !!r.hit); }
  { const r = hitAt('frontKick', 10, ['taro', 'ebi'], (a, d) => { d.z = 30; d.vz = 0; d.air = true; d.tech = KC.TECHS.frontFlip; d.state = 'tech'; d.t = 30; d.fr = [12, 80, 24]; }); t.check('mid techniques pass under a somersault', !r.hit); }
  // block: high and mid blocked, low not; attacker recoil
  { const r = hitAt('roundKick', 10, ['taro', 'ebi'], (a, d, b) => { d.start('block', a, 'n', null); d.t = 6; }); t.check('block stops a high technique', !r.hit && r.b.stats[1].blocks === 1, JSON.stringify(r.hit)); t.check('blocked attacker gets +20 steps of recoil', r.a.recoil >= 20 || !r.a.tech, r.a.recoil); }
  { const r = hitAt('frontKick', 10, ['taro', 'ebi'], (a, d) => { d.start('block', a, 'n', null); d.t = 6; }); t.check('block stops a mid technique', !r.hit); }
  { const r = hitAt('lowKick', 10, ['taro', 'ebi'], (a, d) => { d.start('block', a, 'n', null); d.t = 6; }); t.check('block cannot stop a low technique', !!r.hit); }
  { const r = hitAt('frontSweep', 10, ['taro', 'ebi'], (a, d) => { d.start('block', a, 'n', null); d.t = 6; }); t.check('block cannot stop a sweep', !!r.hit && r.hit.pts > 0); }
  // quality to points: golden cases through directorQ
  const pts = (id, q, setup) => { const b = fightBout(G); const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + 18 + 10; a.frozen = d.frozen = false; b.directorQ = q; if (setup) setup(a, d); a.start(id, d, 'n', 'r'); let hit = null; b.on('point', p => { hit = p; }); let n = 0; while ((a.tech || b.pending) && n++ < 400) { b.fightStep(); if (b.phase !== 'fight') break; } return hit; };
  { const h = pts('roundKick', 1); t.check('clean round kick is 600 FULL', h && h.pts === 600 && h.full, JSON.stringify(h && [h.pts, h.full])); }
  { const h = pts('roundKick', .5); t.check('q .5 round kick is 500 HALF', h && h.pts === 500 && !h.full, JSON.stringify(h && [h.pts, h.full])); }
  { const h = pts('roundKick', .15); t.check('q .15 round kick is 300 HALF', h && h.pts === 300 && !h.full, JSON.stringify(h && [h.pts, h.full])); }
  { const h = pts('upLunge', .15); t.check('upper lunge punch at q .15 still 600 FULL', h && h.pts >= 600 && h.full, JSON.stringify(h && [h.pts, h.full])); }
  { const h = pts('frontKick', 1, (a, d) => { d.start('lowKick', a, 'n', 'd'); d.t = 40; d.fr = [20, 10, 56]; }); t.check('clean front kick counter is 400 HALF', h && h.pts === 400 && !h.full && h.counter, JSON.stringify(h && [h.pts, h.full, h.counter])); }
  { const h = pts('backKick', 1, (a, d) => { d.start('lowKick', a, 'n', 'd'); d.t = 40; d.fr = [20, 10, 56]; }); t.check('clean back kick counter is 800 FULL', h && h.pts === 800 && h.full && h.counter, JSON.stringify(h && [h.pts, h.full, h.counter])); }
  // fullAt is live: raising it turns a full point into a half
  { Tn.fullAt = 700; const h = pts('roundKick', 1); t.check('fullAt slider changes full vs half', h && !h.full, JSON.stringify(h && [h.pts, h.full])); Tn.fullAt = 600; }
  // aiuchi: both land within 6 steps
  { const b = fightBout(G); const a = b.f[0], d = b.f[1]; a.x = 190; d.x = 218; a.frozen = d.frozen = false; a.start('roundKick', d, 'n', 'r'); d.start('roundKick', a, 'n', 'l'); let nop = false, pt = false; b.on('aiuchi', () => { nop = true; }); b.on('point', () => { pt = true; }); for (let i = 0; i < 200 && b.phase === 'fight'; i++) b.fightStep(); t.check('simultaneous hits are aiuchi, no point', nop && !pt && b.pts[0] === 0 && b.pts[1] === 0); }
  // spins end facing the foe; flips cross over
  for (const id of ['backKick', 'turnBackKick', 'backRound', 'backSweep']) { const b = fightBout(G); const a = b.f[0]; a.x = 150; b.f[1].x = 260; a.frozen = false; a.start(id, b.f[1], 'n', 'l'); let n = 0; while (a.tech && n++ < 400) a.step(b.f[1], null); t.check(`${id} ends facing the foe`, a.face === 1 && a.state === 'free', a.face); }
  { const b = fightBout(G); const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + 18 + 60; a.frozen = false; a.start('frontFlip', d, 'u', 'u'); let crossed = false, n = 0; while (a.tech && n++ < 400) { a.step(d, null); b.separate(); if (a.x > d.x) crossed = true; } t.check('front somersault crosses a foe at gap 60', crossed, a.x); }
  { const b = fightBout(G); const a = b.f[0]; a.x = 200; b.f[1].x = 300; a.frozen = false; const x0 = a.x; a.start('backRoll', b.f[1], 'd', 'l'); let n = 0; while (a.tech && n++ < 400) a.step(b.f[1], null); t.check('back roll travels about 90 away', Math.abs((x0 - a.x) - 90) < 6, x0 - a.x); }
  { const b = fightBout(G); const a = b.f[0]; a.x = 200; b.f[1].x = 330; a.frozen = false; const x0 = a.x; a.start('frontFlip', b.f[1], 'u', 'u'); let n = 0; while (a.tech && n++ < 400) a.step(b.f[1], null); t.check('front somersault travels about 95', Math.abs((a.x - x0) - 95) < 8, a.x - x0); }
  { const b = fightBout(G); const a = b.f[0]; a.x = 200; b.f[1].x = 330; a.frozen = false; a.start('jump', b.f[1], 'u', null); let n = 0, apex = 0; while (a.tech && n++ < 400) { a.step(b.f[1], null); apex = Math.max(apex, a.z); } t.check('jump apex about 59 and 39 frames of air', Math.abs(apex - 59) < 5 && n > 70 && n < 100, apex + ' ' + n); }
  // tuning sliders change play: walk speed
  { const b = fightBout(G); const a = b.f[0]; a.x = 100; b.f[1].x = 330; a.frozen = false; Tn.walk = 100; for (let i = 0; i < 120; i++) a.step(b.f[1], { posture: 'r', tech: null }); const far = a.x - 100; Tn.walk = 72; const c2 = fightBout(G); const a2 = c2.f[0]; a2.x = 100; c2.f[1].x = 330; a2.frozen = false; for (let i = 0; i < 120; i++) a2.step(c2.f[1], { posture: 'r', tech: null }); t.check('walk slider changes walking speed', far > (a2.x - 100) * 1.3, far + ' vs ' + (a2.x - 100)); }
};
