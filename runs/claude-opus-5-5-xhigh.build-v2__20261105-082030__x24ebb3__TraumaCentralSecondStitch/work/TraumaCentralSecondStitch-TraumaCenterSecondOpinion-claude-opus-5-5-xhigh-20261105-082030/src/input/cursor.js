// One seat's hands: reads its device(s) and produces the sim's input. Stick and keys drive the same
// integrator; the mouse puts the tip exactly where it points, on the surface, not on a plane.
import { THREE } from '../../pixel-engine.js';
import { clamp, pathHeading } from '../core/geom.js';
import { TOOLS, validTargets } from '../sim/entities.js';
import { PAD } from './devices.js';

const o = new THREE.Vector3(), d = new THREE.Vector3();
const AIM = { off: { slow: 1, damp: 1 }, low: { slow: null, damp: 0.5 }, high: { slow: 0.42, damp: 0.25 } };

export class SeatControl {
  /** @param binding 'all' (keys, mouse and every pad), 'kbm', or a pad index */
  constructor(app, seatId, binding = 'all') {
    this.app = app;
    this.seatId = seatId;
    this.binding = binding;
    this.x = 0; this.z = 0.5;
    this.tool = null;
    this.lastTool = null;
    this.table = 0;
    this.input = { x: 0, z: 0, tool: null, use: false, force: 1, gift: false, steady: false, a: false, b: false, rot: 0, tag: false, table: 0, drop: false };
    this.mouseAim = binding === 'all' || binding === 'kbm';
    this.quick = null;
    this.wheelShown = 0;
    this.frame = -1;
    this.rotPending = 0;
    this.giftToggle = false;
    this.flickArmed = true;
    this.reminder = false;
    this.useWas = false;
  }

  hasKbm() { return this.binding === 'all' || this.binding === 'kbm'; }
  pads() {
    const all = this.app.devices.pads;
    if (this.binding === 'all') return all.filter((p) => p.connected);
    if (typeof this.binding === 'number') return all[this.binding]?.connected ? [all[this.binding]] : [];
    return [];
  }
  primaryPad() { return this.pads()[0] ?? null; }

