// The in-game HUD, drawn each frame on ctx.hud in art pixels. Life is a candle, resource a class vessel.
import { THREE, hudSprite, PALETTE } from '../../pixel-engine.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { RARITIES } from '../data/items.js';
import { MONSTERS, AFFLICTIONS } from '../data/monsters.js';
import { xpToNext, fmt } from '../sim/stats.js';
import { SEAT_PALETTE } from '../data/meta.js';
import { fmtNum } from '../view/vfx.js';

const V = new THREE.Vector3();
export function project(game, x, y, z) {
  const hud = game.ctx.hud; V.set(x, y, z).project(game.ctx.camera.camera);
  return [((V.x + 1) / 2) * hud.width, (1 - (V.y + 1) / 2) * hud.height, V.z];
}
const iconCache = new Map();
export function icon(name) { if (!iconCache.has(name)) { try { iconCache.set(name, hudSprite(name)); } catch { iconCache.set(name, null); } } return iconCache.get(name); }
const FLAME = ['..o..', '.ooo.', 'ooyoo', 'ooyoo', '.oyo.', '..o..'];
const FLAME2 = ['.o...', '.ooo.', 'ooyoo', '.oyoo', '.oyo.', '..o..'];

export function drawCandle(ui, x, y, h, frac, seatColor, flick, label) {
  const hud = ui.hud; const W = 14, H = 62;
  hud.rect(x - 1, y - 1, W + 2, H + 14, 'ink');
  hud.rect(x, y + 12, W, H, 'night');
  const f = Math.max(0, Math.min(1, frac));
  const hh = Math.round(H * f);
  hud.rect(x + 1, y + 12 + (H - hh), W - 2, hh, f < 0.25 ? 'red' : 'sand');
  hud.rect(x + 1, y + 12 + (H - hh), 3, hh, 'white');
  hud.rect(x + 5, y + 8 + (H - hh) + 4, 4, 2, 'mist');
  // wick and flame
  const fy = y + 12 + (H - hh) - 8;
  hud.rect(x + 6, fy + 5, 2, 4, 'ink');
  const sprite = flick % 20 < 10 ? FLAME : FLAME2;
  hud.sprite(x + 4, fy + (f < 0.25 && flick % 7 < 2 ? 2 : 0) - 2, sprite, { o: f < 0.25 ? 'red' : 'orange', y: 'sand' });
  hud.rect(x + 2, y + 12 + H, W - 4, 2, seatColor || 'orange');
}
const VESSEL = {
  clangor: { fill: 'orange', shape: ['..oooo..', '.oooooo.', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', '.oooooo.', 'oo....oo'] },
  wick: { fill: 'sand', shape: ['.oooooo.', 'oooooooo', 'o......o', 'o......o', 'o......o', 'o......o', 'o......o', 'oooooooo', '.oooooo.'] },
  tithe: { fill: 'sand', shape: ['.oooooo.', '.oooooo.', 'o......o', 'o......o', 'o......o', 'o......o', 'o......o', 'oooooooo', '.oooooo.'] },
};
export function drawVessel(ui, x, y, h, key, frac) {
  const hud = ui.hud; const v = VESSEL[key] || VESSEL.clangor; const W = 24, H = 30; const f = Math.max(0, Math.min(1, frac));
  hud.rect(x - 1, y - 1, W + 2, H + 2, 'ink'); hud.rect(x, y, W, H, 'night');
  const hh = Math.round((H - 2) * f); hud.rect(x + 1, y + H - 1 - hh, W - 2, hh, v.fill);
  if (f > 0.02) hud.rect(x + 1, y + H - 1 - hh, W - 2, 1, 'white');
  hud.rect(x, y + H + 1, W, 2, 'plum');
}

export function drawActionBar(game, ui, h, x0, y0, small = false) {
  const hud = ui.hud; const S = small ? 14 : 26; const G = small ? 2 : 3; const g = game.glyphs;
  const w = game.world; const acts = ['skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6'];
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * (S + G); const sk = h.skills[i];
    hud.rect(x - 1, y0 - 1, S + 2, S + 2, h.lockT[i] > w.t ? 'red' : 'slate'); hud.rect(x, y0, S, S, sk ? 'night' : 'ink');
    if (sk) {
      const sp = SKILLS[sk.id]; const ic = icon(sp.icon); if (ic) hud.sprite(x + Math.floor((S - 12) / 2), y0 + Math.floor((S - 12) / 2) + (small ? 0 : -1), ic.rows, ic.colors);
      const spec = game.skillSpecFor(h, i);
      const cdMax = Math.max(0.1, (spec ? spec.cd : 1) * (1 - h.stats.cdr / 100) * w.tuning.cooldownScale);
      if (h.cd[i] > 0 && spec && spec.cd > 0.6) { const f = Math.min(1, h.cd[i] / cdMax); hud.rect(x, y0, S, Math.round(S * f), 'ink'); if (!small) ui.text(x + 4, y0 + 9, h.cd[i] > 9.9 ? String(Math.ceil(h.cd[i])) : h.cd[i].toFixed(1), { color: 'white' }); }
      const cost = spec ? Math.round(spec.cost * (1 - h.stats.costRed / 100)) : 0;
      if (cost && h.res < cost) { hud.rect(x, y0, S, 1, 'red'); hud.rect(x, y0 + S - 1, S, 1, 'red'); hud.rect(x, y0, 1, S, 'red'); hud.rect(x + S - 1, y0, 1, S, 'red'); } // can't pay: red frame
      if (cost && !small) ui.text(x + S - 14, y0 + S - 8, String(cost), { color: h.res >= cost ? 'sky' : 'red' });
    }
    if (!small) g.draw(hud, x + 1, y0 - 12, acts[i]);
  }
  if (!small) {
    // potion and dodge
    const px = x0 + 6 * (S + G) + 8;
    hud.rect(px - 1, y0 - 1, S + 2, S + 2, 'slate'); hud.rect(px, y0, S, S, 'night'); const pi = icon('potion-red'); if (pi) hud.sprite(px + 7, y0 + 6, pi.rows, pi.colors);
    if (h.potionCd > 0) { hud.rect(px, y0, S, Math.round(S * Math.min(1, h.potionCd / game.world.tuning.potionCooldown)), 'ink'); ui.text(px + 4, y0 + 9, String(Math.ceil(h.potionCd)), { color: 'white' }); }
    g.draw(hud, px + 1, y0 - 12, 'potion');
    const dx = px + S + G;
    hud.rect(dx - 1, y0 - 1, S + 2, S + 2, 'slate'); hud.rect(dx, y0, S, S, 'night'); const di = icon('dash-icon'); if (di) hud.sprite(dx + 7, y0 + 6, di.rows, di.colors);
    if (h.dodgeCd > 0) { hud.rect(dx, y0, S, Math.round(S * Math.min(1, h.dodgeCd / Math.max(0.1, game.world.tuning.dodgeCooldown))), 'ink'); }
    g.draw(hud, dx + 1, y0 - 12, 'dodge');
  }
}

export function drawHud(game) {
  const ui = game.ui, hud = ui.hud, w = game.world; const W = hud.width, H = hud.height;
  const heroes = w.heroes.filter((h) => !h.gone);
  const me = game.localHero(); if (!me) return;
  const solo = heroes.filter((h) => !h.bot).length <= 1 && !game.couch;
  const flick = game.frame;
  if (solo || true) {
    const cls = CLASSES[me.cls];
    // top-left: level, name, xp, gold
    ui.text(12, 10, `LV ${me.level} ${me.name}`, { color: 'white' });
    const xpf = me.level >= 30 ? 1 : me.xp / xpToNext(me.level);
    ui.bar(12, 20, 120, 4, xpf, 'sky'); ui.text(12, 27, `GOLD ${me.gold.toLocaleString('en-US')}`, { color: 'sand' });
    if (w.devotionLvl) ui.text(12, 36, `DEVOTION ${w.devotionLvl}`, { color: 'lime' });
    // candle bottom-left
    if (solo) {
      const cy = H - 12 - 76; drawCandle(ui, 12, cy, 62, me.hp / me.maxHp, SEAT_PALETTE[me.seat], flick);
      ui.text(31, H - 26, fmtNum(me.hp), { color: me.hp / me.maxHp < 0.25 ? 'red' : 'white' });
      drawVessel(ui, W - 12 - 24, H - 12 - 30, 30, cls.resKey, me.res / me.resMax);
      ui.text(W - 12 - hud.measure(cls.resource.toUpperCase()).width, H - 12 - 30 - 10, cls.resource.toUpperCase(), { color: 'mist' });
      ui.text(W - 12 - 24 + 12 - Math.round(hud.measure(String(Math.round(me.res))).width / 2), H - 12 - 18, String(Math.round(me.res)), { color: 'white' });
      const barW = 6 * 29 + 8 + 2 * 29;
      drawActionBar(game, ui, me, Math.round((W - barW) / 2), H - 12 - 26);
    }
  }
  if (!solo) drawCouchPanels(game, ui, heroes);
  // upgrade toast
  if (game.upgradeToast && game.upgradeToast.t > 0) {
    const u = game.upgradeToast; const R = RARITIES[u.rarity]; const tx = Math.round(W / 2) - 70, ty = H - 70;
    ui.panel(tx, ty, 140, 22, { fill: 'ink', border: R.color });
    ui.text(tx + 6, ty + 4, 'UPGRADE: ' + u.name.toUpperCase().slice(0, 22), { color: R.color });
    const gw = game.glyphs.draw(hud, tx + 6, ty + 10, 'equip'); ui.text(tx + 8 + gw, ty + 12, 'EQUIP', { color: 'white' });
  }
  // zone toast, boss bar, quest/knell
  drawTopCentre(game, ui);
  // minimap
  drawMinimap(game, ui, me);
  // streak
  if (w.requiem.count >= 10 && w.t - w.requiem.t < 2) ui.text(W - 12 - hud.measure(`STREAK ${w.requiem.count}`).width, H - 110, `STREAK ${w.requiem.count}`, { color: 'sand' });
  // interaction prompt
  const spot = w.spots.find((s) => s.id === me.nearSpot);
  if (spot && !spot.used && !game.overlay) {
    const [sx, sy] = project(game, spot.x, 1.8, spot.z);
    const label = spot.name + (spot.hold ? ' (HOLD)' : ''); const lw = hud.measure(label).width;
    const gw = game.glyphs.width(hud, 'interact');
    ui.text(Math.round(sx - lw / 2 + gw / 2), Math.round(sy - 12), label, { color: 'white' }); game.glyphs.draw(hud, Math.round(sx - lw / 2 - gw / 2 - 2), Math.round(sy - 14), 'interact');
    if (spot.prog > 0) ui.bar(Math.round(sx - 20), Math.round(sy + 2), 40, 3, spot.prog / spot.hold, 'sand');
  }
  const dead = heroes.filter((h) => !h.alive);
  for (const d of dead) { if (d.id !== me.id) { const [sx, sy] = project(game, d.x, 1.2, d.z); ui.text(Math.round(sx - 24), Math.round(sy), 'HOLD TO REVIVE', { color: 'lime' }); } }
  drawWorldLabels(game, ui, me);
  drawBanner(game, ui);
  drawSubtitle(game, ui);
  drawToasts(game, ui);
  // low-life vignette cue
  if (me.alive && me.hp / me.maxHp < 0.3) { const a = Math.floor(game.frame / 8) % 2; if (a) { hud.rect(0, 0, W, 2, 'red'); hud.rect(0, H - 2, W, 2, 'red'); hud.rect(0, 0, 2, H, 'red'); hud.rect(W - 2, 0, 2, H, 'red'); } }
}
function drawCouchPanels(game, ui, heroes) {
  const hud = ui.hud; const W = hud.width, H = hud.height;
  heroes.forEach((h, i) => {
    const corner = [[8, 8], [W - 8 - 110, 8], [8, H - 8 - 46], [W - 8 - 110, H - 8 - 46]][h.seat % 4];
    const [x, y] = corner; const col = SEAT_PALETTE[h.seat % 4];
    ui.panel(x, y, 110, 46, { fill: 'ink', border: col });
    drawCandle(ui, x + 4, y + 4, 20, h.hp / h.maxHp, col, game.frame);
    ui.text(x + 24, y + 4, `${h.name} L${h.level}`.slice(0, 16), { color: col });
    ui.bar(x + 24, y + 14, 60, 3, h.hp / h.maxHp, 'red'); ui.bar(x + 24, y + 19, 60, 3, h.res / h.resMax, 'sky');
    drawVessel(ui, x + 88, y + 14, 12, CLASSES[h.cls].resKey, h.res / h.resMax);
    if (h.alive) drawActionBar(game, ui, h, x + 24, y + 28, true); else ui.text(x + 24, y + 28, 'DOWN', { color: 'red' });
  });
}
function drawTopCentre(game, ui) {
  const hud = ui.hud, w = game.world, W = hud.width;
  const boss = w.monsters.find((m) => m.boss && !m.dead && m.bossBar);
  if (boss) {
    const bw = Math.min(220, W - 160), x = Math.round((W - bw) / 2);
    ui.center(8, boss.name.toUpperCase(), { color: 'red' }); ui.bar(x, 18, bw, 6, boss.hp / boss.maxHp, 'red');
    for (const t of boss.phaseTicks || []) hud.rect(x + Math.round(bw * t), 17, 1, 8, 'white');
    hud.rect(x - 1, 17, bw + 2, 1, 'slate'); hud.rect(x - 1, 24, bw + 2, 1, 'slate');
    return;
  }
  if (w.knell && w.knell.active) {
    const k = w.knell; const bw = 150, x = Math.round((W - bw) / 2);
    ui.center(8, k.phase === 'warden' ? 'THE WARDEN' : 'THE KNELL ' + Math.floor(k.fill * 100) + '%', { color: 'sand' }); ui.bar(x, 18, bw, 7, Math.min(1, k.fill), k.fill >= 1 ? 'white' : 'orange');
    hud.rect(x - 1, 17, bw + 2, 1, 'sand'); hud.rect(x - 1, 25, bw + 2, 1, 'sand');
    if (k.timer != null) ui.center(28, `${Math.floor(k.timer / 60)}:${String(Math.floor(k.timer % 60)).padStart(2, '0')}`, { color: 'white' });
    return;
  }
  if (game.zoneToast && game.zoneToast.t > 0) ui.center(Math.round(hud.height * 0.2), game.zoneToast.text.toUpperCase(), { color: 'sand', scale: 2 });
  else if (game.questLine) ui.center(game.couch ? 52 : 8, game.couch ? game.questLine.slice(0, 44) : game.questLine, { color: 'mist' });
}
export function drawMinimap(game, ui, me) {
  const hud = ui.hud, w = game.world, zone = w.zone; if (!zone) return;
  const W = hud.width; const mw = 72, mh = 54, x0 = W - mw - 10, y0 = game.couch ? 62 : 10;
  ui.panel(x0, y0, mw, mh, { fill: 'ink', border: 'slate' });
  const ex = game.explored; if (!ex) return;
  const sc = 2; const cx = Math.floor(me.x), cz = Math.floor(me.z);
  for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
    const c = cx + (px - mw / 2) * sc, r = cz + (py - mh / 2) * sc; const ci = Math.floor(c), ri = Math.floor(r);
    if (ci < 0 || ri < 0 || ci >= zone.w || ri >= zone.h) continue;
    const v = zone.cells[ri * zone.w + ci]; if (!ex[ri * zone.w + ci]) continue;
    if (v === 1) hud.rect(x0 + px, y0 + py, 1, 1, 'slate'); else if (v === 0) hud.rect(x0 + px, y0 + py, 1, 1, 'night');
  }
  for (const h of w.heroes) if (!h.gone) hud.rect(x0 + Math.round(mw / 2 + (h.x - me.x) / sc), y0 + Math.round(mh / 2 + (h.z - me.z) / sc), 2, 2, SEAT_PALETTE[h.seat % 4]);
  for (const m of w.monsters) { if (m.dead || m.prop || m.team === 'hero') continue; const px = Math.round(mw / 2 + (m.x - me.x) / sc), py = Math.round(mh / 2 + (m.z - me.z) / sc); if (px > 0 && py > 0 && px < mw && py < mh && ex[Math.floor(m.z) * zone.w + Math.floor(m.x)]) hud.rect(x0 + px, y0 + py, 1, 1, m.elite || m.rare ? 'sand' : 'red'); }
  for (const s of w.spots) { if (s.used && s.kind !== 'lychgate') continue; const px = Math.round(mw / 2 + (s.x - me.x) / sc), py = Math.round(mh / 2 + (s.z - me.z) / sc); if (px > 0 && py > 0 && px < mw && py < mh) hud.rect(x0 + px, y0 + py, 2, 2, s.kind === 'exit' ? 'lime' : s.kind === 'npc' ? 'sky' : 'sand'); }
  ui.text(x0, y0 + mh + 4, (w.zoneDef.name || '').toUpperCase().slice(0, 12), { color: 'slate' });
}
function drawWorldLabels(game, ui, me) {
  const hud = ui.hud, w = game.world; const showAll = game.labelsAll;
  // damage numbers
  for (const n of game.vfx.numbers) { const [sx, sy, sz] = project(game, n.x, n.y, n.z); if (sz > 1) continue; const a = n.age / 0.9; const sc = n.scale; const s = n.text; const tw = hud.measure(s, sc).width; ui.text(Math.round(sx - tw / 2), Math.round(sy - a * 6), s, { color: n.color, scale: sc }); }
  // monster names: soft-lock / hover / elites
  const tgt = me.softTarget;
  for (const m of w.monsters) {
    if (m.dead || m.prop || m.team === 'hero') continue; const near = Math.hypot(m.x - me.x, m.z - me.z); if (near > (m.boss ? 60 : 15)) continue;
    const hover = game.hoverMonster === m.id || tgt === m.id;
    if (!(hover || m.elite || m.rare || m.boss) || (m.state === 'dormant' && !m.elite)) continue;
    const [sx, sy] = project(game, m.x, 2.1 * (m.scale || 1), m.z);
    const nm = m.name.toUpperCase(); const tw = hud.measure(nm).width;
    const col = m.rare ? 'sand' : m.elite ? 'sky' : 'white';
    ui.text(Math.round(sx - tw / 2), Math.round(sy - 10), nm, { color: col }); ui.bar(Math.round(sx - 14), Math.round(sy - 1), 28, 3, m.hp / m.maxHp, 'red');
    if (m.aff.length && (m.leader || m.rare)) { let ax = Math.round(sx - (m.aff.length * 40) / 2); for (const a of m.aff) { const t = AFFLICTIONS[a].name.toUpperCase(); ui.text(ax, Math.round(sy + 4), t.slice(0, 8), { color: AFFLICTIONS[a].color }); ax += 42; } }
    if (m.status.resonance) for (let i = 0; i < m.status.resonance.n; i++) hud.rect(Math.round(sx - 12 + i * 5), Math.round(sy + 11), 3, 3, 'orange');
  }
  // item labels
  for (const d of w.drops) {
    if (d.kind !== 'item' || (d.owner != null && d.owner !== me.seat)) continue; const R = RARITIES[d.item.rarity];
    if (!(R.rank >= 2 || showAll)) continue; const [sx, sy] = project(game, d.x, 0.9, d.z);
    const nm = d.item.name.toUpperCase(); const tw = hud.measure(nm).width; hud.rect(Math.round(sx - tw / 2 - 2), Math.round(sy - 2), tw + 4, 10, 'ink'); ui.text(Math.round(sx - tw / 2), Math.round(sy), nm, { color: R.color });
  }
  // NPC names
  for (const s of w.spots) { if (s.kind !== 'npc' || Math.hypot(s.x - me.x, s.z - me.z) > 14) continue; const [sx, sy] = project(game, s.x, 2.3 * (s.scale || 1), s.z); const tw = hud.measure(s.name.toUpperCase()).width; ui.text(Math.round(sx - tw / 2), Math.round(sy), s.name.toUpperCase(), { color: 'sky' }); }
  // other heroes' names in co-op
  if (w.heroes.length > 1) for (const h of w.heroes) { if (h.gone || h === me) continue; const [sx, sy] = project(game, h.x, 2.2, h.z); const tw = hud.measure(h.name.toUpperCase()).width; ui.text(Math.round(sx - tw / 2), Math.round(sy), h.name.toUpperCase(), { color: SEAT_PALETTE[h.seat % 4] }); }
}
function drawBanner(game, ui) {
  const b = game.bannerNow; if (!b) return; const hud = ui.hud;
  const y = Math.round(hud.height * 0.28); const a = Math.min(1, b.t / 0.4);
  if (b.sub) ui.center(y - 14, b.sub, { color: 'mist' });
  ui.center(y, b.text.toUpperCase().slice(0, b.scale === 2 ? 40 : 60), { color: b.color, scale: b.scale === 2 ? 2 : 1 });
}
function drawSubtitle(game, ui) {
  const s = game.subtitle; if (!s || s.t <= 0) return; const hud = ui.hud;
  const lines = ui.wrap(s.text.toUpperCase(), 330); const h = lines.length * 10 + 16; const y = hud.height - h - 40; const x = Math.round((hud.width - 340) / 2);
  ui.panel(x, y, 340, h, { fill: 'ink', border: 'slate' });
  ui.text(x + 6, y + 4, s.who, { color: s.color || 'sand' });
  lines.forEach((l, i) => ui.text(x + 6, y + 14 + i * 10, l, { color: 'white' }));
}
function drawToasts(game, ui) {
  const hud = ui.hud; let y = 50;
  for (const t of game.toasts) { const tw = hud.measure(t.text).width; ui.text(Math.round(hud.width / 2 - tw / 2), y, t.text, { color: t.color || 'white' }); y += 10; }
}
