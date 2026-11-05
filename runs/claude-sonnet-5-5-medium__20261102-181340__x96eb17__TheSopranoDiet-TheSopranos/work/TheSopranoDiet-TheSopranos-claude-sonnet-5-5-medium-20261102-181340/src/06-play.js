/* the play scene: world, hero, enemies, items, interaction, camera, HUD */
(() => {
const G = SD, E = G.E, game = G.game, { px, clamp } = E;
const W = G.W = { A: null, hero: null, enemies: [], pickups: [], npcs: [], inter: [], ghosts: {}, demo: false, round: false, busy: false, cut: false, boss: null,
  talk: null, shots: null, flow: null, rigs: {}, black: 0, areaTime: 0, fade: 0, noHud: false, hubGo: false };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const rnd = (a, b) => a + Math.random() * (b - a);
W.rnd = rnd;

/* ---------------- dialog helpers (used by the story scripts) ---------------- */
W.line = (name, text, o) => {
  const t = W.talk; G.setVoice(t, name);
  t.say(text, Object.assign({ name, portrait: W.portrait(name) }, o || {}));
  return E.until(() => !t.open);
};
W.ask = function* (name, text, choices) {
  let pick = -1; const t = W.talk; G.setVoice(t, name);
  t.say(text, { name, portrait: W.portrait(name), choices, onChoice: i => { pick = i; } });
  yield E.until(() => !t.open);
  return pick < 0 ? choices.length - 1 : pick;
};
W.convo = function* (list) { for (const [n, t] of list) yield W.line(n, t); };
W.portrait = name => {
  if (name === 'DUCK') return (g, x, y, s) => { px.rect(g, x, y, s, s, '#27405a'); px.disc(g, x + s / 2, y + s / 2 + 2, s / 3, '#f2d24a'); px.disc(g, x + s / 2 - 5, y + s / 2 - 1, 2, '#111'); px.disc(g, x + s / 2 + 5, y + s / 2 - 1, 2, '#111'); px.poly(g, [[x + s / 2 - 5, y + s / 2 + 5], [x + s / 2 + 5, y + s / 2 + 5], [x + s / 2, y + s / 2 + 10]], '#f08a28'); };
  const key = { TOMMY: 'tommy', CARM: 'carm', 'DR. MEL-FEE': 'melfee', GINO: 'gino', STELLA: 'stella', MARIA: 'maria', PAULY: 'pauly', VINNY: 'vinny', SLAVKO: 'slavko', ANTHONY: 'anthony', MEADOW: 'meadow', WAITER: 'waiter' }[name];
  if (!key) return null;
  if (!W.rigs[key]) W.rigs[key] = key === 'tommy' && W.hero ? W.hero.rig : G.makeRig(key);
  return W.rigs[key];
};
W.script = gen => game.script(function* () { W.busy = true; try { yield* gen(); } finally { W.busy = false; } });

/* ---------------- hero ---------------- */
const newHero = (x, y) => ({
  body: new E.Body({ x, y, r: 5 }), rig: G.makeRig('tommy'), facing: Math.PI / 2, combo: new E.Combo(['jab', 'cross', 'hook', 'haymaker'], { window: .42 }),
  dodge: 0, inv: 0, hurt: 0, panic: 0, kx: 0, ky: 0, look: 0, slot: 0, eatT: 0, step: 0, moving: false, dodgeDir: [0, 1], aim: null
});
W.newHero = newHero;

const solidsPush = b => {
  for (const s of W.A.solids) {
    const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy), m = s.r + b.r;
    if (d < m && d > .001) { b.x = s.x + dx / d * m; b.y = s.y + dy / d * m; }
  }
};

/* ---------------- enemies ---------------- */
W.spawn = (kind, x, y, o) => {
  const k = G.EN[kind], e = Object.assign({ kind, k, body: new E.Body({ x, y, r: kind === 'boss' ? 8 : kind === 'bruiser' ? 7 : 5 }), rig: G.makeRig(k.rig), hp: k.hp * (G.S.perks.includes('x') ? 1 : 1), max: k.hp,
    state: 'idle', t: 0, cool: rnd(.3, 1), facing: Math.PI / 2, att: new E.Attack(k.move || 'jab', { wind: k.wind }), stun: 0, flash: 0, kx: 0, ky: 0, dead: false, fade: 0, alert: !!(o && o.alert), tele: 0, bossT: 3, dashDir: null, phase: 0 }, o || {});
  if (kind === 'boss') W.boss = e;
  W.enemies.push(e); return e;
};
W.aliveCount = () => W.enemies.filter(e => !e.dead).length;

const dropFor = e => {
  const cash = Math.round(rnd(e.k.cash[0], e.k.cash[1]));
  W.pickups.push({ x: e.body.x + rnd(-6, 6), y: e.body.y + rnd(-6, 6), kind: 'cash', v: cash, t: 0 });
  if (Math.random() < (e.k.heavy ? .6 : .18)) { const f = Math.random() < .5 ? 'salad' : Math.random() < .5 ? 'cannoli' : 'capicola'; W.pickups.push({ x: e.body.x + rnd(-8, 8), y: e.body.y + rnd(-8, 8), kind: f, v: 1, t: 0 }); }
};

W.hurtEnemy = (e, dmg, ang, power) => {
  if (e.dead) return;
  const S = G.S;
  e.hp -= dmg; e.flash = .12; e.alert = true; if (e.state === 'idle') e.state = 'chase';
  if (!e.k.boss) { e.stun = e.k.heavy ? .18 : .32; if (e.state === 'wind' || e.state === 'aim') { e.state = 'chase'; e.att.cancel && e.att.cancel(); } }
  const kb = (e.k.heavy ? 70 : 140) * (power || 1); e.kx = Math.cos(ang) * kb; e.ky = Math.sin(ang) * kb;
  game.hitFx(e.body.x, e.body.y, 16, { power: power || 1, angle: ang, damage: Math.round(dmg) });
  S.menace = Math.min(100, S.menace + 7);
  if (e.hp <= 0) {
    e.dead = true; e.state = 'down'; e.t = 0; S.kills++; S.respect += e.k.resp; G.checkRank && G.checkRank();
    dropFor(e); game.particles.bits(e.body.x, e.body.y, 12, 8, ['#c23a3a', '#e8d8a0']); game.audio.sfx('stomp');
    if (e.k.boss) { game.freeze(.3); game.flash('#ffffff', .25); }
  }
};

W.hurtHero = (dmg, srcPos) => {
  const S = G.S, H = W.hero;
  if (!H || H.inv > 0 || W.demo || W.cut || (W.hubGo === false && G.HUB)) return;
  const amt = dmg * (S.perks.includes('thick') ? .85 : 1) * (1 + S.gut / 400);
  S.hp -= amt; H.inv = .55; H.hurt = .28;
  S.stress = Math.min(100, S.stress + (S.perks.includes('breath') ? 3 : 6));
  if (srcPos) { const a = angTo(srcPos, H.body); H.kx = Math.cos(a) * 110; H.ky = Math.sin(a) * 110; }
  game.hitFx(H.body.x, H.body.y, 16, { power: .9, damage: Math.round(amt), color: '#ff6a6a', sound: 'hurt' });
  game.audio.sfx('hurt');
  if (S.hp <= 0) { S.hp = 0; G.defeat(); }
};

G.defeat = () => {
  if (W.defeated) return; W.defeated = true;
  if (G.HUB) { W.respawn = 3; W.cut = true; G.S.cash = Math.round(G.S.cash * .85); G.S.hp = G.maxHp() * .6; G.toast('Whacked!', 'Back on your feet in a moment (-15% cash)', '#ff8a8a'); return; }
  game.after(.9, () => game.go('over', { area: G.S.area }, { fade: 'black' }));
  W.cut = true; W.hero.rig.update(0, { pose: 'down' });
};

/* ---------------- items ---------------- */
W.eat = which => {
  const S = G.S, H = W.hero, names = Object.keys(G.FOOD);
  const key = which || names[H.slot];
  if (!S.bag[key]) { game.audio.sfx('cancel'); G.toast('None left', G.FOOD[key].name, '#ff9a8a'); return false; }
  const f = G.FOOD[key]; S.bag[key]--; S.eaten++;
  S.hp = Math.min(G.maxHp(), S.hp + f.hp * (key === 'salad' && S.perks.includes('light') ? 1.6 : 1));
  S.gut = clamp(S.gut + f.gut * (key === 'salad' && S.perks.includes('light') ? 1.5 : 1), 0, 100);
  S.stress = clamp(S.stress + f.stress, 0, 100); H.eatT = .5;
  game.audio.sfx('munch'); game.audio.sfx('heal'); game.particles.glints(H.body.x, H.body.y, 24, 6, key === 'salad' ? '#8ad06a' : '#ffd36a');
  G.toast(f.name, f.verb); return true;
};
W.gain = (cash, resp, label) => {
  const S = G.S; S.cash += cash; S.respect += resp || 0; if (cash) game.audio.sfx('cash');
  if (label) G.toast(label, (cash ? '+' + G.fmt(cash) + '  ' : '') + (resp ? '+' + resp + ' respect' : ''), '#9be58a');
  G.checkRank();
};
G.checkRank = () => {
  const r = G.rank(); if (r > (W.lastRank == null ? r : W.lastRank)) { game.audio.sfx('rank'); G.toast('Promoted: ' + G.RANKS[r], 'Max health up. Menace respected.', '#ffd36a'); G.S.hp = Math.min(G.maxHp(), G.S.hp + 20); }
  W.lastRank = r;
};

/* ---------------- interaction ---------------- */
const nearInter = () => {
  const H = W.hero.body; let best = null, bd = 1e9;
  for (const it of W.inter) {
    if (it.show && !it.show()) continue;
    const d = Math.hypot(it.x - H.x, it.y - H.y);
    if (d < (it.r || 24) && d < bd) { best = it; bd = d; }
  }
  return best;
};
W.nearInter = nearInter;

/* ---------------- controls (real input or the attract-mode autopilot) ---------------- */
const readCtl = () => {
  const inp = game.input, m = inp.move();
  const c = { mx: m[0], my: m[1], attack: inp.buffered('attack', .18), dash: inp.pressed('dash'), skill: inp.pressed('skill'), interact: inp.pressed('interact') || inp.pressed('confirm'), eat: inp.pressed('eat'), next: inp.pressed('next'), view: inp.pressed('view'), click: null };
  const ck = inp.clicked && inp.clicked(); if (ck && inp.lastDevice === 'mouse') c.click = ck;
  return c;
};

/* ---------------- scene ---------------- */
const lastBy = {};
let hudT = 0;

const play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'wide', expand: true, input: undefined, camera: { zoom: [.7, 2.2], start: 1 },
  enter(data) {
    data = data || {};
    const S = G.S;
    W.transition = false; W.demo = !!data.demo; W.round = !!data.round; W.defeated = false; W.cut = false; W.busy = false; W.boss = null; W.black = 0; W.areaTime = 0; W.respawn = 0;
    if (data.fresh) { G.S = G.fresh(); W.lastRank = 0; }
    if (data.area) G.S.area = data.area;
    const Sx = G.S;
    const A = W.A = G.buildArea(Sx.area);
    W.flow = new E.FlowField(A.map);
    W.enemies = []; W.pickups = []; W.npcs = []; W.inter = []; W.rigs = {}; W.fx = [];
    W.shots = new E.Bullets(game, { plane: 'ground' });
    W.talk = new E.Dialog(game, { speed: 55, lines: 3 });
    const sp = data.spawn || A.spawn;
    W.hero = newHero(sp[0], sp[1]);
    W.hero.facing = data.facing != null ? data.facing : Math.PI / 2; W.hero.seated = false;
    if (W.lastRank == null) W.lastRank = G.rank();
    game.cam.bounds = v => A.map.bounds(v);
    game.cam.smooth = .12;
    game.lights.enabled = true; game.lights.ambient = A.ambient; game.lights.refresh && game.lights.refresh();
    game.weather = A.weather || null;
    game.particles.ground = null;
    G.music(A.name === 'woods' ? 'woods' : A.music);
    game.focus(sp[0], sp[1], 10);
    if (data.area !== undefined || true) W.setupArea && W.setupArea(A, data);
    if (Sx.hp <= 0) Sx.hp = G.maxHp() * .6;
    if (!W.demo && !W.round) G.autosave && G.autosave();
  },
  exit() { game.weather = null; W.cut = false; },

  update(dt) {
    const S = G.S, H = W.hero, A = W.A, b = H.body, inp = game.input;
    G.applySettings();
    G.hubTick && G.hubTick(dt);
    if (W.black > 0) { W.black = Math.min(1, W.black); }
    /* attract-mode: any real input ends it */
    if (W.demo) { G.demoCheckExit && G.demoCheckExit(); G.demoTick && G.demoTick(dt); }
    W.talk.update(dt);
    const talking = W.talk.open;
    if (talking) { if (W.demo) G.demoDialog(dt); H.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: H.facing }); }
    if (W.respawn > 0) { W.respawn -= dt; if (W.respawn <= 0) { W.defeated = false; W.cut = false; const sp = A.spawn; b.x = sp[0]; b.y = sp[1]; H.inv = 2; } }
    W.areaTime += dt;
    if (!talking) S.time += dt;
    const frozen = talking || W.cut || (G.HUB && W.hubGo === false);
    const c = W.demo ? G.demoCtl() : (frozen ? { mx: 0, my: 0 } : readCtl());

    /* camera view cycling and quick toggles */
    if (!W.demo && !talking && inp.pressed('view')) { game.nextView(); game.note('VIEW: ' + game.view.id.toUpperCase()); }

    if (!frozen) heroStep(dt, c);
    else { b.vx = 0; b.vy = 0; if (!talking) H.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: H.facing, pose: W.defeated && !G.HUB ? 'down' : H.seated ? 'kneel' : undefined }); }
    if (!talking) { worldStep(dt); }
    npcStep(dt);
    W.shots.update(dt, A.map);
    W.shots.hit([{ x: b.x, y: b.y, z: 12, r: 5 }], (bl) => { bl.life = 0; W.hurtHero(bl.dmg || 6, bl); }, 'enemy');
    G.storyTick && G.storyTick(dt);
    if (G.HUB) G.hubProgress && G.hubProgress(dt);
    /* camera */
    game.focus(b.x, b.y, 10);
    if (S.stress > 70 && !W.demo) game.shake && S.stress > 90 && Math.random() < .02 && game.shake(.8);
  },

  draw(r) {
    const A = W.A, H = W.hero, S = G.S, b = H.body;
    A.map.drawFloor(r);
    /* area lights */
    for (const l of A.lights) game.lights.add(l.x, l.y, l.z, l.r, l.i, { color: l.color });
    if (A.name === 'woods') game.lights.add(b.x, b.y, 18, 64, .6, { color: '#ffe0b0' });
    else game.lights.add(b.x, b.y, 18, 36, .35, { color: '#fff0d8' });
    r.shadow(b.x, b.y, 6, .45);
    A.map.queueWalls(r);
    for (const p of A.props) { if (p.n === '_box') r.queue(p.x, p.y, 0, g => r.box(g, p.x - p.w / 2, p.y - p.d / 2, p.z || 0, p.x + p.w / 2, p.y + p.d / 2, (p.z || 0) + p.h, p.top, p.side), { solid: true }); else r.prop(p.n, p.x, p.y, 0, p.o || {}); }
    for (const lb of A.labels) r.textAt(lb.x, lb.y, lb.z, lb.text, '#ffe9a8');
    G.drawWorld(r);
    W.shots.draw(r);
    r.overlay(g => G.drawHud(g, r));
    W.talk.draw(r);
  }
};

