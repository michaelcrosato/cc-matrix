/* SAVES (section 6.31): the cup's progress, stickers, unlocks, records and drills, versioned with a migration; the cup
 * autosaves through game.saves (slot 'auto') and everything else is kept with E.store. Nothing is saved in a session. */
EF.Save = {
  V: 1, d: null,
  fresh() { return { v: 1, cup: null, stickers: {}, unlocks: { balls: ['classic', 'orange'] }, records: { fastestCup: null, biggestWin: null, cupsWon: 0 }, drills: {}, heard: 0, seen: {} }; },
  migrate(o) {
    if (!o || typeof o !== 'object') return this.fresh();
    if (!o.v) { const n = this.fresh(); if (o.stickers) n.stickers = o.stickers; if (o.round !== undefined) n.cup = { round: o.round, results: o.results || [], flags: {}, teamTalks: 0, started: Date.now() }; return n; }   // v0: a flat shape
    return Object.assign(this.fresh(), o, { v: 1 });
  },
  load() { if (EF.inSession) { this.d = this.fresh(); return; } this.d = this.migrate(E.store.get('ef:save', null)); },
  data() { if (!this.d) this.load(); return this.d; },
  write() { if (EF.inSession || EF.noSave) return; E.store.set('ef:save', this.d); try { const S = game.saves; S.write = () => ({ data: this.d, place: this.d.cup ? EF.CUP.rounds[Math.min(this.d.cup.round, 4)].name : 'TITLE', level: this.d.cup ? this.d.cup.round + 1 : 0 }); S.read = s => { this.d = this.migrate(s.data); }; S.autosave(); } catch (e) { /* storage blocked */ } },
  reset() { this.d = this.fresh(); this.write(); },
  cupState() { const d = this.data(); return d.cup ? { round: d.cup.round, results: d.cup.results.map(r => r.score.join('-')), done: !!d.cup.done } : null; },
  sticker(id, shiny) {
    const d = this.data(); if (d.stickers[id] && !(shiny && d.stickers[id] !== 'shiny')) return false;
    d.stickers[id] = shiny ? 'shiny' : true; this.write();
    const st = EF.get('sticker', id); if (st && !EF.quietStickers) EF.toast('STICKER: ' + st.name, { sub: shiny ? 'SHINY!' : 'ADDED TO YOUR ALBUM', icon: (g, x, y) => { px.rect(g, x - 6, y - 8, 12, 16, shiny ? '#ffe070' : '#e8e0d0'); px.rect(g, x - 4, y - 6, 8, 12, '#3a4a8a'); } });
    return true;
  },
  has(id) { return !!this.data().stickers[id]; },
  unlock(kind, id) { const u = this.data().unlocks; u[kind] = u[kind] || []; if (!u[kind].includes(id)) { u[kind].push(id); this.write(); EF.toast('UNLOCKED: ' + (EF.BALLS[id] ? EF.BALLS[id].name : id)); } },
  drill(id) { this.data().drills[id] = true; this.write(); }
};
