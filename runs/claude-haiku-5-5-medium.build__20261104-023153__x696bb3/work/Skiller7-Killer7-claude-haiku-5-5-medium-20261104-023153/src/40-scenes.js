/* Skiller7: scenes, input, the run (sim + presenter + bot), Room 7, the dev panel, the HUD, the AI Hub hooks, and start. */
S7.game = null;
S7.hub = null;             // the AI Hub client (window.AIHub) when it is there
S7.idle = 0;
S7.run = null;             // { sim, pres, area, talk, bot, cheats, done }

S7.INPUT = Object.assign({}, E.Input.DEFAULT, {
  fwd: ['KeyW', 'ArrowUp', 'Pad0'],
  back: ['KeyS', 'Pad1'],
  turn: ['KeyA', 'KeyD', 'Pad11'],
  aim: ['Mouse2', 'ShiftLeft', 'ShiftRight', 'Pad6'],
  fire: ['Mouse0', 'KeyJ', 'Pad7'],
  scan: ['Space', 'Pad4'],
  ability: ['KeyE', 'Pad5'],
  switchP: ['KeyQ', 'Pad3'],
  heal: ['KeyH', 'Pad8'],
  interact: ['KeyF', 'Pad2'],
  ring: ['KeyR', 'Pad10']
});

/* ---- the controller look: PlayStation glyphs (the default) or Xbox A B X Y ---- */
S7.GLYPHS = {
  PlayStation: { Pad0: ['X', '#5b8cff'], Pad1: ['O', '#ff5a5a'], Pad2: ['SQ', '#e06cc8'], Pad3: ['TR', '#5cd6a0'] },
  Xbox: { Pad0: ['A', '#58c85a'], Pad1: ['B', '#ff5a4a'], Pad2: ['X', '#4a8cff'], Pad3: ['Y', '#f0d040'] }
};
S7.ACTION_PAD = { fwd: 'Pad0', back: 'Pad1', interact: 'Pad2', switchP: 'Pad3', confirm: 'Pad0', cancel: 'Pad1', aim: 'Pad6', fire: 'Pad7', scan: 'Pad4', ability: 'Pad5', heal: 'Pad8', ring: 'Pad10', turn: 'Pad11', start: 'Pad9' };
S7.padName = (action) => S7.ACTION_PAD[action];
/** a button prompt: a coloured disc with its letter (controller), or the key's cap (keyboard and mouse) */
S7.prompt = (g, x, y, action, text) => {
  const pad = S7.isPad();
  if (!pad) {
    const label = text || S7.game.input.label(action) || '?';
    const w = E.font.width(label) + 6;
    E.ui.box(g, x, y - 4, w, 11, { bg: '#20202c', border: '#8a86a8', gradient: false });
    E.font.text(g, label, x + 3, y - 1, '#ffffff');
    return w + 4;
  }
  const pad_ = S7.padName(action);
  const style = S7.GLYPHS[S7.game.settings.glyphs === 'Xbox' ? 'Xbox' : 'PlayStation'];
  const sym = style[pad_] || ['?', '#999'];
  E.px.disc(g, x + 4, y + 1, 4.5, sym[1]);
  E.font.text(g, sym[0], x + 4 - E.font.width(sym[0]) / 2, y - 1, '#0b0814');
  const label = text || '';
  if (label) E.font.text(g, label, x + 11, y - 1, '#f4f0ff');
  return 11 + (label ? E.font.width(label) + 4 : 0);
};
/* the last time a key, a click or a touch came in: the attract timer and the attract exit read it (a press between two
 * steps still counts) */
S7.lastInput = -1e9;
if (typeof addEventListener === 'function') for (const t of ['keydown', 'pointerdown', 'touchstart', 'wheel']) addEventListener(t, () => { S7.lastInput = performance.now(); }, true);
/* the mouse: its movement since the last step turns the aim while the aim button is held (no pointer lock needed) */
S7.mouseMove = [0, 0];
if (typeof addEventListener === 'function') addEventListener('mousemove', e => { S7.mouseMove[0] += e.movementX || 0; S7.mouseMove[1] += e.movementY || 0; });
S7.isPad = () => /gamepad|pad/i.test(String(S7.game.input.lastDevice));
S7.anyInput = () => {
  const I = S7.game.input;
  return I.anyPressed() || I.move()[0] !== 0 || I.move()[1] !== 0;
};
S7.touchOnly = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

/* ---- the intents of one step: the player's devices, or the bot ---- */
S7.readIntents = (dt) => {
  const I = S7.game.input, m = I.move(), k = S7.live;
  const cam = S7.run && S7.run.pres && S7.run.pres.world ? S7.run.pres.world.camera : null;
  const mouse = [0, 0];
  if (cam && cam.takeMouse) cam.takeMouse(mouse);
  const aim = I.down('aim');
  const moved = S7.mouseMove;
  mouse[0] += moved[0]; mouse[1] += moved[1]; S7.mouseMove = [0, 0];
  return {
    fwd: I.down('fwd') || (m[1] < -.5 && !aim),
    back: I.down('back') || m[1] > .6 && !aim,
    turn: I.pressed('turn'),
    aim,
    fire: I.down('fire'),
    fireEdge: I.pressed('fire'),
    scan: I.pressed('scan'),
    ability: I.pressed('ability'),
    switchP: I.pressed('switchP'),
    heal: I.pressed('heal'),
    interact: I.down('interact'),
    pay: I.pressed('interact'),
    ring: I.down('ring'),
    branch: I.pressed('left') ? -1 : I.pressed('right') ? 1 : 0,
    confirm: I.pressed('confirm'),
    aimDX: aim ? (m[0] * k.aimSpeed * dt + mouse[0] * .0024) : 0,
    aimDY: aim ? (-m[1] * k.aimSpeed * dt - mouse[1] * .0024) : 0
  };
};

