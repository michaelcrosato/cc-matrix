import { boot, hold } from '../tests/lib/boot.mjs';
const { e, game: g } = await boot(); e.step(3); g.flow.startRound(); g.godMode = true; e.step(60 * 6); const R = g.round;
R.cases[0].x = g.player.feet.x; R.cases[0].z = g.player.feet.z + 1; e.step(5);
console.log('state', R.local.state, 'playing', R.playing(), 'tgt', JSON.stringify(R.tgt && R.tgt.kind), 'cases0', R.cases[0].x, R.cases[0].z, g.player.feet.x, g.player.feet.z);
hold(e, 'KeyE', 90); console.log('carry', R.local.carry, 'holdT', R.holdT, 'held', g.ctx.input.anyDown(['KeyE']), 'mode', g.mode, 'prompts', JSON.stringify(g.state().prompts));
