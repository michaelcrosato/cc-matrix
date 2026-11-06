/** Headless acceptance. Run from the dev folder: node tests/run.mjs --all */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine, checkModel, parseSong, validateTexture } from '../pixel-engine.js';
import { aboutPages } from '../src/content/about.js';
import { LINES } from '../src/content/dialogue.js';
import { SONGS } from '../src/audio/songs.js';
import { MODELS } from '../src/art/models.js';
import { TEXTURES } from '../src/art/textures.js';
import { siteById } from '../src/content/sites.js';
import { TUNING_DEFAULTS, TUNING_RANGES, SLIDER_KEYS } from '../src/content/tuning-defaults.js';
import { TUNING } from '../src/core/tuning.js';
import { createGame } from '../src/game.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7)
  || (args.includes('--only') ? args[args.indexOf('--only') + 1] : '');
const DT = 1 / 60;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

let engine;
let game;

async function boot() {
  if (engine) return;
  game = createGame();
  engine = await Engine.headless(game, { seed: 1 });
}

function release() {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyQ', 'KeyM', 'KeyH', 'KeyF', 'KeyC', 'KeyJ', 'ShiftLeft', 'Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4']) {
    engine.input.setKey(code, false);
  }
  engine.input.setButtons(0);
}

function tap(code) {
  engine.input.setKey(code, true);
  engine.step(1, DT);
  engine.input.setKey(code, false);
  engine.step(1, DT);
}

function holdKey(code, frames) {
  engine.input.setKey(code, true);
  engine.step(frames, DT);
  engine.input.setKey(code, false);
  engine.step(1, DT);
}

function tapFire() {
  engine.input.setButtons(1);
  engine.step(2, DT);
  engine.input.setButtons(0);
  engine.step(1, DT);
}

function holdFire(frames) {
  engine.input.setButtons(1);
  engine.step(frames, DT);
  engine.input.setButtons(0);
  engine.step(1, DT);
}

function arm(id) {
  const w = game.world;
  const i = w.guns.findIndex((g) => g.id === id);
  if (i < 0) throw new Error('no gun ' + id);
  tap('Digit' + (i + 1));
  if (w.weapon?.id !== id) throw new Error('selected ' + w.weapon?.id + ' instead of ' + id);
}

