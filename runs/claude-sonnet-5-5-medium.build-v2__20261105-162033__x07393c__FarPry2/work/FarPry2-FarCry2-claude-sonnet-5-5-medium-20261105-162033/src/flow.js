// FlowSystem: mode machine (title, play, dead...), new game / continue, sleeping, travel, the shop, drops, the ledger.
import { THREE, buildModel, toonMaterial, PALETTE } from '../pixel-engine.js';
import { WEAPONS, SLOTS, START_GUNS } from './content/weapons.js';
import { SITES, RAIL_HALTS, CASES } from './content/sites.js';
import { HARROW_NOTES, EPIGRAPHS } from './content/notes.js';
import { freshStory } from './core/story.js';
import { writeSave, readSave, applySave, clearSave } from './core/save.js';
import { TUNING } from './core/tuning.js';
import { ALL_KB, ALL_PAD } from './core/actions.js';
import { soloSession } from './net/solo.js';
import { openLobby, linkSession } from './net/link.js';
import { Lifecycle } from './net/lifecycle.js';
import { RoundSystem } from './net/round.js';

const V3 = THREE.Vector3;
export class DropSystem {
  list = [];
  constructor(g) { this.g = g; }
  add(d) {
    const g = this.g, y = g.world.heightAt(d.at[0], d.at[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), toonMaterial(PALETTE.slate)); m.position.set(d.at[0], y + 0.15, d.at[1]); m.rotation.y = (d.at[0] * 7.1) % 6.28; g.ctx.scene.add(m);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.13, 0.22), toonMaterial(PALETTE.orange)); tip.position.x = -0.3; m.add(tip);
    const drop = { kind: 'gun', id: d.id, cond: d.cond, x: d.at[0], z: d.at[1], y, mesh: m, t: 300 }; this.list.push(drop); return drop;
  }
  take(d) {
    const g = this.g, w = g.weapons, def = WEAPONS[d.id];
    const old = w.slotGun[def.slot];
    if (old && old !== d.id) { const gs = w.guns[old]; this.add({ id: old, cond: gs ? Math.round(gs.cond) : 50, at: [g.player.feet.x + 0.8, g.player.feet.z] }); delete w.guns[old]; }
    w.guns[d.id] = { cond: d.cond, mag: def.mag || 0, reserve: Math.round((def.reserve || 0) * 0.5), jammed: false, presses: 0 }; w.slotGun[def.slot] = d.id;
    w.equipSlot(def.slot); g.say(`${def.name.toUpperCase()}. IT HAS SEEN BETTER DAYS.`, 'player', 2.5); g.sfx('equip'); this.remove(d);
  }
  remove(d) { d.mesh.removeFromParent(); this.list = this.list.filter((x) => x !== d); }
  clear() { for (const d of this.list.slice()) this.remove(d); }
  tick(dt) { for (const d of this.list.slice()) { d.t -= dt; if (d.t <= 0) this.remove(d); } }
}

