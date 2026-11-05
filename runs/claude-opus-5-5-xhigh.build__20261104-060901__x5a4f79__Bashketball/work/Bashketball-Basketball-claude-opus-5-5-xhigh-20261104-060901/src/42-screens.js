/* 42-screens: the screens (PLAN 11.3-11.4). Title, main menu, join (1-4 players), team select, lineup, court & rules,
 * the matchup card (the cheat-code window), the break card and the Halftime Report, results, the Hall of Blam, How to
 * Play, About/Credits, and the touch-only notice. Every screen works with any one device alone: pad, keys, or mouse
 * (hover moves the focus, a click picks, a right click goes back). */
const SC = {};   // scenes, by name
const CAB = new E.Arcade(game, { id: 'bashketball', hud: false });
const PROG = { tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: null, bestDunk: null, toursWon: 0 } };
function loadProgress() { const p = store.get('bb:progress', null); if (p) { Object.assign(PROG, p); PROG.unlocked = Object.assign({ bots: false, allstars: false, bigHeads: false }, p.unlocked); PROG.records = Object.assign({ mostPoints: null, bestDunk: null, toursWon: 0 }, p.records); } }
function saveProgress() { store.set('bb:progress', PROG); }
function teamUnlocked(id) { const t = get('team', id); return !t.locked || (id === 'blambots' ? PROG.unlocked.bots : PROG.unlocked.allstars) || S.dev.unlockAll; }
function noteRecords(res) {
  if (res.starred || S.mode === 'attract' || HUB) return;
  for (const b of res.box) { if (b.human === null || b.human === undefined) continue; const R = PROG.records; if (!R.mostPoints || b.stats.PTS > R.mostPoints.pts) R.mostPoints = { pts: b.stats.PTS, name: b.name }; }
  const dunk = res.best && res.best.what && S.match && S.match.plays.filter(p => get('team', S.teams[p.team].id) && S.players.some(q => q.team === p.team && q.human !== null && q.human !== undefined)).sort((a, b) => b.pts - a.pts)[0];
  if (dunk && (!PROG.records.bestDunk || dunk.pts > PROG.records.bestDunk.pts)) PROG.records.bestDunk = { pts: dunk.pts, what: dunk.what, name: dunk.name };
  saveProgress();
}
const IDLE = { t: 0 };
/** a menu scene's shared start: music, view, no touch controls, the idle clock for the attract mode */
function menuEnter(music = 'menu') { playMusic(music); game.lights.enabled = false; game.weather = null; game.setView('broadcast'); game.setZoom(1); game.cam.offset = [0, 0]; IDLE.t = 0; crowdTick(1, false); S.attract = null; if (!ARENA.map || ARENA.id !== MENU_COURT.id) setupArena(MENU_COURT.id); game.weather = null; }
const MENU_COURT = { id: 'skybox', t: 0 };
/** the arena behind the menus: the Skybox at night, panning slowly, dimmed under the panels */
function menuBackdrop(r, dim = .62) {
  if (!ARENA.map) return false;
  MENU_COURT.t += 1 / 60; game.focus(CMX + Math.sin(MENU_COURT.t * .05) * 180, CMY, 0);
  drawArena(r); game.lights.enabled = false;
  r.overlay(g => px.blend(g, dim, 'normal', () => { px.rect(g, 0, 0, r.W, r.H, '#0e0820'); }));
  return true;
}
function idleTick(dt, from) {
  if (ARENA.map) updateArena(dt);
  const nav = navInput(); if (nav.any || nav.mouse || nav.click || game.players.some(I => Math.hypot(...I.move()) > .3)) IDLE.t = 0; else IDLE.t += dt;
  if (IDLE.t > 10 && !game.paused && !(game.shell && game.shell.screen)) { IDLE.t = 0; startAttract(from); return null; }
  return nav;
}
function gotoScreen(name, data) { game.go(name, data, { fade: .18 }); }

/* ---- TITLE ---- */
const TITLE = { t: 0, rigs: null };
function titleRigs() {
  if (TITLE.rigs) return TITLE.rigs;
  const a = dressPlayer(get('player', 'riptide'), 'breakers'), b = dressPlayer(get('player', 'volt'), 'hightops');
  return (TITLE.rigs = { a, b });
}
SC.title = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('title'); setupArena('skybox'); TITLE.t = 0; game.focus(OX + 470, CMY, 0); },
  update(dt) {
    TITLE.t += dt; updateArena(dt); titleLoop(dt); game.focus(OX + 480, CMY, 0); game.cam.offset = [0, Math.round(game.H * .1)];
    if (S.touchOnly) { const c = game.input.clicked(); if (c && TITLE.setRect && inRect(c, TITLE.setRect)) game.menu('settings'); IDLE.t += dt; if (IDLE.t > 10) { IDLE.t = 0; startAttract('title'); } return; }
    const nav = idleTick(dt, 'title'); if (!nav) return;
    if (nav.confirm || nav.start || nav.click || game.input.pressed('shoot')) { consumeNav(); sfx('confirm'); gotoScreen('menu'); }
  },
  draw(r) {
    drawArena(r); const R = titleRigs();
    for (const [rig, p] of [[R.a, TITLE.pa], [R.b, TITLE.pb]]) if (p) { r.shadow(p.x, p.y, 7, .4); r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
    if (TITLE.ball) { const b = TITLE.ball; r.shadow(b.x, b.y, 3, .3); r.sprite(b.x, b.y, b.z - BALL_R, BALL_SPR[Math.floor(TITLE.t * 8) % 4], { anchor: 'bottom' }); }
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a2a6a'));
      drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .14));
      E.font.text(g, 'NO FOULS. NO MERCY. ALL BLAM.', Math.round(r.W / 2), Math.round(r.H * .14) + 58, '#fff0c8', { align: 'center', outline: '#1a0c24' });
      if (S.touchOnly) {
        E.font.text(g, 'CONTROLLER OR', Math.round(r.W / 2), Math.round(r.H * .56), '#ffffff', { align: 'center', scale: 2, outline: '#1a0c24' }); E.font.text(g, 'KEYBOARD REQUIRED', Math.round(r.W / 2), Math.round(r.H * .56) + 18, '#ffffff', { align: 'center', scale: 2, outline: '#1a0c24' });
        TITLE.setRect = drawButton(g, Math.round(r.W / 2) - 50, Math.round(r.H * .72), 100, 22, 'SETTINGS', { focus: true, center: true });
      } else if (Math.floor(game.real * 2) % 2) promptLine(g, 'PRESS {confirm} START', Math.round(r.W / 2), Math.round(r.H * .66), { align: 'center', scale: 1 });
      E.font.text(g, 'BASHKETBALL ' + VERSION + '  •  MY-3D2DGE V' + E.version, Math.round(r.W / 2), r.H - 10, '#8a80a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
function drawLogo(g, r, cx, y, sc = 4) {
  // "BASH" bursting out of a comic star, then "KETBALL": one word, BASHKETBALL, measured so the halves never overlap
  const wA = E.font.width('BASH', { scale: sc }), wB = E.font.width('KETBALL', { scale: sc - 1 }), gap = sc, x0 = Math.round(cx - (wA + gap + wB) / 2), sx = x0 + wA / 2, sy = y + 5 * sc;
  const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + game.real * .3, R = (k % 2 ? 6.5 : 10) * sc; pts.push([sx + Math.cos(a) * R * 1.35, sy + Math.sin(a) * R * .85]); }
  px.poly(g, pts, '#ff3ca6'); px.poly(g, pts.map(([x, yy]) => [sx + (x - sx) * .86, sy + (yy - sy) * .86]), '#ffd23a');
  E.font.title(g, 'BASH', x0, y + Math.round(Math.sin(game.real * 4) * 1.5), { scale: sc, colors: ['#fffbe8', '#ffe08a', '#ff8a2a', '#c8201a'], depth: 3, depthColor: '#3a0814' });
  E.font.title(g, 'KETBALL', x0 + wA + gap, y + 2 * sc, { scale: sc - 1, colors: ['#ffffff', '#c8f8ff', '#2de2ff', '#1a5ad0'], depth: 3, depthColor: '#0c0624' });
}
/** the title's loop: a lob and a slam on the Skybox, every four seconds */
function titleLoop(dt) {
  const R = titleRigs(), t = TITLE.t % 4.2, rim = RIMS[1];
  const A2 = { x: OX + 430, y: CMY + 50, z: 0 }, B0 = { x: OX + 330, y: CMY - 40 }, slam = { x: rim.x - 9, y: rim.y, z: RIM_Z + 6 - 55 };
  TITLE.pa = A2; R.a.bb.pose = t < 1.1 ? { R: [5, 2.2, 15 + 4 * Math.sin(t * 18)], L: [5, -2.2, 15] } : t < 1.4 ? CLIPS.passLob(t - 1.1) : t > 2.3 ? CLIPS.raiseRoof(t) : null; R.a.bb.w = 1;
  R.a.update(dt, { x: A2.x, y: A2.y, z: 0, vx: 0, vy: 0, facing: Math.atan2(rim.y - A2.y, rim.x - A2.x), expr: t > 2.3 ? 'smile' : null });
  let pb;
  if (t < 1.1) { const k = t / 1.1; pb = { x: lerp(B0.x, rim.x - 90, k), y: lerp(B0.y, rim.y, k), z: 0, vx: 100, flying: false }; }
  else if (t < 2.1) { const k = (t - 1.1) / 1, sx = rim.x - 90, sy = rim.y; pb = { x: lerp(sx, slam.x, k), y: lerp(sy, slam.y, k), z: slam.z * (1 - (1 - k) ** 2) + 70 * Math.sin(k * PI) * (1 - k), flying: true, k }; }
  else if (t < 3) { pb = { x: slam.x, y: slam.y, z: Math.max(0, slam.z - (t - 2.1) ** 2 * 420), flying: false, after: true }; }
  else pb = { x: slam.x - (t - 3) * 60, y: slam.y + (t - 3) * 20, z: 0, vx: -60 };
  TITLE.pb = pb;
  R.b.bb.pose = pb.flying ? dunkKeys(get('dunk', 'windmill'), pb.k) : pb.after && pb.z > 2 ? { R: [4, 4, 40], L: [4, -4, 40] } : null; R.b.bb.w = 1;
  R.b.update(dt, { x: pb.x, y: pb.y, z: pb.z, vx: pb.vx || 0, vy: 0, facing: Math.atan2(rim.y - pb.y, rim.x - pb.x), air: pb.z > 3, expr: pb.flying ? 'shout' : null });
  // the ball: in A's hands, lobbed, slammed, falling through
  if (t < 1.25) { const h = R.a.hand('R'); TITLE.ball = { x: h[0], y: h[1], z: h[2] + 2 }; }
  else if (t < 1.85) { const k = (t - 1.25) / .6, h0 = { x: A2.x, y: A2.y, z: 50 }, h1 = R.b.hand('R'); TITLE.ball = { x: lerp(h0.x, h1[0], k), y: lerp(h0.y, h1[1], k), z: lerp(h0.z, h1[2], k) + 40 * Math.sin(k * PI) }; }
  else if (t < 2.1) { const h = R.b.hand('R'); TITLE.ball = { x: h[0], y: h[1], z: h[2] + 3 }; }
  else { const k = t - 2.1; TITLE.ball = { x: rim.x, y: rim.y, z: Math.max(BALL_R, RIM_Z + 4 - k * k * 400 - k * 80) }; }
  if (t >= 2.1 && t - dt < 2.1) { hoopHit(1, 1.3); P.ring(rim.x, rim.y, 4, 24, '#fff6c0', .4); P.sparks(rim.x, rim.y, RIM_Z, 12, null, { color: '#ffd23a' }); game.shake(2); crowdReact('cheer', 1); crowdReact('flash', 1); sfx('slam', { vol: .5 }); }
}

