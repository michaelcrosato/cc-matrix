/* ============================================================================
 * the case: world state, interactions, conversations, mini-games, chase, the box
 * ========================================================================== */
let S = newCase(), map = null, hero = null, heroRig = null, flow = null, P = {}, lookouts = [], walkers = [], DRESS = [];
let demo = false, overlay = null, W = null, L = null, chase = null, boxScreen = false, scriptTask = null, resultsShown = false;
let hover = null, autoWalk = null, camRaised = false, aimAng = 0, photoWho = null, hudHint = '', hintShown = {}, lastToast = '', stageClock = 0;
let tackleT = 0, sprintingNow = false, sessionStarted = false, sessionEnded = false, pilotCtl = null;
const REACH = 24;

/* ---------- world ---------- */
function spawnXY(tag, i = 0) { const sp = map.findAll(tag)[i]; return sp ? [sp.x, sp.y] : [100, 100]; }
function buildWorld() {
  map = makeMap(); flow = new E.FlowField(map);
  DRESS = dressing();
  for (const d of DRESS) if (d.k === 'shape' && E.SHAPES && E.SHAPES[d.n] && ['table', 'bench', 'barrel', 'bookcase', 'shelf'].includes(d.n)) { try { map.solid(d.n, d.x * T16, d.y * T16, 0, { facing: d.facing || 0 }); } catch (e) { /* decorative only */ } }
  const [hx, hy] = spawnXY('hero');
  hero = new E.Mover({ x: hx, y: hy, r: 5, walk: 46, run: 78, sprintSpeed: 118, sneak: 30, vault: 14, climb: false, staminaMax: 100, staminaRegen: 28 }); hero.facing = 1.57;
  heroRig = RIGS.hero();
  const mk = (tag, rigKey, name, voice, o = {}) => { const [x, y] = spawnXY(tag); return new Person(tag, x, y, RIGS[rigKey](), Object.assign({ name, voice }, o)); };
  P = {
    kowalczyk: mk('kowalczyk', 'kowalczyk', 'SGT. KOWALCZYK', 'sgt', { facing: 0 }),
    pruitt: mk('pruitt', 'pruitt', 'LT. PRUITT', 'lt', { facing: 3.14 }),
    tooley: mk('tooley', 'tooley', 'TOOLEY', 'tooley', { facing: 2.4, pose: 'kneel' }),
    lorne: mk('lorne', 'lorne', 'BIG LORNE', 'lorne', { facing: 3.14, pose: 'hips' }),
    sweets: mk('sweets', 'sweets', 'SWEETS', 'sweets', { facing: 0.4 }),
    dray: mk('dray', 'dray', 'DRAY', 'dray', { mover: true, facing: 2.2, run: 98, sprint: 112 })
  };
  P.lorne.face(P.sweets.x, P.sweets.y); P.sweets.face(P.lorne.x, P.lorne.y); P.dray.face(P.lorne.x, P.lorne.y);
  lookouts = HOPPER_POSTS.map((p, i) => new Lookout(p, i));
  walkers = map.findAll('walker').map((sp, i) => {
    const horiz = sp.cy === 16 || sp.cy === 11 || sp.cy === 35, w = new Person('walker', sp.x, sp.y, RIGS.walker(i), { name: 'Pedestrian', voice: 'narr', speed: 20 + (i % 3) * 7 });
    w.mode = 'walk'; w.lane = horiz ? { axis: 'x', a: sp.x - 90, b: sp.x + 90 } : { axis: 'y', a: sp.y - 80, b: sp.y + 80 };
    if (horiz) { w.lane.a = Math.max(24, w.lane.a); w.lane.b = Math.min(MW * 16 - 24, w.lane.b); }
    w.dir = i % 2 ? 1 : -1; return w;
  });
  chase = null; overlay = null; W = null; L = null; hover = null; autoWalk = null; photoWho = null; boxScreen = false;
  talk.close && talk.close();
}
const heroPos = () => ({ x: hero.x, y: hero.y, z: hero.z || 0 });
function placeHero(tag, i = 0) { const [x, y] = spawnXY(tag, i); Object.assign(hero, { x, y, vx: 0, vy: 0 }); }
const crewList = () => [['lorne', P.lorne], ['sweets', P.sweets], ['dray', P.dray]];

