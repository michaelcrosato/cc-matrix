// The shell's dioramas: the Belfry against a stormy sky, and three heroes on plinths.
import { buildModel, disposeObject, glowMaterial, groundFog, mergeStaticMeshes, PALETTE, Precipitation, Rng, setLookLayer, textureMap, THREE, toonMaterial } from '../../pixel-engine.js';
import { PLAYABLE } from '../data/classes.js';
import { applyBiomeLight } from './zonebuild.js';
import { Actor, CLASS_BODY } from './actors.js';
import { MODELS } from './models/index.js';

const { BoxGeometry, Color, CylinderGeometry, Group, Mesh, PlaneGeometry, Vector3 } = THREE;

export class ShellSet {
  constructor(view) {
    this.view = view;
    const ctx = view.ctx;
    this.ctx = ctx;
    this.root = new Group();
    ctx.scene.add(this.root);
    ctx.scene.background = new Color(PALETTE.ink);
    applyBiomeLight(ctx.engine, ctx.scene, 'belfry');
    ctx.engine.sun.intensity = 0.8;
    ctx.engine.ambient.intensity = 1.1;
    this.lights = [];
    this.heroes = [];
    this.t = 0;
    this.rng = new Rng('shell');
    this.buildMoor();
    this.buildTower();
    this.buildPlinths();
    this.rain = new Precipitation({ kind: 'rain', count: 800 });
    this.rain.wind.set(2, -1);
    this.root.add(this.rain);
    this.mist = groundFog({ color: PALETTE.navy, top: 1.5, amount: 0.3 });
    ctx.scene.fogNode = this.mist.node;
    this.target = new Vector3(0, 6, 0);
    this.mode = 'title';
    this.selected = 0;
    view.cam.set(0, 1, 0);
    this.play('Idle');
  }

  buildMoor() {
    const g = new PlaneGeometry(160, 160).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, uv.getY(i) * 20);
    const m = new Mesh(g, toonMaterial(PALETTE.slate, { map: textureMap('mud') }));
    m.receiveShadow = true;
    this.root.add(m);
    const props = ['tombstone', 'dead-tree', 'tombstone', 'bones', 'rock', 'tombstone', 'stump'];
    for (let i = 0; i < 46; i++) {
      const id = this.rng.pick(props);
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(10, 34);
      const o = buildModel(id, { catalog: MODELS, seed: i + 1 }).object;
      o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      o.rotation.y = this.rng.range(0, 6);
      o.traverse((q) => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
      this.root.add(o);
    }
  }

  buildTower() {
    const stone = toonMaterial(PALETTE.mist, { map: textureMap('ashlar') });
    const dark = toonMaterial(PALETTE.ink);
    const parts = [];
    const block = (w, h, d, x, y, z, mat = stone) => {
      const b = new BoxGeometry(w, h, d);
      const uv = b.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 0.5, uv.getY(i) * h * 0.5);
      const m = new Mesh(b, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      m.updateMatrixWorld();
      parts.push(m);
    };
    block(14, 34, 14, 0, 17, 0);
    block(16, 2, 16, 0, 2, 0);
    block(15.5, 1, 15.5, 0, 14, 0);
    block(15.5, 1, 15.5, 0, 26, 0);
    block(10, 8, 10, 0, 38, 0);
    block(5.5, 12, 0.6, 7.2, 22, 0, dark);
    block(0.6, 12, 5.5, 0, 22, 7.2, dark);
    block(4, 8, 0.6, 7.2, 8, 0, dark);
    block(0.6, 8, 4, 0, 8, 7.2, dark);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(1.6, 40, 1.6, sx * 6.8, 20, sz * 6.8);
    const spire = new Mesh(new CylinderGeometry(0.2, 7.5, 16, 4), toonMaterial(PALETTE.night));
    spire.position.set(0, 50, 0);
    spire.rotation.y = Math.PI / 4;
    spire.updateMatrixWorld();
    parts.push(spire);
    for (const m of mergeStaticMeshes(parts)) this.root.add(m);
    const bell = buildModel('old_clemency', { catalog: MODELS }).object;
    bell.position.set(7.4, 19, 7.4);
    bell.scale.setScalar(0.85);
    bell.traverse((q) => { if (q.isMesh) q.castShadow = true; });
    this.root.add(bell);
    this.bell = bell;
    this.lights.push(this.ctx.lights.request({ position: [10, 24, 10], color: 0x60e0f0, intensity: 22, radius: 22, priority: 2 }));
    this.lights.push(this.ctx.lights.request({ position: [10, 3, 10], color: 0xff9040, intensity: 18, radius: 18, flicker: 'torch', priority: 2 }));
  }