/* ---- what the scenes answer: a person speaks, a note is read, the service door asks for its code, the boss begins ---- */
S7.onSceneEvent = (r, e) => {
  if (e.type === 'talk') {
    const n = S7.NPCS[e.id];
    if (!n) return;
    const rig = r.pres.npcs[e.id] ? r.pres.npcs[e.id].rig : null;
    r.talk.say(n.lines[r.areaId] || n.lines.t00, { name: n.name, portrait: rig && rig.drawPortrait ? rig : undefined, voice: S7.VOICE[n.voice] });
  } else if (e.type === 'note') {
    const note = S7.NOTES[e.id];
    r.talk.say([note.text], { name: 'DOSSIER: ' + note.title, voice: S7.VOICE.hero });
  } else if (e.type === 'code_request') {
    const g = r.area.gates.find(x => x.id === e.id);
    r.code = { id: e.id, label: g.label, at: 0, cells: new Array(g.code.length).fill(0), wrong: 0 };
  } else if (e.type === 'boss' && e.phase === 1) {
    S7.startCut(r, S7.BEATS.boss);
  }
};
/* ---- cutscenes: a generator of camera shots and dialogue. A shot holds the camera for its seconds; confirm, cancel or
 * pause skips it, and closing a line of dialogue moves on. The sim is frozen while a cut plays. ---- */
S7.startCut = (r, gen) => { if (!r.bot) r.cut = { gen: gen(r), wait: 0 }; };
S7.cutStep = (r, dt, talkBusy) => {
  const c = r.cut;
  if (!c) return false;
  if (talkBusy) return true;
  const I = S7.game.input;
  if (c.wait > 0) {
    c.wait -= dt;
    const skip = I.pressed('confirm') || I.pressed('cancel') || I.pressed('pause');
    if (c.wait > 0 && !skip) return true;
    c.wait = 0;
  }
  const n = c.gen.next();
  if (n.done) { r.cut = null; r.sim.camOverride = null; return false; }
  const v = n.value || {};
  if (v.say) { r.sim.camOverride = null; r.talk.say(v.say, v.opts || {}); return true; }
  if (v.shot) { r.sim.camOverride = { at: v.shot.at, look: v.shot.look, fov: v.shot.fov || 50 }; c.wait = v.t || 3; return true; }
  return true;
};
S7.gateCode = (area, id) => area.gates.find(g => g.id === id).code;
/** the service door: the digits typed against its code */
S7.submitCode = (r, typed) => {
  const c = r.code;
  if (typed === S7.gateCode(r.area, c.id)) {
    r.code = null;
    r.sim.openGate(c.id);
    r.talk.say(['The door gives with a sigh of cold air and old lift grease.'], { name: c.label });
  } else {
    c.wrong = 1.2; c.cells = c.cells.map(() => 0); c.at = 0;
    S7.sfx('bump');
  }
};
S7.codeStep = (r, dt) => {
  const I = S7.game.input, c = r.code;
  if (r.bot) { S7.submitCode(r, c.cells.length ? S7.gateCode(r.area, c.id) : ''); return; }
  if (I.pressed('cancel')) { r.code = null; return; }
  if (I.repeat('up', .3, .12)) c.cells[c.at] = (c.cells[c.at] + 1) % 10;
  if (I.repeat('down', .3, .12)) c.cells[c.at] = (c.cells[c.at] + 9) % 10;
  if (I.pressed('left')) c.at = Math.max(0, c.at - 1);
  if (I.pressed('right')) c.at = Math.min(c.cells.length - 1, c.at + 1);
  if (c.wrong > 0) c.wrong -= dt;
  if (I.pressed('confirm')) { if (c.at < c.cells.length - 1) c.at++; else S7.submitCode(r, c.cells.join('')); }
};
S7.drawCode = (r, c) => r.overlay(g => {
  const w = 150, x = r.W / 2 - w / 2, y = r.H / 2 - 34;
  E.ui.box(g, x, y, w, 62, { bg: ['#1a1030', '#0a0618'], border: '#c8a0ff', alpha: .95 });
  E.font.text(g, c.label, r.W / 2, y + 6, '#ffe8c0', { align: 'center' });
  c.cells.forEach((d, i) => {
    const cx = r.W / 2 - c.cells.length * 10 + i * 20;
    E.ui.box(g, cx, y + 20, 16, 22, { bg: i === c.at ? '#4a3a70' : '#20163a', border: i === c.at ? '#ffe070' : '#6a5a8a', gradient: false });
    E.font.text(g, String(d), cx + 5, y + 26, '#ffffff');
  });
  E.font.text(g, c.wrong > 0 ? 'WRONG CODE' : 'UP/DOWN CHANGE   CONFIRM NEXT', r.W / 2, y + 49, c.wrong > 0 ? '#ff7a6a' : '#9a90b0', { align: 'center' });
});

/* ---- the run: one area under play, or the bot's attract loop ---- */
S7.beginRun = (areaId, o = {}) => {
  S7.endRun();
  const area = S7.AREAS[areaId];
  const sim = new S7.Sim(area, o);
  const pres = new S7.Presenter(S7.game, sim, area, o);
  pres.build();
  const run = { sim, pres, area, areaId, talk: new E.Dialog(S7.game), bot: !!o.bot, time: 0, reportedHub: false, talked: {}, code: null, talkOpen: false };
  S7.run = run;
  if (o.bot) Object.assign(S7.cheats, { god: true, reveal: true, ammo: true });
  if (areaId === 'echo' && S7.prog.echoBest && S7.prog.echoBest.trace) run.ghostTrace = S7.prog.echoBest.trace;
  run.titleT = 3.5;
  run.intro = o.intro || null;
  return run;
};
S7.endRun = () => {
  if (S7.run && S7.run.pres) S7.run.pres.dispose();
  S7.run = null;
};
/** a step of the run: the intents go to the sim, the presenter follows */
S7.stepRun = (dt) => {
  const run = S7.run;
  if (!run) return;
  const sim = run.sim;
  let I;
  if (run.bot) I = S7.botIntents(run, dt);
  else I = S7.readIntents(dt);
  if (run.echoWait) { run.echoWait = S7.hub && S7.hub.time() < 0; }
  if (!run.echoWait) sim.update(dt, I);
  run.time += dt;
  if (run.titleT > 0) run.titleT -= dt;
  if (run.ghostTrace) S7.updateGhost(run);
  run.pres.step(dt);
  if (S7.hub && S7.hub.active && run.areaId === 'echo' && !run.reportedHub) S7.hubProgress(run);
};

