import { load } from '../lib/vm.mjs';
import { test, check, done } from '../lib/t.mjs';
import { readFileSync } from 'node:fs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current; g.advance(.3);
await test('songs', () => {
  check(Object.keys(SN.SONGS).length >= 6, 'six songs');
  for (const [id, s] of Object.entries(SN.SONGS)) {
    const len = Math.max(...s.tracks.map(t => t.notes.replace(/\|/g, ' ').trim().split(/\s+/).length)), bars = len / 16;
    check(bars >= 16, id + ' has 16+ bars', bars); check(s.title && s.artist, id + ' has a title and artist');
    const toks = s.tracks.flatMap(t => t.notes.replace(/\|/g, ' ').trim().split(/\s+/).map(k => [t.wave, k]));
    const bad = toks.filter(([w, k]) => k !== '.' && k !== '-' && (w === 'drums' ? !'kshoctpb'.includes(k[0]) : !ctx.My3D2dge.note(k.replace('!', ''))));
    check(!bad.length, id + ' every token parses', bad.slice(0, 3));
    for (const L of ['kick', 'lead']) check(s.tracks.some(t => t.name === L), id + ' has the ' + L + ' layer');
  }
});
await test('every sound the game asks for exists', () => {
  const src = JSON.parse(readFileSync(new URL('../../src/manifest.json', import.meta.url), 'utf8')).map(f => readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8')).join('\n');
  const names = new Set([...src.matchAll(/sfx\('([a-z_]+)'/g)].map(m => m[1]).concat([...src.matchAll(/swarm: '([a-z_]+)', seeker: '([a-z_]+)', mine: '([a-z_]+)', cannon: '([a-z_]+)', rail: '([a-z_]+)', tremor: '([a-z_]+)', bulwark: '([a-z_]+)', auto: '([a-z_]+)', nitro: '([a-z_]+)', siphon: '([a-z_]+)'/g)].flatMap(m => m.slice(1))));
  SN.Audio.init(); const missing = [...names].filter(n => !g.audio.presets[n]); check(!missing.length && names.size > 30, 'all ' + names.size + ' sounds defined', missing);
});
await test('gibberish voices', () => {
  const a = SN.Voice.say('SEEKER LOCKED.', SN.VOICES.oracle), b = SN.Voice.say('SEEKER LOCKED.', SN.VOICES.oracle), c = SN.Voice.say('A much longer sentence from race control, about walls.', SN.VOICES.oracle);
  check(a > .1 && a === b && c > a * 2, 'durations positive, stable per text, longer for more words', [a, c]);
});
await test('the music director follows the race', () => {
  g.go('loading', { setup: { mode: 'race', track: 'meridian', cls: 'spark', team: 'kestrel', pilot: 'ingrid', laps: 2, intro: false } }); g.advance(1.5);
  const R = SN.scenes.race.race, song = SN.SONGS.meridian, li = n => song.tracks.findIndex(t => t.name === n);
  check(SN.Audio.songId === 'meridian', 'the track\'s song plays');
  check(g.audio.pos.layers[li('kick')] === 0 && g.audio.pos.layers[li('pad1')] === 1, 'countdown: pads and bass, no drums', g.audio.pos.layers);
  g.advance(3.5); check(g.audio.pos.layers[li('kick')] === 1, 'drums at GO', g.audio.pos.layers);
  SN.Audio.finalLap(); check(g.audio.pos.layers[li('lead')] === 1, 'the lead on the final lap');
});
done();
