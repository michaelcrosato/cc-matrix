// The scripted playthrough of the whole game: title, menu, the Mega Cup's prologue, the nine drills by their auto scripts,
// four cup matches played by the autopilot (the CPU brain's decisions given to the human seat as intents, set pieces by
// presses), results, saves, the victory, the third half, the credits and back to the title.
import { fresh, assert, eq } from './lib/h.mjs';
/** the autopilot: each step, the seat's player does what the CPU would, and set pieces get a player's presses */
function autopilot(L) {
  const TT = L.TT, g = L.game, scene = TT.scenes.match, orig = scene.update;
  const B = { t: 0, alt: false };
  scene.update = function (dt) {
    const m = TT.MS.m;
    if (m && !TT.MS.data.attract && !TT.MS.data.drill) {
      const s = m.seats[0], p = s && m.players[s.pid];
      B.t += dt;
      const keep = { pr: {}, hd: {}, rl: {}, _auto: true };
      if (p && m.phase === 'play') { const I = m.ai(p, dt); s.I = Object.assign(I, keep); }
      else if (s) {
        const I = s.I = Object.assign(TT.emptyIntent(), keep), S = m.setp;
        if (S && S.kind === 'scrum') { if (S.sub === 'set' && !B.set) { B.set = 1; I.pr.x = true; } if (S.sub === 'push' && B.t - (B.pt || 0) > 1 / 12) { B.pt = B.t; B.alt = !B.alt; I.pr[B.alt ? 'l1' : 'r1'] = true; } if (S.sub === 'setup') B.set = 0; }
        if (S && S.kind === 'lineout' && S.team === s.team) { if (S.sub === 'call' && S.t > .6) I.pr.x = true; if (S.sub === 'throw' && Math.abs(S.needle - .5) < .07 && S.t > .15) I.pr.x = true; }
        if (S && S.kind === 'lineout' && S.team !== s.team && S.sub === 'flight' && S.t > .55) I.pr.x = true;
        if (S && (S.kind === 'kickoff' || S.kind === 'dropout') && S.kicker === s.pid && S.t > 1) { if (S.power < .85) I.hd.ci = true; else I.rl.ci = true; }
        if (S && S.kind === 'setkick' && S.kicker === s.pid) { if (S.sub === 'place' && S.t > .3) I.pr.x = true; if ((S.sub === 'aim' || S.sub === 'power') && S.t > .3) { I.aimMove = clamp(-(S.aim + S.sway) / 20, -1, 1) * (TT.MS.ctx.aimSign || 1); if (S.power < .88) I.hd.ci = true; else I.rl.ci = true; } }
        if (S && S.kind === 'penalty' && S.team === s.team && S.t > .6) I.pr.x = true;
        if (S && S.kind === 'ruck') { if (B.t - (B.mt || 0) > 1 / 12) { B.mt = B.t; I.pr.x = true; } }
        if (m.phase === 'half' && m.phaseT > 2) I.pr.x = true;
      }
      if (s) s.kind = 'local';
    }
    return orig.call(this, dt);
  };
  // the seat's device must not overwrite the autopilot's intent
  const ri = TT.readIntent; TT.readIntent = (seat, game, m, ctx) => (TT.MS.data && !TT.MS.data.drill && seat.I && seat.I._auto) ? seat.I : ri(seat, game, m, ctx);
  void g;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const press = (L, act = 'confirm', s = .35) => { L.game.input.tap(act); L.advance(s); };
const pages = (L, until, max = 40) => { for (let i = 0; i < max && !until(); i++) press(L, 'confirm', .7); };
export const cases = {
  'the whole game: title to credits, through the Mega Cup'() {
    const L = fresh(), g = L.game, TT = L.TT, order = [];
    let last = ''; const seen = () => { const s = g.sceneName; if (s !== last) { order.push(s); last = s; } };
    const adv = s => { for (let i = 0; i < Math.round(s * 8); i++) { L.advance(1 / 8); seen(); } };
    TT.TUNE.set('halfLength', 30);
    { let n = 0; TT.newSeed = () => 7919 * ++n; }   // retries after CONTINUE pick new seeds: the same ones every run
    autopilot(L);
    adv(1); eq(g.sceneName, 'title', 'title');
    press(L, 'start'); adv(.6); eq(g.sceneName, 'menu', 'menu');
    press(L, 'confirm'); adv(.6); eq(g.sceneName, 'story', 'the prologue');
    pages(L, () => g.sceneName !== 'story'); adv(.6); eq(g.sceneName, 'training', 'TRAIN takes us to the Training Ground');
    assert(TT.Cup.s && TT.Cup.s.trained, 'the choice was TRAIN'); TT.Cup.s.seed = 2026;   // a fixed cup: the same matches every run
    // the nine drills, each by its auto script
    for (let i = 0; i < 9; i++) { g.debug.drill(i); adv(.3); const D = TT.Drills; D.autoplay = true; let t = 0; while (!D.done() && t < 90) { adv(.5); t += .5; } assert(D.done(), 'drill ' + TT.DRILLS[i].id); D.autoplay = false; }
    g.go('training', { cup: true }, { fade: 0 }); adv(.4); g.scenes.training.f.i = 9; press(L, 'confirm'); adv(.6); eq(g.sceneName, 'cup', 'to the cup');
    for (let round = 0; round < 4; round++) {
      if (round === 3) TT.cheats.god = true;
      let losses = 0;
      eq(g.sceneName, 'cup', 'the hub before round ' + (round + 1)); eq(TT.Cup.saved().round, round, 'autosaved at round ' + (round + 1));
      press(L, 'confirm'); adv(.6); eq(g.sceneName, 'story', 'the pre-match scene');
      pages(L, () => g.sceneName !== 'story'); adv(.6); eq(g.sceneName, 'join', 'join');
      press(L, 'confirm'); adv(1); eq(g.sceneName, 'match', 'the match');
      for (;;) {
        let t = 0; while (g.sceneName === 'match' && t < 600) { adv(1); t++; }
        eq(g.sceneName, 'results', 'results after round ' + (round + 1));
        L.noErrors('round ' + (round + 1));
        assert(!TT.MS.m || !TT.MS.m.counts.watchdog, 'no watchdog');
        adv(1.3); while (TT.arcade.entry) press(L, 'confirm', .2);
        const won = TT.Cup.s.round > round;
        if (process.env.TT_VERBOSE) console.log('round', round + 1, g.scenes.results.res.score, won ? 'won' : 'lost');
        press(L, 'confirm'); adv(.8);
        if (won) break;
        losses++; assert(losses < 3, 'lost round ' + (round + 1) + ' three times');
        pages(L, () => g.sceneName !== 'story'); adv(.5); eq(g.sceneName, 'continue', 'CONTINUE?');
        press(L, 'confirm'); adv(1); eq(g.sceneName, 'match', 'continued');
      }
      pages(L, () => g.sceneName !== 'story'); adv(.6);
      if (round < 3) eq(g.sceneName, 'cup', 'back to the hub');
    }
    // the final won: the victory, the third half, the credits, the title
    if (g.sceneName === 'story') { pages(L, () => g.sceneName !== 'story'); adv(.6); }
    eq(g.sceneName, 'credits', 'credits, after the victory and the third half'); assert(TT.storySeen && TT.storySeen.victory && TT.storySeen.third, 'the victory and the third half were played'); adv(2); press(L, 'confirm'); adv(1); eq(g.sceneName, 'title', 'and the title');
    assert(TT.unlocked('cup') && TT.unlocked('meg'), 'unlocks');
    for (const s of ['title', 'menu', 'story', 'training', 'match', 'cup', 'join', 'results', 'credits']) assert(order.includes(s), 'visited ' + s);
    L.noErrors('playthrough');
  }
};
