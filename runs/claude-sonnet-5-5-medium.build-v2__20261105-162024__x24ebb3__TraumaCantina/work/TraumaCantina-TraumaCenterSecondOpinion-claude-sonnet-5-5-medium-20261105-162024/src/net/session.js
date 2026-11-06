// AI Hub session glue (protocol v1): the hub's card -> start -> the shared-world operation.
import { SESSION_ROUNDS } from '../content/ops/index.js';
import { HostSim } from './host.js';
import { ClientSim } from './client.js';
export async function connectSession(AIHub) {
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  return info || null;
}
export function makeNet(AIHub, info) {
  const def = SESSION_ROUNDS[(((info.round || 1) - 1) % SESSION_ROUNDS.length + SESSION_ROUNDS.length) % SESSION_ROUNDS.length];
  const net = { AIHub, info, def, host: null, client: null, localIdx: info.players.findIndex((p) => p.id === info.me) };
  if (info.isHost) { net.host = new HostSim(AIHub, info); net.sim = net.host.sim; net.host.start(); } else if (!info.server) { net.client = new ClientSim(AIHub, info, def); net.sim = net.client.sim; }
  AIHub.on('message', (d, from) => { if (!d) return; if (net.host && d.t === 'i') net.host.onInput(from, d); else if (net.client && (d.t === 'k' || d.t === 's')) net.client.onMessage(d); });
  AIHub.on('leave', ({ id }) => { const i = info.players.findIndex((p) => p.id === id); if (net.host && i >= 0) net.host.retire(i); });
  AIHub.on('time-up', () => { if (net.host) net.host.finish(net.host.sim.tables[0].vitals > 0 && false); });
  net.sendLocal = (pend, seat, dt) => {
    const inp = { ...pend };
    if (net.host) net.host.setLocal(net.localIdx, { ...inp, force: 1 });
    else if (net.client) { net.client.localStep(inp, dt); net.client.send(inp, performance.now()); }
  };
  net.drain = () => (net.host ? net.host.queue.splice(0) : net.client ? net.client.drain() : []);
  return net;
}
