// 40-input.js: the controls (plan 4.3). The action map gives the codes for each action on a keyboard, a mouse and a
// standard-mapped pad (PlayStation layout, so R2 is Pad7, L2 Pad6, Cross Pad0, Circle Pad1, Square Pad2, Triangle Pad3,
// L1 Pad4, R1 Pad5). A seat turns its device's state into one command per step (TC.commandFor): the aim in view units
// (the mouse maps exactly under the pointer; a stick moves the reticle with the response curve; the keys move it at a
// constant speed), the fire, cover, reload, and the weapon keys. Nothing here names a key in a prompt: prompts come from
// input.label(action).

// The menu keys, copied from the engine's preset (plan 3.6), with our play actions added.
TC.PRESET = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'Pad7', 'Pad0', 'KeyZ', 'KeyJ'],
  cover: ['Mouse2', 'Space', 'Pad6', 'Pad1', 'KeyX', 'ShiftLeft', 'ShiftRight'],
  reload: ['KeyR', 'Pad2'],
  next: ['KeyE', 'Pad5', 'WheelDown'],
  prev: ['KeyQ', 'Pad4', 'WheelUp'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  more: ['Pad3', 'KeyM'],
});
// Actions the Controls screen shows (the names are the player's words).
TC.CONTROL_NAMES = { fire: 'Fire', cover: 'Take cover', reload: 'Quick reload', next: 'Next weapon', prev: 'Previous weapon',
  w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher' };

// The aim speeds (view units per second): a stick at full tilt, and the keys.
TC.AIM_KEY_SPEED = 1.2;

// A setting's value, from the engine's settings (defined in 50-main.js).
TC.setting = function (game, key) {
  const s = game && game.settings;
  return s ? s[key] : undefined;
};

// The command of seat i for one step. seat: { input, mouse (true for the one seat that owns the mouse), name, ... }.
TC.commandFor = function (play, i, seat, dt) {
  const input = seat.input, game = play.game;
  const cmd = {};
  if (!input) return cmd;
  const vp = play.vpOf ? play.vpOf(i) : null;
  // Aim. The mouse is absolute (under the pointer); a stick or the keys move the reticle.
  let aim = play.aims ? play.aims[i] : [0, 0];
  const mouse = seat.mouse && input.lastDevice === 'mouse' && input.pointer && input.pointer();
  if (mouse && vp) {
    const pt = input.pointer();
    aim = [(pt[0] - (vp.x + vp.w / 2)) / (vp.h / 2), -(pt[1] - (vp.y + vp.h / 2)) / (vp.h / 2)];
  } else {
    const ps = TC.setting(game, 'padSpeed') || 1;
    const stick = input.padAim || (input.padMove && (input.padMove[0] || input.padMove[1]) ? input.padMove : null);
    if (stick) {
      const k = TC.tune.player.padSpeed * ps * dt;
      const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2.2);
      aim = [aim[0] + curve(stick[0]) * k, aim[1] - curve(stick[1]) * k];
    }
    const mv = input.move ? input.move() : [0, 0];
    if (mv[0] || mv[1]) aim = [aim[0] + mv[0] * TC.AIM_KEY_SPEED * dt, aim[1] + mv[1] * TC.AIM_KEY_SPEED * dt * -1];
    // Aim assist (pad): the reticle is drawn toward an exposed target it is near (friction and a pull).
    const assist = TC.tune.player.aimAssist * (TC.setting(game, 'aimAssist') === 'Off' ? 0 : 1);
    if (assist > 0 && stick && (Math.abs(stick[0]) + Math.abs(stick[1])) > 0.2) aim = TC.assistAim(play, i, aim, assist, dt);
  }
  aim = [TC.clamp(aim[0], -TC.aspect(vp), TC.aspect(vp)), TC.clamp(aim[1], -1, 1)];
  if (play.aims) play.aims[i] = aim;
  cmd.aim = aim;
  // Fire: held, and pressed on its first step.
  cmd.fire = input.down('fire');
  cmd.firePressed = input.pressed('fire');
  // Cover: hold (the default) or toggle (a press sets it, the next press clears it).
  const mode = TC.setting(game, 'coverMode') || 'Hold';
  if (mode === 'Toggle') {
    if (input.pressed('cover')) play.coverToggle[i] = !play.coverToggle[i];
    cmd.cover = !!play.coverToggle[i];
  } else {
    cmd.cover = input.down('cover');
  }
  cmd.coverPressed = input.pressed('cover');
  cmd.reload = input.pressed('reload');
  cmd.next = input.pressed('next');
  cmd.prev = input.pressed('prev');
  cmd.select = input.pressed('w1') ? 1 : input.pressed('w2') ? 2 : input.pressed('w3') ? 3 : input.pressed('w4') ? 4 : 0;
  return cmd;
};

TC.aspect = function (vp) { return vp ? vp.w / vp.h : 16 / 9; };

// The pad's aim assist: a target within reach of the reticle pulls it in, and the stick slows over it.
TC.assistAim = function (play, i, aim, assist, dt) {
  const sim = play.sim, p = sim.players[i];
  const ras = play.rasters[i];
  if (!ras) return aim;
  let best = null, bd = Infinity;
  for (const e of sim.enemies) {
    if (!e.alive || !e.exposed || e.role === 'civilian') continue;
    const s = ras.project([e.x, e.y, 14 * (e.size || 1)]);
    if (!s) continue;
    const vx = (s[0] - ras.cxp) / (ras.h / 2), vy = -(s[1] - ras.cyp) / (ras.h / 2);
    const d = Math.hypot(vx - aim[0], vy - aim[1]);
    if (d < bd) { bd = d; best = [vx, vy]; }
  }
  if (!best || bd > 0.12) return aim;
  const k = Math.min(1, assist * 6 * dt);
  return [aim[0] + (best[0] - aim[0]) * k, aim[1] + (best[1] - aim[1]) * k];
};
