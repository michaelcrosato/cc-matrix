/* SIM: the Rat Run (the solo time trial and the AI Hub ghost race): checkpoints, crowns, kills, the exit. The score is
 * what the hub's scoreboard shows; the time is the result. */
B.RACE_PARTY = () => B.PREMADE.map(t => Object.assign({}, t, { lvl: 2, hp: t.hp + 4 }));
B.newRace = (seed = 1) => {
  B.newState(seed, B.RACE_PARTY(), { mode: 'race', floor: 'race', floors: ['race'] });
  for (const m of B.S.party.members) { m.food = 100; if (m.cls === 'M') { m.mem = []; B.memAdd(m, 'sparkDart', true, true); B.memAdd(m, 'sparkDart', true, true); } if (m.cls === 'C') { m.mem = []; B.memAdd(m, 'mend', true, true); B.memAdd(m, 'mend', true, true); } }
  B.S.race = { t: 0, score: 0, label: 'Start', cps: {}, crowns: 0, kills: 0, done: false, wiped: false, finishT: 0, trail: [] };
  return B.S;
};
B.raceAdd = (n, label) => { const R = B.S.race; if (!R) return; R.score += n; if (label) R.label = label; B.ev('raceScore', { n, label }); };
B.raceCheckpoint = label => { const R = B.S.race; if (!R || R.cps[label]) return; R.cps[label] = 1; B.raceAdd(100, label); B.sfx('checkpoint'); };
B.raceCrown = () => { const R = B.S.race; if (!R) return; R.crowns++; B.raceAdd(25); B.sfx('coin'); B.msg('A Rat Crown! (' + R.crowns + ' of 6)'); };
B.raceKill = () => { const R = B.S.race; if (!R) return; R.kills++; B.raceAdd(10); if (!R.cps['Rats cleared'] && !B.FS().mons.some(m => m.hp > 0 && m.cx <= 4 && m.cy <= 5)) B.raceCheckpoint('Rats cleared'); };
B.raceExit = () => { const R = B.S.race; if (!R || R.done) return; R.done = true; R.finishT = R.t; B.raceAdd(500, 'Escaped!'); B.ev('raceDone', { time: R.t }); B.sfx('victory'); };
B.raceWipe = () => { const R = B.S.race; if (!R || R.done) return; R.wiped = true; R.done = true; B.ev('raceWiped'); };
B.updateRace = dt => {
  const R = B.S.race; if (!R || R.done) return;
  R.t += dt;
  if (!R.cps['Key found'] && B.countItem('ironKey') + (B.S.party.hand && B.S.party.hand.id === 'ironKey' ? 0 : 0) > 0) B.raceCheckpoint('Key found');
};
