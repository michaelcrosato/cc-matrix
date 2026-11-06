// Pennywhistle, Dame Brasse, Mother Ogive, the Collection Box. Same card-and-grid layout as Gear.
import { CLASSES } from '../../data/classes.js';
import { gemId, GEM_KINDS, GEM_TIERS, gemName, LEGENDARIES, parseGem, RARITIES, SLOT_NAMES, SLOTS } from '../../data/items.js';
import { CASKET_COST, CRAFT_COST, REFORGE_COST, SALVAGE, shopStock, SOCKET_COST } from '../../sim/commands.js';
import { buyPrice, sellPrice } from '../../sim/loot.js';
import { fmtNum } from '../../view/view.js';
import { gemIcon, icon, slotIcon } from '../icons.js';
import { affixLine, cell, frame, invGrid, itemCard, matLine, Screen, tabs } from './base.js';

const SIZE = 24;
const Y0 = 30;

function money(ui, h) { ui.text(ui.w - 14, 14, `GOLD ${fmtNum(h.gold)}`, { color: 'sand', align: 'right' }); }

export class PennywhistleScreen extends Screen {
  constructor(game) { super(game, { tag: 'pennywhistle' }); this.tab = 0; }
  draw(ui) {
    const h = this.hero;
    frame(ui, '');
    this.tab = tabs(ui, 'penny', ['BUY', 'SELL', 'CASKET'], this.tab, { first: ['buy:0', 'sell:0', 'casket:head'] });
    money(ui, h);
    if (this.tab === 0) this.buy(ui, h);
    else if (this.tab === 1) this.sell(ui, h);
    else this.casket(ui, h);
  }
  buy(ui, h) {
    const stock = shopStock(this.game.world, h);
    const w = this.game.world;
    const x0 = 14, s = 40;
    let focus = null;
    stock.forEach((it, i) => {
      const x = x0 + (i % 3) * (s + 4), y = Y0 + Math.floor(i / 3) * (s + 14);
      const r = cell(ui, `buy:${i}`, x, y, s, it, { disabled: !it });
      if (it) ui.text(x + s / 2, y + s + 2, fmtNum(buyPrice(it)), { color: h.gold >= buyPrice(it) ? 'sand' : 'red', align: 'center' });
      if (r.focused) focus = it;
      if (r.activated && it) this.game.cmd({ c: 'buy', index: i });
    });
    const cx = x0 + 3 * (s + 4) + 8;
    itemCard(ui, cx, Y0, ui.w - cx - 12, focus, h, w, { empty: 'SOLD. NO REFUNDS.' });
    ui.footer([['confirm', 'BUY'], ['back', 'LEAVE']]);
  }
  sell(ui, h) {
    const w = this.game.world;
    const res = invGrid(ui, 'sell', 14, Y0, 8, 5, SIZE, h.inv);
    const it = res.hover >= 0 ? h.inv[res.hover] : null;
    if (res.act >= 0 && h.inv[res.act]) this.game.cmd({ c: 'sell', uid: h.inv[res.act].uid });
    const cx = 14 + 8 * SIZE + 8;
    const end = itemCard(ui, cx, Y0, ui.w - cx - 12, it, h, w, { empty: 'NOTHING TO SELL HERE' });
    if (it) ui.text(cx, end + 2, `PAYS ${fmtNum(sellPrice(it))}`, { color: 'sand' });
    ui.footer([['confirm', 'SELL'], ['back', 'LEAVE']]);
  }
  casket(ui, h) {
    ui.textBlock(14, Y0, `A MYSTERY CASKET. PICK A SLOT. SHARDS ${h.mats.shards}. COST 1 SHARD AND ${fmtNum(CASKET_COST.gold(h.level))} GOLD.`, ui.w - 28, { color: 'mist' });
    SLOTS.forEach((slot, i) => {
      const x = 14 + (i % 5) * 80, y = Y0 + 26 + Math.floor(i / 5) * 42;
      const r = ui.widget(`casket:${slot}`, x, y, 76, 38);
      ui.rect(x, y, 76, 38, r.focused ? 'white' : 'slate');
      ui.rect(x + 1, y + 1, 74, 36, r.focused ? 'plum' : 'ink');
      const ic = icon(slotIcon(slot));
      ui.sprite(x + 32, y + 5, ic.rows, ic.colors);
      ui.text(x + 38, y + 24, SLOT_NAMES[slot].slice(0, 12), { color: 'white', align: 'center' });
      if (r.activated) this.game.cmd({ c: 'casket', slot });
    });
    ui.footer([['confirm', 'OPEN'], ['back', 'LEAVE']]);
  }
}

