// Tare Island. Walk between stations, do what you like, end the day in the hammock.
import { ContactShadow, Decals, HERO_MODEL, HERO_RIG, PALETTE, PlatformerCharacter, readMoveInput, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { App } from '../app.js';
import { CONFIRM, SIT, WAVE } from '../core/actions.js';
import { dayData, goalMet, goalOf, hardOpen, isOpen } from '../core/week.js';
import { clipsFor, dress, makeAvatar } from '../art/avatar.js';
import { Kevin, Ounce, place } from '../art/props.js';
import { floorPlane } from '../art/textures.js';
import { ACTIVITIES } from '../data/activities.js';
import { LOOKS } from '../data/classmates.js';
import { CLASSMATE_BARKS, HAMMOCK_LINES, IDLE_BARKS, ISLAND_BARKS, STATION_REMARKS, WEEK2_LINES } from '../data/lines.js';
import { STATIONS, STATION_IDS } from '../data/stations.js';
import { MILESTONES } from '../data/unlocks.js';
import { DialogueScreen } from '../ui/dialogue.js';
import { say, sayRight, textWidth, wrap, charsIn } from '../ui/font.js';
import { Menu } from '../ui/menu.js';
import { ABOVE_PROMPTS } from '../ui/layout.js';
import { promptBar } from '../ui/prompts.js';
import { MenuScreen } from '../ui/screens/common.js';
import { SAFE } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { box, grass, gulls, sea, setSky } from './sets.js';
import { withWardrobe } from './activity/lanes.js';

const WALL_TAG = 'invisibleWall';
const POINTER_IGNORES = [WALL_TAG, 'character'];
const POINTER_REACH = 200;

const { Vector3 } = THREE;

export const ISLAND = { halfX: 22, halfZ: 17 };

export function buildIsland(ctx, { walls = true, dusk = false } = {}) {
  setSky(ctx, dusk ? 19 : 10.5);
  const { physics } = ctx;
  // Ground: sand around the edge, lawn inside, white tile at the heart. A cut for the inlet.
  physics.addStaticBox({ position: [-2.5, -0.46, 0], halfExtents: [19.5, 0.5, 17] });
  physics.addStaticBox({ position: [19.5, -0.46, -9.5], halfExtents: [2.5, 0.5, 7.5] });
  physics.addStaticBox({ position: [19.5, -0.46, 11], halfExtents: [2.5, 0.5, 6] });
  box(ctx, 39, 0.8, 34, [-2.5, -0.42, 0], 'sand', { cast: false });
  box(ctx, 5, 0.8, 15, [19.5, -0.42, -9.5], 'sand', { cast: false });
  box(ctx, 5, 0.8, 12, [19.5, -0.42, 11], 'sand', { cast: false });
  box(ctx, 34, 0.1, 19, [-1, -0.0, 5.5], 'lime', { cast: false });
  box(ctx, 12, 0.1, 9, [0, -0.0, -8.5], 'lime', { cast: false });
  ctx.scene.add(floorPlane('clinic-tile', 18, 14, { at: [0, 0.06, 0] }));
  box(ctx, 18.6, 0.06, 14.6, [0, 0.02, 0], 'mist', { cast: false });
  // Paths, in tile, out to the stations.
  for (const [w, d, x, z] of [[8, 2.4, -11, 3], [8, 2.4, 11, 3], [2.4, 6, 0, 10], [2.4, 7, 7, -8.6], [2.4, 7, -7, -8.6]]) {
    ctx.scene.add(floorPlane('clinic-tile', w, d, { at: [x, 0.055, z] }));
  }
  const water = sea(ctx, { at: [0, -0.34, 0], size: [240, 200] });
  grass(ctx, [34, 19], [-1, 0.03, 5.5], (x, z) => {
    if (Math.abs(x) < 9.6 && Math.abs(z) < 7.6) return false;
    if (Math.abs(z - 3) < 1.4 && Math.abs(x) < 15.2) return false;
    if (Math.abs(x) < 1.4 && z > 6 && z < 13) return false;
    return true;
  }, 3000);
  if (walls) {
    for (const [pos, half] of [
      [[0, 2, -ISLAND.halfZ - 0.2], [ISLAND.halfX + 1, 3, 0.4]], [[0, 2, ISLAND.halfZ + 0.2], [ISLAND.halfX + 1, 3, 0.4]],
      [[-ISLAND.halfX + 0.2, 2, 0], [0.4, 3, ISLAND.halfZ + 1]], [[ISLAND.halfX + 0.2, 2, 0], [0.4, 3, ISLAND.halfZ + 1]],
      [[17.2, 2, 1.5], [0.3, 3, 3.5]], [[19.5, 2, -2.2], [2.5, 3, 0.3]], [[19.5, 2, 5.2], [2.5, 3, 0.3]],
    ]) physics.tag(physics.addStaticBox({ position: pos, halfExtents: half }), WALL_TAG);
  }
  // Stations.
  place(ctx, 'dais', { at: [0, -0.42, 3], scale: 1.4 });
  const solid = (at, r) => physics.addStaticCylinder([at[0], 1.5, at[1]], 1.5, r);
  place(ctx, 'pavilion', { at: [-11, 0, 3], palette: { roof: 'sky' } });
  for (const a of [[-13.7, 1.4], [-13.7, 4.6], [-8.3, 1.4], [-8.3, 4.6]]) solid(a, 0.35);
  place(ctx, 'rep-shed', { at: [11, 0, 1.6], collide: true });
  place(ctx, 'giant-dumbbell', { at: [7.2, 0, 0.4], yaw: 30 });
  place(ctx, 'beat-stage', { at: [12, 0, -10] });
  physics.addStaticBox({ position: [12, 0.25, -10], halfExtents: [4, 0.25, 2.2] });
  place(ctx, 'pier', { at: [-7.2, -1.1, -16], params: { len: 16 } });
  physics.addStaticBox({ position: [-7.2, 0.25, -14], halfExtents: [1.6, 0.25, 1] });
  place(ctx, 'catapult', { at: [-9.9, 0, -8.2], yaw: 30 });
  place(ctx, 'slack-anchor', { at: [-11.6, 0, -6.9], scale: 0.7 });
  place(ctx, 'slack-anchor', { at: [-4.8, 0, -15], scale: 0.7 });
  for (const x of [-1.8, 1.8]) { box(ctx, 0.4, 3.1, 0.4, [x, 1.55, 11], 'white'); physics.addStaticBox({ position: [x, 1.5, 11], halfExtents: [0.22, 1.5, 0.22] }); }
  box(ctx, 4.1, 0.6, 0.3, [0, 3.2, 11], 'cyan');
  box(ctx, 2.8, 0.14, 0.34, [0, 3.2, 11.02], 'white');
  place(ctx, 'sweat-jar', { at: [4, 0.06, -4] });
  solid([4, -4], 1.1);
  const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 1, 12), toonMaterial(PALETTE.sky));
  fluid.position.set(4, 0.06 + 0.4, -4);
  fluid.scale.y = 0.02;
  ctx.scene.add(fluid);
  place(ctx, 'lockers', { at: [-4, 0.06, -4.9], collide: true });
  place(ctx, 'numbers-board', { at: [0, 0.06, -9.6], collide: true });
  place(ctx, 'hammock', { at: [14.3, 0, 10] });
  place(ctx, 'palm', { at: [12.2, 0, 10.2], yaw: 180 });
  place(ctx, 'palm', { at: [16.4, 0, 10.4], yaw: 10 });
  // Scenery, tall things in the -x, -z quadrant.
  place(ctx, 'kettlebell-volcano', { at: [-15, -0.2, -14], collide: true });
  place(ctx, 'foam-roller-hill', { at: [15, 0, -14], yaw: 8, collide: true });
  place(ctx, 'dumbbell-bridge', { at: [19.6, -0.1, 1.5], yaw: 90 });
  for (const [x, z, s] of [[-17, -2, 0.9], [-16, -5, 0.6], [20.2, -8.6, 0.7], [-3, -14.6, 0.8], [8, 14.6, 0.7], [-14, 14, 1]]) place(ctx, 'medicine-ball', { at: [x, 0, z], scale: s, collide: true });
  for (const [x, z, yaw, s] of [[-20, 9, 40, 1.1], [-17.5, 12.5, 200, 1], [20, 14, 100, 1.1], [-3, -15.5, 160, 1.1], [-12.5, -15.8, 300, 1]]) place(ctx, 'palm', { at: [x, 0, z], yaw, scale: s });
  for (const [x, z] of [[-7.6, 7.2], [7.6, 7.2], [-7.6, -7.2], [7.6, -7.2]]) place(ctx, 'lamp-post', { at: [x, 0.06, z] });
  place(ctx, 'fountain', { at: [-5.8, 0.06, 2.6], collide: true });
  place(ctx, 'bench', { at: [5.4, 0.06, 5.8], yaw: 180 });
  place(ctx, 'bench', { at: [-5.4, 0.06, 5.8], yaw: 180 });
  for (const [x, z] of [[-3, 8.2], [3, 8.2], [-16.5, 6.5], [15.6, 6.8], [7.6, 9.8], [-7.6, 9.8], [-6, -11.2], [6, -12.6]]) place(ctx, 'bush', { at: [x, 0, z], seed: Math.abs(Math.round(x * 3)) + 1 });
  for (const [x, z] of [[-1.8, 8.4], [1.8, 8.4], [-11.5, 7.5], [11.5, 6.4], [-5.2, 12.5], [5.2, 12.8]]) place(ctx, 'flowers', { at: [x, 0, z], seed: Math.abs(Math.round(z * 3)) + 1 });
  return { water, fluid };
}

