// The camera director: a broadcast camera on the sideline that frames each moment (the formation, the run, the pass
// with its receivers, the ball in the air, kicks), cuts to the Kick Cam for field goals, punches in on Big Hits. The
// zoom moves in steps (each step bakes the field once), the focus glides with our own smoothing.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, F = FF.F, T = FF.T, YD = 16, game = FF.game;
const STEPS = [.7, .85, 1, 1.2, 1.4];
const cam = FF.cam = { pos: { x: F.MID_X, y: F.MID_Y, z: 0 }, vel: { x: 0, y: 0 }, zoom: 1, want: 1, zoomT: 0, punchT: 0, view: 'broadcast', shot: 'PRESNAP', override: null };
const quant = z => STEPS.reduce((b, s) => Math.abs(s - z) < Math.abs(b - z) ? s : b, 1);
cam.baseView = () => ({ broadcast: 'broadcast', sky: 'sky', blimp: 'blimp' })[game.settings.camera] || 'broadcast';
cam.setView = id => { if (cam.view === id && game.view && game.view.id === FF.views[id].id) return; cam.view = id; game.setView(FF.views[id].id); };
cam.reset = (x = F.MID_X, y = F.MID_Y) => { cam.pos = { x, y, z: 0 }; cam.vel = { x: 0, y: 0 }; cam.zoomT = 0; cam.override = null; cam.punchT = 0; cam.applyZoom(1, true); game.focus(x, y, 0); };
cam.applyZoom = (z, now) => { const q = quant(z); if (q !== cam.zoom || now) { cam.zoom = q; game.setZoom(q); } };
cam.punch = (k = 1.25, hold = .35) => { if (game.settings.motion) return; cam.punchT = hold + .4; cam.punchK = k; };
/** the target for this moment of the match */
cam.target = m => {
  const b = m.ball, pl = m.play, h = b.holder, D = m.dir(m.poss);
  if (m.phase === 'PLAYCALL' || m.phase === 'COIN' || m.phase === 'QBREAK' || m.phase === 'HALFTIME') return { x: m.los + D * 5 * YD, y: m.ballY * .6 + F.MID_Y * .4, z: 1, shot: 'PRESNAP' };
  if (m.phase === 'PRESNAP') { if (pl && pl.off.type === 'kickoff') return { x: m.los + D * 9 * YD, y: F.MID_Y, z: .85, shot: 'KICKOFF' }; return { x: m.los + D * 4 * YD, y: m.ballY * .6 + F.MID_Y * .4, z: pl && pl.off.type === 'pass' ? .85 : 1, shot: 'PRESNAP' }; }
  if (m.phase === 'CELEBRATE' || m.phase === 'FINAL') { const s = h || b; return { x: s.x, y: s.y, z: 1.2, shot: 'CELEBRATE' }; }
  if (m.phase === 'PILE' && m.pile) return { x: m.pile.x, y: m.pile.y, z: 1.2, shot: 'PILE' };
  if (b.state === 'kick') { const L = b.to; return { x: (b.x + L.x) / 2, y: (b.y + L.y) / 2, z: Math.abs(L.x - b.x) > 30 * YD ? .7 : .85, shot: 'KICK' }; }
  if (b.state === 'pass' && (b.type === 'lob' || b.type === 'bullet')) { const L = b.to, dx = Math.abs(L.x - b.x), dy = Math.abs(L.y - b.y); return { x: (b.x + L.x) / 2, y: (b.y + L.y) / 2, z: dx > 22 * YD || dy > 14 * YD ? .7 : .85, shot: 'BALL_AIR' }; }
  if (h && m.canPass(h) && pl && (pl.off.type === 'pass' || pl.off.fakeKick)) {
    const rc = m.receivers(h.side); let x0 = h.x, x1 = h.x, y0 = h.y, y1 = h.y;
    for (const r of rc) if (Math.abs(r.x - h.x) < 30 * YD) { x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x); y0 = Math.min(y0, r.y); y1 = Math.max(y1, r.y); }
    const w = (x1 - x0) / YD, hh = (y1 - y0) / YD, z = w > 26 || hh > 20 ? .7 : w > 18 || hh > 14 ? .85 : 1;
    return { x: (x0 + x1) / 2 * .7 + h.x * .3, y: (y0 + y1) / 2 * .6 + h.y * .4, z, shot: 'PASS_PRE' };
  }
  if (h) return { x: h.x + h.vx * T.camLead, y: h.y + h.vy * T.camLead * .6, z: 1, shot: 'RUN' };
  return { x: b.x, y: b.y, z: .85, shot: 'LOOSE' };
};
cam.update = (m, dt) => {
  if (!m) return;
  let t = cam.override ? cam.override(dt) : cam.target(m);
  if (!t) return;
  cam.shot = t.shot;
  // the Kick Cam: field goals and PATs from behind the kicker
  const kc = m.play && m.play.off.type === 'fg' && (m.phase === 'PRESNAP' && m.set || (m.phase === 'LIVE' && m.ball.state !== 'held') || (m.phase === 'DEAD' && m.play.result && m.play.result.why === 'fg') || (m.phase === 'CELEBRATE' && m.play.result && m.play.result.why === 'fg'));
  const want = cam.forceView || (kc && !game.settings.motion ? (m.dir(m.poss) > 0 ? 'kickR' : 'kickL') : cam.baseView());
  if (want !== cam.view) { cam.setView(want); cam.pos = { x: t.x, y: t.y, z: 0 }; }
  if (kc) { const D = m.dir(m.poss); t = { x: m.los + D * 8 * YD, y: F.MID_Y * .7 + m.ballY * .3, z: 1 }; if (m.ball.state === 'kick') t.x = m.ball.x + D * 4 * YD; }
  // smooth the focus (a critically damped spring), the zoom in steps with a little patience
  const k = T.camSmooth || .18;
  for (const a of ['x', 'y']) { const r = E.smoothDamp(cam.pos[a], t[a], cam.vel[a], k, dt); cam.pos[a] = r[0]; cam.vel[a] = r[1]; }
  let z = t.z || 1; if (cam.punchT > 0) { cam.punchT -= dt; z *= cam.punchK || 1.25; }
  cam.zoomT -= dt;
  const q = quant(z); if (q !== cam.zoom && (cam.zoomT <= 0 || cam.punchT > 0)) { cam.applyZoom(q); cam.zoomT = .7; }
  game.focus(cam.pos.x, cam.pos.y, 0);
};
})();
