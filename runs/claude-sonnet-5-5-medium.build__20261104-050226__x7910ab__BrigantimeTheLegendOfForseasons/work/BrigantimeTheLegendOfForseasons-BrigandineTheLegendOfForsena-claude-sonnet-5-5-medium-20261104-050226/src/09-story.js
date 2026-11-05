/* ---- STORY: events are data. when(S) says when one is due, scene(S) gives its lines, done(S) its effects. ---- */
const kn = id => G.KNIGHTS[id];
const L = (who, text, extra) => Object.assign({ who, name: who === 'narrator' ? '' : (kn(who) ? kn(who).short : who), text, voice: who === 'narrator' ? 1 : (kn(who) || { voice: 1 }).voice }, extra || {});
const N = text => L('narrator', text);
G.ruler = realm => G.RULERS[realm];
const rival = S => G.REALMS[(S.human + 1) % 4];
G.EVENTS = [
  { id: 'prologue', when: S => S.turn === 1, stage: 'hall',
    scene: S => { const r = G.REALMS[S.human], rk = G.ruler(S.human); return [
      N('In the Year Before Counting, the Great Clock of Meridian began to run slow. Nobody noticed. It is difficult to notice that sort of thing.'),
      N('Then Spring arrived on a Tuesday, and so did Summer, and the dairymaids filed a complaint.'),
      L(rk, 'Forgive the ' + (S.human === 1 ? 'noonday ' : '') + 'summons. The seasons are not keeping their appointments, and I am told it is rude to ask the sky to hurry.'),
      L(rk, 'Four realms, ' + r.name + ' among them, hold the wheel together. Meridian sleeps, and its Keeper with it. Someone has to wake the Clock.'),
      N('You are the one who will. This is a thing that has already been decided, mostly by you, a moment ago, in the corridor.'),
      L(rk, 'Muster the Wheelsworn. Bind the beasts to your banners. And mind the road: the other realms have noticed the Clock as well, and they are as polite about it as we are.'),
      N('The first Tidings of the Brigantime are read. Spring, Year 1. The kettle is on.')]; } },
  { id: 'rival_taunt', when: S => S.year === 1 && S.season === 2, stage: 'road',
    scene: S => { const rv = rival(S), rk = G.ruler(rv.id); return [
      N('A rider arrives under a flag of truce, which is a flag nobody has ever quite managed to define.'),
      L(rk, 'Greetings from ' + rv.name + '. I wished to say that I intend to reach Meridian first. I wished also to say it courteously, since we are neighbours.'),
      L(G.ruler(S.human), 'How very civil. And how very much I shall disappoint you.', { choices: [{ text: 'Reply in kind: "May the best season win."', set: { rivalCourt: 1 } }, { text: 'Reply stiffly: "Mind your borders."', set: { rivalStiff: 1 } }] }),
      N('The rider bows, mounts, and gets lost on the way out. This is recorded as a diplomatic success.')]; } },
  { id: 'candle_lit', when: S => S.flags.candleLit, stage: 'clock',
    scene: S => [
      N('At the stroke of a bell no one rang, a candle caught light in every window of Forseason. Its flame did not flicker. It burned straight up, like a held breath.'),
      L('vesper', 'Good people of the four seasons. Please do not be alarmed. I have only stopped the Clock.'),
      L('vesper', 'You will find it restful. No harvests to hurry, no winters to dread. Only this long and gentle Now. I call it the Hourless Dominion.'),
      L('vesper', 'The Hour-Candle burns ' + S.candle + ' seasons, and then the Thirteenth Month begins. Come to Meridian before then, if you would like to argue.'),
      L(G.ruler(S.human), 'We would like to argue very much.'),
      N('The Hour-Candle is lit. Take Meridian before it burns out, and wake the Keeper.')] },
  { id: 'gray_whisper', when: S => S.stillCastle >= 0 && S.year >= 2 && !S.eventsDone.gray_whisper, stage: 'clock',
    scene: S => [
      N('In ' + G.CASTLES[S.stillCastle].short + ' every clock, every cat and every kettle has stopped. The cat is still mid-yawn.'),
      L('gray', '...'),
      L('gray', 'I do not remember the last season. I do remember that it was unkind. I will keep you from it.'),
      L(G.ruler(S.human), 'Who speaks?'),
      N('The Gray Knight does not answer. He seems to be listening to something very far away, which is possibly the future.')] },
  { id: 'first_blood', when: S => S.stats.wins >= 1, stage: 'road',
    scene: S => [
      N('The first battle is over, and nobody is quite sure what to do with their hands.'),
      L(G.ruler(S.human), 'A victory. We should write that down, before the next one happens to us.'),
      N('Knights who fought gain Experience. Monsters who fought gain it too, and gain it faster, and complain about it less.')] },
  { id: 'brigands_no_more', when: S => S.flags.brigandsGone, stage: 'road',
    scene: S => [
      N('With the last brigand castle taken, the roads of Forseason are safe for the first time in a hundred years.'),
      L('maelgwn', 'Well. That is an unexpected thing, to be on the wrong side of a toll.'),
      N('Merchants return. Unfortunately, so do the tax collectors. It is a mixed blessing, and a very well-attended one.')] },
  { id: 'galahad_joins', when: S => S.flags.joined_galahad, stage: 'hall', scene: S => [N('A stranger walks into the muster hall at the exact moment someone had asked where he was.'), L('galahad', 'I was told you would need a knight who arrives at the wrong time. I do it professionally.')] },
  { id: 'lunette_joins', when: S => S.flags.joined_lunette, stage: 'hall', scene: S => [N('A woman with a spare season in her pocket joins your banner. She declines to say which one.'), L('lunette', 'Spring, if you are asking. I save it for emergencies, and for people who are being rude about winter.')] },
  { id: 'ywain_joins', when: S => S.flags.joined_ywain, stage: 'hall', scene: S => [N('A knight and a very large lion arrive. The lion seems to be in charge.'), L('ywain', 'He has opinions about your strategy. I have translated some of them. The rest are rude.')] },
  { id: 'meridian_near', when: S => !S.eventsDone.meridian_near && [13, 14, 15, 16].some(c => S.castles[c].owner === S.human), stage: 'clock',
    scene: S => [
      N('From the walls, on a clear day, you can see the tower of Meridian. It looks exactly like a clock that has stopped, which is what it is.'),
      L(G.ruler(S.human), 'Close enough to hear it not ticking.'),
      N('The Calendar City is guarded by the Gray Knight. The Season Dials in its Sanctum shield him: stand a knight on a Dial to weaken the shield.')] },
  { id: 'candle_half', when: S => S.candle != null && S.candle <= Math.floor(G.tune.candleSeasons / 2) && !S.eventsDone.candle_half, stage: 'clock',
    scene: S => [N('The Hour-Candle has burned to half. The flame has stopped being polite about it.'), L(G.ruler(S.human), 'Half of everything we have left. I shall try to spend it on things other than worry.')] },
  { id: 'candle_low', when: S => S.candle != null && S.candle <= 2 && !S.eventsDone.candle_low, stage: 'clock',
    scene: S => [N('Two seasons. The wax has the look of a thing that has made up its mind.'), L(G.ruler(S.human), 'Then we do not wait for the next Tidings. We go to Meridian now.')] },
  { id: 'realm_falls', when: S => [0, 1, 2, 3].some(r => S.flags['dead_' + r] && r !== S.human && !S.flags['seen_dead_' + r]), stage: 'road',
    scene: S => { const r = [0, 1, 2, 3].find(x => S.flags['dead_' + x] && x !== S.human && !S.flags['seen_dead_' + x]); S.flags['seen_dead_' + r] = true; return [N('The banners of ' + G.REALMS[r].name + ' are lowered for the last time. Its knights scatter to the wanderers\' roads.'), L(G.ruler(S.human), 'I did not wish this. But I will make it count for something.')]; } }
];
/* endings: one for each realm, plus three kinds of failure */
G.ENDINGS = {
  victory: realm => { const rk = G.ruler(realm), R_ = G.REALMS[realm]; return [
    N('The Sanctum doors give way. The Gray Knight kneels at the Great Clock, and the helm comes off, and there is nothing under it but a very old tiredness.'),
    L('gray', 'I only wished the last season to stop hurting.'),
    L('vesper', 'We meant it kindly. Everything we did, we meant kindly. That is the trouble with kindness: it never knows when to stop.'),
    L(rk, 'Then let us teach it. Spring, Summer, Autumn, Winter: in order, and never all at once.'),
    N('The Keeper wakes. The Clock, which has been holding its breath for nineteen seasons, lets it go. A bell rings, a very ordinary bell, and every kettle in Forseason boils at once.'),
    N(R_.name + ' is crowned Warden of the Wheel. ' + ({ 0: 'Blossoms open on the battlements out of sheer relief.', 1: 'Noon, for the first time in a year, arrives on time and a little pleased with itself.', 2: 'The harvest is brought in. Everyone agrees it is the best in memory, which is the kind of thing that is always agreed.', 3: 'Snow falls in the orchards, softly, politely, exactly when it is supposed to.' })[realm]),
    N('THE END. Or, more precisely, the end of this Tuesday.')]; },
  candle: realm => [N('The Hour-Candle gutters. The flame leans, and thinks about it, and goes out.'), N('Nothing dramatic follows. There is only a long, tidy quiet, in which the seasons forget which of them is next.'), L('vesper', 'There. Is that not restful?'), N('It is restful. That is the whole tragedy of it.')],
  fallen: realm => [N('The last banner of ' + G.REALMS[realm].name + ' is folded by hands that have run out of reasons to hurry.'), L(G.ruler(realm), 'We tried. Let that be written, even if no one is left to read it.'), N('Elsewhere, the seasons keep their appointments, or do not, with no one to notice.')],
  rival: realm => [N('A rival realm takes Meridian and crowns itself Warden of the Wheel, and the Clock keeps running in somebody else\'s favour.'), L(G.ruler(realm), 'It was well done. I would only have preferred to be the one to do it.'), N('The Brigantime ends. Spring returns, regardless, and is very sorry for the delay.')]
};
G.TIPS = ['Seasons are elements: Spring opposes Autumn, Summer opposes Winter.', 'Monsters stay near their knight: outside the Ward they fight at a penalty.', 'A weakened monster can be Bound by a knight to join your banner.',
  'Spells need planted feet. A knight that moves first cannot cast.', 'The attacker has twelve bells. A knight on the Keep when the last bell rings also wins.', 'In its own season a realm earns a quarter more mana.', 'Quests are risky and generous. Send the knights you can spare.'];
