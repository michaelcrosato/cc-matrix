// A sim-only whole campaign, bot driven: fast, no view. Prints a per-zone report when asked.
import { createWorld, stepWorld, beginCampaign } from '../../src/sim/world.js';
import { newHeroData } from '../../src/sim/hero.js';
import { botAfter, botIntent, botManage, newBotMemory } from '../../src/sim/bot.js';
import { currentStep } from '../../src/sim/quests.js';
import { applyCommand } from '../../src/sim/commands.js';

export function playCampaign(cls, { seed = 11, maxMinutes = 120, log = false, onEvent = null, tuning = {}, difficulty = 0 } = {}) {
  const w = createWorld({ seed, tuning, difficulty });
  beginCampaign(w, [newHeroData(cls, 'BOT')]);
  const mems = new Map();
  const report = { cls, zones: {}, bosses: {}, deaths: 0, drops: {}, levelAt: {}, legendaries: 0, softlock: null, quests: [], minutes: 0, steps: {} };
  const maxT = maxMinutes * 3600;
  let lastProgress = 0, lastKey = '';
  let bossStart = {};
  while (w.t < maxT) {
    const intents = [];
    for (const h of w.heroes) {
      if (!mems.has(h.id)) mems.set(h.id, newBotMemory());
      const mem = mems.get(h.id);
      const seat = h.seat;
      intents[seat] = botIntent(w, h, mem);
      if (!h.companion) {
        if (w.t % 300 === 0) botManage(w, h, mem, { rotateTones: w.t % 3600 === 0, rotateSkills: w.t % 3600 === 0 });
      }
      botAfter(w, h, mem);
    }
    stepWorld(w, intents);
    for (const e of w.events) {
      onEvent?.(e, w);
      if (e.t === 'talk') applyCommand(w, e.seat, { c: 'talk_done', npc: e.npc });
      if (e.t === 'down' && !e.companion) report.deaths++;
      if (e.t === 'boss') bossStart[e.k] = w.t;
      if (e.t === 'boss_dead') report.bosses[e.k] = (w.t - bossStart[e.k]) / 60;
      if (e.t === 'drop' && e.kind === 'item') report.drops[e.rarity] = (report.drops[e.rarity] ?? 0) + 1;
      if (e.t === 'quest_done') report.quests.push(e.name);
    }
    w.events.length = 0;
    const key = `${w.camp.q.i}.${w.camp.q.s}.${w.zone.id}.${w.zone.floor}`;
    if (key !== lastKey) {
      if (log) console.log(`${(w.t / 3600).toFixed(1)}m ${key} ${currentStep(w)?.id ?? 'done'} L${w.heroes[0].level} deaths ${report.deaths} hp ${Math.round(w.heroes[0].hp)}/${w.heroes[0].stats.maxHp}`);
      lastKey = key;
      lastProgress = w.t;
      const z = w.zone.id;
      report.zones[z] = report.zones[z] ?? { first: w.t, last: w.t, level: w.heroes[0].level };
      report.steps[currentStep(w)?.id ?? 'done'] = w.t / 3600;
    }
    report.zones[w.zone.id].last = w.t;
    if (w.camp.credits) break;
    if (w.t - lastProgress > 3600 * 8) { report.softlock = { key, t: w.t, x: w.heroes[0].x, z: w.heroes[0].z, monsters: w.monsters.length, step: currentStep(w)?.id, zone: w.zone.id }; break; }
  }
  report.minutes = w.t / 3600;
  report.level = w.heroes[0].level;
  report.finished = !!w.camp.credits;
  report.world = w;
  return report;
}
