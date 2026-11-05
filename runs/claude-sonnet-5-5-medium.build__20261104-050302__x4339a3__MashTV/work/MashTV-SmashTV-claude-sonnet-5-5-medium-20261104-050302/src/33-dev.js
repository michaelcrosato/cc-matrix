// MASH TV: dev mode (pause menu -> DEV MODE). Live tuning sliders with reset, cheats, actions, warp, spawn, debug overlays. Standalone only.
MT.dbg = { hitboxes: false, ai: false, waves: false, stats: false, doors: false, camera: false };
MT.cheatsReset = () => { for (const k in MT.cheats) MT.cheats[k] = false; };
MT.wheel = 0;
const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
const ORDER = ['playerSpeed', 'fireRate', 'bulletSpeed', 'dmgMul', 'slideSpeed', 'slideCooldown', 'invulnTime', 'hpPerLife', 'startLives', 'puDuration', 'enemySpeed', 'enemyHp', 'enemyBulletSpeed', 'contactDmg', 'waveSize', 'spawnGap', 'bossHp', 'dropMul', 'cashMul', 'ratingsGain', 'ratingsDecay', 'primeTime', 'camZoom', 'shakeMul', 'timeScale'];
const WARPS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', 'greenroom', 'L1', 'L2', 'L3', 'LB', 'coldopen', 'ep1', 'ep2', 'ep3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'initials', 'endinga', 'endingb', 'credits', 'card'];
class Dev {
  constructor() { this.tab = 0; this.sel = 0; this.page = 0; this.rects = []; this.tabRects = []; this.confirmT = 0; this.exportText = ''; this.spawn = { kind: 0, n: 1, where: 0, pick: 0, w: 0, a: 0 }; this.frozen = true; this.holdT = 0; }
  get w() { return MT.worldNow; }
  rows() {
    const w = this.w, T = MT.T, D = MT.TDEF, rows = [];
    const slider = k => ({ type: 'slider', key: k, label: D[k][4], get: () => T[k], def: D[k][0], min: D[k][2 - 1], max: D[k][2], step: D[k][3], set: v => { MT.setTune(k, v); if (MT.run) MT.run.devTouched = MT.run.devTouched || false; }, reset: () => MT.resetTune(k) });
    const tog = (label, o, key, fn) => ({ type: 'toggle', label, get: () => !!o[key], set: v => { o[key] = v; if (fn) fn(v); if (MT.run && v) MT.run.devTouched = true; } });
    const act = (label, fn) => ({ type: 'action', label, fn });
    const choice = (label, get, set, list) => ({ type: 'choice', label, get, set, list });
    if (this.tab === 0) { const per = 6, ks = ORDER.slice(this.page * per, this.page * per + per); for (const k of ks) rows.push(slider(k)); rows.push(act('RESET ALL TO DEFAULTS', () => { if (this.confirmT > 0) { MT.resetTunes(); this.confirmT = 0; MT.sfx('confirm'); } else { this.confirmT = 3; } })); rows[rows.length - 1].dyn = () => this.confirmT > 0 ? 'SURE? PRESS AGAIN' : 'RESET ALL TO DEFAULTS'; }
    else if (this.tab === 1) {
      rows.push(tog('FREEZE WORLD WHILE OPEN', this, 'frozen', v => { MT.ov.freeze = v; }));
      rows.push(tog('God mode', MT.cheats, 'god')); rows.push(tog('Infinite Showstoppers', MT.cheats, 'infBombs')); rows.push(tog('One-hit kills', MT.cheats, 'oneHit')); rows.push(tog('Freeze enemies', MT.cheats, 'freezeEnemies')); rows.push(tog('No clip', MT.cheats, 'noclip'));
      rows.push(tog('Autopilot P1', MT.cheats, 'autopilot', v => { if (w && w.cs[0]) w.cs[0].auto = v; })); rows.push(tog('Bot partner', MT.cheats, 'botPartner', v => { if (v && MT.worldNow && !MT.botPartner) MT.botPartner = MT.addBot(1); else if (!v && MT.botPartner) { MT.botPartner.state = 'gone'; const run = MT.run; run.cs = run.cs.filter(c => c !== MT.botPartner); if (w) w.cs = run.cs; MT.botPartner = null; } })); rows.push(tog('Mute host chatter', MT.cheats, 'muteChatter'));
    } else if (this.tab === 2) {
      const c0 = () => w && w.cs[0], WL = Object.keys(MT.WEAPONS);
      rows.push(act('Kill all enemies', () => game_.debug.killAll())); rows.push(act('Clear the room (jump to EXIT)', () => game_.debug.clearRoom())); rows.push(act('Next room (first exit)', () => { if (w && w.rm.exits) { const dn = Object.keys(w.rm.exits)[0]; if (dn) { w.phase = w.phase === 'exit' ? 'exit' : w.phase; game_.debug.clearRoom(); w.phase = 'clear'; w.phaseT = 99; game_.after(.1, () => game_.debug.chooseExit(dn)); } } }));
      rows.push(act('Restart the room', () => { if (w) { MT.closeOverlay(); game_.go('play', { room: w.rm.id, entry: w.entry }, { fade: 0 }); } }));
      rows.push(choice('Weapon / add-on', () => WL[this.spawn.w], v => { this.spawn.w = (this.spawn.w + v + WL.length) % WL.length; }, WL)); rows.push(act('GIVE the weapon / add-on', () => { if (c0()) w.giveWeapon(c0(), WL[this.spawn.w]); }));
      rows.push(act('+1 life', () => { if (c0()) c0().lives++; })); rows.push(act('+1 Showstopper', () => { if (c0()) c0().bombs = Math.min(9, c0().bombs + 1); })); rows.push(act('+$100,000', () => { if (c0()) w.addCash(c0(), 100000); })); rows.push(act('+1 key', () => { if (MT.run) MT.run.keys++; }));
      rows.push(act('Max ratings', () => { if (w) w.rat.R = 99.9; })); rows.push(act('Trigger Prime Time', () => { if (w) w.startPrime(); })); rows.push(act('Trigger a Ratings Stunt', () => { if (w) w.releaseStunt(); }));
      rows.push(act('Frame step (1/30 s)', () => { MT.ov.cur.stepOnce = true; })); rows.push(act('EXPORT TUNING', () => { this.exportText = JSON.stringify(MT.tuneDiff()); console.log('MASH TV tuning: ' + this.exportText); }));
      const per = 6; this.pages = Math.ceil(rows.length / per); return rows.slice(this.page * per, this.page * per + per);
    } else if (this.tab === 3) { const per = 6; this.pages = Math.ceil(WARPS.length / per); for (const t of WARPS.slice(this.page * per, this.page * per + per)) rows.push(act('WARP: ' + (MT.ROOMS[t] ? t + ' ' + MT.ROOMS[t].name : t.toUpperCase()), () => { MT.closeOverlay(); game_.resume && game_.resume(); MT.run && (MT.run.devTouched = true); MT.warp(t, { mode: 'test', players: MT.run ? MT.run.cs.length : 1, seed: MT.seed }); })); return rows; }
    else if (this.tab === 4) {
      const kinds = Object.keys(MT.ENEMIES).filter(k => k !== 'segment'), wheres = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], pk = ['bill', 'stack', 'bar', 'case', 'prize', 'key', 'cap', 'bomb', 'life'], S = this.spawn;
      rows.push(choice('Enemy', () => kinds[S.kind], v => { S.kind = (S.kind + v + kinds.length) % kinds.length; }, kinds)); rows.push(choice('Count', () => [1, 5, 10][S.n], v => { S.n = (S.n + v + 3) % 3; }, [1, 5, 10]));
      rows.push(choice('Where', () => wheres[S.where], v => { S.where = (S.where + v + wheres.length) % wheres.length; }, wheres)); rows.push(act('SPAWN!', () => MT.devSpawn(kinds[S.kind], [1, 5, 10][S.n], wheres[S.where])));
      rows.push(choice('Pickup', () => pk[S.pick], v => { S.pick = (S.pick + v + pk.length) % pk.length; }, pk)); rows.push(act('GIVE pickup at P1', () => { if (w && w.cs[0]) { const k = pk[S.pick]; w.addPickup(k, w.cs[0].x + 14, w.cs[0].y, { w: k === 'cap' ? Object.keys(MT.WEAPONS)[S.w] : undefined, fixed: false, ttl: 20 }); } }));
    } else { for (const k of Object.keys(MT.dbg)) rows.push(tog('Show ' + { hitboxes: 'hitboxes', ai: 'AI targets and states', waves: 'wave timeline', stats: 'stats', doors: 'door states', camera: 'camera bounds' }[k], MT.dbg, k)); }
    return rows;
  }
  update(dt) {
    const game = game_; MT.idle.step(game, dt);
    this.confirmT = Math.max(0, this.confirmT - dt);
    const rows = this.cur = this.rows(); const n = rows.length; if (this.sel >= n) this.sel = n - 1;
    const P = game.players, any = a => P.some(p => p.pressed(a)), rep = a => P.some(p => p.repeat(a, .35, .07));
    if (any('cancel') || any('pause')) { this.close(); return; }
    if (any('tabR')) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; this.page = 0; MT.sfx('tick'); } if (any('tabL')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; this.page = 0; MT.sfx('tick'); }
    if (rep('up')) { if (this.sel === 0 && this.pageable() && this.page > 0) { this.page--; this.sel = 5; } else this.sel = (this.sel + n - 1) % n; MT.sfx('blip'); }
    if (rep('down')) { if (this.pageable() && this.sel === n - 1 && this.tab !== 0) { this.page = (this.page + 1) % this.pageCount(); this.sel = 0; } else if (this.tab === 0 && this.sel === 5 && this.page < 4) { this.page++; this.sel = 0; } else this.sel = (this.sel + 1) % n; MT.sfx('blip'); }
    const r = rows[this.sel], p = UI.pointer(), c = UI.clicked();
    if (p && this._pp && (Math.abs(p[0] - this._pp[0]) + Math.abs(p[1] - this._pp[1]) > .5)) this.rects.forEach((q, i) => { if (UI.inRect(p, ...q)) this.sel = i; }); this._pp = p;
    if (c) { this.tabRects.forEach((q, i) => { if (UI.inRect(c, ...q)) { this.tab = i; this.sel = 0; this.page = 0; } }); this.rects.forEach((q, i) => { if (UI.inRect(c, ...q)) { this.sel = i; const rw = rows[i]; if (rw.type === 'slider') { const u = MT.clamp((c[0] - this.barX) / this.barW, 0, 1); rw.set(rw.min + (rw.max - rw.min) * u); } else this.activate(rw); } }); }
    if (r) {
      if (r.type === 'slider') { if (rep('left')) r.set(r.get() - r.step); if (rep('right')) r.set(r.get() + r.step); if (MT.wheel) { r.set(r.get() - Math.sign(MT.wheel) * r.step); MT.wheel = 0; } if (any('reset')) { r.reset(); MT.sfx('back'); } if (any('confirm')) { r.set(r.get() + r.step); } }
      else if (r.type === 'toggle') { if (any('confirm') || any('left') || any('right')) { r.set(!r.get()); MT.sfx('tick'); } }
      else if (r.type === 'choice') { if (rep('left')) r.set(-1); if (rep('right') || any('confirm')) r.set(1); }
      else if (r.type === 'action') { if (any('confirm')) this.activate(r); }
    }
    MT.wheel = 0;
    // paging for TUNING / ACTIONS / WARP with L2-ish: left/right on actions pages
    if (this.pageable() && r && r.type === 'action' && any('right')) { this.page = (this.page + 1) % this.pageCount(); this.sel = 0; }
    if (this.pageable() && r && r.type === 'action' && any('left')) { this.page = (this.page + this.pageCount() - 1) % this.pageCount(); this.sel = 0; }
  }
  pageable() { return this.tab === 0 || this.tab === 2 || this.tab === 3; }
  pageCount() { return this.tab === 0 ? 5 : (this.pages || 1); }
  activate(r) { if (r.type === 'toggle') r.set(!r.get()); else if (r.type === 'action') { MT.sfx('confirm'); r.fn(); } else if (r.type === 'choice') r.set(1); }
  close() { this.confirmT = 0; MT.sfx('back'); MT.closeOverlay(); }
  draw(r) {
    const rows = this.cur || this.rows(), x = Math.round(r.W * .55), y = 24, w = Math.round(r.W * .45) - 4, h = r.H - 28; this.rects = []; this.tabRects = [];
    r.overlay(g => {
      UI.panel(g, x, y, w, h, { bulbs: true, chase: true, color: '#ff8a20', border: '#ff8a20' });
      TABS.forEach((t, i) => { const tw = Math.floor((w - 8) / TABS.length), tx = x + 4 + i * tw; this.tabRects[i] = [tx, y + 3, tw - 2, 12]; px.rect(g, tx, y + 3, tw - 2, 12, i === this.tab ? '#ff8a20' : '#2a1a3a'); UI.text(g, t, tx + (tw - 2) / 2, y + 5, i === this.tab ? '#14081c' : '#c8c0e0', { align: 'center', shadow: false, font: 'tiny' }); });
      const hdr = this.tab === 0 ? ['PLAYER', 'PLAYER', 'ENEMIES', 'ECONOMY', 'SHOW', 'CAMERA & TIME'][Math.min(5, this.page + (this.page > 0 ? 1 : 0))] + '  ' + (this.page + 1) + '/5' : this.pageable() ? 'PAGE ' + (this.page + 1) + '/' + this.pageCount() : '';
      UI.text(g, 'DEV MODE  ' + hdr, x + 6, y + 19, '#ff8a20', { scale: 1 });
      const rh = 18; this.barX = x + w * .56; this.barW = w * .30;
      rows.forEach((rw, i) => {
        const yy = y + 32 + i * rh, foc = i === this.sel; this.rects[i] = [x + 4, yy - 2, w - 8, rh - 1];
        if (foc) px.rect(g, x + 4, yy - 2, w - 8, rh - 1, '#4a2a6a');
        const lab = rw.dyn ? rw.dyn() : rw.label;
        if (rw.type === 'slider') { const v = rw.get(), u = (v - rw.min) / (rw.max - rw.min), diff = v !== rw.def; UI.text(g, lab, x + 8, yy + 2, diff ? '#ff8a20' : '#fff7e8', { font: 'tiny' }); UI.bar(g, this.barX, yy + 1, this.barW, 8, u, diff ? '#ff8a20' : '#ffcc33'); px.rect(g, Math.round(this.barX + this.barW * (rw.def - rw.min) / (rw.max - rw.min)), yy, 1, 10, '#fff'); UI.text(g, String(+v.toFixed(2)), x + w - 8, yy + 2, '#7affb0', { align: 'right', font: 'tiny' }); }
        else if (rw.type === 'toggle') { UI.text(g, lab, x + 8, yy + 2, '#fff7e8', { font: 'tiny' }); UI.text(g, rw.get() ? 'ON' : 'OFF', x + w - 8, yy + 2, rw.get() ? '#7affb0' : '#7a6a98', { align: 'right', font: 'tiny' }); }
        else if (rw.type === 'choice') { UI.text(g, lab, x + 8, yy + 2, '#fff7e8', { font: 'tiny' }); UI.text(g, '< ' + String(rw.get()).toUpperCase() + ' >', x + w - 8, yy + 2, '#ffe068', { align: 'right', font: 'tiny' }); }
        else UI.text(g, lab, x + 8, yy + 2, foc ? '#ffe068' : '#fff7e8', { font: 'tiny' });
      });
      if (this.exportText) { F.wrap(this.exportText, w - 12, { font: 'tiny' }).slice(0, 6).forEach((l, i) => UI.text(g, l, x + 6, y + h - 66 + i * 7, '#7affb0', { font: 'tiny' })); }
      MT.glyph.prompt(g, x + w / 2, y + h - 14, [['tabL', 'TAB'], ['reset', 'RESET'], ['cancel', 'CLOSE']], UI.promptInput(), { align: 'center' });
    });
    if (this.w) this.drawDebug(r, this.w);
  }
  drawDebug(r, w) {
    const D = MT.dbg; if (!Object.values(D).some(Boolean)) return;
    if (D.hitboxes) r.decal(() => { for (const e of w.enemies) if (e.alive) r.groundRing(e.x, e.y, e.r, '#ff0000', 1); for (const c of w.cs) r.groundRing(c.x, c.y, c.r, '#00ff00', 1); for (const b of w.fShots.list) r.groundRing(b.x, b.y, b.r, '#ffff00', 1); for (const b of w.pShots.list) r.groundRing(b.x, b.y, b.r, '#00ffff', 1); if (w.boss) for (const t of w.boss.hitParts()) r.groundRing(t.x, t.y, t.r, '#ff00ff', 1); });
    r.overlay(g => {
      if (D.ai) for (const e of w.enemies) if (e.alive) { const [sx, sy] = r.w(e.x, e.y, 20); UI.text(g, e.kind + ':' + e.state, sx, sy, '#fff', { align: 'center', font: 'tiny' }); }
      if (D.waves) { UI.text(g, 'WAVE ' + (w.waveI + 1) + '/' + ((w.rm.waves || []).length) + '  ALIVE ' + w.alive() + '  T ' + (w.time - w.time0).toFixed(1), 8, r.H - 70, '#7affb0', { font: 'tiny' }); const nx = (w.rm.waves || [])[w.waveI + 1]; if (nx) UI.text(g, 'NEXT: ' + (nx.at !== undefined ? 'AT ' + nx.at : '') + (nx.left !== undefined ? ' LEFT<=' + nx.left : ''), 8, r.H - 62, '#7affb0', { font: 'tiny' }); }
      if (D.stats) UI.text(g, 'ENEMIES ' + w.enemies.length + ' FOE ' + w.fShots.list.length + ' PLY ' + w.pShots.list.length + ' PICK ' + w.pickups.length + ' ERR ' + MT.game.errors.length, 8, r.H - 54, '#ffe068', { font: 'tiny' });
      if (D.doors) for (const dn in w.doors) { const d = MT.DOORS[dn], [sx, sy] = r.w(d.x, d.y, 30); UI.text(g, dn + ':' + w.doors[dn].state + ' q' + w.doors[dn].queue.length, sx, sy, '#ff8a20', { align: 'center', font: 'tiny' }); }
      if (D.camera) { const b = w.map.bounds(MT.game.view); px.rect(g, 0, 0, 1, r.H, '#f0f'); UI.text(g, 'BOUNDS ' + Math.round(b.x1 - b.x0) + 'x' + Math.round(b.y1 - b.y0) + ' ZOOM ' + MT.game.zoom.toFixed(2), 8, r.H - 46, '#f0f', { font: 'tiny' }); }
    });
  }
}
let game_ = null;
MT.openDev = function () {
  const g = game_ = MT.game; if (MT.inSession || (MT.run && (MT.run.mode === 'session' || MT.run.mode === 'attract'))) return;
  if (g.paused && g.resume) g.resume();
  const d = new Dev(); MT.ov.freeze = true; d.frozen = true; MT.openOverlay(d);
};
MT.openMapOverlay = function () { game_ = MT.game; if (MT.game.paused) MT.game.resume(); const o = { update(dt) { if (UI.anyPressed('cancel') || UI.anyPressed('confirm') || UI.clicked()) MT.closeOverlay(); }, draw(r) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, 'rgba(5,2,12,.88)')); r.overlay(g => UI.title(g, 'EPISODE MAP', r.W / 2, 8, 3)); const w = MT.worldNow; MT.drawMap(r, w ? w.rm.ep : 1, w ? w.rm.id : '', { t: UI.t }); UI.promptBar(r, [['confirm', 'CLOSE']]); } }; MT.openOverlay(o); };
MT.openHowtoOverlay = function () { game_ = MT.game; if (MT.game.paused) MT.game.resume(); let page = 0; const o = { update(dt) { const n = MT.TEXT.howto.length; if (UI.anyPressed('right') || UI.anyPressed('tabR')) page = (page + 1) % n; if (UI.anyPressed('left') || UI.anyPressed('tabL')) page = (page + n - 1) % n; if (UI.anyPressed('cancel')) MT.closeOverlay(); }, draw(r) { MT.drawHowtoPage(r, page); UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'CLOSE']]); } }; MT.openOverlay(o); };
// spawn helper
MT.devSpawn = function (kind, n, where) {
  const w = MT.worldNow; if (!w || !MT.ENEMIES[kind]) return null; let out = [];
  if (where === 'reticle') { const c = w.cs[0], m = c && c.intent && c.intent.mouseAt; const x = m ? m[0] : c ? c.x + Math.cos(c.aim) * 60 : 184, y = m ? m[1] : c ? c.y + Math.sin(c.aim) * 60 : 120; for (let i = 0; i < n; i++) { const e = w.spawnEnemy(kind, x + (i % 5) * 8 - 16, y + Math.floor(i / 5) * 8, {}); e.entering = false; out.push(e); } }
  else w.queueSpawn(where, kind, n, .2);
  return out;
};
