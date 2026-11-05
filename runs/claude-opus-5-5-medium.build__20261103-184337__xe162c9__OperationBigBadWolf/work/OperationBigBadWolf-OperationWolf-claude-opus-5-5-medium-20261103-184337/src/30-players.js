// Players: device adapters turn a mouse, the keys, a pad, the bot or the network into InputFrames, with the
// crosshair's motion, aim assist and snap. Seat 0 is game.input (keyboard, mouse and the first pad).
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T, clamp = E.clamp;
WP.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7'], grenade: ['Mouse2', 'KeyG', 'KeyK', 'Pad6', 'Pad5'],
  reload: ['KeyR', 'KeyL', 'Mouse1', 'Pad2'], snap: ['KeyQ', 'Pad4'], more: ['KeyM', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
WP.ACTION_NAMES = { fire: 'Fire', grenade: 'Grenade', reload: 'Reload', snap: 'Snap to threat', more: 'More time (hub card)' };
const P = WP.Players = { seats: [], overrides: {}, state: [] };
// the inputs of the local seats: seat i -> an engine input
P.input = seat => { const g = WP.game; if (!g) return null; const ps = g.players || [g.input]; return ps[seat] || null; };
WP.inputFor = pid => P.input(pid < 0 ? 0 : pid);
P.override = (seat, fn) => { if (fn) P.overrides[seat] = fn; else delete P.overrides[seat]; };
// one seat's frame for this step
P.frame = (seat, world, dt, pi) => {
  if (pi === undefined) pi = seat;
  if (P.overrides[seat]) return P.overrides[seat](world, seat, dt);
  if (WP.CHEATS.autopilot && seat === 0) return WP.Bot.frame(world, pi, dt, { fair: false });
  const I = P.input(seat), p = world.players[pi]; if (!I || !p) return null;
  const st = P.state[seat] || (P.state[seat] = { kt: 0, pt: 0, lastPtr: null, x: p.x, y: p.y });
  let x = p.x, y = p.y; const dev = I.lastDevice;
  const sens = (WP.game.settings.aimSpeed || 1);
  // the mouse: absolute, like a light gun
  const ptr = seat === 0 && I.pointer ? I.pointer() : null;
  if (ptr && (!st.lastPtr || ptr[0] !== st.lastPtr[0] || ptr[1] !== st.lastPtr[1])) { x = ptr[0]; y = ptr[1]; st.lastPtr = ptr.slice(); }
  // keys: 300 px/s ramping to 520 over .4 s (read from held codes, not the actions the stick also presses)
  const H = I.held || new Set(), has = c => H.has ? H.has(c) : H[c];
  let kx = 0, ky = 0;
  if (seat === 0 || I.device !== 'gamepad') { if (has('KeyA') || has('ArrowLeft')) kx--; if (has('KeyD') || has('ArrowRight')) kx++; if (has('KeyW') || has('ArrowUp')) ky--; if (has('KeyS') || has('ArrowDown')) ky++; }
  let vx = 0, vy = 0, moving = false;
  if (kx || ky) { st.kt += dt; const sp = (300 + 220 * Math.min(1, st.kt / .4)) * sens, l = Math.hypot(kx, ky); vx += kx / l * sp; vy += ky / l * sp; moving = true; } else st.kt = 0;
  // the pad: left stick fast, right stick half, the d-pad nudges
  const pm = I.padMove || [0, 0], pa = I.padAim || [0, 0];
  const sx = pm[0] + .5 * (pa ? pa[0] : 0), sy = pm[1] + .5 * (pa ? pa[1] : 0), m = Math.hypot(sx, sy);
  if (m > .02) { if (m > .95) st.pt += dt; else st.pt = 0; const sp = T.padSpeed * sens * Math.pow(Math.min(1, m), 2) * (st.pt > .3 ? 1.5 : 1); vx += sx / m * sp; vy += sy / m * sp; moving = true; } else st.pt = 0;
  if (has('Pad12')) vy -= 90; if (has('Pad13')) vy += 90; if (has('Pad14')) vx -= 90; if (has('Pad15')) vx += 90;
  // aim assist for pads and keys (never the mouse)
  if (moving && dev !== 'mouse' && world.view) {
    const a = P.assistLevel();
    if (a > 0) { const as = WP.assistAt(world, x, y); vx *= 1 - .55 * a * (as.fric < 1 ? 1 : 0); vy *= 1 - .55 * a * (as.fric < 1 ? 1 : 0);
      if (as.pull && WP.diff().assist !== -1) { const dx = as.pull[0] - x, dy = as.pull[1] - y, l = Math.hypot(dx, dy) || 1; if ((dx * vx + dy * vy) / (l * (Math.hypot(vx, vy) || 1)) > .3) { const pull = Math.min(l, 160 * a * dt); x += dx / l * pull; y += dy / l * pull; } } }
  }
  x = clamp(x + vx * dt, 0, WP.W - 1); y = clamp(y + vy * dt, 0, WP.PLAY_H - 1);
  const ctl = !(WP.game.shell && WP.game.shell.screen);
  return { x, y, fire: ctl && I.down('fire'), grenade: ctl && I.pressed('grenade'), reload: ctl && I.pressed('reload'), snap: ctl && I.pressed('snap'), dx: sx, dy: sy, device: dev };
};
P.assistLevel = () => { const s = WP.game && WP.game.settings ? WP.game.settings.assist : 'medium'; const base = { off: 0, low: .35, medium: .6, high: .85 }[s]; const v = base === undefined ? T.assist : base * (T.assist / .6); return clamp(v + Math.max(0, WP.diff().assist), 0, 1); };

// ---------------------------------------------------------------------------------------------- the bot: attract mode, autopilot, tests
const Bot = WP.Bot = { st: {} };
Bot.frame = (world, seat, dt, o = {}) => {
  const p = world.players[seat]; if (!p) return null;
  const s = Bot.st[seat] || (Bot.st[seat] = { tgt: null, t: 0, vx: 0, vy: 0, delay: 0, aimAt: null, part: null, gT: 0 });
  s.t -= dt; s.gT -= dt;
  const maxV = o.fair ? 600 : 900;
  if (s.t <= 0) { s.t = .1; const pick = Bot.pick(world, p, o); if (pick && (!s.tgt || pick.e !== s.tgt.e)) s.delay = o.fair ? .15 + (world.R ? world.R.ai() : .5) * .15 : 0; s.tgt = pick; }
  let fire = false, grenade = false, reload = false;
  if (s.delay > 0) s.delay -= dt;
  const tg = s.tgt;
  if (tg && s.delay <= 0) {
    const fresh = Bot.shapePoint(world, tg.e, tg.part);
    if (fresh) { const dx = fresh[0] - p.x, dy = fresh[1] - p.y, d = Math.hypot(dx, dy); const step = Math.min(d, maxV * dt); const nx = p.x + (d ? dx / d * step : 0), ny = p.y + (d ? dy / d * step : 0);
      const at = world.pick(nx, ny); fire = d < 10 && at && at.e === tg.e;
      if (at && (at.e.kind === 'civilian' || at.e.kind === 'hostage' || (at.e.kind === 'animal' && tg.e.kind !== 'animal'))) fire = false;
      if (o.fair && fire && world.R && world.R.ai() < .005) return { x: nx + 12, y: ny, fire: true };
      s.x = nx; s.y = ny;
      // grenades: at a vehicle or boss, or a crowd, with no friendly near
      if (s.gT <= 0 && p.grenades > 0 && d < 30 && (tg.e.kind === 'vehicle' || tg.e.kind === 'boss' || Bot.crowd(world, tg.e) >= 3) && !Bot.friendlyNear(world, tg.e)) { grenade = true; s.gT = 3; }
    }
  } else { s.x = p.x + (WP.W / 2 - p.x) * dt; s.y = p.y + (WP.PLAY_H * .5 - p.y) * dt; }
  const best = p.spares.length ? Math.max(...p.spares) : 0;
  if (p.mag < 6 && best > p.mag + 8 && !Bot.danger(world)) reload = true;
  if (p.mag === 0 && best > 0) reload = true;
  return { x: clamp(s.x === undefined ? p.x : s.x, 0, WP.W - 1), y: clamp(s.y === undefined ? p.y : s.y, 0, WP.PLAY_H - 1), fire, grenade, reload, snap: false };
};
Bot.crowd = (world, e) => world.ents.filter(q => !q.dead && q.kind === 'infantry' && Math.hypot(q.x - e.x, q.y - e.y) < T.grenadeRadius).length;
Bot.friendlyNear = (world, e) => world.ents.some(q => !q.dead && (q.kind === 'civilian' || q.kind === 'hostage') && Math.hypot(q.x - e.x, q.y - e.y) < T.grenadeRadius * 1.2);
Bot.danger = world => world.ents.some(e => (e.tele && e.tele.t < .9) || (e.kind === 'projectile' && !e.friendly && e.u > .3));
Bot.shapePoint = (world, e, part) => {
  if (!e || e.dead || e.gone) return null; const out = []; world.shapesOf(e, out); if (!out.length) return null;
  const s = out.find(q => q.part === part) || out.find(q => q.part === 'head' && e.T.brute) || out.find(q => q.part === 'body') || out.find(q => q.part && q.part.startsWith('p:')) || out.find(q => q.part === 'gunner' || q.part === 'gunner2') || out.find(q => q.part === 'head') || out[0];
  if (s.part === 'shield' || (s.part === 'hull' && e.kind === 'boss')) return null;
  const c = s.c ? [s.c[0], s.c[1]] : [(s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2];
  if (c[0] < 2 || c[0] > WP.W - 2 || c[1] < 2 || c[1] > WP.PLAY_H - 2) return null;
  // it must be the frontmost thing there (not behind cover)
  const at = world.pick(c[0], c[1]); if (!at || at.e !== e) { if (s.c) return null; const c2 = [c[0], s.r[1] + 2]; const at2 = world.pick(c2[0], c2[1]); return at2 && at2.e === e ? c2 : null; }
  return c;
};
Bot.pick = (world, p, o) => {
  let best = null, bs = -1e9; const low = p.mag + p.spares.length * T.magSize < 90 || p.damage > 50;
  for (const e of world.ents) {
    if (e.dead || e.gone || e.hidden) continue; let score = null, part = null;
    if (e.kind === 'projectile' && !e.friendly && e.T.shootable !== false) score = 100 + (e.u || 0) * 50;
    else if (e.tele && (e.kind === 'infantry' || e.kind === 'vehicle' || e.kind === 'boss')) score = 60 + (1 - e.tele.t / e.tele.max) * 30;
    else if (e.kind === 'boss') { score = 40; const live = e.parts.filter(q => q.phase === e.phase && !q.dead); if (e.type === 'tuskTower' && e.phase === 1) part = 'p:tusk'; else { const q = live.find(q => !q.opt) || live[0]; if (q) part = 'p:' + q.id; } }
    else if (e.kind === 'vehicle') { score = 35; if (e.gunner && !e.gunner.dead && e.T.gunnerAt) part = 'gunner'; }
    else if (e.kind === 'infantry') score = 30 + (e.T.brute ? 5 : 0);
    else if (e.kind === 'pickup') score = low ? 45 : 12;
    else if (e.kind === 'animal' && e.carry && !e.fled) score = 15;
    else if (e.kind === 'prop' && (e.type === 'mast') && !e.dead) score = 20;
    else if (e.kind === 'prop' && (e.type === 'crate' || e.type === 'ammoCrate') && !e.dead && low) score = 16;
    else if (e.kind === 'prop' && (e.type === 'barrel' || e.type === 'fuelTank' || e.type === 'rope' || e.type === 'searchlight') && !e.dead) score = Bot.crowd(world, e) >= 2 || e.type === 'rope' || e.type === 'searchlight' ? 38 : -1;
    if (score === null || score < 0) continue;
    if (e.type === 'tuskTower' && e.phase === 1 && e.tusk && !(e.tusk.shieldDown > 0 || e.tusk.knocked > 0)) part = 'p:tusk';
    const pt = Bot.shapePoint(world, e, part); if (!pt) continue;
    score -= Math.hypot(pt[0] - p.x, pt[1] - p.y) / 60;
    if (score > bs) { bs = score; best = { e, part }; }
  }
  return best;
};
})();
