import { load } from '../lib/load.mjs';
import { startSite } from '../lib/play.mjs';
const L = load({}), { game, I, step } = L, X = game.debug.internals; step(1);
startSite(L, 'hollow', 'hollow-1', { seed: 2 }); step(1);
I.tap('pause'); step(.2); console.log('paused', game.paused, 'screen', X.G.ui.screen, 'scene', X.G.scene);
X.DEV.open(); console.log('after open', X.G.ui.screen, game.paused); step(.1); console.log('after step', X.G.ui.screen, game.paused, X.G.ui._stack && X.G.ui._stack.map(s => s.name));
