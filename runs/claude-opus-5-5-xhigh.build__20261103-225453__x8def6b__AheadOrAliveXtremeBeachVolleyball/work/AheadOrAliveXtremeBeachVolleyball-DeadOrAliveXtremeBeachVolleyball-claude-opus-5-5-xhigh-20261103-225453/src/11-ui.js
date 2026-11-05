/* 11-ui: the 10-foot canvas UI kit. Readability rules: the smallest text is the 5x7 font at scale 1 with a shadow;
 * headings scale 2; at most 8 focusable items a screen; content inside a 5% safe area; focus is a gold outline with a
 * white inner line, a soft glow and a 1-px lift. Navigation: d-pad, stick, WASD and arrows move focus spatially (with
 * repeat), confirm and back from the MENU actions, tabs on L1/R1 and Q/E and the wheel; hover moves the focus, a click
 * activates, a right click goes back. Screens lay their widgets out from the screen's size in update and draw alike. */
G.THEMES = {
  day: { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', dim: '#5a8a92', hl: '#ffd36a' },
  night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', ink: '#fff8e8', muted: '#c8b0e0', accent: '#5ff0ff', dim: '#7a5a92', hl: '#ffd36a' }
};
G.theme = () => G.THEMES[G.themeName || 'day'];
G.safe = r => ({ x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) });
const T = () => G.theme();
G.ui = {
  panel(g, x, y, w, h, o = {}) {
    const th = o.theme ? G.THEMES[o.theme] : T();
    E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || th.bg, border: o.border || th.border, alpha: o.alpha === undefined ? .94 : o.alpha });
    if (o.title) {
      const tw = E.font.width(o.title, { scale: 1 }) + 12;
      E.ui.box(g, Math.round(x + 8), Math.round(y - 6), tw, 13, { bg: [th.border, G.E.shade(th.border, -.25)], border: '#2a1a10', alpha: 1 });
      E.font.text(g, o.title, Math.round(x + 14), Math.round(y - 3), '#2a1a10', { outline: false });
    }
  },
  focus(g, x, y, w, h, t = G.now()) {
    x = Math.round(x); y = Math.round(y) - 1; w = Math.round(w); h = Math.round(h);
    const pulse = .25 + .2 * Math.sin(t * 5);
    px.blend(g, pulse, 'add', () => { px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffb84a'); });
    px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y, 2, h, '#ffd36a'); px.rect(g, x + w, y, 2, h, '#ffd36a');
    px.rect(g, x, y, w, 1, '#ffffff'); px.rect(g, x, y + h - 1, w, 1, '#ffffff'); px.rect(g, x, y, 1, h, '#ffffff'); px.rect(g, x + w - 1, y, 1, h, '#ffffff');
  },
  text(g, s, x, y, o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), o.color || T().ink, { scale: o.scale || 1, align: o.align, shadow: o.shadow === undefined ? '#0a0814' : o.shadow, outline: false, wrap: o.wrap, gradient: o.gradient }); },
  title(g, s, x, y, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), { scale: o.scale || 3, align: o.align || 'center', colors: o.colors || ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: o.depth === undefined ? 2 : o.depth }); },
  heading(g, s, x, y, o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), o.color || T().hl, { scale: 2, align: o.align, shadow: '#0a0814', outline: false }); },
  button(g, it, focused) {
    const th = T(), dis = it.disabled;
    E.ui.box(g, Math.round(it.x), Math.round(it.y - (focused ? 1 : 0)), Math.round(it.w), Math.round(it.h), { bg: focused ? ['#1f7a8a', '#0f4c5c'] : it.primary ? ['#2a6a52', '#14402e'] : ['#174a5a', '#0c2e3a'], border: dis ? '#3a5a62' : focused ? '#ffd36a' : th.dim, alpha: .96 });
    const tx = it.icon ? it.x + 16 : it.align === 'left' ? it.x + 8 : it.x + it.w / 2, ty = it.y + Math.round((it.h - 7) / 2) - (focused ? 1 : 0);
    if (it.icon) G.icon(g, it.icon, it.x + 5, ty - 1);
    E.font.text(g, it.label, Math.round(tx), Math.round(ty), dis ? '#5a7a82' : focused ? '#fffbe8' : th.ink, { align: it.icon || it.align === 'left' ? undefined : 'center', shadow: '#0a0814', outline: false, scale: it.scale || 1 });
    if (it.right) E.font.text(g, it.right, Math.round(it.x + it.w - 6), Math.round(ty), dis ? '#5a7a82' : th.hl, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  slider(g, it, focused) {
    const th = T(), t = it.spec, v = it.get(), k = t.toggle ? (v ? 1 : 0) : (v - t.min) / (t.max - t.min), dk = t.toggle ? (t.value ? 1 : 0) : (t.value - t.min) / (t.max - t.min);
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: focused ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: focused ? '#ffd36a' : th.dim, alpha: .96 });
    E.font.text(g, it.label, it.x + 6, it.y + 4, th.ink, { shadow: '#0a0814', outline: false });
    const bx = it.x + Math.round(it.w * .5), bw = Math.round(it.w * .5) - 40, by = it.y + Math.round(it.h / 2) - 1;
    if (t.toggle) E.font.text(g, v ? 'ON' : 'OFF', bx, it.y + 4, v ? '#9ff3a8' : '#ff9a8a', { shadow: '#0a0814', outline: false });
    else {
      px.rect(g, bx, by, bw, 3, '#0a1a20'); px.rect(g, bx, by, Math.round(bw * clamp(k, 0, 1)), 3, focused ? '#ffd36a' : '#9fd3d6');
      px.rect(g, bx + Math.round(bw * clamp(dk, 0, 1)), by - 2, 1, 7, '#ff9e5e');   // the default as a tick
      px.rect(g, bx + Math.round(bw * clamp(k, 0, 1)) - 1, by - 2, 3, 7, '#ffffff');
    }
    const fmt = t.toggle ? '' : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : +v.toFixed(t.step < .01 ? 3 : t.step < 1 ? 2 : 0)) + (t.unit || '');
    if (fmt) E.font.text(g, fmt, it.x + it.w - 5, it.y + 4, v !== t.value ? '#ffd36a' : th.muted, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  stepper(g, it, focused) {
    const th = T();
    E.ui.box(g, it.x, it.y - (focused ? 1 : 0), it.w, it.h, { bg: focused ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: focused ? '#ffd36a' : th.dim, alpha: .96 });
    const ty = it.y + Math.round((it.h - 7) / 2) - (focused ? 1 : 0);
    E.font.text(g, it.label, it.x + 6, ty, th.ink, { shadow: '#0a0814', outline: false });
    const val = String(it.value()), vx = it.x + it.w - 8;
    E.font.text(g, '◀ ' + val + ' ▶', vx, ty, focused ? '#ffd36a' : th.muted, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  tabs(g, x, y, names, cur, o = {}) {
    let cx = x;
    const I = o.input || G.game.input;
    cx += G.glyph(g, cx, y + 2, 'tabL', I) + 4;
    const rects = [];
    names.forEach((n, i) => {
      const w = E.font.width(n) + 12, on = i === cur;
      E.ui.box(g, cx, y - (on ? 1 : 0), w, 13, { bg: on ? ['#ffd36a', '#e8a840'] : ['#174a5a', '#0c2e3a'], border: on ? '#fff3c0' : T().dim, alpha: .96 });
      E.font.text(g, n, cx + 6, y + 3 - (on ? 1 : 0), on ? '#2a1a10' : T().ink, { outline: false });
      rects.push({ x: cx, y, w, h: 13, i }); cx += w + 3;
    });
    G.glyph(g, cx + 1, y + 2, 'tabR', I);
    return rects;
  },
  bar(g, x, y, w, h, k, col = '#ffd36a') { px.rect(g, x, y, w, h, '#0a1a20'); px.rect(g, x, y, Math.round(w * clamp(k, 0, 1)), h, col); px.rect(g, x, y, Math.round(w * clamp(k, 0, 1)), 1, G.E.shade(col, .3)); },
  /** hearts for an affinity 0..100: 5 hearts in half steps */
  hearts(g, x, y, aff, n = 5) { const h = Math.round(clamp(aff, 0, 100) / 100 * n * 2) / 2; for (let i = 0; i < n; i++) G.icon(g, h >= i + 1 ? 'heart' : h >= i + .5 ? 'heartHalf' : 'heartEmpty', x + i * 9, y); },
  money(g, x, y, amount, o = {}) { G.icon(g, 'coin', x, y); E.font.text(g, G.fmtMoney(amount), x + 11, y + (o.scale === 2 ? -3 : 1), '#ffe08a', { scale: o.scale || 1, shadow: '#0a0814', outline: false }); },
  /** a little speech or label tag over a world point */
  tag(g, s, x, y, col = '#fff8e8', bg = '#0a2d3d') { const w = E.font.width(s) + 6; px.rect(g, Math.round(x - w / 2), Math.round(y - 10), w, 10, bg); px.rect(g, Math.round(x - w / 2), Math.round(y - 10), w, 1, G.E.shade(bg, .3)); E.font.text(g, s, Math.round(x), Math.round(y - 9), col, { align: 'center', outline: false }); }
};

/* ---- icons (E.sprite): hearts, coin, chip, gift, hanger, sunglasses, star, moods, weather, lock, camera, NEW ---- */
const SPR = (rows, pal) => E.sprite(rows, pal);
G.ICONS = {
  heart: SPR(['.rr.rr.', 'rRRrrrr', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff5f7a', R: '#ffd0d8' }),
  heartHalf: SPR(['.rr.kk.', 'rRRkkkk', 'rRrkkkk', 'rrrkkkk', '.rrkkk.', '..rkk..', '...k...'], { r: '#ff5f7a', R: '#ffd0d8', k: '#3a2a3a' }),
  heartEmpty: SPR(['.kk.kk.', 'kkkkkkk', 'kkkkkkk', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...'], { k: '#3a2a3a' }),
  coin: SPR(['..yyy..', '.yYYYy.', 'yYyyyYy', 'yYySyYy', 'yYyyyYy', '.yYYYy.', '..yyy..'], { y: '#e8a020', Y: '#ffe08a', S: '#fff6c0' }),
  chip: SPR(['..rrr..', '.rwrwr.', 'rwrrrwr', 'rrrWrrr', 'rwrrrwr', '.rwrwr.', '..rrr..'], { r: '#e83a5a', w: '#ffffff', W: '#ffd36a' }),
  gift: SPR(['..y.y..', '...y...', 'ppppppp', 'pppyppp', 'PPPyPPP', 'PPPyPPP', 'PPPyPPP'], { p: '#ff7ab8', P: '#e8508a', y: '#ffd36a' }),
  hanger: SPR(['...w...', '..w.w..', '....w..', '...w...', '..w.w..', '.w...w.', 'wwwwwww'], { w: '#e8eef8' }),
  shades: SPR(['.......', 'kkk.kkk', 'kbk-kbk', '.k...k.'], { k: '#141018', b: '#5a8ac8', '-': '#141018' }),
  star: SPR(['...y...', '...y...', 'yyyYyyy', '.yYYYy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: '#ffd36a', Y: '#fff6c0' }),
  starEmpty: SPR(['...k...', '...k...', 'kkkkkkk', '.kkkkk.', '..kkk..', '.kk.kk.', 'k.....k'], { k: '#3a4a5a' }),
  happy: SPR(['...y...', '.y.y.y.', '..yyy..', 'yyyYyyy', '..yyy..', '.y.y.y.', '...y...'], { y: '#ffc83a', Y: '#fff2a0' }),
  normal: SPR(['..www..', '.wwwBB.', 'wwwwBBB', 'wwwwBBB', 'wwwwBBB', '.wwwBB.', '..www..'], { w: '#e8e4dc', B: '#5a6a8a' }),
  gloomy: SPR(['.......', '..ggg..', '.ggggg.', 'ggggggg', 'GGGGGGG', '.b.b.b.', 'b.b.b..'], { g: '#9aa4b8', G: '#7a8498', b: '#6aa0e8' }),
  sunny: SPR(['...y...', '.y.y.y.', '..yyy..', 'yyyYyyy', '..yyy..', '.y.y.y.', '...y...'], { y: '#ffb83a', Y: '#fff2a0' }),
  cloudy: SPR(['.......', '..www..', '.wwwww.', 'wwwwwww', 'GGGGGGG', '.......', '.......'], { w: '#f0f0f4', G: '#b0b8c8' }),
  rain: SPR(['..ggg..', '.ggggg.', 'ggggggg', 'GGGGGGG', '.b.b.b.', 'b.b.b..', '.b.b.b.'], { g: '#b0b8c8', G: '#8890a4', b: '#6aa0e8' }),
  moon: SPR(['..yyy..', '.yy....', 'yyy....', 'yyy....', 'yyy....', '.yy....', '..yyy..'], { y: '#fff2a0' }),
  sunset: SPR(['.......', '...o...', '.ooooo.', 'ooOOOoo', 'ppppppp', '.b.b.b.', '.......'], { o: '#ff9e5e', O: '#ffd36a', p: '#ff5f7a', b: '#6a3fa0' }),
  lock: SPR(['..kkk..', '.k...k.', '.k...k.', 'yyyyyyy', 'yyykyyy', 'yyykyyy', 'yyyyyyy'], { k: '#c8c4d8', y: '#e8a020' }),
  camera: SPR(['.kk....', 'kkkkkkk', 'kwwwwwk', 'kwbbbwk', 'kwbBbwk', 'kwwwwwk', 'kkkkkkk'], { k: '#2a2434', w: '#c8c4d8', b: '#3a5a8a', B: '#9fd3ff' }),
  ball: SPR(['..www..', '.wbbyw.', 'wbwwwyw', 'wbwwyyw', 'wwbyyww', '.wwbbw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  letter: SPR(['wwwwwww', 'ww...ww', 'w.w.w.w', 'w..w..w', 'w.....w', 'wwwwwww'], { w: '#f0e8d0', '.': '#c8b890' }),
  cards: SPR(['wwwww..', 'wr..w..', 'w.r.ww.', 'w..rwrw', 'wwwww.w', '..w...w', '..wwwww'], { w: '#f8f6f0', r: '#e8283a' }),
  map: SPR(['gggbbbb', 'ggybbbb', 'gyyybbb', 'ggyyybb', 'bggyybb', 'bbggybb', 'bbbgggb'], { g: '#5fc35a', y: '#f3d9a4', b: '#2ec4c9' }),
  bag: SPR(['..www..', '.w...w.', 'ppppppp', 'pPPPPPp', 'pPPPPPp', 'pPPPPPp', 'ppppppp'], { w: '#c8b890', p: '#e8508a', P: '#ff7ab8' }),
  check: SPR(['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'], { g: '#5fe07a' }),
  cpu: SPR(['.kkkkk.', 'kccccck', 'kcwcwck', 'kccccck', 'kcwwwck', '.kkkkk.'], { k: '#141018', c: '#8a94b0', w: '#e8eef8' })
};
G.icon = (g, name, x, y) => { const s = G.ICONS[name]; if (s) px.sprite(g, s, Math.round(x), Math.round(y)); };
G.moodIcon = m => ({ happy: 'happy', normal: 'normal', gloomy: 'gloomy' })[m] || 'normal';
G.MOOD_WORD = { happy: 'Happy', normal: 'Normal', gloomy: 'Gloomy' };

/* ---- focus and navigation over a list of laid-out items ---- */
G.Nav = class Nav {
  constructor(o = {}) { this.focus = o.focus || null; this._mp = null; this.mouse = false; this.wrap = o.wrap !== false; }
  /** items: [{ id, x, y, w, h, disabled, onPress, onLeft, onRight, onDrag }]; returns { back, tab, alt, extra, moved } */
  update(items, I = G.game.input, o = {}) {
    const ev = { back: false, tab: 0, alt: false, extra: false, moved: false, pressed: null };
    const live = items.filter(it => !it.skip);
    if (!live.length) { ev.back = I.pressed('cancel') || (o.esc !== false && I.map.esc && I.pressed('esc')); return ev; }
    let cur = live.find(it => it.id === this.focus);
    if (!cur) { cur = live.find(it => !it.disabled) || live[0]; this.focus = cur.id; }
    // the mouse: hover focuses (only when it moved), a click activates, a drag sets a slider
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && (!this._mp || p[0] !== this._mp[0] || p[1] !== this._mp[1])) {
      const hit = live.find(it => p[0] >= it.x && p[0] < it.x + it.w && p[1] >= it.y && p[1] < it.y + it.h);
      if (hit && hit.id !== this.focus) { this.focus = hit.id; cur = hit; ev.moved = true; G.sfx('ui_tick'); }
    }
    this._mp = p ? p.slice() : null;
    const c = I.clicked && I.clicked();
    if (c) {
      const hit = live.find(it => c[0] >= it.x && c[0] < it.x + it.w && c[1] >= it.y && c[1] < it.y + it.h);
      if (hit) {
        this.focus = hit.id; cur = hit;
        if (hit.onDrag) hit.onDrag((c[0] - hit.x) / hit.w);
        else if (hit.disabled) G.sfx('ui_error');
        else if (hit.onPress) { G.sfx('ui_select'); ev.pressed = hit.id; hit.onPress(hit); return ev; }
      }
    }
    // directions with repeat; a slider or stepper takes left and right
    const rep = a => I.repeat(a, .35, .09);
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    for (const [a, dx, dy] of dirs) {
      if (!rep(a)) continue;
      if (dx && cur && (dx < 0 ? cur.onLeft : cur.onRight) && !cur.disabled) { (dx < 0 ? cur.onLeft : cur.onRight)(cur); G.sfx('ui_tick'); ev.moved = true; continue; }
      const nx = this._next(live, cur, dx, dy);
      if (nx && nx !== cur) { this.focus = nx.id; cur = nx; ev.moved = true; G.sfx('ui_tick'); }
      else if (o.edge) o.edge(dx, dy);
    }
    if (I.pressed('confirm') && cur) {
      if (cur.disabled) G.sfx('ui_error');
      else if (cur.onPress) { G.sfx('ui_select'); I.consume('confirm'); ev.pressed = cur.id; cur.onPress(cur); return ev; }
    }
    if (I.pressed('cancel') || (o.esc !== false && I.map.esc && I.pressed('esc'))) { ev.back = true; }
    if (I.map.tabL && I.pressed('tabL')) ev.tab = -1;
    if (I.map.tabR && I.pressed('tabR')) ev.tab = 1;
    if (G.wheel && o.wheelTabs) ev.tab = G.wheel > 0 ? 1 : -1;
    if (I.map.alt && I.pressed('alt')) ev.alt = true;
    if (I.map.extra && I.pressed('extra')) ev.extra = true;
    return ev;
  }
  _next(items, cur, dx, dy) {
    if (!cur) return items[0];
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best = null, bs = 1e9;
    for (const it of items) {
      if (it === cur) continue;
      const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cx, ddy = iy - cy, along = ddx * dx + ddy * dy;
      if (along <= 2) continue;
      const across = Math.abs(ddx * dy) + Math.abs(ddy * dx), score = along + across * 2.2;
      if (score < bs) { bs = score; best = it; }
    }
    if (!best && this.wrap && dy) {   // wrap around vertical lists
      const sorted = items.filter(it => Math.abs((it.x + it.w / 2) - cx) < Math.max(cur.w, 30)).sort((a, b) => a.y - b.y);
      if (sorted.length > 1) best = dy > 0 ? sorted[0] : sorted[sorted.length - 1];
    }
    return best;
  }
  draw(g, items, drawItem) { for (const it of items) if (!it.skip) (drawItem || G.ui.button)(g, it, it.id === this.focus); }
};

/* ---- a vertical list of buttons laid out in a column ---- */
G.listLayout = (entries, x, y, w, h = 18, gap = 4) => entries.filter(Boolean).map((e, i) => Object.assign({ x, y: y + i * (h + gap), w, h, kind: 'button' }, e));

/* ---- modal confirm: Yes / No, No first when destructive ---- */
G.confirm = (text, onYes, o = {}) => {
  const ov = {
    id: 'confirm', modal: true, nav: new G.Nav({ focus: o.destructive ? 'no' : 'yes' }), t: 0,
    items() {
      const W = G.game.W, H = G.game.H, w = 230, x = Math.round((W - w) / 2), y = Math.round(H / 2) + 8;
      return [{ id: 'yes', x: x + 16, y, w: 90, h: 18, label: o.yes || 'Yes', onPress: () => { G.overlay.remove(ov); G.game.input.consumeAll(); onYes && onYes(); } },
        { id: 'no', x: x + w - 106, y, w: 90, h: 18, label: o.no || 'No', onPress: () => { G.overlay.remove(ov); G.game.input.consumeAll(); o.onNo && o.onNo(); } }];
    },
    update(dt) { this.t += dt; const ev = this.nav.update(this.items(), G.game.input, { esc: true }); if (ev.back) { G.sfx('ui_back'); G.overlay.remove(ov); G.game.input.consumeAll(); o.onNo && o.onNo(); } return true; },
    draw(r) {
      r.overlay(g => {
        px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#203040'));
        const w = 230, x = Math.round((r.W - w) / 2), lines = E.font.wrap(text, w - 20), h = 44 + lines.length * 9, y = Math.round(r.H / 2) - h + 30;
        G.ui.panel(g, x, y, w, h);
        lines.forEach((l, i) => G.ui.text(g, l, r.W / 2, y + 8 + i * 9, { align: 'center' }));
        this.nav.draw(g, this.items());
      });
    }
  };
  G.overlay.push(ov); G.sfx('ui_tick');
  return ov;
};

/* ---- toasts: slide in at the top for 3 s ---- */
G.toasts = [];
G.toast = (title, text = '', icon = null) => { G.toasts.push({ title, text, icon, t: 0 }); if (G.toasts.length > 3) G.toasts.shift(); };
G.toastOverlay = {
  id: 'toasts',
  update(dt) { for (const t of G.toasts) t.t += G.realDt; G.toasts = G.toasts.filter(t => t.t < 3.2); return false; },
  draw(r) {
    if (!G.toasts.length) return;
    r.overlay(g => G.toasts.forEach((t, i) => {
      const w = Math.max(E.font.width(t.title), E.font.width(t.text)) + (t.icon ? 30 : 20), x = Math.round((r.W - w) / 2), k = t.t < .25 ? t.t / .25 : t.t > 2.9 ? (3.2 - t.t) / .3 : 1;
      const y = Math.round(r.H * .05 + 40 + i * 28 - (1 - E.ease.outCubic(clamp(k, 0, 1))) * 40);   // under the corner badges
      G.ui.panel(g, x, y, w, t.text ? 24 : 15, { alpha: .95 });
      if (t.icon) G.icon(g, t.icon, x + 6, y + 4);
      G.ui.text(g, t.title, x + (t.icon ? 18 : 10), y + 4, { color: '#ffd36a' });
      if (t.text) G.ui.text(g, t.text, x + (t.icon ? 18 : 10), y + 13, { color: '#fff8e8' });
    }));
  }
};
G.overlay.push(G.toastOverlay);

/* ---- the engine's HTML screens (pause, settings, controls, saves) at a size to read from 10 feet ---- */
G.tenFootCSS = () => {
  if (typeof document === 'undefined' || !document.createElement || document.getElementById('aoa-10ft')) return;
  const s = document.createElement('style'); s.id = 'aoa-10ft';
  s.textContent = '.esh{--fs:clamp(16px,2.6vh,30px);font-size:var(--fs)!important}.esh button{font-size:var(--fs)!important;padding:.45em 1em!important;letter-spacing:.03em!important;min-height:2.1em!important}' +
    '.esh h1,.esh h2{font-size:calc(var(--fs)*1.5)!important}.esh-k,.esh-m,.esh-row small,.esh output,.esh-status,.esh-bind small,.esh-bind button,.esh-cnt,.esh-keys{font-size:calc(var(--fs)*.8)!important}' +
    '.esh-row{font-size:var(--fs)!important}.esh-sel{min-width:7em!important}.esh input[type=range]{height:1.6em!important;min-width:9em}';
  document.head.appendChild(s);
};
/* ---- the clock and money badges ---- */
G.clockBadge = (g, x, y, day, slot, weather, o = {}) => {
  const s = 'Day ' + day + ' · ' + G.SLOTS[slot], w = E.font.width(s) + 26;
  E.ui.box(g, Math.round(x - (o.right ? w : 0)), y, w, 15, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
  const ix = Math.round(x - (o.right ? w : 0)) + 5;
  G.icon(g, slot === 2 ? 'moon' : weather === 'rain' ? 'rain' : weather === 'cloudy' ? 'cloudy' : weather === 'golden' ? 'sunset' : 'sunny', ix, y + 4);
  E.font.text(g, s, ix + 11, y + 4, '#fff8e8', { shadow: '#0a0814', outline: false });
  return w;
};
