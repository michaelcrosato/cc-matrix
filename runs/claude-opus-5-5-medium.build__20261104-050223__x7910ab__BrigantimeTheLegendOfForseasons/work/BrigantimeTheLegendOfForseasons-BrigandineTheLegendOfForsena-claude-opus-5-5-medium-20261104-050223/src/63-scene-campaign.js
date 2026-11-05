/* ---- THE CAMPAIGN SCENE: the world map, its HUD, the season's flow (Tidings, Muster, March, Resolution) as a queue of
 * steps that survives trips to the battle and story scenes, and every Muster panel ---- */
const CP = {};   // panel builders
const curRealm = () => { const R = G.run, S = R.sim.state, st = R.flow[0]; return st && st.realm ? st.realm : S.humans.find(h => S.realms[h].alive) || S.humans[0]; };
const KN = id => G.get('knight', id), MN = m => G.get('monster', m.sp).names[m.tier - 1];
G.flowPush = (...steps) => G.run.flow.splice(1, 0, ...steps);   // after the current step
G.flowDone = () => { G.run.flow.shift(); };
G.scenes.campaign = {
  view: 'threequarter', views: ['threequarter'], res: 'ps1', pausable: true, touch: [], input: G.INPUT, camera: { zoom: [.6, 1.6], start: .9, tall: 1.2 },
  enter(d) {
    const R = G.run; if (!R) { G.game.go('title'); return; }
    G.campaignScene = this;
    if (!R.wm || R.wm.sim !== R.sim) R.wm = new G.WorldMap(R.sim);
    this.wm = R.wm; this.kv = {}; this.panel = null; this.card = null; this.confirm = new G.ui.Confirm(); this.wipe = null; this.hold = 0;
    const cap = R.sim.capital(curRealm()) || 'meridian'; this.focus = cap; const p = G.get('castle', cap).pos; this.look = [p[0], p[1]];
    this.lastSeason = R.sim.season(); this.ptr = null; this.idleAI = 0;
    this.setAmbience();
  },
  exit() { G.game.weather = null; },
  setAmbience() { const s = G.run.sim.season(); G.music(s); const wx = { spring: { kind: 'rain', amount: .25 }, summer: null, autumn: { kind: 'leaves', amount: .4, wind: .3 }, winter: { kind: 'snow', amount: .5 } }[s]; G.game.weather = wx && G.dev.weather ? Object.assign({}, wx, { amount: wx.amount * (G.game.settings.reduceMotion ? .5 : 1) }) : null; },
  focusName() { return this.focus; }, panelName() { return this.panel ? this.panel.id : this.card ? 'card' : null; },
  back() { if (this.panel) { this.panel = null; return true; } return false; },
  update(dt) {
    const R = G.run, sim = R.sim, I = G.game.input; G.ui.drawDt = dt;
    if (G.dev.open) { G.devUpdate(dt); return; }
    if (this.confirm.update(dt)) return;
    this.wm.refresh();
    if (sim.season() !== this.lastSeason) { this.lastSeason = sim.season(); this.wipe = { t: 0 }; this.setAmbience(); }
    if (this.wipe) { this.wipe.t += dt; if (this.wipe.t > 1.5) this.wipe = null; }
    for (const id in this.kv) this.kv[id].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    // the camera eases toward the focused castle
    // the camera: eases to the focused castle (keys, pad), or pans by a mouse drag or the screen's edge (setting)
    const pn = I.pan && I.pan(), v = G.game.view, ptr = I.pointer();
    if (pn && (pn[0] || pn[1])) { const d = v.screenDirToGround(-pn[0], -pn[1]), l = Math.hypot(pn[0], pn[1]) / (v.scale || 1); this.look[0] += d[0] * l; this.look[1] += d[1] * l; this.mouseFocus = true; }
    if (G.settings.edgePan === 'On' && ptr && I.lastDevice === 'mouse') { const ex = ptr[0] < 10 ? -1 : ptr[0] > G.game.W - 10 ? 1 : 0, ey = ptr[1] < 10 ? -1 : ptr[1] > G.game.H - 10 ? 1 : 0; if (ex || ey) { const d = v.screenDirToGround(ex, ey); this.look[0] += d[0] * 240 * dt; this.look[1] += d[1] * 240 * dt; this.mouseFocus = true; } }
    if (!this.mouseFocus) { const fp = G.get('castle', this.focus).pos; this.look[0] = lerp(this.look[0], fp[0], Math.min(1, dt * 5)); this.look[1] = lerp(this.look[1], fp[1] + 20, Math.min(1, dt * 5)); }
    this.look[0] = clamp(this.look[0], 0, 1024); this.look[1] = clamp(this.look[1], 0, 1024); G.game.focus(this.look[0], this.look[1], 0);
    if (sim.state.over && !(R.flow[0] && R.flow[0].k === 'event')) { G.game.go('ending', { kind: sim.state.over.kind, realm: sim.state.over.realm }); return; }
    this.step(dt);
  },
  // run the head of the flow
  step(dt) {
    const R = G.run, sim = R.sim, S = sim.state, st = R.flow[0], I = G.game.input;
    if (!st) { R.flow.push({ k: 'tidings' }); return; }
    switch (st.k) {
      case 'prologue': G.flowDone(); G.game.go('event', { prologue: true, back: 'campaign' }); return;
      case 'tidings': {
        G.flowDone(); const rep = sim.beginSeason(), steps = [];
        steps.push({ k: 'card', kind: 'season', season: sim.season(), year: S.year });
        for (const q of rep) {
          if (q.kind === 'candle') steps.push({ k: 'card', kind: 'candle', n: q.n });
          if (q.kind === 'stilled') steps.push({ k: 'card', kind: 'text', title: 'STILLNESS', text: G.get('castle', q.castle).name + ' has stopped breathing. It yields no mana and its troops cannot move this season.' });
          if (q.kind === 'fallen') steps.push({ k: 'card', kind: 'text', title: 'A REALM FALLS', text: G.get('realm', q.realm).name + ' is no more.' });
          if (q.kind === 'event') steps.push({ k: 'event', id: q.id, realm: S.humans[0] || 'world', applied: true });
          if (q.kind === 'rivalWin' || q.kind === 'note' && q.text) steps.push({ k: 'card', kind: 'text', title: 'MERIDIAN', text: q.text || '' });
        }
        for (const h of S.humans) {
          if (!S.realms[h].alive) continue;
          if (S.humans.length > 1 && G.settings.privacy === 'On') steps.push({ k: 'privacy', realm: h });
          for (const q of rep) if (q.kind === 'income' && q.realm === h) steps.push({ k: 'card', kind: 'income', realm: h, q });
          for (const q of rep) if (q.kind === 'quest' && q.realm === h) { if (q.story) steps.push({ k: 'event', id: q.story, realm: h }); else steps.push({ k: 'card', kind: 'quest', q }); if (q.joined) steps.push({ k: 'event', id: q.joined, realm: h, wanderer: true }); }
          for (const id of sim.eventsFor('tidings', h)) steps.push({ k: 'event', id, realm: h });
          steps.push({ k: 'muster', realm: h });
        }
        steps.push({ k: 'marchPhase' });
        R.flow.unshift(...steps);
        if (!S.over && S.phase === 'muster' && G.game.saves && !G.hubActive) { try { G.game.saves.autosave(); } catch (e) { /* storage blocked */ } }
        return;
      }
      case 'card': case 'privacy': if (!this.card || this.card.st !== st) this.card = CP.card(st); this.card.update(dt); return;
      case 'event': {
        if (st.applied || st.wanderer) { G.flowDone(); G.game.go('event', { id: st.wanderer ? st.id : st.id, realm: st.realm, back: 'campaign', applied: true, wanderer: st.wanderer }); return; }
        G.flowDone(); G.game.go('event', { id: st.id, realm: st.realm, back: 'campaign', onChoice: (choice) => { const r = sim.apply({ t: 'event', id: st.id, realm: st.realm, choice }); this.afterEffects(r.out || [], st.realm); } }); return;
      }
      case 'tutorialBattle': G.flowDone(); G.startBattle(G.tutorialSpec(st.realm), { back: 'campaign', onDone: (res) => { S.flags.tutorialDone = true; G.game.go('campaign'); } }); return;
      case 'resumeMuster': { G.flowDone(); const steps = []; if (S.phase === 'muster') for (const h of S.humans) if (S.realms[h].alive && !S.done[h]) steps.push({ k: 'muster', realm: h }); if (S.phase === 'muster' || S.phase === 'march') steps.push({ k: 'marchPhase' }); if (S.phase === 'resolve') steps.push({ k: 'resolve' }); if (S.phase === 'tidings') steps.push({ k: 'tidings' }); R.flow.unshift(...steps); return; }
      case 'muster': if (S.phase !== 'muster' || S.done[st.realm]) { G.flowDone(); return; } this.musterInput(dt, st.realm, 'muster'); if (st.first !== false) { st.first = false; this.focus = sim.capital(st.realm) || this.focus; const evs = sim.eventsFor('muster', st.realm).map(id => ({ k: 'event', id, realm: st.realm })); if (evs.length) { G.run.flow.unshift(...evs); return; } } return;
      case 'marchPhase': { G.flowDone(); const steps = []; for (const h of S.humans) if (S.realms[h].alive) { if (S.humans.length > 1 && G.settings.privacy === 'On') steps.push({ k: 'privacy', realm: h }); for (const id of sim.eventsFor('march', h)) steps.push({ k: 'event', id, realm: h }); steps.push({ k: 'march', realm: h }); } steps.push({ k: 'resolve' }); R.flow.unshift(...steps); return; }
      case 'march': if (S.phase !== 'march' || S.done[st.realm]) { G.flowDone(); return; } this.musterInput(dt, st.realm, 'march'); return;
      case 'resolve': {
        if (S.phase === 'march' && !S.humans.some(h => S.realms[h].alive && !S.done[h])) sim.beginResolution();
        if (S.flags.sanctumPending) { const r = S.flags.sanctumPending; S.flags.sanctumPending = null; const ks = sim.sanctumTroops(r); if (ks.length) S.queue.unshift({ realm: r, target: 'sanctum', knights: ks, from: {} }); }
        const a = sim.nextAttack(); if (!a) { G.flowDone(); G.run.flow.unshift({ k: 'endSeason' }); return; }
        const human = S.realms[a.march.realm].human ? a.march.realm : (a.defender && S.realms[a.defender] && S.realms[a.defender].human ? a.defender : null);
        if (a.kind === 'open') { const steps = [{ k: 'card', kind: 'text', title: 'THE GATES STAND OPEN', text: G.get('realm', a.march.realm).short + ' takes ' + G.get('castle', a.march.target).name + ' without a battle.', castle: a.march.target }]; if (S.realms[a.march.realm].human) for (const id of sim.eventsFor('capture', a.march.realm, { castle: a.march.target })) steps.push({ k: 'event', id, realm: a.march.realm }); G.run.flow.unshift(...steps); G.sfx('castle_taken'); return; }
        if (!human) { const b = G.BattleSim.create(sim.battleSpec(a, G.Rng.int(S.rng, 1, 1e9))), res = G.BattleAI.resolve(b), out = sim.applyBattle(a, res); if (G.settings.aiBattles !== 'Skip') G.run.flow.unshift({ k: 'card', kind: 'battle', out, auto: true }); return; }
        G.run.flow.unshift({ k: 'battleChoice', a, realm: human }); return;
      }
      case 'battleChoice': if (!this.card || this.card.st !== st) this.card = CP.battleChoice(st); this.card.update(dt); return;
      case 'endSeason': G.flowDone(); sim.endSeason(); if (!S.over) G.run.flow.unshift({ k: 'tidings' }); return;
    }
  },
  afterEffects(out, realm) {
    for (const o of out) {
      if (o.toast) G.ui.toast(o.toast, 4);
      if (o.joined) G.ui.toast(KN(o.joined).name + ' joins your cause!', 4);
      if (o.tutorial) G.run.flow.unshift({ k: 'tutorialBattle', realm });
      if (o.sanctum) G.run.sim.state.flags.sanctumPending = realm;
      if (o.battleBuff) (G.run.pendingBuffs = G.run.pendingBuffs || []).push(o.battleBuff);
    }
  },
  // the battle for an attack, commanded or delegated; then the aftermath and its events
  fight(a, command) {
    const R = G.run, sim = R.sim, S = sim.state, spec = sim.battleSpec(a, G.Rng.int(S.rng, 1, 1e9)), human = S.realms[a.march.realm].human ? a.march.realm : a.defender;
    const after = res => {
      const out = sim.applyBattle(a, res), steps = [{ k: 'card', kind: 'battle', out }], won = (human === out.attacker) === out.won;
      if (!S.realms[human].firstSeen) { S.realms[human].firstSeen = true; for (const id of sim.eventsFor('afterBattle', human, { won })) steps.push({ k: 'event', id, realm: human }); }
      for (const id of sim.eventsFor('afterBattle', human, { won, sanctum: a.kind === 'sanctum' })) if (!steps.some(s => s.id === id)) steps.push({ k: 'event', id, realm: human });
      if (out.won && human === out.attacker && a.kind !== 'sanctum') for (const id of sim.eventsFor('capture', human, { castle: out.castle })) steps.push({ k: 'event', id, realm: human });
      G.run.flow.unshift(...steps);
    };
    const before = []; for (const id of sim.eventsFor('beforeBattle', human, { castle: a.march.target, knights: spec.sides.flatMap(s => s.troops.map(t => t.knight.id)), defender: a.defender })) before.push(id);
    for (const id of before) sim.apply({ t: 'event', id, realm: human, choice: null });
    const buffs = []; for (const id of before) for (const f of G.get('event', id).effects) if (f.battleBuff) buffs.push(f.battleBuff);
    if (!command) { const b = G.BattleSim.create(spec); for (const [kid, eff] of buffs) { const u = b.state.units.find(x => x.ref === kid); if (u) u.eff[eff] = 2; } after(G.BattleAI.resolve(b)); return; }
    if (G.game.saves && !G.hubActive) { try { G.game.saves.autosave(); } catch (e) { /* storage blocked */ } }
    G.startBattle(spec, { back: 'campaign', buffs, onDone: res => { after(res); G.game.go('campaign'); } });
  },
  // muster and march: the focus moves between castles; confirm opens the castle's card; □ opens the commands
  musterInput(dt, realm, phase) {
    const R = G.run, sim = R.sim, S = sim.state, I = G.game.input;
    if (this.panel) { const r = this.panel.update(dt); if (r === 'close') { this.panel = null; I.consumeAll(); } return; }
    if (G.autoplay) { this.idleAI += dt; if (this.idleAI > .5) { this.idleAI = 0; if (phase === 'muster') { G.CampaignAI.autoplayMuster(sim, realm); sim.apply({ t: 'endMuster', realm }); } else { G.CampaignAI.autoplayMarch(sim, realm); sim.apply({ t: 'endMarch', realm }); } G.flowDone(); } return; }
    const t = (I.repeat('right', .25, .12) ? 1 : 0) - (I.repeat('left', .25, .12) ? 1 : 0), u = (I.repeat('down', .25, .12) ? 1 : 0) - (I.repeat('up', .25, .12) ? 1 : 0);
    if (t || u) { const from = G.get('castle', this.focus).pos; let best = null, bd = 1e9; for (const c of G.all('castle')) { if (c.id === this.focus) continue; const dx = c.pos[0] - from[0], dy = c.pos[1] - from[1], l = Math.hypot(dx, dy), dot = (dx * t + dy * u) / (l * Math.hypot(t, u)); if (dot < .5) continue; const sc = l * (2 - dot); if (sc < bd) { bd = sc; best = c.id; } } if (best) { this.focus = best; this.mouseFocus = false; G.sfx('ui_move'); } }
    if (I.pressed('prev') || I.pressed('next')) { const own = sim.castlesOf(realm).sort(); if (own.length) { const k = own.indexOf(this.focus); this.focus = own[(k + (I.pressed('next') ? 1 : -1) + own.length) % own.length]; this.mouseFocus = false; G.sfx('ui_move'); } }
    const p = I.pointer(); if (p && (!this.ptr || Math.hypot(p[0] - this.ptr[0], p[1] - this.ptr[1]) > 2)) { const c = this.castleAtScreen(p); if (c && c !== this.focus) { this.focus = c; this.mouseFocus = true; G.sfx('ui_move'); } } this.ptr = p;
    const ck = I.clicked(); if (ck) { const c = this.castleAtScreen(ck); if (c) { this.focus = c; this.openCastle(realm, phase); return; } }
    if (I.pressed('confirm')) { this.openCastle(realm, phase); return; }
    if (I.pressed('info')) { this.panel = CP.realm(realm); return; }
    if (I.pressed('cancel')) { G.game.pause(); return; }
    if (I.down('command')) { this.hold += dt; if (this.hold > .6) { this.hold = -99; this.endPhase(realm, phase); } } else { if (this.hold > 0 && this.hold < .6) this.panel = CP.commands(realm, phase, this); this.hold = 0; }
    G.game.saves && (G.game.saves.canSave = phase === 'muster' && !G.hubActive);
  },
  endPhase(realm, phase) {
    const R = G.run, sim = R.sim, go = () => { sim.apply({ t: phase === 'muster' ? 'endMuster' : 'endMarch', realm }); G.flowDone(); G.sfx('ui_confirm'); };
    if (G.settings.confirmEnd === 'On') this.confirm.ask(phase === 'muster' ? 'End the Muster and go to the March?' : (sim.state.marches.filter(m => m.realm === realm).length ? 'Send your declared marches?' : 'End the March without attacking?'), go); else go();
  },
  castleAtScreen(p) { const r = G.game.r || {}; let best = null, bd = 22; for (const c of G.all('castle')) { const q = this.screenOf(c.pos); if (!q) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1] + 10); if (d < bd) { bd = d; best = c.id; } } return best; },
  screenOf(pos) { try { const v = G.game.view, sc = G.game.screen; const q = v.p(pos[0], pos[1], 0); return [q[0] - sc.ix, q[1] - sc.iy]; } catch (e) { return null; } },
  openCastle(realm, phase) {
    const sim = G.run.sim, c = this.focus, own = sim.owner(c) === realm;
    G.sfx('ui_open');
    if (phase === 'march') { if (!own || (c === 'meridian' && sim.state.flags.sanctumOpen)) this.panel = CP.march(realm, own ? 'sanctum' : c, this); else this.panel = CP.castleInfo(c); return; }
    this.panel = own ? CP.castle(realm, c, this) : CP.castleInfo(c);
  },
  draw(r) {
    const R = G.run, sim = R.sim, S = sim.state, season = sim.season(), P = G.PAL[season];
    r.sky(['#0a1830', '#1a3a68']);
    const L = G.game.lights; L.enabled = true; L.ambient = Math.min(1, P.ambient + .1);
    this.wm.map.drawFloor(r); this.wm.drawProps(r);
    const realm = curRealm();
    // march arrows: chevrons along the roads
    for (const m of S.marches) { if (!S.realms[m.realm].human && S.phase !== 'resolve') continue; const col = G.realmColor(m.realm), tg = m.target === 'sanctum' ? 'meridian' : m.target, B = G.get('castle', tg).pos; for (const kid of m.knights) { const from = m.from[kid]; if (!from) continue; const A = G.get('castle', from).pos; r.decal(g => { const a = r.w(A[0], A[1], 0), b = r.w(B[0], B[1], 0), n = 8, ph = (G.game.real * 2) % 1; for (let i = 0; i < n; i++) { const t = (i + ph) / n, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), ang = Math.atan2(b[1] - a[1], b[0] - a[0]); px.poly(g, [[x + Math.cos(ang) * 4, y + Math.sin(ang) * 4], [x + Math.cos(ang + 2.4) * 4, y + Math.sin(ang + 2.4) * 4], [x + Math.cos(ang - 2.4) * 4, y + Math.sin(ang - 2.4) * 4]], col); } }); } }
    // dev: the AI's planned marches, from a copy of the campaign
    if (G.dev.revealAI && S.phase === 'march') { const key = S.year * 4 + S.si; if (this.aiPlanKey !== key) { this.aiPlanKey = key; const c = G.CampaignSim.load(sim.serialize()); for (const r of Object.keys(c.state.realms)) if (c.state.realms[r].alive && !c.state.realms[r].human && r !== 'brigands') G.CampaignAI.march(c, r); this.aiPlan = c.state.marches.filter(m => !S.realms[m.realm].human); }
      for (const m of this.aiPlan || []) { const B = G.get('castle', m.target === 'sanctum' ? 'meridian' : m.target).pos; for (const kid of m.knights) { const from = m.from[kid]; if (!from) continue; const A = G.get('castle', from).pos; r.decal(g => { const a = r.w(A[0], A[1], 0), b = r.w(B[0], B[1], 0); for (let i = 0; i < 12; i += 2) px.line(g, lerp(a[0], b[0], i / 12), lerp(a[1], b[1], i / 12), lerp(a[0], b[0], (i + 1) / 12), lerp(a[1], b[1], (i + 1) / 12), '#ff4040', 2); }); } } }
    // castles, banners, troop figures, markers
    for (const c of G.all('castle')) {
      const [x, y] = c.pos, cs = S.castles[c.id], own = cs.owner;
      r.shape(this.wm.shapeFor(c.id), x, y, 0, { scale: c.id === 'meridian' ? .9 : c.tier === 'capital' ? 1.1 : .85, facing: Math.PI / 2 });
      if (c.id === this.focus) r.groundRing(x, y, 26, '#ffe070', .9);
      if (cs.stilled) r.groundRing(x, y, 22, '#a0a0b0', .8);
      const ks = cs.knights.slice(0, 4);
      ks.forEach((kid, i) => { const v = this.kv[kid] || (this.kv[kid] = G.art.visual({ kind: 'knight', id: kid, scale: .55 })); const fx = x - 18 + i * 12, fy = y + 22; r.shadow(fx, fy, 3, .4); r.actor(fx, fy, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)); });
      G.game.lights.add(x, y, 20, 60, .5, { color: G.realmColor(own) });
    }
    r.overlay(g => {
      for (const c of G.all('castle')) {
        const cs = S.castles[c.id], [sx, sy] = r.w(c.pos[0], c.pos[1], 46);
        G.art.banner(g, cs.owner, Math.round(sx) + 8, Math.round(sy) - 6, 1);
        const foc = c.id === this.focus;
        if (foc || G.game.zoom > 1.05 || c.tier === 'capital' || c.id === 'meridian') { const [lx, ly] = r.w(c.pos[0], c.pos[1], 0); G.ui.text(g, c.name, Math.round(lx), Math.round(ly) + 30, foc ? '#ffe070' : '#f0e8d8', { align: 'center', outline: '#140c14', shadow: false }); }
        if (cs.knights.length > 4) { const [lx, ly] = r.w(c.pos[0] + 30, c.pos[1] + 22, 0); G.ui.text(g, '+' + (cs.knights.length - 4), lx, ly, '#ffffff'); }
        if (cs.stilled) { const [lx, ly] = r.w(c.pos[0], c.pos[1], 60); G.art.effectIcon(g, 'stop', Math.round(lx), Math.round(ly)); }
        if (cs.owner === realm && S.phase === 'muster' && (G.adj[c.id] || []).some(n => S.castles[n].owner !== realm && S.castles[n].owner !== 'brigands' && S.castles[n].knights.length)) { const [lx, ly] = r.w(c.pos[0] - 14, c.pos[1], 50); px.rect(g, Math.round(lx) - 3, Math.round(ly) - 4, 7, 9, '#c82a2a'); G.ui.text(g, '!', Math.round(lx) - 1, Math.round(ly) - 3, '#ffffff'); }
        const away = Object.values(S.knights).filter(k => k.quest && k.quest.from === c.id).length; if (away) { const [lx, ly] = r.w(c.pos[0] + 20, c.pos[1] + 30, 0); G.ui.text(g, away + ' away', lx, ly, '#a8c8ff', { font: 'tiny' }); }
      }
      if (this.wipe) { const k = this.wipe.t / 1.5, [mx, my] = r.w(512, 512, 0), rad = k * Math.max(r.W, r.H) * 1.2; px.blend(g, .35 * (1 - k), 'add', () => { for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; px.disc(g, mx + Math.cos(t) * rad, my + Math.sin(t) * rad * .8, 10, G.SEASON_COLOR[season]); } }); }
    });
    this.hud(r, realm);
    if (this.panel) this.panel.draw(r); else if (this.card) { if (G.run.flow[0] && G.run.flow[0] === this.card.st) this.card.draw(r); }
    this.confirm.draw(r);
    G.ui.drawToasts(r, G.ui.drawDt || 1 / 60);
    if (G.dev.open) G.devDraw(r);
  },
  hud(r, realm) {
    const R = G.run, sim = R.sim, S = sim.state, st = R.flow[0] || {}, W = r.W;
    r.overlay(g => {
      G.ui.panel(g, 4, 4, 150, 26, null);
      // the season wheel
      const cx = 17, cy = 17; G.SEASONS.forEach((s, i) => { const a0 = i * Math.PI / 2 - Math.PI * .75; for (let k = 0; k < 6; k++) { const a = a0 + k / 6 * Math.PI / 2; px.line(g, cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, i === S.si ? G.SEASON_COLOR[s] : E.mix(G.SEASON_COLOR[s], '#000000', .55)); } });
      px.disc(g, cx, cy, 3, '#d8c070');
      G.ui.text(g, sim.label(), 32, 7, G.SEASON_COLOR[sim.season()]); G.ui.text(g, { muster: 'MUSTER', march: 'MARCH', resolve: 'RESOLUTION', tidings: 'TIDINGS', over: '' }[S.phase] + (S.humans.length > 1 && realm ? ' • ' + G.get('realm', realm).short : ''), 32, 17, '#e8e0f0', { font: 'tiny' });
      if (realm && S.realms[realm]) { const Rm = S.realms[realm]; G.ui.panel(g, W - 132, 4, 128, 26, null); G.art.manaIcon(g, W - 122, 17); G.ui.text(g, Rm.mana + ' (' + (sim.income(realm) - sim.upkeep(realm) >= 0 ? '+' : '') + (sim.income(realm) - sim.upkeep(realm)) + ')', W - 114, 12, '#a8d8ff');
        if (S.candle !== null) { G.art.candle(g, W - 22, 6, S.candle, S.candleMax); G.ui.text(g, S.candle + '', W - 34, 12, S.candle <= 2 ? '#ff6a5a' : '#ffd8a0', { align: 'right' }); } }
      if (R.dev) G.ui.text(g, 'DEV', W / 2, 4, '#ff6a6a', { align: 'center' });
      // the focused castle's card
      if (!this.panel && (st.k === 'muster' || st.k === 'march')) this.castleCard(g, r, this.focus, realm);
    });
    if (!this.panel && !this.card || (this.card && G.run.flow[0] !== this.card.st && !this.panel)) {
      if (st.k === 'muster') G.ui.prompts(r, [['confirm', 'Castle'], ['info', 'Realm'], ['command', 'Commands • hold: End Muster'], ['next', 'Next castle']]);
      else if (st.k === 'march') G.ui.prompts(r, [['confirm', 'Target'], ['info', 'Realm'], ['command', 'Commands • hold: End March']]);
    }
  },
  castleCard(g, r, cid, realm) {
    const sim = G.run.sim, S = sim.state, c = G.get('castle', cid), cs = S.castles[cid], x = r.W - 150, y = 36, ks = cs.knights.slice(0, 6), h = 70 + ks.length * 12;
    G.ui.panel(g, x, y, 146, h, c.name, { border: G.realmColor(cs.owner) });
    G.art.banner(g, cs.owner, x + 130, y + 4, .8);
    G.ui.text(g, G.get('realm', cs.owner).short + (cs.stilled ? ' • STILLED' : ''), x + 7, y + 19, G.realmColor(cs.owner));
    G.art.seasonIcon(g, G.REGION_DRESS[c.region] || 'hour', x + 104, y + 23, 2.5); G.art.manaIcon(g, x + 116, y + 23); G.ui.text(g, '' + c.mana, x + 122, y + 19, '#a8d8ff');
    ks.forEach((kid, i) => { const k = sim.kn(kid); G.ui.text(g, KN(kid).short + ' Lv' + k.lvl, x + 7, y + 31 + i * 12, k.realm === realm ? '#ffffff' : '#ffc8b8'); G.ui.text(g, k.troop.length + '/6' + (k.wounded ? ' W' : '') + (k.ruler ? ' ★' : ''), x + 140, y + 31 + i * 12, '#c8c0d8', { align: 'right' }); });
    const yy = y + 33 + ks.length * 12; G.ui.text(g, 'Circle: ' + c.circle.map(e => G.get('monster', e.split(':')[0]).names[0]).slice(0, 3).join(', '), x + 7, yy, '#c8c0d8', { font: 'tiny' });
    G.ui.text(g, 'Quest: ' + G.get('site', c.site).name, x + 7, yy + 9, '#c8c0d8', { font: 'tiny' }); G.ui.text(g, 'Defense ' + Math.round(G.CampaignAI.defense(sim, cid)), x + 7, yy + 18, '#e8c8a0', { font: 'tiny' });
  }
};

