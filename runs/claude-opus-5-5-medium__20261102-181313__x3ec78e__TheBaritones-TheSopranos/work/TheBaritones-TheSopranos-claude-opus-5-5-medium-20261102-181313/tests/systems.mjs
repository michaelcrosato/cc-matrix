// Every system on its own, headless: the title and its idle attract mode, combat (punches, kicks, block, roll, the
// pistol), the car, pickups, stress and the panic attack (both ends), the stare-down (both ends), the cold, death and
// retry, saves, views, button symbols, the Collection (one and two players, the clock, the results), the About screen,
// the touch-only title. Run: node tests/systems.mjs
import { load } from './load.mjs';
let failed = 0;
const check = (what, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; };
const T = 16;

{ // the title, the attract mode and back
  const { game, I, D, snap } = load();
  game.advance(1);
  check('title first', snap().scene === 'title');
  game.advance(9.5);
  check('10 s idle starts the attract mode', snap().scene === 'attract', snap().scene);
  const places = new Set(), minis = new Set(), views = new Set();
  for (let i = 0; i < 1500; i++) { game.advance(.1); places.add(D.W.place); if (D.W.mini) minis.add(D.W.mini.kind); views.add(game.view.id); if (snap().scene !== 'attract') break; }
  check('the demo shows the town and the Pine Barrens', places.has('town') && places.has('barrens'), [...places].join());
  check('the demo shows both minigames', minis.has('stare') && minis.has('breathe'), [...minis].join());
  check('the demo cycles the camera views', views.size >= 3, [...views].join());
  check('the demo loops (still in attract)', snap().scene === 'attract', snap().scene);
  I.tap('kick'); game.advance(.5);
  check('any input leaves the demo for the title', snap().scene === 'title', snap().scene);
  check('no errors in the title and demo', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}

{ // combat, the car, pickups, stress
  const { game, I, D, snap } = load();
  game.advance(.5); D.startChapter('ch2'); game.advance(1.5);
  const S = D.S, W = D.W, h = D.hero();
  while (D.convoBusy()) { I.tap('confirm'); game.advance(.1); }
  // punches: a three-hit combo on a goon in front
  const g = D.spawnFoe('goon', h.x + 16, h.y); g.wake = 9; h.facing = 0;
  const hp0 = g.hp; for (let i = 0; i < 6; i++) { I.tap('attack'); game.advance(.18); }
  check('punches land and chain', g.hp < hp0 - 20, 'hp ' + hp0 + ' -> ' + g.hp);
  game.advance(.6); g.x = h.x + 16; g.y = h.y; g.vx = g.vy = 0; h.facing = 0; const hp1 = g.hp; I.tap('kick'); game.advance(.8);
  check('a kick lands', g.hp < hp1 || g.dead, 'hp ' + hp1 + ' -> ' + g.hp);
  while (!g.dead) { D.hitFoe(g, 30, 0, 50, h); }
  game.advance(.2);
  check('a downed Falsetti drops cash', W.items.some(i => i.kind === 'cash'));
  const cash0 = S.cash; for (const it of W.items) { D.teleport(it.x, it.y); game.advance(.5); }
  check('walking over cash picks it up', S.cash > cash0, cash0 + ' -> ' + S.cash);
  // block: a hit from the front does little
  h.hp = 100; h.inv = 0; h.facing = 0; I.hold('block'); game.advance(.1);
  D.hurtHero(h, 20, Math.PI); const blocked = 100 - h.hp; I.hold('block', false); game.advance(.6);
  h.hp = 100; h.inv = 0; D.hurtHero(h, 20, Math.PI); const open = 100 - h.hp;
  check('blocking takes most of a hit away', blocked < open / 3, blocked + ' vs ' + open);
  // roll: no damage while rolling
  h.hp = 100; h.inv = 0; game.advance(.6); I.tap('dodge'); game.advance(1 / 60); D.hurtHero(h, 20, 0);
  check('a roll dodges a hit', h.hp === 100, 'hp ' + h.hp);
  game.advance(.5);
  // the pistol: nothing before Frankie hands it over, then it shoots
  S.flags.gun = 0; const a0 = S.ammo; I.tap('fire'); game.advance(.4);
  check('no pistol before the story gives it', S.ammo === a0);
  S.flags.gun = 1; S.ammo = 5; const gm = D.spawnFoe('gunman', h.x + 60, h.y); gm.wake = 9; h.facing = 0;
  for (let i = 0; i < 4; i++) { I.hold('fire'); game.advance(.35); } I.hold('fire', false); game.advance(.6);
  check('the pistol fires and hits (the gunman drops rounds)', S.ammo !== 5 && (gm.hp < gm.max || gm.dead), 'ammo ' + S.ammo + ' hp ' + gm.hp);
  S.ammo = 0; I.tap('fire'); game.advance(.4);
  check('an empty pistol just clicks', S.ammo === 0);
  check('shooting raises stress', S.stress > 0);
  // the SUV
  const car = W.cars[0]; D.teleport(car.x + 12, car.y); game.advance(.1); I.tap('interact'); game.advance(.2);
  check('get in the SUV', !!h.car);
  const x0 = car.x, y0 = car.y; I.hold('up'); I.hold('right'); game.advance(1.5); I.hold('up', false); I.hold('right', false);
  check('the SUV steers and drives', Math.hypot(car.x - x0, car.y - y0) > 30);
  const f2 = D.spawnFoe('goon', car.x + Math.cos(car.angle) * 30, car.y + Math.sin(car.angle) * 30); f2.wake = 9;
  car.speed = 150; game.advance(.4);
  check('the car knocks a Falsetti down', f2.hp < f2.max, 'hp ' + f2.hp);
  I.tap('interact'); game.advance(.3);
  check('get out of the SUV', !h.car);
  // stress and the panic attack: pass by breathing, fail by freezing
  for (const f of W.foes) f.hp = 0, f.dead = 9; game.advance(.2);
  S.stress = 100; game.advance(.2);
  check('stress at 100 starts a panic attack', W.mini && W.mini.kind === 'breathe');
  for (let t = 0; t < 20 && W.mini; t += 1 / 60) { I.hold('interact', !!W.mini.inhale); game.advance(1 / 60); } I.hold('interact', false);
  check('breathing with the ring steadies Sal', !W.mini && S.stress <= 45 && h.focus > 0, 'stress ' + S.stress);
  S.stress = 100; game.advance(.2); const r0 = S.respect;
  for (let t = 0; t < 20 && W.mini; t += .1) game.advance(.1);
  check('not breathing: Sal goes down (respect lost)', !W.mini && S.respect < r0 && S.stress >= 50, 'respect ' + r0 + ' -> ' + S.respect);
  game.advance(2);
  // the stare-down, both ends
  let res = null; D.stareDown('laundry', ok => { res = ok; });
  for (let t = 0; t < 30 && W.mini; t += 1 / 60) { const m = W.mini; if (Math.abs(m.u - m.center) < m.zone / 4 && !m.over) I.tap('attack'); game.advance(1 / 60); }
  check('the stare-down is won by timing', res === true);
  res = null; D.stareDown('laundry', ok => { res = ok; });
  for (let t = 0; t < 30 && W.mini; t += 1 / 60) { const m = W.mini; if (Math.abs(m.u - m.center) > m.zone && !m.over) I.tap('attack'); game.advance(1 / 60); }
  check('the stare-down is lost by bad timing', res === false);
  // views: V cycles three-quarter, top-down, iso
  const seen = new Set([game.view.id]); for (let i = 0; i < 3; i++) { I.tap('view'); game.advance(.1); seen.add(game.view.id); }
  check('the view key cycles three views', seen.size === 3, [...seen].join());
  // button symbols: PlayStation by default, Xbox in Settings
  I.lastDevice = 'gamepad';
  const ps = I.label('attack'); game.settings.set('glyphs', 'xbox'); const xb = I.label('attack'); game.settings.set('glyphs', 'playstation');
  check('button symbols: □ on PlayStation, X on Xbox', ps === '□' && xb === 'X', ps + ' / ' + xb);
  I.lastDevice = 'keyboard';
  check('keyboard prompts name keys', I.label('attack') === 'J' && I.label('interact') === 'E', I.label('attack') + ' ' + I.label('interact'));
  check('invert axes settings exist', game.settings.spec('invertX') && game.settings.spec('invertY') && game.settings.invertX === false);
  // death and retry
  h.hp = 1; h.inv = 0; D.hurtHero(h, 50, 0); game.advance(3);
  check('Sal down: SLEEPING WITH THE FISHES', snap().scene === 'over', snap().scene);
  I.tap('confirm'); game.advance(1);
  check('retry restarts the chapter from its start', snap().scene === 'play' && snap().ch === 3 && snap().step === 0, JSON.stringify(snap()));
  check('no errors in combat and story systems', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}

{ // the cold in the Pine Barrens
  const { game, I, D } = load();
  game.advance(.5); D.startChapter('ch3'); game.advance(1);
  while (D.convoBusy()) { I.tap('confirm'); game.advance(.1); }
  const W = D.W, h = D.hero();
  D.teleport(22 * T, 9 * T); game.advance(10);
  const cold = W.cold; check('the cold drains warmth away from the fire', cold < 95, cold);
  D.teleport(10 * T, 12.5 * T); game.advance(3);
  check('a fire barrel warms Sal up', W.cold > cold, cold + ' -> ' + W.cold);
  W.cold = 0; const hp = h.hp; D.teleport(22 * T, 9 * T); game.advance(2);
  check('frozen: health drains', h.hp < hp);
  check('Nicky follows as an ally', W.heroes.length === 2 && W.heroes[1].who === 'nicky');
  check('no errors in the woods', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}

{ // the Collection: one player, then two; the clock and the results
  const { game, I, D, snap } = load();
  game.advance(.5);
  game.go('play', { mode: 'collect' }); game.advance(1);
  const W = D.W, C = D.C, h = D.hero();
  check('the Collection starts with a 3:00 clock', C.started && C.t > 170);
  const sh = W.npcs[0]; D.teleport(sh.x, sh.y + 12); game.advance(.1); I.tap('interact'); game.advance(.3);
  check('a shop pays an envelope', h.cash > 0, h.cash);
  const c1 = h.cash; I.tap('interact'); game.advance(.3);
  check('a shop pays once, then waits', h.cash === c1);
  game.advance(20);
  check('Falsetti crews arrive', W.foes.length > 0);
  const p2 = game.addPlayer({ keys: 'right' }); game.advance(.2);
  if (W.heroes.length < 2) D.addCollector(p2);
  game.advance(.2);
  check('a second player joins as Nicky', W.heroes.length === 2 && W.heroes[1].input === p2, W.heroes.length);
  C.t = 1; game.advance(4);
  check('time up: the count', snap().scene === 'results', snap().scene);
  I.tap('down'); game.advance(.1); I.tap('confirm'); game.advance(1);
  check('back to the title from the results', snap().scene === 'title', snap().scene);
  check('no errors in the Collection', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}

{ // saves: the autosave at a chapter start, CONTINUE on the title
  const { game, I, D, snap } = load();
  game.advance(.5); D.S.cash = 1234; D.startChapter('ch3'); game.advance(1.5);
  check('a chapter start autosaves', game.saves.any);
  game.go('title'); game.advance(1);
  check('CONTINUE is offered', game.saves.any);
  I.tap('confirm'); game.advance(1.5);
  check('CONTINUE loads the chapter', snap().scene === 'play' && snap().place === 'barrens' && D.S.cash === 1234, JSON.stringify(snap()));
}

{ // the About screen and the touch-only title
  const { game, I, D, snap } = load();
  game.advance(.5);
  game.go('about'); game.advance(.5);
  check('About & Credits opens', snap().scene === 'about');
  I.tap('right'); game.advance(.1); I.tap('right'); game.advance(.1);
  I.tap('cancel'); game.advance(.6);
  check('About pages turn, cancel goes back', snap().scene === 'title');
  D.touchLocked = true; game.advance(1);
  check('touch-only: the title still waits', snap().scene === 'title');
  game.advance(10);
  check('touch-only: the attract mode still runs', snap().scene === 'attract', snap().scene);
  check('the font has every glyph we draw', D.fixGlyphs('a · b ◂ c — d') === 'a • b ← c - d');
  check('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
}

console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