export class FlowSystem {
  name = 'flow';
  idleFrames = 0; frameN = 0; titleAngle = 0; lastPtr = null; deathTimer = 0; sleeping = false;
  setup(g) {
    this.g = g; g.flow = this; g.drops = new DropSystem(g);
    g.ledgerLines = () => this.ledgerLines(); g.haltName = (id) => RAIL_HALTS.find((h) => h.id === id)?.name || id;
    g.takeCase = (c) => this.takeCase(c); g.readTrig = (i) => this.readTrig(i);
    g.onPlayerDown = (why) => this.onDown(why); g.collapse = () => this.collapse();
    g.endingText = (w) => (w === 'walk' ? 'You reached the border with a case of stones and a map nobody else will ever use. The guard asks your trade. You tell him: surveyor.' : 'They crossed at first light, walking on ash. Nobody has asked who lit it. The fever is not finished with you, and you are out of tablets. It is a good view.');
  }
  // ---- modes ----
  startTitle() {
    const g = this.g;
    g.mode = 'title'; g.hudHidden = true; g.weapons.views.hidden = true;
    g.world.hour = 17.3; g.world.wind.pin = true; g.world.wind.dir = [0.8, 0.6]; g.world.wind.speed = 4;
    g.player.teleport(-200, -300);
    g.fireSys.grid.reset(); g.fireSys.repaintAll();
    g.fireSys.grid.ignite(-300, -280, 14); g.fireSys.grid.ignite(-280, -330, 10);
    g.ui.closeAll(); g.ui.open('title'); g.world.sky.update(g.world.hour, g.ctx.camera.camera.position, true);
    this.idleFrames = 0;
  }
  titleCamera(dt) {
    const g = this.g; this.titleAngle += dt * 0.05;
    const cx = -260, cz = -300, r = 62, a = this.titleAngle;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = g.world.heightAt(x, z) + 26;
    g.camState.override = { position: [x, y, z], target: [cx + 4, g.world.heightAt(cx, cz) - 2, cz - 4] };
  }
  resetWorld() {
    const g = this.g;
    g.fireSys.reset(); g.grassSys.reset(); g.sitesSys.resetGarrisons(); g.drops.clear(); g.soldierSys.clear();
    g.vehicles?.reset?.(); g.buddies?.reset?.(); g.world.wind.pin = null; g.sitesSys.cases.forEach((c) => { c.taken = false; if (c.obj) c.obj.object.visible = true; });
    for (const s of g.sitesSys.sites) { s.cleared = false; if (s.kind === 'safehouse') s.safe = !(s.guards > 0); if (s.id === 'ranger-post') s.safe = false; s.lastDeath = -999; }
    g.sitesSys.find('pump-shed').safe = true;
    g.world.day = 1; g.world.hour = 17;
  }
  newGame(opts = {}) {
    const g = this.g;
    g.story = freshStory(); g.visitedHalts = new Set(['mile-forty']); g.trigRead = new Set();
    this.resetWorld();
    const w = g.weapons; w.guns = {}; w.slotGun = { ...START_GUNS }; w.throwables = { molotov: 0, charge: 0 }; w.upgrades = { cleaning: false, pouch: false, belt: false, kit: false }; w.syrettes = 3; w.tablets = 0; w.give('cane', 100); w.give('m38', 100); w.equipSlot('side', true);
    g.body.hp = 100; g.body.burning = false; g.body.fever.active = false; g.body.fever.count = 0; g.body.fever.t = 0; g.body.fever.next = g.body.nextInterval();
    g.ui.closeAll(); g.camState.override = null; g.hudHidden = false; g.mode = 'play'; g.noFever = true;
    g.world.hour = 17; g.player.teleport(-40, 66, 0); g.story.safeSites = ['pump-shed'];
    g.events.emit('newgame');
    g.missions?.begin?.(opts.mission || 'm0');
  }
  continueGame() { const raw = readSave(); if (!raw) return; this.g.ctx.input.send({ load: raw }); }
  doLoad(d) {
    const g = this.g; g.ui.closeAll(); g.camState.override = null; g.hudHidden = false; g.mode = 'play'; g.noFever = false; g.soldierSys.clear(); g.drops.clear();
    applySave(g, d); g.missions?.restore?.(); g.vehicles?.reset?.(); g.ctx.engine.timeScale = 1; g.story.current = null;
  }
  toTitle() { const g = this.g; g.ctx.engine.timeScale = 1; this.resetWorld(); g.missions?.abort?.(); this.startTitle(); }
  afterEnding() { const g = this.g; g.ui.closeAll(); g.mode = 'play'; g.camState.override = null; g.hudHidden = false; g.noFever = false; const sh = g.sitesSys.find(g.story.safehouse || 'pump-shed'); g.player.teleport(sh.x + 3, sh.z + 3, 0); g.body.hp = 100; }
  startRound(kind = 'solo') {
    const g = this.g;
    if (kind === 'host' || kind === 'join') { this.lobby?.close(); this.lobby = openLobby(kind); g.ui.closeAll(); g.ui.open('lobby', kind); return; }
    this.beginRound(soloSession(g));
  }
  beginRound(session) {
    const g = this.g; g.ui.closeAll(); g.camState.override = null; this.resetWorld(); g.missions.abort(); g.fireSys.reset(); g.weapons.views.hidden = false;
    g.session = session; g.life = new Lifecycle(g.session); g.round = new RoundSystem(g.session);
    for (const s of [g.life, g.round]) { g.systems.splice(g.systems.length - 1, 0, s); s.setup(g); }
    g.hudHidden = false; g.body.hp = 100; g.session.ready(); g.audioSys.music('stalk', true);
  }
  endRound() {
    const g = this.g; this.lobby?.close(); this.lobby = null; if (!g.round) return;
    for (const s of [g.life, g.round]) { s.dispose?.(g); g.systems = g.systems.filter((x) => x !== s); }
    for (const p of g.round.players) if (p.view) p.view.dispose?.(); g.soldierSys.clear(); g.vehSys.reset();
    for (const c of g.round.cases) c.obj?.object?.removeFromParent(); g.round.truck?.object?.removeFromParent();
    g.round = null; g.life = null; g.session = null; g.ended = false; g.noFever = false; g.carryPenalty = undefined; g.hudExtra = null; g.cutscene = false; g.ctx.engine.timeScale = 1; this.toTitle();
  }
  // ---- sleeping, rail, collapse, death ----
  sleepUntil(hour, site) {
    const g = this.g; if (this.sleeping) return; this.sleeping = true; g.hudHidden = true;
    g.ctx.engine.screen.cover('fade').then?.(() => {}).catch?.(() => {});
    const advance = () => {
      let h = g.world.hour; let add = (hour - h + 24) % 24; if (add < 1) add += 24; g.world.hour = (h + add) % 24; if (h + add >= 24) g.world.day++;
      g.fireSys.grid.hourTick(g.gameHours(), TUNING.regrowHours); g.vehicles?.repairAll?.(); g.weapons.refill(); g.body.hp = 100; g.body.fever.t = 0;
      g.buddies?.rest?.(add); g.story.safehouse = site.id;
      g.soldierSys.clear(); g.sitesSys.despawnAll();
      writeSave(g); g.say('SLEPT. SAVED.', 'player', 2); this.sleeping = false; g.hudHidden = false; g.ctx.engine.screen.reveal('fade').catch?.(() => {});
    };
    setTimeout(() => {}, 0);
    g.ctx.tweens.call(0.9, advance);
    this.sleepAdvanceNow = advance;
  }
  rideTo(id) {
    const g = this.g, h = RAIL_HALTS.find((x) => x.id === id); if (!h || g.story.stones < 1) return;
    g.story.stones -= 1; g.hudHidden = true; g.sfx('train_clack');
    g.ui.open('epigraph', 'Old Bakr: ' + g.bakrThought?.()); 
    g.ctx.tweens.call(2.4, () => { g.ui.closeAll(); g.world.hour = (g.world.hour + 1) % 24; g.player.teleport(h.at[0] + 4, h.at[1] + 5, 0); g.visitedHalts.add(id); g.hudHidden = false; g.soldierSys.clear(); g.sitesSys.despawnAll(); });
  }
  onDown(why) {
    const g = this.g;
    if (g.mode !== 'play' && g.mode !== 'round') return;
    if (g.mode === 'round') { g.round?.onPlayerDown?.(why); return; }
    if (g.buddies?.tryRescue?.(why)) return;
    g.mode = 'dead'; this.deathTimer = 1.5; g.sfx('death_player');
  }
  collapse() {
    const g = this.g; const st = g.story; st.stones = Math.floor(st.stones * 0.8);
    const sites = g.sitesSys.sites.filter((s) => s.safe || s.id === 'mile-forty'); const f = g.player.feet;
    let best = sites[0], bd = 1e9; for (const s of sites) { const d = Math.hypot(s.x - f.x, s.z - f.z); if (d < bd) { bd = d; best = s; } }
    g.ctx.engine.screen.flash('black', { duration: 0.6 });
    g.player.teleport(best.x + 2, best.z + 3, 0); g.world.hour = (g.world.hour + 8) % 24; g.body.hp = Math.max(g.body.hp, 50); g.body.fever.clear = 0;
    g.soldierSys.clear(); g.sitesSys.despawnAll(); g.say('YOU WOKE HOURS LATER. SOMEONE TOOK A FIFTH OF YOUR STONES.', 'player', 4);
    g.events.emit('collapse');
  }
  // ---- shop ----
  cycleLocker(slot, d) {
    const g = this.g, w = g.weapons, owned = g.story.unlocked.filter((id) => WEAPONS[id].slot === slot); const opts = [null, ...owned];
    const cur = w.slotGun[slot]; let i = opts.indexOf(cur); i = (i + d + opts.length) % opts.length; const id = opts[i];
    if (cur && cur !== id) delete w.guns[cur];
    if (id) w.give(id, 100); else w.slotGun[slot] = null;
    if (w.slot === slot) w.equipSlot(w.slotGun[slot] ? slot : 'side'); g.sfx('equip');
  }
  rackBuy(wdef) {
    const g = this.g, st = g.story;
    if (!st.unlocked.includes(wdef.id)) { if (st.stones < wdef.price) { g.sfx('ui_back'); return; } st.stones -= wdef.price; st.unlocked.push(wdef.id); g.say(`${wdef.name.toUpperCase()}. IT FIRES. TWICE IS A DIFFERENT PRICE.`, 'tibor', 3); }
    const w = g.weapons; const cur = w.slotGun[wdef.slot]; if (cur) delete w.guns[cur];
    w.give(wdef.id, 100); if (wdef.slot !== 'side') w.equipSlot(wdef.slot); g.sfx('equip'); g.events.emit('bought', wdef.id);
  }
  buyUpgrade(u) { const g = this.g, st = g.story; if (st.stones < u.price || st.upgrades[u.id]) return; st.stones -= u.price; st.upgrades[u.id] = true; g.weapons.upgrades[u.id] = true; if (u.id === 'pouch') g.weapons.syrettes = Math.min(5, g.weapons.syrettes + 1); g.sfx('equip'); }
  buyThrowable(k, price) { const g = this.g, st = g.story; if (st.stones < price) return; const w = g.weapons; const max = k === 'molotov' ? 3 : 2; if (w.throwables[k] >= max) { g.say('YOU ARE CARRYING ENOUGH.', 'player', 1.5); return; } st.stones -= price; w.throwables[k] = k === 'molotov' ? Math.min(3, w.throwables[k] + 3) : Math.min(2, w.throwables[k] + 1); g.sfx('equip'); }
  takeCase(c) {
    const g = this.g; if (c.taken) return; c.taken = true; if (c.obj) c.obj.object.visible = false;
    const n = Math.max(1, Math.round(c.stones * TUNING.stonesReward)); g.story.stones += n; g.story.earned += n; g.story.cases.push(c.i);
    g.say(`${n} ROUGH STONES. SOMEONE HID THEM WELL.`, 'player', 2.5); g.sfx('pickup'); g.events.emit('case', c);
  }
  readTrig(i) {
    const g = this.g; g.trigRead.add(i); if (!g.story.trig.includes(i)) g.story.trig.push(i);
    const n = g.story.trig.length; g.say(HARROW_NOTES[(n - 1) % HARROW_NOTES.length], 'harrow', 7); g.sfx('paper'); g.events.emit('trig', i);
    if (g.story.trig.length >= 6 && !g.story.flags.empire) { g.story.flags.empire = true; g.story.unlocked.push('empire'); g.ctx.tweens.call(7.2, () => g.say('A CLEAN OLD EMPIRE IS WAITING AT EVERY LOCKER. - E.H.', 'harrow', 5)); }
  }
  ledgerLines() {
    const g = this.g, st = g.story, c = g.fireSys.grid.counts();
    return [[Math.round(c.burnt * 0.0025 * 25 * 100) / 100, 'hectares burned'], [st.ledger.moved, 'people moved off their land'], [st.ledger.killed, 'men you were paid to kill'], [st.ledger.friendsLost, 'friends lost'], [st.earned, 'stones earned']];
  }
  // ---- per frame ----
  fixed(g, dt) { g.drops.tick(dt); if (g.mode === 'dead') { this.deathTimer -= dt; if (this.deathTimer <= 0 && !g.ui.screen) { g.ui.open('gameover'); } } }
  frame(g, dt) {
    this.frameN++;
    const L = this.lobby; if (L && !g.round) { if (this.frameN % 30 === 0) L.poll(); if (L.role === 'join' && L.start) { const s = linkSession(g, L); this.lobby = null; g.ui.closeAll(); this.beginRound(s); } }
    for (const c of g.ctx.input.commands) if (c && c.load) this.doLoad(c.load);
    if (g.mode === 'title') this.titleCamera(1 / 60);
    // idle timer: title or main menu only (Settings and About are exempt)
    const scr = g.ui.screen && g.ui.screen.id;
    if (g.mode === 'title' && (scr === 'title' || scr === 'main' || scr === 'touch')) {
      const input = g.ctx.input; const active = ALL_KB.some((c) => input.isDown(c)) || ALL_PAD.some((c) => input.isDown(c)) || input.mouseButtons > 0 || Math.hypot(input.padAxis.x, input.padAxis.y) > 0.2 || g.ctx.input.buttonEvents.length > 0 || this.pointerMoved(input);
      if (active) this.idleFrames = 0; else this.idleFrames++;
      if (this.idleFrames > 600 && g.attract && !g.attract.active) g.attract.start();
    } else if (!g.attract?.active) this.idleFrames = 0;
  }
  pointerMoved(input) { const p = input.pointer; const moved = this.lastPtr && (Math.abs(p.x - this.lastPtr.x) + Math.abs(p.y - this.lastPtr.y) > 1e-4); this.lastPtr = { x: p.x, y: p.y }; return !!moved; }
  state() { return { idle: this.idleFrames }; }
}
