/* THE MATCH VIEW (section 8): the stadium under its sky and skyline, the crowd, floodlights, goals with nets that
 * ripple, corner flags, LED boards, dugouts and the fourth official; the footballers and the referee as HD rigs driven
 * from their state (live, or a replay's), the ball with its trails, matchday event actors, weather, fog and light. */
// (vendor/mocap/mocap.js declares `const Mocap`: a global binding, not a property of window)
EF.Anim = { lib: null, load() { if (!this.lib && typeof Mocap !== 'undefined' && window.MOCAP && MOCAP.EF) this.lib = Mocap.load(MOCAP.EF); return this.lib; } };
const CLIP_WIN = { Get_Up_From_Side: [3.2, 5.2], Get_Up_From_Back: [2.4, 4.6], Get_Up_Face_Down: [2, 4.2], Greeting: [0, 2.4], Breakdance_Helicopter: [1, 7], '10_02': [1.6, 2.6], '11_01': [2.4, 3.6] };
EF.Anim.sample = (rig, L) => {
  const lib = EF.Anim.lib; if (!lib || !L || !L.clip) { rig.mocap = null; return; }
  const c = lib.clip(L.clip.name); if (!c) { rig.mocap = null; return; }
  const w = CLIP_WIN[L.clip.name], t = w ? w[0] + (L.clip.t % (w[1] - w[0])) : (c.loop === false ? Math.min(c.dur, L.clip.t) : L.clip.t % c.dur);
  rig.mocap = lib.sample(c, t, rig._mbuf || (rig._mbuf = new Float32Array(lib.P * 3))); rig.mocapW = L.clip.w === undefined ? 1 : L.clip.w; rig.mocapMask = L.clip.mask || null;
};
/** procedural celebrations and poses over a rig's solved joints: arms out, the robot's square arms */
EF.Anim.post = (rig, proc, t) => {
  const J = rig.J; if (!J.shL || !proc) return;
  if (proc === 'armsOut' || proc === 'aeroplane') { const lean = proc === 'aeroplane' ? Math.sin(t * 2) * 1.5 : 0; J.elbowL = [J.shL[0], J.shL[1] - 4.4, J.shL[2] + .4 + lean]; J.handL = [J.shL[0] + .5, J.shL[1] - 8.8, J.shL[2] + .8 + lean * 2]; J.elbowR = [J.shR[0], J.shR[1] + 4.4, J.shR[2] + .4 - lean]; J.handR = [J.shR[0] + .5, J.shR[1] + 8.8, J.shR[2] + .8 - lean * 2]; }
  if (proc === 'robot') { const k = Math.floor(t * 4) % 2 ? 1 : -1; J.elbowL = [J.shL[0], J.shL[1] - 3, J.shL[2] - 3]; J.handL = [J.shL[0] + 4, J.shL[1] - 3, J.shL[2] - 3 + 3 * k]; J.elbowR = [J.shR[0], J.shR[1] + 3, J.shR[2] - 3]; J.handR = [J.shR[0] + 4, J.shR[1] + 3, J.shR[2] - 3 - 3 * k]; }
  if (proc === 'fishslap') { const k = Math.sin(t * 9); J.elbowR = [J.shR[0] + 2, J.shR[1] + 2, J.shR[2] + 1]; J.handR = [J.shR[0] + 5 + k * 2, J.shR[1] + k * 4, J.shR[2] + 2]; }
};
class MatchView {
  constructor(m) {
    this.m = m; this.rigs = new Map(); this.t = 0; this.evRigs = new Map(); this.decals = []; this.ledT = 0; this.ledMsg = null; this.flashes = [];
    EF.Anim.load();
    const kits = m.kits;
    for (const f of m.players) this.rigs.set(f.id, EF.Art.rigFor(f.team, kits[f.side], f.data));
    this.refRig = new E.Humanoid({ weapon: null, build: 'heroic', size: 1.08, hair: 'short', colors: { cloth: '#141418', pants: '#141418', belt: '#141418', trim: '#e8d040', boot: '#0a0a0e', skin: '#e8b890', hair: '#3a2a1a' }, kit: { pattern: 'plain', color2: '#e8d040' }, speedRef: 88 });
    if (EF.Anim.lib) Mocap.drive(this.refRig, EF.Anim.lib);
    this.crowd = new EF.CrowdView(m);
    this.managers = [0, 1].map(s => { const T = m.teams[s], mg = s === 0 && T.id === 'kipperton' ? EF.Cast.rig('mags') : new E.Humanoid({ weapon: null, size: 1.05, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#2a2a34', coat: T.kits.home.shirt, pants: '#22222a', skin: '#e0b090', hair: '#3a3030' } }); return { rig: mg, x: P.CX + (s ? 130 : -130), y: P.Y1 + 30, vx: 0, t: 0 }; });
    this.fourth = new E.Humanoid({ weapon: null, size: 1, colors: { cloth: '#141418', pants: '#141418', trim: '#e8d040', skin: '#d8a880', hair: '#2a2020' } });
    EF.Nets.reset();
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
  }
  dispose() { if (this.unsub) this.unsub(); this.crowd.dispose(); }
  rigOf(f) { return this.rigs.get(f.id); }
  /* ---- effects from the match's events ---- */
  on(ev) {
    const m = this.m, Pa = game.particles, b = m.ball, team = s => m.teams[s];
    const rumble = (who, k, t) => { const h = who && who.human; if (h && h.input && h.input.rumble) h.input.rumble(k, t); };
    switch (ev.type) {
      case 'shot': if (ev.who) { Pa.dust(ev.who.body.x, ev.who.body.y, 1, 3); rumble(ev.who, .25 + (ev.power || .5) * .5, .12); } if (ev.screamer) { game.freeze(.05); } this.photoFlash(); break;
      case 'woodwork': game.shake(4); Pa.sparks(ev.x, ev.y, ev.z, 8, null, { color: '#ffffff' }); rumble(m.lastKick, .6, .2); break;
      case 'goal': case 'ownGoal': if (ev.shootout) break; { const c = team(ev.side).kits.home.shirt; game.flash(c, .14, .5); game.shake(3); Pa.bits(b.x, b.y, 20, 30, EF.SPR.confetti); this.ledMsg = { text: 'GOAL!', t: 4, side: ev.side }; if (m.stadium.id === 'euphorium') this.fireworks(4); for (const h of m.humans) if (h.side === ev.side && h.input && h.input.rumble) h.input.rumble(.8, .4); } break;
      case 'knockdown': case 'launched': if (ev.x !== undefined) game.hitFx(ev.x, ev.y, 12, { power: ev.type === 'launched' ? .9 : .5, rumble: false, sound: null }); rumble(ev.who, .5, .2); break;
      case 'slide': { const f = ev.who; Pa.dust(f.body.x, f.body.y, 1, 6); if (m.surface === 'wet' || m.surface === 'snow') Pa.bits(f.body.x, f.body.y, 2, 6, m.surface === 'snow' ? ['#ffffff', '#e0e8f0'] : ['#8ab0c8', '#c8d8e8']); } break;
      case 'tackleWon': Pa.dust(ev.who.body.x, ev.who.body.y, 1, 4); rumble(ev.who, .4, .12); if (ev.victim) rumble(ev.victim, .4, .12); break;
      case 'europhoria': { const c = team(ev.side).kits.home.shirt; game.flash(c, .2, .6); this.ledMsg = { text: 'EUROPHORIA!', t: EF.T.europhoriaTime, side: ev.side }; if (m.stadium.id === 'euphorium') this.fireworks(5); } break;
      case 'superCharge': { const f = ev.who; Pa.ring(f.body.x, f.body.y, 4, 46, EF.get('super', ev.super).color || '#ffc83a', .5); Pa.glints(f.body.x, f.body.y, 14, 18, '#fff6c0'); game.flash('#ffffff', .08, .4); } break;
      case 'superStrike': game.shake(5); break;
      case 'hammer': game.shake(6); Pa.dust(ev.x, ev.y, 1, 10); break;
      case 'bounce': if (ev.surf === 'snow' && ev.speed > 40) Pa.bits(ev.x, ev.y, 1, 4, ['#ffffff', '#e8f0f8']); break;
      case 'splash': Pa.bits(ev.x, ev.y, 2, 10, ['#9ac0d8', '#c8e0f0', '#ffffff']); break;
      case 'busSmashed': Pa.bits(m.bus ? m.bus.x : b.x, m.bus ? m.bus.y : b.y, 14, 30, ['#c8e8ff', '#ffffff', '#7a1a2a']); game.shake(6); break;
      case 'beachPop': Pa.bits(ev.x, ev.y, 10, 16, ['#ff4a4a', '#ffe040', '#4a8aff', '#ffffff']); break;
      case 'save': if (ev.who) { Pa.glints(ev.who.body.x, ev.who.body.y, 14, 6, '#ffffff'); } break;
      case 'decoysBurst': Pa.bits(ev.x, ev.y, 16, 24, ['#ffe070', '#ffd040', '#ffffff']); break;
      case 'saveDuelResult': if (ev.result !== 'miss') game.flash('#ffffff', .1, .4); break;
      case 'refHit': Pa.impact && Pa.impact(ev.x, ev.y, 14, 1, '#ffffff'); break;
    }
  }
  photoFlash() { for (let i = 0; i < 3; i++) this.flashes.push({ x: EF.fxRng() < .5 ? P.X0 - 30 : P.X1 + 30, y: P.CY + EF.fx(-120, 120), t: EF.fx(0, .4) }); }
  fireworks(n) { for (let i = 0; i < n; i++) game.after(i * .35, () => { const x = EF.fx(P.X0, P.X1), y = EF.fx(-40, 40), c = EF.fxPick(['#ff5a7a', '#5ad0ff', '#ffe040', '#7aff7a', '#c87aff']); game.particles.explosion(x, y, 240 + EF.fx(0, 80), .7, { debris: false, freeze: false, shake: 0 }); game.particles.glints(x, y, 260, 24, c); game.lights.add(x, y, 200, 300, .6, { color: c }); }); }
  /* ---- the step: rigs from the source's state (live or a replay's proxies) ---- */
  update(dt, src) {
    this.t += dt; const m = this.m, rdt = src.replay ? dt * .5 : dt;
    for (const f of src.players) {
      const rig = this.rigs.get(f.id); if (!rig) continue;
      const L = f.look || {}, B = f.body, kick = f.kickName ? EF.kickState(f.kickName, f.kickT) : null;
      EF.Anim.sample(rig, L);
      let pose = L.pose, facing = f.facing + (L.spin || 0);
      if (f.state === 'keeper-dive') pose = 'cheer';
      if (f.state === 'launched') { L.tilt = { axis: 'forward', angle: (this.t * 15) % TAU, pivot: 'hips' }; }
      rig.update(rdt, { x: B.x, y: B.y, z: B.z, vx: B.vx, vy: B.vy, facing, attack: kick, pose, expr: L.expr, tilt: L.tilt, down: L.down, air: L.air, sprint: L.sprint, hurt: L.hurt, crouch: f.role === 'GK' && pose === 'guard' ? 1 : 0 });
      if (L.proc) EF.Anim.post(rig, L.proc, this.t);
    }
    const R = src.ref, RL = R.look || {};
    EF.Anim.sample(this.refRig, RL);
    this.refRig.update(rdt, { x: R.body.x, y: R.body.y, z: R.body.z, vx: R.body.vx, vy: R.body.vy, facing: R.facing, pose: RL.pose, point: RL.point, expr: RL.expr, down: RL.down });
    this.crowd.update(rdt);
    EF.Nets.update(rdt);
    for (const mg of this.managers) { mg.t += rdt; const pace = Math.sin(mg.t * .4) * 30, tx = (mg.x0 || (mg.x0 = mg.x)) + pace; mg.vx = (tx - mg.x) * 2; mg.x += mg.vx * rdt; }
    this.managers.forEach((mg, s) => { const st = this.crowd.state[s]; mg.rig.update(rdt, { x: mg.x, y: mg.y, z: 0, vx: mg.vx, vy: 0, facing: -Math.PI / 2 + (mg.vx > 3 ? .8 : mg.vx < -3 ? -.8 : 0), pose: st === 'jump' ? 'cheer' : st === 'despair' ? 'hips' : st === 'boo' ? 'guard' : null, expr: st === 'jump' ? 'shout' : st === 'despair' ? 'angry' : null }); });
    this.fourth.update(rdt, { x: P.CX, y: P.Y1 + 24, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: m.stoppageShown && m.minute % 45 < 46 && m.minute % 45 > 43 ? 'cheer' : null });
    // event actors: the invader and stewards get rigs
    for (const ev of src.events || []) {
      if (ev.id && ev.id.startsWith('invader')) {
        let er = this.evRigs.get(ev.id); if (!er) { er = { inv: new E.Humanoid({ weapon: null, size: 1.15, build: 'bulky', colors: ev.id === 'invader-keith' ? { cloth: '#c87a2a', pants: '#c87a2a', skin: '#c87a2a', hair: '#c87a2a', boot: '#3a2a1a' } : { cloth: '#7a5a3a', pants: '#5a4028', skin: '#e0b090', hair: '#5a4028' } }), st: [0, 1].map(() => new E.Humanoid({ weapon: null, size: 1.08, sleeves: 'long', colors: { cloth: '#e8f040', pants: '#2a2a34', trim: '#c0c8d0', skin: '#e0b090', hair: '#3a2a20' } })) }; this.evRigs.set(ev.id, er); }
        const live = m.events.find(e => e.id === ev.id);
        if (live) { const B = live.body; er.inv.update(rdt, { x: B.x, y: B.y, z: 0, vx: B.vx, vy: B.vy, facing: live.facing || 0, down: live.caught ? 1 : 0, expr: 'shout' }); live.stewards.forEach((s, i) => er.st[i].update(rdt, { x: s.x, y: s.y, z: 0, vx: s.vx, vy: s.vy, facing: Math.atan2(s.vy, s.vx) })); er.live = live; }
      }
    }
    if (this.ledMsg) { this.ledMsg.t -= dt; if (this.ledMsg.t <= 0) this.ledMsg = null; }
    for (const fl of this.flashes) fl.t -= dt; this.flashes = this.flashes.filter(f => f.t > -.15);
  }
  /* ---- drawing ---- */
  draw(r, src) {
    const m = this.m, st = m.stadium, b = src.ball, map = m.pitch.map;
    this.lighting(r, src);
    r.sky(this.skyColors());
    this.skyline(r);
    map.drawFloor(r);
    map.queueWalls(r);
    this.decalsDraw(r);
    this.crowd.draw(r, src);
    this.boards(r);
    this.pylons(r);
    for (const gx of [P.X0, P.X1]) this.goal(r, gx);
    for (const cx of [P.X0, P.X1]) for (const cy of [P.Y0, P.Y1]) this.flag(r, cx, cy);
    this.apron(r, src);
    if (st.jumbotron && m.kind !== 'title') this.jumbotron(r);
    if (src.bus) this.bus(r, src.bus);
    this.events(r, src);
    // the footballers, the referee
    const eu = m.europhoria;
    for (const f of src.players) {
      if (f.ghost) continue;
      const B = f.body, rig = this.rigs.get(f.id); if (!rig || !r.visible(B.x, B.y, B.z)) continue;
      r.shadow(B.x, B.y, 6, .38);
      const glow = eu && eu.side === f.side && !src.replay ? .25 + .2 * Math.sin(this.t * 8) : 0;
      r.actor(B.x, B.y, B.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), glow > 0 ? { flash: m.teams[f.side].kits.home.color2 || '#ffffff', flashMix: glow } : undefined);
      if (f.celebrate && f.celebrate.pick && f.celebrate.pick.prop === 'kipper') { const h = rig.hand('R'); r.sprite(h[0], h[1], h[2] - 2, EF.SPR.kipper, { anchor: 'center' }); }
    }
    const R = src.ref; r.shadow(R.body.x, R.body.y, 6, .38); r.actor(R.body.x, R.body.y, R.body.z, (g, ox, oy) => this.refRig.draw(g, ox, oy, r.view));
    if (R.look && R.look.signal === 'card' && m.cardNow) { const h = this.refRig.hand('R'); r.sprite(h[0], h[1], h[2] + 2, m.cardNow.final === 'yellow' ? EF.SPR.cardY : EF.SPR.cardR, { anchor: 'center', scale: 2 }); }
    if (R.look && R.look.point) { const h = this.refRig.hand('L'); r.sprite(h[0], h[1], h[2], EF.SPR.whistle, { anchor: 'center' }); }
    this.ballDraw(r, src);
    if (m.fog > .01) this.fogDraw(r, m.fog);
    if (src.events) for (const ev of src.events) if (ev.id === 'flaresmoke') this.smokeDraw(r, ev);
  }
  skyColors() { const st = this.m.stadium, night = this.m.timeOfDay === 'night'; return night && st.time !== 'night' ? ['#06070e', '#121428', '#28203a'] : st.sky || ['#1a2a5a', '#4a6aa0', '#a0b8d0']; }
  lighting(r, src) {
    const m = this.m, st = m.stadium, L = game.lights, night = m.timeOfDay === 'night', dusk = m.timeOfDay === 'dusk';
    if (!night && !dusk && !m.lightsOut) { L.enabled = false; return; }
    L.enabled = true;
    const out = m.lightsOut && !src.replay;
    L.ambient = out ? .14 : night ? (st.lights.night || .42) * .75 : (st.lights.ambient || .6);
    if (out) return;
    const k = night ? .72 : .5, col = st.lights.color || '#fff0d0';
    for (const [x, y] of [[P.X0 + 40, P.Y0 - 60], [P.X1 - 40, P.Y0 - 60], [P.X0 + 40, P.Y1 + 80], [P.X1 - 40, P.Y1 + 80]]) L.add(x, y, 220, 470, k, { color: col });
    L.add(P.CX, P.CY, 220, 300, k * .35, { color: col });
  }
  /* ---- the skyline behind the north stand: silhouettes by stadium ---- */
  skyline(r) {
    const m = this.m, st = m.stadium, g = r.ctx, kinds = st.skyline || [], night = m.timeOfDay !== 'day', c0 = st.skyColor || '#1a1a28', t = this.t;
    const at = (x, z) => r.w(x, -40, z), base = at(0, 0)[1];
    if (base < -10) return;
    const ct = E.tones(c0), win = night ? '#ffd870' : '#c8d0d8';
    const rect = (x, w, h, c) => { const a = at(x, h), b = at(x + w, 0); px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.max(1, Math.round(b[0] - a[0])), Math.max(1, Math.round(b[1] - a[1])), c); };
    const poly = (pts, c) => px.poly(g, pts.map(([x, z]) => at(x, z)), c);
    for (const k of kinds) {
      if (k === 'hills' || k === 'mountains') { const H2 = k === 'mountains' ? 230 : 120, pts = [[-200, 0]]; for (let x = -200; x <= 1300; x += 60) pts.push([x, 60 + (Math.sin(x * .011) * .5 + .5) * H2 * (k === 'mountains' ? (Math.abs(Math.sin(x * .004)) * .8 + .4) : .6)]); pts.push([1300, 0]); poly(pts, ct.sh); if (k === 'mountains') for (let x = -200; x <= 1300; x += 60) { const h = 60 + (Math.sin(x * .011) * .5 + .5) * H2 * (Math.abs(Math.sin(x * .004)) * .8 + .4); if (h > 170) poly([[x - 16, h - 26], [x, h], [x + 16, h - 26]], '#e8eef8'); } }
      if (k === 'harbour') { rect(-100, 1300, 70, ct.base); for (let x = 40; x < 1100; x += 150) { rect(x, 30, 110, ct.sh); poly([[x + 15, 180], [x + 15, 110], [x + 60, 110]], ct.lt); } }
      if (k === 'chimneys') for (const x of [120, 300, 820, 980]) { rect(x, 16, 190, ct.deep); if (EF.fxRng() < .2) game.particles.smoke(x + 8, -40, 200, 1, { size: 1.6, color: '#5a5a66' }); }
      if (k === 'lighthouse') { const x = 1010; poly([[x - 14, 0], [x + 14, 0], [x + 8, 190], [x - 8, 190]], '#e8e0d0'); rect(x - 14, 28, 40, '#c83a3a'); rect(x - 12, 24, 120, '#c83a3a'); rect(x - 10, 12, 200, '#2a2a30'); const beam = Math.sin(t * .9); if (night) { const a = at(x, 196); px.blend(g, .35, 'add', () => px.poly(g, [[a[0], a[1]], [a[0] + beam * 260, a[1] - 30], [a[0] + beam * 260, a[1] + 10]], '#fff6c0')); r.glowDisc(g, a[0], a[1], 10, '#fff6c0', .9); } }
      if (k === 'palms') for (const x of [60, 260, 760, 1000]) { rect(x, 6, 120, '#5a4028'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, p0 = at(x + 3, 120), p1 = at(x + 3 + Math.cos(a) * 40, 120 + Math.sin(a) * 18 - 10); px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a6a2a', 3); } }
      if (k === 'dome') { const x = 540; const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; pts.push([x + Math.cos(a) * 170, 70 + Math.sin(a) * 120]); } pts.push([x - 170, 0], [x + 170, 0]); poly(pts.slice(0, 17).concat([[x - 170, 70], [x - 170, 0], [x + 170, 0], [x + 170, 70]]), st.id === 'euphorium' ? '#3a2e10' : ct.base); if (st.id === 'euphorium') for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8, p0 = at(x + Math.cos(a) * 170, 70 + Math.sin(a) * 120), p1 = at(x, 70); px.line(g, p0[0], p0[1], p1[0], p1[1], '#c8a040'); } else rect(x - 8, 16, 220, ct.sh); }
      if (k === 'searchlights' && night) for (let i = 0; i < 3; i++) { const x = 200 + i * 340, a = Math.sin(t * .5 + i * 2) * .6, p0 = at(x, 40); px.blend(g, .22, 'add', () => px.poly(g, [[p0[0] - 3, p0[1]], [p0[0] + 3, p0[1]], [p0[0] + Math.sin(a) * 300 + 30, -40], [p0[0] + Math.sin(a) * 300 - 30, -40]], '#a0c8ff')); }
      if (k === 'steelworks') { for (const x of [80, 260, 860]) { rect(x, 70, 90, ct.deep); rect(x + 20, 14, 200, ct.deep); const a = at(x + 27, 200); if (night) r.glowDisc(g, a[0], a[1], 8, '#ff8a3a', .8); if (EF.fxRng() < .2) game.particles.smoke(x + 27, -40, 205, 1, { size: 1.6, color: '#8a8a96' }); } for (let x = 0; x < 1100; x += 90) rect(x, 50, 50 + (x % 7) * 6, ct.sh); }
      if (k === 'walls') { rect(-100, 1300, 60, ct.base); for (let x = -100; x < 1200; x += 24) rect(x, 12, 72, ct.base); }
      if (k === 'belltower') { const x = 700; rect(x, 34, 240, ct.lt); poly([[x - 4, 240], [x + 17, 280], [x + 38, 240]], ct.sh); rect(x + 10, 14, 220, '#1a1410'); }
      if (k === 'cypress') for (const x of [150, 420, 900, 1060]) poly([[x - 10, 0], [x + 10, 0], [x, 150]], '#1e3a24');
      if (k === 'seawall') { rect(-100, 1300, 26, '#7a7a80'); rect(-100, 1300, 8, '#5a5a62'); }
      if (night && (k === 'harbour' || k === 'steelworks' || k === 'walls')) for (let i = 0; i < 26; i++) { const x = (i * 97) % 1150 - 40, z = 14 + (i * 37) % 50; const a = at(x, z); if (E.hash2(i, 3) > .4) px.rect(g, Math.round(a[0]), Math.round(a[1]), 2, 2, win); }
    }
  }
  /* ---- the LED boards on the north boards' face: sponsors, GOAL!, the team's colours in Europhoria ---- */
  boards(r) {
    const m = this.m, st = m.stadium, list = st.boards || [], seg = 208, msg = this.ledMsg;
    for (let i = 0, x = P.END_W + 16; x < P.END_E - 16; x += seg, i++) {
      const x0 = x, x1 = Math.min(P.END_E - 16, x + seg - 4);
      r.queue((x0 + x1) / 2, P.Y0 - .5, 12, g => {
        const a = r.w(x0, P.Y0 - .2, 23), b = r.w(x1, P.Y0 - .2, 3), X0 = Math.round(a[0]), Y0 = Math.round(a[1]), W = Math.round(b[0] - a[0]), Hh = Math.round(b[1] - a[1]);
        if (W < 4 || Hh < 3) return;
        const cyc = Math.floor((this.t / 4 + i * .37)) % list.length, side = msg ? msg.side : 0, tc = msg ? m.teams[side].kits.home : null;
        px.rect(g, X0, Y0, W, Hh, msg ? (Math.floor(this.t * 6) % 2 ? tc.shirt : tc.color2 || '#000') : '#0a0c14');
        const text = msg ? msg.text : list[cyc] || '', sc = Hh >= 16 ? 2 : 1, tw = E.font.width(text, { scale: sc }), sx = tw > W - 4 ? X0 + W - ((this.t * 40 + i * 50) % (tw + W)) : X0 + (W - tw) / 2;
        const col = msg ? (Math.floor(this.t * 6) % 2 ? tc.color2 || '#fff' : tc.shirt) : ['#ffd83a', '#7af0ff', '#ff7aa0', '#a0ff7a'][i % 4];
        if (tw > W - 4) { g.save(); g.beginPath(); g.rect(X0, Y0, W, Hh); g.clip(); E.font.text(g, text, Math.round(sx), Y0 + Math.round((Hh - 7 * sc) / 2), col, { scale: sc, outline: false }); g.restore(); px.reset(g); }
        else E.font.text(g, text, Math.round(sx), Y0 + Math.round((Hh - 7 * sc) / 2), col, { scale: sc, outline: false });
        px.rect(g, X0, Y0, W, 1, '#3a4058');
      }, { bias: 3 });
    }
  }
  /* ---- floodlight pylons at the north corners: a lattice tower and a bank of lamps ---- */
  pylons(r) {
    const m = this.m, lit = m.timeOfDay !== 'day' && !m.lightsOut;
    for (const x of [P.END_W + 6, P.END_E - 6]) {
      const y = 6, top = 230;
      r.queue(x, y, top / 2, g => {
        const a = r.w(x - 10, y, 0), b = r.w(x + 10, y, 0), c = r.w(x - 3, y, top), d = r.w(x + 3, y, top);
        const steel = '#5a5e6a', lt = '#8a8e9a';
        px.line(g, a[0], a[1], c[0], c[1], steel, 2); px.line(g, b[0], b[1], d[0], d[1], steel, 2);
        for (let k = 0; k < 10; k++) { const u0 = k / 10, u1 = (k + 1) / 10, p0 = [lerp(a[0], c[0], u0), lerp(a[1], c[1], u0)], p1 = [lerp(b[0], d[0], u1), lerp(b[1], d[1], u1)], p2 = [lerp(b[0], d[0], u0), lerp(b[1], d[1], u0)], p3 = [lerp(a[0], c[0], u1), lerp(a[1], c[1], u1)]; px.line(g, p0[0], p0[1], p1[0], p1[1], lt); px.line(g, p2[0], p2[1], p3[0], p3[1], lt); }
        const L0 = r.w(x - 18, y, top + 30), L1 = r.w(x + 18, y, top);
        px.rect(g, Math.round(L0[0]), Math.round(L0[1]), Math.round(L1[0] - L0[0]), Math.round(L1[1] - L0[1]), '#2a2c34');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const p = r.w(x - 14 + i * 9.3, y, top + 5 + j * 9), on = lit && !(m.lightsOut); px.rect(g, Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3, on ? '#fffbe8' : '#6a6a70'); }
      }, { emissive: lit });
      if (lit) r.queue(x, y, top + 15, g => { const p = r.w(x, y, top + 15); r.glowDisc(g, p[0], p[1], 26, '#fff0c0', .8); }, { emissive: true });
    }
  }
  /* ---- a goal: posts, bar, the net's back, sides and roof as a mesh that ripples ---- */
  goal(r, gx) {
    const s = gx === P.X0 ? -1 : 1, i = s < 0 ? 0 : 1, M = EF.Nets.mesh[i], net = '#e8ecf0', back = gx + s * P.NET;
    const D = (j, q) => M ? M[j * 5 + q].d * s : 0;
    r.queue(back, P.CY - P.GH, 0, g => {   // the back and far side, behind everything in the mouth
      px.blend(g, .55, 'normal', () => {
        for (let j = 0; j < 8; j++) { const y = P.CY - P.GH + j / 7 * P.GH * 2; const pts = []; for (let q = 0; q < 5; q++) pts.push(r.w(back + D(j, q), y, q / 4 * P.BAR * .9)); for (let q = 0; q < 4; q++) px.line(g, pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1], net); }
        for (let q = 0; q < 5; q++) { const z = q / 4 * P.BAR * .9; for (let j = 0; j < 7; j++) { const a = r.w(back + D(j, q), P.CY - P.GH + j / 7 * P.GH * 2, z), b = r.w(back + D(j + 1, q), P.CY - P.GH + (j + 1) / 7 * P.GH * 2, z); px.line(g, a[0], a[1], b[0], b[1], net); } }
        for (let k = 0; k <= 4; k++) { const x = lerp(gx, back, k / 4), a = r.w(x, P.CY - P.GH, 0), b = r.w(x, P.CY - P.GH, P.BAR * lerp(1, .9, k / 4)); px.line(g, a[0], a[1], b[0], b[1], net); }
        for (let k = 0; k <= 6; k++) { const y = P.CY - P.GH + k / 6 * P.GH * 2, a = r.w(gx, y, P.BAR), b = r.w(back, y, P.BAR * .9); px.line(g, a[0], a[1], b[0], b[1], net); }
      });
    }, { bias: -2 });
    r.queue(gx, P.CY + P.GH + 1, 0, g => {   // the near side net
      px.blend(g, .5, 'normal', () => { for (let k = 0; k <= 4; k++) { const x = lerp(gx, back, k / 4), a = r.w(x, P.CY + P.GH, 0), b = r.w(x, P.CY + P.GH, P.BAR * lerp(1, .9, k / 4)); px.line(g, a[0], a[1], b[0], b[1], net); } for (let q = 0; q <= 4; q++) { const a = r.w(gx, P.CY + P.GH, q / 4 * P.BAR), b = r.w(back, P.CY + P.GH, q / 4 * P.BAR * .9); px.line(g, a[0], a[1], b[0], b[1], net); } });
    }, { bias: 1 });
    for (const py of [P.CY - P.GH, P.CY + P.GH]) r.queue(gx, py, P.BAR / 2, g => { const a = r.w(gx, py, 0), b = r.w(gx, py, P.BAR + 1); px.rect(g, Math.round(a[0]) - 1, Math.round(b[1]), 3, Math.round(a[1] - b[1]), '#f4f4f0'); px.rect(g, Math.round(a[0]) + 1, Math.round(b[1]), 1, Math.round(a[1] - b[1]), '#a8acb8'); });
    r.queue(gx, P.CY + P.GH, P.BAR, g => { const a = r.w(gx, P.CY - P.GH, P.BAR), b = r.w(gx, P.CY + P.GH, P.BAR); px.line(g, a[0], a[1], b[0], b[1], '#f4f4f0', 3); px.line(g, a[0], a[1] + 1, b[0], b[1] + 1, '#a8acb8'); }, { bias: 2 });
  }
  flag(r, cx, cy) {
    const m = this.m, wind = (m.weather && m.weather.wind) || .2, k = m.teams[0].kits.home;
    const spr = EF.SPR.flag[Math.floor(this.t * (4 + wind * 8) + cx) % 3];
    r.queue(cx, cy, 0, g => { const a = r.w(cx, cy, 0), b = r.w(cx, cy, 22); px.line(g, a[0], a[1], b[0], b[1], '#e8e8e0'); px.sprite(g, k.shirt === '#f08a24' ? spr : E.recolor(spr, { '#f08a24': k.shirt, '#ffb860': E.shade(k.shirt, .3) }), Math.round(b[0]) + 1, Math.round(b[1])); });
  }
  /* ---- the south apron: dugouts with the managers, the fourth official, photographers' flashes ---- */
  apron(r, src) {
    const m = this.m;
    for (const s of [0, 1]) {
      const x = P.CX + (s ? 130 : -130), y = P.Y1 + 40, col = m.teams[s].kits.home.shirt;
      r.queue(x, y + 8, 0, g => { r.box(g, x - 34, y, 0, x + 34, y + 10, 16, '#2a2e3a', '#3a4050'); px.blend(g, .4, 'normal', () => r.box(g, x - 36, y - 4, 16, x + 36, y + 10, 18, '#a8c8e0', '#7a98b0')); const a = r.w(x - 30, y, 6); px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.round(60 * (r.view.zoom || 1)), 2, col); });
      const mg = this.managers[s]; r.shadow(mg.x, mg.y, 5, .3); r.actor(mg.x, mg.y, 0, (g, ox, oy) => mg.rig.draw(g, ox, oy, r.view));
    }
    r.actor(P.CX, P.Y1 + 24, 0, (g, ox, oy) => this.fourth.draw(g, ox, oy, r.view));
    if (m.stoppageShown && Math.floor(m.minute) % 45 >= 43 && m.half < 3 && !src.replay) {
      r.queue(P.CX, P.Y1 + 23, 30, g => { const p = r.w(P.CX, P.Y1 + 23, 34); px.rect(g, Math.round(p[0]) - 9, Math.round(p[1]) - 6, 18, 11, '#101418'); E.font.text(g, '+' + m.stoppage, Math.round(p[0]), Math.round(p[1]) - 4, '#7aff6a', { align: 'center', outline: false }); }, { emissive: true });
    }
    for (const f of this.flashes) if (f.t < 0) r.queue(f.x, f.y, 10, g => { const p = r.w(f.x, f.y, 10); r.glowDisc(g, p[0], p[1], 6, '#ffffff', 1); }, { emissive: true });
  }
  jumbotron(r) {
    const m = this.m, x0 = P.CX - 90, x1 = P.CX + 90;
    r.queue(P.CX, 2, 150, g => {
      const a = r.w(x0, 2, 190), b = r.w(x1, 2, 120), X = Math.round(a[0]), Y = Math.round(a[1]), W = Math.round(b[0] - a[0]), Hh = Math.round(b[1] - a[1]);
      px.rect(g, X - 3, Y - 3, W + 6, Hh + 6, '#2a2a34'); px.rect(g, X, Y, W, Hh, '#06081a');
      const msg = m.mode === 'replay' ? 'REPLAY' : this.ledMsg ? this.ledMsg.text : null;
      if (msg) E.font.text(g, msg, X + W / 2, Y + Hh / 2 - 7, Math.floor(this.t * 4) % 2 ? '#ffd83a' : '#ffffff', { align: 'center', scale: 2, outline: false });
      else { EF.drawCrest(g, m.teams[0], X + 14, Y + Hh / 2, Math.min(24, Hh - 4)); EF.drawCrest(g, m.teams[1], X + W - 14, Y + Hh / 2, Math.min(24, Hh - 4)); E.font.text(g, m.score[0] + ' - ' + m.score[1], X + W / 2, Y + Hh / 2 - 7, '#ffffff', { align: 'center', scale: 2, outline: false }); }
    }, { emissive: true });
  }
  bus(r, BU) {
    const x = BU.x, y = BU.y, d = BU.d / 2, w = BU.w / 2, h = BU.h;
    r.queue(x, y + w, h / 2, g => {
      r.box(g, x - d, y - w, 4, x + d, y + w, h, '#c8ccd4', '#7a1a2a');
      const a = r.w(x - d, y + w, h - 6), b = r.w(x + d, y + w, h - 16); px.rect(g, Math.round(a[0]) + 1, Math.round(a[1]), Math.max(1, Math.round(b[0] - a[0]) - 2), Math.max(1, Math.round(b[1] - a[1])), BU.state === 'leave' ? '#3a3a40' : '#8ac0e8');
      for (const wy of [y - w + 10, y + w - 10]) { const p = r.w(x, wy, 4); px.disc(g, p[0], p[1], 3, '#1a1a1a'); }
      const t = r.w(x, y, h + 1); E.font.text(g, 'ACL', t[0], t[1] - 6, '#c8ccd4', { align: 'center', font: 'tiny', outline: '#3a0a10' });
    });
  }
  events(r, src) {
    for (const ev of src.events || []) {
      if (ev.id === 'seagull') { const z = ev.z || 0, fl = Math.floor(this.t * 10) % 2; r.shadow(ev.x, ev.y, 3, .3); r.sprite(ev.x, ev.y, z, fl && ev.state !== 'sit' ? E.recolor(EF.SPR.gull, {}) : EF.SPR.gull, { anchor: 'bottom', scale: 1 }); }
      else if (ev.id === 'beachball' && !ev.popped) { const x = ev.x, y = ev.y, z = ev.z || 0; r.shadow(x, y, 6, .3); r.queue(x, y, z, g => { const p = r.w(x, y, z + 7), rr = 7 * (r.view.zoom || 1); px.disc(g, p[0], p[1], rr, '#ffffff'); px.poly(g, [[p[0], p[1]], [p[0] - rr, p[1] - rr * .3], [p[0] - rr * .3, p[1] - rr]], '#ff4a4a'); px.poly(g, [[p[0], p[1]], [p[0] + rr, p[1] - rr * .3], [p[0] + rr * .3, p[1] - rr]], '#4a8aff'); px.poly(g, [[p[0], p[1]], [p[0] - rr * .6, p[1] + rr * .8], [p[0] + rr * .6, p[1] + rr * .8]], '#ffe040'); }); }
      else if (ev.id && ev.id.startsWith('invader')) {
        const er = this.evRigs.get(ev.id); if (!er || !er.live) continue; const B = er.live.body;
        r.shadow(B.x, B.y, 7, .35); r.actor(B.x, B.y, 0, (g, ox, oy) => er.inv.draw(g, ox, oy, r.view));
        if (!er.live.caught) { const hd = er.inv.worldOffset(er.inv.J.head); if (ev.id === 'invader-keith') r.sprite(B.x + hd[0], B.y + hd[1], hd[2] - 3, EF.SPR.kipper, { anchor: 'center', scale: 2 }); else r.queue(B.x, B.y, hd[2] + 4, g => { const p = r.w(B.x + hd[0], B.y + hd[1], hd[2] + 4); px.line(g, p[0] - 2, p[1], p[0] - 7, p[1] - 7, '#c8a878', 2); px.line(g, p[0] + 2, p[1], p[0] + 7, p[1] - 7, '#c8a878', 2); px.line(g, p[0] - 5, p[1] - 4, p[0] - 9, p[1] - 4, '#c8a878'); px.line(g, p[0] + 5, p[1] - 4, p[0] + 9, p[1] - 4, '#c8a878'); }); }
        er.live.stewards.forEach((s, i) => { r.shadow(s.x, s.y, 5, .3); r.actor(s.x, s.y, 0, (g, ox, oy) => er.st[i].draw(g, ox, oy, r.view)); });
      }
      else if (ev.id === 'drone') { const x = ev.x, y = ev.y, z = 110; r.shadow(x, y, 5, .25); r.queue(x, y, z, g => { const p = r.w(x, y, z); px.rect(g, p[0] - 5, p[1] - 1, 10, 3, '#2a2a30'); px.rect(g, p[0] - 7, p[1] - 3, 4, 1, '#8a8a90'); px.rect(g, p[0] + 3, p[1] - 3, 4, 1, '#8a8a90'); if (Math.floor(this.t * 3) % 2) px.rect(g, p[0], p[1] + 2, 1, 1, '#ff3a3a'); }, { emissive: true }); }
    }
  }
  decalsDraw(r) {
    const m = this.m;
    if (m.surface === 'snow' && EF.fxRng() < .3) for (const f of m.players) if (Math.hypot(f.body.vx, f.body.vy) > 50 && !f.ghost) this.decals.push({ x: f.body.x, y: f.body.y, t: 6 });
    if (this.decals.length > 220) this.decals.splice(0, this.decals.length - 220);
    for (const d of this.decals) d.t -= 1 / 60;
    this.decals = this.decals.filter(d => d.t > 0);
    if (this.decals.length) r.decal(g => { for (const d of this.decals) { const p = r.w(d.x, d.y, 0); px.rect(g, Math.round(p[0]), Math.round(p[1]), 2, 1, d.t > 3 ? '#b8c4d4' : '#ccd6e2'); } });
  }
  /* ---- the ball: its shadow, its sprite by style, trails, the split super's decoys ---- */
  ballDraw(r, src) {
    const m = this.m, b = src.ball, style = EF.BALLS[m.ballStyle] || EF.BALLS.classic, def = m.ball.superDef;
    r.shadow(b.x, b.y, Math.max(1.5, 3 - Math.min(1.5, b.z * .05)), Math.max(.15, .45 - b.z * .004));
    const T = b.trail || [];
    if (T.length > 1) {
      const col = b.superPath ? (def && def.color) || '#ffc83a' : '#ffffff';
      r.queue(b.x, b.y, b.z, g => { for (let i = 1; i < T.length; i++) { const a = r.w(T[i - 1][0], T[i - 1][1], T[i - 1][2] + 3), c = r.w(T[i][0], T[i][1], T[i][2] + 3); px.blend(g, i / T.length * .8, 'add', () => px.line(g, a[0], a[1], c[0], c[1], col, b.superPath ? 3 : 2)); } }, { emissive: true, bias: -.5 });
      if (b.superPath && def) { const kind = def.trail; if (kind === 'smoke') game.particles.smoke(b.x, b.y, b.z + 3, 1, { size: .8, color: '#8a8a90' }); else if (kind === 'fire') game.particles.fire(b.x, b.y, b.z + 3, 1, { size: .8 }); else if (kind === 'gold' || kind === 'sparkle') game.particles.glints(b.x, b.y, b.z + 3, 1, def.color); else if (kind === 'sparks') game.particles.sparks(b.x, b.y, b.z + 3, 2, null, { color: '#ffa040' }); }
    }
    const fr = style.frames[Math.floor((b.roll || 0) / 5) % 4];
    if (b.superPath && def && def.ball === 'kipper') r.sprite(b.x, b.y, b.z + 3, EF.SPR.kipperBall, { anchor: 'center', rot: Math.atan2(b.vy, b.vx) });
    else r.sprite(b.x, b.y, b.z + 2.5, fr, { anchor: 'center', glow: style.glow || b.superPath ? .6 : 0 });
    if (b.decoys) { const sp = Math.hypot(b.vx, b.vy) || 1, nx = -b.vy / sp, ny = b.vx / sp, k = 26; for (const d of b.decoys) if (d.alive) r.sprite(b.x + nx * k * d.k, b.y + ny * k * d.k, b.z + 2.5, EF.BALLS.golden.frames[Math.floor(this.t * 20) % 4], { anchor: 'center', glow: .6 }); }
  }
  fogDraw(r, k) {
    r.overlay(g => { for (let i = 0; i < 4; i++) { const y0 = Math.round(r.H * (i / 4)), hgt = Math.round(r.H / 4) + 1, a = k * (.25 + i * .05); px.polyDither(g, [[0, y0], [r.W, y0], [r.W, y0 + hgt], [0, y0 + hgt]], '#c8ccd4', a, Math.round(this.t * 6) + i * 3, 0); } });
  }
  smokeDraw(r, ev) {
    const x = ev.x; r.queue(x, P.CY, 30, g => { for (let i = 0; i < 6; i++) { const p = r.w(x + Math.sin(this.t + i) * 40 - i * 20 * ev.dir, P.Y0 + 40 + i * 70, 20); px.ddisc(g, p[0], p[1], 40, '#d8483a', .4, r.ix, r.iy); } }, { bias: 5 });
  }
}
EF.MatchView = MatchView;