/** the echo's ghost: where the best run was at this time */
S7.updateGhost = (run) => {
  const tr = run.ghostTrace, t = run.sim.t;
  let lo = 0, hi = tr.length - 1;
  if (!tr.length || t > tr[hi][0] + .5) { run.pres.setGhost(null); return; }
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tr[mid][0] <= t) lo = mid; else hi = mid - 1; }
  const [, leg, s] = tr[lo];
  run.pres.setGhost(S7.legAt(run.area, leg, s));
};

/* ---- the bot: follows the rails, aims at the nearest Whiteout, fires, scans, uses its ability ---- */
S7.botIntents = (run, dt) => {
  const sim = run.sim, p = sim.pos;
  const I = { fwd: true, back: false, turn: false, aim: false, fire: false, fireEdge: false, scan: false, ability: false,
    switchP: false, heal: false, interact: false, ring: false, branch: 0, aimDX: 0, aimDY: 0 };
  if (sim.junction) { I.branch = sim.junction.pick < 1 ? 1 : 0; I.fwd = (run.time % 1) > .5; return I; }   // (lets go, presses forward again)
  if (sim.boss && sim.boss.alive) { /* the boss: stand and shoot */ }
  let target = null, best = 1e9;
  for (const e of sim.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 26 && d < best && (e.revealT > 0 || S7.cheats.reveal)) { best = d; target = e; }
  }
  const boss = sim.boss && sim.boss.alive ? sim.boss : null;
  if (boss && (!target || best > Math.hypot(boss.x - p.x, boss.y - p.y))) target = boss;
  if (target) {
    I.aim = true; I.fire = true;
    const want = Math.atan2(target.y - p.y, target.x - p.x) - (sim.dir > 0 ? p.ang : p.ang + Math.PI);
    const dyaw = S7.wrapAng(want - sim.aimYaw);
    I.aimDX = S7.clamp(dyaw, -.12, .12);
    const dist = Math.hypot(target.x - p.x, target.y - p.y);
    const wantPitch = Math.atan2((target.z + (target.warm || target.warmZ || 1.5)) - (p.z + 1.62), Math.max(.5, dist));
    I.aimDY = S7.clamp(wantPitch - sim.aimPitch, -.05, .05);
    I.fwd = false;
    I.fireEdge = true;
  }
  if (!target && run.bot) {
    if (sim.mode !== 'aim' && (run.time % 2.5) < dt) I.scan = true;
  }
  if (target && (run.time % 2.2) < dt) I.scan = true;
  if (sim.me.cdAbility <= 0 && (run.time % 7) < dt) I.ability = true;
  if (sim.me.frozen) I.interact = true;
  if (sim.gateNear && !sim.gateOpen[sim.gateNear.id] && (run.time % 1) < dt) I.pay = true;
  const person = sim.npcNear();
  // the bot knows the service code (it may cheat): the door opens as the bot reaches it
  if (sim.gateNear && sim.gateNear.kind === 'code' && !sim.gateOpen[sim.gateNear.id]) sim.openGate(sim.gateNear.id);
  run.talked = run.talked || {};
  if (person && !run.talked[person.id]) { run.talked[person.id] = true; I.pay = true; }
  if (sim.me.hp < 3 && S7.prog.red > 0 && (run.time % 1.2) < dt) I.heal = true;
  if (sim.leg.ski) { I.aim = false; I.fire = false; I.fireEdge = false; I.fwd = true; }
  return I;
};

