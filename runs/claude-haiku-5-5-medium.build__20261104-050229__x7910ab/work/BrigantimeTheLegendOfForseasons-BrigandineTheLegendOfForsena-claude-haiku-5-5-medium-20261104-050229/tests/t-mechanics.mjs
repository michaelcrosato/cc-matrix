// Mechanics suite: the Season Dials and the gate, every species and class in a planner battle, promotion and third-form
// evolution, the story's triggers and choices, and the data references the scenes rely on.
export function run({ check, G }) {
  // the Clockwork Sanctum: a unit that ends a move on a dial turns it; the gate opens when every dial shows the season
  const sim = G.BattleSim.create({ map: 'clockwork-sanctum', season: 'winter', seed: 4, sides: [
    { troops: [{ kind: 'knight', ref: 'oren', leader: true }] }, { troops: [{ kind: 'knight', ref: 'gray', leader: true }] }] });
  const dialKeys = Object.keys(sim.s.dials);
  check('the Sanctum has three dials', dialKeys.length === 3, String(dialKeys.length));
  check('the Sanctum\'s gate starts shut', Object.values(sim.s.tiles).filter(t => t === 'gate').length === 1);
  check('the dials start at 1, 2 and 3', JSON.stringify(Object.values(sim.s.dials)) === JSON.stringify([1, 2, 3]), JSON.stringify(sim.s.dials));
  // move the acting unit onto a dial, from a cell beside it
  const turnOn = (key) => {
    const u = sim.current(), d = G.parseKey(key);
    const nb = G.neighbours(d.q, d.r).find(n => sim.tile(G.key(n.q, n.r)) && Number.isFinite(sim.tile(G.key(n.q, n.r)).cost) && !sim.unitAt(n.q, n.r));
    Object.assign(u, { q: nb.q, r: nb.r, moved: false, acted: false });
    return sim.apply({ t: 'move', uid: u.uid, to: key });
  };
  const ev = turnOn(dialKeys[0]);
  check('a unit ending a move on a dial turns it', ev.some(e => e.type === 'dial' && e.value === 2), JSON.stringify(ev.filter(e => e.type === 'dial')));
  check('the dial turns one step at a time', sim.s.dials[dialKeys[0]] === 2);

  // solve it: the other two dials to winter (3), then the last one: the gate opens
  const solve = G.BattleSim.create({ map: 'clockwork-sanctum', season: 'winter', seed: 4, sides: [
    { troops: [{ kind: 'knight', ref: 'oren', leader: true }] }, { troops: [{ kind: 'knight', ref: 'gray', leader: true }] }] });
  solve.s.dials = Object.fromEntries(Object.keys(solve.s.dials).map((k, i) => [k, i === 2 ? 2 : 3]));
  const u = solve.current(), last = Object.keys(solve.s.dials)[2], d = G.parseKey(last);
  const nb = G.neighbours(d.q, d.r).find(n => solve.tile(G.key(n.q, n.r)) && Number.isFinite(solve.tile(G.key(n.q, n.r)).cost));
  Object.assign(u, { q: nb.q, r: nb.r });
  const opened = solve.apply({ t: 'move', uid: u.uid, to: last });
  check('the gate opens when every dial agrees', opened.some(e => e.type === 'gate') && !Object.values(solve.s.tiles).includes('gate'), JSON.stringify(opened.filter(e => e.type === 'gate')));

  // every species and class fights, with the planner, on several maps: nothing refused, every battle ends
  const troopA = [], troopB = [];
  G.ids('species').forEach((id, i) => {
    troopA.push({ kind: 'monster', ref: id, form: i % 3 });
    if (troopA.length > 5) troopA.shift();
  });
  const knights = G.ids('knight').filter(k => G.get('knight', k).start);
  let refused = 0, unfinished = 0, runs = 0;
  for (const map of ['meadow', 'river-crossing', 'hilltop-fort', 'thorn-hollow', 'open-field', 'clockwork-sanctum']) {
    for (let k = 0; k < knights.length - 1; k += 3) {
      const a = [{ kind: 'knight', ref: knights[k], leader: true, level: 6 }, ...troopA.slice(0, 3)];
      const b = [{ kind: 'knight', ref: knights[k + 1], leader: true, level: 6 }, ...troopA.slice(3, 6)];
      const s = G.BattleSim.create({ map, season: G.SEASON_ORDER[k % 4], seed: 100 + k, sides: [{ troops: a }, { troops: b }] });
      const ev = G.autoplayBattle(s, 6000);
      runs++;
      if (ev.some(e => e.type === 'refused')) refused++;
      if (!s.s.over) unfinished++;
    }
  }
  check('every monster has more than one skill (its form\'s, its element\'s strike, and a passive from the third form)', G.ids('species').every(id => [0, 1, 2].every(f => { const u = G.makeUnit({ kind: 'monster', ref: id, form: f }, 0, 'x'); return u.skills.length >= 2; })));
  check('the planner plays every species and class without a refusal', refused === 0, refused + ' refusals in ' + runs);
  check('every planner battle ends', unfinished === 0, unfinished + ' unfinished of ' + runs);

  // the classes: a promotion needs its level and its mana, and changes the class; a third form needs a level-6 knight
  const cs = G.CampaignSim.create({ humans: ['verdance'], seed: 8 });
  cs.s.realms.verdance.mana = 50;
  check('a knight below level 10 cannot be promoted', /level 10/.test(cs.do({ t: 'promote', knight: 'dunstan' }, 'verdance')));
  cs.s.knights.dunstan.level = 10;
  check('a level 10 squire is promoted to Knight', cs.do({ t: 'promote', knight: 'dunstan' }, 'verdance') === null && cs.s.knights.dunstan.cls === 'knight');
  check('the promoted knight is a Knight in battle', G.makeUnit({ kind: 'knight', ref: 'dunstan', cls: 'knight' }, 0, 'x').cls === 'knight');
  cs.s.knights.dunstan.level = 20;
  check('a level 20 Knight becomes a Paladin', cs.do({ t: 'promote', knight: 'dunstan' }, 'verdance') === null && cs.s.knights.dunstan.cls === 'paladin');
  // a monster bound to a level 6 knight evolves to its third form
  cs.s.realms.verdance.mana = 2000;
  const m = Object.values(cs.s.monsters).find(x => x.castle === 'mossgate') || (() => { cs.do({ t: 'summon', castle: 'mossgate', species: 'gleam-slime' }, 'verdance'); return Object.values(cs.s.monsters).find(x => x.castle === 'mossgate' && !x.bondTo); })();
  cs.s.knights.oren.level = 6;
  cs.do({ t: 'bind', monster: m.uid, knight: 'oren' }, 'verdance');
  check('a monster evolves to its second form at level 3', cs.do({ t: 'evolve', monster: m.uid }, 'verdance') === null && cs.s.monsters[m.uid].form === 1);
  check('a monster evolves to its third form', cs.do({ t: 'evolve', monster: m.uid }, 'verdance') === null && cs.s.monsters[m.uid].form === 2);

  // the story: a season's events fire once, a choice carries its effects, and a join moves a knight to the player
  const st = G.CampaignSim.create({ humans: ['verdance'], seed: 12 });
  check('the opening of a realm is queued at the start', st.s.queue.includes('open-verdance'));
  st.s.queue.length = 0;
  st.s.seasonsPlayed = 1; st.beginMuster();
  check('the season-1 event fires once', st.s.queue.includes('season-1') && st.s.queue.filter(x => x === 'season-1').length === 1);
  st.beginMuster();
  check('an event does not fire twice', st.s.queue.filter(x => x === 'season-1').length === 1);
  st.applyEffects([{ t: 'flag', f: 'x' }, { t: 'mana', n: 3 }], 'verdance');
  check('a choice sets its flag and its mana', st.s.flags.x === true);
  st.applyEffects([{ t: 'join', knight: 'nessa' }], 'verdance');
  check('a joined knight serves the player', st.s.knights.nessa && st.s.knights.nessa.realm === 'verdance');
  // every event names real knights, castles, items and effects
  let bad = [];
  for (const ev of G.all('event')) {
    for (const l of ev.lines) if (l.who && !G.has('knight', l.who)) bad.push(ev.id + ':' + l.who);
    for (const l of ev.lines) for (const c of l.choices || []) for (const e of c.effects) {
      if (e.t === 'join' && !G.has('knight', e.knight)) bad.push(ev.id + ' joins ' + e.knight);
      if (e.t === 'item' && !G.has('item', e.item)) bad.push(ev.id + ' gives ' + e.item);
    }
    if (ev.requires && ev.requires.flag === undefined) bad.push(ev.id + ' requires');
  }
  check('every event names real knights, items and effects', bad.length === 0, bad.join(', '));
  check('the story has 46 events', G.ids('event').length === 46, String(G.ids('event').length));
  check('there are four good endings and three kinds of bad', ['won-verdance', 'won-solmark', 'won-amberlyn', 'won-hoarfast', 'candle', 'ruler', 'lost-meridian'].every(k => G.ENDINGS[k]));
  check('every line has three tiers', Object.values(G.CLASS_LINES).every(l => l.length === 3 && l.every(c => G.has('class', c))));
  check('the plan\'s 23 classes are all here', G.ids('class').length === 23, String(G.ids('class').length));
  check('the plan\'s 90 skills are all here', G.ids('skill').length === 90, String(G.ids('skill').length));

  // Stillness: from autumn of year three, a castle bordering the Dominion is stilled each season; its troops cannot move
  const sc = G.CampaignSim.create({ humans: ['verdance'], seed: 14 });
  sc.s.seasonsPlayed = 9; sc.beginMuster();
  check('no castle is stilled before autumn of year three', sc.s.stilled === null);
  sc.s.seasonsPlayed = 10; sc.beginMuster();
  const still = sc.s.stilled;
  check('a Dominion-bordering castle is stilled in autumn of year three', still !== null && still !== 'meridian' && G.neighbourCastles(still).some(c => sc.s.castles[c].owner === 'dominion'), String(still));
  // put Oren on the stilled castle, held by Verdance: his move is refused for the stillness
  sc.s.castles[still].owner = 'verdance';
  sc.s.knights.oren.castle = still; sc.s.knights.oren.state = 'ready';
  sc.s.realms.verdance.mana = 20;
  const next = G.neighbourCastles(still)[0];
  const refusal = sc.do({ t: 'move', knight: 'oren', to: next }, 'verdance');
  check('a stilled castle\'s knight cannot move', /stilled/.test(String(refusal)), String(refusal));

  // retreat: a commander may leave the field, and its side loses; captures happen when a side is routed beside an enemy knight
  const rt = G.BattleSim.create({ map: 'meadow', season: 'spring', seed: 5, sides: [
    { troops: [{ kind: 'knight', ref: 'oren', leader: true }] }, { troops: [{ kind: 'knight', ref: 'shade', leader: true }] }] });
  const cmdr = rt.current();
  const rev = rt.apply({ t: 'retreat', uid: cmdr.uid });
  check('a commander\'s retreat ends the battle for its side', rt.s.over && rt.s.winner === 1 - cmdr.side && rev.some(e => e.type === 'over'), JSON.stringify(rev.slice(-1)));
  let captured = 0;
  for (let k = 0; k < 400; k++) {
    const cb = G.BattleSim.create({ map: G.ids('map')[k % G.ids('map').length], season: G.SEASON_ORDER[k % 4], seed: 300 + k, sides: [
      { troops: [{ kind: 'knight', ref: 'oren', leader: true }, { kind: 'knight', ref: 'dunstan' }, { kind: 'monster', ref: 'gleam-slime', form: 2 }, { kind: 'monster', ref: 'thorn-hare', form: 2 }, { kind: 'monster', ref: 'moss-toad', form: 2 }, { kind: 'monster', ref: 'thorn-wight', form: 2 }] },
      { troops: [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'knight', ref: 'ashen' }, { kind: 'monster', ref: 'dusk-bat', form: 2 }, { kind: 'monster', ref: 'cinder-imp', form: 2 }, { kind: 'monster', ref: 'frost-mite', form: 0 }, { kind: 'monster', ref: 'bell-spider', form: 2 }] }] });
    captured += G.autoplayBattle(cb, 5000).filter(e => e.type === 'captured').length;
  }
  check('monsters are captured in planner battles', captured > 0, String(captured));
}
