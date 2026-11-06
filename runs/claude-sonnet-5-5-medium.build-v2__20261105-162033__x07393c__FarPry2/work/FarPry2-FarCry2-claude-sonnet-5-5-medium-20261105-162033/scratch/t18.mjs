import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); e.input.setKey('KeyX', true); e.step(1); console.log(JSON.stringify(e.input.state()).slice(0, 300));
