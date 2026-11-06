// The title: the diorama at dusk, the name in pixel letters over it, a car driving past.
import { TITLE, SUBTITLE } from '../../data/meta.js';
import { LINES } from '../../data/text.js';
import { Dialog, tumbleweed } from './common.js';
import { MapScreen } from './map.js';
import { SettingsScreen } from './settings.js';
import { AboutScreen } from './about.js';
import { DealerScreen } from './dealer.js';
export class TitleScreen {
  constructor(app) { this.id = 'title'; this.app = app; this.noBack = true; this.tw = -30; }
  enter() { const s = this.app.scene; if (s?.stage) { s.opts.title = true; s.stage('map', { hour: 17.6, titleCam: true }); } this.app.mix.music('lounge'); this.app.idleWatch = true; this.app.actions.idle = 0; }
  exit() { this.app.idleWatch = false; const s = this.app.scene; if (s) s.opts.title = false; }
  resume() { const s = this.app.scene; if (s?.stage) { s.opts.title = true; s.stage('map', { hour: 17.6, titleCam: true }); } this.app.idleWatch = true; this.app.actions.idle = 0; }
  draw(ui, dt) {
    const app = this.app, [a, b] = TITLE.split(' '), cx = ui.cx, gate = app.touchGate;
    ui.text(cx, 34, a, { align: 'center', scale: 3, color: 'white', shadow: 'plum' });
    ui.text(cx, 58, b, { align: 'center', scale: 4, color: 'sand', shadow: 'plum' });
    ui.rect(cx - 120, 92, 240, 1, 'sand');
    ui.text(cx, 97, SUBTITLE, { align: 'center', color: 'white' });
    this.tw += dt * 34; if (this.tw > ui.w + 20) this.tw = -30; tumbleweed(ui, this.tw, 84 - Math.abs(Math.sin(this.tw * 0.14)) * 8, this.tw * 0.25);
    if (gate) {
      ui.panel(cx - 120, 130, 240, 30, { color: 'ink', border: 'red' });
      ui.text(cx, 140, 'CONTROLLER OR KEYBOARD REQUIRED', { align: 'center', color: 'sand' });
      ui.button('settings', cx - 50, 176, 100, 18, 'SETTINGS', { confirm: () => ui.push(new SettingsScreen(app)) });
      return;
    }
    const has = app.hasSave(), w = 120, x = cx - w / 2; let y = 128;
    if (has) { ui.button('continue', x, y, w, 15, 'CONTINUE', { confirm: () => this.continue(ui) }); y += 18; }
    ui.button('new', x, y, w, 15, 'NEW GAME', { confirm: () => this.newGame(ui, has) }); y += 18;
    ui.button('settings', x, y, w, 15, 'SETTINGS', { confirm: () => ui.push(new SettingsScreen(app)) }); y += 18;
    ui.button('about', x, y, w, 15, 'ABOUT', { confirm: () => ui.push(new AboutScreen(app)) });
    ui.prompts([['confirm', 'PRESS TO BEGIN'], ['move', 'CHOOSE']]);
    if (!app.mix.audio?.unlocked) { ui.sprite(cx - 100, ui.h - 29, ['..x....', '.xx..x.', 'xxx.x.x', 'xxx..x.', 'xxx.x.x', '.xx....', '..x....'], { x: 'red' }); ui.text(cx + 4, ui.h - 28, 'PRESS A KEY OR CLICK FOR SOUND', { align: 'center', color: 'mist' }); }
  }
  continue(ui) { ui.clear(); ui.push(new MapScreen(this.app)); }
  newGame(ui, has) {
    const start = () => { this.app.newGame(); ui.clear(); ui.push(new MapScreen(this.app)); ui.push(new Greeting(this.app)); };
    if (!has) return start();
    const d = new Dialog(this.app, 'A NEW GAME', ['THIS WILL REPLACE YOUR SAVED GAME.', 'THE PENINSULA WILL NOT REMEMBER YOU.'], [['no', 'KEEP IT', () => ui.pop()], ['yes', 'NEW GAME', start]]); d.under = this; ui.push(d); d.focus = 'no';
  }
}
// A short greeting from the examiner, then Dealer Row.
export class Greeting {
  constructor(app) { this.id = 'greeting'; this.app = app; this.noBack = true; }
  enter(ui) { ui.say('arai', LINES.arai.greet, 7); const s = this.app.scene; s.stage('licence', { person: 'arai', personClip: 'ExaminerClipboard', personAt: [-1.4, 0, 2.6], personYaw: 0.2, orbit: false, angle: 0.15, radius: 7, height: 2.1, lookX: -1, lookY: 1.2, lookZ: 2 }); }
  draw(ui) {
    ui.text(ui.cx, 16, 'YOU ARRIVE WITH 15,000 CR, NO LICENCE, AND AN APPETITE.', { align: 'center', color: 'sand' });
    ui.button('go', ui.cx - 55, ui.h - 34, 110, 15, 'CONTINUE', { confirm: () => { this.app.mix.stopVoice(); ui.subtitle = null; ui.pop(); ui.push(new DealerScreen(this.app, { first: true })); } });
    ui.prompts([['confirm', 'CONTINUE']]);
  }
}
