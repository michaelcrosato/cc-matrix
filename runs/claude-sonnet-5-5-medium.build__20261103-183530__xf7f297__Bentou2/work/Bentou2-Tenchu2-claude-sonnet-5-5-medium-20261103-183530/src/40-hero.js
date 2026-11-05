/* ---- THE HERO: intent, light and shadow, Silent Cuts, the kaginawa, bodies, combat, the bento ---- */
function makeHeroRig(ch) {
  return ch === 'kaede'
    ? new E.Humanoid({ size: 1.2, build: 'heroic', hood: false, hair: 'ponytail', weapon: 'sword', outfit: 'coat', sleeves: 'short', cape: { len: 5, width: 4, seg: 2.2 }, colors: { cloth: '#7a1a3a', coat: '#7a1a3a', hair: '#201018', pants: '#2a2030', cape: '#d84a5a', capeIn: '#5a1020', trim: '#e8c860', metal: '#e8e8f4', skin: '#f0c8a0' } })
    : new E.Humanoid({ size: 1.2, build: 'heroic', hood: true, weapon: 'sword', outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.4 }, colors: { cloth: '#2a3a6a', coat: '#2a3a6a', pants: '#1a1a28', cape: '#3a4a8a', capeIn: '#1a2040', trim: '#c8b060', metal: '#e8e8f0', skin: '#e8b890' } });
}
const lightsOf = () => S.lights;
function isLit(b) { for (const l of S.lights) if (Math.hypot(l.x - b.x, l.y - b.y) < l.r) return true; for (const g of S.guards) if (!g.dead && g.def === B.ENEMY.ashigaru && Math.hypot(g.x - b.x, g.y - b.y) < 26) return true; for (const t of S.things) if (t.type === 'fire' && Math.hypot(t.x - b.x, t.y - b.y) < 44) return true; return false; }
function ground(b) { return S.map.groundAt(b.x, b.y, b.r, b.z); }
const noiseLevel = () => {
  const h = S.hero; if (h.crouch || h.action || h.dragging && 0) return h.crouch ? 0 : 8;
  const moving = Math.hypot(h.vx, h.vy) > 12; if (!moving) return 0;
  const soft = S.soft > 0; return h.sprinting ? (soft ? 30 : 70) : (soft ? 0 : 30);
};

