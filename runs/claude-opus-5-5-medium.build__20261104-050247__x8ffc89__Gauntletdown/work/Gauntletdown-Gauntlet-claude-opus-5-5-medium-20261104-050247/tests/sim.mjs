// Sim suite: each system, headless, through game.debug and scripted input.
import { boot } from './lib.mjs';
export default async function (check) {
  const t = boot({ quiet: true }), { D, game, I } = t, step = t.step, S = () => t.snap();
  const W = () => D.W, H = (i = 0) => D.PARTY[i];
  const place = (h, x, y) => { h.x = x; h.y = y; h.body.x = x; h.body.y = y; };
  const arena = (rows, meta) => { D.arena(rows, meta); step(.05); for (const p of D.PARTY) p.inv = 0; return W(); };
  const party = (classes) => { D.start(classes, { seed: 9, noCard: true }); step(.6); };
  const clear = () => { W().mons.length = 0; W().gens.length = 0; W().items.length = 0; W().shots.length = 0; };
  step(.3);
  // ---- boot, title, attract ----
  check('boot: the title waits', S().scene === 'title', S().scene);
  step(10.2);
  check('10 s idle starts the attract mode', S().attract, JSON.stringify(S()).slice(0, 200));
  step(3);
  check('the attract mode plays a floor with four bots', S().scene === 'play' && S().heroes.length === 4, S().scene);
  I.tap('fire'); step(.4);
  check('any input returns to the title', S().scene === 'title' && !S().attract, S().scene);
  I.tap('confirm'); step(.5);
  check('the first menu item opens the class select', S().scene === 'select', S().scene);
  step(.6); I.tap('fire'); step(1.5);
  check('locking a class starts the descent (floor card)', S().scene === 'card' && S().floor === 'f1', S().scene + ' ' + S().floor);
  check('no drain on the floor card', S().heroes[0].hp === 700, S().heroes[0].hp);
  step(1); I.tap('fire'); step(1);
  check('the card gives way to play', S().scene === 'play', S().scene);
  // ---- heroes: movement, walls, drain ----
  party(['berserker']); arena(); clear();
  let h = H(); place(h, 100, 100);
  I.hold('right'); step(1); I.hold('right', false);
  check('moving right moves the hero east', h.x > 150, h.x);
  place(h, 40, 100); I.hold('left'); step(1); I.hold('left', false);
  check('walls stop the hero', h.x >= 16 + 4, h.x);
  const hp0 = h.hp; step(10);
  check('10 s on a floor costs 10 life force', Math.abs((hp0 - h.hp) - 10) <= 1, hp0 - h.hp);
  // ---- fire rates per class ----
  const shotsIn = (cls) => { party([cls]); arena(); clear(); const h0 = H(); place(h0, 100, 150); h0.aim = 0; const seen = new Set(); I.hold('fire'); for (let k = 0; k < 120; k++) { step(1 / 120); for (const s of W().shots) if (s.team === 'hero') seen.add(s.id); } I.hold('fire', false); step(.1); return seen.size; };
  const rates = { berserker: shotsIn('berserker'), ranger: shotsIn('ranger') };
  check('the Ranger throws faster than the Berserker', rates.ranger > rates.berserker * 1.8, JSON.stringify(rates));
  check('the Berserker throws about 3 a second', rates.berserker >= 2 && rates.berserker <= 4, rates.berserker);
  // pierce: an axe passes one gnasher into another
  party(['berserker']); arena(); clear(); h = H(); place(h, 60, 150); h.aim = 0; h.face = 0;
  const g1 = D.spawn('gnasher', 120, 150, 3), g2 = D.spawn('gnasher', 150, 150, 3); g1.wake = g2.wake = true;
  D.CHEAT.freeze = true; I.tap('fire'); step(.8); D.CHEAT.freeze = false;
  check('the Berserker\'s axe pierces one foe', g1.hp < 6 && g2.hp < 6, g1.hp + ' ' + g2.hp);
  // hexer splash
  party(['hexer']); arena(); clear(); h = H(); place(h, 60, 150); h.aim = 0; h.face = 0;
  const s1 = D.spawn('gnasher', 130, 150, 3), s2 = D.spawn('gnasher', 131, 157, 3);
  D.CHEAT.freeze = true; I.tap('fire'); step(.8); D.CHEAT.freeze = false;
  check('the Hexer\'s bolt splashes a neighbour', s2.hp < 6, s2.hp);
  // smart melee
  party(['berserker']); arena(); clear(); h = H(); place(h, 100, 150); h.aim = 0; h.face = 0;
  const near = D.spawn('gnasher', 116, 150, 3); D.CHEAT.freeze = true;
  I.tap('fire'); step(.05);
  check('fire next to a gnasher swings in melee', !!h.swing && W().shots.length === 0, JSON.stringify({ sw: !!h.swing, shots: W().shots.length }));
  step(.4); check('the swing hurts it (5 damage)', near.dead || near.hp <= 1, near.hp);
  clear(); h.swing = null; const gh = D.spawn('ghost', 114, 150, 1); step(.5); I.tap('fire'); step(.03);
  check('ghosts are never struck in melee: a throw instead', W().shots.length > 0 || gh.dead, W().shots.length);
  D.CHEAT.freeze = false;
  // plant
  clear(); place(h, 100, 150); I.hold('plant'); I.hold('right'); step(.5); I.hold('right', false); I.hold('plant', false);
  check('Plant holds the hero still', Math.abs(h.x - 100) < 2, h.x);
  // ---- food, stew, cider, limits ----
  clear(); place(h, 100, 150); h.hp = 300; D.drop('roast', 110, 150); step(.3);
  check('a roast heals 100', h.hp >= 395 && h.hp <= 401, h.hp);
  h.hp = 300; D.drop('stew', 120, 150); place(h, 112, 150); step(.3);
  check('spoiled stew hurts and makes the hero queasy', h.hp < 260 && h.queasy > 0, h.hp + ' ' + h.queasy);
  const q0 = h.x; I.hold('right'); step(.5); I.hold('right', false);
  check('queasy heroes move slower', h.x - q0 < 62 * .5 * .8, h.x - q0);
  h.queasy = 0; clear(); place(h, 60, 200); h.aim = 0; h.face = 0; D.drop('cider', 120, 200); I.hold('plant'); I.tap('fire'); step(.8); I.hold('plant', false);
  check('a shot destroys the cider', !W().items.some(i => i.kind === 'cider'), W().items.map(i => i.kind).join());
  check('the Gaunt names the culprit', D.NARR.log.includes('shot_cider') || D.NARR.q.some(l => l.key === 'shot_cider') || (D.NARR.cur && D.NARR.cur.key === 'shot_cider'), D.NARR.log.slice(-5).join());
  clear(); h.keys = 9; place(h, 100, 100); D.drop('key', 106, 100); step(.3);
  check('keys stop at 9: the tenth stays on the floor', h.keys === 9 && W().items.some(i => i.kind === 'key'), h.keys);
  // ---- magic ----
  clear(); h.flasks = 1; place(h, 200, 150); W().cam.x = 200; W().cam.y = 150; W().viewHalf = [150, 90];
  const inside = D.spawn('gnasher', 260, 150, 2), outside = D.spawn('gnasher', 600, 150, 1);
  game.debug.W.mons.forEach(m => m.wake = true);
  I.tap('magic'); step(.1);
  check('a Blast Flask strikes monsters on screen', inside.dead, inside.hp);
  check('...and not those off screen', !outside.dead, outside.hp);
  check('a flask was used', h.flasks === 0, h.flasks);
  clear(); const ti = D.spawn('tithe', 300, 150, 1); h.aim = 0; place(h, 200, 150); I.hold('fire'); step(.6); I.hold('fire', false);
  check('shots clink off the Tithe', !ti.dead, ti.hp);
  h.flasks = 1; I.tap('magic'); step(.1);
  check('magic kills the Tithe', ti.dead);
  clear(); h.score = 0; const fm = D.spawn('gnasher', 240, 210, 2); D.drop('flask', 230, 200); place(h, 150, 200); h.aim = 0; h.face = 0; D.CHEAT.freeze = true; I.hold('plant'); I.tap('fire'); step(.6); I.hold('plant', false); D.CHEAT.freeze = false;
  check('a shot flask detonates', fm.dead || fm.hp < 4, fm.hp);
  // ---- monsters ----
  clear(); const rk = D.spawn('gnasher', 300, 300, 3); rk.wake = true;
  game.debug.W; rk.hp -= 0; place(h, 100, 100);
  rk.hp = 6; D.CHEAT.freeze = true; h.aim = Math.atan2(300 - 100, 300 - 100); place(h, 250, 250); h.aim = Math.atan2(50, 50);
  W().mons.forEach(m => { m.wake = true; });
  // hurt it directly through a shot hit
  W().shots.push({ id: 1, team: 'hero', owner: h, kind: 'arrow', x: 296, y: 296, z: 12, vx: 100, vy: 100, vz: 0, r: 3, dmg: 2, life: .2, pierce: 0, bounce: 0, splash: 0, hits: new Set(), rot: 0 });
  step(.05); D.CHEAT.freeze = false;
  check('a wounded rank-3 monster drops to rank 2', rk.rank === 2, rk.rank + ' hp ' + rk.hp);
  clear(); place(h, 100, 100); const hpg = h.hp; const gg = D.spawn('ghost', 130, 100, 3); step(1.5);
  check('a ghost flies into the hero, hurts, and vanishes', gg.dead && h.hp < hpg - 10, (hpg - h.hp) + ' dead ' + gg.dead);
  clear(); place(h, 100, 100); const gn = D.spawn('gnasher', 118, 100, 1); step(.1);
  check('a gnasher winds up before it strikes', gn.wind > 0 || gn.atk > 0, gn.wind);
  clear(); place(h, 100, 150); const lb = D.spawn('lobber', 130, 150, 1); step(2);
  check('a lobber backs off inside 56', Math.hypot(lb.x - h.x, lb.y - h.y) > 45, Math.hypot(lb.x - h.x, lb.y - h.y));
  step(2.5);
  check('a lobber lobs a crock', W().shots.some(s => s.kind === 'crock') || h.hp < 700, W().shots.map(s => s.kind).join());
  // imp sight: a wall between
  const wallRows = ['########################################', '#@@.................#...................#', ...Array.from({ length: 16 }, () => '#...................#...................#'), '#...................#...................#', '########################################'];
  arena(wallRows); clear(); h = H(); place(h, 100, 150); const im = D.spawn('imp', 420, 150, 1); im.wake = true; im.fireCD = 0;
  let fired = false; for (let k = 0; k < 120; k++) { step(1 / 60); if (W().shots.some(s => s.kind === 'fireball')) fired = true; }
  check('an imp never spits through a wall', !fired);
  arena(); clear(); h = H(); place(h, 100, 150); const im2 = D.spawn('imp', 200, 150, 1); im2.wake = true; im2.fireCD = 0; fired = false; for (let k = 0; k < 180; k++) { step(1 / 60); if (W().shots.some(s => s.kind === 'fireball')) fired = true; }
  check('an imp with sight spits fireballs', fired);
  clear(); place(h, 100, 150); const fr = D.spawn('fryar', 200, 150, 1); fr.vis = 0; fr.visT = 5; const fh = fr.hp;
  W().shots.push({ id: 2, team: 'hero', owner: h, kind: 'arrow', x: 196, y: 150, z: 12, vx: 100, vy: 0, vz: 0, r: 3, dmg: 2, life: .2, pierce: 0, bounce: 0, splash: 0, hits: new Set(), rot: 0 }); step(.05);
  check('a fryar cannot be hit while it is invisible', fr.hp === fh, fr.hp);
  clear(); h.flasks = 2; h.keys = 1; place(h, 100, 150); const sn = D.spawn('snatcher', 120, 150, 1); step(.6);
  check('a snatcher steals a flask first', h.flasks === 1 && sn.carry && sn.carry.kind === 'flask', h.flasks + ' ' + JSON.stringify(sn.carry));
  D.CHEAT.onehit = true; W().shots.push({ id: 3, team: 'hero', owner: h, kind: 'arrow', x: sn.x - 2, y: sn.y, z: 12, vx: 100, vy: 0, vz: 0, r: 3, dmg: 2, life: .2, pierce: 0, bounce: 0, splash: 0, hits: new Set(), rot: 0 }); step(.05); D.CHEAT.onehit = false;
  check('a killed snatcher drops what it stole', sn.dead && W().items.some(i => i.kind === 'flask'), sn.dead);
  clear(); h.hp = 700; place(h, 100, 150); const tt = D.spawn('tithe', 104, 150, 1); step(6);
  check('the Tithe drains at most 200 and vanishes', tt.dead && h.hp >= 700 - 200 - 8, h.hp);
  // ---- the Dinner Bell ----
  party(['berserker', 'ranger']); arena(); clear(); place(H(0), 100, 100); place(H(1), 250, 180);
  D.drop('bell', 106, 100); step(.2);
  check('ringing the Bell puts that hero on the menu', W().bell && W().bell.pi === 0 && H(0).menu > 0, JSON.stringify(W().bell));
  const bm = D.spawn('gnasher', 270, 180, 1); bm.wake = true; step(1);
  check('...and monsters ignore the others for them', bm.x < 262, bm.x + ',' + bm.y);
  place(H(1), H(0).x + 6, H(0).y); step(.2);
  check('touching a friend passes the Bell on', W().bell && W().bell.pi === 1, JSON.stringify(W().bell));
  // ---- generators ----
  party(['berserker']); arena(); clear(); h = H(); place(h, 100, 100);
  W().gens.push({ id: 900, type: 'den', x: 200, y: 150, r: 7, rank: 2, rank0: 2, hp: 8, t: .1, kids: 0, shake: 0 }); step(3);
  check('a generator spawns near a hero', W().mons.length >= 1, W().mons.length);
  place(h, 600, 280); W().mons.length = 0; W().gens[0].kids = 0; W().gens[0].t = .1; step(2);
  check('...and not when the heroes are far', W().mons.length === 0, W().mons.length);
  const sc0 = h.score; for (let k = 0; k < 3; k++) { W().shots.push({ id: 10 + k, team: 'hero', owner: h, kind: 'axe', x: 195, y: 150, z: 12, vx: 100, vy: 0, vz: 0, r: 3, dmg: 3, life: .2, pierce: 0, bounce: 0, splash: 0, hits: new Set(), rot: 0 }); step(.05); }
  check('generators take damage and die with points', !W().gens.length && h.score > sc0, W().gens.length + ' ' + (h.score - sc0));
  // ---- features on real floors ----
  party(['berserker']); D.gotoFloor(0, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H();
  const dg = W().doorGroups[0]; h.keys = 1; place(h, dg.cells[0].x - 14, dg.cells[0].y); I.hold('right'); step(.4); I.hold('right', false);
  check('a key opens the whole door run', W().doorGroups[0].open && h.keys === 0 && W().map.cell(dg.cells[1].cx, dg.cells[1].cy) === 0, JSON.stringify({ open: dg.open, keys: h.keys }));
  const ex = W().exits[0]; place(h, ex.x, ex.y); step(.5);
  check('standing on the stairs needs a hold', !W().done, JSON.stringify(W().done));
  step(.7); check('holding on the stairs descends', !!W().done, '');
  step(1); check('the next floor follows (Root Cellar)', S().floor === 'f2', S().floor);
  // skip stairs on floor 2
  game.go('play', {}, { fade: 0 }); step(.2); clear(); h = H(); const sk = W().exits.find(e => e.to); place(h, sk.x, sk.y); step(1.3); step(1);
  check('skip stairs go to their floor (4)', S().floor === 'f4', S().floor);
  // transporters (floor 4)
  game.go('play', {}, { fade: 0 }); step(.2); clear(); h = H(); const pad = W().pads[0], pair = W().pads[pad.pair]; place(h, pad.x, pad.y); step(.1);
  check('a transporter moves the hero to its pair', Math.hypot(h.x - pair.x, h.y - pair.y) < 4, h.x + ',' + h.y);
  // floor 3: cracked walls, plates and trap walls
  D.gotoFloor(2, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H();
  const cw = W().cracked[0]; place(h, cw.x - 40, cw.y); h.aim = 0; h.face = 0; I.hold('plant'); I.hold('fire'); step(2.5); I.hold('fire', false); I.hold('plant', false);
  check('shots break a cracked wall', W().map.cell(cw.cx, cw.cy) === 0, W().map.cell(cw.cx, cw.cy));
  const pl = W().plates[0], tw = W().p.trapT[0]; place(h, pl.x, pl.y); step(.1);
  check('a plate drops its trap walls', W().map.cell(tw.cx, tw.cy) === 0, W().map.cell(tw.cx, tw.cy));
  // floor 6: fake walls
  D.gotoFloor(6, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H();
  const fk = W().fakes[0]; place(h, fk.x - 14, fk.y); h.face = 0; I.hold('right'); step(.6); I.hold('right', false);
  check('a fake wall gives way when pushed', W().map.cell(fk.cx, fk.cy) === 0, W().map.cell(fk.cx, fk.cy));
  check('the Gaunt says the wall was lying', D.NARR.log.includes('tip_secret') || D.NARR.q.some(l => l.key === 'tip_secret') || (D.NARR.cur && D.NARR.cur.key === 'tip_secret') || D.NARR.tips.has('tip_secret'));
  // floor 5: runes, beams, the Tithe's coming
  D.gotoFloor(5, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H(); h.runeImm = 0;
  const ru = W().runes[0]; place(h, ru.x, ru.y); step(.05);
  check('a stun rune stuns', h.stun > 0, h.stun);
  const bm2 = W().beams[0]; h.stun = 0; h.runeImm = 9; h.inv = 0; place(h, bm2.x, bm2.y); const bh = h.hp; W().t = 0.1; step(.3);
  check('a force field hurts when it is on', h.hp < bh, bh - h.hp);
  W().t = D.TUNE.titheAt - .5; step(1);
  check('the Tithe arrives at 2:00 from floor 5', W().mons.some(m => m.type === 'tithe'), W().mons.map(m => m.type).join());
  // floor 7: spikes
  D.gotoFloor(8, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H(); const spk = W().spikes[0]; h.inv = 0; const sh0 = h.hp; place(h, spk.x, spk.y); step(1.8);
  check('spikes cycle and hurt', h.hp < sh0 - 5, sh0 - h.hp);
  // impatience
  D.gotoFloor(0, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; clear(); h = H(); place(h, 40, 40); W().t = D.TUNE.impatience - .2; step(.5);
  check('every door opens at 3:00', W().doorGroups.every(g => g.open), W().stage);
  W().t = D.TUNE.impatience + 60 - .1; step(.3);
  check('every wall is a stair at 4:00', W().stage === 3, W().stage);
  place(h, 30, 30); I.hold('up'); step(1.3); I.hold('up', false);
  check('pushing into a wall then descends', !!W().done, JSON.stringify(W().done));
  // the hoard clock
  D.gotoFloor(3, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0;
  check('a treasure room has a clock', W().hoard && W().hoard.t > 25, W().hoard && W().hoard.t);
  step(D.TUNE.hoardTime + .5);
  check('the hoard slams shut and everyone moves on', !!W().done || S().floor === 'f4', JSON.stringify(W().done));
  // ---- co-op ----
  party(['berserker']); arena(); const p2 = game.addPlayer({ keys: 'right' }); step(.1);
  check('a second keyboard player joins in play', D.PARTY.length === 2 && D.PARTY[1].joinPick, D.PARTY.length);
  p2.tap('fire'); step(.6); p2.tap('fire'); step(.1);
  check('...picks a free class and drops in', !D.PARTY[1].joinPick && D.PARTY[1].cls !== 'berserker', D.PARTY[1].cls);
  place(H(0), 60, 150); place(H(1), 60 + W().leash[0] * 2 - 6, 150); p2.hold('right'); step(.6); p2.hold('right', false);
  check('the leash keeps the party on one screen', Math.abs(H(1).x - H(0).x) <= W().leash[0] * 2 + 2, Math.abs(H(1).x - H(0).x) + ' / ' + W().leash[0] * 2);
  game.pausedBy = 2; const items = D.menuItems(); check('the pause menu offers Drop out (P2)', items.some(i => /Drop out/.test(i[0])), items.map(i => i[0]).join());
  items.find(i => /Drop out/.test(i[0]))[1](); step(.1);
  check('dropping out removes the hero', D.PARTY.length === 1, D.PARTY.length);
  // ---- death, rising, continue, game over ----
  party(['berserker', 'hexer']); arena(); clear(); D.PARTY[1].input = null;
  H(0).hp = 1; step(2.5);
  check('a hero at 0 falls', !H(0).alive, H(0).hp);
  I.tap('fire'); step(.1);
  check('Fire rises a fallen hero beside an ally, with a continue counted', H(0).alive && H(0).continues === 1 && H(0).hp >= 690, JSON.stringify({ a: H(0).alive, c: H(0).continues }));
  H(0).hp = 1; H(1).hp = 1; step(3.5);
  check('everyone down: the continue', S().scene === 'over', S().scene);
  step(10.5); step(3.2);
  check('no continue: game over, then initials for a qualifying score', S().scene === 'over' || S().scene === 'scores', S().scene);
  // ---- the boss ----
  party(['berserker']); D.gotoFloor(10, { card: false }); step(.6); for (const p of D.PARTY) p.inv = 0; h = H(); D.CHEAT.god = true; place(h, 350, 380);
  step(3);
  check('King Famish wakes after his intro', W().boss.intro <= 0, W().boss.intro);
  W().boss.hp = W().boss.maxHp * .69; step(.2);
  check('phase 2 at 70%', W().boss.phase === 2, W().boss.phase);
  const pl1 = W().items.find(i => i.kind === 'platter'); W().boss.state = 'eat'; W().boss.plate = pl1; W().boss.eatT = 2.5; const bhp = W().boss.hp; step(1);
  check('eating heals him', W().boss.hp > bhp, W().boss.hp - bhp);
  W().boss.hp = W().boss.maxHp * .3; W().boss.state = 'idle'; step(.2);
  check('phase 3 at 35%', W().boss.phase === 3, W().boss.phase);
  D.CHEAT.onehit = true; W().shots.push({ id: 77, team: 'hero', owner: h, kind: 'axe', x: W().boss.x - 4, y: W().boss.y, z: 12, vx: 100, vy: 0, vz: 0, r: 3, dmg: 3, life: .3, pierce: 0, bounce: 0, splash: 0, hits: new Set(), rot: 0 }); step(.1); D.CHEAT.onehit = false;
  check('the King falls', !W().boss.alive, W().boss.hp);
  const gl = W().items.find(i => i.kind === 'gauntlet');
  check('...and the Iron Gauntlet drops', !!gl);
  const scB = h.score; step(1.6); place(h, gl.x, gl.y); step(.3);
  check('taking the gauntlet scores 5000', h.score - scB >= 5000, h.score - scB);
  step(2); check('then the ending', S().scene === 'ending', S().scene);
  D.CHEAT.god = false;
  // ---- settings, glyphs, dev tools ----
  check('PlayStation symbols by default', game.settings.padGlyphs === 'playstation' && I.label('fire', 'gamepad') === 'R2', I.label('fire', 'gamepad'));
  game.settings.set('padGlyphs', 'xbox');
  check('the Xbox option shows RT and A', I.label('fire', 'gamepad') === 'RT' && I.label('confirm', 'gamepad') === 'A', I.label('fire', 'gamepad') + ' ' + I.label('confirm', 'gamepad'));
  game.settings.set('padGlyphs', 'playstation');
  check('the keyboard shows its own keys', I.label('fire', 'keyboard') === 'Space' && I.label('magic', 'keyboard') === 'Q', I.label('fire', 'keyboard'));
  party(['berserker']); arena(); D.openDev(); step(.05);
  check('Dev Tools open from the pause menu', S().dev, S().dev);
  D.DEV.page = 3; const rows = D.devRows(), drain = rows.find(r => r.label.startsWith('Life drain'));
  drain.set(3); h = H(); const dh = h.hp; D.DEV.open = false; step(2);
  check('a Dev slider changes the sim at once (drain 3/s)', Math.abs((dh - h.hp) - 6) <= 1, dh - h.hp);
  D.DEV.page = 3; D.devRows().find(r => r.label.startsWith('Reset')).act();
  check('Reset tuning restores every default', D.TUNE.drain === 1 && D.TUNE.startHealth === 700, D.TUNE.drain);
  D.DEV.page = 0; D.devRows()[0].set(true); const gh0 = h.hp; step(2);
  check('God mode stops the drain', h.hp === gh0, gh0 - h.hp);
  D.devRows()[0].set(false);
  check('a cheat marks the run (no high score)', S().cheated);
  // ---- narrator ----
  const N = D.NARR; N.reset(); N.enqueue('tip_food', 0, 1); N.enqueue('tip_food', 0, 1); 
  check('a tip plays once per game', N.q.filter(l => l.key === 'tip_food').length <= 1, N.q.length);
  N.reset(); N.enqueue('tip_ghost', -1, 1); N.update(.01); N.enqueue('eaten', 0, 3); N.update(.01);
  check('a critical line cuts a tip', N.cur && N.cur.key === 'eaten' || N.q[0] && N.q[0].key === 'eaten', N.cur && N.cur.key);
  // ---- the engine's new gear ----
  const E = t.E; let warned = false; const ow = t.ctx.console.warn; t.ctx.console.warn = (...a) => { if (/not built in/.test(a.join(' '))) warned = true; };
  for (const wp of ['axe', 'bow', 'club', 'pan', 'scythe', 'fork']) { const rg = new E.Humanoid({ weapon: wp, offhand: 'shield', hat: { style: 'horned' } }); rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); rg.tip(); }
  t.ctx.console.warn = ow;
  check('the new gear is built in (no warnings)', !warned && new E.Humanoid({ weapon: 'axe' }).o.weapon === 'axe');
  // ---- About and Credits: every section filled (Source Information 14 fields, 4 + 6 + 4 answers) ----
  const AB = D.ABOUT;
  check('About: credits, Source Information and the three feedback sections are filled', AB.credits.length >= 5 && AB.source.length === 14 && AB.testing.length === 4 && AB.engine.length === 6 && AB.prompt.length === 4 && [...AB.source, ...AB.testing, ...AB.engine, ...AB.prompt].every(l => l.length > 12), JSON.stringify([AB.source.length, AB.testing.length, AB.engine.length, AB.prompt.length]));
  check('no errors', !t.errors().length, t.errors().join(' | '));
}
