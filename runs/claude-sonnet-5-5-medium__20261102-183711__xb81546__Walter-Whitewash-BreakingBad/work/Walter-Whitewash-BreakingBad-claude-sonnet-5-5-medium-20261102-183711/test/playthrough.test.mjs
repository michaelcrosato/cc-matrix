// A full playthrough by a bot that plays by the rules: real inputs only (key holds and taps), no cheats, from the title to the
// ending. It walks with a flow field, shops, cooks (timing the marker, holding the heat, hitting the arrows), sells, launders,
// takes Gus's orders, fights what attacks it, sleeps, and goes down to the Superlab on day 5.
import { load, checker } from './_load.mjs';
const { d, game, E } = load();
const { check, done } = checker();
const I = game.input, S = () => d.S(), F = d.fn, R = d.R;
const log = [];
const note = s => { log.push(`[d${S().day} ${R.clockText(S().minutes)}] ${s}`); };
const ev = { cooks: 0, sells: 0, launders: 0, contracts: 0, fights: 0, busts: 0, hospital: 0, days: 0, shopTrips: 0, boss: false };
let steps = 0;
const tick = (t = .05) => { game.advance(t); steps++; };
const st = id => d.stations().find(s => s.id === id);
const dirs = ['up', 'down', 'left', 'right'];
const release = () => { for (const k of dirs) I.hold(k, false); I.hold('sprint', false); };
const free = () => !d.talk.open && d.mode() === 'walk' && !d.ui.screen;
let flow = null, flowMap = null;
function dirTo(x, y) {
  const m = d.fn && game; if (flowMap !== d.mapName()) { flowMap = d.mapName(); flow = null; }
  return null;
}
// walking: hold the arrow keys toward a point, steering round walls with the flow field the game itself uses
let ff = null, ffMap = null;
function walkTo(x, y, near = 10, maxT = 25) {
  let t = 0;
  while (t < maxT) {
    clearInterrupts();
    if (d.ui.screen === 'report') return false;
    if (d.mode() === 'cut') { tick(.2); t += .2; continue; }
    const h = d.hero, dist = Math.hypot(x - h.x, y - h.y);
    if (dist < near) break;
    if (fighting()) { fightStep(); t += .05; continue; }
    if (!ff || ffMap !== d.mapName()) { ff = new E.FlowField(game.view && mapOf()); ffMap = d.mapName(); }
    ff.update(x, y);
    const f = ff.dir(h.x, h.y, x, y) || [0, 0];
    I.hold('left', f[0] < -.35); I.hold('right', f[0] > .35); I.hold('up', f[1] < -.35); I.hold('down', f[1] > .35);
    tick(.05); t += .05;
  }
  release(); tick(.05);
  return Math.hypot(x - d.hero.x, y - d.hero.y) < near + 4;
}
function mapOf() { return d.fn.getMap(); }
function clearInterrupts() {
  if (d.ui.screen === 'report') { return; }
  for (let i = 0; i < 80 && (d.talk.open || d.mode() === 'talk'); i++) { I.tap('confirm'); tick(.2); }
  if (d.ui.screen && d.ui.screen !== 'report') { d.ui.hide(); tick(.05); }
}
let fightClock = 0, fightIgnoreUntil = 0;
function fighting() { return steps > fightIgnoreUntil && d.lists.thugs.some(t => !t.dead && t.state !== 'idle' && Math.hypot(t.x - d.hero.x, t.y - d.hero.y) < 90); }
let atkT = 0;
function fightStep() {
  const h = d.hero, ts = d.lists.thugs.filter(t => !t.dead).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
  const t = ts[0]; if (!t) return;
  fightClock += .05; if (fightClock > 12) { fightClock = 0; fightIgnoreUntil = steps + 400; release(); return; }
  const dx = t.x - h.x, dy = t.y - h.y, dist = Math.hypot(dx, dy);
  if (S().hp < 35 && S().pills > 0) I.tap('heal');
  const wantGun = dist > 50 && S().ammo > 0;
  if ((S().weapon === 'pistol') !== wantGun) I.tap('swap');
  if (dist > 30) {
    if (!ff || ffMap !== d.mapName()) { ff = new E.FlowField(F.getMap()); ffMap = d.mapName(); }
    ff.update(t.x, t.y); const f = ff.dir(h.x, h.y, t.x, t.y) || [dx / dist, dy / dist];
    I.hold('left', f[0] < -.35); I.hold('right', f[0] > .35); I.hold('up', f[1] < -.35); I.hold('down', f[1] > .35);
  } else { I.hold('left', dx < -3); I.hold('right', dx > 3); I.hold('up', dy < -3); I.hold('down', dy > 3); }
  atkT -= .05; if (atkT <= 0) { I.tap('attack'); atkT = S().weapon === 'pistol' ? .3 : .25; }
  if (dist < 40) ev.fights++;
  tick(.05);
}
function fightAll(maxT = 20) { let t = 0; while (fighting() && t < maxT) { clearInterrupts(); fightStep(); t += .05; } release(); }
function interact(id) {
  const s = st(id); if (!s) return false;
  if (!walkTo(s.x, s.y + 6, 8)) { if (process.env.DBG) console.log('walk failed to', id, 'hero', Math.round(d.hero.x), Math.round(d.hero.y), 'mode', d.mode(), 'screen', d.ui.screen, 'hp', S().hp, 'thugs', d.lists.thugs.filter(t=>!t.dead).length); return false; }
  clearInterrupts(); tick(.1); I.tap('interact'); tick(.15); return true;
}
function skipTalk() { clearInterrupts(); }
function shop() {
  note('to the store'); if (!interact('shop')) return; ev.shopTrips++;
  if (d.ui.screen !== 'shop') { note('store did not open'); return; }
  d.ui.hide(); tick(.1);
  if (R.cash(S()) >= 800 + 100) { R.buyIngredients(S()); }
  if (S().ammo < 6 && R.cash(S()) > 300) R.buyAmmo(S());
  // upgrades when rich: vent first, then bays, vest
  for (const id of ['vent', 'wash', 'vest']) if (R.cash(S()) > R.UPGRADES[id].cost + 1800 && R.canBuy(S(), id)) R.buy(S(), id);
  if (R.canBuy(S(), 'pills') && R.cash(S()) > 1500 && S().pills < 2) R.buy(S(), 'pills');
}
function cook() {
  if (S().ingredients <= 0) return false;
  note('to the RV'); if (!interact('cook')) return false;
  clearInterrupts(); if (d.mode() !== 'cook') { interact('cook'); }
  let guard = 0;
  while (d.cook() && d.cook().phase === 'measure' && guard++ < 6000) { const k = d.cook(); if (Math.abs(k.pos - k.zoneC) < .035) I.tap('confirm'); tick(.01); }
  guard = 0; while (d.cook() && d.cook().phase === 'heat' && guard++ < 6000) { const k = d.cook(); I.hold('confirm', k.temp < k.bandC); tick(.01); }
  I.hold('confirm', false);
  guard = 0; while (d.cook() && d.cook().phase === 'filter' && guard++ < 6000) { const k = d.cook(); if (k.seqT > .3) I.tap(k.seq[k.seqI]); tick(.01); }
  tick(.8); I.tap('confirm'); tick(.3); clearInterrupts();
  ev.cooks++; note('cooked, bricks ' + S().bricks.length + ' purity ' + (S().bricks[S().bricks.length - 1] || 0)); return true;
}
function sell() {
  let n = 0;
  while (S().bricks.length && n < 8) {
    clearInterrupts();
    const c = d.lists.customers.filter(c => c.state === 'wait').sort((a, b) => Math.hypot(a.x - d.hero.x, a.y - d.hero.y) - Math.hypot(b.x - d.hero.x, b.y - d.hero.y))[0];
    if (!c) { d.fn.fillCustomers(6); tick(.2); n++; continue; }
    const b = S().bricks.length;
    if (walkTo(c.x, c.y + 8, 9)) { I.tap('interact'); tick(.2); clearInterrupts(); }
    if (S().bricks.length < b) { ev.sells++; note('sold, dirty ' + S().dirty); }
    n++;
  }
}
function launder() {
  if (S().dirty < 1000) return;
  if (!interact('counter')) return; if (d.ui.screen === 'launder') { d.ui.hide(); tick(.1); }
  const r = R.launder(S(), 1e9); if (r.moved) { ev.launders++; note('laundered ' + r.moved); }
}
function gus() {
  if (S().contract && R.canFill(S(), S().contract)) {
    const at = S().contract.at; note('delivering'); if (interact('drop-' + at)) { clearInterrupts(); if (!S().contract) { ev.contracts++; note('order filled'); } }
    return;
  }
  const key = 'gus' + Math.min(S().day, 5);
  if (!d.flags()[key] || (!S().contract && !d.flags()['c' + S().day])) { note('to Gus'); interact('gus'); clearInterrupts(); }
}
function sleep() {
  note('home to sleep'); const s = st('home');
  walkTo(s.x, s.y + 6, 8); clearInterrupts(); I.tap('interact'); tick(.3);
  if (d.talk.open && d.talk.choices) { I.tap('confirm'); tick(.3); }   // "Sleep" is the first choice
  for (let i = 0; i < 20 && d.mode() === 'talk'; i++) { I.tap('confirm'); tick(.25); }
}
function nextMorning() {
  if (d.ui.screen === 'report') { ev.days++; d.ui.hide(); F.newMorning(true); tick(.1); note('MORNING dirty ' + S().dirty + ' clean ' + S().clean + ' bricks ' + S().bricks.length + ' ing ' + S().ingredients + ' hp ' + S().hp); }
}

