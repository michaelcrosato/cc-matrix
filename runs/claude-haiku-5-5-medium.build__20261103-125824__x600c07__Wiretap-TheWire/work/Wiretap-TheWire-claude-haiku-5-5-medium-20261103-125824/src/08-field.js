// The field: Dana on the street. One scene runs the neighbourhood missions and the attract reel (ATTRACT.on).
let DANA = null, DANA_RIG = null, WATCHERS = [], CAST_BY = {};
const FIELD = {
  reticle: { x: 0, y: 0 }, watching: false, run: false, crouchOn: false, auto: null, readT: 0, readOf: null,
  lastPrompt: null, watchHold: 0, watchHoldOn: null, maxEye: 0, aimOK: false, cover: false, lampsOn: false,
  interacts: [], hudTip: null, noteUntil: 0,
};
const COVER_CELLS = [[42, 30], [36, 26], [35, 30]];   // the bus shelter, the bench, the carryout line

// Where the field's cast is, from the seed: rebuilt on each field entry.
function setupField(newGame) {
  PEOPLE.length = 0;
  PERC.lamps = DRESS.filter(d => d[0] === 'streetlamp').map(d => cellWorld([d[1], d[2]]));
  CAST_BY = spawnCrew();
  WATCHERS = [CAST_BY.tee, CAST_BY.rook, CAST_BY.pigeon];
  for (let i = 0; i < 24; i++) spawnCivilian(i);
  const [sx, sy] = cellWorld(POI.chevy.c);
  DANA = new E.Mover({ x: sx, y: sy, r: 5, staminaMax: 100 });
  DANA.facing = 0;
  DANA_RIG = DANA_RIG || makeRig(CAST.dana);
  FIELD.reticle = { x: sx, y: sy }; FIELD.auto = null; FIELD.watching = false; FIELD.readT = 0; FIELD.readOf = null;
  CORNER.shutUntil = 0; CORNER.nextSale = 8; FIELD.maxEye = 0;
  if (newGame) { /* the start of the mission */ }
}

// Dana's intent this step from a controller: a human's (the game's input) or the attract bot's ground vector.
function intentFrom(ctl) {
  let gx = 0, gy = 0, mag = 0;
  if (ctl.ground) { const g = ctl.ground(); gx = g[0]; gy = g[1]; mag = Math.hypot(gx, gy); }
  else {
    const m = ctl.move(); mag = Math.min(1, Math.hypot(m[0], m[1]));
    if (mag > .12) { const d = game.view.screenDirToGround(m[0], m[1]); gx = d[0] * mag; gy = d[1] * mag; }
    else mag = 0;
  }
  return { move: [gx, gy], sprint: !!(ctl.down('sprint') || FIELD.run), crouch: FIELD.crouchOn, jumpPressed: false, walking: mag > .12 };
}

// The reticle: the mouse on a keyboard; the right stick on a pad; ahead of Dana when nothing is pointed.
function moveReticle(dt, ctl) {
  const R = FIELD.reticle;
  if (ctl.reticleAt) { const p = ctl.reticleAt(); if (p) { R.x = p[0]; R.y = p[1]; return; } }
  if (game.input.lastDevice === 'mouse' || game.input.lastDevice === 'keyboard') {
    const g = game.mouseGround && game.mouseGround();
    if (g && game.input.lastDevice === 'mouse') { R.x = g[0]; R.y = g[1]; return; }
  }
  const s = padStick(), speed = 220;
  if (s && (Math.abs(s[0]) > .15 || Math.abs(s[1]) > .15)) {
    const d = game.view.screenDirToGround(s[0], s[1]);
    R.x += d[0] * speed * dt; R.y += d[1] * speed * dt;
  } else if (!FIELD.watching) {                               // not aiming: the reticle rests just ahead of Dana
    R.x = DANA.x + Math.cos(DANA.facing) * 60; R.y = DANA.y + Math.sin(DANA.facing) * 60;
  }
}

// The right stick (axes 2 and 3) of the first connected pad, after the stick settings.
function padStick() {
  if (!navigator.getGamepads) return null;
  for (const p of Array.from(navigator.getGamepads() || [])) {
    if (p && p.connected && p.axes && p.axes.length >= 4) {
      const dz = .18, a = p.axes[2], b = p.axes[3];
      if (Math.hypot(a, b) < dz) return [0, 0];
      return [a, b];
    }
  }
  return null;
}

// Interactables in range of Dana, nearest first (the prompt shows the nearest).
function nearestInteract(list, x = DANA.x, y = DANA.y, range = 30) {
  let best = null, bd = range;
  for (const it of list) {
    if (it.when && !it.when()) continue;
    const d = Math.hypot(it.at[0] - x, it.at[1] - y);
    if (d < bd) { best = it; bd = d; }
  }
  return best;
}

