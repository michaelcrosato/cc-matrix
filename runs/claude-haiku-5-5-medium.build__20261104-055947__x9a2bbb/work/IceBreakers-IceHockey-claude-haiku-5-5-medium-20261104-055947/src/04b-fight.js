/* ---- FIGHTS and the sin bin (plan 7.11). A challenge needs a grudge of 40 or more; a CPU rival accepts with a chance
 * from its fighting and the grudge; a human rival accepts by pressing lob within three seconds; a turtle costs BOOM.
 * In the fight: balance 100, stamina 100 (regen 25 a second); four moves with their own timings; the loser sits in the
 * box for T.sinBin seconds of play, and the other side is on the power play. ---- */
const FIGHT_MOVE = {
  jab: { t: .25, at: .12, dmg: 6, stam: 8 },
  haymaker: { t: .8, at: .35, dmg: 18, stam: 22 },
  duck: { t: .35, stam: 10 },
  yank: { t: .3, at: .15, stam: 0 }
};
const FIGHT_KEYS = { pass: 'jab', shoot: 'haymaker', deke: 'duck', lob: 'yank' };
const FIGHT_TIME = 20, FIGHT_BALANCE = 100;
/** grudges: M.grudge[a][b] is what skater a holds against b (0..100) */
const grudgeOf = (a, b) => { const i = M.skaters.indexOf(a), j = M.skaters.indexOf(b); return i < 0 || j < 0 ? 0 : M.grudge[i][j]; };
const addGrudge = (a, b, v) => { const i = M.skaters.indexOf(a), j = M.skaters.indexOf(b); if (i >= 0 && j >= 0) M.grudge[i][j] = clamp(M.grudge[i][j] + v, 0, 100); };
const fighter = sk => ({ sk, bal: FIGHT_BALANCE, stam: 100, act: null, aT: 0, cool: 0, guard: 0, open: 0, blind: 0, duck: 0, yanks: [], hood: false, decideT: .3 + srand() * .4 });

