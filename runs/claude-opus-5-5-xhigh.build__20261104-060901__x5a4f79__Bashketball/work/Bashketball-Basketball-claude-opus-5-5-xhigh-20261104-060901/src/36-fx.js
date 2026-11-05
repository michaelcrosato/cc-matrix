/* 36-fx: presentation. The camera director (the broadcast camera pans with the ball and leads the play; the dunk cam
 * zooms and slows time round the apex), the comic banners ("BLAM!", "REJECTED!") one at a time by priority, and the
 * wiring from the match's events to particles, hit-stop, shake, flashes, rumble, sounds, the crowd, the announcer and
 * style points (PLAN 9). Comfort settings (reduce motion, shake, flashes) are applied by the engine and here. */
const CAM = { x: CMX, y: CMY, zoom: 1, zoomTo: 1, slowFrom: 0, slowTo: 0, slowK: 1, dunk: null, shake: 0 };
function cameraReset() { CAM.x = CMX; CAM.y = CMY; CAM.zoom = 1; CAM.zoomTo = 1; CAM.slowFrom = 0; CAM.slowTo = 0; CAM.dunk = null; game.cam.smooth = 0; game.setZoom(1); }
function cameraStep(dt, realDt) {
  const b = S.ball, M = S.match, high = game.view && game.view.id === 'threequarter';
  let fx = CMX, fy = CMY;
  if (b && M) {
    fx = b.owner ? b.owner.x : b.x; fy = b.owner ? b.owner.y : b.y;
    if (M.poss >= 0 && (M.phase === 'live' || M.phase === 'inbound')) fx += 48 * attackRim(M.poss).side;
    if (M.phase === 'tipoff') { fx = CMX; fy = CMY; }
    if (CAM.dunk && CAM.dunk.p.state === 'dunk') { const p = CAM.dunk.p, rim = attackRim(p.team); fx = (p.x + rim.x) / 2; fy = (p.y + rim.y) / 2; }
  }
  if (S.dev.freeCam) { const m = game.input.move(); CAM.x += m[0] * 200 * realDt; fx = CAM.x; }
  const k = 1 - Math.exp(-realDt / .16);
  CAM.x += (fx - CAM.x) * k; CAM.y += (fy - CAM.y) * k;
  const z = CAM.zoom = approach(CAM.zoom, CAM.zoomTo, realDt * (CAM.zoomTo > CAM.zoom ? 1.2 : .7)), halfW = game.W / 2 / Math.max(.5, (game.zoom || 1) * (high ? 1.5 : 1));
  const x0 = OX - 60 + halfW, x1 = OX + CW + 60 - halfW, cx = x0 > x1 ? CMX : clamp(CAM.x, x0, x1);
  const zz = z * (high ? .56 : 1);   // the High camera (the engine's three-quarter view, 1.5x) pulls back to show the court
  if (Math.abs((CAM.lastZ || 0) - zz) > .0005) { game.setZoom(zz); CAM.lastZ = zz; }
  game.cam.offset = high ? [0, 0] : [0, Math.round(game.H * .12 * (CAM.dunk ? .6 : 1))];
  game.focus(cx, high ? clamp(CAM.y, OY + 40, OY + CH - 20) : CMY, 0);
  // time: the dev speed, slow motion round a dunk's apex
  const now = game.real, slow = now >= CAM.slowFrom && now <= CAM.slowTo ? CAM.slowK : 1;
  game.timeScale = (S.dev.speed || 1) * tune('gameSpeed') * slow * (S.dev.frozen && !S.dev.stepping ? 0 : 1);
}
const reduce = () => !!(game.settings && game.settings.reduceMotion) || game.reduceMotion;

