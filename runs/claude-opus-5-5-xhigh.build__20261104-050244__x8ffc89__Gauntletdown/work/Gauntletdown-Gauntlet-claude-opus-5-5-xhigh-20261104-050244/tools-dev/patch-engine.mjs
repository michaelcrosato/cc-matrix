// Applies the game's engine changes (ENGINE-CHANGES.md) to my-3d2dge.js once. Each patch replaces one exact string and
// fails loudly when the string is not found exactly once, so a changed engine is noticed.
import { readFileSync, writeFileSync } from 'node:fs';
const F = new URL('../my-3d2dge.js', import.meta.url), src0 = readFileSync(F, 'utf8');
let src = src0;
if (src.includes('/* GD-PATCHED */')) { console.log('already patched'); process.exit(0); }
const rep = (name, a, b) => { const n = src.split(a).length - 1; if (n !== 1) { console.error('patch ' + name + ': found ' + n + ' times'); process.exit(1); } src = src.replace(a, () => b); };

// E1: FlowField.updateMany(points): a multi-source field toward the nearest of several points; src = which point
rep('E1', `  /** the field with jump links (a jump of k cells costs k, a climb more, see _cost): Dial's buckets, smallest distance first */`,
`  /** GD E1: aim the field at several world points at once ([{ x, y }] or [[x, y]]): each cell's distance is to the
   *  nearest of them, and src[i] says which (its index). Rebuilds only when some point's cell or the map changes */
  updateMany(points) {
    const m = this.map, T = m.T, W = m.w, H = m.h, cells = points.map(p => { const x = Array.isArray(p) ? p[0] : p.x, y = Array.isArray(p) ? p[1] : p.y; return [Math.floor(x / T), Math.floor(y / T)]; });
    const key = cells.map(c => c[0] + ',' + c[1]).join(';');
    if (key === this._manyKey && m.version === this.version) return;
    this._manyKey = key; this.tx = -2; this.ty = -2; this.version = m.version;
    const d = this.d, q = this._q, top = this._tops, src = this.src && this.src.length === W * H ? this.src : (this.src = new Int16Array(W * H)); d.fill(1e9); src.fill(-1);
    for (let cy = 0, i = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++, i++) top[i] = this._top(cx, cy);
    let h = 0, t = 0;
    cells.forEach(([tx, ty], k) => { if (tx < 0 || ty < 0 || tx >= W || ty >= H) return; const i = ty * W + tx; if (Number.isNaN(top[i]) || d[i] === 0) return; d[i] = 0; src[i] = k; q[t++] = i; });
    while (h < t) {
      const i = q[h++], cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (d[j] > d[i] + 1 && this._link(j, i)) { d[j] = d[i] + 1; src[j] = src[i]; q[t++] = j; }
      }
    }
  }
  /** GD E1: the distance in cells from a world point to the field's target (or nearest target): 1e9 where it can't reach */
  distAt(x, y) { const m = this.map, cx = Math.floor(x / m.T), cy = Math.floor(y / m.T); return cx < 0 || cy < 0 || cx >= m.w || cy >= m.h ? 1e9 : this.d[cy * m.w + cx]; }
  /** the field with jump links (a jump of k cells costs k, a climb more, see _cost): Dial's buckets, smallest distance first */`);
rep('E1b', `    const m = this.map, T = m.T, W = m.w, H = m.h, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx === this.tx && ty === this.ty && m.version === this.version) return;
    this.tx = tx; this.ty = ty; this.version = m.version;`,
`    const m = this.map, T = m.T, W = m.w, H = m.h, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx === this.tx && ty === this.ty && m.version === this.version) return;
    this.tx = tx; this.ty = ty; this.version = m.version; this._manyKey = null;`);

