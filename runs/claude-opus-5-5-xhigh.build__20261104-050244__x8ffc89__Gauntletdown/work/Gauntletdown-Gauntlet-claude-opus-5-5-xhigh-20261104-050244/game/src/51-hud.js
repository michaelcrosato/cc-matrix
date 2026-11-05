/* ---- THE HUD: canvas pixel art, anchored to r.W and r.H. 10-foot rules: nothing below the 5x7 font, three numbers a
   panel at most, no tables in play. Prompts name the player's own keys or buttons (input.label) ---- */
const INK = '#fff4dc', GOLD = '#ffd060', DIM = '#a89a88', RED = '#ff4a3a', PANEL = { bg: ['#2a1e16', '#120c0a'], border: '#8a6a3a' };
const tx = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const big = () => game.settings.hudSize === 'large';
/** [key] for an action on a player's device: '[R2]', '[Left click]', '[F]' */
const key = (I, a) => '[' + ((I || game.input).label(a) || a.toUpperCase()) + ']';
/** the words of a How to Play page or a prompt with the player's own keys in place of {move}, {aim}, {fire} ... */
function keysIn(text, I) {
  I = I || game.input; const pad = I.lastDevice === 'gamepad';
  const moveK = pad ? 'THE LEFT STICK' : I.half === 'right' ? 'THE ARROWS' : 'WASD';
  const aimK = pad ? 'THE RIGHT STICK' : I === game.input ? 'THE MOUSE' : 'YOUR FACING';
  const join = pad ? key(I, 'start') + ' ON A FREE CONTROLLER' : '[2] ON THE KEYBOARD OR [' + E.Input.prototype.codeLabel.call(I, 'Pad9') + '] ON A FREE CONTROLLER';
  return text.replace('{move}', moveK).replace('{aim}', aimK).replace(/\{(fire|magic|plant|start|pause|confirm|cancel|view)\}/g, (_, a) => key(I, a)).replace('{join}', join);
}
function drawHud(r) {
  if (!W) return;
  r.overlay(g => {
    const ca = game.cornerArea && game.cornerArea(), right = ca && ca.y0 < 40 ? Math.max(r.W / 2, Math.floor(ca.x0) - 2) : r.W;
    const slots = SESSION ? W.heroes.length : Math.min(4, Math.max(W.heroes.length + (canJoin() ? 1 : 0), W.heroes.length)), pw = Math.floor(right / Math.max(slots, 2)), ph = big() ? 40 : 32;
    for (let i = 0; i < slots; i++) {
      const h = W.heroes[i], x = i * pw + 2, y = 2;
      if (h) heroPanel(g, h, x, y, pw - 4, ph); else joinPanel(g, x, y, pw - 4, ph, i);
    }
    // centre: the floor's name; the treasure clock; a session's clock and scoreboard
    const y0 = ph + 6;
    if (W.treasure) { const t = Math.max(0, Math.ceil(W.treasure.t)); tx(g, String(t), r.W / 2, y0 + 2, t <= 5 && Math.floor(game.real * 4) % 2 ? RED : GOLD, { align: 'center', scale: 3 }); tx(g, 'HOARD', r.W / 2, y0 + 26, DIM, { align: 'center' }); }
    else if (floorBanner > 0) { const a = Math.min(1, floorBanner); if (a > .2) tx(g, W.F.name, r.W / 2, y0 + 2, GOLD, { align: 'center', scale: 2 }); }
    if (SESSION && SESS.info) sessionStrip(g, r, y0);
    if (W.boss && !W.boss.dead && W.boss.phase > 0) bossBar(g, r);
    if (cheating() && !RUN_DEMO()) { E.ui.box(g, 4, r.H - 18, 30, 14, { bg: ['#6a1a1a', '#3a0a0a'], border: '#ff6a4a' }); tx(g, 'DEV', 9, r.H - 15, '#ffd0c0'); }
    edgeArrows(g, r);
    captions(g, r);
    prompts(g, r);
  });
}
const canJoin = () => !SESSION && !RUN_DEMO() && game._join && W && W.heroes.length < 4;
function heroPanel(g, h, x, y, w, ph) {
  const I = h.input || game.input, low = h.hp < 400, crit = h.hp < 200, flash = h.hurtT > 0;
  E.ui.box(g, x, y, w, ph, { bg: flash ? ['#5a1a12', '#2a0a08'] : PANEL.bg, border: h.color, alpha: .86 });
  const ps = ph - 8, rig = heroRig(h);
  px.rect(g, x + 4, y + 4, ps, ps, h.alive ? E.shade(h.color, -.45) : '#2a2a2a');
  try { rig.drawPortrait(g, x + 4, y + 4, ps, { zoom: 2.4, turn: .3, cape: false, weapon: false, tint: h.alive ? undefined : '#707070' }); } catch (e) { /* a portrait needs a posed rig */ }
  const tx0 = x + ps + 8, cls = h.D.name, scoreW = E.font.width(String(h.score)) + 6, nameW = w - ps - 12 - scoreW;
  let nm = h.name && h.name !== 'P' + (h.seat + 1) ? h.name : cls; while (nm.length > 2 && E.font.width(nm) > nameW) nm = nm.slice(0, -1);
  tx(g, nm, tx0, y + 3, h.color);
  if (!h.alive) {
    const r2 = SESSION ? 'RISING...' : 'RISE: ' + key(I, 'fire');
    tx(g, r2, tx0, y + 14, Math.floor(game.real * 3) % 2 ? GOLD : INK);
    tx(g, String(h.score), tx0, y + ph - 11, DIM);
    return;
  }
  const hc = crit ? (Math.floor(game.real * 5) % 2 ? RED : '#ffb0a0') : low ? '#ffe060' : INK;
  tx(g, fmt(h.hp), tx0, y + 12, hc, { scale: 2 });
  const hpW = E.font.width(fmt(h.hp), { scale: 2 });
  tx(g, String(h.score), x + w - 4, y + 3, DIM, { align: 'right' });
  // keys and flasks; the amulet; special potions
  let ix = tx0 + hpW + 6;
  if (ix + 40 > x + w) ix = tx0;
  const iy = big() ? y + ph - 11 : y + 13;
  if (big() || ix !== tx0) {
    px.sprite(g, SPR.key, ix, iy + 1); tx(g, String(h.keys), ix + 10, iy, INK);
    px.sprite(g, SPR.flask, ix + 20, iy - 1); tx(g, String(h.flasks), ix + 28, iy, INK);
  }
  if (h.amulet) { const A2 = get('amulets', h.amulet.type), ax = x + w - 12, ay = y + ph - 14; px.sprite(g, SPR['am_' + h.amulet.type], ax, ay); const f = h.amulet.t / AMULET_TIME; px.rect(g, ax - 2, ay + 8, Math.round(10 * f), 2, A2.color); }
  let sx = tx0; for (const s of Object.keys(h.specials)) { if (!big()) break; px.rect(g, sx, y + ph - 3, 4, 2, get('specials', s).color); sx += 5; }
  if (h.onMenu > 0) px.sprite(g, SPR.bell, x + w - 12, y + 12);
}
function joinPanel(g, x, y, w, ph, i) {
  if (!canJoin() || i !== W.heroes.length) return;
  const on = Math.floor(game.real * 2) % 2;
  E.ui.box(g, x, y, w, ph, { bg: ['#1a1410', '#0a0806'], border: on ? '#6a5a3a' : '#3a2e20', alpha: .6 });
  tx(g, 'P' + (i + 1), x + 6, y + 4, SEAT_COLORS[i]);
  tx(g, on ? 'TO JOIN:' : '', x + 6, y + 14, DIM);
  tx(g, '[' + E.Input.prototype.codeLabel.call(game.input, 'Pad9') + '] / [2]', x + 6, y + ph - 11, on ? GOLD : DIM);
}
function bossBar(g, r) {
  const K = W.boss, w = Math.min(220, r.W - 80), x = (r.W - w) / 2, y = r.H - 9;
  tx(g, 'KING FAMISH', r.W / 2, y - 10, '#e8c0ff', { align: 'center' });
  px.rect(g, x - 1, y - 1, w + 2, 7, '#000'); px.rect(g, x, y, w, 5, '#3a1a3a'); px.rect(g, x, y, Math.round(w * K.hp / K.max), 5, K.phase === 3 ? '#ff4a6a' : '#c84aff');
  for (const f of [.7, .35]) px.rect(g, x + Math.round(w * f), y - 1, 1, 7, '#ffd060');
}
/** arrows at the screen's edge: to the stairs once seen (or once walls are stairs), to friends off screen in a session */
function edgeArrows(g, r) {
  const marks = [];
  if (W.stairs.length && (W.firsts.stairsSeen || W.impatience >= 1)) { const s = W.stairs.find(s => !s.to) || W.stairs[0]; marks.push([mid(s.cx), mid(s.cy), GOLD]); }
  if (SESSION) for (const h of W.heroes) if (h.remote && h.alive) marks.push([h.x, h.y, h.color]);
  for (const [x, y, c] of marks) {
    const [bx, by] = r.w(x, y, 0), sx = bx - r.ix, sy = by - r.iy;
    if (sx > 8 && sy > 48 && sx < r.W - 8 && sy < r.H - 8) continue;
    const cx = r.W / 2, cy = r.H / 2, a = Math.atan2(sy - cy, sx - cx), ex = clamp(cx + Math.cos(a) * r.W, 12, r.W - 12), ey = clamp(cy + Math.sin(a) * r.H, 52, r.H - 30);
    const tip = [ex + Math.cos(a) * 6, ey + Math.sin(a) * 6], l = [ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6], rr = [ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6];
    px.poly(g, [tip, l, rr], '#000'); px.poly(g, [[tip[0] - Math.cos(a), tip[1] - Math.sin(a)], [l[0] + .5, l[1]], [rr[0] + .5, rr[1]]], c);
  }
}
/** the Gaunt's captions: bottom centre, outlined, two lines at most */
function captions(g, r) {
  const c = NARR.caption; if (!c || !game.settings.captions) return;
  const sc = r.W >= 400 ? 2 : 1, maxW = r.W - 24, lines = E.font.wrap(c.text, maxW, { scale: sc }).slice(0, 2), lh = 9 * sc + 2;
  const y = r.H - 14 - lines.length * lh - (W.boss && !W.boss.dead && W.boss.phase > 0 ? 12 : 0), a = Math.min(1, c.t * 4, (c.end - game.real) * 3);
  if (a <= 0) return;
  lines.forEach((l, i) => tx(g, l, r.W / 2, y + i * lh, c.color || '#ffe8b0', { align: 'center', scale: sc, outline: '#1a0a04', shadow: false }));
}
/** prompts: how to play on the first floor, a door with no key, the stairs being held */
function prompts(g, r) {
  const h = W.heroes.find(q => !q.remote && !q.bot) || null; if (!h || RUN_DEMO()) return;
  const I = h.input || game.input, y = r.H - 12;
  let p = null;
  if (W.F.no === 1 && W.t < 9 && W.descent === 1) p = 'MOVE ' + (I.lastDevice === 'gamepad' ? '[L stick]' : '[WASD]') + '   AIM ' + (I.lastDevice === 'gamepad' ? '[R stick]' : '[Mouse]') + '   FIRE ' + key(I, 'fire') + '   MAGIC ' + key(I, 'magic');
  else if (h.alive && h.stair > 0) p = 'GOING DOWN...';
  else if (h.alive && h.keys === 0 && W.doors.some(d => !d.open && d.cells.some(([cx, cy]) => Math.hypot(mid(cx) - h.x, mid(cy) - h.y) < 22))) p = 'THE DOOR NEEDS A KEY';
  else if (W.impatience >= 3 && h.alive) p = 'PUSH INTO ANY WALL TO GO DOWN';
  if (!p || NARR.caption) return;
  tx(g, p, r.W / 2, y - 8, '#e8dcc8', { align: 'center' });
}
let floorBanner = 0;