/** A person walking small loops around the island. */
class Local {
  constructor(avatar, stops, rand) { this.av = avatar; this.stops = stops; this.rand = rand; this.i = 0; this.wait = rand() * 3; this.at = new Vector3(...stops[0].at); this.walking = false; avatar.root.position.copy(this.at); this.speed = 1.6; this.frozen = false; }
  update(dt) {
    if (this.frozen) { this.av.update(dt); return; }
    const stop = this.stops[this.i];
    if (this.walking) {
      const dx = stop.at[0] - this.at.x, dz = stop.at[2] - this.at.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) { this.walking = false; this.wait = stop.wait ?? 4 + this.rand() * 3; this.av.play(stop.clip ?? 'Idle', { fade: 0.25 }); this.av.root.rotation.y = stop.yaw ?? this.av.root.rotation.y; } else {
        this.at.x += (dx / d) * this.speed * dt; this.at.z += (dz / d) * this.speed * dt;
        this.av.root.rotation.y = Math.atan2(dx, dz);
      }
    } else {
      this.wait -= dt;
      if (this.wait <= 0) { this.i = (this.i + 1) % this.stops.length; this.walking = true; this.av.play('Walk', { fade: 0.2 }); }
    }
    this.av.root.position.set(this.at.x, stop.at[1] ?? 0, this.at.z);
    this.av.groundY = 0;
    this.av.update(dt);
  }
}