/* ---------- objectives and the day's clock ---------- */
const OBJ = {
  brief: () => ({ title: 'Report to Sgt. Kowalczyk', text: 'Briefing in the detail office.', at: P.kowalczyk }),
  surveil: () => {
    const w = crewList().find(([k]) => !S.photos[k]);
    return { title: 'Photograph the crew (' + photoCount(S) + ' of 3)', text: w ? 'Hold ' + I.label('camera') + ' on ' + CREW[w[0]] + ' and keep the lens steady. Watch the lookouts.' : '', at: w ? w[1] : null };
  },
  tip: () => ({ title: 'Meet Tooley outside Ruthie’s', text: 'He knows the calendar. He will want something.', at: P.tooley }),
  wire: () => ({ title: 'Tap the laundromat payphone', text: 'Crouch. Make three clean connections. Mind the kid on the avenue.', at: { x: spawnXY('payphone')[0], y: spawnXY('payphone')[1], z: 0 } }),
  listen: () => ({ title: 'Listen in the van', text: 'Log what matters. Three or more.', at: { x: spawnXY('van')[0], y: spawnXY('van')[1], z: 0 } }),
  chase: () => ({ title: chase && chase.running ? 'Run him down' : 'Be at the south gate', text: chase && chase.running ? 'Sprint, vault, and tackle with ' + I.label('tackle') + '.' : 'Nine o’clock. Dray moves the bag.', at: chase && chase.running ? P.dray : { x: spawnXY('gate')[0], y: spawnXY('gate')[1], z: 0 } }),
  box: () => ({ title: 'Interview Dray', text: 'Interview Room 2. Take your time. Not too much.', at: { x: spawnXY('boxsuspect')[0], y: spawnXY('boxsuspect')[1], z: 0 } }),
  report: () => ({ title: 'Brief Lt. Pruitt', text: 'Upstairs, in the office. Bring the numbers.', at: P.pruitt }),
  done: () => ({ title: 'Case closed', text: '', at: null })
};
function toStage(st, quiet) {
  advanceStage(S, st); stageClock = 0;
  if (!quiet) { try { game.saves.autosave(); } catch (e) { /* storage may be blocked */ } }
  const song = { chase: 'chase', box: 'box', report: 'report' }[st] || (['surveil', 'tip', 'wire', 'listen'].includes(st) ? 'stealth' : 'title');
  music(song, { fade: 1 });
}
function notify(title, text, secs) { lastToast = title; ui.toast(title, text, secs || 4); }
function hint(key, title, text) { if (!game.settings.hints || hintShown[key] || demo) return; hintShown[key] = true; ui.tutorial(title, text, 12); }

/* ---------- conversation helpers (Dialog is modal; a script waits for it) ---------- */
function* say(who, lines, choices) {
  let pick = -1; const opt = { name: who.name, portrait: who.rig, onChoice: i => { pick = i; } };
  if (choices) opt.choices = choices;
  talk.voice = 'vx_' + (who.voice || 'narr'); talk.say(lines, opt);
  yield E.until(() => !talk.open); return pick;
}
function radio(who, text, secs) { talk.voice = 'vx_' + (who.voice || 'narr'); A.sfx('radio'); talk.say(text, { name: who.name + ' (radio)', portrait: who.rig, auto: secs || 3.2, modal: false }); }
const KOW = () => P.kowalczyk, PRU = () => P.pruitt, TOO = () => P.tooley, DRA = () => P.dray;
function runScript(gen, force) { if (scriptTask && !scriptTask.done) { if (!force) return; scriptTask.cancel(); talk.close && talk.close(); } scriptTask = game.script(gen); }
const busy = () => !!(talk.open && !talk.modalOff) || (scriptTask && !scriptTask.done) || !!overlay || boxScreen || (ui.screen);