/* ---- MAIN MENU ---- */
const MAIN_ITEMS = [
  { id: 'tour', label: 'BLAM TOUR', sub: 'The story: four stops, one robot problem' }, { id: 'exhibition', label: 'EXHIBITION', sub: 'Any teams, any court, 1-4 players' },
  { id: 'camp', label: 'BLAM CAMP', sub: 'Learn every move, one lesson at a time' }, { id: 'hall', label: 'HALL OF BLAM', sub: 'Tour scores and records' },
  { id: 'howto', label: 'HOW TO PLAY', sub: 'Controls, rules, twists, power-ups' }, { id: 'options', label: 'OPTIONS', sub: 'Settings, controls, button symbols' },
  { id: 'about', label: 'ABOUT', sub: 'Credits and how this game was made' }
];
S.menu.main = { i: 0, rects: [] };
SC.menu = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); },
  update(dt) {
    const nav = idleTick(dt, 'menu'); if (!nav) return; const st = S.menu.main;
    if (nav.settings) { game.menu('settings'); return; }
    const res = listNav(st, MAIN_ITEMS, nav);
    if (res.cancel) { gotoScreen('title'); return; }
    if (res.picked >= 0) {
      const id = MAIN_ITEMS[res.picked].id; consumeNav();
      if (id === 'tour') gotoScreen('tourmenu'); else if (id === 'exhibition') gotoScreen('join'); else if (id === 'camp') gotoScreen('camp');
      else if (id === 'hall') gotoScreen('hall'); else if (id === 'howto') gotoScreen('howto'); else if (id === 'options') game.menu('settings'); else if (id === 'about') gotoScreen('about');
    }
  },
  draw(r) {
    screenFrame(r, null, ['{confirm} SELECT', '{cancel} BACK']);
    r.overlay(g => {
      drawLogo(g, r, Math.round(r.W * .27), Math.round(r.H * .05), 3);
      const st = S.menu.main, x = Math.round(r.W * .05), w = Math.round(r.W * .42), h = 20, y0 = Math.round(r.H * .05) + 50;
      st.rects = MAIN_ITEMS.map((it, i) => drawButton(g, x, y0 + i * (h + 3), w, h, it.label, { focus: st.i === i }));
      // the preview panel
      const px0 = Math.round(r.W * .52), pw = Math.round(r.W * .44), py = Math.round(r.H * .12), ph = Math.round(r.H * .72), it = MAIN_ITEMS[st.i];
      E.ui.box(g, px0, py, pw, ph, { bg: ['#1e1434', '#120a22'], border: UIC.line });
      E.font.title(g, it.label, px0 + pw / 2, py + 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ff8a3a'] });
      wrapText(it.sub, pw - 16).forEach((l, i) => E.font.text(g, l, px0 + pw / 2, py + 30 + i * 9, UIC.ink, { align: 'center', outline: false }));
      menuPreview(g, it.id, px0 + 8, py + 52, pw - 16, ph - 60);
    });
  }
};
function menuPreview(g, id, x, y, w, h) {
  const t = game.real;
  if (id === 'tour') { STREET_TEAMS.concat('blambots').forEach((tid, i) => { const T = get('team', tid), cx = x + 12 + i * (w - 24) / 4, cy = y + h / 2 + Math.sin(i * 1.7) * 18; if (i) px.line(g, x + 12 + (i - 1) * (w - 24) / 4, y + h / 2 + Math.sin((i - 1) * 1.7) * 18, cx, cy, '#5a4a7a'); px.disc(g, cx, cy, 7, T.colors.jersey); px.sprite(g, LOGOS[T.logo].spr, cx - 6, cy - 5); }); E.font.text(g, PROG.tour ? 'STOP ' + (PROG.tour.stop + 1) + ' OF 4: CONTINUE YOUR TOUR' : 'START A NEW TOUR', x + w / 2, y + h - 10, UIC.gold, { align: 'center', outline: false }); }
  else if (id === 'exhibition') { drawPortrait(g, 'volt', x + w / 2 - 44, y + 8, 36); drawPortrait(g, 'torque', x + w / 2 + 8, y + 8, 36, { turn: -.35 }); E.font.title(g, 'VS', x + w / 2, y + 52, { align: 'center', scale: 2, colors: BANNER_COLORS.block }); E.font.text(g, '1-4 PLAYERS • 5 COURTS', x + w / 2, y + h - 10, UIC.muted, { align: 'center', outline: false }); }
  else if (id === 'camp') { drawPortrait(g, 'deedee', x + w / 2 - 18, y + 6, 36); E.font.text(g, (PROG.camp.length) + ' OF ' + CAMP_LESSONS.length + ' LESSONS DONE', x + w / 2, y + 52, UIC.gold, { align: 'center', outline: false }); }
  else if (id === 'hall') { const T = CAB.table('tour').slice(0, 5); T.forEach((e, i) => E.font.text(g, (i + 1) + '. ' + e.name + '  ' + e.score, x + 8, y + 6 + i * 10, i ? UIC.ink : UIC.gold, { outline: false })); if (!T.length) E.font.text(g, 'NO TOUR SCORES YET', x + w / 2, y + 20, UIC.muted, { align: 'center', outline: false }); }
  else if (id === 'howto') { promptLine(g, '{shoot} SHOOT  {pass} PASS', x + w / 2, y + 10, { align: 'center' }); promptLine(g, '{turbo} TURBO  {shove} SHOVE', x + w / 2, y + 24, { align: 'center' }); promptLine(g, '{oop} ALLEY-OOP', x + w / 2, y + 38, { align: 'center' }); }
  else if (id === 'options') { E.font.text(g, 'BUTTON SYMBOLS: ' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION'), x + w / 2, y + 10, UIC.ink, { align: 'center', outline: false }); E.font.text(g, 'CPU: ' + DIFF_NAMES[game.settings.difficulty || 1], x + w / 2, y + 22, UIC.ink, { align: 'center', outline: false }); }
  else if (id === 'about') { E.font.text(g, 'MADE BY CLAUDE', x + w / 2, y + 10, UIC.ink, { align: 'center', outline: false }); E.font.text(g, 'ON MY-3D2DGE v0.85.2', x + w / 2, y + 22, UIC.muted, { align: 'center', outline: false }); px.sprite(g, LOGOS.mic.big, x + w / 2 - 12, y + 34 + Math.round(Math.sin(t * 3))); }
}

/* ---- EXHIBITION: JOIN ---- */
const EXH = { seats: [], teams: ['hightops', 'breakers'], locked: [false, false], lineups: [null, null], court: 'skybox', ruleI: 0, picker: 0 };
S.menu.exh = EXH;
SC.join = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); if (!EXH.seats.length || EXH.seats.length !== game.players.length) EXH.seats = game.players.map((I, i) => ({ side: i % 2, ready: false })); game.allowJoin({ max: 4, onJoin: (I, n) => { applyGlyphs(game.settings.glyphs); EXH.seats[n - 1] = { side: (n - 1) % 2, ready: false }; } }); },
  exit() { game.allowJoin(false); },
  update(dt) {
    const nav = idleTick(dt, 'join'); if (!nav) return;
    game.players.forEach((I, i) => {
      const s = EXH.seats[i] || (EXH.seats[i] = { side: i % 2, ready: false });
      if (!s.ready && (I.pressed('left') || I.pressed('right'))) { s.side = I.pressed('left') ? 0 : 1; sfx('select'); }
      if (I.pressed('confirm')) { if (s.ready && i === 0 && EXH.seats.every((q, k) => k >= game.players.length || q.ready)) { consumeNav(); finishJoin(); return; } s.ready = true; sfx('confirm'); }
      if (I.pressed('cancel')) { if (s.ready) s.ready = false; else if (i > 0) { game.removePlayer(I); EXH.seats.splice(i, 1); } else { gotoScreen('menu'); } sfx('cancel'); }
    });
    const c = nav.click; if (c && EXH.goRect && inRect(c, EXH.goRect)) { EXH.seats.forEach(s => { s.ready = true; }); finishJoin(); }
    if (EXH.seats.length && EXH.seats.slice(0, game.players.length).every(s => s.ready) && game.players.length === 1 && EXH.autoGo) finishJoin();
  },
  draw(r) {
    screenFrame(r, 'WHO\'S PLAYING?', ['{left}{right} SIDE', '{confirm} READY', '{cancel} LEAVE']);
    r.overlay(g => {
      const cx = Math.round(r.W / 2), y0 = 36;
      E.font.title(g, 'HOME', Math.round(r.W * .22), y0, { align: 'center', scale: 2, colors: BANNER_COLORS.three }); E.font.title(g, 'AWAY', Math.round(r.W * .78), y0, { align: 'center', scale: 2, colors: BANNER_COLORS.block });
      for (let i = 0; i < 4; i++) {
        const I = game.players[i], s = EXH.seats[i], y = y0 + 24 + i * 30, col = E.PLAYER_COLORS[i];
        if (!I) { E.ui.box(g, cx - 60, y, 120, 24, { bg: '#140c24', border: UIC.line, alpha: .8 }); E.font.text(g, 'P' + (i + 1) + '  ' + (i === 1 ? 'PRESS 2 OR START' : 'PRESS START'), cx, y + 8, UIC.dim, { align: 'center', outline: false }); continue; }
        const x = s.side === 0 ? Math.round(r.W * .22) - 60 : Math.round(r.W * .78) - 60;
        E.ui.box(g, x, y, 120, 24, { bg: [E.shade(col, -.4), E.shade(col, -.6)], border: s.ready ? UIC.gold : col });
        E.font.text(g, 'P' + (i + 1), x + 6, y + 8, col, { outline: '#000' });
        const dev = I.half ? (I.half === 'left' ? 'KEYS: WASD + F G H R T' : 'KEYS: ARROWS + . / , L ;') : I.lastDevice === 'gamepad' ? 'CONTROLLER' : 'KEYBOARD + MOUSE';
        E.font.text(g, dev, x + 24, y + 3, UIC.ink, { outline: false }); E.font.text(g, s.ready ? 'READY!' : '← → PICK A SIDE', x + 24, y + 13, s.ready ? UIC.gold : UIC.muted, { outline: false });
      }
      E.font.text(g, 'EMPTY SEATS ARE PLAYED BY THE CPU', cx, y0 + 150, UIC.muted, { align: 'center', outline: false });
      const all = EXH.seats.slice(0, game.players.length).every(s => s.ready);
      EXH.goRect = drawButton(g, cx - 50, y0 + 162, 100, 18, all ? 'CONTINUE' : 'READY UP', { focus: all, center: true });
      if (all) promptLine(g, 'P1 {confirm} TO CONTINUE', cx, y0 + 186, { align: 'center' });
    });
  }
};
function finishJoin() { game.allowJoin(false); EXH.locked = [false, false]; EXH.picker = 0; gotoScreen('teams'); }
const humansOn = side => game.players.map((I, i) => ({ I, i, s: EXH.seats[i] })).filter(o => o.s && o.s.side === side);

