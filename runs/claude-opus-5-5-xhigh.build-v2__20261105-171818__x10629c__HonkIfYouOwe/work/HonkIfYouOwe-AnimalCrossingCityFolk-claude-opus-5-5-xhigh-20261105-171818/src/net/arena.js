// The Bean Bazaar: a five-minute shared-world round on the Fair Green, in the village's art.
// The host's copy runs the world; everyone else sends what they do and shows what it sends.
import { THREE, buildModel, toonMaterial, PALETTE, WaterSurface, WAVES_CALM, textureMap, setLookLayer, applySky, skyAt, ContactShadow } from '../engine.js';
import { MODELS } from '../art/models.js';
import { installTextures } from '../art/textures.js';
import { avatarDef, CRITTER_DEFS } from '../art/critter.js';
import { Actor } from '../actors/rig.js';
import { SFX_DEFS } from '../audio/sfx.js';
import { tune } from '../audio/composer.js';
import { drawText, panel, textWidth, inRect, bar, wrap } from '../ui/draw.js';
import { drawIcon } from '../art/icons.js';
import { drawPromptGlyph } from '../ui/glyphs.js';
import { PAD_BUTTONS, GameInput } from '../ui/input.js';
import { HubTransport } from './transport.js';
import { packAvatar, unpackAvatar, RemoteTrack, SEND_RATE } from './protocol.js';

const { BoxGeometry, Group, Mesh, PlaneGeometry, Vector3 } = THREE;
const W = 32, D = 24;
const ROUND_MS = 5 * 60 * 1000;
const SLOTS = 5;
const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const SEAT_SLOT = ['red', 'blue', 'green', 'sand'];
const VALUE = { pear: 100, goldenPear: 600, fossil: 400, fish: 300, goldenFish: 1500, butterfly: 200, flower: 150 };
const ICON = { pear: ['pear', { o: 'sand', x: 'plum' }], goldenPear: ['pear', { o: 'orange', x: 'red' }], fossil: ['bone', { o: 'sand', x: 'orange' }], fish: ['fish1', { o: 'sky', x: 'navy' }], goldenFish: ['fish3', { o: 'orange', x: 'sand' }], butterfly: ['butterfly', { o: 'white', x: 'ink' }], flower: ['flowerIcon', { o: 'red', x: 'sand' }] };
const NAME = { pear: 'pear', goldenPear: 'golden pear', fossil: 'fossil', fish: 'fish', goldenFish: 'golden fish', butterfly: 'butterfly', flower: 'flower' };
const ORDERS = [['Dorrit', 'pear'], ['Dorrit', 'fish'], ['Tavi', 'butterfly'], ['Tavi', 'flower'], ['Rocco', 'fish'], ['Rocco', 'fossil'], ['Nib', 'butterfly'], ['Yolanda', 'flower'], ['Ozzie', 'fossil'], ['Bartleby', 'pear']];
const AWARDS = [['Most Fish Apologised To', 'fish'], ['Best Bean Counter', 'banked'], ['Dirtiest Hands', 'digs'], ['Most Trees Upset', 'shakes'], ['Friend of the Mayor', 'mayor'], ['Fastest Pockets', 'sells']];
const LAYOUT = {
  trees: [[5, 4], [8, 3], [11, 4], [4, 7], [7, 7], [10, 7]],
  cracks: [[15, 4], [20, 3], [18, 7], [24, 5], [13, 19], [17, 21], [5, 20], [27, 20]],
  butterflies: [[22, 15], [24, 17], [26, 14], [28, 17], [23, 19]],
  flowers: [[21, 14], [23, 14], [25, 15], [27, 15], [22, 17], [25, 18], [27, 18], [29, 16]],
  stall: [16, 12],
  pond: { x0: 2, z0: 13, x1: 11, z1: 18 },
};
const isWater = (x, z) => { const p = LAYOUT.pond; return x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1; };
const Q = (v) => Math.round(v * 100) / 100;

