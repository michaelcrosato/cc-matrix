/* 45-attract: the attract mode (PLAN 13). Ten seconds without input on the title or a menu screen starts "CHANNEL BLAM
 * DEMO": five segments of real matches played by the CPU on both sides, cheating freely (infinite turbo, wide dunk
 * range, frequent power-ups) while a director forces the showcase plays, so every feature appears; between segments a
 * "TONIGHT ON CHANNEL BLAM" card; then the Hall of Blam and the logo; then it loops. Any input leaves, at once, back to
 * the screen it interrupted (its choices kept); on a touch-only device a tap shows the notice instead. */
const ATT_SEGS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [0, 0], quarter: 1, tipoff: true, label: 'TIP-OFF • TURBO DUNKS • ALLEY-OOP • JACKPOT SPOT',
    script: [[3, 'command', [0, 'dunk']], [9, 'give', 1], [9.1, 'command', [1, 'oop']], [16, 'twist', 'jackpot'], [17, 'give', 0], [17.2, 'make'], [17.3, 'command', [0, 'jumper']], [17.32, 'toSpot', 0], [24, 'give', 2], [24.1, 'command', [2, 'spin']], [29, 'command', [2, 'dunk']]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [18, 16], quarter: 2, label: 'SEA BREEZE • THREES • STEALS • POWER-UPS',
    script: [[1, 'give', 0], [1.2, 'command', [0, 'three']], [5, 'twist', 'gust'], [7, 'spawn', ['rocket', 1]], [8, 'spawn', ['laser', 0]], [11, 'give', 2], [11.2, 'command', [0, 'steal']], [17, 'give', 1], [17.1, 'command', [1, 'three']], [23, 'command', [1, 'dunk']]] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [27, 30], quarter: 3, label: 'SHOVES • BLAM BOMB • OIL SLICKS • BLOCKS • PUTBACK',
    script: [[1, 'give', 2], [1.5, 'grant', ['bomb', 0]], [1.6, 'command', [0, 'shove']], [9, 'slip', 3], [12, 'give', 1], [12.1, 'miss', 0], [12.2, 'command', [1, 'shoot']], [12.3, 'command', [0, 'putback']], [18, 'give', 2], [18.1, 'command', [2, 'shoot']], [18.2, 'command', [1, 'block']], [24, 'command', [0, 'shove']]] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [41, 39], quarter: 3, label: 'ERUPTIONS • VOLCANO LAUNCH • SHATTERED GLASS',
    script: [[2, 'give', 0], [6, 'twist', 'eruption'], [8, 'give', 0], [8.1, 'toVent', 0], [8.2, 'command', [0, 'vent']], [8.5, 'twist', 'vent'], [16, 'give', 1], [16.1, 'shatterNext'], [16.2, 'command', [1, 'dunk']], [27, 'give', 2], [27.1, 'command', [2, 'dunk']]] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [52, 51], quarter: 4, label: 'SUPERNOVA • OVERCLOCK • POSTERIZED • BLAM-QUAKE • REBOOT',
    script: [[1, 'give', 2], [4, 'nova', 2], [4.2, 'command', [2, 'dunk']], [11, 'overclock'], [12, 'give', 0], [12.1, 'poster', 0], [19, 'give', 1], [19.05, 'nearRim', 1], [19.1, 'command', [1, 'quake']], [26, 'twist', 'reboot'], [28, 'give', 3], [28.1, 'command', [3, 'dunk']]] }
];
const ATT_FEATURES = { dunk: 'TURBO DUNK!', alleyoop: 'ALLEY-OOP!', supernovaOn: 'SUPERNOVA!', shatter: 'SHATTERED GLASS!', steal: 'STEAL!', block: 'BLOCK!', shove: 'LEGAL SHOVE!', anklesBroken: 'SPIN MOVE!', jackpot: 'JACKPOT SPOT!',
  powerupPick: 'POWER-UP!', overclock: 'OVERCLOCK!', reboot: 'SYSTEM REBOOT!', posterized: 'POSTERIZED!', oilSlip: 'OIL SLICK!', bombHit: 'BLAM BOMB!', tipWin: 'TIP-OFF!' };
