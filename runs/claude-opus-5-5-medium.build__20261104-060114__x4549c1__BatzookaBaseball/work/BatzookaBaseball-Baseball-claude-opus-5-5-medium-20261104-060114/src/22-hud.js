/* HUD, 10-foot rules: big, bold and few things at once, anchored to r.W / r.H with a 12 px safe margin, clear of the
 * corner buttons. Scorebug, meters, the player card, prompts in the last device's glyphs, call stamps, pitch info, the
 * radar, the pitch-select diamond, banners, the line score, timing feedback and the Derby and Rhubarb panels. */
const SAFE = 12;
const STAMPS = [];
function stamp(text, colors, o = {}) { STAMPS.length = 0; STAMPS.push({ text, colors: colors || ['#ffffff', '#ffe680', '#ff9a2a'], t: 0, life: o.life || 1.4, scale: o.scale || 3, sub: o.sub || '', ump: !!o.ump }); }
const GOLD = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], RED = ['#ffffff', '#ff9a9a', '#e8443a'], BLUE = ['#ffffff', '#a8c8ff', '#3b82f6'], GREEN = ['#ffffff', '#a8ffd0', '#22c55e'];
BZ.bus.on('call', d => { if (!M || M.derby) return; if (d.kind === 'strike') { stamp(d.three ? 'STRIKE THREE!' : 'STEE-RIKE!', RED, { ump: true }); if (!M.fast) babble.say(d.three ? 'STEE-RIIIKE THREE!' : 'STEE-RIIIKE!', 'ump'); } else if (d.kind === 'ball') { stamp(d.four ? 'BALL FOUR' : 'BALL', BLUE, { scale: d.four ? 3 : 2, ump: true }); if (!M.fast) babble.say('BALL!', 'ump'); } else stamp('FOUL BALL', ['#ffffff', '#ffe680', '#c8a040'], { scale: 2, ump: true }); });
BZ.bus.on('out', d => { if (M && d.how !== 'k') stamp('YER OUT!', RED); });
BZ.bus.on('hit', d => stamp(d.bases === 1 ? 'SINGLE!' : d.bases === 2 ? 'DOUBLE!' : d.bases === 3 ? 'TRIPLE!' : 'INSIDE-THE-PARK!', GREEN));
BZ.bus.on('homer', d => stamp(d.batzooka ? 'BATZOOKA!!!' : 'HOME RUN!', GOLD, { scale: 4, life: 2.2, sub: d.dist + ' FT' + (d.golden ? '  x2 GOLDEN!' : '') }));
BZ.bus.on('doublePlay', () => stamp('DOUBLE PLAY!', GOLD));
BZ.bus.on('triplePlay', () => stamp('TRIPLE PLAY!!', GOLD, { scale: 4 }));
BZ.bus.on('groundRuleDouble', () => stamp('GROUND-RULE DOUBLE', GREEN, { scale: 2 }));
BZ.bus.on('error', () => stamp('CLANK! ERROR', RED, { scale: 2 }));
BZ.bus.on('fizzle', () => stamp('FIZZLE!', ['#ffffff', '#c8c8c8', '#6a6a6a']));
BZ.bus.on('walk', () => stamp('TAKE YOUR BASE', BLUE, { scale: 2 }));
BZ.bus.on('hbp', () => stamp('HIT BY PITCH', BLUE, { scale: 2 }));
BZ.bus.on('rhubarbStart', () => stamp('RHUBARB!', RED, { scale: 4, life: 1.6 }));
BZ.bus.on('rhubarbEnd', () => stamp('BREAK IT UP!', BLUE, { scale: 3 }));
BZ.bus.on('catch', d => { if (d.robbed) stamp('ROBBED!', GOLD, { scale: 4 }); else if (d.dive) stamp('WHAT A GRAB!', GREEN); });
BZ.bus.on('meterFull', d => { if (M && d.team === M.half && !M.fast) stamp('BATZOOKA READY!', GOLD, { scale: 2, life: 1.6 }); sfx('ding'); });
BZ.bus.on('bowlOver', d => stamp('COLLISION!', RED, { scale: 3, sub: d.won ? 'SAFE!' : 'OUT!' }));
BZ.bus.on('steal', () => {});
BZ.bus.on('derbyOut', d => stamp(d.why, RED, { scale: 2, life: 1 }));
BZ.bus.on('walkoff', () => stamp('WALK-OFF!', GOLD, { scale: 4, life: 2.5 }));
BZ.bus.on('super', d => { if (d.kind === 'laser') stamp('LASER ARM!', RED, { scale: 2 }); if (d.kind === 'burners') stamp('AFTERBURNERS!', GOLD, { scale: 2 }); if (d.kind === 'pitch') stamp(PITCHES[d.type].name + '!', GOLD, { scale: 2 }); });
const FEED = { text: '', t: 0 };
BZ.bus.on('contact', d => { if (M && M.lastContact) FEED.text = M.lastContact.grade === 'PERFECT' ? 'PERFECT!' : (M.lastContact.timingMs < -10 ? 'EARLY ' + -M.lastContact.timingMs + ' MS' : M.lastContact.timingMs > 10 ? 'LATE ' + M.lastContact.timingMs + ' MS' : 'ON TIME') + (M.lastContact.launch < 0 ? ' · TOPPED' : M.lastContact.launch > 40 ? ' · UNDER IT' : ''); FEED.t = 1.6; });
BZ.bus.on('miss', d => { FEED.text = Math.abs(d.e) > swingWindow() ? (d.e < 0 ? 'EARLY ' : 'LATE ') + Math.round(Math.abs(d.e) * 1000) + ' MS' : 'MISSED THE BALL'; FEED.t = 1.4; });