/* ---- Room 7: the save room. A menu of its own, with Sister Rosalind, the clock, the wardrobe and the bench ---- */
S7.openRoom7 = (o = {}) => {
  S7.endRun();
  const area = S7.AREAS.room7;
  const sim = new S7.Sim(area, { room: true });
  const pres = new S7.Presenter(S7.game, sim, area, {});
  pres.build();
  const rosaRig = new E.Humanoid({ size: 1.25, build: 'chibi', hat: { style: 'band', color: '#f4f0ea' }, colors: { cloth: '#1a1a22', coat: '#1a1a22', pants: '#1a1a22', boot: '#0a0a0e', trim: '#f4f0ea', skin: '#f0cdb0', hair: '#c8c8d0' }, weapon: null, outfit: 'robe', sleeves: 'long' });
  const rosa = pres.world.mob({ x: 9 * S7.M, y: 5.4 * S7.M, z: 0, rig: rosaRig, pose: false, fly: true, r: 6, half: 0 });
  rosa.setSolid(false);
  S7.room7 = { sim, pres, area, talk: new E.Dialog(S7.game), menu: null, rosaRig, rosa };
  S7.room7Setup(o);
};
S7.room7Setup = (o) => {
  const R = S7.room7, P = S7.prog;
  const items = [];
  items.push({ label: 'TARGET 00: THE GRAND HOTEL NADA', id: 'go:t00' });
  items.push({ label: 'TARGET 01: APRES PISTE', id: 'go:t01', disabled: !P.bossDown['t00:bellcaptain'] });
  items.push({ label: 'ECHO RUN: THE BLACK RUN', id: 'go:echo', disabled: !P.bossDown['t01:powderking'] });
  items.push({ label: 'CUCKOO CLOCK: SAVE', id: 'save' });
  items.push({ label: 'WARDROBE: CHOOSE A COAT', id: 'wardrobe' });
  items.push({ label: 'WAX BENCH: UPGRADES', id: 'bench' });
  items.push({ label: 'DOSSIER: READ NOTES', id: 'dossier' });
  items.push({ label: 'SISTER ROSALIND: TALK', id: 'talk' });
  items.push({ label: 'TITLE', id: 'title' });
  R.items = items;
  R.menu = new E.Menu(S7.game, items.map(it => ({ label: it.label, disabled: !!it.disabled })), {
    x: 'center', y: 118, title: 'ROOM 7', box: true,
    onPick: (i) => S7.room7Pick(items[i].id), onCancel: () => {}
  });
  R.menuKind = 'main';
  if (o.intro) R.talk.say(S7.LINES.room7Intro, { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
  if (o.after) R.talk.say(S7.LINES.after[o.after], { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
};
S7.room7Pick = (id) => {
  const R = S7.room7;
  if (id === 'go:t00') { S7.game.go('play', { area: 't00' }); }
  else if (id === 'go:t01') S7.game.go('play', { area: 't01' });
  else if (id === 'go:echo') S7.game.go('play', { area: 'echo' });
  else if (id === 'save') { S7.game.saves.save(0); R.talk.say(['The clock strikes. Your coat is noted in the book.'], { name: 'CUCKOO CLOCK' }); }
  else if (id === 'wardrobe') S7.openWardrobe();
  else if (id === 'bench') S7.openBench();
  else if (id === 'dossier') S7.openDossier();
  else if (id === 'talk') R.talk.say(S7.LINES.rosalind, { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
  else if (id === 'title') S7.game.go('title');
};
S7.openWardrobe = () => {
  const R = S7.room7, P = S7.prog;
  const items = S7.ROSTER.map(id => ({ label: (P.unlocked[id] ? '' : '(LOCKED) ') + S7.PERSONAS[id].name + '  ' + S7.PERSONAS[id].abilityName, id, disabled: !P.unlocked[id] }));
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 90, title: 'WARDROBE',
    onPick: (i) => { if (items[i].disabled) return; P.current = items[i].id; R.talk.say([S7.PERSONAS[items[i].id].abilityDesc], { name: S7.PERSONAS[items[i].id].name }); S7.room7Back(); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'wardrobe';
};
S7.openBench = () => {
  const R = S7.room7, P = S7.prog;
  const ups = [['hp', 'WAX: STURDY COAT  (+2 HP)', 6], ['ammo', 'WAX: BIG POCKETS  (+25% MAG)', 4], ['scan', 'WAX: LONG LENS  (+SCAN)', 4]];
  const items = ups.map(([k, label, cost]) => ({ label: label + '  ' + cost + ' RIME', k, cost, disabled: P.upg[k] >= 4 || P.rime < cost }));
  items.push({ label: 'BACK', k: 'back' });
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled && i.k !== 'back' })), { x: 'center', y: 90, title: 'WAX BENCH  (RIME ' + P.rime + ')',
    onPick: (i) => { const it = items[i]; if (it.k === 'back') return S7.room7Back(); if (it.disabled) return; P.rime -= it.cost; P.upg[it.k]++; S7.openBench(); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'bench';
};
S7.openDossier = () => {
  const R = S7.room7, keys = Object.keys(S7.prog.notes);
  const items = keys.map(k => ({ label: S7.NOTES[k].title, k }));
  if (!items.length) items.push({ label: 'NO NOTES YET', k: null, disabled: true });
  items.push({ label: 'BACK', k: 'back' });
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled })), { x: 'center', y: 90, title: 'DOSSIER',
    onPick: (i) => { const it = items[i]; if (it.k === 'back') return S7.room7Back(); if (it.k) R.talk.say(S7.NOTES[it.k].text.match(/.{1,140}(\s|$)/g), { name: S7.NOTES[it.k].title }); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'dossier';
};
S7.room7Back = () => { const R = S7.room7; R.menuKind = 'main'; S7.room7Setup({}); };

/* ---- the dev panel: the tuning sliders, cheats, and the warps ---- */
S7.devRows = () => {
  const rows = [];
  let group = null;
  for (const k in S7.TUNING) {
    const t = S7.TUNING[k];
    if (t.group !== group) { group = t.group; rows.push({ head: group.toUpperCase() }); }
    rows.push({ kind: 'slider', key: k, label: t.label });
  }
  rows.push({ head: 'CHEATS' });
  rows.push({ kind: 'toggle', key: 'god', label: 'God mode' });
  rows.push({ kind: 'toggle', key: 'ammo', label: 'Infinite ammo' });
  rows.push({ kind: 'toggle', key: 'reveal', label: 'Reveal all Whiteouts' });
  rows.push({ head: 'ACTIONS' });
  rows.push({ kind: 'act', label: 'Give 20 Rime', fn: () => { S7.prog.rime += 20; } });
  rows.push({ kind: 'act', label: 'Give 5 Red', fn: () => { S7.prog.red += 5; } });
  rows.push({ kind: 'act', label: 'Unlock every coat', fn: () => { for (const id of S7.ROSTER) S7.prog.unlocked[id] = true; } });
  rows.push({ kind: 'act', label: 'Kill all Whiteouts', fn: () => { const r = S7.run; if (r) for (const e of r.sim.enemies) if (e.alive) r.sim.killEnemy(e, false); } });
  rows.push({ kind: 'act', label: 'Warp: Target 00', fn: () => S7.game.go('play', { area: 't00' }) });
  rows.push({ kind: 'act', label: 'Warp: Target 01', fn: () => S7.game.go('play', { area: 't01' }) });
  rows.push({ kind: 'act', label: 'Warp: Echo Run', fn: () => S7.game.go('play', { area: 'echo' }) });
  rows.push({ kind: 'act', label: 'Warp: Room 7', fn: () => S7.game.go('room7', {}) });
  rows.push({ kind: 'act', label: 'RESET TO DEFAULTS', fn: () => { S7.resetTuning(); S7.cheats.god = S7.cheats.ammo = S7.cheats.reveal = false; } });
  return rows;
};
S7.DEV_SEL = () => S7.devRows().filter(r => !r.head);

/* ---- the HUD ---- */
S7.drawHUD = (r, run) => {
  const sim = run.sim, pres = run.pres;
  const me = sim.me, P = S7.PERSONAS[me.id], W = S7.WEAPONS[P.weapon];
  r.overlay(gg => {
    const x = 6, y = 6;
    E.ui.box(gg, x, y, 96, 30, { bg: ['#1a1030', '#0a0618'], border: '#7a5a90', alpha: .85 });
    const h = pres.heroes[me.id];
    if (h && h.rig) h.rig.drawPortrait(gg, x + 4, y + 2, 26, { zoom: 3, turn: .4, bg: null });
    E.font.text(gg, P.name, x + 34, y + 4, '#ffe8c0', { scale: 1 });
    E.ui.hearts(gg, x + 34, y + 14, me.hp, me.maxHp);
    E.font.text(gg, W.name + '  ' + (S7.cheats.ammo ? '--' : me.mag) + '/' + me.magMax, x + 34, y + 23, '#c8c0e0');
    // the party: each persona's HP as a pip
    sim.heroes.forEach((h2, i) => {
      const pw = 14, px = x + 100 + i * 15;
      if (px + pw > r.W - 4) return;
      E.ui.box(gg, px, y, pw, 12, { bg: h2.frozen ? '#2a3a60' : '#1a1030', border: i === sim.cur ? '#ffe070' : '#4a3a60', gradient: false, alpha: .85 });
      E.ui.bar(gg, px + 2, y + 9, pw - 4, 2, h2.hp / h2.maxHp, h2.frozen ? '#8ad8ff' : '#ff5a4a');
      E.font.text(gg, S7.PERSONAS[h2.id].name.slice(0, 2), px + 2, y + 2, h2.frozen ? '#a8e0ff' : '#f0e8ff', { scale: 1 });
    });
    // the red and the rime
    E.ui.box(gg, x, y + 34, 60, 12, { bg: '#140c24', alpha: .8, gradient: false });
    E.font.text(gg, 'RED ' + S7.prog.red, x + 4, y + 37, '#ff8a7a');
    E.font.text(gg, 'RIME ' + S7.prog.rime, x + 32, y + 37, '#bff8ff');
    // scan and ability
    const sx = r.W - 92, sy = r.H - 22;
    E.ui.box(gg, sx, sy, 88, 16, { bg: '#140c24', alpha: .8, gradient: false });
    const scanR = sim.scanCD > 0 ? 1 - sim.scanCD / 1.6 : 1;
    E.ui.bar(gg, sx + 3, sy + 12, 82, 2, scanR, sim.scanCD > 0 ? '#7a6a8a' : '#ff6a50');
    E.font.text(gg, sim.scanCD > 0 ? 'SCAN ...' : 'SCAN READY', sx + 3, sy + 3, sim.scanCD > 0 ? '#9a90b0' : '#ffd2b0');
    const ab = P.abilityName, cd = me.cdAbility > 0 ? ' ' + Math.ceil(me.cdAbility) : ' READY';
    E.font.text(gg, ab + cd, sx + 3, sy - 9, me.cdAbility > 0 ? '#9a90b0' : '#ffe070');
    // the prompts
    let py = r.H - 38;
    const prompt = (act, text) => { S7.prompt(gg, 8, py, act, text); py -= 14; };
    if (sim.gateNear && !sim.gateOpen[sim.gateNear.id]) prompt('interact', sim.gateNear.kind === 'code' ? 'ENTER THE CODE: ' + sim.gateNear.label : 'PAY ' + sim.gateNear.price + ' RIME: ' + sim.gateNear.label);
    if (!sim.gateNear && sim.npcNear()) prompt('interact', 'TALK TO ' + S7.NPCS[sim.npcNear().id].name);
    if (sim.heroes.some(h => h.frozen) && me.frozen) prompt('interact', 'HOLD TO THAW THE SWEEP');
    if (sim.junction) { E.font.text(gg, 'PICK A WAY  (LEFT / RIGHT, THEN FORWARD)', r.W / 2, 22, '#ffe070', { align: 'center' }); }
    if (me.frozen) E.font.title(gg, 'FROZEN', r.W / 2, r.H / 2 - 40, { scale: 2, align: 'center' });
    if (sim.mode === 'aim' || pres.isAim()) {
      E.font.text(gg, '+', r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center' });
    }
    if (sim.boss && sim.boss.alive) {
      const b = sim.boss, bw = Math.min(260, r.W * .5);
      E.ui.box(gg, r.W / 2 - bw / 2 - 4, 6, bw + 8, 20, { bg: '#120a14', alpha: .85 });
      E.font.text(gg, b.name, r.W / 2, 9, '#ffd8a0', { align: 'center' });
      E.ui.bar(gg, r.W / 2 - bw / 2, 19, bw, 4, Math.max(0, b.hp / b.maxHP), '#ff6a50');
    }
    if (run.area.id === 'echo') {
      E.font.title(gg, sim.t.toFixed(2) + 's', r.W - 6, 6, { scale: 1, align: 'right' });
    }
    if (run.titleT > 0) {
      E.font.title(gg, run.area.title, r.W / 2, r.H / 2 - 60, { scale: 2, align: 'center', colors: ['#ffe8c0', '#ff6a50'] });
      E.font.text(gg, run.area.sub, r.W / 2, r.H / 2 - 40, '#c8c0e0', { align: 'center' });
    }
    if (run.bot) E.font.text(gg, 'ATTRACT', r.W / 2, r.H - 8, '#ff6a50', { align: 'center' });
  });
  pres.drawLabels(r);
};

/* ---- the scenes ---- */
S7.makeScenes = (game) => {
  const scenes = {};
  scenes.title = {
    enter() {
      S7.idle = 0; S7.idleSince = performance.now(); S7.endRun(); S7.game.weather = { kind: 'snow', amount: .55, wind: .25 };
      S7.music('title');
      const items = [];
      if (S7.touchOnly) items.push({ label: 'SETTINGS', id: 'settings' });
      else {
        items.push({ label: 'NEW GAME', id: 'new' });
        items.push({ label: 'CONTINUE', id: 'continue', disabled: !S7.game.saves.latest() });
        items.push({ label: 'ECHO RUN', id: 'echo' });
        items.push({ label: 'SETTINGS', id: 'settings' });
        items.push({ label: 'CONTROLS', id: 'controls' });
        items.push({ label: 'ABOUT & CREDITS', id: 'credits' });
      }
      this.ids = items.map(i => i.id);
      this.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled })), { x: 'center', y: 128, box: false, color: '#f4eef8', pick: '#ffe070',
        onPick: (i) => this.pick(this.ids[i]) });
    },
    pick(id) {
      if (id === 'new') { S7.prog = S7.newProgress(); S7.game.go('room7', { intro: true }); }
      else if (id === 'continue') { const s = S7.game.saves.latest(); if (s) S7.game.saves.load(s.slot ?? 0); }
      else if (id === 'echo') S7.game.go('play', { area: 'echo' });
      else if (id === 'settings') S7.game.menu('settings');
      else if (id === 'controls') S7.game.menu('controls');
      else if (id === 'credits') S7.game.go('credits', { from: 'title' });
    },
    update(dt) {
      if (S7.anyInput() || S7.lastInput > S7.idleSince) S7.idleSince = performance.now();
      // (a hub session owns the screen: no attract)
      if (performance.now() - S7.idleSince > 10000 && !(S7.hub && S7.hub.active)) { S7.game.go('attract', { fade: 0 }); return; }
      if (S7.touchOnly) return;
      this.menu.update(dt);
    },
    draw(r) {
      r.sky(['#060a1e', '#16214a', '#3a4c86']);
      r.overlay(g => {
        E.font.title(g, S7.TITLE, r.W / 2, 22, { scale: 2, align: 'center', colors: ['#ffffff', '#ff6a50', '#c81e2a'], depth: 3, depthColor: '#3a0a10' });
        E.font.text(g, S7.TAG, r.W / 2, 60, '#e8e4ff', { align: 'center' });
        E.font.text(g, 'a game in the manner of Killer7', r.W / 2, 72, '#8a86b0', { align: 'center' });
      });
      if (S7.touchOnly) r.overlay(g => {
        E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H / 2 - 10, '#ffe070', { align: 'center', scale: 1 });
      });
      else this.menu.draw(r);
      r.overlay(g => { E.font.text(g, 'v' + S7.VERSION + '  ' + S7.hubLine(), 4, r.H - 10, '#6a6688'); });
    }
  };

  scenes.attract = {
    enter() {
      S7.prog = S7.prog || S7.newProgress();
      this.since = performance.now() + 400;   // (a press that brought us here doesn't leave again)
      this.order = ['t00', 't01', 'echo']; this.k = 0;
      this.begin();
    },
    begin() { const id = this.order[this.k % this.order.length]; this.k++; S7.beginRun(id, { bot: true }); S7.run.attract = true; S7.game.weather = null; S7.music(S7.AREAS[id].music); },
    update(dt) {
      if (S7.anyInput() || S7.lastInput > this.since) { S7.game.go('title', { fade: 0 }); return; }
      S7.stepRun(dt);
      const r = S7.run;
      if (r && (r.sim.complete || r.sim.over || r.time > 150)) { S7.endRun(); this.begin(); }
    },
    draw(r) { if (S7.run) { S7.drawRunWorld(r); S7.drawHUD(r, S7.run); } r.overlay(g => { E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H / 2 + 60, '#ffe070', { align: 'center' }); }); },
    exit() { S7.endRun(); Object.assign(S7.cheats, { god: false, reveal: false, ammo: false }); }
  };

  scenes.room7 = {
    enter(d) { S7.game.weather = null; S7.music('room7'); S7.openRoom7(d || {}); },
    update(dt) {
      const R = S7.room7;
      if (!R) return;
      R.pres.step(dt);
      R.rosaRig.update(dt, { x: 9 * S7.M, y: 5.4 * S7.M, z: 0, facing: -Math.PI / 2, expr: 'smile' });
      if (R.talk.update(dt)) return;
      if (R.menu) R.menu.update(dt);
    },
    draw(r) {
      const R = S7.room7;
      if (!R) return;
      R.pres.world.draw(r);
      r.overlay(g => {
        E.font.text(g, 'ROOM 7', 6, 6, '#e8c8a0');
        E.font.text(g, 'RIME ' + S7.prog.rime + '   RED ' + S7.prog.red, 6, 16, '#bff8ff');
      });
      if (R.menu) R.menu.draw(r);
      R.talk.draw(r);
    },
    exit() { if (S7.room7) { S7.room7.pres.dispose(); S7.room7 = null; } }
  };

  scenes.play = {
    pausable: true,
    enter(d) {
      d = d || {};
      if (d.resume && S7.run) { S7.keepRun = false; return; }
      S7.endRun();
      S7.game.weather = null;
      const areaId = d.area || 't00';
      S7.music(S7.AREAS[areaId].music);
      S7.run = S7.beginRun(areaId, { bot: !!d.bot, intro: null });
      if (S7.BEATS[areaId]) S7.startCut(S7.run, S7.BEATS[areaId]);
      if (areaId === 'echo' && S7.hub && S7.hub.active) { S7.run.echoWait = true; S7.hub.ready(); }
    },
    exit() { if (!S7.keepRun) S7.endRun(); S7.keepRun = false; },
    update(dt) {
      if (!S7.run) return;
      const r = S7.run, sim = r.sim;
      if (r.bot && r.talk.open) r.talk.close();   // the bot skips its dialogue
      if (r.code) { S7.codeStep(r, dt); r.pres.step(dt); return; }
      const talkBusy = r.talk.update(dt);
      const cutBusy = S7.cutStep(r, dt, talkBusy);
      if (talkBusy || cutBusy) { r.pres.step(dt); return; }   // the world and its camera carry on under dialogue and cuts
      S7.stepRun(dt);
      for (const e of r.pres.inbox.splice(0)) S7.onSceneEvent(r, e);
      if (sim.complete && !r.done) { r.done = true; S7.onComplete(r); }
      else if (sim.over && !r.done) { r.done = true; S7.game.go('gameover', { area: r.areaId }); }
    },
    draw(r) {
      if (!S7.run) return;
      S7.drawRunWorld(r);
      S7.drawHUD(r, S7.run);
      if (S7.run.code) S7.drawCode(S7.run, S7.run.code);
      S7.run.talk.draw(r);
    }
  };

  scenes.dev = {
    enter() { this.rowsAll = S7.devRows(); this.i = 0; },
    update(dt) {
      const I = S7.game.input, rows = this.rowsAll.filter(r => !r.head), n = rows.length;
      if (I.pressed('cancel') || I.pressed('pause')) { S7.game.go('play', { resume: true }); return; }
      if (I.repeat('up', .3, .09)) this.i = (this.i - 1 + n) % n;
      if (I.repeat('down', .3, .09)) this.i = (this.i + 1) % n;
      const row = rows[this.i];
      const step = (dir) => {
        if (row.kind !== 'slider') return;
        const t = S7.TUNING[row.key];
        S7.live[row.key] = S7.clamp(Math.round((S7.live[row.key] + dir * t.step) / t.step) * t.step, t.min, t.max);
      };
      if (I.repeat('left', .3, .07)) step(-1);
      if (I.repeat('right', .3, .07)) step(1);
      if (I.pressed('confirm')) {
        if (row.kind === 'toggle') S7.cheats[row.key] = !S7.cheats[row.key];
        if (row.kind === 'act') row.fn();
      }
      if (row.kind === 'slider' && I.pressed('confirm')) { S7.live[row.key] = S7.TUNING[row.key].def; }
    },
    draw(r) {
      S7.drawRunWorld(r);
      const rows = this.rowsAll;
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#06050c'], border: '#8a7ab0', alpha: .9 });
        E.font.title(g, 'DEV MODE', r.W / 2, 12, { scale: 1, align: 'center' });
        E.font.text(g, 'UP/DOWN choose   LEFT/RIGHT change   CONFIRM toggles or runs   CANCEL: back', r.W / 2, r.H - 16, '#8a86b0', { align: 'center' });
        let idx = 0;
        const colW = (r.W - 24) / 2, lineH = 8;
        let col = 0, x0 = 12, yy = 26;
        for (const row of rows) {
          if (row.head) { if (yy > r.H - 20 && col === 0) { col = 1; x0 = 12 + colW; yy = 26; } E.font.text(g, row.head, x0, yy, '#ffe070'); yy += lineH + 2; continue; }
          if (yy > r.H - 20 && col === 0) { col = 1; x0 = 12 + colW; yy = 26; }
          const sel = idx === this.i;
          if (sel) E.ui.box(g, x0 - 3, yy - 2, colW - 6, lineH + 2, { bg: '#3a2a60', gradient: false, alpha: .8 });
          let val = '';
          if (row.kind === 'slider') val = String(S7.live[row.key]);
          if (row.kind === 'toggle') val = S7.cheats[row.key] ? 'ON' : 'OFF';
          E.font.text(g, row.label, x0, yy, sel ? '#fff' : '#c8c0e0');
          E.font.text(g, val, x0 + colW * .6 - 6, yy, sel ? '#ffe070' : '#9a96b8', { align: 'right' });
          if (row.kind === 'slider') {
            const t = S7.TUNING[row.key];
            E.ui.bar(g, x0 + colW * .62, yy + 4, colW * .2, 2, (S7.live[row.key] - t.min) / (t.max - t.min), sel ? '#ffe070' : '#7a6a9a');
          }
          idx++; yy += lineH + 2;
        }
      });
    }
  };

  scenes.results = {
    enter(d) { this.d = d || {}; S7.music('victory'); S7.game.weather = null; },
    update(dt) {
      const I = S7.game.input;
      if (I.pressed('confirm') || I.pressed('cancel')) { const next = this.d.next || 'room7'; S7.game.go(next, this.d.nextData || {}); }
    },
    draw(r) {
      const d = this.d;
      r.sky(['#060a1e', '#16214a', '#2a3a70']);
      r.overlay(g => {
        E.ui.box(g, 16, 14, r.W - 32, r.H - 28, { bg: ['#1a1030', '#0a0618'], border: '#8a7ab0', alpha: .92 });
        E.font.title(g, d.title || 'TARGET COMPLETE', r.W / 2, 22, { scale: 2, align: 'center' });
        const lines = [
          'TIME  ' + (d.time || 0).toFixed(1) + ' s',
          'WHITEOUTS THAWED  ' + (d.kills || 0) + '   BLASTS TAKEN  ' + (d.blasts || 0),
          'SHOTS ' + (d.shots || 0) + '   HIT RATE ' + Math.round((d.acc || 0) * 100) + '%',
          'FREEZES ' + (d.deaths || 0) + '   REVEALED ' + (d.revealed || 0),
          'RIME +' + (d.rime || 0) + '   RED +' + (d.red || 0)
        ];
        lines.forEach((t, i) => E.font.text(g, t, r.W / 2, 60 + i * 14, '#e8e4ff', { align: 'center' }));
        E.font.title(g, 'RANK ' + (d.rank || 'C'), r.W / 2, 140, { scale: 3, align: 'center', colors: ['#ffe070', '#ff6a50'] });
        E.font.text(g, d.line || '', r.W / 2, 196, '#c8b8e0', { align: 'center', wrap: r.W - 60 });
        E.font.text(g, 'CONFIRM: CONTINUE', r.W / 2, r.H - 26, '#ffe070', { align: 'center' });
      });
    }
  };

  scenes.gameover = {
    enter(d) { this.d = d || {}; S7.game.weather = null; S7.music(null); this.menu = new E.Menu(S7.game, [{ label: 'RETURN TO ROOM 7' }, { label: 'TITLE' }], { x: 'center', y: 140, title: null, box: false, pick: '#ffe070',
      onPick: (i) => { S7.endRun(); if (i === 0) S7.game.go('room7', {}); else S7.game.go('title'); } }); },
    update(dt) { this.menu.update(dt); },
    draw(r) { r.sky(['#0a0408', '#2a0c14', '#0a0408']); r.overlay(g => { E.font.title(g, 'SNOWED IN', r.W / 2, 40, { scale: 3, align: 'center', colors: ['#ffffff', '#8ad8ff'] }); E.font.text(g, 'Oma Holle laughs. Her coat is still warm.', r.W / 2, 92, '#c8e4ff', { align: 'center' }); }); this.menu.draw(r); }
  };

  scenes.credits = {
    enter(d) { this.d = d || {}; this.y = 0; S7.music('title'); },
    update(dt) {
      this.y -= dt * 14;
      const I = S7.game.input;
      if (I.pressed('confirm') || I.pressed('cancel') || I.pressed('pause')) S7.game.go('title', { fade: 0 });
    },
    draw(r) {
      r.sky(['#060a1e', '#16214a', '#2a3a70']);
      r.overlay(g => {
        const lines = S7.CREDITS;
        let y = r.H - 20 + this.y;
        for (const ln of lines) {
          const [kind, text] = ln;
          if (kind === 'h') { E.font.title(g, text, r.W / 2, y, { scale: 1, align: 'center', colors: ['#ffe070', '#ff6a50'] }); y += 16; }
          else if (kind === 'w') { for (const part of E.font.wrap(text, r.W - 40)) { E.font.text(g, part, r.W / 2, y, '#e8e4ff', { align: 'center' }); y += 9; } }
          else y += 6;
        }
        if (y < -40) this.y = 0;
        E.font.text(g, 'CONFIRM: BACK', r.W / 2, r.H - 10, '#8a86b0', { align: 'center' });
      });
    }
  };
  return scenes;
};

