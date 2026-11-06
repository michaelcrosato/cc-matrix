// Dialogue banks. Lines are data: { text, when: { season, weather, hour:[a,b], friendMin, memory }, w }.
// Tags: {player} {town} {item} {neighbour} {catch}. "|" = a beat. *word* = emphasis.
const L = (text, when = {}, w = 1) => ({ text, when, w });
const TYPE = {
  hearth: {
    greet: [L("You look peaky, mmhm. I made soup. It's Tuesday's. Tuesday was a good day for soup, mmhm."), L('Come in, come in, mmhm. Wipe your feet. Wipe someone else\'s feet. Mmhm.'), L("I'm cooking for twelve. There are four of us. Mmhm. Leftovers are a lifestyle.")],
    rain: [L('Rain, mmhm. Best soup weather. Also worst soup weather. Soup has range.', { weather: 'rain' })],
    snow: [L('Snow! Mmhm. I keep a pot warm for exactly this and exactly nothing else.', { weather: 'snow' })],
    night: [L('You should be in bed, mmhm. Or at least near soup.', { hour: [21, 29] })],
    friend: [L('{player}, mmhm. You are the only one who finishes the bowl. I notice. Mmhm.', { friendMin: 40 })],
    absent: [L('Mmhm. You were gone. I kept your seat warm. It got cold. Then I made soup about it.', { memory: 'absent' })],
  },
  sunshine: {
    greet: [L('I smiled at a rock today and I think it\'s going really well, isn\'t it?!'), L('Hi! Hi hi hi! You came over! Of all the people in the world, isn\'t it?!'), L('I waved at a cloud and it moved. We\'re basically friends, isn\'t it?!')],
    rain: [L('Rain is just the sky being friendly! Wetly! Isn\'t it?!', { weather: 'rain' })],
    snow: [L('Snow! It\'s sky confetti! Isn\'t it?!', { weather: 'snow' })],
    night: [L('It\'s dark but I\'m not scared! Okay a little! Isn\'t it?!', { hour: [21, 29] })],
    friend: [L('You\'re my favourite person today! Also yesterday! I checked, isn\'t it?!', { friendMin: 40 })],
    absent: [L('You were gone and the town went all grey! And then I coloured it back in, isn\'t it?!', { memory: 'absent' })],
  },
  grouch: {
    greet: [L("You're standing in my good spot. No, there isn't another one. They're all my good spot. I'd prefer not."), L('Oh. It\'s you. I was almost having a quiet moment. I\'d prefer not.'), L('Talking is fine. Talking *to me* is the issue. I\'d prefer not.')],
    rain: [L('Rain. Finally, something that doesn\'t want to chat.', { weather: 'rain' })],
    snow: [L('Snow muffles things. Everything. Please be snow.', { weather: 'snow' })],
    night: [L('It\'s night. Quiet. Leave it that way.', { hour: [21, 29] })],
    friend: [L('...You can stand near the good chair. *Near.* I\'d prefer not, but the preference is fading.', { friendMin: 40 })],
    absent: [L('You left. It was lovely. Then you came back. I\'d prefer not, but I noticed.', { memory: 'absent' })],
  },
  diva: {
    greet: [L('I am technically the Duchess of this river, darling dear. Yes, that one. No, don\'t touch it.'), L('Ah, a visitor. Do stand where the light is kinder to me, darling dear.'), L('Mind the rug, darling dear. It is older than your whole family tree.')],
    rain: [L('Rain! Mud! My natural habitat, darling dear. Do not applaud. Applaud slightly.', { weather: 'rain' })],
    snow: [L('Snow, darling dear. Terribly cold. Terribly photogenic.', { weather: 'snow' })],
    night: [L('Night is when I am at my most luminous, darling dear.', { hour: [21, 29] })],
    friend: [L('Do sit, darling dear. I rarely say that. I rarely say anything unrehearsed.', { friendMin: 40 })],
    absent: [L('You were absent. I wore black. For a morning, darling dear.', { memory: 'absent' })],
  },
  gogetter: {
    greet: [L('I rolled here! From over there! That\'s thirty metres of pure cardio, let\'s roll!'), L('Hydrate! Stretch! Hustle! In that order or any order, let\'s roll!'), L('Do you even lift? Do you even *lean*? Let\'s roll!')],
    rain: [L('Rain is just free cardio with extra steps, let\'s roll!', { weather: 'rain' })],
    snow: [L('Snow! Resistance training for the whole body! Let\'s roll!', { weather: 'snow' })],
    night: [L('Night shift! Nobody sees the gains! Let\'s roll!', { hour: [21, 29] })],
    friend: [L('{player}, you\'re my spotter. Emotionally. Let\'s roll!', { friendMin: 40 })],
    absent: [L('You skipped days! No judgment! A little judgment! Let\'s roll!', { memory: 'absent' })],
  },
  dreamer: {
    greet: [L('I wrote you a poem. It\'s about your hat. It ends badly, or so the moon says.'), L('I was counting the stars and one waved. Or I did. Or so the moon says.'), L('Do you ever think the grass is just very slow weather? ...or so the moon says.')],
    rain: [L('The sky is practising sad songs. I can tell. ...or so the moon says.', { weather: 'rain' })],
    snow: [L('Snow is the moon\'s homework, falling. ...or so the moon says.', { weather: 'snow' })],
    night: [L('Finally, the good hours. Look up. Not at me. ...or so the moon says.', { hour: [21, 29] })],
    friend: [L('I named a star after you. It\'s very small. ...or so the moon says.', { friendMin: 40 })],
    absent: [L('You were gone. I drew you from memory. I got the ears wrong. ...or so the moon says.', { memory: 'absent' })],
  },
  schemer: {
    greet: [L('Have you ever *seen* Mrs. Gander eat? No. Neither has anyone. You didn\'t hear it from me.'), L('Psst. The notice board has a second notice behind it. You didn\'t hear it from me.'), L('I keep a box. The box keeps a box. You didn\'t hear it from me.')],
    rain: [L('Rain covers footprints. Not that I\'d know. You didn\'t hear it from me.', { weather: 'rain' })],
    snow: [L('Snow shows footprints. Nobody trust snow. You didn\'t hear it from me.', { weather: 'snow' })],
    night: [L('Night: when the interesting people do the interesting nothing. You didn\'t hear it from me.', { hour: [21, 29] })],
    friend: [L('{player}, I trust you. That\'s my third trust this year. You didn\'t hear it from me.', { friendMin: 40 })],
    absent: [L('You vanished. Suspicious. I respect it. You didn\'t hear it from me.', { memory: 'absent' })],
  },
  auntie: {
    greet: [L("Hon, I knitted you a thing. Not sure what it is yet. Give it time, hon."), L('Come here, hon. You look like you\'ve been dealing with people.'), L('Sit, hon. I\'ve got gossip, wool, and no particular order.')],
    rain: [L('Rain, hon. Good for knitting. Also good for talking about knitting.', { weather: 'rain' })],
    snow: [L('Snow, hon! I knitted the snow a hat. It declined.', { weather: 'snow' })],
    night: [L('Up late, hon? I\'m on row four hundred. Don\'t ask what of.', { hour: [21, 29] })],
    friend: [L('You\'re family, hon. The bit of the family I like.', { friendMin: 40 })],
    absent: [L('Hon, you were gone. I told everyone you were fine. I told them with details.', { memory: 'absent' })],
  },
  hustler: {
    greet: [L('Fitch. Boxes. Deals. No refunds. Welcome to the neighbourhood.'), L('Psst. Buy low. Sell to me. No refunds.'), L('Everything in this box is almost something. No refunds.')],
    rain: [L('Rain: the best sales pitch the sky ever made. No refunds.', { weather: 'rain' })],
    snow: [L('Snow means everyone needs a coat. I have a coat. It has one sleeve. No refunds.', { weather: 'snow' })],
    night: [L('Night market hours. My favourite. No refunds.', { hour: [21, 29] })],
    friend: [L('For you, friend rate. It\'s the same rate. No refunds.', { friendMin: 40 })],
    absent: [L('You left. I held your place in line. For a fee. No refunds.', { memory: 'absent' })],
  },
};
const TICS = { hearth: '...mmhm', sunshine: "isn't it?!", grouch: "I'd prefer not.", diva: 'darling dear.', gogetter: "let's roll!", dreamer: '...or so the moon says.', schemer: "You didn't hear it from me.", auuntie: 'hon.', auntie: 'hon.', hustler: 'no refunds.' };
const cache = {};
export function typeLines(type, cat) { const base = (TYPE[type] ?? TYPE.hearth)[cat] ?? []; if (cat !== 'greet') return base; return (cache[type] ??= [...base, ...composedLines(type, TICS[type])]); }
export const SEASON_LINES = [
  L('Spring. Everything is blooming, including the grudges.', { season: 0 }), L('Summer. The river is just a very long argument with the sea.', { season: 1 }),
  L('Autumn. The leaves are quitting and being very dramatic about it.', { season: 2 }), L('Winter. Even the debt feels colder.', { season: 3 }),
];
export const UNIQUE = {
  dorrit: [L('Mrs. Gander asked for the recipe. I gave her a different recipe. Mmhm. A *worse* one.'), L('I put an onion in your pocket yesterday. It\'s a gift. It\'s also an apology. Mmhm.'), L('Bartleby won\'t eat my soup. He says he would prefer not. I leave it on his step anyway, mmhm.'), L('Rocco eats my soup standing up. That can\'t be good. Mmhm.')],
  tavi: [L('The river said hi to me today! It said it in river! Isn\'t it?!'), L('I keep waving at Bartleby and he keeps looking at me! It\'s going so well, isn\'t it?!'), L('Everything in my house is yellow! It makes my dreams yellow! Isn\'t it?!'), L('Dorrit made soup and I cried! Happy cried! Isn\'t it?!')],
  bartleby: [L('There is laundry on my antlers. I didn\'t put it there. I\'d prefer not to discuss who did.'), L('Tavi waves at me. Daily. I\'d prefer not. I\'ve started waving back. That\'s how it gets you.'), L('I own one good chair. It is the best chair. I\'d prefer not to share the facts.')],
  ottoline: [L('Yolanda and I are not feuding, darling dear. We simply disagree about a scarf, loudly, for eternity.'), L('I have lived in mud since before it was fashionable, darling dear.'), L('Pearls, darling dear. One a day keeps the commoners at bay.')],
  rocco: [L('I\'m training Nib! He doesn\'t want it! That\'s how you know it\'s working, let\'s roll!'), L('I gave myself a trophy for lifting a trophy. Meta, let\'s roll!'), L('I could roll to the bus stop in nine seconds. Ask me to. Let\'s roll!')],
  nib: [L('I fell asleep under the stars and woke up under a tree. The tree was embarrassed. ...or so the moon says.'), L('Rocco wants me to run. I want the moon. We compromise. I stand still very fast. ...or so the moon says.'), L('I found a bug that looks exactly like a comma. I let it go. It was mid-sentence. ...or so the moon says.'), L('My telescope points at the sky and sometimes at Rocco. ...or so the moon says.')],
  ozzie: [L('Count the lamps in the plaza. Now count them tomorrow. You didn\'t hear it from me.'), L('The Mayor isn\'t slow. He\'s *pacing himself* for something. Think about it. You didn\'t hear it from me.'), L('There\'s a red string connecting the bus stop to the store. I can\'t explain it. You didn\'t hear it from me.'), L('If I play dead, it\'s tactical. You didn\'t hear it from me.')],
  yolanda: [L('Ottoline and I are *not* feuding about that scarf, hon. We\'re disagreeing at volume.'), L('Dorrit feeds everyone. I knit for everyone. We\'re the same, hon. She\'s just edible.'), L('If you see my scarf on someone with a bill... ask no questions, hon. Take notes.')],
  fitch: [L('This box? Opened. This box? Haunted. This box? Still deciding. No refunds.'), L('Rocco left me a trophy. I tried to sell it. It came back. No refunds.'), L('Prices here are fair. For me. No refunds.')],
};
export const GOSSIP = [
  L('{neighbour} was seen talking to a rock. The rock won.'), L('{neighbour} claims to have caught a fish this big. The fish disagrees.'),
  L('I heard {neighbour} hums when nobody\'s looking. Loudly.'), L('Somebody saw {neighbour} stand perfectly still for an hour. Out of respect for something.'),
  L('{neighbour} owes Mrs. Gander money. That narrows it down to everyone.'), L('Did you know {neighbour} sleeps with the lamp on? The lamp does not mind.'),
  L('{neighbour} wrote a letter and then ate it. Possibly a metaphor.'), L('The Mayor is {neighbour}\'s favourite person. He has never been caught moving.'),
];
export const GANDER = [
  L("No rush on the payment, dear. I've simply noted the time you didn't pay, and I'll be noting it again tomorrow."), L('HONK. Pardon me. That was my indoor voice.'),
  L('Everything in this store has a price. Some things have two. One for you. One for the feeling.'), L('I never forget a debt, dear. I also never forget a birthday. Hmm. I mean I do. But I bill for it.'),
  L('You look well. I always say that to people who owe me. It keeps them looking well.'), L("I don't mind the interest. The interest minds *you*."),
];
export const GANDER_SELL = [L('Ooh. A fine item. I can offer you... a number. A fair one. Fairly, for me.'), L("I'll take it. I'll take anything, dear. It's a gift.")];
export const QUILL_MIS = ['A fossil! Or a very confident potato!', 'A sculpture! Of what? Of a fossil!', 'A rare mineral! Or a pebble with ambition!', 'A fish! Or someone\'s idea of one!', 'An insect! Or a raisin with legs!'];
export const HOST_LINES = {
  clementine: [L('Your letter\'s stamped. A bee has been living in the stamp drawer. We\'ve agreed to share.'), L('The bee has opinions on the town rating. I defer.')],
  trundle: [L('I declare this... ribbon... cut. Has anyone... seen... the ribbon? It was here... in March.'), L('Good morning. Or... evening. I... was... en route.')],
  rind: [L('Psst. Wheel of cheese? It only goes up. Mostly. Until it goes off.'), L('A wheel today, a fortune on Thursday. Or a smell.')],
  vesper: [L('Sit anywhere, friend. I\'d offer you a chair, but I\'m using the ceiling.'), L('That\'s how the notes fall out. Upside down.')],
  fleece: [L('Mon cher! Sit. Your hair is a rumour. Let us make it a fact.'), L('Every cut has a story. This one has gossip.')],
  flavia: [L('Darling. Stand in better lighting. No. Further. Keep going.'), L('Plumes are earned, darling. Not given. Rarely given.')],
  magda: [L('One hundred percent genuine, and only forty percent stolen.'), L('Look closely. Closely. Not that closely. Pay.')],
  bellows: [L('Welcome to the Palace, dear heart! Tonight, tragedy. Mostly the seating.'), L('Laugh at the right moment. Or the wrong one. The right wrong one.')],
  pemberton: [L('Welcome to Pemberton\'s lots lots lots! Bid bid bid! Going once going twice!'), L('Paddles up! Opinions down! Next lot!')],
  brisket: [L('Brisket. Better Burrows Bureau. I have thoughts about your coat rack.'), L('Show me your home. Then I\'ll show you my face.')],
  lou: [L('...coffee.'), L('...hello. ...or goodbye.')],
  nibbles: [L('I see a tall stranger. He\'s holding... (chew) ...that part\'s gone now. Good luck, though.'), L('Your future is... delicious. I mean ambiguous.')],
  quill: [L('Is it a fossil? It\'s a fossil! Or a very confident potato! Either way, it goes in the hall!'), L('Welcome! I can see you. Roughly. Ah, you are a lamp. Hello, lamp!')],
  mothwick: [L('Darling, hems! Trims! Dramas! I\'ve cried on the velvet again.'), L('Pattern, my dear? A pattern says: I have *thoughts*.')],
  hester: [L('End of the line? Nobody gets off there on purpose.'), L('Mind the gap. And the other gap. We have gaps.')],
  pimm: [L('Pimm. Department of Continuity. You left. No bed. No goodbye. Do you know what that does to a Tuesday?'), L('Pimm again. I have *notes*. Three pages. Both sides.'), L('Third visit. Do you sleep? Ever? In a bed?'), L('...Fine. Carry on. I have a filing cabinet to attend to. It\'s a home. It\'s lonely.')],
  gran: [L('Dear {player}, I hope you are eating. I am fine. Do not worry about me. Worry at a respectful distance.')],
};
export const BUS_VERSES = [
  'Oh, you fished up an old boot and you sold it for ten, and you\'d do it, you\'d do it, you\'d do it again.',
  'Oh, you shook a pear tree and a wasp came out, and the town said nothing, but the town was about.',
  'Oh, you dug up a fossil, or maybe a spud, and the doctor said "Splendid!" and rolled in the mud.',
  'You owe the goose beans and the goose owes you none, and the interest is rising like the morning sun.',
  'You talked to a wombat who offered you soup, and you said "I\'m fine," but the soup was a group.',
  'You walked through a flower and you tramped on a bloom, and the flower said nothing but it cleared its whole room.',
  'The river runs down and the river runs out, and you stand at the bridge and you wonder about.',
  'A moose in a window, a goose with a pen, you came here for nothing and you\'re back here again.',
];
export const CHORUS = ['Oh, the bus goes round, and the bus goes through, and it knows where you\'re going, and it\'s taking you too.'];
export function renderLine(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}
export function whenOk(when, ctx) {
  if (!when) return true;
  if (when.season != null && when.season !== ctx.season) return false;
  if (when.weather) { const w = ctx.weather; if (when.weather === 'rain' ? !(w === 'rain' || w === 'storm') : when.weather !== w) return false; }
  if (when.hour) { const h = ctx.hour < 5 ? ctx.hour + 24 : ctx.hour; if (h < when.hour[0] || h >= when.hour[1]) return false; }
  if (when.friendMin != null && (ctx.friend ?? 0) < when.friendMin) return false;
  if (when.memory && !(ctx.memories ?? []).includes(when.memory)) return false;
  return true;
}
// ---- Composed banks: each type has its own openers, shared observations, and its tic, so every neighbour has well over a hundred distinct lines.
const OPEN = {
  hearth: ['Sit, sit.', 'You look hungry.', 'Mind the pots.', 'Wipe your feet, hon, and your worries.', 'I was just thinking of you.', 'There is always room.', 'Pull up a stool.', 'Taste this.'],
  sunshine: ['Hi hi hi!', 'Oh! It\'s you!', 'Guess what!', 'I was just about to wave!', 'You came over!', 'Today is going so well!', 'Look at this sky!', 'I love this!'],
  grouch: ['Hm.', 'Oh. You.', 'Quietly, please.', 'I was having a moment.', 'Mind the silence.', 'That\'s my spot.', 'Make it brief.', 'Fine.'],
  diva: ['Ah, darling.', 'How *delightful*.', 'Do come into the light.', 'Mind the rug.', 'I was composing myself.', 'A visitor. Gracious.', 'Do stand there.', 'Applause is optional.'],
  gogetter: ['Hey, champ!', 'Hydrate!', 'Stretch it out!', 'Feel that air!', 'You look ready!', 'One more rep!', 'Warm-up time!', 'Look sharp!'],
  dreamer: ['Oh... hello.', 'Hush, listen.', 'I was counting stars.', 'The sky is thinking.', 'Do you hear that?', 'I dreamed about you.', 'Walk slowly.', 'The wind said something.'],
  schemer: ['Psst.', 'Come closer.', 'Careful who hears.', 'I have a theory.', 'Keep your voice down.', 'You didn\'t see me.', 'Interesting timing.', 'I noticed something.'],
  auntie: ['Come here, hon.', 'Oh, look at you.', 'Sit, sit.', 'I\'ve got news.', 'Have you eaten, hon?', 'Pass me that yarn.', 'You\'ve got that look.', 'Listen, hon.'],
  hustler: ['Hey, friend.', 'Got a minute?', 'Special offer.', 'Don\'t look at the box.', 'Best price in town.', 'Quick deal.', 'Between you and me.', 'Eyes on the goods.'],
};
const OBS = [
  'The river sounds different today.', 'Mrs. Gander counted the lamp posts again.', 'The Mayor is closer to the plaza than he was yesterday. I measured.', 'I think the bus is lonely.', 'Someone left a pear on the bench. I did not eat it. I thought about it.',
  'The weeds are plotting something.', 'The Old Bell has a certain tone this hour.', 'A bug watched me for ten minutes. I think we are friends.', 'The museum smells of dust and ambition.', 'The City has too many neon letters. And not enough soup.',
  'I saw Yolanda knitting something enormous.', 'I counted three clouds. One was smug.', 'The beach is quiet. Suspiciously. Beaches are never quiet.', 'The notice board has a new corner of paper on it.', 'I think my house is getting smaller. Or I am.',
  'Do you ever think about how many fish there are?', 'The pond has a bad attitude today.', 'Somebody planted a flower where I was going to stand.', 'I found a shell and gave it the day off.', 'The Lighthouse blinked at me. I blinked back. It was awkward.',
  'The grass here is very grass-like.', 'I saw a moth hold a meeting at the lamp.', 'A snail passed me. Then the Mayor. In that order.', 'The wind has opinions about hats.', 'Everything is a little bit on loan around here.',
];
const SEEN = {};
export function composedLines(type, tic) {
  const out = []; const op = OPEN[type] ?? OPEN.hearth; for (const o of op) for (const b of OBS) out.push(L(`${o} ${b}${tic ? ' ' + tic : ''}`, {}, 0.12)); return out;
}
export function allLineCount() { let n = 0; for (const t of Object.keys(OPEN)) n += composedLines(t, '').length; return n; }
