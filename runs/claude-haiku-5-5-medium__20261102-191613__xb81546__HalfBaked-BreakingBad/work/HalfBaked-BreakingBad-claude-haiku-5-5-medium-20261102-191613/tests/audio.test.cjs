'use strict';
// Audio helpers: note pitch, the animalese jitter, and the songs' track lengths.
const test = require('node:test');
const assert = require('node:assert/strict');
const HB = require('../src/logic.js');
require('../src/audio.js');

test('note names map to the right pitch (A4 = 440 Hz, A5 = 880 Hz, C4 ~ 261.6 Hz)', () => {
  assert.ok(Math.abs(HB.noteHz('A4') - 440) < 1e-6);
  assert.ok(Math.abs(HB.noteHz('A5') - 880) < 1e-6);
  assert.ok(Math.abs(HB.noteHz('C4') - 261.6256) < 0.01);
  assert.ok(Math.abs(HB.noteHz('F#3') - 185.0) < 0.01);
  assert.equal(HB.noteHz('nonsense'), 440);
});

test('animalese voices jitter their pitch per blip; other sounds pass through unchanged', () => {
  const calls = [];
  const audio = { sfx(what, o) { calls.push([what, o]); return 'ok'; } };
  HB.installAnimalese(audio);
  const base = HB.VOICES.hollis;
  const seen = new Set();
  for (let i = 0; i < 60; i++) audio.sfx(base, undefined);
  for (const [what] of calls) {
    assert.equal(what.animalese, undefined, 'the flag is removed before the engine sees it');
    assert.equal(what.to, undefined, 'no slide');
    assert.equal(what.wave, 'triangle');
    seen.add(Math.round(what.freq));
  }
  assert.ok(seen.size > 2, 'several pitches over 60 blips');
  // The engine's own names still play as before.
  calls.length = 0;
  audio.sfx('coin', { vol: 0.5 });
  assert.deepEqual(calls[0], ['coin', { vol: 0.5 }]);
  // Installing twice does not wrap twice.
  HB.installAnimalese(audio);
  calls.length = 0;
  audio.sfx(base);
  assert.equal(typeof calls[0][0].freq, 'number');
});

test('every speaker has a voice, and every song has tracks that play', () => {
  for (const who of ['hollis', 'cody', 'gil', 'lupe', 'vance', 'agent', 'narrator']) {
    assert.ok(HB.VOICES[who], who);
    assert.equal(HB.VOICES[who].animalese, true);
  }
  for (const [name, song] of Object.entries(HB.SONGS)) {
    assert.ok(song.bpm > 0 && song.steps > 0, name);
    assert.ok(song.tracks.length >= 2, name);
    for (const t of song.tracks) assert.ok(t.notes.split(/\s+/).length >= 8, name);
  }
});
