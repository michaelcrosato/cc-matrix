// The scripted beats of the story. Everything else in missions.js is plain data.
import { LINES } from '../content/dialogue.js';
import { RAILWAY, ROADS } from '../content/roads.js';
import { siteById } from '../content/sites.js';
import { TUNING } from '../core/tuning.js';
import { dist2, polyPoint } from '../world/geom.js';
import { BURNING, BURNT, cellX, cellZ, FIRE_N } from '../world/fire.js';
const fieldProgress = (g) => { const f = g.world.fire, site = siteById['long-field']; let tot = 0, lit = 0; const x0 = site.at[0] - 90, z0 = site.at[1] - 60; for (let z = z0; z < z0 + 120; z += 5) for (let x = x0; x < x0 + 180; x += 5) { const i = Math.floor((x + 640) / 5) + Math.floor((z + 640) / 5) * FIRE_N; tot++; if (f.state[i] === BURNING || f.state[i] === BURNT) lit++; } return lit / tot; };
export const SCRIPTS = {
  // ----- M0 -----
  m0Ride: {
    start(g, s, st) {
      const t = g.train, q = {}; polyPoint(RAILWAY, 0, q);
      t.s = t.sToward(-520, 106); t.topSpeed = 13; t.goal = t.sToward(14, 68); t.place();
      g.setRiding(t); g.world.setHour(18.2, true); g.world.sites['p2'].dormant = true;
      g.player.setYaw(Math.PI * 0.5 + Math.PI, -0.05);
      st.over = false; g.player.items.map = true; g.audio.play('train-whistle', { volume: 0.6 });
      // Your head stays your own on the flatcar, so this Timeline has lines but no camera shots.
      g.scenes.play({ lines: [s.lines], duration: s.seconds, onEnd: () => { st.over = true; } });
    },
    tick(g, s, st) { return st.over; },
  },
  m0Map: {
    start(g, s, st) { st.upT = 0; g.story.marginNote = 'MIND THE FEVER. YOU ARE LATE ALREADY. E.H.'; g.prompt.flash('map', 'RAISE YOUR MAP'); st.nag = 0; },
    tick(g, s, st, dt) { st.nag -= dt; if (st.nag <= 0 && !g.player.mapUp) { st.nag = 2; g.prompt.flash('map', 'RAISE YOUR MAP'); } if (g.player.mapUp) st.upT += dt; if (st.upT > 3) { return true; } return g.skipPressed(); },
  },
  m0Fever: {
    start(g, s, st) { st.phase = 0; st.left = 14; g.body.fever = 0; g.body.feverActive = true; g.body.feverIgnored = -1e9; g.train.setAt(10, 70); g.setRiding(null); g.player.teleport(3, 63); g.player.mapUp = false; g.prompt.flash('jump', 'GET OFF THE TRAIN'); },
    tick(g, s, st, dt) { st.left -= dt; if (st.left <= 0 || g.skipPressed()) return true; return false; },
    end(g) { g.body.feverActive = false; g.body.fever = 0; g.body.feverNext = 1e9; g.world.sites['p2'].dormant = false; g.blackout('', null, 1.2); },
  },
  // ----- M1 -----
  m1Wake: {
    start(g, s, st) { g.body.fever = 0.8; g.body.feverActive = true; g.body.feverIgnored = -1e9; g.player.tablets = Math.max(1, g.player.tablets); st.taken = false; st.off = g.events.on('tablet', () => { st.taken = true; }); g.prompt.flash('tablet', 'TAKE THE TABLET'); st.nag = 3; g.autoWaypoint(); },
    tick(g, s, st, dt) { st.nag -= dt; if (st.nag <= 0 && !st.taken) { st.nag = 3; g.prompt.flash('tablet', 'HOLD TO TAKE THE TABLET'); } return st.taken; },
    end(g, s, st) { st.off?.(); },
  },
  m1Ambush: {
    start(g, s, st) { st.unjam = false; st.off = g.events.on('unjam', () => { st.unjam = true; }); const gun = g.player.guns.main; if (gun) gun.scriptedJam = 5; st.target = [-200, 30]; g.world.sites.p2.dormant = false; g.world.sites.p2.cleared = false; g.world.sites.p2.clearedAt = -1e9; },
    tick(g, s, st) {
      const p = g.player, d = dist2(p.x, p.z, -200, 30), v = g.vehicles.list.find((o) => o.tag === 'clinic-truck');
      if (d < 55 && v && !v.stalled && p.vehicle === v) { v.hp = 0; v.stalled = true; g.audio.at('stall', v.x, v.y, v.z, 50); g.talk.playLines('m1.stall'); }
      if (st.unjam) return true;
      const gun = p.guns.main; if (gun?.jammed) g.prompt.flash('reload', 'CLEAR THE JAM');
      const cleared = g.world.sites.p2.cleared || d > 300;
      if (d < 55 && cleared && !gun?.scriptedJam) return true;
      if (d < 70 && !gun?.jammed && gun && !gun.scriptedJam && gun.cond === 45) gun.scriptedJam = 5;
      return false;
    },
    end(g, s, st) { st.off?.(); },
  },
  m1Repair: {
    start(g, s, st) { const v = g.vehicles.list.find((o) => o.tag === 'clinic-truck'); st.v = v; if (v) { if (g.player.vehicle === v) g.vehicles.exit(true); v.stalled = true; v.hp = 0; st.target = [v.x, v.z]; } },
    tick(g, s, st) { const v = st.v; if (!v) return true; if (!v.stalled) return true; return false; },
  },
  m1Syrette: {
    start(g, s, st) { st.taken = false; st.off = g.events.on('syrette', () => { st.taken = true; }); if (g.player.hp > 70) g.player.hp = 62; g.player.syrettes = Math.max(1, g.player.syrettes); g.prompt.flash('heal', 'USE A SYRETTE'); st.nag = 3; },
    tick(g, s, st, dt) { st.nag -= dt; if (st.nag <= 0 && !st.taken) { st.nag = 3; g.prompt.flash('heal', 'HOLD TO USE A SYRETTE'); } return st.taken; },
    end(g, s, st) { st.off?.(); },
  },
  // ----- M2 -----
  freeInes: { run(g) { const site = g.world.sites['ranger-post'], door = site.cage?.object.getObjectByName('Door'); if (door) door.rotation.y = -1.9; g.people.leaveCage(); g.audio.play('door'); g.buddies.state.ines.met = true; const a = g.buddies.spawnFollower('ines', siteById['ranger-post'].at[0] + 9, siteById['ranger-post'].at[1] + 7); a.state = 'alert'; } },
  m2Clear: {
    start(g, s, st) { st.target = siteById['ranger-post'].at; },
    tick(g, s, st) { const site = g.world.sites['ranger-post']; return site.cleared || dist2(g.player.x, g.player.z, site.def.at[0], site.def.at[1]) > 140; },
    end(g) { g.world.sites['ranger-post'].cleared = true; g.world.sites['ranger-post'].clearedAt = 1e9; },
  },
  // ----- M4 -----
  plantBridge: { run(g) { const c = g.spawnCharge(120, g.world.land.heightAt(120, 244) + 0.1, 244); g.player.planted.push(c); g.missions.st.bridgePlanted = true; g.story.bridgeCharge = c; g.notice('PRESS THROW TO DETONATE'); } },
  m4Convoy: {
    start(g, s, st) {
      for (const v of [...g.vehicles.list]) if (v.tag === 'payroll' || v.tag === 'escort') g.vehicles.remove(v); // Taking Dov's plan reroutes the convoy.
      st.off?.();
      const usesBridge = g.story.altTaken?.m4;
      const road = usesBridge ? ROADS.back.slice().reverse() : ROADS.salt.slice(4).concat(ROADS.salt.slice(4, 5));
      const start = road[0];
      st.target = usesBridge ? [120, 230] : siteById['salt-pan'].at;
      st.convoy = [];
      const specs = [['technical', 0], ['cargo-truck', 1], ['technical', 2]];
      for (const [type, i] of specs) { const v = g.vehicles.spawn(type, start[0] + (usesBridge ? 8 * i : -8 * i), start[1] - 4 * i, Math.atan2(road[1][0] - start[0], road[1][1] - start[1]), i === 1 ? 'payroll' : 'escort'); v.aiRoad = road; v.aiLoop = !usesBridge; v.aiSpeed = 10; v.aiS = 0; v.hostile = 'concord'; st.convoy.push(v); }
      st.truck = st.convoy[1];
      st.off = g.events.on('stalled', (v) => { if (v.hostile) g.spawnCrew(v); });
    },
    tick(g, s, st) { const t = st.truck; if (!t) return true; if (t.dead || t.stalled) { const x = t.x + 18, z = t.z - 14; g.spawnStonePickup(x, z, 'payroll-case', g.story.bridgeCharge ? 6 : 8); g.talk.say('you', 'THE CASE WENT FLYING. RAISE THE TRACKER.', 4); g.story.caseAt = [x, z]; return true; } return false; },
    end(g, s, st) { st.off?.(); },
  },
  // ----- M5 -----
  openBypass: { run(g) { g.audio.play('wrench'); g.story.bypassOpen = true; g.notice('THE CISTERN IS FILLING'); } },
  m5Consequence: { run(g) { const alt = g.story.altTaken?.m5 && g.story.bypassOpen; if (!alt) { g.story.threeWellsEmpty = true; g.story.ledger.moved += 104; g.story.odileRefuses = true; g.people.emptyThreeWells(); g.setHutsDark(true); g.talk.playLines('m5.empty'); } } },
  // ----- M6 -----
  m6Partner: {
    start(g, s, st) { g.world.setHour(23, true); st.target = [-260, -180]; const id = g.buddies.highestTrust() ?? 'pell'; st.id = id; g.story.m6Partner = id; const p = g.player; const a = g.buddies.spawnFollower(id, p.x + 3, p.z + 3); a.invulnerable = true; /* The plot takes them at the wind's turn, and nothing may take them sooner. */ st.a = a; g.missions.st.partner = a; g.talk.say(id, id === 'pell' ? 'I am Pell. The Mother sent me. I do not know why.' : 'So we burn a farm. I have burned worse for less.', 5); },
    tick() { return true; },
    end(g, s, st) { g.story.m6PartnerActor = st.a; },
  },
  m6Burn: {
    start(g, s, st) { st.target = [-260, -240]; st.bunker = false; st.off = g.events.on('destroyed', (d) => { if (d.tag === 'ammo-bunker') st.bunker = true; }); },
    tick(g, s, st) { const a = g.story.m6PartnerActor; if (a?.burning > 0) a.burning = 0; const k = fieldProgress(g); st.progress = k; return k > 0.45 || (st.bunker && k > 0.1); },
    end(g, s, st) { st.off?.(); },
  },
  m6Turn: {
    start(g, s, st) { st.t2 = 0; g.world.pinWind({ dir: [0, 1], speed: 7.5 }); g.talk.playLines('m6.turn'); const a = g.story.m6PartnerActor; if (a) a.duty = 'guard'; },
    tick(g, s, st, dt) { st.t2 += dt; const a = g.story.m6PartnerActor; if (!a || !a.alive) return true; if (st.t2 > 4 && !a.down) { a.invulnerable = false; g.world.fire.ignite(a.x, a.z, 4); g.actors.goDown(a, { fire: true }); } return a.down || st.t2 > 8; },
  },
  m6Choice: {
    start(g, s, st) { const a = g.story.m6PartnerActor; if (a) st.target = [a.x, a.z]; },
    tick(g, s, st) { const a = g.story.m6PartnerActor; if (!a) return true; if (a.down) { st.target = [a.x, a.z]; a.downT = Math.max(a.downT, 3); } return !a.down || !a.alive; },
    end(g) { g.story.ledger.hardLine = true; },
  },
  // ----- M7 -----
  m7Note: { start(g, s, st) { st.t3 = 0; }, tick(g, s, st, dt) { st.t3 += dt; return st.t3 > 2.5; } },
  m7Fight: {
    start(g, s, st) {
      g.warOn = true; st.target = [104, -322]; const at = siteById['the-cut'].at;
      g.spawnSquad('concord', at[0] + 60, at[1] + 50, 6, 'm7'); g.spawnSquad('harvest', at[0] - 40, at[1] + 60, 6, 'm7'); g.spawnSquad('harvest', at[0] + 70, at[1] - 30, 4, 'm7');
      if (!g.missions.altTaken) g.world.fire.ignite(at[0] + 110, at[1] + 40, 8); g.world.fire.ignite(at[0] - 96, at[1] + 30, 8); // On the alternate plan your friend holds that east road.
      if (g.missions.altTaken) { const b = g.buddies.followers[0]; if (b) { b.duty = 'guard'; b.ctrl?.teleport([at[0] + 96, g.world.land.heightAt(at[0] + 96, at[1]) + 0.1, at[1]]); } }
      const tech = g.vehicles.spawn('technical', at[0] + 60, at[1] + 80, 3.1, 'm7-tech'); st.tech = tech;
    },
    tick(g, s, st) { return dist2(g.player.x, g.player.z, 104, -322) < 16; },
  },
  m7Consequence: { run(g) { const st = g.story; st.truceOver = true; st.act = 3; g.warOn = false; for (const id of ['tractor', 'mule', 'empire', 'weed', 'tube']) if (st.bought?.[id]) st.lockerAll = true; st.lockerAll = true; g.world.sites['mile-forty'].truceOver = true; g.vehicles.list.filter((v) => v.tag === 'm7-tech').forEach((v) => { v.tag = null; }); } },
  // ----- M8 -----
  m8Ride: {
    start(g, s, st) {
      const t = g.train; t.setAt(10, 70); t.topSpeed = 11; t.goal = t.sToward(416, -64);
      g.setRiding(t, true); g.audio.play('train-whistle', { volume: 0.7 }); st.t4 = 0; st.spawnT = 3; g.player.setYaw(-Math.PI / 2 + Math.PI, 0); g.talk.playLines('m8.bakr');
    },
    tick(g, s, st, dt) { st.t4 += dt; st.spawnT -= dt; if (st.spawnT <= 0) { st.spawnT = 7; const t = g.train, q = {}; polyPoint(RAILWAY, Math.min(t.L, t.s + 70), q); g.spawnSquad(g.combat.rng.next() < 0.5 ? 'concord' : 'harvest', q.x + 18, q.z + 22, 3, 'm8'); } if (g.skipPressed()) return true; return st.t4 >= s.seconds; },
    end(g) { g.setRiding(null); g.player.teleport(418, -68); },
  },
  m8End: { start(g, s, st) { st.t5 = 0; g.people.startColumn(); g.story.ledger.moved += 306; g.notice('THE COLUMN IS ON YOUR MAP'); }, tick(g, s, st, dt) { st.t5 += dt; return st.t5 > 8 || g.skipPressed(); } },
  // ----- M9 -----
  m9Scene: {
    start(g, s, st) {
      st.done = false; const site = siteById.observatory, table = [site.at[0], g.world.land.heightAt(site.at[0], site.at[1]) + 0.8, site.at[1] + 0.8];
      g.mapTex.arc = true; g.showTableMap(table);
      const key = (at, up, back) => ({ at, position: [table[0], table[1] + up, table[2] + back], target: table });
      const lines = g.talk.linesOf(s.lines), length = lines.reduce((n, [, l]) => n + Math.max(1.8, l.length * 0.07) + 0.25, 1);
      const lamp = g.ctx.lights.request({ position: [table[0], table[1] + 0.9, table[2] + 0.1], color: 0xffe6c0, intensity: 2.2, radius: 7, priority: 6 }); // A storm outside, and the map has to be read.
      g.scenes.play({ shots: [key(0, 1.1, 0.8), key(length, 0.62, 0.42)], lines: [s.lines], duration: length, shield: true, onEnd: () => { lamp?.release(); st.done = true; g.showTableMap(null); g.player.tablets += 3; g.notice('HE PUSHES THREE TABLETS ACROSS THE TABLE'); g.hud.touch(); } });
    },
    tick(g, s, st) { return st.done; },
  },
  m9Finish: {
    start(g, s, st) {
      st.done = false;
      g.talk.startScene({ speaker: 'harrow', lines: [], choices: [{ text: 'FINISH YOUR CONTRACT', fn: () => { const n = g.people.npcs.harrow; g.vm.playTool('Finish', ['tool-revolver']); g.ctx.tweens.call(1.5, () => { g.audio.play('gun-revolver'); n.view.setFull('Death', true); g.story.ledger.harrow = 'shot'; g.story.ledger.killed += 1; }); g.ctx.tweens.call(1.8, () => g.talk.playLines('m9.shot')); g.ctx.tweens.call(3.2, () => { st.done = true; }); } }, { text: 'LEAVE HIM TO THE FEVER', fn: () => { g.story.ledger.harrow = 'spared'; g.talk.playLines('m9.spared'); g.ctx.tweens.call(2.4, () => { st.done = true; }); } }] });
    },
    tick(g, s, st) { return st.done; },
  },
  m9Sheet: {
    start(g, s, st) {
      st.done = false;
      g.talk.startScene({ at: [g.player.x, g.player.y + 1.3, g.player.z + 3], lines: [], choices: [{ text: 'WALK OUT WITH THE SHEET', fn: () => { g.story.ending = 'walk'; st.done = true; } }, { text: 'GIVE IT TO THE COLUMN', fn: () => { g.story.ending = 'column'; st.done = true; } }] });
    },
    tick(g, s, st) { return st.done; },
    end(g) { const n = g.people.npcs.harrow; if (g.story.ledger.harrow === 'spared') n.gone = true; },
  },
  // ----- The Pass -----
  endGo: {
    start(g, s, st) { st.d = false; g.world.setWeather('clear'); g.blackout('', () => { g.world.setHour(5.4, true); g.player.teleport(-500, -420); g.player.setYaw(Math.PI / 2, 0); st.target = [-590, -430]; g.talk.playLines(g.story.ending === 'walk' ? 'end.walk' : 'end.column'); if (g.story.ending === 'column') g.people.column && (g.people.column.s = g.people.column.L - 80); st.d = true; }, 1.2); st.target = [-590, -430]; },
    tick(g, s, st) { return st.d && dist2(g.player.x, g.player.z, -590, -430) < 60; },
  },
  endStand: {
    start(g, s, st) { st.left = 40; st.wave = 1; g.hud.holdTimer = st.left; },
    tick(g, s, st, dt) { st.left -= dt; st.wave -= dt; g.hud.holdTimer = st.left; if (st.wave <= 0) { st.wave = 12; const a = g.combat.rng.range(-0.8, 0.8); g.spawnSquad(g.combat.rng.next() < 0.5 ? 'concord' : 'harvest', -590 + Math.cos(a) * 60, -430 + Math.sin(a) * 60, 3, 'pass'); } if (st.left <= 0) { g.hud.holdTimer = null; return true; } return false; },
  },
  endBuddies: {
    start(g, s, st) {
      st.list = []; const alive = g.buddies.alive(); st.done = alive.length === 0;
      g.warOn = false; g.actors.list.filter((a) => a.tag === 'pass').forEach((a) => { a.state = 'searching'; });
      const spawn = () => { alive.forEach((id, i) => { const a = g.actors.spawn({ kind: 'soldier', faction: 'friends-end', role: 'rifle', tag: 'end-buddy', modelId: id, x: g.player.x + 16 + i * 4, z: g.player.z + 12 - i * 5, hp: 200, duty: 'guard' }); a.hp = 200; a.maxHp = 200; a.state = 'alert'; a.reaction = 2; st.list.push(a); g.talk.playLines(`end.${id}`); }); };
      const high = alive.some((id) => g.buddies.state[id].trust >= 3);
      if (high && alive.length) g.talk.startScene({ lines: ['end.split'], at: [g.player.x + 8, g.player.y + 1.4, g.player.z + 8], choices: [{ text: 'SPLIT IT', fn: () => { g.notice('THEY DRAW ANYWAY'); g.story.ledger.stones = Math.floor(g.story.ledger.stones * 0.7); spawn(); } }, { text: 'NO', fn: spawn }] });
      else if (alive.length) spawn();
    },
    tick(g, s, st) { return st.done || (st.list.length > 0 && st.list.every((a) => !a.alive)); },
    end(g, s, st) { for (const a of st.list) if (a.buddy) a.buddy = null; for (const id of g.buddies.alive()) { g.buddies.state[id].alive = false; g.story.ledger.friends++; } },
  },
  endLight: {
    start(g, s, st) { st.used = false; const u = { x: g.player.x + 2, z: g.player.z + 2, y: g.player.y + 0.5, label: 'LIGHT THE GRASS', r: 200, anyAngle: true, hold: 1, fn: () => { st.used = true; g.world.fire.ignite(g.player.x + 6, g.player.z + 6, 6); g.audio.play('lighter'); g.world.pinWind({ dir: [1, 0.3], speed: 6 }); } }; g.prompt.missionUse.push(u); },
    tick(g, s, st, dt) { if (st.used) { st.after = (st.after ?? 0) + dt; return st.after > 9; } return false; },
  },
  endFinish: {
    run(g) {
      const p = g.player, y = p.y, wind = g.world.wind, far = [p.x + wind.x * 60, y + 2, p.z + wind.z * 60];
      g.scenes.play({ shots: [{ at: 0, position: [p.x, y + 1.55, p.z], target: far }, { at: 5, position: [p.x - wind.x * 5, y + 5, p.z - wind.z * 5], target: far }, { at: 10, position: [p.x - wind.x * 14, y + 16, p.z - wind.z * 14], target: far }],
        lines: [g.story.ending === 'walk' ? 'end.last.walk' : 'end.last.column'], linesAt: 1, duration: 10, shield: true, onEnd: (aborted) => { if (!aborted) g.finishGame(); } });
    },
  },
};
export { LINES, TUNING, cellX, cellZ };
