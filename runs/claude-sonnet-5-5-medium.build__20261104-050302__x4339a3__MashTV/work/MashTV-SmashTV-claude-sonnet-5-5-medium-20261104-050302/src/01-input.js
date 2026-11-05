// MASH TV: input presets, the preset-sync hook (P1), contestant intent, idle detection, touch-only detection.
const MASH_MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM'] };
const MASH_PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.MENU = MASH_MENU; MT.PLAY = MASH_PLAY;
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)', aimDown: 'Fire down (keyboard)',
  aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

MT.overlay = { open: 0 };           // >0 while one of our overlays is up (dev panel, session overlay, map): inputs use the menu preset
MT.wantPlayPreset = () => !!(MT.game && MT.game.sceneName === 'play' && !MT.game.paused && !MT.overlay.open);

MT.installInputHook = function (game) {
  E.HOOKS.input.push(g => {
    if (g !== game) return;
    const want = MT.wantPlayPreset() ? MASH_PLAY : MASH_MENU;
    for (const p of g.players) if (p.preset !== want) p.use(want);
  });
};

// ---- idle (any input on any device) -------------------------------------------------------------------------------
const idle = MT.idle = { t: 0, flag: false, mx: null, my: null, padSeen: false };
idle.poke = () => { idle.flag = true; };
idle.hook = function () {
  if (!MT.hasDOM) return;
  const on = (t, n, f) => t.addEventListener(n, f, { passive: true, capture: true });
  on(window, 'keydown', () => { idle.flag = true; MT.keyEver = true; touchLift(); });
  on(window, 'mousedown', () => { idle.flag = true; });
  on(window, 'pointerdown', e => { idle.flag = true; if (e.pointerType === 'touch') idle.touched = true; });
  on(window, 'wheel', e => { idle.flag = true; MT.wheel = (MT.wheel || 0) + (e.deltaY || 0); });
  on(window, 'touchstart', () => { idle.flag = true; });
  on(window, 'mousemove', e => { if (idle.mx === null) { idle.mx = e.clientX; idle.my = e.clientY; return; } if (Math.hypot(e.clientX - idle.mx, e.clientY - idle.my) > 8) { idle.flag = true; idle.mx = e.clientX; idle.my = e.clientY; } });
  on(window, 'gamepadconnected', () => { idle.flag = true; MT.padEver = true; touchLift(); });
};
function touchLift() { if (MT.touchOnly) { MT.touchOnly = false; MT.emit('touchlift'); } }
// poll gamepads (buttons / sticks past .5) + the engine's own pressed flags; returns true if any input happened this step
idle.step = function (game, dt) {
  let any = idle.flag; idle.flag = false;
  for (const p of game.players) if (p.anyPressed && p.anyPressed()) { any = true; MT.lastIn = p; }
  if (MT.hasDOM && navigator.getGamepads) {
    try { for (const p of navigator.getGamepads()) if (p && p.connected) { MT.padEver = true; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) { any = true; touchLift(); } } } catch (e) { /* blocked */ }
  }
  if (any) idle.t = 0; else idle.t += dt;
  return any;
};
// touch-only: coarse pointer, no fine pointer, no pad, no key yet
MT.detectTouchOnly = function () {
  if (!MT.hasDOM) return false;
  let fine = true; try { fine = matchMedia('(any-pointer: fine)').matches; } catch (e) { /* */ }
  return (navigator.maxTouchPoints > 0) && !fine && !MT.padEver && !MT.keyEver;
};

// ---- intent -----------------------------------------------------------------------------------------------------------
// input -> { move:[gx,gy], aim: angle|null, fire, slide, bomb, showboat, mouse }
MT.intentFrom = function (input, c, world) {
  const game = MT.game, I = input, out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: '' };
  const m = I.move(); if (m[0] || m[1]) out.move = game.view.screenDirToGround(m[0], m[1]);
  const L = Math.hypot(out.move[0], out.move[1]); if (L > 1) { out.move[0] /= L; out.move[1] /= L; }
  const pa = I.padAim;
  if (pa && Math.hypot(pa[0], pa[1]) > .35) {
    const d = game.view.screenDirToGround(pa[0], pa[1]); out.aim = Math.atan2(d[1], d[0]); out.fire = !!game.settings.autoFire || I.down('fire'); out.aimSrc = 'pad';
  } else {
    const ax = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), ay = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (ax || ay) { const d = game.view.screenDirToGround(ax, ay); out.aim = Math.atan2(d[1], d[0]); out.fire = true; out.aimSrc = 'keys'; }
    else if (I.lastDevice === 'mouse' || (I.mouse && I.mouse.active && I.clock - I.mouse.t < 2 && I.lastDevice !== 'gamepad')) {
      const g = (I === game.input) ? game.mouseGround() : null;
      if (g && c) { out.aim = Math.atan2(g[1] - c.y, g[0] - c.x); out.aimSrc = 'mouse'; out.mouseAt = g; }
      out.fire = I.down('fire');
    } else if (I.down('fire')) out.fire = true;
  }
  if (out.aim !== null && out.aimSrc === 'pad' && game.settings.aimAssist && world) out.aim = MT.aimAssist(world, c, out.aim);
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
};
MT.aimAssist = function (world, c, aim) {
  let best = null, bd = 170;
  for (const e of world.enemies) { if (!e.alive || e.noTarget) continue; const d = MT.dist(c, e); if (d > bd) continue; const da = Math.abs(E.angDiff(aim, MT.angTo(c, e))); if (da < .175) { best = e; bd = d; } }
  return best ? aim + E.angDiff(aim, MT.angTo(c, best)) * .5 : aim;
};
