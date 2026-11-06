// Title, main menu, hero select, new hero, and the touch-only notice.
import { CLASSES, HERO_NAMES, PLAYABLE } from '../../data/classes.js';
import { TITLE } from '../../data/meta.js';
import { SKILLS } from '../../data/skills.js';
import { DIFFICULTIES } from '../../data/tuning.js';
import { icon } from '../icons.js';
import { Screen } from './base.js';
import { AboutScreen, SettingsScreen } from './pause.js';

function bigTitle(ui, y = 30) {
  const W = ui.w;
  const scale = W < 300 ? 2 : W < 440 ? 4 : 5;
  ui.text(W / 2 + 1, y + 1, TITLE, { color: 'plum', scale, align: 'center', shadow: false, glyph: true });
  ui.text(W / 2, y, TITLE, { color: 'sand', scale, align: 'center', shadow: 'ink' });
  return y + 7 * scale + 8;
}

export class TitleScreen extends Screen {
  constructor(game) { super(game, { tag: 'title', freeze: false }); }
  draw(ui) {
    const g = this.game;
    bigTitle(ui);
    // Low on the screen: the cracked bell sits under the title and should be seen whole.
    const tag = ui.wrap('THE BELL IS CRACKED. THE DEAD ARE UP. SO ARE YOU.', ui.w - 16);
    tag.forEach((l, i) => ui.text(ui.w / 2, ui.h - 56 + (i - tag.length + 1) * 10, l, { color: 'mist', align: 'center' }));
    if (g.frame % 60 < 42) ui.text(ui.w / 2, ui.h - 40, 'PRESS ANY BUTTON', { color: 'white', align: 'center', scale: 1 });
    if (g.ctx.audio.unlocked === false && g.input.lastDevice === 'pad') ui.text(ui.w / 2, ui.h - 26, 'PRESS A KEY OR CLICK FOR SOUND', { color: 'slate', align: 'center' });
    const m = g.input.menu;
    if (m.anyPress || m.confirm || m.click) { g.audioSys?.sfx('bell_small'); g.openMainMenu(); }
  }
  back() {}
}

export class MainMenu extends Screen {
  constructor(game) { super(game, { tag: 'menu', freeze: false }); }
  draw(ui) {
    const g = this.game;
    bigTitle(ui, 18);
    const hasHero = g.save.heroes.some(Boolean);
    const knell = g.save.account.unlocks.knell;
    const items = [
      ['CONTINUE', () => g.openScreen(new HeroSelect(g)), !hasHero],
      ['NEW HERO', () => g.openScreen(new NewHero(g)), false],
      ['KNELL RUNS', () => g.openScreen(new HeroSelect(g, { knell: true })), !knell || !hasHero],
      ['SETTINGS', () => g.openScreen(new SettingsScreen(g)), false],
      ['ABOUT', () => g.openScreen(new AboutScreen(g)), false],
    ];
    const bw = 140, bh = 18;
    const x = Math.floor(ui.w / 2 - bw / 2);
    const y0 = Math.floor(ui.h * 0.42);
    items.forEach(([label, act, disabled], i) => {
      if (ui.button(`menu:${label}`, x, y0 + i * (bh + 3), bw, bh, label, { disabled })) act();
    });
    if (!knell) ui.text(x + bw + 6, y0 + 2 * (bh + 3) + 5, 'AFTER THE CREDITS', { color: 'slate' });
    ui.footer([['confirm', 'CHOOSE']]);
  }
  back() { this.game.closeScreen(); }
}

const namePick = (g) => HERO_NAMES[Math.floor(g.uiRng.next() * HERO_NAMES.length)];

