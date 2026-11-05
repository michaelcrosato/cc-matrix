/* AMERICAN FOOTBALL FIASCO: the view of the match. The field, the crowd, the seven a side, the ball; the HUD (the score bug,
 * the down and distance, the clock, the hot streak); the call cards (the human's play call); the banners; the radio (Animalese
 * babble voices, written in code); and the sounds, the music. */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, S = FF.sim, A = FF.A, P = FF.P, { px, clamp, lerp } = FF;
const V = FF.view = {};

/* ---- sounds and music: all written in code ---- */
A.define('whistle', { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 });
A.define('crowd', { wave: 'noise', freq: 600, to: 900, dur: 1.4, vol: .16, filter: 'lowpass' });
A.define('thump', { wave: 'sine', freq: 120, to: 70, dur: .09, vol: .32 });
A.define('pass', { wave: 'triangle', freq: 700, to: 1200, dur: .16, vol: .14 });
A.define('catch', { wave: 'square', freq: 980, to: 1400, dur: .1, vol: .16 });
A.define('dinged', { wave: 'triangle', freq: 1800, to: 500, dur: .45, vol: .2, vib: [14, .05] });
A.define('cheer', { wave: 'noise', freq: 900, to: 1500, dur: 1.8, vol: .2, filter: 'lowpass' });
// the game's song for the field: a bouncing bassline, a horn riff and the drums (a loop)
FF.song = { bpm: 150, steps: 4, tracks: [
  { wave: 'square', vol: .08, notes: 'E5 . G5 . A5 . G5 . | E5 . D5 . C5 . . . | G4 . A4 . C5 . A4 . | G4 - - - - . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . C3 G2 . C3 . G2 | A2 . A2 E2 . A2 . E2 | F2 . F2 C3 . F2 . C3 | G2 . G2 D3 . G2 . D3' },
  { wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s . h h' }] };
FF.titleSong = { bpm: 110, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'C5 . E5 . G5 . E5 . | D5 . F5 . A5 . F5 . | C5 . E5 . G5 . E5 . | D5 - - - - . . .' },
  { wave: 'triangle', vol: .28, notes: 'C3 . . . G2 . . . | A2 . . . E2 . . . | F2 . . . C3 . . . | G2 . . . D3 . . .' }] };

// the radio: the Animalese babble is one short blip per letter, its pitch from the letter's place in the line
let talk = null;
const babble = (i, dlg) => {
  const k = (i * 37 + (dlg && dlg.i ? dlg.i : 0) * 11) % 9, f = 240 + k * 36 + (i % 3) * 18;
  A.sfx({ wave: 'triangle', freq: f, to: f * (1.08 + (i % 4) * .04), dur: .07, vol: .08 });
};
FF.babble = babble;
FF.radio = (text, secs) => {
  if (!talk) talk = new E.Dialog(FF.game, { place: 'bottom', border: '#e8c070', voice: babble, speed: 40 });
  talk.say(text, { name: 'RADIO', auto: secs || 2.4, modal: false, alpha: .85 });
};
FF.talk = () => talk;

// the cheer: the scoring side's players raise their arms, the crowd jumps, the sound goes up
FF.cheer = (side, big) => {
  for (const p of S.all) if (p.side === side) p.cheerT = big ? 3 : 1.8;
  A.sfx('cheer'); if (big) A.sfx('whistle');
  V.excite = big ? 3 : 1.5; V.excideSide = side;
};
// a hit's text and sparks, in the world (a bouncing word over the man who took it)
FF.hitFx = (x, y, text, kind) => {
  const col = kind === 'mega' ? '#ffd36a' : '#ffffff';
  P.text(x, y, 26, text, col, { scale: kind === 'mega' ? 3 : 2, bounce: true });
  P.sparks(x, y, 10, 10, null, { color: '#fff4c0' });
  FF.game.shake(kind === 'mega' ? 5 : 2.5);
  FF.game.flash('#ffffff', .08, kind === 'mega' ? .5 : .25);
  A.sfx(kind === 'mega' ? 'explode' : 'hit');
  if (kind === 'mega') { A.sfx('dinged'); FF.game.freeze(.12); }
};
V.excite = 0; V.excideSide = -1;

/* ---- the sprites: the football, the pennant over a human player ---- */
const BALL = E.sprite(['..bbbbb..', '.bbbbbbb.', 'bbLbLbLbb', '.bbbbbbb.', '..bbbbb..'], { b: '#8a4a22', L: '#f4f0e0' });
const BALL2 = E.sprite(['..bbbbb..', '.bbLLLbb.', 'bbbLbLbbb', '.bbLLLbb.', '..bbbbb..'], { b: '#8a4a22', L: '#f4f0e0' });   // (the laces turn as it spins)
V.ball = BALL;

/* ---- drawing the field, the crowd, the players and the ball ---- */
V.draw = (r) => {
  if (!FF.field.map || !S.ball) return;                    // (an online round draws once its match is set up)
  const t = S.time, view = E.charView(r.view);
  FF.field.map.drawFloor(r); FF.field.map.queueWalls(r);
  // the end zones: each team's name, painted on its own end zone (the far one in the opponent's colors)
  const ch = S.cfg && S.cfg.chapter, opp = ch ? D.opponent(ch) : D.TEAMS[1];
  for (const [x, nm, col] of [[D.FX0 - 80, D.TEAMS[0].short, D.TEAMS[0].trim], [D.FX1 + 80, opp.short, opp.trim]]) r.queue(x, D.FYM, 0, g => { const [sx, sy] = r.w(x, D.FYM, 0); E.font.text(g, nm, Math.round(sx), Math.round(sy), col, { align: 'center', font: 'tiny', outline: '#000' }); });
  // the yard lines' numbers, painted on the turf
  for (let yd = 10; yd <= 90; yd += 10) {
    const x = D.FX0 + yd * D.YD;
    for (const yy of [D.FY0 + 40, D.FY1 - 40]) r.queue(x, yy, 0, g => { const [sx, sy] = r.w(x, yy, 0), s = String(yd <= 50 ? yd : 100 - yd); E.font.text(g, s, Math.round(sx), Math.round(sy), 'rgba(255,255,255,0.9)', { align: 'center', font: 'tiny', outline: false }); });
  }
  // the line of scrimmage (blue) and the first-down line (gold)
  if (S.phase !== 'idle' && S.cfg) {
    const a = S.atkDir(S.poss), fd = S.los + a * Math.min(S.togo, 40) * D.YD;
    for (const [x, c] of [[S.los, '#5a8ae8'], [fd, '#f8d030']]) r.queue(x, D.FY0 + 2, 0, g => { const [x0, y0] = r.w(x, D.FY0 + 2, 0), [x1, y1] = r.w(x, D.FY1 - 2, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c, 2); });
  }
  FF.field.drawCrowd(r, t, V.excideSide, V.excite);
  // the pennants along the far stands: the two teams' colors, swaying
  for (let c = 0; c < 6; c++) { const x = D.FX0 + 40 + c * 260, sway = Math.sin(t * 2 + c) * 1.5; r.queue(x, 6, 46, g => { const [sx, sy] = r.w(x, 6, 46); px.rect(g, Math.round(sx) - 6 + Math.round(sway), Math.round(sy), 12, 8, D.TEAMS[0].cloth); px.rect(g, Math.round(sx) + Math.round(sway), Math.round(sy), 6, 8, D.TEAMS[0].trim); }); }
  // the stadium's pennants at the corners of the stands and a big goal post at each end
  for (const gx of [D.FX0, D.FX1]) for (const py of [D.FYM - 12, D.FYM + 12]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, 60); px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); });
  for (const gx of [D.FX0, D.FX1]) r.queue(gx, D.FYM, 60, g => { const [x0, y0] = r.w(gx, D.FYM - 12, 60), [x1, y1] = r.w(gx, D.FYM + 12, 60); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
  // the players, in depth order by the engine's actor queue
  const human = S.all.filter(p => p.human);
  for (const p of S.all) {
    r.shadow(p.x, p.y, 5, .35);
    r.actor(p.x, p.y, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, view));
    // the jersey number: each man's own, on his back, in his team's trim color
    const num = String((p.slot * 11 + p.side * 37) % 98 + 1);
    r.queue(p.x, p.y, 30, g => { const [sx, sy] = r.w(p.x, p.y, 30); E.font.text(g, num, Math.round(sx), Math.round(sy), p.team.trim, { align: 'center', font: 'tiny', outline: '#000' }); });
    if (p.human || (S.cfg && S.cfg.showNames)) {
      const c = p.human ? E.PLAYER_COLORS[0] || '#ffe08a' : '#ffffff';
      r.queue(p.x, p.y, 36, g => { const [x, y] = r.w(p.x, p.y, 36); px.poly(g, [[x - 4, y - 5], [x + 4, y - 5], [x, y - 1]], c); });
    }
  }
  if (S.extras) S.extras.draw(r);
  // the ball: on the carrier, in the air, or on the turf
  const b = S.ball;
  if (b && (b.mode !== 'dead' || b.holder)) {
    const holder = b.holder && b.mode === 'held' ? b.holder : null;
    const bx = holder ? holder.x + Math.cos(holder.f) * 5 : b.x, by = holder ? holder.y + Math.sin(holder.f) * 5 : b.y, bz = holder ? 14 : b.z;
    r.shadow(bx, by, 3 - Math.min(1.5, bz * .05), .4);
    const spin = (b.mode === 'air' || b.mode === 'loose' || holder) && Math.floor(S.time * 14) % 2;
    r.sprite(bx, by, bz + 2, spin ? BALL2 : BALL, { anchor: 'center' });
  } else if (b && b.holder) { r.sprite(b.holder.x, b.holder.y, 16, BALL, { anchor: 'center' }); }
};

