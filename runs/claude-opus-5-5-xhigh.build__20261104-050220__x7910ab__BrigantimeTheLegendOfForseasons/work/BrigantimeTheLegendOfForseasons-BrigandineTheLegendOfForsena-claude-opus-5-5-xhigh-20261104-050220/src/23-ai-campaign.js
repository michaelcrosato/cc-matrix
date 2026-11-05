// THE REALM AI: deterministic per seed. It musters (summon, bind, move, quest, equip, promote) and declares marches
// for every realm not played by a human, and for the player's own realm on autoplay (tests, the attract mode).
// power(unit) = (HP + 4 (ATK + DEF + INT) + 2 AGI) x (1 + 0.05 (level - 1)), x1.2 for knights; defense(c) = the power of
// the troops at c x1.25; threat(c) = the marchable power of foreign neighbours x their aggression; need = threat - defense.

const CA = {};
G.CampaignAI = CA;
const PERS = {
  solmark: { inSeason: 1.3, weakest: true }, hoarfast: { inSeason: 1.3 }, amberlyn: { questers: 3, capitalExtra: 1 },
  verdance: { brigandsFirst: true }, dominion: { hourOnly: true, keepAtCapital: 2 }
};

/** a realm's aggression this season */
CA.aggression = (sim, realm) => {
  const s = sim.s, r = s.realms[realm]; let a = sim.isHuman(realm) ? 1.1 : r.aggression;   // autoplay plays a human realm steadily
  if (realm === 'dominion') a = sim.year <= 1 ? 0 : sim.year === 2 ? (s.flags.dominionAwake ? .8 : 0) : 1.1;
  const re = G.get('realm', realm); if (re.season && re.season === sim.season) a *= (!sim.isHuman(realm) && PERS[realm] && PERS[realm].inSeason) || 1.2;
  return a * G.tune.aiAggression;
};
CA.troopPower = (sim, kid) => sim.troopPower(kid);
CA.castlePower = (sim, cid) => G.sum(sim.defenders(cid), k => sim.troopPower(k));
CA.defense = (sim, cid) => CA.castlePower(sim, cid) * 1.25;
CA.threat = (sim, cid, realm) => {
  const s = sim.s; let t = 0;
  for (const n of G.get('castle', cid).roads) {
    const o = s.castles[n].owner; if (o === realm || o === 'brigands') continue;
    if (o === 'dominion' && CA.aggression(sim, 'dominion') <= 0) continue;
    if (!s.realms[o].alive) continue;
    t += CA.castlePower(sim, n) * Math.max(.3, CA.aggression(sim, o));
  }
  return t;
};
CA.need = (sim, cid, realm) => CA.threat(sim, cid, realm) - CA.defense(sim, cid);
/** a border castle: next to a realm that can attack it (brigands never march; the Hour only once it is roused) */
CA.border = (sim, cid, realm) => G.get('castle', cid).roads.some(n => { const o = sim.s.castles[n].owner; return o !== realm && o !== 'brigands' && (o !== 'dominion' || CA.aggression(sim, 'dominion') > 0) && sim.s.realms[o].alive; });
const monPower = (sp, form, level) => { const st = G.monsterStats(sp, form, level); return (st.hp + 4 * (st.atk + st.def + st.int) + 2 * st.agi) * (1 + .05 * (level - 1)); };

