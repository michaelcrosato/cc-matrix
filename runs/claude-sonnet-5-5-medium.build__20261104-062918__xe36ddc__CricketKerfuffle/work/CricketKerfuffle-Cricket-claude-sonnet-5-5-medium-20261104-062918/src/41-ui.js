/* ---------- 10-foot UI: big menus, prompts that follow the device in use, the match HUD ---------- */
const INK = '#fff8e0', GOLD = '#ffd860', DIM = '#a8b0a0', PANEL = '#141c2a';
const dark = (g, x, y, w, h, a = .65) => px.blend(g, a, 'normal', () => px.rect(g, x, y, w, h, '#000000'));
const text = (r, s, x, y, col = INK, o = {}) => r.text(s, x, y, col, Object.assign({ shadow: '#000', outline: false }, o));
/* the key, button or mouse glyph for an action on the device the player used last */
const glyph = a => { try { return game.input.label(a) || a; } catch (e) { return a; } };
const lastDev = () => { try { return game.input.lastDevice; } catch (e) { return 'keyboard'; } };

function panel(g, x, y, w, h, o = {}) { E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1b2840', '#101a2c'], border: '#e8e0b8', alpha: .86 }, o)); }
/* a prompt chip: [glyph] label */
function chip(r, x, y, act, label, o = {}) {
  const g1 = typeof act === 'string' && act.length > 1 && o.raw !== true ? glyph(act) : act, sc = o.scale || 1;
  const w1 = E.font.width(g1, { scale: sc }) + 8, w2 = E.font.width(label, { scale: sc });
  r.overlay(g => {
    px.rect(g, x, y, w1, 11 * sc, o.dim ? '#555a60' : '#f0e8c8'); px.rect(g, x + 1, y + 1, w1 - 2, 11 * sc - 2, o.dim ? '#2a2e34' : '#2a2a3a');
    E.font.text(g, g1, x + 4, y + 2 * sc, o.dim ? '#888' : '#ffe27a', { scale: sc, outline: false });
    E.font.text(g, label, x + w1 + 4, y + 2 * sc, o.dim ? '#888' : INK, { scale: sc, outline: false, shadow: '#000' });
  });
  return w1 + w2 + 14;
}
function chipsRow(r, y, items, scale = 1) {
  let tw = 0; const ws = items.map(it => { const g1 = glyph(it[0]); return E.font.width(g1, { scale }) + 8 + E.font.width(it[1], { scale }) + 14; });
  tw = ws.reduce((a, b) => a + b, 0); let x = Math.round((r.W - tw) / 2);
  items.forEach((it, i) => { chip(r, x, y, it[0], it[1], { scale, dim: it[2] }); x += ws[i]; });
}

/* ----- big menu: arrows/stick, confirm, mouse hover and click, left/right to change values ----- */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ y: 100, scale: 2, onCancel: null, w: 0 }, o); this._rows = []; this._mt = null; this.t = 0; this.skip(1); }
  off(it) { return it.disabled && (typeof it.disabled === 'function' ? it.disabled() : it.disabled); }
  skip(d) { for (let k = 0; k < this.items.length && this.off(this.items[this.i]); k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  update(dt) {
    this.t += dt || 0;
    const I = game.input, n = this.items.length, old = this.i;
    if (I.repeat('up')) { this.i = (this.i + n - 1) % n; this.skip(-1); }
    if (I.repeat('down')) { this.i = (this.i + 1) % n; this.skip(1); }
    const rowAt = p => { if (!p) return -1; for (let k = 0; k < this._rows.length; k++) { const q = this._rows[k]; if (p[0] >= q.x0 && p[0] <= q.x1 && p[1] >= q.y0 && p[1] <= q.y1 && !this.off(this.items[k])) return k; } return -1; };
    if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = rowAt(I.pointer()); if (k >= 0) this.i = k; }
    const tap = rowAt(I.clicked());
    if (tap >= 0) this.i = tap;
    if (this.i !== old) sfx('select');
    const it = this.items[this.i];
    if (it.opts) {
      const d = (I.repeat('right') ? 1 : 0) - (I.repeat('left') ? 1 : 0);
      if (d) { it.v = (it.v + d + it.opts.length) % it.opts.length; if (it.onChange) it.onChange(it.v, it); sfx('select'); }
    }
    if ((I.pressed('confirm') || tap >= 0) && !this.off(it)) {
      sfx('confirm');
      if (it.opts && tap < 0) { it.v = (it.v + 1) % it.opts.length; if (it.onChange) it.onChange(it.v, it); }
      else if (it.onPick) { I.consumeAll(); it.onPick(it); }
      else if (it.opts && it.onChange) { /* changed by click */ }
      return true;
    }
    if (I.pressed('cancel') && this.o.onCancel) { sfx('cancel'); I.consumeAll(); this.o.onCancel(); return true; }
    return false;
  }
  draw(r) {
    const sc = this.o.scale, lh = (E.font.lineHeight({ scale: sc }) + (this.o.gap == null ? 1 : this.o.gap));
    r.overlay(g => {
      this._rows = [];
      this.items.forEach((it, k) => {
        const sel = k === this.i, off = this.off(it), y = this.o.y + k * lh;
        let label = it.label; if (it.opts) label = it.label + ':  < ' + it.opts[it.v] + ' >';
        const w = E.font.width(label, { scale: sc }), cx = Math.round(r.W / 2) + (this.o.dx || 0), x0 = cx - w / 2 - 14, x1 = cx + w / 2 + 14;
        this._rows.push({ x0, x1, y0: y - 2, y1: y + lh - 3 });
        if (sel) { dark(g, x0, y - 2, x1 - x0, lh - 1, .6); px.rect(g, x0, y - 2, 2, lh - 1, GOLD); px.rect(g, x1 - 2, y - 2, 2, lh - 1, GOLD); }
        E.font.text(g, label, cx, y, off ? '#6a7078' : sel ? GOLD : INK, { scale: sc, align: 'center', outline: false, shadow: '#000' });
        if (sel && !off) E.font.text(g, '▸', x0 + 6 + Math.round(Math.sin(this.t * 8) * 1.5), y, GOLD, { scale: sc, outline: false });
        if (it.hint && sel) E.font.text(g, it.hint, cx, this.o.hintY ? (this.o.hintY < 0 ? r.H + this.o.hintY : this.o.hintY) : this.o.y + this.items.length * lh + 6, this.o.hintCol || DIM, { align: 'center', outline: false, shadow: '#000' });
      });
    });
  }
}

