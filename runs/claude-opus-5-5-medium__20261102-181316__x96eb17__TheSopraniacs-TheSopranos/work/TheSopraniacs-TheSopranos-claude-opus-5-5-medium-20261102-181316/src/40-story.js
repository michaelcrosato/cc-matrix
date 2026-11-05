/* ---- STORY: dialogue as data, chapters and steps, who stands where, what can be used ---- */
const talk = new E.Dialog(game, { bg: ['#2a1c18', '#0e0806'], border: '#c8a060', nameColor: '#f0c860', lines: 3 });
const phone = new E.Dialog(game, { bg: ['#1a2a3a', '#081018'], border: '#8ab0d0', nameColor: '#a8e0ff', lines: 2 });
talk.voice = null; phone.voice = null;
const TALK_SPEED = { Slow: 28, Normal: 45, Fast: 80 };

// portraits: a live Humanoid per speaker (blinking, mouths moving while text types)
const PORTRAIT_LOOK = { TONY: 'tony', PAULIE: 'paulie', CHRISSY: 'chrissy', SIL: 'sil', 'DR. MELBA': 'melba', CARLA: 'carla', MA: 'ma', ARTIE: 'artie', ENZO: 'enzo', GEORGIE: 'georgie',
  'DOMMY BAGS': 'gambler', 'AGENT HARROW': 'harrow', RALPHIE: 'ralphie', 'T.J.': 'tj', MEDORA: 'medora', 'MAN AT THE COUNTER': 'stranger', WAITRESS: 'carla' };
const PORTRAITS = {};
function portraitOf(who) {
  const k = PORTRAIT_LOOK[who]; if (!k) return null;
  const look = k === 'tony' && S && S.outfit === 'tonyRobe' ? 'tonyRobe' : k;
  return PORTRAITS[look] || (PORTRAITS[look] = rigOf(LOOKS[look]));
}
function tickPortraits(dt) { for (const k in PORTRAITS) PORTRAITS[k].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); }

// a conversation: [[who, text], ...]; a line may be { who, text, choices: [...], pick(i) -> more lines or null }
function convo(lines, then) {
  const q = lines.slice();
  const next = () => {
    const l = q.shift();
    if (!l) { if (then) then(); return; }
    const o = Array.isArray(l) ? { who: l[0], text: l[1], fx: l[2] } : l;
    talk.speed = TALK_SPEED[game.settings.talkSpeed] || 45;
    if (o.fx) o.fx();
    talk.say(o.text, { name: o.who, portrait: portraitOf(o.who), portraitOpts: { zoom: 2.6, turn: .5 }, auto: attract ? 1.6 : 0, choices: attract ? null : o.choices,
      onChoice: (i) => { const more = o.pick ? o.pick(i) : null; if (more) q.unshift(...more); },
      onDone: () => next() });
  };
  next();
}
function radio(who, text, look) {
  phone.speed = TALK_SPEED[game.settings.talkSpeed] || 45;
  audio.sfx('ring');
  phone.say(text, { name: who, portrait: portraitOf(who), portraitOpts: { zoom: 2.6, turn: .5 }, auto: 2.6, modal: false, place: 'top' });
  void look;
}
const notes = [];
function note(text) { notes.push({ text, t: 3.2 }); if (notes.length > 3) notes.shift(); }

/* ---- CHAPTERS ---- */
const CHAPTERS = [null,
  { title: 'Woke Up This Morning', time: 'morning', song: 'town' },
  { title: 'The Fifty-Minute Hour', time: 'day', song: 'town' },
  { title: 'The Envelope', time: 'afternoon', song: 'town' },
  { title: 'New York State of Mind', time: 'night', song: 'night' },
  { title: 'Onion Rings', time: 'evening', song: 'town' }];
