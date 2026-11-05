// The battle planner. It looks at a BattleSim and returns the next legal command for the unit whose turn it is. It is
// deterministic: ties break by unit id and cell key, so the same battle always plays the same way. It serves the CPU
// sides, Delegate (auto-resolve), the attract mode and the AI Hub copies. Each call either changes the state or ends the
// unit's turn, so a battle always reaches its end (tests/t-mechanics.mjs plays whole battles to check that).
(() => {
  const H = G;

  // what a strike from u on t is worth: its expected damage, the chance it kills, and the counter it draws
  const strikeValue = (sim, u, t, from) => {
    const d = H.hexDist(from, t);
    const ranged = d > 1 || u.rng > 1;
    const dmg = sim.damage(u, t);
    const hit = sim.hitChance(u, t, ranged) / 100;
    let v = dmg * hit;
    if (t.hp <= dmg) v += t.knight ? 8 : 5;
    if (t.rng === 1 && d === 1) v -= sim.damage(t, u, H.tune.counterDamage) * (sim.hitChance(t, u, false) / 100) * .7;
    return v;
  };
  // the best basic strike a unit could make from a cell: { value, target }
  const bestStrike = (sim, u, from) => {
    let best = null;
    for (const t of sim.strikeable(u.uid, from)) {
      const v = strikeValue(sim, u, t, from);
      if (!best || v > best.value || (v === best.value && t.uid < best.target.uid)) best = { value: v, target: t };
    }
    return best;
  };
  const nearestEnemy = (sim, u, from) => {
    let best = Infinity;
    for (const t of sim.alive(1 - u.side)) best = Math.min(best, H.hexDist(from, t));
    return best;
  };
  // the value of a skill aimed at a key: the foes it strikes, the allies it mends, the statuses it lays
  const skillValue = (sim, u, id, key) => {
    const sk = H.get('skill', id);
    let v = 0;
    for (const t of sim.affected(u, key, sk)) {
      if (t.side !== u.side) {
        const mult = typeof sk.power === 'number' ? sk.power : 1;
        const dmg = sim.damage(u, t, mult, { magic: sk.magic, vsHour: sk.vsHour, ignoreElem: sk.ignoreElem, ignoreTide: sk.ignoreTide, pierce: sk.pierce });
        if (typeof sk.power === 'number' || sk.pctTarget) v += Math.max(0, dmg * .8) + (t.hp <= dmg ? 6 : 0);
        v += (sk.effects || []).length * 2;
      } else if (sk.power && typeof sk.power === 'object') {
        const heal = sk.power.heal !== undefined ? sk.power.heal : Math.round(t.maxHp * (sk.power.pctMax || 0) / 100);
        v += Math.min(heal, t.maxHp - t.hp) * .6;
      } else if (sk.effects && sk.effects.length) v += 2;
    }
    if (sk.area === 'self' && sk.effects && sk.effects.length) v += 1;
    return v;
  };

  H.aiBattle = {
    // the next command for the unit whose turn it is
    next(sim) {
      const u = sim.current();
      if (!u) return null;
      const enemies = sim.alive(1 - u.side);
      if (!enemies.length) return { t: 'wait', uid: u.uid };

      // 1. a skill worth more than the basic strike from where the unit stands (or after its move)
      const here = bestStrike(sim, u, { q: u.q, r: u.r });
      let bestSkill = null;
      for (const id of u.skills || []) {
        for (const key of sim.skillCandidates(u.uid, id)) {
          const v = skillValue(sim, u, id, key);
          if (v > 0 && (!bestSkill || v > bestSkill.v + 1e-9)) bestSkill = { v, id, key };
        }
      }
      if (bestSkill && (!here || bestSkill.v > here.value)) return { t: 'skill', uid: u.uid, skill: bestSkill.id, key: bestSkill.key };

      // 2. a commander holds its place while the enemy is far away
      const hold = u.leader && u.side === 1 && nearestEnemy(sim, u, u) > 4;

      // 3. move: the best cell in reach, by what it lets the unit strike, the ground it stands on and the enemy's distance
      if (!u.moved && !hold) {
        let best = null;
        for (const k of sim.reach(u.uid).keys()) {
          const c = H.parseKey(k);
          const strike = bestStrike(sim, u, c);
          const near = nearestEnemy(sim, u, c);
          const t = sim.tile(k);
          let score = (strike ? 10 + strike.value * 1.5 : 0) - near * (strike ? .2 : 1.5) + (t ? t.def * 1.5 : 0);
          if (u.leader && u.side === 0 && sim.s.keep) score -= H.hexDist(c, H.parseKey(sim.s.keep)) * .3;
          if (u.hp < u.maxHp * .4) score -= Math.max(0, 3 - near) * 3;
          if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && k < best.key)) best = { key: k, score };
        }
        if (best && best.key !== H.key(u.q, u.r)) return { t: 'move', uid: u.uid, to: best.key };
      }

      // 4. strike from here (after any move), or wait
      const now = bestStrike(sim, u, { q: u.q, r: u.r });
      if (now) return { t: 'attack', uid: u.uid, target: now.target.uid };
      if (!u.acted && !u.moved && !hold && nearestEnemy(sim, u, u) <= u.mov + u.rng + 3) {
        // a unit that could not get close this turn still steps toward the nearest enemy
        let best = null;
        for (const k of sim.reach(u.uid).keys()) {
          const d = nearestEnemy(sim, u, H.parseKey(k));
          if (!best || d < best.d) best = { key: k, d };
        }
        if (best && best.key !== H.key(u.q, u.r)) return { t: 'move', uid: u.uid, to: best.key };
      }
      return { t: 'wait', uid: u.uid };
    }
  };

  // play a whole battle with the planner (Delegate, the attract mode, the tests); returns the events
  H.autoplayBattle = (sim, limit = 4000) => {
    const events = [];
    for (let i = 0; i < limit && !sim.s.over; i++) {
      const cmd = H.aiBattle.next(sim);
      if (!cmd) break;
      const ev = sim.apply(cmd);
      events.push(...ev);
      if (ev.some(e => e.type === 'refused')) throw new Error('planner refused: ' + ev[0].reason + ' ' + JSON.stringify(cmd));
    }
    return events;
  };
})();
