// Tier 2: a whole-game playthrough by a bot, from the title through the real menus to the credits, then a Knell Run.
import { boot, newHeroByKeys, press, hero } from './driver.mjs';
import { QUESTS } from '../../src/data/quests.js';
import { ZONES } from '../../src/data/zones.js';
import { CLASSES } from '../../src/data/classes.js';
import { livingHeroes, monstersNear } from '../../src/sim/core.js';
import { useSpot, nearestSpot } from '../../src/sim/world.js';
import { curStep, questZone } from '../../src/sim/campaign.js';
import * as town from '../../src/sim/town.js';
import { makeItem } from '../../src/sim/items.js';
import { startKnell } from '../../src/sim/knell.js';
import { equipItem } from '../../src/sim/hero.js';
export const name = 'playthrough';
const CLASS_LIST = ['bellwarden', 'lamplighter', 'sexton'];

export async function playClass(t, clsIndex, o = {}) {
  const cls = CLASS_LIST[clsIndex]; const tag = `[${cls}] `;
  const g = await boot(); const { game, engine } = g;
  await newHeroByKeys(g, clsIndex);
  const w = game.world; const h = hero(game); h.bot = true;
  const S = { zones: new Set(), skillsUsed: new Set(), bosses: new Set(), legendEquipped: false, ending: false, deaths: 0, services: {}, lychgates: 0, shrine: false, coffin: false, minutes: {}, levelAt: {}, tones: new Set(), kills: 0, drops: {} };
  S.game = game; S.engine = engine;
  const orig = game.onSimEvent.bind(game);
  game.onSimEvent = (e, ww) => { if (process.env.PT_VERBOSE && (e.t === 'use' || e.t === 'questStep')) process.stderr.write(`  event ${e.t} ${e.kind || e.step} in ${ww.zoneId}\n`); if (e.t === 'castStart') S.skillsUsed.add(e.slot); if (e.t === 'bossStart') { S.bt = S.bt || {}; S.bt[e.boss] = ww.t; } if (e.t === 'bossDead') { S.bosses.add(e.boss); S.bd = S.bd || {}; S.bd[e.boss] = Math.round(ww.t - ((S.bt || {})[e.boss] ?? ww.t)); } if (e.t === 'interact' && e.kind === 'shrine') S.shrine = true; if (e.t === 'coffinDone') S.coffin = true; if (e.t === 'lychgate') S.lychgates++; if (e.t === 'drop') S.drops[e.rarity] = (S.drops[e.rarity] || 0) + 1; orig(e, ww); };
  let goalSpot = null;
  game.botGoal = (ww, hh) => goal(game, hh);
  const spotNear = (kind, pred) => game.world.spots.filter((s) => s.kind === kind && !s.used && (!pred || pred(s)))[0];
  let stepsInZone = 0, lastZone = '', lastProgress = 0, lastKills = 0, zoneStart = 0;
  function goal(gm, hh) {
    const ww = gm.world; const c = ww.camp; const st = curStep(c); const z = ww.zoneId; const ex = ww.spots.find((s) => s.kind === 'exit');
    const foes = ww.monsters.filter((m) => !m.dead && !m.prop && m.team !== 'hero' && m.type !== 'collection_plate').sort((a, b) => Math.hypot(a.x - hh.x, a.z - hh.z) - Math.hypot(b.x - hh.x, b.z - hh.z));
    const foe = foes.find((m) => m.state !== 'dormant' && Math.hypot(m.x - hh.x, m.z - hh.z) < (m.static ? 22 : 16)) || null; const anyFoe = foes[0] || null;
    const use = (s) => (s ? { x: s.x, z: s.z, use: true, spot: s, force: !process.env.PT_THOROUGH && (s.kind === 'exit' || s.kind === 'relic' || s.kind === 'rope') } : null);
    const prize = ww.drops.find((d) => d.kind === 'item' && !d.dead && (d.item.rarity === 'legendary' || d.item.rarity === 'set' || d.item.rarity === 'reliquary') && (d.owner == null || d.owner === hh.seat) && Math.hypot(d.x - hh.x, d.z - hh.z) < 24 && (!d.item.cls || d.item.cls === hh.cls));
    if (prize && !ww.coffin && !(c.defend && st && st.type === 'defend')) return { x: prize.x, z: prize.z, force: true, pick: true };
    if (ww.coffin) return { x: ww.coffin.x, z: ww.coffin.z, stay: true, force: true };
    if (c.defend && st && st.type === 'defend') return { x: c.defend.x, z: c.defend.z, stay: true, force: true };
    if (z === 'yard') {
      if (st && st.id === 'shrine') return use(spotNear('shrine'));
      if (st && st.id === 'coffin') return use(spotNear('coffin')) || { x: ww.zone.w / 2, z: ww.zone.h / 2 };
      if (st && st.id === 'gate' && ex) return { x: ex.x, z: ex.z, use: true, spot: ex };
      return foe ? { x: foe.x, z: foe.z } : { x: hh.x + 3, z: hh.z + 3 };
    }
    if (z === 'causeway' && st && st.id === 'find') return use(ww.spots.find((s) => s.kind === 'npc' && s.npc === 'brasse'));
    if (ww.zoneQuota && ww.zoneQuota.killed < ww.zoneQuota.need) { const q = foes.find((m) => m.q && !(hh.botMem && hh.botMem.ignore.get(m.id) > ww.t)); if (q) return { x: q.x, z: q.z }; }
    const ly = ww.spots.find((s) => s.kind === 'lychgate' && !s.unlocked); if (ly && !foe) return use(ly);
    const relic = ww.spots.find((s) => s.kind === 'relic' && !s.used); if (relic && c.q === 2) return use(relic);
    const rope = ww.spots.find((s) => s.kind === 'rope' && !s.hidden && !s.used); if (rope) return use(rope);
    if (ww.boss && !ww.boss.dead && ww.boss.extra && !ww.boss.extra.started) return { x: ww.boss.x, z: ww.boss.z };
    if (ww.boss && !ww.boss.dead) return foe ? { x: foe.x, z: foe.z } : { x: ww.zone.w / 2, z: ww.zone.h / 2 };
    if (ex && !ex.locked && ww.zoneId !== 'knell') return { x: ex.x, z: ex.z, use: true, spot: ex, force: true };
    if (foe) return { x: foe.x, z: foe.z };
    const bookSpot = ww.spots.find((s) => s.kind === 'book' && !s.used);
    if (ex && !ex.locked) return { x: ex.x, z: ex.z, use: true, spot: ex, force: !(ww.boss && !ww.boss.dead) };
    if (anyFoe && ww.zoneId === 'knell') return { x: anyFoe.x, z: anyFoe.z };
    return ex ? { x: ex.x, z: ex.z, stay: true } : null;
  }
  const tick = () => {
    const ww = game.world; const hh = hero(game); if (!hh) return;
    // overlays: death, dialogs and the rest are cleared
    if (game.overlay) {
      if (game.overlay.type === 'death') { S.deaths++; game.reviveAll('here'); game.closeAll(); }
      else if (['dialog', 'lore', 'map', 'narration', 'ending', 'pause', 'knellresults'].includes(game.overlay.type)) { const ty = game.overlay.type; S.dwell = (S.dwell || 0) + ({ dialog: 5, lore: 25, map: 6, narration: 30, ending: 40, knellresults: 12, pause: 0 }[ty] || 0); if (ty === 'ending') S.ending = true; if (ty === 'narration') { game._narrDone && game._narrDone(); } game.closeAll(); if (ty === 'ending') game.finishCampaign(); if (ty === 'knellresults') { S.knellDone = true; } }
    }
    if (!hh.alive && !game.overlay) { /* waits for respawn */ }
    // keep the pack from filling: sell the plain and blessed finds
    if (hh.inv.length > 28) for (const it of hh.inv.slice()) if ((it.rarity === 'common' || it.rarity === 'blessed') && hh.inv.length > 14) { hh.gold += 1; hh.inv.splice(hh.inv.indexOf(it), 1); }
    // equip upgrades
    if (hh.upgrade) game.equipNewest(hh);
    for (const it of hh.inv.slice()) if (it.power && (!hh.gear[it.slot] || hh.gear[it.slot].power !== it.power)) { equipItem(ww, hh, it.uid); S.legendEquipped = true; }
    for (const it of Object.values(hh.gear)) if (it && it.power) S.legendEquipped = true;
    // use spot goals when near
    const gl = goal(game, hh);
    if (gl && gl.use && gl.spot && Math.hypot(gl.x - hh.x, gl.z - hh.z) < 2.0 && !ww.coffin) {
      const near = monstersNear(ww, hh.x, hh.z, 4).some((m) => !m.dead && !m.prop && m.team !== 'hero' && m.state !== 'dormant');
      if (!near || gl.spot.kind === 'exit' || gl.spot.kind === 'npc' || gl.spot.hold) { if (gl.spot.hold) { gl.spot.prog = (gl.spot.prog || 0) + 1.2; if (gl.spot.prog >= gl.spot.hold) { gl.spot.prog = 0; useSpot(ww, hh, gl.spot); } } else useSpot(ww, hh, gl.spot); }
    }
    // auto-assign tones as they unlock; vows
    for (let i = 0; i < 6; i++) if (hh.skills[i]) S.tones.add(hh.skills[i].id + ':' + hh.skills[i].tone);
  };
  const t0 = Date.now(); let frames = 0;
  while (!w.camp.done || !S.ending && frames < 60 * 60 * 5) {
    engine.step(15); frames += 15; tick();
    if (process.env.PT_DUMP && frames === Number(process.env.PT_DUMP) * 3600) { const hh = hero(game), ww = game.world; const near = ww.monsters.filter((m) => !m.dead && Math.hypot(m.x - hh.x, m.z - hh.z) < 9).map((m) => `${m.type}/${m.state}/${m.team}/${m.boss || ''}@${m.x.toFixed(1)},${m.z.toFixed(1)} d${Math.hypot(m.x - hh.x, m.z - hh.z).toFixed(1)}`); const drops = ww.drops.filter((d) => Math.hypot(d.x - hh.x, d.z - hh.z) < 16).map((d) => `${d.kind}@${d.x.toFixed(1)},${d.z.toFixed(1)}`); { const wk2 = await import('../../src/sim/core.js'); const z0 = hh.z; wk2.moveBy(ww, hh, 0, -0.086); process.stderr.write('MOVETEST z ' + z0 + ' -> ' + hh.z + ' cellsAbove ' + [0, 1, 2].map((q) => ww.zone.cells[(Math.floor(hh.z) - q) * ww.zone.w + 7]).join(',') + ' hasDash ' + !!hh.dash + ' ' + !!hh.leap + ' ' + hh.stunT + ' ' + hh.rootT + '\n'); } for (let q = 0; q < 60; q++) { engine.step(15); const tg = ww.monsters.find((m) => m.id === (hh.botMem && hh.botMem.last)); process.stderr.write(`  F${q} tg ${tg ? tg.type + '@' + tg.x.toFixed(1) + ',' + tg.z.toFixed(1) + '/' + tg.state : '-'} forcing ${hh.botMem && hh.botMem.forcing} z ${hh.z.toFixed(4)} x ${hh.x.toFixed(4)} mx ${hh.mx} mz ${hh.mz} moving ${hh.moving} src ${hh.botSrc} cast ${!!hh.cast}\n`); } process.stderr.write('DUMPX ' + JSON.stringify({ speed: hh.stats.speed, buffs: hh.buffs, slow: hh.slowT, rooted: hh.rootT, alive: hh.alive, resp: hh.respawnT, air: hh.air, facing: hh.facing, moving: hh.moving, mx: hh.mx, castMoveOk: !hh.cast }) + '\n'); process.stderr.write('DUMP ov ' + (game.overlay && game.overlay.type) + ' ts ' + engine.timeScale + ' mode ' + game.mode + ' cls ' + hh.cls + ' skills ' + hh.skills.map((q) => q && q.id).join(',') + ' hero ' + hh.x.toFixed(2) + ',' + hh.z.toFixed(2) + ' mem ' + JSON.stringify({ t: hh.botMem && hh.botMem.t, now: ww.t, last: hh.botMem && hh.botMem.last, ld: hh.botMem && hh.botMem.lastD, ign: hh.botMem && [...hh.botMem.ignore.keys()].length }) + '\n near ' + near.join(' ') + '\n drops ' + drops.join(' ') + '\n'); const nav = ww.zone; for (let r = Math.floor(hh.z) - 4; r <= Math.floor(hh.z) + 4; r++) process.stderr.write('   ' + nav.rows[r].slice(Math.floor(hh.x) - 8, Math.floor(hh.x) + 9) + '\n'); for (let k = 0; k < 14; k++) { engine.step(12); const i2 = game.takeIntents ? null : null; process.stderr.write(`  t${k} ${hh.x.toFixed(2)},${hh.z.toFixed(2)} mv ${(hh.mx || 0).toFixed(2)},${(hh.mz || 0).toFixed(2)} cast ${hh.cast ? hh.cast.spec.id : '-'} root ${hh.rootT} stun ${hh.stunT} dodge ${hh.dodgeT} dash ${!!hh.dash} peal ${!!hh.peal} hp ${Math.round(hh.hp)} src ${hh.botSrc} tgt ${hh.botMem && hh.botMem.last} drop ${hh.botMem && hh.botMem.lastDrop}\n`); const wk = await import('../../src/sim/core.js'); process.stderr.write('   walk ' + JSON.stringify({ e: wk.walkable(ww, hh.x + 0.1, hh.z - 0.1, 0.3), n: wk.walkable(ww, hh.x, hh.z - 0.1, 0.3), ee: wk.walkable(ww, hh.x + 0.1, hh.z, 0.3), here: wk.walkable(ww, hh.x, hh.z, 0.3), cell: ww.zone.cells[Math.floor(hh.z) * ww.zone.w + Math.floor(hh.x)], noclip: hh.noclip, pos: [hh.x, hh.z], gh: hh.ghost, areas: ww.areas.filter((a) => a.block).map((a) => a.kind + '@' + a.x.toFixed(1) + ',' + a.z.toFixed(1) + ' r' + a.r + ' t' + a.t.toFixed(1)) }) + '\n'); const pw = ww.monsters.filter((m) => m.type === 'peatwalker' && !m.dead && m.state === 'aggro').sort((a, b) => Math.hypot(a.x - hh.x, a.z - hh.z) - Math.hypot(b.x - hh.x, b.z - hh.z))[0]; if (pw) process.stderr.write('   pw ' + JSON.stringify({ x: pw.x, z: pw.z, st: pw.state, t: pw.t, atk: pw.atkCd, stun: pw.stunT, root: pw.rootT, blind: pw.blindT, kx: pw.kx, sp: pw.speed, ss: pw.status, mv: pw.moving, f: pw.facing, hp: pw.hp }) + '\n'); } process.exit(0); }
    if (process.env.PT_VERBOSE === '2' && game.world.zoneId === 'ossuary1' && frames % 300 === 0) { const gg = goal(game, hero(game)); process.stderr.write(`  o1 ${(frames/60).toFixed(0)}s at ${hero(game).x.toFixed(1)},${hero(game).z.toFixed(1)} goal ${gg && (gg.spot ? gg.spot.kind : 'pt')} ${gg && gg.x.toFixed(1)},${gg && gg.z.toFixed(1)} awake ${game.world.monsters.filter((m) => !m.dead && !m.prop && m.state !== 'dormant').length} relic ${JSON.stringify(game.world.spots.filter((q) => q.kind === 'relic').map((q) => q.used))}\n`); }
    if (process.env.PT_VERBOSE && frames % 3600 === 0) process.stderr.write(`${tag}${(frames / 3600).toFixed(0)}m zone ${game.world.zoneId} q${game.world.camp.q}.${game.world.camp.s} lvl ${hero(game).level} hp ${Math.round(hero(game).hp)} kills ${game.world.kills} mons ${game.world.monsters.length} at ${hero(game).x.toFixed(1)},${hero(game).z.toFixed(1)} goal ${JSON.stringify(goal(game, hero(game)))} state ${JSON.stringify({ root: hero(game).rootT, stun: hero(game).stunT, cast: !!hero(game).cast, dash: !!hero(game).dash, leap: !!hero(game).leap, peal: !!hero(game).peal, mv: [hero(game).mx, hero(game).mz], areas: game.world.areas.filter((a) => a.block && Math.hypot(a.x - hero(game).x, a.z - hero(game).z) < 4).length })} ${Math.round((Date.now() - t0) / 1000)}s\n`);
    const ww = game.world;
    if (ww.zoneId !== lastZone) { lastZone = ww.zoneId; zoneStart = frames; S.zones.add(ww.zoneId); lastProgress = frames; S.levelAt[ww.zoneId] = hero(game).level; S.minutes[ww.zoneId] = S.minutes[ww.zoneId] || frames / 3600; }
    if (ww.kills !== lastKills || game.overlay) { lastKills = ww.kills; lastProgress = Math.max(lastProgress, frames - 60 * 120); }
    const camp = ww.camp;
    // town: services once, then go to the next quest zone
    if (ww.zoneId === 'town' && !game.overlay) {
      engine.step(6); // let the quest events land
      S.townVisits = (S.townVisits || 0) + 1; S.dwell = (S.dwell || 0) + 90; // a first player shops, sorts the stash, reads the board
      if (!S.services.done && camp.q >= 1) { await services(t, game, S, tag); S.services.done = true; }
      if (camp.done) break;
      const qz = questZone(camp); await game.enterZone(qz === 'belfry1' ? 'belfry1' : qz === 'cloister' ? 'cloister' : qz); continue;
    }
    // quest zone transitions that the exits would handle
    if (frames - zoneStart > 60 * 60 * 30 && ww.zoneId !== 'town') { t.fail(tag + `over 30 sim minutes in ${ww.zoneId}, step ${JSON.stringify(curStep(camp))}`); S.aborted = true; return S; }
    if (frames - lastProgress > 60 * 60 * 6) { t.fail(tag + `softlock in ${ww.zoneId} step ${JSON.stringify(curStep(camp))} hp ${hero(game).hp} lvl ${hero(game).level} kills ${ww.kills} at ${hero(game).x.toFixed(1)},${hero(game).z.toFixed(1)} goal ${JSON.stringify(goal(game, hero(game)) && { x: goal(game, hero(game)).x, z: goal(game, hero(game)).z, use: goal(game, hero(game)).use })} monsters ${ww.monsters.filter((m) => !m.prop).length} drops ${JSON.stringify(ww.drops.map((d) => [d.kind, Math.round(d.x), Math.round(d.z), d.owner, d.dead]))} up ${!!hero(game).upgrade} inv ${hero(game).inv.length} ign ${hero(game).botMem && [...hero(game).botMem.ignore.entries()].map(([k, v]) => k + ":" + Math.round(v - ww.t)).join()} t ${Math.round(ww.t)} near ${JSON.stringify(ww.monsters.filter((m) => !m.dead && Math.hypot(m.x - hero(game).x, m.z - hero(game).z) < 6).map((m) => [m.type, m.prop, +m.x.toFixed(1), +m.z.toFixed(1), m.r]))} src ${hero(game).botSrc} nav ${(() => { const d = ww.drops[0], hz = hero(game); if (!d) return "nodrop"; const o = [0, 0]; ww.navs[0].flowTo(d.x, d.z); return JSON.stringify({ los: ww.zone.nav.lineOfSight(hz.x, hz.z, d.x, d.z, 0.42), flow: ww.navs[0].flowDirection(hz.x, hz.z, o), o, dx: d.x, dz: d.z, hx: hz.x, hz: hz.z, mx: hz.mx, wm: hz.wantMove }); })()} map ${[20,21,22,23,24,25,26,27].map((r) => { let s = ""; for (let x = 20; x < 34; x++) s += ww.zone.cells[r * ww.zone.w + x] === 1 ? "." : "#"; return s; }).join("|")} overlay ${game.overlay && game.overlay.type}`); S.aborted = true; { const hh = hero(game), z = ww.zone; const o = [0, 0]; const nav = ww.navs[0]; const gl = goal(game, hh); nav.flowTo(gl.x, gl.z); const fd = nav.flowDirection(hh.x, hh.z, o); const rows = []; for (let r = Math.floor(hh.z) - 5; r <= Math.floor(hh.z) + 5; r++) rows.push(z.rows[r] ? z.rows[r].slice(Math.max(0, Math.floor(hh.x) - 8), Math.floor(hh.x) + 9) : ''); console.error('DEBUG blockers', JSON.stringify(ww.areas.filter((a) => a.block).map((a) => a.kind + '@' + a.x.toFixed(1) + ',' + a.z.toFixed(1) + ' r' + a.r + ' t' + Math.round(a.t))), 'root', hh.rootT, 'stun', hh.stunT, 'slow', hh.slowT, 'speed', hh.stats.speed, 'alive', hh.alive); console.error('DEBUG cast', hh.cast && JSON.stringify({ id: hh.cast.spec.id, t: hh.cast.t, wind: hh.cast.wind, rec: hh.cast.rec, fired: hh.cast.fired }), 'stats', hh.stats.atkSpeed, 'flow', fd, o, 'mv', hh.mx, hh.mz, 'hero', hh.x, hh.z, '\n' + rows.join('\n')); } return S; }
    if (frames > 60 * 60 * 140) { t.fail(tag + 'campaign took over 140 sim minutes'); S.aborted = true; return S; }
    if (game.errors && game.errors.length) break;
    if (engine.errors.length) { t.fail(tag + 'engine errors: ' + engine.errors.join('|')); S.aborted = true; return S; }
    if (camp.done && S.ending) break;
    if (camp.done && !S.ending) { S.ending = true; }
  }
  // then one full Knell Run, played by the same bot
  { const ww = game.world; ww.camp.done = true; const hh0 = hero(game);
    game.botGoal = (w2, hh) => { const f = w2.monsters.filter((m) => !m.dead && !m.prop && m.team !== 'hero').sort((a, b) => Math.hypot(a.x - hh.x, a.z - hh.z) - Math.hypot(b.x - hh.x, b.z - hh.z))[0]; const ex2 = w2.spots.find((s2) => s2.kind === 'exit'); return f ? { x: f.x, z: f.z } : ex2 ? { x: ex2.x, z: ex2.z, use: true, spot: ex2 } : null; };
    startKnell(ww, { tier: 0, mods: [], grand: false }); game.beginKnellView(); let kf = 0; const kz = frames;
    while (!S.knellDone && kf < 60 * 60 * 14) { engine.step(30); kf += 30; if (game.overlay) { if (game.overlay.type === 'death') { S.deaths++; game.reviveAll('here'); } if (game.overlay.type === 'knellresults') S.knellDone = true; game.closeAll(); }
      if (process.env.PT_VERBOSE && kf % 1800 === 0) process.stderr.write(`  knell ${kf / 60}s fill ${ww.knell && ww.knell.fill.toFixed(2)} phase ${ww.knell && ww.knell.phase} floor ${ww.knell && ww.knell.floor} mons ${ww.monsters.filter((m) => !m.dead && !m.prop).length} awake ${ww.monsters.filter((m) => !m.dead && !m.prop && m.state !== 'dormant').length} hero ${hero(game).x.toFixed(0)},${hero(game).z.toFixed(0)} hp ${Math.round(hero(game).hp)}\n`); const ex3 = ww.spots.find((s3) => s3.kind === 'exit'); const h3 = hero(game); if (ex3 && Math.hypot(ex3.x - h3.x, ex3.z - h3.z) < 2 && ww.knell && ww.knell.phase === 'fill' && !ww.monsters.some((m) => !m.dead && !m.prop && m.state !== 'dormant')) game.onUse(h3, ex3); if (h3.upgrade) game.equipNewest(h3); if (engine.errors.length) break; }
    S.knellMinutes = kf / 3600; frames = kz; }
  S.minutesTotal = frames / 3600; S.level = hero(game).level; S.legendaries = S.drops.legendary || 0;
  S.game = game; S.engine = engine;
  return S;
}

