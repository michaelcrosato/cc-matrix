/* ============ 41-devmode: tuning sliders, cheats, warps and info; reached from the pause menu or F1 ============ */
EF.dev = { stamina: false, freezeAI: false, noFouls: false, pure: false, aiOverlay: false, god: false };
EF.Dev = {
  on: false, tab: 0, i: 0, top: 0, tabs: ['TUNE', 'CHEATS', 'WARP', 'INFO'], msg: '', msgT: 0,
  open() { if (EF.session) return; try { game.resume(); } catch (e) { /* not paused */ } const sc0 = game.scene; if (sc0) { this._p = sc0.pausable; sc0.pausable = false; this._sc = sc0; } this.on = true; this.i = 0; this.top = 0; this.build(); EF.lastInput = performance.now(); game.input.consumeAll && game.input.consumeAll(); },
  close() { this.on = false; EF.saveTune(); if (this._sc) { this._sc.pausable = this._p; this._sc = null; } },
  toggle() { this.on ? this.close() : this.open(); },
  toast(s) { this.msg = s; this.msgT = 2; },
  M() { const sc = game.scene; return sc && sc.M; },
  build() {
    const D = this, M = () => D.M(), act = fn => () => { const m = M(); if (m) fn(m); else D.toast('NEEDS A MATCH'); };
    const tune = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => { EF.resetTune(); D.toast('TUNING RESET'); } }];
    let grp = ''; for (const t of EF.TUNE) { if (t[6] !== grp) { grp = t[6]; tune.push({ header: true, label: '- ' + grp.toUpperCase() + ' -' }); } tune.push({ key: t[0], label: t[1], type: 'slider', min: t[3], max: t[4], step: t[5], def: t[2], get: () => EF.T[t[0]], set: v => { EF.T[t[0]] = v; } }); }
    const cheats = [
      { label: 'INFINITE STAMINA', type: 'toggle', get: () => EF.dev.stamina, set: v => { EF.dev.stamina = v; } }, { label: 'FREEZE THE CPU', type: 'toggle', get: () => EF.dev.freezeAI, set: v => { EF.dev.freezeAI = v; } },
      { label: 'NO FOULS CALLED', type: 'toggle', get: () => EF.dev.noFouls, set: v => { EF.dev.noFouls = v; EF.T.foulChance = v ? 0 : 1; } }, { label: 'PURE FOOTBALL (NO OTT)', type: 'toggle', get: () => EF.dev.pure, set: v => { EF.dev.pure = v; const m = M(); if (m) m.rules.euphoria = !v; EF.T.knockAir = v ? 0 : 1; } },
      { label: 'SHOW AI TARGETS', type: 'toggle', get: () => EF.dev.aiOverlay, set: v => { EF.dev.aiOverlay = v; } }, { label: 'FILL MY CROWD', onPick: act(m => { m.eu[0] = 1; m.euFull[0] = true; m.emit('euphoriaFull', { side: 0 }); }) },
      { label: 'FIRE EUROPHORIA (HOME)', onPick: act(m => { m.eu[0] = 1; m.tryEuphoria(0); }) }, { label: 'FIRE EUROPHORIA (AWAY)', onPick: act(m => { m.eu[1] = 1; m.tryEuphoria(1); }) },
      { label: 'SCORE FOR HOME', onPick: act(m => { m.score[0]++; }) }, { label: 'SCORE FOR AWAY', onPick: act(m => { m.score[1]++; }) },
      { label: 'CORNER FOR HOME', onPick: act(m => m.setPiece('corner', 0, 0, 0, { right: true })) }, { label: 'FREE KICK FOR HOME', onPick: act(m => m.setPiece('freekick', 0, Pitch.X1 - 180, Pitch.CY + 50, {})) },
      { label: 'PENALTY FOR HOME', onPick: act(m => m.setPiece('penalty', 0, 0, 0, {})) }, { label: 'PENALTY FOR AWAY', onPick: act(m => m.setPiece('penalty', 1, 0, 0, {})) },
      { label: 'START A SHOOTOUT', onPick: act(m => m.startShootout()) }, { label: 'TRIGGER A VAR CHECK', onPick: act(m => m.startVar('goal', () => m.emit('varDecision', { overturned: false, kind: 'goal' }), () => m.emit('varDecision', { overturned: true, kind: 'goal' }), 1)) },
      { label: 'RED CARD: RANDOM AWAY PLAYER', onPick: act(m => { const f = m.F.filter(x => x.side === 1 && !x.sentOff && !x.isGK)[0]; if (f) m.giveCard(f, 'red'); }) }, { label: 'SPAWN A SEAGULL', onPick: act(m => m.spawnEvent('seagull')) }, { label: 'SPAWN A PITCH INVADER', onPick: act(m => m.spawnEvent('invader')) },
      { label: 'END THE HALF', onPick: act(m => { m.clock = m.extra ? m.halfSecs * .5 : m.halfSecs; }) }, { label: 'END THE MATCH', onPick: act(m => { m.half = 2; m.clock = m.halfSecs; }) }, { label: 'UNLOCK ALL STICKERS', onPick: () => { EF.STICKERS.forEach(s => EF.Save.sticker(s.id)); D.toast('ALL STICKERS'); } }, { label: 'RESET SAVE DATA', onPick: () => { EF.Save.reset(); D.toast('SAVE RESET'); } }];
    const W = (label, scene, data) => ({ label, onPick: () => { D.close(); game.go(scene, data); } });
    const warp = [W('TITLE', 'title'), W('MATCH: KIPPERS V HOOFERS', 'match', { mode: 'kickabout', home: 'kip', away: 'hoo', humans: [{ idx: 0, side: 0 }], rules: { needWinner: false } }), W('MATCH: AI V AI', 'match', { mode: 'kickabout', home: 'rpp', away: 'svs', stadium: 'pasapasa', humans: [], rules: {} }), W('MATCH: SHOOTOUT ONLY', 'match', { mode: 'penalties', home: 'kip', away: 'acl', humans: [{ idx: 0, side: 0 }], rules: { shootoutOnly: true, needWinner: true } }),
      ...['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium', 'rec'].map(s => W('STADIUM: ' + EF.get('stadium', s).name, 'match', { mode: 'kickabout', home: 'kip', away: 'opu', stadium: s, humans: [{ idx: 0, side: 0 }], rules: {} })),
      ...EF.STORY.rounds.map((rd, i) => W('CUP ROUND ' + (i + 1) + ': ' + rd.name, 'match', { mode: 'cup', round: i, home: 'kip', away: rd.team, stadium: rd.stadium, ref: rd.ref, humans: [{ idx: 0, side: 0 }], rules: { needWinner: true }, onDone: res => game.go('cup', { post: true, res, round: i }) })),
      W('CUP: PROLOGUE', 'cup', { fresh: true }), W('ENDING', 'ending'), W('STICKER ALBUM', 'album'), W('ABOUT', 'about'), W('ATTRACT MODE', 'attract'), ...EF.all('drill').sort((a, b) => a.n - b.n).map(dr => ({ label: 'DRILL ' + dr.n + ': ' + dr.title, onPick: () => { D.close(); EF.startDrill(dr.id); } }))];
    this.lists = [tune, cheats, warp, []];
  },
  list() { return this.lists[this.tab]; },
  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt); const P = game.players, any = a => P.some(p => p.pressed(a)), rep = a => P.some(p => p.repeat(a, .3, .05));
    if (any('cancel') || any('pause') && false) { UI.eatAll(); this.close(); return; }
    if (any('switch') || any('start')) { this.tab = (this.tab + 3) % 4; this.i = 0; this.top = 0; EF.sfx('select'); } if (any('skill')) { this.tab = (this.tab + 1) % 4; this.i = 0; this.top = 0; EF.sfx('select'); }
    const L = this.list(), foc = k => L[k] && !L[k].header;
    if (L.length) { const step = d => { let n = this.i; for (let k = 0; k < L.length; k++) { n = (n + d + L.length) % L.length; if (foc(n)) { this.i = n; return; } } }; if (!foc(this.i)) step(1); if (rep('up')) step(-1); if (rep('down')) step(1);
      const it = L[this.i]; if (it && it.type === 'slider') { const dd = rep('left') ? -1 : rep('right') ? 1 : 0; if (dd) { it.set(clamp(+(it.get() + dd * it.step * (game.input.down('sprint') ? 5 : 1)).toFixed(4), it.min, it.max)); } if (any('confirm')) { it.set(it.def); this.toast('RESET ' + it.label); } }
      else if (it && it.type === 'toggle') { if (any('confirm') || rep('left') || rep('right')) it.set(!it.get()); } else if (it && it.onPick && any('confirm')) { UI.eatAll(); it.onPick(); }
      const rows = this.rows(); if (this.i < this.top) this.top = this.i; if (this.i >= this.top + rows) this.top = this.i - rows + 1; }
    UI.eatAll();
  },
  rows() { return Math.max(6, Math.floor((game.H - 56) / 11)); },
  draw(r) {
    const W = r.W, H = r.H, rows = this.rows(), px0 = 6, pw = Math.min(W - 12, 250); const sc = game.scene, M = sc && sc.M;
    r.overlay(g => {
      px.blend(g, .8, 'normal', () => px.rect(g, px0, 4, pw, H - 8, '#06081a')); px.rect(g, px0, 4, pw, 1, '#ffc83a'); this.tabs.forEach((t, i) => { const x = px0 + 6 + i * 58; TXT(g, t, x, 9, i === this.tab ? '#ffc83a' : '#6a7ab0', { scale: 1 }); if (i === this.tab) px.rect(g, x, 19, 50, 1, '#ffc83a'); });
      TXT(g, 'DEV MODE   ' + (this.msgT > 0 ? this.msg : ''), px0 + 6, H - 14, this.msgT > 0 ? '#9aff9a' : '#6a7ab0', { font: 'tiny' });
      if (this.tab === 3) { const lines = this.info(); lines.forEach((l, i) => TXT(g, l, px0 + 8, 26 + i * 9, '#dfe6ff', { font: 'tiny' })); }
      else { const L = this.list(); for (let k = 0; k < rows; k++) { const it = L[this.top + k]; if (!it) break; const y = 24 + k * 11, foc = this.top + k === this.i; if (it.header) { TXT(g, it.label, px0 + 8, y + 1, '#8a9ac8', { font: 'tiny' }); continue; } if (foc) px.rect(g, px0 + 3, y - 1, pw - 6, 11, '#24366e');
        TXT(g, it.label, px0 + 8, y + 1, foc ? '#ffffff' : '#b8c2e8', { font: 'tiny' });
        if (it.type === 'slider') { const bw = 70, bx = px0 + pw - bw - 40, f = (it.get() - it.min) / (it.max - it.min); px.rect(g, bx, y + 2, bw, 5, '#0a0c14'); px.rect(g, bx, y + 2, Math.round(bw * clamp(f, 0, 1)), 5, it.get() === it.def ? '#6a7ab0' : '#ffc83a'); TXT(g, (+it.get().toFixed(3)).toString(), px0 + pw - 6, y + 1, it.get() === it.def ? '#8a9ac8' : '#ffc83a', { font: 'tiny', align: 'right' }); }
        else if (it.type === 'toggle') TXT(g, it.get() ? 'ON' : 'OFF', px0 + pw - 6, y + 1, it.get() ? '#7aff9a' : '#ff8a7a', { font: 'tiny', align: 'right' }); } }
      UI.footer(g, r, [['switch', 'TAB'], ['skill', 'TAB'], ['confirm', this.tab === 0 ? 'RESET ONE' : 'DO IT'], ['cancel', 'CLOSE']]);
    });
    if (EF.dev.aiOverlay && M) r.queue && M.F.forEach(f => { const s = EF.AI.spot(M, f); r.queue(s[0], s[1], 0, g => { const [x, y] = r.w(s[0], s[1], 0), [fx, fy] = r.w(f.x, f.y, 0); px.line(g, Math.round(fx), Math.round(fy), Math.round(x), Math.round(y), f.side ? '#ff8a7a' : '#7aa8ff', 1); }, { emissive: true }); });
  },
  info() {
    const sc = game.scene, M = sc && sc.M, l = ['SCENE: ' + (sc && sc.name || '?'), 'ENGINE: ' + E.versionLabel().slice(0, 36), 'ERRORS: ' + game.errors.length + (game.errors.length ? ' - ' + String(game.errors[game.errors.length - 1].message).slice(0, 40) : ''), 'SAVE: ' + EF.Save.count() + ' STICKERS, ROUND ' + EF.Save.load().round];
    if (M) l.push('MODE: ' + M.mode + '  HALF ' + M.half + '  CLOCK ' + M.clock.toFixed(1), 'SCORE: ' + M.score.join('-') + '  SEED ' + M.seed, 'BALL: ' + Math.round(M.ball.x) + ',' + Math.round(M.ball.y) + ',' + Math.round(M.ball.z) + ' V' + Math.round(M.ball.speed()), 'OWNER: ' + (M.ball.owner ? M.ball.owner.name : 'NONE'), 'EUPHORIA: ' + M.eu.map(v => v.toFixed(2)).join(' / ') + (M.europhoria ? '  EUROPHORIA' : ''), 'EVENTS: ' + M.events.slice(-4).map(e => e.type).join(','), 'CARDS: ' + M.stats.map(s => s.cards).join('/') + '  FOULS ' + M.stats.map(s => s.fouls).join('/'), 'REF: ' + M.refData.name, 'STADIUM: ' + M.stadium.name);
    return l;
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1' && !EF.session) { e.preventDefault(); EF.Dev.toggle(); } });
