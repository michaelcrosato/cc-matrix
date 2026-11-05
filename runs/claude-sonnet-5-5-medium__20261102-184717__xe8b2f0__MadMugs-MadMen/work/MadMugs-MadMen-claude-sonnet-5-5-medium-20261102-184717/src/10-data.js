// ---------------------------------------------------------------------------------------------------------------------
// DATA: people, cards, items, conversations, the pitch, the endings. All of it plain data a designer can extend.
// Conversation node: { who, say: [line | [speaker, line]], ask: [{ t, go, fx, if }], fx, go, time }
//   fx keys: nerve heart polish haze (deltas), rel: { npc: delta }, give: 'item', card: 'theme' | ['theme', strong], flag, time
// ---------------------------------------------------------------------------------------------------------------------
const MIN_START = 9 * 60, MIN_ARRIVE = 15 * 60 + 30, MIN_PITCH = 16 * 60;

const PEOPLE = {
  gil:      { name: 'GIL',      full: 'Gil Mercer',       role: 'Copy chief. You.',                 color: '#9fb4d8', rig: { build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { hair: '#2a2018', coat: '#303a52', cloth: '#ece6da', pants: '#262c3c', boot: '#15110e', skin: '#e9bf9a' } }, voice: 'vox_gil' },
  dot:      { name: 'DOT',      full: 'Dot Pruitt',       role: 'Copy girl. Sees everything.',      color: '#6fc3b8', rig: { build: 'chibi', outfit: 'tunic', hair: 'ponytail', sleeves: 'short', colors: { hair: '#7a3b1e', cloth: '#3f8f88', pants: '#2c4a4a', boot: '#2a1a14', skin: '#f0c8a8' } }, voice: 'vox_dot' },
  walt:     { name: 'WALT',     full: 'Walt Bing',        role: 'Art director. Listens to jazz.',   color: '#d6b46a', rig: { build: 'bulky', outfit: 'shirt', hair: 'bald', sleeves: 'long', colors: { cloth: '#c9b88e', pants: '#4a4234', boot: '#1c1612', skin: '#c9946e' } }, voice: 'vox_walt' },
  teddy:    { name: 'TEDDY',    full: 'Teddy Vance',      role: 'Account man. Hair like a promise.', color: '#c7a45a', rig: { build: 'heroic', outfit: 'coat', hair: 'spiky', sleeves: 'long', colors: { hair: '#d9b46a', coat: '#7d7452', cloth: '#f2eee6', pants: '#5a5640', boot: '#241a12', skin: '#f2cfae' } }, voice: 'vox_teddy' },
  hollis:   { name: 'HOLLIS',   full: 'Arthur Hollis',    role: 'Senior partner. Owns the weather.', color: '#b8b0a8', rig: { build: 'bulky', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { hair: '#c4c0b8', coat: '#3a3030', cloth: '#e0dad0', pants: '#2c2424', boot: '#120e0c', skin: '#e2b392' } }, voice: 'vox_hollis' },
  lorraine: { name: 'LORRAINE', full: 'Lorraine Abbott',  role: 'Reception. Knows the schedule.',   color: '#e0607a', rig: { build: 'chibi', outfit: 'robe', hair: 'long', sleeves: 'short', colors: { hair: '#1f1a1c', cloth: '#a8324a', pants: '#6a2030', boot: '#1a1012', skin: '#e0b090' } }, voice: 'vox_lorraine' },
  evelyn:   { name: 'EVELYN',   full: 'Evelyn Mercer',    role: 'On the other end of the line.',    color: '#c8a0d0', rig: { build: 'chibi', outfit: 'robe', hair: 'long', sleeves: 'long', colors: { hair: '#5a3a28', cloth: '#7a5a9a', pants: '#4a3a62', boot: '#201418', skin: '#f0cdb0' } }, voice: 'vox_evelyn' },
  garland:  { name: 'GARLAND',  full: 'Mr. Garland',      role: 'Bellwether Lager. The client.',    color: '#c8a070', rig: { build: 'bulky', outfit: 'coat', hair: 'short', hat: { style: 'band', color: '#5a4630' }, sleeves: 'long', colors: { hair: '#9a9690', coat: '#5a4630', cloth: '#d8d0c0', pants: '#40362a', boot: '#1a120c', skin: '#dcae8c' } }, voice: 'vox_garland' }
};
const NPC_IDS = ['dot', 'walt', 'teddy', 'hollis', 'lorraine', 'garland'];

