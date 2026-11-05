// 07-field: the neighborhood scene. Dana on foot (watch, photograph, blend, tail, chase, search) and Tee on the corner (serve, call out).
const Field = {
  S: null, dana: null, sim: null, map: null, m: null, ui: null, fx: [], t: 0, reticle: { x: 0, y: 0 }, watching: false, watchToggle: false, runToggle: false, crouch: false, stamina: 100, winded: 0, flash: 0, cooldown: 0,
  focusId: null, focusT: 0, polaroid: null, nearIx: null, tail: 0, tailLost: 0, made: 0, over: null, cam: { x: 0, y: 0 }, fleeing: false, chaseT: 0, cuff: 0, search: {}, tee: { cash: 0, left: 180, saved: 0, busted: 0, calls: 0, wrong: 0, cops: 0, copT: 12 },
  enter(data) {
    UI.closeAll(); const m = this.m = MISSIONS[(data && data.mission) || 'ep1']; this.data = data || {};
    this.map = makeMap(); this.sim = new Sim(this.map, { civs: m.civs == null ? 14 : m.civs }).populate(); this.fx = []; this.t = 0; this.over = null; this.made = 0; this.watching = false; this.stamina = 100; this.polaroid = null; this.search = {}; this.fleeing = false; this.tail = 0; this.cuff = 0; this.chaseT = 0;
    this.tailPhase = null; this.tailLost = 0; this.tail = 0; this.runner = null; this.raidBlown = false; this.raidSpots = null; this.slots = {}; this.phones = {}; this.tee = { cash: 0, left: 180, saved: 0, busted: 0, calls: 0, wrong: 0, cops: 0, copT: 10 }; this.reticle = { x: 0, y: 0 };
    const start = this.sim.spawnTag(m.start || 'dana');
    if (m.mode === 'tee') {
      this.dana = this.sim.tee; this.dana.ctl = new HumanController(game.input); this.dana.kind = 'sub'; this.dana.role = 'dealer';
    } else {
      this.dana = new Person({ kind: 'sub', role: 'dana', name: 'Dana', x: start.x, y: start.y, rig: CAST.dana.rig, cast: 'dana' }); this.dana.ctl = new HumanController(game.input); this.dana.speed = SPEED.walk;
    }
    if (data && data.attract) { this.dana.ctl = new BotController(); this.dana.ctl.bot = true; this.botS = { stage: 0, t: 0 }; }
    if (/^vs/.test(m.mode)) { this.vs = { left: (data && data.seconds) || 120, score: 0, scores: {} }; }
    this.dana.facing = 0; this.dana.heat = 0; this.cam = { x: this.dana.x, y: this.dana.y };
    if (m.mode === 'tail' || m.mode === 'chase') { this.sim.civCap = 8; this.runner = this.sim.runner; this.runner.flags.cycle = 1; this.runner.state = 'wait'; this.runner.stT = 0; this.runner.x = this.sim.spawnTag('stash').x; this.runner.y = this.sim.spawnTag('stash').y; this.tailPhase = 'wait'; }
    if (m.mode === 'vs2') this.setupVs2();
    if (m.mode === 'raid') this.setupRaid();
    game.lights.enabled = true; game.lights.ambient = m.mode === 'tee' ? .5 : .42; game.weather = { kind: 'rain', amount: .35, wind: .15 };
    game.setZoom && game.setZoom(1); game.cam.bounds = v => this.map.bounds(v); Sound.music(m.music || 'field'); try { game.audio.layer('drums', 0, .1); } catch (e) { /* no layer */ }
    this.hint = m.intro && m.intro[0]; this.ixList = this.interactables();
    if (m.briefing && !(data && (data.attract || data.hub))) this.brief(m.briefing);
  },
  brief(lines) { UI.open({ kicker: this.m.kicker, title: this.m.title, cls: 'brief', body: () => '<p>' + lines.map(l => esc(say(l)).replace(/\{(\w+)\}/g, (a, k) => lbl(k))).join('</p><p>') + '</p>', items: [{ label: 'Go' }], legend: [['confirm', 'Begin']], onBack: () => UI.close(), back: true }).items[0].fn = () => { UI.close(); Sound.sfx('good'); }; },
  exit() { if (this.k1) { this.k1.dispose(); this.k2.dispose(); this.k1 = this.k2 = null; } if (game.splitScreen) game.splitScreen(0); this.p2 = null; game.lights.enabled = false; game.weather = null; if (this.watching) game.setZoom(1); this.watching = false; ui && ui.hud && ui.hud({}); Hud.set(''); },
  interactables() {
    const m = this.m, sp = t => this.sim.spawnTag(t), L = [];
    if (m.mode === 'surv') { L.push({ id: 'ph1', at: sp('phone1'), label: 'Read payphone', fn: () => this.readPhone('ph1', '555-0143') }, { id: 'ph2', at: sp('phone2'), label: 'Read payphone', fn: () => this.readPhone('ph2', '555-0188') }); }
    if (m.mode !== 'tee') L.push({ id: 'annex', at: sp('annex'), label: m.leave || 'Back to the Annex', fn: () => this.leave() });
    if (m.mode === 'raid') for (const k of ['stashA', 'stashB', 'stashC']) L.push({ id: k, at: this.raidSpots[k], label: 'Search', hold: 2.2, fn: () => this.searchSpot(k) });
    return L;
  },
  readPhone(id, num) { if (this.phones[id]) { Hud.toast('Payphone', 'Already logged ' + num); return; } this.phones[id] = num; STATE.cipher['phone_' + id] = num; Sound.sfx('good'); Hud.toast('Payphone ' + (Object.keys(this.phones).length) + '/2', num + ' scratched into the housing'); },
  leave() { if (this.m.mode === 'surv' && !this.done()) { Hud.toast('Not yet', this.m.goal); Sound.sfx('deny'); return; } this.finish(true); },
  done() { const m = this.m; if (m.mode === 'surv') return m.slots.every(s => this.slots[s]); return false; },
  finish(ok) { if (this.over) return; this.over = ok ? 'ok' : 'fail'; Director.missionEnd(this.m.id, ok, this.summary()); },
  summary() { return { slots: Object.keys(this.slots), phones: Object.keys(this.phones).length, made: this.made, cash: this.tee.cash, found: Object.keys(this.search).length }; },
  // ---------- raid ----------
  setupRaid() { const g = this.sim.spawnTag('garage'); this.raidSpots = { stashA: { x: g.x - 36, y: g.y - 10 }, stashB: { x: g.x + 10, y: g.y + 34 }, stashC: { x: g.x + 40, y: g.y - 20 } };
    this.sim.people.forEach(p => { if (p.kind === 'crew' || p.role === 'civ') { p.gone = p.role === 'civ' && rnd() < .6; } });
    this.sim.civCap = 4; this.guards = []; for (const [i, off] of [[0, [-60, 20]], [1, [30, -30]]]) { const c = cc(36 + i * 4, 4); const p = this.sim.add({ kind: 'crew', role: 'lookout', cast: 'look', name: 'Guard', rig: CAST.look.rig, x: c.x, y: c.y, post: { x: c.x, y: c.y }, sweep: i * 3 }); this.guards.push(p); }
    this.slim = this.sim.add({ kind: 'crew', role: 'boss', cast: 'slim', name: CAST.slim.name, rig: CAST.slim.rig, x: g.x, y: g.y + 4, post: { x: g.x, y: g.y + 4 } }); this.slim.pose = 'hips';
    this.sim.look1.gone = this.sim.look2.gone = this.sim.look3.gone = true; this.sim.tee.gone = this.sim.dealer2.gone = this.sim.runner.gone = true; },
  searchSpot(k) { if (this.search[k]) return; this.search[k] = 1; STATE.caseScore += 12; Sound.sfx('cash'); game.particles.glints && game.particles.glints(this.raidSpots[k].x, this.raidSpots[k].y, 10, 8, '#ffe080'); Hud.toast('Found', ['Bundles under a tarp: 14 vials per bag', 'A ledger in a coffee can', 'A shoebox of burner phones'][Object.keys(this.search).length - 1] || 'Stash'); if (Object.keys(this.search).length >= 3) this.finish(true); },
  // ---------- per step ----------
  update(dt) {
    this.t += dt; const I = game.input, m = this.m, D = this.dana, sim = this.sim; if (this.k1) { this.k1.poll(); this.k2.poll(); }
    if (this.data.hub) { Net.stamp && Net.stamp(); Net.tick(dt, this); Net.interp(dt); if (AIHub.server) { D.hidden = true; D.heat = 0; } }
    if (UI.isOpen) { Hud.set(''); sim.update(0, D); return; }
    if (this.over) { return; }
    if (I.pressed('notebook')) { Screens.notebook(); return; }
    this.cooldown = Math.max(0, this.cooldown - dt); this.flash = Math.max(0, this.flash - dt);
    this.control(dt); sim.update(dt, D);
    if (D.ctl.bot) this.botThink(dt);
    if (m.mode === 'tee') this.teeStep(dt); else this.dealStep(dt); if (/^vs/.test(m.mode)) this.vsStep(dt); if (m.mode === 'vs2') this.p2Step(dt);
    Ambience.tick(dt); this.interactStep(dt); this.camStep(dt); this.hudStep();
    for (const e of sim.events.splice(0)) this.onSim(e);
  },
  control(dt) {
    const I = this.dana.ctl, D = this.dana, tee = this.m.mode === 'tee';
    const mv = D.ctl.move(), dir = D.ctl.ground ? D.ctl.ground : game.view.screenDirToGround(mv[0], mv[1]), mag = Math.min(1, Math.hypot(dir[0], dir[1]));
    if (!tee && I.pressed('watch') && game.settings.watchMode === 'toggle') this.watchToggle = !this.watchToggle;
    const wantWatch = !tee && !this.fleeing && (game.settings.watchMode === 'toggle' ? this.watchToggle : I.down('watch'));
    if (wantWatch !== this.watching) { this.watching = wantWatch; D.watching = wantWatch; game.setZoom(wantWatch ? 1.55 : 1); this.reticle = { x: D.x + Math.cos(D.facing) * 70, y: D.y + Math.sin(D.facing) * 70 }; this.focusT = 0; Sound.sfx('focus'); }
    if (I.pressed('crouch')) { this.crouch = !this.crouch; }
    if (game.settings.runMode === 'toggle' && I.pressed('sprint')) this.runToggle = !this.runToggle;
    const wantRun = game.settings.runMode === 'toggle' ? this.runToggle : I.down('sprint');
    D.blending = I.down('blend') && !this.watching; D.crouching = this.crouch && !this.watching; D.running = wantRun && mag > .3 && this.stamina > 0 && !D.crouching && !D.blending && !this.watching;
    if (D.running) this.stamina = Math.max(0, this.stamina - (this.fleeing || this.m.mode === 'chase' ? 22 : 12) * dt); else this.stamina = Math.min(100, this.stamina + (mag < .1 ? 24 : 9) * dt);
    if (this.stamina <= 0) { this.winded = 1.5; } this.winded = Math.max(0, this.winded - dt); if (this.winded > 0) D.running = false;
    let sp = D.running ? SPEED.run : D.crouching ? SPEED.crouch : D.blending ? SPEED.blend : SPEED.walk; if (this.watching) sp = 0; if (this.winded > 0) sp *= .6; if (this.cuff > 0) sp = 0; if (tee) sp *= 1.05;
    D.body.vx = dir[0] * sp * mag; D.body.vy = dir[1] * sp * mag; D.moving = mag > .1 && sp > 0;
    if (D.moving && !this.watching) D.facing = Math.atan2(dir[1], dir[0]);
    D.stepBody(dt, this.map); D.poseRig(dt); D.pose = D.crouching ? 'crouch' : (D.blending ? 'hips' : null);
    // reticle: mouse on the ground, or the right stick
    if (this.watching && D.ctl.kb) { if (mag > .1) D.facing = Math.atan2(dir[1], dir[0]); let rx = D.x + Math.cos(D.facing) * 90, ry = D.y + Math.sin(D.facing) * 90, bd = 40; for (const p of this.sim.people) { if (p === D || p.hidden || p.gone) continue; const dd = Math.hypot(p.x - rx, p.y - ry); if (dd < bd) { bd = dd; rx = p.x; ry = p.y; } } this.reticle = { x: rx, y: ry }; }
    else if (this.watching && D.ctl.bot) { /* bot sets reticle */ } else if (this.watching) {
      const pa = padAxes(), rs = [dz(pa.r[0]), dz(pa.r[1])];
      if (rs[0] || rs[1]) { const g = game.view.screenDirToGround(rs[0], rs[1]); this.reticle.x += g[0] * 130 * dt; this.reticle.y += g[1] * 130 * dt; }
      else if (game.input.lastDevice === 'mouse' || game.input.lastDevice === 'keyboard') { const mg = game.mouseGround && game.mouseGround(); if (mg) { this.reticle.x = mg[0] != null ? mg[0] : mg.x; this.reticle.y = mg[1] != null ? mg[1] : mg.y; } }
      const dx = this.reticle.x - D.x, dy = this.reticle.y - D.y, d = Math.hypot(dx, dy), maxd = 210; if (d > maxd) { this.reticle.x = D.x + dx / d * maxd; this.reticle.y = D.y + dy / d * maxd; }
      D.facing = Math.atan2(this.reticle.y - D.y, this.reticle.x - D.x);
    }
  },
  setupVs2() {
    this.k1 = new KeyController(P1_KEYS, 0); this.k2 = new KeyController(P2_KEYS, 1); this.dana.ctl = this.k1; this.p2 = this.sim.tee; this.p2.ctl = this.k2; this.p2.kind = 'crew'; this.p2.cashStart = 0; this.sim.civCap = 14;
    this.vs.cash = 0; if (game.splitScreen) game.splitScreen(2, { follow: [this.dana, this.p2], z: 10 });
  },
  p2Step(dt) {
    const T = this.p2, C = T.ctl, sim = this.sim, D = this.dana; const mv = C.move(), g = game.view.screenDirToGround(mv[0], mv[1]), mag = Math.min(1, Math.hypot(g[0], g[1]));
    const sp = (C.down('sprint') ? SPEED.run : SPEED.walk) * 1.05; T.body.vx = g[0] * sp * mag; T.body.vy = g[1] * sp * mag; if (mag > .1) T.facing = Math.atan2(g[1], g[0]); T.stepBody(dt, this.map); T.poseRig(dt);
    if (C.pressed('interact')) { const b = sim.people.find(p => p.role === 'buyer' && p.state === 'wait' && dist2(p, T) < 24); if (b) { b.state = 'deal'; b.stT = 0; b.act = true; T.flags.dealT = 3.2; Sound.sfx('cash'); } }
    if (T.flags.dealT > 0) { T.flags.dealT -= dt; T.act = true; } else T.act = false;
    for (const p of sim.people) if (p.role === 'buyer') p.pose = p.state === 'wait' ? 'wave' : null;
    if (C.pressed('partner')) { const d = dist2(T, D), seen = this.map.sight({ x: T.x, y: T.y, z: 0 }, { x: D.x, y: D.y, z: 8 }); if (d < 220 && seen && (D.heat || 0) > .3) { Sound.sfx('whistle'); Hud.toast('Called out!', 'The detective is burned for a while.'); this.getMade(T); this.vs.score = Math.max(0, this.vs.score - 6); } else { sim.cash = Math.max(0, sim.cash - 20); Hud.toast('Wrong call', 'Nobody there. -$20'); Sound.sfx('bad'); } }
    this.vs.cash = sim.cash;
  },
  dealStep(dt) {
    const D = this.dana, sim = this.sim, m = this.m;
    if (this.data.attract) { D.heat = 0; STATE.film = Math.max(STATE.film, 20); }
    else if (m.mode !== 'raid') { const made = Perception.update(sim, D, dt); if (made) this.getMade(made); }
    else { for (const o of sim.people) { if (o.kind !== 'crew') continue; const r = Perception.look(o, D, this.map, { k: diff().susp }); o.susp = r.seen ? Math.min(1.05, o.susp + r.rate * dt * 1.4) : Math.max(0, o.susp - .15 * dt); o.alertFlag = o.susp > .6 ? '!' : o.susp > .25 ? '?' : ''; D.heat = Math.max(D.heat || 0, o.susp); if (o.susp >= 1 && !this.raidBlown) { this.raidBlown = true; Hud.toast('MADE', 'They are dumping the stash!'); Sound.sfx('made'); for (const k of ['stashA', 'stashB', 'stashC']) if (!this.search[k] && rnd() < .6) this.search[k] = -1; } } }
    if (this.watching) this.watchStep(dt);
    if (m.mode === 'tail' || m.mode === 'chase') this.tailStep(dt);
    D.heat = D.heat || 0;
  },
  getMade(o) {
    this.made++; STATE.stats.madeCount++; STATE.heat = Math.min(100, STATE.heat + 15); Sound.sfx('made'); game.flash('#ff3030', .35, .5); game.shake && game.shake(4);
    Hud.toast('You have been MADE', 'The corner goes quiet. Brass: ' + Math.round(STATE.brass));
    this.sim.people.forEach(p => { p.susp = 0; p.noticed = false; }); this.sim.hideCorner(/^vs/.test(this.m.mode) ? 8 : 24 + this.made * 6); STATE.brass = Math.max(0, STATE.brass - 8);
    if (this.m.mode === 'tail' && this.tailPhase !== 'chase') { this.tailPhase = 'blown'; }
    if (this.made >= 3 && !/^vs/.test(this.m.mode)) { this.over = 'shut'; Director.shutdown('Made three times. The corner moved and the Major pulled the plug on the detail.'); }
  },
  watchStep(dt) {
    const D = this.dana, I = D.ctl, R = this.reticle; let best = null, bd = 16;
    for (const p of this.sim.people) { if (p.hidden || p.gone) continue; const d = Math.hypot(p.x - R.x, p.y - R.y); if (d < bd && dist2(p, D) < 250 && this.map.sight({ x: D.x, y: D.y, z: 0 }, { x: p.x, y: p.y, z: 8 })) { best = p; bd = d; } }
    if (best && best.id === this.focusId) this.focusT += dt; else { this.focusId = best && best.id; this.focusT = 0; }
    this.focus = best; if (best && this.focusT > .7 && !best.read) { best.read = 1; Sound.sfx('good', { vol: .4 }); }
    if (I.pressed('photo') && this.cooldown <= 0) this.shoot(best);
  },
  shoot(p) {
    const D = this.dana; if (STATE.film <= 0) { Hud.toast('Out of film', 'Back to the Annex for more'); Sound.sfx('deny'); return; }
    STATE.film--; this.cooldown = .7; this.flash = .12; Sound.sfx('shutter'); Sound.sfx('shutter2'); game.flash('#ffffff', .1, .5);
    if (!p) { this.polaroid = { t: 2, txt: 'Nothing in frame', col: '#999', stars: 0 }; return; }
    const d = dist2(p, D), stars = d < 110 ? 3 : d < 170 ? 2 : 1, still = p.act, role = p.role;
    const slotFor = { dealer: 'tee', runner: 'runner', lookout: 'lookout', buyer: 'buyer', boss: 'boss' }[role]; let slot = slotFor;
    if (p === this.sim.dealer2) slot = null;
    const good = slot && ((slot === 'lookout' && stars >= 2) || (slot === 'tee' && p.act) || (slot === 'runner' && (p.carry || p.act)) || (slot === 'buyer' && p.act));
    const cap = { dealer: p.cast === 'tee' ? 'Mabry' : 'corner boy', runner: 'runner', lookout: 'lookout', buyer: 'buyer', boss: 'Dawkins' }[role] || 'civilian';
    this.polaroid = { t: 2.4, txt: (cap + (p.act ? ' · ACT' : '')).toUpperCase(), stars, col: good ? '#8fe08f' : '#e0c070', p: p.id };
    if (/^vs/.test(this.m.mode)) { if (good && this.t - (p.vsShot || -99) > 6) { p.vsShot = this.t; const pts = stars * (p.act ? 10 : 4); this.vs.score += pts; Hud.toast('+' + pts, cap.toUpperCase() + (p.act ? ' · ACT' : '')); Sound.sfx('good'); Net.claim(p, pts); } else if (!good) { Hud.toast('Not usable', 'Catch the hand-to-hand'); } return; }
    if (good && !this.slots[slot]) { this.slots[slot] = { stars, act: p.act, t: this.t }; STATE.photos.push({ slot, stars, act: !!p.act, cast: p.cast || 'civ' }); STATE.stats.photos++; STATE.caseScore += 8 * stars; Hud.toast('★'.repeat(stars) + '☆'.repeat(3 - stars) + ' ' + cap.toUpperCase() + (p.act ? ' · ACT' : ''), 'Goes on the Board'); bus.emit('photo', slot); Sound.sfx('good'); }
    else if (good) Hud.toast('Have that one', 'Find someone else on the Board'); else if (slot) Hud.toast('Not usable', slot === 'tee' || slot === 'buyer' ? 'Catch the hand-to-hand: wait for the ACT' : 'Closer, or catch them carrying'); else Hud.toast('Nobody you need', 'Just a person on a corner');
  },
  tailStep(dt) {
    const m = this.m, R = this.runner, D = this.dana, sim = this.sim; if (!R) return;
    if (this.tailPhase === 'wait') { this.hint = 'Wait near the stash for the runner to move'; R.flags.cycle = 4; if (R.state === 'toStash' || R.state === 'pickup' || R.state === 'toPit') { this.tailPhase = 'tail'; } if (dist2(D, R) < 220 && R.state === 'wait' && R.stT > 2) { R.state = 'toStash'; } return; }
    if (this.tailPhase === 'tail') {
      const d = dist2(D, R), vis = this.map.sight({ x: D.x, y: D.y, z: 0 }, { x: R.x, y: R.y, z: 8 }), tol = diff().tail;
      if (d > 220 || !vis && d > 120) this.tailLost += dt; else this.tailLost = Math.max(0, this.tailLost - dt * 2);
      this.tail = clamp(1 - this.tailLost / tol, 0, 1);
      if (d < 38 && D.running) { R.susp += dt * .5; }
      if (R.state === 'drop' || (R.state === 'toPit' && dist2(R, sim.spawnTag('tee')) < 40)) { if (this.tail < .35) { Hud.toast('Unseen drop', 'You were too far to see it. He starts over.'); this.tailPhase = 'blown'; return; } if (m.mode === 'chase') this.startChase(); else this.finish(true); return; }
      if (this.tailLost >= tol) { Hud.toast('Lost him', 'The runner slipped away. Reset.'); this.tailPhase = 'blown'; }
      if (R.susp > .99) { Hud.toast('He made you', 'The runner dumps his package.'); this.tailPhase = 'blown'; }
    }
    if (this.tailPhase === 'blown') { this.tailLost = 0; R.susp = 0; R.state = 'wait'; R.stT = 0; R.flags.cycle = 6; const s = sim.spawnTag('stash'); R.x = s.x; R.y = s.y; this.tailPhase = 'wait'; STATE.brass = Math.max(0, STATE.brass - 4); }
    if (this.tailPhase === 'chase') this.chaseStep(dt);
  },
  vsStep(dt) {
    const v = this.vs; v.left -= dt; if (v.left <= 0 && !this.over) { this.over = 'vs'; Director.versusEnd(this); }
  },
  startChase() {
    const R = this.runner; this.tailPhase = 'chase'; this.fleeing = true; R.flags.fleeing = true; R.state = 'flee'; this.chasePath = [[41, 9], [41, 13], [34, 13], [28, 13], [21, 13], [21, 19], [10, 19]].map(c => cc(c[0], c[1])); this.chaseI = 0; this.chaseT = 0; this.stamina = 100;
    Hud.toast('He bolted', 'Run him down: ' + lbl('sprint') + ' to run, ' + lbl('interact') + ' to tackle'); Sound.sfx('whistle'); this.watching = false; game.setZoom(1);
  },
  chaseStep(dt) {
    const R = this.runner, D = this.dana; this.chaseT += dt; const t = this.chasePath[this.chaseI];
    if (!t) { this.finish(false); return; }
    if (R.goTo(t.x, t.y, this.chaseT < 2 ? 70 : 80, dt, this.map)) this.chaseI++;
    R.running = true;
    const d = dist2(R, D);
    if (d < 26 && D.ctl.pressed('interact') || (d < 8)) { this.tackle(); }
    if (this.chaseT > 28) { Hud.toast('He got away', 'Retry'); this.finish(false); }
  },
  tackle() { const R = this.runner; R.downT = .01; R.stop(); R.flags.fleeing = true; Sound.sfx('tackle'); game.shake && game.shake(5); game.particles.dust && game.particles.dust(R.x, R.y, 4, 10); this.tailPhase = 'cuffing'; this.cuff = 1.4; this.dana.stop(); Hud.toast('Tackled', 'Cuffing...'); },
  interactStep(dt) {
    const D = this.dana; this.nearIx = null; let bd = 24;
    if (this.m.mode !== 'tee') for (const it of this.ixList) { const d = Math.hypot(it.at.x - D.x, it.at.y - D.y); if (d < bd) { bd = d; this.nearIx = it; } }
    if (this.tailPhase === 'cuffing') { this.cuff -= dt; if (this.cuff <= 0) { Sound.sfx('cuff'); STATE.stats.arrests++; this.finish(true); } }
    const it = this.nearIx; if (it && !this.watching && !this.fleeing) {
      const hold = it.hold || 0, I = D.ctl; if (hold) { if (I.down('interact')) { it.prog = (it.prog || 0) + dt; if (it.prog >= hold) { it.prog = 0; it.fn(); } } else it.prog = 0; }
      else if (I.pressed('interact')) it.fn();
    } else if (this.ixList) this.ixList.forEach(i => { i.prog = 0; });
  },
  teeStep(dt) {
    const D = this.dana, T = this.tee, sim = this.sim, I = D.ctl; T.left -= dt; D.heat = 0;
    T.copT -= dt; if (T.copT <= 0 && sim.people.filter(p => p.role === 'cop' && !p.gone).length < 2) { T.copT = 14 + rnd() * 6; const e = [[2, 13], [45, 19], [24, 3], [24, 30]][Math.floor(rnd() * 4)]; sim.spawnCop(e); T.cops++; }
    if (!this.watching && I.pressed('interact')) { const b = sim.people.find(p => p.role === 'buyer' && p.state === 'wait' && dist2(p, D) < 24); if (b) { b.state = 'deal'; b.stT = 0; b.act = true; D.flags.dealT = 3.2; Sound.sfx('cash'); } }
    if (I.pressed('partner')) this.callOut();
    for (const p of sim.people) if (p.role === 'buyer' && p.state === 'wait') p.pose = 'wave'; else if (p.role === 'buyer') p.pose = null;
    if (D.flags.dealT > 0) D.flags.dealT -= dt;
    for (const p of sim.people) if (p.role === 'cop' && !p.hold && p.state === 'approach' && !p.flags.called && dist2(p, D) < 150 && !p.flags.seen) { p.flags.seen = 1; }
    this.cash = sim.cash; T.cash = sim.cash; if (T.left <= 0) { this.over = 'done'; Director.missionEnd(this.m.id, T.cash >= this.m.target, { cash: T.cash, saved: T.saved, busted: T.busted }); }
    if (T.cash >= this.m.target && !T.hit) { T.hit = 1; Hud.toast('Count made', money(T.cash) + '. Keep it moving till the clock runs.'); }
  },
  callOut() {
    const D = this.dana, T = this.tee; let best = null, bd = 190;
    for (const p of this.sim.people) { if (p.gone || p === D || p.kind === 'crew' || p.role === 'buyer') continue; const d = dist2(p, D); if (d < bd && this.map.sight({ x: D.x, y: D.y, z: 0 }, { x: p.x, y: p.y, z: 8 })) { bd = d; best = p; } }
    T.calls++; if (!best) { Hud.toast('Call out', 'Nobody close enough to point at'); return; } Sound.sfx('whistle');
    if (best.role === 'cop') { best.flags.called = true; best.state = 'leave'; best.stT = 0; T.saved++; this.sim.hideCorner(6); Hud.toast('5-0!', 'The corner went cold in time'); Sound.sfx('good'); STATE.stats.calls++; }
    else { T.wrong++; this.sim.hideCorner(4); this.sim.cash = Math.max(0, this.sim.cash - 20); Hud.toast('Wrong call', 'That was just a neighbor. -$20'); Sound.sfx('bad'); }
  },
  onSim(e) {
    if (e.k === 'sale' && this.m.mode === 'tee') { Sound.sfx('cash'); this.fx.push({ x: e.at.x, y: e.at.y, t: 1, txt: '+$20' }); }
    if (e.k === 'bust' && this.m.mode === 'tee') { const lost = Math.round(this.sim.cash * .4); this.sim.cash -= lost; this.tee.busted++; Sound.sfx('bad'); Hud.toast('Police on the corner', 'You lost ' + money(lost) + ' to the stop'); this.sim.hideCorner(8); }
  },
  camStep(dt) {
    if (this.m.mode === 'vs2') return;
    const D = this.dana; let tx = D.x, ty = D.y;
    if (this.watching) { tx = (D.x + this.reticle.x) / 2; ty = (D.y + this.reticle.y) / 2; } else if (game.settings.edgePeek && game.input.lastDevice === 'mouse') { const p = game.input.pointer && game.input.pointer(); if (p) { const nx = clamp((p[0] / game.W - .5) * 2, -1, 1), ny = clamp((p[1] / game.H - .5) * 2, -1, 1), g = game.view.screenDirToGround(nx, ny), k = Math.max(0, Math.hypot(nx, ny) - .75) * 4 * 64; tx += g[0] * k; ty += g[1] * k; } }
    const pa = padAxes(); if (!this.watching && (Math.abs(pa.r[0]) > .3 || Math.abs(pa.r[1]) > .3)) { const g = game.view.screenDirToGround(dz(pa.r[0]), dz(pa.r[1])); tx += g[0] * 50; ty += g[1] * 50; }
    this.cam.x = lerp(this.cam.x, tx, Math.min(1, dt * 6)); this.cam.y = lerp(this.cam.y, ty, Math.min(1, dt * 6)); game.focus(this.cam.x, this.cam.y, 10);
    const I = game.input; if (I.pressed('rotL')) game.rotateView(-90); if (I.pressed('rotR')) game.rotateView(90); if (I.pressed('camReset')) game.resetCamera();
  },
  status() { const D = this.dana, h = D.heat || 0; if (this.winded > 0) return ['Winded', '#e8a040']; if (h > .6) return ['Noticed!', '#ff5040']; if (h > .25) return ['Noticed', '#e8a040']; if (this.watching) return ['Watching', '#80c0ff']; if (D.blending) return ['Blending', '#80d890']; return ['Unnoticed', '#80d890']; },
  hudStep() {
    if (UI.isOpen) { Hud.set(''); return; }
    const D = this.dana, m = this.m; const I = game.input;
    const st = this.status(), prompts = [];
    let promptHTML = '';
    const att = this.data.attract;
    if (att) promptHTML = '';
    else if (this.nearIx && !this.watching) promptHTML = `<div class="pr">${glyph('interact')} ${esc(this.nearIx.label)}${this.nearIx.hold ? ' (hold)' : ''}</div>`;
    else if (m.mode === 'tee') { const b = this.sim.people.find(p => p.role === 'buyer' && p.state === 'wait' && dist2(p, D) < 24); if (b) promptHTML = `<div class="pr">${glyph('interact')} Serve</div>`; }
    else if (m.mode === 'surv' || m.mode === 'raid' || m.mode === 'vs') promptHTML = `<div class="pr dim">${glyph('watch')} Watch &nbsp; ${this.watching ? glyph('photo') + ' Photo' : glyph('blend') + ' Blend'}</div>`;
    const bars = [];
    if (m.mode !== 'tee') bars.push(['Eyes on you', D.heat || 0, '#ff6040']); bars.push(['Stamina', this.stamina / 100, this.winded > 0 ? '#ff6040' : '#7ad06a']);
    if (m.mode === 'tail' && this.tailPhase === 'tail') bars.push(['Contact', this.tail, '#60b0ff']);
    const counts = m.mode === 'tee' ? [['Cash', money(this.tee.cash) + ' / ' + money(m.target)], ['Time', Math.max(0, Math.ceil(this.tee.left)) + 's'], ['Saved', this.tee.saved]] : (m.mode === 'vs2' ? [['P1 case', this.vs.score], ['P2 cash', money(this.sim.cash)], ['Time', Math.ceil(this.vs.left) + 's']] : [['Film', STATE.film], ['Brass', Math.round(STATE.brass)], m.mode === 'vs' || m.mode === 'vs2' ? ['Score', this.vs ? this.vs.score : 0] : m.mode === 'surv' ? ['Shots', Object.keys(this.slots).length + '/' + m.slots.length] : ['Made', this.made + '/3']]);
    const obj = this.objectiveText();
    Hud.set((this.data.attract ? `<div class="hud"><div class="pr">DEMO · press any button</div></div>` : '') + `<div class="hud"><div class="obj"><span class="k">${esc(m.kicker || '')}</span><b>${esc(obj[0])}</b><span>${esc(say(obj[1]))}</span></div><div class="st" style="color:${st[1]}">${st[0]}</div><div class="bars">${bars.map(b => `<div class="bar"><i>${b[0]}</i><u><s style="width:${Math.round(clamp(b[1], 0, 1) * 100)}%;background:${b[2]}"></s></u></div>`).join('')}</div><div class="cnt">${counts.map(c => `<span>${c[0]} <b>${c[1]}</b></span>`).join('')}</div>${promptHTML}${this.watching && this.focus ? `<div class="read">${esc(this.focus.read ? (ROLE_LABEL[this.focus.role] || '') + (this.focus.act ? ' · ACT' : '') + (this.focus.carry ? ' · carrying' : '') : 'Reading…')}</div>` : ''}${this.polaroid && this.polaroid.t > 0 ? `<div class="polaroid" style="border-color:${this.polaroid.col}"><b>${'★'.repeat(this.polaroid.stars)}${'☆'.repeat(3 - this.polaroid.stars)}</b> ${esc(this.polaroid.txt)}</div>` : ''}</div>`);
    if (this.polaroid) this.polaroid.t -= game.dt || .016;
  },
  objectiveText() {
    const m = this.m; if (m.mode === 'vs' || m.mode === 'vs2') return ['Build the case: ' + (this.vs ? this.vs.score : 0) + ' pts', Math.ceil(this.vs ? this.vs.left : 0) + 's left · photograph deals, don\'t get made'];
    if (m.mode === 'surv') { const need = m.slots.filter(s => !this.slots[s]); return need.length ? ['Photograph: ' + need.map(s => ({ tee: 'the dealer mid-sale', runner: 'the runner with the package', lookout: 'a lookout', buyer: 'a buyer' }[s])).join(', '), 'Keep your distance. ' + lbl('watch') + ' to look, ' + lbl('photo') + ' to shoot.'] : ['Walk back to the Annex', 'Both payphone numbers help too (' + Object.keys(this.phones).length + '/2).']; }
    if (m.mode === 'tail') return this.tailPhase === 'chase' ? ['Run him down', 'Sprint, then tackle.'] : ['Tail the runner', this.hint || 'Stay close but out of sight.']; if (m.mode === 'chase') return ['Tail, then chase', 'Stay on him.'];
    if (m.mode === 'raid') return [Object.keys(this.search).filter(k => this.search[k] === 1).length < 3 ? 'Search the stash (3 spots)' : 'Done', 'Hold ' + lbl('interact') + ' at each spot. Don\'t get made.'];
    if (m.mode === 'tee') return ['Make ' + money(m.target), lbl('interact') + ' serve buyers · ' + lbl('partner') + ' call 5-0 on police'];
    return ['', ''];
  },
  // ---------- draw ----------
  draw(r) {
    const map = this.map, sim = this.sim, D = this.dana; map.drawFloor(r); map.queueWalls(r);
    for (const [k, cx, cy] of PROPS) r.prop(k, cx * CELL + 8, cy * CELL + 8, 0, { light: k === 'streetlamp', size: 1.3 });
    for (const [cx, cy, col, rad] of LIGHTS) game.lights.add(cx * CELL + 8, cy * CELL + 8, 26, rad, .95, { color: col });
    // the van, a parked car and a painted vacant
    const van = sim.spawnTag('van'); r.queue(van.x, van.y, 0, g => r.box(g, van.x - 22, van.y - 10, 0, van.x + 22, van.y + 10, 20, '#d8d4c8', '#8a8c92'), { solid: true });
    for (const t of ['annex']) { const a = sim.spawnTag(t); r.queue(a.x, a.y, 0, g => { r.box(g, a.x - 6, a.y - 6, 0, a.x + 6, a.y + 6, 4, '#58606a', '#3a424a'); }); game.lights.add(a.x, a.y, 14, 60, .8, { color: '#8fd0ff' }); }
    if (this.raidSpots) for (const k in this.raidSpots) { const s = this.raidSpots[k]; r.queue(s.x, s.y, 0, g => r.box(g, s.x - 6, s.y - 5, 0, s.x + 6, s.y + 5, this.search[k] === 1 ? 4 : 9, '#6a5a3a', '#4a3a28')); }
    if (game.settings.cones && this.m.mode !== 'tee' && !this.watching) for (const p of sim.people) if (p.kind === 'crew' && !p.hidden && !p.gone && dist2(p, D) < 230) r.decal(() => r.groundArc(p.x, p.y, 6, 118, p.facing - .95, p.facing + .95, p.susp > .3 ? '#ff6040' : '#ffe080', .22));
    const all = sim.people.concat(this.m.mode === 'tee' ? [] : [D]); if (this.data.hub) for (const id in Net.remote) all.push(Net.remote[id].p);
    for (const p of all) { if (p.hidden || p.gone) continue; r.shadow(p.x, p.y, 6, .35); r.actor(p.x, p.y, p.body.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { xray: p === D, outline: p === D ? undefined : undefined }); }
    // overlays: suspicion marks, role tags in watch, reticle, +$ floaters
    r.overlay(g => {
      for (const p of sim.people) { if (p.kind !== 'crew' || p.hidden || p.gone) continue; if (!p.alertFlag && p.susp < .05) continue; const [sx, sy] = r.w(p.x, p.y, 44); E.font.text(g, p.alertFlag || '·', sx - 2, sy - 8, p.alertFlag === '!' ? '#ff5040' : '#ffc050', { outline: true }); E.ui.bar(g, sx - 7, sy + 2, 14, 3, clamp(p.susp, 0, 1), p.susp > .6 ? '#ff5040' : '#ffc050'); }
      if (this.watching) { const [sx, sy] = r.w(this.reticle.x, this.reticle.y, 0), c = this.focus ? '#ff7a50' : '#ffffff'; px.line(g, sx - 10, sy, sx - 3, sy, c); px.line(g, sx + 3, sy, sx + 10, sy, c); px.line(g, sx, sy - 10, sx, sy - 3, c); px.line(g, sx, sy + 3, sx, sy + 10, c); px.ell && px.ell(g, sx, sy, 12, 8, 'rgba(0,0,0,0)'); if (this.focus && this.focus.read) { const [fx, fy] = r.w(this.focus.x, this.focus.y, 50); E.font.text(g, ROLE_LABEL[this.focus.role] + (this.focus.act ? ' · ACT' : ''), fx, fy, '#ffd070', { align: 'center', outline: true }); } else if (this.focus) { const [fx, fy] = r.w(this.focus.x, this.focus.y, 50); px.rect(g, fx - 8, fy, Math.round(16 * clamp(this.focusT / .7, 0, 1)), 2, '#ffd070'); } }
      for (const f of this.fx) { f.t -= .016; const [sx, sy] = r.w(f.x, f.y, 40 + (1 - f.t) * 14); E.font.text(g, f.txt, sx, sy, '#8fe08f', { align: 'center', outline: true }); } this.fx = this.fx.filter(f => f.t > 0);
      if (this.flash > 0) px.rect(g, 0, 0, r.W, r.H, 'rgba(255,255,255,' + (this.flash * 6).toFixed(2) + ')');
    });
  }
};
