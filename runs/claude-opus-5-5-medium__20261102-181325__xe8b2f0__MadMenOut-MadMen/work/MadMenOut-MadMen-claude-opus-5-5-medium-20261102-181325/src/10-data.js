/* MAD MEN OUT — data: the cast, the clients, the insights and three days at Bellweather & Crane.
 * Everything a designer changes lives here as plain data: add a day, a client, a card or a line without touching code. */

/* ---- THE CAST: HD rigs in suits and dresses of 1962 ---- */
const SUIT = (coat, pants, shirt, tie, o = {}) => ({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', ...o,
  colors: { skin: '#f0c8a4', coat, pants, cloth: coat, trim: shirt, belt: tie, boot: '#141012', glove: '#f0c8a4', ...(o.colors || {}) } });
const DRESS = (cloth, hair, o = {}) => ({ size: 1.22, build: 'heroic', weapon: null, outfit: 'robe', sleeves: o.sleeves || 'short', hair: o.hair || 'long', face: { bangs: o.bangs || .5 }, ...o,
  colors: { skin: '#f4cca8', hair, cloth, pants: cloth, trim: o.trim || '#f4ecd8', belt: o.belt || '#1a1414', boot: '#2a1a1a', ...(o.colors || {}) } });
const CAST = {
  jack: { name: 'JACK CALLOWAY', voice: 'jack', rig: () => new E.Humanoid(SUIT('#2e3238', '#2a2d32', '#f2f0ea', '#1e2a3a', { hair: 'short', colors: { hair: '#1e1610' } })) },
  monty: { name: 'MONTY CRANE', voice: 'monty', rig: () => new E.Humanoid(SUIT('#3a4458', '#343c4e', '#f4f2ec', '#8a2a2a', { hair: 'short', colors: { hair: '#e8e4dc', skin: '#f0c0a0' } })) },
  ruth: { name: 'RUTH KOWALSKI', voice: 'ruth', rig: () => new E.Humanoid(DRESS('#b08a3a', '#6a4020', { hair: 'ponytail', bangs: .9, sleeves: 'long', trim: '#5a3a20', colors: { skin: '#f6d2b0' } })) },
  dolores: { name: 'DOLORES FITCH', voice: 'dolores', rig: () => new E.Humanoid(DRESS('#a82838', '#d86a2a', { hair: 'long', bangs: .3, trim: '#e8c860', belt: '#e8c860' })) },
  theo: { name: 'THEO BARROW', voice: 'theo', rig: () => new E.Humanoid(SUIT('#4a6a8a', '#3a5470', '#f4f2ec', '#c8a040', { hair: 'short', size: 1.24, colors: { hair: '#8a6a3a' } })) },
  eddie: { name: 'EDDIE LAURENT', voice: 'eddie', rig: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short',
    colors: { skin: '#e8bc94', hair: '#2a1a12', cloth: '#e8e0cc', pants: '#5a4a3a', trim: '#7a2a2a', belt: '#2a1a12', boot: '#2a1a12' } }) },
  bell: { name: 'MR. BELLWEATHER', voice: 'bell', rig: () => new E.Humanoid(SUIT('#5a5248', '#4a443c', '#f4f0e4', '#2a4a2a', { hair: 'bald', hunch: .3, colors: { hair: '#d8d4cc', skin: '#ecc4a4' } })) },
  joyce: { name: 'JOYCE', voice: 'joyce', rig: () => new E.Humanoid(DRESS('#4a8a8a', '#e8c870', { hair: 'short', bangs: 1 })) },
  marcy: { name: 'MARCY', voice: 'marcy', rig: () => new E.Humanoid(DRESS('#c87aa0', '#3a2418', { hair: 'ponytail', bangs: .7 })) },
  peg: { name: 'PEG', voice: 'marcy', rig: () => new E.Humanoid(DRESS('#5a6aa8', '#a86a3a', { hair: 'long', bangs: .4 })) },
  lenny: { name: 'LENNY DORSETT', voice: 'lenny', rig: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#4a3a2a' },
    colors: { skin: '#e8b890', hair: '#5a3a22', coat: '#6a5a3a', pants: '#4a4232', cloth: '#c8b890', trim: '#6a2a1a', boot: '#2a1a12' } }) },
  // clients
  marchand: { name: 'MRS. MARCHAND', voice: 'clientF', rig: () => new E.Humanoid(DRESS('#1e1e28', '#e8dcc8', { hair: 'short', bangs: .2, sleeves: 'long', trim: '#f4f0f0', colors: { skin: '#f2cdb0' } })) },
  hale: { name: 'MR. HALE', voice: 'client', rig: () => new E.Humanoid(SUIT('#5a6068', '#4a5058', '#e8f0f4', '#2a4a8a', { hair: 'short', colors: { hair: '#4a3a2a' } })) },
  pruitt: { name: 'MR. PRUITT', voice: 'monty', rig: () => new E.Humanoid(SUIT('#3a3a3a', '#323232', '#f4f4f0', '#6a1a2a', { hair: 'bald', build: 'bulky', size: 1.28, colors: { hair: '#c8c0b0' } })) },
  august: { name: 'AUGUST KESSLER', voice: 'bell', rig: () => new E.Humanoid(SUIT('#4a3a2e', '#3e3228', '#f0ece0', '#5a1a1a', { hair: 'short', hunch: .25, colors: { hair: '#f0ece4' } })) },
  rolf: { name: 'ROLF KESSLER', voice: 'theo', rig: () => new E.Humanoid(SUIT('#2a4a4a', '#223c3c', '#f4f4ee', '#e8a040', { hair: 'spiky', colors: { hair: '#e0c070' } })) },
  // the Pitch Gauntlet's clients (AI Hub and the two-player Pitch-Off)
  gC1: { name: 'MR. OKAFOR', voice: 'client', rig: () => new E.Humanoid(SUIT('#3a3a52', '#30304a', '#f4f4f0', '#c8a040', { hair: 'short', colors: { skin: '#8a5a3a', hair: '#1a1210', glove: '#8a5a3a' } })) },
  gC2: { name: 'MISS VALE', voice: 'clientF', rig: () => new E.Humanoid(DRESS('#2a7a6a', '#1a1414', { hair: 'long', bangs: .8 })) },
  gC3: { name: 'MR. DUBOIS', voice: 'client', rig: () => new E.Humanoid(SUIT('#6a4a3a', '#5a3e30', '#f0ece0', '#2a2a2a', { hair: 'short', colors: { hair: '#8a8a8a' } })) }
};
const rigs = {};
const rigOf = id => rigs[id] || (rigs[id] = CAST[id].rig());

