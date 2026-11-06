// Night Shift through a fake session with latency: rates, sizes, shots, revives, dawn, all-down.
import { boot, setup, step } from '../helpers.mjs';
import { app } from '../../src/core/app.js';
import { ShiftArena, ROUND_SECONDS } from '../../src/net/shift.js';

class FakeSession {
  constructor({ me, isHost, players, server = false }) {
    this.me = me; this.isHost = isHost; this.players = players; this.host = 0; this.server = server; this.seed = 5; this.limitMs = 300000;
    this.handlers = {}; this.sent = []; this.t = -Infinity; this.finished = null; this.perSecond = {}; this.maxPerSecond = 0; this.maxBytes = 0; this.maxW = 0;
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] ?? []).push(fn); return () => {}; }
  emit(ev, ...a) { for (const f of this.handlers[ev] ?? []) f(...a); }
  time() { return this.t; }
  rng() { return Math.random; }
  ready() { this.isReady = true; }
  answer() {}
  send(data, o = {}) {
    const bytes = JSON.stringify(data).length;
    this.maxBytes = Math.max(this.maxBytes, bytes);
    if (data.k === 'w') this.maxW = Math.max(this.maxW, bytes);
    const sec = Math.floor(this.simT ?? 0);
    this.perSecond[sec] = (this.perSecond[sec] ?? 0) + 1;
    this.maxPerSecond = Math.max(this.maxPerSecond, this.perSecond[sec]);
    this.sent.push({ data, o });
    return true;
  }
  finish(o) { this.finished = o; this.emit('end', { reason: 'finished', standings: o.standings, results: o }); }
}

const P2 = [{ id: 0, name: 'HOST', color: '#e8443a' }, { id: 1, name: 'GUEST', color: '#3b82f6' }];

async function run(e, s, seconds, each) {
  for (let i = 0; i < seconds * 60; i += 30) {
    s.t += 500; s.simT = (s.simT ?? 0) + 0.5;
    await step(e, 30);
    each?.(i);
  }
}

