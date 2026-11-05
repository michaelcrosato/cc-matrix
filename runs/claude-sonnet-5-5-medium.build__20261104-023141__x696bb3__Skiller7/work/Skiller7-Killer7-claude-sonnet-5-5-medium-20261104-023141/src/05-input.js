// Input: the S7 action preset (pad first, keyboard and mouse native) and the intent layer that turns devices into sim intents.
S7.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  go: ['KeyW', 'ArrowUp', 'Pad0', 'PadAxisUp'], turn: ['KeyS', 'ArrowDown', 'Pad1'],
  aim: ['Mouse2', 'Pad6', 'ShiftLeft'], fire: ['Mouse0', 'Pad7', 'KeyJ'], scan: ['Space', 'Pad4', 'KeyQ'], skill: ['KeyE', 'Pad2'], interact: ['KeyF', 'Pad3'],
  ring: ['Tab', 'KeyC', 'Pad5'], heal: ['KeyH', 'Pad11'], reload: ['KeyR', 'Pad10'], map: ['KeyM', 'Pad8'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'], slot7: ['Digit7'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1']
};
S7.CONTROLS = { up: 'Stick up', down: 'Stick down', left: 'Stick left', right: 'Stick right', go: 'Run along the rail', turn: 'Turn about / hockey stop', aim: 'Aim', fire: 'Fire', scan: 'Scan', skill: 'Skill', interact: 'Interact', ring: 'Hold: choose a coat', heal: 'Heal with Red', reload: 'Reload', map: 'Field notes',
  slot1: false, slot2: false, slot3: false, slot4: false, slot5: false, slot6: false, slot7: false, start: false };

S7.intents = function (game, opts = {}) {
  const I = game.input, st = S7.st, mode = st.mode, mv = I.move();
  const aimMode = mode === 'aim', pad = I.padAim;
  const out = {
    stick: mv, go: I.down('go'), turn: I.pressed('turn'), cycle: 0,
    aim: I.down('aim'), fire: I.down('fire'), firePressed: I.pressed('fire'), scan: I.pressed('scan'), skill: I.pressed('skill'), interact: I.pressed('interact'),
    ring: I.down('ring'), heal: I.down('heal'), reload: I.pressed('reload'), map: I.pressed('map'), confirm: I.pressed('confirm'), pick: 0,
    lookMouse: opts.mouse || [0, 0], lookStick: aimMode ? (pad || [mv[0], mv[1]]) : [0, 0], skipScene: I.pressed('start') || I.pressed('cancel'), skipTalk: false
  };
  for (let i = 1; i <= 7; i++) if (I.pressed('slot' + i)) out.pick = i;
  if (I.pressed('left') && mode === 'junction') out.cycle = -1;
  if (mode === 'ring') {
    let v = pad || (I.lastDevice === 'gamepad' ? I.padMove : null);
    if ((!v || Math.hypot(v[0], v[1]) < .4) && opts.pointer) { const W = opts.W, H = opts.H, p = opts.pointer; v = [(p[0] - W / 2) / (H * .3), (p[1] - H / 2) / (H * .3)]; }
    if (!v || Math.hypot(v[0], v[1]) < .4) v = mv;
    out.ringVec = v;
  }
  if (aimMode) out.lookStick = pad || (Math.hypot(mv[0], mv[1]) > .1 ? mv : [0, 0]);
  return out;
};
// a dev-mode or tests helper: a blank intent
S7.noIntent = () => ({ stick: [0, 0], go: false, turn: false, aim: false, fire: false, firePressed: false, scan: false, skill: false, interact: false, ring: false, heal: false, reload: false, map: false, confirm: false, pick: 0, lookMouse: [0, 0], lookStick: [0, 0] });
