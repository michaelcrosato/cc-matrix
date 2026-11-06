// Shared pieces of every menu: screens, tabs, item cards, grids.
import { AFFIXES, GEM_KINDS, parseGem, RARITIES, SETS, SLOT_NAMES } from '../../data/items.js';
import { itemCompare } from '../../sim/loot.js';
import { gemIcon, icon, itemIcon, slotIcon } from '../icons.js';

export class Screen {
  constructor(game, o = {}) {
    this.game = game;
    this.tag = o.tag ?? 'screen';
    this.freeze = o.freeze ?? true;   // engine.timeScale 0 while open (solo and couch)
    this.holdSim = o.holdSim ?? false;
    this.covers = o.covers ?? (o.freeze ?? true); // a full-screen panel: no HUD underneath
    this.t = 0;
  }
  get hero() { return this.game.menuHero(); }
  draw() {}
  back() { this.game.closeScreen(); }
  onOpen() {}
  onClose() {}
}

export function frame(ui, title, o = {}) {
  const W = ui.w, H = ui.h;
  const m = o.margin ?? 6;
  ui.rect(m, m, W - m * 2, H - m * 2, o.seatColor ?? 'slate');
  ui.rect(m + 1, m + 1, W - m * 2 - 2, H - m * 2 - 2, 'ink');
  if (title) ui.text(14, 12, title, { color: 'sand', scale: 2 });
}

export function tabs(ui, id, list, index, o = {}) {
  // Each tab says where focus lands when it opens.
  if (o.first && ui.game.topScreen()?.lastTab !== index) { ui.game.topScreen().lastTab = index; if (o.first[index]) ui.preferFocus = o.first[index]; }
  const y = o.y ?? 12;
  let x = o.x ?? 14;
  let out = index;
  const input = ui.game.input.menu;
  const gapG = ui.glyph('tabL', x, y);
  x += gapG + 2;
  list.forEach((label, i) => {
    const w = ui.measure(label) + 10;
    const r = ui.widget(`${id}:tab${i}`, x, y - 1, w, 13);
    const on = i === index;
    ui.rect(x, y - 1, w, 13, on ? 'sand' : r.focused ? 'plum' : 'night');
    ui.text(x + 5, y + 2, label, { color: on ? 'ink' : 'mist', shadow: false });
    if (r.activated && !on) { out = i; ui.game.audioSys?.sfx('ui_tab'); }
    x += w + 2;
  });
  ui.glyph('tabR', x + 2, y);
  if (input.tabL) { out = (index - 1 + list.length) % list.length; ui.game.audioSys?.sfx('ui_tab'); }
  if (input.tabR) { out = (index + 1) % list.length; ui.game.audioSys?.sfx('ui_tab'); }
  return out;
}

export const affixLine = (a) => {
  const def = AFFIXES[a.k];
  if (!def) return a.k.toUpperCase();
  return def.pct ? `+${Math.round(a.v * 100)}% ${def.label}` : `+${a.v} ${def.label}`;
};

export function gemLine(item, g) {
  const { kind, tier } = parseGem(g);
  const d = item.slot === 'main' ? GEM_KINDS[kind].weapon : GEM_KINDS[kind].armour;
  const v = d.v[tier];
  return d.pct ? `+${Math.round(v * 100)}% ${d.label}` : `+${v} ${d.label}`;
}