/* ---- starting a mission ---- */
function startMission(id, o = {}) {
  const m = B.missionById(id), map = null;
  S = { m, o, map: null, hero: null, guards: [], things: [], toasts: [], events: [], t: 0, hp: B.tune.heroHp, hurtT: 0, over: null, done: false, obj: {}, kills: 0, cuts: 0, detected: 0, bells: 0, bodiesFound: 0, screams: 0, civHarm: 0, damageTaken: 0, toolsUsed: 0, score: 0, alarm: 0, bellRunner: null, reinforced: 0, alertLatch: false,
    soft: 0, cloak: 0, flash: 0, slowReal: 0, cutFx: null, grap: null, bento: [], sel: 0, auto: !!o.auto, god: !!o.auto, blockOK: false, boss: null, bossDone: false, tobei: null, lights: [], pickups: [], hints: new Set(), prompt: null, ki: { v: 0, c: '#40d0b0', g: null }, kiFocus: false,
    posts: 0, lever: false, ghostRec: [], ghosts: new Map(), swim: false, dragging: null, trialStart: 0, zoomed: false, hintFlash: 0, devShow: false, sightShow: true, ending: null };
  S.map = buildMap(m);
  const cx = x => cc(x), hx = cc(m.hero[0]), hy = cc(m.hero[1]);
  S.hero = new E.Mover({ x: hx, y: hy, z: 0, r: 5, climbMax: 32, climbAny: false, hopMax: 48, run: 85, walk: 50, sneak: 32, sprintSpeed: 125 });
  S.hero.facing = Math.PI / 4; S.hero.exposure = 1;
  S.rig = makeHeroRig(B.save.chara);
  S.combo = new E.Combo(B.save.chara === 'kaede' ? ['slash', 'backslash', 'spin'] : ['slash', 'backslash', 'overhead'], { window: .35 });
  S.lights = (m.lanterns || []).map(([a, b]) => ({ x: cc(a), y: cc(b), r: 46 }));
  S.guards = (m.guards || []).map((d, i) => makeGuard(d, i));
  S.exitPt = { x: cc(m.exit[0]), y: cc(m.exit[1]), r: m.exit[2] * T };
  // objectives (an implicit exit at the end where the mission has a place to leave by)
  S.m.objectives.forEach(o2 => { S.obj[o2.id] = false; });
  for (const p of m.pickups || []) S.pickups.push({ tool: p[0], x: cc(p[1]), y: cc(p[2]), got: false });
  if (m.ledger) S.ledger = { x: cc(m.ledger[0]), y: cc(m.ledger[1]), got: false };
  if (m.flask) S.flask = { x: cc(m.flask[0]), y: cc(m.flask[1]), got: false };
  if (m.escort) { S.tobei = makeTobei(m); }
  if (m.lever) S.leverPt = { x: cc(m.lever[0]), y: cc(m.lever[1]) };
  if (m.posts) S.postPts = m.posts.map(p => ({ x: cc(p[0]), y: cc(p[1]), cut: false }));
  // the bento: eight compartments, each full
  const lo = (o.loadout || B.save.loadout || m.loadHint).slice(0, 8);
  S.bento = lo.map(t => ({ tool: B.TOOLS[t] ? t : 'rice', n: B.TOOLS[t] ? B.TOOLS[t].stack : 3 }));
  S.sel = Math.max(0, S.bento.findIndex(b => b.n > 0));
  game.follow(S.hero, { z: 18 }); game.cam.bounds = v => S ? S.map.bounds(v) : null; game.cam.offset = [0, -10]; game.cam.snap = true;
  L.enabled = true; L.ambient = m.ambient; game.weather = m.weather || null;
  A.music(B.SONGS[m.music]); A.layer('chase', 0, .02); A.layer('alarm', 0, .02);
  S.talk = new E.Dialog(game, { place: 'bottom', speed: 40, voice: null });
  S.hpMax = B.tune.heroHp; S.hp = S.hpMax;
  if (B.save.chara === 'kaede') S.hero.run *= 1.05;
  initBoss(m);
  if (!o.quiet) { toast(m.name, m.place, 4); }
}
function makeTobei(m) {
  const t = new E.Mover({ x: cc(m.escort.at[0]), y: cc(m.escort.at[1]), z: 0, r: 5, run: 84, walk: 48, climb: false });
  Object.assign(t, { free: false, hp: 60, rig: new E.Humanoid({ size: 1.1, build: 'chibi', outfit: 'tunic', hair: 'spiky', weapon: null, colors: { cloth: '#8a6a3a', pants: '#4a3a2a', hair: '#403020' } }), flow: new E.FlowField(S.map, { climb: 0, drop: 20 }), wait: false, gk: '', bark: 0 });
  return t;
}

/* ---- the Silent Cut ---- */