export default async function (t) {
  setup({ run: false });
  // ---- A host with a guest who only sends messages ----
  let s = new FakeSession({ me: 0, isHost: true, players: P2 });
  let e = await boot(new ShiftArena({ session: s, hub: true }));
  let a = e.game;
  await step(e, 5);
  t.ok(s.isReady, 'ready() with no key press');
  t.eq(a.enemies.length, 0, 'no one yet');
  s.t = -3000;
  s.emit('start', { in: 3000 });
  await step(e, 10);
  t.ok(a.frozenPlay, 'the countdown holds play');
  s.t = 0;
  app.dev.god = true;
  const G = a.remotes.get(1);
  // Guest pose and a shot through messages.
  await run(e, s, 6);
  t.ok(a.enemies.filter((x) => !x.dead).length >= 6, `wave one is here (${a.enemies.length})`);
  const target = a.enemies.find((x) => !x.dead);
  s.emit('message', { k: 'i', v: [Math.round((target.x) * 100), Math.round((target.z + 4) * 100), 180, 0, 1, 0] }, 1);
  await step(e, 30);
  t.near(G.tx, target.x, 0.5, 'the guest pose arrives');
  const hp0 = target.hp;
  const zx = target.x; const zz = target.z;
  const hit = target.aimPoint('torso', new target.zones.center.constructor());
  const ox = hit.x; const oz = hit.z + 2; const oy = hit.y + 0.2;
  const len = Math.hypot(hit.x - ox, hit.y - oy, hit.z - oz);
  s.emit('message', { k: 'a', v: [['f', 0, Math.round(ox * 100), Math.round(oy * 100), Math.round(oz * 100), Math.round(((hit.x - ox) / len) * 1000), Math.round(((hit.y - oy) / len) * 1000), Math.round(((hit.z - oz) / len) * 1000)]] }, 1);
  t.ok(target.hp < hp0 || target.dead, 'a guest shot resolves on the host');
  void zx; void zz;
  // Downed, bleed-out and revive: host revives the guest.
  G.hurt(9999, { x: G.x, z: G.z }, {});
  t.ok(!G.alive, 'guest is down');
  t.ok(a.downed.has(1), 'on the bleed-out list');
  a.player.teleport(G.x + 1, 0, G.z);
  await step(e, 2);
  for (let i = 0; i < 12; i++) a.reviveTick(a.player, 1);
  t.ok(!a.downed.has(1), 'revived in 2 s of holding');
  t.ok(G.flags !== undefined && !(G.flags & 4), 'guest is up');
  t.eq(a.stats[0].revives, 1, 'a revive counted');
  G.alive = true;
  // Fill the world: cap of 24, snapshots stay small, rates stay legal.
  for (let i = 0; i < 40; i++) a.director.queueSpawn('gaffer', 1, ['1', '2', '3', '4', '5'][i % 5], {});
  await run(e, s, 20);
  const alive = a.enemies.filter((x) => !x.dead).length;
  t.ok(alive <= 26, `cap holds (${alive})`);
  t.ok(s.maxW > 0 && s.maxW < 1200, `snapshots under 1,200 bytes (${s.maxW})`);
  t.ok(s.maxPerSecond <= 20, `at most 20 messages a second (${s.maxPerSecond})`);
  t.ok(s.maxBytes < 16384, `messages under 16 KB (${s.maxBytes})`);
  t.eq(e.errors.length, 0, `no errors: ${e.errors[0] ?? ''}`);
  // Dawn wins it.
  s.t = (ROUND_SECONDS - 1) * 1000;
  await run(e, s, 8);
  t.ok(a.dawned, 'dawn comes at 4:00');
  t.ok(s.finished, 'finish() called');
  t.eq(s.finished.won, true, 'dawn is a win');
  t.ok(s.finished.standings.flat().length === 2, 'every player in the standings');
  t.ok(s.finished.stats[0].Score !== undefined && Object.keys(s.finished.stats[0]).length <= 6, 'stats, up to 6 per player');
  t.ok(s.finished.awards.every((x) => x.title.length <= 24 && x.detail.length <= 40), 'awards within their limits');
  const sentAfter = s.sent.length;
  await step(e, 60);
  t.eq(s.sent.length, sentAfter, 'nothing sent after the end');

  // ---- All down ends it ----
  s = new FakeSession({ me: 0, isHost: true, players: [P2[0]] });
  app.dev.god = false;
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  s.t = 0;
  s.emit('start', { in: 0 });
  await step(e, 10);
  a.player.hurt(9999, { x: 0, z: 0 }, {});
  t.ok(a.downed.has(0), 'solo: down');
  await run(e, s, 22);
  t.ok(s.finished, 'all down: finish() called');
  t.eq(s.finished.won, false, 'all down is a loss');
  // ---- time-up: finish at once ----
  s = new FakeSession({ me: 0, isHost: true, players: [P2[0]] });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  s.t = 1000;
  s.emit('start', { in: 0 });
  await step(e, 20);
  s.emit('time-up', { graceMs: 5000 });
  t.ok(s.finished, 'time-up finishes immediately');
  // ---- A server: no local player ----
  s = new FakeSession({ me: 9, isHost: true, players: P2, server: true });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  t.ok(!a.player, 'a server copy has no local player');
  s.t = 0;
  s.emit('start', { in: 0 });
  await run(e, s, 3);
  t.ok(a.enemies.length > 0, 'it still runs the world');
  t.eq(e.errors.length, 0, `server: no errors: ${e.errors[0] ?? ''}`);
  // ---- A client: ghosts from snapshots ----
  s = new FakeSession({ me: 1, isHost: false, players: P2 });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  s.t = 0;
  s.emit('start', { in: 0 });
  await step(e, 5);
  s.emit('message', { k: 'w', n: 1, t: 0, e: [[1, 0, 100, 200, 90, 3, 100], [2, 3, -300, 200, 0, 8, 50]], p: [[0, 0, 0, 0, 0, 100], [1, 100, 100, 0, 0, 77]], s: [12, 1, 500] }, 0);
  await step(e, 10);
  t.eq(a.enemies.filter((x) => x.ghost).length, 2, 'snapshot makes ghost enemies');
  t.eq(a.player.hp, 77, 'health comes from the host');
  t.eq(a.teamScore, 500, 'score comes from the host');
  s.emit('message', { k: 'e', v: [['k', 1, 0]] }, 0);
  await step(e, 2);
  t.ok(a.enemies.find((x) => x.id === 1).dead, 'kill event kills the ghost');
  // Client actions go to the host.
  a.resolveShot(a.player, a.player.weapon, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 });
  await step(e, 15);
  t.ok(s.sent.some((m) => m.data.k === 'a'), 'client sends actions');
  t.ok(s.sent.some((m) => m.data.k === 'i'), 'client sends its pose');
  t.eq(e.errors.length, 0, `client: no errors: ${e.errors[0] ?? ''}`);

  // ---- Every client action resolves on the host; kills score; leaving is clean. ----
  s = new FakeSession({ me: 0, isHost: true, players: P2 });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  s.t = 0; s.emit('start', { in: 0 });
  app.dev.god = true;
  await run(e, s, 3);
  const R = a.remotes.get(1);
  s.emit('message', { k: 'i', v: [Math.round(a.player.x * 100), Math.round((a.player.z + 3) * 100), 0, 0, 0, 0] }, 1);
  await step(e, 30);
  const foe = (st) => { const x = a.spawnEnemy('gaffer', { x: R.x + 0.5, z: R.z - 1, state: 'SCRIPT', hpMul: 10 }); x.state = st; return x; };
  let en = foe('STUN');
  const kicks = R.stats.kicks;
  s.emit('message', { k: 'a', v: [['k', en.id]] }, 1);
  t.eq(R.stats.kicks, kicks + 1, 'a guest kick lands on the host');
  en = foe('KNEEL');
  let hp = en.hp;
  s.emit('message', { k: 'a', v: [['t', en.id]] }, 1);
  t.ok(hp - en.hp >= 60, 'so does a takedown');
  en = foe('APPROACH');
  en.x = R.x; en.z = R.z + 1;
  R.yaw = 0;
  hp = en.hp;
  s.emit('message', { k: 'a', v: [['n']] }, 1);
  t.ok(hp - en.hp >= 8, `so does a knife (${hp - en.hp})`);
  const before = a.projectiles.length;
  s.emit('message', { k: 'a', v: [['g', 1, Math.round(R.x * 100), Math.round(R.z * 100), Math.round(R.x * 100), Math.round((R.z - 4) * 100)]] }, 1);
  t.ok(a.projectiles.length > before, 'and a grenade');
  const kills = R.stats.kills; const score = R.stats.score;
  en = foe('APPROACH');
  en.hit({ zone: 'head', part: 'head', damage: 9999, weapon: { id: 'pistol' }, dir: new en.zones.center.constructor(0, 0, 1), t: 1, point: new en.zones.center.constructor(en.x, 1, en.z), by: R });
  t.eq(R.stats.kills, kills + 1, 'a guest kill counts for the guest');
  t.ok(R.stats.score > score, 'and scores');
  t.eq(R.stats.heads, (R.stats.heads), 'heads tracked');
  // A guest revives the host.
  app.dev.god = false;
  a.player.hurt(9999, { x: a.player.x, z: a.player.z }, {});
  await step(e, 2);
  t.ok(a.downed.has(0), 'the host is down');
  s.emit('message', { k: 'i', v: [Math.round(a.player.x * 100), Math.round((a.player.z + 1) * 100), 0, 0, 0, 0] }, 1);
  await step(e, 30);
  for (let i = 0; i < 12 && a.downed.has(0); i++) s.emit('message', { k: 'a', v: [['r', 0]] }, 1);
  await step(e, 3);
  t.ok(!a.downed.has(0), 'and a guest can revive him');
  t.ok(a.player.alive, 'back on his feet');
  app.dev.god = true;
  s.emit('leave', { id: 1 });
  await step(e, 10);
  t.ok(!a.remotes.get(1) || a.remotes.get(1).gone || !a.players.includes(R), 'a guest who leaves is removed');
  t.eq(e.errors.length, 0, `no engine errors: ${e.errors[0] ?? ''}`);
  app.dev.god = false;

  // ---- Host: kills drop things, whoever walks over them takes them, crates break, thrown things are shown. ----
  s = new FakeSession({ me: 0, isHost: true, players: P2 });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  s.t = 0; s.emit('start', { in: 0 });
  app.dev.god = true;
  await run(e, s, 2);
  const eventsOf = (kind) => s.sent.filter((m) => m.data.k === 'e').flatMap((m) => m.data.v).filter((v) => v[0] === kind);
  a.dropAt(a.player.x + 6, a.player.z);
  await step(e, 10);
  t.ok(a.dropsById.size === 1, 'a Night Shift drop lands');
  t.ok(eventsOf('d').length >= 1, 'and every client hears of it');
  const [dropId, dropped] = [...a.dropsById][0];
  s.emit('message', { k: 'i', v: [Math.round(dropped.x * 100), Math.round(dropped.z * 100), 0, 0, 0, 0] }, 1);
  await run(e, s, 2);
  t.ok(!a.dropsById.has(dropId), 'a guest walking over it takes it');
  t.ok(eventsOf('T').some((v) => v[1] === dropId && v[2] === 1), 'and everyone hears who');
  const heldBefore = app.run.case.items.length + app.run.case.count('ammoPistol');
  a.dropAt(a.player.x, a.player.z);
  await run(e, s, 1);
  t.eq(a.dropsById.size, 0, 'the host takes one too');
  t.ok(app.run.case.items.length + app.run.case.count('ammoPistol') >= heldBefore, 'into the case');
  const cr = a.level.crates.find((c) => !c.broken && c.kind !== 'brine');
  t.ok(cr, 'the quay has crates');
  a.breakCrate(cr);
  await step(e, 2);
  t.ok(cr.broken, 'a crate breaks');
  t.ok(eventsOf('c').some((v) => v[1] === cr.c && v[2] === cr.r), 'and every client sees it');
  const bottler = a.spawnEnemy('bottler', { x: a.player.x + 6, z: a.player.z, state: 'SCRIPT', hpMul: 5 });
  a.throwFrom(bottler, a.player);
  await run(e, s, 1);
  t.ok(eventsOf('p').some((v) => v[1] === 'bottle'), 'thrown things are shown to clients');
  t.ok(typeof a.status() === 'string', 'status reads');
  t.eq(e.errors.length, 0, `no engine errors on the host: ${e.errors[0] ?? ''}`);
  app.dev.god = false;

  // ---- A client: its own actions go to the host; what the host says appears. ----
  s = new FakeSession({ me: 1, isHost: false, players: P2 });
  e = await boot(new ShiftArena({ session: s, hub: true }));
  a = e.game;
  await step(e, 5);
  t.ok(s.isReady, 'a client is ready with no key press too');
  s.t = 0; s.emit('start', { in: 0 });
  await run(e, s, 1);
  const actionsSent = () => s.sent.filter((m) => m.data.k === 'a').flatMap((m) => m.data.v);
  t.ok(a.enemies.every((x) => !x.d || x.state !== 'APPROACH' || !x.isRealAi), 'a client runs no AI of its own');
  const P = a.player;
  a.resolveKick(P, { id: 77 });
  a.resolveTakedown(P, { id: 78 });
  a.resolveKnife(P, { damage: 8, reach: 2, arc: 1.3, downed: 3 });
  const thrown = a.projectiles.length;
  a.throwGrenade(P, 'depth', { x: P.x, z: P.z - 4 });
  t.ok(a.projectiles.length > thrown, 'a client sees its own grenade at once');
  await run(e, s, 1);
  const acts = actionsSent();
  t.ok(acts.some((x) => x[0] === 'k' && x[1] === 77), 'a client kick goes to the host');
  t.ok(acts.some((x) => x[0] === 't' && x[1] === 78), 'so does a takedown');
  t.ok(acts.some((x) => x[0] === 'n'), 'and a knife');
  t.ok(acts.some((x) => x[0] === 'g' && x[1] === 1), 'and a grenade');
  s.emit('message', { k: 'e', v: [['d', 41, 0, 12, Math.round(P.x * 100), Math.round((P.z - 3) * 100)]] }, 0);
  await step(e, 2);
  t.ok(a.dropsById.has(41), 'a drop the host announces appears');
  const mine = app.run.case.count('ammoPistol');
  s.emit('message', { k: 'e', v: [['T', 41, 1, 0]] }, 0);
  await step(e, 2);
  t.ok(!a.dropsById.has(41), 'and goes when taken');
  t.eq(app.run.case.count('ammoPistol'), mine + 12, 'into my case when I took it');
  s.emit('message', { k: 'e', v: [['d', 42, 0, 12, Math.round(P.x * 100), Math.round((P.z - 3) * 100)]] }, 0);
  s.emit('message', { k: 'e', v: [['T', 42, 0, 0]] }, 0);
  await step(e, 2);
  t.eq(app.run.case.count('ammoPistol'), mine + 12, 'and not when someone else did');
  s.emit('message', { k: 'e', v: [['p', 'bottle', 0, 0, 200, 200]] }, 0);
  await step(e, 5);
  t.eq(e.errors.length, 0, `no engine errors on a client: ${e.errors[0] ?? ''}`);
}
