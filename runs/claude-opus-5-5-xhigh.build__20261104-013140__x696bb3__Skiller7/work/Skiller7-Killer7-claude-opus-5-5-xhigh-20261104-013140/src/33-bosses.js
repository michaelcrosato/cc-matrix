/* BOSSES (§11.8): Bellcaptain Augustin Grau (the service shaft, three phases, a hat that tips), Die Lustigen Vier (the
 * ballroom: each musician's warm spot shows only while their track sounds), Hansi Pulver (the Avalaugh, the slalom,
 * the interview). A boss's warm spots and body spheres come from bossWarmSpots(); its people are drawn by the
 * presenter from boss.actors; its machinery by S7.BOSS3D[id]. */
S7.BOSSES = {
  grau: { area: '00C', node: 's1', name: 'AUGUSTIN GRAU', phases: 3 },
  band: { area: '01B', node: 'br', name: 'DIE LUSTIGEN VIER', phases: 1 },
  hansi: { area: '01F', node: 'p3', name: 'HANSI PULVER', phases: 3 }
};
S7.BOSS_WARPS = [
  { id: 'grau', phase: 1, label: 'GRAU, PHASE 1' }, { id: 'grau', phase: 2, label: 'GRAU, PHASE 2' }, { id: 'grau', phase: 3, label: 'GRAU, PHASE 3' },
  { id: 'band', phase: 1, label: 'THE JOLLY FOUR' },
  { id: 'hansi', phase: 1, label: 'HANSI: THE AVALAUGH' }, { id: 'hansi', phase: 2, label: 'HANSI: THE SLALOM' }, { id: 'hansi', phase: 3, label: 'HANSI: THE INTERVIEW' }
];
const FLOORS = [6 * M, 12 * M, 18 * M], CAR = [8 * M, 3.7 * M];
/** a track's notes as "sounding" per step (a note, or a hold after one) */
S7.sounding = (notes) => { const toks = notes.split(/\s+/).filter(t => t && t !== '|'), out = []; let on = false; for (const t of toks) { if (t === '.') on = false; else if (t !== '-') on = true; out.push(on); } return out; };
const BAND = ['tuba', 'accordion', 'trumpet', 'snare'];
Object.assign(Sim.prototype, {
  startBoss(id, phase) {
    const D = S7.BOSSES[id];
    this.boss = { id, phase: phase || 0, t: 0, hp: 0, actors: [], hud: { name: D.name, k: 1 }, hits: 0 };
    this.bossNoSwitch = false; this.bossLockAim = false;
    BOSS[id].start(this, this.boss, phase || 0);
    if (phase) this.autosave('boss');
    this.emit('boss', { id, phase: phase || 0 });
  },
  updateBoss(dt) { const B = this.boss; B.t += dt; BOSS[B.id].update(this, B, dt); },
  bossWarmSpots() { const B = this.boss; return B && BOSS[B.id].spots ? BOSS[B.id].spots(this, B) : []; },
  hitBoss(w, dmg, dir, splash) {
    const B = this.boss; if (!B) return;
    if (!w.open) { this.emit('tink', { at: w.p }); if (w.deflect) this.splash(w.deflect, { at: w.p, small: true }); return; }
    const crit = w.kind === 'warm' && !splash;
    this.curResults().hits++;
    if (crit) { this.curResults().crits++; this.emit('crit', { at: w.p }); this.splash('CRITICAL BRAVO', { crit: true }); this.game.freeze && this.game.freeze(.08); }
    else this.emit('hit', { at: w.p, dmg });
    BOSS[B.id].hit(this, B, w, crit ? dmg * 3 : dmg, crit);
  },
  /** a target is eliminated: the results screen next, then the story */
  finishTarget(t) {
    this.st.results[t].done = true; this.st.flags['t0' + t + 'Done'] = 1;
    this.boss = null; this.bossNoSwitch = false; this.bossLockAim = false; this.mode = 'rail'; this.aimExit(true);
    this.emit('music', { song: 'stage' });
    this.resultsReady = t; if (t === 1) this.resultsReady = 1;
    if (this.o.bot || this.o.attract) this.resultsReady = t;
  },
  updateInterview(dt, I) { BOSS.hansi.interview(this, this.boss, dt, I); }
});

