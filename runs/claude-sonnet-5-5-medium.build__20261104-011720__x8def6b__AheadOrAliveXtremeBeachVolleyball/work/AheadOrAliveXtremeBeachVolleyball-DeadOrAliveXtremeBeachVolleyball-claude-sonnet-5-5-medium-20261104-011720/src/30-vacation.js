/* 30-vacation: the calendar, slots, schedules, moods, friendship, gifts, money, partners, the story lock and saves. */
G.state = null;
G.newState = (seed = 1234) => ({
  v: 1, seed, day: 1, slot: 0, money: 2500, partner: null, tempPartner: 'mika', suit: 'coral', hat: 'none',
  aff: { mika: 25, hana: 10, gwen: 15, ruby: 0, tomo: 0, ines: 0, sonny: 5, pepper: 5 },
  owned: { suits: ['coral'], hats: ['none'] }, bag: { smoothie: 1, shell: 1 }, npcSuit: {}, talked: {}, gifted: {},
  flags: {}, results: {}, stats: { wins: 0, losses: 0, played: 0, spikes: 0, aces: 0, blocks: 0, perfects: 0, earned: 0, spent: 0, poolBest: 0, casinoNet: 0, postcards: 0 },
  album: [], schedule: {}, mood: {}, log: [], playTime: 0, ending: null, plus: 0
});
G.S = () => G.state;
G.slotName = () => G.state ? G.SLOTS[G.state.slot] : '';
G.dayInfo = () => G.DAYS[G.state.day - 1] || G.DAYS[4];
G.rngW = (day, slot, key) => E.rng(G.seedOf(G.state.seed + ':' + day + ':' + slot + ':' + key));

// where does everyone stand this slot (deterministic from the save's seed)
G.scheduleFor = (day, slot) => {
  const s = G.state, k = day + ':' + slot; if (s.schedule[k]) return s.schedule[k];
  const rn = G.rngW(day, slot, 'sched'), out = {}; const night = slot === 2;
  const spots = night ? ['pool', 'promenade', 'casino', 'courts'] : ['courts', 'pool', 'promenade', 'courts', 'pool'];
  for (const id of ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper']) {
    let loc = spots[Math.floor(rn() * spots.length)];
    if (id === 'sonny') loc = night ? 'casino' : 'promenade'; if (id === 'pepper') loc = night ? 'promenade' : (slot === 0 ? 'villa' : 'courts');
    if (s.partner === id && slot < 2 && rn() < .5) loc = 'courts';
    out[id] = loc;
  }
  s.schedule[k] = out; return out;
};
G.moodOf = (id, day) => {
  const s = G.state, k = id + day; if (s.mood[k]) return s.mood[k];
  const r = G.rngW(day, 0, 'mood' + id)(); return (s.mood[k] = r < .22 ? 'bad' : r > .6 ? 'great' : 'ok');
};
G.MOOD_MUL = { bad: .5, ok: 1, great: 1.5 };
G.MOOD_TXT = { bad: 'Grumpy', ok: 'Relaxed', great: 'Glowing' };
G.npcsAt = place => { const sc = G.scheduleFor(G.state.day, G.state.slot); return Object.keys(sc).filter(id => sc[id] === place && !(id === 'you')); };

