/* ---- Crowd and Arena: the stands and their fans (excitement, waves, signs, glass pounders), benches and coaches, the
 * boards and glass, the nets, each barn's props and lights (PLAN 7.1, 8, 11.2) ---- */
const Crowd = (() => {
  let ex = .2, quiet = 0, standing = false, goalT = 0, goalTeam = -1, flinchX = null, flinchT = 0;
  const hype = k => { ex = Math.min(1, ex + k * T.crowdHype); quiet = 0; };
  const react = kind => { if (M && M.cfg.session && Net.isClient() && kind) { /* clients hear it from the host's events */ } Synth.react(kind); };
  function step(dt) {
    ex = Math.max(.15, ex - dt * .06); quiet += dt; goalT = Math.max(0, goalT - dt); flinchT = Math.max(0, flinchT - dt);
    if (M && (M.phase === 'play' || M.phase === 'goal')) Synth.crowdBed(.25 + ex * .75); else Synth.crowdBed(.2);
  }
  return { hype, react, step, stand(on) { standing = on; }, goal(team) { goalT = 3; goalTeam = team; }, flinch(x) { flinchX = x; flinchT = 1; },
    get ex() { return ex; }, get quiet() { return quiet; }, get standing() { return standing; }, get goalT() { return goalT; }, get goalTeam() { return goalTeam; }, get flinchX() { return flinchX; }, get flinchT() { return flinchT; } };
})();

