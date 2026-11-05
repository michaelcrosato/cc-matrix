/* ---- STORY (§6.12). An event: { when, realm ('world' | 'player' | a realm id), if(sim, realm), priority, stage, lines,
 * choices: [{ text, effects }], effects }. A line: [speaker, text, { emote, expr, pose }]. Speakers: knight ids, 'narrator',
 * 'keeper', 'herald', 'RULER' (the realm's ruler) and 'KNIGHT' (a knight of the realm). Effects are data the campaign
 * applies (saved, replayable). Lines may be a function (sim, realm) -> lines. */
const EV = (id, o) => G.def('event', id, Object.assign({ priority: 50, realm: 'player', stage: 'road', once: true, effects: [] }, o));
const N = t => ['narrator', '{c=#b8b0c8}' + t + '{/c}'];
const RULERS = { verdance: 'gareth', solmark: 'morgause', amberlyn: 'pellam', hoarfast: 'mordrain' };
const SQUIRE = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' };
G.RULERS = RULERS; G.SQUIRE = SQUIRE;
const is = (s, season, year) => s.season() === season && s.state.year === year;
G.PROLOGUE = [
  'In the Age of the Wheel, four crowns kept one calendar.',
  '{c=#7ad860}Spring{/c} to Verdance. {c=#f0c040}Summer{/c} to Solmark. {c=#e08030}Autumn{/c} to Amberlyn. {c=#a8d8ff}Winter{/c} to Hoarfast.',
  'And in Meridian, the Calendar City, the Keeper of the Wheel wound the Great Clock, that each season might yield to the next.',
  'Last winter the Keeper fell into a sleep no physician could break, and the Great Clock began to falter.',
  'From the silent city rode Lord Chancellor Meliant, beneath a banner with no season.',
  '"When the Thirteenth Month comes," he swore, "I will stop the Wheel, and no one we love will ever grow old."',
  'Four crowns answered with steel. Every knight became a brigand; every road, a war.',
  'The chroniclers named the age the {c=#d8c070}Brigantime{/c}.'];

