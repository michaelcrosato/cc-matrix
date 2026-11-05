/* ---------------- talk: portraits, gibberish voices, conversations as lists ---------------- */
const talk = new E.Dialog(game, { bg: ['#3a2a1a', '#140c06'], border: '#e8c890', nameColor: '#ffd36a', speed: 52 });
const NAMES = { hollis: 'HOLLIS', dusty: 'DUSTY', lenny: 'LENNY', vela: 'AUGUSTO VELA', dale: 'DALE', skyler: 'MARIAN', rafa: 'RAFA', mack: 'MACK', thug: 'CREW', radio: 'POLICE RADIO' };
const NAME_AFTER_ALIAS = () => S.alias ? 'SCHRODINGER' : 'HOLLIS';
function say(who, text, o = {}) {
  const sp = speaker(who);
  talk.voice = sp.voice;
  talk.say(text, { name: who === 'hollis' ? NAME_AFTER_ALIAS() : NAMES[who] || who.toUpperCase(), portrait: sp.rig, portraitSize: 48, portraitOpts: { zoom: 2.5, turn: -.2, bg: PORTRAIT_BG }, ...o });
}
// a conversation: [[who, text | [pages]], ...] then done(); a line may be a function (built when reached) or { choices }
function convo(lines, done) {
  const run = i => {
    if (i >= lines.length) { if (done) done(); return; }
    const ln = lines[i];
    if (typeof ln === 'function') { const r = ln(); if (r === false) return; run(i + 1); return; }
    const [who, text, o = {}] = ln;
    if (o.choices) say(who, text, { choices: o.choices, onChoice: k => { if (o.onChoice) o.onChoice(k); game.after(.01, () => run(i + 1)); } });
    else say(who, text, { ...o, onDone: () => run(i + 1) });
  };
  run(0);
}

/* ---------------- toasts and tips ---------------- */
const toasts = [];
function toast(text, sec = 3) { if (toasts.length && toasts[toasts.length - 1].text === text) return; toasts.push({ text, t: sec }); if (toasts.length > 3) toasts.shift(); }
const seenTips = new Set();
function toastOnce(id, text) { if (seenTips.has(id) || !game.settings.hints || (W && W.demo)) return; seenTips.add(id); toast(text, 5); }
let card = null;   // the episode's title card { a, b, t }
function showCard(a, b, sec = 3.5) { card = { a, b, t: sec, max: sec }; }

