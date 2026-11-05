/* =====================================================================================================================
 * MENUS AND SCREENS: the dojo menu, the bonus games menu, records (one big table per page), the paged About screen, and the
 * Move List (one posture at a time: the left stick's posture, the right stick's four techniques around it, a live preview).
 * KC.Overlay holds a panel over any scene (the move list, the dev panel): it takes the input and holds the scene still,
 * except in an AI Hub session, where the world goes on and the local fighter's input is neutral.
 * ===================================================================================================================== */
KC.Overlay = {
  stack: [],
  get active() { return this.stack.length > 0; },
  push(o) { this.stack.push(o); KC.consumeAll(); },
  pop() { this.stack.pop(); KC.consumeAll(); },
  /** run the top panel; true when the scene should hold this step */
  step(dt) { const o = this.stack[this.stack.length - 1]; if (!o) return false; o.update(dt); return !SESSION; },
  draw(r) { for (const o of this.stack) r.overlay(g => o.draw(g, r.W, r.H, r)); }
};
const simpleMenuScene = (title, items, o = {}) => ({
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.d = d || {}; KC.Stage.enter(KC.game, o.stage || 'dojo'); KC.game.lights.ambient = .45; KC.music(o.music || 'practice'); this.menu = new KC.Menu({ items: items(this), y: 54, onCancel: () => KC.game.go(o.back || 'title', { menu: true }) }); KC.idle = 0; },
  rebuild() { this.menu.setItems(items(this)); },
  update(dt) { this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; } this.menu.update(dt); },
  draw(r) {
    KC.Stage.draw(r, o.stage || 'dojo', { noCrowd: true });
    r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, title, Math.round(r.W / 2), 10, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 }); const sub = this.menu.draw(g, r.W, r.H); if (sub) E.font.text(g, sub, Math.round(r.W / 2), r.H - 34, '#ffe7a8', { align: 'center', outline: '#000' }); KC.promptBar(g, r.W, r.H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); });
  }
});
KC.DUMMY_MODES = ['stand', 'crouch', 'jump', 'block', 'attack'];
KC.DojoScene = simpleMenuScene('DOJO', sc => {
  sc.dummy = sc.dummy || 0;
  return [
    { label: 'LESSON I', sub: 'FRONT, ROUND, LOW AND BACK KICKS; BLOCK, JUMP, CROUCH', act: () => KC.game.go('practice', { lesson: 'lessonI' }) },
    { label: 'LESSON II', sub: 'LUNGE PUNCHES, THE CLOSE PUNCH, SWEEPS, UPPER AND SQUAT PUNCHES', act: () => KC.game.go('practice', { lesson: 'lessonII' }) },
    { label: 'LESSON III', sub: 'SPINS, JUMPING KICKS, SOMERSAULTS, THE BACK ROLL', act: () => KC.game.go('practice', { lesson: 'lessonIII' }) },
    { label: 'ALL TECHNIQUES', sub: 'ALL 21 DRILLS IN ONE LESSON', act: () => KC.game.go('practice', { lesson: 'lessonAll' }) },
    { label: 'FREE SPAR', value: KC.DUMMY_MODES[sc.dummy].toUpperCase(), sub: 'AGAINST A DUMMY: LEFT AND RIGHT CHANGE WHAT IT DOES', adjust: k => { sc.dummy = (sc.dummy + k + 5) % 5; sc.rebuild(); }, act: () => KC.game.go('fight', KC.Versus.sparData(KC.DUMMY_MODES[sc.dummy])) },
    { label: 'MOVE LIST', sub: 'EVERY TECHNIQUE, POSTURE BY POSTURE', act: () => KC.MoveList.open() },
    { label: 'TECHNIQUE LAB', sub: 'FRAME DATA AND REACH, LIVE (DEV)', act: () => KC.game.go('lab', { tech: 'frontKick' }) }
  ];
}, { stage: 'dojo' });
KC.BonusMenuScene = simpleMenuScene('BONUS GAMES', sc => {
  sc.cfg = sc.cfg || { n: 1, mat: 0, pots: 1, bull: 1 }; const C = sc.cfg, NS = [3, 5, 7, 10], MATS = ['pine', 'tile', 'ice'], DIF = ['Easy', 'Normal', 'Hard'];
  const rebuild = () => sc.rebuild();
  return [
    { label: 'BREAK THE BOARDS', sub: 'BOARDS: LEFT AND RIGHT. HIGH SCORE ' + KC.commas(KC.Save.hi('boards')), value: NS[C.n] + ' ' + KC.DATA.boardMats[MATS[C.mat]].name, adjust: k => { C.n = (C.n + k + 4) % 4; rebuild(); }, act: () => KC.game.go('bonus', { id: 'boards', variant: { n: NS[C.n], mat: MATS[C.mat] } }) },
    { label: 'BOARD MATERIAL', value: KC.DATA.boardMats[MATS[C.mat]].name + ' x' + KC.DATA.boardMats[MATS[C.mat]].mul, adjust: k => { C.mat = (C.mat + k + 3) % 3; rebuild(); }, act: () => { C.mat = (C.mat + 1) % 3; rebuild(); } },
    { label: 'POTS AHOY!', sub: 'HIGH SCORE ' + KC.commas(KC.Save.hi('pots')), value: DIF[C.pots].toUpperCase(), adjust: k => { C.pots = (C.pots + k + 3) % 3; rebuild(); }, act: () => KC.game.go('bonus', { id: 'pots', variant: { difficulty: DIF[C.pots], seed: Math.floor(KC.game.real * 10) } }) },
    { label: 'STOP THE BULL', sub: 'HIGH SCORE ' + KC.commas(KC.Save.hi('bull')), value: DIF[C.bull].toUpperCase(), adjust: k => { C.bull = (C.bull + k + 3) % 3; rebuild(); }, act: () => KC.game.go('bonus', { id: 'bull', variant: { difficulty: DIF[C.bull] } }) }
  ];
}, { stage: 'courtyard', music: 'bonus' });
/* ---- RECORDS: one table per page (L1/R1, Q/E or click the tabs) ---- */
const REC_TABS = [['story', 'CHAMPON ROAD'], ['boards', 'BOARDS'], ['pots', 'POTS AHOY!'], ['bull', 'STOP THE BULL']];
KC.RecordsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.i = Math.max(0, REC_TABS.findIndex(t => t[0] === (d && d.mode))); this.t = 0; KC.Stage.enter(KC.game, 'stadium'); KC.music('select'); KC.idle = 0; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; }
    const n = REC_TABS.length; if (KC.anyPressed('next') || KC.anyRepeat('right')) { this.i = (this.i + 1) % n; KC.sfx('menuMove'); } if (KC.anyPressed('prev') || KC.anyRepeat('left')) { this.i = (this.i + n - 1) % n; KC.sfx('menuMove'); }
    const c = KC.game.input.clicked(); if (c && this.tabs) this.tabs.forEach(([x, w], k) => { if (c[0] >= x && c[0] < x + w && c[1] < 18) this.i = k; });
    if (KC.anyPressed('cancel') || KC.anyPressed('confirm')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      let x = 6; this.tabs = []; REC_TABS.forEach(([, name], k) => { const w = E.font.width(name) + 12; px.rect(g, x, 2, w, 14, k === this.i ? '#5a3a7a' : '#1a1430'); E.font.text(g, name, x + 6, 5, k === this.i ? '#ffd060' : '#a8a0c8', { outline: false }); this.tabs.push([x, w]); x += w + 4; });
      KC.drawTable(g, W, H, REC_TABS[this.i][0], REC_TABS[this.i][1]);
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TABLE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- ABOUT: Source Information, the feedback answers and the credits, paged (8 lines a page at most) ---- */
KC.aboutPages = () => {
  const A = KC.ABOUT || {}, S = A.sourceInformation || {}, pages = [];
  const F = [['DATE', S.date], ['SOURCE', S.source], ['PLAN', S.plan], ['GENRE', S.genre], ['PERSPECTIVE', S.perspective], ['TECH', S.tech], ['ART DIRECTION', S.artDirection], ['ANIMATION', S.animation], ['AUDIO', S.audio], ['ONLINE', S.online], ['TESTING', S.testing], ['RESEARCH', S.research], ['ENVIRONMENT', S.environment], ['MODEL', S.model], ['USAGE', S.usage]];
  const add = (title, rows) => pages.push({ title, rows });
  add('SOURCE INFORMATION', F.map(([k, v]) => [k, v || 'unknown']));
  const Q = { testing: ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], engine: ['What I liked most', 'Stuck or guessed wrong?', 'The most important thing I built', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], prompt: ['What I liked most', 'What was confusing', 'The hardest thing to do', 'What I would change'] };
  add('TESTING FEEDBACK', (A.testingFeedback || []).map((a, i) => [Q.testing[i] || '', a]));
  add('ENGINE FEEDBACK', (A.engineFeedback || []).map((a, i) => [Q.engine[i] || '', a]));
  add('PROMPT FEEDBACK', (A.promptFeedback || []).map((a, i) => [Q.prompt[i] || '', a]));
  add('CREDITS', [['GAME', 'Karate Champon: an original game inspired by Karate Champ (1984). No assets or code from the original.'], ['ENGINE', 'my-3D2dge v0.85.2 (github.com/michaelcrosato/my-3d2dge), modified'], ['PROPS', 'Kenney (kenney.nl) and KayKit (kaylousberg.com), CC0, from the engine\'s asset store'], ['ONLINE', 'AI Hub session protocol v1, client 1.4.0'], ['MADE BY', 'Claude Opus 5.5 (Anthropic) in Claude Code']]);
  return pages;
};
KC.AboutScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() { this.p = 0; this.pages = KC.aboutPages(); this.t = 0; KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); KC.idle = 0; this._lw = 0; },
  // pages of at most 12 wrapped lines (a long answer runs on over pages; a page never starts mid-way without its heading)
  linePages(W) {
    if (this._lw === W && this._lp) return this._lp; this._lw = W; const out = [], PER = 12;
    for (const P of this.pages) { let cur = { title: P.title, lines: [] }; const push = l => { if (cur.lines.length >= PER) { out.push(cur); cur = { title: P.title, lines: [] }; } cur.lines.push(l); };
      for (const [k, v] of P.rows) { if (cur.lines.length > PER - 3) { out.push(cur); cur = { title: P.title, lines: [] }; } push(['#ffd060', k]); for (const l of E.font.wrap(String(v), W - 30)) push(['#fff6e8', l]); }
      if (cur.lines.length) out.push(cur); }
    const merged = []; for (const pg of out) { const last = merged[merged.length - 1]; if (last && last.title === pg.title && last.lines.length + pg.lines.length <= PER) last.lines.push(...pg.lines); else merged.push(pg); }
    return (this._lp = merged);
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; }
    const n = this.linePages(KC.game.W).length; if (KC.anyRepeat('right') || KC.anyPressed('next') || KC.anyRepeat('down')) { this.p = Math.min(n - 1, this.p + 1); KC.sfx('menuMove'); } if (KC.anyRepeat('left') || KC.anyPressed('prev') || KC.anyRepeat('up')) { this.p = Math.max(0, this.p - 1); KC.sfx('menuMove'); }
    const c = KC.game.input.clicked(); if (c) { if (c[0] > KC.game.W / 2) this.p = Math.min(n - 1, this.p + 1); else this.p = Math.max(0, this.p - 1); }
    if (KC.anyPressed('cancel') || KC.anyPressed('confirm')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    r.overlay(g => {
      const W = r.W, H = r.H, LP = this.linePages(W), P = LP[Math.min(this.p, LP.length - 1)]; px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      E.font.title(g, P.title, Math.round(W / 2), 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      let y = 32; for (const [c, l] of P.lines) { E.font.text(g, l, 14, y, c, { outline: false, shadow: '#000' }); y += 13; }
      E.font.text(g, 'PAGE ' + (this.p + 1) + '/' + LP.length, 14, H - 32, '#a8a0c8', { outline: false });
      KC.promptBar(g, W, H, [['left', ''], ['right', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- the MOVE LIST: a panel over any scene (pause menu, dojo) ---- */
const POSTURES = [['n', 'STANDING (NO DIRECTION)'], ['f', 'STEP IN (TOWARD THE FOE)'], ['b', 'STEP BACK (AWAY)'], ['u', 'JUMP (UP)'], ['d', 'CROUCH (DOWN)']];
KC.MoveList = {
  open(standalone) {
    const M = { p: 0, sel: 'u', t: 0, preview: null, standalone,
      update(dt) {
        this.t += dt; const I = KC.game.input;
        if (KC.anyRepeat('up')) { this.p = (this.p + 4) % 5; KC.sfx('menuMove'); } if (KC.anyRepeat('down')) { this.p = (this.p + 1) % 5; KC.sfx('menuMove'); }
        for (const [a, d] of [['tUp', 'u'], ['tRight', 'f'], ['tDown', 'd'], ['tLeft', 'b']]) if (KC.anyPressed(a)) { this.sel = d; this._play(); }
        if (KC.anyRepeat('left') || KC.anyRepeat('right')) { const order = ['u', 'f', 'd', 'b'], k = order.indexOf(this.sel); this.sel = order[(k + (KC.anyRepeat('left') ? 3 : 1)) % 4]; this._play(); }
        const c = I.clicked(); if (c && this.hit) for (const [d, x, y, w, h] of this.hit) if (c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.sel = d; this._play(); }
        if (KC.anyPressed('cancel') || KC.anyPressed('pause')) { KC.consumeAll(); KC.Overlay.pop(); if (this.standalone) KC.game.go('dojo'); return; }
        const f = this.preview; if (f) { f.update(dt, null); f.pose(dt); if (f.free && !f.airborne && (this._again -= dt) < 0) this._play(); }
      },
      tech() { return KC.MATRIX[POSTURES[this.p][0]][this.sel]; },
      _play() { const id = this.tech(); if (!this.preview) { this.preview = new KC.Karateka({ fid: 'taro', side: 0, x: 0 }); this.preview.x0 = -999; this.preview.x1 = 999; } const f = this.preview; f.release(); f.x = 0; f.face = 1; if (id === 'crouch') { f.st = 'crouch'; } else f.startTech(id, null); this._again = .6; },
      draw(g, W, H, r) {
        px.blend(g, .88, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
        E.font.title(g, 'MOVE LIST', Math.round(W / 2), 4, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const [p, pname] = POSTURES[this.p], dev = KC.device(), L = { kind: 'stick', side: 'L', dir: KC.scrDir(p, 1) };
        E.font.text(g, pname, 14, 28, '#ffe7a8', { outline: false }); KC.icon(g, 14, 42, L, 3);
        E.font.text(g, '↑ ↓ POSTURE', 14, 84, '#8a80a8', { outline: false });
        // the four techniques around the right stick
        const cx = 150, cy = 108; KC.icon(g, cx - 18, cy - 18, { kind: 'stick', side: 'R', dir: null }, 3); this.hit = [];
        const spots = { u: [cx, cy - 50], f: [cx + 64, cy], d: [cx, cy + 46], b: [cx - 64, cy] };
        for (const d of ['u', 'f', 'd', 'b']) {
          const id = KC.MATRIX[p][d], T = KC.TECH[id], [x, y] = spots[d], on = d === this.sel, name = id === 'crouch' ? 'CROUCH' : T.name, w = Math.max(54, E.font.width(name, { font: 'tiny' }) + 8);
          E.ui.box(g, x - w / 2, y - 9, w, 20, { bg: on ? '#3a2a5a' : '#1a1430', border: on ? '#ffd060' : '#5a5078' });
          E.font.text(g, name, x, y - 6, on ? '#fff6d0' : '#c8c0e8', { align: 'center', outline: false, font: 'tiny' }); E.font.text(g, KC.ARROW[d] + (T.scoring ? ' ' + T.pts[0] + '-' + T.pts[1] : ''), x, y + 1, '#a8a0c8', { align: 'center', outline: false });
          if (T.scoring && T.pts[1] >= 600) E.font.text(g, '★', x + w / 2 - 6, y - 8, '#ffd060', { outline: false });
          this.hit.push([d, x - w / 2, y - 9, w, 20]);
        }
        if (p === 'n') E.font.text(g, 'CLOSE: R → IS THE REVERSE PUNCH', cx, cy + 62, '#8ae08a', { align: 'center', outline: false, font: 'tiny' });
        // the preview: the technique played by a live rig in a box
        const bx = W - 130, by = 28, bw = 118, bh = 120, id = this.tech(), T = KC.TECH[id];
        E.ui.box(g, bx, by, bw, bh, { bg: ['#2a2040', '#14101e'], border: '#e8d8b0' }); px.rect(g, bx + 4, by + bh - 22, bw - 8, 1, '#8a7ab0');
        if (this.preview && r) { const f = this.preview, view = E.VIEWS.kcside, ox = bx + 40 + Math.round(f.x * view.scale), oy = by + bh - 22 - Math.round(f.z * view.scale); f.rig.draw(g, ox, oy, view); }
        E.font.text(g, id === 'crouch' ? 'CROUCH' : T.name, bx + bw / 2, by + bh + 4, '#fff6d0', { align: 'center', outline: false });
        E.font.text(g, T.jp, bx + bw / 2, by + bh + 14, '#a8a0c8', { align: 'center', outline: false, font: 'tiny' });
        if (T.scoring) E.font.text(g, T.pts[0] + '-' + T.pts[1] + (T.pts[1] >= 600 ? '  ★ FULL' : '  HALF') + (T.unblockable ? '  UNBLOCKABLE' : ''), bx + bw / 2, by + bh + 22, T.pts[1] >= 600 ? '#ffd060' : '#c8c0e8', { align: 'center', outline: false, font: 'tiny' });
        const parts = KC.promptFor(id, KC.game.input, dev); if (parts.length) KC.iconRow(g, bx + 4, by + 4, parts, 1);
        E.font.text(g, '→ MEANS TOWARD THE FOE', 14, H - 32, '#8a80a8', { outline: false });
        KC.promptBar(g, W, H, [['up', 'POSTURE'], [{ kind: 'stick', side: dev === 'gamepad' ? 'R' : 'D', dir: null }, 'PREVIEW'], ['cancel', 'CLOSE']]);
      } };
    M._play(); KC.Overlay.push(M); return M;
  }
};
KC.MoveListScene = Object.assign(simpleMenuScene('MOVE LIST', () => []), { enter() { KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); this.menu = new KC.Menu({ items: [] }); KC.MoveList.open(true); }, update(dt) { KC.Stage.update(dt); KC.camera(KC.game, [200]); } });
