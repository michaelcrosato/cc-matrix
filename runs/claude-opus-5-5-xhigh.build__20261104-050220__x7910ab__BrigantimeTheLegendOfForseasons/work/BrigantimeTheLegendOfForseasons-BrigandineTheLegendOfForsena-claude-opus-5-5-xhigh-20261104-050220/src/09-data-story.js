// STORY: events as data. { when: 'tidings' | 'manual', realm: a realm | 'player' | 'world', if(c), priority (opening
// 100, story 50, recruit 30, flavour 10), once, stage, lines: [[speaker, text, { emote, pose, expr }]], choices:
// [{ text, effects, lines }], effects, tip, ending }. Speakers: a knight id, 'narrator', 'ruler' (the realm's ruler),
// 'herald', 'keeper'. Effects run in CampaignSim._effect. Style: brief, earnest, formal; humour from the characters.

const EV = (id, o) => G.def('event', id, Object.assign({ when: 'manual', realm: 'player', priority: 50, once: true, stage: 'road' }, o));
const NARR = t => ['narrator', '{c=#b8b0c8}' + t + '{/c}'];
const SEASONC = { spring: '#9ad86a', summer: '#ffd060', autumn: '#ff9a40', winter: '#a8e0ff' };
const sc = (s, t) => '{c=' + SEASONC[s] + '}' + t + '{/c}';

G.PROLOGUE = [
  'In the Age of the Wheel, four crowns kept one calendar.',
  sc('spring', 'Spring') + ' to Verdance. ' + sc('summer', 'Summer') + ' to Solmark. ' + sc('autumn', 'Autumn') + ' to Amberlyn. ' + sc('winter', 'Winter') + ' to Hoarfast.',
  'And in Meridian, the Calendar City, the Keeper of the Wheel wound the Great Clock, that each season might yield to the next.',
  'Last winter the Keeper fell into a sleep no physician could break, and the Great Clock began to falter.',
  'From the silent city rode Lord Chancellor Meliant, beneath a banner with no season.',
  '"When the Thirteenth Month comes," he swore, "I will stop the Wheel, and no one we love will ever grow old."',
  'Four crowns answered with steel. Every knight became a brigand; every road, a war.',
  'The chroniclers named the age the {c=#ffd36a}Brigantime{/c}.'
];

/* ---- the openings ---- */
EV('open_verdance', { when: 'tidings', realm: 'verdance', priority: 100, stage: 'orchard', if: c => c.turn === 0, cast: ['amris', 'gareth', 'lynette', 'pelleas', 'wren'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Avalorn, the orchard court of Verdance. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['amris', 'Your mother asked to rest beneath the oldest apple, my prince. It has not blossomed since the Clock faltered.'],
  ['gareth', 'Then it will blossom when the Wheel turns again. Not before.', { expr: 'angry' }],
  ['lynette', "Brave words. Solmark is sharpening its swords, and Hoarfast's Duke laughs alone in his ice hall."],
  ['gareth', 'Let them. We do not ride to take a throne, Lynette. We ride to wake a king.'],
  ['pelleas', 'And should a throne fall into our laps along the way? I ask only for the ballads.', { emote: 'note' }],
  ['wren', "The unicorns won't graze. They smell the Clock's sickness on the east wind."],
  ['gareth', 'Then we march before the petals fall. {shake}Sound the horn!{/shake}', { pose: 'cheer', expr: 'shout', emote: '!' }]] });
EV('open_solmark', { when: 'tidings', realm: 'solmark', priority: 100, stage: 'sunhall', if: c => c.turn === 0, cast: ['hesper', 'morgause', 'agravain', 'elidure', 'brennoc'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Brazenhold, the furnace-throne of Solmark. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['hesper', 'Majesty, the Chancellor promises the Wheel will stop. Imagine it: a summer without end.'],
  ['morgause', 'I have imagined it, Hesper. Every harvest burned to dust. Every child born into drought.', { expr: 'angry' }],
  ['agravain', 'Then we take Meridian and set the Wheel ourselves! Our summer, on our terms!', { expr: 'shout', emote: '!' }],
  ['morgause', 'Now you sound like a Solmarker. {w=.4}A long noon, Sir Agravain, is still a noon that ends.'],
  ['elidure', 'The brigands at Beltane and Lammas grow fat on our roads. Shall I clear them, my queen?'],
  ['brennoc', "Take the wyverns. They've not flown proper since the Clock went sick."],
  ['morgause', 'We march. Let every crown in Forseason learn what the sun can do.', { pose: 'cheer', expr: 'smile' }]] });
EV('open_amberlyn', { when: 'tidings', realm: 'amberlyn', priority: 100, stage: 'harvesthall', if: c => c.turn === 0, cast: ['lamorak', 'enid', 'dagonet', 'vesna', 'pellam'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Ambergate, the harvest hall of Amberlyn. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime.'),
  ['lamorak', "The granaries stand half full, Majesty. The rest rotted where the Clock's sickness touched the fields."],
  ['enid', 'Father has not slept. He watches the old sundial in the garden, as if it might tell him something.'],
  ['dagonet', "It tells me it's noon, my lady. But it told me that yesterday as well.", { emote: 'note' }],
  ['vesna', 'The lanterns on the Lantern Road burn blue now. The dead grow restless when time limps.'],
  ['pellam', '{w=.8}...', { emote: 'dots' }],
  ['pellam', 'We will end this.'],
  ['lamorak', 'Then we ride, my king. Four words from you are worth a hundred from any other crown.', { pose: 'cheer' }]] });
