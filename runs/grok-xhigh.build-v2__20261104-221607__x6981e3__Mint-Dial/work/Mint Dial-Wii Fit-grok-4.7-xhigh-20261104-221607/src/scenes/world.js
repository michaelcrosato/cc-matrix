import {
  ContactShadow,
  HERO_CLIPS,
  HERO_MODEL,
  HERO_RIG,
  PALETTE,
  PlatformerCharacter,
  THREE,
  applySky,
  buildModel,
  compileClips,
  readMoveInput,
  setLookLayer,
  skyAt,
  toonMaterial,
} from '../../pixel-engine.js';
import { TITLE } from '../data/title.js';
import { ACTIVITY_BY_ID } from '../data/activities.js';
import { App } from '../app.js';
import { dress, PLAYER_LOOK } from '../art/avatar.js';
import { CLIPS } from '../art/clips.js';
import { coconut, ferry, hammock, hoop, jar, kevin, ounce, palm, pavilion, pier, vitamin, yogaMat } from '../art/models.js';
import { registerSfx } from '../audio/sfx.js';
import { GAMEPAD_BUTTONS } from '../core/actions.js';

const { AnimationMixer, BoxGeometry, Color, LoopRepeat, Mesh, Quaternion, RingGeometry, SphereGeometry, Vector3 } = THREE;

const LAYOUT = [
  [ounce, 0, 0, 1.4],
  [pavilion, -7.5, 0, 5],
  [pier, -8, 0, -9],
  [palm, 9, 0, 6],
  [palm, -10, 0, -1],
  [hammock, 5.5, 0, -1.5],
  [ferry, 13, 0, 3],
  [yogaMat, 0, 0.02, 0],
  [hoop, 8, 0, -7],
  [jar, -2.2, 0, 2.4],
  [kevin, 3.2, 0, 4.2],
  [coconut, 7.2, 0.15, -5.4],
  [vitamin, -3.6, 0.2, 0.4],
];

export const CAMERA = {
  preset: 'fixed',
  position: [9, 7, 11],
  target: [0, 1, 0],
  fov: 42,
};

const PLAY_MODES = new Set(['activity', 'weigh', 'attract', 'medley']);
const WIDE_MODES = new Set(['title', 'menu', 'island', 'card', 'join', 'results', 'report', 'ferry', 'slots', 'name', 'question', 'reveal', 'hammock', 'confession', 'credits', 'settings', 'about', 'station', 'locker', 'hall', 'jar', 'howto', 'podium']);

export class World {
  name = TITLE;

  constructor(app) {
    this.app = app || new App();
    this.target = new Vector3(0, 1, 0);
    this.hero = null;
    this.heroModel = null;
    this.heroRoot = null;
    this.heroClips = null;
    this.move = null;
    this.dotMesh = null;
    this.ringMesh = null;
    this.shadow = null;
    this.poseMixer = null;
    this.poseActions = null;
    this.poseAction = null;
    this.poseName = '';
    this.poseTime = 0;
    this.shot = 'wide';
    this.latchedPlay = false;
    this.holdMove = null;
  }

  async setup(ctx) {
    const { scene, engine } = ctx;
    this.app.engine = engine;
    this.app.ctx = ctx;
    scene.background = new Color(PALETTE.sky);
    applySky(engine, skyAt(this.hour()));
    ctx.input.gamepadButtons = { ...GAMEPAD_BUTTONS };
    ctx.input.gamepadDeadzone = 0.12;
    registerSfx(ctx.audio);
    this.app.applyVolumes();

    this.addGround(ctx);
    if (this.app.session) this.addMats(scene);
    else this.addIsland(scene);
    this.addDial(scene);

    if (!this.app.session && !this.app.noHero) {
      try {
        await this.loadHero(ctx);
      } catch {
        this.hero = null;
      }
    }
    globalThis.__GAME__ = this.app;
    globalThis.__PIXEL_ENGINE__ = engine;
  }

  ready(ctx) {
    this.app.applyVolumes();
    globalThis.__GAME__ = this.app;
    globalThis.__PIXEL_ENGINE__ = ctx.engine;
  }

  hour() {
    const day = this.app.guest?.day || 1;
    return 8 + ((day - 1) % 5);
  }

  addGround(ctx) {
    const { scene } = ctx;
    const ground = new Mesh(new BoxGeometry(64, 1, 64), toonMaterial(PALETTE.lime));
    ground.position.set(0, -0.5, 0);
    ground.receiveShadow = true;
    scene.add(ground);
    const sand = new Mesh(new BoxGeometry(16, 0.08, 16), toonMaterial(PALETTE.sand));
    sand.position.set(0, 0.04, 0);
    sand.receiveShadow = true;
    scene.add(sand);
    const water = new Mesh(new BoxGeometry(28, 0.35, 18), toonMaterial(PALETTE.sky));
    water.position.set(-6, -0.15, -16);
    scene.add(water);
    try {
      ctx.physics.addStaticBox({ position: [0, -0.5, 0], halfExtents: [32, 0.5, 32] });
    } catch {
      /* the dial does not need a floor to think */
    }
  }