// Field step: Dana, the crew, the civilians, the corner, perception, the clock and the HUD.
function fieldUpdate(dt, ctl, opts = {}) {
  const I = ctl;
  const list = opts.interacts || MISSION.interacts();
  FIELD.lampsOn = mood(STATE.clock).lamps;
  // Dana's controls
  FIELD.run = FIELD.run || false;
  if (ctl.pressed && ctl.pressed('crouch')) FIELD.crouchOn = !FIELD.crouchOn;
  if (ctl.pressed && ctl.pressed('rotL')) game.rotateView(-90);
  if (ctl.pressed && ctl.pressed('rotR')) game.rotateView(90);
  if (ctl.pressed && ctl.pressed('camReset')) game.resetCamera();
  FIELD.watching = !!(ctl.down && ctl.down('watch')) && !TALK.open;
  FIELD.cover = COVER_CELLS.some(c => Math.hypot(...cellWorld(c).map((v, i) => v - [DANA.x, DANA.y][i])) < 22);
  let intent = intentFrom(ctl);
  if (FIELD.auto && intent.walking) FIELD.auto = null;
  if (FIELD.auto) {                                           // walking to a point by click or prompt
    const a = FIELD.auto, d = Math.hypot(a.x - DANA.x, a.y - DANA.y);
    if (d < 6) { FIELD.auto = null; if (a.then) a.then(); }
    else { const dir = FLOW ? FLOW.dir(DANA.x, DANA.y, a.x, a.y) : [(a.x - DANA.x) / d, (a.y - DANA.y) / d]; intent = { move: dir, sprint: false, crouch: FIELD.crouchOn }; }
  }
  if (FIELD.watching) intent = Object.assign(intent, { move: intent.move.map(v => v * .4), sprint: false });   // slower while aiming
  DANA.update(dt, MAP, intent);
  DANA.still = Math.hypot(DANA.vx || 0, DANA.vy || 0) < 4 ? (DANA.still || 0) + dt : 0;
  DANA.watching = FIELD.watching;
  DANA.cover = FIELD.cover;
  DANA.blending = !!ctl.down('blend');
  DANA_RIG.update(dt, DANA.rigState({ pose: FIELD.watching ? 'guard' : undefined }));
  // the reticle, when watching
  const R = FIELD.reticle;
  const prev = { x: R.x, y: R.y };
  moveReticle(dt, ctl);
  const ring = Math.hypot(R.x - prev.x, R.y - prev.y) / Math.max(dt, 1e-3);   // how fast it is moving (units a second)
  // reading a role: hold the reticle on someone for 3 s (watching only)
  const near = FIELD.watching ? reticleTarget(DANA, R) : null;
  const steady = !!near && ring < 30;
  FIELD.readT = steady && near === FIELD.readOf ? FIELD.readT + dt : (steady ? dt : 0);
  FIELD.readOf = steady ? near : null;
  if (FIELD.readOf && FIELD.readT > 3 && FIELD.readOf.role && !STATE.roles[FIELD.readOf.id]) readRole(FIELD.readOf);
  // the camera shutter; focus when the reticle has stayed on the subject for .6 s
  if (FIELD.watching && ctl.pressed && ctl.pressed('photo')) {
    takePhoto(DANA, near, !!(near && FIELD.readT > .6), place());
    FIELD.flash = .18;
  }
  // a click on open ground walks there, or to the nearest prompt (keyboard and mouse)
  if (ctl === game.input && !FIELD.watching && game.input.clicked && game.input.clicked()) {
    const g = game.mouseGround && game.mouseGround();
    if (g) {
      const it2 = nearestInteract(list, g[0], g[1], 30);
      FIELD.auto = it2 ? { x: it2.at[0], y: it2.at[1], then: it2.act } : { x: g[0], y: g[1] };
    }
  }
  // people
  for (const p of PEOPLE) p.update(dt);
  cornerStep(dt, CAST_BY);
  // perception: the watchers' minds (the attract reel's bot cheats: its watchers never look)
  const aimed = w => FIELD.watching && Math.abs(angleDiff(Math.atan2(R.y - DANA.y, R.x - DANA.x), Math.atan2(w.y - DANA.y, w.x - DANA.x))) < .17;
  if (!opts.cheat) perceptionStep(dt, DANA, WATCHERS, FIELD.lampsOn, aimed);
  FIELD.maxEye = 0;
  for (const w of WATCHERS) if (w.mind) FIELD.maxEye = Math.max(FIELD.maxEye, w.mind.level || 0);
  // interactions: a press acts on the nearest in range; a click walks to a point
  const it = nearestInteract(list);
  FIELD.prompt = it;
  if (!FIELD.watching && ctl.pressed && ctl.pressed('interact') && it) it.act();
  // the clock: 30 minutes of mission time a real minute
  STATE.clock = Math.min(STATE.clock + dt * .5, 24 * 60 - 1);
  if (FIELD.flash) FIELD.flash = Math.max(0, FIELD.flash - dt);
  MISSION.step(dt);
  if (!opts.silent) hudFor(it);
}

