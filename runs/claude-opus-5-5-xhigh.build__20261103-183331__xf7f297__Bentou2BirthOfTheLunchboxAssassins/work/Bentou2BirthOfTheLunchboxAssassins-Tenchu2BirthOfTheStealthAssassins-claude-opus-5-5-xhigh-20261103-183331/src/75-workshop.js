/* ---- THE WORKSHOP (the Mission Editor): it edits the exact level JSON the campaign uses, drawn by the same renderer.
 * Pad: stick moves the cursor, L1 / R1 the category, L2 / R2 the brush, cross paints, circle erases, square picks or
 * selects, triangle turns, Create test-plays, Options the menu. Mouse and keys: hover moves the cursor, left click
 * paints (drag paints a line), right click erases, middle drag pans, the wheel changes the brush, Tab the category, 1-9
 * a brush, Q / E turn, F5 test-plays, Esc the menu. Validation before a test, a save or a play ---- */
const ED_CATS = [
  { id: 'ground', name: 'Ground', brushes: [['.', 'Earth'], [',', 'Tall grass'], ['"', 'Bamboo'], [':', 'Gravel'], ['=', 'Boards'], ['_', 'Tatami'], ['+', 'Paving'], ['~', 'Deep water'], ['-', 'Shallows'], ['d', 'Doorway']] },
  { id: 'walls', name: 'Walls', brushes: [['#', 'Castle wall'], ['W', 'Compound wall'], ['F', 'Bamboo fence'], ['H', 'Hall wall']] },
  { id: 'buildings', name: 'Buildings', brushes: 'ABCDSTGKMPR'.split('').map(c => [c, WALLTYPES[c].name]) },
  { id: 'props', name: 'Props', brushes: ['bamboo', 'maple', 'cherry', 'persimmonTree', 'bonsaiPine', 'steppingStones', 'sakeBarrel', 'riceBale', 'jubako', 'yatai', 'weaponRack', 'mato', 'taiko', 'hansho', 'torii', 'waterBarrel', 'strawMat', 'boat', 'riceBarge', 'mooringPost', 'bambooCage', 'kotatsu', 'folding', 'hut', 'nets', 'dummy', 'cart', 'crate', 'barrel', 'well', 'nobori'].map(p => [p, p]) },
  { id: 'lights', name: 'Lights', brushes: [['stoneLantern', 'Stone lantern'], ['paperLantern', 'Paper lantern'], ['torch', 'Torch'], ['brazier', 'Brazier']] },
  { id: 'actors', name: 'Actors', brushes: [['hero', 'Hero start'], ['exit', 'Exit'], ['target', 'Target'], ['ashigaru', 'Ashigaru'], ['samurai', 'Samurai'], ['archer', 'Archer'], ['ninja', 'Red Lantern ninja'], ['hound', 'Hound'],
    ['maid', 'Maid'], ['merchant', 'Merchant'], ['monk', 'Monk'], ['noble', 'Noble'], ['servant', 'Servant'], ['disguised', 'Disguised ninja'], ['gonroku', 'Boss: Gonroku'], ['hotaru', 'Boss: Hotaru'], ['kurogane', 'Boss: Kurogane'], ['bell', 'Alarm bell'], ['barracks', 'Barracks door']] },
  { id: 'routes', name: 'Routes', brushes: [['route', 'Waypoints']] },
  { id: 'items', name: 'Items', brushes: TOOL_ORDER.map(t => ['tool:' + t, B.get('tool', t).name]).concat([['scroll', 'The scroll (optional)']]) },
  { id: 'settings', name: 'Settings', brushes: [['settings', 'Level settings']] }
];
const Ed = { L: null, W: null, cx: 3, cy: 3, cat: 0, brush: 0, facing: 90, sel: null, slot: 0, prev: new Set(), problems: [], dragPaint: null, wait: [0, 1, 2, 4], pan: [0, 0] };
Ed.blank = (w = 40, h = 40) => { const g = LG(w, h); return { id: 'custom', name: 'A New Night', size: [w, h], time: 'night', faction: 'kanemori', rows: g.rows(), music: 'm1', weather: null, par: 480, zones: [], lights: [], props: [], anchors: [],
  hero: { at: [3, h - 4], facing: 270 }, exit: { at: [w - 4, 3], r: 1.5 }, guards: [], civilians: [], bells: [], barracks: [], pickups: [], objectives: [], triggers: [], timer: null }; };