/* ---- TEAM SELECT ---- */
const selectableTeams = () => all('team').filter(t => !t.hidden && teamUnlocked(t.id)).map(t => t.id);
SC.teams = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); EXH.forTour = !!(d && d.tour); EXH.locked = [false, EXH.forTour]; },
  update(dt) {
    const nav = idleTick(dt, 'teams'); if (!nav) return;
    const list = EXH.forTour ? STREET_TEAMS : selectableTeams();
    for (const side of [0, 1]) {
      if (EXH.locked[side]) continue;
      const owners = humansOn(side), inputs = owners.length ? owners.map(o => o.I) : (side === 1 && EXH.locked[0] || side === 0 ? [game.input] : []);
      if (side === 1 && !EXH.locked[0] && !owners.length) continue;
      for (const I of inputs) {
        const k = list.indexOf(EXH.teams[side]);
        if (I.pressed('left') || I.pressed('right')) { EXH.teams[side] = list[(k + (I.pressed('left') ? -1 : 1) + list.length) % list.length]; sfx('select'); }
        if (I.pressed('confirm')) { EXH.locked[side] = true; sfx('confirm'); I.consumeAll(); }
        if (I.pressed('oop')) { EXH.bio = EXH.bio === side ? null : side; sfx('select'); }
      }
    }
    const c = nav.click; if (c && EXH.cardRects) EXH.cardRects.forEach((rc, side) => { if (rc && inRect(c, rc) && !EXH.locked[side]) { if (c[0] < rc[0] + 20) EXH.teams[side] = list[(list.indexOf(EXH.teams[side]) - 1 + list.length) % list.length]; else if (c[0] > rc[0] + rc[2] - 20) EXH.teams[side] = list[(list.indexOf(EXH.teams[side]) + 1) % list.length]; else EXH.locked[side] = true; sfx('select'); } });
    if (nav.cancel) { if (EXH.locked[1] && !EXH.forTour) EXH.locked[1] = false; else if (EXH.locked[0]) EXH.locked[0] = false; else gotoScreen(EXH.forTour ? 'tourmenu' : 'join'); return; }
    if (EXH.locked[0] && EXH.locked[1]) { consumeNav(); if (EXH.forTour) { TOUR.team = EXH.teams[0]; gotoScreen('lineup', { tour: true }); } else gotoScreen('lineup'); }
  },
  draw(r) {
    screenFrame(r, EXH.forTour ? 'PICK YOUR CREW' : 'PICK THE TEAMS', ['{left}{right} CHANGE', '{confirm} LOCK IN', '{oop} BIO', '{cancel} BACK']);
    r.overlay(g => {
      EXH.cardRects = [0, 1].map(side => (side === 1 && EXH.forTour) ? null : teamCard(g, r, EXH.teams[side], side, EXH.locked[side]));
      if (EXH.forTour) { const x = Math.round(r.W * .54), w = Math.round(r.W * .42); E.ui.box(g, x, 36, w, r.H - 70, { bg: ['#1e1434', '#120a22'], border: UIC.line }); E.font.text(g, 'THE BLAM TOUR', x + w / 2, 44, UIC.gold, { align: 'center', outline: false }); wrapText('Win three stops and the final at the Blam Dome. Your team\'s home court is skipped: every road leads to Commissioner Gigawatt.', w - 16).forEach((l, i) => E.font.text(g, l, x + w / 2, 58 + i * 9, UIC.ink, { align: 'center', outline: false })); (TOUR_STOPS[EXH.teams[0]] || []).concat('blambots').forEach((tid, i) => { const T = get('team', tid); E.font.text(g, (i < 3 ? 'STOP ' + (i + 1) : 'FINAL') + ': ' + T.short, x + 12, 110 + i * 11, i < 3 ? UIC.ink : '#ff8a8a', { outline: false }); }); }
    });
  }
};
function teamCard(g, r, id, side, locked) {
  const T = get('team', id), w = Math.round(r.W * .42), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .54), y = 34, h = r.H - 68;
  E.ui.box(g, x, y, w, h, { bg: [E.shade(T.colors.jersey, -.5), '#120a22'], border: locked ? UIC.gold : T.colors.trim, alpha: .95 });
  E.font.text(g, side === 0 ? 'HOME' : 'AWAY', x + 6, y + 4, UIC.muted, { outline: false });
  const owners = humansOn(side); E.font.text(g, owners.length ? owners.map(o => 'P' + (o.i + 1)).join(' ') : 'CPU', x + w - 6, y + 4, owners.length ? E.PLAYER_COLORS[owners[0].i] : UIC.muted, { align: 'right', outline: false });
  px.sprite(g, LOGOS[T.logo].big, x + w / 2 - 12, y + 12);
  E.font.text(g, T.name, x + w / 2, y + 36, '#ffffff', { align: 'center', outline: '#000' });
  E.font.text(g, get('court', T.court).name, x + w / 2, y + 46, UIC.muted, { align: 'center', outline: false });
  if (!locked) { E.font.text(g, '←', x + 6, y + 22, UIC.gold, { scale: 2, outline: false }); E.font.text(g, '→', x + w - 18, y + 22, UIC.gold, { scale: 2, outline: false }); }
  if (EXH.bio === side) wrapText(T.bio + ' STYLE: ' + T.style, w - 14).forEach((l, i) => E.font.text(g, l, x + 7, y + 60 + i * 9, UIC.ink, { outline: false }));
  else {
    const rowH = Math.floor((h - 62) / 3);
    T.players.forEach((pid, i) => {
      const d = get('player', pid), ry = y + 58 + i * rowH, ps = Math.min(26, rowH - 4);
      drawPortrait(g, pid, x + 5, ry, ps);
      E.font.text(g, d.name + ' #' + d.number, x + ps + 10, ry, '#ffffff', { outline: false });
      const top = RATING_KEYS.map((k, n) => [k, d.r[n]]).sort((a, b) => b[1] - a[1]).slice(0, 2);
      E.font.text(g, top.map(([k, v]) => RATING_NAMES[k] + ' ' + v).join('  '), x + ps + 10, ry + 10, UIC.gold, { outline: false });
    });
  }
  if (locked) E.font.title(g, 'LOCKED IN', x + w / 2, y + h - 14, { align: 'center', scale: 1, colors: [UIC.gold, '#ff8a3a'] });
  return [x, y, w, h];
}