export class BazaarGame {
  name = 'The Bean Bazaar';
  constructor(hub, info, opts = {}) {
    this.hub = hub;
    this.info = info;
    this.opts = opts;
    this.net = new HubTransport(hub);
    this.me = hub.server ? null : hub.me;
    this.isHost = hub.isHost;
    this.ended = false;
    this.spectator = !hub.server && !!opts.touchOnly;
    this.avatars = new Map();
    this.remote = new Map();
    this.objects = [];
    this.byId = new Map();
    this.state = new Map(); // host only: per player truth
    this.scores = new Map();
    this.orders = [];
    this.cardData = null;
    this.toast = null;
    this.bubbles = [];
    this.sendT = 0;
    this.snapT = 0;
    this.target = new Vector3(16, 1, 12);
    this.pockets = [];
    this.banked = 0;
    this.fishing = null;
    this.spot = null;
    this.playerPos = { x: 16, z: 14, facing: 0 };
    this.lastGold = -1;
    this.inp = new GameInput();
  }
  async setup(ctx) {
    this.ctx = ctx;
    ctx.input.gamepadButtons = PAD_BUTTONS;
    installTextures();
    for (const [n, d] of Object.entries(SFX_DEFS)) ctx.audio.register(n, d);
    if (!localStorage.getItem('pixel-engine:audio')) ctx.audio.setVolume('music', 0.1);
    ctx.camera.teleport(this.target);
    applySky(ctx.engine, skyAt(11));
    this.buildArena();
    for (const p of this.hub.players) this.addAvatar(p);
    this.net.on('message', (d, from) => this.onMessage(d, from));
    this.net.on('leave', (id) => this.onLeave(id));
    this.hub.on('card', (c) => { this.cardData = c; });
    this.hub.on('start', () => { this.cardData = null; this.started = true; ctx.audio.playMusic(tune('round'), 'round'); ctx.audio.play('bellNote'); });
    this.hub.on('time-up', () => { if (this.isHost) this.finish(); });
    this.hub.on('end', () => this.onEnd());
    if (this.isHost) this.hostInit();
    this.keydown = (e) => { if (e.key === 'Enter' && !this.started) this.answer('ready'); if (e.key === 'm' && !this.started) this.answer('more'); };
    window.addEventListener('keydown', this.keydown);
    ctx.engine.setCamera({ preset: 'iso', yaw: 45, pitch: 35, zoom: this.hub.server ? 0.9 : 1.35, minZoom: 0.5, maxZoom: 2 }, { syncUrl: false });
    this.hub.ready();
  }
  dispose() { window.removeEventListener('keydown', this.keydown); }
  answer(a) { if (!this.ended && !this.started) { this.hub.answer(a); this.ctx.audio.play('uiConfirm'); } }
  // ---- World -----------------------------------------------------------------------------------------
  buildArena() {
    const { scene } = this.ctx;
    const g = new PlaneGeometry(W + 40, D + 40).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv.array;
    for (let i = 0; i < uv.length; i += 2) { uv[i] *= (W + 40) / 4; uv[i + 1] *= (D + 40) / 4; }
    const ground = new Mesh(g, toonMaterial(PALETTE.white, { map: textureMap('lawn-summer') }));
    ground.position.set(W / 2, 0, D / 2);
    ground.receiveShadow = true;
    scene.add(ground);
    const p = LAYOUT.pond;
    const water = new WaterSurface({ size: [p.x1 - p.x0 + 1, p.z1 - p.z0 + 1], at: [(p.x0 + p.x1 + 1) / 2, 0.04, (p.z0 + p.z1 + 1) / 2], waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white, foamAt: 0.3 });
    scene.add(water);
    this.water = water;
    const rim = (w, d, x, z) => { const m = new Mesh(new BoxGeometry(w, 0.1, d), toonMaterial(PALETTE.sand)); m.position.set(x, 0.05, z); scene.add(m); };
    rim(p.x1 - p.x0 + 2, 0.3, (p.x0 + p.x1 + 1) / 2, p.z0 - 0.1); rim(p.x1 - p.x0 + 2, 0.3, (p.x0 + p.x1 + 1) / 2, p.z1 + 1.1);
    rim(0.3, p.z1 - p.z0 + 2, p.x0 - 0.1, (p.z0 + p.z1 + 1) / 2); rim(0.3, p.z1 - p.z0 + 2, p.x1 + 1.1, (p.z0 + p.z1 + 1) / 2);
    const put = (id, x, z, opts = {}, ry = 0) => { const o = buildModel(id, { catalog: MODELS, ...opts }).object; o.position.set(x, 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; };
    // Fence of pines round the green
    for (let x = -2; x < W + 2; x += 2.4) { put('tree-pine', x, -1.8, { palette: { leaf: 'teal', leaf2: 'green' } }); put('tree-pine', x, D + 1.8, { palette: { leaf: 'teal', leaf2: 'green' } }); }
    for (let z = 0; z < D; z += 2.4) { put('tree-pine', -1.8, z, { palette: { leaf: 'teal', leaf2: 'green' } }); put('tree-pine', W + 1.8, z, { palette: { leaf: 'teal', leaf2: 'green' } }); }
    // Stall
    const [sx, sz] = LAYOUT.stall;
    put('market-stall', sx, sz - 0.4, { palette: { cloth: 'red' } });
    const counter = { id: 'stall', kind: 'stall', x: sx, z: sz + 0.7 };
    this.addObject(counter);
    this.stallAt = counter;
    // Order-givers stand by the stall
    this.orderFolk = [['dorrit', sx - 3, sz + 0.4], ['tavi', sx + 3, sz + 0.4], ['rocco', sx - 3.8, sz + 2], ['yolanda', sx + 3.8, sz + 2]].map(([id, x, z]) => {
      const a = new Actor(CRITTER_DEFS[id], { name: id, seed: x * 3 });
      a.x = x; a.z = z; a.facing = 0.2;
      a.addTo(scene);
      a.play('Hum', 0);
      return a;
    });
    // Trees, cracks, butterflies, flowers
    LAYOUT.trees.forEach(([x, z], i) => {
      const o = put('tree-pear', x, z, { palette: { leaf: 'green', leaf2: 'lime' } });
      this.addObject({ id: `tree${i}`, kind: 'tree', x, z, fruit: 3, mesh: o, fruitMesh: o.getObjectByName('fruit'), golden: false, regrow: 0 });
    });
    LAYOUT.cracks.forEach(([x, z], i) => { const o = put('crack-mark', x, z); this.addObject({ id: `crack${i}`, kind: 'crack', x, z, up: true, mesh: o, regrow: 0 }); });
    LAYOUT.flowers.forEach(([x, z], i) => { const o = put('flower', x, z, { params: { species: i % 4 }, palette: { petal: ['red', 'sand', 'white', 'sky', 'plum'][i % 5] } }); this.addObject({ id: `flower${i}`, kind: 'flower', x, z, up: true, mesh: o, regrow: 0 }); });
    LAYOUT.butterflies.forEach(([x, z], i) => {
      const o = buildModel('winged', { catalog: MODELS, params: { size: 0.42 }, palette: { wing: ['white', 'orange', 'sky'][i % 3], spot: 'ink', body: 'ink' } }).object;
      o.position.set(x, 1, z);
      setLookLayer(o, 'actors');
      scene.add(o);
      this.addObject({ id: `fly${i}`, kind: 'butterfly', x, z, cx: x, cz: z, up: true, mesh: o, regrow: 0, t: i * 1.7 });
    });
    this.fishSpots = [];
    for (let x = p.x0 + 1; x <= p.x1; x += 3) { this.fishSpots.push([x, p.z0 - 1], [x, p.z1 + 2]); }
    this.fishSpots.push([p.x1 + 2, p.z0 + 2], [p.x1 + 2, p.z1 - 1]);
    this.fishSpots.forEach(([x, z], i) => this.addObject({ id: `spot${i}`, kind: 'fishspot', x, z }));
    this.mayor = new Actor(CRITTER_DEFS.trundle, { name: 'trundle', seed: 3 });
    this.mayor.addTo(scene);
    this.mayor.x = 12; this.mayor.z = 10; this.mayor.facing = Math.PI / 2;
    this.mayor.play('MayorSlide', 0);
    this.addObject({ id: 'mayor', kind: 'mayor', x: 12, z: 10, ref: this.mayor });
  }
  addObject(o) { this.objects.push(o); this.byId.set(o.id, o); }
  addAvatar(p) {
    const seat = p.id % 4;
    const a = new Actor(avatarDef({ shirt: SEAT_SLOT[seat], trim: 'white', hair: p.id % 8, hairColor: ['plum', 'ink', 'orange', 'navy'][seat], eyes: p.id % 6 }, `round-avatar-${p.id}`), { name: p.name, seed: p.id + 1 });
    const hex = parseInt((COLORS[seat]).slice(1), 16);
    a.swapMaterial(PALETTE[SEAT_SLOT[seat]], toonMaterial(hex));
    a.x = 12 + seat * 2.6; a.z = 15; a.facing = 0;
    a.addTo(this.ctx.scene);
    this.avatars.set(p.id, { a, info: p, track: new RemoteTrack() });
    if (p.id === this.me) { this.playerPos = { x: a.x, z: a.z, facing: 0 }; }
    if (this.isHost) this.state.set(p.id, { pockets: [], banked: 0, fish: 0, digs: 0, shakes: 0, sells: 0, mayor: 0, mayorTip: false, x: a.x, z: a.z, f: 0, a: 0, fishing: null });
    this.scores.set(p.id, { banked: 0, unbanked: 0 });
  }
  removeAvatar(id) { const e = this.avatars.get(id); if (e) { e.a.remove(); this.avatars.delete(id); } this.scores.delete(id); this.state.delete(id); }
  // ---- Host ------------------------------------------------------------------------------------------
  hostInit() {
    this.orderRng = this.hub.rng('orders');
    this.bellRng = this.hub.rng('golden');
    this.newOrders();
    this.goldenAt = [60000, 130000, 200000, 270000];
  }
  newOrders() {
    const r = this.orderRng;
    this.orders = [];
    while (this.orders.length < 2) { const o = ORDERS[Math.floor(r() * ORDERS.length)]; if (!this.orders.some((x) => x[1] === o[1])) this.orders.push(o); }
    this.ev({ k: 'orders', list: this.orders });
    this.nextOrders = (this.hub.time() > 0 ? this.hub.time() : 0) + 45000;
  }
  ev(data) { this.net.send({ t: 'ev', ...data }, { reliable: true }); this.applyEv(data); }
  hostStep(dt) {
    const t = this.hub.time();
    if (t < 0) return;
    const limit = this.hub.limitMs ?? ROUND_MS;
    if (t >= Math.min(ROUND_MS, limit - 5000) && !this.finished) { this.finish(); return; }
    if (t >= this.nextOrders) this.newOrders();
    if (this.goldenAt.length && t >= this.goldenAt[0]) { this.goldenAt.shift(); this.goldenMoment(); }
    // regrow
    for (const o of this.objects) {
      if (o.regrow && t >= o.regrow) {
        o.regrow = 0;
        if (o.kind === 'tree') { o.fruit = 3; o.golden = false; this.ev({ k: 'obj', id: o.id, fruit: 3, golden: false }); }
        else { o.up = true; this.ev({ k: 'obj', id: o.id, up: true }); }
      }
    }
    // Fishing bites are the host's call
    for (const [id, s] of this.state) {
      const f = s.fishing;
      if (!f) continue;
      if (f.state === 'wait' && t >= f.biteAt) { f.state = 'bite'; f.until = t + 900; this.ev({ k: 'bite', p: id }); }
      else if (f.state === 'bite' && t >= f.until) { s.fishing = null; this.ev({ k: 'fishMiss', p: id }); }
    }
    this.mayorX = 10 + (t / ROUND_MS) * 16;
    this.snapT -= dt;
    if (this.snapT <= 0) {
      this.snapT = SEND_RATE;
      const list = [];
      for (const [id, s] of this.state) list.push(packAvatar({ id, x: s.x, z: s.z, facing: s.f, action: s.a }));
      const score = [];
      for (const [id, s] of this.state) score.push([id, s.banked, this.pocketValue(s.pockets)]);
      this.net.send({ t: 'snap', a: list, m: Q(this.mayorX), s: score }, { reliable: false });
      this.applySnap({ a: list, m: this.mayorX, s: score }, true);
    }
  }
  pocketValue(p) { return p.reduce((a, it) => a + VALUE[it], 0); }
  goldenMoment() {
    const r = this.bellRng;
    if (r() < 0.5) {
      const trees = this.objects.filter((o) => o.kind === 'tree');
      const t = trees[Math.floor(r() * trees.length)];
      t.fruit = 3; t.golden = true; t.regrow = 0;
      this.ev({ k: 'obj', id: t.id, fruit: 3, golden: true });
      this.ev({ k: 'bell', what: 'A rich tree in the orchard! Golden pears!' });
    } else {
      this.goldenFishUntil = this.hub.time() + 30000;
      this.ev({ k: 'bell', what: 'A golden fish in the pond! Quick!' });
    }
  }
  handleDo(pid, msg) {
    const s = this.state.get(pid);
    if (!s || this.finished) return;
    const t = this.hub.time();
    if (t < 0) return;
    const o = this.byId.get(msg.o);
    if (!o) return;
    const reach = Math.hypot(o.x - s.x, o.z - s.z);
    const full = s.pockets.length >= SLOTS;
    switch (o.kind) {
      case 'tree':
        if (reach > 2.2 || o.fruit <= 0) return;
        if (full) { this.ev({ k: 'full', p: pid }); return; }
        { const item = o.golden ? 'goldenPear' : 'pear'; o.fruit -= 1; s.pockets.push(item); s.shakes++; this.ev({ k: 'obj', id: o.id, fruit: o.fruit, golden: o.golden }); this.ev({ k: 'got', p: pid, item, from: o.id }); if (o.fruit <= 0) { o.regrow = t + 20000; } }
        break;
      case 'crack':
        if (reach > 1.8 || !o.up) return;
        if (full) { this.ev({ k: 'full', p: pid }); return; }
        o.up = false; o.regrow = t + 35000; s.pockets.push('fossil'); s.digs++;
        this.ev({ k: 'obj', id: o.id, up: false }); this.ev({ k: 'got', p: pid, item: 'fossil', from: o.id });
        break;
      case 'flower':
        if (reach > 1.6 || !o.up) return;
        if (full) { this.ev({ k: 'full', p: pid }); return; }
        o.up = false; o.regrow = t + 25000; s.pockets.push('flower');
        this.ev({ k: 'obj', id: o.id, up: false }); this.ev({ k: 'got', p: pid, item: 'flower', from: o.id });
        break;
      case 'butterfly':
        if (reach > 3 || !o.up) return;
        if (full) { this.ev({ k: 'full', p: pid }); return; }
        o.up = false; o.regrow = t + 20000; s.pockets.push('butterfly');
        this.ev({ k: 'obj', id: o.id, up: false }); this.ev({ k: 'got', p: pid, item: 'butterfly', from: o.id });
        break;
      case 'fishspot':
        if (reach > 2) return;
        if (s.fishing?.state === 'bite') {
          const gold = this.goldenFishUntil && t < this.goldenFishUntil;
          if (full) { this.ev({ k: 'full', p: pid }); s.fishing = null; return; }
          const item = gold ? 'goldenFish' : 'fish';
          if (gold) this.goldenFishUntil = 0;
          s.pockets.push(item); s.fish++; s.fishing = null;
          this.ev({ k: 'got', p: pid, item, from: o.id });
        } else if (s.fishing) {
          s.fishing = null; this.ev({ k: 'fishMiss', p: pid });
        } else {
          const r = this.hub.rng(`bite:${pid}:${Math.floor(t / 1000)}`);
          s.fishing = { state: 'wait', biteAt: t + 1500 + r() * 2500, at: o.id };
          this.ev({ k: 'cast', p: pid, at: o.id });
        }
        break;
      case 'stall': {
        if (reach > 2.6 || !s.pockets.length) return;
        let total = 0;
        for (const it of s.pockets) {
          const doubled = this.orders.some((ord) => ord[1] === it || (ord[1] === 'pear' && it === 'goldenPear') || (ord[1] === 'fish' && it === 'goldenFish'));
          total += VALUE[it] * (doubled ? 2 : 1);
        }
        s.banked += total; s.pockets = []; s.sells++;
        this.ev({ k: 'sold', p: pid, total, banked: s.banked });
        break;
      }
      case 'mayor':
        if (reach > 2 || s.mayorTip) return;
        s.mayorTip = true; s.banked += 150; s.mayor++;
        this.ev({ k: 'mayor', p: pid, banked: s.banked });
        break;
      default: break;
    }
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const present = this.hub.players.filter((p) => this.state.has(p.id));
    const score = (id) => { const s = this.state.get(id); return Math.round(s.banked + this.pocketValue(s.pockets) / 2); };
    const sorted = present.map((p) => [p.id, score(p.id)]).sort((a, b) => b[1] - a[1]);
    const standings = [];
    for (const [id, sc] of sorted) { const last = standings[standings.length - 1]; if (last && score(last[0]) === sc) last.push(id); else standings.push([id]); }
    const scores = {}; const stats = {}; const awards = [];
    for (const [id, sc] of sorted) { scores[id] = sc; const s = this.state.get(id); stats[id] = { Banked: s.banked, Fish: s.fish, Digs: s.digs, Shakes: s.shakes }; }
    const used = new Set();
    for (const [title, field] of AWARDS) {
      let best = null, bv = 0;
      for (const [id] of sorted) { const v = field === 'banked' ? this.state.get(id).banked : this.state.get(id)[field]; if (v > bv && !used.has(id)) { bv = v; best = id; } }
      if (best !== null) { used.add(best); awards.push({ id: best, title, detail: `${bv}` }); }
    }
    this.ctx.audio.play('bellNote');
    this.hub.finish({ standings, scores, stats, awards });
  }
  // ---- Messages --------------------------------------------------------------------------------------
  onMessage(d, from) {
    if (this.ended || !d) return;
    switch (d.t) {
      case 'me': if (this.isHost) { const s = this.state.get(from); if (s) { s.x = d.x; s.z = d.z; s.f = d.f; s.a = d.a; } } break;
      case 'do': if (this.isHost) this.handleDo(from, d); break;
      case 'snap': this.applySnap(d, false); break;
      case 'ev': this.applyEv(d); break;
      default: break;
    }
  }
  applySnap(d, own) {
    const now = this.ctx.time * 1000;
    for (const r of d.a) {
      const u = unpackAvatar(r);
      const e = this.avatars.get(u.id);
      if (e && u.id !== this.me) e.track.push(now, u);
    }
    if (typeof d.m === 'number') this.mayorX = d.m;
    for (const [id, banked, un] of d.s ?? []) { const sc = this.scores.get(id); if (sc) { sc.banked = banked; sc.unbanked = un; } }
  }
  applyEv(d) {
    const { audio, particles } = this.ctx;
    const mine = d.p === this.me;
    switch (d.k) {
      case 'orders': this.orders = d.list; break;
      case 'obj': {
        const o = this.byId.get(d.id);
        if (!o) break;
        if ('fruit' in d) { o.fruit = d.fruit; o.golden = d.golden; if (o.fruitMesh) o.fruitMesh.visible = d.fruit > 0; }
        if ('up' in d) { o.up = d.up; if (o.mesh) o.mesh.visible = d.up; }
        break;
      }
      case 'got': {
        const o = this.byId.get(d.from);
        if (o) particles.burst('sparkle', [o.x, 1, o.z], { count: 8 });
        if (mine) { this.pockets.push(d.item); audio.play(d.item.includes('olden') ? 'reveal' : 'pickUp'); this.say(`A ${NAME[d.item]}! ${VALUE[d.item]} beans at the stall.`); }
        break;
      }
      case 'full': if (mine) { audio.play('uiError'); this.say('Your pockets are full. Sell at the stall.'); } break;
      case 'sold': if (mine) { this.pockets = []; this.banked = d.banked; audio.play('beanLots'); this.say(`Sold for ${d.total} beans.`); } break;
      case 'mayor': if (mine) { this.banked = d.banked; audio.play('bean'); this.say('The Mayor tips his sash. Plus 150.'); } break;
      case 'bell': this.bellMsg = d.what; this.bellT = 6; audio.play('bellNote'); audio.play('bellNote', { pitch: 4 }); break;
      case 'cast': if (mine) { audio.play('cast'); this.fishing = 'wait'; this.say('Wait for the plunge…'); } break;
      case 'bite': if (mine) { audio.play('bite'); this.fishing = 'bite'; this.say('NOW!'); } break;
      case 'fishMiss': if (mine) { this.fishing = null; this.say('It got away.'); } break;
      default: break;
    }
  }
  say(text) { this.toast = text; this.toastT = 2.4; }
  onLeave(id) {
    this.removeAvatar(id);
  }
  onEnd() {
    this.ended = true;
    const a = this.ctx.audio;
    a.stopMusic();
    a.stopLoops();
  }
  // ---- Frames ----------------------------------------------------------------------------------------
  fixedUpdate(ctx, dt) {
    if (this.ended) return;
    if (this.isHost) this.hostStep(dt);
    const me = this.avatars.get(this.me);
    if (!me || this.spectator || this.hub.time() < 0) return;
    const axis = ctx.input.moveAxis();
    const mag = Math.min(1, Math.hypot(axis.x, axis.y));
    if (mag > 0.05) {
      const { right, forward } = ctx.camera.groundBasis();
      let dx = right.x * axis.x + forward.x * axis.y, dz = right.z * axis.x + forward.z * axis.y;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const sp = 4.6 * mag;
      const nx = this.playerPos.x + dx * sp * dt, nz = this.playerPos.z + dz * sp * dt;
      if (!this.solid(nx, this.playerPos.z)) this.playerPos.x = nx;
      if (!this.solid(this.playerPos.x, nz)) this.playerPos.z = nz;
      this.playerPos.facing = Math.atan2(dx, dz);
      this.moving = true;
    } else this.moving = false;
    if (this.isHost) { const s = this.state.get(this.me); if (s) { s.x = this.playerPos.x; s.z = this.playerPos.z; s.f = this.playerPos.facing; s.a = this.moving ? 1 : 0; } }
    else {
      this.sendT -= dt;
      if (this.sendT <= 0) { this.sendT = SEND_RATE; this.net.send({ t: 'me', x: Q(this.playerPos.x), z: Q(this.playerPos.z), f: Q(this.playerPos.facing), a: this.moving ? 1 : 0 }, { reliable: false }); }
    }
  }
  solid(x, z) {
    if (x < 0.3 || z < 0.3 || x > W - 0.3 || z > D - 0.3) return true;
    if (isWater(x, z)) return true;
    const [sx, sz] = LAYOUT.stall;
    if (Math.abs(x - sx) < 1.9 && Math.abs(z - (sz - 0.4)) < 0.7) return true;
    for (const t of LAYOUT.trees) if (Math.hypot(t[0] - x, t[1] - z) < 0.6) return true;
    return false;
  }
  use(o) {
    if (!o) return;
    this.ctx.audio.play('uiTick');
    const a = this.avatars.get(this.me)?.a;
    if (a) { const clip = { tree: 'ShakeTree', crack: 'Dig', flower: 'PickUp', butterfly: 'NetSweep', fishspot: 'Cast', stall: 'Give', mayor: 'Bow' }[o.kind]; a.play(clip, 0.06, { once: true }); this.actionT = 0.45; }
    if (this.isHost) this.handleDo(this.me, { o: o.id });
    else this.net.send({ t: 'do', o: o.id }, { reliable: true });
  }
  contextTarget() {
    const p = this.playerPos;
    let best = null, bd = 1e9;
    for (const o of this.objects) {
      const reach = { tree: 2, crack: 1.6, flower: 1.4, butterfly: 2.8, fishspot: 1.6, stall: 2.4, mayor: 1.8 }[o.kind];
      const ox = o.kind === 'mayor' ? this.mayor.x : o.x, oz = o.z;
      const d = Math.hypot(ox - p.x, oz - p.z);
      if (d > reach) continue;
      if (o.kind === 'tree' && o.fruit <= 0) continue;
      if ((o.kind === 'crack' || o.kind === 'flower' || o.kind === 'butterfly') && !o.up) continue;
      if (o.kind === 'stall' && !this.pockets.length) continue;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  update(ctx, dt) {
    this.inp.begin(ctx, dt);
    if (this.ended) { this.drawHud(ctx); return; }
    const t = ctx.time;
    this.water.update(t);
    const inp = ctx.input;
    const hubTime = this.hub.time();
    const createHeld = inp.isDown('PadCreate');
    if (!this.started) {
      if (inp.wasPressed('PadCross')) this.answer('ready');
      if (inp.wasPressed('PadTriangle', 'KeyM')) this.answer('more');
      const m = inp.pointer;
      if (inp.wasPressed('MouseLeft')) {
        const mx = (m.x + 1) * 240, my = (1 - m.y) * 135;
        if (inRect({ x: mx, y: my }, 150, 220, 80, 24)) this.answer('ready');
        if (inRect({ x: mx, y: my }, 250, 220, 80, 24)) this.answer('more');
      }
    } else if (hubTime >= 0 && !this.spectator && this.me !== null) {
      this.ctxTarget = this.contextTarget();
      if (inp.wasPressed('PadCross', 'KeyE', 'Enter', 'Space') && this.ctxTarget) this.use(this.ctxTarget);
      if (createHeld) { /* Options is the hub's while Create is held */ }
    }
    // Avatars
    const now = t * 1000;
    for (const [id, e] of this.avatars) {
      const a = e.a;
      if (id === this.me) { a.x = this.playerPos.x; a.z = this.playerPos.z; a.turnTo = this.playerPos.facing; if (this.actionT > 0) this.actionT -= dt; else a.play(this.moving ? 'Jog' : (this.fishing ? 'Reel' : 'Idle'), 0.12); }
      else { const tr = e.track.at(now); if (tr.seen) { a.x = tr.x; a.z = tr.z; a.turnTo = tr.facing; a.play(tr.action ? 'Jog' : 'Idle', 0.15); } }
      a.update(dt);
    }
    for (const a of this.orderFolk) a.update(dt);
    if (typeof this.mayorX === 'number') { this.mayor.x = this.mayorX; this.mayor.update(dt); const mo = this.byId.get('mayor'); mo.x = this.mayorX; }
    for (const o of this.objects) {
      if (o.kind !== 'butterfly' || !o.mesh?.visible) continue;
      o.t += dt;
      o.x = o.cx + Math.sin(o.t * 0.8) * 1.4; o.z = o.cz + Math.cos(o.t * 0.6) * 1.2;
      o.mesh.position.set(o.x, 1 + Math.abs(Math.sin(o.t * 2.1)) * 0.5, o.z);
      const wl = o.mesh.getObjectByName('WingL'), wr = o.mesh.getObjectByName('WingR');
      if (wl) wl.rotation.z = Math.sin(o.t * 24) * 0.9;
      if (wr) wr.rotation.z = -Math.sin(o.t * 24) * 0.9;
    }
    if (this.toastT > 0) this.toastT -= dt;
    if (this.bellT > 0) this.bellT -= dt;
    this.drawHud(ctx);
  }
  cameraTarget() {
    if (this.me === null || this.spectator) { const t = this.ctx?.time ?? 0; return this.target.set(16 + Math.sin(t * 0.1) * 4, 1, 12 + Math.cos(t * 0.08) * 3); }
    return this.target.set(this.playerPos.x, 1, this.playerPos.z);
  }
  status() { return `round t=${Math.round(this.hub.time())} me=${this.me}`; }
  // ---- HUD ------------------------------------------------------------------------------------------
  drawHud(ctx) {
    const hud = ctx.hud;
    hud.clear();
    if (!this.started) { this.drawCard(hud); return; }
    const t = this.hub.time();
    if (t < 0) drawText(hud, 240, 110, String(Math.ceil(-t / 1000)), { align: 'center', color: 'sand', scale: 6, shadow: 'ink' });
    this.drawScores(hud);
    const left = Math.max(0, Math.min(ROUND_MS, (this.hub.limitMs ?? ROUND_MS) - 5000) - Math.max(0, t));
    const clock = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    panel(hud, 216, 8, 48, 18, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 14, clock, { align: 'center', color: 'ink' });
    // Orders
    const orderText = this.orders.map((o) => `${o[0]} wants a ${NAME[o[1]]}: double beans`).join('   ');
    if (orderText) { const w = textWidth(orderText) + 14; panel(hud, 240 - w / 2, 30, w, 16, { fill: 'navy', trim: 'sky' }); drawText(hud, 240, 35, orderText, { align: 'center', color: 'white' }); }
    if (this.bellT > 0) { const w = textWidth(this.bellMsg) + 14; panel(hud, 240 - w / 2, 50, w, 16, { fill: 'sand', trim: 'orange' }); drawText(hud, 240, 55, this.bellMsg, { align: 'center', color: 'ink' }); }
    for (const [id, e] of this.avatars) {
      const s = this.projectTo(ctx, e.a.x, 2.1, e.a.z);
      if (s) drawText(hud, s.x, s.y - 8, clean(e.info.name), { align: 'center', color: 'white', shadow: 'ink' });
    }
    if (this.me !== null && !this.spectator) {
      // Pockets
      for (let i = 0; i < SLOTS; i++) {
        const x = 240 - (SLOTS * 24) / 2 + i * 24, y = 270 - 34;
        panel(hud, x, y, 22, 22, { fill: 'white', trim: 'mist' });
        const it = this.pockets[i];
        if (it) drawIcon(hud, x + 3, y + 3, ICON[it][0], ICON[it][1]);
      }
      const c = this.ctxTarget;
      if (c && t >= 0) {
        const verb = { tree: 'Shake', crack: 'Dig', flower: 'Pick', butterfly: 'Swing', fishspot: this.fishing === 'bite' ? 'REEL!' : this.fishing ? 'Reel in' : 'Cast', stall: 'Sell', mayor: 'Bump the Mayor' }[c.kind];
        const w = textWidth(verb) + 30;
        panel(hud, 480 - 12 - w, 270 - 26, w, 17, { fill: 'night', trim: 'night' });
        const gw = drawPromptGlyph(hud, 480 - 12 - w + 5, 270 - 21, 'confirm', this.inp.device, false, false);
        drawText(hud, 480 - 12 - w + 8 + gw, 270 - 21, verb, { color: 'white' });
      }
      if (this.toastT > 0) { const w = textWidth(this.toast) + 14; panel(hud, 240 - w / 2, 270 - 56, w, 16, { fill: 'white', trim: 'sand' }); drawText(hud, 240, 270 - 51, this.toast, { align: 'center', color: 'ink' }); }
    }
    if (this.spectator) { panel(hud, 110, 240, 260, 20, { fill: 'navy', trim: 'sky' }); drawText(hud, 240, 246, 'Controller or keyboard required', { align: 'center', color: 'white' }); }
  }
  drawScores(hud) {
    let i = 0;
    for (const p of this.hub.players) {
      const sc = this.scores.get(p.id);
      if (!sc) continue;
      const x = 8, y = 8 + i * 15;
      const seat = p.id % 4;
      hud.rect(x, y, 90, 13, 'ink');
      hud.rect(x + 1, y + 1, 5, 11, parseInt(COLORS[seat].slice(1), 16));
      drawText(hud, x + 9, y + 3, clean(p.name).slice(0, 7), { color: 'white' });
      drawText(hud, x + 88, y + 3, `${Math.round(sc.banked + sc.unbanked / 2)}`, { color: 'sand', align: 'right' });
      i++;
    }
  }
  drawCard(hud) {
    const c = this.cardData;
    hud.rect(0, 0, 480, 270, 'ink');
    panel(hud, 40, 16, 400, 238, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 24, 'The Bean Bazaar', { align: 'center', color: 'ink', scale: 3 });
    drawText(hud, 240, 52, 'Bank the most beans before the last bell.', { align: 'center', color: 'plum' });
    drawText(hud, 240, 66, 'Unbanked pockets count half. Sell at the stall.', { align: 'center', color: 'slate' });
    this.hub.players.forEach((p, i) => {
      const y = 84 + i * 18;
      hud.rect(120, y, 240, 16, 'night');
      hud.rect(122, y + 2, 12, 12, parseInt(COLORS[p.id % 4].slice(1), 16));
      drawText(hud, 140, y + 5, clean(p.name), { color: 'white' });
      if (c?.ready?.includes(p.id)) drawText(hud, 354, y + 5, 'READY', { color: 'lime', align: 'right' });
    });
    drawText(hud, 240, 164, 'Move: stick or WASD. Do the thing: Cross or E.', { align: 'center', color: 'ink' });
    drawText(hud, 240, 178, 'Shake, dig, cast, reel, swing, sell: one button.', { align: 'center', color: 'slate' });
    const left = c?.left != null ? `Starts in ${Math.ceil(c.left / 1000)}` : c?.paused ? 'Holding: someone asked for more time' : c?.starting ? 'Starting…' : '';
    drawText(hud, 240, 200, left, { align: 'center', color: 'plum' });
    panel(hud, 150, 220, 80, 24, { fill: 'sand', trim: 'orange' });
    drawText(hud, 190, 228, 'Ready', { align: 'center', color: 'ink' });
    panel(hud, 250, 220, 80, 24, { fill: c?.asked ? 'sand' : 'white', trim: 'mist' });
    drawText(hud, 290, 228, 'More time', { align: 'center', color: 'ink' });
    drawText(hud, 240, 247, 'Enter or Cross: Ready.  M or Triangle: More time.', { align: 'center', color: 'slate' });
    if (this.spectator) drawText(hud, 240, 150, 'Controller or keyboard required', { align: 'center', color: 'red' });
  }
  projectTo(ctx, x, y, z) {
    this.tmpP ??= new Vector3();
    this.tmpP.set(x, y, z).project(ctx.camera.camera);
    if (this.tmpP.z > 1) return null;
    return { x: Math.round((this.tmpP.x + 1) * 240), y: Math.round((1 - this.tmpP.y) * 135) };
  }
}
const clean = (s) => String(s ?? '').slice(0, 14);
export { ContactShadow, bar, wrap };