// the five angles a pitch can take; Garland's hidden taste decides what each is worth (Lorraine and Hollis tell you)
const THEMES = {
  truth:  { name: 'TRUTH',  color: '#7ec8e3', aff: 24,  blurb: 'The ledger says what the meeting won\'t.' },
  family: { name: 'FAMILY', color: '#f0a8b8', aff: 24,  blurb: 'The house, the table, the Sunday case.' },
  legacy: { name: 'LEGACY', color: '#e8c070', aff: 18,  blurb: 'A father, a barn, a copper kettle.' },
  style:  { name: 'STYLE',  color: '#b8a0e8', aff: 6,   blurb: 'Cold, clean, and nothing to prove.' },
  status: { name: 'STATUS', color: '#e87a5a', aff: -20, blurb: 'The beer the boss pours. Garland hates it.' }
};
const CARD_FROM = { truth: 'The ledger in the files', family: 'Dot, who reads the numbers', legacy: 'Hollis, on the terrace', style: 'Walt\'s drafting table', status: 'Teddy\'s memo' };

const ITEMS = {
  lighter: { name: 'Brass lighter', text: 'Engraved G.M. A gift from someone you stopped thanking.' },
  ledger:  { name: 'Bellwether ledger', text: 'Eleven points down in taverns, up in grocers.' },
  layout:  { name: 'Walt\'s layout', text: 'One bottle, sweating. +2 POLISH while you carry it.' },
  memo:    { name: 'Teddy\'s memo', text: 'Smells of cologne and ambition.' },
  photo:   { name: 'Old Garland\'s photograph', text: 'A man, a barn, a kettle. +1 NERVE.' },
  notes:   { name: 'Lorraine\'s notes', text: 'Garland\'s tells, in shorthand.' }
};

const TAG_LEAD  = { legacy: 'Your father\'s beer,', truth: 'It\'s only beer,', status: 'The beer the boss pours,', family: 'Set a place at the table,', style: 'Cold, clean,' };
const TAG_CLOSE = { legacy: 'brewed the way he did.', truth: 'and we\'re not sorry.', status: 'for the ones who stayed late.', family: 'for everyone who came home.', style: 'and quietly gold.' };

const SPEECH = {
  truth:  'Your sales aren\'t falling, Mr. Garland. They\'re moving. Out of the tavern, into the kitchen. You\'ve been selling to the wrong room.',
  family: 'Women buy it for the house. For the Sunday table, for company. Your beer has a seat at the family dinner. Nobody ever asked it to sit.',
  legacy: 'Your father brewed his first batch to have something to give his own father at the table. That isn\'t a lager. That\'s a thank-you that tastes like one.',
  style:  'Cold. Clean. One bottle, sweating, and room around it to breathe. Let the beer stand there like it has nothing to prove.',
  status: 'Bellwether should be the beer a man serves the boss. A beer with a place in the room.'
};

