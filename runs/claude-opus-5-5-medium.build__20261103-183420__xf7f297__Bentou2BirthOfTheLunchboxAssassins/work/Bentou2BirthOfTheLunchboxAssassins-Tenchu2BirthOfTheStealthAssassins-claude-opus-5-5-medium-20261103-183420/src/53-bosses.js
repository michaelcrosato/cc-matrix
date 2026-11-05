/* 53-bosses: duels. A Boss has HP, phases and a pattern (moves picked by distance and phase); every move telegraphs
 * with a wind-up pose, a red ground decal and a sound. Stealth kills don't work on them; parries work where noted.
 * Also the escort, Tobei, and the bosses' summons (Hotaru's clones, Kurogane's spirit flames). */
def('boss', 'ittetsu', { name: 'Brother Ittetsu', rig: 'ittetsu', hp: 120, voice: 'ittetsu', walk: 40, run: 70, dmgMul: .35, nonLethal: true,
  pattern(b, d) { if (d > 34) return 'approach'; const r = rand(); return r < .4 ? 'overhead' : r < .7 ? 'thrust' : 'combo3'; } });
def('boss', 'gonroku', { name: 'Gonroku the Iron Ox', rig: 'gonroku', hp: 300, voice: 'gonroku', walk: 38, run: 80, reach: 8,
  pattern(b, d) { const r = rand(); if (b.phase === 2 && r < .25 && d < 70) return 'quake'; if (d > 60 && r < .6) return 'charge'; if (d > 36) return 'approach'; return r < .55 ? 'smash' : 'sweep'; } });
def('boss', 'hotaru', { name: 'Hotaru of the Red Lantern', rig: 'hotaru', hp: 220, voice: 'hotaru', walk: 50, run: 110,
  pattern(b, d) { const r = rand(); if (b.phase === 2 && !b.M.clones.some(c => c.alive) && r < .35) return 'clones'; if (r < .25) return 'vanish'; if (d > 50) return r < .6 ? 'fan' : 'approach'; return r < .6 ? 'dash' : 'fan'; } });
def('boss', 'kurogane', { name: 'Chamberlain Kurogane', rig: 'kurogane', hp: 420, voice: 'kurogane', walk: 36, run: 70, reach: 10,
  pattern(b, d) { const r = rand(); if (b.phase === 2) { if (r < .2) return 'fireballs'; if (r < .32 && d < 50) return 'roar'; if (r < .44) return 'flame'; if (r < .52 && !b.M.spirits.some(s => s.alive)) return 'spirits'; } if (r < .15 && b.phase === 1) return 'guard'; if (d > 44) return r < .5 ? 'lunge' : 'approach'; return 'threecut'; } });
