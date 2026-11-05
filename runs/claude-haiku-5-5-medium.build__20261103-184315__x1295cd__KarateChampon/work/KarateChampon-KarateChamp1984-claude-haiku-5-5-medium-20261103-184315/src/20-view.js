// ---------------------------------------------------------------- the view: rigs, stages, HUD, glyphs (no game rules here)
KC.View = {};
const V = KC.View;

// a fighter's rig: built from the roster, in the side's gi colour (white on the left mark, red on the right) unless a palette says otherwise
V.gi = (side, mode) => mode === 'classic' ? (side === 'w' ? '#e8e4d8' : '#b83028') : (side === 'w' ? '#f2eee4' : '#c8302a');
V.rigFor = (k, side, colorsOverride) => {
  const R = KC.DATA.roster[k];
  const gi = colorsOverride || V.gi(side);
  const belt = (k === 'mei') ? '#e8c040' : (side === 'w' ? '#f4f4ee' : '#16161c');
  const rig = new E.Humanoid({
    size: R.size, build: R.build, hair: R.hair || 'short', hat: R.hat || null, hood: !!R.hood,
    sleeves: 'short', weapon: null, hunch: R.hunch || 0,
    colors: {
      skin: R.skin, hair: k === 'ika' ? '#f4f0ff' : (k === 'kyabetsu' || k === 'kikurage' || k === 'genkotsu' ? '#8a7a6a' : '#1a1418'),
      cloth: gi, coat: gi, pants: gi, trim: gi, belt, glove: R.skin, boot: R.skin, shirt: gi,
      metal: '#c8c8d0', plate: gi, hilt: '#c8a040', eye: '#1a1418', iris: '#2a1a10', cape: '#8a2020', capeIn: '#5a1010'
    }
  });
  rig.kId = k; rig.kSide = side;
  return rig;
};
// drive a rig from a fighter's serializable pose state (poseState), so puppets and replays look identical
V.applyPose = (rig, st, dt) => {
  const T = st.tech ? KC.DATA.techniques[st.tech] : null;
  const spec = T && T.move && E.MOVES[T.move] ? E.MOVES[T.move] : null;
  let attack = null;
  if (spec && st.ph >= 0) {
    const len = st.ph === 0 ? (T.f[0] || 1) : st.ph === 1 ? (T.f[1] || 1) : (T.f[2] || 1);
    const u = Math.min(1, (st.t || 0) / Math.max(1, len * 2 / (1 * KC.TUNE.techSpeed)));
    attack = { spec, phase: ['wind', 'active', 'recover'][st.ph], u: st.ph === 1 ? u : Math.min(1, u) };
  }
  let pose = null;
  if (st.down) pose = 'down';
  else if (st.guard) pose = 'guard';
  else if (st.crouch) pose = 'crouch';
  else if (st.state === 'bow') pose = 'kneel';
  else if (st.state === 'win') pose = 'cheer';
  const s = {
    x: st.x, y: 0, z: st.z, vx: 0, vy: 0, facing: st.facing > 0 ? 0 : Math.PI, air: st.z > 0.5,
    crouch: !!st.crouch, pose, attack, flip: st.flip ? Math.min(1, Math.max(0, (st.t || 0) / 60)) : 0,
    down: st.down || 0, run: 0
  };
  if (st.state === 'walk') s.run = 0.4;
  if (st.stance) s.stance = 'guard';
  if (st.hit) s.hurt = 1;
  rig.update(dt, s);
  if (T && T.spin && st.ph === 1) rig.spin = T.spin * Math.min(1, st.t / Math.max(1, KC.DATA.techniques[st.tech].f[1] * 2));
  else rig.spin = 0;
  return rig;
};

