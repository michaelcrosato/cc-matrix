import { NetworkSession } from './network.js';

let checks = 0;
let failures = 0;
const check = (name, valid, detail = '') => {
  checks++;
  if (!valid) { failures++; console.log(`FAIL ${name}: ${detail}`); }
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(test) {
  const deadline = performance.now() + 1500;
  while (!test() && performance.now() < deadline) await delay(10);
}
let receivedInput = null;
let receivedSnapshot = null;
const host = new NetworkSession({ onInput: (id, input) => { receivedInput = { id, input }; } });
const guest = new NetworkSession({ onSnapshot: snapshot => { receivedSnapshot = snapshot; } });
try {
  check('transport initializes standalone solo', (await host.initialize()).role === 'solo');
  host.hostRoom('TRANSPORTTEST');
  guest.joinRoom('TRANSPORTTEST');
  await until(() => guest.info.me === 1);
  check('local transport assigns distinct seats and roster', guest.info.me === 1 && host.info.count === 2);
  host.update({}, { score: 75, phase: 'rescue', ship: { x: 3, y: 4 } }, 0.11);
  await until(() => receivedSnapshot?.ship?.x === 3);
  check('local transport sends authoritative world snapshots', receivedSnapshot?.ship?.x === 3);
  guest.update({ x: 0.8, beam: true, bad: NaN }, null, 0.11);
  await until(() => receivedInput?.id === 1);
  check('remote controls arrive and invalid numbers are removed', receivedInput?.id === 1 && receivedInput.input.x === 0.8 && !('bad' in receivedInput.input));
  guest.leave();
  await until(() => host.info.count === 1);
  check('local departure repairs roster', host.info.count === 1);
} finally { host.destroy(); guest.destroy(); }

const handlers = {};
const calls = [];
let clock = -Infinity;
globalThis.AIHub = {
  active: true,
  time: () => clock,
  on: (event, callback) => { handlers[event] = callback; return () => {}; },
  connect: async () => ({ isHost: true, me: 0, host: 0, players: [{ id: 0 }, { id: 1 }], round: 1, server: false }),
  ready: () => calls.push('ready'),
  send: (data, options) => calls.push({ data, options }),
  finish: result => calls.push({ result }),
};
const hub = new NetworkSession();
try {
  await hub.initialize();
  hub.ready();
  check('Hub readies automatically and gates the synchronized start', calls[0] === 'ready' && !hub.canPlay);
  clock = 0;
  handlers.start({ in: 0 });
  hub.update({}, { score: 42 }, 0.11);
  check('Hub host sends world traffic after synchronized start', hub.canPlay && calls[1]?.data.type === 'world');
  handlers['time-up']({ graceMs: 1 });
  check('Hub time-up reports the authoritative team score', calls[2]?.result.scores[0] === 42);
  handlers.end({ reason: 'finished' });
  const length = calls.length;
  hub.update({}, { score: 99 }, 0.11);
  check('Hub end stops gameplay input and all transport traffic', calls.length === length && !hub.canPlay);
} finally { hub.destroy(); delete globalThis.AIHub; }

console.log(`${checks} checks, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
