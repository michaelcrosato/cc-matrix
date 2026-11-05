// The story as data: 34 events. Each has a trigger (when), lines of dialogue (who speaks, and the babble of their voice),
// and optional choices. A choice carries effects: a flag, mana, an item, or a knight who joins the player's realm.
// Triggers: start (a realm's first season), season (the index of the season), candle (seasons left on the Hour-Candle),
// capture (a castle taken by the player), castle-lost (a castle taken from a realm), march-by (a realm marches),
// wounded (a knight hurt in battle), promoted (a knight changes class), sanctum (a march on Meridian).
const EV = (id, when, lines, o = {}) => G.def('event', id, Object.assign({ when, lines, once: true }, o));
const CH = (text, effects = []) => ({ text, effects });

// the four openings: each realm's ruler on the first morning
EV('open-verdance', { start: 'verdance' }, [
  { who: 'oren', text: 'Mossgate has seen flood and fire. The thaw came early and the fords are up. Hold the green land for me.' },
  { who: 'bryony', text: 'Briarwatch and Mistmere are ours, and so are their roads. Send your riders where the mist is thin.' }]);
EV('open-solmark', { start: 'solmark' }, [
  { who: 'tamsin', text: 'The sun is high over Brightwall and there is no rain in the forecast. That is a gift, and gifts are spent quickly.' },
  { who: 'ysolde', text: 'Emberfall\'s wells are low. We will need the Goldenvale mines before the dry wind takes the grain.' }]);
EV('open-amberlyn', { start: 'amberlyn' }, [
  { who: 'wren', text: 'Gildmere is full of grain and empty of soldiers. A harvest is a promise kept in the right order.' },
  { who: 'lark', text: 'The roads to Quillon are hard, and the Saltmere men say the Dominion is watching the coast.' }]);
EV('open-hoarfast', { start: 'hoarfast' }, [
  { who: 'hale', text: 'Frostwatch has held through forty winters. The ice does not forgive, and neither do I.' },
  { who: 'ilse', text: 'The glass at Glassrise shows a bell that is not ringing. Something in the Dominion has stopped the clock.' }]);

// the seasons: the realm's troubles and the choices it makes about them
EV('season-1', { season: 1 }, [
  { name: 'A rider', text: 'A rider from the south: Dominion scouts are on the Thornpass road, counting horses and bells.' },
  { who: 'oren', text: 'Count them back. Riders on the road can be followed.', choices: [CH('Send riders to follow them', [{ t: 'mana', n: -2 }, { t: 'flag', f: 'followed-scouts' }]), CH('Hold the walls and wait', [{ t: 'flag', f: 'held-walls' }])] }]);
EV('season-2', { season: 2 }, [
  { name: 'The harvest', text: 'The autumn gales have come early to the coast, and the grain at Saltmere is in the wrong place.' },
  { who: 'wren', text: 'Send the grain inland, or hold it for the coast?', choices: [CH('Send the grain inland', [{ t: 'mana', n: 4 }]), CH('Hold it for the coast', [{ t: 'flag', f: 'coast-grain' }, { t: 'mana', n: 1 }])] }]);
EV('season-3', { season: 3 }, [
  { name: 'The frozen fords', text: 'Every river north of the Rimecrag is ice. The Hoarfast horses cannot cross, and the Dominion knows it.' },
  { who: 'brannoc', text: 'Then we walk on the ice and they will not expect it.', choices: [CH('Walk the ice', [{ t: 'flag', f: 'walked-ice' }]), CH('Wait for the thaw', [{ t: 'mana', n: 2 }])] }]);
EV('season-4', { season: 4 }, [
  { name: 'A blade for hire', text: 'Nessa of the Thornpass band has sent word. She offers her blade for four mana, and says she is nobody\'s.' },
  { who: 'oren', text: 'A free blade is worth a little mana. Shall I pay her?', choices: [CH('Pay Nessa four mana', [{ t: 'mana', n: -4 }, { t: 'join', knight: 'nessa' }]), CH('Thank her and decline', [])] }]);
EV('season-5', { season: 5 }, [
  { name: 'Dry wind', text: 'A dry wind has come off the Solmark plains. Ferns crack in the hand, and the forests are waiting for a spark.' },
  { who: 'tamsin', text: 'Wet your banners and keep the torches low. We do not burn our own forests.', choices: [CH('Wet the banners', [{ t: 'flag', f: 'wet-banners' }]), CH('Trust the wind', [{ t: 'mana', n: 3 }])] }]);
