// Neighbours keep living whether you are there or not: routines, paths, chats, bubbles.
import { Actor } from './rig.js';
import { CRITTER_DEFS } from '../art/critter.js';
import { NEIGHBOURS, NEIGHBOUR_ORDER, POIS } from '../data/neighbours.js';
import { BUILDINGS, LANDMARKS } from '../data/town.js';
import { tuning } from '../dev/tuning.js';
import { Stream } from '../core/rng.js';
import { hourNow } from '../systems/time.js';
import { CHATS } from '../data/dialogue/unique.js';
import { weatherNow } from '../systems/time.js';

const UMBRELLA = { dorrit: 'orange', tavi: 'sand', bartleby: 'night', ottoline: 'plum', rocco: 'red', nib: 'navy', ozzie: 'slate', yolanda: 'red', fitch: 'green' };
const doorOf = (id) => { const b = BUILDINGS.find((x) => x.id === NEIGHBOURS[id].building); return b.door; };

class Npc {
  constructor(g, id) {
    this.g = g;
    this.id = id;
    this.data = NEIGHBOURS[id];
    this.actor = new Actor(CRITTER_DEFS[id], { name: id, seed: id.length + id.charCodeAt(0) });
    this.state = 'idle';
    this.timer = 1;
    this.path = null;
    this.inside = false;
    this.talking = false;
    this.bubble = null;
    this.bubbleT = 0;
    this.chatPartner = null;
    this.poi = null;
    this.poiIdx = 0;
    this.umbrella = null;
    this.tailT = 0;
  }
  get saved() { return this.g.world.npcs[this.id]; }
  get here() { return this.saved.moved === 'here' || this.saved.moved === 'leaving'; }
  setPos(x, z) {
    const p = this.g.town;
    this.actor.x = x; this.actor.z = z; this.actor.y = p.height(x, z);
  }
  shouldBeOut() {
    const w = this.g.world;
    if (!this.here) return false;
    if (this.g.festivals?.holdsNpc?.(this.id)) return true;
    const h = hourNow(w) < 5 ? hourNow(w) + 24 : hourNow(w);
    if (h < this.data.wake || h >= this.data.sleep) return false;
    const k = weatherNow(this.g);
    const wet = k === 'rain' || k === 'storm';
    const s = new Stream(`${w.seed}:rainy:${w.clock.day}:${this.id}`);
    if (wet && s.chance(0.4)) return false;
    if (this.g.cal.festival === 'longNight' && h >= 22) return true;
    return true;
  }
  walkTo(x, z) {
    const nav = this.g.town.nav;
    const p = nav.path([this.actor.x, 0, this.actor.z], [x, 0, z]);
    if (p && p.length > 1) { this.path = p.slice(1); this.state = 'walk'; return true; }
    this.path = null;
    return false;
  }
  pickPoi() {
    const w = this.g.world;
    const s = new Stream(`${w.seed}:poi:${w.clock.day}:${this.id}`);
    const list = s.shuffle(POIS);
    this.poiIdx = (this.poiIdx + 1) % list.length;
    return list[this.poiIdx];
  }
  fixedStep(dt) {
    if (this.talking || this.held) return;
    const g = this.g;
    if (!this.here) { this.inside = true; return; }
    const out = this.shouldBeOut();
    if (!out && !this.inside && this.state !== 'goingHome') {
      const [dx, dz] = doorOf(this.id);
      if (this.walkTo(dx, dz)) this.state = 'goingHome'; else { this.inside = true; this.state = 'idle'; }
    }
    if (out && this.inside) {
      const [dx, dz] = doorOf(this.id);
      this.inside = false;
      this.setPos(dx, dz + 0.4);
      this.state = 'idle';
      this.timer = 2;
      this.g.npcs.syncVisibility(this);
    }
    if (this.inside) return;
    switch (this.state) {
      case 'walk': case 'goingHome': {
        const a = this.actor;
        const n = this.path?.[0];
        if (!n) { this.arrive(); break; }
        const ddx = n[0] - a.x, ddz = n[2] - a.z;
        const d = Math.hypot(ddx, ddz);
        const sp = tuning.npcSpeed * (this.id === 'rocco' ? 1.7 : this.id === 'nib' ? 0.8 : 1);
        if (d < 0.1) { this.path.shift(); if (!this.path.length) this.arrive(); break; }
        a.x += (ddx / d) * sp * dt; a.z += (ddz / d) * sp * dt;
        a.y = g.town.height(a.x, a.z);
        a.turnTo = Math.atan2(ddx, ddz);
        break;
      }
      case 'idle': case 'sit': case 'stare': case 'fish': case 'chat': {
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.state === 'chat') { this.chatPartner = null; }
          const next = this.pickPoi();
          this.poi = next;
          if (!this.walkTo(next.x, next.z)) { this.state = 'idle'; this.timer = 4; }
        }
        break;
      }
      default: break;
    }
  }
  arrive() {
    this.path = null;
    if (this.state === 'goingHome') { this.inside = true; this.state = 'idle'; this.g.npcs.syncVisibility(this); return; }
    const kind = this.poi?.kind ?? 'stand';
    this.state = kind === 'sit' ? 'sit' : kind === 'fish' ? 'fish' : kind === 'stare' ? 'stare' : 'idle';
    this.timer = 18 + ((this.actor.x * 37 + this.actor.z * 13) % 24);
    if (this.poi?.face !== undefined) this.actor.turnTo = this.poi.face;
  }
  presentation(dt, near) {
    const a = this.actor;
    if (this.inside && !this.g.npcs.roomGuest(this)) return;
    if (!near) { a.time += dt; a.root.position.set(a.x, a.y, a.z); if (a.shadow) a.shadow.place(a.x, a.y, a.z, 0); return; }
    if (!this.talking && !a.finished === false) { /* finished a once clip */ }
    let clip = 'Idle';
    if (this.state === 'walk' || this.state === 'goingHome') clip = this.id === 'rocco' ? 'RoccoRoll' : 'Walk';
    else if (this.state === 'sit') clip = 'Sit';
    else if (this.state === 'fish') clip = 'Reel';
    else if (this.state === 'stare') clip = 'Hum';
    else if (this.state === 'chat') clip = 'Talk';
    else if (this.talking) clip = 'Listen';
    if (this.g.festivals?.pose?.(this.id)) clip = this.g.festivals.pose(this.id);
    if (this.overrideClip) clip = this.overrideClip;
    // Rain: umbrellas out
    const k = this.g.sky?.kind;
    a.setUmbrella(k === 'rain' || k === 'storm' ? { a: UMBRELLA[this.id] ?? 'blue', b: 'navy' } : null);
    if (!this.emoting || a.finished) {
      this.emoting = false;
      if (a.playing !== clip) a.play(clip, 0.2);
    }
    a.update(dt);
    if (this.bubbleT > 0) this.bubbleT -= dt;
  }
}

