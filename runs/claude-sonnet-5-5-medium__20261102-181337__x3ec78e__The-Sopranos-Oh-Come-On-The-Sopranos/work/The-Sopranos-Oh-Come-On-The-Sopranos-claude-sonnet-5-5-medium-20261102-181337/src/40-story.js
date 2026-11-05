/* ---- 40-story: the writing, the kitchen table, the therapist, the ending, the flow between them ---- */
const TALK = {
  pork: { ask: ["Vic! Vic, come in, sit. I got capicola, I got a situation.", "Business is dead since they put the Shop-Rite on Route 21. People want their pork in a bag with a coupon. A coupon, Vic!", "Anyway. It's Tuesday. I know why you're here. I got it right here."],
    lean: ["I'm gonna say this once. Tuesday is Tuesday. The coupon people don't pay for your kid's braces.", "...Fine! FINE! Take it, take all of it. My father is rolling over in his grave. In the display case. Next to the provolone."],
    nice: ["Look, I'm not here to ruin your week. Just what's in the envelope.", "God bless you, Vic. You're a gentleman. Take a sandwich on the way out, on the house. Not literally on the house. The house is also yours."] },
  clean: { ask: ["Mr. Soprano... Vic. Walter. We said Walter.", "The Dry Clean business, nobody tells you, it's chemicals, it's lawyers, it's people who leave a suit for a year and then complain about the starch.", "I got your envelope. It's a little light. It's... it's a little light."],
    lean: ["Light. You say light. I got a suit hanging back there from a guy who 'went to Florida' in 2019. You know what's in the pockets? Nothing. That's what I'm looking at right now.", "Okay. Okay! Take the register. I'll tell my wife it was the vending machine."],
    nice: ["Walter. Easy. A bad month is a bad month. Next Tuesday you make it up, and we never speak of this again.", "You're a good man. I mean that. Not good good. But good."] },
  club: { ask: ["Hey, Vic. Easy on the face, it's a long night. Dennis is in the back crying about the liquor license again.", "I got what you came for. The girls been asking if the boss is gonna say a few words at the staff meeting. Don't say a few words.", "It's under the register. Where it always is. Where everything always is."],
    lean: ["Excuse me? Count it. COUNT IT, then, in front of me. You're gonna count it like I'm a bank?", "...Ugh. Take the tip jar too. Ruin my Tuesday. This is why I'm in therapy. Don't look at me like that. Everybody's in therapy."],
    nice: ["Thanks for not making it weird. It's always weird.", "You know, you're the only one in this business who says 'please.' It's unsettling."] },
  sal: { lines: ["Vic! Over here. Come on, the rain's gonna ruin my shoes. These are suede.", "Listen. Johnny Salt is in the yard tonight. Him and his boys. He's been telling people you got soft. You got soft! You! I almost laughed.", "There's a bat by the ducks. Don't ask where it came from. Not 'why.' WHERE. Because the where is a whole story.", "And hey. The ducks. Go see the ducks. Do the breathing. The doctor said. You come back more... Zen. Less... hitting people with a bat.", "Take this sandwich. It's capicola. We call it gabagool but my mother would slap me. Be careful. They have guns, and I have suede."] },
  ducks: [["The ducks look at you. You look at the ducks. Nobody says anything. It's the best conversation you've had all week."], ["A duck tilts its head. It knows. They always know."], ["You breathe in. You breathe out. You think about your father, your uncle, and a sandwich. Mostly the sandwich."], ["Quack. Which, in duck, is 'it's fine, it's all fine, you're the boss of nothing and everything.'"]]
};

