/* INSTANT REPLAY and the HUD. The recorder keeps the last 12 s of every play at 60 Hz (athletes, ball, mascot); the player
 * drives the rigs from those frames in slow motion from new camera angles and never touches the sim. The highlight reel
 * keeps the 5 most exciting clips. The HUD: the score bug, each local player's panel (turbo, cards, special), the prompt
 * strip for the current context and device, receiver chips, the pass target marker, rings under held athletes, the kick
 * meter and the play clock. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, Y = 16, F = FF.FIELD, bus = FF.bus, GL = FF.glyph;
const hyp = Math.hypot;

/* ---------------- REPLAY ---------------- */
const RP = FF.replay = {
  frames: [], recording: false, after: 0, play: null, highlights: [], best: 0, score: 0, why: '',
  start() { RP.frames = []; RP.recording = true; RP.after = 0; RP.score = 0; RP.why = ''; },
  record() {
    if (!RP.recording || S.replaying) return;
    if (S.phase !== 'LIVE') { RP.after += 1 / 120; if (RP.after > 1) { RP.recording = false; RP.finish(); return; } }
    if (S.step % 2) return;
    const B = S.ball, f = { A: S.athletes.map(a => [a.id, a.b.x, a.b.y, a.b.z, a.facing, a.pose, a.poseU, (S.carrier() === a ? 1 : 0) | (a.hot > 0 ? 2 : 0) | (a.dinged > 0 ? 4 : 0) | (a.helmetOff ? 8 : 0), a.b.vx, a.b.vy, a.dance, a.tackledFrom]), B: [B.x, B.y, B.z, B.state, B.vx, B.vy] };
    if (S.mascot && !S.mascot.done) f.M = [S.mascot.x, S.mascot.y];
    RP.frames.push(f); if (RP.frames.length > 720) RP.frames.shift();
  },
  /** how exciting the play was: event priority times yards */
  rate(score, why) { if (score > RP.score) { RP.score = score; RP.why = why; } },
  finish() {
    if (RP.score < 6 || RP.frames.length < 20) return;
    const clip = { frames: RP.frames.slice(), score: RP.score, why: RP.why, q: Math.min(4, S.quarter), clock: FF.fmtClock(S.clock) };
    RP.last = clip;
    RP.highlights.push(clip); RP.highlights.sort((a, b) => b.score - a.score); if (RP.highlights.length > 5) RP.highlights.length = 5;
  },
  /** should this play get an instant replay (the Replays setting) */
  wanted() {
    const set = S.hub ? 'off' : game.settings.replays; if (set === 'off' || !RP.last || RP.last.used) return false;
    if (set === 'td') return /TOUCHDOWN/.test(RP.last.why);
    return RP.last.score >= 8;
  },
  /** play a clip: shots from the field view, then an iso or reverse angle, at slow motion */
  begin(clip, o = {}) {
    if (!clip) return false; clip.used = true;
    RP.play = { clip, t: 0, i: 0, shot: 0, rate: FF.T.replayRate, onDone: o.onDone, caption: o.caption || clip.why, reel: o.reel };
    S.replaying = true; game.input.consumeAll && game.input.consumeAll();
    FF.music && game.audio.duck(true);
    return true;
  },
  update(dt) {
    const p = RP.play; if (!p) return false;
    const n = p.clip.frames.length, dur = n / 60;
    p.t += dt * (p.shot === 0 ? p.rate : p.rate * .7);
    const I = game.input;
    if (I.pressed('b1') || I.pressed('confirm') || I.clicked && I.clicked()) { if (p.shot === 0 && dur > 4) { p.shot = 1; p.t = Math.max(0, dur - 3); } else return RP.stop(); }
    if (p.t >= dur) { if (p.shot === 0 && !p.reel) { p.shot = 1; p.t = Math.max(0, dur * .4); } else return RP.stop(); }
    p.i = Math.min(n - 1, Math.floor(p.t * 60));
    const f = p.clip.frames[p.i], f2 = p.clip.frames[Math.min(n - 1, p.i + 1)];
    for (const row of f.A) {
      const a = S.athlete(row[0]); if (!a) continue;
      const g = p.ghosts && p.ghosts[row[0]] || ((p.ghosts = p.ghosts || {})[row[0]] = { b: { x: 0, y: 0, z: 0, vx: 0, vy: 0 }, intent: {}, id: row[0] });
      g.b.x = row[1]; g.b.y = row[2]; g.b.z = row[3]; g.facing = row[4]; g.pose = row[5]; g.poseU = row[6]; g.b.vx = row[8]; g.b.vy = row[9]; g.dance = row[10]; g.tackledFrom = row[11];
      g.hot = row[7] & 2 ? 1 : 0; g.dinged = row[7] & 4 ? 1 : 0; g.helmetOff = !!(row[7] & 8); g.carry = !!(row[7] & 1); g.fly = row[5] === 'FLY' ? { mega: false } : null;
      FF.Rigs.driveRig(FF.Rigs.of(a), g, dt * p.rate, { carry: g.carry, fire: g.hot });
    }
    const B = f.B; p.ball = [B[0], B[1], B[2], B[3], B[4], B[5]];
    // the camera: the field view following the ball, then the iso or the reverse angle
    const view = p.reel ? 'field' : p.shot === 0 ? 'field' : (p.clip.score % 2 ? 'isoR' : 'reverse');
    if (FF.cam.view !== view) { FF.cam.view = view; game.setView(view); }
    const k = 1 - Math.exp(-dt / .25); FF.cam.x += (B[0] - FF.cam.x) * k; FF.cam.y += (B[1] - FF.cam.y) * k;
    game.setZoom(1.25); game.focus(FF.cam.x, FF.cam.y, 10);
    void f2;
    return true;
  },
  stop() { const p = RP.play; RP.play = null; S.replaying = false; game.audio.duck(false); FF.cam.view = null; if (p && p.onDone) p.onDone(); return false; },
  /** draw the athletes from the replay's frame (the match draws the rest of the stadium) */
  drawActors(r) {
    const p = RP.play, view = E.charView(r.view), f = p.clip.frames[p.i];
    for (const row of f.A) { const a = S.athlete(row[0]); if (!a) continue; const rig = FF.Rigs.of(a); r.shadow(row[1], row[2], 6, .35); r.actor(row[1], row[2], row[3], (g, ox, oy) => rig.draw(g, ox, oy, view)); }
    const B = p.ball; if (B && B[3] !== 'held') drawFlyingBall(r, B[0], B[1], B[2], B[4], B[5], B[3]);
  },
  overlay(g) {
    const p = RP.play, W = game.W, H = game.H, bar = Math.round(H * .08);
    px.rect(g, 0, 0, W, bar, '#000000'); px.rect(g, 0, H - bar, W, bar, '#000000');
    const blink = Math.floor(game.real * 2) % 2;
    E.font.title(g, p.reel ? 'HIGHLIGHTS' : 'REPLAY', 14, 4, { scale: 2, colors: ['#ffffff', '#ffe0e0', '#ff6a5a'] });
    if (blink) px.disc(g, 8, 11, 3, '#ff2a2a');
    const tc = '00:' + String(Math.floor(p.t)).padStart(2, '0') + ':' + String(Math.floor((p.t % 1) * 30)).padStart(2, '0');
    E.font.text(g, 'SP ' + tc, W - 10, 6, '#f4f4f4', { align: 'right', font: 'tiny', outline: false });
    if (p.caption) E.font.text(g, p.caption, W / 2, H - bar + 4, '#ffe890', { align: 'center', outline: false, shadow: '#000' });
    GL.row(g, W - 10, H - bar + 4, [['b1', 'SKIP', { mouse: 'L' }]], { align: 'right' });
  }
};
const rateOn = (ev, f) => bus.on(ev, e => { if (!S.replaying) RP.rate(...f(e)); });
rateOn('td', e => [10 + (e.yards || 0) / 10, 'Q' + Math.min(4, S.quarter) + ' ' + FF.fmtClock(S.clock) + ' - ' + e.player + ' ' + (e.yards || 0) + '-YD TOUCHDOWN']);
rateOn('int', e => [9, e.player + ' PICKS IT OFF']);
rateOn('megaHit', e => [9, e.player + ' MEGA HIT']);
rateOn('fumble', e => [8.5, 'FUMBLE! ' + e.player + ' COUGHS IT UP']);
rateOn('seismic', () => [9, 'THE SEISMIC SACK']);
rateOn('mascotHit', () => [8, 'MASCOT MAYHEM']);
rateOn('bigHit', e => [7, e.player + ' BIG HIT']);
rateOn('fg', e => [e.yards >= 50 && e.good ? 8.5 : 3, e.yards + '-YD FIELD GOAL']);
rateOn('tackle', e => [e.yards >= 40 ? 8 : e.yards >= 20 ? 6 : 0, (S.athlete(e.carrier) || {}).name + ' ' + e.yards + '-YD RUN']);
bus.on('snap', () => RP.start());
bus.on('kickoff', () => { if (!RP.recording) RP.start(); });
bus.on('matchStart', () => { RP.highlights = []; RP.last = null; RP.play = null; S.replaying = false; });