function goTo(x, z, r) {
  const w = game.world;
  const step = w.currentStep();
  release();
  for (let spins = 0; spins < 2500; spins++) {
    if (!w.mission || w.mission.done || w.currentStep() !== step) {
      release();
      return;
    }
    const p = w.feet();
    if (Math.hypot(x - p.x, z - p.z) <= r) {
      release();
      engine.step(1, DT);
      return;
    }
    const look = Math.atan2(-(x - p.x), -(z - p.z));
    game.ctx.camera.yaw = look;
    let aligned = true;
    if (w.inVehicle && w.car) {
      const face = Math.atan2(x - p.x, z - p.z);
      let err = face - w.car.yaw;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      aligned = Math.abs(err) < 0.7;
      engine.input.setKey('KeyA', err > 0.25);
      engine.input.setKey('KeyD', err < -0.25);
    }
    engine.input.setKey('KeyW', aligned);
    engine.step(6, DT);
  }
  const p = w.feet();
  release();
  throw new Error('goto stuck at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ' wanting ' + x + ',' + z);
}

function placeFacing(x, z) {
  const w = game.world;
  if (w.inVehicle && w.vehicleHp >= 50) tap('KeyE');
  w.teleport(x, z + 4);
  game.ctx.camera.yaw = 0;
  engine.step(1, DT);
}

function texBytes(tex) {
  const image = tex && tex.image;
  if (image && image.data) return image.data;
  const source = tex && tex.source && tex.source.data;
  if (source && source.data) return source.data;
  return source || image || null;
}

function assertHeldMap(w, label) {
  const sheet = w.mapSheet;
  const cam = game.ctx.camera.camera;
  assert(sheet && sheet.visible, label + ' map is not in the hands');
  assert(w.mapRig && w.mapRig.parent === game.ctx.scene, label + ' map is not in the scene');
  assert(sheet.parent === w.mapRig, label + ' map is not on the hand rig');
  cam.updateMatrixWorld(true);
  const e = cam.matrixWorld.elements;
  const dx = w.mapRig.position.x - e[12];
  const dy = w.mapRig.position.y - e[13];
  const dz = w.mapRig.position.z - e[14];
  assert(dx * dx + dy * dy + dz * dz < 0.04, label + ' map is not on the camera');
  assert(texBytes(w.mapTex) === w.mapPx, label + ' map texture does not read mapPx');
  assert(sheet.material && sheet.material.map === w.mapTex, label + ' mesh does not sample mapPx');
  const gps = sheet.getObjectByName('gps');
  assert(gps, label + ' gps missing');
  assert(texBytes(w.gpsTex) === w.gpsPx, label + ' gps texture does not read gpsPx');
  assert(gps.material && gps.material.map === w.gpsTex, label + ' gps mesh does not sample gpsPx');
  let marked = false;
  for (let i = 0; i < w.gpsPx.length; i += 4) {
    if (w.gpsPx[i] === 220 && w.gpsPx[i + 1] === 48) marked = true;
  }
  assert(marked, label + ' gps did not paint');
}

function assertRig(actor, label) {
  assert(actor && actor.view, label + ' has no rig');
  assert(actor.view.parent === game.ctx.scene, label + ' rig is not in the scene');
  actor.x = (actor.x || 0) + 6;
  engine.step(1, DT);
  const dx = Math.abs(actor.view.position.x - actor.x);
  assert(dx < 0.05, label + ' rig did not follow ' + actor.view.position.x + ' vs ' + actor.x);
}

function lightCurrentBurn() {
  const w = game.world;
  const step = w.currentStep();
  if (w.inVehicle && w.vehicleHp >= 50) tap('KeyE');
  const r = step.r || 12;
  const origin = w.fire.cellAt(step.x, step.z);
  let lx = step.x;
  let lz = step.z;
  const reach = Math.ceil(r / 5);
  let best = Infinity;
  for (let dz = -reach; dz <= reach; dz++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const ix = origin.ix + dx;
      const iz = origin.iz + dz;
      if (ix < 0 || iz < 0 || ix >= 256 || iz >= 256) continue;
      const i = w.fire.idx(ix, iz);
      if (w.fire.fuel[i] <= 0 || w.fire.state[i] !== 0) continue;
      const [cx, cz] = w.fire.center(ix, iz);
      const d = Math.hypot(cx - step.x, cz - step.z);
      if (d > r - 1 || d >= best) continue;
      best = d;
      lx = cx;
      lz = cz;
    }
  }
  w.teleport(lx, lz + 18);
  game.ctx.camera.yaw = 0;
  arm('flare');
  tapFire();
  engine.step(20, DT);
}

function clickHud(pixelY) {
  engine.input.setPointer(0, 1 - (pixelY / 270) * 2, true);
  engine.step(1, DT);
  engine.input.setPointer(0, 1, false);
  engine.step(1, DT);
}