/* ---------------- hero step ---------------- */
function heroStep(dt, c) {
  const S = G.S, H = W.hero, b = H.body, A = W.A;
  H.inv = Math.max(0, H.inv - dt); H.hurt = Math.max(0, H.hurt - dt); H.look = Math.max(0, H.look - dt); H.eatT = Math.max(0, H.eatT - dt);
  const gutK = 1 - S.gut / 300;
  /* stress: ticks down slowly when calm, panic attack at 100 */
  if (W.aliveCount() === 0) S.stress = Math.max(0, S.stress - dt * (S.perks.includes('breath') ? 1.6 : .9));
  else S.stress = Math.min(100, S.stress + dt * .35);
  if (S.perks.includes('light')) S.gut = Math.max(0, S.gut - dt * .12);
  S.menace = Math.max(0, Math.min(100, S.menace - dt * .6));
  if (S.stress >= 100 && H.panic <= 0 && !W.demo) { H.panic = 3; S.panics++; game.audio.sfx('panic'); game.flash('#000000', .6, .7); G.toast('PANIC ATTACK', 'Breathe. Mash ' + (G.deviceKind() === 'key' ? 'E' : G.deviceKind() === 'mouse' ? 'E' : (G.xbox() ? 'A' : '✕')), '#ff8a8a'); }
  if (H.panic > 0) {
    H.panic -= dt; if (c.interact) { H.panic -= .35; game.audio.sfx('blip'); }
    b.vx = 0; b.vy = 0; b.update(dt, A.map);
    H.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: H.facing, pose: 'kneel', expr: 'wince' });
    if (H.panic <= 0) { S.stress = 55; G.toast('You pull yourself together', 'Stress 55', '#ffd36a'); }
    return;
  }
  /* dodge */
  if (c.dash && H.dodge <= 0 && !H.combo.busy) {
    const d = c.gdir && Math.hypot(c.gdir[0], c.gdir[1]) > .2 ? c.gdir : Math.hypot(c.mx, c.my) > .2 ? game.view.screenDirToGround(c.mx, c.my) : [Math.cos(H.facing), Math.sin(H.facing)];
    const L = Math.hypot(d[0], d[1]) || 1; H.dodgeDir = [d[0] / L, d[1] / L]; H.dodge = .3; H.inv = Math.max(H.inv, .34); game.audio.sfx('whoosh');
    game.particles.dust(b.x, b.y, 2, 5);
  }
  const m = [c.mx, c.my]; const d = c.gdir || game.view.screenDirToGround(m[0], m[1]);
  const sp = 82 * gutK * (H.combo.busy ? .35 : 1);
  H.moving = Math.hypot(d[0], d[1]) > .12;
  if (H.dodge > 0) { H.dodge -= dt; const k = 215 * gutK * Math.max(0, H.dodge / .3 + .25); b.vx = H.dodgeDir[0] * k; b.vy = H.dodgeDir[1] * k; }
  else { b.vx = d[0] * sp; b.vy = d[1] * sp; if (H.moving && !H.combo.busy) H.facing = Math.atan2(d[1], d[0]); }
  H.kx *= Math.pow(.02, dt); H.ky *= Math.pow(.02, dt); b.vx += H.kx; b.vy += H.ky;
  b.update(dt, A.map); solidsPush(b);
  /* footsteps */
  if (H.moving && H.dodge <= 0) { H.step += dt * 6; if (H.step > 1) { H.step = 0; game.audio.sfx('step', { vol: .25 }); } }
  /* mouse / right-stick aiming for attacks */
  const aim = aimAngle(c);
  /* attack */
  if (c.attack && H.dodge <= 0) {
    if (c.click && W.clickInteract(c.click)) { game.input.consume('attack'); }
    else {
      if (aim != null) H.facing = aim;
      if (H.combo.press()) { game.input.consume('attack'); game.audio.sfx('swing'); const f = H.facing; b.vx += Math.cos(f) * 30; b.vy += Math.sin(f) * 30; }
    }
  }
  const ph = H.combo.update(dt);
  if (ph === 'active') { game.audio.sfx('punch', { vol: .5 }); }
  const dmgs = [9, 10, 12, 20], step = Math.max(0, H.combo.step);
  const dmg = dmgs[step] * (1 + S.gut / 160) * (S.perks.includes('thick') ? 1.05 : 1) * (1 + G.rank() * .06);
  H.combo.hits(W.enemies.filter(e => !e.dead), e => E.inArc(b, H.facing, e.body, 25 + step * 2, 1.2, 14), e => {
    W.hurtEnemy(e, dmg, angTo(b, e.body), 1 + step * .25); game.input.rumble && game.input.rumble(.3, .1);
  });
  /* the Look */
  if (c.skill && S.menace >= 100 && H.look <= 0) {
    S.menace = 0; H.look = .9; game.audio.sfx('stare'); game.flash('#201018', .35, .5); game.particles.ring(b.x, b.y, 4, 70, '#ff4a4a', .5);
    for (const e of W.enemies) if (!e.dead && dist(e.body, b) < 80) { e.stun = e.k.boss ? 1.2 : 3.2; e.fear = true; e.hp -= e.k.boss ? 6 : 8; e.flash = .2; }
    S.stress = Math.max(0, S.stress - 12); G.toast('The Look', 'They remember who you are.', '#ff9a9a');
  } else if (c.skill && S.menace < 100) { game.audio.sfx('cancel'); }
  /* food */
  if (c.next) { H.slot = (H.slot + 1) % 3; game.audio.sfx('select'); }
  if (c.eat) W.eat();
  /* interact */
  if (c.interact && !W.busy) { const it = nearInter(); if (it) { game.audio.sfx('confirm'); it.act(); } }
  /* exits */
  for (const ex of A.exits) {
    if (b.x > ex.x0 && b.x < ex.x1 && b.y > ex.y0 && b.y < ex.y1) {
      if (ex.needs && !S.flags[ex.needs]) { if (!ex.warned || game.time - ex.warned > 2.5) { ex.warned = game.time; G.toast(ex.needs === 'yardDone' ? 'Not yet' : 'Locked', ex.needs === 'yardDone' ? 'Feed the ducks and hear Carm out first.' : 'Not today.', '#ff9a9a'); } if (ex.needs === 'yardDone') { b.y -= 3; } continue; }
      if (!W.busy && !W.transition) { W.transition = true; S.area = ex.to; game.go('play', { area: ex.to, spawn: ex.spawn, round: W.round, demo: W.demo }, { fade: 'iris', seconds: .45, at: { x: b.x, y: b.y, z: 10 } }); game.after(.6, () => { W.transition = false; }); }
    }
  }
  /* pickups */
  for (const p of W.pickups) {
    if (p.got) continue; p.t += dt;
    const dd = Math.hypot(p.x - b.x, p.y - b.y); if (dd < 22 && p.t > .3) { p.x += (b.x - p.x) * dt * 8; p.y += (b.y - p.y) * dt * 8; }
    if (dd < 9 && p.t > .3) {
      p.got = true;
      if (p.kind === 'cash') { S.cash += p.v; game.audio.sfx('coin'); game.particles.text(p.x, p.y, 18, '+$' + p.v, '#9be58a', { scale: 1 }); }
      else { S.bag[p.kind]++; game.audio.sfx('pickup'); G.toast('Picked up', G.FOOD[p.kind].name, '#ffd36a'); }
    }
  }
  W.pickups = W.pickups.filter(p => !p.got);
  H.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: b.vx, vy: b.vy, facing: H.facing, attack: H.combo.state, hurt: H.hurt > 0, flip: H.dodge > 0 ? 1 - H.dodge / .3 : 0, pose: H.look > 0 ? 'hips' : H.eatT > 0 ? 'cheer' : undefined, expr: H.look > 0 ? 'angry' : S.stress > 75 ? 'wince' : undefined, stance: undefined });
}