function* convBrief() {
  const k = KOW();
  yield* say(k, ['Brannock. Sit. No, don’t sit, we haven’t got the time.', 'The Calloway crew moves product off the Pit, the courtyard of the low-rises, and has since before you made detective. Big Lorne runs it. Sweets counts it. Dray moves it.']);
  yield* say(k, ['Everybody downtown wants Lorne. Nobody downtown wants to pay for Lorne. Eight weeks, a van that smells like a stranger’s lunch, and a wire order that took two judges and one favor.', 'So. Pictures of all three. Then a man called Tooley, who knows the calendar and charges by the fact. Then the payphone at the laundromat. We listen, we wait for the bag to move, and we take whoever runs.']);
  const c = yield* say(k, ['How do you want to work it?'], ['By the book. Every step on paper.', 'Fast and loose. We are out of time.']);
  if (c === 1) { S.approach = 'corners'; S.cash += 60; yield* say(k, ['Don’t tell me. If I hear it, it happened.', 'Sixty from the discretionary. It doesn’t exist, and neither does this conversation.']); }
  else { S.approach = 'book'; yield* say(k, ['Paper. Good. A prosecutor can hold paper.', 'Paper is also slow, and slow is how they get you. Go.']); }
  yield* say(k, ['Camera’s on you. The little ones on the corners will whistle if they see a stranger looking. You’re not police out there. You’re a woman who took a wrong turn and doesn’t know it yet.']);
  toStage('surveil'); music('stealth', { fade: 1 });
  hint('camera', 'Photographing the crew', 'Hold ' + I.label('camera') + ' and keep the lens on them. Crouch with ' + I.label('crouch') + ' to stay low. Lookouts whistle if they see you.');
}
function* convKowIdle() {
  const k = KOW();
  const lines = { surveil: 'Pictures, Brannock. Lorne, Sweets, Dray. And don’t stand where the kids can see you.', tip: 'Tooley sits outside Ruthie’s. Bring cash. He prefers it to conversation.', wire: 'The laundromat phone. The kid on the avenue watches that corner. Be boring.', listen: 'Get in the van. Listen to the calls. Log what matters.', chase: 'South gate, nine o’clock. Go.', box: 'The room’s ready. So is he.', report: 'Pruitt’s waiting. Upstairs. Try not to explain too much.', done: 'Go home.' };
  yield* say(k, lines[S.stage] || 'Go on.');
}
function* convTooley() {
  const t = TOO();
  if (S.stage !== 'tip') {
    yield* say(t, S.stage === 'brief' || S.stage === 'surveil' ? ['Not yet, Detective. Come back when you got something to show me.'] : ['We already did our business. I’m a man of my word. Mostly.']);
    return;
  }
  yield* say(t, ['Detective. Detective. You look like a woman with a question, and I look like a man who could use a sandwich.', 'Folks on the Pit use the laundromat phone. The cell ones, they say, the cell ones listen. Sweets calls Lorne from that box. Thursday the bag moves. I seen it. I know the house on Calloway too.']);
  const opts = [];
  const labels = ['Hand him twenty.  ($20)', 'Fifty and a sandwich.  ($50)', 'Lean on him.', 'Walk away.'];
  const c = yield* say(t, ['So. What’s my information worth to you?'], labels);
  if (c === 0 && spend(S, 20)) { S.tip = 'paid'; yield* say(t, ['Twenty. Bless you. Laundromat phone, Sweets does the talking, south gate for the handoff. You didn’t get it from me.']); }
  else if (c === 1 && spend(S, 50)) { S.tip = 'paid'; S.heat = 0; S.scoreBonus += 60; yield* say(t, ['Fifty and a sandwich! You’re a good woman. I’ll go and talk loud on the corner about nothing at all, give the little ones something to look at.', 'The phone. The south gate. Thursday. Go on, go.']); notify('Tooley’s going to be loud', 'The lookouts are distracted. Heat cleared.'); }
  else if (c === 2) { S.tip = 'squeezed'; addHeat(S, 15); yield* say(t, ['Okay, okay. Laundromat, south gate, Thursday. Don’t. Don’t.', 'You know I’m gonna have to say something to somebody, now. For my safety.']); notify('Squeezed', 'A lawyer will make a meal of this. The corner heard him yell.'); }
  else { S.tip = 'skipped'; yield* say(t, ['Suit yourself, Detective. The information won’t get any cheaper.']); }
  void opts;
  toStage('wire');
  hint('wire', 'Tapping a phone', 'Crouch at the payphone and hit ' + I.label('interact') + ' as the marker crosses the bright bar. Three connections.');
}
function* convPruitt() {
  const p = PRU();
  if (S.stage !== 'report') { yield* say(p, S.stage === 'brief' ? ['The detail’s Sergeant is waiting for you. Don’t keep him waiting.'] : ['I read the numbers when there are numbers. Bring me numbers.']); return; }
  const v = verdict(S);
  yield* say(p, ['Detective. Sergeant tells me you pulled a case out of the Calloway Homes.', 'I have a meeting upstairs where a man will ask me the clearance rate. Tell me what you have, in numbers, because they don’t read.']);
  yield* say(p, ['Exhibits: ' + evidenceList(S).length + '. Score on the case: ' + caseScore(S) + '. Times burned: ' + S.burns + '. Overtime booked: ' + Math.max(0, Math.round(S.hour - 22)) + ' hours.']);
  yield* say(p, [v.text]);
  S.done = true; S.ending = v; toStage('done', true);
  endCase();
}

/* ---------- the board (the case file) ---------- */
function openBoard() {
  const ev = evidenceList(S), o = (OBJ[S.stage] || OBJ.done)();
  ui.show('board', { kicker: 'Detail office · ' + clockLabel(S.hour), title: 'Case file: the Pit', text: 'Calloway Homes, the Pit. Crew: Big Lorne (runs it), Sweets (counts it), Dray (moves it).',
    sections: [['Where you stand', o.title + (o.text ? '. ' + o.text : '')], ['Exhibits (' + ev.length + ')', ev.length ? ev.map(e => '• ' + e.label).join('\n') : 'Nothing yet. Nobody was ever convicted by a feeling.'], ['Budget', '$' + S.cash + ' left, $' + S.spent + ' spent. Burned ' + S.burns + ' of ' + MAX_BURNS + '.']],
    actions: [{ label: 'Close the file', primary: true, fn: () => ui.hide() }, ['Save the case', () => { game.saves.save(0); notify('Saved', 'Slot 1'); ui.hide(); }]] });
}

