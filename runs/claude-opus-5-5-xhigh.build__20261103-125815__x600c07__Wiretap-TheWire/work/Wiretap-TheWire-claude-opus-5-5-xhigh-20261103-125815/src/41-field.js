/* 41-field: one scene runs every neighbourhood mission (missions are data: 30-data-missions). It owns the player (Dana,
   or Tee on his night shifts), movement (walk / run / crouch / act natural), interactables (the nearest one prompts;
   the mouse hovers one and a click walks there and acts), cover, the camera, perception, the HUD and the clock. */
const PLAYER_SPEED = { walk: 52, run: 85, sprint: 125, crouch: 32, watch: 20 };
function makePlayer(person, x, y) {
  const P = new Agent({ id: person, person, x, y, r: 4.5, role: 'police' }); P.isPlayer = true; P.stamina = 100; P.winded = 0; P.still = 0; P.film = 30;
  return P;
}
const Mission = {
  M: null,
  start(spec, beat) {
    World.cur = World.map; Flow.reset(World.map);
    const M = { spec, beat, t: 0, ppl: {}, extras: [], cars: [], ints: [], obj: [], flags: {}, done: false, police: [], observers: [], marks: [], clock: parseClock(spec.clock || '12:00'), rate: spec.rate === undefined ? 1 / 120 : spec.rate, events: [], lightsX: [] };
    // event times after midnight belong to the same night: 00:30 on a night that started at 22:00 is 24.5
    M.events = (spec.events || []).map(e => { const n = parseClock(e.at); return Object.assign({ next: n + (n < M.clock - 6 ? 24 : 0) }, e); });
    this.M = M; M.ctl = Globals.botCtl || new HumanCtl(game.input);
    const s = spec.start || [24, 29.6]; M.P = makePlayer(spec.player || 'dana', W(s[0] - .5), W(s[1] - .5)); M.P.facing = spec.facing || 0;
    M.police.push(M.P);
    Cam.reset({ film: spec.film || 30, long: spec.long, base: 1.2, readable: a => readableRole(a), onRead: a => onReadRole(M, a), onShot: (ph, a) => onPhoto(M, ph, a) });
    World.setTOD(spec.tod || 'day'); Amb.set(spec.amb || (World.dark ? 'streetNight' : 'streetDay'), spec.tod === 'dawnRain' || spec.tod === 'nightRain');
    Snd.music(spec.music || 'field'); Snd.musicScale(spec.player === 'tee' ? .9 : .6);
    if (spec.corner) {
      M.sim = new CornerSim(Object.assign({ night: World.dark, stash: STATE.crew.stash }, spec.corner));
      if (STATE.meters.heat >= 30 && !spec.corner.noThird) M.sim.addThird();
      for (const a of M.sim.crew) { M.ppl[a.crewId] = a; M.observers.push(a); }
    }
    Crowd.reset(spec.crowd === undefined ? (World.dark ? 12 : 25) : spec.crowd, spec.zone, 100 + STATE.ep * 17);
    Perception.setup(M.observers, M.police);
    M.say = (who, text, done) => Talk.play([[who, text]], done);
    M.talk = (steps, done) => Talk.play(steps, done);
    M.radio = (who, text, secs) => Talk.radio(who, text, secs);
    M.int = o => { const i = Object.assign({ r: 18, z: 0, key: 'interact', when: () => true }, o); M.ints.push(i); return i; };
    M.person = (id, x, y, o = {}) => { const a = new Agent(Object.assign({ id, person: id, x: W(x - .5), y: W(y - .5) }, o)); M.ppl[id] = a; M.extras.push(a); if (o.observer) M.observers.push(a); return a; };
    M.objective = (id, text, done, o = {}) => { const ob = Object.assign({ id, text, done, ok: false }, o); M.obj.push(ob); return ob; };
    M.finish = res => { if (M.done) return; M.done = true; Cam.on = false; UI.closeAll(); game.after(.4, () => Director.done(res)); };
    M.fail = (title, text, retry) => { if (M.failing) return; M.failing = true; Snd.play('die', { vol: .5 }); UI.choose({ kicker: 'Mission', title, text, back: false, cards: [{ id: 'retry', label: 'Try again', sub: retry && retry.sub || 'From the last checkpoint' }] }, () => { M.failing = false; if (retry && retry.fn) retry.fn(); else Director.go(STATE.beat, { noSave: true }); }); };
    M.mark = (x, y, z, label, color) => { M.marks = [{ x, y, z: z || 0, label, color: color || '#ffd040' }]; };
    // the standard interactables: cover and the market (missions add their own)
    if (spec.player !== 'tee') addCoverInts(M);
    try { if (spec.setup) spec.setup(M); } catch (e) { game.fail('mission setup ' + spec.id, e); }
    game.follow(null); game.cam.bounds = v => World.map.bounds(v); game.cam.snap = true; game.resetCamera();
    if (spec.intro && !Globals.attract) game.after(.6, () => M.talk(spec.intro, () => { if (spec.afterIntro) spec.afterIntro(M); }));
    else if (spec.afterIntro) spec.afterIntro(M);
    return M;
  }
};
/* ---- cover activities (§5.1) ---- */
function addCoverInts(M) {
  const P = M.P;
  M.int({ id: 'bench', x: W(42.5), y: W(30.9), verb: 'Sit at the bus stop', hint: 'Cover', when: () => !P.cover, act: () => setCover(M, { pose: 'sit', x: W(42.6), y: W(30.85), face: -Math.PI / 2, why: 'Waiting for the 22' }) });
  M.int({ id: 'market', x: W(27.6), y: W(26.2), verb: 'Buy a soda', hint: 'Gaither Market · 6 s inside', when: () => !P.cover && !P.inside, act: () => {
    P.inside = true; P.hidden = true; Snd.play('door'); Toast('Gaither Market', 'A grape soda and a bag of chips. Miss Pat doesn\'t look up.');
    game.after(6, () => { P.inside = false; P.hidden = false; Snd.play('door'); }); } });
  M.int({ id: 'chevy', x: W(22.5), y: W(29.1), verb: 'Wait in the car', hint: 'Cover', when: () => !P.cover && !M.noCar, act: () => setCover(M, { pose: 'sit', x: W(22.6), y: W(29.5), inCar: true, why: 'In the Chevy' }) });
  if (F().odessaRespect) M.int({ id: 'stoopO', x: W(33.3), y: W(37.5), verb: 'Sit on Miss Odessa\'s stoop', hint: 'Cover', when: () => !P.cover, act: () => setCover(M, { pose: 'sit', x: W(33.5), y: W(37.5), face: Math.PI, why: 'On the stoop' }) });
}
function setCover(M, c) {
  const P = M.P; P.place(c.x, c.y); P.cover = c; P.pose = c.pose; if (c.face !== undefined) P.facing = c.face; P.inCar = !!c.inCar; if (c.inCar) P.hidden = true;
  if (tip('cover')) Tut.say('Cover', 'Sitting, leaning, waiting for a bus: people on a corner see what they expect. Move to get up.');
}
function leaveCover(P) { if (!P.cover) return; P.cover = null; P.pose = null; if (P.inCar) { P.inCar = false; P.hidden = false; } }

