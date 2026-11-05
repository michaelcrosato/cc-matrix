// The one test command: node tests/run.mjs. It loads the engine and the game headless (no DOM, no screen), checks the
// battle's rules, plays both operations to the end with the bot, and drives the scenes. It prints only failures and a
// one-line count, and exits 1 on any failure.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { loadOrder } from '../tools/files.mjs';

const ctx = { console, Math, Date, JSON, setTimeout: undefined };
ctx.globalThis = ctx;
vm.createContext(ctx);
const errors = [];
for (const f of loadOrder()) {
  try { vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f }); }
  catch (e) { errors.push(f + ': ' + e.message); }
}
if (errors.length) { console.log('FAIL load: ' + errors.join(' | ')); console.log('1 check(s) failed'); process.exit(1); }

const WP = ctx.WP, E = ctx.My3D2dge, game = E.current;
let total = 0, failed = 0;
const check = (what, ok, detail = '') => {
  total++;
  if (!ok) { failed++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); }
};
const snap = () => game.debug.snapshot();

// ---- the geometry and the random streams -----------------------------------------------------------------------------
{
  const p = WP.proj(120, 90, 0), u = WP.unproj(p.sx, p.gy, 0);
  check('a ground point projects and unprojects back', u && Math.abs(u.x - 120) < 0.01 && Math.abs(u.z - 90) < 0.01, JSON.stringify([p, u]));
  check('the horizon is above every ground point', WP.proj(0, 400, 0).gy > WP.HZ);
  const a = WP.rng(42), b = WP.rng(42);
  check('the same seed gives the same stream', a() === b() && a() === b());
  check('the rail interpolates between knots', Math.abs(WP.railX([[0, 0], [100, 50]], 50) - 25) < 1e-9);
}

// ---- the operations' data -----------------------------------------------------------------------------------------------
for (const id of WP.OP_ORDER) {
  const op = WP.OPS[id];
  const b = new WP.Battle(id, { seed: 1 });
  const soldiers = b.beats.reduce((n, beat) => n + (beat.spawn || []).filter(s => WP.TYPES[s.type] && WP.TYPES[s.type].quota === 'soldier').length, 0) + 2 * op.hostages.length;   // (two guards per hostage)
  check(`${id}: enough soldiers are on the rail for the quota`, soldiers >= op.quotas.soldier, soldiers + ' < ' + op.quotas.soldier);
  check(`${id}: a boss is defined`, !!WP.BOSSES[op.boss]);
  check(`${id}: the beats are in order`, b.beats.every((x, i) => i === 0 || b.beats[i - 1].at <= x.at));
}