EV('season-6', { season: 6 }, [
  { name: 'A letter', text: 'A letter in a Dominion hand arrives under the gate of Mossgate. It says only: "The hour is paid in full."' },
  { who: 'oren', text: 'Burn it, or read it aloud to the men?', choices: [CH('Read it aloud', [{ t: 'flag', f: 'read-letter' }]), CH('Burn it', [{ t: 'flag', f: 'burned-letter' }])] }]);
EV('season-7', { season: 7 }, [
  { name: 'The Dominion marches', text: 'The Dominion\'s banners are moving between Stillhold and Bellgate. Their knights walk as if they had all day.' },
  { who: 'hale', text: 'Let them march. Every mile they walk is a mile they cannot spend on the ice.' }]);
EV('season-8', { season: 8 }, [
  { name: 'The Gray Knight', text: 'Word from Meridian: the Gray Knight has been seen on the wall of the Calendar City, watching every road at once.' },
  { who: 'vesper', text: 'The hour is his. You can take it from him, but you cannot make him give it back.' }]);
EV('season-9', { season: 9 }, [
  { name: 'Autumn fires', text: 'The forests of the Ford have caught, and the smoke goes east over the Orchard. The villages ask who started it.' },
  { who: 'pell', text: 'Nobody started it. The wind did, and the wind does not answer questions.' }]);
EV('season-10', { season: 10 }, [
  { name: 'The clock', text: 'The Calendar City\'s clock has stopped on the thirteenth month. The bell that should have rung is silent.' },
  { who: 'nocturne', text: 'Silence is only the sound of an hour being kept. Go and break it.' }]);
EV('season-11', { season: 11 }, [
  { name: 'The last winter', text: 'The last winter comes early over every realm. Whatever is not taken before the thaw will stay taken.' },
  { who: 'hale', text: 'Then we take what we came for, and we take it before the frost sets.' }]);

EV('stillness', { stillness: true }, [{ name: 'Stillness', text: 'A castle has stopped. Its clock reads the thirteenth hour, its banners hang still, and nothing there can march until the Gray Knight lifts his hand.' }]);

// the candle and the Gray Knight
EV('candle-3', { candle: 3 }, [{ name: 'The candle', text: 'The Hour-Candle is down to three seasons. Its flame leans toward Meridian, and the wax runs thin.' }]);
EV('candle-1', { candle: 1 }, [{ who: 'oren', text: 'One season left on the candle. Whatever we mean to do at Meridian, we do it this season.' }]);
EV('gray-hurt', { wounded: 'gray' }, [{ who: 'vesper', text: 'The Gray Knight has been struck. For the first time in a hundred years, the hour stumbles.' }]);
EV('dominion-march', { 'march-by': 'dominion' }, [{ name: 'The Dominion marches', text: 'The first Dominion march of the war. Their knights come down the road without a single horn.' }]);

// the captures: the free companies, the Dominion's halls, and the first castle of the war
EV('capture-thornpass', { capture: 'thornpass' }, [
  { name: 'Thornpass', text: 'The gate of Thornpass stands open. Its people say the free companies have moved on, and left a letter for whoever came.' },
  { who: 'drift', text: 'I was going to leave anyway. Count me in, if you can pay the grain.', choices: [CH('Take Drift into your service', [{ t: 'join', knight: 'drift' }]), CH('Thank her and let her go', [])] }]);
EV('capture-blackhollow', { capture: 'blackhollow' }, [
  { name: 'Blackhollow', text: 'Blackhollow was a robbers\' den and has a good cellar. The bandits left the wine and took the money.' },
  { who: 'gorse', text: 'Good cellar. Bad company. I will take the company if you will take the cellar.', choices: [CH('Take Gorse into your service', [{ t: 'join', knight: 'gorse' }]), CH('Keep the wine and let him go', [{ t: 'mana', n: 2 }])] }]);
EV('capture-stillhold', { capture: 'stillhold' }, [
  { name: 'Stillhold', text: 'The Regent\'s hall is empty. A clock in the middle of the room has stopped at the thirteenth hour.' },
  { who: 'hollis', text: 'Vesper\'s people took their horses and left the clock. I would sooner have the horses.', choices: [CH('Take Hollis into your service', [{ t: 'join', knight: 'hollis' }]), CH('Leave the clock as it is', [{ t: 'flag', f: 'left-clock' }])] }]);
