/* ---- THE COLLECTION: three minutes, every envelope on the street, the Falsettis in the way (1-2 players here; up to 4 in an AI Hub round) ---- */
const ROUND = 180;
const SHOPS = [
  { key: 'fusco', who: 'gino', at: () => TOWN.at.gino, pay: [300, 450], name: 'Fusco\'s Meats' },
  { key: 'bakery', who: 'baker', at: () => TOWN.at.baker, pay: [250, 400], name: 'Dolce Vita' },
  { key: 'gabbiano', who: 'chef', at: () => TOWN.at.chef, pay: [450, 700], name: 'Il Gabbiano' },
  { key: 'laundry', who: 'laundry', at: () => TOWN.at.murray, pay: [300, 500], name: 'Spin City' },
  { key: 'sully', who: 'sully', at: () => TOWN.at.sully, pay: [400, 650], name: 'Sully\'s Pre-Owned' },
  { key: 'club', who: 'frankie', at: () => TOWN.at.frankie, pay: [500, 800], name: 'The Velvet Brass' }
];
const C = { t: 0, over: false, started: false, crewT: 0, shops: [], ended: false, lastProgress: 0, sent: 0 };
function setupCollection(o = {}) {
  enterPlace('town', { peds: 4, traffic: 3 });
  music('town');
  Object.assign(C, { t: ROUND, over: false, started: !o.hub, crewT: 8, ended: false, hub: !!o.hub, lastProgress: 0, sent: 0, waitStart: !!o.hub });
  const start = TOWN.at.gino;
  W.heroes = [makeHero('sal', start.x, start.y + 20, I, { color: E.PLAYER_COLORS[0] })]; hero().isP = true;
  if (!o.hub && game.players[1]) addCollector(game.players[1]);
  C.shops = SHOPS.map(s => { const n = npc(s.who, s.at()); const sh = { ...s, npc: n, ready: 0 };
    n.label = () => sh.ready > 0 ? 'Come back later' : shopBusy(sh) ? 'Busy (Falsettis)' : 'Collect';
    n.act = h => collectShop(sh, h); return sh; });
  W.onHeroDown = h => { game.after(2.5, () => { const s = TOWN.at.gino, cut = Math.round(h.cash * .25 / 5) * 5; h.cash -= cut; h.hp = h.max; h.dead = 0; h.x = s.x; h.y = s.y + 20; h.inv = 2; if (cut) toast('Patched up', 'The Falsettis took a cut: ' + money(cut)); }); };
  setObj('The Collection', 'Collect envelopes · beat the Falsettis · most cash wins', null, '');
  if (o.hub && !C.readySent) { C.readySent = true; try { AIHub.ready(); } catch (e) { /* no hub */ } }
}
function addCollector(input) { const h0 = hero(), n = makeHero('nicky', h0.x + 16, h0.y, input, { color: E.PLAYER_COLORS[1] }); n.isP = true; n.ammo = 12; W.heroes.push(n); return n; }
const shopBusy = sh => W.foes.some(f => !f.dead && dist(f, sh.npc) < 110);
function collectShop(sh, h) {
  if (C.over || !C.started) return;
  if (sh.ready > 0) { toast(sh.name, 'Already paid. Come back in ' + Math.ceil(sh.ready) + ' s'); return; }
  if (shopBusy(sh)) { toast(sh.name, 'Not with the Falsettis standing here'); return; }
  const amt = Math.round(rnd(sh.pay[0], sh.pay[1]) / 10) * 10;
  h.cash += amt; sh.ready = 40; A.sfx('cash'); P.text(sh.npc.x, sh.npc.y, 30, '+' + money(amt), '#8af07a', { scale: 2, bounce: true });
  babble('a', sh.who); babble('o', sh.who);
}
function crewArrives() {
  const sh = pick(C.shops), a = sh.npc, n = 2 + Math.floor((ROUND - C.t) / 60), kinds = ['goon', 'goon', 'gunman', 'bruiser'];
  for (let i = 0; i < n; i++) { const ang = rnd(0, TAU), x = clamp(a.x + Math.cos(ang) * 60, 2 * T, 57 * T), y = clamp(a.y + 20 + Math.abs(Math.sin(ang)) * 30, 2 * T, 42 * T); spawnFoe(kinds[Math.min(kinds.length - 1, Math.floor(Math.random() * (1 + (ROUND - C.t) / 50)))], x, y, { wake: .6 }); }
  toast('Falsettis', 'A crew is leaning on ' + sh.name);
}
function updateCollection(dt) {
  if (C.ended) return;
  if (C.hub && C.waitStart) { const t = AIHub.time(); if (t >= 0) { C.waitStart = false; C.started = true; } else return; }
  if (!C.started || C.over) return;
  C.t -= dt;
  for (const sh of C.shops) sh.ready = Math.max(0, sh.ready - dt);
  C.crewT -= dt; if (C.crewT <= 0) { C.crewT = rnd(14, 22); crewArrives(); }
  if (C.t <= 0) { C.t = 0; finishCollection(); }
}
function finishCollection() {
  if (C.over) return; C.over = true;
  const results = W.heroes.map(h => ({ name: h.who === 'sal' ? (W.heroes.length > 1 ? 'P1 SAL' : 'SAL') : 'P2 NICKY', cash: h.cash, kills: h.kills || 0, color: h.color }));
  if (C.hub) { try { AIHub.result({ score: hero().cash, stats: { Cash: money(hero().cash), 'Falsettis down': hero().kills || 0 } }); } catch (e) { /* the hub is gone */ } banner('TIME', 'Cash: ' + money(hero().cash), 99); return; }
  music('win');
  game.after(2, () => game.go('results', { results }));
  banner('TIME!', 'Count it up', 2);
}
function collectHud() {
  const st = { counts: W.heroes.map(h => [h.who === 'sal' ? 'Sal' : 'Nicky', money(h.cash)]), objective: { title: C.waitStart ? 'Get ready' : 'The Collection', text: C.waitStart ? 'The round starts with the hub\'s countdown' : 'Envelopes at six shops · the Falsettis drop cash', step: Math.floor(C.t / 60) + ':' + String(Math.floor(C.t % 60)).padStart(2, '0') } };
  return st;
}

