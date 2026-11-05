/* ---- CROWD and DRESS (section 8): fans in the stands (excitement, jumps, standing, flinches, a wave when quiet, signs),
 * glass pounders behind the nets, the near crowd's silhouettes along the bottom of the screen, the benches, the
 * organist; and each arena's props and lights ---- */
const Crowd = (() => {
  let fans = [], pounders = [], arenaId = null, ex = .3, quietT = 0, waveX = -1, jumpT = [0, 0], standT = 0, flinchX = -9999, flinchT = 0, poundT = {}, t = 0;
  const SKIN = ['#f0c8a0', '#e0b090', '#a87050', '#6a4028', '#f4d8b8', '#c89070'];
  function build(arena, home) {
    arenaId = arena; const A = ARENAS[arena], hc = TEAMS[home] || TEAMS.muskrats;
    fans = []; let k = 0;
    const seatList = Rink.seats(arena);
    for (const s of seatList) { const h = s.h, mix = A.fans.mix, col = h < .55 ? (h < .3 ? hc.dark : hc.trim) : mix[Math.floor(h * 97) % mix.length]; fans.push({ x: s.x, y: s.y, z: s.z, h, shirt: col, skin: SKIN[Math.floor(h * 53) % SKIN.length], hat: A.fans.toques && h * 7 % 1 < .5 ? ['#c83a2a', '#e8b43a', '#3a6aa8'][Math.floor(h * 31) % 3] : null, sign: h > .985 ? A.signs[k++ % A.signs.length] : null, side: s.side }); }
    if (A.snowbanks) {   // the pond: fans in parkas standing on the snow around the rink
      for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU, h = E.hash2(i, 77), rx = Rink.HL + 34 + h * 30, ry = Rink.HW + 30 + h * 22; const x = Rink.C.x + Math.cos(a) * rx, y = Rink.C.y + Math.sin(a) * ry; if (y > Rink.C.y + 80) continue; fans.push({ x, y, z: 0, h, shirt: A.fans.mix[i % A.fans.mix.length], skin: SKIN[i % SKIN.length], hat: ['#c83a2a', '#e8b43a', '#3a6aa8', '#ffffff'][i % 4], big: true, sign: i % 17 === 3 ? A.signs[i % A.signs.length] : null }); }
    }
    pounders = [];
    if (!A.snowbanks) for (const side of [0, 1]) for (let i = 0; i < 5; i++) { const x = side ? Rink.X1 + 18 : Rink.X0 - 18, y = Rink.C.y - 60 + i * 30, h = E.hash2(i + side * 9, 5); pounders.push({ x, y, h, side, rig: Rigs.fan(i % 2 ? hc.dark : A.fans.mix[(i + 2) % A.fans.mix.length], SKIN[i % SKIN.length]), pound: 0 }); }
  }
  function excite(v) { ex = clamp(ex + v * .5 * T.crowdHype, 0, 1.2); quietT = 0; }
  function react(kind) { Synth.swell(kind); if (kind === 'roar' || kind === 'cheer') standT = Math.max(standT, 2); }
  const jump = (team, s) => { jumpT[team] = s; };
  const stand = s => { standT = Math.max(standT, s); };
  const flinch = x => { flinchX = x; flinchT = 1.2; };
  const pound = x => { for (const p of pounders) if (Math.abs(p.x - x) < 200) p.pound = 1.2; };
  function chant() { Synth.chant('ka boom'); standT = 4; }
  function step(dt, m) {
    t += dt; ex = Math.max(.15, ex - dt * .05); quietT += dt; standT = Math.max(0, standT - dt); flinchT = Math.max(0, flinchT - dt); jumpT = jumpT.map(v => Math.max(0, v - dt));
    if (quietT > 20 && waveX < 0) { waveX = 0; quietT = 0; }
    if (waveX >= 0) { waveX += dt * 260; if (waveX > Rink.W) waveX = -1; }
    if (m && (m.phase === 'play' || m.phase === 'faceoff')) Synth.crowd(.25 + ex * .75); else if (m) Synth.crowd(.2 + ex * .5);
    for (const p of pounders) { p.pound = Math.max(0, p.pound - dt); if (m && !m.puck.owner === false) {} const near = m && Math.abs(m.puck.x - p.x) < 140; if (near && RNG.fx() < dt * 2) p.pound = .6; p.rig.update(dt, { x: p.x, y: p.y, z: 0, vx: 0, vy: 0, facing: p.side ? PI : 0, pose: p.pound > 0 ? 'cheer' : standT > 0 ? 'cheer' : null }); }
  }
  function draw(r, m) {
    const ga = game.real, kab = m && (m.kaboom[0] > 0 || m.kaboom[1] > 0);
    for (const f of fans) {
      if (!r.visible(f.x, f.y, f.z + 6)) continue;
      const ph = f.h * 9, up = (jumpT[f.side] > 0 ? Math.abs(Math.sin(ga * 9 + ph)) * 4 : 0) + (standT > 0 || kab ? 1.5 + Math.abs(Math.sin(ga * 6 + ph)) * 1.5 : 0) + (waveX >= 0 && Math.abs(f.x - waveX) < 50 ? 4 * (1 - Math.abs(f.x - waveX) / 50) : 0) + Math.sin(ga * 2 + ph) * .5 * ex;
      const fl = flinchT > 0 && Math.abs(f.x - flinchX) < 90 ? -2 : 0, z = f.z + up;
      r.queue(f.x, f.y, z, g => {
        const [x, y] = r.w(f.x, f.y, z), X = Math.round(x + fl * .5), Y = Math.round(y), big = f.big ? 1 : 0;
        px.rect(g, X - 2 - big, Y - 5 - big * 2, 4 + big * 2, 5 + big * 2, f.shirt); px.rect(g, X - 1, Y - 8 - big * 2, 3, 3, f.skin);
        if (f.hat) px.rect(g, X - 1, Y - 9 - big * 2, 3, 1 + big, f.hat);
        if (standT > 0 || kab || jumpT[f.side] > 0) { px.dot(g, X - 3 - big, Y - 8 - (Math.floor(ga * 8 + ph) % 2), f.skin); px.dot(g, X + 2 + big, Y - 8 - (Math.floor(ga * 8 + ph + 1) % 2), f.skin); }
        if (flinchT > 0 && Math.abs(f.x - flinchX) < 90) { px.dot(g, X - 2, Y - 9, f.skin); px.dot(g, X + 2, Y - 9, f.skin); }
        if (f.sign) { const w = E.font.width(f.sign, { font: 'tiny' }) + 4; px.rect(g, X - w / 2, Y - 18, w, 8, '#f4f0e0'); px.rect(g, X - w / 2, Y - 18, w, 1, '#ffffff'); E.font.text(g, f.sign, X, Y - 17, '#c8202a', { font: 'tiny', align: 'center', outline: false }); px.rect(g, X, Y - 10, 1, 3, '#8a6a3a'); }
      });
    }
    for (const p of pounders) {
      const bang = p.pound > 0 ? Math.sin(ga * 18 + p.h * 9) : 0;
      r.actor(p.x, p.y, 0, (g, ox, oy) => p.rig.draw(g, ox, oy + (bang > 0 ? -1 : 0), r.view), { every: 1 });
    }
  }
  /** the near crowd: dark head-and-shoulder silhouettes along the screen's bottom edge (the broadcast foreground) */
  function foreground(g, r, m) {
    if (game.view.id === 'topdown' || !m) return;
    const [, fy] = Cam.focus; if (fy < Rink.C.y + 40) return;
    const k = clamp((fy - Rink.C.y - 40) / 120, 0, 1), base = r.H + 6 - k * 10, ga = game.real;
    for (let x = -8, i = 0; x < r.W + 8; x += 13, i++) { const h = E.hash2(i, 3), up = (standT > 0 ? Math.abs(Math.sin(ga * 7 + i)) * 3 : 0); const y = base - 6 - h * 4 - up; px.disc(g, x, y, 5, '#06080e'); px.rect(g, x - 8, y + 4, 16, 12, '#06080e'); if (h > .8) px.rect(g, x - 3, y - 6, 6, 2, '#0e121c'); }
  }
  /** the benches and sin bins on the far side: spares sitting, the coaches standing, Doris at the organ */
  function benches(r, m) {
    if (!m) return;
    for (const t of [0, 1]) {
      const b = m.bench[t], x0 = Rink.C.x + (t === 0 ? -150 : 150), y = Rink.Y0 - 12;
      r.queue(x0, y - 4, 0, g => { r.box(g, x0 - 60, y - 6, 0, x0 + 60, y - 2, 6, '#4a3a2a', '#2a2018'); });
      b.spares.forEach((rig, i) => { const x = x0 - 30 + i * 34; r.actor(x, y - 2, 2, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { every: 2, key: rig }); });
      if (b.coach) r.actor(x0 + 46, y - 10, 0, (g, ox, oy) => b.coach.draw(g, ox, oy, r.view), { every: 2, key: b.coach });
    }
    // the sin bins and the scorekeeper's box between them
    r.queue(Rink.C.x, Rink.Y0 - 6, 0, g => { r.box(g, Rink.C.x - 64, Rink.Y0 - 20, 0, Rink.C.x + 64, Rink.Y0 - 2, 2, '#2a2a34', '#1a1a22'); r.box(g, Rink.C.x - 8, Rink.Y0 - 22, 0, Rink.C.x + 8, Rink.Y0 - 8, 12, '#5a5a6a', '#3a3a4a'); });
  }
  return { build, excite, react, jump, stand, flinch, pound, chant, step, draw, foreground, benches, get level() { return ex; } };
})();

