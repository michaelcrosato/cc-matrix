/** @file Copy-and-paste WebRTC invite codes. Ordered channels form a host-centred star, without a game server. */
import { COLORS, type Net, type Player } from './session';
const encode = (v: unknown) => btoa(JSON.stringify(v));
const decode = (v: string) => JSON.parse(atob(v.trim())) as { seat: number; description: RTCSessionDescriptionInit };
async function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timeout);
      pc.removeEventListener('icegatheringstatechange', change);
      resolve();
    };
    const change = () => {
        if (pc.iceGatheringState === 'complete') done();
      },
      timeout = setTimeout(done, 5000);
    pc.addEventListener('icegatheringstatechange', change);
  });
}
export class RtcNet implements Net {
  host = 0;
  me: number;
  isHost: boolean;
  players: Player[] = [];
  startAt = Infinity;
  seed = 1947;
  connections = new Map<number, RTCPeerConnection>();
  channels = new Map<number, RTCDataChannel>();
  listeners = new Map<string, ((d: unknown, f?: number) => void)[]>();
  onRoster: () => void = () => {};
  onStart: () => void = () => {};
  localOnly: boolean;
  constructor(host: boolean, localOnly = false) {
    this.localOnly = localOnly;
    this.isHost = host;
    this.me = host ? 0 : 1;
    this.players = [{ id: 0, name: 'Mercenary 1', color: COLORS[0] }];
  }
  private pc(seat: number): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.localOnly ? [] : [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.connections.set(seat, pc);
    return pc;
  }
  private channel(channel: RTCDataChannel, seat: number): void {
    this.channels.set(seat, channel);
    channel.onopen = () => {
      if (this.isHost) {
        if (!this.players.some((p) => p.id === seat))
          this.players.push({ id: seat, name: `Mercenary ${seat + 1}`, color: COLORS[seat] });
        this.send({ k: 'roster', players: this.players });
      }
      this.onRoster();
    };
    channel.onclose = () => {
      for (const fn of this.listeners.get(this.isHost ? 'leave' : 'end') ?? [])
        fn(this.isHost ? { id: seat } : { reason: 'host-left' });
    };
    channel.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.k === 'roster') {
        this.players = m.players;
        this.onRoster();
      } else if (m.k === 'start') {
        this.startAt = m.at;
        this.seed = m.seed;
        this.players = m.players;
        this.onStart();
      } else if (m.k === 'end') {
        for (const fn of this.listeners.get('end') ?? []) fn(m.data);
      } else for (const fn of this.listeners.get('message') ?? []) fn(m, this.isHost ? seat : 0);
    };
  }
  async offer(): Promise<string> {
    const seat = this.connections.size + 1;
    if (seat > 3) throw new Error('The crew is full.');
    const pc = this.pc(seat);
    this.channel(pc.createDataChannel('contract', { ordered: true }), seat);
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    return encode({ seat, description: pc.localDescription });
  }
  async answer(code: string): Promise<string> {
    const offer = decode(code);
    this.me = offer.seat;
    const pc = this.pc(0);
    pc.ondatachannel = (e) => this.channel(e.channel, 0);
    await pc.setRemoteDescription(offer.description);
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    return encode({ seat: this.me, description: pc.localDescription });
  }
  async accept(code: string): Promise<void> {
    const reply = decode(code),
      pc = this.connections.get(reply.seat);
    if (!pc) throw new Error('No matching invitation.');
    await pc.setRemoteDescription(reply.description);
  }
  send(data: unknown, options: { to?: number; reliable?: boolean } = {}): boolean {
    let sent = false;
    for (const [id, c] of this.channels)
      if (c.readyState === 'open' && (options.to === undefined || options.to === id)) {
        c.send(JSON.stringify(data));
        sent = true;
      }
    return sent;
  }
  on(event: string, fn: (data: unknown, from?: number) => void): void {
    const a = this.listeners.get(event) ?? [];
    a.push(fn);
    this.listeners.set(event, a);
  }
  time(): number {
    return Date.now() - this.startAt;
  }
  start(): void {
    if (!this.isHost) return;
    this.startAt = Date.now() + 3000;
    this.send({ k: 'start', at: this.startAt, seed: this.seed, players: this.players });
    this.onStart();
  }
  finish(data: object): void {
    this.send({ k: 'end', data });
    for (const fn of this.listeners.get('end') ?? []) fn(data);
  }
  close(): void {
    if (this.isHost) this.send({ k: 'end', data: { reason: 'host-left' } });
    for (const p of this.connections.values()) p.close();
  }
}
