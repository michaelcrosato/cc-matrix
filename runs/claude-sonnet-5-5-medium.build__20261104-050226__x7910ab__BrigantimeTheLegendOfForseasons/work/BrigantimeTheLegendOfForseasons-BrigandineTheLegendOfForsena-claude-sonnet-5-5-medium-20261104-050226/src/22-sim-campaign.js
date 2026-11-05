/* ---- CampaignSim: the calendar, the economy, the castles, the marches. Pure and deterministic (state is JSON). ---- */
const C = G.Campaign = {};
const R = G.Rng;
C.isHuman = (S, r) => (S.humans || [S.human]).includes(r);
C.activeHumans = S => S.humans.filter(r => S.realms[r].alive && C.castlesOf(S, r).length);
C.nextSeat = S => { const act = C.activeHumans(S); const i = act.indexOf(S.human); if (i >= 0 && i + 1 < act.length) { S.human = act[i + 1]; S.seat = i + 1; return true; } return false; };
const xpNeed = lvl => 30 + lvl * 15;
C.xpNeed = xpNeed;
C.DIFF = { Easy: { candle: 4, human: 1.25, ai: .85 }, Normal: { candle: 0, human: 1, ai: 1 }, Hard: { candle: -2, human: .9, ai: 1.2 } };
C.mon = (S, id) => S.mons[id];
C.knightsOf = (S, realm) => Object.values(S.knights).filter(k => k.realm === realm && k.at != null);
C.castlesOf = (S, realm) => S.castles.filter(c => c.owner === realm);
C.newMon = (S, species, lvl, castle, realm, form = 0) => { const id = 'M' + (S.nextMon++); S.mons[id] = { id, species, form, lvl, xp: 0, hp: null, owner: null, at: castle, realm }; if (castle != null) S.castles[castle].reserve.push(id); return S.mons[id]; };
C.addKnight = (S, id, realm, castle, extra = {}) => {
  const K = G.KNIGHTS[id];
  S.knights[id] = Object.assign({ id, realm, line: K.line, tier: K.role === 'ruler' ? 1 : id === 'gray' ? 2 : 0, lvl: K.lvl, xp: 0, hp: null, equip: {}, mons: [], at: castle, wounded: 0, quest: null, moved: false, marched: false, ruler: K.role === 'ruler' || K.role === 'brigand' }, extra);
  if (castle != null) S.castles[castle].knights.push(id);
  return S.knights[id];
};
const speciesForRealm = realm => G.all('monster').filter(m => (G.REALMS[realm].season === 4 ? m.el === 4 : m.el === G.REALMS[realm].season)).map(m => m.id);

C.create = (opt = {}) => {
  const humans = opt.humans && opt.humans.length ? opt.humans.slice() : [opt.human != null ? opt.human : 0], human = humans[0], seed = opt.seed || 1;
  const S = { v: 1, seed, rng: R.make(seed), year: 1, season: 0, turn: 0, phase: 'tidings', candle: null, difficulty: opt.difficulty || 'Normal', human, humans, seat: 0, nextMon: 1,
    realms: G.REALMS.map(r => ({ id: r.id, mana: r.id === 4 ? 300 : r.id === 5 ? 0 : Math.round(G.tune.startMana), items: [], alive: true })), castles: [], knights: {}, mons: {}, flags: {}, cards: [], queue: [], marches: [], over: null,
    stats: { battles: 0, wins: 0, captured: 0, castles: 0, deaths: 0 }, stillCastle: -1, eventsDone: {}, pending: [], log: [] };
  G.CASTLES.forEach((c, i) => S.castles.push({ id: c.id, owner: G.CASTLE_OWNER[i], knights: [], reserve: [], stilled: false, taken: false, summons: 0 }));
  const place = { elaine: 1, percival: 2, bors: 3, gawain: 4, lamorak: 5, dagonet: 6, ragnell: 7, kay: 8, tristan: 9, nimue: 10, bedivere: 11, palamedes: 12, vesper: 0, gray: 0, tarry: 13, lull: 14, maelgwn: 15, wick: 16 };
  Object.assign(place, G.MORE_PLACE);
  for (const id in place) { const K = G.KNIGHTS[id]; C.addKnight(S, id, K.realm, place[id]); }
  for (const id of G.FREE_KNIGHTS) C.addKnight(S, id, 5, null, { free: true });
  for (const k of Object.values(S.knights)) {
    if (k.at == null) continue;
    const pool = k.realm === 5 ? ['bone', 'wolf', 'raven'] : speciesForRealm(k.realm), n = k.ruler ? 3 : 2;
    for (let i = 0; i < n; i++) { const m = C.newMon(S, R.pick(S.rng, pool), Math.max(1, Math.floor(k.lvl / 2)), null, k.realm); S.castles[k.at].reserve.length; m.at = k.at; m.owner = k.id; k.mons.push(m.id); }
  }
  S.castles.forEach(c => { c.treasury = (c.id % 3 === 0) ? R.pick(S.rng, G.ITEM_IDS.filter(i => !['seed', 'writ'].includes(i))) : null; });
  for (const h of humans) S.realms[h].items.push('potion', 'potion');
  return S;
};

