// audio (headless, no Web Audio): every song parses (notes, drums, holds) and has at least 16 bars; every sound the
// events name is defined; the gibberish voice's lengths are positive and the same word always lasts the same; the
// music director's layers follow the race (the lead in on the final lap).
import { load } from '../lib/vm.mjs';
export async function run(T) {
  const { SN, game, E } = load({ quiet: true }); await game.booted;
  const NOTE = /^[A-G][#b]?-?\d!?$/, DR = /^[kshoctpb]$/;
  for (const id in SN.SONGS) {
    const S = SN.SONGS[id]; let len = 0, bad = [];
    for (const t of S.tracks) { const toks = t.notes.replace(/\|/g, ' ').trim().split(/\s+/); len = Math.max(len, toks.length); for (const k of toks) if (!(k === '.' || k === '-' || (t.wave === 'drums' ? DR.test(k) : NOTE.test(k)))) bad.push(t.name + ':' + k); }
    T.check('song ' + id + ' parses', bad.length === 0, bad.slice(0, 5)); T.check('song ' + id + ' has 16 bars or more', len >= 256, len / 16);
    T.check('song ' + id + ' has named layers', S.tracks.every(t => t.name), S.tracks.map(t => t.name));
  }
  for (const id in SN.STINGS) { const S = SN.STINGS[id]; T.check('sting ' + id + ' parses', S.tracks.every(t => t.notes.split(/\s+/).every(k => k === '.' || k === '-' || k === '|' || (t.wave === 'drums' ? DR.test(k) : NOTE.test(k))))); }
  // every effect the events use is a defined sound
  const src = (await import('node:fs')).readFileSync(new URL('../../src/50-audio.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/A\.sfx\('([a-z_]+)'/g)].map(m => m[1]).concat([...src.matchAll(/\b(\w+_fire|mine_drop|tremor|bulwark_on|autopilot_on|nitro|siphon)'/g)].map(m => m[1])));
  for (const n of used) T.check('sound ' + n + ' is defined', !!game.audio.presets[n], n);
  // the voice
  const a = SN.Voice.say('SEEKER'), b = SN.Voice.say('SEEKER'), c = SN.Voice.say('AUTHORITY NOTICE 0417. ROOKIE LICENCE GRANTED.');
  T.check('the voice speaks for a time', a > 0 && c > a, [a, c]); T.check('the same word lasts the same', a === b, [a, b]); T.check('a question rises (and differs from a statement)', SN.Voice.say('READY?') > 0);
  // the director: a race's layers by state
  SN.flow.start({ mode: 'race', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, laps: 2, seed: 4 }); game.advance(1.6);
  const S = SN.SONGS.solenne, idx = n => S.tracks.findIndex(t => t.name === n), L = () => game.audio.pos.layers;
  T.check('the countdown plays the pads and bass only', game.audio.pos.playing && L()[idx('kick')] === 0 && L()[idx('pad')] === 1, L());
  game.advance(3.2); T.check('the drums come in at GO', L()[idx('kick')] === 1 && L()[idx('lead')] === 0, L());
  const R = game.debug.race(); R.events.push({ t: 'finallap', ship: R.player }); SN.audio.events(R); T.check('the lead comes in on the final lap', L()[idx('lead')] === 1, L());
  T.check('now playing names the song', SN.audio.nowPlaying('solenne') === '♪ RIVIERA BURN · SOLSTICE 9', SN.audio.nowPlaying('solenne'));
}
