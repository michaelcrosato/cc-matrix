// The simulation, system by system (PLAN 8.4), headless.
import { boot, suite } from './lib.mjs';
const T = 16, mid = c => (c + .5) * T;
export default function () {
  const S = suite('sim');
  let t = boot();
  const { api, game, D } = t;
  const W = () => D.world(), go = (floor, classes = ['berserker'], o = {}) => {
    api.startRun(classes.map((c, i) => Object.assign({ seat: i, cls: c, input: i === 0 && o.input ? t.I : null }, o.hero || {})), o.run || {});
    game.go('play', { floor: api.FLOOR_ORDER.indexOf(floor), card: false }, { fade: 0 }); game.advance(.05);
    for (const h of W().heroes) h.inv = 0;
    if (o.clear) { for (const m of W().monsters) m.dead = true; for (const g of W().gens) g.dead = true; game.advance(.02); }
    return W();
  };
  const hero = (i = 0) => W().heroes[i], clean = () => { for (const m of W().monsters) m.dead = true; W().monsters.length = 0; };

  // ---- boot and the front end ----
  S.check('the title waits', t.snap().scene === 'title');
  game.advance(9.5);
  S.check('no attract mode before 10 s', t.snap().scene === 'title');
  game.advance(1.2);
  S.check('10 s idle starts the attract mode', t.snap().scene === 'attract', t.snap().scene);
  game.advance(2);
  S.check('the attract mode plays a floor with four bots', W() && W().role === 'attract' && W().heroes.length === 4 && W().heroes.every(h => h.bot));
  t.tap('left'); game.advance(.6);
  S.check('any input returns to the title', t.snap().scene === 'title', t.snap().scene);
  S.check('the input that ended the demo is used up (no menu opened)', !game.scene.menu, game.scene.menu);
  t.tap('confirm'); game.advance(.1); t.tap('down'); game.advance(.1); t.tap('confirm'); game.advance(.6);
  S.check('the menu moves with keys and picks with confirm', t.snap().scene === 'howto', t.snap().scene);
  t.tap('cancel'); game.advance(.6);
  S.check('back returns to the menu', t.snap().scene === 'title' && game.scene.menu === true);

  // ---- heroes ----
  go('f1', ['berserker'], { clear: true, input: true });
  let h = hero(), x0 = h.x;
  t.hold('right'); game.advance(2); t.hold('right', false); game.advance(.05);
  S.check('a hero walks', h.x > x0 + 60, [x0, h.x]);
  S.check('walls stop a hero', h.x < 9 * T, h.x);
  const shotsIn = (cls, secs) => { go('f1', [cls], { clear: true }); const H = hero(); H.intent.aim = 0; let n = 0; const fire = W().shots.fire.bind(W().shots); W().shots.fire = b => { n++; return fire(b); }; for (let i = 0; i < secs * 120; i++) { H.intent.fire = true; H.intent.aim = 0; game.advance(1 / 120); } H.intent.fire = false; return n; };
  const nb = shotsIn('berserker', 3), nr = shotsIn('ranger', 3);
  S.check('fire rates by class (Berserker 0.34 s, Ranger 0.15 s)', nb >= 7 && nb <= 10 && nr >= 17 && nr <= 22, [nb, nr]);
  go('f1', ['berserker'], { clear: true }); h = hero();
  const g1 = api.spawnMonster('gnasher', h.x + 40, h.y, 1), g2 = api.spawnMonster('gnasher', h.x + 60, h.y, 1); g1.asleep = g2.asleep = true; W().flow; game.settings.set('aimAssist', 'off');
  h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false; game.advance(.6);
  S.check('the Berserker\'s axe passes through one foe into the next', g1.dead && g2.dead, [g1.hp, g2.hp]);
  go('f1', ['hexer'], { clear: true }); h = hero();
  const a1 = api.spawnMonster('gnasher', h.x + 50, h.y, 3), a2 = api.spawnMonster('gnasher', h.x + 58, h.y + 6, 3); a1.asleep = a2.asleep = true;
  h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false; game.advance(.5);
  S.check('the Hexer\'s hex splashes the next foe', a1.hp === 4 && a2.hp === 5, [a1.hp, a2.hp]);
  go('f1', ['shieldmaiden'], { clear: true }); h = hero();
  const close = api.spawnMonster('gnasher', h.x + 12, h.y, 3); close.asleep = true; let fired = 0; const f0 = W().shots.fire.bind(W().shots); W().shots.fire = b => { fired++; return f0(b); };
  h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false; game.advance(.5);
  S.check('smart melee: up close the hero strikes instead of throwing', fired === 0 && close.hp < 6, [fired, close.hp]);
  clean(); const ghost = api.spawnMonster('ghost', h.x + 12, h.y, 1); ghost.asleep = true; game.advance(.3); fired = 0; h.cool = 0;
  h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false;
  S.check('ghosts can\'t be struck: the hero throws point-blank', fired === 1, fired);
  go('f1', ['ranger'], { clear: true }); h = hero(); x0 = h.x;
  h.intent.move = [1, 0]; h.intent.plant = true; game.advance(.5); h.intent.plant = false;
  S.check('plant stops the hero', Math.abs(h.x - x0) < .5, [x0, h.x]);
  go('f1', ['ranger'], { clear: true, input: true }); h = hero();
  x0 = h.x; t.I.press('KeyD'); t.I.press('Space'); game.advance(.5); t.I.release('KeyD'); t.I.release('Space'); game.advance(.05);
  S.check('keyboard-only firing plants (the hero turns but stands)', Math.abs(h.x - x0) < .5 && Math.abs(h.facing) < .2, [x0, h.x, h.facing]);

  // ---- life force ----
  go('f1', ['berserker'], { clear: true }); h = hero(); let hp0 = h.hp; game.advance(10);
  S.check('10 s on a floor costs 10 x drain', Math.abs(hp0 - h.hp - 10) < .3, hp0 - h.hp);
  game.go('play', { floor: 0, card: true }, { fade: 0 }); game.advance(.05); h = hero(); hp0 = h.hp; game.advance(2);
  S.check('no drain on a floor card', game.scene.state === 'card' && h.hp === hp0, [game.scene.state, hp0, h.hp]);
  go('f1', ['berserker'], { clear: true }); h = hero(); hp0 = h.hp; game.pause('player'); game.advance(3); game.resume();
  S.check('no drain while paused', h.hp === hp0);
  const eat = (type) => { const it = api.addItem(type, h.x, h.y); const before = h.hp; game.advance(.02); return [Math.round(h.hp - before), it.gone]; };
  S.check('a roast heals 100, a loaf 50', eat('roast')[0] === 100 && eat('loaf')[0] === 50);
  const st = api.addItem('stew', h.x, h.y); game.advance(.05);
  S.check('spoiled stew: -50 and queasy', st.gone && h.queasy > 0);
  const sx0 = h.x; h.intent.move = [1, 0]; game.advance(.5); const queasyDist = h.x - sx0; h.intent.move = [0, 0]; h.queasy = 0; const sx1 = h.x; h.intent.move = [-1, 0]; game.advance(.5); h.intent.move = [0, 0];
  S.check('queasy slows a hero (x0.6)', Math.abs(queasyDist - 62 * .6 * .5) < 2, queasyDist);
  go('f1', ['berserker'], { clear: true }); h = hero(); h.x = mid(3); h.y = mid(5);
  const cider = api.addItem('cider', mid(8), mid(5)); h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false;
  for (let i = 0; i < 40 && !cider.gone; i++) game.advance(.05); game.advance(1.5);
  S.check('shooting the cider destroys it; the Gaunt names the culprit', cider.gone && (api.NARR.lastKey === 'shot_cider' || api.NARR.queue.some(q => q.key === 'shot_cider')), [cider.gone, api.NARR.lastKey, api.NARR.queue.map(q => q.key)]);
  h.keys = 9; const k10 = api.addItem('key', h.x, h.y); game.advance(.05);
  S.check('carry limits: a tenth key stays on the floor', !k10.gone && h.keys === 9);

  // ---- magic ----
  go('f1', ['shieldmaiden'], { clear: true }); h = hero(); h.flasks = 1;
  const inside = api.spawnMonster('gnasher', h.x + 30, h.y, 3), far = api.spawnMonster('gnasher', h.x + 600, h.y, 3); inside.asleep = far.asleep = true;
  api.useMagic(h, [12, 8]); game.advance(.05);
  S.check('a flask strikes what is on screen and nothing beyond', inside.dead && !far.dead && h.flasks === 0, [inside.hp, far.hp]);
  const tithe = api.spawnMonster('tithe', h.x + 40, h.y, 1); tithe.asleep = true;
  api.damage(tithe, 50, { by: h, kind: 'shot' });
  S.check('the Tithe shrugs off shots', !tithe.dead);
  h.flasks = 1; api.useMagic(h, [12, 8]); game.advance(.05);
  S.check('the Tithe dies to magic', tithe.dead);
  go('f1', ['hexer'], { clear: true }); h = hero(); h.x = mid(3); h.y = mid(5);
  const nearFlask = api.spawnMonster('gnasher', mid(9), mid(6), 3), farOne = api.spawnMonster('gnasher', mid(3), mid(9), 3); nearFlask.asleep = farOne.asleep = true;
  api.addItem('flask', mid(8), mid(5)); h.cool = 0; h.intent.aim = 0; h.intent.fire = true; game.advance(.05); h.intent.fire = false; game.advance(1);
  S.check('a shot flask goes off at half power within 80', nearFlask.hp < 6 && farOne.hp === 6, [nearFlask.hp, farOne.hp]);

  // ---- monsters ----
  go('f1', ['berserker'], { clear: true }); h = hero();
  const r3 = api.spawnMonster('gnasher', h.x + 100, h.y, 3); r3.asleep = true;
  api.damage(r3, 2, { by: h, kind: 'shot' });
  S.check('a wounded rank-3 monster drops to rank 2', r3.rank === 2 && r3.hp === 4);
  const sc0 = h.score; api.damage(r3, 9, { by: h, kind: 'shot' });
  S.check('kills score by the rank it spawned at', h.score - sc0 === 30, h.score - sc0);
  clean(); h.inv = 0; const hp1 = h.hp, gh = api.spawnMonster('ghost', h.x + 30, h.y, 3); game.advance(1.5);
  S.check('a ghost flies in, bites (rank damage x armor) and vanishes', gh.dead && Math.abs(hp1 - h.hp - 1.5 - 30 * .75) < 1, [gh.dead, hp1 - h.hp]);
  clean(); h.inv = 0; const gn = api.spawnMonster('gnasher', h.x + 14, h.y, 1); let wound = false, hit = false; const hp2 = h.hp;
  for (let i = 0; i < 120; i++) { game.advance(1 / 120); if (gn.state === 'wind') wound = true; if (h.hp < hp2 - 1.5 && !hit) { hit = true; S.check('a gnasher winds up before it hits', wound); } }
  S.check('a gnasher\'s club lands', hit);
  clean(); const lb = api.spawnMonster('lobber', h.x + 40, h.y, 1); game.advance(.6);
  S.check('a pot-lobber flees when a hero is close', Math.hypot(lb.x - h.x, lb.y - h.y) > 48, Math.hypot(lb.x - h.x, lb.y - h.y));
  clean(); h.x = mid(4); h.y = mid(4); const lb2 = api.spawnMonster('lobber', mid(14), mid(4), 3); lb2.cool = 0; let lobbed = false;
  for (let i = 0; i < 400 && !lobbed; i++) { game.advance(1 / 120); lobbed = W().eshots.list.some(b => b.kind === 'crock'); }
  S.check('a pot-lobber lobs a crock with a landing mark', lobbed && W().eshots.list.some(b => b.kind === 'crock' && b.lx !== undefined));
  clean(); h.x = mid(2); h.y = mid(17); const imp = api.spawnMonster('imp', mid(14), mid(17), 2); imp.cool = 0; imp.asleep = false; let spat = false;
  for (let i = 0; i < 360 && !spat; i++) { game.advance(1 / 120); spat = imp.state === 'spit' || W().eshots.list.some(b => b.kind === 'fireball'); }
  clean(); W().eshots.list.length = 0; h.x = mid(14); h.y = mid(17); const imp2 = api.spawnMonster('imp', mid(25), mid(3), 2); imp2.cool = 0; imp2.asleep = false; let spat2 = false;
  for (let i = 0; i < 60; i++) { game.advance(1 / 60); if (imp2.state === 'spit' && !W().map.los(imp2.x, imp2.y, h.x, h.y)) spat2 = true; }
  S.check('a cinder imp spits only with sight', spat && !spat2);
  clean(); const fr = api.spawnMonster('fryar', h.x + 80, h.y, 2); fr.asleep = false; fr.hidden = true; fr.visT = 0;
  api.damage(fr, 5, { by: h, kind: 'shot' });
  S.check('an unseen fryar can\'t be hurt', fr.hp === 6, fr.hp);
  // snatchers: flask first, then key, then the amulet; it runs; killed, it drops what it took
  go('f6', ['berserker'], { clear: true }); h = hero(); h.flasks = 1; h.keys = 1; h.inv = 0;
  const sn = api.spawnMonster('snatcher', h.x + 12, h.y, 1); game.advance(.4);
  S.check('a snatcher steals a flask first', sn.loot && sn.loot.type === 'flask' && h.flasks === 0 && h.keys === 1, sn.loot);
  const sx = sn.x; game.advance(.5);
  S.check('then it runs for the edge', Math.hypot(sn.x - h.x, sn.y - h.y) > Math.hypot(sx - h.x, sn.y - h.y) - 1 || sn.dead);
  api.damage(sn, 9, { by: h, kind: 'shot' }); game.advance(.05);
  S.check('killed, it drops what it stole', W().items.some(i => i.type === 'flask' && !i.gone && i.dropped));
  const sn2 = api.spawnMonster('snatcher', h.x + 12, h.y, 1); sn2.escape = { x: h.x + 30, y: h.y }; h.flasks = 0; h.keys = 2; game.advance(.4);
  S.check('with no flask it takes a key', sn2.loot && sn2.loot.type === 'key' && h.keys === 1, sn2.loot);
  for (let i = 0; i < 300 && !sn2.dead; i++) game.advance(1 / 60);
  S.check('a snatcher that reaches its exit escapes with the loot', sn2.dead && !W().items.some(i => i.type === 'key' && i.dropped && !i.gone));
  // the Tithe: at most 200 a hero, then it is paid
  go('f5', ['berserker'], { clear: true }); h = hero(); h.hp = 900; h.inv = 0;
  const ti = api.spawnMonster('tithe', h.x + 10, h.y, 1); for (let i = 0; i < 600 && !ti.dead; i++) game.advance(1 / 120);
  S.check('the Tithe drains 200 and is paid', ti.dead && Math.abs(900 - h.hp - 200 - 5) < 8, 900 - h.hp);
  // the Dinner Bell
  go('f5', ['berserker', 'ranger'], { clear: true }); const [b1, b2] = W().heroes; const bell = W().bell;
  b1.x = bell.x; b1.y = bell.y + 6; b2.x = bell.x + 80; b2.y = bell.y; game.advance(.1);
  S.check('ringing the Bell puts a hero ON THE MENU', bell.target === b1 && b1.onMenu > 0);
  const m1 = api.spawnMonster('gnasher', b2.x + 30, b2.y, 1); m1.asleep = false; game.advance(.5);
  S.check('every monster goes for the hero on the menu', Math.hypot(m1.x - b1.x, m1.y - b1.y) < Math.hypot(b2.x + 30 - b1.x, b2.y - b1.y), [m1.x, m1.y]);
  b2.x = b1.x + 8; b2.y = b1.y; game.advance(.1);
  S.check('touching a friend passes it on', bell.target === b2, bell.target && bell.target.cls);
  game.advance(13);
  S.check('the Bell lets go after 12 s', !bell.target);
  // amulets: Veil and Stench
  go('f1', ['berserker'], { clear: true }); h = hero(); h.amulet = { type: 'stench', t: 20 };
  const st1 = api.spawnMonster('gnasher', h.x + 30, h.y, 1); st1.asleep = false; const d0 = Math.hypot(st1.x - h.x, st1.y - h.y); game.advance(.5);
  S.check('Stench: monsters flee', Math.hypot(st1.x - h.x, st1.y - h.y) > d0, [d0, Math.hypot(st1.x - h.x, st1.y - h.y)]);
  h.amulet = { type: 'veil', t: 20 }; clean(); const v1 = api.spawnMonster('gnasher', h.x + 60, h.y, 1); v1.asleep = false; game.advance(1);
  S.check('Veil: monsters lose track', Math.hypot(v1.x - h.x, v1.y - h.y) > 30);

  // ---- generators ----
  go('f1', ['berserker']); h = hero();
  const urn = W().gens[0]; h.x = mid(3); h.y = mid(3); urn.t = 0; const kids = urn.children; game.advance(.1);
  const farGen = W().gens.find(g => Math.hypot(g.x - h.x, g.y - h.y) > 15 * T);
  if (farGen) { const c0 = farGen.children; farGen.t = 0; game.advance(.5); S.check('generators breed only near a hero', farGen.children === c0); }
  h.x = urn.x - 40; h.y = urn.y; urn.t = 0; game.advance(.05);
  S.check('a generator near a hero breeds', urn.children > kids || W().monsters.some(m => m.gen === urn));
  const gr = urn.rank, ph0 = h.score; api.damage(urn, 4, { by: h, kind: 'shot' });
  S.check('a generator loses a rank every 4 hp', urn.rank === Math.max(1, gr - 1) || urn.dead);
  api.damage(urn, 99, { by: h, kind: 'shot' });
  S.check('a broken generator scores 25 a rank', urn.dead && h.score - ph0 >= 25, h.score - ph0);
  game.settings.set('tune_maxMonsters', 20); go('f1', ['berserker']); h = hero(); h.x = W().gens[0].x - 30; h.y = W().gens[0].y; for (const m of W().monsters) m.asleep = true;
  for (let i = 0; i < 25; i++) api.spawnMonster('ghost', h.x + 200, h.y, 1).asleep = true;
  const cnt = W().monsters.filter(m => !m.dead).length; W().gens[0].t = 0; game.advance(.1);
  S.check('generators stop at the floor\'s cap', W().monsters.filter(m => !m.dead).length <= cnt);
  api.resetTuning();
  S.check('reset tuning restores every default', Object.keys(api.TUNE_DEFAULTS).every(k => api.TUNE[k] === api.TUNE_DEFAULTS[k]));

  // ---- level features ----
  go('f1', ['berserker'], { clear: true }); h = hero(); const door = W().doors[0];
  h.keys = 1; h.x = mid(door.cells[0][0] - 1); h.y = mid(door.cells[0][1]); h.intent.move = [1, 0]; game.advance(.4); h.intent.move = [0, 0];
  S.check('a key opens a whole run of doors and is used', door.open && door.cells.every(([cx, cy]) => !W().map.cell(cx, cy)) && h.keys === 0);
  go('f3', ['berserker'], { clear: true }); h = hero(); h.x = mid(19.5); h.y = mid(5); h.facing = -Math.PI / 2;
  for (let i = 0; i < 30 && W().map.cell(20, 3); i++) { h.cool = 0; h.intent.aim = -Math.PI / 2; h.intent.fire = true; game.advance(.05); h.intent.fire = false; game.advance(.3); }
  S.check('shots break a cracked wall', !W().map.cell(20, 3));
  go('f6', ['berserker'], { clear: true }); h = hero(); h.x = mid(4); h.y = mid(7); h.intent.move = [-1, 0]; game.advance(.6); h.intent.move = [0, 0];
  S.check('a fake wall gives way when pushed (it was lying)', !W().map.cell(3, 7));
  go('f3', ['berserker'], { clear: true }); h = hero(); const tw = W().p.trapWalls['^'][0];
  h.x = mid(41); h.y = mid(6); game.advance(.1);
  S.check('a plate drops its trap walls', !W().map.cell(tw.cx, tw.cy));
  go('f4', ['berserker'], { clear: true }); h = hero(); const pad = W().pads[0], pair = W().pads[1]; h.x = mid(pad.cx); h.y = mid(pad.cy); game.advance(.05);
  S.check('a transporter carries a hero to its pair', Math.abs(h.x - mid(pair.cx)) < 2 && Math.abs(h.y - mid(pair.cy)) < 2, [h.x, h.y, pair]);
  go('f5', ['berserker'], { clear: true }); h = hero(); const rn = W().runes[0]; h.x = mid(rn.cx); h.y = mid(rn.cy); game.advance(.05);
  S.check('a stun rune stuns', h.stun > 0);
  const fx = W().beams[0]; let sawOn = false, sawOff = false; for (let i = 0; i < 60; i++) { game.advance(.1); if (fx.on) sawOn = true; else sawOff = true; }
  S.check('force fields cycle on and off', sawOn && sawOff);
  const c0 = fx.cells[0], fm = api.spawnMonster('gnasher', mid(c0.cx), mid(c0.cy), 3); fm.asleep = true; W().t = 2.05 - fx.phase; game.advance(.05);
  S.check('a force field hurts monsters too', fm.hp < 6 || fm.dead, fm.hp);
  go('f7', ['berserker'], { clear: true }); h = hero(); const sp = W().spikes[0]; let ups = 0, downs = 0; for (let i = 0; i < 40; i++) { game.advance(.05); if (sp.up) ups++; else downs++; }
  S.check('spikes cycle', ups > 0 && downs > 0);
  go('f1', ['berserker'], { clear: true }); h = hero(); const stair = W().stairs[0]; h.x = mid(stair.cx); h.y = mid(stair.cy); game.advance(.5);
  S.check('the stairs need a moment', !W().done);
  game.advance(.6);
  S.check('...then everyone goes down', W().done && W().done.to === 1);
  go('f2', ['berserker'], { clear: true }); h = hero(); const skip = W().stairs.find(s => s.to === 4); h.x = mid(skip.cx); h.y = mid(skip.cy); game.advance(1.2);
  S.check('skip stairs go to their floor', W().done && api.FLOOR_ORDER[W().done.to] === 'f4', W().done);
  go('f2', ['berserker'], { clear: true }); h = hero(); h.hp = 5000; W().t = 179.9; game.advance(.2);
  S.check('at 3:00 every door opens', W().doors.every(d => d.open) && W().impatience === 2);
  W().t = 239.95; game.advance(.1);
  S.check('at 4:00 every wall is a stair', W().impatience === 3);
  h.x = mid(5); h.y = mid(6); h.intent.move = [0, 1]; game.advance(1.2); h.intent.move = [0, 0];
  S.check('pushing into a wall then goes down', !!W().done);
  go('f5', ['berserker'], { clear: true }); h = hero(); h.hp = 5000; W().t = 119.95; game.advance(.1);
  S.check('the Tithe arrives at 2:00 from floor 5', W().monsters.some(m => m.type === 'tithe' && !m.dead));
  go('t1', ['berserker']); W().treasure.t = .05; game.advance(.1);
  S.check('the hoard clock ends the treasure room', W().done && W().done.why === 'hoard');

  // ---- co-op ----
  go('f1', ['berserker'], { clear: true, input: true });
  game.allowJoin({ max: 4, onJoin: q => api.joinMidPlay(q) }); const p2 = game.addPlayer({ keys: 'right' }); game.advance(.05);
  S.check('a second player joins on the keyboard\'s right half', W().heroes.length === 2 && W().heroes[1].input === p2);
  S.check('classes stay unique', new Set(W().heroes.map(q => q.cls)).size === 2, W().heroes.map(q => q.cls));
  game.advance(.1); const [q1, q2] = W().heroes; q1.x = mid(2); q2.x = mid(3); q1.y = q2.y = mid(15); const qx = q2.x;
  p2.hold('right'); game.advance(2); p2.hold('right', false);
  S.check('the leash keeps a hero on the shared screen', q2.x - q1.x < 520 && q2.x > qx, [q1.x, q2.x, W().leash]);
  api.dropOut(2); game.advance(.05);
  S.check('dropping out removes the hero', W().heroes.length === 1 && game.players.length === 1);
  go('f5', ['berserker', 'ranger'], { clear: true }); game.settings.set('allyStun', true); let [s1, s2] = W().heroes; s1.x = mid(28); s1.y = mid(20); s2.x = mid(31); s2.y = mid(20);
  s1.cool = 0; s1.intent.aim = 0; s1.intent.fire = true; game.advance(.05); s1.intent.fire = false; game.advance(.3);
  S.check('no ally stun before floor 6', s2.stun === 0);
  go('f6', ['berserker', 'ranger'], { clear: true }); [s1, s2] = W().heroes; s1.x = mid(20); s1.y = mid(12); s2.x = mid(23); s2.y = mid(12);
  s1.cool = 0; s1.intent.aim = 0; s1.intent.fire = true; game.advance(.05); s1.intent.fire = false; game.advance(.2);
  S.check('from floor 6, shots stun a friend', s2.stun > 0 || W().heroes[1].stun > 0);

  // ---- death, rising, continue, game over ----
  go('f1', ['berserker', 'hexer'], { clear: true, input: true }); const [d1, d2] = W().heroes; d1.hp = 1; game.advance(1.2);
  S.check('a hero falls at 0', !d1.alive && api.NARR.queue.concat(api.NARR.caption ? [api.NARR.caption] : []).length >= 0);
  const sc1 = d1.score; d1.input.tap('fire'); game.advance(.1);
  S.check('fire rises again beside a friend, with the starting health', d1.alive && Math.abs(d1.x - d2.x) < 20 && d1.hp > 600 && d1.continues === 1 && d1.score === sc1);
  d1.hp = 1; d2.hp = 1; game.advance(1.2);
  S.check('everyone down: CONTINUE?', game.scene.state === 'continue');
  t.tap('fire'); game.advance(.1);
  S.check('fire continues: everyone rises', game.scene.state === 'play' && W().heroes.every(q => q.alive));
  W().heroes.forEach(q => { q.hp = 1; q.score = 5000 + q.seat; }); game.advance(1.2); game.advance(10.5);
  S.check('no answer: game over', t.snap().scene === 'over', t.snap().scene);
  game.advance(4);
  S.check('each qualifying player names themself', !!api.CAB.entry);
  for (let k = 0; k < 2; k++) { for (let i = 0; i < 3; i++) { api.CAB.entry && api.CAB.entry.input.tap('confirm'); game.advance(.05); } game.advance(.3); }
  S.check('the table keeps both, with their fools', api.CAB.table(api.TABLE_MODE).filter(e => e.cls).length >= 2, api.CAB.table(api.TABLE_MODE));
  go('f1', ['berserker'], { clear: true }); game.settings.set('cheat_god', true); hero().score = 99999; game.settings.set('cheat_god', false);
  const nb0 = api.CAB.table(api.TABLE_MODE).length; game.go('over', {}, { fade: 0 }); game.advance(5);
  S.check('a run with cheats is kept off the table', !api.CAB.entry && api.CAB.table(api.TABLE_MODE).length === nb0);

  // ---- the boss ----
  go('f9', ['berserker', 'hexer']); const K = W().boss; h = hero(); h.x = K.x; h.y = K.y + 100; game.advance(.5);
  S.check('King Famish wakes when a hero comes near', K.phase === 1);
  api.damage(K, K.max * .31, { by: h, kind: 'shot' }); game.advance(.1);
  S.check('phase 2 at 70%', K.phase === 2);
  const plat = W().items.find(i => i.type === 'platter' && !i.gone); K.state = 'eat'; K.stateT = 0; K.eating = plat; const khp = K.hp; game.advance(1);
  S.check('eating heals him', K.hp > khp + K.max * .03, [khp, K.hp]);
  api.damage({ ...plat }, 0); plat.gone = true; game.advance(.1);
  S.check('a platter gone stops the meal', K.state !== 'eat');
  api.damage(K, K.hp - K.max * .34, { by: h, kind: 'shot' }); game.advance(.1);
  S.check('phase 3 at 35%: the ribcage opens, the Tithe comes', K.phase === 3 && K.open && W().monsters.some(m => m.type === 'tithe'));
  const before = K.hp; K.facing = Math.PI / 2; W().shots.fire({ x: K.x, y: K.y + 20, z: 12, vx: 0, vy: -200, r: 3, dmg: 2, life: 1, team: 'hero', pierce: true, left: 1, owner: 0, kind: 'axe' }); game.advance(.15);
  S.check('shots into the open ribcage deal double', Math.round(before - K.hp) === 4, before - K.hp);
  const sc2 = h.score; api.damage(K, 9999, { by: h, kind: 'shot' }); game.advance(3);
  S.check('the King falls: 10,000 points and the gauntlet drops', K.dead && h.score - sc2 >= 10000 && W().items.some(i => i.type === 'gauntlet' && !i.gone));
  const gnt = W().items.find(i => i.type === 'gauntlet'); h.x = gnt.x; h.y = gnt.y; const sc3 = h.score; game.advance(.1);
  S.check('the gauntlet: +5000, then the ending', h.score - sc3 === 5000 && W().done && W().done.to === 'ending');
  game.advance(1.5);
  S.check('the ending plays', t.snap().scene === 'ending', t.snap().scene);
  game.advance(17); game.advance(1);
  S.check('then the credits', t.snap().scene === 'credits', t.snap().scene);
  game.advance(27); t.tap('confirm'); game.advance(1);
  S.check('Descent II: the same party goes down again, harder', t.snap().scene === 'play' && W().descent === 2 && W().index === 0, [t.snap().scene, W() && W().descent]);

  // ---- settings, dev tools, narrator ----
  t = boot(); const G2 = t.game, I2 = t.I;
  S.check('button symbols: PlayStation by default', G2.settings.glyphs === 'playstation');
  I2.press('Pad7'); I2.release('Pad7'); G2.advance(.02);
  S.check('PlayStation prompts on a pad: R2 fires, Cross confirms', I2.label('fire') === 'R2' && I2.label('confirm') === '✕', [I2.label('fire'), I2.label('confirm')]);
  G2.settings.set('glyphs', 'xbox');
  S.check('the Xbox option shows RT and A', I2.label('fire') === 'RT' && I2.label('confirm') === 'A', [I2.label('fire'), I2.label('confirm')]);
  I2.press('KeyW'); I2.release('KeyW'); G2.advance(.02);
  S.check('keyboard prompts name keys and mouse buttons', I2.label('fire', 'keyboard') === 'Space' && I2.label('fire', 'mouse') === 'Left click', [I2.label('fire', 'keyboard'), I2.label('fire', 'mouse')]);
  G2.settings.set('tune_drain', 3); t.api.startRun([{ cls: 'ranger', input: I2 }]); G2.go('play', { floor: 0, card: false }, { fade: 0 }); G2.advance(.05);
  const hz = t.W().heroes[0], hz0 = hz.hp; for (const m of t.W().monsters) m.dead = true; G2.advance(2);
  S.check('a Dev slider changes the game at once', Math.abs(hz0 - hz.hp - 6) < .3, hz0 - hz.hp);
  G2.settings.set('cheat_god', true); hz.hp = 50; G2.advance(2);
  S.check('God mode: no drain, no damage', hz.hp === 50);
  G2.settings.set('cheat_god', false); t.api.resetTuning();
  for (const id of t.api.FLOOR_ORDER) { t.api.warpTo(t.api.FLOOR_ORDER.indexOf(id)); G2.advance(.6); if (t.W().id !== id) { S.check('warp reaches ' + id, false, t.W().id); break; } }
  S.check('warp reaches every floor', t.W().id === 'f9');
  const N = t.api.NARR; N.queue.length = 0; N.caption = null; N.last = -9;
  t.api.bus.emit('say', { key: 'tip_door', prio: 1 }); t.api.bus.emit('say', { key: 'eaten', prio: 3 }); G2.advance(.05);
  S.check('the narrator: critical lines first', N.lastKey === 'eaten', N.lastKey);
  N.caption = null; N.last = -9; G2.advance(.05); N.caption = null; N.last = -9; t.api.bus.emit('say', { key: 'tip_door', prio: 1 }); G2.advance(.05);
  S.check('...and a tip is heard once per game', N.lastKey !== 'tip_door' || N.count >= 1);

  // ---- engine changes (ENGINE-CHANGES.md) ----
  const E = t.E, map = new E.TileMap({ rows: ['########', '#......#', '#.##...#', '#......#', '########'], legend: { '#': 1, '.': 0 }, types: { 1: { h: 24 } } });
  const F1 = new E.FlowField(map), A1 = new E.FlowField(map), B1 = new E.FlowField(map);
  F1.updateMany([[mid(1), mid(1)], [mid(6), mid(3)]]); A1.update(mid(1), mid(1)); B1.update(mid(6), mid(3));
  let okMin = true; for (let i = 0; i < map.w * map.h; i++) if (F1.d[i] < 1e9 && F1.d[i] !== Math.min(A1.d[i], B1.d[i])) okMin = false;
  S.check('E1: a field to several points is the nearest of each', okMin && F1.src[1 * map.w + 1] === 0 && F1.src[3 * map.w + 6] === 1);
  const bul = new E.Bullets(G2, { plane: 'ground' }), bb = bul.fire({ x: mid(5), y: mid(1), z: 10, vx: 200, vy: 0, life: 1, bounce: 1 }); let wallAt = null; const bd = bul.fire({ x: mid(5), y: mid(3), z: 10, vx: 200, vy: 0, life: 1, onWall: (b, cx, cy) => { wallAt = [cx, cy]; } });
  for (let i = 0; i < 30; i++) bul.update(1 / 60, map);
  S.check('E3: a bouncing bullet comes back off a wall', bb.vx < 0 && !bb.dead);
  S.check('E3: onWall names the wall cell', wallAt && wallAt[0] === 7 && wallAt[1] === 3, wallAt);
  const pads = [{ connected: true, index: 0, id: 'pad', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }];
  t.ctx.navigator.getGamepads = () => pads; const I3 = G2.input;
  pads[0].buttons[8].pressed = true; G2.advance(.02); pads[0].buttons[9].pressed = true; G2.advance(.02);
  S.check('E4: Options is ignored while Create is held', !I3.down('pause'));
  pads[0].buttons[8].pressed = pads[0].buttons[9].pressed = false; G2.advance(.05); t.ctx.navigator.getGamepads = () => [];
  const humans = ['axe', 'bow', 'club', 'pan', 'scythe', 'fork'].map(w => { const r = new E.Humanoid({ weapon: w, offhand: 'shield', hat: { style: 'horned' } }); r.update(.1, { x: 0, y: 0, z: 0, vx: 10, vy: 0, facing: 0, attack: E.move('overhead', .5) }); return r.tip()[0]; });
  S.check('E2: the new weapons, the shield and the horned helmet pose', humans.every(v => isFinite(v)) && !t.warnings.some(w => /is not built in/.test(w)));
  const sh = G2.shell; let ok6 = true; try { sh.show('dev-tuning', { rows: ['tune_drain', '#Head', 'tune_hoardTime'] }); sh.hide(); } catch (e) { ok6 = false; }
  S.check('E6: a screen of setting rows', ok6 && typeof sh.scale === 'function');
  const cab = new E.Arcade(G2, { id: 'e7' }), p2b = G2.addPlayer({ keys: 'right' }); let named = null; cab.enter(10, '', n => { named = n; }, { input: p2b, extra: { cls: 'ranger' } });
  for (let i = 0; i < 3; i++) { p2b.tap('confirm'); G2.advance(1 / 120); cab.update(1 / 120); G2.advance(1 / 120); }
  S.check('E7: player 2 types their own initials; extra fields kept', named !== null && cab.table('')[0].cls === 'ranger', [named, cab.table('')]);
  S.check('E8: audio.bus answers headless without error', G2.audio.bus('voice') === null && G2.settings.voices === .9);
  S.check('E9: the keyboard\'s left half keeps the mouse', G2.input.map.fire.includes('Mouse0'), G2.input.map.fire);
  S.check('no errors', !t.errors().length, t.errors().slice(0, 4));
  return S;
}