  addMats(scene) {
    const colors = [PALETTE.red, PALETTE.blue, PALETTE.lime, PALETTE.sand];
    colors.forEach((color, i) => {
      const mat = new Mesh(new BoxGeometry(1.4, 0.06, 2.2), toonMaterial(color));
      mat.position.set((i - 1.5) * 2.2, 0.06, 0);
      scene.add(mat);
    });
  }

  addIsland(scene) {
    for (const [def, x, y, z] of LAYOUT) {
      const built = buildModel(def);
      built.object.position.set(x, y, z);
      scene.add(built.object);
    }
  }

  addDial(scene) {
    this.ringMesh = new Mesh(new RingGeometry(0.72, 0.84, 28), toonMaterial(PALETTE.white));
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.set(0, 0.08, 0);
    this.dotMesh = new Mesh(new SphereGeometry(0.16, 10, 8), toonMaterial(PALETTE.red));
    this.dotMesh.position.set(0, 0.28, 0);
    scene.add(this.ringMesh, this.dotMesh);
  }

  async loadHero(ctx) {
    const loaded = await ctx.loadModel(HERO_MODEL, { castShadow: false });
    const model = loaded.scene;
    setLookLayer(model, 'actors');
    try {
      dress(model, { ...PLAYER_LOOK });
    } catch {
      model.traverse((obj) => {
        if (obj.name === 'Eyes' || obj.name === 'Hat' || obj.name === 'Moustache') obj.visible = false;
      });
    }
    this.heroRoot = model;
    this.heroModel = model;
    const poses = compileClips(CLIPS, HERO_RIG, model);
    this.heroClips = [...compileClips([...HERO_CLIPS], HERO_RIG, model), ...poses];
    this.poseMixer = new AnimationMixer(model);
    this.poseActions = {};
    for (const clip of poses) {
      const action = this.poseMixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      this.poseActions[clip.name] = action;
    }
    this.shadow = new ContactShadow(0.42);
    model.position.set(0, 0, 3.2);
    ctx.scene.add(model, this.shadow);
    this.hero = new PlatformerCharacter(ctx.physics, { position: [0, 0, 3.2] });
    this.hero.attachModel(model, this.heroClips, HERO_RIG);
  }

  stillInput() {
    if (!this.holdMove) this.holdMove = { move: new Vector3(), jump: false, jumpHeld: false, crouch: false };
    this.holdMove.move.set(0, 0, 0);
    this.holdMove.jump = false;
    this.holdMove.jumpHeld = false;
    this.holdMove.crouch = false;
    return this.holdMove;
  }

  clipName() {
    if (!this.poseActions) return '';
    if (this.app.mode === 'dev' && this.app.viewerClip && this.poseActions[this.app.viewerClip]) return this.app.viewerClip;
    if (this.app.mode === 'activity' || this.app.mode === 'attract') {
      const clip = ACTIVITY_BY_ID[this.app.activityId]?.clip;
      if (clip && this.poseActions[clip]) return clip;
    }
    return '';
  }

  fixedUpdate(ctx, dt) {
    this.app.fixed(ctx, dt);
    if (!this.hero) return;
    const live = !this.app.frozen && ctx.engine?.timeScale !== 0;
    if (!live) return;
    if (this.app.mode === 'island' && !this.app.driver) {
      this.move = readMoveInput(ctx, this.hero, this.move);
      this.hero.fixedUpdate(dt, this.move);
    } else if (PLAY_MODES.has(this.app.mode)) {
      this.hero.fixedUpdate(dt, this.stillInput());
    }
  }

  update(ctx, dt) {
    this.app.update(ctx, dt);
    if (this.app.settings && ctx.engine) applySky(ctx.engine, skyAt(this.hour()));
    this.frameCamera(ctx);
    this.placeDot();
    if (this.hero && this.heroRoot) {
      const name = this.clipName();
      if (name) this.playPose(name, dt);
      else {
        this.stopPose();
        this.hero.updateVisual(this.heroRoot, dt, ctx.physics.alpha);
      }
      const feet = this.heroRoot.position;
      if (this.shadow) this.shadow.place(feet.x, 0, feet.z, Math.max(0, feet.y));
    }
  }

