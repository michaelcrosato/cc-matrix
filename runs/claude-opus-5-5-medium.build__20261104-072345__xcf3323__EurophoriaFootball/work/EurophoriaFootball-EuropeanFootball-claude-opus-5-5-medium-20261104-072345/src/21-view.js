/* 21-view: the MatchView draws a Match (live, from a replay's frames, or a hub client's mirror): the sky and skyline,
 * the stands and their crowd (mood, scarves, the tifo, flares), the boards' LED text, goals and nets, corner flags,
 * floodlights, the rigs (animated from each footballer's state), the ball and its trails, events, weather, fog and
 * smoke; and the broadcast camera director. */
const KICK = {
  touch: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .12, reach: 4, wind: .03, active: .04, recover: .08 },
  pass: { rel: true, kick: true, a0: .6, a1: -.1, z0: .15, z1: .2, reach: 6, wind: .08, active: .08, recover: .16, twist: .4 },
  shot: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.1, reach: 7, wind: .12, active: .1, recover: .26, lean: -.25, lunge: 2 },
  shotHard: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.5, reach: 7.5, wind: .14, active: .1, recover: .3, lean: -.35, lunge: 3, twist: .6 },
  chip: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: 1.4, reach: 5.5, wind: .1, active: .08, recover: .2, lean: -.4 },
  volley: { rel: true, kick: true, a0: .4, a1: -.2, z0: .9, z1: 1.2, reach: 7, wind: .06, active: .1, recover: .2, hop: 2, lean: -.4, twist: .6 },
  bicycle: { rel: true, kick: true, a0: .1, a1: 0, z0: 2.2, z1: 1.5, reach: 6, wind: .1, active: .1, recover: .3 },
  poke: { rel: true, kick: true, a0: .3, a1: 0, z0: .1, z1: .1, reach: 7.5, lunge: 3, wind: .05, active: .08, recover: .15 },
  slide: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: .15, reach: 8, wind: .04, active: .3, recover: .2, crouch: .9, lean: -.5, lunge: 2 },
  barge: E.MOVES.bash,
  stepover: { rel: true, kick: true, a0: .9, a1: -.3, z0: .12, z1: .12, reach: 5, wind: .04, active: .1, recover: .16 },
  rainbow: { rel: true, kick: true, a0: 3, a1: 2.6, z0: .1, z1: 1.3, reach: 4, wind: .05, active: .08, recover: .16 },
  nutmeg: { rel: true, kick: true, a0: .2, a1: -.1, z0: .05, z1: .1, reach: 6, wind: .05, active: .06, recover: .12 },
  knockon: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: .2, reach: 6, wind: .03, active: .05, recover: .1 },
  spin: null,
  throw: E.MOVES.throw, header: { rel: true, a0: 0, a1: 0, z0: 2, z1: 2, reach: 3, wind: .05, active: .08, recover: .2, lean: .5, hop: 2 },
  divingHeader: null, smother: null, catch: E.MOVES.cast, diveHigh: null, diveLow: null, dive: null, jab: E.MOVES.jab
};
EF.KICKS = KICK;
const kickState = (act) => {
  const sp = KICK[act.name]; if (!sp) return null;
  const tot = (sp.wind || .1) + (sp.active || .1) + (sp.recover || .2), u = clamp(act.t / act.dur, 0, 1) * tot;
  if (u < sp.wind) return { spec: sp, phase: 'wind', u: u / sp.wind };
  if (u < sp.wind + sp.active) return { spec: sp, phase: 'active', u: (u - sp.wind) / sp.active };
  return { spec: sp, phase: 'recover', u: Math.min(1, (u - sp.wind - sp.active) / sp.recover) };
};
const kitClash = (a, b) => { const A = E.hex(a), B = E.hex(b); return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]) < 150; };
EF.kitFor = (m, s) => {
  const t = m.teams[s];
  if (s === 0) return t.kits.home;
  return kitClash(t.kits.home.shirt, m.teams[0].kits.home.shirt) ? t.kits.away : t.kits.home;
};
function makeRig(f, kit, keeperKit) {
  const d = f.data, k = f.gk ? keeperKit : kit;
  return new E.Humanoid({ weapon: null, build: d.build || 'heroic', size: (d.size || 1.08) * (d.boss ? 1 : 1), hair: d.hair || 'short', sleeves: f.gk ? 'long' : 'short',
    kit: { pattern: k.pattern || 'plain', color2: k.color2, number: d.num, numberColor: k.numberColor || (E.hex(k.shirt).reduce((a, b) => a + b) > 450 ? '#1a1a2a' : '#ffffff') },
    colors: { skin: d.skin || '#e0b090', hair: d.hairColor || '#3a2418', cloth: k.shirt, pants: k.shorts, boot: '#1a1a20', belt: k.shorts, trim: k.socks || k.color2, glove: k.glove || d.skin || '#e0b090' }, speedRef: 80 });
}
EF.makeRig = makeRig;
EF.refRig = () => new E.Humanoid({ weapon: null, build: 'heroic', size: 1.06, hair: 'bald', sleeves: 'short', colors: { skin: '#e8c0a0', hair: '#6a5a4a', cloth: '#141414', pants: '#141414', boot: '#0a0a0a', belt: '#141414', trim: '#e8d040' }, speedRef: 80 });
class MatchView {
  constructor(m, o = {}) {
    this.m = m; this.o = o; this.t = 0;
    const kit0 = EF.kitFor(m, 0), kit1 = EF.kitFor(m, 1);
    this.kits = [kit0, kit1];
    this.rigs = m.players.map(f => makeRig(f, f.side ? kit1 : kit0, m.teams[f.side].kits.keeper));
    this.refRig = EF.refRig();
    this.mood = [0, 0]; this.crowdState = [0, 0]; this.crowdT = [0, 0]; this.wave = -1; this.flash = 0;
    this.boardText = null; this.boardT = 0; this.fireworks = [];
    this.buildCrowd();
    this.zoomT = 1; this.zoomNow = 1;
    this.trail = [];
    this.replay = null;
  }
  buildCrowd() {
    const m = this.m, st = m.st, map = m.map, fans = this.fans = [], size = (st.crowd && st.crowd.size) || 600, home = (st.crowd && st.crowd.home) || .7;
    const r = E.rng(st.seed || 3);
    const teamCols = s => { const k = this.kits[s]; return [k.shirt, k.color2 || k.shorts, k.shorts]; };
    const skins = ['#e0b090', '#a87050', '#6a4028', '#f0c8a8', '#c89070'], hairs = ['#1a1210', '#3a2418', '#6a4a2a', '#c8a060', '#888'];
    const cells = [];
    for (let R = 0; R < P.NS; R++) for (let c = P.WS; c < P.COLS - P.WS; c++) cells.push({ c, R, z: map.height(c, R), end: false });
    for (let R = P.NS; R < P.ROWS - P.SA; R++) for (let c = 0; c < P.WS; c++) { cells.push({ c, R, z: map.height(c, R), end: 'w' }); cells.push({ c: P.COLS - 1 - c, R, z: map.height(P.COLS - 1 - c, R), end: 'e' }); }
    const per = Math.max(.15, Math.min(2, size / cells.length));
    for (const cell of cells) {
      if (!cell.z) continue;
      const n = Math.floor(per * (cell.end ? 1.1 : 2) + r());
      for (let i = 0; i < n; i++) {
        const x = cell.c * TS + 3 + (i % 2) * 8 + r() * (cell.end ? 9 : 3), y = cell.R * TS + 4 + r() * (cell.end ? 10 : 6);
        // the home end is west, the away end east; the long stand mixed by the home share
        const side = cell.end === 'w' ? 0 : cell.end === 'e' ? 1 : (r() < home ? 0 : 1);
        const cols = teamCols(side), sh = cols[Math.floor(r() * 2)];
        fans.push({ x, y, z: cell.z, side, shirt: sh, shirtSh: E.shade(sh, -.25), skin: skins[Math.floor(r() * 5)], hair: hairs[Math.floor(r() * 5)], scarf: cols[0], scarf2: cols[1], ph: r() * 9, kind: r() < .25 ? 1 : r() < .06 ? 2 : r() < .03 ? 3 : 0, front: cell.R === P.NS - 1 || cell.c === P.WS - 1 || cell.c === P.COLS - P.WS });
      }
    }
    // flares in the front rows (lit at Europhoria)
    this.flares = fans.filter(f => f.front && r() < .08);
  }
  /* ---- the camera director ---- */
  camera(dt) {
    const m = this.m, rf = this.replay && this.replay.frame(), b = rf ? rf.ball : m.ball;
    let fx = b.x + (b.vx || 0) * .3, fy = b.y + (b.vy || 0) * .3, fz = (b.z || 0) * .4, zoom = .9;
    const hum = m.slots.map(sl => sl.f).filter(Boolean);
    if (hum.length && !this.replay) { const h = hum[0].body; fx = lerp(fx, h.x, .25); fy = lerp(fy, h.y, .25); }
    if (m.mode === 'setpiece' || m.mode === 'kickoff') { const sp = m.sp; if (sp && sp.kind === 'corner') { fx = lerp(b.x, P.goalLineX(m.dir(sp.side)) - m.dir(sp.side) * 90, .6); fy = lerp(b.y, P.CY, .6); zoom = .9; } else if (sp && sp.kind === 'penalty') { zoom = 1.3; } else zoom = 1.1; }
    if (m.mode === 'shootout') zoom = 1.3;
    if (m.mode === 'goal' && m.celebration && m.celebration.scorer) { const s = m.celebration.scorer.body; fx = s.x; fy = s.y; zoom = 1.3; }
    if (m.superFlight && m.superFlight.phase === 'charge') zoom = 1.3;
    if (m.duel && m.superFlight) { const k = m.keeper[1 - m.superFlight.side].body; fx = k.x + (m.ball.x - k.x) * .3; fy = k.y - 30; fz = 0; zoom = 1.2; }
    if (m.mode === 'halftime' || m.mode === 'fulltime') zoom = .9;
    if (this.replay) zoom = 1.2;
    if (this.o.zoom) zoom = this.o.zoom;
    this.zoomNow = approach(this.zoomNow, zoom, dt * .8);
    if (Math.abs((game.zoomBase || 0) - this.zoomNow) > .01 && !this.o.noZoom) { game.setZoom(this.zoomNow); game.zoomBase = this.zoomNow; }
    game.focus(fx, fy, fz);
  }
  /* ---- the rigs, from each footballer's state ---- */
  rigState(f, rig, dt, src) {
    const m = this.m, b = src.body || src, t = this.t;
    const s = { x: b.x, y: b.y, z: b.z || 0, vx: b.vx || 0, vy: b.vy || 0, facing: src.facing, sprint: !!src.sprinting };
    const st = src.state, act = src.act;
    if (act && KICK[act.name]) s.attack = kickState(act);
    if (act && act.name === 'spin') s.facing += clamp(act.t / act.dur, 0, 1) * TAU;
    switch (st) {
      case 'slide': s.attack = { spec: KICK.slide, phase: 'active', u: .5 }; s.crouch = true; s.z = 0; break;
      case 'launched': s.flip = (src.flip || 0) * .99; s.air = true; s.hurt = true; s.expr = 'wince'; break;
      case 'down': s.down = 1; s.expr = 'wince'; s.attack = null; break;
      case 'getup': s.down = 0; break;
      case 'stunned': s.hurt = true; s.expr = 'wince'; break;
      case 'dive': { const k = src.stateT || 0; if (k < .45) { s.flip = Math.min(.95, k / .5); s.air = true; } else { s.down = 1; s.expr = 'wince'; } s.attack = null; break; }
      case 'air': s.air = true; if (src.air && src.air.kind === 'bicycle') { s.flip = Math.min(.5, (src.air.t || 0) / .8); s.attack = { spec: KICK.bicycle, phase: 'active', u: .5 }; } if (src.air && src.air.kind === 'divingHeader') { s.down = Math.min(1, (src.air.t || 0) * 5); s.z = 4; } break;
      case 'keeper-dive': { const u = src.diveU || 0, side = src.tiltSide || 0; if (side) { s.facing = Math.atan2(side, 0); s.down = Math.min(1, u * 3); } else s.pose = 'cast'; s.point = true; break; }
      case 'keeper-hold': s.pose = 'cast'; break;
      case 'off': s.expr = 'angry'; break;
    }
    if (src.gk && st === 'run' && src.set) s.pose = 'guard';
    if (src.lift) s.z += src.lift * 6;
    const cel = src.celebrate;
    if (cel) {
      const a = cel === 'pile' ? 'pile' : cel.anim, k = t * 1.0;
      s.expr = 'shout';
      if (a === 'pile' || a === 'cheer') { s.pose = 'cheer'; s.z += Math.abs(Math.sin(t * 7 + f.idx)) * 4; }
      else if (a === 'kneeslide') { s.pose = 'kneel'; }
      else if (a === 'backflip') { s.flip = (t * .9) % 1; s.air = true; s.z += Math.sin(((t * .9) % 1) * PI) * 12; }
      else if (a === 'cartwheel') { s.flip = (t * 1.1) % 1; s.facing += PI / 2; s.air = true; }
      else if (a === 'aeroplane') { s.pose = 'cast'; s.facing += Math.sin(t * 3) * .4; }
      else if (a === 'robot') { s.attack = { spec: E.MOVES.jab, phase: Math.floor(t * 3) % 2 ? 'active' : 'wind', u: (t * 3) % 1 }; }
      else if (a === 'shirt') { s.pose = 'cheer'; }
      else if (a === 'dance') { s.run = .6; s.pose = 'wave'; }
      else if (a === 'badgekiss') { s.pose = 'kneel'; s.expr = 'smile'; }
      else if (a === 'helicopter') { s.down = .8; s.facing = t * 9; }
      else if (a === 'fishslap') { s.attack = { spec: E.MOVES.jab, phase: (t * 2.5) % 1 < .3 ? 'active' : 'recover', u: ((t * 2.5) % 1) }; }
    }
    if (src.dejected) { s.pose = Math.sin(f.idx) > 0 ? 'kneel' : null; s.expr = 'wince'; }
    rig.update(dt, s);
  }
  update(dt) {
    const m = this.m; this.t += dt;
    const frame = this.replay && this.replay.frame();
    m.players.forEach((f, i) => this.rigState(f, this.rigs[i], dt, frame ? frame.p[i] : f));
    const o = frame ? frame.ref : m.official;
    if (o) {
      const sig = o.sig, s = { x: o.body ? o.body.x : o.x, y: o.body ? o.body.y : o.y, z: 0, vx: o.body ? o.body.vx : 0, vy: o.body ? o.body.vy : 0, facing: o.facing };
      if (sig === 'card') { s.pose = 'cheer'; s.expr = 'angry'; } else if (sig === 'advantage' || sig === 'tv') s.pose = 'cast'; else if (sig === 'point') s.point = true; else if (sig === 'ear') s.pose = 'wave'; else if (sig === 'whistle') s.expr = 'shout';
      if ((o.downT || 0) > 0) { s.down = 1; s.expr = 'wince'; }
      this.refRig.update(dt, s);
    }
    // the crowd's mood: danger, goals, conceding
    for (let s = 0; s < 2; s++) {
      const u = P.toUV(m.dir(s), m.ball.x, m.ball.y)[0];
      const target = clamp((u - .4) * 1.4 + m.euph[s] / 160, 0, 1);
      this.mood[s] = approach(this.mood[s], target, dt * (target > this.mood[s] ? 2 : .6));
      this.crowdT[s] = Math.max(0, this.crowdT[s] - dt); if (this.crowdT[s] <= 0) this.crowdState[s] = m.euph[s] >= 67 ? 3 : 0;
    }
    if (m.euph[0] >= 67 && m.score[0] - m.score[1] >= 2 || m.euph[1] >= 67 && m.score[1] - m.score[0] >= 2) this.wave = (this.wave < 0 ? 0 : this.wave + dt * .35) % 1; else this.wave = -1;
    this.boardT = Math.max(0, this.boardT - dt); if (this.boardT <= 0) this.boardText = null;
    if (!this.o.noCamera) this.camera(dt);
    for (const fw of this.fireworks) fw.t -= dt; this.fireworks = this.fireworks.filter(f => f.t > 0);
    // trails behind fast balls
    const b = frame ? frame.ball : m.ball, sp = hyp(b.vx || 0, b.vy || 0);
    if (sp > 300 || b.superPath) { this.trail.push({ x: b.x, y: b.y, z: b.z, t: .25 }); }
    for (const q of this.trail) q.t -= dt; this.trail = this.trail.filter(q => q.t > 0);
  }
  react(type, ev) {
    const m = this.m, s = ev.side;
    const set = (side, st, t) => { if (side == null || side < 0) return; this.crowdState[side] = st; this.crowdT[side] = t; };
    if (type === 'goal') { set(ev.side, 2, 4); set(1 - ev.side, 5, 3); this.boardText = 'GOAL! GOAL! GOAL!'; this.boardT = 5; if (m.st.id === 'euphorium') this.firework(4); }
    if (type === 'ownGoal') { set(ev.side, 2, 3); set(1 - ev.side, 5, 3); this.boardText = 'GOAL!'; this.boardT = 4; }
    if (type === 'save' || type === 'woodwork') { const d = m.last ? 1 - m.last.side : 0; set(type === 'save' ? ev.side : d, 1, 1.5); set(type === 'save' ? 1 - ev.side : 1 - d, 5, 1.5); }
    if (type === 'diveBooked' || type === 'card') { set(ev.side, 4, 2); }
    if (type === 'europhoria') { set(ev.side, 2, 2); this.boardText = 'EUROPHORIA!'; this.boardT = EF.T.europhoriaTime; this.boardSide = ev.side; if (m.st.id === 'euphorium') this.firework(3); }
    if (type === 'nutmeg') set(ev.side, 1, 1.2);
    if (type === 'fireworks') this.firework(8);
  }
  firework(n) { for (let i = 0; i < n; i++) this.fireworks.push({ x: P.X0 + EF.fx() * P.L, y: -40 - EF.fx() * 40, z: 160 + EF.fx() * 80, t: 1.4 + i * .3, c: EF.fxPick(['#ff5a5a', '#ffe03a', '#3aff9a', '#5aa0ff', '#ff7ad0']), boom: false }); }

