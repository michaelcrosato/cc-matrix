// Pause, Party, Settings and About.
import { CLASSES, PLAYABLE } from '../../data/classes.js';
import { TITLE } from '../../data/meta.js';
import { HOW_TO_PLAY } from '../../data/lore.js';
import { LOOK_PRESETS } from '../../../pixel-engine.js';
import { INTERVIEW, KIT_CREDITS } from '../../data/about.generated.js';
import { SEAT_COLORS } from '../../view/actors.js';
import { DevScreen } from './dev.js';
import { frame, Screen } from './base.js';
import { HeroScreen } from './hero.js';
import { MapScreen } from './world.js';

export class PauseScreen extends Screen {
  constructor(game) { super(game, { tag: 'pause', freeze: !game.isSession, covers: false }); }
  draw(ui) {
    const g = this.game;
    const W = ui.w, H = ui.h;
    const items = g.isSession
      ? [['RESUME', () => g.closeScreen()], ['SETTINGS', () => g.openScreen(new SettingsScreen(g))], ['HOW TO PLAY', () => g.openScreen(new HowToScreen(g))]]
      : [
        ['RESUME', () => g.closeScreen()],
        ['HERO', () => g.openScreen(new HeroScreen(g, 0))],
        ['MAP', () => g.openScreen(new MapScreen(g))],
        ['PARTY', () => g.openScreen(new PartyScreen(g))],
        ['HOW TO PLAY', () => g.openScreen(new HowToScreen(g))],
        ['SETTINGS', () => g.openScreen(new SettingsScreen(g))],
        ['DEV MODE', () => g.openScreen(new DevScreen(g))],
        ['ABOUT', () => g.openScreen(new AboutScreen(g))],
        ['SAVE AND QUIT', () => g.saveAndQuit()],
      ];
    const bw = 150, bh = 16, gap = 2;
    const total = items.length * (bh + gap);
    const x = Math.floor(W / 2 - bw / 2), y0 = Math.floor(H / 2 - total / 2) + 6;
    ui.panel(x - 8, y0 - 22, bw + 16, total + 28, { border: 'plum' });
    ui.text(W / 2, y0 - 16, 'A PAUSE IN THE TOLLING', { color: 'sand', align: 'center' });
    items.forEach(([label, act], i) => {
      if (ui.button(`pause:${label}`, x, y0 + i * (bh + gap), bw, bh, label)) act();
    });
    ui.rect(0, ui.h - 19, ui.w, 19, 'ink'); // The HUD is still up behind this menu: the prompts need their own ground.
    ui.footer([['confirm', 'CHOOSE'], ['back', 'RESUME']]);
  }
}

export class HowToScreen extends Screen {
  constructor(game) { super(game, { tag: 'howto' }); this.page = 0; }
  draw(ui) {
    frame(ui, '');
    const p = HOW_TO_PLAY[this.page];
    ui.text(14, 14, p.title, { color: 'sand', scale: 2 });
    let y = 36;
    for (const line of p.lines) y += ui.textBlock(14, y, line, ui.w - 28, { color: 'white' }) + 3;
    ui.text(ui.w - 14, ui.h - 26, `${this.page + 1}/${HOW_TO_PLAY.length}`, { color: 'slate', align: 'right' });
    const input = this.game.input.menu;
    if (input.confirm || input.tabR || input.right || input.down || input.wheel > 0 || input.click) this.page = (this.page + 1) % HOW_TO_PLAY.length;
    if (input.tabL || input.left || input.up || input.wheel < 0) this.page = (this.page - 1 + HOW_TO_PLAY.length) % HOW_TO_PLAY.length;
    ui.footer([['confirm', 'NEXT'], ['back', 'BACK']]);
  }
}

