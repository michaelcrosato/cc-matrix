// The Hero screen (Gear, Skills, Stats, Devotion, Codex) and the Collection Box. Big cards, short lists, one job each.
import { CLASSES, SKILLS, SLOT_LEVELS, VOW_LEVELS, toneUnlockLevel, TONE_OFFSETS } from '../data/classes.js';
import { SLOTS, SLOT_NAMES, RARITIES, LEGENDARIES, SETS, SET_OF_CLASS, GEMS, GEM_TIERS } from '../data/items.js';
import { QUESTS, LORE_BOOKS } from '../data/quests.js';
import { MONSTERS, BESTIARY } from '../data/monsters.js';
import { itemLines, itemScore, isUpgrade, sellPrice } from '../sim/items.js';
import { equipItem, unequip } from '../sim/hero.js';
import { refreshStats } from '../sim/core.js';
import { autoLoadout, slotsOpen, vowSlots, toneUnlocked, toneList } from '../sim/progress.js';
import { devotionPoints, devotionCost, spendDevotion, toStash, fromStash, dropItemFromInv } from '../sim/town.js';
import { fmt } from '../sim/stats.js';
import { icon } from './hud.js';
import { menu } from './screens.js';
import { HOWTO } from '../data/quests.js';

const TABS = ['GEAR', 'SKILLS', 'STATS', 'DEVOTION', 'CODEX'];
const SL = { head: 'HD', shoulders: 'SH', chest: 'CH', hands: 'HN', legs: 'LG', feet: 'FT', amulet: 'AM', ring: 'RG', main: 'WP', off: 'OH' };