/* ---- banners ---- */
const BANNER_PRIO = { SHATTERED: 10, SUPERNOVA: 9, POSTERIZED: 8, DUNK: 7, OOP: 6, REJECTED: 5, JACKPOT: 4, THREE: 3, PICKPOCKET: 2, ANKLES: 1, INFO: 0 };
const BANNERS = { cur: null };
function banner(text, kind = 'INFO', colors, o = {}) {
  const prio = BANNER_PRIO[kind] || 0, cur = BANNERS.cur;
  if (cur && cur.t < cur.dur && (BANNER_PRIO[cur.kind] || 0) > prio && !o.force) return;
  BANNERS.cur = { text, kind, colors: colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], t: 0, dur: o.dur || 1.25, scale: o.scale || (text.length > 14 ? 2 : 3), sub: o.sub || '' };
}
const BANNER_COLORS = { dunk: ['#fff6c0', '#ffd23a', '#ff8a2a', '#c8401a'], three: ['#e8ffff', '#7af0ff', '#2ab8ff', '#1a5ad0'], block: ['#ffe8e8', '#ff7a7a', '#ff2a2a', '#8a1010'],
  steal: ['#e8ffe8', '#8aff8a', '#2ad84a', '#107a20'], nova: ['#ffffff', '#d8a0ff', '#a050ff', '#ffd23a'], shatter: ['#ffffff', '#c8f0ff', '#7ad0ff', '#3a8ad0'], jackpot: ['#fffbe0', '#ffe060', '#ffc020', '#a06a00'],
  poster: ['#ffe8ff', '#ff8ae0', '#ff3ac0', '#8a1060'], info: ['#ffffff', '#e8e0ff', '#b8a8f0', '#6a5aa0'] };
function bannerStep(dt) { const B = BANNERS.cur; if (B) { B.t += dt; if (B.t > B.dur + .2) BANNERS.cur = null; } for (const b of BARKS) b.t -= dt; E.prune(BARKS, b => b.t <= 0); }
function drawBanner(g, r) {
  const B = BANNERS.cur; if (!B) return;
  const t = B.t, k = t < .25 ? E.ease.outBack(t / .25) : 1, fade = t > B.dur ? 1 - (t - B.dur) / .2 : 1; if (fade <= 0) return;
  const sc = Math.max(1, Math.round(B.scale * k)), y = Math.round(r.H * .3) - sc * 4;
  if (fade < 1 && Math.floor(t * 30) % 2) return;
  E.font.title(g, B.text, Math.round(r.W / 2), y, { align: 'center', scale: sc, colors: B.colors, depth: 2, depthColor: '#1a0c24' });
  if (B.sub) E.font.text(g, B.sub, Math.round(r.W / 2), y + sc * 9 + 4, '#fff6d8', { align: 'center', outline: '#1a0c24' });
}