/* ---- friendship ---- */
G.affinity = id => (G.state && G.state.aff[id]) || 0;
G.addAff = (id, n, why) => {
  const s = G.state; if (!s) return 0; const old = s.aff[id] || 0;
  const k = n > 0 ? n * G.MOOD_MUL[G.moodOf(id, s.day)] * G.T.affinityMul : n;
  s.aff[id] = clamp(Math.round(old + k), 0, 100); const d = s.aff[id] - old;
  if (d) { G.bus.emit('affinity', { id, d, why }); }
  return d;
};
G.chemistry = () => { const s = G.state; if (!s || !s.partner) return 0; return clamp(G.affinity(s.partner) / 100, 0, 1); };
G.hearts = id => Math.floor(G.affinity(id) / 20);
G.giftReaction = (id, gift) => {
  const c = G.CAST[id]; if (!c) return { pts: 0, line: '...' };
  const loves = c.loves || [], likes = c.likes || [], dis = c.dislikes || []; let mul = 1, line;
  if (loves.includes(gift.cat)) { mul = 1.8; line = G.rpick(['Oh! You remembered!', 'This is perfect! How did you know?!', 'I love it! Truly! Strongly!'], 'cosmetic'); }
  else if (likes.includes(gift.cat)) { mul = 1.1; line = G.rpick(['Nice! Thank you.', 'That is thoughtful. I like it.'], 'cosmetic'); }
  else if (dis.includes(gift.cat)) { mul = -.6; line = G.rpick(['...Is this a joke?', 'Hm. Not really my thing.', 'I will pretend I like it.'], 'cosmetic'); }
  else { mul = .8; line = G.rpick(['Thanks, I guess!', 'Oh. A gift. Yes.'], 'cosmetic'); }
  return { pts: Math.round(gift.pts * mul), line, loved: mul > 1.5, bad: mul < 0 };
};
G.giveGift = (id, giftId) => {
  const s = G.state, gift = G.GIFTS.find(x => x.id === giftId); if (!gift || !(s.bag[giftId] > 0)) return null;
  const k = id + ':' + s.day; if ((s.gifted[k] || 0) >= 2) return { refused: true, line: 'You have already been very generous today. Save some for tomorrow!' };
  s.bag[giftId]--; if (!s.bag[giftId]) delete s.bag[giftId]; s.gifted[k] = (s.gifted[k] || 0) + 1;
  const rx = G.giftReaction(id, gift), d = rx.pts >= 0 ? G.addAff(id, rx.pts, 'gift') : G.addAff(id, rx.pts, 'gift');
  G.bus.emit('gift', { id, gift, d }); G.sfx(rx.bad ? 'cancel' : 'gift');
  return Object.assign({ d }, rx);
};
G.chat = id => {
  const s = G.state, k = id + ':' + s.day + ':' + s.slot; if (s.talked[k]) return { line: G.rpick(['We just talked! Give me a minute to think of something new.', 'Ha, again? Okay, but later.'], 'cosmetic'), d: 0 };
  s.talked[k] = 1; const d = G.addAff(id, 3, 'chat');
  const c = G.CAST[id], pools = {
    mika: ['I believe in the power of one more rep. Also smoothies.', 'Did you see my last spike? Neither did I, it was too fast.', 'Teamwork! That means you do the setting. Kidding. Mostly.'],
    hana: ['I am not hiding. I am... situationally unseen.', 'Sunscreen is a tool. Like a kunai. A greasy kunai.', 'The ocean is loud. I like it. It covers my footsteps.'],
    gwen: ['I do not "do" fun. This is statistics.', 'Pineapples are structurally honest.', 'If I say "fine", it was not fine. It was fine. Whichever.'],
    ruby: ['RUBY DELACROIX DOES NOT LOSE! SHE JUST ARRIVES LATE TO VICTORY!', 'My entrance theme is a trombone. I am the trombone.'],
    tomo: ['Sorry! Stretching! Hi!', 'I tried to stand still once. It was tuesday. Did not like it.'],
    ines: ['Your footwork is... interesting. Do it again, but with feeling.', 'Every rally is a duet. Some of us just forget to hum.'],
    sonny: ['The house always wins. Which is why I own the house. And the island. And this shirt.', 'Ask me about my casino. Or do not. I will tell you anyway.'],
    pepper: ['Please remember your sunscreen.', 'I have seen things. Mostly receipts.']
  };
  return { line: G.rpick(pools[id] || ['Nice weather.'], 'cosmetic'), d };
};
G.canTeamUp = id => G.PARTNERS.includes(id) && G.affinity(id) >= 30 && G.state.partner !== id;
G.setPartner = id => { G.state.partner = id; G.state.aff[id] = Math.max(G.state.aff[id] || 0, 30); G.toast('New partner: ' + G.CAST[id].name, '#9bffb0'); G.bus.emit('story', { ev: 'partner', id }); };

