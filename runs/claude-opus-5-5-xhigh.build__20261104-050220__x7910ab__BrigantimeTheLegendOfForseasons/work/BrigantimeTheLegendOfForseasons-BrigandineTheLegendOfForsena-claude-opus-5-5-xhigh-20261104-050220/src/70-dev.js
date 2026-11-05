// DEV MODE (pause menu > Dev Mode; absent in hub sessions): a full-screen panel with tabs (L1 / R1 or a click):
// Cheats, Battle, Campaign, Balance (a live slider for every tunable, grouped; left / right adjusts, hold to speed up,
// the mouse drags the bar, Triangle / I resets one, "Reset all to defaults" at the top), View, Info. Anything touched
// marks the campaign DEV. Also the gallery scene (#gallery): every species in all three forms, every class's moves.

const DU = G.UI, DXP = E.px;
const D = G.Dev = { open: false, tab: 0, list: new DU.List({ rows: 12 }), hold: 0, log: [] };
G.cheats = { god: false, ohko: false, mp: false };
const TABS = ['Cheats', 'Battle', 'Campaign', 'Balance', 'View', 'Info'];
D.toggle = on => { D.open = on === undefined ? !D.open : on; if (D.open) { G.game.resume && G.game.resume(); G.game.input.consumeAll(); D.list.index = 0; } };
const inBattle = () => G.game.sceneName === 'battle' && G.Battle.sim;
const camp = () => G.Camp.sim;
const markDev = () => { if (camp()) camp().s.dev = true; };
const campDev = (op, o = {}) => { const sim = camp(); if (!sim) { DU.toast('No campaign running', DU.COL.bad); return; } markDev(); sim.apply(Object.assign({ t: 'dev', op, realm: sim.currentHuman() || sim.s.humans[0] }, o)); DU.toast('Done: ' + op, '#7ae07a', 1.2); };
const battleCmd = cmd => { if (!inBattle()) { DU.toast('No battle running', DU.COL.bad); return; } markDev(); G.Battle.apply(cmd); };
const selUnit = () => { const B = G.Battle; if (!inBattle()) return null; return B.sel ? B.sim.unit(B.sel) : B.cursor ? B.sim.at(B.cursor) : null; };
const pickFrom = (title, opts, fn) => { D.sub = { title, rows: opts.map(o => ({ label: o.label || o, act: () => { fn(o.value === undefined ? o : o.value); D.sub = null; } })), list: new DU.List({ rows: 12 }) }; };
function rows() {
  const sim = camp(), B = G.Battle;
  switch (TABS[D.tab]) {
    case 'Cheats': return [
      { label: 'God mode (your units take no damage)', value: G.cheats.god ? 'ON' : 'off', act: () => { G.cheats.god = !G.cheats.god; markDev(); } },
      { label: 'One-hit KOs', value: G.cheats.ohko ? 'ON' : 'off', act: () => { G.cheats.ohko = !G.cheats.ohko; markDev(); } },
      { label: 'Infinite MP', value: G.cheats.mp ? 'ON' : 'off', act: () => { G.cheats.mp = !G.cheats.mp; markDev(); } },
      { label: 'Free summons', value: sim && sim.s.flags.devFreeSummon ? 'ON' : 'off', act: () => campDev('freeSummon') },
      { label: '+1000 mana', act: () => campDev('mana', { amt: 1000 }) },
      { label: 'Heal all (wounds too)', act: () => { campDev('heal'); if (inBattle()) for (const u of B.sim.field()) if (B.sim.s.sides[u.side].human) u.hp = u.mhp; } },
      { label: 'Level up the selected unit +1', act: () => levelSel(1) },
      { label: 'Level up the selected unit +5', act: () => levelSel(5) },
      { label: 'Give an item...', act: () => pickFrom('Give an item', G.all('item').map(i => ({ label: i.name, value: i.id })), id => campDev('item', { item: id })) },
      { label: 'Add a free knight...', act: () => pickFrom('Add a knight', G.all('knight').filter(k => k.free || k.realm === 'brigands').map(k => ({ label: k.short, value: k.id })), id => campDev('knight', { knight: id })) },
      { label: 'Spawn a monster at the focused castle...', act: () => pickFrom('Spawn a monster', G.all('monster').map(m => ({ label: m.names[0], value: m.id })), sp => campDev('spawn', { sp, castle: G.Camp.focus })) },
      { label: 'Unlock all class changes', value: sim && sim.s.flags.devUnlockClass ? 'ON' : 'off', act: () => campDev('unlockClass') },
      { label: 'Reveal the AI\'s planned marches', act: () => revealMarches() }];
    case 'Battle': return [
      { label: 'Win now', act: () => { if (inBattle()) battleCmd({ t: 'win', side: B.ctx.playerSide || 0 }); } },
      { label: 'Lose now', act: () => { if (inBattle()) battleCmd({ t: 'win', side: (B.ctx.playerSide || 0) === 0 ? 1 : 0 }); } },
      { label: 'KO the selected unit', act: () => { const u = selUnit(); if (u) battleCmd({ t: 'ko', u: u.id }); else DU.toast('Point the cursor at a unit', DU.COL.bad); } },
      { label: 'Set the bell', value: inBattle() ? B.sim.s.bell : '-', change: d => { if (inBattle()) battleCmd({ t: 'bell', n: B.sim.s.bell + d }); } },
      { label: 'Set the season (terrain re-applies)', value: inBattle() ? B.sim.s.season : '-', change: d => { if (inBattle()) { const i = G.SEASONS.indexOf(B.sim.s.season); battleCmd({ t: 'season', s: G.SEASONS[(i + 4 + d) % 4] }); } } },
      { label: 'AI plays your side (autoplay)', value: inBattle() && B.delegated.all ? 'ON' : 'off', act: () => { if (inBattle()) { B.delegated.all = !B.delegated.all; markDev(); } } },
      { label: 'Delegate the rest of the battle (instant)', act: () => { if (inBattle()) { markDev(); G.BattleAI.resolve(B.sim); B.q = []; } } },
      { label: 'Light all Sanctum dials', act: () => battleCmd({ t: 'dials' }) }];
    case 'Campaign': return [
      { label: 'Jump to season', value: sim ? G.SEASON_NAME[sim.season] + ' Y' + sim.year : '-', change: d => { if (sim) { campDev('jump', { turn: Math.max(0, sim.s.turn + d) }); } } },
      { label: 'Skip to Muster', act: () => { if (sim && sim.s.phase === 'tidings') { markDev(); G.Camp.todo = [{ k: 'tidings' }]; } } },
      { label: 'Skip to March (end Muster)', act: () => { if (sim && sim.s.phase === 'muster') { markDev(); sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); G.Camp.todo.push({ k: 'privacy', realm: sim.currentHuman(), then: sim.s.phase }); } } },
      { label: 'Trigger an event...', act: () => pickFrom('Trigger an event', G.all('event').map(e => ({ label: e.id, value: e.id })), id => { campDev('trigger', { id }); if (sim) G.Camp.todo.unshift({ k: 'takeStory' }); }) },
      { label: 'Set the focused castle\'s owner', value: sim && G.Camp.focus ? sim.s.castles[G.Camp.focus].owner : '-', change: d => { if (sim) { const i = G.REALMS.indexOf(sim.s.castles[G.Camp.focus].owner); campDev('owner', { castle: G.Camp.focus, owner: G.REALMS[(i + 6 + d) % 6] }); G.Camp.wm.update(sim, sim.season); } } },
      { label: 'Run 4 AI seasons (your realm on autoplay)', act: () => { if (sim) { markDev(); for (let i = 0; i < 4 && !sim.s.result; i++) G.CampaignAI.playSeason(sim, { choice: () => 0 }); G.Camp.todo = sim.s.result ? [] : [{ k: 'tidings' }]; G.Camp.wm.update(sim, sim.season); } } },
      { label: 'Autoplay your realm', value: G.autoplayOn ? 'ON' : 'off', act: () => { G.autoplayOn = !G.autoplayOn; markDev(); } },
      { label: 'Burn the candle', act: () => { if (sim) campDev('candle', { value: Math.max(0, (sim.s.candle === null ? 12 : sim.s.candle) - 1) }); } },
      { label: 'Refill the candle', act: () => { if (sim) campDev('candle', { value: G.DIFF[sim.s.difficulty].candle }); } },
      { label: 'Go to an ending...', act: () => pickFrom('Go to an ending', G.all('event').filter(e => e.ending).map(e => ({ label: e.id, value: e.id })), id => { if (sim) { campDev('ending', { ending: id }); D.toggle(false); G.goEnding(sim); } }) }];
    case 'Balance': {
      const out = [{ label: 'RESET ALL TO DEFAULTS', color: '#ffe080', act: () => { G.resetTune(); saveTune(); DU.toast('Every tunable is back to its default', '#7ae07a'); } }];
      let grp = null;
      for (const [k, [min, max, step, group, label]] of Object.entries(G.TUNE_RANGES)) {
        if (group !== grp) { grp = group; out.push({ label: '- ' + group + ' -', heading: true, disabled: 'A heading' }); }
        const v = G.tune[k], def = G.TUNE_DEFAULTS[k];
        out.push({ label, key: k, slider: true, min, max, step, value: (Math.abs(v) < 10 && step < 1 ? v.toFixed(2) : v) + (v !== def ? ' *' : ''), change: d => { G.setTune(k, Math.round((G.tune[k] + d * step * (D.hold > .8 ? 5 : 1)) / step) * step); saveTune(); markDev(); }, reset: () => { G.setTune(k, def); saveTune(); } });
      }
      return out;
    }
    case 'View': return [
      { label: 'Hex coordinates', value: D.coords ? 'ON' : 'off', act: () => { D.coords = !D.coords; } },
      { label: "The AI's danger map", value: inBattle() && B.danger ? 'ON' : 'off', act: () => { if (inBattle()) B.danger = !B.danger; } },
      { label: "The AI's top 3 plans for the selected unit", value: D.plans ? 'ON' : 'off', act: () => { D.plans = !D.plans; } },
      { label: 'Free camera (right stick / middle drag)', value: G.Camp.free ? 'ON' : 'off', act: () => { G.Camp.free = !G.Camp.free; } },
      { label: 'HUD', value: D.noHud ? 'off' : 'ON', act: () => { D.noHud = !D.noHud; } },
      { label: 'Weather', value: G.game.weather ? 'ON' : 'off', act: () => { if (G.game.weather) { D.savedWx = G.game.weather; G.game.weather = null; if (inBattle()) B.noWeather = true; } else { G.game.weather = D.savedWx || { kind: 'snow', amount: .5 }; if (inBattle()) B.noWeather = false; } } },
      { label: 'Time scale', value: G.game.timeScale.toFixed(2) + 'x', change: d => { const v = [.25, .5, 1, 2, 4, 8], i = v.indexOf(G.game.timeScale); G.game.timeScale = v[G.clamp((i < 0 ? 2 : i) + d, 0, v.length - 1)]; } },
      { label: 'Gallery of every species and move', act: () => { D.toggle(false); G.game.go('gallery'); } },
      { label: 'Frame-time readout', value: G.game.settings.showFps ? 'ON' : 'off', act: () => G.game.settings.set('showFps', !G.game.settings.showFps) }];
    case 'Info': {
      const s2 = inBattle() ? B.sim : camp();
      return [
        { label: 'Seed', value: s2 ? s2.s.seed || s2.s.rs : '-' }, { label: 'Build', value: G.VERSION + ' • ' + G.BUILD }, { label: 'State hash', value: s2 ? s2.hash() : '-' },
        { label: 'Errors', value: G.game.errors.length },
        { label: 'Last sim events', value: s2 && s2.s.log ? s2.s.log.slice(-6).join(' ') : (s2 ? s2.s.chronicle.slice(-1).map(c => c.text).join('') : '-') },
        { label: 'Copy report (E.diagnose)', act: () => { try { const rep = E.diagnose(); const txt = (rep && rep.text) || String(rep); if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {}); DU.toast('Report copied', '#7ae07a'); } catch (e) { DU.toast('Could not copy', DU.COL.bad); } } }];
    }
  }
  return [];
}
function levelSel(n) {
  const u = selUnit();
  if (u) { markDev(); const ev = []; for (let i = 0; i < n; i++) G.Battle.sim._levelUp(u, ev); G.Battle.queue(ev); return; }
  const sim = camp(); if (!sim) return;
  const c = sim.s.castles[G.Camp.focus], kid = c && c.knights[0]; if (kid) campDev('level', { knight: kid, n }); else DU.toast('Focus a castle with a knight', DU.COL.bad);
}
function revealMarches() {
  const sim = camp(); if (!sim) return;
  const copy = G.CampaignSim.load(sim.serialize()), out = [];
  for (const r of G.REALMS) if (!copy.isHuman(r) && copy.s.realms[r].alive && r !== 'brigands') G.CampaignAI.march(copy, r);
  for (const m of copy.s.marches) out.push(G.get('realm', m.realm).short + ' -> ' + (m.target === 'sanctum' ? 'Sanctum' : G.get('castle', m.target).name) + ' (' + m.knights.length + ')');
  D.sub = { title: 'The AI would march', rows: out.length ? out.map(l => ({ label: l })) : [{ label: 'No marches planned' }], list: new DU.List({ rows: 12 }) };
  markDev();
}
const saveTune = () => { try { E.store.set('brigantime:tune', G.tune); } catch (e) { /* storage blocked */ } };
G.loadTune = () => { try { const t = E.store.get('brigantime:tune', null); if (t) for (const k of Object.keys(G.TUNE_DEFAULTS)) if (typeof t[k] === 'number') G.tune[k] = t[k]; } catch (e) { /* storage blocked */ } };
D.update = dt => {
  const inp = G.inp();
  if (D.sub) { const res = D.sub.list.update(D.sub.rows); if (res === 'pick' && D.sub.list.sel && D.sub.list.sel.act) D.sub.list.sel.act(); else if (res === 'back') D.sub = null; return; }
  if (G.pressed('next')) { D.tab = (D.tab + 1) % TABS.length; D.list.index = 0; G.sfx('ui_move'); }
  if (G.pressed('prev')) { D.tab = (D.tab + TABS.length - 1) % TABS.length; D.list.index = 0; G.sfx('ui_move'); }
  const c = inp.clicked && inp.clicked(); if (c && D.tabs) { const i = D.tabs.findIndex(t => c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h); if (i >= 0) { D.tab = i; D.list.index = 0; return; } }
  const rs = rows(), row = rs[D.list.index];
  if (inp.down('left') || inp.down('right')) D.hold += dt; else D.hold = 0;
  if (row && row.change) { if (G.repeat('left')) row.change(-1); if (G.repeat('right')) row.change(1); }
  // the mouse drags a slider's bar
  if (row && row.slider && inp.down('confirm') && inp.lastDevice === 'mouse' && D.bar) { const p = inp.pointer(); if (p && p[1] >= D.bar.y - 3 && p[1] <= D.bar.y + 8) { const f = G.clamp((p[0] - D.bar.x) / D.bar.w, 0, 1); G.setTune(row.key, Math.round((row.min + f * (row.max - row.min)) / row.step) * row.step); saveTune(); markDev(); return; } }
  if (inp.pressed('info') && row && row.reset) { row.reset(); G.sfx('ui_cancel'); return; }
  const res = D.list.update(rs.map(r2 => ({ label: r2.label, right: r2.value === undefined ? '' : String(r2.value) })));
  if (res === 'pick' && row && row.act) { G.sfx('ui_confirm'); row.act(); }
  if (res === 'back') { D.toggle(false); G.sfx('ui_cancel'); }
};
D.draw = r => {
  r.overlay(g => {
    const k = DU.k(), W = r.W, H = r.H;
    DXP.rect(g, 0, 0, W, H, '#07060d');
    DU.text(g, 'DEV MODE', 8, 6, '#ff8a3a'); if (camp() && camp().s.dev) DU.text(g, 'campaign marked DEV', W - 8, 6, '#ff8a3a', { align: 'right' });
    D.tabs = TABS.map((t, i) => ({ x: 6 + i * Math.floor((W - 12) / TABS.length), y: 18, w: Math.floor((W - 12) / TABS.length) - 2, h: 12 * k }));
    TABS.forEach((t, i) => { const tb = D.tabs[i]; DXP.rect(g, tb.x, tb.y, tb.w, tb.h, i === D.tab ? '#2e3a78' : '#1a1e40'); DU.text(g, t, tb.x + tb.w / 2, tb.y + 2, i === D.tab ? DU.COL.focus : '#c8c8d8', { align: 'center' }); });
    const rs = rows(), y0 = 36 * k;
    D.list.layout(rs.map(r2 => ({ label: r2.label, right: r2.value === undefined ? (r2.act ? '>' : '') : String(r2.value), color: r2.color || (r2.heading ? '#8a86a0' : null), disabled: false })), 12, y0, W - 24);
    D.list.draw(g, G.game.real);
    const row = rs[D.list.index];
    if (row && row.slider) { const bw = 120 * k, bx = W - 24 - bw - 70 * k, it = D.list.items[D.list.index - D.list.top]; if (it) { D.bar = { x: bx, y: it.y + 2, w: bw }; DU.bar(g, bx, it.y + 2, bw, 6, (G.tune[row.key] - row.min) / (row.max - row.min), '#ff8a3a'); } }
    if (D.sub) { const w = 220 * k, x = Math.round((W - w) / 2); D.sub.list.layout(D.sub.rows, x + 6, 50, w - 12); DU.box(g, x, 34, w, D.sub.list.h + 24, { alpha: .98 }); DU.text(g, D.sub.title, x + 6, 38, DU.COL.gold); D.sub.list.draw(g, G.game.real); }
  });
  DU.prompts(r, [['next', 'Tab'], ['up', 'Choose'], ['left', 'Adjust'], ['info', 'Reset one'], ['confirm', 'Select'], ['cancel', 'Close']]);
};
/** dev overlays in the battle: hex coordinates and the AI's top plans */
D.battleOverlay = r => {
  const B = G.Battle; if (!B.sim) return;
  if (D.coords) r.overlay(g => { for (let y = 0; y < B.sim.s.h; y++) for (let x = 0; x < B.sim.s.w; x++) { const [wx, wy] = B.field.center([x, y]), q = r.w(wx, wy, 0); E.font.text(g, x + ',' + y, q[0], q[1] - 3, '#ffffff', { font: 'tiny', align: 'center' }); } });
  if (D.plans) { const u = selUnit(); if (u && B.sim.activeTroop() && u.troop === B.sim.activeTroop().id) { const p = G.BattleAI.planUnit(B.sim, u, { level: 'normal' }); r.overlay(g => DU.text(g, 'AI: ' + (p.move ? 'move ' + p.move.join(',') + ' then ' : '') + (p.act.a ? p.act.a + ' at ' + p.act.at.join(',') : p.act) + ' (' + Math.round(p.score) + ')', 8, 44, '#ff8a3a')); } }
};