// ---- the battle's rules, on a bare battle ----------------------------------------------------------------------------------
{
  const b = new WP.Battle('op1', { seed: 5 });
  b.hold = null; b.phase = 'rail';
  const s = b.spawn('soldier', b.camX, 150, { wave: true });
  s.state = 'up'; s.rise = 1; s.t = 99; s.cd = 99;
  b.step(1 / 120, { aim: null });
  const r = b.rect(s);
  b.p.cx = (r.x0 + r.x1) / 2; b.p.cy = (r.y0 + r.y1) / 2;
  const before = b.p.kills.soldier;
  b.step(1 / 120, { fire: true });
  check('a shot on a soldier kills it', b.p.kills.soldier === before + 1 && s.dead, JSON.stringify(b.snapshot().player));
  check('a kill counts toward the quota', b.done.soldier === 1);
  check('a kill raises the streak', b.p.streak === 1);
}
{
  // a shot that closes its ring lands; a kill before it closes does not
  const b = new WP.Battle('op1', { seed: 6 });
  const s = b.spawn('soldier', b.camX, 150, {});
  s.state = 'up'; s.rise = 1; s.t = 99; s.cd = 0;
  b.step(1 / 120, {});
  check('a soldier starts a telegraph ring', s.tg > 0);
  for (let i = 0; i < 120 * 4 && !b.over; i++) b.step(1 / 120, {});
  check('a closed ring lands a shot on the player', b.p.damage > 0, JSON.stringify(b.snapshot().player));
}
{
  const b = new WP.Battle('op1', { seed: 7 });
  const s = b.spawn('soldier', b.camX, 150, {});
  s.state = 'up'; s.rise = 1; s.t = 99; s.cd = 0;
  b.step(1 / 120, {});
  const r = b.rect(s);
  b.p.cx = (r.x0 + r.x1) / 2; b.p.cy = (r.y0 + r.y1) / 2;
  b.step(1 / 120, { fire: true });
  for (let i = 0; i < 120 * 3; i++) b.step(1 / 120, {});
  check('a soldier killed before its ring closes lands no shot', b.p.damage === 0 && s.dead, JSON.stringify(b.snapshot().player));
}
{
  // civilians: shooting one costs damage and points
  const b = new WP.Battle('op2', { seed: 8 });
  const c = b.spawn('civilian', b.camX, 150, { vx: 0 });
  b.step(1 / 120, {});
  const r = b.rect(c);
  b.p.cx = (r.x0 + r.x1) / 2; b.p.cy = (r.y0 + r.y1) / 2;
  b.p.score = 1000;
  b.step(1 / 120, { fire: true });
  check('a civilian hit costs damage', b.p.damage > 0 && b.civShot === 1);
  check('a civilian hit costs points', b.p.score === 500, 'score ' + b.p.score);
}
{
  // the grenade: a blast takes what is in its radius and nothing outside
  const b = new WP.Battle('op1', { seed: 9 });
  const near = b.spawn('soldier', b.camX, 150, {}), far = b.spawn('soldier', b.camX + 300, 150, {});
  for (const s of [near, far]) { s.state = 'up'; s.rise = 1; s.t = 99; s.cd = 99; }
  b.explode(b.camX, 150, 36);
  check('a grenade kills what is in its radius', near.dead && !far.dead);
}
{
  // the magazine: it runs down, reloads from the spares, and runs out
  const b = new WP.Battle('op1', { seed: 10 });
  b.p.mag = 1;
  b.step(1 / 120, { fire: true });
  check('firing spends a round', b.p.mag === 0);
  b.step(1 / 120, { reload: true });
  b.step(2, {});
  check('a reload refills from the spares', b.p.mag > 0 && b.p.spares < WP.T.spares, JSON.stringify(b.snapshot().player));
}
{
  // the damage meter: the run is lost when it fills
  const b = new WP.Battle('op1', { seed: 11 });
  b.hurt(100, 'test');
  check('a full damage meter loses the operation', b.result === 'lost');
}
{
  // the rail holds until the wave is clear, then moves on
  const b = new WP.Battle('op1', { seed: 12 });
  b.dist = b.op.holds[0].at - 1;
  for (let i = 0; i < 120 * 3; i++) b.step(1 / 120, {});
  check('the rail stops at a hold while the wave is up', b.hold !== null && b.dist === b.op.holds[0].at, JSON.stringify([b.hold && b.hold.at, b.dist]));
}

// ---- the dev sliders: live values, reset -----------------------------------------------------------------------------------
{
  const was = WP.T.fireRate;
  WP.T.fireRate = 16;
  check('a slider is read live by the battle', new WP.Battle('op1', { seed: 3 }).p.cool === 0 && WP.T.fireRate === 16);
  WP.resetTuning();
  check('reset to defaults puts every slider back', WP.T.fireRate === was);
}

// ---- a player joins in the middle of an operation: a fresh loadout; every operation draws ----------------------------
{
  const b = new WP.Battle('op2', { seed: 71 });
  const pl = b.addPlayer(2);
  check('a mid-op join gets six magazines and four grenades', pl.spares === 6 && pl.grenades === 4 && b.players.length === 2);
  const target = { _info: undefined, _r: undefined, _z: undefined, _c: null, width: 480, height: 270, fillStyle: '#000' };
  const stub = new Proxy(target, { get: (t, k) => (k in t ? t[k] : (t[k] = () => ({ width: 6, height: 7, data: new Uint8ClampedArray(4) }))), set: (t, k, v) => { t[k] = v; return true; } });
  let drawn = 0;
  for (const id of WP.OP_ORDER) {
    const ob = new WP.Battle(id, { seed: 72, players: 2 });
    for (let i = 0; i < 120 * 60; i++) ob.step(1 / 120, ob.players.map(q => WP.bot(ob, 1 / 120, q)));
    try { WP.drawBattle(stub, ob); drawn++; } catch (e) { check(id + ' draws', false, e.message); }
  }
  check('every operation draws in the middle of play', drawn === 6, 'drawn ' + drawn);
}

// ---- co-op: three seats, each with its own crosshair and ammo, clear an operation together --------------------------
{
  const b = new WP.Battle('op1', { seed: 61, players: 3, god: true });
  check('a co-op battle has a player per seat', b.players.length === 3 && b.players[2].id === 3);
  const b2 = b;
  for (let i = 0; i < 120 * 900 && !b2.result; i++) b2.step(1 / 120, b2.players.map(pl => WP.bot(b2, 1 / 120, pl)));
  check('three seats clear op1 together', b2.result === 'won', `${b2.result} ${JSON.stringify(b2.done)} ${b2.t.toFixed(0)}s`);
  check('every seat fired and scored', b2.players.every(pl => pl.shots > 0 && pl.score > 0), JSON.stringify(b2.players.map(pl => [pl.shots, pl.score])));
  const d = new WP.Battle('op1', { seed: 62, players: 2 });
  d.hurt(100, 'test', d.players[1]);
  check('one seat down does not end a co-op battle', d.result === null && d.players[1].down);
  d.hurt(100, 'test', d.players[0]);
  check('every seat down ends it', d.result === 'lost');
}

