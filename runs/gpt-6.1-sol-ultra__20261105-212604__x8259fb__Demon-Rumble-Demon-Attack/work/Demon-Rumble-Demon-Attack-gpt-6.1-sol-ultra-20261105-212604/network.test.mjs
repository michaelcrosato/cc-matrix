import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const source = await readFile(new URL('./network.js', import.meta.url), 'utf8');
const { NetworkDirector } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

export async function testNetwork() {
  const failures = [];
  let count = 0;
  const check = (condition, name) => { count++; if (!condition) failures.push(name); };
  const handlers = {};
  const sent = [];
  let clock = -20;
  let readyCalls = 0;
  let outcome;
  let connectOptions;
  const info = { me: 0, host: 0, isHost: true, server: false, players: [0, 1, 2, 3].map(id => ({ id, name: `P${id}`, color: '#ffffff' })) };
  globalThis.AIHub = {
    active: true,
    connect: async options => { connectOptions = options; return info; },
    on: (name, fn) => { handlers[name] = fn; return () => {}; },
    time: () => clock,
    ready: () => { readyCalls++; },
    send: (message, options) => { sent.push({ message, options }); return true; },
    finish: value => { outcome = value; }
  };
  let starts = 0;
  let ends = 0;
  let timeUps = 0;
  let input;
  const director = new NetworkDirector({ onStart: () => { starts++; }, onEnd: () => { ends++; }, onRemoteInput: (value, seat) => { input = { value, seat }; }, onTimeUp: () => { timeUps++; } });
  await director.initHub();
  check(connectOptions.mode === 'shared-world' && connectOptions.seats.join() === '1,4', 'Hub declares shared-world seats 1–4');
  check(director.active && director.isHost && director.playerCount === 4 && director.localSeat === 0, 'Host identity');
  director.hubReady(); director.hubReady();
  check(readyCalls === 1, 'Hub ready is idempotent');
  handlers.start({ in: 20 });
  director.update(1, { score: 0 }, {});
  check(starts === 0 && sent.length === 0, 'No simulation start or traffic during synchronized countdown');
  clock = 0;
  director.update(0.01, { score: 1 }, {});
  director.update(0.09, { score: 2 }, {});
  check(starts === 1 && sent.length === 1 && sent[0].message.kind === 'world', 'Synchronized start and host snapshot');
  for (let i = 0; i < 120; i++) director.update(1 / 120, { score: 3 }, {});
  check(sent.length <= 14 && sent.length >= 12, 'Snapshot throttle is 12 Hz');
  handlers.message({ dr: 1, seq: 1, kind: 'input', value: { x: -1, shoot: true } }, 2);
  check(input?.seat === 2 && input.value.shoot, 'Remote input identifies sender seat');
  input = null;
  handlers.message({ dr: 1, seq: 1, kind: 'input', value: { x: 1 } }, 2);
  handlers.message({ dr: 1, seq: 2, kind: 'input', value: { x: 1 } }, 9);
  check(input === null, 'Duplicate and unknown-sender inputs ignored');
  const beforeOversize = sent.length;
  director.update(0.1, { value: 'x'.repeat(17000) }, {});
  check(sent.length === beforeOversize && director.diagnostics().rejected === 1, 'Oversize snapshots rejected before hub send');
  handlers['time-up']({ graceMs: 2000 });
  check(timeUps === 1, 'Time-up callback');
  director.finish(4560, true); director.finish(1, false);
  check(outcome.won && outcome.scores[3] === 4560 && outcome.standings[0].join() === '0,1,2,3', 'Host reports one complete team outcome');
  const beforeFinish = sent.length;
  director.update(1, { score: 4560 }, {});
  check(sent.length === beforeFinish, 'Traffic stops after reporting outcome');
  handlers.end({ reason: 'finished', standings: [[0, 1, 2, 3]] });
  director.end('duplicate');
  check(ends === 1 && director.ended, 'End callback is idempotent');
  check(await director.createOffer().then(() => false, () => true), 'WebRTC prohibited inside AI Hub');

  const guestInfo = { ...info, me: 2, isHost: false };
  globalThis.AIHub.connect = async () => guestInfo;
  let snapshot;
  const guest = new NetworkDirector({ onSnapshot: value => { snapshot = value; } });
  await guest.initHub();
  handlers.start({ in: 0 });
  guest.update(0.1, null, { fire: true });
  check(sent.at(-1).message.kind === 'input' && sent.at(-1).options.to === 0, 'Guest sends input to host');
  handlers.message({ dr: 1, seq: 1, kind: 'world', value: { score: 99 } }, 1);
  check(snapshot === undefined, 'Guest ignores world from non-host');
  handlers.message({ dr: 1, seq: 1, kind: 'world', value: { score: 99 } }, 0);
  check(snapshot?.score === 99, 'Guest accepts host world');
  guest.end();

  globalThis.AIHub.connect = async () => ({ ...info, me: -1, host: -1, server: true });
  const server = new NetworkDirector();
  await server.initHub();
  check(server.server && server.localSeat === -1 && server.isHost && server.playerCount === 4, 'Dedicated server has no local seat');
  server.end();
  globalThis.AIHub = { active: false };
  const offline = new NetworkDirector();
  check(await offline.initHub() === null && !offline.active && offline.isHost, 'Standalone initialization without Hub');
  let invalidRejected = false;
  try { offline._decodeDescription('bad', 'offer'); } catch { invalidRejected = true; }
  check(invalidRejected, 'Invalid signaling code is rejected');
  return { count, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await testNetwork();
    for (const failure of result.failures) console.error(`FAIL: ${failure}`);
    console.log(`${result.count} network checks, ${result.failures.length} failures`);
    if (result.failures.length) process.exitCode = 1;
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