/* ---- the ten Silent Cut animations: five kinds, each in Sojiro's way and Kaede's. Paired actions built on E.ACTIONS' takedown structure. ---- */
const CUT_MOVES = {
  back:  { sojiro: ['thrust'],              kaede: ['thrust', 'backslash'] },   // Sojiro: a hand over the mouth, one clean thrust. Kaede: a hop and two blades
  side:  { sojiro: ['slash'],               kaede: ['spin'] },                   // Sojiro: a dash past with one slash. Kaede: a whirl
  front: { sojiro: ['rising'],              kaede: ['slash', 'backslash'] },     // Sojiro: a rising cut. Kaede: an X-cut
  above: { sojiro: ['overhead'],            kaede: ['plunge'] },                 // Sojiro: an overhead chop from the leap. Kaede: a plunging stab
  under: { sojiro: ['claw'],                kaede: ['claw'] }                    // up out of the water: grab and drag under
};
const vec = (a, d) => ({ x: Math.cos(a) * d, y: Math.sin(a) * d });
function mkCut(kind, ch) {
  const mv = CUT_MOVES[kind][ch], kae = ch === 'kaede';
  const strikeBeats = mv.map((m, i) => ['strike' + i, kind === 'side' ? .26 : .2]);
  return {
    beats: [kind === 'above' ? ['leap', .38] : ['reach', kae && kind === 'back' ? .26 : .2], ...strikeBeats, ['drop', kind === 'under' ? .6 : .45], ['recover', .2]],
    setup(A) {
      const v = A.o.other, vf = v.facing !== undefined ? v.facing : Math.atan2(v.y - A.start.y, v.x - A.start.x), gap = (A.body.r || 5) + (v.r || 5) - 2;
      A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: vf }; A.from = A.start; A.vf = vf;
      const toV = Math.atan2(v.y - A.start.y, v.x - A.start.x);
      if (kind === 'front') { const o = vec(vf, gap + 2); A.land = { x: v.x + o.x, y: v.y + o.y, z: v.z || 0 }; A.facing = vf + Math.PI; }
      else if (kind === 'side') { const o = vec(vf + Math.PI / 2, gap + 2), o2 = vec(vf - Math.PI / 2, gap + 2); A.land = { x: v.x + o.x, y: v.y + o.y, z: v.z || 0 }; A.land2 = { x: v.x + o2.x, y: v.y + o2.y, z: v.z || 0 }; A.facing = vf - Math.PI / 2; }
      else { const o = vec(vf, -gap); A.land = { x: v.x + o.x, y: v.y + o.y, z: v.z || 0 }; A.facing = vf; }
      if (kind === 'under') A.facing = toV;
    },
    at(A, b, u) {
      const st = { facing: A.facing }, vs = { facing: A.vic.facing }, V = { x: A.vic.x, y: A.vic.y, z: A.vic.z };
      const L = A.land;
      if (b === 'reach') { const p = _lerp3(A.from, L, E.ease.outQuad(u)); if (kae && kind === 'back') p.z += Math.sin(u * Math.PI) * 8; return Object.assign(p, { state: Object.assign(st, { stance: 'ready', crouch: kind === 'under' }), other: Object.assign(V, { state: vs }) }); }
      if (b === 'leap') { const p = _lerp3(A.from, L, u); p.z = lerp(A.from.z || 0, L.z, u * u) + Math.sin(u * Math.PI) * 10; return Object.assign(p, { state: Object.assign(st, { air: true }), other: Object.assign(V, { state: vs }) }); }
      if (b.startsWith('strike')) {
        const i = +b.slice(6), p = kind === 'side' ? _lerp3(L, A.land2, u) : { x: L.x, y: L.y, z: L.z };
        return Object.assign(p, { state: Object.assign(st, { attack: E.move(mv[i], u), land: kind === 'above' && u < .2 ? 1 : 0, hop: 0 }), other: Object.assign(V, { state: Object.assign(vs, { hurt: u > .4, expr: 'wince' }) }) });
      }
      const endP = kind === 'side' ? A.land2 : L, last = mv[mv.length - 1];
      if (b === 'drop') {
        const sink = kind === 'under' ? E.ease.inQuad(u) * 8 : 0, o = kind === 'under' ? vec(A.facing, u * 6) : { x: 0, y: 0 };
        return Object.assign({ x: endP.x, y: endP.y, z: endP.z }, { state: Object.assign(st, { attack: E.move(last, 1, 'recover') }), other: { x: V.x + o.x, y: V.y + o.y, z: V.z - sink, state: Object.assign(vs, { down: E.ease.inQuad(u) }) } });
      }
      return Object.assign({ x: endP.x, y: endP.y, z: endP.z }, { state: Object.assign(st, { crouch: u < .5 }), other: { x: V.x, y: V.y, z: V.z - (kind === 'under' ? 8 : 0), state: Object.assign(vs, { down: 1 }) } });
    }
  };
}
const _lerp3 = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z || 0, b.z || 0, t) });
for (const k of Object.keys(CUT_MOVES)) for (const c of ['sojiro', 'kaede']) E.ACTIONS['cut_' + k + '_' + c] = mkCut(k, c);
const CUT_NAMES = { back: 'Back cut', side: 'Side cut', front: 'Front cut', above: 'Cut from above', under: 'Undertow' };
function cutCandidate() {
  const hero = S.hero; if (hero.action || S.grap || S.over || S.cutFx) return null;
  let best = null, bd = 1e9;
  for (const g of S.guards) {
    if (g.dead || g.action || g.def.boss) continue;
    const d = dist2(g, hero), dz = hero.z - g.z, incap = g.sleep > 0 || g.stun > 0 || g.blind > 0 || g.eat && g.eat.stage === 'eat';
    const st = g.mind.state, unaware = st === 'calm' || st === 'notice' || st === 'search', sees = !g.civ && heroSeenBy(g).seen && !incap;
    const rel = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - hero.y, g.x - hero.x))) * 180 / Math.PI;
    let kind = null;
    if (S.swim && hero.crouch === true && d < 22 && S.map.floorAt(g.x, g.y) !== 'water' && unaware) kind = 'under';
    else if (!S.swim && dz > 14 && d < 44 && hero.onGround && unaware && S.map.arcClear({ x: hero.x, y: hero.y, z: hero.z }, { x: g.x, y: g.y, z: g.z }, 24, 3)) kind = 'above';
    else if (!S.swim && E.sameLevel(hero, g, 10) && d <= B.tune.killRange) {
      if (incap) kind = rel < B.tune.killBack ? 'back' : 'front';
      else if (g.civ && !g.revealed) kind = 'back';
      else if (unaware && !sees) kind = rel < B.tune.killBack ? 'back' : rel < 120 ? (st === 'calm' ? 'side' : null) : null;
    }
    if (kind && d < bd) { bd = d; best = { g, kind }; }
  }
  return best;
}
function doCut(c) {
  const hero = S.hero, g = c.g;
  hero.play('cut_' + c.kind + '_' + B.save.chara, { other: g, aerial: c.kind === 'above', map: S.map });
  g.action = hero.action; hero.crouch = false;
  killGuard(g, 'cut'); S.cuts++; S.score += 150;
  S.events.push({ type: 'cut', x: g.x, y: g.y });
  if (c.kind === 'side' || c.kind === 'front') noise(g.x, g.y, g.z, 15);
  if (c.kind === 'under') { noise(g.x, g.y, g.z, 10); A.sfx('splash'); }
  game.freeze(.05); A.sfx('twang'); A.sfx('punch', { vol: .6 });
  // each apprentice cuts in a style of their own, and each kind of cut has its own sound, spark and shake
  const kd = c.kind, kae = B.save.chara === 'kaede';
  if (kae) { A.sfx('whoosh', { vol: .5, pitch: 1.6 }); game.after(.12, () => { A.sfx('swing', { pitch: 1.8, vol: .5 }); P.sparks(g.x, g.y, g.z + 20, 8, hero.facing + 1.2); }); S.rig.kick && S.rig.kick(kd === 'above' ? -.3 : .25); }
  else { A.sfx('swing', { pitch: .6, vol: .6 }); P.glints(hero.x, hero.y, hero.z + 20, 6, '#c8d8ff'); }
  if (kd === 'side') { A.sfx('kick', { vol: .4 }); game.shake(2); } else if (kd === 'front') { A.sfx('hit', { vol: .5, pitch: .8 }); game.shake(3); P.ring(g.x, g.y, 2, 16, '#ffd0c0', .3); }
  else if (kd === 'above') { A.sfx('land'); P.dust(g.x, g.y, g.z, 8); game.shake(3); } else if (kd === 'under') P.ring(g.x, g.y, 2, 18, '#8ab8d8', .5);
  S.cutFx = { t: 0, max: .95, kind: c.kind, x: g.x, y: g.y, z: g.z, zoom: game.zoom };
  game.setZoom(Math.min(2.2, (game.zoom || 1) * 1.45));
  P.sparks(g.x, g.y, g.z + 18, 14, hero.facing); if (game.settings.ink !== false) P.bits(g.x, g.y, g.z + 14, 10, ['#d02a20', '#701010']);
  game.input.rumble(.5, .15);
}
function tickCutFx(dt) {
  const f = S.cutFx; if (!f) return;
  f.t += dt / game.timeScale; if (f.t > .55 && !f.back) { f.back = true; game.setZoom(f.zoom || 1); }
  if (f.t >= f.max) S.cutFx = null;
}