/* ---- derived numbers ---- */
C.monCount = (S, realm) => Object.values(S.mons).filter(m => m.realm === realm && m.at != null).length;
C.upkeepOf = (S, realm) => {
  let u = 0; const winter = S.season === 3;
  for (const m of Object.values(S.mons)) if (m.realm === realm && m.at != null) { const sp = G.get('monster', m.species); u += sp.bond * 1.5 * (winter && sp.el !== 3 ? 1 + G.tune.winterUpkeep : 1); }
  return Math.round(u * G.tune.upkeep);
};
C.incomeOf = (S, realm) => {
  let v = 0;
  for (const c of C.castlesOf(S, realm)) { if (c.stilled) continue; const cd = G.CASTLES[c.id]; v += G.castleYield(cd) * (cd.region === S.season ? 1 + G.tune.seasonYield : 1); }
  const d = C.DIFF[S.difficulty]; v *= C.isHuman(S, realm) ? d.human : (realm === 5 ? 0 : d.ai);
  return Math.round(v * G.tune.manaIncome);
};
C.summonCost = sp => Math.round(sp.cost * G.tune.summonCost);
C.bondUsed = (S, k) => k.mons.reduce((a, id) => a + G.get('monster', S.mons[id].species).bond, 0);
C.bondCap = (S, k) => G.knightStats(k).bond;
C.power = (S, k) => { const st = G.knightStats(k); let p = st.atk + st.int + st.def + st.hp / 3; for (const id of k.mons) { const m = S.mons[id], s = G.monStats(G.get('monster', m.species), m.form, m.lvl); p += s.atk + s.int + s.def + s.hp / 3; } return p; };
C.nextSeason = S => ({ year: S.season === 3 ? S.year + 1 : S.year, season: (S.season + 1) % 4 });
C.label = S => G.SEASONS[S.season] + ', Year ' + S.year;
C.seasonsLeft = S => S.candle;
const log = (S, text, kind = 'info') => { S.cards.push({ kind, text }); };

/* ---- leveling and promotion ---- */
C.grant = (S, ent, xp, out) => {
  ent.xp += xp; let up = 0;
  while (ent.xp >= xpNeed(ent.lvl) && ent.lvl < 40) { ent.xp -= xpNeed(ent.lvl); ent.lvl++; up++; }
  if (up && out) out.push({ id: ent.id, up, lvl: ent.lvl });
  return up;
};
C.canPromoteMon = (S, m, seed) => { const hour = G.get('monster', m.species).el === 4; if (m.form >= 2) return false; const need = m.form === 0 ? 12 : 22, seeded = m.form === 0 ? 6 : 16; return m.lvl >= need || (!hour && seed && m.lvl >= seeded); };
C.canPromoteKnight = (S, k, writ) => (k.tier === 0 && k.lvl >= 10) || (k.tier === 1 && k.lvl >= 20 && writ);