function playMission(id, opts = {}) {
  const w = game.world;
  assert(w.startMission(id, opts), 'missing ' + id);
  let choiceI = 0;
  for (let guard = 0; guard < 80 && w.mission && !w.mission.done; guard++) {
    const step = w.currentStep();
    if (!step) break;
    const before = w.mission.index;
    if (step.do === 'lines') {
      for (let n = 0; n < 8 && w.currentStep()?.do === 'lines'; n++) tap('Enter');
    } else if (step.do === 'map') {
      if (!w.map.up) tap('KeyM');
      else engine.step(1, DT);
      if (w.map.up) tap('KeyM');
    } else if (step.do === 'fever-fall') {
      engine.step(Math.ceil(26 * 60), DT);
    } else if (step.do === 'tablet') {
      holdKey('KeyH', 90);
    } else if (step.do === 'goto' || step.do === 'drive' || step.do === 'leave') {
      const site = step.site ? siteById(step.site) : null;
      const x = site ? site.x : step.x;
      const z = site ? site.z : step.z;
      const radius = step.r || (step.do === 'leave' ? 40 : 20);
      if (step.do === 'leave') {
        goTo(x + radius + 30, z, 8);
      } else goTo(x, z, Math.max(4, radius - 2));
    } else if (step.do === 'jam') {
      arm('tractor');
      for (let n = 0; n < 24 && w.currentStep()?.do === 'jam'; n++) {
        if (w.weapon?.jammed) tap('KeyR');
        else holdFire(15);
      }
    } else if (step.do === 'repair') {
      holdKey('KeyE', 220);
    } else if (step.do === 'syrette') {
      holdKey('KeyQ', 70);
    } else if (step.do === 'destroy') {
      for (let n = 0; n < 8 && w.currentStep()?.do === 'destroy'; n++) {
        const prop = w.props.find((p) => p.alive !== false && p.tag === step.tag);
        if (!prop) break;
        placeFacing(prop.x, prop.z);
        if (w.guns.some((g) => g.id === 'tractor')) arm('tractor');
        engine.input.setButtons(1);
        for (let f = 0; f < 90 && w.currentStep()?.do === 'destroy'; f++) engine.step(1, DT);
        engine.input.setButtons(0);
        engine.step(1, DT);
      }
    } else if (step.do === 'burn') {
      lightCurrentBurn();
    } else if (step.do === 'clear') {
      const foe = w.actors.find((a) => a.alive && a.post === step.tag);
      if (!foe) throw new Error('no foe ' + step.tag);
      placeFacing(foe.x, foe.z);
      arm('tractor');
      holdFire(80);
    } else if (step.do === 'use' || step.do === 'collect' || step.do === 'report') {
      const prop = w.props.find((p) => p.tag === step.tag && p.alive !== false && !p.hidden);
      const site = step.to ? siteById(step.to) : null;
      const x = prop ? prop.x : site ? site.x : w.feet().x;
      const z = prop ? prop.z : site ? site.z : w.feet().z;
      if (w.inVehicle && w.vehicleHp >= 50) tap('KeyE');
      w.teleport(x, z + 1);
      engine.step(1, DT);
      tap('KeyE');
    } else if (step.do === 'buddy-down') {
      tap('KeyE');
    } else if (step.do === 'hold' || step.do === 'ride') {
      release();
      const frames = Math.ceil(step.time * 60) + 30;
      engine.step(frames, DT);
    } else if (step.do === 'choice') {
      const pick = (opts.picks || [])[choiceI] || 0;
      choiceI += 1;
      if (pick === 1) tap('ArrowRight');
      tap('Enter');
    } else {
      throw new Error('unhandled step ' + step.do);
    }
    if (w.mission && !w.mission.done && w.mission.index === before) {
      const p = w.feet();
      throw new Error(id + ' stuck on ' + step.do + ' ' + (step.text || '') + ' at ' + p.x.toFixed(0) + ',' + p.z.toFixed(0));
    }
  }
  assert(w.mission?.done, id + ' did not finish');
  release();
}

function walkSrc(dir, hit) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkSrc(path, hit);
    else if (name.endsWith('.js')) hit.push(readFileSync(path, 'utf8'));
  }
}

test('static files', () => {
  const files = [];
  walkSrc(join(root, 'src'), files);
  const blob = files.join('\n');
  assert(!blob.includes('Math.random'), 'Math.random in src');
  for (const word of ['TODO', 'FIXME', 'placeholder', 'stub', 'coming soon']) {
    assert(!blob.toLowerCase().includes(word), 'forbidden ' + word);
  }
  const zip = join(root, 'vendor', 'pixel-engine.zip');
  const packed = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
  const entry = packed.find((line) => line.endsWith('pixel-engine.js'));
  assert(entry, 'zip has no pixel-engine.js');
  const fromZip = execFileSync('unzip', ['-p', zip, entry], { maxBuffer: 16 * 1024 * 1024 });
  const onDisk = readFileSync(join(root, 'pixel-engine.js'));
  assert(createHash('sha256').update(fromZip).digest('hex') === createHash('sha256').update(onDisk).digest('hex'), 'pixel-engine.js differs from the kit zip');
  for (const song of Object.values(SONGS)) {
    const parsed = parseSong(song);
    assert(parsed.notes.length > 0, 'silent song');
  }
  for (const model of MODELS) {
    const check = checkModel(model);
    assert(check.problems.length === 0, model.id + ' ' + check.problems.join('; '));
  }
  for (const tex of TEXTURES) {
    const check = validateTexture(tex);
    assert(check.problems.length === 0, tex.id + ' ' + check.problems.join('; '));
  }
  const allowed = new Set(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:\'-/()%+#&');
  const shown = [...Object.values(LINES), ...aboutPages().flat()];
  for (const line of shown) {
    for (const ch of String(line).toUpperCase()) {
      if (!allowed.has(ch)) throw new Error('font glyph ' + JSON.stringify(ch) + ' in ' + line);
    }
  }
});

