// One host/guest code path, two transports. Transport keeps the Hub's budget everywhere:
// at most 20 messages a second, bursts up to 40, at most 16 KB a message.
export class Budget {
  constructor() { this.tokens = 40; this.last = 0; this.dropped = 0; }
  take(now) {
    this.tokens = Math.min(40, this.tokens + ((now - this.last) / 1000) * 20);
    this.last = now;
    if (this.tokens < 1) { this.dropped++; return false; }
    this.tokens -= 1;
    return true;
  }
}
export class Transport {
  constructor() { this.handlers = new Map(); this.budget = new Budget(); this.me = 0; this.players = []; this.isHost = false; }
  on(name, fn) { if (!this.handlers.has(name)) this.handlers.set(name, []); this.handlers.get(name).push(fn); }
  emit(name, ...args) { for (const fn of this.handlers.get(name) ?? []) fn(...args); }
  send() { return false; }
  close() {}
}
/** AI Hub: network only through the hub. */
export class HubTransport extends Transport {
  constructor(hub) {
    super();
    this.hub = hub;
    this.me = hub.me;
    this.players = hub.players;
    this.isHost = hub.isHost;
    hub.on('message', (data, from) => this.emit('message', data, from));
    hub.on('leave', (e) => this.emit('leave', e.id));
  }
  send(data, { to, reliable = true } = {}) { return this.hub.send(data, { to, reliable }); }
}
