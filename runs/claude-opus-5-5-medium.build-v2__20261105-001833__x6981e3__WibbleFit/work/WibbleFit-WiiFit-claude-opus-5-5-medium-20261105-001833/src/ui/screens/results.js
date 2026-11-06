// Results: stars pop in one by one, score, Drips, a line, classmates. Retry / Next / Back.
import { ACTIONS } from '../../core/actions.js';
import { App } from '../../app.js';
import { ACT, ACTIVITIES, STATION_ACTS } from '../../data/activities.js';
import { isOpen } from '../../core/progress.js';
import { ACTIVITY_LINES, BARKS } from '../../data/lines.js';
import { center, say, textWidth, wrap } from '../font.js';
import { Menu } from '../menu.js';
import { promptBar } from '../prompts.js';
import { panel, star, note } from '../widgets.js';

export class Results {
  id = 'results'; t = 0; shown = 0; attractable = false;
  constructor(scene) {
    this.scene = scene; this.data = scene.resultData; this.def = scene.def;
    const lines = ACTIVITY_LINES[this.def.id] ?? ACTIVITY_LINES.tree;
    this.line = lines[`s${this.data.stars}`] ?? lines.s0;
    this.extra = [];
    for (const who of this.data.beat ?? []) this.extra.push(BARKS.beat[who]);
    if (this.data.goalNow) this.extra.push(BARKS.goal[0]);
    for (const m of this.data.milestones ?? []) this.extra.push(m.remark);
    const items = [{ label: 'Retry', on: () => scene.retry() }];
    const next = this.nextAct();
    if (next) items.push({ label: `Next: ${next.name}`, on: () => App.go('activity', { id: next.id, mode: scene.mode, hard: scene.hard }) });
    items.push({ label: scene.mode === 'week' ? (this.def.id === 'longstand' && App.slot && !App.slot.confessed ? 'Continue' : 'Back to the island') : 'Back', on: () => scene.leave() });
    if (this.def.id === 'longstand' && scene.mode === 'week' && App.slot && !App.slot.confessed) items.splice(0, items.length - 1);
    this.menu = new Menu({ items, scale: 1, rowH: 14, onBack: () => scene.leave() });
    App.say(this.line, 'ounce');
  }
  nextAct() {
    if (this.scene.mode !== 'week') { const i = ACTIVITIES.indexOf(this.def); return ACTIVITIES[(i + 1) % ACTIVITIES.length]; }
    const list = STATION_ACTS(this.def.station), i = list.indexOf(this.def);
    for (let k = i + 1; k < list.length; k++) if (isOpen(App.slot, list[k].id)) return list[k];
    return null;
  }
  update(ctx, dt) {
    this.t += dt;
    const want = Math.min(this.data.stars, Math.floor(this.t / 0.45));
    if (want > this.shown) { this.shown = want; App.sfx('starPop', { pitch: this.shown * 2 }); }
    if (this.t > 0.2) this.menu.update(ctx, dt);
  }
  draw(hud) {
    const W = hud.width, H = hud.height, w = Math.min(W - 24, 340), x = Math.round((W - w) / 2), y = 12, h = H - 40 - 12;
    panel(hud, x, y, w, h, 'white', 'teal');
    say(hud, x + 10, y + 6, this.def.name, { color: 'teal', shadow: false, scale: this.def.name.length * 12 > w - 20 ? 1 : 2 });
    // Stars, the one focal element.
    const sc = 2, sw = 33 * sc, sx = Math.round(W / 2 - sw / 2), sy = y + 26;
    for (let i = 0; i < 3; i++) star(hud, sx + i * 11 * sc, sy, i < this.shown, sc);
    const sv = String(Math.round(this.data.score));
    center(hud, sy + 22, sv, { scale: 2, color: 'ink', shadow: false });
    let ty = sy + 42;
    for (const l of wrap(this.line, 52)) { center(hud, ty, l, { color: 'slate', shadow: false }); ty += 10; }
    ty += 2;
    if (this.data.drips > 0) { center(hud, ty, `+${this.data.drips} Drips`, { color: 'teal', shadow: false }); ty += 11; }
    const r = this.def.rivals;
    center(hud, ty, `Dennis ${r.dennis}  June ${r.june}  Marguerite ${r.marguerite}`, { color: 'slate', shadow: false }); ty += 11;
    for (const e of this.extra.slice(0, 2)) for (const l of wrap(e, 52).slice(0, 2)) { center(hud, ty, l, { color: 'plum', shadow: false }); ty += 10; }
    this.menu.y = Math.max(ty + 2, H - 40 - 6 - this.menu.items.length * 14 - 12);
    this.menu.draw(hud);
    promptBar(hud, [['confirm', 'Select'], ['back', 'Back']]);
    note(x, y, w, h, 'results');
  }
}