/* ---- INSIGHTS: each a card with an angle (what it sells), a power (1-3) and the line it adds to the tagline ---- */
const CARDS = {
  // Monday: Belle Rouge
  signature: { title: 'Her Own Signature', angle: 'FREEDOM', power: 3, line: 'Make your mark.', from: 'Ruth', text: 'A woman puts on lipstick for herself. It is the one thing in her day that nobody else writes.' },
  stopsign: { title: 'Red Like a Stop Sign', angle: 'DESIRE', power: 2, line: 'Stop traffic.', from: 'Eddie', text: 'Eddie\'s sketch: a mouth in Belle Rouge red, and every car on Fifth Avenue braking.' },
  pearls: { title: 'Pearls in Every Picture', angle: 'STATUS', power: 1, line: 'As worn on Fifth Avenue.', from: 'A magazine', text: 'Every woman in Ladies\' Home Monthly wears pearls. They all look like they own the building.' },
  powder: { title: 'The Powder Room', angle: 'FREEDOM', power: 2, line: 'Five minutes that are yours.', from: 'Overheard', text: 'The girls touch up in the powder room. It is the only door in the building they can lock.' },
  vanity: { title: 'Mother\'s Vanity', angle: 'NOSTALGIA', power: 2, line: 'Like your mother wore it, only braver.', from: 'Monty', text: 'Monty remembers his mother\'s vanity table: a lipstick, a hand mirror, and a woman he never met.' },
  crossing: { title: 'Against the Light', angle: 'DESIRE', power: 1, line: 'Cross against the light.', from: 'The window', text: 'Down on Madison, a woman in red crosses against the light. Three cabs stop for her.' },
  smudge: { title: 'Won\'t Smudge', angle: 'SAFETY', power: 2, line: 'Stays on until midnight.', from: 'Theo', text: 'Theo\'s research: the long-wear formula tested best. Women want it to last.' },
  // Wednesday: Skylark Airways
  window: { title: 'The Window Seat', angle: 'NOSTALGIA', power: 2, line: 'Bring the whole family home.', from: 'Ruth', text: 'A child with her nose to the window, waving at a town that is waving back.' },
  wings: { title: 'Silver Wings', angle: 'STATUS', power: 2, line: 'First class is a state of mind.', from: 'Eddie', text: 'Eddie\'s sketch: a wing like a cufflink, catching the sun over the clouds.' },
  calm: { title: 'The Stewardess\'s Calm', angle: 'SAFETY', power: 3, line: 'Relax. We have it from here.', from: 'Joyce', text: 'Joyce\'s sister flies for Pan Am. The trick, she says, is to smile as if nothing could ever go wrong.' },
  hands: { title: 'A Pilot\'s Hands', angle: 'SAFETY', power: 2, line: 'Steady hands since 1946.', from: 'Mr. Bellweather', text: 'Bellweather flew bombers in the war. "A good pilot\'s hands never shake. Not once."' },
  martini: { title: 'Martini at 30,000 Feet', angle: 'DESIRE', power: 2, line: 'Cocktails above the clouds.', from: 'Monty', text: 'Monty\'s idea of flying: a stiff drink and a long view, and nobody can call you.' },
  contrail: { title: 'Contrails', angle: 'FREEDOM', power: 2, line: 'Go anywhere. Go tonight.', from: 'The window', text: 'A white line drawn across the blue, as if someone just signed the sky.' },
  oldname: { title: 'An Old Name', angle: 'NOSTALGIA', power: 3, line: 'Wherever home is, we know the way.', from: 'Lenny', text: 'Lenny remembered the farmhouse, the creek, the boy you were. Home is a word you have to earn.' },
  // Friday: Kessler Motors
  openroad: { title: 'The Open Road', angle: 'FREEDOM', power: 3, line: 'Leave the city behind.', from: 'Ruth', text: 'Ruth\'s brother drove to California with forty dollars and a Kessler. He never came back. He sends postcards.' },
  ruthline: { title: 'Ruth\'s Headline', angle: 'DESIRE', power: 3, line: 'Built to be looked at.', from: 'Ruth', text: 'Ruth slipped a page under your door: three words, underlined twice.' },
  chrome: { title: 'Chrome Smile', angle: 'DESIRE', power: 2, line: 'It smiles back at the street.', from: 'Eddie', text: 'Eddie drew the grille as a grin. Even the hubcaps look pleased with themselves.' },
  barn: { title: 'The Barn in 1919', angle: 'NOSTALGIA', power: 3, line: 'Made by hand since 1919.', from: 'Mr. Bellweather', text: 'Bellweather knew August Kessler when the factory was a barn and the car was a bet.' },
  doctor: { title: 'The Doctor\'s Driveway', angle: 'STATUS', power: 2, line: 'The car in the doctor\'s driveway.', from: 'Theo', text: 'Theo\'s dealer figures: Kesslers sell to doctors, lawyers, and the men who want to be mistaken for them.' },
  hotrod: { title: 'Ninety on the Turnpike', angle: 'FREEDOM', power: 2, line: 'Ninety on an empty highway.', from: 'A magazine', text: 'Hot Rod Monthly: the boys strip the chrome off and race them at dawn.' },
  father: { title: 'My Father\'s Car', angle: 'NOSTALGIA', power: 2, line: 'Your father\'s handshake. Your own road.', from: 'Overheard', text: 'Peg, to Marcy: "My dad had one. He let me steer it once, in the church lot."' },
  turnpike: { title: 'Rush Hour', angle: 'SAFETY', power: 1, line: 'Tested on the Turnpike.', from: 'The window', text: 'Bumper to bumper on Park Avenue. Nobody honks at a Kessler.' },
  // the Pitch Gauntlet's pool
  g1: { title: 'Sunday Morning', angle: 'NOSTALGIA', power: 2, line: 'Like Sunday morning, every morning.' },
  g2: { title: 'The Corner Office', angle: 'STATUS', power: 2, line: 'For the man who has arrived.' },
  g3: { title: 'Midnight Swim', angle: 'FREEDOM', power: 2, line: 'Nobody has to know.' },
  g4: { title: 'Locked and Bolted', angle: 'SAFETY', power: 2, line: 'Sleep through the night.' },
  g5: { title: 'A Second Look', angle: 'DESIRE', power: 2, line: 'Worth turning around for.' },
  g6: { title: 'Grandmother\'s Recipe', angle: 'NOSTALGIA', power: 3, line: 'The way it was always made.' },
  g7: { title: 'The Country Club', angle: 'STATUS', power: 3, line: 'Membership has its rewards.' },
  g8: { title: 'Highway West', angle: 'FREEDOM', power: 3, line: 'Keep driving.' },
  g9: { title: 'The Family Doctor', angle: 'SAFETY', power: 3, line: 'Trusted in every house on the street.' },
  g10: { title: 'Red Dress', angle: 'DESIRE', power: 3, line: 'Make them wonder.' },
  g11: { title: 'Small Town Parade', angle: 'NOSTALGIA', power: 1, line: 'Remember the parade?' },
  g12: { title: 'Seat at the Table', angle: 'STATUS', power: 1, line: 'You belong here.' }
};
const INTEL = {
  marchand: { title: 'The Pearls Were Hers', text: 'Dolores: Mrs. Marchand started Belle Rouge on her kitchen table the year her husband walked out. She wants FREEDOM, not a man\'s idea of desire.', reveals: { FREEDOM: 2 } },
  landing: { title: 'Emergency Landing', text: 'Theo\'s paper: a Skylark Electra came down hard in Ohio on Monday. Nobody hurt. Hale will want SAFETY, and adventure will frighten him.', reveals: { SAFETY: 2, FREEDOM: -1 } },
  pruitt: { title: 'Pruitt\'s Daughters', text: 'Monty: old Pruitt has five grandchildren and never stops showing their pictures. Families flying home: NOSTALGIA.', reveals: { NOSTALGIA: 1 } },
  august: { title: 'The Old Man\'s Pride', text: 'Monty: August Kessler built the first car in a barn in 1919. He wants STATUS earned and NOSTALGIA honored.', reveals: { STATUS: 1, NOSTALGIA: 2 } },
  rolf: { title: 'Rolf Races', text: 'Dolores: young Rolf races at Watkins Glen on weekends. He wants FREEDOM and DESIRE, and he is bored stiff by SAFETY.', reveals: { FREEDOM: 2, DESIRE: 1, SAFETY: -1 } }
};

