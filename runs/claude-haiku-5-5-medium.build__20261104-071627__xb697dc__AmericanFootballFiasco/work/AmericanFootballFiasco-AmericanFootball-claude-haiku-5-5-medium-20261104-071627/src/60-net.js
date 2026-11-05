/* AMERICAN FOOTBALL FIASCO: online play through AI Hub (AI Hub Session Protocol v1, shared-world mode, two players).
 * The host's copy runs the match; the guest sends its inputs and calls, and the host sends it the state (snapshots, about eight a
 * second, unreliable: the newest one is what counts). The guest's copy mirrors the snapshots and draws them. Also here: the
 * remote input (a player's inputs fed in from messages, read the way the local input is), and the couch's two-player join. */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, S = FF.sim, game = FF.game, { clamp } = FF;
const NET = FF.net = { role: 'solo', hostId: 0, myId: 0, remote: null, ready: false, lastSnap: null, sendT: 0, inT: 0, pend: new Set(), outCall: null, info: null, done: false };
const r0 = Math.round;

/* a remote player's input: the same reads as the local input (move, down, pressed, consume), fed from the messages */
class RemoteInput {
  constructor() { this.m = [0, 0]; this.held = new Set(); this.pend = new Set(); this.lastDevice = 'keyboard'; this.player = 1; }
  move() { return this.m; }
  down(a) { return this.held.has(a); }
  pressed(a) { return this.pend.has(a); }
  buffered(a) { return this.pend.has(a); }
  released() { return false; }
  consume(a) { this.pend.delete(a); }
  label(a) { return a.toUpperCase(); }
  feed(d) { this.m = d.m || [0, 0]; this.held = new Set(d.h || []); for (const a of d.p || []) this.pend.add(a); }
}
NET.RemoteInput = RemoteInput;

/* the host's state: what the guest's copy needs to draw the match (the players, the ball, the score and the call) */
const SEND_ACTIONS = ['pass', 'juke', 'hit', 'switch', 'turbo'];
S.snapshot = () => {
  const b = S.ball;
  return { k: 's', ph: S.phase, po: S.poss, lo: r0(S.los), dn: S.down, tg: r0(S.togo), sc: S.score.slice(), q: S.qtr, c: r0(S.clock), pl: S.play, m: S.msg, mt: +S.msgT.toFixed(1),
    h1: S.half1 ? 1 : 0, ov: S.over ? 1 : 0, td: S.tdSide, tu: r0(S.turbo || 0), st: S.streak.slice(), bz: S.blazeT.map(v => +v.toFixed(1)), stt: S.stats,
    p: S.all.map(p => [r0(p.x), r0(p.y), +p.f.toFixed(2), p.down > 0 ? 1 : 0, p.human ? 1 : 0]),
    b: [r0(b.x), r0(b.y), r0(b.z), b.mode, b.holder ? S.all.indexOf(b.holder) : -1] };
};
// the guest's copy takes a snapshot as the state of the match
S.applySnapshot = d => {
  Object.assign(S, { phase: d.ph, poss: d.po, los: d.lo, down: d.dn, togo: d.tg, score: d.sc, qtr: d.q, clock: d.c, play: d.pl, msg: d.m, msgT: d.mt, half1: !!d.h1, over: !!d.ov, tdSide: d.td, turbo: d.tu, streak: d.st, blazeT: d.bz, stats: d.stt });
  d.p.forEach((a, i) => { const p = S.all[i]; if (!p) return; p.x = a[0]; p.y = a[1]; p.f = a[2]; p.down = a[3] ? 1 : 0; p.human = !!a[4]; });
  const [bx, by, bz, mode, hi] = d.b, ball = S.ball;
  ball.x = bx; ball.y = by; ball.z = bz; ball.mode = mode; ball.holder = hi >= 0 ? S.all[hi] : null;
};

/* the guest sends its own inputs ten times a second, and the calls it makes */
function guestSend(dt, I) {
  NET.inT -= dt; if (NET.inT > 0) return;
  NET.inT = .1;
  const pend = [...NET.pend]; NET.pend.clear();
  const mv = I ? I.move() : [0, 0], held = I ? SEND_ACTIONS.filter(a => I.down(a)) : [];
  FF.hub.send({ k: 'i', m: [+mv[0].toFixed(2), +mv[1].toFixed(2)], h: held, p: pend }, { reliable: false });
  if (NET.outCall) { FF.hub.send({ k: 'c', key: NET.outCall }); NET.outCall = null; }
}
// what the guest's own input did this step, kept until the next send
function collect(I) {
  if (!I) return;
  for (const a of SEND_ACTIONS) if (I.pressed(a)) { NET.pend.add(a); I.consume(a); }
}