const LOCAL_ROUTES = {
  marguerite: [{ at: [-5, 0.06, 4.6], clip: 'Stretch', yaw: 1.2 }, { at: [-8, 0.06, -0.4], clip: 'Tree', yaw: 0.6 }, { at: [-6, 0.06, 6.4], clip: 'Sit', yaw: 3.1, wait: 7 }],
  dennis: [{ at: [8, 0, 8.6], clip: 'Teeter', yaw: 0.5 }, { at: [6.2, 0, 11], clip: 'Flail', yaw: 2.1, wait: 3 }, { at: [12, 0, 7.2], clip: 'Slump', yaw: 0.3 }, { at: [8.6, 0, -1.4], clip: 'Stretch', yaw: 0.4 }],
  june: [{ at: [6.4, 0.06, 6.4], clip: 'Sit', yaw: 3.1, wait: 8 }, { at: [3, 0.06, -6], clip: 'Heron', yaw: 0.6, wait: 6 }, { at: [8.5, 0, -7.4], clip: 'Watch', yaw: 1.2 }],
};

export class StationScreen extends MenuScreen {
  constructor(id, scene) {
    const st = STATIONS[id];
    const menu = new Menu([], { width: 420, y: 44, onBack: () => App.stack.pop(this) });
    super('station', st.name, menu, { remark: STATION_REMARKS[id] });
    this.id = id; this.scene = scene; this.hard = false;
    this.refresh();
  }
  refresh() {
    const slot = App.slot;
    const st = STATIONS[this.id];
    const items = st.activities.map((a) => {
      const def = ACTIVITIES[a];
      const open = isOpen(slot, a, App.dev.allUnlocked);
      const rec = slot.records[a];
      return {
        label: open ? def.name : `${def.name}`, id: a, disabled: !open, focusable: true,
        stars: open ? (rec?.stars ?? 0) : undefined,
        right: () => (open ? (rec ? `${Math.round(rec.best)}` : '-') : `Day ${def.day}`),
        action: () => this.scene.enterActivity(a, this.hard),
      };
    });
    if (hardOpen(slot, App.dev.allUnlocked)) items.push({ label: 'Difficulty', id: 'hard', value: () => (this.hard ? 'Hard' : 'Standard'), adjust: () => { this.hard = !this.hard; }, action: () => { this.hard = !this.hard; } });
    this.menu.setItems(items);
  }
}

