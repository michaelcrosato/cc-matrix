// ============================================================================================================
// REWIRED • 04 inside: the detail's office and its case board (TAPE TWO), the wire room's calls and pages
// (TAPE THREE), the stash house search (end of TAPE FOUR). Interiors are small TileMaps; the boards are canvas UI
// sized for a TV: big cards, one focus, d-pad / stick / mouse hover / click all move it.
// ============================================================================================================

// ---- a walkable interior: a Mover, the cast standing about, interactables -----------------------------------------
function makeWalker(x, y) { const m = new E.Mover({ x, y, r: 5, walk: 50, run: 70, sprintSpeed: 90 }); m.facing = -Math.PI / 2; return m; }
function walkerTick(m, rig, map, dt, locked) {
  const mv = I.move(), g = game.view.screenDirToGround(mv[0], mv[1]);
  m.update(dt, map, { move: locked ? [0, 0] : g, sprint: I.down('sprint') });
  rig.update(dt, m.rigState({}));
}
function drawWalker(r, m, rig) { r.shadow(m.x, m.y, 7, .35); r.actor(m.x, m.y, m.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { color: '#e8c060' } }); }
function standActor(id, x, y, facing, label) { const a = new Actor(id, x, y, { facing, label }); a.static = false; return a; }

// ---- the case board -------------------------------------------------------------------------------------------------
const BOARD_SLOTS = [
  { id: 'DEACON', name: 'DARNELL "DEACON" PRICE', sub: 'Never on the street', col: 1, row: 0, pts: 0 },
  { id: 'TAY', name: 'TAVON "TAY" RUCKER', sub: 'Lieutenant', col: 1, row: 1, parent: 'DEACON' },
  { id: 'MOE', name: 'LITTLE MOE', sub: 'Shift boss', col: 1, row: 2, parent: 'TAY' },
  { id: 'HOUSE', name: '1419 LORRAINE', sub: 'Stash house', col: 2, row: 2, parent: 'TAY' },
  { id: 'JUNEBUG', name: 'JUNEBUG', sub: 'Hopper: the money', col: 0, row: 3, parent: 'MOE' },
  { id: 'SQUEAK', name: 'SQUEAK', sub: 'Runner: the vials', col: 1, row: 3, parent: 'MOE' },
  { id: 'LOOKOUTS', name: 'KEVO AND DRE', sub: 'Lookouts', col: 2, row: 3, parent: 'MOE' }
];
const CARD_RULES = { h2h1: ['JUNEBUG'], h2h2: ['JUNEBUG'], stash: ['SQUEAK'], collect: ['MOE', 'TAY'], tay: ['TAY'], pigeon: ['DEACON'], house: ['HOUSE'], lookouts: ['LOOKOUTS'] };
const CARD_PTS = { h2h1: 10, h2h2: 10, stash: 15, collect: 20, tay: 10, pigeon: 15, house: 20, lookouts: 5 };
const PC_NEED = 60;
const BOARD = { open: false, cards: [], placed: {}, focus: 'tray', ti: 0, si: 0, held: null, msg: null, msgT: 0, done: false, demo: false };
function boardOpen(demo) {
  BOARD.open = true; BOARD.demo = !!demo; BOARD.done = false; BOARD.placed = {}; BOARD.held = null; BOARD.focus = 'tray'; BOARD.ti = 0; BOARD.si = 0; BOARD.msg = null;
  BOARD.cards = (demo ? ['h2h1', 'h2h2', 'stash', 'collect', 'tay', 'pigeon', 'house', 'lookouts'] : CASE.evidence.filter(id => CARD_RULES[id])).map(id => ({ id, on: null }));
  CASE.pc = 0;
}
function boardSlotRect(r, s) {
  const W = r.W, H = r.H, top = 30, bottomTray = 86, rows = 4, rowH = Math.floor((H - top - bottomTray) / rows), cw = Math.min(118, Math.floor((W - 40) / 3) - 8), ch = Math.min(rowH - 8, 40);
  const cx = W / 2 + (s.col - 1) * (cw + 16);
  return { x: Math.round(cx - cw / 2), y: Math.round(top + s.row * rowH + (rowH - ch) / 2), w: cw, h: ch };
}
function boardCardRect(r, i, n) {
  const W = r.W, H = r.H, cw = Math.min(84, Math.floor((W - 20) / Math.max(1, n)) - 6), ch = 40, total = n * (cw + 6) - 6;
  return { x: Math.round(W / 2 - total / 2 + i * (cw + 6)), y: H - 84, w: cw, h: ch };
}
function boardTick(dt, r) {
  if (BOARD.msgT > 0) BOARD.msgT -= dt;
  const free = BOARD.cards.filter(c => !c.on);
  const pointer = I.pointer(), click = I.clicked();
  // mouse hover moves the focus; a click picks
  if (r && pointer && I.lastDevice === 'mouse') {
    free.forEach((c, i) => { const q = boardCardRect(r, i, free.length); if (hit(pointer, q.x, q.y, q.w, q.h) && !BOARD.held) { BOARD.focus = 'tray'; BOARD.ti = i; } });
    BOARD_SLOTS.forEach((s, i) => { const q = boardSlotRect(r, s); if (hit(pointer, q.x, q.y, q.w, q.h) && BOARD.held) { BOARD.focus = 'slots'; BOARD.si = i; } });
  }
  let confirm = I.pressed('confirm') || I.pressed('interact');
  if (click && r) {
    let onSomething = false;
    free.forEach((c, i) => { const q = boardCardRect(r, i, free.length); if (hit(click, q.x, q.y, q.w, q.h)) { onSomething = true; if (!BOARD.held) { BOARD.ti = i; BOARD.focus = 'tray'; confirm = true; } } });
    BOARD_SLOTS.forEach((s, i) => { const q = boardSlotRect(r, s); if (hit(click, q.x, q.y, q.w, q.h) && BOARD.held) { onSomething = true; BOARD.si = i; BOARD.focus = 'slots'; confirm = true; } });
    const jb = judgeButton(r); if (jb && hit(click, jb.x, jb.y, jb.w, jb.h)) { boardToJudge(); return; }
    if (!onSomething && BOARD.held) { BOARD.held = null; BOARD.focus = 'tray'; }
  }
  if (I.pressed('notes') && CASE.pc >= PC_NEED) { boardToJudge(); return; }
  if (BOARD.focus === 'tray') {
    if (I.repeat('left')) { BOARD.ti = Math.max(0, BOARD.ti - 1); A.sfx('select'); }
    if (I.repeat('right')) { BOARD.ti = Math.min(free.length - 1, BOARD.ti + 1); A.sfx('select'); }
    BOARD.ti = clamp(BOARD.ti, 0, Math.max(0, free.length - 1));
    if (confirm && free[BOARD.ti]) { BOARD.held = free[BOARD.ti]; BOARD.focus = 'slots'; A.sfx('confirm'); BOARD.si = BOARD_SLOTS.findIndex(s => !BOARD.placed[s.id]); if (BOARD.si < 0) BOARD.si = 0; }
    if (I.pressed('cancel')) { BOARD.open = false; A.sfx('cancel'); }
  } else {
    const cur = BOARD_SLOTS[BOARD.si];
    const move = (dc, dr) => {
      let best = -1, bd = 1e9;
      BOARD_SLOTS.forEach((s, i) => { if (i === BOARD.si) return; const ddc = s.col - cur.col, ddr = s.row - cur.row; if ((dc && Math.sign(ddc) !== dc) || (dr && Math.sign(ddr) !== dr)) return; const d = Math.abs(ddc) * (dc ? 1 : 3) + Math.abs(ddr) * (dr ? 1 : 3); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { BOARD.si = best; A.sfx('select'); }
    };
    if (I.repeat('left')) move(-1, 0); if (I.repeat('right')) move(1, 0); if (I.repeat('up')) move(0, -1); if (I.repeat('down')) move(0, 1);
    if (confirm && BOARD.held) boardPlace(BOARD.held, BOARD_SLOTS[BOARD.si]);
    if (I.pressed('cancel')) { BOARD.held = null; BOARD.focus = 'tray'; A.sfx('cancel'); }
  }
}
function boardPlace(card, slot) {
  const ok = CARD_RULES[card.id].includes(slot.id);
  if (ok) {
    card.on = slot.id; (BOARD.placed[slot.id] = BOARD.placed[slot.id] || []).push(card.id);
    CASE.pc += CARD_PTS[card.id]; A.sfx('pin');
    BOARD.msg = ['FELD', E.pick(['That holds.', 'Good. That\'s a line a judge can follow.', 'Pin it.', 'OK. That\'s probable cause, a piece of it.'])];
  } else {
    CASE.pc = Math.max(0, CASE.pc - 5); A.sfx('wrong');
    BOARD.msg = ['FELD', E.pick(['No. A defense attorney eats that for lunch.', 'That picture doesn\'t say what you want it to say.', 'Doesn\'t hold. Try again.'])];
  }
  BOARD.msgT = 2.6; BOARD.held = null; BOARD.focus = 'tray'; BOARD.ti = 0;
  if (BOARD.cards.every(c => c.on)) { BOARD.done = true; if (!BOARD.demo) game.after(1, boardToJudge); }
}
function judgeButton(r) { if (CASE.pc < PC_NEED || BOARD.demo) return null; return { x: r.W - 128, y: 6, w: 120, h: 18 }; }
function boardToJudge() {
  if (BOARD.demo || BOARD.toJudge) return;
  BOARD.toJudge = true;
  BOARD.open = false;
  convo([
    ['FELD', ['Probable cause at ' + Math.round(CASE.pc) + '. Necessity: you can\'t get to Deacon any other way, and you can prove it. I\'ll walk it over.']],
    ['JUDGE', ['Ms. Feld. Detective. I\'ve read it.', 'Hand-to-hands, a stash, a lieutenant. Thin at the top. It always is.', 'Thirty days. Minimize what you should minimize. One sloppy call and I pull it.']],
    ['FELD', ['Which line do you want up, Kowal?'], { choices: ['The payphone on Lorraine', 'Tay\'s cell'], onChoice: c => { CASE.line = c === 0 ? 'payphone' : 'cell'; } }]
  ], () => {
    convo([[ 'BRIGGS', CASE.line === 'payphone' ? ['The payphone. Old school. They think a phone with no name on it is a phone nobody\'s listening to.'] : ['Tay\'s cell. He swaps it every few weeks. We\'ll hear him until he gets smart.'] ]], () => { BOARD.toJudge = false; chapterDone(2); });
  });
}
function drawBoard(r) {
  if (!BOARD.open) return;
  r.overlay(g => {
    // cork and frame
    px.rect(g, 0, 0, r.W, r.H, '#5a3a22');
    for (let y = 0; y < r.H; y += 2) for (let x = (y / 2) % 2; x < r.W; x += 3) if (E.hash2(x, y) > .7) px.dot(g, x, y, E.hash2(y, x) > .5 ? '#7a5232' : '#4a2e1a');
    px.rect(g, 0, 0, r.W, 4, '#2a1a10'); px.rect(g, 0, r.H - 4, r.W, 4, '#2a1a10');
    E.font.text(g, 'THE BOARD  •  PROBABLE CAUSE', 10, 8, '#f0e0c0', { shadow: '#000', outline: false });
    E.ui.bar(g, 10, 19, 140, 6, Math.min(1, CASE.pc / 100), CASE.pc >= PC_NEED ? '#60d070' : '#e0a040');
    px.rect(g, 10 + Math.round(140 * PC_NEED / 100), 17, 1, 10, '#f0f0f0');
    E.font.text(g, Math.round(CASE.pc) + ' / ' + PC_NEED + ' to see a judge', 156, 19, '#f0e0c0', { font: 'tiny', outline: false });
    const jb = judgeButton(r);
    if (jb) { E.ui.box(g, jb.x, jb.y, jb.w, jb.h, { bg: ['#2a5a2a', '#1a3a1a'], border: '#a0f0a0' }); E.font.text(g, 'TO THE JUDGE', jb.x + jb.w / 2 + 6, jb.y + 6, '#e0ffe0', { align: 'center', outline: false }); badge(g, 'notes', jb.x + 4, jb.y + 4); }
    // the red string from each placed slot to its parent
    for (const s of BOARD_SLOTS) {
      if (!s.parent || !BOARD.placed[s.id]) continue;
      const a = boardSlotRect(r, s), b = boardSlotRect(r, BOARD_SLOTS.find(x => x.id === s.parent));
      px.line(g, a.x + a.w / 2, a.y, b.x + b.w / 2, b.y + b.h, '#c82a2a', 1);
    }
    // slots
    BOARD_SLOTS.forEach((s, i) => {
      const q = boardSlotRect(r, s), placed = BOARD.placed[s.id], foc = BOARD.focus === 'slots' && BOARD.si === i;
      px.rect(g, q.x + 2, q.y + 2, q.w, q.h, '#2a1a10');
      px.rect(g, q.x, q.y, q.w, q.h, placed ? '#f0ece0' : '#c8bca0');
      px.rect(g, q.x + 3, q.y + 3, 26, q.h - 6, '#3a3a40');
      const rig = CAST[s.id] ? CAST[s.id].rig : s.id === 'LOOKOUTS' ? CAST.KEVO.rig : null;
      if (rig && (placed || s.id !== 'DEACON')) rig.drawPortrait(g, q.x + 3, q.y + 3, Math.min(26, q.h - 6), { zoom: 2.2, bg: '#3a3a40', tint: placed ? undefined : '#707070' });
      else if (s.id === 'DEACON') E.font.text(g, '?', q.x + 16, q.y + q.h / 2 - 7, '#8a8a8a', { align: 'center', scale: 2, outline: false });
      else if (s.id === 'HOUSE') { px.rect(g, q.x + 7, q.y + 12, 18, 14, '#6a5a50'); px.rect(g, q.x + 13, q.y + 18, 5, 8, '#8a6a3c'); }
      E.font.text(g, s.name, q.x + 32, q.y + 5, '#141414', { font: 'tiny', outline: false });
      E.font.text(g, s.sub, q.x + 32, q.y + 13, '#5a5a5a', { font: 'tiny', outline: false });
      if (placed) E.font.text(g, placed.length + ' PINNED', q.x + 32, q.y + q.h - 9, '#2a6a2a', { font: 'tiny', outline: false });
      px.disc(g, q.x + q.w / 2, q.y + 1, 2, '#d82a2a');
      if (foc) { const c = Math.floor(game.real * 6) % 2 ? '#ffe060' : '#ffffff'; px.rect(g, q.x - 2, q.y - 2, q.w + 4, 1, c); px.rect(g, q.x - 2, q.y + q.h + 1, q.w + 4, 1, c); px.rect(g, q.x - 2, q.y - 2, 1, q.h + 4, c); px.rect(g, q.x + q.w + 1, q.y - 2, 1, q.h + 4, c); }
    });
    // the tray of evidence cards
    const free = BOARD.cards.filter(c => !c.on);
    px.blend(g, .5, 'normal', () => px.rect(g, 0, r.H - 86, r.W, 82, '#000000'));
    free.forEach((c, i) => {
      const q = boardCardRect(r, i, free.length), foc = BOARD.focus === 'tray' && BOARD.ti === i, held = BOARD.held === c, ev = EVIDENCE[c.id];
      const y = q.y - (foc || held ? 4 : 0);
      px.rect(g, q.x, y, q.w, q.h, held ? '#fff8d0' : '#e8e4dc'); px.rect(g, q.x + 2, y + 2, q.w - 4, 18, '#2a2a30');
      const who = CAST[ev.who] ? CAST[ev.who].rig : null; if (who) who.drawPortrait(g, q.x + 2, y + 2, 18, { zoom: 1.6, bg: '#2a2a30' }); else E.font.text(g, '?', q.x + 11, y + 6, '#8a8a8a', { align: 'center', outline: false });
      const lines = wrapText(ev.name.toUpperCase(), q.w - 4, { font: 'tiny' }).slice(0, 2);
      lines.forEach((l, k) => E.font.text(g, l, q.x + 3, y + 24 + k * 7, '#141414', { font: 'tiny', outline: false }));
      if (foc) { px.rect(g, q.x - 1, y - 1, q.w + 2, 1, '#ffe060'); px.rect(g, q.x - 1, y + q.h, q.w + 2, 1, '#ffe060'); }
    });
    const cur = BOARD.held || free[BOARD.ti];
    if (cur) E.font.text(g, EVIDENCE[cur.id].text, r.W / 2, r.H - 40, '#f0ece0', { align: 'center', shadow: '#000', outline: false });
    if (!free.length) E.font.text(g, 'Every card is on the board.', r.W / 2, r.H - 60, '#f0ece0', { align: 'center', shadow: '#000', outline: false });
    const items = BOARD.held ? [['#↑↓←→', 'Choose a name'], ['confirm', 'Pin it'], ['cancel', 'Put back']] : [['#← →', 'Choose a card'], ['confirm', 'Pick up'], ['cancel', 'Step back']];
    promptRow(g, items, r.W / 2, r.H - 22);
    if (BOARD.msg && BOARD.msgT > 0) { const w = E.font.width(BOARD.msg[1]) + 50; E.ui.box(g, r.W / 2 - w / 2, r.H / 2 - 12, w, 22, { bg: ['#141414', '#0a0a0a'], border: '#d8b860', alpha: .92 }); CAST.FELD.rig.drawPortrait(g, r.W / 2 - w / 2 + 3, r.H / 2 - 10, 18, { zoom: 1.6 }); E.font.text(g, BOARD.msg[1], r.W / 2 - w / 2 + 26, r.H / 2 - 5, '#f0ece0', { outline: false }); }
  });
}

// ---- the office scene ----------------------------------------------------------------------------------------------------------
const OF = { me: null, rig: CAST.KOWAL.rig, npcs: [], stage: 0, ending: false };
const office = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.8, 2], start: 1.25 },
  enter(data = {}) { sceneReset();
    OF.ending = data.mode === 'ending'; OF.demo = !!data.demo;
    OF.me = makeWalker(OFFICE.door.x, OFFICE.door.y - 12);
    OF.npcs = [standActor('MABRY', OFFICE.mabry.x, OFFICE.mabry.y, Math.PI, 'LT. MABRY'), standActor('BRIGGS', OFFICE.briggs.x, OFFICE.briggs.y, Math.PI / 2, 'BRIGGS')];
    OF.npcs.push(OF.ending ? standActor('HASKINS', OFFICE.feld.x, OFFICE.feld.y, Math.PI, 'DEP. OPS HASKINS') : standActor('FELD', OFFICE.feld.x, OFFICE.feld.y, Math.PI, 'ASA FELD'));
    OF.stage = 0; game.cam.bounds = v => OFFICE.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = OF.ending ? .45 : .7;
    music(OF.ending ? 'ending' : 'office');
    if (OF.ending) { CASE.chapter = 5; setObjective('Face the brass', 'Deputy Ops Haskins came down to the basement. That never means good news.'); }
    else { CASE.chapter = 2; setObjective('Talk to Lt. Mabry', 'The lieutenant wants a board. Feld wants paper.'); }
    if (OF.demo) { boardOpen(true); OF.demoT = 0; }
  },
  exit() { game.lights.enabled = false; BOARD.open = false; },
  update(dt) {
    toastTick(dt);
    if (OF.demo) { if (demoInputBreak()) return; boardDemoTick(dt); return; }
    if (notesTick()) return;
    if (BOARD.open) { boardTick(dt, RW()); return; }
    if (talkTick(dt)) { OF.rig.update(dt, OF.me.rigState({})); for (const a of OF.npcs) a.update(dt, null); return; }
    walkerTick(OF.me, OF.rig, OFFICE.map, dt, false);
    for (const a of OF.npcs) { a.update(dt, null); if (E.dist(a, OF.me) < 50) a.face(OF.me); }
    if (I.pressed('view')) game.nextView();
    if (I.pressed('notes') && !IN_HUB) { NOTES.open = true; }
    const it = officeInteract();
    if (it && I.pressed('interact')) it.fn();
    game.focus(OF.me.x, OF.me.y, 12);
  },
  draw(r) {
    OFFICE.map.drawFloor(r); OFFICE.map.queueWalls(r);
    for (const [id, x, y, f] of OFFICE.dress) r.shape(id, x, y, 0, { facing: f });
    // the board on the north wall: cork, photos, string
    const b = OFFICE.board;
    r.queue(b.x, b.y, 0, g => {
      const p0 = r.w(b.x - 30, b.y - 9, 30), p1 = r.w(b.x + 30, b.y - 9, 30), p2 = r.w(b.x + 30, b.y - 9, 12), p3 = r.w(b.x - 30, b.y - 9, 12);
      px.poly(g, [p0, p1, p2, p3], '#8a5a32');
      for (let i = 0; i < 7; i++) { const t = (i + .5) / 7, q = r.w(b.x - 26 + 52 * t, b.y - 9, 18 + (i % 3) * 4); px.rect(g, q[0] - 2, q[1] - 2, 4, 4, '#e8e4dc'); }
    }, { bias: -2 });
    for (let i = 0; i < 3; i++) r.prop('lamp', 3 * T + i * 4 * T, 1 * T + 6, 30, { light: true, size: .6 });
    game.lights.add(7 * T, 5 * T, 40, 160, .6, { color: '#e8f0ff' });
    for (const a of OF.npcs) { a.draw(r); drawTag(r, a, a.label, '#c8c4bc'); }
    drawWalker(r, OF.me, OF.rig);
    const it = officeInteract();
    if (setting('hints', true) && !OF.demo) { const mk = officeMarker(); if (mk) r.marker(mk.x, mk.y, 34, { label: mk.label }); }
    drawToasts(r);
    r.overlay(g => {
      if (OF.demo) { drawDemoBanner(g, r); return; }
      drawHudObjective(g, r);
      const items = []; if (it) items.push(['interact', it.label]); items.push(['notes', 'Notes']);
      if (!BOARD.open) promptRow(g, items, r.W / 2, r.H - 22);
    });
    drawBoard(r);
    talk.draw(r);
    drawNotes(r);
  }
};
function officeMarker() {
  if (OF.ending) return OF.stage === 0 ? { x: OF.npcs[2].x, y: OF.npcs[2].y, label: 'HASKINS' } : null;
  if (OF.stage === 0) return { x: OFFICE.mabry.x, y: OFFICE.mabry.y, label: 'MABRY' };
  if (OF.stage === 1) return { x: OFFICE.board.x, y: OFFICE.board.y + 6, label: 'THE BOARD' };
  return null;
}
function officeInteract() {
  const me = OF.me;
  if (OF.ending) { if (OF.stage === 0 && E.dist(me, OF.npcs[2]) < 34) return { label: 'Talk to Haskins', fn: endingTalk }; return null; }
  if (OF.stage === 0 && E.dist(me, OF.npcs[0]) < 30) return { label: 'Talk to Mabry', fn: mabryBrief };
  if (OF.stage >= 1 && Math.hypot(me.x - OFFICE.board.x, me.y - OFFICE.board.y) < 30) return { label: 'Work the board', fn: () => { boardOpen(false); A.sfx('confirm'); } };
  if (E.dist(me, OF.npcs[1]) < 26) return { label: 'Talk to Briggs', fn: () => say('BRIGGS', E.pick([['Forty-one years and I still can\'t make that coffee taste like coffee.'], ['Pin the money to the top. Always the money. The dope just tells you where the money\'s standing.'], ['Feld\'s good. Feld\'s scary good. Don\'t tell her I said it.']])) };
  if (E.dist(me, OF.npcs[2]) < 26) return { label: 'Talk to Feld', fn: () => say('FELD', ['Show me who does what and who answers to who. Every card goes where a judge can see why.']) };
  return null;
}
function mabryBrief() {
  OF.stage = 1;
  convo([
    ['MABRY', ['Good work on the street. Now the boring part, which is the only part that counts.', 'Feld needs probable cause for a wiretap. Put every picture where it belongs on the board.']],
    ['FELD', ['Who sells, who runs, who collects, who owns it. Pin it to the right name or I can\'t use it.', 'Get me to sixty and I can take it to Judge Talbot.']],
    ['KOWAL', ['And Deacon?']],
    ['MABRY', ['Deacon\'s a question mark with a lawyer. Find me something that points at him and pin it at the top.']]
  ], () => { setObjective('Build the board', 'Pin each card to the name it proves. ' + PC_NEED + ' points of probable cause gets you to the judge.'); autosave(); });
}
function boardDemoTick(dt) {
  OF.demoT += dt;
  OF.rig.update(dt, OF.me.rigState({}));
  if (OF.demoT > .9 && !BOARD.done) {
    OF.demoT = 0;
    const c = BOARD.cards.find(x => !x.on);
    if (c) boardPlace(c, BOARD_SLOTS.find(s => s.id === CARD_RULES[c.id][0]));
  }
  game.focus(OF.me.x, OF.me.y, 12);
  demoTick(dt);
}

