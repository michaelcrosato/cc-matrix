// WIRETAP: the field scene. One scene runs every neighbourhood mission (MISSIONS, next file): the player (Dana, Lou or
// Tee) on a controller, interactables (nearest one, or hover and click), cover, eavesdropping, Watch and photos,
// perception and getting made, the corner, civilians, the mission clock, the HUD.
const FD = { m: null, me: null, agents: [], civs: [], npcs: [], corner: null, inter: [], clock: 0, clockRate: .5, look: [0, 0], made: 0, t: 0, done: false, cones: [], extras: [] };
const SIDEWALK = [[20, 26], [12, 26], [3, 26], [40, 26], [52, 26], [64, 26], [16, 30.6], [26, 30.6], [46, 30.6], [52, 30.6], [30.4, 20], [33.6, 18], [30.4, 44], [33.6, 47], [20, 44.5], [45, 44.5],
  [8, 18], [8, 33], [57, 20], [57, 40], [44, 15.6], [20, 12.2], [40, 12.2], [36, 26], [29, 26]];
function makePlayer(person, at, o = {}) {
  const a = new Agent({ id: o.id || person, person, x: at.x, y: at.y, speed: 52 });
  Object.assign(a, { ctl: o.ctl || new HumanCtl(game.input), still: 0, moving: false, sprinting: false, crouching: false, blending: false, cover: null, inCar: false, burned: false, burnT: 0,
    stamina: 100, winded: 0, cam: Camera.make(o.cam || {}), hidden: false, cop: o.cop !== false, autoGoal: null, holdT: 0, holdOf: null, pose: null, z: 0 });
  return a;
}
const vb = it => typeof it.verb === 'function' ? it.verb() : it.verb;
const Field = {
  pausable: true, view: 'iso', views: ['iso'], camera: { zoom: [.8, 2], start: 1.2, tall: 1.4 },
  enter(data = {}) {
    const m = FD.m = MISSIONS[data.m] || MISSIONS.eyes; FD.data = data; FD.done = false; FD.t = 0; FD.made = 0; FD.inter = []; FD.npcs = []; FD.civs = []; FD.extras = []; FD.corner = null; FD.pursuit = false; FD.partner = null; FD.flags = {};
    FD.clock = m.clock ? hm(m.clock[0]) : 15 * 60; FD.clockEnd = m.clock ? hm(m.clock[1]) : 24 * 60; FD.clockRate = m.clockRate || .5;
    FD.attract = !!data.attract;
    World.setMood(m.mood || 'day', m.rain || 0); RNG.reseed(data.seed || 7 + STATE.ep);
    const st = m.start ? C(m.start[0], m.start[1]) : C(22, 30);
    FD.me = makePlayer(m.player || 'dana', st, { ctl: data.ctl || (data.attract ? new BotCtl() : new HumanCtl(game.input)), cam: m.cam, cop: m.player !== 'tee' });
    FD.me.facing = m.startFacing || 0;
    if (m.corner) FD.corner = new CornerSim(Object.assign({ night: World.night, mode: m.player === 'tee' ? 'tee' : 'story', stash: FL().stashSpot, third: STATE.meters.heat >= 30 }, m.corner, m.player === 'tee' ? { player: FD.me } : {}));
    const nc = m.civilians === undefined ? 14 : m.civilians;
    for (let i = 0; i < nc; i++) this.spawnCiv(i);
    if (m.setup) m.setup(FD, data);
    game.follow(null); game.cam.bounds = v => World.map.bounds(v); FD.look = [0, 0];
    game.cam.snap = true;
    Music.play(m.music || 'field'); Music.layer('tension', 0, .1); Music.layer('pulse', 0, .1); Music.layer('alarm', 0, .1); Music.layer('stab', 0, .1);
    if (m.intro && !FD.attract) Talk.run(m.intro(FD), () => { if (m.afterIntro) m.afterIntro(FD); }); else if (m.afterIntro) m.afterIntro(FD);
    FD.evT = 40;
  },
  exit() { if (ui) ui.hud({}); game.lights.enabled = false; game.weather = null; game.setZoom && game.resetCamera(); },
  spawnCiv(i) {
    const s = SIDEWALK[Math.floor(RNG.world() * SIDEWALK.length)], p = C(s[0], s[1]);
    const a = new Agent({ id: 'civ' + i + '_' + Math.floor(RNG.world() * 1e5), x: p.x, y: p.y, seed: 100 + i * 31 + STATE.ep, speed: 30 + RNG.world() * 16 });
    a.civT = RNG.world() * 6; FD.civs.push(a); return a;
  },
  civTick(a, dt) {
    a.civT -= dt;
    if (a.civT <= 0 && !a.goal) {
      if (RNG.world() < .35) { a.doAct('idle', 3 + RNG.world() * 5, RNG.world() < .3 ? 'phone' : RNG.world() < .5 ? 'lean' : null); a.civT = a.actT; if (RNG.world() < .25) a.say(IDLE_CIV[Math.floor(RNG.world() * IDLE_CIV.length)]); }
      else { const s = SIDEWALK[Math.floor(RNG.world() * SIDEWALK.length)]; a.goCell(s[0], s[1]); a.civT = 2; }
    }
    a.update(dt);
  },
  all() { const c = FD.corner; return [...(c ? c.agents : []), ...FD.npcs, ...FD.civs]; },
  /** cops the corner watches: the player (when police) and the partner */
  cops() { const l = []; if (FD.me.cop) l.push(FD.me); if (FD.partner && FD.partner.cop) l.push(FD.partner); for (const e of FD.extraCops || []) l.push(e); return l; },
  interact(spec) { FD.inter.push(Object.assign({ r: 28, verb: 'Use', when: () => true }, spec)); return spec; },
  movePlayer(dt) {
    const p = FD.me, c = p.ctl, b = p.body;
    p.cam.watching = !p.noWatch ? c.watching() : false;   // you can shoot from the car: it's cover
    if (p.locked || p.action) { b.vx = b.vy = 0; if (p.action) p.action(dt); b.update(dt, World.map); this.rigPlayer(dt); return; }
    let g = c.ground();
    if (p.autoGoal) { if (Math.hypot(g[0], g[1]) > .2) p.autoGoal = null; else { const f = World.flow(...World.map.toCell(p.autoGoal.x, p.autoGoal.y)), n = f.next(b.x, b.y), t = n && dist(p, p.autoGoal) > 18 ? n : p.autoGoal, l = Math.hypot(t.x - b.x, t.y - b.y); g = l > 4 ? [(t.x - b.x) / l, (t.y - b.y) / l] : [0, 0]; if (dist(p, p.autoGoal) < Math.max(10, p.autoGoal.r || 0)) { const f2 = p.autoGoal.then; p.autoGoal = null; if (f2) f2(); } } }
    const mag = Math.min(1, Math.hypot(g[0], g[1]));
    if (c.pressed('crouch') && !p.inCar) { p.crouching = !p.crouching; sfx('step'); }
    const watching = p.cam.watching;
    p.blending = c.down('blend') && mag < .15 && !watching;
    const run = c.running() && mag > .2;
    let spd = p.crouching ? 32 : 52;
    if (run) spd = FD.pursuit && p.stamina > 0 && !p.winded ? 125 : 85;
    if (p.winded > 0) { p.winded -= dt; spd = Math.min(spd, 60); }
    if (watching) spd = 20;
    if (p.inCar || p.cover === 'sit' || p.hidden) spd = 0;
    p.sprinting = run && spd >= 120;
    if (FD.pursuit || FD.m.stamina) { if (p.sprinting) { p.stamina -= 14 * dt; if (p.stamina <= 0) { p.stamina = 0; p.winded = 2; sfx('hurt', { vol: .3 }); } } else p.stamina = Math.min(100, p.stamina + 10 * dt); }
    const k = spd * (mag < .62 && !run ? Math.max(mag / .62, 0) : 1);
    if (b.z <= .5 || !p.vaulting) { b.vx = g[0] / (mag || 1) * k * (mag > .05 ? 1 : 0); b.vy = g[1] / (mag || 1) * k * (mag > .05 ? 1 : 0); }
    if (p.cover === 'sit' && mag > .3) p.cover = null;
    p.moving = mag > .1 && spd > 0; p.still = p.moving ? 0 : p.still + dt;
    if (p.moving && !watching) p.facing = E.approachAng(p.facing, Math.atan2(g[1], g[0]), dt * 12);
    if (!p.inCar) b.update(dt, World.map);   // seated in the car: no collision with it
    // unstick: pushing for a second without moving (inside a prop's footprint) nudges you clear
    p.stuckT = mag > .5 && k > 10 && Math.hypot(b.x - (p.lastX || 0), b.y - (p.lastY || 0)) < .05 ? (p.stuckT || 0) + dt : 0; p.lastX = b.x; p.lastY = b.y;
    if (p.stuckT > 1) { p.stuckT = 0; for (let r = 10; r <= 30; r += 10) { let done = false; for (let a = 0; a < 8 && !done; a++) { const x = b.x + Math.cos(a * Math.PI / 4) * r, y = b.y + Math.sin(a * Math.PI / 4) * r; if (World.walkable(x, y)) { b.x = x; b.y = y; done = true; } } if (done) break; } }
    if (p.vaulting && b.onGround && b.z < .5) p.vaulting = false;
    this.rigPlayer(dt);
  },
  rigPlayer(dt) {
    const p = FD.me, b = p.body;
    p.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: p.facing, crouch: p.crouching, sprint: p.sprinting, air: b.z > 2,
      pose: p.pose ? POSE[p.pose] || p.pose : p.cam.watching ? 'cast' : p.cover === 'sit' ? 'kneel' : p.blending ? 'hips' : null });
  },
  /** the interactable the prompt names: the hovered one, else the nearest in reach */
  nearest() {
    const p = FD.me; let best = null, bd = 1e9;
    for (const it of FD.inter) { if (it.off || !it.when(FD)) continue; const at = typeof it.at === 'function' ? it.at() : it.at, d = Math.hypot(at.x - p.x, at.y - p.y); if (d < it.r && d < bd) { bd = d; best = it; } }
    return best;
  },
  update(dt) {
    if (Globals.tick(dt)) return;
    FD.t += dt;
    if (Talk.open) { Talk.update(dt); this.camTick(dt); return; }   // dialogue over a screen goes first
    if (UI.update(dt)) return;
    if (Talk.update(dt)) { this.camTick(dt); return; }
    const m = FD.m, p = FD.me, c = p.ctl;
    if (p.ctl.tick) p.ctl.tick();
    if (m.bot && FD.attract) m.bot(FD, dt);
    // the notebook and the map (Tab / N / M, Create on a pad: on release, and only without Options)
    if (!FD.attract && m.player !== 'tee' && (game.input.pressed('notebook') || game.input.pressed('map') || padCreate())) { Notebook.open(game.input.pressed('map') ? 'map' : 'objectives'); return; }
    if (!FD.attract && m.player === 'tee' && (game.input.pressed('notebook') || padCreate()) && m.pager) { m.pager(FD); return; }
    if (c.pressed('rotL')) { game.rotateView(-90); } if (c.pressed('rotR')) { game.rotateView(90); } if (c.pressed('camReset')) game.resetCamera();
    this.movePlayer(dt);
    FD.clock = Math.min(FD.clockEnd, FD.clock + dt * FD.clockRate);
    // interactables: hold ones fill a bar; a click on one in the world walks there and uses it
    const it = this.nearest(); FD.near = it;
    if (it && !p.cam.watching) {
      if (it.hold) { if (c.down('interact')) { if (p.holdOf !== it) { p.holdOf = it; p.holdT = 0; } p.holdT += dt; if (p.holdT >= it.hold) { p.holdT = 0; p.holdOf = null; it.act(FD, it); } } else { p.holdT = 0; p.holdOf = null; } }
      else if (c.pressed('interact')) it.act(FD, it);
    } else { p.holdT = 0; p.holdOf = null; }
    const clk = c.human && game.input.clicked && game.input.clicked();
    if (clk && !p.cam.watching && FD.hover) { const h = FD.hover, at = typeof h.at === 'function' ? h.at() : h.at; if (dist(p, at) < h.r && !h.hold) h.act(FD, h); else p.autoGoal = { x: at.x, y: at.y, r: h.r * .6, then: () => { if (!h.hold && h.when(FD)) h.act(FD, h); } }; }
    // watch and photos (police) / study (Tee)
    if (p.cam.watching) {
      tip('watch', 'Watch', 'Hold ' + Prompt.label('watch') + ' to raise the camera. Aim at a face and hold still until the ring closes.');
      Camera.update(dt, p.cam, p, c, this.all(), { onRead: a => this.onRead(a), botAim: FD.botAim });
      if (c.pressed('photo')) this.photo();
      p.aimAt = p.cam.aim;
    } else { p.cam.target = null; p.cam.readT = 0; p.aimAt = null; }
    // the world runs
    const cops = this.cops();
    if (FD.corner) FD.corner.update(dt, { policeSeen: this.policeSeen() });
    for (const a of FD.civs) this.civTick(a, dt);
    for (const a of FD.npcs) { if (a.brain) a.brain(a, dt, FD); a.update(dt); }
    if (FD.partner && FD.partner.brain) FD.partner.brain(FD.partner, dt, FD);
    // perception
    if (cops.length && !FD.attract) {
      const obs = this.observers();
      const r = Perception.update(dt, obs, cops, { night: World.night, lit: q => World.night && World.lamps.some(([x, y]) => Math.hypot(x - q.x, y - q.y) < 40), mul: m.suspicionMul || 1,
        onMade: (o, q) => this.onMade(o, q), onSearch: (o) => { if (o.say) o.say(RNG.cos() < .5 ? 'Who that?' : 'Yo. Look.'); } });
      FD.heat = r;
      Music.layer('tension', r.state !== 'calm' ? 1 : 0, 1); Music.layer('pulse', r.state === 'search' || r.state === 'alert' ? 1 : 0, 1);
      if (r.state === 'notice') tip('heat', 'Eyes on you', 'A ? over a head means someone noticed you. Keep moving, act natural (hold ' + Prompt.label('blend') + '), or take cover.');
    } else FD.heat = { level: 0, state: 'calm' };
    for (const q of cops) if (q.burned && game.time > q.burnT) { q.burned = false; toast('Cooled off', 'They stopped looking.'); }
    // random street life
    FD.evT -= dt; if (FD.evT <= 0) { FD.evT = 40 + RNG.cos() * 50; const k = RNG.cos(); sfx(k < .3 ? 'siren' : k < .6 ? 'dog' : 'busbrake', { vol: .4 }); }
    if (m.update) m.update(FD, dt);
    if (!FD.attract) this.hud();
    this.camTick(dt);
  },
  observers() { const c = FD.corner; return [...(c ? c.watchers() : []), ...FD.npcs.filter(a => a.watcher)]; },
  policeSeen() { const c = FD.corner; if (!c) return false; for (const l of c.crew.lookouts || []) for (const q of this.cops()) { const mind = l.minds[q.id]; if (mind && mind.state === 'alert' && mind.since < 2) return true; } return !!(c.patrol && c.patrol.on && (c.crew.lookouts || []).some(l => Math.hypot(l.x - c.patrol.x, l.y - c.patrol.y) < l.range)); },
  onMade(o, q) {
    if (FD.m.onMade && FD.m.onMade(FD, o, q) === false) return;
    if (q !== FD.me) return;
    FD.made++; STATE.stats.made++; FL().danaKnown = true; q.burned = true; q.burnT = game.time + 30;
    Perception.learn(this.observers(), o, q);
    if (FD.corner) FD.corner.shutdown('made', 60);
    meter('heat', 15, 'They made you');
    Music.sting('made'); Music.layer('alarm', 1, .2); Music.layer('stab', 1, .2); game.after(8, () => { Music.layer('alarm', 0, 2); Music.layer('stab', 0, 2); });
    tip('made', 'Made', 'They know your face now. The corner shuts down, your photos are worthless while they watch you. Walk away, come back later.');
  },
  onRead(a) {
    const f = 'obs:' + a.person + ':' + a.role;
    if (!a.person || !CAST[a.person]) return;
    if (addFact(f, 1, true)) { toast('Read: ' + ROLE_TAG[a.role], nameOf(a.person) + (hasFact('face:' + a.person) ? '' : ' (no face yet)')); sfx('pin'); BUS.emit('read', a); }
  },
  photo() {
    const p = FD.me, t = p.cam.target, ph = Camera.shoot(p.cam, p, t, { place: FD.m.place || 'Gaither & Ridley', clock: fmtTime(FD.clock) });
    if (!ph) { if (!FD.rollT) { FD.rollT = 1; toast('Out of film', 'Ren is bringing another roll.'); game.after(6, () => { p.cam.film += 12; FD.rollT = 0; toast('New roll', 'Twelve more shots, from Ren.'); }); } return; }
    tip('photo', 'Photos', 'Stars: ★ the face toward you, ★ the ring closed, ★ caught in the act. Blurry past range.');
    const who = t && t.person ? t.person : null;
    if (ph.stars) Music.sting('photoGood');
    toast((who ? nameOf(who) : t ? (t.tag ? t.tag.toUpperCase() : 'Civilian') : 'Nothing') + '  ' + '★'.repeat(ph.stars) + (ph.stars ? '' : ' Blurry'), ph.tags.filter(x => x.startsWith('act:')).map(x => x.slice(4)).join(' ') || (ph.stars ? '' : (Camera.score(p.cam, p, t).why || '')));
    if (who && ph.tags.includes('face') && CAST[who]) { if (addFact('face:' + who, 2, true)) addEvidence({ id: 'face:' + who, kind: 'photo', ref: ph.id, text: 'Face: ' + nameOf(who), who }); }
    if (who && ph.tags.includes('act')) { const act = ph.tags.find(x => x.startsWith('act:')).slice(4); const id = 'act:' + who + ':' + act; if (addFact(id, 5, true)) addEvidence({ id, kind: 'photo', ref: ph.id, text: nameOf(who) + ': ' + act.replace('-', ' ') + ' (' + fmtTime(FD.clock) + ')', who, act, direct: true }); }
    if (t && t.tag && ph.tags.includes('focus')) { if (addFact(t.tag, 5, true)) addEvidence({ id: t.tag, kind: 'plate', ref: ph.id, text: t.tagText || t.tag }); }
    BUS.emit('photo', ph, t);
    if (FD.m.onPhoto) FD.m.onPhoto(FD, ph, t);
  },
  camTick(dt) {
    const p = FD.me; let tx = p.x, ty = p.y;
    if (p.cam.watching && p.cam.aim) { tx = lerp(p.x, p.cam.aim.x, .6); ty = lerp(p.y, p.cam.aim.y, .6); }
    else { const s = p.ctl.aimStick ? p.ctl.aimStick() : [0, 0]; if (Math.hypot(s[0], s[1]) > .3) { const d = game.view.screenDirToGround(s[0], s[1]); FD.look[0] = lerp(FD.look[0], d[0] * 64, dt * 4); FD.look[1] = lerp(FD.look[1], d[1] * 64, dt * 4); } else { FD.look[0] *= 1 - dt * 3; FD.look[1] *= 1 - dt * 3; } tx += FD.look[0]; ty += FD.look[1]; }
    if (FD.camAt) { tx = FD.camAt.x; ty = FD.camAt.y; }
    game.focus(tx, ty, p.body.z + 16);
  },
  hud() {
    const m = FD.m, p = FD.me, h = FD.heat || { level: 0, state: 'calm' }, it = FD.near, obj = m.objective ? m.objective(FD) : null;
    const st = p.inCar ? { text: 'In the car', color: '#9ad0ff' } : p.hidden ? { text: 'Inside', color: '#9ae89a' } : p.burned ? { text: 'MADE', color: '#ff4a3a' } : p.blending ? { text: 'Blending', color: '#9ae89a' } : p.winded > 0 ? { text: 'Winded', color: '#ffb347' }
      : h.state === 'alert' ? { text: 'MADE', color: '#ff4a3a' } : h.state === 'search' ? { text: 'Watched', color: '#ff9a40' } : h.state === 'notice' ? { text: 'Noticed', color: '#ffc040' } : m.player === 'tee' ? null : { text: 'Unnoticed', color: '#cfc8b8' };
    const bars = [];
    if (p.cop) bars.push({ label: 'Eyes on you', value: Math.min(1, h.level), max: 1, color: h.state === 'calm' ? '#9a9080' : '#ff7a4a' });
    if (FD.pursuit || m.stamina) bars.push({ label: 'Stamina', value: p.stamina, max: 100, color: p.winded > 0 ? '#ff6040' : '#7ad06a' });
    if (m.bars) bars.push(...m.bars(FD));
    const counts = m.counts ? m.counts(FD) : [['Film', p.cam.film], ['Fund', '$' + STATE.meters.fund]];
    let prompt = null;
    if (it && !p.cam.watching) prompt = { act: 'interact', label: vb(it), hint: it.hint, progress: it.hold && p.holdOf === it ? p.holdT / it.hold : undefined };
    else if (p.cam.watching && m.player !== 'tee') prompt = { act: 'photo', label: 'Take photo', hint: p.cam.target ? '' : 'Aim at someone' };
    else if (m.prompt) prompt = m.prompt(FD);
    const markers = []; if (obj && obj.at) markers.push({ x: obj.at.x, y: obj.at.y, color: '#ffb347' });
    ui.hud({ objective: obj ? Object.assign({ from: p }, obj) : null, status: st, bars, counts, prompt, place: fmtTime(FD.clock) + ' · ' + (m.place || 'Penn Row'),
      minimap: { map: World.map, at: p, markers } });
  },
  draw(r) {
    const m = FD.m, p = FD.me;
    World.draw(r, { memorial: m.memorial !== false });
    if (m.drawUnder) m.drawUnder(FD, r);
    if (FD.corner) FD.corner.drawPolice(r);
    // sight cones (assist): lookouts near you
    if (game.settings.cones && p.cop && !FD.attract) for (const o of this.observers()) { if (o.gone || dist(o, p) > 260) continue; const mind = o.minds[p.id], s = mind ? mind.state : 'calm';
      r.sightCone({ x: o.x, y: o.y, z: o.z, facing: o.facing }, { map: World.map, range: o.range, fov: o.fov, color: { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' }[s], alpha: s === 'calm' ? .14 : .3 }); }
    for (const a of this.all()) a.draw(r);
    if (FD.partner) FD.partner.draw(r, { xray: { color: '#7aa7ff' } });
    if (!p.hidden && !p.inCar) { r.shadow(p.x, p.y, 6, .35); r.actor(p.x, p.y, p.body.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { xray: { color: '#ffb347', actors: true }, pick: p }); p.scr = r.w(p.x, p.y, 22); p.head = r.w(p.x, p.y, 46); }
    if (m.draw) m.draw(FD, r);
    // interactables: a marker on the nearest; hover with the mouse highlights one
    FD.hover = null; const ptr = game.input.pointer && Prompt.dev === 'kbm' ? game.input.pointer() : null;
    for (const it of FD.inter) { if (it.off || !it.when(FD)) continue; const at = typeof it.at === 'function' ? it.at() : it.at, s = r.w(at.x, at.y, it.z || 10); it.scr = s;
      if (ptr && Math.hypot(ptr[0] - s[0], ptr[1] - s[1]) < 14) FD.hover = it; }
    const obj = m.objective ? m.objective(FD) : null; if (obj && obj.at && !FD.attract) r.marker(obj.at.x, obj.at.y, obj.at.z || 0, { label: obj.short || '', color: '#ffb347' });
    r.overlay(g => {
      for (const it of FD.inter) if (it.scr && !it.off && it.when(FD) && (it === FD.near || it === FD.hover)) { const [x, y] = it.scr; px.line(g, x - 4, y - 14, x, y - 10, '#ffb347'); px.line(g, x + 4, y - 14, x, y - 10, '#ffb347'); if (it === FD.hover) E.font.text(g, vb(it), Math.round(x), Math.round(y) - 24, '#ffb347', { align: 'center', shadow: '#000', outline: false }); }
      // ? and ! over watchers' heads, with their meter toward you
      for (const o of this.observers()) { const mind = o.minds[p.id]; if (!mind || mind.state === 'calm' || !o.head) continue; const [x, y] = o.head, a = mind.state === 'alert';
        E.font.text(g, a ? '!' : mind.state === 'search' ? '??' : '?', Math.round(x), Math.round(y) - 12, a ? '#ff4a3a' : '#ffc040', { align: 'center', shadow: '#000' }); E.ui.bar(g, Math.round(x) - 6, Math.round(y) - 3, 12, 2, Math.min(1, mind.level), a ? '#ff4a3a' : '#ffc040'); }
    });
    drawBubbles(r, [...this.all(), ...(FD.partner ? [FD.partner] : []), p], p, a => this.readable(a));
    Camera.draw(r, p.cam, p);
    if (m.overlay) m.overlay(FD, r);
    Talk.draw(r);
    Attract.overlay(r);
  },
  /** eavesdropping: barks read within 48 units while the speaker isn't onto you; intel barks log a fact */
  readable(a) {
    const p = FD.me; if (a === p || !a.bubble) return true; const d = dist(a, p), mind = a.minds && a.minds[p.id];
    const ok = d < (FD.m.hearRange || 56) && (!mind || mind.state === 'calm');
    if (ok && a.bubble.intel && !a.bubble.logged) { a.bubble.logged = true; if (addFact(a.bubble.intel, 1, true)) { toast('Overheard', a.bubble.text); if (FD.m.onIntel) FD.m.onIntel(FD, a.bubble.intel); } }
    if (ok && !a.bubble.voiced && d < 90) { a.bubble.voiced = true; const t = a.bubble.text; for (let i = 0; i < t.length; i++) game.after(i / 30, () => Voice.char(t[i], a.voice)); }
    return ok;
  }
};
/* Create (Pad8) opens the notebook on release, and only if Options wasn't pressed during the hold (Create+Options is the hub's) */
let _cHeld = false, _cOpt = false;
function padCreate() {
  const I = game.input, held = I.held && (I.held.has ? I.held.has('Pad8') : I.held.includes && I.held.includes('Pad8'));
  if (held) { if (!_cHeld) { _cHeld = true; _cOpt = false; } if (I.down('pause')) _cOpt = true; I.suppress && I.suppress('pause'); return false; }
  if (_cHeld) { _cHeld = false; return !_cOpt; }
  return false;
}
FD.interact = s => Field.interact(s);
