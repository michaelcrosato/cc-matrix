/* ---- INPUT: the action map (every action rebindable on the standard Controls screen), the player's intent (the hero
 * reads only intents: the player's, the autopilot's or a test's), device and touch-only detection, and the "any input"
 * clock that starts attract mode. In play the d-pad does not move the hero: it picks tools ---- */
B.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  jump: ['Space', 'Pad0'], crouch: ['KeyC', 'Pad1'], attack: ['Mouse0', 'KeyJ', 'Pad2'], interact: ['KeyF', 'Pad3'],
  block: ['Mouse2', 'KeyK', 'Pad4'], grapple: ['KeyG', 'Mouse1', 'Pad5'], focus: ['Tab', 'Pad6'], useTool: ['KeyR', 'Pad7'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'], toolPrev: ['BracketLeft', 'Pad14'], toolNext: ['BracketRight', 'Pad15'],
  heal: ['KeyH', 'Pad13'], lure: ['KeyV', 'Pad12'], camLeft: ['KeyQ'], camRight: ['KeyE'], camReset: ['KeyX', 'Pad11'],
  objectives: ['KeyM', 'Pad8'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const CONTROL_NAMES = { jump: 'Jump / climb', crouch: 'Crouch', attack: 'Strike / Silent Cut', interact: 'Interact', block: 'Block / parry',
  grapple: 'Grappling hook', focus: 'Ki Focus', useTool: 'Use tool', sprint: 'Sprint', toolPrev: 'Previous tool', toolNext: 'Next tool',
  heal: 'Eat rice ball', lure: 'Whistle', camLeft: 'Turn camera left', camRight: 'Turn camera right', camReset: 'Reset camera',
  objectives: 'Objectives', tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false };

/* ---- the "any input" clock: keys, buttons, a stick past the dead zone, a mouse move over 4 px, the wheel, a click or a
 * touch all reset it (attract mode starts after 10 s without any) ---- */
B.lastInput = 0;
B.noteInput = () => { B.lastInput = typeof game !== 'undefined' ? game.real : 0; B.inputSeen = true; };
B.wheel = 0;
B.sawKeyOrPad = false;
if (hasDOM) {
  let mx = null, my = null;
  addEventListener('keydown', () => { B.noteInput(); B.sawKeyOrPad = true; }, true);
  addEventListener('pointerdown', () => B.noteInput(), true);
  addEventListener('touchstart', () => B.noteInput(), { capture: true, passive: true });
  addEventListener('pointermove', e => { if (mx === null || Math.hypot(e.clientX - mx, e.clientY - my) > 4) { if (mx !== null) B.noteInput(); mx = e.clientX; my = e.clientY; } }, true);
  addEventListener('wheel', e => { B.noteInput(); B.wheel += Math.sign(e.deltaY); }, { capture: true, passive: true });
  addEventListener('gamepadconnected', () => { B.sawKeyOrPad = true; B.noteInput(); });
}
/** each step: buttons and sticks count as input too (the DOM events above do not see a gamepad) */
B.pollInput = () => {
  const I = game.input;
  if (I.anyPressed()) B.noteInput();
  const ax = I.padAxes || [];
  for (let i = 0; i < Math.min(4, ax.length); i++) if (Math.abs(ax[i] || 0) > .35) { B.noteInput(); break; }
  if (I.padIndex !== null && I.padIndex !== undefined) B.sawKeyOrPad = true;
};
/** touch-only: no fine pointer, a touch screen, no gamepad and no key pressed yet */
B.touchOnly = () => hasDOM && !B.sawKeyOrPad && !safeMedia('(any-pointer: fine)') && (navigator.maxTouchPoints || 0) > 0;

/** mouse mode: the mouse moved within the last 3 s and no key or stick since (cursor aiming, hover, the camera lean) */
B.mouseMode = () => { const I = game.input; return I.lastDevice === 'mouse' && I.mouse && I.mouse.t !== undefined && I.clock - I.mouse.t < 3; };

const held = (a, pads) => { const I = game.input, codes = I.map[a] || []; for (const c of codes) if (I.held.has(c) && (pads || !/^Pad1[2-5]$/.test(c))) return true; return false; };
/** the player's intent this step (the hero reads nothing else). Movement: the left stick and the keys, never the d-pad */
B.intentFromInput = () => {
  const I = game.input, P = a => I.pressed(a), D = a => I.down(a);
  let sx = 0, sy = 0;
  const ax = I.padAxes || [];
  if (I.padIndex !== null && I.padIndex !== undefined && ax.length >= 2) {
    const x = ax[0] || 0, y = ax[1] || 0, m = Math.hypot(x, y), dz = I.deadzone || .18;
    if (m > dz) { const k = Math.min(1, (m - dz) / (1 - dz)) / m; sx = x * k; sy = y * k; }
  }
  let kx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), ky = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); sx = kx / l; sy = ky / l; }
  const g = game.view.screenDirToGround(sx, sy), len = Math.min(1, Math.hypot(sx, sy)), gl = Math.hypot(g[0], g[1]) || 1;
  const move = len > .05 ? [g[0] / gl * len, g[1] / gl * len] : [0, 0];
  let slot = -1; for (let i = 1; i <= 8; i++) if (P('tool' + i)) slot = i - 1;
  let toolDelta = (P('toolNext') ? 1 : 0) - (P('toolPrev') ? 1 : 0);
  if (B.wheel) { toolDelta += B.wheel > 0 ? 1 : -1; B.wheel = 0; }
  const aim = I.padAim, mm = B.mouseMode();
  const it = { move, walk: len > .05 && len < .55, sprint: D('sprint'), crouchPressed: P('crouch'), crouchDown: D('crouch'),
    jumpPressed: P('jump'), attackPressed: P('attack'), blockDown: D('block'), blockPressed: P('block'),
    interactPressed: P('interact'), interactDown: D('interact'), grapplePressed: P('grapple'), grappleDown: D('grapple'), grappleReleased: I.released('grapple'),
    usePressed: P('useTool'), focusDown: D('focus'), toolDelta, toolSlot: slot, healPressed: P('heal'), lurePressed: P('lure'),
    aimPoint: mm ? game.mouseGround() : null, mouseMode: mm, rstick: aim ? [aim[0], aim[1]] : null, player: true };
  return it;
};
/** an empty intent (cutscenes, menus, the hub's end) */
B.noIntent = () => ({ move: [0, 0], toolDelta: 0, toolSlot: -1, aimPoint: null });
