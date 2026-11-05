// ---------------------------------------------------------------- input: presets, the preset-sync hook, intents, idle, touch-only
// A preset lists every action it uses. Arrows aim in play, navigate in menus: two presets, switched by a hook (engine patch P1).
MT.MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM', 'Pad3'] };
MT.PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

MT.overlay = { open: false };   // one of our own overlays (dev panel, map, how-to, session menu) is open in play
MT.wantPreset = () => {
  const g = MT.game, s = g && g.scene; if (!s) return MT.MENU;
  if (g.paused || MT.overlay.open || (g.shell && g.shell.screen)) return MT.MENU;
  return s.input === MT.PLAY || s.playInput ? MT.PLAY : MT.MENU;
};
MT.syncPresets = (g) => {
  const want = MT.wantPreset();
  for (const p of g.players) if (p.preset !== want) { p.use(want); }
};
E.HOOKS.input.push((g) => { if (g === MT.game) { MT.syncPresets(g); MT.idle.tick(g); } });

// ---------------------------------------------------------------- intents: what a contestant wants this step
MT.NOINTENT = () => ({ move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, start: false });
MT.intentFrom = (I, c, W) => {
  const g = MT.game, it = MT.NOINTENT();
  if (!I || MT.overlay.open && I === g.input) return it;
  const m = I.move(), d = g.view.screenDirToGround(m[0], m[1]);
  it.move = [d[0], d[1]];
  let aim = null, fire = false, fromPad = false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const a = g.view.screenDirToGround(I.padAim[0], I.padAim[1]); aim = Math.atan2(a[1], a[0]); fire = g.settings.autoFire !== false; fromPad = true;
  } else if (I.down('aimUp') || I.down('aimDown') || I.down('aimLeft') || I.down('aimRight')) {
    const sx = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), sy = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (sx || sy) { const a = g.view.screenDirToGround(sx, sy); aim = Math.atan2(a[1], a[0]); fire = true; }
  } else if (I === g.input && I.mouse && (I.lastDevice === 'mouse' || (I.mouse.active && I.clock - (I.mouse.t || -99) < 2))) {
    const mg = g.mouseGround();
    if (mg && c) { aim = Math.atan2(mg[1] !== undefined ? mg[1] - c.y : mg.y - c.y, mg[0] !== undefined ? mg[0] - c.x : mg.x - c.x); }
    fire = I.down('fire');
  }
  if (aim === null) { fire = I.down('fire'); if (c) aim = fire ? (c.aim !== undefined ? c.aim : c.facing) : null; }
  else if (I.down('fire')) fire = true;
  if (aim !== null && fromPad && W && g.settings.aimAssist !== false && c) aim = MT.aimAssist(c, aim, W);
  it.aim = aim; it.fire = fire;
  it.slide = I.pressed('slide'); it.bomb = I.pressed('bomb'); it.showboat = I.pressed('showboat'); it.start = I.pressed('start');
  return it;
};
MT.aimAssist = (c, aim, W) => {
  let best = null, bd = 1e9;
  for (const e of W.enemies) {
    if (e.dead || e.entering) continue;
    const d = MT.dist(c, e); if (d > 170) continue;
    const da = Math.abs(MT.angDiff(aim, MT.ang(c, e))); if (da > .1745) continue;
    if (da * 100 + d < bd) { bd = da * 100 + d; best = e; }
  }
  return best ? aim + MT.angDiff(aim, MT.ang(c, best)) * .5 : aim;
};

// ---------------------------------------------------------------- idle: any input on any device (the attract mode's clock)
MT.idle = {
  t: 0, _poke: false, _last: null, _mx: null, _my: null, wired: false,
  poke() { this._poke = true; },
  wire() {
    if (this.wired || typeof window === 'undefined' || !window.addEventListener) return; this.wired = true;
    const p = () => this.poke();
    window.addEventListener('keydown', p, true); window.addEventListener('mousedown', p, true); window.addEventListener('wheel', p, { capture: true, passive: true });
    window.addEventListener('touchstart', p, { capture: true, passive: true }); window.addEventListener('pointerdown', p, true);
    window.addEventListener('mousemove', e => { if (this._mx === null) { this._mx = e.clientX; this._my = e.clientY; return; } if (Math.hypot(e.clientX - this._mx, e.clientY - this._my) > 8) { this._mx = e.clientX; this._my = e.clientY; p(); } }, true);
  },
  padActive() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    let pads; try { pads = navigator.getGamepads(); } catch (e) { return false; }
    for (const pd of pads || []) { if (!pd) continue; for (const b of pd.buttons || []) if (b && (b.pressed || b.value > .5)) return true; for (const a of pd.axes || []) if (Math.abs(a) > .5) return true; }
    return false;
  },
  tick(g) {
    this.wire();
    let any = this._poke || this.padActive(); this._poke = false;
    if (!any) for (const p of g.players) if (p.anyPressed() || (p.clicked && p.clicked())) { any = true; break; }
    this.fired = any;
    if (any) { this.t = 0; MT.touchOnlyLift && MT.touchOnlyLift('input'); } else this.t += 1 / 120;
  }
};

// ---------------------------------------------------------------- touch-only devices: no touch controls, a notice instead
MT.touch = { only: false, lifted: false };
MT.detectTouch = () => {
  if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') { MT.touch.only = false; return false; }
  let fine = false; try { fine = matchMedia('(any-pointer: fine)').matches; } catch (e) { fine = false; }
  let pad = false; try { pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { pad = false; }
  MT.touch.only = !MT.touch.lifted && (navigator.maxTouchPoints || 0) > 0 && !fine && !pad;
  return MT.touch.only;
};
MT.touchOnlyLift = (why) => {
  if (!MT.touch.only) return;
  if (why === 'input') {   // only a key or a pad lifts it, never a tap
    const g = MT.game, I = g && g.input; if (!I || I.lastDevice === 'touch') return;
    if (I.lastDevice !== 'keyboard' && I.lastDevice !== 'gamepad') return;
  }
  MT.touch.only = false; MT.touch.lifted = true;
};
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('gamepadconnected', () => MT.touchOnlyLift('pad'));
  window.addEventListener('keydown', () => { if (MT.touch.only) { MT.touch.only = false; MT.touch.lifted = true; } }, true);
}
