// The bus, the Big City boulevard, its crowd and neon, and the eight venues.
import { THREE, PALETTE, mergeStaticMeshes, toonMaterial, LOOK_PRESETS, buildModel } from '../engine.js';
import { shopfrontDef } from '../art/models.js';
import { part, mat } from '../world/scenery.js';
import { defRoom, ROOMS, furnMesh } from '../world/rooms.js';
import { registerPlace, PLACES } from '../world/places.js';
import { Actor } from '../actors/actor.js';
import { HOSTS } from '../data/neighbours.js';
import { textRows } from '../ui/font.js';
import { BUS_VERSES, CHORUS, HOST_LINES } from '../data/dialogue.js';
import { item, CLOTHES } from '../data/items.js';
import { ART, FISH, BUGS } from '../data/collect.js';
import { ListScreen, PocketsScreen, confirmBox } from '../ui/screens.js';
import { LookScreen } from './story.js';
import { W, H } from '../ui/controls.js';
import { singNote } from '../audio/voice.js';
import { seeded } from '../core/rng.js';
import { SPECIES_LIST } from '../art/critter.js';
import { fmtClock } from '../core/calendar.js';
const CITY = { id: 'city', ox: 500, oz: 0, w: 46, d: 26 };
const VENUES = [
  { room: 'salon', name: 'Snip & Gossip', x: 5, color: 'sky', neon: 'cyan', host: 'fleece', open: () => true }, { room: 'couture', name: 'Maison Plume', x: 11, color: 'plum', neon: 'red', host: 'flavia', open: () => true },
  { room: 'theatre', name: 'Palace Theatre', x: 18, color: 'red', neon: 'sand', host: 'bellows', open: (g) => g.hour >= 17 || g.hour < 3 }, { room: 'auction', name: "Pemberton's", x: 25, color: 'orange', neon: 'lime', host: 'pemberton', open: (g) => g.hour >= 10 && g.hour < 18 },
  { room: 'bureau', name: 'Burrows Bureau', x: 32, color: 'slate', neon: 'sky', host: 'brisket', open: () => true }, { room: 'cafe', name: 'Daily Grind', x: 38, color: 'sand', neon: 'orange', host: 'lou', open: () => true },
  { room: 'magda', name: "Magda's", x: 43, color: 'night', neon: 'plum', host: 'magda', open: (g) => g.hour >= 19 || g.hour < 4, alley: true },
];
const rowsFor = () => { const r = []; for (let z = 0; z < CITY.d; z++) { let s = ''; for (let x = 0; x < CITY.w; x++) s += (x < 1 || x >= CITY.w - 1 || z < 8 && !(x >= 41 && x <= 44) || z >= 24) ? '#' : '.'; r.push(s); } return r; };
export const city = {
  built: false, group: null, crowd: [], cur: null,
  build(g) {
    if (this.built) return; this.built = true; registerPlace({ ...CITY, rows: rowsFor(), city: true }); const grp = new THREE.Group(); grp.position.set(CITY.ox, 0, 0); grp.visible = false; this.group = grp; g.ctx.scene.add(grp);
    const road = part(grp, 'box', [CITY.w, 0.2, 8], [CITY.w / 2, -0.1, 12], 'night'); part(grp, 'box', [CITY.w, 0.12, 5], [CITY.w / 2, -0.04, 6.5], 'slate'); part(grp, 'box', [CITY.w, 0.12, 10], [CITY.w / 2, -0.04, 20], 'slate'); part(grp, 'box', [10, 0.14, 7], [22, -0.03, 18], 'mist');
    for (let i = 0; i < 10; i++) part(grp, 'box', [1.6, 0.04, 0.15], [3 + i * 4.3, 0.02, 12.2], 'white');
    const glowMat = (c) => new THREE.MeshBasicNodeMaterial({ color: PALETTE[c] }); this.signs = []; this.lampLights = [];
    for (const v of VENUES) {
      const w = 5, h = 5.2, d = 3; const x0 = v.x - 2; const sf = buildModel(shopfrontDef, { params: { w, h, d }, palette: { wall: v.color } }).object; sf.position.set(x0 + w / 2, 0, 4.2); grp.add(sf);
      part(grp, 'box', [1.4, 2.4, 0.2], [v.x + 0.5, 1.2, 5.8], 'ink'); const glow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), glowMat(v.neon)); glow.position.set(v.x + 0.5, 1.2, 5.9); grp.add(glow);
      this.neonSign(grp, v.name, v.x + 0.5, 4.2, 6.0, v.neon, v.alley); v.door = [v.x + 0.5, 6.4]; if (v.alley) { part(grp, 'box', [4, 0.2, 6], [43, -0.02, 5], 'night'); }
    }
    // lamps and fronts lights
    for (let i = 0; i < 6; i++) { const x = 6 + i * 7; part(grp, 'cyl', [0.15, 3, 0.15], [x, 1.5, 9.4], 'ink'); const l = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), glowMat('sand')); l.position.set(x, 3.1, 9.4); grp.add(l); this.lampLights.push([CITY.ox + x, 3.1, 9.4]); }
    // bus stop (west) and the tarot tent
    part(grp, 'box', [3, 0.2, 2], [2.5, 0.1, 12], 'mist'); part(grp, 'box', [0.15, 2.2, 0.15], [1.1, 1.1, 11], 'sand'); part(grp, 'box', [3, 0.15, 2.2], [2.5, 2.3, 12], 'red'); this.neonSign(grp, 'BUS', 2.5, 3.4, 11, 'lime');
    const tent = new THREE.Group(); part(tent, 'cone', [4, 2.6, 4], [0, 1.3, 0], 'plum'); part(tent, 'box', [1, 1.6, 0.1], [0, 0.8, 1.9], 'night'); tent.position.set(22, 0, 17); grp.add(tent);
    this.neonSign(grp, 'FORTUNES', 22, 3.3, 17.5, 'sand');
    for (let i = 0; i < 8; i++) { const sk = part(grp, 'box', [3, 4 + (i * 7) % 5, 2], [3 + i * 5.6, 3 + (i * 7) % 5 / 2, 1.0], ['navy', 'night', 'plum', 'slate'][i % 4]); }
    // crowd
    const r = seeded('crowd', 1); const LINES = ['Is this the line? It was a line when I joined.', 'I came for the neon and stayed for the receipt.', 'Mind the pigeons. They know things.', 'Everything here is cheaper than your debt.', 'I lost my umbrella in 2019. I am still looking.', 'Have you tried the coffee? It stared back.', 'Pemberton talks so fast I bid on a chair I was sitting on.', 'The theatre is tragic. Mostly the seating.'];
    for (let i = 0; i < 14; i++) { const sp = SPECIES_LIST.filter(s => s !== 'person' && s !== 'bat')[Math.floor(r() * 24)]; const a = new Actor({ species: sp, c: ['sand', 'orange', 'mist', 'plum', 'lime', 'sky', 'white', 'slate'][Math.floor(r() * 8)], a: 'ink', outfit: ['red', 'blue', 'plum', 'navy', 'sand', 'cyan'][i % 6], hat: i % 4 === 0 ? 'orange' : null }); const z = 8.6 + r() * 4; const x = 3 + r() * 40; grp.add(a.root); this.crowd.push({ a, x, z, dir: r() < 0.5 ? 1 : -1, speed: 0.8 + r() * 0.7, line: LINES[i % LINES.length], pause: r() * 5, name: ['Passer-by', 'Pedestrian', 'Commuter'][i % 3] }); }
    { const mu = new Actor({ species: 'lemur', c: 'orange', a: 'ink', outfit: 'plum', hat: 'red', name: 'Street musician' }); mu.setPos(30, 14.6); mu.yaw = Math.PI; mu.play('Sway'); grp.add(mu.root); this.musician = mu; part(grp, 'box', [0.5, 0.3, 0.4], [30.9, 0.15, 14.6], 'sand'); }
    // pigeons
    this.pigeons = []; for (let i = 0; i < 8; i++) { const m = part(grp, 'ball', [0.3, 0.25, 0.4], [18 + i, 0.15, 19 + (i % 3)], 'mist'); this.pigeons.push({ m, home: [18 + i * 1.1, 19 + (i % 3)], flee: 0 }); }
    for (const v of VENUES) this.defVenue(g, v);
  },
  neonSign(grp, text, cx, y, z, color, vertical) {
    const rows = textRows(text.toUpperCase()).rows; const px = 0.11; const w = rows[0].length * px; const meshes = []; const m = new THREE.MeshBasicNodeMaterial({ color: PALETTE[color] });
    for (let r = 0; r < 7; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') { const b = new THREE.Mesh(new THREE.BoxGeometry(px, px, 0.08), m); b.position.set(cx - w / 2 + c * px, y + (6 - r) * px, z); meshes.push(b); }
    const out = mergeStaticMeshes(meshes); for (const o of out) grp.add(o); this.signs?.push(out);
  },
  defVenue(g, v) {
    const def = defRoom({ id: v.room, w: 10, d: 8, floor: ['salon', 'couture'].includes(v.room) ? 'mist' : 'plum', wall: v.color === 'night' ? 'plum' : v.color, music: { salon: 'salon', couture: 'couture', theatre: 'theatre', auction: 'auction', bureau: 'bureau', cafe: 'cafe', magda: 'magda' }[v.room], name: v.name, exitTo: 'city', exitDoor: v.room });
    ROOMS[v.room].venue = v;
  },
  cityPlaceName: 'The Big City',
  scan(g) {
    const p = g.player; const f = p.facing ?? { x: 0, z: 1 };
    if (p.pos.x - 500 < 4.5 && p.pos.z > 10 && p.pos.z < 14.5) return { kind: 'custom', label: 'Take the bus home', run: (gg) => gg.sys.bus.goHome(gg) };
    for (const v of VENUES) { const dx = this.group.position.x + v.door[0] - p.pos.x, dz = v.door[1] - p.pos.z; if (Math.hypot(dx, dz) < 1.6) { return { kind: 'custom', label: v.open(g) ? `Enter ${v.name}` : `${v.name} (closed)`, run: async (gg) => { if (!v.open(gg)) { await gg.say(null, `${v.name} is closed. A sign explains this in neon. The neon is not apologetic.`); return; } await gg.sys.places.go(gg, v.room, 'door', 'city'); } }; } }
    if (Math.hypot(p.pos.x - 522, p.pos.z - 18.8) < 2) return { kind: 'custom', label: 'Visit Madame Nibbles', run: (gg) => gg.sys.venues2.fortune(gg) };
    for (const c of this.crowd) if (Math.hypot(c.a.x - p.pos.x, c.a.z - p.pos.z) < 1.8) return { kind: 'custom', label: 'Eavesdrop', run: async (gg) => { await gg.say({ name: c.name, type: 'hearth', pitch: 0.8 + c.speed * 0.5, actor: c.a }, c.line); } };
    return null;
  },
  show(g, on) { this.group.visible = on; },
  update(g, dt) {
    if (g.place !== 'city' || !this.built) return; const t = g.t;
    for (const c of this.crowd) { c.pause -= dt; if (c.pause > 0) { c.a.play('Idle'); } else { c.x += c.dir * c.speed * dt; if (c.x > 44 || c.x < 2) { c.dir *= -1; c.pause = 1 + g.cosmetic() * 3; } else if (g.cosmetic() < dt * 0.15) c.pause = 1 + g.cosmetic() * 3; c.a.locomote(c.speed, 'walk'); c.a.yaw = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } c.a.setPos(c.x, c.z); c.a.update(dt, t); }
    if (this.musician) { this.musician.update(dt, t); this.mt = (this.mt ?? 0) - dt; if (this.mt <= 0 && Math.hypot(g.player.pos.x - 530, g.player.pos.z - 14.6) < 14) { this.mt = 0.7; g.sfx('sparkle', { pitch: [0, 4, 7, 4, 2, 5][Math.floor(g.t) % 6], volume: 0.35 }); } }
    const p = g.player.pos; for (const pg of this.pigeons) { const dx = pg.m.position.x - (p.x - 500), dz = pg.m.position.z - p.z; if (Math.hypot(dx, dz) < (g.player.mode === 'run' ? 4 : 1.5)) pg.flee = 1.6; if (pg.flee > 0) { pg.flee -= dt; pg.m.position.y = 0.4 + Math.sin(pg.flee * 6) * 0.3 + (1.6 - pg.flee) * 1.2; pg.m.position.x += Math.sign(dx || 1) * 3 * dt; } else { pg.m.position.y = 0.15; pg.m.position.x += (pg.home[0] - pg.m.position.x) * dt; } }
  },
  setNightLook(g, on) { if (on === this.nightLook) return; this.nightLook = on; g.engine.setLook(on ? { ...LOOK_PRESETS.none, scene: [{ id: 'bloom', params: { amount: 0.3 } }] } : LOOK_PRESETS.none); },
  /** The City's own night sky. */
  applyLight(g) {
    const night = g.hour >= 18.5 || g.hour < 5.5; const e = g.engine; if (night) { e.sun.intensity = 0.35; e.sun.color.setHex(PALETTE.sky); e.ambient.color.setHex(PALETTE.navy); e.ambient.intensity = 1.1; if (!this.lights) this.lights = this.lampLights.map(([x, y, z], i) => g.ctx.lights.request({ position: [x, y, z], color: [0xff6bb5, 0x6bd6ff, 0xffd84a][i % 3], intensity: 6, radius: 8, priority: 4 })); } else { this.lights?.forEach(l => l.release()); this.lights = null; }
    this.setNightLook(g, night);
  },
};
export const bus = {
  async ride(g) {
    const w = g.world; const hester = g.sys.venues.host('hester'); await g.say(hester, w.flags.rodeBus ? "Back again. The bus has no memory. I have a very detailed one." : 'Beans? No. The fare is listening. Sit. I sing.'); w.flags.rodeBus = true;
    g.cutsceneStart(); g.setMusic('bus'); g.sfx('bus'); const s = g.engine.screen; try { await s.cover('iris', { duration: 0.4 }); } catch {} g.noHud = true;
    // verses from memory
    const verses = []; const m = [...w.memory].reverse(); const has = (t) => m.find(x => x.t === t); if (has('catch')) verses.push(BUS_VERSES[0]); if (has('sting')) verses.push(BUS_VERSES[1]); if (w.donated && Object.keys(w.donated).length) verses.push(BUS_VERSES[2]); verses.push(BUS_VERSES[3]); if (has('gift')) verses.push(BUS_VERSES[4]); verses.push(BUS_VERSES[(g.rng() * 8) | 0]);
    const pick = verses.slice(0, 3); pick.push(CHORUS[0]); let i = 0; const stage = { text: '' }; g.busText = stage; g.engine.screen.reveal('iris', { duration: 0.4 }).catch?.(() => {});
    this.scene(g, true); const skip = () => g.ui.c.pressed('confirm') || g.ui.c.pressed('back');
    for (const line of pick) { const words = line.split(/,|\./).map(x => x.trim()).filter(Boolean); for (const piece of words) { stage.text = '♪ ' + piece + ' ♪'; for (let k = 0; k < piece.length; k += 3) singNote(g.ctx.audio, g.settings, { type: 'warm', pitch: 0.85, voice: 'warm' }, [0, 2, 4, 7, 4, 2][(k / 3) % 6] - 2, 'aeiou'[k % 5]); const t0 = g.t; await new Promise(r => { const iv = setInterval(() => { if (g.t - t0 > 1.9 + piece.length * 0.03 || skip()) { clearInterval(iv); r(); } }, 50); }); if (skip() && (i++, true)) break; } if (skip()) break; }
    stage.text = ''; g.busText = null; this.scene(g, false); try { await s.cover('iris', { duration: 0.3 }); } catch {} g.noHud = false;
    await this.arriveCity(g, true); try { await s.reveal('iris', { duration: 0.4 }); } catch {} g.cutsceneEnd(); await g.say(hester, "City. Enjoy the neon. I'll be here. I'm always here. It's a bus.");
  },
  scene(g, on) { g.busOn = on; },
  async arriveCity(g, quiet) {
    g.sys.city.build(g); g.sys.places.showOnly(g, 'city'); g.place = 'city'; g.sys.city.show(g, true); const p = g.player; p.pos.x = 505; p.pos.z = 12.5; p.setFacing(1, 0); g.target.set(p.pos.x, 0.8, p.pos.z); g.sys.city.applyLight(g); g.musicName = ''; g.setMusic(g.hour >= 18.5 || g.hour < 5.5 ? 'cityNight' : 'cityDay'); g.world.flags.cityVisited = true; g.autosave?.('city');
    if (!quiet) { g.ui.clear(); }
  },
  async goHome(g) { g.cutsceneStart(); const s = g.engine.screen; try { await s.cover('iris', { duration: 0.3 }); } catch {} g.sys.city.setNightLook(g, false); g.sys.city.lights?.forEach(l => l.release()); g.sys.city.lights = null; g.place = 'town'; g.sys.places.showOnly(g, 'town'); g.sys.time.visual(g, 0, true); g.player.pos.x = 5; g.player.pos.z = 23; g.target.set(5, 0.8, 23); g.updateMusic(true); g.sfx('bus'); g.autosave?.('city'); try { await s.reveal('iris', { duration: 0.3 }); } catch {} g.cutsceneEnd(); },
};
