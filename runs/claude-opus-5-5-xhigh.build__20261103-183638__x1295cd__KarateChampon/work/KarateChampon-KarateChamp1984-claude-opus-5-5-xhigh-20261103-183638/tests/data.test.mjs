// data: validateData, the matrix, every referenced id; audio: songs parse, sfx ids defined, voice plans deterministic
import { readFileSync, readdirSync } from 'node:fs';
import { fresh } from './lib/util.mjs';
export default async t => {
  const { KC } = fresh();
  t.check('validateData finds no problems', KC.validateData().length === 0, KC.validateData().join('; '));
  for (const p in KC.MATRIX) for (const d in KC.MATRIX[p]) t.check('matrix ' + p + d + ' is a technique', !!KC.TECH[KC.MATRIX[p][d]]);
  t.check('15 scoring techniques', KC.SCORING.length === 15, KC.SCORING.join(','));
  t.check('ten fighters, eleven stages, 17 ladder nodes', KC.DATA.roster.length === 10 && KC.DATA.stages.length === 11 && KC.DATA.ladder.length === 17);
  t.check('ladder: 9 matches, 3 bonus stages, 3 lessons', ['match', 'bonus', 'practice'].map(k => KC.DATA.ladder.filter(n => n.kind === k).length).join() === '9,3,3');
  // songs: every token is a note, a hold, a rest or a drum
  const note = /^([A-G](#|b)?\d|-|\.)$/, drum = /^[kshoct.\-]$/;
  for (const [id, s] of Object.entries(Object.assign({}, KC.SONGS, KC.STINGS))) {
    const bad = s.tracks.flatMap(tr => tr.notes.replace(/\|/g, ' ').trim().split(/\s+/).filter(x => !(tr.wave === 'drums' ? drum : note).test(x)));
    t.check('song ' + id + ' parses', bad.length === 0 && s.bpm > 0, bad.slice(0, 5).join(' '));
  }
  // every KC.sfx('name') and stage music the source names exists
  const src = readdirSync(new URL('../src/', import.meta.url)).map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  const used = [...src.matchAll(/KC\.sfx\('([a-zA-Z]+)'/g)].map(m => m[1]), engineSfx = ['jump', 'land', 'select', 'confirm', 'cancel', 'pause'];
  for (const id of new Set(used)) t.check('sfx ' + id + ' is defined', !!KC.SFX[id] || engineSfx.includes(id));
  for (const id of new Set([...src.matchAll(/KC\.music\('([a-zA-Z]+)'/g)].map(m => m[1]))) t.check('music ' + id + ' exists', !!KC.SONGS[id]);
  for (const id of new Set([...src.matchAll(/KC\.sting\('([a-zA-Z]+)'/g)].map(m => m[1]))) t.check('sting ' + id + ' exists', !!KC.STINGS[id]);
  // the voice: a line always sounds the same; it has a length; calls have their fixed rhythm
  const a = KC.Voice.plan('THE BAMBOO BENDS. IT DOES NOT BREAK.', 9), b = KC.Voice.plan('THE BAMBOO BENDS. IT DOES NOT BREAK.', 9);
  t.check('voice plans are deterministic per line', JSON.stringify(a) === JSON.stringify(b) && a.length > 5);
  t.check('speak returns a length', KC.Voice.speak('I WILL BE CHAMP!', 'taro') > .2);
  t.check('referee calls: BEGIN has 3 syllables, STOP 2', KC.CALL_RHYTHM.begin[0] === 3 && KC.CALL_RHYTHM.stop[0] === 2 && KC.Voice.call('begin', 'BEGIN!') > .3);
  t.check('every call has English and Japanese', Object.values(KC.CALLS).every(c => c.length === 2 && c[0] && c[1]));
  t.check('no TODO, FIXME or placeholder in src', !/TODO|FIXME|XXX|placeholder/i.test(src));
};