export class HammockScreen extends MenuScreen {
  constructor(scene) {
    const menu = new Menu([
      { label: 'Stay up', id: 'no', action: () => App.stack.pop(this) },
      { label: 'End the day', id: 'yes', action: () => { App.stack.pop(this); scene.endDay(); } },
    ], { width: 220, y: 84, align: 'center', onBack: () => App.stack.pop(this) });
    super('hammock', 'The Hammock', menu, { remark: HAMMOCK_LINES.ask });
  }
}

export class HubScene extends BaseScene {
  name = 'hub';
  id = 'hub';
  canPause = true;
  pauseToIsland = false;
  nearest = null;
  barkT = 9;
  walkTarget = null;
  autoEnter = null;
  feet = new Vector3();
  camT = new Vector3();
  rayO = new Vector3();
  rayD = new Vector3();

  cameraConfig() { return { preset: 'iso', zoom: 1.15, minZoom: 1.15, maxZoom: 1.15 }; }

  get attractMode() { return !!this.args.attract; }

  async build(ctx) {
    this.cosmetic = ctx.random.fork('cosmetic');
    const world = buildIsland(ctx);
    this.water = world.water;
    this.fluid = world.fluid;
    this.gulls = gulls(ctx, 9);
    const rand = () => this.cosmetic.next();
    // The hero.
    const slot = App.slot;
    const look = withWardrobe(slot?.look ?? { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' }, slot);
    const model = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene;
    dress(model, look);
    setLookLayer(model, 'actors');
    ctx.scene.add(model);
    this.model = model;
    this.shadow = new ContactShadow(0.42);
    ctx.scene.add(this.shadow);
    const start = this.args.from && STATIONS[this.args.from] ? this.spawnFor(this.args.from) : [0, 0.08, 5.2];
    this.hero = new PlatformerCharacter(ctx.physics, { position: start, lockDepth: false });
    this.hero.attachModel(model, clipsFor(model), HERO_RIG);
    this.input = null;
    // Ounce, who hops after you.
    this.ounce = new Ounce(ctx, { at: [start[0] + 1.6, 0.06, start[2] + 0.6], scale: 1.4 });
    this.ounceRest = 0;
    this.kevin = new Kevin(ctx, { at: [-4, 2.5, -4.9], yaw: 0.6 });
    this.locals = {};
    for (const who of ['marguerite', 'dennis', 'june']) {
      const av = await makeAvatar(ctx, LOOKS[who], { at: LOCAL_ROUTES[who][0].at, clip: LOCAL_ROUTES[who][0].clip ?? 'Idle' });
      this.locals[who] = new Local(av, LOCAL_ROUTES[who], rand);
    }
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at: [-1.8, 0.06, 2.2], yaw: 0.6, clip: 'CoachStand' });
    this.coach.addPlumb();
    this.decals = new Decals(ctx.scene, { capacity: 200 });
    this.footT = 0;
    this.side = 1;
    this.updateJar();
    App.music('title');
    if (!this.attractMode) this.onArrive();
    else { this.route = ['pavilion', 'jar', 'beach', 'hall', 'gate', 'hammock', 'lagoon', 'terrace']; this.routeI = 0; this.autoRoute(); }
  }

  spawnFor(id) {
    const st = STATIONS[id];
    const dx = -st.at[0], dz = -st.at[1];
    const d = Math.hypot(dx, dz) || 1;
    return [st.at[0] + (dx / d) * (st.radius - 0.8), 0.08, st.at[1] + (dz / d) * (st.radius - 0.8)];
  }

  updateJar() {
    const drips = App.slot?.drips ?? 40;
    const f = Math.min(1, drips / MILESTONES[MILESTONES.length - 1].drips);
    this.fluid.scale.y = Math.max(0.02, f * 2.1);
    this.fluid.position.y = 0.46 + this.fluid.scale.y / 2;
  }

  /** Coming back to the island. Today's story beat plays once. */
  onArrive() {
    const slot = App.slot;
    if (!slot) return;
    if (slot.week === 1 && slot.heardBeat < slot.day) {
      const lines = dayData(slot).beat;
      slot.heardBeat = slot.day;
      App.store.write();
      if (lines.length) this.playBeat(lines);
    } else if (slot.week === 2 && slot.day === 1 && !slot.week2Said) {
      slot.week2Said = true;
      App.store.write();
      App.stack.push(new DialogueScreen(WEEK2_LINES));
    }
    if (slot.week === 1 && slot.day === 7 && !goalMet(slot)) App.say('coach', 'Stand on the terrace, when you are ready.');
  }