/* ---- reading roles and photos as Dana (missions may add their own) ---- */
const ROLE_LABEL = { lieutenant: 'Lieutenant', muscle: 'Muscle', stash: 'Stash', money: 'Money', runner: 'Runner', lookout: 'Lookout', tout: 'Tout' };
function performingRole(a) {
  const s = Mission.M && Mission.M.sim; if (!a.role || !ROLE_LABEL[a.role]) return false;
  if (a.role === 'lookout' || a.role === 'tout') return !s || s.open || a.role === 'lookout';
  if (a.role === 'runner') return !!(a.carrying || a.job || (a.act && a.act.kind === 'stash-access'));
  if (a.role === 'stash') return s ? dist2(a, s.stash) < 70 || !!a.act : true;
  if (a.role === 'money') return !!(a.act || (s && s.L.onMoney > 0));
  if (a.role === 'muscle') return !!(s && s.moneyman && dist2(a, s.moneyman) < 48);
  if (a.role === 'lieutenant') return !!(a.act || (s && dist2(a, s.spot('lt')) < 40));
  return false;
}
const readableRole = a => a.person && performingRole(a) && !hasFact('obs:' + a.person + ':' + a.role);
function onReadRole(M, a) {
  const f = 'obs:' + a.person + ':' + a.role; if (!addFact(f)) return;
  addEvidence({ id: f, kind: 'obs', ref: a.person, pts: 1, text: nameOf(a.person) + ' working as ' + ROLE_LABEL[a.role].toLowerCase() + ', ' + placeName(a.x, a.y) + ', ' + clockStr(M.clock) });
  casePoint('read', 'Read: ' + (hasFact('face:' + a.person) ? nameOf(a.person) : 'unknown') + ' is the ' + ROLE_LABEL[a.role].toUpperCase());
  if (tip('read')) Tut.say('Reading roles', 'Holding the camera on someone doing their job fills the read. Who holds, who carries, who takes the money.');
  bus.emit('read', { a });
}
function onPhoto(M, ph, a) {
  if (M.spec.onPhoto && M.spec.onPhoto(M, ph, a) === false) return;
  if (ph.stars === 0) { Toast('Blurry', ph.subject && dist2(M.P, a) > Cam.range ? 'Too far for this lens.' : M.P.burnedUntil > game.time ? 'They made you. Nobody holds still for a cop.' : 'Nothing anyone could use.'); return; }
  const who = ph.subject && PEOPLE[ph.subject] ? ph.subject : null;
  if (who && ph.face && addFact('face:' + who)) { casePoint('face', 'Face on file: ' + nameOf(who)); addEvidence({ id: 'face:' + who, kind: 'photo', ref: who, pts: 1, photo: ph.id, text: 'Face photo of ' + nameOf(who) + ', ' + ph.place + ' ' + ph.t }); }
  if (who && ph.act) {
    const id = 'act:' + who + ':' + ph.act + '@' + ph.place;
    if (addEvidence({ id, kind: 'act', ref: who, act: ph.act, place: ph.place, pts: 2, photo: ph.id, text: nameOf(who) + ', ' + ACT_NAMES[ph.act] + ', ' + ph.place + ' ' + ph.t })) { casePoint('act', 'ACT photo: ' + ACT_NAMES[ph.act]); addFact('act:' + who + ':' + ph.act); if (ph.act === 'payphone') addFact('payphoneAct:' + who + ':' + (ph.place.match(/P\d/) || ['P?'])[0]); }
  }
  if (ph.tag && ph.focus) bus.emit('tagPhoto', { tag: ph.tag, ph });
  Toast((who ? (hasFact('face:' + who) ? nameOf(who) : 'Unknown') : ph.tag || 'Photo') + '  ' + '★'.repeat(ph.stars) + '☆'.repeat(3 - ph.stars) + (ph.act ? '  ACT' : ''), [ph.face ? 'Face' : 'No face', ph.focus ? 'in focus' : 'soft', ph.act ? ACT_NAMES[ph.act] : ''].filter(Boolean).join(' · '));
}

