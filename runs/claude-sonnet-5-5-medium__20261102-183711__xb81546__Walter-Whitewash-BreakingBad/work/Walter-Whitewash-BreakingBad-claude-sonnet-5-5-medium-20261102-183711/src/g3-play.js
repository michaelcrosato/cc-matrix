// ===== part 3: the player, the cook, the shop, the car wash, the contracts, the days ===========================

function heat(n) {
  const before = R.heatLevel(S.heat); R.addHeat(S, n); const after = R.heatLevel(S.heat);
  if (after > before && !auto) { toast('HEAT: ' + R.heatName(S.heat), after >= 3 ? 'Every cop in town is looking for you.' : 'The street is getting nervous.', 2.4); game.audio.sfx('alert'); }
}

// ---- hurt, down, busted -------------------------------------------------------------------------------------------------------
function hurtHero(dmg, from, kb, dot) {
  if (auto && auto.cheat) return;
  if (dot) { S.hp -= dmg * R.armor(S); fx.hurt = .1; }
  else {
    if (fx.iFrames > 0 || mode !== 'walk') return;
    const d = R.damage(S, dmg, diff()); S.hp -= d; fx.iFrames = .55; fx.hurt = .3; shake(3); game.audio.sfx('hurt');
    game.particles.text(hero.x, hero.y, 30, '-' + d, '#ff6a4a', { scale: 1.5, bounce: true });
    game.particles.bits(hero.x, hero.y, 12, 5, ['#a82020']);
    if (from && kb) { const a = ang(from, hero); hero.push(Math.cos(a) * kb, Math.sin(a) * kb, 0); }
    game.input.rumble && game.input.rumble(.5, .15);
  }
  if (S.hp <= 0) { S.hp = 0; knockedOut(); }
}
function knockedOut() {
  if (mode === 'cut') return;
  mode = 'cut';
  if (mapName === 'lab') {
    game.flash('#ff2020', .4, .9); converse([['narrator', 'The lights go out. You wake up at the top of the ladder, with Gus\'s voice from the dark: "Try again."']], () => { S.hp = S.hpMax; S.pills = Math.max(S.pills, 2); S.ammo = R.ammoMax(S); loadWorld('lab'); placeHero('hero'); spawnBoss(); mode = 'walk'; });
    return;
  }
  const r = R.knockedOut(S); game.flash('#ff2020', .4, .9); game.audio.sfx('die');
  converse([['narrator', 'Everything goes white. Then a ceiling, and a nurse who says you were out for hours. You lose ' + money(r.lost) + ' to "hospital fees".']], () => finishDay('hospital'));
}
function arrest(cop) {
  if (mode !== 'walk') return;
  mode = 'cut'; game.audio.sfx('alert'); game.flash('#2a4aff', .4, .6);
  converse(W.script.bust, () => {
    const r = R.busted(S);
    converse([['narrator', r.bricks ? 'They took ' + r.bricks + ' brick' + (r.bricks > 1 ? 's' : '') + ' and ' + money(r.fine) + ' of your dirty money. Sol made bail by morning.' : 'They took ' + money(r.fine) + ' and let you go with a warning. Sol made bail by morning.']], () => finishDay('bust'));
  });
}