EV('open_verdance', { when: 'tidings', realm: 'verdance', priority: 100, stage: 'orchard', title: 'The Last Blossom', if: s => is(s, 'spring', 1), lines: [
  N('Avalorn, the orchard court of Verdance. Spring, Year 1 of the Brigantime.'),
  ['amris', 'Your mother asked to rest beneath the oldest apple, my prince. It has not blossomed since the Clock faltered.'],
  ['gareth', 'Then it will blossom when the Wheel turns again. Not before.'],
  ['lynette', "Brave words. Solmark is sharpening its swords, and Hoarfast's Duke laughs alone in his ice hall."],
  ['gareth', 'Let them. We do not ride to take a throne, Lynette. We ride to wake a king.'],
  ['pelleas', 'And should a throne fall into our laps along the way? I ask only for the ballads.', { emote: 'note' }],
  ['wren', "The unicorns won't graze. They smell the Clock's sickness on the east wind."],
  ['gareth', 'Then we march before the petals fall. {shake}Sound the horn!{/shake}', { pose: 'cheer' }]],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_solmark', { when: 'tidings', realm: 'solmark', priority: 100, stage: 'sunhall', title: 'Noon Without End', if: s => is(s, 'spring', 1), lines: [
  N('Brazenhold, the furnace-throne of Solmark. Spring, Year 1 of the Brigantime.'),
  ['hesper', 'Majesty, the Chancellor promises the Wheel will stop. Imagine it: a summer without end.'],
  ['morgause', 'I have imagined it, Hesper. Every harvest burned to dust. Every child born into drought.'],
  ['agravain', 'Then we take Meridian and set the Wheel ourselves! Our summer, on our terms!', { emote: '!' }],
  ['morgause', 'Now you sound like a Solmarker. {w=.4}A long noon, Sir Agravain, is still a noon that ends.'],
  ['elidure', 'The brigands at Beltane and Lammas grow fat on our roads. Shall I clear them, my queen?'],
  ['brennoc', "Take the wyverns. They've not flown proper since the Clock went sick."],
  ['morgause', 'We march. Let every crown in Forseason learn what the sun can do.', { pose: 'cheer' }]],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_amberlyn', { when: 'tidings', realm: 'amberlyn', priority: 100, stage: 'harvesthall', title: 'The Quiet King', if: s => is(s, 'spring', 1), lines: [
  N('Ambergate, the harvest hall of Amberlyn. Spring, Year 1 of the Brigantime.'),
  ['lamorak', "The granaries stand half full, Majesty. The rest rotted where the Clock's sickness touched the fields."],
  ['enid', 'Father has not slept. He watches the old sundial in the garden, as if it might tell him something.'],
  ['dagonet', "It tells me it's noon, my lady. But it told me that yesterday as well.", { emote: 'note' }],
  ['vesna', 'The lanterns on the Lantern Road burn blue now. The dead grow restless when time limps.'],
  ['pellam', '{w=.8}...', { emote: 'dots' }],
  ['pellam', 'We will end this.'],
  ['lamorak', 'Then we ride, my king. Four words from you are worth a hundred from any other crown.']],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('open_hoarfast', { when: 'tidings', realm: 'hoarfast', priority: 100, stage: 'icehall', title: 'A Crown of Icicles', if: s => is(s, 'spring', 1), lines: [
  N('Rimeholt, the frozen court of Hoarfast. Spring, Year 1 of the Brigantime. The snow has not melted.'),
  ['mordrain', 'Ragnell! What has a face and hands, and never stops running?', { emote: '?' }],
  ['ragnell', 'A clock, Your Grace. You asked me yesterday.'],
  ['mordrain', 'Did I? Then the clock has not stopped yet. Pity. {w=.3}In winter nothing rots, Ragnell. Nothing ends.'],
  ['nimue', 'The Chancellor would agree with you, Duke. That is what frightens me.'],
  ['gorm', "My yeti won't eat. They don't like the stopped hour. I don't like it either."],
  ['safir', 'Wolves are out of Thawgate, and brigands ride with them.'],
  ['mordrain', 'Then we go hunting! Safir, the bows. Ragnell, the banners. Gorm, bring the bears.', { pose: 'cheer' }],
  ['ragnell', 'And I shall bring the sense. As always.']],
  effects: [{ toast: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.' }] });
EV('tutorial', { when: 'tidings', priority: 90, stage: 'road', title: 'The Border Road', if: (s, r) => is(s, 'spring', 1) && G.PLAYABLE.includes(r) && !s.state.flags.tutorialDone, lines: (s, r) => [
  N('The border road, at first light.'),
  ['herald', 'My liege! A brigand patrol blocks the border road. Their sergeant demands a toll.'],
  [RULERS[r], { verdance: 'Then we shall pay it in steel. Lynette, with me.', solmark: 'A toll? Agravain, show him the coin of Solmark.', amberlyn: '...Lamorak.', hoarfast: 'A toll! How quaint. Ragnell, collect it from his hide.' }[r]]],
  choices: [{ text: 'Ride out (tutorial battle)', effects: [{ tutorial: true }] }, { text: 'Let the guards handle it', effects: [{ flag: 'tutorialDone' }] }] });
EV('banner_without_season', { when: 'tidings', realm: 'world', priority: 80, stage: 'clock', if: s => is(s, 'spring', 1), lines: [
  N('Meridian. Within the Great Clock, the hands tremble between two seconds.'),
  ['meliant', 'Do you hear it, Sir Nonesuch? Every tick is a funeral bell.'],
  ['graynight', 'I hear nothing, Chancellor. That is the gift I bring.'],
  ['meliant', 'My wife died in the turning of an autumn. My son, in a winter. I will not give the Wheel another year.'],
  ['graynight', 'Then hold the city until the Thirteenth Month. When it comes, the hands will stop. So will grief.'],
  ['meliant', 'The four crowns will come for it.'],
  ['graynight', 'Let them spend their springs and summers on one another. {s=12}Time is the only army I need.{/s}']] });
EV('free_companies', { when: 'march', priority: 30, stage: 'tent', if: s => true, lines: (s, r) => [
  ['herald', 'My liege, the Free Companies hold the cross-quarter roads: Thawgate, Beltane, Lammas and Hallowmere.'],
  ['herald', 'Choose a castle next to one of ours, then up to three knights to march on it.'],
  ['herald', 'In battle, the attacker has {c=#ffd040}twelve bells{/c}. Fell their knights, or stand on the {c=#ffd040}Keep{/c} at the last bell.']] });
EV('first_victory', { when: 'afterBattle', priority: 30, stage: 'tent', if: (s, r, b) => b && b.won, lines: (s, r) => [
  ['RULER', 'The field is ours. Remember this day.', { pose: 'cheer' }],
  ['KNIGHT', 'Our beasts grow with every fight, my liege. At level 12 a monster takes its second form, sooner with a Season Seed.'],
  ['KNIGHT', 'And a knight of level 10 may take a new class at Muster.']] });
EV('first_loss', { when: 'afterBattle', priority: 30, stage: 'tent', if: (s, r, b) => b && !b.won, lines: (s, r) => [
  ['RULER', 'We are beaten. {w=.4}Count the fallen.', { expr: 'wince' }],
  ['KNIGHT', 'A wounded knight mends in a season, my liege. A monster that falls is gone for good.'],
  ['KNIGHT', 'When a fight goes ill, a knight may Retreat, and you may Delegate a battle you need not watch.']] });
EV('long_winter', { when: 'tidings', realm: 'world', priority: 60, stage: 'icehall', if: s => is(s, 'winter', 1), lines: [
  N('Winter, Year 1. The thaw did not come.'),
  ['mordrain', 'Snow on snow on snow! Do you hear it, Ragnell? The world is holding its breath!', { pose: 'cheer' }],
  ['ragnell', 'I hear the granaries emptying, Your Grace.'],
  ['herald', 'The Long Winter: the {c=#a8d8ff}Winter Tide{/c} is doubled this season.']], effects: [{ flag: 'longWinter' }] });
EV('candle_lit', { when: 'tidings', realm: 'world', priority: 95, stage: 'clock', if: s => is(s, 'spring', 2), lines: s => [
  N('Meridian. Spring, Year 2 of the Brigantime.'),
  ['graynight', 'A candle of hours, Chancellor. ' + s.state.candleMax + ' seasons tall. When it is ash, the Thirteenth Month begins.'],
  ['meliant', 'And the Keeper?'],
  ['graynight', 'He will sleep through the end of time. Is that not a mercy?', { emote: 'dots' }]], effects: [{ lightCandle: true }] });
EV('dominion_awakens', { when: 'tidings', realm: 'world', priority: 70, stage: 'tent', if: s => is(s, 'summer', 2), lines: [
  N('Midnight Keep. Summer, Year 2.'),
  ['bertilak', 'Sound the brass. The Hour marches.'],
  ['bertilak', 'To the four crowns, my compliments. I shall kill you slowly, and with every respect.', { pose: 'cheer' }]], effects: [{ aiFlag: ['dominion', 'awake', true] }] });
EV('lunete_letter', { when: 'tidings', priority: 50, stage: 'road', if: (s, r) => G.PLAYABLE.includes(r) && !s.state.knights.lunete && ((is(s, 'autumn', 1) && ['rainmere', 'goldspur', 'beltane'].some(c => s.owner(c) === r)) || (s.state.year === 2 && s.season() === 'spring')), lines: (s, r) => [
  N('A letter, sealed with brass wax and no crest.'),
  ['KNIGHT', '"The Keeper\'s daughter lives. Seek the Old Mill at Beltane Ford. Come quietly. -L."'],
  ['RULER', 'The princess... alive. Then the Wheel has an heir.', { emote: '!' }]], effects: [{ flag: 'mill_open' }, { toast: 'Quest at the Old Mill of Beltane: send a knight from Beltane Ford or a castle beside it.' }] });
EV('lunete_joins', { when: 'questReturn', priority: 60, stage: 'stable', if: s => !s.state.knights.lunete, lines: [
  N('The Old Mill of Beltane. The wheel turns on, though the river barely moves.'),
  ['gerrow', 'Take her, then. She eats more than my bats.'],
  ['lunete', 'Mother Gerrow kept me hidden all winter. She will not say so, but she was kind.'],
  ['lunete', 'I am no prize, my lord. I am a promise.']], effects: [{ addKnight: 'lunete' }] });
EV('lunete_arrives', { when: 'tidings', priority: 55, stage: 'road', if: (s, r) => is(s, 'spring', 3) && !s.state.knights.lunete && G.PLAYABLE.includes(r), lines: [
  N('Your capital, at dusk. A girl walks in alone, soaked from the road.'),
  ['lunete', 'Forgive me, I could not wait for a letter to be answered. The Clock is failing faster.'],
  ['lunete', 'I am Lunete of Meridian. Let me ride with you.']], effects: [{ addKnight: 'lunete' }] });
const brigYield = (id, cap, castle, lines) => EV('brigands_no_more_' + id, { when: 'capture', priority: 60, stage: 'road', if: (s, r, b) => b && b.castle === castle, lines,
  choices: [{ text: 'Take the oath', effects: [{ addKnight: cap }] }, { text: 'Exile them', effects: [{ mana: 60 }, { toast: '+60 mana from the brigand hoard.' }] }] });
brigYield('hob', 'hob', 'thawgate', [['hob', "All right, all right! I yield! Mind the boots, they're new.", { emote: '!' }], ['RULER', 'You robbed our roads all winter, Hob Mudspur.'], ['hob', "And I'd rob 'em for you all summer, if the pay's honest. Better a brigand who knows the passes."]]);
brigYield('gerrow', 'gerrow', 'beltane', [['gerrow', "Well. You've knocked down my gate and frightened my bats. I suppose you want tea."], ['RULER', 'I want your oath, Mother Gerrow.'], ['gerrow', "An oath costs more than tea. But I've grown fond of winning sides."]]);
brigYield('dafydd', 'dafydd', 'lammas', [['dafydd', 'Ha! Beaten fair, and by a crown! My grandmother will never believe it.', { pose: 'cheer' }], ['RULER', 'Your company has a choice, Red Dafydd.'], ['dafydd', "Then let Lammas Cross ride under a proper banner, and I'll ride at the front of it!"]]);
brigYield('abbot', 'abbot', 'hallowmere', [['abbot', '{s=10}The dead do not mind who holds the abbey. The living, perhaps.{/s}'], ['RULER', 'Will you swear to us, Abbot?'], ['abbot', 'I will swear to keep the lanterns lit. If that serves your crown, so be it.']]);
EV('owain', { when: 'muster', priority: 40, stage: 'stable', if: (s, r) => !s.state.knights.owain && s.state.realms[r] && s.state.realms[r].boundDragon, lines: [
  N('The stables. A broad man watches your drake with wet eyes.'),
  ['owain', 'I lost my Kerrow in the Long Winter. Fell out of the sky like a stone.'],
  ['owain', 'Let me teach yours to fly. Properly. I ask nothing else.']], effects: [{ addKnight: 'owain' }] });
EV('galeron', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['galeron', 'A cause at last. I have wandered from spring to winter looking for one worth the walk.'], ['galeron', 'Sir Galeron, at your service, and my wolf with me.']], effects: [] });
EV('ettard', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['ettard', 'You are bleeding on my shrine. Sit down before you fall down.'], ['ettard', 'Sister Ettard. I will mend your knights, and I will scold them while I do it.']], effects: [] });
EV('blanchefleur', { when: 'wanderer', priority: 40, stage: 'road', if: () => true, lines: [['blanchefleur', 'Coin first, then loyalty. The other way round has never paid.'], ['blanchefleur', "Blanchefleur. My bow is yours while the mana flows."]], effects: [] });
EV('blanchefleur_hire', { when: 'questReturn', priority: 60, stage: 'road', if: s => !s.state.knights.blanchefleur, lines: [N('The Lammas Fair: ribbons, ale, and a sellsword counting arrows.'), ['blanchefleur', "One hundred and fifty, and I don't fight children."]],
  choices: [{ text: 'Pay 150 mana', effects: [{ pay: 150, addKnight: 'blanchefleur' }] }, { text: 'Refuse', effects: [] }] });
