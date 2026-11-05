/* MASH TV — 15-attract: the attract mode (§12). After 10 s on the front end, a looping demo plays ten reels of the real game:
 * bot contestants with cheats (god mode, endless Showstoppers) that show as much of the show as they can. Any input
 * returns to the title. The bot is also what the tests drive. */

// the bot (§12): a potential field of enemies and foe bullets, pickups and the room centre; it aims and fires always
MT.bot = (c, W) => {
  const I = { move: [0, 0], aim: null, fire: true, slide: false, bomb: false, showboat: false, source: 'bot' };
  let fx = 0, fy = 0, target = null, bd = 1e9;
  for (const e of W.enemies) {
    if (!e.alive || !e.counted) continue;
    const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < bd) { bd = d; target = e; }
    if (d < 90) { const w = (90 - d) / 90 * 1.6; fx += dx / d * w; fy += dy / d * w; }
  }
  for (const s of W.fShots) { const d = MT.dist(s.x, s.y, c.x, c.y); if (d < 50) { fx += (c.x - s.x) / (d || 1) * (50 - d) / 50 * 2; fy += (c.y - s.y) / (d || 1) * (50 - d) / 50 * 2; } if (d < 14 && !c.slideCd) I.slide = c.slideCd <= 0; }
  for (const p of W.pickups) { if (!p.collected && p.kind !== 'key') { const d = MT.dist(p.x, p.y, c.x, c.y) || 1; if (d < 140) { const w = .6 * (p.val ? Math.log10(p.val + 10) : 1) / d * 10; fx += (p.x - c.x) / d * w; fy += (p.y - c.y) / d * w; } } }
  // the room centre pulls gently; the exit, when the room is clear
  if (W.phase === 'exit' && W.R.exits) { const d = Object.keys(W.R.exits)[0]; if (d) { const D = MT.DOORS[d]; fx += (D.x - c.x) * .02; fy += (D.y - c.y) * .02; } }
  else { fx += (184 - c.x) * .01; fy += (120 - c.y) * .01; }
  const L = Math.hypot(fx, fy) || 1, sp = Math.min(1, L);
  I.move = [fx / L * sp, fy / L * sp];
  const B = W.boss && W.boss.alive ? W.boss : null;
  if (B && (!target || bd > 120)) {   // the bot shoots the part with the least armour first (an arm before the body)
    const parts = B.parts.filter(p => p.alive && p.open !== false && p.armor >= .5 && p.hp > 0);
    const pt = parts.length ? parts.map(p => ({ p, d: MT.dist(c.x, c.y, B.x + p.ox, B.y + p.oy) })).sort((a, b) => a.d - b.d)[0].p : B.body || B.parts[0];
    I.aim = Math.atan2(B.y + pt.oy - c.y, B.x + pt.ox - c.x); I.fire = true;
  }
  else if (target) { I.aim = Math.atan2(target.y - c.y, target.x - c.x); I.fire = true; }
  const near = W.enemies.filter(e => e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 120).length;
  I.bomb = near >= 25 && c.bombs > 0;
  I.showboat = W.enemies.filter(e => e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 60).length >= 3 && c.hp >= c.maxHp && c.showCd <= 0;
  return I;
};

