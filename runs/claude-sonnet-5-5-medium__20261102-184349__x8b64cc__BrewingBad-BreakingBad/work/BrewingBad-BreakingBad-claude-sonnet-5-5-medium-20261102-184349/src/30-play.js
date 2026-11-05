/* ---- THE STORY: eight steps from a hardware aisle to a rival's camp, told as scripts over the play scene ---- */
const talk = new E.Dialog(game, { voice: null, speed: 42, lines: 3, bg: '#14201a', border: '#b8d89a', nameColor: '#9ae05a' });
let talkWho = 'narrator', cine = false, demo = null, round = null, flaskUnlocked = false;
const STEPS = [
  { id: 'intro', title: '', text: '' },
  { id: 'gear', title: 'Buy the gear', text: "Dusty's Hardware, up on Calle Sol. Respirator, glassware, patience.", at: () => AT.clerk },
  { id: 'meet', title: 'Find your old student', text: 'Pinky Doyle hangs around the junkyard, east of town. Take the desert track.', at: () => AT.pinky },
  { id: 'cook1', title: 'Cook the first batch', text: 'The RV is the lab. Use the cook station.', at: () => AT.cook },
  { id: 'sell', title: 'Make the drop', text: "Gordo at Los Gallos is buying. Stay out of sight: patrols have eyes, and you've got product.", at: () => AT.dealer },
  { id: 'wash', title: 'Clean the money', text: 'Marnie keeps the books at Suds & Duds. Dirty money will not spend itself.', at: () => AT.marnie },
  { id: 'ambush', title: 'Hold the junkyard', text: "Vega's crew is on the lot. Wrench to swing, flasks to throw. Make them leave.", at: () => AT.pinky },
  { id: 'cook2', title: 'Cook the pure batch', text: 'Back at the RV. One more cook, and make it perfect: Vega wants a taste.', at: () => AT.cook },
  { id: 'camp', title: 'Settle with Vega', text: 'The rival camp, far east. Take the product. Do not expect a handshake.', at: () => AT.boss },
  { id: 'done', title: 'The empire business', text: 'The ride is over. For now.', at: null }
];
const VISIBLE_STEPS = STEPS.length - 2;
function setStep(n) { S.step = n; try { E.store.set('bb:save', JSON.stringify(Object.assign({}, S, { v: 1 }))); } catch (e) { /* storage blocked */ } if (HUB.active) hubProgress(); }
const $ = n => '$' + Math.round(n).toLocaleString('en-US');
const cashAll = () => S.cash + S.dirty;

function* say(who, lines, o = {}) {
  talkWho = o.voice || (who === 'hoyt' ? 'hoyt' : who);
  const names = { hoyt: S.persona ? 'VITRIOL' : 'WENDELL', clerk: 'DUSTY', pinky: 'PINKY', marnie: 'MARNIE', dealer: 'GORDO', boss: 'BRUNO VEGA', rusk: 'OFFICER RUSK', narrator: '', cop: 'OFFICER' };
  let pick = -1;
  const rig = portrait[who] && (typeof portrait[who] === 'function' ? portrait[who]() : portrait[who]);
  talk.say(Array.isArray(lines) ? lines : [lines], { name: names[who] || '', portrait: who === 'narrator' ? undefined : rig, choices: o.choices, onChoice: i => { pick = i; }, place: o.place });
  yield E.until(() => !talk.open);
  game.input.consumeAll();
  return pick;
}
function cutscene(gen) { cine = true; return game.script(function* () { try { yield* gen(); } finally { cine = false; } }, { keep: false }); }