export class BrasseScreen extends Screen {
  constructor(game) { super(game, { tag: 'brasse' }); this.tab = 0; this.craftSlot = null; this.pick = null; }
  back() {
    if (this.tab === 1 && this.craftSlot) { this.craftSlot = null; return; }
    if (this.tab === 2 && this.pick) { this.pick = null; return; }
    this.game.closeScreen();
  }
  draw(ui) {
    const h = this.hero;
    frame(ui, '');
    this.tab = tabs(ui, 'brasse', ['SALVAGE', 'CRAFT', 'REFORGE'], this.tab, { first: ['salv:0', 'craft:head', 'rfi:0'] });
    money(ui, h);
    if (this.tab === 0) this.salvage(ui, h);
    else if (this.tab === 1) this.craft(ui, h);
    else this.reforge(ui, h);
    ui.text(14, ui.h - 26, matLine(h), { color: 'sand' });
  }
  salvage(ui, h) {
    const w = this.game.world;
    const res = invGrid(ui, 'salv', 14, Y0, 8, 5, SIZE, h.inv);
    const it = res.hover >= 0 ? h.inv[res.hover] : null;
    if (res.act >= 0 && h.inv[res.act]) this.game.cmd({ c: 'salvage', uid: h.inv[res.act].uid });
    const input = this.game.input.menu;
    if (input.ctxA) this.game.cmd({ c: 'salvage_all', rarity: 'common' });
    if (input.ctxB) this.game.cmd({ c: 'salvage_all', rarity: 'blessed' });
    const cx = 14 + 8 * SIZE + 8;
    const end = itemCard(ui, cx, Y0, ui.w - cx - 12, it, h, w, { empty: 'BRING ME WHAT YOU DO NOT WANT' });
    if (it) ui.text(cx, end + 2, `GIVES ${Object.entries(SALVAGE[it.rarity]).map(([k, v]) => `${v} ${(v === 1 ? k.replace(/s$/, '') : k).toUpperCase()}`).join(' ')}`, { color: 'sand' });
    ui.footer([['confirm', 'SALVAGE'], ['ctxA', 'ALL WHITE'], ['ctxB', 'ALL BLUE'], ['back', 'LEAVE']]);
  }
  craft(ui, h) {
    if (!this.craftSlot) {
      ui.text(14, Y0, 'WHAT SHALL I MAKE?', { color: 'mist' });
      SLOTS.forEach((slot, i) => {
        const x = 14 + (i % 5) * 80, y = Y0 + 14 + Math.floor(i / 5) * 42;
        const r = ui.widget(`craft:${slot}`, x, y, 76, 38);
        ui.rect(x, y, 76, 38, r.focused ? 'white' : 'slate');
        ui.rect(x + 1, y + 1, 74, 36, r.focused ? 'plum' : 'ink');
        const ic = icon(slotIcon(slot));
        ui.sprite(x + 32, y + 5, ic.rows, ic.colors);
        ui.text(x + 38, y + 24, SLOT_NAMES[slot].slice(0, 12), { color: 'white', align: 'center' });
        if (r.activated) { this.craftSlot = slot; ui.preferFocus = 'craftr:blessed'; }
      });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
      return;
    }
    ui.text(14, Y0, `${SLOT_NAMES[this.craftSlot]}: HOW GOOD?`, { color: 'sand', scale: 2 });
    ['blessed', 'reliquary', 'legendary'].forEach((rarity, i) => {
      const y = Y0 + 22 + i * 28;
      const cost = CRAFT_COST[rarity];
      const can = h.gold >= cost.gold(h.level) && h.mats.scrap >= (cost.scrap ?? 0) && h.mats.dust >= (cost.dust ?? 0) && h.mats.shards >= (cost.shards ?? 0);
      const r = ui.widget(`craftr:${rarity}`, 14, y, ui.w - 28, 26, { disabled: !can });
      ui.rect(14, y, ui.w - 28, 26, r.focused ? 'white' : 'slate');
      ui.rect(15, y + 1, ui.w - 30, 24, r.focused ? 'plum' : 'ink');
      ui.text(20, y + 4, RARITIES[rarity].name, { color: RARITIES[rarity].color });
      const parts = [`GOLD ${cost.gold(h.level)}`];
      if (cost.scrap) parts.push(`SCRAP ${cost.scrap}`);
      if (cost.dust) parts.push(`DUST ${cost.dust}`);
      if (cost.shards) parts.push(`SHARDS ${cost.shards}`);
      ui.text(20, y + 14, parts.join('  '), { color: can ? 'sand' : 'red' });
      if (r.activated) { this.game.cmd({ c: 'craft', slot: this.craftSlot, rarity }); this.game.audioSys?.sfx('forge'); }
    });
    ui.footer([['confirm', 'MAKE IT'], ['back', 'BACK']]);
  }
  reforge(ui, h) {
    const w = this.game.world;
    if (!this.pick) {
      let focus = null;
      SLOTS.forEach((slot, i) => {
        const x = 14 + (i % 2) * SIZE, y = Y0 + Math.floor(i / 2) * SIZE;
        const r = cell(ui, `rf:${slot}`, x, y, SIZE, h.gear[slot] ?? null, { ghost: slot });
        if (r.focused) focus = h.gear[slot] ?? null;
        if (r.activated && h.gear[slot]?.affixes?.length) { this.pick = { slot }; ui.preferFocus = 'rfa:0'; }
      });
      const res = invGrid(ui, 'rfi', 14 + 2 * SIZE + 6, Y0, 8, 5, SIZE, h.inv);
      if (res.hover >= 0) focus = h.inv[res.hover];
      if (res.act >= 0 && h.inv[res.act]?.affixes?.length) { this.pick = { uid: h.inv[res.act].uid }; ui.preferFocus = 'rfa:0'; }
      const cx = 14 + 2 * SIZE + 6 + 8 * SIZE + 6;
      itemCard(ui, cx, Y0, ui.w - cx - 12, focus, h, w, { equipped: true, empty: 'PICK AN ITEM' });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
      return;
    }
    const it = this.pick.slot ? h.gear[this.pick.slot] : h.inv.find((x) => x?.uid === this.pick.uid);
    if (!it) { this.pick = null; return; }
    ui.textBlock(14, Y0, it.name, ui.w - 28, { color: RARITIES[it.rarity].color });
    ui.text(14, Y0 + 20, `REROLL ONE AFFIX: ${REFORGE_COST.gold(h.level)} GOLD AND ${REFORGE_COST.dust} DUST`, { color: 'mist' });
    it.affixes.forEach((a, i) => {
      if (ui.button(`rfa:${i}`, 14, Y0 + 34 + i * 18, ui.w - 28, 16, affixLine(a), { left: true, color: 'sky' })) {
        this.game.cmd({ c: 'reforge', uid: this.pick.uid, slot: this.pick.slot, index: i });
      }
    });
    ui.footer([['confirm', 'REFORGE'], ['back', 'BACK']]);
  }
}

