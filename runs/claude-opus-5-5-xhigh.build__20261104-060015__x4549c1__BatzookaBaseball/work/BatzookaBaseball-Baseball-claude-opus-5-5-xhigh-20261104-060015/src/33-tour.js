/* =============================================================================
 * 33-tour: the TOUR. Save data (three slots and an autosave), Fan Bucks, the
 * clubhouse upgrades, unlocks, the Tour Map (a county map, a bus on a dotted road
 * between six pins: Play next stop, Clubhouse, Save, Title), the story scenes,
 * the games, rewards, the RAIN CHECK, the MegaDome boss, the ending and credits.
 * ========================================================================== */
BZ.tour = {
  data: null, returnTo: null,
  blank() { return { v: 1, tour: { stop: 0, beaten: [], wins: 0, losses: 0, started: false, done: false }, fb: 0, upgrades: { lumber: 0, gloves: 0, cleats: 0, arms: 0, hype: 0 }, rewards: [], unlocked: { all: false }, training: { done: [] }, derbyBest: 0 }; },
  /** what lives across slots: training and unlocks (E.store), merged with the loaded Tour */
  meta() { return E.store.get('bz:meta', null) || this._meta || { training: [], all: false }; },
  setMeta(m) { this._meta = m; E.store.set('bz:meta', m); },   // (kept in memory too: blocked storage plays on for the visit)
  d() { return this.data || (this.data = this.blank()); },
  unlocked() { const m = this.meta(); return { all: !!(m.all || m.megadome || this.d().unlocked.all) }; },
  unlockAll() { const m = this.meta(); m.all = true; this.setMeta(m); this.d().unlocked.all = true; },
  addFB(n) { this.d().fb += Math.round(n); },
  lessonDone(id) { const m = this.meta(); if (!m.training.includes(id)) m.training.push(id); this.setMeta(m); const d = this.d(); if (!d.training.done.includes(id)) d.training.done.push(id); try { BZ.game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  trainingDone() { return [...new Set(this.meta().training.concat(this.d().training.done))]; },
  newTour() { this.data = this.blank(); this.data.tour.started = true; this.data.unlocked.all = this.meta().all; this.data.training.done = this.meta().training.slice(); },
  install(game) {
    const S = game.saves;
    S.write = () => { const d = this.d(), st = BZ.STOPS[Math.min(d.tour.stop + 1, 5)]; return { data: JSON.parse(JSON.stringify(d)), place: d.tour.done ? 'TOUR COMPLETE' : 'NEXT: ' + st.title, level: d.tour.stop }; };
    S.read = sv => { this.data = Object.assign(this.blank(), sv.data); };
  },
  continueLatest() { const S = BZ.game.saves, sv = S.latest(); if (sv && S.load(sv.slot)) BZ.game.go('tourMap'); else BZ.game.go('tourMenu'); },
  save(slot) { try { return BZ.game.saves.save(slot); } catch (e) { return false; } },
  /** play the next stop: its pregame scene, then the game */
  playNext() {
    const d = this.d(), i = d.tour.stop + 1, st = BZ.STOPS[i]; if (!st) return;
    BZ.game.go('story', { steps: BZ.STORY[st.id].pre, park: st.park, then: () => this.startGame(i) });
  },
  startGame(i) {
    const g = BZ.game, d = this.d(), st = BZ.STOPS[i], quick = g.settings.tourLength === 'quick';
    const data = { mode: 'tour', tourStop: i, away: 'comets', home: st.rival, park: st.park, innings: quick ? 1 : 3, difficulty: g.settings.difficulty || 'pro', cpuLevel: g.settings.difficulty || 'pro', humans: { 0: [g.input], 1: [] }, seed: 1000 + i * 17 + d.tour.losses, upgrades: d.upgrades, upgradeTeam: 0, boss: st.boss ? { id: st.rival } : null, mercy: g.settings.mercy !== false,
      script: st.scriptRhubarb && g.settings.rhubarbs !== false ? { rhubarbOnHbp: true, forceHbpInning: quick ? 1 : 2 } : null,
      onStep: (M) => this.gameStep(M), next: M => this.after(M, i) };
    if (this.botTour) data.bots = { 0: Object.assign({ level: 'batzooka', perfect: true }, this.botTour) };
    if (this.botTour) data.cpuLevel = 'rookie';
    BZ.startMatch(data);
  },
  /** the Tour's scripted moments inside a game */
  gameStep(M) {
    if (M.script && M.script.forceHbpInning && M.inning >= M.script.forceHbpInning && M.half === 'bottom' && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.script.hbpDone && BZ.defense(M).id === 'eruptors') {
      M.script.hbpDone = true; const lefty = (M.batter.bt || 'R')[0] === 'L'; M.forcePitch = { type: 'heater', target: [lefty ? 16 : -16, 18], q: 1, slot: 'south' };
    }
    if (M.script && M.script.forceHbpInning && M.inning >= M.script.forceHbpInning && M.half === 'top' && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.script.hbpDone && BZ.defense(M).id === 'eruptors') {
      M.script.hbpDone = true; const lefty = (M.batter.bt || 'R')[0] === 'L'; M.forcePitch = { type: 'heater', target: [lefty ? 16 : -16, 18], q: 1, slot: 'south' };
    }
  },
  after(M, i) {
    const d = this.d(), st = BZ.STOPS[i], won = M.result.winner === 0;
    if (won) {
      d.tour.stop = i; d.tour.wins++; if (!d.tour.beaten.includes(st.rival)) d.tour.beaten.push(st.rival);
      if (st.reward) { const [up, name] = st.reward; d.upgrades[up] = Math.min(3, d.upgrades[up] + 1); d.rewards.push(name); }
      if (i === 4) d.unlocked.all = d.unlocked.all;   // the MegaDome opens at the final
      if (st.boss) { d.tour.done = true; this.unlockAll(); }
      if (i >= 4) { const m = this.meta(); m.megadome = true; this.setMeta(m); }
      try { BZ.game.saves.autosave(); } catch (e) { /* blocked storage plays on */ }
      BZ.bus.emit('tourStop', { stop: i, won: true });
      BZ.game.go('story', { steps: BZ.STORY[st.id].win, park: st.park, reward: st.reward, then: () => st.boss ? BZ.game.go('credits', { ending: true }) : BZ.game.go('tourMap', { arrived: i }) });
    } else {
      d.tour.losses++;
      BZ.bus.emit('tourStop', { stop: i, won: false });
      try { BZ.game.saves.autosave(); } catch (e) { /* blocked */ }
      BZ.game.go('story', { steps: BZ.STORY[st.id].loss, park: st.park, then: () => BZ.game.go('tourMap', { rainCheck: i }) });
    }
  }
};

/* ---- the Tour menu: Continue, New, Load ---- */
BZ.scenes.tourMenu = {
  enter() {
    const S = BZ.game.saves, any = S.any;
    this.t = 0; BZ.idle = 0;
    this.menu = new BZ.CardMenu([{ label: 'CONTINUE', id: 'cont', disabled: !any, why: 'NO SAVE YET' }, { label: 'NEW TOUR', id: 'new' }, { label: 'LOAD', id: 'load', disabled: !any, why: 'NO SAVE YET' }], { start: any ? 0 : 1 });
    this.loading = null; BZ.music('tourmap');
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.loading) {
      const res = this.loading.update(dt);
      if (res && res.cancel) this.loading = null;
      if (res && res.pick !== undefined) { const it = this.loading.items[res.pick]; if (!it.disabled && g.saves.load(it.slot)) g.go('tourMap'); }
      return;
    }
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('title');
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'cont') BZ.tour.continueLatest();
      else if (id === 'new') { BZ.tour.newTour(); g.go('story', { steps: BZ.STORY.prologue, park: 'kernel', then: () => g.go('tourMap', { offerTraining: true }) }); }
      else if (id === 'load') { const L = g.saves.list(); this.loading = new BZ.CardMenu(L.map(s => ({ label: s.slot === 'auto' ? 'AUTOSAVE' : 'SLOT ' + (s.slot + 1), sub: s.empty ? 'EMPTY' : (s.place || '') + '  ' + Math.round((s.time || 0) / 60) + ' MIN', disabled: s.empty || s.damaged, slot: s.slot }))); }
    }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1424', '#2a2a48', '#4a3a2a']);
    r.overlay(g => {
      E.font.title(g, 'THE KABOOM CUP TOUR', r.W / 2, 12, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'] });
      E.font.text(g, 'Save Kernel Field from the parking lot. Five road games and a boss.', r.W / 2, 34, '#a8b8e8', { align: 'center' });
      (this.loading || this.menu).draw(g, r, r.W / 2, 56, { w: 230, h: this.loading ? 28 : 24, scale: this.loading ? 1 : 2 });
      BZ.legend(g, r, [['south', 'SELECT'], ['east', 'BACK']]);
    });
  }
};