// ---- a day ends ------------------------------------------------------------------------------------------------------------------
function askSleep() {
  ask('Go to bed? The day ends, the bill is due (' + money(R.BILL) + '), and the game is saved.', 'narrator', ['Sleep', 'Not yet'], i => { if (i === 0) finishDay('sleep'); });
}
function finishDay(how) {
  if (auto) { mode = 'walk'; return; }   // the demo never ends a day
  if (mapName === 'lab') { S.hp = S.hpMax; }
  mode = 'cut'; game.audio.sfx('sleep'); game.audio.music(AU.songs.report, { fade: 1 });
  const rep = R.endDay(S, how); report = rep; fx.hazmat = 0; fx.loud = 0;
  if (S.over) { goEnding(S.over); return; }
  const lines = [['Earned', money(rep.earned)], ['Laundered', money(rep.laundered)], ['Bricks sold', String(rep.sold)], ['Batches cooked', String(rep.cooks)],
    ['Medical bill', rep.short > 0 ? money(rep.paid) + ' paid, ' + money(rep.short) + ' short' : money(rep.bill) + ' paid']];
  ui.show('report', {
    kicker: how === 'bust' ? 'BUSTED' : how === 'hospital' ? 'HOSPITAL' : how === 'exhaust' ? 'EXHAUSTED' : 'DAY ' + rep.day + ' DONE',
    title: how === 'bust' ? 'Out on bail' : how === 'hospital' ? 'Patched up' : 'Another day closer to the number',
    text: [W.dayLines[Math.min(rep.day - 1, W.dayLines.length - 1)], '', ...lines.map(l => l[0] + ': ' + l[1]), '', 'Clean: ' + money(S.clean) + ' / ' + money(R.GOAL) + '   Dirty: ' + money(S.dirty)],
    actions: [{ label: 'Next morning (Day ' + S.day + ')', primary: true, fn: () => { ui.hide(); newMorning(true); } }],
    back: () => {}
  });
}
function newMorning(save) {
  loadWorld('town'); placeHero('hero'); S.hp = Math.max(S.hp, 40); mode = 'walk';
  spawnCops(); fillCustomers(6); fillThugs(); fx.dodge = 0; fx.iFrames = 1; fx.hazmat = 0; game.cam.snap = true;
  if (save && !auto && !inSession) { try { game.saves.autosave(); } catch (e) { /* storage */ } }
  if (!auto) toast('DAY ' + S.day, S.day === R.LAST_DAY ? 'The last day. The number is ' + money(R.GOAL) + ' clean.' : 'Clean: ' + money(S.clean) + ' of ' + money(R.GOAL), 3.5);
}

// ---- the ending ----------------------------------------------------------------------------------------------------------------
function bossDefeated() {
  if (!boss || boss.done) return; boss.done = true; mode = 'cut'; S.bossDone = true; S.stats.kills++;
  game.audio.sfx('boom2'); game.particles.explosion(boss.x, boss.y, 12, 2); game.flash('#ffffff', .5, .9); shake(8);
  boss.rig.update(.01, { pose: 'die' });
  converse(W.script.endWin, () => goEnding('win'));
}
function goEnding(kind) {
  S.over = kind; mode = 'cut';
  if (HUB && HUB.active && kind !== 'win') reportResult();
  if (HUB && HUB.active && kind === 'win') reportResult();
  game.go('end', { kind });
}

