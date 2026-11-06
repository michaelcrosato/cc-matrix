// Every full screen in play: one job per screen, big icons, short lists. Same screens for pad and for mouse.
import { CLASSES, SKILLS, toneUnlockLevel } from '../data/classes.js';
import { AFFIXES, CASKET_COST, CRAFT_COST, DEVOTION_TRACKS, devotionCost, fmtAffix, GEMS, GEM_TIERS, LEGENDARY, RARITIES, REFORGE_COST, SETS, SLOTS, SLOT_NAMES, STASH_SIZE } from '../data/items.js';
import { DIFFICULTIES, LEVEL_CAP, SLOT_LEVELS, TUNING_DEFS, VOW_LEVELS } from '../data/tuning.js';
import { ZONES, LYCHGATE_ORDER } from '../data/zones.js';
import { BESTIARY, MONSTERS, SHRINES } from '../data/monsters.js';
import { HOW_TO_PLAY, SPEAKERS } from '../data/dialog.js';
import { LORE, LORE_IDS } from '../data/lore.js';
import { damageRating, recalc, recoveryRating, toughnessRating } from '../sim/stats.js';
import { canWear, itemValue } from '../sim/loot.js';
import { vendorStock, reliquaryKind } from '../sim/commands.js';
import { devotionPointsFree } from '../sim/hero.js';
import { footer, prompt, promptLine } from './glyphs.js';
import { drawIcon, fmt } from './hud.js';
import { recolor } from './icons.js';
import { drawDevMode } from './devmode.js';
import { ABOUT_PAGES } from './aboutpages.js';

export const CELL = 24;
const slotIcon = (it) => `slot_${it.slot}`;
export function itemCell(ui, id, x, y, it, o = {}) {
  const st = ui.widget(id, x, y, CELL - 1, CELL - 1, o);
  const col = it ? RARITIES[it.rarity].color : 'night';
  ui.frame(x, y, CELL - 1, CELL - 1, st.focused ? 'white' : col === 'white' ? 'slate' : col, st.focused ? 'plum' : 'ink');
  if (it) { const s = recolor(slotIcon(it), col); ui.sprite(x + 5, y + 5, s.rows, s.colors); if (it.gem) ui.rect(x + CELL - 6, y + 2, 3, 3, GEMS[it.gem.k].color); if (it.equippedMark) ui.rect(x + 2, y + 2, 3, 3, 'lime'); }
  else if (o.placeholder) { const s = recolor(o.placeholder, 'slate'); ui.sprite(x + 5, y + 5, s.rows, s.colors); }
  return st;
}
function compareOf(h, it, world) {
  if (!it || !it.slot) return null;
  const cur = h.gear[it.slot]; if (cur?.uid === it.uid) return null;
  const a = { ...h, gear: { ...h.gear, [it.slot]: it }, powers: null, hp: 1e9, res: 1e9 }; recalc(a, world.tuning, world.devotion?.spent);
  const d0 = damageRating(h); const t0 = toughnessRating(h);
  return { dmg: Math.round((damageRating(a) / d0 - 1) * 100), tough: Math.round((toughnessRating(a) / t0 - 1) * 100) };
}
export function itemCard(ui, x, y, w, h, it, hero, world, o = {}) {
  ui.frame(x, y, w, h, 'slate', 'ink');
  if (!it) { ui.text(x + 6, y + 6, o.empty ?? 'NOTHING HERE.', { color: 'mist' }); return; }
  const r = RARITIES[it.rarity];
  const nameLines = ui.wrap(it.name, w - 12).slice(0, 1);
  ui.text(x + 6, y + 4, nameLines[0], { color: r.color });
  ui.text(x + 6, y + 13, `${r.name} ${SLOT_NAMES[it.slot]}  ILVL ${it.ilvl}`, { color: 'mist' });
  const col2 = x + Math.min(w * 0.42, 170);
  const cmp = compareOf(hero, it, world);
  if (cmp) { const f = (v) => `${v >= 0 ? '+' : ''}${v}%`; ui.text(x + 6, y + 23, `DAMAGE ${f(cmp.dmg)}`, { color: cmp.dmg >= 0 ? 'lime' : 'red' }); ui.text(x + 6, y + 32, `TOUGHNESS ${f(cmp.tough)}`, { color: cmp.tough >= 0 ? 'lime' : 'red' }); }
  else if (it.dps) ui.text(x + 6, y + 23, `${it.dps} WEAPON DAMAGE`, { color: 'white' });
  else if (it.armour) ui.text(x + 6, y + 23, `${it.armour} ARMOUR`, { color: 'white' });
  if (it.price) ui.text(x + 6, y + 41, `PRICE ${fmt(it.price)} GOLD`, { color: hero.gold >= it.price ? 'sand' : 'red' });
  let ly = y + 23; const lw = w - (col2 - x) - 6; let shown = 0;
  for (const a of it.affixes) { if (shown >= 4) break; const label = a.k === 'socket' && it.gem ? `${GEM_TIERS[it.gem.tier]} ${GEMS[it.gem.k].name}` : fmtAffix(a); ui.text(col2, ly, label.slice(0, Math.floor(lw / 6)), { color: o.selectAffix === shown ? 'sand' : 'sky' }); ly += 9; shown++; }
  const extra = it.power ? LEGENDARY[it.power].power : it.set ? `${SETS[it.set].name}: ${SETS[it.set].two}` : it.flavour;
  if (extra && y + h - 20 >= y + 41) {
    const lines = ui.wrap(extra, w - 12).slice(0, 2);
    lines.forEach((l, i) => ui.text(x + 6, y + h - 10 - (lines.length - 1 - i) * 9, l, { color: it.power ? 'orange' : it.set ? 'lime' : 'mist' }));
  }
}
const header = (ui, title, o = {}) => { ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.frame(0, 0, ui.W, 22, o.color ?? 'slate', 'night'); ui.text(12, 7, title, { color: 'sand' }); };
function tabs(ui, st, names, m) {
  if (m.tabL) { st.tab = (st.tab + names.length - 1) % names.length; ui.ctx.audio.play('ui_tab'); ui.focus = null; st.step = 0; st.sel = null; }
  if (m.tabR) { st.tab = (st.tab + 1) % names.length; ui.ctx.audio.play('ui_tab'); ui.focus = null; st.step = 0; st.sel = null; }
  let x = ui.W - 12; const dev = ui.router.lastDevice === 'pad' ? 'pad' : 'kbm';
  for (let i = names.length - 1; i >= 0; i--) { const n = names[i]; const w = ui.measure(n) + 8; x -= w; const hit = ui.router.click && ui.px >= x && ui.px < x + w && ui.py < 22; if (hit) { st.tab = i; ui.focus = null; st.step = 0; st.sel = null; ui.ctx.audio.play('ui_tab'); } if (i === st.tab) ui.rect(x, 3, w, 16, 'plum'); ui.text(x + 4, 7, n, { color: i === st.tab ? 'white' : 'mist' }); x -= 3; }
  prompt(ui, x - 12, 5, 'tabR', dev); prompt(ui, x - 12 - ui.measure('Q') - 10, 5, 'tabL', dev);
}
// Scrolling list: returns the index activated. Focus scrolls with it.
export function scrollList(ui, st, key, items, x, y, w, rowH, rows, render, o = {}) {
  st[key] ??= 0; const top0 = st[key]; const n = items.length;
  const fId = ui.focus; const m = ui.m; const idOf = (i) => `${key}:${i}`;
  const idx = fId?.startsWith(`${key}:`) ? Number(fId.split(':')[1]) : -1;
  if (idx >= 0) { if (idx >= top0 + rows) st[key] = idx - rows + 1; if (idx < top0) st[key] = idx; }
  if (ui.router.wheel) { st[key] = Math.max(0, Math.min(Math.max(0, n - rows), st[key] + Math.sign(ui.router.wheel))); }
  const top = st[key]; let act = -1;
  for (let i = -1; i <= rows; i++) {
    const k = top + i; if (k < 0 || k >= n) continue;
    if (i === -1 || i === rows) { ui.widgets.push({ id: idOf(k), x, y: y + i * rowH, w, h: rowH, noFocus: false }); continue; }
    if (render(items[k], k, x, y + i * rowH, idOf(k))) act = k;
  }
  if (n > rows) { const bh = rowH * rows; const th = Math.max(8, (bh * rows) / n); ui.rect(x + w + 2, y, 3, bh, 'night'); ui.rect(x + w + 2, y + ((bh - th) * top) / Math.max(1, n - rows), 3, th, 'mist'); }
  return act;
}