EV('open_hoarfast', { when: 'tidings', realm: 'hoarfast', priority: 100, stage: 'icehall', if: c => c.turn === 0, cast: ['ragnell', 'mordrain', 'nimue', 'gorm', 'safir'], tip: 'Take a brigand castle. Reach Meridian before the Thirteenth Month.', lines: [
  NARR('Rimeholt, the frozen court of Hoarfast. ' + sc('spring', 'Spring') + ', Year 1 of the Brigantime. The snow has not melted.'),
  ['mordrain', 'Ragnell! What has a face and hands, and never stops running?', { expr: 'smile', emote: '?' }],
  ['ragnell', 'A clock, Your Grace. You asked me yesterday.'],
  ['mordrain', 'Did I? Then the clock has not stopped yet. Pity. {w=.3}In winter nothing rots, Ragnell. Nothing ends.'],
  ['nimue', 'The Chancellor would agree with you, Duke. That is what frightens me.'],
  ['gorm', "My yeti won't eat. They don't like the stopped hour. I don't like it either."],
  ['safir', 'Wolves are out of Thawgate, and brigands ride with them.'],
  ['mordrain', 'Then we go hunting! Safir, the bows. Ragnell, the banners. Gorm, bring the bears.', { pose: 'cheer', expr: 'shout', emote: '!' }],
  ['ragnell', 'And I shall bring the sense. As always.']] });
EV('tutorial', { when: 'tidings', realm: 'player', priority: 99, stage: 'road', if: c => c.turn === 0 && c.sim.s.humans[0] === c.realm, cast: ['ruler', 'herald'], lines: [
  ['herald', 'A brigand patrol blocks the border road, my liege. A sergeant and his beasts.'],
  ['ruler', 'Then we clear it, and learn the lie of the land as we go.']],
  choices: [{ text: 'Fight the patrol (tutorial)', effects: [{ flag: 'tutorial' }] }, { text: 'Ride around them', effects: [] }] });
EV('banner_without_season', { when: 'tidings', realm: 'world', priority: 95, stage: 'clock', if: c => c.turn === 0, cast: ['meliant', 'graynight'], lines: [
  NARR('Meridian. Within the Great Clock, the hands tremble between two seconds.'),
  ['meliant', 'Do you hear it, Sir Nonesuch? Every tick is a funeral bell.'],
  ['graynight', 'I hear nothing, Chancellor. That is the gift I bring.'],
  ['meliant', 'My wife died in the turning of an autumn. My son, in a winter. I will not give the Wheel another year.', { expr: 'angry' }],
  ['graynight', 'Then hold the city until the Thirteenth Month. When it comes, the hands will stop. So will grief.'],
  ['meliant', 'The four crowns will come for it.'],
  ['graynight', 'Let them spend their springs and summers on one another. Time is the only army I need.', { emote: 'dots' }]] });
EV('free_companies', { when: 'march', realm: 'player', priority: 60, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'The Free Companies hold the cross-quarter roads, my liege: Thawgate, Beltane, Lammas and Hallowmere.'],
  ['herald', 'Any castle beside one of ours may be attacked, with up to three troops. Its gates fall open if no knight holds it.'],
  ['herald', 'An attacker has twelve bells. Stand a knight on the Keep at the last bell, or rout every knight, to win.']] });
EV('first_victory', { realm: 'player', priority: 40, stage: 'tent', cast: ['ruler', 'knight'], lines: [
  ['ruler', 'The field is ours. Tend the wounded; count the beasts we kept.', { pose: 'cheer', expr: 'smile' }],
  ['knight', 'Our knights grow stronger with every bell, my liege. At level ten a knight may take a new class.'],
  ['knight', 'And our beasts grow too: at level twelve, or sooner with a Season Seed, they change their form.']] });
EV('first_loss', { realm: 'player', priority: 40, stage: 'tent', cast: ['ruler', 'knight'], lines: [
  ['ruler', 'We were driven back. {w=.3}Those beasts we lost are lost for good.', { expr: 'wince' }],
  ['knight', 'There is no shame in a retreat, my liege. A knight who retreats keeps his troop; a fallen one rests a season.'],
  ['knight', 'And when the odds are poor, Delegate the field to your captains, or choose another road.']] });
EV('long_winter', { when: 'tidings', realm: 'world', priority: 60, stage: 'icehall', if: c => c.season === 'winter' && c.year === 1, cast: ['mordrain', 'ragnell'], lines: [
  NARR(sc('winter', 'Winter') + ', Year 1. The thaw did not come. They are calling it the Long Winter.'),
  ['mordrain', 'Ha! Look at it, Ragnell. Snow on snow on snow. Even the clocks are shivering.', { pose: 'cheer', expr: 'smile' }],
  ['ragnell', 'The Winter Tide runs twice as strong this season, Your Grace. Our foes will feel it.'],
  ['mordrain', 'Let them feel it. Let them learn what waiting is.']] });
EV('candle_lit', { when: 'tidings', realm: 'world', priority: 90, stage: 'clock', if: c => c.season === 'spring' && c.year === 2, cast: ['graynight', 'meliant'], effects: [{ candle: true }], tip: 'The Hour-Candle is lit. When it is ash, the Thirteenth Month begins.', lines: [
  NARR('Meridian. ' + sc('spring', 'Spring') + ', Year 2 of the Brigantime.'),
  ['graynight', 'A candle of hours, Chancellor. Twelve seasons tall. When it is ash, the {c=#ff5a4a}Thirteenth Month{/c} begins.'],
  ['meliant', 'And the Keeper?'],
  ['graynight', 'He will sleep through the end of time. Is that not a mercy?', { emote: 'dots' }]] });