  /* ---- drawing ---- */
  draw(r) {
    const m = this.m, st = m.st, frame = this.replay && this.replay.frame(), t = this.t, ev = m.ev;
    const night = st.time === 'night', dusk = st.time === 'dusk';
    // lights: the stadium's ambient, the floodlights at the corners (failing in the floodlight event)
    const dark = ev && ev.id === 'floodlight' && ev.dark;
    LIGHTS.enabled = !!(st.lights && st.lights.ambient < 1) || dark;
    LIGHTS.ambient = dark ? .14 : (st.lights ? st.lights.ambient : 1) + (m.half === 2 && dusk ? -.1 : 0);
    r.sky(st.look.sky || ['#102040', '#304070', '#6080a0']);
    const top = r.w(P.CX, 0, (st.look.tiers || [64])[3] + 4);
    EF.drawSkyline(r.ctx, r, st, t, Math.round(top[1]), r.bw);
    if (night) for (let i = 0; i < 30; i++) { const x = (E.hash2(i, 7) * r.bw) | 0, y = (E.hash2(i, 9) * Math.max(10, top[1] - 20)) | 0; px.dot(r.ctx, x, y, i % 3 ? '#8890b0' : '#ffffff'); }
    // the fireworks over the stands
    for (const fw of this.fireworks) { if (fw.t < 1.2 && !fw.boom) { fw.boom = true; PFX.explosion(fw.x, fw.y, fw.z, 1.4, { debris: false, shake: 0 }); PFX.glints(fw.x, fw.y, fw.z, 24, fw.c); A.sfx('explode', { vol: .25 }); } }
    m.map.drawFloor(r); m.map.queueWalls(r);
    this.drawStands(r, t);
    this.drawBoards(r, t);
    this.drawGoals(r);
    this.drawFlags(r, t);
    if (st.lights && st.lights.flood) this.drawFloodlights(r, dark);
    // the dugouts and the fourth official
    for (const dx of [-120, 120]) r.queue(P.CX + dx, P.Y1 + 30, 0, g => { const w = r.w(P.CX + dx - 30, P.Y1 + 38, 0), w2 = r.w(P.CX + dx + 30, P.Y1 + 38, 18); px.rect(g, Math.round(w[0]), Math.round(w2[1]), Math.round(w2[0] - w[0]), Math.round(w[1] - w2[1]), '#2a3a5a'); px.rect(g, Math.round(w[0]) + 2, Math.round(w2[1]) + 2, Math.round(w2[0] - w[0]) - 4, Math.round(w[1] - w2[1]) - 6, '#a8c8e0'); });
    if (m.boardShown && m.half <= 2 && m.minute > m.half * 45 - 2 && m.minute < m.half * 45 + 1.5) r.queue(P.CX, P.Y1 + 14, 0, g => { const [x, y] = r.w(P.CX, P.Y1 + 14, 30); px.rect(g, Math.round(x) - 9, Math.round(y) - 6, 18, 12, '#141414'); E.font.text(g, '+' + m.stoppage, Math.round(x), Math.round(y) - 4, '#ff3a3a', { align: 'center', outline: false }); }, { emissive: true });
    // the bus
    if (m.bus && m.bus.on) { const k = m.bus, cx = (k.x0 + k.x1) / 2; r.queue(cx, P.CY + 30, 0, g => { const [x, y] = r.w(cx, P.CY + 30, 0), [, yt] = r.w(cx, P.CY - 30, 30); EF.drawBus(g, x, y, Math.max(.6, (y - yt) / 40), '#7a1a2a', false); }, { bias: 2 }); }
    // the players
    const view = E.charView(r.view);
    m.players.forEach((f, i) => {
      const src = frame ? frame.p[i] : { x: f.body.x, y: f.body.y, z: f.body.z, gone: f.state === 'gone' };
      if (src.gone || src.x < -1000) return;
      r.shadow(src.x, src.y, 6, .35);
      const rig = this.rigs[i], glow = frame ? src.glow : f.glow;
      r.actor(src.x, src.y, src.z, (g, ox, oy) => rig.draw(g, ox, oy, view), glow ? { flash: Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ffe08a', flashMix: .22, emissive: true } : {});
      if (!frame && f.celebrate && f.celebrate.anim === 'shirt') r.queue(src.x, src.y, 30, g => { const [x, y] = r.w(src.x, src.y, 30); px.ell(g, Math.round(x), Math.round(y), 5, 4, this.kits[f.side].shirt); }, { bias: 3 });
      if (!frame && f.celebrate && f.celebrate.anim === 'fishslap') { const h = this.rigs[i].hand ? this.rigs[i].hand('R') : null; if (h) r.sprite(h.x !== undefined ? h.x : h[0], h.y !== undefined ? h.y : h[1], (h.z !== undefined ? h.z : h[2]) || 16, EF.FISH_PROP, { anchor: 'center' }); }
    });
    // the referee
    const o = frame ? frame.ref : m.official;
    if (o) { const ox = o.body ? o.body.x : o.x, oy = o.body ? o.body.y : o.y; r.shadow(ox, oy, 5, .3); r.actor(ox, oy, 0, (g, x, y) => this.refRig.draw(g, x, y, view)); if (o.sig === 'card' && !frame) { const c = m.cards[m.cards.length - 1]; r.sprite(ox, oy, 40, c && c.kind !== 'yellow' ? EF.CARD.red : EF.CARD.yellow, { anchor: 'center' }); } }
    // the ball, its shadow, its trail, the decoys
    const b = frame ? frame.ball : m.ball, style = this.o.ball || (st.ballStyle) || 'classic';
    const frames = (EF.BALLS[b.superName && m.superFlight && m.superFlight.def.ball === 'gold' ? 'gold' : style] || EF.BALLS.classic).frames;
    for (const q of this.trail) r.queue(q.x, q.y, q.z + 2, g => { const [x, y] = r.w(q.x, q.y, q.z + 2); px.blend(g, q.t * 2, 'add', () => px.disc(g, Math.round(x), Math.round(y), 2, m.superFlight ? (m.superFlight.def.color || '#ffd040') : '#ffffff')); }, { emissive: true });
    if (!(b.x < -1000)) {
      r.shadow(b.x, b.y, 3 - Math.min(1.5, (b.z || 0) * .03), .45 - Math.min(.3, (b.z || 0) * .004));
      const kipper = m.superFlight && m.superFlight.def.ball === 'kipper' && m.superFlight.phase !== 'charge';
      if (kipper) r.sprite(b.x, b.y, (b.z || 0) + 2.5, EF.KIPPER_SPR, { anchor: 'center', glow: true });
      else r.sprite(b.x, b.y, (b.z || 0) + 2.5, frames[Math.floor((b.roll || 0) / 5) % 4], { anchor: 'center', glow: !!b.superPath });
      if (b.decoys) for (const d of b.decoys) r.sprite(d.x, d.y, d.z + 2.5, EF.BALLS.gold.frames[Math.floor(t * 20) % 4], { anchor: 'center', glow: true });
      if (night || dark) LIGHTS.add(b.x, b.y, (b.z || 0) + 4, 18, dark ? .7 : .2, { color: '#ffffff' });
    }
    // matchday events' actors
    if (ev) this.drawEvent(r, ev, view, t);
    if (m.euroT[0] > 0 || m.euroT[1] > 0) for (const f of this.flares) if (m.euroT[f.side] > 0) LIGHTS.add(f.x, f.y, f.z + 8, 40, .6, { color: '#ff3a2a' });
    // fog (Lucchetto's second half) and flare smoke
    const fog = st.fogAll || (st.fogSecondHalf && m.half >= 2);
    if (fog || (ev && ev.id === 'flaresmoke')) r.overlay(g => {
      if (fog) for (let i = 0; i < 4; i++) px.polyDither(g, [[0, r.H * (.1 + i * .1)], [r.W, r.H * (.1 + i * .1)], [r.W, r.H], [0, r.H]], '#c8c8d0', .12 + i * .04, r.ix + i * 3, r.iy);
      if (ev && ev.id === 'flaresmoke') { const [, sy] = r.w(P.CX, ev.y, 0); const k = Math.min(1, ev.t / 2) * Math.min(1, (15 - ev.t) / 2); for (let i = 0; i < 3; i++) px.polyDither(g, [[0, sy - 40 - i * 10], [r.W, sy - 60 - i * 10], [r.W, sy + 30], [0, sy + 50]], i ? '#e04a3a' : '#c8a0a0', .25 * k, r.ix + Math.round(t * 20) + i, r.iy); }
    });
  }
  drawStands(r, t) {
    const m = this.m, st = m.st, euro = [m.euroT[0] > 0, m.euroT[1] > 0];
    for (const f of this.fans) {
      if (!r.visible(f.x, f.y, f.z, 20, 20, 20)) continue;
      let s = this.crowdState[f.side];
      if (euro[f.side]) s = (Math.floor(t * 2 + f.ph) % 3 === 0) ? 2 : 3;
      if (this.wave >= 0) { const u = (f.x - P.X0) / P.L; if (Math.abs(u - this.wave) < .06) s = 1; }
      if (s === 0 && this.mood[f.side] > .7 && Math.sin(t * 3 + f.ph) > .8) s = 1;
      r.queue(f.x, f.y, f.z, g => { const [x, y] = r.w(f.x, f.y, f.z); EF.drawFan(g, x, y, f, s, t); });
    }
    // flares: fire and smoke in the front rows of a side in Europhoria
    for (const f of this.flares) if (euro[f.side] && EF.fxRng() < .15) { PFX.fire(f.x, f.y, f.z + 6, 1, { size: .6 }); if (EF.fxRng() < .3) PFX.smoke(f.x, f.y, f.z + 10, 1, { size: .8, color: '#c84a3a' }); }
    // the tifo: unrolled over the side's end of the long stand during its Europhoria
    for (let s = 0; s < 2; s++) {
      if (m.euroT[s] <= 0) continue;
      const u = Math.min(1, (EF.T.europhoriaTime - m.euroT[s]) / 1) * Math.min(1, m.euroT[s] / .6);
      const homeEnd = (s === 0) !== m.swapped ? 0 : 1;
      const x0 = homeEnd === 0 ? P.X0 - 40 : P.CX + 40, x1 = homeEnd === 0 ? P.CX - 40 : P.X1 + 40, z = (st.look.tiers || [64])[3];
      r.queue((x0 + x1) / 2, 2, z, g => { const a = r.w(x0, 4, z + 30), b = r.w(x1, 4, z - 10); EF.drawTifo(g, m.teams[s], a[0], a[1], b[0] - a[0], b[1] - a[1], u); }, { bias: 2 });
    }
  }
  drawBoards(r, t) {
    const m = this.m, st = m.st, boards = st.boards || ['EUROPHORIA'], y = P.Y0 - 0.5;
    const euroSide = m.euroT[0] > 0 ? 0 : m.euroT[1] > 0 ? 1 : -1;
    const segs = 6, segW = (P.X1 - P.X0 + 120) / segs;
    for (let i = 0; i < segs; i++) {
      const x0 = P.X0 - 60 + i * segW, x1 = x0 + segW - 4;
      r.queue((x0 + x1) / 2, y, 0, g => {
        const a = r.w(x0, y, 21), b = r.w(x1, y, 5);
        const X = Math.round(a[0]), Y = Math.round(a[1]), W = Math.round(b[0] - a[0]), H = Math.max(4, Math.round(b[1] - a[1]));
        if (W < 4) return;
        const bg = euroSide >= 0 ? this.kits[euroSide].shirt : this.boardText ? '#c8202a' : '#0a0c18';
        px.rect(g, X, Y, W, H, bg);
        for (let k = 0; k < W; k += 2) if ((k + i) % 6 === 0) px.rect(g, X + k, Y, 1, H, '#00000030');
        const text = this.boardText || boards[(i + Math.floor(t / 6)) % boards.length], tw = E.font.width(text);
        const off = Math.round((t * 30) % (tw + W)), fs = H >= 9 ? 1 : null;
        if (fs) { g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip(); E.font.text(g, text, X + W - off, Y + Math.round((H - 7) / 2), euroSide >= 0 ? (E.hex(this.kits[euroSide].shirt).reduce((p, q) => p + q) > 450 ? '#141414' : '#ffffff') : this.boardText ? '#ffffff' : ['#ffc83a', '#5ae0ff', '#ff7ad0'][i % 3], { outline: false }); g.restore(); }
      }, { emissive: true, bias: 1 });
    }
  }
  drawGoals(r) {
    for (const gx of [P.X0, P.X1]) {
      const back = gx === P.X0 ? gx - P.NET : gx + P.NET, gH = P.GH, bar = P.BAR;
      // the net: back and sides, a dithered mesh
      r.queue(back, P.CY, 0, g => {
        for (let i = 0; i <= 8; i++) { const yy = P.CY - gH + i * gH / 4; const a = r.w(back, yy, 0), b = r.w(back, yy, bar - 6); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#d8dce8'); }
        for (let k = 0; k <= 4; k++) { const z = k * (bar - 6) / 4, a = r.w(back, P.CY - gH, z), b = r.w(back, P.CY + gH, z); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
      }, { bias: -2 });
      for (const py of [P.CY - gH, P.CY + gH]) r.queue((gx + back) / 2, py, 0, g => {
        for (let k = 0; k <= 4; k++) { const z = k * (bar - 6) / 4, a = r.w(gx, py, bar * (k / 4)), b = r.w(back, py, z); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
        for (let i = 0; i <= 3; i++) { const xx = lerp(gx, back, i / 3), a = r.w(xx, py, 0), b = r.w(xx, py, lerp(bar, bar - 6, i / 3)); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
      });
      // the roof of the net
      r.queue((gx + back) / 2, P.CY, bar, g => { const a = r.w(gx, P.CY - gH, bar), b = r.w(gx, P.CY + gH, bar), c = r.w(back, P.CY + gH, bar - 6), d = r.w(back, P.CY - gH, bar - 6); px.polyDither(g, [a, b, c, d], '#e8ecf4', .3, r.ix, r.iy); }, { bias: 1 });
      // the posts and the bar
      for (const py of [P.CY - gH, P.CY + gH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, bar); px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); px.rect(g, Math.round(x) + 1, Math.round(y1), 1, Math.round(y - y1), '#a8acb8'); }, { bias: 1 });
      r.queue(gx, P.CY + gH, bar, g => { const a = r.w(gx, P.CY - gH, bar), b = r.w(gx, P.CY + gH, bar); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#f4f4f0', 2); }, { bias: 2 });
    }
  }
  drawFlags(r, t) {
    const col = this.kits[0].shirt;
    for (const x of [P.X0, P.X1]) for (const y of [P.Y0, P.Y1]) r.queue(x, y, 0, g => {
      const [px0, py0] = r.w(x, y, 0), [, py1] = r.w(x, y, 22); px.line(g, Math.round(px0), Math.round(py0), Math.round(px0), Math.round(py1), '#e8e8e0');
      const w = Math.round(Math.sin(t * 5 + x) * 1.5); px.poly(g, [[px0, py1], [px0 + 7 + w, py1 + 2], [px0, py1 + 5]], col);
    });
  }
  drawFloodlights(r, dark) {
    const m = this.m, col = (m.st.lights && m.st.lights.color) || '#fff0d0';
    for (const [x, y] of [[P.X0 - 70, -20], [P.X1 + 70, -20], [P.X0 - 70, P.Y1 + 60], [P.X1 + 70, P.Y1 + 60]]) {
      const far = y < 0;
      if (far) r.queue(x, y, 0, g => {
        const [bx, by] = r.w(x, y, 0), [tx, ty] = r.w(x, y, 190);
        px.line(g, Math.round(bx) - 3, Math.round(by), Math.round(tx), Math.round(ty), '#5a5a68', 1); px.line(g, Math.round(bx) + 3, Math.round(by), Math.round(tx), Math.round(ty), '#5a5a68', 1);
        for (let k = 1; k < 8; k++) { const yy = lerp(by, ty, k / 8); px.line(g, Math.round(lerp(bx - 3, tx, k / 8)), Math.round(yy), Math.round(lerp(bx + 3, tx, (k + 1) / 8)), Math.round(lerp(by, ty, (k + 1) / 8)), '#4a4a58'); }
        px.rect(g, Math.round(tx) - 10, Math.round(ty) - 8, 20, 9, '#2a2a34');
        if (!dark) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) px.rect(g, Math.round(tx) - 9 + i * 5, Math.round(ty) - 7 + j * 4, 3, 3, '#fffbe8');
      }, { emissive: !dark });
      if (!dark) LIGHTS.add(lerp(x, P.CX, .35), lerp(y, P.CY, .35), 120, 480, .55, { color: col });
    }
  }
  drawEvent(r, ev, view, t) {
    if (ev.id === 'seagull') {
      const gx = ev.landed ? ev.x : lerp(P.X0, ev.x, Math.min(1, ev.t / 3)), gy = ev.landed ? ev.y : ev.y - 60 * (1 - Math.min(1, ev.t / 3)), gz = ev.landed && !ev.gone ? 6 : ev.gone ? 6 + (ev.t - ev.goneT) * 40 : 60 * (1 - Math.min(1, ev.t / 3)) + 6;
      if (!this.gull) this.gull = new E.Blob({ R: 4, wings: true, feet: true, colors: { dk: '#a8acb8', base: '#f4f4f0', lt: '#ffffff', spec: '#fff', eye: '#141414', pupil: '#141414' } });
      this.gull.update(1 / 60, { flap: ev.landed && !ev.gone ? 0 : 1, squash: Math.sin(t * 9) * .05 });
      r.actor(gx, gy, gz, (g, x, y) => this.gull.draw(g, x, y, view));
    }
    if (ev.id === 'beachball' && ev.body && !ev.popped) { const k = ev.body; r.shadow(k.x, k.y, 6, .3); r.queue(k.x, k.y, k.z + 7, g => { const [x, y] = r.w(k.x, k.y, k.z + 7); px.disc(g, Math.round(x), Math.round(y), 6, '#f4f4f0'); px.poly(g, [[x, y - 6], [x + 6, y], [x, y]], '#ff4a4a'); px.poly(g, [[x, y + 6], [x - 6, y], [x, y]], '#3a8aff'); px.poly(g, [[x - 6, y], [x, y - 6], [x, y]], '#ffd03a'); }); }
    if ((ev.id === 'invader-keith' || ev.id === 'invader-stag') && ev.body) {
      if (!this.invRig) { this.invRig = new E.Humanoid({ weapon: null, build: 'bulky', size: 1.1, colors: ev.id === 'invader-keith' ? { cloth: '#c8803a', pants: '#c8803a', skin: '#e0b090' } : { cloth: '#8a6a4a', pants: '#5a4a3a', skin: '#e0b090' } }); this.stewRigs = [0, 1].map(() => new E.Humanoid({ weapon: null, size: 1.05, colors: { cloth: '#d8f03a', pants: '#2a2a3a', skin: '#c89070' } })); }
      const k = ev.body; this.invRig.update(1 / 60, { x: k.x, y: k.y, z: 0, vx: k.vx, vy: k.vy, facing: Math.atan2(k.vy, k.vx), pose: ev.caught ? null : 'cheer' });
      r.shadow(k.x, k.y, 6, .3); r.actor(k.x, k.y, 0, (g, x, y) => this.invRig.draw(g, x, y, view));
      r.queue(k.x, k.y, 34, g => { const [x, y] = r.w(k.x, k.y, 32); if (ev.id === 'invader-keith') { px.ell(g, Math.round(x), Math.round(y), 8, 5, '#c8803a'); px.poly(g, [[x + 7, y], [x + 12, y - 4], [x + 12, y + 4]], '#c8803a'); px.dot(g, Math.round(x - 4), Math.round(y - 1), '#141414'); } else { px.ell(g, Math.round(x), Math.round(y), 5, 5, '#8a6a4a'); for (const d of [-1, 1]) { px.line(g, x + d * 3, y - 3, x + d * 9, y - 12, '#e8d8b0'); px.line(g, x + d * 6, y - 7, x + d * 11, y - 7, '#e8d8b0'); } } }, { bias: 3 });
      ev.stewards.forEach((s, i) => { this.stewRigs[i].update(1 / 60, { x: s.x, y: s.y, z: 0, vx: s.vx, vy: s.vy, facing: Math.atan2(s.vy, s.vx) }); r.actor(s.x, s.y, 0, (g, x, y) => this.stewRigs[i].draw(g, x, y, view)); });
    }
    if (ev.id === 'drone' && ev.x != null) r.queue(ev.x, ev.y, 90, g => { const [x, y] = r.w(ev.x, ev.y, 90); px.rect(g, Math.round(x) - 4, Math.round(y) - 1, 8, 3, '#2a2a34'); for (const d of [-6, 6]) px.rect(g, Math.round(x + d) - 2, Math.round(y) - 3 + (Math.floor(t * 30) % 2), 4, 1, '#c8c8d0'); px.dot(g, Math.round(x), Math.round(y) + 2, Math.floor(t * 4) % 2 ? '#ff3a3a' : '#3a3a3a'); }, { emissive: true });
  }
}
EF.MatchView = MatchView;