/* ---- the player each step ---- */
function playerTick(M, dt) {
  const P = M.P, c = M.ctl;
  if (P.locked || P.busy || P.inside) { P.vx = P.vy = 0; P.update(dt); return; }
  const mv = c.move(), mag = Math.min(1, Math.hypot(mv[0], mv[1]));
  if (mag > .2 && P.cover) leaveCover(P);
  if (P.cover) { P.vx = P.vy = 0; P.still += dt; P.update(dt); return; }
  if (c.pressed('crouch')) { P.crouch = !P.crouch; P.chest = P.crouch ? 10 : undefined; P.eye = P.crouch ? 16 : undefined; }
  const run = c.running() && mag > .2;
  P.blending = c.down('blend') && !run && !Cam.on;
  if (P.blending && tip('blend')) Tut.say('Act natural', 'Hold ' + Prompts.label('blend') + ': check your phone, look at nothing. A face nobody remembers.');
  let sp = PLAYER_SPEED.walk;
  if (Cam.on) sp = PLAYER_SPEED.watch; else if (P.crouch) sp = PLAYER_SPEED.crouch;
  else if (run) {
    // in a chase, Run sprints (125) while stamina lasts and runs (85) otherwise; empty, she's winded for 2 s, and sprints
    // again once a third of her stamina is back
    if (M.pursuit && !(P.winded > 0) && P.stamina > (P.sprintLock ? 33 : 0)) { sp = PLAYER_SPEED.sprint; P.sprintLock = false; P.stamina -= 14 * dt; if (P.stamina <= 0) { P.stamina = 0; P.winded = 2; P.sprintLock = true; Snd.play('hurt', { vol: .3 }); } }
    else sp = PLAYER_SPEED.run;
  }
  if (P.winded > 0) { P.winded -= dt; sp = Math.min(sp, 60); }
  if (sp < PLAYER_SPEED.sprint) P.stamina = Math.min(100, P.stamina + 10 * dt);
  if (P.blending) sp = Math.min(sp, 14);
  let gx = 0, gy = 0;
  if (mag > .05) { const g = game.view.screenDirToGround(mv[0], mv[1]), l = Math.hypot(g[0], g[1]) || 1; gx = g[0] / l; gy = g[1] / l; P.walkTo = null; P.goal = null; }
  const k = mag > .05 ? Math.min(1, mag / .62) : 0;
  if (P.walkTo && !P.goal) { const w = P.walkTo; P.walkTo = null; P.goTo(w.x, w.y, PLAYER_SPEED.walk + 10, () => { if (w.then) w.then(); }); }
  if (!P.goal) { P.vx = gx * sp * k; P.vy = gy * sp * k; }
  const speed = Math.hypot(P.vx, P.vy);
  P.sprinting = speed > 100; P.still = speed < 5 ? P.still + dt : 0;
  // leaning on a wall when standing still beside one
  const wallNear = P.still > 1 && World.cur.wall && World.cur.wall(P, P.facing + Math.PI, { reach: P.r + 5 });
  P.leaning = !!wallNear && !Cam.on && !P.blending; P.coverLean = P.leaning;
  P.pose = Cam.on ? 'camera' : P.blending ? 'phone' : P.leaning ? 'lean' : null;
  P.cover = P.cover || null; P.coverLeanActive = P.leaning;
  P.update(dt);
}
/** perception reads "cover" while leaning too */
Object.defineProperty(Agent.prototype, 'inCover', { get() { return !!this.cover || !!this.coverLean; } });