const Arena = (() => {
  const C = Rink.C, tones = E.tones;
  const TIERS = 5, TD = 34;
  const fans = {};   // per arena: the fans' fixed looks
  function fansFor(a) {
    if (fans[a.id]) return fans[a.id];
    const list = [];
    for (let k = 0; k < TIERS; k++) for (let x = 8; x < 1120; x += 9) {
      const h = E.hash2(x, k * 31 + 7), y = C.y - Rink.HW - 26 - k * TD - 12 + (h - .5) * 6;
      if (a.snowbank && (k > 2 || h < .45)) continue;
      list.push({ x: x + (h - .5) * 4, y, z: 26 + k * 15, shirt: a.crowd[Math.floor(h * 97) % a.crowd.length], skin: ['#f0c8a0', '#c08a60', '#8a5a3a', '#f4d8c0', '#6a4028'][Math.floor(h * 53) % 5], ph: h * 9, sign: h > .965 ? U.pick(() => E.hash2(x, k), ['BARN BURNER', 'KABOOM!', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY ♥', 'GO ' + 'TEAM']) : null, toque: a.toque && h > .5, home: h < .7 });
    }
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) for (let y = C.y - 170; y < C.y + 190; y += 9) {
      const h = E.hash2(y, k * 13 + (side > 0 ? 3 : 9)), x = C.x + side * (Rink.HL + 40 + k * 22);
      if (a.snowbank && h < .5) continue;
      list.push({ x, y, z: 22 + k * 12, shirt: a.crowd[Math.floor(h * 71) % a.crowd.length], skin: ['#f0c8a0', '#c08a60', '#8a5a3a', '#f4d8c0'][Math.floor(h * 37) % 4], ph: h * 9, toque: a.toque && h > .5, home: h < .7, end: side });
    }
    list.sort((p, q) => p.y - q.y);
    return (fans[a.id] = list);
  }
  const pounders = [];
  const benchRigs = {};
  function benchFor(team, tid) {
    const k = tid + team; if (benchRigs[k]) return benchRigs[k];
    const coach = tid === 'muskrats' ? Rigs.cast('marge').rig : new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#e0e0e0', coat: TEAMS[tid].dark, pants: '#2a2a2a', skin: '#e0b090', hair: '#5a5a5a' } });
    return (benchRigs[k] = { coach });
  }
  /* ---- the background (drawn first, under everything): stands and fans, the far boards and glass, benches, props ---- */
  function poly(g, r, pts, col) { px.poly(g, pts.map(p => { const s = r.w(p[0], p[1], p[2]); return [s[0] - r.ix * 0, s[1]]; }), col); }
  function background(r) {
    const a = M.arena, view = r.view;
    r.decal(g => {
      // the stands: stepped tiers north of the benches
      for (let k = TIERS - 1; k >= 0; k--) {
        const y1 = C.y - Rink.HW - 26 - k * TD, y0 = y1 - TD, z = a.snowbank ? 8 + k * 6 : 24 + k * 15, zb = k ? (a.snowbank ? 8 + (k - 1) * 6 : 24 + (k - 1) * 15) : 0, c = tones(a.stand[k % a.stand.length]);
        poly(g, r, [[0, y0, z], [1120, y0, z], [1120, y1, z], [0, y1, z]], c.base);
        poly(g, r, [[0, y1, z], [1120, y1, z], [1120, y1, zb], [0, y1, zb]], c.sh);
        const [, ly] = r.w(0, y1, z); px.rect(g, 0, Math.round(ly), r.W, 1, c.lt);
      }
      for (const side of [-1, 1]) for (let k = 2; k >= 0; k--) {
        const x0 = C.x + side * (Rink.HL + 26 + k * 22), x1 = x0 + side * 22, z = a.snowbank ? 6 + k * 5 : 20 + k * 12, c = tones(a.stand[(k + 1) % a.stand.length]);
        poly(g, r, [[x0, C.y - 200, z], [x1, C.y - 200, z], [x1, C.y + 230, z], [x0, C.y + 230, z]], c.base);
        poly(g, r, [[x0, C.y + 230, z], [x1, C.y + 230, z], [x1, C.y + 230, 0], [x0, C.y + 230, 0]], c.sh);
      }
      // fans: excitement bobs them, goals make the home side jump, a wave runs when it's quiet, the glass flinch
      const ex = Crowd.ex, t = game.time, wave = Crowd.quiet > 20, F = fansFor(a);
      for (const f of F) {
        let up = Math.sin(t * (2 + ex * 6) + f.ph) * (.4 + ex * 1.6);
        if (Crowd.goalT > 0 && (f.home ? 0 : 1) === Crowd.goalTeam) up += Math.abs(Math.sin(t * 10 + f.ph)) * 5;
        if (Crowd.standing || ex > .7) up += 2;
        if (wave) { const wp = ((t * 160) % 1400) - 140; if (Math.abs(f.x - wp) < 30) up += 5 * (1 - Math.abs(f.x - wp) / 30); }
        if (Crowd.flinchT > 0 && Math.abs(f.x - Crowd.flinchX) < 60 && f.z < 45) up -= 2;
        const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y);
        if (X < -6 || X > r.W + 6 || Y < -10 || Y > r.H + 10) continue;
        const sh = a.parka ? 5 : 4;
        px.rect(g, X - 2, Y - 5, sh, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin);
        if (f.toque) px.rect(g, X - 1, Y - 9, 3, 2, f.shirt === '#e8e0d0' ? '#c83a2a' : '#e8e0d0');
        if (a.parka) px.rect(g, X - 2, Y - 9, 5, 2, f.shirt);
        if (ex > .6 && Math.sin(t * 7 + f.ph) > .3) { px.rect(g, X - 3, Y - 10, 1, 3, f.skin); px.rect(g, X + 2, Y - 10, 1, 3, f.skin); }
        if (f.sign) { const w = E.font.width(f.sign, { font: 'tiny' }) + 4; px.rect(g, X - w / 2, Y - 18, w, 8, '#f4f0e0'); E.font.text(g, f.sign, X, Y - 16, '#c83a2a', { font: 'tiny', align: 'center', outline: false }); }
      }
      // props behind the rink, per barn
      decor(g, r, a);
      // benches, the scorekeeper and sin bins along the far boards
      for (const team of [0, 1]) {
        const x0 = C.x + (team ? 72 : -216), x1 = x0 + 144, y = Rink.Y0 - 14;
        poly(g, r, [[x0, y - 8, 10], [x1, y - 8, 10], [x1, y + 4, 10], [x0, y + 4, 10]], '#4a3424');
        poly(g, r, [[x0, y + 4, 10], [x1, y + 4, 10], [x1, y + 4, 0], [x0, y + 4, 0]], '#2a1c14');
        const tm = M.teams[team], b = benchFor(team, tm.id);
        for (let i = 0; i < 4; i++) { const sx = x0 + 20 + i * 34, [X, Y] = r.w(sx, y - 3, 10); px.rect(g, Math.round(X) - 3, Math.round(Y) - 9, 7, 8, team === 0 ? tm.dark : tm.light); px.rect(g, Math.round(X) - 2, Math.round(Y) - 13, 5, 4, team === 0 ? tm.trim : tm.dark); px.rect(g, Math.round(X) - 1, Math.round(Y) - 11, 3, 2, '#e0b090'); }
        const [cx, cy] = r.w(x0 + 72, y - 14, 0); b.coach.draw(g, Math.round(cx), Math.round(cy), E.charView ? E.charView(view) : view);
      }
      for (const team of [0, 1]) { const x0 = C.x + (team ? 12 : -60); poly(g, r, [[x0, Rink.Y0 - 22, 12], [x0 + 48, Rink.Y0 - 22, 12], [x0 + 48, Rink.Y0 - 2, 12], [x0, Rink.Y0 - 2, 12]], '#22262e'); }
      // the far boards and glass (every panel that doesn't face the camera)
      for (const p of Rink.panels) if (p.n[1] <= .3) panel(g, r, p, false);
      // ice details: scuffs, melt, thin ice, holes
      scuffs(g, r);
      if (M.ice) for (const p of M.ice) iceDecal(g, r, p);
      if (M.gear) for (const gr of M.gear) { const [x, y] = r.w(gr.x, gr.y, 0); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 3, gr.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 2, 3, 1, E.shade(gr.c, .2)); }
      if (M.hats) for (const h of M.hats) if (h.z <= 0) { const [x, y] = r.w(h.x, h.y, 0); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 2, h.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 3, 3, 2, h.c); }
    });
    // the near (camera-side) boards, cut low so they never hide play, and corners: queued per panel
    for (const p of Rink.panels) if (p.n[1] > .3) r.queue(p.m[0], p.m[1] + 2, 0, g => panel(g, r, p, true));
    nets(r);
  }
  function panel(g, r, p, cut) {
    const a = M.arena, [ax, ay] = p.a, [bx, by] = p.b;
    if (a.snowbank) {   // pond: a lumpy snowbank instead of boards
      const h = cut ? 5 : 9, steps = 4;
      for (let i = 0; i < steps; i++) { const u0 = i / steps, u1 = (i + 1) / steps, x0 = lerp(ax, bx, u0), y0 = lerp(ay, by, u0), x1 = lerp(ax, bx, u1), y1 = lerp(ay, by, u1), hh = h + E.hash2(Math.round(x0), Math.round(y0)) * 4;
        poly(g, r, [[x0, y0, 0], [x1, y1, 0], [x1, y1, hh], [x0, y0, hh]], '#e8f0fa'); poly(g, r, [[x0 + p.n[0] * 6, y0 + p.n[1] * 6, hh], [x1 + p.n[0] * 6, y1 + p.n[1] * 6, hh], [x1, y1, hh], [x0, y0, hh]], '#ffffff'); }
      return;
    }
    const H = cut ? 6 : Rink.BOARD, sh = p.shake > 0 ? Math.sin(game.time * 60) * p.shake * 2 : 0;
    poly(g, r, [[ax, ay, 0], [bx, by, 0], [bx, by, H], [ax, ay, H]], '#eef2f6');
    poly(g, r, [[ax, ay, 0], [bx, by, 0], [bx, by, 2], [ax, ay, 2]], '#e8c030');
    const capC = M.teams[0].dark, a0 = r.w(ax, ay, H), b0 = r.w(bx, by, H);
    px.line(g, a0[0], a0[1], b0[0], b0[1], a.cap || capC, 2);
    if (!cut && p.i < 14 && a.ads.length) { const ad = a.ads[Math.floor(p.i / 3.5) % a.ads.length]; if (p.i % 3 === 1 || p.i % 7 === 3) { const [x, y] = r.w((ax + bx) / 2, ay, 9); E.font.text(g, ad.slice(0, 14), Math.round(x), Math.round(y) - 3, ['#1a3a8a', '#c83a2a', '#1a1a1a'][p.i % 3], { font: 'tiny', align: 'center', outline: false }); } }
    if (cut) return;
    // the glass: translucent, a highlight streak, stanchions; cracks or an empty frame
    const top = H + p.h, A1 = r.w(ax, ay, top), B1 = r.w(bx, by, top);
    if (p.state !== 'shattered') px.blend(g, .22, 'normal', () => poly(g, r, [[ax, ay, H], [bx, by, H], [bx, by, top], [ax, ay, top]], '#bfe4ff'));
    px.line(g, a0[0], a0[1], A1[0] + sh, A1[1], '#5a6a7a', 1); px.line(g, A1[0] + sh, A1[1], B1[0] + sh, B1[1], '#8aa0b8', 1);
    if (p.state === 'ok') { const m0 = r.w(lerp(ax, bx, .3), lerp(ay, by, .3), H + 4), m1 = r.w(lerp(ax, bx, .45), lerp(ay, by, .45), top - 3); px.blend(g, .5, 'screen', () => px.line(g, m0[0] + sh, m0[1], m1[0] + sh, m1[1], '#ffffff', 1)); }
    if (p.state === 'cracked') { const c0 = r.w(lerp(ax, bx, .5), lerp(ay, by, .5), H + p.h * .5); for (let i = 0; i < 6; i++) { const ang = i * 1.05 + p.i, len = 5 + (i * 7 % 5); px.line(g, c0[0], c0[1], c0[0] + Math.cos(ang) * len, c0[1] + Math.sin(ang) * len, '#ffffff', 1); } }
  }
  function scuffs(g, r) {
    const S2 = Rink.scuff, Mt = Rink.melt;
    for (let cy = 0; cy < Rink.SH; cy++) for (let cx = 0; cx < Rink.SW; cx++) {
      const i = cy * Rink.SW + cx, s = S2[i], m = Mt[i]; if (s < .05 && m < .05) continue;
      const x = Rink.X0 + cx * 16, y = Rink.Y0 + cy * 16;
      if (m > .05) { const [X, Y] = r.w(x + 8, y + 8, 0); px.blend(g, Math.min(.6, m), 'normal', () => px.ell ? px.ell(g, X, Y, 7, 3, '#8aa8c8') : px.disc(g, X, Y, 5, '#8aa8c8')); px.dot(g, X - 2, Y - 1, '#ffffff'); }
      if (s > .05) { const n = 1 + Math.floor(s * 3.5), h = E.hash2(cx, cy); px.blend(g, Math.min(.55, s * .8), 'normal', () => { for (let k = 0; k < n; k++) { const a0 = r.w(x + (h * 13 + k * 5) % 16, y + (h * 7 + k * 9) % 16, 0), a1 = r.w(x + (h * 13 + k * 5) % 16 + 6, y + (h * 7 + k * 9) % 16 + (k % 2 ? 2 : -2), 0); px.line(g, a0[0], a0[1], a1[0], a1[1], '#a8bccc', 1); } }); }
    }
  }
  function iceDecal(g, r, p) {
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, w = r.w(p.x + Math.cos(a) * p.rx, p.y + Math.sin(a) * p.ry, 0); pts.push(w); }
    if (p.hole) { px.poly(g, pts, '#0a1a2a'); const k = .7, inner = pts.map(q => { const c = r.w(p.x, p.y, 0); return [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]; }); px.poly(g, inner, '#14304a'); const c = r.w(p.x, p.y, 0), rr = (game.time * 10) % 12; px.blend(g, .5, 'screen', () => { for (let i = 0; i < 16; i += 2) px.dot(g, c[0] + Math.cos(i) * rr * 1.6, c[1] + Math.sin(i) * rr * .7, '#9ad0f0'); }); }
    else { px.blend(g, p.refrozen ? .4 : .22, 'normal', () => px.poly(g, pts, p.refrozen ? '#5a7a9a' : '#9ab8d8')); if (p.hp < 100) { const c = r.w(p.x, p.y, 0); for (let i = 0; i < 5; i++) { const a = i * 1.3; px.line(g, c[0], c[1], c[0] + Math.cos(a) * (8 + (100 - p.hp) * .2), c[1] + Math.sin(a) * 4, '#ffffff', 1); } } }
  }
  function nets(r) {
    for (const side of [0, 1]) {
      const gx = Rink.goalX(side), od = Rink.outDir(side), cy = C.y, m = Rink.MOUTH, bulge = (M.puck.inNet && M.puck.netSide === side) ? 3 : 0;
      r.queue(gx + od * 4, cy - m - 1, 0, g => {
        const P0 = (x, y, z) => r.w(x, y, z), back = gx + od * (Rink.NETD + bulge);
        const fl = P0(gx, cy - m, 0), fr = P0(gx, cy + m, 0), tl = P0(gx, cy - m, Rink.BAR), tr = P0(gx, cy + m, Rink.BAR), bl = P0(back, cy - m + 2, 0), br = P0(back, cy + m - 2, 0), btl = P0(back - od * 4, cy - m + 2, 10), btr = P0(back - od * 4, cy + m - 2, 10);
        px.blend(g, .35, 'normal', () => { px.poly(g, [tl, tr, btr, btl], '#f4f8ff'); px.poly(g, [tl, btl, bl, fl], '#e8eef8'); px.poly(g, [btl, btr, br, bl], '#dfe6f0'); });
        for (let i = 1; i < 6; i++) { const u = i / 6, a = [lerp(tl[0], tr[0], u), lerp(tl[1], tr[1], u)], b = [lerp(btl[0], btr[0], u), lerp(btl[1], btr[1], u)]; px.line(g, a[0], a[1], b[0], b[1], '#c8d4e4', 1); }
        px.line(g, fl[0], fl[1], tl[0], tl[1], '#d82a2a', 2); px.line(g, fr[0], fr[1], tr[0], tr[1], '#d82a2a', 2); px.line(g, tl[0], tl[1], tr[0], tr[1], '#d82a2a', 2);
        px.line(g, tl[0], tl[1], btl[0], btl[1], '#c8c8d0', 1); px.line(g, tr[0], tr[1], btr[0], btr[1], '#c8c8d0', 1); px.line(g, bl[0], bl[1], br[0], br[1], '#b0b8c8', 1);
      });
    }
  }
  /* ---- per-barn dressing behind the rink ---- */
  function decor(g, r, a) {
    const t = game.time;
    if (a.id === 'icebox') {
      for (let x = 40; x < 1100; x += 22) { const [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 4, 110 + Math.sin(x * .05) * 4); px.dot(g, X, Y, ['#ff6a5a', '#ffe070', '#5ae0ff', '#7aff7a'][Math.floor(x / 22) % 4]); }
      for (const [x, txt] of [[300, '1962 CHAMPS'], [820, 'KABOOM CUP ?']]) { const [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 10, 100); px.rect(g, X - 22, Y - 4, 44, 22, '#5a3a22'); px.rect(g, X - 20, Y - 2, 40, 18, '#8a2a2a'); E.font.text(g, txt.replace(' ?', ''), X, Y + 4, '#ffe08a', { font: 'tiny', align: 'center', outline: false }); }
      // the hand-painted scoreboard
      const [sx, sy] = r.w(C.x, C.y - Rink.HW - 26 - 5 * TD + 6, 118); px.rect(g, sx - 34, sy - 8, 68, 22, '#2a1a10'); px.rect(g, sx - 32, sy - 6, 64, 18, '#14301a');
      E.font.text(g, M.teams[0].abbr + ' ' + M.score[0] + '  ' + M.score[1] + ' ' + M.teams[1].abbr, sx, sy - 3, '#ffe070', { font: 'tiny', align: 'center', outline: false }); E.font.text(g, U.mmss(M.clock), sx, sy + 4, '#ff8a5a', { font: 'tiny', align: 'center', outline: false });
      // Doris's organ booth in the corner of the stands
      const [ox, oy] = r.w(Rink.X0 + 30, C.y - Rink.HW - 40, 30); px.rect(g, ox - 14, oy - 10, 28, 14, '#5a2a1a'); px.rect(g, ox - 12, oy - 8, 24, 3, '#f0f0e0'); for (let i = 0; i < 6; i++) px.rect(g, ox - 11 + i * 4, oy - 8, 1, 2, '#1a1a1a');
      const doris = Rigs.cast('doris').rig, beat = A.pos && A.pos.beat !== undefined ? A.pos.beat : t * 2; doris.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -PI / 2, pose: Math.floor(beat) % 2 ? 'cast' : null });
      doris.draw(g, Math.round(ox), Math.round(oy - 4), E.charView ? E.charView(r.view) : r.view);
    } else if (a.id === 'pond') {
      for (const [x, y] of [[180, 140], [940, 120]]) { poly(g, r, [[x - 30, y - 20, 24], [x + 30, y - 20, 24], [x + 30, y + 20, 24], [x - 30, y + 20, 24]], '#6a3a20'); poly(g, r, [[x - 30, y + 20, 24], [x + 30, y + 20, 24], [x + 30, y + 20, 0], [x - 30, y + 20, 0]], '#4a2a14'); const [wx, wy] = r.w(x, y + 20, 12); px.rect(g, wx - 5, wy - 4, 6, 5, '#ffd070'); px.rect(g, wx + 6, wy - 4, 6, 5, '#ffd070'); }
      for (const [x, y] of [[90, 330], [1040, 520], [1030, 260]]) { const [X, Y] = r.w(x, y, 0); px.disc(g, X, Y - 6, 6, '#f4f8ff'); px.disc(g, X, Y - 15, 4, '#ffffff'); px.dot(g, X - 1, Y - 16, '#141414'); px.dot(g, X + 1, Y - 16, '#141414'); px.rect(g, X, Y - 14, 2, 1, '#ff8a2a'); }
    } else if (a.id === 'grindhouse') {
      for (let x = 0; x < 1120; x += 70) { const a0 = r.w(x, C.y - Rink.HW - 26 - 5 * TD, 120), a1 = r.w(x + 70, C.y - Rink.HW - 26 - 5 * TD, 120), b0 = r.w(x + 35, C.y - Rink.HW - 26 - 5 * TD, 100); px.line(g, a0[0], a0[1], a1[0], a1[1], '#5a5e66', 2); px.line(g, a0[0], a0[1], b0[0], b0[1], '#4a4e56', 1); px.line(g, b0[0], b0[1], a1[0], a1[1], '#4a4e56', 1); }
      for (const x of [200, 560, 920]) { if (RNG.fx() < .02) P.smoke(x, C.y - Rink.HW - 40, 40, 1, { size: 1.4, color: '#c8ccd4' }); }
    } else if (a.id === 'mall') {
      const shops = [['FOOD COURT', '#ff5ab0'], ['SKATE SHACK', '#5affe0'], ['GLITTERMAN', '#ffe070'], ['PRETZELS', '#ff9a3a'], ['ARCADE', '#7a7aff']];
      shops.forEach(([nm, c], i) => { const x = 110 + i * 210, [X, Y] = r.w(x, C.y - Rink.HW - 26 - 5 * TD + 6, 96); px.rect(g, X - 34, Y - 6, 68, 34, '#3a3048'); px.rect(g, X - 30, Y + 8, 60, 18, '#ffe0a0'); px.glow && px.glow(g, 1); E.font.text(g, nm, X, Y - 3, Math.sin(t * 3 + i) > -.8 ? c : '#3a3a4a', { font: 'tiny', align: 'center', outline: false }); px.glow && px.glow(g, 0); });
      const [fx, fy] = r.w(C.x + 330, C.y - Rink.HW - 60, 30); px.disc(g, fx, fy, 12, '#c8c0d8'); px.disc(g, fx, fy, 10, '#5ab0e8'); for (let i = 0; i < 5; i++) px.dot(g, fx + Math.cos(t * 3 + i) * 4, fy - 6 - Math.abs(Math.sin(t * 5 + i)) * 6, '#e8f8ff');
      const e0 = r.w(80, C.y - Rink.HW - 40, 10), e1 = r.w(160, C.y - Rink.HW - 150, 90); px.line(g, e0[0], e0[1], e1[0], e1[1], '#8a8aa0', 4); px.line(g, e0[0], e0[1] - 3, e1[0], e1[1] - 3, '#c0c0d0', 1);
    } else if (a.id === 'dome') {
      const [jx, jy] = r.w(C.x, C.y - Rink.HW - 26 - 5 * TD, 150); px.rect(g, jx - 46, jy - 12, 92, 40, '#141414'); px.rect(g, jx - 44, jy - 10, 88, 36, '#0a1428');
      E.font.text(g, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr, jx, jy - 6, '#ffd040', { align: 'center', outline: false });
      if (M.boostOn && !M.organDone) E.font.text(g, '"SYNERGY, BOYS!"', jx, jy + 8, '#ffffff', { font: 'tiny', align: 'center', outline: false }); else E.font.text(g, 'KABOOM CUP FINAL', jx, jy + 8, '#ffffff', { font: 'tiny', align: 'center', outline: false });
      for (let i = 0; i < 6; i++) { const a0 = r.w(100 + i * 180, C.y - Rink.HW - 26 - 5 * TD, 160), a1 = r.w(C.x + Math.sin(t * .7 + i) * 380, C.y + Math.cos(t * .5 + i) * 150, 0); px.blend(g, .25, 'add', () => px.line(g, a0[0], a0[1], a1[0], a1[1], ['#ff3a3a', '#3aff8a', '#5a8aff'][i % 3], 1)); }
    }
  }
  /* ---- foreground: corner flame cannons, flying hats, glass pounders and the near crowd's silhouettes ---- */
  function foreground(r) {
    const a = M.arena;
    if (a.id === 'pond') { for (let i = 0; i < 18; i++) { const x = 30 + i * 62 + (i % 3) * 10, y = 60 + (i % 4) * 30; r.prop('pine', x, y, 0, { size: 1.4 + (i % 3) * .2 }); } r.prop('brazier', C.x + 40, C.y - Rink.HW - 70, 0, { size: 1.4, light: true }); }
    if (a.flames) for (const [x, y] of [[Rink.X0 + 20, Rink.Y0 + 20], [Rink.X1 - 20, Rink.Y0 + 20]]) { r.prop('brazier', x - Math.sign(x - C.x) * 30, y - 40, 0, { size: 1.2 }); if ((M.phase === 'goal' && M.phaseT < 1.5) || M.kaboomT[0] > 0 || M.kaboomT[1] > 0) P.fire(x - Math.sign(x - C.x) * 30, y - 40, 22, 1, { size: 1.6 }); }
    if (M.hats) for (const h of M.hats) if (h.z > 0) { h.z = Math.max(0, h.z - 40 / 60); r.queue(h.x, h.y, h.z, g => { const [x, y] = r.w(h.x, h.y, h.z); px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 5, 2, h.c); px.rect(g, Math.round(x) - 1, Math.round(y) - 3, 3, 2, h.c); }); }
    // glass pounders behind each net
    if (!pounders.length) for (let i = 0; i < 10; i++) pounders.push({ rig: Rigs.pounder(['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#5a3a22'][i % 5], ['#f0c8a0', '#c08a60', '#8a5a3a'][i % 3]), side: i < 5 ? 0 : 1, k: i % 5 });
    if (!a.snowbank) for (const pd of pounders) {
      const gx = Rink.goalX(pd.side) + Rink.outDir(pd.side) * 62, y = C.y - 50 + pd.k * 25, near = Math.abs(M.puck.x - gx) < 160;
      const bang = near && Math.sin(game.time * 12 + pd.k) > 0;
      pd.rig.update(1 / 60, { x: gx, y, z: 0, vx: 0, vy: 0, facing: pd.side ? PI : 0, pose: bang ? 'cheer' : Crowd.goalT > 0 ? 'cheer' : null });
      r.actor(gx, y, 0, (g, ox, oy) => pd.rig.draw(g, ox, oy, r.view), { every: 2, key: pd });
    }
  }
  function silhouettes(r) {
    if (r.view.id !== 'threequarter' || M.attractHud) return;
    r.overlay(g => { for (let x = -6; x < r.W + 8; x += 11) { const h = E.hash2(x, 3), up = Crowd.ex > .6 ? Math.abs(Math.sin(game.time * 8 + h * 9)) * 3 : 0, y = r.H - 5 - h * 4 - up; px.disc(g, x, y, 5, '#05070c'); px.rect(g, x - 8, y + 3, 16, 12, '#05070c'); } });
  }
  /* ---- lights: the barn's lamps, KABOOM tint, goal lights ---- */
  function lights(r) {
    const a = M.arena; L.enabled = true; L.ambient = a.ambient;
    for (const [x, y] of a.lamps) { const fl = a.flicker && Math.sin(game.time * 23 + x) > .97 ? .3 : 1; L.add(x, y, 130, 280, .32 * fl, { color: a.lampColor }); }
    for (const t of [0, 1]) if (M.kaboomT[t] > 0) { const c = TEAMS[t === 0 ? M.cfg.home : M.cfg.away], pulse = .5 + .3 * Math.sin(game.time * 8); L.add(C.x, C.y, 160, 600, pulse, { color: c.id === 'grizzlies' ? '#ffd040' : '#ff6a2a' }); }
    if (a.id === 'pond') L.add(C.x + 40, C.y - Rink.HW - 70, 20, 180, .9 + .2 * Math.sin(game.time * 13), { color: '#ff9a3a' });
    if (M.puck.onFire) L.add(M.puck.x, M.puck.y, 10, 90, 1.2, { color: '#ff8a2a' });
    Fx.lights();
  }
  return { background, foreground, silhouettes, lights, panel, decor };
})();
