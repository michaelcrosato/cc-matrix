/* ---- VALIDATE: every id a table names resolves, numbers sit in range, every matrix cell is a technique. Returns the
 * problems found (an empty list when the data is sound); boot logs them and the tests assert there are none ---- */
KC.validateData = () => {
  const bad = [], need = (ok, what) => { if (!ok) bad.push(what); };
  for (const t of KC.DATA.techniques) {
    need(t.f.length === 3 && t.f.every(n => n >= 0 && n < 120), 'technique ' + t.id + ': frames');
    need(t.reach[0] <= t.reach[1], 'technique ' + t.id + ': reach band');
    if (t.scoring) need(t.pts[0] >= 100 && t.pts[1] <= 1000 && t.pts[0] <= t.pts[1] && t.pts[0] % 100 === 0, 'technique ' + t.id + ': points');
    if (t.close) need(!!KC.TECH[t.close.id], 'technique ' + t.id + ': close alt ' + t.close.id);
    if (t.scoring) need(!!t.move, 'technique ' + t.id + ': rig move');
  }
  for (const p in KC.MATRIX) for (const d in KC.MATRIX[p]) need(!!KC.TECH[KC.MATRIX[p][d]], 'matrix ' + p + d);
  for (const id of KC.SCORING) need(!!KC.cellOf(id), 'technique ' + id + ' is not in the matrix');
  for (const f of KC.DATA.roster) {
    need(!!KC.TECH[f.signature], 'fighter ' + f.id + ': signature');
    for (const k in f.ai.weights) need(!!KC.TECH[k], 'fighter ' + f.id + ': ai weight ' + k);
    need(KC.rankIndex(f.rank) >= 0, 'fighter ' + f.id + ': rank');
  }
  for (const s of KC.DATA.stages) { need(!!KC.PAINT && !!KC.PAINT[s.id], 'stage ' + s.id + ': painter'); need(!!KC.SONGS && !!KC.SONGS[s.music], 'stage ' + s.id + ': music ' + s.music); }
  for (const n of KC.DATA.ladder) {
    if (n.stage) need(!!KC.STAGE[n.stage], 'ladder ' + n.id + ': stage ' + n.stage);
    if (n.opponent) need(!!KC.FIGHTER[n.opponent], 'ladder ' + n.id + ': opponent');
    if (n.lesson) need(!!KC.LESSON[n.lesson], 'ladder ' + n.id + ': lesson');
    if (n.bonus) need(!!KC.BONUS[n.bonus], 'ladder ' + n.id + ': bonus');
    if (n.promote) need(KC.DATA.ranks.some(r => r.id === n.promote), 'ladder ' + n.id + ': rank');
    for (const k of ['script', 'after']) if (n[k]) need(!!KC.SCRIPTS[n[k]], 'ladder ' + n.id + ': script ' + n[k]);
  }
  for (const l of KC.DATA.lessons) { need(!!KC.STAGE[l.stage], 'lesson ' + l.id + ': stage'); for (const d of l.drills) need(!!KC.TECH[d], 'lesson ' + l.id + ': drill ' + d); }
  for (const b of KC.DATA.bonus) need(!!KC.STAGE[b.stage] && ['boards', 'pots', 'bull'].includes(b.kind), 'bonus ' + b.id);
  for (const id in KC.SCRIPTS) for (const [who] of KC.SCRIPTS[id]) need(who === 'card' || who === 'genkotsu' || !!KC.FIGHTER[who], 'script ' + id + ': speaker ' + who);
  return bad;
};