/* ---- interactables: the nearest valid one prompts; the mouse hovers one; a click walks to it ---- */
function nearestInt(M) {
  const P = M.P; let best = null, bd = 1e9;
  for (const i of M.ints) { if (i.off || !i.when()) continue; const d = Math.hypot(i.x - P.x, i.y - P.y); if (d < i.r && d < bd) { bd = d; best = i; } }
  return best;
}
function intsTick(M) {
  const P = M.P, c = M.ctl, near = nearestInt(M); M.near = near;
  if (!Globals.blocked() && !Cam.on) {
    if (near && c.pressed(near.key || 'interact')) { near.act(M); game.input.consume('interact'); return; }
    // the mouse: a click on a hovered interactable acts, or walks there first
    const clk = game.input.clicked(), h = M.hover;
    if (clk && h && !h.off && h.when() && game.input.lastDevice !== 'gamepad') {
      if (Math.hypot(h.x - P.x, h.y - P.y) < h.r) h.act(M); else P.walkTo = { x: h.x, y: h.y, then: () => { if (h.when()) h.act(M); } };
    }
  }
}
function hoverInt(M, r) {
  M.hover = null; const ptr = game.input.pointer(); if (!ptr || game.input.lastDevice === 'gamepad' || Cam.on) return;
  let bd = 16;
  for (const i of M.ints) { if (i.off || !i.when()) continue; const [sx, sy] = r.w(i.x, i.y, (i.z || 0) + 12); const d = Math.hypot(sx - ptr[0], sy - ptr[1]); if (d < bd) { bd = d; M.hover = i; } }
}

