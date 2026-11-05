// ============================================================================================================
// REWIRED • 05 meta: the title (and its attract mode), chapter cards, results, game over, the ending montage,
// About / Credits, and the AI Hub session (ghost mode: a surveillance shift; the other detectives walk the
// block beside you as ghosts).
// ============================================================================================================
const RW = () => ({ W: game.W, H: game.H });
// kept in memory too, so a browser that blocks storage still unlocks chapters for the visit
const MEM = {};
const unlocked = () => Math.max(MEM.unlocked || 1, E.store.get('rewired-unlocked', 1));
function unlock(n) { if (n > unlocked()) { MEM.unlocked = n; E.store.set('rewired-unlocked', n); } }

// ---- the title -------------------------------------------------------------------------------------------------------
const TI = { menu: null, idle: 0, t: 0, lastPtr: null, chapters: false, rain: [] };
function titleMenu() {
  const items = [];
  const save = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
  items.push({ label: 'NEW CASE', id: 'new' });
  items.push({ label: 'CONTINUE', id: 'continue', disabled: !save });
  items.push({ label: 'CHAPTER SELECT', id: 'chapters', disabled: unlocked() < 2 });
  items.push({ label: 'SURVEILLANCE SHIFT • 1-2 PLAYERS', id: 'shift' });
  items.push({ label: 'SETTINGS', id: 'settings' });
  items.push({ label: 'ABOUT & CREDITS', id: 'about' });
  TI.items = items;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 0, onPick: i => titlePick(items[i]) });
  TI.menu.bg = '#0c0c12'; TI.menu.border = '#4a4a5a'; TI.menu.pick = '#d8b860';
}
function chapterMenu() {
  const n = unlocked(), items = [];
  for (let c = 1; c <= 5; c++) items.push({ label: CHAPTERS[c].tape + ' • ' + CHAPTERS[c].name.toUpperCase(), id: 'ch' + c, ch: c, disabled: c > n });
  items.push({ label: 'BACK', id: 'back' });
  TI.items = items;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 0, title: 'CHAPTER SELECT', onPick: i => titlePick(items[i]), onCancel: () => { titleMenu(); } });
  TI.menu.bg = '#0c0c12'; TI.menu.border = '#4a4a5a'; TI.menu.pick = '#d8b860';
}
function titlePick(it) {
  if (!it) return;
  if (it.id === 'new') { CASE = freshCase(); game.go('street', { mode: 'coldopen' }); }
  else if (it.id === 'continue') { try { const s = game.saves.latest(); if (s) { game.saves.load(s.slot); startChapter(CASE.chapter || 1, true); } } catch (e) { game.fail && game.fail('continue', e); } }
  else if (it.id === 'chapters') chapterMenu();
  else if (it.id === 'back') titleMenu();
  else if (it.ch) { CASE = freshCase(); seedCaseFor(it.ch); game.go('card', { chapter: it.ch }); }
  else if (it.id === 'shift') { CASE = freshCase(); game.go('street', { mode: 'shift', seconds: 180 }); }
  else if (it.id === 'settings') { try { game.menu('settings'); } catch (e) {} }
  else if (it.id === 'about') game.go('about', {});
}
// a chapter picked from the menu gets the evidence the earlier chapters would have given
function seedCaseFor(ch) {
  CASE.chapter = ch;
  if (ch >= 2) { for (const id of ['pigeon', 'h2h1', 'h2h2', 'stash', 'collect', 'tay', 'house']) addEvidence(id); CASE.pigeonPaid = 20; }
  if (ch >= 3) { CASE.pc = 90; CASE.line = 'payphone'; }
  if (ch >= 4) CASE.intel.push('Re-up: Thursday night', 'The meet: 11:40 PM', 'The meet: payphone at Lorraine and Fulton');
  if (ch >= 5) { for (const id of ['handoff', 'plate', 'arrest', 'package', 'ledger']) addEvidence(id); CASE.squeakCaught = true; }
}
function startChapter(n, fromSave) {
  const c = CHAPTERS[n];
  if (!c) { game.go('title'); return; }
  CASE.chapter = n;
  if (c.scene === 'street') game.go('street', { mode: c.mode, stage: fromSave && CASE.checkpoints[c.mode] ? CASE.checkpoints[c.mode] : 0 });
  else if (c.scene === 'office') game.go('office', {});
  else if (c.scene === 'wire') game.go('wire', {});
  else if (c.scene === 'ending') game.go('office', { mode: 'ending' });
}
const title = {
  enter() { sceneReset();
    titleMenu(); TI.idle = 0; TI.t = 0; TI.lastPtr = null; game.lights.enabled = false;
    music('title'); game.weather = null; NOTES.open = false; OBJECTIVE = { title: '', text: '' };
    try { I.touchButtons([]); } catch (e) {}
    TI.rain = []; for (let i = 0; i < 90; i++) TI.rain.push([Math.random(), Math.random(), .5 + Math.random()]);
  },
  update(dt) {
    TI.t += dt; toastTick(dt);
    const ptr = I.pointer();
    const moved = ptr && TI.lastPtr && (Math.abs(ptr[0] - TI.lastPtr[0]) + Math.abs(ptr[1] - TI.lastPtr[1]) > 2);
    TI.lastPtr = ptr ? ptr.slice() : null;
    if (I.anyPressed() || I.clicked() || moved || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3)) TI.idle = 0; else TI.idle += dt;
    if (TI.idle > 10) { demoStart(); return; }
    if (DEV.touchOnly) {
      const c = I.clicked(), b = touchSettingsBtn();
      if (c && hit(c, b.x, b.y, b.w, b.h)) { try { game.menu('settings'); } catch (e) {} }
      return;
    }
    TI.menu.y = Math.round(game.H * .5);
    TI.menu.update(dt);
  },
  draw(r) {
    drawTitleBackdrop(r);
    r.overlay(g => {
      const m = Math.round(r.H * .5);
      E.font.title(g, TITLE, r.W / 2, Math.round(r.H * .16), { scale: 5, align: 'center', colors: ['#f0ece0', '#d8b860', '#8a6a2a'], outline: '#0a0a0a', depth: 3, depthColor: '#2a1a0a' });
      E.font.text(g, 'A BALTIMORE CASE IN FIVE TAPES', r.W / 2, Math.round(r.H * .16) + 46, '#a8a49c', { align: 'center', shadow: '#000', outline: false });
      if (DEV.touchOnly) {
        E.ui.box(g, r.W / 2 - 130, m - 8, 260, 40, { bg: ['#1a0c0c', '#0c0606'], border: '#e04a3a', alpha: .92 });
        E.font.text(g, 'Controller or keyboard required', r.W / 2, m + 2, '#f0ece0', { align: 'center', scale: 1, outline: false });
        E.font.text(g, 'Connect a gamepad or keyboard to play', r.W / 2, m + 16, '#a8a49c', { align: 'center', font: 'tiny', outline: false });
        const b = touchSettingsBtn(); E.ui.box(g, b.x, b.y, b.w, b.h, { bg: ['#2a2a3a', '#1a1a24'], border: '#d8b860' }); E.font.text(g, 'SETTINGS', b.x + b.w / 2, b.y + 7, '#f0ece0', { align: 'center', outline: false });
      }
      E.font.text(g, 'v' + VERSION + ' • my-3D2dge ' + (E.version || ''), 6, r.H - 10, '#4a4a5a', { font: 'tiny', outline: false });
      if (!DEV.touchOnly) promptRow(g, [['#↑↓', 'Choose'], ['confirm', 'Select']], r.W / 2, r.H - 22);
    });
    if (!DEV.touchOnly) TI.menu.draw(r);
    drawToasts(r);
  }
};
function touchSettingsBtn() { return { x: Math.round(game.W / 2 - 50), y: Math.round(game.H * .5 + 44), w: 100, h: 20 }; }
// a skyline of rowhouses in the rain, sneakers on the wire, a streetlamp humming
function drawTitleBackdrop(r) {
  r.sky(['#06060c', '#141428', '#2a2030']);
  r.overlay(g => {
    const W = r.W, H = r.H, base = Math.round(H * .78);
    for (let i = 0; i < 40; i++) { const x = Math.round((i * 37 + 11) % W), y = Math.round((i * 53) % (H * .4)); if (E.hash2(i, 3) > .5) px.dot(g, x, y, '#3a3a5a'); }
    // rowhouses
    let x = -10, k = 0;
    while (x < W + 20) {
      const w = 30 + Math.round(E.hash2(k, 1) * 16), h = 70 + Math.round(E.hash2(k, 2) * 26), vac = E.hash2(k, 4) > .78;
      px.rect(g, x, base - h, w, h, vac ? '#141010' : '#1c1416'); px.rect(g, x, base - h, w, 3, '#0a0808');
      for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 2; fx++) {
        const wx = x + 6 + fx * (w / 2), wy = base - h + 10 + fy * 22, lit = !vac && E.hash2(k * 7 + fx, fy + Math.floor(TI.t / 9)) > .62;
        px.rect(g, wx, wy, 8, 11, vac ? '#4a3a24' : lit ? '#d8a050' : '#10141c');
        if (vac) { px.line(g, wx, wy, wx + 7, wy + 10, '#2a1e14'); px.line(g, wx + 7, wy, wx, wy + 10, '#2a1e14'); }
      }
      px.rect(g, x + w / 2 - 6, base - 6, 12, 6, '#2a2224');
      x += w; k++;
    }
    px.rect(g, 0, base, W, H - base, '#0e0e12'); px.rect(g, 0, base, W, 2, '#2a2a30');
    for (let i = 0; i < W; i += 24) px.rect(g, i, base + 22, 12, 1, '#3a3420');
    // the lamp and its pool of light
    const lx = Math.round(W * .76);
    px.rect(g, lx, base - 90, 2, 90, '#2a2a2e'); px.rect(g, lx - 10, base - 92, 14, 2, '#2a2a2e'); px.rect(g, lx - 12, base - 90, 6, 3, '#f0d080');
    const flick = E.hash2(Math.floor(TI.t * 12), 1) > .97 ? .2 : .45;
    px.blend(g, flick, 'add', () => { px.poly(g, [[lx - 10, base - 88], [lx - 34, base + 6], [lx + 18, base + 6], [lx - 4, base - 88]], '#6a5020'); });
    // the wire and the sneakers
    const wx0 = Math.round(W * .1), wx1 = Math.round(W * .62), wy = Math.round(H * .28);
    let prev = [wx0, wy];
    for (let i = 1; i <= 20; i++) { const t = i / 20, xx = lerp(wx0, wx1, t), yy = wy + Math.sin(t * Math.PI) * 14; px.line(g, prev[0], prev[1], xx, yy, '#0a0a0a'); prev = [xx, yy]; }
    const sx = Math.round(lerp(wx0, wx1, .58)), sy = Math.round(wy + Math.sin(.58 * Math.PI) * 14), sw = Math.sin(TI.t * 1.3) * 1.5;
    px.line(g, sx, sy, sx - 2 + sw, sy + 9, '#d8d8d8'); px.line(g, sx + 1, sy, sx + 4 + sw, sy + 7, '#d8d8d8');
    px.rect(g, sx - 6 + sw, sy + 9, 7, 3, '#e8e8e8'); px.rect(g, sx + 2 + sw, sy + 7, 7, 3, '#e8e8e8'); px.rect(g, sx - 6 + sw, sy + 11, 7, 1, '#c82a2a');
    // rain
    for (const d of TI.rain) { const yy = ((d[1] + TI.t * .9 * d[2]) % 1) * H, xx = ((d[0] - TI.t * .05) % 1 + 1) % 1 * W; px.line(g, xx, yy, xx - 1, yy + 4, '#3a4a6a'); }
  });
}

