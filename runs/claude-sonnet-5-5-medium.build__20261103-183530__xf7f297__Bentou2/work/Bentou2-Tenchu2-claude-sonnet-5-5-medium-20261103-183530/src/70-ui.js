/* ---- RowsUI: one list of big rows for every screen (up/down moves, left/right adjusts, confirm picks; the mouse hovers and clicks) ---- */
class RowsUI {
  constructor(rows, o = {}) { this.rows = rows; this.i = 0; this.o = o; this.hot = []; this.lastPtr = null; }
  firstEnabled(from, dir) { const n = this.rows.length; for (let k = 0; k < n; k++) { const j = (from + dir * k + n * 4) % n; if (!this.rows[j].disabled && !this.rows[j].hidden) return j; } return from; }
  update(dt) {
    const I = game.input, rows = this.rows, n = rows.length; if (!n) return;
    if (this.rows[this.i].disabled || this.rows[this.i].hidden) this.i = this.firstEnabled(this.i, 1);
    if (I.repeat('up', .35, .08)) { this.i = this.firstEnabled(this.i - 1, -1); A.sfx('tick'); }
    if (I.repeat('down', .35, .08)) { this.i = this.firstEnabled(this.i + 1, 1); A.sfx('tick'); }
    const row = rows[this.i];
    if (I.repeat('left', .4, row.fast ? .03 : .1) && row.left) { row.left(); A.sfx('tick'); }
    if (I.repeat('right', .4, row.fast ? .03 : .1) && row.right) { row.right(); A.sfx('tick'); }
    if (I.pressed('confirm') && (row.pick || row.right) && !row.disabled) { (row.pick || row.right)(); A.sfx('confirm'); }
    if (I.pressed('cancel') && this.o.onCancel) { this.o.onCancel(); A.sfx('cancel'); }
    // mouse: hover moves the focus, a click picks (or, on a slider, sets it)
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (p && (!this.lastPtr || Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 1)) {
      this.lastPtr = p.slice();
      for (const h of this.hot) if (p[1] >= h.y && p[1] < h.y + h.h && p[0] >= h.x && p[0] < h.x + h.w && !rows[h.i].disabled) { this.i = h.i; }
    }
    if (c) for (const h of this.hot) if (c[1] >= h.y && c[1] < h.y + h.h && c[0] >= h.x && c[0] < h.x + h.w && !rows[h.i].disabled) {
      this.i = h.i; const r2 = rows[h.i];
      if (r2.slider) r2.slider(clamp((c[0] - h.bx) / h.bw, 0, 1)); else if (r2.pick) r2.pick(); else if (r2.right) (c[0] < h.x + h.w / 2 && r2.left ? r2.left : r2.right)();
      A.sfx('confirm');
    }
  }
  draw(g, x, y, w, rowH, o = {}) {
    this.hot = []; const sc = o.scale || 1;
    this.rows.forEach((row, i) => {
      if (row.hidden) return; const yy = y; const sel = i === this.i;
      this.hot.push({ i, x, y: yy, w, h: rowH, bx: x + w * .5, bw: w * .45 });
      if (sel) { px.rect(g, mm(x), mm(yy), mm(w), mm(rowH), '#3a2a18'); px.rect(g, mm(x), mm(yy), 2, mm(rowH), '#ffd070'); }
      const dis = row.disabled, col = dis ? '#5a5060' : sel ? '#ffe9b0' : '#c8bce0';
      const lab = typeof row.label === 'function' ? row.label() : row.label;
      E.font.text(g, lab, mm(x + 8), mm(yy + (rowH - 7 * sc) / 2), col, { scale: sc, shadow: '#000', outline: false });
      const val = row.value ? (typeof row.value === 'function' ? row.value() : row.value) : null;
      if (row.slider && !dis) {
        const f = row.frac(), bx = x + w * .5, bw = w * .45;
        px.rect(g, mm(bx), mm(yy + rowH / 2 - 1), mm(bw), 3, '#2a2030'); px.rect(g, mm(bx), mm(yy + rowH / 2 - 1), mm(bw * f), 3, sel ? '#ffd070' : '#8a7aa8'); px.rect(g, mm(bx + bw * f - 1), mm(yy + rowH / 2 - 4), 3, 9, '#fff');
        E.font.text(g, String(val), mm(x + w - 4), mm(yy + (rowH - 7) / 2), col, { align: 'right', shadow: '#000', outline: false });
      } else if (val !== null && val !== undefined) {
        E.font.text(g, (sel && row.left ? '< ' : '') + val + (sel && row.right ? ' >' : ''), mm(x + w - 6), mm(yy + (rowH - 7 * sc) / 2), dis ? '#5a5060' : sel ? '#ffd070' : '#a898c8', { align: 'right', scale: sc, shadow: '#000', outline: false });
      }
      y += rowH;
    });
  }
}
B.RowsUI = RowsUI;
/* ---- shared stage art ---- */
const NIGHT = new E.Backdrop({ sky: ['#090818', '#1a1038', '#3a1a4a'], moon: { x: .78, y: .22, r: 17, color: '#f4f0d0' }, stars: 60, starsY: .6,
  layers: [{ kind: 'mountains', color: '#16102a', y: .6, height: .22, parallax: 0 }, { kind: 'castle', color: '#120c22', y: .66, height: .2, parallax: 0 }, { kind: 'hills', color: '#0c0818', y: .82, height: .2, parallax: 0 }, { kind: 'fog', color: '#3a2a5a', y: .9, height: .1, parallax: 0, drift: 3 }] });