/** a challenge: a human's lob held half a second near a rival with a grudge of 40 (a human rival accepts with lob) */
function challengeStep(sk, c, dt) {
  if (!M || M.fight || M.phase !== 'play') return;
  if (M.challenge) { if (M.challenge.of === sk && c.lob) { const ch = M.challenge; M.challenge = null; fightStart(ch.by, ch.of); } return; }
  if ((M.fights || 0) >= T.fightMax || (M.playT || 0) - (M.lastFightT ?? -999) < 60) return;
  if (sk.human && c.lobHeld) {
    sk.lobT = (sk.lobT || 0) + dt;
    if (sk.lobT >= .5) {
      sk.lobT = 0;
      const rival = M.skaters.find(o => o.t !== sk.t && live(o) && dist(o, sk) < 40 && grudgeOf(sk, o) >= 40);
      if (rival) requestFight(sk, rival);
    }
  } else sk.lobT = 0;
}
/** the challenge's three seconds: a human rival who doesn't press lob has turned it down */
function challengeTick(dt) {
  if (!M.challenge) return;
  M.challenge.t -= dt;
  if (M.challenge.t <= 0) { const ch = M.challenge; M.challenge = null; turtle(ch.by, ch.of); }
}
/** the challenge goes to the rival: a CPU accepts with its chance, a human has three seconds to press lob */
function requestFight(by, of) {
  if (!of.human) {
    const p = clamp(.4 + .12 * (M.teams[of.t].def.rate.fgt - 3) + grudgeOf(of, by) / 200, .1, .95);
    if (srand() < p) fightStart(by, of); else turtle(by, of);
    return;
  }
  M.challenge = { by, of, t: 3 };
  say(by.name + ' DROPS THE GLOVES! ' + of.name + ', PRESS LOB TO ACCEPT.');
}
/** a turtle: the one who won't fight loses BOOM and the challenger gains it; the crowd boos */
function turtle(by, of) {
  M.boom[of.t] = Math.max(0, M.boom[of.t] - 10); M.boom[by.t] = Math.min(100, M.boom[by.t] + 10);
  say(of.name + ' SKATES AWAY. THE CROWD BOOS.');
  fx('whistle');
}
/** the CPU's own challenge: a fighter with a grudge of 70 near a human-controlled skater drops the gloves now and then */
function cpuChallenges(dt) {
  if (M.challenge || M.fight || M.phase !== 'play' || (M.fights || 0) >= T.fightMax) return;
  for (const sk of M.skaters) {
    if (sk.human || !live(sk) || M.teams[sk.t].def.rate.fgt < 4) continue;
    const foe = M.skaters.find(o => o.human && o.t !== sk.t && live(o) && dist(o, sk) < 40 && grudgeOf(sk, o) >= 70);
    if (foe && srand() < dt * .2) { M.challenge = { by: sk, of: foe, t: 3 }; say(sk.name + ' DROPS THE GLOVES! ' + foe.name + ', PRESS LOB TO ACCEPT.'); return; }
  }
}
/** the fight: both skaters stop, the camera frames them, the gloves drop; it runs until a balance is gone or the time is up */
function fightStart(a, b) {
  if (M.fight || !live(a) || !live(b)) return;
  M.fights = (M.fights || 0) + 1; M.lastFightT = M.playT || 0; M.challenge = null;
  M.fight = { a, b, t: 0, A: fighter(a), B: fighter(b), view: null, last: '' };
  for (const sk of [a, b]) { sk.state = 'fight'; sk.st = FIGHT_TIME; sk.vx = sk.vy = 0; }
  a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = a.face + PI;
  M.fight.view = game.baseView; game.setView('brawler');
  M.phase = 'fight'; fx('whistle'); fx('crowd'); M.banner = 'FIGHT!'; M.bannerT = 1.6;
  P.bits(a.x, a.y, 4, 6, ['#d8d8e0', '#c8202a']); P.bits(b.x, b.y, 4, 6, ['#d8d8e0', '#c8202a']);
  say(pick(TEXT.fight, Math.floor(srand() * TEXT.fight.length)));
}
/** a move starts (its stamina is paid; a move with no stamina is slower: the fighter is tired) */
function startMove(F, name) {
  const spec = FIGHT_MOVE[name];
  F.act = { name, done: false }; F.aT = 0; F.stam = Math.max(0, F.stam - spec.stam);
  if (name === 'duck') { F.duck = FIGHT_MOVE.duck.t; }
}
/** the damage a hit does: the attacker's fighting, a guard down, a rival with the head of a jersey pulled */
function fightHit(A, B, dmg) {
  const f = M.fight, k = (.8 + .067 * M.teams[A.sk.t].def.rate.fgt) * (B.guard > 0 ? 1.3 : 1) * (A.open > 0 ? 1.5 : 1);
  B.bal = Math.max(0, B.bal - dmg * k);
  f.last = A.sk.name + ' HITS ' + B.sk.name;
}
/** a fighter's step: the move's active frame, the duck, the yank, the cooldown; then the CPU decides its next move */
function fighterStep(F, O, dt, human) {
  const slow = F.stam <= 0 ? .6 : 1;
  F.stam = Math.min(100, F.stam + 25 * dt);
  F.cool -= dt; F.guard -= dt; F.open -= dt; F.blind -= dt; F.duck -= dt;
  if (F.blind <= 0 && F.hood) F.hood = false;
  F.yanks = F.yanks.filter(t => M.fight.t - t < 4);
  if (F.act) {
    F.aT += dt * slow;
    const name = F.act.name, spec = FIGHT_MOVE[name];
    if (!F.act.done && spec.at !== undefined && F.aT >= spec.at) {
      F.act.done = true;
      if (name === 'jab') { if (O.duck > 0) fightHit(F, O, spec.dmg * .5); else fightHit(F, O, spec.dmg); }
      else if (name === 'haymaker') { if (O.duck > 0) { F.open = .5; M.fight.last = F.sk.name + ' WHIFFS'; } else fightHit(F, O, spec.dmg); }
      else if (name === 'yank') {
        O.guard = .6; O.stam = Math.max(0, O.stam - 15); F.yanks.push(M.fight.t);
        if (F.yanks.length >= 3) { O.blind = 1.5; O.hood = true; F.yanks = []; M.fight.last = F.sk.name + ' PULLS HIS JERSEY OVER HIS HEAD!'; }
      }
    }
    if (F.aT >= spec.t) { F.act = null; F.cool = name === 'duck' ? .4 : .15; }
  }
  if (!F.act && F.cool <= 0) {
    if (human) {
      const I = F.sk.human.p, pick = Object.keys(FIGHT_KEYS).find(k => I.pressed(k));
      if (pick) startMove(F, FIGHT_KEYS[pick]);
    } else {
      F.decideT -= dt;
      if (F.decideT <= 0) {
        F.decideT = .4 + srand() * .3;
        const cpuRate = M.teams[F.sk.t].def.rate.fgt;
        if (O.act && O.act.name === 'haymaker' && O.aT < FIGHT_MOVE.haymaker.at && srand() < .6 * T.cpuSkill) startMove(F, 'duck');
        else { const r = srand(); startMove(F, r < .45 ? 'jab' : r < .45 + .1 + .03 * cpuRate ? 'haymaker' : 'yank'); }
      }
    }
  }
}
/** one step of the fight (the clock stops; the play goes on when it ends) */
function fightStep(dt) {
  const f = M.fight;
  f.t += dt;
  const A = f.A, B = f.B;
  fighterStep(A, B, dt, !!f.a.human);
  fighterStep(B, A, dt, !!f.b.human);
  f.a.st = f.b.st = FIGHT_TIME - f.t;
  if (A.bal <= 0 || B.bal <= 0 || f.t >= FIGHT_TIME) fightEnd();
}
/** the end: a fighter down, the winner's cheer, the loser's box (or a draw, separated by the linesmen) */
function fightEnd() {
  const f = M.fight, A = f.A, B = f.B;
  M.fight = null;
  const winner = A.bal <= 0 && B.bal > 0 ? B : (B.bal <= 0 && A.bal > 0 ? A : null);   // (the time up is a draw, as the plan has it)
  if (f.view) game.setView(f.view);
  if (!winner) {
    for (const F of [A, B]) { F.sk.state = 'skate'; F.sk.st = 0; }
    M.boom[0] = Math.min(100, M.boom[0] + 10); M.boom[1] = Math.min(100, M.boom[1] + 10);
    M.phase = 'play'; M.banner = 'DRAW: THE LINESMEN SEPARATE THEM'; M.bannerT = 2.4;
    say('THE LINESMEN SEPARATE THEM. A DRAW, AND NO PENALTY.');
    return;
  }
  const loser = winner === A ? B : A;
  loser.sk.state = 'bin'; loser.sk.st = T.sinBin; loser.sk.pen = T.sinBin; loser.sk.vx = loser.sk.vy = 0;
  winner.sk.state = 'celebrate'; winner.sk.st = 2.2; winner.sk.vx = winner.sk.vy = 0;
  M.boom[winner.sk.t] = Math.min(100, M.boom[winner.sk.t] + 45 * T.boomGain); M.boom[loser.sk.t] = Math.min(100, M.boom[loser.sk.t] + 5 * T.boomGain);
  if (winner.sk.t === 0) M.fightWins = (M.fightWins || 0) + 1;
  addGrudge(loser.sk, winner.sk, 20);
  M.phase = 'play'; M.banner = winner.sk.name + ' WINS IT'; M.bannerT = 2.2;
  fx('crowd');
  say(winner.sk.name + ' WINS THE FIGHT. ' + loser.sk.name + ' TO THE SIN BIN FOR ' + T.sinBin + '. POWER PLAY!');
}
