/* AMERICAN FOOTBALL FIASCO — Dev mode (from the pause menu): live sliders for the balance numbers, toggles, cheats, and a reset to defaults. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px, clamp } = E, game = FF.game, UI = FF.UI, T = FF.T;
const dev = FF.dev = { S: null, i: 0, scroll: 0, rects: [], cardI: 0, msg: '' };
dev.attach = S => { dev.S = S; };
dev.detach = () => { dev.S = null; };
const CARD_IDS = FF.CARD_LIST;
function rows() {
  const S = dev.S, M = S && S.M, list = [];
  for (const [k, label, def, min, max, step] of FF.TUNE) list.push({ kind: 'slider', k, label, def, min, max, step });
  for (const [k, label] of FF.TOGGLES) list.push({ kind: 'toggle', k, label });
  list.push({ kind: 'action', label: 'Give a Fiasco Card: ' + CARD_IDS[dev.cardI].toUpperCase() + ' (left / right picks)', id: 'card' });
  list.push({ kind: 'action', label: 'Lights out (toggle)', id: 'lights' }, { kind: 'action', label: 'Fill turbo', id: 'turbo' }, { kind: 'action', label: 'Score +7 for you', id: 'sc0' }, { kind: 'action', label: 'Score +7 for them', id: 'sc1' },
    { kind: 'action', label: 'Skip to the end of the quarter', id: 'skip' }, { kind: 'action', label: 'Touchdown now (during a play)', id: 'td' }, { kind: 'action', label: 'Slow motion (toggle)', id: 'slow' },
    { kind: 'action', label: 'RESET ALL TO DEFAULTS', id: 'reset' }, { kind: 'action', label: 'Close Dev mode', id: 'close' });
  void M; return list;
}
FF.openDev = () => {
  const S = FF.S; if (!S || !S.M || (S.cfg && S.cfg.mode === 'hub')) { return; }
  S.devOpen = true; dev.S = S; dev.i = 0; dev.scroll = 0; game.resume();
};
function act(id) {
  const S = dev.S, M = S.M;
  if (id === 'close') { S.devOpen = false; return; }
  if (id === 'reset') { FF.resetTune(); game.timeScale = 1; S.lightsOut = 0; FF.ui('confirm'); return; }
  if (id === 'card') M.devCard(FF.humanSide(M), CARD_IDS[dev.cardI]);
  if (id === 'lights') S.lightsOut = S.lightsOut > 0 ? 0 : 1;
  if (id === 'turbo') M.turbo = [100, 100];
  if (id === 'sc0') M.devScore(0, 7); if (id === 'sc1') M.devScore(1, 7);
  if (id === 'skip') M.devSkipQuarter(); if (id === 'td') M.devTD(FF.humanSide(M));
  if (id === 'slow') game.timeScale = game.timeScale < 1 ? 1 : .3;
  FF.ui('confirm');
}
function adjust(it, dir, big) {
  if (it.kind === 'slider') { const st = it.step * (big ? 5 : 1); T[it.k] = clamp(Math.round((T[it.k] + dir * st) / it.step) * it.step, it.min, it.max); T[it.k] = +T[it.k].toFixed(3); if (it.k === 'quarter' && dev.S.M) { dev.S.M.qlen = T.quarter; dev.S.M.clock = T.quarter; } FF.ui('blip'); }
  else if (it.kind === 'toggle') { T[it.k] = !T[it.k]; FF.ui('blip'); }
  else if (it.id === 'card') { dev.cardI = (dev.cardI + dir + CARD_IDS.length) % CARD_IDS.length; FF.ui('blip'); }
}
dev.update = dt => {
  const I = game.input, list = rows(), n = list.length;
  if (I.repeat('up', .3, .08)) { dev.i = (dev.i + n - 1) % n; FF.ui('blip'); } if (I.repeat('down', .3, .08)) { dev.i = (dev.i + 1) % n; FF.ui('blip'); }
  const big = I.down('turbo');
  if (I.repeat('left', .25, .04)) adjust(list[dev.i], -1, big); if (I.repeat('right', .25, .04)) adjust(list[dev.i], 1, big);
  const mv = UI.mouseMoved(); if (mv) dev.rects.forEach((rc, k) => { if (UI.inside(mv, rc.r)) dev.i = rc.idx; });
  const ck = I.clicked(); if (ck) dev.rects.forEach(rc => { if (UI.inside(ck, rc.r)) { dev.i = rc.idx; const it = list[rc.idx]; if (it.kind === 'slider' && ck[0] > rc.r[0] + 118) { T[it.k] = +clamp(Math.round((it.min + (it.max - it.min) * clamp((ck[0] - rc.bx) / rc.bw, 0, 1)) / it.step) * it.step, it.min, it.max).toFixed(3); } else if (it.kind === 'toggle') adjust(it, 1); else if (it.kind === 'action') act(it.id); } });
  if (I.pressed('confirm') || I.pressed('a')) { const it = list[dev.i]; if (it.kind === 'action') act(it.id); else if (it.kind === 'toggle') adjust(it, 1); }
  if (I.pressed('cancel') || I.pressed('pause') && false) { dev.S.devOpen = false; }
  dev.scroll = clamp(dev.i - 8, 0, Math.max(0, n - 17));
};
dev.draw = (g, r) => {
  const list = rows(), W = r.W, H = r.H; px.rect(g, 0, 0, W, H, 'rgba(6,4,20,0.7)');
  UI.box(g, 6, 4, 262, H - 8, { bg: ['#101828', '#080c18'], border: '#7ad8ff' });
  UI.text(g, 'DEV MODE', 14, 8, '#7ad8ff', { scale: 2 });
  UI.text(g, 'sliders apply live', 262 - 4, 12, '#6a7a98', { align: 'right' });
  dev.rects = [];
  const vis = list.slice(dev.scroll, dev.scroll + 17);
  vis.forEach((it, k) => {
    const idx = dev.scroll + k, y = 26 + k * 11, on = idx === dev.i; dev.rects.push({ r: [10, y - 1, 254, 11], idx, bx: 150, bw: 70 });
    if (on) px.rect(g, 10, y - 1, 254, 11, '#1c3a5a');
    if (it.kind === 'slider') {
      UI.text(g, it.label, 14, y, on ? '#fff' : '#b0c0d8'); const v = T[it.k], u = (v - it.min) / (it.max - it.min);
      px.rect(g, 150, y + 3, 70, 3, '#2a3a58'); px.rect(g, 150, y + 3, Math.round(70 * u), 3, v !== it.def ? '#ffb347' : '#4ac8ff'); px.rect(g, 150 + Math.round(70 * u) - 1, y, 3, 9, '#fff');
      UI.text(g, String(v), 258, y, v !== it.def ? '#ffb347' : '#e8f0ff', { align: 'right' });
    } else if (it.kind === 'toggle') { UI.text(g, it.label, 14, y, on ? '#fff' : '#b0c0d8'); UI.text(g, T[it.k] ? 'ON' : 'off', 258, y, T[it.k] ? '#8aff8a' : '#6a7a98', { align: 'right' }); }
    else UI.text(g, it.label, 14, y, it.id === 'reset' ? '#ff9a8a' : on ? '#fff' : '#9fd0ff');
  });
  UI.text(g, 'Up/down choose   Left/right change (' + UI.label('turbo') + ' = x5)   ' + UI.label('confirm') + ' use   ' + UI.label('cancel') + ' close', 10, H - 14, '#8aa0c0');
};
})();
