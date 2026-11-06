import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export async function checkNetwork() {
  const source = await readFile(new URL('./network.js', import.meta.url), 'utf8');
  const {CoopLink} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const failures = [];
  let assertions = 0;
  const check = (yes, message) => {assertions++; if (!yes) failures.push(message);};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let host, guest, server;
  try {
    host = new CoopLink(); guest = new CoopLink();
    const room = 'T' + String(Math.floor(Math.random() * 1e8));
    let starts = 0, input, snapshot, result, left;
    host.on('start', () => starts++); guest.on('start', () => starts++);
    host.on('input', e => input = e);
    guest.on('snapshot', e => snapshot = e);
    guest.on('result', e => result = e);
    host.on('leave', e => left = e);
    await host.host(room);
    await guest.join(room);
    await sleep(180);
    check(starts === 2, 'Standalone host and guest must both start');
    check(host.players.length === 2 && guest.players.length === 2, 'Standalone roster must have two stable seats');
    check(host.me === 0 && guest.me === 1 && host.isHost && !guest.isHost, 'Standalone seat ownership');
    check(input?.input.mx === 0 && input?.input.mz === 0 && input?.input.az === -1, 'First heartbeat contains complete finite neutral controls');
    guest.sendInput({mx: .5, mz: -.4, ax: 0, az: -1, fire: true});
    host.sendSnapshot({phase: 2, score: 345, players: [{id: 0, x: 12}, {id: 1, x: 23}]});
    await sleep(230);
    check(input?.id === 1 && input.input.mx === .5 && input.input.fire, 'Guest input must reach authoritative host');
    check(snapshot?.score === 345 && snapshot.players[1].x === 23, 'Authoritative world must reach guest');
    check(host.stats.sent > 0 && guest.stats.sent > 0, 'Co-op traffic must flow both ways');
    host._receive({v: 1, type: 'input', seq: 999, input: {mx: null, mz: 1e99, ax: 'invalid'}}, 1, 'broadcast');
    check(input?.input.mx === 0 && input?.input.mz === 1 && input?.input.ax === 0 && input?.input.az === -1, 'Malformed remote axes cannot poison authoritative physics');
    host.finish(true, 2000, {Walkers: 3});
    await sleep(50);
    check(result?.won === true && result.scores[1] === 2000, 'Shared team results reach guest');
    guest.close(); await sleep(50);
    check(left?.id === 1 && host.players.length === 1, 'Guest leave removes seat');
    host.destroy(); guest.destroy();

    const handlers = new Map();
    const sent = []; let readied = 0, finished, clock = -10;
    const players = [{id: 0, name: 'Pilot One', color: '#f00'}, {id: 1, name: 'Pilot Two', color: '#0ff'}];
    globalThis.AIHub = {active: true, players,
      on: (name, fn) => {handlers.set(name, fn); return () => handlers.delete(name);},
      connect: async opts => ({me: -1, host: -1, isHost: true, server: true, players}),
      ready: () => readied++, time: () => clock,
      send: (data, opts) => {sent.push({data, opts}); return true;},
      finish: data => finished = data};
    server = new CoopLink();
    let serverStart = 0, remoteInput, ended;
    server.on('start', () => serverStart++);
    server.on('input', e => remoteInput = e);
    server.on('end', e => ended = e);
    const info = await server.initHub(); server.ready();
    check(info.server && server.server && server.me === -1 && server.hostId === -1, 'AI Hub spectator server owns world without a player');
    check(readied === 1, 'AI Hub ready needs no gesture');
    handlers.get('start')({in: 10});
    check(!server.canPlay && serverStart === 0, 'Hub countdown must not advance gameplay');
    clock = 1; await sleep(35);
    check(server.canPlay && serverStart === 1, 'Hub synchronized start');
    handlers.get('message')({v: 1, type: 'input', seq: 1, input: {mx: 1}}, 0);
    check(remoteInput?.id === 0 && remoteInput.input.mx === 1, 'Headless server accepts seat zero commands');
    server.sendSnapshot({phase: 1, score: 100}); await sleep(120);
    check(sent.some(e => e.data.type === 'snapshot'), 'Hub host sends authoritative snapshots');
    server.finish(false, 100, {Rescues: 1});
    check(finished?.standings[0].join(',') === '0,1' && finished.won === false, 'Hub finish ranks every active teammate');
    handlers.get('end')({reason: 'finished'});
    const before = sent.length; server._tick();
    check(ended?.reason === 'finished' && !server.canPlay && sent.length === before, 'Hub end stops input and outgoing traffic');
  } catch (e) {
    failures.push(e.stack || String(e));
  } finally {
    host?.destroy(); guest?.destroy(); server?.destroy(); delete globalThis.AIHub;
  }
  return {assertions, failures};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const {assertions, failures} = await checkNetwork();
  for (const failure of failures) console.error('FAIL network: ' + failure);
  console.log(`${assertions - failures.length}/${assertions} network checks passed`);
  process.exitCode = failures.length ? 1 : 0;
}
