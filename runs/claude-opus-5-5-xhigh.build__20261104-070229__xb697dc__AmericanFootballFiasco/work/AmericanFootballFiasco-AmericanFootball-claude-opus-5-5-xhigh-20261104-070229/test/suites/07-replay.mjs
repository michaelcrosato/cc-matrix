import { load } from '../lib/context.mjs';
export default async ok => {
  const { game, FF } = load();
  game.go('match', { spec: { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: { 0: [], 1: [] }, seed: 4, start: { possession: 'home', los: 60 } } }, { fade: 0 });
  game.advance(.2); const m = FF.match; m.fastCalls = true; m.cheatSide = 0; m.cheats = { godMode: true, forceCatch: true };
  let t = 0; while (!FF.replay.last && t < 40) { game.advance(.1); t += .1; }
  ok('a play is recorded', !!FF.replay.last && FF.replay.last.frames.length > 30, FF.replay.last && FF.replay.last.frames.length);
  FF.replay.stop(); const h0 = m.hash(); FF.replay.play(FF.replay.last, {}); let k = 0; while (FF.replay.playing && k++ < 4000) game.advance(1 / 120);
  ok('the sim is untouched by a replay', m.hash() === h0);
  for (let i = 0; i < 8; i++) { FF.replay.rec = { frames: FF.replay.last.frames, events: [], t: 5, excite: i, after: -1 }; FF.replay.finish(m); }
  ok('the highlight reel keeps the top 5', FF.replay.highlights.length === 5 && FF.replay.highlights[0].excite >= FF.replay.highlights[4].excite);
  ok('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
};
