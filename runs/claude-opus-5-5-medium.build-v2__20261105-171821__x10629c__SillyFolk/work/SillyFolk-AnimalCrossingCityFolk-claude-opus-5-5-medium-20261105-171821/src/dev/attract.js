// Attract mode: a looping scripted demo on a throwaway save. Cheats freely. Any input exits.
import { G, bus } from '../state.js';
import { UI, panel, promptRow } from '../ui/kit.js';
import { drawText } from '../ui/font.js';
import { Script, say, until, Toasts } from '../ui/dialogue.js';
import { newWorld, addEnt, info, giveItem } from '../core/world.js';
import { setPlace, ensureRoom, Trans } from '../world/places.js';
import { LANDMARK, CITY } from '../world/layout.js';
import { Nature } from '../systems/nature.js';
import { shakeTree, toolDown, toolUp, equip, setTimeout0 } from '../systems/interact.js';
import { NPC } from '../actors/npcs.js';
import { ITEMS, TOOL_ORDER, FISH_LIST, BUG_LIST, FOSSIL_LIST, EMOTES } from '../data/items.js';
import { TYPE_LINES, UNIQUE, GANDER } from '../data/lines.js';
import { CAST } from '../data/cast.js';
import { syncWing, upgradeHome } from '../systems/services.js';
import { placeFurn, homeState } from '../systems/home.js';
import { fireworkShow } from '../systems/year.js';
import { M } from '../audio/music.js';
import { rideScene } from '../systems/city.js';
import { buildModel, THREE, glowMaterial, PALETTE } from '../engine.js';
import { rngOf } from '../core/util.js';
const FEST = { };
G.attractBeat = () => Attract.beat;
export const Attract = {
  run: null, beat: '', tag: 0,
  start() { const game = G.game; const w = newWorld({ seed: 'demo', name: 'Demo', town: 'Attract' }); G.demo = { noTargets: true }; game.useWorld(w); w.clock.frozen = false; w.day1.done = true; w.p.tools = TOOL_ORDER.slice(); w.p.beans = 999999; w.p.emotes = EMOTES.slice(); upgradeHome(2); w.p.debt = 80000; G.player.actor.visible = true; G.player.state = 'free'; G.player.rebuild(); setPlace('town', 24, 44, Math.PI); G.view.zoomTarget = 1.6; this.run = Script.run(this.loop(), { background: true }); this.alive = true; },
  stop() { this.alive = false; const i = Script.list.indexOf(this.run); if (i >= 0) Script.list.splice(i, 1); Script.clear(); UI.clear(); G.fest = null; M.override = null; G.view.setFocus = null; rideScene(false); for (const o of this.temp ?? []) o.parent?.remove(o); this.temp = []; },
  update() { return this.alive; },
  *jump(day, minute, place, x, z, f = 0) { const w = G.world; if (w.clock.day !== day) G.jumpDay(day); w.clock.minute = minute; w.weather = { kind: info(w).season === 3 ? 'snow' : 'sun', from: 0, to: 24 }; G.view.lastSkyKey = null; let done = false; Trans.go(() => { setPlace(place, x, z, f); done = true; }, 'iris', 4); yield until(() => done); G.player.refreshTool(); },
  *loop() {
    const w = G.world; const p = G.player; this.temp = [];
    for (;;) {
      this.beat = 'Shake a tree. Something falls out.'; yield* this.jump(1, 9 * 60, 'town', 54, 9); const tree = Object.values(w.ents).find((e) => e.t === 'tree' && e.kind === 'pear'); if (tree) { w.p.x = tree.x; w.p.z = tree.z + 1.2; w.p.facing = Math.PI; tree.fruit = 3; shakeTree(tree); } yield 5;
      this.beat = 'Swing at a butterfly.'; equip('net'); yield* this.jump(1, 10 * 60, 'town', 24, 30); const b = Nature.spawnBug(ITEMS.cabbagefly, w.p.x + 1, w.p.z + 0.5, 0.9, 'flower'); w.p.facing = Math.atan2(1, 0.5); toolDown(); yield 1.1; toolUp(); yield 2.8; UI.clear(); Script.list.filter((s) => s !== this.run && !s.o.background).forEach((s) => Script.list.splice(Script.list.indexOf(s), 1)); p.state = 'free'; p.refreshTool(); yield 2;
      this.beat = 'Cast. Wait. Not that one. That one.'; equip('rod'); yield* this.jump(1, 11 * 60, 'town', 36.5, 30, Math.PI / 2); w.p.facing = Math.PI / 2; toolDown(); const f0 = Nature.spawnFish(ITEMS.perch, 'river', 39.5, 30); yield 3; const fg = p.fishing; if (fg) { fg.fish = f0; fg.stage = 'bite'; fg.t = 2; fg.dip = 0.3; G.ctx.audio.play('bite'); } yield 0.5; toolDown(); yield 2.6; UI.clear(); this.flush(); p.state = 'free'; p.refreshTool();
      this.beat = 'Dig the star-shaped crack.'; equip('shovel'); yield* this.jump(1, 12 * 60, 'town', 26.5, 43, Math.PI); if (!Object.values(w.ents).find((e) => e.t === 'crack' && e.first)) addEnt(w, { t: 'crack', real: 'ammonite', x: 26.5, z: 41.5 }); toolDown(); yield 3; UI.clear(); this.flush(); p.state = 'free'; p.refreshTool();
      this.beat = 'Neighbours have opinions.'; const n = 'bartleby'; const rt = NPC.rt[n]; w.npcs[n].place = 'town'; yield* this.jump(1, 13 * 60, 'town', 52, 27); rt.x = w.p.x + 1.4; rt.z = w.p.z + 0.2; rt.pause = 8; rt.talkTo = true; w.p.facing = Math.PI / 2; G.focusZoom = 2; yield say(n, UNIQUE.bartleby[1], { auto: 2 }); rt.talkTo = false; G.focusZoom = null;
      this.beat = 'Mrs. Gander would like a word.'; let r = ensureRoom('store'); yield* this.jump(1, 14 * 60, 'store', r.ox + 3, 4, Math.PI); NPC.setStaffPlaces(); G.focusZoom = 2; yield say('gander', GANDER.greet[1], { auto: 2 }); G.focusZoom = null;
      this.beat = 'Furnish your home. Everything works.'; r = ensureRoom('home'); yield* this.jump(1, 15 * 60, 'home', r.ox + 4, 5, Math.PI); const st = homeState('home'); for (const f of [{ id: 'c_sofa', x: 4, z: 1, rot: 0 }, { id: 'tv', x: 1, z: 3, rot: 1 }, { id: 'c_lamp', x: 6, z: 1, rot: 0 }, { id: 'c_rug', x: 4, z: 3, rot: 0 }]) { if (!st.furn.find((x) => x.id === f.id)) { st.furn.push(f); placeFurn(r, f); G.ctx.audio.play('thud'); yield 1.2; } } yield 2;
      this.beat = 'Give it to the museum. He may misidentify it.'; for (const it of FISH_LIST.slice(0, 8)) w.museum.fish[it.id] = 'Demo'; r = ensureRoom('m_fish'); syncWing('m_fish'); yield* this.jump(1, 16 * 60, 'm_fish', r.ox + 5, 4.6, Math.PI); yield 5; r = ensureRoom('museum'); NPC.setStaffPlaces(); yield* this.jump(1, 16 * 60, 'museum', r.ox + 5, 4.4, Math.PI); NPC.actors.quill.play('QuillBall'); yield say('quill', "Is it a fossil? It's a fossil! Or a very confident potato!", { auto: 2 });
      this.beat = 'Summer: lanterns, then fireworks.'; yield* this.jump(8, 20 * 60, 'town', 37.5, 42, Math.PI / 2); const lant = this.glows(36, (i, r) => [r.range(41.2, 43.8), -0.14, r.range(36, 50)], ['orange', 'sand', 'red', 'lime', 'sky', 'plum'], 0.14); yield 4; let lt = 0; yield until(() => { lt += 1 / 30; lant.position.z += 0.05; return lt > 2; }); yield* this.jump(8, 21 * 60, 'town', 42, 52, 0); G.view.setFocus = [33, 50, 1]; fireworkShow(); yield 7; G.view.setFocus = null; lant.parent?.remove(lant);
      this.beat = 'The bus. The driver sings. About you.'; M.override = 'bus'; G.player.actor.visible = false; G.view.town.visible = false; rideScene(true, 1); let done0 = false; yield 0.2; yield say('hester', "♪ Oh, you fished up an old boot and you sold it for ten, / and you'd do it, you'd do it, you'd do it again… ♪", { auto: 3.5 }); rideScene(false); M.override = null; G.player.actor.visible = true;
      this.beat = 'The City, after dark.'; yield* this.jump(9, 21 * 60, 'city', CITY.ox + 11, 10.5, 0); yield 7; 
      this.beat = 'Snip & Gossip. Hair, and everything else.'; r = ensureRoom('salon'); NPC.setStaffPlaces(); yield* this.jump(9, 21 * 60, 'salon', r.ox + 5, 3, Math.PI); w.p.look.hair = (w.p.look.hair + 1) % 8; G.player.rebuild(); G.ctx.audio.play('snip'); yield 2; w.p.look.hairColor = 'plum'; G.player.rebuild(); G.ctx.audio.play('snip'); yield 2;
      this.beat = "Pemberton's. Do not scratch your nose."; r = ensureRoom('auction'); NPC.setStaffPlaces(); yield* this.jump(9, 12 * 60, 'auction', r.ox + 5, 4.8, Math.PI); for (let i = 0; i < 4; i++) { p.actor.play('Wave', { then: 'Idle', restart: true }); G.ctx.audio.play('paddle'); yield 1.3; } G.ctx.audio.play('gavel'); yield 1;
      this.beat = 'The Great Soup. It has bits.'; yield* this.jump(12, 13 * 60, 'town', 24, 44.4, Math.PI); const pot = buildModel('giant-pot', {}).object; pot.position.set(LANDMARK.pot[0], 0, LANDMARK.pot[1]); G.view.town.add(pot); this.temp.push(pot); for (let i = 0; i < 4; i++) { G.ctx.audio.play('plop'); G.ctx.particles.burst('splash', [24, 1.6, 41.5]); yield 1.4; } pot.parent?.remove(pot);
      this.beat = 'Winter. Stack two snowballs. It will comment.'; yield* this.jump(14, 12 * 60, 'town', 26, 30, Math.PI); addEnt(w, { t: 'snowman', x: 26.5, z: 28.5, score: 80, head: 0.8, body: 1.1 }); G.ctx.audio.play('snowPack'); yield 6;
      this.beat = 'The Long Night. The Bell plays your tune.'; yield* this.jump(16, 23 * 60 + 30, 'town', 24, 43, Math.PI); M.override = 'longNight'; const pl = this.glows(80, (i, r) => { const a = r.range(0, 6.28), rad = r.range(1.5, 3.1); return [24 + Math.cos(a) * rad, r.range(3, 7.2), 38 + Math.sin(a) * rad]; }, ['sand', 'red', 'lime', 'sky'], 0.11); G.ctx.audio.play('fwBurst'); G.view.bellRing(); G.playChime(w.chime); yield 7; M.override = null; pl.parent?.remove(pl);
      this.beat = 'Silly Folk'; G.demo.logo = true; yield 4; G.demo.logo = false; G.jumpDay(17); 
    }
  },
  glows(n, at, cols, size) { const g = new THREE.Group(); const r = rngOf('attract-glow' + n); const mats = cols.map((c) => glowMaterial(PALETTE[c])); const geo = new THREE.SphereGeometry(size, 4, 3); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mats[i % mats.length]); m.position.set(...at(i, r)); g.add(m); } G.view.town.add(g); this.temp.push(g); return g; },
  flush() { for (const s of Script.list.slice()) if (s !== this.run && !s.o.background) Script.list.splice(Script.list.indexOf(s), 1); },
  draw(h) { const t = this.beat; panel(h, 12, 12, 56, 15, { fill: 'red', trim: 'plum' }); drawText(h, 40, 16, 'DEMO', { color: 'white', align: 'center' }); if (t) { drawText(h, 240, 16, t, { color: 'white', align: 'center', shadow: 'ink' }); } const pulse = Math.floor(UI.time * 2) % 2; if (pulse) drawText(h, 240, 256, G.touchOnly ? 'Controller or keyboard required' : 'Press anything', { color: 'white', align: 'center', shadow: 'ink' }); if (G.demo?.logo) { G.game.drawLogo(h); } },
};
