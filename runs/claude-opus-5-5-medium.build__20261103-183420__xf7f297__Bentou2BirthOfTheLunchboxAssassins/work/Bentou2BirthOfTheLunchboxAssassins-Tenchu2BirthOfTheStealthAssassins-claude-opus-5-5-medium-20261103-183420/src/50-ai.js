/* 50-ai: guards, hounds and civilians. Perception (sight through light, cover, smoke and the look-up limit; hearing;
 * a hound's nose; bodies; baits), the mind (E.Suspicion) and the behaviors on top of it (patrol, post, sleep, eat, chat,
 * notice, search, chase, fight, flee, bell runs), barks with voices, and Shadow Sight and the Ki gauge. */
def('enemy', 'ashigaru', { rig: 'ashigaru', hp: 40, walk: 30, run: 70, sight: 1, fov: 1.5, moves: [['thrust', 12, .42], ['overhead', 10, .5]], voice: 'guard', label: 'Ashigaru' });
def('enemy', 'samurai', { rig: 'samurai', hp: 70, walk: 32, run: 75, sight: 1.05, fov: 1.5, moves: [['slash', 16, .36], ['overhead', 22, .5]], blocks: .5, voice: 'guard', label: 'Samurai' });
def('enemy', 'archer', { rig: 'archer', hp: 30, walk: 28, run: 65, sight: 1.25, fov: 1.3, lookUp: true, ranged: 'arrow', post: true, moves: [['bash', 6, .4]], voice: 'guard', label: 'Archer' });
def('enemy', 'ninja', { rig: 'ninja', hp: 50, walk: 40, run: 95, sight: 1.1, fov: 1.7, lookUp: true, ranged: 'shuriken', climbs: true, notice: 1.3, moves: [['slash', 10, .28]], voice: 'guard', label: 'Red Lantern ninja', barks: 'ninja' });
def('enemy', 'hound', { rig: 'hound', hp: 20, walk: 45, run: 120, sight: .8, fov: 1.8, moves: [['bite', 8, .25]], smell: true, hear: 1.5, voice: 'guard', label: 'Hound', barks: 'hound' });
def('enemy', 'civilian', { rig: 'civilian', hp: 15, walk: 25, run: 80, sight: .9, fov: 1.6, moves: [], civilian: true, voice: 'maid', label: 'Civilian', barks: 'civilian' });
def('enemy', 'disciple', { rig: 'disciple', hp: 40, walk: 26, run: 60, sight: .9, fov: 1.5, moves: [], harmless: true, voice: 'disciple', label: 'Disciple', barks: 'disciple' });
def('enemy', 'target', { rig: 'civilian', hp: 30, walk: 25, run: 70, sight: .8, fov: 1.5, moves: [], voice: 'kanemori', label: 'Target', target: true, barks: 'target' });
const MOOD = { calm: '#5ad8c8', notice: '#f0d050', search: '#f09040', alert: '#ff4a3a' };
B.MOOD = MOOD;
const FLOWS = new Map();
B.flowFor = (M, goal, kind) => {
  const W = M.world, cx = Math.floor(goal.x / CELL), cy = Math.floor(goal.y / CELL), key = kind + ':' + cx + ',' + cy + ':' + W.nav.version;
  let f = FLOWS.get(key);
  if (!f) {
    if (FLOWS.size > 24) FLOWS.delete(FLOWS.keys().next().value);
    f = new E.FlowField(W.nav, kind === 'ninja' ? { climb: 56, drop: 56, jump: 60 } : { drop: 30 }); f.update(goal.x, goal.y); FLOWS.set(key, f);
  } else { FLOWS.delete(key); FLOWS.set(key, f); }
  return f;
};
B.clearFlows = () => FLOWS.clear();