// ---- the attract mode: a scripted loop of every part of the game, any input ends it ------------------------------------
const DEMO = { on: false, i: 0, t: 0, seq: [['street', { mode: 'demo', demo: true }, 26], ['wire', { demo: true }, 16], ['office', { demo: true }, 11], ['street', { mode: 'chasedemo', demo: true }, 12]] };
function demoStart() { DEMO.on = true; DEMO.i = 0; DEMO.t = 0; CASE = freshCase(); const s = DEMO.seq[0]; game.go(s[0], Object.assign({}, s[1]), { fade: 'dissolve' }); }
function demoTick(dt) {
  if (!DEMO.on) return;
  DEMO.t += dt;
  const s = DEMO.seq[DEMO.i];
  if (DEMO.t > s[2]) { DEMO.t = 0; DEMO.i = (DEMO.i + 1) % DEMO.seq.length; const n = DEMO.seq[DEMO.i]; CASE = freshCase(); game.go(n[0], Object.assign({}, n[1]), { fade: 'dissolve' }); }
}
function demoInputBreak() {
  if (!DEMO.on) return false;
  const ptr = I.pointer();
  const moved = ptr && DEMO.ptr && Math.abs(ptr[0] - DEMO.ptr[0]) + Math.abs(ptr[1] - DEMO.ptr[1]) > 6;
  DEMO.ptr = ptr ? ptr.slice() : null;
  if (I.anyPressed() || I.clicked() || moved || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .4)) { DEMO.on = false; I.consumeAll(); game.go('title', {}, { fade: 'dissolve' }); return true; }
  return false;
}
function drawDemoBanner(g, r) {
  const on = Math.floor(game.real * 1.5) % 2;
  E.ui.box(g, r.W / 2 - 90, r.H - 30, 180, 20, { bg: ['#0c0c12', '#14141c'], border: '#d8b860', alpha: .85 });
  E.font.text(g, on ? 'DEMO • PRESS ANY BUTTON' : TITLE + ' • ATTRACT MODE', r.W / 2, r.H - 24, '#f0ece0', { align: 'center', outline: false });
  const seg = DEMO.seq[DEMO.i], name = { street: seg[1].mode === 'chasedemo' ? 'THE CHASE' : 'THE CORNER', wire: 'THE WIRE', office: 'THE BOARD' }[seg[0]];
  E.font.text(g, name || '', 8, 8, '#d8b860', { shadow: '#000', outline: false });
}
function demoSetup() {
  const S = STREET;
  ST.demo = true;
  const route = [S.P(6, 9), { x: S.busstop.x, y: S.busstop.y + 10 }];
  ST.botRoute = route.slice(); ST.botAimT = 0;
  ST.saleWait = .5;
  ST.bot = (p, dt) => {
    const m = p.mover, ctl = { move: [0, 0], sprint: false, crouchP: false, interact: false, act2: false, aim: false, shoot: false, mouse: null, aimMove: null };
    p.film = 36;
    if (ST.botRoute.length) { const t = ST.botRoute[0], dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy); if (d < 5) ST.botRoute.shift(); else ctl.move = [dx / d, dy / d]; return ctl; }
    const s = ST.sale, N = ST.npcs;
    let target = null;
    if (s && s.phase === 'pay' && !s.shot.pay) target = { x: (N.junebug.x + s.fiend.x) / 2, y: (N.junebug.y + s.fiend.y) / 2 };
    else if (s && s.phase === 'grab' && !s.shot.grab) target = N.squeak;
    if (target) {
      ctl.aim = true; ST.botAimT += dt;
      p.rx = lerp(p.rx, target.x, Math.min(1, dt * 6)); p.ry = lerp(p.ry, target.y, Math.min(1, dt * 6));
      if (ST.botAimT > .8) { ctl.shoot = true; ST.botAimT = 0; }
    } else ST.botAimT = 0;
    return ctl;
  };
}
// the chase demo's bot: runs Squeak down with infinite stamina, tackles in reach
function chaseBot(p, dt) {
  const m = p.mover, Q = ST.npcs.squeak, ctl = { move: [0, 0], sprint: true, crouchP: false, interact: false, act2: false, aim: false, shoot: false };
  m.stamina = m.staminaMax; m.sprintSpeed = 150;
  if (!Q || !ST.chase || ST.chase.done) return Object.assign(ctl, { sprint: false });
  const dx = Q.x - m.x, dy = Q.y - m.y, d = Math.hypot(dx, dy);
  ctl.move = [dx / d, dy / d];
  if (d < 18) ctl.act2 = true;
  return ctl;
}

