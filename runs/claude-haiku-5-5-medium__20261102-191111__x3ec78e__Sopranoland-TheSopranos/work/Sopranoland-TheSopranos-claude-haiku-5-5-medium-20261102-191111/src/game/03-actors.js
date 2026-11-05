// ---------------------------------------------------------------------------------------------
// 03 · ACTORS — the people who fight and walk the street: the crew, the boss, the Feds, the
// civilians. Each is an E.Body (it walks the map and collides with it) with a Humanoid rig, and
// swings with an E.Attack from the rig's own move list. The hero is an E.Mover (see 04).
// ---------------------------------------------------------------------------------------------
const FOE_KINDS = {
  crew: { hp: 60, dmg: 10, speed: 52, reach: 24, sight: 150, moves: ['cross', 'jab', 'hook'], cd: 1.5, shoots: false },
  boss: { hp: 240, dmg: 18, speed: 46, reach: 38, sight: 230, moves: ['haymaker', 'sweep'], cd: 1.7, shoots: false },
  fed: { hp: 60, dmg: 9, speed: 50, reach: 22, sight: 210, moves: ['jab'], cd: 2.0, shoots: true },
  civ: { hp: 20, dmg: 0, speed: 58, reach: 0, sight: 0, moves: [], cd: 99, shoots: false },
};

// Their looks. A Humanoid's own options: build, outfit, hair, hat, size and a palette in colors.
const LOOKS = {
  benny: { size: 1.2, build: 'bulky', outfit: 'coat', hair: 'short', hat: 'band', colors: { coat: '#2b2b33', cloth: '#3a3a46', pants: '#1c1c22', skin: '#d09070', hair: '#2a1c14', trim: '#8a6a2a' } },
  richie: { size: 1.2, build: 'heroic', outfit: 'coat', hair: 'spiky', colors: { coat: '#4a2a2a', cloth: '#5a3a3a', pants: '#20181a', skin: '#c48866', hair: '#1a1a1a' } },
  frankie: { size: 1.25, build: 'bulky', outfit: 'shirt', hair: 'short', sleeves: 'long', colors: { cloth: '#7a3a2a', pants: '#2a2a32', skin: '#e0b090', hair: '#5a3a24' } },
  gus: { size: 1.85, build: 'bulky', outfit: 'coat', hair: 'bald', weapon: 'sword', colors: { coat: '#2a1a1a', cloth: '#6a2a2a', pants: '#14121a', skin: '#c08a66', hair: '#333', trim: '#c8a040' } },
  fed: { size: 1.2, build: 'heroic', outfit: 'coat', hair: 'short', hat: 'cap', weapon: 'gun', colors: { coat: '#1b2540', cloth: '#e8e8f0', pants: '#101828', skin: '#e0b090', hair: '#3a2a20' } },
  civ: { size: 1.1, build: 'heroic', outfit: 'shirt', hair: 'long', colors: { cloth: '#a8c0d0', pants: '#4a4a58', skin: '#e0b090', hair: '#6a4a30' } },
};

class Foe extends E.Body {
  constructor(kind, look, at, o = {}) {
    super({ x: at.x, y: at.y, r: 5 });
    const k = FOE_KINDS[kind];
    Object.assign(this, { kind, name: o.name || '', hp: k.hp, maxHp: k.hp, dmg: k.dmg, speed: k.speed, reach: k.reach, sight: k.sight, moves: k.moves, cd: k.cd, shoots: k.shoots });
    this.home = { x: at.x, y: at.y }; this.facing = o.facing ?? 0; this.z = 0;
    this.rig = new E.Humanoid(Object.assign({}, look, { colors: Object.assign({}, look.colors) }));
    this.alert = 0; this.cool = 0.5 + Math.random() * .8; this.shotCool = 1 + Math.random(); this.atk = null;
    this.dead = false; this.dieT = 0; this.flash = 0; this.hurtT = 0; this.wanderT = Math.random() * 2; this.wander = [0, 0];
    this.boss = kind === 'boss'; this.phase2 = false; this.flee = 0;
  }
  get alive() { return !this.dead; }