function aimAngle(c) {
  const inp = game.input, H = W.hero, b = H.body;
  if (W.demo) { let n = null, nd = 70; for (const e of W.enemies) if (!e.dead) { const dd = dist(e.body, b); if (dd < nd) { nd = dd; n = e; } } return n ? angTo(b, n.body) : null; }
  if (inp.lastDevice === 'gamepad' && inp.padAim && Math.hypot(inp.padAim[0], inp.padAim[1]) > .4) { const g = game.view.screenDirToGround(inp.padAim[0], inp.padAim[1]); return Math.atan2(g[1], g[0]); }
  if (inp.lastDevice === 'mouse') { const mg = game.mouseGround && game.mouseGround(); if (mg) return Math.atan2(mg[1] - b.y, mg[0] - b.x); }
  /* auto-aim on the nearest foe in front */
  let best = null, bd = 48;
  for (const e of W.enemies) { if (e.dead) continue; const dd = dist(e.body, b), a = angTo(b, e.body); if (dd < bd && Math.abs(E.angDiff ? E.angDiff(a, H.facing) : 0) < 1.3) { bd = dd; best = a; } }
  return best;
}
W.clickInteract = ck => {
  const mg = game.mouseGround && game.mouseGround(); if (!mg) return false;
  for (const it of W.inter) { if (it.show && !it.show()) continue; if (Math.hypot(it.x - mg[0], it.y - mg[1]) < 16 && Math.hypot(it.x - W.hero.body.x, it.y - W.hero.body.y) < (it.r || 24) + 14 && !W.busy) { it.act(); game.audio.sfx('confirm'); return true; } }
  return false;
};