EV('capture-first', { capture: 'briarwatch' }, [{ name: 'The first castle', text: 'The banner goes up over the first castle of the war. Nobody cheers. They are too tired, and the hour is still running.' }]);
EV('capture-bellgate', { capture: 'bellgate' }, [
  { name: 'Bellgate', text: 'Bellgate\'s bell has been hung upside down, to keep its ring from the Dominion. Someone has turned it back.' },
  { who: 'nocturne', text: 'The Dominion hung it that way to stop the hour. Turned back, it keeps the hour for everyone.' }]);

// the castles lost: the capitals, and the loss of a ruler's own
EV('lost-mossgate', { 'castle-lost': 'mossgate' }, [{ who: 'bryony', text: 'Mossgate has fallen to the Dominion. The green roots are cut, and the oaks will remember.' }]);
EV('lost-brightwall', { 'castle-lost': 'brightwall' }, [{ who: 'ysolde', text: 'Brightwall\'s banner is down. The sun still rises over it, but the gate is not ours.' }]);
EV('lost-gildmere', { 'castle-lost': 'gildmere' }, [{ who: 'lark', text: 'Gildmere has been taken. The granaries will feed someone else this winter.' }]);
EV('lost-frostwatch', { 'castle-lost': 'frostwatch' }, [{ who: 'brannoc', text: 'Frostwatch has fallen. The ice is ours still, but the walls are not.' }]);

// the rulers, the battles and the new classes
EV('ruler-hurt', { 'ruler-hurt': true }, [{ name: 'A ruler down', text: 'A rival ruler has been carried from the field. Their mana will be thin next season, and their banners lower.' }]);
EV('sanctum', { sanctum: true }, [
  { name: 'The Clockwork Sanctum', text: 'The gate of the Sanctum is shut, and the dials on its wall show three different seasons. Only when they agree does the gate open.' },
  { who: 'oren', text: 'Then we turn them, one by one, and we do not stop until they match.' }]);
EV('promoted', { promoted: true }, [{ name: 'A new road', text: 'A knight has earned a new name on the road, and a new class to go with it. The men cheer that one.' }]);
EV('quest-return', { 'quest-return': true }, [{ name: 'The quest', text: 'A knight has come back from the road with a story, a sack of coin and an odd kind of quiet about the eyes.' }]);
EV('start-wren-nessa', { season: 12 }, [{ name: 'The last season', text: 'Twelve seasons of the candle, and the Calendar City still stands. Whatever happens at Meridian, it happens now.' }]);
EV('recruit-gray-gossip', { season: 6, requires: { flag: 'read-letter' } }, [{ who: 'shade', text: 'I read that letter too, on the Stillhold wall. Vesper\'s hand writes like a clock. Shall I desert?', choices: [CH('Welcome Shade', [{ t: 'join', knight: 'shade' }]), CH('Keep him where he is', [])] }]);
EV('dunstan-fords', { season: 3, requires: { flag: 'walked-ice' } }, [{ who: 'dunstan', text: 'We walked the ice and the Dominion broke their line on the river. Men still talk about it at the fire.' }]);
EV('bryony-watch', { season: 9, requires: { flag: 'followed-scouts' } }, [{ who: 'bryony', text: 'The scouts we followed went straight to the Stillhold gate. Now we know where the Dominion sleeps.' }]);
EV('pell-coast', { season: 2, requires: { flag: 'coast-grain' } }, [{ who: 'pell', text: 'The coast grain kept the Saltmere men alive. Remember that when they ask for bread next winter.' }]);
EV('tobin-cellar', { season: 7, requires: { flag: 'burned-letter' } }, [{ who: 'tobin', text: 'Someone burned a letter in Mossgate and the smoke came down the Thornpass. I think I know who you are.', choices: [CH('Take Tobin into your service', [{ t: 'join', knight: 'tobin' }]), CH('Tell him to keep walking', [])] }]);
EV('magpie-shiny', { season: 10, requires: { flag: 'left-clock' } }, [{ who: 'magpie', text: 'You left the clock. Nobody leaves a clock. I shall take it myself, if it is still there.', choices: [CH('Take Magpie into your service', [{ t: 'join', knight: 'magpie' }]), CH('Let Magpie have the clock', [])] }]);
EV('kestrel-road', { season: 5, requires: { flag: 'wet-banners' } }, [{ who: 'kestrel', text: 'Wet banners on the road, and nobody saw the fire coming. I am impressed. Shall I ride with you?', choices: [CH('Take Kestrel into your service', [{ t: 'join', knight: 'kestrel' }]), CH('Thank her for the watch', [])] }]);
EV('nocturne-dusk', { season: 8, requires: { flag: 'held-walls' } }, [{ who: 'nocturne', text: 'The walls held and the Dominion learned to count. That is a lesson I shall remember to teach them.' }]);
EV('ashen-meridian', { 'march-to': 'meridian' }, [{ who: 'ashen', text: 'You march on Meridian. I am the one who counts its bells. Count them well, because I will.' }]);
EV('quill-road', { season: 4, requires: { flag: 'walked-ice' } }, [{ who: 'quill', text: 'I have written every road through the ice. Your walk is in the book now, and it reads well.', choices: [CH('Take Quill into your service', [{ t: 'join', knight: 'quill' }]), CH('Thank her for the record', [{ t: 'item', item: 'bronze-bell' }])] }]);
EV('raven-toll', { season: 11, requires: { flag: 'coast-grain' } }, [{ who: 'raven', text: 'The road is paid for, the grain is counted, and I want my toll. Pay it, or I take it from the cart.', choices: [CH('Pay Raven\'s toll (two mana)', [{ t: 'mana', n: -2 }]), CH('Refuse and let him try', [{ t: 'flag', f: 'refused-toll' }])] }]);
EV('mire-bell', { season: 12, requires: { flag: 'left-clock' } }, [{ who: 'mire', text: 'The bell rings once more and you will be too late. Or the bell will be yours.' }]);