/* ---- the HUD (E.Shell), from this step's state ---- */
function fieldHud(M) {
  if (!shell) return; if (Globals.attract || UI.active) { shell.hud({}); return; }
  const P = M.P, h = Perception.heat(P), st = Perception.worst(P), ob = M.obj.find(o => !o.ok && !o.optional) || M.obj.find(o => !o.ok);
  const status = P.inCar ? { text: 'In the car', color: '#9ae8ff' } : P.inside ? { text: 'Inside', color: '#9ae8ff' } : P.burnedUntil > game.time ? { text: 'MADE', color: '#ff4a3a' } : st === 'search' ? { text: 'Watched', color: '#ff9a40' } : st === 'notice' ? { text: 'Noticed', color: '#ffc040' } : P.blending ? { text: 'Blending', color: '#9ae89a' } : P.winded > 0 ? { text: 'Winded', color: '#ff9a40' } : P.cover || P.leaning ? { text: 'In cover', color: '#9ae89a' } : { text: 'Unnoticed', color: '#e8e0d0' };
  const bars = [{ label: M.spec.player === 'tee' ? 'Five-oh watching' : 'Eyes on you', value: Math.round(h * 100), max: 100, color: h > .65 ? '#ff5a4a' : h > .3 ? '#ffb347' : '#9ae89a' }];
  if (M.pursuit || P.stamina < 100) bars.push({ label: 'Stamina', value: Math.round(P.stamina), max: 100, color: '#7aa7ff' });
  if (M.hudBars) bars.push(...M.hudBars());
  const counts = M.spec.player === 'tee' ? (M.hudCounts ? M.hudCounts() : []) : [['Film', Cam.film], ['Fund', money(STATE.meters.fund)]].concat(M.hudCounts ? M.hudCounts() : []);
  const n = M.near || M.hover;
  shell.hud({
    objective: ob ? { step: 'EP' + STATE.ep + ' · ' + (M.obj.filter(o => o.ok).length + 1) + '/' + M.obj.filter(o => !o.optional).length, title: ob.text, text: typeof ob.sub === 'function' ? ob.sub() : ob.sub || '', at: ob.at || (M.marks[0] && M.marks[0]), from: P } : null,
    status, bars, counts, place: placeName(P.x, P.y) + '  ' + clockStr(M.clock),
    prompt: n && !Cam.on ? { act: n.key || 'interact', label: n.verb, hint: n.hint || '' } : Cam.on && Cam.target ? { act: 'photo', label: 'Take photo', hint: Cam.target.person && hasFact('face:' + Cam.target.person) ? nameOf(Cam.target.person) : '' } : null,
    minimap: { map: World.map, at: P, markers: M.marks.map(m => ({ x: m.x, y: m.y, kind: 'diamond', color: m.color })).concat(M.mini ? M.mini() : []) }
  });
}

