/* ---- THE WORKSHOP: a mission editor (after Tenchu 2's Mission Editor). Paint a small night location, place guards, a start and an exit, then play it. ---- */
const WW = 36, WH = 26;
const BRUSHES = [['floor', '.'], ['wall', '#'], ['low wall', 'W'], ['house', 'A'], ['grass', ','], ['water', '~'], ['gravel', ':'], ['planter', 'p'], ['lantern', 'lamp'], ['ashigaru', 'ashigaru'], ['samurai', 'samurai'], ['archer', 'archer'], ['hound', 'hound'], ['start', 'start'], ['exit', 'exit'], ['erase', 'erase']];
const BRUSH_COL = { '.': '#4a4458', '#': '#9a90b0', W: '#7a7088', A: '#c8b89a', ',': '#3e7a3a', '~': '#2a5a8a', ':': '#a89c88', p: '#5a8a3a' };
const wsDefault = () => { const rows = B.grid(WW, WH, [...outline('#', 0, 0, WW, WH), ['A', 8, 8, 5, 4], ['W', 20, 4, 1, 8], ['~', 24, 14, 6, 4], [',', 4, 16, 6, 5]]).map(r => r.split('')); return { rows, ents: [{ k: 'samurai', x: 16, y: 12 }, { k: 'ashigaru', x: 26, y: 8 }, { k: 'lamp', x: 15, y: 10 }, { k: 'start', x: 3, y: 22 }, { k: 'exit', x: 32, y: 3 }] }; };
function wsLoad() { const w = B.save.workshop; if (w && w.rows) return { rows: w.rows.map(r => r.split('')), ents: w.ents.map(e => Object.assign({}, e)) }; return wsDefault(); }
function wsSave(d) { B.save.workshop = { rows: d.rows.map(r => r.join('')), ents: d.ents }; B.persist(); }
function wsMission(d) {
  const st = d.ents.find(e => e.k === 'start') || { x: 2, y: WH - 3 }, ex = d.ents.find(e => e.k === 'exit') || { x: WW - 3, y: 2 }, ops = [];
  d.rows.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') ops.push([c, x, y, 1, 1]); }));
  return { id: 'custom', n: -5, name: 'Workshop Mission', place: 'Your own night', w: WW, h: WH, ambient: .45, weather: { kind: 'leaves', amount: .3 }, music: 'm1', par: 300, loadHint: B.save.loadout, ops,
    hero: [st.x, st.y], exit: [ex.x, ex.y, 2.2], exitName: 'THE EXIT', lanterns: d.ents.filter(e => e.k === 'lamp').map(e => [e.x, e.y]), props: [],
    guards: d.ents.filter(e => B.ENEMY[e.k]).map(e => ({ type: e.k, at: [e.x, e.y], mode: 'post' })),
    objectives: [{ id: 'out', text: 'Reach the exit unseen', kind: 'exit', req: true }] };
}
B.MISSIONS_CUSTOM = null;
const wsOrig = B.missionById; B.missionById = id => id === 'custom' ? B.MISSIONS_CUSTOM : wsOrig(id);
let ws = null, wsBrush = 1, wsCur = [4, 4], wsMsg = '', wsLastPtr = null;
scenes.workshop = {
  view: 'side', input: INPUT, res: 'ps1',
  enter() { ws = wsLoad(); wsCur = [4, WH - 5]; wsMsg = 'Paint with ' + lbl('confirm') + '.'; game.follow(null); game.resetCamera(); A.music(B.SONGS.shop); L.enabled = false; game.weather = null; S = null; game.timeScale = 1; this.geo = null; },
  paint(x, y, erase) {
    if (x < 1 || y < 1 || x >= WW - 1 || y >= WH - 1) return;
    const br = BRUSHES[wsBrush][1];
    ws.ents = ws.ents.filter(e => !(e.x === x && e.y === y));
    if (erase || br === 'erase') { ws.rows[y][x] = '.'; return; }
    if (br === 'start' || br === 'exit') { ws.ents = ws.ents.filter(e => e.k !== br); ws.ents.push({ k: br, x, y }); ws.rows[y][x] = '.'; }
    else if (br === 'lamp' || B.ENEMY[br]) { ws.ents.push({ k: br, x, y }); if (ws.rows[y][x] !== '.' && ws.rows[y][x] !== ',' && ws.rows[y][x] !== ':') ws.rows[y][x] = '.'; }
    else ws.rows[y][x] = br;
  },
  play() { B.MISSIONS_CUSTOM = wsMission(ws); wsSave(ws); game.go('play', { mission: 'custom' }); },
  update(dt) {
    const I = game.input; let moved = false;
    for (const [a, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (I.repeat(a, .3, .05)) { wsCur[0] = clamp(wsCur[0] + dx, 0, WW - 1); wsCur[1] = clamp(wsCur[1] + dy, 0, WH - 1); moved = true; }
    if (I.pressed('cycle') || I.pressed('use')) { wsBrush = (wsBrush + 1) % BRUSHES.length; A.sfx('tick'); }
    if (I.pressed('block')) { wsBrush = (wsBrush + BRUSHES.length - 1) % BRUSHES.length; A.sfx('tick'); }
    if (I.pressed('confirm') || I.down('attack')) this.paint(wsCur[0], wsCur[1], false);
    if (I.pressed('crouch')) this.paint(wsCur[0], wsCur[1], true);
    if (I.pressed('interact')) { this.play(); return; }
    if (I.pressed('dodge')) { ws = wsDefault(); wsMsg = 'Reset to the sample map.'; }
    if (I.pressed('cancel') || I.pressed('pause')) { wsSave(ws); game.go('title'); return; }
    const p = I.pointer && I.pointer(), g = this.geo;
    if (p && g && (!wsLastPtr || Math.abs(p[0] - wsLastPtr[0]) + Math.abs(p[1] - wsLastPtr[1]) > 1)) { wsLastPtr = p.slice(); const cx = Math.floor((p[0] - g.x) / g.s), cy = Math.floor((p[1] - g.y) / g.s); if (cx >= 0 && cy >= 0 && cx < WW && cy < WH) { wsCur = [cx, cy]; if (I.down('attack') && 0) this.paint(cx, cy); } }
    const c = I.clicked && I.clicked(); if (c && g) { const cx = Math.floor((c[0] - g.x) / g.s), cy = Math.floor((c[1] - g.y) / g.s); if (cx >= 0 && cy >= 0 && cx < WW && cy < WH) { wsCur = [cx, cy]; this.paint(cx, cy); } else if (c[1] > game.H - 30) { wsBrush = (wsBrush + 1) % BRUSHES.length; } }
  },
  draw(r) {
    NIGHT.draw(r); const W = r.W, H = r.H, s = Math.max(4, Math.floor(Math.min((W - 20) / WW, (H - 74) / WH))), ox = Math.floor((W - s * WW) / 2), oy = 30; this.geo = { x: ox, y: oy, s };
    r.overlay(g => {
      bigText(g, 'THE WORKSHOP', W / 2, 6, 2);
      px.rect(g, ox - 2, oy - 2, s * WW + 4, s * WH + 4, '#0a0810');
      for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) px.rect(g, ox + x * s, oy + y * s, s - 1, s - 1, BRUSH_COL[ws.rows[y][x]] || '#4a4458');
      for (const e of ws.ents) { const cx = ox + e.x * s + s / 2, cy = oy + e.y * s + s / 2, col = e.k === 'start' ? '#40e0a0' : e.k === 'exit' ? '#ffd040' : e.k === 'lamp' ? '#ffb868' : '#ff5a4a'; px.disc(g, mm(cx), mm(cy), Math.max(2, s / 2 - 1), col); if (s >= 8) E.font.text(g, e.k === 'lamp' ? 'L' : e.k === 'start' ? 'S' : e.k === 'exit' ? 'X' : e.k[0].toUpperCase(), mm(cx), mm(cy - 3), '#000', { align: 'center', outline: false }); }
      px.rect(g, ox + wsCur[0] * s - 1, oy + wsCur[1] * s - 1, s + 1, 1, '#fff'); px.rect(g, ox + wsCur[0] * s - 1, oy + wsCur[1] * s + s - 1, s + 1, 1, '#fff'); px.rect(g, ox + wsCur[0] * s - 1, oy + wsCur[1] * s - 1, 1, s + 1, '#fff'); px.rect(g, ox + wsCur[0] * s + s - 1, oy + wsCur[1] * s - 1, 1, s + 1, '#fff');
      footer(g, W, H, 40);
      txt(g, 'Brush: ' + BRUSHES[wsBrush][0].toUpperCase() + '   (' + lbl('use') + ' next, ' + lbl('block') + ' previous)    ' + wsMsg, W / 2, H - 36, '#ffe9b0', { align: 'center' });
      txt(g, lbl('confirm') + ' Paint   ' + lbl('crouch') + ' Erase   ' + lbl('interact') + ' Play it   ' + lbl('dodge') + ' Reset   ' + lbl('cancel') + ' Save and back', W / 2, H - 24, '#8a80a8', { align: 'center' });
      txt(g, 'Place a start and an exit, a few guards and lanterns. Walls over 56 high need the kaginawa.', W / 2, H - 12, '#6a6088', { align: 'center' });
    });
  }
};
