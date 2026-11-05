(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN, U = SN.U, UI = SN.UI, T = UI.T, R = SN.R, HUD = SN.HUD;
// ---- AI Hub session: ghost race on a shared seeded event (client 1.4.0, vendored unmodified) --------------------------------
const H = SN.Hub = { active: !!(window.AIHub && window.AIHub.active), info: null, ghosts: new Map(), card: null, started: false, ended: false, endInfo: null, reported: false, sendT: 0, progT: 0, event: null, ready: false, more: false };
const TEAMS_BY_SEAT = ['kestrel', 'soratek', 'volta', 'caldera'];
const SEAT_COLORS = ['#2ec4ff', '#ff4a5a', '#ffd21f', '#ff9a2a'];
H.connect = async () => {
  const hub = window.AIHub; if (!hub) { H.active = false; return false; }
  let info = null; try { info = await hub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { console.warn(e); }
  if (!info) { H.active = false; return false; }
  H.info = info;
  const rE = hub.rng('event'), rR = hub.rng('race');
  H.event = { track: SN.TRACK_ORDER[Math.floor(rE() * 4)], cls: 'flare', laps: 3, seed: Math.floor(rR() * 4294967296) };
  for (const p of info.players || []) if (p.id !== info.me) H.ghosts.set(p.id, { id: p.id, name: p.name || 'PILOT', color: p.color || '#9fd8ff', s: [], pose: null });
  hub.on('card', c => { H.card = c; });
  hub.on('start', () => { H.started = true; });
  hub.on('message', (d, from) => { const g = H.ghosts.get(from); if (!g || !d) return; if (d.t === 'g') { g.s.push({ at: hub.time(), p: d.p, u: d.u, v: d.v, lap: d.lap, fin: d.fin }); if (g.s.length > 40) g.s.shift(); } else if (d.t === 'done') g.done = d.ms; });
  hub.on('leave', p => { H.ghosts.delete(p && p.id); });
  hub.on('time-up', () => { if (!H.reported && H.dir) { H.reported = true; const h = H.dir.race.human; hub.result({ score: Math.round((h ? h.dist : 0) / U) }); } });
  hub.on('end', e => { H.ended = true; H.endInfo = e; SN.Audio.stop(); });
  return true;
};
H.seat = () => { const i = (H.info.players || []).findIndex(p => p.id === H.info.me); return i < 0 ? 0 : i; };
H.humanEntry = () => { const seat = H.seat(); return { name: (H.info.players[seat] && H.info.players[seat].name) || 'YOU', team: TEAMS_BY_SEAT[seat % 4], color: (H.info.players[seat] && H.info.players[seat].color) || SEAT_COLORS[seat % 4], seat }; };
// interpolate a ghost 100 ms behind the latest message
H.pose = (g, tr) => {
  const t = window.AIHub.time() - 100, s = g.s; if (!s.length) return null; let a = s[0], b = s[s.length - 1];
  for (let i = 0; i < s.length - 1; i++) if (s[i].at <= t && s[i + 1].at >= t) { a = s[i]; b = s[i + 1]; break; }
  const f = b.at === a.at ? 1 : clamp((t - a.at) / (b.at - a.at), 0, 1); return R.ghostPose(tr, a.p + (b.p - a.p) * f, a.u + (b.u - a.u) * f);
};
H.sendState = (race, dtMs) => {
  const hub = window.AIHub, h = race.human; if (!h || H.ended) return;
  H.sendT += dtMs; H.progT += dtMs;
  if (H.sendT >= 100) { H.sendT = 0; hub.send({ t: 'g', p: Math.round(h.dist * 10) / 10, u: Math.round(h.u), h: Math.round(h.h), y: Math.round(h.psi * 100) / 100, r: Math.round(h.roll * 100) / 100, v: Math.round(h.v), lap: h.lap, fin: h.finished ? 1 : 0 }, { reliable: false }); }
  if (H.progT >= 1000) { H.progT = 0; hub.progress({ score: Math.round(h.dist / U), label: 'LAP ' + Math.min(h.lap, race.laps) + '/' + race.laps + ' | ' + SN.ord(h.place).toUpperCase() }); }
  if (h.finished && !H.reported) {
    H.reported = true; const ms = Math.round(h.finishTime), best = h.lapTimes.length ? Math.min(...h.lapTimes) : 0;
    hub.result({ time: ms, stats: { 'Best lap': SN.fmtTime(best), 'Place vs AI': SN.ord(h.place) }, awards: h.place === 1 ? ['Pole to flag'] : [] }); hub.send({ t: 'done', ms });
  }
};
})();
