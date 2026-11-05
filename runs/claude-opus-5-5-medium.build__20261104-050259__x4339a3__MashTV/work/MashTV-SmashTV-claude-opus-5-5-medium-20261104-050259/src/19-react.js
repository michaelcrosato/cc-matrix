// ---------------------------------------------------------------- the broadcast layer: host lines, banners, pop-ups, and the event -> reaction table
MT.lines = {
  queue: [], current: null, lastQuip: -99, pools: {},
  allowed(prio) { const ch = MT.game && MT.game.settings.chatter || 'Normal'; if (MT.CHEATS.muteHost && prio < 3) return false; if (ch === 'Off') return prio >= 3; if (ch === 'Less') return prio >= 2; return true; },
  say(speaker, text, o = {}) {
    const prio = o.prio || 1; if (!this.allowed(prio)) { if (o.onDone) o.onDone(); return; }
    if (prio === 1) { const t = MT.game ? MT.game.real : 0; if (t - this.lastQuip < 6 || this.current || this.queue.length) return; this.lastQuip = t; }
    const L = { speaker, text: MT.fill(text, o.vars), prio, hint: o.hint || null, onDone: o.onDone || null, t: 0 };
    if (prio >= 2) { this.queue = this.queue.filter(q => q.prio >= prio); if (this.current && this.current.prio < prio) this.finish(); }
    this.queue.push(L); this.queue.sort((a, b) => b.prio - a.prio);
  },
  sayAll(list, o = {}) { list.forEach(([sp, tx], i) => this.say(sp, tx, Object.assign({}, o, { prio: o.prio || 2, onDone: i === list.length - 1 ? o.onDone : null }))); },
  pool(id, sp = 'LANCE', o = {}) {
    const P = MT.TEXT.pools[id]; if (!P) return;
    let bag = this.pools[id]; if (!bag || !bag.length) bag = this.pools[id] = MT.shuffle(P.map((_, i) => i), 'fx');
    this.say(sp, P[bag.shift()], o);
  },
  start(L) {
    this.current = L; L.t = 0;
    const voice = MT.TEXT.voices[L.speaker] || (/^P\d/.test(L.speaker) ? 'contestant' + L.speaker[1] : 'lance');
    const vd = MT.babble.say(L.text, voice);
    L.typeDur = Math.max(L.text.length / 45, vd); L.dur = L.typeDur + 1.1;
    if (MT.game && MT.game.audio && MT.game.audio.song) MT.game.audio.duck(true);
  },
  finish() { const L = this.current; this.current = null; if (MT.game && MT.game.audio) MT.game.audio.duck(false); if (L && L.onDone) L.onDone(); },
  skip() { if (this.current) { if (this.current.t < this.current.typeDur) this.current.t = this.current.typeDur; else this.finish(); } },
  skipAll() { const q = this.queue; this.queue = []; for (const L of q) if (L.onDone) L.onDone(); this.finish(); },
  clear() { this.queue = []; this.current = null; if (MT.game && MT.game.audio) MT.game.audio.duck(false); },
  get busy() { return !!(this.current || this.queue.length); },
  update(dt) {
    if (!this.current && this.queue.length) this.start(this.queue.shift());
    const L = this.current; if (!L) return;
    L.t += dt; if (L.t >= L.dur) this.finish();
  },
  shown() { const L = this.current; if (!L) return ''; return L.text.slice(0, Math.floor(L.text.length * Math.min(1, L.t / Math.max(.01, L.typeDur)))); }
};
MT.banner = {
  list: [],
  show(text, o = {}) { this.list = this.list.filter(b => b.text !== text); this.list.push({ text, sub: o.sub || '', color: o.color || '#ffcc33', t: 0, dur: o.dur || 2, big: o.big !== false }); if (this.list.length > 3) this.list.shift(); },
  update(dt) { for (const b of this.list) b.t += dt; this.list = this.list.filter(b => b.t < b.dur); },
  clear() { this.list = []; }
};
MT.tut = {
  shown: {}, cur: null,
  show(key, actions) { if (this.shown[key] || !MT.run || MT.run.mode === 'session' || MT.run.mode === 'attract') return; this.shown[key] = true; this.cur = { key, text: MT.TEXT.tutorial[key], actions, t: 0 }; },
  update(dt) { if (this.cur) { this.cur.t += dt; if (this.cur.t > 4) this.cur = null; } },
  reset() { this.shown = {}; this.cur = null; }
};
MT.popup = (x, y, z, text, color, scale = 1) => { const g = MT.game; if (g && g.particles && !g.headless) g.particles.text(x, y, z, text, color, { scale, bounce: false }); };
MT.shake = n => { const g = MT.game; if (g && !g.headless) g.shake(n * MT.T.shakeMul); };
MT.freeze = s => { if (MT.run && MT.run.mode !== 'session' && MT.game) MT.game.freeze(s); };
MT.flash = (c, s, k) => { const g = MT.game; if (g && !g.headless) g.flash(c, s, k); };
const P = () => MT.game && MT.game.particles && !MT.game.headless ? MT.game.particles : null;
const PAL = { goon: ['#2a3a6a', '#ffcc33', '#d8a078'], clapbot: ['#9aa4b8', '#2ee6ff', '#ffcc33'], popper: ['#ff2e88', '#ffcc33', '#2ee6ff'], mime: ['#ffffff', '#101014', '#ff3344'],
  disco: ['#c8d0e0', '#ffffff', '#ff2e88'], heckler: ['#2a8a4a', '#c8202a', '#ffcc33'], hecklerKing: ['#c8202a', '#ffcc33', '#ffffff'], tank: ['#e8c020', '#5a5a6a', '#ff6a20'],
  snake: ['#2a2a32', '#e8c020', '#c8d0e0'], seg: ['#e8c020', '#3a3a3a'], brute: ['#9a6a3a', '#ffcc33', '#c8202a'], crate: ['#c84a2a', '#ffcc33'], lock: ['#c8d0e0', '#5a6070'] };