// ---- conversations ---------------------------------------------------------------------------------------------------
const T = {
  'intro': { who: '', say: ['TUESDAY, OCTOBER 15TH, 1963.', 'Hollis, Pratt & Vane. The eleventh floor. Nobody on Madison Avenue is from here. That\'s the first thing you learn. The second is that nobody admits it.', 'At four o\'clock a man from Ohio will tell you what a beer is worth. You have until then to find out what a man is worth.'] },

  'hollis.1': { who: 'hollis', say: ['Mercer. Close the door. No, leave it open. A closed door is a confession.', 'Bellwether Lager. Garland comes at four. Sales are down, his father is eleven months in the ground, and the board wants somebody to blame who isn\'t a Garland.', 'I don\'t need a campaign. I need the thing behind the campaign. Find out what that man wants before he finds out he doesn\'t want us.'],
    fx: { flag: 'briefed' },
    ask: [{ t: 'What do we know about him?', go: 'hollis.1a' }, { t: 'Give me the day and I\'ll give you a line.', go: 'hollis.1b' }, { t: 'And if what he wants is nothing?', go: 'hollis.1c' }] },
  'hollis.1a': { who: 'hollis', say: ['A Plymouth, a thermos, and a daughter. He eats lunch at his desk. That is the entire file, and I paid for it.', 'Try the girls. Girls know everything in this building, which is why we don\'t pay them.'], fx: { rel: { hollis: 1 } } },
  'hollis.1b': { who: 'hollis', say: ['Confidence. I\'ll put it on the bill.', 'The cart in the lounge is stocked. Courage is a legitimate expense. Gluttony is not.'], fx: { nerve: 1, rel: { hollis: 1 } } },
  'hollis.1c': { who: 'hollis', say: ['Then we sell him nothing, beautifully.', 'That\'s the job, Mercer. Most men can\'t tell the difference, and the ones who can don\'t sign.'], fx: { heart: 1, rel: { hollis: 1 } } },
  'hollis.again': { who: 'hollis', say: ['Still here? The clock is on the wall for a reason.', 'Go and find out who he is. I\'ll be here, being expensive.'] },
  'hollis.late': { who: 'hollis', say: ['Four o\'clock, Mercer. Tie straight. Hands out of your pockets.', 'Whatever you say in there, say it like you\'ve already been paid.'] },
  'hollis.terrace': { who: 'hollis', say: ['Mercer. Don\'t make a speech. Stand here a minute. The city looks better when nobody asks it to be fixed.', 'Old Garland. I met him once, in thirty-eight, at a county fair in Zanesville. A barn, a copper kettle, and a story: the day he got back from France he brewed his first batch just to have something to set on his father\'s table.', 'The son has spent forty years wishing he\'d been that man. You can\'t sell him a beer. You can sell him his father\'s table.'],
    ask: [{ t: 'Say that again, slower.', go: 'hollis.t1' }, { t: 'That\'s a sad thing to build a campaign on.', go: 'hollis.t2' }, { t: 'You told me not to make a speech.', go: 'hollis.t3' }] },
  'hollis.t1': { who: 'hollis', say: ['A barn. A kettle. A father who waited.', 'Here. I carried this around for twenty-five years and never found a use for it.'], fx: { card: ['legacy', true], give: 'photo', rel: { hollis: 1 } } },
  'hollis.t2': { who: 'hollis', say: ['Everything worth building is sad underneath. That\'s what the foundation is for.'], fx: { card: ['legacy', true], heart: 1, rel: { hollis: 1 } } },
  'hollis.t3': { who: 'hollis', say: ['Ha. Good. Now you sound like you can afford the carpet.'], fx: { card: 'legacy', nerve: 1, rel: { hollis: 1 } } },

  'dot.1': { who: 'dot', say: ['You\'re early, Mr. Mercer. That\'s either ambition or a hangover.'],
    ask: [{ t: 'Ambition. The hangover\'s on layaway.', go: 'dot.2', fx: { rel: { dot: 1 } } }, { t: 'Have you got the Bellwether file?', go: 'dot.2' }, { t: 'Keep your voice down.', go: 'dot.1d', if: s => s.stats.haze >= 2 }] },
  'dot.1d': { who: 'dot', say: ['I haven\'t said anything, Mr. Mercer. Not yet.'], go: 'dot.2' },
  'dot.2': { who: 'dot', say: ['The ledger\'s in the cabinet by the window. Third drawer, behind the Pilsener account. Nobody\'s opened it since spring.', 'Mr. Vance says the numbers are a blip. Mr. Vance says that about everything, including his marriage.'], fx: { flag: 'dotTip' },
    ask: [{ t: 'What do the numbers say?', go: s => s.rel.dot >= 1 ? 'dot.3a' : 'dot.3b' }, { t: 'I\'ll read them myself.', go: null }] },
  'dot.3a': { who: 'dot', say: ['Men stopped buying it at the tavern. Women buy it for the house. A case at a time, for the icebox, for the Sunday table, for company.', 'Nobody put that in a memo because nobody wants to say it\'s the women. And nobody wants to say it\'s the table.'], fx: { card: ['family', true], heart: 1, rel: { dot: 1 } } },
  'dot.3b': { who: 'dot', say: ['Women buy it for the house. That\'s all I\'m allowed to say before lunch.'], fx: { card: 'family' } },
  'dot.again': { who: 'dot', say: ['Typewriter\'s free, if you\'re stalling.', 'Don\'t let Mr. Vance get into your head. It\'s crowded enough in there.'] },
  'dot.drunk': { who: 'dot', say: ['You smell like a distillery, Mr. Mercer. Peppermints, top drawer. Take two.'], fx: { haze: -1, rel: { dot: 1 } } },

  'walt.1': { who: 'walt', say: [['', 'A needle drops on a record. Coltrane, or somebody brave enough to imitate him.'], 'Mercer. Don\'t tell me. You need a layout by lunch and a miracle by four.'],
    ask: [{ t: 'A beer ad should look like the beer. Cold, clean, gold.', go: 'walt.2', fx: { rel: { walt: 1 }, polish: 1 } }, { t: 'Make it big. Make it loud.', go: 'walt.2' }, { t: 'What\'s on the turntable?', go: 'walt.1c', fx: { rel: { walt: 1 }, heart: 1 } }] },
  'walt.1c': { who: 'walt', say: ['Coltrane. It sounds like a man arguing with God and losing politely.'], go: 'walt.2' },
  'walt.2': { who: 'walt', say: ['You want a layout? White space. One bottle, sweating. And one line, small. Small is how you shout at a man like Garland.', 'Take the board. Don\'t thank me. I\'ll only get embarrassed.'], fx: { card: ['style', true], give: 'layout' } },
  'walt.again': { who: 'walt', say: ['Still thinking big? Think smaller. Then breathe.'] },

  'teddy.1': { who: 'teddy', say: ['Mercer! Just the man. Sit, sit. I\'ve been drawing up a little strategy for Bellwether.', 'Lifestyle. A lager isn\'t a lager anymore, it\'s a man\'s place in the room. The beer the boss pours. Garland will eat it up.'],
    ask: [{ t: 'Go on, Teddy. Tell me more.', go: 'teddy.2', fx: { rel: { teddy: 1 }, heart: -1, flag: 'leanedStatus' } }, { t: 'Garland isn\'t a man who wants a place in the room.', go: 'teddy.2', fx: { rel: { teddy: -1 }, nerve: 1 } }, { t: 'Is that your idea, or your father-in-law\'s?', go: 'teddy.2', fx: { rel: { teddy: -1 }, nerve: 1 } }] },
  'teddy.2': { who: 'teddy', say: ['Here, my notes. Take them. Make me look good in there and I\'ll remember it.', ['', 'You pocket the memo. It smells like cologne and ambition.']], fx: { card: 'status', give: 'memo' } },
  'teddy.again': { who: 'teddy', say: ['I\'ll take the lead on the close, of course. You take the... poetry.'] },

  'lorraine.1': { who: 'lorraine', say: ['Eleventh floor. Hollis, Pratt and Vane. Good morning, Mr. Mercer. You look like a man who\'s been told to be charming.'],
    ask: [{ t: 'Pretty dress, Lorraine.', go: 'lorraine.2s' }, { t: 'How was your weekend?', go: 'lorraine.2', fx: { rel: { lorraine: 1 }, heart: 1 } }, { t: 'What do you know about Garland?', go: 'lorraine.2s' }] },
  'lorraine.2': { who: 'lorraine', say: ['My sister\'s boy is in the Navy, so I read the papers. Mr. Garland\'s daughter, Ellen, is getting married Saturday in Dayton. He called twice about a florist. A man who calls twice about flowers isn\'t thinking about beer.', 'He taps his glass when he\'s bored. He sets down his pen when he\'s moved. And he told me on the phone, "Miss, I don\'t care to be flattered." Nobody has ever said that to me and meant it.'], fx: { give: 'notes', flag: 'intel' } },
  'lorraine.2s': { who: 'lorraine', say: ['That\'s what Mr. Vance says right before he asks me to type something.', 'He\'s polite. He\'s from Ohio. And he doesn\'t care to be flattered. He told me so himself.'], fx: { flag: 'flattery' } },
  'lorraine.again': { who: 'lorraine', say: ['Mr. Garland\'s car is due at three-thirty. The elevator is slow. So is everything worth waiting for.'] },

  'files.1': { who: '', say: ['The third drawer sticks. Behind the Pilsener account, a ledger the color of an old tooth.', 'Bellwether: down eleven points since spring in the taverns. Up four in the grocers. Up nine in the suburbs of the Midwest. The line on the graph is a drunk man walking home, and then, suddenly, a man who has decided where home is.'], fx: { give: 'ledger' }, go: s => s.flags.dotTip ? 'files.strong' : 'files.plain' },
  'files.strong': { who: '', say: ['Dot\'s reading sits beside the page like a second set of eyes. The pattern is obvious now: the beer didn\'t lose its customers. It lost its table.'], fx: { card: ['truth', true] } },
  'files.plain': { who: '', say: ['The numbers say something. You can feel it, the way you feel a draft before you find the window.'], fx: { card: 'truth' } },
  'files.again': { who: '', say: ['The drawer is empty now. The ledger is in your pocket and the truth is in your throat.'] },

  'phone.menu': { who: '', say: ['The phone on your desk is black, heavy, and has never once brought good news by itself.'],
    ask: [{ t: 'Call home.', go: 'phone.home', if: s => !s.flags.called }, { t: 'Order a tuna on rye.', go: 'phone.lunch', if: s => !s.flags.lunch }, { t: 'Leave it.', go: null }] },
  'phone.home': { who: 'evelyn', say: [['', 'It rings six times. She answers on the seventh, which is how you know she was standing next to it.'], 'Gil. Is it tonight?', 'Eleven floors of men, and not one of them can tell you what time it is.'], fx: { flag: 'called', time: 10 },
    ask: [{ t: 'I\'ll be home for dinner. I promise.', go: 'phone.h1' }, { t: 'Don\'t wait up.', go: 'phone.h2' }, { t: 'Is the boy asleep?', go: 'phone.h3' }] },
  'phone.h1': { who: 'evelyn', say: ['You always promise precisely. It\'s the keeping you never learned.'], fx: { heart: 1, flag: 'promised' } },
  'phone.h2': { who: 'evelyn', say: ['I never do. I just leave the light on. There\'s a difference.'], fx: { nerve: 1, heart: -1 } },
  'phone.h3': { who: 'evelyn', say: ['He asked what you do. I said you sell things people don\'t need to people who don\'t know. He said, "Like a magician?" I said yes.'], fx: { heart: 1 } },
  'phone.lunch': { who: '', say: ['A tuna on rye arrives wrapped in wax paper by a boy who doesn\'t look up. It is the best meal you will have this year, and you will not remember it.'], fx: { haze: -2, flag: 'lunch', time: 15 } },

  'bar.1': { who: '', say: ['The cart: rye, scotch, a bottle of something Italian nobody opens. Ice that was frozen this morning by someone nobody thanks.'],
    ask: [{ t: 'A short rye.', go: 'bar.a', fx: { nerve: 1, haze: 1, time: 15 } }, { t: 'A double.', go: 'bar.b', fx: { nerve: 2, haze: 2, time: 15 } }, { t: 'Soda water, with a lemon.', go: 'bar.c', fx: { haze: -1, time: 15 } }, { t: 'Leave it.', go: null }] },
  'bar.a': { who: '', say: ['It goes down like a handshake. The room gets one notch kinder.'] },
  'bar.b': { who: '', say: ['It goes down like a confession. The room gets a great deal kinder, and a little farther away.'] },
  'bar.c': { who: '', say: ['The lemon is the bravest thing in the building.'] },

  'smoke.1': { who: '', say: ['You lean on the rail. Eleven floors below, hats like seeds, cabs like beetles, everyone hurrying toward something that has a name.', 'The lighter catches on the second try. Everything does.'],
    ask: [{ t: 'Think about the pitch.', go: 'smoke.a', fx: { nerve: 1, haze: -1, time: 20 } }, { t: 'Think about home.', go: 'smoke.b', fx: { heart: 1, haze: -1, time: 20 } }, { t: 'Think about nothing at all.', go: 'smoke.c', fx: { polish: 1, haze: -1, time: 20 } }] },
  'smoke.a': { who: '', say: ['You rehearse the first sentence until it stops being a sentence and becomes a posture.'] },
  'smoke.b': { who: '', say: ['A light goes on in a window across the street. Somebody is coming home to somebody. For a second you are not selling anything.'] },
  'smoke.c': { who: '', say: ['Smoke leaves you and joins the city. It is the most honest thing you have said all day.'] },

  'elevator.1': { who: '', say: ['The elevator comes on the third ring. The attendant, a man named Orville, holds the door the way a priest holds a door.', 'It would be so easy.'],
    ask: [{ t: 'Going down.', go: 'elevator.leave' }, { t: 'Not yet.', go: null }] },
  'elevator.leave': { who: '', say: ['You press the button. You don\'t say where.'] },
  'elevator.locked': { who: '', say: ['The elevator is out of service. A sign on the door says so in Hollis\'s handwriting. It has been out of service since the Garland call came in.'] },

  'garland.wait': { who: 'garland', say: ['Mr. Mercer. Whenever you\'re ready. I have a train, and a daughter to marry off.'], ask: [{ t: 'Let\'s begin.', go: null, fx: { flag: 'begin' } }, { t: 'One more minute, sir.', go: null, fx: { time: 5 } }] },
  'arrive': { who: '', say: ['The elevator bell. Lorraine\'s voice, low, through the glass: "Mr. Garland is here. He\'s early. That means he\'s nervous, or it means he\'s a man who is early."', 'Conference room. Now.'] },
  'late': { who: 'hollis', say: ['Four o\'clock, Mercer. The room is waiting, and so is a man from Ohio.', 'Walk.'] },
  'typewriter.none': { who: '', say: ['The page is blank. It has been blank for a week. It seems to be waiting for you to have learned something.'] }
};

