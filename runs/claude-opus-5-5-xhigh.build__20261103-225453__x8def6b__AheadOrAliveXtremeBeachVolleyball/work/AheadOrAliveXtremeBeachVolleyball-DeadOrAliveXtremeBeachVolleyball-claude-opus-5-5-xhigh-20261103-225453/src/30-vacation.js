/* 30-vacation: the vacation's state and rules. Five days of Morning, Afternoon and Night; weather by day; moods, NPC
 * teams and where everyone is each slot (seeded from the save's 'world' stream); affinity 0-100 with each fighter in
 * five stages; gifts, team-ups and break-ups; Sonny Dollars; the day's end; saves (3 slots and an autosave) and New
 * Vacation+. All of it is data and plain functions, so tests drive it without a screen. */
G.DAYS = 5;
G.STAGES = [['Stranger', 0], ['Acquaintance', 20], ['Friend', 40], ['Good Friend', 60], ['Best Friend', 80]];
G.stage = a => { let s = G.STAGES[0][0]; for (const [n, v] of G.STAGES) if (a >= v) s = n; return s; };
G.stageIndex = a => G.STAGES.filter(([, v]) => a >= v).length - 1;
G.WEATHER_TABLE = d => d === 1 ? 'sunny' : d === 2 ? (G.chance('world', .5) ? 'sunny' : 'cloudy') : d === 3 ? 'rain' : d === 4 ? 'sunny' : 'golden';
G.weatherNow = (st = G.state) => { if (!st) return 'sunny'; const w = st.weather[st.day - 1]; return st.day === 3 ? (st.slot === 0 ? 'cloudy' : st.slot === 1 ? 'rain' : 'clear') : w; };
G.npcs = (st = G.state) => G.FIGHTERS.filter(f => f !== st.me);
G.PLACES = ['beach', 'pool', 'promenade', 'away'];

/* ---- a new vacation ---- */
G.newState = (me, seed = 1, plus = null) => {
  G.seed('world', seed);
  const st = { v: 1, seed, day: 1, slot: 0, weather: [], me, money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[me].suit], acc: G.CAST[me].acc.slice() }, wearing: { suit: G.CAST[me].suit, acc: G.CAST[me].acc.slice() },
    npcWear: {}, npcGot: {}, bag: {}, affinity: {}, mood: {}, known: {}, partner: null, teams: [], solo: null, record: {}, lastPairs: [],
    flags: {}, story: {}, chatted: {}, gifted: {}, album: [], titlePostcard: null, where: {}, deals: {}, mail: [], read: {},
    todayLost: false, todayMatches: 0, beatYesterday: {}, dayLog: { earned: 0, spent: 0, matches: 0, affBefore: {} }, nplus: plus ? plus.n : 0,
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, perfects: 0 } };
  for (let d = 1; d <= G.DAYS; d++) st.weather.push(G.WEATHER_TABLE(d));
  for (const id of G.npcs(st)) { st.affinity[id] = clamp(G.baseAff(me, id) + (plus ? 10 : 0), 0, 100); st.npcWear[id] = { suit: G.CAST[id].suit, acc: G.CAST[id].acc.slice() }; st.known[id] = {}; }
  if (plus) { st.wardrobe = plus.wardrobe; st.album = plus.album || []; st.money = G.T.startMoney + Math.round(plus.money * .1); st.stats = plus.stats; st.flags.plus = true; }
  return st;
};
G.wearOf = id => { const st = G.state; if (!st) return null; if (id === st.me) return { suit: st.wearing.suit, acc: st.wearing.acc }; return st.npcWear[id] || null; };
G.aff = id => (G.state && G.state.affinity[id] !== undefined ? G.state.affinity[id] : 0);
/** change affinity with id (gains times affinityGainMul); returns the change actually made */
G.addAff = (id, d, why) => {
  const st = G.state; if (!st || st.affinity[id] === undefined) return 0;
  const k = d > 0 ? d * G.T.affinityGainMul : d, before = st.affinity[id], after = clamp(Math.round(before + k), 0, 100);
  st.affinity[id] = after;
  if (G.stageIndex(after) > G.stageIndex(before)) { G.sting('levelup'); G.toast(G.CAST[id].name + ': ' + G.stage(after), 'Your friendship grew', 'heart'); }
  G.bus.emit('affinity', { id, before, after, why });
  return after - before;
};
G.earn = (n, why) => { const st = G.state; n = Math.round(n); st.money += n; st.stats.earned += n; st.dayLog.earned += n; G.bus.emit('purchase', { kind: 'earn', n, why }); };
G.spend = n => { const st = G.state; if (st.money < n) return false; st.money -= n; st.stats.spent += n; st.dayLog.spent += n; return true; };