function tabs(game, ui, nav, d) {
  const hud = ui.hud; const W = ui.hudW; const n = TABS.length; let x = Math.round((W - n * 74) / 2);
  if (nav.tabNext) { d.tab = (d.tab + 1) % n; ui.setFocus(null); game.audio.sfx('ui_tab'); } if (nav.tabPrev) { d.tab = (d.tab + n - 1) % n; ui.setFocus(null); game.audio.sfx('ui_tab'); }
  TABS.forEach((t, i) => { const on = d.tab === i; const z = ui.zone('tab' + i, x, 6, 70, 14, { focusable: false }); hud.rect(x, 6, 70, 14, on ? 'plum' : 'night'); hud.rect(x, 19, 70, 1, on ? 'sand' : 'slate'); ui.text(x + Math.round((70 - hud.measure(t).width) / 2), 10, t, { color: on ? 'white' : 'mist' }); if (z.clicked) { d.tab = i; ui.setFocus(null); } x += 74; });
  ui.glyphsLR = true; game.glyphs.draw(hud, 6, 8, 'tabPrev'); game.glyphs.draw(hud, W - 6 - game.glyphs.width(hud, 'tabNext'), 8, 'tabNext');
}
function itemCard(game, ui, x, y, w, it, title) {
  const hud = ui.hud; ui.panel(x, y, w, 92, { fill: 'ink', border: it ? RARITIES[it.rarity].color : 'slate' });
  if (title) ui.text(x + w - hud.measure(title).width - 5, y + 3, title, { color: 'slate' });
  if (!it) { ui.text(x + 6, y + 8, 'EMPTY', { color: 'slate' }); return; }
  const R = RARITIES[it.rarity];
  ui.text(x + 6, y + 6, it.name.toUpperCase().slice(0, Math.floor(w / 6) - 1), { color: R.color });
  ui.text(x + 6, y + 16, R.name.toUpperCase() + ' ' + SLOT_NAMES[it.slot].toUpperCase() + '  ILVL ' + it.ilvl, { color: 'slate' });
  const h = game.localHero(); const dmg = it.dps ? `DAMAGE ${fmt(it.dps)}` : it.armour ? `ARMOUR ${fmt(it.armour)}` : '';
  ui.text(x + 6, y + 27, dmg, { color: 'white', scale: 1 });
  const lines = itemLines(it).filter((l) => !/^(\d+) (Damage|Armour)$/.test(l)).slice(0, 4);
  lines.forEach((l, i) => ui.text(x + 6, y + 38 + i * 10, l.toUpperCase().slice(0, Math.floor(w / 6) - 1), { color: it.power && l === LEGENDARIES[it.power].text ? 'orange' : 'sky' }));
  ui.text(x + 6, y + 80, it.flavour.toUpperCase().slice(0, Math.floor(w / 6) - 1), { color: 'slate' });
}
export function drawHeroScreen(game, ui, nav, o) {
  const hud = ui.hud, w = game.world, h = game.localHero(); const d = o.data; const W = ui.hudW, H = ui.hudH; d.tab = d.tab ?? 0;
  hud.rect(0, 0, W, H, 'ink'); tabs(game, ui, nav, d);
  if (nav.back || ((nav.hero || nav.start) && game.frame > o.born)) { game.closeOverlay(); return; }
  if (!h) return;
  if (d.tab === 0) drawGear(game, ui, nav, d, h, w);
  else if (d.tab === 1) drawSkills(game, ui, nav, d, h, w);
  else if (d.tab === 2) drawStats(game, ui, nav, d, h, w);
  else if (d.tab === 3) drawDevotion(game, ui, nav, d, h, w);
  else drawCodex(game, ui, nav, d, h, w);
}
function drawGear(game, ui, nav, d, h, w) {
  const hud = ui.hud; const W = ui.hudW;
  // paperdoll
  SLOTS.forEach((s, i) => {
    const x = 14 + (i % 2) * 26, y = 28 + Math.floor(i / 2) * 26; const it = h.gear[s]; const z = ui.zone('eq' + s, x, y, 24, 24);
    hud.rect(x - 1, y - 1, 26, 26, z.focused ? 'sand' : it ? RARITIES[it.rarity].color : 'slate'); hud.rect(x, y, 24, 24, 'night');
    ui.text(x + 5, y + 8, SL[s], { color: it ? RARITIES[it.rarity].color : 'slate' });
    if (z.focused) d.sel = { worn: s, it }; if (z.clicked && it) { if (unequip(w, h, s)) game.audio.sfx('ui_back'); else game.toast('INVENTORY FULL'); }
  });
  // inventory 8x5
  const gx = 70, gy = 28; for (let i = 0; i < 40; i++) {
    const x = gx + (i % 8) * 24, y = gy + Math.floor(i / 8) * 24; const it = h.inv[i]; const z = ui.zone('inv' + i, x, y, 23, 23);
    hud.rect(x - 1, y - 1, 25, 25, z.focused ? 'sand' : it ? RARITIES[it.rarity].color : 'slate'); hud.rect(x, y, 23, 23, it ? 'night' : 'ink');
    if (it) { ui.text(x + 5, y + 7, SL[it.slot], { color: RARITIES[it.rarity].color }); if (isUpgrade(h, it)) hud.rect(x + 17, y + 2, 4, 4, 'lime'); if (it.uid === h.upgrade) hud.rect(x + 2, y + 2, 4, 4, 'sand'); }
    if (z.focused) d.sel = { inv: i, it };
    if (z.clicked && it) { if (it.cls && it.cls !== h.cls || (it.slot === 'main' && !CLASSES[h.cls].weapons.includes(it.base)) || (it.slot === 'off' && !CLASSES[h.cls].offhands.includes(it.base))) { game.toast('THIS ONE IS NOT FOR A ' + CLASSES[h.cls].name.toUpperCase()); game.audio.sfx('error'); } else { equipItem(w, h, it.uid); game.audio.sfx('equip'); } }
    if (z.rclicked && it) { dropItemFromInv(h, it.uid); game.audio.sfx('ui_back'); game.toast('DISCARDED ' + it.name.toUpperCase().slice(0, 18)); }
  }
  ui.text(gx, gy + 122, `GOLD ${h.gold}   SCRAP ${h.mats.scrap}  DUST ${h.mats.dust}  SHARDS ${h.mats.shards}`, { color: 'sand' });
  const sel = d.sel && d.sel.it; const worn = sel && h.gear[sel.slot];
  itemCard(game, ui, 266, 28, 154, sel, d.sel && d.sel.worn ? 'WORN' : 'FOUND');
  itemCard(game, ui, 266, 132, 154, worn && worn !== sel ? worn : null, 'NOW');
  if (sel && worn && worn !== sel) { const a = sel.dps ? sel.dps - (worn.dps || 0) : (sel.armour || 0) - (worn.armour || 0); ui.text(270, 124, (a >= 0 ? 'BETTER BY ' : 'WORSE BY ') + fmt(Math.abs(a)), { color: a >= 0 ? 'lime' : 'red' }); }
  ui.prompts([['ok', 'EQUIP'], ['alt1', 'DISCARD'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], H(ui));
}
const H = (ui) => ui.hudH - 16;
function drawSkills(game, ui, nav, d, h, w) {
  const hud = ui.hud; const W = ui.hudW; const cls = CLASSES[h.cls]; d.slot = d.slot ?? 0;
  const open = slotsOpen(h.level);
  for (let i = 0; i < 6; i++) {
    const x = 14 + i * 38, y = 36; const sk = h.skills[i]; const locked = i >= open; const z = ui.zone('slot' + i, x, y, 34, 34);
    hud.rect(x - 1, y - 1, 36, 36, z.focused || d.slot === i ? 'sand' : 'slate'); hud.rect(x, y, 34, 34, locked ? 'ink' : 'night');
    if (locked) ui.text(x + 4, y + 13, 'LV ' + SLOT_LEVELS[i], { color: 'slate' });
    else if (sk) { const ic = icon(SKILLS[sk.id].icon); if (ic) hud.sprite(x + 11, y + 6, ic.rows, ic.colors); ui.text(x + 2, y + 24, SKILLS[sk.id].name.toUpperCase().slice(0, 5), { color: 'white' }); }
    game.glyphs.draw(hud, x + 2, y - 11, ['skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6'][i]);
    if (z.clicked && !locked) { d.slot = i; d.focusSkills = true; ui.setFocus('sk0'); } if (z.focused && !locked) d.slot = i;
  }
  // skill cards 4x2
  const gx = 262, gy = 36; ui.text(gx, 26, 'SKILLS', { color: 'sand' });
  cls.skills.forEach((id, i) => {
    const x = gx, y = gy + i * 24; const S = SKILLS[id]; const un = h.level >= S.lvl; const z = ui.zone('sk' + i, x, y, 158, 22);
    const inSlot = h.skills.findIndex((s) => s && s.id === id);
    hud.rect(x - 1, y - 1, 160, 24, z.focused ? 'sand' : inSlot >= 0 ? 'sky' : 'slate'); hud.rect(x, y, 158, 22, un ? 'night' : 'ink');
    const ic = icon(S.icon); if (ic && un) hud.sprite(x + 3, y + 5, ic.rows, ic.colors);
    ui.text(x + 20, y + 3, S.name.toUpperCase().slice(0, 16), { color: un ? 'white' : 'slate' }); ui.text(x + 20, y + 12, un ? (inSlot >= 0 ? 'SLOT ' + (inSlot + 1) : S.cost ? S.cost + ' ' + cls.resource.toUpperCase().slice(0, 5) : S.cd ? S.cd + 'S' : 'FREE') : 'LEVEL ' + S.lvl, { color: un ? 'mist' : 'slate' });
    if (z.focused) d.focusSkill = id;
    if (z.clicked) {
      if (!un) { game.toast('UNLOCKS AT LEVEL ' + S.lvl); game.audio.sfx('error'); }
      else if (d.slot >= open) game.audio.sfx('error');
      else { const cur = h.skills[d.slot]; const other = h.skills.findIndex((s) => s && s.id === id); const keepTone = other >= 0 ? h.skills[other].tone : null; if (other >= 0) h.skills[other] = cur ? { id: cur.id, tone: cur.tone } : null; h.skills[d.slot] = { id, tone: keepTone }; h._specKey = null; h.lockT[d.slot] = w.t + 1; refreshStats(w, h); game.audio.sfx('equip'); }
    }
  });
  // tones
  const sk = h.skills[d.slot]; const ty = 112;
  if (sk) {
    const S = SKILLS[sk.id]; ui.text(14, ty - 12, (S.name + ' TONES').toUpperCase(), { color: 'sand' });
    toneList(sk.id).forEach((tid, i) => {
      const T = S.tones[tid]; const x = 14 + i * 78, y = ty; const un = toneUnlocked(sk.id, i, h.level); const on = sk.tone === tid; const z = ui.zone('tone' + i, x, y, 74, 40);
      hud.rect(x - 1, y - 1, 76, 42, z.focused ? 'sand' : on ? 'lime' : 'slate'); hud.rect(x, y, 74, 40, on ? 'plum' : 'night');
      ui.text(x + 3, y + 3, T.name.toUpperCase().slice(0, 10), { color: un ? 'white' : 'slate' });
      if (un) ui.para(x + 3, y + 13, T.desc.toUpperCase(), 68, { color: 'mist', lh: 8 }); else ui.text(x + 3, y + 15, 'LEVEL ' + toneUnlockLevel(sk.id, i), { color: 'slate' });
      if (z.clicked) { if (!un) { game.audio.sfx('error'); game.toast('TONE UNLOCKS AT LEVEL ' + toneUnlockLevel(sk.id, i)); } else { sk.tone = on ? null : tid; h._specKey = null; h.lockT[d.slot] = w.t + 1; game.audio.sfx('equip'); } }
    });
  } else ui.text(14, ty, 'THIS SLOT IS EMPTY. PICK A SKILL.', { color: 'slate' });
  // vows
  ui.text(14, 155, 'VOWS (PICK ' + vowSlots(h.level) + ')', { color: 'sand' });
  cls.vows.forEach((v, i) => {
    const x = 14 + (i % 2) * 118, y = 165 + Math.floor(i / 2) * 29; const on = h.vows.includes(v.id); const un = vowSlots(h.level) > 0; const z = ui.zone('vow' + i, x, y, 114, 27);
    hud.rect(x - 1, y - 1, 116, 29, z.focused ? 'sand' : on ? 'lime' : 'slate'); hud.rect(x, y, 114, 27, on ? 'plum' : 'night'); ui.text(x + 3, y + 3, v.name.toUpperCase(), { color: un ? 'white' : 'slate' }); ui.para(x + 3, y + 11, v.text.toUpperCase(), 108, { color: 'mist', lh: 8 });
    if (z.clicked) { if (!un) { game.toast('VOWS OPEN AT LEVEL 5 AND 15'); game.audio.sfx('error'); } else { if (on) h.vows = h.vows.filter((q) => q !== v.id); else { if (h.vows.length >= vowSlots(h.level)) h.vows.shift(); h.vows.push(v.id); } h._specKey = null; refreshStats(w, h); game.audio.sfx('equip'); } }
  });
  const fs = d.focusSkill && SKILLS[d.focusSkill]; if (fs) ui.para(14, 78, (fs.name + ': ' + fs.desc).toUpperCase(), 236, { color: 'white' });
  ui.prompts([['ok', 'ASSIGN'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], H(ui));
}
function drawStats(game, ui, nav, d, h, w) {
  const hud = ui.hud; const s = h.stats; const W = ui.hudW;
  const big = [['DAMAGE', fmt(s.damage), 'orange'], ['TOUGHNESS', fmt(s.toughness), 'sky'], ['RECOVERY', fmt(s.regen + h.maxHp * 0.0 + s.lifeHit), 'lime']];
  big.forEach((b, i) => { const x = 20 + i * 150; ui.text(x, 36, b[0], { color: 'mist' }); ui.text(x, 48, b[1], { color: b[2], scale: 3 }); });
  const rows = [['POWER', Math.round(s.power)], ['VITALITY', Math.round(s.vit)], ['ARMOUR', Math.round(s.armour)], ['CRIT CHANCE', Math.round(s.crit) + '%'], ['CRIT DAMAGE', Math.round(s.critDmg) + '%'], ['ATTACK SPEED', '+' + Math.round(s.atkSpeed) + '%'], ['COOLDOWN REDUCTION', Math.round(s.cdr) + '%'], ['COST REDUCTION', Math.round(s.costRed) + '%'],
    ['LIFE PER HIT', Math.round(s.lifeHit)], ['LIFE REGEN', Math.round(s.regen) + '/S'], ['MOVE SPEED', s.speed.toFixed(1)], ['AREA DAMAGE', Math.round(s.area) + '%'], ['SOUND', Math.round(s.sound) + '%'], ['FLAME', Math.round(s.flame) + '%'], ['GRAVE', Math.round(s.grave) + '%'], ['GOLD FIND', Math.round(s.goldFind) + '%'], ['MAGIC FIND', Math.round(s.magicFind) + '%'], ['PICK-UP RADIUS', (w.tuning.pickupRadius + s.pickup).toFixed(1)]];
  d.page = d.page || 0; const per = 9; if (nav.down || nav.right) d.page = (d.page + 1) % Math.ceil(rows.length / per); if (nav.up || nav.left) d.page = (d.page + Math.ceil(rows.length / per) - 1) % Math.ceil(rows.length / per);
  rows.slice(d.page * per, d.page * per + per).forEach((r, i) => { ui.text(20, 100 + i * 11, r[0], { color: 'mist' }); ui.text(160, 100 + i * 11, String(r[1]), { color: 'white' }); });
  ui.text(250, 100, 'SETS', { color: 'lime' }); let y = 110; for (const [id, n] of Object.entries(s.sets)) { const S = SETS[id]; ui.text(250, y, `${S.name.toUpperCase().slice(0, 20)} ${n}/4`, { color: 'lime' }); y += 10; if (n >= 2) { y += ui.para(250, y, '2: ' + S.bonus2.toUpperCase(), 170, { color: 'white', lh: 8 }); } if (n >= 4) { y += ui.para(250, y, '4: ' + S.bonus4.toUpperCase(), 170, { color: 'white', lh: 8 }); } }
  ui.text(250, y + 4, 'RELIQUARY', { color: 'sand' }); h.reliquary.forEach((p, i) => ui.text(250, y + 14 + i * 9, p ? LEGENDARIES[p].name.toUpperCase().slice(0, 26) : 'EMPTY', { color: p ? 'orange' : 'slate' }));
  ui.text(20, 204, `PAGE ${d.page + 1} OF ${Math.ceil(rows.length / per)}`, { color: 'slate' }); ui.zone('statpg', 0, 0, 1, 1);
  ui.prompts([['nav', 'PAGE'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], H(ui));
}
function drawDevotion(game, ui, nav, d, h, w) {
  const hud = ui.hud; const a = w.acct; const dv = a.devotion; const W = ui.hudW; const tr = [['core', 'CORE', 'POWER, VITALITY, SPEED'], ['offence', 'OFFENCE', 'ATTACK SPEED, CRIT, COOLDOWN'], ['defence', 'DEFENCE', 'LIFE, ARMOUR, REGEN'], ['utility', 'UTILITY', 'AREA, COST, LIFE PER HIT, GOLD']];
  ui.text(30, 30, `DEVOTION LEVEL ${dv.level}   POINTS ${devotionPoints(a)}`, { color: 'lime', scale: 1 });
  ui.bar(30, 42, 200, 5, dv.xp / devotionCost(dv.level), 'lime'); ui.text(236, 41, `${fmt(dv.xp)} / ${fmt(devotionCost(dv.level))}`, { color: 'mist' });
  if (h.level < 30) ui.para(30, 54, 'AFTER LEVEL 30, XP FILLS DEVOTION LEVELS SHARED BY ALL YOUR HEROES. EACH LEVEL GIVES A POINT.', 380, { color: 'sand' });
  tr.forEach((t, i) => {
    const y = 80 + i * 32; const z = ui.zone('dev' + i, 30, y, 410, 28); hud.rect(29, y - 1, 412, 30, z.focused ? 'sand' : 'slate'); hud.rect(30, y, 410, 28, 'night');
    ui.text(36, y + 4, t[1], { color: 'white' }); ui.text(36, y + 15, t[2], { color: 'mist' }); ui.bar(180, y + 8, 220, 10, Math.min(1, dv[t[0]] / 30), ['orange', 'red', 'sky', 'sand'][i]); ui.text(406, y + 10, String(dv[t[0]]), { color: 'white' });
    if (z.clicked) { if (spendDevotion(w, h, t[0])) game.audio.sfx('levelup'); else { game.audio.sfx('error'); game.toast('NO DEVOTION POINTS'); } }
  });
  ui.prompts([['ok', 'SPEND A POINT'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], H(ui));
}
function drawCodex(game, ui, nav, d, h, w) {
  const hud = ui.hud; d.sub = d.sub ?? 0; const subs = ['QUESTS', 'BESTIARY', 'LORE', 'HOW TO PLAY'];
  if (nav.left) d.sub = (d.sub + 3) % 4; if (nav.right) d.sub = (d.sub + 1) % 4;
  subs.forEach((s, i) => { const x = 30 + i * 100; const z = ui.zone('sub' + i, x, 26, 96, 14); hud.rect(x - 1, 25, 98, 16, d.sub === i ? 'sand' : 'slate'); hud.rect(x, 26, 96, 14, 'night'); ui.text(x + 6, 30, s, { color: d.sub === i ? 'white' : 'mist' }); if (z.clicked || z.focused) d.sub = i; });
  const camp = w.camp;
  if (d.sub === 0) {
    QUESTS.forEach((q, i) => { const y = 52 + i * 26; const done = camp && camp.questsDone.includes(q.id); const cur = camp && camp.q === i; ui.text(30, y, `${i + 1}. ${q.name.toUpperCase()}`, { color: done ? 'lime' : cur ? 'sand' : 'slate' }); if (cur) ui.text(40, y + 10, camp.s < q.steps.length ? q.steps[camp.s].text.toUpperCase() : '', { color: 'white' }); else ui.text(40, y + 10, done ? 'COMPLETE' : 'NOT BEGUN', { color: 'slate' }); });
  } else if (d.sub === 1) {
    const seen = w.acct.codex.bestiary; const list = BESTIARY.filter((k) => MONSTERS[k].lore); d.bi = Math.max(0, Math.min(list.length - 1, d.bi ?? 0));
    if (nav.down) d.bi = Math.min(list.length - 1, d.bi + 1); if (nav.up) d.bi = Math.max(0, d.bi - 1);
    list.slice(Math.max(0, d.bi - 5), Math.max(0, d.bi - 5) + 11).forEach((k, i) => { const idx = Math.max(0, d.bi - 5) + i; const known = (w.killsByType[k] || 0) > 0 || seen[k]; ui.text(30, 52 + i * 12, known ? MONSTERS[k].name.toUpperCase() : '???', { color: idx === d.bi ? 'sand' : known ? 'white' : 'slate' }); });
    const k = list[d.bi]; if (k) { const known = (w.killsByType[k] || 0) > 0 || seen[k]; if (known) { seen[k] = true; ui.text(205, 52, MONSTERS[k].name.toUpperCase(), { color: 'sand' }); ui.para(205, 66, MONSTERS[k].lore.toUpperCase(), 190, { color: 'white' }); } else ui.text(205, 52, 'FELL ONE TO LEARN ITS NAME', { color: 'slate' }); }
    ui.zone('bes', 0, 0, 1, 1);
  } else if (d.sub === 2) {
    const found = Object.keys(w.acct.codex.lore).map(Number); if (!found.length) ui.text(30, 56, 'NO BOOKS READ YET. THEY HIDE IN THE FIRST ROOMS OF EACH ZONE.', { color: 'slate' });
    d.li = Math.max(0, Math.min(found.length - 1, d.li ?? 0)); if (nav.down) { d.li = Math.min(found.length - 1, d.li + 1); d.lp = 0; } if (nav.up) { d.li = Math.max(0, d.li - 1); d.lp = 0; }
    found.forEach((bi, i) => ui.text(30, 52 + i * 12, LORE_BOOKS[bi].title.toUpperCase(), { color: i === d.li ? 'sand' : 'white' }));
    const bk = found.length ? LORE_BOOKS[found[d.li]] : null;
    if (bk) { d.lp = d.lp || 0; if (nav.ok) d.lp = (d.lp + 1) % bk.pages.length; ui.text(205, 52, bk.title.toUpperCase(), { color: 'sand' }); ui.para(205, 66, bk.pages[d.lp].toUpperCase(), 190, { color: 'white' }); ui.text(205, 200, `PAGE ${d.lp + 1} OF ${bk.pages.length}   OK TURNS THE PAGE`, { color: 'slate' }); }
    ui.zone('lore', 0, 0, 1, 1);
  } else {
    menu(game, ui, 140, 60, 200, [{ label: 'OPEN HOW TO PLAY', fn: () => game.pushOverlay('howto', {}) }], { h: 18 });
    HOWTO.forEach((p, i) => ui.text(150, 100 + i * 12, `${i + 1}. ${p.title.toUpperCase()}`, { color: 'mist' }));
  }
  ui.prompts([['nav', 'BROWSE'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], H(ui));
}
export function drawStash(game, ui, nav, o) {
  const hud = ui.hud, w = game.world, h = game.localHero(); const a = w.acct; const d = o.data; d.tab = d.tab ?? 0; const W = ui.hudW;
  hud.rect(0, 0, W, ui.hudH, 'ink'); ui.center(6, 'THE COLLECTION BOX', { scale: 2, color: 'sand' });
  if (nav.tabNext) d.tab = (d.tab + 1) % 3; if (nav.tabPrev) d.tab = (d.tab + 2) % 3;
  for (let t = 0; t < 3; t++) { const x = 30 + t * 62; const z = ui.zone('stab' + t, x, 20, 58, 12, { focusable: false }); hud.rect(x, 20, 58, 12, d.tab === t ? 'plum' : 'night'); ui.text(x + 6, 23, 'TAB ' + (t + 1), { color: 'white' }); if (z.clicked) d.tab = t; }
  const list = a.stash[d.tab];
  for (let i = 0; i < 30; i++) { const x = 30 + (i % 6) * 24, y = 44 + Math.floor(i / 6) * 24; const it = list[i]; const z = ui.zone('st' + i, x, y, 23, 23); hud.rect(x - 1, y - 1, 25, 25, z.focused ? 'sand' : it ? RARITIES[it.rarity].color : 'slate'); hud.rect(x, y, 23, 23, it ? 'night' : 'ink'); if (it) ui.text(x + 5, y + 7, SL[it.slot], { color: RARITIES[it.rarity].color }); if (z.focused) d.sel = it; if (z.clicked && it) { if (fromStash(w, h, d.tab, i)) game.audio.sfx('ui_ok'); else game.toast('INVENTORY FULL'); } }
  for (let i = 0; i < 40; i++) { const x = 190 + (i % 8) * 24, y = 44 + Math.floor(i / 8) * 24; const it = h.inv[i]; const z = ui.zone('si' + i, x, y, 23, 23); hud.rect(x - 1, y - 1, 25, 25, z.focused ? 'sand' : it ? RARITIES[it.rarity].color : 'slate'); hud.rect(x, y, 23, 23, it ? 'night' : 'ink'); if (it) ui.text(x + 5, y + 7, SL[it.slot], { color: RARITIES[it.rarity].color }); if (z.focused) d.sel = it; if (z.clicked && it) { if (toStash(w, h, it.uid, d.tab)) game.audio.sfx('ui_ok'); else game.toast('THAT TAB IS FULL'); } }
  ui.text(30, 36 + 0, 'BOX', { color: 'mist' }); ui.text(190, 36, 'YOUR PACK', { color: 'mist' });
  if (d.sel) { const R = RARITIES[d.sel.rarity]; ui.text(30, 176, d.sel.name.toUpperCase().slice(0, 40), { color: R.color }); itemLines(d.sel).slice(0, 3).forEach((l, i) => ui.text(30, 187 + i * 10, l.toUpperCase().slice(0, 44), { color: 'sky' })); } 
  ui.prompts([['ok', 'MOVE'], ['tabNext', 'NEXT TAB'], ['back', 'CLOSE']], ui.hudH - 14); if (nav.back) game.closeOverlay();
}
