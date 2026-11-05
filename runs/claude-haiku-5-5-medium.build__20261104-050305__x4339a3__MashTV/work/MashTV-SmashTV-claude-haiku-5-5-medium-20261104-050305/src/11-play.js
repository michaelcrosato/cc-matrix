/* MASH TV — 11-play: the run, the reaction table (events → sound, banners, lines, crowd), the lower third, and the play scene.
 * The run's whole flow is one generator (episode cards, rooms, map cards, bosses, continue, the end) run by game.script. */

/* ---------- the banners and the lower third (the broadcast layer, §5.12) ---------- */
MT.banners = [];
MT.lines = [];       // queued lines: { speaker, text, prio, voice, dur }
MT.lineNow = null;
MT.lastLineAt = -10;
MT.banner = (text, color, t = 2.2) => { MT.banners.push({ text, color: color || '#ffcc33', t, age: 0 }); };
MT.say = (speaker, text, o = {}) => { const L = { speaker, text: MT.fill(text, o.vars), prio: o.prio || 1, dur: o.dur, voice: o.voice || ({ LANCE: 'lance', PENNY: 'penny', ANNC: 'annc', NETWORK: 'network', MASHY: 'mashy' }[speaker] || 'lance') }; MT.lines.push(L); MT.lines.sort((a, b) => b.prio - a.prio); return L; };

