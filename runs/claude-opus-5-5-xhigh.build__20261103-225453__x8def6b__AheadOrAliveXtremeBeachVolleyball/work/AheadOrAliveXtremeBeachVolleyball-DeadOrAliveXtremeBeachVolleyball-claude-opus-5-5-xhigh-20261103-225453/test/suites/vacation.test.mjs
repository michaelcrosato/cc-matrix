import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  const st = G.state = G.newState('rin', 9); G.dayStart();
  t.ok('a vacation starts on Day 1, Morning, with S$30,000', st.day === 1 && st.slot === 0 && st.money === 30000);
  t.ok('weather by the table', st.weather[0] === 'sunny' && st.weather[2] === 'rain' && st.weather[3] === 'sunny' && st.weather[4] === 'golden' && ['sunny', 'cloudy'].includes(st.weather[1]));
  t.ok('Day 3: cloudy morning, rain in the afternoon', (st.day = 3, st.slot = 0, G.weatherNow()) === 'cloudy' && (st.slot = 1, G.weatherNow()) === 'rain' && (st.slot = 2, G.weatherNow()) === 'clear'); st.day = 1; st.slot = 0;
  t.ok('NPC pairs: two teams of two and one solo', st.teams.length === 2 && st.teams.every(p => p.length === 2) && !!st.solo);
  for (let s = 0; s < 2; s++) { st.slot = s; G.slotStart(); t.ok('pairs go together (slot ' + s + ')', st.teams.every(([a, b]) => st.where[a] === st.where[b])); t.ok('a pair at the beach every daytime slot (' + s + ')', st.teams.some(([a]) => st.where[a] === 'beach')); }
  st.slot = 2; G.slotStart(); t.ok('at night everyone is at the casino or away', G.npcs(st).every(id => ['casino', 'away', 'withyou'].includes(st.where[id])));
  t.ok('night places: villa and casino open, the beach closed', G.openAt('villa', 2) && G.openAt('casino', 2) && !G.openAt('beach', 2) && !G.openAt('casino', 0));
  // same seed, same places
  const a = G.newState('rin', 77); G.state = a; G.dayStart(); const wa = JSON.stringify(a.where); const b = G.newState('rin', 77); G.state = b; G.dayStart(); t.ok('same seed, same schedule', JSON.stringify(b.where) === wa);
  // slots: a location visit or activity ends the slot; night ends the day
  G.state = G.newState('lola', 5); G.dayStart(); const S = G.state;
  t.ok('ending a slot moves on', G.endSlot() === 'next' && S.slot === 1); G.endSlot(); t.ok('the night ends the day', G.endSlot() === 'dayEnd');
  const sum = G.dayEnd(); t.ok('the day end summary', sum.day === 1 && S.day === 2 && S.slot === 0);
  // affinity math: chats, gifts, stages
  G.state = G.newState('tess', 3); G.dayStart(); const T2 = G.state, id = 'ingrid', a0 = T2.affinity[id];
  const c1 = G.chat(id), c2 = G.chat(id); t.ok('the first chat of the day +2, then +1 once a slot', c1.d === 2 && c2.d === 0 && T2.affinity[id] === a0 + 2, [c1.d, c2.d].join());
  T2.bag.snow_globe = 1; T2.mood[id] = 'normal'; const g1 = G.giveGift(id, 'snow_globe'); t.ok('a loved gift: +12, accepted', g1.accepted && g1.taste === 'love' && g1.d === 12, JSON.stringify(g1));
  t.ok('one gift per NPC per slot', G.giveGift(id, 'snow_globe').already);
  T2.slot = 1; T2.bag.glitter_sandals = 1; T2.mood[id] = 'normal'; const g2 = G.giveGift(id, 'glitter_sandals'); t.ok('a disliked gift is refused, -6, back in the bag', !g2.accepted && g2.d === -6 && T2.bag.glitter_sandals === 1, JSON.stringify(g2));
  t.ok('likes you discover are remembered', T2.known[id].snow_globe === 'love' && T2.known[id].glitter_sandals === 'dislike');
  t.ok('stages', G.stage(10) === 'Stranger' && G.stage(45) === 'Friend' && G.stage(85) === 'Best Friend');
  // invites: thresholds by mood; a pair member needs 20 more; her old partner goes solo
  G.state = G.newState('rin', 3); G.dayStart(); const V = G.state, free = V.solo, paired = V.teams[0][0];
  V.affinity[free] = 35; V.mood[free] = 'normal'; t.ok('below the threshold, no', !G.invite(free).ok);
  V.mood[free] = 'happy'; t.ok('Happy lowers it by 10', G.invite(free).ok && V.partner === free);
  V.affinity[paired] = 55; V.mood[paired] = 'normal'; t.ok('a paired NPC needs 20 more', !G.invite(paired).ok); V.affinity[paired] = 62; const old = V.teams.find(tm => tm.includes(paired)).find(x => x !== paired), oldA = V.affinity[old];
  t.ok('she leaves her team, her old partner is sour', G.invite(paired).ok && V.partner === paired && V.affinity[old] === oldA - 4);
  // the partner leaves after a loss below 35
  V.affinity[V.partner] = 30; V.todayLost = true; const ds = G.dayEnd(); t.ok('a partner below 35 leaves after a lost day', ds.left && !V.partner);
  // drift toward the base for NPCs you didn't talk to
  G.state = G.newState('mei', 3); G.dayStart(); const D = G.state, dn = 'lola', base = G.baseAff('mei', dn); D.affinity[dn] = base + 10; G.dayEnd(); t.ok('affinity drifts toward its base', D.affinity[dn] === base + 10 - G.T.affinityDecay);
  // prize money
  G.state = G.newState('amara', 3); G.dayStart(); const P = G.state; P.affinity.lola = 60; P.mood.lola = 'happy'; G.invite('lola'); const before = P.money;
  const pay = G.matchPayout({ humanWon: true, score: [7, 4], players: [] }, { kind: 'normal', opponents: ['rin', 'mei'], pair: ['rin', 'mei'] });
  t.ok('a win pays 12,000 + 3,000 a day + 1,000 a point of margin', pay.prize === 12000 + 3000 + 3000 && P.money === before + pay.prize, pay.prize);
  t.ok('the partner +6 on a win', pay.after - pay.before === 6);
  // autosave and load in the middle of a day
  G.installSaves(); P.slot = 1; P.money = 45678; G.autosave(); const snap = JSON.stringify(P); G.state = null;
  const s = game.saves.latest(); t.ok('an autosave exists', !!s); game.saves.load(s.slot); t.ok('load restores the state', G.state && G.state.money === 45678 && G.state.slot === 1 && JSON.stringify(G.state) === snap);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
