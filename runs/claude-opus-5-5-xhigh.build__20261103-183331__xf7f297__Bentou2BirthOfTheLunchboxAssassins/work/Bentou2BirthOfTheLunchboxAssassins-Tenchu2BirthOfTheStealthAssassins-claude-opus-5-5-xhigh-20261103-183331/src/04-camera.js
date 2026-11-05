/* ---- CAMERA: follow with look-ahead (the mouse leans the view toward the cursor; Ki Focus + right stick scouts), 45°
 * turns (Q / E, a right-stick flick), zoom (- / =, right stick up and down), and cinematic overrides (the Silent Cut
 * zoom, boss intros, cutscenes) layered on the scene's own zoom ---- */
const Cam = { turnCd: 0, lean: [0, 0], cineK: 1, cineTo: 1, cineT: 0, focusK: 1, flick: 0, target: null, override: null };
Cam.base = () => (game.upright ? 1.35 : 1.15);
Cam.reset = () => { Cam.lean = [0, 0]; Cam.cineK = Cam.cineTo = 1; Cam.cineT = 0; Cam.focusK = 1; Cam.override = null; Cam.turnCd = 0; game.cam.free = null; game.setZoom(Cam.base()); };
/** a cinematic zoom: k times the base for `hold` seconds (game time), eased in and out */
Cam.cine = (k, hold = .6) => { if (game.reduceMotion) k = 1 + (k - 1) * .4; Cam.cineTo = k; Cam.cineT = hold; };
/** turn the view by ±45° (with a short whoosh); dir: -1 left, +1 right */
Cam.turn = dir => {
  if (Cam.turnCd > 0) return false;
  Cam.turnCd = .25; game.rotateView(45 * dir * (game.settings.invertTurn ? -1 : 1)); Au.sfx('whoosh', { vol: .25, pitch: 1.4 }); return true;
};
/** each step of play: aim the camera (call after the hero moved) */
Cam.update = (dt, hero, it) => {
  Cam.turnCd = Math.max(0, Cam.turnCd - dt / Math.max(.05, game.timeScale));
  if (Cam.cineT > 0) { Cam.cineT -= dt / Math.max(.05, game.timeScale); if (Cam.cineT <= 0) Cam.cineTo = 1; }
  Cam.cineK = approach(Cam.cineK, Cam.cineTo, dt / Math.max(.05, game.timeScale) * 5 * Math.max(.2, Math.abs(Cam.cineTo - Cam.cineK) * 3));
  Cam.focusK = approach(Cam.focusK, it && it.focusDown ? .9 : 1, dt * 1.2);
  const I = game.input, pl = it && it.player;
  if (pl) {
    if (I.pressed('camLeft')) Cam.turn(-1); if (I.pressed('camRight')) Cam.turn(1);
    if (I.pressed('camReset')) { game.resetCamera(); Cam.reset(); }
    const rs = it.rstick;
    if (rs && !it.focusDown) {
      if (Math.abs(rs[0]) > .7 && Math.abs(rs[0]) > Math.abs(rs[1])) { if (!Cam.flick) { Cam.flick = 1; Cam.turn(rs[0] > 0 ? 1 : -1); } }
      else if (Math.abs(rs[0]) < .3) Cam.flick = 0;
      if (Math.abs(rs[1]) > .5 && Math.abs(rs[1]) > Math.abs(rs[0])) game.zoomBy(1 - rs[1] * dt * .9);
    } else Cam.flick = 0;
  }
  game.setZoom(Cam.base() * Cam.cineK * Cam.focusK);
  if (Cam.override) { const o = Cam.override; game.focus(o.x, o.y, o.z || 0); return; }
  if (!hero) return;
  // look-ahead: the mouse leans up to 40 (140 with Focus); Focus + right stick scouts up to 140 on a pad; a hug peeks 48
  let lx = 0, ly = 0;
  if (it && it.aimPoint && it.mouseMode) { const dx = it.aimPoint.x - hero.x, dy = it.aimPoint.y - hero.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d * .35, it.focusDown ? 140 : 40); lx = dx / d * m; ly = dy / d * m; }
  else if (it && it.focusDown && it.rstick) { const g = game.view.screenDirToGround(it.rstick[0], it.rstick[1]); lx = g[0] * 140; ly = g[1] * 140; }
  if (hero.peek) { lx += hero.peek[0] * 48; ly += hero.peek[1] * 48; }
  Cam.lean[0] = approach(Cam.lean[0], lx, dt * 220); Cam.lean[1] = approach(Cam.lean[1], ly, dt * 220);
  game.focus(hero.x + Cam.lean[0], hero.y + Cam.lean[1], (hero.drawZ !== undefined ? hero.drawZ : hero.z) + 18);
};
B.Cam = Cam;
