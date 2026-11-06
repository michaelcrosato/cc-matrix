// The bus: it arrives in seconds, the ride is a skippable scene, Hester sings your recent life.
import { THREE, buildModel, toonMaterial, PALETTE, setLookLayer } from '../engine.js';
import { Place } from '../world/place.js';
import { MODELS } from '../art/models.js';
import { Actor } from '../actors/rig.js';
import { CRITTER_DEFS } from '../art/critter.js';
import { BALLAD } from '../data/dialogue/hosts.js';
import { LANDMARKS } from '../data/town.js';
import { CITY_BUS_STOP } from '../world/city.js';
import { say } from './say.js';
import { hostLine } from './lines.js';
import { resolveTags } from './lines.js';
import { melodyNotes } from '../audio/composer.js';
import { noteFrequency } from '../engine.js';
import { drawText, panel, wrap, textWidth } from '../ui/draw.js';
import { remember } from './memory.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { Stream } from '../core/rng.js';
import { leafFor } from '../world/town.js';

const { BoxGeometry, Group, Mesh } = THREE;
const box = (w, h, d, c, x = 0, y = 0, z = 0) => { const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[c])); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

/** A rocking bus, cut away, with the countryside going past. */
export class BusPlace extends Place {
  constructor(g) {
    super('bus', 'room', { ox: 1500, oz: 0, name: 'The Bus' });
    this.g = g;
    this.def = { name: 'The Bus', exit: null, dim: false, w: 14, d: 8 };
    this.w = 14; this.d = 8;
    this.camZoom = 2.1;
    this.outdoors = true;
    this.music = 'bus';
    this.scenery = new Group();
    this.group.add(this.scenery);
    this.bodyGroup = new Group();
    this.group.add(this.bodyGroup);
    const b = this.bodyGroup;
    b.add(box(9, 0.2, 3, 'navy', 0, 0.6, 0));
    b.add(box(9, 1.9, 0.14, 'sky', 0, 1.6, -1.45));
    b.add(box(0.14, 1.9, 3, 'sky', -4.5, 1.6, 0));
    b.add(box(0.14, 0.7, 3, 'sky', 4.5, 1.0, 0));
    for (const x of [-3.1, -1.4, 0.4, 2.1]) { const win = box(1.3, 0.8, 0.08, 'cyan', x, 1.95, -1.4); b.add(win); }
    this.glass = b.children.filter((c) => c.material?.color?.getHex?.() === PALETTE.cyan);
    for (const x of [-3, -1.2, 0.6]) { b.add(box(1, 0.5, 0.6, 'plum', x, 0.95, -0.95)); b.add(box(1, 0.8, 0.14, 'red', x, 1.3, -1.25)); }
    b.add(box(0.8, 0.5, 0.6, 'night', 3.2, 0.95, -0.3));
    b.add(box(0.1, 0.6, 0.6, 'ink', 3.95, 1.3, -0.3));
    for (const x of [-3, 3]) for (const z of [-1.5, 1.5]) { const w = box(1, 1, 0.3, 'ink', x, 0.5, z); w.userData.wheel = true; b.add(w); }
    this.hester = new Actor(CRITTER_DEFS.hester, { name: 'hester', seed: 8 });
    this.hester.x = 3.2; this.hester.z = -0.3; this.hester.y = 0.72; this.hester.facing = Math.PI / 2;
    this.hester.root.removeFromParent();
    this.hester.hasShadow = false;
    b.add(this.hester.root);
    this.hester.play('Sit', 0);
    this.trees = [];
    this.ground = box(80, 0.3, 30, 'green', 0, -0.15, -8);
    this.group.add(this.ground);
    this.road = box(80, 0.04, 5, 'slate', 0, 0.02, 0);
    this.group.add(this.road);
    this.rockT = 0;
    this.speed = 7;
    this.group.visible = false;
    this.rain = false;
  }
  height() { return 0.72; }
  blocked() { return true; }
  surfaceAt() { return null; }
  setScene(season, cal, { night = false } = {}) {
    this.scenery.clear();
    this.trees.length = 0;
    this.ground.material = toonMaterial([PALETTE.lime, PALETTE.green, PALETTE.sand, PALETTE.white][season]);
    const rng = new Stream(`bus-scene:${season}`);
    for (let i = 0; i < 26; i++) {
      const kind = rng.chance(0.6) ? 'pine' : 'pear';
      const leaf = leafFor(season, cal, kind);
      const t = buildModel(kind === 'pine' ? 'tree-pine' : 'tree-pear', { catalog: MODELS, palette: { leaf: leaf.leaf, leaf2: leaf.leaf2 } }).object;
      const fruit = t.getObjectByName('fruit');
      if (fruit) fruit.visible = false;
      const x = rng.range(-30, 30), z = rng.range(-16, -3.4);
      t.position.set(x, 0, z);
      this.scenery.add(t);
      this.trees.push(t);
    }
    this.night = night;
  }
  enter(g) { this.light = g.ctx.lights.request({ position: [1501, 3, 0], color: 0xffd9a0, intensity: 14, radius: 11, name: 'bus' }); }
  leave() { this.light?.release(); this.light = null; }
  update(dt, t) {
    this.rockT += dt;
    this.bodyGroup.rotation.z = Math.sin(this.rockT * 3.1) * 0.012 + Math.sin(this.rockT * 7.3) * 0.004;
    this.bodyGroup.position.y = Math.abs(Math.sin(this.rockT * 5.3)) * 0.03;
    for (const tr of this.trees) { tr.position.x -= dt * this.speed * (1 + tr.position.z * -0.03); if (tr.position.x < -32) tr.position.x += 62; }
    this.hester.update(dt);
    if (Math.floor(this.rockT * 4) % 2 === 0 && this.rockT % 0.25 < dt) this.g.sound('busEngine', { volume: 0.05 });
  }
  interactables() { return []; }
}
/** Pick verses from memory events. */
export function ballad(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:ballad:${w.clock.day}:${w.stats.busRides ?? 0}`);
  const mems = w.memory.slice(-16).reverse();
  const verses = [];
  const seen = new Set();
  const take = (key, extra = {}) => { if (!seen.has(key) && BALLAD[key] && verses.length < 2) { seen.add(key); verses.push({ key, lines: BALLAD[key].map((l) => resolveTags(l, g, { neighbour: 'someone', item: 'thing', catch: 'fish', beans: '300', ...extra })) }); } };
  for (const m of mems) {
    const n = m.about ? (NEIGHBOURS[m.about]?.short ?? NEIGHBOURS[m.about]?.name) : 'someone';
    if (m.k === 'boot') take('boot');
    else if (m.k === 'catch' || m.k === 'bigCatch') take('catch', { catch: m.catch, beans: '300' });
    else if (m.k === 'gift') take('gift', { neighbour: n, item: m.item });
    else if (m.k === 'bonk') take('bonk', { neighbour: n });
    else if (m.k === 'debtTier') take('home');
    else if (m.k === 'wish') take('wish');
    else if (m.k === 'fashion') take('fashion');
    else if (m.k === 'letter') take('letter');
  }
  if (w.npcs.rocco.moved !== 'here') take('rocco');
  const fill = s.shuffle(['debt', 'mayor', 'store', 'city', 'fish', 'weather', 'lonely', 'friend', 'home2', 'rain']);
  for (const k of fill) take(k, { neighbour: NEIGHBOURS[s.pick(['dorrit', 'tavi', 'nib', 'yolanda'])].name });
  verses.push({ key: 'chorus', lines: BALLAD.chorus });
  return verses;
}
const midiOf = (noteName) => { const f = noteFrequency(noteName); return f ? 69 + 12 * Math.log2(f / 440) : null; };
class BalladOverlay {
  constructor(lines) { this.id = 'ballad'; this.modal = true; this.line = ''; this.lines = lines; }
  update() {}
  draw(g, hud) {
    if (!this.line) return;
    const parts = wrap(this.line, 400);
    const h = parts.length * 12 + 12;
    panel(hud, 32, 212 - h + 30, 416, h, { fill: 'white', trim: 'sky' });
    parts.forEach((p, i) => drawText(hud, 240, 212 - h + 37 + i * 12, p, { align: 'center', color: 'ink' }));
    drawText(hud, 46, 212 - h + 22, 'Hester', { color: 'navy', shadow: 'white' });
  }
  currentText() { return this.line; }
  prompts() { return [['confirm', 'Skip']]; }
}
/** The ride itself. */
export function* busRide(g, to) {
  const w = g.world;
  g.sound('busHorn');
  g.ui.toastMsg('You wait. The bus arrives in seconds. It always does. It is always late.');
  yield 1.6;
  w.stats.busRides = (w.stats.busRides ?? 0) + 1;
  g.events.emit('busBoard', { to });
  const bus = g.busPlace ??= new BusPlace(g);
  g.ctx.scene.add(bus.group);
  bus.setScene(g.season, g.calendarDay);
  yield* g.travel(bus, 0, 0, 0, { kind: 'iris', sound: 'busBrake' });
  // Sit in a seat in the rocking body
  const p = g.player;
  p.remove();
  bus.bodyGroup.add(p.root);
  p.x = -1.2; p.z = -0.8; p.y = 0.86; p.facing = Math.PI * 0.5; p.turnTo = null;
  p.sitting = true;
  p.play('Sit', 0);
  g.camFocus = { x: 0, y: 1.2, z: 0 };
  g.camTeleport();
  g.hideHud = true;
  const verses = ballad(g);
  const overlay = new BalladOverlay(verses);
  g.ui.push(overlay);
  bus.hester.play('Talk', 0.2);
  const notes = melodyNotes('bus').filter((n) => n !== '.' && n !== '-');
  let ni = 0;
  let skip = false;
  const allLines = verses.flatMap((v) => v.lines);
  g.events.emit('ballad', { verses: verses.map((v) => v.key) });
  for (const line of allLines) {
    overlay.line = line;
    let shown = 0;
    const clean = line.replace(/♪/g, '').trim();
    const stepT = 0.13;
    for (const ch of clean) {
      if (/[a-z]/i.test(ch) && shown % 2 === 0) {
        const m = midiOf(notes[ni++ % notes.length]) ?? 60;
        g.voice.sing(ch, 'hester', m);
        bus.hester.talkAmp = 1;
      }
      shown++;
      let t = 0;
      const dt = 0.04;
      while (t < stepT * 0.42) {
        t += g.engine.manual ? 1 / 60 : 1 / 60;
        yield;
        if (g.inp.confirm || g.inp.back || g.inp.mouse.click) skip = true;
        if (skip) break;
      }
      if (skip) break;
    }
    if (skip) break;
    yield 0.25;
  }
  g.ui.pop(overlay);
  bus.hester.play('Sit', 0.2);
  g.hideHud = false;
  p.sitting = false;
  p.remove();
  bus.group.add(p.root);
  if (to === 'city') {
    yield* g.travel(g.city, CITY_BUS_STOP[0], CITY_BUS_STOP[1], Math.PI / 2, { kind: 'iris', sound: 'busBrake' });
    remember(g, 'city', {});
    g.events.emit('arrivedCity', {});
    if (!w.flags.cityFirst) { w.flags.cityFirst = true; yield* say(g, 'hester', 'Big City. Mind your pockets. Mind your hair. Mind everything. I\'ll be here. I\'m always here.'); }
  } else {
    yield* g.travel(g.town, LANDMARKS.busStop[0], LANDMARKS.busStop[1], 0, { kind: 'iris', sound: 'busBrake' });
    g.events.emit('arrivedTown', {});
  }
  g.autosave();
}
export { hostLine, textWidth, setLookLayer };
