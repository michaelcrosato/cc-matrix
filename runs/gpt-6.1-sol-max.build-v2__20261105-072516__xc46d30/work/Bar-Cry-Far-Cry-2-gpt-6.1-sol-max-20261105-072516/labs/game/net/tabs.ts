/** @file Standalone co-op over a same-computer BroadcastChannel. The host sequences the same contract run as AI Hub. */
import { COLORS, type Net, type Player } from './session';
export class TabsNet implements Net {
  me = -1;
  host = 0;
  players: Player[] = [];
  isHost: boolean;
  channel: BroadcastChannel;
  seed = 1947;
  startAt = Infinity;
  token = crypto.randomUUID();
  members: Record<string, number> = {};
  listeners = new Map<string, ((d: unknown, f?: number) => void)[]>();
  onStart: () => void = () => {};
  onRoster: () => void = () => {};
  room: string;
  constructor(room: string, host: boolean) {
    this.room = room;
    this.isHost = host;
    this.channel = new BroadcastChannel(`bar-cry:${room}`);
    if (host) {
      this.me = 0;
      this.members[this.token] = 0;
      this.players = [{ id: 0, name: 'Mercenary 1', color: COLORS[0] }];
    }
    this.channel.onmessage = (event) => {
      const m = event.data;
      if (m.token === this.token) return;
      if (m.k === 'join' && this.isHost) {
        if (this.players.length >= 4 && this.members[m.token] === undefined) return;
        if (this.members[m.token] === undefined) {
          const id = this.players.length;
          this.members[m.token] = id;
          this.players.push({ id, name: `Mercenary ${id + 1}`, color: COLORS[id] });
        }
        this.announce();
        this.onRoster();
      } else if (m.k === 'roster' && !this.isHost) {
        this.players = m.players;
        this.me = m.members[this.token] ?? -1;
        this.onRoster();
      } else if (m.k === 'start') {
        this.startAt = m.at;
        this.seed = m.seed;
        this.players = m.players;
        this.onStart();
      } else if (m.k === 'data' && (m.to === undefined || m.to === this.me))
        for (const fn of this.listeners.get('message') ?? []) fn(m.data, m.from);
      else if (m.k === 'leave') {
        for (const fn of this.listeners.get('leave') ?? []) fn({ id: m.from });
      } else if (m.k === 'end') for (const fn of this.listeners.get('end') ?? []) fn(m.data);
    };
    if (!host) this.channel.postMessage({ k: 'join', token: this.token });
  }
  announce(): void {
    this.channel.postMessage({ k: 'roster', players: this.players, members: this.members, token: this.token });
  }
  start(): void {
    if (!this.isHost) return;
    this.startAt = Date.now() + 3000;
    this.channel.postMessage({
      k: 'start',
      at: this.startAt,
      seed: this.seed,
      players: this.players,
      token: this.token,
    });
    this.onStart();
  }
  time(): number {
    return Date.now() - this.startAt;
  }
  send(data: unknown, options: { to?: number; reliable?: boolean } = {}): boolean {
    this.channel.postMessage({ k: 'data', data, from: this.me, to: options.to, token: this.token });
    return true;
  }
  on(event: string, fn: (d: unknown, f?: number) => void): void {
    const a = this.listeners.get(event) ?? [];
    a.push(fn);
    this.listeners.set(event, a);
  }
  finish(data: object): void {
    this.channel.postMessage({ k: 'end', data, token: this.token });
    for (const fn of this.listeners.get('end') ?? []) fn(data);
  }
  close(): void {
    this.channel.postMessage({
      k: this.isHost ? 'end' : 'leave',
      from: this.me,
      data: { reason: this.isHost ? 'host-left' : 'left' },
      token: this.token,
    });
    this.channel.close();
  }
}
