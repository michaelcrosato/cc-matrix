export default async t => {
  const { TC, step, game } = t.load(); step(1.2);
  for (const s of Object.values(TC.REG.song)) {
    const lens = s.tracks.map(tr => tr.notes.split(/\s+/).filter(x => x && x !== '|').length);
    t.check('song ' + s.id + ': every track has whole bars', lens.every(n => n > 0 && n % 16 === 0), lens.join(','));
    t.check('song ' + s.id + ': tokens are notes, holds, rests or drums', s.tracks.every(tr => tr.notes.split(/\s+/).filter(x => x && x !== '|').every(x => /^([A-G]#?b?\d|-|\.|[ksho ct])$/.test(x))), s.id);
  }
  for (const st of Object.values(TC.REG.stage)) t.check('stage ' + st.id + ' has its song', !!TC.REG.song[st.music]);
  t.check('every sfx defines voices', Object.values(TC.REG.sfx).every(x => Array.isArray(x.voices) && x.voices.length));
  t.check('no errors', !game.errors.length);
};