/* ---- the kaginawa ---- */
function findGrapple() {
  const hero = S.hero, f = hero.facing, m = S.map;
  for (const a of [0, .3, -.3, .6, -.6]) for (let d = 18; d <= 104; d += 5) {
    const x = hero.x + Math.cos(f + a) * d, y = hero.y + Math.sin(f + a) * d, h = m.heightAt(x, y);
    if (h > hero.z + 14) {
      if (h > hero.z + 76) break;
      for (let e = 6; e <= 44; e += 6) {
        const lx = x + Math.cos(f + a) * e, ly = y + Math.sin(f + a) * e;
        if (Math.abs(m.heightAt(lx, ly) - h) < 1 && m.standable(lx, ly, h, 5)) return { x: lx, y: ly, z: h, ax: x, ay: y, d };
      }
      break;
    }
  }
  return null;
}
function startGrapple(tg) {
  const hero = S.hero;
  S.grap = { t: 0, dur: .55 + tg.d / 260, from: { x: hero.x, y: hero.y, z: hero.z }, to: tg };
  hero.facing = Math.atan2(tg.y - hero.y, tg.x - hero.x); hero.vx = hero.vy = 0; A.sfx('whoosh', { pitch: .8 }); A.sfx('ping');
}
function tickGrapple(dt) {
  const g = S.grap, hero = S.hero; g.t += dt; const u = Math.min(1, g.t / g.dur), e = E.ease.inOutQuad(u);
  hero.x = lerp(g.from.x, g.to.x, e); hero.y = lerp(g.from.y, g.to.y, e); hero.z = lerp(g.from.z, g.to.z, e) + Math.sin(u * Math.PI) * 10; hero.vx = hero.vy = 0; hero.vz = 0;
  if (u >= 1) { hero.z = g.to.z; hero.onGround = true; S.grap = null; noise(hero.x, hero.y, hero.z, 22); A.sfx('land'); P.dust(hero.x, hero.y, hero.z, 5); }
}

