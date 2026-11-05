// Campaign suite: the seasons always reach an end, the same seed plays the same campaign, human battles hand back through
// finishPending, and the muster's rules hold (mana, binding, evolution, roads).

// play the campaign to its end: the human passes each muster, and each human battle is fought by the planner
function playOut(G, cs, limit = 80) {
  let res = cs.endMuster(), guard = 0;
  while (!cs.s.ended && guard++ < limit) {
    while (res.battle) {
      const sim = G.BattleSim.load(res.battle.sim);
      G.autoplayBattle(sim, 5000);
      res = cs.finishPending(sim);
    }
    if (cs.s.ended) break;
    res = cs.endMuster();
  }
  return { seasons: cs.s.seasonsPlayed, ended: cs.s.ended, guard };
}

export function run({ check, G }) {
  const fresh = (seed = 5, humans = ['verdance']) => G.CampaignSim.create({ humans, seed });

  const cs = fresh();
  check('Meridian starts in the Dominion\'s hands', cs.ownerOf('meridian') === 'dominion');
  check('each playable realm holds its capital', G.PLAYABLE_REALMS.every(r => cs.ownerOf(G.get('realm', r).capital) === r));
  check('the knights start at their castles', Object.keys(cs.s.knights).length >= 15, String(Object.keys(cs.s.knights).length));
  check('the campaign begins in the muster', cs.s.phase === 'muster');

  // the rules of a muster
  const a = fresh(5);
  a.s.realms.verdance.mana = 2;
  check('a summon needs the mana', /not enough mana/.test(a.do({ t: 'summon', castle: 'mossgate', species: 'cinder-imp' }, 'verdance')));
  a.s.realms.verdance.mana = 500;
  check('a summon at your castle works', a.do({ t: 'summon', castle: 'mossgate', species: 'gleam-slime' }, 'verdance') === null);
  check('a summon costs its mana', a.s.realms.verdance.mana === 500 - a.summonCost('gleam-slime'));
  a.s.realms.verdance.mana = 500;
  a.do({ t: 'summon', castle: 'mossgate', species: 'gleam-slime' }, 'verdance');
  a.do({ t: 'summon', castle: 'mossgate', species: 'gleam-slime' }, 'verdance');
  check('a fourth summon at one castle in a season is refused', /three summons/.test(a.do({ t: 'summon', castle: 'mossgate', species: 'gleam-slime' }, 'verdance')));
  check('you cannot summon at another realm\'s castle', /not your castle/.test(a.do({ t: 'summon', castle: 'brightwall', species: 'gleam-slime' }, 'verdance')));
  const free = Object.values(a.s.monsters).find(m => m.castle === 'mossgate' && !m.bondTo);
  check('a monster at your castle can be bound to the ruler', free && a.do({ t: 'bind', monster: free.uid, knight: 'oren' }, 'verdance') === null, String(free && free.uid));
  check('a bound monster follows its knight', free && a.s.monsters[free.uid].bondTo === 'oren');
  // dunstan is level 2 at Larkhold: a monster bound to him may not evolve yet
  a.s.realms.verdance.mana = 500;
  a.do({ t: 'summon', castle: 'larkhold', species: 'thorn-hare' }, 'verdance');
  const hare = Object.values(a.s.monsters).find(m => m.castle === 'larkhold' && !m.bondTo);
  check('a monster can be bound to a second knight', !!hare && a.do({ t: 'bind', monster: hare.uid, knight: 'dunstan' }, 'verdance') === null);
  check('an evolve needs a level 3 knight', /level 3/.test(a.do({ t: 'evolve', monster: hare.uid }, 'verdance')));
  check('a knight moves only along a road', /road/.test(a.do({ t: 'move', knight: 'oren', castle: 'mossgate', to: 'brightwall' }, 'verdance')));
  check('a knight moves to a neighbour', a.do({ t: 'move', knight: 'oren', castle: 'mossgate', to: 'ferncrest' }, 'verdance') === null);
  check('the bound monster moved with its knight', a.s.monsters[free.uid].castle === 'ferncrest');

  // a deterministic campaign: the same seed plays the same game
  const r1 = playOut(G, fresh(77)), r2 = playOut(G, fresh(77));
  check('the same seed plays the same campaign', r1.seasons === r2.seasons && JSON.stringify(r1.ended) === JSON.stringify(r2.ended), JSON.stringify([r1, r2]));
  check('a campaign ends within its seasons', r1.guard < 80 && r1.ended !== null, JSON.stringify(r1));
  check('a campaign ends by the candle or a holder of Meridian', ['candle', 'meridian', 'ruler'].includes(r1.ended.reason), r1.ended.reason);

  // several seeds, several human realms: every one reaches an end
  let ends = 0, bad = [];
  for (const humans of [['verdance'], ['solmark'], ['hoarfast']]) for (const seed of [1, 2, 3, 4]) {
    const r = playOut(G, fresh(seed, humans));
    if (r.ended) ends++; else bad.push(humans[0] + '/' + seed + ' at ' + r.seasons);
  }
  check('every campaign reaches an end', ends === 12, bad.join(', '));

  // the rival realms act on their own (the marches, summons and changes of hands happen without a human)
  const rival = fresh(9, ['verdance']);
  playOut(G, rival);
  const changed = Object.keys(rival.s.castles).filter(c => rival.s.castles[c].owner !== G.get('castle', c).realm);
  check('the rivals take castles', changed.length > 0, 'no castle changed hands');

  // a finished battle never leaves a knight outside the board, and the ruler is never removed
  const endState = fresh(9, ['verdance']);
  playOut(G, endState);
  check('the human ruler is still in the campaign', !!endState.s.knights.oren);
}
