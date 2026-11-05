// ---- the in-play HUD (r.overlay, anchored to r.W and r.H): player panels, the ratings gauge, boss bar, lower third ----
const HUD = MT.hud = {};
const PANEL_W = 104, PANEL_H = 30;
function weaponIcon(g, x, y, id, t) {
  const W = WEAPONS[id] || WEAPONS.blaster;
  px.rect(g, x, y, 11, 9, '#0c0618'); px.rect(g, x + 1, y + 1, 9, 7, W.color || '#c8d0e0');
  UI.text(g, W.letter || 'B', x + 6, y + 1, '#140a24', { align: 'center', shadow: false });
}
function panel(g, r, c, corner, t) {
  const pr = c.pr, col = SLOT_COLORS[c.slot], right = corner === 1 || corner === 3, bottom = corner >= 2;
  const x = right ? r.W - PANEL_W - 4 : 4, y = bottom ? r.H - PANEL_H - 4 : (corner === 0 ? 14 : 4);
  px.blend(g, .85, 'normal', () => px.rect(g, x, y, PANEL_W, PANEL_H, '#140a24'));
  px.rect(g, x, y, PANEL_W, 1, col); px.rect(g, x, y + PANEL_H - 1, PANEL_W, 1, E.tones(col).sh); px.rect(g, x, y, 2, PANEL_H, col);
  if (!MT.cfg.skipRigs && c.rig) { c.rig.drawPortrait(g, x + 3, y + 3, 16, { zoom: 1.4, turn: .4, bg: E.tones(col).deep, frame: false, tint: c.state === 'out' ? '#808080' : undefined }); }
  UI.text(g, 'P' + (c.slot + 1) + ' ' + pr.name, x + 22, y + 2, col);
  UI.text(g, money(pr.cash), x + 22, y + 11, '#ffcc33', { gradient: ['#fff6b0', '#ffcc33'] });
  if (c.state === 'out') { const I = c.input || game.input; UI.text(g, MT.TEXT.ui.out, x + 4, y + 21, '#ff3344'); MT.glyph.draw(g, x + 22, y + 19, 'start', I); UI.text(g, MT.TEXT.ui.pressToContinue, x + 22 + MT.glyph.width('start', I) + 3, y + 21, '#fff7e8', { font: 'tiny' }); return; }
  const mh = maxHpNow();
  for (let i = 0; i < Math.min(mh, 6); i++) px.sprite(g, i < c.hp ? SPR.heart : SPR.heartOff, x + 4 + i * 8, y + 21);
  const lx = x + 4 + Math.min(mh, 6) * 8 + 2;
  UI.text(g, '×' + pr.lives, lx, y + 20, '#fff7e8');
  if (c.weapon !== 'blaster') { const k = c.wMax ? c.wT / c.wMax : 0; if (!(c.wT < 2 && Math.floor(t * 8) % 2)) weaponIcon(g, x + PANEL_W - 30, y + 2, c.weapon, t); px.rect(g, x + PANEL_W - 30, y + 12, 11, 2, '#0c0618'); px.rect(g, x + PANEL_W - 30, y + 12, Math.round(11 * k), 2, (WEAPONS[c.weapon] || {}).color || '#fff'); }
  let ax = x + PANEL_W - 17; for (const a of ['records', 'shield', 'speed']) if (c.addons[a] > 0) { if (!(c.addons[a] < 2 && Math.floor(t * 8) % 2)) { px.rect(g, ax, y + 3, 7, 7, '#0c0618'); px.rect(g, ax + 1, y + 4, 5, 5, WEAPONS[a].color); UI.text(g, WEAPONS[a].letter, ax + 4, y + 3, '#140a24', { align: 'center', shadow: false, font: 'tiny' }); } ax -= 8; if (ax < x + PANEL_W - 30) break; }
  for (let i = 0; i < Math.min(3, pr.bombs); i++) px.sprite(g, SPR.bulbS, x + PANEL_W - 8 - i * 6, y + 21);
  if (MT.cheats.infBombs || c.infBombs) UI.text(g, 'INF', x + PANEL_W - 30, y + 20, '#fff6b0', { font: 'tiny' });
}
function gauge(g, r, world, t) {
  const R = world.ratings, cx = Math.round(r.W / 2), y = 3, w = 108, x0 = cx - w / 2;
  px.blend(g, .85, 'normal', () => px.rect(g, x0, y, w, 35, '#140a24'));
  px.rect(g, x0, y, w, 1, '#ffcc33'); px.rect(g, x0, y + 34, w, 1, '#5a1040');
  UI.text(g, 'RATINGS', cx, y + 2, '#c9b6e4', { align: 'center', font: 'tiny' });
  const ox = cx, oy = y + 25, rad = 14;
  for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI, c = i < 4 ? '#5a4a6a' : i < 7 ? '#2ee6ff' : i < 10 ? '#5fe0a0' : i < 13 ? '#ffcc33' : '#ff2e88'; px.rect(g, Math.round(ox + Math.cos(a) * rad) - 1, Math.round(oy + Math.sin(a) * rad) - 1, 2, 2, c); }
  const a = Math.PI + clamp(R.R / 100, 0, 1) * Math.PI + (R.prime > 0 ? Math.sin(t * 30) * .05 : 0);
  px.line(g, ox, oy, ox + Math.cos(a) * (rad - 3), oy + Math.sin(a) * (rad - 3), '#ffffff'); px.disc(g, ox, oy, 2, '#ff3344');
  UI.text(g, '×' + R.X, x0 + w - 6, y + 13, R.prime > 0 ? '#ff2e88' : '#ffcc33', { align: 'right', scale: 2 });
  if (!world.session) { px.sprite(g, SPR.key, x0 + 4, y + 15); UI.text(g, (world.run && world.run.keys || 0) + '/9', x0 + 18, y + 14, '#ffcc33'); }
  const ap = STUDIO.cheerT > 0 && Math.floor(t * 6) % 2 === 0; px.rect(g, cx - 16, y + 27, 32, 6, ap ? '#d02a3a' : '#3a2030'); UI.text(g, 'APPLAUSE', cx, y + 28, ap ? '#fff7e8' : '#7a5a6a', { align: 'center', font: 'tiny', shadow: false });
  if (R.prime > 0) { if (Math.floor(t * 4) % 2 === 0) UI.text(g, MT.TEXT.ui.primeTime, cx, y + 38, '#ff2e88', { align: 'center' }); }
  else if (world.room && !(world.boss && !world.boss.dead && world.boss.phase !== 'intro')) UI.text(g, (world.room.lightning ? 'LIGHTNING ROUND' : world.room.id) + '  ' + world.room.name, cx, y + 38, '#fff7e8', { align: 'center' });
}
function bossBar(g, r, boss, t) {
  if (!boss || boss.dead || boss.phase === 'intro' || boss.gone && boss.stage !== 'network') return;
  const w = Math.min(220, r.W - 240), x = Math.round(r.W / 2 - w / 2), y = 41, k = boss.hpPct();
  px.blend(g, .85, 'normal', () => px.rect(g, x - 2, y - 1, w + 4, 15, '#140a24'));
  UI.text(g, boss.name, r.W / 2, y, '#ff9a3c', { align: 'center', font: 'tiny' });
  px.rect(g, x, y + 7, w, 5, '#3a1020'); px.rect(g, x, y + 7, Math.round(w * k), 5, '#ff3344'); px.rect(g, x, y + 7, Math.round(w * k), 1, '#ff9a9a');
  const segs = boss.parts.filter(p => !p.noBar && !p.tv); if (segs.length > 1) { let sx = x; const tot = segs.reduce((a, p) => a + p.max, 0); for (const p of segs) { sx += Math.round(w * p.max / tot); if (sx < x + w - 1) px.rect(g, sx, y + 7, 1, 5, '#140a24'); } }
}
function lowerThird(g, r, t) {
  const L = MT.lines.current; if (!L) return false;
  if (game.settings.subtitles === false && L.pri < 3) return false;
  const w = Math.min(r.W - 24, 340), h = L.hint ? 42 : 34, x = Math.round(r.W / 2 - w / 2), y = r.H - h - 6;
  px.blend(g, .9, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
  px.rect(g, x, y, w, 1, L.color); px.rect(g, x, y + h - 1, w, 1, '#5a1040');
  MT.drawSpeakerPortrait(g, L.who, x + 3, y + 3, 24, t);
  px.rect(g, x + 30, y - 6, UI.width(L.name) + 8, 9, L.color); UI.text(g, L.name, x + 34, y - 5, '#140a24', { shadow: false });
  if (game.settings.subtitles !== false || L.pri >= 3) {
    const lines = FONT.wrap(L.text.slice(0, L.typed), w - 40);
    lines.slice(0, 3).forEach((ln, i) => UI.text(g, ln, x + 32, y + 5 + i * 9, '#fff7e8'));
  }
  if (L.hint) UI.text(g, L.hint, x + 32, y + h - 10, '#2ee6ff', { font: 'tiny' });
  return true;
}
function banners(g, r, t) {
  let y = Math.round(r.H * .56);
  for (const b of MT.banners.list) {
    const k = clamp(b.t / .18, 0, 1), out = clamp((b.dur - b.t) / .2, 0, 1), sc = b.big ? 2 : 1;
    const w = UI.width(b.text, sc) + 24 + (b.icon ? 16 : 0), h = 7 * sc + (b.sub ? 14 : 8), x = Math.round(r.W / 2 - w / 2 + (1 - E.ease.outBack(k)) * -r.W * .5);
    if (out <= 0) continue;
    px.blend(g, .9 * out, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
    UI.bulbs(g, x, y, w, h, t, { on: b.color });
    let tx = r.W / 2 + (b.icon ? 8 : 0); if (b.icon) { const s = SPR.prize[b.icon] || SPR.ico[b.icon] || SPR.key; px.sprite(g, s, x + 6, y + 4); }
    UI.text(g, b.text, tx + x - Math.round(r.W / 2 - w / 2), y + 4, b.color, { align: 'center', scale: sc });
    if (b.sub) UI.text(g, b.sub, tx + x - Math.round(r.W / 2 - w / 2), y + 5 + 7 * sc, '#fff7e8', { align: 'center' });
    y += h + 4;
  }
}
function reticle(g, r, world, t) {
  const I = game.input; if (I.lastDevice !== 'mouse' || !I.mouse || !I.mouse.active) return;
  const c = world.contestants.find(q => q.input === I && q.ctl === 'local'); if (!c) return;
  const p = I.pointer(); if (!p) return;
  const [x, y] = p, col = SLOT_COLORS[c.slot], s = 5 + (c.firing ? Math.sin(t * 30) : 0);
  px.line(g, x - s - 3, y, x - 2, y, '#ffcc33'); px.line(g, x + 2, y, x + s + 3, y, '#ffcc33'); px.line(g, x, y - s - 3, x, y - 2, '#ffcc33'); px.line(g, x, y + 2, x, y + s + 3, '#ffcc33');
  px.rect(g, x - 1, y - 1, 2, 2, col);
}
HUD.draw = (r, world, t, o = {}) => {
  r.overlay(g => {
    if (o.onlyLines) { banners(g, r, t); lowerThird(g, r, t); return; }
    if (!o.noBugs) { const blink = Math.floor(t * 2) % 2 === 0; px.disc(g, 8, 6, 2.5, blink ? '#ff3344' : '#6a1018'); UI.text(g, MT.TEXT.ui.live, 13, 3, '#fff7e8', { font: 'tiny' }); UI.text(g, MT.TEXT.ui.bug, 32, 3, '#c9b6e4', { font: 'tiny' }); if (MT.devActive() && !world.session && !world.attract) { px.rect(g, 58, 2, 18, 8, '#ff9a3c'); UI.text(g, 'DEV', 67, 3, '#140a24', { align: 'center', font: 'tiny', shadow: false }); } }
    world.contestants.forEach((c, i) => panel(g, r, c, c.slot % 4, t));
    gauge(g, r, world, t);
    bossBar(g, r, world.boss, t);
    banners(g, r, t);
    const talking = lowerThird(g, r, t);
    const tut = MT.tut.cur;
    if (tut && !o.noTut) { const I = (world.contestants[0] && world.contestants[0].input) || game.input, items = tut.actions.map(([a]) => [a, '']).concat([['', '']]).slice(0, 1); const tw2 = MT.glyph.measure(tut.actions, I) + UI.width(tut.text) + 20, x = Math.round(r.W / 2 - tw2 / 2), y = r.H - (talking ? 92 : 50); px.blend(g, .88, 'normal', () => px.rect(g, x, y, tw2, 17, '#140a24')); px.rect(g, x, y, tw2, 1, '#2ee6ff'); let cx = x + 6; for (const [a] of tut.actions) cx += MT.glyph.draw(g, cx, y + 3, a, I) + 4; UI.text(g, tut.text, cx + 2, y + 5, '#fff7e8'); }
    if (!talking && !o.noWaves) {
      if (world.phase === 'EXIT' && !world.exitPick) { if (Math.floor(t * 3) % 3) UI.text(g, MT.TEXT.ui.pickDoor, r.W / 2, r.H - 16, '#3aff6a', { align: 'center', scale: 2 }); }
      else if (world.room && world.room.waves && world.phase === 'WAVES') { const n = world.room.waves.length, k = world.wave; const w2 = n * 8; for (let i = 0; i < n; i++) px.disc(g, r.W / 2 - w2 / 2 + i * 8 + 4, r.H - 9, 2.5, i < k ? '#ffcc33' : '#3a2a50'); }
      else if (world.room && world.room.survive && world.surviveLeft > 0) UI.text(g, 'SURVIVE: ' + Math.ceil(world.surviveLeft), r.W / 2, r.H - 14, '#ffcc33', { align: 'center', scale: 2 });
      else if (world.phase === 'BONUS') UI.text(g, 'BONUS: ' + Math.max(0, Math.ceil(40 - (world.bonusT || 0))), r.W / 2, r.H - 14, '#5fe0a0', { align: 'center', scale: 2 });
    }
    if (!o.noReticle) reticle(g, r, world, t);
  });
};
/** "NEXT ON MASH TV": the episode's 3x3 map as broadcast graphics (k: 0..1 of the route animation) */
HUD.mapCard = (g, r, epId, run, cur, next, t, k = 1) => {
  const ep = MT.EPISODES[epId]; if (!ep) return;
  px.blend(g, .94, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#140a24'));
  for (let y = 0; y < r.H; y += 3) px.blend(g, .15, 'normal', () => px.rect(g, 0, y, r.W, 1, '#000000'));
  UI.title(g, MT.TEXT.ui.nextOn, r.W / 2, 10, 2);
  UI.text(g, 'EPISODE ' + ep.id + ': ' + ep.title, r.W / 2, 30, '#2ee6ff', { align: 'center' });
  const cw = Math.min(110, (r.W - 40) / 3), ch = Math.min(52, (r.H - 90) / 3), ox = Math.round(r.W / 2 - cw * 1.5), oy = 44;
  const pos = id => { const R = MT.ROOMS[id]; return [ox + R.cell[0] * cw + cw / 2, oy + R.cell[1] * ch + ch / 2]; };
  const path = (run && run.path) || [];
  for (const id of ep.rooms) { const R = MT.ROOMS[id]; for (const d in R.exits) { const [x0, y0] = pos(id), [x1, y1] = pos(R.exits[d]); const walked = path.includes(id) && path.includes(R.exits[d]); px.line(g, x0, y0, x1, y1, walked ? '#ffcc33' : '#3a2a50', walked ? 2 : 1); } }
  if (cur && next && MT.ROOMS[next]) { const [x0, y0] = pos(cur), [x1, y1] = pos(next); const e = E.ease.outCubic(clamp(k, 0, 1)); px.line(g, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), '#3aff6a', 3); }
  for (const id of ep.rooms) {
    const R = MT.ROOMS[id], [x, y] = pos(id), w = cw - 14, h = ch - 14, here = id === cur, nx = id === next, seen = path.includes(id);
    const bx = Math.round(x - w / 2), by = Math.round(y - h / 2);
    px.rect(g, bx, by, w, h, here ? '#3a1e5a' : seen ? '#2a1446' : '#1a0c30'); px.rect(g, bx, by, w, 1, nx ? '#3aff6a' : here ? '#ffcc33' : '#5a4a6a');
    if (here || nx) UI.bulbs(g, bx, by, w, h, t, { on: nx ? '#3aff6a' : '#ffcc33' });
    px.sprite(g, SPR.ico[MT.roomIcon(R)], bx + 3, by + 3);
    UI.text(g, id, bx + 14, by + 3, here ? '#ffcc33' : '#c9b6e4', { font: 'tiny' });
    FONT.wrap(R.name, w - 6, { font: 'tiny' }).slice(0, 2).forEach((ln, i) => UI.text(g, ln, x, by + 14 + i * 7, seen || nx ? '#fff7e8' : '#9a8aaa', { align: 'center', font: 'tiny' }));
    if (R.key && !(run && run.keyRooms || []).includes(id)) px.sprite(g, SPR.keyS, bx + w - 10, by + 3);
  }
  UI.text(g, 'KEYS ' + ((run && run.keys) || 0) + '/9', r.W / 2, r.H - 30, '#ffcc33', { align: 'center' });
};
/** an episode's title card */
HUD.episodeCard = (g, r, epId, t) => {
  const ep = MT.EPISODES[epId]; if (!ep) return;
  px.rect(g, 0, 0, r.bw, r.bh, '#140a24');
  for (let i = 0; i < 12; i++) { const a = t * .3 + i * TAU / 12; px.blend(g, .12, 'add', () => px.poly(g, [[r.W / 2, r.H / 2], [r.W / 2 + Math.cos(a) * 600, r.H / 2 + Math.sin(a) * 600], [r.W / 2 + Math.cos(a + .13) * 600, r.H / 2 + Math.sin(a + .13) * 600]], i % 2 ? '#ff2e88' : '#2ee6ff')); }
  const k = E.ease.outBounce(clamp(t / .8, 0, 1));
  UI.text(g, 'EPISODE ' + ep.id, r.W / 2, r.H * .3 - (1 - k) * 60, '#2ee6ff', { align: 'center', scale: 2 });
  UI.title(g, ep.title, r.W / 2, r.H * .3 + 22, 3);
  UI.text(g, ep.place, r.W / 2, r.H * .3 + 54, '#ffcc33', { align: 'center' });
  UI.bulbs(g, 16, 16, r.W - 32, r.H - 32, t, { step: 8 });
};