/* ---- the HUD: the score bug and the down, the clock, the hot streak, the prompts ---- */
V.hud = (g, r) => {
  const cfg = S.cfg || {}, tm = D.TEAMS[0], op = cfg.chapter ? D.opponent(cfg.chapter) : D.TEAMS[1];
  // the score bug, top left: the two sides' chips, the scores, and the quarter and clock
  E.ui.box(g, 4, 4, 138, 30, { bg: '#141826', border: '#6a7090', alpha: .85 });
  px.rect(g, 9, 10, 6, 6, tm.chip); px.rect(g, 9, 22, 6, 6, op.chip);
  E.font.text(g, tm.short, 19, 9, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, op.short, 19, 21, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, String(S.score[0]), 110, 9, S.poss === 0 ? '#ffe08a' : '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, String(S.score[1]), 110, 21, S.poss === 1 ? '#ffe08a' : '#f0ecdc', { font: 'tiny', outline: false });
  const clock = cfg.practice ? 'PRACTICE' : 'Q' + S.qtr + ' ' + S.mmss(S.clock);
  E.font.text(g, clock, 138, 9, '#c8d0e8', { font: 'tiny', outline: false, align: 'right' });
  // the down and distance, and the spot, under it
  const spot = S.los, a = S.atkDir(S.poss), yg = S.yardsToGoal(), own = Math.round(Math.abs(yg - 100) < 0 ? 0 : 0);
  const side = yg >= 50 ? 'OWN ' + Math.round(100 - yg) : 'OPP ' + Math.round(yg);
  const dn = ['1ST', '2ND', '3RD', '4TH'][Math.min(3, S.down - 1)];
  E.ui.box(g, 4, 38, 138, 16, { bg: '#141826', border: '#6a7090', alpha: .85 });
  E.font.text(g, dn + ' & ' + (S.togo >= yg ? 'GOAL' : Math.round(S.togo)) + '  ' + side, 8, 42, '#f0ecdc', { font: 'tiny', outline: false });
  // the hot streak and the turbo, human side only
  const hs = S.blazing(0) ? 'BLAZING!' : 'HOT ' + S.streak[0] + ' OF 3';
  E.font.text(g, hs, r.W - 6, 6, S.blazing(0) ? '#ffb347' : '#c8d0e8', { font: 'tiny', outline: '#000', align: 'right' });
  if (!FF.tune.infiniteTurbo) E.ui.bar(g, r.W - 110, 16, 100, 4, (S.turbo || 0) / FF.tune.turboMax, '#ffd36a');
  if (S.extras) { E.font.text(g, 'FISCO', r.W - 6, 36, S.extras.meter >= 100 ? '#ffb347' : '#8a90a8', { align: 'right', outline: '#000' }); E.ui.bar(g, r.W - 110, 46, 100, 4, S.extras.meter / 100, '#ff6a3a'); }
  if (V.shotLabel) E.font.text(g, 'CAMERA: ' + V.shotLabel, 6, r.H - 26, '#8a90a8', { font: 'tiny', outline: '#000' });
  if (S.extras && S.extras.replaying()) E.font.title(g, 'REPLAY', r.W / 2, r.H * .12, { align: 'center', scale: 2, colors: ['#ffffff', '#c8d0e8'], depth: 2 });
  // the banner: the play, the message, the countdown
  if (S.msgT > 0 && S.msg) E.font.title(g, S.msg, r.W / 2, r.H * .22, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
  if (S.phase === 'score' && S.msg) E.font.text(g, S.msg, r.W / 2, r.H * .34, '#ffe7a8', { align: 'center', shadow: '#000', outline: false, scale: 2 });
  // the prompts, for the device in use (the glyphs, or the keys)
  const humanOff = S.ctrlOf(S.poss);
  const line = S.phase === 'call' ? (humanOff ? '' : FF.prompt('switch', 'SWITCH')) : S.phase === 'live' ? [FF.prompt('pass', 'PASS'), FF.prompt('juke', 'JUKE'), FF.prompt('hit', 'HIT'), FF.prompt('turbo', 'TURBO')].join('   ') : '';
  if (line) E.font.text(g, line, r.W - 6, 26, '#c8d0e8', { align: 'right', outline: '#000' });
};

/* ---- the call: the cards for the human's play (4 by 2, the cursor, the description) ---- */
V.callCards = (g, r) => {
  const cards = D.CARDS, W = Math.min(r.W - 20, 260), x0 = (r.W - W) / 2, y0 = r.H * .42;
  E.ui.box(g, x0 - 8, y0 - 22, W + 16, 122, { bg: '#141826', border: '#e8c070', alpha: .92 });
  E.font.text(g, 'CALL THE PLAY', r.W / 2, y0 - 16, '#ffe7a8', { align: 'center', outline: false, scale: 1 });
  if (S.extras && S.extras.meter >= 100) E.font.text(g, 'FISCO METER FULL: ' + FF.label('juke') + ' FOR A CARD', r.W / 2, y0 - 30, '#ffb347', { align: 'center', outline: '#000' });
  cards.forEach((k, i) => {
    const pl = D.PLAYS[k], c = i % 4, rw = Math.floor(i / 4), w = (W - 18) / 4, x = x0 + c * (w + 6), y = y0 + rw * 34;
    const ok = !(pl.kind === 'kick' && S.down !== 4);
    const sel = S.cursor === i;
    E.ui.box(g, x, y, w, 28, { bg: sel ? '#8a2a3a' : '#1e2236', border: sel ? '#ffe08a' : '#4a5070', alpha: ok ? .95 : .4 });
    E.font.text(g, pl.name, x + w / 2, y + 6, ok ? '#fffbe8' : '#7a7e94', { align: 'center', font: 'tiny', outline: false });
    E.font.text(g, pl.kind === 'kick' ? (k === 'FIELD_GOAL' ? S.yardsToGoal() > 0 ? Math.round(S.yardsToGoal() + 7) + ' YD' : '' : '40 YD') : pl.kind.toUpperCase(), x + w / 2, y + 16, sel ? '#ffe7a8' : '#8a90a8', { align: 'center', font: 'tiny', outline: false });
  });
  const pl = D.PLAYS[S.cursor >= 0 && D.CARDS[S.cursor] ? D.CARDS[S.cursor] : 'RUN_IN'];
  E.font.text(g, pl.desc, r.W / 2, y0 + 72, '#f0ecdc', { align: 'center', outline: false, scale: 1, wrap: W });
  E.font.text(g, FF.prompt('confirm', 'PICK') + '   ' + FF.label('cancel') + ' BACK', r.W / 2, y0 + 92, '#c8d0e8', { align: 'center', outline: false });
};

// the attract mode and the CPU's calls show the call on the banner (who called it)
V.banner = (g, r) => {
  if (S.phase === 'snap' || S.phase === 'live' || S.phase === 'kick') {
    const pl = D.PLAYS[S.play];
    if (pl) E.font.text(g, pl.name, r.W - 6, r.H - 14, '#ffe7a8', { align: 'right', font: 'tiny', outline: '#000' });
  }
};

// the whole frame: the field, then the HUD, the call (when it is the human's to call), the radio over the bottom
V.frame = (r) => {
  // the lights: the stadium's, or in LIGHTS OUT the lamps on the players (the sim's flag says which)
  if (FF.L) {
    const dark = !!(S.extras && S.extras.dark);
    FF.L.darkness = dark ? .9 : .25;
    if (dark) { for (const p of S.all) FF.L.add(p.x, p.y, 24, 80, .9, { color: '#fff4dc' }); }
    else FF.field.lights();
  }
  V.draw(r);
  r.overlay(g => V.hud(g, r));
  if (S.phase === 'call' && S.ctrlOf(S.poss)) r.overlay(g => V.callCards(g, r));
  if (S.phase === 'call' && !S.ctrlOf(S.poss)) r.overlay(g => E.font.text(g, 'THEIR CALL', r.W / 2, r.H * .42, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' }));
  if (talk) talk.draw(r);
  r.overlay(g => V.banner(g, r));
};

/* ---- the camera: the match follows the ball, the field's middle when it is loose or the call is on ---- */
// the camera director: each moment has its shot. The call: the middle of the line; the run: the carrier, close, or following;
// a kick: from overhead, wide; the whistle and the score: the spot, wide. A replay has its own three angles (35-extras).
V.shot = 'call';
V.shotLabel = '';
V.focus = () => {
  const b = S.ball, h = b && b.holder, g = FF.game;
  const shot = S.phase === 'kick' ? 'kick' : S.phase === 'call' ? 'call' : S.phase === 'live' ? (h && S.yardsToGoal() <= 12 ? 'close' : 'follow') : 'wide';
  if (shot !== V.shot) {
    V.shot = shot;
    const view = shot === 'kick' ? 'topdown' : 'threequarter';
    if (g.view && g.view.id !== view) g.setView(view);
    g.setZoom(shot === 'close' ? 1.35 : shot === 'kick' ? .7 : shot === 'wide' || shot === 'call' ? .8 : 1);
    V.shotLabel = { close: 'CLOSE-UP', kick: 'OVERHEAD', wide: 'WIDE', call: 'THE LINE', follow: 'FOLLOW' }[shot];
  }
  const tx = h ? h.x : b ? b.x : S.los, ty = h ? h.y : b ? b.y : D.FYM;
  g.focus(S.phase === 'call' ? S.los : tx, D.FYM + (ty - D.FYM) * .55, 16);   // (the camera eases to it: cam.smooth)
};
})();
