// Random input across the Kettle with the views built: finds crashes in paths no script walks.
import { boot, Player } from '../lib/bot.mjs';
import { SITES, POSTS } from '../../src/content/sites.js';
import { MISSION_ORDER } from '../../src/content/missions.js';
import { Rng } from '../../pixel-engine.js';
export const name = 'soak';
export const covers = ['src', 'pixel-engine.js'];
export async function run(t) {
  for (const seed of [1, 2, 3]) await soak(t, seed, 18);
}
async function soak(t, seed, rounds) {
  const r = new Rng(seed);
  const { game: g, engine: e } = await boot({ forceViews: true, seed });
  const p = new Player(g, e, null);
  p.step(30);
  const acts = ['fire', 'aim', 'use', 'reload', 'jump', 'crouch', 'melee', 'next', 'throw', 'heal', 'map', 'tablet', 'tracker', 'mono', 'exit', 'swap', 'chase', 'alt'];
  const sites = [...Object.values(SITES).map((s) => s.at), ...Object.values(POSTS).map((s) => s.at)];
  const missions = [...MISSION_ORDER, 'mr1'];
  for (let round = 0; round < rounds; round++) {
    const m = r.pick(missions);
    if (round % 6 === 0) { g.dev.startMission(m); p.step(10); }
    g.dev.god = r.chance(0.7);
    if (r.chance(0.2)) g.dev.giveAll();
    const at = r.pick(sites);
    if (!g.player.seat) { g.player.flying = false; g.dev.teleport(at[0] + r.range(-30, 30), at[1] + r.range(-30, 30)); }
    if (r.chance(0.25)) g.clock.set(r.range(0, 24));
    if (r.chance(0.2)) { const v = g.vehicles.spawn(r.pick(['pickup', 'technical', 'truck', 'tanker']), g.player.feet.x + 6, g.player.feet.z, r.range(0, 6)); p.step(10); if (r.chance(0.6) && !g.player.seat) g.driving.enter(v); }
    if (r.chance(0.2)) g.fire.ignite(g.player.feet.x + r.range(-20, 20), g.player.feet.z + r.range(-20, 20), 8, 'player');
    if (r.chance(0.1)) g.sky.setWeather(r.pick(['clear', 'dust', 'storm']));
    if (r.chance(0.1)) { g.story.feverRunning = true; g.body.startFever(); }
    for (let k = 0; k < 40; k++) {
      p.bot.move = { x: r.range(-1, 1), y: r.range(-1, 1) };
      p.bot.analog.gas = r.next(); p.bot.analog.brake = r.chance(0.2) ? 1 : 0;
      p.bot.hold('fire', r.chance(0.4)); p.bot.hold('aim', r.chance(0.2)); p.bot.hold('sprint', r.chance(0.2)); p.bot.hold('mono', r.chance(0.04)); p.bot.hold('use', r.chance(0.1));
      p.bot.press(r.pick(acts));
      if (g.player.seat == null || g.driving.vehicle) { g.ctx.camera.yaw += r.range(-0.4, 0.4); g.ctx.camera.pitch = r.range(-0.3, 0.3); }
      p.step(r.int(5, 25));
      const top = g.ui.menu.top;
      if (top) {
        const items = g.ui.menu.itemsOf(top);
        if (top.id === 'gameover') { g.ui.menu.clear(); g.engineResume(); g.body.dead = false; g.body.hp = 100; }
        else if (items.length && r.chance(0.5)) { g.ui.menu.activate(top, r.pick(items)); p.step(3); }
        else if (top.noBack) { if (items.length) g.ui.menu.activate(top, items[0]); else g.ui.menu.pop(); }
        else g.ui.menu.back(top);
      }
    }
    p.bot.clear();
    if (g.mode === 'title') { p.press('confirm'); g.dev.startMission('m3'); p.step(5); }
  }
  t.eq(`soak ${seed} left no errors`, e.errors.length, 0, e.errors[0]);
  e.dispose();
}
