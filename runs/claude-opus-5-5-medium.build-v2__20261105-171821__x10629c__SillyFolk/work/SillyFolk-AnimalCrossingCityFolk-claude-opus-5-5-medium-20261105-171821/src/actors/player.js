// You: movement (own tile collision), targeting, tools, hover, click-to-walk.
import { THREE } from '../engine.js';
import { G, bus } from '../state.js';
import { Actor } from './actor.js';
import { critterDef } from '../art/critter.js';
import { itemDef, TOOL_DEFS, umbrellaDef } from '../art/models.js';
import { buildModel, toonMaterial, PALETTE } from '../engine.js';
import { ITEMS, TOOL_ORDER } from '../data/items.js';
import { T } from '../dev/tuning.js';
import { clamp, angleDelta } from '../core/util.js';
import { UI } from '../ui/kit.js';
import { shirtTexture, patternTexture } from '../art/textures.js';
import { info } from '../core/world.js';
export function lookDef(look, id = 'player') {
  const s = ITEMS[look.shirt], h = look.hat ? ITEMS[look.hat] : null, g = look.glasses ? ITEMS[look.glasses] : null;
  return critterDef({ id: 'pl-' + id + JSON.stringify(look).length + (look.hair ?? 0) + (look.eyes ?? 0) + (look.hairColor ?? '') + (look.shirt ?? '') + (look.hat ?? '') + (look.glasses ?? ''), species: 'person', c1: look.skin ?? 'sand', c2: 'white', shirt: s?.color ?? 'white', trousers: look.trousers ?? 'navy', shoes: 'ink', hair: look.hair ?? 0, hairColor: look.hairColor ?? 'orange', eyes: look.eyes ?? 0, hat: h?.style, hatColor: h?.color, glasses: g?.style });
}
export function applyShirt(actor, look, world) {
  const s = ITEMS[look.shirt]; let tex = null;
  if (look.pattern != null && world?.p.patterns[look.pattern]) tex = patternTexture('pat-' + look.pattern + '-' + (world.p.patternsV ?? 0), world.p.patterns[look.pattern]);
  else if (s?.tex) tex = shirtTexture(s);
  if (!tex) return;
  const col = new THREE.Color(PALETTE[s.color]).getHex();
  actor.obj.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === col) { const parent = m.parent?.name; if (parent === 'Torso' || parent === 'ArmR' || parent === 'ArmL') m.material = toonMaterial(PALETTE.white, { map: tex }); } });
}
export class Player {
  constructor() { this.actor = null; this.speed = 0; this.state = 'free'; this.busy = 0; this.bored = 0; this.target = null; this.walkTo = null; this.onArrive = null; this.fishing = null; this.gagUsed = false; this.stepT = 0; this.aim = null; this.toolObj = null; this.hoverEnt = null; this.nx = 0; this.nz = 0; this.pid = 0; }
  spawn(group, world) { this.actor = new Actor(lookDef(world.p.look)); applyShirt(this.actor, world.p.look, world); this.actor.addTo(group); G.player = this; this.refreshTool(); }
  rebuild() { const w = G.world; this.actor.rebuild(lookDef(w.p.look)); applyShirt(this.actor, w.p.look, w); this.actor.puffy = w.p.puffy; this.refreshTool(); }
  refreshTool() { const w = G.world; if (!w || !this.actor) return; const t = w.p.tool; this.actor.drop(); if (t && TOOL_DEFS[t]) { const b = buildModel(TOOL_DEFS[t], {}); this.actor.hold(b.object); } this.syncUmbrella(); }
  syncUmbrella() { const a = this.actor; if (!a) return; const wx = G.view?.weatherKind; const need = (wx === 'rain' || wx === 'storm') && !G.world.p.tool && G.world.p.look.umbrella; if (need && !this.umb) { const lk = G.world.p.look; const c = ITEMS[lk.umbrella]?.color ?? 'sand'; this.umb = buildModel(umbrellaDef(c), {}).object; if (lk.umbrella === 'u_pattern' && lk.umbPattern != null && G.world.p.patterns[lk.umbPattern]) { const tex = patternTexture(`pat-${lk.umbPattern}-${G.world.p.patternsV ?? 0}`, G.world.p.patterns[lk.umbPattern]); const wh = new THREE.Color(PALETTE.white).getHex(); this.umb.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === wh) m.material = toonMaterial(PALETTE.white, { map: tex }); }); } a.hold(this.umb); } else if (!need && this.umb) { a.drop(); this.umb = null; if (G.world.p.tool) this.refreshTool(); } }
  get x() { return G.world.p.x; } set x(v) { G.world.p.x = v; } get z() { return G.world.p.z; } set z(v) { G.world.p.z = v; }
  placeNow() { const p = G.place; const y = p.heightAt(this.x, this.z); this.actor.place(this.x, y, this.z); this.actor.facing = this.actor.targetFacing = G.world.p.facing; }
  /** Fixed-step movement. */
  fixed(dt, ctrl, frozen) {
    const w = G.world, P = G.place; if (!P) return;
    if (frozen || this.busy > 0 || this.state === 'sit' || this.state === 'fishing' || this.state === 'locked') { this.speed = 0; this.busy = Math.max(0, this.busy - dt); return; }
    const i = ctrl.input, a = i.moveAxis(); let mx = a.x, my = a.y; const mag = Math.min(1, Math.hypot(mx, my));
    let speed = 0;
    if (mag > 0.05) {
      this.walkTo = null;
      const padUsed = Math.abs(i.padAxis.x) + Math.abs(i.padAxis.y) > 0.01;
      const run = ctrl.held('run'), sneak = ctrl.held('sneak');
      if (padUsed) speed = mag < 0.35 ? 1.2 : mag < 0.75 ? T.walk : T.jog; else speed = T.jog;
      if (sneak) speed = 1.2; if (run && !sneak) speed = T.run;
      if (this.state === 'netReady') speed = Math.min(speed, 1.2);
      if (w.p.buffs.coffee && speed === T.jog) speed *= 1.25;
      const b = G.ctx.engine.camera.groundBasis(); const fx = b.right.x * mx + b.forward.x * my, fz = b.right.z * mx + b.forward.z * my;
      const fl = Math.hypot(fx, fz) || 1; this.move(fx / fl, fz / fl, speed, dt, P);
    } else if (this.walkTo) {
      const [tx, tz] = this.walkTo; const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
      const reach = this.walkReach ?? 0.25;
      if (d <= reach) { this.walkTo = null; const f = this.onArrive; this.onArrive = null; if (dx || dz) w.p.facing = Math.atan2(dx, dz); f?.(); }
      else { speed = i.isDown('ShiftLeft') ? T.run : T.jog; const stuckX = this.x, stuckZ = this.z; this.move(dx / d, dz / d, speed, dt, P); if (Math.abs(this.x - stuckX) + Math.abs(this.z - stuckZ) < 1e-4) { this.walkTo = null; this.onArrive = null; } }
    }
    this.speed = speed;
    if (speed > T.jog + 0.5 && w.p.place === 'town' && !w.guest) { const fl = w.grid?.get(Math.floor(this.x) + ',' + Math.floor(this.z)); const e = fl ? w.ents[fl] : null; if (e?.t === 'flower' && !e.wilted) { e.wilted = true; e.dry = 2; w.dirty = true; w.stats.trampled = (w.stats.trampled ?? 0) + 1; G.ctx.audio.play('stepGrass'); } }
    if (speed > T.jog + 0.01) wearTile(this.x, this.z, 1); else if (speed > 0) wearTile(this.x, this.z, 0.15);
  }
  move(dx, dz, speed, dt, P) { const w = G.world; const [nx, nz] = P.move(this.x, this.z, dx * speed * dt, dz * speed * dt, 0.3, G.noclip); this.x = nx; this.z = nz; w.p.facing = Math.atan2(dx, dz); }
  /** Per-frame presentation. */
  update(dt, frozen) {
    const a = this.actor, p = G.place; if (!a || !p) return;
    const y = p.heightAt(this.x, this.z); a.place(this.x, y + (this.state === 'sit' ? 0.02 : 0), this.z); a.targetFacing = G.world.p.facing; a.puffy = G.world.p.puffy;
    if (this.state === 'free' && this.busy <= 0) {
      const s = frozen ? 0 : this.speed; const clip = s === 0 ? (this.bored > 14 ? 'IdleBored' : 'Idle') : s < 1.8 ? 'Tiptoe' : s < 3.4 ? 'Walk' : s < 5 ? 'Jog' : 'Run';
      if (a.onceT <= 0 || s > 0) a.play(clip);
      a.then = null;
      if (s === 0) this.bored += dt; else this.bored = 0;
      if (s > 0) { this.stepT -= dt * s; if (this.stepT <= 0) { this.stepT = 1.3; this.footstep(p, s); } }
      if (s > 0 && G.world.p.place === 'town' && G.view.seasonNow === 3 && p.chAt(this.x, this.z) !== 'P' && G.time - (this.lastPrint ?? 0) > 0.28) { this.lastPrint = G.time; G.view.decals.add('footprint', { x: this.x, y: y + 0.02, z: this.z }, { x: 0, y: 1, z: 0 }, { size: 0.3, rotation: G.world.p.facing, color: PALETTE.mist, life: 25 }); }
      if (s > 5 && G.time - (this.lastDust ?? 0) > 0.22) { this.lastDust = G.time; G.ctx.particles.burst('dust', [this.x, y + 0.1, this.z], { count: 2 }); }
      if (this.wasSpeed > 3 && s === 0) a.squash.kick(-2.4);
      this.wasSpeed = s;
    }
    a.update(dt);
  }
  footstep(p, s) { const c = p.chAt(this.x, this.z); let n = 'stepGrass'; if (p.indoor) n = 'stepCarpet'; else if (c === ',' || c === 'U') n = 'stepPath'; else if (c === 's') n = 'stepSand'; else if (c === 'b') n = 'stepWood'; else if (c === 'P' || c === 'k' || c === 'Q' || c === 'A') n = 'stepStone'; if (G.view.seasonNow === 3 && !p.indoor && G.world.p.place === 'town') n = 'stepSnow'; G.ctx.audio.play(n, { volume: s < 2 ? 0.4 : 1 }); }
  front(d = 0.9) { const f = G.world.p.facing; return [this.x + Math.sin(f) * d, this.z + Math.cos(f) * d]; }
  frontTile(d = 0.9) { const [x, z] = this.front(d); return [Math.floor(x), Math.floor(z)]; }
}
function wearTile(x, z, amt) {
  const w = G.world; if (!w || w.p.place !== 'town') return; const tx = Math.floor(x), tz = Math.floor(z), c = G.places.town.ch(tx, tz); if (c !== '.' && c !== 'u') return; const k = tx + ',' + tz; const v = (w.wear[k] = (w.wear[k] ?? 0) + amt * 0.02); if (v > 8 && !w.worn[k]) { w.worn[k] = 1; G.view.terrain.tileChanged(tx, tz); }
}
