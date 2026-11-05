// Systems and smoke tests (loaded by headless.mjs). One line per check.
export default async function ({ ctx, game, I, snap, check, run, W }) {
  const G = ctx; const ev = s => vmEval(s); function vmEval(s) { return (0, eval)('void 0') || ctx.__eval(s); }
  // expose the IIFE's internals through the debug handle
  const T = W.game.debug, S = () => T.state();
  run('cipher', () => {
    const r = ctx.__wiretap.rot; if (!r) { check('cipher hook', false, 'no rot'); return; }
    const perm = [0,1,2,3,4,5,6,7,8,9].map(d => r(d, 1)); check('CW is a permutation', new Set(perm).size === 10, perm);
    check('CW then CCW is identity', [0,1,2,3,4,5,6,7,8,9].every(d => r(r(d, 1), 3) === d));
    check('CW encode table', perm.join('') === '0741852963', perm.join(''));
    const dec = ctx.__wiretap.decodeWith; check('page m1 decodes to P2 (555-0143)', dec('555-0781', 3) === '555-0143', dec('555-0781', 3));
    check('flip page decodes the other way', dec('555-0329', 1) === '555-0143', dec('555-0329', 1));
  });
  run('beats', () => {
    const ids = ctx.__wiretap.ORDER; let bad = [];
    for (const id of ids) { const before = game.errors.length; try { T.jump(id); game.advance(2.5); } catch (e) { bad.push(id + ': ' + e.message); } if (game.errors.length > before) bad.push(id + ': ' + game.errors.slice(before).map(e => e.where + ' ' + e.message).join(' / ')); }
    check('every beat enters and runs 2.5 s without errors (' + ids.length + ' beats)', !bad.length, bad.slice(0, 6).join(' | '));
  });
  run('ledger', () => {
    T.jump('e1.photos'); game.advance(2); const M = ctx.__wiretap.Mission.M; M.sim.rate = .4;
    for (let i = 0; i < 60; i++) { game.advance(10); if (!M.sim.ledgerOK()) break; }
    check('corner ledger holds over 10 min (sold ' + M.sim.L.sold + ', $' + M.sim.L.taken + ')', M.sim.ledgerOK() && M.sim.L.sold > 0, JSON.stringify(M.sim.L) + ' vials ' + M.sim.vials);
    M.sim.shut('test', 9999); M.sim.manual = true; const s0 = M.sim.sales; game.advance(30); check('a shutdown freezes sales', M.sim.sales - s0 <= 1, M.sim.sales - s0);
  });
  run('perception', () => {
    T.jump('e1.photos'); game.advance(2); const W2 = ctx.__wiretap, M = W2.Mission.M, P = M.P, o = M.sim.crew.find(a => a.crewId === 'dink'), C = W2.Cam;
    const test = (d, opts, cam) => { for (const x of M.observers) { x.minds = {}; x.knows.clear(); } P.burnedUntil = 0; opts = Object.assign({ blending: false, still: 0, crouch: false, cover: null }, opts); o.locked = true; C.forceOn = !!cam; C.target = cam ? o : null; let t = 0;
      while (t < 30) { P.place(o.x, o.y - d); P.locked = true; o.facing = -Math.PI / 2; o.faceGoal = null; Object.assign(P, opts); game.advance(.25); t += .25; if (o.minds[P.id] && o.minds[P.id].state === 'alert') break; }
      const lv = o.minds[P.id] ? o.minds[P.id].level : 0; C.forceOn = false; return [t, lv]; };
    const [stare] = test(60, {}, true); check('staring through the camera from 60 makes you in about 4 s (' + stare + ' s)', stare >= 2 && stare <= 6, stare);
    for (const x of M.observers) { x.minds = {}; x.knows.clear(); } let peak = 0; for (let t = 0; t < 6; t += .25) { P.place(o.x - 60 + t * 20, o.y - 60); Object.assign(P, { still: 0, blending: false }); o.facing = -Math.PI / 2; game.advance(.25); peak = Math.max(peak, o.minds[P.id] ? o.minds[P.id].level : 0); }
    check('walking past at 60 without watching is never noticed (peak ' + peak.toFixed(2) + ')', peak < .3, peak);
    const [blend, bl] = test(100, { blending: true, still: 5 }, false); check('blending at 100 for 30 s never makes you (level ' + bl.toFixed(2) + ')', blend >= 30, blend);
    const [loiter] = test(100, { still: 5 }, false); check('standing uncovered at 100: made within 9-20 s (' + loiter + ' s)', loiter >= 8 && loiter <= 20, loiter);
    o.locked = false; P.locked = false;
  });
  run('box', () => {
    T.jump('e2.box'); game.advance(1.5); const B = ctx.__wiretap.Box; if (!B.st) { check('box started', false); return; }
    B.st.resolve = 100; B.st.fear = 30; B.q = []; B.typer = null; B.pick('right'); B.q = []; B.typer = null; B.pick('bottom'); B.q = []; B.typer = null;
    check('lean then offer is the combo (rapport 1)', B.st.rapport === 1, JSON.stringify(B.st));
    B.st.fear = 70; B.st.over = false; B.q = []; B.pick('right'); B.q = []; B.typer = null; check('fear 80 asks for a lawyer', B.st.over === true, B.st.fear);
  });
  run('board ties', () => {   // a person keeps his role and can be tied to his phones (plan §6.1: tie Tee to P1)
    const W2 = ctx.__wiretap, B = W2.Board; W2.UI.closeAll(); W2.Director.startEpisode(4); game.advance(.5); const pins = () => W2.STATE().board.pins;
    if (pins().lieutenant !== 'tee') B.pin('lieutenant', 'tee'); const okP1 = B.pin('P1', 'tee');
    check('Tee stays Lieutenant when tied to P1 (' + JSON.stringify({ lt: pins().lieutenant, P1: pins().P1 }) + ')', okP1 && pins().lieutenant === 'tee' && pins().P1 === 'tee', JSON.stringify(pins()));
  });
  run('paper', () => {
    const P = ctx.__wiretap.Paper, st = S(); st.evidence.push({ id: 'actT', kind: 'act', act: 'payphone', place: 'P1, Gaither Market', ref: 'tee', pts: 2 }, { id: 'pgT', kind: 'page', line: 'P1', pts: 2 });
    const sc = P.score('P1', ['actT', 'pgT']); check('ACT photo + page on P1 = 4 points with a direct item', sc.ok && sc.pts === 4, JSON.stringify(sc));
    st.evidence.push({ id: 'infT', kind: 'stmt', ref: 'pockets', line: 'P2', pts: 1 }); const s2 = P.score('P2', ['infT']); check('an informant alone counts nothing', s2.pts === 0, JSON.stringify(s2));
  });
  run('versus', () => {
    ctx.__wiretap.Versus.startLocal({ humans: 1, allBots: true, minutes: 3 }); game.advance(1); const V = ctx.__wiretap.Versus;
    let t = 0; while (!V.sim.over && t < 200) { game.advance(2); t += 2; }
    check('a bots-only round ends with an outcome (' + V.sim.over + ', ev ' + Math.round(V.sim.ev) + ', $' + V.sim.netCount + ')', !!V.sim.over, JSON.stringify(V.snapshot()));
  });
  run('attract', () => {
    T.jump('e1.photos'); game.go('title'); game.advance(1); ctx.__wiretap.Globals.idle = 0; game.advance(10.5);
    check('10 s idle on the title starts attract', snap().attract === true, JSON.stringify(snap()));
    let bad = game.errors.length; game.advance(95); check('the reel runs a full loop without errors', game.errors.length === bad, game.errors.slice(bad).map(e => e.where + ': ' + e.message).join(' | '));
    I.tap('confirm'); game.advance(1); check('any input returns to the title', snap().attract === false && snap().scene === 'title', JSON.stringify(snap()));
  });
  run('flow', () => {
    const W2 = ctx.__wiretap, D = W2.Director;
    for (const path of ['A', 'B']) {
      T.jump('e1.cold'); game.advance(1.5); const seen = []; let guard = 0, last = '';
      while (guard++ < 80) {
        const b = S().beat; if (b !== last) { seen.push(b); last = b; } if (b === 'e5.credits') break;
        if (b === 'e2.paper' || b === 'e2.box') { const st = S(); if (!st.evidence.some(e => e.id === 'actF')) st.evidence.push({ id: 'actF', kind: 'act', act: 'payphone', place: 'P1, Gaither Market', ref: 'tee', pts: 2 }, { id: 'pgF', kind: 'page', line: 'P1', pts: 2 }); st.affidavit = { lines: { P1: ['actF', 'pgF'] }, nec: {}, submitted: true }; }
        if (b === 'e5.two') { S().flags.path = path; if (path === 'B') { S().flags.pigeonTrust = 80; S().meters.brass = 50; } }
        W2.UI.closeAll(); D.done({ signed: ['P1'] }); game.advance(1.2);
      }
      const want = path === 'A' ? ['e5.raid', 'e5.press', 'e5.montage'] : ['e5.count', 'e5.after', 'e5.dawn', 'e5.montage'];
      check('the Director walks the whole story on path ' + path + ' (' + seen.length + ' beats)', last === 'e5.credits' && want.every(w => seen.includes(w)) && (path === 'B' || !!S().flags.i5), seen.slice(-8).join(' > ') + ' i5=' + S().flags.i5);
    }
    T.jump('e3.wire2'); game.advance(1); S().meters.brass = 1; ctx.__wiretap.UI.closeAll(); W2.Director.shutDown(); game.advance(1.5);
    check('Brass at zero shuts the detail down', snap().scene === 'shutdown', snap().scene);
  });
  run('night', () => {
    const W2 = ctx.__wiretap; T.jump('e1.i1'); game.advance(2); const M = W2.Mission.M; let t = 0, fired = 0;
    while (t < 330 && W2.UI.top()?.id !== 'count') { game.advance(5); t += 5; W2.UI.stack.filter(x => x.id !== 'count').forEach(x => W2.UI.close(x, true)); }
    check("Tee's night reaches the 2 AM count (" + t + ' s, clock ' + M.clock.toFixed(2) + ', $' + M.sim.L.taken + ')', W2.UI.top()?.id === 'count', 'clock ' + M.clock);
  });
  run('camera after a night', () => {   // Tee's night turns the shutter off; the next mission's Cam.reset must turn it back on
    const W2 = ctx.__wiretap; W2.UI.closeAll(); T.jump('e3.van'); game.advance(2); const M = W2.Mission.M, film = W2.Cam.film;
    const a = M.sim ? M.sim.all().find(x => !x.hidden) : M.extras[0]; W2.Cam.target = a; const ph = W2.Cam.shoot(M.P, M.clock);
    check('the camera takes photos again after one of Tee\'s nights', !!ph && W2.Cam.film === film - 1, 'shot ' + JSON.stringify(ph && ph.subject) + ', film ' + film + ' -> ' + W2.Cam.film);
  });
  run('chase', () => {
    const W2 = ctx.__wiretap, Bc = ctx.__wiretap.BotCtl; W2.Globals.botCtl = new Bc(); T.jump('e2.chase'); game.advance(2); const M = W2.Mission.M, b = M.ctl, P = M.P, r = M.ppl.corey, v = game.view;
    const a = v.screenDirToGround(1, 0), c = v.screenDirToGround(0, 1), det = a[0] * c[1] - a[1] * c[0];
    const toScreen = (x, y) => [(x * c[1] - y * c[0]) / det, (a[0] * y - a[1] * x) / det];
    let t = 0; while (t < 120 && M.chase.state === 'run') {
      const d = Math.hypot(r.x - P.x, r.y - P.y), dir = d < 60 ? [(r.x - P.x) / d, (r.y - P.y) / d] : W2.Flow.dir(P, r.x, r.y), s = toScreen(dir[0], dir[1]), l = Math.hypot(s[0], s[1]) || 1;
      b.mv = [s[0] / l, s[1] / l]; b.run = P.stamina > 25 || d < 40; if (M.chase.canTackle()) b.tap('interact'); game.advance(.1); t += .1; b.tick(); }
    const caught = M.chase.state !== 'run'; b.mv = [0, 0]; let tc = 0; while (M.chase.state === 'down' && tc < 3) { b.held.add('interact'); game.advance(.1); tc += .1; }
    check('a pursuit bot catches Corey (' + t.toFixed(1) + ' s, state ' + M.chase.state + ')', caught && (M.chase.state === 'cuffed' || M.chase.state === 'down'), M.chase.state + ' at ' + t.toFixed(1));
    W2.Globals.botCtl = null;
  });
  run('errors', () => check('no errors overall', !game.errors.length, game.errors.slice(0, 8).map(e => e.where + ': ' + e.message).join(' | ')));
}