test('title music and basin', async () => {
  await boot();
  const state = game.state();
  assert(state.screen === 'title', 'screen ' + state.screen);
  assert(state.title === 'A Cry Too Far', state.title);
  assert(game.ctx.audio.volume.music === 0.1, 'music ' + game.ctx.audio.volume.music);
  assert(game.world.land.nx === 512 && game.world.land.sizeX === 1280, 'basin');
  engine.step(30, DT);
  const heard = Object.values(game.ctx.audio.counts).reduce((a, b) => a + b, 0);
  game.ctx.audio.play('gun-m38');
  game.ctx.audio.play('explosion');
  engine.step(5, DT);
  const heardAfter = Object.values(game.ctx.audio.counts).reduce((a, b) => a + b, 0);
  assert(heardAfter > heard, 'sounds silent');
  assert(engine.errors.length === 0, 'boot errors');
});

test('fire spread scars and reburn', async () => {
  await boot();
  const fire = game.world.fire;
  game.world.windPin = { dir: 0, speed: 5 };
  let column = null;
  for (let ix = 30; ix < 220 && !column; ix++) {
    let ok = 0;
    for (let iz = 70; iz < 100; iz++) if (fire.fuel[ix + iz * 256] > 0) ok++;
    if (ok >= 24) column = ix;
  }
  assert(column != null, 'no grass column');
  const iz0 = 70;
  const iz1 = 99;
  for (let iz = iz0; iz <= iz1; iz++) fire.lightIndex(fire.idx(column, iz));
  engine.step(16 * 60, DT);
  let maxX = column;
  let minZ = iz1;
  let maxZ = iz0;
  let burnt = null;
  for (let i = 0; i < fire.state.length; i++) {
    if (fire.state[i] !== 1 && fire.state[i] !== 2) continue;
    const ix = i % 256;
    const iz = (i / 256) | 0;
    if (ix > maxX) maxX = ix;
    if (iz < minZ) minZ = iz;
    if (iz > maxZ) maxZ = iz;
    if (fire.state[i] === 2 && !burnt) burnt = i;
  }
  const head = ((maxX - column) * 5) / 16;
  const flank = ((Math.max(iz1, maxZ) - Math.min(iz0, minZ) - (iz1 - iz0)) / 2 * 5) / 16;
  assert(head >= 2 && head <= 5, 'head speed ' + head.toFixed(2));
  assert(flank < head, 'flank ' + flank.toFixed(2) + ' head ' + head.toFixed(2));
  assert(burnt != null, 'nothing burnt');
  const before = fire.state[burnt];
  const [bx, bz] = fire.center(burnt % 256, (burnt / 256) | 0);
  fire.ignite(bx, bz, 0);
  assert(fire.state[burnt] === before, 'burnt cell relit');
  game.world.refreshMap();
  assert(game.world.mapHasScar(), 'map has no scar');
  game.world.windPin = null;
});

test('locomotion', async () => {
  await boot();
  const w = game.world;
  w.startMission('m7');
  w.lines = [];
  release();
  game.ctx.camera.yaw = 0;
  const z0 = w.feet().z;
  holdKey('KeyW', 60);
  const run = z0 - w.feet().z;
  assert(run > 4 && run < 7, 'run ' + run.toFixed(2));
  tap('KeyC');
  const z1 = w.feet().z;
  holdKey('KeyW', 60);
  const crouch = z1 - w.feet().z;
  assert(crouch > 1 && crouch < 3, 'crouch ' + crouch.toFixed(2));
  tap('KeyC');
  engine.input.setKey('ShiftLeft', true);
  const z2 = w.feet().z;
  holdKey('KeyW', 40);
  engine.input.setKey('ShiftLeft', false);
  const sprint = (z2 - w.feet().z) / (40 / 60);
  assert(sprint > 6, 'sprint ' + sprint.toFixed(2));
  const y0 = w.feet().y;
  tap('Space');
  engine.step(8, DT);
  assert(w.feet().y > y0 + 0.2, 'jump');
  w.teleport(300, -120);
  engine.step(5, DT);
  const zw = w.feet().z;
  holdKey('KeyW', 60);
  const wade = zw - w.feet().z;
  assert(wade > 1.5 && wade < 3.5, 'wade ' + wade.toFixed(2));
});

