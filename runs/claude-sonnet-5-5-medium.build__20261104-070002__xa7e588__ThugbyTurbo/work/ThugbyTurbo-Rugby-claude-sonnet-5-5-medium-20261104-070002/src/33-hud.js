/* THUGBY TURBO — HUD: score bug, meters, prompts, set-piece interfaces, banners, commentary. */
const tx = (g, s, x, y, c = '#fff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const box = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#181c2c', '#0c0e18'], border: '#c8d0f0', alpha: .88 }, o));
const mkPortraits = () => ({
  BARRY: new E.Humanoid({ size: 1.2, hair: 'spiky', weapon: null, outfit: 'coat', colors: { skin: '#f0c0a0', hair: '#c04a1a', cloth: '#c83a2a', coat: '#c83a2a', pants: '#202030' } }),
  ROS: new E.Humanoid({ size: 1.2, hair: 'long', weapon: null, outfit: 'coat', colors: { skin: '#e8c0a8', hair: '#8a8a96', cloth: '#2a4a8a', coat: '#2a4a8a', pants: '#202030' } }),
  COACH: new E.Humanoid({ size: 1.2, hair: 'bald', weapon: null, outfit: 'coat', colors: { skin: '#c89070', hair: '#707070', cloth: '#2f6a3a', coat: '#2f6a3a', pants: '#202030' } }),
  REF: new E.Humanoid({ size: 1.2, hair: 'short', weapon: null, outfit: 'shirt', colors: { skin: '#e8b890', hair: '#6a6a70', cloth: '#18181c', pants: '#18181c' } })
});
function clockText() { const len = TUNE.v.halfLength, sec = Math.max(0, Math.floor((S.sudden ? 0 : Math.min(S.clock, len)) * 420 / len)); return S.sudden ? 'GOLD' : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function drawHUD(r, inp) {
  r.overlay(g => {
    const W = r.W, H = r.H, T0 = S.teams[0], T1 = S.teams[1], t = V.t;
    // score bug
    const cor = TT.game.cornerArea && TT.game.cornerArea(); const bx = 6, by = 5;
    box(g, bx, by, 130, 32, { alpha: .8 });
    px.rect(g, bx + 4, by + 4, 3, 10, T0.c1); px.rect(g, bx + 4, by + 17, 3, 10, T1.c1);
    tx(g, T0.short, bx + 10, by + 5, '#fff'); tx(g, T1.short, bx + 10, by + 18, '#fff');
    tx(g, String(S.score[0]), bx + 100, by + 4, '#ffe070', { scale: 2, align: 'right' }); tx(g, String(S.score[1]), bx + 100, by + 17, '#ffe070', { scale: 2, align: 'right' });
    tx(g, clockText(), bx + 124, by + 5, S.hooter && Math.floor(t * 4) % 2 ? '#ff6060' : '#fff', { align: 'right' }); tx(g, S.sudden ? 'SUDDEN' : S.half === 1 ? '1ST' : '2ND', bx + 124, by + 18, '#a0a8d0', { align: 'right' });
    for (const k of [0, 1]) { const hy = by + 8 + k * 13; E.ui.bar(g, bx + 5, by + 34 + k * 5, 120, 3, S.hype[k] / 100, S.hype[k] >= 100 && Math.floor(t * 6) % 2 ? '#ffffff' : '#ff9030'); }
    // sin bin
    const bins = S.players.filter(p => p.st === 'binned'); bins.forEach((p, i) => tx(g, 'BIN ' + p.name.split(' ')[0].toUpperCase().slice(0, 7) + ' ' + (p.card === 'red' ? 'OFF' : Math.ceil(p.stT) + 's'), bx + 2, by + 50 + i * 9, p.card === 'red' ? '#ff6060' : '#ffe040', { font: 'tiny' }));
    // controlled player card (seat 0)
    S.seats.forEach((seat, i) => {
      if (seat.kind === 'cpu' || seat.auto) return; const p = S.players[seat.pid]; if (!p) return; const sx = i === 0 ? 6 : W - 112, sy = H - 44;
      box(g, sx, sy, 106, 38, { alpha: .75, border: SEAT_COL[i % 4] });
      tx(g, 'P' + (i + 1) + '  ' + p.name.toUpperCase().slice(0, 14), sx + 4, sy + 3, SEAT_COL[i % 4]); tx(g, ROLES[p.role], sx + 4, sy + 12, '#c0c8e8', { font: 'tiny' });
      E.ui.bar(g, sx + 4, sy + 22, 98, 4, p.onFire > 0 || p.power === 'pie' || S.dev.infTurbo ? 1 : p.turbo / TUNE.v.turboTank, p.turboOn ? '#ffe070' : '#60c8ff');
      if (p.kickMeter > 0) E.ui.bar(g, sx + 4, sy + 29, 98, 4, p.kickMeter, p.kickMeter > .9 ? '#80ff80' : '#ff9060');
      if (S.hype[p.team] >= 100) tx(g, 'SUPER!', sx + 102, sy + 12, Math.floor(t * 6) % 2 ? '#ffe070' : '#fff', { align: 'right' });
      if (p.power) tx(g, p.power.toUpperCase(), sx + 102, sy + 29, '#ffa0ff', { align: 'right', font: 'tiny' });
    });
    // contextual prompts
    const seat0 = S.seats[0], p0 = seat0 && S.players[seat0.pid];
    if (p0 && S.phase === 'play' && !seat0.auto && !(V.replay)) {
      const car = S.ball.holder === p0;
      const str = car ? (inGoalOf(p0) ? '{x} GROUND IT!  {l1}{r1} PASS  {ci} KICK' : '{x} STEP  {sq} FEND  {l1}{r1} PASS  {ci} KICK  {tri} SUPER') : (S.ball.holder && S.ball.holder.team !== p0.team ? '{x} TACKLE (HOLD: BIG HIT)  {sq} DIVE  {ci} SWITCH' : '{ci} SWITCH  {l1}{r1} UP/DOWN');
      prompt(g, str, W / 2, H - 12, inp, { align: 'center' });
      // pass receiver tags
      if (car) for (const side of [-1, 1]) { const rc = bestReceiver(p0, side, false); if (rc) { const [sx, sy] = r.w(rc.x, rc.y, 52); glyph(g, side < 0 ? 'l1' : 'r1', sx - 6, sy - 4, inp); } }
      if (V.hover >= 0 && inp.lastDevice !== 'gamepad') tx(g, V.hoverLegal ? 'CLICK: PASS' : 'FORWARD PASS!', W / 2, H - 26, V.hoverLegal ? '#80ff80' : '#ff6060', { align: 'center' });
    }
    // set pieces
    drawSetPieceHUD(g, r, inp);
    // banners
    S.banners.forEach((b, i) => { const k = Math.min(1, (b.t0 - b.t) * 8) * Math.min(1, b.t * 3); E.font.title(g, b.text, W / 2, 60 + i * 24 - (1 - k) * 8, { scale: b.text.length > 18 ? 1 : 2, colors: [b.color, b.color], align: 'center', outline: '#000', depth: 1, depthColor: '#000' }); });
    // radio
    if (S.radio && !V.replay) { const rad = S.radio, rig = V.portraits[rad.who]; const ry = H - 62; box(g, W / 2 - 92, ry, 184, 30, { alpha: .7 }); if (rig) rig.drawPortrait(g, W / 2 - 90, ry + 2, 26); tx(g, rad.who, W / 2 - 60, ry + 3, '#ffd070'); tx(g, rad.text.slice(0, 34), W / 2 - 60, ry + 13, '#fff', { font: 'tiny' }); if (rad.text.length > 34) tx(g, rad.text.slice(34, 68), W / 2 - 60, ry + 20, '#fff', { font: 'tiny' }); }
    // weather
    if (S.venue.hazard === 'wind') { const wx = W - 40, wy = 18; tx(g, 'WIND', wx, wy - 12, '#c0d0f0', { font: 'tiny', align: 'center' }); px.line(g, wx - 12, wy, wx + 12, wy, '#405070', 1); px.line(g, wx, wy, wx + S.windDir * S.wind * 14, wy, '#ffe070', 2); }
    if (S.ref.down > 0) tx(g, 'REF DOWN!', W / 2, 30, '#ffe070', { align: 'center', scale: 1 });
    if (S.adv) tx(g, 'ADVANTAGE', W / 2, 30, '#80ff80', { align: 'center' });
    if (S.venue.hazard === 'mud' && false) {}
    // letterbox for replay
    if (V.replay) { const k = Math.min(1, V.replay.t * 4); px.rect(g, 0, 0, W, 22 * k, '#000'); px.rect(g, 0, H - 22 * k, W, 22 * k, '#000'); tx(g, 'INSTANT REPLAY', 10, H - 16, '#ff6060', { scale: 1 }); prompt(g, '{x} SKIP', W - 60, H - 16, inp); }
    if (S.flash) { /* handled by engine flash */ }
    if (S.phase === 'halftime') { box(g, W / 2 - 110, 50, 220, 120, { alpha: .93 }); E.font.title(g, 'HALF TIME', W / 2, 58, { scale: 2, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' }); tx(g, T0.short + '  ' + S.score[0] + ' - ' + S.score[1] + '  ' + T1.short, W / 2, 84, '#fff', { align: 'center', scale: 1 }); tx(g, S.cfg.mode === 'cup' ? '"Pass backwards. Run forwards. Hit stuff." - COACH' : 'POSSESSION ' + Math.round(100 * S.stats[0].poss / Math.max(1, S.stats[0].poss + S.stats[1].poss)) + '%   TRIES ' + S.stats[0].tries + '-' + S.stats[1].tries, W / 2, 104, '#c0c8e8', { align: 'center' }); prompt(g, '{x} CONTINUE', W / 2, 150, inp, { align: 'center' }); }
  });
}
function drawSetPieceHUD(g, r, inp) {
  const W = r.W, H = r.H, s = S.sp, ph = S.phase, t = V.t;
  if (!s) return;
  if (ph === 'kickoff') {
    const hum = humanOn(s.team);
    tx(g, s.dropout ? '22 DROP-OUT' : 'KICK-OFF', W / 2, 30, '#fff', { align: 'center' });
    if (hum) { const [sx, sy] = r.w(G.CX + S.dir[s.team] * (110 + 290 * .5), G.CY + s.aim.y * 220, 0); const ax = s.dropout ? s.x : G.CX; const [rx, ry] = r.w(ax + S.dir[s.team] * lerp(120, 480, Math.max(.3, s.power || .5)), G.CY + s.aim.y * 220, 0); px.disc(g, rx, ry, 3, '#ffe070'); E.font.text(g, '+', rx, ry - 3, '#000', { align: 'center' }); E.ui.bar(g, W / 2 - 40, H - 60, 80, 6, s.power, s.power > .85 ? '#80ff80' : '#ff9060'); prompt(g, '{ci} HOLD & RELEASE: KICK   STICK: AIM', W / 2, H - 14, inp, { align: 'center' }); }
  } else if (ph === 'ruck') {
    const sp = s; const cx = W / 2; box(g, cx - 60, 28, 120, 18, { alpha: .7 }); px.rect(g, cx - 54, 34, 108, 6, '#202030'); px.rect(g, cx, 33, Math.round(clamp(sp.bar, -1, 1) * 54), 8, sp.bar >= 0 ? '#80ff80' : '#ff6060'); tx(g, 'RUCK', cx, 30, '#fff', { align: 'center', font: 'tiny' });
    const myTeam = S.seats[0] && S.seats[0].team; if (myTeam !== undefined) prompt(g, myTeam === sp.team ? '{x} MASH TO WIN THE BALL' : '{x} MASH   {sq} JACKAL (EARLY)', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'scrum') {
    const c = { setup: 'SCRUM', crouch: 'CROUCH', bind: 'BIND', set: 'SET!', push: 'SHOVE!' }[s.step]; E.font.title(g, c || '', W / 2, 30, { scale: 2, colors: ['#fff', '#c0c8e8'], align: 'center', outline: '#000' });
    if (s.step === 'push' || s.step === 'set') { box(g, W / 2 - 60, 56, 120, 12, { alpha: .8 }); px.rect(g, W / 2 - 54, 60, 108, 4, '#202030'); px.rect(g, W / 2, 59, Math.round(s.bar * 54 * (s.feed === 0 ? 1 : -1)), 6, '#ffe070'); }
    if (s.step === 'set') { const k = clamp(1 - s.stepT / .25, 0, 1); px.disc(g, W / 2, 90, 6 + k * 14, '#ffffff22'); px.disc(g, W / 2, 90, 6, '#ffe070'); }
    prompt(g, s.step === 'push' ? '{l1}{r1} ALTERNATE TO SHOVE' : s.step === 'set' ? '{x} NOW!' : 'WAIT FOR  SET  (PRESSING EARLY IS A FOUL)', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'lineout') {
    tx(g, 'LINEOUT', W / 2, 30, '#fff', { align: 'center', scale: 1 });
    const pods = ['FRONT', 'MIDDLE', 'BACK']; const T = s.throwTeam, D = opp(T);
    for (let i = 0; i < 3; i++) { const sel = s.callPod === i, dsel = s.defPod === i, x = W / 2 - 90 + i * 62; box(g, x, 56, 56, 20, { border: sel ? '#80ff80' : dsel ? '#ff9060' : '#505870', alpha: .8 }); tx(g, pods[i], x + 28, 62, '#fff', { align: 'center', font: 'tiny' }); }
    if (s.step === 'call') prompt(g, '{l1}{r1} PICK A POD  {x} LOCK IT', W / 2, H - 14, inp, { align: 'center' });
    if (s.step === 'throw') { box(g, W / 2 - 62, 86, 124, 14); px.rect(g, W / 2 - 14, 89, 28, 8, '#2a8a3a'); px.rect(g, W / 2 - 30, 89, 16, 8, '#8a8a2a'); px.rect(g, W / 2 + 14, 89, 16, 8, '#8a8a2a'); px.rect(g, W / 2 - 58 + Math.round(s.needle * 116) - 1, 86, 3, 14, '#fff'); prompt(g, humanOn(T) ? '{x} STOP THE NEEDLE IN THE GREEN' : humanOn(D) ? 'WAIT FOR THE THROW...' : '', W / 2, H - 14, inp, { align: 'center' }); }
    if (s.step === 'jump') prompt(g, humanOn(D) && s.defPod === s.callPod ? '{x} NOW! (TIME THE JUMP)' : 'UP HE GOES...', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'penalty') {
    box(g, W / 2 - 130, 52, 260, 70, { alpha: .9 }); E.font.title(g, s.free ? 'FREE KICK' : 'PENALTY', W / 2, 56, { scale: 1, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' });
    s.opts.forEach((o, i) => { const x = W / 2 - 126 + i * (252 / s.opts.length) + 4, w = 252 / s.opts.length - 8; box(g, x, 72, w, 44, { border: i === s.sel ? '#80ff80' : '#505870', bg: i === s.sel ? ['#2a4a2a', '#102010'] : ['#181c2c', '#0c0e18'] }); tx(g, o, x + w / 2, 90, i === s.sel ? '#fff' : '#a0a8c0', { align: 'center', font: 'tiny' }); });
    prompt(g, humanOn(s.team) ? '{l1}{r1} CHOOSE  {x} CONFIRM' : 'THE OTHER SIDE CHOOSES...', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'kick') {
    tx(g, s.kind === 'conv' ? 'CONVERSION' : 'PENALTY KICK', W / 2, 30, '#fff', { align: 'center' }); tx(g, Math.round(Math.hypot(atkX(s.team) - s.x, s.y - G.CY) / 10.24) + ' M', W / 2, 42, '#ffe070', { align: 'center', font: 'tiny' }); tx(g, Math.max(0, Math.ceil(s.shot)) + 's', W - 30, 20, s.shot < 6 ? '#ff6060' : '#fff', { align: 'right' });
    if (humanOn(s.team) && s.step !== 'fly' && s.step !== 'done') {
      // reticle on the posts
      const ax = atkX(s.team), ang = s.aimX * .22 + s.sway; const yc = s.y + Math.tan(Math.atan2(G.CY - s.y, Math.abs(ax - s.x)) + ang) * Math.abs(ax - s.x); const [rx, ry] = r.w(ax, yc, 60); px.disc(g, rx, ry, 4, '#ff6060'); px.disc(g, rx, ry, 2, '#fff');
      const need = kickNeed(Math.abs(ax - s.x)); box(g, W / 2 - 50, H - 48, 100, 12); px.rect(g, W / 2 - 46 + Math.round(92 * need) - 1, H - 46, 2, 8, '#fff'); px.rect(g, W / 2 - 46, H - 45, Math.round(92 * s.power), 6, s.power > need - .06 && s.power < need + .06 ? '#80ff80' : '#ff9060');
      const wy = 30, wx = W - 70; tx(g, 'WIND', wx, wy - 10, '#c0d0f0', { font: 'tiny' }); px.line(g, wx - 15, wy, wx + 15, wy, '#405070', 1); px.line(g, wx, wy, wx + S.wind * S.windDir * 14, wy, '#ffe070', 2);
      prompt(g, s.step === 'place' ? '{x} PLACE THE TEE (STICK: BACK/FORWARD)' : '{ci} HOLD: POWER  STICK: AIM  RELEASE AT THE MARK', W / 2, H - 14, inp, { align: 'center' });
    }
  }
}
