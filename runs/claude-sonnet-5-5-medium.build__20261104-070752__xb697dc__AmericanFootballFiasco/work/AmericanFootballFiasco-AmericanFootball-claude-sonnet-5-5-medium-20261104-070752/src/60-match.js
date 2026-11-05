/* AMERICAN FOOTBALL FIASCO — the match scene: it runs the sim and presents it (camera, rigs, FX, HUD, play calls, kicks, replays). */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px, clamp, lerp } = E, game = FF.game, P = game.particles, L = game.lights, UI = FF.UI;
const { Y, GL0, GL1, YMIN, YMAX, CY } = FF.FIELD, T = FF.T;
FF.scenes = FF.scenes || {};
const S = FF.S = {
  M: null, cfg: null, map: null, rigs: [], crowd: [], cheer: [], blobs: {}, ticker: null, banner: null, feed: [], cur: 0, excite: 0, anim: {}, replay: null, mapKey: '', cam: { x: 600, y: CY },
  slow: 0, say: 0, lightsOut: 0, hs: 0, toast: null, half: null, endT: 0, kickShown: null, calls: { gridSel: 0, defSel: 0 }, fireworks: [], lastGap: 0, devOpen: false, keyHint: 0
};
const PCOL = ['#e8443a', '#3b82f6'];
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- enter ---------- */
function ensureMap(cfg) {
  const key = cfg.stadium + '|' + cfg.home;
  if (S.mapKey !== key || !S.map) { S.map = FF.buildMap(cfg.stadium, cfg.home); S.mapKey = key; S.crowd = FF.makeCrowd(S.map.stadium); }
}
function makeCheer(team) {
  S.cheer = [];
  for (let i = 0; i < 6; i++) S.cheer.push({ rig: new E.Humanoid({ size: .95, weapon: null, hair: i % 2 ? 'ponytail' : 'long', outfit: 'shirt', sleeves: 'none', colors: { cloth: team.c1, pants: team.c2, hair: team.hair[i % team.hair.length], skin: ['#f0c8a8', '#d8a070', '#a06a40'][i % 3], trim: team.c2, glove: team.c2 } }), x: 250 + i * 34 + (i > 2 ? 560 : 0), y: YMAX + 30 });
}
FF.scenes.match = {
  pausable: true, view: 'threequarter', input: 'FOOTBALL', res: 'ps1', expand: true, camera: { zoom: false },
  enter(d) {
    d = d || {}; S.cfg = d = Object.assign({ mode: 'exh', home: 'fiascos', away: 'bruisers', stadium: 'junction', humans: [true, false], quarters: 4 }, d);
    ensureMap(d);
    const home = FF.TEAMS[d.home], away = FF.TEAMS[d.away];
    const qlen = d.qlen || T.quarter;
    const M = S.M = new FF.Match({ home: d.home, away: d.away, humans: d.humans, mode: d.mode, boss: d.boss || null, qlen, quarters: d.quarters, seed: d.seed || (Math.random() * 1e9 | 0), cheat: d.mode === 'attract', start: d.start, noClock: d.noClock });
    S.rigs = FF.DOM ? M.P.map(p => FF.makeRig(M.teams[p.side], p.k)) : [];
    if (FF.DOM) makeCheer(home); else S.cheer = []; S.anim = {}; S.replay = null; S.banner = null; S.ticker = null; S.feed = []; S.excite = 0; S.slow = 0; S.lightsOut = 0; S.half = null; S.endT = 0; S.fireworks = []; S.toast = null; S.devOpen = false;
    S.cam.x = M.los; S.cam.y = M.by; S.calls.gridSel = 0; S.calls.defSel = 0; S.ctlP = [null, null];
    game.cam.smooth = 0; game.setZoom(d.zoom || .55); game.weather = S.map.stadium.weather ? Object.assign({}, S.map.stadium.weather) : null;
    L.enabled = true; L.ambient = S.map.stadium.ambient; game.timeScale = 1;
    FF.music(d.mode === 'attract' ? 'match' : 'match');
    S.cdown = d.mode === 'hub' ? 0 : 0;
    FF.sfx('whistle');
    if (d.intro) say('fiascos', d.intro, 'CHUCK');
    if (FF.dev) FF.dev.attach(S);
    if (FF.hooks && FF.hooks.enter) FF.hooks.enter(d, M);
  },
  exit() { game.timeScale = 1; game.weather = null; FF.music(null); if (!FF.flags.hub) S.M = null; },
  back() { return false; }
};
const scene = FF.scenes.match;

/* ---------- the control read ---------- */
function readCtl(I) {
  if (!I) return null; const m = I.move();
  return { mx: m[0], my: m[1], turbo: I.down('turbo'), a: I.pressed('a'), b: I.pressed('b'), x: I.pressed('x'), y: I.pressed('y'), swap: I.pressed('swap') };
}
function ctls() {
  const M = S.M, out = [null, null], pl = game.players;
  if (S.cfg.mode === 'attract') return out;
  if (M.humans[0]) out[0] = readCtl(pl[0]);
  if (M.humans[1]) out[1] = readCtl(S.cfg.two && pl[1] ? pl[1] : pl[0]);
  return out;
}

/* ---------- commentary ---------- */
function say(kind, text, who) {
  const M = S.M; if (!text) { const bank = FF.LINES[kind]; if (!bank) return; text = bank[Math.floor(Math.random() * bank.length)]; }
  if (!who) who = Math.random() < .5 ? 'CHUCK' : 'DOTTIE';
  S.ticker = { who, text, shown: 0, hold: 3 + text.length * .02 };
}
function banner(text, color, big) { S.banner = { text, t: 0, dur: big ? 2.2 : 1.4, color: color || '#ffe08a', big: !!big }; }
function toast(text, color) { S.toast = { text, t: 0, color: color || '#ffe08a' }; }

/* ---------- animation timers on the rigs ---------- */
function setAnim(id, name, dur) { S.anim[id] = { name, dur, t: 0 }; }

