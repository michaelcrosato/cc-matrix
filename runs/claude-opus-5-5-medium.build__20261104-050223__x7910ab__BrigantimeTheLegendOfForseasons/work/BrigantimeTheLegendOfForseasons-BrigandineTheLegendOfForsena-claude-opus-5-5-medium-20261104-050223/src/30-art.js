/* ---- ART: palettes, sigils, custom shapes, the unit visual factory, the hex battlefield and the world map ---- */
G.art = {};
const H = c => E.hex(c), MIXC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
G.PAL = {
  spring: { grass: H('#6abf4b'), grass2: H('#9ad86a'), dark: H('#3f8a35'), blossom: H('#f4b8d0'), sky: ['#7ab8e8', '#a8d8f0', '#e0f0e8'], water: H('#4a9ad8'), dirt: H('#a08050'), ambient: .8, light: '#e0ffd0' },
  summer: { grass: H('#c8b060'), grass2: H('#e8d080'), dark: H('#9a8040'), blossom: H('#f0c040'), sky: ['#e0b860', '#f0d890', '#fff0c8'], water: H('#3a8ac8'), dirt: H('#c89a58'), ambient: .95, light: '#fff0c0' },
  autumn: { grass: H('#b8883a'), grass2: H('#d8a050'), dark: H('#7a5a2a'), blossom: H('#c84a1a'), sky: ['#a86a48', '#e8b878', '#f8e0b0'], water: H('#3a7aa0'), dirt: H('#8a6040'), ambient: .72, light: '#ffc890' },
  winter: { grass: H('#e8f0f8'), grass2: H('#ffffff'), dark: H('#8aa8c8'), blossom: H('#c8e8ff'), sky: ['#7a90b8', '#b8c8e0', '#e8f0f8'], water: H('#3a6a98'), dirt: H('#9aa8b8'), ambient: .66, light: '#c8e0ff' },
  hour: { grass: H('#5a5a68'), grass2: H('#6a6a78'), dark: H('#3a3a46'), blossom: H('#d8c070'), sky: ['#14121c', '#2a2838', '#4a4658'], water: H('#2a3a58'), dirt: H('#4a4650'), ambient: .5, light: '#f0e0a0' }
};
G.realmColor = r => G.has('realm', r) ? G.get('realm', r).main : '#a0a0a0';
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- sigils and icons drawn with px (the 5×7 font lacks them) ---- */
G.art.sigil = (g, kind, x, y, s, c, c2) => {
  x = Math.round(x); y = Math.round(y);
  switch (kind) {
    case 'blossom': for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; px.disc(g, x + Math.cos(a) * s * .45, y + Math.sin(a) * s * .45, s * .3, c); } px.disc(g, x, y, s * .2, c2); break;
    case 'sun': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, x, y, x + Math.cos(a) * s * .8, y + Math.sin(a) * s * .8, c, 1); } px.disc(g, x, y, s * .42, c); px.disc(g, x, y, s * .22, c2); break;
    case 'leaf': px.poly(g, [[x, y - s * .8], [x + s * .5, y - s * .1], [x + s * .2, y + s * .6], [x, y + s * .4], [x - s * .2, y + s * .6], [x - s * .5, y - s * .1]], c); px.line(g, x, y - s * .5, x, y + s * .7, c2, 1); break;
    case 'snowflake': for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; px.line(g, x - Math.cos(a) * s * .8, y - Math.sin(a) * s * .8, x + Math.cos(a) * s * .8, y + Math.sin(a) * s * .8, c, 1); } px.disc(g, x, y, s * .2, c2); break;
    case 'hourglass': px.poly(g, [[x - s * .5, y - s * .7], [x + s * .5, y - s * .7], [x, y], [x + s * .5, y + s * .7], [x - s * .5, y + s * .7], [x, y]], c); px.line(g, x - s * .6, y - s * .75, x + s * .6, y - s * .75, c2, 1); px.line(g, x - s * .6, y + s * .75, x + s * .6, y + s * .75, c2, 1); break;
    case 'axes': px.line(g, x - s * .6, y + s * .6, x + s * .6, y - s * .6, c2, 1); px.line(g, x + s * .6, y + s * .6, x - s * .6, y - s * .6, c2, 1); px.disc(g, x + s * .5, y - s * .5, s * .28, c); px.disc(g, x - s * .5, y - s * .5, s * .28, c); break;
    default: px.disc(g, x, y, s * .5, c);
  }
};
G.art.banner = (g, realm, x, y, s = 1, seatColor) => {   // a little banner with the realm's shape and sigil (side tags: never colour alone)
  const R = G.has('realm', realm) ? G.get('realm', realm) : { main: '#888', trim: '#222', sigil: 'disc', banner: 'square' };
  const w = Math.round(9 * s), h = Math.round(11 * s), main = seatColor || R.main;
  px.line(g, x, y - 2, x, y + h + 3, '#3a2a1a', 1);
  let pts;
  switch (R.banner) { case 'swallowtail': pts = [[x, y], [x + w, y], [x + w * .65, y + h * .5], [x + w, y + h], [x, y + h]]; break; case 'pointed': pts = [[x, y], [x + w, y], [x + w, y + h * .7], [x + w / 2, y + h], [x, y + h * .7]]; break;
    case 'triangle': pts = [[x, y], [x + w, y + h * .45], [x, y + h]]; break; case 'long': pts = [[x, y], [x + w * .8, y], [x + w * .8, y + h * 1.3], [x + w * .4, y + h * 1.1], [x, y + h * 1.3]]; break;
    case 'ragged': pts = [[x, y], [x + w, y], [x + w, y + h * .8], [x + w * .75, y + h], [x + w * .5, y + h * .75], [x + w * .25, y + h], [x, y + h * .85]]; break; default: pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  px.poly(g, pts.map(p => [p[0] + 1, p[1] + 1]), '#140c14'); px.poly(g, pts, main); px.line(g, x + 1, y + 1, x + w - 1, y + 1, E.shade(main, .3), 1);
  G.art.sigil(g, R.sigil, x + w * .45, y + h * .45, s * 4, R.trim, main);
};
G.art.seasonIcon = (g, season, x, y, s = 4) => {
  const c = G.SEASON_COLOR[season] || '#ccc';
  if (season === 'spring') G.art.sigil(g, 'blossom', x, y, s * 1.8, c, '#fff0a0');
  else if (season === 'summer') G.art.sigil(g, 'sun', x, y, s * 1.8, c, '#fff8d0');
  else if (season === 'autumn') G.art.sigil(g, 'leaf', x, y, s * 1.8, c, '#5a3a1a');
  else if (season === 'winter') G.art.sigil(g, 'snowflake', x, y, s * 1.8, c, '#ffffff');
  else G.art.sigil(g, 'hourglass', x, y, s * 1.6, c, '#f0e8d8');
};
G.art.manaIcon = (g, x, y) => { px.poly(g, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], '#7ac8ff'); px.dot(g, x - 1, y - 1, '#ffffff'); };
G.art.candle = (g, x, y, n, max) => {
  const h = Math.max(2, Math.round(18 * (max ? n / max : 1)));
  px.rect(g, x - 3, y + 20 - h, 6, h, '#e8e0d0'); px.rect(g, x - 3, y + 20 - h, 2, h, '#fff8e8'); px.rect(g, x - 4, y + 20, 8, 2, '#8a7050');
  if (n > 0) { const f = Math.sin(Date.now() / 90) > 0 ? 1 : 0; px.disc(g, x, y + 17 - h, 2 + f, '#ffb030'); px.dot(g, x, y + 16 - h, '#fff0a0'); }
};
G.art.effectIcon = (g, eff, x, y) => {   // distinct shapes, not colour alone
  const c = G.get('effect', eff).color;
  px.rect(g, x - 3, y - 3, 7, 7, '#140c14');
  switch (eff) {
    case 'poison': px.disc(g, x, y + 1, 2, c); px.dot(g, x, y - 2, c); break;
    case 'burn': px.poly(g, [[x, y - 3], [x + 2, y + 2], [x - 2, y + 2]], c); break;
    case 'chill': px.line(g, x - 2, y, x + 2, y, c); px.line(g, x, y - 2, x, y + 2, c); px.dot(g, x - 2, y - 2, c); px.dot(g, x + 2, y + 2, c); break;
    case 'sleep': px.line(g, x - 2, y - 2, x + 2, y - 2, c); px.line(g, x + 2, y - 2, x - 2, y + 2, c); px.line(g, x - 2, y + 2, x + 2, y + 2, c); break;
    case 'stop': px.disc(g, x, y, 3, c); px.line(g, x, y, x, y - 2, '#140c14'); px.line(g, x, y, x + 2, y, '#140c14'); break;
    case 'valor': px.poly(g, [[x - 2, y + 1], [x, y - 2], [x + 2, y + 1]], c); px.poly(g, [[x - 2, y + 3], [x, y], [x + 2, y + 3]], c); break;
    case 'haste': for (let i = -2; i <= 2; i += 2) px.line(g, x - 2, y + i, x + 2, y + i, c); break;
    case 'warded': case 'guarded': case 'frostarmor': px.poly(g, [[x - 2, y - 2], [x + 2, y - 2], [x + 2, y], [x, y + 3], [x - 2, y]], c); break;
    case 'weakened': px.poly(g, [[x - 2, y - 1], [x, y + 2], [x + 2, y - 1]], c); break;
    case 'exposed': px.rect(g, x - 2, y - 2, 5, 5, c); px.rect(g, x - 1, y - 1, 3, 3, '#140c14'); break;
    default: px.disc(g, x, y, 2, c);
  }
};

