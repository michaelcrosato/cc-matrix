/* ---- DEV MODE (pause menu → Dev Mode; absent in hub sessions): tabs of tools and the live balance sliders ---- */
const DEV_TABS = ['Cheats', 'Battle', 'Campaign', 'Balance', 'View', 'Info'];
G.devState = { tab: 3, list: null, sub: null };
const humanRealm = () => G.run && G.run.sim && (G.run.sim.state.humans[0] || 'verdance');
const toast = s => G.ui.toast(s, 1.6);
G.devTrigger = (id, realm) => { const sim = G.run && G.run.sim; realm = realm || humanRealm() || 'verdance'; if (sim) { const r = sim.apply({ t: 'event', id, realm, choice: G.get('event', id).choices ? 0 : null }); if (G.scenes.campaign.afterEffects) G.scenes.campaign.afterEffects(r.out || [], realm); } G.game.go('event', { id, realm, applied: true, back: G.game.sceneName === 'event' ? 'title' : G.game.sceneName }); };
G.devJump = (season, year) => { const sim = G.run && G.run.sim; if (!sim) return; sim.state.si = Math.max(0, G.SEASONS.indexOf(season)); sim.state.year = year; G.run.flow = [{ k: 'tidings' }]; G.game.go('campaign'); };
const devRows = () => {
  const t = DEV_TABS[G.devState.tab], B = G.battle, sim = G.run && G.run.sim, R = humanRealm(), on = v => v ? 'ON' : 'OFF', mark = () => { G.dev.touched = true; if (G.run) G.run.dev = true; };
  const act = (label, fn, right) => ({ label, right, fn: () => { mark(); fn(); } });
  if (t === 'Cheats') return [
    act('God mode', () => { G.dev.god = !G.dev.god; if (B) B.sim.state.dev.god = G.dev.god; }, on(G.dev.god)), act('One-hit KOs', () => { G.dev.oneHit = !G.dev.oneHit; if (B) B.sim.state.dev.oneHit = G.dev.oneHit; }, on(G.dev.oneHit)),
    act('Infinite MP', () => { G.dev.infMP = !G.dev.infMP; if (B) B.sim.state.dev.infMP = G.dev.infMP; }, on(G.dev.infMP)), act('Free summons', () => { G.dev.freeSummon = !G.dev.freeSummon; }, on(G.dev.freeSummon)),
    act('+1000 mana', () => { if (sim) sim.state.realms[R].mana += 1000; toast('+1000 mana'); }), act('Heal all', () => { if (B) for (const u of B.sim.state.units) if (!u.out) u.hp = u.mhp; if (sim) for (const k of sim.knightsOf(R)) { k.hp = G.knightView(k).st.hp; for (const m of k.troop) sim.healMon(m); } toast('Healed'); }),
    act('Level up the selected unit +1', () => { const u = B && (B.sel || (B.cursor && B.sim.unitAt(B.cursor))); if (u) { B.sim.gainExp(u, 100, []); toast(u.name + ' Lv' + u.lvl); } else if (sim) { for (const k of sim.knightsOf(R)) G.levelUpKnight(k, sim.state.rng); toast('Every knight +1'); } }),
    act('Level up +5', () => { const u = B && (B.sel || (B.cursor && B.sim.unitAt(B.cursor))); if (u) B.sim.gainExp(u, 500, []); else if (sim) for (const k of sim.knightsOf(R)) for (let i = 0; i < 5; i++) G.levelUpKnight(k, sim.state.rng); toast('+5 levels'); }),
    { label: 'Give an item ▸', sub: () => G.all('item').map(it => act(it.name, () => { if (sim) { sim.state.realms[R].items.push(it.id); toast(it.name + ' added'); } if (B) for (const s of B.sim.state.sides) if (s.human) s.items.push(it.id); })) },
    { label: 'Add a free knight ▸', sub: () => ['lunete', 'galeron', 'blanchefleur', 'owain', 'ettard', 'hob', 'gerrow', 'dafydd', 'abbot'].map(id => act(G.get('knight', id).name, () => { if (sim && sim.addKnight(id, R)) toast(G.get('knight', id).short + ' joins'); else toast('Already in play'); })) },
    { label: 'Spawn a monster ▸', sub: () => G.all('monster').map(m => act(m.names[0], () => { if (sim) { const c = (G.campaignScene && G.campaignScene.focus) && sim.owner((G.campaignScene && G.campaignScene.focus)) === R ? (G.campaignScene && G.campaignScene.focus) : sim.capital(R); sim.state.castles[c].reserve.push(sim.newMonster(m.id, 5, 1, R)); toast(m.names[0] + ' at ' + G.get('castle', c).name); } })) },
    act('Unlock all class changes', () => { G.dev.allClasses = !G.dev.allClasses; }, on(G.dev.allClasses)), act("Reveal the AI's marches", () => { G.dev.revealAI = !G.dev.revealAI; }, on(G.dev.revealAI))];
  if (t === 'Battle') return B ? [
    act('Win now', () => { const S = B.sim.state, ps = B.playerSide === null ? 0 : B.playerSide; for (const u of S.units) if (u.side !== ps && !u.out && u.kind === 'knight') B.sim.knightOut(u, 'retreat', []); B.sim.checkWin([], false); }),
    act('Lose now', () => { const S = B.sim.state, ps = B.playerSide === null ? 0 : B.playerSide; for (const u of S.units) if (u.side === ps && !u.out && u.kind === 'knight') B.sim.knightOut(u, 'retreat', []); B.sim.checkWin([], false); }),
    act('KO the unit under the cursor', () => { const u = B.cursor && B.sim.unitAt(B.cursor); if (u) B.view.play((() => { const ev = []; B.sim.damage(u, 9999, null, ev); B.sim.checkWin(ev, false); return ev; })()); }),
    act('Next bell', () => { B.view.play((() => { const ev = []; B.sim.endBell(ev); return ev; })()); }),
    { label: 'Set the season ▸', sub: () => G.SEASONS.map(s => act(G.SEASON_NAME[s], () => { B.sim.applySeason(s); })) },
    act('AI plays my side', () => { B.allAuto = !B.allAuto; }, on(B.allAuto)), act('Delegate the rest', () => { B.allAuto = true; }),
    act('Light every Sanctum dial', () => { const S = B.sim.state; S.base.forEach((c, i) => { if (c === 'D') S.dials[i] = true; }); })] : [{ label: 'Open during a battle', disabled: true, why: 'No battle' }];
  if (t === 'Campaign') return sim ? [
    { label: 'Jump to a season ▸', sub: () => [1, 2, 3, 4].flatMap(y => G.SEASONS.map(s => act(G.SEASON_NAME[s] + ', Year ' + y, () => G.devJump(s, y)))) },
    act('Skip to the March', () => { if (sim.state.phase === 'muster') { for (const h of sim.state.humans) sim.apply({ t: 'endMuster', realm: h }); G.run.flow = [{ k: 'marchPhase' }]; } }),
    { label: 'Trigger an event ▸', sub: () => G.all('event').filter(e => e.when !== 'ending').map(e => act(e.id, () => G.devTrigger(e.id))) },
    { label: "Set the focused castle's owner ▸", sub: () => G.all('realm').map(rr => act(rr.short, () => { const c = (G.campaignScene && G.campaignScene.focus); if (c) sim.state.castles[c].owner = rr.id; })) },
    act('Run 4 AI seasons', () => { for (let i = 0; i < 4 && !sim.state.over; i++) sim.autoSeason(); G.run.flow = [{ k: 'tidings' }]; G.game.go('campaign'); }),
    act('Autoplay my realm', () => { G.autoplay = !G.autoplay; }, on(G.autoplay)),
    act('Burn the candle (-1)', () => { sim.state.candle = Math.max(0, (sim.state.candle === null ? sim.state.candleMax : sim.state.candle) - 1); }), act('Refill the candle', () => { sim.state.candle = sim.state.candleMax; }),
    { label: 'Go to an ending ▸', sub: () => [['win', 'A good ending'], ['candle', 'The candle burns out'], ['wheel', 'A rival sets the Wheel'], ['fallen', 'The last castle falls']].map(([k, l]) => act(l, () => G.game.go('ending', { kind: k, realm: k === 'wheel' ? 'solmark' : R }))) }] : [{ label: 'Open during a campaign', disabled: true, why: 'No campaign' }];
  if (t === 'Balance') return [{ label: 'Reset all to defaults', fn: () => { G.resetTune(); toast('Defaults restored'); } }].concat(G.TUNE_SPEC.map(([k, d, lo, hi, grp, label]) => ({ label: G.cap(grp).slice(0, 4) + ' • ' + label, right: (Math.round(G.tune[k] * 100) / 100) + (G.tune[k] !== d ? ' *' : ''), slider: k })));
  if (t === 'View') return [act('Hex coordinates', () => { G.dev.showCoords = !G.dev.showCoords; }, on(G.dev.showCoords)), act('Danger map', () => { G.dev.showDanger = !G.dev.showDanger; }, on(G.dev.showDanger)), act('Every Ward', () => { G.dev.showWards = !G.dev.showWards; }, on(G.dev.showWards)), act('HUD', () => { G.dev.hud = G.dev.hud === false; }, on(G.dev.hud !== false)), act('Weather', () => { G.dev.weather = !G.dev.weather; if (!G.dev.weather) G.game.weather = null; }, on(G.dev.weather)),
    { label: 'Time scale ▸', sub: () => [.25, .5, 1, 2, 4, 8].map(s => act(s + '×', () => { G.game.timeScale = s; })) }, act('The gallery', () => { G.dev.open = false; G.game.go('gallery'); }), act('Frame time readout', () => { G.game.settings.set('fps', !G.game.settings.fps); })];
  return [{ label: 'Seed: ' + (sim ? sim.state.seed : '-') }, { label: 'Build: ' + G.VERSION + ' ' + G.BUILD }, { label: 'State hash: ' + (sim ? sim.hash() : B ? B.sim.hash() : '-') }, { label: 'Errors: ' + G.game.errors.length }, act('Copy report', () => { try { const s = E.diagnose ? E.diagnose() : JSON.stringify(G.game.debug.snapshot()); if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(typeof s === 'string' ? s : JSON.stringify(s)); toast('Report copied'); } catch (e) { toast('Copy failed'); } })].concat((sim ? sim.state.chronicle.slice(-8).reverse() : []).map(c => ({ label: c.text.slice(0, 60) })));
};
G.devUpdate = dt => {
  const D = G.devState, I = G.game.input;
  if (!D.list || D.listTab !== D.tab) { D.list = new G.ui.List(devRows(), { max: 8 }); D.listTab = D.tab; D.sub = null; }
  if (I.pressed('prev') || I.pressed('next')) { D.tab = (D.tab + (I.pressed('next') ? 1 : -1) + DEV_TABS.length) % DEV_TABS.length; G.sfx('ui_move'); return; }
  const c = I.clicked(); if (c && D.tabRects) { const k = D.tabRects.findIndex(b => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h); if (k >= 0) { D.tab = k; return; } }
  const L = D.sub || D.list, cur = L.cur;
  if (cur && cur.slider) { const k = cur.slider, sp = G.TUNE_SPEC.find(s => s[0] === k), step = (sp[3] - sp[2]) / 40, held = I.down('left') || I.down('right'); D.acc = held ? (D.acc || 0) + dt : 0; const mul = D.acc > 1 ? 5 : 1;
    if (I.repeat('left', .25, .05)) { G.tune[k] = Math.max(sp[2], Math.round((G.tune[k] - step * mul) * 1000) / 1000); G.saveTune(); G.dev.touched = true; if (G.run) G.run.dev = true; L.set(devRows()); }
    if (I.repeat('right', .25, .05)) { G.tune[k] = Math.min(sp[3], Math.round((G.tune[k] + step * mul) * 1000) / 1000); G.saveTune(); G.dev.touched = true; if (G.run) G.run.dev = true; L.set(devRows()); }
    if (I.pressed('info')) { G.tune[k] = G.TUNE_DEFAULTS[k]; G.saveTune(); L.set(devRows()); }
    const p = I.pointer(); if (I.down('confirm') === false && p && G.devState.sliderRect && I.held && I.held.has('Mouse0')) { const b = G.devState.sliderRect; if (p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y - 4 && p[1] <= b.y + 8) { G.tune[k] = Math.round((sp[2] + (sp[3] - sp[2]) * (p[0] - b.x) / b.w) * 1000) / 1000; G.saveTune(); L.set(devRows()); } }
  }
  const r = L.update(dt);
  if (r === 'back' || I.pressed('pause')) { if (D.sub) D.sub = null; else { G.dev.open = false; I.consumeAll(); } return; }
  if (r === 'pick' && cur) { if (cur.sub) { D.sub = new G.ui.List(cur.sub(), { max: 8 }); } else if (cur.fn) { cur.fn(); if (!D.sub) L.set(devRows()); else { D.sub = null; D.list.set(devRows()); } } }
};
G.devDraw = r => {
  const D = G.devState; if (!D.list) return;
  r.overlay(g => {
    const w = Math.min(r.W - 20, 380), h = Math.min(r.H - 30, 190), x = Math.round(r.W / 2 - w / 2), y = 14;
    G.ui.panel(g, x, y, w, h, 'DEV MODE', { border: '#ff6a6a', alpha: .95 });
    D.tabRects = []; DEV_TABS.forEach((t, i) => { const tx = x + 60 + i * 52; D.tabRects.push({ x: tx - 2, y: y + 3, w: 50, h: 11 }); if (i === D.tab) px.rect(g, tx - 2, y + 3, 50, 11, '#5a2a3a'); G.ui.text(g, t, tx + 23, y + 5, i === D.tab ? '#ffe070' : '#a8a0c0', { align: 'center' }); });
    const L = D.sub || D.list; L.draw(g, x + 6, y + 20, w - 12);
    const cur = L.cur; if (cur && cur.slider) { const sp = G.TUNE_SPEC.find(s => s[0] === cur.slider), bx = x + 20, by = y + h - 16, bw = w - 40; D.sliderRect = { x: bx, y: by, w: bw }; px.rect(g, bx, by, bw, 3, '#3a3448'); const f = (G.tune[cur.slider] - sp[2]) / (sp[3] - sp[2]); px.rect(g, bx, by, Math.round(bw * f), 3, '#ffd060'); px.rect(g, bx + Math.round(bw * f) - 2, by - 3, 4, 9, '#ffffff'); G.ui.text(g, sp[2] + '', bx, by + 5, '#a8a0c0', { font: 'tiny' }); G.ui.text(g, sp[3] + '', bx + bw, by + 5, '#a8a0c0', { align: 'right', font: 'tiny' }); G.ui.text(g, 'default ' + sp[1], bx + bw / 2, by + 5, '#a8a0c0', { align: 'center', font: 'tiny' }); }
    if (L.whyLine) G.ui.text(g, L.whyLine, x + w / 2, y + h - 10, '#ffb0a0', { align: 'center', font: 'tiny' });
  });
  const cur = (D.sub || D.list).cur;
  G.ui.prompts(r, cur && cur.slider ? [['left', 'Adjust (hold: faster)'], ['info', 'Reset'], ['next', 'Tab'], ['cancel', 'Close']] : [['confirm', 'Use'], ['next', 'Tab'], ['cancel', 'Close']]);
};
// the gallery: every species in all three forms, cycling actions (dev, #gallery)
G.scenes.gallery = {
  view: 'board', views: ['board', 'iso', 'threequarter', 'side'], res: 'ps1', input: G.INPUT, touch: [], camera: { zoom: [.7, 2.5], start: 1.6 },
  enter() { this.i = 0; this.t = 0; this.make(); },
  make() { const m = G.all('monster')[this.i]; this.vis = [1, 2, 3].map(t => G.art.visual({ kind: 'monster', sp: m.id, tier: t })); this.knights = G.all('knight').slice((this.i * 2) % 36, (this.i * 2) % 36 + 2).map(k => G.art.visual({ kind: 'knight', id: k.id })); },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (I.pressed('right') || I.pressed('next')) { this.i = (this.i + 1) % G.all('monster').length; this.make(); } if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + G.all('monster').length - 1) % G.all('monster').length; this.make(); }
    if (I.pressed('view')) G.game.nextView(); if (I.pressed('cancel')) { G.game.go('title'); return; }
    const acts = ['attack', 'cast', 'hurt', 'attack', 'cheer'], k = Math.floor(this.t / 1.4) % (acts.length + 1);
    if (this.lastK !== k) { this.lastK = k; for (const v of this.vis.concat(this.knights)) if (k < acts.length) v.act(acts[k], { move: v.mode === 'beast' ? ['bite', 'breath', 'claw', 'tailsweep', 'roar'][this.i % 5] : 'slash' }); }
    const walk = k === acts.length;
    this.vis.forEach((v, j) => v.update(dt, { x: 60 + j * 50 + (walk ? Math.sin(this.t * 2) * 10 : 0), y: 80, z: 0, vx: walk ? Math.cos(this.t * 2) * 20 : 0, vy: 0, facing: walk ? (Math.cos(this.t * 2) > 0 ? 0 : Math.PI) : Math.PI / 2 }));
    this.knights.forEach((v, j) => v.update(dt, { x: 90 + j * 60, y: 140, z: 0, facing: Math.PI / 2 }));
    G.game.focus(110, 100, 0);
  },
  draw(r) {
    r.sky(['#1a2030', '#2a3a50']); r.decal(g => { for (let y = 40; y < 180; y += 20) for (let x = 20; x < 220; x += 20) { const p = r.w(x, y, 0); px.dot(g, p[0], p[1], '#3a4a60'); } });
    this.vis.forEach((v, j) => { const x = 60 + j * 50; r.shadow(x, 80, 8, .4); r.actor(v.x || x, 80, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)); });
    this.knights.forEach((v, j) => r.actor(90 + j * 60, 140, 0, (g, ox, oy) => v.draw(g, ox, oy, r.view)));
    const m = G.all('monster')[this.i]; r.overlay(g => { G.ui.text(g, 'GALLERY ' + (this.i + 1) + '/30: ' + m.names.join(' > '), 6, 6, '#ffe8a8'); G.ui.text(g, 'View: ' + G.game.view.label, 6, 16, '#c8c0d8'); });
    G.ui.prompts(r, [['left', 'Species'], ['view', 'View'], ['cancel', 'Title']]);
  }
};