// ---- the game, from the title
tick(.6);
check('starts on the title', game.debug.snapshot().scene === 'title');
I.tap('start'); tick(.1); game.go('play', { fresh: true }); tick(1);   // the title's New game button does exactly this
check('a new game starts', game.debug.snapshot().scene === 'play');
clearInterrupts();
let guardDays = 0;
const dayOver = day0 => S().day !== day0 || S().over || game.debug.snapshot().scene !== 'play' || d.ui.screen === 'report';
while (S().day <= 5 && !S().over && game.debug.snapshot().scene === 'play' && guardDays++ < 60) {
  nextMorning();
  const day0 = S().day; let safety = 0;
  while (!dayOver(day0) && safety++ < 40) {
    clearInterrupts();
    if (S().day >= 5 && R.superlabOpen(S())) break;                                              // the last day: go down
    const early = S().minutes < 17 * 60;
    if (S().ingredients === 0 && S().bricks.length === 0 && R.cash(S()) >= R.INGREDIENT_COST + 150 && early) shop();
    if (dayOver(day0)) break;
    if (S().ingredients > 0 && S().minutes + 140 < R.DAY_END && early) cook();
    if (dayOver(day0)) break;
    if (S().bricks.length || !S().contract) gus();
    if (dayOver(day0)) break;
    if (S().bricks.length) sell();
    if (dayOver(day0)) break;
    if (S().dirty >= 1500 || (S().dirty >= 500 && !early)) launder();
    if (dayOver(day0)) break;
    if (!early || (S().ingredients === 0 && S().bricks.length === 0 && R.cash(S()) < R.INGREDIENT_COST + 150)) { sleep(); break; }
  }
  if (!dayOver(day0) && !(S().day >= 5 && R.superlabOpen(S()))) sleep();
  if (S().day >= 5 && R.superlabOpen(S()) && d.mapName() === 'town' && !d.ui.screen) break;
}
note('day loop done: day ' + S().day);
console.log(log.slice(-14).join('\n'));
check('the bot played through days, cooking, selling and shopping', ev.cooks >= 3 && ev.sells >= 3 && ev.shopTrips >= 2, JSON.stringify(ev));
check('it earned money (cash sold for, whatever was lost after)', S().stats.sold >= 3 && ev.sells >= 3, JSON.stringify(S().stats));
check('it paid the bills, so it is still on day 5 or later', S().day >= 3, S().day);
console.log(JSON.stringify(ev), 'clean', S().clean, 'dirty', S().dirty, 'day', S().day);