EV('dominion_awakens', { when: 'tidings', realm: 'world', priority: 70, stage: 'tent', if: c => c.season === 'summer' && c.year === 2, cast: ['bertilak', 'tic', 'tac'], effects: [{ dominion: true }], lines: [
  NARR('Midnight Keep. ' + sc('summer', 'Summer') + ', Year 2. The gates of the Hourlands open.'),
  ['bertilak', 'The Hour marches. {w=.3}My compliments to the four crowns: they have bled one another beautifully.', { expr: 'smile' }],
  ['tic', 'Tic says the roads are ready—'],
  ['tac', '—Tac agrees!'],
  ['bertilak', 'Courtesy first, then. I shall kill them slowly, and with every respect.', { pose: 'cheer' }]] });
EV('lunete_letter', { when: 'tidings', realm: 'player', priority: 55, stage: 'road', if: c => (c.season === 'autumn' && c.year === 1 && (c.owns('rainmere') || c.owns('goldspur') || c.owns('beltane'))) || (c.year === 2 && c.season === 'spring') || (c.turn > 4 && !c.flag('site_oldmill')), cast: ['ruler', 'herald'], effects: [{ unlockSite: 'oldmill' }], tip: 'Send a knight from a castle beside Beltane Ford to the Old Mill.', lines: [
  ['herald', 'A letter, my liege, left on our gate under a millstone. It is signed only with an L.'],
  ['ruler', '"The Keeper\'s daughter lives. Seek the Old Mill at Beltane Ford, and come quietly."'],
  ['ruler', "Lunete. If she lives, the Keeper's line lives. Find her before the Hour does.", { emote: '!' }]] });
EV('lunete_joins', { realm: 'player', priority: 80, stage: 'road', cast: ['gerrow', 'lunete'], effects: [{ addKnight: 'lunete' }], lines: [
  NARR('The Old Mill of Beltane. The wheel has not turned since the Clock faltered.'),
  ['gerrow', 'Take her, then. She eats more than my bats.', { expr: 'smile' }],
  ['lunete', 'I am no prize, my lord. I am a promise.'],
  ['lunete', "My father's watch stopped the night he slept. Let me ride with you, and we will wind it again."]] });
EV('lunete_arrives', { when: 'tidings', realm: 'player', priority: 80, stage: 'road', if: c => c.year >= 3 && c.season === 'spring' && !c.sim.s.knights.lunete, cast: ['lunete', 'ruler'], effects: [{ addKnight: 'lunete' }], lines: [
  NARR('Your capital. A girl walks in alone through the rain, soaked from the road.'),
  ['lunete', 'Forgive me. I waited at the mill as long as I dared. The Hour has eyes even there.'],
  ['lunete', "I am Lunete, the Keeper's daughter. My father's clock is breaking. Let me help you mend it."],
  ['ruler', 'Then the Wheel has a friend in this court. Rest, Princess. We ride at dawn.']] });
const captain = (id, cid, a, b, c) => EV('brigands_no_more_' + id, { realm: 'player', priority: 45, stage: 'road', cast: [id, 'ruler'], lines: [[id, a], ['ruler', b], [id, c]],
  choices: [{ text: 'Take the oath', effects: [{ captainJoins: id, at: cid }] }, { text: 'Exile the captain', effects: [{ exileCaptain: id }, { mana: 60 }] }] });
captain('hob', 'thawgate', "All right, all right! I yield! Mind the boots, they're new.", 'You robbed our roads all winter, Hob Mudspur.', "And I'd rob 'em for you all summer, if the pay's honest. Better a brigand who knows the passes.");
captain('gerrow', 'beltane', "Well. You've a firm hand, I'll give you that. Come in out of the wet.", 'Your bats have harried our river barges for a year, Mother Gerrow.', "And fed my mill-folk with it. Feed them better, and my bats are yours.");
captain('dafydd', 'lammas', 'Ha! Beaten fair and loud! Red Dafydd salutes you!', 'You took tolls at Lammas Cross from widows and pilgrims.', "And from lords, mostly. Give me a banner worth shouting under, and I'll shout for you.");
captain('abbot', 'hallowmere', 'The bells of the abbey are quiet now. Thank you for that, at least.', 'Your dead walked our roads, Abbot.', 'They walk because time limps. Mend it, and they will rest. Until then, let me keep them on your side.');
EV('owain', { realm: 'player', priority: 30, stage: 'stable', cast: ['owain', 'ruler'], effects: [{ addKnight: 'owain' }], lines: [
  NARR('The stables. A stranger in a scorched leather coat is watching your new drake.'),
  ['owain', 'I lost my Kerrow in the Long Winter. Let me teach yours to fly.'],
  ['ruler', 'And what do you ask in return?'],
  ['owain', 'Only to hear wings again. Owain, they call me. Owain the Dragonless.', { emote: 'dots' }]] });
EV('galeron', { realm: 'player', priority: 30, stage: 'road', cast: ['galeron', 'ruler'], lines: [
  ['galeron', 'I have ridden every road in Forseason looking for a cause worth a sword.'],
  ['ruler', 'And have you found one?'],
  ['galeron', 'Yours will do. It is the only one I have heard that ends with the Wheel still turning.']] });
EV('ettard', { realm: 'player', priority: 30, stage: 'road', cast: ['ettard', 'ruler'], lines: [
  ['ettard', 'Hold still. That cut has festered, and your physicians tie a knot like a drunk sailor.'],
  ['ruler', 'Who are you?'],
  ['ettard', "Sister Ettard. I go where the wounded are, and they are with you. Don't thank me. Just bleed less."]] });