const LIGHT_BY_TIME = { morning: { amb: .92, tint: '#fff0d8' }, day: { amb: 1, tint: '#ffffff' }, afternoon: { amb: .85, tint: '#ffe0b0' }, night: { amb: .34, tint: '#6a7ab8' }, evening: { amb: .55, tint: '#ff9a7a' } };
// the steps: what the job log says, and where the arrow points
const STEPS = {
  paper: { ch: 1, title: 'Get the paper', text: 'The Star-Lodger is at the end of the driveway. In the robe. Like always.', at: () => ['town', 22 * T + 8, 13 * T + 4] },
  ducks: { ch: 1, title: 'Feed the ducks', text: 'The ducks are back in the pool. Bread is in the robe pocket.', at: () => ['town', 30 * T, 9.6 * T] },
  dress: { ch: 1, title: 'Get dressed', text: 'Go back inside and put some clothes on. You have an appointment.', at: () => ['town', 19.5 * T, 11.4 * T] },
  drive1: { ch: 1, title: "Drive to Dr. Melba's", text: "Take the SUV in the driveway to Dr. Melba's office, east on the north road.", at: () => driving ? ['town', 46.5 * T, 13.5 * T] : ['town', car.x, car.y] },
  therapy: { ch: 2, title: 'Talk to Dr. Melba', text: 'Fifty minutes. You pay for every one of them.', at: () => A.id === 'office' ? ['office', 8 * T, 4 * T] : ['town', 46.5 * T, 12.3 * T] },
  breathe: { ch: 2, title: 'Breathe', text: 'Hold BREATHE until your stress drops below 30. In through the nose.', at: () => null },
  pork1: { ch: 3, title: "Meet the crew at Satolli's", text: "Paulie called. The crew is at the pork store on Newark Ave.", at: () => A.id === 'pork' ? ['pork', 9 * T, 5.4 * T] : ['town', 18.5 * T, 31.3 * T] },
  collect: { ch: 3, title: 'Collect the envelopes', text: 'Three envelopes this week: the pastry shop, Vesuvio, and Dommy at the Bada Boom.', at: () => nextJobTarget() },
  pork2: { ch: 3, title: 'Bring the envelopes to Paulie', text: "Back to Satolli's. Paulie counts, you take your end.", at: () => A.id === 'pork' ? ['pork', 9 * T, 5.4 * T] : ['town', 18.5 * T, 31.3 * T] },
  yard: { ch: 4, title: 'Get to Baroni Sanitation', text: "Ralphie's New York guys torched the yard. Go settle it.", at: () => ['town', 24 * T, 37 * T] },
  yardfight: { ch: 4, title: 'Defend the yard', text: 'Put them down. All of them. Watch for guns.', at: () => null },
  ralphie: { ch: 4, title: 'Deal with Ralphie', text: 'Ralphie is on his knees in the dirt. Your call.', at: () => ralphieNpc() ? ['town', ralphieNpc().x, ralphieNpc().y] : null },
  diner: { ch: 5, title: "Dinner at Holstein's", text: "Carla says seven o'clock. The whole family. Get a booth.", at: () => A.id === 'diner' ? ['diner', 5.5 * T, 3.5 * T] : ['town', 66.5 * T, 31.3 * T] },
  booth: { ch: 5, title: 'Wait for the family', text: 'Sit. Pick a song. Order the onion rings for the table.', at: () => ['diner', 12 * T, 3 * T] },
  end: { ch: 5, title: '', text: '', at: () => null }
};
const JOB_SPOTS = { pastry: ['town', 29.5 * T, 32 * T, 'the pastry shop'], vesuvio: ['town', 43.5 * T, 32 * T, 'Vesuvio'], club: ['town', 55.5 * T, 31.3 * T, 'the Bada Boom'] };
function nextJobTarget() {
  for (const k of ['pastry', 'vesuvio', 'club']) if (!S.jobs[k]) { if (k === 'club' && A.id === 'club') return ['club', 13.5 * T, 6 * T]; return JOB_SPOTS[k].slice(0, 3); }
  return null;
}
function setStep(id) {
  S.step = id; const st = STEPS[id];
  if (st.ch !== S.ch) { S.ch = st.ch; chapterCard = 3.2; music(CHAPTERS[S.ch].song); setTimeOfDay(); placeVan(S.ch); }
  refreshCast();
  if (st.title && !attract) note('NEW JOB: ' + st.title);
  if (!attract && !HUB && game.saves) { try { game.saves.autosave(); } catch (e) { /* storage blocked */ } }
  checkpoint();
}
let chapterCard = 0;
function setTimeOfDay() {
  const t = LIGHT_BY_TIME[CHAPTERS[S.ch].time];
  L.enabled = true; L.ambient = A && !A.outdoor ? Math.min(.75, t.amb + .1) : t.amb;
  if (A && A.id === 'club') L.ambient = .42;
  if (A && A.outdoor && S.ch === 4) game.weather = { kind: 'rain', amount: .5, wind: .2, lightning: .08 }; else game.weather = null;
}
const night = () => S && CHAPTERS[S.ch].time === 'night';