/* ---- places you can use: who's there, what it says, what it does ---- */
const SPOTS = [
  { id: 'clerk', at: () => AT.clerk, label: 'Talk to Dusty', show: () => S.step >= 1, run: scriptClerk },
  { id: 'pinky', at: () => ({ x: npcs.pinky.x, y: npcs.pinky.y }), label: 'Talk to Pinky', show: () => S.step >= 2 && !demo, run: scriptPinky },
  { id: 'cook', at: () => AT.cook, label: 'Cook station', show: () => (S.step === 3 || S.step === 7) || (S.step > 3 && S.supplies), run: scriptCook },
  { id: 'crate', at: () => PX(45, 15), label: 'Restock flasks', show: () => S.step >= 3, run: () => { S.flasks = Math.max(S.flasks, 5); S.hp = Math.min(6, S.hp + 1); A.sfx('pickup'); ui.toast('Restocked', 'Five flasks, one cold soda. Health +1.', 2); } },
  { id: 'dealer', at: () => AT.dealer, label: 'Talk to Gordo', show: () => S.step >= 4, run: scriptDealer },
  { id: 'marnie', at: () => ({ x: npcs.marnie.x, y: npcs.marnie.y }), label: 'Talk to Marnie', show: () => S.step >= 5, run: scriptMarnie },
  { id: 'rusk', at: () => ({ x: npcs.rusk.x, y: npcs.rusk.y }), label: 'Say hello to Officer Rusk', show: () => S.step >= 1 && S.step < 9, run: scriptRusk },
  { id: 'bed', at: () => PX(8, 5), label: 'Rest at home', show: () => S.step >= 1, run: () => { S.hp = 6; S.heat = Math.max(0, S.heat - 25); A.sfx('heal'); game.flash('#000', .6); ui.toast('Rested', 'Health restored. The heat cools a little.', 2); setStep(S.step); } },
  { id: 'dump1', at: () => PX(15, 22), label: 'Search the dumpster', show: () => S.step >= 1 && !S.flags.d1, run: () => dig('d1', 15, 22) },
  { id: 'dump2', at: () => PX(30, 20), label: 'Search the dumpster', show: () => S.step >= 1 && !S.flags.d2, run: () => dig('d2', 30, 20) },
  { id: 'dump3', at: () => PX(31, 9), label: 'Search the trash', show: () => S.step >= 1 && !S.flags.d3, run: () => dig('d3', 31, 9) },
  { id: 'dump4', at: () => PX(42, 9), label: 'Search the bin', show: () => S.step >= 1 && !S.flags.d4, run: () => dig('d4', 42, 9) }
];
function dig(k, cx, cy) {
  S.flags[k] = 1; S.found++; const r = Math.random();
  if (r < .5) { const v = 25 + Math.round(Math.random() * 60); S.dirty += v; ui.toast('Found ' + $(v), 'Someone left it in a boot.', 2); A.sfx('coin'); }
  else if (r < .8) { S.flasks = Math.min(9, S.flasks + 2); ui.toast('Two flasks', 'Mostly intact.', 2); A.sfx('pickup'); }
  else { S.hp = Math.min(6, S.hp + 2); ui.toast('Half a burrito', 'Health +2. Do not ask.', 2); A.sfx('heal'); }
}
let target = null;
function nearestSpot() {
  const h = hero.b; let best = null, bd = 1e9;
  for (const s of SPOTS) { if (!s.show()) continue; const p = s.at(), d = Math.hypot(p.x - h.x, p.y - h.y); if (d < 24 && d < bd) { best = s; bd = d; } }
  return best;
}