/* ---- money ---- */
G.earn = n => { const s = G.state, v = Math.round(n); s.money += v; if (v > 0) s.stats.earned += v; G.bus.emit('purchase', { earn: v }); return v; };
G.spend = n => { const s = G.state; if (s.money < n) return false; s.money -= n; s.stats.spent += n; G.sfx('buy'); G.bus.emit('purchase', { spend: n }); return true; };
G.buySuit = id => { const s = G.state, it = G.SUITS.find(x => x.id === id); if (!it || s.owned.suits.includes(id) || !G.spend(it.price)) return false; s.owned.suits.push(id); return true; };
G.buyHat = id => { const s = G.state, it = G.HATS.find(x => x.id === id); if (!it || s.owned.hats.includes(id) || !G.spend(it.price)) return false; s.owned.hats.push(id); return true; };
G.buyGift = id => { const s = G.state, it = G.GIFTS.find(x => x.id === id); if (!it || !G.spend(it.price)) return false; s.bag[id] = (s.bag[id] || 0) + 1; return true; };
G.giftNpcSuit = (id, suitId) => { G.state.npcSuit[id] = suitId; };

/* ---- the calendar ---- */
G.storyKey = () => { const s = G.state; return G.STORY_SLOTS[s.day + ':' + s.slot] || null; };
G.endSlot = () => {
  const s = G.state; G.bus.emit('slotEnd', { day: s.day, slot: s.slot });
  s.slot++;
  if (s.slot > 2) { s.slot = 0; G.bus.emit('dayEnd', { day: s.day }); s.day++; return 'newday'; }
  return 'slot';
};
G.timeOfDay = () => ['morning', 'afternoon', 'night'][G.state ? G.state.slot : 1];
G.finished = () => G.state && G.state.day > 5;

/* ---- opponents for each story match ---- */
G.storyMatch = key => {
  const s = G.state, partner = s.partner || s.tempPartner || 'mika';
  const mine = ['you', partner];
  const base = { teams: [mine, ['ruby', 'tomo']], chem: [G.chemistry() || .2, 0], skipIntro: false };
  switch (key) {
    case 'welcome': return Object.assign(base, { teams: [['you', 'mika'], ['sonny', 'pepper']], to: 5, skillBonus: [0, -.25], chem: [.3, 0], tutorial: true });
    case 'qualifier': return Object.assign(base, { teams: [mine, ['ruby', 'tomo']], to: 7, skillBonus: [0, -.1] });
    case 'semifinal': { const other = G.PARTNERS.find(x => x !== partner) || 'gwen'; return Object.assign(base, { teams: [mine, ['ines', other]], to: 7, skillBonus: [0, .05] }); }
    case 'final': return Object.assign(base, { teams: [mine, ['sonny', 'pepper']], to: 9, house: true, skillBonus: [0, .15] });
    default: return base;
  }
};

/* ---- saves: the engine's three slots + autosave ---- */
G.saveBlob = () => { const s = G.state; return { data: JSON.parse(JSON.stringify(s)), place: 'Day ' + s.day + ' · ' + G.SLOTS[Math.min(2, s.slot)], level: 'Day ' + Math.min(5, s.day) }; };
G.loadBlob = save => {
  const d = save && save.data ? save.data : save; if (!d) return false;
  G.state = Object.assign(G.newState(d.seed), d); G.reseedWorld(); return true;
};
G.reseedWorld = () => { const s = G.state; G.reseed('world', s.seed); G.reseed('casino', s.seed + 99); };
G.autosave = () => { try { if (G.state && !G.hub) { G.game.saves.autosave(); } } catch (e) { /* storage blocked */ } };
G.installSaves = game => {
  game.saves.write = () => G.saveBlob();
  game.saves.read = save => { if (G.loadBlob(save)) { G.game.go('map'); } };
  try { game.saves.canSave = true; } catch (e) { /* getter only */ }
};

/* ---- finishing the match in story mode ---- */
G.afterStoryMatch = (key, res) => {
  const s = G.state, win = res.winner === 0, st = res.stats[0];
  s.stats.played++; if (win) s.stats.wins++; else s.stats.losses++; s.stats.spikes += st.spikes; s.stats.aces += st.aces; s.stats.blocks += st.blocks; s.stats.perfects += st.perfect;
  const prize = key === 'final' ? (win ? 8000 : 2500) : key === 'semifinal' ? (win ? 3000 : 800) : key === 'qualifier' ? (win ? 1800 : 600) : key === 'welcome' ? 500 : (win ? 700 : 250);
  const got = G.earn(prize * G.T.moneyMul); s.results[key] = win ? 'win' : 'loss';
  if (s.partner || s.tempPartner) { const pid = s.partner || s.tempPartner; G.addAff(pid, win ? 6 : 2, 'match'); }
  return { got, win };
};
