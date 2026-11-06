// Actors: 3D bodies for heroes, monsters and NPCs, driven by the sim's state and events.
import { SpringChain, LegStepper, twoBoneIK, THREE, buildModel, compileClips, HERO_RIG, HERO_RAGDOLL, Ragdoll, ContactShadow, setLookLayer, glowMaterial, PALETTE, Squash, disposeObject } from '../../pixel-engine.js';
import { CATALOG, HUMANOIDS } from './models/bodies.js';
import { ALL_CLIPS } from './clips.js';
import { MONSTERS } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { SEAT_PALETTE } from '../data/meta.js';

const { AnimationMixer, AnimationClip, LoopOnce, LoopRepeat, Group, Mesh } = THREE;
const UPPER = new Set(['Torso', 'Head', 'ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL']);
const WHITE = () => glowMaterial(PALETTE.white);
const toRad = (v) => v;

export class Actors {
  constructor(ctx, view) {
    this.ctx = ctx; this.view = view; this.map = new Map(); this.clips = null; this.upper = new Map(); this.ragdolls = []; this.dying = []; this.root = new Group(); ctx.scene.add(this.root);
    this.seatRings = new Map(); this.timeScale = 1;
  }
  compile(obj) {
    if (!this.clips) { this.clips = compileClips(ALL_CLIPS, HERO_RIG, obj); this.clipMap = new Map(this.clips.map((c) => [c.name, c])); }
  }
  upperClip(name) {
    if (this.upper.has(name)) return this.upper.get(name);
    const c = this.clipMap.get(name); if (!c) return null;
    const u = new AnimationClip(name + '_U', c.duration, c.tracks.filter((t) => UPPER.has(t.name.split('.')[0])));
    this.upper.set(name, u); return u;
  }
  make(modelId, o = {}) {
    const humanoid = HUMANOIDS.has(modelId);
    const b = buildModel(modelId, { catalog: CATALOG, palette: o.palette });
    const obj = b.object;
    const root = new Group(); root.add(obj);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    setLookLayer(root, 'actors');
    const a = { id: o.id, kind: o.kind, modelId, humanoid, root, obj, build: b, scale: o.scale || 1, mixer: null, actions: new Map(), loco: null, once: null, flashT: 0, mats: null, shadow: new ContactShadow(0.45 * (o.scale || 1)), dead: false, hover: !!o.hover, squash: new Squash(), t: Math.random() * 6, walkSpeed: 0, last: null, vel: 0, weapon: null };
    root.scale.setScalar(a.scale);
    if (humanoid) { this.compile(obj); a.mixer = new AnimationMixer(obj); }
    this.root.add(root); this.root.add(a.shadow);
    a.meshes = []; obj.traverse((m) => { if (m.isMesh) a.meshes.push({ m, mat: m.material }); });
    return a;
  }
  action(a, name, upper = false) {
    const key = name + (upper ? '_U' : '');
    let act = a.actions.get(key);
    if (!act) { const clip = upper ? this.upperClip(name) : this.clipMap.get(name); if (!clip) return null; act = a.mixer.clipAction(clip); a.actions.set(key, act); }
    return act;
  }
  loco(a, name, ts = 1) {
    if (!a.mixer) return;
    if (a.loco && a.loco.name === name) { a.loco.act.timeScale = ts; return; }
    const act = this.action(a, name); if (!act) return;
    act.setLoop(LoopRepeat, Infinity); act.reset().fadeIn(0.15).play(); act.timeScale = ts;
    if (a.loco) a.loco.act.fadeOut(0.15);
    a.loco = { name, act };
  }
  once(a, name, { ts = 1, upper = false, weight = 1 } = {}) {
    if (!a.mixer) return 0;
    const act = this.action(a, name, upper); if (!act) return 0;
    act.setLoop(LoopOnce, 1); act.clampWhenFinished = false; act.reset(); act.setEffectiveWeight(weight); act.timeScale = ts; act.fadeIn(0.04).play();
    if (a.once && a.once.act !== act) a.once.act.fadeOut(0.08);
    a.once = { act, name, until: this.ctx.time + act.getClip().duration / ts, upper };
    return act.getClip().duration / ts;
  }
  flash(a, frames = 2) { a.flashT = frames; }
  setFlash(a, on) {
    if (on === a.flashing) return; a.flashing = on;
    for (const e of a.meshes) e.m.material = on ? WHITE() : e.mat;
  }
  dress(a, hero) {
    // weapons and helm tier
    if (!a.humanoid) return;
    const key = (hero.gear.main ? hero.gear.main.base : '') + '|' + (hero.gear.off ? hero.gear.off.base : '') + '|' + ['head', 'shoulders'].map((s) => (hero.gear[s] ? hero.gear[s].rarity + (hero.gear[s].tier || 0) : '-')).join('');
    if (a.dressKey === key) return; a.dressKey = key;
    for (const n of ['HandR', 'HandL', 'Head', 'ArmR', 'ArmL']) { const j = a.obj.getObjectByName(n); if (!j) continue; for (const c of [...j.children]) if (c.userData.gear) { j.remove(c); disposeObject(c); } }
    const attach = (jointName, id, pos, rot, scale = 1) => {
      try { const wb = buildModel(id, { catalog: CATALOG }); wb.object.userData.gear = true; wb.object.position.set(...pos); wb.object.rotation.set(...rot); wb.object.scale.setScalar(scale); wb.object.traverse((m) => { if (m.isMesh) m.castShadow = true; }); a.obj.getObjectByName(jointName).add(wb.object); } catch (e) { /* missing model */ }
    };
    const main = hero.gear.main && hero.gear.main.base, off = hero.gear.off && hero.gear.off.base;
    if (main) {
      const map = { mace: 'mace', warhammer: 'warhammer', flail: 'flail', staff: 'staff', crossbow: 'crossbow', wand: 'wand', shovel: 'shovel', scythe: 'scythe', sceptre: 'sceptre' };
      attach('HandR', map[main] || 'mace', [0, -0.08, 0.05], [Math.PI / 2, 0, 0], main === 'mace' ? 1.3 : 1);
    }
    if (off === 'kite-shield' || off === 'round-shield') attach('HandL', off, [0.08, -0.05, 0.05], [0, -Math.PI / 2, 0], 0.8);
    else if (off) attach('HandL', 'standing-torch', [0, -0.1, 0.1], [0, 0, 0], 0.35);
    // shoulder pads by tier
    const sh = hero.gear.shoulders;
    if (sh && (sh.tier || 0) >= 1) for (const n of ['ArmR', 'ArmL']) attach(n, 'rubble', [0, 0.02, 0], [0, 0, 0], 0.3 + 0.1 * (sh.tier || 0));
  }