/* ---- LINEUP: each human picks a player; the other starter is the best juice ---- */
SC.lineup = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) {
    menuEnter('menu'); EXH.forTour = !!(d && d.tour);
    EXH.picks = [];   // { side, I, i, sel, done }
    for (const side of [0, 1]) { const hs = EXH.forTour ? (side === 0 ? game.players.map((I, i) => ({ I, i })) .slice(0, 2) : []) : humansOn(side); hs.slice(0, 2).forEach((o, k) => EXH.picks.push({ side, I: o.I, i: o.i, sel: k, done: false })); }
  },
  update(dt) {
    const nav = idleTick(dt, 'lineup'); if (!nav) return;
    for (const pk of EXH.picks) {
      if (pk.done) { if (pk.I.pressed('cancel')) { pk.done = false; sfx('cancel'); } continue; }
      if (pk.I.pressed('left') || pk.I.pressed('right')) { pk.sel = (pk.sel + (pk.I.pressed('left') ? 2 : 1)) % 3; sfx('select'); }
      if (pk.I.pressed('confirm')) { const taken = EXH.picks.some(o => o !== pk && o.side === pk.side && o.done && o.sel === pk.sel); if (!taken) { pk.done = true; sfx('confirm'); pk.I.consumeAll(); } else sfx('cancel'); }
      if (pk.I.pressed('cancel') && pk.i === 0) { gotoScreen('teams', EXH.forTour ? { tour: true } : null); return; }
    }
    const c = nav.click; if (c && EXH.lineRects) for (const [rc, pk, k] of EXH.lineRects) if (inRect(c, rc) && !pk.done) { pk.sel = k; pk.done = true; sfx('confirm'); }
    if (EXH.picks.every(p => p.done)) { consumeNav(); buildLineups(); if (EXH.forTour) beginTour(); else gotoScreen('courtsel'); }
  },
  draw(r) {
    screenFrame(r, 'STARTING LINEUP', ['{left}{right} PLAYER', '{confirm} PICK', '{cancel} BACK']);
    r.overlay(g => {
      EXH.lineRects = [];
      for (const side of [0, 1]) {
        const tid = EXH.teams[side], T = get('team', tid), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .54), w = Math.round(r.W * .42), y = 34;
        if (EXH.forTour && side === 1) { E.ui.box(g, x, y, w, r.H - 70, { bg: '#120a22', border: UIC.line }); E.font.text(g, 'THE TOUR STARTS SOON', x + w / 2, y + 40, UIC.muted, { align: 'center', outline: false }); continue; }
        E.ui.box(g, x, y, w, r.H - 70, { bg: [E.shade(T.colors.jersey, -.5), '#120a22'], border: T.colors.trim }); E.font.text(g, T.short, x + w / 2, y + 4, '#fff', { align: 'center', outline: false });
        T.players.forEach((pid, k) => {
          const d = get('player', pid), cy = y + 16 + k * Math.floor((r.H - 90) / 3), ch = Math.floor((r.H - 90) / 3) - 4, mine = EXH.picks.filter(p => p.side === side && p.sel === k);
          const rc = [x + 4, cy, w - 8, ch]; E.ui.box(g, ...rc, { bg: mine.length ? '#3a2a5a' : '#1a1030', border: mine.some(p => p.done) ? UIC.gold : mine.length ? E.PLAYER_COLORS[mine[0].i] : UIC.line });
          drawPortrait(g, pid, x + 8, cy + 3, Math.min(30, ch - 6)); E.font.text(g, d.name + ' #' + d.number, x + 44, cy + 3, '#fff', { outline: false }); E.font.text(g, d.role, x + 44, cy + 12, UIC.muted, { outline: false });
          const best = RATING_KEYS.map((rk, i2) => [rk, d.r[i2]]).sort((a, b) => b[1] - a[1]).slice(0, 2); E.font.text(g, best.map(([rk, v]) => RATING_NAMES[rk] + ' ' + '★'.repeat(Math.ceil(v / 2))).join('  '), x + 44, cy + 21, UIC.gold, { outline: false });
          mine.forEach((p, n) => E.font.text(g, 'P' + (p.i + 1) + (p.done ? ' ★' : ''), x + w - 10 - n * 22, cy + 3, E.PLAYER_COLORS[p.i], { align: 'right', outline: '#000' }));
          for (const p of EXH.picks.filter(q => q.side === side)) EXH.lineRects.push([rc, p, k]);
        });
      }
    });
  }
};
function buildLineups() {
  for (const side of [0, 1]) {
    const T = get('team', EXH.teams[side]), picks = EXH.picks.filter(p => p.side === side).map(p => T.players[p.sel]), rest = T.players.filter(id => !picks.includes(id));
    EXH.lineups[side] = picks.concat(rest).slice(0, 3);
  }
}
/* ---- COURT & RULES ---- */
const RULES = [
  { key: 'quarterLen', label: 'QUARTERS', opts: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']] },
  { key: 'difficulty', label: 'CPU', opts: [[0, 'ROOKIE'], [1, 'PRO'], [2, 'ALL-STAR'], [3, 'BLAM']] },
  { key: 'powerups', label: 'POWER-UPS', opts: [[true, 'ON'], [false, 'OFF']] },
  { key: 'twists', label: 'COURT TWISTS', opts: [[true, 'ON'], [false, 'OFF']] }
];
SC.courtsel = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); EXH.ruleI = 0; EXH.court = EXH.court || get('team', EXH.teams[0]).court; if (!teamUnlocked(get('court', EXH.court).home) && EXH.court === 'dome' && !S.dev.unlockAll) EXH.court = 'skybox'; },
  update(dt) {
    const nav = idleTick(dt, 'courtsel'); if (!nav) return;
    const rows = 1 + RULES.length + 1;
    if (nav.up) { EXH.ruleI = (EXH.ruleI + rows - 1) % rows; sfx('select'); } if (nav.down) { EXH.ruleI = (EXH.ruleI + 1) % rows; sfx('select'); }
    if (NAV.hover && nav.mouse && EXH.ruleRects) EXH.ruleRects.forEach((rc, i) => { if (rc && inRect(NAV.hover, rc) && EXH.ruleI !== i) { EXH.ruleI = i; sfx('select'); } });
    const d = nav.left ? -1 : nav.right ? 1 : 0, clickedRow = nav.click && EXH.ruleRects ? EXH.ruleRects.findIndex(rc => rc && inRect(nav.click, rc)) : -1;
    if (clickedRow >= 0) EXH.ruleI = clickedRow;
    if (EXH.ruleI === 0 && (d || clickedRow === 0)) { const k = COURT_ORDER.indexOf(EXH.court); let n = k; do { n = (n + (d || 1) + COURT_ORDER.length) % COURT_ORDER.length; } while (COURT_ORDER[n] === 'dome' && !PROG.unlocked.bots && !S.dev.unlockAll && n !== k); EXH.court = COURT_ORDER[n]; sfx('select'); }
    else if (EXH.ruleI > 0 && EXH.ruleI <= RULES.length && (d || clickedRow === EXH.ruleI)) { const R = RULES[EXH.ruleI - 1], cur = R.opts.findIndex(o => o[0] === game.settings[R.key]), n = (cur + (d || 1) + R.opts.length) % R.opts.length; game.settings.set(R.key, R.opts[n][0]); sfx('select'); }
    if ((nav.confirm && EXH.ruleI === rows - 1) || (clickedRow === rows - 1)) { consumeNav(); sfx('confirm'); gotoScreen('matchup', { exh: true }); return; }
    if (nav.confirm) { EXH.ruleI = rows - 1; sfx('select'); }
    if (nav.cancel) gotoScreen('lineup');
  },
  draw(r) {
    screenFrame(r, 'COURT & RULES', ['{up}{down} CHOOSE', '{left}{right} CHANGE', '{confirm} START', '{cancel} BACK']);
    r.overlay(g => {
      const C = get('court', EXH.court), x = Math.round(r.W * .05), w = Math.round(r.W * .9), y = 34; EXH.ruleRects = [];
      EXH.ruleRects.push(drawButton(g, x, y, w, 44, '← ' + C.name + ' →', { focus: EXH.ruleI === 0, sub: C.setting + '  •  TWIST: ' + TWIST_INFO[C.twist][0], scale: 2 }));
      const ty = y + 50;
      RULES.forEach((R, i) => { const cur = R.opts.find(o => o[0] === game.settings[R.key]) || R.opts[0]; EXH.ruleRects.push(drawButton(g, x, ty + i * 22, w, 19, R.label + ':  ← ' + cur[1] + ' →', { focus: EXH.ruleI === i + 1 })); });
      EXH.ruleRects.push(drawButton(g, Math.round(r.W / 2) - 60, ty + RULES.length * 22 + 4, 120, 22, 'START', { focus: EXH.ruleI === RULES.length + 1, center: true, color: UIC.gold }));
      wrapText(TWIST_INFO[C.twist][1], w - 20).slice(0, 2).forEach((l, i) => E.font.text(g, l, Math.round(r.W / 2), ty + RULES.length * 22 + 32 + i * 9, UIC.muted, { align: 'center', outline: false }));
    });
  }
};