/* ---- WHO STANDS WHERE (by area and step) ---- */
function npc(id, look, name, x, y, facing, o = {}) {
  const n = actor(x, y, LOOKS[look], Object.assign({ id, name, team: 'npc', hp: 999, r: 6, area: A.id }, o)); n.facing = facing; return n;
}
const ralphieNpc = () => npcs.find(n => n.id === 'ralphie');
function refreshCast() {
  npcs = [];
  if (!A) return;
  const st = S.step, ch = S.ch;
  if (A.id === 'town') {
    if (st === 'ducks') npcs.push(npc('carla', 'carla', 'CARLA', 27 * T, 9.8 * T, -Math.PI / 4));
    if (st === 'collect' && !S.jobs.pastry) npcs.push(npc('enzo', 'enzo', 'ENZO', 29.5 * T, 32.2 * T, Math.PI / 2, { pose: 'hips' }));
    if (st === 'collect' && !S.jobs.vesuvio) npcs.push(npc('artie', 'artie', 'ARTIE', 43.5 * T, 32.2 * T, Math.PI / 2));
    if (van && ch >= 3 && ch <= 4) npcs.push(npc('harrow', 'harrow', 'AGENT HARROW', van.x + 22, van.y + (van.baseLook < 0 ? 4 : -4), van.baseLook));
    if (st === 'ralphie') npcs.push(npc('ralphie', 'ralphie', 'RALPHIE', 25 * T, 40.5 * T, -Math.PI / 2, { pose: 'kneel' }));
    if (st === 'ralphie' || st === 'yardfight') npcs.push(npc('sil', 'sil', 'SIL', 22.5 * T, 36.5 * T, Math.PI / 2));
    if (ch === 3 && !S.flags.ma) npcs.push(npc('nurse', 'carla', 'NURSE', 44 * T, 43.2 * T, Math.PI / 2, { look2: true }));
  }
  if (A.id === 'office') npcs.push(npc('melba', 'melba', 'DR. MELBA', 8 * T, 4.2 * T, Math.PI));
  if (A.id === 'pork') {
    npcs.push(npc('gino', 'artie', 'GINO', 4 * T, 1.9 * T, Math.PI / 2));
    if (ch >= 3) { npcs.push(npc('paulie', 'paulie', 'PAULIE', 8 * T, 5.3 * T, 0)); npcs.push(npc('chrissy', 'chrissy', 'CHRISSY', 10 * T, 6.6 * T, Math.PI)); }
    if (st === 'pork2' || ch >= 4) npcs.push(npc('sil', 'sil', 'SIL', 9 * T, 7.4 * T, -Math.PI / 2));
  }
  if (A.id === 'club') {
    npcs.push(npc('georgie', 'georgie', 'GEORGIE', 4 * T, 1.4 * T, Math.PI / 2));
    if (st === 'collect' && !S.jobs.club && !S.flags.clubFight) npcs.push(npc('dommy', 'gambler', 'DOMMY BAGS', 13.5 * T, 6 * T, Math.PI));
  }
  if (A.id === 'groves') npcs.push(npc('ma', 'ma', 'MA', 7 * T, 3.4 * T, Math.PI, { pose: 'hips' }));
  if (A.id === 'diner') {
    npcs.push(npc('waitress', 'carla', 'WAITRESS', 10 * T, 4.4 * T, Math.PI / 2));
    npcs.push(npc('stranger', 'stranger', 'MAN AT THE COUNTER', 9.6 * T, 7.6 * T, -Math.PI / 2));
  }
  for (const n of npcs) if (n.id === 'waitress') n.rig = rigOf(Object.assign({}, LOOKS.carla, { hair: 'ponytail', colors: Object.assign({}, LOOKS.carla.colors, { hair: '#8a4a2a', cloth: '#e8e0d0' }) }));
  for (const n of npcs) if (n.id === 'nurse') n.rig = rigOf(Object.assign({}, LOOKS.carla, { hair: 'ponytail', colors: Object.assign({}, LOOKS.carla.colors, { hair: '#2a1a14', cloth: '#d8e8f0', pants: '#d8e8f0' }) }));
}

