// ---- dev mode (pause menu → Dev mode; standalone only): live tuning sliders, cheats, actions, warps, spawns, debug ----
const DEV = MT.dev = { open_: false, tab: 0, sel: [0, 0, 0, 0, 0, 0], scroll: [0, 0, 0, 0, 0, 0], freeze: true, step: 0, msg: '', msgT: 0, dbg: { hitboxes: false, targets: false, timeline: false, stats: false, doors: false, camera: false }, giveW: 0, giveA: 0, spawnK: 0, spawnN: 0, spawnW: 0, pickK: 0, confirmReset: false };
const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
const CHEAT_LABELS = { god: 'GOD MODE (ALL CONTESTANTS)', infBombs: 'INFINITE SHOWSTOPPERS', oneHit: 'ONE-HIT KILLS', freeze: 'FREEZE ENEMIES', noclip: 'NO CLIP', autopilot: 'AUTOPILOT P1 (THE BOT DRIVES)', botPartner: 'BOT PARTNER', muteHost: 'MUTE HOST CHATTER' };
const SPAWN_WHERE = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], SPAWN_N = [1, 5, 10];
const PICK_KINDS = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life'];
const WARPS = () => ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', 'GR', 'L1', 'L2', 'L3', 'LB',
  'COLD OPEN', 'EPISODE CARD 1', 'EPISODE CARD 2', 'EPISODE CARD 3', 'PRIZE RECAP 1', 'PRIZE RECAP 2', 'PRIZE RECAP 3', 'CONTINUE', 'GAME OVER', 'INITIALS', 'ENDING A', 'ENDING B', 'CREDITS', 'SESSION CARD PREVIEW'];
