// The canvas HUD (10.3): the bottom bar with each player's panel, the quotas, the top score row, the boss bar,
// objective chips, prompts and tips, crosshairs, the DEV badge and the demo banner. 10-foot sizes, outlined text.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, T = WP.T, F = E.font;
const H = WP.HUD = { portraits: {}, tipT: 0, tip: null };
const txt = (g, s, x, y, c = '#f2ead3', o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: '#0b0c08' }, o));
H.portrait = (preset, g, x, y, size, o = {}) => { let r = H.portraits[preset]; if (!r) { r = H.portraits[preset] = WP.rigNew(preset); r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); } if (o.expr) r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: o.expr }); r.drawPortrait(g, x, y, size, { bg: o.bg || '#1a2014', tint: o.tint, frame: '#0b0c08' }); };
const label = (I, a) => I ? String(I.label(a, I.lastDevice === 'mouse' && a === 'reload' ? 'keyboard' : I.lastDevice)).toUpperCase() : a.toUpperCase();
H.panelBg = g => {
  const y = WP.PLAY_H; px.rect(g, 0, y, WP.W, WP.H - y, '#262c1c'); px.rect(g, 0, y, WP.W, 2, '#5a6a3a'); px.rect(g, 0, y + 2, WP.W, 1, '#141810');
  for (let x = 6; x < WP.W; x += 40) { px.rect(g, x, y + 5, 2, 2, '#4a5434'); px.rect(g, x, WP.H - 4, 2, 2, '#4a5434'); }
};
H.playerPanel = (g, world, p, x, w, I, wide) => {
  const y = WP.PLAY_H + 4, col = WP.SEAT[p.seat];
  px.rect(g, x, y - 1, w, 1, col);
  const exp = p.down ? null : p.hurtT > 0 ? 'wince' : p.grin > 0 ? 'smile' : null;
  H.portrait(['lobo', 'fang', 'tundra', 'moonshine'][p.seat], g, x + 1, y + 2, 24, { expr: exp, tint: p.down ? '#606060' : undefined });
  const tx = x + 28; txt(g, p.name, tx, y + 1, col, { font: 'tiny' }); txt(g, WP.fmt(p.score, 7), tx + (wide ? 50 : 34), y, '#f2ead3');
  if (p.down) { txt(g, WP.TEXT.hud.down, tx + 8, y + 12, '#ff5040', { scale: 2 }); return; }
  // the magazine as 30 tiny rounds in 2 rows (or what magSize says)
  const n = T.magSize, per = Math.ceil(n / 2), bw = Math.max(1, Math.min(2, Math.floor((w - 32 - 40) / per)));
  for (let i = 0; i < n; i++) { const r = i < per ? 0 : 1, c = i % per, on = p.fury > 0 || i < p.mag; px.rect(g, tx + c * (bw + 1), y + 10 + r * 4, bw, 3, on ? (p.fury > 0 ? '#ffe060' : '#e0b040') : '#3a3a2a'); }
  // spare magazines and grenades
  const sx = tx + per * (bw + 1) + 4; let k = 0;
  for (const m of p.spares.slice(0, wide ? 11 : 7)) { px.sprite(g, m >= T.magSize ? WP.SPR.icoMag : WP.SPR.icoMagHalf, sx + k * 4, y + 9); k++; }
  if (p.spares.length > (wide ? 11 : 7)) txt(g, '+', sx + k * 4, y + 9, '#e0b040', { font: 'tiny' });
  for (let i = 0; i < Math.min(9, p.grenades); i++) px.sprite(g, WP.SPR.icoGren, tx + i * 5, y + 19);
  // the damage bar
  const dx = tx + 46, dw = Math.max(30, Math.min(60, w - 80)); txt(g, 'DMG', dx, y + 19, '#c8b890', { font: 'tiny' });
  px.rect(g, dx + 14, y + 19, dw, 5, '#141810'); px.rect(g, dx + 14, y + 19, dw * p.damage / 100, 5, p.damage > 75 && (WP.Render.t * 4 % 1) < .5 ? '#ff8060' : '#d03020'); px.rect(g, dx + 14, y + 19, dw, 1, '#3a3a2a');
  if (p.mult > 1) txt(g, 'x' + p.mult, x + w - 16, y + 9, '#ffe060');
  if (p.reload > 0) txt(g, WP.TEXT.hud.reloading, sx, y + 17, (WP.Render.t * 4 % 1) < .6 ? '#ffe060' : '#a08030', { font: 'tiny' });
  else if (p.fury > 0) txt(g, WP.TEXT.hud.fury + ' ' + Math.ceil(p.fury), sx, y + 17, '#ffe060', { font: 'tiny' });
};
H.quotaBlock = (g, world, x, y) => {
  const icons = { soldier: 'icoSoldier', vehicle: 'icoJeep', air: 'icoHeli', boat: 'icoBoat' };
  let i = 0;
  for (const k of ['soldier', 'vehicle', 'boat', 'air']) {
    if (world.quotaMax[k] === undefined) continue; const left = world.q[k], cx = x + i * 30;
    px.sprite(g, WP.SPR[icons[k]], cx, y + 2); txt(g, left > 0 ? left : 'OK', cx + 10, y + 1, left > 0 ? '#f2ead3' : '#60e070', { font: left > 0 ? undefined : 'tiny' }); i++;
  }
};
H.draw = (g, world, o = {}) => {
  const ps = world.players, n = ps.length, I0 = o.input;
  H.panelBg(g);
  if (n <= 2) {
    H.playerPanel(g, world, ps[0], 4, n === 1 && !o.joinHint ? 236 : 172, WP.Players.input(0), n === 1 && !o.joinHint);
    H.quotaBlock(g, world, n === 1 && !o.joinHint ? 250 : 182, WP.PLAY_H + 8);
    if (n === 2) H.playerPanel(g, world, ps[1], 304, 172, WP.Players.input(1));
    else if (o.joinHint) txt(g, 'WOLF 2: ' + WP.fill(WP.TEXT.hud.join, null, { start: o.joinHint }), 320, WP.PLAY_H + 14, '#8a9a7a', { font: 'tiny' });
    else { if (world.objective) txt(g, world.objective.kind + ' ' + world.objective.have + '/' + world.objective.need, 372, WP.PLAY_H + 9, world.objective.have >= world.objective.need ? '#60e070' : '#f2ead3'); }
  } else { for (let i = 0; i < n; i++) H.playerPanel(g, world, ps[i], 2 + i * 120, 118, WP.Players.input(i)); }
  // the top row: scores and the high score
  let tx = 4; for (const p of ps) { txt(g, (p.seat + 1) + 'UP', tx, 2, WP.SEAT[p.seat], { font: 'tiny' }); txt(g, WP.fmt(p.score, 6), tx + 16, 1); tx += n > 2 ? 120 : 104; if (n <= 2 && p.seat === 0) tx = WP.W - 110; }
  txt(g, 'HI ' + WP.fmt(Math.max(o.hi || 0, ...ps.map(p => p.score)), 6), WP.W / 2, 1, '#ffe080', { align: 'center' });
  if (n > 2) H.quotaBlock(g, world, WP.W / 2 - 50, 12);
  if (o.timeLeft !== undefined) txt(g, 'TIME ' + Math.floor(o.timeLeft / 60) + ':' + String(Math.floor(o.timeLeft % 60)).padStart(2, '0'), WP.W / 2, n > 2 ? 24 : 11, o.timeLeft < 30 ? '#ff6040' : '#f2ead3', { align: 'center', font: 'tiny' });
  // the boss bar
  const b = world.boss; if (b && !b.dead) { const hp = WP.bossHp(b), mx = WP.bossMax(b) || 1, x0 = WP.W / 2 - 100, y0 = n > 2 ? 34 : 22; px.rect(g, x0 - 1, y0 - 1, 202, 7, '#0b0c08'); px.rect(g, x0, y0, 200, 5, '#3a1a14'); px.rect(g, x0, y0, 200 * hp / mx, 5, '#e04a2a'); px.rect(g, x0, y0, 200 * hp / mx, 1, '#ff9070'); txt(g, WP.BOSSES[b.type === 'tuskTower' ? 'tusk' : b.type].name + (b.phase ? '  ' + 'I'.repeat(b.phase + 1) : ''), WP.W / 2, y0 + 7, '#ffb090', { align: 'center', font: 'tiny' }); }
  // objective chips: hostages
  if (world.stage.hostages) { const hn = world.host.n; for (let i = 0; i < 5; i++) { const x = WP.W - 18 - i * 15, y = 12; const h = world.host.list && world.host.list.find(q => q.T && q.T.idx === i); const lit = (h && h.rescued) || (o.rescuedIdx && o.rescuedIdx[i]); const lost = (h && h.lost) || i >= hn; px.rect(g, x - 1, y - 1, 14, 14, lit ? '#60e070' : lost ? '#5a1a14' : '#3a3a2a'); H.portrait(WP.HOSTAGES[4 - i][1], g, x, y, 12, { tint: lit ? undefined : '#404040', bg: '#1a1a14' }); } txt(g, (world.host.saved || 0) + '/' + world.host.n, WP.W - 92, 14, '#f2ead3', { font: 'tiny' }); }
  else if (world.objective && n > 1) txt(g, world.objective.kind + ' ' + world.objective.have + '/' + world.objective.need, WP.W - 6, 12, '#f2ead3', { align: 'right' });
  // prompts above the bar (glyph first), for the local player
  const lp = ps.find(p => p.pid === (o.local === undefined ? ps[0].pid : o.local)) || ps[0], I = WP.Players.input(lp.seat) || I0;
  if (!lp.down && !o.attract) {
    let pr = null; const empty = lp.mag <= 0 && !lp.spares.length && lp.fury <= 0;
    if (empty) pr = [WP.TEXT.hud.noAmmo, (WP.Render.t * 3 % 1) < .6 ? '#ff6040' : '#ffe060'];
    else if (lp.mag < T.magSize * .3 && lp.reload <= 0 && lp.spares.length && lp.fury <= 0) pr = [label(I, 'reload') + '  ' + WP.TEXT.hud.reload, (WP.Render.t * 3 % 1) < .6 ? '#ffe060' : '#f2ead3'];
    if (pr) txt(g, pr[0], WP.W / 2, WP.PLAY_H - 22, pr[1], { align: 'center', scale: 2 });
  }
  if (H.tip && H.tipT > 0 && !o.attract) { const s = WP.fill(H.tip, I); const w = F.width(s) + 12; E.ui.box(g, WP.W / 2 - w / 2, WP.PLAY_H - 46, w, 14, { bg: ['#2a3420', '#1a2014'], alpha: .85 }); txt(g, s, WP.W / 2, WP.PLAY_H - 43, '#ffe080', { align: 'center' }); }
  // the spotted alarm, the DEV badge, the demo banner
  if (world.spotted > 0 && (WP.Render.t * 4 % 1) < .6) txt(g, WP.TEXT.hud.spotted, WP.W / 2, 40, '#ff4040', { align: 'center', scale: 2 });
  if (o.dev) txt(g, WP.TEXT.hud.dev, 4, 14, '#ff60ff', { font: 'tiny' });
  if (o.attract) { const s = WP.TEXT.hud.demo; px.rect(g, 0, 40, WP.W, 14, '#0b0c08'); if ((WP.Render.t * 2 % 1) < .75) txt(g, s, WP.W / 2, 43, '#ffe060', { align: 'center' }); }
};
// crosshairs: a circle with 4 ticks and a centre dot in the seat colour, outlined; it grows with bloom, turns red over a hostile
H.crosshair = (g, world, p, o = {}) => {
  const size = { s: .7, m: .85, l: 1 }[WP.settings('xsize') || 'l'] || 1, col = p.down ? '#707070' : WP.SEAT[p.seat];
  const over = !p.down && world.pick ? world.pick(p.x, p.y) : null, hostile = over && WP.hostile(over.e);
  const friendly = over && (over.e.kind === 'civilian' || over.e.kind === 'hostage');
  const r = Math.round((7 + Math.min(T.bloomMax, p.bloom) * .8) * size), x = Math.round(p.x), y = Math.round(p.y);
  const c = friendly ? '#40e060' : hostile ? '#ff3a2a' : col, low = p.mag < 6 && p.fury <= 0 && (WP.Render.t * 4 % 1) < .5;
  const ring = (rr, cc) => { for (let a = 0; a < 32; a++) { const t = a / 32 * 6.283; px.rect(g, Math.round(x + Math.cos(t) * rr), Math.round(y + Math.sin(t) * rr), 1, 1, cc); } };
  ring(r + 1, '#0b0c08'); ring(r - 1, '#0b0c08'); ring(r, low ? '#ff8040' : c);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { px.line(g, x + dx * (r - 3), y + dy * (r - 3), x + dx * (r + 5), y + dy * (r + 5), '#0b0c08', 3); px.line(g, x + dx * (r - 2), y + dy * (r - 2), x + dx * (r + 4), y + dy * (r + 4), c); }
  px.rect(g, x - 1, y - 1, 3, 3, '#0b0c08'); px.rect(g, x, y, 1, 1, '#ffffff');
  if (p.reload > 0) { const u = 1 - p.reload / T.reloadTime; for (let a = 0; a < 24 * u; a++) { const t = -Math.PI / 2 + a / 24 * 6.283; px.rect(g, Math.round(x + Math.cos(t) * (r + 4)), Math.round(y + Math.sin(t) * (r + 4)), 1, 1, '#ffe060'); } }
  if (p.fury > 0) { const u = p.fury / T.furySeconds; for (let a = 0; a < 32 * u; a++) { const t = -Math.PI / 2 + a / 32 * 6.283; px.rect(g, Math.round(x + Math.cos(t) * (r + 6)), Math.round(y + Math.sin(t) * (r + 6)), 1, 1, '#ffd040'); } }
  if (o.num) txt(g, String(p.seat + 1), x + r + 3, y - r - 6, col, { font: 'tiny' });
};
})();