  // -------- per-frame --------
  syncWorld(w, dt, game) {
    const seen = new Set();
    for (const h of w.heroes) {
      if (h.gone) continue;
      seen.add('h' + h.id);
      let a = this.map.get('h' + h.id);
      if (!a) { a = this.make(h.cls, { id: h.id, kind: 'hero' }); a.hero = true; this.map.set('h' + h.id, a); this.ringFor(h, a); a.light = this.ctx.lights.request({ follow: a.root, offset: [0, 1.7, 0], color: 0xffe0b0, intensity: 7, radius: 8, priority: 4 }); }
      this.dress(a, h);
      this.poseHero(a, h, w, dt);
    }
    for (const m of w.monsters) {
      if (m.dead) continue;
      const key = 'm' + m.id; seen.add(key);
      if (m.prop) continue;
      let a = this.map.get(key);
      if (!a) { a = this.makeMonster(m); this.map.set(key, a); }
      this.poseMonster(a, m, w, dt);
    }
    for (const s of w.spots) {
      if (s.kind !== 'npc' && !s.model) continue;
      const key = 's' + s.id; seen.add(key);
      let a = this.map.get(key);
      if (!a) { a = this.make(s.model, { id: s.id, kind: 'npc', scale: s.scale || 1 }); a.npc = true; this.map.set(key, a); if (a.humanoid) this.loco(a, 'Idle'); }
      a.root.position.set(s.x, 0, s.z); a.root.rotation.y = s.face || 0; a.shadow.place(s.x, 0, s.z, 0);
      if (a.mixer) a.mixer.update(dt);
    }
    for (const [key, a] of this.map) if (!seen.has(key) && !a.dead) { this.removeActor(key, a); }
    // ragdolls and dying
    for (const r of this.ragdolls) { if (r.doll.active) r.doll.sync(); r.age += dt; }
    while (this.ragdolls.length > 16) { const r = this.ragdolls.shift(); this.fadeOut(r.a); try { r.doll.disable(); } catch {} }
    for (const d of this.dying) {
      d.t += dt; const k = Math.min(1, d.t / d.dur);
      if (d.squash) { const s = d.a.scale * (1 + 0.35 * Math.sin(k * Math.PI)); d.a.root.scale.set(s * (1 + k * 0.3), d.a.scale * (1 - k), s * (1 + k * 0.3)); }
      else if (d.shrink) { const s = d.a.scale * (1 - Math.max(0, (d.t - d.delay) / 0.8)); d.a.root.scale.setScalar(Math.max(0.001, s)); }
      if (d.a.mixer && !d.stopMixer) d.a.mixer.update(dt);
    }
    this.dying = this.dying.filter((d) => { const done = d.t > (d.delay || 0) + d.dur; if (done) { this.removeObj(d.a); } return !done; });
  }
  makeMonster(m) {
    const d = MONSTERS[m.type];
    const modelId = { peatwalker: 'peatwalker', gibbet_drop: 'gibbet-drop', rattlebones: 'rattlebones', choir_skull: 'choir-skull', pallid_bearer: 'pallid-bearer', tomb_crawler: 'tomb-crawler', bloat_deacon: 'bloat-deacon', cinderling: 'cinderling', tithe_collector: 'tithe-collector', penitent: 'penitent', clapperjaw: 'clapperjaw', ash_gargoyle: 'ash-gargoyle', shade_acolyte: 'shade-acolyte', collection_plate: 'collection-plate', crawler_nest: 'crawler-nest', unrung_font: 'unrung-font', skeleton: 'skeleton-minion', brute: 'pallid-bearer', bursar: 'bursar', ambrose: 'ambrose', malison: 'malison' }[m.type] || 'peatwalker';
    const palette = m.elite || m.rare ? { skin: m.rare ? 'sand' : 'sky' } : undefined;
    const a = this.make(modelId, { id: m.id, kind: 'monster', scale: m.scale || 1, hover: d && d.hover, palette: undefined });
    a.type = m.type; a.rig = HUMANOIDS.has(modelId); a.baseScale = m.scale || 1;
    if (a.humanoid) this.loco(a, m.type === 'peatwalker' || m.type === 'bloat_deacon' ? 'Shamble' : 'Idle');
    if (m.elite || m.rare) a.ring = this.makeRing(m.rare ? 'sand' : 'sky', 1.1 * (m.scale || 1));
    return a;
  }
  makeRing(color, r) {
    const g = new Mesh(new THREE.TorusGeometry(r, 0.05, 6, 20).rotateX(Math.PI / 2), glowMaterial(PALETTE[color]));
    g.position.y = 0.06; this.root.add(g); return g;
  }
  ringFor(h, a) {
    a.ring = this.makeRing(SEAT_PALETTE[h.seat % 4], 0.7);
  }
  poseHero(a, h, w, dt) {
    const x = h.x, z = h.z, y = h.air || 0;
    a.root.position.set(x, y, z);
    if (!h.alive) { if (!a.down) { a.down = true; this.onHeroDown(a, h); } return; }
    if (a.down) { a.down = false; this.releaseDoll(a); }
    let rot = h.facing; a.root.rotation.y = rot;
    a.shadow.place(x, 0, z, y);
    if (a.ring) a.ring.position.set(x, 0.06, z);
    this.animate(a, h.moving ? (h.dodgeT > 0 ? 'Roll' : 'Run') : 'Idle', dt, h);
    if (a.flashT > 0) { a.flashT--; this.setFlash(a, true); } else this.setFlash(a, false);
  }
  animate(a, desired, dt, ent) {
    if (!a.mixer) return;
    const once = a.once && this.ctx.time < a.once.until;
    if (desired === 'Roll') { if (!a.rolling) { a.rolling = true; this.once(a, 'Roll', { ts: 1 }); } }
    else a.rolling = false;
    if (!once || a.once.upper) this.loco(a, desired === 'Roll' ? 'Idle' : desired, desired === 'Run' ? (ent.speed ? 1 : 1) : 1);
    a.mixer.update(dt);
  }
  poseMonster(a, m, w, dt) {
    const hov = a.hover ? 0.6 + Math.sin(this.ctx.time * 3 + m.id) * 0.15 : 0;
    a.root.position.set(m.x, hov + (m.air || 0), m.z); a.root.rotation.y = m.facing;
    a.shadow.place(m.x, 0, m.z, hov);
    if (a.ring) a.ring.position.set(m.x, 0.06, m.z);
    if (m.flash > 0) this.setFlash(a, true); else this.setFlash(a, false);
    if (a.humanoid) {
      const once = a.once && this.ctx.time < a.once.until;
      if (!once) this.loco(a, a.type === 'peatwalker' || a.type === 'bloat_deacon' ? (m.moving ? 'Shamble' : 'Idle') : m.moving ? (m.speed > 3 ? 'Run' : 'Walk') : 'Idle', 1);
      if (m.stunT > 0 && !once) this.once(a, 'HitReact', { ts: 0.5 });
      a.mixer.update(dt);
    } else {
      // non-humanoid: wobble and lean; jointed legs and boss arms swing
      a.t += dt; this.swingLimbs(a, m, dt); const mv = m.moving ? 1 : 0;
      a.obj.rotation.z = Math.sin(a.t * 8) * 0.06 * mv; a.obj.position.y = Math.abs(Math.sin(a.t * 7)) * 0.08 * mv;
      if (m.state === 'wind' && m.type === 'bloat_deacon') { const k = 1 + 0.4 * (1 - Math.max(0, m.t)); a.root.scale.set(a.baseScale * k, a.baseScale * k, a.baseScale * k); }
    }
  }
  // legs: every foot is planted on the floor by the engine's LegStepper and the leg is aimed at it, so a walker's feet stay put and step
  placeLegFeet(a, m, dt, legs) {
    const s = a.baseScale || 1, p = a.root.position, yaw = a.root.rotation.y, c = Math.cos(yaw), sn = Math.sin(yaw);
    const bar = (o) => a.type === 'tomb_crawler';
    if (!a.stepper) {
      const rows = legs.map((o) => o.position.z); let gap = 9; for (const z of rows) for (const y of rows) if (Math.abs(z - y) > 1e-4) gap = Math.min(gap, Math.abs(z - y));
      const defs = legs.map((o) => ({ rest: [(o.position.x + (bar(o) ? Math.sign(o.position.x) * 0.38 : 0)) * s, o.position.z * s], partners: [] }));
      legs.forEach((o, i) => legs.forEach((q, j) => { if (j <= i) return; const dz = Math.abs(o.position.z - q.position.z), same = Math.sign(o.position.x) === Math.sign(q.position.x); if ((same && dz < gap * 1.05) || (!same && dz < 1e-4)) defs[i].partners.push(j); }));
      a.stepper = new LegStepper({ legs: defs, threshold: 0.22 * s, stepTime: 0.16, lift: 0.12 * s, lead: 0.2 });
      a.lastP = [p.x, p.z]; a.stepper.reset([p.x, p.y, p.z], yaw, () => p.y);
    }
    const vx = (p.x - a.lastP[0]) / Math.max(dt, 1e-3), vz = (p.z - a.lastP[1]) / Math.max(dt, 1e-3); a.lastP = [p.x, p.z];
    const ground = p.y;
    a.stepper.update(dt, [p.x, p.y, p.z], yaw, [vx, 0, vz], () => ground);
    const bob = a.obj.position.y;
    const down = new THREE.Vector3(0, -1, 0), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), d = new THREE.Vector3();
    legs.forEach((o, i) => {
      const shin = o.children.find((q) => q.name.startsWith('Shin')); if (!shin) return;
      const hip = [o.position.x, o.position.y + bob, o.position.z], A = -shin.position.y, B = A * 1.0;
      const f = a.stepper.feet[i].at, dx0 = f[0] - p.x, dz0 = f[2] - p.z;
      const foot = [(dx0 * c - dz0 * sn) / s, (f[1] - ground) / s, (dx0 * sn + dz0 * c) / s];
      const sideX = Math.sign(o.position.x) || 1, spider = bar(o);
      const pole = spider ? [hip[0] + sideX * 1.5, hip[1] + 1.2, hip[2]] : [hip[0], hip[1] - 0.1, hip[2] + 2]; // spider knees rise outward; a quadruped's bend forward
      const knee = twoBoneIK(hip, foot, A, B, pole);
      d.set(knee[0] - hip[0], knee[1] - hip[1], knee[2] - hip[2]).normalize(); q1.setFromUnitVectors(down, d); o.quaternion.copy(q1);
      d.set(foot[0] - knee[0], foot[1] - knee[1], foot[2] - knee[2]).normalize(); q2.setFromUnitVectors(down, d); shin.quaternion.copy(q1).invert().multiply(q2);
    });
  }
  // Malison's rope arms: a spring chain hangs from each shoulder and lags her drift; the engine's two-bone solver bends elbow and wrist onto it
  rigArms(a, m, dt) {
    const s = a.baseScale || 1, A = 1.4 * s, B = 1.6 * s;
    const arms = a.limbs.filter((o) => o.name.startsWith('Arm'));
    a.chains = a.chains || arms.map(() => new SpringChain({ segments: 2, length: (A + B) / 2, rest: [0, -1, 0], stiffness: 3, keep: 0.96, gravity: 8 }));
    const yaw = a.root.rotation.y, c = Math.cos(yaw), sn = Math.sin(yaw), basis = [[c, 0, -sn], [0, 1, 0], [sn, 0, c]];
    a.root.updateMatrixWorld(true);
    const wp = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), qp = new THREE.Quaternion(), qw = new THREE.Quaternion(), qf = new THREE.Quaternion(), d = new THREE.Vector3();
    arms.forEach((o, i) => {
      const fore = o.children.find((q) => q.name.startsWith('Fore')); if (!fore) return;
      o.getWorldPosition(wp); const ch = a.chains[i]; if (!a.chainInit) ch.reset([wp.x, wp.y, wp.z], basis); ch.update(dt, [wp.x, wp.y, wp.z], basis);
      const tip0 = ch.points[2]; let tx = tip0[0] - wp.x, ty = tip0[1] - wp.y, tz = tip0[2] - wp.z;
      const sway = Math.sin(a.t * 1.6 + i) * 0.25 * s, flare = (m.state === 'wind' ? 0.9 : 0.25) * s * (i % 2 ? 1 : -1);
      tx += flare * c + sway * sn; tz += -flare * sn + sway * c;
      const l = Math.hypot(tx, ty, tz), k = Math.min(1, (A + B - 0.05) / l); const tgt = [wp.x + tx * k, wp.y + ty * k, wp.z + tz * k];
      const pole = [wp.x + sn * 4, wp.y - 0.5, wp.z + c * 4]; // elbows bend forward, toward the room
      const el = twoBoneIK([wp.x, wp.y, wp.z], tgt, A, B, pole);
      o.parent.getWorldQuaternion(qp);
      d.set(el[0] - wp.x, el[1] - wp.y, el[2] - wp.z).normalize(); qw.setFromUnitVectors(down, d); o.quaternion.copy(qp).invert().multiply(qw);
      d.set(tgt[0] - el[0], tgt[1] - el[1], tgt[2] - el[2]).normalize(); qf.setFromUnitVectors(down, d); fore.quaternion.copy(qw).invert().multiply(qf);
    });
    a.chainInit = true;
  }
  swingLimbs(a, m, dt) {
    if (!a.limbs) { a.limbs = []; a.obj.traverse((o) => { if (/^(Leg|Arm)\d/.test(o.name)) a.limbs.push(o); }); }
    const sp = m.moving ? 9 : 2, amp = m.moving ? 0.6 : 0.08;
    if (a.type === 'malison') this.rigArms(a, m, dt);
    const legs = a.limbs.filter((o) => o.name.startsWith('Leg')); if (legs.length) this.placeLegFeet(a, m, dt, legs);
    a.limbs.forEach((o, i) => { if (a.type === 'malison' || o.name.startsWith('Leg')) return; const ph = a.t * sp + i * 1.7; if (o.name.startsWith('Arm')) { o.rotation.z = (i % 2 ? -1 : 1) * (0.15 + 0.25 * Math.sin(a.t * 1.5 + i)) * (m.state === 'wind' ? 2.2 : 1); o.rotation.x = Math.sin(a.t * 2 + i) * 0.2; } else { o.rotation.x = Math.sin(ph) * amp; if (a.type === 'tomb_crawler') o.rotation.z = (o.name.endsWith('L') ? -0.44 : 0.44) + Math.cos(ph) * amp * 0.3; } });
  }
  // -------- events --------
  onEvent(e, w) {
    switch (e.t) {
      case 'castStart': {
        const a = this.map.get('h' + e.id); if (!a || !a.mixer) break;
        const dur = e.wind + e.rec; const clipDur = this.clipMap.get(e.clip) ? this.clipMap.get(e.clip).duration : 0.5;
        this.once(a, e.clip, { ts: Math.max(0.5, clipDur / Math.max(0.2, dur)), upper: !!e.upper });
        break;
      }
      case 'mattack': { const a = this.map.get('m' + e.id); if (a && a.mixer) { const nm = e.type === 'pallid_bearer' || e.type === 'brute' || e.big ? 'CoffinSlam' : e.type === 'gibbet_drop' || e.type === 'cinderling' ? 'Lunge' : e.type === 'peatwalker' ? 'Lurch' : 'Slash1'; this.once(a, nm, { ts: nm === 'Slash1' ? 1.2 : 1 }); } break; }
      case 'swell': { const a = this.map.get('m' + e.id); if (a) a.swelling = true; break; }
      case 'hurt': { const a = this.map.get('h' + e.id); if (a) { this.flash(a, 2); if (a.mixer && e.amt > 0) this.once(a, 'HitReact', { ts: 1.6, weight: 0.6 }); } break; }
      case 'hit': { const a = this.map.get('m' + e.id); if (a) this.flash(a, 2); break; }
      case 'kill': this.onKill(e, w); break;
      case 'propBreak': this.view.breakProp(e); break;
      default: break;
    }
  }
  onKill(e, w) {
    const key = 'm' + e.id; const a = this.map.get(key);
    if (!a) return;
    this.map.delete(key); a.dead = true;
    if (a.ring) { this.root.remove(a.ring); a.ring = null; }
    this.setFlash(a, false);
    const humanoidDeath = a.humanoid && !e.minion;
    if (a.humanoid) {
      try {
        const doll = new Ragdoll(this.ctx.physics, a.obj, HERO_RAGDOLL);
        a.mixer.stopAllAction();
        const sp = 4 + 7 * (e.over || 0) + (e.big ? 0 : 2);
        doll.enable({ velocity: [(e.dirx || 0) * sp, 3 + 3 * (e.over || 0), (e.dirz || 0) * sp], spin: [w ? 2 : 0, 1, 1] });
        a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, 0);
        this.ragdolls.push({ a, doll, age: 0 });
        this.dying.push({ a, t: 0, dur: 0.6, delay: 3.2, shrink: true, stopMixer: true });
        this.root.remove(a.shadow);
      } catch (err) { this.dying.push({ a, t: 0, dur: 0.5, squash: true }); }
    } else {
      this.dying.push({ a, t: 0, dur: 0.45, squash: true });
    }
    this.view.ctx.particles.burst(e.type === 'bloat_deacon' ? 'peat' : 'bone_chips', [e.x, 0.6, e.z], { count: 10 });
  }
  onHeroDown(a, h) {
    if (!a.humanoid) return;
    a.mixer.stopAllAction(); a.loco = null; a.once = null;
    try { const doll = new Ragdoll(this.ctx.physics, a.obj, HERO_RAGDOLL); doll.enable({ velocity: [0, 3, 0] }); a.doll = doll; a.root.position.set(0, 0, 0); } catch (e) { a.root.rotation.z = Math.PI / 2; }
    this.dollSync = this.dollSync || new Set(); this.dollSync.add(a);
  }
  releaseDoll(a) {
    if (a.doll) { try { a.doll.release({ ground: 0 }); } catch {} a.doll = null; }
    a.root.rotation.z = 0; if (this.dollSync) this.dollSync.delete(a);
    if (a.humanoid) { this.loco(a, 'Idle'); this.once(a, 'GetUp', { ts: 1 }); }
  }
  tickDolls() { if (this.dollSync) for (const a of this.dollSync) if (a.doll && a.doll.active) a.doll.sync(); }
  fadeOut(a) { this.dying.push({ a, t: 0, dur: 0.5, delay: 0, shrink: true, stopMixer: true }); }
  removeObj(a) { try { this.root.remove(a.root); this.root.remove(a.shadow); disposeObject(a.root); } catch {} }
  removeActor(key, a) { this.map.delete(key); if (a.light) { try { a.light.release(); } catch {} } if (a.ring) this.root.remove(a.ring); this.removeObj(a); }
  clear() {
    for (const [k, a] of this.map) { if (a.ring) this.root.remove(a.ring); if (a.light) { try { a.light.release(); } catch {} } this.removeObj(a); }
    this.map.clear(); for (const r of this.ragdolls) { try { r.doll.disable(); } catch {} this.removeObj(r.a); } this.ragdolls = [];
    for (const d of this.dying) this.removeObj(d.a); this.dying = []; if (this.dollSync) this.dollSync.clear();
  }
  dispose() { this.clear(); this.ctx.scene.remove(this.root); }
}