MT.react = {
  on(name, d, W) { const f = this.T[name]; if (f) f(d, W); },
  T: {
    shot: d => MT.sfx({ blaster: 'pew', spread: 'triple', rockets: 'rocket', popcorn: 'thunk', laser: 'hum' }[d.w] || 'pew', { vol: .8 }),
    swish: () => MT.sfx('swish'), hop: () => MT.sfx('hop', { vol: .5 }), fuse: () => MT.sfx('hiss'), beep: () => MT.sfx('beep'), shimmer: () => MT.sfx('shimmer'), zap: () => MT.sfx('zap'),
    whine: () => MT.sfx('whine'), shellFire: d => { MT.sfx('shell'); P() && P().smoke(d.x, d.y, 12, 3); }, hiss: () => MT.sfx('hiss'), stomp: d => { MT.sfx('stomp'); MT.shake(1.5); P() && P().dust(d.x, d.y, 0, 6); },
    roar: d => { MT.sfx('roar'); MT.shake(2); }, crash: d => { MT.sfx('crash'); MT.shake(4); P() && P().dust(d.x, d.y, 0, 14); }, leap: () => MT.sfx('whoosh'), thud: d => { MT.sfx('land'); P() && P().dust(d.x, d.y, 0, 8); },
    throw: () => MT.sfx('swish'), splat: d => { MT.sfx('splat'); P() && P().bits(d.x, d.y, 2, 8, ['#c8202a', '#ff6a6a']); },
    pop: d => { MT.sfx('pop'); if (P()) P().bits(d.x, d.y, 8, d.big ? 24 : 10, ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a']); }, popcorn: d => { MT.sfx('kernel'); P() && P().bits(d.x, d.y, 4, 10, ['#fff4c0', '#ffcc33']); },
    boom: (d, W) => { MT.sfx(d.big ? 'bigboom' : 'boom', { vol: d.small ? .6 : 1 }); if (P()) P().explosion(d.x, d.y, 6, d.big ? 1.4 : d.small ? .6 : 1, { freeze: false, shake: 0 }); MT.shake(d.big ? 5 : d.small ? 1 : 2.5); },
    spark: d => P() && P().sparks(d.x, d.y, 10, 3, 0),
    hit: d => { if (P() && MT.fxr() < .6) P().sparks(d.x, d.y, 10, 2, MT.fxr() * 6.28); if (MT.fxr() < .4) MT.sfx('tink', { vol: .5 }); },
    tink: d => { MT.sfx('tink'); P() && P().sparks(d.x, d.y, 10, 2, 0); },
    die: (d, W) => {
      MT.sfx('confetti'); const conf = MT.game && MT.game.settings.confetti === 'Tasteful' ? .4 : 1;
      if (P()) P().bits(d.x, d.y, 8, Math.round((d.big ? 30 : 14) * conf), PAL[d.k] || ['#ff2e88', '#ffcc33']);
      if (W && W.arena) for (let i = 0; i < 4 * conf; i++) W.arena.confetti.push({ x: d.x + (MT.fxr() - .5) * 20, y: d.y + (MT.fxr() - .5) * 20, c: (PAL[d.k] || ['#ffcc33'])[i % 2], t: 8 });
      if (d.cash) MT.popup(d.x, d.y, 18, '+' + MT.money(d.cash), d.slot >= 0 ? MT.COLORS.p[d.slot] : '#ffcc33');
      if (d.big) { if (P()) P().explosion(d.x, d.y, 8, 1, { freeze: false, shake: 0 }); MT.shake(4); MT.freeze(.03); }
      if (W && W.arena && W.arena.confetti.length > 160) W.arena.confetti.splice(0, 40);
      if (MT.fxr() < .08) MT.babble.crowd('cheer', .3);
    },
    spawn: (d) => {
      const k = d.kind === 'discoBig' ? 'disco' : d.kind === 'hecklerKing' ? 'heckler' : d.kind;
      if (!MT.run || MT.run.mode === 'attract' || MT.run.mode === 'session' || MT.run.introduced[k] || !MT.TEXT.intros[k]) return;
      MT.run.introduced[k] = true; const [line, hint] = MT.TEXT.intros[k]; MT.lines.say('LANCE', line, { prio: 2, hint });
    },
    crate: d => { MT.sfx('crash', { vol: .6 }); P() && P().bits(d.x, d.y, 6, 14, ['#c84a2a', '#ffcc33', '#5a2a10']); },
    vault: d => { MT.sfx('bigboom'); MT.shake(4); MT.banner.show('THE VAULT IS OPEN!'); },
    keyDrop: d => { MT.sfx('chime'); P() && P().glints(d.x, d.y, 10, 8, '#ffe060'); },
    cash: d => { MT.sfx('kaching', { vol: .7 }); MT.popup(d.x, d.y, 14, '+' + MT.money(d.v), MT.COLORS.p[d.slot] || '#ffcc33'); },
    prize: d => { MT.music.sting('stPrize'); MT.banner.show(MT.fill(MT.TEXT.banners.won, { PRIZE: d.name }), { sub: '(' + MT.money(d.v) + ')', color: '#ff8ad8' }); MT.lines.pool('prizeP', 'PENNY', { vars: { PRIZE: d.name } }); MT.babble.crowd('cheer', .5); },
    key: d => { MT.music.sting('stKey'); MT.banner.show(MT.fill(MT.TEXT.banners.key, { N: d.n }), { color: '#ffe060' }); if (d.n <= 2) MT.lines.pool('key', 'LANCE', { prio: 2 }); MT.babble.crowd('cheer', .7); },
    keySession: d => { MT.music.sting('stKey'); MT.popup(d.x, d.y, 16, '+$10,000', '#ffe060', 2); },
    powerup: d => { MT.sfx('powerup'); const W2 = MT.WEAPONS[d.w] || MT.ADDONS[d.w]; MT.popup(d.x, d.y, 30, W2.name, W2.color); if (d.w === 'shield') MT.sfx('shieldUp'); if (d.w === 'speed') MT.sfx('squeak'); if (d.w === 'records') MT.sfx('whirr'); },
    item: () => MT.sfx('zip', { vol: .5 }),
    bombGet: d => { MT.sfx('flashbulb', { vol: .5 }); MT.popup(d.x, d.y, 20, 'SHOWSTOPPER +1', '#ffffff'); },
    extraLife: d => { MT.music.sting('stOneup'); MT.banner.show(MT.TEXT.banners.encore, { color: '#ffe060' }); MT.lines.pool('extraLife', 'LANCE', { prio: 2 }); },
    statue: d => { MT.music.sting('stBossDown'); MT.banner.show('THE NETWORK IS YOURS!', { sub: '+' + MT.money(d.v), dur: 3 }); MT.lines.say('PENNY', 'YOU OWN THE SHOW NOW!', { prio: 3 }); MT.babble.crowd('cheer', 1); },
    statueRise: () => { MT.sfx('powerup'); MT.banner.show('THE GOLDEN STATUETTE!', { color: '#ffe060' }); },
    papFlash: () => { MT.sfx('shutter'); MT.flash('#ffffff', .15, .5); },
    bomb: d => { MT.sfx('flashbulb'); MT.sfx('bigboom'); MT.flash('#ffffff', .12); MT.shake(6); MT.freeze(.08); if (P()) { P().ring(d.x, d.y, 10, 300, '#ffffff', .4); for (let i = 0; i < 20; i++) P().glints(MT.fxr() * 368, MT.fxr() * 240, 10, 2, '#ffffff'); } MT.babble.crowd('cheer', .8); },
    boatStart: () => MT.sfx('flourish'),
    showboat: d => { MT.popup(d.x, d.y, 34, 'STYLE +' + Math.round(d.gain), '#2ee6ff', 2); MT.babble.crowd('cheer', Math.min(1, d.gain / 24)); if (d.gain >= 10) MT.lines.pool('showboat'); },
    slide: d => { MT.sfx('whoosh'); P() && P().dust(d.x, d.y, 0, 6); },
    hurt: (d, W) => { MT.sfx('buzzer'); MT.babble.crowd('ooh', .5); MT.shake(3); MT.freeze(.03); if (W) W.ratings.lose(12); if (P()) P().impact(d.x, d.y, 14, 1, '#ffffff'); if (d.hp === 1 && MT.maxHp() > 1) MT.lines.pool('lowHp', 'LANCE', { prio: 2 }); else MT.lines.pool('hurt'); },
    death: (d, W) => { MT.sfx('wah'); MT.babble.crowd('laugh', .6); if (W) W.ratings.lose(25); MT.banner.show(MT.TEXT.banners.mashed, { color: '#ff3344' }); if (P()) P().bits(d.x, d.y, 10, 40, [MT.COLORS.p[d.slot], '#ffffff', '#ffcc33']); MT.lines.pool('death', 'LANCE', { prio: 2, vars: { NAME: d.name } }); MT.shake(5); },
    respawn: () => MT.sfx('zip'), landed: d => { MT.sfx('land'); P() && P().dust(d.x, d.y, 0, 10); },
    out: () => MT.sfx('wah'),
    continueOne: () => { MT.sfx('bell'); MT.banner.show('THE NETWORK TAKES ITS CUT!', { color: '#ff8ad8' }); },
    addonEnd: () => MT.sfx('expire'), wpnEnd: () => { MT.sfx('expire'); MT.banner.show(MT.TEXT.banners.basics, { dur: 1.2, big: false, color: '#c8d0e0' }); },
    confettiCannon: () => { MT.sfx('boom', { vol: .5 }); if (P()) for (const x of [-10, 378]) P().bits(x, 120, 30, 30, ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a']); },
    stunt: () => { MT.sfx('alarm'); MT.banner.show(MT.TEXT.banners.stunt, { color: '#ff3344' }); MT.lines.pool('stunt', 'LANCE', { prio: 2 }); MT.babble.crowd('boo', .6); },
    mash: () => { MT.music.sting('stMash'); },
    roomEnter: (d, W) => { if (!d.boss && W && W.mode !== 'attract') MT.later(1.4, () => MT.lines.pool('roomStart', 'LANCE', { prio: 1 })); },
    wave: (d, W) => { if (!W || !W.tutorial || !MT.run) return; if (d.i === 0) MT.tut.show('move', ['move', 'aim']); if (d.i === 2) MT.tut.show('boat', ['showboat']); if (d.i === 3) MT.tut.show('slide', ['slide']); },
    cageOpen: () => { MT.music.sting('stPrize'); MT.banner.show('THE CAGE IS OPEN!', { color: '#ffe060' }); },
    finaleBurst: () => { MT.banner.show('FINALE BURST!', { color: '#ff6a20' }); MT.sfx('alarm'); },
    clear: (d, W) => { MT.music.sting('stClear'); MT.banner.show(MT.TEXT.banners.clear, { sub: '+' + MT.money(d.bonus) + (d.fast ? ' SPEED BONUS!' : ''), dur: 2.4 }); MT.babble.crowd('applause', .8); if (!d.boss && W && W.mode !== 'attract') MT.lines.pool('roomClear', 'LANCE', { prio: 2 }); },
    exits: (d, W) => { MT.sfx('rollup'); if (W && W.tutorial) MT.tut.show('door', []); },
    hurry: () => { MT.banner.show(MT.TEXT.banners.hurry, { color: '#ff3344' }); MT.lines.pool('hurry', 'LANCE', { prio: 2 }); MT.sfx('alarm'); },
    exitChosen: () => MT.sfx('go'),
    prime: () => { MT.music.sting('stPrime'); MT.music.layer('prime', 1, .3); MT.banner.show(MT.TEXT.banners.prime, { sub: '5X CASH!', color: '#ff2e88', dur: 2.6 }); MT.lines.pool('prime', 'LANCE', { prio: 2 }); MT.babble.crowd('cheer', 1); },
    primeEnd: () => MT.music.layer('prime', 0, 1),
    multi: d => { MT.popup(MT.W ? MT.W.contestants[0].x : 184, MT.W ? MT.W.contestants[0].y : 120, 40, 'MULTI-MASH x' + d.n, '#ff2e88', 2); MT.lines.pool('multi'); },
    // bosses
    bossIntro: d => { MT.music.play('bossShowdown', { fade: .5 }); MT.lines.sayAll(MT.TEXT.boss[d.kind + 'Intro'], { prio: 3 }); MT.sfx('slam'); MT.shake(4); },
    cannon: () => MT.sfx('thunk'), ring: () => MT.sfx('zap'), rev: () => MT.sfx('roar'),
    mashyArms: () => MT.music.layer('phase2', 1, .5), mashyMad: () => { MT.lines.sayAll(MT.TEXT.boss.mashyMad, { prio: 3 }); MT.babble.crowd('ooh', .8); },
    armOff: d => { MT.sfx('bigboom'); P() && P().explosion(d.x, d.y, 18, 1.2, { freeze: false, shake: 0 }); MT.shake(5); MT.freeze(.05); },
    partDown: d => { MT.sfx('boom'); if (P()) P().explosion(d.x, d.y, 14, .9, { freeze: false, shake: 0 }); MT.shake(3); MT.freeze(.03); },
    bossDie: d => { MT.music.play(null, { fade: 1.5 }); MT.flash('#ffffff', .3); MT.shake(8); const k = { mashy: 'mashyDie', wheel: 'wheelDie', lance: 'networkDie' }[d.kind]; MT.lines.sayAll(MT.TEXT.boss[k], { prio: 3 }); MT.babble.crowd('cheer', 1); },
    bossBurst: d => { MT.music.sting('stBossDown'); MT.flash('#ffffff', .2); if (P()) P().bits(d.x, d.y, 20, 80, d.kind === 'mashy' ? ['#f0e0b0', '#fff7e8', '#d8b070'] : ['#ffcc33', '#ff2e88', '#ffffff']); MT.babble.crowd('applause', 1); },
    spin: () => MT.music.sting('stDrumroll'), wheelClick: () => MT.sfx('click'),
    wheelLand: d => { MT.banner.show(d.name + '!', { color: '#ffcc33', dur: 1.8 }); MT.lines.say('LANCE', d.name + '!', { prio: 2 }); MT.sfx('bell'); },
    bankrupt: () => { MT.music.sting('stBankrupt'); MT.banner.show(MT.TEXT.banners.bankrupt, { color: '#ff3344' }); MT.babble.crowd('laugh', .7); },
    jackpot: () => { MT.banner.show(MT.TEXT.banners.jackpot, { color: '#ffe060' }); MT.lines.pool('jackpot', 'LANCE', { prio: 2 }); MT.sfx('kaching'); },
    spinAgain: () => MT.banner.show(MT.TEXT.banners.spinAgain, { color: '#22c55e', dur: 1.2 }),
    puff: d => { MT.sfx('pfft', { vol: .5 }); P() && P().smoke(d.x, d.y, 4, 4, { color: '#ffffff' }); },
    wheelLoose: () => { MT.lines.sayAll(MT.TEXT.boss.wheelLoose, { prio: 3 }); MT.music.layer('phase2', 1, .5); MT.sfx('crash'); MT.shake(6); },
    segVoid: d => MT.popup(184, 60, 40, 'VOID', '#5a4a6a', 2),
    cyclone: () => MT.sfx('whirr'), micDrop: () => MT.sfx('whoosh'), slam: d => { MT.sfx('bigboom'); MT.shake(7); P() && P().dust(d.x, d.y, 0, 20); }, sweep: () => MT.sfx('shimmer'),
    commercial: () => { MT.banner.show(MT.TEXT.banners.back, { color: '#ffcc33', dur: 3 }); MT.lines.sayAll(MT.TEXT.boss.commercial, { prio: 3 }); MT.music.sting('stJingle'); },
    backFromBreak: () => MT.lines.say('LANCE', 'AND WE\'RE BACK!', { prio: 2 }),
    lanceDown: () => { MT.lines.sayAll(MT.TEXT.boss.lanceDown, { prio: 3 }); MT.music.play(null, { fade: .8 }); MT.sfx('static'); },
    robotReveal: () => { MT.banner.show(MT.TEXT.banners.robot, { color: '#ff3344', dur: 3 }); MT.lines.sayAll(MT.TEXT.boss.robot, { prio: 3 }); MT.babble.crowd('ooh', 1); },
    networkReveal: () => { MT.banner.show(MT.TEXT.banners.network, { color: '#ff3344', dur: 2.5 }); MT.lines.sayAll(MT.TEXT.boss.network, { prio: 3 }); MT.music.play('bossShowdown', { fade: .5, restart: true }); MT.later(.5, () => MT.music.layer('phase2', 1, 1)); MT.sfx('static'); MT.shake(5); },
    channel: () => MT.sfx('channel'), eyeFire: () => MT.sfx('zap'), tvDown: d => { MT.sfx('boom'); MT.sfx('static', { vol: .4 }); P() && P().sparks(d.x, d.y, 20, 10, -1.57); },
    signalLost: () => { MT.banner.show(MT.TEXT.banners.signal, { color: '#ffffff', dur: 3 }); MT.sfx('static'); MT.flash('#ffffff', .5); }
  }
};
MT.on('door', d => { if (d.state === 'opening') { MT.sfx('rollup', { vol: .5 }); if (MT.fxr() < .5) MT.sfx('klaxon', { vol: .5 }); } else MT.sfx('slam', { vol: .5 }); });
MT.on('conveyorWarn', () => MT.sfx('alarm'));
MT.on('pyro', () => MT.sfx('pyro', { vol: .6 }));
// a timer on real time that survives scene changes (lines after a beat)
MT._later = [];
MT.later = (s, fn) => { MT._later.push({ t: s, fn }); };
MT.laterTick = dt => { for (const l of MT._later) { l.t -= dt; if (l.t <= 0) { l.done = true; l.fn(); } } MT._later = MT._later.filter(l => !l.done); };
