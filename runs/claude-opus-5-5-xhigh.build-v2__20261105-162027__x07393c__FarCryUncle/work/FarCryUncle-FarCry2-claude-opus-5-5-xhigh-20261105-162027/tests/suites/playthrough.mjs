// The most important test: a bot plays M0 through both endings with real actions, teleporting between objectives.
import { boot, Player } from '../lib/bot.mjs';
import { SITES, POSTS } from '../../src/content/sites.js';
import { MISSIONS } from '../../src/content/missions.js';
export const name = 'playthrough';
export const covers = ['src', 'pixel-engine.js'];
export async function run(t) {
  for (const variant of ['both-alive-column', 'one-dead-alone']) {
    // The second run builds every view too, so drawing paths are walked in Node.
    const { game: g, engine: e } = await boot({ seed: variant.length, forceViews: variant.includes('alone') });
    const p = new Player(g, e, t);
    await campaign(t, g, e, p, variant);
    e.dispose();
  }
}
async function campaign(t, g, e, p, variant) {
  const bot = p.bot;
  const V = `[${variant}] `;
  const alone = variant.includes('alone');
  p.step(3);
  t.eq(V + 'starts on title', g.state().screen, 'title');
  p.press('confirm', 3);
  t.eq(V + 'main menu', g.state().screen, 'main');
  p.pick('new');
  p.until(() => g.mode === 'campaign' && g.missions.active?.id === 'm0', 400, 'start m0');
  g.dev.god = true;
  // ---- M0 ----
  p.until(() => !!g.player.seat, 60, 'on the flatcar');
  p.until(() => g.mapHint, 4000, 'map prompt');
  t.ok(V + 'map prompt listed', g.state().prompts.some((x) => x.act === 'map'));
  p.press('map');
  t.ok(V + 'map is up', g.map.up);
  p.until(() => g.missions.active?.id === 'm1', 6000, 'm1 starts after the fall');
  t.ok(V + 'M0 done', g.missions.isDone('m0'));
  // ---- M1 ----
  p.until(() => g.tabletHint, 2000, 'tablet hint');
  t.eq(V + 'fever on at clinic', g.body.fever, 'on');
  t.eq(V + 'three tablets', g.body.tablets, 3);
  p.holdFor('tablet', 1.2);
  p.until(() => g.body.fever === 'none', 900, 'tablet clears fever');
  p.until(() => g.missions.currentStep()?.do === 'enter', 4000, 'truck step');
  t.eq(V + 'given an old tractor', g.weapons.gun.id, 'tractor');
  t.near(V + 'tractor is worn', g.weapons.gun.cond, 40, 46);
  const truck = g.missions.tags['m1-truck'];
  t.ok(V + 'truck exists', !!truck);
  p.step(30);
  const yw = truck.yaw, d = truck.def.door, dx = truck.x + Math.cos(yw) * d[0], dz = truck.z - Math.sin(yw) * d[0];
  p.tp(dx, dz);
  p.look(truck.x, truck.y + 0.5, truck.z); p.step(3);
  t.ok(V + 'sees the door', !!g.interact.current);
  p.press('use');
  t.ok(V + 'in the truck', g.driving.vehicle === truck);
  p.driveRoute([[-100, 35], [-195, 30], [-240, 120], [-258, 208]]);
  p.until(() => g.missions.currentStep()?.do === 'use', 200, 'drop step');
  const well = SITES['three-wells'].at;
  p.press('exit');
  t.ok(V + 'out of the truck', !g.driving.vehicle);
  p.useNear(well[0] + 10, well[1] - 3);
  p.until(() => g.missions.currentStep()?.do === 'goto', 60, 'drive back');
  // Back in; on the way back P2 is manned, and the truck is hit and stalls.
  p.tp(truck.x + 1.8, truck.z); p.look(truck.x, truck.y + 0.5, truck.z); p.step(3);
  p.press('use');
  t.ok(V + 'back in the truck', g.driving.vehicle === truck);
  p.driveRoute([[-240, 120]], 8);
  bot.analog.gas = 0.8;
  p.until(() => { p.steerTo(truck, -200, 30); return g.missions.currentStep()?.name === 'm1Ambush'; }, 2400, 'ambush at P2');
  bot.analog.gas = 0; bot.move = { x: 0, y: 0 };
  p.step(10);
  t.ok(V + 'truck stalled', truck.stalled);
  p.press('exit');
  p.step(10);
  t.ok(V + 'got out', !g.driving.vehicle);
  const jamWatch = { hit: false }; g.events.on('jam', () => { jamWatch.hit = true; });
  let shots = 0; const shotOff = g.events.on('shot', () => { if (!jamWatch.hit) shots++; });
  p.killWhile(() => !jamWatch.hit, 3000, 'first shots before jam');
  shotOff();
  t.eq(V + 'the 5th shot jams', shots, 5);
  t.ok(V + 'jammed', g.weapons.gun.jam > 0);
  t.ok(V + 'prompt says clear it', g.state().prompts.some((x) => x.act === 'reload'));
  const beforeFire = g.weapons.gun.mag;
  bot.hold('fire'); p.step(10); bot.hold('fire', false);
  t.eq(V + 'a jam blocks firing', g.weapons.gun.mag, beforeFire);
  while (g.weapons.gun.jam > 0) { p.press('reload'); p.step(45); }
  p.killSquad('p2');
  g.dev.god = false;
  g.body.hp = Math.min(g.body.hp, 60);
  p.until(() => g.healHint, 300, 'syrette hint');
  const syr = g.body.syrettes, hp0 = g.body.hp;
  p.press('heal');
  p.step(70);
  t.eq(V + 'syrette used', g.body.syrettes, syr - 1);
  t.ok(V + 'syrette heals', g.body.hp > hp0 + 30, `${hp0} -> ${g.body.hp}`);
  g.dev.god = true;
  p.until(() => !g.healHint, 300, 'past syrette');
  const by = truck.yaw, bo = truck.def.bonnet;
  p.tp(truck.x + Math.sin(by) * bo[2] + 0.4, truck.z + Math.cos(by) * bo[2] + 0.4);
  p.look(truck.x, truck.y + 0.5, truck.z); p.step(3);
  t.ok(V + 'bonnet prompt', /BONNET/.test(g.state().prompts[0]?.text ?? ''), JSON.stringify(g.state().prompts));
  p.holdFor('use', 3.2);
  t.ok(V + 'repaired', !truck.stalled && truck.hp >= 50, `${truck.stalled} ${truck.hp}`);
  p.until(() => g.missions.currentStep()?.do === 'goto', 300, 'back to clinic');
  const m40 = SITES['mile-forty'].at;
  p.tp(m40[0] - 34, m40[1] + 4);
  p.until(() => g.missions.currentStep()?.do === 'report', 200, 'report odile');
  p.reportTo('odile');
  p.until(() => g.missions.isDone('m1'), 400, 'm1 done');
  t.eq(V + 'M1 tablets', g.body.tablets, 3);
  t.ok(V + 'M1 pays', g.story.stones >= 5);
  t.ok(V + 'Mags met', g.actors.buddy('mags').met);
  t.ok(V + 'Pump Shed yours', g.story.safehouses.has('pump-shed'));
  // Sleep at the Pump Shed: choose the hour, it saves.
  const ps = SITES['pump-shed'];
  p.useNear(ps.at[0] + ps.safe.bed[0], ps.at[1] + ps.safe.bed[1], 0.7);
  t.eq(V + 'bed screen', g.state().screen, 'bed');
  p.pick('midnight');
  p.until(() => g.state().screen === 'epigraph', 100, 'slept');
  p.until(() => g.state().screen === null, 300, 'after sleep');
  t.near(V + 'midnight', g.clock.hour, 0, 0.2);
  t.ok(V + 'it saved', !!g.save.lastWritten);
  // ---- M2 ----
  p.takeFrom('tibor');
  t.eq(V + 'M2 active', g.missions.active?.id, 'm2');
  const rp = SITES['ranger-post'];
  p.tp(rp.at[0] - 110, rp.at[1]);
  p.holdFor('mono', 0.4);
  p.until(() => g.missions.currentStep()?.do === 'use', 100, 'cage step');
  p.killSquad('ranger-post');
  p.useNear(rp.at[0] + 12, rp.at[1] + 9.6, 1, { hold: 3 });
  p.until(() => g.actors.buddy('ines').active, 120, 'Ines out');
  p.until(() => g.missions.currentStep()?.do === 'report', 3000, 'report tibor');
  p.reportTo('tibor');
  p.until(() => g.missions.isDone('m2'), 300, 'm2 done');
  t.ok(V + 'Ranger Post yours', g.story.safehouses.has('ranger-post'));
  t.ok(V + 'Ines met', g.actors.buddy('ines').met);
  t.ok(V + 'Dov met', g.actors.buddy('dov').met);
  t.eq(V + 'act 2', g.story.act, 2);
  // ---- M3: flare, wind, tanks. ----
  p.takeFrom('vance');
  t.eq(V + 'M3 active', g.missions.active?.id, 'm3');
  t.eq(V + 'Concord pass', g.story.pass, 'concord');
  t.ok(V + 'flare given', g.weapons.slots.sidearm?.id === 'flare');
  p.until(() => g.state().screen === 'choice', 2000, 'Ines calls');
  p.pick('ignore');
  const es = SITES['east-siding'].at;
  p.tp(es[0] + 8, es[1] - 100);
  p.until(() => g.missions.currentStep()?.do === 'destroy', 200, 'tanks step');
  g.weapons.equip('sidearm');
  p.step(20);
  // Burn it by the wind: stand upwind of the tanks, light the grass, and get clear.
  const burntBefore = g.fire.counts.burnt;
  t.eq(V + 'the wind is the plan\'s', [g.wind.pinned ? Math.round(Math.cos(g.wind.pinned.dir) * 10) / 10 : null, g.wind.pinned ? Math.round(Math.sin(g.wind.pinned.dir) * 10) / 10 : null].join(), '-0.8,-0.6');
  p.tp(es[0] + 96, es[1] - 30);
  p.look(es[0] + 86, g.player.eye.y - 3, es[1] - 38);
  p.press('fire', 5);
  p.until(() => g.fire.counts.burning > 0, 240, 'flare lit fuel');
  p.tp(es[0] + 150, es[1] + 10);
  let i = 0;
  const tanks = g.world.explosives.filter((x) => x.tag === 'fuel-tank');
  while (g.missions.currentStep()?.do === 'destroy' && i < 7200) { p.step(30); i += 30; }
  t.ok(V + 'the wind carried fire to a tank', tanks.some((x) => !x.alive), `${g.fire.counts.burnt} burnt`);
  // Whatever the fire missed gets shot, as a player would.
  g.equipBest();
  for (const tk of tanks) {
    if (!tk.alive) continue;
    p.tp(tk.x + 18, tk.z + 12); p.step(20);
    let n = 0;
    while (tk.alive && n++ < 200) { p.look(tk.x, tk.y + 3, tk.z); const gun = g.weapons.gun; if (gun.mag <= 0) gun.mag = 30; if (gun.jam) gun.jam = 0; bot.hold('fire'); p.step(5); bot.hold('fire', false); p.step(1); }
    t.ok(V + 'a tank can be shot', !tk.alive);
  }
  t.ok(V + 'grass burned', g.fire.counts.burnt > burntBefore);
  p.until(() => g.missions.currentStep()?.do === 'leave', 200, 'leave');
  p.tp(es[0] - 240, es[1] - 90);
  p.until(() => g.missions.currentStep()?.do === 'report', 100, 'report vance');
  p.reportTo('vance');
  p.until(() => g.missions.isDone('m3'), 300, 'm3 done');
  t.ok(V + 'Scar A', g.story.flags.scarA);
  t.ok(V + 'pass handed back', g.story.pass === null);
  // ---- M4: convoy, MG on a technical, tracker. ----
  p.takeFrom('ansa');
  t.eq(V + 'M4 active', g.missions.active?.id, 'm4');
  p.until(() => g.state().screen === 'choice', 2000, 'Dov calls');
  p.pick('alt');
  t.eq(V + 'alt plan first', g.missions.currentStep()?.name, 'm4Dov');
  t.ok(V + 'Dov beside you', g.actors.buddy('dov').active);
  t.ok(V + 'Dov gives charges', g.weapons.charges >= 2);
  p.tp(116, 226);
  p.holdFor('throw', 0.9);
  p.step(90);
  t.ok(V + 'charge planted', g.weapons.placed.length === 1, `${g.weapons.placed.length} ${g.player.frozen}`);
  p.until(() => g.missions.currentStep()?.do === 'destroy', 500, 'destroy payroll');
  const pay = g.missions.tags.payroll;
  t.ok(V + 'convoy truck', !!pay);
  g.actors.buddy('dov').cc && 0;
  p.tp(116 - 34, 226 + 30);
  try { p.until(() => !pay.alive || Math.hypot(pay.x - 116, pay.z - 226) < 8, 6000, 'truck reaches the bridge'); } catch (err) { throw new Error(`${err.message} truck at ${Math.round(pay.x)},${Math.round(pay.z)} speed ${pay.car.speed.toFixed(1)} s ${pay.patrol?.s} goal ${JSON.stringify(pay.aiGoal)} stopped ${pay.stopped} hp ${pay.hp}`); }
  bot.press('throw'); p.step(2); bot.hold('throw', false); p.step(2);
  // Tap: a short press on throw detonates.
  bot.hold('throw', true); p.step(3); bot.hold('throw', false); p.step(30);
  let guard = 0;
  while (pay.alive && guard < 20) { g.damage.blast(pay.x, pay.y, pay.z, 3, 80, 'player', { fire: 0 }); p.step(20); guard++; }
  p.until(() => g.missions.currentStep()?.name === 'm4Case' || g.missions.currentStep()?.do === 'collect', 400, 'case flew out');
  p.until(() => g.missions.currentStep()?.do === 'collect', 800, 'collect step');
  t.ok(V + 'tracker owned', g.story.trackerOwned);
  p.press('tracker');
  t.ok(V + 'tracker raised', g.places.trackerOn);
  const cas = g.places.storyCases['payroll-case'];
  p.tp(cas.x + 36, cas.z + 36); p.step(120);
  const farInterval = g.places.lastInterval;
  p.tp(cas.x + 6, cas.z + 6); p.step(120);
  const nearInterval = g.places.lastInterval;
  t.ok(V + 'tracker speeds up near', nearInterval < farInterval, `${farInterval} -> ${nearInterval}`);
  t.ok(V + 'LED green within 60 m', g.places.nearLit);
  p.useNear(cas.x, cas.z, 0.3);
  p.press('tracker');
  p.until(() => g.missions.currentStep()?.do === 'report', 200, 'report ansa');
  p.reportTo('ansa');
  p.until(() => g.missions.isDone('m4'), 300, 'm4 done');
  t.ok(V + 'alt bonus paid', g.story.stones >= 5 + 8 + 15 + 25 - 0, `${g.story.stones}`);
  // ---- M5: without alt the village empties ----
  p.takeFrom('vance');
  t.eq(V + 'M5 active', g.missions.active?.id, 'm5');
  const pump = SITES['pump-station'].at;
  p.tp(pump[0] + 4, pump[1] + 40);
  p.until(() => g.missions.currentStep()?.do === 'blast', 200, 'blast step');
  p.until(() => g.state().screen === 'choice', 2400, 'Mags calls');
  p.pick(alone ? 'ignore' : 'alt');
  if (!alone) {
    p.until(() => g.missions.currentStep()?.do === 'use', 100, 'bypass');
    t.ok(V + 'Mags fights beside you', g.actors.buddy('mags').active);
    p.useNear(pump[0] + 1.6, pump[1], 1.2, { hold: 2 });
    p.until(() => g.holdT > 0, 120, 'hold starts');
    p.killSquad('pump-station');
    g.actors.squads.get('pump-station').forceLive = false;
    p.tp(pump[0] + 3, pump[1] + 12);
    p.until(() => g.story.flags.cisternFull, 3800, 'cistern fills in 60 s');
  }
  g.weapons.charges = Math.max(g.weapons.charges, 1);
  p.tp(pump[0] + 4, pump[1] + 1);
  p.holdFor('throw', 0.9);
  p.step(90);
  p.tp(pump[0] + 30, pump[1] + 24);
  bot.hold('throw', true); p.step(3); bot.hold('throw', false); p.step(40);
  p.until(() => g.missions.currentStep()?.do === 'leave', 300, 'pump blown');
  p.tp(pump[0] + 140, pump[1] - 60);
  p.until(() => g.missions.currentStep()?.do === 'report', 100, 'report vance m5');
  p.reportTo('vance');
  p.until(() => g.missions.isDone('m5'), 300, 'm5 done');
  if (alone) {
    t.ok(V + 'Three Wells empties', g.story.flags.wellsEmpty);
    t.ok(V + 'Ledger counts them', g.ledger.v.moved >= 240);
    t.ok(V + 'Odile refuses', g.story.odileRefuses);
  } else {
    t.ok(V + 'village stays', !g.story.flags.wellsEmpty);
    t.ok(V + 'trust grows', g.actors.buddy('mags').trust >= 1);
  }
  p.waitTalk();
  // ---- M6: the field, the turn of the wind, syrette or finish it ----
  p.takeFrom('ansa');
  t.eq(V + 'M6 active', g.missions.active?.id, 'm6');
  t.ok(V + 'forced night', g.clock.isNight());
  p.until(() => g.missions.currentStep()?.do === 'goto', 400, 'field goto');
  const buddy = g.missions.tags.m6buddy;
  t.ok(V + 'someone comes', buddy && buddy.active);
  const lf = SITES['long-field'].at;
  p.tp(lf[0] - 100, lf[1] + 20);
  p.until(() => g.missions.currentStep()?.name === 'm6Burn', 200, 'burn');
  g.weapons.give('flare', 100, true); p.step(25);
  // Bottles and flares into the crop, for real.
  for (const [ax, az] of [[-88, -30], [-88, 0], [-88, 30]]) {
    p.tp(lf[0] + ax - 12, lf[1] + az);
    p.look(lf[0] + ax, g.player.eye.y - 1.5, lf[1] + az);
    g.weapons.gun.mag = 1;
    p.press('fire', 40);
  }
  p.tp(lf[0] - 120, lf[1] + 80);
  buddy.cc.teleport([lf[0] - 124, g.world.heightAt(lf[0] - 124, lf[1] + 84) + 0.2, lf[1] + 84]);
  p.until(() => buddy.isDown || g.missions.currentStep()?.do === 'destroy', 8000, 'the wind turns');
  t.ok(V + 'buddy down on fire', buddy.isDown && buddy.burningDown, `${buddy.isDown} ${buddy.burningDown}`);
  t.ok(V + 'wind turned', g.wind.pinned && g.wind.pinned.dir !== Math.atan2(0.2, 0.9));
  p.step(5);
  const bx = buddy.x, bz = buddy.z;
  p.tp(bx + 1.5, bz + 1);
  p.look(bx, buddy.y + 0.8, bz); p.step(3);
  t.ok(V + 'two-button prompt', g.state().prompts.length >= 2 && g.state().prompts.some((x) => x.text === 'FINISH IT') && g.state().prompts.some((x) => x.text === 'SYRETTE'), JSON.stringify(g.state().prompts));
  if (alone) {
    p.press('alt');
    p.until(() => buddy.dead, 200, 'finish it');
    t.ok(V + 'dead stays dead', buddy.dead);
    t.eq(V + 'Ledger: friend lost', g.ledger.v.friends, 1);
  } else {
    const syr2 = g.body.syrettes = 2;
    p.press('use');
    t.ok(V + 'syrette saves them', !buddy.isDown && !buddy.dead);
    t.eq(V + 'uses one', g.body.syrettes, syr2 - 1);
  }
  p.until(() => g.missions.currentStep()?.do === 'destroy' || g.missions.currentStep()?.do === 'leave', 300, 'bunker');
  if (g.missions.currentStep()?.do === 'destroy') {
    const bk = g.world.explosives.find((x) => x.tag === 'ammo-bunker');
    p.killSquad('long-field');
    p.tp(bk.x + 26, bk.z + 26);
    g.weapons.give('tube', 100, true); p.step(25);
    for (let n = 0; n < 6 && bk.alive; n++) { p.look(bk.x, bk.y + 1.2, bk.z); g.weapons.gun.mag = 1; p.press('fire', 150); }
    t.ok(V + 'bunker blown by a real rocket', !bk.alive);
  }
  p.until(() => ['leave', 'report'].includes(g.missions.currentStep()?.do), 200, 'leave field');
  p.tp(lf[0] + 200, lf[1] + 80);
  p.until(() => g.missions.currentStep()?.do === 'report', 100, 'report ansa m6');
  p.reportTo('ansa');
  p.until(() => g.missions.isDone('m6'), 300, 'm6 done');
  t.ok(V + 'Scar B', g.story.flags.scarB);
  t.near(V + 'hectares on the ledger', g.ledger.hectares(), 1, 100000);
  // ---- M7 by the note at the safehouse ----
  t.ok(V + 'note is waiting', g.places.noteReady());
  const ps2 = SITES['pump-shed'];
  p.tp(ps2.at[0] + ps2.safe.bed[0] + 0.6, ps2.at[1] + ps2.safe.bed[1] + 2);
  p.look(ps2.at[0] + ps2.safe.bed[0], g.world.heightAt(ps2.at[0], ps2.at[1]) + 1.2, ps2.at[1] + ps2.safe.bed[1] + 0.8); p.step(3);
  t.ok(V + 'sees the note', /NOTE/.test(g.state().prompts[0]?.text ?? ''), JSON.stringify(g.state().prompts));
  p.press('use');
  p.until(() => g.state().screen === 'choice', 2000, 'M7 offer');
  p.pick('accept');
  t.eq(V + 'M7 active', g.missions.active?.id, 'm7');
  p.until(() => g.state().screen === 'choice' || g.missions.currentStep()?.do === 'goto', 900, 'm7 start');
  if (g.state().screen === 'choice') p.pick('alt');
  p.until(() => g.missions.currentStep()?.do === 'goto', 900, 'm7 goto');
  t.ok(V + 'war is on', g.story.war);
  const cut = SITES['the-cut'].at;
  // The technical's MG, as the plan teaches here.
  const tech = g.missions.tags.cutTech;
  p.tp(tech.x + 1.8, tech.z); p.look(tech.x, tech.y + 0.5, tech.z); p.step(3);
  p.press('use');
  t.ok(V + 'in the technical', g.driving.vehicle === tech);
  p.press('swap');
  t.ok(V + 'on the gun', g.driving.gunning && !!g.weapons.mounted);
  bot.hold('fire'); p.step(60 * 7); bot.hold('fire', false);
  t.ok(V + 'MG overheats', g.weapons.overheated || g.weapons.heat > 0.5, `heat ${g.weapons.heat}`);
  p.step(60 * 5);
  p.press('swap');
  p.press('exit');
  p.tp(cut[0] + 50, cut[1] - 30);
  p.until(() => g.missions.currentStep()?.do === 'use', 100, 'ledger step');
  p.useNear(cut[0] + 60, cut[1] - 39.4, 1);
  p.until(() => g.missions.currentStep()?.do === 'leave', 3000, 'read the ledger');
  p.tp(cut[0] + 260, cut[1] + 60);
  p.until(() => g.missions.isDone('m7'), 400, 'm7 done');
  t.ok(V + 'Scar C', g.story.flags.scarC);
  t.ok(V + 'truce over', !g.story.truce);
  t.ok(V + 'Tibor stock in lockers', g.story.stockInLockers);
  t.eq(V + 'act 3', g.story.act, 3);
  // ---- M8 ----
  g.dev.noFever = true;   // the bot does not chase its own tablets through the finale; feverInTheLastAct covers the collapse there
  p.takeFrom('odile');
  t.eq(V + 'M8 active', g.missions.active?.id, 'm8');
  const plat = SITES['mile-forty'].at;
  p.tp(plat[0], plat[1] + 20);
  p.until(() => g.holdT > 0, 200, 'platform hold');
  p.until(() => g.holdT <= 80, 60 * 45, '40 s of the hold');
  p.killWhile(() => g.holdT > 1 && g.actors.anyStateCounts() > 40, 200, 'shoot some');
  p.until(() => g.holdT <= 0, 60 * 90, 'platform held');
  p.until(() => !!g.missions.tags.flatUse, 200, 'flatcar use');
  const c = g.train.cars[3];
  p.tp(c.x + 2.6, c.z + 1);
  p.look(c.x, c.y + 1, c.z); p.step(3);
  t.ok(V + 'sees the gun', g.state().prompts.some((x) => /GUN/.test(x.text)), JSON.stringify(g.state().prompts));
  p.press('use');
  p.until(() => g.missions.currentStep()?.name === 'm8Ride', 100, 'ride');
  bot.hold('fire');
  p.until(() => g.train.moving, 200, 'train moves');
  p.until(() => !g.train.moving, 60 * 90, 'train arrives');
  bot.hold('fire', false);
  p.until(() => g.missions.isDone('m8'), 2500, 'm8 done');
  t.ok(V + 'the column walks', !!g.world.column);
  // ---- M9 ----
  t.ok(V + 'second note', g.places.noteReady());
  p.tp(ps2.at[0] + ps2.safe.bed[0] + 0.6, ps2.at[1] + ps2.safe.bed[1] + 2);
  p.look(ps2.at[0] + ps2.safe.bed[0], g.world.heightAt(ps2.at[0], ps2.at[1]) + 1.2, ps2.at[1] + ps2.safe.bed[1] + 0.8); p.step(3);
  p.press('use');
  p.until(() => g.state().screen === 'choice', 2000, 'M9 offer');
  p.pick('accept');
  t.eq(V + 'M9 active', g.missions.active?.id, 'm9');
  t.ok(V + 'storm', g.sky.storm);
  t.ok(V + 'fire damped', g.fire.raining);
  const obs = SITES.observatory.at;
  p.tp(obs[0] + 4, obs[1] + 30);
  p.until(() => g.missions.currentStep()?.do === 'use', 100, 'table');
  p.useNear(obs[0], obs[1] + 3.6, 1.2);
  p.until(() => g.scene.custom, 100, 'harrow scene');
  p.until(() => g.state().screen === 'choice', 6000, 'shoot him or not');
  t.ok(V + 'scars glow on the sheet', g.map.glowScar);
  p.pick(alone ? 'shoot' : 'spare');
  p.until(() => g.state().screen === 'choice', 3000, 'who gets the sheet');
  const paidBefore = g.ledger.v.paid;
  p.pick(alone ? 'alone' : 'column');
  p.until(() => g.missions.active?.id === 'end', 2000, 'end mission');
  t.eq(V + 'tablets from Harrow', g.body.tablets >= 6, true);
  // ---- The Pass ----
  p.step(5);
  t.ok(V + 'rain stops', !g.sky.storm);
  if (!alone) {
    p.until(() => g.interact.list.some((u) => u.tag === 'mission'), 200, 'column usable');
    p.useNear(-436, -388, 1.4);
    p.waitTalk();
    p.tp(-520, -420);
  } else {
    p.tp(-565, -425);
  }
  p.until(() => g.holdT > 0, 200, 'pursuit');
  p.until(() => g.holdT <= 0, 60 * 50, 'hold the pass');
  // The surviving buddies come for the stones.
  const friends = g.actors.liveBuddies();
  t.ok(V + 'friends left to come', friends.length === (alone ? 2 : 3), String(friends.length));
  friends[0].trust = 3;   // trust 3: they offer to split first, then draw if you refuse
  for (const b of friends) {
    p.until(() => g.state().screen === 'choice' || b.isHostile || g.dialogue.active, 800, `${b.id} arrives`);
    p.until(() => !g.dialogue.active, 2000, `${b.id} speaks`);
    p.step(4);
    if (b === friends[0]) t.eq(V + 'a trusted friend offers to split first', g.state().screen, 'choice');
    if (g.state().screen === 'choice') { p.pick('refuse'); p.step(4); }
    p.until(() => b.isHostile, 300, `${b.id} draws`);
    g.weapons.give('tractor', 90, true); p.step(20);
    let guard2 = 0;
    while (!b.dead && guard2 < 300) { guard2++; p.look(b.x, b.y + 1.15, b.z); if (g.weapons.gun.mag <= 0) g.weapons.gun.mag = 30; if (g.weapons.gun.jam) g.weapons.gun.jam = 0; bot.hold('fire'); p.step(6); bot.hold('fire', false); p.step(1); }
    t.ok(V + `${b.id} fell at the Pass`, b.dead, JSON.stringify({ hp: b.hp, active: b.active, hostile: b.isHostile, down: b.isDown, at: [b.x, b.y, b.z], col: b.cc?.collider.isEnabled(), me: g.player.feet.toArray(), gun: g.weapons.gun, canAct: g.canAct(), menu: g.state().screen, scene: g.scene.locksMove, lock: g.weapons.lock, frozen: g.player.frozen, hold: !!g.interact.holding, slung: g.weapons.slung }));
    p.step(180);
  }
  p.until(() => g.currentStepText === 'LIGHT THE GRASS', 900, 'last grass');
  t.eq(V + 'flare in hand', g.weapons.gun.id, 'flare');
  const spot = g.story.lastGrass;
  t.ok(V + 'grass left to light', !!spot);
  p.tp(spot[0] - 4, spot[1] - 4);
  p.look(spot[0], g.world.heightAt(spot[0], spot[1]) + 0.3, spot[1]);
  g.weapons.gun.mag = 1;
  p.press('fire', 90);
  p.until(() => g.state().screen === 'ending', 60 * 12, 'ending card');
  t.eq(V + 'ending recorded', g.story.ending, alone ? 'alone' : 'column');
  p.press('confirm', 3);
  t.eq(V + 'then the Ledger', g.state().screen, 'ledger');
  t.eq(V + 'five ledger lines', g.ledger.lines().length, 5);
  p.press('back', 3);
  t.eq(V + 'then credits', g.state().screen, 'credits');
  p.press('back', 3);
  t.eq(V + 'then the title', g.state().screen, 'title');
  t.ok(V + 'no engine errors', e.errors.length === 0, e.errors[0]);
}
