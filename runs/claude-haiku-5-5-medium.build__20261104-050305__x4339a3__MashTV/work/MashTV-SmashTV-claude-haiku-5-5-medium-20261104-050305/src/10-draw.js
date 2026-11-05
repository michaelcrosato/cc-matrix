/* MASH TV — 10-draw: the room as the screen shows it: floor, walls and doors, the hazards and decals, the props, the pickups,
 * the rigs and the custom painters of the disco ball, the dolly tank, the cable snake and the bosses, and the shots. */

// the custom painters: each takes (r, e) and draws in the enemy's ground position
MT.paint = {
  disco(r, e) {   // a faceted ball: rotating glints, a light flare when it fires
    r.actor(e.x, e.y, 10 + (e.r > 9 ? 4 : 0), (g, ox, oy) => {
      const R = (e.r > 9 ? 9 : 6), a = e.spin || 0, hot = e.fire !== undefined;
      px.disc(g, ox, oy, R + 1, '#101018'); px.disc(g, ox, oy, R, hot ? '#ffffff' : '#c8c8e0');
      for (let i = 0; i < 6; i++) { const t = a + i * 1.05; px.dot(g, ox + Math.cos(t) * R * .6, oy + Math.sin(t) * R * .45, i % 2 ? '#ff3ab8' : '#3ad8ff'); }
      px.disc(g, ox - R * .35, oy - R * .35, R * .25, '#ffffff');
    }, { outline: true });
  },
  tank(r, e) {   // a camera dolly: box chassis, a lens turret, scrolling treads
    r.actor(e.x, e.y, 0, (g, ox, oy) => {
      const c = Math.cos(e.face), s = Math.sin(e.face);
      const pts = [[-14, -10], [14, -10], [14, 10], [-14, 10]].map(([u, v]) => [ox + c * u - s * v, oy + s * u + c * v + 0]);
      px.poly(g, pts, '#2c3440'); px.poly(g, pts.map(([x, y]) => [x, y - 6]), '#4a5566');
      const tr = (e.tread || 0) % 4;
      for (let i = 0; i < 4; i++) px.line(g, ox - 14 + ((i * 4 + tr) % 14), oy + 9, ox - 14 + ((i * 4 + tr) % 14), oy + 11, '#111', 1);
      const tx = ox + Math.cos(e.turret) * 4, ty = oy - 6 + Math.sin(e.turret) * 2;
      px.disc(g, tx, ty - 4, 6, '#1a1f28'); px.disc(g, tx + Math.cos(e.turret) * 5, ty - 4 + Math.sin(e.turret) * 3, 3, e.flashT > 0 ? '#ffffff' : '#ff3344');
    }, { outline: true });
  },
  snake(r, e) {   // a head plug and cable segments (striped discs), drawn with its segments
    r.actor(e.x, e.y, 2, (g, ox, oy) => { px.disc(g, ox, oy, 5, '#1a1a22'); px.disc(g, ox, oy, 3.4, e.lunge ? '#ff3344' : '#44d0a0'); px.dot(g, ox + 1, oy - 1, '#ffffff'); }, { outline: true });
  },
  snakeSeg(r, e) {
    r.queue(e.x, e.y, 2, g => { const [ox, oy] = r.w(e.x, e.y, 2); px.disc(g, ox, oy, 3.2, e.seg % 2 ? '#2a2a38' : '#44d0a0'); px.disc(g, ox, oy, 1.4, '#ffe040'); });
  },
  lock(r, e) { r.queue(e.x, e.y, 6, g => { const [ox, oy] = r.w(e.x, e.y, 6); px.disc(g, ox, oy, 6, '#8a94a8'); px.disc(g, ox, oy, 3, '#2a2a33'); }); },
  crate(r, e) { r.queue(e.x, e.y, 0, g => { r.box(g, e.x - 7, e.y - 7, 0, e.x + 7, e.y + 7, 12, '#c08a50', '#8a5a32'); }); }
};

