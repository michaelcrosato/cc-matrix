// The cursor and the tool wheel: where the game lives or dies on a pad (sections 5.3, 5.4). They run outside the sim, once per
// local player, turning a device (a pad, a mouse, keys or the bot's virtual stick) into { x, y, tool, ... } for the sim.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U;

const Cursor = G.Cursor = {
  /** a local player's cursor state */
  make(x = 213, y = 116, tool = 'forceps') { return { x, y, vx: 0, vy: 0, tool, wheelT: 0, wheelSector: -1, wheelHold: 0, wheelCand: -1, wheelCandT: 0, wheelOut: false, ringX: x, ringY: y, ringFree: false, toggled: false, trigPrev: false, mouseOn: false, loupeT: 0 }; },
  /** assist in effect: the player's setting, the difficulty and the doctor's gift */
  assist(S, base) { const a = (base ?? .6) * (T.assist / .6) + (S ? S.k.assist : 0) + (S && S.doctor === 'sokolova' ? .2 : 0); return U.clamp(a, 0, 1); },
  /**
   * dev: { stick: [x, y], fine, nudge: [x, y], keys: [x, y], mouse: [x, y] (field units; present while the mouse is the
   * device), assist, speed }. S and h may be null (a menu or the lobby).
   */
  update(c, dev, S, h, dt) {
    const fine = !!dev.fine, a = Cursor.assist(S, dev.assist), speedK = (dev.speed ?? 1) * (S && S.doctor === 'vale' ? 1.15 : 1);
    if (dev.mouse) { c.x = dev.mouse[0]; c.y = dev.mouse[1]; c.vx = 0; c.vy = 0; c.mouseOn = true; }
    else {
      c.mouseOn = false;
      const sx = dev.stick ? dev.stick[0] : 0, sy = dev.stick ? dev.stick[1] : 0, m = Math.min(1, Math.hypot(sx, sy));
      let tx = 0, ty = 0;
      if (m > 0) { const v = Math.pow(m, T.curve) * T.curSpeed * speedK * (fine ? T.fineK : 1) / m; tx = sx * v; ty = sy * v; }
      if (dev.keys && (dev.keys[0] || dev.keys[1])) { const l = Math.hypot(dev.keys[0], dev.keys[1]) || 1; const v = T.keySpeed * speedK * (fine ? T.fineK : 1) / l; tx += dev.keys[0] * v; ty += dev.keys[1] * v; }
      if (dev.nudge && (dev.nudge[0] || dev.nudge[1])) { tx += dev.nudge[0] * T.nudge; ty += dev.nudge[1] * T.nudge; }
      if (S && h) {
        // guide-follow: during a stroke or stitch the push across the guide is scaled down
        const g = Cursor.guideAt(S, h, c);
        if (g) {
          const along = tx * g.tx + ty * g.ty, ax = g.tx * along, ay = g.ty * along, k = 1 - .8 * a;
          tx = ax + (tx - ax) * k; ty = ay + (ty - ay) * k;
          if (m > .05 || tx || ty) { tx += (g.x - c.x) * a * 8; ty += (g.y - c.y) * a * 8; }
        } else if (!h.held) {
          // magnet: near a valid target the stick slows, and at rest the cursor settles on it
          const t = G.Op.magnetTarget(S, h.tool, c.x, c.y, T.magnetR, h);
          if (t) {
            const k = 1 - .55 * a; tx *= k; ty *= k;
            if (m < .15 && !tx && !ty || (m < .15 && Math.hypot(tx, ty) < 6)) { const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy); if (d > .25) { const v = Math.min(90 * a, d / dt); tx += dx / d * v; ty += dy / d * v; } }
          }
        }
      }
      const r = Math.min(1, dt / T.curRamp); c.vx += (tx - c.vx) * r; c.vy += (ty - c.vy) * r;
      c.x += c.vx * dt; c.y += c.vy * dt;
    }
    const W = dev.bounds ? dev.bounds[0] : G.FIELD_W, H = dev.bounds ? dev.bounds[1] : G.FIELD_H, ox = dev.bounds ? dev.bounds[2] : 0, oy = dev.bounds ? dev.bounds[3] : 0;
    c.x = U.clamp(c.x, ox, ox + W); c.y = U.clamp(c.y, oy, oy + H);
    c.loupeT = fine ? c.loupeT + dt : 0;
  },
  /** the guide under a stroke or a stitch: { x, y, tx, ty } the nearest point on it and its direction */
  guideAt(S, h, c) {
    if (h.stroke) { const g = G.Op.byId(S, h.stroke); if (!g) return null; const p = U.polyAt(g.pts, Math.min(g.len, g.prog + 6)), n = U.polyNear(g.pts, c.x, c.y, Math.max(0, g.prog - 8), g.prog + 18); return { x: n.x, y: n.y, tx: p.tx, ty: p.ty }; }
    if (h.stitch) { const o = G.Op.byId(S, h.stitch.id); if (!o) return null; const st = G.Op.nextStitch(S, o); if (!st) return null; const a = h.stitch.from === 'a' ? st.a : st.b, b = h.stitch.from === 'a' ? st.b : st.a, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, q = U.seg(c.x, c.y, a[0], a[1], b[0], b[1]); return { x: q.x, y: q.y, tx: dx / l, ty: dy / l }; }
    return null;
  },
};

