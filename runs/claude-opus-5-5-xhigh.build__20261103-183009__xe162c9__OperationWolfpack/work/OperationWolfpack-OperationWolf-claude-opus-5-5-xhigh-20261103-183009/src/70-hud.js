// The canvas HUD (10.3): the bar (player panels, quotas), the top row, the boss bar, the radio box, objective chips,
// prompts and the crosshairs. 480x270; playfield y 0-233, the bar 234-269.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp } = WP;
const H = WP.HUD = { radio: null, queue: [], tip: null };
const F = (g, s, x, y, c = '#f2ead3', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: '#0c0a06' }, o));
H.F = F;
const spr = (g, s, x, y, k = 1) => g.drawImage(s.cv, Math.round(x), Math.round(y), s.w * k, s.h * k);
// ---------- the radio (non-modal, top left): a portrait, a name, two typed lines, gibberish blips ----------
H.say = (who, text, o = {}) => { H.queue.push({ who, text, t: 0, shown: 0, life: o.life || Math.max(2.6, text.length * .055 + 1.2), modal: false }); if (H.queue.length > 4) H.queue.splice(1, 1); };
H.clearRadio = () => { H.queue.length = 0; };
H.update = dt => {
  const r = H.queue[0]; if (!r) return;
  if (r.t === 0 && WP.Voice) WP.Voice.line(r.who, r.text);
  r.t += dt; const prev = Math.floor(r.shown); r.shown = Math.min(r.text.length, r.shown + dt * 46);
  if (WP.Voice && Math.floor(r.shown) > prev) WP.Voice.letter(r.who, r.text, Math.floor(r.shown) - 1);
  if (r.t > r.life) H.queue.shift();
};
H.drawRadio = (g, big) => {
  const r = H.queue[0]; if (!r) return;
  const scale = big ? 2 : 1, w = big ? 300 : 232, x = 4, y = 18;
  const lines = E.font.wrap(r.text.slice(0, Math.floor(r.shown)), w - 40, { scale }), all = E.font.wrap(r.text, w - 40, { scale });
  const h = Math.max(36, 12 + all.length * (8 * scale + 1) + 6);
  E.ui.box(g, x, y, w, h, { bg: ['#1a2214', '#0c1208'], border: '#8a9a5a', alpha: .9 });
  const rig = WP.Rigs.portrait(r.who === 'HOSTAGE' ? 'hostage' : r.who);
  px.rect(g, x + 3, y + 3, 28, 28, '#0a0e08');
  try { rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 2.2, bg: r.who === 'KRAGG' || r.who === 'TUSK' ? '#3a1410' : '#18301c' }); } catch (e) { /* headless */ }
  F(g, WP.TEXT.speakers[r.who] || r.who, x + 36, y + 4, r.who === 'KRAGG' || r.who === 'TUSK' ? '#ff8a6a' : '#e0b040');
  lines.forEach((ln, i) => F(g, ln, x + 36, y + 14 + i * (8 * scale + 1), '#f2ead3', { scale }));
  if ((Math.floor(WP.time * 3) % 2) && r.who === 'DEN') px.rect(g, x + w - 8, y + 4, 3, 3, '#ff4a3a');
};
// ---------- crosshairs ----------
H.crosshair = (g, p, world, o = {}) => {
  const x = Math.round(p.x), y = Math.round(p.y), size = o.size || 1, down = p.down;
  const over = !down && (world.shapes || []).some(s => WP.Input.hostile(s) && WP.Hit.contains(s, p.x, p.y));
  const r = Math.round((7 + p.bloom * .9) * size), col = down ? '#7a7a7a' : over ? '#ff3a2a' : p.color, ol = '#000000';
  const low = !down && p.mag <= 5 && p.fury <= 0 && Math.floor(WP.time * 6) % 2 === 0;
  const ring = (rr, c, w = 1) => { for (let a = 0; a < 32; a++) { const t = a / 32 * Math.PI * 2; px.rect(g, x + Math.round(Math.cos(t) * rr) - (w > 1 ? 1 : 0), y + Math.round(Math.sin(t) * rr) - (w > 1 ? 1 : 0), w, w, c); } };
  ring(r + 1, ol); ring(r - 1, ol); ring(r, low ? '#ffffff' : col);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { px.rect(g, x + dx * (r + 1) - (dy ? 1 : 0) - (dx < 0 ? 4 : 0), y + dy * (r + 1) - (dx ? 1 : 0) - (dy < 0 ? 4 : 0), dx ? 5 : 3, dy ? 5 : 3, ol); px.rect(g, x + dx * (r + 2) - (dx < 0 ? 3 : 0), y + dy * (r + 2) - (dy < 0 ? 3 : 0), dx ? 3 : 1, dy ? 3 : 1, col); }
  px.rect(g, x - 1, y - 1, 3, 3, ol); px.dot(g, x, y, col);
  // the reload ring fills; FURY's ring runs out
  if (p.reloadT > 0) { const u = 1 - p.reloadT / (p.reloadT0 || 1), n = Math.round(u * 32); for (let a = 0; a < n; a++) { const t = a / 32 * Math.PI * 2 - Math.PI / 2; px.rect(g, x + Math.round(Math.cos(t) * (r + 5)), y + Math.round(Math.sin(t) * (r + 5)), 2, 2, '#f2ead3'); } }
  if (p.fury > 0) { const n = Math.round(p.fury / 10 * 32); for (let a = 0; a < n; a++) { const t = a / 32 * Math.PI * 2 - Math.PI / 2; px.rect(g, x + Math.round(Math.cos(t) * (r + 5)), y + Math.round(Math.sin(t) * (r + 5)), 2, 2, '#ffd040'); } }
  if (o.label) F(g, String(p.slot + 1), x + r + 3, y - r - 6, col, { scale: 1 });
};
// ---------- one player's panel ----------
const panel = (g, world, p, x, y, w, ctx) => {
  const wide = w > 150;
  E.ui.box(g, x, y, w, 34, { bg: ['#2a3418', '#1a2010'], border: p.color, alpha: 1 });
  const hurt = p.hurtT > 0, grin = p.streak >= 8;
  const rig = WP.Rigs.portrait(WP.CALLSIGNS[p.slot % 4].toLowerCase());
  px.rect(g, x + 3, y + 4, 26, 26, '#0a0e08');
  try { rig.drawPortrait(g, x + 4, y + 5, 24, { zoom: 2, bg: p.down ? '#3a1a1a' : '#24361c', tint: p.down ? '#808080' : undefined }); } catch (e) { /* headless */ }
  if (hurt) px.blend(g, .5, 'add', () => px.rect(g, x + 4, y + 5, 24, 24, '#ff2a1a'));
  if (grin && !p.down) F(g, '×' + (1 + Math.min(3, Math.floor(p.streak / 8))), x + 18, y + 22, '#ffd040');
  const nm = p.name.slice(0, 9);
  F(g, nm, x + 33, y + 3, p.color);
  F(g, WP.pad(p.score, 7), x + w - 4 - E.font.width(WP.pad(p.score, 7)), y + 3, '#f2ead3');
  if (p.down) { F(g, WP.TEXT.hud.down, x + 33 + (w - 40) / 2, y + 15, '#ff4a3a', { align: 'center', scale: 2 }); return; }
  // the current magazine: tiny bullets in 2 rows; spares as icons (a part-used one notched); grenades
  const mag = Math.round(WP.T.magSize), per = Math.ceil(mag / 2), bx = x + 33, by = y + 13;
  const bw = Math.max(2, Math.min(3, Math.floor((wide ? 92 : 60) / per)));
  for (let i = 0; i < mag; i++) { const row = i < per ? 0 : 1, col = i % per, on = p.fury > 0 || i < p.mag; spr(g, on ? WP.SPR.i_bullet : WP.SPR.i_bullet_off, bx + col * bw, by + row * 6, 1); }
  if (p.fury > 0) F(g, WP.TEXT.hud.fury + ' ' + Math.ceil(p.fury), bx, by + 1, '#ffd040');
  const sx = wide ? x + 128 : x + 33, sy = wide ? y + 13 : y + 26;
  if (wide) { for (let i = 0; i < Math.min(9, p.spares.length); i++) spr(g, p.spares[i] < mag ? WP.SPR.i_mag_part : WP.SPR.i_mag, sx + (i % 5) * 6, sy + Math.floor(i / 5) * 9); if (p.spares.length > 9) F(g, '+' + (p.spares.length - 9), sx + 26, sy + 9, '#f2ead3'); }
  else F(g, 'M' + p.spares.length, sx, sy - 1, '#d8d8b0');
  const gx = wide ? x + 128 : x + 56, gy = wide ? y + 26 : y + 26;
  if (wide) { for (let i = 0; i < Math.min(6, p.grenades); i++) spr(g, WP.SPR.i_gren, gx + i * 6, gy - 1); if (p.grenades > 6) F(g, '+' + (p.grenades - 6), gx + 36, gy - 1, '#f2ead3'); }
  else F(g, 'G' + p.grenades, gx, gy - 1, '#d8d8b0');
  // the damage bar
  const dw = wide ? 60 : 40, dx = wide ? x + 33 : x + w - dw - 4, dy = wide ? y + 27 : y + 27, k = p.damage / 100;
  px.rect(g, dx - 1, dy - 1, dw + 2, 6, '#000'); px.rect(g, dx, dy, dw, 4, '#2a1a10');
  const fl = p.damage > 75 && Math.floor(WP.time * 6) % 2;
  px.rect(g, dx, dy, Math.round(dw * k), 4, fl ? '#ffffff' : k > .75 ? '#ff2a1a' : k > .5 ? '#e8702a' : '#c8a030');
  if (wide) F(g, 'DMG', dx + dw + 3, dy - 2, '#a8a890');
  if (p.reloadT > 0) F(g, WP.TEXT.hud.reloading, bx + (wide ? 46 : 30), by + 2, Math.floor(WP.time * 8) % 2 ? '#ffffff' : '#ffd040', { align: 'center' });
};
const QI = { soldier: 'i_soldier', vehicle: 'i_jeep', air: 'i_heli', boat: 'i_boat' };
const quotas = (g, world, x, y, w) => {
  E.ui.box(g, x, y, w, 34, { bg: ['#2a3418', '#1a2010'], border: '#6a7a4a', alpha: 1 });
  const ks = Object.keys(world.quotas), cw = Math.floor((w - 6) / Math.max(1, ks.length));
  ks.forEach((k, i) => {
    const cx = x + 4 + i * cw, n = world.quotas[k];
    spr(g, WP.SPR[QI[k]], cx + 2, y + 5, 2);
    if (n <= 0) F(g, '✓', cx + cw / 2 + 6, y + 9, '#5aff6a', { scale: 2 }); else F(g, String(n), cx + 21, y + 10, '#f2ead3', { scale: 2 });
  });
};
H.draw = (g, world, ctx) => {
  const W = WP.W, ps = world.players.filter(p => !p.gone), n = ps.length;
  // the bar
  px.rect(g, 0, WP.PLAY_H, W, WP.H - WP.PLAY_H, '#1c2412'); px.rect(g, 0, WP.PLAY_H, W, 1, '#5a6a3a');
  for (let x = 6; x < W; x += 40) { px.rect(g, x, WP.PLAY_H + 3, 2, 2, '#4a5a2a'); px.rect(g, x, WP.H - 4, 2, 2, '#4a5a2a'); }
  if (n <= 2) {
    panel(g, world, ps[0], 3, WP.PLAY_H + 1, 174, ctx);
    quotas(g, world, 180, WP.PLAY_H + 1, 120);
    if (ps[1]) panel(g, world, ps[1], 303, WP.PLAY_H + 1, 174, ctx);
    else {
      E.ui.box(g, 303, WP.PLAY_H + 1, 174, 34, { bg: ['#222a14', '#141a0c'], border: '#3a4a2a', alpha: 1 });
      if (ctx.canJoin) F(g, 'WOLF 2: PRESS ' + ctx.joinLabel + ' TO JOIN', 390, WP.PLAY_H + 14, Math.floor(WP.time * 2) % 2 ? '#d8d0a8' : '#8a8a6a', { align: 'center' });
      else { F(g, (WP.TEXT.ops[world.stage.id] || [world.stage.name])[0], 390, WP.PLAY_H + 7, '#e0b040', { align: 'center' }); F(g, ctx.opLine || '', 390, WP.PLAY_H + 19, '#a8a890', { align: 'center' }); }
    }
  } else {
    ps.forEach((p, i) => panel(g, world, p, 2 + i * 119, WP.PLAY_H + 1, 117, ctx));
  }
  // the top row: 1UP 012300  HI 050000  2UP ...
  const top = [];
  ps.forEach((p, i) => top.push([(i + 1) + 'UP ' + WP.pad(p.score, 7), p.color]));
  const hi = Math.max(ctx.hi || 0, ...ps.map(p => p.score));
  const items = n <= 2 ? [top[0], ['HI ' + WP.pad(hi, 7), '#ff6a50'], top[1]].filter(Boolean) : top.concat([['HI ' + WP.pad(hi, 7), '#ff6a50']]);
  const tw = W / items.length;
  items.forEach(([s, c], i) => F(g, s, tw * i + tw / 2, 3, c, { align: 'center' }));
  if (n > 2) { const ks = Object.keys(world.quotas); ks.forEach((k, i) => { spr(g, WP.SPR[QI[k]], W / 2 - ks.length * 16 + i * 32, 13); F(g, world.quotas[k] <= 0 ? '✓' : String(world.quotas[k]), W / 2 - ks.length * 16 + i * 32 + 11, 14, world.quotas[k] <= 0 ? '#5aff6a' : '#f2ead3'); }); }
  if (ctx.timeLeft !== undefined && ctx.timeLeft !== null) { const s = Math.max(0, Math.ceil(ctx.timeLeft / 1000)); F(g, 'TIME ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), W - 6, n > 2 ? 24 : 13, s < 30 && s % 2 ? '#ff6a50' : '#f2ead3', { align: 'right' }); }
  // the boss bar
  const b = world.boss;
  if (b && !b.dead && !b.intro || b && b.intro && b.type === 'tusk') {
    const hp = WP.Bosses.hp(b), max = WP.Bosses.hpMax(b) || 1, bw = 200, bx = W / 2 - bw / 2, by = 24;
    F(g, WP.TYPES[b.type].name, W / 2, by - 9 + (n > 2 ? 10 : 0), '#ffb040', { align: 'center' });
    px.rect(g, bx - 1, by - 1 + (n > 2 ? 10 : 0), bw + 2, 7, '#000'); px.rect(g, bx, by + (n > 2 ? 10 : 0), Math.round(bw * hp / max), 5, '#e8402a'); px.rect(g, bx, by + (n > 2 ? 10 : 0), Math.round(bw * hp / max), 1, '#ff9a7a');
    F(g, 'PHASE ' + b.phase, bx + bw + 4, by - 1 + (n > 2 ? 10 : 0), '#d8c8a8');
  }
  // objective chips: masts, the hostages
  let cy = 16;
  if (world.objective) { const o = world.objective; F(g, 'MASTS ' + o.done + '/' + o.need, W - 6, cy, o.done >= o.need ? '#5aff6a' : '#f2ead3', { align: 'right' }); cy += 11; }
  if (world.hostages && world.hostages.n) {
    const hs = world.hostages, n5 = 5;
    for (let i = 0; i < n5; i++) {
      const x = W - 6 - (n5 - i) * 15, saved = ctx.hostageState ? ctx.hostageState(i) : 0;
      px.rect(g, x, cy, 13, 13, saved === 2 ? '#2a5a2a' : saved === -1 ? '#3a1414' : '#141810');
      try { WP.Rigs.hostagePortrait(i).drawPortrait(g, x + 1, cy + 1, 11, { zoom: 1.2, bg: saved === 2 ? '#3a7a3a' : '#202418', tint: saved === -1 || saved === 0 ? '#606060' : undefined }); } catch (e) { /* headless */ }
    }
    cy += 16;
  }
  if (ctx.dev) F(g, WP.TEXT.hud.dev, W - 6, cy, '#ff40ff', { align: 'right' });
  // prompts above the bar (glyph first), for the local player
  const me = ps.find(p => ctx.isLocal(p.pid)) || ps[0];
  if (me && !me.down && !ctx.demo) {
    let pr = null;
    if (me.mag === 0 && me.spares.length === 0 && me.fury <= 0) pr = [WP.TEXT.hud.noAmmo, '#ff6a50'];
    else if (me.mag < WP.T.magSize * .3 && me.spares.length && me.reloadT <= 0 && me.fury <= 0) pr = [ctx.label('reload') + ' ' + WP.TEXT.hud.reload, '#ffd040'];
    if (pr && Math.floor(WP.time * 3) % 2 === 0) F(g, pr[0], W / 2, WP.PLAY_H - 12, pr[1], { align: 'center' });
  }
  H.drawRadio(g, ctx.bigText);
};
})();
