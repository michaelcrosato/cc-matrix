/* 41-devmode: the dev panel, a drawer over any scene (the pause menu's Dev mode, ` or F1, ?dev=1; never in a hub
 * session). TUNE: every live gameplay variable as a slider, its default, a reset each and RESET ALL. CHEATS: stamina,
 * Euphoria, keepers, watch mode, pure football, the clock, goals, slow motion, freeze and step, debug views. WARP: every
 * scene and part, set pieces and events now, unlocks, a save reset, the sound test and the animation gallery. INFO. */
const TABS = ['TUNE', 'CHEATS', 'WARP', 'INFO'];
EF.Dev = {
  isOpen: false, tab: 0, cheats: {}, confirmReset: false, scroll: 0, stepOnce: false,
  open(fromPause) { if (SESSION) return false; if (fromPause && game.paused) game.resume(); this.isOpen = true; this.menu = new UIMenu({ onBack: () => this.close(), onTab: d => { this.tab = (this.tab + d + TABS.length) % TABS.length; this.menu.i = 0; }, wrap: true }); game.input.consumeAll(); return true; },
  close() { this.isOpen = false; this.syncSlots(false); game.input.consumeAll(); },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  syncSlots(on) { const m = LIVE.m; if (m) for (const sl of m.slots) sl.menu = !!(on || this.cheats.watch); },
  set(k, v) { this.cheats[k] = v; if (k === 'muteCrowd') EF.crowdAudio.volume(v ? 0 : game.settings.crowd); },
  /** the warp list: scenes, parts and things to trigger now */
  warps() {
    const m = LIVE.m, W = [];
    const go = (label, scene, data) => W.push({ label, onPick: () => { this.close(); game.go(scene, data || {}); } });
    go('TITLE', 'title'); go('ATTRACT MODE', 'attract'); go('KICK-ABOUT SETUP', 'setup'); go('PENALTIES SETUP', 'penaltysetup');
    for (const st of EF.all('stadium').filter(s => !s.training)) go('MATCH AT ' + st.name, 'match', EF.deepMatch(st.id));
    for (const p of ['corner', 'freekick', 'penalty', 'shootout', 'super', 'duel']) go('MATCH: ' + p.toUpperCase(), 'match', EF.deepMatch(p));
    EF.ROUNDS.forEach((R, i) => W.push({ label: 'CUP: ' + R.name + ' (PRE-MATCH)', onPick: () => { this.close(); if (!EF.Cup.s) EF.Cup.newRun(); EF.Cup.s.round = i; EF.Cup.s.prologue = true; game.go('cup', { round: i }); } }));
    go('THE ENDING', 'ending'); go('STICKER ALBUM', 'album'); go('ABOUT & CREDITS', 'about'); go('RESULTS SCREEN', 'results');
    for (const d of EF.all('drill')) go('TRAINING: ' + d.title, 'training', { drill: d.id });
    go('ANIMATION GALLERY', 'animgallery'); go('SOUND TEST', 'soundtest');
    if (m && LIVE.view) {
      const now = (label, fn) => W.push({ label: 'NOW: ' + label, onPick: () => { fn(m); this.close(); } });
      now('CORNER', mm => mm.startSetpiece('corner', 0, { y: P.Y0 })); now('FREE KICK', mm => mm.startSetpiece('freekick', 0, { x: mm.goalX(0) - mm.dir(0) * 190, y: P.CY - 20 })); now('PENALTY', mm => mm.startSetpiece('penalty', 0, {}));
      now('HALF TIME', mm => { mm.clock = mm.halfLen * 1.2; mm.boardShown = true; mm.stoppage = 1; mm.endHalf(); }); now('EXTRA TIME', mm => { mm.score = [1, 1]; mm.o.draws = 'cup'; mm.half = 2; mm.fullTime(); }); now('SHOOTOUT', mm => mm.startShootout());
      for (const e of EF.all('event')) now('EVENT ' + e.name, mm => { mm.mode = 'play'; mm.sp = null; mm.startEvent(e.id); });
      now('SUPER STRIKE', mm => { mm.mode = 'play'; mm.sp = null; const f = (mm.slots[0] && mm.slots[0].f) || mm.side[0][4]; mm.euph[0] = 100; mm.euroT[0] = 0; mm.triggerEurophoria(0); mm.superUsed[0] = false; mm.takeBall(f); f.body.x = mm.goalX(0) - mm.dir(0) * 200; f.body.y = P.CY; });
      now('SAVE DUEL', mm => { mm.mode = 'play'; mm.sp = null; const c = mm.side[1].find(f => f.data.captain); mm.euph[1] = 100; mm.euroT[1] = 0; mm.triggerEurophoria(1); mm.superUsed[1] = false; mm.takeBall(c); c.body.x = mm.goalX(1) - mm.dir(1) * 200; c.body.y = P.CY; c.plan = { k: 'shoot', power: .97, aimY: .4, until: mm.t + 3 }; });
      now('YELLOW CARD', mm => giveCard(mm, mm.side[1].find(f => !f.gk && !f.sentOff), 'yellow', 'dev')); now('RED CARD', mm => giveCard(mm, mm.side[1].find(f => !f.gk && !f.sentOff), 'red', 'dev'));
      now('A DIVE', mm => { mm.mode = 'play'; mm.sp = null; const f = (mm.slots[0] && mm.slots[0].f) || mm.side[0][3]; f.theatrics(); });
      now('VAR CHECK', mm => { mm.owner = null; mm.mode = 'var'; mm.varCheck = { kind: 'penalty', foul: { side: 0, sev: .5, victim: mm.side[0][3] }, t: 0 }; mm.emit('var', { kind: 'penalty' }); });
      now('THE BUS', mm => { const s = mm.side.findIndex(sd => EF.get('tactic', mm.teams[mm.side.indexOf(sd)].tactic).gimmick === 'catenaccio'); const side = s >= 0 ? s : 1; const gx = mm.ownGoalX(side), into = gx === P.X0 ? 1 : -1, x0 = into > 0 ? gx + 6 : gx - 24; mm.bus = { side, on: true, x0, x1: x0 + 18, y0: P.CY - 30, y1: P.CY + 30 }; mm.emit('bus', { side }); });
      now('A GOAL + CELEBRATION + REPLAY', mm => { mm.mode = 'play'; mm.sp = null; mm.last = mm.side[0][4]; mm.ball.x = mm.goalX(0) + mm.dir(0) * 6; mm.ball.y = P.CY; mm.ball.z = 4; mm.ball.vx = mm.dir(0) * 100; mm.goalScored(0); });
    }
    W.push({ label: 'UNLOCK EVERYTHING', onPick: () => { for (const s of EF.all('sticker')) EF.Save.data.stickers[s.id] = s.shiny ? 'shiny' : true; for (const b of Object.keys(EF.BALLS)) EF.Save.unlockBall(b); for (const d of EF.all('drill')) EF.Save.data.drills[d.id] = true; EF.Save.save(); } });
    W.push({ label: this.confirmReset ? 'REALLY RESET THE SAVE? PICK AGAIN' : 'RESET THE SAVE', onPick: () => { if (this.confirmReset) { EF.Save.reset(); this.confirmReset = false; } else this.confirmReset = true; } });
    return W;
  },
  cheatList() {
    const T = (k, label) => ({ kind: 'toggle', label, get: () => !!this.cheats[k], set: v => { this.set(k, v); if (k === 'watch') this.syncSlots(true); } });
    const B = (label, fn) => ({ label, onPick: () => { const m = LIVE.m; if (m) fn(m); } });
    return [T('stamina0', 'INFINITE STAMINA: HOME'), T('stamina1', 'INFINITE STAMINA: AWAY'), T('fullEuph0', 'EUPHORIA ALWAYS FULL: HOME'), T('fullEuph1', 'EUPHORIA ALWAYS FULL: AWAY'), T('keeper0', 'INVINCIBLE KEEPER: HOME'), T('keeper1', 'INVINCIBLE KEEPER: AWAY'),
      T('watch', 'CPU CONTROLS EVERYONE (WATCH)'), T('pure', 'PURE FOOTBALL (NO OTT)'), T('freezeClock', 'FREEZE THE CLOCK'), T('slow', 'SLOW MOTION 0.25x'), T('freeze', 'FREEZE THE SIM'),
      B('STEP ONE FRAME (WHILE FROZEN)', () => { this.stepOnce = true; }), B('GOAL FOR HOME', m => { m.score[0]++; m.emit('goal', { side: 0, name: 'DEV', minute: m.minuteLabel() }); }), B('GOAL FOR AWAY', m => { m.score[1]++; m.emit('goal', { side: 1, name: 'DEV', minute: m.minuteLabel() }); }),
      B("CLOCK TO 44'", m => { m.half = 1; m.clock = m.halfLen * 44 / 45; }), B("CLOCK TO 89'", m => { if (m.half === 1) { m.half = 2; m.swapped = !m.swapped; } m.clock = m.halfLen * 44 / 45; }),
      T('showBoxes', 'SHOW HITBOXES'), T('showAI', 'SHOW THE AI'), T('showPath', 'SHOW THE BALL PATH'), T('showBones', 'SHOW SKELETONS'), T('muteCrowd', 'MUTE THE CROWD')];
  },
  tuneList() {
    const L = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => { EF.tuneReset(); EF.sfx('menuPick'); } }];
    let grp = null;
    for (const [k, def, min, max, step, g] of EF.TUNE) {
      if (g !== grp) { grp = g; L.push({ label: '- ' + g.toUpperCase() + ' -', disabled: true, header: true }); }
      L.push({ kind: 'slider', label: k + ' (' + def + ')', min, max, step, get: () => EF.T[k], set: v => { EF.T[k] = +(+v).toFixed(4); EF.tuneSave(); }, changed: () => Math.abs(EF.T[k] - def) > 1e-9, fmt: v => String(+v.toFixed(3)), onAlt: () => EF.tuneReset(k) });
    }
    return L;
  },
  update(dt) {
    if (!this.isOpen) return false;
    this.syncSlots(true);
    const r = { W: game.W, H: game.H }, x = Math.round(r.W * .58), w = r.W - x - 6;
    const list = this.tab === 0 ? this.tuneList() : this.tab === 1 ? this.cheatList() : this.tab === 2 ? this.warps() : [];
    const rowH = 15, top = 40, vis = Math.floor((r.H - top - 30) / rowH);
    const i = this.menu.i; this.scroll = clamp(this.scroll, Math.max(0, i - vis + 1), Math.min(i, Math.max(0, list.length - vis)));
    list.forEach((it, k) => { const row = k - this.scroll; it.rect = row >= 0 && row < vis ? [x + 4, top + row * rowH, w - 8, rowH - 2] : null; it.scale = 1; it.align = 'left'; });
    this.menu.set(list);
    // tabs by click
    const c = game.input.clicked(); if (c && c[1] < 34 && c[0] > x) { const t = Math.floor((c[0] - x) / (w / 4)); if (t >= 0 && t < 4) { this.tab = t; this.menu.i = 0; } }
    if (game.input.pressed('cancel') || EF.devKey) { EF.devKey = false; this.close(); return true; }
    this.menu.update(dt);
    if (LIVE.m && this.cheats.freeze && !this.stepOnce) return true;
    this.stepOnce = false;
    return true;
  },
  draw(r) {
    const m = LIVE.m;
    if (m && LIVE.view && (this.cheats.showBoxes || this.cheats.showAI || this.cheats.showPath || this.cheats.showBones)) {
      if (this.cheats.showPath) for (const q of predictBall(m, 1, 1 / 20)) r.queue(q.x, q.y, q.z, g => { const [x, y] = r.w(q.x, q.y, q.z); px.dot(g, Math.round(x), Math.round(y), '#ff3aa0'); }, { emissive: true });
      for (const f of m.players) {
        if (f.sentOff) continue;
        if (this.cheats.showBoxes) r.decal(() => r.groundRing(f.body.x, f.body.y, f.body.r, f.side ? '#ff5a5a' : '#5aa0ff', 1));
        if (this.cheats.showBones) LIVE.view.rigs[f.id].debug && LIVE.view.rigs[f.id].debug(r);
        if (this.cheats.showAI && !f.gk) { const sp = m.brains[f.side].spot(f, m.owner && m.owner.side === f.side ? 'attack' : 'defend', P.toUV(m.dir(f.side), m.ball.x, m.ball.y)); r.decal(() => r.groundRing(sp[0], sp[1], 4, f.side ? '#ff9a9a' : '#9ac8ff', .8)); if (m.owner === f && f.plan) r.textAt(f.body.x, f.body.y, 50, f.plan.k.toUpperCase(), '#ffe08a'); }
      }
    }
    if (!this.isOpen) { if (Object.keys(this.cheats).some(k => this.cheats[k]) && !SESSION) r.overlay(g => E.font.text(g, 'CHEATS ON', 4, r.H - 18, '#ff7ad0', { font: 'tiny', outline: '#000' })); return; }
    r.overlay(g => {
      const x = Math.round(r.W * .58), w = r.W - x - 6;
      E.ui.box(g, x, 4, w, r.H - 8, { bg: ['#0a0e20', '#141c3a'], border: '#ff7ad0', alpha: .92 });
      TABS.forEach((t, i) => { const tx = x + 4 + i * (w - 8) / 4; px.rect(g, Math.round(tx), 8, Math.round((w - 8) / 4) - 2, 14, i === this.tab ? '#ff7ad0' : '#2a2a4a'); E.font.text(g, t, Math.round(tx + (w - 8) / 8), 11, i === this.tab ? '#141414' : '#c8c8e8', { align: 'center', font: 'tiny', outline: false }); });
      E.font.text(g, 'DEV MODE', x + 6, 26, '#ff7ad0', { outline: false });
      if (this.tab === 3) {
        const snap = game.debug && game.debug.snapshot ? game.debug.snapshot() : {};
        const lines = ['VERSION ' + EF.VERSION + '  ' + E.versionLabel(), 'SCENE ' + game.sceneName + (m ? '  MODE ' + m.mode + '  SEED ' + m.seed : ''), 'BODIES ' + (m ? m.players.length + 2 : 0) + '  PARTICLES ' + (PFX.list ? PFX.list.length : '?') + '  FANS ' + (LIVE.view ? LIVE.view.fans.length : 0),
          'STATS ' + JSON.stringify(game.stats || {}).slice(0, 80), ...JSON.stringify(snap).match(/.{1,52}/g).slice(0, 18)];
        lines.forEach((l, i) => E.font.text(g, l, x + 6, 40 + i * 9, '#c8d0f0', { font: 'tiny', outline: false }));
      } else this.menu.items.forEach((it, k) => { if (!it.rect) return; if (it.header) { E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#ff7ad0', { font: 'tiny', outline: false }); return; } const f = k === this.menu.i; px.rect(g, it.rect[0], it.rect[1], it.rect[2], it.rect[3], f ? '#2a3a7a' : '#121a36'); if (f) px.rect(g, it.rect[0], it.rect[1], 2, it.rect[3], '#ffc83a');
        if (it.kind === 'slider') { const u = (it.get() - it.min) / (it.max - it.min); E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, it.changed() ? '#ff9ae0' : '#e8ecff', { font: 'tiny', outline: false }); px.rect(g, it.rect[0] + it.rect[2] * .62, it.rect[1] + 5, Math.round(it.rect[2] * .26), 3, '#0a0e20'); px.rect(g, it.rect[0] + it.rect[2] * .62, it.rect[1] + 5, Math.round(it.rect[2] * .26 * u), 3, '#ffc83a'); E.font.text(g, it.fmt(it.get()), it.rect[0] + it.rect[2] - 3, it.rect[1] + 3, '#ffe08a', { align: 'right', font: 'tiny', outline: false }); }
        else if (it.kind === 'toggle') { E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#e8ecff', { font: 'tiny', outline: false }); E.font.text(g, it.get() ? 'ON' : 'OFF', it.rect[0] + it.rect[2] - 3, it.rect[1] + 3, it.get() ? '#5aff7a' : '#8a8aa8', { align: 'right', font: 'tiny', outline: false }); }
        else E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#e8ecff', { font: 'tiny', outline: false }); });
      EF.promptRow(g, x + w / 2, r.H - 20, [[['switch', 'skill'], 'TAB', { sep: '/' }], ['shoot', 'RESET'], ['cancel', 'CLOSE']], { input: game.input });
    });
  }
};
if (!game.headless && typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (SESSION) return;
  if (e.code === 'F1' || e.code === 'Backquote') { e.preventDefault(); if (EF.Dev.isOpen) EF.devKey = true; else EF.Dev.open(); }
});
/* ---- the animation gallery: every move on a loop, on a chosen rig, at 1x or 0.25x ---- */
const GALLERY = ['pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'slide', 'poke', 'barge', 'launched', 'down', 'getup', 'diveLow', 'diveHigh', 'catch', 'throw', 'dive', 'stepover', 'spin', 'rainbow', 'nutmeg', 'kneeslide', 'backflip', 'cartwheel', 'aeroplane', 'robot', 'shirt', 'dance', 'badgekiss', 'helicopter', 'fishslap', 'cheer', 'refCard', 'refVar', 'tired'];
EF.GALLERY = GALLERY;
const animScene = {
  touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'],
  enter() {
    this.k = Math.max(0, GALLERY.indexOf(LINK.scene === 'dev' && LINK.part === 'anim' ? LINK.extra : '')); this.t = 0; this.slow = false; this.stage = new Stage('rec', { weather: false });
    const m = this.stage.m; this.f = m.side[0][4]; this.f.state = 'run'; this.f.body.x = P.CX; this.f.body.y = P.CY; game.setZoom(2.2); game.zoomBase = 2.2;
    this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => { this.k = (this.k + d + GALLERY.length) % GALLERY.length; this.t = 0; } });
  },
  update(dt) {
    const sp = this.slow ? .25 : 1; this.t += dt * sp; const f = this.f, mv = GALLERY[this.k], u = (this.t % 1.4) / 1.4;
    f.state = 'run'; f.act = null; f.celebrate = null; f.flip = 0; f.diveU = 0; f.tiltSide = 0; f.body.z = 0; f.air = null; f.lift = 0; f.gk = false; f.set = false;
    if (KICK[mv] || ['spin', 'throw', 'catch'].includes(mv)) f.act = { name: mv, t: u * .5, dur: .5 };
    else if (mv === 'slide') { f.state = 'slide'; }
    else if (mv === 'launched') { f.state = 'launched'; f.flip = u; f.body.z = Math.sin(u * PI) * 20; }
    else if (mv === 'down') f.state = 'down'; else if (mv === 'getup') f.state = u < .5 ? 'down' : 'getup';
    else if (mv === 'diveLow' || mv === 'diveHigh') { f.state = 'keeper-dive'; f.diveU = Math.min(1, u * 2); f.tiltSide = 1; f.body.z = mv === 'diveHigh' ? Math.sin(Math.min(1, u * 1.3) * PI) * 14 : 2; }
    else if (mv === 'dive') { f.state = 'dive'; f.stateT = u * 1.2; }
    else if (mv === 'divingHeader' || mv === 'bicycle') { f.state = 'air'; f.air = { kind: mv, t: u * .6 }; }
    else if (mv === 'refCard' || mv === 'refVar') { f.celebrate = { anim: mv === 'refCard' ? 'cheer' : 'aeroplane' }; }
    else if (mv === 'tired') { f.dejected = true; }
    else f.celebrate = EF.get('celebration', mv) ? EF.get('celebration', mv) : { anim: mv };
    if (UIK.any('confirm')) this.slow = !this.slow;
    if (game.input.pressed('right')) { this.k = (this.k + 1) % GALLERY.length; this.t = 0; } if (game.input.pressed('left')) { this.k = (this.k - 1 + GALLERY.length) % GALLERY.length; this.t = 0; }
    if (game.input.pressed('up')) game.nextView();
    this.menu.update(dt);
    this.stage.update(dt * sp); game.focus(P.CX, P.CY, 14);
    this.f.dejected = mv === 'tired';
  },
  draw(r) { this.stage.draw(r); r.overlay(g => { EF.heading(g, 'ANIMATION: ' + GALLERY[this.k].toUpperCase(), r.W / 2, 8, 2); E.font.text(g, (this.k + 1) + '/' + GALLERY.length + '  ' + (this.slow ? '0.25x' : '1x') + '  VIEW: ' + game.view.label, r.W / 2, 30, '#ffe08a', { align: 'center', outline: '#000' }); EF.footer(g, r, [['left', 'MOVE'], ['confirm', 'SPEED'], ['up', 'VIEW'], ['cancel', 'BACK']]); }); }
};
EF.scenes.animgallery = animScene;
/* ---- the sound test: every SFX, song, chant and voice ---- */
const soundScene = {
  touch: [], view: 'broadcast',
  enter() { this.menu = new UIMenu({ onBack: () => { EF.music(null); game.go('title', { menu: true }); } }); this.scroll = 0; },
  list() {
    const L = [];
    for (const k of Object.keys(SFX)) L.push({ label: 'SFX: ' + k, onPick: () => EF.sfx(k) });
    for (const k of Object.keys(EF.SONGS)) L.push({ label: 'SONG: ' + k, onPick: () => EF.music(k) });
    for (const c of EF.all('chant')) L.push({ label: 'CHANT: ' + c.id, onPick: () => EF.chant.sing(c.id) });
    for (const k of ['ooh', 'roar', 'boo', 'whistle', 'groan', 'hum']) L.push({ label: 'CROWD: ' + k, onPick: () => EF.crowdAudio.react(k) });
    for (const id of Object.keys(EF.SPEAKERS)) L.push({ label: 'VOICE: ' + EF.SPEAKERS[id].name, onPick: () => EF.babble.shout(id, 'Hello there! Is this thing on? Lovely.') });
    L.push({ label: 'STOP MUSIC', onPick: () => EF.music(null) });
    return L;
  },
  update(dt) {
    const L = this.list(), vis = Math.floor((game.H - 70) / 14), i = this.menu.i; this.scroll = clamp(this.scroll, Math.max(0, i - vis + 1), Math.min(i, L.length - vis));
    L.forEach((it, k) => { const row = k - this.scroll; it.rect = row >= 0 && row < vis ? [Math.round(game.W / 2 - 130), 36 + row * 14, 260, 12] : null; it.scale = 1; it.align = 'left'; });
    this.menu.set(L); this.menu.update(dt); if (!EF.crowdAudio.on) EF.crowdAudio.start(.5); EF.crowdAudio.update(dt, .3);
  },
  exit() { EF.crowdAudio.stop(); },
  draw(r) { r.sky(['#0a0e24', '#141c3a', '#1a2450']); r.overlay(g => { EF.heading(g, 'SOUND TEST', r.W / 2, 8, 2); this.menu.draw(g); EF.footer(g, r, [['confirm', 'PLAY'], ['cancel', 'BACK']]); }); }
};
EF.scenes.soundtest = soundScene;