/* ---- THE MATCHUP CARD: the starters face off; the cheat-code window ---- */
const MU = { t: 0, until: 6, codes: {}, steps: [], data: null };
SC.matchup = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter(d && d.tour ? 'tourmap' : 'menu'); MU.t = 0; MU.until = 6; MU.data = d || {}; MU.codes = {}; MU.hist = game.players.map(() => []); MU.lastStep = 0; },
  update(dt) {
    MU.t += dt; const nav = navInput();
    // cheat codes: each player's recent inputs, matched against the codes
    game.players.forEach((I, i) => {
      const h = MU.hist[i] || (MU.hist[i] = []);
      for (const a of ['up', 'down', 'left', 'right', 'shoot', 'pass', 'turbo', 'shove', 'oop']) if (I.pressed(a)) { h.push([a, MU.t]); MU.lastStep = MU.t; if (h.length > 6) h.shift(); }
      for (const C of CODES) {
        const n = C.steps.length; if (h.length < n || MU.codes[C.id]) continue;
        const tail = h.slice(-n); if (tail.every((s, k) => s[0] === C.steps[k] && (k === 0 || s[1] - tail[k - 1][1] <= .6))) { MU.codes[C.id] = { by: i }; h.length = 0; sfx('code_ok'); MU.flash = C.name + ': ON'; MU.flashT = 1.5; }
      }
    });
    if (MU.t - MU.lastStep < .6 && MU.t > MU.until - 2) MU.until += dt;   // a code in progress holds the card
    MU.flashT = Math.max(0, (MU.flashT || 0) - dt);
    const skip = (nav.confirm && game.players.some(I => I.pressed('confirm') && !I.pressed('shoot'))) || nav.click;
    if (MU.t > MU.until || (skip && MU.t > .6)) { consumeNav(); launchFromMatchup(); }
    if (nav.cancel && MU.t > .4 && !MU.data.tour) { gotoScreen('courtsel'); }
  },
  draw(r) {
    screenFrame(r, 'TONIGHT\'S MATCHUP', ['{confirm} TIP IT OFF', 'ENTER CODES NOW!']);
    r.overlay(g => {
      const teams = MU.data.tour ? [TOUR.team, TOUR.opp] : EXH.teams, lu = MU.data.tour ? TOUR.lineups : EXH.lineups, cx = Math.round(r.W / 2), y = 34;
      for (const side of [0, 1]) {
        const T = get('team', teams[side]), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .56), w = Math.round(r.W * .4);
        E.ui.box(g, x, y, w, 120, { bg: [E.shade(T.colors.jersey, -.45), '#120a22'], border: T.colors.trim });
        E.font.text(g, T.name, x + w / 2, y + 4, '#fff', { align: 'center', outline: '#000' });
        (lu[side] || T.players).slice(0, 2).forEach((pid, k) => { const d = get('player', pid); drawPortrait(g, pid, x + w / 4 - 20 + k * (w / 2), y + 16, 40, { turn: side ? -.35 : .35 }); E.font.text(g, d.name.split(' ').pop(), x + w / 4 + k * (w / 2), y + 60, '#fff', { align: 'center', outline: false }); drawMiniRatings(g, d, x + k * (w / 2), y + 72, w / 2); });
      }
      E.font.title(g, 'VS', cx, y + 44, { align: 'center', scale: 3, colors: BANNER_COLORS.block, depth: 2 });
      const C = get('court', MU.data.tour ? TOUR.court : EXH.court); E.font.text(g, 'AT ' + C.name, cx, y + 128, UIC.gold, { align: 'center', outline: false });
      E.font.text(g, String(Math.max(0, Math.ceil(MU.until - MU.t))), cx, y + 140, '#fff', { align: 'center', scale: 2, outline: '#000' });
      const on = Object.keys(MU.codes).map(id => CODES.find(c => c.id === id).name); if (on.length) E.font.text(g, on.join(' • '), cx, y + 162, '#5aff7a', { align: 'center', outline: false });
      if (MU.flashT > 0) E.font.title(g, MU.flash, cx, Math.round(r.H * .55), { align: 'center', scale: 2, colors: BANNER_COLORS.steal });
    });
  }
};
function drawMiniRatings(g, d, x, y, w) { RATING_KEYS.map((k, n) => [k, d.r[n]]).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([k, v], i) => E.font.text(g, RATING_NAMES[k] + ' ' + v, x + w / 2, y + i * 9, v >= 9 ? UIC.gold : UIC.ink, { align: 'center', outline: false })); }
/** the cheat codes entered on the card, into the match's options */
function applyCodes(o) {
  const C = MU.codes, cheats = {};
  if (C.tournament) { o.powerups = false; o.twists = false; o.comeback = 0; o.tournament = true; S.cheats = { tournament: true }; return o; }
  if (C.bigHeads) cheats.bigHeads = true; if (C.powerupsOn) o.powerups = true; if (C.noTwists) { o.twists = false; cheats.noTwists = true; }
  if (C.infTurbo) { cheats.infTurbo = 'team'; const by = C.infTurbo.by, seat = EXH.seats[by]; cheats.infTurboTeam = MU.data.tour ? 0 : seat ? seat.side : 0; }
  if (C.skyDunks) cheats.skyDunks = true; if (C.moonGravity) cheats.moonGravity = true;
  S.cheats = cheats; o.starred = Object.keys(C).length > 0;
  return o;
}
function launchFromMatchup() {
  if (MU.data.tour) { startTourMatch(); return; }
  const humans = []; game.players.forEach((I, i) => { const s = EXH.seats[i]; if (!s) return; const slotBase = s.side === 0 ? 0 : 2, used = humans.filter(h => h[0] >= slotBase && h[0] < slotBase + 2).length; if (used < 2) humans.push([slotBase + used, I]); });
  // the picks put each human on the player it chose: lineups already list the picks first, in seat order
  const o = applyCodes({ court: EXH.court, home: EXH.teams[0], away: EXH.teams[1], lineups: EXH.lineups.map(l => l.slice()), humans, quarterLen: game.settings.quarterLen || 120,
    diff: [game.settings.difficulty, game.settings.difficulty], powerups: !!game.settings.powerups, twists: !!game.settings.twists, comeback: game.settings.comeback, mode: 'exhibition', jackpotAll: !!game.settings.jackpotAll });
  EXH.lastOpts = o;
  startMatchScene(o, { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } });
  if (o.starred) game.after(.1, () => { if (S.match) S.match.starred = true; });
}

