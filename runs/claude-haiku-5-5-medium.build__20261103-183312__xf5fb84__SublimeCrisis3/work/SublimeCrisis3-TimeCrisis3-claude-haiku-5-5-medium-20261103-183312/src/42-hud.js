// 42-hud.js: the HUD (plan 4.13), drawn over each viewport, and the screen-wide layer (banners, the hurt border, the
// boss card). The HUD reads the sim and the play's presentation state; it never changes them. Positions are in buffer
// pixels, anchored to the viewport. Smallest text is scale 1; the numbers that matter are scale 2 and up.

TC.HUD = { blue: '#3aa0e8', pale: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c0' };

// The label for an action on the device a seat used last: 'R2', 'Right click', 'Space' and so on.
TC.labelFor = function (seat, action) {
  const input = seat && seat.input;
  if (!input || !input.label) return '';
  try { return input.label(action); } catch (e) { return ''; }
};

// A viewport's HUD.
TC.drawHUD = function (play, g, vp, p, cam) {
  const sim = play.sim, seat = play.seats[p.id], W = vp.w, H = vp.h;
  const x0 = vp.x, y0 = vp.y, cx = x0 + W / 2, cy = y0 + H / 2;
  const hudOff = TC.tune.view.hideHud;
  // Reticle, centred on the aim, hidden in cover (plan 4.3: in cover the reticle hides).
  if (!p.out && p.c < 0.5 && !hudOff) {
    const rx = cx + p.aim[0] * (H / 2), ry = cy - p.aim[1] * (H / 2);
    const col = p.color || '#ffffff';
    g.fillStyle = col;
    g.fillRect(Math.round(rx) - 4, Math.round(ry), 3, 1); g.fillRect(Math.round(rx) + 2, Math.round(ry), 3, 1);
    g.fillRect(Math.round(rx), Math.round(ry) - 4, 1, 3); g.fillRect(Math.round(rx), Math.round(ry) + 2, 1, 3);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(rx), Math.round(ry), 1, 1);
    if (play.hitMarker > 0) {
      const c = play.hitHead ? TC.HUD.gold : '#ffffff';
      TC.text(g, 'X', rx + 6, ry - 4, c, { scale: 1 });
    }
    const w = TC.get('weapon', sim.weaponId(p));
    if (sim.ammoOf(p, w.id) <= 0 || (w.id === 'handgun' && p.mag <= 0)) {
      if (Math.floor(play.time * 4) % 2 === 0) TC.text(g, 'RELOAD!', cx, cy + 14, TC.HUD.warn, { align: 'center', scale: 1 });
    }
  }
  // TIME, the rising-tide plate, top centre.
  const tfrac = TC.clamp(sim.timer / Math.max(1, sim.timeMax), 0, 1);
  const tw = Math.min(60, Math.max(34, W * 0.14)), th = 18;
  const tx = cx - tw / 2, ty = y0 + 3;
  g.fillStyle = '#05070fcc'; g.fillRect(tx - 1, ty - 1, tw + 2, th + 2);
  g.fillStyle = TC.HUD.blue; g.fillRect(tx, ty + th - Math.round(th * tfrac), tw, Math.round(th * tfrac));
  const low = sim.timer < 10 && (sim.phase === 'action' || sim.phase === 'boss');
  const blink = sim.timer < 5 && Math.floor(play.time * 6) % 2 === 0;
  const timeCol = low ? (blink ? '#ffffff' : TC.HUD.warn) : '#f4f7ff';
  TC.text(g, 'TIME', cx, ty + 1, timeCol, { align: 'center', scale: 1, outline: '#05070f' });
  TC.text(g, Math.max(0, sim.timer).toFixed(1), cx, ty + 9, timeCol, { align: 'center', scale: 1, outline: '#05070f' });
  // The boss' bars, under TIME.
  if (sim.boss && !sim.boss.defeated && sim.phase === 'boss') {
    let bx = cx - 60, by = ty + th + 4;
    const cores = sim.boss.parts.filter(q => !q.decor);
    const n = cores.length;
    for (let i = 0; i < n; i++) {
      const q = cores[i], frac = TC.clamp(q.hp / Math.max(1, q.max), 0, 1);
      g.fillStyle = '#000000aa'; g.fillRect(bx + i * 40, by, 36, 4);
      g.fillStyle = q.down ? '#303a4a' : q.core ? '#ff5a2a' : '#ffd36a';
      g.fillRect(bx + i * 40, by, Math.round(36 * frac), 4);
    }
  }
  // Score, top left, and the chain under it.
  const pts = Math.round(p.score);
  TC.text(g, 'SCORE', x0 + 4, y0 + 4, TC.HUD.dim, { scale: 1 });
  TC.text(g, TC.fmt(pts), x0 + 4, y0 + 12, TC.HUD.pale, { scale: 2 });
  if (p.chain > 0) TC.text(g, 'x' + p.mult.toFixed(1) + ' (' + p.chain + ')', x0 + 4, y0 + 30, TC.HUD.gold, { scale: 1 });
  if (sim.players.length > 1) TC.text(g, p.name, x0 + 4, y0 + 40, p.color, { scale: 1 });
  // Lives, bottom left: a CREST shield for each.
  for (let i = 0; i < Math.min(9, Math.max(0, p.lives)); i++) {
    const sx = x0 + 4 + i * 8, sy = y0 + H - 14;
    g.fillStyle = '#3aa0e8'; g.fillRect(sx, sy, 6, 8); g.fillStyle = '#f4f7ff'; g.fillRect(sx + 2, sy + 2, 2, 4);
  }
  // The weapon panel, bottom right.
  const w = TC.get('weapon', sim.weaponId(p));
  const wx = x0 + W - 4;
  const wname = w.short;
  TC.text(g, wname, wx, y0 + H - 26, TC.HUD.pale, { align: 'right', scale: 1 });
  if (w.id === 'handgun') {
    const pips = w.mag;
    for (let i = 0; i < pips; i++) {
      g.fillStyle = i < p.mag ? w.pip : '#2a3550';
      g.fillRect(wx - 4 - (pips - i) * 4, y0 + H - 16, 3, 6);
    }
    TC.text(g, 'UNLIMITED', wx, y0 + H - 36, TC.HUD.dim, { align: 'right', scale: 1 });
  } else {
    const n = sim.ammoOf(p, w.id);
    TC.text(g, String(n), wx, y0 + H - 36, TC.HUD.pale, { align: 'right', scale: 2 });
    g.fillStyle = w.pip; g.fillRect(wx - 60, y0 + H - 14, Math.round(56 * TC.clamp(n / w.pool, 0, 1)), 3);
  }
  if (p.reloadT >= 0) {
    const frac = TC.clamp(p.reloadT / (w.reloadCover * (TC.tune.player.reload / 0.3)), 0, 1);
    TC.text(g, 'RELOADING ' + Math.round(frac * 100) + '%', cx, cy + 22, TC.HUD.pale, { align: 'center', scale: 1 });
  }
  // Weapon strip after a switch.
  if (p.switchT > 0) {
    TC.text(g, TC.WEAPON_ORDER.map((id, i) => (id === w.id ? '[' + (i + 1) + ']' : ' ' + (i + 1) + ' ')).join(''), cx, y0 + H - 12, TC.HUD.gold, { align: 'center', scale: 1 });
  }
  // Threat rings: the crisis flash, at the shooter's muzzle, for threats aimed at this player.
  if (!hudOff) TC.drawThreats(play, g, vp, p, cam);
  // Cover: a dark rim and a tag while hidden.
  if (p.c >= 0.5) {
    g.fillStyle = '#000000'; g.globalAlpha = 0.35;
    g.fillRect(x0, y0, W, 6); g.fillRect(x0, y0 + H - 6, W, 6); g.fillRect(x0, y0, 6, H); g.fillRect(x0 + W - 6, y0, 6, H);
    g.globalAlpha = 1;
    TC.text(g, 'COVER', cx, y0 + H - 22, TC.HUD.gold, { align: 'center', scale: 1 });
  }
  // Hurt: a red border that fades.
  if (play.fx.hurt > 0 && vp.i === p.id) {
    g.fillStyle = '#ff3b30'; g.globalAlpha = TC.clamp(play.fx.hurt, 0, 1) * 0.5;
    g.fillRect(x0, y0, W, 3); g.fillRect(x0, y0 + H - 3, W, 3); g.fillRect(x0, y0, 3, H); g.fillRect(x0 + W - 3, y0, 3, H);
    g.globalAlpha = 1;
  }
  // Continue: this player is out.
  if (p.out && !p.dead) {
    g.fillStyle = '#05070fdd'; g.fillRect(x0, y0, W, H);
    TC.text(g, 'CONTINUE? ' + Math.max(0, Math.ceil(p.outT)), cx, cy - 10, TC.HUD.gold, { align: 'center', scale: 3 });
    const lab = TC.labelFor(seat, 'fire');
    TC.text(g, 'PRESS ' + (lab || 'FIRE') + ' TO JOIN IN', cx, cy + 16, TC.HUD.pale, { align: 'center', scale: 1 });
  }
  void cam;
};

