// One interface, three implementations, so round code never knows which: hubSession.js, soloSession.js and linkSession.js (two windows on one computer).
export const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
export function Emitter() { const m = new Map(); return { on(ev, fn) { (m.get(ev) ?? m.set(ev, []).get(ev)).push(fn); return () => { const l = m.get(ev); l.splice(l.indexOf(fn), 1); }; }, emit(ev, ...a) { for (const f of [...(m.get(ev) ?? [])]) f(...a); } }; }