EV('blanchefleur', { realm: 'player', priority: 30, stage: 'road', cast: ['blanchefleur', 'ruler'], lines: [
  ['blanchefleur', "Your knight was outnumbered on the road. I evened the count. That's a day's pay."],
  ['ruler', 'And tomorrow?'],
  ['blanchefleur', "Tomorrow's another day's pay. Coin first, my liege. Then I'm yours, all the way to Meridian."]] });
EV('blanchefleur_hire', { realm: 'player', priority: 40, stage: 'road', cast: ['blanchefleur', 'ruler'], lines: [
  NARR('The Lammas Fair. Between the jugglers and the cattle pens, a sellsword sits sharpening arrows.'),
  ['blanchefleur', "One hundred and fifty, and I don't fight children."],
  ['ruler', 'A steep price.'],
  ['blanchefleur', 'Cheaper than losing.']],
  choices: [{ text: 'Pay 150 mana', effects: [{ pay: 150 }, { addKnight: 'blanchefleur' }] }, { text: 'Refuse', effects: [] }] });
EV('stillness', { realm: 'world', priority: 70, stage: 'clock', cast: ['graynight', 'meliant'], lines: [
  ['graynight', 'Listen, Chancellor. A castle has stopped breathing.'],
  ['meliant', 'Stopped?'],
  ['graynight', 'For a season, nothing there will grow, or move, or march. A taste of what is coming.', { emote: 'dots' }]] });
EV('thirteenth_warning', { realm: 'world', priority: 80, stage: 'road', cast: ['herald'], lines: [
  ['herald', '{c=#ff5a4a}One season remains.{/c} {w=.3}The Hour-Candle gutters in Meridian.'],
  ['herald', 'If the Gray Knight stands when it is ash, the Thirteenth Month begins, and never ends.']] });
EV('meridian_falls', { realm: 'player', priority: 100, urgent: true, stage: 'clock', cast: ['meliant', 'graynight', 'ruler', 'lunete'], effects: [{ startSanctum: true }], lines: [
  ['meliant', 'So it is done. {w=.5}Forgive me, Keeper. I only wanted the clocks to stop.', { pose: 'kneel' }],
  ['graynight', 'And they shall, Chancellor. You were a key, nothing more. A stopped city is only a seed.'],
  ['ruler', { gareth: 'Who are you?', morgause: 'Name yourself, before I burn the name off your tomb.', pellam: '...Who?', mordrain: 'A riddle for you: who are you?' }],
  ['graynight', 'The month that never was. The hour between hours. Every season you ever lost belongs to me.'],
  ['graynight', 'Come down into the Sanctum, little crown. Let us see whether your Wheel still turns.'],
  ['lunete', { lunete: "My father's clock is not yours to break. Stand on the dials with me, and we will turn it together.", other: 'The dials, my liege. The old tales say the Wheel answers four seasons together.' }]] });
EV('sanctum_retry', { realm: 'player', priority: 90, stage: 'clock', cast: ['graynight', 'ruler'], lines: [
  ['graynight', 'The Wheel trembles, but it holds. {w=.3}Come again, little crown, if your candle allows.'],
  ['ruler', 'We will. March on the Sanctum again from Meridian, and light all four dials.']] });
EV('rival_meridian', { realm: 'world', priority: 85, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'Grave news, my liege. A rival crown has taken Meridian.'],
  ['herald', 'If they defeat the Gray Knight, they will set the Wheel to their own season, forever.']] });
EV('rival_failed', { realm: 'world', priority: 85, stage: 'road', cast: ['herald'], lines: [
  ['herald', 'The rival crown went down into the Sanctum, and the Gray Knight threw them back.'],
  ['herald', 'Meridian belongs to the Hour once more, with a fresh garrison. The road is still open to us.']] });
for (const [r, line] of [['verdance', 'Forgive me, Mother.'], ['solmark', 'Even suns set.'], ['amberlyn', '...Enough.'], ['hoarfast', 'Ice melts. Who knew?']]) {
  EV('realm_falls_' + r, { realm: 'world', priority: 60, stage: 'road', cast: [G.RULER[r], 'herald'], lines: [
    ['herald', G.get('realm', r).name + ' has fallen. Its last castle is taken; its knights are scattered on the roads.'],
    [G.RULER[r], line, { pose: 'kneel', expr: 'wince' }]] });
}

/* ---- Verdance ---- */
EV('v_pelleas_letter', { when: 'tidings', realm: 'verdance', priority: 50, stage: 'orchard', if: c => c.season === 'summer' && c.year === 1 && c.holds('pelleas'), cast: ['pelleas', 'gareth', 'lynette'], lines: [
  ['pelleas', 'My prince, I have written to Captain Elidure of Goldspur. We met at the last Concord. She laughed at my sonnet.'],
  ['lynette', 'Everyone laughed at your sonnet.'],
  ['pelleas', 'She laughed {c=#f4b8d0}kindly{/c}. If she would ride with us, Solmark would lose its best bow.', { emote: 'heart' }],
  ['gareth', 'It is your letter, Sir Pelleas. Shall we send it?']],
  choices: [{ text: 'Let him send it', effects: [{ flag: 'v_letter' }] }, { text: 'Burn the letter', effects: [] }] });
EV('v_elidure_joins', { realm: 'verdance', priority: 45, stage: 'tent', cast: ['elidure', 'pelleas', 'gareth'], effects: [{ moveKnight: ['elidure', 'verdance', null] }], lines: [
  ['elidure', 'Your poetry is dreadful, Sir Pelleas. Your cause is not.'],
  ['pelleas', 'Then you read it! All of it?', { emote: '!' }],
  ['elidure', 'Twice. {w=.3}My prince, my bow is yours, for the Wheel and not for Solmark.'],
  ['gareth', 'Welcome to Verdance, Captain.']] });