/* ---- HOTSPOTS: what interact does where (data: area, place, label, when, act) ---- */
const HOT = [
  { area: 'town', x: 22 * T + 8, y: 13 * T + 4, r: 16, label: 'Pick up the paper', when: () => S.step === 'paper', act: () => {
    S.flags.paper = true; audio.sfx('pickup');
    convo([['TONY', '"Waste Management Stocks Soar." ...Heh. Good for waste management.'], ['TONY', 'And the ducks are back. Look at that.']], () => setStep('ducks'));
  } },
  { area: 'town', x: 30 * T, y: 9.6 * T, r: 30, label: 'Feed the ducks', when: () => S.ch <= 5 && (S.step === 'ducks' || S.flags.ducksAgain !== S.ch), act: () => {
    for (const d of ducks) d.fed = 6; audio.sfx('quack'); P.bits(hero.x, hero.y - 6, 18, 10, ['#e8c890', '#c8a060']);
    if (S.step === 'ducks') {
      addStress(-20, 'The ducks calm you down. Stress -20');
      convo([['CARLA', 'Tony, you are feeding ducks in your bathrobe. The neighbors can see.'], ['TONY', "Let 'em look. These ducks, Carla... they came here. They picked us."],
        ['CARLA', "You have Dr. Melba at ten. Get dressed. And don't track bread crumbs on my carpet."]], () => setStep('dress'));
    } else { S.flags.ducksAgain = S.ch; addStress(-15, 'Ducks. Stress -15'); }
  } },
  { area: 'town', x: 19.5 * T, y: 11.4 * T, r: 14, label: 'Go inside and get dressed', when: () => S.step === 'dress', act: () => {
    audio.sfx('door'); game.flash('#000000', .4, 1);
    S.outfit = 'tony'; hero.rig = rigOf(LOOKS.tony); hero.look = LOOKS.tony;
    note('Dressed. The SUV is in the driveway.'); setStep('drive1');
  } },
  { area: 'town', x: 0, y: 0, r: 40, label: 'Get in the SUV', pos: () => car && [car.x, car.y], when: () => !driving && car && A.id === 'town' && S.outfit !== 'tonyRobe' && !fightOn, act: () => enterCar() },
  // the pork store's counter: gabagool for $40, and ammo from under it once you're in with the crew
  { area: 'pork', x: 4 * T, y: 3.6 * T, r: 20, label: 'Buy gabagool ($40)', when: () => S.money >= 40, act: () => {
    S.money -= 40; hero.hp = Math.min(hero.max, hero.hp + 40); S.hp = hero.hp; addStress(-10, 'Gabagool. Health +40, stress -10'); audio.sfx('heal');
    if (!S.flags.gino) { S.flags.gino = true; convo([['GINO', 'Gabagool, sliced thin, the way you like. On the house next time, T.'], ['TONY', "You said that last time."]]); }
  } },
  { area: 'pork', x: 11 * T, y: 3.4 * T, r: 16, label: 'Take ammo from the freezer', when: () => S.ch >= 3 && S.ammo < 24, act: () => { S.ammo = 24; audio.sfx('pickup'); note('Pistol: 24 rounds. Every shot draws heat.'); } },
  { area: 'diner', x: 12 * T, y: 3.2 * T, r: 16, label: 'Pick a song on the jukebox', when: () => S.step === 'booth' && !S.flags.song, act: () => jukebox() },
  { area: 'diner', x: 5.5 * T, y: 3.6 * T, r: 18, label: 'Sit in the booth', when: () => S.step === 'booth' && S.flags.song && !S.flags.sat, act: () => finale() },
  { area: 'town', x: 24 * T, y: 36.2 * T, r: 40, label: null, auto: true, when: () => S.step === 'yard' && !driving, act: () => yardFight() }
];
function hotspots() {
  const list = [];
  for (const h of HOT) { if (h.area !== A.id || !h.when()) continue; const p = h.pos ? h.pos() : [h.x, h.y]; if (p) list.push(Object.assign({}, h, { x: p[0], y: p[1] })); }
  for (const d of DOORS) if (A.id === 'town') list.push({ x: d.at[0], y: d.at[1], r: 14, label: 'Enter ' + d.label, act: () => enterDoor(d) });
  if (A.id !== 'town') { const [ex, ey] = roomExit(A.id); list.push({ x: ex, y: ey + 4, r: 14, label: 'Go outside', act: () => leaveRoom() }); }
  for (const n of npcs) if (n.area === A.id && TALKS[n.id] && !fightOn) list.push({ x: n.x, y: n.y, r: 22, label: 'Talk to ' + titleCase(n.name), act: () => TALKS[n.id](n), npc: n });
  return list;
}
const titleCase = s => s.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ').replace('Dr. melba', 'Dr. Melba').replace('T.j.', 'T.J.');

/* ---- DOORS ---- */
function enterDoor(d) {
  if (d.id === 'office' && S.step !== 'therapy' && S.step !== 'drive1') { convo([['TONY', "Melba's not in. It's not my day. I'm not gonna be one of those guys."]]); return; }
  if (d.id === 'diner' && S.ch < 5) { convo([['TONY', "Holstein's. Best onion rings in the state. Not now, though."]]); return; }
  if (d.id === 'groves' && S.ch !== 3) { convo([['TONY', 'Ma is napping. Thank God.']]); return; }
  if (d.id === 'office' && S.step === 'drive1') setStep('therapy');
  audio.sfx('door'); goArea(d.to, roomExit(d.to)[0], roomExit(d.to)[1] - 14, -Math.PI / 2, d.id === 'diner' && S.step === 'diner' ? () => setStep('booth') : null);
}
function leaveRoom() {
  const d = DOORS.find(q => q.to === A.id); audio.sfx('door');
  goArea('town', d.at[0], d.at[1] + 10, Math.PI / 2);
}
let pendingArea = null;
function goArea(id, x, y, facing, then) { pendingArea = { id, x, y, facing }; game.go('play', { area: id, x, y, facing, then }); }

