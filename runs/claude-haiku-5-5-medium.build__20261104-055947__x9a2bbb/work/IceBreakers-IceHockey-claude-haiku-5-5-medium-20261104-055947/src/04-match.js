/* ---- THE MATCH: skaters (3 a side) and a goalie each, the puck, the rules. The simulation draws only from srand() and
 * never touches the screen; the screen and the sound hear it through fx(). Team 0 attacks east (it defends the west goal).
 * ---- */
const PUCK_R = 1.6, SK_R = 7, PUCK_G = 260, CHECK_R = 15;
const SLOTS = ['C', 'W', 'D'];
let M = null;   // the match in play (null on the menus)
const dirOf = t => t === 0 ? 1 : -1;
const attackGoal = t => GX[1 - t];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const live = s => s.state !== 'down' && s.state !== 'bin' && s.state !== 'fight';

/** a new match: its teams, the arena's rink, the skaters on their faceoff spots, who the humans control */
function newMatch(cfg) {
  const arena = ARENAS[cfg.arena], map = buildRink(arena);
  M = { cfg, arena, map, teams: [], skaters: [], goalies: [], humans: [], phase: 'faceoff', timer: 1.4, period: 1, clock: T.periodLen,
    ot: false, score: [0, 0], boom: [0, 0], kab: [0, 0], shots: [0, 0], goals: [], hits: [0, 0], saves: [0, 0], fight: null, bannerT: 0, banner: '',
    puck: { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, prevTouch: null, shot: null, cool: 0, inNet: false, pass: null },
    drill: cfg.drill || null, lastFaceoff: null, stars: null, over: false, tieBreak: 0, tick: 0, seen: [] };
  for (let t = 0; t < 2; t++) {
    const base = TEAMS[cfg.teams[t]], def = Object.assign({}, base, { rate: Object.assign({}, base.rate), goalie: Object.assign({}, base.goalie) }), jersey = t === 0 ? def.home : def.away;
    M.teams.push({ t, def, jersey, pants: t === 0 ? '#1a1a22' : '#2a3a6a', trim: def.trim, skin: def.skin, hair: def.hair });
    for (let slot = 0; slot < 3; slot++) {
      const sk = { t, slot, name: def.skaters[slot], num: [9, 17, 4][slot] + t * 30, x: 0, y: 0, vx: 0, vy: 0, face: t === 0 ? 0 : PI, state: 'skate', st: 0,
        cool: 0, charge: 0, want: .5 + srand() * .5, turbo: 0, human: null, deke: 0, stats: { g: 0, a: 0, hits: 0, shots: 0, passes: 0 }, pen: 0 };
      sk.rig = new E.Humanoid({ size: 1.02, build: slot === 2 ? 'bulky' : 'heroic', hair: slot === 1 ? 'spiky' : 'short', hat: { style: 'helmet', color: jersey },
        colors: { cloth: jersey, pants: M.teams[t].pants, trim: def.trim, boot: '#1a1a20', hair: def.hair[slot], skin: def.skin[slot], belt: def.trim }, speedRef: 80 });
      M.skaters.push(sk);
    }
    const gl = { t, x: 0, y: 0, vx: 0, vy: 0, face: t === 0 ? 0 : PI, state: 'ready', st: 0, react: 0, target: CY, stats: { saves: 0, against: 0 } };
    gl.rig = new E.Humanoid({ size: 1.1, build: 'bulky', hair: 'short', hat: { style: 'helmet', color: '#e8e8ec' }, colors: { cloth: jersey, pants: '#e8e0c0', trim: def.trim, boot: '#1a1a20', hair: def.hair[0], skin: def.skin[0], belt: def.trim }, speedRef: 60 });
    M.goalies.push(gl);
  }
  // the humans: one a side first (the GULLS' rivals in the pictures), then the second side's, then each side's wing
  const order = [[0, 0], [1, 0], [0, 1], [1, 2]], n = Math.min(4, cfg.humans || 0);
  for (let i = 0; i < n; i++) { const [t, slot] = order[i], sk = M.skaters.find(s => s.t === t && s.slot === slot); const h = { p: cfg.inputs ? cfg.inputs[i] || null : game.players[i] || null, sk, i }; if (h.p) { sk.human = h; M.humans.push(h); } }
  M.teams.forEach(tm => tm.label = tm.def.name);
  M.grudge = M.skaters.map(() => M.skaters.map(() => 0)); M.fights = 0; M.playT = 0; M.challenge = null;
  itemsReset();
  faceoff(CX, CY, true);
  return M;
}
/** the formation: where a skater stands now (its own spot, given the puck), for a skater the AI moves */
function spotFor(sk) {
  const t = sk.t, d = dirOf(t), pk = M.puck, own = pk.owner && pk.owner.t === t, opp = pk.owner && pk.owner.t !== t;
  const px = pk.x, py = pk.y, gx = GX[t];
  let x, y;
  if (own) {
    if (sk.slot === 0) { x = px + d * 70; y = CY + (py < CY ? 60 : -60); }
    else if (sk.slot === 1) { x = px + d * 120; y = CY - 80; }
    else { x = px - d * 90; y = CY + 70; }
  } else {
    const k = sk.slot === 0 ? .35 : sk.slot === 1 ? .55 : .8;
    x = lerp(px, gx, k); y = sk.slot === 0 ? py : sk.slot === 1 ? CY - 60 : CY + 60;
    if (opp && sk.slot === 0) { x = lerp(px, gx, .3); y = lerp(py, CY, .3); }
  }
  return [clamp(x, 150, 970), clamp(y, 232, 568)];
}
/** a faceoff at (x, y): the teams line up, the ice is quiet a moment, then the puck drops */
function faceoff(x, y, first) {
  const pk = M.puck;
  M.phase = 'faceoff'; M.timer = first ? 1.6 : 1.6; pk.owner = null; pk.x = x; pk.y = y; pk.z = 0; pk.vx = pk.vy = pk.vz = 0; pk.inNet = false; pk.shot = null; pk.pass = null; pk.prevTouch = null; pk.lastTouch = null;
  for (const sk of M.skaters) {
    if (sk.state === 'bin') continue;
    const d = sk.t === 0 ? 1 : -1, slot = sk.slot, dx = slot === 0 ? -d * 10 : slot === 1 ? -d * 60 : -d * 120, dy = slot === 0 ? 0 : slot === 1 ? -60 : 60;
    sk.x = clamp(x + dx, 150, 970); sk.y = clamp(y + dy, 232, 568); sk.vx = sk.vy = 0; sk.face = sk.t === 0 ? 0 : PI; sk.state = 'skate'; sk.st = 0; sk.charge = 0; sk.cool = .5; sk.deke = 0;
  }
  for (const g of M.goalies) { g.x = GX[g.t] + dirOf(g.t) * 12; g.y = CY; g.vx = g.vy = 0; g.state = 'ready'; g.st = 0; g.face = g.t === 0 ? 0 : PI; }
  M.lastFaceoff = [x, y];
}
/** the puck is loose: out of play, a whistle, a face-off at the nearest spot */
function outOfPlay(by) {
  if (M.phase !== 'play') return;
  if (M.slips && M.slips.length) { M.slips = []; say('THE REFEREE PICKS UP THE OCTOPUS AND TWIRLS IT OVERHEAD.'); }
  const [x, y] = nearestFaceoff(M.puck.x, M.puck.y);
  fx('whistle'); say(pick(['WHISTLE! OUT OF PLAY.', 'THE PUCK IS OUT. THAT WENT OVER THE BOARDS.', 'WHISTLE. FACEOFF.'], Math.floor(srand() * 3)));
  M.phase = 'stop'; M.timer = 1.2; M.stopTo = [x, y]; M.puck.owner = null; M.puck.vx = M.puck.vy = 0;
}
/** the sim's events: what the screen and the booth hear. Sounds and particles only: nothing here changes the match. */
function fx(kind, x, y, extra) {
  if (kind === 'hit' && M) { M.punch = .45; waveStart(); }   // (the punch-in and the crowd)
  if (M) (M.evq || (M.evq = [])).push(kind);
  if (kind === 'horn') { A.sfx('horn'); }
  else if (kind === 'shot') A.sfx(extra && extra.slap ? 'slap' : 'wrist');
  else if (kind === 'whistle') A.sfx('whistle');
  else if (kind === 'thump') A.sfx('thump');
  else if (kind === 'hit') { A.sfx('hit'); P.sparks(x, y, 8, 12, null, { color: '#ffe08a' }); game.freeze(.06); game.shake(2); }
  else if (kind === 'glass') { A.sfx('glass'); P.bits(x, y, 14, 18, ['#bfe4f4', '#ffffff', '#8fd0f0']); game.shake(4); }
  else if (kind === 'save') { A.sfx('save'); P.sparks(x, y, 10, 14, null, { color: '#ffffff' }); }
  else if (kind === 'post') { A.sfx('post'); }
  else if (kind === 'block') A.sfx('thump');
  else if (kind === 'goal') { P.sparks(x, y, 18, 22, null, { color: '#ffe08a' }); P.ring(x, y, 6, 40, '#fff6c0', .5); game.shake(3); }
}
const say = (text, o) => { if (M) (M.sayq || (M.sayq = [])).push(text); if (M && M.cfg && M.cfg.attract) return; if (M) M.bannerT = 0; talkSay(text, o); };