EV('v_unicorn_herd', { when: 'tidings', realm: 'verdance', priority: 30, stage: 'stable', if: c => c.season === 'autumn' && c.year === 1 && c.owns('thornwick') && c.holds('wren'), cast: ['wren', 'gareth'], effects: [{ addMonster: ['unicorn', 5, 'capital'] }, { addItem: 'springseed' }], lines: [
  NARR('The Briar Maze at dusk. A herd of unicorns stands in the last light.'),
  ['wren', 'They came back. One of them wants to follow us.'],
  ['gareth', 'Then let it. And take this, Wren: a seed from the orchard. Let it grow strong.']] });
EV('v_green_oath', { realm: 'verdance', priority: 50, stage: 'tent', cast: ['gareth', 'lynette'], effects: [{ bond: ['gareth', 2] }, { learn: ['gareth', 'verdanttempest'] }], lines: [
  ['gareth', 'The first of the Hour castles. I swear it here, on this stolen ground: I will wake the Keeper.', { pose: 'cheer' }],
  ['lynette', 'Then I swear to keep you alive long enough to do it.'],
  NARR("Gareth's Bond grows by 2. He learns {c=#9ad86a}Verdant Tempest{/c}.")] });
EV('v_amris_past', { when: 'tidings', realm: 'verdance', priority: 40, stage: 'orchard', if: c => c.season === 'winter' && c.year === 2 && c.holds('amris'), cast: ['amris', 'gareth'], lines: [
  ['amris', 'My prince, I was not always a monk. Forty winters ago I was a knight of Hoarfast.'],
  ['amris', 'The Duke was a boy then. I taught him his letters. I could write to him.'],
  ['gareth', 'Would he listen?']],
  choices: [{ text: 'Write to the Duke', effects: [{ aiPeace: ['hoarfast', 'verdance', 2] }], lines: [['amris', 'He will remember. Hoarfast will not march on us for a time.']] },
    { text: 'Keep silent', effects: [] }] });

/* ---- Solmark ---- */
EV('s_hesper_offer', { when: 'tidings', realm: 'solmark', priority: 50, stage: 'sunhall', if: c => c.season === 'autumn' && c.year === 1 && c.holds('hesper'), cast: ['hesper', 'morgause'], lines: [
  ['hesper', 'Majesty, I have studied the Hour. Its beasts could be summoned at Lionsreach, if you would allow it.'],
  ['morgause', 'Minutes and stillwraiths, in my own court?'],
  ['hesper', 'A sword is a sword, Majesty. It does not ask whose hand holds it.']],
  choices: [{ text: 'Accept the Hour', effects: [{ flag: 'hesper_circle' }, { flag: 'hesper_accepted' }] }, { text: 'Refuse her', effects: [{ levelUp: ['hesper', 2] }], lines: [['hesper', 'As you wish. I shall study harder, then.']] }] });
EV('s_hesper_betrays', { when: 'tidings', realm: 'solmark', priority: 60, stage: 'sunhall', if: c => c.season === 'summer' && c.year === 3 && c.flag('hesper_accepted') && c.holds('hesper'), cast: ['hesper', 'morgause'], effects: [{ hesperDefects: true }], lines: [
  ['hesper', 'Time was always the better master, Majesty.'],
  ['morgause', 'Hesper. {w=.3}{shake}Seize her!{/shake}', { expr: 'shout' }],
  NARR('Hesper and her troop vanish through a door that was not there a moment before.')] });
EV('s_wyvern_eggs', { when: 'tidings', realm: 'solmark', priority: 30, stage: 'stable', if: c => c.season === 'spring' && c.year === 2 && c.owns('goldspur') && c.holds('brennoc'), cast: ['brennoc', 'morgause'], effects: [{ addMonster: ['wyvern', 5, 'capital'] }, { addItem: 'summerember' }], lines: [
  ['brennoc', 'Eggs, Majesty. From the Roost at Goldspur. One hatched this morning, and bit me.', { expr: 'smile' }],
  ['morgause', 'Then it is a Solmarker already. Raise it well, old man.']] });
EV('s_agravain_duel', { realm: 'solmark', priority: 40, stage: 'tent', cast: ['agravain', 'ragnell'], lines: [
  ['agravain', 'Ice-Eye! I challenge you, here, before your troops and mine!', { expr: 'shout' }],
  ['ragnell', 'Then come and lose in front of them, Cinderjaw.'],
  NARR('Agravain fights the first bell with {c=#ff5a4a}Valor{/c}.')] });

/* ---- Amberlyn ---- */
EV('a_dagonet_jest', { when: 'tidings', realm: 'amberlyn', priority: 30, stage: 'harvesthall', if: c => c.season === 'summer' && c.year === 1 && c.holds('dagonet'), cast: ['dagonet', 'enid'], effects: [{ addItem: 'signet' }], lines: [
  ['dagonet', 'My lady! I put a frog in the new steward\'s boot, and he screamed in Hourspeech!', { emote: '!' }],
  ['enid', 'A spy? In our own hall?'],
  ['dagonet', 'A spy with a frog in his boot. He dropped this: a Signet of Command. Finders keepers.']] });