/* ---- events -> effects, sound, crowd, announcer, style points ---- */
const STYLE = { dunk: 200, three: 150, alleyoop: 250, block: 100, steal: 80, putback: 150, posterized: 200, shatter: 1000, supernova: 300, jackpot: 250, ankles: 100 };
function stylePts(team, pts, what, name) { const M = S.match; if (!M || team < 0) return; M.style[team] += pts; M.plays.push({ team, pts, what, name, q: M.quarter, t: M.gameT }); }
function rumbleFor(slot, k, s) { const p = S.players[slot]; if (p && p.human !== null && p.human !== undefined) { const I = game.players[p.human]; if (I && I.rumble) I.rumble(k, s); } }
const humanTeam = () => { const p = S.players.find(q => q.human !== null && q.human !== undefined); return p ? p.team : 0; };
function wireFx() {
  on('tipoff', () => { if (S.match.quarter === 1 && S.match.ot === 0) announce('tipoff'); });
  on('tipWin', () => { sting('tip'); sfx('whistle', { vol: .4 }); });
  on('basket', e => {
    const M = S.match, p = S.players[e.slot], rim = attackRim(e.team);
    if (!e.dunk) { sfx('swish'); P.glints(rim.x, rim.y, RIM_Z - 8, 6, '#ffffff'); }
    crowdReact('cheer', e.dunk ? 1 : .4);
    if (e.pts >= 3 || e.dunk) crowdReact('flash', e.dunk ? 1 : .5);
    if (e.goaltend) { banner('GOALTEND!', 'REJECTED', BANNER_COLORS.block); announce('goaltend', { NAME: '' }); }
    else if (e.buzzer) announce('buzzer', { NAME: e.name });
    else if (e.jackpot) announce('jackpot', { NAME: e.name });
    else if (e.three) { banner(e.deep ? 'FROM DOWNTOWN!' : 'THREE!', 'THREE', BANNER_COLORS.three); announce(e.deep ? 'deepThree' : 'three', { NAME: e.name }); stylePts(e.team, STYLE.three, 'THREE', e.name); }
    else if (!e.dunk) announce(e.putback ? 'putback' : e.kind === 'layup' ? 'layup' : 'jumper', { NAME: e.name });
    if (e.gold) banner('GOLD BALL x2!', 'JACKPOT', BANNER_COLORS.jackpot, { force: true });
    if (e.perfect && !e.dunk) { P.text(p.x, p.y, 60, 'PERFECT!', '#7af0ff', { scale: 1 }); }
    // the comeback and the blowout
    const d = M.score[0] - M.score[1], prev = M.prevDiff || 0; M.prevDiff = d;
    if (Math.abs(prev) >= 8 && Math.abs(d) <= 3) announce('comeback', { TEAM: get('team', S.teams[d >= 0 ? 0 : 1].id).short });
    else if (Math.abs(d) >= 15 && M.blowoutQ !== M.quarter) { M.blowoutQ = M.quarter; announce('blowout', { TEAM: get('team', S.teams[d > 0 ? 0 : 1].id).short }); }
  });
  on('dunkStart', e => {
    const p = S.players[e.slot]; if (!p || reduce()) return;
    CAM.dunk = { p }; CAM.zoomTo = 1.25; const now = game.real; CAM.slowFrom = now + e.apexT - .17; CAM.slowTo = now + e.apexT + .3; CAM.slowK = tune('dunkSlowMo');
    if (e.vent) announce('vent', { NAME: e.name });
  });
  on('dunk', e => {
    const p = S.players[e.slot], def = get('dunk', e.dunk);
    banner(e.banner, 'DUNK', BANNER_COLORS.dunk, { sub: e.oop ? 'ALLEY-OOP!' : e.putback ? 'PUTBACK!' : '' });
    game.freeze(.08); game.shake(4); if (!reduce()) game.flash('#ffffff', .06, .6);
    P.ring(e.x, e.y, 4, 26, '#fff6c0', .4); P.sparks(e.x, e.y, e.z, 16, null, { color: '#ffd23a' }); P.glints(e.x, e.y, e.z, 10, '#ffffff');
    if (def && def.fire) P.fire(e.x, e.y, e.z, 14, { size: 1.2 });
    sfx('slam'); sfx('crowd_roar'); crowdReact('cheer', 1.2); crowdReact('flash', 1);
    rumbleFor(e.slot, .6, .2); ARENA.pyro = ARENA.court.id === 'dome' ? 1 : 0;
    if (ARENA.court.id === 'dome') { sfx('pyro'); for (const x of [OX + 10, OX + CW - 10]) P.fire(x, OY - 20, 0, 14, { size: 1.6 }); }
    announce(e.oop ? 'alleyoop' : e.putback ? 'putback' : e.lines || 'dunkPower', { NAME: e.name, VICTIM: e.victim || '' });
    stylePts(p.team, STYLE.dunk + (e.bonus || 0) + (e.oop ? STYLE.alleyoop : 0) + (e.putback ? STYLE.putback : 0), e.banner, e.name);
    if (e.victim) { const v = S.players.find(q => q.name === e.victim); if (v && S.fx() < .6) game.after(.3, () => bark(p, pickF(p.def.barks))); }
    game.after(.5, () => { CAM.zoomTo = 1; CAM.dunk = null; });
  });
  on('dunkMiss', e => { announce('miss', { NAME: e.name }); sfx('crowd_ooh'); CAM.zoomTo = 1; CAM.dunk = null; });
  on('alleyoop', () => banner('ALLEY-OOP!', 'OOP', BANNER_COLORS.dunk));
  on('posterized', e => { banner('POSTERIZED!', 'POSTERIZED', BANNER_COLORS.poster, { sub: e.victim }); announce('posterized', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.posterized, 'POSTERIZED', e.name); sfx('dizzy'); });
  on('shatter', e => {
    banner('SHATTERED!', 'SHATTERED', BANNER_COLORS.shatter, { force: true, dur: 1.6 });
    game.freeze(.15); if (!reduce()) { game.flash('#c8f0ff', .12, .8); CAM.slowFrom = game.real; CAM.slowTo = game.real + .5; CAM.slowK = .3; }
    P.bits(e.x, e.y, e.z, 60, ['#cfeeff', '#ffffff', '#8ad0ff']); P.glints(e.x, e.y, e.z, 30, '#ffffff'); P.ring(e.x, e.y, 6, 40, '#c8f0ff', .5);
    sfx('shatter'); sting('shatter'); crowdReact('cheer', 1.6); crowdReact('flash', 1.5); rumbleFor(e.slot, 1, .4);
    announce('shatter', { NAME: e.name }, { force: true }); stylePts(S.players[e.slot].team, STYLE.shatter, 'SHATTERED THE GLASS', e.name);
  });
  on('sponsorBreak', () => sting('sponsor'));
  on('block', e => { banner('REJECTED!', 'REJECTED', BANNER_COLORS.block); announce('block', { NAME: e.name, VICTIM: e.victim }); sfx('crowd_ooh'); rumbleFor(e.slot, .4, .15); stylePts(S.players[e.slot].team, STYLE.block, 'BLOCK', e.name); if (S.fx() < .4) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('steal', e => { banner('PICKPOCKET!', 'PICKPOCKET', BANNER_COLORS.steal); announce('steal', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.steal, 'STEAL', e.name); if (S.fx() < .5) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('shove', e => { announce('shove', { NAME: e.name, VICTIM: e.victim }); const v = S.players[e.vslot]; if (v && v.team === humanTeam() && S.mode !== 'attract') sfx('crowd_boo', { vol: .4 }); rumbleFor(e.vslot, .5, .2); if (S.fx() < .35) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('knockdown', e => { const p = S.players[e.slot]; if (p) P.dust(p.x, p.y, 0, 10); });
  on('anklesBroken', e => { banner('ANKLES BROKEN!', 'ANKLES', BANNER_COLORS.steal); announce('ankles', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.ankles, 'ANKLES BROKEN', e.name); sfx('crowd_ooh'); });
  on('airball', e => { announce('airball', { NAME: e.name }); sfx('crowd_ooh', { vol: .5 }); });
  on('rim', () => { const b = S.ball; if (b.shot && !b.shot.made && !b.shot.blocked && S.fx() < .25) announce('miss', { NAME: b.shot.shooter.name }); if (b.shot && b.shot.team === 0) crowdReact('slump', .4); });
  on('supernovaOn', e => {
    const p = S.players[e.slot]; banner('SUPERNOVA!', 'SUPERNOVA', BANNER_COLORS.nova, { force: true, sub: e.name });
    P.ring(p.x, p.y, 6, 40, '#c890ff', .5); P.fire(p.x, p.y, 20, 20, { size: 1.1 }); sfx('nova_on'); sting('nova'); musicLayer('nova', true); ARENA.bob = 1;
    announce('novaOn', { NAME: e.name }); stylePts(e.team, STYLE.supernova, 'SUPERNOVA', e.name);
  });
  on('supernovaOff', e => { announce('novaOff', { NAME: e.name }); if (!S.players.some(p => p.nova > 0)) musicLayer('nova', false); });
  on('goaltend', () => sfx('whistle'));
  on('jackpot', e => { banner('JACKPOT!', 'JACKPOT', BANNER_COLORS.jackpot, { force: true }); sfx('jackpot'); stylePts(e.team, STYLE.jackpot, 'JACKPOT', e.name); moveSpot(); });
  on('powerupSpawn', e => { sfx('pu_spawn'); P.glints(e.x, e.y, 6, 10, get('powerup', e.id).color); P.ring(e.x, e.y, 2, 18, get('powerup', e.id).color, .4); });
  on('powerupPick', e => { const p = S.players[e.slot], def = get('powerup', e.id); sfx('pu_pick'); P.glints(p.x, p.y, 20, 12, def.color); P.text(p.x, p.y, 62, '+' + def.name, def.color, { scale: 1 }); announce('pu_' + e.id, { NAME: e.name, TEAM: get('team', p.teamId).short }); });
  on('powerupEnd', e => { if (!e.used) sfx('pu_end', { vol: .5 }); });
  on('twist', e => { if (e.kind === 'gust') announce('gust'); if (e.kind === 'eruption') { banner('ERUPTION!', 'INFO', BANNER_COLORS.dunk); announce('eruption'); sfx('bomb_whistle'); } });
  on('oilSlip', e => announce('oil', { NAME: e.name }));
  on('superBlock', e => announce('vent', { NAME: e.name }));
  on('bombHit', e => { banner('BLAM BOMB!', 'REJECTED', BANNER_COLORS.dunk, { force: true }); announce('bombHit', { NAME: e.name }); sfx('bomb_hit'); });
  on('overclock', () => { banner('OVERCLOCK!', 'SUPERNOVA', BANNER_COLORS.block, { force: true }); musicLayer('overclock', true); announce('overclock', {}, { force: true }); ARENA.jumboMsg = 'OVERCLOCK'; });
  on('overclockOff', () => { if (!S.players.some(p => p.overclock > 0)) musicLayer('overclock', false); });
  on('reboot', e => { banner('SYSTEM REBOOT!', 'REJECTED', BANNER_COLORS.shatter, { force: true }); sfx('reboot'); announce('reboot', { NAME: e.name }, { force: true }); });
  on('shotClockViolation', () => { announce('shotClock'); banner('SHOT CLOCK!', 'INFO', BANNER_COLORS.info); });
  on('quarterEnd', () => { const M = S.match; if (M.quarter === Math.floor(M.quarters / 2) && M.quarters > 1) announce('halftime', {}, { force: true }); else if (M.quarter < M.quarters) announce('quarterEnd', {}, { force: true }); });
  on('clutch', () => { announce('clutch'); musicLayer('clutch', true); try { if (musicNow && SONGS[musicNow]) A.tempo(SONGS[musicNow].bpm + 6); } catch (err) { game.fail('tempo', err); } });
  on('overtime', () => { banner('OVERTIME!', 'INFO', BANNER_COLORS.info, { force: true }); announce('overtime', {}, { force: true }); sfx('horn'); });
  on('suddenBlam', () => { banner('SUDDEN BLAM!', 'INFO', BANNER_COLORS.block, { force: true }); announce('suddenBlam', {}, { force: true }); sfx('horn'); });
  on('gameEnd', e => {
    if (e.winner >= 0) announce('final', { TEAM: get('team', S.teams[e.winner].id).short }, { force: true });
    const ht = humanTeam(), anyHuman = S.players.some(p => p.human !== null && p.human !== undefined);
    sting(!anyHuman || e.winner === ht ? 'victory' : 'defeat'); musicLayer('clutch', false);
  });
  on('taunt', e => { bark(S.players[e.slot], e.bark); if (S.fx() < .3) announce('taunt', { NAME: e.name }); });
  on('call', e => { const p = S.players[e.slot]; if (p && S.fx() < .5) bark(p, e.kind === 'oop' ? 'Up top!' : 'Here!'); });
  on('reboot', () => { if (S.mode === 'tour' && !TOUR.seenReboot) { TOUR.seenReboot = true; game.after(1.6, () => playInPlayBeat('reboot')); } });
  on('overclock', () => { if (S.mode === 'tour') game.after(1.2, () => playInPlayBeat('overclock')); });
}