  buildPlinths() {
    // Three heroes in a torchlit room, far enough from the tower to have the screen to themselves.
    const base = new Vector3(40, 0, 40);
    this.plinthBase = base;
    const stone = toonMaterial(PALETTE.mist, { map: textureMap('flagstones') });
    const floor = new Mesh(new BoxGeometry(18, 0.6, 12), stone);
    floor.position.set(base.x, 0.02, base.z);
    floor.receiveShadow = true;
    this.root.add(floor);
    const back = new Mesh(new BoxGeometry(18, 7, 0.8), toonMaterial(PALETTE.slate, { map: textureMap('ashlar') }));
    back.position.set(base.x - 3, 3.5, base.z - 4.5);
    back.rotation.y = -Math.PI / 4 * 0;
    this.root.add(back);
    const positions = [[-3.2, 0.6], [0, 0], [3.2, -0.6]];
    PLAYABLE.forEach((cls, i) => {
      const [dx, dz] = positions[i];
      const x = base.x + dx, z = base.z + dz;
      const pl = new Mesh(new CylinderGeometry(0.85, 1, 0.5, 8), toonMaterial(PALETTE.plum));
      pl.position.set(x, 0.55, z);
      pl.castShadow = true;
      pl.receiveShadow = true;
      this.root.add(pl);
      const a = new Actor(this.view, { id: `hero${i}`, type: cls, body: CLASS_BODY[cls], def: { r: 0.45 }, x, z, isHero: true });
      a.root.position.y = 0.8;
      a.setGear({ main: { bellwarden: 'hand-bell-weapon', lamplighter: 'staff', sexton: 'shovel' }[cls], off: cls === 'lamplighter' ? 'hand-lantern' : '', head: 'blessed', shoulders: 'blessed' }, cls);
      this.heroes.push({ a, cls, x, z });
      this.lights.push(this.ctx.lights.request({ position: [x + 0.5, 2.8, z + 1.2], color: 0xffb060, intensity: 9, radius: 7, flicker: 'torch', priority: 2 }));
      const t = buildModel('standing-torch', { catalog: MODELS }).object;
      t.position.set(x + 1.6, 0.3, z - 1.2);
      this.root.add(t);
    });
  }

  setMode(mode, selected = 0) {
    this.mode = mode;
    if (this.selected !== selected || mode === 'select') {
      this.selected = selected;
      this.play('Triumph');
    }
  }

  play() {
    this.heroes.forEach((h, i) => { if (i === this.selected) h.a.play('Triumph', 1); });
  }

  update(dt, realDt) {
    this.t += realDt;
    const view = this.view;
    if (this.mode === 'title') {
      // A slow pan up the Belfry.
      const a = this.t * 0.04;
      view.cam.set(4 + Math.sin(a) * 3, 1, 4 + Math.cos(a) * 3);
      this.camY = 12 + Math.sin(this.t * 0.05) * 4;
      view.camOverride = { x: view.cam.x, y: this.camY, z: view.cam.z, zoom: 0.5 };
    } else {
      const h = this.heroes[this.selected] ?? this.heroes[1];
      view.camOverride = { x: h.x * 0.6 + this.plinthBase.x * 0.4, y: -0.6, z: h.z * 0.6 + this.plinthBase.z * 0.4, zoom: 1.3 };
    }
    for (const h of this.heroes) { h.a.sync(h.x, h.z, Math.PI / 4, false, 0, dt); h.a.root.position.y = 0.8; h.a.shadow.visible = false; }
    this.rain.update(dt, view.cam);
    if (this.bell) this.bell.rotation.z = Math.sin(this.t * 0.6) * 0.05;
    if (Math.floor(this.t * 8) % 3 === 0) view.ctx.particles.burst('ember_drift', [view.cam.x + this.rng.range(-12, 12), this.rng.range(0.5, 10), view.cam.z + this.rng.range(-12, 12)]);
    view.updateCamera(realDt);
  }

  dispose() {
    for (const l of this.lights) l.release();
    for (const h of this.heroes) h.a.remove();
    this.rain.dispose();
    if (this.ctx.scene.fogNode === this.mist.node) this.ctx.scene.fogNode = null;
    this.ctx.scene.remove(this.root);
    disposeObject(this.root);
    this.view.camOverride = null;
  }
}

export { glowMaterial, setLookLayer };
