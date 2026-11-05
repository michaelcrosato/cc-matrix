/* ---- THE WORLD: a mission's map, its lights, guards, their eyes and minds ---- */
let S = null;            // the running mission's state (null on menus)
const cc = v => Number.isInteger(v) ? (v + .5) * T : v * T;      // a cell number is that cell's centre, 14.5 the same
const FLOORS = {
  grass: o => E.tex.grass(o.x, o.y, { base: '#34603a', dark: '#244a2c', light: '#4e7e48' }),
  water: o => E.tex.water(o.x, o.y, { base: '#1c3a5a', dark: '#142c48', light: '#3a6a8a' }),
  gravel: o => E.tex.dirt(o.x, o.y, { base: '#9a9080', dark: '#7a7062', light: '#b8aea0' }),
  planks: o => E.tex.planks(o.x, o.y, { base: '#7a5a3a', dark: '#5a4028', line: '#3a281a' }),
  tatami: o => E.tex.plain(o.x, o.y, { base: '#b8b27a', amount: 10 })
};
const PAVE = { stones: ['#5e5864', '#68626e', '#625c68'].map(E.hex), mortar: E.hex('#2a2630'), hi: E.hex('#7a7482'), lo: E.hex('#3e3a46'), speck: E.hex('#4a4652') };
function buildMap(m) {
  const rows = B.grid(m.w, m.h, m.ops);
  return new E.TileMap({ rows, legend: B.LEGEND, types: B.TYPES, outside: '#0a0812',
    floorTex: (x, y, tag) => FLOORS[tag] ? FLOORS[tag]({ x, y }) : E.tex.flagstone(x, y, PAVE) });
}
const floorTag = (x, y) => S.map.floorAt(x, y);
const inWater = b => b.z < 2 && floorTag(b.x, b.y) === 'water';
const inGrass = b => b.z < 2 && floorTag(b.x, b.y) === 'grass';
const toast = (title, text, secs = 3.2) => { if (S) S.toasts.push({ title, text, t: secs, max: secs }); };
const say = (who, text, secs) => { toast(B.NAMES[who] || '', text, secs || 3 + text.length * .03); B.babble(who, text, .8); };

/* ---- GUARDS ---- */
function guardRig(def, d) {
  if (def.hound) return new E.Blob({ R: 6, colors: { dk: '#4a3a2a', base: '#8a6a44', lt: '#b08a5a', spec: '#d8b88a', eye: '#fff', pupil: '#201010' }, ears: 'cat', feet: true, tail: true, mouth: 'fangs' });
  return new E.Humanoid({ size: def.size || 1.15, build: def.build || 'chibi', hat: def.hat || undefined, hood: !!def.hood, armor: !!def.armor, weapon: def.weapon === undefined ? 'sword' : def.weapon,
    outfit: def.civ ? 'robe' : 'coat', hair: def.civ ? 'long' : 'short', sleeves: 'long', colors: { cloth: def.cloth, coat: def.cloth, pants: '#2a2630', metal: '#c8c8d8', trim: '#d8b860' } });
}
function makeGuard(d, i) {
  const def = B.ENEMY[d.type], z = d.z || 0;
  const g = new E.Mover({ x: cc(d.at[0]), y: cc(d.at[1]), z, r: def.hound ? 4 : 5, run: def.run, walk: def.walk, sneak: def.walk, climb: !!def.quick, climbMax: def.quick ? 40 : 14, hopMax: 48 });
  Object.assign(g, { i, d, def, type: d.type, tag: d.tag || null, hp: def.hp, mode: d.mode || (d.route ? 'patrol' : 'post'), z0: z, home: { x: g.x, y: g.y }, dead: false, stun: 0, sleep: 0, poison: 0, blind: 0, limp: 0,
    mind: new E.Suspicion({ rise: 1.6, decay: .25, forget: 7 }), wait: 0, at: 1, route: (d.route || []).map(p => [cc(p[0]), cc(p[1])]), flow: null, goal: null, goalKey: '',
    swing: new E.Attack(def.move === 'thrust' ? 'thrust' : def.move === 'bite' ? 'thrust' : 'slash', { wind: def.wind || .4, recover: .3, reach: def.hound ? 8 : 10 }), swingT: 0, bark: 0, barkCool: 0, gaze: 0, eat: null,
    rig: guardRig(def, d), civ: !!def.civ, alerted: false, state0: 'calm', screamed: false, found: false, hidden: false, sunk: 0, home0: z });
  g.flow = new E.FlowField(S.map, { climb: def.quick ? 40 : 0, drop: 56, jump: def.quick ? 60 : 0 });
  g.facing = d.route && d.route[1] ? Math.atan2(cc(d.route[1][1]) - g.y, cc(d.route[1][0]) - g.x) : (i * 1.9) % TAU;
  if (g.mode === 'sleep') g.sleep = 1e9;
  return g;
}
function guardGoal(g, goal, dt, speed) {
  // walk a flow field toward goal ({x, y}); speed 0..1 of run
  const key = Math.floor(goal.x / T) + ',' + Math.floor(goal.y / T);
  if (key !== g.goalKey) { g.goalKey = key; g.flow.update(goal.x, goal.y); }
  const nx = g.flow.next(g.x, g.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - g.x, ty - g.y) || 1;
  let move = [0, 0], jump = false;
  if (Math.hypot(goal.x - g.x, goal.y - g.y) > 5) move = [(tx - g.x) / l * speed, (ty - g.y) / l * speed];
  if (nx && g.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < g.r + 4) jump = true;
  return { move, jumpPressed: jump };
}
function barkOf(g, cat, force) {
  if (g.barkCool > 0 && !force) return;
  const lines = B.BARKS[cat]; if (!lines) return;
  const t = g.def.quick && cat === 'alert' ? pickOf(B.BARKS.ninja) : pickOf(lines);
  g.bark = 2.2; g.barkText = t; g.barkCool = 2.5;
  B.babble(g.def.bark === 'kanemori' ? 'kanemori' : g.civ ? 'civil' : 'guard', t, .55);
}
const heroSeenBy = (g) => {
  if (!S.hero || S.hero.hidden) return { seen: false, exposure: 0 };
  const range = g.def.sight * B.tune.sight * (S.alarm > 0 ? 1.25 : 1) * (g.def.hound ? 1 : 1), fov = g.def.fov * B.tune.fov;
  const r = E.sees(g, S.hero, { map: S.map, range, fov });
  if (r.seen && (smokeAt(g.x, g.y) || smokeAt(S.hero.x, S.hero.y))) return { seen: false, exposure: 0 };
  return r;
};
function smokeAt(x, y) { for (const t of S.things) if (t.type === 'smoke' && Math.hypot(t.x - x, t.y - y) < t.r) return true; return false; }

