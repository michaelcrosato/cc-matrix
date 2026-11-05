/* Skiller7: the presenter. Builds one 3D world per area (E.World3D: the level as text, the terrain of the black run),
 * mirrors the sim into actors (the hero's persona, the Whiteouts, the bosses, the echo), places the camera (hard-cut
 * shots along the rail, first person while aiming), draws the gun on the overlay, the scan ring, footprints and warm
 * spots, and turns sim events into sparks, sounds and laughter. It only reads the sim. */
const TAU2 = Math.PI * 2;
S7.LEG_LABELS = { north: 'BALLROOM', south: 'STAIRS', lane: 'LANE', slope: 'BLACK RUN', plateau: 'PLATEAU' };

/* ---- drawn things: props made of pen shapes (engine units, a metre is 16) ---- */
S7.defineThings = () => {
  const T = E.World3D.THINGS;
  T.chandelier = (pen, t, time) => {
    pen.tube(0, 0, 0, 0, 0, 22, .7, '#3a3030').ball(0, 0, 22, 9, 9, 6, '#d8b060');
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU2 + time * .2; pen.tube(0, 0, 22, Math.cos(a) * 8, Math.sin(a) * 8, 14, .45, '#c0a060').glow(Math.cos(a) * 8, Math.sin(a) * 8, 15, 2.2, '#ffd890'); }
  };
  T.desk = (pen) => { pen.box(0, 0, 14, 40, 14, 28, '#5a3a24').box(0, 0, 30, 44, 17, 4, '#7a5234'); };
  T.palm = (pen, t, time) => {
    pen.tube(0, 0, 0, 1, 0, 40, 3, '#6a4a2a');
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU2 + .3; pen.slab(1, 0, 40, 1 + Math.cos(a) * 22, Math.sin(a) * 22, 32, 0, 0, 1, 5, 2, '#2f7a3a'); }
  };
  T.bell = (pen) => { pen.box(0, 0, 9, 14, 14, 18, '#7a5a2a').ball(0, 0, 22, 6, 6, 6, '#e0b040'); };
  T.chair = (pen) => { pen.box(0, 0, 9, 14, 14, 3, '#6a2a2a').box(-6, 0, 17, 2, 14, 16, '#6a2a2a').box(0, 0, 4, 12, 12, 8, '#6a2a2a'); };
  T.piano = (pen) => { pen.box(0, 0, 16, 40, 22, 32, '#15101a').box(-2, 12, 24, 36, 2, 10, '#eeeae4'); };
  T.chalet = (pen) => {
    pen.box(0, 0, 24, 96, 64, 48, '#7a5234').box(0, 0, 62, 104, 72, 6, '#f4f8ff').box(0, 0, 54, 100, 70, 4, '#5a3a24');
    pen.box(-40, 32, 16, 12, 2, 24, '#3a2414').box(20, 32, 40, 14, 2, 14, '#e8d080');
  };
  T.pine = (pen) => { pen.tube(0, 0, 0, 0, 0, 22, 2.4, '#4a3018'); pen.cone(0, 0, 18, 0, 0, 62, 16, '#1f5a34').cone(0, 0, 36, 0, 0, 80, 12, '#2a6e40'); pen.box(0, 0, 66, 6, 6, 6, '#f4f8ff'); };
  T.bed = (pen) => { pen.box(0, 0, 10, 44, 80, 20, '#5a2a2a').box(0, 0, 26, 40, 74, 14, '#f0e6d8').box(0, -32, 44, 40, 14, 18, '#ffffff').box(0, 0, 40, 44, 80, 8, '#7a3a3a'); };
  T.clock = (pen, t, time) => {
    pen.box(0, 0, 60, 26, 14, 120, '#4a2a1a').box(0, -7.5, 96, 18, 1, 18, '#f0e6c8').box(0, -8, 30, 10, 1, 16, '#2a1a10');
    const a = time * .4; pen.tube(0, -8, 96, Math.sin(a) * 6, -8, 96 + Math.cos(a) * 6, .6, '#1a1008');
    pen.box(0, -8, 60, 6, 2, 8, '#d8b040');
  };
  T.wardrobe = (pen) => { pen.box(0, 0, 40, 40, 22, 80, '#3a2418').box(-10, -11, 40, 16, 1, 70, '#5a3a24').box(10, -11, 40, 16, 1, 70, '#5a3a24'); };
  T.bench = (pen) => { pen.box(0, 0, 8, 80, 22, 6, '#4a3020').box(-30, 0, 4, 4, 22, 8, '#3a2418').box(30, 0, 4, 4, 22, 8, '#3a2418'); pen.glow(0, 0, 28, 6, '#ffd08a'); };
};