// ---- the chapter card: tape number, title, an epigraph ------------------------------------------------------------------
const CD = { n: 1, t: 0 };
const card = {
  enter(data = {}) { sceneReset(); CD.n = data.chapter || 1; CD.t = 0; CASE.chapter = CD.n; CASE.stage = 0; unlock(CD.n); music(null); game.lights.enabled = false; autosave(); A.sfx('tape'); },
  update(dt) {
    CD.t += dt;
    if ((CD.t > 1.2 && (I.pressed('confirm') || I.pressed('start') || I.pressed('interact') || I.clicked())) || CD.t > 9) startChapter(CD.n);
  },
  draw(r) {
    r.sky(['#000000', '#08080c', '#0c0a0a']);
    const c = CHAPTERS[CD.n], m = Math.round(r.H / 2);
    r.overlay(g => {
      const a = Math.min(1, CD.t * 1.5);
      E.font.text(g, c.tape, r.W / 2, m - 54, a > .5 ? '#d8b860' : '#5a4a2a', { align: 'center', outline: false });
      E.font.title(g, c.name.toUpperCase(), r.W / 2, m - 40, { scale: 3, align: 'center', colors: ['#f0ece0', '#c8c4bc'], outline: '#000' });
      const q = c.quote, n = Math.floor(Math.max(0, CD.t - .8) * 40);
      let yy = m + 10; for (const l of wrapText(q.slice(0, n), Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
      if (n >= q.length) E.font.text(g, c.by, r.W / 2, yy + 6, '#8a8a9a', { align: 'center', outline: false });
      if (CD.t > 1.2) promptRow(g, [['confirm', 'Continue']], r.W / 2, r.H - 22);
    });
  }
};

// ---- results: a chapter closed, or a shift scored ------------------------------------------------------------------------
const RS = { data: null, t: 0, menu: null };
const results = {
  enter(data = {}) { sceneReset();
    RS.data = data; RS.t = 0; music('office'); game.lights.enabled = false;
    if (data.chapter) { unlock(data.chapter + 1); CASE.chapter = data.chapter + 1; CASE.stage = 0; autosave(); }
    const items = data.shift ? ['ANOTHER SHIFT', 'TITLE'] : data.final ? ['CREDITS', 'TITLE'] : ['NEXT TAPE', 'TITLE'];
    RS.menu = new E.Menu(game, items, { x: 'center', y: 0, onPick: i => {
      if (data.shift) { if (i === 0) { CASE = freshCase(); game.go('street', { mode: 'shift', seconds: 180 }); } else game.go('title'); }
      else if (data.final) game.go(i === 0 ? 'about' : 'title', { fromEnding: true });
      else if (i === 0) game.go('card', { chapter: data.chapter + 1 }); else game.go('title');
    } });
    RS.menu.bg = '#0c0c12'; RS.menu.border = '#4a4a5a'; RS.menu.pick = '#d8b860';
  },
  update(dt) { RS.t += dt; RS.menu.y = Math.round(game.H - 70); if (RS.t > .6) RS.menu.update(dt); },
  draw(r) {
    r.sky(['#0a0a0e', '#12121a', '#1a1414']);
    const d = RS.data;
    r.overlay(g => {
      const head = d.shift ? 'END OF SHIFT' : d.final ? 'CASE FILE' : (CHAPTERS[d.chapter] ? CHAPTERS[d.chapter].tape + ' CLOSED' : '');
      E.font.title(g, head, r.W / 2, 22, { scale: 2, align: 'center', colors: ['#f0ece0', '#d8b860'] });
      const stats = d.shift ? [[String(d.score), 'SCORE'], [String(d.best), 'BEST'], [String(d.photos), 'PHOTOS']]
        : d.final ? [[caseGrade().pct + '%', 'CASE STRENGTH'], [caseGrade().letter, 'GRADE'], [String(CASE.evidence.length), 'EVIDENCE']]
        : d.chapter === 1 ? [[String(CASE.evidence.length), 'EVIDENCE'], [String(CASE.heat) + '/3', 'HEAT'], [String(CASE.photos), 'PHOTOS']]
        : d.chapter === 2 ? [[String(Math.round(CASE.pc)), 'PROBABLE CAUSE'], [CASE.line === 'cell' ? 'CELL' : 'PAYPHONE', 'THE LINE'], ['30', 'DAYS']]
        : d.chapter === 3 ? [[String(CASE.intel.length), 'INTEL LOGGED'], [String(CASE.violations) + '/3', 'VIOLATIONS'], [String(CASE.tagsWasted), 'WASTED TAGS']]
        : [[String(CASE.evidence.length), 'EVIDENCE'], [CASE.squeakCaught ? 'CAUGHT' : 'GOT AWAY', 'SQUEAK'], [hasEv('handoff') ? 'YES' : 'NO', 'THE HANDOFF']];
      const n = stats.length, w = Math.min(110, Math.floor((r.W - 30) / n));
      stats.forEach(([v, l], i) => {
        const x = Math.round(r.W / 2 + (i - (n - 1) / 2) * (w + 8) - w / 2), y = 58;
        E.ui.box(g, x, y, w, 50, { bg: ['#14141c', '#0c0c12'], border: '#3a3a48' });
        E.font.text(g, v, x + w / 2, y + 10, '#f0ece0', { align: 'center', scale: 2, outline: false });
        E.font.text(g, l, x + w / 2, y + 34, '#8a8a9a', { align: 'center', font: 'tiny', outline: false });
      });
      const line = d.shift ? (IN_HUB ? 'Waiting for the other detectives.' : 'Every photo a judge can read is a point. The corner never closes.')
        : d.final ? caseGrade().line : chapterLine(d.chapter);
      let yy = 124; for (const l of wrapText(line, Math.min(320, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#c8c4bc', { align: 'center', outline: false }); yy += 11; }
    });
    RS.menu.draw(r);
  }
};
function chapterLine(n) {
  return { 1: 'Five pictures and an address. On paper, a corner is a pyramid. On the street, it\'s a kid in a blue cap.',
    2: 'Thirty days on the ' + (CASE.line === 'cell' ? 'cell' : 'payphone') + '. Feld says the clock started when the judge put the pen down.',
    3: CASE.violations ? 'The wire held, barely. Talbot\'s clerk called twice about the minimization logs.' : 'Clean logs. Feld bought the room doughnuts. Nobody ate the jelly ones.',
    4: 'Four bricks on a table, a ledger in a bag. Upstairs, somebody is already writing the press release.' }[n] || '';
}
function caseGrade() {
  const ev = CASE.evidence.length, intel = CASE.intel.length;
  let pct = Math.round(clamp(ev * 5.5 + intel * 4 + (CASE.squeakCaught ? 6 : 0) - CASE.violations * 6 - CASE.heat * 4 + (CASE.ending === 'money' ? 8 : 0), 0, 100));
  const letter = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 45 ? 'D' : 'F';
  const line = CASE.ending === 'money' ? 'The case went upstairs, where cases go to die slowly. But it went.' : 'Dope on the table. The pictures ran on page one. The corner opened at nine.';
  return { pct, letter, line };
}

// ---- game over: blown, or the wire pulled ------------------------------------------------------------------------------
const GO = { data: null, menu: null };
const gameover = {
  enter(data = {}) { sceneReset();
    GO.data = data; music(null); A.sfx('die');
    GO.menu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { x: 'center', y: 0, onPick: i => {
      if (i === 1) { game.go('title'); return; }
      const rt = data.retry || {};
      if (data.why === 'blown') CASE.heat = 0;
      if (data.why === 'wire') { CASE.violations = 0; CASE.intel = CASE.intel.filter(x => /Thursday|1419/.test(x) && false); }
      if (rt.scene === 'street') game.go('street', { mode: rt.mode, stage: rt.stage || 0 }); else if (rt.scene) game.go(rt.scene, {}); else game.go('title');
    } });
    GO.menu.bg = '#0c0c12'; GO.menu.border = '#4a4a5a'; GO.menu.pick = '#d8b860';
  },
  update(dt) { GO.menu.y = Math.round(game.H * .66); GO.menu.update(dt); },
  draw(r) {
    r.sky(['#100404', '#200808', '#0a0404']);
    const d = GO.data, m = Math.round(r.H * .3);
    r.overlay(g => {
      E.font.title(g, d.why === 'wire' ? 'WIRE PULLED' : 'CASE BLOWN', r.W / 2, m - 20, { scale: 3, align: 'center', colors: ['#f0ece0', '#e04a3a'] });
      const txt = d.why === 'wire' ? 'Three violations. Judge Talbot signed the order at 4:52. The line goes dark, and so does the case.' : 'The corner knows your face. Deacon\'s people change their phones, their stash, their corner. Months, gone.';
      let yy = m + 24; for (const l of wrapText(txt, Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
    });
    GO.menu.draw(r);
  }
};

// ---- the montage: where everybody ended up ----------------------------------------------------------------------------------
const MT = { i: 0, t: 0, slides: [] };
const montage = {
  enter() { sceneReset();
    music('ending'); MT.i = 0; MT.t = 0; game.lights.enabled = false;
    const tb = CASE.ending === 'table', S = [];
    S.push(['MABRY', tb ? 'Friday, 9 a.m. Four bricks, a stack of cash, a flag. The Deputy Commissioner called it "a major blow to the drug trade in West Baltimore."' : 'The wire stayed up twenty-six days. Then a new phone, a new code, and the line went quiet. But the ledger had already talked.']);
    S.push(['TAY', tb ? 'Tay Rucker made bail by noon. Brennan\'s office called the whole thing "a misunderstanding about a gym bag."' : 'The "D" column led to a car lot, a funeral home and a councilman\'s campaign fund. Tay was indicted in the spring. He didn\'t talk. Nobody expected him to.']);
    S.push(['SQUEAK', CASE.squeakCaught ? 'Squeak did eleven months juvenile. He came home taller. He wasn\'t anybody\'s runner anymore. He was somebody\'s hopper.' : 'Squeak was back on Monroe in nine days. Somebody had to sit the house.']);
    S.push(['PIGEON', CASE.pigeonTrust ? 'Pigeon sold socks on Fulton all winter. He still waves at the unmarked car. He shouldn\'t.' : 'Pigeon stopped taking Kowal\'s calls. In March somebody found his cart in the Courts, empty. Nobody filed a report.']);
    S.push(['JUNEBUG', 'Junebug made it to his mother\'s table that Sunday. The cake said HAPPY BIRTHDAY MAMA in blue. By April he had Moe\'s spot.']);
    S.push(['HASKINS', tb ? 'Deputy Ops Haskins made colonel. The stats on the west side looked very good that quarter.' : 'Haskins kept his word: thirty days, not sixty. He took credit for both.']);
    S.push(['KOWAL', tb ? 'Kowal got a commendation and a transfer to Southeast. The basement went back to storing evidence boxes.' : 'Kowal kept the board. In a closet, behind the evidence boxes. Somebody always keeps the board.']);
    S.push([null, 'The corner at Monroe and Calhoun opened at nine the next morning. Same as always.']);
    MT.slides = S;
  },
  update(dt) {
    MT.t += dt;
    const s = MT.slides[MT.i], full = s && MT.t * 40 >= s[1].length;
    if ((MT.t > .5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) || MT.t > (s ? s[1].length / 40 + 4.5 : 1)) {
      if (!full && MT.t <= s[1].length / 40) { MT.t = s[1].length / 40; return; }
      MT.i++; MT.t = 0; A.sfx('tape');
      if (MT.i >= MT.slides.length) game.go('results', { final: true });
    }
    const sp = MT.slides[MT.i];
    if (sp && sp[0] && CAST[sp[0]]) CAST[sp[0]].rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    r.sky(['#050505', '#0c0c10', '#100c0c']);
    const s = MT.slides[MT.i]; if (!s) return;
    r.overlay(g => {
      const m = Math.round(r.H / 2);
      if (s[0] && CAST[s[0]]) { const sz = 64; px.rect(g, r.W / 2 - sz / 2 - 3, m - 86, sz + 6, sz + 6, '#e8e4dc'); CAST[s[0]].rig.drawPortrait(g, r.W / 2 - sz / 2, m - 83, sz, { zoom: 3.2, bg: '#2a2a30', tint: '#909090' }); }
      const n = Math.floor(MT.t * 40);
      let yy = s[0] ? m - 6 : m - 20;
      for (const l of wrapText(s[1].slice(0, n), Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
      for (let i = 0; i < MT.slides.length; i++) px.rect(g, r.W / 2 - MT.slides.length * 4 + i * 8, r.H - 14, 5, 2, i === MT.i ? '#d8b860' : '#3a3a48');
    });
  }
};

// ---- About & Credits: the Source Information and the feedback, in big type, page by page -----------------------------------------
const AB = { i: 0, scroll: 0 };
const about = {
  enter(data = {}) { sceneReset(); AB.i = 0; AB.scroll = 0; AB.from = data.fromEnding; music('title'); game.lights.enabled = false; },
  update(dt) {
    const n = CREDITS.length;
    if (I.repeat('right') || I.pressed('interact')) { AB.i = (AB.i + 1) % n; AB.scroll = 0; A.sfx('select'); }
    if (I.repeat('left')) { AB.i = (AB.i + n - 1) % n; AB.scroll = 0; A.sfx('select'); }
    if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) AB.i = (AB.i + n - 1) % n; else AB.i = (AB.i + 1) % n; AB.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('start')) game.go('title');
  },
  draw(r) {
    r.sky(['#08080c', '#101018', '#14101a']);
    const pg = CREDITS[AB.i];
    r.overlay(g => {
      const ca = game.cornerArea ? game.cornerArea() : null, w = Math.min(400, r.W - 20), x = Math.round(r.W / 2 - w / 2), y = ca && ca.x0 < x + w ? Math.round(ca.y1 + 4) : 10, h = r.H - 34 - y;
      panel(g, x, y, w, h, pg.title + '   ' + (AB.i + 1) + ' / ' + CREDITS.length);
      let yy = y + 24 - Math.round(AB.scroll), maxScroll = 0;
      for (const [k, v] of pg.rows) {
        if (k) { if (yy > y + 18 && yy < y + h - 8) E.font.text(g, k, x + 10, yy, '#d8b860', { outline: false }); yy += 10; }
        for (const l of wrapText(v, w - 24)) { if (yy > y + 18 && yy < y + h - 8) E.font.text(g, l, x + 14, yy, '#e8e4dc', { outline: false }); yy += 10; }
        yy += 4;
      }
      maxScroll = Math.max(0, yy + AB.scroll - (y + h - 10));
      if (AB.scroll > maxScroll) AB.scroll = maxScroll;
      if (maxScroll > 0) E.font.text(g, '↓ more', x + w - 10, y + h - 10, '#6a6a7a', { align: 'right', font: 'tiny', outline: false });
      promptRow(g, [['#← →', 'Page'], ['#↑↓', 'Scroll'], ['cancel', 'Back']], r.W / 2, r.H - 22);
    });
  }
};

// ---- the AI Hub: ghost mode. Each copy plays its own shift from the same seed; the others' detectives show as ghosts ------------
const HB = { info: null, ended: false, resulted: false, lastProg: 0 };
function hubSetup() {
  if (!IN_HUB) return;
  HUB.on('message', (data, from) => { if (data && data.k === 'g') ST.ghosts[from] = Object.assign({ t: game.real }, data); });
  HUB.on('leave', e => { if (e) delete ST.ghosts[e.id]; });
  HUB.on('time-up', () => { if (ST.mode === 'shift') { ST.shiftLeft = 0; shiftEnd(); } hubResult(); });
  HUB.on('end', () => { HB.ended = true; ST.ended = true; try { A.music(null); A.mute(true); } catch (e) {} try { game.stop(); } catch (e) {} });
  HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    HB.info = info;
    if (!info) { game.go('title'); return; }
    const secs = Math.max(30, Math.min(180, ((info.limitMs || 200000) / 1000) - 12));
    CASE = freshCase();
    game.go('street', { mode: 'shift', seconds: secs }, { fade: 0 });
    HUB.ready();
  }).catch(() => game.go('title'));
}
function hubProgressTick() {
  if (!IN_HUB || !HB.info || HB.ended) return;
  if (game.real - HB.lastProg > 1) { HB.lastProg = game.real; try { HUB.progress({ score: ST.score, label: ST.score + ' pts • ' + CASE.photos + ' photos' }); } catch (e) {} }
}
function hubResult() {
  if (!IN_HUB || HB.resulted || HB.ended) return;
  HB.resulted = true;
  try { HUB.result({ score: ST.score, stats: { Photos: CASE.photos, Burns: CASE.burns }, awards: ST.score >= 500 ? [{ title: 'Natural Police', detail: '500 points in one shift' }] : [] }); } catch (e) {}
}
function hubGhostTick(dt) {
  if (!IN_HUB || !HB.info || HB.ended || ST.mode !== 'shift') return;
  ST.sentAt += dt;
  if (ST.sentAt > .125) {
    ST.sentAt = 0;
    const p = P1(), m = p.mover;
    try { HUB.send({ k: 'g', x: Math.round(m.x), y: Math.round(m.y), f: Math.round(m.facing * 100) / 100, a: p.aim ? 1 : 0, c: p.inCar ? 1 : 0, s: ST.score }, { reliable: false }); } catch (e) {}
  }
}
const GHOST_RIGS = {};
function drawGhosts(r) {
  if (!IN_HUB || !HB.info) return;
  for (const id in ST.ghosts) {
    const gh = ST.ghosts[id]; if (game.real - gh.t > 3 || gh.c) continue;
    const pl = (HB.info.players || []).find(p => String(p.id) === String(id)), col = pl ? pl.color : '#8a8a9a';
    const rig = GHOST_RIGS[id] || (GHOST_RIGS[id] = new E.Humanoid({ size: 1.3, weapon: null, build: 'heroic', outfit: 'coat', hair: 'short', colors: { coat: col, cloth: '#d8d8d8', pants: '#2a2a32' } }));
    const vx = gh.px !== undefined ? (gh.x - gh.px) * 8 : 0, vy = gh.py !== undefined ? (gh.y - gh.py) * 8 : 0;
    gh.px = gh.x; gh.py = gh.y;
    rig.update(1 / 60, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f || 0, point: !!gh.a });
    r.actor(gh.x, gh.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { ghost: undefined, alpha: .55 });
    r.textAt(gh.x, gh.y, 50, (pl ? pl.name : 'P' + id) + ' • ' + (gh.s || 0), col);
  }
}
// the hub's waiting scene: the round has not started yet
const hubwait = {
  update() {},
  draw(r) { drawTitleBackdrop(r); r.overlay(g => { E.font.title(g, TITLE, r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: ['#f0ece0', '#d8b860'] }); E.font.text(g, 'Connecting to the hub...', r.W / 2, r.H * .3 + 44, '#a8a49c', { align: 'center', outline: false }); }); }
};