/* ---- Muster actions. Each returns { ok, text } ---- */
const myRealm = (S, id) => S.realms[id];
C.summon = (S, castleId, species) => {
  const c = S.castles[castleId], sp = G.get('monster', species), cd = G.CASTLES[castleId], realm = myRealm(S, c.owner);
  if (!sp || !cd.circle.includes(species)) return { ok: false, text: 'That circle cannot call it.' };
  if (c.stilled) return { ok: false, text: 'The castle is Stilled.' };
  if (c.summons >= 3) return { ok: false, text: 'The circle is tired: three summonings a season.' };
  const cost = C.summonCost(sp); if (realm.mana < cost) return { ok: false, text: 'Not enough mana.' };
  const avg = C.knightsOf(S, c.owner).reduce((a, k, _, arr) => a + k.lvl / arr.length, 0) || 2;
  realm.mana -= cost; c.summons++;
  const m = C.newMon(S, species, Math.max(1, Math.floor(avg / 2)), castleId, c.owner);
  return { ok: true, text: sp.names[0] + ' answers the circle.', mon: m };
};
C.bind = (S, monId, knightId) => {
  const m = S.mons[monId], k = S.knights[knightId];
  if (!m || !k || m.at !== k.at || m.owner) return { ok: false, text: 'Not here.' };
  if (k.mons.length >= 4) return { ok: false, text: 'A troop holds four monsters.' };
  const sp = G.get('monster', m.species); if (C.bondUsed(S, k) + sp.bond > C.bondCap(S, k)) return { ok: false, text: 'Beyond ' + G.KNIGHTS[k.id].short + '\'s Bond.' };
  const c = S.castles[m.at]; c.reserve.splice(c.reserve.indexOf(monId), 1); m.owner = knightId; k.mons.push(monId); return { ok: true, text: 'Bound.' };
};
C.unbind = (S, monId) => {
  const m = S.mons[monId]; if (!m || !m.owner) return { ok: false };
  const k = S.knights[m.owner]; k.mons.splice(k.mons.indexOf(monId), 1); m.owner = null; S.castles[m.at].reserve.push(monId); return { ok: true, text: 'Released to the reserve.' };
};
C.dismiss = (S, monId) => { const m = S.mons[monId]; if (!m || m.owner) return { ok: false }; const c = S.castles[m.at]; c.reserve.splice(c.reserve.indexOf(monId), 1); delete S.mons[monId]; return { ok: true, text: 'Dismissed.' }; };
C.moveKnight = (S, knightId, to) => {
  const k = S.knights[knightId], from = S.castles[k.at];
  if (k.moved || k.wounded || k.quest) return { ok: false, text: 'Cannot move now.' };
  if (!G.ADJ[k.at].includes(to) || S.castles[to].owner !== k.realm) return { ok: false, text: 'Only to a neighbouring castle of your own.' };
  if (from.stilled || S.castles[to].stilled) return { ok: false, text: 'A Stilled castle holds fast.' };
  if (S.castles[to].knights.length >= 6) return { ok: false, text: 'Full.' };
  from.knights.splice(from.knights.indexOf(knightId), 1); S.castles[to].knights.push(knightId); k.at = to; k.moved = true;
  for (const id of k.mons) S.mons[id].at = to; return { ok: true, text: 'Marched to ' + G.CASTLES[to].short + '.' };
};
C.questWeights = (S, k) => {
  const L = k.line, w = { treasure: 30, beast: 20, wanderer: Object.values(S.knights).some(x => x.free && !x.joined) ? 10 : 0, mana: 15, training: 15, mishap: 10 };
  if (L === 3) w.treasure += 10; if (L === 4) w.beast += 15; if (L === 1) w.wanderer += w.wanderer ? 10 : 0; if (k.lvl >= 10) w.mishap -= 5;
  return w;
};
C.canQuest = (S, k) => !k.ruler && !k.wounded && !k.quest && !k.moved && !k.free && Object.values(S.knights).filter(x => x.realm === k.realm && x.quest).length < 2 && !S.castles[k.at].stilled;
C.quest = (S, knightId) => {
  const k = S.knights[knightId]; if (!C.canQuest(S, k)) return { ok: false, text: 'Cannot quest now.' };
  const w = C.questWeights(S, k), tot = Object.values(w).reduce((a, b) => a + b, 0); let r = R.next(S.rng) * tot, out = 'mana';
  for (const key in w) { if (r < w[key]) { out = key; break; } r -= w[key]; }
  const site = G.SITES[k.at], cd = G.CASTLES[k.at];
  k.quest = { site: site[0], left: site[1], outcome: out, castle: k.at, roll: R.int(S.rng, 1000) };
  const c = S.castles[k.at]; c.knights.splice(c.knights.indexOf(knightId), 1); k.moved = true;
  return { ok: true, text: G.KNIGHTS[k.id].short + ' rides for ' + site[0] + '.' };
};
C.equip = (S, knightId, item) => {
  const k = S.knights[knightId], it = G.get('item', item), pool = S.realms[k.realm].items; const ix = pool.indexOf(item);
  if (!it || ix < 0 || !['w', 'a', 'c'].includes(it.slot)) return { ok: false, text: 'Cannot equip that.' };
  const old = k.equip[it.slot]; if (old) pool.push(old); k.equip[it.slot] = item; pool.splice(pool.indexOf(item), 1); return { ok: true, text: G.KNIGHTS[k.id].short + ' takes the ' + it.name + '.' };
};
C.useItem = (S, realm, item, target) => {
  const pool = S.realms[realm].items, ix = pool.indexOf(item); if (ix < 0) return { ok: false, text: 'None left.' };
  if (item === 'seed') { const m = S.mons[target]; if (!m || !C.canPromoteMon(S, m, true) || C.canPromoteMon(S, m, false)) return { ok: false, text: 'It is not ready, or needs no seed.' }; pool.splice(ix, 1); m.form++; return { ok: true, text: G.get('monster', m.species).names[m.form] + ' blooms.', promoted: true }; }
  if (item === 'writ') { const k = S.knights[target]; if (!k || !C.canPromoteKnight(S, k, true) || k.tier !== 1) return { ok: false, text: 'Not ready for the third class.' }; pool.splice(ix, 1); k.tier = 2; return { ok: true, text: G.KNIGHTS[k.id].short + ' is knighted again: ' + G.LINES[k.line].names[2] + '.', promoted: true }; }
  if (item === 'potion' || item === 'ether') { pool.splice(ix, 1); const e = S.mons[target] || S.knights[target]; if (e) e.hp = null; return { ok: true, text: 'Restored.' }; }
  return { ok: false, text: 'Use it in the field.' };
};
C.promoteMon = (S, monId) => { const m = S.mons[monId]; if (!m || !C.canPromoteMon(S, m, false)) return { ok: false, text: 'Not ready.' }; m.form++; m.hp = null; return { ok: true, text: G.get('monster', m.species).names[m.form] + ' is changed.' }; };
C.promoteKnight = (S, kid) => { const k = S.knights[kid]; if (k.tier !== 0 || k.lvl < 10) return { ok: false, text: 'Not ready.' }; k.tier = 1; return { ok: true, text: G.KNIGHTS[kid].short + ' is now a ' + G.LINES[k.line].names[1] + '.' }; };

