/* ---- THE HUD: button badges that follow the last device, prompts, the TV score bug, the radar, banners, seat cards,
 * and the set pieces' widgets. Everything anchored to r.W and r.H ---- */
TT.hud = { banners: [], ui: {} };
const HUD = TT.hud;
const PS = { x: ['✕', '#6a9cf0'], ci: ['○', '#f05a64'], sq: ['□', '#e07ac8'], tri: ['△', '#4ad0a0'] };
const XB = { x: ['A', '#5ac85a'], ci: ['B', '#e8503a'], sq: ['X', '#3a86e8'], tri: ['Y', '#f0c830'] };
const PILLS = { l1: ['L1', 'LB'], r1: ['R1', 'RB'], turbo: ['R2', 'RT'], view: ['R3', 'RS'], start: ['OPT', 'MENU'], pause: ['OPT', 'MENU'] };
const PAD_ACT = { 0: 'x', 1: 'ci', 2: 'sq', 3: 'tri', 4: 'l1', 5: 'r1', 7: 'turbo', 9: 'start', 11: 'view' };
TT.glyphFamily = () => (TT.settings.glyphs === 'xbox' ? 'xbox' : 'playstation');
/** which face of the pad an action sits on, after the player's rebinding */
function padFace(I, act) {
  if (!I || !I.map || !I.map[act]) return act;
  const c = I.map[act].find(k => /^Pad\d+$/.test(k)); if (!c) return act;
  return PAD_ACT[+c.slice(3)] || act;
}
/** a badge for an action on the device used last: a pad button, a keycap, or a mouse button. Returns its width */
TT.glyph = (g, act, x, y, I, small, measure) => {
  I = I || TT.game.input;
  const dev = TT.forceDevice || (I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice);
  if (dev === 'gamepad') {
    const face = padFace(I, act), fam = TT.glyphFamily();
    if (PS[face]) {
      if (measure) return 11;
      const [sym, col] = (fam === 'xbox' ? XB : PS)[face];
      px.disc(g, x, y, 5, '#141820'); px.disc(g, x, y, 4, '#2a3040');
      E.font.text(g, sym, x + (fam === 'xbox' ? 0 : 0), y - 3, col, { align: 'center', outline: false });
      return 11;
    }
    const lab = PILLS[face] ? PILLS[face][fam === 'xbox' ? 1 : 0] : face.toUpperCase();
    const w = E.font.width(lab, { font: 'tiny' }) + 6; if (measure) return w;
    E.ui.box(g, x - w / 2, y - 4, w, 9, { bg: '#2a3040', border: '#141820', gradient: false });
    E.font.text(g, lab, Math.round(x), y - 2, '#e8ecf8', { align: 'center', font: 'tiny', outline: false });
    return w;
  }
  const codes = (I.map && I.map[act]) || [];
  if (dev === 'mouse') {
    const mc = codes.find(c => c.startsWith('Mouse'));
    if (mc) { if (measure) return 9; const btn = +mc.slice(5); px.rect(g, x - 4, y - 5, 8, 11, '#e8e8f0'); px.rect(g, x - 4, y - 5, 8, 1, '#a0a0b0'); px.rect(g, btn === 2 ? x : x - 4, y - 5, 4, 5, '#f05a64'); px.rect(g, x, y - 5, 1, 5, '#6a6a78'); return 9; }
  }
  const kc = codes.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || codes[0] || '';
  const lab = (I.codeLabel ? I.codeLabel(kc) : kc).toUpperCase().replace('SHIFT', 'SHIFT').slice(0, 6);
  const w = Math.max(9, E.font.width(lab, { font: 'tiny' }) + 6); if (measure) return w;
  px.rect(g, x - w / 2, y - 4, w, 10, '#5a5e6a'); px.rect(g, x - w / 2, y - 5, w, 9, '#e4e6ec'); px.rect(g, x - w / 2 + 1, y - 4, w - 2, 1, '#ffffff');
  E.font.text(g, lab, Math.round(x), y - 3, '#20242c', { align: 'center', font: 'tiny', outline: false });
  return w;
};
/** a prompt with badges: "{b:x} TACKLE  {b:ci} SWITCH" centred at x (align 'left' starts there); returns its width */
TT.prompt = (g, str, x, y, I, o = {}) => {
  const parts = String(str).split(/(\{b:[a-z0-9]+\})/).filter(Boolean);
  const sc = o.scale || 1, fo = { scale: sc, outline: o.outline === undefined ? '#000' : o.outline, shadow: o.shadow };
  const widths = parts.map(s => s.startsWith('{b:') ? TT.glyph(g, s.slice(3, -1), 0, 0, I, false, true) + 2 : E.font.width(s, fo));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.align === 'left' ? x : Math.round(x - total / 2);
  parts.forEach((s, i) => {
    if (s.startsWith('{b:')) TT.glyph(g, s.slice(3, -1), cx + widths[i] / 2, y + 3 * sc, I);
    else E.font.text(g, s, cx, y, o.color || '#ffffff', fo);
    cx += widths[i];
  });
  return total;
};

