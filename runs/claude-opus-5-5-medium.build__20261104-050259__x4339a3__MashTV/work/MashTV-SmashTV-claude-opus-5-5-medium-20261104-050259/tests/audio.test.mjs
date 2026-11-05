import { boot, suite } from './lib.mjs';
import { readFileSync, readdirSync } from 'node:fs';
export default async () => {
  const S = suite('audio'), g = boot(), MT = g.MT;
  let ok = true; try { for (const id in MT.SONGS) { g.game.audio.music(MT.SONGS[id]); g.adv(.1); } MT.music.play('theme'); MT.music.sting('stClear'); for (const n in MT.SFX) MT.sfx(n); MT.babble.say('HELLO PLANET EARTH!'); MT.babble.crowd('cheer', 1); } catch (e) { ok = false; }
  S.check('music, sounds and babble never throw headless', ok);
  const a = MT.babble.duration('HI!'), b = MT.babble.duration('GOOD EVENING, PLANET EARTH! I AM LANCE LUSTRE, AND THIS IS THE ONLY SHOW IN TOWN!');
  S.check('babble durations scale with the text', b > a * 3, a.toFixed(2) + ' ' + b.toFixed(2));
  const src = readdirSync(new URL('../src', import.meta.url)).map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  const used = [...src.matchAll(/MT\.sfx\('([a-zA-Z]+)'/g)].map(m => m[1]), missing = used.filter(n => !MT.SFX[n]);
  S.check('every sound a reaction plays exists', missing.length === 0, [...new Set(missing)].join(','));
  const songs = [...src.matchAll(/MT\.music\.(?:play|sting)\('([a-zA-Z]+)'/g)].map(m => m[1]).filter(n => !MT.SONGS[n]);
  S.check('every song played exists', songs.length === 0, songs.join(','));
  const pools = [...src.matchAll(/MT\.lines\.pool\('([a-zA-Z]+)'/g)].map(m => m[1]).filter(n => !MT.TEXT.pools[n]);
  S.check('every line pool exists', pools.length === 0, pools.join(','));
  S.check('every scene that plays sets a song', ['title', 'lobby', 'recap', 'credits', 'ending', 'sessionCard'].every(s => /MT\.music\.play\(/.test(String(MT.scenes[s].enter))));
  return S;
};