/** the Muster of an AI realm (also the player's on autoplay) */
CA.muster = (sim, realm) => {
  const s = sim.s, r = s.realms[realm], pers = sim.isHuman(realm) ? {} : PERS[realm] || {}, cmd = c => sim.apply(Object.assign({ realm, ai: true }, c));
  if (realm === 'brigands' || !r.alive) return;
  if (pers.questers) (s.aiFlags[realm] = s.aiFlags[realm] || {}).questers = pers.questers;
  const mine = () => sim.castlesOf(realm);
  // 1. summon while mana allows, at the castle that needs it most (the Dominion sleeps in Year 1, then summons one a season)
  let guard = 0;
  const maxSummons = realm === 'dominion' ? (sim.year <= 1 ? 0 : 1) : 12;
  while (guard++ < maxSummons) {
    const up = sim.upkeep(realm); if (r.mana <= 1.1 * up + 30) break;
    const cs = mine().filter(c => !s.castles[c].stilled && s.castles[c].summons < 3 && s.castles[c].knights.length).map(c => ({ c, need: CA.need(sim, c, realm) })).sort((a, b) => b.need - a.need || (a.c < b.c ? -1 : 1));
    if (!cs.length) break;
    const c = cs[0].c, foeEl = CA.strongestNeighbourElem(sim, c, realm), next = G.SEASONS[(s.turn + 1) % 4];
    let best = null;
    for (const sp of sim.circle(c)) {
      const m = G.get('monster', sp); if (pers.hourOnly && m.elem !== 'hour') continue; if (m.meridianOnly && c !== 'meridian') continue;
      const cost = sim.summonCost(sp); if (cost > r.mana - up) continue;
      let v = monPower(sp, 1, sim.summonLevel(realm)) / cost; if (foeEl && G.opposes(m.elem, foeEl)) v *= 1.2; if (m.elem === next) v *= 1.1;
      if (!best || v > best.v) best = { sp, v };
    }
    if (!best) break;
    const kid = s.castles[c].knights.find(k => sim.canAct(k) && sim.bondFree(k) >= G.get('monster', best.sp).rank && sim.knight(k).troop.length < 6);
    const ev = cmd({ t: 'summon', castle: c, sp: best.sp, bindTo: kid });
    if (ev[0] && ev[0].e === 'illegal') break;
  }
  // 2. bind reserve monsters to knights with free Bond, strongest first
  for (const c of mine()) {
    const st = s.castles[c];
    const res = st.reserve.slice().sort((a, b) => { const ma = sim.monster(a), mb = sim.monster(b); return monPower(mb.sp, mb.form, mb.level) - monPower(ma.sp, ma.form, ma.level) || (a < b ? -1 : 1); });
    for (const uid of res) {
      const m = sim.monster(uid), rank = G.get('monster', m.sp).rank;
      const k = st.knights.filter(kk => !sim.knight(kk).quest && sim.bondFree(kk) >= rank && sim.knight(kk).troop.length < 6).sort((a, b) => sim.bondFree(b) - sim.bondFree(a) || (a < b ? -1 : 1))[0];
      if (k) cmd({ t: 'bind', uid, knight: k });
    }
  }
  // 3. move up to 3 troops from surplus to need
  for (let i = 0; i < 3; i++) {
    const cs = mine().filter(c => !s.castles[c].stilled);
    if (cs.length < 2) break;
    const scored = cs.map(c => ({ c, need: CA.need(sim, c, realm) }));
    const needy = scored.slice().sort((a, b) => b.need - a.need || (a.c < b.c ? -1 : 1))[0];
    if (!needy || needy.need <= 0) break;
    let moved = false;
    for (const src of scored.slice().sort((a, b) => a.need - b.need || (a.c < b.c ? -1 : 1))) {
      if (src.c === needy.c || !G.adjacent(src.c, needy.c)) continue;
      const movable = s.castles[src.c].knights.filter(k => sim.canAct(k) && !sim.knight(k).moved && !sim.knight(k).ruler);
      const keep = (CA.border(sim, src.c, realm) ? 1 : 0) + (pers.capitalExtra && src.c === G.get('realm', realm).capital ? 1 : 0) + (pers.keepAtCapital && src.c === 'meridian' ? pers.keepAtCapital : 0);
      if (s.castles[src.c].knights.filter(k => sim.canAct(k)).length - 1 < keep) continue;
      const kid = movable.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1))[0];
      if (kid && sim.legal({ t: 'move', realm, knight: kid, to: needy.c, ai: true })) { cmd({ t: 'move', knight: kid, to: needy.c }); moved = true; break; }
    }
    if (!moved) break;
  }
  // 3b. stage for the march: bring spare troops next to the best target this realm cannot yet take
  if (CA.aggression(sim, realm) > 0) {
    for (let i = 0; i < 3; i++) {
      const best = CA.bestTarget(sim, realm); if (!best || best.ratio >= G.DIFF[s.difficulty].threshold / CA.aggression(sim, realm)) break;
      let moved = false;
      for (const launch of sim.launchers(realm, best.t).sort()) {
        if (s.castles[launch].knights.length >= 6) continue;
        for (const src of G.get('castle', launch).roads.slice().sort()) {
          if (s.castles[src].owner !== realm || s.castles[src].stilled || src === launch) continue;
          const spare = s.castles[src].knights.filter(k => sim.canAct(k) && !sim.knight(k).moved && !sim.knight(k).ruler);
          const keep = (CA.border(sim, src, realm) ? 1 : 0) + (pers.capitalExtra && src === G.get('realm', realm).capital ? 1 : 0) + (src === 'meridian' ? 2 : 0);
          if (s.castles[src].knights.filter(k => sim.canAct(k)).length - 1 < keep || !spare.length) continue;
          const kid = spare.sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1))[0];
          if (sim.legal({ t: 'move', realm, knight: kid, to: launch, ai: true })) { cmd({ t: 'move', knight: kid, to: launch }); moved = true; break; }
        }
        if (moved) break;
      }
      if (!moved) break;
    }
  }
  // 4. quest with a spare knight at an interior castle that has no need (never one the march needs)
  const spare = sim.knightsOf(realm).filter(k => !k.quest).length - sim.castlesOf(realm).filter(c => CA.border(sim, c, realm)).length - 2;
  if (realm !== 'dominion' && spare > 0) {
    const lim = Math.min(pers.questers || 2, spare, sim.year <= 1 ? 1 : 2);
    for (const c of mine()) {
      if (sim.questingCount(realm) >= lim) break;
      // only from a castle deep inside the realm (every neighbour its own): never a launcher or a front
      if (G.get('castle', c).roads.some(n => s.castles[n].owner !== realm) || CA.need(sim, c, realm) > 0) continue;
      const site = G.get('castle', c).site; if (!site || G.get('site', site).story) continue;
      const kid = s.castles[c].knights.filter(k => !sim.knight(k).ruler && sim.canAct(k) && !sim.knight(k).moved).sort((a, b) => sim.knight(a).level - sim.knight(b).level || (a < b ? -1 : 1))[0];
      if (kid && s.castles[c].knights.length > 1) cmd({ t: 'quest', knight: kid, site });
    }
  }
  // 5. equip the best, promote and change class whenever eligible
  CA.equip(sim, realm);
  for (const m of Object.values(s.monsters).filter(m => m.realm === realm).sort((a, b) => a.uid < b.uid ? -1 : 1)) {
    if (sim.legal({ t: 'promote', realm, uid: m.uid, ai: true })) cmd({ t: 'promote', uid: m.uid });
    else if (sim.legal({ t: 'promote', realm, uid: m.uid, seed: true, ai: true })) cmd({ t: 'promote', uid: m.uid, seed: true });
  }
  for (const k of sim.knightsOf(realm)) if (sim.legal({ t: 'classchange', realm, knight: k.id, ai: true })) cmd({ t: 'classchange', knight: k.id });
  // consumables: mana seeds into the treasury
  while (r.items.manaseed > 0) cmd({ t: 'use', item: 'manaseed' });
};
CA.strongestNeighbourElem = (sim, cid, realm) => {
  let best = null, bp = 0;
  for (const n of G.get('castle', cid).roads) { const o = sim.s.castles[n].owner; if (o === realm || o === 'brigands') continue; const p = CA.castlePower(sim, n); if (p > bp) { bp = p; best = G.get('realm', o).season; } }
  return best;
};
CA.equip = (sim, realm) => {
  const s = sim.s, r = s.realms[realm];
  const score = (it, k) => { const m = G.get('item', it).mods, line = G.get('class', k.cls).line, magic = line === 'mage' || line === 'cleric' || ['harvestking', 'rimeduke', 'chancellor', 'hourmaiden'].includes(k.cls);
    const sl = G.get('item', it).slot; if (sl === 'weapon') return magic ? (m.int || 0) * 1.2 + (m.atk || 0) * .3 : (m.atk || 0) * 1.2 + (m.int || 0) * .2 + (m.def || 0) * .3; if (sl === 'armor') return (m.def || 0) + (m.int || 0) * .5 + (m.agi || 0); return (m.bond || 0) * 3 + (m.mov || 0) * 2.5 + (m.ward || 0) * 2 + (G.get('item', it).flags.mending ? 2 : 1); };
  for (const k of sim.knightsOf(realm).sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1))) {
    if (k.quest) continue;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const cur = k.items[slot], curV = cur ? score(cur, k) : -1;
      const opts = Object.keys(r.items).filter(it => r.items[it] > 0 && G.get('item', it).slot === slot && G.canEquip(it, k.cls)).sort();
      let best = null, bv = curV;
      for (const it of opts) { const v = score(it, k); if (v > bv + .01) { bv = v; best = it; } }
      if (best) sim.apply({ t: 'equip', realm, knight: k.id, item: best, ai: true });
    }
  }
};