/* ---- marches ---- */
C.canMarch = (S, k) => !k.marched && !k.wounded && !k.quest && !S.castles[k.at].stilled && k.at != null;
C.targetsFor = (S, realm) => {
  const out = new Set();
  for (const c of C.castlesOf(S, realm)) if (!c.stilled && c.knights.some(id => C.canMarch(S, S.knights[id]))) for (const n of G.ADJ[c.id]) if (S.castles[n].owner !== realm) out.add(n);
  return [...out];
};
C.marchersFor = (S, realm, target) => C.castlesOf(S, realm).filter(c => G.ADJ[c.id].includes(target)).flatMap(c => c.knights.map(id => S.knights[id])).filter(k => C.canMarch(S, k));
C.declare = (S, realm, target, ids) => {
  S.marches = S.marches.filter(m => !(m.realm === realm && m.to === target));
  if (ids.length) S.marches.push({ realm, to: target, from: ids.slice(0, 2) });
};
C.power_of = (S, ids) => ids.reduce((a, id) => a + C.power(S, S.knights[id]), 0);

/* ---- the AI realm: muster and march ---- */
C.aiMuster = (S, realm) => {
  const r = S.realms[realm]; if (!r.alive) return;
  const cs = C.castlesOf(S, realm).filter(c => !c.stilled).sort((a, b) => G.CASTLES[b.id].tier - G.CASTLES[a.id].tier);
  const cap = C.knightsOf(S, realm).length * 4;
  for (const c of cs) {
    const circle = G.CASTLES[c.id].circle;
    let guard = 0;
    while (c.summons < 3 && guard++ < 3 && C.monCount(S, realm) < cap) {
      let best = null, bs = -1; for (const id of circle) { const sp = G.get('monster', id); if (r.mana - C.summonCost(sp) < 25 + C.upkeepOf(S, realm) * .3) continue; const sc = (sp.hp + sp.atk * 2 + sp.int * 2 + sp.def) / sp.cost + R.next(S.rng) * 4; if (sc > bs) { bs = sc; best = id; } }
      if (!best) break; C.summon(S, c.id, best);
    }
    // bind reserve to knights here
    for (const kid of c.knights) { const k = S.knights[kid]; for (const mid of c.reserve.slice()) { if (k.mons.length >= 4) break; C.bind(S, mid, kid); } }
    // promotions
    for (const kid of c.knights) { const k = S.knights[kid]; if (C.canPromoteKnight(S, k, false)) C.promoteKnight(S, kid); for (const mid of k.mons) if (C.canPromoteMon(S, S.mons[mid], false)) C.promoteMon(S, mid); }
    // items
    for (const kid of c.knights) { const k = S.knights[kid]; for (const it of r.items.slice()) { const d = G.get('item', it); if (d && ['w', 'a', 'c'].includes(d.slot) && !k.equip[d.slot]) C.equip(S, kid, it); } }
  }
  // shuffle knights toward the front line
  for (const c of C.castlesOf(S, realm)) {
    const front = G.ADJ[c.id].filter(n => S.castles[n].owner !== realm).length;
    for (const kid of c.knights.slice()) {
      const k = S.knights[kid]; if (k.moved || k.wounded || k.quest) continue;
      if (!front && c.knights.length) { let best = null, bf = -1; for (const n of G.ADJ[c.id]) if (S.castles[n].owner === realm && !S.castles[n].stilled) { const f = G.ADJ[n].filter(x => S.castles[x].owner !== realm).length; if (f > bf) { bf = f; best = n; } } if (best != null && bf > 0) C.moveKnight(S, kid, best); }
      else if (c.knights.length > 2) { let best = null; for (const n of G.ADJ[c.id]) if (S.castles[n].owner === realm && !S.castles[n].stilled && S.castles[n].knights.length < 1 + 0 && G.ADJ[n].some(x => S.castles[x].owner !== realm)) best = n; if (best != null) C.moveKnight(S, kid, best); }
      else if (!k.ruler && C.canQuest(S, k) && R.chance(S.rng, .12) && realm !== 5) C.quest(S, kid);
    }
  }
};
C.aiMarch = (S, realm) => {
  if (realm === 5 || !S.realms[realm].alive) return;
  const d = C.DIFF[S.difficulty], aggro = G.tune.aiAggro * (G.REALMS[realm].season === S.season ? 1.2 : 1) * (C.isHuman(S, realm) ? 1 : d.ai) * (realm === 4 ? (S.year >= 2 ? 1 : .0) : 1);
  if (aggro <= 0) return;
  const cand = [];
  for (const t of C.targetsFor(S, realm)) {
    if (t === 0 && realm !== 4) continue;   // only the Dominion's own hand and the player's march touch Meridian
    if (t === 0 && realm === 4) continue;
    const tc = S.castles[t], defenders = tc.knights.map(id => S.knights[id]).filter(k => !k.wounded);
    const dpow = defenders.reduce((a, k) => a + C.power(S, k), 0) * (1 + .12 * G.CASTLES[t].tier);
    const marchers = C.marchersFor(S, realm, t).sort((a, b) => C.power(S, b) - C.power(S, a));
    if (!marchers.length) continue;
    const pick = marchers.slice(0, 2), mp = pick.reduce((a, k) => a + C.power(S, k), 0);
    const ratio = mp / Math.max(40, dpow || 20), value = 1 + G.CASTLES[t].tier * .15 + (C.isHuman(S, tc.owner) ? .1 : 0);
    if (ratio * aggro > 1.1) cand.push({ t, pick, score: ratio * value });
  }
  cand.sort((a, b) => b.score - a.score);
  const used = new Set();
  for (const c of cand.slice(0, 2)) {
    const ids = c.pick.filter(k => !used.has(k.id)).map(k => k.id); if (!ids.length) continue;
    // keep a guard home when the front is hot
    const homes = ids.filter(id => { const k = S.knights[id], home = S.castles[k.at]; return home.knights.length > 1 || !G.ADJ[home.id].some(n => S.castles[n].owner !== realm && S.castles[n].knights.length && S.castles[n].owner !== 5); });
    if (!homes.length) continue; homes.forEach(i => used.add(i)); C.declare(S, realm, c.t, homes);
  }
};