/* ---- the day: moods, teams, deals, weather; then each slot: where everyone is ---- */
G.dayStart = () => {
  const st = G.state; G.seed('world', st.seed * 31 + st.day * 7);
  const w = G.weatherNow(st);
  st.dayLog = { earned: 0, spent: 0, matches: 0, affBefore: Object.assign({}, st.affinity), wins: 0 };
  st.todayLost = false; st.chatted = {}; st.gifted = {};
  for (const id of G.npcs(st)) {
    const r = G.rng('world')(); let m = r < .35 ? 2 : r < .8 ? 1 : 0;   // 2 happy, 1 normal, 0 gloomy
    const wt = G.CAST[id].weather || {}; if (wt.like && wt.like.includes(w)) m++; if ((wt.dislike && wt.dislike.includes(w)) || st.beatYesterday[id]) m--;
    st.mood[id] = ['gloomy', 'normal', 'happy'][clamp(m, 0, 2)];
  }
  st.beatYesterday = {};
  G.formTeams();
  // the shops' two daily deals (25% off)
  st.deals = {}; for (const sh of Object.keys(G.SHOPS)) { const stock = G.shopStock(sh, st.day).filter(e => e.item.price > 0); st.deals[sh] = G.shuffle('world', stock.map(e => e.item.id)).slice(0, 2); }
  // the day's mail
  for (const k in G.LETTERS) { const L = G.LETTERS[k]; if (L.day === st.day && L.slot === 0 && !st.read[k] && !st.mail.includes(k) && G.letterApplies(k)) st.mail.push(k); }
  G.slotStart();
};
G.letterApplies = k => { const st = G.state; if (k === 'rumor') return !st.flags.overheard && st.flags.missedD3Casino; if (k === 'warning') return true; return true; };
G.formTeams = () => {
  const st = G.state, free = G.npcs(st).filter(id => id !== st.partner);
  let best = null, bs = -1e9;
  const pairsOf = list => { if (list.length < 2) return [[]]; const [a, ...rest] = list, out = []; for (let i = 0; i < rest.length; i++) { const b = rest[i], others = rest.filter((_, j) => j !== i); for (const sub of pairsOf(others)) out.push([[a, b], ...sub]); } if (list.length % 2) for (const sub of pairsOf(rest)) out.push(sub); return out; };
  for (const P of pairsOf(free)) {
    const need = Math.floor(free.length / 2); if (P.length !== need) continue;
    let sc = 0; for (const [a, b] of P) { sc += G.baseAff(a, b) + G.rand('world', -10, 10); if (st.lastPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) sc -= 12; }
    if (sc > bs) { bs = sc; best = P; }
  }
  st.teams = best || []; st.lastPairs = st.teams.slice();
  const used = new Set(st.teams.flat()); st.solo = free.find(id => !used.has(id)) || null;
  for (const [a, b] of st.teams) { const k = G.teamKey(a, b); if (!st.record[k]) st.record[k] = [0, 0]; }
};
G.teamKey = (a, b) => [a, b].sort().join('+');
G.teamOf = id => { const st = G.state; return st.teams.find(t => t.includes(id)) || null; };
G.slotStart = () => {
  const st = G.state, night = st.slot === 2, w = G.weatherNow(st);
  st.where = {};
  const groups = st.teams.map(t => t.slice()).concat(st.solo ? [[st.solo]] : []);
  for (const grp of groups) {
    const W = G.CAST[grp[0]].sched[st.slot];
    let entries = night ? [['casino', W[0]], ['away', W[1]]] : G.PLACES.map((p, i) => [p, W[i] * (w === 'rain' ? [.2, .5, 1.5, 1.5][i] : 1)]);
    const place = G.weighted('world', entries);
    for (const id of grp) st.where[id] = place;
  }
  if (!night && st.teams.length && !st.teams.some(t => st.where[t[0]] === 'beach')) { const t = G.pick('world', st.teams); for (const id of t) st.where[id] = 'beach'; }
  if (st.partner) st.where[st.partner] = 'withyou';
  G.storyOverrides && G.storyOverrides();
  if (!G.hub && G.game && G.game.saves) G.autosave();
};
G.placeName = { beach: 'Sunset Courts', pool: 'Lagoon Pool', promenade: 'Fortuna Promenade', villa: 'Your Villa', casino: 'Casino Fortuna', dock: 'The Dock', away: 'Away', withyou: 'With you' };
G.presentAt = loc => { const st = G.state; return G.npcs(st).filter(id => st.where[id] === loc || (st.where[id] === 'withyou' && loc !== 'villa')); };
G.openAt = (loc, slot = G.state.slot) => loc === 'villa' ? true : loc === 'casino' ? slot === 2 : loc === 'dock' ? false : slot < 2;
/** the slot ends: the next one, or the day's end after the night */
G.endSlot = () => {
  const st = G.state; G.bus.emit('slotEnd', { day: st.day, slot: st.slot });
  if (st.slot < 2) { st.slot++; G.slotStart(); return 'next'; }
  return 'dayEnd';
};
/** the night is over: the summary's numbers, a partner who leaves, drift, the NPC teams' off-screen results */
G.dayEnd = () => {
  const st = G.state, sum = { day: st.day, earned: st.dayLog.earned, spent: st.dayLog.spent, matches: st.dayLog.matches, changes: {}, left: null, results: [], tomorrow: st.weather[st.day] || null };
  if (st.partner && st.todayLost && st.affinity[st.partner] < 35) { sum.left = st.partner; G.addAff(st.partner, -2, 'leave'); st.partner = null; }
  for (const id of G.npcs(st)) if (!st.chatted[id] && !st.gifted[id]) { const base = clamp(G.baseAff(st.me, id), 0, 100), a = st.affinity[id], d = G.T.affinityDecay; if (a > base) st.affinity[id] = Math.max(base, a - d); else if (a < base) st.affinity[id] = Math.min(base, a + d); }
  for (const id of G.npcs(st)) sum.changes[id] = st.affinity[id] - (st.dayLog.affBefore[id] || st.affinity[id]);
  // off-screen: the NPC pairs play each other for the Match Board's records
  if (st.teams.length >= 2) { const [a, b] = st.teams, sk = t => t.reduce((s, id) => s + G.CAST[id].stats.TEC + G.CAST[id].stats.POW, 0), pa = sk(a) / (sk(a) + sk(b)), aw = G.chance('world', pa); const ka = G.teamKey(...a), kb = G.teamKey(...b); st.record[ka] = st.record[ka] || [0, 0]; st.record[kb] = st.record[kb] || [0, 0]; st.record[ka][aw ? 0 : 1]++; st.record[kb][aw ? 1 : 0]++; sum.results.push([a, b, aw]); }
  G.bus.emit('dayEnd', sum);
  st.day++; st.slot = 0;
  return sum;
};

