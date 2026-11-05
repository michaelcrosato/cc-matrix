/* ============ 51-story: speakers, the Cup Run beats, team talks, challenges, stickers, drills ============ */
EF.SPEAKERS = {
  MAGS: { name: 'MAGS MULLIGAN', pitch: .62, rig: { hat: 'cap', hair: 'short', build: 'bulky', outfit: 'coat', sleeves: 'long', colors: { cloth: '#3a4a5a', coat: '#4a5a6a', hair: '#8a8a8a', skin: '#d8a880', trim: '#f08a24' } } },
  DAZ: { name: 'DAZ PILCHARD', pitch: 1, team: 'kip', idx: 4 }, SANDRA: { name: 'SANDRA OKAFOR', pitch: .75, team: 'kip', idx: 1 }, AGGIE: { name: 'AGGIE NOWAK', pitch: 1.25, team: 'kip', idx: 2 }, TOMMY: { name: 'TOMMY TRAN', pitch: 1.35, team: 'kip', idx: 3 },
  NEEDHAM: { name: 'NORMAN NEEDHAM', pitch: .8, team: 'hoo', idx: 4 }, PEPITO: { name: 'PEPITO PASARELA', pitch: 1.5, team: 'rpp', idx: 4 }, KLAUS: { name: 'KLAUS HAMMERSCHMIDT', pitch: .55, team: 'svs', idx: 4 },
  SALVATORE: { name: 'SALVATORE SERRATURA', pitch: 1.0, team: 'acl', idx: 4 }, MAXIMILIEN: { name: 'MAXIMILIEN D\'OR', pitch: 1.1, team: 'opu', idx: 4 },
  BARON: { name: 'BARON VON BULLION', pitch: .5, rig: { hat: 'crown', hair: 'bald', outfit: 'coat', sleeves: 'long', build: 'bulky', colors: { cloth: '#14141a', coat: '#1c1c26', skin: '#f0c8a8', trim: '#e8c040' } } },
  BARRY: { name: 'BARRY', pitch: .85, rig: { hair: 'short', outfit: 'coat', sleeves: 'long', colors: { cloth: '#2a3a6a', coat: '#2a3a6a', hair: '#8a5a30', skin: '#e0b090' } } },
  TREV: { name: 'TREV', pitch: .68, rig: { hair: 'bald', outfit: 'coat', sleeves: 'long', colors: { cloth: '#6a2a2a', coat: '#6a2a2a', skin: '#c89070' } } },
  REF: { name: 'REFEREE', pitch: .9, rig: { hat: 'cap', hair: 'short', colors: { cloth: '#141414', pants: '#141414', trim: '#ffd84a', skin: '#e0b090' } } },
  PA: { name: 'THE PA', pitch: .95, rig: { hair: 'short', outfit: 'coat', colors: { cloth: '#4a4a5a', skin: '#e0b090' } } }
};
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', sub: 'Get out there and TERRIFY them!', desc: '+10% speed and tackling for 15 minutes. The referee gets twitchy.', lines: ['"Get out there and TERRIFY them! Then come back and tell me what Europe tastes like!"', '"I want FEAR! I want SWEAT! I want a full English at half time!"', '"They put their boots on one at a time, just like you. Then you TREAD on them!"'] });
EF.def('teamtalk', 'shoulder', { name: 'ARM ROUND THE SHOULDER', sub: 'Just enjoy it. Your mum\'s watching.', desc: 'Stamina comes back 25% faster. The crowd starts warm.', lines: ['"Just enjoy it. Your mum\'s watching. And she brought a flask."', '"Win, lose, or draw, there are chips after. That is the law."', '"Look at that crowd. Six hundred people who could be anywhere else. Give them a show."'] });
EF.def('teamtalk', 'board', { name: 'TACTICS BOARD', sub: 'Here\'s the plan.', desc: 'Pick the shape. Passes find their man more often.', lines: ['"Here\'s the plan. Magnets on a fridge door. Nobody touch the magnets."', '"Draw this up, Aggie. No, not the pie. The PLAN."', '"Two at the back, two at the front, and one who knows where the ball is. That\'s you, Aggie."'] });