// ---- an AI Hub session between two copies, through an in-process hub that relays their messages ----------------------
{
  const { createContext, runInContext } = vm;
  const boot = (id, isHost, hub) => {
    const c = { console, Math, Date, JSON, globalThis: null, AIHub: hub };
    c.globalThis = c; vm.createContext(c);
    for (const f of loadOrder()) vm.runInContext(readFileSync(f, 'utf8'), c, { filename: f });
    return c;
  };
  const relay = { a: null, b: null };
  const mkHub = (id, isHost) => {
    const handlers = {}, hub = {
      active: true, seed: 987654,
      rng: label => WP.rng(987654 + WP.hashSeed(String(label))),
      connect: () => Promise.resolve({ me: id, host: 'a', isHost, players: [{ id: 'a' }, { id: 'b' }], seed: 987654, splash: false }),
      ready() {}, time: () => 1000, limitMs: 0,
      on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
      send(data) { const other = id === 'a' ? relay.b : relay.a; if (other) other.hubDeliver('message', [data, id]); return true; },
      finish(o) { hub.finished = (hub.finished || 0) + 1; hub.outcome = o; },
      deliver(type, args) { for (const f of handlers[type] || []) f(...args); },
    };
    hub.hubDeliver = (type, args) => hub.deliver(type, args);
    return hub;
  };
  const ha = mkHub('a', true), hb = mkHub('b', false);
  const ca = boot('a', true, ha), cb = boot('b', false, hb);
  relay.a = ha; relay.b = hb;
  const EA = ca.My3D2dge, EB = cb.My3D2dge, WA = ca.WP, WB = cb.WP;
  const ga = EA.current, gb = EB.current;
  // connect: the hub welcomes both copies; the session starts the battle on each
  await Promise.all([WA.Net.connect(), WB.Net.connect()]);
  ga.go('net', null, { fade: 0 }); gb.go('net', null, { fade: 0 });
  ga.advance(0.2); gb.advance(0.2);
  check('the host builds the battle and the client a view', !!WA.Net.battle && !!WB.Net.view, JSON.stringify([!!WA.Net.battle, !!WB.Net.view]));
  check('both copies play the same operation', WA.Net.op === WB.Net.op && WA.Net.seed === WB.Net.seed);
  // the client moves its crosshair; its inputs reach the host's seat for it
  gb.input.hold('right', true); gb.advance(1); gb.input.hold('right', false);
  ga.advance(2.5); gb.advance(2.5);
  const hostSeat = WA.Net.battle.players[1];
  check('the host runs the battle on both seats', WA.Net.battle.t > 2 && WA.Net.battle.players.length === 2, String(WA.Net.battle.t));
  check('the client sees the host\'s world', Math.abs(WB.Net.view.t - WA.Net.battle.t) < 0.5 && Math.abs(WB.Net.view.camX - WA.Net.battle.camX) < 1, `${WB.Net.view.t} vs ${WA.Net.battle.t}`);
  check('the client\'s crosshair reaches the host', hostSeat && hostSeat.cx !== WA.Net.battle.players[0].cx, JSON.stringify(hostSeat && [hostSeat.cx, WA.Net.battle.players[0].cx]));
  check('the session has no errors', ga.errors.length === 0 && gb.errors.length === 0, [...ga.errors, ...gb.errors].map(e => e.message).join(' | '));
  // the host's battle ends: one report to the hub, with standings
  WA.Net.battle.result = 'won'; WA.Net.battle.resultAt = WA.Net.battle.t - 10;
  ga.advance(0.2);
  check('the host reports the result once to the hub', ha.finished === 1 && Array.isArray(ha.outcome.standings), JSON.stringify(ha.outcome));
}