/* ---- talking, gifts, team-ups ---- */
G.chat = id => {
  const st = G.state, first = !st.chatted[id], done = st.chatted[id] === st.slot + 1;
  let d = 0; if (first) d = G.addAff(id, 2, 'chat'); else if (!done) d = G.addAff(id, 1, 'chat');
  st.chatted[id] = st.slot + 1;
  const a = st.affinity[id], key = a >= 80 ? 'chatHigh' : a >= 40 ? 'chatMid' : 'chatLow';
  return { line: G.pickLine(id, key), d };
};
G.greetLine = id => { const a = G.aff(id); return G.LINES[id].greet[a >= 60 ? 2 : a >= 20 ? 1 : 0]; };
/** offer a gift: { taste, accepted, d, line } (a refused gift goes back to the bag) */
G.giveGift = (id, itemId) => {
  const st = G.state, it = G.itemById(itemId); if (!it) return null;
  if (st.gifted[id] === st.slot + 1) return { already: true, line: "You already gave me something. Save it for later!" };
  const suit = it.kind === 'suit', acc = it.kind === 'acc';
  const taste = suit || acc ? (it.tastes.some(t => G.CAST[id].tastes.includes(t)) ? 'like' : 'dislike') : G.giftTaste(id, itemId);
  const tv = { love: 3, like: 2, neutral: 0, dislike: -3 }[taste], a = st.affinity[id], stage = a >= 80 ? 2 : a >= 40 ? 1 : 0, mood = { happy: 1, normal: 0, gloomy: -1 }[st.mood[id] || 'normal'];
  const accepted = suit ? taste === 'like' : tv + stage + mood >= G.T.giftThreshold;
  st.known[id][itemId] = taste;
  // take it out of the bag (or the wardrobe)
  if (suit) { if (accepted) { st.wardrobe.suits = st.wardrobe.suits.filter(s => s !== itemId); if (st.wearing.suit === itemId) st.wearing.suit = G.CAST[st.me].suit; st.npcWear[id].suit = itemId; st.npcGot = st.npcGot || {}; (st.npcGot[id] = st.npcGot[id] || []).push(itemId); if (G.portraitRigs) G.portraitRigs[id] = null; } }
  else if (acc) { if (accepted) { st.wardrobe.acc = st.wardrobe.acc.filter(s => s !== itemId); st.wearing.acc = st.wearing.acc.filter(s => s !== itemId); const anchor = G.ACCS[itemId].anchor; st.npcWear[id].acc = st.npcWear[id].acc.filter(x => G.ACCS[x] && G.ACCS[x].anchor !== anchor).concat(itemId); } }
  else if (accepted) { st.bag[itemId]--; if (st.bag[itemId] <= 0) delete st.bag[itemId]; }
  let d = 0;
  if (accepted) d = G.addAff(id, taste === 'love' ? 12 : taste === 'like' ? 6 : 2, 'gift'); else d = G.addAff(id, taste === 'dislike' ? -6 : -1, 'gift');
  st.gifted[id] = st.slot + 1; if (accepted) st.stats.gifts++;
  const line = suit ? G.pickLine(id, accepted ? 'suitYes' : 'suitNo') : acc ? G.pickLine(id, accepted ? 'like' : 'refuse') : G.pickLine(id, !accepted ? 'refuse' : taste);
  G.bus.emit('gift', { id, itemId, taste, accepted, d });
  return { taste: accepted ? taste : 'refuse', accepted, d, line };
};
/** ask her to team up: { ok, line, from (her old partner) } */
G.invite = id => {
  const st = G.state, mood = st.mood[id] || 'normal', team = G.teamOf(id);
  let need = G.T.inviteThreshold + (mood === 'happy' ? -10 : mood === 'gloomy' ? 10 : 0) + (team ? 20 : 0);
  if (st.affinity[id] < need) return { ok: false, line: G.pickLine(id, 'inviteNo') };
  let from = null;
  if (team) { from = team.find(x => x !== id); st.teams = st.teams.filter(t => t !== team); st.solo = from; G.addAff(from, -4, 'leftTeam'); }
  const old = st.partner; st.partner = id; if (old) { st.where[old] = st.where[id] === 'withyou' ? 'beach' : st.where[id] || 'beach'; if (!st.solo) st.solo = old; else { st.teams.push([st.solo, old]); st.solo = null; } }
  st.where[id] = 'withyou'; st.flags.hadPartner = true;
  return { ok: true, line: G.pickLine(id, team ? 'leaveTeam' : 'inviteYes'), from };
};
/** a partner assigned without asking (Pepper's starter partner): she leaves her NPC team, which goes solo */
G.setPartner = id => {
  const st = G.state, team = G.teamOf(id);
  if (team) { const from = team.find(x => x !== id); st.teams = st.teams.filter(t => t !== team); if (st.solo && st.solo !== id) { st.teams.push([st.solo, from]); st.solo = null; } else st.solo = from; }
  else if (st.solo === id) st.solo = null;
  st.partner = id; st.where[id] = 'withyou'; st.flags.hadPartner = true;
};
/** the result of a vacation match: prize money and affinity */
G.matchPayout = (res, info) => {
  const st = G.state, won = res.humanWon, margin = Math.abs(res.score[0] - res.score[1]);
  let prize = won ? (12000 + 3000 * st.day + 1000 * margin) : 3000;
  if (info.kind === 'tutorial') prize = 10000; if (info.kind === 'semi' && won) prize = 30000; if (info.kind === 'final' && won) prize = 100000;
  prize = Math.round(prize * G.T.prizeMul);
  const p = st.partner, before = p ? st.affinity[p] : 0;
  if (p) G.addAff(p, won ? 6 : (st.mood[p] === 'gloomy' ? -5 : -2), 'match');
  if (won) for (const id of info.opponents || []) { if (st.affinity[id] !== undefined) { G.addAff(id, G.CAST[id].goodSport || id === 'rin' ? 1 : -3, 'beaten'); st.beatYesterday[id] = true; } }
  if (info.kind === 'final' && won && p) G.addAff(p, 10, 'final');
  G.earn(prize, 'match');
  st.stats.matches++; if (won) st.stats.wins++; st.dayLog.matches++; if (won) st.dayLog.wins++; if (!won) st.todayLost = true;
  const me = res.players.find(x => x.side === 0 && x.cast === st.me);
  if (me) { st.stats.points += me.stats.points; st.stats.kills += me.stats.kills; st.stats.aces += me.stats.aces; st.stats.blocks += me.stats.blocks; st.stats.perfects += me.stats.perfects; }
  if (info.pair) { const k = G.teamKey(...info.pair); st.record[k] = st.record[k] || [0, 0]; st.record[k][won ? 1 : 0]++; }
  return { prize, before, after: p ? st.affinity[p] : 0, partner: p };
};

