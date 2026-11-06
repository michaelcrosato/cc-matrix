// The Map: the peninsula, nine buildings. Stick or hover moves between them; the camera glides; a card names the place.
import { MAP_PLACES } from '../../data/text.js';
import { nudge } from '../../sim/career.js';
import { PLACES } from '../../render/sets.js';
import { statusStrip } from './common.js';
import { THREE } from '../../../pixel-engine.js';
import { LicenceListScreen } from './licence.js';
import { EventListScreen } from './events.js';
import { DealerScreen } from './dealer.js';
import { TuningScreen } from './tuning.js';
import { ServiceScreen } from './service.js';
import { GarageScreen } from './garage.js';
import { MuseumScreen } from './museum.js';
import { TheatreScreen } from './theatre.js';
import { ArcadeScreen } from './arcade.js';
import { MapPause } from './pause.js';
const { Vector3 } = THREE;
const v = new Vector3(), o = new Vector3(), dir = new Vector3();
export class MapScreen {
  constructor(app) { this.id = 'map'; this.app = app; this.noBack = true; this.wrapFocus = false; }
  enter() { const s = this.app.scene; s?.stage?.('map'); this.app.mix.music('lounge'); this.app.idleWatch = true; this.app.actions.idle = 0; this.focus = this.focus ?? nudge(this.app.profile).to; }
  exit() { this.app.idleWatch = false; }
  resume() { const s = this.app.scene; s?.stage?.('map'); this.app.mix.music('lounge'); this.app.idleWatch = true; this.app.actions.idle = 0; }
  open(id, ui) {
    const app = this.app, has = app.profile.cars.length > 0;
    if (!has && id !== 'dealer' && id !== 'museum' && id !== 'arcade' && id !== 'theatre') { ui.note('YOU WILL NEED A CAR FIRST. DEALER ROW IS OPEN.'); app.mix.sfx('denied'); return; }
    const S = { licence: LicenceListScreen, events: EventListScreen, dealer: DealerScreen, tuning: TuningScreen, service: ServiceScreen, garage: GarageScreen, museum: MuseumScreen, theatre: TheatreScreen, arcade: ArcadeScreen }[id];
    ui.push(new S(app));
  }
  draw(ui, dt) {
    const app = this.app, scene = app.scene, cam = scene.cam, ctx = app.ctx, input = ctx.input;
    statusStrip(ui, app);
    // Buildings as items at their projected place. The mouse picks with a ray against a sphere per building.
    let hovered = null;
    if (ui.pointerMoved || app.actions.clicked) { ctx.camera.rayAt(input.pointer.x, input.pointer.y, o, dir); let best = 1e9; for (const [id, p] of Object.entries(PLACES)) { v.set(p[0], 3, p[1]).sub(o); const t = v.dot(dir), d2 = v.lengthSq() - t * t; if (d2 < 22 && t < best) { best = t; hovered = id; } } }
    for (const pl of MAP_PLACES) {
      const p = PLACES[pl.id]; v.set(p[0], 4.5, p[1]).project(cam);
      const sx = (v.x + 1) * 0.5 * ui.w, sy = (1 - v.y) * 0.5 * ui.h, size = 26;
      const ix = Math.max(0, Math.min(ui.w - size, sx - size / 2)), iy = Math.max(0, Math.min(ui.h - size, sy - size / 2)), half = ui.hud.measure(pl.name).width / 2; // a building past the edge of a narrow screen keeps its place at the edge
      const f = ui.item(pl.id, ix, iy, size, size, { confirm: () => this.open(pl.id, ui) });
      if (f) { ui.text(Math.max(half + 2, Math.min(ui.w - half - 2, ix + size / 2)), Math.max(14, iy - 11), pl.name, { align: 'center', color: 'sand' }); }
      else ui.rect(sx - 1, sy - 1, 3, 3, 'white');
    }
    if (hovered && hovered !== this.focus) { this.focus = hovered; app.mix.sfx('tick'); }
    if (hovered && app.actions.clicked && ui.locked <= 0) { app.mix.sfx('confirm'); this.open(hovered, ui); return; }
    // The camera leans toward the focused place.
    const f = PLACES[this.focus]; if (app.actions.lastDevice === 'mouse') { scene.wantLook.set(0, 0, 3); scene.wantPos.set(0, 38, 53); } else if (f) { scene.wantLook.set(f[0] * 0.3, 0, 3 + f[1] * 0.25); scene.wantPos.set(f[0] * 0.25, 38, 53 + f[1] * 0.2); }
    // A card for the place, a nudge for what to try next.
    const pl = MAP_PLACES.find((x) => x.id === this.focus);
    if (pl) { const w = Math.min(ui.w - 20, 340), x = 10, y = ui.h - 58; ui.panel(x, y, w, 26, { color: 'ink', border: 'slate' }); ui.text(x + 6, y + 4, pl.name, { color: 'sand' }); ui.text(x + 6, y + 14, pl.blurb); }
    const n = nudge(app.profile);
    ui.panel(10, 20, Math.min(ui.w - 20, ui.hud.measure(n.text).width + 12), 13, { color: 'ink', border: false, scan: true });
    ui.text(16, 23, n.text, { color: 'white' });
    ui.prompts([['confirm', 'GO IN'], ['move', 'MOVE'], ['pause', 'MENU']]);
    if (app.actions.pressed('pause') || app.actions.rclicked) { if (ui.locked <= 0) ui.push(new MapPause(app)); }
    void dt;
  }
}