function* scriptClerk() {
  if (S.step !== 1) { yield* say('clerk', S.supplies ? "You're all set, Mr. Marsh. Whatever it is, I did not sell it to you." : 'Come back any time. The aisle misses you.'); return; }
  yield* say('clerk', ["Mr. Marsh! You, in my aisle. Last time you bought a single washer and a lecture."]);
  yield* say('hoyt', ['I need glassware. A respirator. Eight pounds of pool shock, and a modest amount of discretion.']);
  const p = yield* say('clerk', ["That's a lot of pool for a man with a dry yard. What's it for?"], { choices: ["It's for the science fair.", "Don't ask, Dusty.", 'Pool maintenance.'] });
  let price = 120, heat = 0, line;
  if (p === 0) { price = 130; line = "The science fair. Sure. Aim it at the principal for me."; }
  else if (p === 1) { price = 80; heat = 14; line = "Whoa. Okay. Okay! Eighty bucks. Please leave."; }
  else { price = 105; heat = 5; line = "You don't have a pool. I've seen your yard from the road. It's lovely. Dry. Lovely."; }
  yield* say('clerk', [line, 'That comes to ' + $(price) + '.']);
  S.cash -= price; S.heat = Math.min(100, S.heat + heat); S.supplies = true; A.sfx('coin'); ui.toast('Supplies bought', '-' + $(price) + '. Glassware, respirator, pool shock.', 3);
  yield* say('hoyt', ['Thirty-one years of chalk dust, and the only thing I ever learned to make is a living.', 'Time to make something else.']);
  setStep(2);
}
function* scriptRusk() {
  const lines = [
    ["Wendell! Got a minute? The department found a blue crystal in a school locker. Eighty percent pure. Eighty! Whoever's cooking it is an artist."],
    ["Hank would say that's a compliment. I say it's a lead. Keep your head down, Wendell. Family, you know?"],
    ["Marnie's due in March, right? You tell her we're all behind you. Crime's up, so the budget's up. I'll be back out on Calle Sol all week."]
  ];
  const k = (S.flags.rusk = (S.flags.rusk || 0) % lines.length); S.flags.rusk++;
  yield* say('rusk', lines[k]);
  yield* say('hoyt', ['Appreciate it, Officer. I am a man of no interesting qualities.']);
  S.heat = Math.min(100, S.heat + 3);
}
function* scriptPinky() {
  if (S.step === 2) {
    yield* say('pinky', ["Mr. M? Whoa. Yo. Mr. Marsh! You flunked me. Twice."]);
    yield* say('hoyt', ['Three times. I counted. It is why you cannot spell stoichiometry.']);
    yield* say('pinky', ["Okay okay, what are you doing out here? You look like a man who is about to do something stupid."]);
    const p = yield* say('hoyt', ["I'm looking for an RV, a partner, and silence. In that order."], { choices: ["You're going to take the credit.", "You'll take the risk. I take the chemistry."] });
    yield* say('pinky', [p === 0 ? "Credit? Dude. I just want a cut." : "Ha! Risk. I got plenty of that. Come on.", "This RV hasn't moved since 2009. Nobody comes out here but vultures and me. It's perfect."]);
    yield* say('hoyt', ['It will do. The cooking is mine. The sales are yours. Everything else, we pretend never happened.']);
    setStep(3);
  } else if (S.step === 6) { /* handled by the ambush */ }
  else yield* say('pinky', S.step >= 7 ? ['Vega wants the blue. You make it, I carry it. And if he shoots, you know, I run. Fast.'] : ['Whatever you need, Mr. M. I mean it. Mostly.']);
}
function* scriptCook() {
  if (!S.supplies && S.step !== 7) { yield* say('hoyt', ['No glassware, no cook. Dusty has what I need.']); return; }
  if (S.step === 3) { yield* say('hoyt', ['Chemistry is the study of change.', 'Today, I intend to change a few things.'], { voice: 'hoyt' }); }
  else if (S.step === 7) { yield* say('pinky', ['Vega\'s boys are not going to wait for a sunset, Mr. M. Whatever you\'ve got, make it perfect.']); }
  game.go('cook', { level: S.step === 7 ? 2 : 1, demo: false });
}
function afterCook(res) {
  S.bags += res.bags; S.purity = res.purity; S.bestPurity = Math.max(S.bestPurity, res.purity); S.cooked++; S.supplies = false;
  cutscene(function* () {
    if (S.step === 3) {
      yield* say('pinky', ['Yo. Yo. That is... blue. Mr. M, that is the bluest thing I have ever seen.']);
      yield* say('hoyt', ['It is ' + res.purity + ' percent pure. Nobody calls me Mr. Marsh for this part of my life.']);
      const p = yield* say('pinky', ['Then what do we call you?'], { choices: ['Vitriol.', 'The Alchemist.', 'Mr. Blue.'] });
      setPersona(1); game.flash('#ffffff', .4); A.sfx('powerup');
      yield* say('hoyt', [['Vitriol. A word for acid, and for a certain kind of speech.', 'The Alchemist. Lead into gold. Chalk into cash.', 'Mr. Blue. Because I am told it sells.'][p], 'New hat. New name. Same math.']);
      setStep(4);
    } else if (S.step === 7) {
      yield* say('hoyt', ['Ninety-nine point something. That is not product; that is a signature.']);
      setStep(8);
    }
  });
}
function* scriptDealer() {
  if (S.step < 4) return;
  if (S.step > 4 || S.bags <= 0) { yield* say('dealer', S.bags > 0 ? ['Bring more of the blue and my wallet will sit up straight.'] : ["I'd offer you a combo, but you look like a man who wants to talk shop. Bring product."]); return; }
  yield* say('dealer', ['Los Gallos Hermanos: best chicken in Santa Muerta, and for the right man, other things. So. You are the blue.']);
  const base = 300 + S.purity * 7, p = yield* say('hoyt', ['I have ' + S.bags + ' bags, ' + S.purity + ' percent pure. Name a number.'], { choices: ['Eleven hundred a bag. Firm.', 'Whatever is fair.', 'Pay me what it is worth.'] });
  let mult = 1;
  if (p === 0) { if (S.purity >= 93) { mult = 1.4; yield* say('dealer', ['Eleven hundred. For that blue? Yes. I will pay it, and God help us both.']); } else { mult = .75; S.heat = Math.min(100, S.heat + 8); yield* say('dealer', ['Firm? Amigo, it is good. It is not that good. Seven-fifty, and I do not tell your wife.']); } }
  else if (p === 1) { mult = 1; yield* say('dealer', ['Fair is a beautiful word. Fair.']); }
  else { mult = 1.15; yield* say('dealer', ['Worth. You are a philosopher. Philosophers get paid, eventually. Take a little extra.']); }
  const pay = Math.round(S.bags * base * mult);
  S.dirty += pay; S.sold += S.bags; S.bags = 0; A.sfx('coin'); game.flash('#9aff7a', .2);
  ui.toast('Paid ' + $(pay), 'Dirty cash. It will need a bath.', 4);
  yield* say('dealer', ['The money is in a pollo bucket. Do not eat the bucket.']);
  setStep(5);
}
function* scriptMarnie() {
  if (S.step === 5) {
    yield* say('marnie', ["Wendell. There is " + $(S.dirty) + " in a chicken bucket on my counter, and a husband who 'picked up some shifts'."]);
    const p = yield* say('hoyt', ['I need you to put it through the books. Quietly.'], { choices: ['It is consulting.', 'It is gambling. I got lucky.', 'It is better if you do not ask.'] });
    yield* say('marnie', [['Consulting. For whom? The cartel of overdue library books?', 'Lucky. Wendell, you do not even play cards with the kids.', 'That is not an answer. That is a closed door with a lock on it.'][p], 'I am eight months pregnant and I am doing arithmetic for a criminal. Fine. Count with me.']);
    game.go('launder', { demo: false });
  } else yield* say('marnie', S.dirty > 0 ? ['Bring the bucket by when you want a bath for it.'] : ['I am not asking. I am still not asking. Go.']);
}
function afterLaunder(res) {
  const cut = Math.round(S.dirty * (.12 + (1 - res.score) * .25)), done = S.dirty - cut;
  S.cash += done; S.laundered += done; S.dirty = 0; A.sfx('powerup');
  ui.toast('Laundered ' + $(done), 'The car wash took ' + $(cut) + ' for the soap.', 4);
  cutscene(function* () {
    yield* say('marnie', ['Done. Clean as a Sunday. And Wendell: whatever this is, it does not end well for men who are good at it.']);
    yield* say('hoyt', ['I am not good at it. I am excellent at it.']);
    yield* say('hoyt', ['Pinky is waiting at the junkyard. Time to see whether the arithmetic holds up under pressure.']);
    setStep(6);
  });
}

