import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); game.flow.newGame(); e.step(30);
const f = game.player.feet; const v = game.spawnVehicle('pickup', [f.x + 4, f.z], 0); e.step(60);
console.log('veh', v.pos.toArray().map(x=>+x.toFixed(1)), 'groundY', game.world.heightAt(v.pos.x, v.pos.z).toFixed(1), e.errors);
game.vehSys.enter(v); game.device='kbm';
e.input.setKey('KeyW', true); e.step(180); console.log('speed', v.speed().toFixed(1), 'pos', v.pos.toArray().map(x=>+x.toFixed(0)), game.status(), e.errors);
e.input.setKey('KeyW', false);