// Threat rings: a ring at the muzzle's screen point, shrinking to a point as the impact nears; a "!" glyph; an edge
// arrow when the shooter is off screen. Threats aimed at a teammate show only a small outline.
TC.drawThreats = function (play, g, vp, p, cam) {
  const ras = play.rasters[vp.i];
  if (!ras) return;
  for (const th of play.threatRings.values()) {
    const u = TC.clamp((play.sim.t - th.t0) / th.dur, 0, 1);
    const mine = th.target === p.id;
    const sx = ras.project(th.muzzle);
    const x = vp.x + (sx ? sx[0] : vp.w / 2), y = vp.y + (sx ? sx[1] : vp.h / 2);
    const visible = sx && sx[0] >= 0 && sx[0] < vp.w && sx[1] >= 0 && sx[1] < vp.h;
    if (!mine) {
      if (visible) { g.strokeStyle = '#ff8a7a'; g.globalAlpha = 0.6; g.strokeRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); g.globalAlpha = 1; }
      continue;
    }
    if (!visible) {
      // An edge arrow toward the shooter.
      const ax = TC.clamp(x, vp.x + 6, vp.x + vp.w - 6), ay = TC.clamp(y, vp.y + 14, vp.y + vp.h - 14);
      g.fillStyle = '#ff3b30';
      g.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4);
      TC.text(g, '!', ax, ay - 10, '#ffffff', { align: 'center', scale: 1 });
      continue;
    }
    const size = TC.tune.view.threatBig ? 2 : 1;
    const rad = (26 - 20 * u) * size * 0.5 + 3;
    const blinkOn = u < 0.66 || Math.floor(play.time * 20) % 2 === 0;
    g.strokeStyle = '#ff3b30'; g.lineWidth = 1;
    g.globalAlpha = 0.95;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    if (blinkOn) TC.text(g, '!', x + rad + 2, y - 4, '#ff3b30', { scale: 1 });
    g.globalAlpha = 1;
  }
};

