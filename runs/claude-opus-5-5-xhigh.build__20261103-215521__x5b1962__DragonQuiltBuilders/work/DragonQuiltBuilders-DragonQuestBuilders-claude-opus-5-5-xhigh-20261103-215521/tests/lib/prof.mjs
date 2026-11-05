import { load } from './load.mjs';
const L = load({ test: { scene: 'title', skipCutscenes: true } }); const { game, DQ } = L; await game.booted;
game.advance(.2); game.go('play', { name: 'P', beat: 'lv4' }); game.advance(.5);
const ctx = DQ.ctx; const T0 = performance.now(); game.advance(10); const T1 = performance.now();
console.log('10 s sim at lv4 took', (T1 - T0).toFixed(0), 'ms', 'monsters', ctx.monsters.list.length, 'npcs', ctx.npcs.list.length);
// time each system for 2 s
const sys = { npcs: () => ctx.npcs.update(1/120), monsters: () => ctx.monsters.update(1/120), objects: () => ctx.objects.update(1/120), rooms: () => ctx.rooms.update(1/120), town: () => ctx.town.update(1/120), quests: () => { ctx.quests.dirty = true; ctx.quests.update(1/120); }, builder: () => ctx.builder.update(1/120, DQ.Controls.blank()), interact: () => ctx.interactLabel(ctx.builder), drops: () => ctx.drops.update(1/120), clock: () => ctx.clock.update(1/120) };
for (const k in sys) { const t0 = performance.now(); for (let i = 0; i < 240; i++) sys[k](); console.log(k.padEnd(10), ((performance.now() - t0) / 240).toFixed(3), 'ms/step'); }