/* A scene is a backdrop, a cast on a floor, and beats: ['who', 'text'] or { ask, who, options: [{ label, fx, reply: [[who, text]] }] } */
const CUTS = {
  intro: { bg: 'kitchen', song: 'home', title: 'CHAPTER ZERO  -  A MORNING IN THE SUBURBS', cast: [['vic', 'vic', 130, 'hips'], ['connie', 'connie', 190]],
    beats: [['narr', 'North Caldwell, New Jersey. Seven a.m. The pool is a rectangle of cold water and the ducks have been gone eleven days.'],
      ['connie', "You're up. You're never up. Is it the thing with your chest again? Because you're not allowed to die before the kitchen is done. The contractor is on payment four."],
      ['vic', "It's not my chest. It's just... something is coming. You ever feel something is coming? Like the whole world's a pot on low, and nobody's looking at the lid?"],
      { who: 'connie', ask: "That's what the doctor said you'd say. You are going Thursday, right?", options: [
        { label: "Thursday. Yes. I'm going.", fx: { calm: 1 }, reply: [['connie', 'Good. Wear the blue one. It makes you look like you listen.']] },
        { label: "I'm not talking to some woman about my feelings.", fx: { respect: 1 }, reply: [['connie', "Everybody's talking to some woman about their feelings, Vic. That's why she has a boat."]] }] },
      ['narr', "The phone rings. It is Sal Pistachio. It is always Sal Pistachio, and it is never good, and it is always about a sandwich."],
      ['vic', "Tuesday. Collections. Three stops. Pork store, dry cleaner, the club. It's nothing. It's a walk. A man takes a walk."],
      ['connie', 'A man takes a walk and comes home with blood on his shoes and a story about a guy named Paulie. Take the umbrella.'],
      ['narr', 'Tuesday begins. Take the umbrella. Do not take the umbrella.']] },
  therapy: { bg: 'office', song: 'therapy', title: 'DR. MARCHETTI  -  THURSDAY, 4 P.M.', cast: [['vic', 'vic', 130, 'hips'], ['doc', 'doc', 195]],
    beats: [['doc', "Vic. Sit. You look like a man who ran a marathon in a suit. Did you? Tell me you didn't."],
      ['vic', 'Three envelopes, a guy named Fat Dino, a hat. I hit a person with a trash can lid. Is that a thing? The lid?'],
      ['doc', "Let's talk about the lid. Not the lid. What the lid is. What was happening in your body when your hand picked it up?"],
      { who: 'vic', ask: "(You think about it. You think about the sandwich.)", options: [
        { label: "Honestly? It felt good. It felt like air.", fx: { stress: -25, calm: 1 }, reply: [['doc', "That's the most honest thing you've said in six weeks. 'Air.' Hold onto that."], ['vic', "Is it normal? To feel good about the lid?"], ['doc', 'It is normal to feel good about the lid. It is not normal to build a life around the lid.']] },
        { label: "I don't have to explain myself to you.", fx: { respect: 1, stress: 10 }, reply: [['doc', "You don't. But you're paying a hundred and eighty an hour to not explain yourself. We could go to a diner."], ['vic', "...The diner has pie."]] },
        { label: "I had a dream about a duck.", fx: { calm: 1 }, reply: [['doc', "Ah. The ducks. We never finished the ducks."], ['vic', "It talked. It said 'they always leave.' Then it ate my car."], ['doc', "Dreams are... generous. Let's call that a breakthrough and move on."]] }] },
      ['doc', "Here's what I'm worried about. Not the violence. The violence you know. It's the Sunday dinners. The way a man like you tries to keep everything in the room by being the biggest thing in it."],
      ['vic', "A man has to be the biggest thing in the room, or the room eats him."],
      ['doc', "And what happens when a man is the room?"],
      ['vic', "...Then he can't leave."],
      ['doc', "That's our time. Thursday. And Vic? Feed the ducks, the real ones. It helps. I'm not allowed to prescribe it, but it helps."],
      ['narr', "You walk out into the parking lot. Your phone shows eleven calls from Sal and one from a number you don't recognize. It's Johnny Salt's. It's always Johnny Salt."]] },
  ending: { bg: 'kitchen', song: 'home', title: 'CHAPTER LAST  -  A LATE SUPPER', cast: [['vic', 'vic', 118, 'hips'], ['connie', 'connie', 170], ['sal', 'sal', 222]],
    beats: [['narr', 'The yard is quiet. Johnny Salt is a shape under a blue tarp. The rain is the only thing that never stops.'],
      ['sal', "He's gone. Done. Over. You know what I'm gonna do? I'm gonna eat. A man needs to eat after a thing like this."],
      ['connie', "I made a gravy. It's been going since morning, and you know what? You can taste when somebody's holding something in."],
      ['vic', "Maybe I'm holding something in. Maybe I'm just... a guy at a table. With a family. A family. Look at 'em. It's the whole world, right here."],
      ['sal', "You hear that? The bell on the door. Somebody's coming in."],
      ['narr', "You look up. You always look up. And that's when it—"]] }
};
/* the scene: backdrop, cast, dialog; choices carry effects into the profile */
const SCENE = (() => {
  const talk = new E.Dialog(game, { bg: ['#4a1436', '#12040c'], border: '#f0b0c8', nameColor: '#f0c850', speed: 38 });
  Object.defineProperty(talk, 'voice', { configurable: true, get: () => blip(), set: () => {} });
  const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'plain', side: '#2a2230' } }, edges: 'open' });
  const MID = 160;
  let cut, cast, i, done, t, demo, fade, cb, pickT = 0;
  const NAMES = { vic: 'VIC', connie: 'CONNIE', doc: 'DR. MARCHETTI', sal: 'SAL', narr: '' };
  function say(who, text, o) { setVoice(who); talk.say(text, Object.assign({ name: NAMES[who] || '', portrait: cast[who] && cast[who].rig, portraitOpts: { zoom: 2.2, turn: who === 'vic' ? .6 : -.6 }, auto: demo ? 2.6 : 0, onDone: () => { game.input.consumeAll(); step(); } }, o)); }
  function step() {
    if (i >= cut.beats.length) { done = true; fade = 0; if (cut.id === 'ending') music(null); game.after(cut.id === 'ending' ? 3.6 : .4, () => flowNext()); return; }
    const b = cut.beats[i++];
    if (Array.isArray(b)) return say(b[0], b[1]);
    setVoice(b.who);
    talk.say(b.ask, { name: NAMES[b.who], portrait: cast[b.who] && cast[b.who].rig, choices: b.options.map(o => o.label), onChoice: n => {
      const o = b.options[n]; for (const k in o.fx) { if (k === 'stress') S.stress = clamp((S.stress || 0) + o.fx[k], 0, 100); else S[k] = (S[k] || 0) + o.fx[k]; }
      S.calm = clamp(S.calm, 0, 5); let k = 0; const chain = () => { if (k >= o.reply.length) return step(); const [w, tx] = o.reply[k++]; say(w, tx, { onDone: () => { game.input.consumeAll(); game.after(.02, chain); } }); }; game.after(.02, chain); } });
  }
  function enter(d) {
    cut = CUTS[d.id]; demo = !!d.demo; i = 0; done = false; t = 0; cast = {};
    for (const [id, rigId, x, pz] of cut.cast) cast[id] = { rig: rig(rigId), x, pz, face: x < MID + 60 ? 0 : Math.PI };
    music(cut.song); game.follow(null); game.cam.bounds = null; game.cam.room = null; L.enabled = false; game.weather = null; talk.open = false; game.resetCamera();
    game.after(.5, step);
  }
  function update(dt) {
    common(); t += dt;
    if (demo && (userActive() || demoInput())) { game.input.consumeAll(); loopDemo = 0; return game.go('title'); }
    talk.update(dt);
    if (demo && talk.open && talk.choices && !talk.typing && talk.i >= talk.pages.length - 1) { pickT += dt; if (pickT > 1.6) { pickT = 0; const oc = talk.onChoice; talk.close(); oc && oc(0); } } else pickT = 0;
    game.focus(MID, 0, 32 + (game.H / 2 - 88) / -game.view.bz);
    for (const id in cast) { const c = cast[id]; c.rig.update(dt, { x: c.x, y: 0, z: 32, facing: c.face, vx: 0, vy: 0, pose: c.pz, expr: talk.open && talk.speaker === id ? 'shout' : undefined }); }
  }
  function backdrop(r) {
    const FY = Math.round(r.w(MID, 0, 32)[1]);
    if (cut.bg === 'kitchen') {
      r.sky(['#2a1a24', '#4a2a30', '#6a3a34']);
      r.queue(MID, -900, 0, g => { const W = r.W, H = r.H, y0 = Math.round(H * .18), floorY = FY;
        px.rect(g, 0, y0, W, floorY - y0, '#7a5a48'); for (let x = 0; x < W; x += 14) px.rect(g, x, y0, 1, floorY - y0, '#6a4a3a');
        px.rect(g, 0, floorY, W, H - floorY, '#4a3a30'); for (let x = -((game.time * 0) | 0); x < W; x += 24) px.rect(g, x, floorY, 1, H - floorY, '#3a2c24');
        px.rect(g, W * .12, y0 + 10, 56, 44, '#101a30'); px.rect(g, W * .12 + 2, y0 + 12, 52, 40, '#1a2c52'); px.rect(g, W * .12 + 27, y0 + 12, 2, 40, '#c8b8a0'); px.rect(g, W * .12 + 2, y0 + 31, 52, 2, '#c8b8a0'); for (let k = 0; k < 6; k++) px.dot(g, W * .12 + 8 + k * 8, y0 + 18 + (k * 7) % 20, '#e8e0a8');
        px.rect(g, W * .62, y0 + 6, 46, 90, '#d8d4cc'); px.rect(g, W * .62, y0 + 6, 46, 3, '#eeeae2'); px.rect(g, W * .62 + 34, y0 + 20, 3, 18, '#8a8680');
        px.rect(g, W * .35, floorY - 20, 130, 8, '#8a5a30'); px.rect(g, W * .35 + 8, floorY - 12, 6, 24, '#6a4220'); px.rect(g, W * .35 + 116, floorY - 12, 6, 24, '#6a4220');
        for (const [dx, c] of [[16, '#e8e4d8'], [56, '#e8e4d8'], [96, '#e8e4d8']]) { px.ell(g, W * .35 + dx + 8, floorY - 22, 10, 3, c); px.dot(g, W * .35 + dx + 8, floorY - 24, '#c8402a'); }
        px.rect(g, W * .35 + 50, floorY - 36, 24, 14, '#a83a2a'); px.rect(g, W * .35 + 50, floorY - 36, 24, 3, '#d86a4a'); px.rect(g, W * .35 + 72, floorY - 32, 5, 4, '#a83a2a'); });
    } else {
      r.sky(['#1c2230', '#2a3040', '#3a4050']);
      r.queue(MID, -900, 0, g => { const W = r.W, H = r.H, y0 = Math.round(H * .15), floorY = FY;
        px.rect(g, 0, y0, W, floorY - y0, '#5a6a6a'); px.rect(g, 0, floorY, W, H - floorY, '#3a3028'); for (let x = 0; x < W; x += 28) px.rect(g, x, floorY, 14, H - floorY, '#463a30');
        px.rect(g, W * .08, y0 + 12, 70, 80, '#0c1220'); px.rect(g, W * .08 + 3, y0 + 15, 64, 74, '#1c2a40'); for (const [dx, dy] of [[10, 8], [40, 20], [26, 50]]) px.disc(g, W * .08 + dx, y0 + 15 + dy, 1, '#e8e8f0'); px.rect(g, W * .08 + 33, y0 + 15, 2, 74, '#8a8a90');
        px.rect(g, W * .45, floorY - 26, 90, 22, '#6a3a2a'); px.rect(g, W * .45, floorY - 34, 90, 10, '#8a4a3a'); px.rect(g, W * .45 - 6, floorY - 30, 8, 26, '#5a2e22'); px.rect(g, W * .45 + 88, floorY - 30, 8, 26, '#5a2e22');
        px.rect(g, W * .78, y0 + 20, 36, 46, '#2a2a30'); px.rect(g, W * .78 + 3, y0 + 23, 30, 40, '#4a6a7a'); px.rect(g, W * .78 - 12, floorY - 30, 3, 30, '#3a2a20'); px.disc(g, W * .78 - 11, floorY - 36, 6, '#2e6a3a'); px.disc(g, W * .78 - 8, floorY - 42, 5, '#3a8a4a'); });
    }
  }
  function draw(r) {
    r.sky(['#101018', '#201820']); backdrop(r);
    for (const id in cast) { const c = cast[id]; r.shadow(c.x, 0, 12, .4); r.actor(c.x, 0, 32, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => { E.ui.box(g, r.W / 2 - 150, 6, 300, 16, { bg: '#000', alpha: .65, border: '#a89ad8' }); E.font.text(g, cut.title, r.W / 2, 11, '#ffe8c8', TXC);
      if (demo) E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', r.W / 2, r.H - 14, '#ffe070', TXC); if (done) px.rect(g, 0, 0, r.W, r.H, '#000'); });
    talk.draw(r);
  }
  return { view: 'side', views: ['side'], input: INPUT, res: 'ps1', enter, update, draw, back: () => false, talk };
})();

/* ---- THE KITCHEN TABLE: between chapters, count the money, spend it, save, go back out ---- */
const KITCHEN = (() => {
  let menu, mode, note, t, demo, backAt = -9;
  const upMenu = () => new E.Menu(game, UPGRADES.map(u => ({ label: u.name + '  ' + (S.up[u.id] >= u.max ? 'MAX' : money(upCost(u))) + '  [' + S.up[u.id] + '/' + u.max + ']', disabled: S.up[u.id] >= u.max })).concat(['BACK']), { y: 70, onPick: i => { if (i >= UPGRADES.length) return show('main'); buy(UPGRADES[i]); }, onCancel: () => show('main') });
  function buy(u) { const c = upCost(u); if (S.cash < c) { note = "That's more than you have. Count again."; sfx('cancel'); return; } S.cash -= c; S.up[u.id]++; sfx('powerup'); note = u.name + ' bought. ' + u.text; menu = upMenu(); menu.i = Math.min(UPGRADES.indexOf(u), UPGRADES.length); }
  function show(m) {
    if (m === 'main' && mode === 'shop') backAt = game.real;
    mode = m; note = '';
    if (m === 'main') menu = new E.Menu(game, ['GO OUT: ' + (FLOW[S.step] === 'therapy' ? 'DR. MARCHETTI' : 'THE YARD'), 'SPEND THE ENVELOPES', 'SAVE THE GAME', 'LEAVE THE TABLE (TITLE)'], { y: 100, onPick: i => { if (i === 0) flowNext(); else if (i === 1) show('shop'); else if (i === 2) { save(); } else game.go('title'); } });
    else menu = upMenu();
  }
  function save() { try { game.saves.save(0); note = 'Saved to slot 1. Somewhere, a guy writes it in a ledger.'; sfx('confirm'); } catch (e) { note = 'The ledger will not open.'; } }
  function enter(d) { demo = !!(d && d.demo); t = 0; music('home'); L.enabled = false; game.weather = null; game.follow(null); game.cam.bounds = null; game.cam.room = null; game.resetCamera(); show('main'); game.saves.canSave = !demo; if (demo) { S.cash = Math.max(S.cash, 500); } if (!demo) autosave(); }
  function update(dt) {
    common(); t += dt;
    if (demo) { if (userActive() || demoInput()) { game.input.consumeAll(); loopDemo = 0; return game.go('title'); } if (t > 1.6 && mode === 'main') show('shop'); if (t > 2 && mode === 'shop' && !update.bought) { update.bought = 1; for (const u of UPGRADES.slice(0, 3)) if (S.cash >= upCost(u)) buy(u); } if (t > 4.5) { update.bought = 0; flowNext(); } return; }
    menu.update(dt);
  }
  function draw(r) {
    r.sky(['#2a1a24', '#4a2a30', '#6a3a34']);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#2a1a24'); for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#32202c');
      E.font.title(g, 'THE KITCHEN TABLE', W / 2, 10, { align: 'center', scale: 2, colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      E.ui.box(g, W / 2 - 170, 34, 340, 22, WIN); E.font.text(g, 'CASH  ' + money(S.cash), W / 2 - 160, 41, '#8aff8a', TXT); E.font.text(g, 'RESPECT ' + S.respect + '   CALM ' + S.calm + '   ENVELOPES ' + S.envelopes, W / 2 + 160, 41, '#e8e4ff', TXR);
      const line = FLOW[S.step] === 'therapy' ? "Connie left a plate. Under the foil, a note: 'Thursday. Dr. M. Don't be late.'" : "Sal called. Johnny Salt is at the yard. It's raining. It's always raining.";
      if (mode === 'main') E.font.text(g, line, W / 2, H - 40, '#c8b8f0', TXC);
      if (mode === 'shop') { const u = UPGRADES[menu.i]; if (u) E.font.text(g, u.text, W / 2, H - 40, '#c8b8f0', TXC); }
      if (note) E.font.text(g, note, W / 2, H - 26, '#ffe070', TXC);
      E.font.text(g, game.input.label('confirm') + ' SELECT   ' + game.input.label('cancel') + ' BACK', W / 2, H - 12, '#8a8ab0', TXC);
      if (demo) E.font.text(g, 'ATTRACT MODE  -  PRESS ANYTHING', W / 2, H - 12, '#ffe070', TXC);
    });
    menu.draw(r);
  }
  // Escape is both 'cancel' and 'pause': backing out of the shop must not also open the pause menu
  return { view: 'side', views: ['side'], input: INPUT, res: 'ps1', get pausable() { return mode !== 'shop' && game.real - backAt > .3; }, enter, update, draw, back: () => { if (mode === 'shop') { show('main'); return true; } return false; } };
})();

/* ---- the flow: intro, street, kitchen, therapy, yard, ending ---- */
function autosave() { try { game.saves.autosave(); } catch (e) { /* storage blocked */ } }
let demoRun = false;
function flowNext() {
  S.step++;
  const id = FLOW[S.step];
  if (demoRun && (!id || id === 'ending')) { demoRun = false; return game.go('title'); }
  if (!id) return game.go('credits', { after: 'title' });
  if (id === 'intro' || id === 'therapy' || id === 'ending') game.go('cut', { id, demo: demoRun });
  else if (id === 'kitchen') game.go('kitchen', { demo: demoRun });
  else game.go('play', { level: id, demo: demoRun });
}
function beginRun(demo) {
  demoRun = !!demo; S = blank(); S.step = 0; S.cash = demo ? 400 : 0;
  game.go('cut', { id: 'intro', demo: demoRun });
}
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(S)), place: FLOW[S.step] === 'therapy' ? 'THE KITCHEN TABLE' : 'THE KITCHEN TABLE', level: S.step });
game.saves.read = save => { S = Object.assign(blank(), save.data); demoRun = false; game.go('kitchen', {}); };

/* ---- game over ---- */
const overMenu = new E.Menu(game, ['TRY THE CHAPTER AGAIN', 'LEAVE THE TABLE'], { y: 120, onPick: i => { if (i === 0) { S = Object.assign(blank(), JSON.parse(overMenu.snap)); game.go('play', { level: overMenu.level, snap: overMenu.snap }); } else game.go('title'); } });
scenes.over = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) { overMenu.i = 0; overMenu.snap = d.snap; overMenu.level = d.level; music(null); sfx('die'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; game.weather = null; },
  update(dt) { common(); overMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) { r.sky(['#12040c', '#3a0c1c', '#6a1a28']); overMenu.y = Math.round(r.H / 2) + 8;
    r.overlay(g => { E.font.title(g, 'WHACKED', r.W / 2, Math.round(r.H / 2) - 60, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); E.font.text(g, "Nobody's coming to the funeral. They're all at the buffet.", r.W / 2, Math.round(r.H / 2) - 18, '#e8b8b8', TXC); }); overMenu.draw(r); }
};