/* ---- THE CLIENTS: wants per angle (2 = what they need, -1 = what puts them off), how many points win them, what the
 * account bills, the tells before a slide, and the turn some take mid-pitch ---- */
const CLIENTS = {
  belle: { company: 'Belle Rouge Cosmetics', product: 'Belle Rouge No. 9 lipstick', people: ['marchand'], value: 400000, need: 60,
    brief: 'A lipstick for the modern woman. The client says "make men look twice."',
    wants: { FREEDOM: 2, DESIRE: 1, STATUS: 1, NOSTALGIA: 0, SAFETY: -1 },
    tells: ['Mrs. Marchand turns a ring on her right hand. Not a wedding ring. Not anymore.', 'She glances at the door, as if someone might come in and tell her what to do.', 'She taps her own business card on the table. Her name, not her husband\'s.'],
    hello: ['Mr. Calloway. Everyone tells me what women want. I\'m hoping you won\'t.'], yes: 'Well. You made me feel like I signed something. We have a deal.', no: 'It\'s very nice. It\'s very much what my husband would have bought. Good afternoon.' },
  skylark: { company: 'Skylark Airways', product: 'Skylark\'s new jet service', people: ['hale', 'pruitt'], value: 1200000, need: 68,
    brief: 'Jet service to eleven cities. The client says "sell the glamour of the jet age."',
    wants: { SAFETY: 2, STATUS: 1, NOSTALGIA: 0, DESIRE: 0, FREEDOM: -1 }, turn: { after: 1, who: 'pruitt', line: 'Hale\'s worried about Ohio. I\'m worried about families. Who flies home for Thanksgiving?', wants: { NOSTALGIA: 2 } },
    tells: ['Mr. Hale folds the newspaper so the front page faces down.', 'Mr. Pruitt shows Hale a photograph from his wallet. Hale nods without looking.', 'Hale grips the arm of his chair the way men do at take-off.'],
    hello: ['Let\'s keep this short, Calloway. We have the press at five.', 'Gordon\'s nervous. I\'m not. Show us something.'], yes: 'That\'s it. That\'s the feeling. Draw up the papers.', no: 'Glamour. Fine. We\'ll think about it. Don\'t call us.' },
  kessler: { company: 'Kessler Motors', product: 'the 1963 Kessler Constellation', people: ['august', 'rolf'], value: 3000000, need: 74,
    brief: 'The new Constellation sedan. Father and son disagree about everything, including this.',
    wants: { STATUS: 1, NOSTALGIA: 2, FREEDOM: 1, DESIRE: 1, SAFETY: -1 }, split: { august: { STATUS: 2, NOSTALGIA: 2, FREEDOM: 0, DESIRE: 0, SAFETY: 1 }, rolf: { FREEDOM: 2, DESIRE: 2, NOSTALGIA: 0, STATUS: 0, SAFETY: -1 } },
    tells: ['August Kessler studies his own hands. They built the first one.', 'Rolf drums his fingers on the table at highway speed.', 'Father and son have not looked at each other since they sat down.'],
    hello: ['My son thinks your agency is old-fashioned, Mr. Calloway.', 'I think your agency is old-fashioned. Prove me wrong.'], yes: 'You got us both to nod at the same time. That hasn\'t happened since 1949. Shake my hand.', no: 'We\'ll take the account to Chicago. They speak plainly there.' },
  // the gauntlet
  gA: { company: 'Okafor Coffee Co.', product: 'Okafor Instant Coffee', people: ['gC1'], value: 500000, need: 60, wants: { NOSTALGIA: 2, SAFETY: 1, STATUS: 0, DESIRE: 0, FREEDOM: -1 },
    tells: ['Mr. Okafor sniffs the coffee on the table and smiles at something far away.'], hello: ['Coffee is a ritual, Mr. Calloway. Sell me the ritual.'], yes: 'A ritual. Yes. Let\'s do it.', no: 'That\'s an advertisement. I wanted a reason.' },
  gB: { company: 'Vale Swimwear', product: 'the Vale two-piece', people: ['gC2'], value: 700000, need: 62, wants: { FREEDOM: 2, DESIRE: 1, STATUS: 0, NOSTALGIA: -1, SAFETY: 0 },
    tells: ['Miss Vale kicks off one shoe under the table.'], hello: ['My mother says this swimsuit is a scandal. Good.'], yes: 'Scandalous. Perfect.', no: 'You sound like my mother.' },
  gC: { company: 'Dubois Locks', product: 'the Dubois deadbolt', people: ['gC3'], value: 450000, need: 60, wants: { SAFETY: 2, STATUS: 1, NOSTALGIA: 0, DESIRE: -1, FREEDOM: 0 },
    tells: ['Mr. Dubois checks that the door is shut behind him.'], hello: ['Every night I check the locks twice. Tell me why.'], yes: 'I will sleep well tonight. Agreed.', no: 'I don\'t trust it.' },
  gD: { company: 'Atlas Cigars', product: 'Atlas Maduro cigars', people: ['gC1'], value: 650000, need: 64, wants: { STATUS: 2, NOSTALGIA: 1, DESIRE: 0, SAFETY: -1, FREEDOM: 0 },
    tells: ['He rolls an unlit cigar between finger and thumb.'], hello: ['A cigar is a reward. For what, Mr. Calloway?'], yes: 'Light one up. We\'re in business.', no: 'You sell it like gum.' },
  gE: { company: 'Starlight Television', product: 'the Starlight color set', people: ['gC2'], value: 900000, need: 66, wants: { DESIRE: 2, STATUS: 1, FREEDOM: 0, NOSTALGIA: 0, SAFETY: 0 },
    tells: ['She keeps glancing at the gray screen in the corner.'], hello: ['Color television. Make them need it.'], yes: 'I can see it already. In color.', no: 'Black and white thinking.' },
  gF: { company: 'Dubois Insurance', product: 'family life insurance', people: ['gC3'], value: 800000, need: 64, wants: { SAFETY: 2, NOSTALGIA: 1, STATUS: 0, DESIRE: -1, FREEDOM: -1 },
    tells: ['He turns his wedding ring around and around.'], hello: ['Nobody wants to think about dying. Make them.'], yes: 'You made me call my wife. Signed.', no: 'Too cheerful. Too cheap.' }
};

