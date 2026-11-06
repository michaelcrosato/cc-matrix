// Attract mode: after 10 s idle on the title, an AI plays a throwaway world and cheats freely; any input exits.
import { newWorld } from '../core/world.js';
import { FISH, BUGS, FOSSILS, ART } from '../data/collect.js';
import { THREE, PALETTE } from '../engine.js';
import { buildLantern, buildSnowman } from '../world/scenery.js';
import { singNote } from '../audio/voice.js';
import { BUS_VERSES } from '../data/dialogue.js';
import { TextEntry } from '../ui/screens.js';
const CANCEL = Symbol('attract-cancel');
export const attract = {
  token: 0, running: false, drive: null,
  start(g) {
    if (this.running || g.mode !== 'title') return; this.running = true; const tok = ++this.token; this.saved = g.world; g.ui.clear(); g.mode = 'attract'; g.sys.hubActive = false;
    const w = newWorld(77); w.noSave = true; w.beans = 99999; w.debt = 0; w.tools = ['net', 'rod', 'shovel', 'axe', 'can', 'sling']; w.name = 'Demo'; w.errands.active = false; w.flags.debtKnown = true; w.look.hairStyle = 3; w.look.outfit = 'tee_lime'; g.resetWorldView(w); g.player.rebuild(); g.player.actor.show(true); g.place = 'town'; g.sys.places.showOnly(g, 'town'); g.frozen = false; g.noAttract = true; g.sys.time.onLoad(g); g.sys.nature.spawnBugs(g); g.sys.nature.spawnFish(g);
    this.seen = g.ui.c.anyInput; this.grace = 0.6; this.say = g.say; g.say = (sp, text, o = {}) => this.say.call(g, sp, text, { auto: 1.1, ...o }); this.ask = g.ask; g.ask = (sp, text) => this.say.call(g, sp, text, { auto: 1.1 }).then(() => 0);
    this.drive = (gg, dt) => this.steer(gg, dt); this.loop(g, tok).catch(e => { if (e !== CANCEL) console.error('attract', e); });
  },
  update(g, dt) {
    if (!this.running) return; this.grace -= dt; if (this.grace > 0) { this.seen = g.ui.c.anyInput; return; }
    if (g.ui.c.anyInput !== this.seen) this.stop(g);
    // DEMO tag is drawn by the HUD
  },
  stop(g) {
    if (!this.running) return; this.running = false; this.token++; g.say = this.say; g.ask = this.ask; this.drive = null; g.ui.clear(); g.cutscene = 0; g.zoomOverride = null; g.banner = null; g.busText = null; g.fireworkPattern = null; g.sys.city?.setNightLook?.(g, false); g.sys.city?.lights?.forEach(l => l.release()); if (g.sys.city) g.sys.city.lights = null; g.place = 'town'; g.sys.places.showOnly(g, 'town');
    for (const o of this.props ?? []) g.town.group.remove(o); this.props = [];
    g.noAttract = false; g.world = this.saved; g.resetWorldView(this.saved); g.sys.time.onLoad(g); g.mode = 'boot'; g.showTitle(); g.engine.screen.reveal?.('fade', { duration: 0.1 })?.catch?.(() => {});
  },
  steer(g, dt) { const p = g.player; if (!p.moveTarget) { p.mag = 0; return; } const dx = p.moveTarget.x - p.pos.x, dz = p.moveTarget.z - p.pos.z; const d = Math.hypot(dx, dz); if (d < 0.3) { p.moveTarget = null; p.mag = 0; return; } p.updateBasis(); const f = p.basis.forward, r = p.basis.right; p.input.y = (dx * f.x + dz * f.z) / d; p.input.x = (dx * r.x + dz * r.z) / d; p.mag = 1; },
  async loop(g, tok) {
    const chk = () => { if (tok !== this.token) throw CANCEL; };
    const sleep = (s) => new Promise((res, rej) => g.after(s, () => { tok === this.token ? res() : rej(CANCEL); }));
    const go = async (x, z, max = 6) => { g.player.moveTarget = { x, z }; const t0 = g.t; while (g.player.moveTarget && g.t - t0 < max) { await sleep(0.2); } g.player.moveTarget = null; };
    const tp = (x, z) => { g.player.pos.x = x; g.player.pos.z = z; g.target.set(x, 0.8, z); };
    const setT = (day, hour) => { const w = g.world; w.day = day; w.min = (hour * 60 - 300 + 1440) % 1440; g.syncAll(); g.sys.time.visual(g, 0, true); g.npcs.schedule(true); g.updateMusic(true); };
    const iris = async (fn) => { try { await g.engine.screen.cover('iris', { duration: 0.3 }); } catch {} chk(); await fn(); try { await g.engine.screen.reveal('iris', { duration: 0.3 }); } catch {} };
    const face = (x, z) => g.player.faceToward(x, z);
    this.props = []; const logo = async () => { g.banner = { text: 'CREDITOR CREEK' }; await sleep(2.2); g.banner = null; };
    while (true) {
      chk(); g.zoomOverride = null; g.place = 'town'; g.sys.places.showOnly(g, 'town'); g.sys.city?.setNightLook?.(g, false); setT(1, 8); g.world.min = 180; g.sys.time.visual(g, 0, true); tp(19, 23); g.player.actor.play('Idle');
      g.banner = { text: 'A year in the village' }; await sleep(2); g.banner = null;
      // 1. shake a tree
      const tr = g.world.town.trees.find(t => t.kind === 'pear' && t.stage >= 3 && t.x > 8 && t.x < 50 && t.z < 34) ?? g.world.town.trees.find(t => t.stage >= 3); tr.fruit = 3; g.town.syncTrees(g.world.town.trees, g.season); const f = g.grid.free(tr.x + 0.5, tr.z + 1.8); tp(f[0] - 2, f[1]); await go(f[0], f[1], 5); face(tr.x + 0.5, tr.z + 0.5); await g.sys.trees.shake(g, tr); await sleep(1.2);
      // 2. net a butterfly
      g.player.moveTarget = null; await g.player.act('NetSweep', 0.6); await g.sys.reveal.catchThing(g, BUGS[0]); await sleep(0.8);
      // 3. cast and catch
      tp(27.2, 18.5); g.player.setFacing(1, 0); await g.player.act('Cast', 0.6); g.splash(30, 18.5); await sleep(1.2); g.sfx('bite'); await g.player.act('Reel', 0.8); await g.sys.reveal.catchThing(g, FISH.find(f => f.id === 'pike')); await sleep(0.8);
      // 4. fossil
      const sp = g.grid.free(23, 29); tp(sp[0], sp[1]); await g.player.act('Dig', 0.9); g.sfx('dig'); await g.sys.reveal.catchThing(g, FOSSILS[4]); await sleep(0.6);
      // 5. neighbour chat
      const n = g.npcs.byId.tavi; if (n) { n.sleeping = false; const q = g.grid.free(20, 22); tp(q[0], q[1]); n.pos.x = q[0] + 1.3; n.pos.z = q[1]; n.state = 'idle'; n.busy = true; n.actor.show(true); face(n.pos.x, n.pos.z); n.yaw = Math.atan2(q[0] - n.pos.x, 0); await g.say(n, g.sys.interact.line(g, n)); await g.say(n, "I smiled at a rock today and I think it's going really well, isn't it?!"); n.busy = false; }
      // 6. store + furnishing
      await iris(async () => { await g.sys.places.go(g, 'store', 'door', 'store'); }); g.world.beans = 99999; await sleep(1); await g.say(g.sys.venues.host('gander'), 'A fine item. I can offer you a number. A fair one. For me.'); await sleep(0.4);
      await iris(async () => { for (const id of ['mosscouch', 'cotlamp', 'seatv', 'mossplant', 'mossrug']) g.world.home.furn.push({ id, x: 1 + g.world.home.furn.length % 3 * 2, z: 2 + Math.floor(g.world.home.furn.length / 3) * 2, rot: 0 }); await g.sys.places.go(g, 'home', 'door', 'home'); }); await sleep(2.2);
      // 7. museum donation
      await iris(async () => { await g.sys.places.go(g, 'museum', 'door', 'museum'); g.world.donated.pike = true; g.world.donated.trilobite = true; g.world.donated.cabbagebutterfly = true; import('../world/rooms.js').then(m => m.ROOMS.museum.syncDisplays(g)); }); await g.say(g.sys.venues.host('quill'), 'Is it a fossil? It is a fossil! Or a very confident potato! Either way, it goes in the hall!'); await sleep(0.6);
      // 8. summer lanterns and fireworks
      await iris(async () => { await g.sys.places.go(g, 'town', 'exit', 'museum'); setT(8, 19.5); tp(27.4, 21.6); }); const ls = []; for (let i = 0; i < 40; i++) { const l = buildLantern(['red', 'orange', 'sand', 'lime', 'sky', 'plum'][i % 6]); l.position.set(29.3 + (i % 3) * 0.7, -0.2, 6 + (i * 5.3) % 14); g.town.group.add(l); ls.push(l); this.props.push(l); } g.zoomOverride = 1.4; const t8 = g.t; while (g.t - t8 < 4) { for (let i = 0; i < ls.length; i++) ls[i].position.z += 0.03 * (1 + i % 4); await sleep(0.05); } for (let i = 0; i < 3; i++) { g.sfx('firework'); g.ctx.particles.burst('sparkle', new THREE.Vector3(26 + i * 4, 9, 40), { count: 28, colors: [['red', 'sand'], ['sky', 'white'], ['lime', 'sand']][i] }); await sleep(0.8); } for (const l of ls) g.town.group.remove(l); g.zoomOverride = null;
      // 9. the bus sings
      g.cutscene = 1; g.setMusic('bus'); g.sfx('bus'); const v = BUS_VERSES[0].split(',').map(s => s.trim()); g.busText = { text: '' }; for (const piece of v.slice(0, 3)) { g.busText.text = '♪ ' + piece + ' ♪'; for (let k = 0; k < 6; k++) singNote(g.ctx.audio, g.settings, { voice: 'warm', pitch: 0.85 }, [0, 2, 4, 7, 4, 2][k] - 2, 'aeiou'[k % 5]); await sleep(1.6); } g.busText = null; g.cutscene = 0;
      // 10. City neon, salon, auction paddle
      await iris(async () => { setT(8, 21); await g.sys.bus.arriveCity(g, true); }); g.player.moveTarget = null; await go(512, 11.5, 6); await sleep(1); await iris(async () => { await g.sys.places.go(g, 'salon', 'door', 'city'); }); await g.say(g.sys.venues.host('fleece'), 'Mon cher! Your hair is a rumour. Let us make it a fact.'); g.sfx('paddle'); await sleep(0.5); g.sfx('paddle'); await iris(async () => { await g.sys.places.go(g, 'auction', 'door', 'city'); }); await g.say(g.sys.venues.host('pemberton'), 'Bid bid bid! Going once! Going twice! Paddles up, opinions down!'); await sleep(0.5);
      // 11. soup
      await iris(async () => { g.sys.city.setNightLook(g, false); g.sys.city.lights?.forEach(l => l.release()); g.sys.city.lights = null; g.place = 'town'; g.sys.places.showOnly(g, 'town'); setT(12, 12); tp(21, 23); for (const nn of g.npcs.list.slice(0, 4)) { const q = g.grid.free(19 + Math.random() * 4, 21 + Math.random() * 3); nn.pos.x = q[0]; nn.pos.z = q[1]; nn.state = 'idle'; } g.setMusic('soup'); });
      const dorrit = g.npcs.byId.dorrit; if (dorrit) await g.say(dorrit, "Giant pot, giant soup, giant opinions, mmhm. Taste it. Everyone will taste it."); await sleep(0.8);
      // 12. snowman
      await iris(async () => { setT(14, 11); tp(21, 23); const sn = buildSnowman(1); sn.position.set(23, 0, 22.5); g.town.group.add(sn); this.props.push(sn); g.setMusic('longnight'); }); await g.say(g.npcs.byId.bartleby ?? null, "The head is too small. The body is too large. I'd prefer not to say anything else. Second place."); await sleep(0.6);
      // 13. Long Night
      setT(16, 23.8); g.sfx('bell'); g.town.bellSwing = 0.9; g.zoomOverride = 1.5; g.banner = { text: 'THE LONG NIGHT' }; await sleep(3.2); g.banner = null; g.zoomOverride = null;
      await logo(); await sleep(0.8);
      for (const o of this.props) g.town.group.remove(o); this.props = [];
    }
  },
};
