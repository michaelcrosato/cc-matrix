// The Locker Room: you, on a turntable. Skin, hair, top, bottom, headband, jar unlocks.
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { place } from '../art/props.js';
import { BOTTOM_COLORS, HAIR_COLORS, HAIR_STYLES, HEADBANDS, SKINS, TOP_COLORS } from '../data/classmates.js';
import { MILESTONES } from '../data/unlocks.js';
import { Menu } from '../ui/menu.js';
import { TabBar } from '../ui/screens/common.js';
import { promptBar } from '../ui/prompts.js';
import { heading } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { box, setSky } from './sets.js';
import { floorPlane } from '../art/textures.js';
import { withWardrobe } from './activity/lanes.js';

export class LockerScene extends BaseScene {
  name = 'locker';
  id = 'locker';
  canPause = false;
  spin = 0;
  rebuilding = false;

  cameraConfig() { return { preset: 'fixed', position: [0, 1.8, 5.8], target: [0, 1, 0], fov: 32 }; }

  async build(ctx) {
    setSky(ctx, 12);
    ctx.scene.add(floorPlane('clinic-tile', 16, 10, { at: [0, 0, 0] }));
    box(ctx, 16, 0.5, 10, [0, -0.26, 0], 'mist', { cast: false });
    box(ctx, 16, 5, 0.3, [0, 2.5, -2.8], 'white', { cast: false });
    box(ctx, 16, 0.3, 0.2, [0, 2.6, -2.6], 'cyan', { cast: false });
    place(ctx, 'lockers', { at: [-2.4, 0, -2.2] });
    place(ctx, 'lockers', { at: [2.8, 0, -2.2] });
    place(ctx, 'towel-rack', { at: [5.6, 0, -1.8] });
    place(ctx, 'dais', { at: [1.6, -0.2, 0] });
    App.music('title');
    this.look = { ...App.slot.look };
    this.avatar = await makeAvatar(ctx, withWardrobe(this.look, App.slot), { at: [1.6, 0.14, 0], clip: 'Idle' });
    // Two pages: nothing here needs more than 8 rows at a time.
    this.tabs = new TabBar(['You', 'The Jar'], { onChange: () => this.fillMenu() });
    this.menu = new Menu([], { x: 12, width: 252, y: 54, tabbed: true, onBack: () => this.leave() });
    this.fillMenu();
  }

  cycle(key, list, d) {
    const i = Math.max(0, list.indexOf(this.look[key] ?? list[0]));
    const v = list[(i + d + list.length) % list.length];
    if (v === null) delete this.look[key]; else this.look[key] = v;
    this.changed();
  }

  fillMenu() {
    this.menu.focus = 0; this.menu.top = 0;
    this.menu.setItems(this.tabs.i === 0 ? this.bodyItems() : this.jarItems());
  }

  /** Long sleeves and trousers together: "long". The bun is a hair style. */
  bodyItems() {
    const row = (label, id, key, list) => ({ label, id, value: () => String(this.look[key] ?? list[0] ?? 'none'), adjust: (d) => this.cycle(key, list, d), action: () => this.cycle(key, list, 1), sound: 'menuMove' });
    return [
      row('Skin', 'skin', 'skin', SKINS),
      row('Hair style', 'hairStyle', 'hairStyle', HAIR_STYLES),
      row('Hair colour', 'hair', 'hair', HAIR_COLORS),
      row('Top', 'top', 'top', TOP_COLORS),
      row('Bottom', 'bottom', 'bottom', BOTTOM_COLORS),
      { label: 'Length', id: 'long', value: () => (this.look.long ? 'Long' : 'Short'), adjust: () => { this.look.long = !this.look.long; this.changed(); }, action: () => { this.look.long = !this.look.long; this.changed(); }, sound: 'menuMove' },
      row('Headband', 'headband', 'headband', HEADBANDS),
    ];
  }

  jarItems() {
    const slot = App.slot;
    const items = [];
    for (const m of MILESTONES) {
      if (!slot.wardrobe.includes(m.id)) { items.push({ label: `${m.drips} Drips`, id: m.id, disabled: true, focusable: true, right: () => '' }); continue; }
      items.push({ label: m.name, id: m.id, value: () => (this.isWorn(m.id) ? 'On' : 'Off'), adjust: () => this.toggleWorn(m.id), action: () => this.toggleWorn(m.id), sound: 'menuMove' });
    }
    return items;
  }

  isWorn(id) { return (App.slot.worn ?? App.slot.wardrobe).includes(id); }

  toggleWorn(id) {
    const slot = App.slot;
    const worn = new Set(slot.worn ?? slot.wardrobe);
    if (worn.has(id)) worn.delete(id); else worn.add(id);
    slot.worn = [...worn];
    if (id === 'confidence') App.say('ounce', 'No visible effect. As advertised.');
    this.changed();
  }

  changed() {
    App.slot.look = { ...this.look };
    App.store.write();
    this.dirty = true;
  }

  async rebuild(ctx) {
    this.rebuilding = true;
    const old = this.avatar;
    const fresh = await makeAvatar(ctx, withWardrobe(this.look, App.slot), { at: [1.6, 0.14, 0], clip: 'Idle' });
    fresh.root.rotation.y = this.spin;
    ctx.scene.remove(old.root);
    if (old.shadow) ctx.scene.remove(old.shadow);
    fresh.squash.kick(0.6);
    this.avatar = fresh;
    this.rebuilding = false;
  }

  leave() { App.go('hub', { from: 'locker' }); }

  onInput(ctx, dt) { this.tabs?.update(ctx); this.menu?.update(ctx, dt); }

  onUpdate(ctx, dt) {
    if (this.dirty && !this.rebuilding) { this.dirty = false; this.rebuild(ctx); }
    if (!this.avatar) return;
    this.spin += dt * 0.7;
    this.avatar.root.rotation.y = this.spin;
    this.avatar.update(dt);
  }

  onDraw(ctx) {
    const { hud } = ctx;
    heading(hud, 'Locker Room');
    this.tabs?.draw(ctx, 35);
    if (this.menu) {
      this.menu.o.width = Math.min(252, Math.round(hud.width * 0.58));
      this.menu.draw(ctx);
    }
    promptBar(hud, App.device, [['adjust', 'Change'], ['tabs', 'Page'], ['back', 'Done']]);
  }

  fingerprint() { return `${JSON.stringify(this.look)}|${this.menu?.focus}`; }
  status() { return `locker | focus ${this.menu?.focus} | look ${JSON.stringify(this.look)}`; }
}