/* ---- THE BREAK CARD and THE HALFTIME REPORT ---- */
const BREAK = {
  open: false, t: 0, kind: 'quarter', subOpen: false, gag: '',
  show(kind) {
    this.open = true; this.t = 0; this.kind = kind; this.subOpen = false; this.i = 0; this.len = kind === 'half' ? 12 : 6;
    if (kind === 'half') { TOUR.gags = TOUR.gags || []; const left = HALFTIME_GAGS.filter(g => !TOUR.gags.includes(g)); this.gag = pickF(left.length ? left : HALFTIME_GAGS); TOUR.gags.push(this.gag); playMusic('halftime'); }
    if (ARENA.court && ARENA.court.id === 'scrapyard') { ARENA.carDrop = 1; game.after(.9, () => sfx('fall', { vol: .6 })); }
    if (S.attract || HUB) this.len = HUB ? 3 : 1.5;
  },
  update(dt) {
    this.t += dt; ARENA.carDrop = Math.max(0, ARENA.carDrop - dt * .5);
    const nav = navInput(), humans = S.players.filter(p => p.human !== null && p.human !== undefined && S.teams[p.team].bench.length);
    if (!HUB && !S.attract && humans.length && (nav.alt || (nav.click && this.subRect && inRect(nav.click, this.subRect)))) { this.subOpen = !this.subOpen; sfx('select'); }
    if (this.subOpen) {
      if (nav.up || nav.down) { this.i = (this.i + 1) % humans.length; sfx('select'); }
      if (nav.confirm) { const p = humans[this.i]; if (p) { substitute(p.slot); sfx('confirm'); } }
      if (nav.cancel) this.subOpen = false;
      return true;
    }
    if (this.t > this.len || (this.t > .8 && (nav.confirm || nav.click))) this.finish();
    return true;
  },
  finish() { this.open = false; cpuSubs(); if (this.kind === 'half') playMusic(ARENA.court.music); nextPeriod(); consumeNav(); },
  draw(r) {
    r.overlay(g => {
      const M = S.match, w = Math.min(r.W - 30, 330), h = this.kind === 'half' ? 170 : 128, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2) + 6;
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a4a'));
      E.ui.box(g, x, y, w, h, { bg: ['#22163a', '#0e0820'], border: UIC.gold });
      const title = this.kind === 'half' ? 'HALFTIME REPORT' : this.kind === 'ot' ? (M.sudden ? 'SUDDEN BLAM' : 'OVERTIME') : 'END OF Q' + M.quarter;
      E.font.title(g, title, x + w / 2, y + 6, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk });
      const T0 = get('team', S.teams[0].id), T1 = get('team', S.teams[1].id);
      E.font.text(g, T0.short + '  ' + M.score[0] + '  -  ' + M.score[1] + '  ' + T1.short, x + w / 2, y + 26, '#fff', { align: 'center', scale: 1, outline: '#000' });
      for (const team of [0, 1]) { const lead = teamPlayers(team).slice().sort((a, b) => b.stats.PTS - a.stats.PTS)[0]; if (lead) E.font.text(g, lead.name + ': ' + lead.stats.PTS + ' PTS', team ? x + w - 8 : x + 8, y + 40, UIC.muted, { align: team ? 'right' : 'left', outline: false }); }
      let yy = y + 54;
      if (this.kind === 'half') { wrapText(this.gag, w - 24).forEach((l, i) => E.font.text(g, l, x + w / 2, yy + i * 9, '#ffe8a0', { align: 'center', outline: false })); yy += 34; }
      // juice bars and subs for human teams
      for (const team of [0, 1]) teamPlayers(team).concat(S.teams[team].bench.map(b => ({ name: b.def.name, juice: b.juice, bench: true }))).forEach((p, i) => { const xx = team ? x + w / 2 + 6 : x + 8, ty = yy + i * 9; E.font.text(g, p.name.split(' ').pop() + (p.bench ? '*' : ''), xx, ty, p.bench ? UIC.muted : UIC.ink, { outline: false }); E.ui.bar(g, xx + 74, ty + 2, w / 2 - 90, 4, p.juice, p.juice > .6 ? '#5ae08a' : p.juice > .3 ? '#ffd23a' : '#ff5a3a'); });
      const humans = S.players.filter(p => p.human !== null && p.human !== undefined && S.teams[p.team].bench.length);
      if (this.subOpen) humans.forEach((p, i) => { drawButton(g, x + 20, y + h - 46 + i * 0, w - 40, 18, 'SUB OUT ' + p.name + ' FOR ' + S.teams[p.team].bench[0].def.name, { focus: this.i === i }); });
      else if (humans.length && !HUB && !S.attract) this.subRect = drawButton(g, x + w / 2 - 70, y + h - 40, 140, 16, 'SUBSTITUTE', { center: true });
      promptLine(g, (humans.length && !HUB && !S.attract ? '{oop} SUBS    ' : '') + '{confirm} CONTINUE  ' + Math.max(0, Math.ceil(this.len - this.t)), x + w / 2, y + h - 18, { align: 'center' });
    });
  }
};

