/* ---- The campaign scene: Tidings, Muster, March, resolution ---- */
G.run = null;
G.startCampaign = (human, difficulty, seed, humans) => {
  G.clearRigs(); G.run = { S: C.create({ human, humans, difficulty, seed }), stage: 'boot', cursor: G.REALMS[human].cap, t: 0 };
  return G.run;
};
const RN = id => G.REALMS[id] ? (G.REALMS[id].short || G.REALMS[id].name) : '?';
const KS = id => (G.KNIGHTS[id] || {}).short || id;
const monName = m => G.get('monster', m.species).names[m.form];
G.CampaignScene = class {
  constructor() { this.stack = []; this.t = 0; this.cards = []; this.ci = 0; this.ct = 0; this.dispatch = []; this.arrowT = 0; this.world = null; this.marchSel = null; this.rect = { x: 14, y: 22, w: 399, h: 186 }; }
  get S() { return G.run.S; }
  enter(data) {
    const run = G.run; this.t = 0; this.stack = []; G.motesInit(40); this.cursor = this.cursorNear(); this.marching = false;
    if (data && data.resume === 'after') { run.stage = 'resolve'; G.music('battle'); this.resolveNext(); return; }
    if (run.stage === 'event') { this.cards = []; this.finishTidings(); return; }
    if (run.stage === 'boot') { run.stage = 'tidings'; C.startTidings(run.S); this.beginTidings(); }
    else if (run.stage === 'tidings') this.beginTidings();
    else if (run.stage === 'resolve') this.resolveNext();
    G.music(this.musicFor());
  }
  musicFor() { return ['spring', 'summer', 'autumn', 'winter'][this.S.season]; }
  beginTidings() {
    const S = this.S; this.cards = S.cards.slice(); this.ci = 0; this.ct = 0; G.run.stage = 'tidings'; G.music(this.musicFor()); G.sfx('season');
    this.dispatch = [];
  }
  /* ---- tidings cards ---- */
  tidingsUpdate(dt) {
    const I = G.game.input; this.ct += dt;
    if (this.ct > .35 && (I.pressed('confirm') || UI.click || I.pressed('alt'))) {
      this.ci++; this.ct = 0; G.sfx('page');
      if (I.down('alt') && I.pressed('alt')) this.ci = this.cards.length;
      if (this.ci >= this.cards.length) this.finishTidings();
    }
  }
  finishTidings() {
    const S = this.S;
    if (S.over) { this.toEnding(); return; }
    try { G.game.saves.autosave(); } catch (e) { }
    if (S.pending && S.pending.length) { const id = S.pending.shift(); S.eventsDone[id] = true; G.run.stage = 'event'; G.game.go('event', { id, back: 'campaign' }); return; }
    G.run.stage = 'muster'; this.cursor = this.cursorNear(); G.music(this.musicFor()); G.activity();
  }
  cursorNear() { const run = G.run; return run.cursor != null ? run.cursor : G.REALMS[this.S.human].cap; }
  toEnding() { G.run.stage = 'ended'; G.game.go('ending', { kind: this.S.over.kind, realm: this.S.over.realm != null ? this.S.over.realm : this.S.human, won: this.S.over.won }); }
  /* ---- panels ---- */
  open(p) { p.list.id = p.list.id || {}; this.stack.push(p); G.sfx('select'); }
  close() { this.stack.pop(); G.sfx('back'); }
  closeAll() { this.stack = []; }
  castleMenu(cid) {
    const S = this.S, c = S.castles[cid], cd = G.CASTLES[cid]; const mine = c.owner === S.human;
    if (!mine) return;
    const items = [
      { label: 'Summon', id: 'summon', disabled: c.stilled, tag: c.stilled ? 'Stilled' : (3 - c.summons) + ' left' },
      { label: 'Knights', id: 'knights', tag: c.knights.length + '' }, { label: 'Reserve', id: 'reserve', tag: c.reserve.length + '' },
      { label: 'Realm items', id: 'items', tag: S.realms[S.human].items.length + '' }];
    this.open({ title: cd.short, w: 112, list: new UI.List(items, { rows: 4 }), onPick: it => { if (it.id === 'summon') this.summonPanel(cid); else if (it.id === 'knights') this.knightsPanel(cid); else if (it.id === 'reserve') this.reservePanel(cid); else this.itemsPanel(cid); } });
  }
  summonPanel(cid) {
    const S = this.S, cd = G.CASTLES[cid], items = cd.circle.map(id => { const sp = G.get('monster', id), cost = C.summonCost(sp); return { label: sp.names[0], id, tag: cost + '', disabled: S.realms[S.human].mana < cost }; });
    this.open({ title: 'The circle: ' + (3 - S.castles[cid].summons) + ' summons left', w: 120, list: new UI.List(items, { rows: 6 }), side: it => this.speciesCard(it.id),
      onPick: (it) => { const r = C.summon(S, cid, it.id); if (r.ok) { G.sfx('summon'); const cp = G.mapPos(G.CASTLES[cid], this.rect); G.fxAdd(cp[0], cp[1] - 6, 'ring', G.SEASON_COL[G.get('monster', it.id).el], .8, { r: 24 }); G.fxAdd(cp[0], cp[1] - 6, 'burst', '#fff', .6, { r: 20 }); UI.toast(r.text); } else { G.sfx('error'); UI.toast(r.text, '#f09090'); } this.refreshPanels(); } });
  }
  speciesCard(id) {
    const sp = G.get('monster', id);
    return (g, x, y) => { G.box(g, x, y, 96, 84); G.drawMon(g, sp, 0, x + 28, y + 36, { t: this.t, scale: 1.4 }); G.T(g, sp.names[0], x + 6, y + 40, '#ffe8a0'); G.T(g, sp.names[1] + ' > ' + sp.names[2], x + 6, y + 49, '#a8a0c8', { font: 'tiny' }); G.T(g, G.SEASONS[sp.el] || 'Hour', x + 6, y + 58, G.SEASON_COL[sp.el]);
      G.T(g, `HP ${sp.hp}  ATK ${sp.atk}`, x + 6, y + 67, '#d8d0f0'); G.T(g, `DEF ${sp.def}  INT ${sp.int}  Bond ${sp.bond}`, x + 6, y + 75, '#d8d0f0', { font: 'tiny' }); };
  }
  refreshPanels() { for (const p of this.stack) if (p.refresh) p.refresh(); }
  knightsPanel(cid) {
    const S = this.S, mk = () => S.castles[cid].knights.map(id => { const k = S.knights[id]; return { label: KS(id) + ' ' + G.className(k), id, tag: 'Lv' + k.lvl + (k.wounded ? ' +' : '') + (k.moved ? ' -' : '') }; });
    const p = { title: 'Knights at ' + G.CASTLES[cid].short, w: 150, list: new UI.List(mk(), { rows: 6 }), refresh: () => { p.list.set(mk()); },
      side: it => it && ((g, x, y) => this.knightCard(g, x, y, it.id)), onPick: it => this.knightMenu(it.id, cid) };
    this.open(p);
  }
  knightCard(g, x, y, id) {
    const S = this.S, k = S.knights[id], st = G.knightStats(k); G.box(g, x, y, 126, 106);
    const rig = G.rigFor('pt:' + id + ':' + k.tier, () => new E.Humanoid(G.knightLook(id, k.line, k.tier, k.realm, 1.3))); rig.drawPortrait(g, x + 4, y + 4, 34, { zoom: 2.4, turn: .35, bg: '#1a1230', frame: true });
    G.T(g, KS(id), x + 42, y + 5, '#ffe8a0'); G.T(g, G.className(k), x + 42, y + 15, '#d8d0f0'); G.T(g, 'Lv ' + k.lvl + '  xp ' + k.xp + '/' + C.xpNeed(k.lvl), x + 42, y + 25, '#a8a0c8', { font: 'tiny' });
    G.T(g, `HP ${st.hp} MP ${st.mp}`, x + 6, y + 42, '#d8d0f0'); G.T(g, `ATK ${st.atk} DEF ${st.def} INT ${st.int}`, x + 6, y + 52, '#d8d0f0'); G.T(g, `Bond ${C.bondUsed(S, k)}/${st.bond}  Move ${st.mov}`, x + 6, y + 62, '#d8d0f0');
    UI.text(g, 'Troop: ' + (k.mons.length ? k.mons.map(m => monName(S.mons[m])).join(', ') : 'none'), x + 6, y + 73, 118, '#a8a0c8', 8); const eq = ['w', 'a', 'c'].map(s => k.equip[s] ? G.get('item', k.equip[s]).name : '-').join(' / '); G.T(g, eq, x + 6, y + 95, '#8a82a8', { font: 'tiny' });
  }
  knightMenu(kid, cid) {
    const S = this.S, k = S.knights[kid], c = S.castles[cid];
    const mk = () => [
      { label: 'Bind monsters', id: 'bind' }, { label: 'Equip', id: 'equip' },
      { label: 'Move to a neighbour', id: 'move', disabled: k.moved || k.wounded || c.stilled, tag: k.moved ? 'moved' : '' },
      { label: 'Go questing', id: 'quest', disabled: !C.canQuest(S, k), tag: k.ruler ? 'ruler' : (G.SITES[cid][0]).replace('The ', '') },
      { label: 'Change class', id: 'promote', disabled: !(C.canPromoteKnight(S, k, false)), tag: k.tier === 0 ? 'Lv10' : k.tier === 1 ? 'Writ' : '' }];
    if (C.canPromoteKnight(S, k, false) && k.tier === 0) { } 
    this.open({ title: KS(kid), w: 140, list: new UI.List(mk(), { rows: 5 }), side: () => (g, x, y) => this.knightCard(g, x, y, kid), refresh() { this.list.set(mk()); },
      onPick: it => {
        if (it.id === 'bind') this.bindPanel(kid, cid);
        else if (it.id === 'equip') this.equipPanel(kid);
        else if (it.id === 'move') this.movePanel(kid, cid);
        else if (it.id === 'quest') { const r = C.quest(S, kid); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); G.sfx(r.ok ? 'quest' : 'error'); this.stack.pop(); this.refreshPanels(); if (this.stack.length) { } }
        else if (it.id === 'promote') { const r = C.promoteKnight(S, kid); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('levelup'); const cp = G.mapPos(G.CASTLES[cid], this.rect); G.fxAdd(cp[0], cp[1] - 6, 'rise', '#ffe070', 1); } this.refreshPanels(); }
      } });
  }
  bindPanel(kid, cid) {
    const S = this.S, k = S.knights[kid], c = S.castles[cid];
    const mk = () => { const ids = k.mons.concat(c.reserve); return ids.map(id => { const m = S.mons[id], sp = G.get('monster', m.species); return { label: monName(m) + ' Lv' + m.lvl, id, tag: (m.owner ? '* ' : 'o ') + 'bond ' + sp.bond, tagCol: m.owner ? '#80f090' : '#a8a0c8' }; }); };
    this.open({ title: 'Bind to ' + KS(kid) + '  ' + C.bondUsed(S, k) + '/' + C.bondCap(S, k), w: 150, list: new UI.List(mk(), { rows: 7 }), refresh() { this.list.set(mk()); this.title = 'Bind to ' + KS(kid) + '  ' + C.bondUsed(S, k) + '/' + C.bondCap(S, k); },
      onPick: it => { const m = S.mons[it.id]; const r = m.owner ? C.unbind(S, it.id) : C.bind(S, it.id, kid); if (r.ok) G.sfx('bind', { vol: .5 }); else G.sfx('error'); UI.toast(r.text || '', r.ok ? '#c8f0c8' : '#f09090'); this.refreshPanels(); },
      side: it => it && S.mons[it.id] && ((g, x, y) => { const m = S.mons[it.id], sp = G.get('monster', m.species); G.box(g, x, y, 96, 70); G.drawMon(g, sp, m.form, x + 28, y + 34, { t: this.t, scale: 1.3 }); G.T(g, monName(m), x + 6, y + 40, '#ffe8a0'); const s = G.monStats(sp, m.form, m.lvl); G.T(g, `HP ${s.hp} ATK ${s.atk}`, x + 6, y + 50, '#d8d0f0'); G.T(g, `DEF ${s.def} INT ${s.int}`, x + 6, y + 59, '#d8d0f0'); }) });
  }
  equipPanel(kid) {
    const S = this.S, k = S.knights[kid], pool = S.realms[k.realm].items;
    const mk = () => { const it = [...new Set(pool.filter(i => ['w', 'a', 'c'].includes(G.get('item', i).slot)))].map(i => ({ label: G.get('item', i).name, id: i, tag: G.get('item', i).text })); for (const s of ['w', 'a', 'c']) if (k.equip[s]) it.push({ label: 'Remove ' + G.get('item', k.equip[s]).name, id: '-' + s, col: '#e0a0a0' }); return it.length ? it : [{ label: 'No equipment in the chest', id: '', disabled: true }]; };
    this.open({ title: 'Equip ' + KS(kid), w: 170, list: new UI.List(mk(), { rows: 6 }), refresh() { this.list.set(mk()); }, onPick: it => { if (it.id.startsWith('-')) { const s = it.id[1], old = k.equip[s]; k.equip[s] = null; delete k.equip[s]; pool.push(old); G.sfx('back'); } else { const r = C.equip(S, kid, it.id); UI.toast(r.text); G.sfx('select'); } this.refreshPanels(); } });
  }
  movePanel(kid, cid) {
    const S = this.S, mk = () => G.ADJ[cid].filter(n => S.castles[n].owner === S.human).map(n => ({ label: G.CASTLES[n].short, id: n, tag: S.castles[n].knights.length + ' knights', disabled: S.castles[n].stilled }));
    const items = mk(); if (!items.length) { UI.toast('No friendly castle is adjacent.', '#f09090'); G.sfx('error'); return; }
    this.open({ title: 'Move ' + KS(kid), w: 150, list: new UI.List(items, { rows: 6 }), onPick: it => { const r = C.moveKnight(S, kid, it.id); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('move'); this.closeAll(); G.run.cursor = it.id; this.cursor = it.id; } else G.sfx('error'); } });
  }
  reservePanel(cid) {
    const S = this.S, c = S.castles[cid], mk = () => c.reserve.map(id => { const m = S.mons[id]; return { label: monName(m) + ' Lv' + m.lvl, id, tag: C.canPromoteMon(S, m, false) ? 'can promote' : '', tagCol: '#ffd870' }; });
    this.open({ title: 'Reserve at ' + G.CASTLES[cid].short, w: 150, list: new UI.List(mk().length ? mk() : [{ label: 'Nothing here', disabled: true }], { rows: 7 }), refresh() { const m = mk(); this.list.set(m.length ? m : [{ label: 'Nothing here', disabled: true }]); },
      onPick: it => { if (!S.mons[it.id]) return; const m = S.mons[it.id];
        this.open({ title: monName(m), w: 110, list: new UI.List([{ label: 'Promote', id: 'p', disabled: !C.canPromoteMon(S, m, false) }, { label: 'Use Season Seed', id: 's', disabled: !S.realms[S.human].items.includes('seed') || !C.canPromoteMon(S, m, true) || C.canPromoteMon(S, m, false) }, { label: 'Dismiss', id: 'd', col: '#e0a0a0' }], { rows: 3 }), onPick: o => {
          if (o.id === 'd') { this.open({ title: 'Dismiss ' + monName(m) + '?', w: 100, list: new UI.List([{ label: 'Yes, release it', id: 'y' }, { label: 'No', id: 'n' }], { rows: 2 }), onPick: q => { if (q.id === 'y') { C.dismiss(S, m.id); G.sfx('back'); } this.stack.pop(); this.stack.pop(); this.refreshPanels(); } }); return; }
          const r = o.id === 'p' ? C.promoteMon(S, m.id) : C.useItem(S, S.human, 'seed', m.id); UI.toast(r.text, r.ok ? '#c8f0c8' : '#f09090'); if (r.ok) { G.sfx('levelup'); } this.stack.pop(); this.refreshPanels(); } }); } });
  }
  itemsPanel(cid) {
    const S = this.S, pool = S.realms[S.human].items, mk = () => { const u = [...new Set(pool)].map(i => ({ label: G.get('item', i).name + ' x' + pool.filter(x => x === i).length, id: i, tag: G.get('item', i).text })); return u.length ? u : [{ label: 'The chest is empty', disabled: true }]; };
    this.open({ title: 'Realm items', w: 180, list: new UI.List(mk(), { rows: 7 }), refresh() { this.list.set(mk()); }, onPick: it => {
      const d = G.get('item', it.id); if (d.slot === 'seed') { UI.toast('Use it from the Reserve screen on a monster.'); return; } if (d.slot === 'writ') { const ks = C.knightsOf(S, S.human).filter(k => k.tier === 1 && k.lvl >= 20); if (!ks.length) { UI.toast('No knight is ready for the Writ (class tier 2, Lv 20).'); return; } const k = ks[0]; const r = C.useItem(S, S.human, 'writ', k.id); UI.toast(r.text); G.sfx('levelup'); this.refreshPanels(); return; }
      if (d.heal || d.mp) { UI.toast('Use it in battle, or on the Reserve.'); return; } UI.toast('Equip it from a knight\'s Equip screen.'); } });
  }
  commandsMenu() {
    const S = this.S, targets = C.targetsFor(S, S.human);
    const items = [{ label: 'March', id: 'march', disabled: !targets.length, tag: S.marches.filter(m => m.realm === S.human).length + ' declared' }, { label: 'Realms', id: 'realms' }, { label: 'End Muster', id: 'end', col: '#ffe8a0' }, { label: 'How to play', id: 'help' }];
    this.open({ title: 'Commands', w: 120, list: new UI.List(items, { rows: 4 }), onPick: it => {
      if (it.id === 'march') { this.stack = []; this.startMarchPick(); }
      else if (it.id === 'realms') this.realmsPanel();
      else if (it.id === 'help') { G.game.go('help', { back: 'campaign' }); }
      else if (it.id === 'end') this.open({ title: 'End the Muster and march?', w: 140, list: new UI.List([{ label: 'Yes: let the marches begin', id: 'y' }, { label: 'Not yet', id: 'n' }], { rows: 2 }), onPick: q => { if (q.id === 'y') { this.closeAll(); this.finishMuster(); } else this.close(); } });
    } });
  }
  realmsPanel() {
    const S = this.S; const items = G.REALMS.map(r => ({ label: RN(r.id) + (S.realms[r.id].alive ? '' : ' (fallen)'), id: r.id, tag: C.castlesOf(S, r.id).length + ' castles', col: r.col }));
    this.open({ title: 'The realms of Forseason', w: 150, list: new UI.List(items, { rows: 6 }), side: it => it && ((g, x, y) => { const r = G.REALMS[it.id]; G.box(g, x, y, 130, 70); UI.text(g, r.blurb, x + 6, y + 6, 118, '#d8d0f0', 9); G.T(g, 'Knights ' + C.knightsOf(S, r.id).length + '  Monsters ' + C.monCount(S, r.id), x + 6, y + 52, '#ffe8a0'); if (r.id === S.human) G.T(g, 'Mana ' + S.realms[r.id].mana, x + 6, y + 61, '#80c0ff'); }), onPick: () => { } });
  }
  /* ---- marches ---- */
  startMarchPick() {
    const S = this.S; this.marchTargets = C.targetsFor(S, S.human); if (!this.marchTargets.length) { UI.toast('No enemy castle is within reach.', '#f09090'); return; }
    this.marching = true; this.cursor = this.marchTargets.includes(this.cursor) ? this.cursor : this.marchTargets[0]; G.sfx('select');
  }
  marchChoose(target) {
    const S = this.S, ks = C.marchersFor(S, S.human, target), cur = S.marches.find(m => m.realm === S.human && m.to === target), sel = new Set(cur ? cur.from : []);
    const mk = () => ks.map(k => ({ label: (sel.has(k.id) ? '[x] ' : '[ ] ') + KS(k.id) + ' (' + G.CASTLES[k.at].short + ')', id: k.id, tag: 'Lv' + k.lvl + ' P' + Math.round(C.power(S, k)) }));
    const items = () => mk().concat([{ label: 'Declare this march', id: '!', col: '#ffe8a0' }, { label: 'Stand down', id: 'x', col: '#e0a0a0' }]);
    const tc = S.castles[target], dp = tc.knights.reduce((a, id) => a + C.power(S, S.knights[id]), 0);
    this.open({ title: 'March on ' + G.CASTLES[target].short, w: 170, list: new UI.List(items(), { rows: 6 }), refresh() { this.list.set(items()); },
      side: () => (g, x, y) => { G.box(g, x, y, 100, 52); G.T(g, RN(tc.owner), x + 6, y + 5, G.REALMS[tc.owner].col); G.T(g, 'Defenders: ' + tc.knights.length, x + 6, y + 15, '#d8d0f0'); G.T(g, 'Power ~' + Math.round(dp), x + 6, y + 25, '#d8d0f0'); const mine = [...sel].reduce((a, id) => a + C.power(S, S.knights[id]), 0); G.T(g, 'Yours ~' + Math.round(mine), x + 6, y + 35, mine > dp ? '#80f090' : '#f0a060'); },
      onPick: it => {
        if (it.id === '!') { if (!sel.size) { UI.toast('Choose at least one knight.', '#f09090'); G.sfx('error'); return; } C.declare(S, S.human, target, [...sel]); G.sfx('quest'); this.closeAll(); this.marching = false; UI.toast('March declared on ' + G.CASTLES[target].short + '.'); }
        else if (it.id === 'x') { C.declare(S, S.human, target, []); this.closeAll(); this.marching = false; }
        else { if (sel.has(it.id)) sel.delete(it.id); else if (sel.size < 2) sel.add(it.id); else { UI.toast('Two knights per march.'); G.sfx('error'); return; } this.refreshPanels(); }
      } });
  }
  finishMuster() {
    const S = this.S; this.marching = false;
    if (C.nextSeat(S)) { G.run.stage = 'handover'; this.cursor = G.run.cursor = G.REALMS[S.human].cap; G.sfx('bell'); this.ct = 0; return; }
    this.endMuster();
  }
  endMuster() { const S = this.S; C.endMuster(S); G.run.stage = 'resolve'; G.music('battle'); this.resolveNext(); }
  /* ---- resolution ---- */
  resolveNext() {
    const S = this.S; if (S.over) { this.toEnding(); return; }
    const res = C.resolveAI(S, false);
    for (const r of res) this.dispatch.push(r.free ? `${RN(r.a.realm)} walks into ${G.CASTLES[r.a.to].short}: the gates stand open.` : `${RN(r.a.realm)} ${r.out.won ? 'takes' : 'fails to take'} ${G.CASTLES[r.a.to].short}.`);
    if (S.over) { this.toEnding(); return; }
    if (S.queue.length) {
      const n = C.nextAttack(S); if (!n) { this.resolveNext(); return; }
      if (n.free) { this.dispatch.push(`${RN(n.attack.realm)} walks into ${G.CASTLES[n.attack.to].short}: the gates stand open.`); G.run.stage = 'resolve'; if (S.over) { this.toEnding(); return; } this.resolveNext(); return; }
      const a = n.attack, spec = C.battleSpecFor(S, a); this.pending = { a, spec };
      const att = C.isHuman(S, a.realm); const title = `${RN(a.realm)} marches on ${G.CASTLES[a.to].short}`;
      G.run.stage = 'resolveAsk';
      this.open({ title, w: 150, list: new UI.List([{ label: att ? 'Command the battle' : 'Defend in person', id: 'cmd' }, { label: 'Delegate to the captains', id: 'del' }], { rows: 2 }), noCancel: true, onPick: it => {
        this.closeAll(); if (it.id === 'cmd') { G.run.stage = 'battle'; G.game.go('battle', { spec, attack: a, campaign: true, mapName: spec.map }); } else { const r = C.auto(S, a, spec); this.showResult(r.out, r.sim, a); } } });
      return;
    }
    this.endSeason();
  }
  afterBattle(d) { const S = this.S; this.stack = []; this.showResult(d.out, d.sim, d.attack, true); }
  showResult(out, sim, a, fromBattle) {
    G.run.stage = 'resolveResult'; G.game.go('results', { out, sim, attack: a, S: this.S, campaign: true });
  }
  endSeason() {
    const S = this.S; C.endSeason(S); if (S.over) { this.toEnding(); return; }
    G.run.stage = 'tidings'; this.beginTidings(); G.run.cursor = this.cursor;
  }
  /* ---- update ---- */
  update(dt) {
    const S = this.S, run = G.run, I = G.game.input; this.t += dt; UI.pump(); G.fxUpdate(dt);
    try { G.game.saves.canSave = run.stage === 'muster' && !this.stack.length; } catch (e) { }
    if (G.dev.update(this)) return;
    if (run.stage === 'tidings') { this.tidingsUpdate(dt); return; }
    if (run.stage === 'handover') { this.ct = (this.ct || 0) + dt; if (this.ct > .4 && (I.pressed('confirm') || UI.click)) { run.stage = 'muster'; G.sfx('select'); G.activity(); } return; }
    if (run.stage === 'resolveAsk' || (run.stage === 'resolve')) { }
    if (this.stack.length) {
      const p = this.stack[this.stack.length - 1], r = p.list.update();
      if (r && r.pick != null) p.onPick(p.list.items[r.pick]); else if (r && r.cancel && !p.noCancel) this.close();
      return;
    }
    if (run.stage !== 'muster') return;
    // map cursor
    const nav = UI.nav(), cs = G.CASTLES, valid = this.marching ? this.marchTargets : null;
    if (nav.x || nav.y) { this.cursor = this.nearestDir(this.cursor, nav.x, nav.y, valid); G.sfx('cursor'); UI.mouse = false; }
    if (UI.mouse && UI.ptr && UI.moved) { const h = this.castleAt(UI.ptr[0], UI.ptr[1]); if (h != null && (!valid || valid.includes(h))) this.cursor = h; }
    run.cursor = this.cursor;
    const click = UI.click ? this.castleAt(UI.click[0], UI.click[1]) : null;
    if (this.marching) {
      if (I.pressed('cancel')) { this.marching = false; G.sfx('back'); return; }
      if (I.pressed('confirm') || (click != null && valid.includes(click))) { if (click != null) this.cursor = click; this.marchChoose(this.cursor); }
      return;
    }
    if (I.pressed('alt')) { this.commandsMenu(); return; }
    if (I.pressed('help')) { G.game.go('help', { back: 'campaign' }); return; }
    if (I.pressed('confirm') || click != null) { if (click != null) this.cursor = click; const c = S.castles[this.cursor]; if (c.owner === S.human) this.castleMenu(this.cursor); else { G.sfx('error'); UI.toast(G.CASTLES[this.cursor].short + ' is held by ' + RN(c.owner) + '. Use Commands to march.'); } }
    if (I.pressed('info')) this.realmsPanel();
  }
  nearestDir(from, dx, dy, valid) {
    const a = G.CASTLES[from], list = valid || G.CASTLES.map(c => c.id); let best = from, bs = 1e9;
    for (const id of list) { if (id === from) continue; const b = G.CASTLES[id], vx = (b.x - a.x) * 1.7, vy = b.y - a.y, d = Math.hypot(vx, vy), dot = (vx * dx + vy * dy) / d; if (dot < .35) continue; const sc = d * (2 - dot); if (sc < bs) { bs = sc; best = id; } }
    if (best === from && valid) { const i = valid.indexOf(from); best = valid[(i + (dx + dy > 0 ? 1 : -1) + valid.length) % valid.length]; }
    return best;
  }
  castleAt(x, y) { let best = null, bd = 14; for (const c of G.CASTLES) { const p = G.mapPos(c, this.rect); const d = Math.hypot(p[0] - x, p[1] - y - 6); if (d < bd) { bd = d; best = c.id; } } return best; }
  /* ---- draw ---- */
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, S = this.S, run = G.run, t = this.t, season = S.season; UI.begin();
      this.rect = { x: 14, y: 22, w: W - 28, h: H - 54 };
      G.drawWorldBackdrop(g, W, H, season, t, true);
      this.drawMap(g, W, H);
      G.drawMotes(g, W, H, season, t, .6);
      G.fxDraw(g);
      this.drawTop(g, W, H);
      if (run.stage === 'handover') this.drawHandover(g, W, H);
      else if (run.stage === 'tidings') this.drawTidings(g, W, H);
      else if (run.stage === 'muster' && !this.stack.length) this.drawMuster(g, W, H);
      else this.drawResolveBack(g, W, H);
      this.drawPanels(g, W, H);
      G.dev.draw(g, W, H);
      UI.drawToasts(g, W, H, 1 / 60);
      UI.prompts(g, W, H, this.prompts());
    });
  }
  prompts() {
    const run = G.run; if (G.dev.open) return [['confirm', 'Select'], ['cancel', 'Close']];
    if (this.stack.length) return [['confirm', 'Choose'], ['cancel', 'Back']];
    if (run.stage === 'tidings') return [['confirm', 'Next'], ['alt', 'Skip all']];
    if (run.stage === 'handover') return [['confirm', 'Begin']];
    if (this.marching) return [['dpad', 'Pick target'], ['confirm', 'Choose'], ['cancel', 'Back']];
    if (run.stage === 'muster') return [['dpad', 'Castle'], ['confirm', 'Open castle'], ['alt', 'Commands'], ['info', 'Realms'], ['help', 'Help']];
    return [];
  }
  drawMap(g, W, H) {
    const S = this.S, run = G.run, t = this.t;
    const pos = id => G.mapPos(G.CASTLES[id], this.rect);
    for (const [a, b] of G.ROADS) { const p = pos(a), q = pos(b), own = S.castles[a].owner === S.castles[b].owner && S.castles[a].owner < 5; px.line(g, p[0], p[1], q[0], q[1], own ? G.lerpCol(G.REALMS[S.castles[a].owner].col, '#000000', .45) : '#00000088', 2); px.line(g, p[0], p[1], q[0], q[1], own ? G.lerpCol(G.REALMS[S.castles[a].owner].col, '#ffffff', .1) : '#b8a888', 1); }
    // marches
    for (const m of S.marches) {
      if (m.realm !== S.human && run.stage !== 'resolve') continue; const col = G.REALMS[m.realm].col, tp = pos(m.to);
      for (const fid of m.from) { const k = S.knights[fid]; if (!k) continue; const fp = pos(k.at); const ph = (t * .8) % 1; px.line(g, fp[0], fp[1] - 6, tp[0], tp[1] - 6, col, 2); const ax = fp[0] + (tp[0] - fp[0]) * ph, ay = fp[1] - 6 + (tp[1] - fp[1]) * ph; px.disc(g, ax, ay, 2.5, '#fff'); const ang = Math.atan2(tp[1] - fp[1], tp[0] - fp[0]); px.poly(g, [[tp[0] - Math.cos(ang) * 8 + Math.cos(ang + 2.6) * 6, tp[1] - 6 - Math.sin(ang) * 8 + Math.sin(ang + 2.6) * 6], [tp[0] - Math.cos(ang) * 8, tp[1] - 6 - Math.sin(ang) * 8], [tp[0] - Math.cos(ang) * 8 + Math.cos(ang - 2.6) * 6, tp[1] - 6 - Math.sin(ang) * 8 + Math.sin(ang - 2.6) * 6]], col); }
    }
    for (const c of G.CASTLES) {
      const p = pos(c.id), cs = S.castles[c.id], rm = G.REALMS[cs.owner]; const valid = this.marching && this.marchTargets.includes(c.id);
      if (valid) px.ddisc(g, p[0], p[1] - 4, 14 + Math.sin(t * 6) * 2, '#ff5050', .35);
      G.drawCastle(g, p[0], p[1], c.tier, rm.col, t, { stilled: cs.stilled });
      const lab = c.short; G.T(g, lab, p[0] - G.TW(lab, { font: 'tiny' }) / 2, p[1] + 5, cs.owner === S.human ? '#fff8d8' : '#d0c8e8', { font: 'tiny' });
      const nk = cs.knights.length; for (let i = 0; i < nk; i++) px.rect(g, Math.round(p[0] - nk * 2 + i * 4), Math.round(p[1] + 12), 3, 3, i === 0 && cs.knights.some(k => S.knights[k].ruler) ? '#ffe070' : rm.col);
      if (c.id === 0 && !S.flags.grayFallen) { px.ddisc(g, p[0], p[1] - 8, 16, '#c0c0ff', .15 + Math.sin(t * 2) * .05); }
    }
    // cursor
    if (run.stage === 'muster' || this.marching) { const p = pos(this.cursor); const q = 12 + Math.sin(t * 8) * 1.2; px.line(g, p[0] - q, p[1] - q - 4, p[0] - q + 5, p[1] - q - 4, '#fff0a0', 1); px.line(g, p[0] + q, p[1] - q - 4, p[0] + q - 5, p[1] - q - 4, '#fff0a0', 1); px.line(g, p[0] - q, p[1] + q - 4, p[0] - q + 5, p[1] + q - 4, '#fff0a0', 1); px.line(g, p[0] + q, p[1] + q - 4, p[0] + q - 5, p[1] + q - 4, '#fff0a0', 1); UI.add('map', 0, p[0] - 12, p[1] - 14, 24, 24); }
  }
  drawTop(g, W, H) {
    const S = this.S, realm = G.REALMS[S.human]; px.rect(g, 0, 0, W, 16, '#0a0614dd'); px.rect(g, 0, 16, W, 1, '#c8a86066');
    px.disc(g, 8, 8, 5, G.SEASON_COL[S.season]); px.disc(g, 8, 8, 3, '#120c1e');
    G.T(g, C.label(S), 18, 4, G.SEASON_COL[S.season]);
    G.T(g, RN(S.human), 108, 4, realm.col);
    const inc = C.incomeOf(S, S.human) - C.upkeepOf(S, S.human); const mt = 'Mana ' + S.realms[S.human].mana + ' (' + (inc >= 0 ? '+' : '') + inc + ')'; G.T(g, mt, W - 8 - G.CORNER - G.TW(mt), 4, '#80c0ff');
    if (S.candle != null) { const ct = 'Candle ' + S.candle; const cx = W - 16 - G.CORNER - G.TW(mt) - G.TW(ct); px.rect(g, cx - 8, 4, 3, 8, '#f0e8c8'); px.poly(g, [[cx - 7, 1], [cx - 9, 4], [cx - 5, 4]], '#ffb040'); G.T(g, ct, cx, 4, S.candle <= 3 ? '#ff8a6a' : '#ffe0a0'); }
  }
  drawHandover(g, W, H) {
    const S = this.S, rm = G.REALMS[S.human]; px.rect(g, 0, 0, W, H, '#0a0614'); const w = 220, h = 70, x = (W - w) / 2, y = (H - h) / 2; G.box(g, x, y, w, h, { border: rm.col });
    const t1 = 'Player ' + (S.humans.indexOf(S.human) + 1) + ': ' + rm.name; G.T(g, 'Pass the controller to', W / 2 - G.TW('Pass the controller to') / 2, y + 10, '#a8a0c8'); E.font.text(g, t1, Math.round(W / 2 - G.TW(t1, { scale: 2 }) / 2), y + 24, rm.col, { scale: 2, shadow: '#000', outline: false });
    G.T(g, 'Press ' + G.game.input.label('confirm') + ' when ready', W / 2 - G.TW('Press ' + G.game.input.label('confirm') + ' when ready') / 2, y + 52, '#ffe8a0');
  }
  drawTidings(g, W, H) {
    const S = this.S, card = this.cards[Math.min(this.ci, this.cards.length - 1)]; if (!card) return;
    px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
    const w = Math.min(W - 40, 300), h = card.kind === 'season' ? 120 : 76, x = (W - w) / 2, y = (H - h) / 2 - 8;
    G.box(g, x, y, w, h);
    if (card.kind === 'season') {
      const sc = G.SEASON_COL[S.season]; E.font.title(g, G.SEASONS[S.season].toUpperCase(), W / 2, y + 12, { scale: 3, align: 'center', colors: ['#ffffff', sc, G.lerpCol(sc, '#000000', .4)], depth: 2 });
      G.T(g, 'Year ' + S.year + ' of the Brigantime', W / 2 - G.TW('Year ' + S.year + ' of the Brigantime') / 2, y + 48, '#d8d0f0');
      const sting = ['Blossoms wake the lowland: floods in the low places.', 'Summer fires wake the forests. Verdant hexes burn.', 'The autumn gale spoils arrows and slows wings.', 'Winter ice binds the water. Other seasons\' monsters slow.'][S.season];
      UI.text(g, sting, x + 20, y + 66, w - 40, '#f4eed8', 10);
      const tip = G.TIPS[(S.turn * 3 + S.season) % G.TIPS.length]; UI.text(g, 'Hint: ' + tip, x + 20, y + 90, w - 40, '#a8a0c8', 9);
      // the Wheel turns
      const cx = x + w - 28, cy = y + 28, a = this.ct * 1.2; for (let i = 0; i < 4; i++) px.disc(g, cx + Math.cos(a + i * Math.PI / 2) * 12, cy + Math.sin(a + i * Math.PI / 2) * 12, 3, G.SEASON_COL[i]);
    } else {
      const head = { candle: 'The Hour-Candle', income: 'The Treasury', stillness: 'Stillness', quest: 'Tidings from the road', desert: 'Desertion', info: 'Tidings' }[card.kind] || 'Tidings'; G.T(g, head, x + 12, y + 8, card.kind === 'stillness' ? '#a0c0ff' : '#ffe8a0');
      UI.text(g, card.text, x + 12, y + 24, w - 24, '#f4eed8', 10);
    }
    G.T(g, (this.ci + 1) + '/' + this.cards.length, x + w - 30, y + h - 12, '#a8a0c8');
  }
  drawMuster(g, W, H) {
    const S = this.S, c = S.castles[this.cursor], cd = G.CASTLES[this.cursor], rm = G.REALMS[c.owner];
    const p = G.mapPos(cd, this.rect), left = p[0] > W / 2, w = 118, h = 78, x = left ? 6 : W - w - 6, y = H - h - 20;
    G.box(g, x, y, w, h, { alpha: .93 });
    G.T(g, cd.short, x + 6, y + 5, '#fff8d8'); G.T(g, RN(c.owner) + ' - ' + (['Spring', 'Summer', 'Autumn', 'Winter', 'Hour', 'Outlaw'][cd.region]), x + 6, y + 15, rm.col);
    G.T(g, 'Yield ' + Math.round(G.castleYield(cd) * (cd.region === S.season ? 1.25 : 1)) + '  Tier ' + cd.tier, x + 6, y + 25, '#d8d0f0');
    let yy = y + 36; for (const id of c.knights.slice(0, 4)) { const k = S.knights[id]; G.T(g, KS(id) + ' Lv' + k.lvl + ' ' + G.className(k) + (k.wounded ? ' +' : ''), x + 6, yy, '#f4eed8'); yy += 9; }
    if (!c.knights.length) G.T(g, 'No knights: the gates stand open', x + 6, yy, '#f09090');
    if (c.stilled) G.T(g, 'STILLED', x + w - 46, y + 5, '#a0c0ff');
    if (c.owner === S.human) { const sit = G.SITES[this.cursor][0]; G.T(g, sit.replace('The ', ''), x + 6, y + h - 9, '#8a82a8', { font: 'tiny' }); }
  }
  drawResolveBack(g, W, H) {
    const run = G.run; px.polyDither(g, [[0, 17], [W, 17], [W, H], [0, H]], '#000000', .35);
    G.T(g, 'The March', W / 2 - G.TW('The March') / 2, 22, '#ffe8a0');
    this.dispatch.slice(-6).forEach((l, i) => G.T(g, l, 10, 36 + i * 10, '#d8d0f0'));
  }
  drawPanels(g, W, H) {
    this.stack.forEach((p, idx) => {
      const rows = Math.min(p.list.items.length, p.list.rows), h = rows * 12 + 22, w = p.w || 120;
      const x = this.stack.length > 1 ? 20 + idx * 14 : 14, y = 26 + idx * 8;
      G.box(g, x, y, w, h, { alpha: .96 }); G.T(g, p.title, x + 6, y + 5, '#ffe8a0'); px.rect(g, x + 4, y + 15, w - 8, 1, '#c8a86055');
      p.list.draw(g, x + 4, y + 18, w - 8);
      if (idx === this.stack.length - 1 && p.side) { const it = p.list.cur(), fn = p.side(it); if (fn) fn(g, x + w + 4 + (x + w + 4 + 120 > W ? -w - 130 : 0), y); }
    });
  }
};