/* ---------- the wire minigame ---------- */
function startWire() {
  W = { step: 0, t: 0, done: false, msg: '', fumbles: 0, flash: 0, cd: 0 }; overlay = 'wire'; hero.crouch = true;
  A.sfx('select');
}
function updateWire(dt, ctl) {
  W.t += dt; W.flash = Math.max(0, W.flash - dt); W.cd = Math.max(0, W.cd - dt);
  if (ctl.cancel) { overlay = null; return; }
  const st = WIRE_STEPS[W.step], m = wireMarker(W.t, st.speed);
  if (ctl.press && W.cd <= 0) {
    if (wireHit(m, st.centre, st.width)) {
      A.sfx('wire_ok'); W.flash = .3; W.step++; W.msg = ''; W.t = 0;
      if (W.step >= WIRE_STEPS.length) { overlay = null; S.tapPlanted = true; S.hour += 1; notify('The tap is live', 'Clean work. The box on the pole is just a box.'); toStage('listen'); hint('listen', 'The van', 'Get in the van. When a line matters, hit ' + I.label('interact') + '.'); }
    } else { A.sfx('wire_bad'); W.fumbles++; S.tapFumbles++; W.msg = 'Fumbled. Slow down.'; W.cd = .5; addHeat(S, 12); game.shake && game.shake(1.5); }
  }
}
function drawWire(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 20, 250), h = 60, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .62);
    E.ui.box(g, x, y, w, h, { bg: ['#10151b', '#0b0e12'], border: '#d8b070' });
    const st = WIRE_STEPS[Math.min(W.step, WIRE_STEPS.length - 1)];
    E.font.text(g, 'PAYPHONE TAP ' + (W.step + 1) + '/3: ' + st.label.toUpperCase(), x + w / 2, y + 7, '#e0b06a', { align: 'center' });
    const bx = x + 10, bw = w - 20, by = y + 28;
    E.px.rect(g, bx, by, bw, 10, '#222a33'); E.px.rect(g, bx + Math.round((st.centre - st.width / 2) * bw), by, Math.round(st.width * bw), 10, W.flash > 0 ? '#ffffff' : '#c08a3a');
    const m = wireMarker(W.t, st.speed); E.px.rect(g, bx + Math.round(m * bw) - 1, by - 3, 3, 16, '#f0f0f0');
    E.font.text(g, W.msg || (I.label('interact') + ' on the bright bar.  ' + I.label('cancel') + ' steps away.'), x + w / 2, y + 47, W.msg ? '#e07a5a' : '#a8a090', { align: 'center' });
  });
}

/* ---------- the listening post ---------- */
function startListen() {
  L = { call: 0, line: 0, t: 0, logged: 0, hit: false, phase: 'line', blip: 0, done: false, flashLine: 0, gap: 0, results: [] };
  overlay = 'listen'; hero.crouch = true; A.sfx('phone'); music('box', { fade: .6 }); A.duck && A.duck(false);
}
const curLine = () => CALLS[L.call].lines[L.line];
function updateListen(dt, ctl) {
  if (L.done) { if (ctl.press || ctl.cancel) finishListen(); return; }
  L.t += dt; L.blip -= dt;
  const ln = curLine(), dur = 2.3;
  if (L.phase === 'gap') { if (L.t > L.gap) { L.phase = 'line'; L.t = 0; } return; }
  if (L.blip <= 0 && L.t < dur - .4) { L.blip = .085; A.sfx('vx_' + CALLS[L.call].voice, { vol: .6 }); }
  if (ctl.press && !L.hit) {
    if (ln[1]) { L.hit = true; L.logged++; A.sfx('wire_ok'); L.flashLine = .5; } else { A.sfx('tick'); }
  }
  L.flashLine = Math.max(0, L.flashLine - dt);
  if (L.t >= dur) {
    L.results.push({ call: L.call, line: L.line, key: !!ln[1], hit: L.hit }); L.hit = false; L.t = 0; L.line++;
    if (L.line >= CALLS[L.call].lines.length) { L.call++; L.line = 0; L.phase = 'gap'; L.gap = 1.1; A.sfx('phone'); if (L.call >= CALLS.length) { L.done = true; A.sfx('powerup'); } }
  }
}
function finishListen() {
  overlay = null; S.wireLog = Math.max(S.wireLog, L.logged); S.listened = true; S.hour = Math.max(S.hour, 19) + 1.5; A.duck && A.duck(false);
  if (L.logged >= LISTEN_NEEDED) {
    toStage('chase'); startChaseStage();
    notify('Nine o’clock, the south gate', 'You have what you need: ' + L.logged + ' of ' + callPhraseCount() + ' phrases logged.');
    radio(KOW(), 'Brannock, Kowalczyk. You got it? Good. Dray moves the bag at nine, south gate of the Pit. Go be tall.', 4);
  } else {
    S.hour += 1; notify('Not enough', 'You logged ' + L.logged + '. The log needs ' + LISTEN_NEEDED + '. Listen again. Overtime keeps adding up.');
  }
}
function drawListen(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 24, 300), h = 96, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
    E.ui.box(g, x, y, w, h, { bg: ['#0e1216', '#080a0d'], border: '#d8b070' });
    E.font.text(g, 'LISTENING POST - WIRE ROOM', x + 8, y + 6, '#e0b06a');
    // waveform
    const wy = y + 28; for (let i = 0; i < w - 16; i += 2) { const a = L.done || L.phase === 'gap' ? 1 : 3 + Math.abs(Math.sin(i * .21 + game.time * 18)) * 8 * (.4 + .6 * Math.abs(Math.sin(i * .05 + game.time * 3))); E.px.rect(g, x + 8 + i, wy - Math.round(a / 2), 1, Math.max(1, Math.round(a)), L.phase === 'line' && !L.done ? '#5ad08a' : '#2a5a3a'); }
    if (L.done) {
      E.font.text(g, 'LOG CLOSED: ' + L.logged + ' OF ' + callPhraseCount() + ' PHRASES', x + w / 2, y + 48, L.logged >= LISTEN_NEEDED ? '#8adf8a' : '#e07a5a', { align: 'center' });
      E.font.text(g, 'Press ' + I.label('interact') + ' to continue', x + w / 2, y + 72, '#a8a090', { align: 'center' });
    } else if (L.phase === 'gap') {
      E.font.text(g, 'CONNECTING …', x + w / 2, y + 52, '#a8a090', { align: 'center' });
    } else {
      const ln = curLine(), txt = ln[0].replace(/[{}]/g, ''), shown = Math.min(txt.length, Math.floor(L.t * 34));
      E.font.text(g, CALLS[L.call].who.toUpperCase() + ':', x + 8, y + 44, '#e0b06a');
      E.font.text(g, txt.slice(0, shown), x + 8, y + 56, ln[1] ? (L.hit ? '#8adf8a' : '#ffd36a') : '#c8c0b0', { wrap: w - 16 });
      E.font.text(g, 'Press ' + I.label('interact') + ' when a line matters   (' + L.logged + ' logged)', x + w / 2, y + h - 12, '#8a8478', { align: 'center' });
    }
  });
}

