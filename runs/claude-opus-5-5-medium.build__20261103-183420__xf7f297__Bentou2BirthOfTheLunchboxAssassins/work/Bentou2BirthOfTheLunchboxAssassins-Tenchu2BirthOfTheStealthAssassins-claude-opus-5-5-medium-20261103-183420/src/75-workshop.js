/* 75-workshop: the Mission Editor. It edits the exact level JSON the campaign uses: terrain, buildings, props, lights,
 * actors with patrol routes, items and settings; validates (start, exit, a target or a boss, all reachable); test-plays;
 * saves to three slots; exports and imports JSON. Pad: stick cursor, L1/R1 category, L2/R2 brush, ✕ paint, ○ erase,
 * □ pick / select, △ rotate, Create test, Options menu. Mouse and keys: hover, click paints, right click erases,
 * middle drag pans, wheel brush, Tab category, 1-9 brush, Q/E rotate, F5 test, Esc menu. */
const WS_CATS = {
  Ground: Object.keys(B.FLOORS).map(ch => ({ id: ch, name: B.FLOORS[ch][1], kind: 'cell' })),
  Walls: ['#', 'W', 'F', 'H'].map(ch => ({ id: ch, name: B.WALLS[ch].name, kind: 'cell' })),
  Buildings: ['A', 'B', 'C', 'D', 'S', 'T', 'G', 'K', 'M', 'P', 'R'].map(ch => ({ id: ch, name: B.WALLS[ch].name, kind: 'cell' })),
  Props: ['stoneLantern', 'chochin', 'torii', 'bambooClump', 'sakeBarrel', 'riceBale', 'jubako', 'yatai', 'weaponRack', 'mato', 'taiko', 'well', 'waterBarrel', 'boat', 'bargeRice', 'moorPost', 'cage', 'nobori', 'dummy', 'persimmon', 'strawMat', 'steppingStone'].map(id => ({ id, name: E.SHAPES[id] ? E.SHAPES[id].about : id, kind: 'prop' })),
  Lights: [{ id: 'stoneLantern', name: 'Stone lantern', kind: 'light' }, { id: 'chochin', name: 'Paper lantern', kind: 'light' }, { id: 'torch', name: 'Torch', kind: 'light' }, { id: 'brazier', name: 'Brazier', kind: 'light' }],
  Actors: [{ id: 'hero', name: 'Hero start', kind: 'actor' }, { id: 'exit', name: 'Exit', kind: 'actor' }, { id: 'target', name: 'Target (merchant)', kind: 'actor' }, ...SPAWN_TYPES.map(t => ({ id: t, name: get('enemy', t).label, kind: 'actor' })),
    { id: 'merchant', name: 'Civilian merchant', kind: 'actor' }, { id: 'maid', name: 'Civilian maid', kind: 'actor' }, { id: 'monk', name: 'Civilian monk', kind: 'actor' }, { id: 'disguised', name: 'Disguised Red Lantern', kind: 'actor' },
    { id: 'gonroku', name: 'Boss: Gonroku', kind: 'actor' }, { id: 'hotaru', name: 'Boss: Hotaru', kind: 'actor' }, { id: 'kurogane', name: 'Boss: Kurogane', kind: 'actor' }, { id: 'bell', name: 'Alarm bell', kind: 'actor' }, { id: 'barracks', name: 'Barracks door', kind: 'actor' }],
  Routes: [{ id: 'route', name: 'Waypoint (select a guard with pick first)', kind: 'route' }],
  Items: [...B.TOOL_ORDER.map(t => ({ id: t, name: get('tool', t).name, kind: 'item' })), { id: 'scroll', name: 'The scroll (optional objective)', kind: 'item' }],
  Settings: [{ id: 'settings', name: 'Name, size, time, par, music', kind: 'settings' }]
};
const WS_CAT_NAMES = Object.keys(WS_CATS);
B.WS = { blank(n = 40) { return { id: 'workshop', name: 'My Mission', size: [n, n], time: 'night', faction: 'kanemori', music: 'm1', weather: null, par: 400, rows: R(n, n, '.', [['box', 0, 0, n - 1, n - 1, '#']]), lights: [], props: [], anchors: [], hero: { at: [3, n - 3], facing: 270 }, exit: null, guards: [], civilians: [], pickups: [], bells: [], barracks: [], objectives: [], triggers: [], zones: [] }; } };
B.WS.generate = spec => {
  const s = JSON.parse(JSON.stringify(spec)), ob = []; s.id = 'workshop';
  const tgt = (s.civilians || []).find(c => c.type === 'target');
  if (tgt) ob.push({ id: 'kill', type: 'assassinate', target: tgt.id, text: 'Silence the target' });
  if (s.boss) ob.push({ id: 'boss', type: 'defeat', boss: s.boss.id, text: 'Defeat ' + get('boss', s.boss.id).name });
  if ((s.pickups || []).some(p => p.kind === 'story')) ob.push({ id: 'scroll', type: 'retrieve', pickup: 'scroll', optional: true, text: 'Optional: steal the scroll' });
  if (s.exit) ob.push({ id: 'escape', type: 'reach', exit: true, text: 'Escape', hidden: true, after: ob.filter(o => !o.optional).map(o => o.id) });
  s.objectives = ob; s.triggers = s.boss ? [{ id: 'bossT', at: s.boss.at, r: 4, do: [['boss', s.boss.id]] }] : [];
  return s;
};
B.WS.validate = spec => {
  const out = [];
  if (!spec.hero) out.push({ msg: 'There is no hero start.', at: null }); if (!spec.exit) out.push({ msg: 'There is no exit.', at: null });
  const tgt = (spec.civilians || []).find(c => c.type === 'target'); if (!tgt && !spec.boss) out.push({ msg: 'Place a target or a boss.', at: null });
  if (spec.hero) {
    const W = new World(spec), f = new E.FlowField(W.map, { climb: 30, drop: 56, jump: 60 }), hs = spec.hero.at; f.update(cc(hs[0]), cc(hs[1]));
    const reach = at => { if (!at) return true; const x = cc(at[0]), y = cc(at[1]); if (Math.hypot(x - cc(hs[0]), y - cc(hs[1])) < 20) return true; const nx = f.next(x, y); return !!nx; };
    if (spec.exit && !reach(spec.exit.at)) out.push({ msg: 'The exit cannot be reached from the start.', at: spec.exit.at });
    if (tgt && !reach(tgt.at)) out.push({ msg: 'The target cannot be reached from the start.', at: tgt.at });
    if (spec.boss && !reach(spec.boss.at)) out.push({ msg: 'The boss cannot be reached from the start.', at: spec.boss.at });
  }
  return out;
};
B.WS.slotKey = i => 'bentou:workshop:' + i;
B.scenes.workshop = {
  view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.6, 2], start: 1, rotate: true, wheel: false },
  enter(d) {
    d = d || {}; const G = B.game; G.lights.enabled = true; G.lights.ambient = .6; G.weather = null; B.music.play('shop'); G.timeScale = 1;
    if (d.keep && B.wsState) this.spec = B.wsState.spec; else if (d.spec) this.spec = JSON.parse(JSON.stringify(d.spec)); else this.spec = null;
    this.cat = 0; this.brush = 0; this.cx = 5; this.cy = 5; this.face = 0; this.sel = null; this.prev = new Set(); this.wait = [0, 1, 2, 4]; this.problems = [];
    if (this.spec) this.load(this.spec); else this.startMenu();
  },
  exit() { B.game.lights.enabled = false; this.closeText(); },
  load(spec) { this.spec = spec; this.world = new World(spec); B.wsState = { spec }; const G = B.game; G.cam.bounds = v => this.world.map.bounds(v); if (spec.hero) { this.cx = spec.hero.at[0]; this.cy = spec.hero.at[1]; } G.cam.snap = true; this.dirty = false; },
  rebuild() { this.world = new World(this.spec); this.dirty = false; },
  startMenu() {
    const slots = [1, 2, 3].map(i => { const s = E.store.get(B.WS.slotKey(i), null); return [s ? 'Slot ' + i + ': ' + s.name : 'Slot ' + i + ': empty', () => { if (s) { B.ui.hide(); this.load(s); } else { B.ui.hide(); this.load(B.WS.blank(40)); this.slot = i; } }]; });
    B.ui.show('wsStart', { kicker: 'Workshop', title: 'The Mission Editor', text: 'Build a night of your own on the same maps the story uses. Pick a slot, or start from a template.',
      actions: [...slots, ['New: blank 40 x 40', () => { B.ui.hide(); this.load(B.WS.blank(40)); }], ['New: copy a campaign level', () => B.ui.show('wsCopy', { title: 'Copy which level?', actions: ['training', 'm1', 'm2', 'm3', 'delivery'].map(id => [get('level', id).name, () => { B.ui.hide(); this.load(Object.assign(B.levelSpec(id), { id: 'workshop' })); }]).concat([['Back', () => B.ui.back()]]) })],
        ['Back to the title', () => { B.ui.hide(); B.game.go('title'); }]], back: () => { B.ui.hide(); B.game.go('title'); } });
  },
  menu() {
    const G = B.game, sp = this.spec;
    B.ui.show('wsMenu', { kicker: 'Workshop', title: sp.name, text: this.problems.length ? 'Problems:\n' + this.problems.map(p => '- ' + p.msg).join('\n') : 'Level ' + sp.size[0] + ' x ' + sp.size[1] + ', ' + (sp.guards.length + sp.civilians.length) + ' people.',
      actions: [{ label: 'Test play', primary: true, fn: () => this.test('workshop') }, ['Play (a fresh run with results)', () => this.test('workshop')],
        ...[1, 2, 3].map(i => ['Save to slot ' + i, () => { E.store.set(B.WS.slotKey(i), this.spec); B.ui.toast('Saved', 'Slot ' + i); this.menu(); }]),
        ['Load...', () => B.ui.show('wsLoad', { title: 'Load which slot?', actions: [1, 2, 3].map(i => { const s = E.store.get(B.WS.slotKey(i), null); return [s ? 'Slot ' + i + ': ' + s.name : 'Slot ' + i + ': empty', () => { if (s) { B.ui.hide(); this.load(s); } }]; }).concat([['Back', () => B.ui.back()]]) })],
        ['Export JSON', () => this.exportJson()], ['Import JSON', () => this.importJson()], ['Settings', () => this.settingsScreen()], ['Exit to title', () => { B.ui.hide(); G.go('title'); }]],
      back: () => B.ui.hide() });
  },
  settingsScreen() {
    const sp = this.spec, cyc = (k, opts) => { const i = opts.indexOf(sp[k]); sp[k] = opts[(i + 1) % opts.length]; this.rebuild(); this.settingsScreen(); };
    const names = ['My Mission', 'The Broker\'s Warehouse', 'Night at the Ferry', 'Lanterns over the Rice', 'The Red Gate'];
    B.ui.show('wsSettings', { kicker: 'Workshop', title: 'Level settings', actions: [
      ['Name: ' + sp.name, () => cyc('name', names.includes(sp.name) ? names : [sp.name].concat(names))],
      ['Size: ' + sp.size[0] + ' x ' + sp.size[1], () => { const n = { 32: 40, 40: 48, 48: 32 }[sp.size[0]] || 40; this.resize(n); this.settingsScreen(); }],
      ['Time: ' + sp.time, () => cyc('time', ['dusk', 'night', 'rain', 'festival'])], ['Par time: ' + sp.par + ' s', () => { sp.par = sp.par >= 900 ? 200 : sp.par + 100; this.settingsScreen(); }],
      ['Music: ' + sp.music, () => cyc('music', ['m1', 'm2', 'm3', 'training'])], ['Back', () => B.ui.back()]], back: () => B.ui.back() });
  },
  resize(n) { const sp = this.spec, old = sp.rows; sp.size = [n, n]; sp.rows = R(n, n, '.', [['box', 0, 0, n - 1, n - 1, '#']]).map((row, y) => row.split('').map((c, x) => (x > 0 && y > 0 && x < n - 1 && y < n - 1 && old[y] && old[y][x] && x < old[y].length - 1 && y < old.length - 1) ? old[y][x] : c).join('')); this.rebuild(); },
  test() {
    this.problems = B.WS.validate(this.spec);
    if (this.problems.length) { const p = this.problems.find(q => q.at); if (p) { this.cx = Math.floor(p.at[0]); this.cy = Math.floor(p.at[1]); } this.menu(); return; }
    B.ui.hide(); B.wsState = { spec: this.spec }; B.game.go('mission', { mode: 'workshop', levelId: 'workshop', spec: B.WS.generate(this.spec), character: (B.save.data && B.save.data.character) || 'sojiro', missionId: 'workshop' });
  },
  exportJson() { const s = JSON.stringify(this.spec); try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(() => B.ui.toast('Copied', 'The level JSON is on your clipboard'), () => B.ui.toast('Copy blocked', 'Select the text below and copy it')); } catch (e) { /* the text box below is the fallback */ } this.textBox(s, true); },
  importJson() { this.textBox('', false); },
  textBox(text, readOnly) {
    if (HEADLESS) return; this.closeText(); B.ui.hide();
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;background:#000c;display:grid;place-items:center;z-index:40';
    const box = document.createElement('div'); box.style.cssText = 'background:#140c0c;border:1px solid #e8b04a;padding:16px;width:min(720px,92vw);color:#f4ead5;font:16px system-ui;zoom:var(--ui,1)';
    const h = document.createElement('div'); h.textContent = readOnly ? 'Level JSON (select all and copy)' : 'Paste a level JSON, then Import'; h.style.cssText = 'color:#e8b04a;margin-bottom:8px';
    const ta = document.createElement('textarea'); ta.value = text; ta.readOnly = readOnly; ta.style.cssText = 'width:100%;height:40vh;background:#0a0606;color:#f4ead5;border:1px solid #8a6a3a;font:12px monospace';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;margin-top:10px';
    const mk = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:600 15px system-ui;padding:12px 18px;background:#e8b04a;border:0;color:#140c0c;cursor:pointer'; b.onclick = fn; b.onpointermove = () => b.focus(); row.appendChild(b); return b; };
    if (!readOnly) mk('Import', () => { try { const sp = JSON.parse(ta.value); if (!sp || !Array.isArray(sp.rows) || !Array.isArray(sp.size)) throw new Error('not a level'); for (const k of ['guards', 'civilians', 'props', 'lights', 'pickups', 'bells', 'barracks']) sp[k] = sp[k] || []; this.closeText(); this.load(sp); B.ui.toast('Imported', sp.name || 'a level'); } catch (e) { h.textContent = 'That is not a level JSON (' + e.message + ')'; } });
    const close = mk(readOnly ? 'Done' : 'Cancel', () => this.closeText());
    box.append(h, ta, row); wrap.appendChild(box); document.body.appendChild(wrap); this.overlay = wrap; (readOnly ? (ta.select(), close) : ta).focus();
  },
  closeText() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } },
  edge(code) { const I = B.game.input, h = I.held, on = h && (typeof h.has === 'function' ? h.has(code) : h[code]); return (on && !this.prev.has(code)) || (!!B.taps && B.taps.has(code) && !this.prev.has(code)); },
  held(code) { const h = B.game.input.held; return !!h && (typeof h.has === 'function' ? h.has(code) : !!h[code]); },
  cur() { return WS_CATS[WS_CAT_NAMES[this.cat]][this.brush]; },
  update(dt) {
    const G = B.game, I = G.input; B.padActive(); if (!this.spec || B.ui.screen || this.overlay) { this.snapPrev(); return; }
    const n = WS_CATS[WS_CAT_NAMES[this.cat]].length;
    if (this.edge('Pad4') || (this.edge('Tab') && this.held('ShiftLeft'))) { this.cat = (this.cat + WS_CAT_NAMES.length - 1) % WS_CAT_NAMES.length; this.brush = 0; B.sfx('uiMove'); }
    else if (this.edge('Pad5') || this.edge('Tab')) { this.cat = (this.cat + 1) % WS_CAT_NAMES.length; this.brush = 0; B.sfx('uiMove'); }
    if (this.edge('Pad6')) this.brush = (this.brush + n - 1) % n; if (this.edge('Pad7')) this.brush = (this.brush + 1) % n;
    if (B.wheel) { this.brush = (this.brush + (B.wheel > 0 ? 1 : n - 1)) % n; B.wheel = 0; }
    for (let k = 1; k <= 9; k++) if (this.edge('Digit' + k) && k <= n) this.brush = k - 1;
    const rot = this.edge('KeyQ') || this.edge('Pad3');
    if (rot && WS_CAT_NAMES[this.cat] === 'Routes' && this.sel && this.sel.route) { const wp = this.sel.route[this.sel.route.length - 1], i = this.wait.indexOf(wp[2] || 0); wp[2] = this.wait[(i + 1) % this.wait.length]; B.ui.toast('Waypoint wait', wp[2] + ' s'); }
    else if (rot) this.face = (this.face + 3) % 4; if (this.edge('KeyE')) this.face = (this.face + 1) % 4;
    // the cursor: stick / keys with repeat, or the mouse under the pointer
    const rep = a => I.repeat(a, .22, .06); let dx = 0, dy = 0; if (rep('left')) dx = -1; if (rep('right')) dx = 1; if (rep('up')) dy = -1; if (rep('down')) dy = 1;
    if (dx || dy) { const g2 = G.view.screenDirToGround(dx, dy); this.cx += Math.round(g2[0] * 1.4); this.cy += Math.round(g2[1] * 1.4); }
    const p = I.pointer(); if (B.mouseMode() && p) { const pk = this.world.map.pick(p[0], p[1]); if (pk) { this.cx = pk.cx; this.cy = pk.cy; } }
    this.cx = clamp(this.cx, 0, this.spec.size[0] - 1); this.cy = clamp(this.cy, 0, this.spec.size[1] - 1);
    const ax = I.padAxes || []; if (Math.hypot(ax[2] || 0, ax[3] || 0) > .3) { this.pan = this.pan || { x: 0, y: 0 }; const g2 = G.view.screenDirToGround(ax[2], ax[3]); this.pan.x += g2[0] * 200 * dt; this.pan.y += g2[1] * 200 * dt; }
    if (this.held('Mouse1')) { const d2 = I.pan ? I.pan() : null; if (d2) { this.pan = this.pan || { x: 0, y: 0 }; const g2 = G.view.screenDirToGround(-d2[0], -d2[1]); this.pan.x += g2[0] * 2; this.pan.y += g2[1] * 2; } }
    // paint, erase, pick
    const paint = this.held('Pad0') || this.held('Space') || (this.held('Mouse0') && B.mouseMode()), erase = this.edge('Pad1') || this.edge('Mouse2') || this.edge('Delete') || this.edge('Backspace');
    const paintEdge = this.edge('Pad0') || this.edge('Space') || this.edge('Mouse0');
    const b = this.cur();
    if (paint && (b.kind === 'cell' ? true : paintEdge)) this.apply(b);
    if (erase) this.erase();
    if (this.edge('Pad2') || this.edge('KeyI')) this.pick();
    if (this.edge('Pad8') || this.edge('F5')) this.test();
    if (this.edge('Pad9') || this.edge('Escape')) { this.problems = B.WS.validate(this.spec); this.menu(); }
    if (this.dirty) this.rebuild();
    const W = this.world; G.focus(cc(this.cx) + (this.pan ? this.pan.x : 0), cc(this.cy) + (this.pan ? this.pan.y : 0), W.map.height(this.cx, this.cy));
    if (dx || dy) this.pan = null;
    this.snapPrev();
  },
  snapPrev() { if (B.taps) B.taps.clear(); const h = B.game.input.held; this.prev = new Set(h ? (typeof h.forEach === 'function' ? [...h] : Object.keys(h).filter(k => h[k])) : []); },
  apply(b) {
    const sp = this.spec, x = this.cx, y = this.cy, edgeCell = x === 0 || y === 0 || x === sp.size[0] - 1 || y === sp.size[1] - 1;
    if (b.kind === 'cell') { if (edgeCell && b.id !== '#') return; if (sp.rows[y][x] === b.id) return; sp.rows[y] = sp.rows[y].slice(0, x) + b.id + sp.rows[y].slice(x + 1); this.world.set(x, y, b.id); this.world.bake(); return; }
    const at = [x, y], fac = this.face * 90;
    if (b.kind === 'prop') { sp.props.push([b.id, x, y, { facing: this.face * Math.PI / 2 }]); }
    else if (b.kind === 'light') { if (b.id === 'torch' || b.id === 'brazier') { sp.lights.push({ at, z: 20, r: 60, i: .9, color: '#ffa040', kind: null }); sp.props.push([b.id, x, y, {}]); } else sp.lights.push({ at, z: 22, r: 60, i: .9, color: '#ffb060', kind: b.id }); }
    else if (b.kind === 'item') { if (b.id === 'scroll') { sp.pickups = sp.pickups.filter(p => p.kind !== 'story'); sp.pickups.push({ id: 'scroll', kind: 'story', name: 'the scroll', at }); } else sp.pickups.push({ kind: 'tool', tool: b.id, n: 2, at }); }
    else if (b.kind === 'route') { if (!this.sel) { B.ui.toast('Routes', 'Pick a guard first (□ or I)'); return; } this.sel.route = this.sel.route || [this.sel.at.slice()]; this.sel.route.push([x, y, 0]); this.sel.mode = 'patrol'; }
    else if (b.kind === 'settings') { this.settingsScreen(); return; }
    else if (b.kind === 'actor') {
      const id = b.id, uid = id + (sp.guards.length + sp.civilians.length + 1);
      if (id === 'hero') sp.hero = { at, facing: fac }; else if (id === 'exit') sp.exit = { at, r: 1.5 };
      else if (id === 'bell') sp.bells.push(at); else if (id === 'barracks') sp.barracks.push(at);
      else if (id === 'target') { sp.civilians = sp.civilians.filter(c => c.type !== 'target'); sp.civilians.push({ id: 'target', type: 'target', kind: 'merchant', target: true, name: 'The Broker', at, facing: fac, mode: 'post' }); }
      else if (['merchant', 'maid', 'monk'].includes(id)) sp.civilians.push({ id: uid, kind: id, at, facing: fac, mode: 'post' });
      else if (id === 'disguised') sp.civilians.push({ id: uid, kind: 'servant', disguised: true, at, facing: fac, mode: 'post' });
      else if (['gonroku', 'hotaru', 'kurogane'].includes(id)) { sp.boss = { id, at, z: this.world.map.height(x, y), intro: [id, { gonroku: 'gon_intro', hotaru: 'hot_intro', kurogane: 'kur_intro' }[id]], defeat: [id, { gonroku: 'gon_defeat', hotaru: 'hot_defeat', kurogane: 'kur_defeat' }[id]], close: [] }; }
      else { const g = { id: uid, type: id, at, z: this.world.map.height(x, y), facing: fac, mode: 'post', lantern: id === 'ashigaru' }; sp.guards.push(g); this.sel = g; }
    }
    B.sfx('uiMove'); this.dirty = true;
  },
  erase() {
    const sp = this.spec, x = this.cx, y = this.cy, near = a => a && Math.abs(a[0] - x) < 1 && Math.abs(a[1] - y) < 1;
    const b = this.cur();
    if (b.kind === 'route' && this.sel && this.sel.route) { this.sel.route.pop(); if (this.sel.route.length < 2) { this.sel.route = null; this.sel.mode = 'post'; } this.dirty = true; return; }
    const before = JSON.stringify(sp);
    sp.guards = sp.guards.filter(g => !near(g.at)); sp.civilians = sp.civilians.filter(g => !near(g.at)); sp.props = sp.props.filter(p => !near([p[1], p[2]])); sp.lights = sp.lights.filter(l => !near(l.at)); sp.pickups = sp.pickups.filter(p => !near(p.at));
    sp.bells = sp.bells.filter(q => !near(q)); sp.barracks = sp.barracks.filter(q => !near(q)); if (sp.boss && near(sp.boss.at)) sp.boss = null; if (sp.exit && near(sp.exit.at)) sp.exit = null;
    if (JSON.stringify(sp) === before && (b.kind === 'cell') && sp.rows[y][x] !== '.' && !(x === 0 || y === 0 || x === sp.size[0] - 1 || y === sp.size[1] - 1)) { sp.rows[y] = sp.rows[y].slice(0, x) + '.' + sp.rows[y].slice(x + 1); this.world.set(x, y, '.'); this.world.bake(); return; }
    B.sfx('uiBack'); this.dirty = true;
  },
  pick() {
    const sp = this.spec, x = this.cx, y = this.cy, near = a => a && Math.abs(a[0] - x) < 1 && Math.abs(a[1] - y) < 1;
    const g = sp.guards.find(q => near(q.at)); if (g) { this.sel = g; this.cat = WS_CAT_NAMES.indexOf('Routes'); this.brush = 0; B.ui.toast('Selected', g.type + ': add waypoints with paint, cycle the wait with rotate'); return; }
    const ch = sp.rows[y][x]; for (let c = 0; c < WS_CAT_NAMES.length; c++) { const k = WS_CATS[WS_CAT_NAMES[c]].findIndex(q => q.kind === 'cell' && q.id === ch); if (k >= 0) { this.cat = c; this.brush = k; return; } }
  },
  draw(r) {
    if (!this.spec) { r.sky(['#0e0808', '#1a1010', '#140c0c']); return; }
    const W = this.world, sp = this.spec, G = B.game; B.lastR = r;
    B.drawWorld(r, W, {});
    const pin = (x, y, z, c, label) => r.queue(x, y, z, g => { const q = r.w(x, y, z); px.line(g, q[0], q[1], q[0], q[1] - 14, '#1a1418'); px.disc(g, q[0], q[1] - 16, 3, c); if (label) E.font.text(g, label, q[0], q[1] - 28, '#f4ead5', { align: 'center', font: 'tiny' }); }, { emissive: true });
    if (sp.hero) pin(cc(sp.hero.at[0]), cc(sp.hero.at[1]), sp.hero.z || 0, '#5ae0a0', 'START');
    if (sp.exit) r.decal(() => r.groundRing(cc(sp.exit.at[0]), cc(sp.exit.at[1]), 20, '#5ad8ff', .6));
    for (const g of sp.guards) { pin(cc(g.at[0]), cc(g.at[1]), g.z || 0, g === this.sel ? '#ffffff' : '#ff6a4a', g.type.slice(0, 3).toUpperCase()); if (g.route) r.decal(gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], bq = g.route[(i + 1) % g.route.length], p0 = r.w(cc(a[0]), cc(a[1]), 0), p1 = r.w(cc(bq[0]), cc(bq[1]), 0); px.line(gg, p0[0], p0[1], p1[0], p1[1], g === this.sel ? '#ffffff' : '#5a8aff'); px.disc(gg, p1[0], p1[1], 2, '#5a8aff'); } }); }
    for (const c of sp.civilians) pin(cc(c.at[0]), cc(c.at[1]), 0, c.type === 'target' ? '#e8b04a' : c.disguised ? '#c83a3a' : '#c8c8c8', c.type === 'target' ? 'TARGET' : null);
    if (sp.boss) pin(cc(sp.boss.at[0]), cc(sp.boss.at[1]), sp.boss.z || 0, '#d8402a', 'BOSS');
    for (const p of sp.pickups) pin(cc(p.at[0]), cc(p.at[1]), 0, '#ffe080', null);
    for (const q of sp.bells) pin(cc(q[0]), cc(q[1]), 0, '#c8a040', 'BELL'); for (const q of sp.barracks) pin(cc(q[0]), cc(q[1]), 0, '#8a8a8a', 'BRK');
    // the grid and the cursor box at the cell's top
    const ch = W.map.height(this.cx, this.cy), x0 = this.cx * CELL, y0 = this.cy * CELL;
    r.queue(x0 + 8, y0 + 8, ch + 1, g => { const c = [r.w(x0, y0, ch), r.w(x0 + 16, y0, ch), r.w(x0 + 16, y0 + 16, ch), r.w(x0, y0 + 16, ch)]; for (let k = 0; k < 4; k++) px.line(g, c[k][0], c[k][1], c[(k + 1) % 4][0], c[(k + 1) % 4][1], Math.floor(G.real * 4) % 2 ? '#ffffff' : '#e8b04a'); }, { emissive: true, bias: 50 });
    r.decal(g => { for (let k = -6; k <= 6; k++) for (const [ax, ay, bx, by] of [[this.cx + k, this.cy - 6, this.cx + k, this.cy + 7], [this.cx - 6, this.cy + k, this.cx + 7, this.cy + k]]) { const p = r.w(ax * CELL, ay * CELL, 0), q = r.w(bx * CELL, by * CELL, 0); px.line(g, p[0], p[1], q[0], q[1], '#3a3048'); } });
    r.overlay(g => {
      // category tabs, the brush strip, the cell info and the legend
      let tx = 6; WS_CAT_NAMES.forEach((n, i) => { const w = E.font.width(n) + 8; px.rect(g, tx, 4, w, 12, i === this.cat ? '#e8b04a' : '#1a1210'); E.font.text(g, n, tx + 4, 6, i === this.cat ? '#140c0c' : '#c8b8a0', { outline: false }); tx += w + 2; });
      const L = WS_CATS[WS_CAT_NAMES[this.cat]], bw = 18, start = clamp(this.brush - 8, 0, Math.max(0, L.length - 17)); px.blend(g, .85, 'normal', () => px.rect(g, 0, r.H - 34, r.W, 34, '#140c0c'));
      L.slice(start, start + 17).forEach((b2, k) => { const i = start + k, x = 6 + k * (bw + 2), y = r.H - 30; px.rect(g, x, y, bw, bw, i === this.brush ? '#e8b04a' : '#3a2418'); const icon = b2.kind === 'item' ? B.ICON[b2.id === 'scroll' ? 'scroll' : b2.id] : null; if (icon) px.sprite(g, icon, x + 2, y + 3); else E.font.text(g, b2.kind === 'cell' ? b2.id : b2.name.slice(0, 2), x + bw / 2, y + 6, i === this.brush ? '#140c0c' : '#f4ead5', { align: 'center', outline: false }); });
      E.font.text(g, this.cur().name, 6, r.H - 44, '#e8b04a', { outline: false, shadow: '#000' });
      const c = sp.rows[this.cy][this.cx], wt = B.WALLS[c]; E.font.text(g, '(' + this.cx + ', ' + this.cy + ') ' + (wt ? wt.name + ' h' + wt.h : (B.FLOORS[c] || ['', 'Floor'])[1]) + '   facing ' + ['E', 'S', 'W', 'N'][this.face], 6, 20, '#f4ead5', { outline: false, shadow: '#000' });
      if (this.sel) E.font.text(g, 'Selected: ' + this.sel.type + (this.sel.route ? ' (' + this.sel.route.length + ' waypoints)' : ''), 6, 30, '#ffffff', { outline: false, shadow: '#000' });
      const dev = B.device(); B.rich(g, dev === 'gamepad' ? '{a:jump} paint {a:crouch} erase {a:attack} pick {a:interact} rotate  L1/R1 tab  L2/R2 brush  Create test  Options menu' : 'Click paint  Right click erase  Wheel brush  Tab category  Q/E rotate  I pick  F5 test  Esc menu', r.W - 6, r.H - 44, '#b8a890', { align: 'right' });
    });
  }
};
if (!HEADLESS) addEventListener('keydown', e => { if (e.code === 'F5' && B.game && B.game.sceneName === 'workshop') e.preventDefault(); });