// E2: Humanoid gear: more weapons, a shield in the off hand, a horned helmet
rep('E2a', `    if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon))`, `    if (this.o.weapon && !['sword', 'gun', 'staff'].concat(GD_WEAPONS).includes(this.o.weapon))`);
rep('E2b', `class Humanoid {`, `/* GD E2: weapons beyond the sword, gun and staff (drawn in the HD style; held like a sword), with their lengths */
const GD_WEAPONS = ['axe', 'bow', 'club', 'pan', 'scythe', 'fork', 'dagger'], GD_LEN = { axe: 10, bow: 9, club: 10, pan: 9, scythe: 16, fork: 16, dagger: 6 };
class Humanoid {`);
rep('E2c', `  tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5 : this.o.weapon === 'staff' ? 10 : this.o.bladeLen,`, `  tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5 : this.o.weapon === 'staff' ? 10 : GD_LEN[this.o.weapon] || this.o.bladeLen,`);
rep('E2d', `    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */`, `    if (GD_WEAPONS.includes(o.weapon) || o.offhand === 'shield') this._gdGear(g, ops, J, Q, Sp, cap, u, C, o);
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** GD E2: the extra weapons and the shield, as depth-sorted ops beside the rest of the body */
  _gdGear(g, ops, J, Q, Sp, cap, u, C, o) {
    const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, at = k => Sp(hd, bd[0] * k, bd[1] * k, bd[2] * k), m = tones(C.metal), wd = tones(C.staff || '#7a4a26');
    const side = (k, s) => { const sl = Math.hypot(bd[0], bd[1]) || 1; return Sp(hd, bd[0] * k - bd[1] / sl * s, bd[1] * k + bd[0] / sl * s, bd[2] * k); };
    const w = o.weapon, L = GD_LEN[w] || 10;
    if (w === 'axe' || w === 'club' || w === 'pan' || w === 'dagger') {
      const top = at(L), bot = at(-1.5);
      ops.push({ d: (Hn[2] + top[2]) / 2 + .01, f: () => {
        if (w === 'dagger') { px.line(g, Hn[0], Hn[1], top[0], top[1], m.base, Math.max(1, Math.round(u * .6))); px.dot(g, top[0], top[1], '#ffffff'); return; }
        cap(bot, top, .5 * u, .5 * u, wd.sh); px.line(g, bot[0] - .4, bot[1] - .4, top[0] - .4, top[1] - .4, wd.lt);
        if (w === 'axe') { const a = side(L - 2.2, 3.6), b = side(L + .6, 3.2), c2 = side(L - 1, -1.2); px.poly(g, [top, a, b, c2].map(p => [p[0], p[1]]), m.sh); px.line(g, a[0], a[1], b[0], b[1], m.hi); px.line(g, top[0], top[1], a[0], a[1], m.base); }
        else if (w === 'club') { px.disc(g, top[0], top[1], Math.max(1.4, 1.9 * u), wd.deep); px.disc(g, top[0] - .6, top[1] - .6, Math.max(1, 1.5 * u), wd.base); px.dot(g, top[0] - 1, top[1] - 1, wd.hi); const nub = side(L - 1.5, 1.6); px.dot(g, nub[0], nub[1], wd.sh); }
        else { const c0 = at(L + 2.2), pt = tones(C.pan || '#3a3a44'); px.disc(g, c0[0], c0[1], Math.max(2, 3 * u), pt.deep); px.disc(g, c0[0] - .5, c0[1] - .5, Math.max(1.4, 2.4 * u), pt.sh); px.dot(g, c0[0] - 1.2, c0[1] - 1.2, pt.hi); }
      } });
    } else if (w === 'scythe' || w === 'fork') {
      const top = at(L), bot = at(-4);
      ops.push({ d: (Hn[2] + top[2]) / 2 + .01, f: () => {
        cap(bot, top, .55 * u, .55 * u, wd.sh); px.line(g, bot[0] - .4, bot[1] - .4, top[0] - .4, top[1] - .4, wd.lt);
        if (w === 'scythe') { const p1 = side(L - .5, -7), p2 = side(L - 2.5, -9.5); px.poly(g, [[top[0], top[1]], [p1[0], p1[1]], [p2[0], p2[1]], [top[0] + 1, top[1] + 1]], m.sh); px.line(g, top[0], top[1], p2[0], p2[1], m.hi); }
        else { for (const s of [-2.2, 0, 2.2]) { const a = side(L, s), b = side(L + 5, s); px.line(g, a[0], a[1], b[0], b[1], m.base, Math.max(1, Math.round(u * .6))); px.dot(g, b[0], b[1], m.hi); } const a = side(L, -2.4), b = side(L, 2.4); px.line(g, a[0], a[1], b[0], b[1], m.sh, Math.max(1, Math.round(u * .7))); }
      } });
    } else if (w === 'bow') {
      const hl = J.handL, Hl = Q.handL, up = [0, 0, 1], b0 = Sp(hl, 0, 0, 6.5), b1 = Sp(hl, 0, 0, -6.5), mid = Sp(hl, 1.6, 0, 0), dr = this._gdDraw || 0;
      const nock = dr > 0 ? [Hn[0], Hn[1]] : [mid[0] - (mid[0] - Hl[0]) * 1.6, mid[1] - (mid[1] - Hl[1]) * 1.6];
      ops.push({ d: Hl[2] + .02, f: () => {
        px.line(g, b0[0], b0[1], mid[0], mid[1], wd.sh, Math.max(1, Math.round(u * .7))); px.line(g, mid[0], mid[1], b1[0], b1[1], wd.sh, Math.max(1, Math.round(u * .7)));
        px.dot(g, mid[0], mid[1], wd.lt); px.line(g, b0[0], b0[1], nock[0], nock[1], '#e8e0c8'); px.line(g, nock[0], nock[1], b1[0], b1[1], '#e8e0c8');
      } });
      void up;
    }
    if (o.offhand === 'shield') {
      const hl = J.handL, Hl = Q.handL, st = tones(C.shield || '#3a5ab0'), rim = tones(C.metal), sh = Sp(hl, .8, -.5, 1), R = Math.max(2.4, 3.4 * u);
      ops.push({ d: Hl[2] + .04, f: () => { px.disc(g, sh[0], sh[1], R + 1, rim.deep); px.disc(g, sh[0], sh[1], R, st.sh); px.disc(g, sh[0] - .7, sh[1] - .7, Math.max(1, R - 1.3), st.base); px.disc(g, sh[0], sh[1], Math.max(.8, R * .32), rim.lt); px.dot(g, sh[0] - 1, sh[1] - 1, rim.hi); } });
    }
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */`);
rep('E2e', `    if (st === 'cap') {            // plumber / baseball cap with a brim facing forward`, `    if (st === 'horned') {         // GD E2: a horned helmet (a cap of iron, two horns)
      const t = Sp(J.head, -.3, 0, R * .45), hc = tones(c);
      px.disc(g, t[0], t[1], r * 1.02, hc.sh); px.disc(g, t[0] - .5, t[1] - .7, r * .8, hc.base); px.dot(g, t[0] - r * .3, t[1] - r * .5, hc.hi);
      for (const s of [-1, 1]) { const b = Sp(J.head, -.2, s * R * .9, R * .5), m = Sp(J.head, -.4, s * R * 1.5, R * 1.1), tp = Sp(J.head, -.6, s * R * 1.35, R * 1.75); px.poly(g, [[b[0], b[1] - 1], [m[0], m[1]], [tp[0], tp[1]], [b[0], b[1] + 1]], '#e8dcc0'); px.line(g, m[0], m[1], tp[0], tp[1], '#fff8e8'); }
      return;
    }
    if (st === 'cap') {            // plumber / baseball cap with a brim facing forward`);