/* ---- bodies: drag one by holding the interact button next to it ---- */
function nearBody() { let b = null, bd = 18; for (const g of S.guards) if (g.dead && !g.sunk && !g.action?.active && dist2(g, S.hero) < bd && E.sameLevel(g, S.hero, 10)) { bd = dist2(g, S.hero); b = g; } return b; }
function dragUpdate(dt) {
  const hero = S.hero, I = game.input;
  if (I.down('interact') && !hero.action && !S.grap) {
    if (!S.dragging) { const b = nearBody(); if (b) { S.dragging = b; hero.dragging = true; } }
  } else { S.dragging = null; hero.dragging = false; }
  const b = S.dragging; if (!b) return;
  const a = hero.facing + Math.PI, tx = hero.x + Math.cos(a) * 11, ty = hero.y + Math.sin(a) * 11;
  b.x = lerp(b.x, tx, 1 - Math.pow(.0001, dt)); b.y = lerp(b.y, ty, 1 - Math.pow(.0001, dt)); b.action = null; b.facing = hero.facing;
  if (inWater(b)) { b.sunk = 1; b.hidden = true; S.dragging = null; hero.dragging = false; A.sfx('splash'); P.smoke(b.x, b.y, 2, 4, { size: 4 }); toast('The body sinks', 'Nobody finds what the canal keeps.', 2); }
  else if (inGrass(b) || S.map.floorAt(b.x, b.y) === 'grass') b.hidden = true; else b.hidden = false;
}

/* ---- combat ---- */
function heroAttack() {
  const hero = S.hero;
  if (S.combo.press()) { A.sfx('swing'); noise(hero.x, hero.y, hero.z, 35); }
}
function tickCombat(dt) {
  const hero = S.hero; S.combo.update(dt);
  S.combo.hits(S.guards.filter(g => !g.dead), g => E.inArc(hero, hero.facing, g, 24, 1.3, 12), g => {
    const unaware = g.mind.state === 'calm' || g.sleep > 0, dmg = 14 * B.tune.damage * (unaware ? 2.2 : 1) * (B.save.chara === 'kaede' ? .9 : 1.1);
    g.hp -= dmg; game.hitFx(g.x, g.y, g.z + 16, { power: 1, angle: hero.facing, damage: Math.round(dmg) }); E.knockback(hero, g, 80);
    if (g.def.civ && !g.revealed) screamCiv(g); else { g.mind.level = Math.max(g.mind.level, 1.2); g.mind.last = { x: hero.x, y: hero.y, z: hero.z }; g.sleep = 0; g.stun = Math.max(g.stun, .2); }
    if (g.def.disguise && !g.revealed) revealDisguise(g);
    if (g.hp <= 0) { killGuard(g, 'melee'); g.action = null; A.sfx('die', { vol: .5 }); S.score += 50; }
  });
  if (S.boss) bossHits();
}
function tryParry() {
  const hero = S.hero; let done = false;
  for (const g of S.guards) if (!g.dead && g.swing.phase === 'wind' && g.swing.u > .3 && dist2(g, hero) < 28) { g.swing.cancel(); g.stun = 1.2; done = true; P.sparks(g.x, g.y, g.z + 18, 10, hero.facing); }
  if (S.boss && bossParry()) done = true;
  if (done) { A.sfx('kick'); game.flash('#ffffff', .08); toast('Parried', '', 1); game.freeze(.06); }
}