/* ---- DRESS: each arena's props, set dressing and lights (the far side and the ends; nothing is built on the camera
 * side) ---- */
const Dress = (() => {
  let organist = null, beat = 0;
  const lamp = (x, y, z, c) => { L.add(x, y, z, 260, .8, { color: c }); };
  function lights(r, m, A) {
    const t = game.real;
    if (A.lamps) for (let i = 0; i < A.lamps; i++) { const x = Rink.C.x - Rink.HL * .75 + i * (Rink.HL * 1.5 / Math.max(1, A.lamps - 1)), flick = A.flicker && E.hash2(Math.floor(t * 12), i) < .06 ? .3 : 1; L.add(x, Rink.C.y - 40, 140, 300, .2 * flick, { color: A.lampColor }); L.add(x, Rink.C.y + 120, 140, 240, .14 * flick, { color: A.lampColor }); }
    if (A.neon) A.neon.forEach((c, i) => L.add(Rink.C.x - 380 + i * 380, Rink.Y0 - 60, 30, 220, .7 + Math.sin(t * 3 + i) * .1, { color: c }));
    if (A.id === 'pond') { L.add(Rink.C.x - 520, Rink.Y0 - 40, 10, 260, .9 + Math.sin(t * 13) * .1, { color: '#ff9a3a' }); L.add(Rink.C.x + 470, Rink.Y0 - 70, 20, 150, .6, { color: '#ffd080' }); L.add(Rink.C.x - 260, Rink.Y0 - 90, 20, 150, .6, { color: '#ffd080' }); for (let i = 0; i < 6; i++) L.add(Rink.C.x - 400 + i * 160, Rink.Y0 - 24, 50, 120, .45, { color: '#ffe0a0' }); }
    if (A.id === 'dome') { if (m && (m.phase === 'goal' || m.kaboom[0] > 0 || m.kaboom[1] > 0)) for (const [x, y] of [[Rink.X0 - 20, Rink.Y0 - 20], [Rink.X1 + 20, Rink.Y0 - 20]]) L.add(x, y, 40, 260, .9, { color: '#ff7a2a' }); }
    if (m) { for (const t2 of [0, 1]) if (m.kaboom[t2] > 0) L.add(Rink.C.x, Rink.C.y, 60, 900, .25 + Math.sin(t * 8) * .1, { color: m.teams[t2].id === 'grizzlies' ? '#ffd84a' : m.teams[t2].def.trim }); if (m.puck.onFire) L.add(m.puck.x, m.puck.y, 6, 90, 1, { color: '#ff8a2a' }); }
  }
  function draw(r, m, A) {
    const t = game.real, top = A.stand ? 64 : 0, backY = 8;
    if (A.id === 'icebox' || A.id === 'dome') {
      // championship banners and the hand-painted scoreboard on the back wall; the organ booth
      for (const [i, lab] of (A.banners || ['KABOOM', 'CUP']).entries()) { const x = Rink.C.x - 200 + i * 400; r.prop('banner', x, backY, top + 4, { size: 1.6, color: A.id === 'dome' ? '#d9a520' : '#5a3a22' }); }
      r.queue(Rink.C.x, backY + 6, top, g => { const a = r.w(Rink.C.x - 70, backY, top + 40), b = r.w(Rink.C.x + 70, backY, top + 4); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#1a2a1a'); px.rect(g, a[0] + 2, a[1] + 2, b[0] - a[0] - 4, b[1] - a[1] - 4, '#0e1a10');
        const M = m; if (M) { E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].score + '  ' + U.mmss(M.clock) + '  ' + M.teams[1].score + ' ' + M.teams[1].def.abbr, (a[0] + b[0]) / 2, a[1] + 5, '#ffd36a', { align: 'center', font: 'tiny', outline: false }); } E.font.text(g, A.id === 'dome' ? 'KABOOM DOME' : "OL' ICEBOX", (a[0] + b[0]) / 2, b[1] - 9, '#e8e0c8', { align: 'center', font: 'tiny', outline: false }); });
      if (A.organ) { if (!organist) organist = Rigs.cast('doris'); const ox = Rink.X0 - 60, oy = Rink.Y0 - 10; r.queue(ox, oy + 4, 0, g => r.box(g, ox - 14, oy - 4, 0, ox + 14, oy + 6, 14, '#6a3a2a', '#4a2418'));
        organist.update(1 / 60, { x: ox, y: oy - 8, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: m && m.phase === 'goal' ? 'cheer' : null });
        const bob = Math.sin(t * 8) * 1.2, J = organist.J; if (J.handR && !(m && m.phase === 'goal')) { J.handR = E.V3.add(J.shC, [3.5, 1.6, -4 + Math.max(0, bob)]); J.handL = E.V3.add(J.shC, [3.5, -1.6, -4 + Math.max(0, -bob)]); }
        r.actor(ox, oy - 8, 0, (g, x, y) => organist.draw(g, x, y, r.view)); }
      for (let i = 0; i < 8; i++) r.prop('lantern', Rink.C.x - 420 + i * 120, backY + 14, top + 26, { size: 1, anchor: 'top', light: false });
    }
    if (A.id === 'pond') {
      for (let i = 0; i < 14; i++) { const x = Rink.C.x - 640 + i * 98 + E.hash2(i, 1) * 30, y = Rink.Y0 - 120 - E.hash2(i, 2) * 70; r.shape('pine', x, y, 0, { params: { h: 44 + E.hash2(i, 3) * 26, tiers: 4 } }); }
      for (const [x, y, lit] of [[Rink.C.x + 470, Rink.Y0 - 96, 1], [Rink.C.x - 260, Rink.Y0 - 120, 1]]) r.queue(x, y + 14, 0, g => { r.box(g, x - 30, y - 18, 0, x + 30, y + 14, 26, '#8a5a32', '#5a3a1e'); r.box(g, x - 34, y - 22, 26, x + 34, y + 18, 32, '#e8eef8', '#c8d0dc'); const w0 = r.w(x - 12, y + 14, 14); px.rect(g, w0[0], w0[1], 8, 6, lit ? '#ffd080' : '#3a3a3a'); const w1 = r.w(x + 6, y + 14, 14); px.rect(g, w1[0], w1[1], 8, 6, lit ? '#ffd080' : '#3a3a3a'); }, { emissive: false });
      r.prop('firedrum', Rink.C.x - 520, Rink.Y0 - 40, 0, { size: 1.6, light: false });
      for (const [x, y] of [[Rink.C.x - 380, Rink.Y0 - 60], [Rink.C.x + 300, Rink.Y0 - 70], [Rink.X1 + 50, Rink.C.y - 60]]) r.queue(x, y, 0, g => { const a = r.w(x, y, 5), b = r.w(x, y, 13), c = r.w(x, y, 19); px.disc(g, a[0], a[1], 6, '#f4f8ff'); px.disc(g, b[0], b[1], 4.5, '#ffffff'); px.disc(g, c[0], c[1], 3.4, '#f4f8ff'); px.dot(g, c[0] + 1, c[1] - 1, '#141414'); px.dot(g, c[0] + 3, c[1], '#f08a2a'); px.line(g, b[0] - 4, b[1], b[0] - 9, b[1] - 4, '#6a4a2a'); });
      for (let i = 0; i < 7; i++) { const x = Rink.C.x - 480 + i * 160; r.prop('streetlamp', x, Rink.Y0 - 30, 0, { size: 1.1, light: false }); }
      for (let i = 0; i < 30; i++) { const x = Rink.C.x - 480 + i * 32, z = 44 - Math.sin((i % 5) / 5 * PI) * 6; r.queue(x, Rink.Y0 - 30, z, g => { const q = r.w(x, Rink.Y0 - 30, z); px.dot(g, q[0], q[1], ['#ffd080', '#ff6a6a', '#6aff8a', '#6ab8ff'][i % 4]); }, { emissive: true }); }
    }
    if (A.id === 'grindhouse') {
      for (let i = 0; i < 6; i++) { const x = Rink.C.x - 450 + i * 180; r.queue(x, backY + 2, top, g => { r.box(g, x - 4, backY - 2, top, x + 4, backY + 4, top + 60, '#5a6068', '#3a3e44'); }); }
      for (const side of [0, 1]) { const x = side ? Rink.X1 + 6 : Rink.X0 - 6; r.queue(x, Rink.C.y - 100, 0, g => { for (let k = 0; k <= 10; k++) { const a = r.w(x, Rink.C.y - 100 + k * 20, 17), b = r.w(x, Rink.C.y - 100 + k * 20, 70); px.line(g, a[0], a[1], b[0], b[1], '#6a7078'); } for (let z = 22; z <= 70; z += 8) { const a = r.w(x, Rink.C.y - 100, z), b = r.w(x, Rink.C.y + 100, z); px.line(g, a[0], a[1], b[0], b[1], '#5a6068'); } }); }
      for (let i = 0; i < 4; i++) { const x = Rink.C.x - 300 + i * 200; r.queue(x, backY + 10, top + 12, g => { const a = r.w(x - 60, backY + 10, top + 12), b = r.w(x + 60, backY + 10, top + 12); px.line(g, a[0], a[1], b[0], b[1], '#8a5a3a', 3); px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#b8805a'); }); if (RNG.fx() < .02) P.smoke(x + 50, backY + 10, top + 14, 1, { size: .8, color: '#d8e0e8' }); }
      r.prop('firedrum', Rink.X0 - 50, Rink.Y0 - 30, 0, { size: 1.2, light: false });
    }
    if (A.id === 'mall') {
      const shops = [['PRETZEL PLANET', '#ffb04a'], ['SOCK SHACK', '#4af0f0'], ['GLITTERMAN GOLD', '#ffe04a'], ['ARCADIA', '#ff4ab8'], ['FOOD COURT', '#8aff6a']];
      shops.forEach(([name, c], i) => { const x = Rink.C.x - 440 + i * 220; r.queue(x, backY + 12, top, g => { const a = r.w(x - 70, backY + 8, top + 44), b = r.w(x + 70, backY + 8, top + 4); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#2a2438'); px.rect(g, a[0] + 3, a[1] + 12, b[0] - a[0] - 6, b[1] - a[1] - 14, '#1a3a4a'); px.blend(g, .5, 'add', () => px.rect(g, a[0] + 3, a[1] + 12, b[0] - a[0] - 6, 2, c)); E.font.text(g, name, (a[0] + b[0]) / 2, a[1] + 3, c, { align: 'center', font: 'tiny', outline: false }); }, { emissive: true }); });
      const fx2 = Rink.X1 + 50, fy2 = Rink.C.y - 140; r.queue(fx2, fy2, 0, g => { const q = r.w(fx2, fy2, 0); px.ell(g, q[0], q[1], 22, 12, '#a8a0b8'); px.ell(g, q[0], q[1] - 1, 18, 9, '#4ab8e8'); for (let k = 0; k < 5; k++) { const h = 6 + Math.abs(Math.sin(t * 6 + k)) * 6; px.line(g, q[0] - 6 + k * 3, q[1] - 2, q[0] - 6 + k * 3, q[1] - 2 - h, '#cfefff'); } }, { emissive: false });
      for (const side of [0, 1]) { const x = side ? Rink.X1 + 40 : Rink.X0 - 40; r.queue(x, Rink.C.y + 40, 0, g => r.box(g, x - 10, Rink.C.y + 20, 0, x + 10, Rink.C.y + 60, 30, '#c8c0d8', '#8a8098')); }
      // the claw of the Discount Drop
      if (m) for (const c of m.extras) if (c.kind === 'crate' && !c.done) r.queue(c.x, c.y, c.z, g => { const q = r.w(c.x, c.y, c.z), top2 = r.w(c.x, c.y, 160); px.line(g, top2[0], top2[1], q[0], q[1] - 10, '#a8a8b8'); r.box(g, c.x - 8, c.y - 8, c.z, c.x + 8, c.y + 8, c.z + 14, '#c8945a', '#8a5a32'); E.font.text(g, 'SALE', q[0], q[1] - 12, '#ff4ab8', { font: 'tiny', align: 'center', outline: false }); });
    }
    if (A.id === 'dome') {
      for (const [x, y] of [[Rink.X0 - 24, Rink.Y0 - 24], [Rink.X1 + 24, Rink.Y0 - 24], [Rink.X0 - 24, Rink.Y1 + 30], [Rink.X1 + 24, Rink.Y1 + 30]]) {
        r.queue(x, y, 0, g => r.box(g, x - 7, y - 7, 0, x + 7, y + 7, 22, '#3a3a44', '#24242c'));
        if (m && (m.phase === 'goal' || m.kaboom[0] > 0 || m.kaboom[1] > 0) && RNG.fx() < .5) P.fire(x, y, 24, 2, { size: 1.6 });
      }
      if (A.lasers) r.overlay(g => { const k = Math.floor(t * 2) % 3; px.blend(g, .18, 'add', () => { for (let i = 0; i < 4; i++) { const a = t * .8 + i * 1.6, x0 = r.W * (.15 + i * .23); px.line(g, x0, 0, x0 + Math.sin(a) * r.W * .4, r.H * .6, ['#ff3a6a', '#3affea', '#ffe03a'][(i + k) % 3], 1); } }); });
      if (Replay.on) r.overlay(g => { px.rect(g, 0, 0, r.W, 3, '#d9a520'); px.rect(g, 0, r.H - 3, r.W, 3, '#d9a520'); });
    }
  }
  return { lights, draw };
})();