function noise(x, y, z, loud, who) {
  if (!S) return;
  for (const g of S.guards) {
    if (g.dead || g.sleep > 0 || g.stun > 0 || g.civ && g.def.disguise) continue;
    const h = E.hears(g, { x, y, z, loud: loud * B.tune.hearing }, S.map);
    if (h > .2 && g.mind.state !== 'alert') { g.mind.hear(h, { x, y, z }); if (g.mind.state === 'notice') barkOf(g, 'notice'); }
  }
}
B.noise = noise;

function updateGuard(g, dt) {
  const hero = S.hero, def = g.def, I = game.input;
  g.barkCool -= dt; if (g.bark > 0) g.bark -= dt;
  if (g.dead) return;
  if (g.mind.state === 'calm') g.limp = Math.max(0, g.limp - dt);
  g.mind.rise = 1.6 * B.tune.rise * (def.quick ? 1.3 : 1) * (S.cloak > 0 ? .15 : 1) * (g.civ ? .6 : 1); g.mind.forget = B.tune.forget;
  const spd = B.tune.guardSpeed * (g.limp > 0 ? .5 : 1);
  g.run = def.run * spd; g.walk = def.walk * spd;
  if (g.poison > 0) { g.poison -= dt; if (g.poison <= 0) { killGuard(g, 'poison'); return; } }
  if (g.stun > 0) { g.stun -= dt; g.update(dt, S.map, { move: [0, 0] }); return; }
  if (g.sleep > 0) { g.sleep -= dt; if (rnd() < dt * .3) noise(g.x, g.y, g.z, 20); g.update(dt, S.map, { move: [0, 0] }); return; }
  if (g.blind > 0) { g.blind -= dt; g.mind.level = Math.min(g.mind.level, .6); g.update(dt, S.map, { move: [0, 0] }); return; }
  // disguised ninja: a servant until the hero is close
  if (def.disguise && !g.revealed && dist2(g, hero) < 26 && E.sameLevel(g, hero, 14)) revealDisguise(g);
  // caltrops
  for (const t of S.things) if (t.type === 'caltrops' && t.t > 0 && Math.hypot(t.x - g.x, t.y - g.y) < t.r && g.z < 2) { t.t = Math.min(t.t, 3); g.stun = 1.2; g.limp = 6; g.hp -= 6 * B.tune.toolPower; game.hitFx(g.x, g.y, 6, { power: .4, damage: 6 }); if (g.hp <= 0) { killGuard(g, 'tool'); return; } }
  // bait
  if (g.eat) { updateEat(g, dt); return; }
  if (!g.civ || g.revealed) for (const t of S.things) if (t.type === 'bait' && !t.eaten && g.mind.state === 'calm' && Math.hypot(t.x - g.x, t.y - g.y) < (def.hound ? 120 : 80) && S.map.los(g.x, g.y, t.x, t.y)) { g.eat = { t, timer: 0, stage: 'go' }; barkOf(g, 'bait', true); break; }
  if (g.eat) return;
  // eyes and mind
  let seen = g.civ && !g.revealed ? { seen: false, exposure: 0 } : heroSeenBy(g);
  if (S.auto) seen = { seen: false, exposure: 0 };
  const before = g.mind.state, st = g.mind.update(dt, seen, hero);
  if (g.mind.changed) onMindChange(g, before, st);
  // bodies
  if (!g.civ || true) for (const b of S.guards) if (b.dead && !b.hidden && !b.found && dist2(g, b) < 70 && Math.abs(E.angDiff(g.facing, Math.atan2(b.y - g.y, b.x - g.x))) < g.def.fov / 2 && S.map.los(g.x, g.y, b.x, b.y) && !smokeAt(g.x, g.y)) {
    b.found = true; S.events.push({ type: 'body', x: b.x, y: b.y });
    if (g.civ && !g.revealed) screamCiv(g); else { g.mind.level = Math.max(g.mind.level, .72); g.mind.last = { x: b.x, y: b.y, z: b.z }; barkOf(g, 'body', true); S.bodiesFound++; if (g.mind.state === 'calm') g.mind.update(0, { seen: false, exposure: 0 }, hero); }
  }
  // civilians flee and scream
  if (g.civ && !g.revealed) { civilThink(g, dt); return; }
  const stNow = g.mind.state;
  let intent = { move: [0, 0] };
  const d = dist2(g, hero), close = d < (def.hound ? 14 : 20) && E.sameLevel(g, hero, 12);
  if (def.ranged) { archerThink(g, dt, stNow, d); return; }
  if (stNow === 'alert') {
    g.alerted = true;
    if (close && !g.swing.busy && !(hero.action) && !S.hero.hidden) { g.facing = Math.atan2(hero.y - g.y, hero.x - g.x); g.swing.start(); A.sfx('swing', { vol: .4 }); }
    const began = g.swing.update(dt);
    if (g.swing.busy) { g.update(dt, S.map, { move: [0, 0] }); if (began === 'active') strikeHero(g); return; }
    intent = guardGoal(g, hero, dt, 1);
  } else if (stNow === 'search' && g.mind.last) {
    g.swing.update(dt);
    intent = guardGoal(g, g.mind.last, dt, .85);
  } else if (stNow === 'notice') {
    g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, S.map, { move: [0, 0] }); return;
  } else {
    g.swing.update(dt);
    if (g.mode === 'patrol' && g.route.length) {
      if (g.wait > 0) { g.wait -= dt; g.gaze += dt; g.facing += Math.sin(g.gaze * 2) * dt * .8; g.update(dt, S.map, { move: [0, 0] }); return; }
      const p = g.route[g.at % g.route.length];
      if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) { g.at = (g.at + 1) % g.route.length; g.wait = .7 + rnd() * .6; if (rnd() < .2) barkOf(g, 'idle'); }
      intent = guardGoal(g, { x: p[0], y: p[1] }, dt, .5);
    } else {
      // a post: sweep the gaze
      g.gaze += dt; const back = Math.hypot(g.home.x - g.x, g.home.y - g.y);
      if (back > 8) intent = guardGoal(g, g.home, dt, .5);
      else { g.facing += Math.sin(g.gaze * .8) * dt * .6; g.update(dt, S.map, { move: [0, 0] }); if (rnd() < dt * .04) barkOf(g, 'idle'); return; }
    }
  }
  if (intent.move[0] || intent.move[1]) g.facing = E.approachAng(g.facing, Math.atan2(intent.move[1], intent.move[0]), dt * 10);
  g.update(dt, S.map, intent);
  if (inWater(g)) { g.vx *= .5; g.vy *= .5; }
}
function onMindChange(g, before, st) {
  if (st === 'alert') {
    A.sfx('select', { vol: .6 }); barkOf(g, 'alert', true);
    if (!g.alerted && !S.alertLatch) { S.detected++; S.alertLatch = true; toast('Spotted!', 'You were seen.', 2); }
    if (S.m.bell && !S.bellRunner && S.alarm <= 0 && S.bells < 3 && !g.civ) S.bellRunner = { g, t: 3 };
    if (g.def.quick) { /* a Red Lantern shouts a taunt */ }
  } else if (st === 'search') barkOf(g, 'search');
  else if (st === 'notice') barkOf(g, 'notice');
  else if (st === 'calm' && (before === 'alert' || before === 'search')) barkOf(g, 'lost', true);
}
function strikeHero(g) {
  const hero = S.hero;
  if (S.auto || !E.inArc(g, g.facing, hero, g.def.hound ? 16 : 22, 1.2, 12) || (hero.action && hero.action.invulnerable) || S.god) return;
  hurtHero(g.def.dmg * B.tune.enemyDamage, g);
}
function hurtHero(dmg, from) {
  const hero = S.hero, I = game.input;
  if (S.god || S.over) return;
  if (S.hurtT > .3 && from) return;
  if (I.down('block') && !hero.action && from && S.blockOK) {
    S.hp -= dmg * .2; A.sfx('hit', { vol: .5 }); P.sparks(hero.x, hero.y, hero.z + 16, 6, (from.facing || 0) + Math.PI); if (S.hp <= 0) heroDown(); return;
  }
  S.hp -= dmg; S.hurtT = .4; S.damageTaken += dmg; game.hitFx(hero.x, hero.y, hero.z + 16, { power: 1, angle: from ? from.facing : 0, sound: 'hurt' });
  if (from && from.x !== undefined) E.knockback(from, hero, 110);
  game.input.rumble(.6, .2);
  if (S.hp <= 0) heroDown();
}
function heroDown() {
  if (S.over || S.god) { S.hp = Math.max(1, S.hp); return; }
  S.over = 'dead'; A.music(null); A.sfx('die'); S.hero.dead = true;
  game.after(1.2, () => B.missionFail());
}
function killGuard(g, how, byAction) {
  if (g.dead) return;
  g.dead = true; g.deathHow = how; S.kills++;
  if (g.civ && !g.def.target && !g.revealed) { S.civHarm++; toast('A townsperson fell', 'Harming the innocent costs you dearly.', 2.5); }
  if (g.tag === S.m.bossTag) { }
  if (g.tag === 'kanemori' && how !== 'poison') { say('kanemori', B.STORY.kanemoriFear); }
  if (S.bellRunner && S.bellRunner.g === g) S.bellRunner = null;
  S.events.push({ type: 'kill', x: g.x, y: g.y });
  const o = S.m.objectives.find(o => o.kind === 'killtag' && o.tag === g.tag); if (o) completeObj(o.id);
  if (how === 'poison') { A.sfx('die', { vol: .5 }); barkOf(g, 'ill', true); }
}
function revealDisguise(g) {
  g.revealed = true; g.civ = false; const nd = B.ENEMY.ninja; g.def = nd; g.hp = nd.hp; g.rig = guardRig(nd, g.d); g.run = nd.run; g.walk = nd.walk;
  g.swing = new E.Attack('slash', { wind: nd.wind, recover: .3, reach: 10 }); g.mind.level = 1.1; g.mind.last = { x: S.hero.x, y: S.hero.y, z: S.hero.z };
  barkOf(g, 'alert', true); toast('A servant was a Red Lantern!', 'Only Ki Focus shows their red aura.', 2.5);
}
function screamCiv(g) {
  if (g.screamed) return; g.screamed = true; barkOf(g, 'civil', true); noise(g.x, g.y, g.z, 160); A.sfx('hurt', { vol: .5, pitch: 1.8 });
  g.mind.level = 1.1; S.screams++;
}
function civilThink(g, dt) {
  const hero = S.hero;
  if (g.screamed) {
    // run toward the nearest guard
    let best = null, bd = 1e9; for (const o of S.guards) if (!o.dead && !o.civ && !o.def.ranged) { const d = dist2(g, o); if (d < bd) { bd = d; best = o; } }
    if (best && bd > 30) { const it = guardGoal(g, best, dt, 1); g.facing = Math.atan2(it.move[1], it.move[0]); g.update(dt, S.map, it); } else g.update(dt, S.map, { move: [0, 0] });
    return;
  }
  // a civilian sees what the hero does: a cut or a body in view
  for (const e of S.events) if ((e.type === 'cut' || e.type === 'kill') && Math.hypot(e.x - g.x, e.y - g.y) < 90 && S.map.los(g.x, g.y, e.x, e.y)) { screamCiv(g); return; }
  const seen = E.sees(g, hero, { map: S.map, range: 40, fov: 2 });
  if (seen.seen && (S.hero.dragging || S.hero.drawn)) { screamCiv(g); return; }
  if (g.mode === 'patrol' && g.route.length) {
    const p = g.route[g.at % g.route.length]; if (Math.hypot(p[0] - g.x, p[1] - g.y) < 8) g.at++;
    const it = guardGoal(g, { x: p[0], y: p[1] }, dt, .4); g.facing = Math.atan2(it.move[1], it.move[0]); g.update(dt, S.map, it);
  } else { g.gaze += dt; g.facing += Math.sin(g.gaze) * dt * .3; g.update(dt, S.map, { move: [0, 0] }); }
}
function updateEat(g, dt) {
  const e = g.eat, t = e.t;
  if (e.stage === 'go') {
    const it = guardGoal(g, t, dt, .6); g.facing = Math.atan2(t.y - g.y, t.x - g.x); g.update(dt, S.map, it);
    if (Math.hypot(t.x - g.x, t.y - g.y) < 8) { e.stage = 'eat'; e.timer = 0; }
    if (g.mind.state !== 'calm') g.eat = null;
  } else if (e.stage === 'eat') {
    g.update(dt, S.map, { move: [0, 0] }); e.timer += dt; if (Math.floor(e.timer * 4) % 2 === 0 && rnd() < .1) A.sfx('eat', { vol: .3 });
    if (e.timer > 2) {
      t.eaten = true; t.t = 0; g.eat = null; A.sfx('eat');
      if (t.kind === 'poison') { g.poison = 3; g.mind.level = 0; barkOf(g, 'ill', true); toast('Poisoned', 'A clean one: he will not finish dinner.', 2); }
      else { g.sleep = 25; barkOf(g, 'sleepy', true); toast('Sleeping', 'A front Silent Cut will work now.', 2); }
    }
    if (g.mind.state === 'alert') g.eat = null;
  }
}
function archerThink(g, dt, st, d) {
  const hero = S.hero;
  if (st === 'alert' || st === 'search') {
    g.facing = E.approachAng(g.facing, Math.atan2(hero.y - g.y, hero.x - g.x), dt * 5);
    const los = S.map.ray({ x: g.x, y: g.y, z: g.z }, { x: hero.x, y: hero.y, z: hero.z }).clear;
    if (st === 'alert' && los && d < 150) {
      if (!g.draw) g.draw = .0; g.draw += dt;
      if (g.draw > g.def.wind * (S.alarm > 0 ? .8 : 1)) {
        g.draw = 0; const a = Math.atan2(hero.y - g.y, hero.x - g.x); A.sfx('shoot', { vol: .4, pitch: 1.4 });
        S.things.push({ type: 'arrow', x: g.x, y: g.y, z: g.z + 22, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, vz: 0, t: 1.6, from: g });
      }
    } else g.draw = 0;
  } else { g.draw = 0; g.gaze += dt; g.facing += Math.sin(g.gaze * .7) * dt * .5; }
  g.update(dt, S.map, { move: [0, 0] });
}
function tickBell(dt) {
  if (S.alarm > 0) { S.alarm -= dt; if (S.alarm <= 0) { toast('The bell falls silent', 'The garrison relaxes.', 2); A.layer('alarm', 0, 2); } }
  if (S.bellRunner) {
    const br = S.bellRunner; br.t -= dt;
    if (br.g.dead || br.g.stun > 0 || br.g.sleep > 0) S.bellRunner = null;
    else if (br.t <= 0) {
      S.bellRunner = null; S.alarm = B.tune.bellTime; S.bells++; A.sfx('bell'); A.sfx('bell', { pitch: .8 }); toast('The alarm bell!', 'Reinforcements are on their way.', 3);
      A.layer('alarm', 1, .5);
      for (const p of S.m.reinforce || []) if (S.reinforced < 2) { const d = { type: 'ashigaru', at: p, mode: 'post' }; const g = makeGuard(d, S.guards.length); g.mind.level = 1.1; g.mind.last = { x: S.hero.x, y: S.hero.y, z: 0 }; S.guards.push(g); }
      S.reinforced++;
      for (const g of S.guards) if (!g.dead && !g.civ && g.mind.state === 'calm') { g.mind.level = Math.max(g.mind.level, .7); g.mind.last = { x: S.hero.x, y: S.hero.y, z: 0 }; }
    }
  }
}
