// Town service screens: Pennywhistle, Dame Brasse, Mother Ogive, the Writ board, and Knell setup/results.
import { RARITIES, SLOTS, SLOT_NAMES, MATERIALS, CRAFT_COST, REFORGE_COST, CASKET_COST, GEMS, GEM_TIERS, LEGENDARIES, AFFIXES } from '../data/items.js';
import { DIFFS, fmt } from '../sim/stats.js';
import { itemLines, sellPrice, buyPrice, salvageOf, describeAffix } from '../sim/items.js';
import { stockFor, buy, sell, casket, salvage, craft, reforge, extract, socket, addSocket, mergeGems, canAfford, claimWrits } from '../sim/town.js';
import { MODIFIERS } from '../sim/knell.js';
import { startKnell } from '../sim/knell.js';
import { menu } from './screens.js';

const SL = { head: 'HD', shoulders: 'SH', chest: 'CH', hands: 'HN', legs: 'LG', feet: 'FT', amulet: 'AM', ring: 'RG', main: 'WP', off: 'OH' };
function title(ui, t) { ui.hud.rect(0, 0, ui.hudW, ui.hudH, 'ink'); ui.center(6, t, { scale: 2, color: 'sand' }); }
function card(ui, x, y, w, it, extra) {
  const hud = ui.hud; ui.panel(x, y, w, 100, { fill: 'ink', border: it ? RARITIES[it.rarity].color : 'slate' });
  if (!it) return; const R = RARITIES[it.rarity];
  ui.text(x + 6, y + 6, it.name.toUpperCase().slice(0, Math.floor(w / 6) - 1), { color: R.color }); ui.text(x + 6, y + 16, R.name.toUpperCase() + ' ' + SLOT_NAMES[it.slot].toUpperCase() + ' ILVL ' + it.ilvl, { color: 'slate' });
  ui.text(x + 6, y + 27, it.dps ? 'DAMAGE ' + fmt(it.dps) : it.armour ? 'ARMOUR ' + fmt(it.armour) : '', { color: 'white' });
  itemLines(it).filter((l) => !/^\d+ (Damage|Armour)$/.test(l)).slice(0, 4).forEach((l, i) => ui.text(x + 6, y + 38 + i * 10, l.toUpperCase().slice(0, Math.floor(w / 6) - 1), { color: 'sky' }));
  if (extra) ui.text(x + 6, y + 88, extra, { color: 'sand' });
}
function itemList(game, ui, nav, d, items, x, y, onPick, o = {}) {
  const hud = ui.hud; d.cur = Math.max(0, Math.min(items.length - 1, d.cur ?? 0)); const per = 11;
  const start = Math.max(0, Math.min(items.length - per, d.cur - 5)); let sel = null;
  if (!items.length) ui.text(x, y, o.empty || 'NOTHING HERE', { color: 'slate' });
  items.slice(start, start + per).forEach((it, k) => {
    const i = start + k; const yy = y + k * 14; const z = ui.zone('li' + i, x, yy, 170, 13);
    hud.rect(x - 1, yy - 1, 172, 15, z.focused ? 'sand' : 'slate'); hud.rect(x, yy, 170, 13, 'night');
    ui.text(x + 3, yy + 3, `${SL[it.slot]} ${it.name.toUpperCase()}`.slice(0, 28), { color: RARITIES[it.rarity].color });
    if (z.focused) { d.cur = i; sel = it; } if (z.clicked) onPick(it, i);
  });
  return sel || items[d.cur];
}
function wallet(ui, h) { ui.text(12, 24, `GOLD ${h.gold}  SCRAP ${h.mats.scrap}  DUST ${h.mats.dust}  SHARDS ${h.mats.shards}`, { color: 'sand' }); }
function modeTabs(game, ui, nav, d, names) {
  d.mode = d.mode ?? 0; if (nav.tabNext) { d.mode = (d.mode + 1) % names.length; d.cur = 0; ui.setFocus(null); } if (nav.tabPrev) { d.mode = (d.mode + names.length - 1) % names.length; d.cur = 0; ui.setFocus(null); }
  names.forEach((n, i) => { const x = 12 + i * 80; const z = ui.zone('mt' + i, x, 34, 76, 12, { focusable: false }); ui.hud.rect(x, 34, 76, 12, d.mode === i ? 'plum' : 'night'); ui.text(x + 5, 37, n, { color: d.mode === i ? 'white' : 'mist' }); if (z.clicked) { d.mode = i; d.cur = 0; ui.setFocus(null); } });
}
export function drawVendor(game, ui, nav, o) {
  const w = game.world, h = game.localHero(), d = o.data; title(ui, 'PENNYWHISTLE'); wallet(ui, h);
  modeTabs(game, ui, nav, d, ['BUY', 'SELL', 'CASKETS']);
  d.key = d.key ?? 0; d.stock = d.stock || stockFor(w, h, d.key);
  if (d.mode === 0) {
    const sel = itemList(game, ui, nav, d, d.stock, 12, 52, (it) => { const r = buy(w, h, it); if (r) { game.toast(r === 'GOLD' ? 'NOT ENOUGH GOLD' : 'PACK IS FULL'); game.audio.sfx('error'); } else { d.stock = d.stock.filter((q) => q !== it); game.audio.sfx('coin'); } });
    card(ui, 196, 52, 218, sel, sel ? 'PRICE ' + buyPrice(sel) : '');
    ui.para(200, 156, 'EVERYTHING IS HALF PRICE. THE OTHER HALF IS YOUR SOUL.', 212, { color: 'slate' });
  } else if (d.mode === 1) {
    const sel = itemList(game, ui, nav, d, h.inv, 12, 52, (it) => { sell(w, h, it.uid); game.audio.sfx('coin'); }, { empty: 'YOUR PACK IS EMPTY' });
    card(ui, 196, 52, 218, sel, sel ? 'SELLS FOR ' + sellPrice(sel) : '');
  } else {
    ui.para(12, 54, `A MYSTERY CASKET COSTS ${CASKET_COST} BELL SHARDS AND HOLDS ONE ITEM, RELIQUARY OR BETTER. PICK A SLOT.`, 200, { color: 'mist' });
    SLOTS.forEach((s, i) => { const x = 12 + (i % 5) * 40, y = 90 + Math.floor(i / 5) * 24; const z = ui.zone('cs' + i, x, y, 36, 20); ui.hud.rect(x - 1, y - 1, 38, 22, z.focused ? 'sand' : 'slate'); ui.hud.rect(x, y, 36, 20, 'night'); ui.text(x + 4, y + 6, SL[s], { color: 'white' }); if (z.clicked) { const r = casket(w, h, s); if (typeof r === 'string') { game.toast(r === 'SHARDS' ? 'NOT ENOUGH BELL SHARDS' : 'PACK IS FULL'); game.audio.sfx('error'); } else { d.last = r; game.audio.sfx('drop_good'); } } });
    if (d.last) card(ui, 196, 52, 218, d.last, 'NEW IN YOUR PACK');
  }
  ui.prompts([['ok', 'SELECT'], ['tabNext', 'NEXT'], ['back', 'LEAVE']], ui.hudH - 14); if (nav.back) game.closeOverlay();
}
export function drawSmith(game, ui, nav, o) {
  const w = game.world, h = game.localHero(), d = o.data; title(ui, 'DAME BRASSE'); wallet(ui, h);
  modeTabs(game, ui, nav, d, ['SALVAGE', 'CRAFT', 'REFORGE']);
  if (d.mode === 0) {
    const sel = itemList(game, ui, nav, d, h.inv, 12, 52, (it) => { const r = salvage(w, h, it.uid); if (r) game.toast(`+${r[1]} ${MATERIALS[r[0]].toUpperCase()}`); }, { empty: 'NOTHING TO MELT DOWN' });
    card(ui, 196, 52, 218, sel, sel ? 'MELTS TO ' + salvageOf(sel)[1] + ' ' + MATERIALS[salvageOf(sel)[0]].toUpperCase() : '');
    ui.para(200, 156, 'THAT SWORD WAS A CHURCH BELL ON TUESDAY.', 212, { color: 'slate' });
  } else if (d.mode === 1) {
    d.slot = d.slot ?? 0; d.rar = d.rar ?? 'blessed';
    ui.text(12, 52, 'PICK A SLOT', { color: 'mist' });
    SLOTS.forEach((s, i) => { const x = 12 + (i % 5) * 40, y = 64 + Math.floor(i / 5) * 24; const z = ui.zone('cr' + i, x, y, 36, 20); ui.hud.rect(x - 1, y - 1, 38, 22, z.focused || d.slot === i ? 'sand' : 'slate'); ui.hud.rect(x, y, 36, 20, 'night'); ui.text(x + 4, y + 6, SL[s], { color: 'white' }); if (z.clicked) d.slot = i; });
    ui.text(12, 120, 'PICK A RARITY', { color: 'mist' });
    ['common', 'blessed', 'reliquary', 'legendary'].forEach((r, i) => { const x = 12 + i * 50, y = 132; const z = ui.zone('rr' + r, x, y, 46, 16); ui.hud.rect(x - 1, y - 1, 48, 18, z.focused || d.rar === r ? 'sand' : 'slate'); ui.hud.rect(x, y, 46, 16, 'night'); ui.text(x + 3, y + 5, { common: 'COMMON', blessed: 'BLESSED', reliquary: 'RELIC', legendary: 'LEGEND' }[r], { color: RARITIES[r].color }); if (z.clicked) d.rar = r; });
    const cost = CRAFT_COST[d.rar]; ui.text(12, 160, 'COST: ' + Object.entries(cost).map(([k, v]) => `${v} ${MATERIALS[k].toUpperCase()}`).join(', '), { color: canAfford(h, cost) ? 'lime' : 'red' });
    menu(game, ui, 12, 176, 120, [{ label: 'FORGE IT', fn: () => { const r = craft(w, h, SLOTS[d.slot], d.rar); if (typeof r === 'string') { game.toast(r === 'MATERIALS' ? 'NOT ENOUGH MATERIALS' : r === 'FULL' ? 'PACK IS FULL' : 'NO'); game.audio.sfx('error'); } else { d.made = r; } } }], { h: 16 });
    if (d.made) card(ui, 196, 52, 218, d.made, 'FRESH FROM THE FORGE');
  } else {
    const all = [...Object.values(h.gear).filter(Boolean), ...h.inv];
    const sel = itemList(game, ui, nav, d, all, 12, 52, (it) => { d.item = it; d.aff = 0; }, { empty: 'NOTHING TO REFORGE' });
    const it = d.item && all.includes(d.item) ? d.item : sel; d.item = it;
    if (it) { card(ui, 196, 52, 218, it, ''); it.affixes.forEach((a, i) => { const y = 156 + i * 14; const z = ui.zone('af' + i, 200, y, 220, 13); ui.hud.rect(199, y - 1, 222, 15, z.focused ? 'sand' : 'slate'); ui.hud.rect(200, y, 220, 13, 'night'); ui.text(204, y + 3, 'REROLL: ' + describeAffix(a).toUpperCase().slice(0, 32), { color: 'white' }); if (z.clicked) { const r = reforge(w, h, it.uid, i); if (r) { game.toast(r === 'MATERIALS' ? 'NEEDS 3 DUST AND 10 SCRAP' : 'NOT POSSIBLE'); game.audio.sfx('error'); } } }); ui.text(200, 148, 'COST: 3 DUST, 10 SCRAP', { color: 'mist' }); }
  }
  ui.prompts([['ok', 'SELECT'], ['tabNext', 'NEXT'], ['back', 'LEAVE']], ui.hudH - 14); if (nav.back) game.closeOverlay();
}
export function drawReliquary(game, ui, nav, o) {
  const w = game.world, h = game.localHero(), d = o.data; title(ui, 'MOTHER OGIVE'); wallet(ui, h);
  modeTabs(game, ui, nav, d, ['EXTRACT', 'SOCKET', 'MERGE GEMS']);
  if (d.mode === 0) {
    const leg = h.inv.filter((it) => it.power);
    const sel = itemList(game, ui, nav, d, leg, 12, 52, (it) => { const r = extract(w, h, it.uid); if (typeof r === 'number') { game.toast('POWER STORED IN THE RELIQUARY'); } }, { empty: 'NO LEGENDARY ITEMS IN YOUR PACK' });
    card(ui, 196, 52, 218, sel, sel ? 'DESTROYS THE ITEM, KEEPS THE POWER' : '');
    ui.text(200, 156, 'THE RELIQUARY', { color: 'sand' }); ['WEAPON', 'ARMOUR', 'JEWELLERY'].forEach((n, i) => ui.text(200, 168 + i * 11, n + ': ' + (h.reliquary[i] ? LEGENDARIES[h.reliquary[i]].name.toUpperCase().slice(0, 26) : 'EMPTY'), { color: h.reliquary[i] ? 'orange' : 'slate' }));
  } else if (d.mode === 1) {
    const all = [...Object.values(h.gear).filter(Boolean), ...h.inv].filter((it) => it.sockets);
    const sel = itemList(game, ui, nav, d, all, 12, 52, (it) => { d.item = it; }, { empty: 'NO SOCKETED ITEMS. RELIQUARY ITEMS CAN HAVE ONE.' });
    const it = d.item && all.includes(d.item) ? d.item : sel; d.item = it; if (it) card(ui, 196, 52, 218, it, it.gems.length + ' OF ' + it.sockets + ' SOCKETS FILLED');
    ui.text(200, 156, 'GEMS', { color: 'sand' }); h.gems.slice(0, 8).forEach((g, i) => { const z = ui.zone('g' + i, 200 + (i % 4) * 52, 168 + Math.floor(i / 4) * 16, 48, 14); ui.hud.rect(200 + (i % 4) * 52 - 1, 167 + Math.floor(i / 4) * 16, 50, 16, z.focused ? 'sand' : 'slate'); ui.hud.rect(200 + (i % 4) * 52, 168 + Math.floor(i / 4) * 16, 48, 14, 'night'); ui.text(204 + (i % 4) * 52, 171 + Math.floor(i / 4) * 16, GEMS[g.kind].name.split(' ')[0].toUpperCase().slice(0, 5) + ' ' + (g.tier + 1), { color: GEMS[g.kind].color }); if (z.clicked && it) { const r = socket(w, h, it.uid, i); if (r) { game.toast(r); game.audio.sfx('error'); } } });
    if (it) menu(game, ui, 12, 210, 150, [{ label: 'ADD A SOCKET (4 DUST)', fn: () => { const r = addSocket(w, h, it.uid); if (r) game.toast('NOT POSSIBLE'); } }], { h: 14 });
  } else {
    ui.para(12, 54, 'THREE GEMS OF ONE KIND AND TIER BECOME ONE OF THE NEXT TIER.', 200, { color: 'mist' });
    Object.keys(GEMS).forEach((k, i) => [0, 1].forEach((t) => { const n = h.gems.filter((g) => g.kind === k && g.tier === t).length; const x = 12 + t * 130, y = 80 + i * 24; const z = ui.zone('mg' + k + t, x, y, 124, 20); ui.hud.rect(x - 1, y - 1, 126, 22, z.focused ? 'sand' : 'slate'); ui.hud.rect(x, y, 124, 20, 'night'); ui.text(x + 4, y + 6, `${GEM_TIERS[t].toUpperCase().slice(0, 3)} ${GEMS[k].name.toUpperCase()} X${n}`.slice(0, 20), { color: GEMS[k].color }); if (z.clicked) { const r = mergeGems(w, h, k, t); if (r) { game.toast(r); game.audio.sfx('error'); } else game.audio.sfx('levelup'); } }));
    ui.text(12, 170, 'PERFECT GEMS CANNOT BE MERGED FURTHER.', { color: 'slate' });
  }
  ui.prompts([['ok', 'SELECT'], ['tabNext', 'NEXT'], ['back', 'LEAVE']], ui.hudH - 14); if (nav.back) game.closeOverlay();
}
export function drawWrits(game, ui, nav, o) {
  const w = game.world, h = game.localHero(), c = w.camp; title(ui, 'THE WRIT BOARD');
  ui.center(28, 'THREE JOBS FROM THE CRIER. FINISH ALL THREE FOR A CACHE.', { color: 'mist' });
  (c.writs || []).forEach((wr, i) => { const y = 54 + i * 28; ui.panel(60, y, 360, 24, { fill: 'night', border: wr.done ? 'lime' : 'slate' }); ui.text(68, y + 4, wr.text, { color: wr.done ? 'lime' : 'white' }); ui.bar(68, y + 14, 200, 4, Math.min(1, wr.have / wr.n), wr.done ? 'lime' : 'sand'); ui.text(274, y + 13, `${Math.min(wr.have, wr.n)} / ${wr.n}`, { color: 'mist' }); });
  menu(game, ui, 170, 150, 140, [{ label: c.writsPaid ? 'CLAIM THE CACHE' : 'NOT YET DONE', disabled: !c.writsPaid, fn: () => { if (claimWrits(w, h)) { game.toast('CACHE CLAIMED. NEW WRITS POSTED'); game.audio.sfx('chest'); } else game.toast('FINISH ALL THREE FIRST'); } }, { label: 'CLOSE', fn: () => game.closeOverlay() }], { h: 16 });
  if (nav.back) game.closeOverlay();
}
export function drawKnellSetup(game, ui, nav, o) {
  const w = game.world, h = game.localHero(), d = o.data; title(ui, 'THE KNELL FONT');
  d.tier = d.tier ?? 0; d.mods = d.mods || []; d.grand = d.grand ?? false;
  const keys = w.acct.grandKeys || h.grandKeys || 0;
  ui.center(26, `TIER: ${DIFFS.find((q) => q.id === w.diffId).name.toUpperCase()}   GRAND KEYS: ${keys}`, { color: 'sand' });
  MODIFIERS.forEach((m, i) => { const x = 10 + (i % 3) * 138, y = 44 + Math.floor(i / 3) * 40; const on = d.mods.includes(m.id); const z = ui.zone('mod' + i, x, y, 134, 36); ui.hud.rect(x - 1, y - 1, 136, 38, z.focused ? 'sand' : on ? 'lime' : 'slate'); ui.hud.rect(x, y, 134, 36, on ? 'plum' : 'night'); ui.text(x + 6, y + 6, m.name.toUpperCase(), { color: 'white' }); ui.text(x + 6, y + 18, m.text.toUpperCase(), { color: 'mist' }); if (z.clicked) { d.mods = on ? d.mods.filter((q) => q !== m.id) : d.mods.length >= 2 ? [d.mods[1], m.id] : [...d.mods, m.id]; } });
  const items = [
    { label: 'DIFFICULTY: ' + DIFFS.find((q) => q.id === w.diffId).name.toUpperCase(), fn: () => { const avail = DIFFS.filter((q) => !q.post || (w.camp && w.camp.done)); const i = avail.findIndex((q) => q.id === w.diffId); w.diffId = avail[(i + 1) % avail.length].id; } },
    { label: 'BEGIN A KNELL RUN', fn: () => { game.closeAll(); startKnell(w, { tier: 0, mods: d.mods, grand: false }); game.beginKnellView(); } },
    { label: d.grand ? 'GRAND KNELL TIER ' + (d.tier + 1) : 'GRAND KNELL (SPENDS A KEY)', disabled: keys < 1, fn: () => { if (keys < 1) { game.toast('YOU NEED A GRAND KEY'); return; } if (!d.grand) { d.grand = true; return; } if (w.acct.grandKeys) w.acct.grandKeys--; game.closeAll(); startKnell(w, { tier: d.tier, mods: d.mods, grand: true }); game.beginKnellView(); } },
    { label: d.grand ? 'RAISE TIER (' + (d.tier + 1) + ')' : 'CLOSE', fn: () => { if (d.grand) d.tier = (d.tier + 1) % 12; else game.closeOverlay(); } },
  ];
  menu(game, ui, 14, 130, 200, items, { h: 16, gap: 4 });
  ui.para(222, 132, 'KILLS FILL THE BELL. AT THE TOP, A WARDEN FALLS. REWARDS: A LEGENDARY, SHARDS, XP, AND SOMETIMES A GRAND KEY. THE GRAND KNELL ADDS A TEN MINUTE TIMER.', 195, { color: 'mist', lh: 8 });
  const b = w.acct.bests; Object.entries(b).slice(0, 3).forEach(([k, v], i) => ui.text(222, 196 + i * 9, `BEST ${k.toUpperCase()}: ${Math.floor(v.time / 60)}:${String(Math.floor(v.time % 60)).padStart(2, '0')} T${v.tier}`, { color: 'sand' }));
  ui.prompts([['ok', 'SELECT'], ['back', 'CLOSE']], ui.hudH - 14); if (nav.back) game.closeOverlay();
}
export function drawKnellResults(game, ui, nav, o) {
  const r = o.data.result; title(ui, r.failed ? 'THE KNELL FADES' : 'THE KNELL IS DONE');
  const t = r.time; ui.center(40, r.failed ? 'THE TEN MINUTES ARE UP' : r.grand ? 'GRAND KNELL TIER ' + (r.tier + 1) : 'KNELL RUN COMPLETE', { color: 'white' });
  [['TIME', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`], ['KILLS', String(r.kills)], ['LEGENDARY', r.rewards.legendary[0] || 'NONE']].forEach((b, i) => { ui.text(30 + i * 150, 70, b[0], { color: 'mist' }); ui.text(30 + i * 150, 84, b[1].toUpperCase().slice(0, 14), { color: 'sand', scale: b[0] === 'LEGENDARY' ? 1 : 3 }); });
  if (r.rewards.key) ui.center(130, 'A GRAND KEY DROPS FROM THE BELL', { color: 'lime' });
  menu(game, ui, 170, 160, 140, [{ label: 'BACK TO TOWN', fn: () => { game.closeAll(); game.world.knell = null; game.enterZone('town'); } }], { h: 16 });
  if (nav.back) { game.closeAll(); game.world.knell = null; game.enterZone('town'); }
}