/* the ambush and the camp are triggered by walking in */
let ambushDone = false, campDone = false, bossLive = false, ending = false;
function startAmbush() {
  ambushDone = true; foes.length = foes.filter(f => f.kind === 'cop').length ? foes.length : 0;
  for (let i = foes.length - 1; i >= 0; i--) if (foes[i].kind !== 'cop') foes.splice(i, 1);
  cutscene(function* () {
    npcs.pinky.x = AT.pinky.x; npcs.pinky.y = AT.pinky.y;
    yield* say('pinky', ['Mr. M! Mr. M! They came to the lot! Four dudes with guns, they say the blue is Vega\'s territory!']);
    for (const c of [[41, 4], [50, 4], [41, 9], [50, 9]]) addGoon(c[0], c[1], c[0] > 45 ? 'goon2' : 'goon', { aggro: true });
    A.music('boss', { fade: .4 }); game.shake(5); A.sfx('boom');
    yield* say('hoyt', ['Pinky: get behind the barrels.', 'Then, if it is not too much to ask, pray.']);
    flaskUnlocked = true; ui.tutorial('Fight back', lab('attack') + ' swings the wrench, ' + lab('throw') + ' throws a flask. Hide behind cover; they reload.', 12);
  });
}
function startCamp() {
  campDone = true;
  cutscene(function* () {
    addBoss(); const bs = foes.find(f => f.kind === 'boss'); bs.aggro = false;
    yield* say('boss', ['So. The blue. I have been hearing about a ghost who cooks like a surgeon.', 'You are shorter than the stories.']);
    const p = yield* say('hoyt', ['I am here to talk about a partnership.'], { choices: ['The product is not for sale.', "...Let's talk numbers."] });
    yield* say('boss', [p === 0 ? 'Not for sale! Ha. Everything is for sale. Usually it is the seller.' : 'Numbers. A man after my own heart. Here are mine: you give me the formula, and I let you leave.', 'Boys, take his bag. And his knees.']);
    bs.aggro = true; bossLive = true; A.music('boss', { fade: .4 }); game.shake(6);
    for (const c of [[41, 28], [51, 28]]) addGoon(c[0], c[1], 'goon', { aggro: true });
  });
}
function finishGame() {
  if (ending) return; ending = true;
  cutscene(function* () {
    A.music('desk', { fade: 1.2 });
    yield* say('boss', ['...Okay. Okay. You win. Take it. Take all of it.']);
    yield* say('hoyt', ['I never wanted it all, Bruno. Just enough.', 'The trouble is, "enough" is a number that keeps changing.']);
    yield* say('pinky', ['Mr. M! You are... you are glowing. Is that normal?']);
    yield* say('hoyt', ['It is the light. Santa Muerta has the best light in the country.']);
    yield* say('narrator', ['A man who is good at something terrible is still, technically, a man who is good at something.']);
    setStep(9); game.go('results', { reason: 'win' });
  });
}