/* ---- saves: 3 slots and an autosave; Continue loads the latest ---- */
G.SAVE_VERSION = 1;
G.migrate = (data, from) => { if (!data.v) data.v = 1; void from; return data; };
G.installSaves = () => {
  const S = G.game.saves; if (!S) return;
  S.version = G.SAVE_VERSION; S.migrate = G.migrate;
  S.write = () => ({ data: JSON.parse(JSON.stringify(G.state)), place: G.placeName[G.curPlace] || 'Isla Fortuna', level: 'Day ' + G.state.day + ' · ' + G.SLOTS[G.state.slot] });
  S.read = save => { G.loadState(save.data); };
};
G.autosave = () => { try { if (G.state && G.game.saves && !G.attract) { G.installSaves(); G.game.saves.autosave(); G.saveUnlocks(); } } catch (e) { G.game.fail('autosave', e); } };
G.saveExists = () => { try { return !G.hub && !!(G.game.saves && G.game.saves.latest()); } catch (e) { return false; } };
G.loadState = data => { G.state = G.migrate(JSON.parse(JSON.stringify(data)), data.v); G.seed('world', G.state.seed * 31 + G.state.day * 7 + G.state.slot); };
/** back into a loaded vacation: the island map at the saved day and slot (saves are made at the start of a slot) */
G.resumeVacation = () => { const st = G.state; if (!st) return; G.seed('world', st.seed * 31 + st.day * 7 + st.slot); G.game.go('map', null, { fade: 'white', seconds: .4 }); };
G.continueGame = () => { G.installSaves(); const s = G.game.saves.latest(); if (!s) return; G.game.saves.load(s.slot); G.resumeVacation(); };
G.loadMenu = () => { G.installSaves(); G.game.saves.show('load', save => { if (save) G.resumeVacation(); }); };
G.saveMenu = done => { G.installSaves(); G.game.saves.show('save', () => { G.saveUnlocks(); done && done(); }); };
/* ---- unlocks for Beach Match (suits ever owned; everything after a finished vacation), the album and the title postcard ---- */
G.unlocks = { suits: [], finished: false, album: [], titlePostcard: null, poolBest: null };
G.loadUnlocks = () => { if (G.hub) return; const u = E.store.get('aoa-unlocks', null); if (u && typeof u === 'object') Object.assign(G.unlocks, u); };
G.saveUnlocks = () => {
  if (G.hub || G.attract) return; const st = G.state;
  if (st) { for (const s of st.wardrobe.suits) if (!G.unlocks.suits.includes(s)) G.unlocks.suits.push(s); G.unlocks.album = st.album.slice(); if (st.titlePostcard) G.unlocks.titlePostcard = st.titlePostcard; if (st.stats.poolBest && (!G.unlocks.poolBest || st.stats.poolBest < G.unlocks.poolBest)) G.unlocks.poolBest = st.stats.poolBest; }
  E.store.set('aoa-unlocks', G.unlocks);
};