// E3: Bullets bounce off TileMap walls (b.bounce times) and report the wall cell (b.onWall(b, cx, cy))
rep('E3', `        if (wall) { b.dead = true; if (this.sparks) this._game.particles.sparks(b.x, b.y, b.z, 3, null, { color: b.color }); if (b.onWall) b.onWall(b); }`,
`        if (wall && b.bounce > 0 && !(map instanceof PlatformMap)) {   // GD E3: reflect on the axis that entered the wall
          const px0 = b.x - b.vx * dt, py0 = b.y - b.vy * dt, hx = map.heightAt(b.x, py0) > b.z, hy = map.heightAt(px0, b.y) > b.z;
          if (hx || !hy) b.vx = -b.vx; if (hy || !hx) b.vy = -b.vy; b.x = px0; b.y = py0; b.bounce--; if (this.sparks) this._game.particles.sparks(b.x, b.y, b.z, 2, null, { color: b.color }); if (b.onBounce) b.onBounce(b);
        } else if (wall) { b.dead = true; if (this.sparks) this._game.particles.sparks(b.x, b.y, b.z, 3, null, { color: b.color }); if (b.onWall) b.onWall(b, Math.floor(b.x / map.T), Math.floor(b.y / map.T)); }`);

// E4: a gamepad's Options (Pad9) is ignored while Create (Pad8) is held (AI Hub: Create + Options is the hub's)
rep('E4', `      p.buttons.forEach((b, i) => { const on = b.pressed; if (on && !this.padPrev[i]) this.press('Pad' + i); if (!on && this.padPrev[i]) this.release('Pad' + i); this.padPrev[i] = on; });`,
`      p.buttons.forEach((b, i) => { const on = b.pressed && !(i === 9 && p.buttons[8] && p.buttons[8].pressed && !this.padPrev[9]); if (on && !this.padPrev[i]) this.press('Pad' + i); if (!on && this.padPrev[i]) this.release('Pad' + i); this.padPrev[i] = on; });   // (GD E4)`);

