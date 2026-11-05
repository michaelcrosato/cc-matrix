// silentcut: every kind from its geometry and not outside it; never on an alert guard or a boss; counters and score;
// time restored after the slow motion; both characters' choreographies run to the end
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const SC = B.SilentCut, guard = (o = {}) => Object.assign({ id: 'g', type: 'ashigaru', at: [20, 11], facing: 0, mode: 'post' }, o);
  const setup = (o, char = 'sojiro') => { const M = loadYard(t, { guards: [guard(o)] }, { char }); const g = M.guards[0]; g.mode = 'stand'; return [M, M.hero, g]; };
  const place = (h, g, ang, d, z = 0) => { game.debug.teleport(g.x + Math.cos(ang) * d, g.y + Math.sin(ang) * d, z); h.facing = ang + Math.PI; };
  let [M, h, g] = setup(); place(h, g, Math.PI, 14); let c = SC.find(h, M); check('behind and close: Back', c && c.kind === 'back', c && c.kind);
  place(h, g, Math.PI, 30); c = SC.find(h, M); check('behind but too far: none', !c, c && c.kind);
  place(h, g, Math.PI / 2, 14); c = SC.find(h, M); check('at its side, calm: Side', c && c.kind === 'side', c && c.kind);
  place(h, g, 0, 14); c = SC.find(h, M); check('in front of an awake guard: none', !c, c && c.kind);
  g.asleep = true; c = SC.find(h, M); check('in front of a sleeping guard: Front', c && c.kind === 'front', c && c.kind); g.asleep = false;
  g.mind.level = 1.2; g.mind.update(1 / 120, false, h); place(h, g, Math.PI, 14); c = SC.find(h, M); check('never on an alert guard', !c, g.mind.state);
  // from above: on the townhouse roof (8..10 x 4..6, h 40), a guard just south of it
  [M, h, g] = setup({ at: [9, 8], facing: 90 }); game.debug.teleport(C(9), C(6) + 4, 40); t.step(.05); c = SC.find(h, M); check('on a roof over a guard: From above', c && c.kind === 'above', c && c.kind + ' z' + h.z);
  // the undertow: swimming beside a guard on the bank of the pond (4..9 x 14..18)
  [M, h, g] = setup({ at: [7, 19], facing: 90 }); game.debug.teleport(C(7), C(18) - 2, 0); t.intent({ move: [0, .01] }, .2); c = SC.find(h, M); check('from the water beside the bank: Undertow', h.swim && c && c.kind === 'undertow', (h.swim ? 'swim ' : 'dry ') + (c && c.kind));
  // a boss is never a victim
  const boss = B.Bosses.spawn({ id: 'gonroku', at: [24, 11] }, M); M.bosses.push(boss); game.debug.teleport(boss.x - 14, boss.y, 0); h.facing = 0; c = SC.find(h, M); check('never on a boss', !c || c.victim !== boss, c && c.victim.id);
  // a cut runs: counter, score, time restored, both characters
  for (const ch of ['sojiro', 'kaede']) {
    [M, h, g] = setup({}, ch); place(h, g, Math.PI, 14); t.intent({ attackPressed: true }, 1 / 120);
    check(ch + ': the cut starts its choreography', h.action && /^cut_back_/.test(h.action.name), h.action && h.action.name);
    check(ch + ': time slows', game.timeScale < 1, game.timeScale);
    t.intent({}, 3);
    check(ch + ': the choreography ends, the guard falls', !h.action && !g.alive, (h.action && h.action.name) + ' alive ' + g.alive);
    check(ch + ': counted', M.stats.silentCuts === 1, M.stats.silentCuts);
    check(ch + ': time back to normal', game.timeScale === 1, game.timeScale);
  }
  M.objectives = []; const sc = B.Score.story(M, 300); check('a Silent Cut scores 150', sc.parts.find(p => p[0] === 'Silent Cuts')[1] === 150, JSON.stringify(sc.parts));
  // every kind's choreography runs to the end for both
  for (const k of ['side', 'front', 'above', 'undertow']) for (const ch of ['sojiro', 'kaede']) { const s = B.SilentCut; [M, h, g] = setup({}, ch); place(h, g, Math.PI, 14); s.run(h, k, g, M); t.intent({}, 3); check(k + ' (' + ch + ') runs to the end', !h.action && !g.alive, h.action && h.action.name); }
}