function hudTick(dt) { radioTick(dt); for (const s of STAMPS) s.t += dt; while (STAMPS.length && STAMPS[0].t > STAMPS[0].life) STAMPS.shift(); FEED.t = Math.max(0, FEED.t - dt); }
const text = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
function cornerW() { const ca = game.cornerArea && game.cornerArea(); return ca && ca.y0 < 40 ? Math.max(0, game.W - ca.x0) : 0; }

function drawHUD(r) {
  if (!M) return;
  r.overlay(g => {
    const W = r.W, H = r.H, cine = M.phase === 'homer' && M.cam === 'moonshot';
    if (!cine && !M.derby) scorebug(g, W, H);
    if (M.derby) derbyHUD(g, W, H);
    if (!cine) meters(g, W, H);
    // stamps
    for (const s of STAMPS) {
      const k = Math.min(1, s.t / .12), sc = Math.max(2, Math.round(s.scale * (k < 1 ? .6 + .4 * k : 1))), y = Math.round(H * .3);
      E.font.title(g, s.text, W / 2, y, { scale: sc, colors: s.colors, align: 'center', depth: 2 });
      if (s.sub) text(g, s.sub, W / 2, y + sc * 9 + 2, '#ffffff', { align: 'center', scale: 2 });
      if (s.ump && M.cam === 'plate') { try { castRig('ump').drawPortrait(g, W / 2 - E.font.width(s.text, { scale: sc }) / 2 - 40, y - 4, 34, { bg: '#1a2040' }); } catch (e) { /* first frame */ } }
    }
    // banners by phase
    if (M.phase === 'pregame') banner(g, W, H, 'PLAY BALL!', M.teams[0].def.city + ' ' + M.teams[0].def.name + '  AT  ' + M.teams[1].def.city + ' ' + M.teams[1].def.name);
    if (M.phase === 'halfStart' && !M.derby) banner(g, W, H, (M.half ? 'BOTTOM ' : 'TOP ') + ordinal(M.inning), M.bonusRunner ? 'BONUS RUNNER ON SECOND' : offense().def.name + ' BATTING');
    if (M.phase === 'halfEnd') { if (M.show && M.phaseT > 1.4) banner(g, W, H, M.show.title, 'BETWEEN INNINGS', true); else { banner(g, W, H, 'SIDE RETIRED', '', true); lineScore(g, W, H); } }
    if (M.phase === 'rhubarb' && M.rhubarb) rhubarbHUD(g, W, H);
    // the at-bat
    if (['select', 'windup', 'flight', 'afterPitch', 'walkUp'].includes(M.phase)) {
      card(g, W, H);
      if (M.phase === 'select' && !autoPit()) pitchMenu(g, W, H);
      if (M.pitch && M.phase === 'afterPitch' && M.pitch.speed) text(g, M.pitch.def.name + '  ' + mph(M.pitch.speed) + ' MPH' + (M.pitch.def.kind === 'super' ? '!!' : ''), W / 2, H * .2 + 34, '#e8e0ff', { align: 'center' });
      if (FEED.t > 0 && ((game.settings.timingFeedback !== false && game.settings.batAssist !== 'off') || M.diffId === 'rookie' || M.lesson)) text(g, FEED.text, W / 2, H * .62, FEED.text === 'PERFECT!' ? '#4fe0b0' : '#ffe680', { align: 'center', scale: 2 });
    }
    if (M.cam === 'broadcast' && M.phase === 'inPlay') radar(g, W, H);
    promptsDraw(g, W, H);
    radioDraw(g, W, H);
    if (M.cheats.showAI && M.phase === 'flight' && M.pitch) timingBar(g, W, H);
  });
}
function scorebug(g, W, H) {
  const x = SAFE, y = SAFE, w = 118, h = 46;
  E.ui.box(g, x, y, w, h, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .9 });
  M.teams.forEach((t, i) => {
    const yy = y + 5 + i * 19; px.rect(g, x + 4, yy, 4, 14, t.def.chip); px.rect(g, x + 8, yy, 2, 14, t.def.chip2);
    text(g, t.def.abbr, x + 14, yy + 1, i === M.half ? '#ffe680' : '#ffffff', { scale: 2 });
    text(g, String(t.runs), x + 74, yy + 1, '#ffffff', { scale: 2, align: 'right' });
  });
  // inning, outs, count, bases
  const ix = x + 80; text(g, (M.half ? '↓' : '↑') + M.inning, ix, y + 5, '#ffe680', { scale: 1 });
  for (let i = 0; i < 2; i++) px.disc(g, ix + 3 + i * 7, y + 17, 2.5, i < M.outs ? '#ff4a4a' : '#3a3c4a');
  const bx = ix + 26, by = y + 14, D_ = (k, dx, dy) => { const on = !!runnerOn(k); px.poly(g, [[bx + dx, by + dy - 4], [bx + dx + 4, by + dy], [bx + dx, by + dy + 4], [bx + dx - 4, by + dy]], on ? '#ffe680' : '#3a3c4a'); };
  D_(2, 0, -5); D_(3, -6, 1); D_(1, 6, 1);
  const cy = y + 32; text(g, 'B', ix, cy, '#a8c8ff'); for (let i = 0; i < 3; i++) px.disc(g, ix + 10 + i * 6, cy + 3, 2, i < M.balls ? '#3b82f6' : '#3a3c4a');
  text(g, 'S', ix, cy + 8, '#ff9a9a'); for (let i = 0; i < 2; i++) px.disc(g, ix + 10 + i * 6, cy + 11, 2, i < M.strikes ? '#e8443a' : '#3a3c4a');
}
function meters(g, W, H) {
  const cw = cornerW(), x1 = W - SAFE - cw, w = 96, x = x1 - w, y = SAFE;
  const T = offense(), full = T.meter >= 100;
  E.ui.box(g, x, y, w, 30, { bg: ['#1a1c2a', '#0c0d14'], border: full ? (Math.floor(game.real * 6) % 2 ? '#ffe680' : '#ff8a2a') : '#c8c8d8', alpha: .9 });
  text(g, M.armed ? 'ARMED!' : full ? 'BATZOOKA READY' : 'BATZOOKA', x + 4, y + 3, full ? '#ffe680' : '#ffffff');
  // the bat-shaped gauge: a handle then a fat barrel, filling with flame
  const gx = x + 4, gy = y + 13, gw = w - 8, f = T.meter / 100;
  px.rect(g, gx, gy + 2, gw * .3, 4, '#3a2a1a'); px.rect(g, gx + gw * .3, gy, gw * .7, 8, '#3a2a1a');
  const fw = gw * f; px.rect(g, gx, gy + 2, Math.min(fw, gw * .3), 4, '#ff8a2a'); if (fw > gw * .3) px.rect(g, gx + gw * .3, gy, fw - gw * .3, 8, full ? '#ffe060' : '#ff8a2a');
  if (full) px.blend(g, .5, 'add', () => { for (let i = 0; i < 6; i++) px.disc(g, gx + gw * .3 + RF() * gw * .7, gy + RF() * 8, 2, '#ffb030'); });
  text(g, T.def.abbr, x + w - 4, y + 3, '#c8c8d8', { align: 'right' });
  // turbo and wind
  E.ui.bar(g, x, y + 34, w, 4, (M.teams[M.cam === 'broadcast' && M.phase === 'inPlay' && defHumanInput() ? 1 - M.half : M.half].turbo) / 100, '#4fe0b0');
  if (M.park.wind && (M.wind.x || M.wind.y)) { const a = Math.atan2(M.wind.y, M.wind.x), s = Math.hypot(M.wind.x, M.wind.y), cx = x + 8, cy = y + 48; px.line(g, cx - Math.cos(a) * 5, cy + Math.sin(a) * -5, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, '#ffffff'); px.disc(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 1.5, '#ffffff'); text(g, 'WIND ' + Math.round(s * 1.2) + ' MPH', cx + 9, cy - 3, '#c8c8d8'); }
}
function card(g, W, H) {
  const human = !autoPit() && autoBat(), p = human ? defense().pitcher : batterNow(), x = SAFE, y = H - SAFE - 58 - (game.players.length > 2 ? 16 : 0), w = 150;
  E.ui.box(g, x, y, w, 40, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .88 });
  const rig = p.rigs && (p.rigs.bat || p.rigs.field); if (rig) try { rig.drawPortrait(g, x + 3, y + 3, 34, { bg: TEAMS[p.team].chip }); } catch (e) { /* portrait before its first update */ }
  text(g, p.name.length > 22 ? p.name.slice(0, 22) : p.name, x + 41, y + 5, '#ffffff');
  if (human) { const st = stamOf(1 - M.half, p); text(g, 'STAMINA', x + 41, y + 16, '#c8c8d8'); E.ui.bar(g, x + 41, y + 26, w - 48, 5, st / 100, st < 40 ? '#e8443a' : '#4fe0b0'); }
  else { const s = pStat(p); text(g, (s.ab ? (s.h / s.ab).toFixed(3).replace(/^0/, '') : '---') + '  ' + s.h + '-' + s.ab + '  HR ' + s.hr, x + 41, y + 16, '#c8c8d8'); text(g, 'POW ' + p.pow + ' CON ' + p.con + ' SPD ' + p.spd + '  ' + (p.bats === 'L' ? 'LEFTY' : 'RIGHTY'), x + 41, y + 27, '#8a8ca8'); }
}
function pitchMenu(g, W, H) {
  const I = pitIn(), list = pitchesOf(defense().pitcher), cx = W - SAFE - 70 - cornerW() * 0, cy = H - SAFE - 74;
  const pos = [[0, 24], [36, 0], [-36, 0], [0, -24]], acts = ['south', 'east', 'west', 'north'];
  E.ui.box(g, cx - 72, cy - 40, 144, 86, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .85 });
  list.forEach((id, i) => { const [dx, dy] = pos[i], sel = M.sel === i; glyph(g, I, I.lastDevice === 'keyboard' ? 'num' + (i + 1) : acts[i], cx + dx - 5, cy + dy - 5, 11); text(g, PITCHES[id].name.split(' ')[0], cx + dx, cy + dy + 7, sel ? '#ffe680' : '#ffffff', { align: 'center' }); });
  const sup = TEAMS[defense().pitcher.team].superPitch, ok = defense().meter >= 100;
  glyph(g, I, I.lastDevice === 'keyboard' ? 'num5' : 'r1', cx - 60, cy + 30, 11); text(g, PITCHES[sup].name + (ok ? '' : ' ' + Math.floor(defense().meter) + '%'), cx - 44, cy + 32, ok ? '#ffe680' : '#6a6c80');
}
function radar(g, W, H) {
  const cw = cornerW(), s = 0.055, w = 80, h = 74, x = W - SAFE - cw - w, y = SAFE + 62, ox = x + w / 2, oy = y + h - 6;
  E.ui.box(g, x, y, w, h, { bg: ['#0c2014', '#06100a'], border: '#5a8a6a', alpha: .75 });
  const P_ = (wx, wy) => [ox + (wx - HX) * s, oy + (wy - HY) * s];
  for (let i = 0; i <= 20; i++) { const th = -D45 + i * Math.PI / 40, R0 = fenceR(M.park, th), [ux, uy] = dirOf(th), p = P_(HX + ux * R0, HY + uy * R0); px.dot(g, p[0], p[1], '#c8e8c8'); }
  for (let k = 0; k < 4; k++) { const bp = basePos(k), p = P_(bp.x, bp.y); px.rect(g, p[0] - 1, p[1] - 1, 2, 2, runnerOn(k) ? '#ffe680' : '#ffffff'); }
  for (const F of M.fielders) { const p = P_(F.x, F.y); px.disc(g, p[0], p[1], 1.5, F.human ? '#4a8aff' : defense().def.chip); }
  for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') { const p = P_(r.x, r.y); px.disc(g, p[0], p[1], 1.5, offense().def.chip2 || '#ffffff'); }
  if (M.ball) { const p = P_(M.ball.x, M.ball.y); px.disc(g, p[0], p[1], 1.6, '#ffffff'); }
}
function banner(g, W, H, big, small, low) {
  const y = low ? H * .14 : H * .36;
  E.ui.box(g, W / 2 - 150, y - 6, 300, small ? 52 : 40, { bg: ['#2a1c3a', '#120c1c'], border: '#ffe680', alpha: .9 });
  E.font.title(g, big, W / 2, y, { scale: 3, colors: GOLD, align: 'center', depth: 2 });
  if (small) text(g, small, W / 2, y + 32, '#ffffff', { align: 'center' });
}
function lineScore(g, W, H) {
  const n = Math.max(M.innings, M.inning), cols = Math.min(n, 9), x = W / 2 - (60 + cols * 14 + 40) / 2, y = H * .14 + 56;
  E.ui.box(g, x, y, 60 + cols * 14 + 46, 40, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .92 });
  for (let i = 0; i < cols; i++) text(g, String(n - cols + i + 1), x + 58 + i * 14, y + 4, '#8a8ca8', { align: 'center' });
  text(g, 'R  H  E', x + 60 + cols * 14 + 4, y + 4, '#8a8ca8');
  M.teams.forEach((t, k) => { const yy = y + 15 + k * 11; text(g, t.def.abbr, x + 6, yy, '#ffffff'); for (let i = 0; i < cols; i++) { const v = t.line[n - cols + i]; text(g, v === undefined ? '-' : String(v), x + 58 + i * 14, yy, '#ffffff', { align: 'center' }); } text(g, t.runs + '  ' + t.hits + '  ' + t.errors, x + 60 + cols * 14 + 4, yy, '#ffe680'); });
}
function derbyHUD(g, W, H) {
  const D = M.derby, x = SAFE, y = SAFE;
  E.ui.box(g, x, y, 132, 58, { bg: ['#1a1c2a', '#0c0d14'], border: '#ffe680', alpha: .9 });
  text(g, 'BATZOOKA DERBY', x + 5, y + 4, '#ffe680');
  text(g, fmt(D.score) + ' FT', x + 5, y + 15, '#ffffff', { scale: 2 });
  text(g, 'HR ' + D.hrs + (D.maxOuts < 99 ? '   OUTS ' + D.outs + '/' + D.maxOuts : '   OUTS ' + D.outs), x + 5, y + 33, '#c8c8d8');
  if (D.clock) { const s = Math.ceil(D.time); text(g, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), x + 5, y + 44, s < 15 ? '#ff6a6a' : '#ffffff'); }
  if (D.golden && ['select', 'windup', 'flight'].includes(M.phase)) E.font.title(g, 'GOLDEN BALL x2', W / 2, H * .12, { scale: 2, colors: GOLD, align: 'center' });
  if (BZ.derbyLabel) text(g, BZ.derbyLabel, W / 2, SAFE, '#ffffff', { align: 'center', scale: 2 });
}
function rhubarbHUD(g, W, H) {
  const RB = M.rhubarb; E.ui.box(g, W / 2 - 70, SAFE, 140, 30, { bg: ['#3a1018', '#1a060c'], border: '#ff6a6a', alpha: .9 });
  text(g, M.teams[0].def.abbr + ' ' + RB.kd[0] + '  KNOCKDOWNS  ' + RB.kd[1] + ' ' + M.teams[1].def.abbr, W / 2, SAFE + 4, '#ffffff', { align: 'center' });
  text(g, String(Math.max(0, Math.ceil(RB.t))), W / 2, SAFE + 15, '#ffe680', { align: 'center', scale: 1 });
}
function timingBar(g, W, H) {
  const pt = M.pitch, x = W / 2 - 80, y = H - 70; px.rect(g, x, y, 160, 6, '#20222e');
  const win = swingWindow(), at = pt.T - SWINGS.contact.delay, k = 160 / (pt.T + .1);
  px.rect(g, x + (at - win) * k, y, win * 2 * k, 6, '#3a6a4a'); px.rect(g, x + (at - .022) * k, y, .044 * k, 6, '#4fe0b0'); px.rect(g, x + pt.t * k, y - 2, 1, 10, '#ffffff');
}
/* ---- prompts for the context, per human, at their side of the screen ---- */
function promptsFor(I) {
  if (!M || !I) return null;
  const sB = M.teams.findIndex(t => t.ctrl.cap === I || t.ctrl.co === I); if (sB < 0) return null;
  const off = sB === M.half, T = M.teams[sB], ph = M.phase, bat = off && inputOf(sB, 'bat') === I, pit = !off && inputOf(sB, 'pitch') === I, fld = !off && inputOf(sB, 'field') === I, run = off && inputOf(sB, 'run') === I;
  const pct = n => Math.floor(n) + '%';
  if (ph === 'rhubarb') return [['south', 'PUNCH'], ['west', 'SHOVE'], ['north', 'TOSS'], ['east', 'DODGE']];
  if (['pregame', 'halfStart', 'halfEnd', 'replay'].includes(ph)) return [['south', 'SKIP']];
  if (ph === 'homer') return M.phaseT > 2.4 ? [['south', 'SKIP TROT']] : null;
  if (bat && ['select', 'windup', 'flight', 'walkUp'].includes(ph)) return [['south', 'SWING'], ['west', 'POWER'], ['north', 'BUNT (HOLD)'], ['r1', M.armed ? 'ARMED!' : 'BATZOOKA', T.meter >= 100, pct(T.meter)], M.runners.length && ph === 'select' ? ['l1', '+ BASE: STEAL'] : null];
  if (pit && ph === 'select') return [M.runners.length ? ['l1', '+ BASE: PICKOFF'] : null, ['r1', 'SUPER PITCH', T.meter >= 100, pct(T.meter)]];
  if (pit && ph === 'windup') return [['south', 'RELEASE ON THE RING'], ['up', 'AIM']];
  if (pit && ph === 'flight') return [['up', 'AFTERTOUCH']];
  if (fld && ph === 'inPlay') { const h = holderF(); if (h && h.human) return [['east', '1ST'], ['north', '2ND'], ['west', '3RD'], ['south', 'HOME'], ['r1', '+ BASE: LASER', T.meter >= 50, pct(T.meter)]]; return [['r2', 'DIVE'], ['r1', 'JUMP / CLIMB'], ['l2', 'TURBO'], ['l1', 'SWITCH']]; }
  if (run && ph === 'inPlay') return [['r1', 'ALL GO'], ['l1', 'ALL BACK'], ['l2', 'TURBO'], ['r1', '+ L2: AFTERBURNERS', T.meter >= 50 && !M.burnUsed, pct(T.meter)]];
  return null;
}
function promptsDraw(g, W, H) {
  const ps = game.players;
  ps.forEach((I, i) => {
    const items = promptsFor(I); if (!items) return;
    const y = H - SAFE - 12 - (i >= 2 ? 16 : 0), solo = ps.length === 1;
    if (solo) promptRow(g, I, items, W / 2, y, 'center');
    else { text(g, I.name || 'P' + (i + 1), i % 2 ? W - SAFE : SAFE, y - 10, I.color || '#fff', { align: i % 2 ? 'right' : 'left' }); promptRow(g, I, items.slice(0, 3), i % 2 ? W - SAFE : SAFE, y, i % 2 ? 'right' : 'left'); }
  });
}
BZ.promptsFor = promptsFor;