/** a goal for team s (scored by sk, assisted by a teammate of the last touch) */
function goal(s, scorer, kab, x, y) {
  const pk = M.puck;
  M.score[s]++; M.phase = 'goal'; M.timer = 3.2; M.banner = 'GOAL!'; M.bannerT = 2.6;
  if (scorer) scorer.stats.g++;
  const assist = pk.prevTouch && pk.prevTouch.t === s && pk.prevTouch !== scorer ? pk.prevTouch : null;
  if (assist) assist.stats.a++;
  M.goals.push({ t: s, scorer: scorer ? scorer.name : '?', assist: assist ? assist.name : null, kab: !!kab, period: M.period, clock: M.clock, ot: M.ot });
  if (M.inSO) M.soGoalsT[s]++;
  if (!M.inSO) replayStart();
  waveStart();
  M.boom[s] = Math.min(100, M.boom[s] + 20 * T.boomGain); M.kab[1 - s] = 0;   // (a goal ends the other side's KABOOM)
  if (kab) fx('horn');
  if (M.organ) { M.boom[s] = Math.min(100, M.boom[s] + 30 * T.boomGain); say('DORIS PLAYS THE ORGAN! THE ARENA ROARS!'); }
  if (M.arena.id === 'yard') { M.slips = M.slips || []; M.slips.push({ x: 320 + srand() * 400, y: 320 + srand() * 160, r: 10 }); say('THE FANS THREW AN OCTOPUS ON THE ICE!'); }
  if (scorer && scorer.stats.g === 3) { hatTrick(scorer); }
  if (srand() < .25) throwItem();
  for (const sk of M.skaters) if (sk.t === s) { sk.state = 'celebrate'; sk.st = 2.6; }
  for (const g of M.goalies) if (g.t !== s) g.state = g.state === 'down' ? 'down' : 'ready';
  fx('horn'); fx('goal', x, y); say(pick(TEXT.goal, Math.floor(srand() * TEXT.goal.length)) + (scorer ? ' ' + scorer.name + ' SCORES FOR THE ' + M.teams[s].def.name + '!' : ''));
  if (M.ot) { M.over = true; }
}
/** a shot's outcome at a goal line: the goalie's save or the goal */
function goalPlane(k, px0, py0, pk) {
  const gl = M.goalies[k], line = GX[k], s = k === 0 ? 1 : 0, dy = Math.abs(pk.y - gl.y), size = M.teams[k].def.goalie.size, rfx = M.teams[k].def.goalie.rfx;
  const w = (6 + 2 * size) * (M.pads && M.pads[k] > 0 ? 1.35 : 1), slap = pk.shot && pk.shot.slap, kab = pk.shot && pk.shot.kab;
  let chance = T.saveBase + .02 * (rfx - 3) - (slap ? .08 : 0) - (kab ? .22 : 0) + (pk.shot ? 0 : .04);
  chance = clamp(chance, .05, .98);
  if (dy < w * (kab ? .8 : 1) && srand() < chance) {
    gl.stats.saves++; M.saves[k]++; M.shots[s]++; gl.stats.against++; M.boom[k] = Math.min(100, M.boom[k] + 5 * T.boomGain); M.boom[s] = Math.min(100, M.boom[s] + 4 * T.boomGain);
    pk.x = line + (k === 0 ? 2.5 : -2.5); pk.vx = -pk.vx * .3; pk.vy = (srand() - .5) * 150; pk.vz = 0; pk.z = 2; pk.shot = null;
    if (srand() < .3) { pk.owner = null; M.phase = 'stop'; M.timer = 1.3; M.stopTo = nearestFaceoff(pk.x, pk.y); pk.vx = pk.vy = 0; fx('whistle'); say('GOALIE HOLDS IT. WHISTLE.'); return true; }
    fx('save', pk.x, pk.y); say(pick(TEXT.save, Math.floor(srand() * TEXT.save.length)));
    gl.state = 'save'; gl.st = .4;
    return true;
  }
  // a goal: the puck crosses the line inside the mouth, under the bar
  M.shots[s]++; gl.stats.against++; M.boom[s] = Math.min(100, M.boom[s] + 4 * T.boomGain);
  const scorer = pk.lastTouch && pk.lastTouch.t === s ? pk.lastTouch : null;
  if (kab && dy < 22) { gl.state = 'down'; gl.st = 1.2; }
  pk.inNet = true; pk.x = line + (k === 0 ? -6 : 6); pk.y = clamp(pk.y, CY - 12, CY + 12); pk.vx = pk.vy = 0; pk.z = 0; pk.vz = 0;
  goal(s, scorer, kab, pk.x, pk.y);
  return true;
}
/** the puck's crossing of a goal line: a goal, a save, or the crossbar and posts (the puck bounces back) */
function tryGoal(px0, py0, pk) {
  for (const k of [0, 1]) {
    const line = GX[k], crossed = k === 0 ? (px0 > line && pk.x <= line && pk.vx < 0) : (px0 < line && pk.x >= line && pk.vx > 0);
    if (!crossed) continue;
    const inMouth = Math.abs(pk.y - CY) < MOUTH - 1;
    if (!inMouth || pk.z >= BAR_Z) {
      pk.x = line + (k === 0 ? 2.5 : -2.5); pk.vx = -pk.vx * .5;   // (behind the goal line, outside the mouth: the posts and the net's frame)
      if (inMouth) { fx('post'); say('HIGH! OVER THE BAR.'); }
      else if (Math.abs(pk.y - CY) < MOUTH + 3) { fx('post'); say('OFF THE POST! SO CLOSE!'); }
      return false;
    }
    return goalPlane(k, px0, py0, pk);
  }
  return false;
}
/** a glass panel breaks: the cell is open ice from then on, the puck and the bodies can leave the rink through it */
function breakGlass(cx, cy, by, speed) {
  if (M.map.cell(cx, cy) !== 2) return;
  M.cracked = M.cracked || new Set();
  const key = cx + ',' + cy;
  // a first hit only cracks the panel (BOOM +8); a hard hit, or a second one, shatters it (BOOM +15)
  if (!M.cracked.has(key) && (speed || 0) < 240) { M.cracked.add(key); M.boom[by] = Math.min(100, M.boom[by] + 8 * T.boomGain); fx('thump'); say('THE GLASS CRACKS!'); return; }
  M.map.set(cx, cy, 0);
  const x = (cx + .5) * TC, y = (cy + .5) * TC;
  fx('glass', x, y); say(pick(TEXT.glass, Math.floor(srand() * TEXT.glass.length)));
  M.boom[by] = Math.min(100, M.boom[by] + 15 * T.boomGain);
  if (by === 0) M.glassBreaks = (M.glassBreaks || 0) + 1;
}
/** the puck's own step: friction, gravity, the boards, the goal, the pickup (4 substeps a step) */
function puckStep(dt) {
  const pk = M.puck;
  if (pk.inNet) { pk.vx = pk.vy = 0; return; }
  if (pk.owner) {
    const o = pk.owner;
    if (o.state === 'down' || o.state === 'bin') { pk.owner = null; pk.vx = o.vx * 1.2; pk.vy = o.vy * 1.2; pk.vz = 40; fx('thump'); }
    else { pk.x = o.x + Math.cos(o.face) * 10; pk.y = o.y + Math.sin(o.face) * 10; pk.z = 0; pk.vx = o.vx; pk.vy = o.vy; pk.vz = 0; return; }
  }
  pk.cool = Math.max(0, pk.cool - dt);
  const N = 4, h = dt / N;
  for (let i = 0; i < N; i++) {
    const sp0 = Math.hypot(pk.vx, pk.vy);
    if (sp0 > 0) { const k = Math.max(0, sp0 - (T.puckFriction + .12 * sp0) * h) / sp0; pk.vx *= k; pk.vy *= k; }
    if (pk.z > 0 || pk.vz !== 0) {
      pk.vz -= PUCK_G * h; pk.z += pk.vz * h;
      if (pk.z <= 0) { pk.z = 0; if (pk.vz < -60) { pk.vz = -pk.vz * .35; pk.vx *= .92; pk.vy *= .92; fx('thump'); } else pk.vz = 0; }
    }
    const px0 = pk.x, py0 = pk.y;
    pk.x += pk.vx * h; pk.y += pk.vy * h;
    if (tryGoal(px0, py0, pk)) return;
    const hit = pushOut(M.map, pk, PUCK_R);
    if (hit) {
      const id = hit.id || 0, wallH = id === 2 ? GLASS_H : BOARD_H;
      if (pk.z > wallH + 1 && id) { outOfPlay(); return; }   // over the glass: out of play
      const spd = Math.hypot(pk.vx, pk.vy);
      const vn = pk.vx * hit.nx + pk.vy * hit.ny;
      const rb = M.arena.id === 'pond' ? .3 : T.puckBounce;   // (the pond's snowbanks give little)
      if (vn < 0) { pk.vx -= (1 + rb) * vn * hit.nx; pk.vy -= (1 + rb) * vn * hit.ny; }
      if (id === 2 && (spd > T.glassBreak * 1.4 || (pk.shot && pk.shot.kab)) && pk.z < GLASS_H) { breakGlass(hit.cx, hit.cy, pk.lastTouch ? pk.lastTouch.t : 0, spd); }
      else if (spd > 40) fx('thump');
    }
    if (sdRect(pk.x, pk.y) > 3) { outOfPlay(); return; }
  }
  // the pickup: a loose puck on the ice goes to the first skater whose stick reaches it
  if (!pk.owner && pk.z < 6) {
    for (const sk of M.skaters) {
      if (!live(sk) || sk.cool > 0 || pk.cool > 0) continue;
      // (GRANDMA'S TAPE: a pass from a taped skater can't be taken by the other side)
      if (pk.pass && pk.pass.tape && pk.pass.from && sk.t !== pk.pass.from.t) continue;
      const d = Math.hypot(pk.x - (sk.x + Math.cos(sk.face) * 10), pk.y - (sk.y + Math.sin(sk.face) * 10));
      if (d < T.pickupRad) {
        const sp = Math.hypot(pk.vx, pk.vy);
        if (sp < 200) {
          pk.owner = sk; pk.shot = null;
          if (pk.pass && pk.pass.from && pk.pass.from.t === sk.t && pk.pass.from !== sk) { M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 2 * T.boomGain); sk.stats.passes++; M.passes = (M.passes || 0) + 1; if (M.drill && M.drill.kind === 'pass') M.drill.done = (M.drill.done || 0) + 1; }
          pk.pass = null;
          if (pk.lastTouch !== sk) { pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; }
          pk.vx = sk.vx; pk.vy = sk.vy; sk.want = .5 + srand() * .5;
          break;
        }
      }
    }
  }
  // the bodies block the puck (a shot blocked is a block)
  if (!pk.owner) for (const sk of M.skaters) {
    if (sk.state === 'bin' || pk.z > 6 || (pk.shot && pk.shot.by === sk.t)) continue;   // (above the shins, a shot goes over a body; a team's own shot goes past its own)
    const dx = pk.x - sk.x, dy = pk.y - sk.y, d = Math.hypot(dx, dy);
    if (d < SK_R + PUCK_R && d > 0) {
      const vn = pk.vx * dx / d + pk.vy * dy / d;
      if (vn < 0) { pk.vx -= 1.8 * vn * dx / d; pk.vy -= 1.8 * vn * dy / d; }
      pk.x = sk.x + dx / d * (SK_R + PUCK_R); pk.y = sk.y + dy / d * (SK_R + PUCK_R);
      if (pk.shot && pk.shot.by !== sk.t) { M.blocks = (M.blocks || 0) + 1; fx('block'); say(pick(['BLOCKED! A DEFENDER GETS HIS BODY IN THE WAY.', 'SHOT BLOCKED. WHAT A SACRIFICE.'], Math.floor(srand() * 2))); if (pk.shot.kab && live(sk)) { sk.state = 'down'; sk.st = 1.2; sk.vx = sk.vy = 0; fx('hit', sk.x, sk.y); } }
      pk.shot = null;
    }
  }
}
/** a one-timer: the receiver shoots as the pass arrives (a faster shot, half the error, and BOOM +6 for the team) */
function oneTimer(sk, aim) {
  M.puck.pass = null; M.oneTimers = (M.oneTimers || 0) + 1; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 6 * T.boomGain);
  say('ONE-TIMER! ' + sk.name + ' FIRES IT!');
  shoot(sk, .85, aim, true);
}
/** a deke beats the defender it was facing: the defender is left behind (BOOM +6, once per deke) */
function dekeBeatCheck(sk) {
  const foe = sk.dekeFoe;
  if (!foe || sk.dekeBeat || sk.deke <= 0 || !live(foe)) return;
  if (Math.cos(angDiff(Math.atan2(foe.y - sk.y, foe.x - sk.x), sk.face)) < -.3) { sk.dekeBeat = true; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 6 * T.boomGain); say('DEKE BEAT! ' + foe.name + ' IS LEFT SPINNING.'); }
}
/** a skater's stick: the shot, the pass, the check, the deke and the poke */
function actOwner(sk, c, dt) {
  if (c.pass) passPuck(sk, c.aim, c.lob);
  else if (c.lob) passPuck(sk, c.aim, true);
  else if (c.deke) { sk.deke = .45; sk.cool = .3; const side = c.aimSide || (srand() < .5 ? 1 : -1); sk.dekeDir = side; sk.dekeFoe = M.skaters.find(o => o.t !== sk.t && live(o) && dist(o, sk) < 30 && Math.cos(angDiff(Math.atan2(o.y - sk.y, o.x - sk.x), sk.face)) > .3) || null; sk.dekeBeat = false; }
  if (c.shootHeld && sk.cool <= 0) sk.charge = Math.min(1, sk.charge + (M.kab[sk.t] > 0 ? 2 : 1) * dt / T.chargeTime);
  if (c.shootUp) { const ch = sk.charge; sk.charge = 0; shoot(sk, Math.max(.1, ch), c.aim); }
}
/** a pass to the teammate the stick points at, or the mouse's, led to where it is going; a saucer if lob */
function passPuck(sk, aim, lob) {
  M.passTries = M.passTries || [0, 0]; M.passTries[sk.t]++;
  const t = sk.t, mates = M.skaters.filter(m => m.t === t && m !== sk && live(m));
  let tgt = null;
  if (aim && aim.x !== undefined) { tgt = mates.slice().sort((a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y))[0]; if (tgt && Math.hypot(tgt.x - aim.x, tgt.y - aim.y) > 80) tgt = null; }
  if (!tgt) {
    let best = -1e9;
    for (const m of mates) { const a = Math.atan2(m.y - sk.y, m.x - sk.x), da = angDiff(a, sk.face), d = dist(sk, m); if (Math.abs(da) < 1.1 && -d * .5 + Math.cos(da) * 60 > best) { best = -d * .5 + Math.cos(da) * 60; tgt = m; } }
  }
  const pas = M.teams[t].def.rate.pas, d0 = tgt ? dist(sk, tgt) : 120;
  const sp = clamp(d0 * 1.5 + 90, 150, T.passSpeed * 1.4) * (.92 + .03 * pas);
  let tx, ty;
  if (tgt) { const lead = Math.min(.6, d0 / sp); tx = tgt.x + tgt.vx * lead * .8; ty = tgt.y + tgt.vy * lead * .8; }
  else { tx = sk.x + Math.cos(sk.face) * 120; ty = sk.y + Math.sin(sk.face) * 120; }
  const a = Math.atan2(ty - sk.y, tx - sk.x) + (srand() - .5) * .05 * (1.3 - .1 * pas);
  const pk = M.puck, dd = Math.hypot(tx - sk.x, ty - sk.y), tf = dd / sp;
  pk.owner = null; pk.x = sk.x + Math.cos(a) * 10; pk.y = sk.y + Math.sin(a) * 10; pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp;
  pk.vz = lob ? .5 * PUCK_G * tf : 0; pk.z = lob ? 0 : 0; pk.shot = null; pk.pass = { from: sk, to: tgt, t: 0 }; pk.cool = .2;
  pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; sk.cool = .3; sk.stats.passes += 0; A.sfx('kick');
  if (pk.pass) pk.pass.tape = sk.tape > 0;
  if (tgt && sk.human && !tgt.human) { tgt.human = sk.human; sk.human.sk = tgt; sk.human = null; }   // the human's control goes with the pass
}
/** a shot: a wrist shot on a tap, a slapshot off the wind-up; aimed at the goal's mouth (the open side by default) */
function shoot(sk, charge, aim, oneT) {
  M.tries = M.tries || [0, 0]; M.tries[sk.t]++;
  const t = sk.t, gx = attackGoal(t), g = M.goalies[1 - t], slap = charge > .55, kab = M.kab[t] > 0, kabShot = kab && charge >= .95, lum = sk.lumber > 0;
  let ty;
  if (aim && aim.y !== undefined) ty = clamp(aim.y, CY - 14, CY + 14);
  else ty = g.y < CY ? CY + 12 : CY - 12;
  if (!kabShot && !lum) ty += (srand() - .5) * 2 * (1 - .4 * charge) * 5 * T.shotErr * (1.3 - .1 * M.teams[t].def.rate.sht) * (oneT ? .5 : 1);
  const sht = M.teams[t].def.rate.sht, sp = kabShot ? 760 : (T.shotSpeed + T.slapGain * charge) * (.85 + .05 * sht) * (lum ? 1.3 : 1) * (oneT ? 1.15 : 1);
  if (lum) sk.lumber--;
  const dd = Math.hypot(gx - sk.x, ty - sk.y), tf = dd / sp, zt = slap ? 6 + 10 * charge : 3 + 3 * srand();
  const vz = zt / tf + .5 * PUCK_G * tf, a = Math.atan2(ty - sk.y, gx - sk.x);
  const pk = M.puck;
  pk.owner = null; pk.x = sk.x + Math.cos(a) * 10; pk.y = sk.y + Math.sin(a) * 10; pk.z = 4; pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp; pk.vz = vz;
  pk.shot = { by: t, slap, kab: kabShot, from: sk.name }; pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; pk.cool = .2; sk.cool = .4; sk.stats.shots++;
  fx('shot', 0, 0, { slap });
}
/** a check: a lunge at a rival within reach (the contact is resolved in contacts()) */
function check(sk) { if (sk.state === 'check' || sk.cool > 0) return; M.checks = M.checks || [0, 0]; M.checks[sk.t]++; sk.state = 'check'; sk.st = .3; sk.cool = .6; sk.vx += Math.cos(sk.face) * 60; sk.vy += Math.sin(sk.face) * 60; }
/** the bodies: a check's contact, its power, the outcome: a bump, a check, or a big hit (down, BOOM, crowd) */
function contacts(dt) {
  for (const a of M.skaters) for (const b of M.skaters) {
    if (a.t !== 0 || b.t !== 1 || !live(a) || !live(b)) continue;
    const d = dist(a, b);
    if (d > CHECK_R) continue;
    if (d < 2 * SK_R && d > 0) { const dx = (a.x - b.x) / d, dy = (a.y - b.y) / d, push = (2 * SK_R - d) * .5; a.x += dx * push; a.y += dy * push; b.x -= dx * push; b.y -= dy * push; }
    if (a.state === 'check' || b.state === 'check') {
      const att = a.state === 'check' ? a : b, tg = att === a ? b : a;
      if (tg.state === 'check' || tg.state === 'fight' || tg.state === 'bin') continue;
      if (tg.state === 'down') continue;
      const sp = Math.hypot(att.vx, att.vy), ha = M.teams[att.t].def.rate.hit, kab = M.kab[att.t] > 0, tb = att.turbo > 0;
      const power = (sp * .6 + 25) * (.8 + .067 * ha) * T.checkPower * (tb ? 1.2 : 1) * (kab ? 2 : 1) * (att.poutine > 0 ? 1.6 : 1);
      att.state = 'skate'; att.st = 0;
      const hadPuck = M.puck.owner === tg;
      addGrudge(tg, att, power >= 90 ? 10 : 2);
      if (power < 90) { tg.vx += (tg.x - att.x) / (d || 1) * 25; tg.vy += (tg.y - att.y) / (d || 1) * 25; if (hadPuck && srand() < .3) { loosen(tg, att); } }
      else if ((power < T.bigHit && !(att.poutine > 0)) || tg.poutine > 0) { M.boom[att.t] = Math.min(100, M.boom[att.t] + 6 * T.boomGain); tg.state = 'stagger'; tg.st = .5; tg.vx += (tg.x - att.x) / (d || 1) * 50; tg.vy += (tg.y - att.y) / (d || 1) * 50; if (hadPuck && srand() < .5 && !tg.tape) loosen(tg, att); fx('thump'); }
      else {
        const bank = M.arena.id === 'pond' && sdRect(tg.x, tg.y) > -14;   // (a big hit into a snowbank buries the skater)
        thinIceHit(tg, 100); tg.state = bank ? 'buried' : 'down'; tg.st = bank ? 1.5 : 1.2; tg.vx = (tg.x - att.x) / (d || 1) * 140; tg.vy = (tg.y - att.y) / (d || 1) * 140; M.hits[att.t]++;
        if (hadPuck) loosen(tg, att);
        addGrudge(tg, att, 35); M.boom[att.t] = Math.min(100, M.boom[att.t] + 18 * T.boomGain); fx('hit', (a.x + b.x) / 2, (a.y + b.y) / 2);
        M.banner = 'BIG HIT!'; M.bannerT = 1.4; say(pick(TEXT.hit, Math.floor(srand() * TEXT.hit.length)));
        att.stats.hits++;
      }
    }
  }
}
/** the puck comes loose from its carrier, bouncing away from the hitter */
function loosen(tg, att) { const pk = M.puck; if (pk.owner !== tg) return; pk.owner = null; pk.vx = (tg.x - att.x) * 6; pk.vy = (tg.y - att.y) * 6; pk.z = 0; pk.vz = 30; pk.cool = .2; }

