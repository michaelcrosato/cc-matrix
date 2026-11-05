/* ---- CAMPAIGN AI (§4.15): deterministic per seed. Muster (summon, bind, move, quest, equip, promote), then March ---- */
G.CampaignAI = {
  aggression(sim, r) {
    const S = sim.state, R = S.realms[r], season = sim.season();
    if (r === 'brigands') return 0;
    let a = r === 'hoarfast' ? (R.mood || 1.1) : (R.aggression || 1);
    if (r === 'dominion') a = S.year === 1 && !R.ai.awake ? 0 : S.year <= 2 ? (R.ai.awake ? .7 : 0) : .9;
    else a *= 1 + .12 * (S.year - 1);
    const own = G.get('realm', r).season; if (own && own === season) a *= r === 'solmark' || r === 'hoarfast' ? 1.3 : 1.2;
    return a * G.tune.aiAggression;
  },
  defense(sim, c) { return sim.state.castles[c].knights.filter(k => !sim.kn(k).quest).reduce((a, k) => a + sim.troopPower(k), 0) * 1.25; },
  threat(sim, c, r) {
    const S = sim.state; let t = 0;
    for (const n of G.adj[c] || []) { const o = sim.owner(n); if (o === r || o === 'brigands') continue; if (o === 'dominion' && this.aggression(sim, 'dominion') === 0) continue; t += S.castles[n].knights.filter(k => sim.canAct(k)).reduce((a, k) => a + sim.troopPower(k), 0) * this.aggression(sim, o); }
    return t;
  },
  need(sim, c, r) { return this.threat(sim, c, r) - this.defense(sim, c); },
  border(sim, c, r) { return (G.adj[c] || []).some(n => sim.owner(n) !== r); },
  muster(sim, r, bold) {
    const S = sim.state, R = S.realms[r], cs = sim.castlesOf(r).sort();
    if (r === 'brigands') return;
    // 1. summon while mana > 1.5 × upkeep + 40, at the castle in most need
    let guard = 0;
    while (guard++ < 12 && R.mana > 1.5 * sim.upkeep(r) + 40) {
      const opts = [];
      for (const c of cs) { if (S.castles[c].stilled) continue; const nd = this.need(sim, c, r); for (const o of sim.summonable(c)) if (o.ok) { const st = G.monsterStats(o.sp, 1, 3); let sc = G.unitPower(st, 3, false) / o.cost; if (G.get('monster', o.sp).elem === sim.nextSeason()) sc *= 1.1; opts.push({ c, sp: o.sp, score: sc * (1 + Math.max(0, nd) / 400) }); } }
      if (!opts.length) break;
      opts.sort((a, b) => b.score - a.score || (a.c < b.c ? -1 : 1) || (a.sp < b.sp ? -1 : 1));
      if (!sim.apply({ t: 'summon', realm: r, castle: opts[0].c, sp: opts[0].sp }).ok) break;
    }
    // 2. bind reserves to knights with free Bond, strongest first
    for (const c of cs) {
      const res = S.castles[c].reserve.slice().sort((a, b) => sim.monPower(sim.mon(b)) - sim.monPower(sim.mon(a)) || (a < b ? -1 : 1));
      for (const u of res) { const ks = S.castles[c].knights.filter(k => !sim.kn(k).quest).sort((a, b) => (sim.bondMax(b) - sim.bondUsed(b)) - (sim.bondMax(a) - sim.bondUsed(a)) || (a < b ? -1 : 1)); for (const k of ks) if (sim.apply({ t: 'bind', realm: r, knight: k, uid: u }).ok) break; }
    }
    // 3. move up to 3 troops toward the front: castles beside a castle worth taking (brigands, rivals, the Hour once awake)
    const hourFront = bold && S.year >= 2 && cs.some(c => (G.adj[c] || []).some(n => sim.owner(n) === 'dominion'));
    const front = c => (G.adj[c] || []).some(n => { if (hourFront) return sim.owner(n) === 'dominion'; const o = sim.owner(n); return o !== r && (o !== 'dominion' || this.aggression(sim, r) > 0) && o !== (R.ai.peaceUntil > S.year * 4 + S.si ? R.ai.peaceWith : null); });
    const sanctumGoal = bold && S.flags.sanctumOpen && sim.owner('meridian') === r;
    const meridianGoal = bold && !sanctumGoal && S.year >= 2 && sim.owner('meridian') !== r ? cs.filter(c => (G.adj[c] || []).includes('meridian')) : [];
    const dist = {}; { const q = sanctumGoal ? ['meridian'] : meridianGoal.length ? meridianGoal.slice() : cs.filter(front); q.forEach(c => dist[c] = 0); while (q.length) { const c = q.shift(); for (const n of G.adj[c] || []) if (sim.owner(n) === r && dist[n] === undefined) { dist[n] = dist[c] + 1; q.push(n); } } }
    let moves = 0; const maxMoves = sanctumGoal || meridianGoal.length ? 6 : 3;
    for (const c of cs.slice().sort((a, b) => (dist[b] || 0) - (dist[a] || 0) || (a < b ? -1 : 1))) {
      if (moves >= maxMoves || !dist[c]) continue;
      if ((r === 'dominion' || sanctumGoal) && c === 'meridian') continue;
      const keep = this.threat(sim, c, r) > 0 ? 1 : 0, here = S.castles[c].knights.filter(k => sim.canAct(k) && !sim.kn(k).moved && (!sim.kn(k).ruler || sanctumGoal)).sort((a, b) => sim.troopPower(b) - sim.troopPower(a));
      const go = here.slice(0, Math.max(0, S.castles[c].knights.length - Math.max(keep, 1) + (here.length === S.castles[c].knights.length && !keep ? 1 : 0)));
      const dest = (G.adj[c] || []).filter(n => sim.owner(n) === r && !S.castles[n].stilled && dist[n] !== undefined && dist[n] < dist[c] && S.castles[n].knights.length < 6).sort((a, b) => dist[a] - dist[b] || (a < b ? -1 : 1))[0];
      if (!dest) continue;
      for (const k of go) { if (moves >= maxMoves) break; if (sim.apply({ t: 'move', realm: r, knight: k, to: dest }).ok) moves++; }
    }
    // 4. quest with knights at interior castles (Amberlyn sends up to 3)
    for (const c of cs) {
      if (this.border(sim, c, r)) continue;
      for (const k of S.castles[c].knights.slice()) { const sites = sim.questSites(k).filter(s => !G.get('site', s).story); if (sites.length) sim.apply({ t: 'quest', realm: r, knight: k, site: sites[0] }); }
    }
    // 5. equip the best item per slot, then promote and change class
    for (const k of sim.knightsOf(r)) {
      const line = G.get('class', k.cls).line, key = ['mage', 'cleric'].includes(line) ? 'int' : 'atk';
      for (const slot of ['weapon', 'armor', 'accessory']) {
        const val = id => { const it = G.get('item', id); return slot === 'weapon' ? (it.mods[key] || 0) : slot === 'armor' ? (it.mods.def || 0) + (it.mods.int || 0) * .5 : (it.mods.bond || 0) * 3 + (it.mods.mov || 0) * 2 + (it.mods.ward || 0) + 1; };
        const best = R.items.filter(id => G.get('item', id).slot === slot && G.canEquip(id, k.cls)).sort((a, b) => val(b) - val(a) || (a < b ? -1 : 1))[0];
        if (best && (!k.equip[slot] || val(best) > val(k.equip[slot]))) sim.apply({ t: 'equip', realm: r, knight: k.id, item: best });
      }
      if (sim.canClassChange(k).ok) sim.apply({ t: 'classChange', realm: r, knight: k.id });
    }
    for (const m of sim.realmMonsters(r)) if (sim.canPromote(m).ok) sim.apply({ t: 'promote', realm: r, uid: m.uid });
  },
  march(sim, r, bold) {
    const S = sim.state, R = S.realms[r], ag = this.aggression(sim, r); if (ag <= 0) return;
    const stall = bold ? (R.ai.stall || 0) : 0, thr = G.DIFF[S.difficulty].threshold * (bold ? Math.max(.35, .7 - .1 * stall) : 1), peace = R.ai.peaceWith && (R.ai.peaceUntil || 0) > S.year * 4 + S.si ? R.ai.peaceWith : null;
    const targets = [];
    for (const c of Object.keys(S.castles).sort()) {
      const o = sim.owner(c); if (o === r || o === peace) continue;
      const from = (G.adj[c] || []).filter(n => sim.owner(n) === r);
      if (!from.length) continue;
      const avail = [];
      for (const f of from) {
        const ks = S.castles[f].knights.filter(k => sim.canAct(k) && !sim.kn(k).marched).sort((a, b) => sim.troopPower(b) - sim.troopPower(a));
        const thr0 = this.threat(sim, f, r), keep = r === 'dominion' && f === 'meridian' ? 2 : (thr0 > 0 && !(bold && (R.ai.stall || 0) >= 2) ? 1 : 0) + (r === 'amberlyn' && f === G.get('realm', r).capital ? 1 : 0);
        avail.push(...ks.slice(keep).filter(k => !(sim.kn(k).ruler && thr0 > 0 && ks.length < 3)));
      }
      if (!avail.length) continue;
      const top = avail.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3), pow = top.reduce((a, k) => a + sim.troopPower(k), 0), def = this.defense(sim, c) / 1.25;
      const ratio = def <= 0 ? 99 : pow / def;
      let value = ratio * (c === 'meridian' ? 1.5 : G.get('castle', c).tier === 'capital' ? 1.3 : 1) * (o === 'brigands' && S.year === 1 ? 1.2 : 1);
      if (r === 'verdance' && o === 'brigands') value *= 1.3;
      if (bold && o === 'dominion' && S.year >= 2) value *= 1.6;
      if (r === 'solmark') value *= 1 + 200 / (def + 200) * .3;
      if (ratio >= thr / ag) targets.push({ c, top, value });
    }
    targets.sort((a, b) => b.value - a.value || (a.c < b.c ? -1 : 1));
    let declared = 0; for (const t of targets) { const ks = t.top.filter(k => !sim.kn(k).marched); if (ks.length && sim.apply({ t: 'declare', realm: r, target: t.c, knights: ks }).ok) declared++; }
    if (bold) R.ai.stall = declared ? 0 : stall + 1;
  },
  // the player's realm on autoplay (attract mode, playthrough bot): the same planner, plus the Sanctum when open
  autoplayMuster(sim, r) { this.muster(sim, r, true); },
  autoplayMarch(sim, r) {
    const S = sim.state; this.march(sim, r, true);
    if (S.flags.sanctumOpen && sim.owner('meridian') === r && !S.marches.some(m => m.target === 'sanctum')) {
      const ks = S.castles.meridian.knights.filter(k => sim.canAct(k) && !sim.kn(k).marched).sort((a, b) => sim.troopPower(b) - sim.troopPower(a)).slice(0, 3);
      if (ks.length >= 3 || (ks.length && S.flags.sanctumWaited)) sim.apply({ t: 'declare', realm: r, target: 'sanctum', knights: ks }); else S.flags.sanctumWaited = true;
    }
  }
};
