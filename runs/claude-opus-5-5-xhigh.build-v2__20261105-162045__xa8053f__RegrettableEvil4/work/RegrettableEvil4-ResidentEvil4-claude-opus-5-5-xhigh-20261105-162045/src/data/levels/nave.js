// The Nave. The final boss. The Bathysphere, the hatch, the thing on his neck, Final Settlement.
import { PALETTE, THREE } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { Bathysphere, Mother } from '../../game/bosses/bathysphere.js';
import { Humanoid } from '../../game/actor.js';

const M = new MapInfo('nave');
const X = (c) => M.x(c); const Z = (r) => M.z(r);

const dress = [
  ['pew', 5.5, 12, {}], ['pew', 5.5, 16, {}], ['pew', 5.5, 22, {}], ['pew', 5.5, 30, {}], ['pew', 5.5, 38, {}], ['pew', 22.5, 12, {}], ['pew', 22.5, 16, {}], ['pew', 22.5, 22, {}], ['pew', 22.5, 30, {}], ['pew', 22.5, 38, {}],
  ['stained-glass', 2.2, 12, { y: 2, collide: false, turn: 90 }], ['stained-glass', 2.2, 24, { y: 2, collide: false, turn: 90 }], ['stained-glass', 2.2, 36, { y: 2, collide: false, turn: 90 }], ['stained-glass', 25.8, 12, { y: 2, collide: false, turn: -90 }], ['stained-glass', 25.8, 24, { y: 2, collide: false, turn: -90 }], ['stained-glass', 25.8, 36, { y: 2, collide: false, turn: -90 }],
  ['organ-pipes', 13.5, 2.4, { collide: false }], ['the-font', 13.5, 8.6, { collide: false }], ['brazier', 5, 4], ['brazier', 22, 4], ['brazier', 5, 44], ['brazier', 22, 44],
  ['candles', 10, 8, { collide: false }], ['candles', 17, 8, { collide: false }], ['chandelier', 13.5, 20, { y: 3, collide: false }], ['chandelier', 13.5, 32, { y: 3, collide: false }],
  ['banner', 10, 2.2, { y: 2, collide: false }], ['banner', 17, 2.2, { y: 2, collide: false }],
];

function setupNave(area, ctx) {
  const { level } = area;
  for (const [id, c, r, o = {}] of dress) level.placeAt(id, c, r, o);
  // Columns: every H here is a column that shatters when he charges into it.
  area.columns = level.coverObjs ?? [];
  const front = level.doorAt(13, 46); if (front) { front.locked = true; front.lockText = 'IT HAS LOCKED BEHIND YOU'; }
  area.raiseWater = (dy) => {
    area.waterY = (area.waterY ?? -0.25) + dy;
    area.world.setWaterLevel(area.waterY);
    ctx.audio.play('waterRise');
  };
  area.world.addWater({ y: -0.25, opacity: 0.72, size: [28, 48], deep: PALETTE.navy, shallow: PALETTE.teal });
  area.waterY = -0.25;
  area.shatterColumn = (x, z) => {
    const c0 = level.info.col(x); const r0 = level.info.row(z);
    const col = area.columns.find((k) => c0 >= k.c0 && c0 <= k.c1 && r0 >= k.r0 && r0 <= k.r1);
    if (!col || col.broken) return;
    ctx.particles.burst('smokeBig', [col.x, 1.2, col.z], { count: 26 });
    ctx.particles.burst('falling', [col.x, 3, col.z], { count: 20 });
    // All of it: the column, its collider and its cell on the map. Nothing solid left that the eye can't see.
    level.breakCover(col);
  };
  area.hidingSpots = [];
  ctx.lights.request({ position: [X(13.5), 3.5, Z(8)], color: 0x90f060, intensity: 8, radius: 16, flicker: 'pulse', priority: 4 });
  ctx.lights.request({ position: [X(5), 3, Z(20)], color: 0xff9040, intensity: 8, radius: 14, flicker: 'torch' });
  ctx.lights.request({ position: [X(22), 3, Z(20)], color: 0xff9040, intensity: 8, radius: 14, flicker: 'torch' });
  ctx.lights.request({ position: [X(5), 3, Z(36)], color: 0xff9040, intensity: 8, radius: 14, flicker: 'torch' });
  ctx.lights.request({ position: [X(22), 3, Z(36)], color: 0xff9040, intensity: 8, radius: 14, flicker: 'torch' });
}

