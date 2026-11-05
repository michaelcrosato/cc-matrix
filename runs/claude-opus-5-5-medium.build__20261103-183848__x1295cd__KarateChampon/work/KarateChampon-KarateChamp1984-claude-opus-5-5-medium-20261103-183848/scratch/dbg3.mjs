import { loadGame } from '../tests/lib/load.mjs';
import { drive } from '../tests/story.test.mjs';
const G = loadGame(), { KC, game } = G; G.adv(.5); let n = 0;
const r = drive(G, { level: 10, lose: { node: 2, n: 1 }, until: () => (KC.Story.s && KC.Story.s.node >= 3) || n > 2, onContinue: S => { n++; G.I.tap('confirm'); } });
console.log(r.log.join(' > '));
const S = game.scene; console.log(game.sceneName, S.bout && S.bout.ctrl.map(String), KC.F.ai);
