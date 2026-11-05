/* ---- THE STORY: a prologue on the couch, four chapters on the street, three more sessions, a diner ---- */
const setObj = (title, text, at, short, step) => { W.objective = { title, text, at, short: short || '', step: step || '' }; };
function npc(who, at, o = {}) { const n = Object.assign({ who, x: at.x, y: at.y, z: 0, facing: o.facing != null ? o.facing : Math.PI / 2, rig: rigOf(who, false), vx: 0, vy: 0 }, o); W.npcs.push(n); return n; }
function mark(x, y, labelText, act, o = {}) { const m = Object.assign({ x, y, label: labelText, act }, o); W.marks.push(m); return m; }
const removeNpc = n => { W.npcs = W.npcs.filter(m => m !== n); };
const allDead = () => W.foes.every(f => f.dead);
let fadeOut = 0;   // a black fade the story draws over the world (cutscenes)

const CHAPTERS = [
  { id: 'prologue', title: 'Session One', kind: 'therapy', place: 'office' },
  { id: 'ch1', title: 'Chapter One: Gabagool', sub: 'North Caldwell, a Tuesday', place: 'town' },
  { id: 'session2', title: 'Session Two', kind: 'therapy', place: 'office' },
  { id: 'ch2', title: 'Chapter Two: Brass Section', sub: 'The Velvet Brass, after midnight', place: 'town', night: true },
  { id: 'ch3', title: 'Chapter Three: Pine Barrens', sub: 'South Jersey, the same night, colder', place: 'barrens' },
  { id: 'session3', title: 'Session Three', kind: 'therapy', place: 'office' },
  { id: 'ch4', title: 'Chapter Four: Final Movement', sub: 'Baritone Sanitation, in the rain', place: 'town', night: true, rain: true },
  { id: 'epilogue', title: 'Epilogue: The Moonlight Diner', kind: 'diner', place: 'diner' }
];