/** the human's intent: the stick and the buttons as the player gave them (edges where a press counts once) */
function humanCtrl(h) {
  const I = h.p, mv = I.move(), c = { mx: mv[0], my: mv[1], turbo: I.down('turbo'), pass: I.pressed('pass'), shootHeld: I.down('shoot'), shootUp: I.released('shoot'),
    check: I.pressed('shoot'), deke: I.pressed('deke'), lob: I.pressed('lob'), switch: I.pressed('switch'), chirp: I.pressed('chirp'), lobHeld: I.down('lob'), aim: null, aimSide: 0 };
  if (I.lastDevice === 'mouse' && game.mouseGround) { try { const m = game.mouseGround(); if (m) c.aim = { x: m[0] !== undefined ? m[0] : m.x, y: m[1] !== undefined ? m[1] : m.y }; } catch (e) { /* (no mouse on the ice) */ } }
  if (!c.aim && (Math.abs(mv[1]) > .4)) c.aim = { y: CY + mv[1] * 14 };
  c.aimSide = mv[0] >= 0 ? 1 : -1;
  if (c.pass) I.consume('pass'); if (c.lob) I.consume('lob'); if (c.deke) I.consume('deke');
  return c;
}
/** the CPU's intent for a skater: its formation spot, the puck, the shot's wind-up, the pass or the check */
function aiCtrl(sk, dt) {
  const c = { mx: 0, my: 0, turbo: false, pass: false, shootHeld: false, shootUp: false, check: false, deke: false, lob: false, switch: false, aim: null, aimSide: 0 };
  const pk = M.puck, t = sk.t, d = dirOf(t), skill = T.cpuSkill, has = pk.owner === sk;
  if (has) {
    const gx = attackGoal(t), dg = Math.hypot(gx - sk.x, CY - sk.y), foe = M.skaters.find(o => o.t !== t && live(o) && dist(o, sk) < 22);
    const a = Math.atan2(CY - sk.y, gx - sk.x);
    c.mx = Math.cos(a) * .8; c.my = Math.sin(a) * .8;
    const inFront = (gx - sk.x) * d > 8 && (Math.abs(sk.y - CY) < 75 || dg < 150);   // (close in, from the corner too; the crease keeps a skater 26 out)
    if (dg < 300 && inFront && sk.cool <= 0) { c.shootHeld = sk.charge < sk.want; c.shootUp = !c.shootHeld; c.aim = { y: sk.y < CY ? CY + 10 : CY - 10 }; }
    else if (foe && sk.cool <= 0 && dg > 200) { const mate = M.skaters.some(m => m.t === t && m !== sk && live(m) && dist(m, sk) < 130); if (mate && srand() < dt * 1.6 * skill) c.pass = true; c.mx = -d * .2; c.my = (sk.y < CY ? 1 : -1) * .4; }
    else if (dg < 260) { c.mx = Math.cos(a + (srand() - .5) * .5); c.my = Math.sin(a); }
    c.turbo = dg > 160 && srand() < dt * .4 * skill;
    return c;
  }
  // the chaser: the skater nearest the loose puck, or the one the puck's owner opposes; the others hold their spots
  const team = M.skaters.filter(o => o.t === t && live(o));
  // (a defenceman (slot 2) leaves his zone only for a puck near his own net)
  const ordered = team.slice().sort((x, y) => dist(x, pk) - dist(y, pk));
  const chaser = ordered.find(o => o.slot !== 2 || Math.hypot(pk.x - GX[t], pk.y - CY) < 280) || ordered[0];
  let tx, ty;
  if (sk === chaser && (!pk.owner || pk.owner.t !== t)) { tx = pk.x; ty = pk.y; }
  else [tx, ty] = spotFor(sk);
  if (sk !== chaser && !pk.owner && M.items) { const it = M.items.filter(i => i.landed && !i.taken).sort((p, q) => Math.hypot(p.x - sk.x, p.y - sk.y) - Math.hypot(q.x - sk.x, q.y - sk.y))[0]; if (it && Math.hypot(it.x - sk.x, it.y - sk.y) < 120) { tx = it.x; ty = it.y; } }   // (item greed: a skater not in the play goes for a power-up)
  const dx = tx - sk.x, dy = ty - sk.y, dd = Math.hypot(dx, dy);
  if (dd > 5) { c.mx = dx / dd; c.my = dy / dd; }
  c.turbo = sk === chaser && dd > 60 && srand() < dt * .3 * skill;
  // a CPU receiver takes a one-timer when the pass arrives on its stick
  if (pk.pass && pk.pass.to === sk && !pk.owner && dist(sk, pk) < 40 && sk.cool <= 0 && srand() < dt * 3 * skill) c.check = true;
  if (sk === chaser && pk.owner && pk.owner.t !== t && dist(pk.owner, sk) < 16 && sk.cool <= 0 && srand() < dt * 1.2 * skill * (M.teams[t].def.rate.hit / 3)) c.check = true;
  return c;
}
/** a skater's step: its intent (a human's or the CPU's), its speed and turns, the shots, the checks */
function skaterStep(sk, dt) {
  sk.cool = Math.max(0, sk.cool - dt); sk.deke = Math.max(0, sk.deke - dt); sk.turbo = Math.max(0, sk.turbo - dt); effectsStep(sk, dt);
  if (sk.state === 'down' || sk.state === 'stagger' || sk.state === 'celebrate' || sk.state === 'fight' || sk.state === 'bin' || sk.state === 'slip' || sk.state === 'buried' || sk.state === 'frozen') {
    if (sk.state === 'bin') { sk.st -= dt; if (sk.st <= 0) { sk.state = 'skate'; const [x, y] = spotFor(sk); sk.x = x; sk.y = y; } }
    else { sk.st -= dt; if (sk.st <= 0) sk.state = sk.state === 'celebrate' ? 'skate' : 'skate'; }
    if (sk.state !== 'celebrate') { sk.vx *= Math.exp(-dt * 4); sk.vy *= Math.exp(-dt * 4); }
    sk.x += sk.vx * dt; sk.y += sk.vy * dt; pushOut(M.map, sk, SK_R); return;
  }
  if (sk.state === 'check') { sk.st -= dt; if (sk.st <= 0) sk.state = 'skate'; }
  const c = sk.human ? humanCtrl(sk.human) : aiThink(sk, dt);
  if (sk.human && sk.human.sk !== sk) sk.human = null;
  const kabT = M.kab[sk.t] > 0 || sk.sauce > 0, turboOn = (kabT || c.turbo) && (kabT || (sk.stam ?? 1) > 0) && Math.hypot(sk.vx, sk.vy) > 20;   // (a KABOOM team has infinite turbo)
  sk.stam = clamp((sk.stam ?? 1) + (turboOn && !kabT ? -T.turboDrain * dt : .3 * dt), 0, 1);
  if (turboOn) sk.turbo = .2;
  const pkOwner = M.puck.owner === sk, spd = T.skateMax * (.85 + .05 * M.teams[sk.t].def.rate.spd) * (turboOn ? T.turboMul : 1) * (sk.cocoa > 0 ? 1.2 : 1) *
    (pkOwner ? .94 : 1) * (sk.charge > 0 && pkOwner ? .6 : 1) * (M.kab[sk.t] > 0 ? 1.08 : 1) * (sk.human ? 1 : T.cpuSkill);
  let mx = c.mx, my = c.my; const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  const tvx = mx * spd, tvy = my * spd, s0 = Math.hypot(sk.vx, sk.vy);
  const accel = T.skateAccel * (m > 0 && Math.hypot(sk.vx, sk.vy) > 0 && (mx * sk.vx + my * sk.vy) < 0 ? 2.2 : 1);   // hockey stops: hard against the way it goes
  sk.vx = approach(sk.vx, tvx, accel * dt); sk.vy = approach(sk.vy, tvy, accel * dt);
  if (m > .15) sk.face = E.approachAng(sk.face, Math.atan2(my, mx), dt * 9);
  if (c.check) check(sk);
  // with the puck: the shot's wind-up, the pass, the lob
  if (pkOwner) actOwner(sk, c, dt);
  else if (c.check && M.puck.pass && M.puck.pass.to === sk && !M.puck.owner && dist(sk, M.puck) < 40 && sk.cool <= 0) oneTimer(sk, c.aim);
  else if (c.check) check(sk);
  if (c.switch && sk.human) switchHuman(sk.human);
  if (!pkOwner) challengeStep(sk, c, dt);
  if (c.chirp && sk.human) { M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 3 * T.boomGain); const line = pick(TEXT.chirp, Math.floor(srand() * TEXT.chirp.length)); M.bubble = { sk, text: line, t: 2.4 }; if (srand() < .6) say(line + ' (' + sk.name + ')'); }
  sk.x += sk.vx * dt; sk.y += sk.vy * dt;
  dekeBeatCheck(sk);
  pushOut(M.map, sk, SK_R);
  for (const gx of GX) { const dx = sk.x - gx, dy = sk.y - CY, dd = Math.hypot(dx, dy); if (dd < 26 && dd > 0) { sk.x = gx + dx / dd * 26; sk.y = CY + dy / dd * 26; } }
  const nr = NETS.find(n => sk.x > n.x0 - SK_R && sk.x < n.x1 + SK_R && sk.y > n.y0 - SK_R && sk.y < n.y1 + SK_R);
  if (nr) { sk.x = clamp(sk.x, nr.x0 - SK_R, nr.x1 + SK_R); }
  // a glass panel a body is driven through at speed breaks
  const cx = Math.floor(sk.x / TC), cy = Math.floor(sk.y / TC);
  if (M.map.cell(cx, cy) === 2 && Math.hypot(sk.vx, sk.vy) > T.glassBreak * .5) breakGlass(cx, cy, sk.t, Math.hypot(sk.vx, sk.vy));
}
/** a team's switch: the human moves to the teammate nearest the puck who has no human */
function switchHuman(h) {
  const mates = M.skaters.filter(m => m.t === h.sk.t && live(m) && !m.human);
  if (!mates.length) return;
  const m = mates.slice().sort((a, b) => dist(a, M.puck) - dist(b, M.puck))[0];
  h.sk.human = null; m.human = h; h.sk = m;
}
/** the goalie: the arc in front of the goal, the reaction to a shot, the save poke */
function goalieStep(g, dt) {
  if (M.inSO && M.phase === 'so' && soGoalieStep(g, dt)) return;
  if (g.state === 'down') { g.st -= dt; if (g.st <= 0) { g.state = 'ready'; } g.vx *= Math.exp(-dt * 3); g.vy *= Math.exp(-dt * 3); g.x += g.vx * dt; g.y += g.vy * dt; return; }
  if (g.state === 'save') { g.st -= dt; if (g.st <= 0) g.state = 'ready'; }
  const dir = dirOf(g.t), pk = M.puck, def = M.teams[g.t].def.goalie, gl = GX[g.t];
  const toGoal = (pk.vx < 0 && g.t === 0) || (pk.vx > 0 && g.t === 1);
  const goalDist = Math.abs(pk.x - gl);
  let depth = 10 + clamp(goalDist / 40, 0, 14);
  if (goalDist < 60 && pk.z < 6) depth = 6;
  // the reaction: a shot at the goal is read after the goalie's reaction time; until then it holds its spot
  if (toGoal && pk.shot) g.react = Math.max(0, g.react - dt); else g.react = T.goalieReact - (M.kab[g.t] > 0 ? .03 : 0);
  let ty;
  if (toGoal && pk.shot && g.react <= 0) { const tc = goalDist / Math.max(1, Math.abs(pk.vx)); ty = clamp(pk.y + pk.vy * tc, CY - MOUTH - 4, CY + MOUTH + 4); }
  else if (toGoal && pk.shot) ty = g.y;
  else if (pk.owner && pk.owner.t !== g.t && toGoal) ty = clamp(pk.y + pk.vy * .2, CY - MOUTH, CY + MOUTH);
  else ty = clamp(pk.y * .8 + CY * .2, CY - MOUTH - 2, CY + MOUTH + 2);
  if ((pk.x - gl) * dir < -12 && goalDist > 60) ty = pk.y < CY ? CY - 14 : CY + 14;   // (the puck is behind the net: hug the post)
  const tx = gl + dir * depth;
  const sp = T.goalieSpeed * (.85 + .05 * def.rfx);
  const dx = tx - g.x, dy = ty - g.y;
  g.vx = approach(g.vx, clamp(dx * 4, -sp, sp), 900 * dt); g.vy = approach(g.vy, clamp(dy * 6, -sp, sp), 900 * dt);
  g.x += g.vx * dt; g.y += g.vy * dt;
  g.x = clamp(g.x, gl + dir * 4, gl + dir * 26);
  g.y = clamp(g.y, CY - 30, CY + 30);
  g.face = dir > 0 ? 0 : PI;
  pushOut(M.map, g, 8);
}
/** the clock and the periods: the period's end, the intermission, overtime, the final whistle */
function clockStep(dt) {
  if (M.phase === 'play') {
    M.clock -= dt;
    if (M.clock <= 0 && M.ot) { shootout(); return; }   // (overtime is one minute of sudden death; a tie then goes to a shootout)
    if (M.clock <= 0) {
      if (M.score[0] !== M.score[1] && M.period >= T.periods) { M.phase = 'over'; M.over = true; M.timer = 2; fx('horn'); say('FULL TIME! ' + M.teams[M.score[0] > M.score[1] ? 0 : 1].def.name + ' WIN IT.'); return; }
      if (M.period < T.periods) { M.period++; M.clock = T.periodLen; fx('horn'); say(pick(TEXT.period, 0)); M.phase = 'intermission'; M.floodWanted = M.cfg.mode !== 'session' && M.cfg.mode !== 'attract' && M.cfg.flood !== false && M.humans.length > 0 && game.settings.flood !== 'Never'; M.stopTo = [CX, CY]; return; }
      // a tie after regulation: overtime (sudden death: the next goal wins)
      M.ot = true; M.clock = 60; M.phase = 'stop'; M.timer = 2.2; M.stopTo = [CX, CY]; M.banner = 'OVERTIME'; M.bannerT = 2.2; fx('horn'); say('OVERTIME! SUDDEN DEATH. THE NEXT GOAL WINS IT.');
    }
  }
}
/** the shootout: three shots each, then sudden death; a shot's chance is the shooter's shot rating and the goalie's reflexes */
function shootout() { shootoutStart(); }
/** the KABOOM: a team with a full BOOM meter turns its shots into fireballs and its checks into walls, for a while */
function activateKaboom(t) { if (M.boom[t] < 100 || M.kab[t] > 0) return; M.boom[t] = 0; M.kab[t] = T.kaboomTime; M.banner = t === 1 && M.cfg.chapter === STORY.length - 1 ? 'GILDED MODE!' : 'KA-BOOM!'; M.bannerT = 2.5; say(pick(TEXT.kaboom, 0)); fx('horn'); game.shake(5); if (game.flash) game.flash('#ff8a3a', .25, .6); }