/* ---- THE ATTRACT MODE: Sal on autopilot, unkillable, showing the town, a brawl, the pistol, the car, the woods and the couch ---- */
const AP = { script: null, t: 0, view: 0 };
const goalDir = (h, p) => { const a = Math.atan2(p.y - h.y, p.x - h.x); return { gx: Math.cos(a), gy: Math.sin(a) }; };
function autoFight(h) {
  let f = null, fd = 1e9; for (const e of W.foes) if (!e.dead) { const d = dist(h, e); if (d < fd) { fd = d; f = e; } }
  if (!f) return {};
  const a = angTo(h, f), seen = W.map.los(h.x, h.y, f.x, f.y);
  if (!seen) { const n = navAngle(h, f); return { gx: Math.cos(n), gy: Math.sin(n), sprint: true }; }
  const rounds = h.god || (h === hero() ? S.ammo : h.ammo) > 0;
  if (rounds && (FOE_KINDS[f.kind].ranged || fd > 70)) return { gx: Math.cos(a) * (fd > 120 ? 1 : 0), gy: Math.sin(a) * (fd > 120 ? 1 : 0), fire: true, aim: a };
  if (fd > 20) return { gx: Math.cos(a), gy: Math.sin(a), sprint: true };
  const r = Math.random();
  return r < .08 ? { kick: true } : r < .1 ? { dodge: true, gx: -Math.cos(a), gy: -Math.sin(a) } : r < .3 ? { block: true } : { attack: true, consume() {} };
}
function* walkTo(h, p, near = 10, o = {}) { h.auto = h => Object.assign(goalDir(h, p), { sprint: o.sprint }); yield E.any([E.until(() => dist(h, p) < near), o.max || 12]); h.auto = () => ({}); }
function* driveTo(h, pts) {
  for (const p of pts) {
    h.auto = h => { const c = h.car; if (!c) return {}; const a = Math.atan2(p.y - c.y, p.x - c.x), da = E.angDiff(c.angle, a); return { steer: clamp(da * 2.2, -1, 1), gas: Math.abs(da) < 1.2 || Math.abs(c.speed) < 30, brake: Math.abs(da) > 1.4 && c.speed > 80 }; };
    yield E.any([E.until(() => dist(h.car || h, p) < 26), 9]);
  }
  h.auto = h => ({ brake: true }); yield 1; h.auto = h => ({ interact: true }); yield; h.auto = () => ({});
}
function* attractDemo() {
  const h = hero();
  banner('THE BARITONES', 'Demo · press any button', 3);
  yield 1.2;
  // the morning: the robe, the ducks
  yield* walkTo(h, { x: 13.4 * T, y: 6 * T }, 10);
  for (const d of W.ducks) d.fed = 6; A.sfx('quack'); P.bits(15 * T, 5 * T, 4, 8, ['#d89a4a', '#f0d090']);
  convo([['donna', 'You\'re feeding the ducks again. In your robe.'], ['sal', 'These ducks got more class than the whole block.']]);
  yield E.any([E.until(() => !convoBusy()), 8]);
  h.robe = false; rebuildRigs(h);
  // the car: down the drive and across town
  const c = W.cars[0]; yield* walkTo(h, c, 22); enterCar(h, c); yield .5;
  game.setView('iso'); game.note('ISO VIEW');
  yield* driveTo(h, [{ x: 7.5 * T, y: 15 * T }, { x: 23 * T, y: 15.5 * T }, { x: 23 * T, y: 27.5 * T }, { x: 31 * T, y: 28.5 * T }]);
  game.setView('threequarter'); game.note('THREE-QUARTER VIEW');
  // a brawl outside Il Gabbiano
  music('fight'); banner('THE FALSETTIS', 'Fists, feet, a roll and a block', 2.4);
  for (let k = 0; k < 4; k++) spawnFoe(k === 3 ? 'bruiser' : 'goon', 31 * T + (k - 1.5) * 26, 25.5 * T, { wake: .5 });
  h.auto = autoFight; yield E.any([E.until(() => allDead()), 22]);
  // the pistol
  banner('THE PISTOL', 'Aim with the mouse or the right stick', 2.4);
  for (let k = 0; k < 3; k++) spawnFoe('gunman', 26 * T + k * 40, 19.5 * T + (k % 2) * 90, { wake: .4 });
  yield E.any([E.until(() => allDead()), 16]);
  music('town'); h.auto = () => ({});
  game.setView('topdown'); game.note('TOP-DOWN VIEW');
  yield* walkTo(h, TOWN.at.laundry, 22, { sprint: true });
  // the stare-down
  W.mini = stareDown('laundry', () => {}); W.mini.auto = true; yield E.until(() => !W.mini);
  game.setView('threequarter');
  // the Pine Barrens, in the snow
  fadeOut = 1; yield .6;
  enterPlace('barrens', {}); W.heroes = [h]; h.x = BARRENS.at.hero.x; h.y = BARRENS.at.hero.y; h.car = null; game.cam.snap = true; music('barrens'); fadeOut = 0;
  banner('PINE BARRENS', 'Snow, fire barrels, footprints', 2.6);
  yield* walkTo(h, { x: 10 * T, y: 13 * T }, 14);
  yield* walkTo(h, { x: 20 * T, y: 22 * T }, 14);
  for (let k = 0; k < 3; k++) spawnFoe('goon', 24 * T + k * 20, 24 * T, { wake: .4 });
  h.auto = autoFight; yield E.any([E.until(() => allDead()), 14]); h.auto = () => ({});
  // the panic attack
  W.mini = panicAttack(() => {}, { auto: true }); yield E.until(() => !W.mini);
  yield 1;
  return 'done';
}
