/* 70-dev: Dev Tools, from the pause menu (never in sessions or the attract mode). Four pages: Cheats, Warp, Give and
 * spawn, Tuning (a live slider for each balance number and Reset to defaults). Controller, keys and mouse. */

const DEV = { open: false, page: 0, row: 0, scroll: 0, spawnType: 'gnasher', spawnRank: 2, hover: -1, msg: '', msgT: 0 };
const DEV_PAGES = ['CHEATS', 'WARP', 'GIVE AND SPAWN', 'TUNING'];
const devNote = m => { DEV.msg = m; DEV.msgT = 2; };
const cheatRow = (label, k) => ({ label, type: 'toggle', get: () => CHEAT[k], set: v => { CHEAT[k] = v; if (v && k !== 'hitboxes' && k !== 'flow' && k !== 'net' && k !== 'bot') RUN.cheated = true; if (k === 'botP1' && PARTY[0]) PARTY[0].bot = v ? makeBot(PARTY[0]) : null; } });
function devRows() {
  const P = DEV.page;
  if (P === 0) return [
    cheatRow('God mode (no damage, no drain)', 'god'), cheatRow('Noclip', 'noclip'), cheatRow('Infinite keys and flasks', 'infinite'), cheatRow('Freeze monsters', 'freeze'),
    cheatRow('One-hit kills', 'onehit'), cheatRow('Generators off', 'noGens'), cheatRow('Show hitboxes', 'hitboxes'), cheatRow('Show flow field', 'flow'),
    cheatRow('Show net stats', 'net'), cheatRow('Show bot thoughts', 'bot'), cheatRow('Bot plays player 1', 'botP1'),
    { label: 'Time scale', type: 'select', opts: [.25, .5, 1, 2], get: () => game.timeScale, set: v => { game.timeScale = v; } }
  ];
  if (P === 1) return [
    ...FLOOR_ORDER.map((id, i) => ({ label: (get('floors', id).no ? 'Floor ' + get('floors', id).no + ': ' : 'Treasure: ') + get('floors', id).name, type: 'action', act: () => devWarp(i) })),
    { label: 'Boss phase 2', type: 'action', act: () => { devWarp(FLOOR_ORDER.length - 1); W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .69; } },
    { label: 'Boss phase 3', type: 'action', act: () => { devWarp(FLOOR_ORDER.length - 1); W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .34; } },
    { label: 'The ending', type: 'action', act: () => { DEV.open = false; game.go('ending', {}); } },
    { label: 'Game over', type: 'action', act: () => { DEV.open = false; for (const h of PARTY) heroFalls(h); } },
    { label: 'Descent II', type: 'action', act: () => { DEV.open = false; RUN.loop = 2; RUN.cheated = true; gotoFloor(0, { card: true }); } },
    { label: 'Restart floor', type: 'action', act: () => devWarp(RUN.floorIdx) }
  ];
  if (P === 2) {
    const h = PARTY[0];
    return [
      { label: '+3 keys', type: 'action', act: () => { h.keys = Math.min(limitOf(h), h.keys + 3); RUN.cheated = true; } },
      { label: '+3 Blast Flasks', type: 'action', act: () => { h.flasks = Math.min(limitOf(h), h.flasks + 3); RUN.cheated = true; } },
      { label: 'Drop a roast', type: 'action', act: () => { dropItem('roast', h.x + 14, h.y); RUN.cheated = true; } },
      { label: 'Drop a spoiled stew', type: 'action', act: () => { dropItem('stew', h.x + 14, h.y); } },
      ...Object.keys(AMULETS).map(k => ({ label: 'Amulet: ' + AMULETS[k].name, type: 'action', act: () => { h.amulet = k; h.amuletT = AMULET_TIME; RUN.cheated = true; } })),
      { label: 'Every special potion', type: 'action', act: () => { for (const k in SPECIALS) h.specials[k] = true; RUN.cheated = true; } },
      { label: '+1000 score', type: 'action', act: () => { h.score += 1000; RUN.cheated = true; } },
      { label: 'Heal the party', type: 'action', act: () => { for (const p of PARTY) if (p.alive) p.hp = Math.max(p.hp, startHealth()); RUN.cheated = true; } },
      { label: 'Monster type', type: 'select', opts: Object.keys(REG.monsters), get: () => DEV.spawnType, set: v => { DEV.spawnType = v; } },
      { label: 'Monster rank', type: 'select', opts: [1, 2, 3], get: () => DEV.spawnRank, set: v => { DEV.spawnRank = v; } },
      { label: 'Spawn 5 here', type: 'action', act: () => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, x = h.x + Math.cos(a) * 40, y = h.y + Math.sin(a) * 40; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) spawnMon(DEV.spawnType, x, y, DEV.spawnRank, { awake: true, emerge: true }); } } },
      { label: 'Spawn a generator here', type: 'action', act: () => { const x = h.x + 30, y = h.y; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) W.gens.push({ id: nid(), type: Object.keys(GEN_CHAR).map(c => GEN_CHAR[c]).find(g => get('gens', g).spawns === DEV.spawnType) || 'den', x, y, r: 7, rank: DEV.spawnRank, rank0: DEV.spawnRank, hp: genMaxHp(DEV.spawnRank), t: 1, kids: 0, shake: 0 }); } },
      { label: 'Kill every monster', type: 'action', act: () => { for (const m of W.mons) killMon(m, null); } },
      { label: 'Destroy every generator', type: 'action', act: () => { for (const g of W.gens) hurtGen(g, 999, null); } },
      { label: 'Open every door', type: 'action', act: () => { for (const g of W.doorGroups) if (!g.open) openDoors(g, null); } },
      { label: 'Reveal secrets', type: 'action', act: () => { for (const f of W.fakes) if (!f.open) { f.open = true; W.map.set(f.cx, f.cy, 0); } } },
      { label: 'Next impatience stage', type: 'action', act: () => { W.t = [TUNE.impatience - 30, TUNE.impatience, TUNE.impatience + 60][Math.min(2, W.stage)] + .01; } },
      { label: 'Start the attract mode now', type: 'action', act: () => { DEV.open = false; game.resume(); startAttract(); } }
    ];
  }
  return [
    ...TUNE_SPEC.map(([k, label, , lo, hi, st]) => ({ label, type: 'slider', lo, hi, st, get: () => TUNE[k], set: v => { setTune(k, v); RUN.cheated = RUN.cheated || TUNE[k] !== TUNE_DEFAULT[k]; } })),
    { label: 'Reset tuning to defaults', type: 'action', act: () => { resetTune(); devNote('TUNING RESET'); } }
  ];
}
function devWarp(i) { DEV.open = false; for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = startHealth(); } } RUN.cheated = true; gotoFloor(i, { card: false }); }
function openDev() { if (SESSION || (SC.play && SC.play.attract) || game.sceneName !== 'play') return; game.resume(); DEV.open = true; DEV.row = 0; game.input.consumeAll(); }

