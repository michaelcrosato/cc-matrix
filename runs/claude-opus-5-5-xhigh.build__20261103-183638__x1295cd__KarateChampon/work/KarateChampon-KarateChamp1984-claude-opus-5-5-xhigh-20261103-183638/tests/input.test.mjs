// input: the reader (posture quantizer, press edges), all 20 cells on both sides, the upgrade window, the buffer, the
// face buttons, the 2P keyboard split, the right stick codes (EC1), prompt glyphs by device and family
import { fresh, pair, tick } from './lib/util.mjs';
export default async t => {
  const { KC, game, E } = fresh(), I = game.input, R = new KC.Reader(I);
  I.hold('up'); I.hold('right'); game.advance(1 / 120);
  t.check('keys: vertical beats horizontal (W+D is up)', R.read().posture === 'u'); I.hold('up', false); I.hold('right', false); game.advance(1 / 120);
  I.tap('tUp'); game.advance(1 / 120); const p1 = R.read(); t.check('a technique key gives one press edge', p1.press === 'u', JSON.stringify(p1));
  I.hold('tDown'); game.advance(1 / 120); const e1 = R.read().press; game.advance(1 / 120); const e2 = R.read().press; I.hold('tDown', false);
  t.check('holding the technique key does not repeat', e1 === 'd' && e2 === null, e1 + ' ' + e2);
  // the analog stick: hysteresis
  I.lastDevice = 'gamepad'; I.padMove = [.6, 0]; t.check('stick past .5 is a posture', R.posture() === 'r'); I.padMove = [.4, 0]; t.check('and it holds above .35', R.posture() === 'r'); I.padMove = [.3, 0]; t.check('and lets go below .35', R.posture() === 'n'); I.padMove = [.6, .7]; t.check('the dominant axis wins', R.posture() === 'd'); I.padMove = [0, 0]; I.lastDevice = 'keyboard';
  // all 20 cells, both sides: posture and technique toward the foe whichever side it is on
  for (const side of [0, 1]) for (const p in KC.MATRIX) for (const d in KC.MATRIX[p]) {
    const [A, B] = pair(KC, side ? 250 : 150, side ? 150 : 250), F = A, foe = B; F.ctlOn = true;
    const id = KC.MATRIX[p][d]; if (id === 'crouch') continue;
    F.control({ posture: KC.scrDir(p, F.face), press: KC.scrDir(d, F.face) }); F.update(1 / 120, foe);
    t.check(`cell ${p}${d} (${side ? 'facing left' : 'facing right'}) starts ${id}`, F.tech === id || (id === 'frontKick' && F.tech === 'frontKick'), F.tech);
  }
  // close substitutions: N + toward at gap < 12 is the reverse punch; a middle lunge too close is a front kick
  { const [A, B] = pair(KC, 150, 150 + 18 + 8); A.ctlOn = true; A.control({ posture: 'n', press: 'r' }); A.update(1 / 120, B); t.check('close front kick is a reverse punch', A.tech === 'revPunch', A.gapTo(B) + ' ' + A.tech); }
  { const [A, B] = pair(KC, 150, 150 + 18 + 14); A.ctlOn = true; A.control({ posture: 'r', press: 'r' }); A.update(1 / 120, B); t.check('a middle lunge at gap 14 is a front kick', A.tech === 'frontKick', A.tech); }
  // the late posture upgrade: R toward, then L toward 2 frames later: the middle lunge
  { const [A, B] = pair(KC); A.ctlOn = true; A.control({ posture: 'n', press: 'r' }); A.update(1 / 120, B); A.control({ posture: 'n', press: null }); A.update(1 / 120, B); A.update(1 / 120, B); A.control({ posture: 'r', press: null }); A.update(1 / 120, B);
    t.check('posture within 4 frames upgrades: front kick -> middle lunge', A.tech === 'midLunge' && A.k >= 3, A.tech + ' k' + A.k); }
  // the buffer: a press while busy fires on the first free step (within 0.15 s)
  { const [A, B] = pair(KC, 100, 300); A.ctlOn = true; A.control({ posture: 'n', press: 'r' }); A.update(1 / 120, B); const total = A.fr.reduce((a, b) => a + b, 0); for (let i = 0; i < total - 10; i++) { A.control({ posture: 'n', press: null }); A.update(1 / 120, B); } A.control({ posture: 'n', press: 'u' }); A.update(1 / 120, B); for (let i = 0; i < 12; i++) { A.control({ posture: 'n', press: null }); A.update(1 / 120, B); }
    t.check('a buffered press fires when free', A.tech === 'roundKick', A.st + ' ' + A.tech); }
  // face buttons are a technique stick; the right stick has codes (EC1)
  t.check('cross is technique down, triangle up', KC.KEYS.tDown.includes('Pad0') && KC.KEYS.tUp.includes('Pad3') && KC.KEYS.tLeft.includes('Pad2') && KC.KEYS.tRight.includes('Pad1'));
  { // EC1 through a stubbed gamepad: the right stick past .5 presses its code, held above .35, released below
    const L = fresh({ pads: true }), G = L.game, J = G.input, pad = L.ctx.__pad;
    pad.axes = [0, 0, 0, -.6]; G.advance(1 / 120); const a = J.down('tUp'); pad.axes = [0, 0, 0, -.4]; G.advance(1 / 120); const b = J.down('tUp'); pad.axes = [0, 0, -.2, -.3]; G.advance(1 / 120); const c = J.down('tUp');
    pad.axes = [.7, 0, .7, -.2]; G.advance(1 / 120); const d = J.down('tRight');
    t.check('EC1: the right stick presses tUp past .5', a); t.check('EC1: and holds it above .35', b); t.check('EC1: and lets go below .35', !c); t.check('EC1: the dominant axis: right', d);
  }
  t.check('EC1: the right stick has labels', I.codeLabel('PadRAxisLeft') === 'R stick ←');
  t.check('2P split: P1 T F G H, P2 I J K L', KC.KEYS_P1.tUp[0] === 'KeyT' && KC.KEYS_P1.tLeft[0] === 'KeyF' && KC.KEYS_P2.tUp[0] === 'KeyI' && KC.KEYS_P2.up[0] === 'ArrowUp');
  // prompts: keycaps on the keyboard, PlayStation by default on a pad (EC2), Xbox when chosen
  I.lastDevice = 'keyboard'; const kp = KC.promptFor('roundKick', I); t.check('keyboard prompt: a keycap', kp.length === 1 && kp[0].kind === 'key' && kp[0].label === 'I', JSON.stringify(kp));
  const kp2 = KC.promptFor('upLunge', I); t.check('keyboard prompt: D + I', kp2[0].label === 'D' && kp2[2].label === 'I', JSON.stringify(kp2));
  t.check('EC2: button symbols default to PlayStation', game.settings.glyphs === 'playstation' && game.settings.default('glyphs') === 'playstation');
  t.check('pad confirm is the cross (PS)', KC.actionIcon('confirm', I, 'gamepad').kind === 'ps' && KC.actionIcon('confirm', I, 'gamepad').b === 0);
  t.check('pad prompt: L stick + R stick', KC.promptFor('jumpSide', I, 'gamepad').filter(x => x.kind === 'stick').map(x => x.side).join() === 'L,R');
  game.settings.set('glyphs', 'xbox'); t.check('Xbox glyphs: A', KC.actionIcon('confirm', I, 'gamepad').kind === 'xb'); game.settings.set('glyphs', 'playstation');
  t.check('EC3: the font has the PlayStation shapes', ['✕', '○', '□', '△'].every(c => E.font.width(c) > 0));
};
