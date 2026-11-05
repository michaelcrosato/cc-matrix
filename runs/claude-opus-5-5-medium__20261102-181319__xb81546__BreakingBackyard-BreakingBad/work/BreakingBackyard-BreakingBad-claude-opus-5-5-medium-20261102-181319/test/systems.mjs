// Every system on its own, headless.
import { load, check, done } from './lib.mjs';
const near = (a, b, d) => Math.abs(a - b) <= d;

{ // movement, walls, sprint, dodge
  const t = load('#town'); t.adv(1.5);
  const W = t.dbg.level(), h = W.hero;
  t.dbg.teleport(C(28), C(12)); t.adv(.1); const x0 = h.x; t.hold('right', .5); check('walking right moves the hero', h.x - x0 > 25, x0 + ' -> ' + h.x);
  t.dbg.teleport(t.dbg.spot.home.x, t.dbg.spot.home.y); t.adv(.1); const y0 = h.y; t.hold('up', 1.5);
  check('the house wall stops the hero', h.y > 112 - 8 && h.y <= y0, y0 + ' -> ' + h.y);
  t.dbg.teleport(C(28), C(12)); t.adv(.1); let a = h.x; t.hold('right', .5); const walk = h.x - a;
  a = h.x; t.I.hold('sprint'); t.hold('right', .5); t.I.hold('sprint', false); const run = h.x - a;
  check('sprint is faster than walking', run > walk * 1.3, walk.toFixed(1) + ' vs ' + run.toFixed(1));
  t.tap('dodge', .02); check('a dodge roll gives invulnerability frames', h.iT > 0 && h.dodgeT > 0, h.iT + ' ' + h.dodgeT);
  check('no errors (movement)', !t.errors().length, t.errors().join('|'));
  function C(c) { return c * 16 + 8; }
}
{ // punches, the pistol, flasks, smoke
  const t = load('#ep=2.1'); t.adv(1.5);
  const W = t.dbg.level(), h = W.hero; W.agents.forEach(a => a.stun = 99);
  t.dbg.teleport(400, 300); t.adv(.1);
  const e = t.dbg.makeEnemy('thug', 418, 300); e.cd = 99; h.facing = 0; h.aim = 0;
  const hp0 = e.hp; t.tap('attack', .4); t.tap('attack', .4);
  check('punches land on a foe in front', e.hp < hp0, hp0 + ' -> ' + e.hp);
  t.dbg.setState({ up: { pistol: true } }); t.dbg.level().hero.gun = true;
  e.x = 480; e.y = 300; e.hp = 40; e.vx = e.vy = 0; h.facing = 0; h.aim = 0; t.adv(.05); t.tap('attack', .6);
  check('the pistol fires a bullet that hits', e.hp < 40, e.hp);
  check('a shot costs ammo', h.ammo === 7, h.ammo);
  for (let i = 0; i < 10; i++) { h.cool = 0; t.tap('attack', .05); } check('an empty clip reloads', h.reload > 0 || h.ammo === 8, h.ammo + ' ' + h.reload);
  // smoke: a cloud that stuns a thug in it and hides the hero from an agent
  const S = t.dbg.state(); S.sel = 'smoke'; const sm0 = S.flasks.smoke;
  e.x = 470; e.y = 300; e.stun = 0; e.hp = 40; e.dead = false; t.tap('throw', 1.2);
  check('a smoke flask leaves a cloud', W.clouds.length === 1 && S.flasks.smoke === sm0 - 1, W.clouds.length + ' ' + S.flasks.smoke);
  const e2 = t.dbg.makeEnemy('thug', 520, 340); e2.cd = 99; W.clouds[0].x = e2.x; W.clouds[0].y = e2.y; W.clouds[0].t = 5; t.adv(.2);
  check('a foe in the smoke is stunned', e2.stun > 0, e2.stun);
  t.tap('cycle'); check('cycle switches the flask', S.sel === 'fulm', S.sel);
  // fulminate stuns an agent and raises heat
  const ag = W.agents[0]; ag.stun = 0; ag.x = 600; ag.y = 300; const heat0 = S.heat; t.dbg.burst(600, 300, 'fulm'); t.adv(.05);
  check('a blast stuns an agent and adds heat', ag.stun > 0 && S.heat > heat0, ag.stun + ' ' + heat0 + '->' + S.heat);
  check('no errors (combat)', !t.errors().length, t.errors().join('|'));
}
{ // the DEA: seen holding -> alert -> busted (loses product, 30% of dirty cash)
  const t = load('#ep=2.1'); t.adv(1.5);
  const W = t.dbg.level(), h = W.hero, S = t.dbg.state();
  S.product = 4; S.dirty = 1000; S.clock = 12;
  W.agents.length = 0; const a = t.dbg.makeAgent(0, 0, 0); W.agents.forEach(x => { x.stun = 0; });
  const ax = a.x, ay = a.y;
  // stand in front of it in the open
  t.dbg.teleport(ax + 40, ay); a.facing = 0; a.look = 99; t.adv(.02);
  let st = 'calm', k = 0; while (st !== 'alert' && k++ < 600) { t.adv(1 / 120); st = a.state; }
  check('an agent who sees the product goes alert', st === 'alert', st + ' after ' + k + ' steps');
  let n = 0; while (t.snap().scene === 'town' && n++ < 600) t.adv(1 / 60);
  check('caught by an alert agent: busted', t.snap().scene === 'busted', t.snap().scene);
  check('busted: product seized, 30% of dirty cash', S.product === 0 && S.dirty === 700, S.product + ' ' + S.dirty);
  t.adv(2); t.tap('confirm'); t.adv(1); check('busted -> back home', t.snap().scene === 'town', t.snap().scene);
  // an agent ignores a hero holding nothing at low heat
  const W2 = t.dbg.level(); const S2 = t.dbg.state(); S2.product = 0; S2.heat = 0; W2.agents.length = 0; const b = t.dbg.makeAgent(1, 0, 1);
  t.dbg.teleport(b.x + 40, b.y); b.facing = 0; b.look = 99; t.adv(2);
  check('clean-handed at low heat: the agent stays calm', b.state === 'calm' || b.state === 'notice', b.state);
  // heat decays
  S2.heat = 50; t.adv(6); check('heat decays over time', S2.heat < 50, S2.heat);
  check('no errors (DEA)', !t.errors().length, t.errors().join('|'));
}
{ // player 2, camera views, prompts, settings
  const t = load('#ep=2.1'); t.adv(1.5);
  const W = t.dbg.level();
  t.I.lastDevice = 'keyboard'; check('keyboard prompts name keys', t.I.label('interact') === 'E', t.I.label('interact'));
  const p2 = t.game.addPlayer({ keys: 'right' }); t.adv(.2);
  check('a second player joins as Dusty', t.snap().p2, JSON.stringify(t.snap()));
  const d = W.partner, x0 = d.x; p2.hold('right'); t.adv(.6); p2.hold('right', false);
  check('player 2 moves Dusty', d.x - x0 > 20, x0 + ' -> ' + d.x);
  const v0 = t.snap().view; t.tap('view'); const v1 = t.snap().view; t.tap('view'); const v2 = t.snap().view; t.tap('view');
  check('the camera cycles threequarter -> topdown -> iso -> threequarter', v0 === 'threequarter' && v1 === 'topdown' && v2 === 'iso' && t.snap().view === 'threequarter', [v0, v1, v2, t.snap().view].join(' '));
  t.I.lastDevice = 'gamepad';
  check('PlayStation glyphs by default', t.I.label('interact') === '✕', t.I.label('interact'));
  t.game.settings.set('glyphs', 'Xbox'); check('Settings: Xbox glyphs', t.I.label('interact') === 'A', t.I.label('interact'));
  t.game.settings.set('glyphs', 'PlayStation');
  check('settings has the invert toggles', t.game.settings.spec('invertX') && t.game.settings.spec('invertY'), '');
  check('no errors (p2/views)', !t.errors().length, t.errors().join('|'));
}
{ // the stick inversion, through a fake gamepad
  let axes = [0.9, 0, 0, 0];
  const pad = () => ({ id: 'DualSense Wireless Controller', index: 0, connected: true, mapping: 'standard', timestamp: 1, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes });
  const nav = { getGamepads: () => [pad()], maxTouchPoints: 0 };
  const t = load('#town', { navigator: nav }); t.adv(1.5);
  const h = t.dbg.level().hero; t.dbg.teleport(C(28), C(12)); t.adv(.1);
  let x0 = h.x; t.adv(.5); const plain = h.x - x0;
  t.game.settings.set('invertX', true); x0 = h.x; t.adv(.5); const inv = h.x - x0;
  check('the pad pushes right; Invert stick horizontal flips it', plain > 10 && inv < -10, plain.toFixed(1) + ' / ' + inv.toFixed(1));
  t.game.settings.set('invertX', false); axes = [0, 0.9, 0, 0]; t.game.settings.set('invertY', true); let y0 = h.y; t.adv(.5);
  check('Invert stick vertical flips up and down', h.y - y0 < -10, (h.y - y0).toFixed(1));
  check('PS glyphs from a DualSense', t.I.label('interact') === '✕', t.I.label('interact'));
  function C(c) { return c * 16 + 8; }
}
{ // the attract mode: 10 s idle -> a demo; any input -> back to the title, the player's state untouched
  const t = load(''); t.adv(1);
  t.dbg.setState({ dirty: 123 });
  t.adv(9); check('title waits under 10 s', t.snap().scene === 'title', t.snap().scene);
  t.adv(2); check('after 10 s idle the demo starts', t.snap().scene === 'town' && t.snap().demo, JSON.stringify(t.snap()));
  t.adv(30); check('the demo plays on (cook, fight)', t.snap().scene === 'town' && !t.errors().length, t.snap().scene + ' ' + t.errors().join('|'));
  t.tap('attack'); t.adv(1); check('any input leaves the demo', t.snap().scene === 'title', t.snap().scene);
  check('the player\'s state is restored after the demo', t.dbg.state().dirty === 123, t.dbg.state().dirty);
  const t2 = load(''); t2.adv(11); t2.adv(80); check('an untouched demo loops back to the title', t2.snap().scene === 'title' || t2.snap().demo, t2.snap().scene);
  check('no errors (attract)', !t2.errors().length, t2.errors().join('|'));
}
{ // touch-only devices: no touch controls, a notice and Settings only, the attract mode still runs
  const nav = { getGamepads: () => [], maxTouchPoints: 5 };
  const t = load('', { navigator: nav, matchMedia: q => ({ matches: false }) }); t.adv(1);
  check('touch-only is detected', t.dbg.touchOnly(), '');
  check('touch-only title offers Settings only', JSON.stringify(t.dbg.titleItems()) === '["SETTINGS"]', JSON.stringify(t.dbg.titleItems()));
  check('touch controls are off', t.I.touchEnabled === false, t.I.touchEnabled);
  t.adv(11); check('touch-only: the attract mode runs', t.snap().demo, t.snap().scene);
}
{ // saves, continue, death and retry
  const t = load(''); t.adv(.5); t.tap('confirm'); t.adv(1);
  const S = t.dbg.state(); S.dirty = 777; t.dbg.advance(); t.adv(.2);       // a step advance autosaves
  t.game.go('title'); t.adv(1);
  check('the title offers CONTINUE after a save', t.dbg.titleItems()[0] === 'CONTINUE', JSON.stringify(t.dbg.titleItems()));
  t.tap('confirm'); t.adv(1);
  check('continue loads the save', t.snap().scene === 'town' && t.dbg.state().dirty === 777 && t.snap().step === 1, JSON.stringify(t.snap()));
  const h = t.dbg.level().hero; t.dbg.hurtHero(h, 999); t.adv(3.5);
  check('losing all health -> the dead screen', t.snap().scene === 'dead', t.snap().scene);
  t.tap('confirm'); t.adv(1); check('TRY AGAIN reloads the checkpoint', t.snap().scene === 'town' && t.snap().hp === 100, JSON.stringify(t.snap()));
  check('no errors (saves)', !t.errors().length, t.errors().join('|'));
}
{ // the cook: no presses -> poor purity; the shop needs clean cash; the salon's launder rate
  const t = load('#cook'); t.adv(1);
  check('the cook deep link opens the cook', t.snap().modal === 'cook', t.snap().modal);
  t.adv(30); const m = t.dbg.modal(); check('a cook nobody plays scores low (< 80%)', m && m.phase === 'result' && m.purity < 80, m && m.purity);
  t.tap('confirm', .3); t.dbg.skipTalk(); t.adv(.3);
  check('poor product still counts', t.dbg.state().product === 6, t.dbg.state().product);
  check('no errors (cook)', !t.errors().length, t.errors().join('|'));
}
{ const t = load('#ep=3'); t.adv(1.5); t.dbg.level().agents.forEach(a => a.stun = 99);
  const S = t.dbg.state(); S.clean = 100; S.flags.shop = true;
  t.dbg.teleport(t.dbg.spot.lenny.x, t.dbg.spot.lenny.y + 4); t.adv(.2); t.tap('interact', .3); t.tap('confirm', .3);
  check('the shop refuses without clean cash', !S.up.glass, JSON.stringify(S.up));
  t.adv(.3); t.tap('cancel', .3);
  S.dirty = 1000; S.up.salon = true; t.dbg.teleport(t.dbg.spot.carwash.x, t.dbg.spot.carwash.y); t.adv(.2); t.tap('interact', .3); t.tap('confirm', .3);
  check('the nail salon front launders at 95%', S.clean === 100 + 950, S.clean);
  check('no errors (cook/shop)', !t.errors().length, t.errors().join('|'));
}
{ // AI Hub: ghost mode, a fake hub that plays the protocol
  const calls = []; const handlers = {}; let now = -Infinity;
  const hub = { active: true, connect: o => { calls.push(['connect', o]); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 300000, seed: 42 }); },
    ready: () => calls.push(['ready']), time: () => now, on: (e, f) => { handlers[e] = f; return () => {}; }, send: (d, o) => { calls.push(['send', d]); return true; },
    progress: p => calls.push(['progress', p]), result: r => calls.push(['result', r]), rng: () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }, fail: m => calls.push(['fail', m]) };
  const t = load('', { hub }); await new Promise(r => setTimeout(r, 20)); t.adv(1);
  check('hub: connects in ghost mode, seats 1-4', calls.some(c => c[0] === 'connect' && c[1].mode === 'ghost' && c[1].seats[0] === 1 && c[1].seats[1] === 4), JSON.stringify(calls.slice(0, 2)));
  check('hub: straight into the round (no title)', t.snap().scene === 'hubround', t.snap().scene);
  check('hub: ready() without a key press', calls.some(c => c[0] === 'ready'), '');
  const h = t.dbg.level().hero, x0 = h.x; t.hold('right', .5);
  check('hub: nobody moves before the start', h.x === x0, x0 + ' ' + h.x);
  now = 0; handlers.start && handlers.start({ in: 0 });
  const tick = s => { for (let i = 0; i < s * 60; i++) { now += 1000 / 60; t.adv(1 / 60); } };
  t.I.hold('right'); tick(1); t.I.hold('right', false);
  check('hub: play begins at time 0', h.x > x0 + 20, x0 + ' -> ' + h.x);
  check('hub: ghost position sent', calls.some(c => c[0] === 'send' && c[1].t === 'g'), '');
  tick(1.2); check('hub: progress reported', calls.some(c => c[0] === 'progress'), '');
  handlers.message && handlers.message({ t: 'g', area: 'hub', x: 300, y: 100, f: 0 }, 1); tick(.2);
  check('hub: another player shows as a ghost', t.dbg.level().ghosts.size === 1 && t.dbg.level().ghosts.get(1).name === 'Bo', '');
  handlers.leave && handlers.leave({ id: 1, reason: 'left' }); check('hub: a leaving player\'s ghost goes', t.dbg.level().ghosts.size === 0, '');
  // sell something: score goes up
  const S = t.dbg.state(); S.product = 3; S.purity = 95; const b = t.dbg.level().buyers[0]; t.dbg.level().agents.forEach(a => a.stun = 99);
  t.dbg.teleport(b.x, b.y + 8); tick(.1); t.tap('interact', .3); t.talkThrough(); tick(.1);
  check('hub: a deal raises the score', S.earned > 0, S.earned);
  handlers['time-up'] && handlers['time-up']({ graceMs: 3000 });
  const res = calls.filter(c => c[0] === 'result');
  check('hub: time-up reports one result with the score', res.length === 1 && res[0][1].score === Math.round(S.earned), JSON.stringify(res));
  handlers['time-up'] && handlers['time-up']({ graceMs: 3000 }); check('hub: result only once', calls.filter(c => c[0] === 'result').length === 1, '');
  handlers.end && handlers.end({ reason: 'finished', standings: [[0]] }); const sends = calls.filter(c => c[0] === 'send').length; tick(1);
  check('hub: after end, nothing more is sent', calls.filter(c => c[0] === 'send').length === sends, '');
  check('no errors (hub)', !t.errors().length, t.errors().join('|'));
}
{ // the story's people stand where the story needs them
  const t = load('#town'); t.adv(1.5);
  check('ep1: Dusty, Marian and Rafa are in town', ['dusty', 'skyler', 'rafa'].every(n => t.snap().npcs.includes(n)), JSON.stringify(t.snap().npcs));
  const l = load('#lab'); l.adv(1.5); check('the superlab: Vela waits in his office', l.snap().npcs.includes('vela'), JSON.stringify(l.snap().npcs));
  const e3 = load('#ep=3'); e3.adv(1.5); check('ep3: Lenny and Vela at their doors', ['lenny', 'vela'].every(n => e3.snap().npcs.includes(n)), JSON.stringify(e3.snap().npcs));
}
{ // Escape backs out of a menu without opening the pause menu; Escape in play pauses
  const t = load('#ep=3'); t.adv(1.5); t.dbg.level().agents.forEach(a => a.stun = 99);
  t.dbg.teleport(t.dbg.spot.lenny.x, t.dbg.spot.lenny.y + 4); t.adv(.2); t.tap('interact', .3);
  check('menu open', t.snap().modal === 'menu', t.snap().modal);
  t.I.press('Escape'); t.adv(.05); t.I.release('Escape'); t.adv(.2);
  check('Escape closes the menu and does not pause', t.snap().modal === null && !t.game.paused, t.snap().modal + ' ' + t.game.paused);
  t.I.press('Escape'); t.adv(.05); t.I.release('Escape'); t.adv(.1);
  check('Escape in play pauses', t.game.paused, t.game.paused);
}
done();
