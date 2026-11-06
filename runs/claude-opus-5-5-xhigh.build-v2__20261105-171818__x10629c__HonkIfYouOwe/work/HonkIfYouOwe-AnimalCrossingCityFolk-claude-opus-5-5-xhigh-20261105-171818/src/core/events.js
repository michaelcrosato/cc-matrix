// A tiny event bus: caught, sold, gift, talked, day… feeds memory, stats and tests.
export class Events {
  constructor() { this.handlers = new Map(); this.log = []; }
  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
    return () => { const l = this.handlers.get(name); l.splice(l.indexOf(fn), 1); };
  }
  emit(name, data) {
    this.log.push(name);
    if (this.log.length > 200) this.log.shift();
    for (const fn of this.handlers.get(name) ?? []) fn(data);
  }
}
