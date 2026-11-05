// The AI Hub card (a round's own card, as the protocol allows): the two helmets facing off over the stadium, the players
// by side in their seat colors with ready ticks, HOW TO WIN, this device's controls, the countdown. READY (Enter, ✕ or a
// tap) and MORE TIME (△, T or a tap) are the only answers; nothing here changes the round.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, ui = FF.ui, glyph = FF.glyph;
const HC = { t: 0, stage: null, card: null, asked: false };
FF.scenes.hubcard = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter() { HC.t = 0; FF.audioFx.music('ANTHEM'); if (FF.net && !FF.net.started) FF.net.init(); },
  update(dt) {
    HC.t += dt;
    const N = FF.net; if (!N || !N.info) { if (HC.stage) HC.stage.update(dt); return; }
    if (!HC.stage) { HC.stage = new FF.Stage(N.setup.stadium, { home: N.setup.teams[0], away: N.setup.teams[1] }); HC.stage.enter(); }
    HC.stage.update(dt);
    if (N.server) return;
    const I = game.input, tap = I.clicked(), R = readyRect(), M = moreRect();
    if (game.players.some(p => p.pressed('start') || p.pressed('confirm') || p.pressed('b1')) || (tap && inside(tap, R))) N.answer('ready');
    if (game.players.some(p => p.pressed('b4')) || I.pressed && I.pressed('more') || (tap && inside(tap, M))) N.answer('more');
  },
  draw(r) {
    const N = FF.net;
    if (N && N.server) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, '#0a0a14')); return; }
    if (HC.stage) HC.stage.draw(r); else r.sky(['#0a0614', '#1a1030', '#2a1a40']);
    r.overlay(g => {
      px.blend(g, .62, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
      E.font.title(g, 'AMERICAN FOOTBALL FIASCO', r.W / 2, 6, { scale: 2, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], align: 'center', outline: '#000', depth: 1 });
      if (!N || !N.info) { ui.T(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffd84a', { align: 'center', scale: 2 }); return; }
      const T = FF.data.teams, t0 = T[N.setup.teams[0]], t1 = T[N.setup.teams[1]], card = N.card || {};
      // the helmets facing off
      const a = FF.Rigs.portraitRig(t0.id), b = FF.Rigs.portraitRig(t1.id), k = Math.abs(Math.sin(HC.t * 2)) * 5;
      a.drawPortrait(g, Math.round(r.W / 2 - 66 + k), 30, 52, { zoom: 2.2, turn: -.6, bg: E.shade(t0.colors.primary, -.5) });
      b.drawPortrait(g, Math.round(r.W / 2 + 14 - k), 30, 52, { zoom: 2.2, turn: .6, bg: E.shade(t1.colors.primary, -.5) });
      E.font.title(g, 'VS', r.W / 2, 48, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' });
      for (const s of [0, 1]) { const t = s ? t1 : t0, x = s ? r.W / 2 + 80 : r.W / 2 - 80; ui.logo(g, t, x - 18 + (s ? 0 : 0), 30, 3); ui.T(g, t.short, x, 68, '#f4f0e6', { align: 'center' }); }
      ui.T(g, FF.data.stadiums[N.setup.stadium].name, r.W / 2, 86, '#c8c4e0', { align: 'center', font: 'tiny' });
      // the players by side, in their seat colors, with ready ticks
      const ready = card.ready || [];
      N.info.players.forEach((p, i) => { const s = N.sideOf(p.id), x = s ? r.W / 2 + 20 : r.W / 2 - 150, y = 96 + Math.floor(N.info.players.filter((q, j) => j < i && N.sideOf(q.id) === s).length) * 12;
        px.rect(g, x, y, 130, 10, '#14142a'); px.rect(g, x, y, 3, 10, p.color); E.font.text(g, String(p.name).toUpperCase().replace(/[^A-Z0-9 .\-!?']/g, '?').slice(0, 16), x + 6, y + 2, p.color, { outline: false, font: 'tiny' }); if (ready.includes(p.id)) ui.T(g, '✓ READY', x + 126, y + 1, '#5ae05a', { align: 'right', font: 'tiny' }); if (p.id === N.info.me) ui.T(g, 'YOU', x + 84, y + 2, '#ffffff', { font: 'tiny' }); });
      ui.T(g, 'HOW TO WIN: OUTSCORE THEM OVER ONE HALF', r.W / 2, 150, '#ffd84a', { align: 'center' });
      // this device's controls
      const I = game.input, list = [['move', 'RUN'], ['b1', 'HIKE · DIVE · TACKLE'], ['recv', 'THROW'], ['turbo', 'TURBO']];
      ui.prompts(g, list, r.W / 2, 166, { align: 'center', I });
      // the countdown, READY and MORE TIME
      const left = card.left, txt = card.paused ? 'PAUSED' : card.starting ? 'STARTING...' : left !== null && left !== undefined ? Math.ceil(left / 1000) + '' : '';
      E.font.title(g, txt, r.W / 2, 180, { scale: 3, colors: ['#ffffff', card.paused ? '#a0c0ff' : '#ffd84a'], align: 'center', outline: '#000' });
      const R = readyRect(), M = moreRect();
      ui.button(g, R.x, R.y, R.w, R.h, ready.includes(N.info.me) ? 'READY ✓' : 'READY', { focus: true, scale: 1 }); glyph.chip(g, R.x + 4, R.y + R.h / 2, glyph.device(I) === 'gamepad' ? 'b1' : 'start', { I });
      ui.button(g, M.x, M.y, M.w, M.h, card.asked ? 'MORE TIME ✓' : 'MORE TIME', { focus: false, scale: 1 }); glyph.chip(g, M.x + 4, M.y + M.h / 2, glyph.device(I) === 'gamepad' ? 'b4' : 'b4', { I, look: glyph.device(I) === 'gamepad' ? null : { kind: 'key', text: 'T' } });
      if (card.asking) ui.T(g, card.asking + ' ASKED FOR MORE TIME', r.W / 2, R.y + R.h + 4, '#a0c0ff', { align: 'center', font: 'tiny' });
      if (FF.touchOnly.locked) ui.T(g, 'CONTROLLER OR KEYBOARD REQUIRED · THE CPU PLAYS YOUR SEAT UNTIL ONE IS USED', r.W / 2, r.H - 10, '#ff9a8a', { align: 'center', font: 'tiny' });
    });
  }
};
function readyRect() { return { x: Math.round(game.W / 2 - 126), y: game.H - 44, w: 120, h: 20 }; }
function moreRect() { return { x: Math.round(game.W / 2 + 6), y: game.H - 44, w: 120, h: 20 }; }
const inside = (c, R) => c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h;
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'KeyT' && game.sceneName === 'hubcard' && FF.net) FF.net.answer('more'); });
})();
