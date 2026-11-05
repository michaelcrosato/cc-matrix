/* ---- THE BATTLE SCENE: the player's commands (cursor, command list, submenus, targets with a forecast), AI turns,
 * Delegate, the HUD (bell clock, season badge, order, unit cards), tutorial tips, rival lines, results ---- */
G.quickBattleSpec = (map, season) => {   // deep links, dev and the gallery: a stock battle on any map and season
  if (map === 'clockwork_sanctum') { const c = G.CampaignSim.create({ humans: ['hoarfast'], seed: 9 }), k = ['mordrain', 'ragnell', 'nimue']; for (const id of k) { const r = c.kn(id); while (r.lvl < 12) G.levelUpKnight(r, c.state.rng); } const sp = c.battleSpec({ march: { realm: 'hoarfast', target: 'sanctum', knights: k, from: {} }, kind: 'sanctum' }, 1234); sp.season = season; return sp; }
  const kn = (id, lvl) => Object.assign(G.makeKnightRec(id, lvl), { equip: {} }), mo = (sp, lvl, tier = 1) => ({ uid: sp + lvl + Math.random().toString(36).slice(2, 6), sp, tier, lvl, exp: 0 });
  return { map, season, seed: 1234, mode: map === 'clockwork_sanctum' ? 'sanctum' : map === 'wheel_shrine' ? 'shrine' : 'siege', region: { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' }[season], sides: [
    { realm: 'verdance', human: true, troops: [{ knight: kn('gareth', 8), monsters: [mo('unicorn', 6), mo('pixie', 6), mo('sproutling', 6)] }, { knight: kn('lynette', 8), monsters: [mo('treant', 6), mo('sproutling', 5)] }, { knight: kn('wren', 7), monsters: [mo('unicorn', 5), mo('pixie', 5)] }], items: ['herb', 'herb', 'remedy'] },
    { realm: 'hoarfast', ai: 'normal', troops: [{ knight: kn('mordrain', 8), monsters: [mo('frostwyrm', 5), mo('snowkit', 6)] }, { knight: kn('ragnell', 8), monsters: [mo('frostwolf', 6), mo('icegolem', 5)] }, { knight: kn('safir', 7), monsters: [mo('frostwolf', 5), mo('snowkit', 5)] }] }] };
};
G.tutorialSpec = realm => {
  const kn = id => Object.assign(G.makeKnightRec(id), { equip: {} }), r = G.run && G.run.sim;
  const troop = id => { if (r && r.kn(id)) return r.troopSpec(id); const d = G.get('knight', id); return { knight: kn(id), monsters: d.troop.map(([sp, lvl], i) => ({ uid: 't' + i + id, sp, tier: 1, lvl })) }; };
  return { map: 'border_meadow', season: 'spring', seed: 99, mode: 'siege', region: G.get('realm', realm).season, tutorial: true, sides: [
    { realm, human: true, troops: [troop(G.RULERS[realm]), troop(G.SQUIRE[realm])] },
    { realm: 'brigands', ai: 'easy', troops: [{ knight: Object.assign(G.makeKnightRec('sergeant', 3), { equip: {} }), monsters: [{ uid: 'ts1', sp: 'slime', tier: 1, lvl: 2 }, { uid: 'ts2', sp: 'bat', tier: 1, lvl: 3 }, { uid: 'ts3', sp: 'bat', tier: 1, lvl: 2 }, { uid: 'ts4', sp: 'skeleton', tier: 1, lvl: 3 }] }] }] };
};
const TIPS = [
  ['choose', 'Choose a unit of the lit troop: move the cursor onto it and press {confirm}.'],
  ['move', 'Blue hexes show where it can walk. Pick one and press {confirm}. {cancel} takes the move back before acting.'],
  ['attack', 'Red hexes are targets. The forecast shows hit chance and damage; ↑ means a strong element, ↓ a weak one.'],
  ['ward', "The dashed ring is your knight's Ward. A monster outside it fights weaker and is easier to capture."],
  ['spell', 'Spells need planted feet: cast them before moving that unit.'],
  ['season', 'The badge at the top left shows the season. Spring units hit harder in Spring: the Seasonal Tide.'],
  ['surround', 'Every ally standing beside a foe adds damage and accuracy. Surround them!'],
  ['captain', 'Fell the enemy knight: its whole troop leaves the field, and monsters near your knights may be captured.'],
  ['bells', 'A battle lasts twelve bells. An attacker must rout the foe, or end the last bell with a knight on the Keep.']];