/* ---------------- enemies, pickups, ghosts ---------------- */
function worldStep(dt) {
  const A = W.A, H = W.hero, hb = H.body;
  W.flow.update(hb.x, hb.y);
  const alive = W.enemies.filter(e => !e.dead);
  for (const e of W.enemies) {
    const b = e.body; e.flash = Math.max(0, e.flash - dt);
    if (e.dead) { e.t += dt; e.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: e.facing, pose: 'down', down: Math.min(1, e.t * 3) }); continue; }
    const dx = hb.x - b.x, dy = hb.y - b.y, d = Math.hypot(dx, dy) || 1, k = e.k;
    e.cool = Math.max(0, e.cool - dt); e.t += dt;
    e.kx *= Math.pow(.03, dt); e.ky *= Math.pow(.03, dt);
    let mvx = 0, mvy = 0, spd = k.spd * (e.phase ? 1.3 : 1);
    if (e.stun > 0) { e.stun -= dt; if (e.stun <= 0) e.fear = false; }
    else {
      switch (e.state) {
        case 'idle': if (d < k.aggro || e.alert) e.state = 'chase'; break;
        case 'chase': {
          e.facing = Math.atan2(dy, dx);
          const dir = (e.k.ranged ? (d > 110 ? W.flow.dir(b.x, b.y, hb.x, hb.y) : d < 62 ? [-dx / d, -dy / d] : [0, 0]) : (d > k.reach * .8 ? W.flow.dir(b.x, b.y, hb.x, hb.y) : [0, 0]));
          mvx = dir[0] * spd; mvy = dir[1] * spd;
          if (k.ranged) { if (d < 140 && e.cool <= 0 && E.sameLevel(b, hb) !== false && A.map.los(b.x, b.y, hb.x, hb.y)) { e.state = 'aim'; e.t = 0; game.audio.sfx('charge', { vol: .4 }); } }
          else if (k.boss) bossThink(e, d, dx, dy);
          else if (d < k.reach + 4 && e.cool <= 0) { e.state = 'wind'; e.t = 0; e.att.start(); }
          break;
        }
        case 'wind': {
          e.facing = Math.atan2(dy, dx); mvx = Math.cos(e.facing) * 10; mvy = Math.sin(e.facing) * 10;
          const ph = e.att.update(dt);
          e.att.hits([hb], t => E.inArc(b, e.facing, t, k.reach + 9, 1.0), () => W.hurtHero(k.dmg, b));
          if (!e.att.busy) { e.state = 'chase'; e.cool = rnd(.9, 1.7) * (e.phase ? .7 : 1); }
          break;
        }
        case 'aim': {
          e.facing = Math.atan2(dy, dx);
          if (e.t > .6) {
            const sp = 120, a = e.facing;
            W.shots.fire({ x: b.x + Math.cos(a) * 8, y: b.y + Math.sin(a) * 8, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2, team: 'enemy', color: '#ffd060', life: 1.8, dmg: k.dmg });
            game.audio.sfx('gunshot', { vol: .35 }); game.particles.sparks(b.x + Math.cos(a) * 9, b.y + Math.sin(a) * 9, 14, 4, a);
            e.state = 'chase'; e.cool = rnd(1.6, 2.6);
          }
          break;
        }
        case 'charge': {
          mvx = e.dashDir[0] * 230; mvy = e.dashDir[1] * 230; e.facing = Math.atan2(e.dashDir[1], e.dashDir[0]);
          if (d < 14) W.hurtHero(k.dmg * 1.4, b);
          if (e.t > .55 || b.hitWall) { e.state = 'chase'; e.cool = 1.2; game.particles.dust(b.x, b.y, 2, 8); }
          break;
        }
        case 'chargeWind': { e.facing = Math.atan2(dy, dx); if (e.t > .75) { e.state = 'charge'; e.t = 0; const a = e.facing; e.dashDir = [Math.cos(a), Math.sin(a)]; game.audio.sfx('whoosh'); } break; }
        case 'blast': {
          e.facing = Math.atan2(dy, dx);
          if (e.t > .8) {
            const a = e.facing, n = e.phase ? 7 : 5;
            for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * .17; W.shots.fire({ x: b.x, y: b.y, z: 16, vx: Math.cos(aa) * 105, vy: Math.sin(aa) * 105, r: 2.5, team: 'enemy', color: '#ff7a3a', life: 2, dmg: 9 }); }
            game.audio.sfx('gunshot'); game.shake(.8); e.state = 'chase'; e.cool = 1.4;
          }
          break;
        }
      }
    }
    if (e.fear && e.stun > 0) { mvx = 0; mvy = 0; }
    b.vx = mvx + e.kx; b.vy = mvy + e.ky;
    b.update(dt, A.map); solidsPush(b);
    for (const o of alive) if (o !== e) { const ox = b.x - o.body.x, oy = b.y - o.body.y, od = Math.hypot(ox, oy), m = 11; if (od < m && od > .01) { b.x += ox / od * (m - od) * .3; b.y += oy / od * (m - od) * .3; } }
    const flashing = e.flash > 0 || (e.state === 'wind' && e.t < (e.k.wind || .4)) || e.state === 'aim' || e.state === 'chargeWind' || e.state === 'blast';
    e.tele = flashing && e.flash <= 0 ? 1 : 0;
    e.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: mvx, vy: mvy, facing: e.facing, attack: e.state === 'wind' ? e.att.state : null, hurt: e.stun > 0 && !e.fear, point: e.state === 'aim' || e.state === 'blast', pose: e.fear ? 'guard' : undefined, expr: e.state === 'wind' || e.state === 'chargeWind' ? 'shout' : e.fear ? 'wince' : undefined });
  }
  /* corpses fade away */
  W.enemies = W.enemies.filter(e => !(e.dead && e.t > 2.2));
  if (W.boss && W.boss.dead && !W.bossHandled) { W.bossHandled = true; G.bossDown && G.bossDown(); }
}