// ---- the pitch ---------------------------------------------------------------------------------------------------------
const PITCH = {
  intro: [['garland', 'Mr. Mercer. I\'m told your people can sell anything.'], ['garland', 'I\'d like to be sold something I already own.'], ['hollis', 'Gil.'], ['', 'Garland pours a glass of water he does not drink and turns it a quarter turn, watching the door.']],
  rounds: [
    { name: 'THE OPENING', ask: 'Garland leans back. "Start with what you know."' },
    { name: 'THE IDEA', ask: 'Garland studies the ceiling. "Then tell me what you think."' },
    { name: 'THE CLOSE', ask: 'Garland folds his hands. "Last chance, Mr. Mercer. Why should I trust you?"' }
  ],
  tells: [
    [15, 'He sets his pen down. Carefully, like a man putting down a child.'],
    [6, 'He nods once. It costs him something.'],
    [-2, 'He studies the carpet. The carpet does not help.'],
    [-99, 'He taps his glass. Twice.']
  ],
  teddy: { say: [['teddy', 'If I may, Mr. Garland. What Bellwether needs is a lifestyle. The beer the boss pours. A man\'s place in the room.'], ['', 'Garland\'s fingers find the glass.']],
    ask: [{ t: 'Let Teddy finish.', fx: { rel: { teddy: 2 }, flag: 'leanedStatus' }, hit: -14, line: 'Teddy glows. Garland taps the glass twice.' }, { t: '"Teddy, let Mr. Garland finish his water."', fx: { rel: { teddy: -1 }, nerve: 1 }, hit: 0, line: 'Teddy smiles with all his teeth. The room is yours again.' }] },
  trust: { // the last question: three answers, each pays differently by who you are
    ask: [
      { t: '"You shouldn\'t. Trust the work."', ok: s => s.stats.heart >= 5, good: 14, bad: 4, goodLine: 'Garland almost smiles. It is the first honest face of the day.', badLine: 'It lands softly. He nods, but he is still deciding.' },
      { t: '"Because I\'m very good at this."', ok: s => s.stats.polish >= 5, good: 9, bad: -4, goodLine: 'He lifts an eyebrow. Confidence, properly dressed.', badLine: 'He has heard it from a better-dressed man.' },
      { t: '"Because you came to us, Mr. Garland."', ok: s => s.stats.haze <= 2, good: 6, bad: -10, goodLine: 'A small, dry laugh. "That is not the worst reason."', badLine: 'You can smell the rye on the word "came". So can he.' }
    ] }
};

