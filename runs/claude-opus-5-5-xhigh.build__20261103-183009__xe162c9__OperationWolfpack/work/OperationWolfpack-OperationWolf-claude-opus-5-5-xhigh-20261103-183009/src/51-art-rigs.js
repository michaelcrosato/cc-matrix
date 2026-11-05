// Humanoid presets for every type and cast member, Blob animals, the rig pool (one rig per live entity, posed every
// update from the entity's state), and custom poses as solvePose wrappers (9.2). Presentation only: never feeds the Sim.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;
const R = WP.fxr;
const SKIN = ['#e8b890', '#d8a070', '#b87a50', '#8a5a3a', '#f0c8a0', '#c48a60'];
const HYENA = { cloth: '#b49660', pants: '#7a6440', boot: '#3a2a1e', belt: '#5a4028', glove: '#4a3a28', metal: '#2e2e34', metalDk: '#18181c', trim: '#b8302a' };
const base = (o, c) => Object.assign({ size: 1.3, sleeves: 'long', outfit: 'shirt', hair: 'short' }, o, { colors: Object.assign({}, HYENA, c || {}, { skin: (c && c.skin) || WP.pick(R, SKIN) }) });
const P = WP.RIG_PRESETS = {
  rifleman: () => base({ weapon: 'gun', hat: { style: 'cap', color: WP.pick(R, ['#6a5232', '#5a4a2a', '#7a6038']) } }),
  para: () => base({ weapon: 'gun', hat: { style: 'helmet', color: '#5a5a3a' } }),
  grenadier: () => base({ weapon: null, hat: { style: 'helmet', color: '#6a6a40' }, sleeves: 'short' }),
  knife: () => base({ size: 1.25, weapon: null, sleeves: 'none', hat: { style: 'band', color: '#b8302a' }, hair: 'spiky' }, { cloth: '#8a7448' }),
  brute: () => base({ size: 1.55, build: 'bulky', weapon: 'gun', sleeves: 'none', hair: 'spiky' }, { hair: '#e8d070', cloth: '#9a8050', pants: '#5a4a30' }),
  rpg: () => base({ weapon: null, hat: { style: 'cap', color: '#4a3a24' } }, { cloth: '#a88a58' }),
  sniper: () => base({ weapon: 'gun', hat: { style: 'cap', color: '#3a4a2a' } }, { cloth: '#6a7a4a', pants: '#4a5a34' }),
  mortar: () => base({ size: 1.2, weapon: null, hat: { style: 'helmet', color: '#5a5a3a' }, sleeves: 'short' }),
  officer: () => base({ size: 1.35, weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#3a2a1a' } }, { coat: '#7a5a3a', cloth: '#7a5a3a', trim: '#e0b040', pants: '#4a3a2a' }),
  dummy: () => base({ weapon: null, hair: 'bald' }, { skin: '#c8a070', cloth: '#a88050', pants: '#8a6a40', boot: '#6a4a30' }),
  villager: v => base({ size: 1.25, weapon: null, sleeves: v % 2 ? 'short' : 'long', outfit: v % 3 === 0 ? 'tunic' : 'shirt', hat: v % 2 ? { style: 'cap', color: '#d8c070' } : null, hair: ['short', 'long', 'ponytail', 'bald', 'short', 'long'][v % 6] },
    { cloth: ['#d8d0c0', '#5a8ac8', '#c85a4a', '#e8c060', '#7ab06a', '#c890c0'][v % 6], pants: ['#5a4a3a', '#3a3a4a', '#6a5a4a'][v % 3], hair: ['#2a1a10', '#4a2a1a', '#1a1a1a'][v % 3], boot: '#5a3a24', belt: '#6a4a2a' }),
  medic: () => base({ size: 1.25, weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#f0f0f0' } }, { coat: '#f0f0f0', cloth: '#f0f0f0', trim: '#2a9a4a', pants: '#e0e0e0', boot: '#4a4a4a' }),
  reporter: () => base({ size: 1.25, weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'long' }, { cloth: '#8a9a6a', pants: '#4a5a7a', hair: '#8a4a2a', boot: '#3a2a20', trim: '#e0e0e0' }),
  hostage: who => [
    base({ size: 1.25, weapon: null, outfit: 'coat', hair: 'short' }, { skin: '#8a5a3a', coat: '#f0f0f0', cloth: '#f0f0f0', pants: '#3a3a4a', hair: '#1a1210', trim: '#c0c0c0' }),
    base({ size: 1.25, weapon: null, sleeves: 'short', hair: 'short' }, { skin: '#e8b890', cloth: '#6a8ab0', pants: '#6a5a40', hair: '#a86a3a' }),
    base({ size: 1.25, weapon: null, sleeves: 'short', hair: 'ponytail' }, { skin: '#f0c8a0', cloth: '#a89a6a', pants: '#3a4a6a', hair: '#6a2a1a', trim: '#e8e0d0' }),
    base({ size: 1.25, weapon: null, outfit: 'coat', hair: 'spiky' }, { skin: '#e0b088', coat: '#6a4a2a', cloth: '#6a4a2a', pants: '#3a4a3a', hair: '#1a1a1a', trim: '#e0b040' }),
    base({ size: 1.25, weapon: null, outfit: 'coat', hair: 'short' }, { skin: '#f0c8a0', coat: '#2a3450', cloth: '#2a3450', pants: '#2a3040', hair: '#c8c8c8', trim: '#c8c8d8' })][who % 5],
  lobo: () => base({ size: 1.3, weapon: 'gun', hat: { style: 'band', color: '#d83a2a' }, hair: 'spiky', sleeves: 'none' }, { skin: '#d8a070', hair: '#141010', cloth: '#4a5a3a', pants: '#3a4a2e', boot: '#2a2018', belt: '#2a2a20', trim: '#d83a2a' }),
  fang: () => base({ size: 1.3, weapon: 'gun', hat: { style: 'cap', color: '#2a3a2a' }, hair: 'short', sleeves: 'short' }, { skin: '#b87a50', hair: '#2a1a10', cloth: '#5a6a4a', pants: '#3a4a2e' }),
  tundra: () => base({ size: 1.3, weapon: 'gun', hat: { style: 'cap', color: '#2a6a3a' }, hair: 'ponytail', sleeves: 'long' }, { skin: '#f0d0b8', hair: '#f0f0f4', cloth: '#5a6a5a', pants: '#3a4a3a' }),
  moonshine: () => base({ size: 1.3, weapon: 'gun', hat: { style: 'band', color: '#e8c030' }, hair: 'long', sleeves: 'none' }, { skin: '#c48a60', hair: '#3a2014', cloth: '#6a5a3a', pants: '#3a3a2a' }),
  den: () => base({ size: 1.3, weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#2a5a3a' }, hair: 'short' }, { skin: '#e8c0a0', hair: '#a8a8a8', coat: '#4a5a3a', cloth: '#4a5a3a', pants: '#3a4030', trim: '#c8b060' }),
  kragg: () => base({ size: 1.6, build: 'bulky', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#2a2018' }, hair: 'short' }, { skin: '#d8a888', hair: '#2a2020', coat: '#5a4a30', cloth: '#5a4a30', pants: '#3a3020', trim: '#e8c040', boot: '#1a1410' }),
  tusk: () => base({ size: 1.75, build: 'bulky', weapon: 'gun', hat: { style: 'helmet', color: '#3a3a40' }, armor: true, sleeves: 'long' }, { skin: '#c89070', cloth: '#5a5040', pants: '#3a3428', plate: '#6a6a70', metal: '#3a3a40', boot: '#1a1410' }),
  giggs: () => base({ size: 1.25, weapon: null, hat: { style: 'cap', color: '#6a5232' } }, { skin: '#f0c8a0', hair: '#c87a3a' }),
  snarl: () => base({ size: 1.2, weapon: null, hat: { style: 'helmet', color: '#4a4a30' } }, { skin: '#c89070' })
};
WP.TYPE_RIG = { rifleman: 'rifleman', para: 'para', grenadier: 'grenadier', knife: 'knife', brute: 'brute', rpg: 'rpg', sniper: 'sniper', mortar: 'mortar', officer: 'officer', dummy: 'dummy', villager: 'villager', medic: 'medic', reporter: 'reporter', hostage: 'hostage' };

// ---------- custom poses (solvePose wrappers) ----------
const POSES = {
  handsUp(J, o, w) { const L = o.armUpper + o.armLower; for (const s of ['L', 'R']) { const sh = J['sh' + s], k = s === 'L' ? -1 : 1; J['hand' + s] = lerp3(J['hand' + s], [sh[0] + .6, sh[1] + k * .9, sh[2] + L * .92], w); J['elbow' + s] = lerp3(J['elbow' + s], [sh[0] + .4, sh[1] + k * 1.4, sh[2] + L * .48], w); } },
  panic(J, o, w) { const hd = J.head; for (const s of ['L', 'R']) { const sh = J['sh' + s], k = s === 'L' ? -1 : 1; J['hand' + s] = lerp3(J['hand' + s], [hd[0] + .6, hd[1] + k * 1.3, hd[2] + o.headR * .9], w); J['elbow' + s] = lerp3(J['elbow' + s], [sh[0] + 1.5, sh[1] + k * 2.6, sh[2] + 2.6], w); } },
  bound(J, o, w) { const c = J.hipC; for (const s of ['L', 'R']) { const sh = J['sh' + s], k = s === 'L' ? -1 : 1; J['hand' + s] = lerp3(J['hand' + s], [c[0] - 2.2, c[1] + k * .4, c[2] + 1.6], w); J['elbow' + s] = lerp3(J['elbow' + s], [sh[0] - 2, sh[1] + k * .9, sh[2] - 2.6], w); } },
  whistle(J, o, w) { const hd = J.head, sh = J.shR; J.handR = lerp3(J.handR, [hd[0] + o.headR * 1.1, hd[1] + .3, hd[2] - o.headR * .3], w); J.elbowR = lerp3(J.elbowR, [sh[0] + 2.2, sh[1] + 1.6, sh[2] - 1.5], w); },
  shoulder(J, o, w) { const sh = J.shR, hd = J.head; J.handR = lerp3(J.handR, [sh[0] + 2.4, sh[1] - .2, sh[2] + .6], w); J.elbowR = lerp3(J.elbowR, [sh[0] + .5, sh[1] + 1.8, sh[2] - 1.6], w); J.handL = lerp3(J.handL, [sh[0] + 4.2, sh[1] - 1.4, sh[2] - .4], w); J.elbowL = lerp3(J.elbowL, [J.shL[0] + 2.6, J.shL[1] - .6, J.shL[2] - 2.4], w); void hd; },
  laugh(J, o, w, t) { J.head = [J.head[0], J.head[1], J.head[2] + Math.sin(t * 50) * .35 * w]; },
  collar(J, o, w) { const sh = J.shR; J.handR = lerp3(J.handR, [sh[0] + o.armUpper + o.armLower - .6, sh[1] - 1.4, sh[2] + .4], w); J.elbowR = lerp3(J.elbowR, [sh[0] + o.armUpper * .9, sh[1] + .3, sh[2] - .6], w); }
};
const lerp3 = (a, b, t) => a ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] : b;
function wrap(rig) {
  if (rig._wpWrapped) return rig; rig._wpWrapped = true; rig._cp = {}; rig._cpT = 0;
  const baseFn = rig.solvePose;
  rig.solvePose = function () { baseFn.call(this); for (const k in this._cp) { const w = this._cp[k]; if (w > .01) POSES[k](this.J, this.o, w, this.t); } };
  return rig;
}
/** blend custom poses toward this step's choice */
const setCustom = (rig, name, dt) => { for (const k in POSES) { const on = k === name ? 1 : 0, w = rig._cp[k] || 0; rig._cp[k] = WP.approach(w, on, dt * 6); if (rig._cp[k] === 0) delete rig._cp[k]; } };
WP.Rigs = {
  pool: new Map(), portraits: {},
  make(preset, arg) { const o = (P[preset] || P.rifleman)(arg); return wrap(new E.Humanoid(o)); },
  portrait(who) {
    const k = who.toLowerCase(); if (this.portraits[k]) return this.portraits[k];
    const map = { den: 'den', lobo: 'lobo', fang: 'fang', tundra: 'tundra', moonshine: 'moonshine', kragg: 'kragg', tusk: 'tusk', giggs: 'giggs', reporter: 'reporter', hostage: 'hostage', villager: 'villager' };
    const r = this.make(map[k] || 'rifleman', k === 'hostage' ? 0 : 1); r.update(.1, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    return (this.portraits[k] = r);
  },
  hostagePortrait(i) { const k = 'h' + i; if (!this.portraits[k]) { const r = this.make('hostage', i); r.update(.1, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); this.portraits[k] = r; } return this.portraits[k]; },
  /** the rig of an entity (made on first use; kept until the entity goes) */
  get(e) {
    let r = this.pool.get(e.id); if (r) return r;
    const tp = WP.TYPES[e.type];
    if (tp.kind === 'animal') r = this.blob(e.type);
    else if (tp.kind === 'boss' && e.type === 'tusk') r = this.make('tusk');
    else r = this.make(WP.TYPE_RIG[e.type] || 'rifleman', e.type === 'hostage' ? (e.who || 0) : (e.variant !== undefined ? e.variant : Math.floor(R() * 6)));
    r._born = WP.time; this.pool.set(e.id, r); return r;
  },
  /** a gunner's rig on a vehicle part (key: vehicle id + part name) */
  gunner(key, preset = 'rifleman') { let r = this.pool.get(key); if (!r) { r = this.make(preset); this.pool.set(key, r); } return r; },
  blob(type) {
    const C = {
      goat: { R: 7, colors: { dk: '#8a8478', base: '#d8d2c4', lt: '#f0ece2', spec: '#ffffff', eye: '#2a2018', pupil: '#000000' }, horns: true, feet: true, tail: true, ears: 'cat' },
      chicken: { R: 4, colors: { dk: '#c8b8a0', base: '#f4f0e8', lt: '#ffffff', spec: '#ffffff', eye: '#2a2018', pupil: '#000' }, wings: true, feet: true },
      pig: { R: 7, colors: { dk: '#c87a80', base: '#f0a8b0', lt: '#f8c8cc', spec: '#fff', eye: '#2a2018', pupil: '#000' }, ears: 'cat', tail: true, feet: true },
      parrot: { R: 4, colors: { dk: '#1a7a2a', base: '#3ac84a', lt: '#9af0a0', spec: '#fff', eye: '#2a2018', pupil: '#000' }, wings: true },
      monkey: { R: 5, colors: { dk: '#4a2a14', base: '#7a4a24', lt: '#a87a4a', spec: '#e8c8a0', eye: '#2a2018', pupil: '#000' }, ears: 'cat', tail: true, feet: true },
      seagull: { R: 4, colors: { dk: '#a8b0b8', base: '#f0f4f8', lt: '#ffffff', spec: '#fff', eye: '#2a2018', pupil: '#000' }, wings: true }
    }[type] || { R: 5 };
    return new E.Blob(C);
  },
  release(id) { this.pool.delete(id); },
  clear() { this.pool.clear(); },
  /** pose every live entity's rig from its state (each update step, after the Sim's) */
  update(world, dt) {
    const seen = new Set();
    for (const e of world.ents) {
      const tp = WP.TYPES[e.type]; if (!tp) continue;
      const k = tp.kind;
      if (k === 'infantry' || k === 'civ' || k === 'hostage') { seen.add(e.id); this.poseHuman(e, tp, this.get(e), dt, world); }
      else if (k === 'animal') { seen.add(e.id); const b = this.get(e); b.update(dt, { walk: e.bolt ? 1 : (e.speed ? .7 : 0), flap: tp.fly || (e.bolt && e.type === 'chicken') ? 1 : 0, squash: e.hop ? -e.hop * .05 : 0, look: [Math.cos(e.facing) * 2, Math.sin(e.facing) * 2] }); }
      else if (k === 'vehicle' || k === 'boat' || k === 'air' || k === 'boss') {
        for (const p of e.parts || []) if (p.kind === 'gunner' && !p.dead || (p.name === 'kragg')) {
          const key = e.id + ':' + p.name; seen.add(key);
          const r = this.gunner(key, p.name === 'kragg' ? 'kragg' : p.name === 'snarl' ? 'snarl' : 'rifleman');
          const firing = p.atk && p.atk.phase === 'fire', aiming = !!p.atk;
          r.update(dt, { x: p.x, y: p.y, z: p.z, facing: Math.atan2(world.cam.y - p.y, world.cam.x - p.x), point: aiming || p.name === 'kragg', aim: .05, expr: firing || p.name === 'kragg' ? 'shout' : null, hurt: p.hitT > 0 });
          if (p.name === 'kragg') setCustom(r, e.stagger > 0 ? null : 'laugh', dt);
        }
        if (e.type === 'tusk' && e.tusk) { seen.add(e.id); const r = this.get(e), T = e.tusk; const w = [e.tx, e.ty];
          r.update(dt, { x: w[0], y: w[1], z: 0, vx: T.st === 'walk' ? 0 : 0, facing: Math.atan2(world.cam.y - w[1], world.cam.x - w[0]), point: T.st === 'aim', stance: T.shieldOff > 0 ? null : 'guard', run: T.st === 'charge' ? 1 : T.st === 'walk' ? .5 : 0, expr: T.st === 'charge' ? 'shout' : 'angry', hurt: e.parts && e.parts.find(q => q.name === 'tusk').hitT > 0 }); }
      }
    }
    for (const k of this.pool.keys()) if (!seen.has(k)) this.pool.delete(k);
  },
  poseHuman(e, tp, r, dt, world) {
    const s = { x: e.x, y: e.y, z: e.z, vx: e.vx || 0, vy: e.vy || 0, facing: e.facing };
    const k = tp.kind, gun = r.o.weapon === 'gun';
    let custom = null;
    if (e.dead || e.wounded || (k === 'hostage' && e.lost)) {
      s.vx = s.vy = 0;
      if (e.blown) { s.pose = 'die'; s.down = clamp(e.stt * 3, 0, 1); }
      else if (e.stt < .9) s.pose = 'die'; else s.down = 1;
      if (k === 'civ') { s.down = 1; s.pose = undefined; }
    } else {
      if (e.pose === 'kneel') s.pose = 'kneel'; else if (e.pose === 'crouch') s.pose = 'crouch'; else if (e.pose === 'down') s.down = 1; else if (e.pose === 'cheer') s.pose = 'cheer';
      if (k === 'infantry') {
        const aiming = !!e.atk || e.st === 'aim' || e.beh === 'snipe' || e.beh === 'tower' || e.st === 'attack' && !e.throwing && !e.whistle;
        if (gun && aiming) { s.point = true; s.aim = e.z > 30 ? -.35 : .02; }
        if (e.atk && e.atk.phase === 'fire') s.expr = 'shout';
        if (e.throwing) { const u = clamp(e.throwing.t / e.throwing.T, 0, 1) * .45; s.attack = E.move('throw', u); }
        else if (e._thrownAt !== undefined && WP.time - e._thrownAt < .35) s.attack = E.move('throw', .45 + (WP.time - e._thrownAt) / .35 * .55);
        if (e.whistle) custom = 'whistle';
        if (e.type === 'rpg') custom = 'shoulder';
        if (e.beh === 'para' && e.z > 1) { s.air = true; s.vx = s.vy = 0; }
        if (e.st === 'drop') s.air = true;
        if (e.stun > 0) s.hurt = true;
        if (e.hurtT > 0) { s.hurt = true; e.hurtT -= dt; }
        if (e.surrender) custom = 'handsUp';
      } else if (k === 'civ') { custom = e.panic > 0 ? 'panic' : null; }
      else if (k === 'hostage') { custom = e.saved ? null : 'bound'; if (e.saved) s.pose = 'cheer'; if (e.grabbedBy) s.pose = 'kneel'; if (e.hurtT > 0) { s.hurt = true; e.hurtT -= dt; } }
    }
    setCustom(r, custom, dt);
    r.update(dt, s);
  }
};
WP.Rigs.POSES = POSES; WP.Rigs.setCustom = setCustom; WP.Rigs.wrap = wrap;
})();