/* ---------------- THE BALL (drawn) ---------------- */
function drawFlyingBall(r, x, y, z, vx, vy, state) {
  if (state === 'held') return;
  r.shadow(x, y, Math.max(1.5, 3.5 - z * .02), Math.max(.12, .4 - z * .002));
  r.queue(x, y, z + 2, g => {
    const p = r.w(x, y, z + 2), q = r.w(x + (vx || 0) * .02, y + (vy || 0) * .02, z + 2);
    let a = Math.atan2(q[1] - p[1], q[0] - p[0]); if (state === 'kick') a = game.time * 10;
    if (state === 'dead' || state === 'loose') a = (x * .1) % 6.28;
    FF.drawBall(g, p[0], p[1], a, state === 'pass', (r.view.zoom || 1) * 1, S.ball.fire && state !== 'loose');
  }, { emissive: !!S.ball.fire });
}
FF.drawFlyingBall = drawFlyingBall;

/* ---------------- THE HUD ---------------- */
const HUD = FF.hud = {
  /** in the world: rings under held athletes, receiver chips, the target marker, the kick aim line, tags */
  world(r) {
    const C = FF.control, B = S.ball;
    for (const h of C.humans) {
      const a = h.a; if (!a || h.cpu || h.remote && !h.seatColor) continue;
      const col = h.color || E.PLAYER_COLORS[(h.n - 1) % 4];
      r.decal(g => { const p = r.w(a.b.x, a.b.y, 0); px.blend(g, .9, 'normal', () => { px.ell(g, Math.round(p[0]), Math.round(p[1]), 9, 4, col); px.ell(g, Math.round(p[0]), Math.round(p[1]), 7, 3, E.shade(col, -.45)); }); });
      if (S.phase === 'PRESNAP' || S.time - (h.tagT || 0) < 1) r.queue(a.b.x, a.b.y, 46, g => { const p = r.w(a.b.x, a.b.y, 46 + (a.p.boss ? 14 : 0)); const label = h.name || ('P' + h.n); E.ui.box(g, Math.round(p[0]) - 9 - label.length, Math.round(p[1]) - 9, 18 + label.length * 2, 9, { bg: col, border: '#000', alpha: .95, gradient: false }); E.font.text(g, label, Math.round(p[0]), Math.round(p[1]) - 8, '#ffffff', { align: 'center', font: 'tiny', outline: false }); }, { emissive: true });
      // receiver chips while this player's QB can throw
      const can = S.phase === 'LIVE' && B.holder === a && S.play && !S.play.passThrown && S.play.kind === 'pass' && (a.b.x - S.los) * S.dir[a.team] < 8;
      if (can) {
        const dev = GL.device(h.input), hover = C.hoverAt();
        S.receivers(a.team).forEach((rv, i) => {
          const act = dev === 'gamepad' ? ['b1', 'b2', 'b3'][i] : ['r1', 'r2', 'r3'][i];
          r.queue(rv.b.x, rv.b.y, 44, g => { const p = r.w(rv.b.x, rv.b.y, 44); const x = Math.round(p[0]) - 6, y = Math.round(p[1]) - 14; if (hover === rv) { GL.mouse(g, x - 10, y, 'L'); } GL.chip(g, x, y, act, { input: h.input, device: dev === 'mouse' ? 'keyboard' : dev }); }, { emissive: true });
          if (game.settings.showRoutes !== false && rv.brain.wp && S.play.t < 2.5) r.decal(g => { const wp = rv.brain.wp; let p0 = r.w(rv.b.x, rv.b.y, 0); for (let k = rv.brain.i; k < wp.length; k++) { const p1 = r.w(wp[k][0], wp[k][1], 0); px.blend(g, .5, 'normal', () => px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffffff')); p0 = p1; } });
        });
      }
    }
    // the pass target marker for humans on either side
    if (B.state === 'pass' && !B.forced && game.settings.targetMarker !== false && C.humans.some(h => !h.cpu)) {
      const left = Math.max(0, B.T - B.t), k = Math.min(1, left / Math.max(.3, B.T)), col = S.teams[B.team].colors.primary;
      r.decal(g => { const p = r.w(B.tx, B.ty, 0); px.line(g, p[0] - 3, p[1] - 2, p[0] + 3, p[1] + 2, col, 2); px.line(g, p[0] - 3, p[1] + 2, p[0] + 3, p[1] - 2, col, 2); const rr = Math.round(4 + k * 12); for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; px.dot(g, p[0] + Math.cos(an) * rr, p[1] + Math.sin(an) * rr * .55, '#ffffff'); } });
    }
    // the kick aim line
    const M = FF.kick.meter;
    if (M && !M.cpu && M.kind !== 'fg') { const kk = M.kicker, d = S.dir[kk.team], an = (d > 0 ? 0 : Math.PI) + M.aim * .26; r.decal(g => { for (let k = 2; k < 14; k += 2) { const p = r.w(kk.b.x + Math.cos(an) * k * 2 * Y, kk.b.y + Math.sin(an) * k * 2 * Y, 0); px.rect(g, Math.round(p[0]), Math.round(p[1]), 3, 1, '#ffe040'); } }); }
  },
  /** the overlay: score bug, panels, prompt strips, the kick meter, the play clock */
  draw(g) {
    if (S.replaying) return;
    const W = game.W, H = game.H, m = FF.T.safeMargin;
    HUD.scoreBug(g, W / 2, H - m - 22);
    FF.control.humans.forEach((h, i) => { if (!h.cpu && !h.remote) HUD.panel(g, h, i); });
    const P1 = FF.control.humans.find(h => !h.cpu && !h.remote);
    if (P1 && S.phase !== 'PLAYCALL') HUD.prompts(g, P1, W - m, H - m - 46);
    if (FF.kick.meter && !FF.kick.meter.cpu) HUD.meter(g, FF.kick.meter);
    else if (FF.net && FF.net.meter && FF.net.meter.stage > 0) HUD.meter(g, FF.net.meter);
    if (S.phase === 'PRESNAP' && S.presnap && S.presnap.set && S.isHuman(S.poss) && S.presnap.auto < 5 && !FF.kick.meter) E.font.title(g, String(Math.max(0, Math.ceil(S.presnap.auto))), W / 2, H * .2, { scale: 3, align: 'center', colors: S.presnap.auto < 3 ? ['#ffffff', '#ffb0a0', '#ff3a2a'] : ['#ffffff', '#ffe890', '#ffb030'] });
    FF.fx.drawCenter(g);
    FF.talk.draw(g);
  },
  scoreBug(g, cx, y) {
    const t0 = S.teams[0], t1 = S.teams[1]; if (!t0) return;
    const w = 248, x = Math.round(cx - w / 2), h = 22;
    E.ui.box(g, x, y, w, h, { bg: ['#1a1a2e', '#0c0c18'], border: '#4a4a6a', alpha: .9 });
    const side = (t, sx, al) => {
      const team = S.teams[t], c = team.colors;
      px.rect(g, sx, y + 2, 64, h - 4, c.primary); px.rect(g, sx, y + h - 5, 64, 2, c.secondary);
      HUD.logo(g, team, sx + (al ? 50 : 2), y + 3, 1);
      E.font.text(g, team.abbr, sx + (al ? 26 : 38), y + 6, luminance(c.primary) > .6 ? '#141418' : '#ffffff', { align: 'center', outline: false });
      E.font.text(g, String(S.score[t]), al ? sx - 12 : sx + 76, y + 4, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
      // the fiasco meter under each team
      px.rect(g, sx, y + h + 1, 64, 2, '#2a2a3a'); px.rect(g, sx, y + h + 1, Math.round(64 * S.meter[t] / 100), 2, '#c060ff');
      if (S.athletes.some(a => a.team === t && a.hot > 0)) E.font.text(g, '♥', sx + (al ? -26 : 90), y + 7, '#ff8a2a', { outline: false });
      if (S.poss === t && S.phase !== 'FINAL') px.poly(g, al ? [[sx - 26, y + 8], [sx - 22, y + 11], [sx - 26, y + 14]] : [[sx + 90, y + 8], [sx + 86, y + 11], [sx + 90, y + 14]], '#ffe040');
    };
    side(0, x + 2, false); side(1, x + w - 66, true);
    const q = S.ot ? 'OT' : ['1ST', '2ND', '3RD', '4TH'][Math.min(3, S.quarter - 1)];
    E.font.text(g, q + ' ' + FF.fmtClock(S.clock), cx, y + 3, S.clock < 30 ? '#ffb0a0' : '#ffffff', { align: 'center', font: 'tiny', outline: false });
    const dn = ['1ST', '2ND', '3RD', '4TH'][Math.min(3, S.down - 1)], goal = (S.los + S.dir[S.poss] * S.toGo * Y - S.goalX(S.poss)) * S.dir[S.poss] >= 0;
    const dd = S.mode === 'kickoff' ? 'KICKOFF' : S.mode === 'pat' ? 'CONVERSION' : dn + ' & ' + (goal ? 'GOAL' : S.toGo);
    E.font.text(g, dd, cx, y + 12, '#ffe040', { align: 'center', font: 'tiny', outline: false });
  },
  logo(g, team, x, y, s = 1) { if (!team._spr) team._spr = E.sprite(team.logo, team.pal, 1); px.sprite(g, team._spr, Math.round(x), Math.round(y), { scale: s }); },
  panel(g, h, i) {
    const W = game.W, H = game.H, m = FF.T.safeMargin, a = h.a; if (!a) return;
    const corner = game.cornerArea && game.cornerArea();
    const right = i % 2 === 1, bottom = i >= 2, w = 88, ph = 26;
    const x = right ? W - m - w : m, y = bottom ? H - m - 120 : (right && corner ? Math.ceil(corner.y1) + 4 : m);
    const col = h.color || E.PLAYER_COLORS[(h.n - 1) % 4];
    E.ui.box(g, x, y, w, ph, { bg: ['#14142a', '#0a0a18'], border: col, alpha: .82 });
    E.font.text(g, (h.name || 'P' + h.n) + ' ' + a.num, x + 4, y + 3, col, { font: 'tiny', outline: false });
    E.font.text(g, a.name.split(' ').slice(-1)[0], x + w - 4, y + 3, '#f4f0e6', { font: 'tiny', align: 'right', outline: false });
    const tb = a.hot > 0 ? 1 : a.turbo; E.ui.bar(g, x + 4, y + 11, w - 8, 5, tb, a.hot > 0 ? '#ff6a1a' : tb > .15 ? '#3af0f0' : '#ff4a3a');
    E.font.text(g, 'TURBO', x + 4, y + 18, '#a9a6c0', { font: 'tiny', outline: false });
    const cards = S.cards[h.team] || []; for (let k = 0; k < cards.length; k++) { px.rect(g, x + 30 + k * 7, y + 17, 5, 7, '#c060ff'); px.rect(g, x + 31 + k * 7, y + 18, 3, 5, '#ffe060'); }
    if (a.heat > 0 && !(a.hot > 0)) for (let k = 0; k < a.heat; k++) px.disc(g, x + w - 8 - k * 6, y + 20, 2, '#ff8a2a');
    if (a.p.special && FF.ots && !Object.keys(a.specialUsed).some(k => k.startsWith(a.p.special[0]))) E.font.text(g, 'SPECIAL', x + w - 4, y + 18, '#ffe040', { font: 'tiny', align: 'right', outline: false });
  },
  /** the context's actions as chips, for this player's device */
  prompts(g, h, x, y) {
    const a = h.a, B = S.ball, P = S.play, I = h.input; if (!a || !P) return;
    let items = [];
    const M = FF.kick.meter;
    if (M && !M.cpu && M.kicker.team === h.team) items = [['b1', M.stage === 1 ? 'SET POWER' : M.stage === 2 ? 'SET AIM' : 'KICK!', { mouse: 'L' }]];
    else if (S.phase === 'PRESNAP') {
      if (a.team === S.poss) items = (P.kind === 'kickoff' || P.kind === 'punt' || P.kind === 'fg') ? [['b1', 'KICK', { mouse: 'L' }], ['left', 'AIM']] : [['b1', 'HIKE']];
      else items = P.kind === 'kickoff' ? [] : [['b2', 'SWITCH'], ['up', 'MOVE']];
    } else if (S.phase === 'LIVE') {
      const carrier = B.holder === a, qb = carrier && !P.passThrown && P.kind === 'pass' && (a.slot === 'QB' || a.slot === 'K') && (a.b.x - S.los) * S.dir[a.team] < 8;
      const dev = GL.device(I);
      if (qb) items = dev === 'gamepad' ? [['b1', ''], ['b2', ''], ['b3', 'THROW'], ['turbo', 'ROCKET']] : [['r1', ''], ['r2', ''], ['r3', 'THROW', { mouse: 'L' }], ['turbo', 'ROCKET']];
      else if (carrier) { items = [['b3', 'SPIN'], ['b2', 'STIFF'], ['b4', 'HURDLE'], ['b1', 'DIVE'], ['turbo', 'TURBO'], ['lb', 'LATERAL']]; if (a.p.special) items.push(['rb', 'L1+R1 SPECIAL']); }
      else if (B.state === 'pass' && !B.forced) items = a.team === B.team ? [['b4', 'JUMP'], ['b1', 'DIVE CATCH'], ['turbo', 'TURBO']] : [['b4', 'JUMP'], ['b1', 'DIVE'], ['b2', 'SWITCH']];
      else if (B.state === 'loose') items = [['b1', 'DIVE ON IT'], ['b2', 'SWITCH']];
      else if (B.holder && B.holder.team !== a.team) items = [['b1', 'TACKLE'], ['turbo', '+ ✕ BIG HIT'], ['b3', 'STRIP'], ['b2', 'SWITCH'], ['b4', 'JUMP']];
      else items = [['turbo', 'TURBO'], ['b3', 'SWIM']];
    } else if (S.phase === 'DEAD' && S.lateWindow > 0 && game.settings.lateHits) items = [['b1', 'LATE HIT']];
    else if (S.phase === 'CELEBRATE' && a.act && a.act.id === 'celebrate') items = [['b2', ''], ['b3', ''], ['b4', 'DANCE']];
    if (!items.length) return;
    if (GL.device(I) === 'gamepad' && items[1] && items[1][1] === '+ ✕ BIG HIT') items[1][1] = '+' + GL.label('b1', I) + ' BIG HIT';
    else if (items[1] && items[1][1] === '+ ✕ BIG HIT') items[1][1] = '+' + GL.label('b1', I, 'keyboard') + ' BIG HIT';
    GL.row(g, x, y, items, { align: 'right', panel: true, input: I });
  },
  meter(g, M) {
    const kk = M.kicker, W = game.W, H = game.H, x = Math.round(W / 2 - 60), y = Math.round(H * .62), w = 120;
    E.ui.box(g, x - 6, y - 6, w + 12, 34, { bg: ['#14142a', '#0a0a18'], border: '#ffb02e', alpha: .9 });
    E.font.text(g, 'POWER', x, y - 3, '#a9a6c0', { font: 'tiny', outline: false });
    const pw = M.stage === 1 ? M.u : M.power;
    for (let i = 0; i < w; i++) { const k = i / w, c = k > .95 ? '#ff3a2a' : k > .7 ? '#ffd040' : '#3ad04a'; px.rect(g, x + i, y + 4, 1, 6, k <= pw ? c : E.shade(c, -.6)); }
    px.rect(g, x + Math.round(pw * w) - 1, y + 2, 2, 10, '#ffffff');
    const band = FF.T.accBand * (M.superFoot ? 2.5 : 1), mid = x + w / 2;
    px.rect(g, x, y + 16, w, 6, '#2a2a3a'); px.rect(g, Math.round(mid - band * w / 2), y + 16, Math.round(band * w), 6, '#3ad04a');
    if (M.stage >= 2) { const ac = M.stage === 2 ? M.ua : M.acc; px.rect(g, Math.round(mid + ac * w / 2) - 1, y + 14, 2, 10, '#ffffff'); }
    E.font.text(g, 'AIM', x, y + 24, '#a9a6c0', { font: 'tiny', outline: false });
    void kk;
  }
};
function luminance(h) { const v = E.hex(h); return (v[0] * .3 + v[1] * .59 + v[2] * .11) / 255; }
FF.luminance = luminance;
})();