const MOVES = {
  approach: { wind: 0, act: .9, rec: 0 },
  overhead: { wind: .6, act: .2, rec: .5, dmg: 18, reach: 28, arc: .6, parry: true, pose: 'overhead', decal: 'arc' },
  thrust: { wind: .45, act: .25, rec: .5, dmg: 14, reach: 38, arc: .25, lunge: 120, pose: 'thrust', decal: 'line' },
  combo3: { wind: .3, act: .9, rec: .5, dmg: 8, reach: 26, arc: .9, hits: 3, pose: 'slash', decal: 'arc' },
  smash: { wind: .55, act: .2, rec: .4, dmg: 30, reach: 42, arc: .55, pose: 'overhead', decal: 'arc', stuck: 1.2, shake: 6 },
  sweep: { wind: .4, act: .25, rec: .4, dmg: 20, reach: 36, arc: 1.05, parry: true, pose: 'spin', decal: 'arc' },
  charge: { wind: .6, act: 1, rec: .4, dmg: 24, charge: 160, pose: 'thrust', decal: 'line' },
  quake: { wind: .7, act: .8, rec: .5, dmg: 18, ring: 64, pose: 'overhead', decal: 'ring' },
  fan: { wind: .45, act: .1, rec: .5, pose: 'throw', shots: 4 },
  dash: { wind: .3, act: .3, rec: .4, dmg: 16, reach: 22, arc: .8, lunge: 220, parry: true, pose: 'slash', decal: 'line' },
  vanish: { wind: .25, act: 1.2, rec: .3, dmg: 18, pose: 'cast' },
  clones: { wind: .5, act: .2, rec: .4, pose: 'cast' },
  threecut: { wind: .36, act: 1.0, rec: .55, dmg: 16, reach: 34, arc: .9, hits: 3, parry: true, pose: 'slash', decal: 'arc' },
  lunge: { wind: .5, act: .3, rec: .6, dmg: 24, reach: 30, arc: .3, lunge: 230, pose: 'thrust', decal: 'line' },
  guard: { wind: .1, act: 2, rec: .2, pose: 'block' },
  flame: { wind: .5, act: 3, rec: .3, pose: 'cast' },
  fireballs: { wind: .6, act: .9, rec: .5, pose: 'cast', balls: 3 },
  roar: { wind: .7, act: .3, rec: .6, ring: 40, pose: 'cheer', decal: 'ring' },
  spirits: { wind: .6, act: .2, rec: .4, pose: 'cast' }
};
class Boss extends E.Mover {
  constructor(id, spec, M) {
    const D = get('boss', id), at = { x: cc(spec.at[0]), y: cc(spec.at[1]) };
    super({ x: at.x, y: at.y, z: spec.z || M.world.map.groundAt(at.x, at.y, 4, 400) || 0, r: 7, walk: D.walk, run: D.run, climbMax: 0, hopMax: 0 });
    Object.assign(this, { D, bossId: id, M, spec, name: D.name, hpMax: Math.round(D.hp * B.T('enemyHp')), alive: true, active: false, phase: 1, move: null, cool: 1.2, staggerT: 0, stuckT: 0, hurtT: 0,
      facing: Math.PI / 2, rig: B.RIGS[D.rig](), mind: { state: 'alert', level: 1.2 }, vis: 'visible', reachBonus: D.reach || 0, swing: null, guardT: 0, home: at, label: D.name });
    this.hp = this.hpMax;
  }
  get boss() { return true; }
  hearNoise() { /* a boss in its duel already knows where you are: noise changes nothing */ }
  takeHit(src, amt, o = {}) {
    if (!this.alive || !this.active) return 0; const M = this.M;
    if (this.guardT > 0 && src && Math.abs(E.angDiff(this.facing, Math.atan2(src.y - this.y, src.x - this.x))) < 1.1 && !o.pierce) { B.sfxAt('clash', this.x, this.y); P.sparks(this.x, this.y, this.z + 26, 8, this.facing); M.toast('Iron Guard', 'Flank him, or use your tools'); return 0; }
    if (o.kind === 'melee' || o.kind === 'riposte') { B.sfxAt('thud', this.x, this.y); P.impact(this.x, this.y, this.z + 22, 1.2, '#ffffff'); if (B.game.settings.blood === 'ink') P.bits(this.x, this.y, this.z + 20, 6, ['#d02a20', '#1a1418']); B.game.freeze(.05); }
    this.hp -= amt; this.hurtT = .25; B.emit('bossHit', { b: this, amt });
    if (this.phase === 1 && this.hp <= this.hpMax / 2 && this.bossId !== 'ittetsu') this.enterPhase2();
    if (this.hp <= 0) { this.hp = 0; M.bossDefeated(this); }
    return amt;
  }
  enterPhase2() {
    const M = this.M; this.phase = 2; this.move = null; this.cool = 1.4; B.game.flash('#ff6a3a', .15, .6); B.sfx('roar');
    if (this.bossId === 'kurogane') { this.rig = B.RIGS.kuroganeOni(); this.r = 8; M.say('kurogane', 'kur_phase2'); P.fire(this.x, this.y, this.z + 10, 30, { size: 2 }); }
    else if (this.bossId === 'gonroku') M.say('gonroku', 'gon_phase2');
    else if (this.bossId === 'hotaru') M.say('hotaru', 'hot_clones');
    B.game.audio.tempo((B.SONGS.boss.bpm || 140) + 10);
  }
  start() { this.active = true; this.cool = 1.4; }
  update(dt, M) {
    const h = M.hero, W = M.world, G = B.game;
    for (const k of ['staggerT', 'stuckT', 'hurtT', 'guardT']) if (this[k] > 0) this[k] -= dt;
    if (this.phase === 2 && this.bossId === 'kurogane' && crand() < dt * 10) P.add({ kind: 'ember', x: this.x + (crand() - .5) * 14, y: this.y + (crand() - .5) * 14, z: this.z + 10 + crand() * 30, vz: 30, life: .8, color: '#ff8a3a' });
    if (!this.alive || !this.active || M.cheats.freeze || !h) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUpdate(dt); }
    const d = Math.hypot(h.x - this.x, h.y - this.y);
    if (this.staggerT > 0 || this.stuckT > 0) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUpdate(dt); }
    if (!this.move) {
      this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6);
      this.cool -= dt;
      if (d > 30) { const a = Math.atan2(h.y - this.y, h.x - this.x), k = this.cool > 0 ? .5 : 1; super.update(dt, W.map, { move: [Math.cos(a) * k, Math.sin(a) * k] }); }
      else super.update(dt, W.map, { move: [0, 0] });
      if (this.cool <= 0 && !h.dead) { const id = this.D.pattern(this, d); if (id === 'approach') this.cool = .5; else this.begin(id); }
      return this.rigUpdate(dt);
    }
    const mv = this.move, S = mv.S; mv.t += dt;
    const wind = S.wind * B.T('enemyWindup') * (this.phase === 2 ? .82 : 1);
    if (mv.phase === 'wind') { this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * (mv.id === 'charge' || mv.id === 'lunge' ? 10 : 4)); super.update(dt, W.map, { move: [0, 0] }); if (mv.t >= wind) { mv.phase = 'act'; mv.t = 0; this.onActive(mv); } }
    else if (mv.phase === 'act') { this.during(mv, dt); if (mv.t >= S.act) { mv.phase = 'rec'; mv.t = 0; this.onEnd(mv); } }
    else { super.update(dt, W.map, { move: [0, 0] }); if (mv.t >= S.rec) { this.move = null; this.cool = (this.phase === 2 ? .5 : .9) + rand() * .5; } }
    // the swing state for parries
    this.swing = mv && mv.phase === 'wind' && S.parry ? { phase: 'wind', u: clamp(mv.t / wind, 0, 1), o: { wind }, cancel: () => { this.move = null; this.cool = 1.4; } } : null;
    this.windMul = 1;
    return this.rigUpdate(dt);
  }
  begin(id) { const S = MOVES[id]; this.move = { id, S, t: 0, phase: 'wind', hits: 0 }; B.sfxAt(id === 'vanish' || id === 'dash' ? 'shing' : id === 'roar' ? 'roar' : 'whoosh', this.x, this.y, { vol: .6 }); }
  hitHero(dmg, reach, arc, o = {}) {
    const h = this.M.hero; if (!h || h.dead) return false;
    if (Math.hypot(h.x - this.x, h.y - this.y) > reach + 6 || Math.abs(h.z - this.z) > 16) return false;
    if (arc < 3 && Math.abs(E.angDiff(this.facing, Math.atan2(h.y - this.y, h.x - this.x))) > arc) return false;
    return B.damage(this, h, dmg * (this.D.dmgMul || 1), o) > 0;
  }
  onActive(mv) {
    const S = mv.S, M = this.M, h = M.hero, G = B.game, W = M.world;
    if (S.dmg && S.reach && !S.hits && !S.lunge) { const hit = this.hitHero(S.dmg, S.reach, S.arc); if (S.shake) G.shake(S.shake); if (S.stuck && !hit) { this.stuckT = S.stuck; M.toast('He is stuck!', 'Strike now'); } P.dust(this.x + Math.cos(this.facing) * 20, this.y + Math.sin(this.facing) * 20, this.z, 8); B.sfxAt('thud', this.x, this.y); }
    if (mv.id === 'fan') { const n = this.phase === 2 ? 5 : S.shots, a0 = Math.atan2(h.y - this.y, h.x - this.x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .22; M.shots.fire({ x: this.x, y: this.y, z: this.z + 20, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, team: 'enemy', life: 1.2, dmg: 6, color: '#ff8a8a' }); } B.sfxAt('shuriken', this.x, this.y); P.glints(this.x, this.y, this.z + 20, 4, '#ff6a4a'); }
    if (mv.id === 'vanish') { P.smoke(this.x, this.y, this.z + 14, 20, { size: 2.5 }); B.sfxAt('smoke', this.x, this.y); this.hidden = true; }
    if (mv.id === 'clones') { M.spawnClones(this); }
    if (mv.id === 'guard') { this.guardT = S.act; }
    if (mv.id === 'roar') { G.shake(5); for (const k of [0, 1]) P.ring(this.x, this.y, 4, 40 + k * 10, '#ff6a3a', .5); if (h && Math.hypot(h.x - this.x, h.y - this.y) < 40 && !(M.intent && M.intent.blockDown)) { h.stunT = 1; B.damage(this, h, 8, { pierce: true }); M.toast('Stunned!', 'Block a roar next time'); } }
    if (mv.id === 'spirits') M.spawnSpirits(this);
    if (mv.id === 'fireballs') { for (let i = 0; i < S.balls; i++) { const tx = h.x + (rand() - .5) * 40, ty = h.y + (rand() - .5) * 40, v = E.arc({ x: this.x, y: this.y, z: this.z + 30 }, { x: tx, y: ty, z: h.z }, 700, { apex: 40 + i * 8 }); M.fireballs.push({ x: this.x, y: this.y, z: this.z + 30, vx: v.vx, vy: v.vy, vz: v.vz, tx, ty }); } B.sfxAt('boom', this.x, this.y, { vol: .4 }); }
    if (mv.id === 'charge' || S.lunge) { mv.dir = this.facing; }
    if (mv.id === 'quake') { mv.r = 0; G.shake(6); B.sfxAt('boom', this.x, this.y); }
  }
  during(mv, dt) {
    const S = mv.S, M = this.M, W = M.world, h = M.hero;
    if (mv.id === 'charge' || S.lunge) {
      const sp = mv.id === 'charge' ? S.charge : S.lunge * (mv.t < S.act * .6 ? 1 : .3), vx = Math.cos(mv.dir) * sp, vy = Math.sin(mv.dir) * sp, ox = this.x, oy = this.y;
      super.update(dt, W.map, { move: [0, 0] }); this.x += vx * dt; this.y += vy * dt;
      if (W.map.collide) W.map.collide(this);
      if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * .4 && mv.id === 'charge') { this.stuckT = 2; this.move.phase = 'rec'; this.move.t = 0; B.sfxAt('thud', this.x, this.y); B.game.shake(5); M.toast('He hit the wall!', 'He is stunned'); }
      if (!mv.hitDone && this.hitHero(S.dmg, 18 + (S.reach ? 4 : 0), 3)) mv.hitDone = true;
      if (crand() < .5) P.dust(this.x, this.y, this.z, 1);
      return;
    }
    super.update(dt, W.map, { move: [0, 0] });
    if (S.hits) { const k = Math.floor(mv.t / (S.act / S.hits)); if (k > mv.hits - 1 && mv.hits < S.hits) { mv.hits++; this.hitHero(S.dmg, S.reach, S.arc); B.sfxAt('whoosh', this.x, this.y, { vol: .5 }); } }
    if (mv.id === 'quake') { const r0 = mv.r; mv.r = mv.t / S.act * S.ring; if (h && !mv.hitDone) { const d = Math.hypot(h.x - this.x, h.y - this.y); if (d > r0 - 2 && d <= mv.r + 2 && h.onGround && Math.abs(h.z - this.z) < 10) { mv.hitDone = true; B.damage(this, h, S.dmg, { unblockable: true }); } } }
    if (mv.id === 'vanish' && mv.t > S.act * .9 && this.hidden) { this.hidden = false; const a = h.facing + Math.PI; this.x = h.x + Math.cos(a) * 16; this.y = h.y + Math.sin(a) * 16; this.facing = Math.atan2(h.y - this.y, h.x - this.x); P.smoke(this.x, this.y, this.z + 14, 10, { size: 2 }); B.sfxAt('shing', this.x, this.y); this.hitHero(S.dmg, 24, 1.2); }
    if (mv.id === 'flame' && crand() < dt * 12) { M.flames.push({ x: this.x, y: this.y, z: this.z, t: 3, r: 10 }); }
  }
  onEnd(mv) { if (mv.id === 'vanish') this.hidden = false; }
  rigUpdate(dt) {
    const mv = this.move, S = mv && mv.S, wind = S ? S.wind * B.T('enemyWindup') : 1;
    let attack = null, pose = null;
    if (mv && S.pose && E.MOVES[S.pose]) { if (mv.phase === 'wind') attack = E.move(S.pose, Math.min(.33, mv.t / Math.max(.01, wind) * .33)); else if (mv.phase === 'act') attack = E.move(S.pose, .33 + Math.min(.67, mv.t / Math.max(.01, S.act) * .67)); }
    else if (mv && S.pose) pose = S.pose;
    if (!this.alive) pose = this.D.nonLethal ? 'kneel' : null;
    this.rig.update(dt, this.rigState({ attack, pose, stance: this.active ? 'ready' : null, hurt: this.hurtT > 0 || this.staggerT > 0, expr: this.active ? 'angry' : null, down: !this.alive && !this.D.nonLethal ? Math.min(1, (this.deadT || 0) * 2) : undefined }));
    if (!this.alive) this.deadT = (this.deadT || 0) + dt;
  }
}
B.Boss = Boss;
B.BOSS_MOVES = MOVES;

