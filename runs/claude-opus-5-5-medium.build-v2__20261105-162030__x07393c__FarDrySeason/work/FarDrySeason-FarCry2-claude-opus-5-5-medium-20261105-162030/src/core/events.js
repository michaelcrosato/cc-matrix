export class Events {
  map = new Map();
  on(name, fn) { (this.map.get(name) ?? this.map.set(name, []).get(name)).push(fn); return () => { const l = this.map.get(name); l.splice(l.indexOf(fn), 1); }; }
  emit(name, ...a) { const l = this.map.get(name); if (l) for (const f of [...l]) f(...a); }
}
