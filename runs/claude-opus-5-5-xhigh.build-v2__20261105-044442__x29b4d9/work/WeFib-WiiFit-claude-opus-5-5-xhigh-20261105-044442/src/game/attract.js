import { h } from '../ui/dom.js';
import { EventRun } from './eventRun.js';
import { hasEvent } from '../events/index.js';
import { TITLE, SEAT_COLOURS } from '../data/config.js';
import { glyphHTML } from '../input/glyphs.js';
import { rot2 } from '../render/cameraRig.js';
import { Doll } from '../art/doll.js';
import { TIER_NAMES } from '../data/events.js';
import { MAP } from '../art/island.js';
import * as THREE from 'three/webgpu';

const COLS = ['#2CB5A0', '#E8644A', '#F5C84A', '#8A5BA8'];
const bots = (n, skill = 'average') => Array.from({ length: n }, (_, i) => ({ kind: 'bot', skill: i === 0 ? 'sharp' : skill, name: ['Margaret', 'Kevin', 'Sandra', 'Paul'][i], colour: COLS[i % 4] }));
const VIGNETTES = [
  { id: 'walk' },
  { id: 'fruitHat', after: (ev) => { ev.god = false; ev.lanes[0].bankAt = 11; ev.nextFruit = 0.3; ev.cfg = { ...ev.cfg, every: 0.8 }; } },
  { id: 'cairn', after: (ev) => { ev.cfg = { ...ev.cfg, every: 2.2 }; } },
  { id: 'stepClass', after: (ev) => { ev.useAudio = false; ev.clock = 8; ev.nextClick = ev.notes.findIndex((n) => n.t >= 8); } },
  { id: 'plates' },
  { id: 'springboard', after: (ev) => { const l = ev.lanes[0]; l.boardV = 4; l.pumpT = 3; } },
  { id: 'raft', lanes: 4, god: false },
  { id: 'roomService', after: (ev) => { ev.gustNext = 1.5; } },
  { id: 'poses' },
];
const _v = new THREE.Vector3(), _iq = new THREE.Quaternion();

/** Island walk vignette: a bot wanders and the island tips under it. */
class WalkVignette {
  constructor(game) { this.game = game; this.name = 'walk'; this.ev = null; this.t = 0; this.leg = 0; }
  enter() {
    const g = this.game;
    g.setIsland('home');
    g.palette.set('noon', 1);
    g.audio.music('island');
    this.doll = new Doll({ shirt: '#2CB5A0', hat: 'visor' });
    g.art.group.add(this.doll.root);
    g.phys.setPosition(0, 10);
    this.spots = [MAP.pier, MAP.lighthouse, MAP.sunDeck, MAP.yard, MAP.bandstand];
    this.frameCam(true);
  }
  frameCam(snap) {
    const g = this.game, p = g.phys.pos;
    g.art.group.updateWorldMatrix(true, false);
    _v.set(p.x, 0.9, p.z).applyMatrix4(g.art.group.matrixWorld);
    g.rig.shot(_v.x + 8, _v.y + 7, _v.z + 13, _v.x, _v.y + 0.5, _v.z, { snap, rate: 3, fov: 42 });
  }
  fixed(dt) {
    const g = this.game, ph = g.phys;
    this.t += dt;
    const s = this.spots[this.leg % this.spots.length];
    const p = ph.pos;
    const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz);
    if (d < 3) this.leg++;
    ph.wantX = (dx / (d || 1)) * 6; ph.wantZ = (dz / (d || 1)) * 6;
    ph.leanExtraX = Math.sin(this.t * 0.7) * 0.08; ph.leanExtraZ = Math.cos(this.t * 0.5) * 0.08;
    g.stepIsland(dt, 1);
  }
  frame(dt) {
    const g = this.game, ph = g.phys, p = ph.pos;
    g.syncIsland(dt);
    this.frameCam(false);
    _iq.set(ph.q.x, ph.q.y, ph.q.z, ph.q.w).invert();
    this.doll.root.position.set(p.x, 0, p.z);
    this.doll.root.quaternion.copy(_iq);
    this.doll.face(Math.atan2(ph.wantX, ph.wantZ));
    this.doll.rig.loop('jog');
    this.doll.update(dt);
  }
  exit() {
    const g = this.game;
    g.phys.wantX = 0; g.phys.wantZ = 0; g.phys.leanExtraX = 0; g.phys.leanExtraZ = 0;
    g.art.group.remove(this.doll.root);
  }
}

