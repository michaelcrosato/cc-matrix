// The view: reads a world (the sim, or a client's mirror) and turns events into what you see and hear.
import { buildModel, Decals, disposeObject, glowMaterial, PALETTE, Rng, setLookLayer, THREE, toonMaterial, Trail } from '../../pixel-engine.js';
import { CLASSES } from '../data/classes.js';
import { RARITIES } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { Actor, CLASS_BODY, makeRagdoll, SEAT_COLORS } from './actors.js';
import { FxKit, GROUND_GEO, mat as glowOf, WaveRing } from './fxkit.js';
import { MODELS } from './models/index.js';
import { ELEMENT_COLORS, ELEMENT_LIGHT, FX, GIB, MAT_SOUND, registerParticles } from './vfx.js';
import { applyBiomeLight, ZoneView } from './zonebuild.js';
import { fixDecor, makeDropMesh, OBJECT_MODELS, propModel, makeShotMesh } from './lootview.js';

const { Group, Mesh, Vector3 } = THREE;
const tmpV = new Vector3();

export class View {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.w = null;
    this.actorRoot = new Group();
    this.actorRoot.name = 'actors';
    ctx.scene.add(this.actorRoot);
    this.fx = new FxKit(ctx.scene);
    this.decals = new Decals(ctx.scene, { capacity: 256 });
    this.actors = new Map();
    this.corpses = [];
    this.drops = new Map();
    this.objects = new Map();
    this.props = new Map();
    this.areas = new Map();
    this.teles = new Map();
    this.waves = new Map();
    this.shots = new Map();
    this.lobs = [];
    this.falls = [];
    this.obstacles = new Map();
    this.graves = new Map();
    this.numbers = [];
    this.fxRng = new Rng(`fx:${game.seed ?? 1}`);
    this.cam = new Vector3(0, 1, 0);
    this.camOverride = null;
    this.zoomGoal = 1;
    this.zoneView = null;
    this.showLabels = false;
    this.elapsed = 0;
    registerParticles(ctx.particles);
  }

  setWorld(w) {
    this.clearActors();
    this.w = w;
    if (w?.zone) this.onZone();
    if (w) for (const h of w.heroes) if (!h.gone) this.makeHero(h);
  }

  // ---- Zones ---------------------------------------------------------------------------------
  onZone() {
    const w = this.w;
    this.clearTransient();
    if (this.zoneView) this.zoneView.dispose();
    this.zoneView = new ZoneView(this, w.zone);
    this.buildObjects(w.objects);
    this.buildProps(w.props);
    this.dark = false;
    if (w.run?.mods?.includes('dark')) { applyBiomeLight(this.ctx.engine, this.ctx.scene, w.zone.biome, true); this.dark = true; }
    this.game.audioSys?.zoneChanged(w.zone);
    if (w.zone.id === 'belfry' && w.zone.floor === 3) this.buildBell(w.zone);
    for (const h of w.heroes) { if (!h.gone) this.makeHero(h); const a = this.actors.get(h.id); if (a) { a.root.position.set(h.x, 0, h.z); } }
    this.cam.set(w.heroes[0]?.x ?? w.zone.w / 2, 1, w.heroes[0]?.z ?? w.zone.h / 2);
    this.ctx.camera.teleport(this.cam);
  }

  buildBell(z) {
    const b = buildModel('old_clemency', { catalog: MODELS });
    b.object.position.set(z.w / 2, 7.5, z.h / 2);
    b.object.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.zoneView.root.add(b.object);
    this.bell = b.object;
    this.bellSwing = 0;
    this.bellLight = this.ctx.lights.request({ position: [z.w / 2, 5, z.h / 2], color: 0x60e0f0, intensity: 8, radius: 16, priority: 2 });
    this.zoneView.lights.push(this.bellLight);
  }

  buildObjects(list) {
    for (const o of list) this.addObject(o);
    this.fixVisibility();
  }

  addObject(o) {
    if (this.objects.has(o.id)) return;
    const rec = { o, group: new Group(), actor: null };
    this.objects.set(o.id, rec);
    rec.group.position.set(o.x, 0, o.z);
    const root = this.zoneView.root;
    root.add(rec.group);
    let id = OBJECT_MODELS[o.kind];
    if (typeof id === 'function') id = id(o);
    if (o.kind === 'npc' && o.npc !== 'crier') {
      rec.actor = new Actor(this, { id: o.id, type: `npc_${o.npc}`, body: `npc_${o.npc}`, def: { r: 0.45 }, x: o.x, z: o.z, humanoid: true });
      rec.actor.root.rotation.y = Math.PI / 4;
      rec.isNpc = true;
    } else if (o.kind === 'novice') {
      rec.actor = new Actor(this, { id: o.id, type: 'npc_novice', body: 'npc_novice', def: { r: 0.3 }, x: o.x, z: o.z, humanoid: true });
      rec.actor.root.rotation.y = this.fxRng.range(0, 6);
    } else if (id) {
      const b = buildModel(id, { catalog: MODELS });
      b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      if (o.kind === 'door') { b.object.scale.set(1, 1.1, 1); b.object.rotation.y = this.fxRng.chance(0) ? 0 : Math.PI / 2; }
      setLookLayer(b.object, 'actors');
      rec.group.add(b.object);
      rec.model = b.object;
      rec.head = b.object.getObjectByName('CrierHead');
      rec.lid = b.object.getObjectByName('lid');
      if (b.light || o.kind === 'font' || o.kind === 'shrine' || o.kind === 'portal' || o.kind === 'relic') {
        const c = o.kind === 'font' ? 0x60e0f0 : o.kind === 'portal' ? 0x60e0f0 : o.kind === 'relic' ? 0xffe0a0 : 0xffb060;
        rec.light = this.ctx.lights.request({ position: [o.x, 1.8, o.z], color: c, intensity: 5, radius: 6, flicker: o.kind === 'shrine' ? 'candle' : undefined, priority: 1 });
        this.zoneView.lights.push(rec.light);
      }
    }
    if (o.kind === 'npc') rec.group.rotation.y = Math.PI / 4;
    if (o.kind === 'exit') {
      // A glowing arrow-ish marker above the way on.
      const m = new Mesh(GROUND_GEO.ring, glowOf(o.to === 'town' || o.key === 'exit_back' ? 'sky' : 'lime'));
      m.position.y = 0.1; m.scale.setScalar(1.2);
      rec.group.add(m);
      rec.ring = m;
    }
    rec.group.visible = !o.hidden && !(o.kind === 'trap');
  }

  fixVisibility() {
    for (const r of this.objects.values()) {
      const show = !r.o.hidden;
      r.group.visible = show && r.o.kind !== 'spot';
      if (r.actor) r.actor.setHidden(!show);
    }
  }

  buildProps(list) {
    for (const p of list) {
      const b = buildModel(propModel(p.type), { catalog: MODELS });
      b.object.position.set(p.x, 0, p.z);
      b.object.rotation.y = (p.id * 2.4) % 6.28;
      b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      setLookLayer(b.object, 'actors');
      this.zoneView.root.add(b.object);
      this.props.set(p.id, { p, obj: b.object });
    }
  }

  // ---- Heroes and monsters -------------------------------------------------------------------
  makeHero(h) {
    if (this.actors.has(h.id)) return this.actors.get(h.id);
    const a = new Actor(this, { id: h.id, type: h.cls, body: CLASS_BODY[h.cls], def: { r: 0.45 }, x: h.x, z: h.z, isHero: true });
    this.actors.set(h.id, a);
    a.light = this.ctx.lights.request({ follow: a.root, offset: [0, 1.7, 0], color: h.cls === 'lamplighter' ? 0xffc070 : 0xffe0b0, intensity: h.companion ? 4 : 7, radius: 9, priority: 4 });
    a.setTrail(PALETTE[CLASSES[h.cls].color] ?? PALETTE.white, PALETTE.plum);
    a.setGear(h.gearLook ?? { main: h.gear?.main?.model ?? '', off: h.gear?.off?.model ?? '', head: h.gear?.head?.rarity ?? '', shoulders: h.gear?.shoulders?.rarity ?? '' }, h.cls);
    a.seat = h.seat;
    a.isCompanion = !!h.companion;
    const ring = new Mesh(GROUND_GEO.ring, glowOf(SEAT_COLORS[h.seat] ?? 'white'));
    ring.scale.setScalar(0.62);
    ring.position.y = 0.05;
    a.root.add(ring);
    a.seatRing = ring;
    ring.visible = false;
    return a;
  }

  dustAt(x, z) { this.ctx.particles.burst('dust_ring', [x, 0.1, z]); }

  sfx(name, o) { this.game.audioSys?.sfx(name, o); }

  feel() { return (this.w?.tuning?.hitFeel ?? 1); }
  shake(v) { const s = this.game.settings?.shake ?? 1; if (v > 0) this.ctx.engine.shake.add(v * this.feel() * s); }
  hitstop(v) { if (!this.game.isSession && v > 0) this.ctx.engine.hitstop(v * Math.min(1.5, this.feel())); }

  showFx(e) {
    const def = FX[e.k];
    const parts = this.ctx.particles;
    const x = e.x, z = e.z;
    if (e.s) this.sfx(e.s, { x, z });
    if (e.sh) this.shake(e.sh);
    if (e.wv) this.ctx.engine.screen.shockwave([x, 0.5, z], { radius: Math.min(0.6, 0.1 + (e.r ?? 4) * 0.03) });
    if (e.fall) this.obj_fall({ k: e.fall, x, z });
    switch (e.k) {
      case 'arc': this.fx.bolt(x, z, e.x2, e.z2, (ELEMENT_COLORS[e.el ?? ''] ?? ELEMENT_COLORS[''])[0], 0.12, { w: 0.14 }); return;
      case 'beam': this.fx.bolt(x, z, x + e.dx * e.r, z + e.dz * e.r, 'orange', 0.26, { y: 0.6, w: 0.22 }); return;
      case 'rope_lash': case 'chain_line': case 'hook': this.fx.bolt(x, z, x + e.dx * (e.r || 8), z + e.dz * (e.r || 8), e.k === 'rope_lash' ? 'sand' : 'slate', 0.2, { y: 0.5, w: 0.3 }); return;
      default: break;
    }
    if (!def) return;
    const color = (ELEMENT_COLORS[e.el ?? ''] ?? ELEMENT_COLORS[''])[0];
    const r = e.r ?? 2;
    const dur = def.dur ?? 0.3;
    if (def.sector) {
      this.fx.sector(x, z, e.dx ?? 0, e.dz ?? 1, r || 3, (e.a || 120) * (def.wide ? 1.1 : 1), e.el && e.el !== 'sound' ? color : def.sector, dur, { inner: def.wide ? 0.2 : 0.62, y: def.wide ? 0.6 : 0.8 });
    }
    if (def.ring) def.ring.forEach((c, i) => this.fx.ring(x, z, (def.small ? 1 : r) * (1 - i * 0.2), c, dur * (1 + i * 0.3)));
    if (def.disc) this.fx.disc(x, z, r * 0.8, def.disc, dur * 0.7, { shrink: true, y: 0.05 });
    if (def.k) parts.burst(def.k, [x, 0.5, z], def.few ? { count: def.few } : {});
    if (def.k === 'ember' || def.k === 'shock') { if (r > 3) parts.burst(def.k, [x + r * 0.5, 0.3, z], {}); if (r > 3) parts.burst(def.k, [x - r * 0.5, 0.3, z], {}); }
    if (def.l) this.ctx.lights.request({ position: [x, 1.4, z], color: def.l[0], intensity: def.l[1], radius: def.l[2], lifetime: def.l[3], priority: 3 });
    if (e.k === 'grave_burst' || e.k === 'fire_burst') this.decals.add('scorch', { x, y: 0.03, z }, { x: 0, y: 1, z: 0 }, { size: r * 0.9, color: PALETTE.ink, life: 8 });
  }

  // ---- Events --------------------------------------------------------------------------------
  consume(events) {
    for (const e of events) {
      const f = this[`ev_${e.t}`];
      if (f) f.call(this, e);
    }
  }

  ev_zone() { this.onZone(); }
  ev_fx(e) { this.showFx(e); }
  ev_sfx(e) { this.sfx(e.k, e); }
  ev_hero(e) { const h = this.w.heroes.find((o) => o.id === e.id); if (h) this.makeHero(h); }
  ev_hero_gone(e) { const a = this.actors.get(e.id); if (a) { a.remove(); this.actors.delete(e.id); } }
  ev_hero_class(e) {
    const h = this.w.heroes.find((o) => o.id === e.id);
    this.ev_hero_gone(e);
    if (h) this.makeHero(h);
    this.ctx.particles.burst('shrine_glow', [h?.x ?? 0, 1, h?.z ?? 0]);
  }
  ev_gear(e) { const a = this.actors.get(e.id); const h = this.w.heroes.find((o) => o.id === e.id); if (a && h) a.setGear(e.g, h.cls); }

  ev_spawn(e) {
    if (this.actors.has(e.id)) return;
    const def = MONSTERS[e.k];
    const a = new Actor(this, { id: e.id, type: e.k, def, x: e.x, z: e.z, from: e.from, scale: e.s, tint: e.tint || undefined, ally: !!e.ally });
    a.root.rotation.y = e.f;
    this.actors.set(e.id, a);
    if (e.e === 'champion' || e.e === 'rare') {
      const ring = new Mesh(GROUND_GEO.ring, glowOf(e.e === 'rare' ? 'sand' : 'sky'));
      ring.scale.setScalar(Math.max(0.7, def.r * 1.5));
      ring.position.y = 0.06;
      a.root.add(ring);
      a.elite = e.e;
      a.eliteLight = this.ctx.lights.request({ follow: a.root, offset: [0, 1.4, 0], color: e.e === 'rare' ? 0xffd070 : 0x70b0ff, intensity: 3, radius: 4, priority: 1 });
    }
    if (e.ally) { a.isAlly = true; if (def.ai === 'turret' && e.k === 'lamp_post') a.light = this.ctx.lights.request({ follow: a.root, offset: [0, 2, 0], color: 0xffb060, intensity: 6, radius: 7, flicker: 'torch', priority: 2 }); if (e.coffin && false) a.flash(1); }
    if (e.k === 'ash_gargoyle') a.statue = true;
    if (e.from === 'ground') this.sfx('rise', { x: e.x, z: e.z });
    else if (e.k !== 'collection_plate' && def.voice && this.fxRng.chance(0.2)) this.sfx('mon_wake', { x: e.x, z: e.z, v: def.voice });
  }

  ev_remove(e) {
    const a = this.actors.get(e.id);
    if (!a) return;
    if (e.puff) this.dustAt(a.root.position.x, a.root.position.z);
    if (a.eliteLight) a.eliteLight.release();
    a.remove();
    this.actors.delete(e.id);
  }

  ev_hit(e) {
    const a = this.actors.get(e.id);
    if (e.imm) { this.addNumber(e.x, 2, e.z, 'IMMUNE', 'mist', 1); return; }
    const big = e.c || e.big;
    if (!e.dot || !this.settingsNoNumbers) {
      if (this.game.settings?.numbers !== false) this.addNumber(e.x, (a ? 1.6 * a.scale : 1.6), e.z, fmtNum(e.a), e.c ? 'sand' : e.dot ? 'mist' : e.s >= 0 ? ['white', 'white', 'white', 'white'][e.s] ?? 'white' : 'white', e.c ? 2 : 1);
    }
    if (e.dot) return;
    if (a) {
      a.flash(2);
      a.squash.kick(a.def.blob ? -6 : -2.5);
      const parts = this.ctx.particles;
      const colors = ELEMENT_COLORS[e.el ?? ''] ?? ELEMENT_COLORS[''];
      parts.burst('hit_spark', [e.x, 0.9 * a.scale, e.z], { colors });
      if (a.mixer && !a.oneShot && !a.def.huge) a.play('HitReact', 1.4, true);
      const voice = MAT_SOUND[a.def.mat] ?? 'hit_flesh';
      this.sfx(voice, { x: e.x, z: e.z, n: e.c ? 2 : 0 });
      if (a.def.voice && this.fxRng.chance(0.25)) this.sfx('mon_hurt', { x: e.x, z: e.z, v: a.def.voice });
      if (e.c) this.sfx('crit', { x: e.x, z: e.z });
      if (big) { this.shake(0.12); this.hitstop(0.05); }
    }
  }

  ev_hhit(e) {
    const a = this.actors.get(e.id);
    if (!a) return;
    if (e.a > 0) {
      if (!e.dot) a.flash(2);
      this.addNumber(e.x, 2.1, e.z, `${e.a}`, 'red', 1, 0.8);
      if (!e.dot) { this.sfx('hurt_hero', { x: e.x, z: e.z, cls: a.type }); this.shake(0.1); if (!a.oneShot) a.play('HitReact', 1.4, true); }
    }
    this.lastHurtT = this.elapsed;
  }

  ev_death(e) {
    const a = this.actors.get(e.id);
    this.actors.delete(e.id);
    if (!a) return;
    const def = a.def;
    const x = a.root.position.x, z = a.root.position.z;
    if (a.eliteLight) a.eliteLight.release();
    const parts = this.ctx.particles;
    if (def.gib && GIB[def.gib]) parts.burst(GIB[def.gib], [x, 0.9 * a.scale, z], {});
    if (!e.silent && !e.ally) this.sfx('mon_death', { x, z, v: def.voice, mat: def.mat });
    if (e.k === 'collection_plate') { this.shake(0.2); this.hitstop(0.08); this.sfx('jackpot', { x, z }); parts.burst('coin_spray', [x, 1, z], { count: 40 }); }
    if (def.mat === 'flesh' && !def.hover) this.decals.add('splat', { x: x + this.fxRng.range(-0.4, 0.4), y: 0.03, z: z + this.fxRng.range(-0.4, 0.4) }, { x: 0, y: 1, z: 0 }, { size: this.fxRng.range(0.4, 0.9), color: PALETTE.plum, life: 14 });
    const l = Math.hypot(e.dx, e.dz) || 1;
    const force = (e.force ?? 1) * (this.game.settings?.ragdollForce ?? 1);
    a.flashT = 0;
    for (const m of a.meshes) m.material = m.userData.orig;
    if (a.humanoid && !def.noRagdoll && a.scale === 1 && !e.ally) {
      // Reparent so the ragdoll works in world space.
      const body = a.body;
      body.position.copy(a.root.position);
      body.rotation.copy(a.root.rotation);
      this.actorRoot.add(body);
      a.mixer?.stopAllAction();
      a.mixer = null;
      a.root.visible = false;
      a.shadow.visible = false;
      const speed = 3.5 * force;
      const vel = [(e.dx / l) * speed, 2 + force * 1.6, (e.dz / l) * speed];
      let doll = null;
      try { doll = makeRagdoll(this, a, vel); } catch { doll = null; }
      this.corpses.push({ a, doll, t: 0, life: 2.2, body, world: true });
      while (this.corpses.filter((c) => c.doll).length > 16) {
        const old = this.corpses.find((c) => c.doll);
        old.doll.disable();
        old.doll = null;
        old.t = Math.max(old.t, old.life - 0.4);
      }
    } else {
      if (a.humanoid && a.mixer) a.play('Death', 1.3, false, true);
      else a.squash.kick(def.blob ? 10 : -6);
      this.corpses.push({ a, doll: null, t: 0, life: def.boss ? 3 : 1.2 });
      if (def.blob) { parts.burst('poison', [x, 1, z], { count: 20 }); a.root.visible = false; a.shadow.visible = false; this.corpses[this.corpses.length - 1].life = 0.05; }
    }
  }

  ev_cast(e) {
    const a = this.actors.get(e.id);
    if (!a) return;
    a.play(e.clip, e.sp * (e.upper ? 1.2 : 1.05), !!e.upper);
    this.sfx('cast_grunt', { id: e.id, sk: e.sk, cls: a.type });
  }

  ev_mcast(e) {
    const a = this.actors.get(e.id);
    if (!a) return;
    if (a.mixer) a.play(e.clip === 'roar' || e.clip === 'cast' ? 'Shout' : e.clip, e.sp ?? 1);
    else {
      if (e.clip === 'swell') a.squash.kick(5);
      if (e.clip === 'lash') a.lash = 0.5;
      if (e.clip === 'roar' || e.clip === 'bite' || e.clip === 'charge' || e.clip === 'scream') a.headTilt = 0.5;
      if (e.clip === 'stagger') a.squash.kick(-8);
    }
    if (a.def.voice) this.sfx('mon_attack', { x: a.root.position.x, z: a.root.position.z, v: a.def.voice });
  }

  ev_dodge(e) { const a = this.actors.get(e.id); if (a) { a.play('Roll', 1.3); this.sfx('dodge', e); this.dustAt(e.x, e.z); } }
  ev_dodged(e) { const a = this.actors.get(e.id); if (a) this.addNumber(a.root.position.x, 2, a.root.position.z, 'DODGED', 'sky', 1, 0.7); }
  ev_potion(e) { const a = this.actors.get(e.id); if (a) { a.play('Drink', 1.6, true); this.ctx.particles.burst('wax', [e.x, 1.2, e.z], { colors: ['red', 'orange'] }); this.sfx('potion', e); } }
  ev_blink(e) {
    this.ctx.particles.burst('ember', [e.x, 1, e.z], { count: 10 });
    this.ctx.particles.burst('ember', [e.x2, 1, e.z2], { count: 10 });
    this.fx.ring(e.x, e.z, 1.4, 'plum', 0.2);
    if (e.s) this.sfx(e.s, { x: e.x2, z: e.z2 });
    const a = this.actors.get(e.id);
    if (a) { a.root.position.set(e.x2, a.root.position.y, e.z2); }
  }
  ev_leap(e) { const a = this.actors.get(e.id); if (a) { a.leapT = e.dur; a.leapDur = e.dur; this.sfx('whoosh', { x: e.x, z: e.z }); } }
  ev_spin(e) { const a = this.actors.get(e.id); if (a) a.loopClip('Spin', e.dur, 1); }
  ev_level(e) {
    const a = this.actors.get(e.id);
    if (e.quiet) return;
    this.ctx.particles.burst('level_up', [e.x, 1, e.z]);
    this.fx.pillar(e.x, e.z, 'sand', 14, 0.9, { w: 1 });
    this.fx.ring(e.x, e.z, 4, 'white', 0.6);
    if (a) a.play('Triumph', 1.4, true);
    this.sfx('levelup', e);
    this.ctx.lights.request({ position: [e.x, 2, e.z], color: 0xfff0c0, intensity: 16, radius: 12, lifetime: 0.9, priority: 3 });
  }
  ev_down(e) {
    const a = this.actors.get(e.id);
    if (a) { a.play('Death', 1, false, true); a.downed = true; }
    this.sfx('hero_death', e);
    if (!e.companion && !this.game.isSession && this.game.humanCount() <= 1) { this.ctx.engine.timeScale = Math.min(this.ctx.engine.timeScale, 0.25); this.slowT = 0.8; }
  }
  ev_up(e) {
    const a = this.actors.get(e.id);
    if (a) { a.downed = false; a.oneShot?.stop?.(); a.oneShot = null; a.play('GetUp', 1.2); }
    this.sfx('revive', e);
    this.fx.ring(e.x, e.z, 3, 'sand', 0.5);
    this.ctx.particles.burst('shrine_glow', [e.x, 1, e.z]);
  }
  ev_revive(e) { this.fx.pillar(e.x, e.z, 'sand', 10, 0.5, { w: 0.8 }); }
  ev_bell_start(e) { const a = this.actors.get(e.id); if (a) a.play('RaiseHands', 0.7); this.sfx('bell_small', { }); }

  // Shots and lobs.
  ev_shot(e) {
    const m = makeShotMesh(this, e);
    this.fxGroup().add(m);
    const s = { m, x: e.x, z: e.z, vx: e.vx, vz: e.vz, life: e.life, k: e.k, team: e.team };
    if (e.team === 0) s.light = this.ctx.lights.request({ position: [e.x, 1, e.z], color: ELEMENT_LIGHT[e.el ?? ''] ?? 0xffffff, intensity: 3, radius: 3, priority: 1.5 });
    s.trail = new Trail({ width: 0.16, life: 0.2, points: 10 });
    const c = ELEMENT_COLORS[e.el ?? ''] ?? ELEMENT_COLORS[''];
    s.trail.head.setHex(PALETTE[c[0]]); s.trail.tail.setHex(PALETTE[c[1] ?? c[0]]);
    this.fxGroup().add(s.trail);
    this.shots.set(e.id, s);
  }
  ev_shotx(e) {
    const s = this.shots.get(e.id);
    if (!s) return;
    this.removeShot(e.id, s);
    if (e.hit) this.ctx.particles.burst('hit_spark', [e.x, 1, e.z], {});
  }
  removeShot(id, s) {
    this.fxGroup().remove(s.m);
    this.fxGroup().remove(s.trail);
    s.trail.dispose();
    s.light?.release();
    this.shots.delete(id);
  }
  ev_lob(e) {
    const id = { lantern: 'hand-lantern', coffin: 'pallbearer_coffin' }[e.k];
    let obj;
    if (id) { obj = buildModel(id, { catalog: MODELS }).object; }
    else {
      obj = new Mesh(GROUND_GEO.box, glowOf(e.k === 'bone' ? 'mist' : e.k === 'meteor' ? 'red' : 'orange'));
      const s = e.k === 'meteor' ? 1.6 : e.k === 'bone' ? 0.24 : 0.5;
      obj.scale.set(s, s, s);
    }
    this.fxGroup().add(obj);
    if (e.s) this.sfx(e.s, e);
    const l = { obj, t: 0, dur: e.dur, x0: e.x, z0: e.z, x1: e.px, z1: e.pz, sky: e.sky || e.k === 'coffin', k: e.k };
    if (e.k === 'comet' || e.k === 'meteor') {
      l.light = this.ctx.lights.request({ position: [e.px, 3, e.pz], color: 0xff8030, intensity: 7, radius: 6, priority: 2 });
      l.trail = new Trail({ width: e.k === 'meteor' ? 0.9 : 0.35, life: 0.3, points: 14 });
      l.trail.head.setHex(PALETTE.orange); l.trail.tail.setHex(PALETTE.red);
      this.fxGroup().add(l.trail);
    }
    this.lobs.push(l);
  }
  obj_fall(e) {
    const id = e.k === 'bell' ? 'iron_bell' : 'pallbearer_coffin';
    const o = buildModel(id, { catalog: MODELS }).object;
    o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    o.position.set(e.x, 8, e.z);
    this.fxGroup().add(o);
    this.falls.push({ o, t: -(e.delay ?? 0), x: e.x, z: e.z });
  }
  ev_obj_fall(e) { this.obj_fall(e); }

  // Ground effects.
  ev_area(e) {
    const c = AREA_LOOK[e.k] ?? AREA_LOOK.default;
    const g = new Group();
    g.position.set(e.x, 0, e.z);
    if (c.disc) { const d = new Mesh(GROUND_GEO.disc, glowOf(c.disc)); d.scale.setScalar(e.r * 0.96); d.position.y = 0.04; g.add(d); }
    if (c.ring) { const r = new Mesh(GROUND_GEO.thin, glowOf(c.ring)); r.scale.setScalar(e.r); r.position.y = 0.07; g.add(r); }
    if (c.pillar) { const p = new Mesh(GROUND_GEO.box, glowOf(c.pillar)); p.scale.set(0.9, 16, 0.9); p.position.y = 8; g.add(p); }
    if (c.light) { const l = this.ctx.lights.request({ position: [e.x, 1.2, e.z], color: c.light, intensity: 5, radius: e.r + 3, flicker: 'torch', priority: 2 }); g.userData.light = l; }
    this.fxGroup().add(g);
    this.areas.set(e.id, { g, e, k: e.k, r: e.r, part: c.part, t: 0 });
    if (c.sfx) this.sfx(c.sfx, e);
  }
  ev_areamove(e) { const a = this.areas.get(e.id); if (a) { a.g.position.x = e.x; a.g.position.z = e.z; a.g.userData.light?.position.set(e.x, 1.2, e.z); } }
  ev_areax(e) {
    const a = this.areas.get(e.id);
    if (a) { a.g.userData.light?.release(); this.fxGroup().remove(a.g); this.areas.delete(e.id); return; }
    const w = this.waves.get(e.id);
    if (w) { this.fxGroup().remove(w.ring.mesh); w.ring.dispose(); this.waves.delete(e.id); }
  }

  ev_tele(e) {
    const g = new Group();
    g.position.set(e.x, 0, e.z);
    let inner;
    if (e.sh === 'ring') {
      const out = new Mesh(GROUND_GEO.ring, glowOf('red'));
      out.scale.setScalar(e.r);
      out.position.y = 0.09;
      g.add(out);
      inner = new Mesh(GROUND_GEO.disc, glowOf('plum'));
      inner.position.y = 0.07;
      inner.scale.setScalar(0.05);
      g.add(inner);
    } else {
      const yaw = Math.atan2(e.dx, e.dz);
      g.rotation.y = yaw;
      for (const side of [-1, 1]) { const b = new Mesh(GROUND_GEO.quad, glowOf('red')); b.scale.set(0.12, 1, e.len); b.position.set((side * e.w) / 2, 0.09, e.len / 2); g.add(b); }
      inner = new Mesh(GROUND_GEO.quad, glowOf('plum'));
      inner.position.y = 0.07;
      inner.scale.set(e.w, 1, 0.01);
      g.add(inner);
    }
    this.fxGroup().add(g);
    this.teles.set(e.id, { g, inner, e, t: 0 });
    this.sfx('telegraph', e);
  }
  ev_telex(e) { const t = this.teles.get(e.id); if (t) { this.fxGroup().remove(t.g); this.teles.delete(e.id); } }

  ev_wave(e) {
    const ring = new WaveRing(e.el === 'flame' ? 'orange' : 'sand', e.gapA, e.gapW);
    this.fxGroup().add(ring.mesh);
    this.waves.set(e.id, { ring, x: e.x, z: e.z, sp: e.sp, t: 0, max: e.max });
  }

  // Drops.
  ev_drop(e) {
    const local = this.game.isLocalLoot?.(e.owner) ?? true;
    if (!local && e.owner >= 0) return;
    const rec = makeDropMesh(this, e);
    this.fxGroup().add(rec.g);
    this.drops.set(e.id, rec);
    if (e.kind === 'item') {
      const R = RARITIES[e.rarity];
      if (R.beam >= 5) {
        this.sfx('bell_loot', e);
        this.game.onBigDrop?.(e);
        this.shake(0.1);
      } else this.sfx(e.rarity === 'reliquary' ? 'drop_rare' : 'drop_item', e);
    } else if (e.kind === 'gold' || e.kind === 'coin') this.sfx('gold_drop', e);
    else if (e.kind === 'tallow') this.sfx('tallow_drop', e);
    else this.sfx('drop_rare', e);
  }
  ev_dropx(e) {
    const r = this.drops.get(e.id);
    if (!r) return;
    r.light?.release();
    this.fxGroup().remove(r.g);
    this.drops.delete(e.id);
  }
  ev_pick(e) {
    if (e.kind === 'gold') { this.sfx('gold', e); if (this.game.settings?.numbers !== false) this.addNumber(e.x, 1.2, e.z, `+${e.amount}`, 'sand', 1, 0.6); }
    else if (e.kind === 'tallow') { this.sfx('tallow', e); this.ctx.particles.burst('wax', [e.x, 0.8, e.z]); }
    else this.sfx('pickup', e);
  }

  // Objects and props.
  ev_objadd(e) {
    const o = this.w.objects.find((q) => q.id === e.o.id) ?? e.o;
    this.addObject(o);
    this.ctx.particles.burst('shrine_glow', [o.x, 1, o.z]);
  }
  ev_obj(e) {
    const r = this.objects.get(e.id);
    if (!r) return;
    const o = r.o;
    if (e.hidden !== undefined && o !== this.w.objects.find((q) => q.id === e.id)) o.hidden = e.hidden;
    r.group.visible = !e.hidden;
    if (r.actor) r.actor.setHidden(!!e.hidden);
    if (o.kind === 'shrine' && e.state === 1 && r.model) {
      r.group.remove(r.model);
      const spent = buildModel('votive_rack_spent', { catalog: MODELS }).object;
      r.group.add(spent);
      r.model = spent;
      r.light?.release();
    }
    if (o.kind === 'chest' && e.state === 1 && r.lid) r.lid.rotation.x = -1.4;
    if (o.kind === 'lever' && e.state === 1 && r.model) { const arm = r.model.getObjectByName('arm') ?? r.model.getObjectByName('handle'); if (arm) arm.rotation.x = 1; r.model.rotation.y += 0; }
    if (o.kind === 'door' && e.state === 1) r.group.visible = false;
    if (o.kind === 'book' && e.state === 1) r.group.visible = false;
    if (o.kind === 'coffin' && e.state === 2) r.group.visible = false;
    if (o.kind === 'gate' && e.locked === false && r.model) { r.model.rotation.y = Math.PI / 2; }
    if (o.kind === 'gibbet' && e.state === 1) this.dustAt(o.x, o.z);
  }
  ev_objmove(e) {
    const r = this.objects.get(e.id);
    if (!r) return;
    r.group.position.set(e.x, 0, e.z);
    r.group.rotation.y = e.d;
    if (e.m && !this.cartLoop) this.cartLoop = this.game.audioSys?.loopAt('cart_loop');
  }
  ev_prop(e) {
    const r = this.props.get(e.id);
    if (!r) return;
    r.obj.visible = false;
    this.fx.shatter(e.x, 0.1, e.z, PALETTE[PROP_COLORS[e.k] ?? 'orange'], e.fx ?? e.x, e.fz ?? e.z, this.fxRng, { speed: 5 * Math.max(0.5, this.feel()) });
    this.ctx.particles.burst('dust_ring', [e.x, 0.3, e.z], { count: 5 });
    this.sfx('shatter', { x: e.x, z: e.z, k: e.k });
    this.shake(0.04);
  }
  ev_prop_hit(e) { const r = this.props.get(e.id); if (r) { r.obj.rotation.z = 0.12; this.sfx('hit_wood', { x: r.p.x, z: r.p.z }); } }

  ev_grave(e) {
    if (!this.w.heroes.some((h) => h.cls === 'sexton')) return;
    const o = buildModel('bones', { catalog: MODELS }).object;
    o.position.set(e.x, 0, e.z);
    o.scale.setScalar(0.8);
    this.fxGroup().add(o);
    const r = new Mesh(GROUND_GEO.thin, glowOf('lime'));
    r.scale.setScalar(0.6); r.position.set(e.x, 0.06, e.z);
    this.fxGroup().add(r);
    this.graves.set(e.id, [o, r]);
  }
  ev_gravex(e) { const g = this.graves.get(e.id); if (g) { for (const o of g) this.fxGroup().remove(o); this.graves.delete(e.id); } }

  ev_obst(e) {
    const g = new Group();
    this.fxGroup().add(g);
    if (e.k === 'coffin') {
      const o = buildModel('pallbearer_coffin', { catalog: MODELS }).object;
      o.position.set(e.x, 0, e.z);
      g.add(o);
    } else if (e.cells) {
      for (const [c, r] of e.cells) {
        if (e.k === 'pit') {
          const m = new Mesh(GROUND_GEO.quad, glowOf(this.zoneView?.biome?.pit === 3 ? 'night' : 'ink'));
          m.position.set(c + 0.5, 0.04, r + 0.5);
          g.add(m);
        } else {
          const id = e.k === 'coffin_wall' ? 'pallbearer_coffin' : 'bones';
          const o = buildModel(id, { catalog: MODELS }).object;
          o.position.set(c + 0.5, 0, r + 0.5);
          if (id === 'bones') o.scale.set(1.1, 2.6, 1.1);
          else o.rotation.y = (c + r) % 2 ? 0 : Math.PI / 2;
          g.add(o);
        }
      }
    }
    this.obstacles.set(e.id, g);
    this.sfx(e.k === 'bone_wall' ? 'bone_hit' : 'coffin_slam', e);
  }
  ev_obstx(e) {
    const g = this.obstacles.get(e.id);
    if (g) { this.fxGroup().remove(g); this.obstacles.delete(e.id); this.dustAt(e.x, e.z); }
  }
  ev_obst_clear() { for (const [id, g] of this.obstacles) { this.fxGroup().remove(g); this.obstacles.delete(id); } }

  ev_hide(e) { const a = this.actors.get(e.id); if (a) a.setHidden(true); }
  ev_unhide(e) { const a = this.actors.get(e.id); if (a) { a.setHidden(false); a.root.position.set(e.x, 0, e.z); } }
  ev_boss_phase(e) { this.ctx.engine.screen.flash('white', { duration: 0.25 }); this.shake(0.5); }
  ev_dark(e) {
    this.dark = !!e.on;
    applyBiomeLight(this.ctx.engine, this.ctx.scene, this.w.zone.biome, this.dark);
    this.game.audioSys?.setDrums(false);
  }
  ev_toll(e) { this.ctx.engine.screen.flash('white', { duration: 0.3 }); this.bellSwing = 1; }
  ev_toll_warn(e) { this.sfx('telegraph_big', {}); this.bellSwing = 0.3; }
  ev_ring_bell(e) { this.ctx.engine.screen.flash('white', { duration: 0.4 }); this.bellSwing = 1.4; this.ctx.engine.screen.shockwave([e.x, 0.5, e.z], { radius: 0.6 }); }
  ev_pillar(e) { this.ctx.particles.burst('bone_chips', [e.x, 1.5, e.z], { count: 20 }); this.sfx('stone_hit', e); if (e.hp <= 0) this.breakPillar(e.x, e.z); }
  breakPillar(x, z) {
    this.fx.shatter(x, 0.1, z, PALETTE.slate, x + 0.1, z + 0.1, this.fxRng, { count: 18, size: 0.34, height: 2.4, speed: 6, life: 2.4 });
    this.shake(0.4);
  }
  ev_knell_tolls() { this.ctx.engine.screen.flash('white', { duration: 0.5 }); this.shake(0.9); this.sfx('bell_true', {}); }
  ev_warden(e) { this.ctx.engine.screen.shockwave([e.x, 0.5, e.z], { radius: 0.5 }); }
  ev_boss_dead(e) {
    this.ctx.engine.screen.flash('white', { duration: 0.4 });
    this.shake(0.9);
    this.ctx.engine.screen.shockwave([e.x, 0.5, e.z], { radius: 0.7 });
    this.ctx.particles.burst('level_up', [e.x, 1.5, e.z]);
    this.sfx('boss_death', e);
    if (this.dark) { this.dark = false; applyBiomeLight(this.ctx.engine, this.ctx.scene, this.w.zone.biome, false); }
    if (!this.game.isSession) { this.ctx.engine.timeScale = Math.min(this.ctx.engine.timeScale, 0.3); this.slowT = 1; }
  }
  ev_miss(e) { this.addNumber(e.x, 1.8, e.z, 'MISS', 'mist', 1, 0.6); }
  ev_cantcast(e) { if (e.why === 'res') this.game.audioSys?.bark(e.seat); this.game.hudSys?.flashSlot(e.seat, e.slot); }
  ev_coffin(e) { this.sfx(e.state === 'start' ? 'bell_cracked' : 'bell_mid', e); }

  fxGroup() { return this.zoneView?.root ?? this.ctx.scene; }

  addNumber(x, y, z, text, color, scale = 1, life = 0.7) {
    if (this.numbers.length > 40) this.numbers.shift();
    this.numbers.push({ x: x + this.fxRng.range(-0.3, 0.3), y, z: z + this.fxRng.range(-0.3, 0.3), text, color, scale, t: 0, life, dy: this.fxRng.range(0, 0.4) });
  }

  // ---- Frame ---------------------------------------------------------------------------------
  update(dt, realDt) {
    this.elapsed += realDt ?? dt;
    const w = this.w;
    if (this.slowT > 0) { this.slowT -= realDt ?? dt; if (this.slowT <= 0 && !this.game.paused) this.ctx.engine.timeScale = 1; }
    this.fx.update(dt);
    this.decals.update(dt);
    this.updateCorpses(dt);
    this.updateMoving(dt);
    if (!w) return;
    for (const h of w.heroes) {
      if (h.gone) continue;
      const a = this.actors.get(h.id);
      if (!a) continue;
      const speed = h.moving ? (h.stats?.moveSpeed ?? 5) : 0;
      let facing = h.facing;
      a.sync(h.x, h.z, facing, h.moving && h.state !== 'dodge', speed, dt);
      if (a.leapT > 0) { a.leapT -= dt; a.root.position.y = Math.sin(Math.PI * (1 - Math.max(0, a.leapT) / a.leapDur)) * 2.5; }
      if (a.downed) a.root.position.y = 0;
      const couch = this.game.humanCount?.() > 1;
      a.seatRing.visible = couch && !h.companion;
      if (a.seat !== h.seat) { a.seat = h.seat; }
    }
    this.syncList(w.monsters, dt);
    this.syncList(w.allies, dt);
    for (const r of this.objects.values()) {
      if (r.actor && !r.o.hidden) r.actor.sync(r.o.x, r.o.z, r.actor.root.rotation.y, false, 0, dt);
      if (r.head) r.head.rotation.y = Math.sin(this.elapsed * 1.4) * 0.3;
      if (r.ring) r.ring.rotation.y += dt;
      if (r.o.kind === 'portal' && r.model) r.model.rotation.y += dt * 1.5;
      if (r.o.kind === 'coffin' && r.o.state === 1 && r.model) r.model.rotation.z = Math.sin(this.elapsed * 40) * 0.05;
      if (r.o.kind === 'rope' && r.model) r.model.rotation.z = Math.sin(this.elapsed * 1.6 + r.o.id) * 0.03;
    }
    for (const r of this.props.values()) if (r.obj.rotation.z > 0) r.obj.rotation.z = Math.max(0, r.obj.rotation.z - dt);
    this.updateFade(dt);
    this.footsteps(dt);
    if (this.bell) {
      if (this.bellSwing > 0) this.bellSwing = Math.max(0, this.bellSwing - dt * 0.35);
      this.bell.rotation.z = Math.sin(this.elapsed * 2.6) * 0.16 * this.bellSwing;
    }
    if (this.zoneView) {
      this.zoneView.update(dt, this.elapsed, this.cam);
    }
    this.updateCamera(dt);
  }

  /** Tall things between the camera and a hero go see-through, one body at a time. */
  updateFade() {
    this.fadeTick = (this.fadeTick ?? 0) + 1;
    if (this.fadeTick % 6) return;
    const heroes = this.w.heroes.filter((h) => !h.gone && !h.companion);
    for (const r of this.objects.values()) {
      if (!TALL_KINDS.has(r.o.kind) || !r.model || r.o.hidden) continue;
      // The camera sits toward +X +Z: a prop hides what stands just behind it, on the -X -Z side.
      const hide = heroes.some((h) => { const dx = r.o.x - h.x, dz = r.o.z - h.z; const along = (dx + dz) * 0.71, across = Math.abs(dx - dz) * 0.71; return along > 0 && along < 4 && across < 2; });
      if (hide === !!r.faded) continue;
      r.faded = hide;
      if (hide && !r.fadeMats) {
        r.fadeMats = [];
        r.model.traverse((m) => {
          if (!m.isMesh) return;
          const c = m.material?.color;
          if (!c || m.material.isMeshBasicNodeMaterial) { m.userData.isGlow = true; return; }
          const clone = toonMaterial(c.getHex(), { dissolve: true }).clone();
          clone.dissolve = 0;
          m.userData.orig = m.material;
          m.userData.faded = clone;
          r.fadeMats.push(clone);
        });
      }
      r.model.traverse((m) => {
        if (!m.isMesh) return;
        if (m.userData.isGlow) { m.visible = !hide; return; }
        if (m.userData.faded) { m.material = hide ? m.userData.faded : m.userData.orig; if (hide) m.material.dissolve = 0.6; }
      });
    }
  }

  footsteps(dt) {
    const h = this.game.localHero?.();
    if (!h || !h.moving || h.dead) return;
    this.stepT = (this.stepT ?? 0) - dt;
    if (this.stepT > 0) return;
    this.stepT = 0.3;
    const b = this.w.zone?.biome;
    const name = b === 'yard' || b === 'causeway' || b === 'pantry' ? 'step_mud' : b === 'town' ? 'step_wood' : 'step_stone';
    this.sfx(name, { x: h.x, z: h.z });
  }

  syncList(list, dt) {
    for (const m of list) {
      if (m.dead) continue;
      const a = this.actors.get(m.id);
      if (!a) continue;
      let speed = 0;
      if (m.moving) speed = m.def?.speed ?? 2;
      a.sync(m.x, m.z, m.facing, !!m.moving, speed, dt);
      if (m.state === 'statue') a.statue = true;
    }
  }

  updateCorpses(dt) {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += dt;
      if (c.doll) { if (c.doll.active) c.doll.sync(); }
      if (!c.world && c.a.mixer) c.a.mixer.update(dt);
      if (!c.world) { c.a.squash.update(dt); const [sh, sv] = c.a.squash.scale(); c.a.body.scale.set(sh, sv, sh); }
      if (c.t >= c.life - 0.5 && !c.dissolving) {
        c.dissolving = true;
        if (c.doll) { c.doll.disable(); c.doll = null; }
        c.a.startDissolve();
      }
      if (c.dissolving) c.a.setDissolve(Math.min(1, (c.t - (c.life - 0.5)) / 0.5));
      if (c.t >= c.life) {
        if (c.doll) c.doll.disable();
        if (c.world) this.actorRoot.remove(c.body);
        c.a.remove();
        this.corpses.splice(i, 1);
      }
    }
  }

  updateMoving(dt) {
    for (const [id, s] of this.shots) {
      s.x += s.vx * dt; s.z += s.vz * dt;
      s.life -= dt;
      s.m.position.set(s.x, s.team === 1 ? 1.1 : 1.05, s.z);
      s.m.rotation.y += dt * 8;
      if (dt > 0) s.trail.push(s.m.position, this.elapsed);
      s.trail.update(this.elapsed, this.ctx.camera.camera);
      s.light?.position.set(s.x, 1.1, s.z);
      if (s.life < -0.3) this.removeShot(id, s);
    }
    for (let i = this.lobs.length - 1; i >= 0; i--) {
      const l = this.lobs[i];
      l.t += dt;
      const f = Math.min(1, l.t / l.dur);
      const x = l.x0 + (l.x1 - l.x0) * f, z = l.z0 + (l.z1 - l.z0) * f;
      const y = l.sky ? (1 - f) * 14 : Math.sin(f * Math.PI) * 2.6 + 0.8 * (1 - f);
      l.obj.position.set(x, y, z);
      l.obj.rotation.x += dt * 9;
      if (l.trail) { if (dt > 0) l.trail.push(l.obj.position, this.elapsed); l.trail.update(this.elapsed, this.ctx.camera.camera); }
      if (f >= 1) {
        this.fxGroup().remove(l.obj);
        if (l.trail) { this.fxGroup().remove(l.trail); l.trail.dispose(); }
        l.light?.release();
        this.lobs.splice(i, 1);
      }
    }
    for (let i = this.falls.length - 1; i >= 0; i--) {
      const q = this.falls[i];
      q.t += dt;
      if (q.t < 0) continue;
      const f = Math.min(1, q.t / 0.22);
      q.o.position.y = (1 - f) ** 2 * 8;
      if (q.t > 1.2) { q.o.position.y = -(q.t - 1.2) * 2; }
      if (q.t > 1.8) { this.fxGroup().remove(q.o); this.falls.splice(i, 1); }
    }
    for (const a of this.areas.values()) {
      a.t += dt;
      if (a.part && a.t > 0.22) {
        a.t = 0;
        const r = this.fxRng;
        const an = r.range(0, 6.28), d = r.range(0, a.r);
        this.ctx.particles.burst(a.part, [a.g.position.x + Math.cos(an) * d, 0.2, a.g.position.z + Math.sin(an) * d], { count: 2 });
      }
    }
    for (const t of this.teles.values()) {
      t.t += dt;
      const f = Math.min(1, t.t / t.e.life);
      if (t.e.sh === 'ring') t.inner.scale.setScalar(Math.max(0.05, f * t.e.r));
      else { t.inner.scale.z = Math.max(0.01, f * t.e.len); t.inner.position.z = (f * t.e.len) / 2; }
      if (t.e.follow) { const a = this.actors.get(t.e.follow); if (a) { t.g.position.x = a.root.position.x; t.g.position.z = a.root.position.z; } }
    }
    for (const q of this.waves.values()) {
      q.t += dt;
      q.ring.set(q.x, q.z, q.sp * q.t, 0.6);
    }
    for (const r of this.drops.values()) {
      r.t += dt;
      const o = r.o;
      const d = this.w?.drops?.find?.((x) => x.id === r.id);
      if (d) { r.g.position.x = d.x; r.g.position.z = d.z; }
      if (r.t < 0.35) { const f = r.t / 0.35; r.g.position.y = Math.sin(f * Math.PI) * 1.1; }
      else r.g.position.y = 0;
      if (r.spin) r.spin.rotation.y += dt * 2.2;
      r.tick = (r.tick ?? 0) + dt;
      if (r.beam && r.tick > 0.35) { r.tick = 0; this.ctx.particles.burst('loot_glint', [r.g.position.x, 0.3, r.g.position.z], { colors: [r.color, 'white'] }); }
    }
  }

  updateCamera(dt) {
    const w = this.w;
    const ov = this.camOverride;
    if (ov) { this.cam.set(ov.x, ov.y ?? 1, ov.z); }
    else if (w) {
      let x = 0, z = 0, n = 0;
      for (const h of w.heroes) {
        if (h.gone || h.companion) continue;
        const local = this.game.isCameraSeat?.(h.seat) ?? true;
        if (!local) continue;
        x += h.x; z += h.z; n++;
      }
      if (n) {
        this.cam.set(x / n, 1, z / n);
        // A big boss nearby pulls the frame toward it, so you can see what is coming.
        const b = w.boss;
        if (b && !b.dead && !b.hidden && b.def?.huge) {
          const d = Math.hypot(b.x - this.cam.x, b.z - this.cam.z);
          if (d < 26) { this.cam.x += (b.x - this.cam.x) * 0.3; this.cam.z += (b.z - this.cam.z) * 0.3; this.cam.y = 3.2; this.bossZoom = 0.82; } else this.bossZoom = 1;
        } else this.bossZoom = 1;
      }
    }
    // Couch: zoom out to hold every seat in frame.
    let zoom = (this.game.settings?.zoom ?? 1) * (11.5 / (w?.tuning?.viewHeight ?? 11.5));
    if (ov?.zoom) zoom = ov.zoom;
    else if (w) {
      zoom *= this.bossZoom ?? 1;
      let spread = 0;
      const seats = w.heroes.filter((h) => !h.gone && !h.companion && (this.game.isCameraSeat?.(h.seat) ?? true));
      for (const h of seats) spread = Math.max(spread, Math.hypot(h.x - this.cam.x, h.z - this.cam.z));
      if (seats.length > 1) zoom = Math.min(zoom, Math.max(0.62, 1 - Math.max(0, spread - 4) * 0.05));
    }
    this.zoomGoal += (zoom - this.zoomGoal) * Math.min(1, dt * 3);
    this.ctx.camera.setZoom(this.zoomGoal);
  }

  project(x, y, z) {
    const hud = this.ctx.hud;
    tmpV.set(x, y, z).project(this.ctx.camera.camera);
    return [((tmpV.x + 1) / 2) * hud.width, ((1 - tmpV.y) / 2) * hud.height];
  }

  /** Turn a screen point (NDC) into the ground point it looks at. */
  groundAt(nx, ny) {
    const origin = this.groundO ?? (this.groundO = new Vector3());
    const dir = this.groundD ?? (this.groundD = new Vector3());
    this.ctx.camera.rayAt(nx, ny, origin, dir);
    if (Math.abs(dir.y) < 1e-4) return null;
    const t = -origin.y / dir.y;
    return [origin.x + dir.x * t, origin.z + dir.z * t];
  }

  clearTransient() {
    for (const s of this.shots.values()) { s.trail.dispose(); s.light?.release(); }
    this.shots.clear();
    for (const l of this.lobs) { l.trail?.dispose(); l.light?.release(); }
    this.lobs.length = 0;
    this.falls.length = 0;
    for (const a of this.areas.values()) a.g.userData.light?.release();
    this.areas.clear();
    for (const t of this.teles.values()) void t;
    this.teles.clear();
    for (const q of this.waves.values()) q.ring.dispose();
    this.waves.clear();
    this.obstacles.clear();
    this.graves.clear();
    this.props.clear();
    for (const r of this.objects.values()) { if (r.actor) r.actor.remove(); }
    this.objects.clear();
    for (const r of this.drops.values()) r.light?.release();
    this.drops.clear();
    this.numbers.length = 0;
    this.bell = null;
    this.fx.clear();
    this.decals.clear();
    for (const c of this.corpses) { if (c.doll) c.doll.disable(); if (c.world) this.actorRoot.remove(c.body); c.a.remove(); }
    this.corpses.length = 0;
    for (const [id, a] of this.actors) {
      const isHero = this.w?.heroes?.some((h) => h.id === id);
      const isAlly = this.w?.allies?.some((m) => m.id === id);
      if (!isHero && !isAlly) { if (a.eliteLight) a.eliteLight.release(); a.remove(); this.actors.delete(id); }
    }
  }

  clearActors() {
    for (const a of this.actors.values()) { if (a.eliteLight) a.eliteLight.release(); a.remove(); }
    this.actors.clear();
    if (this.zoneView) { this.clearTransient(); this.zoneView.dispose(); this.zoneView = null; }
  }
}

