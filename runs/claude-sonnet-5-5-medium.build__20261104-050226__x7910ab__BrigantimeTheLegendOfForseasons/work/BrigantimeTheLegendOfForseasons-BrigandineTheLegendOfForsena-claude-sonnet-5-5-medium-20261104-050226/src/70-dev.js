/* ---- Dev mode: reached from the pause menu. Live balance sliders with a reset, and quick tools. ---- */
G.dev = {
  open: false, tab: 0, i: 0, sub: null, top: 0,
  toggle() { this.open = true; this.i = 0; this.tab = 0; this.sub = null; G.sfx('select'); },
  tools(scene) {
    const t = [];
    const bv = scene && scene.bv, camp = scene instanceof G.CampaignScene && G.run && G.run.S;
    t.push({ label: 'God mode: ' + (G.cheat.god ? 'ON' : 'off'), fn: () => { G.cheat.god = !G.cheat.god; } });
    t.push({ label: 'One-hit kills: ' + (G.cheat.oneHit ? 'ON' : 'off'), fn: () => { G.cheat.oneHit = !G.cheat.oneHit; } });
    if (camp) {
      const S = camp;
      t.push({ label: '+500 mana', fn: () => { S.realms[S.human].mana += 500; } });
      t.push({ label: 'Knights +3 levels', fn: () => { for (const k of C.knightsOf(S, S.human)) C.grant(S, k, C.xpNeed(k.lvl) * 3 + 90); for (const m of Object.values(S.mons)) if (m.realm === S.human) C.grant(S, m, 400); } });
      t.push({ label: 'Give every item', fn: () => { for (const i of G.ITEM_IDS) S.realms[S.human].items.push(i); } });
      t.push({ label: 'Heal everyone, free knights', fn: () => { for (const k of Object.values(S.knights)) { k.wounded = 0; k.hp = null; k.moved = false; k.marched = false; } } });
      t.push({ label: 'Take the castle under the cursor', fn: () => { const c = G.run.cursor; if (S.castles[c].owner !== S.human) { const a = { realm: S.human, to: c, from: [] }; C.takeCastle(S, a, true, null); } } });
      t.push({ label: 'Light the Hour-Candle at 3', fn: () => { S.candle = 3; } });
      t.push({ label: 'Trigger a story event...', fn: () => { this.sub = new UI.List(G.EVENTS.map(e => ({ label: e.id, id: e.id })), { rows: 9 }); } });
      t.push({ label: 'Skip to the next season', fn: () => { camp.marches = []; C.endMuster(S); S.queue = []; C.endSeason(S); G.run.stage = 'tidings'; scene.beginTidings(); scene.stack = []; } });
    }
    if (bv) {
      const S = bv.S;
      t.push({ label: 'Win this battle now', fn: () => { for (const u of B.live(S, 1)) if (u.alive) { u.hp = 0; B.fall(S, u, null, []); } if (!S.over) { S.over = true; S.winner = 0; S.reason = 'dev'; } bv.queueEvents([{ k: 'over', winner: 0, reason: 'dev' }]); } });
      t.push({ label: 'Lose this battle now', fn: () => { S.over = true; S.winner = 1; S.reason = 'dev'; bv.queueEvents([{ k: 'over', winner: 1, reason: 'dev' }]); } });
      t.push({ label: 'Heal my units, refill MP', fn: () => { for (const u of B.live(S, 0)) { u.hp = u.maxhp; u.mp = u.maxmp; } } });
      t.push({ label: 'Remove the unit under the cursor', fn: () => { const u = bv.cursorUnit(); if (u) { u.hp = 0; B.fall(S, u, null, []); bv.vis.get(u.uid).alpha = 0; } } });
      t.push({ label: 'Everyone may act again', fn: () => { for (const u of B.live(S, S.phase)) { u.done = u.acted = u.moved = false; } } });
    }
    t.push({ label: 'Gallery (creatures, knights, sound)', fn: () => { this.open = false; G.game.go('gallery'); } });
    t.push({ label: 'Return to the title', fn: () => { this.open = false; G.run = null; G.game.go('title'); } });
    return t;
  },
  update(scene) {
    if (!this.open) return false;
    const I = G.game.input, nav = UI.nav(); UI.pump();
    if (this.sub) { const r = this.sub.update(); if (r && r.cancel) this.sub = null; else if (r && r.pick != null) { const id = this.sub.items[r.pick].id; this.sub = null; this.open = false; G.game.go('event', { id, back: 'campaign' }); } return true; }
    if (I.pressed('cancel')) { this.open = false; G.sfx('back'); return true; }
    if (I.pressed('prev') || I.pressed('next')) { this.tab = (this.tab + 1) % 2; this.i = 0; G.sfx('cursor'); }
    const items = this.tab === 0 ? G.TUNE_META.length + 1 : this.tools(scene).length;
    if (nav.y) { this.i = (this.i + nav.y + items) % items; G.sfx('cursor'); }
    if (this.tab === 0) {
      const m = G.TUNE_META[this.i];
      if (m && nav.x) { const mul = I.down('alt') ? 5 : 1; G.tune[m[0]] = G.clamp(Math.round((G.tune[m[0]] + nav.x * m[4] * mul) / m[4]) * m[4], m[2], m[3]); G.tune[m[0]] = +G.tune[m[0]].toFixed(3); G.saveTune(); G.sfx('cursor'); }
      if (I.pressed('confirm') && this.i === G.TUNE_META.length) { G.resetTune(); UI.toast('Balance reset to defaults.'); G.sfx('select'); }
    } else if (I.pressed('confirm')) { const t = this.tools(scene)[this.i]; if (t) { t.fn(); G.sfx('select'); UI.toast(t.label.replace(/: (ON|off)/, '')); } }
    if (UI.click) { const h = UI.hit('devrow'); if (h) { this.i = h.i; if (this.tab === 1) { const t = this.tools(scene)[this.i]; if (t) t.fn(); } else if (h.i === G.TUNE_META.length) G.resetTune(); } }
    return true;
  },
  draw(g, W, H) {
    if (!this.open) return; const scene = G.game.scene;
    px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
    const w = Math.min(W - 20, 300), h = H - 40, x = (W - w) / 2, y = 10; G.box(g, x, y, w, h, { border: '#ff9a6a' });
    G.T(g, 'DEV MODE', x + 8, y + 5, '#ff9a6a'); ['Balance', 'Tools'].forEach((n, i) => { const tx = x + 80 + i * 60; px.rect(g, tx, y + 3, 56, 11, i === this.tab ? '#6a5aa8' : '#2a2046'); G.T(g, n, tx + 28 - G.TW(n) / 2, y + 5, i === this.tab ? '#fff8d8' : '#8a82a8'); });
    if (this.sub) { this.sub.draw(g, x + 10, y + 24, w - 20); return; }
    const rows = Math.floor((h - 36) / 12); UI.rects = UI.rects.filter(r => r.owner !== 'devrow');
    if (this.tab === 0) {
      const all = G.TUNE_META.length + 1, top = G.clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, all - rows));
      for (let k = 0; k < Math.min(rows, all); k++) { const i = top + k, yy = y + 20 + k * 12; UI.add('devrow', i, x + 6, yy, w - 12, 11); if (i < G.TUNE_META.length) { const m = G.TUNE_META[i]; UI.slider(g, x + 8, yy, w - 16, m[1], G.tune[m[0]], m[2], m[3], i === this.i); } else { if (i === this.i) px.rect(g, x + 8, yy, w - 16, 11, '#4a3a7a'); G.T(g, 'Reset all to defaults', x + 12, yy + 2, '#ffe8a0'); } }
      G.T(g, 'Left/Right adjust (hold ' + G.game.input.label('alt') + ' for x5). Changes apply live.', x + 8, y + h - 12, '#a8a0c8', { font: 'tiny' });
    } else {
      const list = this.tools(scene); const top = G.clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, list.length - rows));
      for (let k = 0; k < Math.min(rows, list.length); k++) { const i = top + k, yy = y + 20 + k * 12; UI.add('devrow', i, x + 6, yy, w - 12, 11); if (i === this.i) { px.rect(g, x + 8, yy, w - 16, 11, '#4a3a7a'); px.rect(g, x + 6, yy + 2, 2, 7, '#f0c860'); } G.T(g, list[i].label, x + 12, yy + 2, i === this.i ? '#fff8d8' : '#d8d0f0'); }
    }
  }
};
