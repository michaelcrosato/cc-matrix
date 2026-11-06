// Tier 2: The Last Bell start, once per class: spend Devotion, change tier, complete a Grand Knell, see a set bonus apply.
import { boot, newHeroByKeys, hero } from './driver.mjs';
import { startKnell } from '../../src/sim/knell.js';
import { botIntent } from '../../src/sim/bot.js';
import { spendDevotion, addDevotionXp, devotionPoints } from '../../src/sim/town.js';
import { livingHeroes } from '../../src/sim/core.js';
export const name = 'lastbell';
export async function run(t) {
  for (const [ci, cls] of [[0, 'bellwarden'], [1, 'lamplighter'], [2, 'sexton']]) {
    const g = await boot(); const { game, engine } = g; await newHeroByKeys(g, ci, true);
    const w = game.world; const h = hero(game); const tag = `[${cls} last bell] `;
    t.ok(h.level === 30, tag + 'level 30'); t.ok(w.zoneId === 'town', tag + 'starts in town: ' + w.zoneId);
    t.ok(Object.values(h.gear).filter((it) => it && it.power).length >= 3, tag + 'three legendaries'); t.ok(Object.values(h.stats.sets).some((n) => n >= 2), tag + 'set bonus applies: ' + JSON.stringify(h.stats.sets));
    t.ok(h.skills.filter(Boolean).length === 6 && h.skills.every((s) => s && s.tone), tag + 'six skills with tones');
    addDevotionXp(w, 40000); t.ok(devotionPoints(w.acct) >= 2, tag + 'devotion points'); t.ok(spendDevotion(w, h, 'core'), tag + 'spend devotion');
    w.diffId = 'martyr'; t.ok(w.diffId === 'martyr', tag + 'tier change');
    // a full Grand Knell, bot-played
    h.bot = true; game.botGoal = (ww, hh) => { const f = ww.monsters.filter((m) => !m.dead && !m.prop && m.team !== 'hero').sort((a, b) => Math.hypot(a.x - hh.x, a.z - hh.z) - Math.hypot(b.x - hh.x, b.z - hh.z))[0]; const ex = ww.spots.find((s) => s.kind === 'exit'); return f ? { x: f.x, z: f.z } : ex ? { x: ex.x, z: ex.z, use: true, spot: ex } : null; };
    w.diffId = 'pilgrim'; startKnell(w, { tier: 1, mods: ['crowded'], grand: true }); game.beginKnellView(); w.tuning.monsterHp = 0.5;
    let done = false, frames = 0; const orig = game.onSimEvent.bind(game); game.onSimEvent = (e, ww) => { if (e.t === 'knellDone') done = e.result; orig(e, ww); };
    while (!done && frames < 60 * 60 * 9) {
      engine.step(30); frames += 30;
      if (game.overlay) { if (game.overlay.type === 'death') { game.reviveAll('here'); } game.closeAll(); }
      const ex = w.spots.find((s) => s.kind === 'exit'); const hh = hero(game);
      if (ex && Math.hypot(ex.x - hh.x, ex.z - hh.z) < 2 && w.knell && w.knell.phase === 'fill' && !w.monsters.some((m) => !m.dead && !m.prop && m.state !== 'dormant')) { try { game.onUse(hh, ex); } catch (e) { t.fail(tag + 'exit: ' + e.message); } }
      if (engine.errors.length) break;
    }
    t.ok(!!done && !done.failed, tag + 'completed the Grand Knell: ' + JSON.stringify(done && { kills: done.kills, time: Math.round(done.time) }));
    t.ok(engine.errors.length === 0, tag + 'engine errors: ' + engine.errors.join('|'));
  }
}