G.scenes.battle = {
  view: 'board', views: ['board', 'iso'], res: 'ps1', pausable: true, touch: [], camera: { zoom: [.7, 2], start: 1.15, tall: 1.4, rotate: true }, input: G.INPUT,
  enter(req) {
    req = req || G.battleReq || { spec: G.quickBattleSpec('river_ford', 'spring'), back: 'title' };
    this.req = req; const sim = req.sim || G.BattleSim.create(req.spec);
    this.sim = sim; this.net = req.hub ? G.net : null; this.waitNet = 0; sim.state.dev = { god: G.dev.god, oneHit: G.dev.oneHit, infMP: G.dev.infMP, lucid: G.run && G.run.sim && G.run.sim.state.flags.w_lucid };
    this.view = new G.BattleView(sim, { onTension: () => { try { G.game.audio.layer('tension', 1, 1); } catch (e) { /* no music */ } } });
    G.battle = this; this.mode = 'busy'; this.cursor = this.firstCursor(); this.sel = null; this.menu = null; this.sub = null; this.pending = null; this.over = null; this.results = null; this.troopMenu = null;
    this.confirm = new G.ui.Confirm(); this.tips = {}; this.tip = null; this.delegated = new Set(); this.allAuto = !!req.auto; this.holdEnd = 0; this.ptr = null; this.danger = false; this.tutorial = !!(req.spec && req.spec.tutorial);
    const S = sim.state, humanSides = S.sides.filter(s => s.human).map(s => s.id);
    this.playerSide = this.net ? (this.net.mySide >= 0 ? this.net.mySide : null) : humanSides.length ? humanSides[0] : null;
    G.game.setView(G.settings.battleView === 'Isometric' ? 'iso' : 'board');
    const sanctum = S.spec.mode === 'sanctum', hour = G.get('map', S.spec.map).hour;
    G.music(sanctum ? 'boss' : hour ? 'hourless' : S.spec.mode === 'siege' && this.playerSide === S.spec.defender ? 'battle_defend' : 'battle_attack', { fade: .4 });
    const wx = { spring: { kind: 'rain', amount: .35 }, summer: { kind: 'sand', amount: .1 }, autumn: { kind: 'leaves', amount: .5, wind: .4 }, winter: { kind: 'snow', amount: .6 } }[S.season];
    G.game.weather = hour || !G.dev.weather ? null : wx && Object.assign({}, wx, { amount: wx.amount * (G.game.settings.reduceMotion ? .5 : 1) });
    this.view.play(this.introEvents()); this.rival = this.net ? [] : this.rivalLines(); this.turnT = 0; this.turnOf = null; this.z0 = null; this.talk = new E.Dialog(G.game, { voice: (ch) => G.voice.letter(this.talkVoice, ch) });
    if (this.rival.length) this.nextRival();
    if (req.buffs) for (const [kid, eff] of req.buffs) { const u = S.units.find(x => x.ref === kid); if (u) u.eff[eff] = eff === 'valor' ? 1 : 2; }
    G.game.input.consumeAll();
  },
  // a command: applied here, or sent to the hub's host (whose events come back to animate)
  exec(cmd) { if (this.net) { this.waitNet = this.net.isHost ? 0 : 3; const ev = this.net.send(cmd) || []; if (ev.length && ev[0].type === 'illegal') { this.waitNet = 0; G.ui.toast(ev[0].why, 1.2); } return ev; } const ev = this.sim.apply(cmd); this.view.play(ev); return ev; },
  introEvents() { const S = this.sim.state; return [{ type: 'season', season: S.season }]; },
  rivalLines() {
    const S = this.sim.state, on = si => S.units.filter(u => u.kind === 'knight' && u.side === si).map(u => u.ref), a = on(0), b = on(1), out = [];
    if (S.spec.mode === 'sanctum') return [['graynight', G.RIVALS[G.RIVALS.length - 1][2]]];
    for (const [p, q, l1, l2] of G.RIVALS) {
      const pa = a.includes(p) ? 0 : b.includes(p) ? 1 : -1; if (pa < 0) continue;
      const other = pa === 0 ? b : a;
      if (q === '*' ? other.length : other.includes(q)) { out.push([p, l1]); if (l2) out.push([q === '*' ? (p === 'tic' ? 'tac' : p) : q, l2]); break; }
    }
    return out;
  },
  nextRival() { const [who, line] = this.rival.shift(); const d = G.get('knight', who); this.talkVoice = G.voice.profile(who); const pv = this.view.u.find(p => this.sim.state.units[p.id].ref === who); this.talk.say([line], { name: d.short.toUpperCase(), portrait: pv && pv.vis.mode === 'hum' ? pv.vis.rig : undefined, onDone: () => { if (this.rival.length) this.nextRival(); } }); },
  firstCursor() { const S = this.sim.state, u = S.units.find(x => !x.out && (this.playerSide === null || x.side === this.playerSide)) || S.units[0]; return [u.cx, u.cy]; },
  exit() { G.game.weather = null; G.battle = null; try { G.game.audio.layer('tension', 0, .1); } catch (e) { /* no music */ } },
  humanTurn() { if (this.net) return this.net.myTurn(); const tr = this.sim.active; if (!tr || this.allAuto || G.autoplay || this.delegated.has(tr.id)) return false; return this.sim.state.sides[tr.side].human; },
  showTip(id) { if (!this.tutorial || this.tips[id] || G.settings.tips === 'Off') return; this.tips[id] = true; const t = TIPS.find(x => x[0] === id); if (t) this.tip = { id, text: t[1], t: 0 }; },
  back() { if (['move', 'target', 'sub', 'troop', 'menu'].includes(this.mode)) { this.cancel(); return true; } return false; },
  update(dt) {
    const I = G.game.input, S = this.sim.state, V = this.view;
    G.ui.drawDt = dt;
    if (G.dev.open) { G.devUpdate(dt); V.update(dt); return; }
    if (this.talk.open) { this.talk.update(dt); V.update(dt); this.cam(dt); return; }
    if (this.confirm.update(dt)) { V.update(dt); return; }
    if (I.down('create')) { I.suppress('pause'); }
    if (this.waitNet > 0) { this.waitNet -= dt; if (this.waitNet <= 0 && this.mode === 'anim') this.mode = 'busy'; }
    if (this.net && this.cursor) this.net.cursorCell = this.cursor;
    V.speed = (I.down('confirm') && !this.humanTurn()) ? 4 : 1;
    V.update(dt); this.cam(dt);
    if (this.tip) this.tip.t += dt;
    // the hot-seat turn timer: two or more human sides on this device; out of time, the troop is delegated
    const hs = S.sides.filter(x => x.human).length >= 2 && !this.net, lim = { '60 s': 60, '30 s': 30 }[G.settings.hotseatTimer];
    if (hs && lim && this.humanTurn()) { const id = this.sim.active.id; if (this.turnOf !== id) { this.turnOf = id; this.turnT = lim; } this.turnT -= dt; if (this.turnT <= 0) { this.delegated.add(id); G.ui.toast('Out of time: the troop is delegated.', 2); this.mode = 'busy'; } } else if (!hs || !lim) this.turnT = 0;
    // the dynamic camera leans in for spells and strong blows
    if (V.zoomKick > 0) { if (this.z0 === null) { this.z0 = G.game.zoom; G.game.setZoom(Math.min(2, this.z0 * 1.2)); } V.zoomKick -= dt; if (V.zoomKick <= 0) { G.game.setZoom(this.z0); this.z0 = null; } }
    if (I.pressed('view')) { G.game.nextView(); G.game.note(G.game.view.label.toUpperCase() + ' VIEW'); }
    if (I.pressed('turnL') || I.pressed('turnR')) { G.game.rotateView(I.pressed('turnL') ? -60 : 60); G.sfx('ui_move'); }
    if (I.pressed('zoomIn')) G.game.zoomBy && G.game.zoomBy(1.15); if (I.pressed('zoomOut')) G.game.zoomBy && G.game.zoomBy(1 / 1.15);
    if (I.pressed('danger')) { this.danger = !this.danger; G.sfx('ui_move'); }
    if (I.pressed('help')) { G.game.go('help', { back: 'battle', keep: true }); return; }
    if (this.results) { this.updateResults(dt); return; }
    if (S.over && !V.busy) { this.finish(); return; }
    if (V.busy) { this.mode = this.humanTurn() ? this.mode : 'busy'; if (this.mode !== 'anim') return; return; }
    if (S.over) return;
    if (this.net && !this.net.started()) return;
    if (!this.humanTurn()) { if (this.net) { this.mode = 'busy'; return; } this.mode = 'ai'; V.play(G.BattleAI.step(this.sim, { diff: S.sides[this.sim.active.side].ai })); return; }
    if (this.mode === 'anim') return;
    if (this.mode === 'busy' || this.mode === 'ai') this.startHuman();
    this.playerInput(dt);
  },
  cam(dt) { const V = this.view; if (this.humanTurn() && this.cursor && !V.busy && !this.mouseCur) V.focusOn(...G.hexWorld(this.cursor)); G.game.focus(V.look[0], V.look[1], 0); },
  startHuman() {
    const tr = this.sim.active, S = this.sim.state, units = [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted);
    this.mode = 'select'; this.sel = null; this.menu = null;
    const first = units.find(u => u.kind === 'monster') || units[0]; if (first) this.cursor = [first.cx, first.cy];
    this.showTip('choose'); if (S.bell === 1) this.showTip('season'); if (S.bell === 3) this.showTip('bells');
  },
  unitsLeft() { const tr = this.sim.active, S = this.sim.state; return tr ? [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted) : []; },
  playerInput(dt) {
    const I = G.game.input, S = this.sim.state, V = this.view;
    // the cursor: d-pad / stick by screen direction, the mouse hovers, clicks confirm
    if (['select', 'move', 'target'].includes(this.mode)) {
      const t = (I.repeat('right', .22, .09) ? 1 : 0) - (I.repeat('left', .22, .09) ? 1 : 0), u = (I.repeat('down', .22, .09) ? 1 : 0) - (I.repeat('up', .22, .09) ? 1 : 0);
      if (t || u) { this.mouseCur = false; const n = V.step(this.cursor, t, u); if (!G.hex.same(n, this.cursor)) { this.cursor = n; G.sfx('ui_move', { vol: .5 }); this.onCursor(); } }
      const p = I.pointer(); if (p && (!this.ptr || p[0] !== this.ptr[0] || p[1] !== this.ptr[1]) && !(this.menuList && this.menuList.hit(p))) { const h = V.hexAt(p[0], p[1]); if (h && !G.hex.same(h, this.cursor)) { this.cursor = h; this.mouseCur = true; this.onCursor(); } } this.ptr = p;
      const c = I.clicked(); if (c && !(this.menuList && this.menuList.hit(c))) { const h = V.hexAt(c[0], c[1]); if (h) { this.cursor = h; this.mouseCur = true; this.confirmAt(h); return; } }
      if (I.pressed('confirm')) { this.confirmAt(this.cursor); return; }
      if (I.pressed('cancel')) { this.cancel(); return; }
      if (I.pressed('prev') || I.pressed('next')) { const left = this.unitsLeft(); if (left.length) { const k = left.findIndex(x => G.hex.same([x.cx, x.cy], this.cursor)); const n = left[(k + (I.pressed('next') ? 1 : -1) + left.length) % left.length]; this.cursor = [n.cx, n.cy]; G.sfx('ui_move'); } }
      if (I.pressed('info')) { this.info = this.sim.unitAt(this.cursor); }
      if (this.mode === 'select') {
        if (I.down('command')) { this.holdEnd += dt; if (this.holdEnd > .6) { this.holdEnd = -99; this.endTroop(); return; } } else { if (this.holdEnd > 0 && this.holdEnd < .6) this.openTroopMenu(); this.holdEnd = 0; }
      }
      return;
    }
    if (this.mode === 'menu' || this.mode === 'sub' || this.mode === 'troop') {
      const r = this.menuList.update(dt);
      if (r === 'pick') this.pickMenu(this.menuList.cur); else if (r === 'back') this.cancel();
      else { const p = I.pointer(); this.ptr = p; }
      if (I.pressed('command') && this.mode !== 'troop') this.openTroopMenu();
    }
  },
  onCursor() { if (this.mode === 'target' && this.pending) { /* the forecast follows the cursor */ } },
  confirmAt(c) {
    if (this.sel) this.sel = this.sim.state.units[this.sel.id];
    const S = this.sim.state, tr = this.sim.active, u = this.sim.unitAt(c);
    if (this.mode === 'select') {
      if (u && u.troop === tr.id && !u.acted) { this.sel = u; this.openMenu(); G.sfx('ui_confirm'); }
      else { this.info = u; G.sfx(u ? 'ui_move' : 'ui_error'); }
      return;
    }
    if (this.mode === 'move') {
      if (!this.reach.has(G.hex.key(c))) { G.sfx('ui_error'); return; }
      if (G.hex.same(c, [this.sel.cx, this.sel.cy])) { this.openMenu(); return; }
      this.exec({ t: 'move', u: this.sel.id, to: c }); this.mode = 'anim'; this.afterAnim = () => this.openMenu(); this.showTip('attack'); this.showTip('ward'); return;
    }
    if (this.mode === 'target') {
      const p = this.pending, cmd = { t: 'act', u: this.sel.id, a: p.a, skill: p.skill, item: p.item, target: c };
      const lg = this.sim.legal(cmd); if (!lg.ok) { G.sfx('ui_error'); G.ui.toast(lg.why, 1.2); return; }
      const ev = this.exec(cmd); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); this.showTip('surround');
      if (ev.some(e => e.type === 'knightDown')) this.showTip('captain');
    }
  },
  afterAct() { if (this.sim.state.over) return; const tr = this.sim.active; if (tr && this.humanTurn()) this.startHuman(); },
  cancel() {
    G.sfx('ui_cancel');
    if (this.mode === 'move' || this.mode === 'target') { this.openMenu(); return; }
    if (this.mode === 'sub') { this.openMenu(); return; }
    if (this.mode === 'troop') { this.mode = 'select'; this.menuList = null; return; }
    if (this.mode === 'menu') { if (this.sel && this.sel.moved && !this.sel.acted && this.sel.from) { this.exec({ t: 'undo', u: this.sel.id }); this.cursor = [this.sel.cx, this.sel.cy]; } this.mode = 'select'; this.menuList = null; return; }
    if (this.mode === 'select') { if (this.info) { this.info = null; return; } G.game.pause(); }
  },
  openMenu() {
    if (this.sel) this.sel = this.sim.state.units[this.sel.id];
    const u = this.sel, sim = this.sim, items = [];
    const sk = u.skills.map(id => G.get('skill', id)).filter(s => s.kind !== 'passive');
    items.push({ label: 'Move', id: 'move', disabled: u.moved, why: 'Already moved' });
    const at = sim.targets(u, 'attack'); items.push({ label: 'Attack', id: 'attack', disabled: !at.length, why: 'No foe in range' });
    const sp = sk.filter(s => s.kind === 'special'), sl = sk.filter(s => s.kind === 'spell');
    if (sp.length) items.push({ label: 'Special ▸', id: 'special', right: sp.length + '' });
    if (sl.length) items.push({ label: 'Spell ▸', id: 'spell', right: sl.length + '', disabled: u.moved, why: 'Spells need planted feet' });
    if (u.kind === 'knight') { const its = this.sim.state.sides[u.side].items; items.push({ label: 'Item ▸', id: 'item', disabled: !its.some(i => !G.get('item', i).musterOnly), why: 'No items' }); }
    items.push({ label: 'Guard', id: 'guard' }, { label: 'Wait', id: 'wait' });
    if (u.kind === 'knight' && this.sim.state.spec.mode !== 'shrine') items.push({ label: 'Retreat', id: 'retreat', color: '#ffb0a0' });
    this.menuList = new G.ui.List(items); this.menuList.i = items.findIndex(x => !x.disabled); this.mode = 'menu'; this.cursor = [u.cx, u.cy];
    if (sl.length && !u.moved) this.showTip('spell');
  },
  pickMenu(it) {
    const u = this.sel;
    if (this.mode === 'troop') {
      if (it.id === 'end') { this.mode = 'select'; this.endTroop(); }
      else if (it.id === 'delegate') { this.delegated.add(this.sim.active.id); this.mode = 'busy'; }
      else if (it.id === 'all') { this.allAuto = true; this.mode = 'busy'; }
      else if (it.id === 'danger') { this.danger = !this.danger; this.mode = 'select'; }
      return;
    }
    if (this.mode === 'sub') { if (it.item) this.beginTarget({ a: 'item', item: it.item }); else this.beginTarget({ a: 'skill', skill: it.id }); return; }
    switch (it.id) {
      case 'move': this.reach = this.sim.reach(u); this.mode = 'move'; G.game.input.consumeAll(); this.showTip('move'); break;
      case 'attack': this.beginTarget({ a: 'attack' }); break;
      case 'special': case 'spell': { const list = u.skills.map(id => G.get('skill', id)).filter(s => s.kind === it.id).map(s => { const ok = this.sim.skillUsable(u, s.id); return { label: s.name, id: s.id, right: s.mp + ' MP', disabled: !ok.ok, why: ok.why, desc: s.desc }; }); this.menuList = new G.ui.List(list); this.mode = 'sub'; break; }
      case 'item': { const its = this.sim.state.sides[u.side].items.filter(i => !G.get('item', i).musterOnly), seen = {}, list = []; for (const i of its) { if (seen[i]) { seen[i].n++; seen[i].right = '×' + seen[i].n; continue; } seen[i] = { label: G.get('item', i).name, item: i, n: 1, right: '×1', desc: G.get('item', i).desc }; list.push(seen[i]); } this.menuList = new G.ui.List(list); this.mode = 'sub'; break; }
      case 'guard': case 'wait': this.exec({ t: 'act', u: u.id, a: it.id, target: [u.cx, u.cy] }); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); break;
      case 'retreat': this.confirm.ask((u.ruler ? 'A ruler\'s retreat loses the battle. ' : '') + 'Retreat ' + u.name + "'s troop?", () => { this.exec({ t: 'act', u: u.id, a: 'retreat', target: [u.cx, u.cy] }); this.mode = 'anim'; this.afterAnim = () => this.afterAct(); }, { focusNo: true }); break;
    }
  },
  beginTarget(p) {
    const u = this.sel, ts = this.sim.targets(u, p.a, p.a === 'item' ? null : p.skill);
    if (!ts.length) { G.sfx('ui_error'); G.ui.toast('No target in range', 1.2); return; }
    this.pending = p; this.targetCells = ts; this.mode = 'target';
    const sk = p.skill ? G.get('skill', p.skill) : null, pref = ts.find(c => { const o = this.sim.unitAt(c); return o && (sk && (sk.who === 'allies' || sk.who === 'ownMon') ? o.side === u.side : o.side !== u.side); });
    this.cursor = pref || ts[0]; G.game.input.consumeAll();
  },
  openTroopMenu() { const list = [{ label: 'End troop turn', id: 'end' }, { label: 'Delegate this troop', id: 'delegate' }, { label: 'Delegate the battle', id: 'all' }, { label: this.danger ? 'Hide danger view' : 'Danger view', id: 'danger' }]; this.menuList = new G.ui.List(list); this.mode = 'troop'; G.sfx('ui_open'); },
  endTroop() { const go = () => { this.exec({ t: 'end' }); this.mode = 'anim'; this.afterAnim = null; }; if (G.settings.confirmEnd === 'On' && this.unitsLeft().length) this.confirm.ask('End this troop\'s turn? Units that have not acted will wait.', go); else go(); },
  // the battle is over: results, then back to whoever asked
  finish() {
    if (this.results) return;
    const S = this.sim.state, res = this.sim.results(), ps = this.playerSide === null ? 0 : this.playerSide, won = res.winner === ps;
    G.sting(won ? 'victory' : 'defeat'); G.music(null);
    try { G.game.audio.stopMusic(.5); } catch (e) { /* no music */ }
    const units = S.units.filter(u => u.side === ps && u.ref && !String(u.ref).startsWith('second'));
    this.results = { won, res, page: 0, t: 0, units, caps: S.captures.filter(c => c.side === ps).map(c => S.units[c.u].name), lost: S.units.filter(u => u.side === ps && (u.out === 'dead' || u.out === 'captured')).map(u => u.name), why: S.over.why };
    if (this.req.shrine) this.results.glory = S.sides.map(s => s.glory);
  },
  updateResults(dt) {
    const R = this.results, I = G.game.input; R.t += dt; if (R.t < .8) return;
    if (I.pressed('confirm') || I.clicked() || (G.autoplay && R.t > 1.2) || (this.req.auto && R.t > 1.2)) {
      const pages = Math.ceil(R.units.length / 6); if (R.page < pages - 1) { R.page++; R.t = .5; G.sfx('ui_confirm'); return; }
      if (this.net) return;
      G.sfx('ui_confirm'); const done = this.req.onDone, back = this.req.back || 'title';
      if (done) done(R.res, this.sim); else G.game.go(back);
    }
  },
  draw(r) {
    const V = this.view, S = this.sim.state, deco = { cursor: this.humanTurn() && !V.busy ? this.cursor : null };
    if (this.mode === 'move' && this.reach) { deco.reach = [...this.reach.values()].map(v => v.c); if (this.reach.has(G.hex.key(this.cursor))) deco.path = this.sim.pathTo(this.sel, this.cursor, this.reach); }
    if (this.mode === 'target' && this.targetCells) { deco.targets = this.targetCells; if (this.targetCells.some(c => G.hex.same(c, this.cursor))) deco.area = this.pending.a === 'skill' ? this.sim.area(this.sel, G.get('skill', this.pending.skill), this.cursor) : [this.cursor]; }
    if (this.danger || G.dev.showDanger) { const tr = this.sim.active; if (tr) { const foes = S.units.filter(u => !u.out && u.side !== tr.side), cells = new Set(); for (const f of foes) for (const c of G.hex.within([f.cx, f.cy], this.sim.effMov(f) + f.basic.range[1])) if (this.sim.inside(c)) cells.add(G.hex.key(c)); deco.danger = [...cells].map(k => k.split(',').map(Number)); } }
    deco.wards = G.dev.showWards;
    if (G.hubView) deco.others = G.hubView.cursors();
    V.draw(r, deco);
    if (G.dev.hud !== false) this.hud(r);
    if (this.talk.open) this.talk.draw(r);
    this.confirm.draw(r);
    if (this.results) this.drawResults(r);
    G.ui.drawToasts(r, G.ui.drawDt || 1 / 60);
    if (G.dev.open) G.devDraw(r);
  },
  hud(r) {
    const S = this.sim.state, tr = this.sim.active, W = r.W, H = r.H;
    r.overlay(g => {
      // the bell clock and the season badge (top left)
      G.ui.panel(g, 4, 4, 110, 34, null);
      const cx = 20, cy = 21; px.disc(g, cx, cy, 12, '#140c14'); px.disc(g, cx, cy, 11, '#e8e0c8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; px.dot(g, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, i < S.bell ? '#c83a2a' : '#5a5040'); }
      const ha = (S.bell / S.bells) * Math.PI * 2 - Math.PI / 2; px.line(g, cx, cy, cx + Math.cos(ha) * 8, cy + Math.sin(ha) * 8, '#2a2010', 1);
      G.ui.text(g, 'BELL ' + S.bell + '/' + S.bells, 36, 8, S.bell >= S.bells - 2 ? '#ff8a6a' : '#ffe8a8');
      G.art.seasonIcon(g, S.season, 40, 26, 3); G.ui.text(g, G.SEASON_NAME[S.season] + ' Tide', 48, 22, G.SEASON_COLOR[S.season]);
      // the order (top centre)
      const ord = S.order.filter(id => !S.troops[id].gone); let ox = Math.round(W / 2 - ord.length * 13);
      for (const id of ord) { const t = S.troops[id], k = S.units[t.knight], act = tr && tr.id === id; if (act) px.rect(g, ox - 2, 2, 24, 22, '#ffe070'); G.art.banner(g, S.sides[t.side].realm, ox + 4, 5, 1.1, S.spec.mode === 'shrine' ? G.SEAT_COLORS[t.side] : null); G.ui.text(g, k.name.slice(0, 4), ox + 1, 17, act ? '#ffffff' : '#a8a0c0', { font: 'tiny' }); ox += 26; }
      if (S.spec.mode === 'sanctum') G.ui.text(g, 'DIALS ' + Object.values(S.dials).filter(Boolean).length + '/4' + (S.wheelTurned ? '  THE WHEEL TURNED' : ''), W / 2, 28, '#d8c070', { align: 'center' });
      if (S.spec.mode === 'shrine') S.sides.forEach((s, i) => G.ui.text(g, (s.name || '').slice(0, 10) + ' ' + s.glory, W - 90, 44 + i * 10, G.SEAT_COLORS[i]));
      // unit cards
      const act = this.sel && !this.sel.out && ['menu', 'sub', 'move', 'target'].includes(this.mode) ? this.sel : (tr ? S.units[tr.knight] : null);
      if (act) this.card(g, act, 4, H - 62, 'ACTIVE');
      const hov = this.info || (this.cursor && this.sim.unitAt(this.cursor));
      if (hov && hov !== act) this.card(g, hov, W - 134, H - 62, hov.side === this.playerSide ? 'ALLY' : 'FOE');
      // the command list (right) and the forecast (bottom centre)
      if (this.menuList && ['menu', 'sub', 'troop'].includes(this.mode)) {
        const n = Math.min(8, this.menuList.items.length), h = n * 13 + 22, x = W - 112, y = Math.max(44, Math.round(H / 2 - h / 2) - 10);
        G.ui.panel(g, x, y, 106, h, this.mode === 'troop' ? 'TROOP' : this.sel ? this.sel.name : '');
        this.menuList.draw(g, x + 3, y + 19, 100);
        const cur = this.menuList.cur; if (cur && cur.desc) { G.ui.panel(g, x - 120, y, 116, 34, null); G.ui.wrapText(g, cur.desc, x - 114, y + 5, 106, '#e8e4f0', 9); }
        if (this.menuList.whyLine) G.ui.text(g, this.menuList.whyLine, x + 53, y + h + 3, '#ffb0a0', { align: 'center', font: 'tiny' });
      }
      if (this.mode === 'target' && this.targetCells.some(c => G.hex.same(c, this.cursor))) {
        const fc = this.sim.forecast(this.sel, this.pending.a, this.pending.a === 'item' ? this.pending.item : this.pending.skill, this.cursor).slice(0, 3);
        if (fc.length) { const w = 250, x = Math.round(W / 2 - w / 2), y = H - 40 - fc.length * 11; G.ui.panel(g, x, y, w, 8 + fc.length * 11, null);
          fc.forEach((f, i) => { let s = f.name.toUpperCase().slice(0, 12); if (f.heal !== undefined) s += '  +' + f.heal + ' HP'; else if (f.dmg) s += '  HIT ' + f.hit + '%  ' + f.dmg[0] + '-' + f.dmg[1] + (f.elem === 'strong' ? '  ↑ STRONG' : f.elem === 'weak' ? '  ↓ WEAK' : '') + (f.crit ? '  CRIT ' + f.crit + '%' : '') + (f.ko ? '  KO' : ''); else if (f.note) s += '  ' + f.note; if (f.status) s += '  ' + f.status[0] + ' ' + f.status[1] + '%';
            G.ui.text(g, s, x + 6, y + 5 + i * 11, f.side === this.sel.side ? '#a8ffc0' : '#ffe0b0'); }); }
      }
      if (this.tip && G.settings.tips !== 'Off' && this.tip.t < 14) { const t = this.tip.text.replace('{confirm}', G.ui.keyLabel('confirm')).replace('{cancel}', G.ui.keyLabel('cancel')), w = 200, lines = E.font.wrap(t, w - 12); G.ui.panel(g, 4, 44, w, 14 + lines.length * 9, 'TIP', { border: '#5ad89a' }); lines.forEach((l, i) => G.ui.text(g, l, 10, 61 + i * 9, '#e8ffe8')); }
      if (!this.humanTurn() && tr && !S.over) G.ui.text(g, (S.sides[tr.side].name || '') + (this.delegated.has(tr.id) || this.allAuto ? ' (DELEGATED)' : '') + ' ...', W / 2, 44, '#c8c0e0', { align: 'center' });
      if (G.run && G.run.dev) G.ui.text(g, 'DEV', W - 20, 4, '#ff6a6a');
      if (this.turnT > 0) G.ui.text(g, 'TURN ' + Math.ceil(this.turnT) + 's', W / 2, 40, this.turnT < 10 ? '#ff8a6a' : '#ffe8a8', { align: 'center' });
      if (this.net) { const t = this.net.now(); if (t < 0 && t > -10000) E.font.title(g, String(Math.ceil(-t / 1000)), W / 2, H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#ffe070', '#c08030'] }); else if (t === -Infinity) G.ui.text(g, 'Waiting for the round to start...', W / 2, H / 2, '#ffe8a8', { align: 'center' });
        const tr2 = this.sim.active; if (tr2 && this.net.deadline && !S.over && t >= 0) G.ui.text(g, Math.max(0, Math.ceil((this.net.deadline - t) / 1000)) + 's' + (this.net.auto.has(tr2.side) ? ' AUTO' : ''), W / 2, 40, '#ffd8a0', { align: 'center' });
        if (this.net.ended || S.over) { G.ui.panel(g, W / 2 - 90, H / 2 - 40, 180, 30 + S.sides.length * 10, 'ROUND OVER'); [...S.sides].sort((a, b) => b.glory - a.glory).forEach((sd, i) => G.ui.text(g, (i + 1) + '. ' + sd.name + '  ' + sd.glory, W / 2 - 80, H / 2 - 20 + i * 10, G.SEAT_COLORS[sd.id])); } }
    });
    if (this.humanTurn() && !this.results) {
      const m = this.mode;
      G.ui.prompts(r, m === 'select' ? [['confirm', 'Select'], ['info', 'Info'], ['command', 'Commands (hold: end)'], ['next', 'Unit'], ['turnR', 'Turn']] : m === 'move' ? [['confirm', 'Move here'], ['cancel', 'Back']] : m === 'target' ? [['confirm', 'Confirm'], ['cancel', 'Back']] : [['confirm', 'Choose'], ['cancel', 'Back'], ['command', 'Troop']]);
    } else if (!this.results) G.ui.prompts(r, [['confirm', 'Hold: fast forward']]);
  },
  card(g, u, x, y, tag) {
    const S = this.sim.state; G.ui.panel(g, x, y, 130, 56, null, { border: u.side === 0 ? '#5a8aff' : '#ff6a5a' });
    const pv = this.view.u[u.id]; try { pv.vis.portrait(g, x + 4, y + 4, 26); } catch (e) { px.rect(g, x + 4, y + 4, 26, 26, '#1a1624'); }
    G.ui.text(g, u.name.slice(0, 12), x + 34, y + 4, '#ffffff'); G.ui.text(g, 'Lv' + u.lvl + ' ' + tag, x + 126, y + 4, '#a8a0c0', { align: 'right', font: 'tiny' });
    G.art.seasonIcon(g, u.elem, x + 38, y + 18, 2.5); G.ui.text(g, u.size + (u.kind === 'knight' ? ' KNIGHT' : '') + (this.sim.outsideWard(u) ? ' OUT OF WARD' : ''), x + 46, y + 15, this.sim.outsideWard(u) ? '#ffb070' : '#c8c0d8', { font: 'tiny' });
    const tide = this.sim.tideOf(u, true); if (tide > 1) G.ui.text(g, '↑', x + 120, y + 15, '#7ad860'); else if (tide < 1) G.ui.text(g, '↓', x + 120, y + 15, '#ff7a5a');
    G.ui.bar(g, x + 34, y + 27, 60, u.hp, u.mhp, u.hp > u.mhp * .3 ? '#5ad86a' : '#ff4a4a'); G.ui.text(g, u.hp + '/' + u.mhp, x + 98, y + 24, '#e8e0f0', { font: 'tiny' });
    if (u.mmp) { G.ui.bar(g, x + 34, y + 35, 60, u.mp, u.mmp, '#5a8aff'); G.ui.text(g, u.mp + ' MP', x + 98, y + 32, '#b0c8ff', { font: 'tiny' }); }
    G.ui.text(g, 'ATK ' + u.atk + ' DEF ' + u.def + ' INT ' + u.int + ' AGI ' + u.agi, x + 6, y + 44, '#c8c0d8', { font: 'tiny' });
    let ix = x + 8; for (const ef of Object.keys(u.eff)) { G.art.effectIcon(g, ef, ix, y + 36); ix += 9; }
  },
  drawResults(r) {
    const R = this.results, W = r.W, H = r.H, k = Math.min(1, R.t / .6);
    r.overlay(g => {
      px.blend(g, .7 * k, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      if (k < .5) return;
      E.font.title(g, R.won ? 'VICTORY' : 'DEFEAT', W / 2, 20, { align: 'center', scale: 3, colors: R.won ? ['#fff8d0', '#ffd060', '#e07a2a'] : ['#ffd0d0', '#ff5a5a', '#8a1a2a'] });
      const S = this.sim.state, place = S.spec.castle ? G.get('castle', S.spec.castle).name : G.get('map', S.spec.map).name;
      const why = { rout: 'The enemy is routed', keep: 'A knight holds the Keep', time: 'The bells ran out', graynight: 'The Gray Knight falls', thirteenth: 'The thirteenth bell tolls', glory: 'Glory decides it' }[R.why] || '';
      G.ui.text(g, place + ' • ' + why, W / 2, 50, '#ffe8a8', { align: 'center' });
      const x0 = Math.round(W / 2 - 160), rows = R.units.slice(R.page * 6, R.page * 6 + 6);
      rows.forEach((u, i) => { const y = 66 + i * 20, pv = this.view.u[u.id]; try { pv.vis.portrait(g, x0, y, 16); } catch (e) { /* no portrait */ } G.ui.text(g, u.name.slice(0, 18), x0 + 22, y + 1, u.out === 'dead' ? '#ff7a7a' : u.out === 'captured' ? '#ffb070' : '#ffffff'); G.ui.text(g, 'Lv ' + u.lvl + (u.lvls ? '  LEVEL UP!' : ''), x0 + 140, y + 1, u.lvls ? '#ffe070' : '#c8c0d8'); const f = Math.min(1, (R.t - .6) / 1.2); G.ui.bar(g, x0 + 22, y + 11, 110, u.exp * f, 100, '#ffd060'); G.ui.text(g, '+' + Math.round(u.expGain * f) + ' EXP', x0 + 140, y + 9, '#ffd060', { font: 'tiny' }); if (u.out) G.ui.text(g, u.out === 'dead' ? 'FELL' : u.out === 'captured' ? 'CAPTURED' : u.out === 'down' ? 'WOUNDED' : 'RETREATED', x0 + 230, y + 1, '#ff9a8a'); });
      let y = 66 + rows.length * 20 + 6;
      if (R.caps.length) { G.ui.text(g, 'Captured: ' + R.caps.join(', '), W / 2, y, '#ffe070', { align: 'center' }); y += 11; }
      if (R.lost.length) { G.ui.text(g, 'Lost: ' + R.lost.join(', '), W / 2, y, '#ff9a8a', { align: 'center' }); y += 11; }
      if (R.glory) R.glory.forEach((gl, i) => G.ui.text(g, S.sides[i].name + ': ' + gl + ' glory', W / 2, y + i * 10, G.SEAT_COLORS[i], { align: 'center' }));
    });
    if (R.t > .8) G.ui.prompts(r, [['confirm', R.page < Math.ceil(R.units.length / 6) - 1 ? 'Next' : 'Continue']]);
  }
};
// the animation finished: hand control back (the scene's afterAnim)
const _bu = G.scenes.battle.update;
G.scenes.battle.update = function (dt) { _bu.call(this, dt); if (this.mode === 'anim' && !this.view.busy && !(this.waitNet > 0)) { const f = this.afterAnim; this.afterAnim = null; if (this.sim.state.over) return; if (f) f(); else if (this.humanTurn()) this.startHuman(); else this.mode = 'ai'; } };