// the reaction table: one place from events to what the player sees and hears. Gameplay code only emits events.
MT.react = {
  kill(d, W) { const big = d.big; MT.sfx(MT.killSfx(d.e.kind)); if (big) MT.babble.crowd('cheer', .9); else if (Math.random() < .3) MT.babble.crowd('cheer', .3); },
  hurt(d) { MT.sfx('hit'); MT.sfx('buzz', { vol: .6 }); MT.babble.crowd('ooh', .5); MT.lineFrom('hurt', 2); if (d.c.hp === 1) MT.say('LANCE', MT.TEXT.lowHp, { prio: 3 }); },
  death(d) { MT.sfx('death'); MT.lineFrom('death', 3, { NAME: d.c.name }); MT.babble.crowd('laugh', .6); MT.banner('MASHED!', '#ff3344', 1.8); },
  out(d) { MT.banner(d.c.name + ': OUT', '#ff3344', 2.5); MT.sfx('lose'); },
  respawn(d) { MT.sfx('respawn'); },
  land(d) { MT.sfx('land'); },
  shoot(d) { if (d.w === 'blaster') MT.sfx('pew', { vol: .3 }); else if (d.w === 'spread') MT.sfx('spread', { vol: .5 }); else if (d.w === 'rockets') MT.sfx('rocket', { vol: .5 }); else if (d.w === 'popcorn') MT.sfx('pop', { vol: .6 }); },
  slide(d) { MT.sfx('slide'); },
  showboat(d) { },
  'showboat-start'(d) { MT.sfx('showboat'); MT.lineFrom('showboat', 2); },
  boat(d) { if (d.gain >= 15) MT.babble.crowd('cheer', .8); },
  showstop(d) { MT.sfx('flash'); MT.sfx('boom'); MT.banner('SHOWSTOPPER!', '#ffffff', 1.2); },
  powerup(d) { MT.sfx('powerup'); MT.banner((MT.WEAPONS[d.kind] || {}).name || d.kind, '#2ee6ff', 1.4); },
  pwrexp(d) { MT.sfx('pwrexp', { vol: .5 }); },
  'bomb-pickup'(d) { MT.sfx('powerup'); },
  encore(d) { MT.sfx('oneup'); MT.banner('ENCORE!', '#ffcc33', 2); if (MT.chatter() !== 'off') MT.say('LANCE', MT.TEXT.encore, { prio: 3 }); },
  flash(d) { if (MT.G && MT.G.settings.reduceMotion !== true) MT.G.flash('#ffffff', .15, .5); },
  cash(d) { if (d.v >= 1000) MT.sfx('cash', { vol: .5 }); else MT.sfx('cash', { vol: .25 }); },
  'pick-cash'(d) { },
  prize(d) { MT.sfx('prize'); MT.banner('YOU WON: ' + d.prize[0] + '! $' + d.prize[1].toLocaleString('en-US'), '#ff8ad8', 3); MT.say('PENNY', MT.fill(MT.TEXT.prize, { PRIZE: d.prize[0] }), { prio: 2 }); MT.say('PENNY', d.prize[2], { prio: 2 }); },
  key(d) { MT.sfx('key'); MT.banner('GOLDEN KEY ' + d.n + '/9', '#ffcc33', 2.2); if (d.n === 1) MT.say('LANCE', MT.TEXT.key[0], { prio: 3 }); else if (d.n === 2) MT.say('LANCE', MT.TEXT.key[1], { prio: 3 }); },
  prime(d) { MT.sfx('sting'); MT.banner('PRIME TIME!', '#ff2e88', 2.6); MT.lineFrom('prime', 3); MT.babble.crowd('cheer', 1); MT.layer('prime', .9, .3); },
  'prime-end'(d) { MT.layer('prime', 0, .4); },
  stunt(d) { MT.banner('WE\'RE LOSING VIEWERS!', '#ff8a4a', 2.4); MT.lineFrom('stunt', 2); MT.sfx('klaxon', { vol: .6 }); },
  clear(d) { MT.sfx('sting'); MT.banner('ROOM CLEAR!', '#ffcc33', 2); MT.lineFrom('roomClear', 2); MT.babble.crowd('applause', .8); },
  exits(d) { MT.sfx('door'); MT.say('ANNC', MT.TEXT.hints.exit, { prio: 1 }); },
  leave(d) { MT.sfx('door'); },
  hurry(d) { MT.say('LANCE', MT.TEXT.hurry, { prio: 2 }); MT.sfx('klaxon', { vol: .4 }); },
  door(d) { MT.sfx('door', { vol: .4 }); },
  'door-open'(d) { MT.sfx('klaxon', { vol: .25 }); MT.sfx('door', { vol: .2 }); },
  telegraph(d) { const k = d.kind; if (k === 'goon') MT.sfx('goon', { vol: .25 }); else if (k === 'popper') MT.sfx('fuse'); else if (k === 'mime') MT.sfx('mime'); else if (k === 'disco') MT.sfx('disco'); else if (k === 'tank') MT.sfx('shell', { vol: .2 }); else if (k === 'brute') MT.sfx('roar'); else if (k === 'snake') MT.sfx('snake', { vol: .4 }); else if (k === 'heckler') MT.sfx('splat', { vol: .15 }); },
  'tank-fire'(d) { MT.sfx('tank'); },
  hop(d) { MT.sfx('hop', { vol: .2 }); },
  splat(d) { MT.sfx('splat', { vol: .4 }); },
  pop(d) { MT.sfx('pop', { vol: .4 }); },
  boom(d) { MT.sfx('boom', { vol: .3 }); },
  wallhit(d) { MT.sfx('crash'); MT.sfx('stomp'); },
  'vent-tele'(d) { MT.sfx('vent', { vol: .15 }); },
  'vent-fire'(d) { MT.sfx('vent', { vol: .4 }); },
  'conveyor-warn'(d) { MT.sfx('klaxon', { vol: .3 }); MT.banner('BELTS REVERSING!', '#ffb020', 1.2); },
  'wheel-click'(d) { MT.sfx('wheel', { vol: .35 }); },
  laser(d) { MT.sfx('laser', { vol: .2 }); },
  segment(d) { MT.sfx('snap'); },
  crate(d) { MT.sfx('pop'); MT.sfx('cash', { vol: .4 }); },
  lock(d) { MT.sfx('crash', { vol: .3 }); },
  vault(d) { MT.sfx('prize'); MT.banner('THE SAFE IS OPEN!', '#ffcc33', 2.4); },
  'key-rise'(d) { MT.sfx('key'); },
  'cage-open'(d) { MT.sfx('sting'); MT.banner('THE CAGE IS UP!', '#ffcc33', 1.8); },
  steal(d) { MT.banner(MT.TEXT.steal, '#ffcc33', 2.2); MT.sfx('oneup', { vol: .5 }); },
  'boss-dies'(d) { MT.sfx('crash'); MT.sfx('boom'); MT.babble.crowd('cheer', 1); },
  'boss-line'(d) { MT.bossLine(d.key, d); },
  'boss-intro-done'(d) { },
  'network-rise'(d) { MT.sfx('static'); },
  'lance-robot'(d) { MT.sfx('sting'); MT.say('ANNC', 'LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!', { prio: 4 }); },
  commercial(d) { MT.music('commercial'); MT.babble.crowd('laugh', .5); },
  'wave'(d) { },
  statuette(d) { MT.sfx('prize'); },
  'telegraph-boss'(d) { },
  'bomb'(d) { },
  'segment-done'(d) { },
  'pick-capsule'(d) { }
};
MT.killSfx = k => ({ goon: 'bash', clapbot: 'clap', popper: 'pop', mime: 'pfft', disco: 'disco', discoBig: 'disco', heckler: 'splat', tank: 'boom', snake: 'snap', brute: 'roar', hecklerKing: 'key' })[k] || 'pop';
// the event rate limit: a line from a pool at most once every 6 s (§5.12); the pool never repeats until it runs out
MT.chatter = () => (MT.G && MT.G.settings.chatter) || 'normal';
MT.lineFrom = (key, prio, vars = {}) => {
  if (MT.chatter() === 'off' || (MT.chatter() === 'less' && prio < 3)) return;
  if (MT.G && MT.G.time - MT.lastLineAt < 6 && prio < 3) return;
  const list = MT.TEXT[key] || [];
  const text = Array.isArray(list) ? MT.pick_unique(key, list) : list;
  if (!text) return;
  MT.lastLineAt = MT.G ? MT.G.time : 0;
  MT.say('LANCE', MT.fill(text, vars), { prio });
};
MT.bossLine = (key, d) => {
  const B = MT.TEXT.bossLine;
  const map = { 'mashy-intro': ['MASHY', MT.TEXT.bossIntro.mashy[2]], 'mashy-phase3': ['LANCE', B.mashyP3], 'wheel-intro': ['LANCE', MT.TEXT.bossIntro.wheel[0]], 'wheel-loose': ['LANCE', B.wheelLoose],
    'wheel-seg': ['LANCE', (d && d.name) + '!'], 'lance-intro': ['LANCE', MT.TEXT.bossIntro.lance[0]], 'lance-break': ['LANCE', B.lanceBreak], 'lance-down': ['LANCE', B.lanceDown],
    'network-intro': ['NETWORK', B.networkIntro], 'network-down': ['NETWORK', B.networkDown] };
  const e = map[key]; if (e) MT.say(e[0], e[1], { prio: 4, voice: e[0] === 'NETWORK' ? 'network' : e[0] === 'MASHY' ? 'mashy' : 'lance' });
};
MT.reactTo = (ev) => { const f = MT.react[ev.type]; if (f) { try { f(ev.data, ev); } catch (err) { if (MT.G) MT.G.fail('react ' + ev.type, err); } } };