export class NewHero extends Screen {
  constructor(game) {
    super(game, { tag: 'newhero', freeze: false });
    this.cls = 1;
    this.name = namePick(game);
    this.diff = 0;
    this.step = 'class';
  }
  onOpen() { this.game.shellSet?.setMode('select', this.cls); }
  onClose() { this.game.shellSet?.setMode('title', 0); }
  back() {
    if (this.step === 'start') { this.step = 'class'; return; }
    this.game.closeScreen();
  }
  draw(ui) {
    const g = this.game;
    const W = ui.w, H = ui.h;
    if (this.step === 'class') {
      const cls = CLASSES[PLAYABLE[this.cls]];
      ui.rect(0, H - 94, W, 94, 'ink');
      ui.rect(0, H - 95, W, 1, 'slate');
      ui.text(14, 12, 'A NEW HERO', { color: 'sand', scale: 2 });
      // Class buttons.
      PLAYABLE.forEach((id, i) => {
        const bw = 100;
        const r = ui.button(`class:${id}`, 14 + i * (bw + 3), H - 90, bw, 16, CLASSES[id].name, { color: i === this.cls ? 'sand' : 'mist' });
        if (ui.focus === `class:${id}` && this.cls !== i) { this.cls = i; g.shellSet?.setMode('select', i); }
        if (r) { this.step = 'start'; ui.preferFocus = 'start:begin'; }
      });
      ui.textBlock(14, H - 70, cls.blurb, W - 150, { color: 'white', lineH: 9 });
      ui.textBlock(14, H - 50, cls.style, W - 150, { color: 'mist', lineH: 9 });
      // Signature skills.
      cls.signature.forEach((sid, i) => {
        const sk = SKILLS[sid];
        const ic = icon(sk.icon);
        ui.sprite(W - 130, H - 88 + i * 16, ic.rows, ic.colors);
        ui.text(W - 114, H - 86 + i * 16, sk.name, { color: 'sand' });
      });
      ui.text(W - 130, H - 38, `RESOURCE: ${cls.res}`, { color: 'mist' });
      ui.footer([['confirm', 'THIS ONE'], ['back', 'BACK']]);
      return;
    }
    // Name, difficulty, start point.
    ui.rect(0, H - 124, W, 124, 'ink');
    ui.rect(0, H - 125, W, 1, 'slate');
    ui.text(14, 12, CLASSES[PLAYABLE[this.cls]].name, { color: 'sand', scale: 2 });
    const y = H - 118;
    ui.text(14, y + 3, 'NAME', { color: 'mist' });
    ui.text(50, y + 3, this.name, { color: 'white' });
    if (ui.button('new:shuffle', 150, y, 74, 13, 'ANOTHER')) { this.name = namePick(g); }
    ui.text(14, y + 19, 'DIFFICULTY', { color: 'mist' });
    const diffs = DIFFICULTIES.filter((d) => !d.penance || g.save.account.unlocks.penance);
    const label = DIFFICULTIES[this.diff].name;
    const dr = ui.widget('new:diff', 80, y + 16, 110, 13);
    ui.rect(80, y + 16, 110, 13, dr.focused ? 'plum' : 'night');
    ui.text(135, y + 19, `< ${label} >`, { color: 'sand', align: 'center' });
    const m = g.input.menu;
    if ((dr.focused && m.right) || dr.activated) this.diff = (this.diff + 1) % diffs.length;
    if (dr.focused && m.left) this.diff = (this.diff - 1 + diffs.length) % diffs.length;
    const slot = g.save.heroes.findIndex((h) => !h);
    if (slot < 0) ui.text(200, y + 19, 'ALL THREE SLOTS FULL', { color: 'red' });
    const bw = Math.floor((W - 28 - 4) / 2);
    const by = y + 34;
    if (ui.button('start:begin', 14, by, bw, 30, 'THE BEGINNING', { disabled: slot < 0, color: 'white' })) { g.startNewHero(PLAYABLE[this.cls], this.name, this.diff, 'beginning'); return; }
    if (ui.button('start:last', 14 + bw + 4, by, bw, 30, 'THE LAST BELL', { disabled: slot < 0, color: 'orange' })) { g.startNewHero(PLAYABLE[this.cls], this.name, this.diff, 'lastbell'); return; }
    ui.textBlock(14, by + 33, 'THE STORY, FROM YOUR OWN GRAVE.', bw, { color: 'mist', lineH: 9 });
    ui.textBlock(14 + bw + 4, by + 33, 'LEVEL 30, EVERY SKILL, LEGENDARIES, KEYS. THE WHOLE ENDGAME AT ONCE.', bw, { color: 'mist', lineH: 9 });
    ui.footer([['confirm', 'BEGIN'], ['back', 'BACK']]);
  }
}

