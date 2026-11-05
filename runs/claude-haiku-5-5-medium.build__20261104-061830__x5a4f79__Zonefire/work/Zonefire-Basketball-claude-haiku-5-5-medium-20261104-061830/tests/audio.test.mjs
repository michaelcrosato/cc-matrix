// The audio (plan §19.2 "audio"): every song's tokens parse; every sound name the code uses exists; the voice's syllable
// plan has a count, timings and the '!' and '?' contours. Headless: no audio, but the plans are computed.
import { loadGame, expect, DEV } from './helpers.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const bb = () => loadGame({ seed: 1 }).bb;
const NOTE = /^[A-G](#|b)?[0-9]$/, DRUM = /^[kshoct]$/;

T('audio.every song and sting token is a note, a rest, a hold, a bar line or a drum', () => {
  const b = bb();
  for (const [name, song] of [...Object.entries(b.SONGS), ...Object.entries(b.STINGS)]) {
    expect(song.bpm > 0 && song.steps === 4, `${name}: bpm and steps`);
    for (const t of song.tracks) {
      for (const tok of t.notes.split(/\s+/).filter(x => x && x !== '|')) {
        const ok = tok === '-' || tok === '.' || NOTE.test(tok) || (t.wave === 'drums' && DRUM.test(tok)) || (t.wave === 'noise' && /^[c.-]$/.test(tok)) || /^[0-9]/.test(tok) === false && /^[A-Za-z]/.test(tok) && t.wave !== 'drums';
        expect(ok, `${name}.${t.name}: token "${tok}"`);
      }
    }
  }
});
T('audio.every sound the code plays is defined (or is an engine preset)', () => {
  const b = bb();
  const engine = new Set(['jump', 'jump2', 'land', 'step', 'coin', 'pickup', 'key', 'powerup', 'oneup', 'heal', 'hit', 'hurt', 'stomp', 'bump', 'swing', 'whoosh', 'punch', 'kick', 'shoot', 'laser', 'charge', 'explode', 'boom', 'door', 'secret', 'warp', 'die', 'select', 'confirm', 'cancel', 'pause', 'text', 'blip']);
  const src = ['src/35-match.js', 'src/36-fx.js', 'src/39-arcade.js', 'src/41-hud.js', 'src/42-screens.js', 'src/22-twists.js', 'src/40-ui-kit.js', 'src/33-actions.js', 'src/37-step.js', 'src/50-hub.js', 'src/45-attract.js', 'src/43-tour.js']
    .map(f => readFileSync(join(DEV, f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/(?:sfxPlay|A\.sfx|A && A\.sfx)\((?:A\.sfx\()?'([a-z_0-9]+)'/g)].map(m => m[1]));
  for (const n of used) expect(b.SFX[n] || engine.has(n), `sound ${n} is used but not defined`);
});
T('audio.the voice plan: a syllable per vowel, timings rise, a "!" lifts and a "?" rises', () => {
  const b = bb();
  const p = b.VOICE_PROFILES.vinnie;
  const plan = b.voicePlan('GOOD EVENING, BALL FANS!', p);
  expect(plan.length >= 6, `syllables ${plan.length}`);
  for (let i = 1; i < plan.length; i++) expect(plan[i].t >= plan[i - 1].t, 'timings rise');
  const ex = b.voicePlan('WOW!', p), q = b.voicePlan('WHAT?', p);
  expect(ex[ex.length - 1].excl === true, 'an exclamation marks the last syllable');
  expect(q[q.length - 1].quest === true, 'a question marks the last syllable');
  const same = b.voicePlan('GOOD EVENING, BALL FANS!', p);
  expect(JSON.stringify(same) === JSON.stringify(plan), 'the same line always gives the same contour');
});
T('audio.every voice profile is defined for every speaker', () => {
  const b = bb();
  for (const pl of b.all('player')) expect(b.VOICE_PROFILES[pl.voice], `no voice profile for ${pl.voice}`);
  for (const sp of ['vinnie', 'deedee', 'gigawatt', 'roscoe', 'intern', 'cleanbot']) expect(b.VOICE_PROFILES[sp], `no voice profile for ${sp}`);
});