export const fmtNum = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n > 9999 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

const TALL_KINDS = new Set(['lychgate', 'gibbet', 'gate', 'wagon', 'font', 'board']);
const PROP_COLORS = { urn: 'orange', barrel: 'plum', crate: 'orange', clay: 'orange', keg: 'plum', coffin: 'plum', tombstone: 'slate', basket: 'sand', bones: 'mist', amphora: 'orange' };
const AREA_LOOK = {
  default: { ring: 'white' },
  shock: { ring: 'sand', part: 'shock' },
  fire: { disc: 'red', ring: 'orange', part: 'ember', light: 0xff7020, sfx: 'fire_start' },
  blue_fire: { disc: 'blue', ring: 'cyan', part: 'crackle', light: 0x60a0ff, sfx: 'fire_start' },
  hallowed: { ring: 'sand', part: 'shrine_glow', light: 0xffe0a0 },
  beacon: { ring: 'orange', pillar: 'orange', part: 'ember', light: 0xff9040 },
  curse: { ring: 'lime', disc: 'plum', part: 'grave_smoke', light: 0x90f060 },
  dawn: {},
  fire_patch: { disc: 'red', ring: 'orange', part: 'ember', light: 0xff7020 },
  poison_pool: { disc: 'teal', ring: 'lime', part: 'poison', light: 0x90f060 },
};

export { fixDecor, disposeObject, glowMaterial, Trail };