scenes.field = withGlobals({
  view: 'iso', views: ['iso'], pausable: true, camera: { zoom: [.8, 2], start: 1.2, tall: 1.4 },
  enter(d) { this.M = Mission.start(get('missions', d.beat.ref), d.beat); this.peek = [0, 0]; },
  exit() { Snd.musicScale(1); Cam.on = false; try { game.setZoom(1); } catch (e) { /* none */ } if (this.M && this.M.spec.exit) this.M.spec.exit(this.M); },
  update(dt) {
    const M = this.M; if (!M) return;
    if (Talk.update(dt)) { this.camera(dt); if (shell) shell.hud({}); return; }
    M.t += dt; M.clock += M.rate * dt * (M.fast || 1);
    for (const e of M.events) if (M.clock >= e.next && !e.dead) { try { e.do(M); } catch (er) { game.fail('event', er); } if (e.every) e.next += parseClock(e.every); else e.dead = true; }
    if (!Globals.blocked()) {
      if (Globals.notebookPressed()) { if (M.spec.player === 'tee' && TeeShift.M === M) TeeShift.pager(); else Notebook.open(); return; }   // on Tee's nights the notebook button is his pager
      if (game.input.pressed('map')) { Notebook.open('map'); return; }
      if (M.ctl.pressed('rotL')) game.rotateView(-90); if (M.ctl.pressed('rotR')) game.rotateView(90);
      if (M.ctl.pressed('camReset')) game.rotateView(-(game.yaw || 0));
    }
    if (M.spec.player === 'tee' && M.sim && TeeShift.M === M) TeeShift.tick(M, dt); else playerTick(M, dt);
    if (!M.noCam) Cam.tick(dt, M.P, M.ctl, M.clock);
    intsTick(M);
    if (M.sim) M.sim.tick(dt, M.police);
    Crowd.tick(dt, M.P);
    for (const a of M.extras) { if (a.brain) a.brain(a, dt, M); a.update(dt); speakBark(a, M.P); }
    if (M.sim) for (const a of M.sim.all()) speakBark(a, M.P);
    for (const c of M.cars) c.tick(dt); M.cars = M.cars.filter(c => !c.done);
    Perception.tick(dt);
    if (M.P.inside) for (const o of M.observers) { const m = o.minds[M.P.id]; if (m) m.level = Math.max(0, m.level - m.decay * 2 * dt); }
    World.tick(dt, [M.P, ...(M.sim ? M.sim.crew : [])].filter(a => a.sprinting || Math.hypot(a.vx, a.vy) > 90));
    try { if (M.spec.tick) M.spec.tick(M, dt); } catch (e) { game.fail('mission tick', e); }
    for (const o of M.obj) if (!o.ok && o.done(M)) { o.ok = true; if (!Globals.attract) { Toast(o.optional ? 'Optional done' : 'Done', o.text); Snd.play('coin', { vol: .5 }); } }
    if (!M.done && M.spec.finish && M.spec.finish(M)) { if (M.spec.onFinish) M.spec.onFinish(M); else M.finish(); }
    this.camera(dt); fieldHud(M);
  },
  camera(dt) {
    const M = this.M, P = M.P;
    // look ahead: the right stick peeks up to 64 px; the mouse at a screen edge (setting)
    let px0 = 0, py0 = 0; const st = !Cam.on && M.ctl.aimStick && M.ctl.aimStick();
    if (st) { px0 = st[0] * 64; py0 = st[1] * 64; }
    const ptr = game.input.pointer();
    if (!Cam.on && !st && ptr && game.settings.edgePeek && game.input.lastDevice !== 'gamepad' && !UI.active) { const ex = ptr[0] / game.W, ey = ptr[1] / game.H; if (ex < .06) px0 = -48; else if (ex > .94) px0 = 48; if (ey < .07) py0 = -40; else if (ey > .93) py0 = 40; }
    this.peek = [approach(this.peek[0], px0, dt * 140), approach(this.peek[1], py0, dt * 140)];
    const ox = Cam.offset[0] + this.peek[0], oy = Cam.offset[1] + this.peek[1], g = Math.hypot(ox, oy) > .5 ? game.view.screenDirToGround(ox, oy) : [0, 0], gl = Math.hypot(g[0], g[1]) || 1, k = Math.hypot(ox, oy) * 1.3;
    const f = M.camAt || P; World.focus = f; game.focus(f.x + g[0] / gl * k, f.y + g[1] / gl * k, (f.z || 0) + 16);
  },
  draw(r) {
    const M = this.M; if (!M) return; const P = M.P;
    World.draw(r, { near: P });
    if (M.sim) M.sim.draw(r, P);
    for (const a of Crowd.list) drawAgent(r, a, { bg: true });
    for (const a of M.extras) drawAgent(r, a, { ring: M.hover && M.hover.agent === a ? '#ffb347' : null });
    for (const c of M.cars) c.draw(r);
    drawAgent(r, P, { xray: { actors: true, color: '#ffb347' }, alpha: P.blending ? .9 : 1 });
    Perception.draw(r, P);
    hoverInt(M, r);
    if (M.hover) { const h = M.hover; r.groundRing(h.x, h.y, 10, '#ffb347', .9); }
    if (M.near && !Cam.on) r.groundRing(M.near.x, M.near.y, 8, '#f2ead8', .6);
    for (const m of M.marks) r.marker(m.x, m.y, m.z, { label: m.label, color: m.color });
    if (M.spec.draw) M.spec.draw(r, M);
    const cands = [...(M.sim ? M.sim.all() : []), ...M.extras, ...Crowd.list, ...(M.photoCands ? M.photoCands() : [])];
    Cam.pickTarget(r, P, cands); Cam.draw(r, P);
    drawBubbles(r, [...(M.sim ? M.sim.all() : []), ...M.extras, ...Crowd.list, P], P);
    if (M.spec.overlay) M.spec.overlay(r, M);
    if (game.debugOverlay) debugDraw(r, M);
    Talk.draw(r);
  }
});
