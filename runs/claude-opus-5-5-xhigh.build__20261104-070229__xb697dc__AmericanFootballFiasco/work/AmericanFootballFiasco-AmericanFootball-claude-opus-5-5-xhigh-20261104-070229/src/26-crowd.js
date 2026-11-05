// The crowd on the stands (fans in team-colored sections, signs and foam fingers, standing and bobbing with the
// excitement, the Wave, camera flashes at night) and the sideline cast (cheerleaders, mascots, coaches, refs, the
// chain gang, the band), all presentation: they read the match and never touch it.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, bus = FF.bus;
const SKIN = ['#f0c8a8', '#e0b090', '#c89070', '#a87050', '#6a4028', '#4a2c18'];
class Crowd {
  constructor(st, teams, o = {}) {
    this.st = st; this.E = .3; this.wave = -1; this.waveT = 40; this.t = 0; this.jump = { side: -1, t: 0 }; this.flashes = [];
    const d = st.def, N = d.stands.tiers, dens = o.full ? 1 : d.stands.density, home = teams[0], away = teams[1];
    this.chunks = [];
    const add = (cx0, cx1, row, z, endStand) => {
      const fans = [];
      for (let cx = cx0; cx <= cx1; cx++) for (let k = 0; k < 3; k++) {
        const h = E.hash2(cx * 7 + k, row * 13 + (endStand ? 91 : 0)); if (h > dens * .95) continue;
        const awaySec = endStand ? cx > 64 : (cx > 100 && cx < 118);
        const t = awaySec ? away : home, cols = [t.colors.primary, t.colors.secondary, t.colors.trim, t.colors.primary];
        const shirt = cols[Math.floor(E.hash2(cx, row * 3 + k) * 4) % 4], sk = SKIN[Math.floor(E.hash2(cx + 3, row + k) * 6) % 6];
        const r2 = E.hash2(cx * 3 + k, row * 5 + 7), sign = r2 < .06 ? (FF.u.pick(t.sign || ['GO!'], () => E.hash2(cx, row + k))) : null, finger = !sign && r2 < .1;
        const hat = E.hash2(cx * 11 + k, row) < .3 ? (E.hash2(cx, k) < .5 ? t.colors.primary : '#f4f4f0') : null;
        fans.push({ x: cx * YD + 3 + k * 5 + E.hash2(cx, row * 2 + k) * 2, y: row * YD + 8 + (E.hash2(cx * 5, row + k) - .5) * 5, ph: E.hash2(cx, row + k * 9) * 6.28, shirt, sk, sign, finger, hat, side: awaySec ? 1 : 0, poncho: d.weather && d.weather.kind === 'rain' && E.hash2(cx * 2, row * 7 + k) < .4, parka: d.weather && d.weather.kind === 'snow' });
      }
      if (fans.length) this.chunks.push({ x: (cx0 + cx1 + 1) / 2 * YD, y: row * YD + 8, z, fans });
    };
    for (let tier = 0; tier < N; tier++) { const row = 7 - tier, z = 14 + 12 * tier; for (let c = 4; c < 124; c += 6) add(c, Math.min(123, c + 5), row, z, false); }
    for (let tier = 0; tier < 4; tier++) for (let row = 9; row <= 62; row += 1) { add(3 - tier, 3 - tier, row, 14 + 12 * tier, true); add(124 + tier, 124 + tier, row, 14 + 12 * tier, true); }
    this.count = this.chunks.reduce((n, c) => n + c.fans.length, 0);
    this.home = home; this.away = away;
  }
  excite(v) { this.E = Math.min(1, Math.max(this.E, v)); }
  update(dt, m) {
    this.t += dt; this.E = Math.max(.08, this.E - FF.T.crowdDecay * dt * .4);
    if (this.jump.t > 0) this.jump.t -= dt;
    this.waveT -= dt;
    if (this.wave < 0 && this.waveT <= 0 && this.E > .25 && this.E < .75 && m && m.score[0] >= m.score[1]) { this.wave = 0; this.waveT = 40 + FF.rf() * 30; }
    if (this.wave >= 0) { this.wave += dt * 10 * YD; if (this.wave > 140 * YD) this.wave = -1; }
    if ((this.st.night || this.st.def.light.towers || this.st.def.light.indoor) && FF.rf() < (.15 + this.E * .8) * dt * 20) { const c = FF.u.pick(this.chunks, FF.rf), f = c && c.fans[Math.floor(FF.rf() * c.fans.length)]; if (f) this.flashes.push({ f, z: c.z, t: .08 }); }
    for (const fl of this.flashes) fl.t -= dt; this.flashes = this.flashes.filter(f => f.t > 0);
  }
  draw(r) {
    const t = this.t, Ex = this.E, stand = Ex > .6, view = r.view, zz = game.zoom || 1;
    for (const c of this.chunks) {
      const [sx, sy] = r.w(c.x, c.y, c.z); if (sx < -60 * zz || sx > r.W + 60 * zz || sy < -40 || sy > r.H + 60) continue;
      r.queue(c.x, c.y, c.z, g => {
        for (const f of c.fans) {
          const wave = this.wave >= 0 ? Math.max(0, 1 - Math.abs(f.x - this.wave) / (3 * YD)) : 0;
          const jump = this.jump.t > 0 && f.side === this.jump.side ? Math.abs(Math.sin(t * 10 + f.ph)) * 5 : 0;
          const up = (stand ? 2 + Math.abs(Math.sin(t * 6 + f.ph)) * 1.5 * Ex : Math.sin(t * 1.5 + f.ph) * .6) + wave * 4 + jump;
          const [x0, y0] = r.w(f.x, f.y, c.z), X = Math.round(x0), Y = Math.round(y0 - up * zz), s = zz >= 1.15 ? 2 : 1;
          const sh = f.poncho ? '#e8e030' : f.parka ? E.shade(f.shirt, .15) : f.shirt;
          px.rect(g, X - s, Y - 4 * s, 3 * s, 4 * s, sh); px.rect(g, X - s, Y - 4 * s, 3 * s, 1, E.shade(sh, .25));
          px.rect(g, X - (s > 1 ? 1 : 0), Y - 6 * s, 2 * s, 2 * s, f.sk);
          if (f.hat) px.rect(g, X - (s > 1 ? 1 : 0), Y - 7 * s, 2 * s, s, f.hat);
          if (stand || wave > .3 || jump) { px.rect(g, X - 2 * s, Y - 7 * s + Math.round(Math.sin(t * 8 + f.ph)), s, 3 * s, f.sk); px.rect(g, X + 2 * s, Y - 7 * s + Math.round(Math.cos(t * 8 + f.ph)), s, 3 * s, f.sk); }
          if (f.finger) px.rect(g, X + 2 * s, Y - 9 * s, s + 1, 4 * s, f.shirt === this.home.colors.primary ? '#ffd84a' : '#ffd84a');
          if (f.sign) { const w = Math.max(8, f.sign.length * 4 + 2) * s, h = 7 * s, sy2 = Y - 9 * s - h; px.rect(g, X - w / 2, sy2, w, h, '#f4f0e6'); px.rect(g, X - w / 2, sy2 + h - 1, w, 1, '#a8a49c'); if (s > 1 || zz >= 1) E.font.text(g, f.sign, X, sy2 + 1, '#c83a2a', { font: 'tiny', align: 'center', outline: false, scale: s }); }
        }
      }, { bias: -2 });
    }
    for (const fl of this.flashes) r.queue(fl.f.x, fl.f.y, fl.z + 6, g => { const [x, y] = r.w(fl.f.x, fl.f.y, fl.z + 6); px.dot(g, x, y, '#ffffff'); px.dot(g, x + 1, y, '#e0e8ff'); }, { emissive: true });
    void view;
  }
}
FF.Crowd = Crowd;

