/* 52-story: the Cup Run as data. The premise: a clerk at the Continental Federation typed KIPPERTON instead of
 * KINGSBRIDGE, and an invitation is an invitation. Five rounds, each with its beats (travel, tabloid, talk, team talk,
 * challenge, tunnel, match, result), the villain's offer before the final, and the Gaffer's Challenges. */
EF.ROUNDS = [
  { id: 'r1', name: 'QUALIFYING ROUND', opp: 'hoofington', stadium: 'smokehouse', referee: 'haltwhistle', challenge: 'header', city: 'kipperton',
    pre: { headline: 'THE LONG AND THE SHORT OF IT', sub: "Hoofington's aerial bombardment heads for Kipperton's puddles.", photo: 'needham' },
    talk: [['needham', "We don't pass, love. We 'oof."], ['mags', 'Heads up, all of you. Literally.']],
    win: { headline: 'KIP KIP HOORAY!', sub: 'Kippers through as Hoofington are left all at sea.' }, loss: { headline: 'BATTERED!', sub: 'Kipperton fried in their own chip pan.' },
    after: [['mags', 'Not bad. Not good. But not bad.'], ['trev', "A proper cold night, and they've warmed it up."]] },
  { id: 'r2', name: 'ROUND OF 16', opp: 'pasapasa', stadium: 'pasapasa', referee: 'patience', challenge: 'recover5', city: 'solera', postcard: "WISH YOU WERE HERE (IT'S HOT)",
    pre: { headline: 'PASS THE PARCEL', sub: 'Kippers must stop the passing masters... if they can find the ball.', photo: 'pasarela' },
    talk: [['pasarela', 'You will chase the ball until you are dizzy, little fishes.'], ['tran', 'Dizzy? I do forty step-overs before breakfast.']],
    win: { headline: 'SOLE-DESTROYING FOR SOLERA!', sub: 'The passing masters passed out.' }, loss: { headline: 'PASSED OUT', sub: 'Kippers spend ninety minutes chasing shadows.' },
    after: [['nowak', 'I counted. They made four hundred and twelve passes.'], ['mags', "And we made the goals. Football's a funny old game."]] },
  { id: 'r3', name: 'QUARTER-FINAL', opp: 'stahlpresse', stadium: 'stahlpresse', referee: 'ironside', challenge: 'nutmeg', city: 'eisenhutte', postcard: 'SNOW CHAINS ON. THREE OF THEM.',
    pre: { headline: 'PRESSED FOR TIME', sub: "The Steel Machine never stops running. Kipperton's bus barely starts.", photo: 'hammerschmidt' },
    talk: [['hammerschmidt', 'We run. You run. We run more.'], ['okafor', 'Run all you like, pet. You still have to get past me.']],
    win: { headline: 'KIPPERS MELT THE STEEL!', sub: 'Snowbound minnows hammer the hammers.' }, loss: { headline: 'CRUSHED', sub: 'Pressed flat in the Eisenhutte snow.' },
    after: [['tran', 'Did you see his face when it went through his legs?'], ['okafor', 'Did you see mine? Frozen solid.']] },
  { id: 'r4', name: 'SEMI-FINAL', opp: 'lucchetto', stadium: 'lucchetto', referee: 'severo', challenge: 'freekick', city: 'castelfortezza', postcard: 'THE CASTLE HAS SEVEN LOCKS. WE COUNTED.',
    pre: { headline: 'PADLOCK AND KEY', sub: "Can Kipperton crack Europe's meanest defence? Locksmiths on standby.", photo: 'serratura' },
    talk: [['serratura', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['mags', "They'll dive, they'll moan, and if they go ahead they'll park the bus. Don't fall for any of it."]],
    win: { headline: 'THEY PARKED THE BUS - WE STOLE IT!', sub: 'Padlocks picked. Kippers in the final.' }, loss: { headline: 'LOCKED OUT', sub: 'Catenaccio clamps the Kippers.' },
    after: [['pilchard', 'Gaffer. Gaffer! We are in a European final!'], ['mags', "Calm down, Darren. Then don't calm down."]] },
  { id: 'r5', name: 'FINAL', opp: 'opulence', stadium: 'euphorium', referee: 'haltwhistle', challenge: 'super', city: 'aurelia', postcard: 'AURELIA: EVEN THE PIGEONS WEAR GOLD.', villain: true,
    pre: { headline: 'DAVID VS GOLDIATH', sub: 'Fish-oil floodlights meet the richest club on Earth.', photo: 'dor' },
    talk: [['dor', 'I have three Golden Boots. You have... boots.'], ['pilchard', 'Nice boots, though. Comfy.']],
    win: { headline: 'THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', sub: 'Kingsbridge Albion have demanded a recount.' }, loss: { headline: 'SO CLOSE!', sub: 'Golden boys break Kipper hearts.' },
    after: [] }
];
EF.PROLOGUE = {
  tabloid: { headline: 'FISH OUT OF WATER!', sub: "Typo sends tiny Kipperton into the Europhoria Cup. 'Rules are rules,' shrugs the Federation.", photo: 'pilchard' },
  talk: [['mags', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['pilchard', 'Gaffer, do they have chips in Europe?'], ['mags', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['okafor', "Let 'em try. I've got an appetite and all."], ['mags', 'That is the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up.']],
  choices: ["LET'S PLAY", 'TRAINING FIRST']
};
EF.VILLAIN = {
  talk: [['baron', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.'], ['pilchard', '...']],
  choices: ["I'M A KIPPER, MATE. ALWAYS.", '...DOES THE JET SKI COME IN ORANGE?'],
  loyal: [['baron', 'Pah! Loyalty. How very... cheap.'], ['mags', 'That is my boy.']],
  joke: [['pilchard', 'Only joking, Gaffer! Kipper till I die.'], ['mags', 'You nearly gave me a heart attack.']]
};
EF.ENDING = { tabloid: { headline: 'THE PLAICE TO BE!', sub: 'KIPPERS ARE KINGS OF EUROPE. Kingsbridge Albion have demanded a recount.', photo: 'pilchard' } };
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', icon: 'hairdryer', desc: '+10% speed and tackling for 15 minutes. The referee is stricter.', lines: ['Get out there and TERRIFY them!', 'If you lose, you are walking home. All of you.', 'I want to see SPLINTERS!'] });
EF.def('teamtalk', 'arm', { name: 'ARM ROUND THE SHOULDER', icon: 'arm', desc: 'Stamina returns 25% faster. Euphoria starts at +15.', lines: ["Just enjoy it. Your mum's watching.", 'Whatever happens, there is a fish supper waiting.', 'You are already legends. Now go and prove it.'] });
EF.def('teamtalk', 'tactics', { name: 'TACTICS BOARD', icon: 'board', desc: 'Pick the formation. Passing 10% more accurate.', lines: ['Here is the plan. Arrows. Lots of arrows.', 'Triangles, people. Pass in triangles.', 'This magnet is you, Darren. Stay near the goal.'] });
/* ---- the Gaffer's Challenges: an event condition by a Kipperton player ---- */
EF.def('challenge', 'header', { title: 'SCORE A HEADER', test: (m, ev, st) => ev.type === 'goal' && ev.side === 0 && (ev.kind === 'header' || ev.kind === 'divingHeader') });
EF.def('challenge', 'recover5', { title: 'WIN THE BALL BACK 5 TIMES', test: (m, ev, st) => { if (ev.type === 'recover' && ev.side === 0) st.n = (st.n || 0) + 1; return (st.n || 0) >= 5; }, progress: st => (st.n || 0) + '/5' });
EF.def('challenge', 'nutmeg', { title: 'NUTMEG AN OPPONENT', test: (m, ev) => ev.type === 'nutmeg' && ev.side === 0 });
EF.def('challenge', 'freekick', { title: 'SCORE FROM A FREE KICK', test: (m, ev) => ev.type === 'goal' && ev.side === 0 && ev.kind === 'freekick' });
EF.def('challenge', 'super', { title: 'SCORE A SUPER STRIKE', test: (m, ev) => ev.type === 'goal' && ev.side === 0 && ev.super });
/* ---- chants (sung by the crowd engine) ---- */
EF.def('chant', 'kipperton', { bpm: 120, notes: [['KIP', 'G4', 1, 'i'], ['PER', 'G4', 1, 'e'], ['TON', 'C5', 2, 'o'], ['clap', '', .5], ['clap', '', .5], ['clap', '', 1]] });
EF.def('chant', 'hoofington', { bpm: 70, notes: [['HOOOOF', 'G2', 2, 'u'], ['HOOOOF', 'C3', 3, 'u']] });
EF.def('chant', 'pasapasa', { bpm: 110, notes: [['O', 'E5', 1, 'o'], ['LE', 'C5', 2, 'e'], ['O', 'E5', 1, 'o'], ['LE', 'C5', 2, 'e']] });
EF.def('chant', 'stahlpresse', { bpm: 130, notes: [['HEY', 'A4', 1, 'e'], ['.', '', 1], ['HEY', 'A4', 1, 'e'], ['.', '', 1], ['HEY', 'A4', 1, 'e'], ['clap', '', 1]] });
EF.def('chant', 'lucchetto', { bpm: 70, notes: [['MMM', 'A3', 1, 'u'], ['MMM', 'C4', 1, 'u'], ['MMM', 'E4', 2, 'o'], ['MMM', 'D4', 1, 'u'], ['MMM', 'C4', 2, 'u']] });
EF.def('chant', 'opulence', { bpm: 108, detune: 30, notes: [['clap', '', 1], ['.', '', 1], ['clap', '', 1], ['.', '', 1], ['DA', 'G4', 1, 'a'], ['DA', 'C5', 1, 'a'], ['DA', 'E5', 1, 'a'], ['DAA', 'G5', 2, 'a']] });