/* ---- the seasonal flow ---- */
C.startTidings = S => {
  S.cards = []; S.phase = 'tidings'; S.marches = []; S.queue = []; { const act = C.activeHumans(S); S.seat = 0; if (act.length) S.human = act[0]; }
  S.turn++;
  const first = S.turn === 1;
  if (!first) { const n = C.nextSeason(S); S.year = n.year; S.season = n.season; }
  log(S, '', 'season');
  // candle
  if (S.candle != null) { S.candle--; log(S, S.candle > 0 ? 'The Hour-Candle burns lower: ' + S.candle + ' season' + (S.candle === 1 ? '' : 's') + ' left.' : 'The Hour-Candle gutters. This is the last season.', 'candle'); }
  // recovery
  for (const k of Object.values(S.knights)) { if (k.wounded) k.wounded--; k.moved = false; k.marched = false; if (k.at != null && !k.quest) k.hp = null; }
  for (const m of Object.values(S.mons)) m.hp = null;
  for (const c of S.castles) { c.stilled = false; c.summons = 0; }
  // stillness
  if (S.year >= 2) {
    const cand = S.castles.filter(c => c.owner < 4 && c.id !== 0); if (cand.length) { const prefer = cand.filter(c => C.isHuman(S, c.owner)); const c = R.pick(S.rng, prefer.length && R.chance(S.rng, .6) ? prefer : cand); c.stilled = true; S.stillCastle = c.id; log(S, 'The Gray Knight\'s Stillness settles on ' + G.CASTLES[c.id].short + '. No one may muster or march from there this season.', 'stillness'); }
  }
  // quests return
  for (const k of Object.values(S.knights)) if (k.quest) { k.quest.left--; if (k.quest.left <= 0) C.finishQuest(S, k); }
  // income
  for (const r of S.realms) if (r.alive && r.id !== 5) {
    const inc = C.incomeOf(S, r.id), up = C.upkeepOf(S, r.id);
    if (!first) r.mana += inc - up;
    if (r.id === S.human) log(S, (first ? 'Your coffers: ' : 'Income ' + inc + ', upkeep ' + up + '. ') + 'Mana now ' + Math.max(0, r.mana) + '.', 'income');
    let guard = 0; while (r.mana < 0 && guard++ < 20) {
      let worst = null, wv = 1e9; for (const m of Object.values(S.mons)) if (m.realm === r.id && m.at != null) { const sp = G.get('monster', m.species), v = (sp.atk + sp.int + sp.hp / 3) * G.TIERMUL[m.form] / sp.bond; if (v < wv) { wv = v; worst = m; } }
      if (!worst) { r.mana = 0; break; } const nm = G.get('monster', worst.species).names[worst.form]; C.removeMon(S, worst.id); r.mana += 6;
      if (r.id === S.human) log(S, 'A ' + nm + ' deserts. The mana ran short.', 'desert');
    }
  }
  // dominion keeps the clock stopped, candle lit in spring of year 2
  if (S.year === 2 && S.season === 0 && S.candle == null) { S.candle = Math.max(4, Math.round(G.tune.candleSeasons) + C.DIFF[S.difficulty].candle); log(S, 'In every window of Forseason the Hour-Candle is lit. ' + S.candle + ' seasons remain.', 'candle'); S.flags.candleLit = true; }
  // events
  S.pending = C.dueEvents(S);
  // AI
  for (const r of S.realms) if (!C.isHuman(S, r.id) && r.alive && r.id !== 5) C.aiMuster(S, r.id);
  C.checkEnd(S);
  return S.cards;
};
C.removeMon = (S, id) => { const m = S.mons[id]; if (!m) return; if (m.owner) { const k = S.knights[m.owner]; if (k) k.mons.splice(k.mons.indexOf(id), 1); } else if (m.at != null) { const c = S.castles[m.at]; const i = c.reserve.indexOf(id); if (i >= 0) c.reserve.splice(i, 1); } delete S.mons[id]; };
C.finishQuest = (S, k) => {
  const q = k.quest, out = q.outcome, pool = G.ITEM_IDS;
  const h = S.castles[q.castle].owner === k.realm ? q.castle : (C.castlesOf(S, k.realm)[0] || {}).id;
  k.quest = null; k.moved = false;
  if (h == null) { k.at = null; return; }
  k.at = h; S.castles[h].knights.push(k.id); for (const id of k.mons) S.mons[id].at = h;
  const nm = G.KNIGHTS[k.id].short, r = S.realms[k.realm]; let text = '';
  const rr = R.make(q.roll + 17);
  if (out === 'treasure') { const it = R.pick(rr, pool); r.items.push(it); text = nm + ' returns from ' + q.site + ' with the ' + G.get('item', it).name + '.'; }
  else if (out === 'beast') { const sp = R.pick(rr, G.CASTLES[h].circle.concat(G.CASTLES[q.castle].circle)); const m = C.newMon(S, sp, Math.max(1, k.lvl - 2), h, k.realm); const spec = G.get('monster', sp); text = nm + ' brings home a ' + spec.names[0] + ' from ' + q.site + '.'; if (C.bind(S, m.id, k.id).ok) text += ' It takes the banner.'; }
  else if (out === 'wanderer') { const f = Object.values(S.knights).filter(x => x.free && !x.joined); if (f.length) { const w = f[R.int(rr, f.length)]; w.joined = true; w.free = false; w.realm = k.realm; w.at = h; S.castles[h].knights.push(w.id); const pool2 = speciesForRealm(k.realm); for (let i = 0; i < 2; i++) { const m = C.newMon(S, R.pick(rr, pool2), Math.max(1, Math.floor(w.lvl / 2)), null, k.realm); m.at = h; m.owner = w.id; w.mons.push(m.id); } text = nm + ' met ' + G.KNIGHTS[w.id].name + ' on the road at ' + q.site + '. They have taken your banner.'; S.flags['joined_' + w.id] = true; } else { r.mana += 40; text = nm + ' found a purse at ' + q.site + ': 40 mana.'; } }
  else if (out === 'mana') { const a = 40 + R.int(rr, 41); r.mana += a; text = nm + ' drank from a mana spring at ' + q.site + ': +' + a + ' mana.'; }
  else if (out === 'training') { C.grant(S, k, 60); for (const id of k.mons) C.grant(S, S.mons[id], 40); text = nm + ' trained hard at ' + q.site + '. The troop is stronger.'; }
  else { k.wounded = 1; text = nm + ' limps back from ' + q.site + ', wounded.'; if (k.mons.length && R.chance(rr, .3)) { const w = k.mons.map(id => S.mons[id]).sort((a, b) => a.lvl - b.lvl)[0]; text += ' ' + G.get('monster', w.species).names[w.form] + ' did not return.'; C.removeMon(S, w.id); } }
  if (k.realm === S.human) log(S, text, 'quest');
  S.log.push(text);
};
C.endMuster = S => {
  for (const r of S.realms) if (!C.isHuman(S, r.id) && r.alive) C.aiMarch(S, r.id);
  // resolve order: highest attacking level first
  const attacks = S.marches.map(m => ({ realm: m.realm, to: m.to, from: m.from.slice() }));
  attacks.sort((a, b) => Math.max(...b.from.map(i => S.knights[i].lvl)) - Math.max(...a.from.map(i => S.knights[i].lvl)));
  S.queue = attacks; S.phase = 'resolve';
};
C.humanInvolved = (S, a) => C.isHuman(S, a.realm) || C.isHuman(S, S.castles[a.to].owner);
C.battleSpecFor = (S, a, seedAdd = 0) => {
  const tc = S.castles[a.to], gray = tc.knights.includes('gray');
  const side = (realm, ids, human) => ({ realm, human, items: S.realms[realm].items.slice(), troops: ids.map(id => { const k = S.knights[id]; return { knight: { id: k.id, line: k.line, tier: k.tier, lvl: k.lvl, equip: k.equip, hp: k.hp, ruler: k.ruler, realm: k.realm }, mons: k.mons.map(m => S.mons[m]).filter(Boolean).map(m => ({ id: m.id, species: m.species, form: m.form, lvl: m.lvl, hp: m.hp })) }; }) });
  const atk = a.from.filter(id => S.knights[id] && S.knights[id].alive !== false && !S.knights[id].wounded);
  const defIds = tc.knights.filter(id => !S.knights[id].wounded).sort((x, y) => C.power(S, S.knights[y]) - C.power(S, S.knights[x])).slice(0, 2);
  return { seed: (S.seed * 31 + S.turn * 977 + a.to * 13 + seedAdd) >>> 0, map: gray ? 'sanctum' : G.CASTLES[a.to].map, season: S.season, kind: gray ? 'boss' : 'field', bells: G.tune.bells,
    sides: [side(a.realm, atk, C.isHuman(S, a.realm)), side(tc.owner, defIds, C.isHuman(S, tc.owner))], castle: a.to };
};
/* the next attack in the queue: returns { attack, free } where free means the gate stands open */
C.nextAttack = S => {
  while (S.queue.length) {
    const a = S.queue.shift(); const tc = S.castles[a.to];
    a.from = a.from.filter(id => { const k = S.knights[id]; return k && k.at != null && !k.wounded && !k.quest; });
    if (!a.from.length || tc.owner === a.realm) continue;
    if (!S.realms[a.realm].alive) continue;
    const defenders = tc.knights.filter(id => !S.knights[id].wounded);
    if (!defenders.length) { C.takeCastle(S, a, true, []); return { attack: a, free: true }; }
    return { attack: a, free: false };
  }
  return null;
};
/* apply a finished battle (or an auto-resolved one) to the campaign */
C.applyBattle = (S, a, spec, result, sim) => {
  const tc = S.castles[a.to], att = a.realm, def = tc.owner, out = { levelUps: [], deaths: [], captured: [], wounded: [], won: result.winner === 0, castle: a.to, att, def, taken: false, treasure: null, xp: [] };
  S.stats.battles++;
  const grab = (id) => id.startsWith('k:') ? S.knights[id.slice(2)] : S.mons[id.slice(2)];
  for (const u of result.units) {
    const ent = grab(u.id); if (!ent) continue;
    const orig = (u.ref.t === 'k') ? ent : ent;
    if (u.ref.t === 'k') {
      if (u.xp) C.grant(S, ent, u.xp, out.levelUps);
      if (!u.alive) { ent.wounded = 1; ent.hp = null; out.wounded.push(u.name); if (S.human === ent.realm) S.stats.deaths += 0; } else ent.hp = u.hp;
      ent.marched = ent.marched || u.side === 0;
      if (u.side === 0 && (ent.realm === S.human)) S.stats.knightsFought = (S.stats.knightsFought || 0) + 1;
    } else {
      if (!u.alive && u.gone === 'down') { out.deaths.push({ name: u.name, realm: S.mons[u.id.slice(2)] ? S.mons[u.id.slice(2)].realm : -1 }); C.removeMon(S, ent.id); if (S.mons[ent.id]) delete S.mons[ent.id]; continue; }
      if (u.xp) C.grant(S, ent, u.xp, out.levelUps); ent.hp = u.hp;
    }
  }
  // captured monsters change allegiance: they join the capturer's reserve at the target castle (or the attackers' home)
  const sideToRealm = [att, def];
  for (const u of sim.units) if (u.captured && u.alive && u.ref.t === 'm') {
    const m = S.mons[u.ref.id]; if (!m) continue;
    const newRealm = sideToRealm[u.side];
    if (m.owner) { const ok = S.knights[m.owner]; if (ok) ok.mons.splice(ok.mons.indexOf(m.id), 1); }
    m.owner = null; m.realm = newRealm; m.hp = u.hp;
    const home = newRealm === att ? S.knights[a.from[0]].at : a.to; m.at = home; S.castles[home].reserve.push(m.id);
    const kk = Object.values(S.knights).find(k => k.at === home && k.realm === newRealm && C.bondUsed(S, k) + G.get('monster', m.species).bond <= C.bondCap(S, k) && k.mons.length < 4); if (kk) C.bind(S, m.id, kk.id);
    out.captured.push(G.get('monster', m.species).names[m.form]); S.stats.captured += C.isHuman(S, newRealm) ? 1 : 0;
  }
  if (result.winner === 0) { C.takeCastle(S, a, false, out); out.taken = true; }
  else { /* the attackers go home: nothing moves */ }
  if (out.won && C.isHuman(S, att) || (!out.won && C.isHuman(S, def))) S.stats.wins++;
  if (result.units.some(u => u.id === 'k:gray' && !u.alive)) S.flags.grayFallen = true;
  return out;
};
C.takeCastle = (S, a, free, out) => {
  const tc = S.castles[a.to], old = tc.owner, att = a.realm;
  // defenders fall back
  const fleeing = tc.knights.slice();
  tc.knights = [];
  tc.owner = att; tc.summons = 0; if (C.isHuman(S, att)) S.stats.castles++;
  // reserve joins the new owner
  for (const mid of tc.reserve) { const m = S.mons[mid]; if (m) m.realm = att; }
  for (const id of fleeing) {
    const k = S.knights[id]; const dest = C.fallbackCastle(S, old, a.to);
    if (dest == null) { k.at = null; k.free = true; k.realm = 5; for (const m of k.mons) { const mm = S.mons[m]; if (mm) { mm.at = null; mm.owner = null; mm.realm = 5; } } k.mons = []; }
    else { k.at = dest; S.castles[dest].knights.push(id); for (const m of k.mons) if (S.mons[m]) S.mons[m].at = dest; }
  }
  // attackers occupy (survivors only)
  for (const id of a.from) { const k = S.knights[id]; if (!k) continue; const from = S.castles[k.at]; from.knights.splice(from.knights.indexOf(id), 1); tc.knights.push(id); k.at = a.to; for (const m of k.mons) if (S.mons[m]) S.mons[m].at = a.to; }
  if (!tc.taken) { tc.taken = true; if (tc.treasury) { S.realms[att].items.push(tc.treasury); if (out) out.treasure = tc.treasury; tc.treasury = null; } }
  // elimination
  if (old < 4 || old === 4) { if (!C.castlesOf(S, old).length) { S.realms[old].alive = false; S.log.push(G.REALMS[old].name + ' is no more.'); S.flags['dead_' + old] = true; } }
  if (old === 5 && C.isHuman(S, att) && !C.castlesOf(S, 5).length) S.flags.brigandsGone = true;
  C.checkEnd(S);
};
C.fallbackCastle = (S, realm, fromCastle) => {
  const own = C.castlesOf(S, realm).map(c => c.id); if (!own.length) return null;
  const seen = new Set([fromCastle]), q = [fromCastle];
  while (q.length) { const c = q.shift(); for (const n of G.ADJ[c]) if (!seen.has(n)) { if (own.includes(n)) return n; seen.add(n); q.push(n); } }
  return own[0];
};
C.checkEnd = S => {
  if (S.over) return;
  const hs = S.humans, o0 = S.castles[0].owner;
  if (hs.includes(o0)) { S.over = { won: true, kind: 'victory', realm: o0 }; return; }
  if (o0 < 4) { S.over = { won: false, kind: 'rival', realm: hs[0] }; return; }
  if (!C.activeHumans(S).length) { S.over = { won: false, kind: 'fallen', realm: hs[0] }; return; }
  if (!C.activeHumans(S).includes(S.human)) S.human = C.activeHumans(S)[0];
};
C.endSeason = S => {
  if (S.over) return;
  if (S.candle != null && S.candle <= 0) { S.over = { won: false, kind: 'candle' }; return; }
  C.startTidings(S);
};
C.auto = (S, a, spec) => {
  const sim = B.create(spec); G.BattleAI.auto(sim); return { sim, out: C.applyBattle(S, a, spec, B.result(sim), sim) };
};
/* resolve every queued attack the human is not part of (or all of them when 'all') */
C.resolveAI = (S, all) => {
  const res = [];
  while (S.queue.length) {
    if (!all && C.humanInvolved(S, S.queue[0])) break;
    const n = C.nextAttack(S); if (!n) break;
    if (n.free) { res.push({ a: n.attack, free: true }); continue; }
    const spec = C.battleSpecFor(S, n.attack); const r = C.auto(S, n.attack, spec); res.push({ a: n.attack, out: r.out, free: false });
  }
  return res;
};
C.dueEvents = S => (G.EVENTS || []).filter(e => !S.eventsDone[e.id] && e.when(S)).slice(0, 3).map(e => e.id);
C.hash = S => G.hash(S);
C.serialize = S => JSON.stringify(S);
C.load = txt => JSON.parse(txt);

