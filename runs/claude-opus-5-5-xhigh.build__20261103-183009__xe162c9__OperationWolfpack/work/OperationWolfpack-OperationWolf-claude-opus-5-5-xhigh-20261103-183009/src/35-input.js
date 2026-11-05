// Device adapters -> InputFrames (7.3): the mouse (absolute, like a light gun), sticks (curve, turbo, d-pad nudges), keys
// (a ramp), aim assist for pads and keys (friction, magnetism, snap to the most dangerous target). Overrides let the bot,
// the network or a test supply a player's frames instead.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;
const KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'] };
const PadKeys = { up: 'Pad12', down: 'Pad13', left: 'Pad14', right: 'Pad15' };
const IN = WP.Input = { cross: {}, overrides: {}, settings: { assist: .6, speed: 1 } };
IN.override = (pid, fn) => { if (fn) IN.overrides[pid] = fn; else delete IN.overrides[pid]; };
IN.reset = () => { IN.cross = {}; };
const C = (pid, slot) => IN.cross[pid] || (IN.cross[pid] = { x: WP.W * [.42, .58, .3, .7][slot % 4], y: WP.PLAY_H * .55, keyT: 0, turbo: 0, snap: null, snapCd: 0, lastPtr: null });
/** the hostile shapes the assist may pull toward (never civilians, hostages or animals) */
const hostile = s => { const k = WP.TYPES[s.e.type].kind; return !s.cover && (k === 'infantry' || k === 'vehicle' || k === 'boat' || k === 'air' || k === 'boss' || k === 'proj') && !(WP.TYPES[s.e.type].friendly) && s.part !== 'legs'; };
IN.hostile = hostile;
/** the highest-priority threat: a projectile about to hit, then the telegraph closest to firing, then the nearest hostile */
IN.threat = (world, x, y, dirx = 0, diry = 0) => {
  let best = null, bs = -1e9;
  for (const s of world.shapes || []) {
    if (!hostile(s)) continue;
    const e = s.e, c = WP.Hit.center(s), d = Math.hypot(c[0] - x, c[1] - y);
    let sc = -d * .01;
    if (WP.TYPES[e.type].kind === 'proj') sc += 6 + (e.u || 0) * 4;
    else { const a = e.atk || (e.parts && e.parts.map(p => p.atk).find(Boolean)); if (a && a.phase === 'tele') sc += 3 + a.t / a.T * 2; if (s.part === 'head') sc += .3; }
    if (dirx || diry) { const l = Math.hypot(dirx, diry) || 1, dot = ((c[0] - x) * dirx + (c[1] - y) * diry) / (l * (d || 1)); sc += dot * .8; }
    if (c[0] < 0 || c[0] > WP.W || c[1] < 0 || c[1] > WP.PLAY_H) continue;
    if (sc > bs) { bs = sc; best = { x: c[0], y: c[1], s }; }
  }
  return best;
};
/** one local player's frame from its device */
IN.local = (game, world, input, pid, slot, dt, o = {}) => {
  const c = C(pid, slot), held = input.held, diff = WP.DIFFS[(world.run && world.run.diff) || 'VETERAN'] || WP.DIFFS.VETERAN;
  let device = input.lastDevice;
  // the mouse: absolute; only player 1 has it
  if (slot === 0 && input.aimSource === 'mouse' && input.pointer && !o.noMouse) {
    const p = input.pointer();
    if (p && (!c.lastPtr || p[0] !== c.lastPtr[0] || p[1] !== c.lastPtr[1])) { c.x = p[0]; c.y = p[1]; c.lastPtr = p.slice(); c.snap = null; device = 'mouse'; }
  }
  let vx = 0, vy = 0;
  // a stick: left + half the right, |s|^2, turbo after .3 s near full tilt; the d-pad nudges
  const pm = input.padMove || [0, 0], pa = input.padAim || [0, 0];
  const sx = pm[0] + .5 * (pa[0] || 0), sy = pm[1] + .5 * (pa[1] || 0), mag = Math.min(1.4, Math.hypot(sx, sy));
  if (mag > .02) {
    const sp = WP.T.padSpeed * IN.settings.speed * Math.pow(Math.min(1, mag), 2);
    c.turbo = mag > .95 ? c.turbo + dt : 0;
    const k = (c.turbo > .3 ? 1.5 : 1) * sp / (mag || 1); vx += sx * k; vy += sy * k; device = 'gamepad';
  } else c.turbo = 0;
  for (const d in PadKeys) if (held.has(PadKeys[d])) { const v = 90; if (d === 'up') vy -= v; if (d === 'down') vy += v; if (d === 'left') vx -= v; if (d === 'right') vx += v; device = 'gamepad'; }
  // keys: 300 px/s ramping to 520 over .4 s
  let kx = 0, ky = 0;
  if (slot === 0 || !input.keysTo) for (const d in KEYS) if (KEYS[d].some(k => held.has(k))) { if (d === 'up') ky -= 1; if (d === 'down') ky += 1; if (d === 'left') kx -= 1; if (d === 'right') kx += 1; }
  if (kx || ky) { c.keyT += dt; const sp = (300 + 220 * clamp(c.keyT / .4, 0, 1)) * IN.settings.speed, l = Math.hypot(kx, ky); vx += kx / l * sp; vy += ky / l * sp; device = 'keyboard'; } else c.keyT = 0;
  // aim assist (not for the mouse)
  const assist = clamp((IN.settings.assist === undefined ? WP.T.assist : IN.settings.assist) + diff.assist, 0, 1);
  const moving = Math.hypot(vx, vy) > 1;
  if (assist > 0 && moving && world.shapes) {
    let inside = false; for (const s of world.shapes) if (hostile(s) && WP.Hit.contains(s, c.x, c.y, 6)) { inside = true; break; }
    if (inside) { vx *= 1 - .55 * assist; vy *= 1 - .55 * assist; }
    if (diff.magnet) {
      let best = null, bd = 28;
      for (const s of world.shapes) { if (!hostile(s) || s.part === 'head') continue; const q = WP.Hit.center(s), d = Math.hypot(q[0] - c.x, q[1] - c.y); if (d < bd) { const dot = ((q[0] - c.x) * vx + (q[1] - c.y) * vy) / ((d || 1) * Math.hypot(vx, vy)); if (dot > .3) { bd = d; best = q; } } }
      if (best) { const d = Math.hypot(best[0] - c.x, best[1] - c.y) || 1, pull = 160 * assist; vx += (best[0] - c.x) / d * pull; vy += (best[1] - c.y) / d * pull; }
    }
  }
  // snap to the threat (L1 / Q): an .08 s ease, .2 s cooldown
  c.snapCd -= dt;
  if (input.pressed('snap') && c.snapCd <= 0) { const t = IN.threat(world, c.x, c.y, vx, vy); if (t) { c.snap = { x0: c.x, y0: c.y, x: t.x, y: t.y, t: 0 }; c.snapCd = .2; } }
  if (c.snap) { c.snap.t += dt; const u = clamp(c.snap.t / .08, 0, 1); c.x = c.snap.x0 + (c.snap.x - c.snap.x0) * u; c.y = c.snap.y0 + (c.snap.y - c.snap.y0) * u; if (u >= 1) c.snap = null; }
  else { c.x += vx * dt; c.y += vy * dt; }
  c.x = clamp(c.x, 0, WP.W - 1); c.y = clamp(c.y, 0, WP.PLAY_H - 1);
  return { x: c.x, y: c.y, fire: input.down('fire'), grenade: input.pressed('grenade') ? 1 : 0, reload: input.pressed('reload') ? 1 : 0, snap: 0, device };
};
/** every player's frame this step: overrides (bot, network, tests) first, then local devices */
IN.frames = (game, world, locals, dt) => {
  const out = {};
  for (const p of world.players) {
    const f = IN.overrides[p.pid];
    if (f) { const fr = f(world, p, dt); if (fr) { out[p.pid] = fr; const c = C(p.pid, p.slot); c.x = fr.x; c.y = fr.y; } continue; }
    const L = locals[p.pid]; if (L) out[p.pid] = IN.local(game, world, L.input, p.pid, p.slot, dt, L.o || {});
  }
  return out;
};
})();