/**
 * The looping kiosk demo: bot-played vignettes of about 18 s each, with the bots allowed to cheat.
 * Any input exits it and is swallowed. Back to the title for 5 s between passes.
 */
export class Attract {
  constructor(game) { this.game = game; this.name = 'attract'; this.index = -1; this.t = 0; this.sub = null; this.visited = []; this.canPause = false; this.leaving = false; this.titlePause = 0; }
  enter() {
    const g = this.game;
    g.attract = true;
    this.overlay = g.ui.only({
      name: 'attract', passive: true,
      build: (s) => {
        this.demoEl = h('div.demo.tag');
        s.el.append(h('div.demo-title', TITLE), this.demoEl);
        this.renderDemo();
      },
    });
    g.hud.reset();
    this.next();
  }
  renderDemo() {
    const g = this.game;
    this.demoEl.innerHTML = `DEMO · Press any button ${glyphHTML('use', g.input.lastDevice, g.save.settings.glyphs)}`;
  }
  next() {
    const g = this.game;
    this.index++;
    if (this.index >= VIGNETTES.length) {
      // Back to the title for five seconds between passes.
      this.index = -1;
      this.titlePause = 5;
      this.closeSub();
      g.setIsland('home');
      g.palette.set('dawn', 1);
      g.rig.shot(9, 9, 52, 0, 0.5, -2, { fov: 38, rate: 2 });
      this.t = 0;
      return;
    }
    const v = VIGNETTES[this.index];
    if (v.id !== 'walk' && !hasEvent(v.id)) { this.next(); return; }
    this.t = 0;
    this.closeSub();
    if (v.id === 'walk') { this.sub = new WalkVignette(g); this.sub.enter(); this.visited.push('walk'); return; }
    this.visited.push(v.id);
    const run = new EventRun(g, {
      id: v.id, tier: 0, lanes: bots(v.lanes || 1), mode: 'attract', skipIntro: true, skipCountdown: true, god: v.god !== false,
      afterBegin: v.after, onResult: function* none() { /* nothing to report in a demo */ },
    });
    this.sub = run;
    run.enter();
    g.hud.show(true);
    this.restoreOverlay();
  }
  /** A vignette clears the screens as it sets up: the DEMO tag goes back on top. */
  restoreOverlay() {
    const ui = this.game.ui;
    if (!ui.stack.includes(this.overlay)) { ui.stack.push(this.overlay); ui.layer.append(this.overlay.el); }
  }
  closeSub() {
    if (this.sub) { const s = this.sub; this.sub = null; s.exit(); this.restoreOverlay(); }
  }
  fixed(dt) {
    const g = this.game, inp = g.input;
    if (inp.activityThisTick && !this.leaving && (this.grace === undefined || this.grace <= 0)) { this.exitToTitle(); return; }
    if (this.grace > 0) this.grace -= dt;
    this.t += dt;
    if (this.titlePause > 0) {
      this.titlePause -= dt;
      g.stepIsland(dt, 0);
      if (this.titlePause <= 0) this.next();
      return;
    }
    if (this.sub) this.sub.fixed(dt);
    if (this.t >= 18 && !g.wiping) { this.t = 0; g.scripts.run(g.wipe(() => this.next())); }
  }
  frame(dt) {
    const g = this.game;
    if (this.demoDev !== g.input.lastDevice) { this.demoDev = g.input.lastDevice; this.renderDemo(); }
    if (this.titlePause > 0) g.syncIsland(dt);
    if (this.sub) this.sub.frame(dt);
  }
  exitToTitle() {
    const g = this.game;
    this.leaving = true;
    g.input.swallow();
    g.flow.toTitle();
  }
  exit() {
    const g = this.game;
    this.closeSub();
    g.attract = false;
    g.hud.reset(); g.hud.show(false);
    g.ui.clear();
    g.speech.clear();
    g.input.idle = 0;
  }
}
export { rot2, SEAT_COLOURS, TIER_NAMES };
