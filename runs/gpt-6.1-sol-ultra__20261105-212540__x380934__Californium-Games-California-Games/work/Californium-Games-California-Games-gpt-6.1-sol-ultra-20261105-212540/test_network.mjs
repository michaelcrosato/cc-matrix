import { readFile } from 'node:fs/promises';

// Deterministic in-memory PeerJS transport: no server, sockets, or dependency download.
class Events {
  handlers = {};
  on(name, callback) { (this.handlers[name] ||= []).push(callback); return this; }
  emit(name, ...args) { for (const callback of this.handlers[name] || []) callback(...args); }
}
class Connection extends Events {
  open = false;
  send(data) { const copy = structuredClone(data); queueMicrotask(() => this.other.emit('data', copy)); }
  close() {
    if (!this.open) return;
    this.open = false; this.other.open = false;
    queueMicrotask(() => { this.emit('close'); this.other.emit('close'); });
  }
}
const peers = new Map();
let serial = 0;
class FakePeer extends Events {
  links = new Set();
  constructor(id) {
    super(); this.id = typeof id === 'string' ? id : `guest-${++serial}`;
    peers.set(this.id, this); queueMicrotask(() => this.emit('open', this.id));
  }
  connect(id) {
    const local = new Connection(), remote = new Connection();
    local.other = remote; remote.other = local; this.links.add(local);
    queueMicrotask(() => {
      const destination = peers.get(id);
      if (!destination) {
        this.emit('error', { type: 'peer-unavailable' }); local.emit('error', {}); return;
      }
      destination.links.add(remote); destination.emit('connection', remote);
      local.open = remote.open = true; remote.emit('open'); local.emit('open');
    });
    return local;
  }
  destroy() { for (const connection of this.links) connection.close(); peers.delete(this.id); }
}
globalThis.Peer = FakePeer;
const source = await readFile(new URL('./network.js', import.meta.url));
const { FestivalNetwork } = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const settle = () => new Promise(resolve => setTimeout(resolve, 1));
let passed = 0, failed = 0;
function check(name, condition) {
  if (condition) passed++;
  else { failed++; console.error(`FAIL network: ${name}`); }
}
const starts = [], instances = [];
const make = callbacks => { const room = new FestivalNetwork(callbacks); instances.push(room); return room; };
try {
  const host = make({ onStart: data => starts.push({ who: 'host', data }) });
  const guest = make({ onStart: data => starts.push({ who: 'guest', data }) });
  const code = await host.createRoom();
  check('six-character share code', /^[A-HJ-NP-Z2-9]{6}$/.test(code));
  check('host owns seat zero', host.isHost && host.me === 0 && host.connected);
  await guest.joinRoom(code); await settle();
  check('roster synchronized', host.players.length === 2 && guest.players.length === 2);
  check('guest assigned player id one', guest.me === 1 && guest.players[1].id === 1);
  check('standings use id field', host.players.every(player => Number.isInteger(player.id) && player.name === `Rider ${player.id + 1}`));
  check('guest cannot start festival', guest.startFestival() === false);
  check('scores ignored before round', guest.sendScore({ event: 'skate', score: 50, total: 50 }) === false);
  check('host starts festival', host.startFestival() === true);
  await settle();
  check('both copies receive start', starts.length === 2);
  check('start has common seed and countdown', starts[0].data.seed === starts[1].data.seed && Math.abs(starts[0].data.startAt - starts[1].data.startAt) < 50 && starts[0].data.startAt > Date.now() + 2000);
  guest.sendScore({ event: 'surf', score: 123, total: 456 }); await settle();
  check('guest score delivered to host', host.players.find(player => player.id === 1)?.total === 456);
  check('standings rebroadcast to guest', guest.players.find(player => player.id === 1)?.score === 123);
  guest.sendScore({ event: 'invalid', score: -200, total: Infinity }); await settle();
  const sanitized = host.players.find(player => player.id === 1);
  check('score payload bounded', sanitized.score === 0 && sanitized.total === 1e9 && sanitized.event === 'skate');
  guest.sendScore({ event: 'finish', score: 125, total: 600, finished: true }); await settle();
  check('finished result synchronized', host.players.find(player => player.id === 1)?.finished === true);
  const late = make(); let lateRejected = false;
  try { await late.joinRoom(code); } catch { lateRejected = true; }
  check('joining active festival rejected', lateRejected && !late.connected);
  guest.disconnect(); await settle();
  check('departed rider marked disconnected during run', host.players.find(player => player.id === 1)?.connected === false);
  check('host can start rematch', host.startFestival() === true && host.round === 2);
  check('rematch resets standings and removes departed rider', host.players.length === 1 && host.players[0].total === 0 && host.players[0].finished === false);
  host.disconnect();
  check('disconnect clears room state', !host.connected && !host.room && host.players.length === 0);

  const capacityHost = make(); const capacityCode = await capacityHost.createRoom();
  const riders = [make(), make(), make()];
  for (const rider of riders) await rider.joinRoom(capacityCode);
  await settle();
  check('four players accepted', capacityHost.players.length === 4 && new Set(capacityHost.players.map(player => player.id)).size === 4);
  const overflow = make(); let fullRejected = false;
  try { await overflow.joinRoom(capacityCode); } catch { fullRejected = true; }
  check('fifth player rejected', fullRejected && capacityHost.players.length === 4);
  riders[1].disconnect(); await settle();
  const replacement = make(); await replacement.joinRoom(capacityCode); await settle();
  check('vacated lobby seat reused', replacement.me === 2 && capacityHost.players.length === 4);
  const invalid = make(); let invalidRejected = false;
  try { await invalid.joinRoom('BAD'); } catch { invalidRejected = true; }
  check('invalid room code rejected', invalidRejected && !invalid.connected);
  const snapshot = capacityHost.snapshot; snapshot.players[0].total = 999;
  check('snapshots isolate mutable standings', capacityHost.players[0].total === 0);
} catch (error) {
  failed++; console.error(`FAIL network setup: ${error.message}`);
} finally {
  for (const instance of instances) instance.disconnect(false);
}
console.log(`${passed} network checks passed; ${failed} failed`);
process.exitCode = failed ? 1 : 0;
