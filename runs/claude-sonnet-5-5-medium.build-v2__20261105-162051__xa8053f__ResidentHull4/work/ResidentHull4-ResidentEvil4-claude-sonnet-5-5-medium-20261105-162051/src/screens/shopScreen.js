// Mr. Fathom: BUY / SELL / TUNE. At most 6 rows at a time, one big item panel, his portrait, a line of text.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { ITEMS, VALUABLES, KEY_ITEMS } from '../data/items.js';
import { WEAPONS, WEAPON_ORDER, TUNE_NAMES, TUNE_PRICES, PERKS } from '../data/weapons.js';
import { CASE_SIZES } from '../core/run.js';
import { drawIcon, drawValuable } from './icons.js';
import { blip } from '../audio/voice.js';
import { footprint } from '../game/caseModel.js';

const TABS = ['BUY', 'SELL', 'TUNE'];
export const GREET = ['BACK ALREADY? STILL BREATHING? BAD FOR THE ISLAND, GOOD FOR BUSINESS.', 'MIND THE DRIP!', 'STEP ABOARD, STEP ABOARD.'];
const SOLD = ['SOLD, AND NO REFUNDS FROM THE DEEP.', 'A FINE CHOICE FOR A SHORT LIFE.'];
const SELLS = ['HALF PRICE AND MY CONDOLENCES.', "I'LL FIND SOMEONE IT FITS. SOMEONE WITH ARMS."];
const TUNED = ["SHE'LL KICK LIKE A BOSUN NOW.", 'TUNED AND TARRED.'];
const BROKE = ['CREDIT? FRIEND, NOBODY HERE LIVES THAT LONG.'];
const LEAVE = ['COME BACK ALIVE. I\'VE STOCK TO MOVE.', 'MIND THE DRIP!'];
const PORTRAIT = [
  '....bbbbbbbb....', '...bssssssssb...', '..bsssssssssb...', '.bsssssssssssb..', '.bssbbbbbbbssb..', '.bsbggggggggsb..', '.bsbgGGGGGGgsb..', '.bsbgGWGGGGgsb..',
  '.bsbgGGGGGGgsb..', '.bssbbbbbbbssb..', '.bsssssssssssb..', '..bbbssssssbbb..', '...ooooooooooo..', '..ooooooooooooo.', '.oooooooooooooo.', '.ooooooooooooooo',
];
const PCOL = { b: 'ink', s: 'sand', g: 'teal', G: 'green', W: 'white', o: 'orange' };