/* ---- TALKS ---- */
const TALKS = {
  carla: () => convo([['CARLA', 'Get dressed, Tony.']]),
  melba: () => S.step === 'therapy' ? therapy() : convo([['DR. MELBA', S.step === 'breathe' ? 'Breathe, Tony. Hold it, then let it go. Slowly.' : "Same time next week, Tony. And try to notice when the anger starts."]]),
  paulie: () => {
    if (S.step === 'pork1') return meeting();
    if (S.step === 'collect') return convo([['PAULIE', `${['pastry', 'vesuvio', 'club'].filter(k => !S.jobs[k]).length} envelopes still out there, T. The day ain't getting any younger.`]]);
    if (S.step === 'pork2') return payday();
    return convo([['PAULIE', 'You ever think about the pyramids, T? Slaves, they say. I say: union labor.']]);
  },
  chrissy: () => convo([['CHRISSY', S.ch >= 4 ? "I'm with you, T. Whatever you need." : "I'm writing a screenplay, T. It's about a guy, and he's in the mob, but it's a metaphor."], ['TONY', "A metaphor for what?"], ['CHRISSY', "...I'll get back to you."]]),
  sil: () => S.step === 'ralphie' ? convo([['SIL', "Your call, Tony. Just... don't do it where the feds can see."]]) : convo([['SIL', '"Just when I thought I was out... they pull me back in."'], ['TONY', 'Do the other one. The good one.']]),
  gino: () => convo([['GINO', 'Capicola, sopressata, gabagool. Tell me what you want, T.']]),
  georgie: () => convo([['GEORGIE', S.jobs.club ? 'Dommy paid up? Good. He owes me twenty too.' : "Dommy's in the back booth, Tony. He's been drinking on your tab."]]),
  enzo: () => collection('pastry'),
  artie: () => collection('vesuvio'),
  dommy: () => collection('club'),
  harrow: () => convo([['AGENT HARROW', S.heat > 40 ? "Busy day, Tony? We're writing it all down." : 'Nice morning for a walk. You want a coffee? It\'s from the van.'], ['TONY', "I'm a waste management consultant. Consult this."]]),
  nurse: () => convo([['NURSE', "Your mother's been asking for you, Mr. S. Well. Complaining about you. It's the same thing with her."]]),
  ma: () => maVisit(),
  ralphie: () => ralphieChoice(),
  waitress: () => convo([['WAITRESS', S.flags.sat ? 'Onion rings for the table, coming right up.' : "Sit anywhere, hon. The booth by the window's open."]]),
  stranger: () => convo([['MAN AT THE COUNTER', '...'], ['TONY', 'Nice jacket.'], ['MAN AT THE COUNTER', '...']])
};