DEV.isOpen = () => DEV.open_;
DEV.frozen = () => DEV.open_ && DEV.freeze && !DEV.stepping;
DEV.open = () => { if (MT.sessionActive() || !MT.run || MT.run.mode === 'attract') return false; DEV.open_ = true; MT.overlay.open = true; MT.overlay.who = 'dev'; const s = game.scene; if (s) { DEV._pausable = s.pausable; s.pausable = false; } MT.sfx('bell'); return true; };
DEV.close = (quiet) => { if (!DEV.open_) return; DEV.open_ = false; if (MT.overlay.who === 'dev') MT.overlay.open = false; const s = game.scene; if (s && DEV._pausable !== undefined) s.pausable = DEV._pausable; DEV._pausable = undefined; if (!quiet) MT.sfx('back'); };
const say = m => { DEV.msg = m; DEV.msgT = 3; };
const markDev = () => { if (MT.run) MT.run.devTouched = true; };
function rowsFor(tab) {
  const w = PLAY.world;
  if (tab === 0) return [{ kind: 'toggle', label: 'FREEZE THE GAME', get: () => DEV.freeze, set: v => { DEV.freeze = v; } }].concat(TDEF.map(d => ({ kind: 'slider', d, label: d.label, group: d.group }))).concat([{ kind: 'action', label: DEV.confirmReset ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS', fn: () => { if (!DEV.confirmReset) { DEV.confirmReset = true; return; } DEV.confirmReset = false; MT.resetTunes(); say('EVERY TUNING IS BACK TO ITS DEFAULT'); } }]);
  if (tab === 1) return Object.keys(CHEAT_LABELS).map(k => ({ kind: 'toggle', label: CHEAT_LABELS[k], get: () => MT.cheats[k], set: v => { MT.cheats[k] = v; markDev(); if (k === 'botPartner') botPartner(v); } }));
  if (tab === 2) return [
    { kind: 'action', label: 'KILL ALL ENEMIES', fn: () => { game.debug.killAll(); markDev(); } },
    { kind: 'action', label: 'CLEAR THE ROOM (TO THE EXITS)', fn: () => { game.debug.clearRoom(); markDev(); } },
    { kind: 'action', label: 'NEXT ROOM (FIRST EXIT)', fn: () => { nextRoom(); markDev(); } },
    { kind: 'action', label: 'RESTART THE ROOM', fn: () => { if (MT.run && MT.run.roomId) { PLAY.load(MT.run.roomId, w ? w.entry : 'S'); say('ROOM RESTARTED'); } } },
    { kind: 'choice', label: 'GIVE WEAPON', opts: () => ['spread', 'rockets', 'popcorn', 'laser'], idx: () => DEV.giveW, setIdx: i => { DEV.giveW = i; }, fn: () => { game.debug.give(['spread', 'rockets', 'popcorn', 'laser'][DEV.giveW]); markDev(); } },
    { kind: 'choice', label: 'GIVE ADD-ON', opts: () => ['records', 'shield', 'speed'], idx: () => DEV.giveA, setIdx: i => { DEV.giveA = i; }, fn: () => { game.debug.give(['records', 'shield', 'speed'][DEV.giveA]); markDev(); } },
    { kind: 'action', label: '+1 LIFE', fn: () => { game.debug.give('life'); markDev(); } },
    { kind: 'action', label: '+1 SHOWSTOPPER', fn: () => { const c = MT.run.contestants[0]; if (c) c.pr.bombs = Math.min(3, c.pr.bombs + 1); markDev(); } },
    { kind: 'action', label: '+$100,000', fn: () => { const c = MT.run.contestants[0]; if (c) c.pr.cash += 100000; markDev(); } },
    { kind: 'action', label: '+1 GOLDEN KEY', fn: () => { MT.run.keys = (MT.run.keys || 0) + 1; markDev(); } },
    { kind: 'action', label: 'MAX RATINGS', fn: () => { if (w) w.ratings.R = 99; markDev(); } },
    { kind: 'action', label: 'TRIGGER PRIME TIME', fn: () => { if (w) { w.ratings.primeCD = 0; w.startPrime(); } markDev(); } },
    { kind: 'action', label: 'TRIGGER A RATINGS STUNT', fn: () => { if (w) w.stunt(); markDev(); } },
    { kind: 'action', label: 'FRAME STEP (1/30 S)', fn: () => { DEV.step = 1 / 30; } },
    { kind: 'action', label: 'EXPORT TUNING', fn: () => { const j = MT.exportTuning(); say(j); if (typeof console !== 'undefined') console.log('MASH TV tuning:', j); DEV.exported = j; } },
  ];
  if (tab === 3) return WARPS().map(t => ({ kind: 'action', label: MT.ROOMS[t] ? t + '  ' + MT.ROOMS[t].name : t, fn: () => DEV.warp(t) }));
  if (tab === 4) return [
    { kind: 'choice', label: 'ENEMY', opts: () => Object.keys(ENEMIES).filter(k => !ENEMIES[k].child), idx: () => DEV.spawnK, setIdx: i => { DEV.spawnK = i; } },
    { kind: 'choice', label: 'HOW MANY', opts: () => SPAWN_N.map(String), idx: () => DEV.spawnN, setIdx: i => { DEV.spawnN = i; } },
    { kind: 'choice', label: 'WHERE', opts: () => SPAWN_WHERE, idx: () => DEV.spawnW, setIdx: i => { DEV.spawnW = i; } },
    { kind: 'action', label: 'SPAWN!', fn: () => devSpawn() },
    { kind: 'choice', label: 'PICKUP', opts: () => PICK_KINDS, idx: () => DEV.pickK, setIdx: i => { DEV.pickK = i; } },
    { kind: 'action', label: 'DROP PICKUP AT P1', fn: () => { const c = MT.run.contestants[0]; if (w && c) w.addPickup(MT.makePickup(PICK_KINDS[DEV.pickK], c.x + 20, c.y)); markDev(); } },
  ];
  return Object.keys(DEV.dbg).map(k => ({ kind: 'toggle', label: { hitboxes: 'HITBOXES', targets: 'AI TARGETS AND STATES', timeline: 'WAVE TIMELINE', stats: 'STATS (FPS, ENTITIES)', doors: 'DOOR STATES', camera: 'CAMERA BOUNDS' }[k], get: () => DEV.dbg[k], set: v => { DEV.dbg[k] = v; } }));
}
function botPartner(on) {
  const run = MT.run, w = PLAY.world; if (!run) return;
  if (on) { if (run.contestants.some(c => c.devBot)) return; const c = game.debug.addBot(); if (c) { c.devBot = true; } }
  else { const c = run.contestants.find(q => q.devBot); if (c) { E.prune(run.contestants, q => q === c); E.prune(run.players, p => p === c.pr); if (w) E.prune(w.contestants, q => q === c); } }
}
function nextRoom() { const w = PLAY.world; if (!w) return; if (w.phase !== 'EXIT') { game.debug.clearRoom(); w.roomClear(); w.openExits(); } const d = DOOR_IDS.find(k => w.arena.doors[k].state === 'exit' || w.arena.doors[k].isExit); if (d) { w.arena.doors[d].state = 'exit'; w.chooseExit(d, w.contestants[0]); } else if (w.room && (w.room.type === 'boss' || w.room.type === 'bonus')) { w.outcome = { done: true }; } }
function devSpawn() {
  const w = PLAY.world; if (!w) return; const kind = Object.keys(ENEMIES).filter(k => !ENEMIES[k].child)[DEV.spawnK], n = SPAWN_N[DEV.spawnN], where = SPAWN_WHERE[DEV.spawnW];
  if (where === 'reticle') { const m = game.mouseGround() || [AR.CX, AR.CY]; for (let i = 0; i < n; i++) w.spawnEnemy(kind, clamp(m[0] + i * 6, AR.X0 + 8, AR.X1 - 8), clamp(m[1], AR.Y0 + 8, AR.Y1 - 8), { inside: true }); }
  else MT.spawnEntry(w, [where, kind, n, .15]);
  markDev(); say('SPAWNED ' + n + ' ' + kind.toUpperCase());
}
/** warp anywhere: rooms, the Green Room, the Lightning Round, and the scenes */
DEV.warp = (t, o = {}) => {
  DEV.close(true);
  if (!MT.run || MT.run.mode === 'attract') MT.warpRun(Object.assign({ mode: 'rehearsal' }, o));
  MT.run.devTouched = true;
  if (MT.ROOMS[t]) { if (t === 'GR') { MT.run.keys = Math.max(5, MT.run.keys || 0); game.go('play', { room: 'GR', intro: 'greenroom' }); } else game.go('play', { room: t }); return true; }
  const m = /^EPISODE CARD (\d)$/.exec(t), rc = /^PRIZE RECAP (\d)$/.exec(t);
  if (t === 'COLD OPEN') game.go('play', { room: '1-1', intro: 'coldOpen' });
  else if (m) game.go('play', { room: MT.EPISODES[+m[1]].start, intro: 'episode' });
  else if (rc) game.go('recap', { ep: +rc[1], fake: true });
  else if (t === 'CONTINUE') game.go('play', { room: '1-1', after: w => { for (const c of w.contestants) { c.pr.lives = 0; c.state = 'out'; } } });
  else if (t === 'GAME OVER') game.go('gameover', {});
  else if (t === 'INITIALS') game.go('initials', { queue: [{ slot: 0, cash: 123450, input: game.input, name: 'ROCKET' }] });
  else if (t === 'ENDING A') game.go('ending', { kind: 'a' });
  else if (t === 'ENDING B') game.go('ending', { kind: 'b' });
  else if (t === 'CREDITS') game.go('ending', { kind: 'a', credits: true });
  else if (t === 'SESSION CARD PREVIEW') game.go('sessionCard', { preview: true });
  else return false;
  return true;
};
const VISIBLE = 7;
DEV.update = dt => {
  DEV.msgT = Math.max(0, DEV.msgT - dt); DEV.stepping = false;
  if (DEV.step > 0) { DEV.stepping = true; DEV.step = Math.max(0, DEV.step - dt); }
  const nav = UI.nav();
  if (nav.cancel) { DEV.close(); return; }
  if (nav.tabL) { DEV.tab = (DEV.tab + TABS.length - 1) % TABS.length; MT.sfx('page'); DEV.confirmReset = false; }
  if (nav.tabR) { DEV.tab = (DEV.tab + 1) % TABS.length; MT.sfx('page'); DEV.confirmReset = false; }
  const rows = rowsFor(DEV.tab), t = DEV.tab;
  let i = DEV.sel[t] = clamp(DEV.sel[t], 0, rows.length - 1);
  if (nav.up) { i = (i + rows.length - 1) % rows.length; MT.sfx('blip'); }
  if (nav.down) { i = (i + 1) % rows.length; MT.sfx('blip'); }
  // mouse: hover selects, a click on a tab switches, on a slider's bar sets it
  const L = DEV.layout, I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
  if (L) {
    const moved = p && DEV._p && (DEV._p[0] !== p[0] || DEV._p[1] !== p[1]); DEV._p = p ? p.slice() : null;
    if (moved) L.rows.forEach((R, k) => { if (R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h) i = R.idx; });
    if (c) { L.tabs.forEach((R, k) => { if (c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) { DEV.tab = k; } }); }
  }
  DEV.sel[t] = i;
  if (DEV.sel[t] < DEV.scroll[t]) DEV.scroll[t] = DEV.sel[t]; if (DEV.sel[t] >= DEV.scroll[t] + VISIBLE) DEV.scroll[t] = DEV.sel[t] - VISIBLE + 1;
  const row = rows[i]; if (!row) return;
  const wheel = MT.wheelTake ? MT.wheelTake() : 0;
  if (row.kind === 'slider') {
    const d = row.d; let v = MT.T[d.key];
    if (nav.left || wheel < 0) v -= d.step; if (nav.right || wheel > 0) v += d.step;
    if (nav.reset) v = d.def;
    if (L && c) { const R = L.rows.find(q => q && q.idx === i); if (R && R.bar && c[0] >= R.bar.bx - 2 && c[0] <= R.bar.bx + R.bar.bw + 2 && c[1] >= R.y && c[1] < R.y + R.h) v = d.min + (d.max - d.min) * clamp((c[0] - R.bar.bx) / R.bar.bw, 0, 1); }
    if (v !== MT.T[d.key]) { MT.setTune(d.key, v); markDev(); MT.sfx('slider'); }
  } else if (row.kind === 'toggle') { if (nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) { row.set(!row.get()); MT.sfx('bell'); } if (nav.reset) row.set(false); }
  else if (row.kind === 'choice') { const n = row.opts().length; if (nav.left || wheel < 0) row.setIdx((row.idx() + n - 1) % n); if (nav.right || wheel > 0) row.setIdx((row.idx() + 1) % n); if ((nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) && row.fn) { row.fn(); MT.sfx('bell'); } }
  else if (row.kind === 'action') { if (nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) { MT.sfx('bell'); row.fn(); } }
};
DEV.draw = r => {
  r.overlay(g => {
    const t = game.real, x = Math.round(r.W * .55) - 4, w = r.W - x - 4, y = 4, h = r.H - 8;
    px.blend(g, .93, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
    px.rect(g, x, y, w, 1, '#ff9a3c'); px.rect(g, x, y, 1, h, '#ff9a3c');
    UI.text(g, 'DEV MODE', x + 6, y + 3, '#ff9a3c'); UI.text(g, DEV.freeze ? 'FROZEN' : 'LIVE', x + 12 + UI.width('DEV MODE'), y + 3, DEV.freeze ? '#2ee6ff' : '#3aff6a');
    const L = DEV.layout = { tabs: [], rows: [] };
    let tx = x + 4; TABS.forEach((T2, k) => { const tw2 = UI.width(T2) * 0 + Math.floor((w - 8) / TABS.length); const R = { x: tx, y: y + 13, w: tw2 - 1, h: 11 }; L.tabs.push(R); px.rect(g, R.x, R.y, R.w, R.h, k === DEV.tab ? '#ff9a3c' : '#2a1446'); UI.text(g, T2.slice(0, Math.max(4, Math.floor(tw2 / 4))), R.x + R.w / 2, R.y + 2, k === DEV.tab ? '#140a24' : '#c9b6e4', { align: 'center', shadow: false, font: 'tiny' }); tx += tw2; });
    const rows = rowsFor(DEV.tab), s0 = DEV.scroll[DEV.tab], rh = Math.floor((h - 64) / VISIBLE);
    let lastGroup = null;
    for (let k = s0; k < Math.min(rows.length, s0 + VISIBLE); k++) {
      const row = rows[k], R = { x: x + 4, y: y + 28 + (k - s0) * rh, w: w - 8, h: rh - 2, idx: k }, f = DEV.sel[DEV.tab] === k;
      if (row.kind === 'slider') {
        const d = row.d, v = MT.T[d.key], changed = v !== d.def;
        R.bar = UI.slider(g, R, (row.group !== lastGroup ? row.group + ': ' : '') + d.label, v, d.min, d.max, f, t, (changed ? '*' : '') + (+v.toFixed(2)));
        lastGroup = row.group;
      } else {
        if (f) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
        UI.text(g, row.label, R.x + 6, R.y + Math.round(R.h / 2 - 3), f ? '#ffcc33' : '#fff7e8');
        if (row.kind === 'toggle') { const on = row.get(); px.rect(g, R.x + R.w - 26, R.y + R.h / 2 - 4, 20, 8, on ? '#3aff6a' : '#3a2a50'); px.rect(g, R.x + R.w - (on ? 13 : 25), R.y + R.h / 2 - 3, 6, 6, '#fff7e8'); }
        if (row.kind === 'choice') UI.text(g, '< ' + String(row.opts()[row.idx()]).toUpperCase() + ' >', R.x + R.w - 6, R.y + Math.round(R.h / 2 - 3), '#2ee6ff', { align: 'right' });
      }
      L.rows.push(R);
    }
    if (rows.length > VISIBLE) { const sh = h - 64, kk = s0 / Math.max(1, rows.length - VISIBLE); px.rect(g, x + w - 3, y + 28, 2, sh, '#2a1446'); px.rect(g, x + w - 3, y + 28 + Math.round(kk * (sh - 12)), 2, 12, '#ff9a3c'); }
    if (DEV.msgT > 0) FONT.wrap(DEV.msg, w - 12, { font: 'tiny' }).slice(0, 3).forEach((ln, k) => UI.text(g, ln, x + 6, y + h - 34 + k * 7, '#3aff6a', { font: 'tiny' }));
    const I = UI.lastInput();
    MT.glyph.prompt(g, x + w / 2, y + h - 13, [['tabL', ''], ['tabR', 'TAB'], ['confirm', 'DO'], ['reset', 'RESET'], ['cancel', 'CLOSE']], I, { align: 'center', gap: 4 });
  });
};
/** debug overlays drawn over the world (hitboxes, AI targets, the wave timeline, stats, doors, camera bounds) */
DEV.drawWorld = (r, w) => {
  if (!w) return;
  const D = DEV.dbg;
  if (D.hitboxes) { r.decal(() => { for (const c of w.contestants) r.groundRing(c.x, c.y, c.r, '#3aff6a', 1); for (const e of w.enemies) r.groundRing(e.x, e.y, e.r, '#ff3344', 1); for (const t of w.targets) r.groundRing(t.x, t.y, t.r, '#ffcc33', 1); if (w.boss) for (const q of w.boss.hitList()) r.groundRing(q.x, q.y, q.r, '#ff9a3c', 1); for (const b of w.fShots.list) r.groundRing(b.x, b.y, b.r, '#ffffff', 1); }); }
  r.overlay(g => {
    let y = 60;
    const line = (s, c = '#3aff6a') => { UI.text(g, s, 4, y, c, { font: 'tiny' }); y += 7; };
    if (D.targets) for (const e of w.enemies) { const [sx, sy] = r.w(e.x, e.y, 30); UI.text(g, e.kind + ':' + e.state, sx, sy, '#ff9a3c', { align: 'center', font: 'tiny' }); if (e.target) { const [tx2, ty2] = r.w(e.target.x, e.target.y, 0), [ex, ey] = r.w(e.x, e.y, 0); px.line(g, ex, ey, tx2, ty2, '#ff3344'); } }
    if (D.timeline) { line('PHASE ' + w.phase + ' ' + w.phaseT.toFixed(1)); line('WAVE ' + w.wave + '/' + ((w.room && w.room.waves) ? w.room.waves.length : 0) + ' ALIVE ' + w.countedAlive() + ' PENDING ' + w.arena.pendingSpawns()); line('SPAWNED ' + w.wavesSpawned + ' R ' + w.ratings.R.toFixed(1)); }
    if (D.stats) { line('FPS ' + game.fps + ' STEPS ' + (game.stats.steps || 0) + ' ITEMS ' + (game.stats.items || 0)); line('ENEMIES ' + w.enemies.length + ' FOE SHOTS ' + w.fShots.list.length + ' MY SHOTS ' + w.pShots.list.length); line('PARTICLES ' + game.particles.list.length + ' PICKUPS ' + w.pickups.length); }
    if (D.doors) for (const id of DOOR_IDS) { const d = w.arena.doors[id], D2 = DOORS[id], [sx, sy] = r.w(D2.x, D2.y, 30); UI.text(g, id + ' ' + d.state + ' q' + d.queue.length, sx, sy, '#2ee6ff', { align: 'center', font: 'tiny' }); }
    if (D.camera) { const a = r.w(0, 0, 0), b = r.w(368, 240, 0); px.line(g, a[0], a[1], b[0], a[1], '#ff2e88'); px.line(g, a[0], b[1], b[0], b[1], '#ff2e88'); px.line(g, a[0], a[1], a[0], b[1], '#ff2e88'); px.line(g, b[0], a[1], b[0], b[1], '#ff2e88'); line('ZOOM ' + game.zoom.toFixed(2) + ' OFFSET ' + game.cam.offset, '#ff2e88'); }
  });
};