/* ----- the HUD ----- */
function oversStr(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); }
function hudScore(r, M) {
  const S = M.sideBat(), B = M.sideBowl(), tm = TEAMS[S.team];
  r.overlay(g => {
    const x = 6, y = 6;
    panel(g, x, y, 128, 52);
    px.rect(g, x + 4, y + 4, 6, 20, tm.trim);
    E.font.text(g, TEAMS[S.team].short, x + 14, y + 4, INK, { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, S.score + '/' + S.wkts, x + 14, y + 13, GOLD, { scale: 2, outline: false, shadow: '#000' });
    E.font.text(g, 'OV ' + oversStr(S.balls) + '/' + M.overs, x + 124, y + 5, DIM, { align: 'right', outline: false, shadow: '#000' });
    let sub = M.inn === 1 && !M.single ? 'NEED ' + Math.max(0, M.target - S.score) + ' FROM ' + (M.overs * 6 - S.balls) : (M.inn === 0 && !M.single ? 'SET A TARGET' : 'MAX SCORE');
    if (M.single) sub = 'SUPER OVER';
    E.font.text(g, sub, x + 124, y + 15, '#bfe8ff', { align: 'right', outline: false, shadow: '#000' });
    // the last balls
    const hist = S.history.slice(-8);
    hist.forEach((h, k) => {
      const c = h === 'W' ? '#e04030' : h === '6' ? '#ffcc30' : h === '4' ? '#4ac0f0' : /Wd|Nb/.test(h) ? '#c8a050' : '#e8e8e8';
      px.disc(g, x + 9 + k * 14, y + 39, 5, c); E.font.text(g, h, x + 9 + k * 14, y + 36, '#101820', { align: 'center', font: 'tiny', outline: false });
    });
    // the other side's total, small
    E.font.text(g, TEAMS[B.team].short + ' ' + B.score + '/' + B.wkts, x + 14, y + 29, '#9ab0c8', { outline: false, shadow: '#000' });
  });
  // hype
  const side = S.fire > 0 ? S : null;
  r.overlay(g => {
    const wdt = 110, x = r.W - wdt - 8, y = 8, mine = S;
    panel(g, x - 4, y - 2, wdt + 8, 26);
    E.font.text(g, mine.fire > 0 ? 'ON FIRE ×' + mine.fire : (mine.hype >= 100 ? 'HYPE FULL!' : 'HYPE'), x, y + 1, mine.hype >= 100 || mine.fire > 0 ? '#ff9a30' : INK, { outline: false, shadow: '#000' });
    const pct = mine.fire > 0 ? mine.fire / Math.round(T('fireBalls')) : mine.hype / 100;
    px.rect(g, x, y + 11, wdt, 8, '#10141c');
    const flick = mine.fire > 0 || mine.hype >= 100 ? (Math.floor(game.real * 8) % 2 ? '#ffd040' : '#ff6020') : '#40b0ff';
    px.rect(g, x + 1, y + 12, Math.round((wdt - 2) * clamp(pct, 0, 1)), 6, flick);
    const hb = B.hype; px.rect(g, x, y + 20, Math.round(wdt * hb / 100), 2, '#e07060');
  });
}
function hudBanner(r, M) {
  const b = M.banner; if (!b) return;
  const k = b.t / b.t0, pop = Math.min(1, (b.t0 - b.t) * 8), sc = 3;
  r.overlay(g => {
    const y = Math.round(r.H * .3), w = r.W;
    dark(g, 0, y - 6, w, sc * 10 + 24, .7);
    px.rect(g, 0, y - 6, w, 2, b.col); px.rect(g, 0, y + sc * 10 + 16, w, 2, b.col);
    const s = Math.max(1, Math.round(sc * (.6 + .4 * pop)));
    E.font.text(g, b.text, w / 2, y, b.col, { scale: s, align: 'center', outline: '#000', shadow: '#000' });
    if (b.sub) E.font.text(g, b.sub, w / 2, y + sc * 10 + 4, INK, { scale: 1, align: 'center', outline: false, shadow: '#000' });
  });
}
function hudCaption(r) {
  if (!COMM.line || COMM.t <= 0) return;
  r.overlay(g => {
    const w = Math.min(r.W - 20, 176), x = 6, lines = E.font.wrap(COMM.line.text, w - 16), h = 14 + lines.length * 9, y = 62;
    panel(g, x, y, w, h, { alpha: .8 });
    E.font.text(g, COMM.line.name, x + 8, y + 4, COMM.line.vid === 'dot' ? '#ffb0d8' : '#a8d8ff', { outline: false, shadow: '#000' });
    lines.forEach((l, i) => E.font.text(g, l, x + 8, y + 13 + i * 9, INK, { outline: false, shadow: '#000' }));
  });
}
function hudRadar(r, M) {
  const w = 62, h = 66, x = r.W - w - 8, y = r.H - h - 30;
  r.overlay(g => {
    dark(g, x - 1, y - 1, w + 2, h + 2, .75);
    const sx = w / (RX * 2.5), sy = h / (RY * 2.5), cx = x + w / 2, cy = y + h / 2;
    px.ell(g, cx, cy, RX * sx * T('boundaryScale'), RY * sy * T('boundaryScale'), '#2e6a34');
    px.rect(g, cx - 1, cy - 20, 3, 40, '#c8aa72');
    for (const f of M.fielders) px.dot(g, cx + (f.x - CX) * sx, cy + (f.y - MY) * sy, f.id === M.active ? '#ffe040' : '#f0f0f0');
    for (const b of M.batters) px.dot(g, cx + (b.x - CX) * sx, cy + (b.y - MY) * sy, '#ff6060');
    if (M.cow) px.dot(g, cx + (M.cow.x - CX) * sx, cy + (M.cow.y - MY) * sy, '#222');
    px.disc(g, cx + (M.ball.x - CX) * sx, cy + (M.ball.y - MY) * sy, 1.5, '#ff3030');
  });
}
function hudMeter(r, M) {
  const R = M.runup; if (!R) return;
  const w = 180, x = Math.round((r.W - w) / 2), y = r.H - 58, tm = R.t - R.meterStart;
  const p = tm <= 0 ? 0 : clamp(.5 - .5 * Math.cos(TAU * T('meterSpeed') * tm), 0, 1);
  r.overlay(g => {
    panel(g, x - 6, y - 12, w + 12, 30);
    E.font.text(g, DELIVERIES[R.type].name.toUpperCase() + ' - RELEASE IN THE GREEN', r.W / 2, y - 9, INK, { align: 'center', outline: false, shadow: '#000' });
    px.rect(g, x, y + 2, w, 9, '#a03028'); px.rect(g, x + w * .18, y + 2, w * .64, 9, '#d0a030'); px.rect(g, x + w * .34, y + 2, w * .32, 9, '#38b048'); px.rect(g, x + w * .95, y + 2, w * .05, 9, '#ff2020');
    const nx = x + w * p; px.rect(g, nx - 1, y - 1, 3, 15, '#fff'); px.rect(g, nx, y - 3, 1, 3, '#fff');
  });
}
function hudSpeed(r, M) {
  if (M.ph !== 'flight' && !(M.ph === 'inplay' && M.t < 1.5)) return;
  r.overlay(g => { E.font.text(g, (M.speedKmh || 0) + ' KM/H', r.W / 2, 62, '#d8f0ff', { scale: 2, align: 'center', outline: false, shadow: '#000' }); const d = DELIVERIES[M.delType]; if (d) E.font.text(g, d.name.toUpperCase(), r.W / 2, 82, d.col, { align: 'center', outline: false, shadow: '#000' }); });
}
function hudStrips(r, M) {
  if (M.freeHit) r.overlay(g => { const t = Math.floor(game.real * 4) % 2; E.font.text(g, 'FREE HIT', r.W / 2, 44, t ? '#ffdc40' : '#ff7a30', { scale: 2, align: 'center', outline: false, shadow: '#000' }); });
  if (M.golden && M.ph !== 'between') r.overlay(g => E.font.text(g, '★ GOLDEN BALL - RUNS COUNT DOUBLE ★', r.W / 2, M.freeHit ? 66 : 46, GOLD, { align: 'center', outline: false, shadow: '#000' }));
  if (M.wet) r.overlay(g => E.font.text(g, 'RAIN: the ball skids', 140, 10, '#9ac8ff', { outline: false, shadow: '#000', x: 0 }));
}
function hudPrompts(r, M, ctrl) {
  const y = r.H - 18, bat = ctrl.bat, bowl = ctrl.bowl;
  if (bat && (M.ph === 'setup' || M.ph === 'flight')) {
    const rowItems = [['ground', 'DRIVE'], ['loft', 'LOFT'], ['defend', 'BLOCK'], ['special', M.sideBat().hype >= 100 ? 'ON FIRE!' : 'ON FIRE', M.sideBat().hype < 100]];
    chipsRow(r, y, rowItems);
    text(r, (lastDev() === 'mouse' ? 'MOUSE AIMS' : 'STICK AIMS') + ' THE SHOT • TIME IT WITH THE RING', r.W / 2, y - 12, DIM, { align: 'center' });
  } else if (bat && M.ph === 'inplay') {
    chipsRow(r, y, [['run', M.batters.some(b => b.moving) ? 'RUN / TURN BACK  (hold to keep running)' : 'RUN!  (hold to keep running)']]);
  } else if (bowl && M.ph === 'setup') {
    chipsRow(r, y, [['ground', 'QUICKIE'], ['loft', 'SWINGER'], ['defend', 'SPINNER'], ['special', 'FIREBALL', M.sideBowl().hype < 100], ['cycle', 'FIELD: ' + M.field.toUpperCase()]]);
    text(r, (lastDev() === 'mouse' ? 'MOVE THE MOUSE' : 'STICK') + ' SETS THE PITCHING MARKER', r.W / 2, y - 12, DIM, { align: 'center' });
  } else if (bowl && M.ph === 'runup') {
    chipsRow(r, y, [['ground', 'RELEASE']]);
  } else if (bowl && M.ph === 'flight') {
    text(r, 'STICK ←→ : SWING IT AFTER RELEASE', r.W / 2, y - 2, DIM, { align: 'center' });
  } else if (bowl && M.ph === 'inplay') {
    chipsRow(r, y, [['run', 'DIVE'], ]); text(r, 'STICK MOVES THE FIELDER', r.W / 2, y - 12, DIM, { align: 'center' });
  }
}
function hudAll(r, M, ctrl) {
  hudScore(r, M); hudStrips(r, M);
  if (M.ph === 'runup' && M.runup && M.runup.human) hudMeter(r, M);
  hudSpeed(r, M); hudBanner(r, M); hudCaption(r); hudPrompts(r, M, ctrl);
  if (M.ph === 'inplay' || M.ph === 'between') hudRadar(r, M);
  if (M.ph === 'intro') r.overlay(g => { const y = Math.round(r.H * .35); panel(g, 40, y, r.W - 80, 56); E.font.text(g, TEAMS[M.sideBat().team].name.toUpperCase() + (M.single ? ' BAT' : M.inn ? ' CHASE' : ' BAT FIRST'), r.W / 2, y + 10, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, M.inn === 1 ? 'TARGET ' + M.target + ' • ' + M.overs + ' OVERS' : M.overs + ' overs a side • ' + M.maxW + ' wickets • ' + M.ground.name, r.W / 2, y + 34, INK, { align: 'center', outline: false, shadow: '#000' }); });
}
