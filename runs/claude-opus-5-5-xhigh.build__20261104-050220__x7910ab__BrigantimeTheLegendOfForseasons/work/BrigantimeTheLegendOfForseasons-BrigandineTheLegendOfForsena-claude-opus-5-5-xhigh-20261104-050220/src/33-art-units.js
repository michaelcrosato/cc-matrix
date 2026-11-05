// THE UNIT VISUAL FACTORY: one Vis per unit, wrapping a Humanoid (knights and humanoid monsters), a Blob (sproutlings,
// lamps, snowkits, minutes, slimes, bats) or an E.Beast, with the species' overlays, carried tools drawn from the rig's
// hands (bows, whips, scythes, clubs), wings, halos and portraits. Each class line has its own moves (no two classes
// share a swing). vis.update(dt, st) with { x, y, z, vx, vy, facing, act: { move, k } | null, pose, expr, hurt, down,
// sleep, tint }; vis.draw(g, ox, oy, view) inside r.actor; vis.portrait(g, x, y, size, o).

const { px: P2, tones: TN, lerp: LRP } = E;
const SIZE_SCALE = { S: .72, M: 1, L: 1.45 };
/** helmets in the look's own plate colour, crowns in gold (a bare 'helmet' or 'crown' takes the engine's default) */
const dressHat = look => {
  const c = look.colors || {};
  if (look.hat === 'helmet') look.hat = { style: 'helmet', color: c.plate || c.metal || '#8a8a96' };
  else if (look.hat === 'crown') look.hat = { style: 'crown', color: c.trim && c.trim !== '#ffffff' ? c.trim : '#e8c040' };
  return look;
};
const FORM_UP = [1, 1.08, 1.18];

/** the move names a unit uses: basic attack and how it reacts */
G.MOVESET = {
  warrior: { basic: 'slash', charge: 'thrust', holystrike: 'overhead', special: 'thrust' },
  ranger: { basic: 'throw', special: 'throw' }, mage: { basic: 'overhead', special: 'cast' }, cleric: { basic: 'rising', special: 'cast' },
  beast: { basic: 'backslash', special: 'backslash' }, springwarden: { basic: 'slash', special: 'rising' }, sunsovereign: { basic: 'twohand', special: 'spin' },
  harvestking: { basic: 'overhead', special: 'cast' }, rimeduke: { basic: 'spin', special: 'spin' }, chancellor: { basic: 'cast', special: 'cast' },
  graynight: { basic: 'plunge', special: 'twohand', alt: 'spin' }, brigand: { basic: 'overhead', special: 'thrust' }, hourmaiden: { basic: 'rising', special: 'cast' },
  monster: { basic: 'claw', special: 'bash' }
};
const BEAST_ANIM = { bite: 'bite', claw: 'claw', gore: 'gore', breath: 'breath', tailsweep: 'tailsweep', roar: 'roar', pounce: 'pounce', dive: 'dive', coil: 'coil', stomp: 'stomp', slash: 'claw', cast: 'roar', throw: 'roar', puff: 'roar', cheer: 'roar', hips: 'roar', wave: 'roar', block: 'roar', thrust: 'gore', overhead: 'claw', spin: 'tailsweep', backslash: 'claw', rising: 'claw', twohand: 'claw', plunge: 'pounce' };