/* ---------- the run: created at START THE SHOW; the flow of the whole game is run from here ---------- */
MT.startRun = (o) => {
  const run = MT.run = MT.newRun(o);
  MT.seedAll(run.seed);
  run.players = [];
  for (const slot of o.slots) run.players.push({ slot, c: null });
  return run;
};
MT.makeContestants = (run, W0) => {
  for (const p of run.players) if (!p.c) { p.c = new Contestant(W0 || { diff: run.diff }, p.slot, { lives: run.diff.lives, hp: run.diff.hp }); p.c.input = p.input; p.c.netRemote = !!p.remote; }
  return run.players.map(p => p.c);
};
MT.stillIn = (run) => run.players.some(p => p.c && p.c.state !== 'out');
MT.allOut = (run) => run.players.length > 0 && run.players.every(p => p.c && p.c.state === 'out');

// how many contestants are still in, and the roster for a room's walk-in
MT.roster = (run) => run.players.map(p => p.c).filter(c => c && c.state !== 'out');

/* ---------- the play scene ---------- */
MT.PLAY = { W: null, flow: null, paused: false, cutting: false, hintsSeen: {}, overlayOn: false, mapCard: null, card: null, stageName: '' };
MT.setRoom = (W) => { MT.PLAY.W = W; };
// a drop-in during a run: the next free slot, a contestant that cable-drops in by the entry door (§5.1)
MT.dropIn = (input) => {
  const run = MT.run, W = MT.PLAY.W; if (!run || !W || run.players.length >= 4) return;
  const slot = MT.G.players.indexOf(input); if (slot < 0 || run.players.some(p => p.slot === slot)) return;
  const c = new Contestant(W, slot, { lives: run.diff.lives, hp: run.diff.hp, cash: 0 });
  c.input = input; c.W = W; const d = W.dropPoint(slot); c.x = d[0]; c.y = d[1]; c.state = 'drop'; c.dropZ = 70;
  run.players.push({ slot, input, c }); W.players.push(c); MT.banner(c.name + ' DROPS IN', c.color, 2); MT.sfx('respawn');
};

