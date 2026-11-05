/* ---- EFFECTS: what the presentation does when the simulation emits (sound, particles, banners, the crowd, the
 * commentators, the replays). Listeners only: nothing here changes the match ---- */
TT.fx = { on: false };
const nick = id => (M && M.players[id] ? M.players[id].data.nick : '');
const teamName = t => (M ? M.teams[t].name : '');
const PTX = () => TT.game.particles;
const at = id => M.players[id];
const live = () => TT.cfg.present && TT.fx.on;
const noFreeze = () => TT.cfg.session;
TT.fx.install = () => {
  const B = TT.bus, S = TT.audio.sfx, C = (c, v, p) => TT.comm.say(c, v, p), ban = (t, o) => TT.hud.banner(t, o);
  const freeze = s => { if (!noFreeze() && !TT.replay.playing) TT.game.freeze(s); };
  const on = (n, f) => B.on(n, d => { if (live()) f(d); });
  on('whistle', () => S('whistle'));
  on('kickoff', d => { S('punt'); if (d.kind === 'kickoff') C('kickoff', {}); });
  on('kickoffSetup', () => TT.audio.sting('roll'));
  on('pass', d => { S('pass'); if (d.offload) ban('OFFLOAD!', { scale: 2, life: 1 }); });
  on('catch', () => S('catch'));
  on('kickCaught', () => S('catch'));
  on('bounce', d => { if (d.v > 40) S('bok'); });
  on('kick', d => { S(d.kind === 'grubber' ? 'tap' : 'punt'); if (d.mega) ban('MEGA BOOT!', { scale: 2 }); });
  on('tackle', d => { const p = at(d.victim); S('thud'); TT.babble.grunt(p); PTX().dust(p.x, p.y, 2, 6); if (TT.sim.onMud(p.x, p.y)) PTX().bits(p.x, p.y, 4, 6, ['#5a3a1e', '#7a5a2e']); else PTX().bits(p.x, p.y, 3, 3, ['#4a8a3a', '#6aa04a']); TT.game.shake(1); });
  on('bigHit', d => { const p = at(d.victim); S('crunch'); S('thud'); TT.game.hitFx(p.x, p.y, 18, { power: 1.2, rumble: true }); freeze(.08); TT.game.shake(4); C('bigHit', { player: nick(d.pid) }, 2); ban('BIG HIT!', { scale: 2, life: 1.1 }); PTX().sparks(p.x, p.y, 18, 10); });
  on('monsterHit', d => { const p = at(d.victim); S('crunch'); S('boom'); S('oooh'); TT.audio.sting('monster'); TT.game.hitFx(p.x, p.y, 20, { power: 2 }); freeze(.12); TT.game.flash('#ffffff', .1, .6); TT.game.shake(6); PTX().ring(p.x, p.y, 4, 40, '#ffffff', .4); PTX().text(p.x, p.y, 40, 'WHUMP', '#ffe040', { scale: 2, bounce: true }); ban('MONSTER HIT!', { colors: ['#ffffff', '#ffd040', '#ff6020', '#a01010'] }); C('monsterHit', { player: nick(d.pid) }, 3); TT.replay.trigger('monster', d.victim); TT.game.input.rumble(.8, .3); });
  on('brokenTackle', d => { S('thud'); if (TT.fxRng() < .4) C('fend', { player: nick(d.pid) }); });
  on('sidestep', d => { S('turbo'); C('sidestep', { player: nick(d.pid) }); });
  on('spin', d => { S('turbo'); C('sidestep', { player: nick(d.pid) }); ban('SPIN!', { scale: 2, life: .8 }); });
  on('fend', d => { S('thud'); C('fend', { player: nick(d.pid) }); ban('HAND-OFF!', { scale: 2, life: .9 }); });
  on('dummy', d => { if (d.sold) { C('dummy', {}); ban('DUMMY!', { scale: 2, life: .9 }); } });
  on('lineBreak', d => { C('lineBreak', { player: nick(d.pid) }, 2); ban('LINE BREAK!', { scale: 2 }); S('roar'); });
  on('interception', d => { C('intercept', { player: nick(d.pid) }, 2); ban('INTERCEPTED!', { scale: 2 }); S('oooh'); });
  on('knockOn', () => { C('knockOn', {}, 2); ban('KNOCK-ON', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); S('groan'); });
  on('forwardPass', () => { C('forwardPass', {}, 2); ban('FORWARD!', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); });
  on('ruck', d => { if (TT.fxRng() < .5) TT.babble.grunt(at(M.ph.att[0] != null ? M.ph.att[0] : 0)); void d; });
  on('jackal', d => { C('turnover', { player: nick(d.pid) }, 2); ban('JACKAL!', { scale: 2 }); });
  on('ruckTurnover', () => { C('turnover', {}, 1); ban('TURNOVER!', { scale: 2, life: 1 }); });
  on('scrum', () => C('scrum', {}));
  on('scrumCall', d => { if (d.word === 'SET') { S('engage'); TT.game.shake(2); } TT.babble.letter('a', TT.CAST.nigel.voice, 0); });
  on('scrumEngage', () => { S('engage'); M.players.filter(p => p.st === 'scrum').slice(0, 2).forEach(p => TT.babble.grunt(p)); });
  on('scrumWon', d => { if (d.steal) ban('SCRUM STEAL!', { scale: 2 }); });
  on('earlyEngage', () => ban('EARLY ENGAGEMENT', { scale: 2, colors: ['#ffffff', '#ff8070'] }));
  on('pushoverTry', () => { C('pushover', {}, 3); });
  on('lineoutThrow', () => S('pass'));
  on('lineoutWon', () => C('lineout', {}));
  on('lineoutSteal', () => { ban('STOLEN!', { scale: 2 }); C('lineout', {}, 2); });
  on('notStraight', () => { C('notStraight', {}, 2); ban('NOT STRAIGHT', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); });
  on('touch', () => {});
  on('kickTouch', () => C('kickTouch', {}));
  on('try', d => {
    const p = at(d.pid);
    TT.audio.sting('try'); S('roar'); TT.game.shake(3);
    ban(d.how === 'pushover' ? 'PUSHOVER TRY!' : d.how === 'penaltyTry' ? 'PENALTY TRY!' : 'TRY!', { scale: 4, life: 2.2, sub: TT.ascii(p.data.nick) + ' (' + M.teams[d.team].short + ')' });
    C('try', { player: nick(d.pid), team: teamName(d.team) }, 3);
    PR.cheer = 3; PR.cheerSide = d.team; PR.scorer = d.pid;
    PTX().bits(p.x, p.y, 20, 40, [M.kits[d.team].cloth, M.kits[d.team].trim, '#ffffff', '#ffe040']);
    const tod = M.o.time && M.o.time !== 'venue' ? M.o.time : M.venue.time;
    if (tod !== 'day') for (let k = 0; k < 4; k++) TT.game.after(k * .35, () => PTX().explosion(d.x + (k - 1.5) * 90, G.Y0 - 60, 140 + k * 10, 1.2, { debris: false, freeze: false, shake: 0 }));
    const run = d.run >= 200, big = d.how === 'pushover' || run;
    if (TT.settings.replays === 'All tries' || (TT.settings.replays !== 'Off' && big)) TT.replay.trigger('try', d.pid, true);
  });
  on('conversion', () => { ban('CONVERTED!', { scale: 3, colors: ['#ffffff', '#80ff90', '#20a040'] }); S('ding'); C('convMade', {}, 2); PR.cheer = 1.5; });
  on('penaltyGoal', () => { ban('PENALTY GOAL!', { scale: 3, colors: ['#ffffff', '#80ff90', '#20a040'] }); S('ding'); C('convMade', {}, 2); });
  on('convMiss', () => { ban('WIDE!', { scale: 3, colors: ['#ffffff', '#ff9080'] }); S('groan'); C('convMiss', {}, 2); });
  on('penMiss', () => { ban('WIDE!', { scale: 3, colors: ['#ffffff', '#ff9080'] }); S('groan'); C('convMiss', {}, 2); });
  on('doink', () => { S('doink'); ban('DOINK!', { scale: 3, colors: ['#ffffff', '#ffe060'] }); C('doink', {}, 3); });
  on('dropGoal', d => { TT.audio.sting('drop'); ban('DROP GOAL!', { scale: 3 }); C('dropGoal', { player: nick(d.pid) }, 3); PR.cheer = 2; PR.cheerSide = d.team; TT.replay.trigger('drop', d.pid); });
  on('dropGoalResult', d => { if (d.res === 'doink') { S('doink'); ban('DOINK!', { scale: 3 }); } else if (d.res === 'miss') S('groan'); });
  on('foulUnseen', () => {});
  on('cheapUnseen', () => { C('cheapUnseen', {}, 2); });
  on('cheapShot', d => { const v = at(d.victim); S('thud'); PTX().impact(v.x, v.y, 14, 1, '#ffffff'); });
  on('advantage', () => { TT.comm.say('penalty', {}, 1); });
  on('advantageOver', () => C('advOver', {}));
  on('penalty', () => { ban('PENALTY', { scale: 2 }); C('penalty', {}, 2); });
  on('freeKick', () => ban('FREE KICK', { scale: 2 }));
  on('card', d => { const p = at(d.pid); ban(d.red ? 'RED CARD!' : 'YELLOW CARD!', { scale: 3, colors: d.red ? ['#ffffff', '#ff4040', '#a01010'] : ['#ffffff', '#ffe040', '#c8a010'], sub: TT.ascii(p.data.nick) }); TT.audio.sting('yellow'); S('boo'); PR.boo = 2; PR.cheerSide = 1 - p.team; C(d.red ? 'red' : 'yellow', {}, 3); });
  on('sinBinOut', d => ban('BACK FROM THE BIN', { scale: 1, life: 1.2, sub: TT.ascii(nick(d.pid)) }));
  on('refDown', () => { ban('REF DOWN!', { scale: 3, colors: ['#ffffff', '#ff8060'] }); C('refDown', {}, 3); S('oooh'); });
  on('onFire', d => { ban("HE'S ON FIRE!", { scale: 3, colors: ['#fff8c0', '#ffd040', '#ff6020', '#c02010'], sub: TT.ascii(nick(d.pid)) }); TT.audio.sting('fire'); C('onFire', {}, 3); });
  on('superStart', d => { S('super'); ban(d.kind === 'thunder' ? 'THUNDER RUN!' : 'HURRICANE HIT!', { scale: 3, colors: d.kind === 'thunder' ? ['#ffffff', '#ffe040', '#ff8020'] : ['#ffffff', '#a0e0ff', '#4080ff'] }); C('super', {}, 3); TT.replay.trigger('super', d.pid); });
  on('hypeFull', d => { if (TT.seats.some(s => s.team === d.team && s.kind === 'local')) ban('SUPER READY!', { scale: 2, life: 1.2 }); });
  on('powerupThrow', d => { C(d.kind === 'pie' ? 'powerup' : 'powerup', {}, 1); });
  on('powerupTake', d => { const n = TT.POWERUPS[d.kind]; ban(n.name + '!', { scale: 2, sub: TT.ascii(nick(d.pid)) }); S(d.kind === 'pie' ? 'munch' : d.kind === 'horn' ? 'horn' : 'super'); TT.comm.show('barry', n.line); if (d.kind === 'horn') { PR.cheer = 2; PR.cheerSide = at(d.pid).team; } });
  on('chicken', () => { S('squawk'); C('chicken', {}, 2); ban('PITCH INVADER!', { scale: 2 }); });
  on('clucked', () => S('squawk'));
  on('flameWarn', () => {});
  on('flame', d => { S('flame'); PTX().fire(d.x, d.y, 4, 6, { size: 1.4 }); });
  on('toasted', () => C('flames', {}, 2));
  on('lightningWarn', () => {});
  on('lightning', d => { S('crack'); S('thunder'); TT.game.flash('#e0e8ff', .12, .8); TT.game.shake(4); PTX().sparks(d.x, d.y, 2, 16); C('lightning', {}, 2); });
  on('mudCall', () => C('mud', {}));
  on('hooter', () => { S('hooter'); ban('HOOTER!', { scale: 2 }); C('hooter', {}, 3); });
  on('halftime', () => { S('whistleLong'); C('half', {}, 3); });
  on('suddenDeath', () => { ban('GOLDEN POINT!', { scale: 3 }); C('sudden', {}, 3); });
  on('fulltime', d => { S('whistleLong'); TT.game.after(.4, () => S('whistle')); C('full', { team: d.winner >= 0 ? teamName(d.winner) : 'nobody', score: M.score[0] + '-' + M.score[1] }, 3); PR.cheer = 4; PR.cheerSide = d.winner >= 0 ? d.winner : 0; });
  on('switch', () => S('select'));
  on('sputter', d => { if (at(d.pid).ctl >= 0) S('sputter'); });
  on('refCall', d => { for (let i = 0; i < Math.min(6, d.text.length); i++) TT.game.after(i * .05, () => TT.babble.letter(d.text[i], TT.CAST.nigel.voice, i)); });
  on('land', d => { const p = at(d.pid); PTX().dust(p.x, p.y, 2, 10); S('thud'); });
  on('bounceOff', d => { const p = at(d.pid); PTX().impact(p.x, p.y, 16, 1.2, '#ffd040'); S('thud'); });
  on('gangHold', () => ban('HOLD HIM!', { scale: 2, life: .9 }));
  on('shrug', () => ban('SHRUGGED OFF!', { scale: 2, life: .9 }));
  on('stepMove', d => { if (at(d.pid).ctl >= 0) S('turbo'); });
  on('tryDive', d => { const p = at(d.pid); PTX().dust(p.x, p.y, 2, 12); });
};
/** the music's layers follow the match: drums in their 22, the hype layer when a meter is full or a player is on fire */
TT.fx.music = m => {
  if (!m) return;
  const b = m.ball, att = m.possession, near = Math.abs(tryLineOf(att) - b.x) < 225;
  const hot = m.hype[0] >= 100 || m.hype[1] >= 100 || m.players.some(p => p.fire > 0 || p.superK);
  if (near !== TT.fx._near) { TT.fx._near = near; TT.audio.layer('drums', near ? 1 : 0); }
  if (hot !== TT.fx._hot) { TT.fx._hot = hot; TT.audio.layer('hype', hot ? 1 : 0); }
};