class Vis {
  /** spec: a field unit ({ kind, ref, sp, form, cls, size, elem, ... }) or { knight: id } / { sp, form } */
  constructor(u) {
    this.u = u; this.kind = 'humanoid'; this.t = 0; this.size = u.size || 'M'; this.float = 0; this.alpha = 1;
    if (u.kind === 'knight' || u.knight) this._knight(u.ref || u.knight, u.cls);
    else this._monster(u.sp, u.form || 1);
    this.state = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
  }
  _knight(id, cls) {
    const d = G.has('knight', id) ? G.get('knight', id) : null, look = Object.assign({ size: 1.2, build: 'heroic' }, d ? d.look : { outfit: 'tunic', hair: 'short' });
    const c = G.get('class', cls || (d && d.cls) || 'squire');
    this.line = c.line === 'ruler' || c.line === 'unique' || c.line === 'boss' ? c.id : c.line;
    const rl = dressHat(Object.assign({}, look)); delete rl.bow; delete rl.whip; delete rl.halo;
    if (look.bow) rl.weapon = null;
    this.rig = new E.Humanoid(rl); this.kind = 'humanoid';
    this.tool = look.bow ? 'bow' : look.whip ? 'whip' : null; this.halo = look.halo || null; this.size = 'M';
    this.height = 26 * (look.size || 1.2);
    this.moves = G.MOVESET[this.line] || G.MOVESET.warrior;
    this.voice = 'knight'; this.knightId = id;
  }
  _monster(sp, form) {
    const m = G.get('monster', sp), rig = m.rig, i = form - 1, sc = SIZE_SCALE[m.size[i]] || 1;
    this.sp = sp; this.form = form; this.size = m.size[i]; this.elem = m.elem; this.moves = G.MOVESET.monster;
    if (rig.kind === 'humanoid') {
      const look = dressHat(Object.assign({ size: rig.size[i], build: rig.build, hunch: rig.hunch || 0 }, rig.look[i]));
      this.rig = new E.Humanoid(look); this.kind = 'humanoid'; this.height = 26 * rig.size[i];
      this.tool = rig.tool || null; this.wings = rig.wings ? new E.Wings({ kind: rig.wings, span: rig.wings === 'insect' ? 7 : 12, colors: rig.wings === 'insect' ? { a: '#f0ffff', b: '#c0f0e0' } : { a: '#c8a878', b: rig.look[i].colors.hair || '#7a5a3a' } }) : null;
      this.glow = rig.glow || null; this.alpha = rig.alpha || 1; this.float = rig.float || (rig.wings === 'insect' ? 5 : 0); this.halo = rig.halo || null; this.clockHead = !!rig.clockHead;
      this.moves = { basic: sp === 'scarecrow' ? 'overhead' : sp === 'skeleton' || sp === 'clockwork' ? 'slash' : sp === 'pixie' ? 'cast' : 'haymaker', special: 'cast' };
    } else if (rig.kind === 'blob') {
      const C = rig.colors[i];
      this.rig = new E.Blob({ R: rig.R[i] * (sp === 'bat' ? 1 : 1), colors: C, ears: rig.ears || (sp === 'sproutling' ? null : null), wings: !!rig.wings, mouth: rig.mouth || true, feet: !rig.float && sp !== 'slime', tail: false, face: 'front' });
      this.kind = 'blob'; this.over = rig.over; this.float = rig.float ? 6 : 0; this.alpha = rig.alpha || 1; this.height = rig.R[i] * 2.4 + this.float;
    } else {
      const parts = rig.parts[i], C = rig.colors[i], base = E.Beast.PRESETS[rig.preset];
      const big = (base.kind === 'drake' ? 1.1 : base.kind === 'serpent' ? 1 : 1) * (rig.preset === 'lizard' ? .9 : 1) * FORM_UP[i];
      this.rig = new E.Beast({ preset: rig.preset, size: sc * big * (rig.preset === 'horse' ? .85 : rig.preset === 'avian' ? 1.05 : 1), colors: C, parts: Object.assign({}, parts, { legs4: parts.legs4 }), flier: G.monsterFlags(sp, form).flier });
      this.kind = 'beast'; this.height = (base.h + base.head) * sc * big + (this.rig.flying ? 8 : 0);
    }
    if (this.size === 'L' && this.kind !== 'beast') this.height = Math.max(this.height, 40);
  }
  /** a field attack for the rig: name (a move or a beast action), k 0..1 */
  _attack(name, k) {
    if (this.kind === 'beast') return { kind: BEAST_ANIM[name] || 'bite', u: k };
    if (this.kind === 'blob') return null;
    if (!E.MOVES[name]) return null;
    const ph = k < .35 ? 'wind' : k < .55 ? 'active' : 'recover', u = k < .35 ? k / .35 : k < .55 ? (k - .35) / .2 : (k - .55) / .45;
    return E.move(name, u, ph);
  }
  update(dt, st) {
    this.t += dt; this.state = st;
    const act = st.act, k = act ? act.k : 0;
    const pose = st.sleep ? (this.kind === 'humanoid' ? 'down' : 'sleep') : st.dead ? 'die' : st.pose || null;
    const z = (st.z || 0) + (this.float ? this.float + Math.sin(this.t * 3) * 1.2 : 0);
    if (this.kind === 'humanoid') {
      const isPose = act && ['cast', 'cheer', 'block', 'guard', 'wave', 'hips', 'kneel'].includes(act.move);
      this.rig.update(dt, { x: st.x, y: st.y, z, vx: st.vx, vy: st.vy, facing: st.facing, attack: act && !isPose ? this._attack(act.move, k) : null, pose: isPose ? act.move : pose === 'die' ? 'die' : pose === 'down' ? 'down' : st.guard ? 'guard' : st.kneel ? 'kneel' : pose, expr: st.expr || (st.hurt > .1 ? 'wince' : act && act.move === 'hips' ? 'shout' : null), hurt: st.hurt || 0, down: st.sleep ? .3 : 0 });
      if (this.wings) this.wings.update(dt, { moving: Math.hypot(st.vx, st.vy) > 2 });
    } else if (this.kind === 'blob') {
      const sq = act ? (k < .35 ? -.3 * k / .35 : k < .55 ? .35 : .35 * (1 - (k - .55) / .45)) : st.hurt ? -.3 : Math.sin(this.t * 4) * .06;
      this.rig.update(dt, { squash: st.sleep ? -.35 : sq, look: [Math.cos(st.facing), Math.sin(st.facing)], squint: !!st.sleep || st.hurt > .2, walk: Math.min(1, Math.hypot(st.vx, st.vy) / 30), flap: this.over === 'bat' ? 1 : 1 });
    } else {
      this.rig.update(dt, { x: st.x, y: st.y, z: st.z || 0, vx: st.vx, vy: st.vy, facing: st.facing, attack: act ? this._attack(act.move, k) : null, hurt: st.hurt || 0, pose: pose === 'die' ? 'die' : st.sleep ? 'sleep' : act && act.move === 'roar' ? 'roar' : null });
    }
  }
  /** world offset of the head (for pennants, numbers, status icons) */
  headZ() { return this.height + (this.float || 0) + 2; }
  /** world offset from the feet of the mouth or the weapon tip (projectiles and breath start there) */
  muzzle() {
    if (this.kind === 'beast') return this.rig.mouth();
    if (this.kind === 'humanoid') { const s = this.state, t = this.tool === 'bow' ? this.rig.hand('L') : this.rig.tip ? this.rig.tip() : this.rig.hand('R'); return [t[0] - s.x, t[1] - s.y, t[2] - (s.z || 0)]; }
    return [Math.cos(this.state.facing) * 4, Math.sin(this.state.facing) * 4, this.height * .6];
  }
  draw(g, ox, oy, view) {
    const st = this.state;
    if (this.kind === 'humanoid') {
      if (this.halo) this._halo(g, ox, oy, view, false);
      if (this.wings) this.wings.draw(g, ox, oy - (this.float || 0) * view.scale * .5, view, this.rig, false);
      const draw = () => this.rig.draw(g, ox, oy, view);
      if (this.alpha < 1) P2.blend(g, this.alpha, 'normal', draw); else draw();
      if (this.clockHead) this._clockHead(g, ox, oy, view);
      if (this.tool) this._tool(g, ox, oy, view);
      if (this.wings) this.wings.draw(g, ox, oy - (this.float || 0) * view.scale * .5, view, this.rig, true);
      if (this.halo) this._halo(g, ox, oy, view, true);
      if (this.glow) { const q = view.p(0, 0, this.height * .6 + this.float); P2.blend(g, .35, 'add', () => P2.disc(g, ox + q[0], oy + q[1], 6 * view.scale, this.glow)); }
      return;
    }
    if (this.kind === 'blob') {
      const fz = this.float ? this.float + Math.sin(this.t * 3) * 1.2 : 0, q = view.p(0, 0, fz), bx = ox + q[0], by = oy + q[1];
      const draw = () => this.rig.draw(g, bx, by, view);
      if (this.alpha < 1) P2.blend(g, this.alpha, 'normal', draw); else draw();
      this._overlay(g, bx, by, view);
      return;
    }
    this.rig.draw(g, ox, oy, view);
  }
  _tool(g, ox, oy, view) {
    const s = this.state, r = this.rig, cv = E.charView ? E.charView(view) : view;
    const H = (which) => { const h = r.hand(which), q = cv.p(h[0] - s.x, h[1] - s.y, h[2] - (s.z || 0)); return [Math.round(ox + q[0]), Math.round(oy + q[1])]; };
    if (this.tool === 'bow') { const [x, y] = H('L'); for (let i = -6; i <= 6; i++) P2.dot(g, x + Math.round(2.4 * Math.cos(i / 6 * 1.2)) - 2, y + i, i % 3 ? '#8a5a2a' : '#5a3a1a'); P2.line(g, x - 1, y - 6, x - 1, y + 6, '#e8e0d0'); }
    else if (this.tool === 'whip') { const [x, y] = H('R'), a = s.act ? s.act.k : 0, f = Math.cos(s.facing), l = 6 + a * 14; P2.line(g, x, y, x + Math.round(f * l * .7), y + 4 + Math.round(Math.sin(this.t * 6) * 2), '#6a3a1e', 1); P2.line(g, x + Math.round(f * l * .7), y + 4, x + Math.round(f * l), y + 2, '#8a5a2a', 1); }
    else if (this.tool === 'scythe') { const [x, y] = H('R'); P2.line(g, x, y + 6, x + 2, y - 12, '#6a4a2a', 1); P2.poly(g, [[x + 2, y - 12], [x - 6, y - 10], [x - 9, y - 7], [x + 1, y - 10]], '#c8c8d0'); }
    else if (this.tool === 'club') { const [x, y] = H('R'); P2.line(g, x, y, x + 2, y - 11, '#6a4a2a', 3); P2.disc(g, x + 2, y - 12, 3, '#7a5a3a'); }
  }
  _halo(g, ox, oy, view, front) {
    const cv = E.charView ? E.charView(view) : view, q = cv.p(0, 0, this.height + 3), x = ox + q[0], y = oy + q[1], R = this.halo === 'clock' ? 9 : 6;
    const t = this.t, col = this.halo === 'clock' ? '#e0e0e8' : '#d8c070';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, py = Math.sin(a) * R * .35; if ((py > 0) !== front) continue; P2.dot(g, x + Math.cos(a) * R, y + py, i % 4 ? col : '#ffffff'); }
    if (front && this.halo === 'clock') { P2.line(g, x, y, x + Math.cos(t) * R * .7, y + Math.sin(t) * R * .25, '#ffffff', 1); }
  }
  _clockHead(g, ox, oy, view) {
    const cv = E.charView ? E.charView(view) : view, j = this.rig.J && this.rig.J.head; if (!j) return;
    const w = this.rig.worldOffset(j), q = cv.p(w[0], w[1], w[2]), x = ox + q[0], y = oy + q[1], R = 4 * (this.rig.o.size || 1);
    P2.disc(g, x, y, R + 1, '#3a3a46'); P2.disc(g, x, y, R, '#f0e8d8'); const t = this.t;
    P2.line(g, x, y, x + Math.cos(t * 2) * R * .8, y + Math.sin(t * 2) * R * .8, '#14121c', 1); P2.line(g, x, y, x + Math.cos(t * .2) * R * .5, y + Math.sin(t * .2) * R * .5, '#14121c', 1);
  }
  _overlay(g, bx, by, view) {
    const R = this.rig.o.R, sc = view.scale, sq = this.rig.sq || 0, top = by - R * 2 * sc * (1 + sq) * .78, t = this.t, f = this.form;
    switch (this.over) {
      case 'sprout': P2.poly(g, [[bx, top + 1], [bx - 4, top - 3], [bx - 1, top - 1]], '#5ab04a'); P2.poly(g, [[bx, top + 1], [bx + 4, top - 4], [bx + 1, top - 1]], '#7ad060'); if (f >= 2) P2.disc(g, bx, top - 3, 1.5, f === 3 ? '#ff4a4a' : '#f4b8d0'); if (f === 3) for (let i = -2; i <= 2; i++) P2.line(g, bx + i * 2, by - 1, bx + i * 3, by + 2, '#6a4a2a', 1); break;
      case 'pumpkin': { for (let i = -1; i <= 1; i++) P2.line(g, bx + i * R * sc * .5, top + 2, bx + i * R * sc * .6, by - 2, TN(this.rig.C.base).sh, 1); const fy = by - R * sc; P2.blend(g, 1, 'normal', () => { P2.poly(g, [[bx - 4, fy - 1], [bx - 2, fy - 3], [bx - 1, fy]], '#ffe040'); P2.poly(g, [[bx + 4, fy - 1], [bx + 2, fy - 3], [bx + 1, fy]], '#ffe040'); P2.rect(g, bx - 3, fy + 2, 6, 1, '#ffd040'); }); const fl = Math.sin(t * 12) * 1; P2.poly(g, [[bx - 2, top], [bx + fl, top - 6 - f], [bx + 2, top]], f === 3 ? '#a0ffd0' : '#ffb020'); break; }
      case 'snow': if ((t * 3 | 0) % 3 === 0) P2.dot(g, bx + Math.sin(t * 2) * R * sc, top + 2, '#ffffff'); P2.dot(g, bx - R * sc * .6, top + 4, '#e8fcff'); if (f === 3) P2.blend(g, .4, 'add', () => P2.disc(g, bx, by - R * sc, R * sc * 1.4, '#a0ffe0')); break;
      case 'clock': { const cy = by - R * sc; P2.disc(g, bx, cy, R * sc * .6, '#f0e8d8'); P2.line(g, bx, cy, bx + Math.cos(t * 3) * R * sc * .5, cy + Math.sin(t * 3) * R * sc * .5, '#14121c', 1); P2.line(g, bx, cy, bx + Math.cos(t * .25) * R * sc * .35, cy + Math.sin(t * .25) * R * sc * .35, '#14121c', 1); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; P2.disc(g, bx + Math.cos(a) * R * sc * 1.4, cy + Math.sin(a) * R * sc * .5, 1.5, '#d8c070'); } break; }
      case 'slime': P2.ell(g, bx - R * sc * .35, top + 4, 2, 1, '#ffffff'); if (f >= 2) { P2.poly(g, [[bx - 4, top + 1], [bx - 4, top - 3], [bx - 2, top - 1], [bx, top - 4], [bx + 2, top - 1], [bx + 4, top - 3], [bx + 4, top + 1]], '#ffd040'); P2.dot(g, bx, top - 1, '#ff4a4a'); } break;
      case 'bat': if (f >= 2) P2.dot(g, bx, by - R * sc * 1.5, '#ff4040'); break;
    }
    if (f === 3 && this.over !== 'snow' && this.over !== 'sprout') P2.blend(g, .25, 'add', () => P2.disc(g, bx, by - R * sc, R * sc * 1.6, G.elemColor(this.elem)));
  }
  /** a portrait: the rig's own close-up (Humanoid), the beast's, or a framed blob */
  portrait(g, x, y, size = 40, o = {}) {
    const bg = o.bg || '#1a2050';
    if (this.kind === 'humanoid') { this.rig.drawPortrait(g, x, y, size, { zoom: o.zoom || (this.sp ? 2.2 : 3), turn: .6, bg, frame: o.frame !== false, tint: o.tint }); if (this.clockHead) { P2.disc(g, x + size / 2, y + size * .45, size * .2, '#f0e8d8'); P2.line(g, x + size / 2, y + size * .45, x + size / 2 + size * .12, y + size * .38, '#14121c', 1); } return; }
    if (this.kind === 'beast') { this.rig.drawPortrait(g, x, y, size, { bg, frame: o.frame }); return; }
    P2.rect(g, x, y, size, size, bg);
    const v = new E.View('p', 'p', 0, 25, size / (this.rig.o.R * 3.2), 1), q = v.p(0, 0, 0);
    const keep = this.state; this.rig.update(0, { squash: 0, look: [0, 1] });
    this.rig.draw(g, x + size / 2 - q[0], y + size * .82 - q[1], v);
    this.state = keep;
    if (o.frame !== false) { P2.rect(g, x, y, size, 1, '#e8e4ff'); P2.rect(g, x, y + size - 1, size, 1, '#e8e4ff'); P2.rect(g, x, y, 1, size, '#e8e4ff'); P2.rect(g, x + size - 1, y, 1, size, '#e8e4ff'); }
  }
}
G.Vis = Vis;
/** a cached Vis for a knight id or species/form (menus, cards, portraits) */
G.visCache = {};
G.visFor = (key, spec) => G.visCache[key] || (G.visCache[key] = new Vis(spec));
G.knightVis = id => G.visFor('k:' + id, { kind: 'knight', ref: id, cls: G.has('knight', id) ? G.get('knight', id).cls : 'squire' });
G.monsterVis = (sp, form) => G.visFor('m:' + sp + form, { kind: 'monster', sp, form });