EF.STORY = {
  prologue: { tabloid: { paper: 'THE DAILY ROAR', head: 'FISH OUT OF WATER!', sub: 'Typo sends tiny Kipperton into the Europhoria Cup. "Rules are rules," shrugs the Federation.' }, place: 'THE SMOKEHOUSE, KIPPERTON',
    talk: [['MAGS', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['DAZ', 'Gaffer, do they have chips in Europe?'], ['MAGS', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['SANDRA', 'Let them try. I have an appetite and all.'], ['MAGS', 'That\'s the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up. Literally.']] },
  rounds: [
    { id: 'r1', name: 'QUALIFYING ROUND', team: 'hoo', ref: 'haltwhistle', stadium: 'smokehouse', challenge: 'header',
      pre: { paper: 'THE DAILY ROAR', head: 'THE LONG AND THE SHORT OF IT', sub: 'Hoofington\'s aerial bombardment heads for Kipperton\'s puddles.' }, talk: [['NEEDHAM', 'We don\'t pass, love. We \'oof.']],
      win: { head: 'KIP KIP HOORAY!', sub: 'Tiny Kipperton see off the Hoofers in the rain. Europe has been warned.' }, lose: { head: 'BATTERED!', sub: 'Kippers fried by the Hoofers\' high balls. Not the batter we hoped for.' },
      after: [['MAGS', 'Not bad. Not good. But not bad.'], ['TREV', 'A proper cold night, and they\'ve warmed it up.']] },
    { id: 'r2', name: 'ROUND OF 16', team: 'rpp', ref: 'patience', stadium: 'pasapasa', challenge: 'tackles', travel: 'The minibus heads south. A postcard: "WISH YOU WERE HERE (IT\'S HOT)".',
      pre: { paper: 'THE DAILY ROAR', head: 'PASS THE PARCEL', sub: 'Kippers must stop the passing masters... if they can find the ball.' }, talk: [['PEPITO', 'You will chase the ball until you are dizzy, little fishes.']],
      win: { head: 'SOLE-DESTROYING FOR SOLERA!', sub: 'Pasapasa pass themselves silly. Kipperton pass the test.' }, lose: { head: 'PASSED OUT', sub: 'Kippers chase shadows in the Solera sun and come up empty.' },
      after: [['AGGIE', 'I counted. They made 412 passes.'], ['MAGS', 'And we made two goals. Football\'s a funny old game.']] },
    { id: 'r3', name: 'QUARTER-FINAL', team: 'svs', ref: 'ironside', stadium: 'stahlpresse', challenge: 'nutmeg', travel: 'Snow chains on the minibus. The map turns white. Sandra sits on the heater.',
      pre: { paper: 'THE DAILY ROAR', head: 'PRESSED FOR TIME', sub: 'The Steel Machine never stops running. Kipperton\'s bus barely starts.' }, talk: [['KLAUS', 'We run. You run. We run more.']],
      win: { head: 'KIPPERS MELT THE STEEL!', sub: 'Stahlpresse pressed, Kipperton squeezed through. Cold fish, hot streak.' }, lose: { head: 'CRUSHED', sub: 'The Steel Machine presses the Kippers flat as a pancake.' },
      after: [['TOMMY', 'Did you see his face when it went through his legs?'], ['SANDRA', 'Did you see mine? Frozen solid.']] },
    { id: 'r4', name: 'SEMI-FINAL', team: 'acl', ref: 'severo', stadium: 'lucchetto', challenge: 'freekick',
      pre: { paper: 'THE DAILY ROAR', head: 'PADLOCK AND KEY', sub: 'Can Kipperton crack Europe\'s meanest defence? Locksmiths on standby.' }, talk: [['SALVATORE', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['MAGS', 'They\'ll dive, they\'ll moan, and if they go ahead they\'ll park the bus. Don\'t fall for any of it.']],
      win: { head: 'THEY PARKED THE BUS - WE STOLE IT!', sub: 'Kipperton pick the lock and run off with the family silver.' }, lose: { head: 'LOCKED OUT', sub: 'Lucchetto turn the key on Kipperton\'s dream.' },
      after: [['DAZ', 'We are in the FINAL, Gaffer! Is that a good thing?'], ['MAGS', 'It is a very, very good thing, Darren.']] },
    { id: 'r5', name: 'THE FINAL', team: 'opu', ref: 'haltwhistle', stadium: 'euphorium', challenge: 'super',
      pre: { paper: 'THE DAILY ROAR', head: 'DAVID VS GOLDIATH', sub: 'Fish-oil floodlights meet the richest club on Earth.' }, talk: [['MAXIMILIEN', 'I have three Golden Boots. You have... boots.']],
      win: { head: 'THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', sub: 'Kingsbridge Albion have demanded a recount.' }, lose: { head: 'SO CLOSE! GOLDEN BOYS BREAK KIPPER HEARTS', sub: 'The money wins. This time. Fish never forget.' }, after: [] }
  ],
  villain: { place: 'A HOTEL LOBBY, NIGHT', talk: [['BARON', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.']], choices: [['I\'M A KIPPER, MATE. ALWAYS.', 'loyal'], ['...DOES THE JET SKI COME IN ORANGE?', 'joke']],
    loyal: [['DAZ', 'Kipper till I die, Baron. Now if you don\'t mind, I\'ve a minibus to catch.'], ['MAGS', 'Darren... I could kiss you. I won\'t. But I could.']], joke: [['DAZ', 'Only joking, Gaffer! Kipper till I die.'], ['MAGS', 'You nearly gave me a heart attack.']] },
  ending: ['The ceremony: a trophy the size of a small lighthouse.', 'The parade: down the harbour road on the back of a fish lorry.', 'Epilogue: "Kingsbridge Albion have demanded a recount."']
};
EF.CHALLENGES = {
  header: { text: 'SCORE A HEADER', test: s => s.headerGoals > 0 }, tackles: { text: 'WIN THE BALL BACK 5 TIMES', test: s => s.tackles >= 5 }, nutmeg: { text: 'NUTMEG AN OPPONENT', test: s => s.nutmegs > 0 },
  freekick: { text: 'SCORE FROM A FREE KICK', test: s => s.fkGoals > 0 }, super: { text: 'SCORE A SUPER STRIKE', test: s => s.superGoals > 0 }
};
EF.STICKERS = (() => {
  const out = [];
  for (const t of ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu']) { const T = EF.get('team', t); T.players.forEach((p, i) => out.push({ id: 'p:' + t + ':' + i, kind: 'player', ref: t, idx: i, name: p.name, how: t === 'kip' ? 'Yours from the start' : 'Play ' + T.name })); }
  for (const t of ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu']) { const T = EF.get('team', t); out.push({ id: 'c:' + t, kind: 'crest', ref: t, name: T.name + ' CREST', how: t === 'kip' ? 'Yours from the start' : 'Play ' + T.name }); }
  for (const s of ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium']) out.push({ id: 's:' + s, kind: 'stadium', ref: s, name: EF.get('stadium', s).name, how: 'Play a match there' });
  for (const k of Object.keys(EF.CHALLENGES)) out.push({ id: 'ch:' + k, kind: 'shiny', ref: k, name: 'SHINY: ' + EF.CHALLENGES[k].text, how: 'Gaffer\'s challenge: ' + EF.CHALLENGES[k].text.toLowerCase() });
  out.push({ id: 'x:mags', kind: 'special', name: 'MAGS MULLIGAN', how: 'Finish the prologue' }, { id: 'x:keith', kind: 'special', name: 'KIPPER KEITH', how: 'Tackle the pitch invader' }, { id: 'x:voices', kind: 'special', name: 'BARRY AND TREV', how: 'Hear 50 lines of commentary' },
    { id: 'x:bus', kind: 'special', name: 'THE BUS', how: 'Score past the parked bus' }, { id: 'x:loyal', kind: 'special', name: 'LOYAL KIPPER', how: 'Give the loyal answer' });
  return out;
})();

/* ---- training drills: each step is { text, count: key in the drill counters, n: how many } ---- */
EF.def('drill', 'move', { n: 1, title: 'ON YOUR MARKS', teaches: 'Run, sprint, stamina', who: 'MAGS', steps: [{ text: 'Run to the cones. Left stick or WASD.', k: 'cones', n: 4 }, { text: 'Hold SPRINT and run the length of the pitch.', k: 'sprintSecs', n: 3 }, { text: 'Now let your stamina recover: jog for a few seconds.', k: 'jogSecs', n: 3 }] });
EF.def('drill', 'passing', { n: 2, title: 'PASS MASTER', teaches: 'Pass, through ball, one-two', who: 'AGGIE', steps: [{ text: 'Pass to a teammate. Five times.', k: 'passes', n: 5 }, { text: 'Play two through balls into space.', k: 'throughs', n: 2 }, { text: 'Hold SWITCH and pass for a one-two.', k: 'onetwos', n: 1 }] });
EF.def('drill', 'shooting', { n: 3, title: 'HIT THE TARGET', teaches: 'Power, aim, curl, chip', who: 'DAZ', steps: [{ text: 'Hold SHOOT to charge, release to fire. Hit the target 3 times.', k: 'onTarget', n: 3 }, { text: 'Score a screamer: charge it right up.', k: 'screamers', n: 1 }, { text: 'Chip the keeper with LOB near the area.', k: 'chips', n: 1 }] });
EF.def('drill', 'air', { n: 4, title: 'HEADS UP', teaches: 'Lobs, headers, volleys', who: 'MAGS', steps: [{ text: 'Lob the ball to a teammate. Three times.', k: 'lobs', n: 3 }, { text: 'Meet a high ball with a header: press SHOOT or PASS when it drops by you.', k: 'headers', n: 1 }, { text: 'Volley one: press SHOOT as it dips.', k: 'volleys', n: 1 }] });
EF.def('drill', 'skills', { n: 5, title: 'SHOW BOAT', teaches: 'Step-over, nutmeg, rainbow flick', who: 'TOMMY', steps: [{ text: 'Do three step-overs: SKILL with the stick sideways.', k: 'stepovers', n: 3 }, { text: 'Nutmeg a dummy: SKILL while facing one, up close.', k: 'nutmegs', n: 1 }, { text: 'Rainbow flick: SKILL with the stick forward.', k: 'rainbows', n: 1 }] });
EF.def('drill', 'defending', { n: 6, title: 'THE HARBOUR WALL', teaches: 'Poke, slide, barge, switch', who: 'SANDRA', steps: [{ text: 'Win the ball with a tackle. Three times, no fouls.', k: 'tackles', n: 3 }, { text: 'Switch player with SWITCH.', k: 'switches', n: 2 }, { text: 'Intercept two passes.', k: 'intercepts', n: 2 }] });
EF.def('drill', 'setpieces', { n: 7, title: 'DEAD BALLS', teaches: 'Free kicks, corners, penalties', who: 'MAGS', steps: [{ text: 'Score a penalty. Aim with the stick, charge and release.', k: 'penGoals', n: 1 }, { text: 'Score a free kick.', k: 'fkGoals', n: 1 }, { text: 'Take a corner and score from it.', k: 'cornerGoals', n: 1 }] });
EF.def('drill', 'euphoria', { n: 8, title: 'FEED THE CROWD', teaches: 'Euphoria, Europhoria, Super Strike', who: 'DAZ', steps: [{ text: 'Fill the crowd gauge with passes and tricks.', k: 'euFull', n: 1 }, { text: 'Trigger Europhoria: L1 + R1, or SPACE.', k: 'europhorias', n: 1 }, { text: 'Hit a Super Strike. Charge and let rip.', k: 'supers', n: 1 }] });
EF.def('drill', 'theatrics', { n: 9, title: 'THE DARK ARTS', teaches: 'Dives and the referee', who: 'TOMMY', steps: [{ text: 'Run at a defender and dive after contact. Win a foul.', k: 'diveWins', n: 1 }, { text: 'Dive with nobody near. You get booked. On purpose. Now you know.', k: 'diveBooked', n: 1 }] });