/** how hard a realm turns on the Hour: 0 before the candle; more as the candle burns and the realm grows */
CA.hourFocus = (sim, realm) => {
  const s = sim.s; if (s.candle === null) return 0;
  const big = sim.castlesOf(realm).length >= 6, low = s.candle <= 8;
  return big || low ? 3 + (low ? 2 : 0) : 1.2;
};
/** the most valuable target and the ratio this realm could bring against it now */
CA.bestTarget = (sim, realm) => {
  const s = sim.s; let best = null;
  for (const t of sim.marchTargets(realm)) {
    if (t === 'sanctum') continue;
    const owner = s.castles[t].owner; if (owner === 'dominion' && sim.year < 2 && t === 'meridian') continue;
    const ks = sim.marchers(realm, t).sort((a, b) => sim.troopPower(b) - sim.troopPower(a)).slice(0, 3);
    const def = CA.defense(sim, t), ratio = def <= 0 ? 9 : G.sum(ks, k => sim.troopPower(k)) / def;
    let v = owner === 'brigands' ? 1.4 : 1; if (G.get('castle', t).tier === 'capital') v *= 1.2; if (owner === 'dominion') v *= 1 + CA.hourFocus(sim, realm); v /= Math.max(.5, def / 3000);
    if (!best || v > best.v) best = { t, ratio, v };
  }
  return best;
};
/** the March of an AI realm: declarations (hidden until resolution) */
CA.march = (sim, realm) => {
  const s = sim.s, pers = sim.isHuman(realm) ? {} : PERS[realm] || {}, agg = CA.aggression(sim, realm);
  if (realm === 'brigands' || !s.realms[realm].alive || agg <= 0) return;
  if (s.sanctumOpen === realm && s.castles.meridian.owner === realm) {
    const ks = sim.marchers(realm, 'sanctum').slice(0, 3); if (ks.length) sim.apply({ t: 'declare', realm, target: 'sanctum', knights: ks, ai: true });
  }
  const threshold = G.DIFF[s.difficulty].threshold, used = new Set();
  const allIn = CA.hourFocus(sim, realm) >= 3;
  const neededAtHome = (kid) => {
    const k = sim.knight(kid), c = k.castle, defs = sim.defenders(c).filter(x => !used.has(x)), thr = CA.threat(sim, c, realm);
    if (k.ruler && realm !== 'dominion') return !allIn && (defs.length <= 1 || CA.border(sim, c, realm));
    if (pers.keepAtCapital && c === 'meridian' && defs.length <= pers.keepAtCapital) return true;
    if (pers.capitalExtra && c === G.get('realm', realm).capital && defs.length <= 2 && !allIn) return true;
    const mine = sim.troopPower(kid) * 1.25, rest = G.sum(defs.filter(x => x !== kid), x => sim.troopPower(x)) * 1.25;
    // the last knight stays only where the threat is real for it; late in the war the realm risks more
    if (defs.length <= 1) return thr > (allIn ? 1.6 : .7) * mine;
    return !allIn && thr > 0 && thr - rest > .4 * thr;
  };
  const targets = [];
  for (const t of sim.marchTargets(realm)) {
    if (t === 'sanctum') continue;
    const owner = s.castles[t].owner;
    if (s.aiFlags[realm] && s.aiFlags[realm]['peace_' + owner] && s.aiFlags[realm]['peace_' + owner] > s.turn) continue;
    if (realm !== 'dominion' && owner === 'dominion' && sim.year < 2 && t !== 'meridian') { /* the Hour is not yet roused, but its castles may still be taken */ }
    const avail = sim.marchers(realm, t).filter(k => !neededAtHome(k)).sort((a, b) => sim.troopPower(b) - sim.troopPower(a) || (a < b ? -1 : 1)).slice(0, 3);
    if (!avail.length) continue;
    const def = CA.defense(sim, t), pw = G.sum(avail, k => sim.troopPower(k)), ratio = def <= 0 ? Infinity : pw / def;
    const urgency = owner === 'dominion' && CA.hourFocus(sim, realm) >= 3 ? .8 : owner === 'dominion' && s.candle !== null ? .9 : 1;
    if (ratio < threshold * urgency / agg) continue;
    let value = Math.min(ratio, 6);
    const ct = G.get('castle', t);
    if (t === 'meridian') value *= sim.castlesOf(realm).some(c => G.get('castle', c).tier === 'satellite') ? 1.5 : .6;
    if (owner === 'dominion') value *= 1 + CA.hourFocus(sim, realm);
    if (ct.tier === 'capital') value *= 1.3;
    if (owner === 'brigands' && sim.year === 1) value *= pers.brigandsFirst ? 2 : 1.2;
    if (pers.weakest && owner !== 'brigands') value *= 1 + 1 / Math.max(1, sim.castlesOf(owner).length);
    targets.push({ t, value, avail });
  }
  targets.sort((a, b) => b.value - a.value || (a.t < b.t ? -1 : 1));
  for (const tg of targets) {
    const ks = tg.avail.filter(k => !used.has(k) && !neededAtHome(k)).slice(0, 3);
    if (!ks.length) continue;
    const def = CA.defense(sim, tg.t), pw = G.sum(ks, k => sim.troopPower(k)), urg = s.castles[tg.t].owner === 'dominion' && CA.hourFocus(sim, realm) >= 3 ? .8 : s.castles[tg.t].owner === 'dominion' && s.candle !== null ? .9 : 1;
    if (def > 0 && pw / def < threshold * urg / agg) continue;
    const ev = sim.apply({ t: 'declare', realm, target: tg.t, knights: ks, ai: true });
    if (ev[0] && ev[0].e !== 'illegal') ks.forEach(k => used.add(k));
  }
};

/** autoplay a whole season for every realm (human realms too): Muster, March, battles delegated. Returns events */
CA.playSeason = (sim, o = {}) => {
  const s = sim.s, out = [];
  if (s.result) return out;
  const t = sim.beginSeason(); out.push(...t.cards);
  for (const e of t.events.concat(sim.takeStory())) out.push(...sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: o.choice ? o.choice(e) : 0 }));
  if (s.result) return out;
  for (const h of s.humans) if (s.realms[h].alive) { CA.muster(sim, h); }
  while (s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() });
  for (const h of s.humans) if (s.realms[h].alive) CA.march(sim, h);
  while (s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
  let guard = 0;
  while (guard++ < 40 && !s.result) {
    const p = sim.nextBattle(); if (!p) break;
    if (p.kind === 'open') { out.push(...sim.takeOpen()); }
    else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); out.push(...sim.applyBattle(b.result())); }
    for (const e of sim.takeStory()) out.push(...sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: o.choice ? o.choice(e) : 0 }));
    if (s.result) break;
  }
  if (!s.result) out.push(...sim.endSeason());
  return out;
};
