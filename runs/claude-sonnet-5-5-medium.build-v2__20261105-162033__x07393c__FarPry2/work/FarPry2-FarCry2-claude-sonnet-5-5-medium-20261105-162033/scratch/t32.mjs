import { freePlay } from '../tests/lib/boot.mjs';
const { e, g } = await freePlay(); g.player.teleport(28, 50, 0); e.step(5); g.dialogue.play('m2.tibor', { focus: 'tibor' }); e.step(40);
console.log(JSON.stringify(g.camState.override), JSON.stringify(g.state().dialogue), g.npcs.view('tibor').pos.toArray());