  // one step: look, attack, shoot or walk (named act: the engine's Body has a step counter). ctx = { hero, map, flow, shots, world }
  act(dt, ctx) {
    const hero = ctx.hero;
    this.flash = Math.max(0, this.flash - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dead) { this.dieT += dt; this.vx = this.vy = 0; this.rig.update(dt, this.rigState('die')); return; }
    this.cool = Math.max(0, this.cool - dt); this.shotCool = Math.max(0, this.shotCool - dt);
    const dx = hero.x - this.x, dy = hero.y - this.y, d = Math.hypot(dx, dy);
    if (this.kind === 'civ') return this.civStep(dt, ctx, d);
    const sees = !hero.dead && d < this.sight && ctx.map.sight(this, hero) && E.inArc(this, this.facing, hero, this.sight, 1.9);
    if (sees) { this.alert = 6; ctx.world.spotted(this, dt); } else this.alert = Math.max(0, this.alert - dt);
    if (this.atk) {
      this.atk.update(dt);
      this.atk.hits([hero], t => E.dist(this, t) < this.reach + 6, () => ctx.world.hurtHero(this.dmg, this));
      this.facing = Math.atan2(dy, dx);
      if (!this.atk.busy) this.atk = null;
      this.vx = this.vy = 0;
    } else if (this.alert > 0) {
      this.facing = Math.atan2(dy, dx);
      if (this.shoots && d > 60 && d < 170 && this.shotCool <= 0 && sees) {
        this.shotCool = 1.8 + Math.random() * .8;
        ctx.shots.fire({ x: this.x, y: this.y, z: 16, vx: dx / d * 150, vy: dy / d * 150, vz: 0, r: 2, team: 'enemy', color: '#ffe08a', life: 2, dmg: this.dmg });
        ctx.world.sfx('shoot');
        this.vx = this.vy = 0;
      } else if (this.shoots ? d > 110 : d > this.reach - 4) {
        const v = ctx.flow.dir(this.x, this.y, hero.x, hero.y);
        const sp = this.speed * (this.phase2 ? 1.25 : 1);
        this.vx = v[0] * sp; this.vy = v[1] * sp;
      } else {
        this.vx = this.vy = 0;
        if (this.cool <= 0 && this.reach > 0 && d < this.reach + 2) this.startAttack();
      }
    } else {
      // patrol: a slow wander round its home, back toward home when it strays
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; const a = Math.random() * Math.PI * 2, r = Math.random() * 24; this.wander = [this.home.x + Math.cos(a) * r, this.home.y + Math.sin(a) * r]; }
      const wx = this.wander[0] - this.x, wy = this.wander[1] - this.y, wd = Math.hypot(wx, wy);
      if (wd > 3) { this.vx = wx / wd * 22; this.vy = wy / wd * 22; this.facing = Math.atan2(wy, wx); } else this.vx = this.vy = 0;
    }
    this.update(dt, ctx.map);
    this.rig.update(dt, this.rigState(this.atk ? 'attack' : null));
  }
  startAttack() {
    const move = this.moves[Math.floor(Math.random() * this.moves.length)];
    this.atk = new E.Attack(move);
    if (!this.atk.start()) this.atk = null; else { this.cool = this.cd; }
  }
  civStep(dt, ctx, d) {
    const hero = ctx.hero;
    if (this.flee > 0) {
      this.flee -= dt;
      const dx = this.x - hero.x, dy = this.y - hero.y, dd = Math.hypot(dx, dy) || 1;
      this.vx = dx / dd * 70; this.vy = dy / dd * 70; this.facing = Math.atan2(dy, dx);
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; this.wander = [this.home.x + (Math.random() - .5) * 30, this.home.y]; }
      const wx = this.wander[0] - this.x, wy = this.wander[1] - this.y, wd = Math.hypot(wx, wy);
      if (wd > 3) { this.vx = wx / wd * 18; this.vy = wy / wd * 18; this.facing = Math.atan2(wy, wx); } else this.vx = this.vy = 0;
    }
    this.update(dt, ctx.map);
    this.rig.update(dt, this.rigState(this.flee > 0 ? 'run' : null));
  }
  rigState(mode) {
    const s = { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, stance: this.alert > 0 && !this.dead ? 'guard' : undefined };
    if (this.hurtT > 0) s.hurt = true;
    if (mode === 'die') s.pose = 'die';
    if (mode === 'attack' && this.atk) s.attack = this.atk.state;
    if (mode === 'run') s.run = 1;
    return s;
  }
  // a hit: hurtFoe in the world does the damage and the feedback; a knock moves the body away
  takeHit(n, from) {
    this.hp -= n; this.flash = .14; this.hurtT = .3; this.alert = 8;
    if (this.kind === 'civ') this.flee = 6;
    if (this.hp <= 0 && !this.dead) { this.dead = true; this.dieT = 0; this.atk = null; this.cool = 99; }
  }
}
// The rig's own look for the hero: a coat, a good shirt, the hair the way the family wears it.
function makeHeroRig() {
  return new E.Humanoid({ size: 1.25, build: 'heroic', weapon: 'staff', hair: 'short', outfit: 'coat',
    colors: { coat: '#1f1f2b', cloth: '#3a3a4a', pants: '#15151d', boot: '#0d0b0b', belt: '#2b1d12', skin: '#d9a27a', hair: '#1a1414', trim: '#b89a3a', glove: '#222' } });
}
function makeHero(at) {
  const m = new E.Mover({ x: at.x, y: at.y, r: 5, climb: true, climbMax: 12, staminaMax: 0 });
  m.facing = at.facing || 0;
  return m;
}
function makeNPCRig(def) {
  return new E.Humanoid({ size: def.size, build: def.face, hair: def.hair, outfit: def.outfit, colors: Object.assign({}, def.colors), hat: def.hat, sleeves: def.sleeves });
}