  /** Edges: once per rendered frame. Selecting tools, tables, quick actions. */
  frameEdges(ctx, sim) {
    if (ctx.engine.frame === this.frame) return;
    this.frame = ctx.engine.frame;
    const seat = sim.seats.find((s) => s.id === this.seatId);
    if (!seat) return;
    const input = ctx.input;
    const kb = this.hasKbm();
    const pads = this.pads();
    const unlocked = sim.tools;
    const pick = (t) => {
      if (!t || !unlocked.includes(t)) return false;
      if (t !== this.tool) {
        this.lastTool = this.tool;
        this.tool = t;
        this.app.sfx('click', { pitch: TOOLS.indexOf(t) });
      }
      this.quick = null;
      return true;
    };
    if (!this.tool || !unlocked.includes(this.tool)) this.tool = seat.tool;
    const holdingFragment = seat.grab && sim.ents.find((e) => e.id === seat.grab)?.rotTo != null;
    this.rotPending = 0;
    // Number keys, wheel, last tool.
    if (kb) {
      for (let i = 0; i < 8; i++) if (input.wasPressed(`Digit${i + 1}`)) pick(TOOLS[i]);
      if (input.wheel && !holdingFragment) {
        const list = TOOLS.filter((t) => unlocked.includes(t));
        const i = list.indexOf(this.tool);
        pick(list[(i + (input.wheel > 0 ? 1 : list.length - 1)) % list.length]);
      }
      if (holdingFragment) {
        if (input.wheel) this.rotPending += input.wheel * 12;
        if (input.isDown('KeyQ')) this.rotPending -= 3;
        if (input.isDown('KeyE')) this.rotPending += 3;
      } else if (input.wasPressed('KeyQ')) pick(this.lastTool);
      if (input.wasPressed('KeyF')) this.quickSyringe(unlocked);
      if (input.wasPressed('Tab')) this.nextTable(sim, 1);
      if (input.wasPressed('KeyE') && !holdingFragment) this.tagOrRemind(sim);
    }
    for (const p of pads) {
      const rx = p.axes[2], ry = p.axes[3];
      const mag = Math.hypot(rx, ry);
      if (holdingFragment) {
        this.rotPending += rx * 3.2;
      } else if (mag > 0.6) {
        this.wheelShown = 0.8;
        // 8 directions, clockwise from top.
        const a = (Math.atan2(rx, -ry) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.round(a / (Math.PI / 4)) % 8;
        if (TOOLS[idx] !== this.tool && unlocked.includes(TOOLS[idx])) pick(TOOLS[idx]);
      }
      if (p.edge[PAD.r1]) pick(this.lastTool);
      if (p.edge[PAD.square]) this.quickSyringe(unlocked);
      if (p.edge[PAD.left]) this.nextTable(sim, -1);
      if (p.edge[PAD.right]) this.nextTable(sim, 1);
      if (p.edge[PAD.triangle]) this.tagOrRemind(sim);
    }
    this.wheelShown = Math.max(0, this.wheelShown - (this.app.frameDt ?? 1 / 60));
    this.tagPressed = this.tagRequest ?? false;
    this.tagRequest = false;
  }
  quickSyringe(unlocked) {
    if (!unlocked.includes('syringe')) return;
    if (this.tool === 'syringe' && this.quick) { this.tool = this.quick; this.quick = null; return; }
    if (this.tool !== 'syringe') { this.quick = this.tool; this.lastTool = this.tool; this.tool = 'syringe'; this.app.sfx('click'); }
  }
  nextTable(sim, dir) {
    if (sim.tables.length < 2) return;
    this.table = (this.table + dir + sim.tables.length) % sim.tables.length;
    this.input.table = this.table;
  }
  tagOrRemind(sim) {
    if (sim.def?.partner) this.tagRequest = true;
    else this.reminder = true;
  }

  /** Per fixed step: integrate the tip and build the sim input. */
  step(ctx, sim, view, dt) {
    const seat = sim.seats.find((s) => s.id === this.seatId);
    if (!seat) return this.input;
    this.frameEdges(ctx, sim);
    const devices = this.app.devices;
    const input = ctx.input;
    const kb = this.hasKbm();
    const pads = this.pads();
    const cfg = this.app.config;
    const settings = this.app.save.settings;
    const aim = AIM[settings.aimAssist] ?? AIM.low;

    // Sticks and keys.
    let sx = 0, sy = 0;
    let usedStick = false;
    for (const p of pads) {
      if (p.axes[0] || p.axes[1]) { sx += p.axes[0]; sy += p.axes[1]; usedStick = true; }
    }
    let keyMove = false;
    if (kb) {
      const r = input.isDown('KeyD', 'ArrowRight'), l = input.isDown('KeyA', 'ArrowLeft'), u = input.isDown('KeyW', 'ArrowUp'), dn = input.isDown('KeyS', 'ArrowDown');
      if (r || l || u || dn) {
        keyMove = true;
        sx += (r ? 0.82 : 0) - (l ? 0.82 : 0);
        sy += (dn ? 0.82 : 0) - (u ? 0.82 : 0);
      }
    }
    const mag = Math.min(1, Math.hypot(sx, sy));
    const steady = (kb && input.isDown('ShiftLeft', 'ShiftRight')) || pads.some((p) => p.down[PAD.l1]);
    if (mag > 0) {
      this.mouseAim = false;
      const dirX = sx / (Math.hypot(sx, sy) || 1), dirY = sy / (Math.hypot(sx, sy) || 1);
      let speed = cfg.cursorSpeed * settings.cursorSpeed * mag ** 2.2 * (steady ? cfg.steadyFactor : 1);
      // Aim assist: a little drag near a valid target; drift off a stroke is damped.
      let slow = 1;
      if (settings.aimAssist !== 'off') {
        const tool = seat.tool;
        for (const t of validTargets(sim, seat, tool)) {
          if (Math.hypot(t.x - this.x, t.z - this.z) < 0.6) { slow = aim.slow ?? cfg.aimAssist; break; }
        }
      }
      speed *= slow;
      let vx = dirX * speed, vz = dirY * speed;
      const cutting = seat.cutting ? sim.ents.find((e) => e.id === seat.cutting) : null;
      if (cutting && settings.aimAssist !== 'off') {
        const h = pathHeading(cutting.path, cutting.s);
        const ux = Math.cos(h), uz = Math.sin(h);
        const along = vx * ux + vz * uz;
        const perpX = vx - ux * along, perpZ = vz - uz * along;
        vx = ux * along + perpX * aim.damp;
        vz = uz * along + perpZ * aim.damp;
      }
      this.x = clamp(this.x + vx * dt, -8, 8);
      this.z = clamp(this.z + vz * dt, -4.5, 4.5);
    }
    // The mouse: exactly where it points, on the surface.
    if (kb && devices.mouseMoved) this.mouseAim = true;
    if (kb && this.mouseAim && view && input.pointer) {
      const cam = ctx.camera;
      cam.rayAt(input.pointer.x, input.pointer.y, o, d);
      const tv = view.tableViews?.[this.table];
      const off = tv?.offsetX ?? 0;
      let y = 0, wx = 0, wz = 0;
      for (let i = 0; i < 4; i++) {
        const t = (y - o.y) / d.y;
        wx = o.x + d.x * t;
        wz = o.z + d.z * t;
        y = tv ? tv.heightAt(wx - off, wz) : 0;
      }
      this.x = clamp(wx - off, -8, 8);
      this.z = clamp(wz, -4.5, 4.5);
    }

    // Buttons.
    let useV = 0;
    for (const p of pads) {
      useV = Math.max(useV, p.values[PAD.r2], p.down[PAD.cross] ? 1 : 0);
    }
    const mouseL = kb && input.isDown('MouseLeft');
    const mouseR = kb && input.isDown('MouseRight');
    const j = kb && input.isDown('KeyJ'), k = kb && input.isDown('KeyK');
    let use = useV > 0.12 || mouseL || j;
    const force = mouseL || j ? 1 : Math.max(0.35, Math.min(1, useV * 1.15));
    const drop = mouseR || k || pads.some((p) => p.down[PAD.circle]);
    if (drop) use = false;
    // Paddles and massage: both sides.
    const a = pads.some((p) => p.values[PAD.l2] > 0.4) || mouseL || j;
    const b = pads.some((p) => p.values[PAD.r2] > 0.4) || mouseR || k;
    // Gift.
    let gift = (kb && input.isDown('Space')) || pads.some((p) => p.values[PAD.l2] > 0.4);
    if (settings.giftMode === 'toggle' && seat.gift === 'quiet') {
      const edge = gift && !this.giftWasRaw;
      this.giftWasRaw = gift;
      if (edge) this.giftToggle = !this.giftToggle;
      if (!sim.quiet && !edge && this.giftToggle && sim.composure < 20) this.giftToggle = false;
      gift = this.giftToggle;
    }
    // Quick syringe: back to the old tool once the dose has been given.
    if (this.quick && this.useWas && !use && this.tool === 'syringe') { this.tool = this.quick; this.quick = null; }
    this.useWas = use;

    const inp = this.input;
    inp.x = this.x; inp.z = this.z;
    inp.tool = this.tool;
    inp.use = use;
    inp.force = force;
    inp.gift = gift;
    inp.steady = steady;
    inp.a = a;
    inp.b = b;
    inp.rot = this.rotPending;
    inp.table = this.table;
    inp.tag = this.tagPressed ?? false;
    inp.drop = drop;
    if (keyMove || usedStick) this.mouseAim = false;
    return inp;
  }

  syncFromSeat(seat) {
    this.x = seat.x;
    this.z = seat.z;
    this.tool = seat.tool;
    this.table = seat.table;
  }
}