/* ---- INSTANT REPLAY: the last 5 s of the state at 60 Hz; playback through the same presentation, 0.5x ---- */
TT.replay = {
  buf: [], playing: false, pending: null, lastT: -99, view: null, i: 0, step: 0,
  reset() { this.buf = []; this.playing = false; this.pending = null; this.lastT = -99; this.view = null; },
  record(m) {
    if (!m || this.playing) return;
    this.step ^= 1; if (this.step) return;
    this.buf.push({
      t: m.t, phase: m.phase,
      P: m.players.map(p => ({ x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, st: p.st, stT: p.stT, fire: p.fire, superK: p.superK, toasted: p.toasted, zapped: p.zapped, charge: p.charge, celeb: p.celeb, flex: p.flex, held: p.held, stun: p.stun, turboOn: p.turboOn, launch: p.launch, kickHold: 0, ctl: -1, power: p.power, mud: p.mud })),
      b: Object.assign({}, m.ball, { tried: null, landing: m.ball.landing }), r: Object.assign({}, m.ref)
    });
    if (this.buf.length > 300) this.buf.shift();
    if (this.pending && m.t >= this.pending.at) this.start(m);
  },
  trigger(kind, pid, isTry) {
    if (!M || TT.cfg.session || M.o.attract && kind !== 'try' && kind !== 'monster' && kind !== 'super' || TT.settings.replays === 'Off' || M.drill) return;
    if (!isTry && M.t - this.lastT < 30) return;
    if (this.pending || this.playing) return;
    this.pending = { at: M.t + 1, from: M.t - 2.5, pid, kind };
  },
  start(m) {
    const p = this.pending; this.pending = null; this.lastT = m.t;
    const i0 = this.buf.findIndex(f => f.t >= p.from); if (i0 < 0 || this.buf.length - i0 < 20) return;
    this.frames = this.buf.slice(i0); this.i = 0; this.playing = true; this.focus = p.pid; m.frozen = true;
    TT.bus.emit('replayStart', {}); TT.comm.show('barry', "Let's see that again!");
  },
  stop(m) { this.playing = false; this.view = null; if (m) m.frozen = false; TT.bus.emit('replayEnd', {}); this.buf = []; },
  /** each update while playing: the next frame (0.5x); returns the view the presentation draws */
  tick(dt, m, skip) {
    if (!this.playing) return null;
    this.i += dt * 60 * .5;
    if (skip || this.i >= this.frames.length - 1) { this.stop(m); return null; }
    const f = this.frames[Math.floor(this.i)];
    const v = Object.create(m);
    v.players = m.players.map((p, k) => Object.assign(Object.create(p), f.P[k]));
    v.ball = f.b; v.ref = Object.assign(Object.create(m.ref), f.r); v.phase = f.phase; v.ph = m.ph; v.hazards = []; v.pu = null; v.useIt = null;
    this.view = v; return v;
  }
};
