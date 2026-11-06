// AI Hub session: "The Bean Bazaar". Five minutes on a small green; the host's copy runs the world.
import { Engine, THREE, buildModel, toonMaterial, PALETTE, applySky, skyAt, WaterSurface, WAVES_CALM, loadPack, MODEL_LIBRARY, setLookLayer } from '../engine.js';
import { Place } from '../world/place.js';
import { TerrainView } from '../world/terrainMesh.js';
import { HubTransport } from './transport.js';
import { Actor } from '../actors/actor.js';
import { critterDef } from '../art/critter.js';
import { Controls } from '../ui/input.js';
import { UI, panel, promptRow, drawGlyph } from '../ui/kit.js';
import { drawText, textWidth } from '../ui/font.js';
import { G } from '../state.js';
import { CAST } from '../data/cast.js';
import { SONGS } from '../audio/composer.js';
import { SFX_DEFS } from '../audio/sfx.js';
import { itemDef } from '../art/models.js';
import { ITEMS } from '../data/items.js';
import '../art/textures.js';
const ROWS = (() => { const W = 32, H = 24; const g = Array.from({ length: H }, () => Array(W).fill('.')); const rect = (a, b, c, d, ch) => { for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) g[z][x] = ch; }; rect(0, 0, 31, 0, '#'); rect(0, 23, 31, 23, '#'); rect(0, 0, 0, 23, '#'); rect(31, 0, 31, 23, '#'); rect(2, 16, 9, 21, 'o'); rect(24, 1, 26, 22, 'w'); rect(24, 11, 26, 13, 'b'); rect(12, 10, 19, 14, 'P'); return g.map((r) => r.join('')); })();
const STALL = [16, 11]; const SIZE = 5; const SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700']; const ROUND_MS = 5 * 60000;
const ORDERS = [['dorrit', 'pear', 'Dorrit wants a pear'], ['tavi', 'bug', 'Tavi wants a butterfly'], ['bartleby', 'fish', 'Bartleby would prefer a fish'], ['yolanda', 'fossil', 'Yolanda wants a fossil, hon'], ['rocco', 'fish', 'Rocco needs fish. For protein']];
const VALUE = { pear: 100, flower: 80, bug: 200, fish: 300, goldfish: 3000, fossil: 600, goldpear: 800 };
const AWARDS = [['Most Fish Apologised To', (s) => s.fish], ['Tree Botherer of the Year', (s) => s.pears], ['Bug Whisperer', (s) => s.bugs], ['Bean Counter, Honorary', (s) => s.sold], ['Friend to Moles', (s) => s.fossils], ['Sash Bumper', (s) => s.bumps]];
class RoundGame {
  name = 'Silly Folk: The Bean Bazaar'; target = new THREE.Vector3(16, 1, 12);
  constructor(hub) { this.hub = hub; this.info = hub; }
  async setup(ctx) {
    this.ctx = ctx; G.ctx = ctx; const hub = this.hub; UI.ctrl = this.ctrl = new Controls(ctx); UI.clear(); await loadPack('packs/kenney-furniture.json', { into: MODEL_LIBRARY }).catch(() => {});
    for (const [k, d] of Object.entries(SFX_DEFS)) ctx.audio.register(k, d);
    if (!localStorageHasAudio()) ctx.audio.setVolume('music', 0.1);
    applySky(ctx.engine, skyAt(11));
    this.net = new HubTransport(hub); this.isHost = hub.isHost; this.me = hub.me; this.server = !!hub.server; this.place = new Place('fair', ROWS);
    const g = (this.g = new THREE.Group()); ctx.scene.add(g); const t = new TerrainView(this.place, g); t.season = 1; t.buildAll();
    const water = new WaterSurface({ size: [60, 50], at: [16, -0.35, 12], segments: [60, 50], waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white, foamAt: 0.6 }); g.add(water); this.water = water;
    const under = new THREE.Mesh(new THREE.PlaneGeometry(90, 80).rotateX(-Math.PI / 2), toonMaterial(PALETTE.teal)); under.position.set(16, -0.1, 12); g.add(under);
    const stall = buildModel('market-stall', { palette: { cloth: 'red' } }).object; stall.position.set(STALL[0], 0, STALL[1]); g.add(stall); this.place.rects.push({ x0: STALL[0] - 1.3, z0: STALL[1] - 0.8, x1: STALL[0] + 1.3, z1: STALL[1] + 0.8 });
    const br = buildModel('sf-bridge', {}).object; br.position.set(25, 0, 12); br.rotation.y = 0; g.add(br);
    // World: trees, cracks, flowers, bugs. Same on every copy from the hub's seed.
    const rng = hub.rng('world'); const pick = (a, b) => a + rng() * (b - a);
    this.trees = Array.from({ length: 8 }, (_, i) => ({ i, x: 4 + (i % 4) * 4.5 + pick(-0.4, 0.4), z: 3 + Math.floor(i / 4) * 4.5 + pick(-0.4, 0.4), fruit: 2, rich: false, cool: 0 }));
    for (const tr of this.trees) { const m = buildModel('pear-tree', { palette: { leaf: 'green', leaf2: 'lime' } }).object; m.position.set(tr.x, 0, tr.z); g.add(m); tr.m = m; this.place.circles.push({ x: tr.x, z: tr.z, r: 0.45 }); const fmat = toonMaterial(PALETTE.lime); tr.fm = []; for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), fmat); f.position.set(Math.cos(k * 2.1), 1.8, Math.sin(k * 2.1) + 0.35); m.add(f); tr.fm.push(f); } }
    this.cracks = Array.from({ length: 6 }, (_, i) => ({ i, x: Math.floor(pick(12, 22)) + 0.5, z: Math.floor(pick(16, 22)) + 0.5, alive: true })); this.crackM = this.cracks.map((c) => { const m = buildModel('sf-crack', {}).object; m.position.set(c.x, 0.01, c.z); g.add(m); return m; });
    this.flowers = Array.from({ length: 6 }, (_, i) => ({ i, x: 28 + pick(0, 2.4), z: 2 + i * 3.4, alive: true })); this.flowerM = this.flowers.map((c, i) => { const m = buildModel('fl-tulip', { palette: { petal: ['red', 'sand', 'plum'][i % 3] } }).object; m.position.set(c.x, 0, c.z); g.add(m); return m; });
    this.bugs = Array.from({ length: 5 }, (_, i) => ({ i, ax: pick(13, 22), az: pick(3, 9), x: 0, z: 0, alive: true })); this.bugM = this.bugs.map((b) => { const m = buildModel(itemDef(ITEMS.cabbagefly), {}).object; g.add(m); return m; });
    this.fishSpot = { x: 5.5, z: 18.5, gold: false }; this.shadow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4), toonMaterial(PALETTE.night)); this.shadow.scale.set(1, 0.05, 1.5); this.shadow.position.set(5.5, -0.27, 18.5); g.add(this.shadow);
    this.mayor = new Actor(critterDef({ id: 'round-mayor', ...CAST.trundle.look }), { seed: 2 }); this.mayor.addTo(g); this.mayor.play('MayorSlide'); this.mayorX = 11;
    this.orderers = {}; this.state = { players: {}, order: null, orderT: 12, bell: null, ended: false, time: 0 }; this.avatars = new Map(); this.seat = {};
    (hub.players ?? []).forEach((p, i) => this.addPlayer(p.id, p.name, p.color ?? SEATS[i % 4], i));
    this.net.on('message', (d, f) => this.onMsg(d, f));
    hub.on('leave', ({ id }) => this.removePlayer(id)); hub.on('time-up', () => { if (this.isHost) this.finish(); }); hub.on('end', () => this.onEnd()); hub.on('card', (c) => { this.card = c; }); hub.on('start', () => { this.started = true; this.startAt = true; ctx.audio.playMusic(SONGS.round, 'round'); });
    ctx.audio.playMusic(SONGS.card, 'card'); this.touchSpectator = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches && !navigator.getGamepads?.()[0];
    this.key = (e) => { if (this.ended) return; if (this.started) return; if (e.key === 'Enter') hub.answer('ready'); if (e.key === 't' || e.key === 'T') hub.answer('more'); }; window.addEventListener('keydown', this.key);
    this.tap = (e) => { if (this.started || this.ended) return; const y = e.clientY / innerHeight; if (y > 0.8) hub.answer(e.clientX / innerWidth < 0.5 ? 'ready' : 'more'); }; window.addEventListener('pointerdown', this.tap);
  }
  ready() { this.hub.ready(); window.__ROUND__ = this; }
  addPlayer(id, name, color, i) { if (this.state.players[id]) return; const sp = [14 + (i % 2) * 4, 15 + Math.floor(i / 2) * 1.5]; this.state.players[id] = { id, x: sp[0], z: sp[1], f: 0, a: 0, pockets: [], banked: 0, stats: { fish: 0, pears: 0, bugs: 0, sold: 0, fossils: 0, bumps: 0 }, fishing: null, bumpT: 0 }; const a = new Actor(critterDef({ id: 'round-p' + id, species: 'person', c1: 'sand', c2: 'white', shirt: 'white', trousers: 'navy', shoes: 'ink', hair: id % 8, hairColor: ['orange', 'ink', 'plum', 'sand'][id % 4], eyes: id % 6 }), { seed: id * 3 }); a.addTo(this.g); const col = toonMaterial(new THREE.Color(color).getHex()); const wh = new THREE.Color(PALETTE.white).getHex(); a.obj.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === wh && ['Torso', 'ArmR', 'ArmL'].includes(m.parent?.name)) m.material = col; }); this.avatars.set(id, { a, name, color, x: sp[0], z: sp[1], tx: sp[0], tz: sp[1], f: 0, hist: [] }); a.place(sp[0], 0, sp[1]); this.seat[id] = i; }
  removePlayer(id) { const v = this.avatars.get(id); if (v) { v.a.removeFrom(); this.avatars.delete(id); } delete this.state.players[id]; }
  onMsg(d, from) {
    if (d.t === 'me' && this.isHost) { const p = this.state.players[from]; if (p) { p.x = d.x; p.z = d.z; p.f = d.f; p.a = d.a; } }
    else if (d.t === 'do' && this.isHost) this.act(from);
    else if (d.t === 'snap' && !this.isHost) { this.state.time = d.time; this.mayorX = d.mx; this.fishSpot = { x: d.fx, z: d.fz, gold: d.gold }; d.p.forEach(([id, x, z, f, a, banked, carried]) => { const v = this.avatars.get(id); if (!v) return; v.hist.push({ t: performance.now(), x, z, f, a }); if (v.hist.length > 6) v.hist.shift(); const st = this.state.players[id]; if (st) { st.banked = banked; st.carried = carried; if (id !== this.me) { st.x = x; st.z = z; } } }); }
    else if (d.t === 'ev' && !this.isHost) this.applyEv(d);
  }
  applyEv(d) { if (d.tree) { const tr = this.trees[d.tree[0]]; tr.fruit = d.tree[1]; tr.rich = d.tree[2]; } if (d.crack != null) this.cracks[d.crack].alive = false; if (d.flower != null) this.flowers[d.flower].alive = false; if (d.bug) { this.bugs[d.bug[0]].alive = d.bug[1]; } if (d.order !== undefined) this.state.order = d.order; if (d.bell) this.announce(d.bell); if (d.say && d.say[0] === this.me) { this.toast = d.say[1]; this.toastT = 2.4; this.ctx.audio.play(d.say[2] ?? 'pickup'); } if (d.pockets && d.pockets[0] === this.me) { const st = this.state.players[this.me]; if (st) st.pockets = d.pockets[1]; } if (d.fishing && d.fishing[0] === this.me) { this.fishingLocal = d.fishing[1]; } }
  announce(text) { this.bellText = text; this.bellT = 4; this.ctx.audio.play('reveal'); }
  send(ev) { this.net.send({ t: 'ev', ...ev }); this.applyLocal(ev); }
  applyLocal(ev) { if (ev.say && ev.say[0] === this.me) { this.toast = ev.say[1]; this.toastT = 2.4; this.ctx.audio.play(ev.say[2] ?? 'pickup'); } if (ev.bell) this.announce(ev.bell); if (ev.fishing && ev.fishing[0] === this.me) this.fishingLocal = ev.fishing[1]; }
  /** Host: the one verb. Contextual on what's nearest. */
  act(id) {
    const p = this.state.players[id]; if (!p || this.state.ended || this.hub.time() < 0) return; const near = (x, z, r) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r; const say = (s, snd) => ({ say: [id, s, snd] });
    if (p.fishing) { if (p.fishing.stage === 'bite') { const it = this.fishSpot.gold ? 'goldfish' : 'fish'; p.fishing = null; if (this.addPocket(p, it, id)) { p.stats.fish++; this.send({ ...say(it === 'goldfish' ? 'The golden fish!' : 'You caught a fish. Sorry, fish.', 'splash'), fishing: [id, null] }); if (it === 'goldfish') { this.fishSpot.gold = false; } } } else { p.fishing = null; this.send({ ...say('Too soon. It has told the others.', 'flee'), fishing: [id, null] }); } return; }
    if (near(STALL[0], STALL[1] + 1, 2.4) && p.pockets.length) { let sum = 0; const o = this.state.order; for (const it of p.pockets) { let v = VALUE[it]; if (o && (o.want === it || (o.want === 'fish' && it === 'goldfish'))) { v *= 2; this.state.order = null; this.state.orderT = 15; this.send({ order: null }); } sum += v; } p.banked += sum; p.stats.sold += sum; p.pockets = []; this.net.send({ t: 'ev', pockets: [id, []] }); this.send(say(`Sold! +${sum} beans`, 'reveal')); return; }
    if (p.pockets.length >= SIZE) { this.send(say('Your pockets are full. Sell at the stall!', 'uiNo')); return; }
    const mayorHit = near(this.mayorX, 8.4, 1.4); if (mayorHit && p.bumpT <= 0) { p.bumpT = 30; p.banked += 150; p.stats.bumps++; this.send(say('The Mayor tips his sash. +150 beans', 'plume')); return; }
    for (const b of this.bugs) if (b.alive && near(b.x, b.z, 1.8)) { b.alive = false; b.back = 20; p.stats.bugs++; this.addPocket(p, 'bug', id); this.send({ bug: [b.i, false], ...say('Swing! Got a butterfly.', 'netHit') }); return; }
    for (const tr of this.trees) if (near(tr.x, tr.z, 1.5)) { if (tr.fruit > 0) { tr.fruit--; tr.cool = 18; p.stats.pears++; this.addPocket(p, tr.rich ? 'goldpear' : 'pear', id); if (tr.fruit === 0) tr.rich = false; this.send({ tree: [tr.i, tr.fruit, tr.rich], ...say('Shake! A pear falls on you.', 'shake') }); } else this.send(say('Nothing left. It looks at you.', 'shake')); return; }
    for (const c of this.cracks) if (c.alive && near(c.x, c.z, 1.3)) { c.alive = false; p.stats.fossils++; this.addPocket(p, 'fossil', id); this.send({ crack: c.i, ...say('Dig! A fossil, or a very confident potato.', 'dig') }); return; }
    for (const f of this.flowers) if (f.alive && near(f.x, f.z, 1.2)) { f.alive = false; this.addPocket(p, 'flower', id); this.send({ flower: f.i, ...say('Picked. It will die, but pretty.', 'pickup') }); return; }
    const facing = [p.x + Math.sin(p.f) * 2, p.z + Math.cos(p.f) * 2]; if (this.place.isWater(facing[0], facing[1]) || this.place.isWater(p.x, p.z + 1.6) || this.place.isWater(p.x + 1.6, p.z)) { p.fishing = { stage: 'wait', t: 1 + Math.random() * 2 }; this.send({ ...say('Cast…', 'cast'), fishing: [id, 'wait'] }); return; }
    this.send(say('Nothing here. Try a tree, a crack, the water or the stall.', 'uiNo'));
  }
  addPocket(p, it, id) { if (p.pockets.length >= SIZE) { this.send({ say: [id, 'Your pockets are full!', 'uiNo'] }); return false; } p.pockets.push(it); this.net.send({ t: 'ev', pockets: [id, p.pockets.slice()] }); return true; }
  hostFixed(dt) {
    const s = this.state, t = this.hub.time(); if (t < 0 || s.ended) return; s.time = t;
    for (const p of Object.values(s.players)) { p.bumpT = Math.max(0, p.bumpT - dt); if (p.fishing) { p.fishing.t -= dt; if (p.fishing.stage === 'wait' && p.fishing.t <= 0) { p.fishing = { stage: 'bite', t: 0.9 }; this.send({ say: [p.id, 'Bite! Press now!', 'bite'], fishing: [p.id, 'bite'] }); } else if (p.fishing.stage === 'bite' && p.fishing.t <= 0) { p.fishing = null; this.send({ say: [p.id, 'It got away.', 'flee'], fishing: [p.id, null] }); } } }
    for (const tr of this.trees) if (tr.fruit < 2) { tr.cool -= dt; if (tr.cool <= 0) { tr.fruit++; tr.cool = 18; this.send({ tree: [tr.i, tr.fruit, tr.rich] }); } }
    for (const b of this.bugs) if (!b.alive) { b.back -= dt; if (b.back <= 0) { b.alive = true; this.send({ bug: [b.i, true] }); } }
    s.orderT -= dt; if (!s.order && s.orderT <= 0) { const rng = this.hub.rng('order' + Math.floor(t / 1000)); const o = ORDERS[Math.floor(rng() * ORDERS.length)]; s.order = { who: o[0], want: o[1], text: `${o[2]}: double beans!` }; s.orderT = 25; this.send({ order: s.order }); }
    if (s.order && s.orderT <= 0) { s.order = null; s.orderT = 10; this.send({ order: null }); }
    const moments = [[60000, 'gold'], [150000, 'rich'], [240000, 'gold']]; s.bellI = s.bellI ?? 0; if (s.bellI < moments.length && t >= moments[s.bellI][0]) { const m = moments[s.bellI][1]; s.bellI++; if (m === 'gold') { this.fishSpot.gold = true; this.send({ bell: 'The bell rings! A golden fish in the pond!' }); } else { const tr = this.trees[Math.floor(this.hub.rng('rich')() * this.trees.length)]; tr.rich = true; tr.fruit = 2; this.send({ tree: [tr.i, 2, true], bell: 'The bell rings! A rich tree in the orchard!' }); } }
    this.mayorX = 11 + (t / ROUND_MS) * 10; const bellAt = Math.min(ROUND_MS, (this.hub.limitMs ?? ROUND_MS) - 5000); if (t >= bellAt) this.finish();
    this.fishSpot.x = 5.5 + Math.sin(t / 2000) * 2; this.fishSpot.z = 18.5 + Math.cos(t / 3000) * 1.6;
    this.snapT = (this.snapT ?? 0) - dt; if (this.snapT <= 0) { this.snapT = 0.1; this.net.send({ t: 'snap', time: Math.round(t), mx: +this.mayorX.toFixed(2), fx: +this.fishSpot.x.toFixed(1), fz: +this.fishSpot.z.toFixed(1), gold: this.fishSpot.gold, p: Object.values(s.players).map((p) => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.f.toFixed(2), p.a, p.banked, p.pockets.length]) }, { reliable: false }); }
  }
  finish() { const s = this.state; if (s.ended || !this.isHost) return; s.ended = true; const players = Object.values(s.players).filter((p) => this.hub.players.some((q) => q.id === p.id)); const scoreOf = (p) => p.banked + Math.floor(p.pockets.reduce((a, it) => a + VALUE[it], 0) / 2); const scores = {}; const stats = {}; for (const p of players) { scores[p.id] = scoreOf(p); stats[p.id] = { Sold: p.stats.sold, Fish: p.stats.fish, Pears: p.stats.pears }; } const groups = new Map(); for (const p of players) { const k = scores[p.id]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p.id); } const standings = [...groups.keys()].sort((a, b) => b - a).map((k) => groups.get(k)); const awards = []; for (const [title, f] of AWARDS) { let best = null, bv = 0; for (const p of players) { const v = f(p.stats); if (v > bv) { bv = v; best = p; } } if (best && awards.length < 3 && !awards.some((a) => a.id === best.id)) awards.push({ id: best.id, title, detail: `${bv}` }); } this.hub.finish({ standings, scores, stats, awards }); }
  onEnd() { this.ended = true; this.state.ended = true; this.ctx.audio.stopMusic(); this.ctx.audio.stopLoops(); window.removeEventListener('keydown', this.key); window.removeEventListener('pointerdown', this.tap); }
  fixedUpdate(ctx, dt) {
    if (this.isHost) this.hostFixed(dt);
    if (this.server || this.ended || this.touchSpectator) return; const t = this.hub.time(); const me = this.state.players[this.me]; if (!me || t < 0) return;
    const ax = ctx.input.moveAxis(); const m = Math.min(1, Math.hypot(ax.x, ax.y)); this.moving = false; if (m > 0.1) { const b = ctx.engine.camera.groundBasis(); const fx = b.right.x * ax.x + b.forward.x * ax.y, fz = b.right.z * ax.x + b.forward.z * ax.y, l = Math.hypot(fx, fz) || 1; const sp = (ctx.input.isDown('ShiftLeft', 'PadCircle') ? 6 : 4.2) * dt; const [nx, nz] = this.place.move(me.x, me.z, (fx / l) * sp, (fz / l) * sp, 0.3); me.x = nx; me.z = nz; me.f = Math.atan2(fx, fz); this.moving = true; }
    me.a = this.moving ? 1 : 0;
    if (!this.isHost) { this.meT = (this.meT ?? 0) - dt; if (this.meT <= 0) { this.meT = 0.1; this.net.send({ t: 'me', x: +me.x.toFixed(2), z: +me.z.toFixed(2), f: +me.f.toFixed(2), a: me.a }, { reliable: false }); } }
  }
  update(ctx, dt) {
    const c = this.ctrl, t = this.hub.time(); c.begin(dt); const h = ctx.hud; this.water.update(ctx.time);
    if (!this.started && !this.ended) { if (c.input.wasPressed('PadCross')) this.hub.answer('ready'); if (c.input.wasPressed('PadTriangle')) this.hub.answer('more'); }
    const pressed = !c.input.isDown('PadCreate') && (c.input.wasPressed('PadCross') || c.input.wasPressed('KeyE') || c.input.wasPressed('Enter') || c.input.wasPressed('Space'));
    if (this.started && t >= 0 && pressed && !this.server && !this.ended && !this.touchSpectator) { if (this.isHost) this.act(this.me); else this.net.send({ t: 'do' }); const me = this.avatars.get(this.me); me?.a.play('PickUp', { then: 'Idle', restart: true }); }
    const now = performance.now() - 120;
    for (const [id, v] of this.avatars) { const st = this.state.players[id]; if (!st) continue; let x = st.x, z = st.z, f = st.f, a = st.a; if (!this.isHost && id !== this.me) { const hs = v.hist; if (hs.length >= 2) { let A = hs[0], B = hs[hs.length - 1]; for (let i = 0; i < hs.length - 1; i++) if (hs[i].t <= now && hs[i + 1].t >= now) { A = hs[i]; B = hs[i + 1]; break; } const k = Math.max(0, Math.min(1, (now - A.t) / Math.max(1, B.t - A.t))); x = A.x + (B.x - A.x) * k; z = A.z + (B.z - A.z) * k; f = B.f; a = B.a; } else if (hs.length) { x = hs[0].x; z = hs[0].z; f = hs[0].f; a = hs[0].a; } } else if (id === this.me && !this.isHost) { const last = v.hist[v.hist.length - 1]; if (last && Math.hypot(last.x - st.x, last.z - st.z) > 3) { st.x = last.x; st.z = last.z; x = st.x; z = st.z; } }
      if (this.isHost && id !== this.me) { v.x += (x - v.x) * Math.min(1, dt * 12); v.z += (z - v.z) * Math.min(1, dt * 12); x = v.x; z = v.z; } v.a.place(x, this.place.heightAt(x, z), z); v.a.targetFacing = f; if (v.a.onceT <= 0 || a) v.a.play(a ? 'Jog' : 'Idle'); v.a.update(dt); }
    for (let i = 0; i < this.trees.length; i++) { const tr = this.trees[i]; tr.fm.forEach((m, k) => { m.visible = k < tr.fruit; }); } this.cracks.forEach((c0, i) => { this.crackM[i].visible = c0.alive; }); this.flowers.forEach((f, i) => { this.flowerM[i].visible = f.alive; }); this.bugs.forEach((b, i) => { const ph = ctx.time * 0.7 + i; b.x = b.ax + Math.sin(ph) * 2; b.z = b.az + Math.cos(ph * 1.3) * 2; this.bugM[i].position.set(b.x, 0.8 + Math.sin(ctx.time * 3 + i) * 0.2, b.z); this.bugM[i].visible = b.alive; });
    this.shadow.position.set(this.fishSpot.x, -0.27, this.fishSpot.z); this.shadow.material = toonMaterial(this.fishSpot.gold ? PALETTE.sand : PALETTE.night); this.mayor.place(this.mayorX, 0, 8.4); this.mayor.targetFacing = Math.PI / 2; this.mayor.update(dt);
    const meA = this.avatars.get(this.me); const tgt = this.target; if (this.server || !meA) { const a = ctx.time * 0.1; tgt.set(16 + Math.cos(a) * 6, 1, 12 + Math.sin(a) * 4); if (!this.camSet) { this.camSet = true; ctx.engine.setCamera({ preset: 'iso', yaw: 45, pitch: 35, zoom: 0.8, minZoom: 0.8, maxZoom: 0.8 }, { syncUrl: false }); } } else tgt.set(meA.a.root.position.x, 1, meA.a.root.position.z);
    this.toastT = Math.max(0, (this.toastT ?? 0) - dt); this.bellT = Math.max(0, (this.bellT ?? 0) - dt);
    h.clear(); this.hudDraw(h, t);
  }
  hudDraw(h, t) {
    const hub = this.hub, ctx = this.ctx; if (!this.started) return this.cardDraw(h); const s = this.state;
    for (const [id, v] of this.avatars) { const pos = v.a.root.position; const P = pos.clone().setY(pos.y + 1.7).project(ctx.engine.camera.camera); const x = Math.round((P.x + 1) * 240), y = Math.round((1 - P.y) * 135); const w = textWidth(v.name) + 6; h.rect(x - w / 2, y - 9, w, 11, 'ink'); drawText(h, x, y - 7, v.name, { color: new THREE.Color(v.color).getHex(), align: 'center' }); }
    let sx = 12; for (const [id, v] of this.avatars) { const st = s.players[id]; const b = st?.banked ?? 0; const label = `${v.name}: ${b}`; const w = textWidth(label) + 14; h.rect(sx, 12, w, 14, 'ink'); h.rect(sx, 12, 4, 14, new THREE.Color(v.color).getHex()); drawText(h, sx + 8, 15, label, { color: 'white' }); sx += w + 4; }
    const left = Math.max(0, Math.ceil((Math.min(ROUND_MS, (hub.limitMs ?? ROUND_MS) - 5000) - Math.max(0, t)) / 1000)); const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; panel(h, 216, 30, 48, 15); drawText(h, 240, 34, mm, { color: 'navy', align: 'center' });
    if (t < 0) { const n = Math.ceil(-t / 1000); drawText(h, 240, 100, String(n), { color: 'white', align: 'center', scale: 6, shadow: 'ink' }); }
    if (s.order) { const w = textWidth(s.order.text) + 12; panel(h, 240 - w / 2, 48, w, 15); drawText(h, 240, 52, s.order.text, { color: 'red', align: 'center' }); }
    if (this.bellT > 0) { const w = textWidth(this.bellText) + 12; panel(h, 240 - w / 2, 68, w, 15); drawText(h, 240, 72, this.bellText, { color: 'orange', align: 'center' }); }
    if (this.toastT > 0 && this.toast) { const w = textWidth(this.toast) + 12; panel(h, 240 - w / 2, 214, w, 15); drawText(h, 240, 218, this.toast, { color: 'ink', align: 'center' }); }
    const me = s.players[this.me]; if (me && !this.server) { const n = me.pockets?.length ?? 0; panel(h, 12, 240, 92, 18); for (let i = 0; i < SIZE; i++) { h.rect(18 + i * 16, 244, 13, 10, i < n ? 'orange' : 'mist'); } promptRow(h, 468, 245, [['confirm', 'Do the thing']], { align: 'right', back: 'ink' }); } if (this.touchSpectator) { panel(h, 110, 236, 260, 18); drawText(h, 240, 241, 'Controller or keyboard required', { color: 'red', align: 'center' }); }
  }
  cardDraw(h) { const c = this.card ?? {}; h.rect(0, 0, 480, 270, 'navy'); panel(h, 40, 16, 400, 234); drawText(h, 240, 26, 'The Bean Bazaar', { color: 'navy', align: 'center', scale: 3 }); drawText(h, 240, 56, 'Bank the most beans before the last bell.', { color: 'ink', align: 'center' }); drawText(h, 240, 70, 'Unbanked beans count half. Shake, dig, cast, swing, then sell at the stall.', { color: 'slate', align: 'center' }); let y = 90; for (const [id, v] of this.avatars) { h.rect(70, y, 340, 18, 'white'); h.rect(70, y, 8, 18, new THREE.Color(v.color).getHex()); drawText(h, 84, y + 5, v.name, { color: 'ink' }); drawText(h, 404, y + 5, c.ready?.includes(id) ? 'Ready!' : 'Getting ready', { color: c.ready?.includes(id) ? 'green' : 'slate', align: 'right' }); y += 20; } drawText(h, 240, 180, 'Move: stick or WASD. Do the thing: Cross or E. Run: Circle or Shift.', { color: 'ink', align: 'center' }); const left = c.left == null ? (c.paused ? 'Paused' : c.starting ? 'Starting…' : '') : `${Math.ceil(c.left / 1000)}s`; drawText(h, 240, 196, left, { color: 'red', align: 'center', scale: 2 }); h.rect(70, 218, 150, 20, 'navy'); drawText(h, 145, 224, 'Ready (Enter / Cross)', { color: 'white', align: 'center' }); h.rect(260, 218, 150, 20, c.asked ? 'red' : 'slate'); drawText(h, 335, 224, `More time (T / Triangle)`, { color: 'white', align: 'center' }); }
  cameraTarget() { return this.target; }
  status() { return `round t=${Math.round(this.hub.time())}`; }
}
const localStorageHasAudio = () => { try { return !!localStorage.getItem('pixel-engine:audio'); } catch { return false; } };
export async function startRound(hub, options) {
  const info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); if (!info) return false;
  try { await Engine.start(new RoundGame(hub), options('medium')); } catch (e) { hub.fail(String(e?.message ?? e)); }
  return true;
}
