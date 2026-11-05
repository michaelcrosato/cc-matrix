// ---------------------------------------------------------------- dev mode: live sliders, cheats, actions, warps, spawns, debug overlays
MT.dev = (() => {
  const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
  const dbg = { hitboxes: false, ai: false, waves: false, stats: false, doors: false, camera: false };
  const pick = { give: 0, kind: 0, count: 0, where: 0, pickup: 0 };
  const GIVES = () => Object.keys(MT.WEAPONS).concat(Object.keys(MT.ADDONS));
  const COUNTS = [1, 5, 10], WHERES = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], PICKS = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'bomb', 'life'];
  const W = () => MT.Show.W, P1 = () => W() && W().contestants[0];
  const touched = () => { if (MT.run) MT.run.devTouched = true; };
  let confirmReset = 0, exportLine = '';
  const api = {
    freeze: true, tab: 0, i: 0, t: 0, dbg, scroll: 0, rects: [], tabRects: [],
    allowed() { return MT.run && MT.run.mode !== 'session' && MT.run.mode !== 'attract'; },
    open() { if (!api.allowed()) return false; MT.openOverlay('dev'); api.t = 0; return true; },
    close(silent) { if (MT.overlay.kind === 'dev') MT.closeOverlay(); if (!silent) MT.sfx('back'); },
    rows() {
      const tab = TABS[api.tab], R = [];
      if (tab === 'TUNING') {
        let grp = '';
        for (const d of MT.TDEF) { R.push({ label: (d[6] !== grp ? (grp = d[6]) + ': ' : '') + d[1], kind: 'slider', d, get: () => MT.T[d[0]], set: v => { MT.setTune(d[0], v); touched(); }, reset: () => MT.setTune(d[0], d[2]) }); }
        R.push({ label: confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS', kind: 'action', act: () => { if (confirmReset > 0) { MT.resetTunes(); confirmReset = 0; MT.banner.show('TUNING RESET', { big: false }); } else confirmReset = 3; } });
        R.push({ label: 'EXPORT TUNING', kind: 'action', act: () => api.exportTuning() });
      } else if (tab === 'CHEATS') {
        const names = { god: 'GOD MODE (ALL CONTESTANTS)', infBombs: 'INFINITE SHOWSTOPPERS', oneHit: 'ONE-HIT KILLS', freeze: 'FREEZE ENEMIES', noclip: 'NO CLIP (P1)', autopilot: 'AUTOPILOT P1', botPartner: 'BOT PARTNER', muteHost: 'MUTE HOST CHATTER' };
        for (const k in MT.CHEATS) R.push({ label: names[k], kind: 'toggle', get: () => MT.CHEATS[k], set: v => api.cheat(k, v), reset: () => api.cheat(k, false) });
      } else if (tab === 'ACTIONS') {
        R.push({ label: 'FREEZE WHILE OPEN', kind: 'toggle', get: () => api.freeze, set: v => { api.freeze = v; } });
        R.push({ label: 'FRAME STEP (1/30 S)', kind: 'action', act: () => { MT.game.timeScale = MT.T.timeScale; for (let k = 0; k < 4; k++) MT.Show.update(1 / 120); } });
        R.push({ label: 'KILL ALL ENEMIES', kind: 'action', act: () => api.killAll() });
        R.push({ label: 'CLEAR THE ROOM', kind: 'action', act: () => api.clearRoom() });
        R.push({ label: 'NEXT ROOM (FIRST EXIT)', kind: 'action', act: () => api.nextRoom() });
        R.push({ label: 'RESTART THE ROOM', kind: 'action', act: () => api.warp(W().room.id) });
        R.push({ label: 'GIVE', kind: 'choice', get: () => GIVES()[pick.give], left: () => { pick.give = (pick.give + GIVES().length - 1) % GIVES().length; }, right: () => { pick.give = (pick.give + 1) % GIVES().length; }, act: () => api.give(GIVES()[pick.give]) });
        R.push({ label: '+1 LIFE', kind: 'action', act: () => { P1().lives++; touched(); } });
        R.push({ label: '+1 SHOWSTOPPER', kind: 'action', act: () => { P1().bombs = Math.min(3, P1().bombs + 1); touched(); } });
        R.push({ label: '+$100,000', kind: 'action', act: () => { P1().addCash(100000, W()); touched(); } });
        R.push({ label: '+1 GOLDEN KEY', kind: 'action', act: () => { MT.run.keys++; touched(); } });
        R.push({ label: 'MAX RATINGS', kind: 'action', act: () => { W().ratings.R = 99; touched(); } });
        R.push({ label: 'TRIGGER PRIME TIME', kind: 'action', act: () => { W().ratings.primeCd = 0; W().ratings.startPrime(W()); touched(); } });
        R.push({ label: 'TRIGGER A RATINGS STUNT', kind: 'action', act: () => { W().stunt(); touched(); } });
      } else if (tab === 'WARP') {
        for (const id of Object.keys(MT.ROOMS)) R.push({ label: id + ' ' + MT.ROOMS[id].name, kind: 'action', act: () => api.warp(id) });
        for (const s of ['cold', 'card1', 'card2', 'card3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'initials', 'endingA', 'endingB', 'credits', 'sessionCard']) R.push({ label: 'SCENE: ' + s.toUpperCase(), kind: 'action', act: () => api.warp(s) });
      } else if (tab === 'SPAWN') {
        const K = MT.KIND_LIST;
        R.push({ label: 'KIND', kind: 'choice', get: () => K[pick.kind], left: () => { pick.kind = (pick.kind + K.length - 1) % K.length; }, right: () => { pick.kind = (pick.kind + 1) % K.length; } });
        R.push({ label: 'COUNT', kind: 'choice', get: () => COUNTS[pick.count], left: () => { pick.count = (pick.count + 2) % 3; }, right: () => { pick.count = (pick.count + 1) % 3; } });
        R.push({ label: 'WHERE', kind: 'choice', get: () => WHERES[pick.where], left: () => { pick.where = (pick.where + WHERES.length - 1) % WHERES.length; }, right: () => { pick.where = (pick.where + 1) % WHERES.length; } });
        R.push({ label: 'SPAWN THEM', kind: 'action', act: () => api.spawn(K[pick.kind], COUNTS[pick.count], WHERES[pick.where]) });
        R.push({ label: 'PICKUP AT P1', kind: 'choice', get: () => PICKS[pick.pickup], left: () => { pick.pickup = (pick.pickup + PICKS.length - 1) % PICKS.length; }, right: () => { pick.pickup = (pick.pickup + 1) % PICKS.length; }, act: () => { const c = P1(); W().addPickup(PICKS[pick.pickup], c.x + 16, c.y); touched(); } });
      } else {
        const names = { hitboxes: 'HITBOXES', ai: 'AI TARGETS AND STATES', waves: 'WAVE TIMELINE', stats: 'STATS', doors: 'DOOR STATES', camera: 'CAMERA BOUNDS' };
        for (const k in dbg) R.push({ label: names[k], kind: 'toggle', get: () => dbg[k], set: v => { dbg[k] = v; } });
      }
      return R;
    },
    cheat(k, v) {
      MT.CHEATS[k] = !!v; touched();
      if (k === 'botPartner' && MT.run && W()) {
        const run = MT.run, has = run.contestants.find(c => c.devBot);
        if (v && !has && run.contestants.length < 4) { const c = new MT.Contestant(run.contestants.length, { look: run.contestants.length, ctl: 'bot' }); c.devBot = true; run.contestants.push(c); c.respawn(W()); }
        if (!v && has) { run.contestants.splice(run.contestants.indexOf(has), 1); }
      }
    },
    killAll() { const w = W(); if (!w) return; for (const e of w.enemies) if (!e.dead && !e.A.harmless) w.kill(e, P1(), {}); if (w.boss && !w.boss.dead) for (const p of w.boss.parts) { if (p.alive) { p.hp = 0; p.alive = false; } } if (w.boss) w.boss.die(w); touched(); },
    clearRoom() { const w = W(); if (!w) return; for (const s of w.scripts) s.cancel(); for (const d in w.arena.doors) w.arena.doors[d].queue.length = 0; w.allSpawned = true; api.killAll(); if (!w.room.boss) w.clearRoom(); touched(); },
    nextRoom() { const w = W(); if (!w) return; api.clearRoom(); const ex = Object.entries(w.room.exits || {}); if (ex.length) { w.exitDir = ex[0][0]; w.exitDest = ex[0][1]; w.result = 'exit'; w.setPhase('done'); } else if (w.room.boss) { w.result = 'boss'; w.setPhase('done'); } touched(); },
    give(id) { const c = P1(); if (c && W()) W().equip(c, id); touched(); },
    spawn(kind, n, where) {
      const w = W(); if (!w) return; touched();
      for (let i = 0; i < n; i++) {
        if (where === 'audience') w.spawnAudience(kind, i % 2 ? 'E' : 'W'); else if (where === 'drop') w.spawnDrop(kind);
        else if (where === 'reticle') { const m = MT.game.mouseGround(); const x = m ? clamp(m[0], 30, 338) : AR.cx, y = m ? clamp(m[1], 30, 210) : AR.cy; w.spawnAt(kind, x + i * 4, y); }
        else w.arena.queueSpawn(where, kind, 1, .2);
      }
    },
    warp(target, o = {}) {
      const g = MT.game; touched(); api.close(true);
      if (MT.ROOMS[target]) { if (!MT.run) MT.newRun({ mode: 'test' }); if (g.sceneName === 'play' && MT.Show.W) { MT.Show.begin(target, 'S', { noCard: true }); } else g.go('play', { room: target, noCard: true }); return; }
      const m = /^(card|recap)(\d)$/.exec(target);
      if (!MT.run) MT.newRun({ mode: 'test' });
      if (m && m[1] === 'card') { MT.run.epCardShown[+m[2]] = false; g.go('play', { room: MT.EPISODES[+m[2]].start }); return; }
      if (m && m[1] === 'recap') { g.go('recap', { ep: +m[2], fake: !MT.run.contestants.some(c => c.prizes.length) }); return; }
      if (target === 'cold') return g.go('cut', { id: 'cold' });
      if (target === 'continue') { if (g.sceneName !== 'play') { g.go('play', { room: '1-1', noCard: true }); MT.later(.5, () => { for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } }); } else for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } return; }
      if (target === 'gameover') return g.go('gameover', {});
      if (target === 'initials') return g.go('initials', { fake: true });
      if (target === 'endingA') return g.go('ending', { kind: 'a' });
      if (target === 'endingB') return g.go('ending', { kind: 'b' });
      if (target === 'credits') return g.go('credits', {});
      if (target === 'sessionCard') return g.go('sessionCard', { fake: true });
    },
    exportTuning() { const o = {}; for (const d of MT.tunesChanged()) o[d[0]] = MT.T[d[0]]; exportLine = JSON.stringify(o); console.log('MASH TV tuning: ' + exportLine); MT.banner.show('TUNING EXPORTED TO THE CONSOLE', { big: false }); },
    update(dt) {
      api.t += dt; confirmReset = Math.max(0, confirmReset - dt);
      const rows = api.rows(); api.i = clamp(api.i, 0, rows.length - 1);
      if (MT.ui.nav('tabR')) { api.tab = (api.tab + 1) % TABS.length; api.i = 0; MT.sfx('page'); }
      if (MT.ui.nav('tabL')) { api.tab = (api.tab + TABS.length - 1) % TABS.length; api.i = 0; MT.sfx('page'); }
      if (MT.ui.nav('down')) { api.i = (api.i + 1) % rows.length; MT.sfx('blip'); }
      if (MT.ui.nav('up')) { api.i = (api.i + rows.length - 1) % rows.length; MT.sfx('blip'); }
      const p = MT.ui.pointer(); if (MT.ui.ptrMoved() && p) api.rects.forEach((rc, k) => { if (rc && MT.ui.inRect(p, rc)) api.i = k; });
      const row = rows[api.i], adj = d => { if (row.kind === 'slider') { const D = row.d; row.set(row.get() + d * D[5]); MT.sfx('slider'); } else if (row.kind === 'choice') { (d > 0 ? row.right : row.left)(); MT.sfx('slider'); } else if (row.kind === 'toggle' && d) { row.set(!row.get()); MT.sfx('slider'); } };
      if (MT.ui.nav('left')) adj(-1); if (MT.ui.nav('right')) adj(1);
      const wh = MT.ui.takeWheel(); if (wh) adj(-wh);
      const c = MT.ui.clicked();
      if (c) {
        api.tabRects.forEach((rc, k) => { if (MT.ui.inRect(c, rc)) { api.tab = k; api.i = 0; MT.sfx('page'); } });
        api.rects.forEach((rc, k) => { if (rc && MT.ui.inRect(c, rc)) { api.i = k; const R = api.rows()[k]; if (R.kind === 'slider' && api.bar && api.bar[k]) { const b = api.bar[k], D = R.d; R.set(D[3] + (D[4] - D[3]) * clamp((c[0] - b[0]) / b[1], 0, 1)); } else if (R.kind === 'toggle') R.set(!R.get()); else if (R.act) R.act(); } });
      }
      if (MT.ui.nav('confirm')) { if (row.kind === 'toggle') row.set(!row.get()); else if (row.act) row.act(); MT.sfx('bell'); }
      if (MT.ui.nav('reset') && row.reset) { row.reset(); MT.sfx('back'); }
      if (MT.ui.nav('cancel')) api.close();
    },
    draw(r) {
      r.overlay(g => {
        const T = MT.ui.T, w = Math.max(200, Math.round(r.W * .45)), x = r.W - w, y = 0, h = r.H;
        px.blend(g, .9, 'normal', () => px.rect(g, x, y, w, h, '#0e0618')); px.rect(g, x, 0, 2, h, '#ff8a20');
        T(g, 'DEV MODE', x + 8, 4, '#ff8a20'); T(g, api.freeze ? 'FROZEN' : 'LIVE', x + 70, 4, api.freeze ? '#2ee6ff' : '#22ff66');
        api.tabRects = []; let tx = x + 6;
        TABS.forEach((t, k) => { const tw = E.font.width(t, { font: 'tiny' }) + 6; api.tabRects.push([tx, 14, tw, 10]); px.rect(g, tx, 14, tw, 10, k === api.tab ? '#ff8a20' : '#2a1446'); T(g, t, tx + 3, 16, k === api.tab ? '#14101c' : '#c8c0e0', { font: 'tiny', shadow: false }); tx += tw + 2; });
        const rows = api.rows(), vis = Math.max(6, Math.floor((h - 60) / 20)); api.scroll = clamp(api.scroll, api.i - vis + 1, api.i); api.scroll = clamp(api.scroll, 0, Math.max(0, rows.length - vis));
        api.rects = []; api.bar = {};
        for (let k = api.scroll; k < Math.min(rows.length, api.scroll + vis); k++) {
          const R = rows[k], yy = 30 + (k - api.scroll) * 20, on = k === api.i; api.rects[k] = [x + 4, yy, w - 8, 18];
          px.rect(g, x + 4, yy, w - 8, 18, on ? '#3a1a4c' : '#180c26'); if (on) MT.ui.bulbs(g, x + 3, yy - 1, w - 6, 20, api.t, '#ff8a20', '#4a2a10');
          T(g, R.label, x + 8, yy + 2, on ? '#ffcc33' : '#fff7e8', { font: R.label.length > 28 ? 'tiny' : undefined });
          if (R.kind === 'slider') { const D = R.d, v = R.get(), f = (v - D[3]) / (D[4] - D[3]), bx = x + 8, bw = w - 70; api.bar[k] = [bx, bw]; px.rect(g, bx, yy + 12, bw, 3, '#2a2040'); px.rect(g, bx, yy + 12, Math.round(bw * f), 3, v === D[2] ? '#2ee6ff' : '#ff8a20'); T(g, String(v), x + w - 10, yy + 9, v === D[2] ? '#c8c0e0' : '#ff8a20', { align: 'right' }); }
          else if (R.kind === 'toggle') T(g, R.get() ? 'ON' : 'OFF', x + w - 10, yy + 5, R.get() ? '#22ff66' : '#8a7a9a', { align: 'right' });
          else if (R.kind === 'choice') T(g, '← ' + String(R.get()).toUpperCase() + ' →', x + w - 10, yy + 5, '#2ee6ff', { align: 'right' });
        }
        if (exportLine && TABS[api.tab] === 'TUNING') T(g, exportLine.slice(0, 60) || '{}', x + 6, h - 34, '#22ff66', { font: 'tiny' });
        const I = MT.ui.lastI(); MT.glyph.prompt(g, x + 6, h - 22, [['tabR', 'TAB'], ['confirm', 'SET'], ['reset', 'RESET'], ['cancel', 'CLOSE']], I, { scale: 1 });
      });
    },
    drawDebug(r, Wd) {
      if (!Wd || !Object.values(dbg).some(Boolean)) return;
      r.overlay(g => {
        const T = MT.ui.T, P = (x, y, z = 0) => r.w(x, y, z).map((v, i) => v - (i ? r.iy : r.ix));
        if (dbg.hitboxes) { const ring = (x, y, rad, c) => { for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2, p = P(x + Math.cos(an) * rad, y + Math.sin(an) * rad); px.dot(g, p[0], p[1], c); } };
          for (const c of Wd.contestants) ring(c.x, c.y, c.r, '#22ff66'); for (const e of Wd.enemies) ring(e.x, e.y, e.r, '#ff3344'); for (const b of Wd.fShots.list) ring(b.x, b.y, b.r, '#ffcc33'); for (const b of Wd.pShots.list) ring(b.x, b.y, b.r, '#2ee6ff');
          if (Wd.boss) for (const p of Wd.boss.parts) if (p.alive) { const [x, y] = Wd.boss.partPos(p); ring(x, y, p.r, p.open ? '#ff8a20' : '#5a5a5a'); } }
        if (dbg.ai) for (const e of Wd.enemies) { const p = P(e.x, e.y, 30); T(g, e.kind + ':' + e.state, p[0], p[1], '#ffcc33', { font: 'tiny', align: 'center' }); const t = Wd.target(e); if (t) { const q = P(t.x, t.y); px.line(g, P(e.x, e.y)[0], P(e.x, e.y)[1], q[0], q[1], '#ff334466'); } }
        let y = 40; const L = s => { T(g, s, 6, y, '#22ff66', { font: 'tiny' }); y += 7; };
        if (dbg.waves) { L('PHASE ' + Wd.phase + ' ' + Wd.phaseT.toFixed(1)); L('WAVE ' + (Wd.waveIdx + 1) + '/' + Wd.wavesTotal + ' ALIVE ' + Wd.alive() + ' SPAWNED-ALL ' + Wd.allSpawned); }
        if (dbg.stats) { const s = MT.game.stats; L('FPS ' + MT.game.fps + ' STEPS ' + s.steps + ' ITEMS ' + s.items); L('ENEMIES ' + Wd.enemies.length + ' BULLETS ' + (Wd.pShots.list.length + Wd.fShots.list.length) + ' PICKUPS ' + Wd.pickups.length); }
        if (dbg.doors) for (const d in Wd.arena.doors) { const D = Wd.arena.doors[d]; L(d + ' ' + D.state + ' Q' + D.queue.length); }
        if (dbg.camera) { const b = P(AR.x0, AR.y0), b2 = P(AR.x1, AR.y1); px.rect(g, b[0], b[1], b2[0] - b[0], 1, '#2ee6ff'); px.rect(g, b[0], b2[1], b2[0] - b[0], 1, '#2ee6ff'); L('ZOOM ' + MT.game.zoom.toFixed(2)); }
      });
    }
  };
  return api;
})();