const DAWN = new E.Backdrop({ sky: ['#2a2a58', '#c8707a', '#ffd89a'], sun: { x: .5, y: .62, r: 22, color: '#fff2c0' }, stars: 0, layers: [{ kind: 'mountains', color: '#3a3050', y: .64, height: .2, parallax: 0 }, { kind: 'hills', color: '#241c34', y: .8, height: .2, parallax: 0 }] });
const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#4a3e58', moss: '#3a5a3a' } }, edges: 'open' });
const MID = 480;
const bigText = (g, s, x, y, sc = 2, colors = ['#fffbe8', '#ffe08a', '#e0662a']) => E.font.title(g, s, mm(x), mm(y), { align: 'center', scale: sc, colors, depth: Math.max(1, sc - 1), depthColor: '#3a1408' });
const txt = (g, s, x, y, c = '#d8d0f0', o = {}) => E.font.text(g, s, mm(x), mm(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const wrapLines = (s, w) => E.font.wrap(s, w, {});
const panel = (g, x, y, w, h, a = .78) => E.ui.box(g, mm(x), mm(y), mm(w), mm(h), { bg: '#0a0810', border: '#4a3a5a', alpha: a, gradient: false });
const footer = (g, W, H, h = 30) => px.blend(g, .7, 'normal', () => px.rect(g, 0, H - h, W, h, '#07050e'));
/* ---- portraits for the cutscenes ---- */
const PORTRAITS = {};
function portrait(who) {
  if (PORTRAITS[who]) return PORTRAITS[who];
  const mk = o => new E.Humanoid(Object.assign({ size: 1.3, build: 'chibi' }, o));
  const R = {
    granny: mk({ hair: 'bald', outfit: 'robe', sleeves: 'long', hat: { style: 'band', color: '#e8e0f0' }, weapon: null, colors: { cloth: '#6a4a8a', hair: '#e8e8f0', skin: '#e8c8a8', trim: '#d8b860' } }),
    sojiro: makeHeroRig('sojiro'), kaede: makeHeroRig('kaede'),
    takanori: mk({ hair: 'short', hat: 'crown', outfit: 'robe', weapon: null, colors: { cloth: '#8a2a3a', trim: '#e8c860', hair: '#201820' } }),
    kurogane: mk({ build: 'heroic', armor: true, hat: 'helmet', weapon: null, colors: { cloth: '#2a2a3a', metal: '#6a6a7a' } }),
    ittetsu: mk({ build: 'bulky', hair: 'bald', outfit: 'robe', weapon: null, colors: { cloth: '#c8b890', skin: '#d8a880' } }),
    gonroku: mk({ build: 'bulky', hat: 'band', weapon: null, colors: { cloth: '#6a3a2a', skin: '#d0987a' } }),
    kanemori: mk({ hat: 'crown', outfit: 'robe', weapon: null, colors: { cloth: '#6a3a7a', trim: '#e8c860' } }),
    hotaru: mk({ build: 'heroic', hood: true, hair: 'long', weapon: null, colors: { cloth: '#9a1a2a', hair: '#201018' } }),
    tobei: mk({ hair: 'spiky', outfit: 'tunic', weapon: null, colors: { cloth: '#8a6a3a', hair: '#403020' } })
  };
  return (PORTRAITS[who] = R[who] || null);
}
/* ---- the cutscene scene: a night stage, the speakers' faces, the typed line and its babble ---- */
const cutTalk = new E.Dialog(game, { place: 'bottom', speed: 38, voice: null });
const cutScene = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) {
    this.d = d; this.i = 0; this.bg = d.bg === 'dawn' ? DAWN : NIGHT; game.follow(null); game.focus(MID, 0, 40); L.enabled = false; game.weather = null; A.music(d.music || B.SONGS.shop);
    this.next = d.next; this.who = null; game.cam.bounds = null; game.cam.offset = null; game.resetCamera();
    this.line();
  },
  line() {
    const ls = this.d.lines, l = ls[this.i]; if (!l) { cutTalk.close(); return this.finish(); }
    this.who = l[0]; const nm = B.NAMES[l[0]];
    B.babble(l[0], l[1]);
    cutTalk.say([l[1]], { name: nm || undefined, portrait: l[0] === 'narr' ? undefined : portrait(l[0]), place: l[0] === 'narr' ? 'middle' : 'bottom', onDone: () => { this.i++; this.line(); } });
  },
  finish() { const n = this.next; this.next = null; if (n) n(); },
  update(dt) {
    cutTalk.update(dt);
    if (game.input.pressed('pause') || game.input.pressed('cancel')) { cutTalk.close(); this.i = 1e9; this.finish(); }
    const p = portrait(this.who); if (p) p.update(dt, { x: MID, y: 0, z: 32, facing: 0, vx: 0, vy: 0 });
  },
  draw(r) {
    this.bg.draw(r); stage.draw(r); game.focus(MID, 0, 40 + (game.H / 2 - 52) / -game.view.bz);
    r.prop('torch', MID - 90, 0, 32, { size: 1.3 }); r.prop('torch', MID + 90, 0, 32, { size: 1.3 });
    const p = portrait(this.who); if (p) r.actor(MID, 0, 32, (g, ox, oy) => p.draw(g, ox, oy, r.view));
    cutTalk.draw(r);
    r.overlay(g => txt(g, lbl('confirm') + ' Next     ' + lbl('pause') + ' Skip', r.W - 8, 40, '#8a80a8', { align: 'right' }));
  }
};
B.cutscene = (lines, next, o = {}) => game.go('cutscene', Object.assign({ lines, next }, o));
