import { boot, noScripts, S, Bot } from './_helpers.mjs';
import { Engine } from '../../pixel-engine.js';
import { app } from '../../src/core/app.js';
import { ShiftArea, shiftRun, SHIFT_SECONDS } from '../../src/game/shift.js';
import { fakeParty, LocalSession } from '../../src/net/local.js';

export const slow = true;
export async function run(T) {
  // ---- solo night shift played by the bot reaches dawn ----
  {
    app.run = shiftRun(); app.screens = []; app.hub = false; app.attract = false;
    const area = new ShiftArea({});
    new Bot({ cheat: true, teleportStuck: true }).attach(area);
    const e = await Engine.headless(area, {}); app.engine = e; e.step(5);
    area.dev.god = true; area.dev.ammo = true;
    let maxAlive = 0;
    for (let s = 0; s < 60 * (SHIFT_SECONDS + 12) && !area.shiftOver; s += 30) { e.step(30); maxAlive = Math.max(maxAlive, area.aliveEnemies().length); }
    T.check('solo shift ends', area.shiftOver, area.clock);
    T.check('solo shift won at dawn', area.won, area.clock);
    T.check('enemy cap 24', maxAlive <= 24, maxAlive);
    T.check('score recorded', (area.results?.scores[0] || 0) > 0, JSON.stringify(area.results?.scores));
    T.eq('standings list every player once', area.results.standings.flat().length, 1);
    T.eq('errors', e.errors.length, 0, e.errors.join('|'));
  }
  // ---- LocalSession: lobby, start, clock, host-leave ----
  {
    const net = fakeParty(3, { latency: 40, jitter: 20 });
    const [h, g1, g2] = net.sessions;
    T.eq('host sees 3 seats', h.players.length, 3);
    T.eq('guest knows its seat', g1.me, 1);
    h.start(0); net.step(100);
    T.check('guests got start', g1.state === 'start' || g1.state === 'playing');
    net.step(3200);
    T.check('shared clock positive after countdown', h.time() > 0 && g1.time() > 0 && Math.abs(h.time() - g1.time()) < 120, `${h.time()} ${g1.time()}`);
    const got = []; g2.on('message', (d, f) => got.push([d, f])); h.send({ hello: 1 }); net.step(200);
    T.eq('guest receives host message', got.length, 1);
    const toHost = []; h.on('message', (d, f) => toHost.push([d, f])); g1.send({ ping: 1 }, { to: 0 }); net.step(200);
    T.eq('host receives guest message', toHost.length, 1);
    const ends = []; g1.on('end', (x) => ends.push(x.reason)); h.finish({ standings: [[0], [1], [2]], scores: { 0: 1 } }); net.step(200);
    T.check('guest told the round ended', ends[0] === 'finished', ends[0]);
  }
  // ---- co-op: host + 2 guests, snapshots under 1,200 bytes with 24 enemies, rates, shots, revive ----
  {
    const net = fakeParty(3, { latency: 150, jitter: 50, loss: 0.05 });
    net.sessions[0].start(0); net.step(3500);
    const mk = async (sess) => { app.run = shiftRun(); app.screens = []; const a = new ShiftArea({ session: sess }); const e = await Engine.headless(a, {}); e.step(2); return { a, e }; };
    const H = await mk(net.sessions[0]), C1 = await mk(net.sessions[1]);
    T.eq('host role', H.a.role, 'host'); T.eq('client role', C1.a.role, 'client');
    for (const s of net.sessions.slice(0, 2)) s.on('message', () => {});
    for (let i = 0; i < 24; i++) H.a.spawn('gaffer', -1.5 + (i % 8), 6 + Math.floor(i / 8), { state: S.APPROACH });
    const sent = []; const origSend = net.sessions[0].send.bind(net.sessions[0]); net.sessions[0].send = (d, o) => { sent.push({ t: net.now(), size: JSON.stringify(d).length, snap: d.n !== undefined }); return origSend(d, o); };
    const csent = []; const co = net.sessions[1].send.bind(net.sessions[1]); net.sessions[1].send = (d, o) => { csent.push({ t: net.now() }); return co(d, o); };
    for (let s = 0; s < 8; s++) { for (let k = 0; k < 15; k++) { H.e.step(4); C1.e.step(4); net.step(66); } }
    const snaps = sent.filter((x) => x.snap);
    T.check('snapshots are sent', snaps.length > 5, snaps.length);
    T.check('snapshot under 1,200 bytes with 24 enemies', Math.max(...snaps.map((x) => x.size)) < 1200, Math.max(...snaps.map((x) => x.size)));
    const perSec = (list) => { const b = {}; for (const x of list) { const k = Math.floor(x.t / 1000); b[k] = (b[k] || 0) + 1; } return Math.max(...Object.values(b)); };
    T.check('host sends under 20 messages a second', perSec(sent) <= 20, perSec(sent));
    T.check('client sends under 20 messages a second', perSec(csent) <= 20, perSec(csent));
    T.check('client sees ghost enemies', C1.a.ghostEnemies.size > 10, C1.a.ghostEnemies.size);
    T.check('host sees the client as a ghost', H.a.ghosts.some((g) => g.id === 1));
    // a client shot resolves on the host
    const tgt = H.a.enemies.find((e) => !e.dead && e.zones); const g = H.a.ghosts.find((x) => x.id === 1); g.x = tgt.x; g.z = tgt.z + 6;
    const hp0 = tgt.hp; const hz = tgt.zones.head; const ox = g.x, oy = 1.6, oz = g.z; const dx = hz.x - ox, dy = hz.y - oy, dz = hz.z - oz, L = Math.hypot(dx, dy, dz);
    H.a.hostAction(1, ['f', 0, Math.round(ox * 100), Math.round(oy * 100), Math.round(oz * 100), Math.round(dx / L * 1000), Math.round(dy / L * 1000), Math.round(dz / L * 1000)]);
    T.check('host resolves a client shot', tgt.hp < hp0, `${tgt.hp} vs ${hp0}`);
    // down and revive
    H.a.hurtGhost(g, 500, 0, 0); T.check('client downed by host', g.downed);
    H.a.player.teleport(g.x + 0.8, g.z); H.a.cur = { ...H.a.cur, action: true }; g.revive = 0;
    for (let s = 0; s < 150; s++) { H.a.cur = { ...H.a.cur, action: true }; H.a.updateDowned(1 / 60); }
    T.check('friend revives a downed player', !g.downed && g.hp > 0, `${g.downed} ${g.hp}`);
    T.eq('errors host', H.e.errors.length, 0, H.e.errors.join('|')); T.eq('errors client', C1.e.errors.length, 0, C1.e.errors.join('|'));
    // all down -> round over
    for (const gg of H.a.ghosts) H.a.hurtGhost(gg, 500, 0, 0); H.a.player.dead = true; for (let s = 0; s < 10; s++) H.a.updateDowned(1 / 60); T.check('all down ends the round', H.a.shiftOver && !H.a.won);
  }
}