  /** Stage whoever is speaking near the hero. */
  playBeat(lines) {
    const staged = lines.map((l) => (typeof l === 'string' ? { who: l.split(':')[0], text: l.slice(l.indexOf(':') + 2) } : { ...l }));
    for (const l of staged) {
      if (typeof l.run === 'string') { const name = l.run; l.run = () => this.beatAction(name); }
      else if (l.who && this.locals[l.who]) {
        const who = l.who;
        l.run = () => this.bring(who);
      } else if (l.who === 'coach') l.run = () => this.coachNear();
    }
    App.stack.push(new DialogueScreen(staged, { onDone: () => this.afterBeat() }));
  }

  bring(who) {
    const f = this.hero.feetInto(this.feet);
    const l = this.locals[who];
    l.frozen = true;
    l.at.set(f.x - 1.8, 0.06, f.z + 0.3);
    l.av.root.position.copy(l.at);
    l.av.root.rotation.y = 1.2;
    l.av.play('Idle', { fade: 0.1 });
  }

  coachNear() {
    const f = this.hero.feetInto(this.feet);
    this.coach.root.position.set(f.x - 1.4, 0.06, f.z - 0.4);
    this.coach.root.rotation.y = 1.0;
  }

  afterBeat() { for (const l of Object.values(this.locals)) l.frozen = false; }

  beatAction(name) {
    const o = this.ounce.root.position;
    switch (name) {
      case 'plumb': { this.coach.root.position.set(o.x - 1.1, 0.06, o.z + 0.2); this.coach.root.rotation.y = 1.2; this.coach.play('Point', { fade: 0.2 }); this.ounce.setMood('concern'); break; }
      case 'kevinSits': { this.kevin.flyTo(o.x, o.y + 1.5, o.z, 0.9); this.seven = false; break; }
      case 'dialSeven': { this.seven = true; this.ounce.read(0.7); break; }
      case 'kevinLeaves': { this.kevin.flyTo(-4, 2.5, -4.9, 1.2); this.seven = false; this.ounce.read(null); break; }
      case 'ounceHides': { this.ounce.hopTo(4, -5.8, 0.5); break; }
      case 'ounceBack': { const f = this.hero.feetInto(this.feet); this.ounce.hopTo(f.x + 1.4, f.z + 0.4, 0.5); break; }
      default: break;
    }
  }

  onFixed(ctx, dt) {
    if (App.stack.open || App.loading) {
      const inp = this.input ??= readMoveInput(ctx, this.hero, this.input);
      inp.move.set(0, 0, 0); inp.jump = false; inp.jumpHeld = false;
      inp.wave = false; inp.sit = false; inp.crouch = false; inp.crouchPressed = false; inp.prone = false; inp.lie = false; inp.attack = false; inp.grab = false;
      this.hero.fixedUpdate(dt, inp);
      return;
    }
    this.input = readMoveInput(ctx, this.hero, this.input);
    const inp = this.input;
    const { input } = ctx;
    if (inp.move.lengthSq() > 0.01) { this.walkTarget = null; this.autoEnter = null; }
    // Pad buttons are remapped at boot, so OR them in.
    if (this.nearest) { inp.jump = false; inp.jumpHeld = false; input.clearQueued('Space'); } else {
      if (input.consumePress('PadCross')) { inp.jump = true; this.justJumped = true; }
      if (input.isDown('PadCross')) inp.jumpHeld = true;
    }
    if (inp.jump && !this.nearest) this.justJumped = true;
    if (input.consumeAny(WAVE)) inp.wave = true;
    if (input.consumeAny(SIT)) inp.sit = true;
    if (inp.wave) this.justWaved = true;
    if (inp.sit) this.justSat = true;
    if (this.walkTarget) this.steer(inp);
    if (this.attractMode) this.attractSteer(inp);
    this.hero.fixedUpdate(dt, inp);
    this.hero.feetInto(this.feet);
    this.updateNearest();
    this.footsteps(dt);
    this.followOunce(dt);
  }