EV('stillness', { when: 'tidings', realm: 'world', priority: 75, stage: 'clock', if: s => s.state.flags.stilledOnce && !s.state.flags.stillSeen, lines: [
  ['graynight', 'Listen. A castle has stopped breathing.'],
  ['meliant', 'Its people?'],
  ['graynight', 'Between one second and the next. Perfectly safe. Perfectly still.']], effects: [{ flag: 'stillSeen' }] });
EV('thirteenth_warning', { when: 'tidings', realm: 'world', priority: 85, stage: 'clock', if: s => s.state.candle === 1, lines: [['herald', '{c=#ff5050}One season remains.{/c} The candle gutters in Meridian.', { emote: '!' }], ['graynight', '{s=10}Hush now. Almost.{/s}']] });
EV('meridian_falls', { when: 'capture', priority: 100, stage: 'clock', if: (s, r, b) => b && b.castle === 'meridian' && G.PLAYABLE.includes(r), lines: (s, r) => {
  const lun = s.state.knights.lunete && s.state.knights.lunete.realm === r;
  return [['meliant', 'So it is done. {w=.5}Forgive me, Keeper. I only wanted the clocks to stop.', { pose: 'kneel' }],
    ['graynight', 'And they shall, Chancellor. You were a key, nothing more. A stopped city is only a seed.'],
    [RULERS[r], { verdance: 'Who are you?', solmark: 'Name yourself, before I burn the name off your tomb.', amberlyn: '...Who?', hoarfast: 'A riddle for you: who are you?' }[r]],
    ['graynight', 'The month that never was. The hour between hours. Every season you ever lost belongs to me.'],
    ['graynight', 'Come down into the Sanctum, little crown. Let us see whether your Wheel still turns.'],
    lun ? ['lunete', "My father's clock is not yours to break. Stand on the dials with me, and we will turn it together."] : ['KNIGHT', 'The dials, my liege. The old tales say the Wheel answers four seasons together.']];
}, effects: [{ flag: 'sanctumOpen' }, { sanctum: true }] });
EV('sanctum_retry', { when: 'afterBattle', priority: 90, stage: 'clock', once: false, if: (s, r, b) => b && b.sanctum && !b.won, lines: [['graynight', 'The Wheel trembles, but it holds. Come again, little crown. I have all the time there is.'], ['KNIGHT', 'We fall back into Meridian, my liege. The Sanctum waits for our next March.']] });
EV('rival_meridian', { when: 'tidings', realm: 'player', priority: 88, once: false, stage: 'road', if: s => s.state.flags.rivalMeridian && !s.state.flags.rivalWarned, lines: s => [['herald', '{c=#ff8060}' + (G.has('realm', s.state.flags.rivalMeridian) ? G.get('realm', s.state.flags.rivalMeridian).short : 'A rival crown') + ' holds Meridian!{/c} They march into the Sanctum.', { emote: '!' }]], effects: [{ flag: 'rivalWarned' }] });
EV('rival_failed', { when: 'tidings', realm: 'player', priority: 87, once: false, stage: 'road', if: s => s.state.flags.rivalFailed, lines: [['herald', 'The rival crown is broken in the Sanctum. The Dominion holds Meridian once more.'], ['KNIGHT', 'Then the Wheel still waits for us.']], effects: [{ flag: 'rivalFailed', value: false }, { flag: 'rivalWarned', value: false }] });
for (const [r, line] of [['verdance', 'Forgive me, Mother.'], ['solmark', 'Even suns set.'], ['amberlyn', '...Enough.'], ['hoarfast', 'Ice melts. Who knew?']])
  EV('realm_falls_' + r, { when: 'tidings', realm: 'world', priority: 65, stage: 'road', if: s => s.state.realms[r] && !s.state.realms[r].alive && !s.state.realms[r].human, lines: [N(G.get('realm', r).name + ' has fallen.'), [RULERS[r], line, { expr: 'wince' }]], effects: [] });
