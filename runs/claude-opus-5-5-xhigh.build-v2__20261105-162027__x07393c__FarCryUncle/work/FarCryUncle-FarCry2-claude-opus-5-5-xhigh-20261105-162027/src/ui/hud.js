// The in-play HUD: minimal, hides 6 s after it last changed. Prompts follow the device used last.
import { THREE } from '../../pixel-engine.js';
import { WEAPONS } from '../content/weapons.js';
import { NAMES, SPEAKER_COLOR } from '../content/dialogue.js';
import { ACT } from '../core/actions.js';
import { drawGlyph, glyphWidth } from './glyphs.js';
import { wrap } from './pixfont.js';
import { clamp } from '../core/rng.js';
const { Vector3 } = THREE;
const _v = new Vector3();
const GUN_ICON = ['.....oooooo.', 'oooooooooooo', 'oooooo.o....', '..oo.o......', '..oo........'];
const SYRETTE = ['..o..', '..o..', '.ooo.', '.oxo.', '.oxo.', '.ooo.', '..o..'];
const TABLET = ['.ooo.', 'ooooo', 'ox.xo', 'ooooo', '.ooo.'];
export const SAFE_X = 24, SAFE_Y = 14;
export class GameHud {
  touched = -99; bannerT = 0; banner = ''; noticeT = 0; noticeText = ''; prompts = []; muzzle = 0; jamT = 0;
  constructor(game) { this.game = game; }
  touch() { this.touched = this.game.realT; }
  addPrompt(act, text, extra) { const g = this.game; this.prompts.push({ act, text, glyph: g.actions.glyph(act, g.settings.glyphs === 'xb'), ...extra }); }
  draw(ctx, dt) {
    const g = this.game, h = ctx.hud;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.noticeT = Math.max(0, this.noticeT - dt);
    this.jamT = Math.max(0, this.jamT - dt);
    g.subtitle.t = Math.max(0, g.subtitle.t - dt);
    if (g.hudHidden) return;
    this.world(ctx);
    if (g.scene.active && g.scene.bars > 0.05) this.bars(h, g.scene.bars);
    const scoped = g.weapons.aiming && g.weapons.def.scoped && g.weapons.aimT > 0.6;
    if (scoped || g.monoT > 0.5) this.scopeMask(h);
    if (g.body.burnScreen > 0.01) this.burnEdges(h, g.body.burnScreen);
    if (g.body.hurtFlash > 0.4 && !g.settings.reduceFlashes) this.hurtEdges(h);
    if (g.body.dirFlash > 0) this.damageDir(h);
    const show = g.realT - this.touched < 6 || g.body.hp < 100 || g.weapons.reloading > 0 || g.weapons.gun?.jam > 0;
    if (g.hasPlayer && !g.scene.active && g.mode !== 'title' && g.mode !== 'lobby' && g.mode !== 'campaign-loading') {
      if (show) { this.vitals(h); this.ammo(h); }
      this.reticle(h, ctx);
    }
    if (!g.ui.open || g.ui.menu.top?.id === 'choice') this.banners(h);
    this.subtitles(h);
    this.promptRow(h);
    this.holdRing(h, ctx);
    // A mouse with nothing to hold on to yet.
    if (ctx.engine.gpu && g.wantLock && g.actions.device === 'kbm' && !ctx.input.pointerLocked && !g.ui.open && !g.subtitle.active && !g.body.surgery && !g.mapUp) { const t = 'CLICK TO LOOK AROUND'; h.text(((h.width - t.length * 6) / 2) | 0, h.height - 62, t, { color: 'sand', shadow: 'ink' }); }
  }
  vitals(h) {
    const g = this.game, b = g.body;
    const x = SAFE_X, y = h.height - SAFE_Y - 11;
    for (let i = 0; i < 5; i++) {
      const v = clamp((b.hp - i * 20) / 20, 0, 1);
      h.rect(x + i * 15, y, 13, 6, 'ink');
      h.rect(x + i * 15 + 1, y + 1, 11, 4, 'night');
      if (v > 0) h.rect(x + i * 15 + 1, y + 1, Math.round(11 * v), 4, b.hp < 20 ? 'red' : b.burning ? 'orange' : 'sand');
    }
    h.sprite(x, y - 10, SYRETTE, { o: 'white', x: 'red' });
    h.text(x + 8, y - 9, String(b.syrettes), { color: 'white' });
    h.sprite(x + 22, y - 9, TABLET, { o: 'white', x: 'ink' });
    h.text(x + 30, y - 9, String(b.tablets), { color: b.feverOn ? 'orange' : 'white' });
    if (g.story?.stones != null && g.mode !== 'round' && g.realT - this.touched < 6) { h.text(x + 46, y - 9, `${g.story.stones} STONES`, { color: 'sand' }); }
  }
  ammo(h) {
    const g = this.game, w = g.weapons;
    if (g.round?.carrying) { /* a case in your hands shows on the Cash Run bar */ }
    if (w.mounted) {
      const x = h.width - SAFE_X - 60, y = h.height - SAFE_Y - 8;
      h.rect(x, y, 60, 6, 'ink'); h.rect(x + 1, y + 1, Math.round(58 * w.heat), 4, w.overheated ? 'red' : 'orange');
      h.text(x, y - 10, 'MOUNTED MG', { color: 'white' });
      return;
    }
    const gun = w.gun, def = w.def;
    if (!gun || g.player.seat) return;
    const color = w.condColor();
    const right = h.width - SAFE_X;
    if (def.cls === 'melee') { h.text(right - def.name.length * 6, h.height - SAFE_Y - 8, def.name, { color: 'mist' }); }
    else {
      const mag = String(Math.ceil(gun.mag)), res = String(gun.reserve);
      const tw = (mag.length + 1 + res.length) * 6;
      h.text(right - tw - 0, h.height - SAFE_Y - 14, mag, { scale: 1, color: gun.mag === 0 ? 'red' : 'white' });
      h.text(right - res.length * 6, h.height - SAFE_Y - 14, res, { color: 'mist' });
      h.text(right - tw + mag.length * 6, h.height - SAFE_Y - 14, '/', { color: 'slate' });
      h.sprite(right - tw - 18, h.height - SAFE_Y - 14, GUN_ICON, { o: color });
      h.text(right - def.name.length * 6, h.height - SAFE_Y - 6, def.name, { color: 'mist' });
    }
    const y = h.height - SAFE_Y - 26;
    if (w.bottles || w.charges || w.placed.length) {
      const t = `BOTTLES ${w.bottles}  CHARGES ${w.charges}${w.placed.length ? ` SET ${w.placed.length}` : ''}`;
      h.text(right - t.length * 6, y, t, { color: 'mist' });
    }
    if (g.actions.bot?.only !== true && (gun.jam > 0 || this.jamT > 0)) { /* prompt added in promptRow */ }
  }
  reticle(h, ctx) {
    const g = this.game, w = g.weapons;
    if (g.mapUp || g.inMonocular() || g.weapons.slung) return;
    if (w.def.scoped && w.aimT > 0.5) return;
    const cx = (h.width / 2) | 0, cy = (h.height / 2) | 0;
    const col = g.interact.current ? 'lime' : 'white';
    h.rect(cx, cy, 1, 1, col);
    if (g.fx.markerT > 0) {
      const c = g.fx.markerHead ? 'red' : 'white', r = 4;
      for (let i = 2; i <= r; i++) { h.rect(cx - i, cy - i, 1, 1, c); h.rect(cx + i, cy - i, 1, 1, c); h.rect(cx - i, cy + i, 1, 1, c); h.rect(cx + i, cy + i, 1, 1, c); }
    }
  }
  bars(h, k) {
    const hh = Math.round(20 * k);
    h.rect(0, 0, h.width, hh, 'ink'); h.rect(0, h.height - hh, h.width, hh, 'ink');
  }
  scopeMask(h) {
    const cx = h.width / 2, cy = h.height / 2, r = Math.floor(h.height * 0.42);
    for (let y = 0; y < h.height; y++) {
      const dy = y - cy, half = Math.abs(dy) >= r ? 0 : Math.sqrt(r * r - dy * dy) | 0;
      if (!half) { h.rect(0, y, h.width, 1, 'ink'); continue; }
      h.rect(0, y, Math.max(0, cx - half), 1, 'ink'); h.rect(cx + half, y, Math.max(0, h.width - cx - half), 1, 'ink');
    }
    h.rect(cx - r, cy, r * 2, 1, 'ink'); h.rect(cx, cy - r, 1, r * 2, 'ink');
  }
  burnEdges(h, k) {
    const r = this.game.rng.fx, w = h.width, H = h.height;
    for (let x = 0; x < w; x += 7) {
      const up = 6 + (r.next() * 26 * k) | 0;
      h.rect(x, H - up, 7, up, r.next() > 0.5 ? 'orange' : 'red');
      h.rect(x + 1, H - (up >> 1), 5, up >> 1, 'sand');
      if (x % 3 === 0) { const d = (r.next() * 12 * k) | 0; h.rect(x, 0, 7, d, 'red'); }
    }
  }
  hurtEdges(h) {
    const w = h.width, H = h.height, t = 4;
    h.rect(0, 0, w, t, 'red'); h.rect(0, H - t, w, t, 'red'); h.rect(0, 0, t, H, 'red'); h.rect(w - t, 0, t, H, 'red');
  }
  damageDir(h) {
    const g = this.game;
    const a = g.body.lastDir - g.player.yaw + Math.PI;
    const cx = h.width / 2, cy = h.height / 2, r = 46;
    const x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r;
    for (let i = 0; i < 5; i++) h.rect(x - 2 + Math.cos(a) * (i - 2) * 2, y - 1 + Math.sin(a) * (i - 2) * 2, 2, 2, 'red');
  }
  banners(h) {
    const g = this.game;
    if (this.bannerT > 0) { const t = this.banner; const lines = wrap(t, h.width - 80); let y = SAFE_Y; for (const l of lines) { h.text(((h.width - l.length * 6) / 2) | 0, y, l, { color: 'sand', shadow: 'ink' }); y += 10; } }
    if (this.noticeT > 0) { const lines = wrap(this.noticeText, h.width - 80); let y = SAFE_Y + 24; for (const l of lines) { h.text(((h.width - l.length * 6) / 2) | 0, y, l, { color: 'white', shadow: 'ink' }); y += 10; } }
    const m = g.missions?.active;
    if (m?.timer) { const t = Math.max(0, Math.ceil(g.missions.timer)); const s = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; h.text(h.width - SAFE_X - s.length * 6 * 2, SAFE_Y, s, { scale: 2, color: t < 60 ? 'red' : 'white' }); }
    if (g.holdT > 0) { const t = Math.ceil(g.holdT); const s = `${t}`; h.text(h.width - SAFE_X - s.length * 6 * 2, SAFE_Y, s, { scale: 2, color: 'sand' }); }
    if (g.mode === 'attract') { h.rect(SAFE_X - 3, SAFE_Y - 2, 34, 11, 'red'); h.text(SAFE_X, SAFE_Y, 'DEMO', { color: 'white', shadow: false }); }
  }
  subtitles(h) {
    const g = this.game, s = g.subtitle;
    if (s.t <= 0 || !s.text) return;
    const scale = g.settings.subtitleSize;
    const lines = wrap(s.text, Math.min(h.width - 60, 60 * 6 * scale), scale).slice(0, 2);
    const y0 = h.height - SAFE_Y - 40 - lines.length * 9 * scale - (g.scene.active ? 8 : 0);
    const name = NAMES[s.who] ?? '';
    const lh = 9 * scale;
    let maxw = 0; for (const l of lines) maxw = Math.max(maxw, l.length * 6 * scale);
    const bx = ((h.width - maxw) / 2) | 0;
    if (name) h.text(bx, y0 - 10, name, { color: SPEAKER_COLOR[s.who] ?? 'white', shadow: 'ink' });
    lines.forEach((l, i) => h.text(((h.width - l.length * 6 * scale) / 2) | 0, y0 + i * lh, l, { color: 'white', scale, shadow: 'ink' }));
  }
  promptRow(h) {
    const list = this.prompts;
    if (!list.length) return;
    let total = 0;
    for (const p of list) total += glyphWidth(p.glyph) + 3 + p.text.length * 6 + 10;
    let x = ((h.width - total + 10) / 2) | 0;
    const y = h.height - SAFE_Y - 24;
    if (this.game.mapUp) h.rect(x - 4, y - 3, total - 2, 17, 'ink');
    for (const p of list) {
      const w = drawGlyph(h, x, y, p.glyph);
      h.text(x + w + 3, y + 2, p.text, { color: p.dim ? 'slate' : 'white', shadow: 'ink' });
      x += w + 3 + p.text.length * 6 + 10;
    }
  }
  holdRing(h, ctx) {
    const f = this.game.interact.holdFrac();
    if (f <= 0) return;
    const cx = h.width / 2, cy = h.height / 2, n = 28, r = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      h.rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2, i / n <= f ? 'sand' : 'night');
    }
  }
  /** Things in the world drawn by projection: ? and ! over soldiers, a pixel cross over a downed friend. */
  world(ctx) {
    const g = this.game, h = ctx.hud, cam = ctx.camera.camera;
    if (g.scene.active) return;
    const project = (x, y, z) => {
      _v.set(x, y, z).project(cam);
      if (_v.z > 1 || _v.z < -1) return null;
      return [((_v.x + 1) / 2) * h.width, ((1 - _v.y) / 2) * h.height];
    };
    for (const s of g.actors.soldiers) {
      if (!s.active || s.dead || g.mode === 'attract') continue;
      const d = Math.hypot(s.x - g.camPos.x, s.z - g.camPos.z);
      if (d > 40) continue;
      if ((s.state === 'idle' && s.suspicion < 0.3) || s.burning > 0) continue;
      const p = project(s.x, s.y + 2.05, s.z);
      if (!p) continue;
      h.text(p[0] - 3, p[1] - 4, s.state === 'alert' ? '!' : '?', { color: s.state === 'alert' ? 'red' : 'sand', shadow: 'ink' });
    }
    for (const b of g.actors.buddies) {
      if (!b.active || !b.isDown) continue;
      const p = project(b.x, b.y + 1.4, b.z);
      if (!p) continue;
      h.rect(p[0] - 1, p[1] - 4, 3, 9, 'red'); h.rect(p[0] - 4, p[1] - 1, 9, 3, 'red');
    }
    if (g.dev.aiText) {
      for (const s of g.actors.soldiers) {
        if (!s.active || s.dead) continue;
        const p = project(s.x, s.y + 2.3, s.z);
        if (p && Math.hypot(s.x - g.camPos.x, s.z - g.camPos.z) < 120) h.text(p[0] - 12, p[1] - 12, `${s.state} ${Math.round(s.hp)}`, { color: 'cyan' });
      }
    }
    g.round?.drawWorldHud?.(ctx, project);
  }
}