/* ---- the bento: ten tools, eight compartments ---- */
function slot() { return S.bento[S.sel]; }
function cycleTool(dir = 1) {
  for (let i = 1; i <= S.bento.length; i++) { const k = (S.sel + dir * i + S.bento.length * 4) % S.bento.length; if (S.bento[k].n > 0) { S.sel = k; A.sfx('tick'); return; } }
}
function aimPoint(range, maxR) {
  const hero = S.hero, I = game.input;
  if (lastDev() === 'mouse') { const p = game.mouseGround(); if (p) { const dx = (p.x ?? p[0]) - hero.x, dy = (p.y ?? p[1]) - hero.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: hero.x + dx * k, y: hero.y + dy * k }; } }
  let best = null, bd = range;
  for (const g of S.guards) if (!g.dead && !g.civ) { const d = dist2(g, hero), a = Math.abs(E.angDiff(hero.facing, Math.atan2(g.y - hero.y, g.x - hero.x))); if (d < bd && a < .8 && S.map.los(hero.x, hero.y, g.x, g.y)) { bd = d; best = g; } }
  if (best) return { x: best.x, y: best.y };
  return { x: hero.x + Math.cos(hero.facing) * Math.min(range, 80), y: hero.y + Math.sin(hero.facing) * Math.min(range, 80) };
}
function lob(type, x, y, extra = {}) {
  const hero = S.hero, a = E.arc({ x: hero.x, y: hero.y, z: hero.z + 16 }, { x, y, z: 0 }, 500, { apex: 22 });
  S.things.push(Object.assign({ type, x: hero.x, y: hero.y, z: hero.z + 16, vx: a.vx, vy: a.vy, vz: a.vz, lob: true, t: 8 }, extra));
}
function useTool() {
  const hero = S.hero, s = slot(); if (!s || s.n <= 0) { toast('Empty compartment', 'Cycle to another tool (' + lbl('cycle') + ').', 1.5); return; }
  if (S.swim) { toast('Not in the water', '', 1); return; }
  const id = s.tool, pw = B.tune.toolPower; let used = true;
  if (id === 'rice') { if (S.hp >= S.hpMax) { toast('Full health', '', 1); used = false; } else { S.hp = Math.min(S.hpMax, S.hp + 40 * pw); A.sfx('eat'); A.sfx('heal'); P.glints(hero.x, hero.y, hero.z + 20, 8, '#a8f0a8'); S.eatT = .6; } }
  else if (id === 'poison' || id === 'dango') { const p = aimPoint(48); S.things.push({ type: 'bait', kind: id, x: p.x, y: p.y, z: 0, t: 90, eaten: false }); A.sfx('pickup'); }
  else if (id === 'plum') { S.soft = 20; A.sfx('powerup'); toast('Soft steps', 'Your footfalls make no sound for 20 seconds.', 2); }
  else if (id === 'shuriken') { const p = aimPoint(160), a = Math.atan2(p.y - hero.y, p.x - hero.x); hero.facing = a; S.things.push({ type: 'shuriken', x: hero.x, y: hero.y, z: hero.z + 18, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, t: .6 }); A.sfx('swing'); }
  else if (id === 'smoke') { const p = game.input.down('block') ? { x: hero.x, y: hero.y } : aimPoint(96); lob('smoke', p.x, p.y, { r: 4 }); A.sfx('throw' in A.presets ? 'throw' : 'whoosh'); }
  else if (id === 'caltrops') { S.things.push({ type: 'caltrops', x: hero.x, y: hero.y, z: 0, r: 24, t: 20 }); A.sfx('pickup'); }
  else if (id === 'cracker') { const p = aimPoint(128); lob('cracker', p.x, p.y, { fuse: .8 }); A.sfx('whoosh'); }
  else if (id === 'firepot') { const p = aimPoint(112); lob('firepot', p.x, p.y); A.sfx('whoosh'); }
  else if (id === 'cloak') { S.cloak = 15; A.sfx('powerup'); toast('Straw cloak', 'Nearly invisible, unless you strike or sprint.', 2); }
  if (used) { s.n--; S.toolsUsed++; if (s.n <= 0) cycleTool(1); hero.crouch = hero.crouch; }
}
function explode(t) {
  P.explosion(t.x, t.y, 6, 1.2); noise(t.x, t.y, 0, 220); S.fireLight = 1;
  S.things.push({ type: 'fire', x: t.x, y: t.y, z: 0, t: 1.2 });
  for (const g of S.guards) if (!g.dead && Math.hypot(g.x - t.x, g.y - t.y) < 32) { g.hp -= 45 * B.tune.toolPower; g.mind.level = 1.2; g.mind.last = { x: S.hero.x, y: S.hero.y, z: 0 }; if (g.hp <= 0) { killGuard(g, 'tool'); g.action = null; } }
  if (Math.hypot(S.hero.x - t.x, S.hero.y - t.y) < 32 && !S.god) hurtHero(30, null);
  if (S.boss && Math.hypot(S.boss.x - t.x, S.boss.y - t.y) < 36) damageBoss(45 * B.tune.toolPower);
}
function tickThings(dt) {
  const hero = S.hero;
  for (const t of S.things) {
    if (t.lob) {
      t.vz -= 500 * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
      const gz = S.map.heightAt(t.x, t.y);
      if (S.map.heightAt(t.x, t.y) > t.z + 2 && gz > 0) { t.vx = t.vy = 0; }
      if (t.z <= gz && t.vz < 0) {
        t.lob = false; t.z = gz; t.vx = t.vy = t.vz = 0;
        if (t.type === 'smoke') { t.t = 6 * B.tune.toolPower; t.grow = true; A.sfx('pop'); noise(t.x, t.y, 0, 25); }
        else if (t.type === 'firepot') { explode(t); t.t = 0; t.type = 'dead'; }
        else if (t.type === 'cracker') { t.armed = true; }
      }
    } else if (t.type === 'cracker' && t.armed) { t.fuse -= dt; if (t.fuse <= 0) { A.sfx('pop'); A.sfx('explode', { vol: .4, pitch: 1.5 }); P.sparks(t.x, t.y, 6, 14); noise(t.x, t.y, 0, 140); t.t = 0; t.type = 'dead'; } }
    if (t.type === 'smoke' && t.grow) { t.r = Math.min(40, t.r + dt * 50); if (rnd() < dt * 8) P.smoke(t.x + (rnd() - .5) * t.r, t.y + (rnd() - .5) * t.r, 6, 1, { size: 5, color: '#a8a8b8' }); }
    if (t.type === 'shuriken') {
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (S.map.heightAt(t.x, t.y) > t.z) t.t = 0;
      for (const g of S.guards) if (!g.dead && Math.hypot(g.x - t.x, g.y - t.y) < 7 && Math.abs(g.z + 14 - t.z) < 22) {
        g.hp -= 8 * B.tune.toolPower; t.t = 0; game.hitFx(g.x, g.y, g.z + 16, { power: .5, damage: Math.round(8 * B.tune.toolPower) });
        if (g.civ && !g.revealed) screamCiv(g); else if (g.mind.state === 'calm') { g.mind.level = Math.max(g.mind.level, .7); g.mind.last = { x: hero.x, y: hero.y, z: 0 }; }
        if (g.hp <= 0) { killGuard(g, 'tool'); g.action = null; S.score += 50; }
      }
      if (S.boss && Math.hypot(S.boss.x - t.x, S.boss.y - t.y) < 9) { damageBoss(8 * B.tune.toolPower); t.t = 0; }
    }
    if (t.type === 'arrow') {
      t.x += t.vx * dt; t.y += t.vy * dt; if (S.map.heightAt(t.x, t.y) > t.z - 4 && S.map.heightAt(t.x, t.y) > 0) t.t = 0;
      if (Math.hypot(hero.x - t.x, hero.y - t.y) < 6 && Math.abs(hero.z + 14 - t.z) < 18 && !S.god) { t.t = 0; hurtHero(t.from.def.dmg * B.tune.enemyDamage, null); }
    }
    if (t.type === 'fire') { if (rnd() < dt * 40) P.fire(t.x + (rnd() - .5) * 20, t.y + (rnd() - .5) * 20, 4, 1, { size: 4 }); }
    if (t.type === 'trail') { if (rnd() < dt * 30) P.fire(t.x + (rnd() - .5) * 8, t.y + (rnd() - .5) * 8, 2, 1, { size: 3 }); if (Math.hypot(hero.x - t.x, hero.y - t.y) < 10 && hero.z < t.z + 6 && S.hurtT <= 0 && !S.god) hurtHero(8, null); }
    t.t -= dt;
  }
  S.things = S.things.filter(t => t.t > 0 && t.type !== 'dead');
  if (S.soft > 0) S.soft -= dt; if (S.cloak > 0) S.cloak -= dt; if (S.fireLight > 0) S.fireLight -= dt * 2;
}

