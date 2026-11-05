// A stand-in for the AI Hub session client: a clock the test drives, events it fires, spies on what the game sends.
export function hubStub(o = {}) {
  const h = { active: true, t: -Infinity, handlers: {}, queued: {}, readyCalls: 0, answers: [], results: [], sends: [], me: o.me || 0, seed: o.seed || 1234,
    players: o.players || [{ id: 0, name: 'ANNIE', color: '#e8443a' }, { id: 1, name: 'BO', color: '#3b82f6' }], round: o.round || 1 };
  h.connect = async () => (h.info = { me: h.me, players: h.players, host: 0, isHost: h.me === 0, mode: 'ghost', round: h.round, limitMs: 240000, seed: h.seed });
  h.ready = () => { h.readyCalls++; };
  h.answer = a => h.answers.push(a);
  h.time = () => h.t;
  h.on = (ev, fn) => { (h.handlers[ev] = h.handlers[ev] || []).push(fn); for (const a of h.queued[ev] || []) fn(...a); h.queued[ev] = []; return () => {}; };
  h.emit = (ev, ...a) => { const l = h.handlers[ev]; if (l && l.length) for (const f of l) f(...a); else (h.queued[ev] = h.queued[ev] || []).push(a); };
  h.result = r => h.results.push(r);
  h.send = (d, o2) => { h.sends.push({ d, reliable: !o2 || o2.reliable !== false, at: h.t }); return true; };
  h.rng = label => { let s = (h.seed ^ [...label].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  h.fail = () => {}; h.finish = () => {};
  h.progressLog = []; h.progress = p => h.progressLog.push(Object.assign({ at: h.t }, p));
  return h;
}