/** the world of the current run (or the room), drawn with the presenter's camera */
S7.drawRunWorld = (r) => { const run = S7.run; if (run && run.pres && run.pres.world) run.pres.world.draw(r); };

/** a run's area is done: the results, the unlocks, the story */
S7.onComplete = (r) => {
  const P = S7.prog, st = r.sim.stats, acc = st.shots ? st.hits / st.shots : 0;
  const rank = acc > .6 && st.deaths === 0 ? 'S' : acc > .4 && st.deaths <= 1 ? 'A' : st.deaths <= 2 ? 'B' : 'C';
  const d = { title: r.area.title + ' COMPLETE', time: r.sim.t, kills: st.kills, blasts: st.blasts, shots: st.shots, acc, deaths: st.deaths, revealed: st.revealed, rime: st.rime, red: st.red, rank };
  if (r.areaId === 't00') {
    P.unlocked.tycoon = true; P.unlocked.yodeler = true;
    d.line = S7.LINES.t00Done.join(' ');
    d.next = 'room7'; d.nextData = { after: 't00' };
  } else if (r.areaId === 't01') {
    P.unlocked.photog = true; P.unlocked.avalanche = true;
    d.line = S7.LINES.t01Done.join(' ');
    d.next = 'credits'; d.nextData = { from: 'epilogue' };
  } else if (r.areaId === 'echo') {
    const best = P.echoBest;
    d.title = 'ECHO RUN';
    d.line = 'Your run is recorded. The next racer will race you.';
    if (!best || r.sim.t < best.time) P.echoBest = { time: r.sim.t, trace: r.sim.trace };
    d.next = 'room7';
    if (S7.hub && S7.hub.active) S7.hubResult(r);
  }
  P.rankBest[r.areaId] = P.rankBest[r.areaId] || rank;
  S7.game.go('results', d, { fade: 0 });
};

