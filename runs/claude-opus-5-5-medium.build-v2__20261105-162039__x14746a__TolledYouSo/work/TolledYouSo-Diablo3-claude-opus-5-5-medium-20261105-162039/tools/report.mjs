// Balance report: bot campaign per class in the pure sim. Prints minutes per zone, deaths, level at each zone, boss durations, drops by rarity. --assert fails on targets.
import { newWorld, addHero, stepWorld, applyCommand } from '../src/sim/step.js';
import { enterZone } from '../src/sim/world.js';
import { makeBot, botIntent } from '../src/sim/bot.js';
import { afterTalk, questName } from '../src/sim/quests.js';
const assert = process.argv.includes('--assert'); const seeds = (process.env.SEEDS ?? '11,23').split(',').map(Number);
let bad = 0; const times = { b: {}, m: {} };
const check = (c, msg) => { if (!c) { bad++; console.log(`  TARGET MISSED: ${msg}`); } };
for (const cls of ['bellwarden', 'lamplighter', 'sexton']) for (const seed of seeds) {
  const w = newWorld({ seed }); const h = addHero(w, { seat: 0, cls }); enterZone(w, 'yard'); const b = makeBot({ touchGates: true });
  const zones = {}; let z0 = 'yard'; let t0 = 0; let lastProg = 0; let prog = ''; const boss = {}; const rar = {}; const lvl = {}; const leg = () => w.stats.legendaries ?? 0;
  for (let i = 0; i < 90 * 3600; i++) {
    const cmds = []; const it = botIntent(w, h, b, cmds); stepWorld(w, { 0: it }); for (const c of cmds) applyCommand(w, 0, c);
    for (const ev of w.events) { if (ev.t === 'npc' && ev.d) afterTalk(w, ev.d); if (ev.t === 'ending') w.ended = true; if (ev.t === 'boss' && ev.on) boss[ev.name] = { start: i }; if (ev.t === 'bossdeath') { const k = Object.keys(boss).find((n) => boss[n].end === undefined); if (k) boss[k].end = i; } if (ev.t === 'drop' && ev.kind === 'item') rar[ev.rarity] = (rar[ev.rarity] ?? 0) + 1; }
    w.events.length = 0;
    if (w.zone.id !== z0) { zones[z0] = (zones[z0] ?? 0) + i - t0; lvl[w.zone.id] ??= h.level; z0 = w.zone.id; t0 = i; }
    const key = `${w.story.q}:${w.story.step}:${w.zone.id}:${Math.round((w.boss?.m?.hp ?? 0) / Math.max(1, w.boss?.m?.maxHp ?? 1) * 25)}:${w.boss?.m?.bossState?.rings ?? 0}`; if (key !== prog) { prog = key; lastProg = i; }
    if (w.ended) break;
    if (i - lastProg > 3 * 3600) { console.log('  SOFTLOCK', key, questName(w)); bad++; break; }
  }
  const total = w.tick / 3600;
  console.log(`${cls} seed ${seed}: ${w.ended ? 'CREDITS' : 'NO END'} ${total.toFixed(1)} min, level ${h.level}, deaths ${h.deaths}, kills ${w.stats.kills}, gold ${h.gold}, dps ${h.stats.weaponDps}`);
  console.log('  zones', Object.entries(zones).map(([k, v]) => `${k} ${(v / 3600).toFixed(1)}m`).join(' '));
  console.log('  levels', Object.entries(lvl).map(([k, v]) => `${k} L${v}`).join(' '));
  console.log('  bosses', Object.entries(boss).map(([k, v]) => `${k} ${((v.end - v.start) / 60).toFixed(0)}s`).join(' '), ' drops', JSON.stringify(rar));
  if (assert) { check(w.ended, 'reach the credits'); check(total < 75, 'campaign under 75 min'); check(h.level >= 16 && h.level <= 24, `level 16 to 24 at credits: ${h.level}`); const bu = boss['The Bursar']; const ma = boss['Malison, the Unrung Saint']; if (bu?.end) { const t = (bu.end - bu.start) / 60; check(t >= 60 && t <= 180, `Bursar 60-180 s, ${cls} seed ${seed}: ${t.toFixed(0)}`); } else check(false, 'Bursar killed'); if (ma?.end) { const t = (ma.end - ma.start) / 60; check(t >= 120 && t <= 300, `Malison 120-300 s, ${cls} seed ${seed}: ${t.toFixed(0)}`); } else check(false, 'Malison killed'); check(leg() >= 2, '2+ legendaries'); }
}
if (assert) { console.log(bad ? `REPORT: ${bad} targets missed` : 'REPORT: all targets met'); process.exit(bad ? 1 : 0); }