// ---- the ending: the brass want dope on the table --------------------------------------------------------------------------------
function endingTalk() {
  OF.stage = 1;
  convo([
    ['HASKINS', ['Lieutenant. Detectives. I hear you\'ve got four bricks and a sixteen-year-old.', 'The Deputy Commissioner wants the bricks on a table Friday. Cameras. Flag behind the table. A good week for the department.']],
    ['MABRY', ['We\'ve got a ledger with a "D" in it, a courier\'s car on a Deacon lot, and a live wire. Sixty more days and we\'re in the money.']],
    ['HASKINS', ['Sixty days is a lot of overtime for a letter of the alphabet.', 'Detective Kowal. You\'re the one who stood on the corner. You tell me.'], { choices: ['Put it on the table', 'Follow the money'], onChoice: c => { CASE.ending = c === 0 ? 'table' : 'money'; } }]
  ], () => {
    const tail = CASE.ending === 'table'
      ? [['HASKINS', ['Smart. Friday, nine a.m. Wear a tie, Lieutenant.']], ['BRIGGS', ['{c=#8a8a9a}(quietly){/c} Wire comes down Monday. You know that.']]]
      : [['HASKINS', ['...Thirty days. Not sixty. And if the stats dip on the west side, it\'s your pension, Cedric, not mine.']], ['MABRY', ['Thirty days. We\'ll take it.']]];
    convo(tail, () => game.go('montage', {}));
  });
}