/* ---------- events -> presentation ---------- */
function handleEvents(M) {
  const ev = M.events; if (!ev.length) return;
  const allowSay = S.say <= 0;
  for (const e of ev) {
    const p = e.id !== undefined && e.id >= 0 ? M.P[e.id] : null;
    if (FF.hooks && FF.hooks.event) FF.hooks.event(e, M);
    switch (e.type) {
      case 'snap': FF.sfx('snap'); if (allowSay && Math.random() < .3) { say('snap'); S.say = 3; } break;
      case 'throw': FF.sfx('throw'); setAnim(e.id, 'throw', .45); break;
      case 'catch': FF.sfx('catch'); if (allowSay && Math.random() < .55) { say('catch'); S.say = 3; } P.glints(e.x, e.y, 20, 4, '#ffffff'); break;
      case 'drop': FF.sfx('uh'); banner('DROPPED!', '#ff9a8a'); say('drop'); break;
      case 'incomplete': banner('INCOMPLETE', '#d8d0f0'); if (allowSay && Math.random() < .5) say('inc'); break;
      case 'batted': FF.sfx('arm'); banner('KNOCKED AWAY!', '#d8d0f0'); break;
      case 'int': FF.sfx('boo'); banner('INTERCEPTED!', '#ff7a6a', true); say('int'); game.flash('#ffffff', .15, .5); game.shake(5); S.excite = Math.max(S.excite, .7); break;
      case 'fumble': FF.sfx('uh'); banner('FUMBLE!', '#ffb04a', true); say('fumble'); game.shake(4); break;
      case 'turnover': banner('TURNOVER!', '#ff7a6a'); break;
      case 'bighit': case 'mega': bigHit(M, e); break;
      case 'tackle': FF.sfx('hit'); P.dust(e.x, e.y, 3, 5); if (e.id >= 0) setAnim(e.id, 'bash', .35); break;
      case 'sack': banner('SACKED!', '#ff7a6a', true); say('sack'); break;
      case 'juke': FF.sfx('juke'); P.glints(e.x, e.y, 16, 6, '#8ad8ff'); P.text(e.x, e.y, 36, 'JUKE!', '#8ad8ff', { scale: 1, bounce: true }); if (allowSay && Math.random() < .4) { say('juke'); S.say = 3; } break;
      case 'arm': FF.sfx('arm'); setAnim(e.id, 'bash', .35); break;
      case 'shove': P.dust(M.P[e.id].x, M.P[e.id].y, 3, 4); break;
      case 'miss': P.text(e.x, e.y, 30, 'MISSED!', '#c8c0e8', { scale: 1, bounce: true }); break;
      case 'broke': P.text(e.x, e.y, 34, 'BROKEN TACKLE', '#ffe08a', { scale: 1, bounce: true }); FF.sfx('juke'); break;
      case 'dive': FF.sfx('whoosh' in game.audio.presets ? 'whoosh' : 'juke'); break;
      case 'block': P.dust(e.x, e.y, 2, 2); if (Math.random() < .3) FF.sfx('arm', { vol: .4 }); break;
      case 'whistle': FF.sfx('whistle'); break;
      case 'first': banner('FIRST DOWN!', '#8aff8a'); FF.sfx('chime'); if (allowSay) { say('first'); S.say = 3; } break;
      case 'downs': banner('TURNOVER ON DOWNS', '#ff9a8a', true); say('turnoverdowns'); break;
      case 'streak': banner('ON FIRE!', '#ff8a2a', true); FF.sfx('streak'); FF.sfx('fire'); say('streak'); S.excite = Math.max(S.excite, .8); break;
      case 'card-ready': if (e.side === humanSide(M)) { FF.sfx('card'); toast('FIASCO CARD READY: ' + FF.CARDS[e.card].name, FF.CARDS[e.card].col); say('card'); } break;
      case 'card': cardFx(M, e); break;
      case 'bolt': game.flash('#bfe8ff', .25, .9); game.shake(9); for (const [x, y] of e.pts) { P.sparks(x, y, 20, 14, 0); P.explosion(x, y, 10, 10); } FF.sfx('bolt'); break;
      case 'mascot-hit': FF.sfx('bighit', { vol: .6 }); P.dust(e.x, e.y, 4, 8); game.shake(3); break;
      case 'freeze': banner('FROSTBITE!', '#9ad8ff', true); game.flash('#bfe8ff', .2, .5); break;
      case 'td': touchdown(M, e); break;
      case 'safety': banner('SAFETY!', '#ffb04a', true); say('safety'); FF.sfx('horn'); break;
      case 'kick-start': FF.music('kick'); break;
      case 'kick': FF.sfx('kick'); if (M.kick) setAnim(M.kick.side * 7, 'kick', .5); setAnim(M.kick ? M.kick.side * 7 : 0, 'kick', .5); break;
      case 'fg-good': banner("IT'S GOOD!", '#8aff8a', true); FF.sfx('fanfare'); say('fg'); fireworks(M.ball.x, 2); S.excite = 1; break;
      case 'fg-miss': banner('NO GOOD!', '#ff9a8a', true); FF.sfx('boo'); say('miss'); break;
      case 'pat-good': banner('EXTRA POINT GOOD', '#8aff8a'); FF.sfx('chime'); S.excite = .6; break;
      case 'pat-miss': banner('EXTRA POINT MISSED', '#ff9a8a'); FF.sfx('boo'); break;
      case 'punt-land': banner('PUNT!', '#d8d0f0'); say('punt'); FF.music('match'); break;
      case 'possession': break;
      case 'call': FF.music('match'); S.lightsOut = 0; break;
      case 'quarter': banner('END OF QUARTER ' + e.q, '#ffe08a', true); FF.sfx('whistle'); say('quarter'); break;
      case 'half': banner('HALFTIME', '#ffe08a', true); FF.sfx('whistle'); say('half'); FF.music('half'); S.half = { sel: new UI.VMenu([{ label: 'TURBO TANKS' }, { label: 'FIASCO FEVER' }, { label: 'HOT HANDS' }], { onPick: i => { M.adjust(humanSide(M), i); S.half.done = true; } }), done: false }; if (!M.humans[0] && !M.humans[1]) { M.adjust(0, Math.floor(Math.random() * 3)); M.adjust(1, Math.floor(Math.random() * 3)); } M.adjust(M.humans[0] ? 1 : 0, Math.floor(Math.random() * 3)); break;
      case 'ot': banner('OVERTIME! SUDDEN DEATH', '#ff8a2a', true); break;
      case 'final': FF.sfx('whistle'); FF.sfx('roar'); say('final'); S.endT = 0; break;
      case 'set': if (S.cfg.boss === 'blackout' && ((M.stats[0].plays + M.stats[1].plays) % 3 === 2)) { S.lightsOut = 1; banner('LIGHTS OUT!', '#c040ff', true); say('lights'); FF.sfx('warp'); } break;
      default: break;
    }
    if (e.type === 'snap') { P.dust(e.x, e.y, 2, 4); }
  }
  M.events.length = 0;
}
function humanSide(M) { return M.humans[0] ? 0 : M.humans[1] ? 1 : 0; }
FF.humanSide = humanSide;
function bigHit(M, e) {
  const mega = e.type === 'mega', p = M.P[e.vic];
  FF.sfx(mega ? 'megahit' : 'bighit'); game.hitFx(e.x, e.y, 18, { power: mega ? 2 : 1.2, angle: Math.atan2(e.dy || 0, e.dx || 1), textScale: 0 });
  P.text(e.x, e.y, 46, mega ? 'MEGA HIT!' : ['BOOM!', 'WHAM!', 'CRUNCH!', 'KABLAM!'][Math.floor(Math.random() * 4)], mega ? '#ff4a2a' : '#ffe08a', { scale: mega ? 3 : 2, bounce: true });
  P.bits(e.x, e.y, 24, 10, [M.teams[p.side].c1, M.teams[p.side].c2, '#ffffff']); P.explosion(e.x, e.y, 10, mega ? 12 : 6);
  game.freeze(mega ? .22 : .1); game.shake(mega ? 12 : 6);
  if (mega) { game.timeScale = .3; S.slow = .9; game.flash('#ffffff', .2, .7); }
  if (e.id >= 0) setAnim(e.id, 'bash', .35);
  S.excite = Math.max(S.excite, mega ? 1 : .75);
  banner(mega ? 'MEGA HIT!' : 'BIG HIT!', mega ? '#ff5a3a' : '#ffd23a', mega);
  say(mega ? 'mega' : 'big'); S.say = 2.5; try { game.input.rumble(mega ? .9 : .5, .25); } catch (err) { /* no pad */ }
}
function cardFx(M, e) {
  const c = FF.CARDS[e.card]; FF.sfx('cardplay'); banner(c.name + '!', c.col, true); say(e.card);
  if (e.card === 'rocket') FF.sfx('fire'); if (e.card === 'warp') { FF.sfx('warp'); game.flash('#c080ff', .3, .4); } if (e.card === 'mascot') FF.sfx('mascot');
}
function touchdown(M, e) {
  FF.sfx('horn'); FF.sfx('roar'); banner('TOUCHDOWN!', '#ffe08a', true); say('td'); S.excite = 1.4;
  game.flash('#ffffff', .25, .6); game.shake(7); fireworks(e.x, 6);
  const mine = e.side === humanSide(M); if (mine) FF.sfx('fanfare');
  FF.stat('td', 1); if (e.side === humanSide(M)) FF.stat('longest', e.yards, true);
}
function fireworks(x, n) { for (let i = 0; i < n; i++) S.fireworks.push({ t: -i * .22, x: clamp(x + rnd(-160, 160), 80, 1120), y: rnd(10, 60), z: rnd(70, 130), col: ['#ff4a4a', '#ffd23a', '#4aff8a', '#4ac8ff', '#ff6aff'][i % 5] }); }
FF.stat = (k, v, max) => { const s = FF.store.get('stats', {}); s[k] = max ? Math.max(s[k] || 0, v) : (s[k] || 0) + v; FF.store.set('stats', s); };