Object.assign(World.prototype, {
  draw(r, ctx) {
    const G = MT.G;
    this.map.drawFloor(r);
    this.drawOutside(r);
    this.drawSetLights(r);
    this.drawDecals(r);
    this.drawHazards(r);
    this.map.queueWalls(r);
    for (const d of ['N', 'S', 'E', 'W']) MT.paintDoor(r, d, this);
    this.drawProps(r);
    for (const p of this.pickups) this.drawPickup(r, p);
    for (const e of this.enemies) this.drawEnemy(r, e);
    if (this.boss && this.boss.alive || this.boss && this.boss.dying > 0) this.drawBoss(r);
    for (const c of this.players) this.drawContestant(r, c, ctx);
    for (const s of this.pShots) this.drawShot(r, s, true);
    for (const s of this.fShots) this.drawShot(r, s, false);
    for (const k of this.rockets) this.drawRocket(r, k);
    for (const l of this.lobs) this.drawLob(r, l);
    for (const c of this.players) if (c.laser) this.drawLaser(r, c);
    this.drawBeams(r);
    this.drawSpots(r);
    for (const b of (this.bursts || [])) this.drawBurst(r, b);
    for (const rg of (this.rings || [])) this.drawRing(r, rg);
    if (this.flashT > 0) r.overlay(g => { g.fillStyle = 'rgba(255,255,255,' + (this.flashT / .12 * .5) + ')'; g.fillRect(0, 0, r.bw, r.bh); });
    for (const p of this.pops) r.text(p.text, ...r.w(p.x, p.y, 14), p.color, { align: 'center' });
  },
  // the outside dressing (§9.2): bleachers with audience on the east and west, the jumbotron above the north wall, camera cranes
  // and the front-row audience to the south; it shows when a wide screen reveals the studio around the arena
  drawOutside(r) {
    const tint = this.set === 'rooftop' ? [70, 80, 120] : this.set === 'warehouse' ? [120, 110, 100] : [90, 70, 130];
    const col = (a, k) => '#' + tint.map(v => Math.min(255, Math.round(v * (k || 1) * (1 + a * .15))).toString(16).padStart(2, '0')).join('');
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -130 : 378, x1 = side < 0 ? -10 : 498;
      for (let k = 0; k < 4; k++) {
        const y0 = 30 + k * 14, y1 = 240 - k * 14, z1 = 8 + k * 9;
        r.queue(side < 0 ? x1 : x0, (y0 + y1) / 2, 0, g => r.box(g, x0 + k * 4, y0, 0, x1 - k * 4, y1, z1, col(k, 1.2), col(k, .7)));
        for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
          const hx = x0 + 8 + i * 14, hy = y0 + 10 + j * 22; const cls = (i + j + k) % 4;
          r.queue(hx, hy, z1 + 2, g => { const [ox, oy] = r.w(hx, hy, z1 + 2); px.disc(g, ox, oy, 2.5, ['#ffcc33', '#2ee6ff', '#ff2e88', '#f4f4ff'][cls]); px.disc(g, ox, oy + 3, 2, '#2a1446'); });
        }
      }
    }
    // the jumbotron: a frame, a live face (it cycles the logo, the ratings, a sponsor), with scanlines
    const jt = Math.floor(this.time * .5) % 3;
    r.queue(184, -36, 40, g => r.box(g, 124, -68, 40, 244, -4, 86, '#2a2a40', '#15152a'));
    r.queue(184, -36, 88, g => { const [ox, oy] = r.w(184, -36, 88); px.rect(g, ox - 52, oy - 2, 104, 20, '#0a0a18'); E.font.title(g, jt === 0 ? 'MASH TV' : jt === 1 ? 'RATINGS' : 'KRUNCH-O', ox, oy, { scale: 1, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); });
    // camera cranes at the south corners, and the front row
    for (const cx of [54, 314]) r.queue(cx, 272, 0, g => r.box(g, cx - 3, 268, 0, cx + 3, 276, 60, '#3a3a4a', '#222230'));
    for (let i = 0; i < 18; i++) { const hx = 40 + i * 16, hy = 262; r.queue(hx, hy, 4, g => { const [ox, oy] = r.w(hx, hy, 4); px.disc(g, ox, oy, 2.4, ['#ffcc33', '#2ee6ff', '#ff2e88'][i % 3]); }); }
  },
  drawSetLights(r) {
    const S = MT.SETS[this.set]; if (!S || !MT.G || !MT.G.lights) return;
    S.light.forEach((col, i) => { const a = this.time * .4 + i * 1.7; MT.G.lights.add(184 + Math.cos(a) * 120, 120 + Math.sin(a * .7) * 70, 30, 80, S.spot ? .55 : .35, { color: col }); });
  },
  drawDecals(r) {
    for (const s of this.splats) r.decal(() => r.groundDisc(s.x, s.y, s.r, '#c02020', .45));
    for (const d of this.decals) {
      if (d.kind === 'ring') r.decal(() => r.groundRing(d.x, d.y, 12, '#ff3344', .7));
      else if (d.kind === 'shadow') r.decal(() => r.groundDisc(d.x, d.y, d.r, '#000000', .45));
    }
    for (const s of (this.dropShadows || [])) r.decal(() => r.groundDisc(s.x, s.y, 10, '#000', .5));
    for (const v of (this.vents || [])) {
      if (v.state === 'telegraph') r.decal(() => r.groundDisc(v.x, v.y, 10, '#ffb020', .35 + .3 * Math.sin(this.time * 20)));
      if (v.state === 'flame') { r.decal(() => r.groundDisc(v.x, v.y, 12, '#ff6a20', .6)); r.queue(v.x, v.y, 4, g => { const [ox, oy] = r.w(v.x, v.y, 4); px.disc(g, ox, oy - 8, 7 + Math.sin(this.time * 30) * 2, '#ffd060'); px.disc(g, ox, oy - 4, 5, '#ff6a20'); }, { emissive: true }); }
    }
    for (const b of (this.beamsGround || [])) r.decal(() => r.groundDisc(b.x, b.y, 4, '#ff3344', .5));
  },
  drawHazards(r) {
    for (const cv of this.conveyors) {
      const d = cv.dir;
      r.decal(() => { for (let x = 24; x < 344; x += 12) r.groundDisc(x, (cv.y0 + cv.y1) / 2, 2.6, d > 0 ? '#ffcc33' : '#2ee6ff', .6); });
    }
  },
  drawProps(r) {
    if (this.set === 'greenroom') {
      for (const sx of [70, 300]) r.queue(sx, 60, 0, g => r.box(g, sx - 22, 52, 0, sx + 22, 70, 9, '#7a2a3a', '#4a1a26'));
      r.queue(184, 200, 0, g => r.box(g, 168, 194, 0, 200, 206, 12, '#e8e0d0', '#9a8a70'));
      r.queue(184, 200, 13, g => { const [ox, oy] = r.w(184, 200, 13); px.disc(g, ox, oy, 6, '#ff8ad8'); px.disc(g, ox, oy - 2, 3, '#fff7e8'); }, { emissive: false });
      for (const tx of [120, 248]) r.queue(tx, 16, 14, g => { const [ox, oy] = r.w(tx, 16, 14); px.rect(g, ox - 10, oy - 7, 20, 14, '#15151c'); px.rect(g, ox - 8, oy - 5, 16, 10, '#2ee6ff'); });
    }
    for (const e of this.enemies) if (e.kind === 'crate' || e.kind === 'lock') MT.paint[e.kind](r, e);
    if (this.cage) r.queue(this.cage.x, this.cage.y, 0, g => { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, [ox, oy] = r.w(this.cage.x + Math.cos(a) * 14 * (1 - this.cage.up), this.cage.y + Math.sin(a) * 14 * (1 - this.cage.up), 0); px.disc(g, ox, oy, 1.5, '#ffcc33'); } });
    for (const [cx, cy] of (this.R.locks || []) ) { const [x, y] = [24 + cx * 16, 14]; r.queue(x, y, 0, () => {}); }
  },
  drawPickup(r, p) {
    const S = MT.SPR; const bob = Math.sin((p.age || 0) * 4) * 1.5;
    const blink = !p.persist && p.life < 2.5 && Math.floor(p.life * 10) % 2;
    if (blink) return;
    const z = 4 + bob;
    if (p.kind === 'bill') r.sprite(p.x, p.y, z, S.bill, { glow: .4 });
    else if (p.kind === 'stack') r.sprite(p.x, p.y, z, S.stack, { glow: .5 });
    else if (p.kind === 'gold') r.sprite(p.x, p.y, z, S.gold, { glow: .7 });
    else if (p.kind === 'case') r.sprite(p.x, p.y, z, S.case, { glow: .7 });
    else if (p.kind === 'prize') r.sprite(p.x, p.y, z, S.prize, { glow: .8 });
    else if (p.kind === 'key') r.sprite(p.x, p.y, z + 4, S.key, { glow: 1 });
    else if (p.kind === 'capsule') { r.sprite(p.x, p.y, z + 4, S.capsule, { glow: .6 }); r.queue(p.x, p.y, z + 12, g => { const [ox, oy] = r.w(p.x, p.y, z + 12); E.font.text(g, (MT.WEAPONS[p.cap] || {}).name ? (p.cap || '?')[0].toUpperCase() : '?', ox - 3, oy - 3, '#2ee6ff', { scale: 1 }); }); }
    else if (p.kind === 'bomb') r.sprite(p.x, p.y, z + 4, S.flash, { glow: 1 });
    else if (p.kind === 'life') r.sprite(p.x, p.y, z + 4, S.star, { glow: 1 });
    else if (p.kind === 'statuette') r.sprite(p.x, p.y, z + 4, S.statuette, { glow: 1 });
    if (p.kind === 'statuette') { r.decal(() => r.groundDisc(p.x, p.y, 34, '#ffffcc', .18)); r.decal(() => r.groundRing(p.x, p.y, 22, '#ffcc33', .5)); }
    if (p.kind === 'prize' || p.kind === 'key') r.decal(() => r.groundDisc(p.x, p.y, 6, p.kind === 'key' ? '#ffcc33' : '#ff8ad8', .25));
  },
  drawEnemy(r, e) {
    if (!e.alive) return;
    if (e.kind === 'snakeSeg') { MT.paint.snakeSeg(r, e); return; }
    if (e.kind === 'crate' || e.kind === 'lock') return;
    if (e.kind === 'disco' || e.kind === 'discoBig' || e.kind === 'discoSmall') { MT.paint.disco(r, e); return; }
    if (e.kind === 'tank') { MT.paint.tank(r, e); return; }
    if (e.kind === 'snake') { MT.paint.snake(r, e); return; }
    if (!e.rig) return;
    const alpha = e.alpha || 1;
    // the mime's 'trapped in a box': a glass box it presses against, shaking as the telegraph builds
    let dx = (e.kind === 'brute' && e.stun > 0) ? Math.sin(this.time * 14) * 2.5 : 0;   // the brute's stunned wobble
    if (e.kind === 'mime') {
      dx = e.blast !== undefined ? Math.sin(this.time * 60) * 2.2 : 0;
      const B = 13, H = 26, cx = e.x, cy = e.y;
      r.queue(cx, cy, 0, g => {
        const c = [[-B, -B, 0], [B, -B, 0], [B, B, 0], [-B, B, 0]].map(([u, v]) => r.w(cx + u, cy + v, 0));
        const t = [[-B, -B, H], [B, -B, H], [B, B, H], [-B, B, H]].map(([u, v]) => r.w(cx + u, cy + v, H));
        const col = e.blast !== undefined ? '#ff3344' : '#9fe6ff';
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; px.line(g, c[i][0], c[i][1], c[j][0], c[j][1], col, 1); px.line(g, t[i][0], t[i][1], t[j][0], t[j][1], col, 1); px.line(g, c[i][0], c[i][1], t[i][0], t[i][1], col, 1); }
      }, { emissive: true });
    }
    r.shadow(e.x, e.y, e.r + 1, .35, undefined, 0);
    r.actor(e.x + dx, e.y, e.z || 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : undefined, alpha, outline: true });
    // the brute stunned: stars orbiting its head
    if (e.kind === 'brute' && e.stun > 0) {
      for (let k = 0; k < 3; k++) { const a = this.time * 5 + k * 2.1; const sx = e.x + Math.cos(a) * 10, sy = e.y + Math.sin(a) * 4; r.queue(sx, sy, 48, g => { const [ox, oy] = r.w(sx, sy, 48); px.disc(g, ox, oy, 2, '#ffe040'); px.line(g, ox - 3, oy, ox + 3, oy, '#fff7c0', 1); px.line(g, ox, oy - 3, ox, oy + 3, '#fff7c0', 1); }, { emissive: true }); }
    }
    if (e.kind === 'mime' && e.blast !== undefined) r.queue(e.x, e.y, 30, g => { const [ox, oy] = r.w(e.x, e.y, 30); px.disc(g, ox, oy, 4 + Math.sin(this.time * 40) * 2, '#ff3344'); });
    if (e.wind > 0) r.queue(e.x, e.y, 30, g => { const [ox, oy] = r.w(e.x, e.y, 30); px.disc(g, ox, oy, 3, '#ffcc33'); });
  },
  drawContestant(r, c, ctx) {
    if (!c.rig) return;
    if (c.state === 'out') { /* a down body */ }
    const blinkOff = c.invulnT > 0 && Math.floor(this.time * 12) % 2 === 0 && c.state === 'play';
    if (blinkOff && c.state !== 'dead') return;
    r.shadow(c.x, c.y, 6, .35, undefined, 0);
    r.actor(c.x, c.y, c.dropZ || 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { flash: c.hurtT > 0 ? '#ff3344' : undefined, outline: true });
    if (c.shielded) r.queue(c.x, c.y, 12, g => { const [ox, oy] = r.w(c.x, c.y, 12); px.disc(g, ox, oy, 15, 'rgba(255,46,136,0.18)'); px.disc(g, ox, oy, 15, 'rgba(255,46,136,0.12)'); });
    for (const o of (c.records || [])) r.queue(o.x, o.y, 6, g => { const [ox, oy] = r.w(o.x, o.y, 6); px.disc(g, ox, oy, 3.2, '#ffcc33'); px.disc(g, ox, oy, 1, '#fff7c0'); }, { emissive: true });
  },
  drawShot(r, s, mine) {
    const col = mine ? '#fff7c0' : ({ butter: '#ffe070', gravy: '#b06a20', coin: '#ffd040', card: '#f4f4ff', static: '#c0ffff', shard: '#ffb050', beam: '#ff9a3c', shell: '#ffb020', orb: '#ff9a3c', tot: '#e0c060' })[s.kind] || '#ff9a3c';
    r.queue(s.x, s.y, s.z || 4, g => {
      const [ox, oy] = r.w(s.x, s.y, s.z || 4);
      if (mine) { px.disc(g, ox, oy, 2.6, '#ffcc33'); px.disc(g, ox, oy, 1.2, '#ffffff'); }
      else { px.disc(g, ox, oy, s.kind === 'shell' ? 4 : 2.6, '#14060a'); px.disc(g, ox, oy, s.kind === 'shell' ? 3 : 1.8, col); px.disc(g, ox - .5, oy - .5, .8, '#ffffe0'); }
    }, { emissive: !mine });
  },
  drawRocket(r, k) {
    r.queue(k.x, k.y, 5, g => { const [ox, oy] = r.w(k.x, k.y, 5); for (const [tx, ty] of k.trail) { const [a, b] = r.w(tx, ty, 5); px.dot(g, a, b, '#ffb060'); } px.disc(g, ox, oy, 3, '#e8443a'); px.disc(g, ox - 1, oy - 1, 1.2, '#fff0c0'); }, { emissive: true });
  },
  drawLob(r, l) {
    const col = l.kind === 'tomato' ? '#ff3a2a' : l.kind === 'tot' ? '#e0c060' : '#fff7c0';
    r.queue(l.x, l.y, l.z || 6, g => { const [ox, oy] = r.w(l.x, l.y, l.z || 6); px.disc(g, ox, oy, 3.6, col); px.disc(g, ox - 1, oy - 1, 1, '#ffffff'); }, { emissive: true });
  },
  drawLaser(r, c) {
    const L = c.laser;
    r.queue(c.x, c.y, 6, g => { const [a, b] = r.w(L.x0, L.y0, 6), [x2, y2] = r.w(L.x1, L.y1, 6); px.line(g, a, b, x2, y2, '#ff3ab8', 3); px.line(g, a, b, x2, y2, '#ffffff', 1); }, { emissive: true });
  },
  drawBeams(r) {
    for (const b of (this.beams || [])) {
      if (b.vertical) { if (b.tele > 0) r.decal(() => r.groundDisc(b.x, 120, 4, '#ff3344', .4)); else r.queue(b.x, 120, 40, g => { const [a, c] = r.w(b.x, 0, 40), [d, e] = r.w(b.x, 240, 40); px.line(g, a, c, d, e, '#ff3344', 6); }, { emissive: true }); continue; }
      const x2 = b.x0 + Math.cos(b.a) * 300, y2 = b.y0 + Math.sin(b.a) * 300;
      if (b.active) r.queue(b.x0, b.y0, 12, g => { const [a, c] = r.w(b.x0, b.y0, 12), [d, e] = r.w(x2, y2, 12); px.line(g, a, c, d, e, '#ff3344', 3); px.line(g, a, c, d, e, '#ffd0d0', 1); }, { emissive: true });
      else r.decal(() => { for (let k = 0; k <= 12; k++) r.groundDisc(b.x0 + Math.cos(b.a) * k * 25, b.y0 + Math.sin(b.a) * k * 25, 1.5, '#ff3344', .5); });
    }
  },
  drawSpots(r) {
    for (const s of (this.spots || [])) r.decal(() => r.groundArc(s.x, s.y, 4, 170, s.a - .4, s.a + .4, '#ffffe0', .25));
  },
  drawBurst(r, b) {
    const k = b.big ? 1.6 : 1, n = (MT.G && MT.G.settings.confetti === 'tasteful') ? (b.big ? 7 : 3) : (b.big ? 14 : 6);
    r.queue(b.x, b.y, 4, g => { const [ox, oy] = r.w(b.x, b.y, 4); const cols = ['#ffcc33', '#ff2e88', '#2ee6ff', '#ffffff']; for (let i = 0; i < n; i++) { const a = i * 2.4 + b.t * 9, d = (1 - b.t * 2) * 16 * k; px.dot(g, ox + Math.cos(a) * d, oy + Math.sin(a) * d * .6 - (1 - b.t * 2) * 6, cols[i % 4]); } }, { emissive: true });
  },
  drawRing(r, rg) {
    r.decal(() => r.groundRing(rg.x, rg.y, rg.r * (1 - rg.t * 1.5 > 0 ? 1 : 1), '#ffb020', Math.max(0, rg.t * 2)));
  },
  drawBoss(r) {
    const b = this.boss; if (!b) return;
    if (b.kind === 'mashy') return this.drawMashy(r, b);
    if (b.kind === 'wheel') return this.drawWheel(r, b);
    if (b.kind === 'lance') return this.drawLance(r, b);
  },
  drawMashy(r, b) {
    r.shadow(b.x, b.y, 30, .4, undefined, 0);
    r.actor(b.x, b.y, 20, (g, ox, oy) => {
      px.disc(g, ox, oy, 26, '#d8c08a'); px.disc(g, ox, oy, 23, '#eed8a0'); px.disc(g, ox - 8, oy - 8, 4, '#ffffff');
      px.disc(g, ox - 8, oy - 6, 4, '#ffffff'); px.disc(g, ox + 8, oy - 6, 4, '#ffffff'); px.disc(g, ox - 8, oy - 6, 1.6, '#222'); px.disc(g, ox + 8, oy - 6, 1.6, '#222');
      px.line(g, ox - 10, oy + 6, ox + 10, oy + 6, '#7a4a20', 2);
      if (b.hatch.open) px.disc(g, ox, oy + 14, 9, '#5a1a1a');
      for (const a of b.arms) if (a.alive) { px.disc(g, ox + (a.ox || 0), oy + 6, 10, '#7a5a30'); px.disc(g, ox + (a.ox || 0), oy + 6, 7, '#9a7a40'); }
      px.poly(g, [[ox - 10, oy + 26], [ox + 10, oy + 26], [ox + 4, oy + 34], [ox - 4, oy + 34]], '#15121c');   // the bow tie and tread
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
  },
  drawWheel(r, b) {
    r.actor(b.x, b.y, 40, (g, ox, oy) => {
      px.disc(g, ox, oy, 44, '#2a1640'); px.disc(g, ox, oy, 41, '#ffcc33');
      for (let i = 0; i < 8; i++) { const a0 = b.angle + i * Math.PI / 4, a1 = a0 + Math.PI / 4; const c = b.clusters[i]; const col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#22c55e', '#ff6a6a', '#b08aff', '#5fe0a0', '#ff8ad8'][i]; px.poly(g, [[ox, oy], [ox + Math.cos(a0) * 38, oy + Math.sin(a0) * 38], [ox + Math.cos(a1) * 38, oy + Math.sin(a1) * 38]], i % 2 ? col : '#3a2a50'); if (c.alive) px.disc(g, ox + Math.cos(a0 + Math.PI / 8) * 34, oy + Math.sin(a0 + Math.PI / 8) * 34, 7, '#fff7c0'); }
      px.disc(g, ox, oy, 14, b.hub.hp > 0 ? '#c8d0e0' : '#444');
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
  },
  drawLance(r, b) {
    r.shadow(b.x, b.y, 22, .35, undefined, 0);
    if (b.phaseName === 'starmaker') r.actor(b.x, b.y, 10, (g, ox, oy) => {
      px.disc(g, ox, oy, 22, '#caa030'); px.disc(g, ox, oy, 18, '#ffd850'); px.disc(g, ox, oy - 4, 9, '#f5e6b0');
      for (const t of b.turrets) if (t.alive) px.disc(g, ox + t.ox, oy + t.oy, 8, '#fafafa');
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
    if (b.phaseName === 'starmaker') for (const jx of [-12, 12]) { r.queue(b.x + jx, b.y + 20, 2, g => { const [ox, oy] = r.w(b.x + jx, b.y + 20, 2); const f = 4 + Math.sin(this.time * 40 + jx) * 2; px.disc(g, ox, oy + 2, f, 'rgba(255,160,60,0.8)'); px.disc(g, ox, oy + 1, f * .5, '#ffe9a0'); }, { emissive: true }); }
    else if (b.phaseName === 'network') {
      for (const t of b.tvs) { if (!t.alive) continue; r.queue(b.x + t.ox, b.y + t.oy, 12, g => { const [ox, oy] = r.w(b.x + t.ox, b.y + t.oy, 12); px.rect(g, ox - 9, oy - 7, 18, 13, '#15151c'); px.rect(g, ox - 7, oy - 5, 14, 9, t.ch === 'static' ? '#ffffff' : t.ch === 'news' ? '#ff3344' : '#2ee6ff'); }, { emissive: true }); }
      r.queue(b.x + b.eye.ox, b.y + b.eye.oy, 20, g => { const [ox, oy] = r.w(b.x + b.eye.ox, b.y + b.eye.oy, 20); px.disc(g, ox, oy, 18, '#1a0a20'); px.disc(g, ox, oy, b.eye.open ? 12 : 9, b.eye.open ? '#ff3344' : '#5a2a6a'); px.disc(g, ox, oy, 4, '#ffffff'); }, { emissive: true });
    }
  }
});
MT.tickScripts = null;