/* ---- banners (TRY!, MONSTER HIT!...) ---- */
HUD.banner = (text, o = {}) => { HUD.banners = HUD.banners.filter(b => b.text !== text).slice(-2); HUD.banners.push({ text, t: 0, life: o.life || 1.6, colors: o.colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], scale: o.scale || 3, sub: o.sub || '' }); };
HUD.step = dt => { for (const b of HUD.banners) b.t += dt; HUD.banners = HUD.banners.filter(b => b.t < b.life); };

/* ---- the crests: a shield in the team's colours with its emblem ---- */
TT.drawCrest = (g, team, x, y, s = 1) => {
  const [kind, c1, c2] = team.crest, w = Math.round(12 * s), h = Math.round(14 * s);
  px.poly(g, [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 6], [x, y + h / 2], [x - w / 2, y + h / 6]], '#141820');
  px.poly(g, [[x - w / 2 + 1, y - h / 2 + 1], [x + w / 2 - 1, y - h / 2 + 1], [x + w / 2 - 1, y + h / 6], [x, y + h / 2 - 1], [x - w / 2 + 1, y + h / 6]], c1);
  const k = Math.max(1, Math.round(s));
  if (kind === 'bird') { px.rect(g, x - 3 * k, y - k, 5 * k, 2 * k, c2); px.rect(g, x + k, y - 2 * k, 2 * k, k, c2); px.rect(g, x - 4 * k, y - 2 * k, k, k, c2); }
  else if (kind === 'badger') { px.rect(g, x - 3 * k, y - 3 * k, 6 * k, 6 * k, c2); px.rect(g, x - k, y - 3 * k, 2 * k, 6 * k, c1); }
  else if (kind === 'gull') { px.line(g, x - 4 * k, y - k, x, y + k, c2, k); px.line(g, x, y + k, x + 4 * k, y - k, c2, k); px.rect(g, x - k, y + 2 * k, 2 * k, k, '#e8a030'); }
  else if (kind === 'anvil') { px.rect(g, x - 4 * k, y - 2 * k, 8 * k, 2 * k, c2); px.rect(g, x - 2 * k, y, 4 * k, 2 * k, c2); px.rect(g, x - k, y - 5 * k, 2 * k, 2 * k, '#ffd040'); }
  else { E.font.text(g, 'M', x, y - 3 * k, c2, { align: 'center', outline: false, scale: k }); }
};

