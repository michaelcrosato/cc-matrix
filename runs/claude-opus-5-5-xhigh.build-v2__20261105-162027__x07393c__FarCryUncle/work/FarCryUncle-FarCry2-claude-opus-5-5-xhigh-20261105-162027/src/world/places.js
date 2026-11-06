// Everything you can walk up to: givers, the notice board, safehouses, trig points, stone cases, rail halts.
import { THREE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { SITES, TRIGS, CASES, HALTS } from '../content/sites.js';
import { MARGIN_NOTES, ALL_TRIGS_NOTE } from '../content/notes.js';
import { GIVER_LINES } from '../content/missions.js';
import { LINES } from '../content/dialogue.js';
import { MISSIONS } from '../content/missions.js';
const NEAR = 60;
export class Places {
  caseObjs = {}; storyCases = {}; trackerBeepT = 0; trackerOn = false; leaning = [];
  constructor(game) { this.game = game; }
  build(ctx) {
    const g = this.game, I = g.interact;
    // Givers and talkers.
    const talkers = ['odile', 'tibor', 'bakr', 'vance', 'ansa', 'ines', 'dov', 'mags'];
    for (const who of talkers) {
      const n = g.npcs.byWho[who];
      if (!n) continue;
      I.add({ npc: n, liveAt: () => [n.x, n.y + 1.5, n.z], x: n.x, y: n.y, z: n.z, r: 3.2, wide: true, when: () => n.active && !g.missions.active && !g.dialogue.active, verb: () => this.talkVerb(who), onUse: () => this.talk(who, n) });
    }
    // The notice board.
    const m40 = SITES['mile-forty'];
    I.add({ x: m40.at[0], y: g.world.heightAt(m40.at[0], m40.at[1] + 18) + 1.5, z: m40.at[1] + 18, r: 3, wide: true, verb: () => 'READ THE NOTICE BOARD', when: () => !g.dialogue.active, onUse: () => g.ui.openBoard() });
    // Tibor's rack.
    const tib = g.npcs.byWho.tibor;
    I.add({ x: tib.x + 2.2, y: tib.y + 1.2, z: tib.z + 2, r: 3.2, wide: true, when: () => g.story.truce, verb: () => "LOOK AT TIBOR'S RACK", onUse: () => g.ui.openRack() });
    // Safehouses.
    for (const [key, site] of Object.entries(SITES)) {
      if (!site.safe) continue;
      const open = () => this.safeOpen(key);
      const f = (d) => [site.at[0] + d[0], site.at[1] + d[1]];
      const y = (x, z) => g.world.heightAt(x, z);
      const b = f(site.safe.bed), l = f(site.safe.locker), c = f(site.safe.crate), w = f(site.safe.wall);
      I.add({ x: b[0], y: y(b[0], b[1]) + 0.7, z: b[1], r: 2.8, wide: true, when: open, verb: () => 'SLEEP', onUse: () => g.ui.openBed(key) });
      I.add({ x: l[0], y: y(l[0], l[1]) + 1, z: l[1], r: 2.6, wide: true, when: open, verb: () => 'OPEN THE LOCKER', onUse: () => g.ui.openLocker() });
      I.add({ x: c[0], y: y(c[0], c[1]) + 0.6, z: c[1], r: 2.6, wide: true, when: open, verb: () => 'TAKE AMMO AND SYRETTES', onUse: () => this.resupply() });
      I.add({ x: w[0], y: y(w[0], w[1]) + 1.4, z: w[1], r: 2.8, wide: true, when: open, verb: () => 'READ THE WALL', onUse: () => g.ui.openWall() });
      // A dead friend's gun leans under the plank.
      const lean = buildModel('ground-gun', { catalog: MODELS });
      lean.object.position.set(w[0] + 0.6, y(w[0], w[1]) + 0.72, w[1] + 0.2);
      lean.object.rotation.set(1.2, 0.4, 0);
      lean.object.visible = false;
      setLookLayer(lean.object, 'actors');
      ctx.scene.add(lean.object);
      this.leaning.push(lean.object);
      // Harrow's note waits at every safehouse once all four jobs are done.
      I.add({ x: b[0], y: y(b[0], b[1]) + 1.2, z: b[1] + 0.8, r: 3.2, wide: true, when: () => open() && this.noteReady(), verb: () => 'READ THE NOTE ON THE COT', onUse: () => this.readNote() });
    }
    // Trig points.
    for (const t of TRIGS) {
      I.add({ id: t.id, x: t.at[0], y: g.world.heightAt(t.at[0], t.at[1]) + 1.2, z: t.at[1], r: 3, wide: true, when: () => !g.story.trigsDone.has(t.id), verb: () => 'TAKE A BEARING', onUse: () => this.trig(t) });
    }
    // Stone cases.
    for (const c of CASES) {
      const x = c.at[0], z = c.at[1], yy = g.world.heightAt(x, z);
      const built = buildModel('stone-case', { catalog: MODELS });
      built.object.position.set(x, yy + 0.02, z);
      setLookLayer(built.object, 'actors');
      ctx.scene.add(built.object);
      this.caseObjs[c.id] = built.object;
      I.add({ id: c.id, caseId: c.id, x, y: yy + 0.3, z, r: 2.4, wide: true, when: () => !g.story.casesDone.has(c.id), verb: () => 'TAKE THE CASE', onUse: () => this.takeCase(c) });
    }
    // Rail halts.
    for (const [key, h] of Object.entries(HALTS)) {
      const x = h.at[0] - 3, z = h.at[1] - 5;
      I.add({ x, y: g.world.heightAt(x, z) + 1, z, r: 4, wide: true, verb: () => 'RAIL HALT', when: () => !g.missions.active && g.story.flags.arrived, onUse: () => g.ui.openHalts(key) });
    }
  }
  refreshWalls() {
    const any = this.game.actors.buddies.some((b) => b.dead);
    for (const o of this.leaning) o.visible = any;
  }
  safeOpen(key) {
    const g = this.game, s = SITES[key];
    if (!g.story.safehouses.has(key)) return false;
    return true;
  }
  /** Clear the guards first where there are any. */
  tick() {
    const g = this.game;
    const wt = g.actors.squads.get('water-tower');
    if (wt && wt.alive === 0 && !g.story.safehouses.has('water-tower')) { g.story.safehouses.add('water-tower'); g.map.see('water-tower'); g.notice('THE WATER TOWER IS EMPTY NOW. THERE IS A COT.', 4); }
    for (const [k, h] of Object.entries(HALTS)) if (!g.story.halts.has(k) && Math.hypot(g.player.feet.x - h.at[0], g.player.feet.z - h.at[1]) < 22 && !g.player.seat) { g.story.halts.add(k); }
    for (const [k, s] of Object.entries(SITES)) if (!g.map.seen.has(k) && Math.hypot(g.player.feet.x - s.at[0], g.player.feet.z - s.at[1]) < Math.max(70, s.r + 30)) g.map.see(k);
    for (const t of TRIGS) if (!g.map.seen.has(t.id) && Math.hypot(g.player.feet.x - t.at[0], g.player.feet.z - t.at[1]) < 80) g.map.see(t.id);
    // Close by, an unfound case shows where it is.
  }
  talkVerb(who) {
    const g = this.game;
    const offers = g.missions.available(who);
    if (who === 'odile' && !g.missions.active) {
      if (offers.length) return 'TAKE A CRATE FROM ODILE';
    }
    if (offers.length) return `TALK TO ${who.toUpperCase()}`;
    return `TALK TO ${who.toUpperCase()}`;
  }
  talk(who, n) {
    const g = this.game;
    const offers = g.missions.available(who).filter((m) => !m.side);
    const sides = g.missions.available(who).filter((m) => m.side);
    if (offers.length) { g.missions.offer(offers[0], n); return; }
    if (sides.length) { g.missions.offer(sides[0], n); return; }
    const key = GIVER_LINES[who];
    const line = key && g.dialogue.pick(key);
    if (line) { g.faceNpc(n); g.dialogue.play([[who, line]], { onEnd: () => g.faceNpc(null) }); }
  }
  noteReady() {
    const g = this.game;
    return g.missions.canStart(MISSIONS.m7) || (g.missions.done.has('m8') && g.missions.canStart(MISSIONS.m9));
  }
  readNote() {
    const g = this.game;
    const m = g.missions.canStart(MISSIONS.m7) ? MISSIONS.m7 : MISSIONS.m9;
    g.sfx.play('map-paper');
    if (m.id === 'm7') g.dialogue.play('m7.note', { onEnd: () => g.missions.offer(m, null) });
    else g.dialogue.play([['harrow', 'COME UP. BRING THE MAP. IT IS RAINING, SO NOTHING WILL HAPPEN.']], { onEnd: () => g.missions.offer(m, null) });
  }
  resupply() {
    const g = this.game, w = g.weapons;
    for (const s of ['sidearm', 'main', 'special']) { const gun = w.slots[s]; if (gun) { const def = WEAPONSDEF[gun.id]; gun.reserve = Math.round((def.reserve ?? 0) * (w.hasBelt ? 1.5 : 1)); gun.mag = def.mag ?? gun.mag; } }
    g.body.syrettes = g.body.maxSyrettes;
    w.bottles = Math.max(w.bottles, g.story.unlocked.has('molotov') ? 3 : 0);
    g.sfx.play('gun-mag');
    g.notice('AMMUNITION. SYRETTES. COUNT THEM IF YOU LIKE.', 2.5);
    g.events.emit('resupply');
  }
  trig(t) {
    const g = this.game;
    g.story.trigsDone.add(t.id);
    const n = g.story.trigsDone.size;
    g.map.addNote(MARGIN_NOTES[n - 1]);
    g.sfx.play('note-scratch', { volume: 0.7 });
    g.say('harrow', MARGIN_NOTES[n - 1], Math.max(4, MARGIN_NOTES[n - 1].length / 15));
    g.events.emit('trig', t.id, n);
    if (n === 6) {
      g.story.unlocked.add('empire');
      g.map.addNote(ALL_TRIGS_NOTE);
      g.after(5, () => g.say('harrow', ALL_TRIGS_NOTE, 6));
    }
  }
  takeCase(c) {
    const g = this.game;
    g.story.casesDone.add(c.id);
    if (this.caseObjs[c.id]) this.caseObjs[c.id].visible = false;
    g.missions.pay(c.stones);
    g.notice(`${c.stones} STONES`, 2.5);
    g.sfx.play('ui-stone');
    g.events.emit('case', c.id, c.stones);
    g.hudTouch('stones');
  }
  spawnStoryCase(id, x, z, stones) {
    const g = this.game, ctx = g.ctx, y = g.world.heightAt(x, z);
    const built = buildModel('stone-case', { catalog: MODELS });
    built.object.position.set(x, y + 0.02, z);
    setLookLayer(built.object, 'actors');
    ctx.scene.add(built.object);
    const entry = { x, z, id, object: built.object };
    entry.usable = g.interact.add({ tag: 'mission', id, x, y: y + 0.3, z, r: 2.6, wide: true, verb: () => 'TAKE THE CASE', onUse: () => {
      ctx.scene.remove(built.object);
      g.interact.remove(entry.usable);
      delete this.storyCases[id];
      if (stones) { g.missions.pay(stones); g.notice(`${stones} STONES`, 2.5); g.sfx.play('ui-stone'); }
      g.trackerHint = false;
      g.events.emit('collected', id);
    } });
    this.storyCases[id] = entry;
    return entry;
  }
  /** Nearest unfound case, for the tracker. */
  nearestCase() {
    const g = this.game, f = g.player.feet;
    let best = Infinity, at = null;
    for (const c of CASES) { if (g.story.casesDone.has(c.id)) continue; const d = Math.hypot(c.at[0] - f.x, c.at[1] - f.z); if (d < best) { best = d; at = c.at; } }
    for (const e of Object.values(this.storyCases)) { const d = Math.hypot(e.x - f.x, e.z - f.z); if (d < best) { best = d; at = [e.x, e.z]; } }
    return { d: best, at };
  }
  /** Raised in the left hand: an LED and a beep that speeds up and turns green within 60 m. */
  stepTracker(dt) {
    const g = this.game;
    if (!this.trackerOn) return;
    const { d } = this.nearestCase();
    const near = d < 60;
    const interval = near ? Math.max(0.1, (d / 60) * 0.7) : 1.4;
    this.trackerBeepT -= dt;
    if (this.trackerBeepT <= 0) {
      this.trackerBeepT = interval;
      g.sfx.play(near ? 'tracker-near' : 'tracker-beep', { volume: 0.5 });
      g.vm.named['led-on'].visible = near;
      g.vm.named['led-off'].visible = !near;
      g.trackerBeeps = (g.trackerBeeps ?? 0) + 1;
    }
    this.lastInterval = interval;
    this.nearLit = near;
  }
  setTracker(on) {
    const g = this.game;
    if (on === this.trackerOn) return;
    this.trackerOn = on;
    if (on) {
      if (!g.player.seat) { g.vm.showGun(g.weapons.gun?.id ?? 'cane', false); g.vm.named['p-trk'].visible = true; g.vm.propsOn.add('p-trk'); g.vm.named['led-off'].visible = true; g.vm.propsOn.add('led-off'); g.vm.propsOn.add('led-on'); g.vm.play('TrackerUp', { keep: true }); }
      g.sfx.play('tracker-beep', { volume: 0.4 });
      g.events.emit('tracker-up');
    } else {
      if (!g.player.seat) { g.vm.endAction(); g.vm.showGun(g.weapons.gun?.id ?? 'cane', false); }
    }
  }
  resetAll() {
    for (const c of Object.values(this.caseObjs)) c.visible = true;
    for (const e of Object.values(this.storyCases)) { this.game.ctx.scene.remove(e.object); this.game.interact.remove(e.usable); }
    this.storyCases = {};
    this.trackerOn = false;
    for (const o of this.leaning) o.visible = false;
  }
  applySaved() { for (const id of this.game.story.casesDone) if (this.caseObjs[id]) this.caseObjs[id].visible = false; this.refreshWalls(); }
}
import { WEAPONS as WEAPONSDEF } from '../content/weapons.js';