// Verdance's chain
EV('v_pelleas_letter', { when: 'tidings', realm: 'verdance', stage: 'orchard', if: s => is(s, 'summer', 1), lines: [['pelleas', 'My prince, I have written to Captain Elidure of Goldspur. We met at the last Concord. She laughed at my sonnet.'], ['lynette', 'Sending verse to an enemy captain. In wartime.'], ['pelleas', 'Especially in wartime!', { emote: 'heart' }]],
  choices: [{ text: 'Let him send it', effects: [{ flag: 'v_letter' }] }, { text: 'Burn the letter', effects: [] }] });
EV('v_elidure_joins', { when: 'capture', realm: 'verdance', stage: 'tent', if: (s, r, b) => s.state.flags.v_letter && b && b.castle === 'goldspur' && s.state.knights.elidure && s.state.knights.elidure.realm === 'solmark', lines: [['elidure', 'Your poetry is dreadful, Sir Pelleas.'], ['elidure', 'Your cause is not. Goldspur rides with Verdance.'], ['pelleas', 'She read it!', { emote: 'heart' }]], effects: [{ addKnight: 'elidure' }] });
EV('v_unicorn_herd', { when: 'tidings', realm: 'verdance', stage: 'stable', if: (s, r) => is(s, 'autumn', 1) && s.owner('thornwick') === r && s.knightAlive('wren', r), lines: [['wren', 'A herd. In the Briar Maze. They followed me home.', { emote: 'heart' }], ['gareth', 'Then Verdance has new friends. Welcome them.']], effects: [{ addMonster: ['unicorn', 'wren', 'capital'] }, { addItem: 'springseed' }] });
EV('v_green_oath', { when: 'capture', realm: 'verdance', stage: 'tent', if: (s, r, b) => b && G.get('castle', b.castle).tier === 'satellite', lines: [['gareth', 'I swear it on the oldest apple: I will wake the Keeper, or sleep beside him.'], ['lynette', 'You will do neither of those alone.']], effects: [{ bond: ['gareth', 2] }, { learn: ['gareth', 'verdanttempest'] }] });
EV('v_amris_past', { when: 'tidings', realm: 'verdance', stage: 'orchard', if: s => is(s, 'winter', 2), lines: [['amris', 'I was a knight of Hoarfast once, my prince. Before the robe. The Duke and I were boys together.'], ['amris', 'He may still listen to me.']],
  choices: [{ text: 'Write to the Duke', effects: [{ aiFlag: ['hoarfast', 'peaceWith', 'verdance'] }, { aiFlag: ['hoarfast', 'peaceUntil', 'plus2'] }, { toast: 'Hoarfast will not march on Verdance for two seasons.' }] }, { text: 'Keep silent', effects: [] }] });
