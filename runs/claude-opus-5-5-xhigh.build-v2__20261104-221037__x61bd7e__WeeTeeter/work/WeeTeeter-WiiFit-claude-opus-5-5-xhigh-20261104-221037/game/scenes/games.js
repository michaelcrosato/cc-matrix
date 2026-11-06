/* scenes/games.js: The Gentle Games, Day 5. Short versions in order, one continuous festival with bunting, music and a
 * crowd, then the Grand Stillness: a Quiet Candle duel with Gertrude on a raft at dusk. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
G.drawCrowd = (g, W, H, t, cheer = 0) => {
  const cols = ['#f08fb0', '#2cc6e6', '#f5c84b', '#6fcf8e', '#b08be0', '#ff7a59'], skins = ['#f2d3b8', '#c99468', '#e8bd96', '#9c6b44'];
  for (let i = 0; i < Math.ceil(W / 15) + 1; i++) { const x = i * 15 - 4 + (i % 2) * 3, b = Math.abs(Math.sin(t * (3 + cheer * 5) + i * 1.3)) * (2 + cheer * 7), y = H - 8 - b; px.rect(g, x - 6, y + 2, 12, 12, cols[i % cols.length]); px.disc(g, x, y - 2, 5, skins[i % skins.length]); if (cheer > .3 && i % 2) { px.rect(g, x - 8, y - 9, 2, 9, skins[i % skins.length]); px.rect(g, x + 6, y - 9, 2, 9, skins[i % skins.length]); } }
};
let i = 0, phase = 'intro', t = 0, ctx = null, list = [], tally = 0, stars = [], cheer = 0, pills = null, results = null, duel = false, duelCtx = null, won = false;
function startEvent() {
  const id = list[i], def = G.activities[id]; phase = 'intro'; t = 0; duel = false; cheer = 0;
  game.setView(def.view); G.talk.close();
  ctx = G.makeRun(id, { tier: 0, mode: 'games', dur: G.DATA.games.dur, short: true, seed: 700 + i * 13 + G.S.day, contestants: [{ name: G.S.name, input: game.input, local: true, look: G.S.look, wear: G.S.wear }] });
  G.music(id === 'step' ? null : id === 'slalom' ? 'ski' : 'festival');
  G.mutter('tare', i === 0 ? G.DATA.lines.tare.gameOn[0] : G.line('tare.gameOn'), { attract: true, auto: 2.8, face: 'happy' });
}
function startDuel() {
  duel = true; phase = 'intro'; t = 0; game.setView('brawler'); G.talk.close(); G.music('raft');
  ctx = G.makeRun('candle', { tier: 0, mode: 'duel', dur: G.DATA.games.duel, seed: 90 + G.S.day, contestants: [{ name: G.S.name, input: game.input, local: true, look: G.S.look, wear: G.S.wear }] });
  G.setDayLight('dusk');
  G.say('gertrude', G.DATA.lines.gertrudeDuel, { onDone() { phase = 'breathe'; t = 0; G.mutter(G.S.instructor || 'birch', G.DATA.lines[G.S.instructor || 'birch'].breathe, { auto: 2.6 }); } });
}
function finishEvent() {
  const c = ctx.local, def = ctx.def; const earned = G.recordRun(def, 0, c.pct, c.stars, Math.max(.25, ctx.time / 60)); tally += c.score; stars.push(c.stars); cheer = 1; for (const u of earned.got) if (u.wear) G.S.wear[u.id] = true;
  if (duel) { won = !!ctx.won; G.S.duelWon = won; G.S.games = 1; G.S.gamesScore = tally; phase = 'duelEnd'; t = 0; G.A.sfx(won ? 'ok' : 'tareSad'); G.sting(won ? 'star3' : 'star1');
    G.say('gertrude', won ? G.DATA.lines.gertrudeWin : G.DATA.lines.gertrudeLose, { onDone() { G.Save.save(); G.go('ending', null, { fade: 'iris', seconds: .6 }); } }); return; }
  phase = 'score'; t = 0; G.dbg.pct = +c.pct.toFixed(3); G.dbg.stars = c.stars;
  pills = new G.Pills([{ label: i + 1 < list.length ? 'Next event' : 'The Grand Stillness', id: 'next' }], { y: () => game.H - 44, w: 170, h: 22, onPick() { i++; if (i < list.length) startEvent(); else startDuel(); } });
  results = new G.Results(def, 0, c.pct, c.stars, c.detail, earned, {});
  G.Save.save();
}
G.scenes.games = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter(d) { list = G.DATA.games.list.slice(); tally = 0; stars = []; G.dbg.activity = 'games'; G.setDayLight('noon'); G.L.enabled = false; if (d && d.duel) { i = list.length; startDuel(); } else { i = 0; startEvent(); }
    G.current = { def: null, restart() { if (duel) startDuel(); else startEvent(); } }; },
  exit() { if (ctx && ctx.def.stop) ctx.def.stop(ctx); G.talk.close(); },
  update(dt) {
    t += dt; cheer = Math.max(0, cheer - dt * .6); if (G.talk.update(dt)) { if (ctx) G.previewRun(ctx, dt); return; }
    if (phase === 'intro') { G.previewRun(ctx, dt); if (!duel && t > 3) { phase = 'breathe'; t = 0; } if (duel && t > 40) { phase = 'breathe'; t = 0; } return; }
    if (phase === 'breathe') { G.previewRun(ctx, dt); if (t >= 3) { phase = 'play'; game.input.consumeAll(); if (ctx.def.begin) ctx.def.begin(ctx); G.talk.close(); } return; }
    if (phase === 'play') { G.stepRun(ctx, dt); if (ctx.done) finishEvent(); return; }
    if (phase === 'score') { G.previewRun(ctx, dt); results.update(dt); if (t > 1.2) pills.update(dt); return; }
    if (phase === 'duelEnd') G.previewRun(ctx, dt);
  },
  draw(r) {
    G.drawRun(r, ctx);
    r.overlay(g => {
      const W = game.W, H = game.H;
      if (!duel && ctx.def.view === 'brawler') { G.bunting(g, -6, W * .5, 3, 14); G.bunting(g, W * .5, W + 6, 3, 14); }
      if (!duel && (phase !== 'play' || ctx.def.view !== 'tray')) G.drawCrowd(g, W, H, game.real, cheer);
      if (phase === 'intro' && !duel) { const nm = ctx.tier.name; G.panel(g, W / 2 - 110, 42, 220, 60, { r: 10 }); txt(g, 'The Gentle Games', W / 2, 47, '#14a8c8', { align: 'center' }); txt(g, 'Event ' + (i + 1) + ' of ' + (list.length + 1), W / 2, 58, '#5f7f8a', { align: 'center' }); E.font.title(g, nm, W / 2, 72, { scale: 2, colors: ['#44d4f0', '#14a8c8'], align: 'center', depth: 1, depthColor: '#0d7f97', outline: false }); G.prompts(g, G.controlsFor(ctx.def)); }
      if (phase === 'breathe') { const k = Math.max(1, Math.ceil(3 - t)); G.panel(g, W / 2 - 70, H * .24, 140, 54, { r: 10 }); txt(g, duel ? 'The Grand Stillness' : 'Breathe in', W / 2, H * .24 + 6, '#14a8c8', { align: 'center' }); txt(g, k, W / 2, H * .24 + 19, '#20404c', { align: 'center', scale: 3 }); }
      if (phase === 'score') { results.draw(g); txt(g, 'Festival points: ' + tally, W / 2, H - 56, '#20404c', { align: 'center', shadow: '#ffffff' }); pills.draw(g); G.prompts(g, [['confirm', 'Next']]); }
      if (phase === 'duelEnd') { G.panel(g, W / 2 - 100, 40, 200, 40, { r: 10 }); txt(g, won ? G.DATA.lines.notes.herFlame : G.DATA.lines.notes.yourFlame, W / 2, 46, won ? '#14a8c8' : '#e0553a', { align: 'center' }); txt(g, won ? G.DATA.lines.notes.duelWon : G.DATA.lines.notes.duelLost, W / 2, 60, '#5f7f8a', { align: 'center' }); }
    });
    G.talk.draw(r);
  }
};
G.gamesPhase = () => phase;
G.scenes.duel = { view: 'brawler', camera: { zoom: false }, enter() { G.go('games', { duel: true }, { fade: 0 }); } };
})();
