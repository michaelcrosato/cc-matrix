// Turns sim events into effects: particles, rings, beams, damage numbers, light. Effects never affect the sim.
import { THREE, PALETTE, glowMaterial, toonMaterial, buildModel, disposeObject } from '../../pixel-engine.js';
import { CATALOG } from './models/bodies.js';
import { RARITIES } from '../data/items.js';

const { Mesh, Group, RingGeometry, CircleGeometry, BoxGeometry, SphereGeometry, Vector3 } = THREE;
const ELCOL = { sound: ['sand', 'white'], flame: ['orange', 'red', 'sand'], grave: ['lime', 'plum'], phys: ['white', 'mist'], burn: ['orange', 'red'], holy: ['sand', 'white'] };
const ringGeo = new RingGeometry(0.9, 1.0, 28).rotateX(-Math.PI / 2);
const discGeo = new CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const boxGeo = new BoxGeometry(1, 1, 1);
const ballGeo = new SphereGeometry(0.22, 8, 6);
const colorOf = (name) => { const m = /_(\w+)$/.exec(name); const k = m ? m[1] : 'phys'; return { sound: 'sand', flame: 'orange', grave: 'lime', phys: 'white', bronze: 'orange', shock: 'cyan', fire: 'orange', holy: 'sand', purple: 'plum', gold: 'sand', curse: 'plum' }[k] || 'white'; };

export function registerParticles(ctx) {
  const p = ctx.particles;
  p.register('ember', { count: [4, 7], life: [0.4, 0.9], speed: [1.5, 3.5], gravity: -1, size: [2, 1], colors: ['sand', 'orange', 'red'], spread: 180 });
  p.register('shock', { count: [6, 10], life: [0.25, 0.5], speed: [3, 6], gravity: 0, size: [2, 1], colors: ['white', 'sand', 'sky'], flatten: 0.4 });
  p.register('grave_smoke', { count: [5, 8], life: [0.5, 1.0], speed: [0.8, 2], gravity: -0.8, size: [3, 1], colors: ['lime', 'green', 'plum'], flatten: 0.6 });
  p.register('coin_spray', { count: [5, 8], life: [0.4, 0.8], speed: [2, 4], gravity: 9, size: [2, 2], colors: ['sand', 'white', 'sand'] });
  p.register('bone_chips', { count: [6, 10], life: [0.4, 0.8], speed: [2, 5], gravity: 10, size: [2, 1], colors: ['white', 'mist'] });
  p.register('wax', { count: [3, 5], life: [0.4, 0.7], speed: [1, 2.5], gravity: 4, size: [2, 1], colors: ['sand', 'white'] });
  p.register('peat', { count: [8, 12], life: [0.5, 0.9], speed: [1.5, 4], gravity: 9, size: [3, 1], colors: ['night', 'ink', 'slate'] });
  p.register('hit_spark', { count: [3, 5], life: [0.15, 0.3], speed: [3, 6], gravity: 6, size: [2, 1], colors: ['white', 'sand'] });
  p.register('rain_splash', { count: [1, 2], life: [0.15, 0.3], speed: [0.5, 1], gravity: 2, size: [1, 1], colors: ['sky', 'white'], flatten: 0.3 });
}