const openCut = (area) => {
  const B = area.bath;
  return [
    { cam: [[X(13.5), 1.5, Z(30)], [X(13.5), 3, Z(12)], 42], to: [[X(13.5), 1.4, Z(27)], [X(13.5), 3.6, Z(12)]] },
    { cue: () => { area.ctx.audio.play('tannoyOn'); area.ctx.audio.play('gateShut'); B.actor.play('BathyWalk'); } },
    { say: S.finalA[0], hold: 1.2 },
    { cue: () => { B.actor.play('Slam', { once: true }); area.ctx.engine.shake.add(0.5); area.ctx.audio.play('stomp'); } },
    { cam: [[area.player.x + 1.2, 1.6, area.player.z + 1.5], [area.player.x, 1.5, area.player.z], 30] },
    { say: S.finalA[1], hold: 1 },
  ];
};

function hatchCut(area, B) {
  const { ctx } = area;
  const P = area.player;
  const figure = new Humanoid('commodore');
  figure.root.position.set(B.x, 0, B.z + 0.4);
  figure.root.visible = false;
  figure.play('Broadcast');
  ctx.scene.add(figure.root);
  area.npcs.figure = figure;
  const mic = figure.attach('root', 'w-mic', { at: [0, 0.75, 0.55] });
  void mic;
  const cx = B.x; const cz = B.z;
  area.startCutscene([
    { cue: () => { P.teleport(cx, 0, cz + 3.5, Math.PI); P.setVisible(false); } },
    { cam: [[cx + 2.5, 2.2, cz + 5], [cx, 3.4, cz + 1], 40] },
    { cue: () => { ctx.audio.play('kickWhoosh'); P.setVisible(true); P.teleport(cx, 0, cz + 1.2, Math.PI); P.actor.play('LadderUp'); ctx.tweens.to(P.root.position, { y: 2.2 }, { duration: 0.8 }); } },
    { wait: 1 },
    { cue: () => { ctx.audio.play('metalClang'); ctx.audio.play('stonecrash'); ctx.engine.shake.add(0.8); B.actor.flash(3); ctx.particles.burst('steam', [cx, 3.5, cz + 1], { count: 40, speed: 1.8 }); } },
    { wait: 0.8 },
    { cam: [[cx + 0.6, 1.6, cz + 2.6], [cx, 1.3, cz + 0.4], 30] },
    { cue: () => { figure.root.visible = true; figure.root.position.y = 0; P.actor.play('Idle'); P.teleport(cx + 1.4, 0, cz + 2.4); B.actor.root.visible = false; } },
    { say: S.finalB[0], hold: 0.8 },
    { cam: [[cx + 2.4, 1.6, cz + 3.4], [cx + 1.4, 1.4, cz + 2.4], 30] },
    { say: S.finalB[1], hold: 1 },
    { cue: () => { ctx.audio.play('sting'); ctx.engine.shake.add(0.5); ctx.particles.burst('gore', [cx, 1.5, cz + 0.4]); ctx.audio.play('stonecrash'); } },
    { cam: [[X(13.5) + 5, 2, Z(7) + 8], [X(13.5), 2, Z(7)], 44] },
    { cue: () => { figure.root.visible = false; delete area.npcs.figure; B.remove(); area.director.queue.length = 0; for (const q of area.enemies) if (!q.dead && q !== B) q.dieQuiet?.(); area.mother = new Mother(area, X(13.5), Z(6.5)); area.enemies.push(area.mother); area.ctx.engine.shake.add(0.7); ctx.audio.play('bellow'); } },
    { wait: 1.8 },
  ], { onEnd: () => {
    const P2 = area.player;
    P2.teleport(X(13.5), 0, Z(20), Math.PI);
    area.cam.yaw = Math.PI; area.cam.pitch = 0.05;
    area.setMusic('boss');
    area.showHint('A FLARE KILLS EVERY LIMPET AT ONCE', 'throw', 7);
    area.kickLimpets = false;
  } });
}

