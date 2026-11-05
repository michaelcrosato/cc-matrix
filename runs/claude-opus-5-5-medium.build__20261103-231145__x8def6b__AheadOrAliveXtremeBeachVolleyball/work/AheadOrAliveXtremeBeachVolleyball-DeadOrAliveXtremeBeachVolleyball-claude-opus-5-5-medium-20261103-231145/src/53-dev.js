/* 53-dev: Dev Mode, from the pause menu (then F1 or L3+R3 for the session; never in hub sessions). Time freezes while
 * it is open. Tabs: Tools, Match, Vacation, Minigames, Presentation, Tuning (every G.TUNING slider, live, with its default
 * as a tick, a reset per slider and Reset all). Every button calls game.debug.tools, which tests use too. */
G.unscaledDt = 1 / 120;
G.devFlags = { overlay: false, slow: 1 };
G.dev = {
  unlocked: false, tab: 0, focus: new G.Focus(), scroll: 0, confirm: null, sel: { pair: 0, npc: 0, day: 1, slot: 0, song: 0, sfx: 0, voice: 0, rigF: 0, rigS: 0, rigP: 0, num: 7, weather: 0, mood: 0, tod: 12 },
  TABS: ['Tools', 'Match', 'Vacation', 'Minigames', 'Presentation', 'Tuning'],
  open() {
    if (G.hub || G.overlay.has('dev')) return; this.unlocked = true; this.focus.i = 0; this.scroll = 0;
    const prev = G.game.input.preset, self = this;
    G.overlay.push({ kind: 'dev', modal: true,
      open() { this.ts = G.game.timeScale; G.game.timeScale = 0; G.game.input.use(Object.assign({}, prev || {}, G.INPUT.MENU)); },
      close() { G.game.timeScale = G.devFlags.slow || 1; if (prev) G.game.input.use(prev); },
      update(dt) { return self.update(); }, draw(r) { self.draw(r); } });
  },
  close() { const o = G.overlay.list.find(o => o.kind === 'dev'); if (o) G.overlay.remove(o); G.sfx('ui_back'); },
  get T() { return G.game.debug.tools; },
  pairs() { const all = []; const F = G.FIGHTERS; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) all.push([F[i], F[j]]); all.push(['sonny', 'pepper']); return all; },
  /** the rows of the current tab: { label, act } buttons, { label, get, set, opts } steppers, { tune } sliders */
  rows() {
    const T = this.T, s = this.sel, tab = this.TABS[this.tab], S = G.state, npcs = G.FIGHTERS;
    const step = (label, key, n, show, wrap = true) => ({ label, kind: 'stepper', get: () => show(s[key]), lr: d => { s[key] = wrap ? (s[key] + d + n) % n : clamp(s[key] + d, 0, n - 1); } });
    if (tab === 'Tools') return [
      { label: 'Title screen', act: () => T.goto('title') }, { label: 'Island map', act: () => T.goto('map') },
      step('Place', 'num', 6, v => ['Sunset Courts', 'Lagoon Pool', 'Promenade', 'Your Villa', 'Casino Fortuna', 'The Dock'][v % 6]), { label: 'Go to that place', act: () => T.goto(['location', 'location', 'location', 'location', 'casino', 'location'][s.num % 6], { loc: ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'][s.num % 6] }) },
      { label: 'Pool Hop', act: () => T.goto('poolhop') },
      step('Day', 'day', 5, v => 'Day ' + (v + 1)), step('Slot', 'slot', 3, v => G.SLOTS[v]), { label: 'Set day and slot', act: () => T.setDay(s.day + 1, s.slot) },
      { label: 'Jump to the Semifinal', act: () => T.story('semifinal') }, { label: 'Jump to the Final', act: () => T.story('final') },
      { label: 'Farewell party', act: () => T.story('party') }, { label: 'Ending A (won)', act: () => T.story('endingA') }, { label: 'Ending B (lost)', act: () => T.story('endingB') },
      { label: 'Credits', act: () => T.goto('credits') }, { label: 'Restart this scene', act: () => T.goto(G.game.sceneName, G.lastSceneData) },
      { label: 'Reset the save (asks first)', act: () => { this.confirm = { text: 'Erase every save slot?', yes: () => T.resetSave() }; } }];
    if (tab === 'Match') {
      const P = this.pairs(), M = G.M && G.game.sceneName === 'match' ? G.M : null;
      return [
        step('Opponents', 'pair', P.length, v => P[v].map(id => G.CAST[id].short).join(' & ')), { label: 'Start a match against them', act: () => T.match({ opp: P[s.pair] }) },
        { label: 'Force a point: left', act: () => T.forcePoint(0), disabled: !M }, { label: 'Force a point: right', act: () => T.forcePoint(1), disabled: !M },
        { label: 'Set score: match point left', act: () => M && (M.score = [G.M.to - 1, Math.max(0, G.M.to - 3)]), disabled: !M },
        { label: 'End match: win', act: () => T.endMatch(true), disabled: !M }, { label: 'End match: lose', act: () => T.endMatch(false), disabled: !M },
        { label: 'CPU plays my fighter: ' + (G.devCpu ? 'ON' : 'OFF'), act: () => T.cpuControl(!G.devCpu) }, { label: 'Perfect Player: ' + (G.devPerfect ? 'ON' : 'OFF'), act: () => T.perfectPlayer(!G.devPerfect) },
        { label: 'Debug overlay: ' + (G.devFlags.overlay ? 'ON' : 'OFF'), act: () => { G.devFlags.overlay = !G.devFlags.overlay; } },
        step('Slow motion', 'slowI', 3, v => ['×1', '×.5', '×.25'][v || 0]), { label: 'Apply speed', act: () => { G.devFlags.slow = [1, .5, .25][s.slowI || 0]; } },
        { label: 'Frame step (one step)', act: () => T.step(1) }, { label: 'Switch camera', act: () => { if (M) M.camMode = M.camMode === 'court' ? 'servecam' : 'court'; }, disabled: !M }];
    }
    if (tab === 'Vacation') {
      const id = npcs[s.npc % 6];
      return [
        { label: 'Money +10,000', act: () => T.money(10000), disabled: !S }, { label: 'Money +100,000', act: () => T.money(100000), disabled: !S }, { label: 'Money to 0', act: () => S && (S.money = 0), disabled: !S },
        { label: 'Chips +100', act: () => S && (S.chips += 100), disabled: !S }, { label: 'Unlock every item', act: () => T.unlockAll(), disabled: !S }, { label: 'Fill the gift bag (×3 each)', act: () => T.fillBag(), disabled: !S },
        step('Fighter', 'npc', 6, v => G.CAST[npcs[v % 6]].short),
        { label: 'Affinity', kind: 'slider', tune: { min: 0, max: 100, step: 1, def: S ? G.baseAff(S.me, id) : 25, label: 'Affinity: ' + G.CAST[id].short }, get: () => S && S.affinity[id] !== undefined ? S.affinity[id] : 0, set: v => T.affinity(id, v), disabled: !S || S.me === id },
        step('Mood', 'mood', 3, v => ['happy', 'normal', 'gloomy'][v]), { label: 'Set her mood', act: () => S && (S.mood[id] = ['happy', 'normal', 'gloomy'][s.mood]), disabled: !S },
        { label: 'Make her my partner', act: () => T.partner(id), disabled: !S || S.me === id }, { label: 'Clear my partner', act: () => T.partner(null), disabled: !S },
        { label: 'Reveal every like', act: () => T.revealLikes(), disabled: !S }];
    }
    if (tab === 'Minigames') return [
      { label: 'Pool Hop autopilot: ' + (G.poolBot ? 'ON' : 'OFF'), act: () => T.poolBot(!G.poolBot) },
      { label: 'Slots: force 7-7-7 next spin', act: () => T.slotsForce(['7', '7', '7']) }, { label: 'Blackjack: deal a blackjack next', act: () => T.deal(['A', 'K']) },
      step('Roulette number', 'num', 37, v => String(v % 37)), { label: 'Roulette: force that number next', act: () => T.rouletteForce(s.num % 37) }];
    if (tab === 'Presentation') {
      const songs = Object.keys(G.SONGS), sfx = Object.keys(G.SFX), speakers = Object.keys(G.CAST), suits = G.SUITS, poses = ['ready', 'bump', 'set', 'spike', 'block', 'dive', 'highfive', 'peace', 'stretch', 'bow'];
      return [
        { label: 'Time of day', kind: 'slider', tune: { min: 0, max: 24, step: 1, def: 12, label: 'Time of day (h): ' + (G.todOverride === null || G.todOverride === undefined ? 'auto' : G.todOverride) }, get: () => s.tod, set: v => { s.tod = v; G.todOverride = v; } },
        { label: 'Time of day: automatic', act: () => { G.todOverride = null; } },
        step('Weather', 'weather', 3, v => ['sunny', 'cloudy', 'rain'][v]), { label: 'Set the weather', act: () => { G.weatherOverride = ['sunny', 'cloudy', 'rain'][s.weather]; G.game.weather = s.weather === 2 ? { kind: 'rain', amount: .7 } : null; } },
        { label: 'Show FPS: ' + (G.showFps ? 'ON' : 'OFF'), act: () => { G.showFps = !G.showFps; } },
        step('Voice Lab speaker', 'voice', speakers.length, v => G.CAST[speakers[v]].short), { label: 'Play a phrase', act: () => { const id = speakers[s.voice]; const L = G.LINES[id]; G.voice.say(L ? L.greet[0] : G.SONNY.pa[0], id); } },
        step('Jukebox', 'song', songs.length, v => songs[v]), { label: 'Play that song', act: () => { G.curSong = null; G.music(songs[s.song]); } },
        step('SFX board', 'sfx', sfx.length, v => sfx[v]), { label: 'Play that sound', act: () => G.sfx(sfx[s.sfx]) },
        step('Rig sheet: fighter', 'rigF', 6, v => G.CAST[npcs[v]].short), step('Rig sheet: suit', 'rigS', suits.length, v => suits[v].name), step('Rig sheet: pose', 'rigP', poses.length, v => poses[v])];
    }
    const out = [{ label: 'Reset all to defaults (asks first)', act: () => { this.confirm = { text: 'Reset every slider to its default?', yes: () => G.resetTuning() }; } }, { label: 'Copy the values as JSON', act: () => { const j = JSON.stringify(G.T); try { navigator.clipboard.writeText(j); G.toast('Copied', 'Tuning JSON on the clipboard'); } catch (e) { G.toast('Copy failed', 'Clipboard blocked'); } } }];
    for (const t of G.TUNING) out.push({ kind: 'slider', tune: Object.assign({}, t, { label: t.group + ': ' + t.label }), get: () => G.T[t.key], set: v => { G.T[t.key] = v; G.saveTuning(); }, key: t.key });
    return out;
  },
  layout() {
    const W = G.game.W, H = G.game.H, rows = this.rows(), x = Math.round(W * .06), w = Math.round(W * .52), y0 = Math.round(H * .2), rh = 18, per = Math.max(4, Math.floor((H * .66) / (rh + 3)));
    const i = this.focus.i; if (i < this.scroll) this.scroll = i; if (i >= this.scroll + per) this.scroll = i - per + 1; this.scroll = clamp(this.scroll, 0, Math.max(0, rows.length - per));
    return rows.map((r, k) => Object.assign({}, r, { id: k, x, y: y0 + (k - this.scroll) * (rh + 3), w, h: rh, hidden: k < this.scroll || k >= this.scroll + per }));
  },
  update() {
    const I = G.game.input;
    if (this.confirm) { if (I.pressed('confirm')) { this.confirm.yes(); this.confirm = null; G.sfx('ui_select'); } else if (I.pressed('cancel') || I.pressed('pause')) { this.confirm = null; G.sfx('ui_back'); } return true; }
    const L = this.layout(), f = this.focus.set(L).update();
    // hover on hidden rows does nothing: keep focus inside the window
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : -1) + this.TABS.length) % this.TABS.length; this.focus.i = 0; this.scroll = 0; return true; }
    const c = I.clicked(); if (c) { const W = G.game.W, H = G.game.H, tw = Math.round(W * .88 / this.TABS.length); if (c[1] > H * .1 && c[1] < H * .1 + 14) { const k = Math.floor((c[0] - W * .06) / tw); if (k >= 0 && k < this.TABS.length) { this.tab = k; this.focus.i = 0; this.scroll = 0; G.sfx('ui_tab'); } } }
    if (f.back || I.pressed('pause')) { this.close(); return true; }
    const cur = this.focus.cur;
    if (cur && cur.kind === 'slider' && !cur.disabled) {
      const t = cur.tune, v = cur.get();
      if (f.lr) cur.set(clamp(Math.round((v + f.lr * t.step) / t.step) * t.step, t.min, t.max));
      if (f.drag !== undefined) cur.set(clamp(Math.round((t.min + f.drag * (t.max - t.min)) / t.step) * t.step, t.min, t.max));
      if (f.extra && cur.key) G.resetTuning(cur.key);
    }
    if (cur && cur.kind === 'stepper' && f.lr) { cur.lr(f.lr); G.sfx('ui_tick'); }
    if (f.pick && f.pick.act && !f.pick.disabled) f.pick.act();
    return true;
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W, H, '#060a14'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .03), Math.round(W * .94), Math.round(H * .9));
      E.font.text(g, 'DEV MODE', Math.round(W * .06), Math.round(H * .05), '#ff9e5e', { scale: 2, shadow: '#000', outline: false });
      E.font.text(g, 'Time is frozen • scene: ' + G.game.sceneName, Math.round(W * .94), Math.round(H * .05) + 4, '#9fd3d6', { outline: false, align: 'right' });
      const tw = Math.round(W * .88 / this.TABS.length);
      this.TABS.forEach((t, k) => { const x = Math.round(W * .06) + k * tw, y = Math.round(H * .1); E.ui.box(g, x, y, tw - 3, 14, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : ['#0f4c5c', '#0a2d3d'], border: k === this.tab ? '#ffd36a' : '#5a8a90', gradient: false }); E.font.text(g, t, x + (tw - 3) / 2, y + 3, '#ffffff', { align: 'center', outline: false }); });
      const L = this.layout();
      L.forEach((it, k) => {
        if (it.hidden) return; const foc = k === this.focus.i;
        if (it.kind === 'slider') { if (it.disabled) { G.UI.button(g, Object.assign({}, it, { label: it.tune.label, disabled: true }), false); return; } G.UI.slider(g, it, foc); }
        else if (it.kind === 'stepper') G.UI.button(g, Object.assign({}, it, { align: 'left', right: '◀ ' + it.get() + ' ▶' }), foc);
        else G.UI.button(g, Object.assign({}, it, { align: 'left' }), foc);
      });
      // the side panel: live numbers, or the rig sheet
      const sx = Math.round(W * .61), sy = Math.round(H * .2), sw = Math.round(W * .33), sh = Math.round(H * .64);
      E.ui.box(g, sx, sy, sw, sh, { bg: ['#0a1a24', '#061018'], border: '#5a8a90' });
      if (this.TABS[this.tab] === 'Presentation') {
        const s = this.sel, rig = this._rig = (this._rig && this._rig.key === s.rigF + ':' + s.rigS) ? this._rig : Object.assign(G.anim.rig(G.makeRig(G.FIGHTERS[s.rigF], { suit: G.SUITS[s.rigS].id, size: 2 })), { key: s.rigF + ':' + s.rigS });
        const poses = ['ready', 'bump', 'set', 'spike', 'block', 'dive', 'highfive', 'peace', 'stretch', 'bow'];
        rig.vb = { kind: poses[s.rigP], u: (G.game.real % 1), w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: G.game.real * .8 });
        rig.draw(g, sx + sw / 2, sy + sh - 16, G.VIEW_COURT);
        E.font.text(g, 'RIG SHEET', sx + 6, sy + 4, '#9fd3d6', { outline: false });
      } else {
        const snap = G.game.debug.snapshot(), lines = ['scene: ' + snap.scene, 'day ' + snap.day + ' • ' + (snap.slot !== null && snap.slot !== undefined ? G.SLOTS[snap.slot] : '-'), 'money: ' + (snap.money !== null ? G.fmtMoney(snap.money) : '-'), 'partner: ' + (snap.partner || '-')];
        if (snap.match) lines.push('phase: ' + snap.match.phase, 'score: ' + snap.match.score.join('-'), 'touches: ' + snap.match.touches.join('/'), 'rally: ' + (G.M ? G.M.rallyTouches : 0));
        lines.push('fps: ' + Math.round(G.game.fps)); lines.forEach((l, k) => E.font.text(g, l, sx + 6, sy + 6 + k * 10, '#fff8e8', { outline: false }));
      }
      if (this.confirm) { const w = 220; G.UI.panel(g, Math.round(W / 2 - w / 2), Math.round(H * .42), w, 44); E.font.text(g, this.confirm.text, W / 2, Math.round(H * .42) + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes    ' + G.btn('cancel') + ' No', W / 2, Math.round(H * .42) + 26, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, [['tabL', 'Tab'], ['tabR', 'Tab'], ['confirm', 'Use'], ['extra', 'Reset slider'], ['cancel', 'Back to game']], G.game.input, Math.round(r.H * .94) - 4);
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1' && G.dev.unlocked && !G.hub) { e.preventDefault(); G.overlay.has('dev') ? G.dev.close() : G.dev.open(); } });
G.pollDevCombo = () => { try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps || []) if (p && p.buttons[10] && p.buttons[11] && p.buttons[10].pressed && p.buttons[11].pressed) { if (!G._l3r3 && G.dev.unlocked && !G.hub && !G.overlay.has('dev')) G.dev.open(); G._l3r3 = true; return; } G._l3r3 = false; } catch (e) { /* blocked */ } };
/* ---- the debug handle: snapshot() for tools and tests, tools for the dev panel and tests ---- */
G.debugHandle = () => ({
  snapshot() {
    const S = G.state, M = G.game.sceneName === 'match' || G.game.sceneName === 'results' ? G.M : null;
    return { scene: G.game.sceneName, day: S ? S.day : null, slot: S ? S.slot : null, money: S ? S.money : null, chips: S ? S.chips : null, partner: S ? S.partner : null,
      affinity: S ? Object.assign({}, S.affinity) : null, mood: S ? Object.assign({}, S.mood) : null, flags: S ? Object.assign({}, S.flags) : null, me: S ? S.me : null,
      match: M ? { phase: M.phase, score: M.score.slice(), sets: M.sets.slice(), serving: M.serveSide, touches: M.touches.slice(), ball: M.ballPos, over: M.over, winner: M.winner, rallies: M.rallies, longest: M.longest,
        players: M.players.map(p => ({ id: p.id, side: p.side, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), act: p.act && p.act.kind, plan: p.plan ? { t: p.plan.t, kind: p.plan.kind } : null, human: p.isHuman })) } : null,
      ui: { overlays: G.overlay.list.map(o => o.kind) }, attract: G.attract.active ? G.attract.BEATS[G.attract.beat].id : null, dev: G.overlay.has('dev'), errors: G.game.errors.length };
  },
  tools: {
    goto(scene, data) { G.lastSceneData = data; G.go(scene, data, { fade: 0 }); },
    newVacation(me = 'rin', seed = 1) { G.state = G.newState(me, seed); G.dayStart(); return G.state; },
    setDay(d, slot = 0) { const S = G.state || this.newVacation(); S.day = clamp(d, 1, 5); S.slot = clamp(slot, 0, 2); G.dayStart(); G.go('map', null, { fade: 0 }); },
    give(id, n = 1) { const S = G.state, it = G.ITEMS[id]; if (!S || !it) return; if (it.kind === 'gift') S.bag[id] = Math.min(9, (S.bag[id] || 0) + n); else if (it.kind === 'suit') { if (!S.wardrobe.suits.includes(id)) S.wardrobe.suits.push(id); } else if (!S.wardrobe.acc.includes(id)) S.wardrobe.acc.push(id); },
    money(n) { if (G.state) G.state.money += n; }, affinity(id, v) { if (G.state && id in G.state.affinity) G.state.affinity[id] = clamp(Math.round(v), 0, 100); },
    partner(id) { if (G.state) G.state.partner = id; },
    unlockAll() { for (const it of [...G.SUITS, ...G.ACCS]) this.give(it.id); }, fillBag() { for (const it of G.GIFTS) this.give(it.id, 3); },
    revealLikes() { const S = G.state; if (!S) return; for (const id of G.npcs()) for (const it of G.GIFTS) S.known[id][it.id] = G.taste(id, it.id); },
    match(o = {}) { const S = G.state || this.newVacation(); if (!S.partner) S.partner = G.npcs()[0]; const opp = o.opp || G.npcs().filter(x => x !== S.partner).slice(0, 2); G.startMatch(G.vacationMatchCfg(opp, o), { fade: 0 }); },
    forcePoint(side) { const M = G.M; if (!M) return; if (M.phase !== 'rally' && M.phase !== 'toss') { M.phase = 'rally'; if (!M.L) M.L = G.Ball.make(M.clock, [G.COURT.NET_X, G.COURT.CY, 30], [0, 0, 10]); } M.pointTo(side, 'in', null); },
    endMatch(win) { const M = G.M; if (!M) return; const s = win ? (M.humanSide < 0 ? 0 : M.humanSide) : (M.humanSide < 0 ? 1 : 1 - M.humanSide); M.score[s] = Math.max(M.to - 1, M.score[1 - s] + 1); M.sets[s] = M.setsToWin - 1; this.forcePoint(s); },
    perfectPlayer(on) { G.devPerfect = !!on; }, cpuControl(on) { G.devCpu = !!on; if (G.M) for (const p of G.M.players) if (p.human) p.cpuControl = G.devCpu; },
    predict() { return G.M ? G.M.players.map(p => p.plan && { id: p.id, t: p.plan.t, P: p.plan.P, kind: p.plan.kind }) : null; },
    step(n = 1) { G.stepOnce = (G.stepOnce || 0) + n; },
    poolBot(on) { G.poolBot = !!on; }, slotsForce(sym) { G.slotsForce = sym; }, deal(cards) { G.bjForce = cards; }, rouletteForce(n) { G.rouletteForce = n; },
    story(id) { if (!G.state) this.newVacation(); G.storyJump(id); },
    resetSave() { const sv = G.game.saves; for (const s of [0, 1, 2, 'auto']) try { sv.erase(s); } catch (e) { /* none */ } G.state = null; G.go('title', null, { fade: 0 }); }
  }
});
