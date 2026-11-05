import { load } from '../lib/context.mjs';
export default async ok => {
  const { game, FF } = load(); const I = game.input, G = FF.glyph;
  I.lastDevice = 'gamepad';
  ok('PlayStation glyphs by default', game.settings.glyphs === 'playstation' && G.look(I, 'b1', 'gamepad').text === '✕', G.look(I, 'b1', 'gamepad').text);
  ok('○ □ △ on the other face buttons', ['b2', 'b3', 'b4'].map(a => G.look(I, a, 'gamepad').text).join('') === '○□△');
  game.settings.set('glyphs', 'xbox'); ok('the Xbox setting gives A', G.look(I, 'b1', 'gamepad').text === 'A'); game.settings.set('glyphs', 'playstation');
  ok('the keyboard gives SPACE', G.look(I, 'b1', 'keyboard').text === 'SPACE', G.look(I, 'b1', 'keyboard').text);
  ok('the keyboard names receivers 1-3', ['r1', 'r2', 'r3'].map(a => G.look(I, a, 'keyboard').text).join('') === '123');
  ok('turbo is R2 on a PlayStation pad', G.look(I, 'turbo', 'gamepad').text === 'R2');
  const P2 = game.addPlayer({ keys: 'right' }); ok('a keyboard half has b1-b4, turbo and a lateral', ['b1', 'b2', 'b3', 'b4', 'turbo', 'lb'].every(a => P2.map[a] && P2.map[a].length), JSON.stringify(Object.keys(P2.map)));
  game.removePlayer(P2);
  // switching: ○ goes to the defender nearest the ball
  game.go('match', { spec: { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: { 0: [], 1: [0] }, seed: 8, start: { possession: 'home', los: 40 } } }, { fade: 0 });
  game.advance(.2); const m = FF.match; m.forceCall = { 0: { play: 'hb_dive' } }; m.fastCalls = true;
  let k = 0; while (m.phase !== 'PLAYCALL' && k++ < 400) game.advance(1 / 60); m.callPlay(1, 'cover2'); while (m.phase !== 'LIVE' && k++ < 1200) game.advance(1 / 60);
  const me0 = FF.control.athleteOf(m, 0); ok('the defense\'s human holds the safety at the snap', me0 && me0.slot === 'S', me0 && me0.slot);
  game.advance(.4); I.tap('b2'); game.advance(.1); const me1 = FF.control.athleteOf(m, 0), b = m.ball;
  ok('○ switches to the defender nearest the ball', me1 && me1 !== me0, me1 && me1.slot);
  // a mouse click picks an athlete through the projection
  const t = m.on.find(a => a.side === 1 && a !== me1), p = FF.control.screenOf(t.x, t.y, t.z); const got = FF.control.pickAt(m, p[0], p[1] - 12);
  ok('a click on an athlete picks him', got === t, got && got.slot);
  ok('prompts follow the context', FF.control.prompts(m, 0).length > 0); void b;
};