/* ---------------- the five episodes ---------------- */
const EPISODES = [
  { title: 'PILOT', steps: [
    { id: 'dusty', obj: 'Talk to Dusty in the backyard', at: () => SPOT.dusty, ev: 'talk:dusty' },
    { id: 'cook1', obj: 'Cook your first batch in the RV', at: () => SPOT.rv, ev: 'cook' },
    { id: 'rafa', obj: 'Sell to Rafa at the salvage yard', at: () => SPOT.rafa, ev: 'talk:rafa' },
    { id: 'fight1', obj: 'Survive Rafa\'s crew', ev: 'clear' }
  ] },
  { title: 'CLEAN MONEY', steps: [
    { id: 'lenny', obj: 'See Lenny Shapiro, attorney, at the strip mall', at: () => SPOT.lenny, ev: 'talk:lenny' },
    { id: 'deals', obj: () => S.product > 0 ? 'Sell to street buyers (' + Math.min(3, S.epDeals) + '/3)' : 'Out of product: cook more in the RV (' + Math.min(3, S.epDeals) + '/3 sold)', at: () => S.product > 0 ? nearestBuyer() : SPOT.rv, ev: 'deal', ok: () => S.epDeals >= 3 },
    { id: 'launder', obj: 'Launder your cash at Bubble Bros Car Wash', at: () => SPOT.carwash, ev: 'launder' },
    { id: 'sleep2', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'THE TACO MAN', steps: [
    { id: 'vela', obj: 'Meet Augusto Vela at Taco Tranquilo', at: () => SPOT.taco, ev: 'talk:taco' },
    { id: 'cook90', obj: 'Cook a batch of 90% purity or better', at: () => SPOT.rv, ev: 'cook', ok: d => d && d.purity >= 90 },
    { id: 'deliver', obj: () => S.product >= 4 ? 'Deliver 4 lbs to Taco Tranquilo\'s back door' : 'You need 4 lbs: cook more in the RV', at: () => S.product >= 4 ? SPOT.back : SPOT.rv, ev: 'talk:back' },
    { id: 'sleep3', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'LOS PRIMOS', steps: [
    { id: 'arena', obj: 'Something is wrong at the car wash', at: () => SPOT.arena, ev: 'arena' },
    { id: 'cousins', obj: 'Survive the Calaca cousins', ev: 'clear' },
    { id: 'lenny4', obj: 'Talk to Lenny', at: () => SPOT.lenny, ev: 'talk:lenny' },
    { id: 'sleep4', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'HALF-LIFE', steps: [
    { id: 'laundry', obj: 'Break into Lavanderia Brillante', at: () => SPOT.laundry, ev: 'talk:laundry' },
    { id: 'labclear', obj: 'Clear the superlab', ev: 'clear' },
    { id: 'final', obj: 'Confront Vela in his office', at: () => LAB_SPOT.vela, ev: 'talk:vela' }
  ] }
];
const curStep = () => (EPISODES[S.ep - 1] || EPISODES[0]).steps[S.step];
const objText = () => { const s = curStep(); return !s ? '' : typeof s.obj === 'function' ? s.obj() : s.obj; };
function nearestBuyer() { let b = null, bd = 1e9; if (W && W.hero) for (const x of W.buyers) { const d = dist(W.hero, x); if (d < bd) { bd = d; b = x; } } return b; }

// an event from play: if it is what the current step waits for, its scene plays and the story moves on
function story(ev, data) {
  log('ev', ev);
  if (W && W.demo) return;
  const st = curStep();
  if (!st || st.ev !== ev) return;
  if (st.ok && !st.ok(data)) { onStepNotYet(st, data); return; }
  const after = ON_DONE[st.id];
  if (after) after(data, advance); else advance();
}
function advance() {
  const ep = EPISODES[S.ep - 1];
  S.step++;
  if (S.step >= ep.steps.length) { S.ep++; S.step = 0; S.epDeals = 0; if (S.ep > EPISODES.length) { game.go('ending'); return; } }
  log('step', S.ep + '.' + S.step);
  stepEnter();
  autosave();
}
function stepEnter() {
  const st = curStep(); if (!st) return;
  const f = ON_ENTER[st.id]; if (f) f();
  if (S.step === 0) showCard('EPISODE ' + S.ep, EPISODES[S.ep - 1].title);
}
function onStepNotYet(st, data) {
  if (st.id === 'cook90') convo([['dusty', ['That\'s ' + data.purity.toFixed(1) + '%, Mr. G. The taco guy wants ninety.', 'Again? Lenny sells glassware that makes the windows bigger.']]]);
}

/* what each step's end and start play */
const ON_DONE = {
  dusty: (d, next) => convo([
    ['dusty', ['Mr. G? Whoa. Okay. This is weird.', 'My RV is in your backyard. You\'re in your backyard. We\'re both... in your backyard.']],
    ['hollis', ['You used to sell. I used to teach.', 'Now I have a diagnosis, a mortgage, and a son who will need college.', 'You know the business. I know the chemistry.']],
    ['dusty', ['So you just wanna cook? Here? Next to your grill?']],
    ['hollis', ['Chemistry is the study of change, Dusty.', 'Tonight, we change.']],
    ['dusty', ['...Yeah. Okay. Science.']]
  ], () => { W.partnerJoin && W.partnerJoin(); next(); }),
  cook1: (d, next) => convo([
    ['dusty', ['Mr. G. It\'s blue. Why is it blue?']],
    ['hollis', ['Because it\'s pure. ' + d.purity.toFixed(1) + ' percent.', 'Nobody in this state is making anything like it.']],
    ['dusty', ['Rafa at the salvage yard will take it. He\'s... a lot. But he pays.']]
  ], next),
  rafa: (d, next) => convo([
    ['rafa', ['Teacher! Dusty\'s teacher! Come in, come in.', '*sniff* ...TIGHT. Tight, tight, tight! This is the bomb!']],
    ['rafa', ['So here is the deal. I take it all.', 'And I pay you... nothing. Because this is my yard.']],
    ['hollis', ['That\'s not how a transaction works.']],
    ['rafa', ['{shake}Muchachos!{/shake}']]
  ], () => { next(); }),
  fight1: (d, next) => convo([
    ['rafa', ['Okay! OKAY. Business. We do business, teacher.', 'Two pounds. Five grand. Cash. We are friends now.']],
    () => { const sold = Math.min(2, S.product); S.product -= sold; S.dirty += 5000; S.earned += 5000; A.sfx('cash'); return true; },
    ['hollis', ['Next time, you pay first.']],
    ['dusty', ['Yo. Mr. G just blew up a guy with a beaker.']]
  ], next),
  lenny: (d, next) => convo([
    ['lenny', ['Lenny Shapiro! You need me, I need you. That\'s the beauty of the free market.']],
    ['lenny', ['Rule one: dirty money is a liability.', 'Run it through Bubble Bros Car Wash. It goes in filthy, it comes out squeaky.']],
    ['lenny', ['Rule two: the DEA has a new task force. Big guy, Kowalski.', 'Don\'t let an agent see you holding product. Night helps. So does smoke.']],
    ['hollis', ['Kowalski. Dale Kowalski?']],
    ['lenny', ['You know him? ...Your BROTHER-IN-LAW? Oh, this is fantastic. This is my life now.']],
    ['lenny', ['Rule three: buy my services. Glassware, protection, alibis.', 'Here, a freebie. A recipe for a smoke that would make a fed cry.']],
    () => { S.flags.smoke = true; S.flasks.smoke = Math.max(S.flasks.smoke, 2); S.flags.shop = true; A.sfx('powerup'); toast('Smoke flasks unlocked. ' + lbl('cycle') + ' switches flask.', 5); return true; }
  ], next),
  deals: (d, next) => convo([['dusty', ['Three deals, zero handcuffs. I\'m kinda proud of us.', 'Cash smells weird though. Lenny said wash it.']]], next),
  launder: (d, next) => convo([['hollis', ['Clean money. Taxable. Explainable.', 'Marian will want to know where it came from. I\'ll have an answer.']]], next),
  sleep2: (d, next) => convo([
    ['dale', ['Hollis! Marian made her enchiladas. So. Work stuff, you\'ll love this.', 'Blue meth. Ninety plus percent. Some genius is cooking like a pharmaceutical lab.']],
    ['hollis', ['A genius. Huh.']],
    ['dale', ['Guy\'s an artist, I\'ll give him that. Doesn\'t matter. Everybody slips.']],
    ['skyler', ['Can we please not talk about drugs at dinner?']]
  ], next),
  vela: (d, next) => convo([
    ['vela', ['Mr. Gray. Please, sit. The salsa verde is very good today.']],
    ['vela', ['I have sampled your product. It is... exceptional.', 'But I do not deal with men who cannot be measured.']],
    ['vela', ['Bring me four pounds at ninety percent or better. Through my back door.', 'Then we will talk about the future.']],
    ['hollis', ['And if I can\'t?']],
    ['vela', ['Then you were never here.']]
  ], next),
  cook90: (d, next) => convo([['dusty', [d.purity.toFixed(1) + ' percent. Mr. G, that\'s, like, art.']], ['hollis', ['It\'s chemistry. Get in the car.']]], next),
  deliver: (d, next) => {
    if (S.product < 4) { convo([['vela', ['You are light, Mr. Gray. Four pounds. Not a gram less.']]]); return; }
    convo([
      () => { S.product -= 4; S.dirty += 20000; S.earned += 20000; A.sfx('cash'); return true; },
      ['vela', ['Remarkable. Twenty thousand, as agreed. More where this came from.']],
      ['vela', 'What should my people call you?', { choices: ['"Schrodinger."', '"Mr. Gray."'], onChoice: k => { S.flags.namedSelf = k === 0; } }],
      () => { convo([S.flags.namedSelf ? ['hollis', ['Schrodinger. Until you open the box, I\'m alive and dead.']] : ['vela', ['No. Men like us need a second name. My people will call you Schrodinger.']]], () => { S.alias = true; refreshHeroRig(W.hero); A.sfx('secret'); showCard('ALIAS', 'SCHRODINGER', 3); next(); }); return false; }
    ]);
  },
  sleep3: (d, next) => convo([['radio', ['...two males, silver suits, last seen on foot near the Mesa highway...', '...units be advised, suspects are armed...']], ['hollis', ['...']]], next),
  arena: (d, next) => convo([
    ['dusty', ['Mr. G. Who are those guys? Why are they so... shiny?']],
    ['hollis', ['The Calaca cousins. Vela\'s competition. Or Vela\'s message.']],
    ['hollis', ['Either way, they don\'t talk. Stay out of the line when they charge.']]
  ], () => { next(); }),
  cousins: (d, next) => convo([['dusty', ['They\'re down. They\'re actually down. Yo, we need to leave. Now.']]], next),
  lenny4: (d, next) => convo([
    ['lenny', ['Two cartel hitmen in a car wash. Do you know what that does to my Yelp rating?']],
    ['lenny', ['Vela pointed them at you. You know that, right? He\'s cleaning house.']],
    ['hollis', ['Then we clean first.']],
    ['lenny', ['I did not hear that. Also: Lavanderia Brillante, on Fourth? Vela\'s superlab is under it.', 'I also did not say that.']]
  ], next),
  sleep4: (d, next) => convo([['dale', ['Hollis, stay home tonight, okay? Something big is happening downtown. Cartel stuff.']], ['hollis', ['I will, Dale. I\'ll stay home.']]], next),
  laundry: (d, next) => { next(); game.go('lab', {}, { fade: 'iris', at: W.hero }); },
  labclear: (d, next) => convo([['dusty', ['Clear. It\'s clear. Mr. G... the office.']]], next),
  final: (d, next) => convo([
    ['vela', ['Mr. Gray. You came to my house.']],
    ['hollis', ['You came to mine. Twice.']],
    ['vela', ['I built this in plain sight. Twenty years. Tacos, charity drives, a smile for every policeman in the city.', 'And you are a schoolteacher with a sock full of crystal.']],
    ['hollis', ['Say my name.']],
    ['vela', ['...What?']],
    ['hollis', ['You know exactly who I am. Say my name.']],
    ['vela', ['{s=8}...Schrodinger.{/s}']],
    ['hollis', ['Damn right.']]
  ], () => { S.flags.won = true; next(); })
};
const ON_ENTER = {
  dusty: () => toastOnce('move', 'Move: ' + (isPad() ? 'left stick' : 'WASD') + '. Talk: ' + lbl('interact') + '. Ledger: ' + lbl('ledger') + '.'),
  cook1: () => toastOnce('cook', 'Walk up to the RV and press ' + lbl('interact') + ' to cook.'),
  fight1: () => {
    const at = SPOT.rafa;
    W.lockArena = { x: at.x, y: at.y + 10, r: 130 };
    makeEnemy('thug', at.x - 40, at.y + 10); makeEnemy('gunner', at.x + 40, at.y - 20); makeEnemy('thug', at.x + 20, at.y + 40); makeEnemy('gunner', at.x - 30, at.y - 30);
    W.rafaFled = true;
    toastOnce('throw', 'Throw a fulminate flask: ' + lbl('throw') + '. Punch: ' + lbl('attack') + '. Roll: ' + lbl('dodge') + '.');
  },
  lenny: () => toastOnce('lenny', 'The strip mall is south across the road.'),
  deals: () => toastOnce('deal', 'Buyers wait on corners. DEA agents patrol: their cones show what they see.'),
  launder: () => toastOnce('launder', 'Dirty cash (green) can\'t buy upgrades. Launder it into clean cash (white).'),
  cook90: () => toastOnce('cook90', 'Purity is the whole game now. Lenny\'s upgrades help.'),
  cousins: () => {
    const at = SPOT.arena;
    W.lockArena = { x: at.x, y: at.y, r: 150 };
    makeEnemy('cousin', at.x - 60, at.y - 30, { i: 0, name: 'EZEQUIEL CALACA' }); makeEnemy('cousin', at.x + 60, at.y - 30, { i: 1, name: 'TOMAS CALACA' });
    music('boss');
  },
  labclear: () => {},
  final: () => toastOnce('final', 'The office door is open.')
};

/* ---------------- interactions: what the player can use in the world, by place ---------------- */
function interactables() {
  const list = [], st = curStep(), id = st && st.id;
  if (!W) return list;
  if (W.kind === 'town' || W.kind === 'hub') {
    list.push({ id: 'rv', x: SPOT.rv.x, y: SPOT.rv.y, label: 'Cook in the RV', when: () => W.kind === 'hub' || !(S.ep === 1 && S.step === 0), act: rvMenu });
  }
  if (W.kind === 'town') {
    if (!W.partner) list.push({ id: 'dusty', x: SPOT.dusty.x, y: SPOT.dusty.y, label: 'Talk to Dusty', act: () => story('talk:dusty') });
    list.push({ id: 'home', x: SPOT.home.x, y: SPOT.home.y, label: id && id.startsWith('sleep') ? 'Sleep' : 'Save the game', act: homeAct });
    list.push({ id: 'skyler', x: SPOT.skyler.x, y: SPOT.skyler.y, label: 'Talk to Marian', act: skylerTalk });
    list.push({ id: 'lenny', x: SPOT.lenny.x, y: SPOT.lenny.y, label: S.flags.shop ? 'Lenny\'s office (shop)' : 'Lenny\'s office', when: () => S.ep >= 2, act: () => { if (id === 'lenny' || id === 'lenny4') story('talk:lenny'); else shopMenu(); } });
    list.push({ id: 'taco', x: SPOT.taco.x, y: SPOT.taco.y, label: 'Taco Tranquilo', when: () => S.ep >= 3, act: () => { if (id === 'vela') story('talk:taco'); else convo([['vela', [S.ep >= 4 ? 'We are closed, Mr. Gray. For you, we are always closed.' : 'Back door, Mr. Gray. Ninety percent.']]]); } });
    list.push({ id: 'back', x: SPOT.back.x, y: SPOT.back.y, label: 'Back door', when: () => id === 'deliver', act: () => story('talk:back') });
    list.push({ id: 'carwash', x: SPOT.carwash.x, y: SPOT.carwash.y, label: 'Bubble Bros (launder)', when: () => S.ep >= 2 && id !== 'arena' && id !== 'cousins', act: launderMenu });
    list.push({ id: 'laundry', x: SPOT.laundry.x, y: SPOT.laundry.y, label: 'Lavanderia Brillante', when: () => S.ep >= 5, act: () => story('talk:laundry') });
    if (S.ep === 1 && !W.rafaFled) list.push({ id: 'rafa', x: SPOT.rafa.x, y: SPOT.rafa.y, label: 'Talk to Rafa', when: () => id === 'rafa', act: () => story('talk:rafa') });
  }
  if (W.kind === 'town' || W.kind === 'hub') for (const b of W.buyers) list.push({ id: 'buyer', x: b.x, y: b.y, label: 'Sell to ' + b.name, buyer: b, act: () => dealWith(b) });
  if (W.kind === 'lab' && id === 'final') list.push({ id: 'vela', x: LAB_SPOT.vela.x, y: LAB_SPOT.vela.y + 8, label: 'Confront Vela', act: () => story('talk:vela') });
  return list.filter(o => !o.when || o.when());
}
function skylerTalk() {
  const L = ['You\'re home late. Again. Where were you?', 'Hollis. Where does this money come from?', 'Who are you right now? I don\'t recognize you.', 'Someone called asking for "Schrodinger". I said wrong number. Was it?', 'Whatever this is... finish it. And come home.'];
  convo([['skyler', [L[Math.min(L.length - 1, S.ep - 1)]]], ['hollis', [['I was working, Marian.', 'Tutoring. It pays.', 'The same man you married.', 'Wrong number.', 'I will.'][Math.min(4, S.ep - 1)]]]]);
}
function homeAct() {
  const st = curStep();
  if (st && st.ev === 'sleep') {
    game.go('night', {}, { fade: 'dissolve' });
  } else { game.saves.save(0); A.sfx('confirm'); toast('Saved to slot 1. The house is quiet.'); }
}
// the night between days: the story's scene for the evening, then morning
function sleepNow() {
  S.day++; S.clock = 8.5; S.heat = Math.max(0, S.heat - 25); S.hp = 100;
  for (const k in S.flasks) S.flasks[k] = Math.max(S.flasks[k], k === 'smoke' && !S.flags.smoke ? 0 : 1);
  story('sleep');
}