/* ---- the gallery: every species x form x action, and every class's moves ---- */
const GL = { t: 0, i: 0 };
G.SCENES.gallery = {
  view: 'board', input: G.PRESET, camera: { zoom: [.6, 2.5], start: .8 },
  enter() {
    GL.t = 0; GL.items = [];
    for (const m of G.all('monster')) for (let f = 1; f <= 3; f++) GL.items.push({ label: G.monsterName(m.id, f), vis: new G.Vis({ kind: 'monster', sp: m.id, form: f }) });
    for (const k of G.all('knight')) GL.items.push({ label: k.short + ' (' + G.get('class', k.cls).name + ')', vis: new G.Vis({ kind: 'knight', ref: k.id, cls: k.cls }) });
    GL.page = 0; G.game.lights.enabled = true; G.game.lights.ambient = .85; G.game.cam.bounds = null;
    GL.map = new E.TileMap({ w: 30, h: 12, floorTex: (x, y) => E.tex.grass(x, y), ao: 0 });
  },
  update(dt) {
    G.inputTick(dt); GL.t += dt;
    if (G.repeat('right') || G.pressed('next')) GL.page = Math.min(Math.ceil(GL.items.length / 6) - 1, GL.page + 1);
    if (G.repeat('left') || G.pressed('prev')) GL.page = Math.max(0, GL.page - 1);
    if (G.inp().pressed('cancel')) G.game.go('title');
    const acts = ['bite', 'claw', 'breath', 'roar', 'pounce', 'tailsweep', 'slash', 'cast', 'overhead', 'thrust'];
    GL.items.slice(GL.page * 6, GL.page * 6 + 6).forEach((it, i) => { const k = (GL.t * .6 + i * .17) % 2, act = k < 1 ? { move: it.vis.kind === 'humanoid' ? it.vis.moves.basic : acts[Math.floor(GL.t / 2 + i) % 6], k } : null; it.vis.update(dt, { x: 60 + (i % 3) * 120, y: 60 + Math.floor(i / 3) * 80, z: 0, vx: k > 1.4 ? 30 : 0, vy: 0, facing: Math.PI / 2 + Math.sin(GL.t * .4) * 1.2, act }); });
    G.game.focus(180, 100, 20);
  },
  draw(r) {
    GL.map.drawFloor(r);
    GL.items.slice(GL.page * 6, GL.page * 6 + 6).forEach((it, i) => { const x = 60 + (i % 3) * 120, y = 60 + Math.floor(i / 3) * 80; r.shadow(x, y, 8); r.actor(x, y, 0, (g, ox, oy) => it.vis.draw(g, ox, oy, r.view)); r.textAt(x, y + 14, 0, it.label, '#ffffff'); });
    r.overlay(g => DU.text(g, 'GALLERY ' + (GL.page + 1) + '/' + Math.ceil(GL.items.length / 6), 8, 6, '#ff8a3a'));
    DU.prompts(r, [['left', 'Page'], ['cancel', 'Title']]);
  }
};