/* ---- interactions at hotspots: cage, lever, mooring posts, pickups ---- */
function nearestHotspot() {
  const hero = S.hero; if (S.swim || hero.z > 4) return null;
  const T0 = S.tobei; if (T0 && !T0.free && dist2(T0, hero) < 26) return { kind: 'cage', label: 'Open the cage', x: T0.x, y: T0.y };
  if (S.leverPt && !S.lever && dist2(S.leverPt, hero) < 22) return { kind: 'lever', label: 'Throw the lever', x: S.leverPt.x, y: S.leverPt.y };
  if (S.postPts) for (const p of S.postPts) if (!p.cut && dist2(p, hero) < 22) return { kind: 'post', label: 'Cut the mooring rope', p, x: p.x, y: p.y };
  return null;
}
function useHotspot(h) {
  A.sfx('door');
  if (h.kind === 'cage') { S.tobei.free = true; say('tobei', 'You came! I knew you would. I mean, I hoped.'); completeObj('tobei'); A.sfx('powerup'); }
  else if (h.kind === 'lever') { S.lever = true; const g = S.m.gate; S.map.set(g[0], g[1], 0); S.map.set(g[0], g[1] + 1, 0); completeObj('lever'); toast('The water gate opens', 'Tobei can follow the channel now.', 3); }
  else if (h.kind === 'post') { h.p.cut = true; S.posts++; A.sfx('splash'); toast('Barge loose (' + S.posts + '/3)', 'The river knows the way to the villages.', 2); if (S.posts >= 3) completeObj('barges'); S.score += 100; }
}
function completeObj(id) {
  if (S.obj[id]) return; if (S.obj[id] === undefined) return;
  S.obj[id] = true; const o = S.m.objectives.find(x => x.id === id); A.sfx('powerup', { vol: .6 }); if (o) toast('Objective complete', o.text, 2.8);
}
function checkObjectives() {
  const hero = S.hero;
  for (const o of S.m.objectives) {
    if (S.obj[o.id]) continue;
    if (o.kind === 'cuts' && S.cuts >= o.n) completeObj(o.id);
    else if (o.kind === 'reach' && Math.hypot(hero.x - cc(o.at[0]), hero.y - cc(o.at[1])) < 14 && hero.z >= o.at[2] - 8) completeObj(o.id);
    else if (o.kind === 'item') {
      const it = o.id === 'flask' ? S.flask : S.ledger;
      if (it && !it.got && dist2(it, hero) < 14) { it.got = true; completeObj(o.id); if (o.id === 'flask') say('granny', 'That sake would have ended the lord. Good. Now go up.'); }
    } else if (o.kind === 'boss' && S.bossDone) completeObj(o.id);
  }
  // pickups
  for (const p of S.pickups) if (!p.got && dist2(p, hero) < 12) {
    p.got = true; A.sfx('pickup'); const s = S.bento.find(b => b.tool === p.tool && b.n < B.TOOLS[p.tool].stack) || S.bento.find(b => b.n <= 0);
    if (s) { s.tool = p.tool; s.n = Math.min(B.TOOLS[p.tool].stack, s.n + 1); toast('Picked up ' + B.TOOLS[p.tool].name, '', 1.6); }
  }
  // mission complete: every required objective done, then (where there is a place to leave by) the exit
  const req = S.m.objectives.filter(o => o.req && o.kind !== 'exit'), allReq = req.every(o => S.obj[o.id]);
  if (!S.done && allReq) {
    if (S.m.endOnDone) return finishMission(true);
    if (Math.hypot(hero.x - S.exitPt.x, hero.y - S.exitPt.y) < S.exitPt.r && !(S.boss && S.boss.active) && !(S.tobei && !S.tobei.free)) { if (S.obj.out !== undefined) S.obj.out = true; return finishMission(true); }
    if (!S.exitHinted) { S.exitHinted = true; toast('Now leave', 'Make for ' + S.m.exitName.toLowerCase() + '.', 3); }
  }
  // the hints of the training mission: Granny whispers
  if (S.m.hints && game.settings.hints !== false) for (let i = 0; i < S.m.hints.length; i++) { const h = S.m.hints[i]; if (!S.hints.has(i) && Math.hypot(hero.x - cc(h.at[0]), hero.y - cc(h.at[1])) < h.at[2] * T) { S.hints.add(i); say(h.who, h.text, 5); } }
}
