import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, errs } = G;
  const ctx = G.play('banner'), c = ctx.clock, b = ctx.builder;
  c.set(8); run(30); check('a 12-minute day: 30 s is one in-game hour', Math.abs(c.hour - 9) < .05, c.hour);
  DQ.tuning.set('dayMinutes', 6); c.set(8); run(15); check('the day length slider is live', Math.abs(c.hour - 9) < .05, c.hour); DQ.tuning.reset('dayMinutes');
  c.set(12); c.applyLight(game, 'glen'); const day = game.lights.ambient; c.set(23); c.applyLight(game, 'glen'); const night = game.lights.ambient;
  check('ambient light follows the hour', day > .95 && night < .4, [day, night]);
  c.set(10); c.applyLight(game, 'fraying'); check('the Fraying is always dim and purple', game.lights.ambient < .8);
  c.set(23); c.sleep(); check('sleeping skips to 06:00 the next day', c.hour === 6 && c.day === 2, [c.day, c.hour]);
  b.belly = 100; DQ.dev.noHunger = false; run(18); check('the belly drains 1 point every 9 s', Math.abs(b.belly - 98) < .3, b.belly);
  for (const m of ctx.monsters.list) { m.dead = true; m.deadT = 99; } DQ.tuning.set('maxMonsters', 0); b.belly = 0; b.hp = 20; run(8.2); DQ.tuning.reset('maxMonsters'); check('starving costs 1 HP every 4 s', b.hp === 18, 'hp ' + b.hp);
  check('no errors', !game.errors.length, errs());
};