// ---- the wire room: calls, minimization, tags, pages -----------------------------------------------------------------------------
// each call: the parties, its lines; pert: the line is about the business; key: tagging it logs intel; priv: a lawyer's
// call (privileged: minimize at once)
const CALLS = [
  { from: 'JUNEBUG', to: 'CALLER', toName: 'TASHA', lines: [
    ['CALLER', 'Your mother called me. You forgot her birthday again.'], ['JUNEBUG', 'I ain\'t forget. I\'m getting her something.'],
    ['CALLER', 'Getting her something. From where, the corner store?'], ['JUNEBUG', 'Man, it\'s a cake. A real one. With the writing on it.'],
    ['CALLER', 'You better be at that table Sunday.'], ['JUNEBUG', 'I\'ll be there. I swear on everything.'] ] },
  { from: 'MOE', to: 'TAY', lines: [
    ['MOE', 'Yo. It\'s me.', 1], ['TAY', 'Talk.', 1], ['MOE', 'We light. Real light. Corner\'s gonna be dry by Thursday.', 1, 'The corner runs dry by Thursday'],
    ['TAY', 'Thing comes Thursday night. Same as always. Don\'t call this number no more.', 1, 'Re-up: Thursday night'], ['MOE', 'Aight.', 1] ] },
  { from: 'SQUEAK', to: 'CALLER', toName: 'COUSIN', lines: [
    ['SQUEAK', 'Nah you got cheated, that game is broke, the goalie don\'t even move.'], ['CALLER', 'You just mad you lost.'],
    ['SQUEAK', 'I ain\'t lost, I got cheated. Big difference.'], ['CALLER', 'Come over Thursday, I\'ll beat you again.'],
    ['SQUEAK', 'Can\'t Thursday. Moe got me sitting the house on Lorraine all night.', 1, 'Squeak sits 1419 Lorraine on Thursday'],
    ['SQUEAK', 'Gotta stay up with the thing till Tay come back.', 1, 'Tay brings the package to the house'] ] },
  { page: '2160', answer: '2340', intel: 'The meet: 11:40 PM', hint: 'Tay pages Moe a time.' },
  { from: 'CALLER', fromName: 'MR. EARL', to: 'CALLER', toName: 'MR. LEON', lines: [
    ['CALLER', 'You see the game last night? Bullpen gave it away in the eighth.'], ['CALLER', 'Every year. Every year they break my heart in August.'],
    ['CALLER', 'My grandson says they gonna be good in two years.'], ['CALLER', 'Your grandson said that two years ago.'],
    ['CALLER', 'Ha. Yeah. Yeah he did.'] ] },
  { from: 'TAY', to: 'PRUITT', lines: [
    ['PRUITT', 'You the one called?', 1], ['TAY', 'Usual time. You know the box.', 1],
    ['PRUITT', 'Which box. I ain\'t been down there since the summer.', 1], ['TAY', 'The box on Lorraine and Fulton. Corner by the bus stop.', 1, 'The meet: payphone at Lorraine and Fulton'],
    ['PRUITT', 'He coming?', 1], ['TAY', 'He don\'t come. He never come. Just bring it.', 1, 'Deacon stays away from the package'] ] },
  { page: '0368', answer: '0148', intel: 'The box: 555-0148, confirmed', hint: 'The payphone\'s last four digits.' },
  { from: 'CALLER', fromName: 'BRENNAN & ASSOC.', to: 'TAY', priv: true, lines: [
    ['CALLER', 'Mr. Rucker, this is the office of Saul Brennan, attorney at law. Please hold for Mr. Brennan.', 0],
    ['CALLER', 'Tavon. About that matter we discussed. I need you to listen carefully.', 0], ['TAY', 'I\'m listening.', 0],
    ['CALLER', 'Do not, under any circumstances, discuss the car lot on a telephone.', 0] ] }
];
const MIN_LIMIT = 6, PRIV_LIMIT = 2.5, SPOT_LEN = 3, SPOT_WAIT = 2.5, LINE_T = 3.1;
const WR = { i: 0, call: null, li: 0, lt: 0, state: 'idle', listenT: 0, minT: 0, spotT: 0, pert: false, tags: [], entry: '', tries: 0, msg: null, msgT: 0, done: false, gap: 0, demo: false, shown: 0, logged: [], foc: 0 };
function wireReset(demo) { Object.assign(WR, { i: 0, call: null, li: 0, lt: 0, state: 'idle', listenT: 0, minT: 0, spotT: 0, pert: false, entry: '', tries: 0, msg: null, msgT: 0, done: false, gap: 2, demo: !!demo, shown: 0, logged: [], foc: 0 }); }
function wireNext() {
  if (WR.i >= CALLS.length) { WR.done = true; WR.state = 'done'; return; }
  WR.call = CALLS[WR.i++]; WR.li = 0; WR.lt = 0; WR.listenT = 0; WR.minT = 0; WR.spotT = 0; WR.pert = false; WR.shown = 0; WR.entry = ''; WR.tries = 0; WR.logged = [];
  if (WR.call.page) { WR.state = 'page'; A.sfx('pager'); } else { WR.state = 'ring'; WR.ringT = 1.2; A.sfx('ring'); }
}
function wireMsg(t, c = '#f0ece0') { WR.msg = [t, c]; WR.msgT = 2.4; }
function wireViolation(why) {
  CASE.violations++; A.sfx('wrong'); wireMsg('VIOLATION: ' + why, '#ff6040');
  game.shake && game.shake(1);
  if (CASE.violations >= 3 && !WR.demo) { WR.state = 'pulled'; game.after(2, () => game.go('gameover', { why: 'wire', retry: { scene: 'wire' } })); }
}
function wireTick(dt, r) {
  if (WR.msgT > 0) WR.msgT -= dt;
  const c = WR.call;
  if (WR.state === 'idle' || WR.state === 'between') { WR.gap -= dt; if (WR.gap <= 0) wireNext(); return; }
  if (WR.state === 'done' || WR.state === 'pulled') return;
  if (WR.state === 'ring') { WR.ringT -= dt; if (WR.ringT <= 0) { WR.state = 'listen'; A.sfx('tape'); } return; }
  if (WR.state === 'page') { pageTick(dt, r); return; }
  // the call plays on whether or not we listen: lines advance on the clock
  const line = c.lines[WR.li];
  WR.lt += dt;
  const listening = WR.state === 'listen' || WR.state === 'spot';
  if (line) {
    const len = line[1].length, typed = Math.min(len, Math.floor(WR.lt * 30));
    if (listening && typed > WR.shown) { if (typed - WR.shown >= 2 || typed === len) { voiceBlip(line[0] === 'CALLER' ? 'CALLER' : line[0], line[1][typed - 1] || 'a', .05); WR.shown = typed; } }
    if (listening && line[2]) WR.pert = true;
    if (WR.lt > Math.max(LINE_T, len / 30 + 1.2)) { WR.li++; WR.lt = 0; WR.shown = 0; if (WR.li >= c.lines.length) { wireEndCall(); return; } }
  }
  if (WR.state === 'listen') {
    WR.listenT += dt;
    if (c.priv && WR.listenT > PRIV_LIMIT) { wireViolation('a privileged call. Lawyers are off limits.'); WR.state = 'min'; WR.minT = 0; WR.privHit = true; }
    else if (!c.priv && !WR.pert && WR.listenT > MIN_LIMIT) { wireViolation('a personal call, past the minimization limit.'); WR.state = 'min'; WR.minT = 0; }
  } else if (WR.state === 'min') { WR.minT += dt; }
  else if (WR.state === 'spot') { WR.spotT -= dt; if (WR.pert) { WR.state = 'listen'; wireMsg('Pertinent. Back on it.', '#60f080'); } else if (WR.spotT <= 0) { WR.state = 'min'; WR.minT = 0; } }
  // input: tag, minimize, spot check (buttons and clicks)
  let tag = I.pressed('interact') || I.pressed('confirm'), mini = I.pressed('act2'), click = I.clicked();
  if (click && r) { const B = wireButtons(r); for (const b of B) if (hit(click, b.x, b.y, b.w, b.h)) { if (b.id === 'tag') tag = true; if (b.id === 'min') mini = true; } }
  if (WR.demo) { tag = false; mini = false; const ln = c.lines[WR.li]; if (WR.state === 'listen' && ln && ln[3] && WR.lt > 1.2 && !WR.logged.includes(WR.li)) tag = true; if (WR.state === 'listen' && !WR.pert && WR.listenT > 3) mini = true; if (WR.state === 'min' && WR.minT > SPOT_WAIT + .2 && !c.priv) tag = true; }
  if (WR.state === 'listen' && tag) {
    const ln = c.lines[WR.li];
    if (ln && ln[3] && !WR.logged.includes(WR.li)) { WR.logged.push(WR.li); if (!CASE.intel.includes(ln[3])) CASE.intel.push(ln[3]); A.sfx('pin'); wireMsg('LOGGED: ' + ln[3], '#60f080'); }
    else { CASE.tagsWasted++; A.sfx('cancel'); wireMsg('Nothing worth logging in that line.', '#c8c4bc'); }
  } else if (WR.state === 'min' && tag) {
    if (WR.minT >= SPOT_WAIT && !c.priv) { WR.state = 'spot'; WR.spotT = SPOT_LEN; A.sfx('click'); }
    else if (c.priv) wireMsg('Privileged. Stay off it.', '#ff8060'); else wireMsg('Spot check in ' + Math.ceil(SPOT_WAIT - WR.minT) + '...', '#c8c4bc');
  }
  if ((WR.state === 'listen' || WR.state === 'spot') && mini) { WR.state = 'min'; WR.minT = 0; A.sfx('click'); if (WR.pert && !c.priv) wireMsg('Minimized a pertinent call. You\'ll miss what they say.', '#f0a040'); }
}
function wireEndCall() {
  const c = WR.call;
  // missed intel stays missed; a call ends with a note in the log
  const keys = c.lines.filter(l => l[3]).length, got = WR.logged.length;
  if (keys && got < keys) wireMsg('Call ended. ' + (keys - got) + ' pertinent line' + (keys - got > 1 ? 's' : '') + ' not logged.', '#f0a040');
  else if (!keys && !c.priv) wireMsg('Call ended. Properly minimized.', '#c8c4bc');
  WR.state = 'between'; WR.gap = 1.8; A.sfx('click');
}
const KEYPAD = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
function pageTick(dt, r) {
  const c = WR.call;
  let digit = null;
  DIGIT_ACTS.forEach((a, d) => { if (I.pressed(a)) digit = String(d); });
  const kx = WR.foc % 3, ky = Math.floor(WR.foc / 3);
  if (I.repeat('left')) WR.foc = ky * 3 + (kx + 2) % 3; if (I.repeat('right')) WR.foc = ky * 3 + (kx + 1) % 3;
  if (I.repeat('up')) WR.foc = ((ky + 3) % 4) * 3 + kx; if (I.repeat('down')) WR.foc = ((ky + 1) % 4) * 3 + kx;
  const pointer = I.pointer(), click = I.clicked();
  if (r) for (let i = 0; i < 12; i++) { const q = keypadRect(r, i); if (pointer && I.lastDevice === 'mouse' && hit(pointer, q.x, q.y, q.w, q.h)) WR.foc = i; if (click && hit(click, q.x, q.y, q.w, q.h)) { WR.foc = i; digit = keypadPress(i); } }
  if (I.pressed('confirm') || I.pressed('interact')) digit = keypadPress(WR.foc);
  if (I.pressed('cancel') || I.pressed('act2')) { WR.entry = WR.entry.slice(0, -1); A.sfx('cancel'); }
  if (WR.demo && game.time % .8 < dt) digit = c.answer[WR.entry.length];
  if (digit === 'del') { WR.entry = WR.entry.slice(0, -1); A.sfx('cancel'); digit = null; }
  if (digit && /\d/.test(digit) && WR.entry.length < 4) { WR.entry += digit; A.sfx('blip'); }
  if (WR.entry.length === 4) {
    if (WR.entry === c.answer) { if (!CASE.intel.includes(c.intel)) CASE.intel.push(c.intel); A.sfx('powerup'); wireMsg('DECODED: ' + c.intel, '#60f080'); WR.state = 'between'; WR.gap = 2.2; }
    else { WR.tries++; A.sfx('wrong'); wireMsg(WR.tries >= 3 ? 'Briggs: "Try ' + c.answer.slice(0, 2) + '.. Mirror it, Dana."' : 'That number doesn\'t mean anything. Mirror the keypad.', '#f0a040'); WR.entry = WR.tries >= 3 ? c.answer.slice(0, 2) : ''; }
  }
}
function keypadPress(i) { const k = KEYPAD[Math.floor(i / 3)][i % 3]; return k === '*' || k === '#' ? 'del' : k; }
function keypadRect(r, i) { const s = 26, x0 = Math.round(r.W / 2 + 30), y0 = Math.round(r.H / 2 - 56); return { x: x0 + (i % 3) * (s + 4), y: y0 + Math.floor(i / 3) * (s + 4), w: s, h: s }; }
function wireButtons(r) {
  const y = r.H - 46, w = 110;
  return [{ id: 'tag', x: Math.round(r.W / 2 - w - 8), y, w, h: 18, act: 'interact', label: WR.state === 'min' ? 'SPOT-CHECK' : 'TAG LINE' }, { id: 'min', x: Math.round(r.W / 2 + 8), y, w, h: 18, act: 'act2', label: 'MINIMIZE' }];
}
function mirrorDigit(d) { return { 1: '3', 3: '1', 4: '6', 6: '4', 7: '9', 9: '7' }[d] || d; }
const wire = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso'], camera: false,
  enter(data = {}) { sceneReset();
    CASE.chapter = 3; wireReset(!!data.demo); WR.intro = !data.demo;
    game.cam.bounds = v => BASEMENT.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .4; music('wire');
    WR.me = new Actor('KOWAL', BASEMENT.seatA.x, BASEMENT.seatA.y, { facing: -Math.PI / 2 }); WR.me.pose = 'kneel';
    WR.br = new Actor('BRIGGS', BASEMENT.seatB.x, BASEMENT.seatB.y, { facing: -Math.PI / 2 }); WR.br.pose = 'kneel';
    setObjective('Work the wire', 'Log what matters. Minimize what doesn\'t. Decode the pages.');
    if (!data.demo) {
      WR.state = 'intro';
      convo([
        ['BRIGGS', ['Rules of the room. A call comes in, you listen. If it ain\'t about the business, you minimize: ' + keyLabel('act2') + '.', 'You got about two minutes on the tape. Call it six seconds of your life. Go past that on a call about somebody\'s mama, that\'s a violation.']],
        ['BRIGGS', ['Minimized, you can spot-check after a bit with ' + keyLabel('interact') + '. If it turned dirty, stay on it.', 'When they say something worth having, tag the line with ' + keyLabel('interact') + '. Three violations and Talbot pulls the plug.']],
        ['BRIGGS', ['And lawyers. A lawyer calls, you get off that line like it\'s on fire.', 'Their pagers: they mirror the keypad. One and three swap, four and six, seven and nine. The middle column stays.']]
      ], () => { WR.state = 'idle'; WR.gap = 1; });
    }
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    toastTick(dt);
    if (WR.demo) { if (demoInputBreak()) return; }
    else { if (notesTick()) return; if (talkTick(dt)) { WR.me.update(dt, null); WR.br.update(dt, null); return; } if (I.pressed('notes') && !IN_HUB) NOTES.open = true; }
    if (WR.state !== 'intro') wireTick(dt, RW());
    WR.me.update(dt, null); WR.br.update(dt, null);
    game.focus(5 * T, 3 * T, 10);
    if (WR.done && !WR.leaving && !WR.demo) {
      WR.leaving = true;
      const need = ['The meet: 11:40 PM', 'The meet: payphone at Lorraine and Fulton'];
      const ok = need.every(n => CASE.intel.includes(n));
      convo([['BRIGGS', ok ? ['Eleven-forty, the box at Lorraine and Fulton, Thursday. Tay meets the courier himself.', 'That\'s the re-up. That\'s our night.'] : ['We got pieces. Thursday. Lorraine. Not the hour, not the spot, not all of it.', 'Mabry wants to go anyway. We sit on the payphone and hope.']],
        ['KOWAL', ['Thursday night. Bring coffee.']]], () => { WR.leaving = false; chapterDone(3); });
    }
    if (WR.demo) demoTick(dt);
  },
  draw(r) {
    BASEMENT.map.drawFloor(r); BASEMENT.map.queueWalls(r);
    for (const [id, x, y, f] of BASEMENT.dress) r.shape(id, x, y, 0, { facing: f });
    r.prop('lamp', 5 * T, 1 * T + 4, 28, { light: true, size: .6 });
    game.lights.add(3 * T, 2 * T, 20, 50, .5, { color: '#60f0a0' }); game.lights.add(6.5 * T, 2 * T, 20, 50, .5, { color: '#60f0a0' });
    WR.me.draw(r); WR.br.draw(r);
    drawToasts(r);
    r.overlay(g => drawWireUi(g, r));
    talk.draw(r);
    drawNotes(r);
  }
};
function drawWireUi(g, r) {
  if (WR.demo) drawDemoBanner(g, r); else drawHudObjective(g, r);
  const c = WR.call, W = r.W, H = r.H;
  // violations and logged counts
  E.ui.box(g, W - 118, 6, 112, 26, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .85 });
  E.font.text(g, 'VIOLATIONS', W - 112, 10, '#8a8a9a', { font: 'tiny', outline: false });
  for (let i = 0; i < 3; i++) px.rect(g, W - 56 + i * 12, 9, 9, 7, i < CASE.violations ? '#e0a03a' : '#3a3a48');
  E.font.text(g, 'LOGGED  ' + CASE.intel.length, W - 112, 20, '#60f080', { font: 'tiny', outline: false });
  if (!c || WR.state === 'intro') return;
  const pw = Math.min(360, W - 24), ph = 118, x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2 - 14);
  if (WR.state === 'page') { drawPager(g, r, c); return; }
  if (WR.state === 'done') { panel(g, x, y, pw, 50, 'LINE QUIET'); E.font.text(g, 'No more calls tonight.', x + 10, y + 26, '#c8c4bc', { outline: false }); return; }
  const lineName = CASE.line === 'cell' ? 'TAY\'S CELL • 443-555-0172' : 'PAYPHONE • LORRAINE & FULTON • 555-0148';
  panel(g, x, y, pw, ph, lineName);
  const fromN = c.fromName || c.from, toN = c.toName || c.to;
  E.font.text(g, (WR.state === 'ring' ? 'INCOMING  ' : 'CALL  ') + String(fromN) + '  →  ' + String(toN), x + 10, y + 21, '#a8a49c', { font: 'tiny', outline: false });
  // the reels turn while the tape rolls
  const live = WR.state === 'listen' || WR.state === 'spot';
  for (const k of [0, 1]) { const cx = x + pw - 40 + k * 18, cy = y + 24, a = game.real * (live ? 6 : 1.5); px.disc(g, cx, cy, 6, '#2a2a30'); px.disc(g, cx, cy, 5, '#5a5a62'); px.dot(g, Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 3), '#141414'); px.dot(g, Math.round(cx - Math.cos(a) * 3), Math.round(cy - Math.sin(a) * 3), '#141414'); }
  if (WR.state === 'ring') { E.font.text(g, 'RING... RING...', x + pw / 2, y + 56, '#f0d060', { align: 'center', scale: 2, outline: false }); return; }
  // the transcript: the current line typed, the last line above it
  if (live) {
    const ln = c.lines[WR.li], prev = c.lines[WR.li - 1];
    if (prev) E.font.text(g, nameOf(prev[0], c) + ': ' + prev[1], x + 10, y + 32, '#6a6a72', { outline: false, wrap: pw - 20 });
    if (ln) {
      const txt = ln[1].slice(0, Math.min(ln[1].length, Math.floor(WR.lt * 30)));
      E.font.text(g, nameOf(ln[0], c), x + 10, y + 52, '#d8b860', { outline: false });
      let yy = y + 62; for (const l of wrapText(txt, pw - 20)) { E.font.text(g, l, x + 10, yy, '#f0ece0', { outline: false, shadow: '#000' }); yy += 10; }
      if (WR.logged.includes(WR.li)) E.font.text(g, 'LOGGED', x + pw - 12, y + 52, '#60f080', { align: 'right', font: 'tiny', outline: false });
    }
    // the minimization clock: fills on a call that hasn't turned pertinent
    const lim = c.priv ? PRIV_LIMIT : MIN_LIMIT, k = WR.pert && !c.priv ? 0 : Math.min(1, WR.listenT / lim);
    E.font.text(g, WR.pert && !c.priv ? 'PERTINENT • LISTEN FREELY' : 'MINIMIZATION CLOCK', x + 10, y + ph - 14, WR.pert && !c.priv ? '#60f080' : '#8a8a9a', { font: 'tiny', outline: false });
    if (!(WR.pert && !c.priv)) E.ui.bar(g, x + 100, y + ph - 15, pw - 112, 6, k, k > .75 ? '#ff5040' : '#e0c050');
    if (WR.state === 'spot') E.font.text(g, 'SPOT-CHECK ' + Math.ceil(WR.spotT), x + pw - 12, y + 21, '#60c0f0', { align: 'right', font: 'tiny', outline: false });
  } else if (WR.state === 'min') {
    E.font.text(g, 'MINIMIZED', x + pw / 2, y + 50, '#8a8a9a', { align: 'center', scale: 2, outline: false });
    E.font.text(g, c.priv ? 'Privileged call. Stay off the line.' : WR.minT < SPOT_WAIT ? 'Spot-check allowed in ' + Math.ceil(SPOT_WAIT - WR.minT) + ' s' : 'Spot-check allowed', x + pw / 2, y + 74, '#c8c4bc', { align: 'center', outline: false });
    for (let i = 0; i < 24; i++) px.rect(g, x + pw / 2 - 48 + i * 4, y + 90 - (E.hash2(i, Math.floor(game.real * 8)) * 6 | 0), 2, 1 + (E.hash2(i, Math.floor(game.real * 8)) * 6 | 0), '#3a3a48');
  }
  // the buttons: big, labelled with the player's own keys
  for (const b of wireButtons(r)) {
    const active = (b.id === 'tag' && (live || WR.state === 'min')) || (b.id === 'min' && live);
    E.ui.box(g, b.x, b.y, b.w, b.h, { bg: active ? ['#2a2a3a', '#1a1a24'] : ['#141418', '#101014'], border: active ? '#d8b860' : '#3a3a48' });
    badge(g, b.act, b.x + 4, b.y + 4);
    E.font.text(g, b.id === 'tag' ? (WR.state === 'min' ? 'SPOT-CHECK' : 'TAG LINE') : 'MINIMIZE', b.x + 20, b.y + 6, active ? '#f0ece0' : '#5a5a62', { outline: false });
  }
  if (WR.msg && WR.msgT > 0) E.font.text(g, WR.msg[0], W / 2, H - 22, WR.msg[1], { align: 'center', shadow: '#000', outline: false });
}
function nameOf(id, c) { if (id === 'CALLER') return (c.from === 'CALLER' ? c.fromName : c.toName) || 'CALLER'; return id === 'TAY' ? 'TAY' : id; }
function drawPager(g, r, c) {
  const W = r.W, H = r.H, x = Math.round(W / 2 - 170), y = Math.round(H / 2 - 64);
  panel(g, x, y, 190, 128, 'PAGE INTERCEPTED');
  px.rect(g, x + 12, y + 26, 166, 30, '#2a3a2a'); px.rect(g, x + 14, y + 28, 162, 26, '#8aa878');
  E.font.text(g, c.page, x + 95, y + 33, '#1a2a1a', { align: 'center', scale: 2, outline: false });
  E.font.text(g, c.hint, x + 12, y + 62, '#c8c4bc', { outline: false, wrap: 166 });
  E.font.text(g, 'DECODED', x + 12, y + 86, '#8a8a9a', { font: 'tiny', outline: false });
  for (let i = 0; i < 4; i++) { px.rect(g, x + 12 + i * 22, y + 94, 18, 20, '#141418'); E.font.text(g, WR.entry[i] || '', x + 21 + i * 22, y + 98, '#f0d060', { align: 'center', scale: 2, outline: false }); }
  // the keypad, with the mirror shown as arrows
  for (let i = 0; i < 12; i++) {
    const q = keypadRect(r, i), k = KEYPAD[Math.floor(i / 3)][i % 3], foc = WR.foc === i;
    E.ui.box(g, q.x, q.y, q.w, q.h, { bg: foc ? ['#4a4a5a', '#2a2a3a'] : ['#2a2a30', '#18181e'], border: foc ? '#ffe060' : '#4a4a5a' });
    E.font.text(g, k === '*' || k === '#' ? '←' : k, q.x + q.w / 2, q.y + 6, '#f0ece0', { align: 'center', scale: 2, outline: false });
    if (/[1346 79]/.test(k) && k !== ' ') E.font.text(g, mirrorDigit(k), q.x + q.w - 3, q.y + q.h - 8, '#6a6a72', { align: 'right', font: 'tiny', outline: false });
  }
  const kq = keypadRect(r, 0);
  E.font.text(g, 'MIRROR: 1-3  4-6  7-9', kq.x, kq.y - 10, '#d8b860', { font: 'tiny', outline: false });
  promptRow(g, [['#0-9', 'Type'], ['confirm', 'Press key'], ['cancel', 'Delete']], W / 2, H - 22);
  if (WR.msg && WR.msgT > 0) E.font.text(g, WR.msg[0], W / 2, H - 38, WR.msg[1], { align: 'center', shadow: '#000', outline: false });
}

