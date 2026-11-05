// Getting "made" (PLAN §5.2), watch mode, reading roles and photos (§5.3).
const PERC = { made: 0, burnedFor: 0, lamps: [] };
const LAMP_RADIUS = 40;
const LOOK_RANGE = 150, LOOK_FOV = 1.7;

// The behaviour factor for the detail's officer as the watcher sees them (PLAN §5.2 table).
function behaviourFactor(dana, w, aimedAtW) {
  let b = 1;
  if (dana.watching && aimedAtW) b = 2.2;                  // staring through the camera at this observer
  else if (dana.still > 2 && !dana.cover) b = 1.6;          // loitering in plain view
  if (dana.sprinting) b = Math.max(b, 1.4);
  if (dana.crouch) b = Math.max(b, 1.3);
  if (dana.cover) b *= .6;
  if (dana.blending) b *= .35;
  if (w.knows && w.knows.has('dana')) b *= 1.5;            // a face they've made before
  return b;
}

// Lit within 40 units of a lamp at dusk and later.
function litHere(x, y, lampsOn) {
  if (!lampsOn) return 1;
  for (const [lx, ly] of PERC.lamps) if (Math.hypot(lx - x, ly - y) < LAMP_RADIUS) return 1.1;
  return .7;
}

// Each step: every watcher's suspicion of Dana rises or falls. Fires "made" when one reaches alert.
function perceptionStep(dt, dana, watchers, lampsOn, aimedFn) {
  if (game.time < STATE.burnedUntil) PERC.burnedFor = STATE.burnedUntil - game.time;
  for (const w of watchers) {
    if (!w.mind) w.mind = new E.Suspicion({ rise: .9 * DIFF[STATE_DIFF()].rise, decay: .3, notice: .45, search: .7, alert: 1, forget: 7 });
    const seen = E.sees(w, dana, { map: MAP, range: LOOK_RANGE, fov: LOOK_FOV, facing: w.facing, eye: 26 });
    const b = behaviourFactor(dana, w, aimedFn(w));
    const light = litHere(dana.x, dana.y, lampsOn);
    const scored = { seen: seen.seen, exposure: (seen.exposure || 0) * b * light };
    const state = w.mind.update(dt, scored, dana);
    w.state = state;
    if (state === 'notice' || state === 'search') {
      w.looksAt = dana;                                    // the officer turns to look
    }
    if (state === 'alert') made(w);
  }
}

function STATE_DIFF() { return (game.settings && game.settings.difficulty) || 'Detective'; }

// The detail is made: the corner shuts for 60 s, heat rises, photos burn and the watchers know Dana's face.
function made(by) {
  PERC.made++;
  STATE.made++;
  CORNER.shutUntil = game.time + 60;
  STATE.heat = Math.min(100, STATE.heat + 15);
  STATE.burnedUntil = game.time + 60;
  for (const p of PEOPLE) if (p.watcher) { p.knows = p.knows || new Set(); p.knows.add('dana'); p.mind = null; }
  game.audio.sfx('made');
  bus.emit('made', { by: by && by.id });
  saveState();
}

// Watch: the reticle is where the camera is aimed (the mouse on a keyboard; a stick on a pad).
function reticleTarget(dana, ret) {
  let best = null, bd = 26;
  for (const p of PEOPLE) {
    const d = Math.hypot(p.x - ret.x, p.y - ret.y);
    if (d < bd) { best = p; bd = d; }
  }
  return best;
}

// Score a photo (PLAN §5.3): ★Face, ★Focus, ★Act; burned or out of range is 0 stars (blurry).
function scorePhoto(dana, target, focus) {
  const d = Math.hypot(target.x - dana.x, target.y - dana.y);
  const burned = game.time < STATE.burnedUntil;
  if (burned || d > 220) return { stars: 0, face: false, focus, act: false, blurry: true, reason: burned ? 'burned' : 'range' };
  const sightOK = MAP.sight(dana, target);
  const turn = Math.atan2(dana.y - target.y, dana.x - target.x) - target.facing;
  const diff = Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));    // the wrapped angle between them
  const face = !!sightOK && diff <= 75 * Math.PI / 180;
  const act = !!(target.act && target.act.until > game.time);
  const n = (face ? 1 : 0) + (focus ? 1 : 0) + (act ? 1 : 0);
  return { stars: Math.min(3, n), face, focus, act, blurry: n === 0, reason: n === 0 ? 'blurry' : 'ok' };
}

// The shutter: a shot scores, is kept, and identifies the person on a first ★Face.
function takePhoto(dana, target, focus, place) {
  if (STATE.film <= 0) { bus.emit('toast', { title: 'Out of film', text: 'The camera is empty.' }); return null; }
  STATE.film--;
  game.audio.sfx('shutter'); game.audio.sfx('shutterClick');
  const sc = target ? scorePhoto(dana, target, focus) : { stars: 0, blurry: true, face: false, act: false, focus: false, reason: 'nobody' };
  const ph = { id: STATE.photos.length + 1, subject: target ? target.id : null, name: target ? target.name : 'Unknown', t: Math.round(STATE.clock),
    place, stars: sc.stars, face: sc.face, focus: sc.focus, act: sc.act, reason: sc.reason };
  STATE.photos.push(ph);
  if (target && sc.face && !STATE.faces[target.id]) {
    STATE.faces[target.id] = true;
    STATE.case += 2;
    bus.emit('toast', { title: 'Face on file', text: target.name + ' · ' + (target.role || 'unknown') });
  }
  if (target && sc.act) {
    STATE.case += 5;
    bus.emit('toast', { title: 'Act caught', text: 'Evidence: ' + (target.name) + ' at ' + place });
  }
  if (sc.reason === 'burned') bus.emit('toast', { title: 'Burned', text: 'MADE: walk it off' });
  saveState();
  bus.emit('photo', ph);
  return ph;
}

// Reading a role: hold the reticle on someone performing a role behaviour for 3 s.
function readRole(target) {
  if (!target || !target.role || STATE.roles[target.id]) return false;
  STATE.roles[target.id] = target.role;
  STATE.case += 1;
  bus.emit('toast', { title: 'Role read', text: target.name + ' is ' + target.role });
  saveState();
  return true;
}