function finalSettlement(area) {
  const { ctx } = area;
  const P = area.player;
  const fx = X(13.5); const fz = Z(11);
  P.teleport(fx, 0, fz, Math.PI);
  P.state = 'script';
  P.actor.clearUpper(0.1);
  P.actor.play('Idle');
  area.setMusic(null);
  area.fixedView = () => ({ position: [fx + 1.8, 1.8, fz + 2.6], target: [fx, 1.8, fz - 3], fov: 34 });
  const beats = [
    () => area.qte.press({ key: 'action', label: 'CLIMB', onOk: () => { P.actor.play('LadderUp'); ctx.audio.play('ladder'); next(); }, onFail: () => { P.hurt(10, { x: fx, z: fz - 2 }, { noStagger: true }); P.state = 'script'; again(); } }),
    () => area.qte.press({ key: 'dodge', label: 'DODGE', onOk: () => { P.actor.play('Roll', { once: true }); ctx.audio.play('kickWhoosh'); next(); }, onFail: () => { P.hurt(10, { x: fx, z: fz - 2 }, { noStagger: true }); P.state = 'script'; again(); } }),
    () => area.qte.mash({ key: 'action', label: 'STAMP', time: 3.6, onOk: () => stampIt(), onFail: () => { P.hurt(10, { x: fx, z: fz - 2 }, { noStagger: true }); P.state = 'script'; again(); } }),
  ];
  let i = 0;
  const again = () => { area.addDelayed(0.5, () => beats[i]()); };
  const next = () => { i++; area.addDelayed(0.9, () => beats[i]()); };
  const stampIt = () => {
    area.fixedView = null;
    area.startCutscene([
      { cam: [[fx + 1.1, 1.5, fz + 1], [fx, 1.5, fz - 1], 26] },
      { cue: () => { P.attachStamp = P.actor.attach('HandR', 'w-stamp', { at: [0, -0.1, 0], rot: [Math.PI, 0, 0] }); P.actor.play('StampForm', { once: true }); } },
      { wait: 0.5 },
      { cue: () => { ctx.audio.play('stamp'); ctx.engine.hitstop(0.12); ctx.engine.shake.add(1); ctx.particles.burst('brine', [fx, 1.5, fz - 2], { count: 50, speed: 2 }); if (!ctx.engine.manual) ctx.engine.screen.flash('white', { duration: 0.12 }); } },
      { wait: 0.5 },
      { say: S.finalC[0], hold: 1.8 },
      { cue: () => {
        if (area.mother) { area.mother.obj.visible = false; area.mother.light.release(); }
        ctx.audio.play('stonecrash'); ctx.engine.shake.add(0.8);
      } },
      { cam: [[X(13.5) + 6, 3, Z(18)], [X(13.5), 1.2, Z(7)], 44], to: [[X(13.5) + 6, 3.4, Z(14)], [X(26), 1, Z(5)]] },
      { wait: 1.8 },
    ], { onEnd: () => {
      area.motherDead = true;
      area.setMusic('tide');
      area.openGateAt(26, 4);
      area.setObjective('THE SIDE GATE. RUN. THE ISLAND IS COMING DOWN');
      area.floodT = 0;
      if (area.dame) { area.dame.staysHidden = false; area.dame.unhide(); area.dame.x = area.player.x - 1.5; area.dame.z = area.player.z + 1; }
      if (P.attachStamp) P.attachStamp.visible = false;
      P.state = 'free';
    } });
  };
  area.addDelayed(0.6, () => beats[0]());
}

// Where the bot runs to from the Bathysphere: far from him, and not past him.
const ROAM = [[5, 6], [22, 6], [5, 15], [22, 15], [5, 23], [22, 23], [5, 31], [22, 31], [5, 39], [22, 39]];
function roamPoint(P, threats) {
  let best = null; let score = -Infinity;
  for (const [c, r] of ROAM) {
    const x = X(c); const z = Z(r);
    const dx = x - P.x; const dz = z - P.z; const len = Math.hypot(dx, dz) || 1;
    let from = 18; let pass = 99;
    for (const B of threats) {
      const u = Math.max(0, Math.min(1, ((B.x - P.x) * dx + (B.z - P.z) * dz) / (len * len)));
      pass = Math.min(pass, Math.hypot(P.x + dx * u - B.x, P.z + dz * u - B.z));
      from = Math.min(from, Math.hypot(x - B.x, z - B.z));
    }
    const s = from - (pass < 3.5 ? 30 : 0) - len * 0.15;
    if (s > score) { score = s; best = [x, z]; }
  }
  return best;
}

