// dev: every page opens; the cheats do what they say; the sliders change B.T live; Reset page and Reset all
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  let M = loadYard(t, { guards: [{ id: 'g', type: 'ashigaru', at: [12, 11], facing: 180, mode: 'patrol', route: [[12, 11, 0], [20, 11, 0]] }] }), h = M.hero;
  let ok = true; for (let p = 0; p < 8; p++) { try { B.Dev.page = p; B.Dev.show(); } catch (e) { ok = false; } } check('every dev page opens', ok && B.ui.screen === 'dev', B.ui.screen); B.ui.hide();
  game.debug.cheat('god'); const hp = h.hp; B.damage(null, h, 50, {}); check('god mode', h.hp === hp, h.hp); game.debug.cheat('god', false);
  game.debug.cheat('invisible'); check('invisible to guards', B.Perception.exposure(h, M) === 0, ''); game.debug.cheat('invisible', false);
  game.debug.cheat('noclip'); game.debug.teleport(C(2), C(6), 0); t.intent({ move: [1, 0] }, 1); check('no-clip walks through walls', h.x > C(5), h.x / 16); game.debug.cheat('noclip', false);
  game.debug.cheat('infinite'); h.bento = [{ tool: 'shuriken', n: 1 }, null, null, null, null, null, null, null]; h.sel = 0; t.intent({ usePressed: true }, 1 / 120); t.step(.3); check('infinite tools', h.bento[0].n === 1, h.bento[0].n); game.debug.cheat('infinite', false);
  game.debug.cheat('oneHit'); const g = M.guards[0]; game.debug.teleport(g.x - 14, g.y, 0, 0); g.mind.level = 1.2; g.mind.update(.01, false, h); t.intent({ attackPressed: true }, 1 / 120); t.intent({}, .5); check('one-hit kills', !g.alive, g.hp); game.debug.cheat('oneHit', false);
  M = loadYard(t, { guards: [{ id: 'g', type: 'ashigaru', at: [12, 11], mode: 'patrol', route: [[12, 11, 0], [20, 11, 0]] }] }); const g2 = M.guards[0]; game.debug.cheat('freezeAI'); const x0 = g2.x; t.step(2); check('freeze AI', g2.x === x0, g2.x - x0); game.debug.cheat('freezeAI', false);
  game.debug.cheat('reveal'); game.debug.teleport(C(27), C(21), 0); t.step(.2); check('reveal all enemies', g2.vis === 'visible', g2.vis); game.debug.cheat('reveal', false);
  game.debug.tune('heroRun', 120); check('a slider changes B.T live', B.T('heroRun') === 120, B.T('heroRun'));
  game.debug.teleport(C(2), C(11), 0, 0); t.intent({ move: [1, 0] }, .4); const x1 = M.hero.x; t.intent({ move: [1, 0] }, .5); check('the hero runs faster at once', (M.hero.x - x1) / .5 > 110, (M.hero.x - x1) / .5);
  game.settings.set('sightRange', 150); for (const k of ['heroRun', 'heroSneak']) game.settings.set(k, B.tuneDefault(k)); check('Reset page (Hero) restores its sliders', B.T('heroRun') === 85, B.T('heroRun'));
  game.debug.resetTune(); check('Reset all restores every slider', B.T('sightRange') === 112 && B.TUNE.every(r => game.settings[r[0]] === r[1]), B.T('sightRange'));
  check('dev settings stay off the player\'s Settings', B.TUNE.every(r => game.settings.spec(r[0]).group === 'Dev'), '');
}
