/* 30-vacation: the vacation's state and rules: days and slots, weather, moods, schedules and teams, affinity, gifts,
 * team-ups, money, the day's end, and the saves. All of it is data in G.state (JSON-safe). */
G.newState = function (o) {
  o = o || {};
  const seed = (o.seed || ((Date.now() ^ 0x5bd1e995) >>> 0) || 1) >>> 0;   // (a new vacation's seed: the clock, once)
  const st = {
    v: 1, seed, day: 1, slot: 0, weather: [], me: o.me || 'rin', money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[o.me || 'rin'].signature], acc: G.CAST[o.me || 'rin'].starts.acc.slice() },
    wearing: { suit: G.CAST[o.me || 'rin'].signature, acc: G.CAST[o.me || 'rin'].starts.acc.slice() },
    npcWear: {}, bag: {}, aff: {}, mood: {}, known: {}, partner: null, nAff: {}, record: {},
    flags: {}, chatted: {}, gifted: {}, album: [], titlePostcard: null, sched: {}, teams: [], tutorial: !o.skipTutorial,
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, suitsOwned: 0 },
    day_stats: { earned: 0, spent: 0, matches: 0, wins: 0 }, shopDeals: {}, letters: {}, lost: false, ended: null
  };
  for (const f of G.FIGHTERS) {
    if (f === st.me) continue;
    st.aff[f] = G.affStart(st.me, f);
    st.mood[f] = 'Normal';
    st.npcWear[f] = { suit: G.CAST[f].signature, acc: G.CAST[f].starts.acc.slice() };
  }
  for (const a of G.FIGHTERS) for (const b of G.FIGHTERS) if (a < b) st.nAff[a + '|' + b] = G.affStart(a, b);
  st.weather = [G.DAY_START_WEATHER(1, G.rngFn('world'))];
  G.state = st;
  G.resetStreams(seed);
  G.startDay(st);
  return st;
};
G.nAffKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
G.affOf = function (npc) { return G.state.aff[npc] || 0; };
G.stageIdx = function (aff) { return G.stageIndex(aff); };
G.stageName = function (aff) { return G.stageOf(aff).name; };
G.clampAff = (v) => Math.max(0, Math.min(100, Math.round(v)));
G.addAff = function (npc, delta) {
  const st = G.state; const before = st.aff[npc] || 0; const d = delta > 0 ? delta * G.T.affinityGainMul : delta;
  st.aff[npc] = G.clampAff(before + d);
  const bs = G.stageIndex(before), as = G.stageIndex(st.aff[npc]);
  if (as > bs) G.bus.emit('affinity', { npc, up: true, stage: as });
  if (as < bs) G.bus.emit('affinity', { npc, up: false, stage: as });
  return st.aff[npc] - before;
};
G.weatherNow = function () { return G.state.weather[G.state.day - 1] || 'sunny'; };
/* the day's start: weather, moods, schedules, teams, shop deals, letters */
G.startDay = function (st) {
  const rng = G.rngFn('world');
  if (!st.weather[st.day - 1]) st.weather[st.day - 1] = G.DAY_START_WEATHER(st.day, rng);
  const wx = st.weather[st.day - 1];
  // moods: 35/45/20 with the weather in mind
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    const r = rng(); let m = r < .35 ? 'Happy' : r < .8 ? 'Normal' : 'Gloomy';
    const wt = G.WEATHER_TASTE[f];
    const liked = wt && wt.likes.includes(wx === 'golden' ? 'sunny' : wx), disliked = wt && wt.dislikes.includes(wx);
    if (liked && m !== 'Happy') m = m === 'Gloomy' ? 'Normal' : 'Happy';
    if (disliked && m !== 'Gloomy') m = m === 'Happy' ? 'Normal' : 'Gloomy';
    st.mood[f] = m;
  }
  // schedules: each NPC picks a place per slot; NPCs on the beach are paired by the teams
  st.sched = {};
  for (let s = 0; s < 3; s++) {
    st.sched[s] = {};
    const names = s === 2 ? ['casino', 'away'] : ['beach', 'pool', 'promenade', 'away'];
    for (const f of G.NPCS) {
      if (f === st.me) continue;
      const w = G.SCHED[f][G.SLOTS[s].toLowerCase()];
      const mul = names.map((n, i) => (w[i] || 0) * (wx === 'rain' ? (G.rainMul[n] || 1) : 1));
      const tot = mul.reduce((a, b) => a + b, 0) || 1;
      let r = rng() * tot, pick = names[0];
      for (let i = 0; i < names.length; i++) { r -= mul[i]; if (r <= 0) { pick = names[i]; break; } }
      st.sched[s][f] = pick;
    }
    // the partner is not scheduled: she jogs over when you open the Match Board
    if (st.partner) st.sched[s][st.partner] = 'partner';
    // at least one pair at the beach each daytime slot
    if (s < 2 && !Object.values(st.sched[s]).includes('beach')) st.sched[s][G.NPCS.find(f => f !== st.me && f !== st.partner)] = 'beach';
  }
  // teams: pair the NPCs (not the partner) by affinity with noise; prefer not repeating yesterday's pairs
  const free = G.NPCS.filter(f => f !== st.me && f !== st.partner);
  const pairs = [];
  let pool = free.slice();
  while (pool.length >= 2) {
    let best = null;
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      const sc = (st.nAff[G.nAffKey(a, b)] || 20) + (rng() * 20 - 10) - (st.lastPairs && st.lastPairs.includes(G.nAffKey(a, b)) ? 6 : 0);
      if (!best || sc > best.sc) best = { sc, a, b };
    }
    pairs.push([best.a, best.b]); pool = pool.filter(x => x !== best.a && x !== best.b);
  }
  st.teams = pairs;
  st.lastPairs = pairs.map(p => G.nAffKey(p[0], p[1]));
  // the shops' daily deals: two items at 25% off in each shop
  st.shopDeals = {};
  for (const sh of Object.keys(G.SHOPS)) {
    const list = G.itemsForShop(sh, st.day);
    const all = list.suits.concat(list.acc, list.gifts);
    const deals = [];
    while (deals.length < 2 && all.length) { const i = Math.floor(rng() * all.length); deals.push(all.splice(i, 1)[0]); }
    st.shopDeals[sh] = deals;
  }
  st.slot = 0;
  st.day_stats = { earned: 0, spent: 0, matches: 0, wins: 0, gifts: 0 };
  G.bus.emit('dayStart', { day: st.day });
};
G.slotNPC = function (npc, slot) {
  const st = G.state, p = st.sched[slot] && st.sched[slot][npc];
  return p || 'away';
};
/* the NPCs at a place now */
G.npcsAt = function (place, slot) {
  const st = G.state, out = [];
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    if (f === st.partner && place === 'beach') continue;
    if (G.slotNPC(f, slot) === place) out.push(f);
  }
  return out;
};
/* a chat: +2 the first of the day, +1 after that, once per slot per NPC */
G.chatWith = function (npc) {
  const st = G.state, key = st.day + ':' + G.state.slot + ':' + npc;
  if (st.chatted[key]) return 0;
  st.chatted[key] = true;
  const firstToday = !Object.keys(st.chatted).some(k => k.indexOf(st.day + ':') === 0 && k !== key && k.endsWith(':' + npc));
  return G.addAff(npc, firstToday ? 2 : 1);
};
/* the gift's reaction: taste + stage + mood, against the threshold */
G.giftReaction = function (npc, gift) {
  const st = G.state, taste = G.GIFT_TASTE[gift][npc];
  const tv = G.TASTE_VALUE[taste] || 0;
  const aff = st.aff[npc] || 0, stage = G.stageIndex(aff);
  const stageBonus = stage >= 4 ? 2 : stage >= 2 ? 1 : 0;
  const moodV = (G.MOOD[st.mood[npc]] || { value: 0 }).value;
  const score = tv + stageBonus + moodV;
  const level = taste === 'L' ? 'love' : taste === '+' ? 'like' : taste === '.' ? 'neutral' : 'dislike';
  return { taste, score, accepted: score >= G.T.giftThreshold, level, mood: st.mood[npc] };
};
G.giveGift = function (npc, gift) {
  const st = G.state;
  if (!st.bag[gift]) return null;
  const once = st.day + ':' + st.slot + ':' + npc;
  if (st.gifted[once]) return { already: true };
  st.gifted[once] = true;
  const r = G.giftReaction(npc, gift);
  st.known[npc] = st.known[npc] || {};
  st.known[npc][gift] = r.level;
  st.bag[gift]--; if (st.bag[gift] <= 0) delete st.bag[gift];
  st.stats.gifts++; st.day_stats.gifts = (st.day_stats.gifts || 0) + 1;
  if (r.accepted) {
    G.addAff(npc, { love: 12, like: 6, neutral: 2 }[r.level] || 0);
    if (r.level === 'love' || r.level === 'like') st.stats.hearts = (st.stats.hearts || 0) + 1;
  } else {
    if (r.level === 'dislike') G.addAff(npc, -6);
    st.bag[gift] = (st.bag[gift] || 0) + 1;   // refused: it comes back to the bag
  }
  G.bus.emit('gift', { npc, gift, r });
  return r;
};
/* a team-up: accepted at the invite threshold, which moves with her mood */
G.inviteOK = function (npc) {
  const st = G.state, mood = st.mood[npc];
  let th = G.T.inviteThreshold + (mood === 'Happy' ? -10 : mood === 'Gloomy' ? 10 : 0);
  if (st.partner && st.partner !== npc) th = th;
  return (st.aff[npc] || 0) >= th;
};
G.setPartner = function (npc) {
  const st = G.state;
  const old = st.partner;
  st.partner = npc;
  if (old && old !== npc) G.addAff(old, -4);
  return old;
};
/* the money: earned and spent, counted for the day's summary */
G.earn = function (amount, why) { const st = G.state; const a = Math.round(amount); st.money += a; st.stats.earned += a; st.day_stats.earned += a; if (why) G.bus.emit('purchase', { earned: a, why }); };
G.spend = function (amount) { const st = G.state; const a = Math.round(amount); st.money -= a; st.stats.spent += a; st.day_stats.spent += a; G.bus.emit('purchase', { spent: a }); };
G.canSpend = (a) => G.state.money >= a;
/* a slot ends: the time moves on; at the end of the night, the day ends */
G.advanceSlot = function () {
  const st = G.state;
  G.bus.emit('slotEnd', { slot: st.slot });
  st.slot++;
  if (st.slot > 2) { st.slot = 2; return 'dayEnd'; }
  return 'next';
};
/* sleep: the day's end, the drift of affinity for NPCs you didn't talk to, the pairs' record, a new day */
G.endDay = function () {
  const st = G.state, rng = G.rngFn('world');
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    const talked = Object.keys(st.chatted).some(k => k.indexOf(st.day + ':') === 0 && k.endsWith(':' + f));
    if (!talked) {
      const base = G.affStart(st.me, f);
      const cur = st.aff[f];
      const drift = G.T.affinityDecay * (cur > base ? -1 : 1);
      st.aff[f] = G.clampAff(cur + (Math.abs(cur - base) <= G.T.affinityDecay ? base - cur : drift));
    }
  }
  // the pairs play each other off-screen: one result per pair, from skills
  for (const [a, b] of st.teams) {
    const sa = (G.CAST[a].stats.POW + G.CAST[a].stats.TEC) + rng() * 6, sb = (G.CAST[b].stats.POW + G.CAST[b].stats.TEC) + rng() * 6;
    const key = a + '+' + b; st.record[key] = st.record[key] || [0, 0];
    if (sa >= sb) st.record[key][0]++; else st.record[key][1]++;
  }
  // a partner who lost that day and is not close leaves
  if (st.partner && st.partner !== null) {
    const pa = st.partner;
    if (st.day_stats.lostToday && (st.aff[pa] || 0) < 35) { st.partner = null; G.toast((G.CAST[pa] || {}).short + ' left the team.'); }
  }
  st.day_stats.summary = { earned: st.day_stats.earned, spent: st.day_stats.spent, matches: st.day_stats.matches, wins: st.day_stats.wins };
  st.lastDay = st.day_stats;
  st.day++;
  st.slot = 0;
  if (st.day > G.DAYS) return 'finale';
  st.weather[st.day - 1] = G.DAY_START_WEATHER(st.day, rng);
  G.startDay(st);
  return 'next';
};
/* a finished match's outcome for the vacation: team results, partner and rival affinity, prize */
G.matchResult = function (won, margin, partner, opp) {
  const st = G.state;
  st.stats.matches++; st.day_stats.matches++;
  if (won) { st.stats.wins++; st.day_stats.wins++; }
  else st.day_stats.lostToday = true;
  if (partner && partner !== st.me) G.addAff(partner, won ? 6 : -2);
  for (const o of opp || []) { if (won && o) G.addAff(o, -3); }
  const prize = won ? 12000 + 3000 * st.day + 1000 * margin : 3000;
  G.earn(prize * G.T.prizeMul, 'match');
  return prize;
};
/* saves: the vacation is the save's data */
G.saveVacation = function () { return G.state ? JSON.parse(JSON.stringify(G.state)) : null; };
G.loadVacation = function (data) { G.state = data; G.resetStreams(data.seed); return G.state; };
