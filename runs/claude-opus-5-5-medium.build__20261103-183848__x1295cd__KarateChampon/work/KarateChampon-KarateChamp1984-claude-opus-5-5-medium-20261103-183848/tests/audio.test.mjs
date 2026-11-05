import { loadGame } from './lib/load.mjs';
export default async t => {
  const warns = []; const G = loadGame({ warn: (...a) => warns.push(a.join(' ')) }), { KC, game } = G; G.adv(.3);
  for (const id in KC.SONGS) { warns.length = 0; game.audio.music(KC.SONGS[id]); G.adv(.2); t.check('song ' + id + ' plays with no warnings', !warns.length && game.audio.song, warns); }
  for (const id in KC.STINGS) t.check('sting ' + id, KC.STINGS[id].tracks.length > 0);
  for (const id in KC.SFX) t.check('sfx ' + id + ' defined', !!game.audio.presets[id]);
  const a = KC.Voice.plan('THE SEA MADE ME QUICK. CATCH ME!', 'ebi'), b = KC.Voice.plan('THE SEA MADE ME QUICK. CATCH ME!', 'ebi');
  t.check('voice plans are deterministic per line', JSON.stringify(a) === JSON.stringify(b)); t.check('a line returns a duration', KC.Voice.speak('OSU!', 'taro') > 0);
  t.check('calls have a fixed rhythm: BEGIN 3 syllables, stress on the 2nd', KC.Voice.plan('BEGIN!', 'genkotsu', 'begin').syl.length === 3 && KC.Voice.plan('HAJIME!', 'genkotsu', 'begin').syl[1].stress);
  t.check('each speaker has a voice', KC.DATA.roster.every(f => f.voice && f.voice.f0 > 0));
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