export class OgiveScreen extends Screen {
  constructor(game) { super(game, { tag: 'ogive' }); this.tab = 0; this.pick = null; this.group = null; }
  back() {
    if (this.pick || this.group) { this.pick = null; this.group = null; return; }
    this.game.closeScreen();
  }
  draw(ui) {
    const h = this.hero;
    frame(ui, '');
    this.tab = tabs(ui, 'ogive', ['EXTRACT', 'RELIQUARY', 'SOCKET', 'MERGE'], this.tab, { first: ['ext:0', 'rq:weapon', 'ski:0', null] });
    money(ui, h);
    [this.extract, this.reliquary, this.socket, this.merge][this.tab].call(this, ui, h);
  }
  extract(ui, h) {
    const w = this.game.world;
    const res = invGrid(ui, 'ext', 14, Y0, 8, 5, SIZE, h.inv, { badge: (it) => (it?.power ? 'orange' : null) });
    const it = res.hover >= 0 ? h.inv[res.hover] : null;
    if (res.act >= 0 && h.inv[res.act]?.power) this.game.cmd({ c: 'extract', uid: h.inv[res.act].uid });
    const cx = 14 + 8 * SIZE + 8;
    itemCard(ui, cx, Y0, ui.w - cx - 12, it, h, w, { equipped: true, empty: 'BRING ME SOMETHING HOLY. THE POWER COMES OUT. THE ITEM DOES NOT.' });
    ui.textBlock(14, Y0 + 5 * SIZE + 4, 'EXTRACTING DESTROYS THE ITEM AND KEEPS ITS POWER FOR ALL YOUR HEROES.', ui.w - 28, { color: 'mist', lineH: 9 });
    ui.footer([['confirm', 'EXTRACT'], ['back', 'LEAVE']]);
  }
  reliquary(ui, h) {
    const groups = [['weapon', 'WEAPON POWER'], ['armor', 'ARMOUR POWER'], ['jewel', 'JEWELLERY POWER']];
    const owned = Object.keys(this.game.world.account.powers ?? {});
    if (!this.group) {
      groups.forEach(([g, label], i) => {
        const cur = h.reliquary[g];
        const y = Y0 + i * 40;
        const r = ui.widget(`rq:${g}`, 14, y, ui.w - 28, 38);
        ui.rect(14, y, ui.w - 28, 38, r.focused ? 'white' : 'slate');
        ui.rect(15, y + 1, ui.w - 30, 36, r.focused ? 'plum' : 'ink');
        ui.text(20, y + 3, label, { color: 'mist' });
        if (cur) { ui.text(20, y + 13, LEGENDARIES[cur].name, { color: 'orange' }); ui.text(20, y + 23, LEGENDARIES[cur].power.slice(0, Math.floor((ui.w - 40) / 6)), { color: 'white' }); }
        else ui.text(20, y + 13, 'EMPTY', { color: 'slate' });
        if (r.activated) { this.group = g; }
      });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
      return;
    }
    const list = owned.filter((p) => LEGENDARIES[p].group === this.group);
    if (!list.length) ui.textBlock(14, Y0, 'NOTHING EXTRACTED OF THIS KIND. BRING ME MORE.', ui.w - 28, { color: 'mist' });
    list.slice(0, 7).forEach((p, i) => {
      if (ui.button(`rqp:${p}`, 14, Y0 + i * 15, ui.w - 28, 14, LEGENDARIES[p].name, { left: true, color: 'orange' })) { this.game.cmd({ c: 'reliquary', group: this.group, power: p }); this.group = null; }
    });
    if (this.game.input.menu.ctxA) { this.game.cmd({ c: 'reliquary', group: this.group, power: null }); this.group = null; }
    ui.footer([['confirm', 'KEEP'], ['ctxA', 'EMPTY IT'], ['back', 'BACK']]);
  }
  socket(ui, h) {
    const w = this.game.world;
    if (!this.pick) {
      let focus = null;
      SLOTS.forEach((slot, i) => {
        const x = 14 + (i % 2) * SIZE, y = Y0 + Math.floor(i / 2) * SIZE;
        const it = h.gear[slot] ?? null;
        const r = cell(ui, `sk:${slot}`, x, y, SIZE, it, { ghost: slot, badge: it?.gems?.length ? 'sand' : null });
        if (r.focused) focus = it;
        if (r.activated && it?.gems?.length) { this.pick = { slot }; }
      });
      const res = invGrid(ui, 'ski', 14 + 2 * SIZE + 6, Y0, 8, 5, SIZE, h.inv, { badge: (it) => (it?.gems?.length ? 'sand' : null) });
      if (res.hover >= 0) focus = h.inv[res.hover];
      if (res.act >= 0 && h.inv[res.act]?.gems?.length) this.pick = { uid: h.inv[res.act].uid };
      const cx = 14 + 2 * SIZE + 6 + 8 * SIZE + 6;
      itemCard(ui, cx, Y0, ui.w - cx - 12, focus, h, w, { equipped: true, empty: 'PICK SOMETHING WITH A SOCKET' });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
      return;
    }
    const it = this.pick.slot ? h.gear[this.pick.slot] : h.inv.find((x) => x?.uid === this.pick.uid);
    if (!it) { this.pick = null; return; }
    ui.textBlock(14, Y0, it.name, ui.w - 28, { color: RARITIES[it.rarity].color });
    ui.text(14, Y0 + 20, `SET A GEM: ${SOCKET_COST(it.ilvl)} GOLD`, { color: 'mist' });
    this.gemGrid(ui, h, 'sg', Y0 + 32, (gem) => { this.game.cmd({ c: 'socket', uid: this.pick.uid, slot: this.pick.slot, gem }); this.game.audioSys?.sfx('socket'); this.pick = null; });
    if (this.game.input.menu.ctxA) { this.game.cmd({ c: 'unsocket', uid: this.pick.uid, slot: this.pick.slot }); }
    ui.footer([['confirm', 'SET'], ['ctxA', 'TAKE OUT'], ['back', 'BACK']]);
  }
  gemGrid(ui, h, id, y, onPick, needed = 1) {
    Object.keys(GEM_KINDS).forEach((kind, k) => {
      GEM_TIERS.forEach((tn, t) => {
        const g = gemId(kind, t);
        const n = h.gems[g] ?? 0;
        const cw = Math.floor((ui.w - 28 - 4) / 3);
        const x = 14 + k * (cw + 2), yy = y + t * 28;
        const r = ui.widget(`${id}:${g}`, x, yy, cw, 26, { disabled: n < needed });
        ui.rect(x, yy, cw, 26, r.focused ? 'white' : n ? 'slate' : 'night');
        ui.rect(x + 1, yy + 1, cw - 2, 24, r.focused ? 'plum' : 'ink');
        const ic = icon(gemIcon(g));
        ui.sprite(x + 3, yy + 7, ic.rows, ic.colors);
        ui.text(x + 18, yy + 4, tn, { color: n ? 'white' : 'slate' });
        ui.text(x + 18, yy + 14, `${GEM_KINDS[kind].name.split(' ')[0]} ${n}`, { color: n ? GEM_KINDS[kind].color : 'slate' });
        if (r.activated) onPick(g);
      });
    });
  }
  merge(ui, h) {
    ui.text(14, Y0, 'THREE OF A KIND MAKE ONE BETTER.', { color: 'mist' });
    this.gemGrid(ui, h, 'mg', Y0 + 14, (gem) => { if (parseGem(gem).tier < 2) this.game.cmd({ c: 'merge', gem }); }, 3);
    ui.footer([['confirm', 'MERGE'], ['back', 'LEAVE']]);
  }
}

