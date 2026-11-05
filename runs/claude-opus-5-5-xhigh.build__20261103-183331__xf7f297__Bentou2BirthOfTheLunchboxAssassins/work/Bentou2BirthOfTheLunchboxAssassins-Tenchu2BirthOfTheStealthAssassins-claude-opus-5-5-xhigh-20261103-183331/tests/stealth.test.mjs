// stealth: the stealth model in a real level (Rice and Ash), at the guard whose view has the most light contrast: standing
// in its lantern light gets you caught, crouching in its shadow does not; creeping behind it is silent, running is heard;
// an alerted samurai runs for the alarm bell
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  t.load('m1', { mode: 'story', character: 'sojiro' }); B.Cutscene.clear(); t.step(.5);
  const M = B.M, h = M.hero, W = M.world;
  const spots = g => { const cf = Math.cos(g.facing), sf = Math.sin(g.facing), at = (d, lat) => ({ x: g.x + cf * d - sf * lat, y: g.y + sf * d + cf * lat, d });
    const flat = p => [0, 8, 16, 24].every(k => Math.abs(W.map.groundAt(p.x - sf * k, p.y + cf * k) - g.z) < 1) && Math.abs(W.map.groundAt(p.x, p.y) - g.z) < 1;
    const pick = (d0, d1, better) => { let best = null; for (let d = d0; d <= d1; d += 6) for (const lat of [-18, -9, 0, 9, 18]) { const p = at(d, lat); if (!flat(p)) continue; p.l = W.lightAt(p.x, p.y, g.z); if (!best || better(p.l, best.l)) best = p; } return best; };
    const lit = pick(50, 70, (a, b) => a > b), dark = pick(80, 120, (a, b) => a < b); let back = null;
    for (const lat of [0, -10, 10, -20, 20]) { const p = at(-30, lat); p.z = g.z; if (flat(p) && W.map.ray(g, p, { eye: 20, target: 4 }).clear && (B.SURF_NOISE[W.surface(p.x, p.y, g.z)] || 1) >= 1) { back = p; break; } }
    return lit && dark && back ? { lit, dark, back, side: [-sf, cf], score: lit.l - dark.l } : null; };
  const cand = M.guards.filter(x => x.alive && !x.asleep && x.mind && (x.type === 'ashigaru' || x.type === 'samurai') && !W.hallAt(x.x, x.y)).map(x => [x, spots(x)]).filter(c => c[1]).sort((a, b) => b[1].score - a[1].score);
  if (!check('a guard with lantern light and shadow in its view, and open ground behind it', cand.length > 0, '')) return;
  const [g, S] = cand[0]; g.mode = 'stand'; const gx = g.x, gy = g.y, gf = g.facing;
  const steps = []; B.on('noise', e => { if (e.kind === 'step') steps.push([Math.round(e.loud), Math.round(Math.hypot(e.x - g.x, e.y - g.y, (e.z || 0) - (g.z || 0))), W.map.ray(g, e, { eye: 20, target: 4 }).clear ? 'open' : 'muffled']); });
  const trial = (p, crouch, secs, move) => { g.mind.reset(); g.target = null; Object.assign(g, { x: gx, y: gy, facing: gf }); steps.length = 0;
    game.debug.teleport(p.x, p.y, W.map.groundAt(p.x, p.y), gf + Math.PI); h.crouch = crouch; let tA = null, peak = 0;
    for (let k = 0; k < secs * 20; k++) { B.testIntent = move ? { move } : {}; game.advance(.05); B.testIntent = null; h.crouch = crouch; peak = Math.max(peak, g.mind.level); if (tA === null && g.mind.state === 'alert') tA = (k + 1) * .05; }
    return { tA, peak, state: g.mind.state, steps: steps.length }; };
  let r = trial(S.lit, false, 3); check('standing in a guard\'s lantern light 50 px ahead: alerted within 3 s', r.tA !== null && S.lit.l > S.dark.l + .15, JSON.stringify(r) + ' light ' + S.lit.l.toFixed(2));
  r = trial(S.dark, true, 5); check('crouched in its shadow 80-120 px ahead: never suspicious in 5 s', r.peak < .2 && r.state === 'calm', JSON.stringify(r) + ' light ' + S.dark.l.toFixed(2));
  r = trial(S.back, true, 1, S.side); check('creeping 30 px behind it: no step noise, it stays calm', r.steps === 0 && r.state === 'calm', JSON.stringify(r));
  r = trial(S.back, false, .7, S.side); check('running 30 px behind it: its steps are heard', r.steps > 0 && r.peak > .5, g.id + ' ' + JSON.stringify(r) + ' ' + JSON.stringify(steps));
  // the floor sets how far a running step carries: tatami muffles it, gravel throws it further
  const loudOn = kind => {   // run across a patch of that floor at full speed; the loudest step that lands on it
    const run = []; const off = B.on('noise', e => { if (e.kind === 'step' && W.surface(e.x, e.y, e.z) === kind) run.push(e.loud); });
    let best = null;
    for (let cy = 0; cy < W.map.h && best === null; cy++) for (let cx = 0; cx < W.map.w && best === null; cx++) {
      const x = (cx + .5) * 16, y = (cy + .5) * 16, z = W.map.groundAt(x, y); if (W.surface(x, y, z) !== kind) continue;
      const dir = [[1, 0], [0, 1], [-1, 0], [0, -1]].find(([dx, dy]) => [1, 2, 3].every(k => W.surface(x + dx * 16 * k, y + dy * 16 * k, z) === kind && Math.abs(W.map.groundAt(x + dx * 16 * k, y + dy * 16 * k) - z) < 1));
      if (!dir) continue; g.mind.reset(); run.length = 0; game.debug.teleport(x, y, z, 0); h.crouch = false;
      for (let k = 0; k < 14; k++) { B.testIntent = { move: dir }; game.advance(.05); B.testIntent = null; }
      if (run.length) best = Math.max(...run);
    }
    off(); return best; };
  const qt = loudOn('tatami'), qg = loudOn('gravel'), qe = loudOn('paving') || loudOn('earth');
  check('the floor sets a running step\'s reach: tatami < paving or earth < gravel', qt !== null && qg !== null && qe !== null && qt < qe && qe < qg, 'tatami ' + qt + ' · paving/earth ' + qe + ' · gravel ' + qg);
  g.mind.reset(); const home = M.level.hero.at, hx = (home[0] + .5) * 16, hy = (home[1] + .5) * 16; game.debug.teleport(hx, hy, W.map.groundAt(hx, hy));
  let bell = 0; B.on('bell', () => bell++); const sam = M.guards.find(x => x.alive && x.type === 'samurai'); game.debug.alert(sam.id); t.step(14);
  check('an alerted samurai rings the alarm bell within 14 s', bell > 0, sam.id);
}
