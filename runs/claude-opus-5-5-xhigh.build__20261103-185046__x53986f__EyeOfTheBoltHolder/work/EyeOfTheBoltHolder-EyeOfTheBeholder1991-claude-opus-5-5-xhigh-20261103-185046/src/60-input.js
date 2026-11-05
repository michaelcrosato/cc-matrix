/* =====================================================================================
 * 60-input: the action map (a PlayStation pad in its standard mapping, the keys PC crawler players expect, the mouse),
 * Controls (held input -> sim commands, one step buffered), ✕ held to set the Hand down, the right stick's flick turns,
 * idle detection for the attract mode. The arrows and the d-pad always step and turn as well as whatever is bound.
 * ===================================================================================== */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fwd: ['KeyW', 'Numpad8'], back: ['KeyS', 'Numpad5', 'Numpad2'], strafeL: ['KeyA', 'Numpad4'], strafeR: ['KeyD', 'Numpad6'], turnL: ['KeyQ', 'Numpad7'], turnR: ['KeyE', 'Numpad9'],
  use: ['KeyF', 'Pad0'], putDown: ['KeyH'], throw: ['KeyG', 'Pad1'], strike: ['Space', 'Pad2'],
  selPrev: ['Pad4'], selNext: ['Tab', 'Pad5'], handMain: ['Pad7'], handOff: ['Pad6'],
  party: ['KeyI', 'Pad3'], camp: ['KeyC', 'Pad10'], examine: ['KeyX', 'Pad11'], map: ['KeyM', 'Pad8'], journal: ['KeyJ'],
  m1: ['Digit1'], m2: ['Digit2'], m3: ['Digit3'], m4: ['Digit4'], m5: ['Digit5'], m6: ['Digit6'], shift: ['ShiftLeft', 'ShiftRight'],
  // menus (not shown on the Controls screen: they follow the play actions' buttons)
  mAlt: ['KeyU', 'Pad2'], mTri: ['KeyR', 'Pad3'], mL: ['KeyQ', 'PageUp', 'Pad4'], mR: ['KeyE', 'PageDown', 'Pad5'], mR2: ['KeyV', 'Pad7'], mL2: ['KeyB', 'Pad6'],
  rclick: ['Mouse2'], mclick: ['Mouse1'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
B.KEYS = KEYS;
B.CONTROL_NAMES = { fwd: 'Step forward', back: 'Step back', strafeL: 'Step left', strafeR: 'Step right', turnL: 'Turn left', turnR: 'Turn right', use: 'Use / take / place', putDown: 'Put the Hand down',
  throw: 'Throw the Hand', strike: 'Party Strike', selPrev: 'Previous member', selNext: 'Next member', handMain: 'Main hand', handOff: 'Off hand', party: 'Party', camp: 'Camp', examine: 'Examine', map: 'Map', journal: 'Journal',
  up: false, down: false, left: false, right: false, m1: false, m2: false, m3: false, m4: false, m5: false, m6: false, shift: false, mAlt: false, mTri: false, mL: false, mR: false, mR2: false, mL2: false, rclick: false, mclick: false };
/** the mouse buttons that do things in the view (shown as the mouse's own badge when the mouse was used last) */
B.MOUSE_ACT = { use: 'L', strike: 'R', examine: 'M' };
const Controls = {
  holdT: 0, held0: false, putFired: false, rArm: true, rRep: 0, createHeld: false, optInCreate: false, lastMove: null,
  /** read the player's input for the play scene; returns sim commands (the UI screens read their own) */
  read(dt) {
    const I = game.input, out = [], P = S.party, H = I.held;
    const has = c => H.has(c);
    // Create (the map) acts on release, unless Options went down while it was held (the hub's corner bar)
    if (has('Pad8')) { this.createHeld = true; if (has('Pad9')) this.optInCreate = true; }
    else if (this.createHeld) { this.createHeld = false; if (!this.optInCreate) out.push({ ui: 'map' }); this.optInCreate = false; }
    if (I.pressed('map') && !has('Pad8')) out.push({ ui: 'map' });
    if (I.pressed('party')) out.push({ ui: 'party' });
    if (I.pressed('camp')) out.push({ ui: 'camp' });
    if (I.pressed('journal')) out.push({ ui: 'journal' });
    if (I.pressed('examine') || I.pressed('mclick')) out.push({ c: 'examine' });
    // movement: the left stick and WASD step and strafe; the d-pad, the arrows' sides, Q E and the right stick turn
    const pm = I.padMove || [0, 0], rx = (I.padAxes && I.padAxes[2]) || 0;
    const dn = a => I.down(a) || I.pressed(a);   // (a tap shorter than a frame still counts)
    const fwd = dn('fwd') || has('ArrowUp') || has('Pad12') || (I.pressed('up') && !I.down('back')) || pm[1] < -.5, back = dn('back') || has('ArrowDown') || has('Pad13') || (I.pressed('down') && !dn('fwd')) || pm[1] > .5;
    const sl = dn('strafeL') || pm[0] < -.5, sr = dn('strafeR') || pm[0] > .5;
    const tl = dn('turnL') || has('ArrowLeft') || has('Pad14'), tr = dn('turnR') || has('ArrowRight') || has('Pad15');
    let flick = 0; if (Math.abs(rx) > .6) { if (this.rArm || (this.rRep -= dt) <= 0) { flick = Math.sign(rx); this.rArm = false; this.rRep = .35; } } else { this.rArm = true; this.rRep = 0; }
    const pressedMove = ['fwd', 'back', 'strafeL', 'strafeR', 'turnL', 'turnR', 'up', 'down', 'left', 'right'].some(a => I.pressed(a));
    let mv = null;
    if (flick) mv = { c: 'turn', s: flick };
    else if (fwd) mv = { c: 'move', d: 'f' }; else if (back) mv = { c: 'move', d: 'b' };
    else if (tl) mv = { c: 'turn', s: -1 }; else if (tr) mv = { c: 'turn', s: 1 };
    else if (sl) mv = { c: 'move', d: 'l' }; else if (sr) mv = { c: 'move', d: 'r' };
    // a press while a step tweens is buffered (the sim keeps the last); a held direction repeats as each step ends
    if (mv && (!P.tw || pressedMove) && !(P.queued && P.tw)) out.push(mv);
    // ✕: a tap uses; held 0.4 s it sets the Hand down. F uses at once; H sets down
    if (has('Pad0')) { this.holdT += dt; if (!this.held0) { this.held0 = true; this.putFired = false; } if (this.holdT >= .4 && !this.putFired && P.hand) { this.putFired = true; out.push({ c: 'putDown' }); } }
    else { if (this.held0 && !this.putFired) out.push({ c: 'use' }); this.held0 = false; this.holdT = 0; }
    if (I.pressed('use') && !has('Pad0')) out.push({ c: 'use' });
    if (I.pressed('putDown')) out.push({ c: 'putDown' });
    if (I.pressed('throw')) out.push({ c: 'throw' });
    if (I.pressed('strike') || I.pressed('rclick') && UI.inView()) out.push({ c: 'strike' });
    if (I.pressed('selPrev')) out.push({ c: 'select', m: (P.sel + P.members.length - 1) % P.members.length });
    if (I.pressed('selNext')) out.push({ c: 'select', m: (P.sel + (I.down('shift') ? P.members.length - 1 : 1)) % P.members.length });
    if (I.pressed('handMain')) out.push({ c: 'hand', m: P.sel, h: 'main' });
    if (I.pressed('handOff')) out.push({ c: 'hand', m: P.sel, h: 'off' });
    for (let i = 0; i < 6; i++) if (I.pressed('m' + (i + 1)) && P.members[UI.memberAtPlace(i)]) { const mi = UI.memberAtPlace(i); out.push({ c: 'select', m: mi }); out.push({ c: 'hand', m: mi, h: I.down('shift') ? 'off' : 'main' }); }
    return out;
  }
};
B.Controls = Controls;
/** idle: no action, held code, stick or pointer movement (the attract mode starts after 10 s of this) */
const Idle = {
  t: 0, last: null,
  step(dt) {
    const I = game.input, pt = I.pointer && I.pointer();
    const moved = pt && this.last && Math.hypot(pt[0] - this.last[0], pt[1] - this.last[1]) > 4;
    if (pt) this.last = pt.slice();
    const stick = Math.hypot(...(I.padMove || [0, 0])) > .3 || (I.padAxes || []).some((v, i) => i < 4 && Math.abs(v) > .3);
    const key = B._keyAt !== this.keyAt; this.keyAt = B._keyAt;
    if (I.anyPressed() || I.held.size || stick || moved || I.clicked() || key) this.t = 0; else this.t += dt;
    return this.t;
  },
  reset() { this.t = 0; }
};
B.Idle = Idle;