export class Menus {
  constructor(ctx, ui, play) { this.ctx = ctx; this.ui = ui; this.play = play; this.stack = []; }
  get open() { return this.stack.length > 0; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(type, data = {}) { this.stack.push({ type, tab: 0, step: 0, sel: null, ...data }); this.ui.focus = null; this.ctx.input.clearQueued(); }
  pop() { this.stack.pop(); this.ui.focus = null; this.ctx.input.clearQueued(); this.ui.ctx.audio.play('ui_back'); if (!this.open) this.play.onMenusClosed(); }
  closeAll() { this.stack = []; this.ui.focus = null; this.ctx.input.clearQueued(); this.play.onMenusClosed(); }
  draw(w, seat) {
    const s = this.top; if (!s) return;
    const fn = this[`screen_${s.type}`]; if (!fn) throw new Error(`no screen ${s.type}`);
    const ui = this.ui; const m = ui.m;
    const before = this.stack.length;
    const h = w.heroes.find((q) => q.seat === (s.seat ?? seat)) ?? w.heroes[0];
    fn.call(this, ui, s, w, h, m);
    // On the couch, the panel is framed in the colour of the seat that owns it.
    if (this.play.localSeats().length > 1 && h && this.top) { const c = ['red', 'blue', 'lime', 'sand'][h.seat] ?? 'white'; ui.rect(0, 0, ui.W, 2, c); ui.rect(0, ui.H - 2, ui.W, 2, c); ui.rect(0, 0, 2, ui.H, c); ui.rect(ui.W - 2, 0, 2, ui.H, c); ui.seatFrame = h.seat; }
    if (this.stack.length === before && m.back && !s.noBack && this.top === s) this.pop();
  }

  // --- Pause and its children.
  screen_pause(ui, s, w, h, m) {
    const session = w.mode === 'session';
    ui.rect(ui.W / 2 - 80, 0, 160, ui.H, 'ink');
    ui.textC(ui.W / 2, 16, 'PAUSED', { color: 'sand', scale: 2 });
    const items = session ? [['RESUME', () => this.closeAll()], ['HERO', () => this.push('hero')], ['SETTINGS', () => this.push('settings')], ['HOW TO PLAY', () => this.push('howto')]]
      : [['RESUME', () => this.closeAll()], ['HERO', () => this.push('hero')], ['MAP', () => this.push('map')], ['PARTY', () => this.push('party')], ['HOW TO PLAY', () => this.push('howto')], ['SETTINGS', () => this.push('settings')], ['DEV MODE', () => this.push('dev')], ['ABOUT', () => this.push('about')], ['SAVE AND QUIT', () => this.play.saveAndQuit()]];
    const rowH = Math.min(18, Math.floor((ui.H - 50) / items.length));
    items.forEach(([label, fn], i) => { if (ui.button(`pause:${label}`, ui.W / 2 - 70, 40 + i * rowH, 140, rowH - 2, label)) fn(); });
    if (m.pause && !m.back) this.closeAll();
  }
  // --- The Hero screen and its tabs.
  screen_hero(ui, s, w, h, m) {
    const names = ['GEAR', 'SKILLS', 'STATS', 'DEVOTION', 'CODEX'];
    header(ui, h.name); tabs(ui, s, names, m);
    ({ 0: this.tabGear, 1: this.tabSkills, 2: this.tabStats, 3: this.tabDevotion, 4: this.tabCodex })[s.tab].call(this, ui, s, w, h, m);
  }
  tabGear(ui, s, w, h, m) {
    const X = 12; const Y = 28; const IX = X + CELL * 2 + 14;
    let focused = null;
    SLOTS.forEach((slot, i) => { const x = X + (i % 2) * CELL; const y = Y + Math.floor(i / 2) * CELL; const it = h.gear[slot]; const st = itemCell(ui, `eq:${slot}`, x, y, it, { placeholder: `slot_${slot}` }); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'unequip', slot }, h.seat); });
    for (let i = 0; i < 40; i++) { const x = IX + (i % 8) * CELL; const y = Y + Math.floor(i / 8) * CELL; const it = h.inv[i]; const st = itemCell(ui, `inv:${i}`, x, y, it); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'equip', uid: it.uid }, h.seat);
      if (it && ((st.focused && m.x) || ui.rclicked === `inv:${i}`)) this.play.command({ c: 'salvage', uid: it.uid }, h.seat); }
    ui.rclicked = null;
    const rx = IX + CELL * 8 + 8; if (ui.W - rx > 90) { ui.text(rx, Y, 'GOLD', { color: 'mist' }); ui.text(rx, Y + 9, fmt(h.gold), { color: 'sand' }); ui.text(rx, Y + 22, 'SCRAP', { color: 'mist' }); ui.text(rx + 40, Y + 22, h.mats.scrap); ui.text(rx, Y + 31, 'DUST', { color: 'mist' }); ui.text(rx + 40, Y + 31, h.mats.dust); ui.text(rx, Y + 40, 'SHARDS', { color: 'mist' }); ui.text(rx + 40, Y + 40, h.mats.shards); ui.text(rx, Y + 49, 'KEYS', { color: 'mist' }); ui.text(rx + 40, Y + 49, h.mats.keys); }
    if (m.y) s.compare = !s.compare;
    const worn = focused ? h.gear[focused.slot] : null; const showing = s.compare && worn && worn !== focused ? worn : focused;
    const cy = Y + CELL * 5 + 4; itemCard(ui, 12, cy, ui.W - 24, Math.max(40, ui.H - cy - 18), showing, h, w);
    if (s.compare && worn && worn !== focused) ui.textR(ui.W - 18, cy + 4, 'WORN NOW', { color: 'lime' });
    footer(ui, [['confirm', 'EQUIP'], ['x', 'SALVAGE'], ['y', s.compare ? 'THIS ONE' : 'COMPARE'], ['back', 'BACK']]);
  }
  tabSkills(ui, s, w, h, m) {
    const cls = CLASSES[h.cls];
    if (s.step === 0) {
      const SW = 54; const x0 = ui.W / 2 - (SW * 6 + 10) / 2; const Y = 28;
      for (let i = 0; i < 6; i++) {
        const open = h.level >= SLOT_LEVELS[i]; const sk = SKILLS[h.slots[i].skill]; const st = ui.widget(`slot:${i}`, x0 + i * (SW + 2), Y, SW, 46, {});
        ui.frame(x0 + i * (SW + 2), Y, SW, 46, st.focused ? 'sand' : open ? 'slate' : 'night', st.focused ? 'plum' : 'night');
        prompt(ui, x0 + i * (SW + 2) + 3, Y + 3, `skill${i}`);
        if (!open) { drawIcon(ui, x0 + i * (SW + 2) + 21, Y + 14, 'lock'); ui.textC(x0 + i * (SW + 2) + SW / 2, Y + 34, `LV ${SLOT_LEVELS[i]}`, { color: 'mist' }); }
        else if (sk) { drawIcon(ui, x0 + i * (SW + 2) + 21, Y + 13, sk.icon); ui.textC(x0 + i * (SW + 2) + SW / 2, Y + 28, sk.name.split(' ')[0].slice(0, 8)); const t = h.slots[i].tone; ui.textC(x0 + i * (SW + 2) + SW / 2, Y + 37, t ? sk.tones[t].name.slice(0, 8) : '', { color: 'sky' }); }
        if (st.act && open) { s.step = 1; s.sel = i; ui.focus = null; ui.ctx.audio.play('ui_ok'); }
      }
      // The two Vows.
      const vy = Y + 56; ui.text(x0, vy, 'VOWS', { color: 'sand' });
      for (let i = 0; i < 2; i++) {
        const L = VOW_LEVELS[i]; const open = h.level >= L; const id = h.vows[i]; const v = cls.vows.find((q) => q.id === id);
        const label = !open ? `OPENS AT LEVEL ${L}` : v ? v.name : 'SWEAR A VOW';
        if (ui.button(`vow:${i}`, x0, vy + 10 + i * 20, 180, 18, label, { align: 'left', disabled: !open })) { s.step = 3; s.sel = i; ui.focus = null; }
        if (v) ui.para(x0 + 186, vy + 11 + i * 20, v.desc, ui.W - x0 - 196, { color: 'mist', lh: 8 });
      }
      const f = ui.focus?.startsWith('slot:') ? h.slots[Number(ui.focus.split(':')[1])] : null;
      if (f?.skill) { const sk = SKILLS[f.skill]; ui.para(x0, vy + 56, sk.desc, ui.W - x0 * 2, { color: 'mist' }); }
      footer(ui, [['confirm', 'CHANGE'], ['back', 'BACK']]);
    } else if (s.step === 1) {
      ui.text(12, 28, `SLOT ${s.sel + 1}: PICK A SKILL`, { color: 'sand' });
      const CW = Math.floor((ui.W - 24 - 6) / 4); const CH = Math.floor((ui.H - 60) / 2);
      cls.skills.forEach((sk, i) => {
        const x = 12 + (i % 4) * (CW + 2); const y = 38 + Math.floor(i / 4) * (CH + 2); const open = h.level >= sk.level; const st = ui.widget(`sk:${sk.id}`, x, y, CW, CH, {});
        ui.frame(x, y, CW, CH, st.focused ? 'sand' : h.slots.some((q) => q.skill === sk.id) ? 'sky' : 'slate', st.focused ? 'plum' : 'night');
        drawIcon(ui, x + 4, y + 4, open ? sk.icon : 'lock'); ui.text(x + 19, y + 7, sk.name.slice(0, Math.floor((CW - 22) / 6)), { color: open ? 'white' : 'mist' });
        const res = sk.cost ? `${sk.cost} ${cls.resource}` : sk.cd ? `${sk.cd} S` : `+${sk.gen ?? sk.genPerTarget} ${cls.resource}`; ui.text(x + 4, y + 20, open ? res : `LEVEL ${sk.level}`, { color: 'sand' });
        ui.para(x + 4, y + 30, sk.desc, CW - 8, { color: 'mist', lh: 8 });
        if (st.act && open) { this.play.command({ c: 'setSkill', slot: s.sel, skill: sk.id }, h.seat); s.step = 2; ui.focus = null; ui.ctx.audio.play('ui_equip'); }
      });
      footer(ui, [['confirm', 'CHOOSE'], ['back', 'BACK']]);
      if (m.back) { s.step = 0; ui.focus = null; m.back = false; }
    } else if (s.step === 2) {
      const sk = SKILLS[h.slots[s.sel].skill]; if (!sk) { s.step = 0; return; }
      ui.text(12, 28, `${sk.name}: PICK A TONE`, { color: 'sand' });
      const keys = Object.keys(sk.tones); const rows = [null, ...keys];
      rows.forEach((k, i) => {
        const y = 40 + i * 30; const unlocked = k === null || h.level >= toneUnlockLevel(sk, i - 1); const t = k ? sk.tones[k] : null;
        const st = ui.widget(`tone:${k ?? 'none'}`, 12, y, ui.W - 24, 28, {}); const eq = h.slots[s.sel].tone === k;
        ui.frame(12, y, ui.W - 24, 28, st.focused ? 'sand' : eq ? 'sky' : 'slate', st.focused ? 'plum' : 'night');
        ui.text(18, y + 5, k ? t.name : 'PLAIN', { color: unlocked ? 'white' : 'mist' });
        ui.text(18, y + 15, k ? (unlocked ? t.desc : `OPENS AT LEVEL ${toneUnlockLevel(sk, i - 1)}`) : sk.desc, { color: unlocked ? 'mist' : 'slate' });
        if (st.act && unlocked) { this.play.command({ c: 'setTone', slot: s.sel, tone: k }, h.seat); s.step = 0; ui.focus = null; ui.ctx.audio.play('ui_equip'); }
      });
      footer(ui, [['confirm', 'CHOOSE'], ['back', 'BACK']]);
      if (m.back) { s.step = 0; ui.focus = null; m.back = false; }
    } else if (s.step === 3) {
      ui.text(12, 28, 'SWEAR A VOW', { color: 'sand' });
      cls.vows.forEach((v, i) => { const y = 40 + i * 30; const st = ui.widget(`vowpick:${v.id}`, 12, y, ui.W - 24, 28, {}); const on = h.vows.includes(v.id); ui.frame(12, y, ui.W - 24, 28, st.focused ? 'sand' : on ? 'sky' : 'slate', st.focused ? 'plum' : 'night'); ui.text(18, y + 5, v.name); ui.text(18, y + 15, v.desc, { color: 'mist' }); if (st.act) { this.play.command({ c: 'setVow', index: s.sel, vow: v.id }, h.seat); s.step = 0; ui.focus = null; ui.ctx.audio.play('ui_equip'); } });
      footer(ui, [['confirm', 'SWEAR'], ['back', 'BACK']]);
      if (m.back) { s.step = 0; ui.focus = null; m.back = false; }
    }
  }
  tabStats(ui, s, w, h) {
    const big = [['DAMAGE', damageRating(h)], ['TOUGHNESS', toughnessRating(h)], ['RECOVERY', recoveryRating(h)]];
    const col = (ui.W - 24) / 3;
    big.forEach(([n, v], i) => { ui.textC(12 + col * i + col / 2, 32, n, { color: 'mist' }); ui.textC(12 + col * i + col / 2, 44, fmt(v), { color: 'sand', scale: 3 }); });
    const st = h.stats; const lines = [['POWER', st.power], ['VITALITY', st.vitality], ['ARMOUR', Math.round(st.armour)], ['CRIT CHANCE', `${Math.round(st.crit)}%`], ['CRIT DAMAGE', `+${Math.round(50 + st.critDmg)}%`], ['ATTACK SPEED', `+${Math.round(st.atkSpd)}%`], ['COOLDOWN', `-${Math.round(st.cdr)}%`], ['MOVE SPEED', `${st.speed.toFixed(1)} M/S`], ['LIFE', fmt(st.maxHp)], ['LIFE PER HIT', Math.round(st.lifePerHit)], ['GOLD FIND', `+${Math.round(st.goldFind)}%`], ['MAGIC FIND', `+${Math.round(st.magicFind)}%`], ['AREA DAMAGE', `+${Math.round(st.area)}%`], ['THORNS', Math.round(st.thorns)], ['DEATHS', h.deaths], ['KILLS', h.kills]];
    const rows = Math.floor((ui.H - 112) / 12);
    const act = scrollList(ui, s, 'stats', lines, 40, 76, ui.W - 80, 12, rows, ([n, v], i, x, y, id) => { const st2 = ui.widget(id, x, y, ui.W - 80, 11, {}); if (st2.focused) ui.rect(x, y, ui.W - 80, 11, 'plum'); ui.text(x + 4, y + 2, n, { color: 'mist' }); ui.textR(x + ui.W - 84, y + 2, v); return false; });
    void act;
    const sets = Object.entries(h.setCount ?? {}).map(([k, n]) => `${SETS[k].name}: ${n} OF 4`); if (sets[0]) ui.textC(ui.W / 2, ui.H - 26, sets[0].slice(0, Math.floor((ui.W - 24) / 6)), { color: 'lime' });
    footer(ui, [['back', 'BACK']]);
  }
  tabDevotion(ui, s, w, h) {
    const d = w.devotion; const free = devotionPointsFree(w);
    ui.text(16, 30, `DEVOTION ${d.level}`, { color: 'sky' }); ui.textR(ui.W - 16, 30, `${free} TO SPEND`, { color: free ? 'sand' : 'mist' });
    if (h.level < LEVEL_CAP) ui.textC(ui.W / 2, 44, `DEVOTION OPENS AT LEVEL ${LEVEL_CAP}`, { color: 'mist' });
    else ui.bar(16, 42, ui.W - 32, 5, d.xp / devotionCost(d.level), 'sky');
    Object.entries(DEVOTION_TRACKS).forEach(([k, t], i) => {
      const y = 54 + i * 34; const n = d.spent[k] ?? 0; const st = ui.widget(`dev:${k}`, 12, y, ui.W - 24, 32, {});
      ui.frame(12, y, ui.W - 24, 32, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night');
      ui.text(18, y + 4, t.name, { color: st.focused ? 'white' : t.color }); ui.textR(ui.W - 18, y + 4, n, { color: 'white' }); ui.bar(18, y + 14, ui.W - 36, 5, Math.min(1, n / 30), t.color);
      ui.text(18, y + 22, t.perk.slice(0, Math.floor((ui.W - 36) / 6)), { color: 'mist' });
      if (st.act) { if (free > 0) this.play.command({ c: 'devotion', track: k }, h.seat); else ui.ctx.audio.play('ui_error'); }
    });
    footer(ui, [['confirm', 'SPEND A POINT'], ['back', 'BACK']]);
  }
  tabCodex(ui, s, w, h, m) {
    s.codex ??= 0; const names = ['LORE', 'BESTIARY', 'HOW TO PLAY'];
    names.forEach((n, i) => { if (ui.button(`cx:${i}`, 12 + i * 100, 26, 96, 14, n, { border: s.codex === i ? 'sand' : 'slate' })) { s.codex = i; s.page = 0; } });
    const y0 = 44; const rows = Math.floor((ui.H - y0 - 24) / 13);
    if (s.codex === 0) {
      if (s.reading) { this.reader(ui, s, LORE[s.reading], m); if (m.back) { s.reading = null; m.back = false; ui.focus = null; } return; }
      const a = scrollList(ui, s, 'lore', LORE_IDS, 12, y0, ui.W - 30, 13, rows, (id, i, x, y, wid) => { const known = w.lore[id]; return ui.button(wid, x, y, ui.W - 30, 12, known ? LORE[id].title : '? ? ?', { align: 'left', disabled: !known }); });
      if (a >= 0) { s.reading = LORE_IDS[a]; s.page = 0; }
      footer(ui, [['confirm', 'READ'], ['back', 'BACK']]);
    } else if (s.codex === 1) {
      const a = scrollList(ui, s, 'best', BESTIARY, 12, y0, 150, 13, rows, (id, i, x, y, wid) => ui.button(wid, x, y, 150, 12, w.bestiary[id] ? MONSTERS[id].name.slice(0, 23) : '? ? ?', { align: 'left' }));
      void a; const fid = ui.focus?.startsWith('best:') ? BESTIARY[Number(ui.focus.split(':')[1])] : BESTIARY[0];
      if (w.bestiary[fid]) { ui.text(176, y0, MONSTERS[fid].name, { color: 'sand' }); ui.text(176, y0 + 10, `SLAIN: ${w.bestiary[fid]}`, { color: 'mist' }); ui.para(176, y0 + 24, MONSTERS[fid].lore, ui.W - 190, { color: 'white' }); }
      else ui.text(176, y0, 'NOT YET MET. A MERCY.', { color: 'mist' });
      footer(ui, [['back', 'BACK']]);
    } else { this.howToBody(ui, s, y0, m); }
  }
  reader(ui, s, lore, m) {
    s.page ??= 0; const pages = lore.pages; if (m.right || m.confirm) s.page = Math.min(pages.length - 1, s.page + 1); if (m.left) s.page = Math.max(0, s.page - 1);
    ui.textC(ui.W / 2, 46, lore.title, { color: 'sand' }); ui.para(40, 64, pages[s.page], ui.W - 80, { color: 'white', lh: 11 }); if (pages.length > 1) ui.textC(ui.W / 2, ui.H - 34, `PAGE ${s.page + 1} OF ${pages.length}`, { color: 'mist' });
    footer(ui, [['back', 'BACK']]);
  }
  howToBody(ui, s, y0, m) {
    s.page ??= 0; const p = HOW_TO_PLAY[s.page];
    const prevB = ui.button('ht:prev', 12, y0, 26, 18, '<', { disabled: s.page === 0 }); const nextB = ui.button('ht:next', ui.W - 38, y0, 26, 18, '>', { disabled: s.page === HOW_TO_PLAY.length - 1 });
    if (prevB || (m.left && s.page > 0 && !ui.focus?.startsWith('cx'))) { s.page = Math.max(0, s.page - 1); } if (nextB || (m.right && !ui.focus?.startsWith('cx'))) s.page = Math.min(HOW_TO_PLAY.length - 1, s.page + 1);
    ui.textC(ui.W / 2, y0 + 5, p.title, { color: 'sand', scale: ui.measure(p.title, 2) < ui.W - 100 ? 2 : 1 });
    let y = y0 + 28; for (const l of p.lines) { y += ui.para(30, y, l, ui.W - 60, { color: 'white' }) + 4; }
    ui.textC(ui.W / 2, ui.H - 30, `PAGE ${s.page + 1} OF ${HOW_TO_PLAY.length}`, { color: 'mist' });
    footer(ui, [['back', 'BACK']]);
  }
  screen_howto(ui, s, w, h, m) { header(ui, 'HOW TO PLAY'); this.howToBody(ui, s, 28, m); }
  screen_lore(ui, s, w, h, m) { header(ui, 'A BOOK'); const l = LORE[s.lore]; if (!s.spoke) { s.spoke = true; this.play.speak('narrator', l.pages[0]); } this.reader(ui, s, l, m); }
  // --- Pennywhistle.
  screen_vendor(ui, s, w, h, m) {
    header(ui, 'PENNYWHISTLE'); tabs(ui, s, ['BUY', 'SELL', 'CASKET'], m);
    const X = 12; const Y = 28; let focused = null;
    if (s.tab === 0) {
      const st = vendorStock(w, h); const CW = Math.floor((ui.W - 24 - 10) / 3);
      for (let i = 0; i < 6; i++) { const it = st[i]; const x = X + (i % 3) * (CW + 5); const y = Y + Math.floor(i / 3) * 34; const w2 = ui.widget(`buy:${i}`, x, y, CW, 32, {}); const col = it ? RARITIES[it.rarity].color : 'slate'; ui.frame(x, y, CW, 32, w2.focused ? 'white' : col, w2.focused ? 'plum' : 'night'); if (it) { const ic = recolor(slotIcon(it), col); ui.sprite(x + 3, y + 3, ic.rows, ic.colors); ui.text(x + 18, y + 4, SLOT_NAMES[it.slot].slice(0, Math.floor((CW - 22) / 6)), { color: col }); ui.text(x + 18, y + 14, `${fmt(it.price)} G`, { color: h.gold >= it.price ? 'sand' : 'red' }); } else ui.text(x + 6, y + 12, 'SOLD', { color: 'mist' }); if (w2.focused) focused = it; if (w2.act && it) this.play.command({ c: 'buy', uid: it.uid }, h.seat); }
      ui.textR(ui.W - 12, Y + 72, `GOLD ${fmt(h.gold)}`, { color: 'sand' });
      const cy = Y + 84; itemCard(ui, 12, cy, ui.W - 24, ui.H - cy - 18, focused, h, w);
      footer(ui, [['confirm', 'BUY'], ['back', 'LEAVE']]);
    } else if (s.tab === 1) {
      for (let i = 0; i < 40; i++) { const x = X + (i % 8) * CELL; const y = Y + Math.floor(i / 8) * CELL; const it = h.inv[i]; const st = itemCell(ui, `sell:${i}`, x, y, it); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'sell', uid: it.uid }, h.seat); }
      ui.text(X + CELL * 8 + 8, Y, 'SELLS FOR', { color: 'mist' }); if (focused) ui.text(X + CELL * 8 + 8, Y + 9, `${fmt(itemValue(focused))} GOLD`, { color: 'sand' }); ui.text(X + CELL * 8 + 8, Y + 24, `GOLD ${fmt(h.gold)}`, { color: 'sand' });
      const cy = Y + CELL * 5 + 4; itemCard(ui, 12, cy, ui.W - 24, Math.max(40, ui.H - cy - 18), focused, h, w);
      footer(ui, [['confirm', 'SELL'], ['back', 'LEAVE']]);
    } else {
      ui.text(12, 28, `A MYSTERY CASKET: ${CASKET_COST.shards} BELL SHARDS. YOU HAVE ${h.mats.shards}.`, { color: 'sand' }); ui.text(12, 38, 'PICK A SLOT. SOMETHING WILL BE IN IT.', { color: 'mist' });
      const CW = Math.floor((ui.W - 24 - 20) / 5);
      SLOTS.forEach((slot, i) => { const x = 12 + (i % 5) * (CW + 5); const y = 52 + Math.floor(i / 5) * 42; const st = ui.widget(`cask:${slot}`, x, y, CW, 38, {}); ui.frame(x, y, CW, 38, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night'); const ic = recolor(`slot_${slot}`, 'sand'); ui.sprite(x + CW / 2 - 6, y + 5, ic.rows, ic.colors); ui.textC(x + CW / 2, y + 24, SLOT_NAMES[slot].slice(0, Math.floor(CW / 6)), { color: 'white' }); if (st.act) this.play.command({ c: 'casket', slot }, h.seat); });
      footer(ui, [['confirm', 'OPEN A CASKET'], ['back', 'LEAVE']]);
    }
  }
  // --- Dame Brasse.
  screen_brasse(ui, s, w, h, m) {
    header(ui, 'DAME BRASSE, BELLFOUNDER'); tabs(ui, s, ['SALVAGE', 'CRAFT', 'REFORGE'], m);
    const X = 12; const Y = 28; let focused = null;
    const mats = `SCRAP ${h.mats.scrap}  DUST ${h.mats.dust}  SHARDS ${h.mats.shards}`;
    if (s.tab === 0) {
      for (let i = 0; i < 40; i++) { const x = X + (i % 8) * CELL; const y = Y + Math.floor(i / 8) * CELL; const it = h.inv[i]; const st = itemCell(ui, `sv:${i}`, x, y, it); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'salvage', uid: it.uid }, h.seat); }
      ui.para(X + CELL * 8 + 8, Y, mats.replace(/  /g, '\n'), ui.W - (X + CELL * 8 + 20), { color: 'sand' });
      const cy = Y + CELL * 5 + 4; itemCard(ui, 12, cy, ui.W - 24, Math.max(40, ui.H - cy - 18), focused, h, w);
      footer(ui, [['confirm', 'SALVAGE'], ['back', 'LEAVE']]);
    } else if (s.tab === 1) {
      ui.text(12, 28, mats, { color: 'sand' }); ui.text(12, 38, `GOLD ${fmt(h.gold)}`, { color: 'sand' });
      s.rarity ??= 'blessed'; const rs = ['blessed', 'reliquary'];
      rs.forEach((r, i) => { const c = CRAFT_COST[r]; const label = `${RARITIES[r].name}: ${c.scrap} SCRAP${c.dust ? `, ${c.dust} DUST` : ''}, ${c.gold} G`; if (ui.button(`rar:${r}`, 12, 50 + i * 16, ui.W - 24, 14, label, { align: 'left', border: s.rarity === r ? 'sand' : 'slate', color: RARITIES[r].color })) s.rarity = r; });
      const CW = Math.floor((ui.W - 24 - 20) / 5);
      SLOTS.forEach((slot, i) => { const x = 12 + (i % 5) * (CW + 5); const y = 88 + Math.floor(i / 5) * 42; const st = ui.widget(`cr:${slot}`, x, y, CW, 38, {}); ui.frame(x, y, CW, 38, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night'); const ic = recolor(`slot_${slot}`, RARITIES[s.rarity].color); ui.sprite(x + CW / 2 - 6, y + 5, ic.rows, ic.colors); ui.textC(x + CW / 2, y + 24, SLOT_NAMES[slot].slice(0, Math.floor(CW / 6))); if (st.act) this.play.command({ c: 'craft', slot, rarity: s.rarity }, h.seat); });
      footer(ui, [['confirm', 'MELT AND POUR'], ['back', 'LEAVE']]);
    } else {
      const all = [...Object.values(h.gear).filter(Boolean), ...h.inv];
      if (s.step === 0) {
        ui.text(12, 28, `REFORGE ONE AFFIX: ${REFORGE_COST.dust} DUST, ${REFORGE_COST.gold} G. PICK AN ITEM.`, { color: 'sand' });
        for (let i = 0; i < Math.min(50, all.length); i++) { const x = X + (i % 10) * CELL; const y = 40 + Math.floor(i / 10) * CELL; const it = all[i]; const st = itemCell(ui, `rf:${it.uid}`, x, y, it); if (st.focused) focused = it; if (st.act && it.affixes.length) { s.step = 1; s.sel = it.uid; ui.focus = null; ui.ctx.audio.play('ui_ok'); } }
        const cy = Math.max(40 + CELL * Math.ceil(Math.min(50, all.length) / 10) + 4, ui.H - 92); itemCard(ui, 12, cy, ui.W - 24, ui.H - cy - 18, focused, h, w);
        footer(ui, [['confirm', 'PICK'], ['back', 'LEAVE']]);
      } else {
        const it = all.find((q) => q.uid === s.sel); if (!it) { s.step = 0; return; }
        ui.text(12, 28, it.name.slice(0, Math.floor((ui.W - 24) / 6)), { color: RARITIES[it.rarity].color }); ui.text(12, 38, 'PICK THE AFFIX TO REROLL.', { color: 'mist' });
        it.affixes.forEach((a, i) => { if (ui.button(`af:${i}`, 12, 50 + i * 18, ui.W - 24, 16, fmtAffix(a), { align: 'left', color: 'sky' })) this.play.command({ c: 'reforge', uid: it.uid, index: i }, h.seat); });
        ui.text(12, ui.H - 32, `DUST ${h.mats.dust}  GOLD ${fmt(h.gold)}`, { color: 'sand' });
        footer(ui, [['confirm', 'REFORGE'], ['back', 'BACK']]);
        if (m.back) { s.step = 0; ui.focus = null; m.back = false; }
      }
    }
  }
  // --- Mother Ogive.
  screen_ogive(ui, s, w, h, m) {
    header(ui, 'MOTHER OGIVE, THE RELIQUARY'); tabs(ui, s, ['EXTRACT', 'RELIQUARY', 'SOCKET', 'MERGE'], m);
    let focused = null;
    if (s.tab === 0) {
      const legs = h.inv.filter((i) => i.power);
      ui.text(12, 28, 'EXTRACT A POWER. THE ITEM IS LOST; THE POWER IS KEPT.', { color: 'mist' });
      if (!legs.length) ui.textC(ui.W / 2, 70, 'YOU CARRY NOTHING SHE WISHES TO TASTE.', { color: 'mist' });
      legs.slice(0, 10).forEach((it, i) => { const st = itemCell(ui, `ex:${it.uid}`, 12 + i * CELL, 40, it); if (st.focused) focused = it; if (st.act) this.play.command({ c: 'extract', uid: it.uid }, h.seat); });
      itemCard(ui, 12, 72, ui.W - 24, 90, focused, h, w, { empty: 'BRING ME RELICS, CHILD.' });
      footer(ui, [['confirm', 'EXTRACT'], ['back', 'LEAVE']]);
    } else if (s.tab === 1) {
      ui.text(12, 28, 'THE RELIQUARY HOLDS THREE POWERS, USABLE AS IF WORN.', { color: 'mist' });
      const known = h.known ?? []; const KINDS = [['weapon', 'WEAPON'], ['armour', 'ARMOUR'], ['jewel', 'JEWELLERY']];
      KINDS.forEach(([k, label], i) => {
        const y = 42 + i * 38; const cur = h.reliquary[k]; const opts = [null, ...known.filter((p) => reliquaryKind(LEGENDARY[p].slot) === k)];
        const st = ui.widget(`rl:${k}`, 12, y, ui.W - 24, 34, {}); ui.frame(12, y, ui.W - 24, 34, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night');
        ui.text(18, y + 4, label, { color: 'sand' }); ui.text(90, y + 4, cur ? LEGENDARY[cur].name : 'EMPTY', { color: cur ? 'orange' : 'mist' });
        if (cur) ui.text(18, y + 15, LEGENDARY[cur].power.slice(0, Math.floor((ui.W - 36) / 6)), { color: 'white' });
        if (st.act || (st.focused && (m.left || m.right))) { const i2 = (opts.indexOf(cur) + 1) % opts.length; this.play.command({ c: 'setRelic', kind: k, power: opts[i2] }, h.seat); ui.ctx.audio.play('ui_tab'); }
      });
      footer(ui, [['confirm', 'NEXT POWER'], ['back', 'LEAVE']]);
    } else if (s.tab === 2) {
      const items = [...Object.values(h.gear).filter(Boolean), ...h.inv].filter((i) => i.affixes.some((a) => a.k === 'socket'));
      if (s.step === 0) {
        ui.text(12, 28, 'SET A STONE. PICK AN ITEM WITH A SOCKET.', { color: 'mist' });
        if (!items.length) ui.textC(ui.W / 2, 70, 'NOTHING OF YOURS HAS A SOCKET.', { color: 'mist' });
        items.slice(0, 20).forEach((it, i) => { const st = itemCell(ui, `so:${it.uid}`, 12 + (i % 10) * CELL, 40 + Math.floor(i / 10) * CELL, it); if (st.focused) focused = it; if (st.act) { s.step = 1; s.sel = it.uid; ui.focus = null; ui.ctx.audio.play('ui_ok'); } });
        itemCard(ui, 12, 94, ui.W - 24, 90, focused, h, w, { empty: 'BRING ME SOMETHING WITH A HOLE IN IT.' });
        footer(ui, [['confirm', 'PICK'], ['back', 'LEAVE']]);
      } else {
        const it = items.find((q) => q.uid === s.sel); if (!it) { s.step = 0; return; }
        const gems = Object.keys(h.gems).filter((k) => h.gems[k] > 0); ui.text(12, 28, 'PICK A GEM.', { color: 'mist' }); ui.text(100, 28, it.name.slice(0, Math.floor((ui.W - 112) / 6)), { color: RARITIES[it.rarity].color });
        if (!gems.length) ui.textC(ui.W / 2, 70, 'YOU HAVE NO GEMS, CHILD.', { color: 'mist' });
        gems.slice(0, 9).forEach((g, i) => { const [k, t] = g.split(':'); if (ui.button(`gem:${g}`, 12, 40 + i * 16, ui.W - 24, 14, `${GEM_TIERS[t]} ${GEMS[k].name} (${h.gems[g]})`, { align: 'left', color: GEMS[k].color })) { this.play.command({ c: 'socket', uid: it.uid, gem: g }, h.seat); s.step = 0; ui.focus = null; } });
        if (it.gem && ui.button('unsocket', 12, ui.H - 36, 120, 14, 'REMOVE STONE')) { this.play.command({ c: 'unsocket', uid: it.uid }, h.seat); }
        footer(ui, [['confirm', 'SET'], ['back', 'BACK']]);
        if (m.back) { s.step = 0; ui.focus = null; m.back = false; }
      }
    } else {
      ui.text(12, 28, 'THREE ALIKE MAKE ONE BETTER.', { color: 'mist' });
      let y = 42;
      for (const k of Object.keys(GEMS)) for (let t = 0; t < 2; t++) { const key = `${k}:${t}`; const n = h.gems[key] ?? 0; if (ui.button(`mg:${key}`, 12, y, ui.W - 24, 14, `${GEM_TIERS[t]} ${GEMS[k].name}: ${n}`, { align: 'left', color: n >= 3 ? GEMS[k].color : 'mist' })) this.play.command({ c: 'merge', gem: key }, h.seat); y += 16; }
      footer(ui, [['confirm', 'MERGE'], ['back', 'LEAVE']]);
    }
  }
  screen_stash(ui, s, w, h, m) {
    header(ui, 'THE COLLECTION BOX'); tabs(ui, s, ['TAB 1', 'TAB 2', 'TAB 3'], m);
    const Y = 28; let focused = null; const tab = w.stash[s.tab]; ui.text(12, Y, 'SHARED', { color: 'sky' });
    for (let i = 0; i < STASH_SIZE; i++) { const x = 12 + (i % 6) * CELL; const y = Y + 10 + Math.floor(i / 6) * CELL; const it = tab[i]; const st = itemCell(ui, `st:${i}`, x, y, it); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'stashTake', tab: s.tab, uid: it.uid }, h.seat); }
    const IX = 12 + CELL * 6 + 12; ui.text(IX, Y, 'YOUR PACK', { color: 'sand' });
    for (let i = 0; i < 40; i++) { const x = IX + (i % 8) * CELL; const y = Y + 10 + Math.floor(i / 8) * CELL; const it = h.inv[i]; const st = itemCell(ui, `pk:${i}`, x, y, it); if (st.focused) focused = it; if (st.act && it) this.play.command({ c: 'stashPut', tab: s.tab, uid: it.uid }, h.seat); }
    const cy = Y + 10 + CELL * 5 + 4; itemCard(ui, 12, cy, ui.W - 24, Math.max(36, ui.H - cy - 18), focused, h, w);
    footer(ui, [['confirm', 'MOVE'], ['back', 'CLOSE']]);
  }
  screen_map(ui, s, w, h, m) {
    header(ui, w.zone.spec.name);
    const z = w.zone; const canTravel = s.travel || w.zone.id === 'town'; const dests = canTravel && !w.knell && w.mode === 'campaign' ? LYCHGATE_ORDER.filter((id) => id !== w.zone.id && w.story.lychgates.includes(id)) : [];
    const mapW = ui.W - (dests.length ? 190 : 24); const scale = Math.max(1, Math.min(Math.floor(mapW / z.w), Math.floor((ui.H - 44) / z.h)));
    const ox = 12 + Math.floor((mapW - z.w * scale) / 2); const oy = 26 + Math.floor((ui.H - 44 - z.h * scale) / 2);
    if (!s.rows || s.key !== z.id || ui.frameN % 30 === 0) { s.key = z.id; s.rows = z.rows.map((r, y) => [...r].map((c, x) => (!z.explored?.[y * z.w + x] ? '.' : c === '#' ? 'm' : c === '.' ? 'n' : c === '~' ? 't' : '.')).join('')); }
    ui.sprite(ox, oy, s.rows, { m: 'mist', n: 'navy', t: 'teal' }, { scale });
    for (const p of w.props) if (p.interact && !p.hidden && !p.used && z.explored?.[Math.floor(p.z) * z.w + Math.floor(p.x)]) ui.rect(ox + p.x * scale - 1, oy + p.z * scale - 1, 3, 3, p.kind === 'exit' ? 'sky' : p.kind === 'lychgate' ? 'cyan' : p.kind === 'npc' ? 'lime' : 'orange');
    for (const o of w.heroes) if (!o.left) ui.rect(ox + o.x * scale - 1, oy + o.z * scale - 1, 3, 3, 'white');
    if (dests.length) {
      ui.text(ui.W - 170, 28, 'TRAVEL', { color: 'sky' });
      dests.forEach((id, i) => { const name = id === 'town' ? 'TOLLHAVEN' : ZONES[id].name.replace('OSSUARY OF SAINT GLOAM: ', 'OSSUARY ').replace('THE CRACKED BELFRY: ', 'BELFRY ').replace('THE ', ''); if (ui.button(`go:${id}`, ui.W - 170, 38 + i * 15, 158, 14, name.slice(0, 25), { align: 'left' })) { this.play.command({ c: 'travel', zone: id }, h.seat); this.closeAll(); } });
    }
    footer(ui, dests.length ? [['confirm', 'TRAVEL'], ['back', 'CLOSE']] : [['back', 'CLOSE']]);
  }
  screen_party(ui, s, w, h, m) {
    header(ui, 'PARTY');
    const humans = this.play.localSeats(); const pads = ui.router.padsSeen();
    ui.para(16, 28, 'A SPARE PAD JOINS BY PRESSING OPTIONS. HOLD OPTIONS HERE TO LEAVE. UP TO FOUR ON ONE SCREEN.', ui.W - 32, { color: 'mist' });
    for (let i = 0; i < 4; i++) {
      const y = 56 + i * 24; const he = w.heroes.find((q) => q.seat === i && !q.left); const isBot = this.play.bots[i];
      const label = he ? `SEAT ${i + 1}: ${he.name} ${CLASSES[he.cls].name}${isBot ? ' (BOT)' : ''}` : `SEAT ${i + 1}: EMPTY`;
      if (ui.button(`pt:${i}`, 16, y, ui.W - 32, 20, label, { align: 'left', color: he ? 'white' : 'mist', disabled: i === 0 && false })) { if (!he) this.push('joinclass', { seatJoin: i }); else if (i > 0) this.play.leaveSeat(i); }
    }
    ui.text(16, 56 + 4 * 24 + 4, `PADS SEEN: ${pads}. HUMANS: ${humans.length}.`, { color: 'mist' });
    for (let p = 0; p < 4; p++) { const seatN = ui.router.padSeat[p]; if (seatN > 0 && ui.router.padHeld(p, 9)) { s.hold = (s.hold ?? 0) + 1 / 60; if (s.hold > 1) { s.hold = 0; this.play.leaveSeat(seatN); } } }
    footer(ui, [['confirm', 'JOIN OR LEAVE'], ['back', 'BACK']]);
  }
  screen_joinclass(ui, s, w, h, m) {
    header(ui, `SEAT ${s.seatJoin + 1}: PICK A TRADE`);
    ['bellwarden', 'lamplighter', 'sexton'].forEach((c, i) => { const y = 34 + i * 44; const st = ui.widget(`jc:${c}`, 16, y, ui.W - 32, 40, {}); ui.frame(16, y, ui.W - 32, 40, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night'); ui.text(24, y + 6, CLASSES[c].name, { color: CLASSES[c].color, scale: 2 }); ui.text(24, y + 25, CLASSES[c].fantasy, { color: 'mist' }); if (st.act) { this.play.joinSeat(s.seatJoin, c, s.pad); this.pop(); } });
    footer(ui, [['confirm', 'JOIN'], ['back', 'BACK']]);
  }
  screen_knell(ui, s, w, h, m) {
    header(ui, 'THE KNELL FONT');
    const unlocked = w.unlocks.knell;
    tabs(ui, s, ['RUN', 'GRAND', 'DIFFICULTY'], m);
    if (s.tab === 0) {
      ui.para(16, 30, 'A RANDOM DUNGEON WITH MODIFIERS. KILLS FILL THE KNELL. WHEN IT TOLLS, A WARDEN COMES FOR YOU.', ui.W - 32);
      if (unlocked) { if (ui.button('kn:start', ui.W / 2 - 70, 80, 140, 24, 'RING THE FONT')) { this.play.command({ c: 'knell' }, h.seat); this.closeAll(); } } else ui.textC(ui.W / 2, 90, 'IT WILL NOT ANSWER UNTIL THE GREAT BELL RINGS TRUE.', { color: 'mist' });
      const b = w.bests[h.cls]; if (b) ui.textC(ui.W / 2, 120, `RUNS: ${b.knells}  BEST TIER: ${b.tier}${b.time ? ` IN ${Math.floor(b.time / 60)}:${String(b.time % 60).padStart(2, '0')}` : ''}`, { color: 'sand' });
    } else if (s.tab === 1) {
      s.tier ??= 1; ui.para(16, 30, 'A GRAND KEY OPENS A 10-MINUTE KNELL. MONSTER LIFE RISES 17% A TIER, DAMAGE 8%.', ui.W - 32);
      ui.textC(ui.W / 2, 62, `GRAND KEYS: ${h.mats.keys}`, { color: 'sand' });
      if (ui.button('gk:minus', ui.W / 2 - 80, 78, 26, 24, '<')) s.tier = Math.max(0, s.tier - 1); if (ui.button('gk:plus', ui.W / 2 + 54, 78, 26, 24, '>')) s.tier = Math.min(150, s.tier + 1);
      ui.textC(ui.W / 2, 82, `TIER ${s.tier}`, { color: 'sky', scale: 2 });
      ui.textC(ui.W / 2, 108, `LIFE X${(1.17 ** s.tier).toFixed(1).replace('X', '')} DAMAGE X${(1.08 ** s.tier).toFixed(1)}`, { color: 'mist' });
      if (ui.button('gk:start', ui.W / 2 - 70, 124, 140, 24, 'TURN THE KEY', { disabled: h.mats.keys < 1 || !unlocked })) { this.play.command({ c: 'knell', grand: s.tier }, h.seat); this.closeAll(); }
    } else {
      DIFFICULTIES.forEach((d, i) => { const dis = d.locked && !w.unlocks.penance; if (ui.button(`df:${d.id}`, 16, 28 + i * 20, ui.W - 32, 18, `${d.name}  LIFE X${d.hp}  DAMAGE X${d.dmg}  LOOT X${d.leg}${dis ? '  LOCKED' : ''}`, { align: 'left', border: w.difficulty === i ? 'sand' : 'slate', disabled: dis })) this.play.command({ c: 'difficulty', i }, h.seat); });
    }
    footer(ui, [['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
  screen_knellresults(ui, s, w, h) {
    ui.rect(ui.W / 2 - 150, 30, 300, ui.H - 60, 'ink'); ui.frame(ui.W / 2 - 150, 30, 300, ui.H - 60, 'sand', 'ink');
    ui.textC(ui.W / 2, 40, s.tier !== null && s.tier !== undefined ? `GRAND KNELL TIER ${s.tier}` : 'THE KNELL IS SILENT', { color: 'sand', scale: 2 });
    const t = s.time ?? 0; ui.textC(ui.W / 2, 70, 'TIME', { color: 'mist' }); ui.textC(ui.W / 2, 80, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, { color: s.beat ? 'lime' : 'red', scale: 3 });
    if (s.tier !== null && s.tier !== undefined) ui.textC(ui.W / 2, 110, s.beat ? 'THE BELL IS IMPRESSED' : 'TOO SLOW. THE BELL NOTES IT.', { color: s.beat ? 'lime' : 'red' });
    const b = w.bests[h.cls]; if (b) ui.textC(ui.W / 2, 124, `BEST TIER FOR A ${CLASSES[h.cls].name}: ${b.tier}`, { color: 'mist' });
    if (ui.button('kr:ok', ui.W / 2 - 60, ui.H - 60, 120, 20, 'TAKE THE LOOT')) this.pop();
  }
  screen_writs(ui, s, w, h) {
    header(ui, "THE CRIER'S WRITS");
    if (!w.story.writs) this.play.command({ c: 'writs' }, h.seat);
    ui.para(16, 28, 'THREE JOBS OF WORK. FINISH ALL THREE FOR A CACHE.', ui.W - 32, { color: 'mist' });
    (w.story.writs ?? []).forEach((j, i) => { const y = 50 + i * 26; ui.frame(16, y, ui.W - 32, 22, j.done ? 'lime' : 'slate', 'night'); drawIcon(ui, 20, y + 5, j.done ? 'check' : 'scroll'); ui.text(38, y + 8, `${j.text}${j.goal ? ` ${j.n}/${j.goal}` : ''}`, { color: j.done ? 'lime' : 'white' }); });
    ui.textC(ui.W / 2, 136, `CACHES EARNED: ${w.story.writCaches ?? 0}`, { color: 'sand' });
    if (ui.button('wr:ok', ui.W / 2 - 50, 150, 100, 18, 'UNDERSTOOD')) this.pop();
    footer(ui, [['back', 'BACK']]);
  }
  screen_death(ui, s, w, h) {
    s.noBack = true;
    const H = 96; const y = ui.H / 2 - H / 2;
    ui.frame(ui.W / 2 - 170, y, 340, H, 'red', 'ink');
    const lines = ui.wrap(s.text ?? 'YOU HAVE DIED. AGAIN. IT IS BECOMING A HABIT.', 320);
    lines.forEach((l, i) => ui.textC(ui.W / 2, y + 8 + i * 9, l, { color: 'red' }));
    const left = Math.ceil(Math.max(0, h.respawnWait - h.deadT)); const ready = left <= 0;
    const canKnell = !!w.knell;
    if (ui.button('dd:here', ui.W / 2 - 150, y + 30, 300, 18, ready ? 'RISE HERE' : `RISE HERE IN ${left} S`, { disabled: !ready })) { this.play.command({ c: 'respawn', how: 'here' }, h.seat); this.pop(); return; }
    if (ui.button('dd:gate', ui.W / 2 - 150, y + 50, 300, 18, 'LAST LYCHGATE')) { this.play.command({ c: 'respawn', how: 'gate' }, h.seat); this.pop(); return; }
    if (!canKnell && ui.button('dd:town', ui.W / 2 - 150, y + 70, 300, 18, 'TOLLHAVEN')) { this.play.command({ c: 'respawn', how: 'town' }, h.seat); this.pop(); }
    if (!h.dead) this.pop();
  }
  screen_settings(ui, s, w, h, m) { this.play.settings.draw(ui, s, m); }
  screen_dev(ui, s, w, h, m) { drawDevMode(this, ui, s, w, h, m); }
  screen_about(ui, s, w, h, m) {
    header(ui, 'ABOUT AND CREDITS'); const pages = ABOUT_PAGES; const names = pages.map((p) => p.tab); tabs(ui, s, names, m);
    const p = pages[s.tab]; s.scroll ??= 0; if (s.lastTab !== s.tab) { s.scroll = 0; s.lastTab = s.tab; }
    const lines = []; for (const l of p.lines) { const wrap = ui.wrap(l.text ?? l, ui.W - 34); wrap.forEach((t, i) => lines.push({ t, color: l.color ?? (i === 0 && l.head ? 'sand' : 'white') })); }
    const rows = Math.floor((ui.H - 48) / 9);
    if (m.down) s.scroll = Math.min(Math.max(0, lines.length - rows), s.scroll + 2); if (m.up) s.scroll = Math.max(0, s.scroll - 2); if (ui.router.wheel) s.scroll = Math.max(0, Math.min(Math.max(0, lines.length - rows), s.scroll + Math.sign(ui.router.wheel) * 2));
    lines.slice(s.scroll, s.scroll + rows).forEach((l, i) => ui.text(14, 27 + i * 9, l.t, { color: l.color }));
    if (lines.length > rows) { ui.rect(ui.W - 10, 27, 3, rows * 9, 'night'); ui.rect(ui.W - 10, 27 + ((rows * 9 - 10) * s.scroll) / Math.max(1, lines.length - rows), 3, 10, 'mist'); }
    s.allLines = lines;
    footer(ui, [['back', 'BACK']]);
  }
}
export { AFFIXES, TUNING_DEFS, SPEAKERS, canWear, promptLine, SHRINES };
