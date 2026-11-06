// The attract loop: after 10 quiet seconds on the title, a looping AI-played demo on a throwaway save.
// It cheats freely. Any input exits, at once. Its only job is to show as much as possible.
import { newWorld } from '../core/save.js';
import { drawText, panel } from '../ui/draw.js';
import { installWorld } from '../systems/newgame.js';
import { dailyRespawn } from '../systems/flow.js';
import { rebuildAllObjects } from '../world/objectsView.js';
import { villageDay } from '../core/calendar.js';
import { LANDMARKS, BUILDINGS } from '../data/town.js';
import { CITY_BUS_STOP } from '../world/city.js';
import { busRide, BusPlace } from '../systems/bus.js';
import { typeLine, hostLine } from '../systems/lines.js';
import { Dialogue } from '../ui/dialogue.js';
import { nameOf } from '../systems/say.js';
import { CLOTHES } from '../data/clothes.js';
import { ITEMS } from '../data/items.js';
import { titleScreen } from '../ui/screens/title.js';
import { drawLogo } from '../ui/screens/title.js';
import { FISH } from '../data/fish.js';
import { THREE, toonMaterial, PALETTE, buildModel } from '../engine.js';
import { MODELS } from '../art/models.js';

// Beats of 6-10 s, 2-3 minutes a loop.
const BEAT_STRETCH = 2.1;
export class AttractMode {
  constructor(g) { this.g = g; this.running = false; this.tune = null; this.t = 0; this.script = null; this.savedPlace = null; }
  start() {
    const g = this.g;
    g.ui.popAll();
    g.mode = 'attract';
    this.running = true;
    this.t = 0;
    this.loops = (this.loops ?? 0) + 1;
    const w = newWorld(777 + this.loops, { demo: true });
    w.player.name = 'Pip'; w.player.town = 'Far Enough';
    w.player.look.hair = 3; w.player.look.hairColor = 'orange'; w.player.look.outfit = 'plainRed'; w.player.look.hatItem = 'strawHat';
    w.player.tools = ['net', 'rod', 'shovel', 'axe', 'can', 'slingshot'];
    w.player.beans = 999999;
    w.story.stage = 'free';
    w.flags.shackRoof = true;
    w.player.homeTier = 2;
    w.museum.open = true;
    g.demo = true;
    this.goDay(1, 10);
    g.world = w;
    installWorld(g, w);
    dailyRespawn(g);
    rebuildAllObjects(g.town);
    g.events.emit('attractStart', {});
    this.beat = 0;
    this.scene = this.play();
    this.wait = 0;
    this.scriptDone = false;
    g.camFocus = null;
    g.music.refresh();
  }
  goDay(day, hour) {
    const g = this.g;
    if (!g.world) return;
    g.world.clock.day = day;
    g.world.clock.minute = hour * 60;
    g.weatherKey = null;
    g.lastHour = -1;
  }
  /** Any input exits to the title at once. */
  stop() {
    const g = this.g;
    if (!this.running) return;
    this.running = false;
    g.scripts.cancelAll();
    g.ui.popAll();
    g.engine.screen.set('iris', 0);
    g.inTransition = false;
    g.hideHud = false;
    g.music.setOverride(null);
    this.tune = null;
    for (const m of this.extra ?? []) m.removeFromParent();
    this.extra = [];
    g.player.sitting = false;
    g.player.poseTimer = 0;
    g.player.poseClip = null;
    g.player.locked = false;
    g.events.emit('attractStop', {});
    g.goTitle();
  }
  fixedStep(dt) { if (this.running) this.walk(dt); }
  walk(dt) {
    const g = this.g;
    const p = g.player;
    if (!this.dest) { p.speed = 0; return; }
    const dx = this.dest.x - p.x, dz = this.dest.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) { this.dest = null; p.speed = 0; return; }
    const sp = this.dest.speed ?? 4.2;
    p.x += (dx / d) * sp * dt; p.z += (dz / d) * sp * dt; // no clip: it may cheat
    p.y = g.place.height(p.x, p.z);
    p.speed = sp;
    p.turnTo = Math.atan2(dx, dz);
  }
  update(dt) {
    const g = this.g;
    if (!this.running) return;
    // Any input (key, button, stick, mouse move, tap) exits at once.
    if (g.inp.any) { this.stop(); return; }
    if (this.wait > 0) { this.wait -= dt; return; }
    const r = this.scene.next();
    if (r.done) { this.scene = this.play(); return; }
    if (typeof r.value === 'number') this.wait = r.value > 0.5 ? r.value * BEAT_STRETCH : r.value;
  }
  say(who, text, dur = 3) {
    const g = this.g;
    g.ui.popAll();
    const d = new Dialogue({ who, name: nameOf(who), voice: who, beats: [text] });
    d.update = function (gg, inp, dt) { this.timer += dt * 40; while (this.timer >= 1 && this.shown < this.total) { this.timer -= 1; const ch = this.seq[this.pos++]; if (!ch) break; if (ch.beat) continue; this.shown++; if (ch.c !== ' ') { gg.voice.syllable(ch.c, this.voice, text); const a = gg.actorOf(this.who); if (a && /[aeiou]/i.test(ch.c)) a.talkAmp = 1; } } };
    g.ui.push(d);
    return dur;
  }
  iris() { const g = this.g; g.engine.screen.cover('iris', { duration: 0.2 }); return 0.22; }
  reveal() { this.g.engine.screen.reveal('iris', { duration: 0.2 }); }
  moveTo(place, x, z, facing = 0) { this.g.swapPlace(place, x, z, facing); }
  setDay(day, hour) { this.goDay(day, hour); this.g.refreshSeason(true); this.g.sky.placeChanged(); this.g.life.resetDay(); this.g.festivals.resetDay(); this.g.npcs.scatter(); }
  *play() {
    const g = this.g;
    const town = g.town;
    const p = g.player;
    const w = g.world;
    // Tree shake
    this.tune = null;
    this.setDay(1, 10);
    this.moveTo(town, 52, 11, Math.PI);
    const treeKey = Object.keys(w.town.objects).find((k) => w.town.objects[k].k === 'tree' && w.town.objects[k].kind === 'pear');
    const [tx, tz] = treeKey.split(',').map(Number);
    p.x = tx + 0.5; p.z = tz + 1.5; p.facing = Math.PI;
    g.camTeleport();
    p.pose('ShakeTree');
    yield 0.3;
    g.life.shakeTree(treeKey, w.town.objects[treeKey]);
    yield 2;
    // Butterfly
    p.hold('tool-net');
    p.play('NetReady', 0.1);
    this.moveTo(town, 18, 26, 0);
    const butterfly = g.life.addBug(g.life.bugs[0]?.def ?? { id: 'cabbageButterfly', name: 'Butterfly', kind: 'flier', color: 'white', spot: 'flower', beans: 90, line: '' }, 19.5, 27, null);
    yield 1;
    p.pose('NetSweep');
    g.sound('netSwing');
    yield 0.3;
    g.life.catchBug(butterfly);
    p.pose('HoldUp', 1.4);
    g.sound('reveal');
    yield 2;
    // Cast and catch
    p.hold('tool-rod');
    this.moveTo(town, 37.2, 22, Math.PI / 2);
    p.pose('Cast');
    g.sound('cast');
    yield 0.5;
    g.life.bobberMesh.visible = true;
    g.life.bobberMesh.position.set(40, -0.2, 22);
    g.sound('plop');
    yield 1.4;
    g.sound('nibble');
    g.life.bobberMesh.position.y = -0.3;
    yield 0.9;
    g.life.bobberMesh.position.y = -0.5;
    g.sound('bite');
    g.ctx.particles.burst('splash', [40, -0.15, 22]);
    yield 0.5;
    g.life.bobberMesh.visible = false;
    p.pose('HoldUp', 1.4);
    g.sound('reveal');
    yield this.say('player', 'You caught a pike! Someone should tell it about the other end of the hook.', 2.4);
    g.ui.popAll();
    // Fossil
    p.hold('tool-shovel');
    this.moveTo(town, 25, 30, 0);
    p.pose('Dig');
    g.sound('dig');
    g.ctx.particles.burst('dirt', [25, 0.2, 31]);
    yield 1.6;
    p.pose('HoldUp', 1.2);
    g.sound('reveal');
    yield 1.6;
    // Neighbour chat with voice
    p.hold(null);
    const n = g.npcs.get('bartleby');
    n.inside = false; n.setPos(30, 35); g.npcs.syncVisibility(n); n.held = true;
    const t = g.npcs.get('tavi');
    t.inside = false; t.setPos(28, 35); g.npcs.syncVisibility(t); t.held = true;
    this.moveTo(town, 29, 37, Math.PI);
    t.actor.play('Wave', 0.1, { once: true });
    yield this.say('tavi', 'I smiled at a rock today and I think it\'s going really well, isn\'t it?!', 3.2);
    yield this.say('bartleby', "You're standing in my good spot. No, there isn't another one. I'd prefer not.", 3.2);
    g.ui.popAll();
    n.held = false; t.held = false;
    // Store
    yield this.iris();
    const store = g.rooms.get('store');
    this.moveTo(store, 6, 4.8, Math.PI);
    this.reveal();
    store.host?.play('Honk', 0.1, { once: true });
    g.sound('honk');
    yield this.say('gander', 'No rush on the payment, dear. I\'ve simply noted the time you didn\'t pay, and I\'ll be noting it again tomorrow.', 3.6);
    g.ui.popAll();
    // Furnishing
    yield this.iris();
    w.home.rooms.main.items.push({ id: 'cottageSofa', x: 2, z: 1, rot: 0, on: true }, { id: 'cottageLamp', x: 1, z: 1, rot: 0, on: true }, { id: 'cottageRug', x: 3, z: 3, rot: 0, on: true }, { id: 'cottageTable', x: 3, z: 3, rot: 0, on: true }, { id: 'mossyPlant', x: 6, z: 1, rot: 0, on: true }, { id: 'stereo', x: 7, z: 1, rot: 0, on: true });
    const home = g.rooms.get('home');
    home.rebuild();
    this.moveTo(home, 4, 5.5, Math.PI);
    this.reveal();
    yield 2.5;
    p.play('Dance', 0.2);
    yield 2;
    // Museum donation
    yield this.iris();
    w.museum.fish = Object.fromEntries(FISH.slice(0, 12).map((f) => [f.id, true]));
    const aq = g.rooms.get('museum_fish');
    this.moveTo(aq, 6, 5.4, Math.PI);
    this.reveal();
    yield 3;
    // Summer lanterns and fireworks
    yield this.iris();
    this.setDay(8, 20);
    this.moveTo(town, 37, 26, Math.PI / 2);
    g.festivals.launchLanterns('red');
    for (const d of g.festivals.lanternData) d.t += 0.5;
    this.reveal();
    this.tune = 'festivalSummer';
    g.music.refresh();
    yield 3.4;
    this.moveTo(town, 36, 52, 0);
    g.camFocus = { x: 40, y: 2, z: 54 };
    g.camTeleport();
    for (let i = 0; i < 4; i++) { g.sound('fireworkBurst'); g.ctx.particles.burst('firework', [34 + i * 4, 11 + (i % 2) * 3, 62], { colors: [['red', 'sand', 'white'], ['sky', 'white', 'cyan'], ['lime', 'sand', 'white'], ['plum', 'orange', 'sand']][i] }); yield 0.9; }
    g.camFocus = null;
    this.tune = null;
    // The bus singing
    yield this.iris();
    g.music.setOverride('bus');
    const bus = g.busPlace ??= new BusPlace(g);
    g.ctx.scene.add(bus.group);
    bus.setScene(g.season, g.calendarDay);
    g.swapPlace(bus, 0, 0, 0);
    p.remove();
    bus.bodyGroup.add(p.root);
    p.x = -1.2; p.z = -0.8; p.y = 0.86; p.facing = Math.PI / 2;
    p.sitting = true;
    p.play('Sit', 0);
    g.camFocus = { x: 0, y: 1.2, z: 0 };
    g.camTeleport();
    this.reveal();
    bus.hester.play('Talk', 0.2);
    yield this.say('hester', '♪ Oh, you fished up an old boot and you sold it for ten, and you\'d do it, you\'d do it, you\'d do it again… ♪', 3.8);
    g.ui.popAll();
    p.sitting = false;
    p.remove();
    bus.group.add(p.root);
    // City neon
    yield this.iris();
    this.goDay(10, 21);
    g.sky.placeChanged();
    this.moveTo(g.city, 12, 11, 0);
    g.music.setOverride('cityNight');
    this.reveal();
    this.dest = { x: 26, z: 11, speed: 3.4 };
    yield 4;
    // Salon, auction paddle
    yield this.iris();
    const salon = g.rooms.get('salon');
    this.moveTo(salon, 4, 3.4, 0);
    this.reveal();
    g.music.setOverride('salon');
    g.sound('scissors');
    yield this.say('fleece', 'Monsieur! Madame! Whichever! Your hair, it speaks to me, and it is begging.', 2.6);
    g.ui.popAll();
    yield this.iris();
    const auc = g.rooms.get('auction');
    this.moveTo(auc, 5, 5.2, Math.PI);
    this.reveal();
    g.music.setOverride('auction');
    p.play('Paddle', 0.05, { once: true });
    g.sound('paddle');
    yield this.say('pemberton', 'Going-once-going-twice-do-I-hear-more-oh-you\'re-serious-SOLD!', 2.2);
    g.sound('gavel');
    g.ui.popAll();
    g.music.setOverride(null);
    // Soup
    yield this.iris();
    this.setDay(12, 13);
    this.moveTo(town, 25, 44, Math.PI);
    this.tune = 'festivalAutumn';
    g.music.refresh();
    this.reveal();
    yield this.say('dorrit', 'That\'s a soup, mmhm. That\'s the soup. I\'ve waited my whole life.', 3);
    g.ui.popAll();
    // Snowman
    yield this.iris();
    this.setDay(14, 11);
    this.tune = null;
    g.music.refresh();
    w.town.objects['26,30'] = { k: 'snowman', ratio: 0.72, good: true };
    town.dirty.add('26,30');
    this.moveTo(town, 26, 33, Math.PI);
    this.reveal();
    p.play('Wave', 0.1, { once: true });
    yield 3;
    // Long Night
    yield this.iris();
    this.setDay(16, 23.9);
    const [px, pz] = LANDMARKS.oldPear;
    w.flags.pearLit = true;
    town.seasonBuilt = -1;
    g.refreshSeason(true);
    this.moveTo(town, px + 0.5, pz + 4.6, Math.PI);
    g.camFocus = { x: px, y: 2.4, z: pz + 1 };
    g.camTeleport();
    this.tune = 'festivalWinter';
    g.music.refresh();
    for (const [i, id] of ['dorrit', 'tavi', 'bartleby', 'ottoline', 'nib', 'yolanda', 'ozzie'].entries()) { const a = (i / 7) * Math.PI * 2; const nn = g.npcs.get(id); nn.inside = false; nn.setPos(px + Math.cos(a) * 4, pz + 1 + Math.sin(a) * 4); g.npcs.syncVisibility(nn); nn.overrideClip = 'Sway'; nn.actor.faceToward(px, pz); }
    this.reveal();
    yield 5;
    for (const nn of g.npcs.all()) nn.overrideClip = null;
    // Logo, and round again
    g.camFocus = null;
    this.showLogo = true;
    this.tune = 'title';
    g.music.refresh();
    yield 3.5;
    this.showLogo = false;
    g.world = newWorld(777 + (++this.loops), { demo: true });
    const nw = g.world;
    nw.player.name = 'Pip'; nw.player.look = { ...w.player.look };
    nw.player.tools = w.player.tools;
    nw.player.beans = 999999; nw.flags.shackRoof = true; nw.player.homeTier = 2; nw.museum.open = true;
    installWorld(g, nw);
    dailyRespawn(g);
    rebuildAllObjects(g.town);
    this.reveal();
  }
  drawHud(hud) {
    const g = this.g;
    if (g.mode !== 'attract') return;
    if (this.showLogo) drawLogo(g, hud);
    const on = Math.floor(g.ctx.time * 1.6) % 2 === 0;
    panel(hud, 12, 12, 40, 16, { fill: 'red', trim: 'orange' });
    drawText(hud, 32, 17, 'DEMO', { align: 'center', color: 'white' });
    if (on) {
      const text = g.opts.touchOnly ? 'Controller or keyboard required' : 'Press anything to play';
      const w = text.length * 6 + 14;
      panel(hud, 240 - w / 2, 244, w, 16, { fill: 'navy', trim: 'sky' });
      drawText(hud, 240, 249, text, { align: 'center', color: 'white' });
    }
  }
}
export { villageDay, BUILDINGS, CITY_BUS_STOP, busRide, typeLine, hostLine, CLOTHES, ITEMS, titleScreen, THREE, toonMaterial, PALETTE, buildModel, MODELS };