function bossThink(e, d, dx, dy) {
  const phase = e.hp < e.max * .5 ? 1 : 0; if (phase && !e.phase) { e.phase = 1; game.audio.sfx('stare'); game.flash('#ff2a2a', .25, .4); G.toast('SLAVKO IS ANGRY', 'He is faster now.', '#ff8a8a'); G.music('boss'); }
  e.bossT -= 1 / 120;
  if (d < e.k.reach + 6 && e.cool <= 0) { e.state = 'wind'; e.t = 0; e.att = new E.Attack(Math.random() < .5 ? 'haymaker' : 'sweep', { wind: phase ? .38 : .55 }); e.att.start(); return; }
  if (e.bossT <= 0) {
    e.bossT = phase ? rnd(1.6, 2.8) : rnd(2.4, 3.8);
    if (Math.random() < .5 || d > 90) { e.state = 'chargeWind'; e.t = 0; game.audio.sfx('charge'); }
    else { e.state = 'blast'; e.t = 0; game.audio.sfx('charge'); }
  }
}

/* ---------------- NPC upkeep ---------------- */
function npcStep(dt) {
  const H = W.hero, b = H.body;
  for (const n of W.npcs) {
    const d = Math.hypot(b.x - n.x, b.y - n.y); const face = d < 60 ? Math.atan2(b.y - n.y, b.x - n.x) : n.facing;
    n.t = (n.t || 0) + dt;
    if (n.duck) { n.x = n.ox + Math.sin(n.t * .8 + n.ph) * 6; n.y = n.oy + Math.cos(n.t * .6 + n.ph) * 4; n.rig.update(dt, { squash: Math.sin(n.t * 3 + n.ph) * .06, look: [Math.cos(face), Math.sin(face)], walk: .3 }); }
    else n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: face, pose: n.pose || (d < 50 ? 'wave' : undefined) });
  }
}