function therapy() {
  convo([
    ['DR. MELBA', 'Good morning, Tony. How have you been sleeping?'],
    { who: 'DR. MELBA', text: "Last time you mentioned the ducks. Let's start there. What do they mean to you?", choices: ['They\'re just ducks.', 'They left once. I lost it.', '(Say nothing. Stare.)'],
      pick: i => i === 0 ? [['DR. MELBA', 'Tony. You fainted in your driveway over "just ducks."', () => addStress(5)], ['TONY', '...Fine. They mean something.']]
        : i === 1 ? [['TONY', 'They had babies here. Then they flew off. And I was... I was afraid I was gonna lose my family.', () => { addStress(-15); S.respect += 0; }], ['DR. MELBA', "That's the first honest thing you've said in this room. Thank you."]]
        : [['DR. MELBA', 'Silence is allowed. It is fifty minutes either way. You are paying for it.', () => addStress(-3)]] },
    { who: 'DR. MELBA', text: 'And at work? Your "waste management" business?', choices: ["It's a family business.", 'Some guys have it coming.', "I'm the sad clown."],
      pick: i => i === 0 ? [['DR. MELBA', 'Families can be the hardest business of all.']] : i === 1 ? [['DR. MELBA', 'Do you hear yourself, Tony?', () => addStress(8)], ['TONY', 'I hear myself fine. That\'s the problem.']] : [['TONY', "Laughing on the outside, crying on the inside. Like Gary Cooper. The strong, silent type."], ['DR. MELBA', 'Gary Cooper never had a therapist.', () => addStress(-5)]] },
    ['DR. MELBA', "I want to give you a tool. When the room starts to spin, you breathe. In for four, hold, out for four."],
    ['DR. MELBA', `Try it now. Hold BREATHE. Stress lowers while you breathe; you'll move slowly.`, () => { S.flags.breathe = true; }]
  ], () => { setStep('breathe'); if (S.stress < 30) S.stress = 45; });
}
function breathePassed() {
  convo([['DR. MELBA', 'Good. See? You can do that anywhere. In the car. In a fight. At dinner.'], ['TONY', "In a fight. I'll tell the other guy to hold on a sec."]], () => {
    radio('PAULIE', "T! It's Paulie. Get down to Satolli's. We got the thing. The envelopes thing.", LOOKS.paulie);
    setStep('pork1');
  });
}
function meeting() {
  convo([
    ['PAULIE', 'There he is. The man. Sit, sit. Chrissy, get him a coffee.'],
    ['CHRISSY', "I'm not your waiter, Paulie."], ['PAULIE', "You're whatever I say you are till you get made, kid."],
    ['PAULIE', 'Three envelopes this week, T. The pastry shop, Artie at Vesuvio, and Dommy Bags. Dommy is "having trouble."'],
    ['TONY', 'Everybody\'s having trouble. That\'s why we exist.'],
    ['PAULIE', 'And watch it out there. The feds got a van on the avenue. The plumbing van. With no plumbers.'],
    ['TONY', "If that van sees me lean on somebody, it goes in a file. Too much heat and they pick me up. Got it."],
    ['PAULIE', 'Take some rounds from the freezer. Just in case. Not that you\'ll need it. Probably.']
  ], () => { setStep('collect'); radio('CARLA', "Tony, it's me. Your mother called. She wants you to visit. Green Groves. Today.", LOOKS.carla); });
}
function collection(k) {
  if (k === 'pastry') convo([
    ['ENZO', "Tony! Cannoli? Sfogliatelle? Fresh this morning. Your mother's favorite."],
    { who: 'ENZO', text: "Business is slow, Tony. The new place on Bloomfield, the cupcakes... it's killing me.", choices: ['Ask nicely ($800)', 'Lean on him ($1,200)', 'Let it slide this week'],
      pick: i => i === 0 ? [['TONY', 'Enzo. Times are tough all over. Do what you can.'], ['ENZO', 'God bless, Tony. Here. Eight hundred.', () => job('pastry', 800, 1, -3)]]
        : i === 1 ? [['TONY', "Cupcakes? You're telling me about cupcakes? Twelve hundred, or your oven has a very bad week.", () => { leanOn(); }], ['ENZO', 'Okay! Okay. Twelve. Madonna mia.', () => job('pastry', 1200, 2, 4)]]
        : [['TONY', 'Keep it. Buy some new flour. Next week, though.'], ['ENZO', "You're a good man, Tony. I'll light a candle.", () => job('pastry', 0, -1, -10)]] }
  ]);
  if (k === 'vesuvio') convo([
    ['ARTIE', "Tony, I swear on my mother's risotto. The fire, the insurance, the new chef quit. I'm under water here."],
    { who: 'ARTIE', text: "We grew up together, T. Little League. Can you carry me one more week?", choices: ['Pay in full ($1,000)', "Comp him: he's a friend", "I'm kidding. Half. ($500)"],
      pick: i => i === 0 ? [['TONY', "Artie. Friendship is friendship. Business is business. One thousand."], ['ARTIE', '...Here. I hope you choke on the braciole.', () => job('vesuvio', 1000, 1, 3)]]
        : i === 1 ? [['TONY', 'Forget about it. This week, the veal is on me.'], ['ARTIE', "You mean that? You're a prince, Tony. A prince.", () => job('vesuvio', 0, 3, -8)]]
        : [['TONY', "Give me five hundred and a table Saturday."], ['ARTIE', "Deal. The good table. By the fish tank.", () => job('vesuvio', 500, 2, -2)]] }
  ]);
  if (k === 'club') convo([
    ['DOMMY BAGS', "Tony! Whoa. Hey. I was just about to come find you. Swear to God."],
    ['TONY', 'Fifteen hundred, Dommy. Three weeks late. The vig is turning into its own person.'],
    ['DOMMY BAGS', 'Here\'s the thing, T. My cousins say I don\'t gotta pay you no more. They say New York says so.'],
    ['TONY', 'New York says so.'],
    ['DOMMY BAGS', "COUSINS! It's go time! Out back!"]
  ], () => clubFight());
}
function leanOn() { addStress(-4); if (van && A.id === 'town' && vanSees(hero)) { addHeat(12, 'seen'); note('The van saw that. Heat +12'); } }
function job(k, money, respect, stress) {
  S.jobs[k] = true; S.money += money; S.respect += respect; addStress(stress); S.envelopes++;
  if (money) { audio.sfx('cash'); note('Envelope: +' + fmt$(money)); } else note('No envelope. Respect ' + (respect >= 0 ? '+' : '') + respect);
  refreshCast();
  if (['pastry', 'vesuvio', 'club'].every(q => S.jobs[q])) { setStep('pork2'); radio('PAULIE', "That's all three? Beautiful. Get back here, T. Something came up.", LOOKS.paulie); }
}
function clubFight() {
  S.flags.clubFight = true; refreshCast();
  // out the back door into the alley beside the club: Dommy and his cousins
  goArea('town', 49.5 * T, 27 * T, Math.PI / 2, () => startFight([['thug', 49 * T, 24 * T], ['thug', 50 * T, 30 * T, 'COUSIN SAL'], ['bruiser', 48.5 * T, 22.6 * T, 'COUSIN BIG ANGIE']], () => {
    convo([['DOMMY BAGS', "Okay! OKAY! Fifteen hundred! I had it in my sock the whole time!"], ['TONY', "Next time, lead with the sock."]], () => job('club', 1500, 3, -6));
  }, { name: 'Alley behind the Bada Boom' }));
}
function payday() {
  const cut = Math.round(S.money * .2);
  convo([
    ['PAULIE', `Let me count. ${S.envelopes >= 3 ? 'All there.' : 'Light, T, but okay.'} Your end, my end, and the boss's end, which is also your end.`],
    ['SIL', "Tony. We got a problem. Ralphie's crew. From New York. They hit the yard. Baroni Sanitation is on fire."],
    ['TONY', 'On fire.'], ['SIL', "On fire, Tony. Like, with fire. They're still there. They're waiting for you."],
    ['TONY', 'Then let\'s not keep them waiting.'],
    ['CHRISSY', "I'm coming with you. (Player 2: press Start on a second controller, or 2 on the keyboard, to fight as Chrissy.)"]
  ], () => { S.money += 0; void cut; setStep('yard'); });
}
function maVisit() {
  if (S.flags.ma) return convo([['MA', "You came twice? What do you want, money?"]]);
  convo([
    ['MA', "Oh. Look who it is. The big man. I could be dead in here for a week, nobody would know."],
    ['TONY', "Ma, I was here Tuesday."],
    { who: 'MA', text: "Tuesday. Your father, God rest him, came every day. Even when he was in prison.", choices: ['Bring her pastries', 'Argue', 'Just sit with her'],
      pick: i => i === 0 ? [['MA', "From Enzo? His cannoli are dry. ...Leave them there.", () => { S.respect += 1; addStress(-5); }]]
        : i === 1 ? [['TONY', 'Dad was never "in prison" every day, Ma. That\'s not how it works.'], ['MA', "Oh, poor you. Poor you. I gave you everything.", () => addStress(18)], ['TONY', '(Breathe, Tony. In for four.)']]
        : [['MA', '...The TV in here only gets one channel. It\'s all murder.'], ['TONY', 'Yeah, Ma. Me too.', () => addStress(-12)]] },
    ['MA', 'Go. Go on. You have your important business. I\'ll be fine. Alone.']
  ], () => { S.flags.ma = true; S.respect += 1; note('Visited Ma. (Family matters.)'); refreshCast(); });
}