/* a ready-made skirmish (also the AI Hub round): two troops a side, seeded */
G.makeSkirmish = (seed, opt = {}) => {
  const rng = R.make(seed), mapKeys = G.PLAIN_MAPS || ['meadow', 'forest', 'river', 'ruins'], map = opt.map || R.pick(rng, mapKeys.slice(0, 4)), season = opt.season != null ? opt.season : R.int(rng, 4);
  const n = opt.sides || 2, used = [], sides = [];
  for (let si = 0; si < n; si++) {
    let realm = opt.realms && opt.realms[si] != null ? opt.realms[si] : (si === 0 ? R.int(rng, 4) : (used[used.length - 1] + 1) % 4);
    while (used.includes(realm)) realm = (realm + 1) % 4; used.push(realm);
    const pool = speciesForRealm(realm), troops = [], kids = Object.values(G.KNIGHTS).filter(k => k.realm === realm && k.role !== 'ruler');
    const nT = n > 2 ? 1 : 2;
    for (let t = 0; t < nT; t++) {
      const kn = kids[t % kids.length], lvl = 6 + R.int(rng, 2);
      troops.push({ knight: { id: kn.id, line: kn.line, tier: 0, lvl, equip: {}, hp: null, ruler: false, realm }, mons: Array.from({ length: 3 }, (_, i) => ({ id: 'S' + si + t + i, species: R.pick(rng, pool), form: 0, lvl: lvl - 2 + R.int(rng, 3), hp: null })) });
    }
    sides.push({ realm, human: si === 0 && !opt.ai, items: ['potion'], troops });
  }
  return { seed, map, season, kind: 'field', bells: opt.bells || G.tune.bells, sides };
};