Ed.load = L => { Ed.L = deepCopy(L); Ed.L.id = Ed.L.id || 'custom'; Ed.rebuild(); Ed.cx = Ed.L.hero ? Ed.L.hero.at[0] : 3; Ed.cy = Ed.L.hero ? Ed.L.hero.at[1] : 3; Ed.sel = null; };
Ed.rebuild = () => { Ed.genObjectives(); Ed.W = new World(Ed.L); };
Ed.cell = (cx, cy) => (Ed.L.rows[cy] || '')[cx];
/** paint one cell of terrain (the border stays a castle wall) */
Ed.paint = (cx, cy, ch) => {
  const [w, h] = Ed.L.size; if (cx <= 0 || cy <= 0 || cx >= w - 1 || cy >= h - 1) return false;
  const row = Ed.L.rows[cy]; if (row[cx] === ch) return false;
  Ed.L.rows[cy] = row.slice(0, cx) + ch + row.slice(cx + 1); Ed.W.setCells(cx, cy, 1, 1, ch); Ed.W._findBlocks(); Ed.W._findHalls(); return true;
};
const atCell = (list, cx, cy, key = 'at') => list.findIndex(e => (Array.isArray(e) ? e[1] === cx && e[2] === cy : e[key] && e[key][0] === cx && e[key][1] === cy));
/** place the current brush (or a named one) at a cell */
Ed.place = (cx, cy, kind = Ed.brushId(), facing = Ed.facing) => {
  const L = Ed.L, cat = ED_CATS[Ed.cat].id;
  if (['ground', 'walls', 'buildings'].includes(Ed.catOf(kind))) return Ed.paint(cx, cy, kind);
  if (Ed.catOf(kind) === 'props') { const i = atCell(L.props, cx, cy); if (i >= 0) L.props.splice(i, 1); L.props.push([kind, cx, cy, { facing: facing * Math.PI / 180, color: kind === 'nobori' ? '#c8342a' : undefined }]); Ed.rebuild(); return true; }
  if (Ed.catOf(kind) === 'lights') { const i = atCell(L.lights, cx, cy); if (i >= 0) L.lights.splice(i, 1); L.lights.push({ at: [cx, cy], kind, r: kind === 'torch' ? 72 : 64, i: .9 }); Ed.rebuild(); return true; }
  if (kind.startsWith('tool:')) { const i = atCell(L.pickups, cx, cy); if (i >= 0) L.pickups.splice(i, 1); const t = kind.slice(5); L.pickups.push({ id: 'p' + cx + '_' + cy, kind: 'tool', tool: t, n: Math.min(3, B.get('tool', t).stack), at: [cx, cy] }); Ed.rebuild(); return true; }
  if (kind === 'scroll') { L.pickups = L.pickups.filter(p => p.id !== 'scroll'); L.pickups.push({ id: 'scroll', kind: 'story', at: [cx, cy], text: 'The secret scroll' }); Ed.rebuild(); return true; }
  if (kind === 'hero') { L.hero = { at: [cx, cy], facing }; Ed.rebuild(); return true; }
  if (kind === 'exit') { L.exit = { at: [cx, cy], r: 1.5 }; Ed.rebuild(); return true; }
  if (kind === 'bell') { L.bells = L.bells.filter(b => !(b[0] === cx && b[1] === cy)); L.bells.push([cx, cy]); if (!L.props.some(p => p[0] === 'hansho' && p[1] === cx && p[2] === cy)) L.props.push(['hansho', cx, cy, {}]); Ed.rebuild(); return true; }
  if (kind === 'barracks') { L.barracks = L.barracks.filter(b => !(b[0] === cx && b[1] === cy)); L.barracks.push([cx, cy]); Ed.rebuild(); return true; }
  if (['gonroku', 'hotaru', 'kurogane'].includes(kind)) { L.boss = { id: kind, at: [cx, cy], facing, arena: [Math.max(1, cx - 5), Math.max(1, cy - 5), Math.min(L.size[0] - 2, cx + 5), Math.min(L.size[1] - 2, cy + 5)] }; L.triggers = (L.triggers || []).filter(t => t.id !== 'edboss'); L.triggers.push({ id: 'edboss', rect: L.boss.arena, do: [['boss', kind]] }); Ed.rebuild(); return true; }
  Ed.remove(cx, cy, true);
  if (['target', 'maid', 'merchant', 'monk', 'noble', 'servant', 'disguised'].includes(kind)) {
    if (kind === 'target') L.civilians = L.civilians.filter(c => !c.target);
    L.civilians.push({ id: kind === 'target' ? 'target' : 'c' + cx + '_' + cy, type: kind === 'target' ? 'merchant' : kind === 'disguised' ? 'servant' : kind, i: cx, at: [cx, cy], facing, target: kind === 'target' || undefined, disguised: kind === 'disguised' || undefined });
    Ed.rebuild(); return true;
  }
  const z = Ed.W.map.height(cx, cy);
  L.guards.push({ id: 'g' + cx + '_' + cy, type: kind, at: [cx, cy], z: z > 0 && z < 1e8 ? z : undefined, facing, mode: 'post', lantern: kind === 'ashigaru' || undefined });
  Ed.rebuild(); return true;
};
Ed.catOf = kind => { for (const c of ED_CATS) if (c.brushes.some(b => b[0] === kind)) return c.id; return kind.startsWith('tool:') ? 'items' : null; };
/** erase what is at a cell: an actor, item, prop or light first, else the terrain back to earth */
Ed.remove = (cx, cy, actorsOnly) => {
  const L = Ed.L; let i;
  if ((i = atCell(L.guards, cx, cy)) >= 0) { L.guards.splice(i, 1); Ed.sel = null; Ed.rebuild(); return true; }
  if ((i = atCell(L.civilians, cx, cy)) >= 0) { L.civilians.splice(i, 1); Ed.rebuild(); return true; }
  if (actorsOnly) return false;
  if (L.boss && L.boss.at[0] === cx && L.boss.at[1] === cy) { L.boss = null; L.triggers = (L.triggers || []).filter(t => t.id !== 'edboss'); Ed.rebuild(); return true; }
  if ((i = atCell(L.pickups, cx, cy)) >= 0) { L.pickups.splice(i, 1); Ed.rebuild(); return true; }
  if ((i = atCell(L.props, cx, cy)) >= 0) { L.props.splice(i, 1); L.bells = L.bells.filter(b => !(b[0] === cx && b[1] === cy)); Ed.rebuild(); return true; }
  if ((i = atCell(L.lights, cx, cy)) >= 0) { L.lights.splice(i, 1); Ed.rebuild(); return true; }
  if ((i = L.barracks.findIndex(b => b[0] === cx && b[1] === cy)) >= 0) { L.barracks.splice(i, 1); return true; }
  return Ed.paint(cx, cy, '.');
};
/** the eyedropper: select the guard here (for routes), or take the brush of what is here */
Ed.pick = (cx, cy) => {
  const L = Ed.L, g = L.guards.find(g => g.at[0] === cx && g.at[1] === cy);
  if (g) { Ed.sel = g.id; Ed.setBrush('routes', 'route'); return 'guard'; }
  const ch = Ed.cell(cx, cy); for (const [ci, c] of ED_CATS.entries()) { const bi = c.brushes.findIndex(b => b[0] === ch); if (bi >= 0 && ['ground', 'walls', 'buildings'].includes(c.id)) { Ed.cat = ci; Ed.brush = bi; return 'terrain'; } }
  return null;
};
/** routes: the selected guard gets a waypoint, loses the last, or its last waypoint's wait cycles */
Ed.route = (op, cx, cy) => {
  const g = Ed.L.guards.find(g => g.id === Ed.sel); if (!g) return false;
  g.route = g.route || [[g.at[0], g.at[1], 1]];
  if (op === 'add') { g.route.push([cx, cy, 1]); g.mode = 'patrol'; }
  else if (op === 'pop') { g.route.pop(); if (g.route.length < 2) { delete g.route; g.mode = 'post'; } }
  else if (op === 'wait') { const p = g.route[g.route.length - 1]; p[2] = Ed.wait[(Ed.wait.indexOf(p[2]) + 1) % Ed.wait.length]; }
  Ed.rebuild(); return true;
};
Ed.setBrush = (cat, id) => { Ed.cat = ED_CATS.findIndex(c => c.id === cat); Ed.brush = Math.max(0, ED_CATS[Ed.cat].brushes.findIndex(b => b[0] === id)); };
Ed.brushId = () => ED_CATS[Ed.cat].brushes[Ed.brush][0];
/** the objectives come from what is placed: silence the target, defeat the boss, steal the scroll, escape */
Ed.genObjectives = () => {
  const L = Ed.L, obs = [], tg = L.civilians.find(c => c.target);
  if (tg) obs.push({ id: 'kill', type: 'assassinate', target: tg.id, text: 'Silence the target' });
  if (L.boss) obs.push({ id: 'boss', type: 'defeat', boss: L.boss.id, text: 'Defeat ' + B.get('boss', L.boss.id).name });
  if (L.pickups.some(p => p.id === 'scroll')) obs.push({ id: 'scroll', type: 'retrieve', pickup: 'scroll', optional: true, text: 'Steal the scroll' });
  obs.push({ id: 'escape', type: 'reach', after: obs.filter(o => !o.optional).map(o => o.id), text: 'Escape' });
  L.objectives = obs; L.target = tg ? tg.id : undefined;
};
/** validation: a hero start, an exit, a target or a boss, and both reachable (climbs of 30; the grapple's 96) */
Ed.validate = () => {
  const L = Ed.L, out = [];
  if (!L.hero) out.push({ text: 'There is no hero start. Place one (Actors, Hero start).', at: [3, 3] });
  if (!L.exit) out.push({ text: 'There is no exit. Place one (Actors, Exit).', at: [3, 3] });
  const tg = L.civilians.find(c => c.target);
  if (!tg && !L.boss) out.push({ text: 'There is no target and no boss. Place a target (Actors, Target) or a boss.', at: L.hero ? L.hero.at : [3, 3] });
  if (L.hero) {
    const W = Ed.W, f = new E.FlowField(W.map, { climb: 96, drop: 200, jump: 60 }), hx = cellC(L.hero.at[0]), hy = cellC(L.hero.at[1]);
    const reach = at => { f.update(cellC(at[0]), cellC(at[1])); const v = f.d[toCell(hy) * W.w + toCell(hx)]; return v !== undefined && v < 1e8; };
    if (L.exit && !reach(L.exit.at)) out.push({ text: 'The exit cannot be reached from the start.', at: L.exit.at });
    if (tg && !reach(tg.at)) out.push({ text: 'The target cannot be reached from the start.', at: tg.at });
    if (L.boss && !reach(L.boss.at)) out.push({ text: 'The boss cannot be reached from the start.', at: L.boss.at });
  }
  Ed.problems = out; return out;
};
Ed.problemScreen = (then) => {
  const p = Ed.validate(); if (!p.length) { then(); return; }
  Ed.cx = p[0].at[0]; Ed.cy = p[0].at[1];
  ui.show('edProblems', { kicker: 'Workshop', title: 'Not ready yet', sections: p.map((q, i) => ['Problem ' + (i + 1), q.text]), actions: [{ label: 'Fix it', primary: true, fn: () => ui.hide() }] });
};
Ed.json = () => JSON.stringify(Ed.L);
Ed.save = slot => { E.store.set('bentou:workshop:' + slot, Ed.json()); Ed.slot = slot; B.Hud.toast('Saved to slot ' + (slot + 1), Ed.L.name); };
Ed.loadSlot = slot => { const j = E.store.get('bentou:workshop:' + slot, null); if (!j) return false; try { Ed.load(JSON.parse(j)); Ed.slot = slot; return true; } catch (e) { return false; } };
/** import: parse and check a level's shape; returns an error string or null */
Ed.importJson = text => {
  let L; try { L = JSON.parse(text); } catch (e) { return 'That is not JSON.'; }
  if (!L || !Array.isArray(L.rows) || !Array.isArray(L.size) || L.rows.length !== L.size[1] || L.rows.some(r => typeof r !== 'string' || r.length !== L.size[0])) return 'The level’s rows do not match its size.';
  for (const k of ['guards', 'civilians', 'props', 'lights', 'pickups', 'bells', 'barracks', 'zones', 'anchors', 'triggers']) if (!Array.isArray(L[k])) L[k] = [];
  Ed.load(L); return null;
};
Ed.testPlay = (fresh) => Ed.problemScreen(() => { ui.hide(); game.go('mission', { level: deepCopy(Ed.L), mission: 'workshop', mode: 'workshop', char: Save.get().character || 'sojiro' }, { fade: 'iris', seconds: .4 }); });
/* ---- the editor's menus (Shell screens; no alert, prompt or confirm) ---- */
Ed.menu = () => ui.show('edMenu', { kicker: 'Workshop', title: Ed.L.name, actions: [
  { label: 'Test play', primary: true, fn: () => Ed.testPlay() }, ['Play (a fresh run with results)', () => Ed.testPlay(true)],
  ['Save to a slot', () => ui.show('edSave', { kicker: 'Workshop', title: 'Save to slot', actions: [0, 1, 2].map(s => [Ed.slotLabel(s), () => Ed.problemScreen(() => { Ed.save(s); ui.hide(); })]).concat([['Back', () => ui.back()]]) })],
  ['Load a slot', () => ui.show('edLoad', { kicker: 'Workshop', title: 'Load', actions: [0, 1, 2].map(s => ({ label: Ed.slotLabel(s), disabled: !E.store.get('bentou:workshop:' + s, null), fn: () => { Ed.loadSlot(s); ui.hide(); } })).concat([['Back', () => ui.back()]]) })],
  ['Level settings', () => Ed.settings()], ['Export JSON', () => Ed.exportScreen()], ['Import JSON', () => Ed.importScreen()],
  ['New level', () => Ed.newScreen()], ['Leave the Workshop', () => { ui.hide(); game.go('title', { menu: true }); }]] });