// ---- the whole game, through the engine: scenes, the bot's playthroughs, attract ----------------------------------
game.advance(0.2);
check('the title is the first scene', snap().scene === 'title', snap().scene);
check('no errors on the title', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
game.advance(11);
check('ten seconds with no input starts the attract mode', snap().scene === 'attract', snap().scene);
game.advance(2);
check('the attract battle plays', snap().battle && snap().battle.t > 1, JSON.stringify(snap().battle));
game.input.tap('confirm'); game.advance(0.3);
check('any input leaves the attract mode', snap().scene === 'title', snap().scene);

for (const [id, seedBase] of [['op1', 21], ['op2', 22], ['op3', 23], ['op4', 24], ['op5', 25], ['op6', 26]]) {
  WP.override = (b, dt) => WP.bot(b, dt);
  game.debug.start(id, { seed: seedBase, carry: { score: 0, damage: 0, spares: 4, grenades: 5, saved: 0, lost: 0, civHit: 0, kills: { soldier: 0, vehicle: 0, boss: 0 } } });
  for (let i = 0; i < 120 * 8 && !(snap().scene === 'play' && game.debug.battle() && game.debug.battle().opId === id); i++) game.advance(1 / 120);
  let guard = 0, b = game.debug.battle();
  check(`${id} starts with a battle`, snap().scene === 'play' && !!b && b.opId === id, snap().scene + ' ' + (b && b.opId));
  b.god = true;   // the clear path: the bot plays invulnerable; the loss path is checked above
  const bossCheck = { seen: false };
  while (guard++ < 120 * 900 && !(b.result && b.finished)) {
    game.advance(1 / 120);
    if (b.phase === 'boss') bossCheck.seen = true;
    if (b.phase === 'lost' || b.result === 'lost') break;
    if (game.errors.length) break;
    if (b.result === 'won' && b.finished) break;
    if (b.result === 'lost') break;
  }
  check(`${id}: the bot clears the operation`, b.result === 'won', `result ${b.result} at ${b.t.toFixed(1)}s, ${JSON.stringify(b.snapshot().player)} quota ${JSON.stringify(b.quota)} done ${JSON.stringify(b.done)} phase ${b.phase}`);
  check(`${id}: the boss was reached`, bossCheck.seen);
  check(`${id}: no errors during the playthrough`, game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  if (id === 'op3') check('op3: the bot brings the workers home', b.saved >= 1, JSON.stringify(b.snapshot()));
}
WP.override = null;

// ---- the dev screen returns to the battle it came from, resumed (the run is not restarted) -----------------------------
game.advance(2);
game.debug.start('op1', { seed: 31 });
for (let i = 0; i < 120 * 8 && !(snap().scene === 'play' && game.debug.battle() && game.debug.battle().opId === 'op1'); i++) game.advance(1 / 120);
const live = game.debug.battle();
game.advance(5);
const before = live.t;
game.debug.dev(); game.advance(0.2);
check('the dev screen opens from the battle', snap().scene === 'dev', snap().scene);
game.input.tap('cancel'); game.advance(0.3);
check('cancel returns to the same battle', snap().scene === 'play' && game.debug.battle() === live, snap().scene);
check('the battle carries on where it was', live.t > before, `${before} -> ${live.t}`);

// ---- every screen draws without error (a stub pixel buffer takes the calls) ------------------------------------------------
{
  const target = { _info: undefined, _r: undefined, _z: undefined, _c: null, width: 480, height: 270, fillStyle: '#000' };
  const stub = new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : (t[k] = () => ({ width: 6, height: 7, data: new Uint8ClampedArray(4) }))),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const fakeR = { W: 480, H: 270, sky() {}, overlay: fn => fn(stub), text() {}, prop() {}, actor() {}, shape() {} };
  const b = new WP.Battle('op2', { seed: 41 });
  for (let i = 0; i < 600; i++) b.step(1 / 120, { mx: 0.2, fire: i % 7 < 4, grenade: i === 200 });
  let drawn = 0;
  try { WP.drawBattle(stub, b); drawn++; } catch (e) { check('the battle draws', false, e.message); }
  const data = { tally: { op: 'op1' }, lost: { op: 'op1' }, card: { op: 'op1' }, about: { back: 'title' }, dev: { back: 'title' }, cut: { id: 'interrogation' } };
  for (const [name, sc] of Object.entries(WP.scenes)) {
    if (name === 'net') continue;   // a session's screen: drawn in the session check below
    if (name === 'play' || name === 'attract') { try { sc.draw(fakeR); drawn++; } catch (e) { check(`the ${name} screen draws`, false, e.message); } continue; }
    try { if (sc.enter) sc.enter(data[name] || null); sc.draw && sc.draw(fakeR); drawn++; } catch (e) { check(`the ${name} screen draws`, false, e.message); }
  }
  check('every screen draws without error', drawn >= 11, 'drawn ' + drawn);
}
game.debug.start('op2', { seed: 32 });
for (let i = 0; i < 120 * 8 && !(snap().scene === 'play' && game.debug.battle() && game.debug.battle().opId === 'op2'); i++) game.advance(1 / 120);

console.log(failed ? `${failed} of ${total} check(s) failed` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
