// The scripted pieces, as coroutines: yield seconds, or a predicate to wait on. Driven once per fixed step, so they replay.
import { SITES, POSTS } from '../content/sites.js';
import { ROADS, RAIL, STRIPS } from '../content/roads.js';
import { CONTRACT_NOTE } from '../content/notes.js';
import { LINES } from '../content/dialogue.js';
import { TUNING } from '../core/tuning.js';
import { polyLength, pointAlong } from '../world/ground.js';
import { S, FN } from '../world/fire.js';
import { clamp } from '../core/rng.js';
const until = (f) => f;
const hearing = (g) => () => !g.dialogue.active;
function* say(g, key) { g.dialogue.play(key); yield hearing(g); }
function eventFlag(g, name) { const o = { hit: false }; o.off = g.events.on(name, () => { o.hit = true; }); return o; }

export function makeScripts() {
  return {
    // ---- M0: the flatcar in, the map, the margin, the platform, the fall ----
    * m0(g, r) {
      const tr = g.train;
      g.clock.set(18.2); g.wind.pin([0.9, 0.2], 3.5);
      tr.place(tr.sAt(-420, 104));
      g.player.seatOnTrain(1, [1.0, 2.2, 1.4], false, 0.1);
      g.player.setYaw(-Math.PI / 2 - 0.95, -0.03);
      tr.run(tr.sAt(0, 70), 9);
      g.music.force('title', g.realT);
      g.skipPrompt = true;
      yield 1.5;
      yield* say(g, 'm0.ride');
      yield* say(g, 'm0.map');
      g.mapHint = true;
      const up = eventFlag(g, 'map-up');
      g.map.addNote(CONTRACT_NOTE);
      g.map.setMargin(['THE GOODS LINE', '', 'RAISE THE MAP']);
      g.stepBanner('RAISE THE MAP');
      yield () => up.hit || g.dev.skipScript;
      up.off();
      g.mapHint = false;
      g.map.dirty = true;
      yield 3;
      yield* say(g, 'm0.note');
      yield () => !tr.moving || g.dev.skipScript;
      g.map.raise(false);
      yield* say(g, 'm0.platform');
      g.player.leaveTrain(6, 62);
      g.player.setYaw(Math.PI, 0);
      g.body.startFever({ limit: 999, silent: true });
      g.stepBanner('THE FEVER');
      yield 3.5;
      g.fall();
      yield 2.2;
      g.body.fever = 'none'; g.body.feverOn = false; g.body.swim = 0; g.cam.roll = 0;
      g.skipPrompt = false;
    },
    // ---- M1 ----
    * m1Wake(g) {
      const site = SITES['mile-forty'];
      g.player.teleport(site.at[0] - 42, site.at[1] - 26);
      g.player.setYaw(-1.0, 0);
      g.clock.set(7.5);
      g.wind.unpin();
      g.wake();
      g.body.tablets = 3;
      g.body.hp = 100;
      g.body.startFever({ limit: 9999, silent: true });
      yield 1.2;
      g.faceNpc(g.npcs.byWho.odile);
      yield* say(g, 'm1.wake');
      g.faceNpc(null);
      g.tabletHint = true;
      g.stepBanner('TAKE THE TABLET');
      const t = eventFlag(g, 'tablet');
      yield () => t.hit;
      t.off();
      g.tabletHint = false;
      yield () => g.body.fever === 'none';
      g.body.tablets = 0;
      g.story.feverRunning = true;
      g.body.scheduleFever();
    },
    * m1Gear(g, r) {
      g.weapons.give('m38', 100, false);
      g.weapons.give('tractor', 45, true);
      g.story.unlocked.add('tractor');
      g.body.syrettes = 3;
      const site = SITES['mile-forty'];
      r.tags['m1-truck'] = g.vehicles.spawn('pickup', site.at[0] - 44, site.at[1] + 14, 1.5);
      g.map.setWaypoint(site.at[0] - 44, site.at[1] + 14);
      g.notice('A RETURNED RIFLE. CONDITION: RETURNED.', 3);
      yield 0.5;
    },
    * m1Ambush(g, r) {
      const v = r.tags['m1-truck'];
      const sq = g.actors.squads.get('p2');
      sq.alive = Math.max(sq.alive, 4); sq.clearedAt = null; sq.forceLive = true; sq.disabled = false;
      g.story.flags.p2Manned = true;
      // The truck is hit and stalls.
      if (v && v.driver === 'player') {
        g.damage.blast(v.x + Math.sin(v.yaw) * 8, v.y, v.z + Math.cos(v.yaw) * 8, 3, 1, 'world', { fire: 0 });
        v.hp = 1; v.onFire = 0; v.stall(); v.lastVel = 0;
        g.stepBanner('THE TRUCK IS DEAD. GET OUT.');
        g.ctx.engine.shake.add(0.5);
        yield () => !g.driving.vehicle || g.dev.skipScript;
      } else if (v) { v.hp = 1; v.onFire = 0; v.stall(); }
      g.weapons.scriptJamAt = 5; g.weapons.scriptShots = 0;
      g.equipBest();
      g.stepBanner('SHOOT THEM. THE RIFLE WAS RETURNED FOR A REASON.');
      const jam = eventFlag(g, 'jam');
      yield () => jam.hit || sq.alive <= 0;
      jam.off();
      if (g.weapons.gun?.jam > 0) {
        g.stepBanner('IT JAMMED. PRESS RELOAD UNTIL IT CLEARS.');
        yield () => !(g.weapons.gun?.jam > 0);
      }
      g.stepBanner('CLEAR THE POST');
      yield () => sq.alive <= 0;
      sq.forceLive = false;
      if (g.body.hp > 60) { g.body.hp = 55; g.body.lastHit = g.time; }
      g.stepBanner('YOU ARE BLEEDING. USE A SYRETTE.');
      g.healHint = true;
      const syr = eventFlag(g, 'syrette');
      yield () => syr.hit || g.dev.skipScript;
      syr.off(); g.healHint = false;
      if (v && v.alive) {
        v.stalled = true; v.hp = Math.min(v.hp, 10);
        g.map.setWaypoint(v.x, v.z);
        g.stepBanner('REPAIR THE TRUCK. HOLD USE AT THE BONNET.');
        const rep = eventFlag(g, 'vehicle-repaired');
        yield () => rep.hit || !v.alive || g.dev.skipScript;
        rep.off();
      }
    },
    // ---- M2 ----
    * m2Free(g, r) {
      const site = SITES['ranger-post'];
      const ines = g.actors.buddy('ines');
      ines.met = true;
      ines.spawn(g.ctx, site.at[0] + 12, site.at[1] + 8, { hp: 200 });
      g.world.openCage();
      yield* say(g, 'm2.cage');
      const sq = g.actors.squads.get('ranger-post');
      sq.forceLive = true;
      for (const s of sq.members) if (!s.dead) s.alertTo(g.player.feet.x, g.player.feet.z, 'player');
    },
    // ---- M3 ----
    * m3TankerAt(g, r) {
      const p3 = POSTS.p3;
      r.tags.tanker = g.vehicles.spawn('tanker', p3.at[0] + 14, p3.at[1] + 10, 1.4, { paint: 'red', hood: 'plum', roof: 'plum' });
      g.story.holdFireFaction = 'harvest';
      yield 0.1;
    },
    * m3TankerIn(g, r) {
      const v = r.tags.tanker, es = SITES['east-siding'];
      if (!v?.alive) { g.story.holdFireFaction = null; return; }
      g.map.setWaypoint(es.at[0], es.at[1]);
      yield () => Math.hypot(v.x - es.at[0], v.z - es.at[1]) < 32 || !v.alive || g.dev.skipScript;
      g.stepBanner('GET OUT AND SHOOT IT. RUN.');
      g.story.holdFireFaction = null;
      g.actors.squads.get('east-siding').angry = true;
      yield 0.2;
    },
    // ---- M4 ----
    * m4Convoy(g, r) {
      g.map.setWaypoint(200, 470);
      yield () => r.altDecided || g.dev.skipScript;
      const useBridge = !!r.tags.onBridge;
      const pts = useBridge ? [...ROADS.back.pts].reverse() : ROADS.saltLoop.pts;
      const L = polyLength(pts);
      const mk = (kind, off, tag) => {
        const at = pointAlong(pts, off, [0, 0, 0]);
        const v = g.vehicles.spawn(kind, at[0], at[1], at[2], kind === 'truck' ? { paint: 'slate', hood: 'night', roof: 'night', canvas: 'mist' } : { paint: 'slate', hood: 'night', roof: 'mist' });
        v.driver = 'ai'; v.faction = 'concord'; v.crew = kind === 'technical' ? 2 : 0; v.aiSpeed = 9;
        v.patrol = { pts, L, s: off, dir: 1, loop: !useBridge };
        v.convoy = true;
        g.vehicles.seatDriver(v);
        if (tag) r.tags[tag] = v;
        return v;
      };
      mk('technical', useBridge ? 60 : 110, 'c1');
      const truck = mk('truck', useBridge ? 40 : 90, 'payroll');
      mk('technical', useBridge ? 20 : 70, 'c2');
      g.world.markPayroll(truck);
      g.map.setWaypoint(truck.x, truck.z);
      g.map.see('salt-pan');
      yield 0.5;
    },
    * m4Dov(g, r) {
      const b = SITES['salt-pan'];
      const dov = g.actors.buddy('dov');
      g.weapons.charges = Math.max(g.weapons.charges, 2);
      r.tags.onBridge = true;
      g.map.setWaypoint(120, 230);
      g.stepBanner('PLANT DOV\'S CHARGES ON THE BRIDGE. HOLD THROW.');
      const pl = eventFlag(g, 'planted');
      yield () => (pl.hit && Math.hypot(g.player.feet.x - 120, g.player.feet.z - 230) < 30) || g.dev.skipScript;
      pl.off();
      g.stepBanner('WAIT. THROW AGAIN WHEN THE TRUCK IS ON IT.');
      yield 0.2;
    },
    * m4Case(g, r) {
      const t = r.tags.payroll;
      const at = t ? [t.x, t.z] : [200, 470];
      const a = g.rng.story.range(0, 6.28), d = g.rng.story.range(16, 28);
      const x = at[0] + Math.cos(a) * d, z = at[1] + Math.sin(a) * d;
      g.places.spawnStoryCase('payroll-case', x, z, 10);
      g.story.trackerOwned = true;
      g.dialogue.play('m4.tracker');
      g.trackerHint = true;
      yield () => !g.dialogue.active;
      yield 0.5;
    },
    // ---- M5 ----
    * m5Hold(g, r) {
      const s = SITES['pump-station'];
      const sq = g.actors.squads.get('pump-station');
      sq.forceLive = true;
      if (sq.alive < 6) sq.alive = 6;
      g.story.flags.m5Hold = true;
      g.squadsAlertAll('pump-station');
      g.holdT = 60;
      g.stepBanner('HOLD THE PUMP HOUSE. THE CISTERN IS FILLING.');
      yield () => { if (Math.hypot(g.player.feet.x - s.at[0], g.player.feet.z - s.at[1]) < 34) g.holdT -= 1 / 60; return g.holdT <= 0 || g.dev.skipScript; };
      g.holdT = 0;
      g.story.flags.cisternFull = true;
      sq.forceLive = false;
      g.stepBanner('THE CISTERN IS FULL. NOW BLOW THE PUMP.');
    },
    * m5After(g, r) {
      if (g.story.flags.cisternFull) {
        g.dialogue.play('m5.done.wet');
      } else {
        g.dialogue.play('m5.done.dry');
        g.actors.civilians.emptyVillage();
        g.story.odileRefuses = true;
        g.story.flags.wellsEmpty = true;
        g.world.darkenVillage();
        g.world.startRefugees();
      }
    },
    // ---- M6 ----
    * m6Buddy(g, r) {
      const best = g.actors.liveBuddies().filter((b) => g.clock.abs >= b.woundedUntil).sort((a, b) => b.trust - a.trust)[0];
      const b = best ?? g.actors.buddy('pell');
      if (b.id === 'pell') b.met = false;
      const f = g.player.feet;
      b.spawn(g.ctx, f.x + 2.5, f.z + 2.5, { hp: 200 });
      r.tags.m6buddy = b;
      g.say(b.id, b.id === 'pell' ? 'THE MOTHER SENT ME. YOU WILL NOT LIKE ME.' : 'I HEARD. I AM COMING. DO NOT SAY ANYTHING.', 3);
      yield 3;
    },
    * m6Burn(g, r) {
      const site = SITES['long-field'], b = r.tags.m6buddy, fire = g.fire;
      // Count the crop cells.
      const cells = [];
      for (let id = 0; id < FN * FN; id++) { const x = fire.wx(id), z = fire.wz(id); if (Math.abs(x - site.at[0]) < 90 && Math.abs(z - site.at[1]) < 60 && fire.fuel[id] > 0) cells.push(id); }
      g.map.setWaypoint(site.at[0], site.at[1]);
      const frac = () => { let n = 0; for (const id of cells) if (fire.state[id] !== S.FRESH) n++; return n / Math.max(1, cells.length); };
      g.burnFrac = frac;
      yield () => frac() >= 0.1 || g.dev.skipScript;
      g.stepBanner('IT IS GOING. THE WIND IS CARRYING IT.');
      yield () => frac() >= 0.5 || g.dev.skipScript;
      g.wind.pin([-0.9, -0.2], 7);
      g.dialogue.play('m6.turn');
      g.music.setMood('fight');
      yield 1.2;
      // They go down on fire. Finish it, or spend a syrette and watch them burn out.
      const f = g.player.feet;
      if (b && !b.dead) {
        if (Math.hypot(b.x - f.x, b.z - f.z) > 25) b.cc.teleport([f.x + 8, g.world.heightAt(f.x + 8, f.z + 8) + 0.1, f.z + 8]);
        b.x = b.cc.feet.x; b.z = b.cc.feet.z;
        b.fireProof = true;
        b.goDown(true);
        g.map.setWaypoint(b.x, b.z);
        g.dialogue.play('m6.choice');
        g.stepBanner('SYRETTE, OR FINISH IT');
        const sv = eventFlag(g, 'buddy-saved'), dd = eventFlag(g, 'buddy-dead');
        yield () => sv.hit || dd.hit || g.dev.skipScript;
        sv.off(); dd.off();
        b.fireProof = false;
        if (b.id === 'pell' && !b.dead) b.despawn();
      }
      g.music.setMood(null);
      const bunker = g.world.explosives.find((e) => e.tag === 'ammo-bunker');
      g.map.setWaypoint(bunker.x, bunker.z);
    },
    // ---- M7 ----
    * m7War(g, r) {
      g.dialogue.play('m7.war');
      g.story.war = true; g.story.pass = null; g.story.truce = false;
      g.clock.set(16);
      const cut = SITES['the-cut'];
      const sq1 = g.actors.addSquadDef('cut-harvest', { faction: 'harvest', n: 10, at: [cut.at[0] + 62, cut.at[1] + 28], noReman: true, duty: 'patrol' });
      const sq2 = g.actors.squads.get('the-cut');
      sq1.forceLive = true; sq2.forceLive = true; sq2.alive = Math.max(sq2.alive, 10);
      r.tags.cutTech = g.vehicles.spawn('technical', 250, -262, -0.7, { paint: 'orange', hood: 'red', roof: 'sand' });
      g.notice('A TECHNICAL ON THE ROAD. NOBODY IS IN IT.', 3);
      g.fire.ignite(cut.at[0] + 110, cut.at[1] + 30, 6, 'world');
      g.fire.ignite(cut.at[0] - 110, cut.at[1] + 50, 6, 'world');
      g.map.setWaypoint(cut.at[0], cut.at[1]);
      yield 0.2;
    },
    * m7Road(g, r) {
      const b = r.altBuddyNow;
      if (b) { b.spawn(g.ctx, 255, -240, { hp: 200, following: false, goal: { x: 248, z: -272 } }); b.trust++; }
      yield 0.2;
    },
    * m7Read(g, r) {
      g.dialogue.play('m7.ledger');
      yield () => !g.dialogue.active;
    },
    * m7After(g) {
      g.story.war = true;
      if (g.npcs?.byWho.tibor) g.npcs.byWho.tibor.setActive(false);
    },
    // ---- M8 ----
    * m8Hold(g, r) {
      const s = SITES['mile-forty'];
      const px = s.at[0], pz = s.at[1] + 28;
      g.map.setWaypoint(px, pz);
      g.world.setCrowdAtPlatform(true);
      g.train.place(g.train.sAt(s.at[0], s.at[1] + 30));
      g.shelling = { at: [s.at[0], s.at[1]], r: 55, every: 4.5, t: 3 };
      g.noTruceHere = true;
      g.story.noPatrols = true;
      g.vehicles.stopPatrols();
      const squads = [];
      const wave = (key, faction, ax, az) => {
        const sq = g.actors.addSquadDef(key, { faction, n: 7, at: [ax, az], noReman: true, duty: 'march' });
        sq.forceLive = true; squads.push(sq);
        return sq;
      };
      wave('m8a', 'concord', s.at[0] - 90, s.at[1] - 55);
      yield 1;
      g.holdT = 120;
      g.stepBanner('HOLD THE PLATFORM');
      const marks = [[100, 0], [75, 1], [40, 2], [10, 3]];
      let said = 0, wn = 0;
      for (;;) {
        const f = g.player.feet;
        const nearby = Math.hypot(f.x - px, f.z - pz) < 70 || g.dev.god;
        if (nearby || g.player.seat) g.holdT -= 1 / 60;
        if (g.holdT < 120) g.world.boardCrowd(1 - g.holdT / 120);
        if (said < marks.length && g.holdT <= marks[said][0]) { const line = LINES['m8.board'][marks[said][1]]; g.say(line[0], line[1], 3); g.voice.say(line[0], line[1]); said++; }
        if (wn < 2 && g.holdT <= 80 - wn * 40) { wn++; wave(`m8w${wn}`, wn === 1 ? 'harvest' : 'concord', s.at[0] + (wn === 1 ? 95 : -70), s.at[1] - 40 * wn); }
        for (const sq of squads) for (const m of sq.members) if (!m.dead && m.duty === 'march' && !m.marchTo && m.state !== 'alert') { m.marchTo = { x: px + g.rng.ai.range(-16, 16), z: pz - g.rng.ai.range(6, 14) }; }
        if (g.holdT <= 0 || g.dev.skipScript) break;
        yield 0;
      }
      g.holdT = 0;
      g.world.setCrowdAtPlatform(false);
      for (const sq of squads) sq.forceLive = false;
      g.shelling = null;
      g.dialogue.play('m8.ride');
      g.stepBanner('GET TO THE FLATCAR');
      const tr = g.train;
      tr.place(tr.sAt(s.at[0], s.at[1] + 30));
      r.tags.flatUse = g.interact.add({ tag: 'mission', liveAt: () => { const c = tr.cars[3]; return [c.x, c.y + 1, c.z]; }, r: 7, wide: true, verb: () => 'CLIMB ON THE GUN', onUse: () => { r.tags.onFlat = true; } });
      g.map.setWaypoint(tr.cars[3].x, tr.cars[3].z);
      yield () => r.tags.onFlat || g.dev.skipScript;
      g.interact.remove(r.tags.flatUse);
    },
    * m8Ride(g, r) {
      const tr = g.train;
      g.player.seatOnTrain(3, [0, 2.3, 1.2], true, 0.15);
      g.weapons.mounted = { turret: () => { const c = tr.cars[3]; if (c.turret) c.turret.rotation.y = g.player.yaw - c.yaw + Math.PI; } };
      tr.whistle();
      const goal = tr.sAt(425, -58);
      const L = Math.abs(goal - tr.s);
      tr.run(goal, L / 58);
      g.holdT = 60;
      // Technicals and riflemen along the line, on rails, under fire.
      g.story.pass = null;
      const line = [[120, 25, 'harvest'], [190, 2, 'concord'], [250, -24, 'harvest'], [330, -60, 'concord'], [390, -80, 'harvest']];
      line.forEach(([x, z, f], i) => { const sq = g.actors.addSquadDef(`m8r${i}`, { faction: f, n: 4, at: [x, z], noReman: true }); sq.forceLive = true; });
      const a = g.vehicles.spawn('technical', 110, 44, 1.4, { paint: 'slate', hood: 'night', roof: 'mist' }); a.driver = 'ai'; a.faction = 'concord'; a.crew = 0; a.aiSpeed = 11; a.patrol = { pts: [[110, 50], [240, 20], [320, 0], [420, -40]], L: 340, s: 0, dir: 1 };
      r.tags.m8car = a;
      yield () => { g.holdT -= 1 / 60; return !tr.moving || g.dev.skipScript; };
      g.holdT = 0;
      g.weapons.mounted = null;
      for (let i = 0; i < 5; i++) { const sq = g.actors.squads.get(`m8r${i}`); if (sq) sq.forceLive = false; }
      if (a.alive) g.vehicles.remove(a);
      g.player.leaveTrain(415, -48);
      g.dialogue.play('m8.done');
      g.story.noPatrols = false;
      yield () => !g.dialogue.active;
    },
    * m8After(g) { g.story.flags.columnWalking = true; g.world.startColumn(); },
    // ---- M9 ----
    * m9Scene(g, r) {
      const n = g.npcs.byWho.harrow;
      g.ending.harrowScene(n);
      yield () => g.ending.sceneStep >= 1 || g.dev.skipScript;
      g.dialogue.play('m9.scene');
      yield () => !g.dialogue.active || g.dev.skipScript;
      g.ending.layMap();
      g.dialogue.play('m9.lay');
      yield () => !g.dialogue.active || g.dev.skipScript;
      g.dialogue.play('m9.offer');
      yield () => !g.dialogue.active || g.dev.skipScript;
      g.dialogue.stopAll();
      let shot = null;
      g.ui.choice('FINISH YOUR CONTRACT?', [{ label: 'SHOOT HIM', id: 'shoot', onSelect: () => { shot = true; } }, { label: 'LEAVE HIM THE LAMP', id: 'spare', onSelect: () => { shot = false; } }], { noBack: true });
      yield () => shot != null;
      g.story.chose.shoot = shot;
      if (shot) {
        g.ending.shootHarrow();
        g.dialogue.play('m9.shot');
        g.ledger.add('paid', 1);
        g.ledger.note('harrow', 'shot');
      } else {
        g.dialogue.play('m9.spared');
        g.ledger.note('harrow', 'spared');
      }
      yield () => !g.dialogue.active || g.dev.skipScript;
      g.dialogue.play('m9.sheet');
      yield () => !g.dialogue.active || g.dev.skipScript;
      g.dialogue.stopAll();
      let sheet = null;
      g.ui.choice('WHO GETS THE SHEET?', [{ label: 'WALK OUT WITH IT', id: 'alone', onSelect: () => { sheet = 'alone'; } }, { label: 'GIVE IT TO THE COLUMN', id: 'column', onSelect: () => { sheet = 'column'; } }], { noBack: true });
      yield () => sheet != null;
      g.story.sheet = sheet;
      g.body.tablets += 6;
      g.ending.endHarrowScene();
      yield 0.5;
    },
    // ---- The Pass ----
    * endPass(g, r) {
      g.sky.setWeather('clear');
      g.clock.set(4.6);
      g.story.war = true; g.story.pass = null;
      const sheet = g.story.sheet ?? 'alone';
      const pass = SITES['the-pass'];
      g.player.teleport(-400, -360);
      g.player.setYaw(Math.atan2(190, 70), 0);
      g.endingMusic = false;
      if (sheet === 'column') {
        g.map.setWaypoint(-430, -382);
        g.world.setColumnHead(-436, -388);
        g.stepBanner('TAKE THE SHEET TO THE COLUMN');
        let given = false;
        const u = g.interact.add({ tag: 'mission', x: -436, y: g.world.heightAt(-436, -388) + 1.4, z: -388, r: 5, wide: true, verb: () => 'GIVE THEM THE SHEET', onUse: () => { given = true; } });
        yield () => given || g.dev.skipScript;
        g.interact.remove(u);
        g.dialogue.play('end.column');
        g.world.columnGoesThrough();
        g.ledger.add('moved', 600);
        yield () => !g.dialogue.active;
        g.stepBanner('HOLD BEHIND THEM');
        g.map.setWaypoint(-520, -420);
      } else {
        g.dialogue.play('end.alone');
        g.map.setWaypoint(pass.at[0], pass.at[1]);
        g.stepBanner('WALK TO THE PASS');
      }
      const px = sheet === 'column' ? -520 : -565, pz = sheet === 'column' ? -420 : -425;
      yield () => Math.hypot(g.player.feet.x - px, g.player.feet.z - pz) < 26 || g.dev.skipScript;
      // Pursuit from both armies.
      for (const [k, f, x, z] of [['endA', 'concord', px + 70, pz + 30], ['endB', 'harvest', px + 90, pz - 40]]) {
        const sq = g.actors.addSquadDef(k, { faction: f, n: 6, at: [x, z], noReman: true, duty: 'march' });
        sq.forceLive = true;
      }
      g.stepBanner(sheet === 'column' ? 'HOLD THE PASS' : 'THEY ARE BEHIND YOU');
      g.holdT = 45;
      yield () => { g.holdT -= 1 / 60; return g.holdT <= 0 || g.dev.skipScript; };
      g.holdT = 0;
      // The surviving buddies come for the stones.
      const friends = g.actors.liveBuddies();
      for (const b of friends) {
        yield 1.5;
        const key = `end.${b.id}`;
        b.spawn(g.ctx, px + g.rng.story.range(8, 14), pz + g.rng.story.range(-14, 14), { hp: 200, following: false, goal: null });
        b.isHostile = false;
        g.faceActor(b);
        g.dialogue.play(key);
        yield () => !g.dialogue.active || g.dev.skipScript;
        g.faceActor(null);
        let answer = null;
        if (b.trust >= 3) {
          g.ui.choice(`${b.name} OFFERS TO SPLIT IT`, [{ label: 'SPLIT THE STONES', id: 'split', onSelect: () => { answer = 'split'; } }, { label: 'REFUSE', id: 'refuse', onSelect: () => { answer = 'refuse'; } }], { noBack: true });
          yield () => answer != null;
        } else answer = 'refuse';
        if (answer === 'split') {
          g.story.stones = Math.floor(g.story.stones / 2);
          g.say(b.id, 'THAT IS FAIR. THAT IS WHAT I WILL TELL THEM.', 3);
          g.ledger.note('split', b.id);
          b.goal = { x: b.x + 60, z: b.z + 60 };
          yield 3;
          b.despawn();
        } else {
          g.dialogue.play('end.refuse');
          b.turnOn('player');
          g.map.setWaypoint(b.x, b.z);
          g.stepBanner(`${b.name} DRAWS`);
          yield () => b.dead || g.dev.skipScript;
          if (!b.dead) b.killed('pass');
          g.say('', `${b.name} HAS STOPPED OWING ANYONE.`, 3);
          yield 2;
        }
      }
      // The last grass is yours to light.
      g.dialogue.play('end.light');
      g.weapons.give('flare', 100, true);
      if (g.weapons.gun?.mag === 0) g.weapons.gun.mag = 1;
      g.stepBanner('LIGHT THE GRASS');
      g.wind.pin([0.9, 0.5], 6);
      const fw = g.player.forward(), lx = clamp(g.player.feet.x + fw.x * 30, -610, 610), lz = clamp(g.player.feet.z + fw.z * 30, -610, 610);
      g.world.refreshGrass(lx, lz, 26);
      g.story.lastGrass = [lx, lz];
      g.map.setWaypoint(lx, lz);
      g.notice('SOMETHING WAS LEFT STANDING.', 4);
      const before = g.fire.counts.lit;
      yield () => g.fire.counts.lit > before || g.dev.skipScript;
      yield 5;
      g.ending.finish(sheet);
      yield () => false;
    },
  };
}