/** one step of the match (the engine runs 120 steps a second: the same inputs and seed give the same game) */
function matchStep(dt) {
  if (!M) return;
  M.tick++;
  histStep(); M.bubble && (M.bubble.t -= dt); M.waveT = Math.max(0, (M.waveT || 0) - dt); M.punch = Math.max(0, (M.punch || 0) - dt);
  if (!M.introDone && M.phase === 'faceoff' && M.period === 1 && M.cfg.mode !== 'attract' && M.cfg.mode !== 'practice') introduce();
  for (let t = 0; t < 2; t++) if (M.kab[t] > 0) { M.kab[t] = Math.max(0, M.kab[t] - dt); if (M.kab[t] === 0) say('KABOOM IS OVER. THE ICE IS QUIET AGAIN.'); }
  for (let t = 0; t < 2; t++) if (M.boom[t] >= 100) activateKaboom(t);
  M.bannerT = Math.max(0, M.bannerT - dt);
  if (M.phase === 'over') { M.timer -= dt; for (const sk of M.skaters) { sk.vx *= .9; sk.vy *= .9; sk.x += sk.vx * dt; sk.y += sk.vy * dt; if (sk.state === 'celebrate') sk.st -= dt; } return; }
  if (M.phase === 'intermission') { if (!M.floodWanted) faceoff(CX, CY); return; }   // (the Flood Wagon scene runs it when it's wanted)
  if (M.phase === 'faceoff') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt; if (M.timer <= 0) { M.phase = 'play'; const w = srand() < .5 ? 0 : 1, sk = M.skaters.filter(s => s.t === w && s.slot === 0)[0] || M.skaters.find(s => s.t === w); M.puck.owner = sk; M.puck.z = 0; M.puck.lastTouch = sk; M.puck.prevTouch = null; M.puck.cool = .2; sk.x = M.puck.x - (sk.t ? -10 : 10); sk.y = M.puck.y; }
    return;
  }
  if (M.phase === 'stop') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt;
    if (M.timer <= 0) { if (M.over) return; if (M.drillEnd) return; const [x, y] = M.stopTo || [CX, CY]; if (M.ot && M.period >= 4 && M.score[0] !== M.score[1]) { M.phase = 'over'; M.over = true; return; } faceoff(x, y); }
    return;
  }
  if (M.phase === 'so') { soStep(dt); return; }
  if (M.phase === 'goal' && M.replay) { replayStep(dt); return; }
  if (M.phase === 'goal') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt;
    if (M.timer <= 0) { if (M.inSO) { soNext(); return; } if (M.ot) { M.phase = 'over'; M.over = true; return; } faceoff(CX, CY); }
    return;
  }
  if (M.phase === 'fight') {
    fightStep(dt);
    if (M.fight) for (const sk of M.skaters) if (sk !== M.fight.a && sk !== M.fight.b) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    return;
  }
  // play
  M.playT = (M.playT || 0) + dt;
  challengeTick(dt); cpuChallenges(dt);
  for (const sk of M.skaters) skaterStep(sk, dt);
  for (const g of M.goalies) goalieStep(g, dt);
  // the skaters push each other apart
  for (let i = 0; i < M.skaters.length; i++) for (let j = i + 1; j < M.skaters.length; j++) {
    const a = M.skaters[i], b = M.skaters[j], d = dist(a, b);
    if (d < 2 * SK_R && d > 0 && a.t === b.t) { const dx = (a.x - b.x) / d, dy = (a.y - b.y) / d, p = (2 * SK_R - d) * .5; a.x += dx * p; a.y += dy * p; b.x -= dx * p; b.y -= dy * p; }
  }
  contacts(dt);
  itemsStep(dt);
  if (M.phase === 'play') puckStep(dt);
  if (M.phase === 'play') clockStep(dt);
  if (M.drill) drillStep(dt);
}
/** the drills: an objective and a clock; the drill ends when it is met or the time is up */
function drillStep(dt) {
  const d = M.drill; d.t = (d.t || 0) + dt;
  if (d.kind === 'wrist' && M.score[0] >= d.need) return drillDone(true);
  if (d.kind === 'pass' && (d.done || 0) >= d.need) return drillDone(true);
  if (d.kind === 'hit' && M.hits[0] >= d.need) return drillDone(true);
  if (d.kind === 'onGoal' && M.shots[0] >= d.need) return drillDone(true);
  if (d.kind === 'fight' && (M.fightWins || 0) >= d.need) return drillDone(true);
  if (d.kind === 'kaboom' && M.goals.some(g => g.kab && g.t === 0)) return drillDone(true);
  if (d.kind === 'glass' && (M.glassBreaks || 0) >= d.need) return drillDone(true);
  if (d.t >= d.limit) drillDone(false);
}
function drillDone(ok) { const d = M.drill; if (d.ended) return; d.ended = true; d.ok = ok; M.drillEnd = true; M.phase = 'over'; M.over = true; M.timer = 2; M.banner = ok ? 'DRILL COMPLETE' : 'TIME'; M.bannerT = 2.5; say(ok ? 'COACH MARGE: THAT IS HOW IT IS DONE.' : 'COACH MARGE: AGAIN. THIS TIME WITH YOUR HEAD UP.'); }
/** the three stars: who scored, who assisted, who hit; the goalie who saved the most */
function starsOf() {
  const pts = M.skaters.map(sk => ({ sk, p: sk.stats.g * 3 + sk.stats.a * 2 + sk.stats.hits * .5 + (sk.stats.passes * .1) + (sk.t === M.winner ? .5 : 0) })).filter(x => x.p > 0);
  pts.sort((a, b) => b.p - a.p);
  return pts.slice(0, 3).map(x => ({ name: x.sk.name, t: x.sk.t, g: x.sk.stats.g, a: x.sk.stats.a, hits: x.sk.stats.hits }));
}