// E5: PlayStation glyphs by default; the setting applies to every player, and joining players take it
rep('E5a', `  glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], apply: (g, v) => { g.input.glyphs = v; } },`,
`  glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox'], ['auto', 'Auto'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], help: 'The symbols prompts show for a controller', apply: (g, v) => { for (const p of g._players || [g.input]) p.glyphs = v; } },   // (GD E5)`);
rep('E5b', `  q.lastDevice = q.device; if (q.pad !== null) { q.tick(0); q.consumeAll(); }`, `  q.lastDevice = q.device; q.glyphs = this.input.glyphs; q.deadzone = this.input.deadzone; if (q.pad !== null) { q.tick(0); q.consumeAll(); }   // (GD E5: its symbols and dead zone as player 1's)`);

// E6: the Shell at TV size (theme.scale), screens of setting rows (spec.rows), Dev groups kept off the Settings screen,
// and the button symbols on the Settings screen too
rep('E6a', `    for (const k in th) r.style.setProperty('--' + (k === 'titleFont' ? 'title' : k), th[k]);`, `    for (const k in th) r.style.setProperty('--' + (k === 'titleFont' ? 'title' : k), th[k]);
    if (th.scale) this.scale(th.scale);   // (GD E6)`);
rep('E6b', `  /** the name of the open screen ('pause', 'settings', 'controls', ...), or null while the game plays */`, `  /** GD E6: the menus' size: a number, or a function of the window's CSS size (w, h) -> number, kept up to date */
  scale(s) {
    if (!this.root) return this; this._scaleFn = typeof s === 'function' ? s : () => s;
    const on = () => { const k = Math.max(.6, Math.min(4, +this._scaleFn(innerWidth, innerHeight) || 1)); this.root.style.setProperty('--tv', String(k)); };
    if (!this._scaleOn) { this._scaleOn = true; addEventListener('resize', on, { signal: this._game._abort ? this._game._abort.signal : undefined }); }
    on(); return this;
  }
  /** the name of the open screen ('pause', 'settings', 'controls', ...), or null while the game plays */`);
rep('E6c', `    if (name === 'settings') this._settingsRows(add);
    if (name === 'controls') this._controls(add);`, `    if (name === 'settings') this._settingsRows(add);
    if (name === 'controls') this._controls(add);
    if (s.rows) for (const k of v(s.rows)) { if (typeof k === 'string' && k[0] === '#') add(this._el('div', 'esh-k esh-sec', k.slice(1))); else add(this._row(k)); }   // (GD E6: a screen of setting rows; '#Heading' is a heading)`);
