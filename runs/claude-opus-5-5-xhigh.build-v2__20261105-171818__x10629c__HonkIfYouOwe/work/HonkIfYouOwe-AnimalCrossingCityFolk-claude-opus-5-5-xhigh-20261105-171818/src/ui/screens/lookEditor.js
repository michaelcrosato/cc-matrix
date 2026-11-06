// Change your look with a live preview: hair, colour, eyes. Used by the mirror, the salon and the bus.
import { panel, drawText, inRect } from '../draw.js';
import { HAIR_STYLES, HAIR_COLORS, EYE_STYLES } from '../../art/critter.js';
import { wear } from '../../systems/pocketActions.js';
import { ITEMS } from '../../data/items.js';
import { Menu } from '../ui.js';

const SKIN = ['sand', 'orange', 'white', 'mist', 'plum', 'lime'];
class LookEditor {
  constructor(g, { title, turntable, hairOnly, free, onDone }) {
    this.id = 'lookEditor';
    this.title = title;
    this.turn = !!turntable;
    this.hairOnly = hairOnly;
    this.free = free;
    this.onDone = onDone;
    this.focus = 0;
    this.saved = JSON.stringify(g.world.player.look);
    this.rows = [
      { label: 'Hair', get: (l) => HAIR_STYLES[l.hair], step: (l, d) => { l.hair = (l.hair + d + HAIR_STYLES.length) % HAIR_STYLES.length; } },
      { label: 'Colour', get: (l) => HAIR_COLORS.indexOf(l.hairColor) + 1, step: (l, d) => { l.hairColor = HAIR_COLORS[(HAIR_COLORS.indexOf(l.hairColor) + d + HAIR_COLORS.length) % HAIR_COLORS.length]; } },
    ];
    if (!hairOnly) {
      this.rows.push({ label: 'Eyes', get: (l) => EYE_STYLES[l.eyes], step: (l, d) => { l.eyes = (l.eyes + d + EYE_STYLES.length) % EYE_STYLES.length; } });
      this.rows.push({ label: 'Skin', get: (l) => SKIN.indexOf(l.skin) + 1, step: (l, d) => { l.skin = SKIN[(SKIN.indexOf(l.skin) + d + SKIN.length) % SKIN.length]; } });
    }
    if (free) this.rows.push({ label: 'Wardrobe', get: (l) => ITEMS[l.outfit]?.name ?? '', step: null, action: (gg) => this.wardrobe(gg) });
    this.face = g.player.facing;
  }
  labels() { return this.rows.map((r) => r.label); }
  focusIndex() { return this.focus; }
  wardrobe(g) {
    const w = g.world;
    const items = [];
    w.player.pockets.forEach((s, i) => { if (s && ['clothes', 'hat', 'glasses', 'umbrella'].includes(ITEMS[s.id]?.cat)) items.push({ label: ITEMS[s.id].name, icon: ITEMS[s.id].icon, iconColors: ITEMS[s.id].iconColors, action: (gg, m) => { wear(gg, i, s); gg.ui.pop(m); } }); });
    const look = w.player.look;
    if (look.hatItem) items.push({ label: 'Take off your hat', action: (gg, m) => { gg.world.player.pockets[gg.world.player.pockets.indexOf(null)] = { id: look.hatItem }; look.hatItem = null; gg.player.applyLook(); gg.ui.pop(m); } });
    if (look.glassesItem) items.push({ label: 'Take off your glasses', action: (gg, m) => { gg.world.player.pockets[gg.world.player.pockets.indexOf(null)] = { id: look.glassesItem }; look.glassesItem = null; gg.player.applyLook(); gg.ui.pop(m); } });
    items.push({ label: 'Back', action: (gg, m) => gg.ui.pop(m) });
    g.ui.push(new Menu({ id: 'wardrobe', title: 'Wardrobe', items, x: 130, y: 66, w: 220, itemH: 19, gap: 2, back: (gg, m) => gg.ui.pop(m) }));
  }
  rowRect(i) { return [300, 60 + i * 26, 160, 22]; }
  update(g, inp, dt) {
    const m = inp.mouse;
    if (inp.nav.up) { this.focus = (this.focus + this.rows.length - 1) % this.rows.length; g.sound('uiTick'); }
    if (inp.nav.down) { this.focus = (this.focus + 1) % this.rows.length; g.sound('uiTick'); }
    const l = g.world.player.look;
    const r = this.rows[this.focus];
    const change = (d) => { if (r.step) { r.step(l, d); g.player.applyLook(); g.player.play('Idle', 0); g.sound('uiTick'); } };
    if (inp.nav.left) change(-1);
    if (inp.nav.right) change(1);
    this.rows.forEach((row, i) => {
      const [x, y, w, h] = this.rowRect(i);
      if (inRect(m, x, y, w, h)) {
        if (m.moved) this.focus = i;
        if (m.click) { this.focus = i; if (row.action) row.action(g); else { row.step(l, m.x < x + w / 2 ? -1 : 1); g.player.applyLook(); g.sound('uiTick'); } }
      }
    });
    if (this.turn || g.ui.top === this) g.player.facing += dt * (this.turn ? 1.2 : 0.5);
    if (inp.confirm) {
      if (r.action) { r.action(g); return; }
      g.sound('uiConfirm');
      g.player.facing = this.face;
      g.ui.pop(this);
      this.onDone(true);
      return;
    }
    if (inp.back || m.rclick) {
      g.sound('uiCancel');
      g.world.player.look = JSON.parse(this.saved);
      g.player.applyLook();
      g.player.facing = this.face;
      g.ui.pop(this);
      this.onDone(false);
    }
  }
  prompts() { return [['confirm', this.rows[this.focus]?.action ? 'Open' : 'Keep this'], ['back', 'As I was']]; }
  draw(g, hud) {
    panel(hud, 292, 22, 176, 44 + this.rows.length * 26, { fill: 'white', trim: 'sand' });
    drawText(hud, 380, 32, this.title, { align: 'center', color: 'ink' });
    drawText(hud, 380, 44, 'A very honest reflection.', { align: 'center', color: 'slate' });
    this.rows.forEach((r, i) => {
      const [x, y, w, h] = this.rowRect(i);
      const f = i === this.focus;
      panel(hud, x, y, w, h, { fill: f ? 'sand' : 'white', trim: f ? 'orange' : 'mist' });
      drawText(hud, x + 8, y + 7, r.label, { color: 'ink' });
      drawText(hud, x + w - 8, y + 7, String(r.get(g.world.player.look)), { color: 'plum', align: 'right' });
    });
  }
}
export function* lookEditor(g, o) {
  let result = null;
  const prev = g.camState.zoomOverride;
  g.camState.zoomOverride = 2.3;
  g.ui.push(new LookEditor(g, { ...o, onDone: (r) => { result = r; } }));
  while (result === null) yield;
  g.camState.zoomOverride = prev;
  return result;
}
