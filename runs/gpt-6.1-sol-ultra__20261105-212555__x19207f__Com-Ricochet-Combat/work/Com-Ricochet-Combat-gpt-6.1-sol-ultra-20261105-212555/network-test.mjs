import { GameNetwork } from './network.js';

let checks = 0;
const failures = [];
const check = (condition, message) => { checks++; if (!condition) failures.push(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let hostStarts = 0, guestStarts = 0;
const inputs = [], snapshots = [], ends = [];
const host = new GameNetwork({ onStart: () => hostStarts++, onInput: (id, value) => inputs.push([id, value]), onEnd: reason => ends.push(reason) });
const guest = new GameNetwork({ onStart: () => guestStarts++, onSnapshot: value => snapshots.push(value), onEnd: reason => ends.push(reason) });
host.hostRoom(`TEST${Date.now()}`);
guest.joinRoom(host.roomCode);
await sleep(200);
check(hostStarts === 1 && guestStarts === 1, 'Browser room did not start exactly once on both copies.');
guest.tick(.1, { x: 1, fire: true, damage: Infinity }, null);
host.tick(.1, {}, { scores: { 0: 1, 1: 2 }, round: 1 });
await sleep(30);
check(inputs.length === 1 && inputs[0][0] === 1 && inputs[0][1].x === 1 && !('damage' in inputs[0][1]), 'Guest input sender or finite-number validation failed.');
check(snapshots.length === 1 && snapshots[0].round === 1, 'Host snapshot did not reach the guest.');
host.finish({ 0: 1, 1: 2 });
await sleep(30);
check(ends.length === 2 && host.ended && guest.ended, 'Standalone finish did not end both copies.');
const sent = host.sent;
host.tick(.2, {}, { round: 2 });
check(host.sent === sent, 'A copy sent network traffic after end.');
host.close();
guest.close();

const handlers = {};
let hubTime = -Infinity, readyCalls = 0, finish = null, startInfo = null;
const hubSends = [];
globalThis.AIHub = {
  active: true,
  connect: async config => {
    check(config.mode === 'shared-world' && config.seats[0] === 1 && config.seats[1] === 4, 'Hub connect declared the wrong mode or seats.');
    return { me: -1, host: -1, isHost: true, server: true, players: [{ id: 0 }, { id: 1 }, { id: 2 }] };
  },
  on: (event, callback) => { handlers[event] = callback; return () => {}; },
  ready: () => readyCalls++, time: () => hubTime,
  send: (data, options) => { hubSends.push([data, options]); return true; },
  finish: value => { finish = value; },
};
const server = new GameNetwork({ onStart: info => { startInfo = info; } });
await server.init();
server.ready();
server.ready();
handlers.start({ in: 3000 });
hubTime = -1;
server.tick(.1, {}, { scores: { 0: 7, 1: 3, 2: 7 } });
check(!server.started && readyCalls === 1, 'Hub countdown or exactly-once ready gating failed.');
hubTime = 0;
server.tick(.1, {}, { scores: { 0: 7, 1: 3, 2: 7 } });
check(startInfo?.server && startInfo.me === -1 && hubSends.length === 1, 'Dedicated host did not start or send its world without a player.');
handlers['time-up']({ graceMs: 1000 });
check(JSON.stringify(finish?.standings) === '[[0,2],[1]]', 'Time-up did not rank all live players and tied scores.');
handlers.end({ reason: 'finished' });
const beforeEnd = hubSends.length;
server.tick(.2, {}, {});
check(server.ended && hubSends.length === beforeEnd, 'Hub end did not suppress traffic.');
delete globalThis.AIHub;

for (const failure of failures) process.stdout.write(`FAIL: ${failure}\n`);
process.stdout.write(`${checks - failures.length}/${checks} network checks passed\n`);
process.exitCode = failures.length ? 1 : 0;
