// 5.3: the shot resolver rows, lengths, the hype tags; 5.12: commentary pools; 5.13: voice syllables and songs
export default ({ boot, suite }) => {
  const s = suite(), { D } = boot();
  const m = new D.Match({ teams: ['ker', 'mud'], ground: 'green', seed: 1, humans: [[], []] }); m.effects = {};
  let bad = [];
  for (const row of D.SHOTS) {
    if (row.b === 'block' || row.id === 'push' || row.id === 'loftLeg') continue;
    const th = (row.sec[0] + row.sec[1]) / 2 * Math.PI / 180, line = (row.line[0] + row.line[1]) / 2, z = (row.z[0] + row.z[1]) / 2;
    const got = m.resolveShot(row.b, th, row.len[0], line, z);
    if (got.id !== row.id) bad.push(row.id + '->' + got.id);
  }
  s.ok('every resolver row gives its shot', !bad.length, bad.join(', '));
  s.ok('a block on a short ball is the back-foot defence', m.resolveShot('block', 0, 'short', 0, 20).id === 'backDefence');
  s.ok('length bands: yorker, full, good, short', ['yorker', 'full', 'good', 'short'].join() === [10, 50, 100, 160].map(D.lengthBand).join());
  // commentary: every pool has 2+ lines, and none is longer than 3 lines of the caption after the longest names
  const longest = { batter: 'TWISTLETON', bowler: 'THRUMPTONATOR', team: "Thrumpton's Thunderbolts", opp: 'Lower Muddleford Mutineers', ground: 'The Thrumpton Megadome', fielder: 'ST JOHN-SMYTHE', winner: 'Lower Muddleford Mutineers', item: 'Statistical Certainty', runs: 3, need: 24, balls: 12, score: '123/4', kmh: 155 };
  const over = []; for (const k in D.LINES) for (const [, l] of D.LINES[k]) { const t = D.fmt(l, longest); if (t.length > 150) over.push(k + ': ' + t.length); }
  s.ok('no commentary line runs past three caption lines after the template fill', !over.length, over.join(', '));
  s.ok('the main events each have 3+ lines', ['dot', 'four', 'six', 'bowled', 'caught', 'single', 'beaten', 'wide', 'noball', 'lbw', 'runout', 'stumped', 'idle'].every(k => D.LINES[k].length >= 3));
  const sy = D.syllables('Howzat!').filter(x => !x.gap);
  s.ok('"Howzat!" is two syllables, the last raised', sy.length === 2 && sy[1].pitch > 1 && sy[1].pitch > sy[0].pitch * .9, sy);
  const q = D.syllables('Really?').filter(x => !x.gap); s.ok('a question rises at the end', q[q.length - 1].pitch > q[0].pitch, q);
  // songs parse: every token a note, a hold, a rest or a drum
  const badTok = []; for (const [id, song] of Object.entries(Object.assign({}, D.SONGS, D.STINGS))) for (const tr of song.tracks) for (const tok of tr.notes.split(/\s+/).filter(Boolean)) { if (tok === '|' || tok === '-' || tok === '.') continue; if (tr.wave === 'drums' ? !/^[ksho ct]$/.test(tok) : !/^[A-G](#|b)?[0-8]$/.test(tok)) badTok.push(id + ':' + tok); }
  s.ok('every song and sting parses', !badTok.length, badTok.slice(0, 5).join(' '));
  s.ok('every sound effect the game names is defined', ['bat', 'batSweet', 'edge', 'pitchThud', 'stumps', 'bails', 'gloves', 'throwWhoosh', 'dive', 'board', 'glass', 'gull', 'moo', 'bees', 'firework', 'hypeFull', 'fireOn', 'special', 'bell', 'coin', 'whistle', 'tick', 'stamp', 'thunder'].every(k => D.SFX_DEFS[k]));
};
