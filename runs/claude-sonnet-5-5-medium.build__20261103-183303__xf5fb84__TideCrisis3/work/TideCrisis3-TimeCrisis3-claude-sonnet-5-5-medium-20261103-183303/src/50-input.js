// 50-input.js — the action map (DualSense / keyboard + mouse), per-player aim (mouse absolute, pad curve + assist,
// keys constant), and the Command each player's device produces for the Sim.
const INPUT = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'KeyZ', 'KeyJ', 'Pad7', 'Pad0'], cover: ['Mouse2', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyX', 'Pad6', 'Pad1'],
  next: ['WheelDown', 'KeyE', 'Pad5'], prev: ['WheelUp', 'KeyQ', 'Pad4'], reload: ['KeyR', 'Pad2'], w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  tab: ['KeyE', 'Pad5'], tabPrev: ['KeyQ', 'Pad4'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], more: ['KeyM', 'Pad3'], reset: ['Delete', 'Pad2']
});
['attack', 'dash', 'skill', 'jump'].forEach(k => delete INPUT[k]);
const NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', tab: false, tabPrev: false, more: false, reset: false };
const AimState = [{ ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }];
// Build one player's command. rect = the viewport {x,y,w,h} in buffer pixels (for the pointer).
function readCommand(sim, pid, inp, rect, dt, settings, isMouseOwner) {
  const p = sim.players[pid], A = AimState[pid], H = rect.h / 2, aspect = rect.w / rect.h; p.aspect = aspect;
  const assist = settings && settings.aimAssist != null ? ({ off: 0, low: .35, medium: .6, high: .85 })[settings.aimAssist] : tune.player.assist;
  let ax = p.aim[0], ay = p.aim[1];
  const pt = isMouseOwner ? inp.pointer() : null;
  if (inp.aimSource === 'mouse' && pt && !settings.mouseOff) { ax = (pt[0] - rect.x - rect.w / 2) / H; ay = -((pt[1] - rect.y - rect.h / 2) / H); }
  else if (inp.aimSource === 'pad' || inp.padAim || (inp.padMove && Math.hypot(inp.padMove[0], inp.padMove[1]) > .2)) {
    let s = inp.padAim || inp.padMove || [0, 0]; const mag = Math.hypot(s[0], s[1]);
    if (mag > .05) {
      const c = Math.pow(mag, 2.2) / mag, speed = tune.player.padSpeed * (settings.padSpeed || 1); A.hold = Math.min(1.5, A.hold + dt); const accel = 1 + Math.min(.5, A.hold / .35 * .5);
      let sp = speed * accel;
      if (assist > 0) { const near = nearestTarget(sim, pid, ax, ay); if (near && near.d < .07) sp *= 1 - .55 * assist; if (near && near.d < .12 && mag > .2) { ax += (near.ax - ax) * Math.min(1, assist * 6 * dt); ay += (near.ay - ay) * Math.min(1, assist * 6 * dt); } }
      ax += s[0] * c * sp * dt; ay -= s[1] * c * sp * dt;
    } else A.hold = 0;
    { let dx = 0, dy = 0; if (inp.down('left')) dx -= 1; if (inp.down('right')) dx += 1; if (inp.down('up')) dy += 1; if (inp.down('down')) dy -= 1; ax += dx * .7 * dt; ay += dy * .7 * dt; }   // the d-pad nudges the reticle
  } else {
    let dx = 0, dy = 0; if (inp.down('left')) dx -= 1; if (inp.down('right')) dx += 1; if (inp.down('up')) dy += 1; if (inp.down('down')) dy -= 1;
    if (dx || dy) { ax += dx * 1.2 * dt; ay += dy * 1.2 * dt; }
  }
  ax = clamp(ax, -aspect, aspect); ay = clamp(ay, -1, 1);
  const cmd = { aim: [ax, ay] };
  // cover: hold or toggle
  if (settings.coverMode === 'toggle') { if (inp.pressed('cover')) A.tog = A.tog ? 0 : 1; cmd.coverDown = !!A.tog; } else { A.tog = 0; cmd.coverDown = inp.down('cover'); }
  if (inp.pressed('reload')) A.rel = .55; if (A.rel > 0) { A.rel -= dt; cmd.coverDown = true; }
  cmd.firePressed = inp.pressed('fire'); cmd.fireDown = inp.down('fire'); cmd.autoFire = settings.autoFire !== 'off';
  cmd.next = inp.pressed('next'); cmd.prev = inp.pressed('prev'); cmd.reload = inp.down('reload');
  for (let i = 1; i <= 4; i++) if (inp.pressed('w' + i)) cmd.select = i;
  return cmd;
}
function nearestTarget(sim, pid, ax, ay) {
  const pose = sim.pose(pid); let best = null;
  const consider = (c, civ) => { if (civ) return; const a = R3.aimOf(pose, c); if (!a) return; const d = Math.hypot(a[0] - ax, a[1] - ay); if (!best || d < best.d) best = { d, ax: a[0], ay: a[1] }; };
  for (const e of sim.enemies) { if (e.dead || e.civ || e.gone) continue; const v = sim.volumes(e); if (!v.length) continue; const t = v.find(q => q.part === 'torso') || v[0]; consider(t.k === 's' ? t.c : [(t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2, (t.a[2] + t.b[2]) / 2]); }
  for (const pr of sim.proj) if (!pr.dead && pr.team !== 'p') consider([pr.x, pr.y, pr.z]);
  for (const o of sim.objs) if (!o.dead && (o.ring || o.intel || o.lock)) consider([o.x, o.y, o.z + o.h / 2]);
  if (sim.boss) for (const v of sim.bossVolumes()) if (v.k === 's') consider(v.c);
  return best;
}