Ed.slotLabel = s => { const j = E.store.get('bentou:workshop:' + s, null); let n = 'empty'; if (j) { try { n = JSON.parse(j).name; } catch (e) { n = 'damaged'; } } return 'Slot ' + (s + 1) + ': ' + n; };
Ed.settings = () => {
  const L = Ed.L, cyc = (list, v) => list[(list.indexOf(v) + 1) % list.length];
  ui.show('edSettings', { kicker: 'Workshop', title: 'Level settings', actions: [
    ['Name: ' + L.name, () => { const names = ['A New Night', 'The Silent Granary', 'Lanterns by the Moat', 'The Broker’s Last Meal', 'Smoke over the Kura']; L.name = cyc(names, L.name); Ed.settings(); }],
    ['Size: ' + L.size[0] + ' × ' + L.size[1], () => { const s = cyc([32, 40, 48], L.size[0]); Ed.resize(s); Ed.settings(); }],
    ['Time: ' + L.time, () => { L.time = cyc(['night', 'dusk', 'rain', 'festival'], L.time); L.weather = { rain: 'rain', festival: 'maple', dusk: 'petals', night: null }[L.time]; Ed.rebuild(); Ed.settings(); }],
    ['Par time: ' + fmtTime(L.par), () => { L.par = cyc([240, 300, 420, 480, 600, 720, 900], L.par); Ed.settings(); }],
    ['Music: ' + L.music, () => { L.music = cyc(['m1', 'm2', 'm3', 'training'], L.music); Ed.settings(); }], ['Back', () => ui.back()]] });
};
Ed.resize = s => { const L = Ed.L, g = LG(s, s); for (let y = 1; y < s - 1; y++) for (let x = 1; x < s - 1; x++) { const c = (L.rows[y] || '')[x]; g.set(x, y, c && y < L.size[1] - 1 && x < L.size[0] - 1 ? c : '.'); } L.rows = g.rows(); L.size = [s, s];
  const inb = a => a && a[0] > 0 && a[1] > 0 && a[0] < s - 1 && a[1] < s - 1; L.guards = L.guards.filter(e => inb(e.at)); L.civilians = L.civilians.filter(e => inb(e.at)); L.props = L.props.filter(p => inb([p[1], p[2]])); L.lights = L.lights.filter(e => inb(e.at)); L.pickups = L.pickups.filter(e => inb(e.at));
  if (L.hero && !inb(L.hero.at)) L.hero.at = [2, s - 3]; if (L.exit && !inb(L.exit.at)) L.exit.at = [s - 3, 2]; if (L.boss && !inb(L.boss.at)) L.boss = null; Ed.rebuild(); };