// ---- the stash house: search it in the dark ------------------------------------------------------------------------------------------
const SH = { me: null, holdT: 0, target: null, searched: [], squad: [] };
const stash = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.8, 2], start: 1.3 },
  enter() { sceneReset();
    SH.me = makeWalker(STASH.entry.x, STASH.entry.y - 8); SH.searched = []; SH.holdT = 0;
    SH.squad = STASH.squad.map((p, i) => { const a = new Actor('raid' + i, p.x, p.y, { look: { build: 'heroic', outfit: 'coat', hat: { style: 'helmet', color: '#1a1a22' }, weapon: 'gun', colors: { coat: '#1a2448', cloth: '#2a2a34', pants: '#1a1a2a', metal: '#2a2a2a' } } }); a.point = true; a.facing = -Math.PI / 2 + i; return a; });
    game.cam.bounds = v => STASH.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .18; music('night');
    setObjective('Search 1419 (0/2)', 'Hold ' + keyLabel('interact') + ' to search. The package and anything with Deacon on it.');
    say('BRIGGS', ['House is clear. One kid in custody, one out the window. Find me that package before somebody calls the news.'], { auto: 3.5, modal: false });
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    toastTick(dt);
    if (notesTick()) return;
    if (talkTick(dt)) { SH.me && OF.rig.update(dt, SH.me.rigState({})); return; }
    const near = STASH.spots.filter(s => !SH.searched.includes(s.id) && Math.hypot(s.x - SH.me.x, s.y - SH.me.y) < 22).sort((a, b) => Math.hypot(a.x - SH.me.x, a.y - SH.me.y) - Math.hypot(b.x - SH.me.x, b.y - SH.me.y))[0];
    SH.target = near || null;
    const holding = near && I.down('interact');
    walkerTick(SH.me, CAST.KOWAL.rig, STASH.map, dt, holding);
    if (holding) { SH.holdT += dt; if (SH.holdT > 1.3) { stashSearch(near); SH.holdT = 0; } } else SH.holdT = 0;
    if (I.pressed('view')) game.nextView();
    if (I.pressed('notes') && !IN_HUB) NOTES.open = true;
    for (const a of SH.squad) a.update(dt, null);
    game.focus(SH.me.x, SH.me.y, 12);
  },
  draw(r) {
    STASH.map.drawFloor(r); STASH.map.queueWalls(r);
    for (const d of STASH.dress) { if (d[0] === 'prop') r.prop(d[1], d[2], d[3], 0, d[4]); else r.shape(d[1], d[2], d[3], 0, d[4]); }
    const m = SH.me, f = m.facing;
    game.lights.add(m.x + Math.cos(f) * 30, m.y + Math.sin(f) * 30, 12, 60, 1, { color: '#fff4d0' });
    game.lights.add(m.x, m.y, 20, 26, .5, { color: '#fff4d0' });
    for (const a of SH.squad) { a.draw(r); const c = Math.cos(a.facing), s = Math.sin(a.facing); game.lights.add(a.x + c * 26, a.y + s * 26, 12, 40, .7, { color: '#e8f0ff' }); }
    drawWalker(r, m, CAST.KOWAL.rig);
    for (const s of STASH.spots) if (!SH.searched.includes(s.id)) r.textAt(s.x, s.y, 20, '•', '#f0d060');
    drawToasts(r);
    r.overlay(g => {
      drawHudObjective(g, r);
      const items = [];
      if (SH.target) items.push(['interact', 'Hold: search the ' + SH.target.name.toLowerCase()]);
      items.push(['notes', 'Notes']);
      promptRow(g, items, r.W / 2, r.H - 22);
      if (SH.holdT > 0) E.ui.bar(g, r.W / 2 - 40, r.H - 34, 80, 4, SH.holdT / 1.3, '#f0d060');
    });
    talk.draw(r); drawNotes(r);
  }
};
function stashSearch(s) {
  SH.searched.push(s.id); A.sfx(s.holds ? 'secret' : 'bump');
  if (s.holds) { addEvidence(s.holds); CASE[s.holds] = true; toast('EVIDENCE', EVIDENCE[s.holds].name); }
  say('KOWAL', [s.note]);
  const found = (hasEv('package') ? 1 : 0) + (hasEv('ledger') ? 1 : 0);
  setObjective('Search 1419 (' + found + '/2)', 'Hold ' + keyLabel('interact') + ' to search.');
  if (found >= 2) game.after(.4, () => { talk.open ? null : null; const go = () => convo([['MABRY', ['{c=#d8b860}[RADIO]{/c} Package. Ledger. Good. Wrap it up, Kowal. The brass already heard.']]], () => chapterDone(4)); if (talk.open) { const od = talk.onDone; talk.onDone = () => { if (od) od(); go(); }; } else go(); });
}