export const pct = (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

/** The card. name, two numbers, four lines, flavour. */
export function itemCard(ui, x, y, w, it, h, world, o = {}) {
  if (!it) { ui.textBlock(x, y, o.empty ?? 'EMPTY', w, { color: 'slate', lineH: 9 }); return y + 10; }
  const R = RARITIES[it.rarity];
  let cy = y;
  const limit = ui.h - 28;
  const wrapPush = (text, color, n = 9) => { for (const l of ui.wrap(text, w)) { if (cy > limit) return; ui.text(x, cy, l, { color }); cy += n; } };
  const nameLines = ui.wrap(it.name, w).slice(0, 3);
  for (const l of nameLines) { ui.text(x, cy, l, { color: R.color }); cy += 9; }
  wrapPush(`${R.name} ${SLOT_NAMES[it.slot]}`, 'slate', 10);
  if (it.dps) wrapPush(`${it.dps} WEAPON DAMAGE`, 'white');
  if (it.armor) wrapPush(`${it.armor} ARMOUR`, 'white');
  if (h && world && !o.noCompare && !o.equipped) {
    const c = itemCompare(h, it, world.account, world.tuning);
    ui.text(x, cy, `DAMAGE ${pct(c.dmg)}`, { color: c.dmg > 0.0005 ? 'lime' : c.dmg < -0.0005 ? 'red' : 'mist', scale: w > 150 ? 2 : 1 }); cy += w > 150 ? 15 : 9;
    ui.text(x, cy, `TOUGHNESS ${pct(c.tough)}`, { color: c.tough > 0.0005 ? 'lime' : c.tough < -0.0005 ? 'red' : 'mist', scale: w > 150 ? 2 : 1 }); cy += w > 150 ? 16 : 11;
  }
  for (const a of it.affixes.slice(0, 4)) { if (cy > limit) break; ui.text(x, cy, affixLine(a).slice(0, Math.floor((w + 1) / 6)), { color: 'sky' }); cy += 9; }
  for (const g of it.gems ?? []) {
    if (cy > limit) break;
    if (g) { ui.text(x, cy, gemLine(it, g).slice(0, Math.floor((w + 1) / 6)), { color: 'sand' }); cy += 9; }
    else { ui.text(x, cy, 'EMPTY SOCKET', { color: 'slate' }); cy += 9; }
  }
  if (it.powerText) { cy += 1; wrapPush(it.powerText, 'orange'); }
  if (it.set) {
    const s = SETS[it.set];
    const n = h ? Object.values(h.gear).filter((g) => g?.set === it.set).length : 0;
    cy += 1;
    wrapPush(`SET ${n}/4. 2: ${s.two}`, n >= 2 ? 'lime' : 'slate');
    wrapPush(`4: ${s.four}`, n >= 4 ? 'lime' : 'slate');
  }
  if (it.flavor && cy < limit - 10) { cy += 1; for (const l of ui.wrap(it.flavor, w).slice(0, 2)) { ui.text(x, cy, l, { color: 'plum' }); cy += 9; } }
  return cy;
}

/** One inventory-style cell. */
export function cell(ui, id, x, y, size, it, o = {}) {
  const r = ui.widget(id, x, y, size, size, o);
  const f = r.focused;
  const border = f ? 'white' : it ? RARITIES[it.rarity]?.color ?? 'slate' : 'night';
  ui.rect(x, y, size, size, border === 'white' && !f ? 'mist' : border);
  ui.rect(x + 1, y + 1, size - 2, size - 2, f ? 'plum' : 'ink');
  if (it) {
    const ic = icon(itemIcon(it));
    const sc = size >= 36 ? 2 : 1;
    const off = Math.floor((size - 12 * sc) / 2);
    ui.sprite(x + off, y + off, ic.rows, ic.colors, { scale: sc });
    if (o.badge) ui.rect(x + size - 5, y + 2, 3, 3, o.badge);
    if (it.gems?.length && it.gems.some((g) => g)) ui.rect(x + 2, y + size - 4, 2, 2, 'sand');
  } else if (o.ghost) {
    const ic = icon(slotIcon(o.ghost));
    ui.sprite(x + Math.floor((size - 12) / 2), y + Math.floor((size - 12) / 2), ic.rows.map((row) => row.replace(/[^.]/g, 'a')), { a: 'night' });
  }
  return r;
}

/** Inventory grid. Returns { focused item index, activated index, alt index }. */
export function invGrid(ui, id, x, y, cols, rows, size, items, o = {}) {
  let hover = -1, act = -1, alt = -1;
  for (let i = 0; i < Math.min(items.length, cols * rows); i++) {
    const cx = x + (i % cols) * size, cy = y + Math.floor(i / cols) * size;
    const it = items[i];
    const r = cell(ui, `${id}:${i}`, cx, cy, size, it, { badge: o.badge?.(it) });
    if (r.focused) hover = i;
    if (r.activated) act = i;
    if (r.alt) alt = i;
  }
  return { hover, act, alt };
}

export const matLine = (h) => `SCRAP ${h.mats.scrap}  DUST ${h.mats.dust}  SHARDS ${h.mats.shards}`;
export const moneyLine = (h) => `GOLD ${h.gold}`;
export { gemIcon, icon };