/* ---- pickups, the demo's and the player's controls ---- */
function readCtl() {
  const I = game.input, m = I.move(), c = { mx: m[0], my: m[1], sprint: I.down('sprint'), attack: false, throw: false, interact: false };
  c.attack = I.buffered('attack', .12); c.throw = I.buffered('throw', .12); c.interact = I.pressed('interact') || I.pressed('confirm') && !!target;
  if (I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
  if (I.aimSource === 'mouse' && c.attack) { // a click on a thing in the world uses it
    const g = game.mouseGround(), s = target;
    if (g && s) { const p = s.at(); if (Math.hypot(p.x - g.x, p.y - g.y) < 22) { c.interact = true; c.attack = false; I.consume('attack'); } }
  }
  return c;
}

/* ---- the scene ---- */
const lightCell = [];
const ghosts = new Map();
let heroDead = false, sendT = 0, lastTarget = null, ambient = .62, prevStep = -1, camStep = 0;
function resetWorld(startStep) {
  foes.length = 0; pickups.length = 0; flasks.length = 0; shots.clear(); bubbles.length = 0; makeNpcs(); ambushDone = false; campDone = false; bossLive = false; ending = false; heroDead = false; flaskUnlocked = false;
  for (let i = 0; i < 3; i++) addCop(i, i);
  const h = hero.b; h.x = AT.start.x; h.y = AT.start.y; h.vx = h.vy = 0; hero.inv = 0; hero.face = Math.PI / 2;
  setPersona(S.persona);
  for (const c of [[25, 17], [9, 22], [33, 31], [17, 36], [41, 18], [43, 6], [47, 3]]) pickups.push({ kind: 'cash', x: PX(c[0], c[1]).x, y: PX(c[0], c[1]).y, v: 40 + Math.round(Math.random() * 40), t: 0 });
  for (const c of [[10, 12], [29, 18], [46, 15]]) pickups.push({ kind: 'food', x: PX(c[0], c[1]).x, y: PX(c[0], c[1]).y, t: 0 });
  for (const c of [[22, 23], [14, 30], [49, 6]]) pickups.push({ kind: 'flask', x: PX(c[0], c[1]).x, y: PX(c[0], c[1]).y, t: 0 });
}
const play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: KEYMAP, res: 'ps1', propSize: 1.25,
  camera: { zoom: [.7, 2], start: .85, tall: 1.2 },
  enter(d = {}) {
    game.input.touchEnabled = false;
    L.enabled = true; L.ambient = ambient;
    game.cam.bounds = v => map.bounds(v); game.follow(hero.b, { z: 14, lead: 8 }); game.cam.smooth = .12;
    demo = d.demo ? demo : null;
    demoCheat = !!d.demo;
    if (d.fresh || d.demoStart) {
      fresh(); setPersona(0); resetWorld(); talk.close(); cine = false;
      if (d.session) { Object.assign(S, { step: 3, supplies: true, persona: 0 }); setPersona(1); hero.b.x = AT.rvDoor.x; hero.b.y = AT.rvDoor.y + 14; ambient = .62; }
    }
    if (d.load) { resetWorld(); const h = hero.b; const sp = S.step < 3 ? AT.start : S.step < 6 ? AT.track : AT.town; h.x = sp.x; h.y = sp.y; }
    if (d.demoStart) demoSetup(0);
    if (d.after === 'democook') { demoSetup(2); }
    if (d.after === 'demowash') { demoSetup(0); }
    if (d.after === 'cook') afterCook(d.res);
    if (d.after === 'launder') afterLaunder(d.res);
    A.music('town');
    if (d.fresh && !d.session && !d.demo) cutscene(function* () {
      game.flash('#000', .01); yield 0.6;
      yield* say('narrator', ['SANTA MUERTA, NEW MEXICO.', 'WEDNESDAY. 7:42 A.M.']);
      yield* say('hoyt', ['Wendell Marsh. Fifty-two. Thirty-one years teaching teenagers the periodic table, and the table has never once taught them back.']);
      yield* say('hoyt', ['Stage three. The doctor said it like a weather report. Marnie is due in March. The insurance covers nine weeks.']);
      yield* say('hoyt', ['I always tell my students: do the math.', 'Well. I did the math.']);
      setStep(1);
      ui.tutorial('Walk to the hardware store', lab('interact') + ' to talk or use. ' + (pad() ? 'Left stick moves. Right stick aims.' : 'WASD moves, the mouse aims.') + ' ' + lab('view') + ' changes the camera.', 14);
    });
  },
  exit() { L.enabled = false; ui.hud({}); },
  back() { return false; },
  update(dt) {
    const I = game.input;
    S.time += dt;
    if (HUB.active && round && round.over) { talk.close(); return; }
    if (HUB.active && I.held && (I.held.has ? I.held.has('Pad8') : I.held.includes('Pad8'))) I.suppress('pause');
    for (const [, gh] of ghosts) { gh.x += (gh.tx - gh.x) * Math.min(1, dt * 10); gh.y += (gh.ty - gh.y) * Math.min(1, dt * 10); gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: gh.mv ? 30 : 0, vy: 0, facing: gh.f }); }
    if (round && round.ready && HUB.time && !(HUB.time() >= 0)) { heroAnim(dt, true); return; }
    // dialog speaks in gibberish while it types
    if (talk.open) {
      const t = (talk._page || []).join(''), n = Math.floor(talk.shown);
      if (n > (talk._bn || 0) && talk.shown > 0) { for (let i = (talk._bn || 0); i < n && i < t.length; i += 1) if (i % 2 === 0) babble(talkWho, t[i]); }
      talk._bn = talk.shown > 0 ? n : 0;
    } else talk._bn = 0;
    if (talk.update(dt)) { heroAnim(dt, true); return; }
    if (demo) {
      if (demoInput()) { game.go('title'); return; }
    }
    ambient = approach(ambient, S.step >= 8 ? .38 : S.step >= 6 ? .5 : .66, dt * .05); L.ambient = ambient;
    const c = demo ? demo.ctl(dt) : readCtl();
    const h = hero.b;
    target = cine ? null : nearestSpot();
    hero.inv = Math.max(0, hero.inv - dt); hero.hurt = Math.max(0, hero.hurt - dt); hero.thr = Math.max(0, hero.thr - dt); hero.atk = Math.max(0, hero.atk - dt);
    if (hero.rigThrow) hero.rigThrow = Math.max(0, hero.rigThrow - dt);
    if (!cine && S.hp > 0) {
      const d = game.view.screenDirToGround(c.mx, c.my), mag = Math.min(1, Math.hypot(c.mx, c.my));
      const busy = hero.swing.busy;
      hero.sprint = c.sprint && mag > .2;
      const sp = (hero.sprint ? 112 : 76) * (busy ? .45 : 1) * (hero.rigThrow ? .5 : 1);
      if (mag > .08) { const l = Math.hypot(d[0], d[1]) || 1; h.vx = d[0] / l * sp * mag; h.vy = d[1] / l * sp * mag; if (!busy) hero.face = approachAng(hero.face, Math.atan2(d[1], d[0]), dt * 14); }
      else { h.vx *= .6; h.vy *= .6; }
      if (hero.sprint && Math.hypot(h.vx, h.vy) > 40 && Math.random() < dt * 7) P.dust(h.x, h.y, 0, 1);
      if (c.interact && target) { const sp2 = target; I.consume('attack'); I.consume('interact'); cutscene(sp2.run); }
      else if (c.attack) { swingWrench(); I.consume('attack'); }
      if (c.throw) { throwFlask(c); I.consume('throw'); }
      // a mouse or right stick turns the hero to aim even without moving
      if (I.aimSource === 'mouse' && !busy) { const g = game.mouseGround(); if (g && mag < .08) hero.face = approachAng(hero.face, Math.atan2(g.y - h.y, g.x - h.x), dt * 12); }
      else if (I.aimSource === 'pad' && I.padAim && !busy) { const dd = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); if (Math.hypot(dd[0], dd[1]) > .3) hero.face = approachAng(hero.face, Math.atan2(dd[1], dd[0]), dt * 14); }
    } else { h.vx *= .8; h.vy *= .8; }
    h.update(dt, map);
    if (hero.swing.busy || hero.swing.state) {
      hero.swing.update(dt);
      hero.swing.hits(foes.filter(f => f.kind !== 'cop' && !f.dead), e => E.inArc(h, hero.face, e.b, 30, 1.3, 40), e => { hitFoe(e, 1, hero.face, 1.2); P.sparks(e.b.x, e.b.y, 14, 4, hero.face); });
    }
    heroAnim(dt, false);
    // flasks in flight
    for (const f of flasks) {
      f.t += dt; f.vz -= f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      const tile = map.cell(Math.floor(f.x / T), Math.floor(f.y / T));
      if (f.z <= 0 || (tile && map.height(Math.floor(f.x / T), Math.floor(f.y / T)) > f.z + 2 && f.z < 40)) { f.dead = true; boomFlask(f); }
    }
    E.prune(flasks, f => f.dead);
    // foes
    for (const f of foes) { if (f.dead) continue; if (f.kind === 'cop') updateCop(f, dt); else if (f.kind === 'boss') updateBoss(f, dt); else updateGoon(f, dt); }
    for (const f of foes) if (!f.dead && f.kind !== 'cop') {
      // goons and boss blocked from stacking on the hero
      if (dist2(f.b, h) < 8) { const a = ang(h, f.b); f.b.x += Math.cos(a) * 20 * dt; f.b.y += Math.sin(a) * 20 * dt; }
    }
    E.prune(foes, f => f.dead);
    shots.update(dt, map);
    shots.hit([{ x: h.x, y: h.y, z: 12, r: 6 }], (b, t) => { b.life = 0; hurtHero(b.dmg || 1, Math.atan2(b.vy, b.vx)); }, 'enemy');
    for (const b of foes) if (b.kind === 'boss' && b.hp > 0) shots.hit([{ x: b.b.x, y: b.b.y, z: 12, r: 6 }], () => { }, 'player');
    // pickups
    for (const p of pickups) {
      p.t += dt;
      if (!p.got && Math.hypot(p.x - h.x, p.y - h.y) < 12) {
        p.got = true;
        if (p.kind === 'cash') { S.dirty += p.v || 50; A.sfx('coin'); P.glints(p.x, p.y, 10, 5, '#7aff9a'); P.text(p.x, p.y, 20, '+' + $(p.v || 50), '#9aff9a', { scale: 1 }); }
        else if (p.kind === 'food') { S.hp = Math.min(6, S.hp + 2); A.sfx('heal'); P.text(p.x, p.y, 20, '+HEALTH', '#ff9a8a'); }
        else { S.flasks = Math.min(9, S.flasks + 2); A.sfx('pickup'); P.text(p.x, p.y, 20, '+2 FLASKS', '#9aff7a'); }
      }
    }
    E.prune(pickups, p => p.got);
    for (const b of bubbles) b.t -= dt; E.prune(bubbles, b => b.t <= 0);
    // heat cools; a high heat adds a cop
    S.heat = Math.max(0, S.heat - dt * (foes.some(f => f.kind === 'cop' && f.state !== 'calm') ? 0 : .8));
    // music layers follow the cops
    const alert = foes.some(f => f.kind === 'cop' && f.state === 'alert');
    try { A.layer('chase', alert ? 1 : 0, .6); A.layer('alarm', alert ? 1 : 0, .6); } catch (e) { /* the layer is only in the town song */ }
    // triggers
    if (!cine && !demo) {
      if (S.step === 6 && !ambushDone && inBox(h.x, h.y, 'Junkyard')) startAmbush();
      if (S.step === 6 && ambushDone && !foes.some(f => f.kind !== 'cop')) { cutscene(function* () { A.music('town', { fade: 1 }); yield* say('pinky', ['They ran! They actually ran! Mr. M, you hit a guy with a wrench!']); yield* say('hoyt', ['It was a sensible wrench. Their boss is next. First, one more batch: the best I can make.']); setStep(7); }); }
      if (S.step === 8 && !campDone && h.y > 24 * T && h.x > 38 * T) startCamp();
      if (bossLive && !foes.some(f => f.kind === 'boss')) { bossLive = false; finishGame(); }
    }
    if (S.hp <= 0 && !heroDead && !demoCheat) { heroDead = true; game.go('over', { why: 'dead' }); }
    // multiplayer: tell the others where we are
    if (HUB.active && round && round.ready) hubTick(dt);
    // the HUD
    const st = STEPS[S.step] || STEPS[0], lim = S.step >= 1 && S.step < 9;
    const near = target && !cine;
    ui.hud({
      objective: lim ? { step: String(Math.min(S.step, VISIBLE_STEPS)).padStart(2, '0') + ' / ' + String(VISIBLE_STEPS).padStart(2, '0'), title: st.title, text: st.text, at: st.at ? Object.assign({ z: 8 }, st.at()) : undefined, from: h } : undefined,
      bars: [{ label: 'Health', value: S.hp, max: 6, kind: 'pips', color: '#e0553a' }, { label: 'Heat', value: S.heat, max: 100, color: S.heat > 60 ? '#ff4a3a' : '#5a8aff' }],
      counts: [['Clean', $(S.cash)], ['Dirty', $(S.dirty)], ['Product', S.bags + ' bags'], ['Flasks', S.flasks]],
      place: placeAt(h.x, h.y),
      status: foes.some(f => f.kind === 'cop' && f.state === 'alert') ? { text: 'PURSUED', color: '#ff5a3a' } : foes.some(f => f.kind === 'cop' && f.state !== 'calm') ? { text: 'NOTICED', color: '#ffd24a' } : hidden(h.x, h.y) ? { text: 'HIDDEN', color: '#9ae05a' } : 'UNSEEN',
      prompt: near ? { act: 'interact', label: target.label } : undefined,
      keys: (cine || demo) ? undefined : [[['up', 'left', 'down', 'right'].map(a => lab(a)).join(''), 'Move'], [lab('attack'), 'Wrench'], [lab('throw'), 'Flask'], [lab('sprint'), 'Sprint']]
    });
    if (demo) ui.hud({ place: 'ATTRACT MODE', status: 'PRESS ANY BUTTON' });
  },
  draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const s of SOLIDS) r.shape(s[0], s[1], s[2], 0, s[3]);
    for (const p of PROPS) { const lit = ['lamp', 'streetlamp', 'torch', 'firedrum', 'brazier', 'lantern'].includes(p[0]); r.prop(p[0], p[1], p[2], 0, Object.assign({ light: lit }, p[3])); }
    for (const f of foes) if (f.kind === 'cop') r.decal(() => r.sightCone({ x: f.b.x, y: f.b.y, z: 0, facing: f.face }, { range: 96 + 14 * diff(), fov: 1.24, facing: f.face, map, color: f.state === 'alert' ? '#ff3a2a' : f.state === 'calm' ? '#ffe080' : '#ffa030' }));
    for (const p of pickups) r.sprite(p.x, p.y, 6 + Math.sin(p.t * 4) * 1.5, p.kind === 'cash' ? SPR.cash : p.kind === 'food' ? SPR.food : SPR.flask, { glow: .4 });
    for (const k in npcs) { const n = npcs[k]; r.shadow(n.x, n.y, 6, .3); r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { outline: false }); }
    for (const f of foes) {
      r.shadow(f.b.x, f.b.y, f.kind === 'boss' ? 11 : 6, .35);
      r.actor(f.b.x, f.b.y, f.b.z || 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { flash: f.flash > 0 ? '#ffffff' : undefined, flashMix: .7 });
      if (f.kind === 'goon' && f.wind > 0) r.queue(f.b.x, f.b.y, 34, g => { const q = r.w(f.b.x, f.b.y, 34); E.font.text(g, '!', q[0], q[1], '#ff4a3a', { align: 'center', shadow: '#000' }); });
      if (f.kind === 'boss' && (f.wind > 0 || f.chargeT > 0)) r.queue(f.b.x, f.b.y, 52, g => { const q = r.w(f.b.x, f.b.y, 52); E.font.text(g, f.chargeT > 0 ? '!!' : '!', q[0], q[1], '#ff4a3a', { align: 'center', shadow: '#000', scale: 2 }); });
      if (f.kind === 'boss' && f.chargeT > 0) r.decal(() => { r.groundArc(f.b.x, f.b.y, 6, 120, f.chargeA - .08, f.chargeA + .08, '#ff3a2a', .5); });
    }
    // the hero, and the others in the round
    r.shadow(hero.b.x, hero.b.y, 6, .4);
    r.actor(hero.b.x, hero.b.y, hero.b.z || 0, (g, ox, oy) => hero.rig.draw(g, ox, oy, r.view), { xray: true, flash: hero.inv > 0 && Math.floor(game.real * 14) % 2 ? '#ffffff' : undefined, flashMix: .5 });
    hero.swing.state && hero.rig.drawSmear && hero.rig.drawSmear(r);
    for (const [id, gh] of ghosts) {
      r.shadow(gh.x, gh.y, 6, .3);
      r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .85 });
      r.queue(gh.x, gh.y, 40, g => { const q = r.w(gh.x, gh.y, 40); E.font.text(g, gh.name, q[0], q[1], gh.color, { align: 'center', shadow: '#000', outline: false }); });
    }
    for (const f of flasks) r.sprite(f.x, f.y, Math.max(2, f.z), SPR.flask, { rot: f.t * 9 });
    shots.draw(r);
    // marks over heads
    for (const f of foes) if (f.kind === 'cop' && f.state !== 'calm') { const k = f.state === 'alert' ? '!' : '?'; r.queue(f.b.x, f.b.y, 36, g => { const q = r.w(f.b.x, f.b.y, 36 + Math.sin(game.time * 8) * 1.5); E.font.text(g, k, q[0], q[1], f.state === 'alert' ? '#ff4a3a' : '#ffd24a', { align: 'center', shadow: '#000', scale: 2 }); }); }
    for (const b of bubbles) r.queue(b.x, b.y, 38, g => { const q = r.w(b.x, b.y, 38 + (1.2 - b.t) * 10); E.font.text(g, b.txt, q[0], q[1], '#ffd24a', { align: 'center', shadow: '#000', scale: 2 }); });
    if (S.step >= 1 && S.step < 9) { const st = STEPS[S.step]; if (st.at && !cine) { const p = st.at(); r.marker(p.x, p.y, 20, { label: st.title, color: '#ffd040' }); } }
    if (target && !cine) { const p = target.at(); r.queue(p.x, p.y, 34, g => { const q = r.w(p.x, p.y, 34 + Math.sin(game.time * 5) * 1.5); E.font.text(g, '▸ ' + lab('interact'), q[0], q[1], '#ffffff', { align: 'center', shadow: '#000', outline: false }); }); }
    for (const p of PROPS) if (p[0] === 'firedrum' || p[0] === 'brazier') L.add(p[1], p[2], 16, 56, .8, { color: '#ffa050' });
    talk.draw(r);
    if (demo) demoOverlay(r);
  }
};
const SPR = {
  cash: E.sprite(['.gggg.', 'gGGGGg', 'gGggGg', 'gGGGGg', '.gggg.'], { g: '#2e8a3e', G: '#7adc7a' }, 1),
  food: E.sprite(['.bbbb.', 'bccccb', 'bcRRcb', 'bccccb', '.bbbb.'], { b: '#8a5a22', c: '#e8c060', R: '#c8301a' }, 1),
  flask: E.sprite(['..gg..', '..gg..', '.gGGg.', 'gGGGGg', 'gGGGGg', '.gggg.'], { g: '#3a8a3a', G: '#9aff7a' }, 1)
};
function heroAnim(dt, frozen) {
  const h = hero.b, st = { x: h.x, y: h.y, z: h.z || 0, vx: frozen ? 0 : h.vx, vy: frozen ? 0 : h.vy, facing: hero.face, attack: hero.swing.state, hurt: hero.hurt > 0, run: hero.sprint ? 1 : undefined };
  if (hero.rigThrow > 0) { st.attack = { spec: { a0: .5, a1: -.4, z0: 18, z1: 10, reach: 9, hand: 'R' }, phase: hero.rigThrow > .15 ? 'wind' : 'active', u: hero.rigThrow > .15 ? 1 - (hero.rigThrow - .15) / .15 : 1 - hero.rigThrow / .15 }; }
  hero.rig.update(dt, st);
  for (const f of foes) {
    const b = f.b, mv = Math.hypot(b.vx || 0, b.vy || 0);
    f.rig.update(dt, { x: b.x, y: b.y, z: b.z || 0, vx: b.vx, vy: b.vy, facing: f.face, point: f.kind !== 'cop' && f.aggro, stance: f.kind === 'cop' && f.state === 'alert' ? 'ready' : undefined, hurt: f.flash > 0, pose: f.stun > 0 ? 'kneel' : undefined });
  }
  for (const k in npcs) { const n = npcs[k]; const hd = Math.atan2(hero.b.y - n.y, hero.b.x - n.x); if (Math.hypot(hero.b.x - n.x, hero.b.y - n.y) < 70) n.face = approachAng(n.face, hd, dt * 5); n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.face }); }
}
