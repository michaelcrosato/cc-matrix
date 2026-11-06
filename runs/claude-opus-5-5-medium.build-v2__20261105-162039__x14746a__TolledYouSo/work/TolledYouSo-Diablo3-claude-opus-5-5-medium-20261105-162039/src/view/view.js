// The world view: reads world.heroes, monsters, allies, drops, props and consumes events. Same code on a host and on a client.
import { buildModel, Decals, disposeObject, spatialize, glowMaterial, HERO_RAGDOLL, PALETTE, Ragdoll, Rng, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { BANTER, SPEAKERS } from '../data/dialog.js';
import { RARITIES } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { Actor, BellChain, HELMS, MalisonArms, PAULS, rarityTier, SEAT_COLORS } from './actors.js';
import { MODELS } from './models/props.js';
import { Chunks, ELEMENT_COLORS, Fx, registerParticles } from './vfx.js';
import { LOOKS, ZoneView } from './zonebuild.js';
import { playAt } from '../audio/music.js';
import { LOOPS } from '../audio/sfxdata.js';
import { visibleProp } from '../sim/quests.js';

const { BoxGeometry, Group, Mesh, Vector3 } = THREE;
const BEAMGEO = new BoxGeometry(0.22, 1, 0.22);
const COINGEO = new BoxGeometry(0.14, 0.05, 0.14);
const BLOBGEO = new BoxGeometry(0.22, 0.14, 0.22);
const HITSFX = { flesh: 'hit_flesh', bone: 'hit_bone', stone: 'hit_stone', metal: 'hit_metal', wood: 'hit_wood' };
const fmtNum = (n) => (n > 9999 ? `${(n / 1000).toFixed(1)}K` : String(n));
export const NPC_HUMAN = new Set(['npc_brasse', 'npc_ogive', 'npc_pennywhistle', 'npc_ambrose']);
const NPC_PALETTE = {};
// Each monster type has its own voice: the same sounds at its own pitch.
const typePitch = (t) => { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return (h % 15) - 7; };

export class WorldView {
  constructor(ctx, host) {
    this.ctx = ctx; this.host = host; this.zone = new ZoneView(ctx); this.fx = new Fx(ctx); this.heroes = new Map(); this.monsters = new Map(); this.allies = new Map(); this.dropsV = new Map(); this.propsV = new Map(); this.dolls = []; this.numbers = []; this.toasts = []; this.subtitles = []; this.events = []; this.corpseT = 0;
    registerParticles(ctx);
    this.rng = ctx.random.fork('cosmetic');
    this.chunks = new Chunks(ctx, this.fx);
    this.decals = new Decals(ctx.scene, { capacity: 256 });
    this.camPos = new Vector3(); this.focus = new Vector3(); this.bossArms = null; this.gravesV = new Map(); this.wagonV = null; this.bellV = null; this.arenaV = null; this.lastStep = 0; this.dark = false; this.zoneKey = null; this.vec = new Vector3(); this.banterT = 0; this.stepT = 0;
  }
  reset() { for (const a of this.heroes.values()) a.dispose(); this.heroes.clear(); this.clearZoneThings(); }
  clearZoneThings() {
    for (const m of [this.monsters, this.allies]) { for (const a of m.values()) a.dispose(); m.clear(); }
    for (const d of this.dolls) { d.doll?.disable(); d.actor.dispose(); }
    this.dolls = [];
    for (const v of this.dropsV.values()) this.removeDropV(v); this.dropsV.clear();
    for (const v of this.propsV.values()) { if (v.actor) v.actor.dispose(); if (v.light) v.light.release(); if (v.obj) this.zone.root.remove(v.obj); }
    this.propsV.clear(); this.gravesV.clear();
    this.fx.clear(); this.decals.clear();
    if (this.bossArms) { this.bossArms.dispose(); this.bossArms = null; }
    if (this.wagonV) { this.zone.root.remove(this.wagonV); this.wagonV = null; }
    this.numbers = [];
  }
  buildZone(w) {
    this.clearZoneThings();
    this.zone.build(w.zone, w.seed);
    this.zoneKey = w.zone.id;
    const look = LOOKS[w.zone.spec.look] ?? LOOKS.crypt;
    this.ctx.engine.setLook({ ...this.host.baseLook, scene: [{ id: 'vignette', params: { intensity: look.vign ?? 0.3 } }] });
    this.syncProps(w, true);
    if (w.zone.id === 'belfry_top') { const b = buildModel('old_clemency', { catalog: MODELS }); b.object.position.set(w.zone.w / 2 - 7, 7, w.zone.h / 2 - 7); b.object.traverse((m) => { if (m.isMesh) m.castShadow = true; }); this.zone.root.add(b.object); this.bellV = b.object; this.bellSwing = 0; } else this.bellV = null;
    this.ambient(w);
    this.dark = false;
  }
  ambient(w) {
    const z = w.zone.spec; const kind = z.rain ? 'rain' : z.look === 'cloister' ? 'fire' : z.look === 'belfry' || z.look === 'title' ? 'wind' : null;
    this.host.music?.ambience(kind);
  }
  actorForHero(w, h) {
    let a = this.heroes.get(h.id);
    if (a && a.cls !== h.cls) { a.dispose(); this.heroes.delete(h.id); a = null; }
    if (a) return a;
    a = new Actor(this.ctx, `hero_${h.cls}`, { shadow: 0.42, x: h.x, z: h.z });
    a.cls = h.cls; a.gearKey = '';
    a.light = this.ctx.lights.request({ follow: a.root, offset: [0, 2.3, 0], color: h.cls === 'lamplighter' ? 0xffe0a0 : 0xffc890, intensity: h.cls === 'lamplighter' ? 8 : 6, radius: 9, priority: 4 });
    a.addRing(this.host.soloRing?.() ? 'white' : (SEAT_COLORS[h.seat] ?? 'white'), 0.85);
    this.heroes.set(h.id, a);
    return a;
  }
  syncHeroGear(a, h) {
    const key = `${h.gear.main?.uid}|${h.gear.head?.rarity}|${h.gear.shoulders?.rarity}|${h.gear.off?.uid}`;
    if (a.gearKey === key) return; a.gearKey = key;
    for (const o of a.attached ?? []) a.detach(o);
    a.attached = [];
    const main = h.gear.main;
    const add = (j, id, o) => { const r = a.attach(j, id, o); if (r) a.attached.push(r); return r; };
    if (h.cls === 'bellwarden') { if (!a.bellChain) a.bellChain = new BellChain(this.ctx, a); }
    else if (main?.model) add('HandR', main.model, { at: [0, -0.1, 0.05], rot: [85, 0, 0], scale: 0.85 });
    const off = h.gear.off; if (off?.model) { const shield = off.base === 'kite' || off.base === 'round'; add('HandL', off.model, shield ? { at: [0.08, -0.08, 0.05], rot: [0, 90, 0], scale: 0.6 } : { at: [0, -0.5, 0.1], scale: 0.6 }); }
    const ht = rarityTier(h.gear.head); if (ht >= 0) add('Head', HELMS[ht].id, { at: [0, 0.22, 0] });
    const pt = rarityTier(h.gear.shoulders); if (pt >= 0) { add('ArmR', PAULS[pt].id, { at: [-0.02, 0.05, 0] }); add('ArmL', PAULS[pt].id, { at: [0.02, 0.05, 0] }); }
  }
  monsterActor(w, m) {
    const d = m.defn ?? MONSTERS[m.type]; const pal = m.tint ? { [Object.keys(MODELS.get(d.body).palette)[0]]: m.tint } : null;
    const a = new Actor(this.ctx, d.body, { scale: m.scale ?? d.scale ?? 1, hover: d.hover ?? 0, proc: d.proc, walkClip: d.walk ?? 'Walk', runClip: d.walk === 'Shamble' ? 'Shamble' : (d.walk ?? 'Run'), palette: pal, phase: m.id, x: m.x, z: m.z, shadow: Math.max(0.3, d.radius) });
    a.m = m; a.type = m.type;
    if (m.elite) a.addRing(m.elite === 'rare' ? 'sand' : 'sky', Math.max(0.8, d.radius * 1.5));
    if (d.boss === 'malison') { this.bossArms = new MalisonArms(this.ctx); }
    if (m.spawnAnim) { a.spawnY = -1.6; }
    this.monsters.set(m.id, a);
    return a;
  }
  update(w, dt, alpha, opts = {}) {
    if (!w.zone) return;
    if (this.zoneKey !== w.zone.id) this.buildZone(w);
    const focus = this.focus;
    const time = this.ctx.time;
    // Heroes.
    const living = [];
    for (const h of w.heroes) {
      if (h.left) { const old = this.heroes.get(h.id); if (old) { old.light?.release(); old.dispose(); this.heroes.delete(h.id); } continue; }
      const a = this.actorForHero(w, h); this.syncHeroGear(a, h);
      const x = h.px + (h.x - h.px) * alpha; const z = h.pz + (h.z - h.pz) * alpha; living.push({ x, z });
      let y = 0;
      if (a.leapLeft > 0) { a.leapLeft -= dt; const k = 1 - a.leapLeft / a.leapDur; y = Math.sin(Math.min(1, k) * Math.PI) * 2.6; }
      if (h.dead !== a.wasDead) { a.wasDead = h.dead; if (h.dead) a.play('Death', 0.9); else a.play('GetUp', 0.7); }
      a.update(dt, x, z, h.facing, h.moving, { y, speedOverride: h.moving ? h.speedNow ?? h.stats?.speed : 0 });
      a.bellChain?.update(dt);
      if (h.moving && Math.floor(time * 3.4) !== a.stepK) { a.stepK = Math.floor(time * 3.4); const look = w.zone.spec.look; playAt(this.ctx, look === 'yard' || look === 'moor' ? 'step_mud' : look === 'town' ? 'step_wood' : 'step_stone', x, z, focus); if (w.zone.spec.rain) this.ctx.particles.burst('rain_splash', [x, 0.05, z], { count: 1 }); }
    }
    this.zone.fadeTall(living);
    // Monsters near the camera have actors; far ones are only numbers.
    const seen = this.seen ?? (this.seen = new Set()); seen.clear();
    for (const m of w.monsters) {
      if (m.dead || m.dormant) continue;
      const dx = m.x - focus.x; const dz = m.z - focus.z; if (dx * dx + dz * dz > 40 * 40 && !this.monsters.has(m.id)) continue;
      seen.add(m.id);
      const a = this.monsters.get(m.id) ?? this.monsterActor(w, m);
      if (m.bursting) continue;
      const x = m.px + (m.x - m.px) * alpha; const z = m.pz + (m.z - m.pz) * alpha;
      let y = 0; if (a.spawnY < 0) { a.spawnY = Math.min(0, a.spawnY + dt * 3); y = a.spawnY; }
      if (m.flash > 0) a.flash(2);
      const hidden = m.untargetable && m.defn?.boss === 'ambrose'; a.root.visible = !hidden; if (a.shadow) a.shadow.visible = !hidden;
      a.update(dt, x, z, m.facing, false, { y });
      if (this.bossArms && m.type === 'malison') this.bossArms.update(dt, x, a.root.position.y, z, a.root.rotation.y, time);
      if (m.defn?.body === 'ash_gargoyle') { const wg = a.body.getObjectByName('wing'); if (wg) wg.rotation.z = Math.sin(time * 12) * 0.5; }
    }
    for (const [id, a] of this.monsters) if (!seen.has(id)) { const m = a.m; if (m && !m.dead && !m.dormant) { const dx = m.x - focus.x; const dz = m.z - focus.z; if (dx * dx + dz * dz > 44 * 44) { a.dispose(); this.monsters.delete(id); } } else if (!m || m.gone || m.dead) { a.dispose(); this.monsters.delete(id); } }
    // Allies.
    const sa = this.seenA ?? (this.seenA = new Set()); sa.clear();
    for (const al of w.allies) {
      if (al.dead) continue; sa.add(al.id);
      let a = this.allies.get(al.id);
      if (!a) a = this.allyActor(al);
      const x = al.px + (al.x - al.px) * alpha; const z = al.pz + (al.z - al.pz) * alpha;
      a.update(dt, x, z, al.facing ?? 0, false, {});
      if (al.state === 'down') a.root.rotation.x = -1.4; else a.root.rotation.x = 0;
    }
    for (const [id, a] of this.allies) if (!sa.has(id)) { a.dispose(); this.allies.delete(id); }
    this.syncProps(w, false, dt);
    this.syncDrops(w, dt, opts.localSeat);
    // Ragdolls: up to 16 live, older ones freeze and go.
    for (let i = this.dolls.length - 1; i >= 0; i--) {
      const d = this.dolls[i]; d.t += dt;
      if (d.doll?.active) d.doll.sync();
      if (d.t > 2.2) { d.actor.startDissolve(); const k = (d.t - 2.2) / 0.6; if (k >= 1) { d.doll?.disable(); d.actor.dispose(); this.dolls.splice(i, 1); continue; } d.actor.setDissolve(k); }
    }
    this.fx.update(dt);
    this.decals.update(dt);
    this.zone.update(dt, focus, time);
    // A fire voice sits at the nearest flame, spatial, muffled past a wall.
    this.fireVoice(w);
    // Weather and motes.
    if (w.zone.spec.rain && this.rng.chance(0.3)) this.ctx.particles.burst('rain_splash', [focus.x + this.rng.range(-10, 10), 0.05, focus.z + this.rng.range(-8, 8)], { count: 1 });
    if (w.zone.spec.look === 'cloister' && this.rng.chance(0.18)) this.ctx.particles.burst('emberfall', [focus.x + this.rng.range(-10, 10), 0.2, focus.z + this.rng.range(-8, 8)], { count: 1 });
    if ((w.zone.spec.look === 'belfry' || w.zone.spec.look === 'title') && this.rng.chance(0.12)) this.ctx.particles.burst('rift_spark', [focus.x + this.rng.range(-10, 10), 0.3, focus.z + this.rng.range(-8, 8)], { count: 1 });
    // Bell swing.
    if (this.bellV) { this.bellSwing = (this.bellSwing ?? 0) * 0.985; this.bellV.rotation.z = Math.sin(time * 2.4) * (0.03 + this.bellSwing); }
    // Numbers drift up.
    for (let i = this.numbers.length - 1; i >= 0; i--) { const n = this.numbers[i]; n.t += dt; n.y += dt * (n.crit ? 1.6 : 1.1); if (n.t > n.life) this.numbers.splice(i, 1); }
    // Mood: dark phase for Malison, low life.
    this.applyMood(w, opts.localHero);
  }
  applyMood(w, h) {
    if (!h) return;
    const low = h.stats ? 1 - h.hp / h.stats.maxHp : 0;
    const look = LOOKS[w.zone.spec.look] ?? LOOKS.crypt;
    const vign = (look.vign ?? 0.3) + Math.max(0, low - 0.5) * 1;
    if (Math.abs((this.lastVign ?? 0) - vign) > 0.03) { this.lastVign = vign; this.ctx.engine.setLook({ ...this.host.baseLook, scene: [{ id: 'vignette', params: { intensity: Math.min(0.95, vign) } }] }); }
    const darkOn = w.dark || (w.knell?.mods?.includes('dark'));
    if (darkOn !== this.dark) {
      this.dark = darkOn; const e = this.ctx.engine;
      e.sun.intensity = darkOn ? 0.03 : look.sunI; e.ambient.intensity = darkOn ? 0.18 : look.ambI;
      for (const l of this.zone.lights) l.intensity = darkOn ? 0 : l.baseIntensity ?? l.intensity;
    }
  }
  allyActor(al) {
    const body = al.kind === 'pyx' ? 'npc_pyx' : al.kind === 'lamp' ? 'lamp_turret' : al.kind === 'iron_bell' ? 'iron_bell' : al.kind === 'decoy' ? 'decoy' : al.kind === 'coffin_crew' || al.big ? 'coffin_crew' : 'skeleton_minion';
    const a = new Actor(this.ctx, body, { scale: al.big ? 1.2 : 1, x: al.x, z: al.z, walkClip: 'Run', runClip: 'Run', noShadow: false });
    a.ally = al;
    if (al.kind === 'lamp') a.light = this.ctx.lights.request({ follow: a.root, offset: [0, 2.3, 0], color: 0xffe0a0, intensity: 5, radius: 6, flicker: 'torch', priority: 2 });
    this.allies.set(al.id, a);
    return a;
  }
  syncProps(w, fresh, dt = 0) {
    for (const p of w.props) {
      let v = this.propsV.get(p.id);
      if (!v) {
        v = { p };
        this.propsV.set(p.id, v);
        if (p.kind === 'portcullis') {
          v.group = new Group(); for (const c of p.cells) { const b = buildModel('portcullis', { catalog: MODELS }); b.object.position.set(c.col + 0.5, 0, c.row + 0.5); if (p.horizontal === false) b.object.rotation.y = 0; else b.object.rotation.y = 0; v.group.add(b.object); } v.group.traverse((m) => { if (m.isMesh) m.castShadow = true; }); this.zone.root.add(v.group); v.obj = v.group;
        } else if (NPC_HUMAN.has(p.model)) {
          const a = new Actor(this.ctx, p.model, { x: p.x, z: p.z, idleClip: 'Idle' }); a.update(0.01, p.x, p.z, 0.8, false); v.actor = a; v.talkT = 3 + (p.id % 5);
        } else if (p.model) {
          const opts = p.model === 'gibbet' ? {} : p.model === 'dead-tree' ? { seed: p.id } : {};
          const b = buildModel(p.model, { catalog: MODELS, ...opts });
          b.object.position.set(p.x, 0, p.z);
          b.object.rotation.y = p.kind === 'decor' ? (p.id * 1.7) % 6.28 : p.kind === 'npc' ? 0.8 : 0;
          b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
          if (p.kind !== 'decor') setLookLayer(b.object, 'actors');
          this.zone.root.add(b.object); v.obj = b.object;
          if (['dead-tree', 'willow', 'gibbet', 'column', 'statue', 'bookshelf', 'obelisk', 'lychgate', 'roadgate', 'exitstair', 'market-stall', 'lamp-post'].includes(p.model)) this.zone.tall.push(b.object);
          if (p.kind === 'shrine') v.light = this.ctx.lights.request({ position: [p.x, 1.4, p.z], color: 0xffc070, intensity: 5, radius: 5, flicker: 'candle', priority: 1.2 });
          if (p.kind === 'knellfont' || p.model === 'portal') v.light = this.ctx.lights.request({ position: [p.x, 1.6, p.z], color: 0x70d0ff, intensity: 6, radius: 7, flicker: 'pulse', priority: 1.2 });
          if (b.light) v.light = this.ctx.lights.request({ ...b.light, position: [p.x + (b.light.at?.[0] ?? 0), b.light.at?.[1] ?? 1, p.z + (b.light.at?.[2] ?? 0)] });
        }
      }
      if (v.actor) { const show = visibleProp(w, p); v.actor.root.visible = show; if (v.actor.shadow) v.actor.shadow.visible = show; if (show) { v.talkT -= dt; if (v.talkT <= 0) { v.talkT = 5 + (p.id % 7); v.actor.play('TalkGesture', 0.8); } v.actor.update(dt, p.x, p.z, 0.8, false); } }
      else if (v.obj) {
        const show = visibleProp(w, p) && !p.broken && !p.gone;
        v.obj.visible = show;
        if (p.kind === 'lever' && p.used) v.obj.rotation.z = 0.8;
        if (p.kind === 'chest' && p.used) { const lid = v.obj.getObjectByName('lid'); if (lid) lid.rotation.x = -1.2; }
        if (p.kind === 'shrine' && p.used && v.light) { v.light.release(); v.light = null; }
      }
    }
    if (w.wagon && !this.wagonV) { const b = buildModel('wagon', { catalog: MODELS }); b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); this.zone.root.add(b.object); this.wagonV = b.object; }
    if (this.wagonV && w.wagon) { this.wagonV.position.set(w.wagon.x, 0, w.wagon.z); this.wagonV.rotation.y = w.wagon.facing; }
    // Graves on the floor for the Sexton's shift.
    for (const g of w.graves) if (!this.gravesV.has(g.id)) { this.gravesV.set(g.id, 1); this.decals.add('crack', { x: g.x, y: 0.03, z: g.z }, { x: 0, y: 1, z: 0 }, { size: 1, color: PALETTE.lime, life: g.t }); }
  }
  syncDrops(w, dt, seat) {
    const show = this.host.seatVisible ?? (() => true);
    const alive = this.aliveD ?? (this.aliveD = new Set()); alive.clear();
    for (const d of w.drops) {
      if (!(d.seat < 0 || show(d.seat))) continue; alive.add(d.id);
      let v = this.dropsV.get(d.id); if (!v) v = this.dropView(d);
      v.t += dt;
      const toss = Math.min(1, v.t / 0.35);
      const x = v.fx + (d.x - v.fx) * toss; const z = v.fz + (d.z - v.fz) * toss;
      const y = (Math.sin(toss * Math.PI) * 1.1) + 0.12 + (d.kind === 'gold' ? 0 : Math.sin(v.t * 3) * 0.05);
      v.root.position.set(x, y, z);
      if (v.mesh) v.mesh.rotation.y += dt * 3;
    }
    for (const [id, v] of this.dropsV) if (!alive.has(id)) { this.removeDropV(v); this.dropsV.delete(id); }
  }
  dropView(d) {
    const root = new Group(); const v = { root, t: 0, fx: d.fx ?? d.x, fz: d.fz ?? d.z, d }; root.position.set(d.x, 0.2, d.z); this.fx.root.add(root); setLookLayer(root, 'actors');
    if (d.kind === 'gold' || d.kind === 'coins') { const m = new Mesh(COINGEO, glowMaterial(PALETTE.sand)); root.add(m); v.mesh = m; }
    else if (d.kind === 'tallow') { const m = new Mesh(BLOBGEO, glowMaterial(PALETTE.white)); root.add(m); const f = new Mesh(new BoxGeometry(0.06, 0.1, 0.06), glowMaterial(PALETTE.orange)); f.position.y = 0.1; root.add(f); v.mesh = m; }
    else if (d.kind === 'gem') { const m = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), glowMaterial(PALETTE.cyan)); m.rotation.x = 0.6; root.add(m); v.mesh = m; }
    else if (d.kind === 'item') {
      const rarity = d.rarity ?? d.item?.rarity ?? 'common'; const col = RARITIES[rarity].color;
      const body = new Mesh(new BoxGeometry(0.34, 0.1, 0.34), glowMaterial(PALETTE[col])); root.add(body);
      v.mesh = body;
      const big = rarity === 'legendary' || rarity === 'set'; const h = big ? 5 : rarity === 'common' ? 0 : 1.2;
      if (h) { const b = new Mesh(BEAMGEO, glowMaterial(PALETTE[col])); b.scale.set(big ? 1.3 : 0.7, h, big ? 1.3 : 0.7); b.position.y = h / 2; root.add(b); }
      if (rarity === 'reliquary' || big) v.light = this.ctx.lights.request({ follow: root, offset: [0, 0.8, 0], color: PALETTE[col], intensity: big ? 8 : 3, radius: big ? 6 : 3, priority: 2 });
    }
    this.dropsV.set(d.id, v);
    return v;
  }
  removeDropV(v) { this.fx.root.remove(v.root); v.light?.release(); }
  number(x, z, amt, opts = {}) { this.numbers.push({ x, y: opts.y ?? 1.6, z, text: typeof amt === 'number' ? fmtNum(amt) : amt, t: 0, life: opts.crit ? 0.9 : 0.65, crit: opts.crit, color: opts.color ?? 'white', vx: this.rng.range(-0.3, 0.3), big: opts.big }); if (this.numbers.length > 80) this.numbers.shift(); }
  deathFx(m, ev, actor) {
    const d = MONSTERS[ev.type]; const px = ev.x; const pz = ev.z; const feel = this.host.feel();
    this.ctx.particles.burst(ev.burst ?? 'flesh', [px, 0.7, pz], { count: Math.round(14 * (d?.big ? 2 : 1)) });
    this.decals.add('splat', { x: px, y: 0.03, z: pz }, { x: 0, y: 1, z: 0 }, { size: this.rng.range(0.4, 0.9), color: PALETTE.plum });
    playAt(this.ctx, HITSFX[d?.material] ?? 'hit_flesh', px, pz, this.focus, { pitch: this.rng.int(-4, -1) });
    playAt(this.ctx, 'monster_die', px, pz, this.focus, { pitch: typePitch(ev.type), volume: 0.6 });
    if (!actor) return;
    const scale = actor.scaleV ?? 1;
    if (actor.humanoid && scale >= 0.55 && scale <= 1.25 && this.dolls.filter((q) => q.doll).length < 16) {
      this.monsters.delete(ev.id);
      const speed = 3 + Math.min(7, (ev.overkill ?? 0) * 6);
      const L = Math.hypot(ev.ax, ev.az) || 1;
      try {
        const doll = new Ragdoll(this.ctx.physics, actor.root, HERO_RAGDOLL);
        doll.enable({ velocity: [(ev.ax / L) * speed, 2 + speed * 0.3, (ev.az / L) * speed], spin: [this.rng.range(-4, 4), this.rng.range(-4, 4), this.rng.range(-4, 4)] });
        actor.mixer?.stopAllAction(); if (actor.shadow) actor.shadow.visible = false; if (actor.ring) actor.ring.visible = false;
        this.dolls.push({ doll, actor, t: 0 });
      } catch { actor.dispose(); }
      if (this.dolls.length > 28) { const o = this.dolls.shift(); o.doll?.disable(); o.actor.dispose(); }
    } else {
      this.monsters.delete(ev.id);
      // Others squash, burst and go; chunks fly.
      const col = d?.material === 'bone' ? 'mist' : d?.material === 'stone' ? 'slate' : d?.material === 'metal' ? 'sand' : 'night';
      this.chunks.burst([px, 0.5 * scale, pz], [0.6 * scale, 0.6 * scale, 0.6 * scale], col, [2, 2, 2], [px - (ev.ax || 0), 0.2, pz - (ev.az || 0)], 5 * feel + 2, 1.4);
      actor.dispose();
    }
  }
  // One event, its pictures and sounds.
  handle(w, ev) {
    const { ctx, fx } = this; const focus = this.focus;
    switch (ev.t) {
      case 'zone': this.buildZone(w); break;
      case 'boss': if (ev.on) { ctx.audio.play('boss_sting'); this.host.addShake(0.3); } break;
      case 'hit': {
        const a = this.monsters.get(ev.id); a?.flash(2); a?.squash.kick(-1.5); if (a && a.type && this.rng.chance(0.2)) playAt(ctx, 'monster_hurt', ev.x, ev.z, focus, { pitch: typePitch(a.type), volume: 0.4 });
        const col = ev.crit ? 'sand' : ev.element === 'flame' ? 'orange' : ev.element === 'grave' ? 'lime' : 'white';
        if (this.host.showNumbers()) this.number(ev.x, ev.z, ev.amt, { crit: ev.crit, color: col });
        ctx.particles.burst('flesh', [ev.x, 0.9, ev.z], { count: 2 });
        const cols = ELEMENT_COLORS[ev.element]; if (cols) ctx.particles.burst('shock', [ev.x, 0.9, ev.z], { count: 3, colors: cols });
        playAt(ctx, HITSFX[ev.mat] ?? 'hit_flesh', ev.x, ev.z, focus, { pitch: this.rng.int(-1, 3), volume: 0.7 });
        if (ev.crit) { playAt(ctx, 'crit', ev.x, ev.z, focus); this.host.addShake(0.08); this.host.hitstop(0.03); }
        break;
      }
      case 'dot': if (this.host.showNumbers()) this.number(ev.x, ev.z, ev.amt, { color: ev.status === 'burn' ? 'orange' : ev.status === 'poison' ? 'lime' : 'red' }); this.monsters.get(ev.id) && ctx.particles.burst(ev.status === 'burn' ? 'ember' : 'grave_smoke', [ev.x, 0.8, ev.z], { count: 1 }); break;
      case 'death': { const a = this.monsters.get(ev.id); this.deathFx(null, ev, a); if (ev.elite) { this.host.addShake(0.25); this.host.hitstop(0.05); } break; }
      case 'rise': this.monsters.get(ev.id) && ctx.particles.burst('grave_smoke', [ev.x, 0.6, ev.z], { count: 10 }); break;
      case 'matk': {
        const a = ev.ally ? this.allies.get(ev.id) : this.monsters.get(ev.id);
        if (!a) break;
        if (ev.clip === 'lash') { const m = w.monsters.find((o) => o.id === ev.id); const t = w.heroes[0]; if (this.bossArms && t) { this.bossArms.lash((ev.n ?? (this.lashN = (this.lashN ?? 0) + 1)), t.x, t.z); } break; }
        if (a.humanoid) a.play(ev.clip, ev.dur); else { a.pulseT = ev.dur; a.squash.kick(ev.hop ? 3 : 1); }
        if (!ev.ally && a.type) playAt(ctx, 'monster_swing', a.root.position.x, a.root.position.z, focus, { pitch: typePitch(a.type), volume: 0.5 });
        break;
      }
      case 'cast': {
        const a = [...this.heroes.values()].find(() => false) ?? this.heroById(w, ev.id);
        if (a) { if (ev.upper) a.play(ev.clip, ev.dur, { upper: true }); else a.play(ev.clip, ev.dur); }
        if (ev.sfx) playAt(ctx, ev.sfx, undefined, undefined, focus, { pitch: this.rng.int(-1, 1) });
        const h = w.heroes.find((q) => q.id === ev.id);
        if (ev.vfx === 'swing' && h) fx.swing(h.x, h.z, ev.ax, ev.az, ev.element);
        break;
      }
      case 'vfx': if (ev.kind.startsWith('ring_')) fx.ring(ev.kind, ev.x, ev.z, ev.r); else if (ev.kind === 'cone_fire') fx.cone(ev.x, ev.z, ev.ax, ev.az, ev.r, ev.angle); else if (ev.kind === 'blink') { ctx.particles.burst('shock', [ev.x, 0.9, ev.z], { count: 12, colors: ['cyan', 'white'] }); } else if (ev.kind === 'haste') ctx.particles.burst('shock', [ev.x, 0.9, ev.z], { count: 8 }); else fx.burst(ev.kind, ev.x, ev.z, ev.r); break;
      case 'sfx': if (ev.rate && this.rng.next() > Math.max(0.2, ev.rate * 3)) break; playAt(ctx, ev.id, ev.x, ev.z, focus, { pitch: this.rng.int(-1, 1) }); break;
      case 'shake': this.host.addShake(ev.v); if (ev.v >= 0.3) this.host.hitstop(0.05); break;
      case 'decal': this.decals.add(ev.kind === 'scorch' ? 'scorch' : 'crack', { x: ev.x, y: 0.03, z: ev.z }, { x: 0, y: 1, z: 0 }, { size: Math.min(3, ev.r), color: PALETTE.ink }); break;
      case 'flash': ctx.engine.screen.flash(ev.color ?? 'white', { duration: 0.18 }); break;
      case 'tele': fx.telegraph(ev); break;
      case 'telefire': fx.telefire(ev); if (ev.sfx) playAt(ctx, ev.sfx, ev.x, ev.z, focus); break;
      case 'proj': fx.projectile(ev); break;
      case 'projend': fx.projEnd(ev); break;
      case 'projturn': fx.projTurn(ev); break;
      case 'lob': fx.lob(ev); break;
      case 'arc': fx.arc(ev.x, ev.z, ev.x2, ev.z2, ev.element); break;
      case 'field': fx.field(ev, (id) => w.heroes.find((h) => h.id === id)); break;
      case 'fieldend': fx.fieldEnd(ev.id); break;
      case 'obstacle': fx.obstacle(ev); break;
      case 'obstacleend': fx.obstacleEnd(ev); break;
      case 'beam': fx.beam(ev, (id) => w.monsters.find((m) => m.id === id && !m.dead)); break;
      case 'beamend': fx.beamEnd(ev.id); break;
      case 'leap': { const a = this.heroById(w, ev.id); if (a) { a.leapLeft = ev.dur; a.leapDur = ev.dur; } break; }
      case 'hurt': {
        const a = this.heroById(w, ev.id); a?.flash(2); if (a && ev.big) a.play('HitReact', 0.25); playAt(ctx, 'hurt_hero', ev.x, ev.z, focus, { pitch: this.rng.int(-2, 2), volume: 0.8 });
        if (this.host.showNumbers()) this.number(ev.x, ev.z, ev.amt, { color: 'red', y: 2 });
        this.host.addShake(ev.big ? 0.3 : 0.06);
        break;
      }
      case 'heal': if (this.host.showNumbers()) this.number(ev.x, ev.z, `+${ev.amt}`, { color: 'lime', y: 2 }); break;
      case 'miss': this.number(ev.x, ev.z, 'MISS', { color: 'mist', y: 2 }); break;
      case 'level': { const a = this.heroById(w, ev.id); a?.play('Triumph', 1); fx.ring('ring_bronze', ev.x, ev.z, 3); ctx.audio.play('level_up'); break; }
      case 'herodeath': ctx.audio.play('hero_death'); this.host.addShake(0.5); if (w.heroes.length === 1 && !this.host.isSession()) this.host.slowMo?.(0.8); break;
      case 'revive': { const a = this.heroById(w, ev.id); if (a) a.play('GetUp', 0.7); fx.ring('ring_grave', ev.x, ev.z, 2.5); break; }
      case 'potion': { const a = this.heroById(w, ev.id); a?.play('Drink', 0.5, { upper: true }); ctx.audio.play('potion'); ctx.particles.burst('wax', [ev.x, 1, ev.z], { colors: ['red', 'orange'] }); break; }
      case 'break': {
        const p = w.props.find((q) => q.id === ev.id); const col = { barrel: 'orange', crate: 'orange', keg: 'orange', urn: 'red', 'clay-pot': 'orange', amphora: 'sand', coffin: 'plum', sack: 'sand' }[ev.model] ?? 'slate';
        this.chunks.burst([ev.x, 0.45, ev.z], [0.7, 0.9, 0.7], col, [3, 3, 2], [ev.fx ?? ev.x, 0.3, ev.fz ?? ev.z], 6 * this.host.feel() + 1, 2.5);
        playAt(ctx, ['barrel', 'crate', 'keg', 'coffin'].includes(ev.model) ? 'shatter_wood' : 'shatter', ev.x, ev.z, focus);
        p; break;
      }
      case 'drop': if (ev.kind === 'gold') playAt(ctx, 'coin_spray', ev.x, ev.z, focus, { volume: 0.4 }); break;
      case 'pickup': if (ev.kind === 'gold') playAt(ctx, 'gold', ev.x, ev.z, focus, { pitch: this.rng.int(0, 4) }); if (ev.kind === 'tallow') { playAt(ctx, 'tallow', ev.x, ev.z, focus); ctx.particles.burst('wax', [ev.x, 0.7, ev.z]); } if (ev.kind === 'item') playAt(ctx, 'ui_equip', ev.x, ev.z, focus); if (ev.kind === 'gem') playAt(ctx, 'bell_small', ev.x, ev.z, focus); break;
      case 'allygone': { const a = this.allies.get(ev.id); if (a) { if (ev.burst) ctx.particles.burst('bone_chips', [a.root.position.x, 0.7, a.root.position.z], { count: 14 }); a.light?.release(); a.dispose(); this.allies.delete(ev.id); } break; }
      case 'ally': if (ev.rise) { ctx.particles.burst('grave_smoke', [ev.x, 0.3, ev.z], { count: 8 }); } break;
      case 'bossdeath': { this.host.addShake(0.8); this.host.hitstop(0.1); ctx.engine.screen.flash('white', { duration: 0.3 }); fx.ring('ring_bronze', ev.x, ev.z, 10); ctx.audio.play('bell_big'); if (ev.type === 'malison' && this.bossArms) { this.bossArms.dispose(); this.bossArms = null; } const a = this.monsters.get(ev.id); if (a) { a.dispose(); this.monsters.delete(ev.id); } break; }
      case 'bossbury': { const b = buildModel('pallbearer_coffin', { catalog: MODELS }); b.object.position.set(ev.x, 0, ev.z); b.object.scale.setScalar(1.6); this.fx.root.add(b.object); let t = 0; this.fx.add({ update: (dt) => { t += dt; return t < 2.5; }, end: () => this.fx.root.remove(b.object) }); this.fx.ring('ring_chain', ev.x, ev.z, 4); break; }
      case 'bell': if (this.bellV) this.bellSwing = 0.5; this.fx.ring('ring_bronze', w.zone.w / 2, w.zone.h / 2, 18); break;
      case 'tolling': if (this.bellV) this.bellSwing = 0.3; break;
      case 'trap': break;
      case 'chest': { const v = this.propsV.get(ev.id); if (v?.obj) { ctx.particles.burst('coin_spray', [ev.x, 0.8, ev.z], { count: 16 }); } break; }
      case 'shrine': ctx.particles.burst('wax', [ev.x, 1.2, ev.z], { count: 16 }); fx.ring('ring_bronze', ev.x, ev.z, 2.5); break;
      case 'portcullis': { const v = this.propsV.get(ev.id); if (v?.obj) { const o = v.obj; let t = 0; this.fx.add({ update: (dt) => { t += dt; o.position.y = t * 2.5; return t < 1.2; }, end: () => { o.visible = false; } }); playAt(ctx, 'crumble', ev.x, ev.z, focus, { volume: 0.5 }); } break; }
      case 'relic': { const v = this.propsV.get(ev.id); if (v?.obj) ctx.particles.burst('wax', v.obj.position, { count: 14, colors: ['orange', 'sand'] }); break; }
      case 'propadd': { /* syncProps creates it next frame */ break; }
      case 'propgone': { const v = this.propsV.get(ev.id); if (v) { if (v.obj) this.zone.root.remove(v.obj); v.light?.release(); this.propsV.delete(ev.id); } break; }
      case 'plateescape': ctx.particles.burst('coin_spray', [ev.x, 0.6, ev.z], { count: 20 }); playAt(ctx, 'whoosh', ev.x, ev.z, focus); break;
      case 'coffinstart': fx.ring('ring_grave', ev.x, ev.z, 4); break;
      case 'grave': break;
      case 'graveburst': if (!ev.quiet) { ctx.particles.burst('bone_chips', [ev.x, 0.5, ev.z], { count: 12 }); fx.ring('ring_grave', ev.x, ev.z, 3); } break;
      case 'requiem': ctx.audio.play('req'); break;
      case 'mspawn': break;
      case 'maggro': if (this.rng.chance(0.25)) playAt(ctx, 'wake', ev.x, ev.z, focus, { pitch: typePitch(ev.type ?? 'x'), volume: 0.5 }); break;
      case 'mstun': { const a = this.monsters.get(ev.id); if (a) a.play?.('HitReact', 0.3); break; }
      default: break;
    }
  }
  fireVoice(w) {
    const lights = w.zone.lights; if (!lights?.length) return; const f = this.focus; let best = null; let bd = 1e9;
    if (this.ctx.engine.frame % 15) return;
    for (const l of lights) { const d = (l.x - f.x) ** 2 + (l.z - f.z) ** 2; if (d < bd) { bd = d; best = l; } }
    this.flameVoice ??= this.ctx.audio.loop(LOOPS.fire, { volume: 0 });
    const s = spatialize({ position: [f.x, 1, f.z], right: [0.7071, 0, -0.7071] }, [best.x, 1, best.z], { max: 12 });
    this.flameVoice.set?.({ volume: s.gain * 0.8, pan: s.pan, muffle: w.zone.nav.lineOfSight(f.x, f.z, best.x, best.z) ? 0 : 0.8 });
  }
  heroById(w, id) { const a = this.heroes.get(id); return a ?? null; }
  project(x, y, z, hud) {
    const v = this.vec.set(x, y, z).project(this.ctx.camera.camera);
    return { x: ((v.x + 1) / 2) * hud.width, y: ((1 - v.y) / 2) * hud.height };
  }
}
export { BANTER, SPEAKERS, disposeObject, toonMaterial, Rng };