/* ---- RESULTS ---- */
const RES = { page: 0, i: 0, res: null, from: null };
SC.results = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); RES.res = d.res; RES.from = d.from || 'exhibition'; RES.page = 0; RES.i = 0; RES.rects = []; },
  items() { return RES.from === 'tour' ? [{ label: 'CONTINUE' }] : [{ label: 'REMATCH' }, { label: 'NEW TEAMS' }, { label: 'MAIN MENU' }]; },
  update(dt) {
    const nav = navInput(), items = this.items();
    if (nav.tabL || nav.tabR || nav.left && RES.page === 1 || nav.right && RES.page === 0) { RES.page = 1 - RES.page; sfx('select'); }
    const r = listNav(RES, items, nav, { horizontal: true });
    if (r.picked >= 0) {
      consumeNav(); const L = items[r.picked].label;
      if (L === 'CONTINUE') tourAfterMatch(RES.res); else if (L === 'REMATCH') startMatchScene(Object.assign({}, EXH.lastOpts, { seed: undefined }), { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } });
      else if (L === 'NEW TEAMS') gotoScreen('teams'); else gotoScreen('menu');
    }
    if (r.cancel && RES.from !== 'tour') gotoScreen('menu');
  },
  draw(r) {
    const R = RES.res; if (!R) return;
    screenFrame(r, null, ['{left}{right} PAGE', '{confirm} SELECT']);
    r.overlay(g => {
      const cx = Math.round(r.W / 2), T0 = get('team', R.teams[0]), T1 = get('team', R.teams[1]);
      E.font.title(g, R.winner < 0 ? 'TIE GAME' : 'FINAL', cx, 6, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk });
      E.font.text(g, T0.short, cx - 70, 30, '#fff', { align: 'center', outline: '#000' }); E.font.text(g, T1.short, cx + 70, 30, '#fff', { align: 'center', outline: '#000' });
      E.font.title(g, String(R.score[0]), cx - 70, 40, { align: 'center', scale: 4, colors: R.winner === 0 ? BANNER_COLORS.jackpot : BANNER_COLORS.info });
      E.font.title(g, String(R.score[1]), cx + 70, 40, { align: 'center', scale: 4, colors: R.winner === 1 ? BANNER_COLORS.jackpot : BANNER_COLORS.info });
      if (R.starred) E.font.text(g, '★ CHEATS USED: NO HALL OF BLAM', cx, 78, '#ff8a8a', { align: 'center', outline: false });
      if (RES.page === 0) {
        if (R.mvp) { E.ui.box(g, Math.round(r.W * .06), 88, Math.round(r.W * .42), 74, { bg: '#1e1434', border: UIC.gold }); drawPortrait(g, R.mvp.id, Math.round(r.W * .06) + 6, 94, 40); E.font.text(g, 'MVP', Math.round(r.W * .06) + 52, 94, UIC.gold, { outline: false }); E.font.text(g, R.mvp.name, Math.round(r.W * .06) + 52, 104, '#fff', { outline: false }); const s = R.mvp.stats; E.font.text(g, s.PTS + ' PTS  ' + s.REB + ' REB', Math.round(r.W * .06) + 52, 116, UIC.ink, { outline: false }); E.font.text(g, s.STL + ' STL  ' + s.BLK + ' BLK  ' + s.DNK + ' DNK', Math.round(r.W * .06) + 52, 126, UIC.ink, { outline: false }); }
        const bx = Math.round(r.W * .52), bw = Math.round(r.W * .42);
        E.ui.box(g, bx, 88, bw, 74, { bg: '#1e1434', border: UIC.accent }); E.font.text(g, 'BLAM OF THE GAME', bx + bw / 2, 94, UIC.accent, { align: 'center', outline: false });
        if (R.best) { wrapText(R.best.what, bw - 12).slice(0, 2).forEach((l, i) => E.font.text(g, l, bx + bw / 2, 108 + i * 9, '#fff', { align: 'center', outline: false })); E.font.text(g, R.best.name + ' • +' + R.best.pts, bx + bw / 2, 132, UIC.gold, { align: 'center', outline: false }); }
        else E.font.text(g, 'A GAME OF FUNDAMENTALS', bx + bw / 2, 112, UIC.muted, { align: 'center', outline: false });
      } else {
        const x = Math.round(r.W * .05), w = Math.round(r.W * .9), cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'DNK'];
        E.ui.box(g, x, 86, w, 80, { bg: '#1e1434', border: UIC.line });
        cols.forEach((c, i) => E.font.text(g, c, x + w * .45 + i * (w * .55 / 6), 90, UIC.muted, { outline: false }));
        R.box.forEach((b, i) => { const y = 102 + i * 14; E.font.text(g, (b.human !== null && b.human !== undefined ? 'P' + (b.human + 1) + ' ' : '') + b.name, x + 6, y, b.team === 0 ? '#9ad8ff' : '#ffa8a8', { outline: false }); cols.forEach((c, k) => E.font.text(g, String(b.stats[c]), x + w * .45 + k * (w * .55 / 6), y, '#fff', { outline: false })); });
      }
      const items = this.items(), bw = 92, x0 = Math.round(cx - (items.length * (bw + 6)) / 2);
      RES.rects = items.map((it, i) => drawButton(g, x0 + i * (bw + 6), r.H - 42, bw, 20, it.label, { focus: RES.i === i, center: true }));
    });
  }
};

/* ---- HALL OF BLAM ---- */
SC.hall = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); },
  update(dt) { const nav = idleTick(dt, 'hall'); if (!nav) return; if (nav.cancel || nav.confirm || nav.click) { consumeNav(); gotoScreen('menu'); } },
  draw(r) {
    screenFrame(r, 'HALL OF BLAM', ['{cancel} BACK']);
    r.overlay(g => drawHallTable(g, r, 34));
  }
};
function drawHallTable(g, r, y) {
  const x = Math.round(r.W * .06), w = Math.round(r.W * .5), T = CAB.table('tour');
  E.ui.box(g, x, y, w, 128, { bg: '#1e1434', border: UIC.gold }); E.font.text(g, 'TOUR SCORES', x + w / 2, y + 4, UIC.gold, { align: 'center', outline: false });
  for (let i = 0; i < 10; i++) { const e = T[i], yy = y + 16 + i * 11; E.font.text(g, (i + 1) + '.', x + 8, yy, UIC.muted, { outline: false }); E.font.text(g, e ? e.name : '---', x + 26, yy, i === 0 ? UIC.gold : UIC.ink, { outline: false }); E.font.text(g, e ? String(e.score) : '0', x + w - 8, yy, '#fff', { align: 'right', outline: false }); }
  const rx = x + w + 8, rw = Math.round(r.W * .94) - rx, R = PROG.records;
  E.ui.box(g, rx, y, rw, 128, { bg: '#1e1434', border: UIC.accent }); E.font.text(g, 'RECORDS', rx + rw / 2, y + 4, UIC.accent, { align: 'center', outline: false });
  const lines = [['MOST POINTS IN A GAME', R.mostPoints ? R.mostPoints.pts + ' • ' + R.mostPoints.name : '---'], ['BEST PLAY', R.bestDunk ? R.bestDunk.what : '---'], ['', R.bestDunk ? R.bestDunk.name + ' • +' + R.bestDunk.pts : ''], ['TOURS WON', String(R.toursWon || 0)]];
  lines.forEach(([a, b], i) => { E.font.text(g, a, rx + 6, y + 18 + i * 24, UIC.muted, { outline: false }); wrapText(b, rw - 12).slice(0, 1).forEach(l => E.font.text(g, l, rx + 6, y + 28 + i * 24, '#fff', { outline: false })); });
}