/* the therapy sessions: what Sal says on the couch moves his nerves, his family and his pride */
const SESSIONS = {
  prologue: () => [
    ['melfi', 'So. Your wife says you fainted at your son\'s birthday party. Face first into the potato salad.'],
    ['sal', 'Pasta salad. If it\'s going in a file, get it right.'],
    ['melfi', 'Why don\'t you tell me about that morning.'],
    { who: 'sal', id: 'p1', text: 'What do you want to know?', choices: ['"I don\'t do this. Talking."', '"The ducks left."', '"I\'m in waste management. It\'s stressful."'], on: i => [
      [['melfi', 'And yet here you are, paying by the hour not to talk.'], ['sal', 'Yeah, well. My mother raised a bargain hunter.'], { run: () => adj('stress', 6) }],
      [['melfi', 'Ducks?'], ['sal', 'A family of ducks. In my pool. The mother, the little ones. All spring. Then one morning they\'re gone.'], ['melfi', 'And how did that feel?'], ['sal', 'Like... I dunno. Like everything goes, eventually.'], { run: () => { adj('stress', -6); adj('family', 4); } }],
      [['melfi', 'Waste management.'], ['sal', 'Environmental consultant. Garbage, mostly. Other people\'s.'], { run: () => adj('respect', 4) }]][i] },
    ['melfi', 'Let\'s start small. This week, notice what sets it off. The moment before.'],
    { who: 'sal', id: 'p2', text: 'Notice. Write it down. Very good. Evidence.', choices: ['"Fine. Same time next week."', '"Can I just get a pill?"'], on: i => i ? [['melfi', 'We\'ll talk about medication. We\'ll also talk about you.'], { run: () => adj('stress', -4) }] : [['melfi', 'Same time next week.'], { run: () => adj('family', 2) }] }
  ],
  session2: () => [
    ['melfi', 'You had another attack. In a butcher shop.'],
    ['sal', 'Pork store. It\'s different. A butcher shop is a butcher shop.'],
    { who: 'melfi', id: 's2', text: 'What were you thinking about, right before?', choices: ['"The meat. My father. Sundays."', '"Brooklyn. Business."', '"Nothing. I wasn\'t thinking."'], on: i => [
      [['sal', 'My father\'d come home Sunday with a whole capicola, smiling like he hit the number. Took me twenty years to figure out what truck it fell off of.'], ['melfi', 'So the meat is love, and it\'s also the business.'], ['sal', 'You\'re very good at ruining sandwiches.'], { run: () => { adj('stress', -10); adj('family', 5); } }],
      [['sal', 'Let\'s say a competitor in the sanitation field is underbidding. Aggressively.'], ['melfi', 'And you feel... threatened.'], ['sal', 'I feel like a guy whose lunch is getting looked at.'], { run: () => { adj('respect', 4); adj('stress', -3); } }],
      [['melfi', 'Nothing is a lot of something, sometimes.'], ['sal', 'That on a mug somewhere?'], { run: () => adj('stress', -4) }]][i] },
    ['melfi', 'When you feel it coming, slow your breathing. In through the nose. Count it.'],
    ['sal', 'Counting I can do. It\'s half my job.']
  ],
  session3: () => [
    ['melfi', 'You look tired.'],
    ['sal', 'I spent the night in the woods with my nephew. Don\'t ask. It was a team-building thing.'],
    { who: 'melfi', id: 's3a', text: 'Have you noticed what sets the attacks off?', choices: ['"Family."', '"Losing things."', '"Tenors."'], on: i => [
      [['melfi', 'The people you\'re responsible for.'], ['sal', 'The people who are responsible for me. Nobody tells you it goes both ways.'], { run: () => adj('family', 4) }],
      [['melfi', 'The ducks. Your father. The way things were.'], ['sal', 'Everybody\'s nostalgic for something. I\'m nostalgic for last Tuesday.'], { run: () => adj('stress', -8) }],
      [['melfi', 'Tenors?'], ['sal', 'Guys who sing too high and too loud. You can\'t hear yourself think.'], { run: () => adj('respect', 4) }]][i] },
    { who: 'melfi', id: 'want', text: 'What do you want, Sal? Not this week. In general.', choices: ['"To be the last guy standing."', '"One dinner where nobody cries."', '"I want the ducks to come back."'], on: i => { S.flags.want = i; return [
      [['melfi', 'Standing where?'], ['sal', 'That\'s the thing. You don\'t get to pick.'], { run: () => adj('respect', 6) }],
      [['melfi', 'That sounds achievable.'], ['sal', 'You never met my family.'], { run: () => adj('family', 6) }],
      [['melfi', 'Maybe they will.'], ['sal', 'Ducks don\'t come back, doc. New ducks come.'], { run: () => adj('stress', -10) }]][i]; } },
    ['melfi', 'Our time is up.'],
    ['sal', 'It always is.']
  ]
};

/* each chapter: setup() builds the place, then steps in order; a step's check() true moves to the next */
const STORY = {};
function chapterHero(at, robe) {
  W.heroes = [makeHero('sal', at.x, at.y, I, { robe })];
  hero().hp = S.hp || 100; hero().isP = true;
  if (game.players[1]) addNicky(game.players[1]);
}
function addNicky(input) {
  if (W.heroes.some(h => h.who === 'nicky')) { const n = W.heroes.find(h => h.who === 'nicky'); n.input = input; n.ai = null; n.isP = true; n.color = '#ff4a4a'; return n; }
  const h0 = hero(), n = makeHero('nicky', h0.x + 14, h0.y + 6, input, { color: '#ff4a4a' }); n.isP = !!input; n.ammo = 12; W.heroes.push(n); return n;
}
// Nicky on his own: follows his uncle, fights who's closest, keeps out of the way of the car
function nickyAI(n) {
  const h = hero(); if (!h) return {};
  let f = null, fd = 140; for (const e of W.foes) if (!e.dead) { const d = dist(n, e); if (d < fd) { fd = d; f = e; } }
  if (f) { const a = fd > 30 ? navAngle(n, f) : angTo(n, f); if (fd > 20) return { gx: Math.cos(a), gy: Math.sin(a), sprint: fd > 60, fire: fd > 60 && n.ammo > 0 && Math.random() < .03, aim: a }; return { attack: Math.random() < .12, kick: Math.random() < .03, consume() {} }; }
  const d = dist(n, h); if (d > 40) { const a = navAngle(n, h); return { gx: Math.cos(a), gy: Math.sin(a), sprint: d > 90 }; }
  return {};
}

