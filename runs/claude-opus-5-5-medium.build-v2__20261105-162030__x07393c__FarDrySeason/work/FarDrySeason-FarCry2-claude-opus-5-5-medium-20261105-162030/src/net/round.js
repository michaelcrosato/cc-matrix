// Cash Run: six minutes, four mercs, one burning valley. The host runs the world; each copy moves its own player.
import { buildModel, setLookLayer, THREE } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { PersonView } from '../actors/rig.js';
import { FIRE_N, BURNING, BURNT } from '../world/fire.js';
import { dist2 } from '../world/geom.js';
import { TUNING } from '../core/tuning.js';
import { held } from '../core/actions.js';
import { resultsScreen } from '../ui/screens/index.js';
import { mixin } from '../core/mixin.js';
import { HostPart } from './host.js';
import { ClientPart } from './client.js';
import { CardPart } from './card.js';
const { Vector3 } = THREE;
export const ROUND_MS = 360000;
const SPAWNS = [[60, -350], [255, -270], [130, -205], [40, -170]];
const CASE_SPOTS = [[210, -280], [90, -322], [278, -216], [36, -164], [150, -310], [190, -250]];
export const TRUCK = [150, -225];
const LIVE = new Set(['the-cut', 'p5', 'ranger-post']);
const SAFE = (s) => String(s ?? 'MERC').toUpperCase().replace(/[^A-Z0-9 .,:;!?'"\-+=/()%_#&*@]/g, '').slice(0, 14) || 'MERC';
const STATE_CODE = { idle: 0, suspicious: 1, alert: 2, searching: 3, burning: 4 };
const FACTIONS = ['concord', 'harvest', 'deserter'];
const from = new Vector3(), dir = new Vector3();
export class Round {
  P = {}; order = []; cases = []; ended = false; started = false; evQ = []; wQ = { f: [], x: [], d: [], b: [] }; puppets = new Map(); snaps = []; banks = 0; tSend = {}; card = null; hasReady = false;
  constructor(game, session) { this.game = game; this.s = session; this.isHost = session.isHost; this.me = session.me; this.server = !!session.server; }
  simulating() { return true; }
  async begin() {
    const g = this.game, s = this.s, w = g.world, p = g.player;
    g.cheats.god = false; g.mode = 'round';
    this.rng = s.rng('round');
    for (const c of w.cases) { c.taken = true; c.object.visible = false; }
    w.fire.visualOnly = !this.isHost;
    w.setHour(16.2, true); w.pinWind({ dir: [Math.cos(this.rng() * 6.28), Math.sin(this.rng() * 6.28)], speed: 4.5 }); w.windPin = null;
    w.sites['the-cut'].dormant = false;
    for (const site of Object.values(w.sites)) { site.dormant = !LIVE.has(site.id); site.cleared = false; }
    for (const c of Object.values(g.people.npcs)) c.hidden = true;
    for (const c of g.people.civs) c.view.object.visible = false;
    g.story.feverOn = false;
    // The truck you bank at.
    const ty = w.land.heightAt(TRUCK[0], TRUCK[1]), truck = buildModel('cargo-truck', { catalog: CATALOG });
    truck.object.position.set(TRUCK[0], ty + 1.1, TRUCK[1]); truck.object.rotation.y = 1.5; setLookLayer(truck.object, 'actors'); g.ctx.scene.add(truck.object); this.truck = truck.object;
    // Players.
    this.order = s.players.map((q) => q.id);
    for (const q of s.players) {
      const spawn = SPAWNS[q.id % 4], color = q.color;
      const P = { id: q.id, name: SAFE(q.name), color, kind: 'player', x: spawn[0], y: w.land.heightAt(spawn[0], spawn[1]) + 0.1, z: spawn[1], yaw: 0, pitch: 0, hp: 100, stance: 0, crouched: false, lit: false, stones: 0, kills: 0, downs: 0, revives: 0, cellsLit: 0, carrying: -1, down: false, downT: 0, respawnT: 0, spawn, left: false, ai: !!q.ai, speed2: 0, burning: 0 };
      this.P[q.id] = P;
      if (q.id === this.me && !this.server) { P.local = true; continue; }
      if (q.ai) { this.spawnMerc(P); continue; }
      P.view = new PersonView(g.ctx, 'soldier-cloth', { cloth: colorName(color), dark: 'night', hat: colorName(color), strap: 'sand', boot: 'ink', skin: 'orange' }, { gun: true });
      P.view.place(P.x, P.y, P.z, 0); P.view.setLower('Idle'); P.view.setUpper('AimIdle');
      if (this.isHost) { P.collider = g.ctx.physics.addStaticCylinder([P.x, P.y + 0.85, P.z], 0.85, 0.34); g.world.own(P.collider, 'player', P); }
      P.gx = P.x; P.gy = P.y; P.gz = P.z;
    }
    // Your kit.
    if (!this.server) {
      const L = this.P[this.me];
      p.guns = { melee: null, sidearm: null, main: null, special: null };
      g.combat.give('cane', 100, false); g.combat.give('flare', 100, false); g.combat.give('tractor', 70, true);
      p.syrettes = 2; p.molotovs = 2; p.hp = 100; p.teleport(L.x, L.z); p.setYaw(Math.atan2(-(TRUCK[0] - L.x), -(TRUCK[1] - L.z)), 0); g.story.hasTracker = true;
    } else { p.teleport(0, 40); p.ctrl.collider.setEnabled(false); }
    // Cases.
    this.cases = CASE_SPOTS.map(([x, z], i) => { const b = buildModel('stone-case', { catalog: CATALOG }); const y = w.land.heightAt(x, z); b.object.position.set(x, y + 0.03, z); b.object.scale.setScalar(1.4); setLookLayer(b.object, 'actors'); g.ctx.scene.add(b.object); return { i, x, z, y, stones: 3 + Math.floor(this.rng() * 5), carrier: -1, banked: false, burned: false, object: b.object, burnT: 0 }; });
    s.on('message', (d, f) => this.onMessage(d, f));
    s.on('leave', (e) => this.onLeave(e));
    s.on('time-up', () => { if (this.isHost) this.finish(); });
    s.on('end', (e) => this.onEnd(e));
    if (s.time() > -Infinity) this.started = true; // A link session has already begun.
    s.on('start', () => { this.started = true; this.card = null; });
    s.on('card', (c) => { this.card = c; });
    if (s.kind === 'hub') { this.ownCard = true; if (typeof window !== 'undefined') { this.keyL = (e) => { if (this.started) return; if (e.code === 'Enter') { s.answer('ready'); this.answered = true; } if (e.code === 'KeyM') s.answer('more'); }; window.addEventListener('keydown', this.keyL); } }
    if (this.server) { /* main.js says ready */ }
    if (this.isHost) w.fire.onLit = null;
    this.prevCell = w.fire.onChange;
    if (this.isHost) w.fire.onChange = (i, st, was) => { this.prevCell(i, st, was); if (st === BURNING || st === BURNT) { this.wQ.f.push(i, st); } };
    // Drive sends from a timer, not the render loop: a slow copy's traffic must still flow.
    if (typeof setInterval !== 'undefined' && (s.kind === 'hub' || s.kind === 'link')) this.timer = setInterval(() => this.netTick(), 50);
    g.audio.setMusic('title');
    if (s.kind === 'hub') this.onEngineReady(); // Loaded: the card asks the players, not us.
  }
  onEngineReady() { if (this.hasReady || this.server) return; this.hasReady = true; if (this.s.kind === 'hub') this.s.ready(); else if (this.s.kind === 'solo') this.s.ready(); }
  time() { return this.s.time(); }
  inPlay() { const t = this.time(); return this.started && t >= 0; }
  // ----- AI mercs (solo) -----
  spawnMerc(P) {
    const g = this.game, a = g.actors.spawn({ kind: 'merc', faction: 'merc', role: 'rifle', x: P.x, z: P.z, duty: 'walkTo', modelId: 'soldier-cloth', palette: { cloth: colorName(P.color), dark: 'night', hat: colorName(P.color), strap: 'sand', boot: 'ink', skin: 'plum' }, hp: 140 });
    a.hp = 140; a.maxHp = 140; a.merc = P; a.fireproof = false; P.actor = a; a.provokedBy = true; a.state = 'idle'; a.spec = { ...a.spec, speed: 5 };
  }
  mercBrain(P, dt) {
    const a = P.actor; if (!a?.alive) return;
    P.x = a.x; P.y = a.y; P.z = a.z; P.yaw = a.yaw; P.hp = (a.hp / a.maxHp) * 100;
    P.brainT = (P.brainT ?? 0) - dt; if (P.brainT > 0) return; P.brainT = 0.5;
    if (P.carrying >= 0) { a.goal = TRUCK; }
    else { let best = null, bd = 1e9; for (const c of this.cases) if (!c.banked && !c.burned && c.carrier < 0) { const d = dist2(c.x, c.z, a.x, a.z); if (d < bd) { bd = d; best = c; } } if (best) { a.goal = [best.x, best.z]; if (bd < 2.6) this.pick(P, best); } else a.goal = TRUCK; }
    a.goalSpeed = 1;
  }
  onEvent(e, id) {
    const P = this.P[id], g = this.game; if (!P || P.left) return;
    switch (e[0]) {
      case 's': { // a shot
        P.firedT = g.world.time;
        const w = e[1] === 'tractor' ? 24 : e[1] === 'm38' ? 34 : e[1] === 'cane' ? 55 : 24;
        from.set(e[2] / 100, e[3] / 100, e[4] / 100); dir.set(e[5] / 1000, e[6] / 1000, e[7] / 1000).normalize();
        const hit = g.ctx.physics.castRay(from, dir, e[1] === 'cane' ? 2.6 : 120, undefined, P.colliderBody);
        if (hit) { const owner = g.world.owners.get(hit.collider.handle); if (owner?.ref === P) break; g.combat.applyHit(hit, w * TUNING.weaponDamage, P, { dir, from }); }
        g.actors.hearShot(from.x, from.z, 120, null);
        g.audio.at(e[1] === 'cane' ? 'whoosh' : 'gun-rifle', from.x, from.y, from.z, 350, 0.8);
        P.view?.flashUpper('FireRecoil');
        break;
      }
      case 'i': g.world.fire.ignite(e[1], e[2], e[3], P); P.cellsLit += 3; break;
      case 'p': { const c = this.cases[e[1]]; if (c) this.pick(P, c); break; }
      case 'h': P.hp = Math.min(100, P.hp + 40); break;
      case 'r': { const o = this.P[e[1]]; if (o?.down && dist2(o.x, o.z, P.x, P.z) < 4) this.revive(o, P); break; }
    }
  }
  pick(P, c) { if (c.carrier >= 0 || c.banked || c.burned || P.carrying >= 0 || P.down || dist2(c.x, c.z, P.x, P.z) > 4) return; c.carrier = P.id; P.carrying = c.i; c.burnT = 0; }
  revive(o, by) { o.down = false; o.hp = 40; o.downT = 0; by.revives++; this.wQ.d.push(['up', o.id]); if (o.local) this.upLocal(); }
  upLocal() { const p = this.game.player; p.downT = 0; this.game.cam.override = null; p.hp = 40; }
  drop(P) { if (P.carrying >= 0) { const c = this.cases[P.carrying]; c.carrier = -1; c.x = P.x; c.z = P.z; c.y = this.game.world.land.heightAt(P.x, P.z); P.carrying = -1; } }
  damageLocal(dmg, o) { this.hurt(this.P[this.me], dmg, o); }
  damageRemote(ref, dmg, o) { this.hurt(ref, dmg, o); }
  hurt(P, dmg, o = {}) {
    if (!P || P.down || P.left || !this.inPlay()) return;
    P.hp -= dmg * TUNING.playerDamageTaken; P.regenT = 0;
    if (P.local) { const g = this.game; g.player.hp = P.hp; g.body.regenT = 0; g.hud.touch(); g.flashBlood = 0.2; g.ctx.engine.shake.add(0.25); g.audio.play('hit-flesh'); }
    if (P.hp <= 0) this.goDown(P, o);
  }
  goDown(P, o) {
    P.hp = 0; P.down = true; P.downT = 25; P.downs++; this.drop(P);
    if (o?.by?.kind === 'player' && o.by !== P) o.by.kills = (o.by.kills ?? 0) + 0;
    this.wQ.d.push(['down', P.id]);
    if (P.local) this.downLocal();
  }
  downLocal() { const g = this.game, p = g.player; p.downT = 1e9; p.mapUp = false; g.combat.stopStream(); g.talk.say('you', 'YOU ARE BLEEDING OUT. SOMEONE MAY COME. SOMEONE MAY TAKE THE CASE.', 5); }
  onKill(a, o) { if (a.kind === 'merc') return; if (o.by?.kind === 'player') o.by.kills = (o.by.kills ?? 0) + 1; else { const P = this.P[this.me]; if (P) P.kills++; } }
  onActorHit() {}
  targets(out) { for (const id of this.order) { const P = this.P[id]; if (!P.left && !P.down && !P.respawning) out.push(P); } }
  siteDist(def) { let best = 1e9; for (const id of this.order) { const P = this.P[id]; if (!P.left) best = Math.min(best, dist2(P.x, P.z, def.at[0], def.at[1])); } return best; }
  siteLive(def) { return this.isHost && LIVE.has(def.id); }
  // ----- One fixed step -----
  fixed(dt) {
    const g = this.game, p = g.player;
    if (this.ended) return;
    if (this.s.tick) this.s.tick(dt * 1000);
    if (this.s.kind === 'solo') { this.started = this.started || this.s.time() > -Infinity; }
    if (!this.server) {
      const L = this.P[this.me];
      if (g.lastShotT !== undefined && g.lastShotT !== this.seenShot) { this.seenShot = g.lastShotT; L.firedT = g.world.time; }
      if (!L.left) { L.x = p.x; L.y = p.y; L.z = p.z; L.yaw = g.ctx.camera.yaw; L.pitch = g.ctx.camera.pitch; L.crouched = p.crouched; L.lit = p.lit; L.speed2 = p.speed2; p.carrying = L.carrying >= 0; }
      // Syrette, here on the client; the host knows.
      if (held(g.ctx.input, 'heal') && p.syrettes > 0 && L.hp < 100 && !L.down) { this.healT = (this.healT ?? 0) + dt; if (this.healT >= 0.8) { this.healT = -1e6; p.syrettes--; g.audio.play('syrette'); if (this.isHost) L.hp = Math.min(100, L.hp + 40); else this.queueEv(['h']); } } else this.healT = 0;
      p.hp = L.hp;
    }
    if (!this.inPlay()) { if (p.ctrl && !this.server) { /* the 3-2-1: stand where you are */ } this.frozenCount(); }
    if (this.isHost) this.hostFixed(dt);
    else this.clientFixed(dt);
    if (this.s.kind === 'solo') this.netTick(dt);
  }
  frozenCount() { const g = this.game; g.frozen = !this.inPlay(); }
  /** What this player can use near here. */
  candidates() {
    const g = this.game, p = g.player, L = this.P[this.me], out = []; if (!L || L.down || L.respawning || !this.inPlay()) return out;
    const near = (x, z, r) => dist2(x, z, p.x, p.z) < r;
    if (L.carrying < 0) for (const c of this.cases) if (c.carrier < 0 && !c.banked && !c.burned && near(c.x, c.z, 2.8)) out.push({ x: c.x, z: c.z, y: c.y + 0.3, label: 'TAKE THE CASE', anyAngle: true, fn: () => { if (this.isHost) this.pick(L, c); else this.queueEv(['p', c.i]); } });
    for (const id of this.order) { const o = this.P[id]; if (o !== L && o.down && near(o.x, o.z, 3)) out.push({ x: o.x, z: o.z, y: o.y + 0.5, label: `BRING UP ${o.name}`, hold: 3, anyAngle: true, fn: () => { if (this.isHost) this.revive(o, L); else this.queueEv(['r', o.id]); } }); }
    return out;
  }
  onLeave(e) {
    const P = this.P[e.id]; if (!P) return; P.left = true; this.drop(P);
    if (P.view) { P.view.dispose(); P.view = null; }
    if (P.collider) { this.game.world.owners.delete(P.collider.handle); this.game.ctx.physics.remove(P.collider); P.collider = null; }
    if (this.isHost && this.order.every((id) => this.P[id].left || this.P[id].ai)) this.finish();
  }
  standings() {
    const list = this.order.map((id) => this.P[id]).filter((P) => !P.left).sort((a, b) => b.stones - a.stones), groups = [];
    for (const P of list) { const last = groups[groups.length - 1]; if (last && last.s === P.stones) last.ids.push(P.id); else groups.push({ s: P.stones, ids: [P.id] }); }
    return groups.map((g) => g.ids);
  }
  /** Most stones wins. Called directly from the event handler so it is never late. */
  finish() {
    if (this.finished) return; this.finished = true;
    const present = this.order.map((id) => this.P[id]).filter((P) => !P.left);
    const scores = {}, stats = {}; for (const P of present) { scores[P.id] = P.stones; stats[P.id] = { Stones: P.stones, Downs: P.downs, Revives: P.revives, Kills: P.kills ?? 0 }; }
    const awards = [], most = (key) => present.reduce((a, b) => ((b[key] ?? 0) > (a?.[key] ?? 0) ? b : a), null);
    const m1 = most('revives'), m2 = most('stones'), m3 = most('cellsLit');
    if (m1?.revives > 0) awards.push({ id: m1.id, title: 'Last Friend', detail: `${m1.revives} brought up` });
    if (m2?.stones > 0) awards.push({ id: m2.id, title: 'Paid in Full', detail: `${m2.stones} stones` });
    if (m3?.cellsLit > 0) awards.push({ id: m3.id, title: 'Arsonist', detail: `${m3.cellsLit} cells lit` });
    this.s.finish({ standings: this.standings(), scores, stats, awards: awards.slice(0, 3) });
    if (this.s.kind === 'link') this.s.send({ t: 'w', f: [], x: [], d: [], b: [] });
  }
  onEnd(e) {
    if (this.ended) return; this.ended = true;
    if (this.timer) clearInterval(this.timer);
    if (this.keyL && typeof window !== 'undefined') window.removeEventListener('keydown', this.keyL);
    const g = this.game; g.frozen = true;
    if (this.s.kind === 'hub') { g.audio.silence(); g.ctx.audio.setMuted(true); return; }
    // On its own, show our own results.
    const rows = this.order.map((id) => this.P[id]).filter((P) => !P.left).sort((a, b) => b.stones - a.stones).map((P) => ({ name: P.name, score: P.stones }));
    g.ctx.engine.timeScale = 0; g.releaseLock(); g.ui.push(resultsScreen(g, rows)); void e;
  }
  /** Back to the title, outside a hub. */
  leave() {
    const g = this.game; this.ended = true; if (this.timer) clearInterval(this.timer);
    for (const id of this.order) { const P = this.P[id]; P.view?.dispose(); if (P.collider) { g.world.owners.delete(P.collider.handle); g.ctx.physics.remove(P.collider); } }
    for (const c of this.cases) g.ctx.scene.remove(c.object); g.ctx.scene.remove(this.truck);
    g.world.fire.visualOnly = false; if (this.prevCell) g.world.fire.onChange = this.prevCell;
    this.s.close?.();
    for (const c of Object.values(g.people.npcs)) c.hidden = false; g.people.showFriends();
    for (const c of g.world.cases) { c.taken = false; c.object.visible = true; }
    for (const s of Object.values(g.world.sites)) s.dormant = false;
    g.net = null; g.session = null; g.ctx.engine.timeScale = 1;
  }
  // ----- Per frame -----
  update(dt, realDt) {
    const g = this.game;
    if (this.ended) return;
    if (!this.started && this.ownCard) this.padCard();
    for (const id of this.order) {
      const P = this.P[id]; if (P.local || P.ai || P.left || !P.view) continue;
      if (P.tx !== undefined && !this.isHost) { const k = Math.min(1, realDt * 8); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k; P.z += (P.tz - P.z) * k; P.yaw = P.tyaw; }
      const moving = Math.hypot((P.tx ?? P.x) - P.x, (P.tz ?? P.z) - P.z) > 0.05 || (P.speed2 ?? 0) > 0.5;
      P.view.object.visible = !P.respawning;
      P.view.place(P.x, P.y, P.z, P.yaw + Math.PI);
      if (P.down) P.view.setFull('WoundedSit'); else { P.view.setLower(moving ? 'Run' : 'Idle'); P.view.setUpper('AimIdle'); }
      P.view.update(realDt);
    }
    if (!this.isHost) for (const a of this.puppets.values()) { a.lerpT = Math.min(1, (a.lerpT ?? 0) + realDt / 0.1); const px = a.px ?? a.tx, pz = a.pz ?? a.tz; const nx = px + (a.tx - px) * a.lerpT, nz = pz + (a.tz - pz) * a.lerpT; a.moving = Math.hypot(nx - a.x, nz - a.z) > 0.002; a.runFrac = 0.5; a.x = nx; a.z = nz; a.y = g.world.land.heightAt(nx, nz); a.yaw = a.tyaw; }
    for (const c of this.cases) { const show = !c.banked && !c.burned; c.object.visible = show; if (show) { if (c.carrier === this.me) c.object.visible = false; c.object.position.set(c.x, (c.carrier >= 0 ? c.y + 1.1 : c.y + 0.03), c.z); } }
    void dt;
  }
  drawHud(realDt) {
    const g = this.game, h = g.ctx.hud, t = this.time();
    if (!this.started && this.ownCard) { this.drawCard(); return; }
    g.hud.drawPlay(realDt);
    if (this.ended) return;
    const L = this.P[this.me];
    if (t < 0 && t > -Infinity) { h.text(0, 110, String(Math.ceil(-t / 1000)), { anchor: 'top', scale: 4, color: 'sand' }); }
    const left = Math.max(0, ROUND_MS - t), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
    if (t >= 0) h.text(0, 6, `${mm}:${String(ss).padStart(2, '0')}`, { anchor: 'top', color: 'white' });
    let y = 18; for (const id of [...this.order].sort((a, b) => this.P[b].stones - this.P[a].stones)) { const P = this.P[id]; if (P.left) continue; h.rect(8, y, 6, 7, colorName(P.color)); h.text(18, y, `${P.name} ${P.stones}${P.carrying >= 0 ? ' *' : ''}${P.down ? ' DOWN' : ''}`, { color: P.local ? 'sand' : 'white' }); y += 10; }
    // Cases show as a marker when close.
    if (L) for (const c of this.cases) if (!c.banked && !c.burned && c.carrier < 0 && dist2(c.x, c.z, L.x, L.z) < 40) { const s = g.hud.world(c.x, c.y + 1.2, c.z); if (s) h.text(Math.round(s[0]) - 3, Math.round(s[1]), 'v', { color: 'sand' }); }
    if (L?.carrying >= 0) { const s = g.hud.world(TRUCK[0], g.world.land.heightAt(TRUCK[0], TRUCK[1]) + 3, TRUCK[1]); if (s) h.text(Math.round(s[0]) - 12, Math.round(s[1]), 'BANK', { color: 'lime' }); }
    if (L?.down) h.text(0, 100, `BLEEDING: ${Math.ceil(L.downT)}`, { anchor: 'top', scale: 2, color: 'red' });
    if (L?.respawning) h.text(0, 100, 'BACK AT THE ROAD SOON', { anchor: 'top', scale: 2, color: 'mist' });
    for (const id of this.order) { const P = this.P[id]; if (P.local || P.left || !P.down) continue; const s = g.hud.world(P.x, P.y + 1.4, P.z); if (s) { h.rect(Math.round(s[0]) - 1, Math.round(s[1]) - 5, 3, 11, 'lime'); h.rect(Math.round(s[0]) - 5, Math.round(s[1]) - 1, 11, 3, 'lime'); } }
  }
  summary() { return { players: this.order.map((id) => ({ id, stones: this.P[id].stones, down: this.P[id].down, hp: this.P[id].hp, carrying: this.P[id].carrying })), cases: this.cases.map((c) => ({ banked: c.banked, burned: c.burned, carrier: c.carrier })), started: this.started, finished: !!this.finished, ended: this.ended, time: this.time() }; }
}
function colorName(hex) { return { '#e8443a': 'red', '#3b82f6': 'blue', '#22c55e': 'green', '#f5b700': 'sand' }[hex] ?? 'mist'; }
void FIRE_N;
mixin(Round, HostPart, ClientPart, CardPart);