test('guns fever surgery rescue finish', async () => {
  await boot();
  const w = game.world;
  w.startMission('m2');
  w.lines = [];
  const worn = w.spawnGroundGun('mule');
  assert(worn.cond >= 20 && worn.cond <= 55, 'ground cond ' + worn.cond);
  w.teleport(200, -200);
  engine.step(1, DT);
  w.giveGun('m38', 0.4);
  arm('m38');
  const before = w.guns.length;
  tapFire();
  assert(!w.guns.some((g) => g.id === 'm38'), 'cond 0 kept the gun');
  assert(w.guns.length === before - 1, 'slot not emptied');
  w.giveGun('tractor', 100);
  arm('tractor');
  w.jamScript = 5;
  w.noJam = false;
  holdFire(40);
  const jammed = w.guns.find((g) => g.id === 'tractor');
  assert(jammed.jammed, 'did not jam');
  const shots = jammed.shots;
  holdFire(20);
  assert(jammed.shots === shots, 'jammed gun fired');
  for (let n = 0; n < 5 && jammed.jammed; n++) tap('KeyR');
  assert(!jammed.jammed, 'reload did not clear jam');
  const civil = w.actors.find((a) => a.kind === 'civil');
  const hp = civil.hp;
  placeFacing(civil.x, civil.z);
  arm('tractor');
  holdFire(20);
  assert(civil.alive && civil.hp === hp && civil.fleeing, 'civilian was killed');
  w.tablets = 1;
  w.stones = 50;
  w.feverT = 0.05;
  w.feverOn = false;
  engine.step(5, DT);
  assert(w.feverOn, 'fever did not start');
  holdKey('KeyH', 80);
  assert(!w.feverOn || w.feverClear > 0, 'tablet did not clear fever');
  w.feverOn = true;
  w.feverClear = 0;
  w.feverIgnore = 0;
  w.tablets = 0;
  w.stones = 50;
  engine.step(26 * 60, DT);
  assert(w.stones <= 40.01, 'ignore did not cost stones ' + w.stones);
  w.hp = 15;
  tap('KeyQ');
  assert(w.surgeryT > 0, 'no surgery');
  engine.step(5 * 60, DT);
  assert(w.hp >= 40, 'surgery hp ' + w.hp);
  w.startMission('m3');
  w.lines = [];
  w.hp = 1;
  w.hurt(50, 'bullet', true);
  assert(w.rescueT > 0, 'no rescue');
  engine.step(4 * 60, DT);
  assert(w.hp >= 40 && w.rescueT <= 0, 'rescue failed ' + w.hp + ' t ' + w.rescueT);
  w.deadBuddies.clear();
  assert(w.startMission('m6'), 'm6 missing');
  assert(w.currentStep().do === 'lines', 'm6 did not open on its line');
  tap('Enter');
  assert(w.currentStep()?.do === 'goto', 'm6 line did not advance ' + w.currentStep()?.do);
  const field = siteById('long-field');
  w.teleport(field.x, field.z);
  engine.step(2, DT);
  assert(w.currentStep()?.do === 'burn', 'm6 goto did not finish ' + w.currentStep()?.do);
  lightCurrentBurn();
  assert(w.currentStep()?.do === 'buddy-down', 'm6 burn did not reach the down ' + w.currentStep()?.do);
  const down = w.buddies.find((b) => b.alive && b.down);
  assert(down && down.burning === false, 'knockBuddy forced the buddy to burn');
  assert(down.view && down.view.parent === game.ctx.scene, 'downed buddy has no rig');
  engine.step(1, DT);
  assert(w.prompt === 'SYRETTE OR FINISH IT', 'campaign prompt ' + w.prompt);
  assert(w.syrettes > 0, 'campaign down had no syrette');
  const sid = down.id;
  const syretteBefore = w.syrettes;
  tap('KeyE');
  const up = w.buddies.find((b) => b.id === sid);
  assert(up && !up.down && up.hp > 0 && w.syrettes === syretteBefore - 1, 'syrette through knockBuddy failed');
  assert(w.syrettes === 0, 'a syrette was left after the campaign down');
  w.knockBuddy();
  const down2 = w.buddies.find((b) => b.alive && b.down);
  assert(down2 && down2.burning === false, 'second knockBuddy burned the buddy');
  engine.step(1, DT);
  assert(w.prompt === 'FINISH IT', 'empty syrette prompt ' + w.prompt);
  const fid = down2.id;
  tap('KeyE');
  assert(w.deadBuddies.has(fid) && w.syrettes === 0, 'finish-it did not record the death');
  const live = w.buddies.find((b) => b.alive && !b.down);
  w.syrettes = 1;
  w.downBuddy(live.id, { burning: true });
  engine.step(1, DT);
  assert(w.prompt === 'FINISH IT', 'a burning down still offered a syrette');
  tap('KeyE');
  assert(w.deadBuddies.has(live.id) && w.syrettes === 1, 'a burning down used the syrette');
});

