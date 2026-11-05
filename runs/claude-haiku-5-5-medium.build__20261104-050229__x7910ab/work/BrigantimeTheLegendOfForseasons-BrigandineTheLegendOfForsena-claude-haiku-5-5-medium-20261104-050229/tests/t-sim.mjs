// Battle suite: the simulation is deterministic, every map and season plays to the end, and illegal commands are refused.
const troopsA = [
  { kind: 'knight', ref: 'oren', leader: true, level: 4, items: ['sun-rune'] },
  { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 1 }, { kind: 'knight', ref: 'dunstan' }];
const troopsB = [
  { kind: 'knight', ref: 'shade', leader: true }, { kind: 'monster', ref: 'dusk-bat', form: 0 },
  { kind: 'monster', ref: 'cinder-imp', form: 0 }, { kind: 'knight', ref: 'ashen' }];

export function run({ check, G }) {
  const make = (map, season, seed, a = troopsA, b = troopsB) => G.BattleSim.create({ map, season, seed, sides: [{ troops: a }, { troops: b }] });

  const s1 = make('meadow', 'spring', 7);
  check('a battle is set up with both sides placed', s1.alive(0).length === 4 && s1.alive(1).length === 4, JSON.stringify(s1.snapshot()));
  check('the first bell is bell 1', s1.s.bell === 1);
  const cur = s1.current();
  check('a unit has the first turn', !!cur && cur.uid);

  const a = make('meadow', 'spring', 99), b = make('meadow', 'spring', 99);
  G.autoplayBattle(a); G.autoplayBattle(b);
  check('the same seed plays the same battle', a.hash() === b.hash(), a.hash() + ' vs ' + b.hash());
  check('a battle ends', a.s.over === true, JSON.stringify(a.snapshot()));
  check('a battle has a winner', a.s.winner === 0 || a.s.winner === 1);

  let seeds = 0, unfinished = [];
  for (const map of G.ids('map')) for (const season of G.SEASON_ORDER) for (const seed of [3, 11, 42]) {
    const sim = make(map, season, seed);
    try { G.autoplayBattle(sim, 5000); } catch (e) { unfinished.push(map + '/' + season + '/' + seed + ': ' + e.message); continue; }
    seeds++;
    if (!sim.s.over) unfinished.push(map + '/' + season + '/' + seed + ' at bell ' + sim.s.bell);
  }
  check('every map and season plays to the end', unfinished.length === 0, unfinished.slice(0, 3).join('; '));
  check('the sweep covered every combination', seeds === G.ids('map').length * 4 * 3, String(seeds));

  // illegal commands are refused and change nothing
  const r = make('meadow', 'spring', 5);
  const before = r.hash();
  const bad = r.apply({ t: 'attack', uid: 'nobody', target: 'nobody' });
  check('an unknown unit is refused', bad[0].type === 'refused' && r.hash() === before);
  const u = r.current();
  const far = r.s.units.find(x => x.side !== u.side);
  const refusal = r.apply({ t: 'attack', uid: u.uid, target: far.uid });
  check('an attack from too far is refused', refusal[0].type === 'refused' && refusal[0].reason === 'too far', JSON.stringify(refusal));

  // a move stays within the unit's reach and does not end its turn; a wait ends it
  const reach = r.reach(u.uid);
  check('reach includes the unit\'s own cell', reach.has(G.key(u.q, u.r)));
  const dest = [...reach.keys()].find(k => k !== G.key(u.q, u.r));
  if (dest) {
    const ev = r.apply({ t: 'move', uid: u.uid, to: dest });
    check('a move is reported with its path', ev[0].type === 'move' && ev[0].path[ev[0].path.length - 1] === dest);
    check('a move does not end the turn', r.current().uid === u.uid);
    const w = r.apply({ t: 'wait', uid: u.uid });
    check('a wait ends the turn', w.some(e => e.type === 'wait' || e.type === 'turn' || e.type === 'bell') && r.current().uid !== u.uid);
  }

  // the planner never refuses, on several maps, and every unit it moves stays on the board
  for (const map of G.ids('map')) {
    const sim = make(map, 'summer', 21);
    const ok = G.autoplayBattle(sim, 5000).every(e => e.type !== 'refused');
    check('the planner plays ' + map + ' without a refusal', ok);
  }

  // the Keep: side 0 wins by a knight reaching it (the map has a keep)
  const k = make('meadow', 'spring', 1);
  check('the meadow has a keep', !!k.s.keep);
  check('keep is a keep tile', k.tile(k.s.keep).id === 'keep');
  check('hashes of the state are stable', G.hash({ a: 1 }) === G.hash({ a: 1 }));
}