  steer(inp) {
    const f = this.hero.feetInto(this.feet);
    const dx = this.walkTarget.x - f.x, dz = this.walkTarget.z - f.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) {
      this.walkTarget = null;
      inp.move.set(0, 0, 0);
      if (this.autoEnter && this.nearest === this.autoEnter) { const id = this.autoEnter; this.autoEnter = null; this.activate(id); }
      return;
    }
    inp.move.set(dx / d, 0, dz / d);
    if (this.autoEnter && this.nearest === this.autoEnter) { const id = this.autoEnter; this.autoEnter = null; this.walkTarget = null; inp.move.set(0, 0, 0); this.activate(id); }
  }

  attractSteer(inp) {
    const f = this.hero.feetInto(this.feet);
    const st = STATIONS[this.route[this.routeI]];
    const dx = st.at[0] - f.x, dz = st.at[1] - f.z;
    const d = Math.hypot(dx, dz);
    if (d < st.radius) { this.routeI = (this.routeI + 1) % this.route.length; return; }
    inp.move.set(dx / d, 0, dz / d);
  }

  autoRoute() {}

  updateNearest() {
    if (this.attractMode) { this.nearest = null; return; }
    const f = this.feet;
    let best = null, bestD = Infinity;
    const slot = App.slot;
    for (const id of STATION_IDS) {
      const st = STATIONS[id];
      if (st.unlockDay && slot && !isUnlockedDay(slot, st.unlockDay)) continue;
      const d = Math.hypot(f.x - st.at[0], f.z - st.at[1]);
      if (d < st.radius && d < bestD) { best = id; bestD = d; }
    }
    this.nearest = best;
  }

  footsteps(dt) {
    const f = this.feet;
    this.footT += dt * this.hero.speed;
    if (this.footT > 1.1 && this.hero.grounded) {
      this.footT = 0;
      this.side = -this.side;
      const onSand = Math.abs(f.x) > 16 || Math.abs(f.z) > 14 || (f.z < -4 && Math.abs(f.x) > 6);
      if (onSand) this.decals.add('footprint', { x: f.x + this.side * 0.12, y: 0.01, z: f.z }, { x: 0, y: 1, z: 0 }, { size: 0.5 });
    }
  }

  followOunce(dt) {
    const o = this.ounce.root.position;
    this.ounceRest -= dt;
    const dx = this.feet.x - o.x, dz = this.feet.z - o.z;
    const d = Math.hypot(dx, dz);
    if (!this.ounce.hopping && this.ounceRest <= 0 && d > 2.3 && !this.ounceHiding) {
      const step = Math.min(1.5, d - 1.5);
      this.ounce.hopTo(o.x + (dx / d) * step, o.z + (dz / d) * step, 0.3);
      this.ounceRest = 0.12;
    }
    // Her dial is her face: she keeps it toward the camera, glancing at you.
    if (!this.ounce.hopping) {
      const toHero = Math.atan2(dx, dz);
      const glance = ((toHero - Math.PI / 4 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const want = Math.PI / 4 + Math.max(-0.6, Math.min(0.6, glance * 0.4));
      this.ounce.root.rotation.y += (want - this.ounce.root.rotation.y) * Math.min(1, dt * 6);
    }
  }

  onInput(ctx) {
    const { input } = ctx;
    const dev = App.device;
    this.hoverStation = null;
    // The mouse: hover names a station, a click walks there; ground just walks.
    if (dev.last === 'mouse') {
      const hit = this.groundAtPointer(ctx);
      if (hit) {
        this.hoverStation = this.stationAtPointer();
        if (input.wasPressed('MouseLeft')) {
          this.walkTarget = { x: hit.x, z: hit.z };
          this.autoEnter = this.hoverStation;
          if (this.hoverStation) { const st = STATIONS[this.hoverStation]; this.walkTarget = { x: st.at[0], z: st.at[1] }; }
          if (this.hoverStation && this.nearest === this.hoverStation) { this.autoEnter = null; this.walkTarget = null; this.activate(this.hoverStation); return; }
        }
      }
    }
    if (this.nearest && input.wasPressed(...CONFIRM)) this.activate(this.nearest);
  }

  groundAtPointer(ctx) {
    const p = ctx.input.pointer;
    ctx.camera.rayAt(p.x, p.y, this.rayO, this.rayD);
    if (this.rayD.y > -1e-4) return null;
    // The camera is outside the invisible walls, and you can't click on yourself.
    return ctx.physics.castRay(this.rayO, this.rayD, POINTER_REACH, POINTER_IGNORES)?.point ?? null;
  }

  pointOnRay(y) {
    return this.rayO.clone().addScaledVector(this.rayD, (y - this.rayO.y) / this.rayD.y);
  }

  /** What's under the pointer: a station's body as well as its footprint, since they're tall and you point at the roof. */
  stationAtPointer() {
    let best = null, bestD = Infinity;
    for (const y of [0.06, 1, 2, 3]) {
      const p = this.pointOnRay(y);
      for (const id of STATION_IDS) {
        const st = STATIONS[id];
        const d = Math.hypot(p.x - st.at[0], p.z - st.at[1]) / st.radius;
        if (d < 0.85 && d < bestD) { bestD = d; best = id; }
      }
    }
    return best;
  }

  activate(id) {
    const st = STATIONS[id];
    App.sfx('menuConfirm');
    switch (st.kind) {
      case 'menu': App.stack.push(new StationScreen(id, this)); break;
      case 'scene': App.go(st.scene, { from: id }); break;
      case 'hammock': this.hammock(); break;
      case 'terrace': this.terrace(); break;
      default: break;
    }
  }

  terrace() {
    const slot = App.slot;
    if (slot.week === 1 && slot.day === 7 && !goalMet(slot)) { App.go('activity', { id: 'stand', mode: 'week' }); return; }
    App.stack.push(new DialogueScreen([{ who: 'ounce', text: this.terraceLine(), mood: 'smug' }]));
  }

  terraceLine() {
    const slot = App.slot;
    const goal = goalOf(slot);
    return goalMet(slot) ? 'You have done what Coach asked. Everything after that is vanity.' : `Coach has asked for: ${goal.text} I would do it. She knows where you live. You live here.`;
  }

  hammock() {
    const slot = App.slot;
    if (slot.week === 1 && slot.day === 7 && !goalMet(slot)) {
      App.stack.push(new DialogueScreen([{ who: 'ounce', text: 'Not today. Today you stand. Then you may lie down for as long as you like.', mood: 'concern' }]));
      return;
    }
    if (!slot.todayDone.length) { App.stack.push(new HammockScreen(this)); return; }
    if (!goalMet(slot)) { App.stack.push(new DialogueScreen([{ who: 'ounce', text: HAMMOCK_LINES.early, mood: 'droop' }], { onDone: () => this.endDay() })); return; }
    App.stack.push(new DialogueScreen([{ who: 'ounce', text: HAMMOCK_LINES.fine, mood: 'pleased' }], { onDone: () => this.endDay() }));
  }

  endDay() {
    const slot = App.slot;
    slot.phase = 'report';
    App.store.write();
    App.go('report');
  }

  enterActivity(id, hard) { App.go('activity', { id, mode: 'week', hard }); }

  onUpdate(ctx, dt) {
    this.hero.updateVisual(this.model, dt, ctx.physics.alpha);
    const p = this.model.position;
    this.shadow.place(p.x, 0.07, p.z, Math.max(0, p.y - 0.07));
    this.ounce.update(dt);
    this.kevin.update(dt);
    if (this.seven && this.kevin.state !== 'fly') this.kevin.root.position.set(this.ounce.root.position.x, this.ounce.root.position.y + 1.5, this.ounce.root.position.z);
    this.coach.update(dt);
    for (const l of Object.values(this.locals)) l.update(dt);
    this.gulls.update(dt, this.t);
    this.water?.update(ctx.time);
    this.decals.update(dt);
    if (!App.stack.open && !this.attractMode) { this.islandBarks(dt); this.classmateBarks(dt); }
    if (this.justJumped) { this.justJumped = false; this.barkOnce('jump'); }
    if (this.justWaved) { this.justWaved = false; this.barkOnce('wave'); }
    if (this.justSat) { this.justSat = false; this.barkOnce('sit'); }
  }

  barkBottom() { return ABOVE_PROMPTS; }

  barkOnce(kind) {
    if (this.barkT > 4) return;
    App.say('ounce', this.cosmetic.pick(IDLE_BARKS[kind]));
    this.barkT = 6;
  }

  /** Walk past a classmate and they will tell you something. Not too often. */
  classmateBarks(dt) {
    this.chatT = (this.chatT ?? 2) - dt;
    if (this.chatT > 0 || this.bark.active) return;
    let nearest = null, best = 2.4;
    for (const [who, l] of Object.entries(this.locals)) {
      const d = Math.hypot(this.feet.x - l.at.x, this.feet.z - l.at.z);
      if (d < best) { best = d; nearest = who; }
    }
    if (!nearest) return;
    this.chatT = 14;
    this.barkT = Math.max(this.barkT, 8);
    App.say(nearest, this.cosmetic.pick(CLASSMATE_BARKS[nearest]));
  }

  islandBarks(dt) {
    this.barkT -= dt;
    if (this.barkT <= 0 && !this.bark.active) {
      this.barkT = 16 + this.cosmetic.next() * 14;
      App.say('ounce', this.cosmetic.pick(ISLAND_BARKS));
    }
  }

  onDraw(ctx) {
    if (this.attractMode) return;
    const { hud } = ctx;
    const slot = App.slot;
    // One idea per screen: a menu over the island hides the island's HUD.
    if (App.stack.open && App.stack.top?.name !== 'dialogue') return;
    if (slot) {
      const dayText = slot.week > 1 ? `Week ${slot.week}, day ${slot.day}` : `Day ${slot.day}`;
      hud.rect(SAFE - 3, 10, textWidth(dayText, 2) + 6, 20, 'navy');
      say(hud, SAFE, 12, dayText, { scale: 2, name: 'day' });
      const goal = goalOf(slot);
      const met = goalMet(slot);
      const rows = wrap(`Coach: ${goal.text}${met ? ' Done.' : ''}`, charsIn(Math.min(hud.width - 120, 220)));
      rows.forEach((r, i) => { hud.rect(SAFE - 3, 32 + i * 11, textWidth(r) + 6, 11, 'navy'); say(hud, SAFE, 33 + i * 11, r, { color: met ? 'lime' : 'sand', name: 'prescription' }); });
      const drips = `${slot.drips} Drips`;
      const dx = hud.width - SAFE;
      const hasPauseIcon = !!this.pauseIconHit;
      const right = hasPauseIcon ? dx - 16 : dx;
      hud.rect(right - textWidth(drips, 2) - 3, 10, textWidth(drips, 2) + 6, 20, 'navy');
      sayRight(hud, right, 12, drips, { scale: 2, color: 'cyan', name: 'drips' });
    }
    if (this.seven) {
      // What the dial reads, beside her: Kevin sits above, and he's the joke.
      const p = this.projected(ctx, this.ounce.root.position, 0.9);
      hud.rect(p.x + 22, p.y - 11, 22, 22, 'white');
      say(hud, p.x + 28, p.y - 8, '7', { scale: 2, color: 'red', shadow: false, name: 'dial-seven' });
    }
    if (App.stack.open) return;
    // Prompts, bottom.
    const list = [];
    if (this.nearest) {
      const st = STATIONS[this.nearest];
      const label = this.nearest === 'terrace' && slot && slot.week === 1 && slot.day === 7 && !goalMet(slot) ? 'Stand' : `${st.verb}: ${st.name}`;
      list.push(['confirm', label]);
    } else {
      if (App.device.last === 'mouse') list.push(['confirm', 'Click to walk']);
      else list.push(['lean', 'Walk'], ['jump', 'Jump'], ['wave', 'Wave'], ['sit', 'Sit']);
    }
    list.push(['pause', 'Pause']);
    promptBar(hud, App.device, list);
    if (this.hoverStation && !this.nearest) {
      const st = STATIONS[this.hoverStation];
      const p = this.projected(ctx, new Vector3(st.at[0], 0, st.at[1]), 3);
      const w = textWidth(st.name) + 8;
      const x = Math.max(12, Math.min(hud.width - w - 12, Math.round(p.x - w / 2)));
      const y = Math.max(46, Math.round(p.y) - 8);
      hud.rect(x, y, w, 12, 'cyan');
      say(hud, x + 4, y + 2, st.name, { color: 'ink', shadow: false, name: 'hover' });
    }
  }

  projected(ctx, v, up = 0) {
    const out = new Vector3(v.x, v.y + up, v.z).project(ctx.camera.camera);
    return { x: (out.x + 1) * 0.5 * ctx.hud.width, y: (1 - out.y) * 0.5 * ctx.hud.height };
  }

  cameraTarget() {
    const p = this.model?.position;
    return p ? this.camT.set(p.x, p.y + 0.9, p.z) : this.camT.set(0, 1, 5);
  }

  status() {
    const s = App.slot;
    return `hub | day ${s?.day ?? '-'} | near ${this.nearest ?? '-'} | drips ${s?.drips ?? 0} | hero ${this.feet.x.toFixed(1)},${this.feet.z.toFixed(1)}`;
  }

  fingerprint() { return `${this.feet.x.toFixed(4)},${this.feet.z.toFixed(4)}`; }

  /** Tests and Dev Tools: stand at a station. */
  stand(id) {
    const s = this.spawnFor(id);
    this.hero.teleport(s);
    this.hero.feetInto(this.feet);
    this.feet.x = s[0]; this.feet.z = s[2];
    this.updateNearest();
    return this.nearest;
  }

  dispose() { this.decals?.dispose?.(); }
}

function isUnlockedDay(slot, day) { return slot.week > 1 || slot.day >= day || slot.unlockedAll || App.dev.allUnlocked; }
