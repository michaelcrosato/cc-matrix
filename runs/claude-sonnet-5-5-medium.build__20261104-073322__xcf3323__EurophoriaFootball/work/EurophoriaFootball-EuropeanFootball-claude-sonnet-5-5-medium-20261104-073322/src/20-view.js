/* ============ 20-view: the broadcast camera, the stands and crowd, the actors, the effects ============ */
EF.notices = [];
EF.notice = (text, color = '#fff6e0', dur = 2, scale = 2) => { EF.notices.push({ text, color, dur, t: 0, scale }); if (EF.notices.length > 3) EF.notices.shift(); };
const SKY = { harbour: ['#1c1c34', '#5a3a58'], palms: ['#6aa8e8', '#c8e0f0'], steel: ['#0a1020', '#2a3448'], walls: ['#1a1830', '#6a3a48'], dome: ['#05060f', '#2a2050'], sea: ['#8a9ab0', '#c8ccd0'] };
EF.MatchView = class MatchView {
  constructor(M, o = {}) {
    this.M = M; this.o = o; this.map = Pitch.build(M.stadiumId); this.st = M.stadium; this.rigs = new Map(); this.t = 0; this.fans = []; this.commentary = new EF.Commentary(M, { quiet: o.quiet }); this.mood = .3; this.camT = { x: Pitch.CX, y: Pitch.CY }; this.zoom = 1.15; this.shakeT = 0; this.trail = []; this.flash = 0; this.celebrations = {}; this.offs = []; this.refRig = null; this.fx = []; this.skip = 0; this.prevMode = ''; this.cardT = 0; this.goalT = 0; this.duelRing = null; this.varT = 0; this.picker = null;
    this.buildRigs(); this.buildCrowd(); this.hook();
    this.camPos = { x: Pitch.CX, y: Pitch.CY };
    this.gulls = [];
  }
  destroy() { this.commentary.destroy(); for (const o of this.offs) o(); this.offs = []; }
  buildRigs() {
    const M = this.M; for (const f of M.F) { const team = M.teams[f.side]; const kit = f.isGK ? EF.gkKit(M, f.side) : team.kit; const rig = EF.makeRig(f.data, kit, f.role, { gloves: '#ffffff' }); if (f.data.boss) rig.o.size = 1.8; this.rigs.set(f, rig); }
    const sp = EF.SPEAKERS.REF; this.refRig = new E.Humanoid({ size: 1.1, weapon: null, hair: 'short', hat: undefined, sleeves: 'short', colors: { skin: M.refData.skin, hair: '#2a2a2a', cloth: '#16161a', pants: '#16161a', boot: '#0a0a0a', trim: '#ffd84a', belt: '#16161a' } });
  }
  buildCrowd() {
    const M = this.M, st = this.st, rng = E.rng(M.seed + 77), homeK = M.teams[0].kit, awayK = M.teams[1].kit, tiers = st.tiers || 3, dens = Math.min(1, (st.crowd || 100) / 700);
    for (let R = 0; R < STAND; R++) {
      if (STAND - R > tiers + 0) {/* the back rows stay empty in small grounds */ if (st.crowd < 20) continue; }
      for (let c = ND; c <= ND + FW + 1; c++) for (const dx of [3, 8, 13]) {
        if (rng() > (st.crowd < 20 ? 0 : .35 + dens * .65) || (st.crowd < 20 && R < STAND - 1)) continue;
        const h = rng(), side = h < (st.homeShare ?? .7) ? 0 : 1, k = side ? awayK : homeK, z = [70, 58, 46, 34][R];
        const col = rng() < .55 ? k.cloth : rng() < .5 ? k.color2 || k.trim : ['#e8e0d0', '#3a4a6a', '#7a3a3a', '#caa84a'][Math.floor(rng() * 4)];
        this.fans.push({ x: c * TL + dx + rng() * 2, y: R * TL + 8 + rng() * 5, z, side, col, skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][Math.floor(rng() * 4)], ph: rng() * 9, R, c, hat: rng() < .15 });
      }
    }
  }
  hook() {
    const M = this.M, on = (t, fn) => this.offs.push(EF.bus.on(t, e => { if (e.match === M) fn(e); }));
    const hum = (s, d) => { for (const h of M.humans) if (h.side === s && h.idx === 0) try { game.input.rumble(.5, d || .2); } catch (e) { /* no pad */ } };
    on('goal', e => { this.goalT = 0; game.shake(6); game.flash('#ffffff', .25, .6); PT.bits(e.x, e.y, 20, 40, [EF.TEAMCOL(M.teams[e.side].id, e.side), '#ffffff', '#ffd84a']); EF.sfx('cheer'); EF.sfx('net'); EF.crowdAudio.swell(2); if (!e.own) EF.notice('GOAL!', '#ffe08a', 2.4, 4); else EF.notice('OWN GOAL!', '#ff9a8a', 2.4, 3); hum(e.side, .6); this.flash = 1; });
    on('shot', e => { EF.sfx('shot'); if (e.sup) game.shake(2); });
    on('pass', e => EF.sfx('pass')); on('lob', e => EF.sfx('kick')); on('goalKick', e => EF.sfx('kick')); on('throw', e => EF.sfx('pass'));
    on('thud', e => { PT.dust(e.x, e.y, 2, 5); EF.sfx('thud'); });
    on('bounce', e => { if (e.power > .3) EF.sfx('bounce', { vol: e.power }); });
    on('tackleWon', e => { PT.sparks(e.x, e.y, 8, 6); EF.sfx('tackle'); game.shake(1.5); }); on('tackleFailed', e => EF.sfx('thud', { vol: .4 }));
    on('slide', e => { PT.dust(e.x, e.y, 2, 8); EF.sfx('slide'); }); on('knockdown', e => { game.hitFx(e.x, e.y, 10, { power: 1, textScale: 0 }); EF.sfx('tackle'); EF.crowdAudio.swell(.6); });
    on('post', e => { PT.sparks(e.x, e.y, 16, 10); EF.sfx('post'); game.shake(2); EF.crowdAudio.swell(.8); EF.sfx('ooh'); }); on('bar', e => { PT.sparks(e.x, e.y, 28, 10); EF.sfx('post'); game.shake(2); EF.sfx('ooh'); });
    on('save', e => { EF.sfx('save'); EF.crowdAudio.swell(.8); EF.sfx('ooh'); if (e.shootout) return; if (!e.parry) EF.notice('SAVED!', '#9ae0ff', 1.4, 3); else EF.notice('PARRIED!', '#9ae0ff', 1.2, 3); });
    on('nearMiss', e => { EF.sfx('groan', { vol: .8 }); }); on('whistle', e => EF.sfx('whistle')); on('fulltimeWhistle', e => EF.sfx('whistle2')); on('fulltime', e => EF.sfx('whistle2')); on('half', e => EF.sfx('whistle2'));
    on('foul', e => { EF.notice('FOUL!', '#ffd8a0', 1.4, 3); EF.sfx('whistle2'); EF.sfx('groan', { vol: .5 }); }); on('advantage', e => EF.notice('ADVANTAGE!', '#9aff9a', 1.6, 3));
    on('card', e => { EF.notice(e.color === 'red' ? 'RED CARD!' : 'YELLOW CARD', e.color === 'red' ? '#ff6a5a' : '#ffe04a', 2, 3); EF.sfx('card'); EF.sfx('groan', { vol: .6 }); this.cardT = 2.4; this.cardColor = e.color; });
    on('dive', e => { EF.sfx('dive'); }); on('diveBooked', e => EF.notice('BOOKED FOR DIVING', '#ffe04a', 2, 2)); on('diveWon', e => EF.notice('...AND THE REF BUYS IT!', '#9aff9a', 1.8, 2));
    on('var', e => { EF.notice('VAR CHECK', '#9ad8ff', 2.8, 3); EF.sfx('varbeep'); this.varT = 0; }); on('varDecision', e => { EF.notice(e.overturned ? 'NO GOAL! DECISION OVERTURNED' : 'DECISION STANDS', e.overturned ? '#ff8a7a' : '#9aff9a', 2.2, 2); if (e.kind !== 'goal' && e.overturned) EF.sfx('groan'); });
    on('penaltyAwarded', e => EF.notice('PENALTY!', '#ffd84a', 2, 4)); on('nutmeg', e => { EF.notice('NUTMEG!', '#ffd84a', 1.5, 3); EF.sfx('skill'); PT.glints(e.x, e.y, 14, 8, '#ffd84a'); EF.crowdAudio.swell(.8); EF.sfx('ooh'); }); on('rainbow', e => { EF.notice('RAINBOW FLICK!', '#ff9aff', 1.4, 2); EF.sfx('skill'); }); on('skill', e => { EF.sfx('skill'); PT.glints(e.x, e.y, 10, 4, '#ffffff'); });
    on('bicycle', e => { EF.notice('BICYCLE KICK!', '#ffd84a', 1.6, 3); PT.glints(e.x, e.y, 16, 8, '#ffffff'); EF.sfx('ooh'); }); on('header', e => { if (e.shot) PT.dust(e.x, e.y, 18, 3); }); on('volley', e => { EF.notice('VOLLEY!', '#ffd84a', 1.1, 2); });
    on('euphoriaFull', e => { if (e.side === 0 || !M.humans.length) { EF.notice('CROWD READY! L1+R1', '#ffd84a', 2.2, 2); } EF.sfx('euphoriaFull'); });
    on('europhoria', e => { EF.notice('EUROPHORIA!', '#ff9a2a', 2.6, 4); EF.sfx('europhoria'); game.flash('#ffa030', .4, .7); game.shake(4); this.flash = 1; EF.crowdAudio.swell(2); const s = M.teams[e.side]; if (!M.humans.length || true) EF.crowdAudio.chant(s.id, M.t - 99 + 99 + 6); PT.ring(Pitch.CX, Pitch.CY, 10, 260, '#ffa030', .8); });
    on('superStrike', e => { EF.notice(e.name, e.color || '#ffd84a', 2.4, 3); EF.sfx('superStrike'); game.flash('#ffffff', .2, .6); game.shake(5); game.freeze && game.freeze(.12); });
    on('hammer', e => { EF.sfx('hammer'); game.shake(4); PT.dust(M.ball.x, M.ball.y, 2, 10); });
    on('saveDuel', e => { this.duelRing = { t: 0 }; EF.notice('SAVE DUEL!', '#9ae0ff', 1.4, 3); }); on('saveDuelResult', e => { EF.sfx(e.save ? 'duelWin' : 'duelLose'); EF.notice(e.save ? (e.perfect ? 'PERFECT SAVE!' : 'SAVED!') : 'BEATEN!', e.save ? '#9aff9a' : '#ff8a7a', 1.6, 3); });
    on('half', e => EF.notice('HALF TIME', '#fff6e0', 3, 3)); on('fulltime', e => EF.notice('FULL TIME', '#fff6e0', 3, 3)); on('goldenGoal', e => EF.notice('GOLDEN GOAL!', '#ffd84a', 3, 3)); on('shootoutStart', e => EF.notice('PENALTY SHOOTOUT!', '#ffd84a', 2.6, 3));
    on('kickoff', e => EF.notice('KICK OFF', '#fff6e0', 1.1, 2)); on('replayStart', e => { this.replayCamTurn = true; this.yawNow = 0; }); on('replayEnd', e => { if (this.replayCamTurn) { this.replayCamTurn = false; this.turnTo(0); } });
    on('bus', e => { EF.notice('THEY PARKED THE BUS!', '#ffd8a0', 2.4, 2); EF.sfx('honk'); }); on('event', e => { if (e.name === 'seagull') EF.sfx('seagull'); if (e.name === 'fireworks') { EF.sfx('firework'); } if (e.name === 'flare') EF.sfx('boom'); });
    on('shootoutKick', e => { EF.notice(e.result === 'goal' ? 'SCORED!' : e.result === 'saved' ? 'SAVED!' : 'MISSED!', e.result === 'goal' ? '#9aff9a' : '#ff8a7a', 1.6, 3); });
    on('invaderTackled', e => { EF.notice('INVADER TACKLED!', '#ffd84a', 2, 2); EF.sfx('cheer'); if (EF.Save) EF.Save.sticker('x:keith'); });
    on('passDone', e => { if (M.teams[e.side].id === 'rpp' && EF.fxRng() < .5) EF.sfx({ wave: 'triangle', freq: 'E5', to: 'C5', dur: .18, vol: .1 }); });
  }
  rig(f) { return this.rigs.get(f); }
  /** turn the camera to a yaw (degrees, relative to the broadcast angle) */
  turnTo(deg) { const d = deg - (this.yawNow || 0); if (d) { try { game.rotateView(d); } catch (err) { /* view */ } this.yawNow = deg; } }
  /** each step: rigs from state, the camera, the crowd, the sound */
  update(dt) {
    const M = this.M, ball = M.ball; this.t += dt; this.goalT += dt; this.varT += dt; this.cardT = Math.max(0, this.cardT - dt);
    for (const f of M.F) this.animate(f, dt);
    const r = M.ref, rr = this.refRig; rr.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, pose: M.refCard ? 'cheer' : null });
    this.commentary.update(dt);
    if (M.mode === 'replay' && M.replay) { const u = M.replay.i / Math.max(1, M.replay.frames.length - 1); this.turnTo(u < .4 ? -32 : u < .75 ? 28 : -90 * 0 + 60); } else if (this.replayCamTurn && M.mode !== 'replay') { this.replayCamTurn = false; this.turnTo(0); }
    for (const n of EF.notices) n.t += dt; EF.notices = EF.notices.filter(n => n.t < n.dur);
    if (this.duelRing) { this.duelRing.t += dt; if (!M.duel) this.duelRing = null; }
    // the crowd's mood
    const tgt = clamp(.28 + Math.max(M.eu[0], M.eu[1]) * .5 + (M.europhoria ? .3 : 0) + (M.mode === 'goal' || M.mode === 'celebrate' ? .6 : 0) + (M.ball.speed() > 250 ? .1 : 0), 0, 1);
    this.mood += (tgt - this.mood) * Math.min(1, dt * 1.5); EF.crowdAudio.update(dt, this.mood);
    if (M.mode === 'play' && M.europhoria && this.t % 6 < dt) EF.crowdAudio.chant(M.teams[M.europhoria.side].id, this.t);
    this.updateCamera(dt);
    // super-strike trail
    if (ball.sup && !ball.owner) { this.trail.push({ x: ball.x, y: ball.y, z: ball.z + 3, t: 0, c: ball.sup.color || '#ffd84a' }); if (this.trail.length > 28) this.trail.shift(); } else if (this.trail.length) this.trail.shift();
    for (const t of this.trail) t.t += dt;
    // weather and lights
    if (M.europhoria && M.europhoria.side === 0 && EF.fxRng() < dt * 8) PT.add && 0;
  }
  animate(f, dt) {
    const rig = this.rig(f), M = this.M; let o = { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing };
    const st = f.state, u = f.stateT;
    if (f.celebrate > 0 && M.mode !== 'play' && st !== 'down') {
      const team = M.teams[f.side].data, style = f.celebStyle || team.celebration || 'cheer';
      o.pose = { cheer: 'cheer', robot: 'guard', flagdance: 'wave', badgekiss: 'kneel', helicopter: 'cheer', slide: 'kneel', fishslap: 'hips' }[style] || 'cheer'; o.expr = 'shout';
      if (style === 'helicopter') o.facing = this.t * 9; if (style === 'fishslap') o.attack = E.move('backslash', (this.t * 2) % 1);
      if (style === 'robot') { o.facing = Math.round(this.t * 2) * Math.PI / 2; }
      o.z = f.z + (style === 'cheer' ? Math.abs(Math.sin(this.t * 7 + f.id)) * 3 : 0);
    } else if (st === 'kick') { const k = f.action === 'poke' ? 'kick' : 'kick'; o.attack = E.move(k, clamp(u / (f.actionDur || .25), 0, 1)); if (f.action === 'shot') o.expr = 'shout'; }
    else if (st === 'slide') { o.attack = E.move('sweep', clamp(u / .42, 0, 1)); o.down = .75; o.facing = f.slideDir !== undefined ? f.slideDir : f.facing; }
    else if (st === 'barge') { o.attack = E.move('bash', clamp(u / .3, 0, 1)); o.lean = .4; }
    else if (st === 'down') { o.pose = 'down'; o.down = Math.min(1, u * 8); if (f.action === 'slideEnd') { o.down = 1; } o.expr = 'wince'; }
    else if (st === 'flying') { o.flip = clamp(u * 1.4, 0, 1); o.hurt = true; o.expr = 'wince'; }
    else if (st === 'diving') { o.down = Math.min(1, u * 6); o.pose = 'down'; o.expr = 'wince'; }
    else if (st === 'air') { o.air = true; const uu = clamp(u / (f.actionDur || .4), 0, 1); o.z = f.z + Math.sin(uu * Math.PI) * (f.jump > 0 ? 14 : 8); if (f.tilt) { o.tilt = { axis: 'right', angle: (f.action === 'bicycle' ? 1.45 : -1.15) * Math.sin(uu * Math.PI), lift: f.action === 'bicycle' ? 4 : 1 }; } o.attack = f.action === 'header' || f.action === 'divingHeader' ? undefined : E.move('kick', uu); o.expr = 'shout'; }
    else if (st === 'skill') { const uu = clamp(u / (f.actionDur || .38), 0, 1); o.z = f.z + Math.sin(uu * Math.PI) * 3; o.lean = (f.skillDir || 1) * Math.sin(uu * Math.PI * 2) * .5; if (f.action === 'rainbow') o.air = true; if (f.action === 'spin') o.flip = uu; o.sprint = true; }
    else if (st === 'keeperDive') { const uu = clamp(1 - f.k.diveT / .55, 0, 1); o.tilt = { axis: 'forward', angle: -(f.tilt > 0 ? 1 : -1) * (f.side === 0 ? 1 : -1) * 1.4 * Math.sin(Math.min(1, uu * 1.6) * Math.PI / 2 + (uu > .6 ? (uu - .6) * 1.2 : 0)), lift: 3 }; o.facing = f.side === 0 ? 0 : Math.PI; o.z = f.z + Math.sin(uu * Math.PI) * 4; o.expr = 'shout'; o.hurt = false; }
    else if (st === 'hold') { o.pose = 'guard'; o.vx = o.vy = 0; }
    else { o.sprint = f.sprinting; if (f.stun > 0) o.hurt = true; if (f.charging) o.lean = -.25; if (M.ball.owner === f) o.run = undefined; }
    if (f.immune > 0 && st !== 'skill') o.sprint = true;
    if (!f.data.boss) { /* normal size */ }
    rig.update(dt, o);
    // flare/scarf at europhoria: handled in draw
  }
  updateCamera(dt) {
    const M = this.M, b = M.ball, cp = this.camPos; let tx = b.x, ty = b.y, zt = .74, lead = .32;
    if (b.owner) { tx = b.owner.x + b.owner.vx * lead; ty = b.owner.y + b.owner.vy * lead * .5; } else { tx = b.x + b.vx * lead; ty = b.y + b.vy * lead * .6; }
    if (M.mode === 'setpiece' && M.sp) { if (M.sp.type === 'penalty') { tx = (M.sp.x + Pitch.goalX(M.sp.side)) / 2; ty = Pitch.CY; zt = 1.25; } else if (M.sp.type === 'corner') { tx = (M.sp.x + Pitch.CX) / 2 * .5 + M.sp.x * .5; ty = lerp(M.sp.y, Pitch.CY, .5); zt = .98; } else { tx = M.sp.x; ty = M.sp.y; zt = .98; } }
    if ((M.mode === 'goal' || M.mode === 'celebrate') && M.celebrant) { tx = M.celebrant.x; ty = M.celebrant.y; zt = 1.35; }
    if (M.mode === 'replay') { zt = 1.0; }
    if (M.mode === 'shootout') { const S = M.shoot; tx = Pitch.goalX(S.turn) - (S.turn === 0 ? 70 : -70); ty = Pitch.CY; zt = 1.2; }
    if (M.duel) { zt = 1.3; tx = lerp(tx, Pitch.goalX(M.duel.side === 0 ? 1 : 0), .5); }
    if (M.europhoria) zt = Math.min(zt, .8);
    if (M.mode === 'var') { zt = .95; }
    const zz = (this.zoom || 1) * ((game.settings && game.settings.zoom) || 1), hw = game.W / zz / 2, hv = game.H / (zz * Math.sin(game.view.pitch)) / 2;
    const rx = Math.max(0, (Pitch.X1 - Pitch.X0) / 2 - hw + 60), ry = Math.max(0, (Pitch.Y1 - Pitch.Y0) / 2 - hv + 70);
    tx = clamp(tx, Pitch.CX - rx, Pitch.CX + rx); ty = clamp(ty, Pitch.CY - ry, Pitch.CY + ry);
    const k = 1 - Math.exp(-dt * (M.mode === 'play' ? 5 : 3)); cp.x += (tx - cp.x) * k; cp.y += (ty - cp.y) * k;
    this.zoom += (zt - this.zoom) * (1 - Math.exp(-dt * 2.2));
    const pz = (game.settings && game.settings.zoom) || 1; if (Math.abs(this.zoomApplied - this.zoom * pz) > .02 || this.zoomApplied === undefined) { game.setZoom(this.zoom * pz > 3 ? 3 : this.zoom * pz); this.zoomApplied = this.zoom * pz; }
    game.focus(cp.x, cp.y, 6);
  }
  /* ---------- drawing ---------- */
  draw(r) {
    const M = this.M, view = E.charView(r.view), st = this.st, map = this.map;
    L.enabled = true; L.ambient = clamp(st.ambient * (M.flicker > 0 ? (Math.sin(this.t * 40) > 0 ? .4 : 1) : 1), .2, 1.1);
    map.drawFloor(r); this.skyline(r);
    map.queueWalls(r);
    this.drawBoards(r); this.drawFans(r); this.drawGoals(r); this.drawMarkings(r); if (this.extra) this.extra(r, view);
    // floodlights
    for (const [x, y] of [[Pitch.X0 - 22, Pitch.Y0 - 18], [Pitch.X1 + 22, Pitch.Y0 - 18], [Pitch.X0 - 22, Pitch.Y1 + 18], [Pitch.X1 + 22, Pitch.Y1 + 18], [Pitch.CX - 150, Pitch.Y0 - 18], [Pitch.CX + 150, Pitch.Y1 + 18]]) {
      r.queue(x, y, 0, g => { const [a, b] = r.w(x, y, 0), [c, d] = r.w(x, y, 120); px.line(g, Math.round(a), Math.round(b), Math.round(c), Math.round(d), '#3a3e4a', 2); px.rect(g, Math.round(c) - 6, Math.round(d) - 3, 12, 5, '#e8e4d0'); }, { solid: true });
      L.add(x, y, 90, 420, st.time === 'day' ? .25 : .95, { color: '#fff0c8' });
    }
    // actors, y sorted by the engine
    const refRig = this.refRig; r.shadow(M.ref.x, M.ref.y, 6, .3); r.actor(M.ref.x, M.ref.y, 0, (g, ox, oy) => refRig.draw(g, ox, oy, view));
    if (M.refCard) { const c = M.refCard.color === 'red' ? '#e8302a' : '#ffe04a', rx = M.ref.x, ry = M.ref.y; r.queue(rx, ry, 70, g => { const [x, y] = r.w(rx, ry, 40); px.rect(g, Math.round(x) - 4, Math.round(y) - 14, 8, 11, c); px.rect(g, Math.round(x) - 4, Math.round(y) - 14, 8, 1, '#ffffff'); }, { emissive: true }); }
    for (const f of M.F) {
      if (f.sentOff) continue; const rig = this.rig(f), sz = f.data.size || 1;
      r.shadow(f.x, f.y, 6 * Math.max(1, sz * .85), f.z > 1 ? .22 : .35);
      r.actor(f.x, f.y, f.z, (g, ox, oy) => rig.draw(g, ox, oy, view), { outline: true });
      if (f.state === 'slide' || f.state === 'barge') { r.queue(f.x, f.y, 1, g => { }, {}); }
    }
    this.drawEntities(r); this.drawBall(r); this.drawMarkers(r);
    if (this.st.snow || M.stadium.weather && M.stadium.weather.kind === 'fog') { /* weather is drawn by the engine; fog in the overlay */ }
    r.overlay(g => this.hud(g, r));
  }
  skyline(r) {
    const kind = this.st.skyline, M = this.M, y = -20, t = this.t;
    const col = this.st.time === 'day' ? '#7a8aa0' : '#0e0f18', col2 = this.st.time === 'day' ? '#9ab0c0' : '#1a1c2a', W = Pitch.COLS * TL;
    r.queue(W / 2, y - 40, 0, g => {
      const P = (x, z) => { const [a, b] = r.w(x, y, z); return [Math.round(a), Math.round(b)]; };
      const sky = SKY[kind] || SKY.sea; const [l, bt] = P(0, 0), [rr] = P(W, 0), [, top] = P(0, 220);
      // sky behind everything above the far stands
      for (let k = 0; k < 14; k++) { const yy = bt - 330 + k * 22; px.rect(g, l - 400, yy, rr - l + 800, 22, k < 7 ? sky[0] : sky[1]); }
      const pillar = (x, w, h, c) => { const [a, b] = P(x, 0), [, t2] = P(x, h); px.rect(g, a - w / 2, t2, w, b - t2, c); };
      if (kind === 'harbour') { for (let i = 0; i < 6; i++) pillar(80 + i * 130, 8, 70 + (i % 3) * 20, col); const [a, b] = P(W * .85, 0); px.rect(g, a - 5, b - 120, 10, 120, '#a09aa8'); px.rect(g, a - 7, b - 130, 14, 10, '#ffe08a'); const ang = t * 1.2; px.poly(g, [[a, b - 125], [a + Math.cos(ang) * 160, b - 125 + Math.sin(ang) * 30 - 40], [a + Math.cos(ang) * 160, b - 125 + Math.sin(ang) * 30 + 40]], 'rgba(255,240,180,0.12)'); }
      else if (kind === 'palms') { for (let i = 0; i < 9; i++) { const [a, b] = P(40 + i * 110, 0); px.line(g, a, b, a + 2, b - 60, '#5a4a2a', 3); px.poly(g, [[a, b - 62], [a - 20, b - 54], [a, b - 70], [a + 22, b - 52]], '#3a8a3a'); } const [d0, d1] = P(W * .45, 0); px.disc(g, d0, d1 - 80, 34, '#d8d0c0'); px.rect(g, d0 - 4, d1 - 120, 8, 12, '#c8c0b0'); }
      else if (kind === 'steel') { for (let i = 0; i < 7; i++) { pillar(60 + i * 120, 12, 100 + (i * 37 % 60), col2); const [a, b] = P(60 + i * 120, 0); px.rect(g, a - 6, b - 100 - (i * 37 % 60) - 4, 12, 4, '#ff7a1a'); } }
      else if (kind === 'walls') { for (let i = 0; i < 12; i++) { const [a, b] = P(20 + i * 62, 0); px.rect(g, a - 10, b - 50, 20, 50, col2); px.rect(g, a - 10, b - 56, 6, 6, col2); px.rect(g, a + 4, b - 56, 6, 6, col2); } const [a, b] = P(W * .2, 0); px.rect(g, a - 8, b - 110, 16, 110, col2); px.poly(g, [[a - 10, b - 110], [a, b - 128], [a + 10, b - 110]], '#5a2a2a'); }
      else if (kind === 'dome') { const [a, b] = P(W / 2, 0); for (let k = 0; k < 8; k++) { const ang = -Math.PI * .5 + (k - 3.5) * .16; px.line(g, a, b - 30, a + Math.cos(ang) * 220, b - 30 + Math.sin(ang) * 220, 'rgba(255,230,140,0.18)', 3); } px.disc(g, a, b - 20, 150, '#241c40'); px.disc(g, a, b - 20, 140, '#33285a'); }
      else { pillar(W * .3, 40, 20, col2); }
    }, { solid: true, bias: -50 });
  }
  drawBoards(r) {
    const st = this.st, texts = st.boards; if (!texts) return;
    const M = this.M;
    for (let i = 0; i < 4; i++) { const x = Pitch.X0 + 60 + i * 150, y0 = Pitch.Y0 - 7, y1 = Pitch.Y1 + 7; const txt = texts[i % texts.length].slice(0, 22);
      for (const [yy, dir] of [[y0, 0], [y1, 1]]) r.queue(x, yy, 12, g => { const [a, b] = r.w(x, yy, 11); const w = E.font.width(txt, { font: 'tiny' }) + 6; px.rect(g, Math.round(a - w / 2), Math.round(b - 8), w, 8, '#10131f'); E.font.text(g, txt, Math.round(a), Math.round(b - 7), ['#ffd84a', '#7aff9a', '#ff9a7a', '#9ad8ff'][i % 4], { font: 'tiny', align: 'center', outline: false }); }, { solid: dir === 0 }); }
  }
  drawMarkings(r) { /* the pitch lines are in the floor texture; a darker net shadow is in 'ao' */ }
  drawGoals(r) {
    const P = Pitch, M = this.M;
    for (const gx of [P.X0, P.X1]) {
      const dir = gx === P.X0 ? -1 : 1;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, P.BAR); px.rect(g, Math.round(x) - 1, Math.round(y1), 3, Math.round(y - y1), '#f8f8f0'); }, { solid: true });
      r.queue(gx, P.CY - P.GH, P.BAR, g => { const [x0, y0] = r.w(gx, P.CY - P.GH, P.BAR), [x1, y1] = r.w(gx, P.CY + P.GH, P.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f8f8f0', 2); }, { bias: 1 });
      // the net: back and roof lines
      r.queue(gx + dir * 24, P.CY, 4, g => { const gxb = gx + dir * 36; const A = r.w(gx, P.CY - P.GH, P.BAR), B = r.w(gxb, P.CY - P.GH, P.BAR - 8), C = r.w(gxb, P.CY + P.GH, P.BAR - 8), D = r.w(gx, P.CY + P.GH, P.BAR), E0 = r.w(gxb, P.CY - P.GH, 0), F0 = r.w(gxb, P.CY + P.GH, 0);
        const ln = (p, q) => px.line(g, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), 'rgba(230,236,240,0.55)', 1);
        ln(A, B); ln(D, C); ln(B, C); ln(B, E0); ln(C, F0); for (let k = 1; k < 6; k++) { const f = k / 6, p = r.w(gxb, P.CY - P.GH + f * 2 * P.GH, P.BAR - 8), q = r.w(gx, P.CY - P.GH + f * 2 * P.GH, P.BAR); ln(p, q); const p2 = r.w(gxb, P.CY - P.GH + f * 2 * P.GH, 0); ln(p, p2); } }, { solid: false });
    }
  }
  drawFans(r) {
    const M = this.M, mood = this.mood, t = this.t, euS = M.europhoria ? M.europhoria.side : -1, kit = euS >= 0 ? M.teams[euS].kit : null;
    const goalSide = (M.mode === 'goal' || M.mode === 'celebrate') && M.goalInfo ? M.goalInfo.side : -1;
    for (const f of this.fans) {
      let up = 0, arms = false;
      if (goalSide === f.side) { up = Math.abs(Math.sin(t * 8 + f.ph)) * 5; arms = true; }
      else if (euS === f.side) { up = Math.abs(Math.sin(t * 6 + f.ph)) * 3.5; arms = true; }
      else up = Math.sin(t * (1.5 + mood * 2) + f.ph) * (.4 + mood * .8) * (mood > .5 ? 1.4 : 1);
      let col = f.col; if (kit && f.side === euS && f.R < 2) col = (f.R + Math.floor(f.c / 3)) % 2 ? kit.cloth : (kit.color2 || kit.trim);
      const z = f.z + Math.max(0, up);
      r.queue(f.x, f.y, z, g => { const [x, y] = r.w(f.x, f.y, z), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, col); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); if (f.hat) px.rect(g, X - 1, Y - 9, 3, 1, col); if (arms) { px.line(g, X - 2, Y - 4, X - 3, Y - 9, f.skin, 1); px.line(g, X + 1, Y - 4, X + 3, Y - 9, f.skin, 1); } if (euS === f.side && f.ph < .9 && f.R > 1) { px.rect(g, X + 2, Y - 11 - (t * 20 + f.ph * 50) % 3, 1, 3, '#ff4a2a'); } }, { solid: false });
    }
  }
  drawEntities(r) {
    for (const e of this.M.fxEnts) {
      if (e.kind === 'seagull') r.queue(e.x, e.y, e.z, g => { const [x, y] = r.w(e.x, e.y, e.z), X = Math.round(x), Y = Math.round(y), fl = Math.sin(this.t * 12) * 3; px.rect(g, X - 2, Y - 2, 5, 3, '#f4f4f0'); px.poly(g, [[X - 2, Y - 1], [X - 7, Y - 3 - fl], [X, Y - 2]], '#d8d8d4'); px.poly(g, [[X + 2, Y - 1], [X + 7, Y - 3 + fl], [X, Y - 2]], '#d8d8d4'); px.rect(g, X + 3, Y - 2, 2, 1, '#f0a020'); }, {});
      else if (e.kind === 'beachball') r.queue(e.x, e.y, e.z, g => { const [x, y] = r.w(e.x, e.y, e.z); px.disc(g, Math.round(x), Math.round(y), 5, '#ff5a4a'); px.rect(g, Math.round(x) - 5, Math.round(y) - 1, 10, 2, '#ffe04a'); px.rect(g, Math.round(x) - 1, Math.round(y) - 5, 2, 10, '#4a8aff'); }, {});
      else if (e.kind === 'invader') r.queue(e.x, e.y, 0, g => { const [x, y] = r.w(e.x, e.y, 0), X = Math.round(x), Y = Math.round(y), c = e.who === 'keith' ? '#f08a24' : '#8a8a90', fl = e.caught ? 0 : Math.sin(this.t * 14) * 2; px.rect(g, X - 4, Y - 14 + fl, 8, 10, c); px.rect(g, X - 3, Y - 4, 3, 4, '#2a2a30'); px.rect(g, X + 1, Y - 4, 3, 4, '#2a2a30'); px.rect(g, X - 3, Y - 20 + fl, 6, 6, '#e0b090'); if (e.who === 'keith') { px.rect(g, X - 5, Y - 22 + fl, 10, 3, '#5a3a1a'); px.poly(g, [[X - 8, Y - 10], [X - 4, Y - 14], [X - 4, Y - 6]], c); } else { px.line(g, X - 3, Y - 20 + fl, X - 5, Y - 26 + fl, '#d8d8d8', 1); px.line(g, X + 3, Y - 20 + fl, X + 5, Y - 26 + fl, '#d8d8d8', 1); } if (e.caught) E.font.text(g, 'OOF!', X, Y - 30, '#ffe04a', { font: 'tiny', align: 'center' }); }, {});
      else if (e.kind === 'fxflag' && e.name === 'flare') { if (EF.fxRng() < .5) PT.smoke(Pitch.X0 + 200 + EF.fx(200), Pitch.Y0 - 24, 40, 1, { size: 8, color: '#a02a2a' }); }
      else if (e.kind === 'fxflag' && e.name === 'fireworks') { if (EF.fxRng() < .08) { const x = EF.fx(Pitch.X0, Pitch.X1), z = 90 + EF.fx(60); PT.glints(x, Pitch.Y0 - 30, z, 14, ['#ffd84a', '#ff6a8a', '#8ad8ff'][Math.floor(EF.fxRng() * 3)]); EF.sfx('firework', { vol: .5 }); } }
      else if (e.kind === 'fxflag' && e.name === 'drone') r.queue(Pitch.CX + Math.sin(e.t * .5) * 160, Pitch.CY + Math.cos(e.t * .7) * 80, 110, g => { const X = Pitch.CX + Math.sin(e.t * .5) * 160, Y = Pitch.CY + Math.cos(e.t * .7) * 80; const [x, y] = r.w(X, Y, 110); px.rect(g, Math.round(x) - 4, Math.round(y) - 1, 8, 2, '#3a3a44'); px.dot(g, Math.round(x) - 5, Math.round(y) - 2, '#ff4a4a'); px.dot(g, Math.round(x) + 5, Math.round(y) - 2, '#4aff6a'); }, { emissive: true });
    }
  }
  drawBall(r) {
    const M = this.M, b = M.ball, id = this.st.ball === 'orange' ? 'orange' : (this.o.ball || 'classic');
    for (const t of this.trail) { const a = 1 - t.t * 2.2; if (a <= 0) continue; r.queue(t.x, t.y, t.z, g => { const [x, y] = r.w(t.x, t.y, t.z); px.blend(g, a * .6, 'add', () => px.disc(g, Math.round(x), Math.round(y), 4 * a + 1, t.c)); }, { emissive: true }); }
    if (b.sup && !b.owner && b.decoys) for (let i = 0; i < b.decoys; i++) { const o = (i + 1) * 9 * (i % 2 ? 1 : -1), a = Math.atan2(b.vy, b.vx) + Math.PI / 2; const dx = Math.cos(a) * o, dy = Math.sin(a) * o; r.sprite(b.x + dx, b.y + dy, b.z + 2.5, EF.ballSprite('gold', Math.floor(b.roll / 8) % 2), { anchor: 'center' }); }
    r.shadow(b.x, b.y, 3 - Math.min(1.8, b.z * .04), .4);
    r.sprite(b.x, b.y, b.z + 2.5, EF.ballSprite(id, Math.floor(b.roll / 8) % 2), { anchor: 'center', glow: b.sup ? 6 : 0 });
  }
  drawMarkers(r) {
    const M = this.M;
    for (const h of M.humans) { const f = h.f; if (!f || f.sentOff) continue; const c = E.PLAYER_COLORS[h.idx] || '#ffe08a';
      r.queue(f.x, f.y, 44, g => { const [x, y] = r.w(f.x, f.y, 46 + Math.sin(this.t * 6) * 1.2), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 6], [X + 4, Y - 6], [X, Y]], c); px.rect(g, X - 4, Y - 7, 8, 1, '#000'); E.font.text(g, 'P' + (h.idx + 1), X, Y - 15, c, { font: 'tiny', align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
      // stamina and shot meter
      if (f.charging || f.stamina < .98) r.queue(f.x, f.y, 40, g => { const [x, y] = r.w(f.x, f.y, -3), X = Math.round(x), Y = Math.round(y); if (f.stamina < .98) E.ui.bar(g, X - 9, Y + 1, 18, 2, f.stamina, f.lowStamina ? '#ff6a4a' : '#7ae87a'); if (f.charging) { const c2 = Math.min(1.6, f.charge) / 1.6; E.ui.bar(g, X - 12, Y + 5, 24, 4, c2, f.charge > 1.15 ? '#ff4a4a' : f.charge > .72 && f.charge < .95 ? '#9aff4a' : '#ffd84a'); px.rect(g, X - 12 + Math.round(24 * .72 / 1.6), Y + 4, 1, 6, '#fff'); px.rect(g, X - 12 + Math.round(24 * .95 / 1.6), Y + 4, 1, 6, '#fff'); } }, { emissive: true });
      // mouse reticle
      if (h.ctl && h.ctl.mouseOn && h.idx === 0) { const g2 = game.mouseGround(); if (g2) r.queue(g2[0], g2[1], 0, g => { const [x, y] = r.w(g2[0], g2[1], 0), X = Math.round(x), Y = Math.round(y); px.line(g, X - 5, Y, X + 5, Y, c, 1); px.line(g, X, Y - 3, X, Y + 3, c, 1); }, { emissive: true }); }
    }
    // the ball's owner (CPU) gets a small dot; the receiver of a pass a ring
    if (M.ball.passTo && !M.ball.owner && M.ball.passTo.side === 0 && !M.ball.passTo.human) { const f = M.ball.passTo; r.queue(f.x, f.y, 0, g => { const [x, y] = r.w(f.x, f.y, 0); px.blend(g, .5, 'add', () => px.disc(g, Math.round(x), Math.round(y), 6, '#ffe08a')); }, { emissive: true }); }
  }
};
