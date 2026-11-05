// move: run, walk and crouch speeds; vault 14; climb 30; not 40 (the grapple); swim, dive unseen, breath and drowning; the
// shallows slow; the wall hug; fall damage
import { loadYard, C } from './lib.mjs';
const S = 1 / 120;
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  let M = loadYard(t), h = M.hero;
  const speed = (it, s = 1) => { const x0 = h.x, y0 = h.y; t.intent(it, s); return Math.hypot(h.x - x0, h.y - y0) / s; };
  game.debug.teleport(C(2), C(11), 0, 0); t.intent({ move: [1, 0] }, .3);
  const run = speed({ move: [1, 0] }); check('runs at the run speed', Math.abs(run - B.T('heroRun')) < 8, run);
  game.debug.teleport(C(2), C(11), 0, 0); t.intent({ move: [.4, 0] }, .3); const walk = speed({ move: [.4, 0] }); check('a light tilt walks (50)', Math.abs(walk - 50) < 6, walk);
  game.debug.teleport(C(2), C(11), 0, 0); t.intent({ crouchPressed: true }, S); t.intent({ move: [1, 0] }, .3); const cr = speed({ move: [1, 0] }); check('crouched it sneaks (32)', h.crouch && Math.abs(cr - B.T('heroSneak')) < 5, cr);
  t.intent({ crouchPressed: true }, S);
  // the fence (x 20, h 14): vault it at a run
  game.debug.teleport(C(18), C(6), 0, 0); t.intent({ move: [1, 0] }, .15); t.intent({ move: [1, 0], jumpPressed: true }, S); t.intent({ move: [1, 0] }, 1);
  check('vaults the bamboo fence', h.x > C(20) + 6, h.x / 16);
  // the wall (x 4, h 30): climb it
  game.debug.teleport(C(2), C(6), 0, 0); t.intent({ move: [1, 0] }, .3); t.intent({ move: [1, 0], jumpPressed: true }, S); t.intent({ move: [0, 0] }, 1.2);
  check('climbs a 30 wall', Math.abs(h.z - 30) < 1, h.z);
  // the townhouse (h 40): too tall to climb
  game.debug.teleport(C(7), C(5), 0, 0); t.intent({ move: [1, 0] }, .3); t.intent({ move: [1, 0], jumpPressed: true }, S); t.intent({ move: [0, 0] }, 1.2);
  check('cannot climb a 40 roof (it needs the grapple)', h.z < 2, h.z);
  // the pond: swim, dive (unseen), breath, drowning
  game.debug.teleport(C(6), C(13), 0, Math.PI / 2); t.intent({ move: [0, 1] }, .8);
  check('deep water swims', h.swim, JSON.stringify(t.snap().hero));
  t.intent({ crouchPressed: true }, S); t.intent({}, .2);
  check('crouch dives', h.dive, h.dive);
  check('diving is unseen (exposure 0)', B.Perception.exposure(h, M) === 0, B.Perception.exposure(h, M));
  const b0 = h.breath; t.intent({}, 2); check('breath runs down underwater', h.breath < b0 - 1.5, h.breath);
  h.breath = .1; const hp0 = h.hp; t.intent({}, 1); check('out of breath, it drowns', h.hp < hp0 - 5, h.hp);
  t.intent({ crouchPressed: true }, S); t.intent({}, .2); check('crouch again surfaces', !h.dive, h.dive);
  // the shallows slow
  game.debug.teleport(C(10), C(14), 0, Math.PI / 2); t.intent({ move: [0, 1] }, .2); const sh = speed({ move: [0, 1] }, .5); check('the shallows slow the run', sh < B.T('heroRun') * .8, sh);
  // the wall hug: crouched, pushing into the townhouse
  game.debug.teleport(C(9), C(7) + 2, 0, -Math.PI / 2); h.crouch = true; t.intent({ move: [0, -1] }, .5);
  check('crouched against a wall it hugs it', !!h.hug, JSON.stringify({ hug: h.hug, crouch: h.crouch }));
  t.intent({ move: [1, 0] }, 1.2); check('the hug slides along the wall, and peeks at its end', !!h.hug && (!!h.peek || h.x > C(9) + 8), JSON.stringify({ x: h.x / 16, peek: h.peek }));
  t.intent({ move: [0, 1] }, .3); check('pushing away leaves the wall', !h.hug, !!h.hug);
  // a fall over 72 hurts
  h.crouch = false; game.debug.teleport(C(25), C(11), 0); h.z = 110; h.onGround = false; h._peak = 110; const hp1 = h.hp; t.intent({}, 1.5);
  check('a fall over 72 hurts', h.hp <= hp1 - 14, hp1 - h.hp);
}
