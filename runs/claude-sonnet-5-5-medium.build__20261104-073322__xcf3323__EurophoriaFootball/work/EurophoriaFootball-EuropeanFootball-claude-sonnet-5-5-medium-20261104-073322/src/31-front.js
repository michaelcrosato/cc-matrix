/* ============ 31-front: title, kick-about setup, penalties setup, sticker album, about ============ */
const OPPS = ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu', 'gulls'];
const teamOpts = () => OPPS.map(t => [t, EF.get('team', t).name]);
const ballOpts = () => { const u = EF.Save.load().unlocks; return EF.BALLS.filter(b => b.id === 'classic' || b.id === 'orange' || (b.id === 'leather' && u.leather) || (b.id === 'gold' && u.cup)).map(b => [b.id, b.name]); };
const stadOpts = () => ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium', 'rec'].map(s => [s, EF.get('stadium', s).name]);
EF.idle = 0;
EF.idleStep = (dt, scene) => {
  EF.pollPads(); const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== EF.lastPointer[0] || p[1] !== EF.lastPointer[1])) { EF.lastPointer = [p[0], p[1]]; EF.lastInput = performance.now(); }
  if (game.players.some(q => q.anyPressed && q.anyPressed())) EF.lastInput = performance.now();
  if (performance.now() - EF.lastInput > 10000 && !EF.session && !EF.noAttract) { EF.lastInput = performance.now(); game.go('attract', { from: scene }); }
};
/* ---- TITLE ---- */
const titleStage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'ground', side: '#2a6a34' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#05060f', '#141a3a', '#3a2a58'], moon: { x: .8, y: .2, r: 12, color: '#e8e4c8' }, stars: 50, layers: [{ kind: 'city', color: '#0c1024', y: .72, height: .22, parallax: 0 }, { kind: 'hills', color: '#101830', y: .8, height: .12, parallax: 0 }] });
EF.scenes.title = {
  view: 'side', views: ['side'], input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() {
    if (EF.pendingDrill) { const id = EF.pendingDrill; EF.pendingDrill = null; EF.startDrill(id); return; }
    EF.music('title'); game.resetCamera && game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; EF.lastInput = performance.now(); game.weather = null; EF.notices = []; game.input.touchEnabled = false;
    const kip = EF.get('team', 'kip'); this.rigs = kip.players.map((p, i) => ({ rig: EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: kip.kit }, { kit: kip.kit }], }, 0) : kip.kit, i === 0 ? 'GK' : p.pos, { gloves: '#fff' }), x: 530 + i * 34 })); this.t = 0; this.ball = { x: 700, z: 0, vz: 0 };
    const sv = EF.Save.load(), items = [];
    if (sv.started && sv.round < 5) items.push({ label: 'CONTINUE CUP RUN', sub: 'ROUND ' + (sv.round + 1), hint: 'Back to the Europhoria Cup: ' + EF.STORY.rounds[sv.round].name, onPick: () => game.go('cup', { resume: true }) });
    items.push({ label: sv.started && sv.round < 5 ? 'NEW CUP RUN' : 'CUP RUN', hint: 'Five rounds from the Smokehouse to the Euphorium. Co-op welcome.', onPick: () => { EF.Save.reset(); EF.Save.load().started = true; EF.Save.save(); game.go('cup', { fresh: true }); } });
    items.push({ label: 'KICK-ABOUT', hint: '5-a-side, one to four players, any teams.', onPick: () => game.go('setup') });
    items.push({ label: 'PENALTIES', hint: 'A shootout, and nothing else. Hold your nerve.', onPick: () => game.go('penaltysetup') });
    items.push({ label: 'TRAINING', hint: 'Nine drills with Mags, Sandra and the lads.', onPick: () => game.go('training') });
    items.push({ label: 'STICKER ALBUM', sub: EF.Save.count() + '/' + EF.STICKERS.length, hint: 'Collect them all.', onPick: () => game.go('album') });
    items.push({ label: 'OPTIONS', hint: 'Settings, sound, controls, button symbols.', onPick: () => game.menu('settings') });
    items.push({ label: 'ABOUT AND CREDITS', hint: 'Who made this, with what, and how.', onPick: () => game.go('about') });
    this.menu = new UI.Menu(items, { y: 88, w: 190, h: 17, scale: 1, x: 20 }); this.touch = EF.touchOnly();
    this.touchBtn = null;
  },
  update(dt) {
    if (!this.rigs) return; this.t += dt; EF.idleStep(dt, 'title');
    if (EF.touchOnly()) { const c = game.input.clicked && game.input.clicked(); if (c && this.touchRect && c[0] >= this.touchRect[0] && c[0] < this.touchRect[0] + this.touchRect[2] && c[1] >= this.touchRect[1] && c[1] < this.touchRect[1] + this.touchRect[3]) game.menu('settings'); return; }
    this.menu.update(dt);
    game.focus(430, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    this.rigs.forEach((h, i) => { const u = (this.t * .4 + i * .3) % 3; h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: i === 0 ? Math.PI : 0, vx: 0, vy: 0, pose: u < 2 ? 'cheer' : 'hips', expr: u < 2 ? 'shout' : 'smile', attack: i === 4 && u > 2.5 ? E.move('kick', (u - 2.5) * 2) : null }); });
    // the ball bounces
    this.ball.vz -= 400 * dt; this.ball.z += this.ball.vz * dt; if (this.ball.z < 0) { this.ball.z = 0; this.ball.vz = 150; }
  },
  draw(r) {
    if (!this.rigs) return; titleBg.draw(r); titleStage.draw(r); const view = E.charView(r.view);
    for (const x of [330, 760]) { r.prop('streetlamp', x, 0, 32, { size: 1.6, light: true }); }
    for (const h of this.rigs) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, view));
    r.sprite(this.ball.x, 0, 32 + this.ball.z + 3, EF.ballSprite('classic', Math.floor(this.t * 4) % 2), { anchor: 'center' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, 230, H, '#05060f'));
      E.font.title(g, 'EUROPHORIA', 120, 10, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.title(g, 'FOOTBALL', 120, 40, { align: 'center', scale: 3, colors: ['#e8f4ff', '#9ad8ff', '#4a8aff', '#2a4ab0'], depth: 3 });
      TXT(g, 'FISH OUT OF WATER. FANS OUT OF CONTROL.', 120, 70, '#ffe7a8', { font: 'tiny', align: 'center' });
      if (EF.touchOnly()) { const bw = 250, bx = Math.round((W - bw) / 2) + 30, by = Math.round(H * .3); UI.panel(g, bx - 6, by - 6, bw + 12, 96); TXT(g, 'CONTROLLER OR KEYBOARD REQUIRED', bx + bw / 2, by + 6, '#ffe08a', { scale: 1, align: 'center' }); TXT(g, 'Plug in a pad, or press a key.', bx + bw / 2, by + 22, '#c8d4ff', { align: 'center' }); px.rect(g, bx + 60, by + 44, bw - 120, 24, '#ffc83a'); px.rect(g, bx + 62, by + 46, bw - 124, 20, '#1c2a5a'); TXT(g, 'SETTINGS', bx + bw / 2, by + 51, '#ffffff', { scale: 2, align: 'center' }); this.touchRect = [bx + 60, by + 44, bw - 120, 24]; TXT(g, 'THE DEMO WILL PLAY ITSELF IN A MOMENT', bx + bw / 2, by + 78, '#8a9ac8', { font: 'tiny', align: 'center' }); }
      TXT(g, 'DEMO v1  -  my-3D2dge ' + E.version, 6, H - 20, '#6a7ab0', { font: 'tiny' });
    });
    if (!EF.touchOnly()) { this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['up', 'MOVE']])); }
  }
};
/* ---- KICK-ABOUT SETUP ---- */
EF.setup = { home: 'kip', away: 'hoo', stadium: 'smokehouse', ref: 'haltwhistle', half: '120', sides: [0, -1, -1, -1], joined: [true, false, false, false] };
EF.scenes.setup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() {
    const S = EF.setup; EF.music('cup'); game.follow(null); L.enabled = false; EF.lastInput = performance.now();
    game.allowJoin({ max: 4, onJoin: (input, n) => { S.joined[n] = true; S.sides[n] = n % 2 ? 1 : 0; EF.sfx('confirm'); } });
    this.menu = new UI.Menu([
      { label: 'HOME', type: 'select', options: teamOpts(), get: () => S.home, set: v => { S.home = v; }, hint: 'The team on the left.' },
      { label: 'AWAY', type: 'select', options: teamOpts(), get: () => S.away, set: v => { S.away = v; } },
      { label: 'STADIUM', type: 'select', options: stadOpts(), get: () => S.stadium, set: v => { S.stadium = v; } },
      { label: 'REFEREE', type: 'select', options: EF.all('referee').map(x => [x.id, x.name]), get: () => S.ref, set: v => { S.ref = v; } },
      { label: 'HALF LENGTH', type: 'select', options: [['60', '1:00'], ['120', '2:00'], ['180', '3:00']], get: () => S.half, set: v => { S.half = v; } },
      { label: 'BALL', type: 'select', options: ballOpts(), get: () => EF.Save.load().ballId, set: v => { EF.Save.load().ballId = v; EF.Save.save(); }, hint: 'Win the cup and clear all five Gaffer\'s Challenges to unlock more.' },
      { label: 'PLAYERS', type: 'custom', h: 34, onAdjust: d => { const cyc = [0, -1, 1]; const k = cyc.indexOf(S.sides[0]); S.sides[0] = cyc[(k + (d > 0 ? 1 : 2)) % 3]; }, hint: 'Start (pad) or 2 (keyboard) joins. Left and right move you between the teams.',
        draw: (g, x, y, w, h, foc) => { const cols = [['HOME', 0], ['CPU', -1], ['AWAY', 1]], cw = 62, x0 = x + w - cw * 3 - 4; cols.forEach(([nm, sd], c) => { const cx = x0 + c * cw; px.rect(g, cx, y + 1, cw - 3, h - 4, foc ? '#2a3a7a' : '#161e44'); TXT(g, nm, cx + 3, y + 3, '#8a9ac8', { font: 'tiny' }); let n = 0; for (let i = 0; i < 4; i++) if (S.joined[i] && S.sides[i] === sd) { px.rect(g, cx + 3 + n * 14, y + 14, 13, 10, E.PLAYER_COLORS[i]); TXT(g, 'P' + (i + 1), cx + 9 + n * 14, y + 16, '#000', { font: 'tiny', align: 'center', shadow: false }); n++; } }); } },
      { label: 'KICK OFF', onPick: () => this.go() }, { label: 'BACK', onPick: () => game.go('title') }], { y: 28, w: 260, h: 16, scale: 1, onCancel: () => game.go('title') });
  },
  go() {
    const S = EF.setup, humans = []; for (let i = 0; i < 4; i++) if (S.joined[i] && S.sides[i] >= 0 && game.players[i]) humans.push({ idx: i, side: S.sides[i] });
    game.allowJoin(false);
    game.go('match', { mode: 'kickabout', home: S.home, away: S.away, stadium: S.stadium, ref: S.ref, humans, rules: { needWinner: false, halfSecs: +S.half }, seed: (Date.now() % 1000) });
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    const S = EF.setup; EF.idleStep(dt, 'setup');
    for (let i = 1; i < 4; i++) { const p = game.players[i]; if (p && S.joined[i]) { const cyc = [0, -1, 1]; if (p.pressed('left')) S.sides[i] = cyc[(cyc.indexOf(S.sides[i]) + 2) % 3]; if (p.pressed('right')) S.sides[i] = cyc[(cyc.indexOf(S.sides[i]) + 1) % 3]; } }
    this.menu.update(dt);
  },
  draw(r) {
    UI.stadiumBg(r, game.time); const S = EF.setup, menu = this.menu;
    r.overlay(g => { const W = r.W; E.font.title(g, 'KICK-ABOUT', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const t0 = EF.get('team', S.home), t1 = EF.get('team', S.away);
      EF.drawCrest(g, t0, 24, 60, 3); EF.drawCrest(g, t1, W - 24 - 36, 60, 3); TXT(g, t0.nick, 42, 108, '#c8d4ff', { font: 'tiny', align: 'center' }); TXT(g, t1.nick, W - 42, 108, '#c8d4ff', { font: 'tiny', align: 'center' });
    });
    this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]));
  }
};
/* ---- PENALTIES SETUP ---- */
EF.penSetup = { home: 'kip', away: 'acl' };
EF.scenes.penaltysetup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { const S = EF.penSetup; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); game.allowJoin({ max: 2 });
    this.menu = new UI.Menu([{ label: 'YOUR TEAM', type: 'select', options: teamOpts(), get: () => S.home, set: v => { S.home = v; } }, { label: 'OPPONENT', type: 'select', options: teamOpts(), get: () => S.away, set: v => { S.away = v; } },
      { label: 'DIFFICULTY', type: 'select', options: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v) },
      { label: 'TO THE SPOT', onPick: () => { game.allowJoin(false); const humans = [{ idx: 0, side: 0 }]; if (game.players[1]) humans.push({ idx: 1, side: 1 }); game.go('match', { mode: 'penalties', home: S.home, away: S.away, stadium: 'euphorium', humans, rules: { shootoutOnly: true, needWinner: true, euphoria: false }, noEvents: true, seed: Date.now() % 997 }); } }, { label: 'BACK', onPick: () => game.go('title') }],
      { y: 56, w: 260, h: 20, scale: 1, onCancel: () => game.go('title') }); },
  exit() { game.allowJoin(false); },
  update(dt) { EF.idleStep(dt, 'penaltysetup'); this.menu.update(dt); },
  draw(r) { UI.stadiumBg(r, game.time); r.overlay(g => { E.font.title(g, 'PENALTIES', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, 'Stick to aim, hold to charge, release to shoot. Keep by diving the right way. Players 1 and 2 may share.', r.W / 2, 34, '#c8d4ff', { font: 'tiny', align: 'center' }); }); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']])); }
};
/* ---- STICKER ALBUM ---- */
EF.scenes.album = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.page = 0; this.i = 0; this.per = 15; this.rigCache = {}; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); this.rects = []; EF.newStickers = []; },
  update(dt) {
    EF.idleStep(dt, 'album'); const n = EF.STICKERS.length, pages = Math.ceil(n / this.per);
    if (UI.anyRep('left')) this.i = Math.max(0, this.i - 1); if (UI.anyRep('right')) this.i = Math.min(n - 1, this.i + 1); if (UI.anyRep('up')) this.i = Math.max(0, this.i - 5); if (UI.anyRep('down')) this.i = Math.min(n - 1, this.i + 5);
    if (UI.anyP('switch') || UI.anyP('skill')) { this.i = clamp(this.i + (UI.anyP('skill') ? this.per : -this.per), 0, n - 1); }
    this.page = Math.floor(this.i / this.per);
    const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== this.lp?.[0] || p[1] !== this.lp?.[1])) { this.lp = [p[0], p[1]]; this.rects.forEach(rc => { if (p[0] >= rc.x && p[0] < rc.x + rc.w && p[1] >= rc.y && p[1] < rc.y + rc.h) this.i = rc.k; }); }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { UI.eatAll(); game.go('title'); }
  },
  rigFor(s) { if (!this.rigCache[s.id]) { const t = EF.get('team', s.ref), p = t.players[s.idx]; this.rigCache[s.id] = EF.makeRig(p, t.kit, p.pos, { gloves: '#fff' }); } return this.rigCache[s.id]; },
  draw(r) {
    UI.stadiumBg(r, game.time); const per = this.per, W = r.W, n = EF.STICKERS.length; this.rects = [];
    r.overlay(g => {
      E.font.title(g, 'STICKER ALBUM', W / 2, 6, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, EF.Save.count() + ' / ' + n + '   PAGE ' + (this.page + 1) + ' / ' + Math.ceil(n / per), W / 2, 28, '#c8d4ff', { align: 'center' });
      const cw = 62, ch = 52, gx = Math.round((W - cw * 5) / 2), gy = 42;
      for (let k = this.page * per; k < Math.min(n, (this.page + 1) * per); k++) {
        const s = EF.STICKERS[k], c = k - this.page * per, x = gx + (c % 5) * cw, y = gy + Math.floor(c / 5) * (ch + 4), own = EF.Save.has(s.id), foc = k === this.i;
        this.rects.push({ x, y, w: cw - 4, h: ch, k });
        px.rect(g, x, y, cw - 4, ch, foc ? '#ffc83a' : '#0a0c14'); px.rect(g, x + 1, y + 1, cw - 6, ch - 2, own ? (s.kind === 'shiny' ? '#4a3a10' : '#1c2a5a') : '#141a2a');
        if (own) {
          if (s.kind === 'player') { this.rigFor(s).drawPortrait(g, x + (cw - 4) / 2 - 16, y + 3, 32); } else if (s.kind === 'crest') EF.drawCrest(g, s.ref, x + (cw - 4) / 2 - 12, y + 6, 2); else if (s.kind === 'stadium') { const st = EF.get('stadium', s.ref); px.rect(g, x + 6, y + 8, cw - 16, 20, st.sky[0]); px.rect(g, x + 6, y + 22, cw - 16, 10, EF.shade('#487a3a', 1)); } else if (s.kind === 'shiny') { px.poly(g, [[x + 27, y + 6], [x + 31, y + 18], [x + 44, y + 18], [x + 34, y + 26], [x + 38, y + 38], [x + 27, y + 30], [x + 16, y + 38], [x + 20, y + 26], [x + 10, y + 18], [x + 23, y + 18]], Math.floor(game.time * 4) % 2 ? '#ffe08a' : '#ffc83a'); } else TXT(g, '*', x + 28, y + 12, '#ffd84a', { scale: 3, align: 'center' });
          TXT(g, s.name.split(' ').slice(0, 2).join(' ').slice(0, 14), x + 29, y + ch - 10, '#e8ecff', { font: 'tiny', align: 'center' });
        } else { TXT(g, '?', x + 29, y + 10, '#2a3a6a', { scale: 4, align: 'center' }); }
      }
      const s = EF.STICKERS[this.i]; const own = EF.Save.has(s.id); UI.panel(g, 20, r.H - 52, W - 40, 28); TXT(g, own ? s.name : '???', 28, r.H - 48, own ? '#ffe08a' : '#8a9ac8', { scale: 1 }); TXT(g, s.how, 28, r.H - 36, '#c8d4ff', { font: 'tiny' });
      UI.footer(g, r, [['cancel', 'BACK'], ['switch', 'PREV PAGE'], ['skill', 'NEXT PAGE']]);
    });
  }
};
/* ---- ABOUT AND CREDITS ---- */
EF.scenes.about = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.scroll = 0; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now();
    const A0 = ABOUT.sourceInformation || {}, row = (k, v) => v ? [k + ': ' + v] : [];
    this.lines = [['EUROPHORIA FOOTBALL', 'h'], ['Over-the-top arcade football. A broke seaside club gets into the continent\'s biggest cup because of a typo.', ''], ['', ''], ['SOURCE INFORMATION', 'h'],
      ...[['Date', A0.date], ['Source', A0.source], ['Plan', A0.plan], ['Genre', A0.genre], ['Perspective', A0.perspective], ['Tech', A0.tech], ['Art direction', A0.artDirection], ['Animation', A0.animation], ['Audio', A0.audio], ['Online', A0.online], ['Testing', A0.testing], ['Research', A0.research], ['Environment', A0.environment], ['Model', A0.model], ['Usage', A0.usage]].map(([k, v]) => [k.toUpperCase() + ': ' + (v || 'unknown'), '']),
      ['', ''], ['TESTING FEEDBACK', 'h'], ...(ABOUT.testingFeedback || ['unknown']).map(s => [s, '']), ['', ''], ['ENGINE FEEDBACK', 'h'], ...(ABOUT.engineFeedback || ['unknown']).map(s => [s, '']), ['', ''], ['PROMPT FEEDBACK', 'h'], ...(ABOUT.promptFeedback || ['unknown']).map(s => [s, '']),
      ['', ''], ['CREDITS', 'h'], ['Engine: my-3D2dge (handoff package v0.85.2), with the changes listed in engine/CHANGES-ENGINE.md.', ''], ['Online: AI Hub Session Protocol v1, client 1.4.0.', ''], ['Everything is drawn and heard by code: no image or sound files.', ''], ['All clubs, players and people in this game are made up. Any resemblance to a real fish is a coincidence.', ''], ['Commentary by Barry and Trev, who are not real either.', '']];
  },
  update(dt) { EF.idleStep(dt, 'about'); if (UI.anyRep('down')) this.scroll += 12; if (UI.anyRep('up')) this.scroll = Math.max(0, this.scroll - 12); this.scroll += (game.input.pressed ? 0 : 0); if (UI.anyP('cancel') || UI.anyP('confirm')) { UI.eatAll(); game.go('title'); } },
  draw(r) {
    UI.stadiumBg(r, game.time); const W = r.W, H = r.H, bw = Math.min(W - 24, 380);
    r.overlay(g => { UI.panel(g, (W - bw) / 2, 8, bw, H - 34);
      let y = 14 - this.scroll, maxY = 0;
      for (const [t0, k] of this.lines) { const t = String(t0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '-'); const lines = E.font.wrap(t, bw - 20, k === 'h' ? { scale: 1 } : { font: 'tiny' }); for (const ln of lines) { if (y > 4 && y < H - 30) TXT(g, ln, (W - bw) / 2 + 10, y, k === 'h' ? '#ffe08a' : '#dfe6ff', k === 'h' ? {} : { font: 'tiny' }); y += k === 'h' ? 11 : 8; } if (!lines.length) y += 6; }
      this.scroll = Math.min(this.scroll, Math.max(0, y + this.scroll - (H - 34)));
      UI.footer(g, r, [['cancel', 'BACK'], ['up', 'SCROLL']]); });
  }
};