class Guard extends E.Mover {
  constructor(spec, M) {
    const T = get('enemy', spec.type) || get('enemy', 'ashigaru'), at = { x: cc(spec.at[0]), y: cc(spec.at[1]) };
    super({ x: at.x, y: at.y, z: spec.z || 0, r: spec.type === 'hound' ? 6 : 5, climbMax: T.climbs ? 56 : 30, hopMax: 56, walk: T.walk, run: T.run });
    this.spec = spec; this.T = T; this.type = spec.type; this.id = spec.id || spec.type + Math.floor(rand() * 1e6); this.M = M;
    this.faction = spec.faction || M.level.faction || 'kanemori'; this.civilian = !!T.civilian; this.disguised = !!spec.disguised; this.mark = !!spec.mark; this.harmless = !!T.harmless || !!spec.harmless;
    this.target = !!spec.target || !!T.target;
    this.hpMax = Math.round(T.hp * (this.civilian ? 1 : B.T('enemyHp'))); this.hp = this.hpMax; this.alive = true;
    this.facing = (spec.facing || 0) * Math.PI / 180; this.home = { x: at.x, y: at.y, z: spec.z || 0, facing: this.facing };
    this.mode = spec.mode || (spec.route ? 'patrol' : 'post'); this.route = (spec.route || []).map(p => ({ x: cc(p[0]), y: cc(p[1]), wait: p[2] || 0, look: p[3] === undefined ? null : p[3] * Math.PI / 180 }));
    this.ri = 0; this.waitT = 0; this.lantern = !!spec.lantern; this.partner = spec.partner || null;
    this.mind = new E.Suspicion({ rise: B.T('suspRise'), decay: B.T('suspDecay'), forget: 7 });
    this.asleep = this.mode === 'sleep'; this.eating = false; this.bait = null; this.eatT = 0; this.poisonT = 0; this.sleepT = this.asleep ? 1e9 : 0;
    this.stunT = 0; this.blindT = 0; this.staggerT = 0; this.limpT = 0; this.barkT = 1 + rand() * 6; this.idleBark = 12 + rand() * 13; this.bubble = null;
    this.swing = null; this.drawT = 0; this.throwT = 0; this.lookT = 0; this.searchT = 0; this.searchPts = null; this.bellRun = null; this.bellT = 0; this.flee = null;
    this.vis = 'hidden'; this.seesHero = false; this.fighting = false; this.lastSeen = -99; this.dying = null; this.carried = false; this.sunk = false;
    this.rig = this.type === 'hound' ? new B.Hound() : (B.RIGS[spec.rig || T.rig] || B.RIGS.ashigaru)(spec.type === 'civilian' || spec.type === 'target' ? spec.kind || (spec.disguised ? 'servant' : 'merchant') : spec.type === 'disciple' ? spec.color || '#3a6a3a' : this.faction);
    if (this.type !== 'hound') this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
    this.voice = spec.voice || T.voice; this.label = spec.name || T.label; this.pitch = .85 + (hashStr(this.id) % 100) / 250;
  }
  get boss() { return false; }
  /* ---- perception ---- */
  canSee(t, W, extraExp = 1) {
    const h = t, M = this.M, rangeMul = this.T.sight * (M.heightened ? 1.2 : 1) * (M.mode === 'training' ? .85 : 1);
    if (h.dead || h.dive || this.asleep || this.blindT > 0 || this.eating && this.eatT > 0) return { seen: false, exposure: 0 };
    const s = E.sees(this, h, { map: W.map, range: B.T('sightRange') * rangeMul, fov: B.T('sightFov') * (this.T.fov / 1.5) });
    if (!s.seen) return s;
    const dz = h.z - (this.z + 30);
    if (!this.T.lookUp && dz > 16 && Math.atan2(dz, Math.max(1, s.d)) > B.T('lookUp') * Math.PI / 180) return { seen: false, exposure: 0 };
    if (B.smoked(M, this, h)) return { seen: false, exposure: 0 };
    if (h.cloakT > 0 && s.d > 16 && !h.combo.busy) s.exposure *= .15;
    if (t.exposure === undefined) s.exposure *= extraExp; if (s.exposure < .04) return { seen: false, exposure: 0 };
    return s;
  }
  hearNoise(n, kind) {
    if (!this.alive || this.dying || this.mark && kind === 'step') return;
    let s = E.hears(this, n, this.M.world.map) * B.T('hearing') * (this.T.hear || 1);
    if (this.asleep) { if (s > .5 && this.sleepT < 1e8) this.wake(); else if (s > .5) { this.asleep = false; this.sleepT = 0; } else return; }
    if (s > .15) {
      if (this.civilian && !this.disguised) { if (s > .5 && (kind === 'shout' || kind === 'explosion' || kind === 'scream')) this.startFlee(); return; }
      const was = this.mind.state; this.mind.hear(Math.min(1, s), { x: n.x, y: n.y, z: n.z });
      if (kind === 'shout' || kind === 'bell') { this.mind.level = Math.max(this.mind.level, this.mind.search + .05); }
      if (was === 'calm' && this.mind.state !== 'calm') this.bark(kind === 'firecracker' || kind === 'explosion' ? 'notice' : 'notice');
      if (this.eating && s > .4) { this.eating = false; this.bait = null; }
    }
  }
  wake() { this.asleep = false; this.sleepT = 0; this.bark('notice'); }
  blind() { if (!this.alive) return; this.blindT = 1.5; this.mind.level = Math.min(this.mind.level, this.mind.search - .01); if (this.mind.state === 'alert') this.mind.state = 'search'; this.mind.last = null; this.bark('blind'); B.sfxAt('cough', this.x, this.y); }
  startFlee() {
    if (this.flee || !this.alive) return; const M = this.M;
    const near = M.guards.filter(g => g.alive && !g.civilian && g !== this).sort((a, b) => dist2(a, this) - dist2(b, this))[0];
    this.flee = near ? { x: near.x, y: near.y } : { x: this.home.x, y: this.home.y }; this.bark('civilian'); B.noise(this.x, this.y, this.z, 160, 'scream', this);
    if (near) near.mind.hear(1, M.hero ? { x: M.hero.x, y: M.hero.y, z: M.hero.z } : { x: this.x, y: this.y, z: 0 });
  }
  takeHit(src, amt, o = {}) {
    if (!this.alive || this.dying) return 0; const M = this.M;
    if (this.disguised) this.reveal();
    if (this.T.blocks && this.mind.state === 'alert' && src && !o.pierce && Math.abs(E.angDiff(this.facing, Math.atan2(src.y - this.y, src.x - this.x))) < 1) { amt *= 1 - this.T.blocks; B.sfxAt('clash', this.x, this.y); P.sparks(this.x, this.y, this.z + 18, 6, this.facing + Math.PI); }
    else if (!o.quiet) { B.sfxAt('thud', this.x, this.y); if (B.game.settings.blood === 'ink') P.bits(this.x, this.y, this.z + 16, 7, ['#d02a20', '#8a1410', '#1a1418']); P.impact(this.x, this.y, this.z + 16, 1, '#ffffff'); B.game.freeze(.04); }
    this.hp -= amt; this.hurtT = .3; if (src && !o.quiet) E.knockback(src, this, 80);
    if (this.asleep) this.asleep = false; this.eating = false;
    if (this.hp <= 0) { this.alive = false; this.dieT = 0; M.kill(this, o.kind || 'melee'); return amt; }
    if (this.civilian && !this.disguised) { this.startFlee(); M.civilianHurt(this); return amt; }
    if (src && src.isHero) { this.mind.level = 1.2; this.mind.last = { x: src.x, y: src.y, z: src.z }; if (o.kind === 'shuriken' && this.mind.state === 'calm') this.mind.level = this.mind.search + .05; }
    this.bark('hurt'); return amt;
  }
  reveal() {
    if (!this.disguised) return; this.disguised = false; this.civilian = false; this.type = 'ninja'; this.T = get('enemy', 'ninja');
    this.rig = B.RIGS.ninja(); this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
    P.smoke(this.x, this.y, this.z + 14, 14, { size: 2 }); B.sfxAt('shing', this.x, this.y); this.mind.level = 1.2; this.bark('ninja'); this.M.toast('A Red Lantern!', 'The servant was a ninja');
  }
  bark(cat, force) {
    const G = B.game, M = this.M; if (!this.alive && cat !== 'death') return;
    if (!force && (this.barkCool || 0) > G.time) return; if (!force && (M.lastBarkT || 0) > G.time - 2 && cat === 'idle') return;
    const own = this.T.barks, useOwn = own && B.STORY.barks[own] && (own === 'hound' || ['alert', 'idle', 'notice', 'chat'].includes(cat));
    const lines = B.STORY.barks[useOwn ? own : cat];
    if (!lines || !lines.length) return;
    const text = lines[Math.floor(rand() * lines.length)]; this.barkCool = G.time + 2.5; M.lastBarkT = G.time;
    this.bubble = { text, t: 0, life: clamp(text.length * .07, 1.5, 2.6) };
    if (this.type === 'hound') B.sfxAt(cat === 'alert' || cat === 'notice' ? 'bark' : 'growl', this.x, this.y); else B.Voice.bark(text, Object.assign({}, B.VOICES[this.voice] || B.VOICES.guard, { hz: (B.VOICES[this.voice] || B.VOICES.guard).hz * this.pitch }), this.x, this.y);
  }
  /* ---- one step ---- */
  update(dt, M) {
    const W = M.world, h = M.hero, G = B.game;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
    if (this.dying) { if (this.dying.done) { this.dying = null; if (this.sunkLater) { this.sunk = true; } } return this.rigDead(dt); }
    if (!this.alive) { this.dieT = (this.dieT || 0) + dt; return this.rigDead(dt); }
    for (const k of ['stunT', 'blindT', 'staggerT', 'limpT', 'hurtT']) if (this[k] > 0) this[k] -= dt;
    if (M.cheats.freeze) { super.update(dt, W.map, { move: [0, 0] }); return this.rigLive(dt); }
    // poison and sleep from baits
    if (this.poisonT > 0) { this.poisonT -= dt; if (this.poisonT <= 0) { this.alive = false; this.dieT = 0; this.bark('poisoned', true); M.kill(this, 'poison'); return; } }
    if (this.asleep) { if (this.sleepT < 1e8) { this.sleepT -= dt; if (this.sleepT <= 0) this.wake(); } if (crand() < dt * .4) B.sfxAt('snore', this.x, this.y, { vol: .5 }); if (crand() < dt * .1) B.noise(this.x, this.y, this.z, 20, 'snore', this); super.update(dt, W.map, { move: [0, 0] }); return this.rigLive(dt); }
    // perception
    let seen = { seen: false, exposure: 0 }, who = h;
    if (h && !h.dead && !M.cheats.invisible && !M.over) seen = this.canSee(h, W, h.exposure);
    if (!seen.seen && M.escort && M.escort.alive && M.escort.freed) { const s2 = this.canSee(M.escort, W, M.escort.exposure); if (s2.seen) { seen = s2; who = M.escort; } }
    this.seesHero = seen.seen && who === h;
    if (seen.seen) this.lastSeen = G.time;
    if (this.disguised && h && Math.hypot(h.x - this.x, h.y - this.y) < 24 && !h.dive) this.reveal();
    // the mind: rise with heightened and the type's notice speed
    const m = this.mind; m.rise = B.T('suspRise') * (M.heightened ? 1.3 : 1) * (this.T.notice || 1) * (this.harmless ? 1.2 : 1); m.decay = B.T('suspDecay');
    if (this.civilian && !this.disguised) {
      m.update(dt, seen, who);
      if (!this.flee && (m.level > .6 || this.seesBody(W))) this.startFlee();
      return this.civilianMove(dt, W);
    }
    const before = m.state, st = this.blindT > 0 ? (m.update(dt, false, null), m.state === 'alert' ? 'search' : m.state) : m.update(dt, seen, who);
    if (m.changed || st !== before) this.onState(before, st, seen.seen && who === h);
    // hounds smell the hero
    if (this.T.smell && h && !h.dive && !h.dead && st !== 'alert') { const d = Math.hypot(h.x - this.x, h.y - this.y); if (d < (h.crouch ? 40 : 60) && Math.abs(h.z - this.z) < 20) { this.mind.hear(1, { x: h.x, y: h.y, z: h.z }); if ((this._sniffBark || 0) < G.time) { this._sniffBark = G.time + 2; this.bark('notice', true); B.noise(this.x, this.y, this.z, 150, 'bark', this); } } }
    // bodies and baits, while not hunting
    if (st !== 'alert' && !this.bellRun && !this.harmless) { const b = this.seesBody(W); if (b) this.foundBody(b); }
    if (st === 'calm' && !this.eating && !this.bellRun && !this.harmless || (this.mark && st === 'calm' && !this.eating)) this.lookForBait(W);
    this.fighting = st === 'alert' && h && Math.hypot(h.x - this.x, h.y - this.y) < 40;
    this.behave(dt, W, st);
    this.rigLive(dt);
  }
  onState(from, to, byHero) {
    const M = this.M;
    if (to === 'alert') {
      if (this.harmless) { this.bark('alert'); M.detected(this, byHero); B.noise(this.x, this.y, this.z, B.T('alertShout') * .6, 'shout', this); return; }
      this.bark('alert', true); B.noise(this.x, this.y, this.z, B.T('alertShout'), 'shout', this); M.detected(this, byHero); this.eating = false; this.bait = null;
      const bell = M.nearestBell(this); if (bell && !M.bellRung && !M.bellRunner && this.type !== 'archer' && this.type !== 'hound') { this.bellRun = bell; M.bellRunner = this; M.toast('He runs for the bell!', 'Stop him before it rings'); }
      if (this.type === 'samurai' && !this._drew) { this._drew = true; B.sfxAt('shing', this.x, this.y); }
    } else if (to === 'notice' && from === 'calm') this.bark('notice');
    else if (to === 'search' && from !== 'alert') this.bark('search');
    else if (to === 'calm' && (from === 'search' || from === 'alert')) { this.bark('lost'); this.returning = true; }
    else if (to === 'search' && from === 'alert') this.bark('search');
  }
  seesBody(W) {
    const M = this.M;
    for (const b of M.guards) {
      if (b.alive || b === this || b.found || b.sunk || b.carried || b.dying || b.mark || b.boss) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y); if (d > B.T('bodyRange')) continue;
      if (W.isHide(b.x, b.y) || W.isDeep(b.x, b.y)) continue;
      const exp = lerp(1 - B.T('darkness'), 1, W.lightAt(b.x, b.y)); if (exp < .35 + .1) continue;
      const s = E.sees(this, { x: b.x, y: b.y, z: b.z, chest: 6, eye: 4 }, { map: W.map, range: B.T('bodyRange'), fov: B.T('sightFov') });
      if (s.seen) return b;
    }
    return null;
  }
  foundBody(b) {
    const M = this.M; b.found = true; this.bark('body', true); this.mind.level = Math.max(this.mind.level, this.mind.search + .1); this.mind.last = { x: b.x, y: b.y, z: b.z };
    B.noise(this.x, this.y, this.z, B.T('alertShout'), 'shout', this); M.bodyFound(this, b);
    const bell = M.nearestBell(this); if (bell && !M.bellRung && !M.bellRunner && !this.T.post) { this.bellRun = bell; M.bellRunner = this; }
  }
  lookForBait(W) {
    const M = this.M; if (!M.baits.length || this.T.post && this.type === 'archer') return;
    for (const b of M.baits) {
      if (b.eaten || b.taken) continue; const d = Math.hypot(b.x - this.x, b.y - this.y), smell = this.T.smell && d < 120;
      if (d > B.T('baitRange') && !smell) continue;
      if (!smell) { const s = E.sees(this, { x: b.x, y: b.y, z: b.z, chest: 3, eye: 2 }, { map: W.map, range: B.T('baitRange'), fov: B.T('sightFov') * 1.3 }); if (!s.seen) continue; }
      this.bait = b; b.taken = this; this.eating = true; this.eatT = 0; this.bark('bait', true); return;
    }
  }
  goTo(dt, W, goal, speed, opt = {}) {
    const M = this.M, d = Math.hypot(goal.x - this.x, goal.y - this.y);
    if (d < (opt.near || 6)) { super.update(dt, W.map, { move: [0, 0] }); return true; }
    const f = B.flowFor(M, goal, this.T.climbs ? 'ninja' : 'walk'), nx = f.next(this.x, this.y);
    const tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - this.x, ty - this.y) || 1;
    let mv = [(tx - this.x) / l, (ty - this.y) / l], jump = false;
    if (nx && this.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < this.r + 4) jump = true;
    const ahead = { x: this.x + mv[0] * 8, y: this.y + mv[1] * 8 }; if (W.isDeep(ahead.x, ahead.y) && this.z < 2) mv = [0, 0];
    const k = (speed === 'run' ? 1 : .5) * (this.limpT > 0 ? .5 : 1) * (this.stunT > 0 ? 0 : 1);
    // stuck against a prop (flow fields are by cell): sidestep for a moment
    if (this._side > 0) { this._side -= dt; const s = this._sideDir; mv = [mv[0] * .3 - mv[1] * s, mv[1] * .3 + mv[0] * s]; }
    else if (Math.hypot(this.vx, this.vy) < 4 && Math.hypot(mv[0], mv[1]) > .1 && this.onGround) { this._stuckT = (this._stuckT || 0) + dt; if (this._stuckT > .4) { this._stuckT = 0; this._side = .6; this._sideDir = this._sideDir === 1 ? -1 : 1; } }
    else this._stuckT = 0;
    super.update(dt, W.map, { move: [mv[0] * k, mv[1] * k], jumpPressed: jump });
    if (Math.hypot(mv[0], mv[1]) > .1) this.facing = E.approachAng(this.facing, Math.atan2(mv[1], mv[0]), dt * 8);
    return false;
  }
  stand(dt, W) { super.update(dt, W.map, { move: [0, 0] }); }
  behave(dt, W, st) {
    const M = this.M, h = M.hero, G = B.game;
    if (this.stunT > 0 || this.staggerT > 0) { if (this.swing) this.swing.cancel(); return this.stand(dt, W); }
    // the bell run
    if (this.bellRun) {
      const bl = this.bellRun;
      if (this.goTo(dt, W, bl, 'run', { near: 14 })) { this.bellT += dt; if (this.bellT > 1.5) { M.ringBell(this); this.bellRun = null; this.bellT = 0; } }
      return;
    }
    // eating a bait
    if (this.eating && this.bait) {
      if (this.goTo(dt, W, this.bait, 'walk', { near: 8 })) {
        this.eatT += dt; if (crand() < dt * 4) B.sfxAt('crunch', this.x, this.y, { vol: .6 });
        if (this.eatT > 2) { const b = this.bait; b.eaten = true; this.eating = false; this.bait = null; if (b.kind === 'poison' && !this.mark) { this.poisonT = 3; this.bark('poisoned', true); this.eatenPoison = true; } else { this.asleep = true; this.sleepT = 25; this.bark('sleepy', true); if (this.mark) this.M.setFlag('trick', true); } }
      }
      return;
    }
    if (st === 'alert' && h) return this.fight(dt, W, h);
    if (this.swing && this.swing.busy) { this.swing.update(dt); return this.stand(dt, W); }
    if (st === 'notice') { if (this.mind.last) this.facing = E.approachAng(this.facing, Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x), dt * 3); return this.stand(dt, W); }
    if (st === 'search' && this.mind.last && !this.T.post) {
      if (this.goTo(dt, W, this.mind.last, 'walk', { near: 10 })) { this.lookT += dt; this.facing += Math.sin(this.lookT * 1.6) * dt * 1.6; if (this.lookT > 4) { this.lookT = 0; const a = rand() * TAU, r = 24 + rand() * 32; const nx = this.mind.last.x + Math.cos(a) * r, ny = this.mind.last.y + Math.sin(a) * r; if (W.nav.walkable(Math.floor(nx / CELL), Math.floor(ny / CELL))) this.mind.last = { x: nx, y: ny, z: 0 }; } }
      return;
    }
    if (st === 'search') { if (this.mind.last) this.facing = E.approachAng(this.facing, Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x), dt * 3); return this.stand(dt, W); }
    // calm: route, post, chat, idle barks
    this.idleBark -= dt; if (this.idleBark <= 0) { this.idleBark = 12 + rand() * 13; this.bark(this.mode === 'chat' ? 'chat' : 'idle'); }
    if (this.returning) { if (this.goTo(dt, W, this.route.length ? this.route[this.ri] : this.home, 'walk', { near: 8 })) { this.returning = false; if (!this.route.length) this.facing = this.home.facing; } return; }
    if (this.mode === 'patrol' && this.route.length) {
      if (this.waitT > 0) { this.waitT -= dt; const p = this.route[this.ri]; if (p.look !== null) this.facing = E.approachAng(this.facing, p.look + Math.sin(this.waitT * 1.3) * .5, dt * 2); return this.stand(dt, W); }
      const p = this.route[this.ri]; if (this.goTo(dt, W, p, 'walk', { near: 6 })) { this.waitT = p.wait; this.ri = (this.ri + 1) % this.route.length; }
      return;
    }
    if (this.mode === 'chat' && this.partner) { const pt = M.guards.find(g => g.id === this.partner && g.alive); if (pt) this.facing = E.approachAng(this.facing, Math.atan2(pt.y - this.y, pt.x - this.x), dt * 3); }
    else if (this.mode === 'post' || this.mode === 'eat') { this.lookT += dt; this.facing = this.home.facing + Math.sin(this.lookT * TAU / 8) * (this.mode === 'eat' ? .2 : 1.05); }
    if (Math.hypot(this.home.x - this.x, this.home.y - this.y) > 8 && this.mode !== 'patrol') { this.goTo(dt, W, this.home, 'walk'); return; }
    return this.stand(dt, W);
  }
  fight(dt, W, h) {
    const M = this.M, G = B.game, d = Math.hypot(h.x - this.x, h.y - this.y), same = Math.abs(h.z - this.z) < 12;
    if (this.harmless) { this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6); if (d > 30) this.goTo(dt, W, h, 'run', { near: 24 }); else this.stand(dt, W); return; }
    if (this.swing && this.swing.busy) {
      const began = this.swing.update(dt); this.stand(dt, W);
      if (began === 'active') { if (E.inArc(this, this.facing, h, 22 + (this.reachBonus || 0), 1.2, 12)) B.damage(this, h, this.swingDmg, { kind: 'melee' }); }
      return;
    }
    // ranged: archers draw and loose; ninja throw shuriken at range
    if (this.T.ranged && (d > 40 || this.type === 'archer')) {
      const los = W.map.sight(this, h) && !B.smoked(M, this, h);
      if (this.type === 'archer' && d < 26 && same) { const away = Math.atan2(this.y - h.y, this.x - h.x); if (!this.T.post || this.z < 4) { this.goTo(dt, W, { x: this.x + Math.cos(away) * 30, y: this.y + Math.sin(away) * 30 }, 'run'); return; } }
      this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6);
      if (los) {
        this.drawT += dt; this.drawing = true;
        const need = this.type === 'archer' ? 1.6 * B.T('enemyWindup') : .9;
        if (this.drawT > need) { this.drawT = 0; this.drawing = false; M.enemyShoot(this, h, this.T.ranged); }
        if (this.type === 'archer' || d > 90) return this.stand(dt, W);
      } else { this.drawT = 0; this.drawing = false; if (this.T.post) return this.stand(dt, W); }
    }
    if (!this.T.moves.length) return this.stand(dt, W);
    if (d < 20 + (this.reachBonus || 0) && same && !h.dead) {
      this.facing = Math.atan2(h.y - this.y, h.x - this.x);
      if ((this._atkCool || 0) < G.time) {
        const mv = this.T.moves[Math.floor(rand() * this.T.moves.length)], name = mv[0] === 'bite' ? 'thrust' : mv[0];
        this.swing = new E.Attack(name, { wind: mv[2] * B.T('enemyWindup'), recover: .35, reach: 9 }); this.swing.o = { wind: mv[2] * B.T('enemyWindup') }; this.swingDmg = mv[1];
        this.swing.start(); this._atkCool = G.time + .9 + rand() * .6; B.sfxAt('whoosh', this.x, this.y, { vol: .4 });
        if (this.type === 'hound') B.sfxAt('growl', this.x, this.y);
      }
      return this.stand(dt, W);
    }
    if (this.T.post && this.type === 'archer') return this.stand(dt, W);
    this.goTo(dt, W, h, 'run', { near: 16 });
  }
  civilianMove(dt, W) {
    if (this.flee) { if (this.goTo(dt, W, this.flee, 'run', { near: 14 })) { this.cowerT = (this.cowerT || 0) + dt; } return this.rigLive(dt); }
    if (this.mode === 'patrol' && this.route.length) { if (this.waitT > 0) { this.waitT -= dt; this.stand(dt, W); } else { const p = this.route[this.ri]; if (this.goTo(dt, W, p, 'walk')) { this.waitT = p.wait; this.ri = (this.ri + 1) % this.route.length; } } }
    else { this.stand(dt, W); this.lookT += dt; this.facing = this.home.facing + Math.sin(this.lookT * .5) * .4; }
    this.idleBark -= dt; if (this.idleBark <= 0) { this.idleBark = 14 + rand() * 12; this.bark(this.target ? 'target' : 'chat'); }
    this.rigLive(dt);
  }
  rigLive(dt) {
    const st = this.rigState({ attack: this.swing ? this.swing.state : null, stance: this.mind.state === 'alert' && !this.civilian ? 'ready' : null, hurt: this.hurtT > 0 || this.staggerT > 0, point: this.drawing,
      pose: this.asleep ? 'kneel' : this.eating && this.eatT > 0 ? 'crouch' : this.flee && this.cowerT > 0 ? 'kneel' : this.blindT > 0 ? 'guard' : this.mark && this.defeated ? 'kneel' : null,
      expr: this.mind.state === 'alert' ? 'angry' : this.blindT > 0 || this.poisonT > 0 ? 'wince' : null, run: this.mode === 'chat' && this.mind.state === 'calm' ? 0 : undefined });
    if (this.type === 'hound') { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, sniff: this.mind.state === 'search', bark: this.bubble && this.bubble.t < .6, eat: this.eating && this.eatT > 0, hurt: this.hurtT > 0 }); return; }
    const R = this.rig, bp = R._bentou || (R._bentou = {}); bp.eat = approach(bp.eat || 0, this.eating && this.eatT > 0 ? 1 : 0, dt * 6);
    R.update(dt, st);
  }
  rigDead(dt) {
    if (this.type === 'hound') { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, down: true }); return; }
    if (this.dying && this.dying.other === this) { this.rig.update(dt, this.dying.otherState()); return; }
    if (this.mark) { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0, pose: 'kneel' }); return; }
    this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0, down: 1, pose: (this.dieT || 0) < .9 && !this.cutKind ? 'die' : null });
  }
}
B.Guard = Guard;