test('map while driving and sliders', async () => {
  await boot();
  const w = game.world;
  w.startMission('m1');
  engine.step(2, DT);
  assert(!w.inVehicle, 'map walk started in the truck');
  tap('KeyM');
  engine.step(30, DT);
  assert(w.map.up && w.map.anim > 0.9, 'map did not rise on foot ' + w.map.anim);
  assertHeldMap(w, 'walking');
  w.teleport(80, 120);
  engine.step(2, DT);
  const zFoot = w.feet().z;
  engine.input.setKey('KeyW', true);
  engine.step(20, DT);
  engine.input.setKey('KeyW', false);
  assert(Math.abs(w.feet().z - zFoot) > 0.2, 'world paused while walking with the map');
  assertHeldMap(w, 'walking');
  tap('KeyM');
  engine.step(30, DT);
  assert(!w.map.up && w.map.anim < 0.02, 'map stayed up');
  w.teleport(16, 55);
  engine.step(1, DT);
  tap('KeyE');
  assert(w.inVehicle, 'did not enter');
  const z0 = w.feet().z;
  engine.input.setKey('KeyW', true);
  engine.input.setKey('KeyM', true);
  engine.step(20, DT);
  engine.input.setKey('KeyM', false);
  engine.input.setKey('KeyW', false);
  assert(w.map.up && w.inVehicle, 'map not held while driving');
  assertHeldMap(w, 'driving');
  assert(w.feet().z !== z0, 'world paused on the map');
  const cx = w.map.cx;
  engine.input.setPointer(0, 0, false);
  engine.step(1, DT);
  engine.input.setPointer(0.02, -0.01, false);
  engine.step(2, DT);
  assert(w.map.cx !== cx, 'cursor did not move');
  tap('KeyE');
  assert(w.waypoint, 'no waypoint');
  w.spawnSoldier({ x: 20, z: 20, faction: 'concord' });
  const soldier = w.actors.find((a) => a.kind === 'soldier' && a.alive);
  const maxBefore = soldier.max;
  game.applySlider('enemyHealth', 2);
  assert(TUNING.enemyHealth === 2 && soldier.max === maxBefore * 2, 'enemy health slider');
  game.applySlider('vehicleTopSpeed', 40);
  assert(w.car.o.topSpeed === 40, 'top speed slider');
  game.applySlider('playerSpeed', 2);
  assert(TUNING.playerSpeed === 2, 'player speed');
  for (const key of SLIDER_KEYS) {
    const [a, b] = TUNING_RANGES[key];
    game.applySlider(key, a);
    assert(TUNING[key] === a, key + ' low');
    game.applySlider(key, b);
    assert(TUNING[key] === b, key + ' high');
  }
  game.resetSliders();
  for (const key of SLIDER_KEYS) assert(TUNING[key] === TUNING_DEFAULTS[key], 'reset ' + key);
  assert(w.car.o.topSpeed === TUNING_DEFAULTS.vehicleTopSpeed, 'reset speed');
  const civil = w.actors.find((a) => a.kind === 'civil' && a.alive);
  assertRig(civil, 'civilian');
  assertRig(soldier, 'soldier');
  const merc = w.spawnSoldier({ id: 'merc-proof', x: 500, z: 500, faction: 'merc' });
  merc.kind = 'merc';
  assertRig(merc, 'merc');
});

