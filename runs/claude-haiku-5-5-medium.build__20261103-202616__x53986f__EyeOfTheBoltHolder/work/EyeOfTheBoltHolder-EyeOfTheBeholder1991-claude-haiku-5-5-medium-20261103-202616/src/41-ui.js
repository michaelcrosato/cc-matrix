/* ===== 41 ui · the play HUD and the overlay screens (PLAN §5.2, §5.3) =====
 * Drawn over the dimmed 3D view on the 2D overlay. Each screen is a list of rows with a focus index; the d-pad (or
 * arrows, or the mouse hovering) moves it, ✕ (click) acts, ○ goes back, L1/R1 change tabs. Every change goes through a
 * sim command. */
const UI = { screen: null, i: 0, tab: 0, sel: 0, log: [], toast: null, hintQ: [], bump: 0, noteT: 0, dim: .55 };
/** the brass panel every screen draws its windows in */
const PANEL = (g, x, y, w, h, a = .92) => E.ui.box(g, x, y, w, h, { bg: ['#1c1813', '#0e0c0a'], border: '#b8924a', alpha: a });
const TXT = (g, s, x, y, c = '#f0e6d0', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: false, shadow: '#000' }, o));
/** a short label for an action on the last device */
const GLYPH_PS = { use: '✕', confirm: '✕', cancel: '○', throw: '○', strike: '□', party: '△', camp: 'L3', examine: 'R3', map: 'Create', journal: 'Options+', selPrev: 'L1', selNext: 'R1', start: 'Options', pause: 'Options' };
const GLYPH_XB = { use: 'A', confirm: 'A', cancel: 'B', throw: 'B', strike: 'X', party: 'Y', camp: 'LS', examine: 'RS', map: 'View', journal: 'Menu+', selPrev: 'LB', selNext: 'RB', start: 'Menu', pause: 'Menu' };
/** a pad's button drawn as a shape (PlayStation: ○ ✕ □ △ and the Xbox letters on discs); text for a key */
const GLYPH_COL = { 'O': '#e0463c', 'X': '#4a8aff', 'S': '#e070c0', 'T': '#4ae070' };
function drawGlyph(g, a, x, y) {
  if (game.input.lastDevice !== 'gamepad') return false;
  const ps = game.settings.glyphs !== 'Xbox', k = ps ? ({ use: 'X', confirm: 'X', cancel: 'O', throw: 'O', strike: 'S', party: 'T' })[a] : ({ use: 'A', confirm: 'A', cancel: 'B', throw: 'B', strike: 'X', party: 'Y' })[a];
  if (!k) return false;
  g.save(); g.lineWidth = 1.2;
  if (!ps) { g.fillStyle = { A: '#3bd06a', B: '#e04a3a', X: '#4a8aff', Y: '#f5c42a' }[k]; g.beginPath(); g.arc(x + 3, y + 3, 3.2, 0, Math.PI * 2); g.fill(); TXT(g, k, x + 3, y + 1, '#000', { align: 'center', font: 'tiny', outline: false }); }
  else if (k === 'O') { g.strokeStyle = GLYPH_COL.O; g.beginPath(); g.arc(x + 3, y + 3, 2.8, 0, Math.PI * 2); g.stroke(); }
  else if (k === 'X') { g.strokeStyle = GLYPH_COL.X; g.beginPath(); g.moveTo(x + .5, y + .5); g.lineTo(x + 5.5, y + 5.5); g.moveTo(x + 5.5, y + .5); g.lineTo(x + .5, y + 5.5); g.stroke(); }
  else if (k === 'S') { g.strokeStyle = GLYPH_COL.S; g.strokeRect(x + .5, y + .5, 5, 5); }
  else { g.strokeStyle = GLYPH_COL.T; g.beginPath(); g.moveTo(x + 3, y + .5); g.lineTo(x + 5.6, y + 5.5); g.lineTo(x + .4, y + 5.5); g.closePath(); g.stroke(); }
  g.restore(); return true;
}
/** a prompt: its glyph (drawn, or the key's name) and its word, at x (left-aligned) */
function prompt(g, a, word, x, y, color = '#c8c0b0') {
  if (drawGlyph(g, a, x, y)) TXT(g, word, x + 8, y, color, { font: 'tiny' });
  else TXT(g, LBL(a) + ' ' + word, x, y, color, { font: 'tiny' });
}
/** the prompt for an action on the last device: a pad's glyph (PlayStation, or Xbox by its setting), else the key */
const LBL = a => {
  if (game.input.lastDevice === 'gamepad') { const set = game.settings.glyphs === 'Xbox' ? GLYPH_XB : GLYPH_PS; return set[a] || a; }
  try { return game.input.label(a); } catch (e) { return a; }
};
/** a member's portrait rig, made once from its race and class (the look of the premade four is theirs) */
const RIG_LOOK = { Brannoc: { build: 'heroic', hat: { style: 'helmet', color: '#8a92a0' }, colors: { cloth: '#7a3a2e', pants: '#3a3440', hair: '#4a2e1e', skin: '#d8a888', metal: '#b8c0cc' } },
  'Ysa': { hood: true, colors: { cloth: '#3a5a3e', pants: '#2e2a26', hair: '#2a3a2c', skin: '#c89070' } },
  'Father': { hat: 'band', colors: { cloth: '#d8d0b8', pants: '#8a7a5a', hair: '#c8a050', skin: '#e8c0a0', hat: '#c8a040' } },
  'Odelia': { hat: 'pointed', colors: { cloth: '#3a3a7a', pants: '#2a2a4a', hair: '#e0e0e8', skin: '#e0b090', hat: '#3a3a7a' } },
  'Tamsin': { hood: true, colors: { cloth: '#3a6a3a', pants: '#2e2a26', hair: '#7a4a2a', skin: '#d8a888' } },
  'Durgan': { build: 'bulky', hat: { style: 'helmet', color: '#6a6a72' }, colors: { cloth: '#5a4a3a', pants: '#3a3430', hair: '#8a6a4a', skin: '#c8a080', metal: '#9a9aa8' } },
  'Sister': { hood: true, colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#e8d0c0', trim: '#6a4a9a' } } };
const RIGS = new WeakMap();
function rigOf(m) {
  if (RIGS.has(m)) return RIGS.get(m);
  const key = Object.keys(RIG_LOOK).find(k => m.name.startsWith(k)) || '';
  const rig = new E.Humanoid(Object.assign({ size: 1.1 }, RIG_LOOK[key] || { colors: { cloth: '#5a5a6a' } }));
  RIGS.set(m, rig); return rig;
}
/** the cards of the party, along the bottom: portrait, name, HP, the two hand slots */
function partyCard(g, r, i, m, place, x, y, w, h) {
  const S = B.sim.S, ko = m.state !== 'ok', cur = S.party.sel === place;
  E.ui.box(g, x, y, w, h, { bg: m.hurtT > 0 ? '#5a1a1e' : '#1a1626', border: cur ? '#ffd36a' : '#6a6080', alpha: .9 });
  rigOf(m).drawPortrait(g, x + 2, y + 2, 26, { zoom: 2.4, turn: .4, bg: '#2a2438', tint: ko ? '#707070' : undefined });
  TXT(g, m.name.split(' ')[0].slice(0, 7), x + 30, y + 2, ko ? '#8a8090' : '#f0e8d8', { font: 'tiny' });
  E.ui.bar(g, x + 30, y + 10, w - 34, 4, m.hp / m.max, '#e0463c');
  TXT(g, ko ? (m.state === 'dead' ? 'DEAD' : 'DOWN') : m.hp + '/' + m.max, x + 30, y + 16, ko ? '#c84a4a' : '#c8c0b0', { font: 'tiny' });
  if (m.food < 25) TXT(g, 'FOOD', x + 30, y + 22, '#c8a040', { font: 'tiny' });
  E.ui.bar(g, x + 2, y + h - 4, w - 4, 2, m.food / 100, '#c8a040');
  for (const [k, h2] of [['main', 0], ['off', 1]]) {
    const hx = x + 30 + h2 * 15, hy = y + h - 12, it = m.slots[k];
    E.ui.box(g, hx, hy, 13, 9, { bg: '#0c0a10', border: it ? '#8a7a4a' : '#3a3440', alpha: .9 });
    if (it) TXT(g, B.ITEMS[it.id].name.slice(0, 2).toUpperCase(), hx + 2, hy + 1, '#e8e0c8', { font: 'tiny', outline: '#000' });
    if (m.cool[k] > 0 && it) E.ui.bar(g, hx, hy + 8, 13, 1, Math.min(1, m.cool[k] / 2), '#4a8aff');
    if (m.cool[k] <= 0 && it && ko === false) g.fillStyle = 'rgba(255,240,180,.25)';
  }
  if (m.status.poison !== undefined) TXT(g, 'P', x + w - 7, y + 2, '#7ad870', { font: 'tiny' });
  if (m.status.held !== undefined) TXT(g, 'H', x + w - 13, y + 2, '#e8c070', { font: 'tiny' });
}
/** the play HUD: the cards, the log, the compass, the Hand, the prompts, the camp and the race */
function hudDraw(g, r) {
  const S = B.sim.S, p = S.party, list = partyList();
  const cw = Math.min(70, Math.floor((r.W - 8) / 6)), y0 = r.H - 42, x0 = Math.round((r.W - cw * 6 - 10) / 2);
  for (let pl = 0; pl < 6; pl++) {
    const x = x0 + pl * (cw + 2), i = p.place[pl], m = i >= 0 ? p.roster[i] : null;
    if (m) partyCard(g, r, pl, m, pl, x, y0, cw, 40);
    else E.ui.box(g, x, y0, cw, 40, { bg: '#0c0a10', border: '#2a2630', alpha: .5 });
  }
  // the compass, the floor's name, the log
  const cx = Math.round(r.W / 2), ty = 4;
  E.ui.box(g, cx - 28, ty, 56, 13, { bg: '#1a1626', border: '#6a6080', alpha: .85 });
  TXT(g, ['N', 'E', 'S', 'W'][(p.dir + 3) % 4] + ' ' + ['N', 'E', 'S', 'W'][p.dir] + ' ' + ['N', 'E', 'S', 'W'][(p.dir + 1) % 4], cx, ty + 3, '#ffd36a', { align: 'center', font: 'tiny' });
  if (UI.toast && S.time < UI.toast.until) TXT(g, UI.toast.text, r.W / 2, 22, '#ffe7a8', { align: 'center', scale: 1 });
  const lines = S.log.slice(-3);
  lines.forEach((l, i) => TXT(g, l.text.slice(0, 62), 4, r.H - 88 + i * 9, l.kind === 'note' ? '#ffe7a8' : '#e8e0d0', { font: 'tiny' }));
  // the Hand, above the cards
  if (p.hand) { const it = B.ITEMS[p.hand.item.id]; TXT(g, 'HAND: ' + it.name, r.W / 2, r.H - 56, '#ffe7a8', { align: 'center', font: 'tiny' }); }
  // the prompts, right: what the buttons do now
  const pr = [['use', 'Use'], ['strike', 'Strike'], ['party', 'Party'], ['camp', 'Camp'], ['map', 'Map']];
  pr.forEach(([a, w], i) => prompt(g, a, w, r.W - 46, 26 + i * 9));
  if (S.camp) TXT(g, 'RESTING: ' + S.camp.hours + ' hours', 4, 40, '#e8c070', { font: 'tiny' });
  if (S.party.floating > 0) TXT(g, 'FLOATING', 4, 48, '#9ad8ff', { font: 'tiny' });
  if (S.party.seeing > 0) TXT(g, 'SEEING', 4, 56, '#ffd870', { font: 'tiny' });
  // the hit chevrons on the edges of the view
  if (UI.hitSide !== undefined && UI.hitT > 0) { g.save(); g.globalAlpha = UI.hitT; g.fillStyle = '#c02020'; const s = UI.hitSide; if (s === 3) g.fillRect(0, 0, 6, r.H); if (s === 1) g.fillRect(r.W - 6, 0, 6, r.H); if (s === 2) g.fillRect(0, r.H - 6, r.W, 6); g.restore(); }
  if (S.race) raceHud(g, r);
  if (S.boss && S.floor === 'f4') bossBar(g, r);
}
/** the Bolt-Holder's bar: its HP and the lock pips */
function bossBar(g, r) {
  const mon = monsOn().find(m => m.type === 'boltholder'); if (!mon) return;
  const x = Math.round(r.W / 2 - 100), y = 22;
  E.ui.box(g, x - 2, y - 2, 204, 14, { bg: '#0c0a10', border: '#6a6080', alpha: .85 });
  E.ui.bar(g, x, y, 200, 6, Math.max(0, mon.hp / mon.max), '#e8a030');
  TXT(g, 'THE BOLT-HOLDER', x, y + 8, '#ffd36a', { font: 'tiny' });
  Object.keys(B.sim.S.boss.locks).forEach((k, i) => { const t = B.sim.S.boss.locks[k].turned; E.ui.box(g, x + 150 + i * 14, y + 8, 10, 4, { bg: t ? '#4ae070' : '#e8483a', border: '#000', alpha: .9 }); });
}
/** the race's HUD: the timer, the score, the checkpoint label */
function raceHud(g, r) {
  const R = B.sim.S.race, t = R.t, mm = Math.floor(t / 60), ss = (t % 60).toFixed(1).padStart(4, '0');
  TXT(g, String(mm).padStart(2, '0') + ':' + ss, 4, 4, '#ffe7a8', { font: 'tiny' });
  TXT(g, 'SCORE ' + R.score, 4, 12, '#c8c0b0', { font: 'tiny' });
  TXT(g, R.label, 4, 20, '#9ad8ff', { font: 'tiny' });
}
/* ---- the overlay screens: rows with a focus index, the sim does the work ---- */
/** the open screen's rows: { id, label, desc, act } (a row with act runs its command) */
function screenRows() {
  const S = B.sim.S, sc = UI.screen;
  if (sc === 'party') return partyRows();
  if (sc === 'camp') return campRows();
  if (sc === 'cast') return castRows();
  if (sc === 'journal') return journalRows();
  if (sc === 'memorize') return memorizeRows();
  if (sc === 'formation') return formationRows();
  if (sc === 'save' || sc === 'load') return slotRows(sc);
  return [];
}
/** the memorize screen: the spells a caster can prepare (its book, or its prayers), ✕ memorizes or forgets one */
function memorizeRows() {
  const S = B.sim.S, idx = S.party.place[UI.mem], m = idx >= 0 ? S.party.roster[idx] : null, rows = [];
  if (!m) return rows;
  const spells = m.cls === 'M' ? m.book : (m.cls === 'C' || m.cls === 'P') ? SPELL_LIST.C.prayer : [];
  if (!spells.length) return [{ id: 'none', label: m.name.split(' ')[0] + ' has no spells to prepare.', act: null, desc: '' }];
  for (const sp of spells) {
    const have = m.prep[B.SPELLS[sp].lvl].includes(sp), lv = B.SPELLS[sp].lvl;
    rows.push({ id: sp, label: (have ? '[x] ' : '[ ] ') + 'L' + lv + ' ' + B.SPELLS[sp].name + '  ' + m.prep[lv].length + '/' + slotsMax(m)[lv], desc: B.SPELLS[sp].text,
      act: () => (have ? forget(m, sp) : memorize(m, sp)) });
  }
  return rows;
}
const SPELL_LIST = B.SPELL_LIST;
/** the formation: six places; ✕ on two swaps them */
function formationRows() {
  const S = B.sim.S, rows = [];
  for (let p = 0; p < 6; p++) { const m = S.party.roster[S.party.place[p]]; rows.push({ id: 'pl' + p, label: (UI.sw === p ? '> ' : '') + 'Place ' + (p + 1) + ': ' + (m ? m.name : '(empty)') + (p < 2 ? '  front' : p < 4 ? '  middle' : '  back'), act: () => { if (UI.sw === undefined) { UI.sw = p; return { ok: true }; } const a = UI.sw; UI.sw = undefined; return B.sim.cmd({ c: 'camp', op: 'swapRows', a, b: p }); }, desc: 'Row 1 melees; row 2 melees with reach; row 3 uses missiles and spells.' }); }
  return rows;
}
/** the save and load slots (the engine's three slots) */
function slotRows(kind) {
  return [0, 1, 2].map(i => ({ id: 'slot' + i, label: 'Slot ' + (i + 1) + ': ' + (game.saves.list && game.saves.list()[i] ? 'saved' : 'empty'), desc: kind === 'save' ? 'Save the game here.' : 'Load the game from here.',
    act: () => { if (kind === 'save') { game.saves.save(i); toast('Saved.'); UI.screen = 'camp'; return { ok: true }; } game.saves.load(i); return { ok: true }; } }));
}
/** the Party screen: the members (tabs), each one's items: the equipment and the pack */
function partyRows() {
  const S = B.sim.S, sel = S.party.sel, m = S.party.roster[S.party.place[sel]];
  const rows = [];
  if (!m) return rows;
  const idx = S.party.place[sel];
  for (const slot of SLOTS) rows.push({ id: 'slot:' + slot, label: slotName(slot) + ': ' + (m.slots[slot] ? B.ITEMS[m.slots[slot].id].name : '-'), act: () => slotAct(idx, slot), desc: m.slots[slot] ? B.ITEMS[m.slots[slot].id].desc : '' });
  m.pack.forEach((it, i) => rows.push({ id: 'pack:' + i, label: 'Pack ' + (i + 1) + ': ' + (it ? (it.n > 1 ? it.n + ' ' : '') + B.ITEMS[it.id].name : '-'), act: () => packAct(idx, i), desc: it ? B.ITEMS[it.id].desc : '' }));
  rows.push({ id: 'sheet', label: 'Sheet: ' + m.name + ' L' + m.lvl + ' ' + B.RACES[m.race].name + ' ' + B.CLASSES[m.cls].name, act: null, desc: 'STR ' + m.stats.str + ' DEX ' + m.stats.dex + ' CON ' + m.stats.con + ' INT ' + m.stats.int + ' WIS ' + m.stats.wis + '   Defense ' + partyDef(m) + '   XP ' + m.xp });
  if (m.npc) rows.push({ id: 'dismiss', label: 'Dismiss ' + m.name.split(' ')[0], act: () => { const r = B.sim.cmd({ c: 'npc', id: m.npc, join: false }); return r; }, desc: 'She goes home, for good.' });
  return rows;
}
const slotName = s => ({ head: 'Head', neck: 'Neck', body: 'Body', arms: 'Arms', main: 'Main hand', off: 'Off hand', ring1: 'Ring', ring2: 'Ring', feet: 'Feet', quiver: 'Quiver' })[s];
/** the slot row: take it into the Hand, or place the Hand's item there */
function slotAct(idx, slot) {
  const S = B.sim.S, p = S.party;
  const r = p.hand ? B.sim.cmd({ c: 'inv', op: 'place', to: { where: 'slot', m: idx, slot } }) : B.sim.cmd({ c: 'inv', op: 'take', from: { where: 'slot', m: idx, slot } });
  return r;
}
/** a pack row: take it into the Hand; with an item in the Hand, place it (a swap) or use the item (□) */
function packAct(idx, i) {
  const p = B.sim.S.party;
  return p.hand ? B.sim.cmd({ c: 'inv', op: 'place', to: { where: 'pack', m: idx, i } }) : B.sim.cmd({ c: 'inv', op: 'take', from: { where: 'pack', m: idx, i } });
}
/** the Camp screen's tiles */
function campRows() {
  const S = B.sim.S, rows = [];
  rows.push({ id: 'rest', label: 'Rest', act: () => B.sim.cmd({ c: 'camp', op: 'rest' }), desc: 'An hour passes every moment. Eight hours refill the spells.' });
  for (const [m, pl] of partyList()) {
    if (m.cls === 'M') rows.push({ id: 'mem' + pl, label: 'Memorize (' + m.name.split(' ')[0] + ')', act: () => { UI.screen = 'memorize'; UI.mem = S.party.place.indexOf(S.party.roster.indexOf(m)); UI.i = 0; return { ok: true }; }, desc: 'Choose what the book holds ready.' });
    if (m.cls === 'C' || m.cls === 'P') rows.push({ id: 'pray' + pl, label: 'Pray (' + m.name.split(' ')[0] + ')', act: () => { UI.screen = 'memorize'; UI.mem = S.party.place.indexOf(S.party.roster.indexOf(m)); UI.i = 0; return { ok: true }; }, desc: 'The prayers to ready.' });
  }
  rows.push({ id: 'eat', label: 'Eat', act: () => B.sim.cmd({ c: 'camp', op: 'eat' }), desc: 'Everyone under sixty percent eats.' });
  rows.push({ id: 'form', label: 'Formation', act: () => { UI.screen = 'formation'; UI.i = 0; return { ok: true }; }, desc: 'Who stands where.' });
  rows.push({ id: 'save', label: 'Save Game', act: () => { UI.screen = 'save'; UI.i = 0; return { ok: true }; }, desc: 'Three slots.' });
  rows.push({ id: 'load', label: 'Load Game', act: () => { UI.screen = 'load'; UI.i = 0; return { ok: true }; }, desc: '' });
  rows.push({ id: 'settings', label: 'Settings', act: () => { game.menu('settings'); return { ok: true }; }, desc: '' });
  rows.push({ id: 'leave', label: 'Leave Camp', act: () => { UI.screen = null; return { ok: true }; }, desc: '' });
  return rows;
}
/** a caster's spells to memorize (their level's slots, the book's spells, the ones ready) */
function castRows() {
  const S = B.sim.S, m = S.party.roster[S.party.place[S.party.sel]], rows = [];
  if (!m) return rows;
  const list = castList(m);
  if (!list.length) return [{ id: 'none', label: 'No spells ready.', act: null, desc: 'Memorize them at camp.' }];
  for (const sp of list) rows.push({ id: sp.id, label: 'L' + sp.lvl + ' ' + sp.name + ' ×' + sp.left, act: () => B.sim.cmd({ c: 'cast', m: S.party.roster.indexOf(m), spell: sp.id, target: sp.target === 'member' ? S.party.roster.indexOf(m) : null }), desc: B.SPELLS[sp.id].text });
  return rows;
}
/** the Journal's tabs: the log, the notes read, the deeds found, the quests */
function journalRows() {
  const S = B.sim.S;
  if (UI.tab === 0) return S.log.slice(-40).reverse().map((l, i) => ({ id: 'log' + i, label: l.text.slice(0, 60), act: null, desc: '' }));
  if (UI.tab === 1) return S.notes.map((n, i) => ({ id: 'note' + i, label: n.id, act: null, desc: n.text }));
  if (UI.tab === 2) return ['SQ1', 'SQ2', 'SQ3'].map(id => ({ id, label: (S.deeds[id] ? '[done] ' : '[ ] ') + (B.DEEDS[id] || id), act: null, desc: '' }));
  return B.QUESTS(S).map((q, i) => ({ id: 'q' + i, label: q, act: null, desc: '' }));
}
/** the focused screen's panel: the title, the tabs, the rows, the description */
function drawScreen(g, r) {
  const sc = UI.screen; if (!sc) return;
  const rows = screenRows(), W = Math.min(r.W - 16, 300), H = Math.min(r.H - 30, 200), x = Math.round((r.W - W) / 2), y = Math.round((r.H - H) / 2);
  E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: UI.dim });
  PANEL(g, x, y, W, H);
  const title = { party: 'PARTY', camp: 'CAMP', cast: 'SPELLS', journal: 'JOURNAL', map: 'MAP', memorize: 'MEMORIZE', formation: 'FORMATION', save: 'SAVE', load: 'LOAD' }[sc] || sc.toUpperCase();
  E.font.text(g, title, x + W / 2, y + 6, '#ffd36a', { align: 'center', scale: 1, outline: '#000' });
  if (sc === 'party') { const S = B.sim.S; for (let pl = 0; pl < 6; pl++) { const i = S.party.place[pl]; if (i < 0) continue; const m = S.party.roster[i]; TXT(g, m.name.split(' ')[0].slice(0, 6), x + 6 + pl * 46, y + 20, pl === S.party.sel ? '#ffd36a' : '#a09888', { font: 'tiny' }); } }
  if (sc === 'journal') ['Log', 'Notes', 'Deeds', 'Quests'].forEach((t, i) => TXT(g, t, x + 8 + i * 70, y + 20, i === UI.tab ? '#ffd36a' : '#a09888', { font: 'tiny' }));
  const top = y + 32, rowH = 12, max = Math.floor((H - 52) / rowH);
  const first = Math.max(0, Math.min(UI.i - max + 1, rows.length - max));
  rows.slice(first, first + max).forEach((row, k) => {
    const idx = first + k, on = idx === UI.i, ry = top + k * rowH;
    if (on) E.ui.box(g, x + 4, ry - 1, W - 8, rowH, { bg: '#3a2e1a', border: '#ffd36a', alpha: .8 });
    TXT(g, row.label, x + 10, ry + 1, on ? '#fff6d8' : '#d8d0c0', { font: 'tiny' });
  });
  const cur = rows[UI.i]; if (cur && cur.desc) TXT(g, cur.desc.slice(0, 84), x + 8, y + H - 16, '#c8c0b0', { font: 'tiny' });
  TXT(g, LBL('confirm') + ' Choose   ' + LBL('cancel') + ' Back', x + W - 6, y + H - 8, '#8a8070', { font: 'tiny', align: 'right' });
}
/** the automap: the seen cells, the stairs, plates, the party's arrow, the walls by their faces */
function drawMap(g, r) {
  const S = B.sim.S, d = curF(), f = curFS(), W = d.rows[0].length, H = d.rows.length;
  const s = Math.max(3, Math.min(10, Math.floor(Math.min((r.W - 40) / W, (r.H - 60) / H))));
  const x0 = Math.round((r.W - W * s) / 2), y0 = Math.round((r.H - H * s) / 2);
  E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .6 });
  E.ui.box(g, x0 - 4, y0 - 4, W * s + 8, H * s + 8, { bg: ['#e8d8b0', '#c8b890'], border: '#6a4a1a', alpha: .95, gradient: false });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!seenAt(x, y)) continue;
    const c = d.rows[y][x], k = key(x, y);
    const wall = c === '#';
    g.fillStyle = wall ? '#4a3a24' : (c === 'O' ? '#2a1a10' : '#e8dcc0');
    if (c === '=' || c === '+' || c === 'L' || c === 'K' || c === 'M' || c === 'H' || c === 'I' || c === 'U') g.fillStyle = f.gates[idAt(x, y)] && f.gates[idAt(x, y)].open ? '#c8b8a0' : '#8a6a4a';
    g.fillRect(x0 + x * s, y0 + y * s, s, s);
    if (c === '>' || c === '<') { g.fillStyle = '#4a7ab0'; g.fillRect(x0 + x * s + 1, y0 + y * s + 1, s - 2, s - 2); }
    if (f.items[k]) { g.fillStyle = '#c8a040'; g.fillRect(x0 + x * s + (s >> 2), y0 + y * s + (s >> 2), Math.max(1, s >> 1), Math.max(1, s >> 1)); }
  }
  for (const w of d.walls || []) { if (!seenAt(w.at[0], w.at[1])) continue; g.fillStyle = '#7a3a2a'; g.fillRect(x0 + w.at[0] * s + (s >> 1) + DX[w.dir] * s / 2 - 1, y0 + w.at[1] * s + (s >> 1) + DY[w.dir] * s / 2 - 1, 2, 2); }
  const p = S.party; g.fillStyle = '#7a1a10'; g.fillRect(x0 + p.cx * s + s / 2 - 2, y0 + p.cy * s + s / 2 - 2, 4, 4);
  g.fillStyle = '#7a1a10'; g.fillRect(x0 + (p.cx + DX[p.dir] * .6) * s + s / 2 - 1, y0 + (p.cy + DY[p.dir] * .6) * s + s / 2 - 1, 2, 2);
  TXT(g, d.name.toUpperCase(), r.W / 2, y0 - 14, '#ffd36a', { align: 'center', font: 'tiny' });
  TXT(g, LBL('cancel') + ' Back', r.W - 6, r.H - 10, '#c8c0b0', { align: 'right', font: 'tiny' });
}