/* ---- custom shapes: castles in six styles, the keep, raised hex blocks, gears, cottages, the clock tower ---- */
const castleShape = (wall, roof, accent, o = {}) => ({ about: 'castle', tags: 'castle', mats: { w: wall + ' stones', r: roof + ' shingles', a: accent + ' glaze', d: '#3a2a20 planks' },
  parts: [['box', 'w', [0, 0, 0], [30, 22, 14]], ['mirror', 'x', ['cyl', 'w', [14, 9, 0], 5, 22]], ['mirror', 'x', ['cyl', 'r', [14, 9, 22], 6, 8, { r2: 0 }]], ['cyl', 'w', [0, -4, 0], 7, 30], ['cyl', 'r', [0, -4, 30], 8, 11, { r2: 0, seg: o.seg || 8 }], ['box', 'd', [0, 11, 0], [6, 1, 8]], ['row', 4, [7, 0, 0], ['box', 'w', [0, 11, 14], [3, 1, 3]]]].concat(o.extra || []) });
E.SHAPES['bt-castle-winter'] = castleShape('#8a90a0', '#3a5a8a', '#c8f0ff', { extra: [['mirror', 'x', ['cyl', 'a', [14, 9, 18], 1, 4, { r2: 0 }]]] });
E.SHAPES['bt-castle-spring'] = castleShape('#e8e4d8', '#4a9a4a', '#f4b8d0', { extra: [['mirror', 'x', ['ball', 'a', [10, 12, 4], 3]]] });
E.SHAPES['bt-castle-summer'] = castleShape('#d8b880', '#b03a2a', '#f0c040', { seg: 12, extra: [['ball', 'a', [0, -4, 41], 3]] });
E.SHAPES['bt-castle-autumn'] = castleShape('#8a6a4a', '#c87a2a', '#e0a040', { extra: [['mirror', 'x', ['cyl', 'a', [8, 13, 0], 2, 3]]] });
E.SHAPES['bt-castle-hour'] = castleShape('#3a3a46', '#d8c070', '#f0e8d8', { extra: [['cyl', 'a', [0, 3.5, 22], 4, 1, { sq: .2 }]] });
E.SHAPES['bt-castle-brigand'] = { about: 'brigand palisade camp', tags: 'castle', mats: { p: '#6a4a2a planks', t: '#a89070 cloth', f: '#5a4030 bark' },
  parts: [['ring', 14, 15, ['cyl', 'f', [0, 0, 0], 1.6, 12, { r2: .4 }]], ['cyl', 't', [-4, -2, 0], 7, 12, { r2: 0, seg: 6 }], ['cyl', 't', [6, 3, 0], 5, 9, { r2: 0, seg: 6 }], ['box', 'p', [0, 12, 0], [6, 2, 6]]] };