/* ---- the match HUD ---- */
HUD.draw = (r, m) => {
  if (!m) return;
  r.overlay(g => {
    const W = r.W, H = r.H, big = TT.settings.uiScale !== 'Normal';
    HUD.scoreBug(g, m, 6, 6);
    HUD.radar(g, m, W, H);
    // banners
    HUD.banners.forEach((b, i) => {
      const k = b.t < .15 ? b.t / .15 : 1, y = Math.round(H * .3 + i * 30), sc = Math.max(1, Math.round(b.scale * (b.t < .15 ? .6 + .4 * k : 1)));
      E.font.title(g, b.text, W / 2, y, { align: 'center', scale: sc, colors: b.colors, depth: 2 });
      if (b.sub) E.font.text(g, b.sub, W / 2, y + 8 * sc + 6, '#ffffff', { align: 'center', outline: '#000' });
    });
    HUD.seatCards(g, m, W, H);
    HUD.widgets(g, m, W, H, r);
    HUD.prompts(g, m, W, H, big);
    if (m.ref.down > 0) E.font.text(g, 'REF DOWN! ANYTHING GOES!', W / 2, 30, '#ff7050', { align: 'center', outline: '#000' });
    if (m.adv) E.font.text(g, 'ADVANTAGE ' + m.teams[m.adv.team].short, W / 2, 30, '#ffe080', { align: 'center', outline: '#000' });
    if (TT.net && TT.net.waiting) E.font.text(g, 'WAITING FOR THE HOST...', W / 2, H / 2, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
  });
};
HUD.scoreBug = (g, m, x, y) => {
  const t0 = m.teams[0], t1 = m.teams[1];
  E.ui.box(g, x, y, 150, 30, { bg: ['#1a2238', '#0c1020'], border: '#e8c040', alpha: .92 });
  TT.drawCrest(g, t0, x + 9, y + 9, .9); TT.drawCrest(g, t1, x + 82, y + 9, .9);
  E.font.text(g, t0.short, x + 17, y + 4, '#f0ecdc', { outline: false });
  E.font.text(g, String(m.score[0]), x + 58, y + 3, '#ffffff', { outline: false, scale: 2, align: 'right' });
  E.font.text(g, t1.short, x + 90, y + 4, '#f0ecdc', { outline: false });
  E.font.text(g, String(m.score[1]), x + 132, y + 3, '#ffffff', { outline: false, scale: 2, align: 'right' });
  // hype under each name
  for (const t of [0, 1]) {
    const hx = x + 4 + t * 73, full = m.hype[t] >= 100;
    E.ui.bar(g, hx, y + 21, 66, 4, m.hype[t] / 100, full ? (Math.floor(PR.t * 6) % 2 ? '#ffffff' : '#ff60c0') : m.kits[t].cloth);
    if (full) E.font.text(g, 'SUPER!', hx + 33, y + 24, '#ffe040', { align: 'center', font: 'tiny', outline: '#000' });
  }
  // the clock (sevens time), the half, the hooter
  const shown = m.drill ? 'TRAINING' : m.suddenDeath ? 'GOLDEN POINT' : (m.half === 1 ? '1ST ' : '2ND ') + TT.fmtClock(Math.min(420, m.clock * 420 / m.halfLen));
  E.ui.box(g, x, y + 31, 76, 11, { bg: '#0c1020', border: '#3a4460', alpha: .9, gradient: false });
  E.font.text(g, shown, x + 4, y + 33, m.hooter ? (Math.floor(PR.t * 4) % 2 ? '#ff6050' : '#ffffff') : '#c8d0e8', { font: 'tiny', outline: false });
  if (m.hooter && !m.suddenDeath) E.font.text(g, 'HOOTER', x + 80, y + 33, '#ff6050', { font: 'tiny', outline: '#000' });
  // the sin bin's seconds
  let bx = x + 4;
  for (const p of m.players) if (p.st === 'binned') { px.rect(g, bx, y + 45, 8, 6, '#2a6a3a'); E.font.text(g, String(Math.ceil(p.binT)), bx + 10, y + 45, m.kits[p.team].cloth, { font: 'tiny', outline: '#000' }); bx += 26; }
  // the wind
  if (m.wind.s > .05 && (m.weather === 'wind' || m.weather === 'storm')) {
    const wx = x + 140, wy = y + 37, a = m.wind.a, l = 4 + m.wind.s * 6;
    px.line(g, Math.round(wx - Math.cos(a) * l), Math.round(wy - Math.sin(a) * l * .6), Math.round(wx + Math.cos(a) * l), Math.round(wy + Math.sin(a) * l * .6), '#e8f0ff', 1);
    px.disc(g, Math.round(wx + Math.cos(a) * l), Math.round(wy + Math.sin(a) * l * .6), 1.5, '#ff8040');
    E.font.text(g, 'WIND', wx - 22, wy - 2, '#a8b8d8', { font: 'tiny', outline: '#000' });
  }
};
HUD.radar = (g, m, W) => {
  const s = .085, w = Math.round((G.DEAD[1] - G.DEAD[0]) * s), h = Math.round((G.Y1 - G.Y0) * s), ca = TT.game.cornerArea && TT.game.cornerArea();
  const x0 = W - w - 8, y0 = ca && ca.x0 < x0 + w && ca.y1 < 80 ? Math.ceil(ca.y1) + 4 : 8;
  E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#1e4a26', border: '#8ab090', alpha: .8, gradient: false });
  for (const lx of [G.X0, G.X1, G.CX]) px.rect(g, Math.round(x0 + (lx - G.DEAD[0]) * s), y0, 1, h, '#a8d0a8');
  for (const p of m.players) { if (!onField(p) || p.st === 'binned') continue; const X = Math.round(x0 + (p.x - G.DEAD[0]) * s), Y = Math.round(y0 + (p.y - G.Y0) * s); px.rect(g, X - 1, Y - 1, 3, 3, '#000'); px.rect(g, X, Y, 1, 1, m.kits[p.team].cloth); if (p.ctl >= 0 && TT.seats[p.ctl]) { px.rect(g, X - 2, Y - 2, 5, 1, TT.seats[p.ctl].color); px.rect(g, X - 2, Y + 2, 5, 1, TT.seats[p.ctl].color); } }
  const b = m.ball; px.rect(g, Math.round(x0 + (b.x - G.DEAD[0]) * s), Math.round(y0 + (b.y - G.Y0) * s), 2, 2, '#ffffff');
};
HUD.seatCards = (g, m, W, H) => {
  TT.seats.forEach((s, i) => {
    if (s.kind === 'script' || s.pid < 0) return; const p = m.players[s.pid]; if (!p) return;
    const cw = 98, x = i % 2 === 0 ? 6 + (i >> 1) * (cw + 4) : W - 6 - cw - (i >> 1) * (cw + 4), y = H - 40;
    E.ui.box(g, x, y, cw, 34, { bg: ['#1a2238', '#0c1020'], border: s.color, alpha: .85 });
    const rig = PR.rigs[p.id]; if (rig) rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 2.4, bg: '#2a3450' });
    E.font.text(g, s.label + ' ' + TT.ascii(p.data.nick).slice(0, 13), x + 34, y + 4, s.color, { font: 'tiny', outline: false });
    E.font.text(g, p.role, x + 34, y + 11, '#a8b0c8', { font: 'tiny', outline: false });
    E.ui.bar(g, x + 34, y + 19, cw - 40, 4, p.turbo, p.turboOn ? '#ffe040' : '#40c0ff');
    E.font.text(g, 'TURBO', x + 34, y + 25, '#6a7490', { font: 'tiny', outline: false });
    if (p.power) E.font.text(g, TT.POWERUPS[p.power.kind].name.split(' ')[0] + ' ' + Math.ceil(p.power.t), x + 60, y + 25, '#ffd040', { font: 'tiny', outline: false });
    if (p.fire > 0) E.font.text(g, 'ON FIRE', x + 60, y + 11, '#ff8030', { font: 'tiny', outline: false });
  });
};
/** the context prompts: what the buttons do now, for the first local seat */
HUD.prompts = (g, m, W, H, big) => {
  const s = TT.seats.find(q => q.kind === 'local'); if (!s || s.pid < 0) return;
  const p = m.players[s.pid], I = s.input, b = m.ball;
  let txt = '';
  if (m.phase === 'play') {
    if (b.holder === p.id) {
      const tl = tryLineOf(p.team), inGoal = (p.x - tl) * dirOf(p.team) > 0, zone = (tl - p.x) * dirOf(p.team) < 245;
      txt = inGoal ? '{b:x} DIVE! GROUND IT' : '{b:l1}{b:r1} PASS  {b:x} STEP  {b:sq} FEND  {b:ci} ' + (zone ? 'HOLD: DROP GOAL' : 'KICK');
      if (m.hype[p.team] >= 100) txt += '  {b:tri} THUNDER RUN';
    } else if (b.st === 'held' && m.players[b.holder].team !== p.team) {
      txt = '{b:x} TACKLE (HOLD: BIG HIT)  {b:sq} DIVE  {b:ci} SWITCH';
      if (m.hype[p.team] >= 100) txt += '  {b:tri} HURRICANE';
    } else txt = '{b:turbo} TURBO  {b:ci} SWITCH  {b:l1}{b:r1} SWITCH UP/DOWN';
  } else if (m.phase === 'ruck') txt = humansOf(m.ph.team).length && p.team === m.ph.team ? 'MASH {b:x} TO WIN THE RUCK!' : 'MASH {b:x}!   {b:sq} JACKAL (FIRST THERE)';
  else if (m.phase === 'walkout') txt = '{b:x} SKIP';
  else if (m.phase === 'half') txt = '{b:x} SECOND HALF';
  else if (m.phase === 'kickoff' && m.ph.kicker === p.id) txt = 'STICK AIMS  HOLD {b:ci} POWER, LET GO TO KICK';
  if (!txt) return;
  const y = (TT.comm.talk && TT.comm.talk.open ? H - 76 : H - (TT.seats.some(q => q.kind === 'local' && q.pid >= 0) ? 54 : 18)) - (big ? 6 : 0);
  E.ui.box(g, W / 2 - 150, y - 4, 300, big ? 18 : 15, { bg: '#0c1020', border: '#3a4460', alpha: .7, gradient: false });
  TT.prompt(g, txt, W / 2, y, I);
};