/* ---- Shadow Sight (20 Hz) and the Ki gauge ---- */
B.perceive = (M, dt) => {
  M._percT = (M._percT || 0) - dt; if (M._percT > 0) return; M._percT = .05;
  const h = M.hero, W = M.world, G = B.game; if (!h) return;
  const reveal = G.settings.showAll || M.cheats.reveal || M.mode === 'attract' || M.mode === 'workshop-view';
  const focus = h.focus, kr = B.T('kiRange') * (focus ? 220 / 160 : 1);
  const eye = h.peek ? { x: h.peek.x, y: h.peek.y, z: h.z } : h;
  let K = 0, lvl = -1; const order = ['calm', 'notice', 'search', 'alert'];
  for (const g of M.guards.concat(M.bosses)) {
    if (!g.alive && !g.dying) { g.vis = 'visible'; continue; }
    const d = Math.hypot(g.x - h.x, g.y - h.y);
    let vis = 'hidden';
    if (reveal || g.boss && g.active) vis = 'visible';
    else if (d < 200) { let ok = false; try { ok = W.map.sight({ x: eye.x, y: eye.y, z: eye.z, eye: h.crouch ? 16 : 30 }, g); } catch (e) { ok = true; } vis = ok ? 'visible' : d < kr ? 'sensed' : 'hidden'; }
    else if (d < kr) vis = 'sensed';
    g.vis = vis;
    if ((vis !== 'hidden' || d < kr) && d < kr && !g.civilian) { K = Math.max(K, Math.round(99 * (1 - d / kr))); lvl = Math.max(lvl, order.indexOf(g.mind ? g.mind.state : 'calm')); }
  }
  M.ki = K; M.kiState = lvl < 0 ? 'calm' : order[lvl];
};
