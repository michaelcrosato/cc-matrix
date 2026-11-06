// The whole game in Node: engine + every source, drawn on the stand-in canvas. Plays scenes with game.advance.
export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME; const E = ctx.My3D2dge;
  check('game loads', !!G.game, 'no game'); if (!G.game) return;
  const game = G.game, I = game.input, adv = s => game.advance(s);
  adv(1.2); check('title first', game.scene && game.scene.__name === 'title', game.scene && game.scene.__name);
  check('music defaults to 10%', game.settings.music === .1 && Math.abs(game.audio.musicVolume - .1) < 1e-9, game.settings.music);
  check('glyphs default PlayStation', game.settings.glyphs === 'playstation');
  I.tap('confirm'); adv(1); check('menu after start', game.scene.__name === 'menu', game.scene.__name);
  check('no errors at menu', !game.errors.length, game.errors.map(e => e.message).join('|'));
  for (const sc of ['about', 'casefiles', 'lobby', 'credits', 'attract', 'ward']) { game.go(sc, {}); adv(1.5); check('scene ' + sc + ' runs and draws', !game.errors.length && game.scene.__name === sc, sc + ' ' + game.errors.map(e => e.message).slice(0, 2).join('|')); game.errors.length = 0; }
  for (const id of Object.keys(G.STORY)) { game.go('story', { id, next: () => {} }); adv(.3); I.tap('confirm'); adv(3); check('story ' + id, !game.errors.length, game.errors.map(e => e.message).join('|')); game.errors.length = 0; }
  // every case draws and plays a few seconds with the bot
  for (const id of G.CASE_ORDER.concat(['lab', 'gr'])) { G.run = { bonus: { clock: 0, steady: 0 }, caseId: id, fails: 0, easy: false, skills: id === 'lab' }; game.go('op', { id, bots: [true], cheat: false }); adv(6); const sc = game.scene; check('op draws ' + id, sc.__name === 'op' && !game.errors.length, game.errors.map(e => e.stack || e.message).slice(0, 2).join('|')); game.errors.length = 0; }
}
