/* ============ 43-saves: cup progress, stickers, unlocks ============ */
EF.Save = {
  d: null,
  fresh() { return { round: 0, started: false, prologue: false, loyal: false, stickers: { 'p:kip:0': 1, 'p:kip:1': 1, 'p:kip:2': 1, 'p:kip:3': 1, 'p:kip:4': 1, 'c:kip': 1 }, challenges: {}, unlocks: {}, records: { played: 0, wins: 0, goals: 0, cups: 0 }, ballId: 'classic' }; },
  load() { if (!this.d) { const s = E.store.get('ef:save2', null); this.d = Object.assign(this.fresh(), s && typeof s === 'object' ? s : {}); } return this.d; },
  save() { E.store.set('ef:save2', this.d); },
  has(id) { return !!this.load().stickers[id]; },
  sticker(id) { const d = this.load(); if (d.stickers[id] || EF.session) return false; d.stickers[id] = 1; this.save(); EF.newStickers = (EF.newStickers || []).concat(id); return true; },
  count() { return Object.keys(this.load().stickers).length; },
  reset() { this.d = this.fresh(); this.save(); }
};
EF.Save.load();