function place() {
  const c = worldCell(DANA.x, DANA.y);
  if (c[0] >= 26 && c[0] <= 36 && c[1] >= 24 && c[1] <= 34) return 'Gaither & Ridley';
  if (c[0] >= 36) return 'Ridley';
  return 'Penn Row';
}

function angleDiff(a, b) { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); }

// The HUD (E.Shell), from this step's state.
function hudFor(it) {
  if (!ui) return;
  const o = MISSION.objective();
  const eye = FIELD.maxEye;
  const status = PERC.burnedFor > 0 ? { text: 'MADE: walk it off', color: '#ff5a4a' }
    : eye > .5 ? { text: 'Eyes on you', color: '#f0c040' } : { text: 'Unnoticed', color: '#7ad06a' };
  ui.hud({
    objective: o ? { step: o.step, title: o.title, text: o.text, at: o.at ? { x: o.at[0], y: o.at[1] } : undefined, from: DANA } : undefined,
    status,
    bars: [{ label: 'Heat', value: STATE.heat, max: 100, color: '#e0a040' }, { label: 'Eyes on you', value: eye, max: 1, color: '#ff8050' }],
    counts: [['Film', STATE.film], ['Fund', fmtMoney(STATE.fund)], ['Case', STATE.case]],
    prompt: it ? { key: glyph(game, 'interact'), label: it.verb, hint: it.hint } : undefined,
    keys: [[legendKeys(), 'Move'], [prompt(game, 'watch', 'Watch'), 'Hold to aim'], [prompt(game, 'notebook', 'Board'), 'Notebook']],
  });
}
function legendKeys() { return game.input.lastDevice === 'gamepad' ? glyph(game, 'up') + glyph(game, 'left') : 'WASD'; }

// Draw the field: the floor and walls, the dressing, the cones, the people and Dana, and the reticle.
function fieldDraw(r, opts = {}) {
  MAP.drawFloor(r); MAP.queueWalls(r);
  drawDressing(r, FIELD.lampsOn);
  for (const p of PEOPLE) p.draw(r);
  const cones = !!game.settings.cones;
  for (const w of WATCHERS) {
    if (!cones || !w.mind) continue;
    const col = w.state === 'alert' ? '#ff4a3a' : w.state === 'notice' || w.state === 'search' ? '#ffb040' : '#ffe080';
    r.sightCone(w, { map: MAP, range: LOOK_RANGE, fov: LOOK_FOV, facing: w.facing, color: col, alpha: w.state && w.state !== 'calm' ? .34 : .18 });
    r.textAt(w.x, w.y, 30, w.state === 'alert' ? '!' : w.state === 'notice' ? '?' : w.state === 'search' ? '??' : '', w.state === 'alert' ? '#ff5a4a' : '#ffd060');
  }
  r.shadow(DANA.x, DANA.y, 7, .35, undefined, DANA.groundZ || 0);
  r.actor(DANA.x, DANA.y, DANA.z || 0, (g, ox, oy) => DANA_RIG.draw(g, ox, oy, r.view));
  if (FIELD.watching) {
    const R = FIELD.reticle;
    r.marker(R.x, R.y, 0, { label: '', color: '#ffffff' });
    r.overlay(g => {
      const cx = Math.round(r.W / 2), cy = Math.round(r.H / 2);
      E.px.rect(g, cx - 14, cy, 6, 1, '#ffffff'); E.px.rect(g, cx + 9, cy, 6, 1, '#ffffff');
      E.px.rect(g, cx, cy - 14, 1, 6, '#ffffff'); E.px.rect(g, cx, cy + 9, 1, 6, '#ffffff');
    });
  }
  if (FIELD.flash > 0) r.overlay(g => E.px.rect(g, 0, 0, r.W, r.H, '#ffffff'));
  if (FIELD.lampsOn) for (const [lx, ly] of PERC.lamps) game.lights.add(lx, ly, 20, 56, .6, { color: '#ffb04a' });
}
