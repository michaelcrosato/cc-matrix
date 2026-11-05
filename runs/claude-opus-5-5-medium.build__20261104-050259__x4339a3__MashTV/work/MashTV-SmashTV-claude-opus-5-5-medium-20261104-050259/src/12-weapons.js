// ---------------------------------------------------------------- weapons, add-ons and the projectile pools
MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', letter: 'B', color: '#fff7a0', dur: 0, rate: () => MT.T.fireRate, desc: 'YOUR TRUSTY STARTER. NINE SHOTS A SECOND.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / this.rate(); W.fireBolt(c, c.aim, 1); W.event('shot', { w: 'blaster', slot: c.slot }, false); } },
  spread: { name: 'TRIPLE PLAY', letter: 'S', color: '#ff8ad8', dur: 14, desc: 'THREE BOLTS AT ONCE. CROWDS HATE IT.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 8; for (const d of [-.227, 0, .227]) W.fireBolt(c, c.aim + d, 1); W.event('shot', { w: 'spread', slot: c.slot }, false); } },
  rockets: { name: 'PRIME-TIME ROCKETS', letter: 'R', color: '#ff6a3a', dur: 12, desc: 'SLOW, LOUD AND SPLASHY. HITS EVERYTHING NEARBY.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 3.5; W.fireRocket(c); W.event('shot', { w: 'rockets', slot: c.slot }, false); } },
  popcorn: { name: 'POPCORN POPPER', letter: 'P', color: '#ffe060', dur: 12, desc: 'LOBS A BAG THAT BURSTS INTO HOT KERNELS.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 2.5; W.fireBag(c); W.event('shot', { w: 'popcorn', slot: c.slot }, false); } },
  laser: { name: 'LIMELIGHT LASER', letter: 'L', color: '#2ee6ff', dur: 10, desc: 'A BEAM THAT PIERCES EVERY FOE IN THE LINE.',
    fire(c, W, dt) { c.laserOn = true; c.laserAng = c.laserAng === undefined ? c.aim : MT.approachAng(c.laserAng, c.aim, 7 * dt); W.laser(c, dt); if (c.fireCd <= 0) { c.fireCd = .12; W.event('shot', { w: 'laser', slot: c.slot }, false); } } }
};
MT.ADDONS = {
  records: { name: 'GOLD RECORDS', letter: 'G', color: '#ffcc33', dur: 15, desc: 'TWO GOLD DISCS ORBIT YOU, BLOCKING SMALL SHOTS.' },
  shield: { name: 'SPONSOR SHIELD', letter: 'B', color: '#2ee6ff', dur: 8, desc: 'A BUBBLE NOTHING GETS THROUGH. BROUGHT TO YOU BY KRUNCH-O.' },
  speed: { name: 'SPEED SNEAKERS', letter: 'F', color: '#22c55e', dur: 10, desc: 'RUN FASTER AND SLIDE MORE OFTEN.' }
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.capLetter = { spread: 'S', rockets: 'R', popcorn: 'P', laser: 'L', records: 'G', shield: 'B', speed: 'F' };

// small bullets that the gold records and showstopper wipe out
MT.SMALL_FOE = { orb: 1, shard: 1, coin: 1, card: 1, static: 1, beam: 1, butter: 1, gravy: 1 };

MT.Shots = class Shots {
  constructor(team) { this.team = team; this.list = []; }
  fire(b) {
    const s = Object.assign({ id: MT.nid(), z: 10, vz: 0, r: 2.5, life: 1, dmg: 1, pierce: 0, grav: 0, kind: 'orb', t: 0 }, b);
    s.team = this.team; this.list.push(s); if (this.list.length > 700) this.list.shift(); return s;
  }
  clear() { this.list.length = 0; }
  update(dt, W) {
    for (const b of this.list) {
      if (b.dead) continue;
      b.t += dt; b.life -= dt;
      if (b.accel) { const sp = Math.hypot(b.vx, b.vy), ns = Math.min(b.accel[1], sp + b.accel[0] * dt), k = ns / Math.max(1, sp); b.vx *= k; b.vy *= k; }
      if (b.kind === 'card') { const a = Math.atan2(b.vy, b.vx) + Math.sin(b.t * 6) * dt * .6, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
      if (b.kind === 'static') { b.x += (MT.R('fx') - .5) * 1.4; b.y += (MT.R('fx') - .5) * 1.4; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.grav) { b.vz -= b.grav * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.dead = true; W.landLob(b); continue; } }
      if (!b.grav && (b.x < AR.x0 - 2 || b.x > AR.x1 + 2 || b.y < AR.y0 - 2 || b.y > AR.y1 + 2)) { b.dead = true; W.bulletWall(b); continue; }
      if (b.grav && (b.x < -40 || b.x > AR.W + 40 || b.y < -40 || b.y > AR.H + 40)) { b.dead = true; continue; }
      if (b.life <= 0) { b.dead = true; if (b.kind === 'rocket' || b.kind === 'shell') W.explode(b); }
    }
    E.prune(this.list, b => b.dead);
  }
  draw(r) {
    const tn = MT.game.time;
    for (const b of this.list) {
      if (b.dead) continue;
      if (b.grav) r.shadow(b.x, b.y, b.kind === 'bag' ? 4 : 3, .35);
      r.queue(b.x, b.y, b.z, g => MT.drawShot(g, r, b, tn), { emissive: true });
    }
  }
};
MT.drawShot = (g, r, b, tn) => {
  const p = r.w(b.x, b.y, b.z), k = MT.pk(r), a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a);
  switch (b.kind) {
    case 'bolt': { const col = b.owner !== undefined ? MT.COLORS.p[b.owner % 4] : '#fff7a0'; px.line(g, p[0] - c * 5 * k, p[1] - s * 3 * k, p[0] + c * 2 * k, p[1] + s * 1.2 * k, col, Math.max(2, 2.4 * k)); px.line(g, p[0] - c * 3 * k, p[1] - s * 2 * k, p[0] + c * 2 * k, p[1] + s * 1.2 * k, '#ffffff', Math.max(1, 1.2 * k)); break; }
    case 'kernel': px.disc(g, p[0], p[1], 1.8 * k, '#fff4c0'); px.dot(g, p[0], p[1], '#ffcc33'); break;
    case 'rocket': px.line(g, p[0] - c * 6 * k, p[1] - s * 4 * k, p[0] + c * 3 * k, p[1] + s * 2 * k, '#c8d0e0', Math.max(2, 3 * k)); px.disc(g, p[0] - c * 7 * k, p[1] - s * 4.5 * k, 2 * k, Math.floor(tn * 30) % 2 ? '#ffcc33' : '#ff6a20'); px.dot(g, p[0] + c * 3 * k, p[1] + s * 2 * k, '#ff3344'); break;
    case 'bag': px.rect(g, p[0] - 3 * k, p[1] - 4 * k, 6 * k, 7 * k, '#ffffff'); px.rect(g, p[0] - 3 * k, p[1] - 4 * k, 2 * k, 7 * k, '#ff3344'); px.rect(g, p[0] + 1 * k, p[1] - 4 * k, 2 * k, 7 * k, '#ff3344'); px.dot(g, p[0], p[1] - 5 * k, '#fff4c0'); break;
    case 'tomato': px.disc(g, p[0], p[1], 3.2 * k, '#4a0a0a'); px.disc(g, p[0], p[1], 2.6 * k, '#e82a2a'); px.dot(g, p[0] - k, p[1] - k, '#ffaaaa'); px.dot(g, p[0], p[1] - 3 * k, '#2a8a2a'); break;
    case 'tot': px.rect(g, p[0] - 3 * k, p[1] - 2 * k, 6 * k, 4 * k, '#4a2a0a'); px.rect(g, p[0] - 2.5 * k, p[1] - 1.5 * k, 5 * k, 3 * k, '#e8a840'); break;
    case 'shell': px.disc(g, p[0], p[1], 3.4 * k, '#1a1a1a'); px.disc(g, p[0], p[1], 2.4 * k, '#ff6a20'); px.dot(g, p[0], p[1], '#ffffff'); break;
    case 'coin': { const w = Math.abs(Math.cos(tn * 10 + b.id)) * 2.6 * k + .8; px.ell ? px.ell(g, p[0], p[1], w + .8, 3.4 * k, '#3a2a0a') : px.disc(g, p[0], p[1], 3.4 * k, '#3a2a0a'); px.ell ? px.ell(g, p[0], p[1], w, 2.6 * k, '#ffcc33') : px.disc(g, p[0], p[1], 2.6 * k, '#ffcc33'); break; }
    case 'card': { const sp = tn * 12 + b.id; const ca = Math.cos(sp), sa = Math.sin(sp); const P = (u, v) => [p[0] + (u * ca - v * sa) * k, p[1] + (u * sa + v * ca) * k]; px.poly(g, [P(-3, -2), P(3, -2), P(3, 2), P(-3, 2)], '#1a0a14'); px.poly(g, [P(-2.4, -1.4), P(2.4, -1.4), P(2.4, 1.4), P(-2.4, 1.4)], '#fff7e8'); px.dot(g, p[0], p[1], '#c8202a'); break; }
    case 'static': for (let i = 0; i < 4; i++) px.dot(g, p[0] + (MT.fxr() - .5) * 6 * k, p[1] + (MT.fxr() - .5) * 6 * k, i % 2 ? '#ffffff' : '#9a9aff'); px.disc(g, p[0], p[1], 1.5 * k, '#c8c8ff'); break;
    case 'beam': px.line(g, p[0] - c * 6 * k, p[1] - s * 4 * k, p[0] + c * 6 * k, p[1] + s * 4 * k, '#6a2a00', Math.max(2, 3 * k)); px.line(g, p[0] - c * 5 * k, p[1] - s * 3 * k, p[0] + c * 5 * k, p[1] + s * 3 * k, '#ffe060', Math.max(1, 1.5 * k)); break;
    case 'shard': { const col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#9aff6a'][b.id % 4]; px.disc(g, p[0], p[1], 2.4 * k, '#3a0a1a'); px.disc(g, p[0], p[1], 1.6 * k, col); break; }
    case 'butter': px.rect(g, p[0] - 3 * k, p[1] - 2 * k, 6 * k, 4 * k, '#5a4a0a'); px.rect(g, p[0] - 2.4 * k, p[1] - 1.4 * k, 4.8 * k, 2.8 * k, '#ffe680'); break;
    case 'gravy': px.disc(g, p[0], p[1], 3 * k, '#2a1406'); px.disc(g, p[0], p[1], 2.2 * k, '#a0602a'); px.dot(g, p[0] - k, p[1] - k, '#e0a060'); break;
    default: px.disc(g, p[0], p[1], 3.4 * k, '#3a1400'); px.disc(g, p[0], p[1], 2.6 * k, MT.COLORS.foe); px.disc(g, p[0], p[1], 1.3 * k, MT.COLORS.foeCore);
  }
};