export class PartyScreen extends Screen {
  constructor(game) { super(game, { tag: 'party' }); }
  draw(ui) {
    const g = this.game;
    frame(ui, 'THE PARTY');
    if (g.joinPad !== null && g.joinPad !== undefined && !this.pref) { this.pref = true; ui.preferFocus = `party:join${PLAYABLE[0]}`; g.justJoin = true; }
    const w = g.world;
    const humans = w.heroes.filter((h) => !h.gone && !h.companion);
    humans.forEach((h, i) => {
      const y = 36 + i * 24;
      ui.panel(14, y, ui.w - 28, 22, { border: SEAT_COLORS[h.seat] });
      ui.text(20, y + 3, `P${h.seat + 1}  ${h.name}  LV ${h.level} ${CLASSES[h.cls].name}`, { color: SEAT_COLORS[h.seat] });
      const dev = g.input.seats[h.seat];
      ui.text(20, y + 12, dev?.pad !== null && dev?.pad !== undefined ? `PAD ${dev.pad + 1}` : 'KEYBOARD AND MOUSE', { color: 'mist' });
      if (h.seat > 0 && ui.button(`party:leave${h.seat}`, ui.w - 84, y + 3, 64, 16, 'LEAVE')) g.leaveSeat(h.seat);
    });
    const free = g.freePads();
    let y = 36 + humans.length * 24 + 6;
    if (humans.length < 4) {
      if (free.length) {
        ui.text(14, y, 'A FREE CONTROLLER MAY JOIN AS:', { color: 'white' });
        y += 12;
        PLAYABLE.forEach((cls, i) => {
          if (ui.button(`party:join${cls}`, 14 + i * 110, y, 106, 18, CLASSES[cls].name)) { g.joinSeat(g.joinPad ?? free[0], cls); g.joinPad = null; if (g.justJoin) { g.justJoin = false; g.closeScreen(); return; } }
        });
        y += 24;
      } else {
        ui.textBlock(14, y, 'CONNECT ANOTHER CONTROLLER AND PRESS OPTIONS TO JOIN. IT WORKS AT ANY TIME.', ui.w - 28, { color: 'mist' });
        y += 24;
      }
    }
    // Holding Options on a pad here leaves its seat.
    for (let s = 1; s < g.input.seats.length; s++) {
      const pad = g.input.pads[g.input.seats[s].pad];
      this.holdLeave = this.holdLeave ?? {};
      this.holdLeave[s] = pad?.b?.[9] ? (this.holdLeave[s] ?? 0) + 1 : 0;
      if (this.holdLeave[s] > 45) { this.holdLeave[s] = 0; g.leaveSeat(s); break; }
    }
    ui.footer([['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}

const LOOKS = [['NATIVE', null], ['SPOOKY', 'spooky'], ['16-BIT', 'sixteen_bit'], ['PS1 HORROR', 'ps1_horror'], ['OLD PHOTO', 'old_photo'], ['NOIR', 'noir']];

export class SettingsScreen extends Screen {
  constructor(game) { super(game, { tag: 'settings' }); this.page = 0; }
  rows() {
    const g = this.game;
    const a = g.ctx.audio;
    const s = g.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const vol = (ch) => ({ get: () => pct(a.volume[ch]), step: (d) => a.setVolume(ch, Math.max(0, Math.min(1, Math.round((a.volume[ch] + d * 0.05) * 100) / 100))) });
    const es = g.ctx.engine.settings;
    return [
      ['MASTER VOLUME', vol('master')],
      ['MUSIC VOLUME', vol('music')],
      ['SOUND VOLUME', vol('sfx')],
      ['VOICES VOLUME', { get: () => pct(s.voices), step: (d) => { s.voices = Math.max(0, Math.min(1, Math.round((s.voices + d * 0.05) * 100) / 100)); g.audioSys.voicesVol = s.voices; } }],
      ['BUTTON GLYPHS', { get: () => (s.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), step: () => { s.glyphs = s.glyphs === 'xbox' ? 'ps' : 'xbox'; } }],
      ['SCREEN SHAKE', { get: () => pct(s.shake), step: (d) => { s.shake = Math.max(0, Math.min(2, Math.round((s.shake + d * 0.25) * 100) / 100)); } }],
      ['DAMAGE NUMBERS', { get: () => (s.numbers ? 'ON' : 'OFF'), step: () => { s.numbers = !s.numbers; } }],
      ['ZOOM', { get: () => pct(s.zoom), step: (d) => { s.zoom = Math.max(0.6, Math.min(1.4, Math.round((s.zoom + d * 0.1) * 100) / 100)); } }],
      ['LOOK', { get: () => LOOKS[s.lookIndex ?? 0][0], step: (d) => { s.lookIndex = ((s.lookIndex ?? 0) + d + LOOKS.length) % LOOKS.length; g.applyLook(); } }],
      ['PIXEL SIZE', { get: () => ((es.values.pixelSize ?? 'fine') === 'fine' ? 'FINE' : 'CHUNKY'), step: () => es.set({ pixelSize: (es.values.pixelSize ?? 'fine') === 'fine' ? 'chunky' : 'fine' }) }],
      ['QUALITY', { get: () => (es.values.quality ?? 'high').toUpperCase(), step: (d) => { const q = ['low', 'medium', 'high']; const i = q.indexOf(es.values.quality ?? 'high'); es.set({ quality: q[(i + d + 3) % 3] }); } }],
      ['FULLSCREEN', { get: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF'), step: () => g.toggleFullscreen() }],
    ];
  }
  back() { this.game.saveSettings(); this.game.closeScreen(); }
  draw(ui) {
    const g = this.game;
    frame(ui, 'SETTINGS');
    const input = g.input.menu;
    const rows = this.rows();
    const perPage = Math.floor((ui.h - 62) / 15);
    const pages = Math.ceil(rows.length / perPage);
    if (input.tabR) this.page = (this.page + 1) % pages;
    if (input.tabL) this.page = (this.page - 1 + pages) % pages;
    this.page = Math.min(this.page, pages - 1);
    rows.slice(this.page * perPage, this.page * perPage + perPage).forEach(([label, r], i) => {
      const y = 32 + i * 15;
      const w = ui.widget(`set:${label}`, 14, y, ui.w - 28, 14);
      ui.rect(14, y, ui.w - 28, 14, w.focused ? 'plum' : 'night');
      ui.text(20, y + 3, label, { color: w.focused ? 'white' : 'mist' });
      ui.text(ui.w - 20, y + 3, `< ${r.get()} >`, { color: 'sand', align: 'right' });
      if (w.focused) {
        if (input.left) { r.step(-1); g.audioSys?.sfx('ui_tab'); }
        if (input.right) { r.step(1); g.audioSys?.sfx('ui_tab'); }
      }
      if (w.activated) { r.step(1); g.audioSys?.sfx('ui_tab'); }
      if (w.alt) { r.step(-1); g.audioSys?.sfx('ui_tab'); }
    });
    const fy = 32 + Math.min(perPage, rows.length) * 15 + 2;
    if (ui.button('set:reset', 14, fy, 150, 14, 'RESET TO DEFAULTS')) g.resetSettings();
    if (pages > 1) ui.text(ui.w - 14, fy + 3, `PAGE ${this.page + 1}/${pages}`, { color: 'slate', align: 'right' });
    ui.footer([['confirm', 'CHANGE'], ['back', 'BACK']]);
  }
}

/** The last thing the story shows: who did it, and the deeper bell. */
export class CreditsRoll extends Screen {
  constructor(game, onDone) {
    super(game, { tag: 'credits', freeze: false, holdSim: true, covers: true });
    this.onDone = onDone;
    this.y = 0;
    this.lines = [
      [TITLE, 'sand', 3], ['', 'white', 1], ['THE GREAT BELL RANG TRUE', 'white', 1], ['', 'white', 1],
      ['CRIER MAUDLIN, A HEAD', 'sand', 1], ['DAME BRASSE, RATHER LOUD', 'orange', 1], ['MOTHER OGIVE, BY TASTE', 'lime', 1], ['PENNYWHISTLE, AT A MODEST MARKUP', 'sky', 1], ['SISTER PYX, AND THE CROSSBOW', 'white', 1], ['', 'white', 1],
      ['BISHOP AMBROSE, THRICE BURIED', 'mist', 1], ['THE BURSAR, IN ARREARS', 'red', 1], ['MALISON, THE UNRUNG SAINT', 'red', 1], ['', 'white', 1],
      ['EVERY MODEL, CLIP, SONG, SOUND AND VOICE', 'white', 1], ['IS DATA IN THE SOURCE', 'white', 1], ['BUILT ON THE PIXEL ENGINE KIT', 'mist', 1], ['THE FULL CREDITS ARE ON THE ABOUT SCREEN', 'mist', 1], ['', 'white', 1], ['', 'white', 1],
      ['AND FAR BELOW, UNDER THE FOUNDATION, UNDER THE SAINT', 'mist', 1], ['A MUCH DEEPER BELL ANSWERED', 'sand', 1], ['', 'white', 1], ['KNELL RUNS AND PENANCE ARE OPEN', 'lime', 1],
    ];
  }
  back() { this.finish(); }
  finish() { if (this.done) return; this.done = true; this.game.closeScreen(); this.onDone?.(); }
  draw(ui) {
    const g = this.game;
    this.y += g.lastRealDt * 16;
    ui.rect(0, 0, ui.w, ui.h, 'ink');
    let y = ui.h - this.y;
    for (const [t, c, sc] of this.lines) {
      if (t && y > -30 && y < ui.h - 20) ui.text(ui.w / 2, y, t, { color: c, scale: sc, align: 'center' });
      y += 12 * sc + 2;
    }
    if (!this.toll && y < ui.h * 0.5) { this.toll = true; g.audioSys?.sfx('bell_true', { pitch: -7 }); }
    if (y < 0) this.finish();
    if (g.input.menu.confirm || g.input.menu.click) this.y += 60;
    ui.prompt('confirm', 'FASTER', 14, ui.h - 14);
  }
}

// ---- About ------------------------------------------------------------------------------------
const QUESTIONS = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'],
};
export const ABOUT_QUESTIONS = QUESTIONS;

export function aboutLines() {
  const si = INTERVIEW.sourceInformation;
  const info = [['DATE', si.date], ['SOURCE', si.source], ['PLAN', si.plan], ['GENRE AND PERSPECTIVE', `${si.genre}; ${si.perspective}`], ['TECH', si.tech], ['ART DIRECTION', si.artDirection], ['ANIMATION', si.animation], ['AUDIO', si.audio], ['ONLINE', si.online], ['TESTING', si.testing], ['RESEARCH', si.research], ['ENVIRONMENT', si.environment], ['MODEL', si.model], ['USAGE', si.usage]];
  const qa = (list, answers) => list.flatMap((q, i) => [{ q }, { a: answers[i] ?? 'unknown' }]);
  return {
    'SOURCE INFORMATION': info.flatMap(([k, v]) => [{ q: k }, { a: v }]),
    'TESTING FEEDBACK': qa(QUESTIONS.testing, INTERVIEW.testingFeedback),
    'ENGINE FEEDBACK': qa(QUESTIONS.engine, INTERVIEW.engineFeedback),
    'PROMPT FEEDBACK': qa(QUESTIONS.prompt, INTERVIEW.promptFeedback),
    CREDITS: [{ q: TITLE }, { a: 'Made in code: every model, clip, song, sound and voice in this game is data in its source. Built on the Pixel Engine kit. Credits for the kit follow.' }, { q: 'THE KIT' }, { a: KIT_CREDITS.replace(/[`*#_>|]/g, ' ').replace(/\s+\n/g, '\n') }],
  };
}

export class AboutScreen extends Screen {
  constructor(game) {
    super(game, { tag: 'about' });
    this.page = 0;
    this.scroll = 0;
    this.sections = aboutLines();
    this.names = Object.keys(this.sections);
    this.cacheW = 0;
  }
  layout(ui) {
    if (this.cacheW === ui.w && this.laid) return;
    this.cacheW = ui.w;
    this.laid = {};
    const clean = (s) => String(s).toUpperCase().replace(/[–—]/g, '-').replace(/×/g, 'X').replace(/→/g, '>').replace(/[^0-9A-Z'"`‘’“”.,:;\-+=/()[\]{}%_!?<>#*@°·&|~^$ \n]/g, ' ');
    for (const n of this.names) {
      const out = [];
      for (const row of this.sections[n]) {
        if (row.q) { out.push({ t: clean(row.q), c: 'sand' }); }
        else { for (const l of ui.wrap(clean(row.a), ui.w - 32)) out.push({ t: l, c: 'white' }); out.push({ t: '', c: 'white' }); }
      }
      this.laid[n] = out;
    }
  }
  /** Every line of the current section, for tests and the attentive. */
  allText(ui) { this.layout(ui); return this.laid; }
  draw(ui) {
    const g = this.game;
    const input = g.input.menu;
    frame(ui, '');
    this.layout(ui);
    if (input.tabR) { this.page = (this.page + 1) % this.names.length; this.scroll = 0; }
    if (input.tabL) { this.page = (this.page - 1 + this.names.length) % this.names.length; this.scroll = 0; }
    const name = this.names[this.page];
    const lines = this.laid[name];
    ui.text(14, 12, name, { color: 'sand', scale: 2 });
    ui.text(ui.w - 14, 14, `${this.page + 1}/${this.names.length}`, { color: 'slate', align: 'right' });
    const rows = Math.floor((ui.h - 58) / 9);
    const maxScroll = Math.max(0, lines.length - rows);
    if (input.down) this.scroll = Math.min(maxScroll, this.scroll + 3);
    if (input.up) this.scroll = Math.max(0, this.scroll - 3);
    if (input.wheel > 0) this.scroll = Math.min(maxScroll, this.scroll + input.wheel * 4);
    if (input.wheel < 0) this.scroll = Math.max(0, this.scroll + input.wheel * 4);
    if (input.confirm) this.scroll = this.scroll >= maxScroll ? 0 : Math.min(maxScroll, this.scroll + rows);
    lines.slice(this.scroll, this.scroll + rows).forEach((l, i) => { if (l.t) ui.text(16, 32 + i * 9, l.t, { color: l.c }); });
    if (maxScroll > 0) {
      const barH = ui.h - 58;
      ui.rect(ui.w - 11, 32, 2, barH, 'night');
      ui.rect(ui.w - 11, 32 + (this.scroll / (maxScroll || 1)) * (barH - 8), 2, 8, 'sand');
    }
    ui.footer([['tabL', 'PAGE'], ['tabR', 'PAGE'], ['confirm', 'SCROLL'], ['back', 'BACK']]);
  }
}

export { LOOKS };