export class NpcManager {
  constructor(g) { this.g = g; this.list = []; this.map = new Map(); this.chatT = 6; this.chatSeq = 0; this.roomOwner = null; }
  buildAll() {
    const g = this.g;
    for (const id of NEIGHBOUR_ORDER) {
      const n = new Npc(g, id);
      n.actor.addTo(g.town.group);
      this.list.push(n);
      this.map.set(id, n);
    }
    this.scatter();
  }
  /** Put everyone where their routine says (a new day, a save, a long sleep). */
  scatter() {
    const g = this.g;
    const w = g.world;
    const s = new Stream(`${w.seed}:scatter:${w.clock.day}:${Math.floor(w.clock.minute / 60)}`);
    for (const n of this.list) {
      n.talking = false; n.path = null; n.chatPartner = null; n.state = 'idle'; n.timer = s.range(2, 15);
      const [dx, dz] = doorOf(n.id);
      if (!n.here || !n.shouldBeOut()) { n.inside = true; n.setPos(dx, dz + 0.4); }
      else {
        n.inside = false;
        const poi = s.pick(POIS);
        n.poi = poi;
        n.setPos(poi.x, poi.z);
        n.state = poi.kind === 'sit' ? 'sit' : poi.kind === 'fish' ? 'fish' : poi.kind === 'stare' ? 'stare' : 'idle';
        n.timer = s.range(6, 30);
        if (poi.face !== undefined) n.actor.facing = poi.face;
      }
      this.syncVisibility(n);
    }
  }
  roomGuest(n) { const p = this.g.place; return p?.kind === 'room' && p.owner === n.id && n.here && n.inside; }
  syncVisibility(n) {
    const g = this.g;
    const p = g.place;
    if (this.roomGuest(n)) {
      n.actor.addTo(p.group);
      n.actor.visible = true;
      const spot = p.ownerSpot ?? [0, 0];
      n.actor.x = spot[0]; n.actor.z = spot[1]; n.actor.y = 0; n.actor.facing = 0;
      return;
    }
    if (n.actor.root.parent !== g.town.group) n.actor.addTo(g.town.group);
    n.actor.visible = !n.inside && n.here;
    if (!n.inside) n.setPos(n.actor.x, n.actor.z);
  }
  placeChanged() { for (const n of this.list) this.syncVisibility(n); }
  get(id) { return this.map.get(id); }
  actor(id) { return this.map.get(id)?.actor ?? null; }
  fixedStep(dt) {
    for (const n of this.list) n.fixedStep(dt);
    this.chatT -= dt * tuning.chatRate;
    if (this.chatT <= 0 && tuning.chatRate > 0) {
      this.chatT = 9;
      this.tryChat();
    }
  }
  tryChat() {
    const idle = this.list.filter((n) => !n.inside && !n.talking && (n.state === 'idle' || n.state === 'stare') && !n.chatPartner && n.here);
    for (let i = 0; i < idle.length; i++) for (let j = i + 1; j < idle.length; j++) {
      const a = idle[i], b = idle[j];
      if (Math.hypot(a.actor.x - b.actor.x, a.actor.z - b.actor.z) > 6) continue;
      const chat = CHATS.find((c) => (c[0] === a.id && c[1] === b.id) || (c[0] === b.id && c[1] === a.id));
      if (!chat) continue;
      const first = chat[0] === a.id ? a : b;
      const second = first === a ? b : a;
      for (const n of [first, second]) { n.state = 'chat'; n.timer = 12; n.chatPartner = n === first ? second : first; n.path = null; }
      first.actor.faceToward(second.actor.x, second.actor.z);
      second.actor.faceToward(first.actor.x, first.actor.z);
      first.bubble = chat[2]; first.bubbleT = 6;
      second.bubble = chat[3]; second.bubbleT = 0;
      second.pendingBubble = 3;
      this.g.events.emit('chat', { a: first.id, b: second.id });
      return;
    }
  }
  presentation(dt) {
    const g = this.g;
    const p = g.player;
    const camX = p.x, camZ = p.z;
    const inTown = g.place === g.town;
    for (const n of this.list) {
      const a = n.actor;
      if (n.pendingBubble > 0) { n.pendingBubble -= dt; if (n.pendingBubble <= 0) { n.bubbleT = 4; } }
      if (!a.visible) continue;
      const near = !inTown ? true : Math.abs(a.x - camX) < 16 && Math.abs(a.z - camZ) < 16;
      n.presentation(dt, near);
    }
  }
  /** Who should show a "!"? */
  markerList() { return this.list.filter((n) => n.saved.favour && n.saved.favour.state === 'offer' && !n.inside && n.actor.visible); }
  all() { return this.list; }
}
export { LANDMARKS };
