/* THE BOT: plays a human's side through the real controls (input.hold / input.tap), for the tests and the scripted
 * playthrough. Batting: steers the reticle to the pitch's crossing and swings on time at strikes. Pitching: picks a
 * pitch and releases on the ring. Fielding and running ride the assists. Rhubarbs: punches, shoves and tosses. */
const BOT = { on: false, held: new Set(), pace: 0 };
function botHold(I, a, on) { if (on && !BOT.held.has(I.player + a)) { I.hold(a); BOT.held.add(I.player + a); } if (!on && BOT.held.has(I.player + a)) { I.hold(a, false); BOT.held.delete(I.player + a); } }
function botStep(dt) {
  for (const I of game.players) botInput(I, dt);
}
function botInput(I, dt) {
  const scene = game.sceneName; BOT.pace += dt;
  const dirs = ['up', 'down', 'left', 'right'], stop = () => dirs.forEach(d => botHold(I, d, false));
  if (!M || !['match', 'derby', 'hubDerby', 'attract'].includes(scene)) { stop(); return; }
  if (M.lesson && M.lesson.introOpen) { I.tap('confirm'); return; }
  const side = M.teams.findIndex(t => t.ctrl.cap === I || t.ctrl.co === I); if (side < 0) { stop(); return; }
  const ph = M.phase;
  if (['pregame', 'halfStart', 'halfEnd'].includes(ph) || (ph === 'homer' && M.phaseT > 2.5)) { if (BOT.pace > .3) { BOT.pace = 0; I.tap('south'); } return; }
  if (ph === 'rhubarb' && M.rhubarb) { const f = M.rhubarb.fighters.find(f => f.human === I); if (f) { const foe = M.rhubarb.fighters.filter(o => o.side !== f.side && o.down <= 0).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0]; if (foe) { botHold(I, 'left', foe.x < f.x - 8); botHold(I, 'right', foe.x > f.x + 8); botHold(I, 'up', foe.y < f.y - 8); botHold(I, 'down', foe.y > f.y + 8); } if (BOT.pace > .18) { BOT.pace = 0; const r = RF(); I.tap(r < .7 ? 'south' : r < .85 ? 'west' : 'north'); } } return; }
  const lid = M.lesson && M.lesson.def.id, goal = id => M.lesson && M.lesson.goals.find(g => g.id === id && g.n < g.need);
  if (side === M.half) {
    // batting: the Batzooka when it's full; steals with a runner on first; turbo on the bases
    if (ph === 'select' && offense().meter >= 100 && !M.armed && I === inputOf(side, 'bat')) I.tap('r1');
    if (ph === 'select' && runnerOn(1) && !runnerOn(2) && (lid === 'wheels' || RF() < .002)) { botHold(I, 'l1', true); I.tap('north'); return; }
    botHold(I, 'l1', false); botHold(I, 'l2', ph === 'inPlay' && I === inputOf(side, 'run'));
    if (ph === 'flight' && lid === 'power' && !goal('powerHit') && goal('bunt')) { botHold(I, 'north', true); return; }
    botHold(I, 'north', false);
    if (ph === 'flight' && M.pitch && I === inputOf(side, 'bat')) {
      const cr = pitchPos(M.pitch, 1), tx = cr.x - HX, tz = cr.z - (lid === 'power' ? .4 : 0), ret = M.reticle;
      botHold(I, 'left', ret.x > tx + 1); botHold(I, 'right', ret.x < tx - 1); botHold(I, 'up', ret.z < tz - .6); botHold(I, 'down', ret.z > tz + .6);
      const delay = SWINGS[M.armed ? 'batzooka' : 'contact'].delay;
      const kind = (lid === 'power' && goal('powerHit')) || (M.derby && !M.armed) ? 'west' : 'south', dl = kind === 'west' && !M.armed ? SWINGS.power.delay : delay;
      if (!M.swing && M.pitch.t >= M.pitch.T - dl - 1 / 240 && (inZone(cr.x, cr.z, batterNow()) || M.strikes === 2 || M.derby) && !(lid === 'zone' && goal('takeBall') && !inZone(cr.x, cr.z, batterNow()))) I.tap(kind);
    } else stop();
  } else {
    stop();
    if (ph === 'select' && I === inputOf(side, 'pitch') && BOT.pace > .4) { BOT.pace = 0; I.tap(defense().meter >= 100 ? 'r1' : ['south', 'east', 'west', 'north'][Math.floor(RF() * 4)]); }
    if (ph === 'windup' && I === inputOf(side, 'pitch') && M.relPress === null && M.phaseT >= M.windT - 1 / 120 * 1.5) I.tap('south');
    // aftertouch early in the flight
    botHold(I, 'right', ph === 'flight' && M.pitch && M.pitch.t / M.pitch.T < .35 && I === inputOf(side, 'pitch'));
    // fielding: throw where the out is
    const h = holderF(); if (ph === 'inPlay' && h && h.human && I === inputOf(side, 'field') && h.hold > .05) { const c = decideThrow(h); if (c && !c.nearBase) I.tap(['east', 'north', 'west', 'south'][c.base - 1]); }
  }
}
BZ.bot = { step: botStep, input: botInput };