  playPose(name, dt) {
    const action = this.poseActions[name];
    if (!action) return;
    if (this.poseName !== name) {
      this.stopPose();
      action.reset();
      action.setLoop(LoopRepeat, Infinity);
      action.enabled = true;
      action.paused = false;
      action.play();
      this.poseAction = action;
      this.poseName = name;
    }
    const def = ACTIVITY_BY_ID[this.app.activityId];
    const scrub = def?.kind === 'reps' && typeof this.app.sim?.r === 'number' && this.app.mode !== 'dev';
    this.restoreSnap();
    if (scrub) {
      action.paused = true;
      const dur = action.getClip().duration || 1;
      action.time = Math.min(1, Math.max(0, this.app.sim.r)) * dur;
      this.poseMixer.update(0);
    } else {
      action.paused = false;
      this.poseMixer.update(Math.max(0, dt));
    }
    this.poseTime = action.time;
    this.saveSnap();
    this.leanBody();
  }

  /** The mixer skips a joint it did not change, so last frame's lean would stack. */
  restoreSnap() {
    const snap = this.poseSnap;
    if (!snap?.ready || !this.heroRoot) return;
    const torso = this.heroRoot.getObjectByName('Torso');
    const pelvis = this.heroRoot.getObjectByName('Pelvis');
    if (torso) torso.quaternion.copy(snap.torso);
    if (pelvis) {
      pelvis.position.copy(snap.pelvis);
      pelvis.quaternion.copy(snap.pelvisQ);
    }
  }

  saveSnap() {
    if (!this.heroRoot) return;
    if (!this.poseSnap) this.poseSnap = { torso: new Quaternion(), pelvis: new Vector3(), pelvisQ: new Quaternion(), ready: false };
    const torso = this.heroRoot.getObjectByName('Torso');
    const pelvis = this.heroRoot.getObjectByName('Pelvis');
    if (torso) this.poseSnap.torso.copy(torso.quaternion);
    if (pelvis) {
      this.poseSnap.pelvis.copy(pelvis.position);
      this.poseSnap.pelvisQ.copy(pelvis.quaternion);
    }
    this.poseSnap.ready = true;
  }

  stopPose() {
    if (this.poseAction) this.poseAction.stop();
    this.poseAction = null;
    this.poseName = '';
    this.poseTime = 0;
  }

  leanBody() {
    const dot = this.app.sim?.dot || this.app.weigh?.dot || null;
    if (!dot || !this.heroRoot) return;
    const torso = this.heroRoot.getObjectByName('Torso');
    const pelvis = this.heroRoot.getObjectByName('Pelvis');
    if (torso) {
      torso.rotateZ(-dot.x * 0.18);
      torso.rotateX(-dot.y * 0.12);
    }
    if (pelvis) pelvis.position.x += dot.x * 0.05;
  }

  frameCamera(ctx) {
    if (!ctx.engine || this.app.freeCam) return;
    if (PLAY_MODES.has(this.app.mode)) this.latchedPlay = true;
    if (WIDE_MODES.has(this.app.mode)) this.latchedPlay = false;
    const close = this.latchedPlay && (PLAY_MODES.has(this.app.mode) || this.app.mode === 'pause' || this.app.mode === 'dev');
    const shot = close ? 'play' : 'wide';
    if (shot === this.shot) return;
    this.shot = shot;
    if (shot === 'wide') {
      ctx.engine.setCamera({ ...CAMERA }, { syncUrl: false });
      return;
    }
    const p = this.heroRoot?.position;
    const tx = p ? p.x : 0;
    const ty = (p ? p.y : 0) + 1.05;
    const tz = p ? p.z : 3.2;
    ctx.engine.setCamera({
      preset: 'fixed',
      position: [tx + 1.7, ty + 0.35, tz + 2.5],
      target: [tx, ty, tz],
      fov: 28,
    }, { syncUrl: false });
  }

  placeDot() {
    if (!this.dotMesh) return;
    const dot = this.app.sim?.dot || this.app.weigh?.dot || this.app.lanes?.[0]?.dot;
    const show = this.app.mode === 'activity' || this.app.mode === 'weigh' || this.app.mode === 'attract' || this.app.mode === 'medley';
    this.dotMesh.visible = true;
    this.ringMesh.visible = true;
    const x = dot ? dot.x : Math.sin((this.app.ctx?.time?.now || 0) * 0.7) * 0.15;
    const y = dot ? dot.y : 0;
    this.dotMesh.position.set(x * 0.9, 0.28, y * 0.9);
    const outside = dot && Math.hypot(dot.x, dot.y) > 0.45;
    this.dotMesh.scale.setScalar(show ? (outside ? 1.25 : 1) : 0.85);
  }

  cameraTarget() {
    return this.target.set(0, 1, 0);
  }

  fingerprint() {
    return this.app.fingerprint();
  }

  status() {
    return this.app.status();
  }
}
