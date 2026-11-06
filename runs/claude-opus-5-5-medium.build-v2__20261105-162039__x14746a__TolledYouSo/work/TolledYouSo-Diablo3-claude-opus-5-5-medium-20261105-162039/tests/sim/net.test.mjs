// Host plus mirrors over a simulated lossy transport (150 ms, 50 ms jitter, 5% loss).
import { ok, eq, guarded } from '../lib.mjs';
import { Rng } from '../../pixel-engine.js';
import { buildRoundWorld } from '../../src/net/hubflow.js';
import { NetHost } from '../../src/net/host.js';
import { NetClient } from '../../src/net/client.js';
import { stepWorld } from '../../src/sim/step.js';
import { botIntent, makeBot } from '../../src/sim/bot.js';
import { LOCAL_EVENTS } from '../../src/net/codec.js';

const rnd = new Rng(5);
class Net { constructor() { this.q = []; this.now = 0; this.handlers = {}; this.count = {}; this.maxUnrel = 0; this.windowCount = {}; }
  transport(me) { return { me, send: (data, o = {}) => { const s = JSON.stringify(data).length; if (s > 16000) throw new Error(`message ${s}`); if (!o.reliable) this.maxUnrel = Math.max(this.maxUnrel, s); this.count[me] = (this.count[me] ?? 0) + 1; if (!o.reliable && rnd.chance(0.05)) return true; for (const to of Object.keys(this.handlers).map(Number)) { if (to === me) continue; if (o.to !== undefined && o.to !== to) continue; const t = this.now + 0.15 + rnd.range(-0.05, 0.05); const seq = (o.reliable ? (this.seq = (this.seq ?? 0) + 1) : 0); this.q.push({ t: o.reliable ? Math.max(t, this.lastRel?.[to] ?? 0) : t, to, data: JSON.parse(JSON.stringify(data)), from: me, seq }); if (o.reliable) { this.lastRel ??= {}; this.lastRel[to] = this.q.at(-1).t; } } return true; }, on: (fn) => { this.handlers[me] = fn; } }; }
  tick(dt) { this.now += dt; this.q.sort((a, b) => a.t - b.t); while (this.q.length && this.q[0].t <= this.now) { const m = this.q.shift(); this.handlers[m.to](m.data, m.from); } }
}
await guarded(async () => {
  const info = { seed: 42, players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }, { id: 2, name: 'C' }] };
  const net = new Net();
  const hw = buildRoundWorld(info); const c1w = buildRoundWorld(info); const c2w = buildRoundWorld(info);
  const nh = hw.zone.rows.join(''); eq(c1w.zone.rows.join(''), nh, 'clients build the same map from the seed');
  eq(hw.monsters.length, c1w.monsters.length, 'same monsters'); eq(hw.monsters.map((m) => m.id).join(), c1w.monsters.map((m) => m.id).join(), 'same monster ids');
  eq(hw.props.map((p) => p.id).join(), c2w.props.map((p) => p.id).join(), 'same prop ids');
  const host = new NetHost(net.transport(0), hw); const c1 = new NetClient(net.transport(1), c1w, 1); const c2 = new NetClient(net.transport(2), c2w, 2);
  const bots = { 0: makeBot(), 1: makeBot(), 2: makeBot() };
  let pressed = 0; let cmds = 0; let maxPerSec = 0; let lastCounts = { 0: 0, 1: 0, 2: 0 };
  c1.sendCommand({ c: 'setVow', index: 0, vow: 'clamour' }); // A real command arrives.
  const hero1 = hw.heroes.find((h) => h.seat === 1); const before = hero1.level;
  for (let t = 0; t < 60 * 60 * 2; t++) {
    const its = {}; its[0] = botIntent(hw, hw.heroes[0], bots[0], []);
    // Client intents come from a bot reading the client's mirror... movement only, plus presses.
    const it1 = botIntent(c1w, c1w.heroes.find((h) => h.seat === 1), bots[1], []); if (Object.keys(it1.pressed).length) pressed++; c1.step(it1);
    const it2 = botIntent(c2w, c2w.heroes.find((h) => h.seat === 2), bots[2], []); c2.step(it2);
    its[1] = host.remoteIntent(1); its[2] = host.remoteIntent(2);
    stepWorld(hw, its);
    const ev = hw.events; hw.events = []; host.outgoing(ev); host.afterStep();
    c1w.events.length = 0; c2w.events.length = 0;
    net.tick(1 / 60);
    if (t % 60 === 59) { for (const k of [0, 1, 2]) { const c = (net.count[k] ?? 0) - lastCounts[k]; maxPerSec = Math.max(maxPerSec, c); lastCounts[k] = net.count[k] ?? 0; } }
  }
  ok(maxPerSec <= 20, `message rate under 20 a second: ${maxPerSec}`);
  ok(host.sent.maxS <= 1100, `s under 1,100 bytes: ${host.sent.maxS}`); ok(host.sent.maxE <= 12100, `e under 12 KB: ${host.sent.maxE}`);
  ok(hw.stats.kills > 10, `host world played: ${hw.stats.kills}`);
  eq(hw.heroes.find((h) => h.seat === 1).vows.includes('clamour') || hw.heroes.find((h) => h.seat === 1).cls !== 'lamplighter', true, 'command path works');
  ok(pressed > 0, 'client pressed things');
  // Mirrors converge: heroes near where the host has them.
  net.tick(1); for (let i = 0; i < 60; i++) { c1.interp(); c2.interp(); net.tick(1 / 60); }
  for (const h of hw.heroes) { const m = c1w.heroes.find((q) => q.id === h.id); if (h.seat === 1) continue; ok(Math.hypot(m.x - h.x, m.z - h.z) < 4, `mirror hero ${h.seat} converged: ${Math.hypot(m.x - h.x, m.z - h.z).toFixed(2)}`); }
  const awake = hw.monsters.filter((m) => !m.dead && !m.dormant); const seen = c1w.monsters.filter((m) => !m.dead && !m.dormant);
  ok(Math.abs(awake.length - seen.length) < Math.max(10, awake.length * 0.5), `monster mirror close: ${awake.length} vs ${seen.length}`);
  const dead = hw.monsters.filter((m) => m.dead).length + 0; void dead;
  ok(c1w.stats.kills >= hw.stats.kills - 40, `deaths arrive: ${c1w.stats.kills} of ${hw.stats.kills}`);
  ok(c2.applied > 100, 'snapshots applied');
  void cmds; void before; void LOCAL_EVENTS;
});
