// The whole game, played by the bot on Standard, no cheats. Fails if stuck or too many deaths. --v prints the balance report.
import { app, boot, step, settle, withBot, newRun, ok, done } from './util.mjs';
const V = process.argv.includes('--v'); const only = process.argv.find((a) => a.startsWith('--from='))?.slice(7); const MAXS = +(process.argv.find((a) => a.startsWith('--max='))?.slice(6) ?? 7200);
const e = await boot(); app.run = newRun('standard');
// Runtime reachability: what actually spawned and what was actually held, in this one run.
import { Area } from '../../src/game/area.js'; import { ENEMIES } from '../../src/data/enemies.js';
const spawned = new Set(), held = new Set(); const sp0 = Area.prototype.spawnEnemy; Area.prototype.spawnEnemy = function (t, ...r) { spawned.add(t); return sp0.call(this, t, ...r); };
let cur = null, deaths = {}, enterT = 0, areaLog = [], t0 = Date.now();
await settle(app.goArea(only ?? 'quay', { fromSave: !!only }));
let frames = 0, lastId = null, lastProgress = 0, lastPos = null, stuckT = 0, finished = false;
const hold = { };
const report = (a) => { const r = app.run; return `${a.id} t=${Math.round(r.stats.time)} hp=${Math.round(r.health)} money=${r.money} ammo=${r.items.filter((i) => i.id.startsWith('ammo')).map((i) => `${i.id.slice(5)}:${i.count}`).join(',')} kills=${r.stats.kills} shots=${r.stats.shots} hits=${r.stats.hits} deaths=${r.stats.deaths} tann=${r.tannoys.length} rank=${r.rank} obj="${a.objective}"`; };
while (frames < MAXS * 60) {
  const a = e.game; frames++; if (frames % 30 === 0 && app.run) { for (const i of app.run.items) held.add(i.id); for (const i of app.run.valuables) held.add(i); for (const i of app.run.keys) held.add(i); }
  if (a !== cur) { cur = a; if (a.id) { const b = withBot(a); if (V) console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] enter`, report(a)); lastProgress = frames; } else if (a.name === 'title' && app.run?.flags?.ended) { finished = true; break; } }
  if (a.name === 'title') { finished = app.run?.chapter >= 3 && cur.id !== undefined; if (a.menu) break; if (lastId) { finished = true; break; } }
  if (a.id) lastId = a.id;
  if (a.menu) {
    const n = a.menu.constructor.name; if (n === 'DeniedScreen' && !a.menu.counted) { a.menu.counted = true; deaths[a.id] = (deaths[a.id] ?? 0) + 1; if (V) console.log('DIED', report(a), a.gameOverReason, a.player.hurtLog?.join(' '), a.boss?.state, a.boss?.phase, a.player.pos.x.toFixed(1), a.player.pos.z.toFixed(1), 'foes', a.enemies.filter((x) => !x.dead).length); if (deaths[a.id] > 3) { ok(false, `more than 3 deaths in ${a.id}`, report(a)); break; } }
    const press = frames % 8 === 0; if (n === 'ShopScreen' && !a.menu.botted) { a.menu.botted = true; const m0 = a.run.money; a.bot.onShop(); if (V) console.log('SHOP', a.id, m0, '->', a.run.money, a.run.grid.w, a.run.items.map((x) => x.id).join(',')); } if (n === 'CaseScreen' || n === 'ShopScreen') { e.input.setKey('Escape', press); } else e.input.setKey('Enter', press); if (n === 'CreditsScreen' && a.menu.shot > 5) { finished = true; }
  } else { e.input.setKey('Enter', false); e.input.setKey('Escape', false); }
  try { e.step(1); } catch (err) { ok(false, 'exception', err.stack?.slice(0, 600)); console.log(err.stack); break; }
  if (app.loading) { await settle(app.pending); continue; }
  if (e.errors.length) { ok(false, 'game error', e.errors[0]); break; }
  if (a.id && !a.menu) {
    const P = a.player; if (a.bot?.lastGoal?.drop) a.bot.lastGoal = { drop: 1 }; const moved = lastPos ? P.pos.distanceTo(lastPos) : 1; const busy = a.enemies.some((x) => !x.dead) || a.cutscene || a.dialog.active || a.qte.active || P.locked || (a.boss && !a.boss.dead) || a.winch?.on || (a.tide && !a.tide.over); if (moved > 2 || busy) { lastPos = P.pos.clone(); lastProgress = frames; }
    if (frames - lastProgress > 60 * 60) { ok(false, `stuck 60 s in ${a.id}`, report(a)); console.log('STUCK', report(a), 'pos', P.pos.x.toFixed(1), P.pos.z.toFixed(1), a.level.col(P.pos.x), a.level.row(P.pos.z), 'goal', JSON.stringify(a.bot?.lastGoal ?? null), 'scripts', a.scripts.map((s) => s.i), 'action', P.action, 'best', a.interact.best?.verb, 'vel', P.vel.x.toFixed(2), P.vel.z.toFixed(2), 'path', JSON.stringify(a.bot?.path?.slice(0, 3)), a.bot?.pathI, 'entry', JSON.stringify(a.run.entry), 'statues', a.statues?.map((s) => s.step + '/' + s.target), 'drops', a.drops.map((d) => [d.money ? 'm' : d.id, d.x.toFixed(1), d.z.toFixed(1), d.tries, !!d.skip].join(':')).join(' '), 'bots', a.bot?.pressCD); break; }
  }
  if (V && frames % 3600 === 0 && a.id) console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, report(a), a.menu?.constructor?.name ?? "", e.timeScale, a.stage, a.scripts.length, a.player.locked, a.cutscene ? "cut" : "", a.dialog.active ? "dlg" : "");
}
ok(finished, 'reached the end', cur?.id ? report(cur) : cur?.name);
for (const k in ENEMIES) ok(spawned.has(k), `enemy ${k} met in the playthrough`); for (const k of ['pistol', 'coldkey', 'blackpearl', 'ammo_pistol', 'samphire']) ok(held.has(k), `${k} held in the playthrough`); if (V) console.log('spawned', [...spawned].join(' '), 'held', [...held].join(' '));
if (V) console.log('deaths', deaths, 'frames', frames, 'game seconds', Math.round(frames / 60));
done('playthrough');
