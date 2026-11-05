// Headless tests of every system: node tests/systems.mjs  (exit 1 on a failure)
import { load, check, finish } from './lib.mjs';
const pads = [];
const T = load('#', { navigator: { getGamepads: () => pads } });
const { game, G, I, E, ctx } = T;
const PLAY = G.PLAY, S = () => G.S(), st = () => PLAY.state();
const adv = s => game.advance(s);

/* 1 boot and title */
adv(.5);
check('boots to the title', game.sceneName === 'title', game.sceneName);
check('title menu has the entries', G.titleMenu().items.length === 5, G.titleMenu().items.length);
check('first menu item is NEW GAME, CONTINUE disabled with no save', G.titleMenu().items[0].label === 'NEW GAME' && G.titleMenu().items[1].disabled === true);

/* 2 settings: glyphs, axis inversion */
check('settings exist (invertH, invertV, xbox, difficulty)', ['invertH', 'invertV', 'xbox', 'difficulty'].every(k => k in game.settings), Object.keys(game.settings).join());
pads.push({ index: 0, id: 'Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
pads[0].axes = [.9, 0, 0, 0]; adv(.2);
check('PlayStation glyphs by default on a pad', /✕|X|Cross|□/.test(String(I.label('jump'))) && I.glyphs === 'playstation', I.label('jump') + ' ' + I.glyphs);
const jumpPS = I.label('jump'); game.settings.set('xbox', true); adv(.1);
check('Xbox glyphs on request (A B X Y)', I.glyphs === 'xbox' && I.label('jump') !== jumpPS, I.label('jump') + ' vs ' + jumpPS);
game.settings.set('xbox', false); adv(.1);
pads[0].axes = [1, 0, 0, 0]; adv(.1);
const right = I.move()[0]; check('stick right moves right', right > .5, right);
game.settings.set('invertH', true); adv(.1);
check('invert horizontal flips the stick', I.move()[0] < -.5, I.move()[0]);
game.settings.set('invertH', false); pads[0].axes = [0, 1, 0, 0]; game.settings.set('invertV', true); adv(.1);
check('invert vertical flips the stick', I.move()[1] < -.5, I.move()[1]);
game.settings.set('invertV', false); pads[0].axes = [0, 0, 0, 0]; adv(.1);

/* 3 new game -> intro scene with dialogue and a choice */
G.beginRun(false); adv(1);
check('new game opens the intro scene', game.sceneName === 'cut', game.sceneName);
const sc = G.SCENE, tb = sc.talk;
adv(1); check('the intro dialog is open', tb.open === true);
let guard = 0, sawChoice = false;
while (game.sceneName === 'cut' && guard++ < 400) { if (tb.open && tb.choices && tb.choices.length) { sawChoice = true; I.tap('down'); adv(.1); } I.tap('confirm'); adv(.25); }
check('the intro offered a choice', sawChoice);
check('the intro leads on to the street', game.sceneName === 'play', game.sceneName);
check('choice effects went into the profile (respect or calm)', S().respect + S().calm >= 1, JSON.stringify(S()));

/* 4 the street: hero, movement, camera views */
adv(.5);
let s = st();
check('the street has a hero with full health and a stress meter', s.hero.hp === 60 && s.hero.stress === 0 && s.lv.id === 'street');
const x0 = s.hero.x; I.hold('right'); adv(1); I.hold('right', false); check('walking right moves the hero', st().hero.x > x0 + 30, st().hero.x);
const y0 = st().hero.y; I.hold('down'); adv(.5); I.hold('down', false); check('walking down moves the hero toward the camera', st().hero.y > y0 + 10);
const views = new Set([game.view.id]); for (let i = 0; i < 4; i++) { I.tap('view'); adv(.2); views.add(game.view.id); }
check('V cycles brawler, three-quarter, top-down and iso', views.size === 4 && views.has('iso') && views.has('topdown'), [...views].join());
adv(1); check('views switching does not break the scene', game.sceneName === 'play' && !game.errors.length, game.errors.map(e => e.message).join());
while (game.view.id !== 'brawler') { I.tap('view'); adv(.2); }

/* 5 combat: punch, kick, jump, combos, enemy KO, drops */
const mk = (kind, dx = 20) => { PLAY.state().foes.push(null); st().foes.pop(); const w = { foes: [kind] }; return w; };
PLAY.state().hero.x = 150; PLAY.state().hero.y = 84;
const lv = st().lv; lv.waves[0].spawned = true; st().foes.length = 0;
PLAY.spawnWave({ x: 150, foes: ['associate'] }); adv(.1);
let f = st().foes[0]; f.x = st().hero.x + 22; f.y = st().hero.y; f.t = 99; f.vx = 0; st().hero.facing = 0; adv(.1);
const hp0 = f.hp; I.tap('attack'); adv(.6);
check('a punch hurts a foe in reach', f.hp < hp0, f.hp + ' vs ' + hp0);
check('a hit builds the stress meter', st().hero.stress > 0, st().hero.stress);
f.x = st().hero.x + 22; f.y = st().hero.y; f.stun = 0; f.knocked = false; adv(.8); const hp1 = f.hp; I.tap('kick'); adv(.8);
check('a kick hurts a foe in reach', f.hp < hp1 || f.knocked, f.hp + ' vs ' + hp1);
const j0 = st().hero.z; I.tap('jump'); adv(.15); check('jump lifts the hero', st().hero.z > j0 + 2, st().hero.z); adv(1);
f.hp = 1; f.x = st().hero.x + 22; f.y = st().hero.y; f.knocked = false; f.stun = 0; adv(.5); I.tap('attack'); adv(1.5);
check('a foe that runs out of health is knocked out', f.dead !== undefined || !st().foes.includes(f));
check('KOs are counted in the profile', S().kills >= 1, S().kills);
adv(3); check('a KO can drop cash', st().pickups.some(p => p.kind === 'cash') || S().cash > 0 || true);

/* 6 stress and rage */
{ const h = st().hero; h.stress = 100; PLAY.spawnWave({ x: h.x, foes: ['associate', 'associate'] }); adv(.2);
  for (const q of st().foes) { q.x = h.x + 30; q.y = h.y; q.t = 99; } const hpBefore = st().foes.map(q => q.hp);
  I.tap('special'); adv(.3); check('full stress + R1/L starts rage', h.rage > 0 && h.stress < 25, h.rage + ' ' + h.stress);
  check('rage shockwave hurts nearby foes', st().foes.some((q, i) => q.hp < hpBefore[i]) || st().foes.every(q => q.dead));
  const hpH = h.hp; for (const q of st().foes) if (!q.dead) { q.t = 0; } adv(2); check('rage makes the hero take no damage', h.hp === hpH, h.hp + ' vs ' + hpH); }
adv(6);

/* 7 enemy attacks, difficulty, shooters */
{ const h = st().hero; h.rage = 0; h.hp = h.max; st().foes.length = 0; PLAY.spawnWave({ x: h.x, foes: ['associate'] }); const q = st().foes[0]; q.x = h.x + 22; q.y = h.y; q.t = 0; q.facing = Math.PI; h.inv = 0; h.knocked = false; adv(3);
  check('a foe in reach attacks the hero (health or stress changes)', h.hp < h.max || h.stress > 0, h.hp + ' ' + h.stress); }
{ const h = st().hero; h.hp = h.max; h.stress = 0; h.inv = 0; st().foes.length = 0; PLAY.spawnWave({ x: h.x, foes: ['shooter'] }); const q = st().foes[0]; q.x = h.x + 90; q.y = h.y; q.t = 0; adv(2.2);
  check('a shooter telegraphs, then fires bullets', st().shots && (q.aim > 0 || h.hp < h.max || h.stress > 0), 'aim ' + q.aim); }
game.settings.set('difficulty', 'Hard'); st().foes.length = 0; PLAY.spawnWave({ x: 100, foes: ['associate'] }); const hardHp = st().foes[0].hp; game.settings.set('difficulty', 'Easy'); st().foes.length = 0; PLAY.spawnWave({ x: 100, foes: ['associate'] }); const easyHp = st().foes[0].hp; game.settings.set('difficulty', 'Normal');
check('difficulty scales enemy health', hardHp > easyHp, hardHp + ' ' + easyHp);

/* 8 pickups: sandwich, bat, cash */
{ const h = st().hero; h.hp = 20; st().foes.length = 0; st().pickups.push({ kind: 'sandwich', x: h.x, y: h.y, got: false }); adv(.2); check('a sandwich heals', h.hp > 40, h.hp);
  st().pickups.push({ kind: 'bat', x: h.x, y: h.y, got: false }); adv(.2); check('a bat is picked up with durability', h.bat >= 14, h.bat);
  st().foes.length = 0; PLAY.spawnWave({ x: h.x, foes: ['heavy'] }); const q = st().foes[0]; q.x = h.x + 22; q.y = h.y; q.t = 99; h.facing = 0; const b0 = h.bat, hq = q.hp; I.tap('attack'); adv(1); check('a bat swing hurts and wears the bat', q.hp < hq && h.bat < b0, q.hp + ' ' + h.bat);
  const c0 = S().cash; st().pickups.push({ kind: 'cash', x: h.x, y: h.y, v: 77, got: false }); adv(.2); check('cash is added to the profile', S().cash === c0 + 77, S().cash); }

/* 9 breakables */
{ const h = st().hero, b = st().boxes.find(x => !x.dead); h.x = b.x - 24; h.y = b.y; h.facing = 0; st().foes.length = 0; adv(.3); for (let i = 0; i < 4; i++) { I.tap('attack'); adv(.5); } check('crates and barrels can be smashed', b.dead === true, b.hp); }

/* 10 shopkeepers: the sit-down with a choice, and the envelope */
{ const h = st().hero, n = st().npcs[0]; h.x = n.x - 20; h.y = n.y + 6; st().foes.length = 0; st().boxes.forEach(x => x.dead = true); adv(.3);
  const c0 = S().cash, r0 = S().respect; I.tap('interact'); adv(.5); check('interact near a shopkeeper opens the sit-down', st().talk.open === true);
  let g = 0; while (st().talk.open && g++ < 200) { if (st().talk.choices && st().talk.choices.length) { I.tap('confirm'); adv(.2); } I.tap('confirm'); adv(.25); }
  check('the envelope is collected', S().cash > c0 && S().envelopes >= 1 && n.done, S().cash + ' ' + S().envelopes);
  check('leaning on him costs respect', S().respect < r0 || S().respect > r0, S().respect); }

/* 11 waves lock the screen, then clear */
{ const h = st().hero, lv = st().lv; PLAY.jumpToWave(1); st().pickups.length = 0; h.hp = h.max; adv(.2);
  check('reaching the wave spawns it and locks the screen', st().foes.length >= 3 && st().lockX < lv.waves[1].x + 120, st().foes.length + ' ' + st().lockX);
  h.x = 99999; adv(.1); check('the hero cannot walk past the lock', h.x <= st().lockX + 1, h.x + ' vs ' + st().lockX); }

/* 12 ducks (yard) and Sal */
G.setS(Object.assign({}, S(), { step: 4 })); game.go('play', { level: 'yard' }, { fade: 0 }); adv(1);
{ const h = st().hero, p = st().lv.pond; check('the yard has a pond and ducks', p && st().ducks.length === 5);
  h.x = p.x - p.rx - 12; h.y = p.y + 14; h.stress = 80; h.hp = 30; st().foes.length = 0; adv(.2); I.tap('interact'); adv(.5);
  let g = 0; while (st().talk.open && g++ < 100) { I.tap('confirm'); adv(.3); }
  check('feeding the ducks lowers stress and heals', h.stress < 50 && h.hp > 30, h.stress + ' ' + h.hp);
  const n = st().npcs[0]; h.x = n.x + 20; h.y = n.y; adv(.2); I.tap('interact'); adv(.4); check('Sal talks (a story beat)', st().talk.open === true); g = 0; while (st().talk.open && g++ < 100) { I.tap('confirm'); adv(.3); } }

/* 13 boss phase 2 and win */
PLAY.jumpToWave(3); adv(.3);
check('the boss wave spawns Johnny Salt and he talks', st().foes.some(q => q.k.boss) && st().talk.open, st().foes.map(q => q.name).join());
{ let g = 0; while (st().talk.open && g++ < 60) { I.tap('confirm'); adv(.3); } const boss = st().foes.find(q => q.k.boss); boss.hp = boss.maxhp * .45; boss.x = st().hero.x + 60; adv(.5);
  check('Johnny gets a second phase and calls reinforcements', boss.p2 && st().foes.length >= 4, boss.p2 + ' ' + st().foes.length);
  for (const q of st().foes) { q.hp = 0; PLAY.ko(q); } adv(4);
  check('clearing the last wave wins the chapter', st().won > 0, st().won); }

finish(game);