// Solmark's chain
EV('s_hesper_offer', { when: 'tidings', realm: 'solmark', stage: 'sunhall', if: s => is(s, 'autumn', 1), lines: [['hesper', 'Majesty, the Hour has a magic of its own. Let me teach Lionsreach to call it.'], ['morgause', 'And what does the Hour ask in return?'], ['hesper', 'Nothing, Majesty. {w=.4}Nothing at all.', { emote: 'dots' }]],
  choices: [{ text: 'Accept the Hour', effects: [{ flag: 's_hesper' }, { circle: ['lionsreach', ['minute', 'stillwraith']] }] }, { text: 'Refuse', effects: [{ levels: ['hesper', 2] }] }] });
EV('s_hesper_betrays', { when: 'tidings', realm: 'solmark', stage: 'sunhall', if: (s, r) => s.state.flags.s_hesper && is(s, 'summer', 3) && s.knightAlive('hesper', r), lines: [['hesper', 'Time was always the better master, Majesty.'], ['morgause', '{shake}Hesper!{/shake}', { emote: '!' }]], effects: [{ defect: ['hesper', 'dominion'] }] });
EV('s_wyvern_eggs', { when: 'tidings', realm: 'solmark', stage: 'stable', if: (s, r) => is(s, 'spring', 2) && s.owner('goldspur') === r, lines: [['brennoc', 'Eggs, Majesty! Warm as bread. The roost has given us a wyvern.', { emote: '!' }], ['morgause', 'Then Solmark flies higher.']], effects: [{ addMonster: ['wyvern', 5, 'capital'] }, { addItem: 'summerember' }] });
EV('s_agravain_duel', { when: 'beforeBattle', realm: 'solmark', stage: 'road', if: (s, r, b) => b && b.knights.includes('agravain') && b.knights.includes('ragnell'), lines: [['agravain', "Ice-Eye! I've waited all summer to melt you."], ['ragnell', "Then you'll wait all winter to stand back up."]], effects: [{ battleBuff: ['agravain', 'valor'] }] });
// Amberlyn's chain
EV('a_dagonet_jest', { when: 'tidings', realm: 'amberlyn', stage: 'harvesthall', if: s => is(s, 'summer', 1), lines: [['dagonet', 'My lady, I put a frog in the new steward\'s soup. He did not scream. He ticked.', { emote: '?' }], ['enid', 'An Hourless spy, in our kitchens. Well jested, Sir Dagonet.'], ['dagonet', 'He left this behind. A signet. I suppose it is ours now.']], effects: [{ addItem: 'signet' }] });
EV('a_kings_cough', { when: 'tidings', realm: 'amberlyn', stage: 'harvesthall', if: s => is(s, 'winter', 1), lines: [['pellam', '{w=.5}...', { emote: 'dots' }], ['enid', 'Father, you are coughing blood.'], ['pellam', 'Enid. {w=.6}Heir.']],
  choices: [{ text: 'Name Enid heir now', effects: [{ levels: ['enid', 3] }, { learn: ['enid', 'renewal'] }] }, { text: 'Wait', effects: [] }] });
