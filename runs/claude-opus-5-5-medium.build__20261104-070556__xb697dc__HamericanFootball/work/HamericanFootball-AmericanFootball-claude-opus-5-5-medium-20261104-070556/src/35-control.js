/* HUMAN CONTROL: who controls whom (the QB, then the ball; one defender each, switched by ○ or a click or
 * automatically), the intents from a pad, the keyboard and the mouse, the kick meter's presses, celebrations, and the
 * mouse on the field (hover a receiver, click to throw; click a defender to switch to him; click the QB to hike). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, S = FF.sim, BIT = FF.BIT, Y = 16;
const hyp = Math.hypot, dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const game = FF.game;

const C = FF.control = {
  humans: [],     // { input, team, n (player number 1-4), a (athlete), remote, seat, name, color, cpu (left: AI drives) }
  screen: {},     // athlete id -> [sx, sy, h] where it was drawn last frame (the mouse picks from it)
  hover: null,
  setup(list) { C.humans = list.map((h, i) => Object.assign({ n: i + 1, a: null, switchT: 0, idle: false }, h)); for (const a of S.all) a.ctl = -1; },
  humanOn(t) { return C.humans.some(h => h.team === t && !h.cpu); },
  of(a) { return a.ctl >= 0 ? C.humans[a.ctl] : null; },
  byTeam(t) { return C.humans.filter(h => h.team === t && !h.cpu); },
  give(h, a) {
    if (!a || h.a === a) return;
    if (a.ctl >= 0 && a.ctl !== C.humans.indexOf(h)) return;   // held by another player
    if (h.a) h.a.ctl = -1;
    h.a = a; a.ctl = C.humans.indexOf(h); h.switchT = S.time; h.tagT = S.time;
    a.brain = { beh: a.brain.beh, init: a.brain.init, wp: a.brain.wp, i: a.brain.i };
  },
  release(h) { if (h.a) h.a.ctl = -1; h.a = null; },
  /** at each new play: the offense's first human takes the QB (the kicker, the returner), the defense's take S and LB1 */
  assignPresnap() {
    const P = S.play;
    for (const h of C.humans) C.release(h);
    for (const t of [0, 1]) {
      const hs = C.byTeam(t); if (!hs.length) continue;
      const off = t === S.poss;
      let order;
      if (P.kind === 'kickoff') order = off ? ['K', 'S', 'LB1'] : ['WR1', 'RB', 'QB'];
      else if (off) order = P.kind === 'punt' || P.kind === 'fg' ? ['K', 'WR1', 'RB'] : ['QB', (hs[1] && hs[1].recv) || 'WR1', 'RB', 'WR2'];
      else order = P.kind === 'punt' ? ['S', 'LB1', 'CB'] : ['S', 'LB1', 'CB', 'LB2'];
      hs.forEach((h, i) => { const a = S.onField(t).find(x => x.role === order[i] || x.slot === order[i]) || S.onField(t).find(x => x.ctl < 0); C.give(h, a); });
    }
  },
  /** the ball changed hands, or a pass is in the air: control follows */
  follow(ev) {
    const B = S.ball;
    for (const h of C.humans) {
      if (h.cpu) continue;
      if (ev === 'possess' && B.holder) {
        if (B.holder.team === h.team) { if (C.byTeam(h.team)[0] === h || (h.a === B.holder)) C.give(h, B.holder); }
        else if (h.a && h.a.team === h.team) { /* stays on his defender */ }
      }
      if (ev === 'pass' && B.target && B.target.team === h.team && C.byTeam(h.team)[0] === h && B.passType !== 'snap') C.give(h, B.target);
      if (ev === 'pass' && B.team !== h.team && game.settings.autoSwitch !== false && B.passType !== 'snap' && B.passType !== 'pitch') C.switchNearest(h, { x: B.tx, y: B.ty });
    }
    // humans of the side that just lost the ball take their nearest defenders
    if (ev === 'possess' && B.holder) for (const h of C.humans) if (!h.cpu && h.team !== B.holder.team && h.a && h.a.team === h.team && S.play && S.play.turnover) C.switchNearest(h, B.holder.b);
  },
  switchNearest(h, p) {
    const c = S.carrier(), at = p || (c ? c.b : S.ball);
    const list = S.onField(h.team).filter(a => (a.ctl < 0 || a === h.a) && a.slot !== 'K').sort((a, b) => dist(a.b, at) - dist(b.b, at));
    if (list[0] && list[0] !== h.a) C.give(h, list[0]);
  },
  /** each step of the match: auto-switch on defense, the kick meter, celebrations, clicks */
  update() {
    const c = S.carrier();
    for (const h of C.humans) {
      if (h.cpu || h.remote) continue;
      const I = h.input; if (!I) continue;
      if (!h.a || !h.a.on) { const own = S.onField(h.team).find(a => a.ctl < 0); if (own) C.give(h, own); }
      // the defense: ○ (or a click) switches to the defender nearest the ball; auto-switch when the carrier is past the line
      if (h.a && h.a.team === h.team && c && c.team !== h.team && S.phase === 'LIVE') {
        if (I.pressed('b2')) C.switchNearest(h);
        else if (game.settings.autoSwitch !== false && S.time - h.switchT > .5 && (c.b.x - S.los) * S.dir[c.team] > 0 && dist(h.a.b, c.b) > 6 * Y) C.switchNearest(h);
      }
      if (S.phase === 'LIVE' && S.ball.state === 'loose' && h.a && I.pressed('b2')) C.switchNearest(h, S.ball);
      if (S.phase === 'PRESNAP' && h.team !== S.poss && I.pressed('b2') && S.play.kind !== 'kickoff') { const list = S.onField(h.team).filter(a => a.ctl < 0); const i = list.indexOf(h.a); C.give(h, list[(i + 1) % list.length] || list[0]); }
      // the kick meter: b1, Space or a left click
      const M = FF.kick.meter;
      if (M && !M.cpu && M.kicker.team === h.team && C.byTeam(h.team)[0] === h) { const clk = I.clicked && I.clicked(); FF.kick.input(I.pressed('b1') || !!clk, I.move()[0]); }
      // a TD dance: ○ Charleston, □ Body Roll, △ Helicopter
      if (S.phase === 'CELEBRATE' && h.a && h.a.act && h.a.act.id === 'celebrate' && h.a.act.t < 1.2 && !h.danced) {
        const k = I.pressed('b2') ? 'charleston' : I.pressed('b3') ? 'bodyroll' : I.pressed('b4') ? 'helicopter' : null;
        if (k) { h.danced = true; FF.ots.dance(h.a, k); }
      }
      if (S.phase !== 'CELEBRATE') h.danced = false;
      // the mouse: a click on a receiver throws, on a defender switches, on the QB hikes
      const clk = I.clicked && I.clicked();
      if (clk && h.n === 1 && !(M && !M.cpu)) {
        const a = C.pickAt(clk[0], clk[1]);
        if (a) h.clickA = a;
      }
    }
  },
  /** the intent for a held athlete (A.6) */
  intent(a) {
    const h = C.humans[a.ctl], it = { mx: 0, my: 0, turbo: false, press: 0, held: 0, recv: -1 };
    if (!h || h.cpu) return FF.ai.intent(a, 1 / 120);
    if (h.remote) return h.netIntent || it;
    const I = h.input, m = I.move(), v = game.view, d = v ? v.screenDirToGround(m[0], m[1]) : m;
    if (h.idle) return FF.ai.intent(a, 1 / 120);   // the menu is open (hub sessions): the AI drives
    it.mx = d[0]; it.my = d[1]; it.turbo = I.down('turbo');
    for (const k of ['b1', 'b2', 'b3', 'b4', 'lb', 'rb']) { if (I.pressed(k)) it.press |= BIT[k]; if (I.down(k)) it.held |= BIT[k]; }
    // the chord: L1 + R1 together is the star's special (a single shoulder waits 0.1 s before it laterals)
    if ((it.held & BIT.lb) && (it.held & BIT.rb)) { if (!h.chord) { h.chord = true; it.special = true; } it.press &= ~(BIT.lb | BIT.rb); }
    else h.chord = false;
    if (it.press & (BIT.lb | BIT.rb)) { h.latAt = S.time; it.press &= ~(BIT.lb | BIT.rb); }
    if (h.latAt && S.time - h.latAt > .1 && !h.chord) { it.press |= BIT.lb; h.latAt = 0; }
    // the QB behind the line: the face buttons (or 1-3, or a click) throw to receivers
    const P = S.play, B = S.ball;
    const canThrow = S.phase === 'LIVE' && B.holder === a && P && !P.passThrown && P.kind === 'pass' && (a.slot === 'QB' || a.slot === 'K') && (a.b.x - S.los) * S.dir[a.team] < Y * .5;
    if (canThrow) {
      const keys = ['r1', 'r2', 'r3'];
      for (let i = 0; i < 3; i++) if (I.pressed(keys[i])) it.recv = i;
      if (it.press & BIT.b1) it.recv = 0; if (it.press & BIT.b2) it.recv = 1; if (it.press & BIT.b3) it.recv = 2;
      it.press &= ~(BIT.b1 | BIT.b2 | BIT.b3 | BIT.b4);
      if (h.clickA) { const i = S.receivers(a.team).indexOf(h.clickA); if (i >= 0) { it.recv = i; it.turbo = I.down('turbo'); } }
    } else if (h.clickA && h.clickA.team !== a.team) h.clickA = null;
    if (h.clickA) {
      const ca = h.clickA; h.clickA = null;
      if (S.phase === 'PRESNAP' && ca.team === a.team && ca.slot === 'QB') it.click = 'hike';
      else if (ca.team === h.team && ca !== a && a.team !== S.poss && S.carrier() !== a) { C.give(h, ca); }
    }
    if (S.phase === 'PRESNAP' && (it.press & BIT.b1) && a.team === S.poss) it.press |= BIT.b1;
    return it;
  },
  /** the athlete under a screen point (the last frame's positions), or null */
  pickAt(sx, sy) {
    let best = null, bd = 1e9;
    for (const a of S.athletes) {
      const p = C.screen[a.id]; if (!p) continue;
      const dx = sx - p[0], dy = sy - (p[1] - p[2] * .5), d = Math.abs(dx) < 9 && Math.abs(dy) < p[2] * .6 ? hyp(dx, dy) : 1e9;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  },
  /** the athlete the mouse is over (for highlighting a receiver's chip) */
  hoverAt() { const I = game.input; if (I.lastDevice !== 'mouse') return null; const p = I.pointer && I.pointer(); return p ? C.pickAt(p[0], p[1]) : null; }
};
FF.bus.on('possess', () => { if (S.phase === 'LIVE') C.follow('possess'); });
FF.bus.on('pass', () => C.follow('pass'));
FF.bus.on('presnap', () => C.assignPresnap());
})();