/* ---------------- drawing the world's actors ---------------- */
G.drawWorld = r => {
  const A = W.A, H = W.hero, S = G.S;
  for (const n of W.npcs) {
    if (n.hidden && n.hidden()) continue;
    if (n.duck) { r.shadow(n.x, n.y, 5, .25); r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view)); }
    else { r.shadow(n.x, n.y, 6, .4); r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view)); }
    if (n.name && !n.noName && Math.hypot(n.x - H.body.x, n.y - H.body.y) < 70 && !(W.curInter && W.curInter.x === n.x && W.curInter.y === n.y)) r.textAt(n.x, n.y, 44, n.name, '#ffe9a8');
  }
  for (const e of W.enemies) {
    const b = e.body;
    if (!e.dead) r.shadow(b.x, b.y, e.k.boss ? 11 : 6, .4);
    r.actor(b.x, b.y, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), e.flash > 0 ? { flash: '#ffffff', flashMix: .7 } : e.tele ? { flash: '#ff4040', flashMix: .35 } : e.dead ? { alpha: Math.max(0, 1 - Math.max(0, e.t - 1.2) * 1.2) } : {});
    if (e.state === 'chargeWind') r.queue(b.x, b.y, 0, g => { const a = e.facing, p0 = r.w(b.x, b.y, 1), p1 = r.w(b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, 1); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ff4040', 2); }, { emissive: true });
    if (e.fear && e.stun > 0 && !e.dead) r.textAt(b.x, b.y, 46, '?', '#ff8a8a');
  }
  for (const p of W.pickups) {
    const spr = p.kind === 'cash' ? G.SPR.cash : G.SPR[G.FOOD[p.kind].spr];
    r.shadow(p.x, p.y, 4, .3); r.sprite(p.x, p.y, 3 + Math.sin(p.t * 4 + p.x) * 1.5, spr, { anchor: 'bottom' });
  }
  /* ghosts of other hub players */
  for (const id in W.ghosts) { const gh = W.ghosts[id]; if (gh.a !== A.name) continue; r.shadow(gh.x, gh.y, 6, .35); r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view)); r.textAt(gh.x, gh.y, 46, gh.name, gh.color); }
  /* hero last so it reads over props */
  const b = H.body;
  r.actor(b.x, b.y, 0, (g, ox, oy) => H.rig.draw(g, ox, oy, r.view), H.inv > 0 && H.hurt > 0 ? { flash: '#ff4040', flashMix: .5 } : H.inv > 0 && Math.floor(H.inv * 20) % 2 ? { alpha: .6 } : {});
  if (H.look > 0) r.groundRing && r.groundRing(b.x, b.y, 8 + (1 - H.look / .9) * 62, '#ff4a4a');
  /* interaction prompts + objective marker */
  const it = !W.busy && !W.talk.open && !W.cut ? W.nearInter() : null;
  W.curInter = it;
  if (it) r.textAt(it.x, it.y, 52, it.label, '#ffffff');
  const ob = G.objective && G.objective();
  if (ob && ob.area === A.name && !W.demo && r.marker) r.marker(ob.x, ob.y, 24, { label: ob.short || '', color: '#ffd040' });
  /* boss telegraph aside, pickups etc done */
};

