/* INPUT: the action map (pad, keys, mouse; every play action rebindable), the play controls turned into commands, the
 * sticks read raw (the left moves and strafes, the right turns), and idle detection for the attract mode. */
B.INPUT = {
  fwd: ['KeyW', 'ArrowUp', 'Numpad8', 'Pad12'], back: ['KeyS', 'ArrowDown', 'Numpad5', 'Numpad2', 'Pad13'],
  strafeL: ['KeyA', 'Numpad4'], strafeR: ['KeyD', 'Numpad6'], turnL: ['KeyQ', 'ArrowLeft', 'Numpad7', 'Pad14'], turnR: ['KeyE', 'ArrowRight', 'Numpad9', 'Pad15'],
  use: ['KeyF', 'Pad0'], putDown: ['KeyH'], throw: ['KeyG', 'Pad1'], strike: ['Space', 'Pad2', 'Mouse2'],
  selPrev: ['Pad4'], selNext: ['Tab', 'Pad5'], handMain: ['KeyR', 'Pad7'], handOff: ['KeyT', 'Pad6'],
  party: ['KeyI', 'Pad3'], camp: ['KeyC', 'Pad10'], examine: ['KeyX', 'Pad11', 'Mouse1'], map: ['KeyM', 'Pad8'], journal: ['KeyJ'],
  m1: ['Digit1'], m2: ['Digit2'], m3: ['Digit3'], m4: ['Digit4'], m5: ['Digit5'], m6: ['Digit6'],
  // menus
  up: ['ArrowUp', 'KeyW', 'Pad12'], down: ['ArrowDown', 'KeyS', 'Pad13'], left: ['ArrowLeft', 'KeyA', 'Pad14'], right: ['ArrowRight', 'KeyD', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'], alt: ['Pad2', 'KeyU', 'Mouse2'], alt2: ['Pad3', 'KeyV'], tabL: ['Pad4', 'PageUp'], tabR: ['Pad5', 'Tab', 'PageDown'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
};
B.ACTION_NAMES = { fwd: 'Step forward', back: 'Step back', strafeL: 'Step left', strafeR: 'Step right', turnL: 'Turn left', turnR: 'Turn right', use: 'Use / take', putDown: 'Put down', throw: 'Throw', strike: 'Party Strike', selPrev: 'Previous member', selNext: 'Next member', handMain: 'Main hand', handOff: 'Off hand', party: 'Party', camp: 'Camp', examine: 'Examine', map: 'Map', journal: 'Journal', m1: false, m2: false, m3: false, m4: false, m5: false, m6: false, up: false, down: false, left: false, right: false, alt: false, alt2: false, tabL: false, tabR: false };
B.shift = false;
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  addEventListener('keydown', e => { B.shift = e.shiftKey; B.rawAny = true; if (B.UI && B.UI.textEntry && B.UI.textEntry(e)) e.preventDefault(); });
  addEventListener('pointerdown', () => { B.rawAny = true; });
  addEventListener('keyup', e => { B.shift = e.shiftKey; });
  addEventListener('wheel', e => { if (B.UI) B.UI.wheel = (B.UI.wheel || 0) + Math.sign(e.deltaY); }, { passive: true });
}
/** the controls in play: a buffered move while a step runs, held moves repeat, the right stick flicks a turn */
B.Controls = {
  rsArm: true, rsT: 0, holdUse: 0, usedHold: false, lsT: 0, lsDir: null,
  read(game) {
    const I = game.input, cmds = [], P = B.S.party;
    const pressed = a => I.pressed(a), down = a => I.down(a);
    // the left stick: past halfway it steps (up/down) or strafes (left/right), repeating as each step ends
    const ax = I.padAxes || [], dz = Math.max(.3, I.deadzone || .18), lx = Math.abs(ax[0] || 0) > dz ? ax[0] : 0, ly = Math.abs(ax[1] || 0) > dz ? ax[1] : 0;
    let stick = null; if (Math.abs(ly) > .5 && Math.abs(ly) >= Math.abs(lx)) stick = ly < 0 ? 'f' : 'b'; else if (Math.abs(lx) > .5) stick = lx < 0 ? 'l' : 'r';
    // the right stick: a flick turns, re-arming at the centre, repeating every 0.35 s held
    const rx = ax[2] || 0;
    if (Math.abs(rx) > .6) { if (this.rsArm || (this.rsT -= 1 / 120) <= 0) { cmds.push({ c: 'turn', s: rx < 0 ? -1 : 1 }); this.rsArm = false; this.rsT = .35; } } else if (Math.abs(rx) < .3) this.rsArm = true;
    const moveKey = pressed('fwd') ? 'f' : pressed('back') ? 'b' : pressed('strafeL') ? 'l' : pressed('strafeR') ? 'r' : null;
    const held = down('fwd') ? 'f' : down('back') ? 'b' : down('strafeL') ? 'l' : down('strafeR') ? 'r' : stick;
    if (moveKey) cmds.push({ c: 'move', d: moveKey });
    else if (held && !P.tween && !P.queued) cmds.push({ c: 'move', d: held });
    if (pressed('turnL')) cmds.push({ c: 'turn', s: -1 }); else if (pressed('turnR')) cmds.push({ c: 'turn', s: 1 });
    else if (!P.tween && (down('turnL') || down('turnR')) && (this.turnT = (this.turnT || 0) - 1 / 120) <= 0) { cmds.push({ c: 'turn', s: down('turnL') ? -1 : 1 }); this.turnT = .3; }
    if (!down('turnL') && !down('turnR')) this.turnT = .35;
    // ✕: a tap uses; a hold (0.4 s) with something in the Hand puts it down
    if (pressed('use')) { this.holdUse = 0; this.usedHold = false; }
    if (down('use') && P.hand && I.lastDevice === 'gamepad') { this.holdUse += 1 / 120; if (this.holdUse >= .4 && !this.usedHold) { this.usedHold = true; cmds.push({ c: 'putDown' }); } }
    if (I.released('use') && !this.usedHold) cmds.push({ c: 'use' });
    else if (pressed('use') && I.lastDevice !== 'gamepad') { /* keys act on release too */ }
    if (pressed('putDown')) cmds.push({ c: 'putDown' });
    if (pressed('throw')) cmds.push({ c: 'throw' });
    if (pressed('strike')) cmds.push({ c: 'strike' });
    const n = P.members.length;
    if (pressed('selPrev')) cmds.push({ c: 'select', m: (P.selected + n - 1) % n });
    if (pressed('selNext')) cmds.push({ c: 'select', m: (P.selected + (B.shift ? n - 1 : 1)) % n });
    if (pressed('handMain')) cmds.push({ c: 'hand', m: P.selected, h: 'main' });
    if (pressed('handOff')) cmds.push({ c: 'hand', m: P.selected, h: 'off' });
    for (let i = 0; i < 6; i++) if (pressed('m' + (i + 1)) && i < n) { cmds.push({ c: 'select', m: i }); cmds.push({ c: 'hand', m: i, h: B.shift ? 'off' : 'main' }); }
    if (pressed('examine')) cmds.push({ c: 'examine' });
    return cmds;
  }
};
/** any input at all (the attract mode's idle clock and its exit): an action, a held code, a stick, the pointer */
B.anyInput = (game, last) => {
  const I = game.input; if (B.rawAny) { B.rawAny = false; return true; } if (I.anyPressed()) return true;
  if (I.held && I.held.size) { for (const c of I.held) if (!c.startsWith('Act:')) return true; }
  const ax = I.padAxes || []; if (ax.some(v => Math.abs(v) > .3)) return true;
  if (I.clicked()) return true;
  const p = I.pointer(); if (p && last.p && Math.hypot(p[0] - last.p[0], p[1] - last.p[1]) > 4) { last.p = p; return true; } if (p && !last.p) last.p = p;
  return false;
};