STORY.ch1 = {
  setup() { enterPlace('town', {}); chapterHero(TOWN.at.hero, true); music('town'); const t = TOWN.at;
    W.donna = npc('donna', t.donna, { facing: -Math.PI / 2 });
    W.donna.act = () => convo([['donna', pick(['The Dombrowskis are putting in a pool. Bigger than ours, Peg says. With a slide.', 'Junior wants a car. I said ask your father. He said you\'d say ask your mother.', 'Father Phil is coming for dinner Sunday. Wear a shirt with buttons.', 'Your mother called. She says she\'s dying. Again. Call her back.'])], ['sal', pick(['Mm-hm.', 'I\'ll handle it.', 'Whaddaya gonna do.'])]]);
    W.gino = npc('gino', t.gino); W.baker = npc('baker', t.baker); W.murray = npc('laundry', t.murray); W.chef = npc('chef', t.chef); npc('sully', t.sully, { act: () => convo([['sully', pick(['Sal! Lookin\' to trade up? I got a Lincoln, one owner. Well. One owner at a time.', 'This one only got driven to church. And to a couple of other places.'])], ['sal', 'Not today, Sully.']]) });
    dropItem('paper', t.paper.x, t.paper.y);
  },
  steps: [
    { enter() { setObj('Get the newspaper', 'It\'s at the end of the driveway', TOWN.at.paper, 'PAPER'); hint('move', 'Move', `${['up', 'left', 'down', 'right'].map(a => label(a)).join(' ')} or the left stick to walk · hold ${label('sprint')} to hurry`);
        W.onPickup = (h, it) => { if (it.kind === 'paper') { S.flags.paper = 1; convo([['sal', 'Another indictment. Not mine. Good morning.']]); } }; },
      check: () => S.flags.paper && !convoBusy() },
    { enter() { setObj('Feed the ducks', 'They\'re in the pool. They\'ll want bread', { x: 13.6 * T, y: 5 * T }, 'DUCKS'); hint('use', 'Talk and use', `${label('interact')} to talk, use things and get in cars. With a mouse, click them`);
        mark(13.6 * T, 5 * T, 'Feed the ducks', () => { if (S.flags.ducks) return; S.flags.ducks = 1; for (const d of W.ducks) d.fed = 8; A.sfx('quack'); P.bits(15 * T, 5 * T, 4, 8, ['#d89a4a', '#f0d090']); adj('stress', -10);
          convo([['donna', 'You\'re feeding the ducks again. In your robe. The neighbors, Sal.'], ['sal', 'Let \'em look. These ducks got more class than the whole block.'],
            { who: 'donna', id: 'kiss', text: 'Are you going to Fusco\'s? Bring home a pound of the good stuff.', choices: ['Kiss her goodbye', '"I got business, Donna."'], on: i => i ? [['donna', 'You always got business.'], { run: () => adj('family', -4) }] : [['donna', 'Go on. Get dressed. You look like a Roman senator.'], { run: () => adj('family', 6) }] }]); }, { show: () => !S.flags.ducks, r: 40 }); },
      check: () => S.flags.ducks && !convoBusy() },
    { enter() { setObj('Get dressed', 'The front door of the house', TOWN.at.houseDoor, 'HOME');
        mark(TOWN.at.houseDoor.x, TOWN.at.houseDoor.y + 6, 'Get dressed', h => { fadeOut = 1; game.after(.6, () => { h.robe = false; rebuildRigs(h); S.flags.dressed = 1; fadeOut = 0; convo([['sal', 'Okay. Business casual.']]); }); }, { show: () => !S.flags.dressed }); },
      check: () => S.flags.dressed && !convoBusy() },
    { enter() { setObj('Meet Gino at Fusco\'s Meats', 'Take the car, it\'s a long walk in loafers', TOWN.at.gino, 'FUSCO\'S');
        hint('car', 'The car', `The black SUV is parked by the driveway. ${label('interact')} to get in`);
        W.gino.act = () => { S.flags.rounds = 1; convo([['gino', 'Sal! You look like a million bucks. Used, but still.'], ['sal', 'What do we got.'],
          ['gino', 'Three envelopes. Dolce Vita, Spin City, and Arturo\'s place. Arturo\'s been hearing from Brooklyn.'], ['sal', 'Brooklyn.'],
          ['gino', 'The Falsettis. Carmine\'s people. They\'re sniffing around like it\'s a free buffet.'], ['sal', 'Nobody eats free on my street. Not even me.']]); W.gino.act = null; }; },
      check: () => S.flags.rounds && !convoBusy() },
    { enter() {
        const upd = () => { const n = ['bakery', 'laundry', 'gabbiano'].filter(k => S.flags[k]).length; setObj('Make the rounds: ' + n + ' of 3', [!S.flags.bakery && 'Dolce Vita bakery', !S.flags.laundry && 'Spin City laundromat', !S.flags.gabbiano && 'Il Gabbiano'].filter(Boolean).join(' · '),
          !S.flags.bakery ? TOWN.at.baker : !S.flags.laundry ? TOWN.at.murray : TOWN.at.chef, 'ROUNDS', n + '/3'); };
        STORY.ch1.updRounds = upd; upd();
        W.baker.act = () => { W.baker.act = null; convo([['baker', 'Mister Baritone. It\'s all there, I counted twice. My husband counted once, he can\'t count.'],
          { who: 'baker', id: 'cannoli', text: 'Take a cannoli for the road. Take two.', choices: ['Take the cannoli', '"Just the envelope, Rosaria."'], on: i => i ? [['baker', 'Suit yourself. You look tired, you know.'], { run: () => adj('respect', 2) }] : [['sal', 'You\'re a saint.'], { run: () => { dropItem('cannoli', W.baker.x, W.baker.y + 10); adj('family', 2); } }] }],
          () => { S.flags.bakery = 1; adj('cash', 500); toast('Envelope', money(500) + ' from Dolce Vita'); A.sfx('cash'); upd(); }); };
        W.murray.act = () => { W.murray.act = null; convo([['laundry', 'Sal, Sal. Listen. It\'s been slow. The machines. The economy. A sock got into number four.'], ['sal', 'A sock.'],
          { who: 'sal', id: 'murray', text: 'He\'s three hundred short. Maybe five.', choices: ['Lean on him (the stare-down)', '"Pay me Friday. With interest."', '"Fine. I\'m taking the big dryer."'], on: i => {
            if (i === 0) return [{ run: () => { stareDown('laundry', ok => { if (ok) { convo([['laundry', 'Okay! Okay. I found it. It was in the other register. The secret one.']], () => { adj('cash', 800); adj('respect', 8); adj('stress', 4); S.flags.laundry = 1; toast('Envelope', money(800) + ' from Spin City'); A.sfx('cash'); upd(); }); }
              else convo([['laundry', 'I\'m telling you, it\'s half. Half is what I got.'], ['sal', 'Half. Next week, double.']], () => { adj('cash', 400); adj('stress', 8); S.flags.laundry = 1; toast('Envelope', money(400) + ' from Spin City'); upd(); }); }); } }];
            if (i === 1) return [['laundry', 'Friday. God bless you. Friday.'], { run: () => { adj('family', 4); adj('respect', -5); S.flags.laundry = 1; S.flags.murrayOwes = 1; toast('A favor', 'Murray owes you. With interest.'); upd(); } }];
            return [['laundry', 'The dryer? That\'s my best dryer!'], ['sal', 'Now it\'s my best dryer. Gino, get the truck.'], { run: () => { adj('cash', 250); adj('respect', 3); S.flags.laundry = 1; toast('A dryer', 'Worth ' + money(250) + ' to somebody'); upd(); } }]; } }]); };
        W.chef.label = () => S.flags.goonsGabbiano && !allDead() ? 'Busy' : 'Talk';
        W.chef.act = () => { if (!S.flags.goonsGabbiano || !allDead()) return; W.chef.act = null; convo([['chef', 'Sal. Grazie. Those animals came in, ate, and handed me a bill. Me! For my own food!'],
          ['sal', 'They won\'t come back.'], ['chef', 'Your envelope. And sit down sometime, eat. On the house. Really on the house, not like them.']], () => { S.flags.gabbiano = 1; adj('cash', 1000); adj('respect', 10); dropItem('gabagool', W.chef.x + 8, W.chef.y + 12); toast('Envelope', money(1000) + ' from Il Gabbiano'); A.sfx('cash'); upd(); }); };
      },
      update() {
        const h = hero();
        if (!S.flags.goonsGabbiano && h && dist(h, TOWN.at.chef) < 150) {
          S.flags.goonsGabbiano = 1; music('fight');
          convo([{ who: 'goon', name: 'FALSETTI GOON', text: 'Hey, big guy in the nice coat. This is a Falsetti table now.' }, ['sal', 'That\'s funny. I\'m gonna tell that to your dentist.']]);
          for (let k = 0; k < 3; k++) spawnFoe('goon', TOWN.at.chef.x - 30 + k * 30, TOWN.at.chef.y + 26, { wake: 1.5 });
          hint('fight', 'Fighting', `${label('attack')} punch (three in a row) · ${label('kick')} kick · hold ${label('block')} to block · ${label('dodge')} to roll`);
          W.onKill = () => { if (allDead()) { music('town'); toast('Il Gabbiano', 'Talk to Arturo'); } };
        }
      },
      check: () => S.flags.bakery && S.flags.laundry && S.flags.gabbiano && !convoBusy() },
    { enter() { setObj('Bring the envelopes to Gino', 'Fusco\'s Meats', TOWN.at.gino, 'GINO');
        W.gino.act = () => { W.gino.act = null; convo([['gino', 'Beautiful. Beautiful. Arturo called, he says you were very persuasive.'], ['gino', 'Also: Carmine Falsetti says hello. He says it with his whole chest, Sal. He sings it.'],
          ['sal', 'He sings.'], ['gino', 'Here. Fusco just sliced the gabagool. Try it, it\'s like butter.'], ['sal', '...'],
          { run: () => { S.flags.panicked = 1; adj('stress', 100); } }]); }; },
      check: () => S.flags.panicked && !convoBusy() && !W.mini && S.flags.after1 }
  ],
  done: () => 'session2'
};

