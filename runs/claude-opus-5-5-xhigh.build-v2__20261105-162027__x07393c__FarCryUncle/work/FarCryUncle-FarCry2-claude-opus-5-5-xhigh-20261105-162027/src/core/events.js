// A tiny event bus: systems announce, missions and the Ledger listen.
export class Events {
  map = new Map();
  on(name, fn) { if (!this.map.has(name)) this.map.set(name, new Set()); this.map.get(name).add(fn); return () => this.map.get(name).delete(fn); }
  emit(name, ...args) { const s = this.map.get(name); if (s) for (const fn of [...s]) fn(...args); }
  clear() { this.map.clear(); }
}
