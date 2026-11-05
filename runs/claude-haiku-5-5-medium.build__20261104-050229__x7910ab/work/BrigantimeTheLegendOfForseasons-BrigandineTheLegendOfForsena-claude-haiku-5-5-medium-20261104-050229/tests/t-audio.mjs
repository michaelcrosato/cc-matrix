// Audio suite: every sound effect the plan names exists; the Animalese voice is deterministic, silent on punctuation, and
// louder on capitals; the Gray Knight's voice doubles below.
const PLAN_SOUNDS = ['ui_move', 'ui_confirm', 'ui_cancel', 'ui_error', 'ui_open', 'bell_toll', 'sword_clang', 'slash_whoosh', 'bow_twang',
  'arrow_hit', 'cast_charge', 'spell_spring', 'spell_summer', 'spell_autumn', 'spell_winter', 'spell_hour', 'heal', 'buff', 'debuff',
  'poison', 'burn', 'chill', 'sleep', 'stop', 'crit', 'miss', 'ko_monster', 'ko_knight', 'capture', 'summon_rise', 'roar_small',
  'roar_large', 'growl', 'chirp', 'flap', 'march_drums', 'banner_flip', 'castle_taken', 'candle_hiss', 'tide', 'timer_tick'];
export function run({ check, G }) {
  const missing = PLAN_SOUNDS.filter(n => !G.SFX_NAMED[n]);
  check('every sound effect the plan names exists', missing.length === 0, missing.join(', '));
  check('the plan\'s five songs and the season themes are here', ['spring', 'summer', 'autumn', 'winter', 'battle_attack', 'battle_defend', 'hourless', 'boss', 'event', 'ending', 'title'].every(k => G.SONGS[k]));
  const p = G.voice.profileFor('oren');
  const a = G.voice.plan(p, 'Hello, Oren!');
  const b = G.voice.plan(p, 'Hello, Oren!');
  check('the voice is the same for the same line', JSON.stringify(a) === JSON.stringify(b));
  check('punctuation and spaces make no sound', a[5] === null && a[6] === null && a[11] === null, JSON.stringify(a.slice(5, 7)));
  check('a vowel is a tone and a consonant a tick', a[1] && a[1].wave !== 'noise' && a[2] && a[2].wave === 'noise');
  check('a capital is louder than its small letter', G.voice.letter(p, 'H').vol > G.voice.letter(p, 'h').vol);
  const gray = G.voice.profileFor('gray');
  const gv = G.voice.letter(gray, 'a');
  check('the Gray Knight speaks in two voices, one seven semitones down', Array.isArray(gv) && gv[1].freq < gv[0].freq);
}