export class ShopScreen {
  constructor(stock) { this.stock = stock; this.tab = 0; this.st = { i: 0 }; this.line = GREET[0]; this.typed = 0; this.who = 'FATHOM'; this.say(GREET[Math.floor(Math.random() * 0 + 0)]); this.sub = { i: 0 }; this.confirmSell = null; this.leaving = false; }
  say(t, host) { this.line = t; this.typed = 0; }
  enter() { app.mix?.play('shop'); }
  leave() { }
  buyRows(run) {
    const rows = [];
    for (const w of WEAPON_ORDER.slice(1)) if (this.stock.weapons?.includes(w) && !run.owns(w)) rows.push({ kind: 'weapon', id: w, price: WEAPONS[w].price, label: WEAPONS[w].name });
    for (const id of this.stock.items || []) { if (ITEMS[id]) rows.push({ kind: 'item', id, price: ITEMS[id].price, label: ITEMS[id].name }); }
    if (this.stock.caseUpgrade && run.caseLevel < 2) rows.push({ kind: 'case', id: 'case' + (run.caseLevel + 1), price: run.caseLevel === 0 ? 1500 : 4000, label: `CASE UPGRADE ${CASE_SIZES[run.caseLevel + 1][0]}X${CASE_SIZES[run.caseLevel + 1][1]}`, text: 'MORE ROOM FOR MORE REGRET.' });
    if (this.stock.chart && !run.chart) rows.push({ kind: 'chart', id: 'chart', price: 300, label: 'TANNOY CHART', text: 'THE MAP TAB SHOWS EVERY LOUDSPEAKER.' });
    return rows;
  }
  sellRows(run) {
    const rows = [];
    for (let i = 0; i < run.valuables.length; i++) { const v = run.valuables[i]; rows.push({ kind: 'valuable', idx: i, price: run.valuableValue(v), label: VALUABLES[v.id].name }); }
    for (const e of run.case.items) {
      if (e.kind === 'weapon') { if (e.id === 'pistol') continue; rows.push({ kind: 'weapon', uid: e.uid, id: e.id, price: Math.floor(WEAPONS[e.id].price / 2), label: WEAPONS[e.id].name }); }
      else { const d = ITEMS[e.id]; rows.push({ kind: 'item', uid: e.uid, id: e.id, price: Math.floor((d.sell ?? d.price / 2) * (d.stack ? (e.count / d.stack) : 1)), label: d.name + (d.stack ? ` X${e.count}` : '') }); }
    }
    return rows;
  }
  tuneRows(run) { return run.weapons().map((w) => ({ id: w, label: WEAPONS[w].name })); }
  frame(host) {
    const run = app.run, nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    const clicked = ui.tabs(12, 6, TABS, this.tab); if (clicked >= 0) { this.tab = clicked; this.st = { i: 0 }; this.sub = { i: 0 }; }
    if (nav.prev) { this.tab = (this.tab + 2) % 3; this.st = { i: 0 }; } if (nav.next) { this.tab = (this.tab + 1) % 3; this.st = { i: 0 }; }
    ui.text(W - 8, 8, `${run.doubloons} DBL`, { align: 'right', color: 'sand' });
    // portrait and line
    ui.rect(12, H - 120, 66, 66, 'night'); PORTRAIT.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') ui.rect(16 + x * 4, H - 116 + y * 4, 4, 4, PCOL[c]); }));
    const prevT = Math.floor(this.typed); this.typed = Math.min(this.line.length, this.typed + 0.5);
    for (let i = prevT; i < Math.floor(this.typed); i++) blip(ctx.audio, 'FATHOM', this.line, i, 0);
    ui.panel(86, H - 74, W - 98, 56, { fill: 'night' }); ui.text(92, H - 69, 'MR. FATHOM', { color: 'green' });
    ui.paragraph(92, H - 56, W - 112, this.line.slice(0, Math.floor(this.typed)), { color: 'white' });
    let rows, info = null;
    if (this.tab === 0) rows = this.buyRows(run); else if (this.tab === 1) rows = this.sellRows(run); else rows = this.tuneRows(run);
    if (!rows.length) { ui.text(20, 40, this.tab === 0 ? 'SOLD OUT. COME BACK LATER.' : this.tab === 1 ? 'NOTHING TO SELL.' : 'NOTHING TO TUNE.', { color: 'mist' }); }
    else {
      const viewN = 6; this.st.i = Math.max(0, Math.min(rows.length - 1, this.st.i)); const top = Math.max(0, Math.min(rows.length - viewN, this.st.i - 3));
      const shown = rows.slice(top, top + viewN);
      const lst = { i: this.st.i - top };
      const r = ui.list(12, 26, Math.min(190, ui.W - 170), shown.map((row) => ({ label: row.label, value: this.tab === 2 ? '' : (row.price + ''), disabled: false })), lst, {});
      this.st.i = lst.i + top;
      const sel = rows[this.st.i];
      this.itemPanel(sel, run);
      if (this.tab === 2 && sel) this.tuneControls(sel, run, ctx, nav);
      if (r.ok >= 0 && this.tab !== 2) { const row = rows[top + r.ok]; this.activate(row, run, ctx); }
    }
    if (nav.back) { ui.nav.back = false; app.pop(); this.leaving = true; ctx.audio.play('uiBack'); host.onShopClosed?.(); }
    ui.prompts([['confirm', this.tab === 0 ? 'BUY' : this.tab === 1 ? 'SELL' : 'TUNE'], ['prev', 'TAB'], ['back', 'LEAVE']]);
  }
  itemPanel(sel, run) {
    const x = Math.min(214, ui.W - 150), y = 26, w = ui.W - x - 10;
    ui.panel(x, y, w, 100, { fill: 'night' });
    if (!sel) return;
    if (sel.kind === 'valuable') drawValuable(ui, run.valuables[sel.idx].id, x + 8, y + 8, 50); else if (this.tab === 2) drawIcon(ui, 'weapon', sel.id, x + 8, y + 8, 50, 40, 0); else if (sel.kind === 'weapon' || sel.kind === 'item') drawIcon(ui, sel.kind, sel.id, x + 8, y + 8, 50, 40, 0); else ui.rect(x + 14, y + 14, 36, 30, 'sand');
    ui.text(x + 8, y + 52, sel.label, { color: 'sand' });
    const text = sel.text || (sel.kind === 'weapon' ? WEAPONS[sel.id].text : sel.kind === 'item' ? ITEMS[sel.id].text : sel.kind === 'valuable' ? VALUABLES[run.valuables[sel.idx].id].text : '');
    ui.paragraph(x + 8, y + 66, w - 16, text, { color: 'mist' });
  }
  tuneControls(sel, run, ctx, nav) {
    const x = Math.min(214, ui.W - 150), y = 130; const t = run.tune[sel.id] ||= [0, 0, 0, 0];
    ui.panel(x, y, ui.W - x - 10, 70, { fill: 'night' });
    for (let i = 0; i < 4; i++) {
      const yy = y + 5 + i * 15; const on = this.sub.i === i;
      if (on) ui.rect(x + 2, yy - 2, ui.W - x - 14, 14, 'navy');
      ui.text(x + 8, yy, TUNE_NAMES[i], { color: on ? 'white' : 'mist' });
      for (let k = 0; k < 4; k++) ui.rect(x + 72 + k * 12, yy, 10, 8, k < t[i] ? 'orange' : 'slate');
      ui.text(ui.W - 18, yy, t[i] >= 4 ? 'MAX' : String(TUNE_PRICES[t[i]]), { align: 'right', color: t[i] >= 4 ? 'lime' : 'sand' });
    }
    if (nav.up) this.sub.i = (this.sub.i + 3) % 4; if (nav.down) this.sub.i = (this.sub.i + 1) % 4;
    if (nav.ok || nav.right) {
      const i = this.sub.i; if (t[i] >= 4) { ctx.audio.play('uiNo'); }
      else { const price = TUNE_PRICES[t[i]]; if (run.doubloons < price) { this.say(BROKE[0]); ctx.audio.play('uiNo'); } else { run.doubloons -= price; t[i]++; ctx.audio.play('buy'); this.say(TUNED[t[i] % 2]); if (t.every((v) => v >= 4)) this.say('ALL FOUR! PERK UNLOCKED: ' + PERKS[sel.id]); } }
    }
    if (nav.left) { /* tuning is one way: it is tar, not paint */ }
  }
  activate(row, run, ctx) {
    if (this.tab === 0) {
      if (run.doubloons < row.price) { this.say(BROKE[0]); ctx.audio.play('uiNo'); return; }
      if (row.kind === 'weapon') { if (!run.addWeapon(row.id)) { this.say('YOUR CASE IS FULL. I DO NOT DO LAYBY.'); ctx.audio.play('uiNo'); return; } }
      else if (row.kind === 'item') { const r = run.addItem(row.id, ITEMS[row.id].kind === 'ammo' ? Math.ceil(ITEMS[row.id].stack / 2) : 1); if (!r.ok && r.left >= (ITEMS[row.id].kind === 'ammo' ? Math.ceil(ITEMS[row.id].stack / 2) : 1)) { this.say('YOUR CASE IS FULL. I DO NOT DO LAYBY.'); ctx.audio.play('uiNo'); return; } }
      else if (row.kind === 'case') run.upgradeCase();
      else if (row.kind === 'chart') run.chart = true;
      run.doubloons -= row.price; ctx.audio.play('buy'); this.say(SOLD[Math.floor(Math.random() * 0) + (row.price % 2)]);
    } else {
      if (row.kind === 'valuable') run.valuables.splice(row.idx, 1);
      else if (row.kind === 'weapon') { if (run.equipped === row.id) { this.say('YOU CANNOT SELL WHAT IS IN YOUR HAND.'); return; } run.case.remove(row.uid); }
      else run.case.remove(row.uid);
      run.doubloons += row.price; ctx.audio.play('coin'); this.say(SELLS[row.price % 2]);
      this.st.i = Math.max(0, this.st.i - 1);
    }
  }
}
export function shopStock(chapterIdx, appearance) {
  const A = [
    { weapons: ['scatter'], items: ['ammo_pistol', 'ammo_shells', 'samphire', 'flare'], caseUpgrade: false, chart: true },
    { weapons: ['scatter', 'rifle'], items: ['ammo_pistol', 'ammo_shells', 'ammo_rifle', 'samphire', 'dulse', 'seaholly', 'flare', 'bottle'], caseUpgrade: true, chart: true },
    { weapons: ['scatter', 'rifle', 'harpoon'], items: ['ammo_pistol', 'ammo_shells', 'ammo_rifle', 'ammo_bolts', 'samphire', 'dulse', 'seaholly', 'tin', 'flare', 'bottle', 'depth'], caseUpgrade: true, chart: true },
  ];
  return A[Math.min(chapterIdx, 2)];
}
export { footprint, KEY_ITEMS };