/* the online scene: the hub's round, the host's match or the guest's mirror of it */
FF.scenes.online = {
  pausable: false, view: 'threequarter', res: 'ps1', expand: true, camera: { zoom: [.5, 1.6], start: .6 },
  enter() {
    NET.done = false; NET.lastSnap = null; NET.pend.clear(); NET.outCall = null;
    FF.hub = window.AIHub;
    FF.buildFor(D.CHAPTERS[0]); FF.field.lights();
    FF.radio(D.LINES.kickoff[0], 2.6);
    FF.hub.connect({ mode: 'shared-world', seats: [2, 2] }).then(info => {
      if (!info) { game.go('title', null, { fade: 0 }); return; }
      NET.info = info; NET.hostId = info.host; NET.myId = info.me; NET.role = info.isHost ? 'host' : 'guest';
      const guestId = info.players.map(p => p.id).find(id => id !== info.host);
      const cfg = { mode: 'online', chapter: D.CHAPTERS[0], seed: info.seed, human: [], ctrl: {} };
      if (NET.role === 'host') { NET.remote = new RemoteInput(); cfg.ctrl = { 0: game.input, 1: NET.remote }; }
      else cfg.ctrl = { 1: game.input };
      S.start(cfg);
      FF.hub.on('message', (d, from) => {
        if (!d || typeof d !== 'object') return;
        if (d.k === 'i' && NET.remote) NET.remote.feed(d);
        else if (d.k === 'c' && NET.role === 'host' && S.phase === 'call' && S.ctrlOf(S.poss) === NET.remote) S.pickCall(d.key);
        else if (d.k === 's' && NET.role === 'guest') { NET.lastSnap = d; S.applySnapshot(d); }
      });
      FF.hub.on('start', () => { NET.started = true; });
      FF.hub.on('time-up', () => { if (NET.role === 'host') finish(); });
      FF.hub.on('end', () => { NET.done = true; });
      NET.ready = true; FF.hub.ready();
    }).catch(e => { console.error('online start failed: ' + (e && e.stack || e)); game.go('title', null, { fade: 0 }); });
  },
  update(dt) {
    radio(dt);
    if (!NET.ready) return;
    const I = S.ctrl[NET.role === 'host' ? 0 : 1];
    if (NET.role === 'host') {
      if (FF.hub.time() < 0) return;                       // the countdown: the host's match waits for the start
      const humanOff = S.ctrlOf(S.poss) === game.input;
      if (S.phase === 'call' && humanOff && game.input.pressed('confirm')) S.pickCall(D.CARDS[S.cursor]);
      if (S.phase === 'call' && S.ctrlOf(S.poss) === game.input) { const n = D.CARDS.length; if (game.input.pressed('right')) S.cursor = (S.cursor + 1) % n; if (game.input.pressed('left')) S.cursor = (S.cursor + n - 1) % n; if (game.input.pressed('down') || game.input.pressed('up')) S.cursor = (S.cursor + 4) % n; }
      S.update(dt);
      NET.sendT -= dt; if (NET.sendT <= 0) { NET.sendT = .125; FF.hub.send(S.snapshot(), { reliable: false }); }
      if (S.over) { finish(); FF.setResults({ mode: 'online', score: S.score.slice(), stats: S.stats, chapter: S.cfg.chapter }); return game.go('results', null, { fade: 0 }); }
    } else {
      collect(I);
      if (S.phase === 'call' && S.ctrlOf(S.poss) === game.input) {
        const n = D.CARDS.length;
        if (game.input.pressed('right')) S.cursor = (S.cursor + 1) % n;
        if (game.input.pressed('left')) S.cursor = (S.cursor + n - 1) % n;
        if (game.input.pressed('down') || game.input.pressed('up')) S.cursor = (S.cursor + 4) % n;
        if (game.input.pressed('confirm')) NET.outCall = D.CARDS[S.cursor];
      }
      guestSend(dt, I);
      for (const p of S.all) FF.sim.rigStep(p, dt);      // (the guest's rigs follow the mirrored state)
      if (S.over && !NET.done) { NET.done = true; FF.setResults({ mode: 'online', score: S.score.slice(), stats: S.stats, chapter: S.cfg.chapter }); game.go('results', null, { fade: 0 }); }
    }
    if (FF.talk()) FF.talk().update(0);
    FF.view.focus();
  },
  draw(r) { FF.view.frame(r); r.overlay(g => { if (!NET.ready) E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffe7a8', { align: 'center', outline: '#000' }); else if (FF.hub.time() < 0 && NET.role) E.font.text(g, 'KICKOFF IN ' + Math.ceil(-FF.hub.time()), r.W / 2, r.H * .3, '#ffe7a8', { align: 'center', outline: '#000' }); }); }
};
function radio(dt) { const t = FF.talk(); if (t) t.update(dt); }
// the host's result: the standings (the best first; a tie shares a place), the scores, and whether a side won
function finish() {
  if (NET.done || !NET.info) return;
  NET.done = true;
  const hostId = NET.hostId, guestId = NET.info.players.map(p => p.id).find(id => id !== hostId);
  const hostWins = S.score[0] > S.score[1], guestWins = S.score[1] > S.score[0];
  const standings = S.score[0] === S.score[1] ? [[hostId, guestId]] : hostWins ? [[hostId], [guestId]] : [[guestId], [hostId]];
  FF.hub.finish({ standings, scores: { [hostId]: S.score[0], [guestId]: S.score[1] }, won: hostWins || guestWins ? true : undefined });
}

/* the couch: a second player on the same screen joins the defense (Start on a pad, or 2 on the keyboard) */
FF.joinVersus = () => {
  game.allowJoin({ max: 2, onJoin: input => { S.joinSide(1, input); FF.radio('Player two is on the defense. Go get him.', 2.4); } });
};
})();