function devUpdate(dt) {
  const I = game.input, rows = devRows(), n = rows.length + 1;   // row 0 is the page tabs
  DEV.msgT -= dt;
  const anyP = a => game.players.some(p => p.pressed(a)), rep = a => game.players.some(p => p.repeat(a, .3, .07));
  if (anyP('cancel') || anyP('pause')) { DEV.open = false; I.consumeAll(); happen('ui', { k: 'back' }); return; }
  if (rep('up')) { DEV.row = (DEV.row + n - 1) % n; happen('ui', { k: 'move' }); }
  if (rep('down')) { DEV.row = (DEV.row + 1) % n; happen('ui', { k: 'move' }); }
  if (anyP('magic')) { DEV.page = (DEV.page + 1) % 4; DEV.row = 0; }
  const lr = rep('left') ? -1 : rep('right') ? 1 : 0;
  // the mouse: hover focuses, a click picks (the tabs, a row, a slider's halves)
  const ptr = I.pointer(), clk = I.clicked(), L = devLayout();
  if (ptr && (ptr[0] !== DEV.px || ptr[1] !== DEV.py)) { DEV.px = ptr[0]; DEV.py = ptr[1]; const hr = devHit(L, ptr); if (hr !== null && hr.row !== undefined) DEV.row = hr.row; }
  if (clk) { const hr = devHit(L, clk); if (hr) { if (hr.tab !== undefined) { DEV.page = hr.tab; DEV.row = 0; } else { DEV.row = hr.row; devAct(rows[hr.row - 1], hr.side || 0, true); } } }
  if (DEV.row === 0) { if (lr) { DEV.page = (DEV.page + 4 + lr) % 4; happen('ui', { k: 'move' }); } return; }
  const row = rows[DEV.row - 1]; if (!row) { DEV.row = 0; return; }
  if (lr) devAct(row, lr, false);
  if (anyP('confirm')) devAct(row, 0, true);
}
function devAct(row, dir, pick) {
  if (!row) return;
  if (row.type === 'toggle' && (pick || dir)) { row.set(!row.get()); happen('ui', { k: 'pick' }); }
  else if (row.type === 'action' && pick) { row.act(); happen('ui', { k: 'pick' }); if (DEV.open) devNote(row.label.toUpperCase()); }
  else if (row.type === 'select') { const o = row.opts, i = o.indexOf(row.get()); row.set(o[(i + (dir || 1) + o.length) % o.length]); happen('ui', { k: 'move' }); }
  else if (row.type === 'slider' && dir) { row.set(row.get() + dir * row.st * (row.hi - row.lo > 100 ? 2 : 1)); happen('ui', { k: 'move' }); }
}
function devLayout(r0) {
  const r = r0 || game.r || { W: 427, H: 240 }, w = Math.min(r.W - 16, 380), x = Math.round((r.W - w) / 2), y = 14, rowH = 12, vis = Math.floor((r.H - y - 52) / rowH);
  return { x, y, w, rowH, vis, tabsY: y + 18, listY: y + 34 };
}
function devHit(L, [px_, py_]) {
  if (py_ >= L.tabsY && py_ < L.tabsY + 12) { const tw = L.w / 4, i = Math.floor((px_ - L.x) / tw); if (i >= 0 && i < 4) return { tab: i, row: 0 }; }
  const i = Math.floor((py_ - L.listY) / L.rowH) + DEV.scroll; const rows = devRows();
  if (py_ >= L.listY && i >= 0 && i < rows.length && px_ > L.x && px_ < L.x + L.w) return { row: i + 1, side: px_ < L.x + L.w * .78 ? -1 : 1 };
  return null;
}
function devDraw(r) {
  r.overlay(g => {
    const L = devLayout(r), rows = devRows(), H = L.vis * L.rowH + 50;
    if (DEV.row > 0) { const ri = DEV.row - 1; if (ri < DEV.scroll) DEV.scroll = ri; if (ri >= DEV.scroll + L.vis) DEV.scroll = ri - L.vis + 1; } else DEV.scroll = 0;
    E.ui.box(g, L.x - 4, L.y - 4, L.w + 8, H + 10, { bg: ['#1a1428', '#0a0812'], border: '#e8c04a' });
    otxt(g, 'DEV TOOLS', L.x + L.w / 2, L.y, '#ffd84a', { align: 'center', scale: 1 });
    DEV_PAGES.forEach((p, i) => { const tw = L.w / 4, on = DEV.page === i; if (on) px.rect(g, L.x + i * tw + 1, L.tabsY - 2, tw - 2, 11, DEV.row === 0 ? '#e8c04a' : '#5a4a2a'); txt(g, p, L.x + i * tw + tw / 2, L.tabsY, on && DEV.row === 0 ? '#1a1020' : '#f0e8d8', { align: 'center' }); });
    for (let k = 0; k < L.vis && k + DEV.scroll < rows.length; k++) {
      const i = k + DEV.scroll, row = rows[i], y = L.listY + k * L.rowH, on = DEV.row === i + 1;
      if (on) px.rect(g, L.x, y - 2, L.w, L.rowH - 1, '#3a2e5a');
      txt(g, row.label, L.x + 6, y, on ? '#ffffff' : '#c8c0d8');
      const vx = L.x + L.w - 6;
      if (row.type === 'toggle') txt(g, row.get() ? 'ON' : 'OFF', vx, y, row.get() ? '#7ae87a' : '#8a8098', { align: 'right' });
      else if (row.type === 'select') txt(g, '< ' + String(row.get()).toUpperCase() + ' >', vx, y, '#ffd84a', { align: 'right' });
      else if (row.type === 'slider') { const v = row.get(), f = (v - row.lo) / (row.hi - row.lo), bw = 70; E.ui.bar(g, vx - bw - 34, y + 1, bw, 5, f, '#e8c04a'); txt(g, String(+v.toFixed(2)), vx, y, '#ffd84a', { align: 'right' }); }
      else txt(g, '▸', vx, y, '#e8c04a', { align: 'right' });
    }
    if (rows.length > L.vis) txt(g, (DEV.scroll + 1) + '-' + Math.min(rows.length, DEV.scroll + L.vis) + ' of ' + rows.length, L.x + L.w - 4, L.y + H - 4, '#8a8098', { align: 'right' });
    const I = game.input;
    txt(g, '↑↓ choose   ←→ change   ' + I.label('confirm') + ' pick   ' + I.label('magic') + ' next page   ' + I.label('cancel') + ' close', L.x + 4, L.y + H - 4, '#a898c8');
    if (DEV.msgT > 0) otxt(g, DEV.msg, L.x + L.w / 2, L.y + H + 10, '#7ae87a', { align: 'center' });
  });
}
