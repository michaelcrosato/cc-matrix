// The in-game HUD. A candle for life, a class vessel for the resource, big readable icons, nothing dense.
import { CLASSES, SKILLS } from '../data/classes.js';
import { LEVEL_CAP } from '../data/tuning.js';
import { RARITIES } from '../data/items.js';
import { AFFLICTIONS, MODIFIERS } from '../data/monsters.js';
import { SPEAKERS } from '../data/dialog.js';
import { F } from '../data/tuning.js';
import { questName, questText } from '../sim/quests.js';
import { interactTarget } from '../sim/step.js';
import { ICONS, recolor } from './icons.js';
import { prompt, promptLine } from './glyphs.js';

const SKILL_KEYS = ['skill0', 'skill1', 'skill2', 'skill3', 'skill4', 'skill5'];
export const fmt = (n) => { n = Math.round(n); return n > 9999 ? `${(n / 1000).toFixed(1)}K` : n > 999 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}` : String(n); };
export function drawIcon(ui, x, y, id, o = {}) {
  const s = ICONS[id];
  if (s) ui.sprite(x, y, s.rows, o.colors ?? s.colors); else ui.icon(x, y, id, o);
}
const SEAT_COL = ['red', 'blue', 'lime', 'sand'];

export class Hud {
  constructor(ctx, ui, play) { this.ctx = ctx; this.ui = ui; this.play = play; this.toasts = []; this.subs = []; this.banner = null; this.tut = {}; this.tutShow = []; this.mini = { t: 0, rows: [] }; this.flashSlots = {}; this.requiem = null; this.upgrade = null; this.frame = 0; this.meter = 0; this.defendT = 0; }
  toast(text, color = 'white', o = {}) { const key = text.slice(0, 14); const same = this.toasts.find((q) => q.text.slice(0, 14) === key); if (same) { same.text = text; same.t = o.big ? 4 : 3; return; } this.toasts.push({ text, color, t: o.big ? 4 : 3, big: !!o.big, prompt: o.prompt }); if (this.toasts.length > 4) this.toasts.shift(); }
  sub(who, text, t) { this.subs = [{ who, text, t: t ?? Math.max(2.8, text.length * 0.065) }]; }
  draw(w, seat, dt) {
    const ui = this.ui; const h = w.heroes.find((q) => q.seat === seat) ?? w.heroes[0]; if (!h || !h.stats) return;
    this.frame++;
    const humans = this.play.localSeats();
    this.drawWorldLabels(w, seat);
    if (humans.length > 1) this.drawCouch(w, humans, dt); else { this.drawCandle(h); this.drawVessel(h); this.drawBar(w, h); this.drawTop(h); }
    this.drawMinimap(w, seat);
    this.drawObjective(w);
    this.drawBoss(w);
    this.drawKnell(w, dt);
    this.drawToasts(dt);
    this.drawInteract(w, h, seat);
    this.drawTutorial(h);
    this.drawSubs(dt);
    this.drawBanner(dt);
    this.drawPicks(h, dt);
  }
  drawTop(h) {
    const ui = this.ui;
    if (ui.W < 300) { ui.text(4, 4, `LV ${h.level}`, { color: 'sand' }); ui.text(4, 13, fmt(h.gold), { color: 'sand' }); return; }
    ui.text(12, 12, `LV ${h.level}`, { color: 'sand' }); const nx = 12 + ui.measure(`LV ${h.level}`) + 6;
    if (!this.play.world.boss) ui.text(nx, 12, h.name, { color: 'white' });
    const xpf = h.level >= LEVEL_CAP ? this.play.world.devotion.xp / (15000 + 1500 * this.play.world.devotion.level) : h.xp / F.xpToNext(h.level);
    ui.bar(12, 22, 90, 4, xpf, h.level >= LEVEL_CAP ? 'sky' : 'plum', 'ink');
    drawIcon(ui, 12, 29, 'gold-icon');
    ui.text(27, 31, fmt(h.gold), { color: 'sand' });
  }
  drawCandle(h, x = 14, H = 70, W = 16, small = false) {
    const ui = this.ui; const y0 = ui.H - 14 - H; const frac = Math.max(0, h.hp / h.stats.maxHp);
    const melt = Math.round((H - 8) * frac);
    ui.rect(x - 3, ui.H - 14, W + 6, 5, 'orange'); ui.rect(x - 5, ui.H - 11, W + 10, 3, 'plum');
    ui.rect(x, y0, W, H, 'night');
    const top = ui.H - 14 - melt;
    ui.rect(x + 1, top, W - 2, melt, frac < 0.3 ? 'red' : 'white');
    ui.rect(x + 1, top, 3, melt, 'sand');
    ui.rect(x + 2, top - 1, W - 4, 2, frac < 0.3 ? 'orange' : 'sand');
    if (h.shield > 0) ui.rect(x - 2, y0, 2, H, 'sky');
    // The flame gutters as life falls.
    const g = this.frame % (frac < 0.3 ? 4 : 10) < 2 ? 1 : 0; const fh = 5 + Math.round(frac * 5) + g; const cx = x + W / 2;
    ui.rect(cx - 2, top - fh - 1, 4, fh, 'orange'); ui.rect(cx - 1, top - fh + 1, 2, fh - 2, 'sand'); ui.rect(cx - 1, top - 2, 1, 2, 'ink');
    if (!small) ui.text(x + W + 6, ui.H - 22, `${fmt(h.hp)}`, { color: frac < 0.3 ? 'red' : 'white' });
  }
  drawVessel(h, xr = null, S = 20) {
    const ui = this.ui; const x = xr ?? ui.W - 40; const y = ui.H - 62; const cls = h.cls; const f = h.res / h.stats.maxResource;
    const W = 28; const H = 46;
    if (cls === 'bellwarden') {
      ui.rect(x + 11, y, 6, 4, 'orange');
      for (let i = 0; i < H - 6; i++) { const yy = y + 4 + i; const hw = 5 + Math.floor((i / (H - 6)) * 9) + (i > H - 12 ? 3 : 0); const filled = i >= (H - 6) * (1 - f); ui.rect(x + 14 - hw, yy, hw * 2, 1, filled ? 'sand' : 'night'); ui.rect(x + 14 - hw, yy, 1, 1, 'orange'); ui.rect(x + 14 + hw - 1, yy, 1, 1, 'orange'); }
    } else if (cls === 'lamplighter') {
      ui.rect(x + 9, y, 10, 3, 'orange'); ui.rect(x + 5, y + 3, 18, 3, 'orange');
      ui.rect(x + 3, y + 6, 22, H - 10, 'night'); const fh = Math.round((H - 12) * f); ui.rect(x + 4, y + H - 5 - fh, 20, fh, 'orange'); ui.rect(x + 8, y + H - 5 - Math.round(fh * 0.7), 12, Math.round(fh * 0.7), 'sand');
      ui.rect(x + 3, y + 6, 1, H - 10, 'mist'); ui.rect(x + 24, y + 6, 1, H - 10, 'mist'); ui.rect(x + 3, y + H - 4, 22, 3, 'orange');
    } else {
      ui.rect(x + 7, y + 1, 14, 3, 'mist'); ui.rect(x + 4, y + 4, 20, H - 6, 'night'); const fh = Math.round((H - 9) * f); ui.rect(x + 5, y + H - 3 - fh, 18, fh, 'lime');
      for (let i = 0; i < 4; i++) { const yy = y + H - 8 - i * 9; if (y + H - 3 - fh <= yy) ui.rect(x + 8 + (i % 2) * 6, yy, 6, 3, 'sand'); }
      ui.rect(x + 4, y + 4, 1, H - 6, 'mist'); ui.rect(x + 23, y + 4, 1, H - 6, 'mist');
    }
    ui.textC(x + 14, y + H + 3, Math.round(h.res), { color: 'white' });
  }
  drawBar(w, h) {
    const ui = this.ui; const narrow = ui.W < 300; const S = narrow ? 18 : 26; const G = narrow ? 1 : 3; const total = S * 6 + G * 5 + 2 * (S - 6) + 8; let x = Math.max(2, Math.round(ui.W / 2 - total / 2)); const y = ui.H - S - (narrow ? 58 : 12);
    // Potion and dodge.
    const pf = h.potionCd / w.tuning.potionCd; const dx0 = x; this.slotBox(x, y + 6, S - 6, 'potion-red', pf, h.potionCd); x += S - 6 + G;
    const df = w.tuning.dodgeCd ? h.dodgeCd / w.tuning.dodgeCd : 0; const dx1 = x; this.slotBox(x, y + 6, S - 6, 'dash-icon', df, h.dodgeCd); x += S - 6 + 8;
    for (let i = 0; i < 6; i++) {
      const s = h.slots[i]; const open = h.level >= [1, 1, 3, 6, 9, 12][i];
      if (!open) { ui.frame(x, y, S, S, 'night', 'ink'); drawIcon(ui, x + (S - 12) / 2, y + (S - 12) / 2, 'lock'); x += S + G; continue; }
      if (!s.skill) { ui.frame(x, y, S, S, 'slate', 'ink'); this.btnGlyph(x, y, S, i); x += S + G; continue; }
      const sk = SKILLS[s.skill]; const left = Math.max(0, (h.cds[s.skill] ?? 0) - w.time); const cd = sk.cd ?? (s.tone && sk.tones[s.tone].cd) ?? 1;
      const noRes = (sk.cost ?? 0) > h.res;
      const flash = (this.flashSlots[i] ?? 0) > 0; if (flash) this.flashSlots[i] -= 1 / 60;
      ui.frame(x, y, S, S, flash ? 'red' : noRes ? 'plum' : 'mist', 'night');
      drawIcon(ui, x + (S - 12) / 2, y + (S - 14) / 2, sk.icon);
      if (left > 0) { const fh = Math.round((S - 2) * Math.min(1, left / cd)); ui.rect(x + 1, y + 1, S - 2, fh, 'ink'); ui.textC(x + S / 2, y + 9, left > 9.9 ? Math.round(left) : left.toFixed(1), { color: 'white' }); }
      if (noRes && left <= 0) { ui.rect(x + 1, y + S - 4, S - 2, 3, 'red'); }
      this.btnGlyph(x, y, S, i);
      x += S + G;
    }
    prompt(ui, dx1, y - 5, 'dodge'); prompt(ui, dx0, y - 5, 'potion');
  }
  btnGlyph(x, y, S, i) { const dev = this.ui.router.lastDevice === 'pad' ? 'pad' : 'kbm'; const bw = dev === 'pad' ? 11 : 10; prompt(this.ui, x + S - bw + 2, y - 6, SKILL_KEYS[i], dev); }
  slotBox(x, y, S, icon, frac, left) {
    const ui = this.ui; ui.frame(x, y, S, S, 'mist', 'night'); drawIcon(ui, x + 4, y + 4, icon);
    if (left > 0) { ui.rect(x + 1, y + 1, S - 2, Math.round((S - 2) * Math.min(1, frac)), 'ink'); ui.textC(x + S / 2, y + 7, Math.ceil(left), { color: 'white' }); }
  }
  drawCouch(w, seats) {
    const ui = this.ui;
    seats.forEach((seat, i) => {
      const h = w.heroes.find((q) => q.seat === seat); if (!h) return;
      const pw = 112; const px = i % 2 === 0 ? 8 : ui.W - pw - 8; const py = i < 2 ? ui.H - 42 : (i % 2 === 0 ? 34 : 72);
      ui.frame(px, py, pw, 34, SEAT_COL[seat], 'ink');
      ui.text(px + 4, py + 2, `LV ${h.level} ${CLASSES[h.cls].name}`, { color: SEAT_COL[seat] });
      ui.bar(px + 4, py + 10, pw - 8, 5, h.hp / h.stats.maxHp, h.dead ? 'slate' : 'white', 'night');
      ui.bar(px + 4, py + 15, pw - 8, 3, h.res / h.stats.maxResource, 'sand', 'night');
      for (let k = 0; k < 6; k++) { const sl = h.slots[k]; if (!sl.skill) continue; const left = Math.max(0, (h.cds[sl.skill] ?? 0) - w.time); const ix = px + 4 + k * 17; drawIcon(ui, ix, py + 20, SKILLS[sl.skill].icon); if (left > 0) ui.rect(ix, py + 20, 12, 12, 'ink'); }
      if (h.dead) ui.text(px + 4, py + 22, 'FALLEN. HELP THEM UP', { color: 'red' });
    });
  }
  drawMinimap(w, seat) {
    const ui = this.ui; const W = ui.W < 300 ? 44 : 72; const H = ui.W < 300 ? 33 : 54; const X = ui.W - W - (ui.W < 300 ? 4 : 12); const Y = ui.W < 300 ? 4 : 12; const z = w.zone; const h = w.heroes.find((q) => q.seat === seat) ?? w.heroes[0];
    if (!z.explored) z.explored = new Uint8Array(z.w * z.h);
    this.mini.t -= 1;
    const cx = Math.round(h.x); const cz = Math.round(h.z);
    if (this.mini.t <= 0) {
      this.mini.t = 12; const rows = [];
      // Each pixel is a metre: north-up in screen terms is rotated, so show it as an iso-less top view.
      for (let y = 0; y < H; y++) {
        let r = '';
        for (let x = 0; x < W; x++) {
          const gx = cx + x - W / 2; const gz = cz + y - H / 2; let ch = '.';
          if (gx >= 0 && gz >= 0 && gx < z.w && gz < z.h && z.explored[gz * z.w + gx]) { const c = z.rows[gz][gx]; ch = c === '#' ? 'm' : c === '.' ? 'n' : c === '~' ? 't' : '.'; }
          r += ch;
        }
        rows.push(r);
      }
      this.mini.rows = rows;
    }
    ui.frame(X - 1, Y - 1, W + 2, H + 2, 'mist', 'ink');
    ui.sprite(X, Y, this.mini.rows, { m: 'mist', n: 'night', t: 'teal' });
    const dot = (x, zz, col, sz = 2) => { const px = X + W / 2 + (x - cx); const py = Y + H / 2 + (zz - cz); if (px >= X && px < X + W - 1 && py >= Y && py < Y + H - 1) ui.rect(px, py, sz, sz, col); };
    for (const p of w.props) { if (!p.interact || p.used || p.hidden) continue; if (p.kind === 'npc' || p.kind === 'exit' || p.kind === 'lychgate' || p.kind === 'relic' || p.kind === 'coffin' || p.kind === 'shrine') { const ex = z.explored[Math.floor(p.z) * z.w + Math.floor(p.x)]; if (ex || p.kind === 'npc') dot(p.x, p.z, p.kind === 'exit' ? 'sky' : p.kind === 'lychgate' ? 'cyan' : p.kind === 'npc' ? 'lime' : 'orange'); } }
    for (const m of w.monsters) { if (m.dead || m.dormant) continue; dot(m.x, m.z, m.elite ? 'sand' : 'red', m.defn?.boss ? 3 : 1); }
    for (const o of w.heroes) if (!o.left) dot(o.x, o.z, 'white', 2);
    const obj = this.play.objective?.(); if (obj?.x !== undefined) { const px = Math.max(X, Math.min(X + W - 2, X + W / 2 + (obj.x - cx))); const py = Math.max(Y, Math.min(Y + H - 2, Y + H / 2 + (obj.z - cz))); if (this.frame % 30 < 20) ui.rect(px, py, 3, 3, 'sand'); }
  }
  drawObjective(w) {
    const ui = this.ui; const y = (ui.W < 300 ? 40 : 72); const text = questText(w);
    if (w.mode === 'campaign' && text) {
      const lines = ui.wrap(text, 160); const nm = questName(w);
      ui.textR(ui.W - 12, y, nm, { color: 'sand' });
      lines.forEach((l, i) => ui.textR(ui.W - 12, y + 10 + i * 9, l, { color: 'white' }));
    }
    let yy = y + 34;
    if (w.coffin) { ui.textR(ui.W - 12, yy, `THE COFFIN: ${Math.ceil(w.coffin.t)} S`, { color: 'red' }); yy += 10; }
    if (w.novices?.active) { ui.textR(ui.W - 12, yy, `HOLD: ${Math.ceil(w.novices.t)} S`, { color: 'red' }); yy += 10; }
    if (w.wagon?.active && w.wagon.blocked) { ui.textR(ui.W - 12, yy, 'THE WAGON WAITS FOR YOU', { color: 'sand' }); yy += 10; }
    if (w.requiem.n >= 3 && w.requiem.t > 0) ui.textR(ui.W - 12, yy, `${w.requiem.n} KILL REQUIEM`, { color: w.requiem.n >= 10 ? 'orange' : 'mist' });
  }
  drawBoss(w) {
    const ui = this.ui; const b = this.play.bossInfo(w); if (!b) return;
    const W = Math.min(220, ui.W - 220); const X = ui.W / 2 - W / 2; const Y = 14;
    ui.frame(X - 2, Y - 2, W + 4, 12, 'mist', 'ink');
    ui.rect(X, Y, W * Math.max(0, b.frac), 8, 'red');
    for (const t of b.ticks) ui.rect(X + W * t, Y - 1, 1, 10, 'white');
    ui.textC(ui.W / 2, Y + 12, b.name, { color: 'orange' });
  }
  drawKnell(w, dt) {
    const k = w.knell; if (!k) return; const ui = this.ui;
    const f = Math.min(1, k.meter / k.total); this.meter += (f - this.meter) * Math.min(1, dt * 8);
    const cx = ui.W < 300 ? ui.W / 2 - 20 : ui.W / 2; const y = ui.W < 300 ? 4 : 12; const H = ui.W < 300 ? 18 : 30;
    if (k.stage === 'fill') {
      for (let i = 0; i < H; i++) { const hw = 5 + Math.floor((i / H) * 12) + (i > H - 6 ? 4 : 0); const filled = i / H >= 1 - this.meter; ui.rect(cx - hw, y + i, hw * 2, 1, filled ? 'orange' : 'night'); ui.rect(cx - hw, y + i, 1, 1, 'sand'); ui.rect(cx + hw - 1, y + i, 1, 1, 'sand'); }
      ui.rect(cx - 3, y - 3, 6, 3, 'sand');
      ui.textC(cx, y + H + 2, ui.W < 300 ? `${Math.floor(this.meter * 100)}%` : `THE KNELL ${Math.floor(this.meter * 100)}%`, { color: 'sand' });
    }
    if (k.grand) { const t = Math.max(0, k.grand.t); ui.text(ui.W / 2 + 34, 14, `TIER ${k.grand.tier}`, { color: 'sky' }); ui.text(ui.W / 2 + 34, 24, `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, { color: t < 60 ? 'red' : 'white', scale: 1 }); }
    let yy = this.play.localSeats().length > 1 ? 72 : 40; if (!w.round) for (const m of k.mods) { ui.text(12, yy, MODIFIERS[m].name, { color: 'mist' }); yy += 9; }
  }
  drawToasts(dt) {
    const ui = this.ui; let y = 62;
    for (let i = this.toasts.length - 1; i >= 0; i--) { const t = this.toasts[i]; t.t -= dt; if (t.t <= 0) { this.toasts.splice(i, 1); continue; } }
    for (const t of this.toasts) {
      const s = t.big ? 2 : 1; const lines = ui.wrap(t.text, ui.W - 200, s);
      for (const l of lines) { const w = ui.measure(l, s); ui.text(ui.W / 2 - w / 2, y, l, { color: t.color, scale: s }); y += 9 * s; }
      if (t.prompt) { const w = ui.measure('CHANGE') + 16; prompt(ui, ui.W / 2 - w / 2, y, t.prompt); ui.text(ui.W / 2 - w / 2 + 14, y + 2, 'CHANGE', { color: 'mist' }); y += 12; }
      y += 3;
    }
    if (this.upgrade) {
      this.upgrade.t -= dt; if (this.upgrade.t <= 0 || this.upgrade.gone) this.upgrade = null;
      else { const u = this.upgrade; const label = `UPGRADE: ${u.name}`; const lw = ui.measure(label) + 28; const x = ui.W / 2 - lw / 2; const yy = ui.H - 64; ui.frame(x - 3, yy - 3, lw + 6, 17, RARITIES[u.rarity].color, 'ink'); prompt(ui, x, yy, 'equip'); ui.text(x + 14, yy + 2, label, { color: RARITIES[u.rarity].color }); }
    }
  }
  drawInteract(w, h, seat) {
    const ui = this.ui; const t = interactTarget(w, h, this.play.router.cycle[seat]); if (!t || h.dead) return;
    const p = this.play.view.project(t.x, 2, t.z, ui); const label = t.label ?? 'USE'; const lw = ui.measure(label); const x = Math.max(12, Math.min(ui.W - lw - 28, p.x - lw / 2 - 7)); const y = Math.max(40, p.y - 12);
    ui.rect(x - 2, y - 2, lw + 20, 15, 'ink');
    prompt(ui, x, y, 'interact'); ui.text(x + 14, y + 2, label, { color: 'white' });
    if (t.hold && h.channel) { ui.bar(x, y + 13, lw + 14, 4, h.channel.t / h.channel.dur, 'sand'); }
  }
  drawTutorial(h) {
    const ui = this.ui; const s = this.tutShow[0]; if (!s) return;
    const lw = ui.measure(s.text) + 16; const x = ui.W / 2 - lw / 2; const y = ui.H - 88;
    ui.frame(x - 4, y - 4, lw + 8, 19, 'sand', 'ink');
    prompt(ui, x, y, s.action); ui.text(x + 14, y + 2, s.text, { color: 'sand' });
  }
  drawSubs(dt) {
    const ui = this.ui; const s = this.subs[0]; if (!s) return; s.t -= dt; if (s.t <= 0) { this.subs.shift(); return; }
    const sp = SPEAKERS[s.who] ?? SPEAKERS.hero; const W = Math.min(ui.W - 120, 372); const lines = ui.wrap(s.text, W - 8).slice(0, 3); const H = 12 + lines.length * 9;
    const y = ui.H - 92 - H; const x = ui.W / 2 - W / 2;
    ui.rect(x, y, W, H + 2, 'ink'); ui.text(x + 4, y + 2, sp.name, { color: sp.color });
    lines.forEach((l, i) => ui.text(x + 4, y + 11 + i * 9, l, { color: 'white' }));
  }
  drawBanner(dt) {
    const b = this.banner; if (!b) return; b.t -= dt; if (b.t <= 0) { this.banner = null; return; }
    const ui = this.ui; const s = b.big || ui.measure(b.text, 2) < ui.W - 180 ? 2 : 1; if (b.t > 0.25 || this.frame % 4 < 2) ui.textC(ui.W / 2, this.play.world?.boss ? 46 : 34, b.text, { color: b.big ? 'orange' : 'white', scale: s });
  }
  drawPicks(h) {
    const ui = this.ui; const p = h.levelPicks?.[0]; if (!p) return; const W = 170; const x = ui.W / 2 - W / 2; const y = 70;
    ui.frame(x, y, W, 52, 'sand', 'ink'); ui.textC(ui.W / 2, y + 3, `LEVEL UP: PICK ONE (${Math.ceil(p.t)})`, { color: 'sand' });
    const keys = ['Z', 'X', 'C']; const dpad = ['dleft', 'dup', 'dright'];
    p.opts.forEach((o, i) => { const ly = y + 13 + i * 12; const dev = ui.router.lastDevice; if (dev === 'pad') { const a = ['equip', 'map', 'cycle'][i]; prompt(ui, x + 3, ly, a); } else { ui.frame(x + 3, ly, 10, 11, 'mist', 'night'); ui.text(x + 5, ly + 2, keys[i], { shadow: false }); } ui.text(x + 16, ly + 2, o.label.length > 25 ? o.label.slice(0, 25) : o.label); dpad; });
  }
  drawWorldLabels(w, seat) {
    const ui = this.ui; const view = this.play.view; const hud = ui; const showAll = ui.router.showLabels;
    // Damage numbers.
    for (const n of view.numbers) {
      const p = view.project(n.x, n.y, n.z, hud); const s = n.crit ? 2 : 1;
      if (p.x < 0 || p.y < 0 || p.x > ui.W || p.y > ui.H) continue;
      if (this.frame % 1 === 0) { this.ctx.hud.text(Math.round(p.x - (String(n.text).length * 3 * s)), Math.round(p.y), n.text, { color: n.color, scale: s }); }
    }
    // Item labels.
    const seats = this.play.localSeats(); const placed = [];
    for (const d of w.drops) {
      if (d.kind !== 'item' || (d.seat >= 0 && !seats.includes(d.seat))) continue;
      const r = RARITIES[d.item?.rarity ?? d.rarity ?? 'common']; if (r.order < 2 && !showAll) continue;
      const p = view.project(d.x, 0.7, d.z, hud); const name = d.item?.name ?? d.name ?? ''; const shortName = name.length > 26 ? `${name.slice(0, 25)}.` : name; const lw = ui.measure(shortName);
      if (p.x < 0 || p.x > ui.W) continue;
      const col = seats.length > 1 ? SEAT_COL[d.seat] : r.color; const lx = Math.round(Math.max(2, Math.min(ui.W - lw - 2, p.x - lw / 2)));
      // Labels stack upward rather than print over each other; past six rows they wait for you to come closer.
      let ly = Math.round(p.y - 8); let tries = 0; while (tries < 6 && placed.some((q) => lx < q.x + q.w && q.x < lx + lw + 2 && ly < q.y + 10 && q.y < ly + 10)) { ly -= 10; tries++; }
      if (tries >= 6 || ly < 2) continue;
      placed.push({ x: lx - 1, y: ly, w: lw + 2 });
      this.ctx.hud.rect(lx - 1, ly, lw + 2, 9, 'ink'); this.ctx.hud.text(lx, ly + 1, shortName, { color: col, shadow: false });
    }
    // Monster names: hover, soft lock, elites.
    const hoverM = ui.router.hoverMonster; const bossId = w.boss?.id;
    let shown = 0; const packs = new Set();
    for (const m of w.monsters) {
      if (m.dead || m.dormant || m.id === bossId) continue; const big = m.elite === 'rare' || m.elite === 'champion' || m.defn?.named;
      if (!big && hoverM !== m) continue; if (big && hoverM !== m && packs.has(m.pack)) continue; if (m.pack) packs.add(m.pack); if (shown++ > 6) break;
      const p = view.project(m.x, 1.6 * (m.scale ?? 1) + 0.4, m.z, hud); if (p.x < 0 || p.x > ui.W || p.y < 0) continue;
      const col = m.elite === 'rare' ? 'sand' : m.elite === 'champion' ? 'sky' : 'white';
      const barW = 44; this.ctx.hud.rect(Math.round(p.x - barW / 2), Math.round(p.y), barW, 3, 'ink'); this.ctx.hud.rect(Math.round(p.x - barW / 2), Math.round(p.y), Math.round(barW * (m.hp / m.maxHp)), 3, 'red');
      const lw = ui.measure(m.name); this.ctx.hud.text(Math.round(p.x - lw / 2), Math.round(p.y - 9), m.name, { color: col });
      if (m.affl?.length) { const txt = m.affl.map((a) => AFFLICTIONS[a].name).join(' '); const aw = ui.measure(txt); this.ctx.hud.text(Math.round(p.x - aw / 2), Math.round(p.y - 18), txt, { color: 'mist' }); }
      if (m.resonance > 0) for (let i = 0; i < Math.min(10, m.resonance); i++) this.ctx.hud.rect(Math.round(p.x - barW / 2 + i * 4), Math.round(p.y + 4), 3, 2, 'sand');
    }
    // NPC names.
    for (const p of w.props) {
      if (p.kind !== 'npc' || !this.play.isVisible(p)) continue; const s = view.project(p.x, p.npc === 'crier' ? 3.5 : 2.2, p.z, hud); if (s.x < 0 || s.x > ui.W || s.y < 0 || s.y > ui.H) continue;
      const lw = ui.measure(p.label); this.ctx.hud.text(Math.round(s.x - lw / 2), Math.round(s.y), p.label, { color: 'lime' });
    }
    if (hoverM && !hoverM.elite && !hoverM.dead) { /* drawn above */ }
    void seat;
  }
}
export { promptLine, recolor };
