// Attract: a looping demo of the real scenes, with expert bots and cheats. Any input exits.
import { App } from '../app.js';
import { TITLE } from '../data/title.js';
import { ATTRACT_LINES } from '../data/lines.js';
import { charsIn, sayCentered, wrap } from '../ui/font.js';

export const ATTRACT_PLAYLIST = [
  { scene: 'hub', args: { attract: true } },
  { scene: 'activity', args: { id: 'tree', attract: true } },
  { scene: 'activity', args: { id: 'hoop', attract: true } },
  { scene: 'activity', args: { id: 'header', attract: true } },
  { scene: 'activity', args: { id: 'squats', attract: true } },
  { scene: 'activity', args: { id: 'step', attract: true } },
  { scene: 'activity', args: { id: 'slackline', attract: true } },
  { scene: 'activity', args: { id: 'tray', attract: true } },
  { scene: 'activity', args: { id: 'pier', attract: true } },
  { scene: 'activity', args: { id: 'jog', attract: true } },
  { scene: 'activity', args: { id: 'stand', attract: true, from: 60 } },
];
export const ATTRACT_SECONDS = 14;

export class AttractDirector {
  i = -1; t = 0; lineI = 0; lineT = 0; moved = 0; loops = 0; seen = [];

  start() { this.next(); }

  next() {
    this.i++;
    if (this.i >= ATTRACT_PLAYLIST.length) { this.i = 0; this.loops++; }
    this.t = 0;
    const item = ATTRACT_PLAYLIST[this.i];
    this.seen.push(item.args.id ?? item.scene);
    App.go(item.scene, { ...item.args });
  }

  /** Anything: key, click, mouse move past a few pixels, wheel, pad button or stick, touch. */
  anyInput(ctx) {
    const { input } = ctx;
    if (input.queuedPresses.length) return true;
    if (input.wheel) return true;
    const s = input.state();
    if ((s.held ?? []).length) return true;
    if (Math.hypot(input.padAxis.x, input.padAxis.y) > 0.3) return true;
    this.moved += App.device.moved;
    if (this.moved > 6) return true;
    return App.device.domInput;
  }

  tick(ctx, dt) {
    if (this.anyInput(ctx)) { this.exit(); return; }
    if (App.loading) return;
    this.t += dt;
    this.lineT += dt;
    if (this.lineT > 7) { this.lineT = 0; this.lineI = (this.lineI + 1) % ATTRACT_LINES.length; }
    if (this.t >= ATTRACT_SECONDS) this.next();
  }

  exit() {
    App.attract = null;
    App.dev.attractCheat = false;
    App.go('title', {});
  }

  draw(ctx) {
    const { hud } = ctx;
    const cx = Math.round(hud.width / 2);
    // Wrapped, because a portrait phone's art can be under 170 px wide.
    const pad = hud.width < 200 ? 4 : 12; // a phone has no room for a TV's margin
    const cols = charsIn(hud.width - pad * 2);
    const rows = [
      ...wrap(`${TITLE} - Press any button.`, cols).map((t) => ({ t, color: 'sand', name: 'attract-title' })),
      ...wrap(ATTRACT_LINES[this.lineI], cols).map((t) => ({ t, color: 'white', name: 'attract-line' })),
    ];
    const h = rows.length * 11 + 3 + (hud.width < 200 ? 4 : 12);
    const y = hud.height - h;
    hud.rect(0, y, hud.width, h, 'navy');
    rows.forEach((r, i) => sayCentered(hud, cx, y + 3 + i * 11, r.t, { color: r.color, name: r.name }));
    if (App.touchOnly && !App.gamepadSeen) {
      const top = wrap('Controller or keyboard required', cols);
      hud.rect(0, 0, hud.width, top.length * 11 + 6, 'navy');
      top.forEach((t, i) => sayCentered(hud, cx, 3 + i * 11, t, { color: 'sand', name: 'touch-message' }));
    }
  }
}

App.startAttract = () => {
  if (App.session || App.attract) return;
  App.attract = new AttractDirector();
  App.attract.start();
};