// The screen-wide layer: banners, the radio box, the prompts and the intel note. Drawn once, across the whole screen.
TC.drawGlobal = function (play, g, W, H) {
  // Banners: the big words, slid in and faded over their life.
  let by = Math.round(H * 0.42);
  for (const b of play.fx.banners) {
    const u = TC.clamp(b.t / b.life, 0, 1);
    const alpha = u > 0.8 ? (1 - u) / 0.2 : 1;
    g.globalAlpha = Math.max(0, alpha);
    const slide = u < 0.12 ? (1 - u / 0.12) * 16 : 0;
    TC.text(g, b.text, W / 2 + slide, by, b.color, { align: 'center', scale: b.scale, outline: '#05070f' });
    if (b.sub) TC.text(g, b.sub, W / 2, by + 14 * b.scale, '#cfe4ff', { align: 'center', scale: 1 });
    by += 0;
    g.globalAlpha = 1;
    break;
  }
  // The radio box: a 32-px portrait is not drawn; the speaker's name and the line, typed out.
  const r = play.radioQueue[0];
  if (r && TC.subtitles()) {
    const sp = TC.get('speaker', r.speaker);
    const n = Math.min(r.line.length, Math.floor(r.t * 30));
    const bw = Math.min(W - 16, 300), bx = Math.round((W - bw) / 2), bh = 30, byy = H - bh - 22;
    g.globalAlpha = 0.92;
    g.fillStyle = '#081428'; g.fillRect(bx, byy, bw, bh);
    g.fillStyle = sp.color; g.fillRect(bx, byy, 2, bh);
    g.globalAlpha = 1;
    TC.text(g, sp.name, bx + 6, byy + 3, sp.color, { scale: 1 });
    TC.text(g, r.line.slice(0, n), bx + 6, byy + 12, '#f4f7ff', { scale: 1 });
  }
  if (play.intelT > 0 && play.intelText) {
    play.intelT -= 1 / 60;
    TC.text(g, 'INTEL: ' + play.intelText.slice(0, 44), W / 2, 6, '#9fffb0', { align: 'center', scale: 1 });
  }
};

// Subtitles on or off (the Settings option).
TC.subtitles = function () {
  return !(TC.settings && TC.settings.subtitles === false);
};