S7.Presenter = class Presenter {
  constructor(game, sim, area, opts = {}) {
    this.game = game; this.sim = sim; this.area = area; this.opts = opts;
    this.enemyActors = new Map();
    this.heroActors = {};
    this.gunKick = 0;
    this.time = 0;
    this.lastCamShot = null;
    this.ringT = 0;
    this.ghost = null;
    this.bossActor = null;
    this.inbox = [];          // the events the scenes answer (dialogue, notes, the code door, the boss)
    this.npcs = {};
  }

  build() {
    const A = this.area, g = this.game, M = S7.M;
      const opts = {
      look: 'card', res: 'pixels',
      gravity: 480,
      sky: A.sky || ['#05040a', '#1a1426', '#2a1e34'],
      fog: A.fog ? { color: A.fog.color, near: A.fog.near * M, far: A.fog.far * M } : false,
      ambient: A.ambient || ['#6a5a6e', '#2a2030', 2.2],
      sun: A.terrain ? { color: '#fff6e8', intensity: 2.2, dir: [.4, .9, -.6], area: 600, shadow: true } : { color: '#ffe6c8', intensity: 1.1, dir: [.3, .9, -.2] },
      torchLights: 0, torchShadows: 0, lights: 2, glowLights: 4, shadows: false, outlines: false,
      camera: { mode: 'fixed', capture: true, near: 1.2 },
      overlay: { fov: 56 },
      onDraw: (w, r) => this.onWorldDraw(w, r)
    };
    if (A.terrain) {
      const gz = A.groundZ;
      opts.terrain = {
        size: 4096,
        height: (x, y) => gz(x / M, y / M) * M,
        color: (x, y, z, nz) => { const k = 0.82 + .18 * Math.max(0, nz); return [Math.round(232 * k), Math.round(240 * k), Math.round(252 * k)]; },
        cell: 32, chunk: 32, far: 900, physics: 220, detail: 1.4, bottom: -2000,
        rock: { colors: [[84, 92, 116], [120, 124, 140]], band: 3, slope: [.5, .8] }
      };
    } else {
      opts.level = { rows: S7.areaGrid(A), legend: {}, ground: A.ground || 'flagstone', side: A.side || 'block',
        colors: A.colors || { base: '#3a2a3a', dark: '#24182a', light: '#5a4a5c' }, color: A.wallColor || '#4a2430' };
    }
    this.world = new E.World3D(g, opts);
    const W = this.world;
    this.heroes = {};
    // props
    for (const pr of A.props || []) {
      const [kind, x, y, z] = pr;
      if (kind === 'rosalind' || kind === 'bed') continue;
      if (A.terrain) {
        const zz = S7.groundZ(A, x, y) * M;
        W.thing(kind, x * M, y * M, zz, { yaw: 0 });
      } else if (kind === 'bed' || kind === 'clock' || kind === 'wardrobe' || kind === 'bench') {
        W.thing(kind, x * M, y * M, 0, { yaw: 0 });
      } else {
        W.thing(kind, x * M, y * M, (z || 0) * M, { yaw: 0 });
      }
    }
    for (const L of A.lights || []) {
      const lt = W.light({ color: L[3], reach: 13 * M, power: 1.8, flicker: .04 });
      lt.x = L[0] * M; lt.y = L[1] * M; lt.z = L[2] * M; this.lights = this.lights || []; this.lights.push(lt);
    }
    // the hero: one body under the persona's coat
    this.spawnHero();
    this.spawnNpcs();
    this.prepared = false;
    W.prepare();
    this.prepared = true;
    return this;
  }

  /** the people on the rails: Murmel (a marmot made of a blob) and Pim (a translucent lift boy) */
  spawnNpcs() {
    const W = this.world, M = S7.M;
    for (const n of this.area.npcs || []) {
      const q = S7.npcPos(this.area, n);
      let rig, a;
      const kind = S7.NPCS[n.id].kind;
      if (kind === 'blob') {
        rig = new E.Blob({ R: 12, colors: { dk: '#5a3a20', base: '#9a7040', lt: '#c8a060', spec: '#f0e0c0', eye: '#1a1008', pupil: '#000' }, ears: 'rabbit' });
        a = W.mob({ x: q.x * M, y: q.y * M, z: q.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
      } else {
        const N = S7.NPCS[n.id];
        rig = new E.Humanoid({ size: 1.3, build: 'heroic', hat: { style: N.hat, color: N.colors.trim }, colors: N.colors, weapon: null, outfit: 'coat', sleeves: 'long' });
        a = W.mob({ x: q.x * M, y: q.y * M, z: q.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
        a.fade = kind === 'ghost' ? .6 : 1;
      }
      a.setSolid(false);
      this.npcs[n.id] = { actor: a, rig, n };
    }
  }
  syncNpcs(dt) {
    const M = S7.M;
    for (const id in this.npcs) {
      const v = this.npcs[id], q = S7.npcPos(this.area, v.n);
      v.actor.place(q.x * M, q.y * M, q.z * M);
      v.rig.update(dt, { x: q.x * M, y: q.y * M, z: q.z * M, facing: S7.legAt(this.area, v.n.leg, 0).ang, vx: 0, vy: 0 });
    }
  }
  rigFor(id) {
    const P = S7.PERSONAS[id];
    const hatStyle = P.hat === 'felt' ? 'felt' : P.hat;
    return new E.Humanoid({ size: 1.3, build: 'heroic', hat: { style: hatStyle, color: P.hatColor }, colors: P.colors,
      weapon: 'gun', hair: 'short', outfit: 'coat', sleeves: 'long', acc: P.acc });
  }
  spawnHero() {
    const W = this.world, sim = this.sim;
    this.heroes = {};
    for (const h of sim.heroes) {
      const rig = this.rigFor(h.id);
      const p = sim.pos;
      const a = W.mob({ x: p.x * S7.M, y: p.y * S7.M, z: p.z * S7.M, rig, pose: false, fly: true, r: 8, half: 0 });
      a.setSolid(false);
      this.heroes[h.id] = { actor: a, rig, id: h.id };
    }
  }
  /** the Whiteouts: a mob each, invisible until revealed (its fade) */
  syncEnemies(dt) {
    const W = this.world, sim = this.sim, M = S7.M;
    const seen = new Set();
    for (const e of sim.enemies) {
      seen.add(e.id);
      let v = this.enemyActors.get(e.id);
      if (!v) {
        const rig = new E.Humanoid({ size: e.def.bulky ? 1.45 : 1.2, build: e.def.bulky ? 'bulky' : 'chibi', hat: { style: e.def.hat, color: e.def.hatColor },
          colors: e.def.colors, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long' });
        const a = W.mob({ x: e.x * M, y: e.y * M, z: e.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
        a.setSolid(false);
        v = { actor: a, rig, e, fade: 0, dead: false, hatT: 0 };
        this.enemyActors.set(e.id, v);
      }
      v.e = e;
      const want = e.revealT > 0 || S7.cheats.reveal ? 1 : 0;
      v.fade = S7.approach(v.fade, want, dt * 5);
      v.actor.fade = v.fade;
      v.actor.visible = v.fade > .02;
      v.actor.place(e.x * M, e.y * M, e.z * M);
      const pose = e.alive ? (e.laughing ? 'cheer' : null) : 'down';
      // the laugh shivers through the body; a thawed one sinks into the snow
      v.actor.sink = e.alive ? 0 : Math.min(24, e.deadT * 40);
      const shiver = e.laughing ? Math.sin(this.time * 38 + e.id) * .18 : 0;
      v.rig.update(dt, { x: e.x * M, y: e.y * M, z: e.z * M, facing: (e.ang || 0) + shiver, vx: 0, vy: 0, pose: pose || undefined,
        expr: e.laughing ? 'smile' : undefined, hurt: e.hitT > 0 ? 1 : 0 });
      if (!e.alive && e.deadT > .9) { v.actor.remove(); this.enemyActors.delete(e.id); }
    }
    for (const [id, v] of this.enemyActors) {
      if (!seen.has(id)) { v.actor.remove(); this.enemyActors.delete(id); }
    }
  }

  syncBoss(dt) {
    const sim = this.sim, b = sim.boss, W = this.world, M = S7.M;
    if (!b) return;
    if (!this.bossActor) {
      let rig;
      if (b.id === 'bellcaptain') rig = new E.Humanoid({ size: 2.1, build: 'bulky', hat: { style: 'helmet', color: '#d4a02a' }, colors: { cloth: '#3a2430', coat: '#3a2430', pants: '#1a121c', boot: '#0a0608', trim: '#d4a02a', skin: '#e8b890', hair: '#4a3a40' }, weapon: null, outfit: 'coat', sleeves: 'long' });
      else rig = new E.Blob({ R: 26, colors: { dk: '#8aa0c0', base: '#f2f6ff', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a20', pupil: '#000' }, mouth: true });
      const a = W.mob({ x: b.x * M, y: b.y * M, z: b.z * M, rig, pose: false, fly: true, r: 10, half: 0 });
      a.setSolid(false);
      this.bossActor = { actor: a, rig, id: b.id };
    }
    this.bossActor.actor.place(b.x * M, b.y * M, b.z * M);
    if (this.bossMove) this.bossMove.update(dt);
    const atk = this.bossMove ? this.bossMove.state : null;
    if (this.bossActor.id === 'bellcaptain') this.bossActor.rig.update(dt, { x: b.x * M, y: b.y * M, z: b.z * M, facing: Math.atan2(sim.pos.y - b.y, sim.pos.x - b.x), attack: atk, pose: b.alive ? undefined : 'down' });
    else this.bossActor.rig.update(dt, { squash: atk ? .3 : 0, look: [0, 0] });
  }

  /* ---- each fixed step: mirror the sim, place the camera, consume events ---- */
  step(dt) {
    const sim = this.sim, W = this.world, M = S7.M;
    this.time += dt;
    const p = sim.pos;
    this.gunKick = Math.max(0, this.gunKick - dt * 6);
    for (const h of sim.heroes) {
      const v = this.heroes[h.id];
      if (!v) continue;
      const active = h === sim.me;
      v.actor.place(p.x * M, p.y * M, p.z * M);
      const spd = active ? sim.speed : 0;
      const ang = S7.legAt(this.area, sim.legId, sim.s).ang + (sim.dir < 0 ? Math.PI : 0);
      v.rig.update(dt, { x: p.x * M, y: p.y * M, z: p.z * M, vx: Math.cos(ang) * spd * M, vy: Math.sin(ang) * spd * M, facing: ang,
        point: this.isAim() && active ? true : false, aim: this.isAim() && active ? sim.aimPitch : 0,
        pose: h.frozen ? 'down' : (sim.braking && active ? 'crouch' : undefined), run: active && spd > 1 ? Math.min(1, spd / 4) : 0,
        dash: active && sim.tuckT > 0 });
      v.actor.visible = active && !this.isAim();
    }
    this.syncEnemies(dt);
    this.syncBoss(dt);
    this.syncNpcs(dt);
    // the camera
    if (sim.camOverride) {   // a cutscene cut: the boss, framed by the camera until its dialogue ends
      const co = sim.camOverride, lk = co.look;
      const yaw = Math.atan2(lk[1] - co.at[1], lk[0] - co.at[0]), hd = Math.hypot(lk[0] - co.at[0], lk[1] - co.at[1]);
      W.camera.fixed = { x: co.at[0] * M, y: co.at[1] * M, z: co.at[2] * M, yaw, pitch: Math.atan2(lk[2] - co.at[2], hd), roll: 0, fov: co.fov };
    } else if (this.isAim()) {
      const eye = sim.eyePos();
      this.camTarget = { mode: 'aim', eye };
      W.camera.fixed = { x: eye.x * M, y: eye.y * M, z: eye.z * M, yaw: eye.yaw, pitch: eye.pitch, roll: 0, fov: 54 };
    } else {
      const shot = sim.area.kind === 'room' ? this.roomShot() : S7.shotAt(sim.area, sim.legId, sim.s);
      this.camTarget = { mode: 'shot', shot };
      if (shot) {
        const at = shot.at, tx = p.x, ty = p.y, tz = p.z + 1.2;
        const yaw = Math.atan2(ty - at[1], tx - at[0]);
        const hd = Math.hypot(tx - at[0], ty - at[1]);
        const pitch = Math.atan2(tz - at[2], hd) * .9;
        const fov = shot.fov || 54;
        W.camera.fixed = { x: at[0] * M, y: at[1] * M, z: at[2] * M, yaw, pitch, roll: 0, fov };
      }
    }
    // events
    this.consume();
    W.step(dt);
    this.ringT = Math.max(0, this.ringT - dt);
  }

  isAim() { return this.sim.mode === 'aim' || (this.sim.aimHeld && !this.sim.leg.ski); }
  roomShot() { const a = this.area.cam; return { at: a.at, fov: a.fov, look: this.area.lookAt }; }

  /** the sim's events for this step: sparks, sounds, the scan ring, the footprint and tension cues */
  consume() {
    const sim = this.sim;
    const list = sim.ev.splice(0);
    for (const e of list) {
      if (['talk', 'note', 'code_request', 'boss', 'gate'].includes(e.type)) this.inbox.push(e);
      switch (e.type) {
        case 'shot': this.gunKick = 1; S7.sfx(e.weapon === 'shotgun' ? 'boom' : e.weapon === 'rifle' ? 'shoot' : 'laser'); if (e.hit) this.spark(e.hits[0]); break;
        case 'hit': this.spark({ at: e.at }); S7.sfx('hit'); break;
        case 'kill': this.game.shake(e.thaw ? 2 : 1); S7.sfx(e.thaw ? 'thaw' : 'hit'); this.game.particles.glints(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M + 14, 10, '#e6fbff'); if (e.thaw) S7.note(this, 'THAW.', e.at); break;
        case 'laugh': S7.laugh(e); break;
        case 'explode': this.game.shake(4); this.game.flash('#ffffff'); S7.sfx('boom'); this.game.particles.explosion(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M + 8, 1.2); break;
        case 'scan': this.ringT = .7; S7.sfx('scan'); break;
        case 'hurt': this.game.shake(3); S7.sfx('hurt'); break;
        case 'freeze': S7.sfx('freeze'); this.game.shake(6); break;
        case 'switch': S7.sfx('select'); break;
        case 'pickup': S7.sfx(e.kind === 'red' ? 'heal' : 'coin'); break;
        case 'gate': S7.sfx('door'); this.game.shake(2); break;
        case 'gate_fail': S7.sfx('bump'); break;
        case 'junction': S7.sfx('confirm'); break;
        case 'boss': S7.sfx('boss'); break;
        case 'boss_hit': S7.sfx(e.warm ? 'thaw' : 'hit'); this.game.shake(e.warm ? 4 : 2); break;
        case 'bossdown': this.game.shake(10); S7.sfx('victory'); break;
        case 'boss_pulse': this.bossMove = new E.Attack(this.bossActor && this.bossActor.id === 'bellcaptain' ? 'haymaker' : 'sweep'); this.bossMove.start(); this.game.flash('#ffe8e0'); S7.sfx('boom'); this.game.particles.explosion(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M, e.r); break;
        case 'ability': S7.sfx('powerup'); this.game.flash('#fff8e8'); break;
        case 'rime_drop': S7.sfx('coin'); break;
        case 'red_drop': break;
        case 'heal': S7.sfx('heal'); break;
        case 'branch': S7.sfx('select'); break;
        case 'turn': S7.sfx('swing'); break;
        case 'wave': S7.sfx('confirm'); break;
        case 'thaw_self': S7.sfx('powerup'); break;
        default: break;
      }
    }
  }

  spark(hit) {
    if (!hit || !hit.at) return;
    const [x, y, z] = hit.at;
    this.game.particles.sparks(x * S7.M, y * S7.M, z * S7.M + 14, 8, null, { color: '#fff6d0' });
  }

  /* ---- world drawing, once per frame, under the actors ---- */
  onWorldDraw(w, r) {
    const sim = this.sim, M = S7.M;
    const pen = w.pen;
    // the scan ring and the footprints
    for (const f of sim.footprints) {
      const a = Math.min(1, f.life / 1.5);
      w.arc(f.x * M, f.y * M, f.z * M + 1, 0, 8, 0, TAU2, '#2a3450', .45 * a);
    }
    if (this.ringT > 0) {
      const k = 1 - this.ringT / .7, R = S7.live.scanRange * M * k;
      const p = sim.pos;
      w.arc(p.x * M, p.y * M, p.z * M + 2, R * .85, R, 0, TAU2, '#ff6a50', .7 * (1 - k));
    }
    // the warm spots of the revealed Whiteouts
    for (const e of sim.enemies) {
      if (!e.alive || (e.revealT <= 0 && !S7.cheats.reveal)) continue;
      const pulse = 2.6 + Math.sin(this.time * 9 + e.id) * .6;
      w.glow(e.x * M, e.y * M, (e.z + e.warm) * M, pulse, '#ff3a2a', { core: '#ffe0c0', light: true });
    }
    // the boss's warm spot
    if (sim.boss && sim.boss.alive) {
      const b = sim.boss;
      w.glow(b.x * M, b.y * M, (b.z + b.warmZ) * M, 5 + Math.sin(this.time * 6) * .6, '#ff3a2a', { core: '#ffe0c0', light: true });
    }
    // frozen persona: ice around its body
    for (const h of sim.heroes) {
      if (!h.frozen) continue;
      const p = sim.pos;
      pen.at(p.x * M, p.y * M, p.z * M, 0);
      pen.box(0, 0, 14, 22, 22, 26, '#bfe6ff');
      pen.at();
    }
    // the first-person gun
    if (this.isAim() && w.overlay) this.drawGun(w.overlay.pen);
    // the ghost of the echo run
    if (this.ghost) this.drawGhost(w, this.ghost);
  }

  drawGun(pen) {
    const sim = this.sim, me = sim.me, W = S7.WEAPONS[S7.PERSONAS[me.id].weapon];
    const kick = this.gunKick * (W.kick || .5);
    pen.at();
    const bx = 14 - kick * 1.2, by = 5.4, bz = -6.2 + kick * .7;
    pen.box(bx, by, bz, 8, 1.6, 2.4, '#2a2a30');
    pen.box(bx - 1, by, bz + 1.4, 8.6, 1.8, 1.2, '#1a1a20');
    const len = S7.PERSONAS[me.id].weapon === 'rifle' ? 12 : 6;
    pen.box(bx + 8 + len / 2, by, bz + .4, len, 1.1, 1.1, '#3a3a40');
    if (W.pellets > 1) pen.box(bx + 8 + len / 2, by - 1.6, bz + .2, len, 1.1, 1.1, '#3a3a40');
    pen.ball(bx - 2, by + .4, bz - 3.6, 2.2, 2.2, 2.2, '#c8a890');
    pen.tube(bx - 3, by + 3.8, bz - 6, bx - 2, by + 3.8, bz - 4.5, 1.2, S7.PERSONAS[me.id].colors.cloth);
    pen.at();
  }

  drawGhost(w, g) {
    const M = S7.M, p = g.pos;
    if (!p) return;
    w.glow(p.x * M, p.y * M, (p.z + 1.4) * M, 2.2, '#9ad8ff', { core: '#ffffff', light: false });
  }

  /* ---- the HUD, drawn over the world ---- */
  drawLabels(r) {
    const sim = this.sim, W = this.world;
    if (!sim.junction) return;
    const opts = sim.junction.options, pick = sim.junction.pick;
    opts.forEach((id, i) => {
      const q = S7.legAt(this.area, id, 3);
      const sc = W.project(q.x * S7.M, q.y * S7.M, (q.z + 2.4) * S7.M);
      if (!sc) return;
      const on = i === pick;
      const label = (on ? '> ' : '  ') + (S7.LEG_LABELS[id] || id.toUpperCase()) + (on ? ' <' : '');
      r.text(label, sc[0], sc[1], on ? '#ffe070' : '#d8d8e8', { align: 'center', outline: true, scale: 1 });
    });
  }
  setGhost(pos) { this.ghost = pos ? { pos } : null; }
  dispose() { try { this.world.dispose(); } catch (err) { /* already gone */ } }
};

/* the text of a thaw or a laugh, drawn over the Whiteout in the world */
S7.note = (pres, text, at) => {
  const M = S7.M;
  pres.game.particles.text(at[0] * M, at[1] * M, at[2] * M + 22, text, '#fff6c0');
};
