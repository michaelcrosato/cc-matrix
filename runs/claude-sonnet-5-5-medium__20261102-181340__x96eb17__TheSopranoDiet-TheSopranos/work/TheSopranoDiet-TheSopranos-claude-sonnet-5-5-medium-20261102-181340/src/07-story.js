/* the episode: yard -> shakedowns -> ambush -> therapy -> the dream in the snow -> the diner */
(() => {
const G = SD, E = G.E, game = G.game, W = G.W, { clamp } = E;
const SAY = (n, t) => W.line(n, t);

/* ---------------- shakedown scripts ---------------- */
const TXT = {
  gino: {
    intro: [['GINO', "Tommy! Sit. Sit. I got the soppressata in, the capicola, the whole religion."], ['TOMMY', "I'm not here for the meat, Gino. I'm here for the envelope."], ['GINO', 'Business is slow. Everybody eats chicken now. Chicken! It is a crime against nature.']],
    q: 'The envelope, Tommy. How do you want to play this?',
    charmWin: [['TOMMY', "Gino. We're friends. Friends don't make me say the word 'vig'."], ['GINO', 'Okay, okay. A little something for the neighborhood. Here.']],
    charmLose: [['GINO', "Charm? You charm the guy at the DMV, Tommy. Here's a sandwich's worth. That's all you get."]],
    menWin: [['TOMMY', 'Nice slicer. Be a shame if it learned to slice something other than provolone.'], ['GINO', "Madonn'! Take it! Take the whole drawer!"]],
    menLose: [['GINO', "Menace? In MY store? Boys! The big guy's being rude!"]],
    gift: 'Take a capicola for the road, Tommy. On the house.'
  },
  stella: {
    intro: [['STELLA', "Oh, it's you. I just ran a load of your cousin's tablecloths. Do you know what that's like?"], ['TOMMY', 'Stella, I just need the thing.'], ['STELLA', 'There is lint in places lint has no business being. Spiritually, I mean.']],
    q: 'You want the envelope? Ask me nicely. Or not nicely. I have a dryer.',
    charmWin: [['TOMMY', 'You look great. Did you do something? New dryer sheets?'], ['STELLA', "...Fine. You're a pig, but a charming pig. Here."]],
    charmLose: [['STELLA', 'Spare me. Half. And I want you to fold something.']],
    menWin: [['TOMMY', 'It would be a real shame if the machines started eating quarters.'], ['STELLA', "Okay. Okay! God. It's in the lint trap. Take it."]],
    menLose: [['STELLA', 'You threaten ME? I have a cousin in the carpenters union. Boys!']],
    gift: 'Here, a cannoli. My sister made it. Take it before I think about it.'
  },
  maria: {
    intro: [['MARIA', "Tommy! You're thin. Not true, you're not thin. You look like a man with a question."], ['TOMMY', 'The question is an envelope, Maria.'], ['MARIA', 'I make a pie so good people confess things. Last week a priest cried.']],
    q: "Eat first, talk after. Oh wait, you're on a diet. So talk. How do you want to talk?",
    charmWin: [['TOMMY', "Maria, your sauce is why I still believe in a higher power. Also there's a thing I need."], ['MARIA', 'Flattery. From you? Here. Do not tell my husband.']],
    charmLose: [['MARIA', "Nice try. You get a slice of what I think you're owed."]],
    menWin: [['TOMMY', 'Funny how many pizza places catch fire these days.'], ['MARIA', "You wouldn't. ...Fine, you would. Take it."]],
    menLose: [['MARIA', 'Oh, you want to be tough in my kitchen? Salvatore! Gennaro! Come out!']],
    gift: 'One slice, on the house. Just the crust. Just to see.'
  }
};

function* shakedown(shop) {
  const S = G.S, T = TXT[shop.id];
  yield* W.convo(T.intro);
  const pick = yield* W.ask(shop.name, T.q, ['Charm him', 'Lean on him', 'Come back later']);
  if (pick === 2) { yield SAY('TOMMY', "Let's talk another day. I'll go enjoy the weather."); return; }
  const repeat = typeof S.done[shop.id] === 'number', pay = Math.round(shop.pay * (repeat ? .6 : 1));
  let cash = 0, resp = 0, brawl = false;
  if (pick === 0) {
    const ok = Math.random() < clamp(.58 + G.rank() * .07 - shop.tough * .35 - S.stress / 400, .12, .92);
    yield* W.convo(ok ? T.charmWin : T.charmLose);
    cash = Math.round(pay * (ok ? .75 : .3)); resp = ok ? 4 : 1; S.stress = clamp(S.stress - (ok ? 6 : 0), 0, 100);
  } else {
    const ok = Math.random() < clamp(.48 + G.rank() * .09 + S.gut / 500 - shop.tough * .4, .1, .9);
    yield* W.convo(ok ? T.menWin : T.menLose);
    if (ok) { cash = pay; resp = 8; S.stress = clamp(S.stress + 5, 0, 100); }
    else { brawl = true; S.flags.pendingBrawl = shop.id; S.flags.pendingPay = pay; }
  }
  if (brawl) {
    const a = W.A, [x, y] = shop.at;
    W.spawn('thug', x + 30, y + 18, { alert: true }); W.spawn('thug', x - 30, y + 18, { alert: true }); if (G.rank() >= 1) W.spawn('gunman', x + 60, y + 40, { alert: true });
    G.toast('Shakedown gone sideways', 'Handle the muscle.', '#ff9a8a'); return;
  }
  finishShop(shop, cash, resp);
  yield* gift(shop, T);
}
function* gift(shop, T) {
  const S = G.S, f = shop.id === 'stella' ? 'cannoli' : shop.id === 'gino' ? 'capicola' : 'salad';
  const text = shop.id === 'maria' ? T.gift : T.gift;
  const p = yield* W.ask(shop.name, text, ['Take it', "Can't. Doctor's orders."]);
  if (p === 0) { S.bag[f]++; S.stress = clamp(S.stress - 4, 0, 100); G.toast(G.FOOD[f].name + ' acquired', 'Willpower: dented.', '#ffd36a'); yield SAY('TOMMY', 'For the road. The road is long.'); }
  else { S.refused++; W.gain(0, 3, 'Self-control'); S.bag.salad++; yield SAY('TOMMY', "Doctor's orders. I'll take a cup of lettuce for the road."); G.toast('Salad acquired', 'You are the hero of your own cholesterol.', '#8ad06a'); }
}
function finishShop(shop, cash, resp) {
  const S = G.S;
  S.done[shop.id] = W.round ? S.time : true; S.shakes = (S.shakes || 0) + 1;
  W.gain(cash, resp, 'Collected: ' + shop.title);
}

/* ---------------- food cart ---------------- */
function* cart() {
  const S = G.S; yield SAY('VINNY', "Vinny's Cart. Everything's fresh. Fresh is a legal term.");
  for (;;) {
    const p = yield* W.ask('VINNY', 'What can I get you? ($' + S.cash + ' in your pocket)', ['Capicola  $15', 'Garden salad  $8', 'Cannoli  $12', 'Nothing, thanks']);
    if (p === 3) { yield SAY('VINNY', 'Come back hungry. Or not. I judge nobody. Silently, I judge.'); return; }
    const key = ['capicola', 'salad', 'cannoli'][p], f = G.FOOD[key];
    if (S.cash < f.price) { yield SAY('VINNY', "Credit's for people who have credit, boss."); continue; }
    S.cash -= f.price; S.bag[key]++; game.audio.sfx('cash'); G.toast(f.name + ' bought', '-$' + f.price, '#ffd36a');
  }
}

/* ---------------- area setup: who is where, what can be done ---------------- */
W.setupArea = (A, data) => {
  const S = G.S, H = W.hero;
  const npc = (id, name, rig, pos, o) => { const n = Object.assign({ id, name, x: pos[0], y: pos[1], rig: G.makeRig(rig), facing: Math.PI / 2, t: 0 }, o || {}); W.npcs.push(n); A.solids.push({ x: n.x, y: n.y, r: 5 }); return n; };
  const inter = (x, y, label, act, o) => { const it = Object.assign({ x, y, label, act, r: 26 }, o || {}); W.inter.push(it); return it; };
  W.bossHandled = false;
  if (A.name === 'yard') {
    const carm = npc('carm', 'CARM', 'carm', A.carm);
    inter(carm.x, carm.y, 'Talk to Carm', () => W.script(carmTalk));
    inter(A.bread[0], A.bread[1], 'Take stale bread', () => { S.flags.bread = true; game.audio.sfx('pickup'); G.toast('Stale bread', 'Ducks have standards, but not high ones.', '#ffd36a'); }, { show: () => !S.flags.bread, r: 22 });
    A.ducks.forEach((p, i) => {
      const d = { duck: true, name: null, x: p[0], y: p[1], ox: p[0], oy: p[1], ph: i * 2.1, rig: G.makeDuck(), t: 0, noName: true }; W.npcs.push(d);
      inter(A.docks[i][0], A.docks[i][1], S.flags.bread ? 'Feed the duck' : 'Look at the duck', () => {
        if (!S.flags.bread) { game.audio.sfx('quack'); W.script(function* () { yield SAY('TOMMY', "He's looking at me like he knows about the cold cuts."); }); return; }
        S.flags['duck' + i] = true; S.ducks++; S.stress = clamp(S.stress - 14, 0, 100); game.audio.sfx('quack'); game.audio.sfx('heal');
        game.particles.bits(p[0], p[1], 6, 8, ['#e8c070', '#fff0c0']); G.toast('Duck fed (' + S.ducks + '/3)', 'Stress -14. Nature is healing.', '#8ad06a');
      }, { show: () => !S.flags['duck' + i], r: 26 });
    });
    if (!S.flags.intro && !W.demo) { S.flags.intro = true; W.script(yardIntro); }
    else if (!S.flags.intro) { S.flags.intro = true; }
  }
  if (A.name === 'town') {
    A.shops.forEach(sh => {
      const own = npc(sh.id, sh.name, sh.id, sh.at, { facing: Math.PI / 2 });
      inter(own.x, own.y, 'Shake down ' + sh.name, () => W.script(() => shakedown(sh)), { r: 30, show: () => !S.done[sh.id] || (W.round && S.time - S.done[sh.id] > 40) });
      inter(own.x, own.y, 'Chat with ' + sh.name, () => W.script(function* () { yield SAY(sh.name, 'We are square, Tommy. Come back when you have an appetite. Or a warrant.'); }), { r: 30, show: () => S.done[sh.id] && !(W.round && S.time - S.done[sh.id] > 40) });
    });
    const pauly = npc('pauly', 'PAULY', 'pauly', G.P(25, 9.2));
    inter(pauly.x, pauly.y, 'Talk to Pauly', () => W.script(paulyTalk), { r: 30 });
    const v = npc('vinny', 'VINNY', 'vinny', G.P(21, 17.4));
    inter(v.x, v.y, "Vinny's food cart", () => W.script(cart), { r: 30 });
    W.pickups.push({ x: G.P(33, 13)[0], y: G.P(33, 13)[1], kind: 'cannoli', v: 1, t: 1 }, { x: G.P(49, 10)[0], y: G.P(49, 10)[1], kind: 'salad', v: 1, t: 1 }, { x: G.P(30, 14)[0], y: G.P(30, 14)[1], kind: 'cash', v: 40, t: 1 });
    if (W.round) { S.flags.ambushStarted = false; W.nextWave = 45; }
    if (!S.flags.townIntro && !W.round && !W.demo) { S.flags.townIntro = true; W.script(function* () { yield SAY('TOMMY', "Main Street. Where everybody's smiling and everybody owes somebody."); yield SAY('TOMMY', 'Three envelopes. Then Dr. Mel-Fee. Then maybe, God willing, a nap.'); }); }
  }
  if (A.name === 'therapy') {
    S.chap = Math.max(S.chap, 2);
    const doc = npc('doc', 'DR. MEL-FEE', 'melfee', A.doc, { facing: Math.PI, pose: undefined });
    W.hero.body.x = A.couch[0]; W.hero.body.y = A.couch[1] + 18;
    if (!S.flags.therapyDone) { W.cut = true; W.script(therapyScript); }
    else inter(doc.x, doc.y, 'Talk to Dr. Mel-Fee', () => W.script(function* () { yield SAY('DR. MEL-FEE', 'Same time next week. Bring the dream. Leave the sandwich.'); }));
  }
  if (A.name === 'woods') {
    S.chap = Math.max(S.chap, 3);
    const d = { duck: true, name: 'DUCK', x: A.duck[0], y: A.duck[1], ox: A.duck[0], oy: A.duck[1], ph: 0, rig: G.makeDuck(), t: 0 }; W.npcs.push(d);
    inter(d.x, d.y, 'Talk to the Duck', () => W.script(duckTalk), { r: 30 });
    W.pickups.push({ x: G.P(10, 28)[0], y: G.P(10, 28)[1], kind: 'salad', v: 1, t: 1 }, { x: G.P(19, 19)[0], y: G.P(19, 19)[1], kind: 'cannoli', v: 1, t: 1 }, { x: G.P(30, 9)[0], y: G.P(30, 9)[1], kind: 'capicola', v: 1, t: 1 });
    if (!S.flags.woodsIntro) { S.flags.woodsIntro = true; W.cut = true; W.script(woodsIntro); }
    game.lights.ambient = .32; game.lights.refresh && game.lights.refresh();
  }
  if (A.name === 'diner') {
    S.chap = 4; W.cut = true;
    const b = A.booth;
    const carm = npc('carm', null, 'carm', [b[0] + 24, b[1] - 8], { pose: 'kneel', noName: true, facing: Math.PI }), an = npc('an', null, 'anthony', [b[0] + 24, b[1] + 8], { pose: 'kneel', noName: true, facing: Math.PI }), me = npc('me', null, 'meadow', [b[0] - 24, b[1] + 8], { pose: 'kneel', noName: true, facing: 0 });
    const wt = npc('wt', null, 'waiter', G.P(11, 6.2), { noName: true });
    npc('stranger', null, 'thug', G.P(15.5, 5.6), { pose: 'kneel', noName: true, facing: Math.PI / 2 });
    W.hero.body.x = b[0] - 24; W.hero.body.y = b[1] - 8; W.hero.facing = 0; W.hero.seated = true;
    W.script(finale);
  }
  S.menace = S.menace || 0;
};

/* ---------------- scenes of dialogue ---------------- */
function* yardIntro() {
  yield* W.convo([
    ['TOMMY', 'Another beautiful morning in New Jersey. Birds singing. Ducks in the pool. Cardiologist in my ear.'],
    ['CARM', "Tommy! Dr. Cusamano's list is on the fridge. No capicola. No gravy. No 'just a taste'."],
    ['TOMMY', "A taste isn't eating. A taste is research."],
    ['CARM', 'The ducks, Tommy. They are hungry too, and they have never once lied to me. Stale bread is on the patio table. Go be a human being for five minutes.']
  ]);
}
function* carmTalk() {
  const S = G.S;
  if (S.flags.yardDone) { yield SAY('CARM', 'Salad, Tommy. Salad. Say it back to me.'); yield SAY('TOMMY', 'Salad.'); return; }
  if (!S.flags.bread) { yield SAY('CARM', 'The bread, Tommy. On the table. Where a bread usually is.'); return; }
  if (S.ducks < 3) { yield SAY('CARM', 'Three ducks. You fed ' + S.ducks + '. Even the ducks are keeping score.'); return; }
  yield* W.convo([
    ['CARM', 'Look at that. A man who feeds the ducks. Now go to town, collect what you are owed, and see Dr. Mel-Fee at four.'],
    ['TOMMY', 'I got a busy day, Carm.'],
    ['CARM', 'You always have a busy day. And Tommy? Salad.'],
    ['TOMMY', 'Salad. Sure. Absolutely. Salad.']
  ]);
  S.flags.yardDone = true; S.chap = 1; G.toast('The gate is open', 'Head south to Main Street.', '#ffd36a'); game.audio.sfx('secret');
}
function* paulyTalk() {
  const S = G.S, n = S.shakes || 0;
  const l = n === 0 ? [['PAULY', "Boss. Gino's behind, Stella's behind, Maria's behind. Everybody's behind. It's like a parade of behinds."], ['TOMMY', 'Pauly, I will walk the line. Slowly. With salad.']]
    : n < 3 ? [['PAULY', "Heard the Calabresi kid's been seen on Main Street. Wears a scarf in June. That's a red flag, medically and otherwise."]]
      : [['PAULY', 'You did it. All three. Go see the shrink. Tell her I said hi. Do not tell her what I did with the lawn gnomes.']];
  yield* W.convo(l);
  if (!S.flags.paulyTip) { S.flags.paulyTip = true; yield SAY('PAULY', 'Tip: fill your Menace meter by landing hits, then press the Look. It freezes people. Mostly out of embarrassment.'); }
}
function* duckTalk() {
  yield* W.convo([['DUCK', 'Quack. And I mean that in the most disapproving way.'], ['TOMMY', "I don't need a lecture from a duck in a snowstorm."], ['DUCK', 'The Russian is up the trail. He has footprints. He has unresolved issues. Mostly with you.']]);
}

function* woodsIntro() {
  yield* W.convo([
    ['TOMMY', "Why am I in the Pine Barrens... in a bowling shirt? This is a dream. I know it's a dream. The snow is too clean."],
    ['DUCK', 'Quack. That was not a quack. That was an accusation.'],
    ['TOMMY', 'The duck is talking. Cool. That tracks.'],
    ['DUCK', 'Follow the footprints. At the end there is a man. At the end there is always a man.']
  ]);
  W.cut = false;
}

function* therapyScript() {
  const S = G.S;
  yield W.line('DR. MEL-FEE', 'Come in, sit. You look... fed. How are you feeling today, Tommy?');
  W.cut = true;
  let ins = 0;
  const topics = [
    ['Let us start with the ducks. You mentioned the ducks last week.', ['They left. I felt abandoned by waterfowl.', "They're ducks. They swim.", 'I fed them this morning. It was nice.'], [2, 0, 1]],
    ['And the diet. Dr. Cusamano says your numbers are, quote, theatrical.', ["I'm a changed man. I had one cannoli. Maybe two.", "I eat when I'm anxious. I'm anxious when I eat.", 'Nobody tells me what to put in my mouth.'], [0, 2, 0]],
    ['And your work. The... property management.', ['Collections. Waste-adjacent. Mostly paperwork.', "Sometimes I wonder if I'm the problem.", "That's privileged."], [0, 2, 0]]
  ];
  for (const [q, ch, val] of topics) {
    const p = yield* W.ask('DR. MEL-FEE', q, ch);
    ins += val[p];
    yield SAY('DR. MEL-FEE', val[p] >= 2 ? 'Now that is the first honest thing you have said in this room since April.' : val[p] === 1 ? 'Mm. That is something. Hold onto that.' : 'I notice you are answering the question next to the question.');
  }
  S.insight += ins; S.stress = 0; W.gain(0, ins * 3, 'Session complete');
  yield* W.convo([['DR. MEL-FEE', 'Our time is up. But let me give you a tool. Pick the one you will actually use.']]);
  const p = yield* W.ask('DR. MEL-FEE', 'Which tool?', ['Slow breathing  (panic is gentler)', 'Thick skin  (+20 health, take less)', 'Light eater  (salad hits harder, gut shrinks)']);
  const perk = ['breath', 'thick', 'light'][p]; S.perks.push(perk); G.toast('Perk gained: ' + ['Slow breathing', 'Thick skin', 'Light eater'][p], 'Insight ' + S.insight, '#ffd36a'); S.hp = G.maxHp();
  yield* W.convo([
    ['DR. MEL-FEE', 'Tonight, pay attention to your dreams. Dreams are just the mind eating something it could not digest.'],
    ['TOMMY', 'I am going to dream about a sandwich.'],
    ['DR. MEL-FEE', 'Of course you are. See you next week.']
  ]);
  S.flags.therapyDone = true; S.chap = 3; G.autosave();
  game.flash('#ffffff', .8, 1); game.go('play', { area: 'woods', demo: W.demo }, { fade: 'swirl', seconds: .9 });
}

/* the fight at the end of the footprints */
G.bossDown = () => W.script(function* () {
  const S = G.S; W.cut = true; W.shots.clear();
  yield* W.convo([
    ['SLAVKO', 'Tommy... you hit like a man who has not eaten since breakfast. That is the saddest thing I ever hear.'],
    ['TOMMY', "I had a salad. This is what it does to a person."],
    ['SLAVKO', 'The duck. The ducks are the only ones who are honest in this entire dream. Wake up, Tommy. Dinner is soon.']
  ]);
  W.gain(150, 20, 'Slavko is down');
  S.flags.woodsDone = true; game.flash('#ffffff', 1, 1); G.autosave && G.autosave();
  S.chap = 4; game.go('play', { area: 'diner', demo: W.demo }, { fade: 'white', seconds: 1.1 });
});

function* finale() {
  const S = G.S;
  G.music('diner');
  yield 1;
  yield* W.convo([
    ['TOMMY', 'The diner. Quiet. Warm. Onion rings the size of a steering wheel.'],
    ['ANTHONY', "Dad, I got a C in 'Respecting the Environment'. It's a conspiracy."],
    ['CARM', 'Tommy, the doctor said. The doctor said it with a face.'],
    ['MEADOW', "Sorry, sorry - I've been parallel parking for ten minutes. The street is a liar."]
  ]);
  const p = yield* W.ask('WAITER', 'What are we having, Mr. S?', ['The onion rings. The whole basket.', 'Side salad. Dressing on the side.', 'Just coffee.']);
  if (p === 0) { S.gut = clamp(S.gut + 12, 0, 100); yield SAY('TOMMY', 'Life is short. Onion rings are shorter.'); }
  else if (p === 1) { S.gut = clamp(S.gut - 6, 0, 100); S.refused++; yield SAY('TOMMY', 'Side salad. I contain multitudes.'); }
  else { S.gut = clamp(S.gut - 3, 0, 100); yield SAY('TOMMY', 'Coffee. A man with nothing to hide drinks it black.'); }
  game.audio.sfx('munch');
  yield* W.convo([
    ['CARM', 'You know, this is nice. A normal family. At a normal diner.'],
    ['TOMMY', 'Nothing normal about us, Carm. But the rings are exceptional.']
  ]);
  game.audio.sfx('bell'); yield .6;
  W.hero.facing = -Math.PI / 4;
  yield W.line('TOMMY', 'A man at the counter keeps looking at the door. Probably nothing. It is probably nothing. Meadow is coming in and the bell is-');
  /* cut to black, mid-sentence, as the genre demands */
  W.talk.close(); G.stopMusic(); game.audio.music(null); W.noHud = true;
  W.black = 1; yield 5;
  S.score = G.calcScore(); S.flags.finished = true; W.noHud = false;
  if (!W.demo) G.saveFinish && G.saveFinish();
  game.go('results', { demo: W.demo }, { fade: 0 });
}

G.calcScore = () => { const S = G.S; return Math.round(S.cash + S.respect * 12 + S.kills * 15 + S.ducks * 25 + S.insight * 20 + S.refused * 30 + Math.max(0, 50 - S.gut) * 8 - S.panics * 40); };

/* ---------------- tick: ambush, encounters, music, advance ---------------- */
G.storyTick = dt => {
  const S = G.S, A = W.A, H = W.hero, b = H.body; if (!A) return;
  const idle = !W.busy && !W.talk.open && !W.cut;
  if (A.name === 'town') {
    const done = A.shops.filter(s => S.done[s.id]).length;
    if (W.round) {
      W.nextWave -= dt; if (W.nextWave <= 0 && W.aliveCount() < 4 && G.hubGoing()) { W.nextWave = 50; waveAt(A.ambush, [['thug', 'thug', 'gunman'], ['bruiser', 'thug'], ['gunman', 'gunman', 'thug']][Math.floor(Math.random() * 3)]); G.toast('Calabresi boys!', 'Eyes up.', '#ff9a8a'); game.audio.sfx('whistle'); }
    } else {
      if (idle && done >= 2 && !S.flags.ambushStarted) { S.flags.ambushStarted = true; ambush(); }
      if (S.flags.ambushStarted && !S.flags.ambushDone && !W.busy && W.aliveCount() === 0 && S.flags.ambushWave >= 2) { S.flags.ambushDone = true; W.gain(40, 25, 'Calabresi crew sent home'); }
      if (S.flags.ambushStarted && !S.flags.ambushDone && S.flags.ambushWave === 1 && W.aliveCount() === 0 && !W.busy) { S.flags.ambushWave = 2; waveAt(A.ambush, ['bruiser', 'gunman']); G.toast('Second wave', 'Bigger ones.', '#ff9a8a'); }
      if (done >= 3 && S.flags.ambushDone && !S.flags.therapyOpen) { S.flags.therapyOpen = true; G.toast('Therapy at four', "Dr. Mel-Fee's, south side of the street.", '#ffd36a'); game.audio.sfx('secret'); }
    }
    if (S.flags.pendingBrawl && W.aliveCount() === 0 && idle) { const sh = A.shops.find(s => s.id === S.flags.pendingBrawl); S.flags.pendingBrawl = null; finishShop(sh, S.flags.pendingPay, 6); }
  }
  if (A.name === 'woods' && idle) {
    if (!S.flags.enc1 && Math.hypot(b.x - G.P(14, 15)[0], b.y - G.P(14, 15)[1]) < 90) { S.flags.enc1 = true; waveAt(A.enc1, ['gunman', 'gunman']); G.toast('Dream goons', 'They wear sunglasses in a blizzard.', '#ff9a8a'); }
    if (!S.flags.enc2 && Math.hypot(b.x - G.P(24, 9)[0], b.y - G.P(24, 9)[1]) < 90) { S.flags.enc2 = true; waveAt(A.enc2, ['thug', 'bruiser']); }
    if (!S.flags.bossStart && Math.hypot(b.x - A.arena[0], b.y - A.arena[1]) < 110 && W.aliveCount() === 0) {
      S.flags.bossStart = true;
      W.script(function* () {
        W.cut = true;
        yield* W.convo([['SLAVKO', 'Tommy! I am not in the trunk. I am in your head. And your head, it is full of cured meats.'], ['TOMMY', "Everyone's a critic. Even in my subconscious."], ['SLAVKO', 'Come. Let me teach you about Slovenian vegetarianism.']]);
        W.cut = false; W.spawn('boss', A.arena[0] + 30, A.arena[1] - 10, { alert: true, state: 'chase' }); G.music('boss');
      });
    }
  }
  /* music follows the fight */
  if (!W.busy && A.name !== 'diner' && A.name !== 'therapy' && !W.cut) {
    const alive = W.aliveCount() > 0;
    if (W.boss && !W.boss.dead && W.boss.state !== 'idle') G.music('boss'); else if (alive) G.music('fight'); else G.music(A.music);
  }
};
function waveAt(points, kinds) { kinds.forEach((k, i) => { const p = points[i % points.length]; W.spawn(k, p[0] + (i * 6), p[1] + (i % 2 ? 8 : -8), { alert: true }); }); }
function ambush() {
  S_ambushWave();
  W.script(function* () {
    game.audio.sfx('whistle');
    yield* W.convo([['PAULY', 'Boss! Calabresi boys! They want the neighborhood. And possibly your sandwich!'], ['TOMMY', 'I do not have a sandwich. I have principles and a bad knee.']]);
    waveAt(W.A.ambush, ['thug', 'thug', 'thug']);
  });
}
function S_ambushWave() { G.S.flags.ambushWave = 1; }

/* ---------------- objective ---------------- */
G.exitCenter = to => { const ex = W.A.exits.find(e => e.to === to); return ex ? [(ex.x0 + ex.x1) / 2, (ex.y0 + ex.y1) / 2] : null; };
G.objective = () => {
  const S = G.S, A = W.A; if (!A) return null;
  const R = (text, x, y, area, short) => ({ text, x, y, area: area || A.name, short });
  if (W.round) {
    if (A.name !== 'town') return null;
    const sh = A.shops.filter(s => !S.done[s.id] || S.time - S.done[s.id] > 40)[0];
    const e = W.enemies.find(en => !en.dead);
    if (e && Math.hypot(e.body.x - W.hero.body.x, e.body.y - W.hero.body.y) < 140) return R('Put down the Calabresi boys', e.body.x, e.body.y, 'town', 'THUG');
    return sh ? R('Collect from ' + sh.title, sh.at[0], sh.at[1], 'town', 'COLLECT') : R('Hold the street. Score big.', W.hero.body.x, W.hero.body.y, 'town');
  }
  if (S.flags.finished) return null;
  if (A.name === 'diner' || A.name === 'therapy') return null;
  if (A.name === 'woods') {
    if (S.flags.woodsDone) return null;
    const e = W.enemies.find(en => !en.dead); if (e) return R(e.k.boss ? 'Take down Slavko' : 'Beat the dream goons', e.body.x, e.body.y, 'woods', 'FOE');
    if (!S.flags.enc2) { const t = S.flags.enc1 ? G.P(24, 9) : G.P(14, 15); return R('Follow the footprints', t[0], t[1], 'woods', 'TRACKS'); }
    return R('Find the man at the end of the trail', A.arena[0], A.arena[1], 'woods', 'SLAVKO');
  }
  if (S.chap <= 0 || A.name === 'yard') {
    if (S.flags.yardDone) return Object.assign(R('Head into town', ...G.exitCenter('town'), 'yard', 'TOWN'), { exit: true });
    if (!S.flags.bread) return R('Grab the stale bread on the patio', A.bread[0], A.bread[1], 'yard', 'BREAD');
    if (S.ducks < 3) { const i = [0, 1, 2].find(k => !S.flags['duck' + k]); return R('Feed the ducks (' + S.ducks + '/3)', A.docks[i][0], A.docks[i][1], 'yard', 'DUCK'); }
    return R('Tell Carm about the ducks', A.carm[0], A.carm[1], 'yard', 'CARM');
  }
  if (A.name === 'town') {
    const e = W.enemies.find(en => !en.dead); if (e) return R('Deal with the Calabresi crew', e.body.x, e.body.y, 'town', 'FOE');
    const sh = A.shops.find(s => !S.done[s.id]);
    if (sh) return R('Collect from ' + sh.title + ' (' + (S.shakes || 0) + '/3)', sh.at[0], sh.at[1], 'town', 'COLLECT');
    if (!S.flags.therapyOpen) return R('Catch your breath', W.hero.body.x, W.hero.body.y, 'town');
    return Object.assign(R("See Dr. Mel-Fee, south side", ...G.exitCenter('therapy'), 'town', 'DOC'), { exit: true });
  }
  return null;
};

G.autosave = () => { try { if (game.saves && game.saves.autosave && !G.HUB) game.saves.autosave(); } catch (e) {} };
})();