EV('a_lanterns', { when: 'tidings', realm: 'amberlyn', stage: 'road', if: s => is(s, 'autumn', 2), lines: [N('All-Hallows on the Lantern Road.'), ['vesna', 'One lantern for every name. The dead like to be counted.'], ['vesna', 'Two of the lamps followed me back. I think they want to fight for us.']], effects: [{ addMonster: ['jacklamp', 6, 'capital'] }, { addMonster: ['jacklamp', 6, 'capital'] }, { addItem: 'autumnacorn' }] });
EV('a_lamorak_stand', { when: 'beforeBattle', realm: 'amberlyn', stage: 'road', if: (s, r, b) => b && b.castle === 'ashbarrow' && b.defender === r && b.knights.includes('lamorak'), lines: [['lamorak', 'I have held Ashbarrow for thirty winters. I will hold it for one more.']], effects: [{ battleBuff: ['lamorak', 'warded'] }] });
// Hoarfast's chain
EV('w_nimue_bargain', { when: 'tidings', realm: 'hoarfast', stage: 'icehall', if: s => is(s, 'summer', 1), lines: [['nimue', 'Duke, the mere offers an egg. A frost wyrm. It asks only a memory in return.'], ['mordrain', 'A memory! I have so many. Which one does it want?'], ['nimue', 'It will choose.', { emote: 'dots' }]],
  choices: [{ text: 'Accept the bargain', effects: [{ addMonster: ['frostwyrm', 4, 'capital'] }, { flag: 'w_forgot' }] }, { text: 'Refuse', effects: [{ levels: ['nimue', 1] }] }] });