test('story both endings', async () => {
  await boot();
  game.world.deadBuddies.clear();
  const chain = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5'];
  for (const id of chain) playMission(id);
  const burntBefore = game.world.fire.burntCount;
  playMission('m6', { dead: ['dov'] });
  assert(game.world.deadBuddies.has('dov'), 'dead buddy was not kept');
  assert(game.world.fire.burntCount > burntBefore, 'story scar missing');
  playMission('m7');
  playMission('m8');
  playMission('m9', { picks: [0, 0] });
  assert(game.world.ledger.killed >= 1, 'shoot choice did not pay a kill');
  assert(game.world.sheet === 'walk', 'walk sheet ' + game.world.sheet);
  playMission('end', { sheet: 'walk' });
  assert(game.ending === 'walk', 'walk card ' + game.ending);
  assert(game.world.deadBuddies.has('dov'), 'dead buddy lost before the ending');
  playMission('end', { sheet: 'give', dead: ['ines'] });
  assert(game.ending === 'give', 'give card');
  assert(game.world.deadBuddies.has('ines'), 'second ending had no dead buddy');
  assert(game.world.ledger.moved > 0, 'nobody moved');
  assert(game.world.ledger.stonesEarned > 0, 'no stones');
  assert(game.world.ledger.friends >= 1, 'no friends lost');
});

test('solo round', async () => {
  await boot();
  game.toTitle();
  game.startSolo();
  const round = game.world.round;
  const seat = round.seat(0);
  const merc = round.seats.find((s) => s.ai);
  const startHp = merc.hp;
  arm('tractor');
  for (let n = 0; n < 10 && !merc.down; n++) {
    const foe = game.world.actors.find((a) => a.seat === merc.id);
    if (!foe) break;
    placeFacing(foe.x, foe.z);
    holdFire(10);
  }
  assert(merc.hp < startHp, 'friendly fire did nothing ' + merc.hp);
  assert(merc.down, 'merc did not drop ' + merc.hp);
  game.world.teleport(merc.x, merc.z + 1);
  engine.step(1, DT);
  holdKey('KeyE', 200);
  assert(!merc.down && merc.hp > 0, 'revive failed');
  const box = round.cases.find((c) => !c.taken && !c.carrier);
  game.world.teleport(box.x, box.z);
  engine.step(1, DT);
  tap('KeyE');
  assert(seat.carrying === box.id, 'did not pick up');
  game.world.hurt(500, 'bullet', true);
  assert(round.localDown && box.carrier == null && !box.taken, 'down did not drop the case');
  game.session.emit('time-up');
  assert(game.session.ended, 'time-up did not finish');
  const standings = game.session.outcome.standings;
  assert(Array.isArray(standings) && standings.length > 0, 'no standings');
  assert(game.session.outcome.stats[0].Stones != null, 'no stats');
});