/* ---- AI Hub: the session (ghost mode) ---- */
S7.hubLine = () => (S7.hub && S7.hub.active ? 'AI HUB SESSION' : '');
S7.hubProgress = (run) => { const L = run.sim.leg; S7.hub.progress({ score: Math.round(100 * run.sim.s / Math.max(1, L.len)), label: run.sim.legId }); };
S7.hubResult = (r) => { if (r.reportedHub) return; r.reportedHub = true; S7.hub.result({ time: Math.round(r.sim.t * 1000) }); };

S7.start = () => {
  const E_ = My3D2dge;
  S7.E = E_;
  S7.defineThings();
  S7.prog = S7.newProgress();
  S7.hub = globalThis.AIHub || null;
  const game = new E_.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT,
    menu: {
      items: [['Dev mode', () => { S7.keepRun = true; if (S7.game.shell) S7.game.shell.hide(); S7.game.go('dev', { fade: 0 }); }]],
      settings: [
        { key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation', help: 'The buttons drawn on screen: PlayStation, or Xbox A B X Y.' },
        // the engine's Filter setting (cel, pixel) turns the picture black in the software renderer used for testing, so it is left out
        ...E_.World3D.SETTINGS.filter(o => o.key !== 'filter3d')
      ],
      saves: { slots: 3 }
    } });
  S7.game = game;
  window.__game = game;
  game.saves.write = () => ({ data: S7.prog, place: S7.run ? S7.run.areaId : 'room7', level: 'room7' });
  game.saves.read = (save) => { if (save && save.data) S7.prog = save.data; };
  const scenes = S7.makeScenes(game);
  game.debug = S7.debugHandle();
  game.start({
    scenes, scene: 'title',
    boot: { title: S7.TITLE, steps: [
      ['The 3D engine', () => E_.World3D.init(game)],
    ] }
  });
  if (S7.hub && S7.hub.active) S7.hub.connect({ mode: 'ghost' }).then(() => { S7.hub.ready(); });
  S7.started = true;
};