/* ---- the set pieces' widgets ---- */
HUD.widgets = (g, m, W, H, r) => {
  const cx = W / 2, cy = H / 2, ph = m.ph, s = m.sub, I = (TT.seats.find(q => q.kind === 'local') || {}).input;
  TT.mouse && (TT.mouse.kickAim = null, TT.mouse.cards = null);
  if (m.phase === 'ruck') {
    const v = ph.bar, w = 160, x = cx - w / 2, y = 62;
    E.ui.box(g, x - 4, y - 14, w + 8, 26, { bg: '#0c1020', border: '#e8c040', alpha: .85 });
    E.font.text(g, 'RUCK!', cx, y - 11, '#ffe080', { align: 'center', outline: false });
    px.rect(g, x, y, w / 2, 7, m.kits[1 - ph.team].cloth); px.rect(g, cx, y, w / 2, 7, m.kits[ph.team].cloth);
    const k = Math.round(cx + v * w / 2); px.rect(g, k - 2, y - 2, 4, 11, '#ffffff');
    E.font.text(g, m.teams[1 - ph.team].short, x + 2, y + 1, '#000', { font: 'tiny', outline: false }); E.font.text(g, m.teams[ph.team].short, x + w - 2, y + 1, '#000', { font: 'tiny', outline: false, align: 'right' });
  }
  if (m.phase === 'scrum') {
    const y = Math.round(H * .3);
    if (s === 'crouch' || s === 'bind') E.font.title(g, s.toUpperCase() + '...', cx, y - 10, { align: 'center', scale: 3, colors: ['#ffffff', '#c8d8ff'] });
    if (s === 'set') {
      const u = clamp(ph.subT / .5, 0, 1.3), rad = Math.round(lerp(40, 10, Math.min(1, u)));
      E.font.title(g, 'SET!', cx, y - 10, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ff8a40'] });
      const ptsR = n => { for (let a = 0; a < TAU; a += TAU / n) px.rect(g, Math.round(cx + Math.cos(a) * rad), Math.round(y + 40 + Math.sin(a) * rad * .6), 2, 2, u >= 1 ? '#60ff80' : '#ffffff'); };
      ptsR(28); for (let a = 0; a < TAU; a += TAU / 20) px.rect(g, Math.round(cx + Math.cos(a) * 10), Math.round(y + 40 + Math.sin(a) * 6), 1, 1, '#60ff80');
      TT.prompt(g, '{b:x} WHEN THE RING CLOSES', cx, y + 70, I);
    }
    if (s === 'push' || s === 'result') {
      const w = 180, x = cx - w / 2, v = ph.bar, feed = ph.team;
      E.ui.box(g, x - 4, y - 16, w + 8, 30, { bg: '#0c1020', border: '#e8c040', alpha: .85 });
      E.font.text(g, ph.grade ? 'SCRUM: ' + (ph.grade[0] || '') + ' / ' + (ph.grade[1] || '') : 'SCRUM', cx, y - 13, '#ffe080', { align: 'center', outline: false });
      px.rect(g, x, y, w / 2, 8, m.kits[1 - feed].cloth); px.rect(g, cx, y, w / 2, 8, m.kits[feed].cloth);
      const k = Math.round(cx + v * w / 2); px.rect(g, k - 2, y - 2, 4, 12, '#ffffff');
      if (s === 'push') TT.prompt(g, 'ALTERNATE {b:l1} {b:r1} TO SHOVE!', cx, y + 20, I);
    }
  }
  if (m.phase === 'lineout' && (s === 'call' || s === 'throw' || s === 'flight')) {
    const hu = [humansOf(0).length > 0, humansOf(1).length > 0], y = cy - 76, names = ['FRONT', 'MIDDLE', 'BACK'];
    TT.mouse && (TT.mouse.cards = []);
    for (let k = 0; k < 3; k++) {
      const x = cx - 105 + k * 72, mine = [0, 1].filter(t => hu[t] && ph.call[t] === k);
      E.ui.box(g, x, y, 66, 18, { bg: mine.length ? '#3a4a20' : '#141a2a', border: mine.length ? '#e8e060' : '#4a5470', alpha: .9 });
      E.font.text(g, names[k], x + 33, y + 6, '#ffffff', { align: 'center', outline: false });
      mine.forEach((t, j) => px.rect(g, x + 4 + j * 6, y + 3, 4, 4, m.kits[t].cloth));
      if (TT.mouse) TT.mouse.cards.push([x, y, 66, 18, k]);
    }
    if (s === 'call') TT.prompt(g, '{b:l1}{b:r1} PICK A POD  {b:x} CALL IT', cx, y + 24, I);
    if (s === 'throw' && hu[ph.team]) {
      const w = 160, x = cx - w / 2, yy = y + 30;
      px.rect(g, x, yy, w, 8, '#c83030'); px.rect(g, cx - w * .35, yy, w * .7, 8, '#e8c040'); px.rect(g, cx - w * .175, yy, w * .35, 8, '#40c060');
      const nx = Math.round(cx + ph.needle * w / 2); px.rect(g, nx - 1, yy - 3, 3, 14, '#ffffff');
      TT.prompt(g, '{b:x} THROW IN THE GREEN', cx, yy + 14, I);
    }
  }
  if (m.phase === 'kickoff' && m.ph.holding) { const w = 80; E.ui.bar(g, cx - w / 2, H - 80, w, 6, m.ph.power, m.ph.power > .85 ? '#60ff80' : '#ffd040'); }
  if (m.phase === 'penalty') {
    const hu = humansOf(ph.team).length > 0, n = ph.opts.length, cw = 104, y = cy - 50;
    E.font.title(g, ph.free ? 'FREE KICK' : 'PENALTY', cx, y - 26, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
    E.font.text(g, m.teams[ph.team].short + ' TO CHOOSE', cx, y - 8, '#c8d0e8', { align: 'center', outline: '#000' });
    TT.mouse && (TT.mouse.cards = []);
    ph.opts.forEach((o, i) => {
      const x = Math.round(cx - n * (cw + 6) / 2 + i * (cw + 6)), on = ph.choice === i;
      E.ui.box(g, x, y, cw, 50, { bg: on ? ['#3a4a70', '#1a2440'] : ['#1a2030', '#0c1020'], border: on ? '#ffe060' : '#4a5470', alpha: .95 });
      E.font.text(g, o[1], x + cw / 2, y + 10, on ? '#ffe060' : '#ffffff', { align: 'center', outline: false });
      E.font.text(g, o[2], x + cw / 2, y + 26, '#a8b0c8', { align: 'center', font: 'tiny', outline: false, wrap: cw - 8 });
      if (TT.mouse) TT.mouse.cards.push([x, y, cw, 50, i]);
    });
    if (hu) TT.prompt(g, '{b:l1}{b:r1} OR STICK CHOOSE  {b:x} PICK', cx, y + 58, I);
  }
  if (m.phase === 'setkick') HUD.kickWidget(g, m, W, H, I);
  if (m.phase === 'half') HUD.halftime(g, m, W, H);
  if (m.phase === 'stop' && ph.label) E.font.title(g, ph.label, cx, H * .3, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
};
/** the set kick: the posts from behind the kicker, the reticle (with its sway), the wind, the meter, the clock */
HUD.kickWidget = (g, m, W, H, I) => {
  const ph = m.ph, s = m.sub, k = m.players[ph.kicker], hu = ph.human;
  const bw = 104, bh = 76, x0 = 8, y0 = 62;
  E.ui.box(g, x0, y0, bw, bh, { bg: ['#2a3a60', '#3a6a3a'], border: '#e8c040', alpha: .95 });
  const D = Math.max(40, ph.D || 100), k2 = clamp(160 / D, .35, 1);
  const cx = x0 + bw / 2, gy = y0 + bh - 14, pw = Math.round(bw * .3 * k2), barY = Math.round(gy - (bh - 30) * .42 * k2), topY = Math.max(y0 + 6, Math.round(gy - (bh - 30) * .95 * k2)), sc = pw / 60 * 1.4;
  const ang = Math.atan2(G.CY - ph.ky, ph.tl - (ph.kx || ph.tl)) - (dirOf(ph.team) > 0 ? 0 : PI), off = clamp(Math.round(TT.angDiff(0, ang) * 30) * (dirOf(ph.team) > 0 ? 1 : -1), -bw / 2 + pw + 4, bw / 2 - pw - 4);
  const pcx = cx - off;
  px.rect(g, x0 + 2, gy, bw - 4, bh - (gy - y0) - 2, '#3a7a3a');
  px.rect(g, pcx - pw, topY, 2, gy - topY, '#f4f4f0'); px.rect(g, pcx + pw - 1, topY, 2, gy - topY, '#f4f4f0'); px.rect(g, pcx - pw, barY, pw * 2 + 1, 2, '#f4f4f0');
  px.rect(g, pcx - pw - 1, gy - 8, 4, 8, m.kits[0].cloth); px.rect(g, pcx + pw - 2, gy - 8, 4, 8, m.kits[0].cloth);
  const rx = Math.round(clamp(cx + (ph.aim + (hu ? ph.sway : 0)) * sc, x0 + 6, x0 + bw - 6)), ry = barY - 14;
  px.rect(g, rx - 5, ry, 11, 1, '#ff4040'); px.rect(g, rx, ry - 5, 1, 11, '#ff4040'); px.rect(g, rx - 2, ry - 2, 5, 5, '#ff8080');
  // the wind
  if (m.wind.s > .05) { const a = m.wind.a; px.line(g, x0 + 16, y0 + 14, Math.round(x0 + 16 + Math.cos(a) * 10), Math.round(y0 + 14 + Math.sin(a) * 6), '#ffffff', 1); E.font.text(g, 'WIND', x0 + 6, y0 + 22, '#e8f0ff', { font: 'tiny', outline: false }); }
  E.font.text(g, TT.metres(ph.D || 0) + ' M', x0 + bw - 6, y0 + 6, '#ffffff', { align: 'right', outline: '#000' });
  E.font.text(g, ph.kind === 'conv' ? 'CONVERSION' : 'PENALTY GOAL', W / 2, 50, '#ffe080', { align: 'center', outline: '#000' });
  if (s !== 'flight' && s !== 'result') E.font.text(g, ':' + String(Math.ceil(ph.clock)).padStart(2, '0'), x0 + 6, y0 + bh - 10, ph.clock < 6 ? '#ff6050' : '#ffffff', { font: 'tiny', outline: '#000' });
  // the meter: the mark the distance needs, the sweet band above it
  const mx = x0 + bw + 6, mh = bh - 10, my = y0 + 5;
  px.rect(g, mx, my, 8, mh, '#141820');
  const need = ph.need || .5, band = m.megaBoot[ph.team] > 0 ? .12 : .06;
  px.rect(g, mx + 1, Math.round(my + mh * (1 - Math.min(1, need + band * 2))), 6, Math.max(2, Math.round(mh * band * 2)), '#40c060');
  px.rect(g, mx, Math.round(my + mh * (1 - need)), 8, 1, '#ffffff');
  px.rect(g, mx + 2, Math.round(my + mh * (1 - ph.power)), 4, Math.round(mh * ph.power), '#ffd040');
  if (hu) {
    if (s === 'place') TT.prompt(g, 'STICK: MOVE THE TEE  {b:x} SET IT', W / 2, H - 92, I);
    if (s === 'aim') TT.prompt(g, 'STICK OR MOUSE: AIM  HOLD {b:ci} POWER, LET GO', W / 2, H - 92, I);
    if (TT.mouse && s === 'aim') TT.mouse.kickBox = [x0, y0, bw, bh, sc];
  }
  if (s === 'result' && ph.result) E.font.title(g, ph.result === 'good' ? (ph.kind === 'conv' ? 'CONVERTED!' : 'GOOD!') : ph.result === 'doink' ? 'DOINK!' : 'WIDE!', W / 2, 70, { align: 'center', scale: 2, colors: ph.result === 'good' ? ['#ffffff', '#80ff90'] : ['#ffffff', '#ff8070'] });
  void k;
};
HUD.halftime = (g, m, W, H) => {
  E.ui.box(g, W / 2 - 150, H / 2 - 70, 300, 130, { bg: ['#2a1c14', '#140c08'], border: '#e8c040', alpha: .95 });
  E.font.title(g, 'HALF-TIME', W / 2, H / 2 - 62, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  E.font.text(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, W / 2, H / 2 - 36, '#ffffff', { align: 'center', outline: false, scale: 2 });
  const tiles = [['TRIES', m.stats[0].tries, m.stats[1].tries], ['TACKLES', m.stats[0].tackles, m.stats[1].tackles], ['BIG HITS', m.stats[0].bigHits, m.stats[1].bigHits], ['METRES', TT.metres(m.stats[0].metres), TT.metres(m.stats[1].metres)]];
  tiles.forEach(([lab, a, b], i) => { const x = W / 2 - 132 + i * 66, y = H / 2 - 14; E.ui.box(g, x, y, 62, 30, { bg: '#1a2238', border: '#4a5470', alpha: .9 }); E.font.text(g, lab, x + 31, y + 3, '#a8b0c8', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, a + ' - ' + b, x + 31, y + 14, '#ffffff', { align: 'center', outline: false }); });
  const line = M.o.cup && TT.STORY[M.o.cup] && TT.STORY[M.o.cup].half;
  if (line) { const rig = TT.castRig('gristle'); rig.drawPortrait(g, W / 2 - 144, H / 2 + 22, 30, { zoom: 2.4, bg: '#3a2a1a' }); E.font.text(g, '"' + line.replace(/\{[^}]*\}/g, '') + '"', W / 2 - 108, H / 2 + 24, '#ffe8c0', { outline: false, wrap: 250, font: 'tiny' }); }
};
