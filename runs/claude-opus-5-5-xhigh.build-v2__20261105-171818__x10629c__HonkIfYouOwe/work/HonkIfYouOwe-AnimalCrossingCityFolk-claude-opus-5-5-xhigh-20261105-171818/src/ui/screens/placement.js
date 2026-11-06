// Placement: an in-room grid, nothing else on screen. Cross lifts or drops, L1/R1 rotates, mouse drags.
import { drawText, panel } from '../draw.js';
import { ITEMS } from '../../data/items.js';
import { addItem, removeSlot, hasRoom } from '../../systems/economy.js';
import { THREE, toonMaterial, PALETTE } from '../../engine.js';

const { Mesh, BoxGeometry, Group } = THREE;
class Placement {
  constructor(g, pocketIndex) {
    this.id = 'placement';
    this.modal = true;
    this.room = g.place;
    this.cx = Math.floor(this.room.w / 2); this.cz = Math.floor(this.room.d / 2);
    this.held = null;
    this.pocketIndex = pocketIndex;
    this.ghost = new Group();
    this.cursor = new Group();
    const mat = toonMaterial(PALETTE.sand);
    for (const [w, d, x, z] of [[1, 0.08, 0.5, 0.04], [1, 0.08, 0.5, 0.96], [0.08, 1, 0.04, 0.5], [0.08, 1, 0.96, 0.5]]) { const m = new Mesh(new BoxGeometry(w, 0.04, d), mat); m.position.set(x, 0.05, z); this.cursor.add(m); }
    this.room.group.add(this.cursor);
    this.grid = new Group();
    const gm = toonMaterial(PALETTE.mist);
    for (let x = 0; x <= this.room.w; x++) { const l = new Mesh(new BoxGeometry(0.02, 0.01, this.room.d), gm); l.position.set(x, 0.02, this.room.d / 2); this.grid.add(l); }
    for (let z = 0; z <= this.room.d; z++) { const l = new Mesh(new BoxGeometry(this.room.w, 0.01, 0.02), gm); l.position.set(this.room.w / 2, 0.02, z); this.grid.add(l); }
    this.room.group.add(this.grid);
    if (pocketIndex >= 0) {
      const slot = g.world.player.pockets[pocketIndex];
      if (slot) { this.held = { id: slot.id, x: this.cx, z: this.cz, rot: 0, on: true, fresh: pocketIndex }; this.makeGhost(g); }
    }
    this.prevHideHud = g.hideHud;
    g.hideHud = true;
    g.camFocus = { x: this.room.w / 2, y: 0.6, z: this.room.d / 2 };
  }
  focusIndex() { return this.cz * 100 + this.cx; }
  labels() { return []; }
  makeGhost(g) {
    this.ghost.clear();
    this.ghost.removeFromParent();
    const it = ITEMS[this.held.id];
    const box = new Mesh(new BoxGeometry(it.w * 0.9, 0.5, it.d * 0.9), toonMaterial(PALETTE.sand));
    box.position.y = 0.3;
    this.ghost.add(box);
    this.room.group.add(this.ghost);
  }
  fits(g, item) {
    const it = ITEMS[item.id];
    const rotated = item.rot % 2 === 1;
    const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
    const room = this.room;
    if (item.x < 0 || item.z < 0 || item.x + w > room.w || item.z + d > room.d) return false;
    const e = room.def.exit;
    if (e && item.z + d >= room.d - 1.5 && Math.abs(item.x + w / 2 - e.x) < 1.2 + w / 2) return false;
    if (it.flat) return true;
    for (const other of room.roomData.items) {
      const ot = ITEMS[other.id];
      if (ot.flat || other === item) continue;
      const orot = other.rot % 2 === 1;
      const ow = orot ? ot.d : ot.w, od = orot ? ot.w : ot.d;
      if (item.x < other.x + ow && item.x + w > other.x && item.z < other.z + od && item.z + d > other.z) return false;
    }
    return true;
  }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.left) { this.cx = Math.max(0, this.cx - 1); g.sound('uiTick'); }
    if (inp.nav.right) { this.cx = Math.min(this.room.w - 1, this.cx + 1); g.sound('uiTick'); }
    if (inp.nav.up) { this.cz = Math.max(0, this.cz - 1); g.sound('uiTick'); }
    if (inp.nav.down) { this.cz = Math.min(this.room.d - 1, this.cz + 1); g.sound('uiTick'); }
    if (m.moved && m.over) { const h = g.interact.groundPoint(); if (h) { this.cx = Math.max(0, Math.min(this.room.w - 1, Math.floor(h.x))); this.cz = Math.max(0, Math.min(this.room.d - 1, Math.floor(h.z))); } }
    this.cursor.position.set(this.cx, 0, this.cz);
    if (this.held) {
      this.held.x = this.cx; this.held.z = this.cz;
      const it = ITEMS[this.held.id];
      const rotated = this.held.rot % 2 === 1;
      const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
      this.ghost.position.set(this.cx + w / 2, 0, this.cz + d / 2);
      this.ghost.rotation.y = (this.held.rot * Math.PI) / 2;
      if (inp.prevTool || inp.tabPrev) { this.held.rot = (this.held.rot + 3) % 4; g.sound('uiTab'); }
      if (inp.nextTool || inp.tabNext) { this.held.rot = (this.held.rot + 1) % 4; g.sound('uiTab'); }
    }
    const act = inp.confirm || m.click;
    if (act) {
      if (this.held) {
        if (!this.fits(g, this.held)) { g.sound('uiError'); g.ui.toastMsg("It won't go there. Mind the door."); }
        else {
          const placed = { id: this.held.id, x: this.held.x, z: this.held.z, rot: this.held.rot, on: true };
          if (this.held.fresh !== undefined) removeSlot(g, this.held.fresh);
          this.room.roomData.items.push(placed);
          this.held = null;
          this.ghost.removeFromParent();
          this.room.placeItems();
          this.room.syncLamps();
          this.room.attachViews();
          g.sound('drop');
          g.events.emit('placed', { id: placed.id });
          g.world.player.catalog[placed.id] = true;
        }
      } else {
        const list = this.room.roomData.items;
        const i = list.findIndex((o) => { const it = ITEMS[o.id]; const r = o.rot % 2 === 1; const w = r ? it.d : it.w, d = r ? it.w : it.d; return this.cx >= o.x && this.cx < o.x + w && this.cz >= o.z && this.cz < o.z + d; });
        if (i >= 0) {
          const o = list.splice(i, 1)[0];
          this.held = { id: o.id, x: o.x, z: o.z, rot: o.rot };
          this.makeGhost(g);
          this.room.placeItems();
          this.room.syncLamps();
          this.room.attachViews();
          g.sound('pickUp');
          g.events.emit('lifted', { id: o.id });
        } else g.sound('uiTick');
      }
    }
    if (inp.square && this.held && this.held.fresh === undefined) {
      if (hasRoom(g.world)) { addItem(g, this.held.id); this.held = null; this.ghost.removeFromParent(); g.sound('pickUp'); }
    }
    if (inp.back || m.rclick) {
      if (this.held && this.held.fresh === undefined) {
        // Something still in hand goes back in your pockets
        if (hasRoom(g.world)) addItem(g, this.held.id);
        else this.room.roomData.items.push({ id: this.held.id, x: this.held.x, z: this.held.z, rot: this.held.rot, on: true });
      }
      this.leave(g);
    }
  }
  leave(g) {
    g.sound('uiCancel');
    this.ghost.removeFromParent();
    this.cursor.removeFromParent();
    this.grid.removeFromParent();
    g.hideHud = this.prevHideHud;
    g.camFocus = null;
    this.room.placeItems();
    this.room.syncLamps();
    this.room.attachViews();
    g.ui.pop(this);
  }
  prompts() { return this.held ? [['confirm', 'Drop'], ['tools', 'Rotate'], ['fill', 'To pockets'], ['back', 'Finish']] : [['confirm', 'Lift'], ['back', 'Finish']]; }
  draw(g, hud) {
    if (this.held) {
      const it = ITEMS[this.held.id];
      const w = 12 + it.name.length * 6;
      panel(hud, 240 - w / 2, 14, w, 17, { fill: 'white', trim: 'sand' });
      drawText(hud, 240, 19, it.name, { align: 'center', color: 'ink' });
    }
  }
}
export const placementScreen = (g, i = -1) => new Placement(g, i);