EV('w_gorm_cub', { when: 'tidings', realm: 'hoarfast', stage: 'stable', if: s => is(s, 'autumn', 1), lines: [['gorm', 'She came back. My little one. Walked out of the snow like nothing happened.', { emote: 'heart' }], ['ragnell', 'That "little one" is taller than the gate, Gorm.']], effects: [{ addMonster: ['yeti', 5, 'capital'] }] });
EV('w_ragnell_doubt', { when: 'tidings', realm: 'hoarfast', stage: 'icehall', if: s => is(s, 'winter', 2), lines: [['ragnell', 'Do I follow a madman? I ask it every night, and every morning I put on my armour.'], ['mordrain', 'Ragnell. You are the only clock in this castle that keeps good time.']],
  choices: [{ text: 'Trust him', effects: [{ levels: ['ragnell', 2] }] }, { text: 'Watch him', effects: [{ addItem: 'wardingcharm' }] }] });
EV('w_lucid_hour', { when: 'capture', realm: 'hoarfast', stage: 'icehall', if: (s, r, b) => b && G.get('castle', b.castle).tier === 'satellite', lines: [['mordrain', 'Ragnell. {w=.5}I had a sister. She drowned in the lake beneath Rimeholt.'], ['mordrain', 'If winter never ends, the lake never thaws, and it never gives her back.'], ['ragnell', 'Then let us end the winter, Your Grace. Together.']], effects: [{ flag: 'w_lucid' }] });
// endings
const epi = { gareth: 'Gareth wound the Great Clock each midwinter until a new Keeper was found.', lynette: 'Dame Lynette kept the Concord\'s peace for forty years, and never once admitted she enjoyed it.', pelleas: 'Sir Pelleas wrote four hundred verses about the Sanctum. Few were read; all were loved.', amris: 'Brother Amris went north at last, and the Duke met him at the gate.', wren: 'Wren took the unicorns home to the Glade, and the orchards bloomed early.',
  morgause: 'Queen Morgause let the sun set on her war, and found she liked the evening.', agravain: 'Sir Agravain challenged every champion in Forseason, and lost graciously twice.', elidure: 'Captain Elidure kept Goldspur\'s roads safe, and Sir Pelleas\'s letters in a box.', hesper: 'Magus Hesper burned her Hour books in the furnace, one by one.', brennoc: 'Old Brennoc raised a hundred wyverns and named every one.',
  pellam: 'King Pellam\'s last word was "Turn." The Wheel did.', enid: 'Queen Enid opened the granaries to every realm that first hungry spring.', dagonet: 'Sir Dagonet became court jester and court champion, both at once.', vesna: 'Vesna lit the Lantern Road every All-Hallows, and the dead were content.', lamorak: 'Sir Lamorak held Ashbarrow for thirty more winters.',
  mordrain: 'Duke Mordrain let the ice go, and the lake gave back its silence.', ragnell: 'Dame Ragnell ruled Hoarfast in all but name, and kept excellent time.', safir: 'Sir Safir hunted no more, and learned to sing.', nimue: 'Nimue of Frostmere kept her bargains, and her secrets.', gorm: 'Gorm and his yeti built a bridge over the Rimewall.',
  lunete: 'Lunete was crowned Keeper of the Wheel. The four crowns knelt first.', galeron: 'Sir Galeron found his cause, and kept it.', blanchefleur: 'Blanchefleur retired rich, and kept her code.', owain: 'Owain flew again, on a drake that loved him.', ettard: 'Sister Ettard scolded every wounded knight back to health.' };
G.EPILOGUE = epi;
const endLines = { verdance: [['RULER', 'Rest now, Keeper. The Wheel is in good hands.'], N('In Avalorn, the oldest apple blossomed that very morning.')],
  solmark: [['RULER', 'Even the sun must set, or it is only a fire.'], N('In Brazenhold, the furnaces were banked, and summer came gently.')],
  amberlyn: [['RULER', '{w=.6}Turn.'], N('King Pellam closed his eyes. Lady Enid was crowned before the leaves fell.')],
  hoarfast: [['RULER', 'Let the ice go, Ragnell. Let her go.'], N('Beneath Rimeholt, the lake thawed for the first time in a hundred years.')] };
