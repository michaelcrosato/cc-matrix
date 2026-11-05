/* 53-dev: Dev Mode, from the pause menu (then F1, or L3 + R3, for the rest of the session; never in a session). Time is
 * frozen while it is open. Tabs: Tools · Match · Vacation · Minigames · Presentation · Tuning. Every button calls
 * game.debug.tools, which the tests drive too. The Tuning tab holds the live sliders: every system reads G.T each step;
 * each shows its default as a tick; Triangle / R resets one; Reset all asks first; Copy JSON copies the changes. */
const SCENE_TARGETS = [['title', null], ['menu', null], ['map', null], ['location', { loc: 'beach' }], ['location', { loc: 'pool' }], ['location', { loc: 'promenade' }], ['location', { loc: 'villa' }], ['location', { loc: 'casino' }], ['poolhop', {}], ['casino', { station: 'slots' }], ['casino', { station: 'blackjack' }], ['casino', { station: 'roulette' }], ['shop', { shop: 'coral', from: 'promenade' }], ['exhibition', null], ['album', { from: 'menu' }], ['credits', null], ['vresults', null]];
const tname = t => t[0] + (t[1] && (t[1].loc || t[1].station || t[1].shop) ? ': ' + (t[1].loc || t[1].station || t[1].shop) : '');
G.ensureState = (me = 'tess') => { if (!G.state) { G.state = G.newState(me, 4242); G.state.flags.tutorialDone = true; G.dayStart(); G.setPartner(G.bestFriend()); } return G.state; };
G.debugTools = {
  goto(scene, data) { if (['map', 'location', 'poolhop', 'casino', 'shop', 'journal', 'wardrobe', 'dayend', 'vresults', 'credits'].includes(scene)) G.ensureState(); G.game.go(scene, data || null, { fade: 0 }); },
  newVacation(char = 'tess', seed = 1) { G.state = G.newState(char, seed); G.dayStart(); return G.state; },
  setDay(d, slot = 0) { const st = G.ensureState(); st.day = clamp(d, 1, 5); st.slot = clamp(slot, 0, 2); G.dayStart(); st.slot = clamp(slot, 0, 2); G.slotStart(); },
  give(id, n = 1) { const st = G.ensureState(), it = G.itemById(id); if (!it) return false; if (it.kind === 'gift') st.bag[id] = Math.min(9, (st.bag[id] || 0) + n); else if (it.kind === 'suit') { if (!st.wardrobe.suits.includes(id)) st.wardrobe.suits.push(id); } else if (!st.wardrobe.acc.includes(id)) st.wardrobe.acc.push(id); return true; },
  money(n) { G.ensureState().money = Math.max(0, n); },
  addMoney(n) { const st = G.ensureState(); st.money += n; },
  chips(n) { G.ensureState().chips += n; },
  affinity(id, v) { const st = G.ensureState(); if (st.affinity[id] !== undefined) st.affinity[id] = clamp(Math.round(v), 0, 100); },
  mood(id, m) { const st = G.ensureState(); st.mood[id] = m; },
  partner(id) { const st = G.ensureState(); if (!id) { if (st.partner) st.where[st.partner] = 'beach'; st.partner = null; return; } st.affinity[id] = Math.max(st.affinity[id], 100); G.invite(id); },
  unlockAll() { const st = G.ensureState(); for (const s of G.SUIT_IDS) if (!st.wardrobe.suits.includes(s)) st.wardrobe.suits.push(s); for (const a of G.ACC_IDS) if (!st.wardrobe.acc.includes(a)) st.wardrobe.acc.push(a); },
  fillBag() { const st = G.ensureState(); for (const id of G.GIFT_IDS) st.bag[id] = Math.min(9, (st.bag[id] || 0) + 3); },
  revealLikes() { const st = G.ensureState(); for (const id of G.npcs(st)) for (const it of G.GIFT_IDS) st.known[id][it] = G.giftTaste(id, it); },
  match(o = {}) { const cfg = G.quickMatchCfg(o); if (o.ai) cfg.teams[0][0].ctl = { kind: 'ai' }; G.startMatch(cfg); G.game.advance(1 / 120); return G.M; },
  vacationMatch(kind = 'normal') { const st = G.ensureState(); if (!st.partner) G.setPartner(G.bestFriend()); const e = kind === 'semi' ? (st.day = 4, st.slot = 1, G.specialMatch()) : kind === 'final' ? (st.day = 5, st.slot = 1, G.specialMatch()) : { pair: st.teams[0] || G.npcs(st).filter(x => x !== st.partner).slice(0, 2) }; if (kind === 'tutorial') e.kind = 'tutorial', e.pair = ['sonny', 'pepper']; G.startVacationMatch(e); },
  forcePoint(side) { const M = G.M; if (M && !M.over && (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss')) { M.lastTouch = M.players.find(p => p.side === 1 - side); M.pointTo(side, 'fault'); } },
  setScore(a, b) { const M = G.M; if (M) M.rules.score = [a, b]; },
  endMatch(win) { const M = G.M; if (!M) return; const s = M.humanSide === null ? 0 : win ? M.humanSide : 1 - M.humanSide; M.rules.score[s] = M.rules.toWin - 1; M.rules.score[1 - s] = Math.min(M.rules.score[1 - s], M.rules.toWin - 3); M.rules.setsWon[s] = Math.floor(M.rules.sets / 2); if (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') { M.lastTouch = M.players.find(p => p.side === 1 - s); M.pointTo(s, 'fault'); } },
  perfectPlayer(on) { if (G.M) G.M.perfectPlayer = !!on; G.devFlags.perfect = !!on; },
  cpuControl(on) { if (G.M) G.M.cpuControl = !!on; G.devFlags.cpu = !!on; },
  debugOverlay(on) { if (G.M) G.M.debugOverlay = !!on; G.devFlags.overlay = !!on; },
  slowmo(k) { G.devFlags.slow = k; if (G.M) G.M.slowmo = k; },
  camera() { if (G.M) G.M.toggleCam(); },
  predict() { const M = G.M; if (!M || !M.plan) return []; return [M.plan, ...(M.plan.others || [])].map(c => ({ id: c.p.id, cast: c.p.cast, kind: c.kind, tStar: +c.tStar.toFixed(3), P: c.P.map(v => Math.round(v)), chosen: c === M.plan })); },
  step(n = 1) { G.devStepN = (G.devStepN || 0) + n; },
  poolBot(on) { G.devFlags.poolBot = !!on; const sc = G.game.scene; if (sc && sc.pads) sc.auto = !!on; },
  slotsForce(sym = '7') { G.Slots.forced = sym; },
  deal(cards) { G.BJ.forced = (cards || [['A', '♠'], ['K', '♥'], ['9', '♣'], ['7', '♦']]).map(([r, s]) => ({ r, s })); },
  rouletteForce(n) { G.ROULETTE.forced = n; },
  resetSave() { try { G.game.saves && G.game.saves.list().forEach(s => G.game.saves.erase(s.slot)); } catch (e) { /* none */ } G.state = null; E.store.set('aoa-unlocks', null); G.unlocks = { suits: [], finished: false, album: [], titlePostcard: null, poolBest: null }; },
  story(id) { G.ensureState(); if (id === 'semi') return this.vacationMatch('semi'); if (id === 'final') return this.vacationMatch('final'); if (id === 'party') { G.state.day = 5; G.state.slot = 2; return G.runCutscene('party'); } if (id === 'endingA' || id === 'endingB') { G.state.flags.finalWon = id === 'endingA'; return G.runCutscene(id); } if (id === 'credits') return G.game.go('credits'); }
};
G.devFlags = {};
G.debugHandle = () => ({
  tools: G.debugTools,
  snapshot() {
    const st = G.state, M = G.inMatchScene ? G.M : null, sc = G.game.scene;
    return { scene: G.game.sceneName, day: st && st.day, slot: st && st.slot, money: st && st.money, chips: st && st.chips, partner: st && st.partner, affinity: st && Object.assign({}, st.affinity), mood: st && Object.assign({}, st.mood), flags: st && Object.assign({}, st.flags),
      match: M && { phase: M.phase, score: M.rules.score.slice(), sets: M.rules.setsWon.slice(), serving: M.rules.serveSide, touches: M.touches, ball: [Math.round(M.ball.x), Math.round(M.ball.y), Math.round(M.ball.z)], players: M.players.map(p => ({ id: p.id, cast: p.cast, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), act: p.act })), over: M.over },
      ui: { screen: G.ui.shell && G.ui.shell.screen, focus: sc && sc.nav ? sc.nav.focus : null, overlays: G.overlay.list.map(o => o.id) }, attract: G.attract ? G.attract.beat : null, dev: !!G.overlay.get('dev') };
  }
});
/* ---- the panel ---- */
G.DEV_TABS = ['Tools', 'Match', 'Vacation', 'Minigames', 'Presentation', 'Tuning'];
G.devPanel = {
  unlocked: false,
  open() {
    if (G.hub || G.overlay.get('dev')) return;
    this.unlocked = true;
    const g = G.game, D = this.ov = { id: 'dev', modal: true, tab: 0, page: 0, nav: new G.Nav(), ts: g.timeScale, sel: { target: 3, day: 1, slot: 0, pair: 0, sl: 0, sr: 0, fighter: 0, mood: 0, roul: 17, tod: 12, weather: 0, voiceWho: 0, voiceLine: 0, song: 0, sfx: 0, rigF: 0, rigS: 0, rigP: 0, rigV: 0 },
      update(dt) { if (G.devStepN > 0) { G.devStepN--; g.timeScale = 1; } else g.timeScale = 0; return G.devPanel.update(this); },
      draw(r) { G.devPanel.draw(this, r); } };
    g.timeScale = 0; G.overlay.push(D); G.sfx('ui_select'); G.pushInput('MENU');
    if (G.M) { G.M.perfectPlayer = !!G.devFlags.perfect; G.M.cpuControl = !!G.devFlags.cpu; G.M.debugOverlay = !!G.devFlags.overlay; }
  },
  close() { const D = this.ov; if (!D) return; G.overlay.remove(D); G.game.timeScale = D.ts || 1; this.ov = null; G.popInput(); G.game.input.consumeAll(); G.sfx('ui_back'); },
  items(D) {
    const W = G.game.W, H = G.game.H, S = D.sel, T = G.debugTools, x = Math.round(W * .08), w = Math.round(W * .84), y0 = Math.round(H * .22), bw = Math.round((w - 6) / 2);
    const st = G.state, cast = G.FIGHTERS, songs = Object.keys(G.SONGS), sfx = Object.keys(G.SFX), voices = Object.keys(G.CAST);
    const step = (key, n) => ({ onLeft: () => { S[key] = (S[key] - 1 + n) % n; }, onRight: () => { S[key] = (S[key] + 1) % n; } });
    const row = (i, col, o) => Object.assign({ id: (o.label || 'r') + i + '_' + col, x: col === 2 ? x : x + col * (bw + 6), y: y0 + i * 20, w: col === 2 ? w : bw, h: 16 }, o);   // col 2: the full width
    const L = [];
    if (D.tab === 0) {
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Scene', value: () => tname(SCENE_TARGETS[S.target]) }, step('target', SCENE_TARGETS.length))), row(0, 1, { label: 'Go', onPress: () => { const t = SCENE_TARGETS[S.target]; G.devPanel.close(); T.goto(t[0], t[1]); } }));
      L.push(row(1, 0, Object.assign({ kind: 'step', label: 'Day', value: () => 'Day ' + (S.day + 1) + ' · ' + G.SLOTS[S.slot] }, { onLeft: () => { S.slot--; if (S.slot < 0) { S.slot = 2; S.day = (S.day + 4) % 5; } }, onRight: () => { S.slot++; if (S.slot > 2) { S.slot = 0; S.day = (S.day + 1) % 5; } } })), row(1, 1, { label: 'Set day & slot', onPress: () => { T.setDay(S.day + 1, S.slot); G.toast('Day ' + (S.day + 1) + ' · ' + G.SLOTS[S.slot]); } }));
      L.push(row(2, 0, { label: 'Semifinal', onPress: () => { G.devPanel.close(); T.story('semi'); } }), row(2, 1, { label: 'Final', onPress: () => { G.devPanel.close(); T.story('final'); } }));
      L.push(row(3, 0, { label: 'Party', onPress: () => { G.devPanel.close(); T.story('party'); } }), row(3, 1, { label: 'Ending A / B', onPress: () => { G.devPanel.close(); T.story(G.chance('cosmetic', .5) ? 'endingA' : 'endingB'); } }));
      L.push(row(4, 0, { label: 'Credits', onPress: () => { G.devPanel.close(); T.story('credits'); } }), row(4, 1, { label: 'Restart scene', onPress: () => { const n = G.game.sceneName, d2 = G.game.scene && G.game.scene.loc ? { loc: G.game.scene.loc } : G.M && n === 'match' ? { cfg: G.M.cfg } : null; G.devPanel.close(); G.game.go(n, d2, { fade: 0 }); } }));
      L.push(row(5, 2, { label: 'Reset the save and unlocks', onPress: () => G.confirm('Erase every save and unlock?', () => { T.resetSave(); G.toast('Saves erased'); }, { destructive: true }) }));
    } else if (D.tab === 1) {
      const pairs = [['lola', 'tess'], ['rin', 'mei'], ['ingrid', 'amara'], ['sonny', 'pepper']];
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Against', value: () => pairs[S.pair].map(G.castName).join(' & ') }, step('pair', pairs.length))), row(0, 1, { label: 'Start match', onPress: () => { G.devPanel.close(); const p = pairs[S.pair]; T.match({ cast: ['tess', 'amara', p[0], p[1]] }); } }));
      L.push(row(1, 0, { label: 'Point to the left', onPress: () => T.forcePoint(0) }), row(1, 1, { label: 'Point to the right', onPress: () => T.forcePoint(1) }));
      L.push(row(2, 0, Object.assign({ kind: 'step', label: 'Score', value: () => S.sl + ' - ' + S.sr }, { onLeft: () => { S.sl = (S.sl + 1) % 12; }, onRight: () => { S.sr = (S.sr + 1) % 12; } })), row(2, 1, { label: 'Set score', onPress: () => T.setScore(S.sl, S.sr) }));
      L.push(row(3, 0, { label: 'Win the match', onPress: () => { T.endMatch(true); G.devPanel.close(); } }), row(3, 1, { label: 'Lose the match', onPress: () => { T.endMatch(false); G.devPanel.close(); } }));
      L.push(row(4, 0, { kind: 'toggle', label: 'CPU plays you', value: () => G.devFlags.cpu ? 'ON' : 'OFF', onPress: () => T.cpuControl(!G.devFlags.cpu) }), row(4, 1, { kind: 'toggle', label: 'Perfect player', value: () => G.devFlags.perfect ? 'ON' : 'OFF', onPress: () => T.perfectPlayer(!G.devFlags.perfect) }));
      L.push(row(5, 0, { kind: 'toggle', label: 'Debug overlay', value: () => G.devFlags.overlay ? 'ON' : 'OFF', onPress: () => T.debugOverlay(!G.devFlags.overlay) }), row(5, 1, Object.assign({ kind: 'step', label: 'Slow motion', value: () => '×' + (G.devFlags.slow || 1) }, { onLeft: () => T.slowmo([1, .5, .25][([1, .5, .25].indexOf(G.devFlags.slow || 1) + 1) % 3]), onRight: () => T.slowmo([1, .5, .25][([1, .5, .25].indexOf(G.devFlags.slow || 1) + 2) % 3]) })));
      L.push(row(6, 0, { label: 'Frame step', onPress: () => T.step(1) }), row(6, 1, { label: 'Switch camera', onPress: () => T.camera() }));
    } else if (D.tab === 2) {
      const f = cast[S.fighter % cast.length];
      L.push(row(0, 0, { label: 'Money +10k', onPress: () => T.addMoney(10000) }), row(0, 1, { label: 'Money +100k', onPress: () => T.addMoney(100000) }));
      L.push(row(1, 0, { label: 'Money to 0', onPress: () => T.money(0) }), row(1, 1, { label: 'Chips +100', onPress: () => T.chips(100) }));
      L.push(row(2, 0, { label: 'Unlock all items', onPress: () => T.unlockAll() }), row(2, 1, { label: 'Fill gift bag ×3', onPress: () => T.fillBag() }));
      L.push(row(3, 0, Object.assign({ kind: 'step', label: 'Fighter', value: () => G.castName(f) }, step('fighter', cast.length))), row(3, 1, { kind: 'slider', label: 'Affinity', spec: { min: 0, max: 100, step: 5, value: st ? G.baseAff(st.me, f) : 25, unit: '' }, get: () => (st && st.affinity[f]) || 0, onLeft: () => T.affinity(f, G.aff(f) - 5), onRight: () => T.affinity(f, G.aff(f) + 5), onDrag: k => T.affinity(f, k * 100) }));
      L.push(row(4, 0, Object.assign({ kind: 'step', label: 'Mood', value: () => (st && G.MOOD_WORD[st.mood[f]]) || '-' }, { onLeft: () => T.mood(f, ['happy', 'normal', 'gloomy'][(['happy', 'normal', 'gloomy'].indexOf(st && st.mood[f]) + 2) % 3]), onRight: () => T.mood(f, ['happy', 'normal', 'gloomy'][(['happy', 'normal', 'gloomy'].indexOf(st && st.mood[f]) + 1) % 3]) })), row(4, 1, { label: st && st.partner === f ? 'Clear partner' : 'Make partner', onPress: () => T.partner(st && st.partner === f ? null : f) }));
      L.push(row(5, 2, { label: 'Reveal all likes', onPress: () => T.revealLikes() }));
    } else if (D.tab === 3) {
      L.push(row(0, 2, { kind: 'toggle', label: 'Pool Hop autopilot', value: () => G.devFlags.poolBot ? 'ON' : 'OFF', onPress: () => T.poolBot(!G.devFlags.poolBot) }));
      L.push(row(1, 0, { label: 'Slots: 7-7-7 next', onPress: () => { T.slotsForce('7'); G.toast('The next spin hits 7-7-7'); } }), row(1, 1, { label: 'Blackjack: deal one', onPress: () => { T.deal(); G.toast('The next hand is a blackjack'); } }));
      L.push(row(2, 0, Object.assign({ kind: 'step', label: 'Roulette number', value: () => S.roul }, { onLeft: () => { S.roul = (S.roul + 36) % 37; }, onRight: () => { S.roul = (S.roul + 1) % 37; } })), row(2, 1, { label: 'Force it', onPress: () => { T.rouletteForce(S.roul); G.toast('The wheel lands on ' + S.roul); } }));
    } else if (D.tab === 4) {
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Time of day', value: () => S.tod + ':00' }, { onLeft: () => { S.tod = (S.tod + 23) % 24; }, onRight: () => { S.tod = (S.tod + 1) % 24; } })), row(0, 1, { label: 'Apply light', onPress: () => G.applyLight(S.tod < 6 || S.tod >= 20 ? 'night' : S.tod < 11 ? 'morning' : S.tod >= 17 ? 'sunset' : 'afternoon') }));
      L.push(row(1, 0, Object.assign({ kind: 'step', label: 'Weather', value: () => ['sunny', 'cloudy', 'rain'][S.weather] }, step('weather', 3))), row(1, 1, { label: 'Apply weather', onPress: () => { const w = ['sunny', 'cloudy', 'rain'][S.weather]; G.game.weather = w === 'rain' ? { kind: 'rain', amount: .6, wind: .25 } : null; if (G.state) G.state.weather[G.state.day - 1] = w; if (G.M) { G.M.wet = w === 'rain'; G.M.wind = w === 'rain' ? 14 : 0; } } }));
      L.push(row(2, 0, { kind: 'toggle', label: 'Show FPS', value: () => G.setting('showFps', false) ? 'ON' : 'OFF', onPress: () => G.game.settings.set('showFps', !G.setting('showFps', false)) }), row(2, 1, Object.assign({ kind: 'step', label: 'Music', value: () => songs[S.song] }, step('song', songs.length))));
      L.push(row(3, 0, Object.assign({ kind: 'step', label: 'Voice Lab', value: () => G.castName(voices[S.voiceWho]) }, step('voiceWho', voices.length))), row(3, 1, { label: 'Say a line', onPress: () => { const who = voices[S.voiceWho], keys = Object.keys(G.LINES[who] || {}), k = keys[S.voiceLine++ % Math.max(1, keys.length)]; const line = G.pickLine(who, k) || 'Hello there!'; G.voice.say(line, who); G.toast(G.castName(who), line); } }));
      L.push(row(4, 0, { label: 'Play the song', onPress: () => G.music(songs[S.song], { restart: true }) }), row(4, 1, Object.assign({ kind: 'step', label: 'SFX', value: () => sfx[S.sfx], onPress: () => G.sfx(sfx[S.sfx]) }, step('sfx', sfx.length))));
      L.push(row(5, 0, Object.assign({ kind: 'step', label: 'Rig sheet', value: () => G.castName(Object.keys(G.CAST)[S.rigF]) + ' · ' + G.SUIT_IDS[S.rigS] }, { onLeft: () => { S.rigF = (S.rigF + 1) % Object.keys(G.CAST).length; G.devPanel._rig = null; }, onRight: () => { S.rigS = (S.rigS + 1) % G.SUIT_IDS.length; G.devPanel._rig = null; } })), row(5, 1, Object.assign({ kind: 'step', label: 'Pose · view', value: () => ['vready', 'bump', 'set', 'blockup', 'spikearm', 'cheer', 'peace', 'sit'][S.rigP] + ' · ' + ['court', 'servecam', 'threequarter', 'iso'][S.rigV] }, { onLeft: () => { S.rigP = (S.rigP + 1) % 8; }, onRight: () => { S.rigV = (S.rigV + 1) % 4; } })));
    } else {
      const per = 6, list = G.TUNING.slice(D.page * per, D.page * per + per), pages = Math.ceil(G.TUNING.length / per);
      list.forEach((t, i) => L.push(row(i, 2, { id: 't_' + t.key, kind: 'slider', label: t.group + ' · ' + t.label, spec: t, get: () => G.T[t.key], onLeft: () => G.setTuning(t.key, t.toggle ? !G.T[t.key] : G.T[t.key] - t.step), onRight: () => G.setTuning(t.key, t.toggle ? !G.T[t.key] : G.T[t.key] + t.step), onDrag: k => G.setTuning(t.key, t.toggle ? !G.T[t.key] : t.min + k * (t.max - t.min)), onPress: t.toggle ? () => G.setTuning(t.key, !G.T[t.key]) : null, tkey: t.key })));
      L.push(row(6, 0, { label: 'Page ' + (D.page + 1) + '/' + pages + ' ▶', onPress: () => { D.page = (D.page + 1) % pages; D.nav.focus = null; } }), row(6, 1, { label: 'Reset all to defaults', onPress: () => G.confirm('Reset every slider to its default?', () => { G.resetTuning(); G.toast('Tuning reset'); }, { destructive: true }) }));
    }
    return L;
  },
  update(D) {
    const I = G.game.input, its = this.items(D), ev = D.nav.update(its, I);
    if (ev.tab) { D.tab = (D.tab + ev.tab + G.DEV_TABS.length) % G.DEV_TABS.length; D.page = 0; D.nav.focus = null; G.sfx('ui_tab'); }
    if (ev.extra) { const f = its.find(i => i.id === D.nav.focus); if (f && f.tkey) { G.resetTuning(f.tkey); G.sfx('ui_back'); } }
    if (ev.alt && D.tab === 5) { const json = JSON.stringify(G.tuningChanged(), null, 1); try { navigator.clipboard.writeText(json); G.toast('Copied the tuning JSON', Object.keys(G.tuningChanged()).length + ' changed'); } catch (e) { G.toast('Tuning JSON', json.slice(0, 40)); } }
    if (ev.back || I.pressed('pause') || I.pressed('esc')) this.close();
    // tabs by mouse
    const c = I.clicked(); if (c && this._tabRects) for (const t of this._tabRects) if (c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h) { D.tab = t.i; D.page = 0; D.nav.focus = null; }
    if (D.tab === 4 && this.ov) { const S = D.sel, ids = Object.keys(G.CAST); if (!this._rig || this._rigK !== S.rigF + ':' + S.rigS) { this._rig = G.makeRig(ids[S.rigF], G.CAST[ids[S.rigF]].host || G.CAST[ids[S.rigF]].staff ? {} : { suit: G.SUIT_IDS[S.rigS] }); this._rigK = S.rigF + ':' + S.rigS; } G.Anim.idle(this._rig, G.realDt, { x: 0, y: 0, z: 0, facing: G.now() + (G.game.real || 0), poseW: { [['vready', 'bump', 'set', 'blockup', 'spikearm', 'cheer', 'peace', 'sit'][S.rigP]]: 1 } }); }
    return true;
  },
  draw(D, r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, W, H, '#0a1018'));
      G.ui.panel(g, Math.round(W * .05), Math.round(H * .05), Math.round(W * .9), Math.round(H * .86), { title: 'DEV MODE · time frozen' });
      this._tabRects = G.ui.tabs(g, Math.round(W * .08), Math.round(H * .12), G.DEV_TABS, D.tab);
      for (const it of this.items(D)) {
        const on = D.nav.focus === it.id;
        if (it.kind === 'slider') G.ui.slider(g, it, on);
        else if (it.kind === 'step') G.ui.stepper(g, Object.assign({}, it, { value: it.value }), on);
        else if (it.kind === 'toggle') G.ui.button(g, Object.assign({}, it, { right: it.value() }), on);
        else G.ui.button(g, it, on);
      }
      if (D.tab === 4 && this._rig) { const vv = [E.VIEWS.court, E.VIEWS.servecam, E.VIEWS.threequarter, E.VIEWS.iso][D.sel.rigV]; px.ell(g, Math.round(W * .86), Math.round(H * .8), 18, 5, '#2ec4c9'); this._rig.draw(g, Math.round(W * .86), Math.round(H * .8), vv); }
      if (D.tab === 5) E.font.text(g, 'Every system reads these each step. The orange tick is the default.', Math.round(W * .08), Math.round(H * .82), '#9fd3d6', { outline: false });
      G.promptBar(g, r, D.tab === 5 ? [['move', 'Adjust'], ['extra', 'Reset one'], ['alt', 'Copy JSON'], ['tabL', 'Tab'], ['cancel', 'Back to game']] : [['confirm', 'Use'], ['move', 'Change'], ['tabL', 'Tab'], ['cancel', 'Back to game']]);
    });
  }
};
// F1 (or L3 + R3) reopens the dev panel once it has been opened from the pause menu
if (typeof window.addEventListener === 'function' && typeof document !== 'undefined') window.addEventListener('keydown', e => { if (e.code === 'F1' && G.devPanel.unlocked && !G.hub && !G.overlay.get('dev')) { e.preventDefault(); G.devPanel.open(); } });
G.devPadCheck = () => { const I = G.game.input; if (G.devPanel.unlocked && !G.hub && !G.overlay.get('dev') && I.held && I.held.has('Pad10') && I.held.has('Pad11')) G.devPanel.open(); };
