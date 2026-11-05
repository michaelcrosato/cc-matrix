// The campaign AI: the muster of a CPU realm (the rival realms and the Hourless Dominion). It uses the same actions a human
// does (CampaignSim.do), so a rival is never allowed what a player is not. Its choices come from the campaign's seeded
// random numbers. Rival aggression (dev mode) scales how readily it marches: 0 never marches, 2 marches on near-even odds.
(() => {
  const H = G;

  // what a castle is worth in a fight: the knights who could hold it and the monsters that stand with them
  const strength = (sim, castle) => {
    let n = 0;
    for (const k of sim.knightsAt(castle)) if (k.state === 'ready') n += k.level * 6 + k.hp;
    for (const m of sim.monstersAt(castle)) n += m.hp;
    return n;
  };
  const ownStrength = (sim, K) => K.level * 6 + K.hp + sim.bondedTo(K.id).reduce((n, m) => n + m.hp, 0);

  const muster = (sim, realm) => {
    const s = sim.s, R = s.realms[realm];
    const mine = Object.keys(s.castles).filter(c => s.castles[c].owner === realm).sort();
    if (!mine.length) return;

    // 1. summon one monster at each castle, if the mana is there: the realm's own element first
    const speciesFor = () => {
      const pool = H.ids('species').filter(id => {
        const sp = H.get('species', id);
        return sp.element === (H.get('realm', realm).element) || (realm === 'dominion' && sp.element === 'hour');
      });
      return pool.length ? pool : H.ids('species');
    };
    const pool = speciesFor();
    for (const c of mine) {
      const sp = pool[sim.rand(0, pool.length - 1)];
      if (sim.do({ t: 'summon', castle: c, species: sp }, realm) === null) continue;
    }

    // 2. bind free monsters to ready knights standing at their castles
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || !mine.includes(k.castle)) continue;
      for (const m of sim.unboundAt(k.castle)) sim.do({ t: 'bind', monster: m.uid, knight: k.id }, realm);
    }

    // 3. evolve a bound monster when its knight is seasoned and the mana is there
    for (const m of Object.values(s.monsters)) {
      if (m.form !== 0 || !m.bondTo) continue;
      const k = s.knights[m.bondTo];
      if (k && k.realm === realm && k.level >= 3 && R.mana >= sim.evolveCost(m.species)) sim.do({ t: 'evolve', monster: m.uid }, realm);
    }

    // 4. equip the treasury's first item on any knight without one
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.items.length || k.state !== 'ready' || !s.stock.length) continue;
      sim.do({ t: 'equip', knight: k.id, castle: k.castle, item: s.stock[0] }, realm);
    }

    // 5. reinforce: a ready knight with no march moves to a neighbouring own castle that has no knight and touches an enemy
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || s.marches.some(m => m.knight === k.id)) continue;
      if (k.id === H.get('realm', realm).ruler) continue;
      if (k.castle === 'meridian') continue;   // the Calendar City keeps its wardens
      const here = k.castle;
      if (sim.knightsAt(here).length > 1) continue;
      const target = sim.adjacentCastles(here).find(c => s.castles[c].owner === realm && !sim.knightsAt(c).length && sim.adjacentCastles(c).some(d => s.castles[d].owner !== realm));
      if (target) sim.do({ t: 'move', knight: k.id, castle: here, to: target }, realm);
    }

    // 6. marches: a ready knight attacks a neighbouring enemy castle it outmatches (scaled by rival aggression)
    const aggression = H.tune.rivalAggression;
    if (aggression <= 0) return;
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready' || s.marches.some(m => m.knight === k.id) || !mine.includes(k.castle)) continue;
      if (k.castle === 'meridian') continue;   // the wardens of the Calendar City do not march
      let best = null;
      // a ruler marches only with overwhelming odds: a fallen ruler ends its realm's game
      const ruler = k.id === H.get('realm', realm).ruler;
      for (const c of sim.adjacentCastles(k.castle)) {
        if (s.castles[c].owner === realm) continue;
        const enemy = strength(sim, c), own = ownStrength(sim, k) * aggression;
        if (own < enemy * (ruler ? 2.2 : .9)) continue;
        if (!best || enemy < best.enemy) best = { c, enemy };
      }
      if (best) sim.do({ t: 'march', knight: k.id, castle: k.castle, to: best.c }, realm);
    }
  };

  H.aiCampaign = { muster, strength };
  H.AUTOPLAY_RULER_ODDS = 99;   // the odds a ruler needs to march; 99 keeps the autoplay ruler at home
  H.AUTOPLAY_ODDS = 1.2;   // the autoplay player marches with a knight that is this many times the castle's strength

  // the autoplay player's muster (plan §14.5): the same building as a CPU realm, plus promotions. Its march is one plan:
  // a single goal a season (Meridian once one of our castles stands beside it, else the weakest enemy castle beside us),
  // a staging castle beside the goal that the knights gather into, and an army that marches only when its strength is
  // enough. Its ruler stays home.
  H.autoplayMuster = (sim, realm) => {
    const s = sim.s;
    const aggression = H.tune.rivalAggression;
    H.tune.rivalAggression = 0;
    try { muster(sim, realm); } finally { H.tune.rivalAggression = aggression; }
    const ruler = H.get('realm', realm).ruler;
    for (const k of Object.values(s.knights)) {
      if (k.realm !== realm || k.state !== 'ready') continue;
      const cls = H.get('class', k.cls || H.get('knight', k.id).cls);
      if (cls.next && k.level >= H.PROMOTE_LEVEL[H.get('class', cls.next).tier]) sim.do({ t: 'promote', knight: k.id }, realm);
    }
    const mine = (c) => s.castles[c].owner === realm;
    const enemyBeside = Object.keys(s.castles).filter(c => !mine(c) && sim.adjacentCastles(c).some(mine)).sort();
    if (!enemyBeside.length) return;
    const soldiers = () => Object.values(s.knights).filter(k => k.realm === realm && k.state === 'ready' && k.id !== ruler && !s.marches.some(m => m.knight === k.id));
    // the army that can reach a goal: the soldiers at its staging castle and at the castles beside it
    const stageOf = (goal) => sim.adjacentCastles(goal).filter(mine).sort((a, b) => strength(sim, b) - strength(sim, a) || (a < b ? -1 : 1))[0];
    const armyFor = (goal, stage) => soldiers().filter(k => k.castle === stage || sim.adjacentCastles(k.castle).includes(goal));
    const power = (army) => army.reduce((n, k) => n + ownStrength(sim, k), 0);
    // the goal: Meridian when the army can take it; otherwise the weakest enemy castle beside us (so the army fights and grows)
    const weakest = enemyBeside.filter(c => c !== 'meridian').sort((a, b) => strength(sim, a) - strength(sim, b) || (a < b ? -1 : 1))[0];
    let goal = null;
    if (enemyBeside.includes('meridian') && stageOf('meridian') && power(armyFor('meridian', stageOf('meridian'))) >= strength(sim, 'meridian') * H.AUTOPLAY_ODDS) goal = 'meridian';
    else if (weakest) goal = weakest;
    else goal = 'meridian';
    const stage = stageOf(goal);
    if (!stage) return;
    // gather: every ready soldier beside the staging castle moves into it
    for (const k of soldiers().sort((a, b) => a.id < b.id ? -1 : 1)) {
      if (k.castle === stage || !sim.adjacentCastles(k.castle).includes(stage)) continue;
      // a castle that holds the ruler keeps one soldier beside it: the ruler must never be left to defend alone
      const here = sim.knightsAt(k.castle);
      if (here.some(x => x.id === ruler) && here.filter(x => x.id !== ruler).length <= 1) continue;
      sim.do({ t: 'move', knight: k.id, castle: k.castle, to: stage }, realm);
    }
    // the army marches when its strength is enough for the goal
    const army = armyFor(goal, stage);
    if (army.length && power(army) >= strength(sim, goal) * H.AUTOPLAY_ODDS) {
      for (const k of army) if (sim.adjacentCastles(k.castle).includes(goal) || k.castle === goal) sim.do({ t: 'march', knight: k.id, castle: k.castle, to: goal }, realm);
    }
  };
})();