const endTitles = { verdance: 'The Wheel Turns Again', solmark: 'The Long Noon Ends', amberlyn: 'The Last Harvest', hoarfast: 'Spring Thaw' };
for (const r of G.PLAYABLE) EV('ending_' + r, { when: 'ending', realm: r, stage: 'clock', title: endTitles[r], lines: [N('The thirteenth bell never rang.'), ['graynight', 'Then turn, little Wheel. Turn, and lose everything again. I will wait between the seconds.'], N('The Great Clock shuddered, and its hands moved on.'), ['keeper', 'Spring... I dreamed of spring. Thank you, child of the seasons.'], ...endLines[r]] });
EV('ending_candle', { when: 'ending', realm: 'player', stage: 'clock', title: 'THE LEGEND ENDS IN SILENCE', bad: true, lines: [['graynight', '{s=8}Hush now. Nothing will ever end again.{/s}'], N('The candle went out. The hands stopped. The Wheel turned no more.')] });
const wheelEnd = { verdance: ['FLOOD', 'Let it be spring forever. Let it rain.'], solmark: ['FIRE', 'Summer, now and always. Burn.'], amberlyn: ['DUST', '...Harvest.'], hoarfast: ['ICE', 'Winter! Nothing rots. Nothing ends!'] };
for (const r of G.PLAYABLE) EV('ending_wheel_' + r, { when: 'ending', realm: 'player', stage: 'clock', title: 'THE LEGEND ENDS IN ' + wheelEnd[r][0], bad: true, lines: [[RULERS[r], wheelEnd[r][1]], N(G.get('realm', r).short + ' set the Wheel to its own season. The land did not forgive it.')] });
EV('ending_fallen', { when: 'ending', realm: 'player', stage: 'road', title: 'THE LEGEND FORGETS YOU', bad: true, lines: [['RULER', 'Our last banner is down. {w=.5}Ride on. Somewhere the Wheel still turns.', { expr: 'wince' }], N('The ruler went into exile, and the chroniclers did not write the name.')] });
// rival lines before battle (both on the field: the first match plays)
G.RIVALS = [['agravain', 'ragnell', "Ice-Eye! I've waited all summer to melt you.", "Then you'll wait all winter to stand back up."],
  ['pelleas', 'elidure', 'Captain! Did you read my letter?', "I'm reading your formation, Sir Pelleas. It's worse."],
  ['gareth', 'morgause', "The Wheel isn't yours to take, Your Majesty.", 'Then come and stop me, princeling. Bring your blossoms.'],
  ['mordrain', 'pellam', 'The Quiet King! Say something, old man!', '...No.'],
  ['lynette', 'agravain', 'Cinderjaw. Still shouting?', 'Still standing in my way?'],
  ['dagonet', 'hob', 'A brigand with a funny name! Finally, a rival.', 'Oi! Mudspur is a proud name!'],
  ['morgause', 'pellam', 'Step aside, old king. Summer has no patience for harvests.', '...Patience.'],
  ['mordrain', 'gareth', 'Little sprout! Do you know why snow is so quiet?', "Because it's waiting for spring."],
  ['meliant', 'lunete', 'Princess... you should be asleep beside your father.', 'Somebody has to stay awake, Chancellor.'],
  ['bertilak', '*', 'Courtesy first: I shall kill you slowly, and with every respect.', null],
  ['tic', '*', 'Tic says-', '-Tac agrees!'],
  ['aurelie', '*', 'Must you? I was enjoying the silence.', null],
  ['graynight', '*', 'Twelve bells, little crown. Then nothing, ever again.', null]];
// quest vignettes: 3 per outcome; {$knight} {$site} {$thing}
G.VIGNETTES = {
  treasure: ['{$knight} returns from {$site} with dust on the boots and a {$thing} in hand.', 'At {$site}, {$knight} found a {$thing} beneath a stone no one had lifted in a century.', '{$knight} comes home from {$site} smiling, and sets a {$thing} on the table.'],
  beast: ['A {$thing} followed {$knight} home from {$site}. It will not leave.', '{$knight} tamed a {$thing} at {$site}, with patience and a good deal of cheese.', 'From {$site}, {$knight} leads back a {$thing} on a long rope.'],
  wanderer: ['At {$site}, {$knight} met a wandering knight: {$thing}.', '{$knight} returns from {$site} with company: {$thing}.', 'A stranger walked beside {$knight} all the way from {$site}: {$thing}.'],
  mana: ['{$knight} found a mana spring at {$site}: {$thing} mana for the realm.', 'The stones at {$site} hummed with power. {$knight} brings back {$thing} mana.', 'At {$site}, {$knight} gathered {$thing} mana from the old wells.'],
  training: ['{$knight} trained hard at {$site}. Knight and troop return stronger.', 'At {$site}, {$knight} drilled the troop until even the beasts saluted.', '{$knight} spent the season at {$site} sparring with the wind.'],
  mishap: ["{$knight}'s patrol was ambushed at {$site}. {$knight} will mend.", '{$knight} returns from {$site} limping, and will not speak of it.', 'A rockfall at {$site} caught {$knight}. The wounds will take a season.']
};
