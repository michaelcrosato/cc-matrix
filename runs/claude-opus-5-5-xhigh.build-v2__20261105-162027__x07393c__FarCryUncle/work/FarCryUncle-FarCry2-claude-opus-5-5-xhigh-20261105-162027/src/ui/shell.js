// Title, main menu, pause, settings: every screen by pad, keyboard and mouse. Touch-only devices get the notice and a Settings button.
import { Menu, SAFE_X, SAFE_Y } from './menu.js';
import { GAME_TITLE } from '../content/title.js';
import { DEFAULT_SETTINGS, storeSettings } from '../core/save.js';
import { drawGlyph, glyphWidth } from './glyphs.js';
export const NOTICE_TOUCH = 'Controller or keyboard required';
export function isTouchOnly() {
  if (typeof matchMedia === 'undefined') return false;
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch { return false; }
}
export class Shell {
  titleFrames = 0; idle = 0; pressed = false; gate = false;
  constructor(game) { this.game = game; }
  get ui() { return this.game.ui; }
  get menu() { return this.game.ui.menu; }
  enterTitle() {
    const g = this.game;
    this.pressed = false;
    this.idle = 0;
    this.menu.clear();
    this.gate = isTouchOnly() && !this.padConnected() && !g.options.forceNoGate;
    if (this.gate) this.pushGate();
    else this.menu.push(this.titleScreen());
  }
  padConnected() { const n = typeof navigator !== 'undefined' ? navigator : null; try { const pads = n?.getGamepads?.() ?? []; for (const p of pads) if (p && p.connected) return true; } catch { /* no pads */ } return false; }
  titleScreen() {
    const g = this.game;
    return {
      id: 'title', noBack: true, items: [], attractIdle: true, hints: [],
      onConfirm: () => { this.pressed = true; this.menu.pop(); this.menu.push(this.mainMenu()); },
      tapAnywhere: () => { this.pressed = true; this.menu.pop(); this.menu.push(this.mainMenu()); },
      update: (c, dt, s) => { for (const code of ['Space', 'KeyE', 'PadSquare', 'PadTriangle', 'PadOptions', 'Escape']) if (c.input.wasPressed(code)) { s.onConfirm(); return; } },
      draw: (hud, m, s) => {
        this.logo(hud);
        const name = g.actions.glyph('confirm', g.settings.glyphs === 'xb');
        const blink = (m.frame >> 5) & 1;
        const w = 6 * 6 + 4 + glyphWidth(name);
        const x = ((hud.width - w) / 2) | 0, y = hud.height - 40;
        m.note('confirm', name, 'PRESS');
        if (blink) { hud.text(x, y + 2, 'PRESS ', { color: 'white' }); drawGlyph(hud, x + 36, y, name); }
      },
    };
  }
  logo(hud) {
    let scale = 4;
    if (GAME_TITLE.length * 6 * scale > hud.width - 40) scale = 3;
    const w = GAME_TITLE.length * 6 * scale;
    hud.text(((hud.width - w) / 2) | 0, 42, GAME_TITLE, { scale, color: 'sand', shadow: 'plum' });
    const sub = 'A MAP IS A PROMISE';
    hud.text(((hud.width - sub.length * 6) / 2) | 0, 42 + 8 * scale + 4, sub, { color: 'mist' });
  }
  mainMenu() {
    const g = this.game;
    return {
      id: 'main', noBack: true, attractIdle: true,
      items: () => {
        const list = [];
        if (g.save.exists()) list.push({ id: 'continue', label: 'CONTINUE', onSelect: () => g.startContinue() });
        list.push({ id: 'new', label: 'NEW GAME', onSelect: () => g.startNew() });
        list.push({ id: 'cash', label: 'CASH RUN', onSelect: () => this.openCashRun() });
        list.push({ id: 'settings', label: 'SETTINGS', onSelect: () => this.openSettings() });
        list.push({ id: 'about', label: 'ABOUT AND CREDITS', onSelect: () => this.openAbout() });
        return list;
      },
      hints: [['confirm', 'SELECT']],
      draw: (hud, m, s) => {
        this.logo(hud);
        let y = 100;
        m.itemsOf(s).forEach((it, i) => { y += m.itemRow(hud, it, i, y, s.focus === i); });
        m.footer(hud, s);
      },
    };
  }
  pushGate() {
    const g = this.game;
    this.menu.push({
      id: 'gate', noBack: true, attractIdle: true,
      items: [{ id: 'settings', label: 'SETTINGS', onSelect: () => this.openSettings() }],
      hints: [],
      draw: (hud, m, s) => {
        this.logo(hud);
        const t = NOTICE_TOUCH.toUpperCase();
        hud.text(((hud.width - t.length * 6) / 2) | 0, 112, t, { color: 'orange' });
        const w = 200, x = ((hud.width - w) / 2) | 0, y = 136;
        hud.rect(x, y, w, 28, 'orange');
        hud.text(((hud.width - 8 * 12) / 2) | 0, y + 7, 'SETTINGS', { scale: 2, color: 'ink', shadow: false });
        m.regions.push({ x, y, w, h: 28, index: 0 });
      },
    });
  }
  /** A key press or pad connecting clears the gate and shows the normal title. */
  stepGate() {
    if (!this.gate) return;
    const g = this.game, inp = g.ctx.input;
    const st = inp.state();
    const key = st.held.some((c) => c !== 'Touch' && !c.startsWith('Mouse')) || st.queued.some(([c]) => c !== 'Touch' && !c.startsWith('Mouse'));
    if (key || this.padConnected()) {
      this.gate = false;
      if (this.menu.top?.id === 'gate') { this.menu.pop(); this.menu.push(this.titleScreen()); }
    }
  }
  openPause() {
    const g = this.game;
    const hub = g.options.session?.kind === 'hub';
    const items = () => hub ? [
      { id: 'resume', label: 'RESUME', onSelect: () => g.resume() },
      { id: 'settings', label: 'SETTINGS', onSelect: () => this.openSettings() },
    ] : [
      { id: 'resume', label: 'RESUME', onSelect: () => g.resume() },
      { id: 'ledger', label: 'LEDGER', onSelect: () => this.ui.openLedger() },
      { id: 'settings', label: 'SETTINGS', onSelect: () => this.openSettings() },
      { id: 'dev', label: 'DEV MODE', onSelect: () => g.dev.open() },
      { id: 'about', label: 'ABOUT AND CREDITS', onSelect: () => this.openAbout() },
      { id: 'quit', label: 'QUIT TO TITLE', onSelect: () => g.toTitle() },
    ];
    this.menu.push({ id: 'pause', title: 'PAUSED', dim: 0.5, items, onBack: () => g.resume(), pausesWorld: true, panel: true, hints: [['confirm', 'SELECT'], ['back', 'RESUME']] });
  }
  openCashRun() {
    const g = this.game;
    this.menu.push({
      id: 'cash', title: 'CASH RUN', subtitle: 'SIX CASES IN A BURNING VALLEY. MOST STONES WINS. FRIENDLY FIRE IS ON.', dim: 0.5, blurb: 'FRIENDS ONLINE PLAY THROUGH AI HUB.',
      items: [
        { id: 'solo', label: 'SOLO WITH HIRED GUNS', onSelect: () => g.startRound('solo') },
        { id: 'host', label: 'HOST ON THIS COMPUTER', onSelect: () => g.startRound('host') },
        { id: 'join', label: 'JOIN ON THIS COMPUTER', onSelect: () => g.startRound('join') },
      ],
    });
  }
  openAbout() {
    const g = this.game;
    this.menu.push({ id: 'about', dim: 0.85, sheet: true, title: 'ABOUT AND CREDITS', pages: g.about.pages(), items: [], attractExempt: true, hints: [['menuRight', 'PAGE'], ['back', 'BACK']] });
  }
  // ---- Settings: Sound, Controls, Picture, Comfort ----
  setting(key) { return { get: () => this.game.settings[key], set: (v) => { this.game.settings[key] = v; this.game.applySettings(); } }; }
  openSettings() {
    const g = this.game, S = (key, min, max, step, format) => ({ ...this.setting(key), min, max, step, format });
    const pct = (v) => `${Math.round(v * 100)}%`;
    const onOff = (key) => ({ options: [true, false], ...this.setting(key), format: (v) => (v ? 'ON' : 'OFF') });
    const tabs = ['SOUND', 'CONTROLS', 'PICTURE', 'COMFORT'];
    const pages = [
      () => [
        { id: 'music', label: 'MUSIC', slider: S('music', 0, 1, 0.05, pct) }, { id: 'sfx', label: 'EFFECTS', slider: S('sfx', 0, 1, 0.05, pct) }, { id: 'voices', label: 'VOICES', slider: S('voices', 0, 1, 0.05, pct) },
      ],
      () => [
        { id: 'sensPad', label: 'LOOK, PAD', slider: S('sensPad', 0.25, 3, 0.05, (v) => v.toFixed(2)) }, { id: 'sensMouse', label: 'LOOK, MOUSE', slider: S('sensMouse', 0.25, 3, 0.05, (v) => v.toFixed(2)) },
        { id: 'invertY', label: 'INVERT Y', choices: onOff('invertY') }, { id: 'aimAssist', label: 'AIM ASSIST', choices: onOff('aimAssist') }, { id: 'rumble', label: 'RUMBLE', choices: onOff('rumble') },
        { id: 'glyphs', label: 'GLYPHS', choices: { options: ['ps', 'xb'], ...this.setting('glyphs'), format: (v) => (v === 'ps' ? 'PLAYSTATION' : 'XBOX') } },
      ],
      () => [
        { id: 'fullscreen', label: 'FULLSCREEN', onSelect: () => g.toggleFullscreen() },
        { id: 'pixelSize', label: 'PIXEL SIZE', choices: { options: ['fine', 'chunky'], ...this.setting('pixelSize'), format: (v) => v.toUpperCase() } },
        { id: 'quality', label: 'QUALITY', choices: { options: ['auto', 'low', 'medium', 'high'], ...this.setting('quality'), format: (v) => v.toUpperCase() } },
        { id: 'fov', label: 'FIELD OF VIEW', slider: S('fov', 50, 90, 1, (v) => String(Math.round(v))) },
      ],
      () => [
        { id: 'subtitleSize', label: 'SUBTITLE SIZE', choices: { options: [1, 2], ...this.setting('subtitleSize'), format: (v) => (v === 1 ? 'SMALL' : 'LARGE') } },
        { id: 'reduceFlashes', label: 'REDUCE FLASHES', choices: onOff('reduceFlashes') }, { id: 'feverReduced', label: 'FEVER EFFECTS LESS', choices: onOff('feverReduced') },
        { id: 'reset', label: 'RESET TO DEFAULTS', onSelect: () => this.resetSettings() },
      ],
    ];
    this.menu.push({ id: 'settings', title: 'SETTINGS', dim: 0.85, sheet: true, tabs, attractExempt: true, items: (s) => pages[s.tab](), hints: [['confirm', 'CHANGE'], ['back', 'BACK']], onBack: () => { storeSettings(g.settings); this.menu.pop(); } });
  }
  resetSettings() {
    const g = this.game;
    Object.assign(g.settings, DEFAULT_SETTINGS);
    g.applySettings();
    storeSettings(g.settings);
    g.notice('DEFAULTS. EVEN THE MUSIC.', 2);
  }
}