// the rival lines: two lines before a battle when both rulers are on the field. Each pair plays once, keyed by the
// two rulers' ids in alphabetical order.
G.RIVAL_LINES = {
  'oren-tamsin': [{ who: 'oren', text: 'Tamsin, your sun has come to my green fields. Take your heat back to Solmark.' }, { who: 'tamsin', text: 'Your roots are deep, Oren. Mine are in the rock, and rock does not drown.' }],
  'oren-wren': [{ who: 'wren', text: 'Oren, the harvest is in and your fields are still green. I call that a kind of theft.' }, { who: 'oren', text: 'Then come and take the green. It is easy to carry off a gate.' }],
  'hale-oren': [{ who: 'hale', text: 'Oren, your spring has come early and cracked the ice on my fords. I will not forgive it.' }, { who: 'oren', text: 'Forgive the thaw, Hale. It was never mine to hold.' }],
  'tamsin-wren': [{ who: 'tamsin', text: 'Wren, you have your barns and I have my sun. Shall we see which one feeds the other?' }, { who: 'wren', text: 'Bring your sun to my granaries and we will see what it does to the grain.' }],
  'hale-tamsin': [{ who: 'tamsin', text: 'Hale, your frost has bitten our wells. A winter king in summer is a poor guest.' }, { who: 'hale', text: 'Then send your heat to the ice. We will see whether it melts before the thaw.' }],
  'hale-wren': [{ who: 'wren', text: 'Hale, the harvest waits for no ice. Let us settle the land before the frost takes both.' }, { who: 'hale', text: 'Settle it, then. The frost is patient, and I am not.' }],
  'vesper-oren': [{ who: 'vesper', text: 'Oren, you keep your clock broken. I have come to mend it, under my own hand.' }, { who: 'oren', text: 'You have never mended anything in your life, Regent. You only stop it.' }],
  'tamsin-vesper': [{ who: 'vesper', text: 'Sun-Queen, you burn the hour in every dawn. Let me stop it for you.' }, { who: 'tamsin', text: 'You will not stop a sunrise, Regent. You can only be burned by one.' }],
  'vesper-wren': [{ who: 'wren', text: 'Vesper, the harvest bells have stopped ringing. What did you do to my fields?' }, { who: 'vesper', text: 'I did nothing to them. They simply stopped waiting for you.' }],
  'hale-vesper': [{ who: 'hale', text: 'Vesper, the frost takes what it likes, and it does not like you.' }, { who: 'vesper', text: 'Frost is only time that has forgotten how to move. I shall remind it.' }]
};