/* ---------- the chase ---------- */
function startChaseStage() {
  // Dray waits at the south gate with the bag; hero walks up; he bolts when he sees her
  const [gx, gy] = spawnXY('gate'); Object.assign(P.dray.body, { x: gx, y: gy, vx: 0, vy: 0 }); P.dray.mode = 'idle'; P.dray.pose = null; P.dray.face(gx, gy + 40);
  S.hour = Math.max(S.hour, 20.7); chase = { running: false, t: 0, wp: 0, done: false, cornered: false, trigger: 0, tackled: false };
}
function triggerChase() {
  if (!chase || chase.running) return; chase.running = true; chase.t = 0; chase.wp = 0; P.dray.mode = 'run'; music('chase', { fade: .4 });
  A.sfx('whistle'); radio(DRA(), 'Five-oh! Five-oh!', 2.2); hint('chase', 'Foot chase', 'Hold ' + I.label('sprint') + ' to sprint and go over low fences. Tackle with ' + I.label('tackle') + ' when you are close.');
}
function updateChase(dt) {
  if (!chase || chase.done) return;
  const d = P.dray, b = d.body;
  if (!chase.running) {
    const dist = Math.hypot(hero.x - d.x, hero.y - d.y); d.face(hero.x, hero.y);
    chase.trigger += dt; if (dist < 125 || chase.trigger > 60) triggerChase();
    return;
  }
  chase.t += dt;
  const wp = CHASE_ROUTE[Math.min(chase.wp, CHASE_ROUTE.length - 1)], [tx, ty] = cellXY(wp[0] - .5, wp[1] - .5);
  if (!chase.cornered) {
    if (Math.hypot(tx - d.x, ty - d.y) < 14) { chase.wp++; if (chase.wp >= CHASE_ROUTE.length) { chase.cornered = true; d.mode = 'idle'; d.pose = 'guard'; b.vx = b.vy = 0; notify('Cornered', 'He’s run out of alley.'); } }
    else {
      flow.update(tx, ty); const dir = flow.dir(d.x, d.y, tx, ty) || [0, 0], len = Math.hypot(dir[0], dir[1]) || 1;
      const tired = chase.t > 18 ? .8 : 1, sp = { move: [dir[0] / len * tired, dir[1] / len * tired], sprint: true, jumpPressed: !!b.hitWall && b.onGround };
      b.update(dt, map, sp); d.facing = b.facing;
      if (b.hitWall && b.onGround && (chase.vt = (chase.vt || 0) + dt) > .05) { chase.vt = 0; }
    }
  } else { d.face(hero.x, hero.y); b.update(dt, map, { move: [0, 0] }); }
  d.rig.update(dt, Object.assign({ x: b.x, y: b.y, z: b.z || 0, vx: b.vx, vy: b.vy, facing: d.facing, expr: 'shout' }, b.rigState ? b.rigState() : {}, d.pose ? { pose: d.pose } : {}));
  if (chase.t > 120) { chase.cornered = true; d.mode = 'idle'; }
}
function tackleAttempt() {
  if (!chase || !chase.running || chase.done) return false;
  const d = P.dray, dist = Math.hypot(hero.x - d.x, hero.y - d.y);
  if (dist <= 24) { tackleT = .35; arrest(true); return true; }
  tackleT = .35; A.sfx('swing'); return false;
}
function arrest(byTackle) {
  chase.done = true; S.chase.caught = true; S.chase.clean = byTackle && chase.t < 30 && !chase.cornered; S.chase.cornered = chase.cornered;
  P.dray.mode = 'idle'; P.dray.pose = 'down'; P.dray.body.vx = P.dray.body.vy = 0;
  game.hitFx && game.hitFx(P.dray.x, P.dray.y, 14, { power: 1.4, damage: 0, angle: hero.facing }); A.sfx('punch'); game.flash && game.flash('#ffffff', .12, .5);
  notify(S.chase.clean ? 'Clean arrest' : 'Arrested', S.chase.clean ? 'Down in the alley. Bag intact. Nobody hurt.' : 'It took longer than it should have.');
  runScript(function* () {
    yield 1.2;
    yield* say(DRA(), ['Aw, c’mon! C’mon! I ain’t got nothing!', 'It’s not even mine. I’m holding it for a friend.']);
    yield* say(hero_person(), ['Sure you are. Hands.']);
    toBox();
  }, true);
}
const hero_person = () => ({ name: 'DET. BRANNOCK', voice: 'det', rig: heroRig });
function toBox() {
  chase = null; overlay = null; W = null; L = null; autoWalk = null; toStage('box', true);
  A.sfx('door'); game.flash && game.flash('#000000', .4, 1);
  const [bx, by] = spawnXY('boxhero'), [sx, sy] = spawnXY('boxsuspect');
  Object.assign(hero, { x: bx, y: by, vx: 0, vy: 0 }); hero.crouch = false;
  Object.assign(P.dray.body, { x: sx, y: sy, vx: 0, vy: 0 }); P.dray.mode = 'idle'; P.dray.pose = 'kneel'; P.dray.face(bx, by); P.dray.expr = 'angry';
  try { game.saves.autosave(); } catch (e) { /* storage */ }
  music('box', { fade: .8 });
}