/* ---- HOW TO PLAY: three pages ---- */
const HOW = { page: 0 };
const HOW_ROWS = [['move', 'RUN • DRIBBLE • DEFEND'], ['shoot', 'HOLD TO JUMP, LET GO AT THE TOP • BLOCK'], ['turbo', 'TURBO • HOLD IT + SHOOT TO DUNK'], ['pass', 'PASS • STEAL WITHOUT THE BALL'], ['shove', 'SPIN MOVE WITH IT • SHOVE WITHOUT'], ['oop', 'ALLEY-OOP • CALL FOR IT'], ['taunt', 'TAUNT']];
SC.howto = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); HOW.page = 0; HOW.back = d && d.back; },
  update(dt) { const nav = idleTick(dt, 'howto'); if (!nav) return; if (nav.left || nav.tabL) { HOW.page = (HOW.page + 2) % 3; sfx('select'); } if (nav.right || nav.tabR || nav.confirm || nav.click) { HOW.page = (HOW.page + 1) % 3; sfx('select'); } if (nav.cancel) { consumeNav(); gotoScreen(HOW.back || 'menu'); } },
  draw(r) {
    screenFrame(r, ['CONTROLS', 'THE RULES', 'TWISTS & POWER-UPS'][HOW.page], ['{left}{right} PAGE ' + (HOW.page + 1) + '/3', '{cancel} BACK']);
    r.overlay(g => howPage(g, r, HOW.page, 32));
  }
};
function howPage(g, r, page, y) {
  const x = Math.round(r.W * .06), w = Math.round(r.W * .88);
  if (page === 0) {
    const dev = game.input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard';
    E.font.text(g, dev === 'gamepad' ? 'CONTROLLER (' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION') + ' SYMBOLS)' : 'KEYBOARD AND MOUSE', x + w / 2, y, UIC.muted, { align: 'center', outline: false });
    HOW_ROWS.forEach(([a, text], i) => { const yy = y + 12 + i * 24, pad = dev === 'gamepad'; E.ui.box(g, x, yy - 2, w, 23, { bg: '#1e1434', border: UIC.line, alpha: .9 }); const gk = glyphFor(a, game.input, pad ? 'gamepad' : 'keyboard'), kw = drawGlyph(g, gk, x + 6, yy, pad ? 2 : 1); if (!pad && (a === 'shoot' || a === 'pass')) drawGlyph(g, glyphFor(a, game.input, 'mouse'), x + 10 + kw, yy, 1); E.font.text(g, text, x + 66, yy + 6, UIC.ink, { outline: false }); });
  } else if (page === 1) {
    const lines = ['2 ON 2, FULL COURT, FOUR QUARTERS. MOST POINTS WINS.', 'NO FOULS: SHOVING, STEALING AND BODY CONTACT ARE LEGAL.', 'NO TRAVELING, NO BACKCOURT, NO OUT OF BOUNDS.', 'TWO POINTS, THREE FROM BEYOND THE ARC. DUNKS ARE TWO.',
      '20-SECOND SHOT CLOCK. TOUCH THE RIM AND IT RESETS.', 'GOALTENDING (A BALL COMING DOWN OVER THE RIM) COUNTS FOR THE SHOOTER.', 'DUNKS NEED TURBO. LET GO OF A JUMPER AT THE TOP: PERFECT!', 'SCORE 3 IN A ROW UNANSWERED: SUPERNOVA! UNLIMITED TURBO,', 'HOTTER SHOTS, SHATTERING DUNKS. IT ENDS WHEN THEY SCORE.', 'TIED AFTER 4: OVERTIME. TIED AFTER TWO: SUDDEN BLAM.'];
    lines.forEach((l, i) => E.font.text(g, l, x, y + 4 + i * 14, i === 1 || i === 7 ? UIC.gold : UIC.ink, { outline: false }));
  } else {
    COURT_ORDER.forEach((cid, i) => { const C = get('court', cid), info = TWIST_INFO[C.twist]; E.font.text(g, C.name + ': ' + info[0], x, y + i * 18, UIC.gold, { outline: false }); E.font.text(g, wrapText(info[1], w)[0], x, y + 8 + i * 18, UIC.muted, { font: 'tiny', outline: false }); });
    PU_ORDER.forEach((id, i) => { const d = get('powerup', id), xx = x + (i % 2) * (w / 2), yy = y + 96 + Math.floor(i / 2) * 22; px.sprite(g, d.icon, xx, yy); E.font.text(g, d.name, xx + 16, yy, d.color, { outline: false }); E.font.text(g, wrapText(d.help, w / 2 - 20)[0], xx + 16, yy + 9, UIC.muted, { font: 'tiny', outline: false }); });
  }
}

/* ---- ABOUT / CREDITS: one topic a page ---- */
const ABOUT = { page: 0, scroll: 0 };
function aboutPages() { const p = ABOUT_PAGES.slice(); if (PROG.unlocked.bots || S.dev.unlockAll) p.push(['SECRETS', SECRETS_TEXT]); return p; }
SC.about = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('credits'); ABOUT.page = 0; ABOUT.scroll = 0; },
  update(dt) {
    const nav = idleTick(dt, 'about'); if (!nav) return; const n = aboutPages().length;
    if (nav.left || nav.tabL) { ABOUT.page = (ABOUT.page + n - 1) % n; ABOUT.scroll = 0; sfx('select'); }
    if (nav.right || nav.tabR || nav.click) { ABOUT.page = (ABOUT.page + 1) % n; ABOUT.scroll = 0; sfx('select'); }
    if (nav.down) ABOUT.scroll++; if (nav.up) ABOUT.scroll = Math.max(0, ABOUT.scroll - 1);
    const z = game.input.zoom(); if (z && z !== 1) ABOUT.scroll = Math.max(0, ABOUT.scroll + (z < 1 ? 1 : -1));
    if (nav.cancel || nav.confirm) { consumeNav(); gotoScreen('menu'); }
  },
  draw(r) {
    const pages = aboutPages(), [title, body] = pages[ABOUT.page % pages.length];
    screenFrame(r, title, ['{left}{right} PAGE ' + (ABOUT.page + 1) + '/' + pages.length, '{up}{down} SCROLL', '{cancel} BACK']);
    r.overlay(g => {
      const x = Math.round(r.W * .05), w = Math.round(r.W * .9), y = 30, rows = Math.floor((r.H - 52 - y) / 9);
      const lines = []; for (const para of body) { const ls = wrapText(para, w); lines.push(...ls, ''); }
      ABOUT.scroll = Math.min(ABOUT.scroll, Math.max(0, lines.length - rows));
      lines.slice(ABOUT.scroll, ABOUT.scroll + rows).forEach((l, i) => E.font.text(g, l, x, y + i * 9, /^[A-Z][A-Z &/-]+:/.test(l) ? UIC.gold : UIC.ink, { outline: false }));
      if (lines.length > rows) { const k = ABOUT.scroll / Math.max(1, lines.length - rows); px.rect(g, r.W - 6, y, 2, rows * 9, '#2a2040'); px.rect(g, r.W - 6, y + Math.round(k * (rows * 9 - 12)), 2, 12, UIC.gold); }
    });
  }
};