/* ---- the Tour Map ---- */
BZ.scenes.tourMap = {
  enter(data) {
    const d = BZ.tour.d(); this.data = data || {}; this.t = 0; BZ.idle = 0;
    this.busU = data && data.arrived !== undefined ? Math.max(0, data.arrived - 1) : d.tour.stop; this.target = d.tour.stop;
    const next = BZ.STOPS[d.tour.stop + 1];
    this.menu = new BZ.CardMenu([
      { label: d.tour.done ? 'TOUR COMPLETE!' : this.data.rainCheck !== undefined ? 'RETRY: ' + next.title : 'PLAY: ' + (next ? next.title : ''), id: 'play', disabled: !!d.tour.done },
      { label: 'CLUBHOUSE', id: 'club', sub: BZ.fmt(d.fb) + ' FAN BUCKS' }, { label: 'SAVE', id: 'save' }, { label: 'SPRING TRAINING', id: 'train' }, { label: 'TITLE', id: 'title' }
    ]);
    this.offer = this.data.offerTraining ? new BZ.CardMenu([{ label: 'PLAY', id: 'yes' }, { label: 'SKIP', id: 'no' }], { cols: 2 }) : null;
    this.saving = null; this.note = this.data.rainCheck !== undefined ? 'RAIN CHECK! Same stop, any time.' : '';
    BZ.music('tourmap');
    BZ.tour.returnTo = 'tourMap';
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.busU += (this.target - this.busU) * Math.min(1, dt * 1.2);
    if (this.offer) { const res = this.offer.update(dt); if (res && (res.cancel || res.pick !== undefined)) { const yes = res.pick !== undefined && this.offer.items[res.pick].id === 'yes'; this.offer = null; if (yes) g.go('lessonList'); } return; }
    if (this.saving) { const res = this.saving.update(dt); if (res && res.cancel) this.saving = null; if (res && res.pick !== undefined) { const ok = BZ.tour.save(this.saving.items[res.pick].slot); this.saving = null; BZ.hud.toast(ok ? 'SAVED' : 'SAVE FAILED'); this.note = ok ? 'Saved.' : 'Storage is blocked: the Tour lasts this visit.'; } return; }
    BZ.hud.step(dt);
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('title');
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'play') BZ.tour.playNext();
      else if (id === 'club') g.go('clubhouse');
      else if (id === 'save') { const L = g.saves.list().filter(s => s.slot !== 'auto'); this.saving = new BZ.CardMenu(L.map(s => ({ label: 'SLOT ' + (s.slot + 1), sub: s.empty ? 'EMPTY' : s.place, slot: s.slot }))); }
      else if (id === 'train') g.go('lessonList');
      else if (id === 'title') g.go('title');
    }
  },
  draw(r) {
    const d = BZ.tour.d(), W = r.W, H = r.H;
    r.sky(['#2a5a2a', '#3a6a2a', '#4a7a3a']);
    r.overlay(g => {
      // the county: fields, a river, the road
      for (let i = 0; i < 24; i++) { const x = (i * 71) % W, y = (i * 43) % H; px.blend(g, .25, 'normal', () => px.rect(g, x, y, 40 + i % 5 * 9, 26, i % 3 ? '#5a8a3a' : '#c8b060')); }
      px.blend(g, .7, 'normal', () => { for (let x = 0; x < W; x += 2) px.rect(g, x, H * .2 + Math.sin(x * .03) * 10, 2, 5, '#3a7ab8'); });
      const mw = W - Math.min(190, W * .45) - 20, pts = BZ.STOPS.map(s => [16 + s.map[0] * (mw - 30), 30 + s.map[1] * (H - 80)]);
      for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let k = 0; k < 20; k++) { const u = k / 20; if (k % 2) px.rect(g, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 3, 2, '#f0e0b0'); } }
      BZ.STOPS.forEach((s, i) => {
        const [x, y] = pts[i], beaten = i === 0 || i <= d.tour.stop, next = i === d.tour.stop + 1;
        px.disc(g, x, y, next ? 7 + Math.sin(this.t * 6) : 6, beaten ? '#ffd040' : next ? '#ff5a3a' : '#5a5a6a'); px.disc(g, x, y, 3, '#ffffff');
        E.font.text(g, s.title, x, y + 9, beaten ? '#ffffff' : '#c8c8d8', { align: 'center', shadow: '#000' });
        E.font.text(g, i ? s.sub : 'HOME', x, y + 18, '#ffd8a0', { align: 'center', shadow: '#000' });
      });
      // the bus
      const u = clamp(this.busU, 0, pts.length - 1), i0 = Math.floor(u), f = u - i0, a = pts[i0], b = pts[Math.min(i0 + 1, pts.length - 1)], bx = a[0] + (b[0] - a[0]) * f, by = a[1] + (b[1] - a[1]) * f - 10 + Math.sin(this.t * 8) * 1;
      px.rect(g, bx - 10, by - 6, 20, 9, '#f2c230'); px.rect(g, bx - 9, by - 5, 6, 3, '#9ad8ff'); px.rect(g, bx - 2, by - 5, 6, 3, '#9ad8ff'); px.disc(g, bx - 6, by + 3, 2, '#1a1a1a'); px.disc(g, bx + 6, by + 3, 2, '#1a1a1a'); E.font.text(g, 'COMETS', bx, by - 13, '#1e2a5a', { align: 'center' });
      // the panel
      const pw = Math.min(190, W * .45);
      this.menu.draw(g, r, W - pw / 2 - 10, 14, { w: pw - 10, h: 22, scale: 1 });
      E.font.text(g, 'WINS ' + d.tour.wins + '  LOSSES ' + d.tour.losses + '  FB ' + BZ.fmt(d.fb), 12, 10, '#ffffff', { shadow: '#000' });
      if (d.rewards.length) E.font.text(g, 'GEAR: ' + d.rewards.join(', '), 12, 22, '#ffd040', { shadow: '#000' });
      if (this.note) E.font.text(g, this.note, 12, H - 44, '#ffd040', { shadow: '#000' });
      if (this.offer) { E.ui.box(g, W / 2 - 120, H / 2 - 40, 240, 80, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' }); E.font.text(g, 'Learn the ropes with Grandpa Ike?', W / 2, H / 2 - 30, '#ffffff', { align: 'center' }); this.offer.draw(g, r, W / 2, H / 2 - 6, { w: 100, h: 24 }); }
      if (this.saving) { E.ui.box(g, W / 2 - 120, 30, 240, 120, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' }); this.saving.draw(g, r, W / 2, 44, { w: 210, h: 26, scale: 1 }); }
      BZ.hud.drawToasts(g, r);
      BZ.legend(g, r, [['south', 'SELECT'], ['east', 'TITLE']]);
    });
  }
};

/* ---- the clubhouse: five upgrade cards ---- */
BZ.scenes.clubhouse = {
  enter() { this.t = 0; this.menu = new BZ.CardMenu(BZ.UPGRADES.map(u => ({ label: u.name, id: u.id }))); this.say = 'Spend your Fan Bucks wisely, kid.'; BZ.music('menu'); },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    const d = BZ.tour.d();
    this.menu.items.forEach((it, i) => { const u = BZ.UPGRADES[i], tier = d.upgrades[u.id]; it.sub = tier >= 3 ? 'MAXED' : 'TIER ' + (tier + 1) + ': ' + u.costs[tier] + ' FB'; it.value = '●'.repeat(tier) + '○'.repeat(3 - tier); });
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('tourMap');
    if (res && res.pick !== undefined) {
      const u = BZ.UPGRADES[res.pick], tier = d.upgrades[u.id];
      if (tier >= 3) { this.say = 'That one\'s as good as it gets.'; BZ.sfx('cancel'); }
      else if (d.fb < u.costs[tier]) { this.say = 'Need ' + (u.costs[tier] - d.fb) + ' more Fan Bucks for that.'; BZ.sfx('cancel'); }
      else { d.fb -= u.costs[tier]; d.upgrades[u.id]++; this.say = u.ike; BZ.sfx('coin'); BZ.babble.say(u.ike, 'ike'); BZ.bus.emit('purchase', { id: u.id, tier: d.upgrades[u.id] }); try { g.saves.autosave(); } catch (e) { /* blocked */ } }
    }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#1a1008', '#3a2414', '#5a3a1a']);
    const d = BZ.tour.d();
    r.overlay(g => {
      E.font.title(g, 'CLUBHOUSE', r.W / 2, 8, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      E.font.text(g, BZ.fmt(d.fb) + ' FAN BUCKS', r.W / 2, 38, '#ffd040', { align: 'center', scale: 1 });
      const sel = BZ.UPGRADES[this.menu.i];
      this.menu.draw(g, r, r.W / 2, 52, { w: 230, h: 26, scale: 1 });
      E.font.text(g, sel.what, r.W / 2, r.H - 66, '#a8ffb0', { align: 'center' });
      const ike = BZ.castRig('ike'); if (ike && BZ.cosmetic) ike.drawPortrait(g, 12, r.H - 76, 34, { zoom: 2.4 });
      E.font.wrap(this.say, r.W - 80).slice(0, 2).forEach((l, i) => E.font.text(g, l, 52, r.H - 70 + i * 10, '#ffffff'));
      BZ.legend(g, r, [['south', 'BUY'], ['east', 'BACK']]);
    });
  }
};

/* ---- a story scene: the cast at the park in the Broadcast Cam, with talk boxes ---- */
BZ.scenes.story = {
  view: 'broadcast', camera: { zoom: false },
  enter(data) {
    const g = BZ.game; this.data = data; this.t = 0; BZ.clearLater();
    this.P = BZ.park(data.park || 'kernel'); const H = this.P.H, pd = this.P.def;
    g.setView(BZ.VIEWS.broadcast); g.setZoom(1); g.lights.enabled = !!pd.night || pd.ambient < .9; g.lights.ambient = Math.max(.55, pd.ambient); g.weather = null;
    // who is in the scene: everyone who speaks, lined up near home plate
    const who = [...new Set(data.steps.filter(s => s[0] === 'say').map(s => s[1]))].filter(w => w !== 'hap' && w !== 'lou' && w !== 'gloria');
    this.actors = {};
    who.forEach((w, i) => { const rig = BZ.portraitRig(w); if (rig) this.actors[w] = { rig, x: H.x - 60 + i * 34, y: H.y - 90 - (i % 2) * 14, facing: Math.PI / 2, pose: null }; });
    BZ.talk.cut(data.steps, () => { this.done = true; }, { actors: this.actors });
    this.done = false;
    g.focus(H.x, H.y - 90, 0); g.cam.snap = true;
    if (data.reward) BZ.wait(.5, () => BZ.hud.toast('REWARD: ' + data.reward[1] + ' (' + data.reward[2] + ')', 4));
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    BZ.talk.step(dt); BZ.hud.step(dt); BZ.tickLater(dt);
    for (const [w, a] of Object.entries(this.actors)) { const speaking = BZ.talk.cutscene && BZ.talk.cutscene.line && BZ.talk.cutscene.line.who === w; BZ.rigUpdate(a.rig, dt, { x: a.x, y: a.y, z: 0, facing: speaking ? Math.PI / 2 : Math.PI / 2 + (a.x < this.P.H.x ? -.4 : .4), pose: a.pose || (speaking ? null : 'hips'), expr: speaking ? 'shout' : null }); }
    if (this.done) { this.done = false; const cb = this.data.then; if (cb) cb(); else g.go('title'); }
  },
  draw(r) {
    this.P.drawBroadcast(r, r.game.time, .3);
    for (const a of Object.values(this.actors)) { r.shadow(a.x, a.y, 6, .4); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => { BZ.talk.drawCut(g, r); BZ.hud.drawToasts(g, r); const st = BZ.STOPS.find(s => s.park === this.P.id); if (st) E.font.title(g, st.title, r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ffffff', '#ffd040'] }); });
  }
};

/* ---- the credits roll, over a blooper reel ---- */
BZ.scenes.credits = {
  view: 'broadcast', camera: { zoom: false },
  enter(data) {
    const g = BZ.game; this.t = 0; this.data = data || {};
    this.P = BZ.park('kernel'); const H = this.P.H;
    g.setView(BZ.VIEWS.broadcast); g.setZoom(.78); g.lights.enabled = true; g.lights.ambient = .6;
    const C = BZ.get('teams', 'comets').players;
    this.cast = C.slice(0, 7).map((p, i) => ({ rig: BZ.rigFor(p, 'bench'), x: H.x - 150 + i * 50, y: H.y - 260 + (i % 2) * 30, ph: i * .9 }));
    this.mascot = BZ.makeBlob(BZ.get('teams', 'comets').mascot);
    this.lines = BZ.CREDITS();
    BZ.music('ending');
    g.focus(H.x, H.y - 250, 0); g.cam.snap = true;
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.cast.forEach((c, i) => { const k = (this.t + c.ph) % 4; const s = { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 }; if (i === 0) s.pose = k < 2 ? 'cheer' : null; else if (i % 3 === 1) s.down = k > 2.5 && k < 3.4 ? 1 : 0; else if (i % 3 === 2) s.attack = E.move('cross', k % 1); else s.pose = 'wave'; BZ.rigUpdate(c.rig, dt, s); });
    this.mascot.update(dt, { walk: 1, squash: Math.sin(this.t * 9) * .3 });
    const end = this.lines.length * 12 + (g.r ? g.r.H : 240) + 40;
    if (this.t * 22 > end || (BZ.anyInput(g) && this.t > 2)) g.go('title');
  },
  draw(r) {
    this.P.drawBroadcast(r, r.game.time, .8);
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
    const H = this.P.H, mx = H.x - 200 + (this.t * 40) % 400; r.actor(mx, H.y - 200, 0, (g, ox, oy) => this.mascot.draw(g, ox, oy, r.view));
    r.overlay(g => {
      px.blend(g, .5, 'multiply', () => px.rect(g, r.W / 2 - 130, 0, 260, r.H, '#101020'));
      const y0 = r.H - this.t * 22;
      this.lines.forEach((l, i) => { const y = y0 + i * 12; if (y > -10 && y < r.H) E.font.text(g, l, r.W / 2, y, /^[A-Z0-9 ,.:!?'\-]+$/.test(l) && l.length < 40 ? '#ffd040' : '#ffffff', { align: 'center', shadow: '#000' }); });
      if (this.data.ending) E.font.text(g, 'THE END?  Exhibition: everything unlocked.', r.W / 2, r.H - 14, '#8affb0', { align: 'center', shadow: '#000' });
    });
  }
};