/* ---------- update ---------- */
scene.update = function (dt) {
  const M = S.M; if (!M) return;
  const I = game.input;
  if (FF.net && FF.net.hold()) return;
  // attract mode: any input leaves
  if (S.cfg.mode === 'attract') {
    if (I.anyPressed() || I.clicked() || UI.mouseMoved() && game.time > 1.2 || Math.hypot(...I.move()) > .3) { FF.leaveAttract(); return; }
  }
  if (S.devOpen && FF.dev) { FF.dev.update(dt); return; }
  if (S.slow > 0) { S.slow -= dt / Math.max(.05, game.timeScale); if (S.slow <= 0) game.timeScale = 1; }
  S.say -= dt; S.excite = Math.max(0, S.excite - dt * .12);
  if (S.replay) { updateReplay(dt, M); return; }
  const c = ctls();
  // the play-call UI feeds the sim before it steps
  playcallInput(M, c);
  M.update(dt, c);
  handleEvents(M);
  poseAll(dt, M);
  // replay start
  if (M.replayCand && (M.phase === 'dead' && M.pt > .55 || M.phase === 'score' && M.pt > 1.4) && game.settings.replays !== false && S.cfg.mode !== 'attract' && S.cfg.mode !== 'hub' && M.rec.length > 40) startReplay(M);
  else if (M.replayCand && (M.phase === 'call' || M.phase === 'kick')) M.replayCand = false;
  // camera
  camera(dt, M);
  // ticker, banner, fx
  tickers(dt, M);
  fxStep(dt, M);
  if (M.phase === 'final') { S.endT += dt; if (S.endT > 4.2) finish(M); }
  if (FF.hooks && FF.hooks.tick) FF.hooks.tick(M, dt);
};
scene.draw = function (r) { draw(r); };

function finish(M) {
  if (S.finished) return; S.finished = true;
  if (FF.hooks && FF.hooks.final) FF.hooks.final(M);
  if (FF.flags.hub) return;
  if (S.cfg.mode === 'attract') { FF.startAttract(); return; }
  game.go('results', { cfg: S.cfg, M: { score: M.score.slice(), winner: M.winner, stats: M.stats, teams: [M.teams[0].id, M.teams[1].id], longest: M.longest, q: M.q } });
}
scene.finishNow = finish;
const origEnter = scene.enter; scene.enter = function (d) { if (d && d.resume && S.M) return; S.finished = false; origEnter.call(this, d); };