test('menus attract pause touch', async () => {
  await boot();
  game.toTitle();
  game.idle = 0;
  game.attract = false;
  game.mode = 'title';
  game.screen = 'title';
  const saves = game.saves;
  engine.step(600, DT);
  assert(!game.attract && game.idle < 10.01, 'attract early ' + game.idle);
  engine.step(1, DT);
  assert(game.attract && game.state().attract, 'attract did not start');
  engine.step(70 * 60, DT);
  assert(engine.errors.length === 0, 'attract errors');
  tap('KeyE');
  assert(!game.attract && game.screen === 'title', 'attract exit ' + game.screen);
  assert(game.saves === saves, 'attract wrote a save');
  game.screen = 'settings';
  game.mode = 'menu';
  game.idle = 0;
  engine.step(700, DT);
  assert(!game.attract, 'attract on settings');
  game.toTitle();
  tap('Enter');
  assert(game.screen === 'menu', 'title confirm');
  const labels = game.items().map((item) => item.label);
  assert(labels.includes('HOST ON THIS COMPUTER') === false, 'host is not on the root menu');
  game.screen = 'cash';
  const cash = game.items().map((item) => item.id);
  assert(cash.includes('host') && cash.includes('join') && cash.includes('solo'), 'link menu missing');
  game.screen = 'menu';
  game.mode = 'menu';
  game.focus = game.items().findIndex((item) => item.id === 'settings');
  tap('Enter');
  assert(game.screen === 'settings', 'settings');
  game.focus = game.items().findIndex((item) => item.id === 'glyphs');
  tap('Enter');
  assert(game.glyphSet === 'xbox', 'glyphs');
  game.world.startMission('m2');
  tap('Escape');
  assert(engine.timeScale === 0 && game.mode === 'pause', 'pause');
  const clock = game.world.clock;
  engine.step(30, DT);
  assert(game.world.clock === clock, 'pause stepped the sim');
  const dev = game.items().some((item) => item.id === 'dev');
  assert(dev, 'dev mode hidden');
  game.focus = game.items().findIndex((item) => item.id === 'dev');
  tap('Enter');
  assert(game.screen === 'dev' && game.items().length > 9, 'dev list ' + game.items().length);
  game.focus = 10;
  const windowTop = Math.max(0, game.focus - 6);
  const activated = [];
  const activate = game.activate.bind(game);
  game.activate = (item) => {
    activated.push(item && item.id);
    activate(item);
  };
  clickHud(86);
  assert(game.focus === windowTop, 'scrolled click focused ' + game.focus + ' wanted ' + windowTop);
  assert(activated[0] === game.items()[windowTop].id, 'scrolled click activated ' + activated[0]);
  const resetAt = game.items().findIndex((item) => item.id === 'reset-sliders');
  game.focus = resetAt;
  const resetRow = resetAt - Math.max(0, resetAt - 6);
  game.applySlider('wearRate', TUNING_RANGES.wearRate[1]);
  assert(TUNING.wearRate === TUNING_RANGES.wearRate[1], 'wear slider');
  clickHud(86 + resetRow * 16);
  assert(game.focus === resetAt, 'reset click focused ' + game.focus);
  assert(TUNING.wearRate === TUNING_DEFAULTS.wearRate, 'reset click missed the drawn row');
  engine.input.setPointer(0, 1, false);
  game.focus = game.items().findIndex((item) => item.id === 'back');
  tap('Enter');
  assert(game.screen === 'pause', 'dev did not return to pause');
  game.focus = game.items().findIndex((item) => item.id === 'about');
  tap('Enter');
  assert(game.screen === 'about', 'about from pause');
  const flat = aboutPages().flat().join('\n');
  for (const bit of ['2026-11-05 01:39:17', 'Far Cry 2', 'PLAN.md', 'added on import', 'Pixel Engine, MIT', 'Inspired by Far Cry 2; not affiliated']) {
    assert(flat.includes(bit), 'about missing ' + bit);
  }
});

const touch = test;
touch('touch gate', async () => {
  const g = createGame({ touchOnly: true });
  const e = await Engine.headless(g, { seed: 2 });
  assert(g.notice === 'Controller or keyboard required', g.notice);
  assert(g.items().length === 1 && g.items()[0].id === 'settings', 'touch menu');
  e.step(601, DT);
  assert(g.attract, 'touch blocked attract');
  g.exitAttract();
  g.focus = 0;
  e.input.setPointer(0, 1 - (86 / 270) * 2, true);
  e.input.setButtons(1);
  e.step(1, DT);
  e.input.setButtons(0);
  e.step(1, DT);
  assert(g.screen === 'settings', 'tap did not open settings ' + g.screen);
});

const picked = tests.filter((t) => !only || t.name.includes(only));
let failed = 0;
for (const t of picked) {
  try {
    await t.fn();
  } catch (err) {
    failed += 1;
    if (engine) {
      engine.timeScale = 1;
      release();
    }
    const msg = String(err && err.stack || err).split('\n').filter((line) => line.length < 240).slice(0, 8).join('\n');
    console.log('FAIL ' + t.name + '\n' + msg);
  }
}
console.log('passed ' + (picked.length - failed) + ' failed ' + failed);
process.exit(failed ? 1 : 0);