/* ---- cards (Tidings reports, privacy, battle results, resolution choices) ---- */
CP.card = st => {
  const sim = G.run.sim, o = { st, t: 0 };
  const done = () => { G.flowDone(); G.game.input.consumeAll(); };
  if (st.kind === 'season') { G.sting('season_' + st.season); }
  if (st.kind === 'candle') G.sting('candle');
  o.update = dt => { o.t += dt; const I = G.game.input; if (o.t > .4 && (I.pressed('confirm') || I.clicked() || (st.auto && o.t > 1.6) || (G.autoplay && o.t > .5))) { G.sfx('ui_confirm'); done(); } if (I.down('confirm') && o.t > 1.2) while (G.run.flow[0] && G.run.flow[0].k === 'card' && ['season', 'candle', 'income', 'quest', 'battle'].includes(G.run.flow[0].kind)) G.flowDone(); };
  o.draw = r => {
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (st.kind === 'season') { const c = G.SEASON_COLOR[st.season]; px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); G.art.seasonIcon(g, st.season, W / 2, H / 2 - 50, 8); E.font.title(g, G.SEASON_NAME[st.season].toUpperCase(), W / 2, H / 2 - 24, { align: 'center', scale: 3, colors: ['#ffffff', c, E.mix(c, '#000000', .4)] }); G.ui.text(g, 'YEAR ' + st.year + ' OF THE BRIGANTIME', W / 2, H / 2 + 10, '#e8e0d0', { align: 'center' }); const tag = { spring: 'The thaw runs in the rivers. Verdance stirs.', summer: "The sun stands high. Solmark's knights grow bold.", autumn: 'The leaves turn. Amberlyn gathers its strength.', winter: "Snow on every road. Hoarfast's knights grow bold." }[st.season]; G.ui.text(g, tag, W / 2, H / 2 + 24, c, { align: 'center' }); return; }
      const w = 260, x = Math.round(W / 2 - w / 2); let y = Math.round(H / 2 - 50), title = '', lines = [];
      if (st.kind === 'candle') { title = 'THE HOUR-CANDLE'; lines = [st.n + ' season' + (st.n === 1 ? '' : 's') + ' remain' + (st.n === 1 ? 's' : '') + ' before the Thirteenth Month.']; }
      if (st.kind === 'text') { title = st.title; lines = E.font.wrap(st.text, w - 20); }
      if (st.kind === 'income') { const q = st.q; title = 'THE TREASURY OF ' + G.get('realm', st.realm).short.toUpperCase(); lines = ['Income  +' + q.income, 'Upkeep  -' + q.upkeep, 'Mana    ' + q.mana].concat(q.lost.length ? ['Deserted: ' + q.lost.join(', ')] : []); }
      if (st.kind === 'quest') { const q = st.q; title = 'A QUEST RETURNS'; lines = E.font.wrap(q.text || (KN(q.knight).short + ' returns.'), w - 50); }
      if (st.kind === 'battle') { const b = st.out; title = (G.get('realm', b.attacker).short + ' AT ' + G.get('castle', b.castle).name).toUpperCase(); lines = [(b.won ? G.get('realm', b.attacker).short + ' wins' : G.get('realm', b.defender).short + ' holds'), b.losses.length ? 'Fallen: ' + b.losses.map(l => l[1]).join(', ').slice(0, 60) : '', b.captures.length ? 'Captured: ' + b.captures.map(l => l[1]).join(', ').slice(0, 60) : '', b.wounded.length ? 'Wounded: ' + b.wounded.map(k => KN(k).short).join(', ') : '', b.levels.length ? 'Level up: ' + b.levels.map(l => l[0] + ' ' + l[1]).join(', ').slice(0, 60) : ''].filter(Boolean); }
      if (st.k === 'privacy') { const R = G.get('realm', st.realm), k = G.art.visual({ kind: 'knight', id: R.ruler }); px.rect(g, 0, 0, W, H, '#0a0812'); try { k.rig.drawPortrait(g, W / 2 - 32, H / 2 - 80, 64); } catch (e) { /* no portrait */ } E.font.title(g, (KN(R.ruler).short + "'s turn").toUpperCase(), W / 2, H / 2 - 6, { align: 'center', scale: 2, colors: ['#ffffff', R.main, E.mix(R.main, '#000', .4)] }); G.ui.text(g, 'Pass the controller.', W / 2, H / 2 + 20, '#e8e0d0', { align: 'center' }); return; }
      const h = 30 + lines.length * 11; y = Math.round(H / 2 - h / 2);
      G.ui.panel(g, x, y, w, h, title);
      if (st.kind === 'quest') { const v = G.art.visual({ kind: 'knight', id: st.q.knight }); try { v.rig.drawPortrait(g, x + 8, y + 20, 28); } catch (e) { /* no portrait */ } lines.forEach((l, i) => G.ui.text(g, l, x + 42, y + 21 + i * 11, '#ffffff')); }
      else lines.forEach((l, i) => G.ui.text(g, l, x + 10, y + 21 + i * 11, '#ffffff'));
    });
    G.ui.prompts(r, [['confirm', 'Next'], st.kind !== 'text' ? ['confirm', 'Hold: skip'] : null].filter(Boolean).slice(0, 1));
  };
  return o;
};
CP.battleChoice = st => {
  const sim = G.run.sim, a = st.a, m = a.march, S = sim.state, tgt = a.kind === 'sanctum' ? 'The Clockwork Sanctum' : G.get('castle', m.target).name;
  const defN = a.kind === 'sanctum' ? 1 : sim.defenders(m.target).length;
  const list = new G.ui.List([{ label: 'Command the battle' }, { label: 'Delegate (auto-resolve)' }]);
  const o = { st, t: 0 };
  o.update = dt => { o.t += dt; if (G.autoplay && o.t > .3) { G.flowDone(); G.scenes.campaign.fight(a, false); return; } const r = list.update(dt); if (r === 'pick') { G.flowDone(); G.game.input.consumeAll(); G.scenes.campaign.fight(a, list.i === 0); } };
  o.draw = r => { r.overlay(g => { const w = 260, h = 84, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2); G.ui.panel(g, x, y, w, h, 'TO BATTLE'); G.ui.text(g, G.get('realm', m.realm).short + ' marches on ' + tgt + ':', x + 10, y + 21, '#ffffff'); G.ui.text(g, m.knights.length + ' troop' + (m.knights.length > 1 ? 's' : '') + ' against ' + defN + '. ' + G.SEASON_NAME[sim.season()] + '.', x + 10, y + 32, '#e8c8a0'); list.draw(g, x + 10, y + 46, w - 20); }); G.ui.prompts(r, [['confirm', 'Choose']]); };
  return o;
};
