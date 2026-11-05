// slow: the fair bot clears every stage on Normal without a continue; the showoff bot (cheats) plays ARCADE to the
// credits; the Training range completes
export default async t => {
  for (const st of [1, 2, 3]) {
    const { TC, step, game } = t.load(); step(1.2);
    game.go('play', { mode: 'stage', stages: [st], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 11 + st }); step(.8);
    const play = TC.play, sim = play.s.sim; play.s.bots[0] = new TC.Autopilot('fair');
    for (let k = 0; k < 900 && play.state === 'run'; k++) step(1);
    t.check('the fair bot clears stage ' + st + ' on Normal', play.state === 'results' || play.state === 'credits' || play.state === 'initials', play.state + ' at ' + sim.sceneId);
    t.check('stage ' + st + ' without a continue', sim.players[0].contMark === 0, sim.players[0].contMark);
    t.check('stage ' + st + ' no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
  }
  { const { TC, step, game } = t.load(); step(1.2);
    game.go('play', { mode: 'arcade', stages: [1, 2, 3], difficulty: 'normal', noBrief: true, skipCuts: false, seed: 5 }); step(.8);
    const play = TC.play, sim = play.s.sim; sim.cheats.god = true; sim.cheats.ammo = true; play.s.bots[0] = new TC.Autopilot('showoff');
    for (let k = 0; k < 2400 && play.state !== 'credits' && play.state !== 'initials'; k++) { step(1); if (play.state === 'results') game.input.tap('confirm'); if (play.state === 'brief') play.brief.done = true; }
    t.check('the showoff bot plays ARCADE, cutscenes and all, to the credits', play.state === 'credits' || play.state === 'initials', play.state + ' ' + sim.stageId + ':' + sim.sceneId);
    t.check('arcade no errors', !game.errors.length, game.errors.map(e => e.message).join('|')); }
  { const { TC, step, game } = t.load(); step(1.2);
    game.go('play', { mode: 'range', stages: ['R'], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 5 }); step(.8);
    const play = TC.play; play.s.bots[0] = new TC.Autopilot('fair');
    for (let k = 0; k < 400 && play.state === 'run'; k++) step(1);
    t.check('the Training range completes', play.state === 'range', play.state + ' ' + play.s.sim.sceneId); }
};
