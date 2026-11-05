// unit: maths and frames, the spline, every track's data and derived numbers, the tuning registry, the input mapping,
// hashes, and the lint (no Math.random / Date.now / performance.now in the sim, no dialogs, no TODOs).
import { load } from '../lib/vm.mjs';
import { readFileSync, readdirSync } from 'node:fs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const V = SN.v, near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
  // frames: right = cross(up, forward) in the engine's axes, on 8 headings; a positive bank lowers the right edge
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, F = [Math.cos(a), Math.sin(a), 0], f = SN.frame(F); T.check('frame right is heading + 90deg (' + k + ')', near(f.R[0], Math.cos(a + Math.PI / 2)) && near(f.R[1], Math.sin(a + Math.PI / 2)) && near(f.U[2], 1), f); }
  { const f = SN.frame([1, 0, 0], [0, 0, 1], .3), C = [0, 0, 0], w = 10; T.check('bank lowers the right edge', C[2] + f.R[2] * w < C[2] - f.R[2] * w, f.R); }
  { const a = V.rot([0, 0, 0], [1, 0, 0], [0, 0, 1], .1); T.check('a positive yaw about up turns east toward south (right)', a[1] > 0, a); }
  // tracks
  const planned = { solenne: [3.84, null], karakum: [4.59, 24.5], meridian: [4.18, 31.9], borealis: [5.03, null] };
  for (const id of SN.TRACK_ORDER) {
    const Tr = SN.getTrack(id), L = Tr.L / 16 / 1000;
    T.check(id + ' length within 1%', Math.abs(L - planned[id][0]) / planned[id][0] < .01, L);
    let ok = true; try { Tr.validate(); } catch (e) { ok = e.message; } T.check(id + ' validates', ok === true, ok);
    if (planned[id][1]) T.check(id + ' overpass clearance', Tr.overpasses.length === 1 && Math.abs(Tr.overpasses[0].clearance - planned[id][1]) < 1.5, Tr.overpasses);
    else T.check(id + ' has no overpass', Tr.overpasses.length === 0, Tr.overpasses);
    const fr0 = Tr.frameAt(0), fr1 = Tr.frameAt(Tr.L - 1e-3); T.check(id + ' closes (C(L) = C(0))', V.dist(fr0.C, fr1.C) < 2, V.dist(fr0.C, fr1.C));
    let bad = 0; for (let i = 0; i < Tr.N; i++) if (Math.abs(Tr.lineU[i]) > Tr.hw[i] - 3.4 * 16) bad++; T.check(id + ' racing line inside the walls', bad === 0, bad);
    for (const c of SN.CLASS_ORDER) { const v = Tr.vprof[c]; let over = 0; for (let i = 0; i < Tr.N; i++) if (v[i] > SN.CLASSES[c].top + 1e-6) over++; T.check(id + ' ' + c + ' profile within top', over === 0, over); }
    for (const p of Tr.pads) { const k = Tr.flags[Tr.idx(p.s)]; T.check(id + ' pad ' + p.id + ' off the jumps', !(k & (SN.TFLAG.GAP | SN.TFLAG.DROP))); }
    T.check(id + ' 8 grid slots behind the line', Tr.grid.length === 8 && Tr.grid.every(g => Tr.dS(0, g.s) < 0), Tr.grid.map(g => Math.round(Tr.dS(0, g.s) / 16)));
    // locate: a point on the deck comes back as (s, u, h)
    for (const s of [100, Tr.L * .3, Tr.L * .77]) { if (Tr.flags[Tr.idx(s)] & SN.TFLAG.GAP) continue; const P = Tr.point(s, 40, 14), q = Tr.locate(P, s + 20); T.check(id + ' locate round trip at ' + Math.round(s), Math.abs(Tr.dS(s, q.s)) < 2 && Math.abs(q.u - 40) < 2 && Math.abs(q.h - 14) < 2, q); }
  }
  // overpasses: the lower deck found from below, the upper from above (query by height)
  { const Tr = SN.getTrack('karakum'), o = Tr.overpasses[0], lo = Tr.frameAt(o.sLow), q1 = Tr.query(lo.C[0], lo.C[1], lo.C[2] + 2), hi = Tr.frameAt(o.sHigh), q2 = Tr.query(hi.C[0], hi.C[1], hi.C[2] + 2);
    T.check('query finds the lower deck from below', q1 && Math.abs(q1.z - lo.C[2]) < 64, q1); T.check('query finds the upper deck from above', q2 && Math.abs(q2.z - hi.C[2]) < 64, q2); }
  // tuning
  SN.Tune.set('topSpeedMul', 1.4); T.check('Tune.set changes a value', SN.Tune.T.topSpeedMul === 1.4); SN.Tune.reset(); T.check('Tune.reset restores every default', SN.Tune.order.every(k => SN.Tune.T[k] === SN.Tune.specs[k].def));
  T.check('at least 30 live sliders', SN.Tune.order.length >= 30, SN.Tune.order.length);
  // the input mapping: ramped keys, the stick straight through, double taps, the flick
  { const I = game.input, C = new SN.Controls(I, 0); I.hold('right'); let c; for (let k = 0; k < 6; k++) c = C.read(1 / 120); T.check('keys ramp the steering (not full at once)', c.steer > 0 && c.steer < .5, c.steer); for (let k = 0; k < 60; k++) c = C.read(1 / 120); T.check('keys reach full lock', c.steer > .99, c.steer); I.hold('right', false);
    I.padMove = [-.4, 0]; c = C.read(1 / 120); T.check('the stick passes straight through', Math.abs(c.steer + .4) < 1e-9, c.steer); I.padMove = [0, 0];
    I.lastDevice = 'keyboard'; I.press('KeyQ'); game.advance(1 / 120); c = C.read(1 / 120); I.release('KeyQ'); game.advance(.05); I.press('KeyQ'); game.advance(1 / 120); c = C.read(1 / 120); I.release('KeyQ');
    T.check('a double tap of Q is a side-shift left', c.shiftL === true, c);
    I._valueOverride = { brakeL: .5 }; c = C.read(1 / 120); T.check('an analog trigger gives half an airbrake', Math.abs(c.brakeL - .5) < 1e-9, c.brakeL); I._valueOverride = null;
    const C2 = new SN.Controls(I, 1); C2.read(1 / 120); I.padMove = [-1, 0]; C2.read(1 / 120); I.padMove = [1, 0]; const f = C2.read(1 / 120); I.padMove = [0, 0]; T.check('a steer flick is a roll', f.flick === 1, f.flick); }
  // medal times: measured for every track, class and timed mode; gold < silver < bronze
  { const M = SN.MEDAL_TIMES, keys = Object.keys(M); T.check('32 measured medal sets', keys.length === 32, keys.length); T.check('medals in order', keys.every(k => M[k][0] < M[k][1] && M[k][1] < M[k][2]), keys.filter(k => !(M[k][0] < M[k][1] && M[k][1] < M[k][2]))); }
  // About: every source field, and the feedback answers in their numbers
  T.check('About answers 4 / 6 / 4 feedback questions', SN.ABOUT.testingFeedback.length === 4 && SN.ABOUT.engineFeedback.length === 6 && SN.ABOUT.promptFeedback.length === 4);
  // hashes
  T.check('hashNumbers is stable', SN.hashNumbers([1, 2.5, -3]) === SN.hashNumbers([1, 2.5, -3]) && SN.hashNumbers([1]) !== SN.hashNumbers([2]));
  // lint: the sim reads no clock and no Math.random; no dialogs anywhere; no TODO
  const ROOT = new URL('../../', import.meta.url), sim = ['00-core.js', '20-track.js', '25-ship.js', '27-collide.js', '30-weapons.js', '35-ai.js', '40-race.js', '45-replay.js'];
  for (const f of sim) { const t = readFileSync(new URL('src/' + f, ROOT), 'utf8'); T.check('lint: ' + f + ' has no Math.random / Date.now / performance.now', !/Math\.random\(|Date\.now\(|performance\.now\(/.test(t)); }
  for (const f of readdirSync(new URL('src/', ROOT)).filter(f => f.endsWith('.js'))) { const t = readFileSync(new URL('src/' + f, ROOT), 'utf8'); T.check('lint: ' + f + ' has no alert / confirm / prompt / window.open / TODO', !/(?<![.\w'])(alert|confirm|prompt)\(|window\.open|TODO|FIXME|placeholder/.test(t)); }
}