/* ---------- poses ---------- */
function poseAll(dt, M) {
  if (!FF.DOM) return;   // headless: no rigs to animate
  const humanS = humanSide(M), ph = M.phase, win = M.res && M.res.kind === 'td' ? M.res.side : -1;
  for (const p of M.P) {
    const rig = S.rigs[p.id], ex = {}, an = S.anim[p.id];
    if (an) { an.t += dt; if (an.t >= an.dur) delete S.anim[p.id]; else ex.attack = E.move(an.name, an.t / an.dur); }
    if (ph === 'score' || (ph === 'dead' && M.res && M.res.kind === 'td')) { if (p.side === win) { ex.cheer = p.id % 3 !== 1; ex.hips = p.id % 3 === 1; } else ex.sad = true; }
    else if (ph === 'final') { if (M.winner === p.side) { ex.cheer = true; } else if (M.winner >= 0) ex.sad = true; }
    else if (ph === 'set' && /^(OL|DL)/.test(p.role)) ex.ready = Math.hypot(p.tx - p.x, p.ty - p.y) < 2;
    else if (ph === 'kick' && p.side === M.kick.side && p.k === 0 && M.kick.stage >= 3) ex.attack = ex.attack;
    if (p.ball) ex.hold = true;
    FF.pose(rig, p, dt, M, ex);
  }
  S.cheer.forEach((c, i) => { c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 * 3 * 0 + -Math.PI / 2, vx: 0, vy: 0, pose: (Math.floor(game.time * 2 + i) % 2 ? 'cheer' : 'wave'), expr: 'smile' }); });
  for (const k in S.blobs) S.blobs[k].update(dt, { walk: 1, squash: Math.sin(game.time * 14) * .15 });
}

/* ---------- camera ---------- */
function camera(dt, M) {
  const ph = M.phase, d = FF.dirOf(M.poss); let tx, ty;
  const b = M.ball, car = b.carrier;
  if (ph === 'live' || ph === 'dead' || ph === 'score') {
    const ref = car || b; tx = ref.x + (car ? d * 24 + (car.vx || 0) * .25 : 0); ty = CY * .7 + ref.y * .3 - 30;
    if (ph === 'score') { tx = M.res.spot; ty = CY; }
  } else if (ph === 'kick') { const k = M.kick; tx = k.stage >= 3 ? b.x + k.dir * 60 : M.los - k.dir * 40; ty = CY; }
  else { tx = M.los + d * 70; ty = CY * .6 + M.by * .4 - 30; }
  tx = clamp(tx, 250, 1000); ty = clamp(ty, 225, 280);
  const k = Math.min(1, dt * (ph === 'live' ? 4.2 : 2.2));
  S.cam.x += (tx - S.cam.x) * k; S.cam.y += (ty - S.cam.y) * k;
  game.focus(S.cam.x, S.cam.y, 10);
}

/* ---------- tickers, banner, fx ---------- */
function tickers(dt, M) {
  const t = S.ticker;
  if (t) {
    const before = Math.floor(t.shown); t.shown = Math.min(t.text.length, t.shown + dt * 34);
    const now = Math.floor(t.shown); for (let i = before; i < now; i++) if (i % 2 === 0) FF.babble(t.who, t.text[i], i);
    if (t.shown >= t.text.length) { t.hold -= dt; if (t.hold <= 0) S.ticker = null; }
  }
  if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
  if (S.toast) { S.toast.t += dt; if (S.toast.t > 3) S.toast = null; }
  if (S.lightsOut > 0 && M.phase !== 'live' && M.phase !== 'set') S.lightsOut = Math.max(0, S.lightsOut - dt * .5);
}
function fxStep(dt, M) {
  // fire trails
  for (const p of M.P) {
    if (p.ball && M.fire[p.side] > 0 && Math.hypot(p.vx, p.vy) > 20 && Math.random() < .8) P.fire(p.x - p.vx * .06, p.y - p.vy * .06, 6, 1, { size: 1.2 });
    if (M.fx.rocket[p.side] > 0 && Math.hypot(p.vx, p.vy) > 20 && Math.random() < .4) { P.fire(p.x, p.y, 1, 1, { size: 1 }); }
    if (p.human && p.turbo && Math.random() < .5) P.dust(p.x, p.y, 1, 1);
  }
  for (const f of S.fireworks) { f.t += dt; if (f.t > 0 && !f.fired) { f.fired = true; P.explosion(f.x, f.y, f.z, 14, { debris: false, shake: 0, freeze: false }); P.glints(f.x, f.y, f.z, 24, f.col); P.bits(f.x, f.y, f.z, 18, [f.col, '#ffffff']); FF.sfx('fire', { vol: .5 }); } }
  S.fireworks = S.fireworks.filter(f => f.t < 1.5);
}

/* ---------- the play-call UI ---------- */
function offOptions(M) {
  const list = FF.PLAY_ORDER.map(id => ({ id, play: FF.PLAYS[id], name: FF.PLAYS[id].name }));
  const gd = M.goalDist() + 17;
  list.push({ id: 'fg', name: 'FIELD GOAL', blurb: 'Kick it through the uprights. ' + gd + ' yard try.', disabled: gd > 62, kick: true });
  list.push({ id: 'punt', name: 'PUNT', blurb: 'Boot it away and play the field position game.', kick: true });
  return list;
}
function defOptions() { return FF.DEF_ORDER.map(id => ({ id, def: FF.DEFS[id], name: FF.DEFS[id].name })); }
function playcallInput(M, c) {
  const need = M.needCall(); S.need = need;
  if (!need || S.cfg.mode === 'attract' || S.cfg.autoCall) return;
  if (M.callTime < .25) return;
  const I = need === 'off' || !S.cfg.two ? game.players[0] : (game.players[1] || game.players[0]), opts = need === 'off' ? offOptions(M) : defOptions(), cols = need === 'off' ? 4 : 4, n = opts.length;
  let sel = need === 'off' ? S.calls.gridSel : S.calls.defSel;
  if (I.repeat('left', .3, .12)) sel = (sel + n - 1) % n; if (I.repeat('right', .3, .12)) sel = (sel + 1) % n;
  if (need === 'off') { if (I.repeat('up', .3, .12)) sel = (sel + n - cols) % n; if (I.repeat('down', .3, .12)) sel = (sel + cols) % n; }
  const mv = UI.mouseMoved(); if (mv) opts.forEach((o, i) => { if (UI.inside(mv, cardRect(i, need, game.W, game.H))) sel = i; });
  if (sel !== (need === 'off' ? S.calls.gridSel : S.calls.defSel)) FF.ui('blip');
  if (need === 'off') S.calls.gridSel = sel; else S.calls.defSel = sel;
  let pick = -1; const ck = I.clicked();
  if (ck) opts.forEach((o, i) => { if (UI.inside(ck, cardRect(i, need, game.W, game.H))) pick = i; });
  if (I.pressed('confirm') || I.pressed('a')) pick = sel;
  if (pick >= 0 && !opts[pick].disabled) { FF.ui('confirm'); I.consumeAll(); if (need === 'off') { M.chooseOff(opts[pick].id); FF.stat('plays', 1); } else M.chooseDef(opts[pick].id); }
  else if (pick >= 0) FF.ui('cancel');
}
function cardRect(i, need, W, H) {
  if (need === 'off') { const w = 94, h = 50, gx = 6, x0 = Math.round((W - (4 * w + 3 * gx)) / 2), col = i % 4, row = Math.floor(i / 4); return [x0 + col * (w + gx), 76 + row * (h + 6), w, h]; }
  const w = 94, h = 84, gx = 6, x0 = Math.round((W - (4 * w + 3 * gx)) / 2); return [x0 + i * (w + gx), 80, w, h];
}