/* ---------- the box: Dray's interview, a Shell screen of choices ---------- */
let boxLine = '';
function startBox() {
  boxScreen = true; boxLine = 'He sits with his arms folded. The room smells like floor cleaner and old coffee. Five rounds, Detective. Pick them with care.';
  showBox();
}
function showBox() {
  const B = S.box;
  if (B.result) return endBox();
  const bar = n => '■'.repeat(Math.round(n / 10)) + '□'.repeat(10 - Math.round(n / 10));
  ui.show('box', {
    kicker: 'Interview Room 2 · Round ' + Math.min(B.round + 1, BOX_ROUNDS) + ' of ' + BOX_ROUNDS, title: 'Dray',
    text: () => 'Resolve  ' + bar(B.resolve) + '   ' + B.resolve + '\n\n' + boxLine,
    actions: () => boxOptions(S).map((o, i) => ({ label: o.label, primary: i === 0, fn: () => pickBox(o.id) }))
  });
}
function pickBox(id) {
  const res = boxPlay(S, id, gameRng);
  boxLine = res.line + (res.dmg ? '  (−' + res.dmg + ')' : '');
  A.sfx(res.tag === 'hit' ? 'hit' : res.tag === 'hard' ? 'punch' : res.tag === 'miss' ? 'cancel' : 'select');
  if (S.box.result) { endBox(); return; }
  ui.show('box', { focus: 0 }); showBox();
}
function endBox() {
  const B = S.box, flipped = B.result === 'flipped';
  ui.show('box', {
    kicker: 'Interview Room 2', title: flipped ? 'He talks' : 'He wants his lawyer',
    text: flipped ? '“Calloway. Seventeen-twelve. The back door’s got a key under the third brick. I ain’t never said that.”\n\nThe pen moves. The recorder runs. It is the quietest minute of the case.' : '“I want my lawyer.”\n\nHe says it like a prayer he learned in school. The tape stops. So does the case, a little.',
    actions: [{ label: 'Leave the room', primary: true, fn: () => leaveBox() }]
  });
}
function leaveBox() { const flipped = S.box.result === 'flipped'; ui.hide(); boxScreen = false; P.dray.expr = null; toStage('report'); notify(flipped ? 'A statement' : 'No statement', 'Brief Lt. Pruitt upstairs.'); }
const gameRng = () => Math.random();

/* ---------- interactions: what the detective can walk up to ---------- */
function interactables() {
  const out = []; const add = (id, who, label, run, o = {}) => out.push(Object.assign({ id, x: who.x, y: who.y, label, run }, o));
  add('kowalczyk', P.kowalczyk, S.stage === 'brief' ? 'Talk to Sgt. Kowalczyk' : 'Talk to Kowalczyk', () => runScript(S.stage === 'brief' ? convBrief() : convKowIdle()));
  const bd = { x: spawnXY('board')[0], y: spawnXY('board')[1] }; add('board', bd, 'Check the case file', () => { try { game.saves.autosave(); } catch (e) { /* storage */ } openBoard(); });
  add('tooley', P.tooley, 'Talk to Tooley', () => runScript(convTooley()));
  add('pruitt', P.pruitt, S.stage === 'report' ? 'Brief Lt. Pruitt' : 'Talk to Lt. Pruitt', () => runScript(convPruitt()));
  const ph = { x: spawnXY('payphone')[0], y: spawnXY('payphone')[1] };
  add('payphone', ph, S.stage === 'wire' ? 'Tap the payphone' : 'Payphone', () => { if (S.stage === 'wire') startWire(); else notify(S.tapPlanted ? 'The tap is live' : 'Just a payphone', S.tapPlanted ? 'It rings, somebody talks, you listen.' : 'Not yet.'); });
  const vn = { x: spawnXY('van')[0], y: spawnXY('van')[1] };
  add('van', vn, S.tapPlanted ? 'Get in the van and listen' : 'The surveillance van', () => { if (S.tapPlanted && S.stage === 'listen') startListen(); else notify('The van', S.tapPlanted ? 'You already have what you need from it.' : 'No wire, no calls.'); });
  if (S.stage === 'box') add('dray', P.dray, 'Interview Dray', () => startBox());
  if (chase && chase.cornered && !chase.done) add('cuff', P.dray, 'Cuff him', () => arrest(false));
  return out;
}
function pickInteract() {
  const list = interactables(); let best = null, bd = 1e9;
  for (const o of list) { const d = Math.hypot(o.x - hero.x, o.y - hero.y); if (d < REACH + (o.id === 'board' ? 8 : 0) && d < bd) { best = o; bd = d; } }
  return { best, list };
}

