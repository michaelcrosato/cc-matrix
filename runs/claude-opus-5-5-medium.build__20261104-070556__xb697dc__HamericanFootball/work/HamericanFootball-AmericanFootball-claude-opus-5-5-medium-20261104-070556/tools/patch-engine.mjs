// Applies the game's engine changes (logged in ENGINE-CHANGES.md) to vendor/my-3d2dge.js from the untouched handoff copy.
import { readFileSync, writeFileSync } from 'node:fs';
const src = new URL('../.cache/engine/dist/handoff/my-3d2dge.js', import.meta.url), out = new URL('../vendor/my-3d2dge.js', import.meta.url);
let s = readFileSync(src, 'utf8');
const rep = (id, a, b) => { if (!s.includes(a)) { console.error('PATCH FAIL ' + id); process.exit(1); } s = s.replace(a, b); };
// E1: PlayStation face-button glyphs in both pixel fonts
rep('E1a', `"▸": '#...|##..|###.|####|###.|##..|#...',`, `"▸": '#...|##..|###.|####|###.|##..|#...', "✕": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', "○": '.....|.###.|#...#|#...#|#...#|.###.|.....', "□": '.....|#####|#...#|#...#|#...#|#####|.....', "△": '.....|..#..|.#.#.|.#.#.|#...#|#####|.....', "✓": '.....|....#|...##|#.##.|###..|.#...|.....', "·": '.|.|.|#|.|.|.', "▲": '.....|.....|..#..|.###.|#####|.....|.....', "▼": '.....|.....|#####|.###.|..#..|.....|.....', "◂": '...#|..##|.###|####|.###|..##|...#',`);
rep('E1b', `'★': '010111010101000',`, `'★': '010111010101000', '✕': '101010101000000', '○': '010101010000000', '□': '111101111000000', '△': '010101111000000', '✓': '001001101010000', '·': '000000010000000', '▲': '000010111000000', '▼': '000111010000000', '◂': '001011111011001',`);
// E2: PlayStation symbols by default, PlayStation or Xbox, and the row on the Settings screen under a Controller heading
rep('E2a', `glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']],`, `glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']],`);
rep('E2b', `      add(this._el('div', 'esh-k esh-sec', g)); for (const k of keys) add(this._row(k));
    }
  }`, `      add(this._el('div', 'esh-k esh-sec', g)); for (const k of keys) add(this._row(k));
    }
    if (S.spec('glyphs')) { add(this._el('div', 'esh-k esh-sec', 'Controller')); add(this._row('glyphs')); }
  }`);
// E7: settings groups named Dev... stay off the Settings screen; any screen may list settings rows (spec.rows)
rep('E7a', `.filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch'].includes(g)));`, `.filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch'].includes(g) && !/^Dev/.test(g)));`);
rep('E7b', `    if (name === 'controls') this._controls(add);
    if (s.keys)`, `    if (name === 'controls') this._controls(add);
    if (s.rows) for (const k of v(s.rows) || []) { if (typeof k === 'string' && k[0] === '#') add(this._el('div', 'esh-k esh-sec', k.slice(1))); else add(this._row(k)); }
    if (s.keys)`);
// E3: a gear hook on the HD Humanoid, called just before its draw ops are depth sorted
rep('E3', `    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style`, `    if (o.gear) o.gear({ g, view, Sp, S, Q, J, C, u, cap, limb, lq, push: (d, f) => ops.push({ d, f }), rig: this });   // (E3: football gear, numbers, the carried ball)
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style`);
// E4: a football helmet hat style: a shell, a center stripe, an ear logo dot and a facemask
rep('E4', `    } else if (st === 'band') {    // headband`, `    } else if (st === 'football') {   // (E4) a football helmet: shell, stripe, ear dot, a grey facemask in front of the face
      const t = Sp(J.head, -.5, 0, .5), lt = shade(c, .3), m = h.mask || '#9aa0a8';
      px.disc(g, t[0], t[1], r * 1.12, dk); px.disc(g, t[0] - .5, t[1] - .5, Math.max(1, r * 1.12 - 1), c); px.disc(g, t[0] - r * .35, t[1] - r * .45, Math.max(.6, r * .28), lt);
      if (h.stripe) { const a = Sp(J.head, R * .95, 0, R * .75), b = Sp(J.head, -R * 1.05, 0, R * .55); px.line(g, a[0], a[1], b[0], b[1], h.stripe, Math.max(1, Math.round(r * .3))); }
      for (const s2 of [-1, 1]) { const e = Sp(J.head, -R * .05, s2 * R * 1.05, 0); if (e[2] > t[2]) px.disc(g, e[0], e[1], Math.max(.6, r * .26), h.logo || h.stripe || lt); }
      const f0 = Sp(J.head, R * 1.15, -R * .55, -R * .05), f1 = Sp(J.head, R * 1.15, R * .55, -R * .05), f2 = Sp(J.head, R * 1.1, -R * .5, -R * .45), f3 = Sp(J.head, R * 1.1, R * .5, -R * .45), fc = Sp(J.head, R * 1.2, 0, -R * .1), fb = Sp(J.head, R * 1.05, 0, -R * .6);
      if (fc[2] > t[2] - .5) { px.line(g, f0[0], f0[1], f1[0], f1[1], m); px.line(g, f2[0], f2[1], f3[0], f3[1], m); px.line(g, fc[0], fc[1], fb[0], fb[1], m); }
    } else if (st === 'band') {    // headband`);
// E5: a Dialog voice may be a function, called for each newly typed letter
rep('E5', `if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);`, `if (typeof this.voice === 'function' && Math.floor(this.shown) > prev) { const tx = this._page.join(''); for (let i = prev; i < Math.floor(this.shown); i++) try { this.voice(tx[i] || '', i, tx, this); } catch (e) { /* a voice never stops the dialog */ } } else if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);`);
// E6: named audio buses under the master (voices, crowd), following mute and volume
rep('E6', `  applyVolume() { if (!this.ctx) return;`, `  /** (E6) a named gain bus under the master: follows mute and volume; null before the sound starts or headless */
  bus(name, vol) { if (!this.ctx) return null; const B = this._buses || (this._buses = {}); if (!B[name]) { B[name] = this.ctx.createGain(); B[name].connect(this._master); } if (vol !== undefined) B[name].gain.value = vol; return B[name]; }
  applyVolume() { if (!this.ctx) return;`);
// E8: game.menu('settings', { pause: false }) opens a screen without pausing (shared-world sessions)
rep('E8', `  menu(name) {
    const sh = this.shell, s = this.scene, play = !!s && (!!s.pausable || this.sceneName === 'main');`, `  menu(name, opt) {
    const sh = this.shell, s = this.scene, play = !!s && (!!s.pausable || this.sceneName === 'main');
    if (opt && opt.pause === false && sh && name) { sh.show(name); return true; }   // (E8)`);
// E10: keep more floor bakes (one per view and zoom) before clearing the cache: zoom levels and the kick cam alternate
rep('E10', `if (Object.keys(this.floors).length > 6) this.floors = {};`, `if (Object.keys(this.floors).length > 16) this.floors = {};`);
writeFileSync(out, s);
console.log('engine patched: E1-E8');