EV('a_kings_cough', { when: 'tidings', realm: 'amberlyn', priority: 50, stage: 'harvesthall', if: c => c.season === 'winter' && c.year === 1 && c.holds('enid'), cast: ['pellam', 'enid'], lines: [
  NARR('The king\'s bedchamber, late at night.'),
  ['pellam', '{w=.5}...Enid.', { expr: 'wince' }],
  ['enid', 'Father, the physicians say the cough will pass.'],
  ['pellam', 'It will not. {w=.4}Shall I name you heir?']],
  choices: [{ text: 'Name her heir now', effects: [{ levelUp: ['enid', 3] }, { learn: ['enid', 'renewal'] }], lines: [['enid', 'Then I will carry it, Father. Rest.']] }, { text: 'Wait', effects: [] }] });
EV('a_lanterns', { when: 'tidings', realm: 'amberlyn', priority: 30, stage: 'road', if: c => c.season === 'autumn' && c.year === 2 && c.holds('vesna'), cast: ['vesna', 'pellam'], effects: [{ addMonster: ['jacklamp', 6, 'capital'] }, { addMonster: ['jacklamp', 6, 'capital'] }, { addItem: 'autumnacorn' }], lines: [
  NARR('All-Hallows on the Lantern Road. Vesna lights a lantern for every grave.'),
  ['vesna', 'The dead are quieter tonight, Majesty. Two of the lanterns asked to follow us.'],
  ['pellam', '...Let them.']] });
EV('a_lamorak_stand', { realm: 'amberlyn', priority: 40, stage: 'tent', cast: ['lamorak', 'pellam'], lines: [
  ['lamorak', 'Ashbarrow is my home, Majesty. I was born under those walls. They will not pass.', { pose: 'cheer' }],
  NARR('Lamorak is {c=#4aa0ff}Warded{/c} for the first two bells.')] });

/* ---- Hoarfast ---- */
EV('w_nimue_bargain', { when: 'tidings', realm: 'hoarfast', priority: 50, stage: 'icehall', if: c => c.season === 'summer' && c.year === 1 && c.holds('nimue'), cast: ['nimue', 'mordrain'], lines: [
  ['nimue', 'Duke, the mere has given me an egg. A frost wyrm\'s. It wants a price.'],
  ['mordrain', 'Everything does. What price?'],
  ['nimue', 'A memory. One name you love. The mere keeps it, and you forget.']],
  choices: [{ text: 'Accept the bargain', effects: [{ addMonster: ['frostwyrm', 4, 'capital'] }, { flag: 'mordrain_forgot' }], lines: [['mordrain', '...There. Done. Whose name was it? {w=.4}Never mind. Never mind.', { expr: 'wince' }]] },
    { text: 'Refuse', effects: [{ levelUp: ['nimue', 1] }], lines: [['nimue', 'Wise. The mere will ask again.']] }] });
EV('w_gorm_cub', { when: 'tidings', realm: 'hoarfast', priority: 30, stage: 'stable', if: c => c.season === 'autumn' && c.year === 1 && c.holds('gorm'), cast: ['gorm', 'mordrain'], effects: [{ addMonster: ['yeti', 5, 'capital'] }], lines: [
  ['gorm', 'My little one came home. Lost since the Clock went sick. She found me.', { expr: 'smile', emote: 'heart' }],
  ['mordrain', 'A riddle, Gorm: what is white and heavy and follows you everywhere?'],
  ['gorm', 'Her. Now.']] });
EV('w_ragnell_doubt', { when: 'tidings', realm: 'hoarfast', priority: 50, stage: 'icehall', if: c => c.season === 'winter' && c.year === 2 && c.holds('ragnell'), cast: ['ragnell', 'mordrain'], lines: [
  NARR('The battlements of Rimeholt, at night.'),
  ['ragnell', 'Do I follow a madman? {w=.4}Some nights I cannot tell.'],
  ['mordrain', 'Nor can I, Ragnell. That is why I keep you.']],
  choices: [{ text: 'Trust him', effects: [{ levelUp: ['ragnell', 2] }] }, { text: 'Watch him', effects: [{ giveItemTo: ['ragnell', 'wardingcharm'] }] }] });
EV('w_lucid_hour', { realm: 'hoarfast', priority: 50, stage: 'icehall', cast: ['mordrain', 'ragnell'], effects: [{ flag: 'lucid' }], lines: [
  ['mordrain', 'Ragnell. {w=.5}My sister drowned in the lake beneath Rimeholt, the winter I was twelve.'],
  ['mordrain', 'If winter never ends, the lake never thaws. And it never gives her back.'],
  ['ragnell', '...Your Grace.'],
  ['mordrain', 'I know what I am doing now. I think I always did.'],
  NARR('Mad Gambit will never misfire again.')] });

/* ---- endings ---- */
const ending = (realm, title, lines, epi) => EV('ending_' + realm, { realm, priority: 100, stage: 'clock', ending: true, title, cast: [G.RULER[realm], 'graynight', 'keeper', 'lunete'], lines, epilogue: epi });
ending('verdance', 'The Wheel Turns Again', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Then turn, little Wheel. Turn, and lose everything again. I will wait between the seconds.'],
  NARR('The Great Clock shuddered, and its hands moved on.'),
  ['keeper', 'Spring... I dreamed of spring. Thank you, child of the Bough.'],
  ['gareth', 'Rest now, Keeper. The Wheel is in good hands.'],
  NARR('In Avalorn, the oldest apple blossomed that very morning.')], 'verdance');
ending('solmark', 'The Long Noon Ends', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'You could have kept the noon forever. Why let it go?'],
  ['morgause', 'Even the sun must set, or it is only a fire.'],
  NARR('The Great Clock shuddered, and its hands moved on.'),
  ['keeper', 'Summer... and then autumn, as it should be. Thank you, Queen of the Furnace.'],
  NARR('Brazenhold held a festival that lasted until the first frost.')], 'solmark');
