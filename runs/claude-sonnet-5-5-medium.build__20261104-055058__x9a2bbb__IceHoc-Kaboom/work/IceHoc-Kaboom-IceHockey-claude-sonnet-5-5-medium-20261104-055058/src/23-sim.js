/* ---- SIM: match state, entity factories and shared helpers ---- */
const Sim = (() => {
  const S_ = { m: null };
  const blank = () => ({ mx: 0, my: 0, aim: null, turbo: false, shootHeld: false, lobHeld: false, press: { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 }, shootUp: false });
  function mkSkater(m, side, slot, team, away) {
    const def = team.skaters[slot], [name, nick, num, role, rt, hand, bulky] = def;
    const jersey = (away ? team.away : team.home).cloth;
    const s = { id: side * 10 + slot, kind: 's', side, slot, def, team, name, nick, num, role, hand: hand ? 1 : -1, bulky: !!bulky, big: !!bulky,
      rt: { spd: rt[0], sht: rt[1], pas: rt[2], hit: rt[3], fgt: rt[4], hnd: rt[5] }, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: side ? PI : 0, state: 'skate', st: 0, turbo: 1, turboIdle: 0, hasPuck: false,
      ctrl: { kind: 'cpu', input: null, seat: null }, intent: blank(), items: {}, grudge: {}, stats: { goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fights: 0, fightsWon: 0, topShot: 0, hat: 0 },
      rig: Rigs.skater(def, side, team, away, game.settings && S('retro') === 'On'), jersey, mass: bulky ? 1.35 : 1, pickCool: 0, cd: { deke: 0, chirp: 0, check: 0, poke: 0 }, holdShoot: 0, holdLob: 0, winding: false, charge: 0, lastTouchT: 0,
      aiT: 0, aiGoal: null, aiRole: '', recvT: 0, oneTimerT: 0, callT: 0, swing: 0, flipT: 0, bin: 0, rigState: null, spin: 0, slide: 0, hitBy: null, hitT: 0, skill: .55 };
    return s;
  }
  function mkGoalie(m, side, team, away) {
    const d = team.goalie, [name, nick, num, rt, voice, trait] = d, k = away ? team.away : team.home;
    return { id: 'g' + side, kind: 'g', side, team, name, nick, num, trait, rfx: rt[0], size: rt[1], reb: rt[2], def: { padCol: team.pads }, x: 0, y: 0, z: 0, heading: side ? PI : 0, state: 'ready', st: 0, save: null, react: 0, target: 0, jersey: k.cloth,
      rig: Rigs.goalie(d, team, away), saves: 0, shots: 0, blastT: 0, itemBig: 0, boss: team.id === 'grizzlies', bossCracked: false, kaboomHits: 0, vy: 0, pending: null, hand: 1, bulge: 0 };
  }
  const attackDir = (m, s) => m.end[s] === 0 ? 1 : -1;
  const ownGoalX = (m, s) => Rink.goalLineX(m.end[s]);
  const oppGoalX = (m, s) => Rink.goalLineX(m.end[1 - s]);
  const teamOf = (m, side) => m.sk.filter(s => s.side === side);
  const emit = (type, d) => Bus.emit(type, d || {});
  function addBoom(m, side, amt, why) {
    if (m.cfg.noBoom || m.kaboom[side] > 0 || m.phaseNoPlay) return;
    let a = amt * T.boomGain * (m.tactic[side] === 'grit' ? 1.15 : 1);
    m.boom[side] = Math.min(100, m.boom[side] + a);
    if (m.boom[side] >= 100) startKaboom(m, side);
  }
  function startKaboom(m, side) {
    m.boom[side] = 0; m.kaboom[side] = T.kaboomTime; m.stats.kabooms[side]++;
    emit('kaboom_start', { side, gilded: m.cfg.story && m.cfg.story.id === 5 && side === 1 });
  }
  const mkRef = () => ({ kind: 'r', x: Rink.CX, y: Rink.CY - 14, z: 0, vx: 0, vy: 0, heading: 0, rig: Rigs.ref(), down: 0 });
  return { S_, blank, mkSkater, mkGoalie, attackDir, ownGoalX, oppGoalX, teamOf, emit, addBoom, startKaboom, mkRef, get m() { return S_.m; } };
})();