// ---- the weapons and the walk ---------------------------------------------------------------------------------------------------
function targetsOf() { const a = lists.thugs.filter(t => !t.dead); if (boss && !boss.done) a.push(boss); return a; }
function damageTarget(e, dmg, kx, ky) {
  if (e.kind === 'boss') { e.hp -= dmg; e.flash = .1; game.hitFx(e.x, e.y, 18, { power: .8, damage: Math.round(dmg), textZ: 40 }); if (e.hp < 0) e.hp = 0; }
  else hitThug(e, dmg, kx, ky);
}
function assistAim(a, range) {
  if (!game.settings.aimAssist) return a;
  let best = null, bd = 1e9;
  for (const e of targetsOf()) { const d = dist(hero, e); if (d > range || d >= bd) continue; if (Math.abs(E.angDiff ? E.angDiff(a, ang(hero, e)) : Math.atan2(Math.sin(ang(hero, e) - a), Math.cos(ang(hero, e) - a))) < .42 && map.sight(hero, e)) { bd = d; best = e; } }
  return best ? ang(hero, best) : a;
}
function playerStep(dt, c) {
  fx.iFrames = Math.max(0, fx.iFrames - dt); fx.hurt = Math.max(0, fx.hurt - dt); fx.dodgeCd = Math.max(0, fx.dodgeCd - dt); fx.fireCd = Math.max(0, fx.fireCd - dt); fx.loud = Math.max(0, fx.loud - dt); fx.hazmat = Math.max(0, fx.hazmat - dt);
  // heal, swap
  if (c.heal && R.heal(S)) { game.audio.sfx('heal'); game.particles.text(hero.x, hero.y, 30, '+HP', '#8ad8ff', { scale: 1.5 }); }
  if (c.swap) { S.weapon = S.weapon === 'fists' ? 'pistol' : 'fists'; game.audio.sfx('select'); if (!auto) game.note(S.weapon === 'pistol' ? 'PISTOL (' + S.ammo + ' rounds)' : 'WRENCH AND FISTS'); }
  // interact before attack, so a click on a customer is a sale and not a swing
  if (mode === 'walk' && tryInteract(c)) { c.attack = false; return; }
  // dodge
  if (c.dodge && fx.dodgeCd <= 0 && fx.dodge <= 0) { fx.dodge = .22; fx.dodgeCd = .7; fx.iFrames = Math.max(fx.iFrames, .3); let dx = c.mx, dy = c.my; if (!dx && !dy) { dx = Math.cos(hero.facing); dy = Math.sin(hero.facing); } const l = Math.hypot(dx, dy) || 1; fx.dx = dx / l; fx.dy = dy / l; game.audio.sfx('whoosh'); game.particles.dust(hero.x, hero.y, 2, 5); }
  fx.dodge = Math.max(0, fx.dodge - dt);
  const hasMove = Math.hypot(c.mx, c.my) > .12, sp = c.sprint ? 104 : 70;
  if (fx.dodge > 0) { hero.vx = fx.dx * 210; hero.vy = fx.dy * 210; }
  else if (combo.busy || (fx.atkHold > 0)) { hero.vx = c.mx * 28; hero.vy = c.my * 28; }
  else { hero.vx = c.mx * sp; hero.vy = c.my * sp; }
  if (c.sprint && hasMove && fx.dodge <= 0) loud(.4);
  // facing: aim wins, else the way you walk
  let target = c.aim !== null && c.aim !== undefined ? c.aim : hasMove ? Math.atan2(c.my, c.mx) : hero.facing;
  if (S.weapon === 'pistol' && (c.attack || c.attackHeld)) target = assistAim(target, 190);
  if (!combo.busy) hero.facing = E.approachAng ? E.approachAng(hero.facing, target, 18 * dt) : target;
  // attack
  fx.atkHold = Math.max(0, (fx.atkHold || 0) - dt);
  if (S.weapon === 'fists') {
    if (c.attack && fx.dodge <= 0 && combo.press()) { game.audio.sfx('swing'); loud(1.5); fx.atkHold = .3; }
    combo.update(dt);
    combo.hits(targetsOf(), e => E.inArc(hero, hero.facing, e, 26, 1.3), e => { const a = ang(hero, e); damageTarget(e, e.kind === 'boss' ? 14 : 24, Math.cos(a), Math.sin(a)); game.audio.sfx('punch'); loud(2); });
  } else if ((c.attack || (c.attackHeld && !auto)) && fx.fireCd <= 0 && fx.dodge <= 0) {
    if (S.ammo > 0 || (auto && auto.cheat)) {
      if (!(auto && auto.cheat)) S.ammo--;
      fx.fireCd = .24; const a = hero.facing + rnd(-.03, .03);
      shots.fire({ x: hero.x + Math.cos(a) * 8, y: hero.y + Math.sin(a) * 8, z: 14, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 2, team: 'player', color: '#fff0a0', life: .9, dmg: 24 });
      game.audio.sfx('shot'); game.particles.sparks(hero.x + Math.cos(a) * 10, hero.y + Math.sin(a) * 10, 14, 4, a); shake(1.5); heat(1.5); loud(4);
    } else { fx.fireCd = .3; game.audio.sfx('dry'); if (!auto) game.note('OUT OF AMMO: BUY MORE AT THE STORE'); }
  }
  hero.update(dt, map);
  const rig = fx.hazmat > 0 ? rigFor('hazmat') : S.weapon === 'pistol' ? rigFor('waltgun') : rigFor('walt');
  heroRig = rig;
  rig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: hero.vx, vy: hero.vy, facing: hero.facing, dash: fx.dodge > 0, hurt: fx.hurt > 0, point: S.weapon === 'pistol', attack: S.weapon === 'fists' ? combo.state : undefined, stance: S.weapon === 'pistol' ? 'ready' : undefined, run: c.sprint && hasMove ? 1 : undefined });
}

// shots: the player's hurt the rivals and the boss, theirs hurt you
function shotsStep(dt) {
  shots.update(dt, map);
  shots.hit(targetsOf(), (b, t) => { const a = Math.atan2(b.vy, b.vx); damageTarget(t, b.dmg || 24, Math.cos(a), Math.sin(a)); }, 'player');
  shots.hit([hero], (b) => { hurtHero(b.dmg || 8, { x: hero.x - b.vx, y: hero.y - b.vy }, 60); }, 'enemy');
}