function startAttract(from) { S.attract = { from: from || 'title', seg: 0, t: 0, phase: 'card', cheat: true, feature: null, featureT: 0, notice: 0, seen: {} }; game.go('attract', null, { fade: .3 }); }
function attractSegment(i) {
  const A2 = S.attract, seg = ATT_SEGS[i];
  A2.seg = i; A2.t = 0; A2.phase = 'play'; A2.scriptI = 0;
  S.cheats = { fastPowerups: true };
  newMatch({ court: seg.court, home: seg.home, away: seg.away, quarterLen: 90, quarter: seg.quarter, clock: 60 + (i * 7) % 20, score: seg.score, diff: [2, 2], powerups: true, twists: true, tipoff: !!seg.tipoff, firstPoss: i % 2, mode: 'attract', seed: 101 + i * 13, noOT: true });
  S.mode = 'attract'; S.match.quarters = 4; cameraReset(); playMusic(get('court', seg.court).music); BREAK.open = false;
}
function attractAction(act, arg) {
  const pl = n => S.players[n], M = S.match;
  if (act === 'give') { const p = pl(arg); if (p && p.state !== 'dunk') { if (M.phase !== 'live') { M.phase = 'live'; for (const q of S.players) if (q.state === 'inbound') q.setState('run'); } p.setState('run'); p.z = 0; giveBall(p, 'director'); } }
  if (act === 'command') { const [n, kind] = arg, p = pl(n); if (!p) return; p.order = { kind, t: 5 }; if (kind === 'quake') p.forceQuake = true; if (kind === 'putback') { const rim = attackRim(p.team); p.x = rim.x - rim.side * 30; p.y = rim.y + 10; } }
  if (act === 'spawn') { const [id, n] = arg, p = pl(n); spawnPowerup(id, p.x + 24, p.y); }
  if (act === 'twist') forceTwist(arg);
  if (act === 'nova') novaOn(pl(arg));
  if (act === 'shatterNext') S.cheats.shatterNext = true;
  if (act === 'overclock') overclock();
  if (act === 'slip') { const p = pl(arg); if (p) { TWIST.oil = true; if (!TWIST.slicks.length) placeSlicks(); slipOnOil(p); } }
  if (act === 'miss') S.attract.nextMiss = true;
  if (act === 'make') S.attract.nextMake = true;
  if (act === 'toSpot') { const p = pl(arg), rim = attackRim(p.team); TWIST.jackpot = true; TWIST.spot = { rim: RIMS.indexOf(rim), x: rim.x - rim.side * 96, y: rim.y + 28, t: 20 }; p.x = TWIST.spot.x; p.y = TWIST.spot.y; p.vx = p.vy = 0; }
  if (act === 'grant') { const [id, n] = arg; grantPowerup(pl(n), id); }
  if (act === 'nearRim') { const p = pl(arg), rim = attackRim(p.team); p.x = rim.x - rim.side * 110; p.y = rim.y + 16; p.vx = p.vy = 0; for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 60) { q.x -= rim.side * 80; } }
  if (act === 'toVent') { const p = pl(arg), rim = attackRim(p.team), v = TWIST.vents.find(q => (rim.side > 0 ? q.x > CMX : q.x < CMX)); if (p && v) { p.x = v.x - rim.side * 30; p.y = v.y; p.vx = p.vy = 0; } }
  if (act === 'poster') { const p = pl(arg), rim = attackRim(p.team), v = p.foes[0]; if (v) { v.x = rim.x - rim.side * 14; v.y = rim.y + 4; v.setState('run'); v.vx = v.vy = 0; } p.x = rim.x - rim.side * 90; p.y = rim.y + 20; p.order = { kind: 'dunk', t: 4 }; }
}
SC.attract = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [], matchScene: true,
  enter() { if (!S.attract) S.attract = { from: 'title', seg: 0, t: 0, phase: 'card', cheat: true, seen: {} }; S.attract.t = 0; S.attract.phase = 'card'; this.offs = this.offs || on('*', e => { const A2 = S.attract; if (!A2) return; const f = ATT_FEATURES[e.type]; if (f) { A2.feature = f; A2.featureT = 1.8; A2.seen[e.type] = (A2.seen[e.type] || 0) + 1; } }); },
  exit() { S.attract = null; S.cheats = {}; S.match = null; crowdTick(1, false); game.timeScale = 1; },
  update(dt) {
    const A2 = S.attract; if (!A2) return;
    // any input leaves (a touch-only device shows the notice instead)
    const nav = navInput(), moved = game.players.some(I => Math.hypot(...I.move()) > .3), pt = game.input.pointer();
    const mouseMoved = pt && A2.lastPt && Math.hypot(pt[0] - A2.lastPt[0], pt[1] - A2.lastPt[1]) > 4; A2.lastPt = pt || A2.lastPt;
    if (S.touchOnly) { if (nav.click) { if (A2.notice > 0 && A2.setRect && inRect(nav.click, A2.setRect)) game.menu('settings'); A2.notice = 4; } A2.notice = Math.max(0, A2.notice - dt); }
    else if (nav.any || nav.click || moved || mouseMoved) { const back = A2.from; consumeNav(); game.go(back, null, { fade: .15 }); return; }
    A2.t += dt; A2.featureT = Math.max(0, A2.featureT - dt);
    if (A2.phase === 'card') { if (A2.t > 2) attractSegment(A2.seg); return; }
    if (A2.phase === 'hall') { if (A2.t > 6) { A2.phase = 'logo'; A2.t = 0; } return; }
    if (A2.phase === 'logo') { if (A2.t > 4) { A2.seg = 0; A2.phase = 'card'; A2.t = 0; } return; }
    const seg = ATT_SEGS[A2.seg];
    while (A2.scriptI < seg.script.length && seg.script[A2.scriptI][0] <= A2.t) { const [, act, arg] = seg.script[A2.scriptI++]; try { attractAction(act, arg); } catch (e) { game.fail('attract ' + act, e); } }
    if (S.match.phase === 'break') { if (!BREAK.open) BREAK.show(S.match.breakKind); BREAK.update(dt); }
    else { matchStep(dt); }
    if (S.match.phase === 'over' || S.match.phase === 'break' && BREAK.t > 1) { if (S.match.phase === 'over') A2.t = seg.seconds; }
    bannerStep(dt); cameraStep(dt, 1 / 120); crowdTick(1 / 120, true);
    if (A2.t >= seg.seconds) { A2.t = 0; if (A2.seg + 1 < ATT_SEGS.length) { A2.seg++; A2.phase = 'card'; } else { A2.phase = 'hall'; playMusic('title'); } S.match = null; }
  },
  draw(r) {
    const A2 = S.attract; if (!A2) return;
    if (A2.phase === 'play' && S.match) { matchDraw(r); return; }
    screenFrame(r, null, null);
    r.overlay(g => {
      if (A2.phase === 'card') { const seg = ATT_SEGS[A2.seg]; E.font.title(g, 'TONIGHT ON', Math.round(r.W / 2), Math.round(r.H * .2), { align: 'center', scale: 2, colors: BANNER_COLORS.info }); E.font.title(g, 'CHANNEL BLAM', Math.round(r.W / 2), Math.round(r.H * .2) + 22, { align: 'center', scale: 3, colors: BANNER_COLORS.dunk }); E.font.text(g, get('team', seg.home).short + ' VS ' + get('team', seg.away).short + ' AT ' + get('court', seg.court).name, Math.round(r.W / 2), Math.round(r.H * .2) + 58, '#fff', { align: 'center', outline: '#000' }); wrapText(seg.label, r.W - 40).forEach((l, i) => E.font.text(g, l, Math.round(r.W / 2), Math.round(r.H * .2) + 74 + i * 10, UIC.gold, { align: 'center', outline: false })); }
      else if (A2.phase === 'hall') { E.font.title(g, 'HALL OF BLAM', Math.round(r.W / 2), 8, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk }); drawHallTable(g, r, 34); }
      else drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .3));
      drawAttractOverlay(g, r);
    });
  }
};
function drawAttractOverlay(g, r) {
  const A2 = S.attract; if (!A2) return;
  E.ui.box(g, 4, 44, 112, 14, { bg: '#d02a2a', border: '#ffffff', gradient: false, alpha: .9 }); E.font.text(g, 'CHANNEL BLAM DEMO', 60, 47, '#ffffff', { align: 'center', outline: false });
  if (A2.featureT > 0 && A2.feature) { const w = E.font.width(A2.feature, { scale: 1 }) + 16; E.ui.box(g, 4, 60, w, 14, { bg: '#140c24', border: UIC.gold, alpha: .9 }); E.font.text(g, A2.feature, 4 + w / 2, 63, UIC.gold, { align: 'center', outline: false }); }
  if (S.touchOnly) { if (A2.notice > 0) { E.ui.box(g, Math.round(r.W / 2) - 110, Math.round(r.H * .4), 220, 56, { bg: '#140c24', border: UIC.gold }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', Math.round(r.W / 2), Math.round(r.H * .4) + 8, '#fff', { align: 'center', outline: false }); A2.setRect = drawButton(g, Math.round(r.W / 2) - 45, Math.round(r.H * .4) + 26, 90, 20, 'SETTINGS', { focus: true, center: true }); } }
  else if (Math.floor(game.real * 2) % 2) { const w = E.font.width('DEMO • PRESS ANY BUTTON') + 12; E.ui.box(g, r.W - w - 4, 44, w, 14, { bg: '#140c24', border: '#ffffff', gradient: false, alpha: .85 }); E.font.text(g, 'DEMO • PRESS ANY BUTTON', r.W - w / 2 - 4, 47, '#ffffff', { align: 'center', outline: false }); }
}