MT.REELS = [
  { kind: 'card', caption: 'TONIGHT ON MASH TV!', dur: 6, title: 'MASH TV', sub: 'LIVE FROM STUDIO 9', lines: [['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!']] },
  { kind: 'room', room: '1-1', dur: 18, caption: 'MASH \'EM!', weapon: 'spread' },
  { kind: 'room', room: '1-2', dur: 14, caption: 'CASH \'EM!', weapon: 'rockets' },
  { kind: 'boss', boss: 'mashy', room: '1-B', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', phase: 2 },
  { kind: 'room', room: '2-2', dur: 16, caption: 'PRIME TIME = 5x CASH!', weapon: 'popcorn', prime: true },
  { kind: 'boss', boss: 'wheel', room: '2-B', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!' },
  { kind: 'room', room: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', weapon: 'records' },
  { kind: 'boss', boss: 'lance', room: '3-B', dur: 16, caption: 'NOBODY CANCELS LANCE LUSTRE!' },
  { kind: 'card', caption: 'BIG PRIZES!', dur: 8, title: 'PRIZE RECAP', sub: 'PRIZES: A SELF-AWARE TOASTER $2,500 / A DRY-LAND JET SKI $8,000 / A SLIGHTLY HAUNTED ROBO-BUTLER $6,000', lines: [['PENNY', 'OOOH! A SELF-AWARE TOASTER!']] },
  { kind: 'table', caption: 'TOP EARNERS', dur: 6 }
];
MT.attract = { reel: -1, t: 0, W: null, c: null, caption: '' };
MT.attractReel = (G, i) => {
  const A = MT.attract, R = MT.REELS[i % MT.REELS.length];
  A.reel = i % MT.REELS.length; A.t = 0; A.caption = R.caption; A.W = null; A.c = null; A.cardSaid = false;
  if (R.kind === 'room' || R.kind === 'boss') {
    MT.seedAll(11 + i);
    const run = MT.run = MT.newRun({ mode: 'attract', diff: 'champion', seed: 11 + i });
    run.attract = true; run.ep = +R.room[0] || 1;
    const c = new Contestant({ diff: MT.DIFF.champion }, 0, { x: 184, y: 180, hp: 99, lives: 99, bombs: 9 });
    c.bot = true; c.input = null; c.infiniteBombs = true; c.hp = 99; c.maxHp = 99; c.weapon = { id: R.weapon || 'blaster', t: 60 };
    if (R.weapon === 'records') c.addons.records = { t: 60 }, c.makeRecords();
    if (R.weapon === 'popcorn' || R.weapon === 'spread' || R.weapon === 'rockets') c.weapon = { id: R.weapon, t: 60 };
    run.players = [{ slot: 0, input: null, c }];
    run.ratings.R = R.prime ? 99 : 40;
    const W = new World(run, R.room, { entry: 'S', players: [c] });
    c.W = W; c.walkT = .2;
    if (R.kind === 'boss') { W.boss = new MT.BOSS_CLASS[R.boss](W); W.phase = 'boss'; if (R.phase) { /* the mashy script runs phase 2 by its own clock */ } }
    else { W.noIntro = false; }
    A.W = W; A.c = c; A.run = run; A.reelDef = R; A.forcedDone = false;
    if (R.prime) W.ratingsAdd(100, 'prime');
  }
  if (R.kind === 'card') { A.reelDef = R; A.cardLines = R.lines || []; }
};
// the reels' forced moments (§12): the key at 10 s, Mashy's arms off, the wheel's segments, the Starmaker's cut to the Network, the announcer
MT.attractForce = (A, dt) => {
  const R = A.reelDef, W = A.W; if (!R || !W) return;
  if (R.kind === 'room' && R.room === '1-2' && A.t >= 10 && !A.forcedDone) { A.forcedDone = true; W.pickups.push(W.mkPickup('key', 184, 120, { persist: true })); }
  if (R.boss === 'mashy' && W.boss && !A.forcedDone && A.t >= 2) { A.forcedDone = true; const B = W.boss; B.parts[1].hp = 0; B.parts[1].alive = false; B.parts[2].hp = 0; B.parts[2].alive = false; B.armsLeft = 0; B.body2.armor = .5; }
  if (R.boss === 'wheel' && W.boss && !A.forcedDone) { A.forcedDone = true; W.boss.forcedSegs = ['JACKPOT', 'TOMATO TIME']; }
  if (R.boss === 'lance' && W.boss && A.t >= 8 && !A.forcedDone) { A.forcedDone = true; W.boss.podium.hp = 0; }
};
MT.scenes.attract = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() { MT.attract.reel = -1; MT.attractNext(MT.G); MT.music('theme', { fade: .3 }); MT.attractIdle = 0; },
  exit() { MT.run = null; MT.G.lights.enabled = false; },
  update(dt) {
    const G = MT.G, A = MT.attract;
    if ((G.players || [G.input]).some(p => p.anyPressed && p.anyPressed()) || MT.inputSerial !== (MT.attractSerial ?? MT.inputSerial)) { G.go('title', null, { fade: 0 }); return; }
    MT.attractSerial = MT.inputSerial;
    A.t += dt;
    if (A.W && A.reelDef) MT.attractForce(A, dt);
    if (A.W) { if (A.c) { A.c.invulnT = 5; A.c.hp = 99; A.c.bombs = 9; A.c.intent = MT.bot(A.c, A.W); } A.W.step(dt * 1); const ev = A.W.evq; A.W.evq = []; for (const e of ev) if (e.type === 'boss-line') MT.reactTo(e); if (A.W.boss && A.W.boss.alive) A.W.boss.step(dt, A.W); }
    if (A.W) A.W.evq.length = 0;
    if (A.t >= MT.REELS[A.reel].dur) MT.attractNext(G);
    const RC = MT.REELS[A.reel];
    if (RC && RC.kind === 'card' && !A.cardSaid) { A.cardSaid = true; for (const [w, t] of (RC.lines || [])) MT.say(w, t, { prio: 3 }); }
    MT.updateLines(dt); MT.updateBanners(dt);
    G.focus(184, 120, 0); MT.fitCamera(G);
  },
  draw(r) {
    const G = MT.G, A = MT.attract, R = MT.REELS[A.reel];
    if (A.W) { r.sky(['#0a0418', '#241040']); A.W.draw(r, {}); }
    else { r.sky(['#140a34', '#3a1c66']); }
    if (R && R.kind === 'card') r.overlay(g => { E.font.title(g, R.title, r.W / 2, r.H / 2 - 30, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, R.sub, r.W / 2, r.H / 2 + 10, '#fff7e8', { scale: 1, align: 'center' }); });
    if (R && R.kind === 'table') { r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.8)')); MT.cab.drawTable(r, 'show', 40, 'TOP EARNERS'); }
    r.overlay(g => { E.font.text(g, 'DEMO PLAY', 8, r.H - 30, '#ffcc33', { scale: 1, shadow: '#000' }); });
    if (A.caption) r.overlay(g => { E.ui.box(g, 20, r.H - 62, r.W - 40, 22, { bg: ['#1a0a30', '#0c0418'], border: '#ff2e88', alpha: .9 }); E.font.text(g, A.caption, r.W / 2, r.H - 56, '#fff7e8', { scale: 2, align: 'center', shadow: '#000' }); });
    if (Math.floor(G.time * 2) % 2) r.overlay(g => E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffffff', { scale: 1, align: 'center', shadow: '#000' }));
    if (A.W && A.W.id) MT.hud.bugs(r);
    if (MT.lineNow) MT.hud.lowerThird(r, {});
    MT.hud.banners(r);
  }
};
MT.attractNext = (G) => {
  MT.attract.reel = (MT.attract.reel + 1) % MT.REELS.length;
  MT.attractReel(G, MT.attract.reel);
};
