// Mr. Fathom. Tabs BUY, SELL, TUNE. Six rows, one big item panel, his helmet and a line of text.
import { ITEMS } from '../data/items.js';
import { WEAPONS, TUNE_NAME, TUNE_STATS, WEAPON_ORDER } from '../data/weapons.js';
import { CASE_SIZES, SHOP_BARKS, STOCK } from '../data/shop.js';
import { addItem, ammoOf, removeItem, sellPrice, sellTreasure, treasureValue, ownedWeapons } from '../core/run.js';
import { iconFor } from '../models/icons.js';
import { VoiceLine } from '../audio/voice.js';
export function openShop(A, f) { A.openMenu(new ShopScreen(A, f)); }
export function buy(run, id) {
  if (CASE_SIZES[id]) { const c = CASE_SIZES[id]; if (run.money < c.price || run.grid.w >= c.w) return 'poor'; run.money -= c.price; run.grid = { w: c.w, h: c.h }; return 'ok'; }
  const d = ITEMS[id]; const price = d.kind === 'weapon' ? WEAPONS[d.weapon].price : d.price;
  if (run.money < price) return 'poor';
  const left = addItem(run, id, d.gives ?? 1); if (left > 0) return 'full';
  run.money -= price; return 'ok';
}
export function tunePrice(id, stat, lvl) { const base = WEAPONS[id].tune; return base[Math.min(3, lvl)] * (stat === 'power' ? 1.2 : 1) | 0; }
export function tune(run, id, stat) { const st = run.weapons[id]; st.tune ??= {}; const l = st.tune[stat] || 0; if (l >= 4) return 'max'; const p = tunePrice(id, stat, l); if (run.money < p) return 'poor'; run.money -= p; st.tune[stat] = l + 1; return 'ok'; }
export function grantRewards(run) { const out = []; const n = run.tannoys.length; if (n >= 5 && !run.rewards.includes(5)) { run.rewards.push(5); run.money += 1000; out.push('5 LOUDSPEAKERS: 1000 D'); } if (n >= 10 && !run.rewards.includes(10)) { run.rewards.push(10); const next = run.grid.w < 12 ? CASE_SIZES.case1 : CASE_SIZES.case2; run.grid = { w: next.w, h: next.h }; out.push('10 LOUDSPEAKERS: A BIGGER CASE'); } if (n >= 15 && !run.rewards.includes(15)) { run.rewards.push(15); run.valuables.push('blackpearl'); out.push('15 LOUDSPEAKERS: A BLACK PEARL'); } return out; }
export class ShopScreen {
  constructor(A, f) { this.A = A; this.f = f; this.s = { tab: 0, focus: 0 }; this.w = 0; this.line(A.rng.pick(SHOP_BARKS.greet)); A.app.mix.play('shop', 0.2); A.ctx.audio.play('bubble'); this.rewards = grantRewards(A.run); if (this.rewards.length) this.line(`A GIFT FOR THE COLLECTOR. ${this.rewards[0]}`); }
  line(t) { this.bark = { text: t, n: 0, voice: new VoiceLine(this.A.ctx.audio, 'FATHOM', t, () => this.A.app.settings.voice) }; }
  update(ui) {
    const A = this.A, run = A.run; ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.tabs(this.s, ['BUY', 'SELL', 'TUNE'], 10);
    const m = `${run.money} D`, mw = ui.measure(m, 2); ui.text(ui.W - mw.width - 8, 26, m, { scale: 2, color: 'sand' });
    // Helmet and bark
    const b = this.bark; b.n = Math.min(b.text.length, b.n + 0.5); b.voice.tick(Math.floor(b.n)); const h = iconFor('helmet'); const hy = ui.H - 68; ui.hud.sprite(10, hy, h.rows, h.colors, { scale: 1 }); ui.panel(46, hy, ui.W - 56, 34, { bg: 'night', border: 'teal' }); ui.para(52, hy + 5, b.text.slice(0, Math.floor(b.n)), ui.W - 70, { color: 'lime' });
    const t = this.s.tab; if (t === 0) this.buyTab(ui); else if (t === 1) this.sellTab(ui); else this.tuneTab(ui);
    if (ui.back) { A.ctx.audio.play('bubble'); A.say('FATHOM', A.rng.pick(SHOP_BARKS.leave), 1.5); A.app.mix.play(A.def.music ?? null, 0.3); A.closeMenu(); }
  }
  panel(ui, id, x, y, extra) {
    const ic = iconFor(id); const big = ic.h <= 28 && ic.w <= 56 ? 2 : 1; ui.hud.sprite(x, y, ic.rows, ic.colors, { scale: big }); const name = CASE_SIZES[id]?.name ?? ITEMS[id].name; const dy = y + ic.h * big + 6; ui.text(x, dy, name, { color: 'white' });
    const about = CASE_SIZES[id] ? [`GRID ${CASE_SIZES[id].w} BY ${CASE_SIZES[id].h}.`] : ITEMS[id].kind === 'weapon' ? WEAPONS[ITEMS[id].weapon].about : ITEMS[id].about ?? []; let yy = dy + 12; for (const l of about) yy += ui.para(x, yy, l, ui.W - x - 10, { color: 'mist' }) * 10; if (extra) ui.text(x, yy + 2, extra, { color: 'sand' });
  }
  buyTab(ui) {
    const A = this.A, run = A.run, list = (STOCK[Math.min(3, run.chapter)] ?? STOCK[1]).filter((id) => { if (CASE_SIZES[id]) return run.grid.w < CASE_SIZES[id].w; const d = ITEMS[id]; if (d.kind === 'weapon') return !run.items.some((i) => i.id === id); if (d.kind === 'key') return !run.keys.includes(id); return true; });
    const price = (id) => CASE_SIZES[id]?.price ?? (ITEMS[id].kind === 'weapon' ? WEAPONS[ITEMS[id].weapon].price : ITEMS[id].price);
    const items = list.map((id) => ({ label: CASE_SIZES[id]?.name ?? ITEMS[id].name, value: `${price(id)}`, valueColor: run.money >= price(id) ? 'sand' : 'red' })); const i = ui.list(this.s, items, { x: 10, y: 46, w: 214, rowH: 17, max: 6 });
    const id = list[this.s.focus]; if (id) this.panel(ui, id, 238, 46);
    if (i >= 0 && id) { const r = buy(run, id); if (r === 'ok') { A.ctx.audio.play('coins'); this.line(A.rng.pick(SHOP_BARKS.buy)); } else if (r === 'full') { A.ctx.audio.play('uideny'); this.line('NO ROOM IN THAT CASE, FRIEND. ARRANGE IT OR SELL SOMETHING.'); } else { A.ctx.audio.play('uideny'); this.line(A.rng.pick(SHOP_BARKS.poor)); } }
    ui.prompts([['confirm', 'BUY'], ['back', 'LEAVE']]);
  }
  sellTab(ui) {
    const A = this.A, run = A.run; const owned = ownedWeapons(run); const items = [...run.valuables.map((id, n) => ({ id, tr: true, n })), ...run.items.filter((it) => !(ITEMS[it.id].kind === 'weapon' && owned.length <= 1)).map((it) => ({ it, id: it.id }))]; const rows = items.map((r) => ({ label: ITEMS[r.id].name, value: `${r.tr ? treasureValue(run, r.id) : sellPrice(run, r.it)}` }));
    if (!rows.length) { ui.text(16, 60, 'NOTHING TO SELL', { color: 'slate' }); ui.prompts([['back', 'LEAVE']]); return; }
    const i = ui.list(this.s, rows, { x: 10, y: 46, w: 214, rowH: 17, max: 6 }); const r = items[this.s.focus]; if (r) this.panel(ui, r.id, 238, 46, r.tr ? 'FULL PRICE: TREASURE' : 'HALF PRICE');
    if (i >= 0 && r) { if (r.tr) sellTreasure(run, r.id); else { run.money += sellPrice(run, r.it); if (run.weapon === r.id) { removeItem(run, r.it); const w = ownedWeapons(run)[0]; if (w) A.player.setWeapon(w); } else removeItem(run, r.it); } A.ctx.audio.play('coins'); this.line(r.tr ? 'A FINE PIECE. I KNOW A WIDOW WHO COLLECTS.' : A.rng.pick(SHOP_BARKS.sell)); }
    ui.prompts([['confirm', 'SELL'], ['back', 'LEAVE']]);
  }
  tuneTab(ui) {
    const A = this.A, run = A.run, list = ownedWeapons(run); if (!list.length) return; this.w = Math.max(0, Math.min(list.length - 1, this.w)); if (ui.nav.left) { this.w = (this.w - 1 + list.length) % list.length; ui.sound('uimove'); } if (ui.nav.right) { this.w = (this.w + 1) % list.length; ui.sound('uimove'); }
    const id = list[this.w], st = run.weapons[id]; st.tune ??= {}; const rows = TUNE_STATS.map((s) => { const l = st.tune[s] || 0; return { label: TUNE_NAME[s], value: l >= 4 ? 'MAX' : `${tunePrice(id, s, l)}` }; });
    ui.center(30, `< ${WEAPONS[id].name} >`, { color: 'white' }); const i = ui.list(this.s, rows, { x: 10, y: 54, w: 214, rowH: 20 });
    TUNE_STATS.forEach((s, k) => { const l = st.tune[s] || 0; for (let n = 0; n < 4; n++) ui.rect(120 + n * 10, 56 + k * 20, 8, 7, n < l ? 'sand' : 'night'); });
    const ic = iconFor(id); ui.hud.sprite(238, 46, ic.rows, ic.colors); ui.para(238, 84, TUNE_STATS.every((s) => (st.tune[s] || 0) >= 4) ? `PERK ON: ${WEAPONS[id].perk}` : `FILL ALL FOUR: ${WEAPONS[id].perk}`, ui.W - 248, { color: 'sand' });
    if (i >= 0) { const r = tune(run, id, TUNE_STATS[i]); if (r === 'ok') { A.ctx.audio.play('reload3'); this.line(A.rng.pick(SHOP_BARKS.tune)); } else { A.ctx.audio.play('uideny'); this.line(r === 'max' ? 'SHE WILL TAKE NO MORE, FRIEND.' : A.rng.pick(SHOP_BARKS.poor)); } }
    ui.prompts([['confirm', 'TUNE'], ['left', 'WEAPON'], ['back', 'LEAVE']]);
  }
}