/* ---- THE DAYS: a client, the clock, who stands where, what they say, what can be looked at, and what happens when ---- */
// spots are cells on the office map (20-office.js): [cx, cy, facing]; talk: the conversation (once a day: it takes the
// clock forward); idle: what they say after that. A choice's effect: { rapport, composure, card, intel, flag, minutes, haze }
const DAYS = [
  { id: 'monday', title: 'MONDAY', subtitle: 'The Lipstick Question', date: 'Monday, October 8, 1962', client: 'belle', start: 540, pitchAt: 900,
    morning: [['dolores', 'Mr. Calloway. Belle Rouge is coming at three. Mrs. Marchand herself. Mr. Crane would like a campaign, not a philosophy.'],
      ['jack', 'Then I\'d better find one. Who\'s in?'], ['dolores', 'Everyone you need, and a few you don\'t. Talk to them. Look around. The clock is ticking, and so am I.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['They say Mrs. Marchand wears pearls to bed.', 'Do you want gossip, Mr. Calloway, or do you want to win?'], choices: [
        { label: 'I want to win.', lines: [['dolores', 'Then here is something real. She built Belle Rouge on her kitchen table, the year her husband walked out.'], ['dolores', 'Every man who has pitched her since has sold her a husband. Don\'t.']], fx: { intel: 'marchand', rapport: 1, minutes: 30 } },
        { label: 'Gossip is how this town wins.', lines: [['dolores', 'Then you\'ll lose like everyone else. Charmingly, I\'m sure.']], fx: { rapport: -1, minutes: 15 } }] },
        idle: ['Three o\'clock, Mr. Calloway. The conference room.', 'Don\'t loosen your tie until you\'ve won.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['Mr. Calloway? I had a thought about the lipstick. It\'s probably nothing.'], choices: [
        { label: 'Nothing is my favorite thing. Go on.', lines: [['ruth', 'Women don\'t put it on for men. Not really. It\'s the one thing in the morning nobody else decides for you.'], ['jack', 'That\'s not nothing, Ruth. That\'s the campaign.']], fx: { card: 'signature', rapport: 1, minutes: 30 } },
        { label: 'Write it up. I\'ll read it later.', lines: [['ruth', 'Yes, Mr. Calloway.'], ['narrator', 'She folds the page twice and puts it in her pocket.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I\'m working on taglines. Badly.', 'Peg says the powder room is the best office in the building.'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['I drew a mouth. Just a mouth, Jack. Red as a stop sign.'], choices: [
        { label: 'Show me.', lines: [['eddie', 'Every car on Fifth Avenue, brakes on. Because of her.'], ['jack', 'Keep it. It\'s loud, but loud sells.']], fx: { card: 'stopsign', rapport: 1, minutes: 30 } }] },
        idle: ['I need a cigarette and a better pencil.', 'Mr. Crane wants everything in blue. Blue! For lipstick!'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack! Pour yourself one. Lipstick, is it? My mother wore a shade called Scandal.'], choices: [
        { label: 'Tell me about her.', lines: [['monty', 'She sat at her vanity every night for an hour. I used to watch from the door. It was the only hour she was happy.'], ['monty', 'Good God, I\'m maudlin before lunch. Take it, it\'s yours.']], fx: { card: 'vanity', rapport: 1, minutes: 30 } },
        { label: 'Pour me one.', lines: [['monty', 'Now that\'s a creative director.'], ['narrator', 'The rye is warm, and the morning gets softer around the edges.']], fx: { haze: 1, composure: 15, rapport: 1, minutes: 20 } }] },
        idle: ['Go win something. I\'ll be here, holding down the sofa.', 'Have you met my good friend, the afternoon?'] },
      theo: { at: [27, 15, 3.14], talk: { lines: ['Calloway. I ran the numbers on Belle Rouge, since nobody asked.'], choices: [
        { label: 'What do they say?', lines: [['theo', 'The long-wear formula tested best. It doesn\'t smudge. Women want it to last.'], ['theo', 'You\'re welcome. I\'ll be expecting my name on the next account.']], fx: { card: 'smudge', rapport: 1, minutes: 30 } },
        { label: 'Nobody asked for a reason, Theo.', lines: [['theo', 'Someday somebody will ask me first. You\'ll remember this.']], fx: { rapport: -1, composure: -5, minutes: 10 } }] },
        idle: ['My father-in-law plays golf with half your clients.', 'Numbers don\'t lie, Calloway. People do.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['Mr. Calloway. Sit. The bonsai and I were discussing patience.'], choices: [
        { label: 'What does it say?', lines: [['bell', 'That a thing becomes beautiful by what you cut away. Remember that at three o\'clock.'], ['narrator', 'You feel strangely calmer.']], fx: { composure: 20, rapport: 1, minutes: 30 } }] },
        idle: ['Patience, Mr. Calloway.', 'The founder of an agency is a man who has stopped working.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['Bellweather and Crane, good morning.', 'Your eleven o\'clock canceled, Mr. Calloway. You don\'t have an eleven o\'clock.'] },
      joyce: { at: [16, 13, -1.57], talk: null, idle: ['The coffee\'s fresh. That\'s the nicest thing I\'ll say today.'] },
      peg: { at: [18, 13, -1.57], talk: null, idle: ['Typing, typing, typing.'] }
    },
    overhear: { a: 'joyce', b: 'peg', card: 'powder', lines: ['JOYCE: Where do you go when it gets to be too much?', 'PEG: The powder room. Lock the door, fix my face. Five minutes that are mine.'] },
    looks: [
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: 'pearls', minutes: 15, text: 'Ladies\' Home Monthly. Every woman in every photograph wears pearls, and every one of them looks like she owns the building.' },
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'crossing', minutes: 15, text: 'Madison Avenue, eleven floors down. A woman in red crosses against the light, and three cabs stop for her.' }
    ],
    events: [{ at: 690, kind: 'phone', who: 'marchand', lines: [['narrator', 'The phone on your desk rings.'], ['clientF', 'Mr. Calloway? Celeste Marchand\'s office. She\'d like to move the meeting up to two o\'clock.'], ['clientF', 'And Mr. Calloway, she asked me to say: no pearls. She has enough pearls.']], fx: { pitchAt: 840 }, missed: [['dolores', 'Mrs. Marchand\'s office called while you were away. They\'ve moved it up to two.']] }],
    close: ['Women have been told what to want for a hundred years.', 'They\'ve been told by magazines, by husbands, and by men like me.', 'Belle Rouge doesn\'t tell her anything.', 'It hands her the pen.'],
    evening: 'bar'
  },
  { id: 'wednesday', title: 'WEDNESDAY', subtitle: 'Clear Skies', date: 'Wednesday, October 10, 1962', client: 'skylark', start: 540, pitchAt: 900,
    morning: [['dolores', 'Skylark Airways at three, Mr. Calloway. Mr. Hale and Mr. Pruitt. They want "the glamour of the jet age."'],
      ['jack', 'Everybody wants glamour. Nobody wants to pay for the fuel.'], ['dolores', 'And a man was asking for you downstairs. He called you "Walt." I told him there was no Walt here.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['Mr. Calloway. That man in the lobby is still there.'], choices: [
        { label: 'Tell him I\'m in a meeting.', lines: [['dolores', 'I already did. Three times. He said he\'d wait. He has the patience of a man with nowhere to be.']], fx: { minutes: 10 } },
        { label: 'What else do you know about Skylark?', lines: [['dolores', 'Only that Mr. Hale has called twice to ask if the press will be at the meeting. He sounds like a man waiting for bad news.']], fx: { rapport: 1, minutes: 20, composure: 5 } }] },
        idle: ['Three o\'clock. And do something about that man.', 'Mr. Barrow has been very curious this morning.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['When I was little we flew to my aunt\'s in Buffalo. I pressed my nose to the window the whole way.'], choices: [
        { label: 'What did you see?', lines: [['ruth', 'Our town. I waved at it. I swear it waved back.'], ['jack', 'Write that down, Ruth. Exactly like that.']], fx: { card: 'window', rapport: 1, minutes: 30 } },
        { label: 'Glamour, Ruth. Think glamour.', lines: [['ruth', 'Yes, Mr. Calloway. Glamour.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I keep thinking about that window.', 'Do men like you ever fly coach?'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['Silver, Jack. The whole campaign in silver. A wing like a cufflink.'], choices: [
        { label: 'It\'s beautiful. Keep it.', lines: [['eddie', 'Beautiful is what I do. Selling is what you do.']], fx: { card: 'wings', rapport: 1, minutes: 30 } }] },
        idle: ['Silver ink is twice the price. Worth it.'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack, my boy. I\'ve flown Skylark. The martinis are better than the landings.'], choices: [
        { label: 'Tell me about Pruitt.', lines: [['monty', 'Old Pruitt? He\'s got five grandchildren and their pictures in every pocket. Show him a family and he\'ll sign anything.']], fx: { intel: 'pruitt', rapport: 1, minutes: 30 } },
        { label: 'Martinis, then.', lines: [['monty', 'Cocktails above the clouds! Nobody can call you up there.'], ['narrator', 'He pours two. You drink one.']], fx: { card: 'martini', haze: 1, composure: 10, minutes: 30 } }] },
        idle: ['The sky is just a bar with a better view.'] },
      theo: { at: [27, 15, 3.14], talk: { lines: ['Did you see the paper, Calloway? Skylark put a plane down in a cornfield in Ohio.'], choices: [
        { label: 'Let me see that.', lines: [['theo', 'Page six. Nobody hurt. But Hale\'s been sweating through his shirts all week.'], ['theo', 'Funny thing. There\'s a man in the lobby who says he knew you in Pennsylvania. He called you Walt.']], fx: { intel: 'landing', minutes: 30, flag: 'theoCurious', composure: -10 } }] },
        idle: ['Pennsylvania, he said. Isn\'t that funny.', 'I wonder what Mr. Crane would think.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['I flew B-17s over Germany, Mr. Calloway. Did you know that?'], choices: [
        { label: 'What was it like?', lines: [['bell', 'Terrifying. But a good pilot\'s hands never shook. Not once. The men in the back watched our hands.']], fx: { card: 'hands', rapport: 1, minutes: 30 } }] },
        idle: ['Steady hands, Mr. Calloway.'] },
      joyce: { at: [4, 22, 0], talk: { lines: ['My sister flies for Pan Am. Isn\'t that something?'], choices: [
        { label: 'What does she say about it?', lines: [['joyce', 'She says the trick is to smile like nothing could ever go wrong. Even when the wing is on fire. Especially then.']], fx: { card: 'calm', rapport: 0, minutes: 20 } }] },
        idle: ['The percolator\'s on its last legs. Like me.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['That man by the elevator says he\'ll wait all day.'] },
      peg: { at: [18, 21, 3.14], talk: null, idle: ['Buzz, buzz. Everyone\'s talking about the man in the lobby.'] },
      lenny: { at: [27, 23, 3.14], talk: { lines: ['Walt? Walt Penn! Look at you. A suit like a senator.'], choices: [
        { label: 'Lenny. Not here. Walk with me.', lines: [['lenny', 'I knew you\'d remember. The farmhouse, the creek, your mother\'s pie on the sill.'], ['lenny', 'I don\'t want anything, Walt. I just wanted to see somebody from home make good.'], ['jack', 'Home is a word you have to earn, Lenny.']], fx: { card: 'oldname', minutes: 60, composure: -15, flag: 'metLenny' } },
        { label: 'You have the wrong man.', lines: [['lenny', 'Sure. Sure I do. You take care, Mr. Calloway.'], ['narrator', 'He puts his hat on and goes. Theo watches him leave.']], fx: { composure: -5, minutes: 10, flag: 'deniedLenny' } },
        { label: 'Here. Take this and go home.', lines: [['narrator', 'You fold two hundred dollars into his hand.'], ['lenny', 'I didn\'t come for money, Walt. But I\'ll take it. God bless.']], fx: { composure: -10, minutes: 15, flag: 'paidLenny' } }] },
        idle: ['Take care, Walt.'] }
    },
    overhear: { a: 'peg', b: 'marcy', card: null, intel: null, lines: ['PEG: Did you hear? Mr. Barrow asked Dolores for Mr. Calloway\'s personnel file.', 'MARCY: What would he want with that?'], flag: 'heardFile' },
    looks: [
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'contrail', minutes: 15, text: 'A contrail crosses the blue over the East River, as if someone just signed the sky.' },
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: null, minutes: 10, text: 'Holiday magazine: "The Jet Set." Every couple in it looks rich, bored and very far from Ohio.' }
    ],
    events: [{ at: 720, kind: 'phone', who: 'lenny', lines: [['narrator', 'The phone on your desk rings.'], ['lenny', 'Walt? It\'s Lenny. The girl downstairs gave me your number. I\'ll be at the Roosevelt till Friday.']], fx: { composure: -5 }, missed: [] }],
    close: ['Flying isn\'t about going anywhere.', 'It\'s about the moment the wheels touch down,', 'and you see the people waiting for you,', 'and you realize you\'re allowed to be happy again.'],
    evening: 'apartment'
  },
  { id: 'friday', title: 'FRIDAY', subtitle: 'The Constellation', date: 'Friday, October 12, 1962', client: 'kessler', start: 540, pitchAt: 900,
    morning: [['dolores', 'Kessler Motors at three. Both of them, father and son. Mr. Crane says if we lose this one, we lose the building.'],
      ['jack', 'No pressure, then.'], ['dolores', 'And Mr. Barrow would like a word. In your office. He looked pleased with himself.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['A word about the Kesslers, Mr. Calloway, since you\'re finally listening.'], choices: [
        { label: 'I\'m listening.', lines: [['dolores', 'The son, Rolf, races at Watkins Glen. He was arrested for it twice. His father paid. Neither of them has forgiven the other.']], fx: { intel: 'rolf', rapport: 1, minutes: 30 } }] },
        idle: ['Three o\'clock. Both of them. God help us.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['My brother drove to California in a Kessler with forty dollars. He never came back.'], choices: [
        { label: 'Was he happy?', lines: [['ruth', 'He sends a postcard every Christmas. Always the same picture: the road, and nothing on it.'], ['jack', 'The open road. That\'s the son. Ruth, you\'re good at this.']], fx: { card: 'openroad', rapport: 1, minutes: 30 } },
        { label: 'Give me something I can sell, Ruth.', lines: [['ruth', 'That was something you could sell, Mr. Calloway.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I slid something under your door. If you want it.'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['Look at this grille, Jack. It\'s grinning. A car with teeth.'], choices: [
        { label: 'Make it grin wider.', lines: [['eddie', 'Wider! A man of taste.']], fx: { card: 'chrome', rapport: 1, minutes: 30 } }] },
        idle: ['Chrome is just silver with ambition.'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack. Close the door. About the Kesslers. And about you.'], choices: [
        { label: 'The Kesslers first.', lines: [['monty', 'The old man built the first car in a barn in 1919. Pride, Jack, and memory. Give him both.']], fx: { intel: 'august', minutes: 30, rapport: 1 } },
        { label: 'Monty, there\'s something you should know about me.', cond: s => !s.flags.confessed && !s.flags.theoTold, lines: [['jack', 'My name wasn\'t always Calloway. I took it. In Korea. From a man who didn\'t need it anymore.'], ['monty', '...'], ['monty', 'Jack, half the men on this avenue are someone else. I\'m the only one who was born a Crane, and look at me.'], ['monty', 'Win me the Kesslers. Then we never talk about this again.']], fx: { flag: 'confessed', composure: -20, rapport: 2, minutes: 45 } }] },
        idle: ['Win me the Kesslers.'] },
      theo: { at: [33, 5, 3.14], talk: { lines: ['Calloway. Or should I say Walter Penn? I had a long talk with your friend from Pennsylvania.', 'Make me head of accounts, today, or Mr. Crane hears all about it.'], choices: [
        { label: 'Fine. Head of accounts.', lines: [['theo', 'I knew you\'d be reasonable. We\'re going to get along, Jack.'], ['narrator', 'He leaves. The room smells of his aftershave for an hour.']], fx: { flag: 'paidTheo', composure: -15, minutes: 20 } },
        { label: 'Go ahead. Tell him.', lines: [['theo', 'You think I won\'t?'], ['jack', 'I think you\'ll find that nobody cares as much as you do, Theo.']], fx: { flag: 'theoTold', composure: -10, minutes: 20 } },
        { label: 'Get out of my office.', lines: [['theo', 'You\'ll regret that. Before five o\'clock, you\'ll regret it.']], fx: { flag: 'theoTold', composure: -20, rapport: -2, minutes: 10 } }] },
        idle: ['Tick tock, Walter.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['August Kessler. I knew him when the factory was a barn and the car was a bet.'], choices: [
        { label: 'Tell me about the barn.', lines: [['bell', 'He slept beside the first engine so nobody would steal it. Every car since has been that engine, polished.']], fx: { card: 'barn', rapport: 1, minutes: 30 } }] },
        idle: ['Old men like to be reminded they were young.'] },
      joyce: { at: [16, 13, -1.57], talk: null, idle: ['Big day. Even the elevator looks nervous.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['The Kesslers are early. They\'re waiting in the car. Both of them, not speaking.'] },
      peg: { at: [18, 21, 3.14], talk: null, idle: ['My father had a Kessler. Funny.'] }
    },
    overhear: { a: 'peg', b: 'marcy', card: 'father', lines: ['PEG: My dad had a Kessler. He let me steer it once, in the church lot.', 'MARCY: Did you crash it?', 'PEG: Into the minister\'s hedge. Dad laughed so hard he cried.'] },
    looks: [
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: 'hotrod', minutes: 15, text: 'Hot Rod Monthly. The boys strip the chrome off their Kesslers and race them on the Turnpike at dawn.' },
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'turnpike', minutes: 15, text: 'Bumper to bumper on Park Avenue. Nobody honks at the black Kessler. Everyone else gets honked at.' },
      { id: 'door', label: 'The page under your door', at: [36, 8], card: 'ruthline', minutes: 5, cond: s => s.rapport.ruth >= 2, text: 'Three words in Ruth\'s handwriting, underlined twice: "Built to be looked at."' }
    ],
    events: [{ at: 780, kind: 'monty', who: 'monty', cond: s => s.flags.theoTold && !s.flags.confessed, lines: [['narrator', 'Monty appears in the doorway with two glasses.'], ['monty', 'Barrow came to see me. Something about Pennsylvania. Walter something.'], ['monty', 'Jack, this is America. People do it every day. Win me the Kesslers and I\'ll forget the name.']], fx: { composure: 10, flag: 'montyKnows' }, missed: [] }],
    close: ['This isn\'t a car.', 'It\'s a promise a father makes to his son:', 'that the road will still be there,', 'and it will still be his.'],
    evening: 'ending'
  }
];