/* ---- ENCOUNTERS ---- */
function startFight(list, done, o = {}) {
  fightOn = { done, name: o.name || 'Fight', waves: o.waves || null, wave: 0 };
  for (const [k, x, y, name] of list) spawnFoe(k, x, y, { name });
  music('fight'); note(fightOn.name + '!');
  checkpoint();
}
function updateFight(dt) {
  if (!fightOn) return;
  if (fightOn.waitT > 0) fightOn.waitT -= dt;
  if (foes.some(f => !f.dead)) return;
  const F = fightOn;
  if (F.waves && F.wave < F.waves.length) { const w = F.waves[F.wave++]; game.after(1.2, () => { for (const [k, x, y, name] of w.foes) spawnFoe(k, x, y, { name }); if (w.say) radio(w.say[0], w.say[1]); }); F.waitT = 1.3; return; }
  if (F.waitT > 0) return;
  fightOn = null; music(S.ch === 4 ? 'night' : CHAPTERS[S.ch].song); audio.sfx('powerup'); addStress(-5);
  if (F.done) F.done();
}
function yardFight() {
  setStep('yardfight');
  convo([['SIL', "Tony! Over here! They came through the gate. Five, six of them. And Ralphie's got a piece."], ['TONY', 'Stay behind the truck, Sil.']], () => {
    startFight([['thug', 20 * T, 39 * T], ['thug', 30 * T, 43 * T], ['thug', 26 * T, 44 * T]], () => {
      setStep('ralphie');
      convo([['RALPHIE', "Alright, alright! Tony! Come on! It was a joke! New York humor! We were just gonna... roast marshmallows!"]]);
    }, { name: 'Baroni Sanitation', waves: [
      { foes: [['bruiser', 33 * T, 38 * T, 'BIG LOUIE'], ['gunner', 15 * T, 37 * T], ['thug', 31 * T, 45 * T]], say: ['SIL', 'More of them! Behind the dumpsters!'] },
      { foes: [['boss', 24 * T, 44.5 * T, 'RALPHIE'], ['gunner', 33 * T, 44 * T]], say: ['RALPHIE', "Tony Sopraniaco! You fat, sad, duck-feeding--"] }
    ] });
  });
}
function ralphieChoice() {
  convo([
    { who: 'RALPHIE', text: "Tony, please. I got a horse. I got a kid. Let me crawl back to New York.", choices: ['Let him crawl back', 'Make an example of him', 'Take his money and let him go'],
      pick: i => i === 0 ? [['TONY', "Go. Tell New York the yard is mine. Tell 'em the ducks are mine. Tell 'em everything is mine."], ['RALPHIE', "You're a saint, Tony!", () => { S.respect += 2; addStress(-10); }]]
        : i === 1 ? [['TONY', '(Tony drags Ralphie behind the garbage truck. A long minute. Then he comes back alone, wiping his hands.)', () => { S.respect += 6; addStress(25); addHeat(20); }], ['SIL', "...We don't talk about this. Ever."]]
          : [['TONY', 'Your wallet. Your watch. Your pinky ring. Now crawl.'], ['RALPHIE', 'This was my grandfather\'s ring!', () => { S.money += 2500; S.respect += 3; addStress(-4); audio.sfx('cash'); }]] }
  ], () => {
    npcs = npcs.filter(n => n.id !== 'ralphie');
    radio('CARLA', "Tony? Holstein's. Seven o'clock. The kids are coming. Please, just once, be on time.", LOOKS.carla);
    setStep('diner');
  });
}
function jukebox() {
  const names = ['"Kearny Streetlights"', '"Turnpike Exit 16W"', '"Onion Ring Serenade"'];
  convo([{ who: 'TONY', text: 'A quarter in the jukebox. Something the family likes.', choices: names, pick: i => { S.song = i; S.flags.song = true; audio.music(SONGS['juke' + (i + 1)]); curSong = 'juke' + (i + 1); return [['TONY', 'Yeah. That one.']]; } }]);
}
function finale() {
  S.flags.sat = true; hero.x = 5.5 * T; hero.y = 3.4 * T; hero.facing = Math.PI / 2; hero.pose = 'kneel'; finaleOn = 0;
  const fam = [['carla', 'CARLA', 4.5 * T], ['tj', 'T.J.', 6.5 * T]];
  const [ex, ey] = roomExit('diner');
  game.script(function* () {
    yield 1.2;
    for (const [id, name, tx] of fam) {
      audio.sfx('bell'); yield .6;
      const n = npc(id, id === 'tj' ? 'tj' : id, name, ex, ey - 4, -Math.PI / 2); npcs.push(n);
      yield E.until(() => { const dx = tx - n.x, dy = 4.4 * T - n.y, d = Math.hypot(dx, dy); n.vx = dx / (d || 1) * 40; n.vy = dy / (d || 1) * 40; n.facing = Math.atan2(dy, dx); return d < 4; });
      n.vx = n.vy = 0; n.facing = -Math.PI / 2; n.pose = id === 'medora' ? null : 'kneel';
      let said = false;
      if (id === 'carla') convo([['CARLA', 'You got here first. Mark it on the calendar.'], ['TONY', 'I ordered the onion rings. For the table.']], () => { said = true; });
      else if (id === 'tj') convo([['T.J.', "Remember what you said once? Focus on the good times."], ['TONY', 'Try to remember the times that were good.']], () => { said = true; });
      else { said = true; yield 1; }
      yield E.until(() => said);
    }
    radio('MEDORA', "I'm parking! I'm parking! Two minutes, Dad!", LOOKS.medora);
    yield 2.5;
    finaleOn = 1;
  });
}
let finaleOn = -1;
// the old-fashioned end: the man at the counter goes to the men's room, the bell rings, Tony looks up. Cut to black
function finaleTick(dt) {
  if (finaleOn < 1) return;
  finaleOn += dt;
  const stranger = npcs.find(n => n.id === 'stranger');
  if (stranger && finaleOn > 1.5 && finaleOn < 4) { stranger.vx = 20; stranger.vy = 0; stranger.facing = 0; }
  else if (stranger) { stranger.vx = stranger.vy = 0; }
  if (finaleOn > 4.5 && !S.flags.bell) { S.flags.bell = true; audio.sfx('bell'); hero.pose = null; hero.facing = -Math.PI / 2; }
  if (finaleOn > 5.6 && !S.flags.cut) { S.flags.cut = true; audio.music(null); curSong = null; audio.mute ? 0 : 0; setStep('end'); game.go('black', { fade: 0 }); }
}