/* ---------------- HUD ---------------- */
const bar = (g, x, y, w, h, v, c, back) => { px.rect(g, x - 1, y - 1, w + 2, h + 2, '#0c0a10'); px.rect(g, x, y, w, h, back || '#2a2430'); px.rect(g, x, y, Math.round(w * clamp(v, 0, 1)), h, c); px.rect(g, x, y, Math.round(w * clamp(v, 0, 1)), 1, '#ffffff33'); };
G.drawHud = (g, r) => {
  if (W.noHud) return;
  const S = G.S, H = W.hero, Wd = r.W, Ht = r.H, T = G.txt;
  hudT += 1 / 60;
  const cs = game.cornerArea ? game.cornerArea() : null;
  /* portrait + bars */
  G.panel(g, 4, 4, 128, 46, .8);
  H.rig.drawPortrait(g, 8, 8, 34, { zoom: 2.4 });
  px.rect(g, 8, 8, 34, 1, '#c9a45c');
  const hpw = 78; T(g, 'HEALTH', 46, 7, '#e8d8c0');
  bar(g, 46, 15, hpw, 5, S.hp / G.maxHp(), S.hp / G.maxHp() < .3 ? '#e04a4a' : '#7ad06a');
  T(g, 'STRESS', 46, 22, '#e8d8c0'); const jit = S.stress > 75 ? Math.round(Math.sin(hudT * 40)) : 0;
  bar(g, 46 + jit, 30, hpw, 5, S.stress / 100, S.stress > 75 ? '#ff5a5a' : S.stress > 45 ? '#f0b040' : '#5aa0e0');
  T(g, 'GUT', 46, 36, '#e8d8c0'); bar(g, 66, 38, 58, 4, S.gut / 100, S.gut > 60 ? '#d07a3a' : '#b8a060');
  px.rect(g, 8, 44, 34, 3, '#0c0a10'); px.rect(g, 9, 45, Math.round(32 * S.menace / 100), 1, S.menace >= 100 ? '#ff4a4a' : '#8a4a7a');
  /* cash and rank */
  const rk = G.RANKS[G.rank()], nxt = G.RANK_AT[G.rank() + 1];
  const cw = 108, cx = Wd - cw - 4, cy = cs && cs.x0 < Wd && cs.y0 < 30 ? 30 : 4;
  G.panel(g, cx, cy, cw, 34, .8);
  T(g, G.fmt(S.cash), cx + cw - 6, cy + 5, '#9be58a', { align: 'right', scale: 1 });
  T(g, rk.toUpperCase(), cx + 6, cy + 5, '#ffd36a');
  bar(g, cx + 6, cy + 26, cw - 12, 4, nxt ? (S.respect - G.RANK_AT[G.rank()]) / (nxt - G.RANK_AT[G.rank()]) : 1, '#c9a45c');
  T(g, 'RESPECT ' + Math.round(S.respect), cx + 6, cy + 16, '#c8bca0', {});
  /* objective */
  const ob = G.objective && G.objective();
  if (ob) { const w = Math.min(Wd - 150, E.font.width(ob.text) + 26); G.panel(g, 4, Ht - 24, w, 20, .78); T(g, 'GOAL', 10, Ht - 21, '#ffd36a'); T(g, ob.text, 10, Ht - 12, '#fff'); }
  /* food slot */
  const names = Object.keys(G.FOOD), key = names[H.slot], f = G.FOOD[key];
  { const fx = Wd - 136, fy = Ht - 40; G.panel(g, fx, fy, 132, 36, .8); const spr = G.SPR[f.spr]; px.sprite(g, spr, fx + 6, fy + 8); T(g, f.name, fx + 30, fy + 4, '#fff'); T(g, 'x' + (S.bag[key] || 0), fx + 30, fy + 13, S.bag[key] ? '#ffd36a' : '#8a8090');
    names.forEach((n, i) => px.rect(g, fx + 8 + i * 8, fy + 29, 6, 2, i === H.slot ? '#ffd36a' : '#5a5060')); G.promptRow(g, fx + 128, fy + 20, [['eat', 'Eat'], ['next', 'Swap']]); }
  /* contextual prompt row */
  if (W.curInter) { const it = W.curInter; G.panel(g, (Wd >> 1) - 60, Ht - 34, 120, 16, .85); const lw = E.font.width(it.label) + G.glyphWidth('interact') + 6; G.prompt(g, (Wd >> 1) - lw / 2, Ht - 31, 'interact', it.label); }
  /* boss bar */
  const bs = W.boss; if (bs && !bs.dead && bs.state !== 'idle') { const bw = 120; G.panel(g, (Wd - bw) / 2 - 4, 40, bw + 8, 18, .85); T(g, 'SLAVKO', Wd / 2, 42, '#ff9a8a', { align: 'center' }); bar(g, (Wd - bw) / 2, 51, bw, 4, bs.hp / bs.max, '#e04a4a'); }
  /* round timer in hub */
  if (G.HUB && G.hubClock) { const t = G.hubClock(); T(g, t, Wd / 2, 4, '#fff', { align: 'center', scale: 2 }); }
  /* control hints (bottom, tiny, follow the device) */
  G.drawToasts(g, Wd, 1 / 60);
  /* demo banner */
  if (W.demo) { T(g, 'DEMO - press any button to play', Wd / 2, Ht - 44, '#ffffff', { align: 'center' }); }
  /* panic / black vignette */
  if (S.stress > 80 && !W.demo) px.blend(g, (S.stress - 80) / 60 + Math.sin(hudT * 6) * .05, 'multiply', () => px.rect(g, 0, 0, Wd, Ht, '#802020'));
  if (W.black >= 1) px.rect(g, 0, 0, Wd, Ht, '#000000');
};

game.scenes = game.scenes || {};
G.scenes = G.scenes || {};
G.scenes.play = play;
})();