STORY.ch2 = {
  setup() { enterPlace('town', { night: true, peds: 2, traffic: 2 }); chapterHero(TOWN.at.officeStand, false); music('night'); const t = TOWN.at;
    W.frankie = npc('frankie', t.frankie);
    // the SUV is outside the office tonight
    W.cars[0].x = 47 * T; W.cars[0].y = 10.5 * T; W.cars[0].angle = 0;
  },
  steps: [
    { enter() { setObj('Go to the Velvet Brass', 'Frankie called. He sounded like Frankie, but worse', TOWN.at.frankie, 'CLUB');
        W.frankie.act = () => { W.frankie.act = null; convo([['frankie', 'Sal. The Falsettis been driving by all night. Slow. With the windows down. In this weather.'],
          ['sal', 'They come here? To my place?'], ['frankie', 'Here. Take this, it\'s yours anyway. You left it in the office with the cigars.'],
          { run: () => { S.flags.gun = 1; S.ammo = Math.max(S.ammo, 24); toast('The pistol', '24 rounds'); hint('gun', 'The pistol', `${label('fire')} to shoot · aim with the mouse or the right stick · the Falsettis drop rounds`); } },
          ['frankie', 'Oh, and Sal? Here they come now.']]); }; },
      check: () => S.flags.gun && !convoBusy() },
    { enter() {
        let wave = 0; const spawns = [[2 * T, 31.5 * T], [19 * T, 41 * T], [20 * T, 31.5 * T], [2 * T, 41 * T], [14 * T, 42 * T]];
        const WAVES = [['goon', 'goon', 'goon', 'goon'], ['goon', 'gunman', 'goon', 'gunman'], ['bruiser', 'gunman', 'goon', 'gunman', 'goon']];
        const go = () => { const list = WAVES[wave]; list.forEach((k, i) => { const s = spawns[i % spawns.length]; const f = spawnFoe(k, s[0], s[1], { wake: .4 + i * .3 }); if (k === 'bruiser') f.name = 'VITO "VIBRATO"'; });
          setObj('Defend the Velvet Brass', 'Wave ' + (wave + 1) + ' of 3', null, '', (wave + 1) + '/3'); banner('WAVE ' + (wave + 1), wave === 2 ? 'Vito "Vibrato" brought a bat' : 'The Falsettis', 2); };
        music('fight'); go();
        W.onKill = () => { if (allDead()) { wave++; if (wave < 3) { dropItem('ammo', 8 * T, 39 * T, 10); dropItem('gabagool', 9 * T, 39.5 * T); game.after(2.2, go); } else S.flags.clubSafe = 1; } };
      },
      check: () => S.flags.clubSafe },
    { enter() { music('night'); setObj('Talk to Frankie', '', TOWN.at.frankie, 'FRANKIE');
        const nick = npc('nicky', { x: 19 * T, y: 31 * T }); nick.walkTo = { x: TOWN.at.frankie.x + 20, y: TOWN.at.frankie.y + 6 };
        W.frankie.act = () => { W.frankie.act = null; convo([['frankie', 'That last car, Sal. That was Lenny the Ledger driving. Carmine\'s bagman.'], ['frankie', 'He\'s got the book. Every envelope on this street, in his handwriting.'],
          ['nicky', 'Uncle Sal! I seen him. He took the Parkway south, toward the Pine Barrens.'], ['sal', 'In the middle of the night. In December.'], ['nicky', 'I got the van. Let\'s go.'],
          { who: 'sal', id: 'van', text: 'The book. In the woods.', choices: ['"Let\'s go get that book."', '"Call Gino first. Then we go."'], on: i => i ? [['frankie', 'I\'ll call him. He\'s gonna say it\'s a bad idea.'], ['sal', 'He always says that. He\'s always right. We go anyway.'], { run: () => adj('family', 3) }] : [{ run: () => adj('respect', 5) }] }],
          () => { S.flags.toWoods = 1; }); }; },
      check: () => S.flags.toWoods && !convoBusy() }
  ],
  done: () => 'ch3'
};