// ---------------------------------------------------------------- stages: a backdrop, a floor, props and a crowd (drawn behind the fight)
V.backdrops = {};
V.backdropFor = (st) => {
  if (V.backdrops[st.id]) return V.backdrops[st.id];
  const layers = (st.layers || []).map((kind, i) => ({ kind, color: st.floorDark || '#2a2a40', y: 0.62 + i * 0.05, height: 0.2 + i * 0.05, parallax: 0.2 + i * 0.1, seed: 11 + i }));
  const bd = new E.Backdrop({ sky: st.sky, layers, stars: st.mood === 'night' ? 30 : 0, starsY: 0.5 });
  V.backdrops[st.id] = bd;
  return bd;
};
// the floor band under the arena, the crowd and the stage's painted details
V.drawStage = (r, st, t) => {
  const g = r.ctx, bd = V.backdropFor(st);
  bd.draw(r);
  const floor = Math.round(r.w(0, 0, 0)[1]), W = r.bw, H = r.bh, sx = x => r.w(x, 0, 0)[0];
  // lanterns glow in the warm stages
  if (st.lanterns) for (let k = 0; k < 7; k++) { const lx = Math.round(sx(-60 + k * 95)), ly = floor - 70, glow = 0.6 + 0.4 * Math.sin(t * 3 + k); E.px.blend(g, 0.25 * glow, 'add', () => E.px.disc(g, lx, ly, 10, '#ff9a4a')); }
  // the floor: a band of boards, lit in the middle
  for (let y = floor; y < H; y++) { const k = (y - floor) / Math.max(1, H - floor); E.px.rect(g, 0, y, W, 1, E.mix(st.floor, st.floorDark, k)); }
  for (let k = -10; k <= 10; k++) { const x0 = sx(200 + k * 36); E.px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.8), H, st.floorDark); }
  E.px.blend(g, 0.15, 'add', () => E.px.ell(g, W / 2, floor + 12, W * 0.45, 9, st.mood === 'night' ? '#ff9a4a' : '#ffe0a0'));
  // crowd silhouettes behind the arena
  if (st.crowd) {
    const n = st.crowd === 'stands' ? 60 : 36;
    for (let i = 0; i < n; i++) {
      const row = i % 3, x = Math.round((sx(-60 + (i * 500 / n)) ) + E.hash2(i, 3) * 6), bob = Math.abs(Math.sin(t * (3 + E.hash2(i, 9) * 2) + i)) * (st.crowd === 'stands' ? 3 : 1);
      const y = floor - 14 - row * 8 - bob, c = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a'][i % 5];
      E.px.rect(g, x - 4, y - 8, 8, 9, c); E.px.disc(g, x, y - 10, 3, '#c8a080');
    }
  }
  E.px.rect(g, 0, floor - 1, W, 1, st.floorDark);
  // the stage's props, set just outside the arena
  // five slots either side of the arena (outside the 0..400 fight), filled from the stage's props in turn: 3-8 props on screen
  const list = (st.props && st.props.length) ? st.props : ['crate'];
  const slots = [-70, -40, 430, 455];
  slots.forEach((x, k) => { const p = list[k % list.length]; r.prop(V.propName[p] || 'crate', x, 16 + (k % 2) * 6, 0, { size: 1.4, light: !!st.lanterns }); });
};
V.propName = { lantern: 'lamp', drum: 'firedrum', crate: 'crate', barrel: 'barrel', cart: 'crate', bamboo: 'pine', toro: 'pillar', torii: 'banner', mast: 'pillar', stall: 'awning', bowl: 'pot', vines: 'vines' };

// ---------------------------------------------------------------- glyphs: PlayStation badges by default, Xbox letters, keycaps, mouse
V.PS = { cross: { c: '#7aa7ff' }, circle: { c: '#ff6a6a' }, square: { c: '#ff8ad8' }, triangle: { c: '#5ad8a0' } };
V.XB = { A: '#3ec260', B: '#e04a3a', X: '#4a8ae8', Y: '#f5c030' };
// KC.glyph(g, x, y, code, size): draws a button glyph. code: 'cross' 'circle' 'square' 'triangle' (PS) | 'A' 'B' 'X' 'Y' (Xbox) | 'stick-u/d/l/r' | 'key:<label>' | 'mouse'
KC.glyph = (g, x, y, code, size = 7) => {
  const P = E.px, h = Math.floor(size / 2);
  if (code && code.startsWith('key:')) {
    const label = code.slice(4), w = Math.max(size + 2, E.font.width(label, { scale: 1 }) + 4);
    P.rect(g, x - w / 2, y - h, w, size, '#d8d4e8'); P.rect(g, x - w / 2, y + h - 1, w, 1, '#8a84a0');
    E.font.text(g, label, x, y - 3, '#1a1420', { align: 'center', outline: false, font: 'tiny' });
    return w;
  }
  if (code === 'mouse') { P.rect(g, x - 3, y - 4, 7, 9, '#d8d4e8'); P.rect(g, x - 3, y - 4, 3, 4, '#ffd060'); return 7; }
  if (code && code.startsWith('stick')) {
    const d = code.slice(6), c = '#d8d4e8';
    P.disc(g, x, y, h, '#2a2636');
    const ax = d === 'l' ? -1 : d === 'r' ? 1 : 0, ay = d === 'u' ? -1 : d === 'd' ? 1 : 0;
    P.disc(g, x + ax * (h - 1), y + ay * (h - 1), 2, c);
    return size;
  }
  const isPS = !!V.PS[code], isXB = !!V.XB[code];
  const col = isPS ? V.PS[code].c : (isXB ? V.XB[code] : '#888');
  P.disc(g, x, y, h, '#15121e'); P.disc(g, x, y, h - 1, col);
  const k = '#15121e';
  if (code === 'cross') { P.line(g, x - 2, y - 2, x + 2, y + 2, k, 1); P.line(g, x + 2, y - 2, x - 2, y + 2, k, 1); }
  else if (code === 'circle') { P.disc(g, x, y, 2, k); P.disc(g, x, y, 1, col); }
  else if (code === 'square') { P.rect(g, x - 2, y - 2, 4, 4, k); }
  else if (code === 'triangle') { P.poly(g, [[x, y - 2], [x + 2, y + 2], [x - 2, y + 2]], k); }
  else if (isXB) { E.font.text(g, code, x, y - 3, '#15121e', { align: 'center', outline: false, font: 'tiny' }); }
  return size;
};
// the prompt for a technique: two icons (a stick and a button, or two keys)
KC.promptFor = (techId, device) => {
  const T = KC.DATA.techniques[techId];
  if (!T) return '';
  return T.jp;
};
// the labels for the technique sticks on this device
KC.stickIcons = () => ({ u: 'triangle', d: 'cross', l: 'square', r: 'circle' });