const ENDINGS = {
  handshake: { title: 'THE HANDSHAKE', tone: '#8fd0a0', lines: ['Garland doesn\'t speak for a long time. He sets down his pen, the second time today.', '"My father would have hated every word of it," he says. "And he\'d have signed."', 'The contract is thin. The pen is heavy. Hollis, in the corner, studies the ceiling like a man with an unpaid debt to God.', 'You take the elevator down with a signature and a feeling you can\'t bill for.'] },
  account: { title: 'THE ACCOUNT', tone: '#e8c070', lines: ['The room likes you. That\'s the trouble. Garland signs fast, the way people sign when they\'ve been given permission to stop thinking.', '"Wonderful," says Teddy, taking the credit with both hands.', 'You won. Afterward you stand at the window and try to remember which parts were true.'] },
  maybe: { title: 'THE CALL', tone: '#b8c0d8', lines: ['"We\'ll be in touch," says Garland, which is what men say instead of no.', 'Hollis pours two fingers into a glass he doesn\'t drink. "Not nothing," he says. "Not enough."', 'Somewhere in Ohio a phone will ring on Thursday. Or it won\'t, and that will be the answer.'] },
  lost: { title: 'THE DOOR', tone: '#d88a7a', lines: ['Garland is gracious about it, which is worse.', 'On the way down, a stranger holds the elevator for you and doesn\'t ask. New York is kind that way. It\'s the only kindness it has.', 'Tomorrow there will be another client, another four o\'clock. The building will be exactly as tall.'] },
  spill: { title: 'THE SPILL', tone: '#c89a6a', lines: ['You reach for the water, and the pitcher goes with it. Not all of it. Just enough.', 'Nobody speaks. A secretary appears with towels, like a miracle that has been waiting in the wings.', 'Hollis does not look at you. That is how you know.'] },
  elevator: { title: 'FOR CIGARETTES', tone: '#9ab0d0', lines: ['The doors close on the eleventh floor, and the building lets go of you like a held breath.', 'Somewhere upstairs a phone is ringing, and for once it is not for you.', 'The street is very bright. You buy a paper and don\'t read it.'] }
};

const ABOUT = [
  ['Source Information', ''],
  ['Date', STAMP.date],
  ['Source', 'Mad Men (2007-2015)'],
  ['Genre and Perspective', 'Narrative adventure with pitch card-play (Life Sim leaning); three-quarter view (also isometric and top-down)'],
  ['Tech', 'my-3D2dge v0.85.1 (2D engine, canvas), single HTML file, AI Hub session client 1.3.0'],
  ['Art Direction', 'Engine-native HD pixel look: 3D skeleton Humanoids drawn as pixel art, lit 1963 office, warm lamps'],
  ['Animation', 'Engine rigs (Humanoid poses and expressions), tweens and scripts'],
  ['Audio', 'All code-written: cool-jazz music, typewriter and room sound effects, Animalese-style gibberish voices'],
  ['Online', 'AI Hub Session Protocol v1, parallel mode (1 to 4 players, each with their own copy of the day)'],
  ['Testing', 'Headless engine tests, browser playthrough, AI Hub harness check, viewport checks'],
  ['Research', 'None online; period and tone from knowledge of the show'],
  ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
  ['Model', 'Anthropic, claude-sonnet-5-5, reasoning effort medium']
];