export const nave = {
  id: 'nave',
  title: 'THE NAVE',
  chapter: 3,
  map: 'nave',
  mood: 'abbey',
  music: null,
  startYaw: 180,
  water: false,
  theme: {
    floors: { _: 'flagstones' },
    walls: { '#': { tex: 'abbey-stone', h: 8 } },
    cover: { tex: 'abbey-stone', h: 1 },
  },
  // The aisle's columns: a charge can shatter them. The block before the altar is plain cover.
  build: { coverProps: [[8, 10], [18, 10], [8, 18], [18, 18], [8, 26], [18, 26], [8, 34], [18, 34]].map(([c, r]) => [c, r, c + 1, r + 1, 'column', { params: { height: 5 }, scale: 1.4, breakable: true }]) },
  chests: [[3, 3, 'blackPearl']],
  items: [[5, 42, 'ammoPistol', 12], [22, 42, 'ammoShells', 5], [5, 26, 'samphire', 1], [22, 26, 'ammoRifle', 4], [6, 8, 'flare', 1], [21, 8, 'tin', 1]],
  setup: setupNave,
  startHatchCut: hatchCut,
  finalSettlement,
  dameContextLabel() { return null; },
  onFlare(area) { area.mother?.onFlare(); },
  fixed(area, dt) {
    if (area.floodT !== undefined) {
      area.floodT += dt;
      area.raiseWater(dt * 0.1);
      if (area.waterY > 1.4) area.waterY = 1.4;
      const P = area.player;
      if (P.x > X(25) && P.z < Z(7)) { area.floodT = undefined; area.loadNext('launch', null); }
    }
  },
  cuts: { open: openCut },
  botReflex(bot, it, dt) {
    const a = bot.area;
    const P = a.player;
    if (a.floodT !== undefined) return false;
    const B = a.mother ?? a.bath;
    if (!B || !a.bossLive) return false;
    if (P.hp < P.maxHp * 0.45 && bot.hasHerb(P)) it.heal = true;
    if (P.mag <= 0 && P.reloadT <= 0 && P.store.case.count(P.weapon.ammo) > 0) it.reload = true;
    if (P.mag <= 0 && P.store.case.count(P.weapon.ammo) <= 0) bot.switchWeapon(it, P);
    if (a.interact.current?.kind === 'hatch') { it.action = true; return true; }
    if (B.state === 'OPEN' && !a.mother) {
      // Monks on her first: nobody walks to a hatch through a beating.
      const onHer = bot.threats(P).filter((t) => !t.e.isBoss && t.d < 2.5);
      if (onHer.length && bot.combat(it, dt, P, onHer)) return true;
      // Up to the hatch, from whichever side has floor.
      const nav = a.level.nav;
      const spot = [[0, 2.4], [2.4, 0], [-2.4, 0], [0, -2.4]].find(([ox, oz]) => nav.walkable(B.x + ox, B.z + oz)) ?? [0, 0];
      bot.steerTo(it, B.x + spot[0], B.z + spot[1], true, dt);
      bot.checkStuck(it, dt, P);
      return true;
    }
    // He walks at 1.4 m/s and Max runs at 4.8. Keep clear of him, never back into the door, shoot from afar.
    if (!a.mother) {
      const bossD = Math.hypot(B.x - P.x, B.z - P.z);
      const crowd = bot.threats(P).filter((t) => !t.e.isBoss);
      const charging = B.state === 'WHISTLE' || B.state === 'CHARGE';
      if (bot.roamTo && (Math.hypot(bot.roamTo[0] - P.x, bot.roamTo[1] - P.z) < 1.6 || Math.hypot(bot.roamTo[0] - B.x, bot.roamTo[1] - B.z) < 6)) bot.roamTo = null;
      // Sagging, he only flails: the locks want shooting from just outside his reach.
      if (B.state === 'SAG') {
        bot.roamTo = null;
        // Pressed against him: round him, whichever way has floor. Straight out may be a wall, and straight on is through him.
        if (bossD < 2.2) {
          const ox = (P.x - B.x) / Math.max(bossD, 0.1); const oz = (P.z - B.z) / Math.max(bossD, 0.1);
          bot.roundSide = bot.roundSide ?? 1;
          bot.roundStuck = Math.hypot(P.x - (bot.roundX ?? P.x), P.z - (bot.roundZ ?? P.z)) < 0.02 ? (bot.roundStuck ?? 0) + dt : 0;
          bot.roundX = P.x; bot.roundZ = P.z;
          if (bot.roundStuck > 0.5 || !a.level.nav.walkable(P.x - oz * bot.roundSide * 1.2, P.z + ox * bot.roundSide * 1.2)) { bot.roundSide = -bot.roundSide; bot.roundStuck = 0; }
          bot.moveDir(it, -oz * bot.roundSide + ox * 0.6, ox * bot.roundSide + oz * 0.6, true);
          return true;
        }
        // His reach is 3.6 m. Back out for a moment if she's inside it, and no longer: there may be nowhere to back to, and the locks want shooting.
        if (bossD < 3.9 && (bot.backT ?? 0) < 1.5) { bot.backT = (bot.backT ?? 0) + dt; bot.moveDir(it, (P.x - B.x) / Math.max(bossD, 0.1), (P.z - B.z) / Math.max(bossD, 0.1), true); return true; }
        if (bossD >= 3.9) bot.backT = Math.max(0, (bot.backT ?? 0) - dt * 0.25);
      }
      bot.noRoamT = Math.max(0, (bot.noRoamT ?? 0) - dt);
      if (B.state !== 'STUNNED' && B.state !== 'SAG' && (bossD < 7.5 || charging) && !bot.roamTo && bot.noRoamT <= 0) bot.roamTo = roamPoint(P, [B, ...crowd.filter((t) => t.d < 8).map((t) => t.e)]);
      if (bot.roamTo) {
        // Someone in the way is someone to shoot: nobody runs on the spot while a monk hits them.
        bot.roamStuck = Math.hypot(P.x - (bot.roamX ?? P.x), P.z - (bot.roamZ ?? P.z)) < 0.02 ? (bot.roamStuck ?? 0) + dt : 0;
        bot.roamX = P.x; bot.roamZ = P.z;
        if (bot.roamStuck > 0.6) { bot.roamTo = null; bot.roamStuck = 0; bot.noRoamT = 3; } else { bot.steerTo(it, bot.roamTo[0], bot.roamTo[1], true, dt); bot.checkStuck(it, dt, P); return true; }
      }
      // His monks are a separate fight: deal with whoever is close before going back to the plumbing.
      if (crowd.length && crowd[0].d < 7 && bot.combat(it, dt, P, crowd)) return true;
      // The rifle's for what comes out of the hatch. Nothing else swaps here: a swap cancels a reload.
      if (P.store.equipped === 'rifle' && P.reloadT <= 0) {
        const list = P.store.ownedWeapons();
        const spare = ['pistol', 'scatter', 'harpoon'].find((w) => list.includes(w) && (P.store.weapons[w].mag > 0 || P.store.case.count(P.store.weaponStats(w).ammo) > 0));
        if (spare) it.slot = list.indexOf(spare);
      }
    }
    if (a.mother) {
      // A flare clears the whole brood at once.
      const brood = a.enemies.filter((e) => !e.dead && e.type === 'limpet').length;
      if (brood >= 2 && P.store.case.count('flare') > 0 && (P.grenadeCooldown ?? 0) <= 0) { P.store.grenade = 'flare'; it.aim = true; if (P.aimBlend > 0.5) it.throw = true; return true; }
      const list = P.store.ownedWeapons();
      const best = ['rifle', 'harpoon', 'pistol', 'scatter'].find((w) => list.includes(w) && (P.store.weapons[w].mag > 0 || P.store.case.count(P.store.weaponStats(w).ammo) > 0));
      if (best && P.store.equipped !== best) it.slot = list.indexOf(best);
    }
    if (bot.dodgeIncoming(it, P, ['rivet', 'glob'])) return true;
    // Short of anything? What's lying about is what the fight is paying out.
    const shots = P.store.ownedWeapons().reduce((n, w) => n + P.store.weapons[w].mag + P.store.case.count(P.store.weaponStats(w).ammo), 0);
    const needs = a.mother ? shots < 12 || (P.hp < P.maxHp * 0.35 && !bot.hasHerb(P)) : shots < 40 || P.hp < P.maxHp * 0.5;
    if (needs && a.drops.length && bot.grabThings(it, dt, P)) return true;
    // He sags and comes round to face her, and a column may be in the way. Six seconds of shooting with nothing breaking
    // means this is the wrong place to shoot from: go and stand somewhere else with a clear line to him.
    if (B.state === 'SAG') {
      const left = B.locks.reduce((n, k) => n + Math.max(0, k.hp), 0);
      if (left !== bot.hatchLeft) { bot.hatchLeft = left; bot.hatchT = 0; bot.hatchSpot = null; }
      bot.hatchT = (bot.hatchT ?? 0) + dt;
      if (bot.hatchT > 6 && !bot.hatchSpot) {
        const nav = a.level.nav;
        const spots = [];
        for (let k = 0; k < 16; k++) {
          const ang = (k / 16) * Math.PI * 2;
          for (const r of [6, 8]) {
            const x = B.x + Math.sin(ang) * r; const z = B.z + Math.cos(ang) * r;
            // On her own side of him: he isn't on the walking grid, and the straight way across goes through him.
            const ownSide = (x - B.x) * (P.x - B.x) + (z - B.z) * (P.z - B.z) > 0;
            if (ownSide && nav.walkable(x, z) && nav.lineOfSight(x, z, B.x, B.z)) spots.push([x, z]);
          }
        }
        bot.hatchSpot = spots.length ? spots[Math.floor(bot.rand.next() * spots.length)] : null;
        bot.hatchWalk = 0;
        if (!bot.hatchSpot) bot.hatchT = 0;
      }
      if (bot.hatchSpot) {
        bot.hatchWalk += dt;
        if (bot.hatchWalk > 6 || Math.hypot(bot.hatchSpot[0] - P.x, bot.hatchSpot[1] - P.z) < 1.2) { bot.hatchSpot = null; bot.hatchT = 0; }
        else { bot.steerTo(it, bot.hatchSpot[0], bot.hatchSpot[1], true, dt); bot.checkStuck(it, dt, P); return true; }
      }
    }
    if (P.reloadT <= 0 && P.mag > 0) {
      it.aim = true;
      bot.aimAt(it, B, 'torso', dt);
      if (bot.onTarget(P) && P.fireT <= 0) { it.fire = true; it.firePressed = true; }
    }
    return true;
  },
  beats: [
    { id: 'naveStart', steps: [
      { run: (a) => {
        a.chapterCard('FINAL SETTLEMENT');
        a.bath = new Bathysphere(a, { x: X(13.5), z: Z(10), yaw: 0 });
        a.enemies.push(a.bath);
      } },
      { wait: 2.6 },
      { until: (a) => a.player.z < Z(40) },
      { cut: 'open' },
      { music: 'boss' },
      { run: (a) => {
        // The Dame sits this one out, by the door. Nobody can fight forty tons of plumbing and mind her coat.
        if (a.dame) { a.level.place('barrel', X(11.5), Z(45), { collide: false }); a.dame.hide({ x: X(11.5), z: Z(45) }); a.dame.staysHidden = true; }
        // Each burst valve still brings its 4 Monks, but they come a few at a time: the boss is the fight.
        a.director.maxActiveOverride = 5;
        a.bossLive = true;
        a.bath.state = 'WALK'; a.bath.stateT = 0;
        a.setObjective('FOUR VALVES: SHOULDERS AND HIPS. SHOOT THEM');
        a.showHint('WHEN HE WHISTLES, GET A COLUMN BEHIND YOU', 'run', 8);
        a.checkpoint(a.entry);
      } },
      // He's gone and she has the altar. Nobody fights all that plumbing again for one mistake with the Mother.
      { until: (a) => a.mother && !a.cut },
      { checkpoint: true },
      { run: (a) => {
        if (a.mother) return;
        // Continuing from here: put back what the first two phases left behind.
        if (a.dame) { a.level.place('barrel', X(11.5), Z(45), { collide: false }); a.dame.hide({ x: X(11.5), z: Z(45) }); a.dame.staysHidden = true; }
        a.director.maxActiveOverride = 5;
        a.bossLive = true;
        a.waterY = -0.25 + 0.15 * 4;
        a.world.setWaterLevel(a.waterY);
        a.mother = new Mother(a, X(13.5), Z(6.5));
        a.enemies.push(a.mother);
        a.player.teleport(X(13.5), 0, Z(20), Math.PI);
        a.cam.yaw = Math.PI; a.cam.pitch = 0.05;
        a.setMusic('boss');
      } },
      { until: (a) => a.motherDead },
    ] },
  ],
};
export { THREE };