ending('amberlyn', 'The Last Harvest', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Speak, old king. You have so few words left.'],
  ['pellam', '{w=.6}Turn.'],
  NARR('The Great Clock shuddered, and its hands moved on. King Pellam did not rise again.'),
  ['keeper', 'He gave the Wheel his last word. It will remember him.'],
  NARR('Lady Enid was crowned in Ambergate when the harvest came in.')], 'amberlyn');
ending('hoarfast', 'Spring Thaw', [
  NARR('The thirteenth bell never rang.'),
  ['graynight', 'Eternal winter was yours for the taking, Duke. Nothing would ever rot.'],
  ['mordrain', 'Let the ice go, Ragnell. {w=.4}Let her go.'],
  NARR('The Great Clock shuddered, and its hands moved on. Under Rimeholt, the lake began to thaw.'),
  ['keeper', 'Winter ends. That is its kindness. Thank you, Duke of the Frost.']], 'hoarfast');
EV('ending_candle', { realm: 'world', priority: 100, stage: 'clock', ending: true, bad: true, title: 'THE LEGEND ENDS IN SILENCE', cast: ['graynight'], lines: [
  NARR('The Hour-Candle gutters, and goes out.'),
  ['graynight', 'Hush now. Nothing will ever end again.'],
  NARR('The Thirteenth Month begins. It does not end.')] });
for (const [r, word, line] of [['verdance', 'FLOOD', 'Spring forever. Let it rain, and rain, and rain.'], ['solmark', 'FIRE', 'Summer forever. Let it burn bright and never cool.'], ['amberlyn', 'DUST', '...Autumn. Forever.'], ['hoarfast', 'ICE', 'Winter forever! Nothing rots! Nothing ends!']])
  EV('ending_wheel_' + r, { realm: 'world', priority: 100, stage: 'clock', ending: true, bad: true, title: 'THE LEGEND ENDS IN ' + word, cast: [G.RULER[r]], lines: [
    NARR('A rival crown descends into the Sanctum, and the Gray Knight falls before it.'),
    [G.RULER[r], line, { pose: 'cheer' }],
    NARR('The Wheel is set, and stops. The land drowns in ' + word.toLowerCase() + '.')] });
EV('ending_fallen', { realm: 'world', priority: 100, stage: 'road', ending: true, bad: true, title: 'THE LEGEND FORGETS YOU', cast: ['ruler'], lines: [
  NARR('Your last castle has fallen. Your banner lies in the mud of a cross-quarter road.'),
  ['ruler', 'There were so many seasons left. {w=.4}Were there not?', { pose: 'kneel', expr: 'wince' }],
  NARR('The chroniclers write other names now.')] });

/* ---- epilogue cards: one per surviving named knight (2 lines each) ---- */
G.EPILOGUES = {
  lynette: 'Dame Lynette kept the Concord\'s peace for forty years, and never once admitted she enjoyed it.',
  pelleas: c => c.flags.v_letter && c.holds('elidure') ? 'Sir Pelleas wrote four hundred verses about the Sanctum. Captain Elidure read none of them, and married him anyway.' : 'Sir Pelleas wrote four hundred verses about the Sanctum. Some of them rhymed.',
  amris: 'Brother Amris planted a new orchard in Hoarfast, and the Duke came to see it bloom.',
  wren: 'Wren went back to the unicorns. They say she talks to them more than to people. They answer.',
  morgause: 'Queen Morgause never lost another war. She never started one, either.',
  agravain: 'Sir Agravain challenged Dame Ragnell to a rematch every Midsummer. He never won.',
  elidure: 'Captain Elidure trained a generation of archers who could split a falling leaf.',
  brennoc: "Old Brennoc's wyverns flew again. He wept, and blamed the smoke.",
  hesper: 'Magus Hesper Vey burned her books on the Hour. Most of them.',
  enid: 'Lady Enid ruled Amberlyn with a gentle, firm and practical hand.',
  dagonet: 'Sir Dagonet became the most famous jester in Forseason. He was never afraid again. Mostly.',
  vesna: 'Vesna kept the Lantern Road lit, and the dead slept soundly.',
  lamorak: 'Sir Lamorak retired to Ashbarrow, and guarded its walls from a rocking chair.',
  ragnell: 'Dame Ragnell brought the sense to Hoarfast for another thirty years.',
  safir: 'Sir Safir the Pale smiled, once, at a spring thaw. Witnesses disagree on the details.',
  nimue: 'Nimue returned to her mere. Its bargains grew kinder.',
  gorm: 'Gorm the Bear and his yeti were the gentlest giants in the north.',
  owain: 'Owain the Dragonless was given a new name: Owain of the Wings.',
  galeron: 'Sir Galeron stopped wandering. He had found his cause.',
  blanchefleur: 'Blanchefleur the Sellsword retired rich, and never told anyone how rich.',
  ettard: 'Sister Ettard founded a hospital in Meridian. Its physicians tied excellent knots.',
  hob: 'Hob Mudspur became a respectable toll-keeper. His boots were always new.',
  gerrow: "Mother Gerrow's mill turned again, and fed half the province.",
  dafydd: 'Red Dafydd shouted at every festival in Forseason, invited or not.',
  abbot: 'The Hollow Abbot rang the abbey bells again, and the dead rested at last.',
  lunete: c => 'Lunete was crowned Keeper of the Wheel. ' + ({ verdance: 'Gareth', solmark: 'Morgause', amberlyn: 'Enid', hoarfast: 'Mordrain' }[c.realm]) + ' knelt first.'
};
G.EPILOGUE_NO_LUNETE = { verdance: 'Gareth wound the Great Clock each midwinter until a new Keeper was found.', solmark: 'Morgause wound the Great Clock each midsummer until a new Keeper was found.', amberlyn: 'Enid wound the Great Clock each harvest until a new Keeper was found.', hoarfast: 'Mordrain wound the Great Clock each midwinter, and never once forgot.' };

