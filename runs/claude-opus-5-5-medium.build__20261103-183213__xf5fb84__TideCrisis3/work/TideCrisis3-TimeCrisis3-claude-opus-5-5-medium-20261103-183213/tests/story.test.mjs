import { run } from './lib.mjs';
export default async t => {
  const { TC, step, game } = t.load(); step(1.2);
  for (const c of Object.values(TC.REG.cutscene)) {
    const st = Object.values(TC.REG.stage).find(s => [s.intro, s.outro, s.ending].includes(c.id));
    const sim = new TC.Sim({ mode: 'stage', stages: [st.id], stage: st.id, scene: st.scenes[0], skipCuts: true, seed: 1 });
    let ended = false; sim.startCut(c.id, () => { ended = true; });
    for (let k = 0; k < 120 * 120 && !ended; k++) sim.step(1 / 120, [{ advance: k % 60 === 0 }]);
    t.check('cutscene ' + c.id + ' runs to its end headless', ended);
    let ended2 = false; sim.startCut(c.id, () => { ended2 = true; }); sim.step(1 / 120, [{ skip: true }]); t.check('cutscene ' + c.id + ' skips', ended2);
    for (const s of c.steps) if (s.say) t.check('speaker ' + s.say[0] + ' exists', !!TC.REG.speaker[s.say[0]]);
  }
  t.check('voice durations are positive', ['kai', 'krake', 'juno'].every(id => TC.Voice.duration('Hostiles on the pier!', TC.REG.speaker[id]) > .2));
  t.check('briefings for every stage', [1, 2, 3].every(n => TC.REG.briefing['b' + n] && TC.REG.briefing['b' + n].lines.length));
  t.check('six intel notes', Object.keys(TC.REG.intel).length === 6);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
