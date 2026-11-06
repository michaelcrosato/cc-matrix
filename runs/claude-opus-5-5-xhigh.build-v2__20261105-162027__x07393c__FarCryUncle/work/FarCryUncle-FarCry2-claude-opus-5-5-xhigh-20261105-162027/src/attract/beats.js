// The attract reel, as data: a list of beats. Each sets a place and an hour, then cheats its way through something worth seeing.
// Run by the director, in the real game, with god mode and bot input through the same action layer.
import { SITES, POSTS } from '../content/sites.js';
import { WEAPONS } from '../content/weapons.js';
import { pointAlong, polyLength } from '../world/ground.js';
import { ROADS } from '../content/roads.js';
const look = (g, x, y, z) => { const e = g.player.eye, dx = x - e.x, dy = y - e.y, dz = z - e.z; g.player.setYaw(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
function squadAt(g, key, faction, x, z, n = 4) { const sq = g.actors.addSquadDef(key, { faction, n, at: [x, z], noReman: true }); sq.forceLive = true; g.actors.liveSquad(g.ctx, sq); return sq; }
export const BEATS = [
  { id: 'drive-map', seconds: 12, hour: 18, * run(g, d, bot) {
    const pts = ROADS.west.pts, p = pointAlong(pts, 60, [0, 0, 0]);
    const v = g.vehicles.spawn('technical', p[0], p[1], p[2], { paint: 'orange', hood: 'red', roof: 'sand' });
    d.keep.push(v);
    g.driving.enter(v);
    bot.analog.gas = 0.85;
    for (let i = 0; i < 120; i++) { d.steerAlong(v, pts); yield 0; }
    g.map.setWaypoint(-260, 240);
    g.map.raise(true);
    for (;;) { d.steerAlong(v, pts); yield 0; }
  } },
  { id: 'jam-fight', seconds: 13, hour: 15, * run(g, d, bot) {
    const P = POSTS.p2;
    g.player.teleport(P.at[0] + 22, P.at[1] + 22);
    g.weapons.give('tractor', 28, true);
    squadAt(g, 'attract-a', 'concord', P.at[0] + 2, P.at[1] + 2, 4);
    look(g, P.at[0], g.player.eye.y - 0.2, P.at[1]);
    yield 1;
    bot.hold('fire');
    g.weapons.scriptJamAt = 10; g.weapons.scriptShots = 0;
    for (let i = 0; i < 90; i++) { d.aimNearest(); yield 0; if (g.weapons.gun.jam) break; }
    bot.hold('fire', false);
    for (let i = 0; i < 3; i++) { yield 0.5; bot.press('reload'); }
    yield 0.8;
    bot.hold('fire');
    for (;;) { d.aimNearest(); yield 0; }
  } },
  { id: 'flare-grass', seconds: 14, hour: 16.5, wind: [0.9, 0.3, 6], * run(g, d, bot) {
    const x = -130, z = 120;
    g.player.teleport(x, z);
    g.weapons.give('flare', 100, true);
    g.player.setYaw(-1.2, 0.03);
    squadAt(g, 'attract-b', 'harvest', x + 34, z + 6, 5);
    yield 1;
    bot.press('fire');
    yield 2.5;
    look(g, x + 30, g.player.eye.y, z + 6);
    yield 1.2;
    for (const s of g.actors.soldiers) if (s.active && !s.dead && s.squad?.key === 'attract-b') s.ignite();
    for (;;) yield 0;
  } },
  { id: 'night-field', seconds: 13, hour: 22, wind: [0.9, 0.2, 5], * run(g, d, bot) {
    const s = SITES['long-field'];
    for (const [dx, dz] of [[-70, -40], [-70, 0], [-70, 40], [-40, -30], [-40, 30]]) g.fire.ignite(s.at[0] + dx, s.at[1] + dz, 8, 'world');
    for (let i = 0; i < 4 * 12; i++) g.fire.tick(g.wind, 0.25);
    const pts = [[s.at[0] - 120, s.at[1] + 80], [s.at[0] + 120, s.at[1] + 80]];
    const v = g.vehicles.spawn('pickup', pts[0][0], pts[0][1], Math.PI / 2);
    d.keep.push(v);
    g.driving.enter(v);
    g.driving.chase = true;
    bot.analog.gas = 0.9;
    for (;;) { d.steerAlong(v, pts); yield 0; }
  } },
  { id: 'fever', seconds: 10, hour: 13, * run(g, d, bot) {
    g.player.teleport(-260, 225);
    g.player.setYaw(0.2, -0.05);
    g.weapons.give('tractor', 80, true);
    g.body.tablets = 2;
    g.story.feverRunning = true;
    g.dev.noFever = false;
    g.body.startFever({ limit: 999 });
    yield 4;
    bot.hold('tablet');
    yield 1.4;
    bot.hold('tablet', false);
    for (;;) yield 0;
  } },
  { id: 'surgery', seconds: 7, hour: 11, * run(g, d, bot) {
    g.player.teleport(90, -60);
    g.player.setYaw(2, -0.1);
    g.body.hp = 12;
    g.body.lastDamage = 'bullet';
    yield 0.4;
    bot.press('heal');
    for (;;) yield 0;
  } },
  { id: 'scoped', seconds: 10, hour: 12, * run(g, d, bot) {
    const P = POSTS.p5;
    g.player.teleport(P.at[0] - 120, P.at[1] - 30);
    g.weapons.give('empire', 100, true);
    const sq = squadAt(g, 'attract-c', 'concord', P.at[0], P.at[1], 4);
    yield 0.5;
    d.aimNearest();
    bot.hold('aim');
    yield 2;
    for (;;) { d.aimNearest(); bot.press('fire'); yield 1.6; }
  } },
  { id: 'rescue', seconds: 12, hour: 10, * run(g, d, bot) {
    g.player.teleport(-210, 80);
    g.player.setYaw(0.4, 0);
    g.weapons.give('tractor', 70, true);
    const b = g.actors.buddy('ines'); b.met = true; b.dead = false; b.spentUntil = 0; b.woundedUntil = 0;
    const was = g.dev.god; g.dev.god = false;
    g.body.hp = 1;
    g.body.hurt(10, 'bullet');
    g.dev.god = was;
    yield 5.2;
    b.goDown(false);
    g.player.teleport(b.x + 2, b.z);
    look(g, b.x, b.y + 0.7, b.z);
    for (;;) yield 0;
  } },
  { id: 'tracker', seconds: 10, hour: 9, * run(g, d, bot) {
    const c = [-145, 435];
    g.player.teleport(c[0] + 24, c[1] + 8);
    g.story.trackerOwned = true;
    look(g, c[0], g.player.eye.y - 0.5, c[1]);
    g.fire.burnStrip([[c[0] - 12, c[1]], [c[0] + 20, c[1] + 6]], 16);
    yield 0.4;
    bot.press('tracker');
    bot.move.y = 0.7;
    for (;;) { look(g, c[0], g.player.eye.y - 0.7, c[1]); yield 0; }
  } },
  { id: 'train-mg', seconds: 12, hour: 17, * run(g, d, bot) {
    const tr = g.train;
    tr.place(tr.sAt(-40, 75));
    g.player.seatOnTrain(3, [0, 2.3, 1.2], true, 0.15);
    g.weapons.mounted = { turret: () => { const c = tr.cars[3]; if (c.turret) c.turret.rotation.y = g.player.yaw - c.yaw + Math.PI; } };
    tr.run(tr.sAt(300, -15), 12);
    squadAt(g, 'attract-d', 'harvest', 60, 80, 5);
    squadAt(g, 'attract-e', 'concord', 150, 60, 5);
    yield 0.6;
    bot.hold('fire');
    for (;;) { d.aimNearest(); yield 0; }
  } },
  { id: 'rack', seconds: 9, hour: 11, * run(g, d, bot) {
    const n = g.npcs.byWho.tibor;
    g.player.teleport(n.x + 1, n.z + 3.5);
    look(g, n.x, n.y + 1.4, n.z);
    g.story.stones = 40;
    yield 1;
    g.ui.openRack();
    for (let i = 0; i < 4; i++) { yield 1.6; g.ui.menu.top?.onSide?.(1, g.ui.menu.top); }
    for (;;) yield 0;
  } },
  { id: 'map-table', seconds: 9, hour: 22, * run(g, d, bot) {
    const s = SITES.observatory;
    g.player.teleport(s.at[0], s.at[1] + 3.5);
    for (const k of ['A', 'B', 'C']) g.missions.applyOps([{ burnStrip: k }], true);
    g.ending.endScene = false;
    g.ending.harrowScene(g.npcs.byWho.harrow);
    yield 1.5;
    g.ending.layMap();
    for (;;) yield 0;
  } },
  { id: 'title-card', seconds: 6, hour: 18.5, title: true, wind: [0.9, 0.3, 5], * run(g, d, bot) {
    const s = SITES['long-field'];
    g.fire.ignite(s.at[0], s.at[1], 18, 'world');
    for (let i = 0; i < 4 * 8; i++) g.fire.tick(g.wind, 0.25);
    g.player.teleport(s.at[0] + 110, s.at[1] + 80);
    look(g, s.at[0], g.player.eye.y + 2, s.at[1]);
    for (;;) yield 0;
  } },
];