export class HeroSelect extends Screen {
  constructor(game, o = {}) { super(game, { tag: 'heroselect', freeze: false }); this.knell = !!o.knell; this.hold = 0; }
  onClose() { this.game.shellSet?.setMode('title', 0); }
  onOpen() { const first = this.game.save.heroes.findIndex(Boolean); const s = this.game.save.heroes[first]; this.game.shellSet?.setMode('select', PLAYABLE.indexOf(s?.data?.cls ?? 'lamplighter')); }
  draw(ui) {
    const g = this.game;
    const W = ui.w, H = ui.h;
    ui.rect(0, H - 96, W, 96, 'ink');
    ui.rect(0, H - 97, W, 1, 'slate');
    ui.text(14, 12, this.knell ? 'WHO RUNS THE KNELL?' : 'WHO GETS UP?', { color: 'sand', scale: 2 });
    const bw = Math.floor((W - 28 - 8) / 3);
    g.save.heroes.forEach((s, i) => {
      const x = 14 + i * (bw + 4), y = H - 90;
      const r = ui.widget(`hero:${i}`, x, y, bw, 58, { disabled: !s });
      ui.rect(x, y, bw, 58, r.focused ? 'sand' : s ? 'slate' : 'night');
      ui.rect(x + 1, y + 1, bw - 2, 56, r.focused ? 'plum' : 'ink');
      if (s) {
        const d = s.data;
        ui.text(x + 5, y + 4, d.name, { color: 'white' });
        ui.text(x + 5, y + 14, `LV ${d.level} ${CLASSES[d.cls].name}`.slice(0, Math.floor((bw - 8) / 6)), { color: CLASSES[d.cls].color });
        ui.text(x + 5, y + 24, DIFFICULTIES[s.camp?.difficulty ?? 0].name, { color: 'mist' });
        ui.text(x + 5, y + 34, s.camp?.credits ? 'THE BELL RANG TRUE' : (s.camp?.zone ?? 'yard').toUpperCase().slice(0, Math.floor((bw - 8) / 6)), { color: 'slate' });
        if (r.focused) {
          g.shellSet?.setMode('select', PLAYABLE.indexOf(d.cls));
          const m = g.input.menu;
          if (m.ctxA) this.delTarget = i;
          const held = m.ctxA || (g.input.input.isDown('KeyX') || g.input.pads.some((p) => p?.b?.[2]));
          if (held && this.delTarget === i) {
            this.hold += g.lastRealDt;
            ui.rect(x + 1, y + 54, (bw - 2) * Math.min(1, this.hold / 1.5), 3, 'red');
            if (this.hold >= 1.5) { g.deleteHero(i); this.hold = 0; this.delTarget = null; }
          } else if (!held) { this.hold = 0; this.delTarget = null; }
        }
        if (r.activated) { g.continueHero(i, { knell: this.knell }); return; }
      } else ui.text(x + bw / 2, y + 24, 'AN EMPTY GRAVE', { color: 'slate', align: 'center' });
    });
    ui.footer([['confirm', 'THIS ONE'], ['ctxA', 'HOLD TO BURY'], ['back', 'BACK']]);
  }
}

export class TouchNotice extends Screen {
  constructor(game) { super(game, { tag: 'touch', freeze: false }); }
  draw(ui) {
    const W = ui.w;
    const y = bigTitle(ui, 20);
    const lines = ui.wrap('CONTROLLER OR KEYBOARD REQUIRED', W - 16);
    ui.rect(0, y + 2, W, lines.length * 10 + 8, 'ink');
    lines.forEach((l, i) => ui.text(W / 2, y + 6 + i * 10, l, { color: 'white', align: 'center' }));
    ui.text(W / 2, ui.h - 16, 'DEMO', { color: 'sand', align: 'center' });
  }
  back() {}
}
