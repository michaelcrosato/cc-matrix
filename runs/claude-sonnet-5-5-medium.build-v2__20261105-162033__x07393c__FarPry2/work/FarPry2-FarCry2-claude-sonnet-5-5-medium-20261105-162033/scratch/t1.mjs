import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); game.mode='play'; e.step(30);
const i = e.input; i.setKey('KeyW', true); e.step(120); console.log(game.status(), game.ctx.camera.yaw);
i.setKey('ShiftLeft', true); e.step(60); console.log(game.status(), game.player.sprinting, game.player.stamina.toFixed(2), e.errors);