export class StashScreen extends Screen {
  constructor(game) { super(game, { tag: 'stash' }); this.tab = 0; }
  draw(ui) {
    const h = this.hero;
    frame(ui, '');
    this.tab = tabs(ui, 'stash', ['BOX I', 'BOX II', 'BOX III'], this.tab, { first: ['pack:0', 'pack:0', 'pack:0'] });
    money(ui, h);
    const size = 20;
    const w = this.game.world;
    ui.text(14, 28, 'YOUR PACK', { color: 'mist' });
    const a = invGrid(ui, 'pack', 14, 38, 8, 5, size, h.inv);
    if (a.act >= 0 && h.inv[a.act]) this.game.cmd({ c: 'stash_put', uid: h.inv[a.act].uid, tab: this.tab });
    const sx = 14 + 8 * size + 8;
    const box = w.account.stash[this.tab];
    ui.text(sx, 28, 'THE COLLECTION BOX', { color: 'mist' });
    const b = invGrid(ui, 'box', sx, 38, 6, 5, size, box);
    if (b.act >= 0 && box[b.act]) this.game.cmd({ c: 'stash_take', tab: this.tab, index: b.act });
    const it = a.hover >= 0 ? h.inv[a.hover] : b.hover >= 0 ? box[b.hover] : null;
    const cx = sx + 6 * size + 6;
    itemCard(ui, cx, 30, ui.w - cx - 12, it, h, w, { equipped: true, empty: 'SHARED BY ALL YOUR HEROES' });
    ui.footer([['confirm', 'MOVE'], ['back', 'LEAVE']]);
  }
}

export { CLASSES, gemName };