Ed.newScreen = () => ui.show('edNew', { kicker: 'Workshop', title: 'New from template', actions: [['A blank 40 × 40 night', () => { Ed.load(Ed.blank()); ui.hide(); }]].concat(['training', 'm1', 'm2', 'm3', 'delivery'].map(id => ['A copy of ' + B.get('level', id).name, () => { const L = deepCopy(B.get('level', id)); L.id = 'custom'; L.name = 'Copy of ' + L.name; Ed.load(L); ui.hide(); }]), [['Back', () => ui.back()]]) });
/** export: the clipboard, else a read-only text box to select from */
Ed.exportScreen = () => {
  const j = Ed.json(); let copied = false;
  try { if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(j).then(() => B.Hud.toast('Copied', 'The level is on the clipboard.'), () => {}); copied = true; } } catch (e) { copied = false; }
  Ed.textBox(j, true, copied ? 'Copied to the clipboard. The level’s JSON is also below.' : 'Select the JSON below and copy it.');
};
Ed.importScreen = () => Ed.textBox('', false, 'Paste a level’s JSON, then Import.');
Ed.textBox = (text, readonly, msg) => {
  ui.show('edText', { kicker: 'Workshop', title: readonly ? 'Export' : 'Import', text: msg, actions: [readonly ? null : { label: 'Import', primary: true, fn: () => { const ta = document.getElementById('ed-ta'); const err = Ed.importJson(ta ? ta.value : ''); if (err) { Ed.textBox(ta ? ta.value : '', false, err); } else { Ed.closeText(); ui.hide(); B.Hud.toast('Imported', Ed.L.name); } } }, { label: 'Close', fn: () => { Ed.closeText(); ui.back(); } }].filter(Boolean) });
  if (!hasDOM) return;
  Ed.closeText(); const ta = document.createElement('textarea'); ta.id = 'ed-ta'; ta.value = text; ta.readOnly = !!readonly; ta.spellcheck = false;
  ta.style.cssText = 'position:fixed;left:8%;right:8%;bottom:6%;height:30%;z-index:40;background:#140c0c;color:#f4ead5;border:1px solid #e8b04a;font:12px ui-monospace,monospace;padding:8px';
  document.body.appendChild(ta); if (readonly) { ta.focus(); ta.select(); }
};
Ed.closeText = () => { if (!hasDOM) return; const ta = document.getElementById('ed-ta'); if (ta) ta.remove(); };
/* ---- the scene ---- */
const pressedCode = c => game.input.held.has(c) && !Ed.prev.has(c);
const workshopScene = {
  view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.6, 2], start: 1, rotate: true, wheel: false }, pausable: false,
  enter(d) {
    if (d && d.level) Ed.load(d.level); else if (!(d && d.resume && Ed.L)) { if (!Ed.loadSlot(0)) Ed.load(Ed.blank()); }
    else Ed.rebuild();
    game.setView('iso'); Lt.enabled = true; Lt.ambient = .55; game.weather = null; game.cam.bounds = v => Ed.W.map.bounds(v); game.follow(null); game.cam.snap = true; B.Music.play('shop');
    B.M = null; Ed.prev = new Set(game.input.held); Ed.repT = 0;
  },
  update(dt) {
    B.pollInput(); Hud.update(dt, null); const I = game.input, L = Ed.L, [w, h] = L.size;
    if (ui.screen) { Ed.prev = new Set(I.held); return; }
    // the menu, the test play
    if (pressedCode('Escape') || pressedCode('Pad9')) { Ed.menu(); Ed.prev = new Set(I.held); return; }
    if (pressedCode('F5') || pressedCode('Pad8')) { Ed.testPlay(); Ed.prev = new Set(I.held); return; }
    // categories and brushes
    const cats = ED_CATS.length, nb = () => ED_CATS[Ed.cat].brushes.length;
    if (pressedCode('Pad4')) { Ed.cat = (Ed.cat + cats - 1) % cats; Ed.brush = 0; Au.sfx('uiMove'); } if (pressedCode('Pad5') || pressedCode('Tab')) { Ed.cat = (Ed.cat + 1) % cats; Ed.brush = 0; Au.sfx('uiMove'); }
    if (pressedCode('Pad6')) { Ed.brush = (Ed.brush + nb() - 1) % nb(); Au.sfx('uiMove'); } if (pressedCode('Pad7')) { Ed.brush = (Ed.brush + 1) % nb(); Au.sfx('uiMove'); }
    if (B.wheel) { Ed.brush = ((Ed.brush + (B.wheel > 0 ? 1 : -1)) % nb() + nb()) % nb(); B.wheel = 0; }
    for (let k = 1; k <= 9; k++) if (pressedCode('Digit' + k) && k <= nb()) Ed.brush = k - 1;
    if (pressedCode('KeyQ')) Ed.facing = (Ed.facing + 315) % 360; if (pressedCode('KeyE') || pressedCode('Pad3') || pressedCode('KeyF')) Ed.facing = (Ed.facing + 45) % 360;
    // the cursor: the stick or keys (repeat), or the mouse under it
    Ed.repT -= dt; const mv = I.move(); if (Math.hypot(mv[0], mv[1]) > .4 && Ed.repT <= 0) { const g2 = game.view.screenDirToGround(mv[0], mv[1]); Ed.cx = clamp(Ed.cx + Math.round(g2[0] * 1.2), 1, w - 2); Ed.cy = clamp(Ed.cy + Math.round(g2[1] * 1.2), 1, h - 2); Ed.repT = Ed.repT < -.2 ? .16 : .08; }
    const p = I.pointer(); let mouse = false; if (p && B.mouseMode()) { const q = Ed.W.map.pick(p[0], p[1]); if (q) { Ed.cx = clamp(q.cx, 1, w - 2); Ed.cy = clamp(q.cy, 1, h - 2); mouse = true; } }
    // right stick or middle drag pans; the camera turns with [ ]
    const rs = I.padAim; if (rs) { Ed.pan[0] += rs[0] * dt * 180; Ed.pan[1] += rs[1] * dt * 180; }
    const pn = I.pan && I.pan(); if (pn && I.held.has('Mouse1')) { Ed.pan[0] -= pn[0] * .8; Ed.pan[1] -= pn[1] * .8; }
    if (pressedCode('BracketLeft')) game.rotateView(-45); if (pressedCode('BracketRight')) game.rotateView(45);
    // paint, erase, pick
    const cat = ED_CATS[Ed.cat].id, id = Ed.brushId(), terrain = ['ground', 'walls', 'buildings'].includes(cat);
    const paint = pressedCode('Pad0') || pressedCode('Space') || pressedCode('Enter') || (mouse && pressedCode('Mouse0')), erase = pressedCode('Pad1') || pressedCode('Delete') || pressedCode('Backspace') || (mouse && pressedCode('Mouse2'));
    if (cat === 'settings') { if (paint) Ed.settings(); }
    else if (cat === 'routes') { if (paint) Ed.route('add', Ed.cx, Ed.cy); if (erase) Ed.route('pop'); if (pressedCode('Pad3') || pressedCode('KeyR')) Ed.route('wait'); }
    else { if (paint) { Ed.place(Ed.cx, Ed.cy, id); Au.sfx('uiMove'); Ed.drag = terrain && mouse ? [Ed.cx, Ed.cy] : null; } if (erase) { Ed.remove(Ed.cx, Ed.cy); Au.sfx('uiBack'); } }
    if (Ed.drag && I.held.has('Mouse0') && terrain && (Ed.drag[0] !== Ed.cx || Ed.drag[1] !== Ed.cy)) { const [x0, y0] = Ed.drag, n = Math.max(Math.abs(Ed.cx - x0), Math.abs(Ed.cy - y0)); for (let k = 1; k <= n; k++) Ed.paint(Math.round(x0 + (Ed.cx - x0) * k / n), Math.round(y0 + (Ed.cy - y0) * k / n), id); Ed.drag = [Ed.cx, Ed.cy]; }
    if (!I.held.has('Mouse0')) Ed.drag = null;
    if (pressedCode('Pad2') || pressedCode('KeyI')) Ed.pick(Ed.cx, Ed.cy);
    Ed.prev = new Set(I.held);
    game.focus(cellC(Ed.cx) + Ed.pan[0], cellC(Ed.cy) + Ed.pan[1], 0);
  },
  draw(r) {
    const W = Ed.W, L = Ed.L; if (!W) return;
    W.draw(r, null);
    const z0 = W.map.height(Ed.cx, Ed.cy), zc = z0 > 1e8 ? 0 : z0;
    // the grid around the cursor, the cursor box at the cell's top
    r.decal(g => { for (let y = Ed.cy - 8; y <= Ed.cy + 8; y++) for (let x = Ed.cx - 8; x <= Ed.cx + 8; x++) { if (x < 0 || y < 0 || x >= L.size[0] || y >= L.size[1]) continue; const p = r.w(x * 16, y * 16, 0); px.dot(g, p[0], p[1], '#5a5a7a'); } });
    r.queue(cellC(Ed.cx), cellC(Ed.cy), zc + 1, g => { const c = [[0, 0], [16, 0], [16, 16], [0, 16]].map(([dx, dy]) => r.w(Ed.cx * 16 + dx, Ed.cy * 16 + dy, zc + 1)); for (let i = 0; i < 4; i++) px.line(g, c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], Math.floor(game.real * 4) % 2 ? '#ffe08a' : '#e8b04a'); }, { emissive: true, bias: 9 });
    // entities as markers (rigs would be heavy; the shapes and lights already draw)
    const mark = (cx, cy, col, label, z) => r.queue(cellC(cx), cellC(cy), (z || 0) + 2, g => { const p = r.w(cellC(cx), cellC(cy), (z || 0) + 2); px.disc(g, p[0], p[1] - 4, 4, '#100808'); px.disc(g, p[0], p[1] - 4, 3, col); E.font.text(g, label, p[0], p[1] - 16, '#f4ead5', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); }, { bias: 8 });
    if (L.hero) mark(L.hero.at[0], L.hero.at[1], '#5ad8c8', 'START'); if (L.exit) mark(L.exit.at[0], L.exit.at[1], '#e8b04a', 'EXIT');
    for (const gd of L.guards) { mark(gd.at[0], gd.at[1], gd.id === Ed.sel ? '#ffffff' : '#ff4a3a', gd.type.toUpperCase(), gd.z); if (gd.route) r.queue(cellC(gd.at[0]), cellC(gd.at[1]), 2, g => { for (let i = 0; i < gd.route.length; i++) { const a = gd.route[i], b2 = gd.route[(i + 1) % gd.route.length], p = r.w(cellC(a[0]), cellC(a[1]), 1), q = r.w(cellC(b2[0]), cellC(b2[1]), 1); px.line(g, p[0], p[1], q[0], q[1], gd.id === Ed.sel ? '#ffffff' : '#5a8aff'); E.font.text(g, String(a[2]), p[0] + 2, p[1] - 6, '#8ab8ff', { font: 'tiny', outline: false }); } }, { bias: 7 }); }
    for (const c of L.civilians) mark(c.at[0], c.at[1], c.target ? '#ffd36a' : c.disguised ? '#a83a5a' : '#c8c0b0', c.target ? 'TARGET' : c.type.toUpperCase());
    if (L.boss) mark(L.boss.at[0], L.boss.at[1], '#c8202a', L.boss.id.toUpperCase());
    for (const b2 of L.bells) mark(b2[0], b2[1], '#c8a040', 'BELL'); for (const b2 of L.barracks) mark(b2[0], b2[1], '#6a6a7a', 'BARRACKS');
    for (const pk of L.pickups) mark(pk.at[0], pk.at[1], '#9ae89a', pk.id === 'scroll' ? 'SCROLL' : (pk.tool || '').toUpperCase());
    // the panels: category tabs, the brush strip, the cell info, the controls
    r.overlay(g => {
      const Wd = r.W, H = r.H; let x = 4;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, Wd, 13, '#140c0c'));
      ED_CATS.forEach((c, i) => { const tw = E.font.width(c.name) + 8; px.rect(g, x, 1, tw, 11, i === Ed.cat ? '#e8b04a' : '#2a1414'); E.font.text(g, c.name, x + 4, 3, i === Ed.cat ? '#1a1418' : '#f4ead5', { outline: false }); x += tw + 2; });
      const br = ED_CATS[Ed.cat].brushes; px.blend(g, .85, 'normal', () => px.rect(g, 0, H - 26, Wd, 26, '#140c0c'));
      const start = Math.max(0, Math.min(Ed.brush - 4, br.length - 9)); let bx = 4;
      for (let i = start; i < Math.min(br.length, start + 9); i++) { const [bid, name] = br[i], on = i === Ed.brush, bw = Math.min(Math.max(30, E.font.width(name, { font: 'tiny' }) + 8), 64); px.rect(g, bx, H - 24, bw, 22, on ? '#4a2418' : '#2a1414'); if (on) px.rect(g, bx, H - 24, bw, 2, '#e8b04a');
        if (bid.startsWith('tool:')) px.sprite(g, Art.icon[B.get('tool', bid.slice(5)).icon], bx + 2, H - 21); else if (bid.length === 1) { const t = WALLTYPES[bid]; px.rect(g, bx + 3, H - 20, 10, 10, t ? t.side : (bid === '~' ? '#1e3a5a' : bid === ',' ? '#2e4a32' : bid === ':' ? '#8a8a8a' : bid === '"' ? '#3a5a2a' : '#5a4a3a')); }
        E.font.text(g, (i < 9 ? (i + 1) + ' ' : '') + name, bx + (bid.length === 1 || bid.startsWith('tool:') ? 16 : 3), H - 12, '#f4ead5', { font: 'tiny', outline: false }); bx += bw + 2; }
      const ch = Ed.cell(Ed.cx, Ed.cy), wt = WALLTYPES[ch];
      E.font.text(g, 'Cell ' + Ed.cx + ', ' + Ed.cy + '  ·  ' + (wt ? wt.name + ' (h ' + wt.h + ')' : FLOORCH[ch] || 'earth') + '  ·  facing ' + Ed.facing + '°' + (Ed.sel ? '  ·  route of ' + Ed.sel : ''), 4, 16, '#f4ead5', { shadow: '#000', outline: false });
      E.font.text(g, L.name + '  ' + L.size[0] + '×' + L.size[1] + '  ' + L.time, 4, 26, '#b8a890', { shadow: '#000', outline: false });
      const leg = Glyph.device() === 'pad' ? '{a:jump} Paint  {a:crouch} Erase  {a:attack} Pick  {a:interact} Turn  {a:block}{a:grapple} Category  {a:focus}{a:useTool} Brush  {a:objectives} Test  {a:pause} Menu'
        : 'Click paint · Right click erase · Wheel brush · Tab category · Q/E turn · I pick · F5 test · Esc menu';
      Glyph.text(g, leg, Wd - 4, H - 36, '#b8a890', { align: 'right' });
      if (ED_CATS[Ed.cat].id === 'routes') E.font.text(g, Ed.sel ? 'Route: paint adds a waypoint, erase removes the last, R / triangle cycles its wait.' : 'Pick a guard first (square / I over it).', Wd / 2, 40, '#ffe08a', { align: 'center', shadow: '#000', outline: false });
    });
    Hud.draw && r.overlay(g => { let ty = 30; for (const t of Hud.toasts) { E.font.text(g, t.title + (t.text ? ': ' + t.text : ''), r.W / 2, ty, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); ty += 10; } });
  },
  exit() { Ed.closeText(); Lt.enabled = false; }
};
B.Ed = Ed; B.workshopScene = workshopScene;