/* ---- rival lines: 2 lines before a battle when both are on the field (the first match plays) ---- */
G.RIVALS = [
  ['agravain', 'ragnell', "Ice-Eye! I've waited all summer to melt you.", "Then you'll wait all winter to stand back up."],
  ['pelleas', 'elidure', 'Captain! Did you read my letter?', "I'm reading your formation, Sir Pelleas. It's worse."],
  ['gareth', 'morgause', "The Wheel isn't yours to take, Your Majesty.", 'Then come and stop me, princeling. Bring your blossoms.'],
  ['mordrain', 'pellam', 'The Quiet King! Say something, old man!', '...No.'],
  ['lynette', 'agravain', 'Cinderjaw. Still shouting?', 'Still standing in my way?'],
  ['dagonet', 'hob', 'A brigand with a funny name! Finally, a rival.', 'Oi! Mudspur is a proud name!'],
  ['morgause', 'pellam', 'Step aside, old king. Summer has no patience for harvests.', '...Patience.'],
  ['mordrain', 'gareth', 'Little sprout! Do you know why snow is so quiet?', "Because it's waiting for spring."],
  ['meliant', 'lunete', 'Princess... you should be asleep beside your father.', 'Somebody has to stay awake, Chancellor.'],
  ['bertilak', '*', 'Courtesy first: I shall kill you slowly, and with every respect.', null],
  ['tic', '*', 'Tic says—', '—Tac agrees!', 'tac'],
  ['aurelie', '*', 'Must you? I was enjoying the silence.', null],
  ['graynight', '*', 'Twelve bells, little crown. Then nothing, ever again.', null]
];
/** the rival exchange for a battle's knights (refs on each side), or null */
G.rivalLine = (a, b) => {
  for (const [x, y, l1, l2, z] of G.RIVALS) {
    const has = (list, id) => id === '*' ? list.length > 0 : list.includes(id);
    if (has(a, x) && has(b, y) || has(b, x) && has(a, y)) return [[x, l1], l2 ? [z || (y === '*' ? x : y), l2] : null].filter(Boolean);
  }
  return null;
};

/* ---- quest vignettes ({$knight}, {$site}, {$thing}) ---- */
G.VIGNETTES = {
  treasure: ['{$knight} returns from {$site} with dust on the boots and a {$thing} wrapped in a cloak.', '{$knight} comes back from {$site} with thorns in the hair and a {$thing} in hand.', 'Under an old stone at {$site}, {$knight} found a {$thing}. Nobody else had looked there in a century.'],
  beast: ['A {$thing} followed {$knight} home from {$site}. It will not leave.', '{$knight} bargained with a {$thing} at {$site}. The bargain was a long scratch behind the ears.', 'At {$site}, a wild {$thing} challenged {$knight}, lost, and decided to stay.'],
  wanderer: ['On the road from {$site}, {$knight} met {$thing}, who asked to ride with you.', '{$knight} returns from {$site} with company: {$thing}, sword and all.', 'At {$site}, {$knight} shared a fire with {$thing}. By morning they were sworn to the same banner.'],
  mana: ['{$knight} drew a spring of mana from {$site}: {$thing} for the treasury.', 'The old wards of {$site} gave up their power to {$knight}: {$thing}.', '{$knight} returns from {$site} with {$thing}, humming like a struck bell.'],
  training: ['{$knight} trained hard at {$site}, and the troop with them. They return sharper.', 'A season at {$site} taught {$knight} more than a year at court.', '{$knight} and the troop drilled at {$site} until the ground was bare. It shows.'],
  mishap: ["{$knight}'s patrol was ambushed at {$site}. They will mend.", '{$knight} fell from a cliff at {$site}. Nothing broken that will not heal.', 'At {$site}, {$knight} met something old and angry. {$knight} came back. Barely.'],
  mishapLoss: ["{$knight}'s patrol was ambushed at {$site}. {$knight} will mend; the {$thing} will not.", 'The ice gave way at {$site}. {$knight} was pulled out. The {$thing} was not.', 'At {$site}, {$knight} lost the {$thing} to something in the dark.'],
  keeper: 'In the Sleeping Court, the Keeper lies between two seconds, his lips moving on a word no one can hear.'
};

/* ---- before a battle: events that change the field ---- */
G.beforeBattle = (sim, p) => {
  const out = [], s = sim.s; if (!p || p.kind !== 'battle') return out;
  const att = p.march.knights, def = p.defenders || [];
  if (sim.isHuman('solmark') && !s.seen['s_agravain_duel@solmark'] && (att.includes('agravain') && def.includes('ragnell') || def.includes('agravain') && att.includes('ragnell'))) out.push({ id: 's_agravain_duel', realm: 'solmark', fx: { agravain: { valor: 1 } } });
  if (sim.isHuman('amberlyn') && !s.seen['a_lamorak_stand@amberlyn'] && p.castle === 'ashbarrow' && def.includes('lamorak')) out.push({ id: 'a_lamorak_stand', realm: 'amberlyn', fx: { lamorak: { warded: 2 } } });
  for (const o of out) s.seen[o.id + '@' + o.realm] = s.turn;
  return out;
};