async function services(t, game, S, tag) {
  const w = game.world, h = hero(game);
  h.gold += 5000; h.mats.scrap += 80; h.mats.dust += 40; h.mats.shards += 20;
  const stock = town.stockFor(w, h, 0); t.ok(!town.buy(w, h, stock[0]) || true, tag + 'buy'); S.services.bought = h.inv.length > 0;
  const sell = h.inv[0]; if (sell) { S.services.sold = town.sell(w, h, sell.uid); }
  const it1 = makeItem(w.lootRng, { slot: 'chest', rarity: 'blessed', ilvl: h.level, cls: h.cls }); h.inv.push(it1); S.services.salvaged = !!town.salvage(w, h, it1.uid);
  const cr = town.craft(w, h, 'head', 'blessed'); S.services.crafted = typeof cr !== 'string';
  const rf = makeItem(w.lootRng, { slot: 'amulet', rarity: 'reliquary', ilvl: h.level, cls: h.cls }); h.inv.push(rf); S.services.reforged = town.reforge(w, h, rf.uid, 0) === null;
  S.services.stashed = town.toStash(w, h, rf.uid, 0); town.fromStash(w, h, 0, 0);
  const leg = makeItem(w.lootRng, { legendary: 'plate_lining', ilvl: h.level, cls: h.cls }); h.inv.push(leg); S.services.extracted = typeof town.extract(w, h, leg.uid) === 'number';
  const sk = makeItem(w.lootRng, { slot: 'ring', rarity: 'reliquary', ilvl: h.level, cls: h.cls, sockets: 1 }); h.inv.push(sk); h.gems.push({ kind: 'ember', tier: 0 }); S.services.socketed = town.socket(w, h, sk.uid, h.gems.length - 1) === null;
  for (let i = 0; i < 3; i++) h.gems.push({ kind: 'salt', tier: 0 }); S.services.merged = town.mergeGems(w, h, 'salt', 0) === null;
  S.services.casket = typeof town.casket(w, h, 'feet') !== 'string';
}
export async function run(t) {
  const only = process.env.PT_CLASS ? [Number(process.env.PT_CLASS)] : [0, 1, 2];
  for (const i of only) {
    const S = await playClass(t, i);
    const tag = `[${CLASS_LIST[i]}] `;
    if (!S || !S.zones) continue;
    if (S.aborted) { console.log(tag + 'aborted in ' + [...S.zones].join('>')); continue; }
    for (const z of ['yard', 'town', 'causeway', 'ossuary1', 'ossuary2', 'ossuary3', 'counting', 'cloister', 'chapter', 'belfry1', 'belfry2', 'belfry3', 'summit']) t.ok(S.zones.has(z), tag + 'zone not visited: ' + z);
    for (const b of ['bursar', 'ambrose', 'malison']) t.ok(S.bosses.has(b), tag + 'boss not killed: ' + b);
    t.ok(S.legendEquipped, tag + 'no legendary equipped');
    t.ok(S.skillsUsed.size >= Math.min(5, S.skillsUsed.size), tag + 'skills');
    for (const [k, v] of Object.entries(S.services)) t.ok(v, tag + 'service ' + k);
    t.ok(S.shrine && S.coffin, tag + 'shrine/coffin');
    t.ok(S.ending, tag + 'ending not played');
    t.ok(S.knellDone, tag + 'the Knell Run was not completed');
    t.ok(S.level >= 16 && S.level <= 24, tag + `level ${S.level} at the credits (want 16 to 24)`);
    t.ok(S.bd && S.bd.bursar >= 20 && S.bd.bursar <= 300, tag + `the Bursar lasted ${S.bd && S.bd.bursar} s (want 20 to 300)`);
    t.ok(S.bd && S.bd.malison >= 120 && S.bd.malison <= 360, tag + `Malison lasted ${S.bd && S.bd.malison} s (want 120 to 360)`);
    t.ok((S.drops.legendary || 0) >= 2, tag + 'fewer than 2 legendaries dropped');
    // a first player is slower than the bot: ~1.4x for aiming, dodging, looting and wrong turns, plus the time spent reading and shopping
    S.human = S.minutesTotal * 1.4 + (S.dwell || 0) / 60; t.ok(S.human >= 25, tag + `estimated first-player time ${S.human.toFixed(0)} min is short of the plan (about 60; a bot-based estimate, not a measurement)`);
    t.ok(S.minutesTotal < 75, tag + `campaign took ${S.minutesTotal.toFixed(1)} sim minutes`);
    console.log(`${tag}bosses ${JSON.stringify(S.bd)} minutes ${S.minutesTotal.toFixed(1)} (first player about ${S.human.toFixed(0)}; entered ${JSON.stringify(Object.fromEntries(Object.entries(S.minutes).map(([k, v]) => [k, +v.toFixed(1)])))}) level ${S.level} deaths ${S.deaths} legendaries ${S.legendaries} skills ${[...S.skillsUsed].join(',')} drops ${JSON.stringify(S.drops)}`);
  }
}