// ------------------------------------------------------------------ the wheel
const SECTOR = (x, y) => { const a = Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2 + Math.PI / 8; return Math.floor(a / (Math.PI / 4)) % 8; };   // 0 = north, clockwise
const Wheel = G.Wheel = {
  SECTOR,
  /**
   * dev: { wheelStick: [x, y] (pad), step: -1 | 0 | 1, digit: 0..7 or -1, mouseHold: bool, mousePos: [x, y] }.
   * Sets c.tool; c.wheelT is how long the ring keeps showing; c.wheelSector the highlighted one (for the HUD).
   */
  update(c, dev, dt) {
    const tools = G.TOOLS, before = c.tool;
    c.wheelT = Math.max(0, c.wheelT - dt);
    const st = dev.wheelStick; const m = st ? Math.hypot(st[0], st[1]) : 0;
    if (m > .6) {
      const s = SECTOR(st[0], st[1]);
      if (s !== c.wheelCand) { c.wheelCand = s; c.wheelCandT = 0; } else c.wheelCandT += dt;
      c.wheelSector = s; c.wheelT = .3; c.wheelOut = true; c.ringFree = false;
      if (c.wheelCandT >= .08 - 1e-6) c.tool = tools[s];
    } else { if (m < .35) { c.wheelCand = -1; c.wheelOut = false; } }
    if (dev.step) { const i = tools.indexOf(c.tool); c.tool = tools[(i + dev.step + 8) % 8]; c.wheelT = .5; c.wheelSector = tools.indexOf(c.tool); }
    if (dev.digit >= 0 && dev.digit < 8) { c.tool = tools[dev.digit]; c.wheelT = .4; c.wheelSector = dev.digit; }
    if (dev.mouseHold) {
      if (!c.wheelHold) { c.wheelHold = 1; c.ringX = dev.mousePos[0]; c.ringY = dev.mousePos[1]; c.ringFree = true; }
      const dx = dev.mousePos[0] - c.ringX, dy = dev.mousePos[1] - c.ringY; c.wheelT = .3;
      if (Math.hypot(dx, dy) > 7) c.wheelSector = SECTOR(dx, dy); else c.wheelSector = tools.indexOf(c.tool);
    } else if (c.wheelHold) {
      c.wheelHold = 0; if (c.wheelSector >= 0) c.tool = tools[c.wheelSector]; c.wheelT = .3;
    }
    if (c.tool !== before) c.justSwapped = true;
  },
};
})();