/* ---- Tobei, the courier to bring home: follows, waits, crouches and swims with the hero, hides behind them ---- */
class Escort extends E.Mover {
  constructor(spec, M) {
    super({ x: cc(spec.at[0]), y: cc(spec.at[1]), z: 0, r: 5, walk: 40, run: 82, sneak: 30, climbMax: 14, hopMax: 30 });
    Object.assign(this, { M, id: spec.id || 'tobei', hpMax: spec.hp || 60, alive: true, freed: false, waiting: false, facing: 0, rig: B.RIGS.tobei(), exposure: 1, hurtT: 0, barkT: 4, bubble: null, mind: { state: 'calm' }, vis: 'visible' });
    this.hp = this.hpMax; this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
  }
  get boss() { return false; }
  toggle() { this.waiting = !this.waiting; this.say(this.waiting ? 'tobei_wait' : 'tobei_follow'); }
  say(key) { const t = B.STORY.lines[key]; if (!t) return; this.bubble = { text: t, t: 0, life: 2.4 }; B.Voice.bark(t, 'tobei', this.x, this.y); }
  takeHit(src, amt) { if (!this.alive) return 0; this.hp -= amt; this.hurtT = .3; B.sfxAt('thud', this.x, this.y); if (this.hp <= 0) { this.hp = 0; this.alive = false; this.M.fail('Tobei has fallen.'); } else if (rand() < .4) this.say('tobei_hurt'); return amt; }
  update(dt, M) {
    const h = M.hero, W = M.world; if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
    if (this.hurtT > 0) this.hurtT -= dt;
    const deep = this.z < 2 && W.isDeep(this.x, this.y);
    if (!this.alive || !this.freed || !h) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUp(dt, deep); }
    const hunted = M.guards.some(g => g.alive && g.mind.state === 'alert' && Math.hypot(g.x - this.x, g.y - this.y) < 120);
    const d = Math.hypot(h.x - this.x, h.y - this.y);
    if (d > 160 && !h.swim && !M.visibleTo(this)) { const a = h.facing + Math.PI; const nx = h.x + Math.cos(a) * 18, ny = h.y + Math.sin(a) * 18; if (W.map.standable(nx, ny, h.z, 4)) { this.x = nx; this.y = ny; this.z = h.z; } }
    let move = [0, 0];
    if ((!this.waiting || hunted) && (d > (hunted ? 14 : 26))) {
      const f = this._flow || (this._flow = new E.FlowField(W.map, { drop: 30 })); if (this._fg !== Math.floor(h.x / 16) + ',' + Math.floor(h.y / 16)) { this._fg = Math.floor(h.x / 16) + ',' + Math.floor(h.y / 16); f.update(h.x, h.y); }
      const nx = f.next(this.x, this.y), tx = nx ? nx.x : h.x, ty = nx ? nx.y : h.y, l = Math.hypot(tx - this.x, ty - this.y) || 1, k = d > 60 || hunted ? 1 : .55;
      move = [(tx - this.x) / l * k, (ty - this.y) / l * k];
    }
    this.crouch = h.crouch && !deep; this.run = deep ? 28 : 82; this.walk = deep ? 28 : 40;
    super.update(dt, W.map, { move, crouch: this.crouch });
    if (Math.hypot(move[0], move[1]) > .1) this.facing = Math.atan2(move[1], move[0]);
    this.exposure = deep ? .6 : lerp(1 - B.T('darkness'), 1, W.lightAt(this.x, this.y)) * (W.isHide(this.x, this.y) && this.crouch ? .15 : 1) * (this.crouch ? B.T('crouchVis') / .6 : 1);
    this.barkT -= dt; if (this.barkT <= 0) { this.barkT = 16 + rand() * 10; if (!hunted) this.say(rand() < .5 ? 'tobei_idle1' : 'tobei_idle2'); else this.say('tobei_scared'); }
    this.rigUp(dt, deep);
  }
  rigUp(dt, deep) { const st = this.rigState({ hurt: this.hurtT > 0, pose: !this.freed ? 'kneel' : null }); if (deep) st.down = .6; this.rig.update(dt, st); }
}
B.Escort = Escort;