/* ---------- control reading: the human (stick, keys, mouse) or the attract pilot ---------- */
function readControls() {
  if (pilotCtl) return pilotCtl;
  const m = I.move(), g = game.view.screenDirToGround(m[0], m[1]);
  const ctl = { move: [g[0], g[1]], sprint: I.down('sprint'), crouchPress: I.pressed('crouch'), camera: I.down('camera'), interact: I.pressed('interact'), tackle: I.pressed('tackle'), board: I.pressed('board'), view: I.pressed('view'), cancel: I.pressed('cancel'), manual: Math.hypot(m[0], m[1]) > .1, aim: null };
  // the lens points at the mouse, the right stick, or where the detective faces
  if (I.lastDevice === 'mouse') { const mg = game.mouseGround(); if (mg) ctl.aim = Math.atan2(mg[1] - hero.y, mg[0] - hero.x); }
  else if (I.padAim && I.lastDevice === 'gamepad') { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); ctl.aim = Math.atan2(a[1], a[0]); }
  return ctl;
}

/* ---------- the frame ---------- */
function lookoutsActive() { return !demo ? ['surveil', 'tip', 'wire'].includes(S.stage) : ['surveil', 'tip', 'wire'].includes(S.stage); }
function stepWorld(dt, ctl) {
  sprintingNow = !!ctl.sprint && ctl.manual !== false;
  // time
  if (!overlay && !boxScreen && S.stage !== 'done') S.hour += dt / 45;
  // the detective
  if (ctl.crouchPress && !overlay) hero.crouch = !hero.crouch;
  const cam = !!ctl.camera && S.stage !== 'brief' && !overlay && !chase && !boxScreen; camRaised = cam;
  if (cam) aimAng = ctl.aim !== null && ctl.aim !== undefined ? ctl.aim : hero.facing;
  let move = ctl.move;
  if (overlay || boxScreen) move = [0, 0];
  else if (autoWalk) {
    if (ctl.manual) autoWalk = null;
    else { const d = Math.hypot(autoWalk.x - hero.x, autoWalk.y - hero.y); if (d < REACH - 6) { const a = autoWalk; autoWalk = null; a.run && a.run(); } else { flow.update(autoWalk.x, autoWalk.y); const dir = flow.dir(hero.x, hero.y, autoWalk.x, autoWalk.y) || [0, 0], l = Math.hypot(dir[0], dir[1]) || 1; move = [dir[0] / l, dir[1] / l]; } }
  }
  const spr = ctl.sprint && !cam && !overlay;
  if (hero.crouch && spr) hero.crouch = false;
  const intent = { move: cam ? [move[0] * .5, move[1] * .5] : move, sprint: spr, crouch: hero.crouch, jumpPressed: !!(spr && hero.hitWall && hero.onGround) };
  if (intent.jumpPressed) S.vaults++;
  hero.update(dt, map, intent);
  if (cam) hero.facing = aimAng;
  tackleT = Math.max(0, tackleT - dt);
  heroRig.update(dt, Object.assign(hero.rigState(), cam ? { pose: 'guard', stance: 'guard' } : {}, tackleT > 0 ? { attack: E.move('bash', 1 - tackleT / .35) } : {}));
  // people
  for (const [, p] of crewList()) if (p !== P.dray || !chase || !chase.running) p.update(dt, map, hero);
  for (const k of ['kowalczyk', 'pruitt', 'tooley']) { P[k].update(dt, map, hero); if (Math.hypot(P[k].x - hero.x, P[k].y - hero.y) < 70) P[k].face(hero.x, hero.y); }
  for (const w of walkers) w.update(dt, map, hero);
  for (const [, p] of crewList()) { if (p.wary > 0) { p.wary -= dt; p.pose = p === P.dray && chase ? p.pose : 'guard'; p.expr = 'angry'; if (p.wary <= 0) { p.pose = p === P.lorne ? 'hips' : null; p.expr = null; } } }
  // lookouts and heat
  let anySeen = false;
  const act = lookoutsActive() && !demo;
  for (const lk of lookouts) {
    lk.update(dt); lk.seen = false;
    if (!act) { lk.alert = Math.max(0, lk.alert - dt); continue; }
    const r = lookoutSees(lk, hero, map, { sprinting: hero.sprinting, camera: cam });
    if (r.seen && r.exposure > .05 && lk.cool <= 0) {
      lk.seen = true; anySeen = true;
      const d = r.d || 60, rate = (.55 + r.exposure * .8) * (1.4 - Math.min(1, d / lk.range) * .8) * (hero.crouch ? .55 : 1) * (hero.sprinting ? 1.5 : 1) * (cam ? 1.35 : 1) * (overlay === 'wire' ? .8 : 1);
      lk.alert += dt * rate * .6;
      if (lk.alert >= 1) whistle(lk);
    } else lk.alert = Math.max(0, lk.alert - dt * .5);
  }
  if (!anySeen && !demo) S.heat = Math.max(0, S.heat - dt * (S.approach === 'book' ? 1.9 : 1.2));
  if (demo) S.heat = 0;
  // photographs
  photoWho = null;
  if (cam && S.stage === 'surveil') {
    for (const [k, p] of crewList()) {
      if (S.photos[k]) continue;
      const dist = Math.hypot(p.x - hero.x, p.y - hero.y);
      const inCone = dist < 150 && Math.abs(E.angDiff ? E.angDiff(aimAng, Math.atan2(p.y - hero.y, p.x - hero.x)) : 0) < .2 && map.sight({ x: hero.x, y: hero.y, z: hero.z || 0, eye: hero.crouch ? 14 : 30 }, { x: p.x, y: p.y, z: p.z || 0 });
      if (inCone && p.wary <= 0) { photoWho = k; const pr = photoStep(S, k, dt * (S.approach === 'corners' ? 1.15 : 1)); if (pr >= 1 && S.photos[k]) photoTaken(k); break; }
    }
  }
  for (const [k] of crewList()) if (k !== photoWho) photoDecay(S, k, dt);
  // the chase
  updateChase(dt);
  if (chase && chase.running && !chase.done && ctl.tackle) tackleAttempt();
  // heat burns the case
  if (S.heat >= 100 && !S.done && !overlay) doBurn();
  // proximity to the south gate starts the chase stage's trigger; hub progress
  if (S.stage === 'brief' && demo) { /* the pilot walks it */ }
}
function whistle(lk) {
  lk.alert = .35; lk.cool = 5; lk.whistled = 1.4; A.sfx('whistle'); game.shake && game.shake(1.2);
  for (const [, p] of crewList()) p.wary = 9;
  const burned = addHeat(S, 38); S.seenCount++;
  notify('Five-oh!', lk.name + ' whistled. The corner went quiet.'); if (burned) doBurn();
}
function photoTaken(k) {
  A.sfx('shutter'); game.flash && game.flash('#ffffff', .1, .7); notify('Photograph: ' + CREW[k], photoCount(S) + ' of 3', 2.6);
  game.particles && game.particles.glints && game.particles.glints(P[k].x, P[k].y, 24, 6, '#ffffff');
  if (photoCount(S) === 3) { toStage('tip'); notify('The crew is on film', 'Now find Tooley, outside Ruthie’s.'); }
}
function doBurn() {
  if (overlay) overlay = null;
  const shut = burn(S);
  A.sfx('wire_bad'); game.flash && game.flash('#000000', .5, 1);
  placeHero('hero'); hero.crouch = false;
  for (const lk of lookouts) { lk.alert = 0; lk.cool = 6; }
  if (shut) { endCase(); return; }
  radio(KOW(), 'Brannock. They went inside and pulled the shades. You’re burned for the evening. Burn ' + S.burns + ' of ' + MAX_BURNS + '. Come back, have a coffee, think about your life.', 5);
  notify('Burned', 'The corner knows your face. Five hours and twenty dollars gone.');
}

/* ---------- ending ---------- */
function endCase() {
  if (resultsShown) return; resultsShown = true;
  const v = S.ending || verdict(S);
  if (S.shutDown) S.ending = v;
  music('report', { fade: 1 }); A.sfx('oneup');
  if (HUB && HUB.active && !sessionEnded) { sessionEnded = true; try { HUB.result({ score: caseScore(S), stats: { exhibits: evidenceList(S).length, burns: S.burns, rank: v.rank }, awards: S.box.result === 'flipped' ? [{ title: 'He talked', detail: 'Dray named the stash house' }] : [] }); } catch (e) { /* hub gone */ } }
  game.after(.6, () => showResults(v));
}
function showResults(v) {
  ui.show('results', { kicker: demo ? 'The detail · demonstration' : 'Closing report', title: v.title, text: v.text, stats: resultStats(S), medals: medals(S),
    actions: demo ? [] : IN_SESSION ? [{ label: 'The hub takes it from here', primary: true, fn: () => {} }] : [{ label: 'Work another case', primary: true, fn: () => { ui.hide(); startCase(); } }, ['Back to the title', () => { ui.hide(); game.go('title'); }]] });
}
