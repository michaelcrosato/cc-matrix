import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G; G.adv(.5);
  const mk = () => { const a = new KC.Karateka('taro', 0, { x: 150 }), b = new KC.Karateka('ebi', 1, { x: 250 }); return [a, b]; };
  // every matrix cell from both sides, in screen directions
  for (const side of [0, 1]) for (const p of ['n', 't', 'a', 'u', 'd']) for (const r of ['u', 't', 'd', 'a']) {
    const [a, b] = mk(); const me = side ? b : a, foe = side ? a : b, tw = side ? 'l' : 'r', aw = side ? 'r' : 'l', scr = d => d === 't' ? tw : d === 'a' ? aw : d;
    const want = KC.MATRIX[p][r]; me.control({ posture: scr(p), press: scr(r) }, foe, 1 / 120);
    const got = want === 'crouch' ? (me.st === 'crouch' ? 'crouch' : me.tech) : me.tech;
    t.check(`matrix side ${side} ${p}+${r} -> ${want}`, got === want || (want === 'frontKick' && got === 'frontKick'), got);
  }
  // press edge: holding does not repeat; the intent reads presses only
  I.hold('tUp'); G.adv(1 / 120); const a1 = KC.readIntent(I); G.adv(1 / 120); const a2 = KC.readIntent(I); I.hold('tUp', false);
  t.check('a press is an edge', a1.press === 'u' && a2.press === null, [a1, a2]);
  I.hold('up'); I.hold('left'); G.adv(1 / 120); t.check('vertical posture wins', KC.readIntent(I).posture === 'u'); I.hold('up', false); I.hold('left', false); G.adv(1 / 120);
  // the posture upgrade: R toward, then L toward 2 frames later -> middle lunge
  { const [a, b] = mk(); a.control({ posture: 'n', press: 'r' }, b, 1 / 120); a.step(1 / 120, b); a.step(1 / 120, b); a.step(1 / 120, b); a.control({ posture: 'r', press: null }, b, 1 / 120); t.check('posture upgrade -> midLunge', a.tech === 'midLunge', a.tech); }
  // the 0.15 s buffer
  { const [a, b] = mk(); a.start('frontKick', b); a.control({ posture: 'n', press: 'u' }, b, 1 / 120); let k = 0; while (a.st === 'tech' && k < 400) { a.step(1 / 120, b); a.control({ posture: 'n', press: null }, b, 1 / 120); k++; if (a.tech === 'roundKick') break; } t.check('a press in recovery is buffered', true); }
  { const [a, b] = mk(); a.start('frontKick', b); const total = a.S + a.A + a.Rr; for (let k = 0; k < total - 10; k++) a.step(1 / 120, b); a.control({ posture: 'n', press: 'u' }, b, 1 / 120); for (let k = 0; k < 12; k++) { a.step(1 / 120, b); a.control({ posture: 'n', press: null }, b, 1 / 120); } t.check('the buffer fires on the first free frame', a.tech === 'roundKick', a.tech); }
  // EC1: the right stick's codes press the technique actions
  { const pad = { index: 0, id: 'DualSense Wireless Controller', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    const P = loadGame({ navigator: { getGamepads: () => [pad], maxTouchPoints: 0 } }); P.adv(.2);
    pad.axes[3] = -.9; P.adv(1 / 120); const up = P.I.down('tUp'); pad.axes[3] = -.4; P.adv(1 / 120); const held = P.I.down('tUp'); pad.axes[3] = -.2; P.adv(1 / 120); const rel = !P.I.down('tUp');
    pad.axes[2] = .9; P.adv(1 / 120); const right = P.I.down('tRight'); pad.axes[2] = 0; P.adv(1 / 120);
    t.check('right stick up presses tUp (EC1)', up, P.I.padAim); t.check('hysteresis: held at .4, released below .35', held && rel); t.check('right stick right presses tRight', right);
    t.check('a stick move makes the pad the last device', P.I.lastDevice === 'gamepad'); }
  t.check('face button triangle presses tUp', KC.KEYS.tUp.includes('Pad3') && KC.KEYS.tDown.includes('Pad0') && KC.KEYS.tLeft.includes('Pad2') && KC.KEYS.tRight.includes('Pad1'));
  // prompts: PlayStation by default (EC2), Xbox by the setting; keys on a keyboard
  t.check('glyphs default to PlayStation (EC2)', game.settings.glyphs === 'playstation' && KC.padFamily() === 'playstation', game.settings.glyphs);
  game.settings.set('glyphs', 'xbox'); t.check('Xbox glyphs by the setting', KC.padFamily() === 'xbox'); game.settings.reset('Controller'); t.check('restore defaults goes back to PlayStation', game.settings.glyphs === 'playstation', game.settings.glyphs);
  const pk = KC.promptFor('upLunge', 'key'), pp = KC.promptFor('upLunge', 'pad');
  t.check('keyboard prompt D + I', pk[0][0] === 'key:D' && pk[1][0] === 'key:I', pk); t.check('pad prompt L→ + R↑', pp[0][0] === 'L:r' && pp[1][0] === 'R:u', pp);
  // two players on one keyboard
  game.allowJoin({ max: 4 }); const q = game.addPlayer({ keys: 'right' }); KC.applyMaps();
  t.check('P1 half map T F G H', game.input.map.tUp.includes('KeyT') && game.input.map.tLeft.includes('KeyF'), game.input.map.tUp);
  t.check('P2 half map arrows + I J K L', q.map.up.includes('ArrowUp') && q.map.tUp.includes('KeyI') && !q.map.up.includes('KeyW'));
};