// ---------------------------------------------------------------- the fight HUD: point slots, the clock, the names, the calls
V.hud = (r, bout, opts) => {
  const g = null;
  r.overlay(gg => {
    const W = r.W, H = r.H;
    // clock
    E.ui.box(gg, W / 2 - 20, 4, 40, 16, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
    E.font.text(gg, String(Math.ceil(bout.clock)), W / 2, 8, bout.clock < 10 ? '#ff7a5a' : '#fff6d0', { align: 'center', outline: '#0b0814' });
    // names and point slots
    const slots = (sc, x0, dir) => {
      const f = sc === 0 ? bout.a : bout.b;
      E.font.text(gg, f.r.short, x0, 4, sc === 0 ? '#ffffff' : '#ffb8a8', { outline: '#0b0814' });
      for (let k = 0; k < KC.TUNE.pointsToWin; k++) {
        const cx = x0 + 4 + k * 12, cy = 22, p = bout.points[sc] - k;
        E.px.disc(gg, cx, cy, 4, '#15121e');
        if (p >= 1) E.px.disc(gg, cx, cy, 3, sc === 0 ? '#fff6e8' : '#ff5a4a');
        else if (p >= 0.5) { E.px.disc(gg, cx, cy, 3, '#2a2636'); E.px.rect(gg, cx - 3, cy - 3, 3, 6, sc === 0 ? '#fff6e8' : '#ff5a4a'); }
      }
      const rw = bout.roundWins[sc];
      for (let k = 0; k < bout.roundsToWin; k++) E.px.rect(gg, x0 + k * 6, 30, 4, 3, k < rw ? '#ffd060' : '#3a3450');
    };
    slots(0, 6, 1);
    const rightX = W - 6 - KC.TUNE.pointsToWin * 12;
    const fb = bout.b; E.font.text(gg, fb.r.short, W - 6, 4, '#ffb8a8', { align: 'right', outline: '#0b0814' });
    for (let k = 0; k < KC.TUNE.pointsToWin; k++) {
      const cx = W - 10 - k * 12, cy = 22, p = bout.points[1] - k;
      E.px.disc(gg, cx, cy, 4, '#15121e');
      if (p >= 1) E.px.disc(gg, cx, cy, 3, '#ff5a4a');
      else if (p >= 0.5) { E.px.disc(gg, cx, cy, 3, '#2a2636'); E.px.rect(gg, cx, cy - 3, 3, 6, '#ff5a4a'); }
    }
    for (let k = 0; k < bout.roundsToWin; k++) E.px.rect(gg, W - 10 - k * 6, 30, 4, 3, k < bout.roundWins[1] ? '#ffd060' : '#3a3450');
    // the call (the referee's words), in the title font
    const c = bout.lastCall;
    if (c && bout.phase !== 'fight' && c.text && bout.steps - c.step < 240) {
      const y = H * 0.2;
      E.font.title(gg, c.text, W / 2, y, { scale: 2, colors: ['#fffbe8', '#ffe08a', '#e8782a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
      if (c.sub) E.font.text(gg, c.sub, W / 2, y + 26, '#ffd060', { align: 'center', outline: '#0b0814' });
    }
    if (opts && opts.bottom) E.font.text(gg, opts.bottom, W / 2, H - 14, '#fff6d0', { align: 'center', outline: '#0b0814' });
    if (opts && opts.popup && opts.popup.t > 0) {
      const p = opts.popup;
      E.font.text(gg, p.text, p.x, p.y, p.color || '#ffe070', { align: 'center', outline: '#0b0814', scale: 1 });
    }
  });
};
// the point popup: a short floating text over the scorer
V.popupFor = (lp) => ({ t: 1, x: 0, y: 0, text: (lp.full ? 'FULL' : 'HALF') + ' · ' + KC.DATA.techniques[lp.tech].name + ' ' + lp.pts, color: lp.full ? '#ffe070' : '#ffffff' });
// the fight scene draws its fighters through this: the rigs were posed in the step (V.applyPose), so this only draws
V.drawFighters = (r, fighters, rigs) => {
  for (const f of fighters) {
    const rig = rigs[f.side];
    r.shadow(f.x, 0, 14, 0.5, '#0c0818', 0);
    r.actor(f.x, 0, f.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
};
