// The Almanac: tabs, big silhouettes that fill in. Fish, Bugs, Fossils, Art, Stars, Calendar.
import { panel, drawText, inRect, dim, textBlock } from '../draw.js';
import { drawIcon } from '../../art/icons.js';
import { FISH } from '../../data/fish.js';
import { BUGS } from '../../data/bugs.js';
import { FOSSILS } from '../../data/fossils.js';
import { ART } from '../../data/art.js';
import { CONSTELLATIONS, starName } from '../../systems/stargaze.js';
import { openKeyboard } from './keyboard.js';
import { ITEMS } from '../../data/items.js';
import { SEASON_NAMES, DAY_TYPES, villageDay } from '../../core/calendar.js';

const TABS = ['Fish', 'Bugs', 'Fossils', 'Art', 'Stars', 'Calendar'];
const STARS_TAB = TABS.indexOf('Stars');
const SIL = { o: 'night', x: 'night', w: 'night', '#': 'ink' };
const when = (d) => { const seas = d.seasons?.map((s) => SEASON_NAMES[s]).join(', ') ?? ''; const h = d.hours ? (d.hours[0] > 16 ? ', evenings' : d.hours[1] < 12 ? ', mornings' : ', daytime') : ''; return `${seas}${h}`; };
const YEAR_NOTES = { 1: 'Arrival', 2: 'Museum opens', 3: 'Set the Chime; Vesper', 4: 'The Seed Toss', 5: 'Season turns; Old Rind', 6: 'Fishing Derby', 7: 'Vesper', 8: 'The Lantern Float', 9: 'Fitch moves in', 10: 'Bug-Off', 11: 'Vesper', 12: 'The Great Soup', 13: 'First snow', 14: 'Snowman Contest', 15: 'Vesper', 16: 'The Long Night' };
class Almanac {
  constructor() { this.id = 'almanac'; this.tab = 0; this.focus = 0; this.cols = 6; }
  labels() { return TABS; }
  focusIndex() { return this.tab * 100 + this.focus; }
  entries(g) {
    const w = g.world;
    switch (this.tab) {
      case 0: return FISH.map((f) => ({ id: f.id, name: f.name, known: !!w.almanac.fish[f.id], icon: f.icon, colors: ITEMS[f.id].iconColors, line: f.line, where: `${f.where === 'mouth' ? 'River mouth' : f.where[0].toUpperCase() + f.where.slice(1)}. ${when(f)}.`, donated: w.museum.fish[f.id], beans: f.beans }));
      case 1: return BUGS.map((b) => ({ id: b.id, name: b.name, known: !!w.almanac.bug[b.id], icon: b.icon, colors: ITEMS[b.id].iconColors, line: b.line, where: `On ${b.spot === 'near' ? 'the banks' : b.spot}. ${when(b)}.`, donated: w.museum.bug[b.id], beans: b.beans }));
      case 2: return FOSSILS.map((f) => ({ id: f.id, name: f.name, known: !!w.almanac.fossil[f.id], icon: f.set ? 'bone' : 'ammonite', colors: { o: 'sand', x: 'orange' }, line: f.line, where: f.set ? (f.set === 'moatosaur' ? 'Part of the Moatosaur.' : 'Part of the Long-Necked Regretodon.') : 'A piece on its own.', donated: w.museum.fossil[f.id], beans: f.beans }));
      case 3: return ART.map((a) => ({ id: a.id, name: a.name, known: !!w.almanac.art[a.id], icon: 'picture', colors: { o: 'sky', x: 'orange' }, line: a.line, where: 'Sold after dark, in an alley. Compare it with the print.', donated: w.museum.art[a.id], beans: a.beans }));
      case STARS_TAB: return CONSTELLATIONS.map((c) => ({ id: c.id, name: starName(w, c), known: !!w.almanac.stars[c.id], icon: 'star', colors: { o: 'sand', x: 'white' }, line: 'Up at the Lookout, on a clear night.', where: w.almanac.starNames[c.id] ? 'Named by you, more or less.' : "That's only what people call it. You could do better.", donated: false }));
      default: return [];
    }
  }
  update(g, inp) {
    if (inp.tabPrev) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.focus = 0; g.sound('almanacTurn'); }
    if (inp.tabNext) { this.tab = (this.tab + 1) % TABS.length; this.focus = 0; g.sound('almanacTurn'); }
    const n = this.entries(g).length;
    if (n) {
      if (inp.nav.right) { this.focus = (this.focus + 1) % n; g.sound('uiTick'); }
      if (inp.nav.left) { this.focus = (this.focus + n - 1) % n; g.sound('uiTick'); }
      if (inp.nav.down) { this.focus = Math.min(n - 1, this.focus + this.cols); g.sound('uiTick'); }
      if (inp.nav.up) { this.focus = Math.max(0, this.focus - this.cols); g.sound('uiTick'); }
    }
    if (this.tab === STARS_TAB && inp.confirm) { this.nameFocused(g); return; }
    const m = inp.mouse;
    TABS.forEach((_, i) => { if (m.click && inRect(m, 78 + i * 54, 20, 52, 18)) { this.tab = i; this.focus = 0; g.sound('almanacTurn'); } });
    for (let i = 0; i < n; i++) if (inRect(m, ...this.rect(i))) {
      if (m.moved || m.click) this.focus = i;
      if (m.click && this.tab === STARS_TAB) { this.nameFocused(g); return; }
    }
    if (inp.back || inp.almanac || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); }
  }
  nameFocused(g) {
    const c = CONSTELLATIONS[this.focus];
    const w = g.world;
    if (!w.almanac.stars[c.id]) { g.sound('uiError'); return; }
    g.sound('uiConfirm');
    openKeyboard(g, {
      title: 'What do you call this one?',
      max: 24,
      hint: `Right now it's ${starName(w, c)}.`,
      random: c.suggest,
      onCancel: () => {},
      onDone: (name) => {
        w.almanac.starNames[c.id] = name;
        g.sound('star');
        g.ui.toastMsg(`${name}. It's official. Nobody checks.`);
        g.events.emit('constellationNamed', { id: c.id, name });
      },
    });
  }
  rect(i) { return [84 + (i % this.cols) * 52, 44 + Math.floor(i / this.cols) * 42, 50, 40]; }
  prompts() {
    const c = this.tab === STARS_TAB ? CONSTELLATIONS[this.focus] : null;
    const base = [['tabs', 'Turn page'], ['back', 'Close']];
    return c && this.g.world.almanac.stars[c.id] ? [['confirm', 'Name it'], ...base] : base;
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 70, 14, 340, 240, { fill: 'white', trim: 'sand' });
    TABS.forEach((t, i) => {
      const on = this.tab === i;
      panel(hud, 78 + i * 54, 20, 52, 18, { fill: on ? 'sand' : 'white', trim: on ? 'orange' : 'mist' });
      drawText(hud, 78 + i * 54 + 26, 26, t, { align: 'center', color: 'ink' });
    });
    if (this.tab === 5) { this.drawCalendar(g, hud); return; }
    const list = this.entries(g);
    list.forEach((e, i) => {
      const [x, y, w, h] = this.rect(i);
      const f = i === this.focus;
      panel(hud, x, y, w, h, { fill: f ? 'sand' : 'white', trim: f ? 'orange' : 'mist' });
      drawIcon(hud, x + 9, y + 4, e.icon, e.known ? e.colors : SIL, 2);
      if (e.donated) hud.rect(x + w - 8, y + 4, 4, 4, 'green');
    });
    const e = list[this.focus];
    if (e) {
      const known = e.known;
      drawText(hud, 240, 176, known ? e.name : '???', { align: 'center', color: 'ink' });
      textBlock(hud, 88, 190, 304, known ? `${e.line}` : 'Not yet. The page is waiting.', { color: 'slate' });
      if (known) drawText(hud, 240, 232, `${e.where}${e.donated ? ' In the museum.' : ''}`, { align: 'center', color: 'plum' });
    }
  }
  drawCalendar(g, hud) {
    const today = villageDay(g.world.clock.day).calendarDay;
    for (let d = 1; d <= 16; d++) {
      const col = (d - 1) % 4, row = Math.floor((d - 1) / 4);
      const x = 84 + col * 78, y = 46 + row * 46;
      const f = d === today;
      panel(hud, x, y, 74, 42, { fill: f ? 'sand' : 'white', trim: f ? 'orange' : 'mist' });
      const v = villageDay(d);
      drawText(hud, x + 5, y + 5, `${d} ${DAY_TYPES[v.type].split(' ')[0]}`, { color: 'ink' });
      const note = YEAR_NOTES[d];
      const words = note.split(' ');
      let line = '', ln = 0;
      for (const wd of words) {
        if ((line + wd).length > 11) { drawText(hud, x + 5, y + 16 + ln * 11, line.trim(), { color: 'slate' }); ln++; line = ''; }
        line += `${wd} `;
      }
      drawText(hud, x + 5, y + 16 + ln * 11, line.trim(), { color: 'slate' });
    }
    SEASON_NAMES.forEach((s, i) => drawText(hud, 82, 46 + i * 46 - 0, '', { color: 'ink' }));
  }
}
export const almanacScreen = () => new Almanac();