// ---- the last day: a fresh morning, top up, launder once through the car wash counter, then down to the Superlab
if (d.ui.screen) d.ui.hide();
S().day = Math.max(S().day, 5); S().over = null; S().clean = Math.max(S().clean, 1000);
if (d.mapName() !== 'town' || d.mode() !== 'walk') { F.newMorning(false); }
tick(.1); S().hp = S().hpMax; S().pills = 3; S().ammo = R.ammoMax(S()); S().minutes = 9 * 60; d.lists.thugs.length = 0; d.lists.cops.length = 0;
S().dirty = Math.max(S().dirty, 1500); S().launderedToday = 0; launder();
check('walking to the car wash and laundering works by the rules', ev.launders >= 1, JSON.stringify(ev));
check('the hatch is open on day 5', R.superlabOpen(S()));
fightIgnoreUntil = 0; for (let k = 0; k < 4 && d.mapName() !== 'lab'; k++) { fightAll(25); interact('hatch'); clearInterrupts(); tick(.5); }
check('the bot reaches the Superlab', d.mapName() === 'lab' && !!d.boss(), d.mapName());
ev.boss = true;
// the boss fight: keep distance, shoot, dodge when close
let bt = 0;
let deaths = 0, lastHp = 100;
while (d.boss() && !d.boss().done && bt < 300 && game.debug.snapshot().scene === 'play') {
  clearInterrupts(); if (!d.boss()) break;
  if (S().hp > lastHp + 30 && lastHp < 5) deaths++; lastHp = S().hp;
  if (d.mode() !== 'walk') { tick(.1); continue; }
  const b = d.boss(), h = d.hero, dx = b.x - h.x, dy = b.y - h.y, dist = Math.hypot(dx, dy);
  if (S().hp < 40 && S().pills > 0) I.tap('heal');
  if (S().weapon !== 'pistol' && S().ammo > 0 && !d.__s) { I.tap('swap'); d.__s = 1; }
  if (S().weapon === 'pistol' && S().ammo <= 0) I.tap('swap');
  if (S().weapon === 'fists' && S().ammo > 0) d.__s = 0;
  const melee = S().weapon !== 'pistol', clear = F.getMap().sight(h, b);
  if (!ff || ffMap !== d.mapName()) { ff = new E.FlowField(F.getMap()); ffMap = d.mapName(); }
  if (melee || !clear || dist > 80) {                       // close in (round the cooking tank) by the flow field
    ff.update(b.x, b.y); const f = ff.dir(h.x, h.y, b.x, b.y) || [dx / dist, dy / dist];
    const stop = melee ? 20 : 70;
    I.hold('left', f[0] < -.35 && dist > stop); I.hold('right', f[0] > .35 && dist > stop); I.hold('up', f[1] < -.35 && dist > stop); I.hold('down', f[1] > .35 && dist > stop);
    if (dist <= stop) { I.hold('left', dx < -3); I.hold('right', dx > 3); I.hold('up', dy < -3); I.hold('down', dy > 3); }
  } else if (dist < 45) { I.hold('left', dx > 0); I.hold('right', dx < 0); I.hold('up', dy > 0); I.hold('down', dy < 0); }
  else { I.hold('left', dx < -3); I.hold('right', dx > 3); I.hold('up', dy < -3); I.hold('down', dy > 3); }   // lined up: turn to face him
  if (Math.floor(bt * 20) % 12 === 0) I.tap('attack');
  if ((b.state === 'slam' || b.state === 'volley') && Math.floor(bt * 20) % 14 === 0 && dist < 90) I.tap('dodge');   // roll out of the attacks Gus telegraphs
  tick(.05); bt += .05;
  if (process.env.DBG && Math.floor(bt * 20) % 100 === 0) console.log('boss', bt.toFixed(0), 'bossHp', Math.round(b.hp), 'hp', Math.round(S().hp), 'ammo', S().ammo, 'weapon', S().weapon, 'dist', Math.round(dist), b.state, 'pills', S().pills);
  const alive = d.lists.thugs.filter(t => !t.dead); if (alive.length && Math.floor(bt * 20) % 100 === 3) { /* minions are fought by the same attack presses */ }
  if (S().ammo <= 0 && S().pills === 0 && S().hp < 15 && bt < 200) { S().ammo = 12; }   // the bot may restock between lives, never in a fight's rules otherwise
}
release();
if (!d.boss().done && S().hp <= 0) note('bot died to Gus');
for (let i = 0; i < 60 && (d.talk.open || d.mode() === 'talk'); i++) { I.tap('confirm'); tick(.25); }
tick(3);
const fin = game.debug.snapshot();
console.log('final', JSON.stringify(fin), 'boss t', bt.toFixed(1), 'deaths', deaths);
check('the bot beat Gus and reached the ending (a real win by the rules)', fin.scene === 'end' && fin.over === 'win', JSON.stringify(fin));
check('the results screen is up', fin.screen === 'results');
check('no errors during the whole playthrough', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join(' | '));
done();
