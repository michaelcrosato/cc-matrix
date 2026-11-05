import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game } = G; G.adv(.3);
  const runs = [['title', {}], ['title', { menu: true }], ['versus', {}], ['select', {}], ['stageSelect', {}], ['records', {}], ['about', {}], ['lab', {}], ['credits', {}], ['dojoMenu', {}], ['bonusMenu', {}], ['movelist', { back: 'title' }], ['road', {}], ['vs', { node: KC.DATA.ladder[2] }], ['promotion', { rank: 1, then() {} }], ['continue', {}], ['gameover', { score: 0, mode: 'story' }], ['cutscene', { script: 'finalEntrance', stage: 'stadium', then() {} }]];
  KC.Story.newGame(); KC.Story.s.node = 2;
  for (const s of KC.FIGHT_STAGES) runs.push(['fight', { mode: 'versus', stage: s, white: 'taro', red: 'mei', cpu: [true, true], seed: 1 }]);
  for (const k of ['boards', 'pots', 'bull']) runs.push(['bonus', { kind: k, auto: true }]);
  for (const l of ['I', 'II', 'III', 'ALL']) runs.push(['practice', { lesson: l, autopilot: true }]);
  runs.push(['fight', { mode: 'freeSpar', stage: 'dojo', white: 'taro', red: 'negi' }]);
  for (const [sc, d] of runs) { game.errors.length = 0; game.go(sc, d, { fade: 0 }); G.adv(5); t.check('5 s of ' + sc + (d.stage ? ' ' + d.stage : d.kind ? ' ' + d.kind : ''), !game.errors.length, game.errors.map(e => e.message)); }
  // both views
  game.settings.set('camera', 'Tatami 2.5D'); game.go('fight', { mode: 'versus', stage: 'stadium', white: 'taro', red: 'ebi', cpu: [true, true], seed: 1 }, { fade: 0 }); G.adv(3); t.check('the Tatami 2.5D view', game.view.id === 'brawler' && !game.errors.length, game.view.id); game.settings.set('camera', 'Arcade side');
};
