// Play suite: drives the real scenes with taps and time. Idle goes to the attract reel and back, a campaign's muster and
// seasons move on, and a battle played by taps reaches its result without an error.
export function run({ check, E }) {
  const game = E.current, I = game.input, snap = () => game.debug.snapshot();
  // a tap, then time for the step it lands in and the fade of any scene change it makes
  const tap = (a, n = 1) => { for (let k = 0; k < n; k++) { I.tap(a); game.advance(.6); } };
  game.debug.setTune('battleDamage', 1);
  game.go('title', {}); game.advance(.8);

  // idle for ten seconds: the attract reel runs, then any button brings the title back
  game.advance(11);
  check('idle on the title starts the attract reel', snap().scene === 'attract', String(snap().scene));
  game.advance(40);
  check('the reel keeps going without an error', snap().scene === 'attract' && snap().errors === 0, JSON.stringify([snap().scene, snap().errors]));
  tap('confirm');
  check('a button leaves the reel for the title', snap().scene === 'title', String(snap().scene));

  // a campaign: the realm, the tidings, one muster, the marches, the aftermath
  game.advance(1);
  game.debug.newCampaign({ humans: ['verdance'], seed: 21 });
  game.go('campaign', {}); game.advance(.8);
  check('the campaign opens on its tidings', snap().screen === 'tidings', String(snap().screen));
  tap('confirm');
  // the realm's opening event plays first: press through its lines (the first choice when one is offered)
  for (let k = 0; k < 60 && snap().scene === 'event'; k++) tap('confirm');
  game.advance(.8);
  check('after the tidings and the opening comes the muster', snap().screen === 'muster', String(snap().screen));
  const mana0 = snap().mana;
  tap('endTurn');
  game.advance(.5);
  for (let k = 0; k < 60 && snap().scene === 'event'; k++) tap('confirm');
  check('ending the muster resolves the marches into the aftermath', snap().screen === 'aftermath' || snap().scene === 'battle' || snap().scene === 'event', JSON.stringify([snap().screen, snap().scene]));
  check('the mana of the realm is still a number', typeof mana0 === 'number');
  check('no errors through the muster', snap().errors === 0, String(snap().errors));

  // a battle, played by taps: confirm picks a cell, confirm again chooses, confirm strikes the first foe
  const sim = game.debug.startBattle({ map: 'meadow', season: 'spring', seed: 9, sides: [
    { troops: [{ kind: 'knight', ref: 'oren', leader: true }, { kind: 'monster', ref: 'gleam-slime', form: 0 }] },
    { troops: [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'monster', ref: 'dusk-bat', form: 0 }] }] });
  game.advance(.3);
  check('a battle scene starts', snap().scene === 'battle', String(snap().scene));
  for (let k = 0; k < 900 && snap().scene === 'battle'; k++) {
    if (k % 3 === 0) I.tap('confirm');
    game.advance(.25);
  }
  check('a battle played by taps ends at its result', snap().scene !== 'battle' || (snap().battle && snap().battle.over), JSON.stringify(snap().battle && { over: snap().battle.over, bell: snap().battle.bell }));
  check('the battle left no error behind', snap().errors === 0, String(snap().errors));
  void sim;
}

// the target path: a foe placed beside the player's unit; the menu offers Attack, the target list picks it, and it strikes
export function runTargets({ check, E, G }) {
  const game = E.current, I = game.input;
  const sim = G.BattleSim.create({ map: 'meadow', season: 'spring', seed: 2, sides: [
    { troops: [{ kind: 'knight', ref: 'oren', leader: true }] }, { troops: [{ kind: 'knight', ref: 'shade', leader: true }] }] });
  const me = sim.s.units.find(u => u.side === 0), foe = sim.s.units.find(u => u.side === 1);
  const n = G.neighbours(me.q, me.r).find(c => sim.tile(G.key(c.q, c.r)) && sim.tile(G.key(c.q, c.r)).cost < Infinity);
  Object.assign(foe, { q: n.q, r: n.r });
  game.debug.setTune('battleDamage', 1);
  game.go('battle', { sim, playerSide: 0, onDone: () => {} });
  game.advance(.8);
  for (let k = 0; k < 600 && !(game.scene.cur && game.scene.cur() && game.scene.cur().side === 0 && game.scene.mode === 'move' && !game.scene.board.busy && !game.scene.board.queue.length); k++) game.advance(.25);
  const sc = game.scene;
  check('the player unit has the first move', sc.cur() && sc.cur().uid === me.uid, sc.cur() && sc.cur().name);
  // stand still (the cursor starts on the unit), open the menu, then pick Attack
  I.tap('confirm'); game.advance(.6);
  check('standing still opens the command menu', sc.mode === 'menu', sc.mode);
  const attackIdx = sc.menu.items.findIndex(i => i.key === 'attack');
  check('Attack is offered beside a foe', attackIdx >= 0 && !sc.menu.items[attackIdx].disabled);
  sc.menu.i = attackIdx;
  I.tap('confirm'); game.advance(.6);
  check('Attack opens the target list', sc.mode === 'target', sc.mode);
  check('the target list names the foe', sc.targets.items.length === 1 && sc.targets.items[0].key === G.key(foe.q, foe.r));
  I.tap('confirm'); game.advance(1.5);
  check('the strike lands on the foe', foe.hp < foe.maxHp || foe.dead, JSON.stringify([foe.hp, foe.maxHp]));
  check('the strike ends the turn', sc.cur() && sc.cur().uid !== me.uid || sim.s.over);
}