STORY.ch3 = {
  setup() { enterPlace('barrens', {}); chapterHero(BARRENS.at.hero, false); music('barrens');
    const n = addNicky(game.players[1] || null); n.x = BARRENS.at.nicky.x; n.y = BARRENS.at.nicky.y; if (!n.input) n.ai = nickyAI;
    // Lenny's footprints, from the van into the trees (one loafer, then none)
    let x = 7 * T, y = 7 * T; for (let i = 0; i < 70; i++) { const a = Math.PI / 2 - .25 + Math.sin(i * .3) * .5; x += Math.cos(a) * 5; y += Math.sin(a) * 4; if (y > 20 * T) break; W.track.push({ x, y, a, t: 0 }); }
    dropItem('shoe', BARRENS.at.shoe.x, BARRENS.at.shoe.y);
    W.cold = 100;
  },
  steps: [
    { enter() { setObj('Follow the footprints', 'Lenny went into the trees. Stay warm: the fire barrels help', BARRENS.at.shoe, 'TRACKS'); banner('PINE BARRENS', 'Stay near the fire barrels. The cold hurts', 3.5);
        hint('cold', 'The cold', 'Warmth drains in the snow. Stand by a burning barrel to warm up');
        W.onPickup = (h, it) => { if (it.kind === 'shoe') { S.flags.shoe = 1; convo([['sal', 'He lost a shoe.'], ['nicky', 'Who runs into the woods in loafers?'], ['sal', 'A guy from Brooklyn.']]); } }; },
      check: () => S.flags.shoe && !convoBusy() },
    { enter() { setObj('Keep following the trail', 'Across the frozen pond, east', BARRENS.at.pond, 'POND'); },
      update() { const h = hero(); if (!S.flags.ambush && h && dist(h, BARRENS.at.pond) < 120) { S.flags.ambush = 1; music('fight'); for (const [k, x, y] of [['goon', 26, 13], ['goon', 27, 20], ['gunman', 30, 16], ['goon', 17, 22]]) spawnFoe(k, x * T, y * T, { wake: .6 });
          convo([['nicky', 'Falsettis! In the woods! What, they live here?']]); W.onKill = () => { if (allDead()) { music('barrens'); S.flags.ambushDone = 1; } }; } },
      check: () => S.flags.ambushDone },
    { enter() { setObj('The hunter\'s cabin', 'Smoke from the chimney. Somebody\'s home', BARRENS.at.cabin, 'CABIN'); },
      update() { const h = hero(); if (!S.flags.lenny && h && dist(h, BARRENS.at.lenny) < 70) { S.flags.lenny = 1; music('boss');
          const f = spawnFoe('bagman', BARRENS.at.lenny.x, BARRENS.at.lenny.y, { name: 'LENNY THE LEDGER', loot: false }); W.lenny = f; f.wake = .8;
          convo([['lenny', 'Stay back! I know karate! I took a class! At the Y!']]); } },
      check: () => W.lenny && (W.lenny.surrender || W.lenny.dead) },
    { enter() { const f = W.lenny; music('barrens'); for (const g of W.foes) if (g !== f && !g.dead) g.hp = 0;
        convo([['lenny', 'Okay! Okay! Take the book! I\'m an accountant! I do taxes! I did my mother\'s taxes, she got a refund!'],
          { who: 'sal', id: 'lenny', text: 'Nicky looks at you. The woods are very quiet.', choices: ['"Go home, Lenny. Walk. It\'s good for you."', '"Nicky. Give us a minute."'], on: i => i
            ? [{ run: () => { fadeOut = 1; } }, ['nicky', '...Where\'d he go?'], ['sal', 'He went for a walk.'], { run: () => { fadeOut = 0; W.foes = W.foes.filter(g => g !== f); S.flags.lennyWalked = 1; adj('respect', 10); adj('stress', 15); } }]
            : [['lenny', 'Thank you! God bless! I\'ll do your taxes! Free!'], { run: () => { f.surrender = 0; f.flee = 1; S.flags.lennySpared = 1; adj('family', 8); adj('respect', -5); adj('stress', -6); } }] }],
          () => { dropItem('bag', f.x + 10, f.y + 8); W.onPickup = (h, it) => { if (it.kind === 'bag') { S.flags.book = 1; adj('cash', 5000); toast('The book', 'And ' + money(5000) + ' in the bag'); } }; }); },
      update(dt) { const f = W.lenny; if (f && f.flee) { f.vx = 90; f.vy = 50; f.facing = .5; if (f.x > 50 * T) W.foes = W.foes.filter(g => g !== f); } },
      check: () => S.flags.book && !convoBusy() },
    { enter() { setObj('Find the road out', 'South, past the trees: Route 72', BARRENS.at.exit, 'ROAD'); },
      check: () => { const h = hero(); return h && h.y > 33.5 * T; },
      leave(next) { convo([['nicky', 'I\'m never coming back to the woods. Never.'], ['sal', 'We were never here.']], next); } }
  ],
  done: () => 'session3'
};