E.SHAPES['bt-keep'] = { about: 'a round keep tower', tags: 'castle', mats: { w: '#8a8478 stones', r: '#5a3a3a shingles' },
  parts: [['cyl', 'w', [0, 0, 0], 8, 26], ['ring', 6, 8, ['box', 'w', [0, 0, 26], [3, 3, 4]]], ['cyl', 'r', [0, 0, 26], 6, 10, { r2: 0 }]] };
E.SHAPES['bt-hexblock'] = { about: 'raised rampart hex', tags: 'wall', mats: { w: '#8a8478 stones' }, parts: [['cyl', 'w', [0, 0, 0], 16.2, 22, { seg: 6 }], ['ring', 6, 13, ['box', 'w', [0, 0, 22], [5, 4, 4]]]] };
E.SHAPES['bt-gear'] = { about: 'a brass gear block', tags: 'wall', mats: { b: '#b89848 metal', d: '#5a4a2a metal' }, parts: [['cyl', 'd', [0, 0, 0], 15, 16, { seg: 6 }], ['cyl', 'b', [0, 0, 16], 13, 4], ['ring', 10, 13, ['box', 'b', [0, 0, 16], [4, 4, 4]]], ['cyl', 'd', [0, 0, 20], 4, 2]] };
E.SHAPES['bt-cliff'] = { about: 'rock face', tags: 'rock', mats: { r: '#7a7070 stones' }, parts: [['rock', 'r', [0, 0, 0], 15, { sz: 1.4, seed: 3, rough: .4 }]] };
E.SHAPES['bt-cottage'] = { about: 'a cottage', tags: 'house', mats: { w: '#d8c8a8 noise', r: '#8a4a2a shingles', d: '#4a3020 planks' }, parts: [['box', 'w', [0, 0, 0], [20, 16, 12]], ['prism', 'r', [0, 0, 12], [[-11, 0], [11, 0], [0, 9]], 18, { axis: 'y' }], ['box', 'd', [0, 8, 0], [5, 1, 8]]] };
E.SHAPES['bt-clocktower'] = { about: "Meridian's great clock tower", tags: 'tower', mats: { w: '#4a4658 stones', b: '#d8c070 metal', f: '#f0e8d8 glaze' },
  parts: [['box', 'w', [0, 0, 0], [26, 26, 20]], ['box', 'w', [0, 0, 20], [18, 18, 50]], ['box', 'f', [0, 9.5, 52], [14, 1, 14]], ['cyl', 'b', [0, 0, 70], 12, 18, { r2: 0, seg: 4 }], ['mirror', 'x', ['cyl', 'w', [11, 11, 0], 4, 40]]] };