const BOSS = S7.BOSS = {
  /* ================= GRAU ================= */
  grau: {
    start(sim, B, phase) {
      B.car = { z: FLOORS[0], to: FLOORS[0], v: 0, door: 0 };
      B.cyc = 'move'; B.ct = 1.5; B.throws = 0; B.hatT = 0; B.php = 150; B.dingN = 0; B.dropT = 6;
      sim.bossNoSwitch = phase > 0;
      B.actors = [{ who: 'grau', x: CAR[0], y: CAR[1] + .5 * M, z: FLOORS[0], facing: Math.PI / 2, pose: null }];
      if (phase === 0) { sim.startBeat('grau_start'); B.phase = 0; }
      else { B.phase = phase; sim.emit('music', { song: 'shaft' }); }
      if (phase === 3) B.car.z = B.car.to = FLOORS[0];
    },
    spots(sim, B) {
      const a = B.actors[0], open = B.cyc === 'hat' && B.phase > 0, z = a.z;
      return [{ id: 'hat', kind: 'warm', p: [a.x, a.y + 4, z + 46], r: 8 * T.warmRadius, open, deflect: 'HE IS NOT TIPPING' }, { id: 'body', kind: 'body', p: [a.x, a.y, z + 22], r: 11, open, deflect: 'HE IS NOT TIPPING' }];
    },
    update(sim, B, dt) {
      const a = B.actors[0], C = B.car;
      sim.bossNoSwitch = B.phase > 0;
      // the car: moves between floors (phase 1), bounces in free fall (phase 2), carries Grau on its roof (phase 3)
      if (B.phase === 2) { C.v -= 900 * dt; C.z += C.v * dt; if (C.z < FLOORS[0]) { C.z = FLOORS[0]; C.v = Math.abs(C.v) * .55 + 120; sim.emit('sfx', { name: 'ding' }); sim.game.shake && sim.game.shake(2); } }
      else C.z = E.approach(C.z, C.to, 110 * dt);
      a.x = CAR[0]; a.y = CAR[1] + .5 * M; a.z = C.z + (B.phase === 3 ? 3.4 * M : 0);
      a.facing = Math.atan2(sim.hero.y - a.y, sim.hero.x - a.x);
      a.pose = B.cyc === 'hat' ? 'hips' : null; a.expr = 'smile';
      a.attack = B.throwPose > 0 ? E.move('throw', 1 - B.throwPose / .45) : B.phase === 3 && Math.floor(B.t * 2) % 2 ? E.move('cast', (B.t * 2) % 1) : null;
      if (B.throwPose > 0) B.throwPose -= dt;
      B.hud.k = (3 - Math.max(0, B.phase - 1) - (1 - B.php / 150)) / 3;
      B.hud.sub = B.phase === 0 ? '' : 'PHASE ' + B.phase + (B.cyc === 'hat' ? ' · HE TIPS HIS HAT' : '');
      if (B.phase === 0) return;
      B.ct -= dt;
      if (B.cyc === 'move') { if (B.ct <= 0 && Math.abs(C.z - C.to) < 2) { B.cyc = 'throw'; B.ct = .7; B.throws = 0; sim.emit('sfx', { name: 'ding' }); } }
      else if (B.cyc === 'throw') {
        if (B.ct <= 0) {
          B.ct = B.phase === 2 ? .85 : 1.05; B.throws++; B.throwPose = .45;
          const from = [a.x, a.y + 10, a.z + 30];
          const third = (B.throws % 3) === 0;
          sim.throwAt(from, 'suitcase', { dmg: 8, landDmg: 8, speed: 150, g: 260, red: 6, hp: 1, r: 8, onLand: third ? (s, p) => { s.spawnEnemy('giggler', [p.x, p.y], { reveal: 3 }); } : null });
          if (B.phase >= 2 && B.throws % 2 === 0) sim.throwAt([8 * M, 12.6 * M, 10 * M], 'suitcase', { dmg: 8, landDmg: 8, speed: 140, g: 260, red: 6, hp: 1, r: 8 });
          if (B.throws >= 3) { B.cyc = 'hat'; B.ct = B.phase === 3 ? 1.2 : 1.5; sim.emit('hattip', {}); }
        }
      } else if (B.cyc === 'hat') {
        if (B.ct <= 0) { B.cyc = 'move'; B.ct = B.phase === 2 ? 1.2 : 2.2; const i = FLOORS.indexOf(C.to); if (B.phase === 1) C.to = FLOORS[(i + 1 + Math.floor(S7.rnd('fx') * 2)) % 3]; if (B.phase === 2) C.v = 300; sim.emit('sfx', { name: 'ding' }); }
      }
      if (B.phase === 3) { B.dropT -= dt; if (B.dropT <= 0) { B.dropT = 8; for (const sp of ['top1', 'top2'].slice(0, sim.enemies.filter(e => e.alive).length < 2 ? 2 : 1)) sim.spawnEnemy('giggler', sim.areaDef.spawns[sp], { reveal: 2.5, speedK: .8 }); sim.emit('laugh', { at: [8 * M, 8 * M, 300], style: 'cackle', pitch: 0, loud: 1 }); } }
    },
    hit(sim, B, w, dmg, crit) {
      if (B.phase === 0 || B.dead) return;
      B.php -= dmg;
      if (crit || B.php <= 0) {
        B.php = 150;
        sim.killAllEnemies(); sim.projectiles = sim.projectiles.filter(p => !p.hostile);
        if (B.phase >= 3) { B.phase = 4; sim.emit('boss', { id: 'grau', phase: 4 }); sim.say('Ding...', { who: 'grau' }); sim.startBeat('t00_end'); sim.boss.dead = true; return; }
        B.phase++; B.cyc = 'move'; B.ct = 2; B.car.v = B.phase === 2 ? 400 : 0;
        if (B.phase === 2) { sim.say('The cable! Mind the luggage!', { who: 'grau' }); sim.emit('sfx', { name: 'collapse' }); sim.game.audio && sim.game.audio.tempo && sim.game.audio.tempo(150); }
        if (B.phase === 3) { B.car.to = FLOORS[0]; sim.say('Ding. Ding. DING.', { who: 'grau' }); sim.game.audio && sim.game.audio.tempo && sim.game.audio.tempo(170); }
        sim.emit('boss', { id: 'grau', phase: B.phase }); sim.autosave('boss');
      }
    }
  },
  /* ================= THE JOLLY FOUR ================= */
  band: {
    start(sim, B, phase) {
      const A = sim.areaDef, at = A.bandAt;
      B.phase = 1; B.alive = { tuba: true, accordion: true, trumpet: true, snare: true }; B.dmg = { tuba: 0, accordion: 0, trumpet: 0, snare: 0 };
      B.bpm = 112; B.stepF = 0; B.lastBar = -1; B.sound = {}; const song = S7.SONGS.band;
      for (const tr of song.tracks) B.sound[tr.name] = S7.sounding(tr.notes);
      B.actors = BAND.map((who, i) => ({ who, x: at[i][0] * M, y: at[i][1] * M, z: (A.stageZ || 0) * M, facing: Math.PI / 2, pose: null, inst: who }));
      sim.emit('music', { song: 'band' });
      if (sim.game.audio && sim.game.audio.tempo) try { sim.game.audio.tempo(112); } catch (e) { /* no sound */ }
      if (!phase) sim.startBeat('band_start');
    },
    stepNow(B) { return Math.floor(B.stepF); },
    isOn(B, who) {
      if (!B.alive[who]) return false;
      const live = BAND.filter(w => B.alive[w]);
      const L = B.sound[who], st = this.stepNow(B);
      if (live.length === 1) return st % 4 !== 3;   // the solo: nearly always sounding
      return L[st % L.length];
    },
    spots(sim, B) {
      const out = [];
      for (const a of B.actors) {
        if (!B.alive[a.who]) continue;
        const on = this.isOn(B, a.who), tubaBell = a.who === 'tuba' && BAND.filter(w => B.alive[w]).length === 1;
        out.push({ id: a.who, who: a.who, kind: 'warm', p: tubaBell ? [a.x + 4, a.y + 6, a.z + 46] : [a.x, a.y + 3, a.z + 28], r: 5.5 * T.warmRadius, open: on, deflect: 'THE MUSIC PROTECTS THEM' });
        out.push({ id: a.who + 'b', who: a.who, kind: 'body', p: [a.x, a.y, a.z + 20], r: 10, open: on, deflect: 'THE MUSIC PROTECTS THEM' });
      }
      return out;
    },
    update(sim, B, dt) {
      if (B.phase === 0 || B.dead) return;
      B.stepF += dt * B.bpm / 60 * 2;
      const bar = Math.floor(B.stepF / 8);
      for (const a of B.actors) { a.pose = B.alive[a.who] ? null : 'down'; a.on = this.isOn(B, a.who); a.attack = a.on && B.alive[a.who] ? E.move('cast', (B.stepF / 2) % 1) : null; a.facing = Math.PI / 2; a.expr = 'smile'; }
      // each bar while the band lives, two dancing Gigglers waltz in (at most six)
      if (bar !== B.lastBar && !sim.cutscene) {
        B.lastBar = bar;
        const alive = sim.enemies.filter(e => e.alive).length;
        if (alive < 4 && bar % 2 === 0) for (let k = 0; k < Math.min(BAND.filter(w => B.alive[w]).length > 2 ? 2 : 1, 4 - alive); k++) { const sp = S7.pick('spawn', Object.keys(sim.areaDef.spawns).filter(s => s.startsWith('dance'))); sim.spawnEnemy('dancer', sim.areaDef.spawns[sp], { reveal: 1 }); }
        sim.emit('beatbar', { bar });
      }
      const live = BAND.filter(w => B.alive[w]).length;
      B.hud.k = live / 4; B.hud.sub = live === 1 ? 'THE SOLO' : BAND.filter(w => B.alive[w]).map(w => w.toUpperCase()).join(' · ');
    },
    hit(sim, B, w, dmg, crit) {
      const who = w.who; if (!B.alive[who]) return;
      B.dmg[who] += dmg;
      if (crit || B.dmg[who] >= 120) {
        B.alive[who] = false; sim.emit('musiciandown', { who });
        try { sim.game.audio.layer(who, 0, .2); } catch (e) { /* no sound */ }
        const live = BAND.filter(x => B.alive[x]).length;
        B.bpm = [148, 136, 124, 112][live] || 148;
        try { sim.game.audio.tempo(B.bpm); } catch (e) { /* no sound */ }
        if (who === 'tuba') { sim.giveItem('edelweiss', 1); sim.st.flags.edelweiss2 = 1; sim.say('A flower falls out of the tuba\'s bell.'); }
        if (!live) { B.dead = true; sim.killAllEnemies(); sim.startBeat('band_end'); }
        else sim.say(['Ein!', 'Zwei!', 'Drei!'][3 - live] || 'Vier!', { who });
      }
    }
  },
  /* ================= HANSI PULVER ================= */
  hansi: {
    start(sim, B, phase) {
      const A = S7.AREAS['01F'];
      B.spotsLeft = 5; B.melt = [0, 0, 0, 0, 0]; B.thaw = null; B.snowT = 2.2; B.budT = 5; B.phase = phase || 0; B.crits = 0; B.body = 0;
      B.c = [A.avalaugh[0] * M, A.avalaugh[1] * M];
      B.actors = [];
      sim.bossNoSwitch = false; sim.bossLockAim = false;
      if (!phase) { sim.startBeat('hansi_intro'); return; }
      if (phase === 1) { sim.emit('music', { song: 'powderking' }); }
      if (phase === 2) this.toSlalom(sim, B);
      if (phase === 3) this.toInterview(sim, B);
    },
    spots(sim, B) {
      if (B.phase === 1) {
        const c = B.c, z0 = sim.grid.floorAt(c[0], c[1]) - (B.sinkZ || 0), out = [];
        const P = [[-34, 30, 8 * M], [0, 34, 7.2 * M], [34, 30, 8 * M], [-22, 26, 10.9 * M], [22, 26, 10.9 * M]];
        P.forEach((p, i) => { if (B.melt[i] >= 1) return; out.push({ id: 's' + i, i, kind: 'warm', p: [c[0] + p[0], c[1] + p[1], z0 + p[2]], r: 8 * T.warmRadius, open: true }); });
        out.push({ id: 'body', kind: 'body', p: [c[0], c[1], z0 + 5 * M], r: 4.5 * M, open: true });
        return out;
      }
      if (B.phase === 2 && B.h) {
        const h = B.h, open = B.window > 0;
        return [{ id: 'hansi', kind: 'warm', p: [h.x, h.y, h.z + 40], r: 7 * T.warmRadius, open, deflect: 'BETWEEN GATES: NOTHING' }, { id: 'hb', kind: 'body', p: [h.x, h.y, h.z + 22], r: 11, open }];
      }
      if (B.phase === 3 && B.h) return [{ id: 'hansi', kind: 'warm', p: [B.h.x, B.h.y, B.h.z + 40], r: 10, open: true }, { id: 'hb', kind: 'body', p: [B.h.x, B.h.y, B.h.z + 22], r: 14, open: true }];
      return [];
    },
    update(sim, B, dt) {
      if (B.phase === 1) this.avalaugh(sim, B, dt);
      else if (B.phase === 2) this.slalom(sim, B, dt);
      B.hud.name = B.phase === 1 ? 'THE AVALAUGH' : 'HANSI PULVER';
    },
    avalaugh(sim, B, dt) {
      const c = B.c, z0 = sim.grid.floorAt(c[0], c[1]);
      B.hud.k = B.spotsLeft / 5; B.hud.sub = B.thaw ? 'THE THAW: ' + Math.ceil(B.thaw.t) + ' S' : B.spotsLeft + ' WARM SPOTS';
      for (let i = 0; i < 5; i++) if (B.melt[i] > 0 && B.melt[i] < 1) B.melt[i] = Math.min(1, B.melt[i] + dt * 2);
      B.snowT -= dt;
      if (B.snowT <= 0) { B.snowT = 2.2; sim.throwAt([c[0] + (S7.rnd('fx') - .5) * 60, c[1] + 30, z0 + 10 * M], 'snowball', { dmg: 15, speed: 240, g: 140, hp: 1, r: 6, red: 3 }); B.throwPose = .5; }
      B.budT -= dt;
      if (B.budT <= 0 && sim.enemies.filter(e => e.alive).length < 4) { B.budT = 5; const a = S7.rnd('spawn') * Math.PI + Math.PI * .1; sim.spawnEnemy('giggler', [c[0] + Math.cos(a) * 60, c[1] + Math.sin(a) * 60], { reveal: 2 }); sim.emit('bud', { at: [c[0], c[1], z0] }); }
      if (B.thaw) {
        B.thaw.t -= dt; B.sinkZ = Math.min(3 * M, (B.sinkZ || 0) + dt * 12);
        if (B.thaw.t <= 0) {
          B.thaw = null; sim.emit('explode', { at: [c[0], c[1], z0 + 40], radius: 20 * M, kind: 'boom' });
          sim.hurtPlayer(60, [c[0], c[1], z0 + 40], 'thaw');
          const i = B.melt.findIndex(m => m >= 1); if (i >= 0) { B.melt[i] = 0; B.spotsLeft++; }
          B.sinkZ = 0; sim.say('Everything comes back in the spring!', { who: 'hansi' });
        }
      }
    },
    toSlalom(sim, B) {
      B.phase = 2; B.h = null; B.gi = 0; B.window = 0; B.crits = 0; B.body = 0; B.medalT = 2;
      sim.emit('music', { song: 'slalom' });
      sim.bossNoSwitch = true;
      sim.placeAt('sl0'); const ex = sim.rails.exits('sl0'); if (ex.length) { sim.takeBranch(ex[0]); sim.W.v = 120; }
      const A = sim.areaDef; B.path = new RailPath(A.hansiPath.map(p => [p[0] * M, p[1] * M, null]), (x, y) => sim.grid.floorAt(x, y), false); B.hs = 0; B.gates = A.slalomGates.map(g => g * B.path.length);
      sim.say('Bend the knees!', { who: 'hansi' });
    },
    slalom(sim, B, dt) {
      const P = B.path, W = sim.W, me = sim.hero;
      // Hansi weaves down his own line; he waits at the next gate if you fall more than 60 m behind
      const myD = Math.hypot(me.x - P.at(0).x, me.y - P.at(0).y);
      const ahead = B.hs - myD;
      let v = 175; if (ahead > 60 * M) v = 0; else if (ahead < 0) v = 240;
      B.hs = Math.min(P.length, B.hs + v * dt);
      const p = P.at(B.hs), wob = Math.sin(B.hs / 60) * 3 * M;
      B.h = { x: p.x + Math.cos(p.yaw + Math.PI / 2) * wob, y: p.y + Math.sin(p.yaw + Math.PI / 2) * wob, z: p.z, yaw: p.yaw };
      B.actors = [{ who: 'hansi', x: B.h.x, y: B.h.y, z: B.h.z, facing: p.yaw, pose: 'crouch', skis: true }];
      // passing a gate: 0.8 s when he can be hurt (the flags flash)
      if (B.gi < B.gates.length && B.hs >= B.gates[B.gi]) { B.gi++; B.window = .8; sim.emit('slalomgate', { i: B.gi }); }
      if (v === 0 && Math.floor(B.t * 2) % 4 === 0) { sim.emit('laugh', { at: [B.h.x, B.h.y, B.h.z + 30], style: 'cackle', pitch: 2, loud: 1 }); if (!B.waitSaid) { B.waitSaid = true; sim.say('Bend the knees!', { who: 'hansi' }); } } else if (v) B.waitSaid = false;
      if (B.window > 0) B.window -= dt;
      B.medalT -= dt;
      if (B.medalT <= 0 && B.window <= 0) { B.medalT = 2.4; sim.throwAt([B.h.x, B.h.y, B.h.z + 30], 'medal', { dmg: 10, speed: 260, g: 120, hp: 1, r: 4, red: 4 }); }
      B.hud.k = 1 - B.crits / 4; B.hud.sub = B.window > 0 ? 'THROUGH THE GATE: NOW' : 'GATE ' + Math.min(B.gi + 1, B.gates.length) + ' OF ' + B.gates.length;
      // at the bottom he waits by the old station, laughing, the flags flashing every few seconds
      if (B.hs >= P.length && B.window <= 0) { B.bottomT = (B.bottomT || 0) + dt; if (B.bottomT > 2.5) { B.bottomT = 0; B.window = .8; } }
      // you reached the station without four hits: back up the face, both of you
      if (!W.edge && W.node === 'sl9' && B.crits < 4) {
        sim.say('Again! From the top!', { who: 'hansi' });
        B.gi = 0; B.hs = 0; B.window = 0;
        sim.placeAt('sl0'); const ex = sim.rails.exits('sl0'); if (ex.length) { sim.takeBranch(ex[0]); W.v = 120; }
      }
    },
    toInterview(sim, B) {
      B.phase = 3; sim.mode = 'interview'; sim.bossNoSwitch = true; sim.bossLockAim = true;
      sim.emit('music', { song: 'interview' });
      sim.placeAt('chair');
      const n = sim.rails.nodes.chair;
      B.h = { x: n.x + 2.3 * M, y: n.y + .8 * M, z: n.z - .2 * M };
      B.actors = [{ who: 'hansiBare', x: B.h.x, y: B.h.y, z: B.h.z, facing: Math.PI + .3, pose: 'kneel' }];
      B.it = 0; B.li = 0; B.ended = false;
      sim.aim.on = true; sim.aim.yaw = Math.atan2(.8, 2.3); sim.aim.pitch = -.12; sim.aim.k = 1; S7.interviewGun = true;
      sim.cam.pose = { x: n.x, y: n.y, z: n.z + EYE_H, yaw: 0, pitch: -.05, roll: 0, fov: 62 };
    },
    interview(sim, B, dt, I) {
      if (B.ended) return;
      sim.updateAim(dt, I); sim.aim.yaw = clamp(S7.angDiff(0, sim.aim.yaw), -1.2, 1.2); sim.aim.pitch = clamp(sim.aim.pitch, -.6, .5);
      B.it += dt;
      const L = S7.INTERVIEW;
      if (B.li < L.length && B.it >= L[B.li][0]) { sim.say(L[B.li][1], { who: 'hansiBare', life: 6 }); sim.emit('line', { who: 'hansiBare', text: L[B.li][1] }); B.li++; }
      const W = sim.weaponDef(), m = sim.mag();
      m.cd = Math.max(0, m.cd - dt);
      if ((I.fireP || (W.auto && I.fireD)) && m.cd <= 0) {
        sim.fire(W, m); B.ended = true; sim.st.ending = 'shot'; sim.addDossier('hansiShot'); sim.emit('kill', { enemy: { x: B.h.x, y: B.h.y, z: B.h.z }, crit: true });
        sim.startBeat('hansi_end');
        return;
      }
      if (B.it > S7.INTERVIEW[S7.INTERVIEW.length - 1][0] + 10) { B.ended = true; sim.st.ending = 'fell'; sim.addDossier('hansiFell'); sim.say('...You hesitate. That\'s new. They usually don\'t.', { who: 'hansiBare', life: 5 }); B.actors[0].hidden = true; sim.startBeat('hansi_end'); }
    },
    hit(sim, B, w, dmg, crit) {
      if (B.phase === 1) {
        if (w.kind === 'body') { B.body = (B.body || 0) + dmg; return; }
        if (B.melt[w.i] > 0) return;
        B.melt[w.i] = .01; B.spotsLeft--; sim.say(['Ow!', 'My medals!', 'Not the eyes!', 'Careful, that\'s gold!', 'Spring!'][4 - B.spotsLeft] || 'Ha!', { who: 'hansi' });
        if (B.spotsLeft === 2 && !B.thawDone) { B.thawDone = true; B.thaw = { t: 40 }; sim.say('Let\'s see how you like the Thaw!', { who: 'hansi' }); }
        if (B.spotsLeft <= 0) { B.thaw = null; sim.killAllEnemies(); sim.projectiles = sim.projectiles.filter(p => !p.hostile); sim.startBeat('hansi_fall'); B.phase = 1.5; }
        return;
      }
      if (B.phase === 2) {
        if (crit) B.crits++; else { B.body += dmg; if (B.body >= 90) { B.body = 0; B.crits++; } }
        if (B.crits >= 4) { B.phase = 2.5; sim.startBeat('hansi_crash'); }
      }
    }
  }
};
/** Hansi's interview, line by line (seconds from its start) */
S7.INTERVIEW = [[1, 'You know what the Föhn told me? The snow is a lie the mountain tells the valley.'], [6.5, 'Every spring the truth runs down into the rivers, and the children drink it.'], [12, 'Your grandmother keeps it frozen. Who pays her? Who pays you? Same bank.']];
