import { load } from '../lib/vm.mjs';
import { test, check, done } from '../lib/t.mjs';
import { readFileSync } from 'node:fs';
const ctx = load(), SN = ctx.SN, V = SN.V;
await test('frames', () => {
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, F = [Math.cos(a), Math.sin(a), 0], fr = SN.frame(F); check(Math.abs(V.dot(fr.R, F)) < 1e-9 && Math.abs(fr.R[0] - -Math.sin(a)) < 1e-9 && Math.abs(fr.R[1] - Math.cos(a)) < 1e-9, 'right = heading + 90 deg at ' + k, fr.R); }
  check(SN.frame([1, 0, 0], [0, 0, 1], .3).R[2] < 0, 'positive bank lowers the right edge');
});
await test('tracks', () => {
  const expect = { solenne: [3.84], karakum: [4.59, 24.5], meridian: [4.18, 31.9], borealis: [5.03] };
  for (const id of SN.TRACK_IDS) {
    const T = SN.getTrack(id), st = T.stats();
    check(Math.abs(st.km - expect[id][0]) / expect[id][0] < .01, id + ' length', st.km);
    if (expect[id][1]) check(st.overpasses.length && Math.abs(Math.max(...st.overpasses) - expect[id][1]) < 1, id + ' overpass clearance', st.overpasses);
    const a = T.point(0), b = T.point(T.L - 1); check(V.dist(a, b) < 4, id + ' closes on itself', V.dist(a, b));
    let bad = 0; for (let i = 0; i < T.n; i++) if (Math.abs(T.lineU[i]) > T.hw[i]) bad++; check(!bad, id + ' racing line inside the walls', bad);
    let over = 0; for (const c of SN.CLASSES) for (let i = 0; i < T.n; i++) if (T.profiles[c.id][i] > c.top * 1.02) over++; check(!over, id + ' speed profile <= top', over);
    check(T.pads.length > 5 && T.speedPads.length >= 5 && T.weaponPads.length >= 12, id + ' pads', T.pads.length);
    check(T.grid.length === 8 && T.sectors.length === 8, id + ' grid and sectors');
    // bank sign: in a right turn the right edge is lower
    let checked = 0, wrong = 0; for (let i = 0; i < T.n; i += 7) { if (T.kind[i] || Math.abs(T.bank[i]) < .1) continue; checked++; const f = T.frameAt(i * T.ds), r = f.C[2] + f.R[2] * 100, l = f.C[2] - f.R[2] * 100; if ((T.bank[i] > 0) !== (r < l)) wrong++; } check(checked > 5 && !wrong, id + ' bank sign', { checked, wrong });
    // locate is local: from the upper deck of an overpass it stays there
    for (const o of T.overpasses) { const s = o.upper * T.ds, P = T.point(s, 0, 14), q = T.locate(P, s); check(Math.abs(SN.wrapDiff(s, q.s, T.L)) < 64, id + ' locate stays on the upper deck', q.s); }
  }
});
await test('tune', () => { const T = SN.Tune; T.T.topSpeedMul = 1.5; T.T.camFov = 90; T.reset(); check(T.order.every(k => T.T[k] === T.defs[k].def), 'reset all restores defaults'); check(T.order.length >= 35, 'the sliders', T.order.length); });
await test('replay pack', () => { const c = { steer: -.5, pitch: .25, thrust: 1, brakeL: .5, brakeR: 0, fire: 1, firePressed: 1, fireReleased: 0, absorb: 0, shiftL: 1, shiftR: 0, flick: -1, analog: true }, u = SN.Replay.unpack(SN.Replay.pack(c)); check(Math.abs(u.steer + .5) < .01 && u.thrust === 1 && u.fire && u.shiftL && u.flick === -1 && u.analog && Math.abs(u.brakeL - .5) < .01, 'pack round trip', u); });
await test('hash', () => { check(SN.hashNumbers([1, 2, 3]) === SN.hashNumbers([1, 2, 3]) && SN.hashNumbers([1, 2, 3]) !== SN.hashNumbers([1, 2, 4]), 'hash stable and sensitive'); });
await test('field', () => { const f = SN.field([{ team: 'kestrel', pilot: 'ingrid' }]); check(f.length === 8 && f.some(e => e.pilot === 'kaizero') && f.some(e => e.pilot === 'tomas') && new Set(f.map(e => e.team)).size === 6, 'field: 8, rival, teammate, every team', f.map(e => e.pilot)); });
await test('lint', () => {
  const man = JSON.parse(readFileSync(new URL('../../src/manifest.json', import.meta.url), 'utf8'));
  for (const f of ['20-track.js', '25-ship.js', '30-weapons.js', '35-ai.js', '40-race.js', '45-replay.js']) { const s = readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8'); check(!/Math\.random|Date\.now|performance\.now/.test(s), 'sim file has no wall clock or Math.random: ' + f); }
  for (const f of man) { const s = readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8'); check(!/(^|[^.\w])(alert|confirm|prompt)\(|window\.(open|alert|confirm|prompt)/.test(s), 'no dialogs: ' + f); check(!/\b(TODO|FIXME)\b/.test(s), 'no TODO: ' + f); }
});
await test('input mapping', () => {
  const g = ctx.My3D2dge.current, I = g.input; g.advance(.1);
  I.hold('steerR'); const c1 = SN.Input.controls(0); check(c1.steer === 1 && !c1.analog, 'keys steer digitally (ramped in the ship)'); I.hold('steerR', false);
  SN.Input.reset(); I.tap('brakeL'); g.advance(1 / 120); SN.Input.controls(0); g.advance(.1); I.tap('brakeL'); g.advance(1 / 120); const c2 = SN.Input.controls(0); check(c2.shiftL === 1, 'double-tap Q side-shifts', c2);
});
done();
