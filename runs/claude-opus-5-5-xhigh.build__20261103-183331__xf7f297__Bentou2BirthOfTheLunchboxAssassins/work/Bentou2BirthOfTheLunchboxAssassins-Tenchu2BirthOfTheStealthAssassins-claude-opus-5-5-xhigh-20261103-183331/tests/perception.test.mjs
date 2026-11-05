// perception: a lit hero in the cone is caught; crouched in shadow is not; a roof above is out of view; running is heard,
// crouching is not; smoke and grass hide; lightning exposes; a body found heightens the level
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const g1 = { id: 'g', type: 'ashigaru', at: [6, 2], facing: 90, mode: 'post' };
  let M = loadYard(t, { guards: [g1] }), h = M.hero, g = M.guards[0];
  const reset = () => { g.mind.reset(); g.x = C(6); g.y = C(2); g.facing = Math.PI / 2; g.home.facing = Math.PI / 2; g.target = null; };
  g.mode = 'stand'; game.debug.teleport(C(6), C(2) + 60, 0, -Math.PI / 2); M.world.dynStep.push(); M.world.light.fill(1);
  t.intent({}, 2); check('a lit hero 60 ahead is caught within 2 s', g.mind.state === 'alert', g.mind.state + ' ' + g.mind.level.toFixed(2));
  M.world.bake(); reset(); h.crouch = true; game.debug.teleport(C(6), C(2) + 100, 0, -Math.PI / 2); h.crouch = true;
  for (const L of M.world.lights) L.i = 0; M.world.bake(); t.intent({}, 5);
  check('crouched in shadow at 100 stays calm', g.mind.state === 'calm', g.mind.state + ' ' + g.mind.level.toFixed(2) + ' exp ' + B.Perception.exposure(h, M).toFixed(2));
  // on a roof, right above
  M = loadYard(t, { guards: [Object.assign({}, g1, { at: [9, 8], facing: 270 })] }); h = M.hero; g = M.guards[0]; g.mode = 'stand'; M.world.light.fill(1);
  game.debug.teleport(C(9), C(6), 40, 0); t.intent({}, 3); check('a hero on a roof right above is out of view', g.mind.state === 'calm', g.mind.state);
  // hearing: running at 50 is heard, crouching is not
  M = loadYard(t, { guards: [Object.assign({}, g1, { at: [24, 11], facing: 0 })] }); h = M.hero; g = M.guards[0]; g.mode = 'stand';
  game.debug.teleport(C(24) - 70, C(11), 0, Math.PI / 2); h.crouch = true; t.intent({ move: [0, 1] }, 1); check('crouch-walking is not heard', g.mind.level < .1, g.mind.level);
  h.crouch = false; game.debug.teleport(C(24) - 50, C(11), 0, Math.PI / 2); t.intent({ move: [0, 1] }, .7); check('running at 50 is heard', g.mind.level > .1 || g.mind.state !== 'calm', g.mind.level);
  // smoke between them blocks sight; grass hides a crouching hero
  M = loadYard(t, { guards: [g1] }); h = M.hero; g = M.guards[0]; g.mode = 'stand'; M.world.light.fill(1);
  game.debug.teleport(C(6), C(2) + 70, 0, -Math.PI / 2); M.clouds.push({ x: C(6), y: C(2) + 35, z: 0, r: 30, t: 30, t0: 30 });
  t.intent({}, 2); check('smoke blocks sight', g.mind.state === 'calm', g.mind.state);
  M = loadYard(t, { guards: [Object.assign({}, g1, { at: [16, 11], facing: 90 })] }); h = M.hero; g = M.guards[0]; g.mode = 'stand';
  game.debug.teleport(C(16), C(15), 0, -Math.PI / 2); h.crouch = true; t.intent({}, 3); check('crouched in tall grass, unseen', g.mind.state === 'calm', g.mind.state + ' exp ' + B.Perception.exposure(h, M).toFixed(2));
  const e0 = B.Perception.exposure(h, M); h.crouch = false; game.debug.teleport(C(20), C(10), 0); const dark = B.Perception.exposure(h, M); M.world.flash = .2; const lit = B.Perception.exposure(h, M); M.world.flash = 0;
  check('lightning exposes', lit > dark * 1.5, dark + ' -> ' + lit); void e0;
  // a body in the light: found, the level heightened
  M = loadYard(t, { guards: [g1, { id: 'b', type: 'ashigaru', at: [6, 6], mode: 'post' }] }); g = M.guards[0]; g.mode = 'stand'; M.world.light.fill(1); M.guards[1].alive = false;
  game.debug.teleport(C(26), C(20), 0); t.intent({}, 1.5); check('a body is found: heightened', M.heightened > 0 && M.guards[1].found, M.heightened);
}
