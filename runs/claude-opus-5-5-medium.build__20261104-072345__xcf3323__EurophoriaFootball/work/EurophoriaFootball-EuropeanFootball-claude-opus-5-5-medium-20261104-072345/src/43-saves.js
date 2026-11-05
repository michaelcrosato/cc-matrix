/* 43-saves: the save (versioned, with a migration): cup progress, stickers, unlocks, records, drills. Kept with
 * E.store and mirrored to the engine's autosave slot (game.saves) after each cup round. Stickers are earned by events. */
const SAVE_V = 1;
const freshSave = () => ({ v: SAVE_V, cup: null, stickers: {}, unlocks: { balls: ['classic', 'orange'] }, records: { fastestCup: null, biggestWin: null, cupsWon: 0 }, drills: {}, lines: 0 });
EF.Save = {
  data: null,
  migrate(d) {
    if (!d || typeof d !== 'object') return freshSave();
    if (!d.v) { const n = freshSave(); if (d.round != null) n.cup = { round: d.round, results: d.results || [], flags: {} }; if (d.stickers) n.stickers = d.stickers; return n; }   // v0: a flat shape
    return Object.assign(freshSave(), d, { unlocks: Object.assign(freshSave().unlocks, d.unlocks || {}), records: Object.assign(freshSave().records, d.records || {}) });
  },
  load() { this.data = this.migrate(SESSION ? null : E.store.get('ef:save', null)); return this.data; },
  save() { if (SESSION) return; E.store.set('ef:save', this.data); try { if (this.data.cup && game.saves && game.saves.autosave) game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  reset() { this.data = freshSave(); this.save(); },
  sticker(id, shiny) {
    const d = this.data, s = EF.get('sticker', id); if (!s) return false;
    const had = d.stickers[id]; if (had === 'shiny' || (had && !shiny)) return false;
    d.stickers[id] = shiny ? 'shiny' : true; this.save();
    EF.bus.emit('sticker', { id, name: s.name, shiny: !!shiny });
    if (LIVE.hud) LIVE.hud.toast('STICKER!', s.name + (shiny ? ' (SHINY)' : '')); else EF.pendingToasts.push(['STICKER!', s.name]);
    EF.sfx('shimmer');
    return true;
  },
  has(id) { return !!this.data.stickers[id]; },
  unlockBall(id) { const b = this.data.unlocks.balls; if (!b.includes(id)) { b.push(id); this.save(); EF.bus.emit('unlock', { id }); } }
};
EF.pendingToasts = [];
if (game.saves) {
  game.saves.write = () => ({ data: EF.Save.data, place: EF.Save.data.cup ? (EF.ROUNDS[EF.Save.data.cup.round] || {}).name || 'CUP RUN' : 'KIPPERTON', level: EF.Save.data.cup ? EF.Save.data.cup.round : 0 });
  game.saves.read = save => { if (save && save.data) { EF.Save.data = EF.Save.migrate(save.data); E.store.set('ef:save', EF.Save.data); } };
}
/* ---- stickers: 30 players, 6 crests, 5 stadiums, 5 shiny challenges, 5 specials ---- */
EF.initStickers = () => {
  for (const t of EF.all('team')) {
    for (const p of t.players) EF.def('sticker', 'p-' + p.id, { kind: 'player', ref: p.id, team: t.id, name: p.name, pos: p.pos, how: t.id === 'kipperton' ? 'In the squad from the start' : 'Play against ' + t.name });
    EF.def('sticker', 'c-' + t.id, { kind: 'crest', ref: t.id, team: t.id, name: t.name, how: t.id === 'kipperton' ? 'Your own club' : 'Play against ' + t.name });
  }
  for (const s of EF.all('stadium')) if (!s.training) EF.def('sticker', 's-' + s.id, { kind: 'stadium', ref: s.id, name: s.name, how: 'Play a match at ' + s.name });
  for (const c of EF.all('challenge')) EF.def('sticker', 'g-' + c.id, { kind: 'shiny', ref: c.id, name: c.title, how: "Gaffer's Challenge: " + c.title, shiny: true });
  EF.def('sticker', 'x-mags', { kind: 'special', ref: 'mags', name: 'MAGS MULLIGAN', how: 'Finish the prologue' });
  EF.def('sticker', 'x-keith', { kind: 'special', ref: 'keith', name: 'KIPPER KEITH', how: 'Tackle the pitch invader' });
  EF.def('sticker', 'x-barrytrev', { kind: 'special', ref: 'barry', name: 'BARRY & TREV', how: 'Hear 50 lines of commentary' });
  EF.def('sticker', 'x-bus', { kind: 'special', ref: 'bus', name: 'THE BUS', how: 'Score past the parked bus' });
  EF.def('sticker', 'x-loyal', { kind: 'special', ref: 'loyal', name: 'LOYAL KIPPER', how: 'Turn down the Baron' });
};
// stickers from what happens in matches
EF.bus.on('matchOver', ev => {
  if (SESSION || !ev.match || ev.match.o.attract) return;
  const m = ev.match;
  for (const t of m.teams) { EF.Save.sticker('c-' + t.id); for (const p of t.players) EF.Save.sticker('p-' + p.id); }
  EF.Save.sticker('s-' + m.st.id);
  const s = ev.summary, w = s.winner, gd = Math.abs(s.score[0] - s.score[1]);
  const kipSide = m.teams[0].id === 'kipperton' ? 0 : m.teams[1].id === 'kipperton' ? 1 : -1;
  if (kipSide >= 0 && w === kipSide && (!EF.Save.data.records.biggestWin || gd > EF.Save.data.records.biggestWin.gd)) { EF.Save.data.records.biggestWin = { gd, score: s.score.slice(), vs: m.teams[1 - kipSide].name }; EF.Save.save(); }
});
EF.bus.on('invaderTackled', ev => { if (ev.match && !ev.match.o.attract && ev.who === 'keith') EF.Save.sticker('x-keith'); });
EF.bus.on('busBeaten', ev => { if (ev.match && !ev.match.o.attract) EF.Save.sticker('x-bus'); });
EF.bus.on('line', ev => { if (!EF.Save.data || (ev.match && ev.match.o.attract)) return; EF.Save.data.lines = (EF.Save.data.lines || 0) + 1; if (EF.Save.data.lines >= 50) EF.Save.sticker('x-barrytrev'); });
