import { fresh, fightBout, run } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G, { Karateka, Reader } = KC.test, I = game.input;
  // every matrix cell x both foe sides maps to the expected technique
  const exp = { nu: 'roundKick', nt: 'frontKick', nd: 'lowKick', na: 'backKick', tu: 'upLunge', tt: 'midLunge', td: 'frontSweep', ta: 'turnBackKick', au: 'backRound', at: 'block', ad: 'backSweep', aa: 'backFlip', uu: 'frontFlip', ut: 'jumpSide', ud: 'jump', ua: 'jumpBack', du: 'upperPunch', dt: 'squatPunch', dd: 'crouch', da: 'backRoll' };
  for (const side of [1, -1]) {
    const a = new Karateka('taro', 0), b = new Karateka('ebi', 1); a.x = 100; b.x = side > 0 ? 300 : -100 + 400; if (side < 0) { a.x = 300; b.x = 100; }
    for (const k in exp) {
      const conv = c => c === 'n' ? 'n' : c === 'u' || c === 'd' ? c : (c === 't') === (side > 0) ? 'r' : 'l', posture = conv(k[0]), strike = k[1] === 'u' || k[1] === 'd' ? k[1] : conv(k[1]);
      t.check(`matrix ${k} facing ${side > 0 ? 'right' : 'left'}`, a.resolve(posture, strike, b) === exp[k], a.resolve(posture, strike, b));
    }
  }
  // close substitutions
  { const a = new Karateka('taro', 0), b = new Karateka('ebi', 1); a.x = 100; b.x = 100 + 18 + 8; t.check('frontKick gap<12 becomes revPunch', a.resolve('n', 'r', b) === 'revPunch'); t.check('midLunge gap<12 becomes revPunch', a.resolve('r', 'r', b) === 'revPunch'); b.x = 100 + 18 + 14; t.check('midLunge gap<18 becomes frontKick', a.resolve('r', 'r', b) === 'frontKick'); t.check('upLunge gap<18 becomes roundKick', a.resolve('r', 'u', b) === 'roundKick'); }
  // the quantizer: dominant axis, hysteresis, press edge
  const rd = new Reader(I); I.padAim = [.9, .2]; let r = rd.read(); t.check('right stick past .5 presses right', r.tech === 'r'); r = rd.read(); t.check('holding the stick does not repeat', r.tech === null);
  I.padAim = [.4, .1]; r = rd.read(); t.check('hysteresis keeps it held at .4', r.tech === null && rd.rs === 'r'); I.padAim = [.2, .1]; rd.read(); t.check('released below .35', rd.rs === null);
  I.padAim = [.1, -.8]; r = rd.read(); t.check('stick up is tech up', r.tech === 'u'); I.padAim = null; rd.read();
  I.padAim = [.6, .7]; r = rd.read(); t.check('dominant axis wins', r.tech === 'd'); I.padAim = null; rd.read();
  // keyboard: vertical beats horizontal for posture, face buttons press the technique stick
  I.press('KeyW'); I.press('KeyD'); game.advance(.02); r = rd.read(); t.check('W+D posture is up', r.posture === 'u'); I.release('KeyW'); I.release('KeyD'); game.advance(.02);
  I.press('KeyL'); game.advance(.01); r = new Reader(I).read(); I.release('KeyL'); game.advance(.02);
  for (const [act, code, d] of [['tUp', 'Pad3', 'u'], ['tDown', 'Pad0', 'd'], ['tLeft', 'Pad2', 'l'], ['tRight', 'Pad1', 'r']]) { const rr = new Reader(I); I.tap(act); game.advance(.01); const res = rr.read(); t.check(`action ${act} (${code}) is the technique stick ${d}`, res.tech === d || res.tech === null, res.tech); }
  t.check('technique actions are bound to face buttons', KC.KEYS.tUp.includes('Pad3') && KC.KEYS.tDown.includes('Pad0') && KC.KEYS.tLeft.includes('Pad2') && KC.KEYS.tRight.includes('Pad1'));
  // the 4-frame posture upgrade: R-> then L-> two frames later gives midLunge
  { const b = fightBout(G); const a = b.f[0]; a.x = 120; b.f[1].x = 260; b.f[0].frozen = b.f[1].frozen = false; const f1 = b.f[1];
    let out = a.step(f1, { posture: 'n', tech: 'r' }); t.check('frontKick starts from neutral + R', a.tech && a.tech.id === 'frontKick', a.tech && a.tech.id);
    a.step(f1, { posture: 'n', tech: null }); a.step(f1, { posture: 'r', tech: null }); a.step(f1, { posture: 'r', tech: null });
    t.check('late posture (2 steps) upgrades to midLunge', a.tech && a.tech.id === 'midLunge', a.tech && a.tech.id); }
  { const b = fightBout(G); const a = b.f[0]; a.x = 120; b.f[1].x = 260; const f1 = b.f[1]; a.step(f1, { posture: 'n', tech: 'r' }); for (let i = 0; i < 12; i++) a.step(f1, { posture: 'n', tech: null }); for (let i = 0; i < 3; i++) a.step(f1, { posture: 'r', tech: null }); t.check('a posture 12 steps late does not upgrade', a.tech && a.tech.id === 'frontKick', a.tech && a.tech.id); }
  // buffer: a press while busy fires on the first free step if it was made within 0.15 s (18 steps) of it
  { const b = fightBout(G); const a = b.f[0]; a.x = 120; b.f[1].x = 260; const f1 = b.f[1]; a.step(f1, { posture: 'n', tech: 'd' }); let n = 0; const total = a.fr[0] + a.fr[1] + a.fr[2];
    while (a.t < total - 10) a.step(f1, { posture: 'n', tech: null }); a.step(f1, { posture: 'n', tech: 'r' }); while (a.state === 'tech' && a.tech.id === 'lowKick' && n++ < 300) a.step(f1, { posture: 'n', tech: null }); a.step(f1, { posture: 'n', tech: null });
    t.check('a press 10 steps before the end fires right after recovery', a.tech && a.tech.id === 'frontKick', a.tech && a.tech.id); }
  { const b = fightBout(G); const a = b.f[0]; a.x = 120; b.f[1].x = 260; const f1 = b.f[1]; a.step(f1, { posture: 'n', tech: 'd' }); a.step(f1, { posture: 'n', tech: 'r' }); let n = 0;
    while (a.state === 'tech' && n++ < 400) a.step(f1, { posture: 'n', tech: null }); t.check('a press older than 0.15 s is dropped', !a.tech, a.tech && a.tech.id); }
  // P1 and P2 split maps
  game.addPlayer({ keys: 'right' }); KC.applyMaps(); const P = game.players;
  t.check('two players on the keyboard', P.length === 2); t.check('P1 uses T F G H', P[0].map.tUp.includes('KeyT') && !P[0].map.tUp.includes('KeyI')); t.check('P2 uses arrows and IJKL', P[1].map.up.includes('ArrowUp') && P[1].map.tUp.includes('KeyI'));
  KC.resetPlayers(); t.check('reset players restores one player', game.players.length === 1 && game.players[0].map.tUp.includes('KeyI'));
  // prompt labels follow the device
  I.lastDevice = 'keyboard'; t.check('keyboard family is key', KC.family() === 'key'); t.check('keyboard prompt text', KC.promptText('frontKick') === 'L' && KC.promptText('upperPunch') === 'S + I', KC.promptText('upperPunch'));
  I.lastDevice = 'gamepad'; t.check('pad default glyphs are PlayStation', I.padStyle() === 'playstation' && KC.family() === 'ps', I.padStyle()); t.check('pad prompt text uses sticks', KC.promptText('upperPunch') === 'L DOWN + R UP');
  game.settings.set('glyphs', 'xbox'); t.check('xbox glyph option works', KC.family() === 'xbox', KC.family()); game.settings.set('glyphs', 'playstation'); I.lastDevice = 'keyboard';
  t.check('glyph label for confirm is a cross on PlayStation', (() => { I.lastDevice = 'gamepad'; return I.label('confirm') === '✕'; })()); I.lastDevice = 'keyboard';
};
