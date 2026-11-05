/* THE CROWD (section 6.18): fans on every tier, drawn by code in their side's colours; a mood per side that follows the
 * danger, goals and misses; states that set the animation: idle, tense, jump, despair, boo, scarf wall (Euphoria 67+),
 * the Mexican wave (67+ and two goals up), Europhoria (flares and the tifo). The front row are classic rigs. */
class CrowdView {
  constructor(m) {
    this.m = m; this.fans = []; this.rows = []; this.rigs = []; this.state = ['idle', 'idle']; this.stateT = [0, 0]; this.mood = [.3, .3]; this.tifo = [0, 0]; this.wave = -1; this.waveT = 0;
    const st = m.stadium, size = (st.crowd && st.crowd.size) || 800, home = (st.crowd && st.crowd.home) || .7, dens = clamp(size / 1500, .005, 1), map = m.pitch.map, R = E.rng(st.id.length * 131 + 7);
    const kit = s => m.teams[s].kits.home, skins = ['#f0c8a8', '#e0b090', '#c89070', '#8a5a3a', '#6a4028', '#f4d8c0'], hairs = ['#2a1a10', '#5a3a20', '#c8a050', '#1a1210', '#8a8a8a', '#a84a20'];
    const make = (x, y, z, side, faceX, rowKey) => {
      if (R() > dens) return;
      const k = kit(side), r = R(), shirt = r < .45 ? k.shirt : r < .7 ? (k.color2 || k.shirt) : r < .8 ? k.socks || k.shirt : ['#3a3a48', '#5a4a3a', '#2a3a5a', '#6a2a2a'][Math.floor(R() * 4)];
      const kind = R() < .12 ? 'flag' : R() < .3 ? 'scarf' : R() < .035 ? 'drum' : 'plain';
      const f = { x, y, z, side, shirt, scarf: k.color2 || '#ffffff', skin: skins[Math.floor(R() * skins.length)], hair: hairs[Math.floor(R() * hairs.length)], kind, ph: R() * TAU, faceX, rowKey, hat: R() < .15 ? k.shirt : null };
      this.fans.push(f); return f;
    };
    // the north stand: tier rows, two rows of fans a tier; west of a split the home side, mixed in the middle, away to the east
    const tierH = (st.stands && st.stands.north && st.stands.north.heights) || [34, 44, 54, 64, 74, 84];
    for (let r = 0; r < P.NS; r++) {
      const tier = P.NS - 1 - r, n = Math.min(P.NS, (st.stands && st.stands.north && st.stands.north.tiers) || 5); if (tier >= n) continue;
      for (const dy of [5, 11]) {
        const row = { key: 'n' + r + dy, y: r * P.T + dy, z: tierH[tier], fans: [], front: tier === 0 && dy === 11 };
        for (let x = 6; x < P.COLS * P.T - 6; x += 6.5 + (R() - .5) * 1.5) {
          const u = x / (P.COLS * P.T), side = u < .3 ? (R() < .92 ? 0 : 1) : u > .78 ? (R() < .8 ? 1 : 0) : R() < home ? 0 : 1;
          const f = make(x, row.y, row.z, side, 0, row.key); if (f) row.fans.push(f);
        }
        this.rows.push(row);
      }
    }
    // the end stands: columns of tiers; west for the home side, east for the away side
    const endN = Math.min(P.END, (st.stands && st.stands.end && st.stands.end.tiers) || 4);
    for (const west of [true, false]) for (let t = 0; t < endN; t++) {
      const c = west ? P.END - 1 - t : P.COLS - P.END + t, z = [28, 38, 48, 58][t];
      for (const dx of [5, 11]) {
        const x = c * P.T + (west ? 16 - dx : dx);
        for (let y0 = (P.NS) * P.T; y0 < (P.NS + 3 + P.FH) * P.T; y0 += 64) {
          const row = { key: (west ? 'w' : 'e') + t + dx + y0, x, y: y0 + 32, z, fans: [], end: true };
          for (let y = y0 + 4; y < y0 + 64; y += 6.5 + (R() - .5) * 1.5) { const side = west ? (R() < .9 ? 0 : 1) : (R() < .9 ? 1 : 0); const f = make(x, y, z, side, west ? 1 : -1, row.key); if (f) row.fans.push(f); }
          this.rows.push(row);
        }
      }
    }
    // the front row of the north stand: real (classic) rigs that cheer, wave and boo
    if (size > 50) for (let i = 0; i < 18; i++) {
      const x = P.X0 + 20 + i * (P.L - 40) / 17 + (R() - .5) * 20, side = x < P.CX - 120 ? 0 : x > P.CX + 160 ? 1 : (R() < home ? 0 : 1), k = kit(side);
      const rig = new E.Humanoid({ style: 'classic', size: .9, weapon: null, colors: { cloth: R() < .5 ? k.shirt : k.color2 || k.shirt, pants: '#2a2a34', skin: skins[Math.floor(R() * 6)], hair: hairs[Math.floor(R() * 6)] } });
      this.rigs.push({ rig, x, y: (P.NS - 1) * P.T + 13, z: tierH[0], side, ph: R() * 9 });
    }
    // the rec: a few parents on a bench
    if (size <= 50) for (let i = 0; i < 6; i++) { const rig = new E.Humanoid({ style: 'classic', size: .95, weapon: null, colors: { cloth: ['#5a6a8a', '#8a5a4a', '#4a7a5a'][i % 3], pants: '#3a3a44', skin: skins[i % 6], hair: hairs[i % 6] } }); this.rigs.push({ rig, x: P.CX - 80 + i * 26, y: P.Y0 - 30, z: 0, side: 0, ph: i }); }
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
  }
  dispose() { if (this.unsub) this.unsub(); }
  set(s, st, t) { this.state[s] = st; this.stateT[s] = t || 2.5; }
  on(ev) {
    const m = this.m;
    switch (ev.type) {
      case 'goal': case 'ownGoal': this.set(ev.side, 'jump', 4); this.set(1 - ev.side, 'despair', 3); this.mood[ev.side] = 1; break;
      case 'nearMiss': case 'woodwork': { const a = m.lastKick ? m.lastKick.side : 0; this.set(a, 'despair', 1.6); this.set(1 - a, 'jump', 1); break; }
      case 'save': this.set(ev.who.side, 'jump', 1.5); break;
      case 'diveBooked': this.set(1 - ev.who.side, 'boo', 2.5); this.set(ev.who.side, 'despair', 2); break;
      case 'card': this.set(ev.who.side, 'boo', 2.4); this.set(1 - ev.who.side, 'jump', 1); break;
      case 'foul': this.set(ev.victim.side, 'boo', 1.5); break;
      case 'europhoria': this.set(ev.side, 'europhoria', EF.T.europhoriaTime); break;
      case 'europhoriaEnd': if (this.state[ev.side] === 'europhoria') this.set(ev.side, 'idle', .1); break;
      case 'superStrike': this.set(0, 'tense', 1.5); this.set(1, 'tense', 1.5); break;
      case 'shot': if (ev.who) this.set(ev.who.side, 'tense', .7); break;
    }
  }
  update(dt) {
    const m = this.m;
    for (const s of [0, 1]) {
      this.stateT[s] -= dt;
      if (this.stateT[s] <= 0 && this.state[s] !== 'idle' && this.state[s] !== 'scarf' && this.state[s] !== 'wave') this.state[s] = 'idle';
      const danger = m.ball ? clamp(m.u(s, m.ball.x) * 1.4 - .5, 0, 1) : 0;
      this.mood[s] = approach(this.mood[s], .25 + danger * .5 + m.euphoria[s] / 300, dt * .3);
      const eu = m.euphoria[s], lead = m.score[s] - m.score[1 - s];
      if (this.stateT[s] <= 0) this.state[s] = eu >= 67 && lead >= 2 ? 'wave' : eu >= 67 ? 'scarf' : 'idle';
      this.tifo[s] = approach(this.tifo[s], this.state[s] === 'europhoria' ? 1 : 0, dt * (this.state[s] === 'europhoria' ? 1 : .7));
    }
    this.waveT += dt;
    for (const R2 of this.rigs) {
      const st = this.state[R2.side], t = m.t + R2.ph, ex = st === 'jump' || st === 'europhoria';
      R2.rig.update(dt, { x: R2.x, y: R2.y, z: R2.z + (ex ? Math.abs(Math.sin(t * 8)) * 3 : 0), vx: 0, vy: 0, facing: Math.PI / 2, pose: ex || st === 'scarf' ? 'cheer' : st === 'wave' && Math.sin(this.waveT * 2 - R2.x / 90) > .6 ? 'cheer' : st === 'boo' ? 'guard' : st === 'despair' ? 'kneel' : null, expr: ex ? 'shout' : st === 'boo' ? 'angry' : st === 'despair' ? 'wince' : 'smile' });
    }
  }
  /** a fan's look this frame: rise (jump), arms (0 down .. 2 up), lean */
  fanPose(f, t) {
    const st = this.state[f.side], ph = f.ph;
    if (st === 'jump' || st === 'europhoria') return { up: Math.abs(Math.sin(t * 7 + ph)) * 2.5, arms: 2 };
    if (st === 'despair') return { up: 0, arms: 3 };
    if (st === 'boo') return { up: 0, arms: Math.sin(t * 9 + ph) > 0 ? 1 : 0, boo: true };
    if (st === 'scarf') return { up: 0, arms: 2, sway: Math.sin(t * 2.6 + f.x * .02) * 1.2, scarf: true };
    if (st === 'wave') { const w = Math.sin(t * 2 - (f.x + f.y) / 90); return w > .7 ? { up: 2, arms: 2 } : { up: 0, arms: 0 }; }
    if (st === 'tense') return { up: 0, arms: 1 };
    return { up: Math.max(0, Math.sin(t * 2.2 + ph)) * .4 * this.mood[f.side], arms: f.kind === 'flag' ? 2 : f.kind === 'drum' ? 1 : 0 };
  }
  draw(r, src) {
    const m = this.m, t = m.t, zoom = (r.view.zoom || 1), s = Math.max(1, Math.round(zoom * .9)), flareOn = [this.state[0] === 'europhoria', this.state[1] === 'europhoria'];
    for (const row of this.rows) {
      if (!row.fans.length) continue;
      const ax = row.end ? row.x : P.COLS * P.T / 2;
      if (!r.visible(ax, row.y, row.z, row.end ? 40 : 2000, 40, 40)) continue;
      r.queue(ax, row.y, row.z, g => {
        for (const f of row.fans) {
          const p = r.w(f.x, f.y, f.z), X = Math.round(p[0]), Y = Math.round(p[1]);
          if (X < -8 || X > r.W + 8 || Y < -12 || Y > r.H + 12) continue;
          const q = this.fanPose(f, t), up = Math.round(q.up * s), sw = Math.round((q.sway || 0) * s);
          const by = Y - 3 * s - up, hy = by - 2 * s;
          px.rect(g, X - s - s + sw, by, 3 * s + s, 3 * s, f.shirt);                    // body
          px.rect(g, X - s + sw, hy, 2 * s, 2 * s, f.skin);                              // head
          px.rect(g, X - s + sw, hy, 2 * s, s, f.hat || f.hair);
          const ac = f.shirt;
          if (q.arms === 2) { px.rect(g, X - 3 * s + sw, hy - s, s, 3 * s, ac); px.rect(g, X + 2 * s + sw, hy - s, s, 3 * s, ac); if (q.scarf || f.kind === 'scarf') px.rect(g, X - 3 * s + sw, hy - 2 * s, 6 * s, s, f.scarf); }
          else if (q.arms === 3) { px.rect(g, X - 2 * s + sw, hy - s, s, 2 * s, ac); px.rect(g, X + s + sw, hy - s, s, 2 * s, ac); }
          else if (q.arms === 1) { px.rect(g, X - 3 * s + sw, by, s, 2 * s, ac); px.rect(g, X + 2 * s + sw, by, s, 2 * s, ac); }
          if (f.kind === 'flag' && (q.arms === 2 || this.mood[f.side] > .5)) { const fx2 = X + 2 * s + sw, fy = hy - 5 * s, wv = Math.sin(t * 6 + f.ph) > 0 ? 1 : 0; px.rect(g, fx2, fy, s, 6 * s, '#d8d0c0'); px.rect(g, fx2 + s, fy + wv * s, 4 * s, 3 * s, f.scarf); px.rect(g, fx2 + s, fy + wv * s, 4 * s, s, f.shirt); }
          if (f.kind === 'drum') { px.rect(g, X - s, by + s, 3 * s, 2 * s, '#e8e0d0'); if (Math.sin(t * 8 + f.ph) > .5) px.rect(g, X - 2 * s, by - s, s, s, '#ffffff'); }
          if (q.boo) px.rect(g, X - s + sw, hy + s, s, s, '#1a1010');
        }
      }, { bias: .5 });
    }
    for (const R2 of this.rigs) if (r.visible(R2.x, R2.y, R2.z)) r.actor(R2.x, R2.y, R2.z, (g, ox, oy) => R2.rig.draw(g, ox, oy, r.view), { every: 3, key: R2.rig, outline: false });
    // flares in the front rows of a side in Europhoria: fire, smoke and red light
    for (const s2 of [0, 1]) if (flareOn[s2] && EF.fxRng() < .5) {
      const x = s2 === 0 ? EF.fx(P.X0 - 40, P.CX - 140) : EF.fx(P.CX + 140, P.X1 + 40), y = (P.NS - 1) * P.T + 12, z = 34;
      game.particles.fire(x, y, z + 2, 1, { size: .7 }); if (EF.fxRng() < .3) game.particles.smoke(x, y, z + 8, 1, { size: 1, color: '#c84a4a' });
      game.lights.add(x, y, z, 70, .5, { color: '#ff4a2a' });
    }
    // the tifo: unrolled over the side's part of the north stand
    for (const s2 of [0, 1]) if (this.tifo[s2] > .02) this.drawTifo(r, s2, this.tifo[s2]);
  }
  drawTifo(r, s, k) {
    const m = this.m, team = m.teams[s], x0 = s === 0 ? P.X0 - 80 : P.CX + 120, x1 = s === 0 ? P.CX - 120 : P.X1 + 80, y = 4, top = ((m.stadium.stands.north.heights || [])[Math.min(4, (m.stadium.stands.north.tiers || 5) - 1)] || 70) + 26;
    r.queue((x0 + x1) / 2, (P.NS - 1) * P.T + 14, top, g => {
      const a = r.w(x0, (P.NS - 1) * P.T + 14, 30), b = r.w(x1, y, top), X0 = Math.round(a[0]), X1 = Math.round(lerp(a[0], b[0], k)), Y0 = Math.round(b[1]), Y1 = Math.round(a[1]);
      if (X1 - X0 < 4) return;
      const k1 = team.kits.home, t1 = E.tones(k1.shirt), t2 = E.tones(k1.color2 || '#ffffff');
      px.rect(g, X0, Y0, X1 - X0, Y1 - Y0, t1.base);
      for (let i = 0; i < 6; i++) px.rect(g, X0, Y0 + Math.round((Y1 - Y0) * i / 6), X1 - X0, Math.max(1, Math.round((Y1 - Y0) / 14)), t1.lt);
      const cs = Math.min(Y1 - Y0 - 8, 48); if (k > .55 && cs > 12) EF.drawCrest(g, team, Math.round(lerp(X0, X1, .25)), Math.round((Y0 + Y1) / 2), cs);
      if (k > .7) E.font.text(g, team.tifo || team.short, Math.round(lerp(X0, X1, .62)), Math.round((Y0 + Y1) / 2) - 7, t2.hi, { align: 'center', scale: 2, outline: t1.deep });
      px.rect(g, X1 - 2, Y0, 3, Y1 - Y0, t2.base);
    }, { bias: 2 });
  }
}
EF.CrowdView = CrowdView;