E.SHAPES['bt-dial'] = { about: 'a season dial', tags: 'floor', mats: { b: '#b89848 metal' }, parts: [['cyl', 'b', [0, 0, 0], 9, 2]] };
E.SHAPES['bt-mill'] = { about: 'a watermill', tags: 'house', mats: { w: '#c8b898 noise', r: '#6a4a2a shingles', k: '#5a4030 planks' }, parts: [['box', 'w', [0, 0, 0], [16, 14, 12]], ['prism', 'r', [0, 0, 12], [[-9, 0], [9, 0], [0, 7]], 16, { axis: 'y' }], ['cyl', 'k', [9, 0, 6], 6, 2, { rot: [0, 90, 0] }]] };

/* ---- the unit visual factory: one object per unit with the Humanoid's interface ---- */
G.art.visual = spec => new UnitVisual(spec);
class UnitVisual {
  // spec: { kind: 'knight' | 'monster', id (knight id) | sp + tier, side colour }
  constructor(spec) {
    this.spec = spec; this.t = 0; this.attack = null; this.anim = null; this.flash = 0; this.pose = null; this.down = 0; this.alpha = 1; this.tint = null;
    if (spec.kind === 'knight') { const d = G.get('knight', spec.id); this.mode = 'hum'; this.rig = new E.Humanoid(Object.assign({}, d.look, { size: d.look.size * (spec.scale || .8) })); this.bow = d.bow || G.get('class', spec.cls || d.cls).basic.bow; this.whip = d.whip; this.height = 34 * d.look.size * (spec.scale || .8); this.halo = d.halo; }
    else {
      const m = G.get('monster', spec.sp), tier = spec.tier || 1, rg = m.rig, tk = [1, 1.15, 1.3][tier - 1], sz = { S: .75, M: 1, L: 1.45 }[m.sizes[tier - 1]];
      this.rg = rg; this.tier = tier; this.sp = spec.sp;
      if (rg.kind === 'blob') { this.mode = 'blob'; this.rig = new E.Blob(Object.assign({ R: rg.R * tk * sz / .85 }, { colors: rg.colors, ears: rg.ears, wings: rg.wings, feet: rg.feet, tail: rg.tail, mouth: rg.mouth, horns: tier >= 3 && rg.over === 'slime' })); this.height = rg.R * 2.2 * tk * sz + (rg.float || rg.fly ? 6 : 0); }
      else if (rg.kind === 'hum') { this.mode = 'hum'; this.rig = new E.Humanoid(Object.assign({}, rg.look, { size: rg.look.size * tk * .85, colors: Object.assign({}, rg.look.colors) })); this.height = 34 * rg.look.size * tk * .85; if (rg.wings) this.wings = new E.Wings(this.rig, { kind: rg.wings, color: rg.wingColor || '#f0d8ff' }); }
      else { this.mode = 'beast'; this.rig = new E.Beast({ body: rg.body, preset: rg.preset, legs2: rg.legs2 || (rg.body === 'drake' && tier === 1 && spec.sp === 'wyvern'), scale: sz * tk * .9, tier, colors: rg.colors, parts: Object.assign({}, rg.parts, { wings: rg.parts.wings && (!rg.parts.wingsFrom || tier >= rg.parts.wingsFrom) ? rg.parts.wings : 'none' }) }); this.height = this.rig.height; }
    }
  }
  get facing() { return this._f || 0; }
  // play an action: 'attack' (with move name), 'cast', 'hurt', 'cheer', 'die', 'kneel', 'down'
  act(kind, o = {}) {
    this.anim = { kind, t: 0, dur: o.dur || (kind === 'die' ? 1 : .6), move: o.move };
    if (kind === 'attack' && this.mode === 'hum') { try { this.swing = new E.Attack(o.move || 'slash'); this.swing.start(); } catch (e) { this.swing = new E.Attack('slash'); this.swing.start(); } }
    if (kind === 'hurt') this.flash = .25;
    if (kind === 'attack' && this.mode === 'blob') this.rig.kick(.5);
  }
  update(dt, st) {
    this.t += dt; this._f = st.facing; this.flash = Math.max(0, this.flash - dt);
    const a = this.anim; if (a) { a.t += dt; if (a.t > a.dur && a.kind !== 'die' && a.kind !== 'down' && a.kind !== 'kneel') this.anim = null; }
    const k = a ? Math.min(1, a.t / a.dur) : 0;
    if (this.mode === 'hum') {
      if (this.swing) { this.swing.update(dt); if (!this.swing.phase) this.swing = null; }
      const pose = st.pose || (a && a.kind === 'cast' ? 'cast' : a && a.kind === 'cheer' ? 'cheer' : a && a.kind === 'die' ? 'die' : a && a.kind === 'kneel' ? 'kneel' : a && a.kind === 'down' ? 'down' : a && a.kind === 'guard' ? 'block' : null);
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z + (this.rg && this.rg.float ? 6 + Math.sin(this.t * 2) : 0), vx: st.vx || 0, vy: st.vy || 0, facing: st.facing, attack: this.swing ? this.swing.state : null, pose, expr: st.expr || (a && a.kind === 'hurt' ? 'wince' : null), hurt: a && a.kind === 'hurt' ? (1 - k) : 0, down: st.sleep ? .3 : 0 });
      if (this.wings) this.wings.update(dt);
    } else if (this.mode === 'blob') {
      this.rig.update(dt, { squash: a && a.kind === 'attack' ? Math.sin(k * Math.PI) * .35 : a && a.kind === 'hurt' ? -.3 * (1 - k) : Math.sin(this.t * 3) * .06, look: [Math.cos(st.facing), Math.sin(st.facing)], walk: Math.min(1, Math.hypot(st.vx || 0, st.vy || 0) / 30), flap: this.rg.wings ? 1 : 0, squint: !!st.sleep });
    } else {
      const kindMap = { attack: o => o || 'bite', cast: () => 'roar', hurt: null, cheer: () => 'roar' };
      const att = a && (a.kind === 'attack' || a.kind === 'cast' || a.kind === 'cheer') ? { kind: a.kind === 'attack' ? (a.move || 'bite') : 'roar', u: k } : null;
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z, vx: st.vx || 0, vy: st.vy || 0, facing: st.facing, attack: att, hurt: this.flash, sleep: !!st.sleep, down: a && a.kind === 'die' ? k : 0 });
    }
    this.x = st.x; this.y = st.y; this.z = st.z;
  }
  draw(g, ox, oy, view) {
    if (this.mode === 'hum') {
      if (this.wings) this.wings.draw(g, ox, oy, view, false);
      if (this.halo) { const t = this.t; for (let i = 0; i < 12; i++) { const a = t * .5 + i * Math.PI / 6, [hx, hy] = view.p(Math.cos(a) * 9, Math.sin(a) * 9, this.height + 2); px.dot(g, ox + hx, oy + hy, i % 3 ? '#8a8a92' : '#f0f0f0'); } }
      this.rig.draw(g, ox, oy, view);
      if (this.wings) this.wings.draw(g, ox, oy, view, true);
      if (this.bow) this.drawBow(g, ox, oy, view);
      if (this.rg && this.rg.tool) this.drawTool(g, ox, oy, view);
      if (this.rg && this.rg.clockFace) { const [hx, hy] = view.p(0, 0, this.height * .9); px.disc(g, ox + hx, oy + hy, 4, '#f0e8d0'); px.line(g, ox + hx, oy + hy, ox + hx + Math.cos(this.t * 2) * 3, oy + hy + Math.sin(this.t * 2) * 3, '#2a2010'); px.line(g, ox + hx, oy + hy, ox + hx, oy + hy - 2, '#2a2010'); }
      if (this.rg && this.rg.halo === 'gear') for (let i = 0; i < 8; i++) { const a = this.t + i * Math.PI / 4, [hx, hy] = view.p(Math.cos(a) * 6, Math.sin(a) * 6, this.height + 3); px.dot(g, ox + hx, oy + hy, '#e8c860'); }
    } else if (this.mode === 'blob') {
      const fl = this.rg.float || this.rg.fly ? 5 + Math.sin(this.t * 2.5) * 1.5 : 0, [fx, fy] = view.p(0, 0, fl);
      this.rig.draw(g, ox + fx, oy + fy, view);
      this.drawBlobOverlay(g, ox + fx, oy + fy, view);
    } else this.rig.draw(g, ox, oy, view);
  }
  drawBow(g, ox, oy, view) { try { const [hx, hy, hz] = this.rig.hand('L'), [p, q] = view.p(hx - this.x, hy - this.y, hz - this.z), x = Math.round(ox + p), y = Math.round(oy + q); for (let i = -6; i <= 6; i++) px.dot(g, x + Math.round(2.4 * Math.cos(i / 6 * 1.2)) - 2, y + i, i % 3 ? '#8a5a2a' : '#5a3a1a'); px.line(g, x - 1, y - 6, x - 1, y + 6, '#e8e0d0'); } catch (e) { /* the rig's hands are not posed yet */ } }
  drawTool(g, ox, oy, view) {
    try { const [hx, hy, hz] = this.rig.hand('R'), [p, q] = view.p(hx - this.x, hy - this.y, hz - this.z), x = Math.round(ox + p), y = Math.round(oy + q);
      if (this.rg.tool === 'scythe') { px.line(g, x, y + 6, x, y - 12, '#6a4a2a', 1); px.poly(g, [[x, y - 12], [x + 8, y - 9], [x + 1, y - 10]], '#d8d8e0'); }
      else { px.line(g, x, y, x + 2, y - 9, '#6a4a2a', 2); px.disc(g, x + 2, y - 10, 2.5, '#5a3a1a'); } } catch (e) { /* the rig's hands are not posed yet */ }
  }
  drawBlobOverlay(g, ox, oy, view) {
    const R = this.rig.o.R * view.scale, [cx0, cy0] = view.p(0, 0, this.rig.o.R), cx = ox + cx0, cy = oy + cy0, t = this.t, ov = this.rg.over;
    if (ov === 'leaf') { px.poly(g, [[cx, cy - R], [cx - R * .6, cy - R * 1.5], [cx - R * .1, cy - R * 1.1]], '#4aa040'); px.poly(g, [[cx, cy - R], [cx + R * .6, cy - R * 1.5], [cx + R * .1, cy - R * 1.1]], '#6ac050'); if (this.tier >= 3) px.disc(g, cx, cy - R * 1.4, 2, '#f4b8d0'); }
    if (ov === 'pumpkin') { for (const k of [-.45, .45]) px.line(g, cx + R * k, cy - R * .8, cx + R * k, cy + R * .7, '#a04a10'); px.poly(g, [[cx - 3, cy - 1], [cx - 1, cy - 1], [cx - 2, cy - 3]], '#ffe040'); px.poly(g, [[cx + 1, cy - 1], [cx + 3, cy - 1], [cx + 2, cy - 3]], '#ffe040'); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, '#ffe040'); const f = Math.sin(t * 12) > 0; px.disc(g, cx, cy - R - 2, f ? 2 : 1.5, '#ffb020'); px.dot(g, cx, cy - R - 3, '#fff0a0'); }
    if (ov === 'frost') { for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; px.dot(g, cx + Math.cos(a) * R * 1.2, cy + Math.sin(a) * R * .6 - R * .3, '#ffffff'); } if (this.tier >= 3) px.blend(g, .5, 'add', () => px.disc(g, cx, cy, R * 1.3, '#60ffd0')); }
    if (ov === 'clock') { px.disc(g, cx, cy, R * .6, '#f0e8d0'); px.line(g, cx, cy, cx + Math.cos(t * 3) * R * .5, cy + Math.sin(t * 3) * R * .5, '#2a2010'); px.line(g, cx, cy, cx + Math.cos(t * .3) * R * .35, cy + Math.sin(t * .3) * R * .35, '#2a2010'); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.09; px.disc(g, cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * .5, 1.5, '#d8b050'); } }
    if (ov === 'slime') px.dot(g, cx - R * .4, cy - R * .5, '#ffffff');
    if (this.tier >= 2 && (ov === 'slime' || ov === 'leaf' || ov === 'pumpkin' || this.rg.wings)) { px.poly(g, [[cx - 3, cy - R - 1], [cx - 3, cy - R - 4], [cx - 1, cy - R - 2], [cx, cy - R - 5], [cx + 1, cy - R - 2], [cx + 3, cy - R - 4], [cx + 3, cy - R - 1]], '#f0c040'); }
  }
  portrait(g, x, y, size, o = {}) {
    if (this.mode === 'hum') this.rig.drawPortrait(g, x, y, size, Object.assign({ bg: '#1a1624' }, o));
    else if (this.mode === 'beast') this.rig.drawPortrait(g, x, y, size, { bg: o.bg || '#1a1624' });
    else { px.rect(g, x, y, size, size, o.bg || '#1a1624'); const v = E.VIEWS.brawler; this.rig.draw(g, x + size / 2, y + size * .78, v); this.drawBlobOverlay(g, x + size / 2, y + size * .78, v); }
  }
}
G.UnitVisual = UnitVisual;
