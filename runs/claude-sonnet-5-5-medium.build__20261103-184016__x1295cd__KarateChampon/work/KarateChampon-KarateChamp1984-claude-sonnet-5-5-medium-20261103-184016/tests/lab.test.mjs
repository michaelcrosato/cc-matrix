import { fresh } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G;
  for (const id of ['frontKick', 'upLunge', 'frontSweep']) { const tc = KC.TECHS[id], g = KC.measureGap(id); t.check(`lab measures ${id} within 4 of the table`, Math.abs(g - (tc.reach[1] + Math.max(0, tc.travel))) <= 4, g); }
  game.go('lab', { id: 'roundKick' }, { fade: 0 }); game.advance(3); t.check('the lab scene shows the chosen technique', game.scene.name === 'lab' && game.scene.cur().id === 'roundKick' && game.errors.length === 0);
  { game.go('lab', { id: 'frontKick' }, { fade: 0 }); game.advance(.5); const T0 = KC.TECHS.frontKick, r0 = T0.reach[1]; game.input.tap('right'); game.advance(.1); game.scene.fld = 3; game.input.tap('right'); game.advance(.2); t.check('lab slider changes the technique live', T0.reach[1] === r0 + 1, T0.reach[1]); T0.reach[1] = r0; }
  { let copied = null; G.ctx.navigator.clipboard = { writeText: x => { copied = x; return Promise.resolve(); } }; game.go('lab', { id: 'upLunge' }, { fade: 0 }); game.advance(.5); game.input.tap('start'); game.advance(.1); const j = copied && JSON.parse(copied); t.check('Copy JSON puts the technique entry on the clipboard', j && j.id === 'upLunge' && Array.isArray(j.f) && Array.isArray(j.reach), copied); }
  game.go('fight', { stage: 'stadium', ids: ['taro', 'mei'], players: ['human', 'cpu'], mode: 'versus' }, { fade: 0 }); game.advance(.3); t.check('Mei cheers from the front row of the stadium', game.scene.stage.front.some(f => f.mei));
};
