// ---- input: presets, the preset-sync hook (engine patch P1), contestant intent, the idle detector, touch-only ----
// A preset lists every action it uses, the menu's own included. Arrows aim in play and move the focus in menus.
const MASH_MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM', 'Pad3'] };
const MASH_PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.MASH_MENU = MASH_MENU; MT.MASH_PLAY = MASH_PLAY;
const CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

/** the preset every player should use now: the menu's while the pause menu or one of our overlays is open */
function wantedPreset(g) {
  if (g.paused || MT.overlay.open || (g.shell && g.shell.screen)) return MASH_MENU;
  const s = g.scene; return (s && s.input && typeof s.input === 'object') ? s.input : MASH_MENU;
}
function installPresetHook() {
  E.HOOKS.input.push(g => {
    if (g !== game) return;
    const want = wantedPreset(g);
    for (const p of g.players) if (p.preset !== want) p.use(want);
  });
}

/** a contestant's intent this step from an input: { move, aim, fire, slide, bomb, showboat } (move and aim on the ground) */
function intentFrom(I, c) {
  const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'none' };
  if (!I || !I.map.fire) return out;   // (a menu preset: no play actions)
  const m = I.move(), d = game.view.screenDirToGround(m[0], m[1]), l = Math.hypot(d[0], d[1]);
  if (l > 1) { d[0] /= l; d[1] /= l; }
  out.move = [d[0], d[1]];
  const s = game.settings;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]);
    out.aim = Math.atan2(a[1], a[0]); out.fire = s.autoFire !== false || I.down('fire'); out.aimSrc = 'pad';
  } else {
    const ax = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), ay = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (ax || ay) { const a = game.view.screenDirToGround(ax, ay); out.aim = Math.atan2(a[1], a[0]); out.fire = true; out.aimSrc = 'keys'; }
    else if (I === game.input && I.mouse && I.mouse.active && (I.lastDevice === 'mouse' || I.clock - I.mouse.t < 2)) {
      const mg = game.mouseGround();
      if (mg) { out.aim = Math.atan2(mg[1] - c.y, mg[0] - c.x); out.fire = I.down('fire'); out.aimSrc = 'mouse'; }
    } else if (I.down('fire')) { out.aim = c.lastAim !== undefined ? c.lastAim : c.facing; out.fire = true; out.aimSrc = 'trigger'; }
  }
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
}
MT.intentFrom = intentFrom;

// ---------------------------------------------------------------------------------------------------------------
// The idle detector: any key, mouse button, mouse move over 8 px, wheel, touch, gamepad button or stick past .5, on any
// device (our own clock: E.Arcade.attract reads player 1 only). Tests use input.tap / input.feed, seen through anyPressed.
const IDLE = MT.idle = { t: 0, last: 0, mx: null, my: null, padPrev: '', inputCount: 0 };
IDLE.reset = () => { IDLE.t = 0; IDLE.inputCount++; };
function installIdle() {
  if (!HAS_DOM) return;
  const kick = () => IDLE.reset();
  window.addEventListener('keydown', e => { kick(); MT.touch.keyed = true; }, true);
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('wheel', e => { kick(); MT.wheelAcc = (MT.wheelAcc || 0) + Math.sign(e.deltaY); }, { capture: true, passive: true });
  window.addEventListener('touchstart', kick, { capture: true, passive: true });
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (IDLE.mx === null) { IDLE.mx = e.clientX; IDLE.my = e.clientY; return; }
    if (Math.hypot(e.clientX - IDLE.mx, e.clientY - IDLE.my) > 8) { IDLE.mx = e.clientX; IDLE.my = e.clientY; kick(); if (game && game.input) game.input.lastDevice = 'mouse'; }
  }, true);
  window.addEventListener('gamepadconnected', () => { kick(); MT.touch.pad = true; });
}
/** each step: a gamepad pressed, or any player's action pressed (tests' taps), resets the clock; else it counts up */
function idleStep(dt) {
  let any = false;
  for (const p of game.players) if (p.anyPressed() || p.clicked()) any = true;
  if (HAS_DOM && navigator.getGamepads) {
    let pads = []; try { pads = Array.from(navigator.getGamepads() || []); } catch (e) { /* blocked */ }
    let sig = '';
    for (const p of pads) {
      if (!p || p.connected === false) continue;
      MT.touch.pad = true;
      const b = p.buttons.map(x => x.pressed ? 1 : 0).join(''), ax = p.axes.some(v => Math.abs(v) > .5) ? 'A' : '';
      sig += p.index + b + ax + ';';
      if (b.includes('1') || ax) any = any || sig !== IDLE.padPrev;
    }
    IDLE.padPrev = sig;
  }
  if (any) IDLE.reset(); else IDLE.t += dt;
}
MT.idleStep = idleStep;
/** the mouse wheel since the last read: -1, 0 or +1 */
MT.wheelTake = () => { const v = MT.wheelAcc || 0; MT.wheelAcc = 0; return Math.sign(v); };

// ---------------------------------------------------------------------------------------------------------------
// Touch-only devices: no touch controls; the title says "Controller or keyboard required" (lifted by a key or a pad)
MT.touch = { keyed: false, pad: false, forced: null };
MT.touchOnly = () => {
  if (MT.touch.forced !== null) return MT.touch.forced && !MT.touch.keyed && !MT.touch.pad;
  if (!HAS_DOM) return false;
  if (MT.touch.keyed || MT.touch.pad) return false;
  let fine = true; try { fine = window.matchMedia('(any-pointer: fine)').matches; } catch (e) { /* none */ }
  let pads = false; try { pads = Array.from(navigator.getGamepads ? navigator.getGamepads() || [] : []).some(p => p && p.connected !== false); } catch (e) { /* none */ }
  return (navigator.maxTouchPoints || 0) > 0 && !fine && !pads;
};
