// tools: what each of the ten does; stacks and compartments; unlocks gate the shelf
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const one = (tool, o = {}) => { const M = loadYard(t, { guards: o.guards || [] }); const h = M.hero; h.bento = [{ tool, n: B.get('tool', tool).stack }, null, null, null, null, null, null, null]; h.sel = 0; return [M, h]; };
  let [M, h] = one('riceball'); h.hp = 20; t.intent({ usePressed: true }, 1 / 120); t.intent({}, 1); check('Rice Ball: +40', h.hp === 60, h.hp);
  [M, h] = one('plum'); h.stamina = 10; t.intent({ usePressed: true }, 1 / 120); t.step(.1); check('Sour Plum: stamina and soft steps', h.stamina > 90 && h.softT > 19, h.stamina + ' ' + h.softT);
  [M, h] = one('cloak'); t.intent({ usePressed: true }, 1 / 120); t.step(.1); check('Straw Cloak: 15 s', h.cloakT > 14, h.cloakT);
  const gs = [{ id: 'g', type: 'ashigaru', at: [14, 11], facing: 180, mode: 'post' }];
  [M, h] = one('poisonball', { guards: gs }); let g = M.guards[0]; game.debug.teleport(C(11), C(11), 0, Math.PI); M.cheats.invisible = true;
  t.intent({ usePressed: true }, 1 / 120); game.debug.teleport(C(4), C(21), 0); t.intent({}, 10);
  check('Poison Rice Ball: a guard eats it and dies', !g.alive && M.stats.cleanKills === 1, g.alive + ' eat ' + g.status.eat + ' kills ' + M.stats.cleanKills);
  [M, h] = one('dango', { guards: gs }); g = M.guards[0]; game.debug.teleport(C(11), C(11), 0, Math.PI); M.cheats.invisible = true; t.intent({ usePressed: true }, 1 / 120); game.debug.teleport(C(4), C(21), 0); t.intent({}, 8);
  check('Sleep Dango: the eater sleeps', g.alive && g.status.sleep > 10, g.status.sleep);
  [M, h] = one('shuriken', { guards: gs }); g = M.guards[0]; game.debug.teleport(C(10), C(11), 0, 0); let hp0 = g.hp; t.intent({ usePressed: true }, 1 / 120); t.intent({}, .6); check('Shuriken: 8 damage', Math.abs(hp0 - g.hp - 9.6) < .6 || Math.abs(hp0 - g.hp - 8) < .6, hp0 - g.hp);
  check('Shuriken: a calm guard turns to look', g.mind.state !== 'calm' || g.mind.level > .3, g.mind.state);
  [M, h] = one('smoke', { guards: gs }); g = M.guards[0]; g.mind.level = 1.2; g.mind.update(.01, false, h); game.debug.teleport(C(11), C(11), 0, 0); t.intent({ usePressed: true, blockDown: true }, 1 / 120);
  check('Smoke Bomb: a cloud at the feet', M.clouds.length === 1 && Math.hypot(M.clouds[0].x - h.x, M.clouds[0].y - h.y) < 4, M.clouds.length);
  M.clouds[0].x = g.x; M.clouds[0].y = g.y; t.step(.2); check('Smoke Bomb: the guard inside is blinded and loses the hero', g.status.blind > 0 && g.mind.state !== 'alert', g.mind.state);
  [M, h] = one('caltrops', { guards: gs }); g = M.guards[0]; game.debug.teleport(C(11), C(11), 0, 0); t.intent({ usePressed: true }, 1 / 120); g.x = h.x + 4; g.y = h.y; hp0 = g.hp; t.step(.1);
  check('Caltrops: damage, a stun and a limp', g.hp < hp0 && g.status.stun > 0 && g.status.limp > 0, JSON.stringify(g.status));
  [M, h] = one('firecracker', { guards: [{ id: 'g', type: 'ashigaru', at: [20, 4], facing: 90, mode: 'post' }] }); g = M.guards[0]; game.debug.teleport(C(20), C(15), 0, -Math.PI / 2);
  t.intent({ usePressed: true, aimPoint: { x: C(24), y: C(8), z: 0 }, mouseMode: true }, 1 / 120); t.intent({}, 2.5);
  check('Firecracker: the guard goes to look where it popped', g.mind.last && Math.hypot(g.mind.last.x - C(24), g.mind.last.y - C(8)) < 24, JSON.stringify(g.mind.last));
  [M, h] = one('firepot', { guards: gs }); g = M.guards[0]; game.debug.teleport(C(9), C(11), 0, 0); t.intent({ usePressed: true, aimPoint: { x: g.x, y: g.y, z: 0 }, mouseMode: true }, 1 / 120); t.intent({}, 1.5);
  check('Fire Pot: 45 around it', !g.alive || g.hp <= 0, g.hp);
  // stacks, compartments, unlocks
  [M, h] = one('riceball'); h.bento = Array(8).fill(null); const n = B.Hero.give(h, 'shuriken', 14); check('giving fills compartments up to their stack', n === 14 && h.bento[0].n === 10 && h.bento[1].n === 4, JSON.stringify(h.bento.slice(0, 2)));
  const fresh = B.Save.fresh(); check('locked tools stay off the shelf', !B.Bento.unlocked('dango', fresh) && B.Bento.unlocked('shuriken', fresh), '');
  check('the suggested bento skips locked tools', !B.Bento.fromHint([['dango', 2], ['smoke', 2]], fresh).some(c => c && c.tool === 'dango'), '');
}
