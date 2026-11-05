/* 30-vacation: the vacation's state and its rules: the calendar (5 days x Morning, Afternoon, Night), weather, moods,
 * NPC teams and schedules, affinity, gifts, team-ups and break-ups, money, prizes, story triggers, saves. */
G.DAYS = 5;
G.WEATHER_TABLE = [null, ['sunny', 'sunny', 'clear'], ['sunny', 'cloudy', 'clear'], ['cloudy', 'rain', 'clear'], ['sunny', 'sunny', 'clear'], ['sunny', 'golden', 'clear']];
G.DAY_BASE = [0, .40, .50, .58, .66, .70];
G.newState = (me, seed = 1) => {
  const S = { v: 1, seed, day: 1, slot: 0, weather: [], me, money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[me].suit], acc: (G.CAST[me].acc || []).slice() }, wearing: { suit: G.CAST[me].suit, acc: (G.CAST[me].acc || []).slice() },
    npcWear: {}, bag: {}, affinity: {}, mood: {}, known: {}, partner: null, teams: [], solo: null, record: {}, where: {}, flags: {}, chatted: {}, gifted: {}, chatSlot: {},
    album: [], titlePostcard: null, letters: [], read: {}, deals: {}, events: {}, lostToday: false, earnedToday: 0, spentToday: 0, affStart: {}, playedToday: [], beatYesterday: {},
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, suitsOwned: 1 }, ngPlus: 0 };
  for (const id of G.FIGHTERS) if (id !== me) { S.affinity[id] = G.baseAff(me, id); S.npcWear[id] = { suit: G.CAST[id].suit, acc: (G.CAST[id].acc || []).slice() }; S.known[id] = {}; }
  for (let d = 1; d <= G.DAYS; d++) S.weather[d - 1] = G.WEATHER_TABLE[d][0];
  return S;
};
G.npcs = () => G.FIGHTERS.filter(id => id !== G.state.me);
G.weatherNow = (S = G.state) => { const w = (G.WEATHER_TABLE[S.day] || G.WEATHER_TABLE[1])[S.slot]; if (S.day === 2 && S.slot === 1) return S.d2cloud ? 'cloudy' : 'sunny'; return w === 'clear' ? 'sunny' : w; };
G.weatherMatch = () => { const w = G.weatherNow(); return w === 'golden' ? 'sunny' : w; };
G.todNow = (S = G.state) => S.slot === 2 ? 'night' : S.slot === 0 ? 'morning' : (G.weatherNow(S) === 'golden' ? 'sunset' : 'afternoon');
/* ---- the start of a day: moods, teams, places, deals, letters, autosave ---- */
G.dayStart = () => {
  const S = G.state; G.seed('world', S.seed * 31 + S.day * 977);
  if (S.day === 2) S.d2cloud = G.rng('world') < .4;
  for (const id of G.npcs()) {
    const r = G.rng('world'); let m = r < .35 ? 2 : r < .8 ? 1 : 0;
    const wt = G.WEATHER_TASTE[id], w = (G.WEATHER_TABLE[S.day] || [])[0];
    if (wt && wt.like.includes(w)) m++; if (wt && wt.dislike.includes(w)) m--; if (S.beatYesterday[id]) m--;
    S.mood[id] = ['gloomy', 'normal', 'happy'][clamp(m, 0, 2)];
  }
  S.beatYesterday = {}; S.chatted = {}; S.lostToday = false; S.earnedToday = 0; S.spentToday = 0; S.playedToday = []; S.affStart = Object.assign({}, S.affinity);
  G.formTeams();
  // deals: two items a shop at -25%
  S.deals = {}; for (const sh of Object.keys(G.SHOPS)) { const st = G.shopStock(sh, S.day).filter(i => i.price > 0); S.deals[sh] = G.rshuffle('world', st).slice(0, 2).map(i => i.id); }
  // letters
  const L = ({ 1: ['pepper_welcome'], 2: ['sonny_flyer'], 3: ['friend_note'], 4: ['pepper_warning'], 5: ['sonny_hype'] }[S.day] || []).slice();
  if (S.day === 4 && !S.flags.callSeen) L.push('rumor');
  for (const l of L) if (!S.letters.includes(l)) S.letters.push(l);
  if (S.day === 4 && S.flags.kind && S.flags.casinoVisited && !S.wardrobe.suits.includes('pinstripe')) { S.wardrobe.suits.push('pinstripe'); S.flags.pinstripe = true; }
  G.scheduleSlot();
  G.bus.emit('dayStart', S.day);
  G.autosave();
};
/** NPC pairs for the day: the pairing with the most affinity between partners (plus noise), avoiding yesterday's pairs */
G.formTeams = () => {
  const S = G.state, free = G.npcs().filter(id => id !== S.partner), aff = (a, b) => G.baseAff(a, b);
  const prev = new Set((S.teams || []).map(t => t.slice().sort().join('+')));
  let best = null, bv = -1e9;
  const pairs = (list) => { if (list.length < 2) return [[]]; const [a, ...rest] = list, out = []; for (let i = 0; i < rest.length; i++) { const b = rest[i], others = rest.filter((_, k) => k !== i); for (const p of pairs(others)) out.push([[a, b], ...p]); } if (list.length % 2) for (const p of pairs(rest)) out.push(p); return out; };
  for (const P of pairs(free)) { if (P.length < Math.floor(free.length / 2)) continue; let v = 0; for (const [a, b] of P) v += aff(a, b) + (G.rng('world') - .5) * 20 - (prev.has([a, b].sort().join('+')) ? 15 : 0); if (v > bv) { bv = v; best = P; } }
  S.teams = best || []; const inTeam = new Set(S.teams.flat()); S.solo = free.find(id => !inTeam.has(id)) || null;
  for (const t of S.teams) { const k = t.slice().sort().join('+'); S.record[k] = S.record[k] || [0, 0]; }
};
G.teamOf = id => (G.state.teams || []).find(t => t.includes(id)) || null;
G.LOCS_DAY = ['beach', 'pool', 'promenade', 'away'];
/** who is where this slot (story events override; a pair is always at the beach by day) */
G.scheduleSlot = () => {
  const S = G.state; S.where = {}; G.seed('world', S.seed * 131 + S.day * 17 + S.slot * 7);
  const rain = G.weatherNow() === 'rain';
  const place = id => {
    const w = G.SCHEDULE[id][S.slot].slice();
    if (S.slot === 2) return G.rng('world') * (w[0] + w[1]) < w[0] ? 'casino' : 'away';
    if (rain) { w[0] *= .2; w[1] *= .5; w[2] *= 1.5; w[3] *= 1.5; }
    const tot = w.reduce((a, b) => a + b, 0); let r = G.rng('world') * tot; for (let k = 0; k < 4; k++) { if ((r -= w[k]) < 0) return G.LOCS_DAY[k]; } return 'away';
  };
  for (const t of S.teams) { const p = place(t[0]); S.where[t[0]] = p; S.where[t[1]] = p; }
  for (const id of G.npcs()) if (!S.where[id]) S.where[id] = place(id);
  if (S.slot < 2 && S.teams.length && !S.teams.some(t => S.where[t[0]] === 'beach')) { const t = S.teams[Math.floor(G.rng('world') * S.teams.length)]; S.where[t[0]] = S.where[t[1]] = 'beach'; }
  if (S.partner) S.where[S.partner] = S.slot === 2 ? (S.where[S.partner] === 'casino' ? 'casino' : 'away') : S.where[S.partner];
};
G.present = loc => G.npcs().filter(id => G.state.where[id] === loc);
/* ---- affinity ---- */
G.aff = id => G.state.affinity[id] || 0;
G.addAff = (id, d, why) => {
  const S = G.state; if (!(id in S.affinity)) return 0;
  if (d > 0) d *= G.T.affinityGainMul;
  const before = S.affinity[id], st0 = G.UI.stage(before);
  S.affinity[id] = clamp(Math.round(before + d), 0, 100);
  const st1 = G.UI.stage(S.affinity[id]);
  if (st1 !== st0 && S.affinity[id] > before) { G.sting('levelup'); G.toast(G.CAST[id].short + ': ' + st1 + '!', why || ''); }
  G.bus.emit('affinity', { id, d: S.affinity[id] - before });
  return S.affinity[id] - before;
};
G.stageBonus = a => a >= 80 ? 2 : a >= 40 ? 1 : 0;
G.moodBonus = m => m === 'happy' ? 1 : m === 'gloomy' ? -1 : 0;
/** chat: +2 the first time a day, +1 later, once a slot */
G.chat = id => {
  const S = G.state, key = id + ':' + S.day + ':' + S.slot;
  const a = G.aff(id), band = a >= 80 ? 2 : a >= 40 ? 1 : 0, lines = G.LINES[id].chat, line = lines[band * 2 + (S.day + S.slot) % 2];
  let d = 0; if (!S.chatSlot[key]) { d = S.chatted[id] ? 1 : 2; S.chatted[id] = true; S.chatSlot[key] = true; G.addAff(id, d); }
  return { line, d };
};
/** a gift: score = taste + stage bonus + mood; accepted at or above giftThreshold; one a slot per NPC */
G.giftKey = id => id + ':' + G.state.day + ':' + G.state.slot;
G.canGift = id => !G.state.gifted[G.giftKey(id)];
G.giveGift = (id, itemId) => {
  const S = G.state, it = G.ITEMS[itemId]; if (!it || !G.canGift(id)) return null;
  let taste, score;
  if (it.kind === 'suit' || it.kind === 'acc') { const c = G.CAST[id], match = it.tastes.some(t => c.tastes.includes(t)); taste = match ? 'like' : 'dislike'; }
  else taste = G.taste(id, itemId);
  score = { love: 3, like: 2, neutral: 0, dislike: -3 }[taste] + G.stageBonus(G.aff(id)) + G.moodBonus(S.mood[id]);
  const accepted = it.kind === 'suit' ? taste === 'like' : score >= G.T.giftThreshold;
  S.gifted[G.giftKey(id)] = true; S.known[id] = S.known[id] || {}; S.known[id][itemId] = taste;
  // the item leaves the bag (or the wardrobe); a refused gift comes back
  if (it.kind === 'gift') { S.bag[itemId] = (S.bag[itemId] || 0) - 1; if (S.bag[itemId] <= 0) delete S.bag[itemId]; }
  let d = 0, line;
  const L = G.LINES[id];
  if (!accepted) { d = G.addAff(id, -6); if (it.kind === 'gift') S.bag[itemId] = (S.bag[itemId] || 0) + 1; line = it.kind === 'suit' ? L.suitNo : G.rpick('cosmetic', L.refuse); }
  else {
    d = G.addAff(id, { love: 12, like: 6, neutral: 2 }[taste] || 2); S.stats.gifts++;
    if (it.kind === 'suit') { S.npcWear[id] = { suit: itemId, acc: (S.npcWear[id] || {}).acc || [] }; S.wardrobe.suits = S.wardrobe.suits.filter(s => s !== itemId || S.wearing.suit === s); line = L.suitYes; }
    else if (it.kind === 'acc') { const w = S.npcWear[id] || { acc: [] }; const keep = (w.acc || []).filter(a => G.ITEMS[a].anchor !== it.anchor); w.acc = keep.concat(itemId); S.npcWear[id] = w; S.wardrobe.acc = S.wardrobe.acc.filter(a => a !== itemId || S.wearing.acc.includes(a)); line = L.suitYes; }
    else line = taste === 'love' ? G.rpick('cosmetic', L.love) : taste === 'like' ? G.rpick('cosmetic', L.like) : L.neutral[0];
  }
  G.bus.emit('gift', { id, itemId, taste, accepted, d });
  return { accepted, taste: accepted ? taste : 'refuse', d, line };
};
/** a team-up: affinity at the threshold (−10 happy, +10 gloomy, +20 if she has a team) */
G.inviteNeed = id => { const S = G.state; let need = G.T.inviteThreshold + (S.mood[id] === 'happy' ? -10 : S.mood[id] === 'gloomy' ? 10 : 0); if (G.teamOf(id)) need += 20; return need; };
G.invite = id => {
  const S = G.state, L = G.LINES[id];
  if (G.aff(id) < G.inviteNeed(id)) return { ok: false, line: G.rpick('cosmetic', L.inviteNo) };
  const t = G.teamOf(id); let extra = null;
  if (t) { const mate = t.find(x => x !== id); S.teams = S.teams.filter(x => x !== t); S.solo = mate; G.addAff(mate, -4); extra = L.leaveTeam; }
  if (S.partner && S.partner !== id) { const old = S.partner; G.addAff(old, -3); S.solo = S.solo || old; }
  S.partner = id; G.bus.emit('partner', id);
  return { ok: true, line: G.rpick('cosmetic', L.inviteYes), extra };
};
/* ---- money ---- */
G.earn = (n, why) => { const S = G.state; n = Math.round(n * G.T.prizeMul); S.money += n; S.earnedToday += n; S.stats.earned += n; G.bus.emit('money', { d: n, why }); return n; };
G.spend = n => { const S = G.state; if (S.money < n) return false; S.money -= n; S.spentToday += n; S.stats.spent += n; G.bus.emit('purchase', n); return true; };
G.priceOf = (it, shop) => { const S = G.state, deal = S && shop && (S.deals[shop] || []).includes(it.id); return Math.round(it.price * G.T.priceMul * (deal ? .75 : 1) / 100) * 100; };
/* ---- slots and days ---- */
G.endSlot = (why) => {
  const S = G.state; if (!S) return;
  G.bus.emit('slotEnd', { day: S.day, slot: S.slot, why });
  if (S.slot >= 2) { G.go('dayend', null, { fade: .4 }); return; }
  S.slot++; G.scheduleSlot(); G.autosave();
  G.afterSlot();
};
/** where the game goes as a slot starts: a story event, or the island map */
G.afterSlot = () => { const ev = G.slotEvent(); if (ev) return ev(); G.go('map', null, { fade: .4 }); };
G.nextDay = () => {
  const S = G.state;
  // the partner walks if she lost a match today and likes you less than 35; drift toward base for anyone you didn't talk to
  if (S.partner && S.lostToday && G.aff(S.partner) < 35) { S.flags.brokeUp = S.partner; G.toast(G.CAST[S.partner].short + ' left your team', 'Win her back with chats and gifts.'); S.partner = null; }
  for (const id of G.npcs()) if (!S.chatted[id]) { const base = G.baseAff(S.me, id), a = S.affinity[id]; S.affinity[id] = a > base ? Math.max(base, a - G.T.affinityDecay) : Math.min(base, a + G.T.affinityDecay); }
  // the NPC pairs play each other off-screen
  for (let i = 0; i < S.teams.length; i++) for (let j = i + 1; j < S.teams.length; j++) {
    const A = S.teams[i], B = S.teams[j], sk = t => t.reduce((a, id) => a + G.CAST[id].stats.POW + G.CAST[id].stats.TEC, 0), pa = sk(A) / (sk(A) + sk(B));
    const aw = G.rng('world') < pa, ka = A.slice().sort().join('+'), kb = B.slice().sort().join('+');
    S.record[ka] = S.record[ka] || [0, 0]; S.record[kb] = S.record[kb] || [0, 0]; S.record[ka][aw ? 0 : 1]++; S.record[kb][aw ? 1 : 0]++;
  }
  S.day++; S.slot = 0;
  if (S.day > G.DAYS) { S.day = G.DAYS; return; }
  G.dayStart(); G.sting('daystart');
};
/* ---- matches from the Match Board: base skill by day, the partner's chemistry, prizes, affinity ---- */
G.vacationMatchCfg = (opp, o = {}) => {
  const S = G.state, me = S.me, partner = o.partner || S.partner, day = S.day, base = o.base || [G.DAY_BASE[day], G.DAY_BASE[day]];
  const wear = id => G.wearOf(id);
  const cfg = {
    mode: o.mode || 'vacation', pointsToWin: o.points || G.T.pointsToWin, tod: G.todNow(), weather: G.weatherMatch(), title: o.title || 'BEACH MATCH', subtitle: G.CAST[me].short + ' & ' + G.CAST[partner].short + '  vs  ' + G.CAST[opp[0]].short + ' & ' + G.CAST[opp[1]].short,
    partnerAff: G.aff(partner), final: !!o.final, specials: o.specials, tutorial: !!o.tutorial, serveFirst: o.serveFirst === undefined ? 0 : o.serveFirst,
    teams: [[{ id: me, suit: wear(me).suit, acc: wear(me).acc, input: G.game.input, name: G.CAST[me].short }, { id: partner, suit: wear(partner).suit, acc: wear(partner).acc, base: G.DAY_BASE[day] + .05 }],
      opp.map((id, k) => ({ id, suit: o.kits ? o.kits[k] : wear(id).suit, acc: o.accs ? o.accs[k] : wear(id).acc, base: base[k] }))],
    after: (res, M) => G.vacationAfter(res, M, opp, partner, o)
  };
  return cfg;
};
G.vacationAfter = (res, M, opp, partner, o) => {
  const S = G.state, won = res.winner === 0, margin = Math.abs(res.finalScore[0] - res.finalScore[1]);
  S.stats.matches++; if (won) S.stats.wins++; else S.lostToday = true;
  const mine = res.players.filter(p => p.side === 0); for (const p of mine) { S.stats.points += p.stats.points; S.stats.kills += p.stats.kills; S.stats.aces += p.stats.aces; S.stats.blocks += p.stats.blocks; }
  let prize = o.prize !== undefined ? (won ? o.prize : o.losePrize || 3000) : won ? 12000 + 3000 * S.day + 1000 * margin : 3000;
  prize = G.earn(prize, 'match');
  const before = G.aff(partner);
  G.addAff(partner, won ? (o.final ? 10 : 6) : S.mood[partner] === 'gloomy' ? -5 : -2);
  for (const id of opp) if (G.FIGHTERS.includes(id) && id !== S.me) { if (won) { G.addAff(id, G.GOOD_SPORTS.includes(id) ? 1 : -3); S.beatYesterday[id] = true; } }
  const k = opp.slice().sort().join('+'); if (S.record[k]) S.record[k][won ? 1 : 0]++;
  S.playedToday.push(k);
  const aff = { id: partner, to: G.aff(partner), d: G.aff(partner) - before };
  if (o.onResult) o.onResult(won, res);
  G.go('results', { M, prize, aff, buttons: [['Continue', () => { if (o.next) o.next(won); else G.endSlot('match'); }]] });
};
/* ---- saves ---- */
G.setupSaves = () => {
  const sv = G.game.saves;
  sv.version = 1; sv.migrate = (data, from) => data;
  sv.write = () => ({ data: JSON.parse(JSON.stringify(G.state)), place: G.state ? G.CAST[G.state.me].short + ' • ' + G.SLOTS[G.state.slot] : '', level: G.state ? 'Day ' + G.state.day : '' });
  sv.read = save => { G.loadState(save.data); };
  sv.canSave = false;
};
G.loadState = data => { G.state = Object.assign(G.newState(data.me || 'rin', data.seed || 1), data); G.rigs = {}; };
G.autosave = () => { if (G.hub || !G.state || G.state.demo) return; try { G.game.saves.autosave(); } catch (e) { G.game.fail('autosave', e); } };
G.resumeVacation = () => { G.rigs = {}; G.scheduleSlot(); G.go('map', null, { fade: .4 }); };
G.unlocks = () => G.store.get('aoa-unlocks', { suits: [], done: false });
G.unlock = (suits, done) => { if (G.hub) return; const u = G.unlocks(); for (const s of suits || []) if (!u.suits.includes(s)) u.suits.push(s); if (done) u.done = true; G.store.set('aoa-unlocks', u); };