/* ---- the sideline cast ---- */
class Sideline {
  constructor(m, st) {
    this.m = m; this.st = st; this.t = 0; this.cast = [];
    const R = FF.Rigs, sb = F.SIDE_B, add = (rig, x, y, role, o = {}) => { const c = Object.assign({ rig, x, y, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: 'idle', role, poseT: FF.rf() * 3, home: { x, y } }, o); this.cast.push(c); return c; };
    for (const s of [0, 1]) {
      const t = m.teams[s], base = F.MID_X + (s ? 260 : -260);
      for (let k = 0; k < 4; k++) add(R.cheer(t, k), base + (k - 1.5) * 26, sb + 28 + (k % 2) * 6, 'cheer', { side: s });
      this.mascot = this.mascot || [];
      this.mascot[s] = add(R.mascot(t), base + (s ? 70 : -70), sb + 40, 'mascot', { side: s, team: t });
      add(R.coach(t), F.MID_X + (s ? 120 : -120), sb + 52, 'coach', { side: s });
    }
    const ref = FF.data.cast.ref;
    this.refs = [add(R.ref(), F.MID_X, F.MID_Y, 'ref', { name: ref.name, k: 0 }), add(R.ref(), F.MID_X, F.MID_Y, 'ref', { k: 1 }), add(R.ref(), F.MID_X, sb + 14, 'line', { k: 2 })];
    this.chain = [add(R.person({ build: 'heroic', size: 1.1, hat: { style: 'cap', color: '#f0c020' }, colors: { cloth: '#f08a2a', pants: '#2a2a34', skin: '#c89070' } }), F.MID_X, sb + 20, 'chain', { k: 0 }),
      add(R.person({ build: 'heroic', size: 1.1, hat: { style: 'cap', color: '#f0c020' }, colors: { cloth: '#f08a2a', pants: '#2a2a34', skin: '#e0b090' } }), F.MID_X, sb + 20, 'chain', { k: 1 })];
    if (st.def.specials && st.def.specials.includes('band')) for (let k = 0; k < 8; k++) { const c = add(R.person({ build: 'heroic', size: 1.12, hat: { style: 'band', color: '#f0c040' }, colors: { cloth: '#f4f4f0', pants: '#18161e', skin: SKIN[k % 6], trim: '#f0c040' } }, { instrument: k % 3 ? 'horn' : 'drum', drumColor: '#f0c040' }), F.GOAL_R - 60 - (k % 4) * 24, sb + 30 + Math.floor(k / 4) * 16, 'band'); c.facing = -Math.PI / 2; }
    this.downMarker = { x: F.MID_X };
  }
  update(dt, m) {
    this.t += dt; const b = m.ball, live = m.phase === 'LIVE', sb = F.SIDE_B, D = m.dir(m.poss);
    for (const c of this.cast) {
      c.poseT += dt; let tx = c.home.x, ty = c.home.y, pose = 'idle';
      if (c.role === 'cheer') { pose = 'cheerleader'; if (m.phase === 'CELEBRATE' && m.lastScoreSide === c.side) pose = 'cheer'; }
      if (c.role === 'mascot') { pose = m.phase === 'CELEBRATE' && m.lastScoreSide === c.side ? 'cheer' : (this.mascotMood && this.mascotMood[c.side] > 0 ? 'dejected' : 'idle'); if (c.side === 0 && m.teams[0].mascot.head === 'tumbleweed') c.rig.ff.onFire = m.phase === 'CELEBRATE' && m.lastScoreSide === 0; }
      if (c.role === 'coach') { pose = live ? 'coachYell' : 'idle'; tx = E.clamp(b.x + (c.side ? 40 : -40), F.GOAL_L, F.GOAL_R); }
      if (c.role === 'ref') {
        if (c.down > 0) { c.down -= dt; pose = 'down'; c.vx *= .9; c.vy *= .9; c.x += c.vx * dt; c.y += c.vy * dt; c.rig && FF.Rigs.drive(c.rig, Object.assign({}, c, { pose: c.down > .4 ? 'down' : 'getUp', poseU: 1 - c.down / 1.4 }), dt); continue; }
        if (c.k === 0) { tx = m.los + D * 6 * YD; ty = m.ballY - 2 * YD; } else { tx = m.los + D * 20 * YD; ty = F.MID_Y + 6 * YD; }
        if (live && b.holder) { const dd = Math.hypot(b.holder.x - c.x, b.holder.y - c.y); if (dd < 3 * YD) { tx = c.x + (c.x - b.holder.x) * 2; ty = c.y + (c.y - b.holder.y) * 2; } if (dd < 10 && m.phase === 'LIVE' && !c.hitT) { c.down = 1.4; c.hitT = 3; const an = Math.atan2(c.y - b.holder.y, c.x - b.holder.x); c.vx = Math.cos(an) * 100; c.vy = Math.sin(an) * 100; bus.emit('refDown', { m }); } }
        if (c.hitT > 0) c.hitT -= dt;
        if (m.phase === 'DEAD' || m.phase === 'CELEBRATE') pose = this.signal || 'idle';
      }
      if (c.role === 'line') { tx = m.los; ty = sb + 14; if (m.phase === 'DEAD') pose = this.signal || 'idle'; }
      if (c.role === 'chain') { tx = c.k === 0 ? m.los : m.lineToGain || m.los; ty = sb + 20; }
      if (c.role === 'band') pose = 'idle';
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = c.role === 'ref' ? 150 : 90;
      if (d > 3) { c.vx = dx / d * Math.min(sp, d * 3); c.vy = dy / d * Math.min(sp, d * 3); pose = pose === 'idle' || pose === 'coachYell' ? 'run' : pose; } else { c.vx = c.vy = 0; }
      c.x += c.vx * dt; c.y += c.vy * dt; c.facing = d > 3 ? Math.atan2(c.vy, c.vx) : c.role === 'ref' || c.role === 'line' ? -Math.PI / 2 + .3 : -Math.PI / 2;
      if (c.role === 'band') { c.y = c.home.y + Math.abs(Math.sin(this.t * 4 + c.x)) * 0; c.vx = Math.sin(this.t * 2) * 10; }
      FF.Rigs.drive(c.rig, { x: c.x, y: c.y, z: 0, vx: c.vx, vy: c.vy, facing: c.facing, pose, poseT: c.poseT, poseU: 1 }, dt);
    }
    this.downMarker.x += ((m.los || F.MID_X) - this.downMarker.x) * Math.min(1, dt * 3);
  }
  /** the refs' signal after a play */
  call(kind) { this.signal = { td: 'refTD', first: 'refFD', inc: 'refInc', shrug: 'refShrug', spot: 'refFD' }[kind] || 'idle'; game.after(1.6, () => { this.signal = null; }); }
  draw(r, view) {
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, view), { every: c.role === 'band' || c.role === 'cheer' ? 2 : 1, key: c }); }
    // the down marker: an orange pole with its card showing the down
    const m = this.m, x = this.downMarker.x, y = F.SIDE_B + 18;
    r.shape('downMarker', x, y, 0, {});
    r.queue(x, y + 1, 36, g => { const [sx, sy] = r.w(x, y + 1, 38); E.font.text(g, String(m.down || 1), Math.round(sx), Math.round(sy) - 4, '#18161e', { align: 'center', outline: false, font: 'tiny' }); }, { bias: 1 });
    if (m.lineToGain) r.shape('chainPole', m.lineToGain, F.SIDE_B + 22, 0, {});
  }
}
FF.Sideline = Sideline;
})();