// ---- cooking ---------------------------------------------------------------------------------------------------------------------
let cook = null;
function startCookStation() {
  if (R.darkness(S.minutes) >= .98 || S.minutes > R.DAY_END - R.cookMinutes(S.up.vent) - 10) return converse(W.script.tooLate);
  if (!flags().jimmyMet) return converse(W.script.jimmyFirst, () => { flags().jimmyMet = 1; startCookStation(); });
  if (S.ingredients <= 0 && !S.bricks.length && R.cash(S) < R.INGREDIENT_COST && !flags()['front' + S.day]) {   // never a dead end: Jimmy fronts one batch a day
    flags()['front' + S.day] = 1; S.ingredients = 1;
    return converse([['jimmy', 'Mr. Whitewash, you are broke. It is fine, it is a whole thing. I got a guy at the hardware store. He fronts me one batch. Just one. Do not tell him I said "guy."'], ['walt', 'Thank you, Jimmy. This will be on the books.']], () => beginCook());
  }
  if (S.ingredients <= 0) return converse(W.script.noIngredients);
  beginCook();
}
function beginCook() {
  S.ingredients--; fx.hazmat = 40;
  cook = { phase: 'measure', i: 0, pos: 0, dir: 1, speed: .85, zoneC: rnd(.3, .7), zoneW: .2, mScores: [], temp: .15, bandC: .6, inBand: 0, total: 0, hT: 0, hDur: 9, seq: [], seqI: 0, seqT: 0, fHits: 0, fMiss: 0, t: 0, flashT: 0, flashMsg: '', result: null, purity: 0 };
  if (auto) { cook.hDur = 4; cook.speed = 1.5; }   // the demo cooks fast
  mode = 'cook'; game.audio.music(AU.songs.cook, { fade: .6 });
  for (let i = 0; i < 8; i++) cook.seq.push(['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]);
}
const COOK_NAMES = ['MEASURE THE BLUE SKY SOLUTION', 'MEASURE THE ACETONE', 'MEASURE THE CATALYST'];
function cookStep(dt) {
  const k = cook; if (!k) return; k.t += dt; k.flashT = Math.max(0, k.flashT - dt);
  const I = game.input, aut = auto;
  const hit = I.pressed('confirm') || I.pressed('interact') || I.pressed('attack');
  if (k.phase === 'measure') {
    k.pos += k.dir * k.speed * dt; if (k.pos > 1) { k.pos = 1; k.dir = -1; } if (k.pos < 0) { k.pos = 0; k.dir = 1; }
    if (aut) { if (Math.abs(k.pos - k.zoneC) < .02 && k.t > .4) cookStop(); } else if (hit) cookStop();
  } else if (k.phase === 'heat') {
    k.hT += dt; k.bandC = .6 + Math.sin(k.hT * .9) * .12;
    const hold = aut ? k.temp < k.bandC - .02 : I.down('confirm') || I.down('interact') || I.down('attack');
    k.temp = clamp(k.temp + (hold ? .55 : -.32) * dt + Math.sin(k.hT * 3.1) * .02 * dt * 10, 0, 1);
    k.total += dt; if (Math.abs(k.temp - k.bandC) < .1) k.inBand += dt;
    if (Math.random() < dt * 8 * (.5 + k.temp)) game.particles.add && game.particles.add({ kind: 'smoke', x: hero.x, y: hero.y - 6, z: 20 + k.temp * 10, vx: rnd(-6, 6), vy: rnd(-6, 6), vz: 12, life: 1, size: 3 });
    if (k.hT >= k.hDur) { k.phase = 'filter'; k.seqT = 0; k.flashMsg = 'HEAT ' + Math.round(k.inBand / k.total * 100) + '%'; k.flashT = 1; game.audio.sfx(k.inBand / k.total > .8 ? 'perfect' : 'confirm'); }
  } else if (k.phase === 'filter') {
    k.seqT += dt; const win = 1.7 - Math.min(.7, k.seqI * .09);
    const want = k.seq[k.seqI]; let got = null;
    if (aut) { if (k.seqT > .5) got = want; } else for (const d of ['up', 'down', 'left', 'right']) if (I.pressed(d)) got = d;
    if (got) { if (got === want) { k.fHits++; game.audio.sfx('vial'); k.flashMsg = 'GOOD'; } else { k.fMiss++; game.audio.sfx('miss'); k.flashMsg = 'WRONG'; } k.flashT = .4; k.seqI++; k.seqT = 0; }
    else if (k.seqT > win) { k.fMiss++; game.audio.sfx('miss'); k.flashMsg = 'LATE'; k.flashT = .4; k.seqI++; k.seqT = 0; }
    if (k.seqI >= k.seq.length) cookFinish();
  } else if (k.phase === 'result') {
    if (k.t > .6 && (hit || aut)) { if (!aut || k.t > 2.2) cookDone(); }
  }
}
function cookStop() {
  const k = cook, sc = R.measureScore(k.pos, k.zoneC, k.zoneW); k.mScores.push(sc);
  k.flashMsg = sc > .95 ? 'PERFECT' : sc > .6 ? 'CLOSE' : 'OFF'; k.flashT = .6; game.audio.sfx(sc > .95 ? 'perfect' : sc > .6 ? 'vial' : 'miss'); game.audio.sfx('bubble');
  k.i++; if (k.i >= 3) { k.phase = 'heat'; k.hT = 0; k.temp = .15; } else { k.zoneC = rnd(.25, .75); k.speed = .85 + k.i * .3; k.pos = 0; k.dir = 1; }
}
function cookFinish() {
  const k = cook, m = k.mScores.reduce((a, b) => a + b, 0) / 3, h = k.inBand / Math.max(.01, k.total), f = k.fHits / k.seq.length;
  k.purity = R.purity(m, h, f, S.up.vent); k.n = R.batchSize(k.purity); k.m = m; k.h = h; k.f = f; k.phase = 'result'; k.t = 0;
  game.audio.sfx(k.purity >= 90 ? 'perfect' : 'powerup');
}
function cookDone() {
  const k = cook; cook = null; mode = 'walk';
  for (let i = 0; i < k.n; i++) S.bricks.push(k.purity);
  S.cooksToday++; S.stats.cooks++; S.stats.bestPurity = Math.max(S.stats.bestPurity, k.purity); if (k.purity >= 99) S.stats.perfect++;
  R.spendMinutes(S, R.cookMinutes(S.up.vent)); heat(14 - 4 * S.up.vent); loud(3);
  game.audio.music(null); musicNow = null; game.input.consumeAll();
  const g = R.grade(k.purity);
  converse([['jimmy', k.purity >= 99 ? 'Bro. BRO. It is blue. It is actually blue. I am going to cry.' : k.purity >= 90 ? 'Yo, that is crystal! That is, like, museum quality.' : k.purity >= 75 ? 'Solid. Honestly? Solid. I would buy that.' : k.purity >= 60 ? 'It is... fine. It is street stuff. Next time, maybe less improvising?' : 'Mr. Whitewash, I think we made soap.'],
    ['walt', g === 'BLUE SKY' ? 'Ninety-nine percent. Chemistry is the study of change. Welcome to change.' : 'Purity ' + k.purity + '%. ' + k.n + ' bricks. Not bad. Not good enough.']], () => { if (S.minutes >= R.DAY_END) finishDay('exhaust'); });
}

// ---- the supply store ---------------------------------------------------------------------------------------------------------------
function openShop() {
  if (auto) return;
  const U = R.UPGRADES, acts = [];
  const cash = 'Cash: ' + money(S.dirty) + ' dirty, ' + money(S.clean) + ' clean';
  const buy = (label, can, fn) => acts.push({ label, disabled: !can, fn: () => { if (fn()) { game.audio.sfx('cash'); heat(0); } else game.audio.sfx('miss'); openShop(); } });
  buy('Batch of ingredients  ' + money(R.INGREDIENT_COST) + '  (' + S.ingredients + '/2)', S.ingredients < 2 && R.cash(S) >= R.INGREDIENT_COST, () => R.buyIngredients(S));
  buy('Pistol ammo, 12 rounds  $100  (' + S.ammo + '/' + R.ammoMax(S) + ')', S.ammo < R.ammoMax(S) && R.cash(S) >= 100, () => R.buyAmmo(S));
  buy('Pain pills  ' + money(U.pills.cost) + '  (' + S.pills + '/3)', R.canBuy(S, 'pills'), () => R.buy(S, 'pills'));
  for (const id of ['vent', 'wash', 'vest', 'pistol']) {
    const u = U[id], lvl = S.up[id];
    buy(u.name + (lvl >= u.max ? '  MAXED' : '  ' + money(u.cost) + '  (level ' + lvl + '/' + u.max + ')'), R.canBuy(S, id), () => R.buy(S, id));
  }
  acts.push({ label: 'Leave', fn: () => { ui.hide(); game.input.consumeAll(); } });
  ui.show('shop', { kicker: 'SUPPLY STORE', title: 'Ferrous & Sons Hardware', text: [cash + '. Dirty money is spent first. Everything here is legal, technically.'], actions: acts, back: () => { ui.hide(); game.input.consumeAll(); } });
}

// ---- the car wash ------------------------------------------------------------------------------------------------------------------------
function openLaunder() {
  if (auto) { const q = R.launder(S, 1e9); if (q.moved) { game.audio.sfx('cash'); game.particles.text(hero.x, hero.y, 30, '+' + money(q.clean) + ' CLEAN', '#ffd86a', { scale: 1.5, bounce: true }); toast('LAUNDERED', money(q.moved) + ' in, ' + money(q.clean) + ' clean out.', 2.5); } return; }
  const act = [], room = R.launderRoom(S);
  const go = n => ({ label: n === 'all' ? 'Launder all that fits  (' + money(Math.min(S.dirty, room)) + ')' : 'Launder ' + money(n), disabled: S.dirty <= 0 || room <= 0 || (n !== 'all' && S.dirty < n), fn: () => {
    const r = R.launder(S, n === 'all' ? 1e9 : n); if (r.moved) { game.audio.sfx('cash'); toast('LAUNDERED', money(r.moved) + ' in, ' + money(r.clean) + ' clean out.', 2.5); } else game.audio.sfx('miss'); openLaunder(); } });
  act.push(go(500), go(1000), go('all'), { label: 'Leave', fn: () => { ui.hide(); game.input.consumeAll(); } });
  ui.show('launder', { kicker: 'WHITEWASH AUTO SPA', title: 'Launder dirty cash', text: ['Dirty ' + money(S.dirty) + '   Clean ' + money(S.clean) + ' of ' + money(R.GOAL), 'Room at the car wash today: ' + money(room) + ' (' + Math.round(R.LAUNDER_FEE * 100) + '% fee)'], actions: act, back: () => { ui.hide(); game.input.consumeAll(); } });
  if (!flags().solMet) { ui.hide(); flags().solMet = 1; converse(W.script.solFirst, openLaunder); }
}

// ---- the people ---------------------------------------------------------------------------------------------------------------------------
function jimmyTalk() {
  if (!flags().jimmyMet) return converse(W.script.jimmyFirst, () => { flags().jimmyMet = 1; });
  flags().jt = (flags().jt || 0) + 1; converse(W.script.jimmyTips[(flags().jt - 1) % W.script.jimmyTips.length]);
}
function solTalk() { if (!flags().solMet) { flags().solMet = 1; converse(W.script.solFirst); } else converse(W.script.solWelcome); }
function gusTalk() {
  const d = Math.min(S.day, 5), key = 'gus' + d;
  if (!flags()[key]) {
    flags()[key] = 1;
    converse(W.script.gus[d - 1], () => { if (!S.contract) giveContract(); });
  } else if (S.contract) converse(W.script.gusReturn);
  else if (!flags()['c' + S.day] && S.minutes < R.DAY_END - 240) { giveContract(); converse([['gus', 'One more order. I like a man who finishes things.']]); }
  else converse(W.script.gusReturn);
}
function giveContract() {
  flags()['c' + S.day] = 1;
  S.contract = S.day === 1 ? { n: 3, minPurity: 70, at: 'east', deadline: 18 * 60, bonus: 1.6, day: 1 } : R.contractFor(S.day);
  toast('NEW ORDER', S.contract.n + ' bricks at ' + S.contract.minPurity + '%+ to the ' + S.contract.at + ' gate by ' + R.clockText(S.contract.deadline), 5);
  game.audio.sfx('phone');
}
function deliverContract() {
  const c = S.contract; if (!c) return;
  if (!R.canFill(S, c)) { toast('NOT ENOUGH', 'You need ' + c.n + ' bricks at ' + c.minPurity + '% purity or better.', 3); game.audio.sfx('miss'); return; }
  const pay = R.fillContract(S, c); game.audio.sfx('cash'); heat(8); loud(2);
  converse(W.script.gusPaid, () => toast('PAID', money(pay) + ' in dirty cash. Gus never counts it twice.', 3));
}
function hatchAct() {
  if (!R.superlabOpen(S)) return converse(W.script.hatchShut);
  converse(W.script.hatch, () => { game.audio.sfx('door'); loadWorld('lab'); placeHero('hero'); spawnBoss(); game.flash('#ffffff', .2, .6); converse(W.script.bossIntro, () => { boss.state = 'walk'; boss.cd = 1.2; }); });
}

// the contract's clock: fail it quietly when the deadline passes
function contractClock() {
  const c = S.contract; if (c && S.minutes > c.deadline) { S.contract = null; toast('ORDER MISSED', 'Gus does not take excuses. Next time.', 3); game.audio.sfx('miss'); heat(0); }
}
