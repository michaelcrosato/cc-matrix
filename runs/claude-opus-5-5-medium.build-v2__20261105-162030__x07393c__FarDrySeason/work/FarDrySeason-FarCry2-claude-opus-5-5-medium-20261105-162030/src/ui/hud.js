// Everything drawn with ctx.hud. The HUD in play is minimal and hides six seconds after it last changed.
import { THREE } from '../../pixel-engine.js';
import { WEAPONS } from '../content/weapons.js';
import { siteById } from '../content/sites.js';
import { clamp } from '../world/geom.js';
import { drawGlyph, glyphOf, glyphWidth } from './glyphs.js';
import { wrap } from './pixfont.js';
const { Vector3 } = THREE;
const v = new Vector3();
const GUN_ICON = { sidearm: ['oooo..', 'oooooo', '.oo...', '.oo...'], main: ['oo.........', 'ooooooooooo', 'ooo.o......', '....o......'], special: ['.oooooooo.', 'oooooooooo', '.oooooooo.', '...oo.....'], melee: ['......oo', '....oo..', '..oo....', 'oo......'], mounted: ['oo.........', 'ooooooooooo', '...oo......', '..oooo.....'] };
export class Hud {
  hudT = 6; prompts = []; noticeT = 0; noticeText = null; holdTimer = null; blackoutT = 0; blackoutText = ''; bloodT = 0;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.h = ctx.hud; }
  touch() { this.hudT = 6; }
  get xbox() { return this.game.settings.glyphs === 'xbox'; }
  glyph(action) { return glyphOf(action, this.game.device, this.xbox); }
  /** A prompt: glyph plus verb, centred at the bottom. */
  promptLine(actions, text, y) {
    const h = this.h, list = Array.isArray(actions) ? actions : [actions], gs = list.map((a) => this.glyph(a));
    const tw = text.length * 6, w = gs.reduce((s, g) => s + glyphWidth(g) + 3, 0) + tw;
    let x = Math.round((h.width - w) / 2);
    h.rect(x - 4, y - 2, w + 8, 14, 'ink');
    for (const g of gs) { drawGlyph(h, x, y, g); x += glyphWidth(g) + 3; }
    h.text(x, y + 2, text, { color: 'white' });
    this.prompts.push(`[${gs.map((g) => g.name).join('+')}] ${text}`);
  }
  promptAt(x, y, action, text, color = 'white') { const g = this.glyph(action); drawGlyph(this.h, x, y, g); this.h.text(x + glyphWidth(g) + 3, y + 2, text, { color }); this.prompts.push(`[${g.name}] ${text}`); return glyphWidth(g) + 3 + text.length * 6; }
  footer(items) { // Bottom-row prompts for menus.
    const h = this.h; let x = 24; const y = h.height - 26;
    for (const [action, text] of items) { x += this.promptAt(x, y, action, text) + 12; }
  }
  world(x, y, z) { v.set(x, y, z).project(this.ctx.camera.camera); if (v.z > 1) return null; return [((v.x + 1) / 2) * this.h.width, ((1 - v.y) / 2) * this.h.height]; }
  // ----- In play -----
  drawPlay(dt) {
    const g = this.game, h = this.h, p = g.player;
    this.hudT = Math.max(0, this.hudT - dt);
    const sw = h.width, sh = h.height;
    const scoped = g.isScoped();
    if (scoped) this.scopeMask();
    if (g.monocularUp) this.monocularMask();
    this.effects(dt);
    // Reticle.
    if (!scoped && !p.vehicle && !p.mapUp && !g.cam.override && !g.monocularUp && !p.surgery) { const cx = sw >> 1, cy = sh >> 1; h.rect(cx - 1 + (p.mounted ? 0 : 0), cy - 1, 2, 2, g.gunSlung() ? 'slate' : 'white'); if (g.combat.hitMark > 0) for (let k = 3; k < 7; k++) for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) h.rect(cx + a * k, cy + b * k, 1, 1, 'white'); }
    if (p.mounted) { const heat = g.combat.heat / WEAPONS.mg.overheat; h.rect((sw >> 1) - 20, (sh >> 1) + 16, 40, 2, 'ink'); h.rect((sw >> 1) - 20, (sh >> 1) + 16, Math.round(40 * heat), 2, g.combat.overheated ? 'red' : 'orange'); }
    // Overheads: the only detection UI.
    for (const a of g.actors.overheads()) { const s = this.world(a.x, a.y + 2.05, a.z); if (s) h.text(Math.round(s[0]) - 3, Math.round(s[1]) - 8, a.state === 'alert' ? '!' : '?', { color: a.state === 'alert' ? 'red' : 'sand' }); }
    // Downed buddy marker.
    const d = g.buddies.down; if (d) { const s = this.world(d.a.x, d.a.y + 1.5, d.a.z); if (s) { const cx = Math.round(s[0]), cy = Math.round(s[1]); h.rect(cx - 1, cy - 5, 3, 11, 'lime'); h.rect(cx - 5, cy - 1, 11, 3, 'lime'); h.text(cx - 6, cy + 8, String(Math.ceil(d.a.downT)), { color: 'lime' }); } }
    // Stats.
    if (this.hudT > 0 || p.hp < 60 || g.body.feverActive) {
      const seg = 5, sx = 24, sy = sh - 22;
      for (let i = 0; i < seg; i++) { const top = (i + 1) * 20, fill = clamp((p.hp - i * 20) / 20, 0, 1); h.rect(sx + i * 17, sy, 15, 6, 'ink'); h.rect(sx + i * 17, sy, Math.round(15 * fill), 6, p.hp < 20 ? 'red' : top <= g.body.segmentTop() ? 'white' : 'mist'); }
      h.text(sx, sy + 8, `SYRETTE ${p.syrettes}`, { color: 'white' }); h.text(sx + 66, sy + 8, `TABLET ${p.tablets}`, { color: g.body.feverActive ? 'red' : 'white' });
      if (p.stones || this.hudT > 0) h.text(24, sh - 34, `STONES ${p.stones}`, { color: 'sand' });
      if (p.carrying) h.text(24, sh - 46, 'CARRYING A CASE', { color: 'sand' });
    }
    if ((this.hudT > 0 || g.combat.current()?.jammed) && !p.vehicle) {
      const gun = g.combat.current();
      if (gun) {
        const w = WEAPONS[gun.id], x = sw - 24;
        if (!w.melee && gun.id !== 'mg') { const t = `${gun.mag}/${gun.reserve}`; h.text(x - t.length * 6, sh - 14, t, { color: 'white' }); }
        const col = gun.jammed ? 'red' : gun.cond >= 60 ? 'white' : gun.cond >= 30 ? 'orange' : 'red';
        const icon = GUN_ICON[w.slot] ?? GUN_ICON.main;
        h.sprite(sw - 24 - icon[0].length, sh - 24, icon, { o: col });
        h.text(sw - 24 - w.name.length * 6, sh - 34, w.name, { color: 'mist' });
        if (p.molotovs) { const t = `BOTTLE ${p.molotovs}`; h.text(sw - 24 - t.length * 6, sh - 54, t, { color: 'white' }); }
        if (p.charges || p.planted.length) { const t = `CHARGE ${p.charges}${p.planted.length ? '*' : ''}`; h.text(sw - 24 - t.length * 6, sh - 44, t, { color: p.planted.length ? 'red' : 'white' }); }
      }
    }
    // Vehicle state.
    if (p.vehicle && !p.mounted) { const veh = p.vehicle; h.text(sw - 24 - 60, sh - 14, `${Math.round(Math.abs(veh.v.speed) * 3.6)} KM/H`, { color: 'white' }); if (veh.hp < 35) h.text(sw - 24 - 66, sh - 24, veh.stalled ? 'ENGINE DEAD' : 'ENGINE HOT', { color: 'red' }); }
    // Mission step at the top for five seconds.
    const M = g.missions; if (M.textT > 0 && M.textStr) { const lines = wrap(M.textStr, Math.min(60, Math.floor((sw - 16) / 6))); lines.forEach((l, i) => h.text(0, 16 + i * 10, l, { anchor: 'top', color: 'sand' })); }
    if (this.holdTimer !== null) h.text(0, 40, `HOLD ${Math.ceil(this.holdTimer)}`, { anchor: 'top', color: 'orange', scale: 2 });
    if (g.side) h.text(0, 40, `CRATE: ${Math.ceil(g.side.t)} S`, { anchor: 'top', color: g.side.t < 60 ? 'red' : 'sand' });
    if (this.noticeT > 0) { this.noticeT -= dt; h.text(0, 62, this.noticeText, { anchor: 'top', color: 'white' }); }
    // Prompts, then subtitles above them.
    this.promptTop = this.h.height - 44;
    this.drawPrompts();
    this.subtitle();
    // The tracker's small readout sits on its own device, and the wind on the GPS.
    if (g.tracker.up) { const near = g.tracker.nearestD; h.text(0, 24, near < 60 ? 'SIGNAL' : 'NO SIGNAL', { anchor: 'top', color: near < 60 ? 'lime' : 'slate' }); }
    if (g.ledgerUp) this.ledgerSheet();
    if (g.demoTag) { h.rect(0, 0, 46, 14, 'red', 'top-left'); h.text(6, 4, 'DEMO', { color: 'white' }); this.promptAt(sw - 90, 4, 'confirm', 'PRESS'); }
  }
  drawPrompts() {
    const g = this.game, h = this.h, P = g.prompt, p = g.player, baseY = h.height - 44;
    let y = baseY;
    const line = (a, t) => { this.promptLine(a, t, y); y -= 14; this.promptTop = y + 14; };
    if (p.mapUp) { line('mark', 'SET WAYPOINT'); line('zoom', 'ZOOM'); line('map', 'PUT IT AWAY'); return; }
    if (P.choice) { const c = P.choice, x0 = Math.round(h.width / 2) - 100; h.rect(x0 - 6, y - 4, 212, 16, 'ink'); this.promptTop = y - 4; let x = x0; if (c.use) x += this.promptAt(x, y, 'use', c.use, 'lime') + 14; else { h.text(x, y + 2, 'NO SYRETTES', { color: 'slate' }); x += 80; } this.promptAt(x, y, 'finish', c.finish, c.radio ? 'mist' : 'red'); y -= 16; }
    if (p.surgery) return;
    if (P.current) {
      const c = P.current;
      if (c.passive) { if (this.hudT > 3) line('exit', c.label); }
      else {
        line('use', c.label);
        if (c.hold) { const k = clamp(P.holdT / c.hold, 0, 1), W = 80; h.rect((h.width - W) >> 1, y + 12, W, 3, 'ink'); h.rect((h.width - W) >> 1, y + 12, Math.round(W * k), 3, 'orange'); }
      }
    }
    const veh = p.vehicle;
    if (veh && this.hudT > 3) { if (p.mounted) line('swap', 'BACK TO THE WHEEL'); else if (veh.t.gun) line('swap', 'SWAP TO GUN'); }
    if (g.body.feverActive && g.story.feverOn || g.body.feverActive && g.missions.step?.script === 'm1Wake') line('tablet', 'TABLET');
    if (p.hp < 20 && p.hp > 0 && !p.vehicle) line('heal', 'FIELD SURGERY');
    if (P.flashT > 0 && P.flashText) line(P.flashAction, P.flashText);
    const gun = g.combat.current();
    if (gun?.jammed && !(P.flashT > 0)) line('reload', `CLEAR THE JAM x${gun.jamLeft}`);
    if (p.planted.length && !p.vehicle) line('throw', 'DETONATE');
  }
  subtitle() {
    const s = this.game.talk.subtitle(), h = this.h, scale = this.game.settings.subtitle === 'large' ? 2 : 1;
    const base = Math.min(h.height - 60, (this.promptTop ?? h.height) - 6) - (scale - 1) * 20;
    if (s) {
      const cols = Math.min(scale === 2 ? 38 : 72, Math.floor((h.width - 16) / (6 * scale))), lines = wrap(s.text, cols), lh = scale * 10;
      const topY = base - lines.length * lh;
      if (s.who) h.text(0, topY - lh + scale, s.who, { anchor: 'top', color: s.color, scale: 1 });
      lines.forEach((l, i) => h.text(0, topY + i * lh + scale, l, { anchor: 'top', color: 'white', shadow: 'ink', scale }));
    } else if (this.game.talk.barkText && this.game.talk.barkT > 0) h.text(0, base - 10, this.game.talk.barkText, { anchor: 'top', color: 'mist' });
  }
  effects(dt) {
    const g = this.game, h = this.h, p = g.player;
    if (p.burning > 0) { const r = g.world.look; for (let i = 0; i < 26; i++) { const e = r.next(), x = r.next() * h.width, k = r.next(); const y = e < 0.5 ? h.height - k * 40 : r.next() * h.height, X = e < 0.5 ? x : (e < 0.75 ? k * 30 : h.width - k * 30); h.rect(X | 0, y | 0, 3, 3, r.pick(['orange', 'red', 'sand'])); } }
    if (g.flashBlood > 0) { g.flashBlood -= dt; for (let y = 0; y < h.height; y += 3) { h.rect(0, y, 16, 1, 'red'); h.rect(h.width - 16, y, 16, 1, 'red'); } }
    if (g.body.fever > 0.75 && !g.settings.feverReduced) { const k = (g.body.fever - 0.75) * 4 * 16; for (let y = 0; y < h.height; y += 4) { h.rect(0, y, Math.round(k), 2, 'ink'); h.rect(h.width - Math.round(k), y, Math.round(k), 2, 'ink'); } }
    if (p.mapUp && g.cam.override) { /* the chase camera gives way to the map */ }
  }
  drawBlackout(dt) { const h = this.h; if (this.blackoutT > 0) { this.blackoutT -= dt; h.rect(0, 0, h.width, h.height, 'ink'); if (this.blackoutText) wrap(this.blackoutText.toUpperCase(), 58).forEach((l, i) => h.text(0, 110 + i * 12, l, { anchor: 'top', color: 'sand' })); } }
  scopeMask() {
    const h = this.h, cx = h.width >> 1, cy = h.height >> 1, R2 = 118;
    for (let y = 0; y < h.height; y++) { const d = y - cy, w = d * d < R2 * R2 ? Math.round(Math.sqrt(R2 * R2 - d * d)) : 0; if (!w) h.rect(0, y, h.width, 1, 'ink'); else { h.rect(0, y, cx - w, 1, 'ink'); h.rect(cx + w, y, h.width - cx - w, 1, 'ink'); } }
    h.rect(cx - R2, cy, R2 * 2, 1, 'ink'); h.rect(cx, cy - R2, 1, R2 * 2, 'ink');
  }
  monocularMask() {
    const h = this.h, cx = h.width >> 1, cy = h.height >> 1, R2 = 110;
    for (let y = 0; y < h.height; y++) { const d = y - cy, w = d * d < R2 * R2 ? Math.round(Math.sqrt(R2 * R2 - d * d)) : 0; if (!w) h.rect(0, y, h.width, 1, 'ink'); else { h.rect(0, y, cx - w, 1, 'ink'); h.rect(cx + w, y, h.width - cx - w, 1, 'ink'); } }
    for (let k = -3; k <= 3; k++) h.rect(cx + k * 20, cy + 40, 1, k % 2 ? 3 : 6, 'lime');
  }
  ledgerSheet() {
    const g = this.game, h = this.h, l = g.ledgerNow(); const W = 290, x = (h.width - W) >> 1, y = 44;
    h.rect(x, y, W, 150, 'sand'); h.rect(x + 2, y + 2, W - 4, 146, 'ink');
    h.text(x + 12, y + 10, 'THE LEDGER, IN HIS HAND', { color: 'sand' });
    g.ledgerLines(l).forEach(([k, val], i) => { h.text(x + 12, y + 30 + i * 22, k, { color: 'mist' }); h.text(x + W - 14 - val.length * 12, y + 26 + i * 22, val, { color: 'white', scale: 2 }); });
    this.promptAt(x + 12, y + 134, 'ledger', 'CLOSE');
  }
  // Scene buttons (two at most).
  choiceRects(n) { const w = this.h.width, W = 180, gap = 12, total = n * W + (n - 1) * gap; return Array.from({ length: n }, (_, i) => ({ x: ((w - total) >> 1) + i * (W + gap), y: this.h.height - 60, w: W, h: 20 })); }
  drawScene() {
    const g = this.game, s = g.talk.scene, h = this.h; if (!s) return;
    this.promptTop = h.height - 30; const bars = 22; h.rect(0, 0, h.width, bars, 'ink'); h.rect(0, h.height - bars, h.width, bars, 'ink');
    this.subtitle();
    if (s.choosing) {
      this.choiceRects(s.choices.length).forEach((r, i) => { const f = i === s.focusI; h.rect(r.x, r.y, r.w, r.h, f ? 'orange' : 'night'); h.text(r.x + r.w / 2 - (s.choices[i].text.length * 3), r.y + 6, s.choices[i].text, { color: f ? 'ink' : 'white', shadow: false }); });
      this.footer([['confirm', 'CHOOSE']]);
      this.prompts.push(...s.choices.map((c) => `[CHOICE] ${c.text}`));
    } else if (s.skippable) this.promptAt(h.width - 90, h.height - 18, 'confirm', 'SKIP');
  }
  /** A Timeline scene on top of whatever is drawn: its bars, its line, the way to skip it. */
  drawTimeline() {
    const g = this.game, s = g.scenes, h = this.h, bars = Math.round(s.bars() * 22);
    if (bars > 0) { h.rect(0, 0, h.width, bars, 'ink'); h.rect(0, h.height - bars, h.width, bars, 'ink'); }
    if (s.locks) { this.promptTop = h.height - 30; this.subtitle(); }
    if (s.skippable) { this.promptAt(h.width - 90, h.height - 18, 'confirm', 'SKIP'); this.prompts.push('[SCENE] SKIP'); }
  }
  pointer() { const p = this.ctx.input.pointer; return [((p.x + 1) / 2) * this.h.width, ((1 - p.y) / 2) * this.h.height]; }
  choiceHit(s, n) { const g = this.game; if (!g.mouseMoved) return null; const [x, y] = this.pointer(); const rects = this.choiceRects(n); for (let i = 0; i < n; i++) { const r = rects[i]; if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return null; }
  clicked(s, n) { for (const e of this.ctx.input.buttonEvents) if (!e.down && (e.code === 'MouseLeft' || e.code === 'Touch')) { const X = ((e.x + 1) / 2) * this.h.width, Y = ((1 - e.y) / 2) * this.h.height, rects = this.choiceRects(n); for (let i = 0; i < n; i++) { const r = rects[i]; if (X >= r.x && X < r.x + r.w && Y >= r.y && Y < r.y + r.h) { s.focusI = i; return true; } } } return false; }
}
export { siteById };
