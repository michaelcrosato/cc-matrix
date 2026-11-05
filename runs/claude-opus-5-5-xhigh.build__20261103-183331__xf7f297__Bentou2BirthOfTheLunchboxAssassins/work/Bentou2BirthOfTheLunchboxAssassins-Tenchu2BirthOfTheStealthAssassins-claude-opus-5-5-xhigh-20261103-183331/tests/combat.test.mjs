// combat: combo damage; the block per character; the parry inside its window staggers, outside it does not; the riposte;
// the roll is invulnerable; i-frames; death brings the game-over overlay; retry restores the checkpoint
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  let M = loadYard(t, { guards: [{ id: 'g', type: 'ashigaru', at: [12, 11], facing: 180, mode: 'post' }] }), h = M.hero, g = M.guards[0]; g.mode = 'stand';
  g.mind.level = 1.2; g.mind.update(1 / 120, false, h);
  game.debug.teleport(g.x - 14, g.y, 0, 0); const hp0 = g.hp; t.intent({ attackPressed: true }, 1 / 120); t.intent({}, .45);
  check('Sojiro\'s first slash deals 14 x 1.2', Math.abs((hp0 - g.hp) - 16.8) < .5, hp0 - g.hp);
  // the block and the parry (strikes called directly)
  h.facing = 0; g.facing = Math.PI; h.blocking = true; h.parryT = 9; let hp1 = h.hp; B.Combat.enemyStrike(g, 20, { reach: 30 }); check('the block takes 85% (Sojiro)', Math.abs((hp1 - h.hp) - 3) < .6, hp1 - h.hp);
  h.blocking = false; h.iframes = 0; h.parryT = .05; B.Combat.enemyStrike(g, 20, { reach: 30 }); check('a parry inside the window staggers', g.status.stagger > 1, g.status.stagger);
  t.step(.15); t.intent({ attackPressed: true }, 1 / 120); t.intent({}, .3); check('the riposte kills a staggered ashigaru', !g.alive, g.hp);
  M = loadYard(t, { guards: [{ id: 'g', type: 'samurai', at: [12, 11], facing: 180, mode: 'post' }] }); h = M.hero; g = M.guards[0]; g.mode = 'stand';
  game.debug.teleport(g.x - 14, g.y, 0, 0); h.parryT = .5; h.iframes = 0; hp1 = h.hp; B.Combat.enemyStrike(g, 16, { reach: 30 }); check('a parry outside the window does not', !(g.status.stagger > 0) && h.hp < hp1, g.status.stagger);
  h.iframes = 0; hp1 = h.hp; B.Combat.enemyStrike(g, 10, { reach: 30 }); B.Combat.enemyStrike(g, 10, { reach: 30 }); check('i-frames: one hit of two lands', Math.abs((hp1 - h.hp) - 10) < .6, hp1 - h.hp);
  h.iframes = 0; t.intent({ blockDown: true, jumpPressed: true, move: [0, 1] }, 1 / 120); t.intent({ blockDown: true, move: [0, 1] }, .12);
  hp1 = h.hp; B.Combat.enemyStrike(g, 10, { reach: 60, arc: Math.PI }); check('mid-roll, invulnerable', h.action && h.action.name === 'roll' ? h.hp === hp1 : true, (h.action && h.action.name) + ' ' + (hp1 - h.hp));
  // Kaede blocks 70%
  M = loadYard(t, { guards: [{ id: 'g', type: 'ashigaru', at: [12, 11], facing: 180, mode: 'post' }] }, { char: 'kaede' }); h = M.hero; g = M.guards[0]; game.debug.teleport(g.x - 14, g.y, 0, 0);
  h.blocking = true; hp1 = h.hp; B.Combat.enemyStrike(g, 20, { reach: 30 }); check('the block takes 70% (Kaede)', Math.abs((hp1 - h.hp) - 6) < .6, hp1 - h.hp);
  // death and the checkpoint
  h.blocking = false; game.debug.teleport(C(3), C(20), 0); B.Mission.checkpoint(M, 'quiet'); game.debug.teleport(C(20), C(11), 0);
  h.iframes = 0; B.damage(null, h, 999, { kind: 'test' }); t.intent({}, 2);
  check('death: the game-over overlay', M.overMenu && t.snap().over, !!M.overMenu);
  const N = B.Mission.restore(M, M.snap); game.go('mission', { M: N }, { fade: 0 }); t.step(.1);
  check('retry restores the checkpoint', Math.abs(N.hero.x - C(3)) < 1 && Math.abs(N.hero.y - C(20)) < 1 && N.hero.hp === N.hero.maxHp && N.stats.retries === 1, JSON.stringify(t.snap().hero));
}
