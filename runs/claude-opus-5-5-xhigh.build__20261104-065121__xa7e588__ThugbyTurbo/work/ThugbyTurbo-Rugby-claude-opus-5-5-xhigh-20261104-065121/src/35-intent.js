/* ---- INTENTS FROM DEVICES: the preset (pad buttons named by their face: x = ✕ / A, sq = □ / X, ci = ○ / B, tri = △ / Y),
 * the two half-keyboard layouts, and what one seat's device asks this step ---- */
const KEYS = TT.KEYS = Object.assign({}, E.Input.DEFAULT);
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
Object.assign(KEYS, {
  x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], ci: ['KeyC', 'Pad1'], tri: ['KeyR', 'Pad3'],
  l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], turbo: ['ShiftLeft', 'Pad7'], view: ['KeyV', 'Pad11'],
  mouseL: ['Mouse0'], mouseR: ['Mouse2'], dev: ['Backquote']
});
Object.defineProperty(KEYS, 'halves', { enumerable: false, value: {
  left: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], turbo: ['ShiftLeft'], x: ['Space'], sq: ['KeyF'], ci: ['KeyC'], tri: ['KeyR'], l1: ['KeyQ'], r1: ['KeyE'], view: ['KeyV'], start: ['Digit1'], pause: ['Escape', 'Digit1'], confirm: ['Space', 'Enter'], cancel: ['KeyC', 'Escape'], mouseL: ['Mouse0'], mouseR: ['Mouse2'], dev: ['Backquote'] },
  right: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], turbo: ['Comma', 'Numpad0'], x: ['Period', 'Numpad1'], sq: ['Slash', 'Numpad2'], ci: ['Semicolon', 'Numpad3'], tri: ['Quote', 'Numpad6'], l1: ['KeyK', 'Numpad4'], r1: ['KeyL', 'Numpad5'], view: ['Numpad8'], start: ['Digit2', 'NumpadEnter'], pause: ['Backspace', 'Digit2'], confirm: ['Period', 'NumpadEnter'], cancel: ['Semicolon', 'Backspace'], mouseL: [], mouseR: [], dev: [] }
} });
TT.ACTION_NAMES = { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', view: 'Camera view', mouseL: false, mouseR: false, dev: false };
const PBTN = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];
/** what a seat's device asks this step: the stick in world directions, the buttons, the mouse in the world */
TT.readIntent = (seat, game, m, ctx = {}) => {
  const In = seat.input, I = seat.I || (seat.I = TT.emptyIntent());
  I.cmd = null;
  const mv = In.move();
  let mx = mv[0], my = mv[1];
  if (game.view && (game.view.yawDeg || 0) !== 0 && game.view.screenDirToGround) { const d = game.view.screenDirToGround(mx, my); mx = d[0]; my = d[1]; }
  I.mx = mx; I.my = my; I.rawX = mv[0]; I.rawY = mv[1];
  for (const k of PBTN) { if (In.pressed(k)) I.pr[k] = true; I.hd[k] = In.down(k); I.rl[k] = In.released(k); }
  for (const k of ['up', 'down', 'left', 'right']) if (In.pressed(k)) I.pr[k] = true;
  // turbo: held, or toggled (Settings, Game)
  if (game.settings.turboMode === 'Toggle') { if (In.pressed('turbo')) seat.turboT = !seat.turboT; I.turbo = !!seat.turboT; } else I.turbo = In.down('turbo');
  I.click = null; I.aim = null; I.aimY = null; I.mhold = false; I.podClick = null; I.cardHover = null; I.cardClick = false; I.mkick = null;
  // the set kick: the stick (or the wheel) moves the tee; left and right aim
  I.placeMove = mv[1]; I.aimMove = mv[0] * (ctx.aimSign || 1);
  if (seat.i === 0 || In === game.input) {
    // the mouse is native: hover a teammate (shows if a pass to him is legal), click to pass or switch, the right button
    // kicks toward the cursor, the cursor aims set kicks and kick-offs, a click picks a pod or a card
    const pt = In.pointer && In.pointer(), recent = In.lastDevice === 'mouse' || (In.mouse && In.mouse.t !== undefined && In.clock - In.mouse.t < 2);
    ctx.hoverId = -1;
    if (pt && recent && ctx.pick) {
      const hits = ctx.pick(pt[0], pt[1]) || [], h = hits.find(q => q && q.kind === 'player');
      if (h) ctx.hoverId = h.id;
    }
    const ground = recent && game.mouseGround ? game.mouseGround() : null;
    if (In.pressed('mouseL') && ctx.hoverId >= 0) I.click = ctx.hoverId;
    I.mhold = In.down('mouseL') && recent;
    if (ground && m && (m.phase === 'kickoff' || m.phase === 'dropout') && In.lastDevice === 'mouse') I.aim = { x: ground[0], y: ground[1] };
    if (ground && m && m.phase === 'setkick' && In.lastDevice === 'mouse') I.aimY = ground[1];
    if (m && m.phase === 'setkick' && In.wheel) I.placeMove += In.wheel;
    if (m && (m.phase === 'kickoff' || m.phase === 'dropout') && I.mhold) I.hd.ci = true;
    if (m && (m.phase === 'kickoff' || m.phase === 'dropout') && In.released('mouseL')) I.rl.ci = true;
    if (m && m.phase === 'setkick' && In.released('mouseL') && m.setp && m.setp.sub === 'place') I.pr.x = true;
    const ck = In.clicked && In.clicked();
    if (ctx.podRects && ck) ctx.podRects.forEach((rc, k) => { if (UI.inRect(ck, rc)) I.podClick = k; });
    if (ctx.cardRects && pt) ctx.cardRects.forEach((rc, k) => { if (rc && UI.inRect(pt, rc)) { I.cardHover = k; if (ck && UI.inRect(ck, rc)) I.cardClick = true; } });
    // right button: held fills the meter toward the cursor; let go kicks there
    if (In.down('mouseR') && ground) { seat.mk = seat.mk || { t: 0 }; seat.mk.t += 1 / 120; seat.mk.x = ground[0]; seat.mk.y = ground[1]; }
    else if (seat.mk) { const k = seat.mk; seat.mk = null; if (ground || k.x !== undefined) I.mkick = { x: k.x, y: k.y, power: clamp(k.t / .9, 0, 1), done: true }; }
    ctx.mkick = seat.mk;
  }
  return I;
};
