/* THE STORY (section 7.3): the cup's rounds and beats, team talks, Gaffer's Challenges and the sticker album (7.5).
 * Tone: British football broadcasting and tabloid back pages, turned up; affectionate, never mean. */
EF.CUP = {
  name: 'THE EUROPHORIA CUP',
  rounds: [
    { id: 'r1', name: 'QUALIFYING ROUND', short: 'QUALIFIER', opp: 'hoofington', stadium: 'smokehouse', referee: 'haltwhistle', challenge: 'header', home: true, city: 'kipperton' },
    { id: 'r2', name: 'ROUND OF 16', short: 'LAST 16', opp: 'pasapasa', stadium: 'pasapasa', referee: 'patience', challenge: 'recover5', city: 'solera' },
    { id: 'r3', name: 'QUARTER-FINAL', short: 'QUARTERS', opp: 'stahlpresse', stadium: 'stahlpresse', referee: 'ironside', challenge: 'nutmeg', city: 'eisenhutte' },
    { id: 'r4', name: 'SEMI-FINAL', short: 'SEMIS', opp: 'lucchetto', stadium: 'lucchetto', referee: 'severo', challenge: 'freekickGoal', city: 'castelfortezza' },
    { id: 'r5', name: 'FINAL', short: 'FINAL', opp: 'opulence', stadium: 'euphorium', referee: 'haltwhistle', challenge: 'superGoal', city: 'aurelia' }
  ],
  // the map of a fictional Europe: cities in map units (0..1)
  cities: { kipperton: [.32, .2, 'KIPPERTON'], solera: [.22, .78, 'SOLERA'], eisenhutte: [.62, .36, 'EISENHUTTE'], castelfortezza: [.56, .7, 'CASTELFORTEZZA'], aurelia: [.42, .5, 'AURELIA'] }
};
const TAB = (headline, sub, body, photo) => ({ kind: 'tabloid', headline, sub, body, photo });
const TALK = (lines, o = {}) => Object.assign({ kind: 'talk', lines }, o);
EF.def('beat', 'prologue', { steps: [
  TAB('FISH OUT OF WATER!', "Typo sends tiny Kipperton into the Europhoria Cup. 'Rules are rules,' shrugs the Federation.", 'Population 3,112. Floodlights powered by fish oil. Fourteen pounds in the kitty. Europe, brace yourselves.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'smile' }),
  TALK([['clerk', 'Dear Kingsbridge Albion. Oh. No. Dear... Kipperton Athletic. You are invited to the Europhoria Cup.'], ['clerk', 'An invitation is an invitation. Those are the rules. Please do not tell anyone.']], { place: 'the Federation' }),
  TALK([['mags', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['pilchard', 'Gaffer, do they have chips in Europe?'], ['mags', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['okafor', "Let 'em try. I've got an appetite and all."], ['mags', "That's the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up. Literally."]],
    { place: 'the Smokehouse', choices: ["LET'S PLAY", 'TRAINING FIRST'], sticker: 'mags' })
] });
EF.def('beat', 'r1-pre', { round: 0, steps: [
  TAB('THE LONG AND THE SHORT OF IT', "Hoofington's aerial bombardment heads for Kipperton's puddles.", 'The Hoofers have not completed a pass along the ground since 1994. They have never needed to.', { team: 'hoofington', player: 'needham', pose: 'hips', expr: 'angry' }),
  TALK([['needham', "We don't pass, love. We 'oof."], ['mags', 'Then we keep it on the floor, where they cannot reach it. Short passes, quick feet.']]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r1-win', { steps: [TAB('KIP KIP HOORAY!', 'Kippers net a famous win in the Smokehouse rain.', 'Fans danced on the harbour wall until the tide came in.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'shout' }), TALK([['mags', 'Not bad. Not good. But not bad.'], ['trev', 'A proper cold night, and they have warmed it up.']])] });
EF.def('beat', 'r1-loss', { steps: [TAB('BATTERED!', 'Kipperton sunk by the Hoofington long ball.', 'The fish-oil floodlights were switched off early to save money.', { team: 'hoofington', player: 'needham', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r2-pre', { round: 1, steps: [
  { kind: 'travel', from: 'kipperton', to: 'solera', postcard: "WISH YOU WERE HERE (IT'S HOT)" },
  TAB('PASS THE PARCEL', 'Kippers must stop the passing masters... if they can find the ball.', 'Real Pasapasa completed 1,204 passes in their last match. Their opponents completed a crossword.', { team: 'pasapasa', player: 'pasarela', pose: 'hips', expr: 'smile' }),
  TALK([['pasarela', 'You will chase the ball until you are dizzy, little fishes.'], ['okafor', "I've chased gulls off a chip van in a gale. I can chase a ball."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r2-win', { steps: [TAB('SOLE-DESTROYING FOR SOLERA!', 'Kippers pinch the ball and the points in the sunshine.', 'Real Pasapasa fans waved their handkerchiefs. Some in surrender.', { team: 'kipperton', player: 'nowak', pose: 'cheer', expr: 'smile' }), TALK([['nowak', 'I counted. They made 412 passes.'], ['mags', "And we made two goals. Football's a funny old game."]])] });
EF.def('beat', 'r2-loss', { steps: [TAB('PASSED OUT', 'Kippers left dizzy by the passing masters.', 'Several Kipperton players are still looking for the ball.', { team: 'pasapasa', player: 'pasarela', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r3-pre', { round: 2, steps: [
  { kind: 'travel', from: 'solera', to: 'eisenhutte', postcard: 'SNOW CHAINS FITTED (TWO OF THEM)', snow: true },
  TAB('PRESSED FOR TIME', "The Steel Machine never stops running. Kipperton's bus barely starts.", 'SV Stahlpresse 04 train by running up a mountain. Twice. Before breakfast.', { team: 'stahlpresse', player: 'hammerschmidt', pose: 'guard', expr: 'angry' }),
  TALK([['hammerschmidt', 'We run. You run. We run more.'], ['tran', "Then I'll just have to run round you, big man."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r3-win', { steps: [TAB('KIPPERS MELT THE STEEL!', 'Fish-oil fire burns through the snow.', 'Even the Steel Stag was seen applauding. Then he was escorted out.', { team: 'kipperton', player: 'tran', pose: 'cheer', expr: 'shout' }), TALK([['tran', 'Did you see his face when it went through his legs?'], ['okafor', 'Did you see mine? Frozen solid.']])] });
EF.def('beat', 'r3-loss', { steps: [TAB('CRUSHED', 'The Steel Machine presses Kipperton flat.', 'The minibus has been towed home. So has the team.', { team: 'stahlpresse', player: 'hammerschmidt', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r4-pre', { round: 3, steps: [
  { kind: 'travel', from: 'eisenhutte', to: 'castelfortezza', postcard: 'THE PASTA IS INCREDIBLE. SEND HELP.' },
  TAB('PADLOCK AND KEY', "Can Kipperton crack Europe's meanest defence? Locksmiths on standby.", 'AC Lucchetto have not conceded at home since the invention of the padlock.', { team: 'lucchetto', player: 'serratura', pose: 'hips', expr: 'smile' }),
  TALK([['serratura', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['mags', "They'll dive, they'll moan, and if they go ahead they'll park the bus. Don't fall for any of it."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r4-win', { steps: [TAB('THEY PARKED THE BUS - WE STOLE IT!', 'Kippers pick the lock and drive off into the final.', 'Castelfortezza locksmiths report record business.', { team: 'kipperton', player: 'okafor', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r4-loss', { steps: [TAB('LOCKED OUT', 'Lucchetto throw away the key on Kipperton.', 'The bus is still parked there. Nobody dares move it.', { team: 'lucchetto', player: 'fallo', pose: 'cheer', expr: 'smile' })] });
EF.def('beat', 'villain', { steps: [
  TALK([['baron', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.'], ['pilchard', 'All of it?'], ['baron', 'All of it. Sign for Opulence, and the final... well. Who needs a final?']],
    { place: 'a hotel lobby, night', choices: ["I'M A KIPPER, MATE. ALWAYS.", '...DOES THE JET SKI COME IN ORANGE?'], villain: true })
] });
EF.def('beat', 'villain-loyal', { steps: [TALK([['pilchard', "I'm a Kipper, mate. Always. Keep your jet ski."], ['baron', 'You will regret this, little fish.'], ['mags', 'He will not. Get to bed, Darren.']])] });
EF.def('beat', 'villain-joke', { steps: [TALK([['pilchard', 'Only joking, Gaffer! Kipper till I die.'], ['mags', 'You nearly gave me a heart attack.'], ['baron', 'Hmph. We shall see who laughs at the final.']])] });
EF.def('beat', 'r5-pre', { round: 4, steps: [
  { kind: 'travel', from: 'castelfortezza', to: 'aurelia', postcard: 'THE STADIUM IS MADE OF GOLD. ACTUAL GOLD.' },
  TAB('DAVID VS GOLDIATH', 'Fish-oil floodlights meet the richest club on Earth.', "Olympique Opulence's keeper alone cost more than the town of Kipperton. Twice.", { team: 'opulence', player: 'dor', pose: 'hips', expr: 'smile' }),
  TALK([['dor', 'I have three Golden Boots. You have... boots.'], ['pilchard', "These boots have been in the family for years, mate."], ['mags', "This is it. Feed the crowd, look after the ball, and when the moment comes: hit it like a train."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r5-loss', { steps: [TAB('SO CLOSE!', 'Golden boys break Kipper hearts.', 'But Kipperton have never been prouder. Probably.', { team: 'opulence', player: 'dor', pose: 'cheer', expr: 'smile' })] });
EF.def('beat', 'ending', { steps: [TAB('THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', 'Typo club lifts the Europhoria Cup.', 'Kingsbridge Albion have demanded a recount.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'shout' })] });

/* team talks (section 7.3): Mags says one line of three for each */
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', desc: '+10% speed and tackling for 15 minutes. The ref gets stricter.', lines: ['Get out there and TERRIFY them!', 'I want to see fire! FIRE! Not the fish-oil kind!', 'If you lose, you are walking home. All of you.'], buff: { hairdryer: true } });
EF.def('teamtalk', 'arm', { name: 'ARM ROUND THE SHOULDER', desc: 'Stamina recovers 25% faster. Start with 15 Euphoria.', lines: ["Just enjoy it. Your mum's watching.", 'Whatever happens, I am proud of you. Now go and win.', 'Deep breaths. Smell that? That is Europe. And kippers.'], buff: { regen: 1.25 }, euphoria: 15 });
EF.def('teamtalk', 'tactics', { name: 'TACTICS BOARD', desc: 'Pick the formation. Passing +10% accuracy.', lines: ["Here's the plan.", 'Magnets on the board. Watch the magnets.', 'This is you. This is them. Do not be them.'], buff: { pass: 10 }, formation: true });

/* the Gaffer's Challenges (section 7.3): an optional objective per round; a shiny sticker; all five unlock Old Leather */
EF.def('challenge', 'header', { name: 'SCORE A HEADER', test: (ev, st) => ev.type === 'goal' && ev.goal && !ev.goal.own && (ev.goal.kind === 'header' || ev.goal.kind === 'divingHeader') && ev.side === st.side });
EF.def('challenge', 'recover5', { name: 'WIN THE BALL BACK 5 TIMES', test: (ev, st) => { if ((ev.type === 'tackleWon' || ev.type === 'intercept' || ev.type === 'recover') && ev.who && ev.who.side === st.side) st.n = (st.n || 0) + 1; return st.n >= 5; }, progress: st => (st.n || 0) + '/5' });
EF.def('challenge', 'nutmeg', { name: 'NUTMEG AN OPPONENT', test: (ev, st) => ev.type === 'nutmeg' && ev.who && ev.who.side === st.side });
EF.def('challenge', 'freekickGoal', { name: 'SCORE FROM A FREE KICK', test: (ev, st) => ev.type === 'goal' && ev.goal && ev.goal.freekick && ev.side === st.side });
EF.def('challenge', 'superGoal', { name: 'SCORE A SUPER STRIKE', test: (ev, st) => ev.type === 'goal' && ev.goal && ev.goal.super && ev.side === st.side });

/* the sticker album (section 7.5): 51 stickers */
for (const t of EF.TEAM_IDS) {
  const T = EF.get('team', t);
  for (const p of T.players) EF.def('sticker', 'p:' + t + ':' + p.id, { kind: 'player', team: t, ref: p.id, name: p.name, pos: p.pos, how: t === 'kipperton' ? 'A KIPPER FROM THE START' : 'PLAY ' + T.short + ' IN ANY MODE', page: t });
  EF.def('sticker', 'crest:' + t, { kind: 'crest', team: t, name: T.name, how: 'PLAY ' + T.short, page: t });
}
for (const s of EF.CUP_STADIUMS) { const S = EF.get('stadium', s); EF.def('sticker', 'stadium:' + s, { kind: 'stadium', ref: s, name: S.name, how: 'PLAY AT ' + S.name, page: 'stadiums' }); }
for (const c of EF.all('challenge')) EF.def('sticker', 'ch:' + c.id, { kind: 'challenge', ref: c.id, name: c.name, how: "THE GAFFER'S CHALLENGE", shiny: true, page: 'challenges' });
EF.def('sticker', 'mags', { kind: 'special', ref: 'mags', name: 'MAGS MULLIGAN', how: 'FINISH THE PROLOGUE', page: 'specials' });
EF.def('sticker', 'keith', { kind: 'special', ref: 'keith', name: 'KIPPER KEITH', how: 'TACKLE THE PITCH INVADER', page: 'specials' });
EF.def('sticker', 'barrytrev', { kind: 'special', ref: 'barry', name: 'BARRY AND TREV', how: 'HEAR 50 COMMENTARY LINES', page: 'specials' });
EF.def('sticker', 'bus', { kind: 'special', ref: 'bus', name: 'THE BUS', how: 'SCORE PAST THE PARKED BUS', page: 'specials' });
EF.def('sticker', 'loyal', { kind: 'special', ref: 'pilchard', name: 'LOYAL KIPPER', how: 'TURN DOWN THE BARON', page: 'specials' });
EF.ALBUM_PAGES = [...EF.TEAM_IDS.map(t => ({ id: t, title: EF.get('team', t).name })), { id: 'stadiums', title: 'STADIUMS' }, { id: 'challenges', title: "GAFFER'S CHALLENGES" }, { id: 'specials', title: 'SPECIALS' }];
/** stickers earned by a match: its teams' players and crests, its stadium, the bus, the invader */
EF.matchStickers = (m, r) => {
  const got = [];
  EF.quietStickers = true;
  for (const T of m.teams) { for (const p of T.players) if (EF.Save.sticker('p:' + T.id + ':' + p.id)) got.push('p:' + T.id + ':' + p.id); if (EF.Save.sticker('crest:' + T.id)) got.push('crest:' + T.id); }
  if (EF.get('sticker', 'stadium:' + m.stadium.id) && EF.Save.sticker('stadium:' + m.stadium.id)) got.push('stadium:' + m.stadium.id);
  if (m.goals.some(g => g.bus && !g.own) && EF.Save.sticker('bus')) got.push('bus');
  if (m.keithTackled && EF.Save.sticker('keith')) got.push('keith');
  EF.quietStickers = false;
  return got;
};
/* a round's beat again after CONTINUE: straight to the team talk */
for (let i = 1; i <= 5; i++) { const pre = EF.get('beat', 'r' + i + '-pre'); EF.def('beat', 'r' + i + '-pre-retry', { round: i - 1, steps: pre.steps.filter(s => ['teamtalk', 'challenge', 'tunnel', 'match'].includes(s.kind)) }); }
