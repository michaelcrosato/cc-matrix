// ---- reactions: gameplay emits events; this table turns them into host lines, crowd noise, stings and banners ----
// The line queue (priorities, the quip rate limit, the chatter setting) and the lower third live here too.
const PORTRAIT = {};
function portraitRig(id) {
  if (PORTRAIT[id]) return PORTRAIT[id];
  if (id === 'LANCE') PORTRAIT[id] = makeLance(1.3); else if (id === 'PENNY') PORTRAIT[id] = makePenny();
  else if (/^C\d$/.test(id)) { const s = +id[1] - 1, pr = MT.run && MT.run.players && MT.run.players[s]; PORTRAIT[id] = makeContestantRig(s, pr ? pr.look : s); }
  return PORTRAIT[id] || null;
}
MT.portraitRig = portraitRig;
function drawSpeakerPortrait(g, id, x, y, size, t) {
  const rig = portraitRig(id);
  px.rect(g, x - 1, y - 1, size + 2, size + 2, '#0c0618'); px.rect(g, x, y, size, size, '#2a1446');
  if (rig) { rig.drawPortrait(g, x, y, size, { zoom: size / 14, turn: .4, bg: '#2a1446', frame: false }); return; }
  const cx = x + size / 2, cy = y + size / 2;
  if (id === 'ANNC') { px.disc(g, cx, cy - 2, size * .22, '#c8d0e0'); px.rect(g, cx - 1, cy + 2, 2, size * .28, '#8a90a0'); for (let k = 0; k < 3; k++) px.line(g, cx - size * .16, cy - 6 + k * 3, cx + size * .16, cy - 6 + k * 3, '#5a5f70'); }
  else if (id === 'MASHY') { px.ell(g, cx, cy + 2, size * .4, size * .34, '#c8a060'); for (const sd of [-1, 1]) { px.disc(g, cx + sd * size * .14, cy - 2, size * .1, '#ffffff'); px.disc(g, cx + sd * size * .14 + Math.sin(t * 8) , cy - 1, size * .05, '#140a24'); } px.ell(g, cx, cy + size * .16, size * .16, 2 + Math.abs(Math.sin(t * 12)) * 3, '#3a0a10'); }
  else if (id === 'NETWORK') { px.ell(g, cx, cy, size * .4, size * .24, '#fff7e8'); px.disc(g, cx, cy, size * .14, '#2ee6ff'); px.disc(g, cx, cy, size * .07, '#140a24'); for (let k = 0; k < 6; k++) px.dot(g, x + Math.random() * size, y + Math.random() * size, '#ffffff'); }
  else if (id === 'SPONSOR') { px.rect(g, cx - size * .25, cy - size * .3, size * .5, size * .6, '#ff9a3c'); px.rect(g, cx - size * .2, cy - size * .2, size * .4, size * .18, '#fff7e8'); E.font.text(g, 'K', cx, cy - size * .2, '#d02a3a', { align: 'center', outline: false }); }
}
MT.drawSpeakerPortrait = drawSpeakerPortrait;
// ------------------------------------------------------------------------------------------------ the line queue
const LINES = MT.lines = { queue: [], current: null, lastQuip: -99, said: [], subtitles: true };
/** say a line: { who, text, pri (3 story, 2 important, 1 quip), hint } */
LINES.say = (who, text, pri = 1, o = {}) => {
  const chat = game && game.settings ? game.settings.chatter : 'Normal';
  if (MT.cheats.muteHost && pri < 3) return;
  if (chat === 'Off' && pri < 3) return; if (chat === 'Less' && pri < 2) return;
  const now = game ? game.real : 0;
  if (pri === 1) { if (now - LINES.lastQuip < 6 || LINES.current || LINES.queue.length) return; LINES.lastQuip = now; }
  const S = MT.TEXT.speakers[who] || MT.TEXT.speakers.LANCE;
  const L = { who, name: S.name, voice: S.voice, color: S.color, text, pri, hint: o.hint || null, t: 0, typed: 0, dur: 0, done: false, onDone: o.onDone };
  if (pri >= 3) { LINES.queue.push(L); } else { const i = LINES.queue.findIndex(q => q.pri < pri); if (i < 0) LINES.queue.push(L); else LINES.queue.splice(i, 0, L); }
  if (LINES.current && LINES.current.pri < pri && pri >= 2) LINES.current.t = Math.max(LINES.current.t, LINES.current.dur + 9);
  LINES.said.push(text); if (LINES.said.length > 200) LINES.said.shift();
  return L;
};
LINES.seq = (id, vars = {}, pri = 3) => { const seq = MT.TEXT.seq[id]; if (!seq) return null; let last = null; for (const [who, text] of seq) last = LINES.say(who, fill(text, vars), pri); return last; };
LINES.busy = () => !!LINES.current || LINES.queue.length > 0;
LINES.clear = () => { LINES.queue.length = 0; LINES.current = null; };
LINES.skip = () => { const c = LINES.current; if (!c) return; if (c.typed < c.text.length) c.typed = c.text.length, c.t = c.dur; else c.t = c.dur + 99; };
LINES.portrait = (g, x, y, s) => { if (LINES.current) drawSpeakerPortrait(g, LINES.current.who, x, y, s, game.real); };
/** each step (real time: lines run through hit-stop) */
LINES.step = dt => {
  let c = LINES.current;
  if (!c && LINES.queue.length) {
    c = LINES.current = LINES.queue.shift();
    c.dur = MT.babble.say(c.text, c.voice); c.hold = 1.1 + Math.min(1.5, c.text.length / 80);
    if (MT.music && game) game.audio.duck(true);
  }
  if (!c) { if (game && !game.paused) game.audio.duck(false); return; }
  c.t += dt; c.typed = Math.min(c.text.length, Math.floor(c.text.length * c.t / Math.max(.3, c.dur)));
  const rig = portraitRig(c.who); if (rig && !MT.cfg.skipRigs) rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: c.typed < c.text.length ? (Math.floor(c.t * 10) % 2 ? 'shout' : 'smile') : 'smile' });
  if (c.t >= c.dur + c.hold) { LINES.current = null; if (c.onDone) c.onDone(); }
};
Object.defineProperty(LINES, 'currentLine', { get: () => LINES.current });
// ------------------------------------------------------------------------------------------------ banners
const BANNERS = MT.banners = { list: [] };
BANNERS.show = (text, o = {}) => { BANNERS.list.push({ text, sub: o.sub || '', color: o.color || '#ffcc33', t: 0, dur: o.dur || 2, icon: o.icon || null, big: o.big !== false }); if (BANNERS.list.length > 3) BANNERS.list.shift(); MT.lastBanner = text; };
BANNERS.step = dt => { for (const b of BANNERS.list) b.t += dt; E.prune(BANNERS.list, b => b.t >= b.dur); };
// tutorial prompts (once per run, in each player's glyphs)
const TUT = MT.tut = { cur: null, queue: [] };
TUT.show = (key, actions) => { const run = MT.run; if (!run || run.mode === 'attract' || run.mode === 'session') return; run.tut = run.tut || {}; if (run.tut[key]) return; run.tut[key] = true; TUT.queue.push({ key, text: MT.TEXT.tutorial[key], actions, t: 0 }); };
TUT.step = dt => { if (!TUT.cur && TUT.queue.length) TUT.cur = TUT.queue.shift(); if (TUT.cur) { TUT.cur.t += dt; if (TUT.cur.t > 4) TUT.cur = null; } };
// ------------------------------------------------------------------------------------------------ the reaction table
const pool = id => { const P = MT.TEXT.pools[id]; LINES._bag = LINES._bag || {}; let b = LINES._bag[id]; if (!b || !b.length) b = LINES._bag[id] = rshuffle(RNG.fx, P.map((_, i) => i)); return P[b.shift()]; };
MT.pool = pool;
const crowd = (k, i) => { MT.babble.crowd(k, i); if (k === 'cheer' || k === 'applause') STUDIO.cheerT = 1.2; };
const REACT = MT.react = {
  kill(w, d) { if (w.decals.length < 220) { const cols = (MT.PALETTE[d.kind] || ['#ffcc33']).concat(['#ff2e88', '#2ee6ff']); for (let i = 0; i < (d.big ? 10 : 4); i++) w.decals.push({ kind: 'confetti', x: d.x + (Math.random() - .5) * 26, y: d.y + (Math.random() - .5) * 20, c: cols[i % cols.length], t: 0, life: 8 }); if (d.big) w.decals.push({ kind: 'scorch', x: d.x, y: d.y, r: 14, t: 0, life: 10 }); }
    if (!w.quietFx) { MT.sfx('confetti'); if (game.particles) game.particles.bits(d.x, d.y, 8, d.big ? 30 : 12, (MT.PALETTE[d.kind] || ['#ffcc33', '#ff2e88']).concat(['#ff2e88', '#2ee6ff'])); if (d.big) { if (game.particles) game.particles.explosion(d.x, d.y, 8, 1, { shake: 0, freeze: false }); w.shake(4); if (!w.session) game.freeze(.03); } } if (d.big) crowd('cheer', .7); },
  multikill(w, d) { LINES.say('LANCE', pool('multi'), 1); crowd('cheer', 1); },
  hurt(w, d) { MT.sfx('buzzer'); crowd('ooh', .5); if (d.c.hp === 1 && maxHpNow() > 1) LINES.say('LANCE', pool('lowHp'), 1); else LINES.say('LANCE', pool('hurt'), 1); },
  died(w, d) { MT.sfx('wah'); crowd('laugh', .6); BANNERS.show(MT.TEXT.ui.mashed, { color: SLOT_COLORS[d.c.slot], sub: d.c.pr.name }); LINES.say('LANCE', fill(pool('death'), { NAME: d.c.pr.name }), 2); },
  showboat(w, d) { crowd('cheer', clamp(d.gain / 30, .3, 1)); if (game.particles) game.particles.text(d.c.x, d.c.y, 30, fill(MT.TEXT.ui.style, { N: d.gain }), '#ff2e88', { scale: 1, bounce: true }); LINES.say('LANCE', pool('showboat'), 1); },
  boatFail(w, d) { crowd('laugh', .4); },
  prime(w) { BANNERS.show(MT.TEXT.ui.primeTime, { color: '#ff2e88', sub: '×5 CASH', dur: 2.5 }); MT.music.sting('prime'); MT.music.layer('prime', true); crowd('cheer', 1); crowd('applause', 1); STUDIO.wave = true; LINES.say('LANCE', pool('prime'), 2); if (game.particles) for (const x of [-30, 398]) for (let i = 0; i < 20; i++) game.particles.add({ kind: 'bit', x, y: 120 + (Math.random() - .5) * 80, z: 20, vx: (x < 0 ? 1 : -1) * (60 + Math.random() * 80), vy: (Math.random() - .5) * 60, vz: 120 + Math.random() * 60, g: 300, max: 1.5, color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'][i % 4], size: 2 }); },
  primeEnd(w) { MT.music.layer('prime', false); STUDIO.wave = false; },
  stunt(w) { BANNERS.show(MT.TEXT.ui.losingViewers, { color: '#ff3344' }); LINES.say('LANCE', pool('stunt'), 2); MT.sfx('alarm'); },
  cash(w, d) { MT.sfx('kaching', { vol: .6 }); },
  powerup(w, d) { MT.sfx('powerup'); const W = WEAPONS[d.w]; if (W && game.particles) game.particles.text(d.c.x, d.c.y, 30, W.name, W.color || '#ffffff', { scale: 1 }); },
  expire(w, d) { MT.sfx('expire'); if (d.what === 'weapon' && game.particles) game.particles.text(d.c.x, d.c.y, 30, MT.TEXT.ui.backToBasics, '#c8d0e0', {}); },
  prize(w, d) { MT.music.sting('prize'); BANNERS.show(fill(MT.TEXT.ui.youWon, { PRIZE: d.prize.name }), { sub: money(d.v), icon: d.prize.icon, color: '#ff8ad8', dur: 2.5 }); LINES.say('PENNY', fill(pool('prizeP'), { PRIZE: d.prize.name }), 2); crowd('cheer', .6); },
  key(w, d) { MT.music.sting('key'); MT.sfx('chime'); if (d.session) { BANNERS.show('GOLDEN KEY! +$10,000', { color: '#ffcc33' }); return; } BANNERS.show(fill(MT.TEXT.ui.goldenKey, { N: d.n }), { color: '#ffcc33', icon: 'key' }); if (!w.run.keyLine) { w.run.keyLine = true; LINES.say('LANCE', MT.TEXT.pools.key[0], 2); } else LINES.say('LANCE', MT.TEXT.pools.key[1], 1); crowd('applause', .7); },
  keyDrop(w) { MT.sfx('chime'); },
  extraLife(w, d) { MT.music.sting('oneup'); BANNERS.show(MT.TEXT.ui.encore, { color: '#5fe0a0', sub: d.c.pr.name }); LINES.say('LANCE', pool('extraLife'), 2); },
  clear(w, d) { MT.music.sting('clear'); BANNERS.show(MT.TEXT.ui.roomClear, { color: '#ffcc33', sub: d.fast ? 'SPEED BONUS!' : '' }); crowd('applause', .9); crowd('cheer', .8); LINES.say('LANCE', pool('clear'), 2); },
  exits(w) { TUT.show('exit', [['move', '']]); },
  hurry(w) { BANNERS.show(MT.TEXT.ui.hurry, { color: '#ff3344' }); LINES.say('LANCE', pool('hurry'), 2); },
  exitPicked(w) { MT.sfx('bell'); },
  door(w, d) { if (w.quietFx) return; if (d.kind === 'open') { MT.sfx('klaxon', { vol: .5 }); MT.sfx('rollup', { vol: .5 }); } else { MT.sfx('slam', { vol: .6 }); if (game.particles) { const D = DOORS[d.id]; game.particles.dust(D.x + D.nx * 10, D.y + D.ny * 10, 0, 6); } } },
  bomb(w) { crowd('cheer', 1); },
  blast(w, d) { if (game.particles) game.particles.ring(d.x, d.y, 2, d.r, '#ff9a3c', .3); },
  slide(w, d) { },
  respawn(w, d) { crowd('applause', .4); },
  out(w, d) { BANNERS.show(d.c.pr.name + ' IS OUT', { color: '#ff3344' }); },
  partDown(w, d) { crowd('cheer', 1); },
  bossIntro(w, d) { MT.music.play('bossShowdown', { fade: .4 }); MT.music.layer('phase2', false); },
  bossDead(w, d) { if (d.boss === 'finale') PLAY.staticT = 2.2; MT.music.sting('bossdown'); crowd('cheer', 1); crowd('applause', 1); BANNERS.show(d.boss === 'finale' ? MT.TEXT.ui.signalLost : 'SHOW STOPPED!', { color: '#ffcc33', dur: 3 }); },
  line(w, d) { LINES.seq(d.id, {}, 3); },
  wheelStop(w, d) { BANNERS.show(d.name + '!', { color: SEG_COL[d.seg] === '#141018' ? '#ff3344' : SEG_COL[d.seg], dur: 1.6 }); LINES.say('LANCE', d.name + '!', 2); },
  bankrupt(w) { MT.music.sting('bankrupt'); BANNERS.show(MT.TEXT.ui.bankrupt, { color: '#ff3344' }); crowd('boo', .8); },
  jackpot(w) { crowd('cheer', 1); LINES.say('LANCE', pool('jackpot'), 2); },
  spinAgain(w) { LINES.say('LANCE', pool('spinAgain'), 2); },
  segDown(w, d) { crowd('cheer', .7); },
  pattern(w, d) { BANNERS.show(d.name + '!', { color: '#c08aff', dur: 1.4, big: false }); },
  commercial(w) { LINES.seq('commercial'); BANNERS.show(MT.TEXT.ui.commercial, { color: '#ff9a3c', dur: 2.5 }); MT.music.play('commercial', { fade: .3 }); },
  backFromBreak(w) { LINES.seq('backFromBreak'); MT.music.play('bossShowdown', { fade: .3 }); },
  lanceDown(w) { LINES.seq('lanceDown'); crowd('ooh', 1); },
  robotReveal(w) { LINES.seq('robotReveal'); BANNERS.show(MT.TEXT.ui.robot, { color: '#2ee6ff', dur: 3 }); crowd('ooh', 1); },
  networkReveal(w) { LINES.seq('networkReveal'); MT.sfx('static'); },
  bonusStart(w) { LINES.seq('greenRoom'); MT.music.play('recap'); },
  statueUp(w) { LINES.seq('statueUp'); MT.music.sting('prime'); },
  statue(w, d) { BANNERS.show('YOU WON: ' + MT.TEXT.grandPrize.name + '!', { sub: money(d.v), color: '#ffcc33', dur: 3, icon: 'network' }); crowd('cheer', 1); crowd('applause', 1); },
  snap(w) { MT.sfx('shutter'); if (!w.quietFx) game.flash('#ffffff', .1, .6); },
  bruteCrash(w) { crowd('ooh', .5); },
  cage(w) { MT.music.sting('prize'); BANNERS.show('THE CAGE IS OPEN!', { color: '#ffcc33' }); },
  vault(w) { MT.music.sting('prize'); BANNERS.show('THE VAULT IS OPEN!', { color: '#ffcc33' }); crowd('cheer', .9); },
  targetBroken(w, d) { MT.sfx('crash', { vol: .6 }); if (game.particles) game.particles.bits(d.x, d.y, 6, 14, d.kind === 'crate' ? ['#c87830', '#ffcc33', '#8a5a20'] : ['#c8d0e0', '#ff3344']); },
  spawn(w, d) {
    const k = d.kind === 'discoBig' || d.kind === 'discoSmall' ? 'disco' : d.kind === 'hecklerKing' ? 'heckler' : d.kind, I = MT.TEXT.intros[k];
    const run = w.run; if (!I || !run || run.mode === 'attract' || w.session) return; run.seen = run.seen || {}; if (run.seen[k]) return; run.seen[k] = true;
    LINES.say('LANCE', I[0], 2, { hint: I[1] });
  },
  wave(w, d) {
    const room = w.room || {}; if (!room.tutorial) return;
    if (d.n === 1) { TUT.show('move', [['move', '']]); TUT.show('aim', [['aim', '']]); }
    if (d.n === 3) TUT.show('showboat', [['showboat', '']]);
    if (d.n === 4) TUT.show('slide', [['slide', '']]);
  },
  phase(w, d) { if (d.p === 'INTRO') { MT.music.sting('mash'); LINES.say('LANCE', pool('roomStart'), 2); } },
};
/** run every event the world raised this step through the table (and count it for tests) */
MT.react.drain = world => {
  const evs = world.events; world.events = [];
  for (const ev of evs) {
    world.ring.push([ev.seq, ev.name, ev.data]); if (world.ring.length > 60) world.ring.shift();
    MT.emit('ev:' + ev.name, ev.data); MT.log.push(ev.name);
    if (MT.log.length > 2000) MT.log.splice(0, 1000);
    const fn = REACT[ev.name]; if (fn) try { fn(world, ev.data); } catch (e) { if (game) game.fail('reaction ' + ev.name, e); }
    if (ev.name === 'powerup' && world.room && world.room.tutorial) TUT.show('capsule', [['move', '']]);
  }
  if (world.enemies.length >= 20 && world.room && world.room.tutorial) TUT.show('bomb', [['bomb', '']]);
};
/** cosmetic studio state each step: crowd excitement follows the ratings */
MT.studioStep = (dt, world) => {
  const R = world ? world.ratings.R / 100 : .3; STUDIO.excite += (R - STUDIO.excite) * Math.min(1, dt * 2);
  STUDIO.cheerT = Math.max(0, STUDIO.cheerT - dt);
  MT.art.stepFireworks(dt, world ? world.arena.set : SETS.studio);
};