STORY.ch4 = {
  setup() { enterPlace('town', { night: true, rain: true, peds: 0, traffic: 2 }); chapterHero(TOWN.at.hero, false); music('night');
    W.gino = npc('gino', TOWN.at.gino);
    S.flags.gun = 1; S.ammo = Math.max(S.ammo, 30);
  },
  steps: [
    { enter() { setObj('Meet Gino at Fusco\'s Meats', 'He called. He never calls', TOWN.at.gino, 'GINO');
        W.gino.act = () => { W.gino.act = null; convo([['gino', 'Sal. Carmine took the yard. Baritone Sanitation. Your father\'s trucks, Sal.'], ['sal', 'My father\'s trucks.'], ['gino', 'He\'s up there right now, singing. You can hear it from Bloomfield.'],
          ['sal', 'Then I\'m going to work.']], () => { S.flags.toYard = 1; }); }; },
      check: () => S.flags.toYard && !convoBusy() },
    { enter() { setObj('Take back the sanitation yard', 'Bottom right of town, past the diner', TOWN.at.yardGate, 'YARD'); },
      update() { const h = hero(); if (!S.flags.gate && h && dist(h, TOWN.at.yardGate) < 150) { S.flags.gate = 1; music('fight'); for (const [k, x, y] of [['goon', 44, 38], ['goon', 45, 40], ['gunman', 48, 35], ['bruiser', 47, 41], ['gunman', 50, 39]]) spawnFoe(k, x * T, y * T, { wake: .5 });
          W.onKill = () => { if (allDead()) S.flags.gateDone = 1; }; } },
      check: () => S.flags.gateDone },
    { enter() { music(null);
        const c = spawnFoe('boss', 52 * T, 38 * T, { name: 'CARMINE', loot: false }); W.carmine = c; c.wake = 99;
        setObj('Carmine "The Tenor" Falsetti', 'The yard. Your yard', c, 'CARMINE');
        convo([['carmine', 'Salvatore! A baritone in a world of tenors. Nobody hears you over us, my friend.'], ['sal', 'Funny. I hear you fine. Whole Turnpike hears you.'],
          ['carmine', 'Then hear THIS!']], () => { c.wake = 0; music('boss'); banner('FINAL MOVEMENT', 'Carmine "The Tenor" Falsetti', 2.5); });
        W.onBossPhase = (f, ph) => { if (ph === 2) { convo([['carmine', 'Boys! The bags! Throw the bags!']]); for (const [x, y] of [[44, 34], [57, 41]]) spawnFoe('goon', x * T, y * T, { wake: .5 }); dropItem('ammo', 49 * T, 40 * T, 12); }
          if (ph === 3) { convo([['carmine', 'Now... I SING!']]); dropItem('gabagool', 46 * T, 38 * T); } };
        W.onKill = f => { if (f.kind === 'boss') S.flags.carmineDown = 1; };
      },
      update() { const c = W.carmine; if (c && !c.dead && (c.surrender || c.hp <= c.max * .08)) { c.surrender = 1; c.hp = Math.max(1, c.hp); S.flags.carmineDown = 1; } },
      check: () => S.flags.carmineDown && !convoBusy() },
    { enter() { const c = W.carmine; c.surrender = 1; music(null); for (const g of W.foes) if (g !== c) g.hp = 0, g.dead = g.dead || 1;
        W.parked.push({ kind: 'cop', x: 43 * T, y: 36 * T, angle: 0 }, { kind: 'cop', x: 43 * T, y: 40 * T, angle: Math.PI }); A.sfx('horn');
        convo([['carmine', 'You won\'t do it. Not with the Feds pulling in. Look at you. You\'re all chest and no high notes.'],
          { who: 'sal', id: 'carmine', text: 'Blue lights on the wet gravel.', choices: ['"Let the Feds have him."', '"Go on, Carmine. Sing for them."'], on: i => i ? [['carmine', 'I... what? I don\'t sing for— oh. Oh no.'], ['sal', 'You got the voice for it.'], { run: () => adj('respect', 12) }] : [['sal', 'He\'s all yours, fellas. He\'s very musical.'], { run: () => { adj('respect', 8); adj('family', 4); } }] },
          ['gino', 'Sal. Go see your family. The diner. Donna called twice. Three times.']], () => { W.foes = W.foes.filter(g => g !== c); S.flags.yard = 1; adj('stress', -20); }); },
      check: () => S.flags.yard && !convoBusy() },
    { enter() { setObj('Meet the family at the Moonlight Diner', 'Donna got a booth', TOWN.at.dinerStand, 'DINER'); music('night');
        mark(TOWN.at.diner.x, TOWN.at.diner.y + 10, 'Go inside', () => { S.flags.diner = 1; }, { show: () => !S.flags.diner }); },
      check: () => S.flags.diner }
  ],
  done: () => 'epilogue'
};

const chapterIndex = id => CHAPTERS.findIndex(c => c.id === id);
function snapshot() { S.snap = JSON.parse(JSON.stringify(Object.assign({}, S, { snap: undefined }))); }
function restoreSnap() { if (S.snap) { const s = S.snap; resetStory(); Object.assign(S, JSON.parse(JSON.stringify(s))); S.snap = s; } }
function startChapter(id, o = {}) {
  const ci = chapterIndex(id); S.ch = ci; S.step = 0; snapshot();
  if (!o.noSave && !HUB) { try { game.saves.autosave(); } catch (e) { /* storage blocked: the visit keeps it */ } }
  const c = CHAPTERS[ci];
  if (c.kind === 'therapy') return game.go('therapy', { id });
  if (c.kind === 'diner') return game.go('diner', {});
  game.go('play', { mode: 'story', chapter: id });
}
