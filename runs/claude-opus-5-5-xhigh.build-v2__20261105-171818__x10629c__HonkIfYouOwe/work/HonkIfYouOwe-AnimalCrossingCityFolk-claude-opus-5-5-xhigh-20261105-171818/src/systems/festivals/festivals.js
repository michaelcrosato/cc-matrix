// Four festivals and three contests. Each is a full-village set piece with its own music.
import { THREE, toonMaterial, PALETTE, buildModel, glowMaterial, noteFrequency } from '../../engine.js';
import { MODELS } from '../../art/models.js';
import { LANDMARKS, BUILDINGS } from '../../data/town.js';
import { NEIGHBOUR_ORDER, NEIGHBOURS } from '../../data/neighbours.js';
import { say, ask, narrate } from '../say.js';
import { ITEMS, FLOWER_COLORS } from '../../data/items.js';
import { addItem, hasRoom, removeSlot, addBeans } from '../economy.js';
import { sendMail } from '../mail.js';
import { Stream, dayStream } from '../../core/rng.js';
import { drawText, panel, textWidth, bar } from '../../ui/draw.js';
import { pocketsPicker } from '../../ui/screens/pockets.js';
import { keyboardFlow } from '../../ui/screens/keyboard.js';
import { Menu } from '../../ui/ui.js';
import { playChime, chimeScene } from '../bell.js';
import { townScore, townRating } from '../townRating.js';
import { creditsScreen, yearAlmanac } from '../../ui/screens/credits.js';
import { FISH, FISH_LEN } from '../../data/fish.js';
import { BUGS } from '../../data/bugs.js';
import { melodyNotes } from '../../audio/composer.js';
import { PATTERN_COLORS } from '../patterns.js';
import { tileChar, tileInfo } from '../../world/tiles.js';
import { hourNow } from '../time.js';
import { gainFriend } from '../talk.js';

const { Group, Mesh, BoxGeometry, InstancedMesh, Object3D, Color } = THREE;
const TOSS_TIME = 90;
const DERBY_NAMES = { derby: 'the Fishing Derby', bugOff: 'the Bug-Off', snowman: 'the Snowman Contest' };
const FEST_NAMES = { seedToss: 'The Seed Toss', lanternFloat: 'The Lantern Float', greatSoup: 'The Great Soup', longNight: 'The Long Night' };
const STAGES = [[20, 36], [28, 36], [18, 44], [24, 45], [30, 44], [20, 40], [28, 41], [25, 35]];
const dummy = new Object3D();

/** Pure: neighbour scores from the same rules as yours. */
export function contestScores(seed, kind, day) {
  const s = new Stream(`${seed}:contest:${kind}:${day}`);
  const ids = ['rocco', 'dorrit', 'tavi', 'ottoline', 'bartleby', 'nib', 'ozzie', 'yolanda'];
  const out = {};
  for (const id of ids) {
    if (kind === 'derby') { let best = 0; const n = s.int(2, 6); for (let i = 0; i < n; i++) { const f = s.pick(FISH.filter((x) => x.seasons.includes(1))); best = Math.max(best, fishLength(f, s)); } out[id] = best; }
    else if (kind === 'bugOff') { let sum = 0; const n = s.int(2, 7); for (let i = 0; i < n; i++) { const b = s.pick(BUGS.filter((x) => x.seasons.includes(2))); sum += b.beans; } out[id] = sum; }
    else { const ratio = s.range(0.4, 1); const big = s.range(0.6, 1.4); out[id] = snowmanPoints(ratio, big); }
  }
  return out;
}
export const fishLength = (f, s) => Math.round((FISH_LEN[f.size ?? 'S'] + s.range(-0.05, 0.1)) * 100);
export const snowmanPoints = (ratio, big) => Math.max(0, Math.round(100 - Math.abs(ratio - 0.72) * 200 - Math.abs(big - 1.1) * 40));

