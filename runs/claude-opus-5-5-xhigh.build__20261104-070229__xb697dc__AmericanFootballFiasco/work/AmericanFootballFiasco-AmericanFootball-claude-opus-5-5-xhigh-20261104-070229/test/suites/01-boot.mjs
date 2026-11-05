import { load } from '../lib/context.mjs';
export default async ok => {
  const c = load(); const { game, FF } = c;
  ok('boots to the title', game.sceneName === 'title', game.sceneName);
  ok('no load errors', !c.errors.length && !game.errors.length, c.errors.concat(game.errors.map(e => e.message)).join(' | '));
  const scenes = { menu: null, setup: null, records: null, about: null, practice: null, story: null, credits: { ending: false }, attract: { from: 'title' }, cutscene: { id: 'ch2_intro', then: () => {} }, drill: { id: 'moves' }, fiasco: { ch: FF.data.story.chapters[1], m: {} },
    match: { spec: { mode: 'exhibition', home: 'yetis', away: 'dynasty', humans: { 0: [0], 1: [] }, start: 'kickoff' } } };
  for (const [name, data] of Object.entries(scenes)) { game.go(name, data, { fade: 0 }); game.advance(1 / 60); game.advance(1.5); ok('scene ' + name + ' enters and runs', game.sceneName === name && !game.errors.length, game.sceneName + ' ' + game.errors.map(e => e.message).join(' | ')); game.errors.length = 0; }
  for (const h of ['#match', '#drill/passing', '#attract', '#story/ch3', '#about', '#records']) { const d = load({ hash: h }); d.game.advance(1); ok('deep link ' + h, !d.game.errors.length && d.game.sceneName !== 'title', d.game.sceneName + ' ' + d.game.errors.map(e => e.message).join(' | ')); }
  ok('no engine warnings', !c.warnings.length, c.warnings.slice(0, 3).join(' | '));
};