/* ---------- replays ---------- */
function startReplay(M) {
  const fr = M.rec.slice(Math.max(0, M.rec.length - 230)); if (fr.length < 30) { M.replayCand = false; return; }
  S.replay = { fr, i: 0, t: 0 }; M.replay = true; M.replayCand = false; game.timeScale = 1; FF.sfx('chime');
}
function updateReplay(dt, M) {
  const R = S.replay, I = game.input; R.t += dt; R.i = R.t * 22;
  if (I.pressed('confirm') || I.pressed('cancel') || I.pressed('a') || I.clicked() || R.i >= R.fr.length - 1) { S.replay = null; M.replay = null; return; }
  const f = R.fr[Math.floor(R.i)];
  if (FF.DOM) f.p.forEach((q, i) => { const tmp = { x: q[0], y: q[1], z: q[2], face: q[3], state: q[4], vx: q[5], vy: q[6], downK: S.rigs[i]._rk || 0 }; FF.pose(S.rigs[i], tmp, dt, M, {}); S.rigs[i]._rk = tmp.downK; });
  const tx = f.b[0], ty = CY * .55 + f.b[1] * .45; S.cam.x += (clamp(tx, 250, 1000) - S.cam.x) * Math.min(1, dt * 3); S.cam.y += (clamp(ty, 225, 280) - S.cam.y) * Math.min(1, dt * 3); game.focus(S.cam.x, S.cam.y, 10);
}

/* ---------- draw ---------- */
function rstate(p) {
  const R = S.replay; if (!R) return p;
  const f = R.fr[Math.floor(R.i)], q = f.p[p.id]; return { id: p.id, x: q[0], y: q[1], z: q[2], face: q[3], state: q[4], vx: q[5], vy: q[6], side: p.side, human: false, ball: f.c === p.id, k: p.k, role: p.role };
}
function draw(r) {
  const M = S.M; if (!M) return;
  const st = S.map.stadium, t = game.time;
  // lights: towers along the stands, plus blackout
  const dark = S.lightsOut > 0;
  L.ambient = dark ? .1 : st.ambient;
  if (!dark) for (let i = 0; i < 6; i++) L.add(120 + i * 220, 40, 90, 260, .75, { color: st.lamp });
  else { const b = S.replay ? S.replay.fr[Math.floor(S.replay.i)].b : [M.ball.x, M.ball.y]; L.add(b[0], b[1], 40, 120, 1.1, { color: '#ffffff' }); for (const p of M.P) L.add(p.x, p.y, 20, 26, .5, { color: M.teams[p.side].c1 }); }
  S.map.drawFloor(r); S.map.queueWalls(r);
  FF.drawCrowd(r, S.crowd, t, S.excite);
  // field markers
  drawMarkers(r, M);
  FF.drawPosts(r, 0, t); FF.drawPosts(r, 1, t);
  // cheerleaders and bench props
  for (const c of S.cheer) { r.shadow(c.x, c.y, 5, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
  for (const x of [180, 420, 780, 1020]) r.prop('lamp', x, YMAX + 70, 0, { size: 1.2, light: false });
  for (const x of [100, 600, 1100]) r.prop('sign', x, YMAX + 52, 0, { size: 1 });
  // players
  const hs = humanSide(M);
  for (const p0 of M.P) {
    const p = rstate(p0), rig = S.rigs[p0.id];
    r.shadow(p.x, p.y, 6, .5);
    if (p0.human && !S.replay && p0.state !== 'down') r.groundRing(p.x, p.y, 9, PCOL[p0.side === 0 ? 0 : 1], .9);
    if (FF.T.showBoxes) r.groundRing(p.x, p.y, T.tackleReach, '#ff4040', .5);
    const flash = M.fire[p0.side] > 0 && p0.ball ? '#ff9a2a' : null;
    r.actor(p.x, p.y, p.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), flash ? { flash, flashMix: .18 + .12 * Math.sin(t * 20) } : {});
    if (M.fx.rocket[p0.side] > 0) r.glowDisc && 0;
  }
  // the ball
  drawBall(r, M);
  // mascot and bolts
  if (M.mascot) drawMascot(r, M);
  for (const b of M.bolts) r.queue(b.x, b.y, 80, g => { const a = r.w(b.x, b.y, 140), c = r.w(b.x, b.y, 0); let x = a[0], y = a[1]; for (let k = 0; k < 7; k++) { const nx = a[0] + (c[0] - a[0]) * (k + 1) / 7 + rnd(-6, 6), ny = a[1] + (c[1] - a[1]) * (k + 1) / 7; px.line(g, x, y, nx, ny, '#e8f8ff', 2); x = nx; y = ny; } }, { emissive: true });
  if (M.phase === 'kick') drawKickWorld(r, M);
  r.overlay(g => drawHud(g, r, M));
}
function drawMarkers(r, M) {
  const d = FF.dirOf(M.poss);
  const lines = [[M.los, '#4a8aff', 1.6]];
  if (M.phase !== 'kick') lines.push([M.fdLine(), '#ffe030', 1.8]);
  for (const [x, col, w] of lines) {
    if (M.phase === 'kick' && col !== '#4a8aff') continue;
    r.decal(g => { const a = r.w(x, YMIN, 0), b = r.w(x, YMAX, 0); px.line(g, a[0], a[1], b[0], b[1], col, w); });
  }
  void d;
}
function drawBall(r, M) {
  let b = M.ball, bx = b.x, by = b.y, bz = b.z, rot = b.rot || 0;
  if (S.replay) { const f = S.replay.fr[Math.floor(S.replay.i)]; bx = f.b[0]; by = f.b[1]; bz = f.b[2]; }
  if (b.state === 'dead' && M.kick && M.kick.stage < 3) return;
  r.shadow(bx, by, 3.5, .5, '#0c0818');
  r.sprite(bx, by, Math.max(2, bz), FF.BALL, { rot: rot, anchor: 'center' });
}
function drawMascot(r, M) {
  const m = M.mascot, team = M.teams[m.side];
  if (!S.blobs.m || S.blobs.team !== team.id) { S.blobs.m = new E.Blob({ R: 11, colors: { dk: '#3a1a0a', base: team.c1, lt: team.c2, spec: '#ffffff', eye: '#ffffff', pupil: '#101010' }, ears: 'cat', feet: true, tail: true, mouth: true }); S.blobs.team = team.id; }
  const bl = S.blobs.m; r.shadow(m.x, m.y, 12, .5);
  r.actor(m.x, m.y, 0, (g, ox, oy) => bl.draw(g, ox, oy, r.view));
}

/* ---------- kick visuals ---------- */
function drawKickWorld(r, M) {
  const k = M.kick; if (!k) return;
  if (k.stage >= 1 && k.stage <= 2) {
    const gx = k.dir > 0 ? GL1 + 100 : GL0 - 100;
    r.decal(g => { const a = r.w(M.ball.x, M.ball.y, 0), b = r.w(gx, CY + (k.stage === 2 ? k.ac * 30 : 0), 0); px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1); });
  }
}

