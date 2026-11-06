import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, add } from '../art/materials.js';
import { Gull } from '../art/cast.js';
import { Doll } from '../art/doll.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';
import { rot2 } from '../render/cameraRig.js';
import { MAP } from '../art/island.js';

const STAGES = ['pose', 'stones', 'storm', 'step', 'last'];
const SHEET_X = 1.5, SHEET_Z = 4.1; // Out from the gallery, clear of the tower.
const _v = new THREE.Vector3();

/** Your balance is tied to the island. Four 20-second remixes, and then the last hold. */
export class GrandHold extends EventBase {
  static id = 'grandHold';
  constructor(spec) {
    super(spec);
    this.iterations = 10;
    this.breathOn = true; this.seaLevel = -6.4;
    this.stageI = 0; this.stageT = 0; this.done = false; this.score = 0; this.inRing = 0; this.lastT = 0; this.lastIn = 0; this.restarts = 0;
    this.ring = { x: 0, z: 0, r: 0.3 };
    this.stones = []; this.plate = null; this.gust = null; this.gustNext = 3; this.cueT = 0; this.cue = null; this.cueScore = 0; this.cues = 0;
    this.camA = 0; this.removeStage = 0; this.restStart = 0;
  }
  get stage() { return STAGES[this.stageI]; }
  addGround() { /* The gallery floor is a rule. Only the bedsheet is ever used. */ }
  build() {
    this.game.setIsland('home');
    super.build();
    this.game.setIsland('home');
    this.game.sea.setLevel(-6.4);
    this.restStart = this.game.programme.restDeg();
    this.game.phys.setRest(this.restStart);
    this.game.phys.snapTilt();
    // The class below, looking up.
    const art = this.game.art;
    for (const g of art.guests) { g.doll.rig.loop('lookUp'); g.wait = 999; }
    art.heron.root.position.set(4, 0, -5);
    art.walrus.root.position.set(0.5, 0, -4.8);
    art.walrus.rig.loop('bounce');
    art.trudy.root.position.set(1.5, 0, -6);
    this.gary = new Gull();
    this.gary.rig.loop('fly');
    this.gary.root.visible = false;
    this.group.add(this.gary.root);
    this.syncGallery();
  }
  buildSet() {
    const g = this.group;
    // The bedsheet is held by the class. It appears when you need it.
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.1, 3).setTranslation(SHEET_X, -7.1, SHEET_Z).setRestitution(0.75).setFriction(0.8).setCollisionGroups(groups.ground()));
    // The class holds a stretched bedsheet, out of sight until somebody needs it.
    this.sheet = G('sheet', SHEET_X, -7, SHEET_Z);
    this.sheet.add(M(geo.cyl(3, 3, 0.04, 28), 0xFFF8EA));
    const crew = [['#C9A0DC', 'perm'], ['#6FB7D6', 'visor'], ['#E78FB3', 'bucket'], ['#E78FB3', 'bucket'], ['#F5C84A', 'beret'], ['#7FA650', 'none']];
    crew.forEach(([shirt, hat], i) => {
      const a = (i / crew.length) * Math.PI * 2;
      const d = new Doll({ shirt, hat });
      d.flatFeet = false;
      d.root.position.set(Math.cos(a) * 3.45, -1.25, Math.sin(a) * 3.45);
      d.face(Math.atan2(-Math.cos(a), -Math.sin(a)));
      d.rig.loop('carryTray', { fade: 0 });
      this.sheet.add(d.root);
      this.sheetCrew = this.sheetCrew || [];
      this.sheetCrew.push(d);
    });
    this.sheet.visible = false;
    g.add(this.sheet);
  }
  syncGallery() {
    const g = this.game, art = g.art;
    art.group.updateWorldMatrix(true, false);
    _v.set(MAP.lighthouse.x + 0.34, art.lighthouseTop, MAP.lighthouse.z + 0.94).applyMatrix4(art.group.matrixWorld);
    this.group.position.copy(_v);
    this.gallery = _v.clone();
  }
  setupLane(lane) {
    lane.doll.rig.loop('pose3');
  }
  cameraShot(snap) {
    const c = this.gallery || new THREE.Vector3(2, 9, -9);
    if (this.lanes[0] && this.lanes[0].fallen && this.sheet && this.sheet.visible) {
      // Follow the fall all the way down to the bedsheet.
      this.game.rig.shot(c.x + 7, c.y - 1.8, c.z + 13, c.x + SHEET_X * 0.7, c.y - 5.4, c.z + SHEET_Z * 0.7, { rate: 5, fov: 42 });
      return;
    }
    const R = 7.5;
    const a = 0.35 + Math.sin(this.camA) * 0.75;
    const px = c.x + Math.sin(a) * R, pz = c.z + Math.cos(a) * R, py = c.y + 2.4;
    this.game.rig.shot(px, py, pz, c.x, c.y + 0.9, c.z, { snap, rate: 3, fov: 42 });
    this.inputYaw = a;
  }
  hudSetup(hud) {
    this.phaseTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, ''));
    hud.setScore('', '');
  }
  start() {
    this.game.palette.set('golden', 2);
    this.startStage(0);
    this.game.speech.say('trudy', line('trudy', 'finale_start'), { auto: 3.4, top: true });
  }
  startStage(i) {
    this.stageI = i; this.stageT = 0;
    const lane = this.lanes[0];
    const names = { pose: 'A pose, with breath', stones: 'Stones on your head', storm: 'Storm, with Gary', step: 'Step, in the wind', last: 'The last hold' };
    if (this.phaseTag) this.phaseTag.textContent = names[this.stage];
    this.game.audio.sfx('bell');
    if (this.stage === 'pose') { this.ring = { x: 0.3, z: 0.1, r: 0.3 }; lane.doll.rig.loop('pose3', { fade: 0.5 }); this.game.speech.say('trudy', line('trudy', 'finale_pose'), { auto: 3, top: true }); }
    if (this.stage === 'stones') { this.addPlate(lane); this.stoneNext = 2; this.stoneN = 0; this.ring = { x: 0, z: 0, r: 0.3 }; lane.doll.rig.loop('holdSlab', { fade: 0.5 }); this.game.speech.say('trudy', line('trudy', 'finale_stones'), { auto: 3, top: true }); }
    if (this.stage === 'storm') {
      this.gustNext = 3; this.ring = { x: 0, z: 0, r: 0.4 }; lane.doll.rig.loop('spread', { fade: 0.5 });
      this.gary.root.visible = true; this.gary.rig.loop('stand');
      lane.doll.joints.head.add(this.gary.root);
      this.gary.root.position.set(0, 0.2, 0); this.gary.root.rotation.set(0, 0, 0);
      this.game.speech.say('trudy', line('trudy', 'finale_gust'), { auto: 3.4, top: true });
    }
    if (this.stage === 'step') { this.cueT = 1; this.cueIdx = 0; this.ring = null; lane.doll.rig.loop('breathe', { fade: 0.5 }); this.game.speech.say('trudy', line('trudy', 'finale_step'), { auto: 3, top: true }); for (const g of this.game.art.guests) g.doll.rig.loop('cheer'); }
    if (this.stage === 'last') {
      this.ring = { x: 0, z: 0, r: 0.3 };
      lane.doll.rig.loop('pose1', { fade: 1 });
      if (this.gary.root.parent !== this.group) { this.gary.root.removeFromParent(); this.group.add(this.gary.root); this.gary.root.visible = false; }
      this.game.speech.say('trudy', line('trudy', 'finale_last'), { auto: 4, top: true });
      this.game.audio.stopMusic(3);
    }
  }
  addPlate(lane) {
    const b = lane.bal.body;
    this.plateCol = this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.03, 0.4).setTranslation(0, 0.8, 0).setMass(0.04).setFriction(1).setCollisionGroups(groups.doll(lane.id)), b);
    this.plateMesh = M(geo.box(0.8, 0.06, 0.8), 0xD6CDB6, 0, 1.55, 0);
    lane.doll.root.add(this.plateMesh);
  }
  addStone(lane) {
    const b = lane.bal.body, t = b.translation(), q = b.rotation();
    const i = this.stones.length;
    const hh = 0.08, r = 0.22 - i * 0.02;
    const base = 0.83 + i * 0.17 + hh + 0.012;
    _v.set(0, base, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(t.x + _v.x, t.y + _v.y, t.z + _v.z).setRotation(q).setCanSleep(false).setLinearDamping(0.1).setAngularDamping(0.6));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(r * 0.8, hh, r * 0.8).setMass(0.02).setFriction(0.95).setRestitution(0).setCollisionGroups(groups.prop(lane.id)), body);
    const mesh = M(geo.sphere(1, 12, 8), [0xCFC8B6, 0xBDB5A2, 0xD8D2C2, 0xA9A18F][i], 0, 0, 0, { scale: [r, hh, r] });
    this.group.add(mesh);
    this.stones.push({ body, mesh });
    this.game.audio.sfx('thud', { pitch: 150 });
  }
  /** Safe: remove the stones, step once, then remove the plate. */
  clearStones() {
    for (const s of this.stones) { this.world.removeRigidBody(s.body); this.group.remove(s.mesh); }
    this.stones = [];
    this.removeStage = 1;
  }
  afterStep() {
    if (this.removeStage === 1) { this.removeStage = 2; return; }
    if (this.removeStage === 2) {
      if (this.plateCol) { this.world.removeCollider(this.plateCol, true); this.plateCol = null; }
      if (this.plateMesh) { this.plateMesh.removeFromParent(); this.plateMesh = null; }
      this.removeStage = 0;
    }
  }
  fixedEvent(dt) {
    const lane = this.lanes[0], b = lane.bal;
    this.stageT += dt;
    this.camA += dt * 0.12;
    this.game.stepIsland(dt, 0);
    // Your lean tips everything below you.
    const [wx, wz] = rot2(lane.dotX, lane.dotZ, this.inputYaw);
    this.game.phys.leanExtraX = wx * 0.07; this.game.phys.leanExtraZ = wz * 0.07;
    this.syncGallery();
    const inside = this.ring && Math.hypot(lane.dotX - this.ring.x, lane.dotZ - this.ring.z) < this.ring.r;
    this.nowIn = !!inside;
    if (inside) this.inRing += dt;
    b.tremor = 0.05;
    switch (this.stage) {
      case 'pose':
        b.sway = 0.1;
        if (this.stageT >= 20) this.startStage(1);
        break;
      case 'stones':
        b.sway = 0.12;
        this.stoneNext -= dt;
        if (this.stoneNext <= 0 && this.stoneN < 4) { this.addStone(lane); this.stoneN++; this.stoneNext = 3.4; }
        if (this.stageT >= 20) { this.clearStones(); this.startStage(2); }
        break;
      case 'storm':
        b.sway = 0.1;
        this.gustNext -= dt;
        if (this.gustNext <= 0 && !this.gust) {
          const a = this.r() * 6.283;
          this.gust = { warn: 1.2, dur: 0.5, x: Math.cos(a) * 3, z: Math.sin(a) * 3 };
          this.gustNext = 5.2;
          this.game.audio.sfx('gust', { dur: 1.2 });
          this.game.hud.setNote('Brace!', 1.1);
          this.game.input.rumble(0.1, 0.3, 300);
        }
        if (this.gust) {
          if (this.gust.warn > 0) this.gust.warn -= dt;
          else { this.gust.dur -= dt; b.extX += this.gust.x * this.diff.dist; b.extZ += this.gust.z * this.diff.dist; if (this.gust.dur <= 0) this.gust = null; }
        }
        if (this.stageT >= 20) { this.gust = null; this.startStage(3); }
        break;
      case 'step': {
        b.sway = 0.12;
        this.cueT -= dt;
        if (this.cueT <= 0) {
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          this.cue = dirs[this.cueIdx++ % 4];
          this.cueT = 2.4; this.cues++;
          this.ring = { x: this.cue[0] * 0.6, z: this.cue[1] * 0.6, r: 0.35 };
          this.game.audio.sfx('foot', { note: 84 });
        }
        if (this.stageT >= 20) { this.startStage(4); }
        break;
      }
      case 'last': {
        const k = Math.min(1, this.stageT / 15);
        this.ring.r = this.ramp(0.3, 0.08, k);
        // Sway fades as you succeed; the final notch comes up.
        b.sway = this.ramp(0.2, 0.02, k);
        this.lastT += dt;
        if (inside) this.lastIn += dt;
        const rest = this.restStart * (1 - k);
        this.game.phys.setRest(rest);
        this.game.phys.restNow = rest;
        if (this.stageT >= 15) { this.done = true; this.game.phys.setRest(0); this.game.phys.restNow = 0; }
        break;
      }
      default: break;
    }
    if (this.gust && this.gust.warn > 0) lane.discView.brace = { x: -this.gust.x / 3, z: -this.gust.z / 3 };
    else lane.discView.brace = null;
  }
  onFall(lane) {
    // It cannot be failed. The class catches you with a stretched bedsheet, and the phase restarts.
    this.restarts++;
    this.game.speech.say('trudy', line('trudy', 'finale_catch'), { auto: 3, top: true });
    this.sheet.visible = true;
    this.restartAt = this.stageI;
    // Out over the railing and down onto the sheet.
    if (lane.ragdoll) for (const k of Object.keys(lane.ragdoll.bodies)) lane.ragdoll.bodies[k].setLinvel({ x: SHEET_X * 0.75, y: 2.2, z: SHEET_Z * 0.75 }, true);
    for (const s of this.stones) { this.world.removeRigidBody(s.body); this.group.remove(s.mesh); }
    this.stones = [];
    void lane;
  }
  onRecover() {
    this.sheet.visible = false;
    this.stageT = 0;
    if (this.stage === 'stones') { this.stoneNext = 1.5; this.stoneN = 0; }
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    let gx = 0, gz = 0;
    if (this.ring) { gx = this.ring.x; gz = this.ring.z; }
    if (this.gust && this.gust.warn > 0 && this.gust.warn < 1) { const f = 0.2; gx += (-this.gust.x / 3) * f * 3; gz += (-this.gust.z / 3) * f * 3; }
    const [x, z] = bot.steer(gx, gz, true);
    out.wishX = x; out.wishZ = z;
    out.breathe = bot.breathe(lane);
    out.flail = !lane.fallen && lane.bal.lean > 0.56 && lane.bal.flailCool <= 0;
  }
  hud() {
    const lane = this.lanes[0], hud = this.game.hud;
    const totals = { pose: 20, stones: 20, storm: 20, step: 20, last: 15 };
    hud.setTime(Math.max(0, totals[this.stage] - this.stageT));
    lane.discView.zone = this.ring ? { x: this.ring.x, z: this.ring.z, r: this.ring.r, on: this.nowIn } : null;
  }
  frameEvent(dt) {
    const g = this.game;
    g.syncIsland(dt);
    this.cameraShot(false);
    for (const s of this.stones) { const p = s.body.translation(), q = s.body.rotation(); s.mesh.position.set(p.x, p.y, p.z); s.mesh.quaternion.set(q.x, q.y, q.z, q.w); }
    this.gary.update(dt);
    if (this.sheet.visible && this.sheetCrew) for (const d of this.sheetCrew) d.update(dt);
  }
  isDone() { return this.done; }
  laneResult() {
    const share = this.lastIn / Math.max(1, this.lastT);
    const form = 60 + 40 * share;
    return { form, raw: form, big: Math.round(form), stats: `${Math.round(share * 100)}% in the last ring · ${this.restarts} caught by the bedsheet` };
  }
  dispose() {
    const g = this.game;
    g.phys.leanExtraX = 0; g.phys.leanExtraZ = 0;
    for (const gu of g.art.guests) { gu.wait = 1; gu.doll.rig.loop('idle'); }
    g.art.heron.root.position.set(-13.4, 0.43, -5);
    g.art.walrus.root.position.set(-5, 0, 11);
    g.art.walrus.rig.loop('stand');
    g.programme.syncIsland();
    super.dispose();
  }
}