// one tick of the play scene: the intents, the world step, the rigs and the event queue
MT.playStep = (G, dt) => {
  const S = MT.PLAY, W = S.W, run = MT.run; if (!W || !run) return;
  if (MT.dev && MT.dev.open && MT.dev.freeze && !MT.dev.frameStep) return;
  MT.dev && (MT.dev.frameStep = false);
  if (S.cutting || S.holdWorld) return;
  const players = G.players, cheats = (run && run.cheats) || {};
  // each contestant's intent from its own input (its own pad or half-keyboard)
  for (const c of W.players) {
    c.infiniteBombs = !!cheats.infinite; if (cheats.infinite) c.bombs = Math.max(c.bombs, 3);
    if (cheats.autopilot && c === W.players[0]) { c.intent = MT.bot(c, W); continue; }
    if (c.netRemote) { c.intent = MT.netRemoteIntent(c); continue; }   // another copy's player: its last intent, run by the host
    if (c.bot) { c.intent = MT.bot(c, W); continue; }
    const I = c.input || G.input;
    if (!I) { c.intent = null; continue; }
    c.intent = MT.intentFrom(I, c, G, W);
    if (MT.NET.on && MT.netOverlay.open && c.slot === MT.NET.me) c.intent = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  }
  const wdt = dt * (G.timeScale || 1);
  W.step(wdt);
  // the rigs, from this step's state (their draw reads them)
  if (!MT.cfg.skipRigs) {
    for (const c of W.players) if (c.rig) c.rig.update(wdt, c.rsState);
    for (const e of W.enemies) if (e.alive && !e.rig && MT.RIGS[e.kind] && MT.RIGS[e.kind].kind !== 'custom') e.rig = MT.makeRig(MT.RIGS[e.kind]);
    for (const e of W.enemies) if (e.rig) e.rig.update(wdt, { x: e.x, y: e.y, z: e.z || 0, vx: e.vx || 0, vy: e.vy || 0, facing: e.face || 0, hurt: e.flash > 0, pose: e.wind > 0 ? 'cheer' : undefined, flip: undefined });
  }
  if (W.boss && W.boss.alive) W.boss.step(wdt, W);
  else if (W.boss && W.boss.dying > 0) W.boss.step(wdt, W);
  // events go to the reaction table
  const ev = W.evq; W.evq = [];
  for (const e of ev) { MT.reactTo(e); if (MT.NET.on && MT.NET.host) MT.netEvent(e); }
  if (MT.NET.on && MT.NET.host) MT.netHostStep(G, W, run, dt);
};
MT.cfg = { skipRigs: false };

// the boss room: the boss joins the World's step and its parts take the shots (bossDone ends the room)
World.prototype.bossDone = function (boss) {
  this.bossOver = true; this.phase = 'bossdone'; this.phaseT = 0; this.emit('boss-dead', { boss: boss.kind });
};
World.prototype.stepBossHazards = function (dt) {
  for (const b of (this.beams || [])) {
    if (b.vertical) { if (b.tele === undefined) b.tele = b.t; b.tele -= dt; if (b.tele <= 0) { b.life = (b.life || 1) - dt; for (const c of this.players) if (c.inPlay && Math.abs(c.x - b.x) < 10 && !(b.hit && b.hit.has(c))) { (b.hit || (b.hit = new Set())).add(c); this.hurtPlayer(c, 1, { x: b.x, y: 120 }); } } if (b.life <= 0) b.dead = true; continue; }
    if (b.t !== undefined && b.a === undefined) continue;
    b.active = (b.t || 0) > .8;
    if (b.active) for (const c of this.players) { if (!c.inPlay) continue; const a = Math.atan2(c.y - b.y0, c.x - b.x0); let da = a - b.a; da = Math.atan2(Math.sin(da), Math.cos(da)); const d = MT.dist(c.x, c.y, b.x0, b.y0); if (Math.abs(da) < .08 && d < 300 && !(b.hitAt && b.hitAt.get(c) > this.time - .5)) { (b.hitAt || (b.hitAt = new Map())).set(c, this.time); this.hurtPlayer(c, 1, { x: b.x0, y: b.y0 }); } }
  }
  if (this.beams) this.beams = this.beams.filter(b => !b.dead);
  if (this.spots) for (const s of this.spots) { s.t += dt; s.a = s.a + Math.sin(s.t * 2) * .02; for (const c of this.players) { if (!c.inPlay) continue; const a = Math.atan2(c.y - s.y, c.x - s.x); let da = a - s.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .4 && MT.dist(c.x, c.y, s.x, s.y) < 170) { c.spotT = (c.spotT || 0) + dt; if (c.spotT >= .4) { c.spotT = 0; this.hurtPlayer(c, 1, { x: s.x, y: s.y }); } } else c.spotT = 0; } }
};