/* ---------- HUD ---------- */
function ord(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : '4th'; }
function spotText(M) {
  const s = M.poss, yl = Math.round(FF.yardline(M.los, s));
  return yl === 50 ? 'MIDFIELD' : yl < 50 ? 'OWN ' + yl : 'OPP ' + (100 - yl);
}
function drawHud(g, r, M) {
  const W = r.W, H = r.H, hs = humanSide(M), I = game.input;
  // scoreboard
  const sbw = 190, sx = Math.round(W / 2 - sbw / 2);
  UI.box(g, sx, 3, sbw, 30, { bg: ['#14122a', '#0a0818'], border: '#e8c860', alpha: .92 });
  for (const s of [0, 1]) {
    const tm = M.teams[s], x = s === 0 ? sx + 8 : sx + sbw - 8;
    px.rect(g, s === 0 ? sx + 5 : sx + sbw - 9, 6, 4, 11, tm.c1);
    UI.text(g, tm.short, s === 0 ? sx + 12 : sx + sbw - 12, 6, '#d8d0f0', { align: s === 0 ? 'left' : 'right' });
    UI.text(g, String(M.score[s]), s === 0 ? sx + 12 : sx + sbw - 12, 16, '#ffffff', { align: s === 0 ? 'left' : 'right', scale: 2 });
    void x;
  }
  const clockTxt = FF.fmtClock(M.clock);
  UI.text(g, M.ot ? 'OT' : 'Q' + M.q, W / 2, 6, '#ffe08a', { align: 'center' });
  UI.text(g, clockTxt, W / 2, 16, M.clock < 11 ? '#ff7a6a' : '#fff', { align: 'center', scale: 2 });
  const sit = M.phase === 'kick' ? (M.kick.type === 'punt' ? 'PUNT' : M.kick.type === 'pat' ? 'EXTRA POINT' : 'FIELD GOAL') : ord(M.down) + ' & ' + (M.goalDist() <= M.toGo() ? 'GOAL' : M.toGo()) + '  ' + spotText(M);
  UI.text(g, sit, W / 2, 36, '#ffe08a', { align: 'center' });
  { const px0 = M.poss === 0 ? sx - 6 : sx + sbw + 6; UI.text(g, '•', px0, 14, '#ffe08a', { align: 'center', scale: 2 }); }
  if (M.fire[0] > 0 || M.fire[1] > 0) { const s = M.fire[0] > 0 ? 0 : 1; UI.text(g, 'ON FIRE', s === 0 ? sx - 4 : sx + sbw + 4, 12, '#ff8a2a', { align: s === 0 ? 'right' : 'left', scale: 2 }); }
  // turbo and meter for the human side
  const hx = 8, hy = H - 36; if (S.cfg.mode !== 'attract') {
  UI.text(g, 'TURBO', hx, hy - 9, '#8ad8ff');
  g.save && 0; E.ui.bar(g, hx, hy, 70, 6, clamp(M.turbo[hs] / 100, 0, 1), M.turbo[hs] < 20 ? '#ff6a4a' : '#4ac8ff');
  UI.text(g, 'FIASCO', hx, hy + 8, '#ffd23a');
  E.ui.bar(g, hx, hy + 17, 70, 6, clamp(M.meter[hs] / 100, 0, 1), M.card[hs] ? FF.CARDS[M.card[hs]].col : '#ffb347');
  if (M.card[hs]) UI.text(g, UI.label('y') + ' ' + FF.CARDS[M.card[hs]].name, hx, hy - 20, FF.CARDS[M.card[hs]].col);
  }
  // receiver prompts
  if (S.cfg.mode !== 'attract' && M.phase === 'live' && M.live && M.live.mode === 'pocket' && M.ball.carrier === M.live.qb && M.live.qb.human) {
    const recs = M.receivers(), keys = ['a', 'b', 'x', 'swap'];
    recs.forEach((rc, i) => { if (rc === M.live.qb) return; const p = r.w(rc.x, rc.y, 36); const lab = UI.label(keys[i]); const w = Math.max(14, E.font.width(lab) + 8); UI.box(g, p[0] - w / 2, p[1] - 8, w, 12, { bg: ['#ffb347', '#e0662a'], border: '#fff' }); UI.text(g, lab, p[0], p[1] - 5, '#fff', { align: 'center' }); });
  }
  if (S.cfg.mode !== 'attract') drawHint(g, r, M);
  // ticker
  if (S.ticker && game.settings.commentary !== false) {
    const t = S.ticker, txt = t.text.slice(0, Math.floor(t.shown)), w = Math.min(W - 190, 250);
    const ty0 = S.cfg.mode === 'attract' ? H - 70 : H - 40;
    UI.box(g, W / 2 - w / 2, ty0, w, 28, { bg: ['#14122a', '#0a0818'], border: t.who === 'CHUCK' ? '#6a9aff' : '#ff7ab0', alpha: .9 });
    UI.text(g, t.who, W / 2 - w / 2 + 6, ty0 + 2, t.who === 'CHUCK' ? '#8ab0ff' : '#ff9ac8');
    const lines = E.font.wrap(txt, w - 12, {}); lines.slice(0, 2).forEach((ln, i) => UI.text(g, ln, W / 2 - w / 2 + 6, ty0 + 12 + i * 9, '#fff'));
  }
  // banner
  if (S.banner && M.phase !== 'half') {
    const b = S.banner, u = b.t / b.dur, ease = Math.min(1, b.t * 7), sc = b.big ? 4 : 3, yy = Math.round(H * .3 + (1 - ease) * -20);
    if (u < .9 || Math.floor(b.t * 18) % 2 === 0) E.font.title(g, b.text, W / 2, yy, { align: 'center', scale: sc + (ease < 1 ? 1 : 0), colors: [b.color, b.color, '#ffffff'].slice(0, 2).concat(['#401000']), depth: 3, depthColor: '#200800' });
  }
  if (S.toast) UI.text(g, S.toast.text, W / 2, 50, S.toast.color, { align: 'center', scale: 1 });
  if (S.cfg.mode === 'story' && S.cfg.boss && M.phase === 'call' && M.callTime < 3) UI.text(g, FF.TEAMS[S.cfg.away].boss, W / 2, 62, '#ff7a6a', { align: 'center' });
  // replay marker
  if (S.replay) { if (Math.floor(game.real * 2) % 2 === 0) UI.text(g, '• INSTANT REPLAY', 10, 40, '#ff6a6a', { scale: 2 }); UI.text(g, UI.prompt('confirm', 'Skip'), W - 10, H - 14, '#c8c0e8', { align: 'right' }); const bars = Math.floor(game.real * 4) % 2; if (bars) { px.rect(g, 0, 0, W, 6, '#000'); px.rect(g, 0, H - 6, W, 6, '#000'); } return; }
  // phases
  if (M.phase === 'call' && S.need) drawPlaycall(g, r, M, S.need);
  else if (M.phase === 'call' && !S.need && M.callTime > .1) UI.text(g, M.callStage === 0 ? 'THE OFFENSE IS CALLING A PLAY' : 'THE DEFENSE IS READING THE PLAY', W / 2, 60, '#c8c0e8', { align: 'center' });
  if (M.phase === 'kick') drawKickHud(g, r, M);
  if (M.phase === 'half') drawHalf(g, r, M);
  if (M.phase === 'final') drawFinalBanner(g, r, M);
  if (S.cfg.mode === 'attract') { UI.big(g, 'AMERICAN FOOTBALL FIASCO', W / 2, 52, 2); if (Math.floor(game.real * 1.6) % 2 === 0) UI.text(g, 'PRESS ANY BUTTON', W / 2, H - 26, '#ffe08a', { align: 'center', scale: 2 }); }
  if (S.devOpen && FF.dev) FF.dev.draw(g, r);
  if (FF.drillHud && S.cfg.mode === 'drill') FF.drillHud(g, r, M);
  if (S.cfg.two) { UI.text(g, 'P1', 6, 40, PCOL[0]); UI.text(g, 'P2', W - 18, 40, PCOL[1]); }
}
function drawHint(g, r, M) {
  const H = r.H, W = r.W, hs = humanSide(M); let s = '';
  if (M.phase === 'set' && M.humans[M.poss]) s = UI.prompt('a', 'SNAP');
  else if (M.phase === 'live' && M.live && !M.live.over) {
    const c = M.ctlOf && M.ctlOf[hs];
    if (c && c.ball) s = M.live.mode === 'pocket' && c === M.live.qb ? UI.label('a') + '/' + UI.label('b') + '/' + UI.label('x') + ' Throw   ' + UI.prompt('swap', 'Back') + '   ' + UI.prompt('turbo', 'Turbo') : UI.prompt('a', 'Juke') + '   ' + UI.prompt('b', 'Stiff-arm') + '   ' + UI.prompt('x', 'Lateral') + '   ' + UI.prompt('turbo', 'Turbo');
    else if (c) s = UI.prompt('a', 'Dive') + '   ' + UI.prompt('x', 'Jump') + '   ' + UI.prompt('b', 'Switch') + '   ' + UI.prompt('turbo', 'Turbo');
  }
  if (!s || S.ticker) return;
  UI.text(g, s, W / 2, H - 14, '#c8c0e8', { align: 'center' });
}
function drawPlaycall(g, r, M, need) {
  const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, 'rgba(6,4,20,0.55)');
  const opts = need === 'off' ? offOptions(M) : defOptions(), sel = need === 'off' ? S.calls.gridSel : S.calls.defSel;
  UI.text(g, (need === 'off' ? 'CALL YOUR PLAY' : 'CALL YOUR DEFENSE') + (S.cfg.two ? (need === 'off' ? '  (P1)' : '  (P2)') : ''), W / 2, 50, '#ffffff', { align: 'center', scale: 2 });
  opts.forEach((o, i) => {
    const rc = cardRect(i, need, W, H), on = i === sel;
    UI.box(g, rc[0], rc[1], rc[2], rc[3], { bg: on ? ['#ffb347', '#e0662a'] : ['#2a2450', '#161232'], border: on ? '#fff2c0' : (o.kick ? '#7ad8ff' : '#e8c860'), alpha: o.disabled ? .5 : 1 });
    const nm = E.font.wrap(o.name, rc[2] - 8, {}); nm.slice(0, 2).forEach((ln, k) => UI.text(g, ln, rc[0] + rc[2] / 2, rc[1] + 3 + k * 8, o.disabled ? '#7a7490' : '#fff', { align: 'center' }));
    drawIcon(g, o, rc[0] + 4, rc[1] + 20, rc[2] - 8, rc[3] - 22, on);
  });
  const o = opts[sel], blurb = o.play ? o.play.blurb : o.def ? o.def.blurb : o.blurb;
  UI.box(g, 20, H - 56, W - 40, 38, { bg: ['#14122a', '#0a0818'], border: '#e8c860' });
  UI.text(g, o.name, W / 2, H - 53, '#ffe08a', { align: 'center', scale: 2 });
  const ls = E.font.wrap(blurb || '', W - 56, {}); ls.slice(0, 2).forEach((ln, i) => UI.text(g, ln, W / 2, H - 37 + i * 9, '#fff', { align: 'center' }));
  UI.text(g, UI.prompt('confirm', 'Call it') + '     ' + 'Stick / D-pad: choose', W / 2, H - 13, '#c8c0e8', { align: 'center' });
}
function drawIcon(g, o, x, y, w, h, on) {
  const cx = x + w / 2, cy = y + h / 2;
  if (o.play) {
    const pl = o.play, sc = Math.min(w / 34, h / 24) * 1.0;   // yards -> px
    const P = (fx, fy) => [cx + fy * sc * .9, y + h - 4 - (fx + 7) * sc * .55];
    for (const role of FF.OFF_ROLES) {
      const f = FF.OFF_FORM[role]; const a = P(f[0], f[1]);
      if (pl.routes && pl.routes[role]) { let px0 = a; for (const [rx, ry] of pl.routes[role]) { const b = P(f[0] + rx, f[1] + ry); px.line(g, px0[0], px0[1], b[0], b[1], on ? '#401000' : '#ffe08a', 1); px0 = b; } }
      if (role === 'RB' && pl.path) { let px0 = a; for (const [rx, ry] of pl.path) { const b = P(rx, ry); px.line(g, px0[0], px0[1], b[0], b[1], on ? '#401000' : '#ff9a4a', 1); px0 = b; } }
      px.rect(g, a[0] - 1, a[1] - 1, 3, 3, role === 'QB' ? '#ffffff' : on ? '#401000' : '#c8c0e8');
    }
  } else if (o.def) {
    const sc = Math.min(w / 34, h / 24);
    const P = (fx, fy) => [cx + fy * sc * .9, y + 6 + fx * sc * .5];
    for (const role of FF.DEF_ROLES) { const f = FF.DEF_FORM[role], a = P(f[0], f[1]); px.rect(g, a[0] - 1, a[1] - 1, 3, 3, on ? '#401000' : '#ff8a8a'); if (o.def.id === 'blitz' && /^(DL|LB)/.test(role)) px.line(g, a[0], a[1], cx, y - 2, on ? '#401000' : '#ffe08a', 1); if (o.def.id === 'man' && /^DB|LB/.test(role)) px.line(g, a[0], a[1], a[0], a[1] - 8, on ? '#401000' : '#ffe08a', 1); if (o.def.id === 'zone' && /^(DB|S|LB)/.test(role)) px.disc(g, a[0], a[1] - 3, 4, on ? 'rgba(64,16,0,0.3)' : 'rgba(255,224,138,0.3)'); if (o.def.id === 'spy' && role === 'LB1') px.disc(g, a[0], a[1] - 5, 3, '#8ad8ff'); }
  } else {
    UI.text(g, o.id === 'fg' ? '3 PTS' : 'PUNT', cx, cy - 3, on ? '#401000' : '#7ad8ff', { align: 'center', scale: 2 });
  }
}
function drawKickHud(g, r, M) {
  const k = M.kick, W = r.W, H = r.H; if (!k) return;
  const bw = 200, bx = Math.round(W / 2 - bw / 2), by = H - 60;
  UI.box(g, bx - 8, by - 20, bw + 16, 54, { bg: ['#14122a', '#0a0818'], border: '#e8c860' });
  if (k.stage <= 1) {
    UI.text(g, k.stage === 0 ? 'LINE UP THE KICK' : UI.prompt('a', 'STOP THE POWER'), W / 2, by - 16, '#ffe08a', { align: 'center' });
    px.rect(g, bx, by, bw, 10, '#2a2450'); px.rect(g, bx, by, Math.round(bw * k.pw), 10, k.pw > .85 ? '#ff6a4a' : '#8aff8a');
    if (k.type !== 'punt') { const need = clamp((k.dist - 12) / 52, .12, 1) * .93; px.rect(g, bx + Math.round(bw * need), by - 3, 2, 16, '#ffffff'); UI.text(g, k.dist + ' YD', bx + bw, by + 14, '#c8c0e8', { align: 'right' }); }
  } else if (k.stage === 2) {
    UI.text(g, UI.prompt('a', 'STOP THE AIM'), W / 2, by - 16, '#ffe08a', { align: 'center' });
    px.rect(g, bx, by, bw, 10, '#2a2450'); const tol = k.type === 'punt' ? .5 : clamp(0.5 - k.dist * .0062, .12, .5);
    px.rect(g, bx + Math.round(bw * (.5 - tol / 2)), by, Math.round(bw * tol), 10, '#3a8a4a'); px.rect(g, bx + Math.round(bw * (.5 + k.ac / 2)) - 1, by - 3, 3, 16, '#ffffff');
  } else if (k.stage >= 3) {
    UI.text(g, k.stage === 4 ? (k.outcome === 'good' ? "IT'S GOOD!" : k.outcome === 'punt' ? 'PUNTED' : k.outcome === 'short' ? 'SHORT!' : 'WIDE!') : 'IN THE AIR...', W / 2, by - 4, '#ffe08a', { align: 'center', scale: 2 });
  }
}
function drawHalf(g, r, M) {
  const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, 'rgba(6,4,20,0.7)');
  UI.big(g, 'HALFTIME', W / 2, 20, 4);
  UI.text(g, M.teams[0].short + ' ' + M.score[0] + '  -  ' + M.score[1] + ' ' + M.teams[1].short, W / 2, 58, '#fff', { align: 'center', scale: 2 });
  if (S.half && !S.half.done && M.humans[humanSide(M)]) {
    UI.text(g, 'PICK A SECOND-HALF ADJUSTMENT', W / 2, 84, '#ffe08a', { align: 'center' });
    S.half.sel.update(); S.half.sel.draw(g, W / 2, 98, { w: 200 });
    const tips = ['Start the half with full turbo.', 'Start with the Fiasco Meter at 70%.', 'Start the half ON FIRE.']; UI.text(g, tips[S.half.sel.i], W / 2, 160, '#c8c0e8', { align: 'center' });
  } else UI.text(g, 'The band plays. The nachos cool. Second half in a moment...', W / 2, 100, '#c8c0e8', { align: 'center' });
}
function drawFinalBanner(g, r, M) {
  const W = r.W, H = r.H; const w = M.winner; UI.box(g, W / 2 - 100, H / 2 - 30, 200, 60, { bg: ['#14122a', '#0a0818'], border: '#e8c860' });
  UI.text(g, 'FINAL', W / 2, H / 2 - 24, '#ffe08a', { align: 'center', scale: 2 });
  UI.text(g, M.score[0] + ' - ' + M.score[1], W / 2, H / 2 - 4, '#fff', { align: 'center', scale: 2 });
  UI.text(g, w < 0 ? 'A TIE?! In football?!' : M.teams[w].name + ' WIN', W / 2, H / 2 + 16, '#c8c0e8', { align: 'center' });
}
FF.matchDebug = () => { const M = S.M; return M ? { phase: M.phase, score: M.score.slice(), q: M.q, clock: Math.round(M.clock), down: M.down, poss: M.poss, over: M.over } : null; };
})();