export class Festivals {
  constructor(g) {
    this.g = g;
    this.deco = new Group();
    g.town.group.add(this.deco);
    this.rings = [];
    this.lanterns = null;
    this.active = null; // the running set piece
    this.props = new Group();
    g.town.group.add(this.props);
    this.seedMeshes = [];
    this.fireworks = [];
    this.potBuilt = null;
  }
  /** Rebuild the plaza for today. */
  resetDay() {
    const g = this.g;
    this.active = null;
    this.deco.clear();
    this.props.clear();
    this.rings = [];
    this.potBuilt = null;
    this.lanterns = null;
    const c = g.cal;
    this.today = c.festival;
    this.contest = c.contest;
    if (c.festival || c.contest) this.buildDeco(c.festival ?? c.contest);
    if (c.festival === 'greatSoup') this.buildPot();
    if (c.festival === 'longNight') g.world.flags.lightsDoors ??= {};
  }
  buildDeco(kind) {
    const colors = { seedToss: ['lime', 'white', 'sand'], lanternFloat: ['sky', 'plum', 'sand'], greatSoup: ['orange', 'red', 'sand'], longNight: ['white', 'sky', 'mist'], derby: ['sky', 'white', 'navy'], bugOff: ['lime', 'plum', 'orange'], snowman: ['white', 'sky', 'red'] }[kind] ?? ['red', 'sand', 'white'];
    const addRow = (x0, z0, x1, z1) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const m = new Mesh(new BoxGeometry(0.4, 0.5, 0.06), toonMaterial(PALETTE[colors[i % colors.length]]));
        m.position.set(x0 + (x1 - x0) * t, 3.1 - Math.sin(t * Math.PI) * 0.4, z0 + (z1 - z0) * t);
        if (Math.abs(x1 - x0) < 0.1) m.rotation.y = Math.PI / 2;
        this.deco.add(m);
      }
    };
    addRow(16.5, 33.5, 32, 33.5); addRow(16.5, 47, 32, 47); addRow(16.5, 33.5, 16.5, 47); addRow(32, 33.5, 32, 47);
    for (const [x, z] of [[16.5, 33.5], [32, 33.5], [16.5, 47], [32, 47]]) { const p = new Mesh(new BoxGeometry(0.14, 3.2, 0.14), toonMaterial(PALETTE.plum)); p.position.set(x, 1.6, z); this.deco.add(p); }
  }
  holdsNpc(id) { return this.active?.gather?.includes(id) ?? false; }
  pose(id) { return this.active?.gather?.includes(id) ? (this.active.clip ?? 'Sway') : null; }
  music() {
    const g = this.g;
    if (this.active?.tune) return this.active.tune;
    const c = g.cal;
    if (g.place !== g.town) return null;
    const near = g.player.x > 10 && g.player.x < 40 && g.player.z > 28 && g.player.z < 50;
    if (c.festival && near) return { seedToss: 'festivalSpring', lanternFloat: 'festivalSummer', greatSoup: 'festivalAutumn', longNight: 'festivalWinter' }[c.festival];
    if (c.contest && near && this.contestState()?.joined && !this.contestState()?.finished) return 'contest';
    return null;
  }
  interactables() {
    const g = this.g;
    const out = [];
    if (g.place !== g.town) return out;
    const c = g.cal;
    const h = hourNow(g.world);
    const w = g.world;
    const [dx, dz] = LANDMARKS.soupPot;
    if (c.festival === 'seedToss' && !w.festivals[this.key('seedToss')] && h >= 9) out.push({ id: 'fest', x: dx, z: dz, r: 2, label: 'Join the Seed Toss', act: 'festSeedToss' });
    if (c.festival === 'lanternFloat' && !w.festivals[this.key('lanternFloat')]) {
      if (h >= 17) out.push({ id: 'fest', x: 37, z: 25, r: 3, label: 'Set a lantern on the river', act: 'festLantern' });
      else out.push({ id: 'fest', x: dx, z: dz, r: 2, label: 'Ask about the Lantern Float', act: 'festHint', hint: 'At dusk, go to the north bridge and set a lantern on the river. Fireworks over the beach at nine. Tavi has been awake since Tuesday.' });
    }
    if (c.festival === 'greatSoup' && !w.festivals[this.key('greatSoup')]) out.push({ id: 'fest', x: dx, z: dz, r: 2.4, label: 'Add to the Great Soup', act: 'festSoup' });
    if (c.festival === 'longNight') {
      const st = w.flags.lightsDoors ?? {};
      if (!w.festivals[this.key('longNight')] && h >= 16) {
        for (const b of BUILDINGS) {
          if (b.id === 'home' || b.id === 'museum' || b.id === 'hall' || b.id === 'store' || b.id === 'mothwick') continue;
          if (!st[b.id]) out.push({ id: `lights:${b.id}`, x: b.door[0], z: b.door[1] + 0.2, r: 1.7, label: 'Hang a string of lights', act: 'festLights', building: b });
        }
        const [px, pz] = LANDMARKS.oldPear;
        const done = Object.keys(st).length;
        if (w.clock.minute >= 23.5 * 60 || w.clock.minute < 60 || done >= 4) out.push({ id: 'pearEnd', x: px + 2, z: pz + 1.2, r: 2.4, label: 'Gather at the Old Pear', act: 'festFinale' });
        else out.push({ id: 'pearEnd', x: px + 2, z: pz + 1.2, r: 2.4, label: 'The Old Pear, at midnight', act: 'festHint', hint: `Carry the lights to each neighbour's door. You've done ${done}. Then gather here at midnight.` });
      }
    }
    if (c.contest) out.push({ id: 'contest', x: dx, z: dz, r: 2, label: this.contestState()?.finished ? `Results: ${DERBY_NAMES[c.contest]}` : `Enter ${DERBY_NAMES[c.contest]}`, act: 'contestDesk' });
    return out;
  }
  key(id) { return `${id}:${this.g.world.clock.year}:${this.g.world.clock.day}`; }
  contestState() { const c = this.g.cal; return c.contest ? this.g.world.contests[this.key(c.contest)] : null; }
  onHour(hour) {
    const g = this.g;
    const c = g.cal;
    if (c.contest && hour === 13) { const st = this.contestState(); if (st?.joined && !st.finished) g.scripts.run(this.finishContest(), { name: 'contestEnd' }); }
  }
  onCaught(def) {
    const st = this.contestState();
    if (!st?.joined || st.finished) return;
    const g = this.g;
    const c = g.cal.contest;
    if (c === 'derby' && ITEMS[def.id]?.cat === 'fish') { const len = fishLength(def, new Stream(`${g.world.seed}:len:${g.world.stats.fish}`)); st.score = Math.max(st.score, len); g.ui.toastMsg(`${def.name}: ${len} cm.`); }
    else if (c === 'bugOff' && ITEMS[def.id]?.cat === 'bug') { st.score += def.beans; g.ui.toastMsg(`${def.name}: ${def.beans} points.`); }
  }
  onSnowman(ratio, big) {
    const st = this.contestState();
    if (!st?.joined || st.finished || this.g.cal.contest !== 'snowman') return;
    st.score = Math.max(st.score, snowmanPoints(ratio, big));
    st.bartleby = ratio <= 0.55 ? 'The head is very small. I\'d prefer not.' : ratio >= 0.85 ? 'The head is nearly the size of the body. I\'d prefer not.' : 'It has adequate proportions. I\'d prefer not to say so.';
    this.g.ui.toastMsg(`Your snowman: ${st.score} points.`);
  }
  *finishContest() {
    const g = this.g;
    const w = g.world;
    const kind = g.cal.contest;
    const st = this.contestState();
    if (!st || st.finished) return;
    st.finished = true;
    const scores = contestScores(w.seed, kind, w.clock.day);
    const list = Object.entries(scores).map(([id, s]) => ({ id, s })).sort((a, b) => b.s - a.s);
    const beat = list.filter((x) => x.s > st.score).length;
    const place = beat + 1;
    st.results = list.slice(0, 3);
    st.place = place;
    if (kind === 'derby') { const t = list[0]; yield* narrate(g, `The Derby's over! Longest fish by anyone else: ${NEIGHBOURS[t.id].name}, ${t.s} cm. Yours: ${st.score} cm. You came ${ordinal(place)}.`); }
    else if (kind === 'bugOff') { const t = list[0]; yield* narrate(g, `The Bug-Off's over! Best score by anyone else: ${NEIGHBOURS[t.id].name}, ${t.s}. Yours: ${st.score}. You came ${ordinal(place)}.`); }
    else {
      yield* say(g, 'bartleby', st.bartleby ?? "I've been asked to judge. I'd prefer not. | You didn't make one. That's the best one so far.");
      yield* say(g, 'bartleby', `Fine. ${NEIGHBOURS[list[0].id].name} got ${list[0].s}. You got ${st.score}. That's ${ordinal(place)}. I'd prefer not to discuss it.`);
    }
    g.events.emit('contestDone', { kind, place, score: st.score, top: list });
    if (place <= 3) {
      w.stats.contestsWon += 1;
      const trophy = { derby: 'trophyGold', bugOff: 'trophyBug', snowman: 'trophySnow' }[kind];
      sendMail(g, { from: 'clementine', body: `Dear {player},\nYou came ${ordinal(place)} in ${DERBY_NAMES[kind]}. There's a trophy. The bee has been polishing it. She didn't need to.\nClementine`, gift: place === 1 ? trophy : 'boxedGift' });
    }
  }
  // ---- Seed Toss -----------------------------------------------------------------------------------
  *seedToss() {
    const g = this.g;
    const w = g.world;
    yield* say(g, 'tavi', ["It's the Seed Toss! You throw the seeds at the rings! Everything grows! Isn't it?!", "Use your tool button to fling a seed where you're facing. Ninety seconds. Go go go, isn't it?!"]);
    const st = { kind: 'seedToss', t: TOSS_TIME, hits: 0, npcHits: 0, gather: NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here'), clip: 'Slingshot', tune: 'festivalSpring', planted: [] };
    this.active = st;
    this.rings = [];
    const rng = dayStream(w, 'rings');
    for (const [x, z] of [[21, 37], [27, 37], [19, 43], [24, 42], [29, 42], [25, 46]]) {
      const r = buildModel('chalk-ring', { catalog: MODELS }).object;
      r.position.set(x, 0.02, z);
      this.props.add(r);
      this.rings.push({ x, z, r: 1, color: rng.int(0, 4), hits: 0 });
    }
    st.gather.forEach((id, i) => { const n = g.npcs.get(id); const [x, z] = STAGES[i % STAGES.length]; n.setPos(x, z); n.inside = false; g.npcs.syncVisibility(n); n.state = 'idle'; n.timer = TOSS_TIME + 5; n.path = null; n.actor.faceToward(24, 41); });
    g.player.x = 24; g.player.z = 39.5;
    g.scripts.setFree('festSeedToss', true);
    while (st.t > 0) {
      st.t -= 1 / 60;
      yield;
      if (st.throwCool > 0) st.throwCool -= 1 / 60;
      const inp = g.inp;
      if ((inp.useTool || inp.mouse.rclick || inp.confirm) && !(st.throwCool > 0)) {
        st.throwCool = 0.35;
        const p = g.player;
        p.play('Slingshot', 0.05, { once: true, speed: 2 });
        p.poseTimer = 0.2;
        const hp = g.interact.hoverPoint;
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const tx = hp && inp.mouse.rclick ? hp.x : p.x + fx * 4, tz = hp && inp.mouse.rclick ? hp.z : p.z + fz * 4;
        g.sound('seedThrow');
        this.throwSeed(p.x, p.z, tx, tz, true);
      }
      // Everyone else flings too
      st.npcT = (st.npcT ?? 1) - 1 / 60;
      if (st.npcT <= 0) {
        st.npcT = 0.7;
        const id = rng.pick(st.gather);
        const a = g.npcs.actor(id);
        const ring = rng.pick(this.rings);
        this.throwSeed(a.x, a.z, ring.x + rng.range(-1.2, 1.2), ring.z + rng.range(-1.2, 1.2), false);
        a.play('Slingshot', 0.05, { once: true });
        g.npcs.get(id).emoting = true;
      }
    }
    g.scripts.setFree('festSeedToss', false);
    this.props.clear();
    this.active = null;
    g.events.emit('seedTossDone', { hits: st.hits });
    w.festivals[this.key('seedToss')] = { hits: st.hits };
    // The town blooms next morning in the pattern you sowed
    for (const [x, z, color, sp] of st.planted) { const k = `${x},${z}`; if (!w.town.objects[k] && tileInfo(tileChar(x, z)).walk && !g.town.solid[z * 80 + x]) w.town.objects[k] = { k: 'flower', species: sp, color, wet: 0, wilt: 0, sown: true }; g.town.dirty.add(k); }
    yield* narrate(g, `Time! You hit the rings ${st.hits} times. There are seeds in everything now. There are seeds in Bartleby.`);
    yield* this.mayorArrives();
    addBeans(g, st.hits * 60, 'festival');
    g.sound('beanLots');
    g.ui.toastMsg(`The village is grateful. +${st.hits * 60} beans.`);
    for (const id of st.gather) gainFriend(g, id, 3);
  }
  throwSeed(x0, z0, x1, z1, mine) {
    const g = this.g;
    const m = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), toonMaterial(PALETTE.sand));
    m.position.set(x0, 1, z0);
    this.props.add(m);
    this.seedMeshes.push({ m, x0, z0, x1, z1, t: 0, mine });
  }
  updateSeeds(dt) {
    const g = this.g;
    const st = this.active;
    for (const s of this.seedMeshes.slice()) {
      s.t += dt * 2.2;
      const t = Math.min(1, s.t);
      s.m.position.set(s.x0 + (s.x1 - s.x0) * t, 1 + Math.sin(t * Math.PI) * 2.0 - t, s.z0 + (s.z1 - s.z0) * t);
      if (t >= 1) {
        s.m.removeFromParent();
        this.seedMeshes.splice(this.seedMeshes.indexOf(s), 1);
        const ring = this.rings.find((r) => Math.hypot(r.x - s.x1, r.z - s.z1) < 1.05);
        if (ring) {
          ring.hits++;
          g.ctx.particles.burst('sparkle', [s.x1, 0.3, s.z1], { count: 8, colors: [FLOWER_COLORS[ring.color], 'white', 'lime'] });
          const fm = buildModel('flower', { catalog: MODELS, params: { species: ring.color % 4, big: 1 }, palette: { petal: FLOWER_COLORS[ring.color] } }).object;
          fm.position.set(s.x1, 0, s.z1);
          this.props.add(fm);
          if (s.mine && st) { st.hits++; g.sound('seedHit'); st.planted.push([Math.floor(s.x1), Math.floor(s.z1), ring.color, ring.color % 4]); g.events.emit('seedHit', { hits: st.hits }); }
        }
      }
    }
  }
  *mayorArrives() {
    const g = this.g;
    const w = g.world;
    if (w.flags.ribbonGone) return;
    const t = g.life.trundle;
    const [rx, rz] = LANDMARKS.ribbon;
    t.x = rx - 1.2; t.z = rz;
    g.camFocus = { x: rx - 1, y: 1, z: rz };
    g.life.placeSpecials();
    g.events.emit('mayorArrives', {});
    yield 0.8;
    yield* say(g, 'trundle', ["And so… at last… I declare this…", "… | Has anyone… | There was… a ribbon."]);
    w.flags.ribbonGone = true;
    w.flags.mayorArrived = true;
    g.life.ribbon.visible = false;
    yield* narrate(g, 'A very small breeze goes through the plaza. The two posts stand there. There has not been a ribbon on them for some time.');
    yield* say(g, 'tavi', "Is it over? Did we win? It's going really well, isn't it?!");
    yield* say(g, 'trundle', ["Well. | Well, well. | I'll just… start back."]);
    g.camFocus = null;
  }
  // ---- Lantern Float -----------------------------------------------------------------------------
  *lanternFloat() {
    const g = this.g;
    const w = g.world;
    const colors = ['red', 'sand', 'sky', 'lime', 'plum'];
    let chosen = -2;
    const items = colors.map((c, i) => ({ label: `${c[0].toUpperCase()}${c.slice(1)} lantern`, action: (gg, m) => { chosen = i; gg.ui.pop(m); } }));
    g.ui.push(new Menu({ id: 'lanternPick', title: 'Pick a lantern', items, x: 150, y: 70, w: 180, back: (gg, m) => { chosen = -1; gg.ui.pop(m); } }));
    while (chosen === -2) yield;
    if (chosen < 0) return;
    const wish = yield* keyboardFlow(g, { title: 'Make a wish, one line', max: 40, hint: 'Nobody will read this. Clementine will read this.', random: ['Less debt', 'More soup', 'A good chair', 'Bartleby waves back', 'To be asked', 'A second go at Tuesday'] });
    const fest = { lanternColor: colors[chosen], wish };
    w.festivals[this.key('lanternFloat')] = fest;
    sendMail(g, { from: 'wish', body: `Dear {player},\nYou wished for "${wish}".\nWe have received your lantern. It's in the sea now, with the others. We are looking into it. Don't get your hopes up. Do, a bit.\nThe Sea`, gift: 'driftBottle', arriveDay: w.clock.day + 1 });
    g.player.pose('PickUp', 0.6);
    yield 0.4;
    g.sound('plop');
    this.launchLanterns(colors[chosen]);
    const st = { kind: 'lantern', gather: NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here'), clip: 'Sway', tune: 'festivalSummer' };
    this.active = st;
    st.gather.forEach((id, i) => { const n = g.npcs.get(id); n.setPos(34 + i * 0.7, 26.5 + (i % 3)); n.inside = false; g.npcs.syncVisibility(n); n.state = 'idle'; n.path = null; n.actor.faceToward(40, 26); });
    g.events.emit('lanternSet', { color: colors[chosen] });
    yield* narrate(g, 'You set it on the water. It wobbles. It goes. All along the bank people are doing the same, and nobody says anything for a while. Hundreds of lights go by, down to the sea.');
    if (w.clock.minute < 21 * 60) w.clock.minute = 20.8 * 60;
    this.fireworksFrom = 0;
    g.camFocus = { x: 40, y: 2, z: 53 };
    g.player.x = 34; g.player.z = 50; g.player.y = 0;
    g.camTeleport();
    yield* say(g, 'nib', "They're on their way. Everything's on its way, or so the moon says.");
    yield* this.fireworkShow();
    g.camFocus = null;
    this.active = null;
    g.events.emit('lanternDone', {});
  }
  launchLanterns(mine) {
    const g = this.g;
    const count = 240;
    const geo = new BoxGeometry(0.34, 0.34, 0.34);
    const mesh = new InstancedMesh(geo, glowMaterial(PALETTE.white), count);
    const colors = [PALETTE.sand, PALETTE.orange, PALETTE.red, PALETTE.sky, PALETTE.plum, PALETTE.lime];
    const rng = dayStream(g.world, 'lanterns');
    this.lanternData = [];
    const c = new Color();
    for (let i = 0; i < count; i++) {
      const t = -rng.range(0, 1.4);
      this.lanternData.push({ t, off: rng.range(-1.4, 1.4), speed: rng.range(0.018, 0.03), phase: rng.range(0, 6) });
      c.setHex(i === 0 ? PALETTE[mine] : rng.pick(colors));
      mesh.setColorAt(i, c);
    }
    mesh.frustumCulled = false;
    this.props.add(mesh);
    this.lanterns = mesh;
    this.lanternLight = g.ctx.lights.request({ position: [40, 1.5, 30], color: 0xffcd75, intensity: 8, radius: 16 });
  }
  updateLanterns(dt) {
    const m = this.lanterns;
    if (!m) return;
    // The river's course, north bridge to the sea
    const path = [[39.5, 20], [39.5, 32], [43.5, 34], [43.5, 48], [43.5, 62]];
    for (let i = 0; i < this.lanternData.length; i++) {
      const d = this.lanternData[i];
      d.t += d.speed * dt;
      const t = Math.max(0, d.t);
      const seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
      const f = Math.min(1, t * (path.length - 1) - seg);
      const [ax, az] = path[seg], [bx, bz] = path[seg + 1];
      const x = ax + (bx - ax) * f + d.off * (az === bz ? 0 : 1);
      const z = az + (bz - az) * f;
      dummy.position.set(x, d.t < 0 ? -9 : -0.12 + Math.sin(this.g.ctx.time * 2 + d.phase) * 0.02, z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (this.lanternLight) this.lanternLight.position.set(this.g.player.x, 1.6, this.g.player.z - 2);
  }
  *fireworkShow() {
    const g = this.g;
    const w = g.world;
    const n = 7;
    for (let i = 0; i < n; i++) {
      g.sound('fireworkLaunch');
      yield 0.7;
      const x = 30 + i * 3.6, y = 12 + (i % 3) * 2, z = 62;
      if (i === 3 && w.patterns[w.player.pattern ?? 0]) { this.patternFirework(x, y, z, w.patterns[w.player.pattern ?? 0]); g.events.emit('patternFirework', {}); }
      else { const cols = [['red', 'sand', 'white'], ['sky', 'white', 'cyan'], ['lime', 'sand', 'white'], ['plum', 'orange', 'sand']][i % 4]; g.ctx.particles.burst('firework', [x, y, z], { colors: cols }); }
      g.sound('fireworkBurst');
      g.rumble(0.35, 150);
      g.engine.screen.flash('white', { duration: 0.05 });
      yield 0.8;
    }
  }
  patternFirework(x, y, z, data) {
    const g = this.g;
    // Your pattern, sixteen by sixteen, burst in the sky
    for (let j = 0; j < 16; j += 1) for (let i = 0; i < 16; i += 1) {
      const c = PATTERN_COLORS[data[j * 16 + i]];
      g.ctx.particles.burst({ count: [1, 1], life: [1.1, 1.6], speed: [0, 0.05], gravity: 0.25, size: [2, 2], colors: [c], spread: 180 }, [x + (i - 8) * 0.55, y + (8 - j) * 0.55, z]);
    }
  }
  // ---- Great Soup ------------------------------------------------------------------------------
  buildPot() {
    const [x, z] = LANDMARKS.soupPot;
    const pot = buildModel('soup-pot', { catalog: MODELS }).object;
    pot.position.set(x, 0, z);
    this.props.add(pot);
    this.potBuilt = pot;
    this.potSoup = pot.getObjectByName('soup');
    const dorrit = this.g.npcs.get('dorrit');
    if (dorrit && !dorrit.inside) { dorrit.setPos(x - 1.5, z + 1); }
  }
  *greatSoup() {
    const g = this.g;
    const w = g.world;
    yield* say(g, 'dorrit', ["This is the big pot, mmhm. Everyone adds something. You add three. Fish, fruit, a mushroom, a boot. Anything that's been outdoors, mmhm."]);
    const put = [];
    for (let n = 0; n < 3; n++) {
      let picked = -2;
      g.ui.push(pocketsPicker(g, { title: `Add to the soup (${n + 1} of 3)`, filter: (s) => { const it = ITEMS[s.id]; return ['fish', 'fruit', 'bug', 'cheese', 'flower'].includes(it?.cat) || s.id === 'soupGift'; }, onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
      while (picked === -2) yield;
      if (picked < 0) { if (!put.length) return; break; }
      const slot = removeSlot(g, picked);
      put.push(slot.id);
      g.player.pose('Give', 0.5);
      g.sound('plop');
      g.ctx.particles.burst('splash', [LANDMARKS.soupPot[0], 2, LANDMARKS.soupPot[1]], { count: 8, colors: ['orange', 'sand'] });
      yield 0.4;
      g.sound('stir');
    }
    const result = rateSoup(put);
    w.festivals[this.key('greatSoup')] = { put, ...result };
    w.stats.soupRating = result.rating;
    const gather = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here');
    this.active = { kind: 'soup', gather, clip: 'Eat', tune: 'festivalAutumn' };
    gather.forEach((id, i) => { const n = g.npcs.get(id); const [x, z] = STAGES[i % STAGES.length]; n.setPos(x, z); n.inside = false; g.npcs.syncVisibility(n); n.state = 'idle'; n.path = null; n.actor.faceToward(25, 41); });
    g.events.emit('soupRated', result);
    yield 1;
    const taste = result.good
      ? [['dorrit', "That's a soup, mmhm. That's the soup. I've waited my whole life. I'll have a little more."], ['bartleby', "It's… | I'd prefer not to say how good this is."], ['ottoline', "It's almost good enough for me, darling dear. I'll have a bucket."], ['tavi', "It's so good! Everything is so good! But this is *actually* good, isn't it?!"]]
      : [['dorrit', "Mmhm. | Mmhm… | I've had worse. I've made worse. Not on purpose, mmhm."], ['bartleby', "What did you put in this. | No. I'd prefer not."], ['ozzie', "This is what they want. This is what they've been working toward. You didn't hear it from me."], ['tavi', "It's so… chewy! I love it! I'm going to go and lie down, isn't it?!"]];
    for (const [id, line] of taste) if (w.npcs[id]?.moved === 'here') yield* say(g, id, line);
    if (result.good) {
      addBeans(g, 2000, 'soup');
      g.sound('beanLots');
      for (const id of gather) gainFriend(g, id, 5);
      yield* narrate(g, `A proper feast. Everyone eats too much. The soup is rated ${result.rating} out of 10. You get 2,000 beans, and a look of respect from a wombat.`);
    } else {
      w.flags.queasyDay = w.clock.day + 1;
      sendMail(g, { from: 'dorrit', body: 'Dear {player},\nEveryone is still in bed, mmhm. I thought you should have this.\nDorrit', gift: 'queasyGift' });
      yield* narrate(g, `A hush falls. The soup is rated ${result.rating} out of 10. Everyone's a bit green tomorrow, you suspect. Nobody says it was you. Everybody knows it was you.`);
    }
    this.active = null;
  }
  // ---- Long Night ------------------------------------------------------------------------------
  *hangLights(t) {
    const g = this.g;
    const w = g.world;
    const b = t.building;
    w.flags.lightsDoors[b.id] = true;
    g.player.pose('Wave', 0.6);
    yield 0.3;
    g.sound('star');
    const [x, z] = b.door;
    for (let i = 0; i < 6; i++) {
      const m = new Mesh(new BoxGeometry(0.14, 0.14, 0.14), glowMaterial([PALETTE.sand, PALETTE.red, PALETTE.lime, PALETTE.sky][i % 4]));
      m.position.set(x - 1.4 + i * 0.56, 2.4 + Math.sin(i * 1.2) * 0.1, z - 0.36);
      this.props.add(m);
    }
    const id = Object.keys(NEIGHBOURS).find((n) => NEIGHBOURS[n].building === b.id && w.npcs[n].moved === 'here');
    if (id) {
      yield* say(g, id, `${w.npcs[id].friend >= 40 ? 'You came!' : 'Oh.'} It's cold. Here. It's not much. It's the Long Night, you have to give someone something. It's the rules.`);
      if (hasRoom(w)) { const s = new Stream(`${w.seed}:longgift:${id}`); const gift = s.pick(['seedRose', 'pear', 'shellConch', 'mushroom', 'stationery', 'bobbleHat', 'knitted']); addItem(g, gift, { from: id }); g.sound('pickUp'); }
      gainFriend(g, id, 4);
    }
    g.events.emit('lightsHung', { id: b.id });
  }
  *finale() {
    const g = this.g;
    const w = g.world;
    const [px, pz] = LANDMARKS.oldPear;
    const gather = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here');
    w.clock.minute = 23.99 * 60;
    if (w.flags.roccoVisit && w.npcs.rocco.moved !== 'here') gather.push('rocco');
    this.active = { kind: 'longNight', gather, clip: 'Sway', tune: 'festivalWinter' };
    gather.forEach((id, i) => { const n = g.npcs.get(id); const a = (i / gather.length) * Math.PI * 2; n.setPos(px + Math.cos(a) * 4, pz + 1 + Math.sin(a) * 4); n.inside = false; n.actor.visible = true; if (n.actor.root.parent !== g.town.group) n.actor.addTo(g.town.group); n.state = 'idle'; n.path = null; n.actor.faceToward(px, pz); });
    g.camFocus = { x: px, y: 2, z: pz + 1 };
    g.player.x = px + 0.5; g.player.z = pz + 4.6; g.player.y = 0; g.player.facing = Math.PI;
    g.camTeleport();
    g.events.emit('longNightGather', {});
    yield 0.8;
    // Rocco rolls in
    if (w.npcs.rocco.moved !== 'here' || w.flags.roccoVisit) {
      const r = g.npcs.get('rocco');
      r.overrideClip = 'RoccoRoll';
      const a = r.actor;
      a.visible = true;
      a.x = px - 14; a.z = pz + 5; a.y = 0; a.facing = Math.PI / 2;
      for (let i = 0; i < 80; i++) { a.x += 0.14; yield; }
      r.overrideClip = null;
      a.play('Idle', 0.2);
      w.flags.roccoCame = true;
      g.events.emit('roccoReturned', {});
      yield* say(g, 'rocco', ["Did I miss it?! I rolled from the City! It's four hundred miles! It's forty! I had a sit-down! Let's roll!", "…Nib! You did your laps! You've got no laps! I'm so proud! Let's… I missed you all. Let's roll."]);
    }
    w.flags.pearLit = true;
    if (g.town.oldPearLights) g.town.oldPearLights.visible = true;
    g.sound('star');
    g.events.emit('pearLit', {});
    const light = g.ctx.lights.request({ position: [px, 4, pz], color: 0xffcd75, intensity: 16, radius: 16, priority: 5 });
    yield 0.8;
    // The Bell plays your Chime, harmonised
    g.ctx.audio.playMusic(null);
    g.music.current = null;
    g.music.suspend = 6;
    yield* chimeScene(g, { harmonise: true, step: 0.28 });
    g.events.emit('chimeHarmonised', {});
    yield 0.5;
    const r = townRating(g);
    yield* say(g, 'clementine', ["I'll read the town rating, since it's the end of something. | The bee wrote it.", ...r.lines]);
    if (r.score >= 70) {
      w.town.bellGold = true;
      g.town.bell.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === PALETTE.orange) m.material = toonMaterial(0xffd76a); });
      g.sound('debtPaid');
      g.events.emit('bellGold', {});
      yield* narrate(g, 'There is a sound like a very old coin being turned over, and the Old Bell goes gold. Nobody can say how. Mrs. Gander writes something down.');
    }
    yield* narrate(g, "Nobody says happy anything. It's not that sort of village. Somebody hands you a bowl.");
    yield* say(g, 'gander', g.world.player.debt > 0 ? `You still owe ${g.world.player.debt.toLocaleString('en-US')} beans, dear. | Do have a lovely evening.` : 'You owe me nothing, dear. | I shall be thinking about that for some time.');
    w.festivals[this.key('longNight')] = { score: r.score };
    w.flags.yearDone = true;
    light.release();
    this.active = null;
    g.camFocus = null;
    if (w.npcs.rocco.moved !== 'here') g.npcs.syncVisibility(g.npcs.get('rocco'));
    g.events.emit('yearEnd', {});
    let closed = false;
    g.ui.push(yearAlmanac(g, () => { closed = true; }));
    while (!closed) yield;
    closed = false;
    g.ui.push(creditsScreen(g, () => { closed = true; }));
    while (!closed) yield;
    g.events.emit('creditsDone', {});
    // Year Two begins next morning, with a letter
    w.clock.minute = 4.9 * 60;
  }
  // ---- Frame -----------------------------------------------------------------------------------
  fixedStep() {}
  presentation(dt) {
    this.updateSeeds(dt);
    this.updateLanterns(dt);
    const g = this.g;
    if (this.potBuilt && g.place === g.town && this.potSoup) {
      this.potSoup.position.y = 1.9 + Math.sin(g.ctx.time * 2) * 0.02;
      if (g.ctx.time % 0.5 < dt) g.ctx.particles.burst('smoke', [LANDMARKS.soupPot[0], 2.2, LANDMARKS.soupPot[1]], { count: 1, speed: 0.5 });
      if (g.ctx.time % 0.2 < dt) g.ctx.particles.burst('flame', [LANDMARKS.soupPot[0], 0.5, LANDMARKS.soupPot[1]], { count: 2 });
    }
  }
  drawHud(hud) {
    const a = this.active;
    if (a?.kind === 'seedToss') {
      panel(hud, 170, 34, 140, 26, { fill: 'white', trim: 'lime' });
      drawText(hud, 240, 39, `Hits: ${a.hits}`, { align: 'center', color: 'ink' });
      bar(hud, 180, 50, 120, 5, a.t / TOSS_TIME, 'green');
    }
    const st = this.contestState();
    const g = this.g;
    if (st?.joined && !st.finished && g.mode === 'play' && !g.ui.blocking) {
      const left = Math.max(0, 13 * 60 - g.world.clock.minute);
      const text = `${DERBY_NAMES[g.cal.contest]}: ${st.score}  ·  ${Math.floor(left / 60)}h ${Math.floor(left % 60)}m left`;
      const w = textWidth(text) + 14;
      panel(hud, 240 - w / 2, 34, w, 16, { fill: 'white', trim: 'orange' });
      drawText(hud, 240, 39, text, { align: 'center', color: 'ink' });
    }
  }
  *singAlong(song, voiceId, seconds) {
    const g = this.g;
    const notes = melodyNotes(song).filter((n) => n !== '.' && n !== '-');
    const text = 'lalo do mi nana du bi la so wida no rumi tala';
    let i = 0;
    let t = seconds;
    while (t > 0) {
      const f = noteFrequency(notes[i % notes.length]);
      if (f) g.voice.sing(text[i % text.length], voiceId, 69 + 12 * Math.log2(f / 440));
      i++;
      yield 0.34;
      t -= 0.34;
    }
  }
}
const ordinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
/** Rated from tags. Pure, so tests can taste it. */
export function rateSoup(ids) {
  let score = 3;
  const cats = ids.map((id) => ITEMS[id]);
  const set = new Set(cats.map((c) => c?.cat));
  if (set.has('fish') && set.has('fruit')) score += 1;
  if (ids.includes('mushroom')) score += 3;
  if (cats.some((c) => c?.cat === 'fish' && !c.noMuseum)) score += 2;
  if (ids.includes('oldBoot')) score -= 3;
  if (ids.includes('cheeseOff')) score -= 4;
  if (cats.some((c) => c?.cat === 'bug')) score -= 3;
  if (cats.some((c) => c?.cat === 'flower')) score -= 1;
  if (ids.includes('soupGift')) score += 3;
  if (new Set(ids).size === ids.length && ids.length === 3) score += 1;
  const rating = Math.max(0, Math.min(10, score));
  return { rating, good: rating >= 6 };
}
export function* festivalAction(g, t) {
  const f = g.festivals;
  switch (t.act) {
    case 'festSeedToss': yield* f.seedToss(); break;
    case 'festLantern': yield* f.lanternFloat(); break;
    case 'festSoup': yield* f.greatSoup(); break;
    case 'festLights': yield* f.hangLights(t); break;
    case 'festFinale': yield* f.finale(); break;
    case 'festHint': yield* narrate(g, t.hint); break;
    case 'contestDesk': yield* contestDesk(g); break;
    default: break;
  }
}
function* contestDesk(g) {
  const f = g.festivals;
  const w = g.world;
  const kind = g.cal.contest;
  const st = f.contestState();
  const h = w.clock.minute;
  if (st?.finished) { yield* narrate(g, st.results.map((r, i) => `${ordinal(i + 1)} among the others: ${NEIGHBOURS[r.id].name}, ${r.s}.`).join(' ') + ` You: ${st.score}, ${ordinal(st.place)}.`); return; }
  if (st?.joined) {
    const c = yield* ask(g, 'clementine', `You've got ${st.score}. It runs until one o'clock. Finish now?`, ['Keep going', 'Finish now']);
    if (c === 1) yield* f.finishContest();
    return;
  }
  const rules = { derby: "It's the Fishing Derby. Longest fish in three hours. Bring something long. The bee is timekeeper.", bugOff: "It's the Bug-Off. Most value in bugs in three hours. Nib is scoring. Nib is looking at the sky.", snowman: "It's the Snowman Contest. Push two snowballs together. Best proportions wins. Bartleby is judging. He'd prefer not." }[kind];
  if (h > 13 * 60) { yield* say(g, 'clementine', "You've missed it. It ran ten till one. Nothing is urgent, except that."); return; }
  const c = yield* ask(g, 'clementine', rules, ['Enter', 'Not today'], { name: 'Clementine' });
  if (c !== 0) return;
  w.contests[f.key(kind)] = { joined: true, score: 0, finished: false };
  if (w.clock.minute < 10 * 60) w.clock.minute = 10 * 60;
  g.sound('uiConfirm');
  g.events.emit('contestJoined', { kind });
  if (kind === 'snowman') g.life.spawnSnowballs();
}
export { FEST_NAMES, playChime, townScore, DERBY_NAMES, hourNow };