rep('E6d', `    const groups = SHELL_GROUPS.concat([...new Set(S.keys().map(k => S.spec(k).group))].filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch'].includes(g)));
    for (const g of groups) {`, `    const groups = SHELL_GROUPS.concat([...new Set(S.keys().map(k => S.spec(k).group))].filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch'].includes(g) && !/^Dev/.test(g)));   // (GD E6: Dev groups have screens of their own)
    if (S.spec('glyphs')) { add(this._el('div', 'esh-k esh-sec', 'Controller')); add(this._row('glyphs')); }   // (GD E5: the button symbols here too)
    for (const g of groups) {`);
rep('E6e', `.esh-mod{width:min(460px,100%);max-height:100%;overflow:auto;padding:22px 24px}`, `.esh-mod{width:min(460px,100%);max-height:100%;overflow:auto;padding:22px 24px;zoom:var(--tv,1)}.esh-sh .esh-mod{max-height:calc(100% / var(--tv,1))}`);

// E7: initials entry read by one player's input, with extra fields kept beside the name and score
rep('E7a', `  enter(score, mode = '', done) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0 }; this.game.input.consumeAll(); }`,
`  enter(score, mode = '', done, o = {}) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0, input: o.input || null, extra: o.extra || null }; (o.input || this.game.input).consumeAll(); }   // (GD E7)`);
rep('E7b', `    const I = this.game.input, e = this.entry, tap = clicked(I);
    if (e) {`, `    const e = this.entry, I = (e && e.input) || this.game.input, tap = clicked(this.game.input);   // (GD E7: the entering player's input)
    if (e) {`);
rep('E7c', `          t.push({ name, score: e.score }); t.sort`, `          t.push(Object.assign({}, e.extra, { name, score: e.score })); t.sort`);

// E8: audio buses by name, with a voice bus of its own under the master volume
rep('E8a', `      this._musBus = c.createGain(); this._musBus.connect(this._master);`, `      this._musBus = c.createGain(); this._musBus.connect(this._master);
      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master);   // (GD E8)`);
rep('E8b', `  applyVolume() { if (!this.ctx) return; this._master.gain.value = this.muted ? 0 : this.volume; this._sfxBus.gain.value = this.sfxVolume;`,
`  /** GD E8: a bus's gain node ('sfx' | 'music' | 'voice', under the master volume and mute), or null before sound starts */
  bus(name) { if (!this._init()) return null; return name === 'music' ? this._musBus : name === 'voice' ? this._voiceBus : this._sfxBus; }
  applyVolume() { if (!this.ctx) return; this._master.gain.value = this.muted ? 0 : this.volume; this._sfxBus.gain.value = this.sfxVolume; if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume === undefined ? 1 : this.voiceVolume;`);
rep('E8c', `  effects: { group: 'Sound', label: 'Effects', type: 'slider', value: 1, apply: (g, v) => { g.audio.sfxVolume = v; g.audio.applyVolume(); } },`,
`  effects: { group: 'Sound', label: 'Effects', type: 'slider', value: 1, apply: (g, v) => { g.audio.sfxVolume = v; g.audio.applyVolume(); } },
  voices: { group: 'Sound', label: 'Voices', type: 'slider', value: .9, help: 'The gibberish voices: the narrator, the heroes and the monsters', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },   // (GD E8)`);

// E9: the keyboard's left half keeps the mouse buttons (player 1 aims and fires with the mouse while sharing the keyboard)
rep('E9', `  for (const a in P) out[a] = (H[a] || H.buttons[k++] || []).concat(P[a].filter(c => padCode(c)));`,
`  for (const a in P) out[a] = (H[a] || H.buttons[k++] || []).concat(P[a].filter(c => padCode(c) || (side === 'left' && c.startsWith('Mouse'))));   // (GD E9: the left half keeps the mouse)`);

src = src.replace('/*!\n * my-3D2dge v0.85.2', '/*! GD-PATCHED */\n/*!\n * my-3D2dge v0.85.2');
writeFileSync(F, src);
console.log('patched: ' + (src.length - src0.length) + ' bytes added');