// a human march: oren marches on Thornpass, the battle asks Fight or Delegate, Delegate plays it and returns to the campaign
export function runMarch({ check, E, G }) {
  const game = E.current;
  const snap = () => game.debug.snapshot();
  game.go('title', {}); game.advance(1);
  game.debug.newCampaign({ humans: ['verdance'], seed: 31 });
  const cs = game.debug.campaign();
  game.go('campaign', {}); game.advance(.8);
  game.scene.phase = 'muster'; game.scene.enterPhase();
  const err = cs.do({ t: 'march', knight: 'oren', to: 'thornpass' }, 'verdance');
  check('a human can march on a neighbouring castle', err === null, String(err));
  game.scene.endMuster();
  game.advance(.8);
  // two rulers on the field trade their lines first (once per pair)
  for (let k = 0; k < 10 && snap().scene === 'event'; k++) { game.scene.finish(); game.advance(.8); }
  check('the march opens a battle', snap().scene === 'battle', snap().scene);
  check('the battle asks Fight or Delegate first', game.scene.phase === 'ask', String(game.scene.phase));
  // delegate each battle the march brings (a rival may march on Verdance as well); the campaign resumes after the last
  for (let k = 0; k < 6 && game.sceneName === 'battle' && game.scene.phase === 'ask'; k++) { game.scene.delegate(); game.advance(1.2); }
  game.advance(1.2);
  check('the battle hands its result back to the campaign', snap().scene === 'campaign' || snap().scene === 'ending', snap().scene);
  check('the campaign carries on after the battle', snap().scene !== 'campaign' || ['aftermath', 'muster', 'tidings'].includes(game.scene.phase), String(game.scene.phase));
  check('the march\'s result is in the report', cs.s.report.some(r => r.text.includes('Thornpass')), JSON.stringify(cs.s.report.slice(-3)));
  check('no errors in the march', snap().errors === 0, String(snap().errors));
}

// saves: a campaign saved to a slot comes back the same
export function runSaves({ check, E, G }) {
  const game = E.current;
  game.go('title', {}); game.advance(1);
  game.debug.newCampaign({ humans: ['verdance'], seed: 77 });
  const before = game.debug.hash();
  game.saves.save(0);
  game.debug.newCampaign({ humans: ['verdance'], seed: 78 });
  check('a new campaign differs before loading', game.debug.hash() !== before);
  game.saves.load(0);
  game.advance(1);
  check('a saved campaign loads back the same', game.debug.hash() === before, String(game.debug.hash()));
}

// hot-seat: two rulers on one device. The first ends their muster, the device is passed, the second musters.
export function runHotSeat({ check, E }) {
  const game = E.current, I = game.input, snap = () => game.debug.snapshot();
  const tap = (a, n = 1) => { for (let k = 0; k < n; k++) { I.tap(a); game.advance(.6); } };
  game.go('title', {}); game.advance(1);
  game.debug.newCampaign({ humans: ['verdance', 'solmark'], seed: 41 });
  game.go('campaign', {}); game.advance(.8);
  tap('confirm');
  for (let k = 0; k < 60 && snap().scene === 'event'; k++) tap('confirm');
  game.advance(.8);
  check('the first ruler musters', game.scene.phase === 'muster', String(game.scene.phase));
  tap('endTurn');
  check('ending the first muster passes the device', game.scene.phase === 'pass', String(game.scene.phase));
  tap('confirm');
  check('the second ruler musters next', game.scene.phase === 'muster' && snap().realm === 'solmark', snap().realm + ' ' + game.scene.phase);
  check('no errors in hot-seat', snap().errors === 0, String(snap().errors));
}