export class Vfx {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.root = new Group(); ctx.scene.add(this.root);
    this.fx = []; this.numbers = []; this.dropViews = new Map(); this.shotViews = new Map(); this.areaViews = new Map(); this.teles = []; this.toasts = []; this.bannerQueue = [];
    this.beamMat = {}; this.leapLights = new Map();
  }
  mat(color) { return glowMaterial(PALETTE[color] || PALETTE.white); }
  add(obj, dur, upd, onEnd) { this.root.add(obj); this.fx.push({ obj, t: 0, dur, upd, onEnd }); return obj; }
  ring(x, z, r, color, dur = 0.35, thick = 1, shock = false) {
    const m = new Mesh(ringGeo, this.mat(color)); m.position.set(x, 0.08, z); m.scale.setScalar(0.3);
    this.add(m, dur, (o, k) => { const s = Math.max(0.3, r * (1 - Math.pow(1 - k, 2))); o.scale.set(s, 1, s); o.position.y = 0.08 + (shock ? 0.02 : 0); o.visible = k < 0.95 || (Math.floor(k * 30) % 2 === 0); });
  }
  disc(x, z, r, color, dur, light, y = 0.05) {
    const m = new Mesh(discGeo, toonMaterial(PALETTE[color])); m.position.set(x, y, z); m.scale.set(r, 1, r);
    m.userData.noShadow = true;
    const lt = light ? this.ctx.lights.request({ position: [x, 0.8, z], color: light, intensity: 4, radius: r * 2, lifetime: dur, priority: 2 }) : null;
    this.add(m, dur, (o, k) => { o.visible = k < 0.8 || Math.floor(k * 24) % 2 === 0; });
  }
  sector(x, z, dx, dz, r, ang, color, dur = 0.14) {
    const a = Math.atan2(dx, dz); const g = new CircleGeometry(1, 16, -Math.PI / 2 + (Math.PI * (180 - ang)) / 360 * 0, 0).rotateX(-Math.PI / 2);
    const th = (ang * Math.PI) / 180;
    const geo = new CircleGeometry(1, 20, Math.PI / 2 - th / 2 - a + Math.PI / 2 - Math.PI / 2, th).rotateX(-Math.PI / 2);
    const m = new Mesh(geo, this.mat(color)); m.position.set(x, 0.1, z); m.rotation.y = 0;
    // CircleGeometry thetaStart is measured in XY; after rotateX(-90) the arc sits in XZ: rotate by heading
    m.geometry.dispose(); const g2 = new CircleGeometry(1, 20, 0, th).rotateZ(-th / 2).rotateX(-Math.PI / 2); m.geometry = g2; m.rotation.y = Math.atan2(dx, dz) - Math.PI / 2; m.scale.set(r, 1, r);
    this.add(m, dur, (o, k) => { o.scale.set(r * (0.6 + 0.4 * k), 1, r * (0.6 + 0.4 * k)); });
  }
  line(x, z, x2, z2, color, dur = 0.15, w = 0.12, y = 0.9) {
    const m = new Mesh(boxGeo, this.mat(color)); const dx = x2 - x, dz = z2 - z, L = Math.hypot(dx, dz);
    m.position.set((x + x2) / 2, y, (z + z2) / 2); m.scale.set(w, w, L); m.rotation.y = Math.atan2(dx, dz); this.add(m, dur, (o, k) => { o.scale.x = o.scale.y = w * (1 - k); });
  }
  tele(e) {
    const T = { e, t: 0, time: e.time || 0.8 };
    let m;
    if (e.kind === 'ring') { m = new Mesh(ringGeo, this.mat(e.friendly ? 'sky' : 'red')); m.position.set(e.x, 0.09, e.z); }
    else if (e.kind === 'line') { m = new Mesh(boxGeo, this.mat('red')); const dx = e.x2 - e.x, dz = e.z2 - e.z, L = Math.hypot(dx, dz); m.position.set((e.x + e.x2) / 2, 0.08, (e.z + e.z2) / 2); m.scale.set(e.w || 0.6, 0.04, L); m.rotation.y = Math.atan2(dx, dz); T.L = L; }
    else { m = new Mesh(discGeo, this.mat('red')); m.position.set(e.x, 0.09, e.z); m.scale.set(0.5, 1, 0.5); }
    T.m = m; this.root.add(m); this.teles.push(T);
    this.game.audio && this.game.audio.sfx('telegraph');
    // follow the caster if it moves
  }
  burst(name, x, y, z, o) { this.ctx.particles.burst(name, [x, y, z], o); }
  number(x, z, text, { color = 'white', scale = 1, y = 1.4 } = {}) { this.numbers.push({ x: x + (Math.random() - 0.5) * 0.5, y, z, text, color, scale, age: 0, vx: (Math.random() - 0.5) * 0.8 }); if (this.numbers.length > 80) this.numbers.shift(); }

  onEvent(e, w) {
    const g = this.game; const tun = w.tuning;
    switch (e.t) {
      case 'hit': {
        if (e.shield) { this.number(e.x, e.z, 'BLOCKED', { color: 'sky', scale: 1 }); break; }
        const col = e.crit ? 'sand' : e.el === 'flame' ? 'orange' : e.el === 'grave' ? 'lime' : e.el === 'sound' ? 'white' : 'white';
        this.number(e.x, e.z, fmtNum(e.amt), { color: col, scale: e.crit ? 2 : 1 });
        const el = ELCOL[e.el] || ELCOL.phys;
        this.burst(e.el === 'flame' ? 'ember' : e.el === 'grave' ? 'grave_smoke' : 'hit_spark', e.x, 0.9, e.z, { colors: el, count: e.crit ? 8 : 3 });
        g.audio && g.audio.hitSound(e);
        if (e.crit) g.shake(0.08);
        break;
      }
      case 'hurt': g.shake(0.2); g.onHeroHurt && g.onHeroHurt(e); this.number(e.x, e.z, fmtNum(e.amt), { color: 'red', scale: 1, y: 1.8 }); g.audio && g.audio.sfx('hurt', { pitch: (e.seat || 0) * 2 }); break;
      case 'heal': this.number(e.x, e.z, '+' + fmtNum(e.amt), { color: 'lime', y: 1.7 }); break;
      case 'fx': this.fxEvent(e); break;
      case 'tele': this.tele(e); break;
      case 'shake': g.shake(e.amt); break;
      case 'sfx': g.audio && g.audio.sfx(e.name, { x: e.x, z: e.z }); break;
      case 'kill': { if (!e.minion) { this.ctx.particles.burst(e.type === 'bloat_deacon' ? 'peat' : 'bone_chips', [e.x, 0.6, e.z], {}); if (this.view && this.view.decals) { try { this.view.decals.add('splat', new Vector3(e.x, 0.02, e.z), new Vector3(0, 1, 0), { size: 0.4 + Math.random() * 0.5 }); } catch {} } g.audio && g.audio.sfx(e.big ? 'death_big' : 'death_' + (e.type === 'rattlebones' ? 'bone' : 'flesh'), { x: e.x, z: e.z }); } break; }
      case 'propBreak': g.audio && g.audio.sfx('shatter', { x: e.x, z: e.z }); this.burst('wax', e.x, 0.5, e.z); break;
      case 'gold': g.audio && g.audio.sfx('coin'); break;
      case 'tallow': g.audio && g.audio.sfx('plop'); this.burst('wax', e.x, 0.5, e.z, { count: 6 }); break;
      case 'drop': { if (e.rarity === 'legendary' || e.rarity === 'set') { g.audio && g.audio.sfx('bell_bright'); g.shake(0.15); g.banner && g.banner(e.name, e.rarity === 'set' ? 'lime' : 'orange', 2, 2.5); } else if (e.rarity === 'reliquary') g.audio && g.audio.sfx('drop_good'); else g.audio && g.audio.sfx('drop'); break; }
      case 'pickup': g.audio && g.audio.sfx('pickup'); if (e.upgrade && g.toastUpgrade) g.toastUpgrade(e); break;
      case 'potion': g.audio && g.audio.sfx('potion'); this.burst('wax', e.x, 1, e.z, { count: 8, colors: ['red', 'sand'] }); break;
      case 'dodge': g.audio && g.audio.sfx('dodge'); this.burst('shock', e.x, 0.2, e.z); break;
      case 'levelup': g.audio && g.audio.sfx('levelup'); this.ring(e.x, e.z, 4, 'sand', 0.8); g.banner && g.banner('YOU FEEL MORE ALIVE. THIS IS NOT MEDICALLY POSSIBLE.', 'sand', 1, 3.0, 'LEVEL ' + e.level); break;
      case 'castFire': { if (e.spin) break; this.burst(ELCOL[e.el] === ELCOL.flame ? 'ember' : 'shock', e.x + (e.dx || 0), 1, e.z + (e.dz || 0), { count: 3, colors: ELCOL[e.el] }); break; }
      case 'comet': { const m = new Mesh(ballGeo, this.mat('orange')); m.scale.setScalar(2.5); m.position.set(e.x + 3, 14, e.z + 3); this.add(m, 0.45, (o, k) => { o.position.set(e.x + 3 * (1 - k), 14 * (1 - k) + 0.3, e.z + 3 * (1 - k)); }); this.ring(e.x, e.z, e.r, 'red', 0.45); break; }
      case 'requiem': g.banner && g.banner(e.n + ' KILL REQUIEM', 'sand', 2, 1.6); g.audio && g.audio.sfx('requiem'); break;
      case 'leap': { break; }
      case 'banner': g.banner && g.banner(e.text, 'sand', e.small ? 1 : 2, 2.4); break;
      case 'toast': g.toast && g.toast(e.text, e.seat); break;
      case 'cantcast': g.audio && g.audio.sfx('error'); g.flashCost && g.flashCost(e.seat); break;
      case 'heroDeath': g.audio && g.audio.sfx('hero_death'); break;
      case 'revive': g.audio && g.audio.sfx('revive'); this.ring(e.x, e.z, 3, 'lime', 0.6); break;
      case 'wake': g.audio && g.audio.sfx('wake_' + (['rattlebones', 'cinderling'].includes(e.type) ? 'bone' : 'low'), { x: e.x, z: e.z }); break;
      case 'mattack': g.audio && g.audio.sfx('mattack', { x: e.x, z: e.z }); break;
      case 'plateEscape': break;
      case 'areaEnd': break;
      default: break;
    }
  }
  fxEvent(e) {
    const n = e.name || '';
    const col = colorOf(n);
    if (n.startsWith('ring_') || n === 'line_hit') {
      if (n === 'line_hit') { this.line(e.x, e.z, e.x2, e.z2, 'red', 0.25, 0.9, 0.2); return; }
      this.ring(e.x, e.z, e.r || 3, col, e.shock ? 0.5 : 0.35, 1, e.shock);
      if (e.shock) { this.ctx.engine.screen.shockwave([e.x, 0.3, e.z], { radius: Math.min(0.6, 0.12 * (e.r || 3)) }); this.burst('shock', e.x, 0.3, e.z, { count: 10 }); }
    } else if (n.startsWith('arc_line')) this.line(e.x, e.z, e.x2, e.z2, e.el === 'flame' ? 'orange' : 'sky', 0.2, 0.1, 1.0);
    else if (n.startsWith('arc_') || n.startsWith('cone_')) this.sector(e.x, e.z, e.dx, e.dz, e.r, e.ang || 90, col, 0.16);
    else if (n.startsWith('puff_')) { this.burst(n === 'puff_grave' ? 'grave_smoke' : n === 'puff_flame' ? 'ember' : 'shock', e.x, 0.6, e.z, { count: 6 }); }
    else if (n.startsWith('patch_')) { this.disc(e.x, e.z, e.r, n === 'patch_fire' ? 'red' : n === 'patch_holy' ? 'sand' : n === 'patch_curse' ? 'plum' : 'sky', e.dur || 4, n === 'patch_fire' ? 0xff7030 : n === 'patch_holy' ? 0xffe090 : null); }
    else if (n === 'spikes') { this.ring(e.x, e.z, e.r, 'white', 0.3); this.burst('bone_chips', e.x, 0.3, e.z); }
    else if (n === 'coffin') { this.burst('bone_chips', e.x, 0.5, e.z, { count: 12 }); }
  }
  // ---- per-frame sync of sim lists to visuals ----
  update(w, dt, game) {
    for (const f of this.fx) { f.t += dt; const k = Math.min(1, f.t / f.dur); if (f.upd) f.upd(f.obj, k); }
    this.fx = this.fx.filter((f) => { if (f.t >= f.dur) { this.root.remove(f.obj); if (f.obj.geometry && f.obj.geometry.userData && f.obj.geometry.userData.own) f.obj.geometry.dispose(); return false; } return true; });
    for (const t of this.teles) {
      t.t += dt; const k = Math.min(1, t.t / t.time);
      if (t.e.kind === 'ring') { const r = t.e.r * (0.25 + 0.75 * k); t.m.scale.set(r, 1, r); const mon = t.e.mid ? w.monsters.find((q) => q.id === t.e.mid) : null; if (mon) t.m.position.set(mon.x, 0.09, mon.z); }
      else if (t.e.kind === 'line') t.m.scale.x = (t.e.w || 0.6) * (0.4 + 0.6 * k);
      else t.m.scale.set(0.5 + k * 0.4, 1, 0.5 + k * 0.4);
      t.m.visible = (Math.floor(t.t * 12) % 2 === 0) || k > 0.6;
    }
    this.teles = this.teles.filter((t) => { if (t.t >= t.time) { this.root.remove(t.m); return false; } return true; });
    for (const n of this.numbers) { n.age += dt; n.y += dt * 1.1; n.x += n.vx * dt; }
    this.numbers = this.numbers.filter((n) => n.age < 0.9);
    this.syncDrops(w, dt);
    this.syncShots(w);
    this.syncAreas(w);
  }
  syncDrops(w, dt) {
    const seen = new Set();
    for (const d of w.drops) {
      seen.add(d.id);
      let v = this.dropViews.get(d.id);
      if (!v) {
        const g = new Group(); let beam = 0, light = null;
        if (d.kind === 'gold' || d.kind === 'coin') { g.add(new Mesh(new SphereGeometry(0.16, 6, 4), this.mat('sand'))); g.position.y = 0.2; }
        else if (d.kind === 'tallow') { const m = new Mesh(new SphereGeometry(0.22, 6, 5), toonMaterial(PALETTE.sand)); m.scale.y = 0.6; g.add(m); g.add(new Mesh(new BoxGeometry(0.05, 0.14, 0.05), this.mat('orange'))); }
        else if (d.kind === 'gem') { const m = new Mesh(new SphereGeometry(0.2, 5, 4), this.mat('cyan')); g.add(m); g.position.y = 0.3; beam = 1.2; }
        else {
          const R = RARITIES[d.item.rarity]; const col = R.color;
          const base = new Mesh(new BoxGeometry(0.45, 0.2, 0.3), toonMaterial(PALETTE[col])); base.position.y = 0.18; g.add(base);
          const shine = new Mesh(new BoxGeometry(0.2, 0.08, 0.14), this.mat(col)); shine.position.y = 0.34; g.add(shine);
          beam = R.beam;
          if (R.rank >= 3) light = this.ctx.lights.request({ position: [d.x, 0.8, d.z], color: d.item.rarity === 'set' ? 0xa0f060 : 0xff9040, intensity: 6, radius: 8, priority: 2 });
          else if (R.rank >= 2) light = this.ctx.lights.request({ position: [d.x, 0.6, d.z], color: 0xffd070, intensity: 3, radius: 4, priority: 2 });
        }
        if (beam) { const bm = new Mesh(boxGeo, this.mat(d.kind === 'gem' ? 'cyan' : RARITIES[d.item.rarity].color)); bm.scale.set(0.12, beam, 0.12); bm.position.y = beam / 2; g.add(bm); v = { g, bm, beam }; }
        else v = { g };
        v.light = light; g.position.x = d.x; g.position.z = d.z; if (!g.position.y) g.position.y = 0; this.root.add(g); this.dropViews.set(d.id, v);
        v.bounce = 0;
      }
      v.g.position.x = d.x; v.g.position.z = d.z;
      if (d.kind === 'gold' || d.kind === 'coin' || d.kind === 'gem') { v.g.rotation.y += dt * 4; }
      if (v.bm) { const s = 0.1 + 0.03 * Math.sin(this.ctx.time * 6 + d.id); v.bm.scale.x = v.bm.scale.z = s; }
      if (d.kind === 'item') { v.bounce = Math.min(1, (v.bounce || 0) + dt * 3); v.g.position.y = Math.abs(Math.sin(v.bounce * 3)) * 0.5 * (1 - v.bounce); }
    }
    for (const [id, v] of this.dropViews) if (!seen.has(id)) { this.root.remove(v.g); if (v.light) { try { v.light.release(); } catch {} } disposeObject(v.g); this.dropViews.delete(id); }
  }
  syncShots(w) {
    const seen = new Set();
    for (const s of w.shots) {
      seen.add(s.id);
      let v = this.shotViews.get(s.id);
      if (!v) { const col = s.team === 'monster' ? 'lime' : s.el === 'flame' ? 'orange' : s.el === 'sound' ? 'sand' : 'lime'; const m = new Mesh(ballGeo, this.mat(col)); m.scale.setScalar(s.vfx === 'note' || s.vfx === 'note_bad' ? 1.2 : 1.0); this.root.add(m); v = { m }; this.shotViews.set(s.id, v); }
      v.m.position.set(s.x, 1.0, s.z);
      if (this.ctx.engine.frame % 3 === 0) this.ctx.particles.burst(s.el === 'flame' ? 'ember' : 'shock', [s.x, 1.0, s.z], { count: 1 });
    }
    for (const [id, v] of this.shotViews) if (!seen.has(id)) { this.root.remove(v.m); this.shotViews.delete(id); }
  }
  syncAreas(w) {
    const seen = new Set();
    for (const a of w.areas) {
      if (!['turret', 'obstacle', 'grave', 'decoy', 'bone_wall', 'hostile_fire', 'poison_pool'].includes(a.kind)) continue;
      seen.add(a.id);
      let v = this.areaViews.get(a.id);
      if (!v) {
        let obj;
        try {
          if (a.kind === 'turret') { obj = buildModel('lamp-post', { catalog: CATALOG }).object; obj.scale.setScalar(0.9); }
          else if (a.kind === 'obstacle') { obj = buildModel('coffin', { catalog: CATALOG }).object; obj.scale.setScalar(1.6); }
          else if (a.kind === 'bone_wall') { obj = buildModel('skull-pile', { catalog: CATALOG }).object; obj.scale.setScalar(1.6); }
          else if (a.kind === 'grave') { obj = new Mesh(new BoxGeometry(0.7, 0.18, 0.9), toonMaterial(PALETTE.night)); obj.position.y = 0.08; const g = new Group(); g.add(obj); const st = new Mesh(new BoxGeometry(0.4, 0.5, 0.1), toonMaterial(PALETTE.mist)); st.position.set(0, 0.3, -0.35); g.add(st); obj = g; }
          else if (a.kind === 'decoy') { obj = new Mesh(new SphereGeometry(0.4, 6, 5), this.mat('orange')); obj.position.y = 0.6; const g = new Group(); g.add(obj); obj = g; }
          else { obj = new Mesh(discGeo, toonMaterial(a.kind === 'poison_pool' ? PALETTE.green : PALETTE.red)); obj.scale.set(a.r, 1, a.r); obj.position.y = 0.04; }
        } catch (err) { obj = new Group(); }
        obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
        this.root.add(obj); v = { obj, light: a.kind === 'turret' ? this.ctx.lights.request({ position: [a.x, 1.8, a.z], color: 0xffb060, intensity: 5, radius: 7, flicker: 'torch', priority: 2 }) : null }; this.areaViews.set(a.id, v);
      }
      v.obj.position.x = a.x; v.obj.position.z = a.z;
      if (a.kind === 'obstacle' || a.kind === 'bone_wall') { const k = Math.min(1, Math.max(0, 1 - a.t)); v.obj.position.y = 0; }
    }
    for (const [id, v] of this.areaViews) if (!seen.has(id)) { this.root.remove(v.obj); if (v.light) { try { v.light.release(); } catch {} } disposeObject(v.obj); this.areaViews.delete(id); }
  }
  clear() {
    for (const f of this.fx) this.root.remove(f.obj); this.fx = [];
    for (const t of this.teles) this.root.remove(t.m); this.teles = [];
    for (const [, v] of this.dropViews) { this.root.remove(v.g); if (v.light) { try { v.light.release(); } catch {} } } this.dropViews.clear();
    for (const [, v] of this.shotViews) this.root.remove(v.m); this.shotViews.clear();
    for (const [, v] of this.areaViews) { this.root.remove(v.obj); if (v.light) { try { v.light.release(); } catch {} } } this.areaViews.clear();
    this.numbers = [];
  }
  dispose() { this.clear(); this.ctx.scene.remove(this.root); }
}
export const fmtNum = (n) => { n = Math.round(n); return n >= 10000 ? (n / 1000).toFixed(1) + 'K' : String(n); };
