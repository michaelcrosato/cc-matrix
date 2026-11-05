/* ---- THE HUD: the TV score bug, banners, the radar, a card per human seat, context prompts with the device's badges,
 * the in-world chevrons and receiver badges, and the big set-piece widgets ---- */
const BANNERS = { try: ['TRY!', '#ffe060'], monsterHit: ['MONSTER HIT!', '#ff7040'], lineBreak: ['LINE BREAK!', '#80ff90'], onFire: ['ON FIRE!', '#ff9030'], pushover: ['PUSHOVER TRY!', '#ffe060'], dropGoal: ['DROP GOAL!', '#ffe060'], convMade: ['CONVERTED!', '#80ff90'], convMissed: ['WIDE!', '#ff7070'], doinkMiss: ['DOINK!', '#ff7070'], penGoal: ['PENALTY GOAL!', '#80ff90'], knockOn: ['KNOCK-ON', '#ffffff'], forwardPass: ['FORWARD!', '#ffffff'], advantage: ['ADVANTAGE', '#a0d0ff'], penTry: ['PENALTY TRY!', '#ffe060'], notTen: ['NOT TEN!', '#ffffff'], notStraight: ['NOT STRAIGHT!', '#ffffff'], interception: ['INTERCEPTED!', '#80ff90'], jackal: ['JACKAL!', '#ffe060'], earlyEngage: ['EARLY ENGAGEMENT', '#ffffff'], collapse: ['SCRUM PENALTY!', '#ffe060'], penalty: ['PENALTY', '#ffe060'], freeKick: ['FREE KICK', '#ffe060'] };
class Hud {
  constructor(scene) { this.sc = scene; this.banners = []; this.t = 0; this.subs = []; }
  listen() {
    this.subs.push(TT.bus.on('*', (d, name) => {
      if (name === 'banner') return this.push(d.text, d.color || '#ffe060', d.sub);
      const b = BANNERS[name]; if (!b) return;
      let text = b[0];
      if (name === 'lineoutWon' && d.steal) text = 'STOLEN!';
      if (name === 'try' && d.how === 'pushover') return;
      this.push(text, b[1], name === 'try' && d.m ? d.m.players[d.id].nick.toUpperCase() : name === 'onFire' && d.m ? d.m.players[d.id].nick.toUpperCase() : null);
    }));
    this.subs.push(TT.bus.on('lineoutWon', d => { if (d.steal) this.push('STOLEN!', '#80ff90'); }));
    this.subs.push(TT.bus.on('hooter', () => this.push('HOOTER!', '#ff8040', 'BALL HAS TO GO DEAD')));
  }
  unlisten() { this.subs.forEach(f => f()); this.subs = []; }
  push(text, color, sub) { this.banners = this.banners.filter(b => b.text !== text); this.banners.push({ text, color, sub, t: 0, life: text.length > 10 ? 2 : 1.6 }); if (this.banners.length > 2) this.banners.shift(); }
  update(dt) { this.t += dt; for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.life); }
  /** the whole HUD over the match (V: the view state; ctx: seats, the scene's flags) */
  draw(r, V, ctx) {
    r.overlay(g => {
      if (ctx.replay) return this.replayBars(g, r, ctx);
      this.world(g, r, V, ctx);
      this.scoreBug(g, r, V, ctx);
      this.radar(g, r, V, ctx);
      this.cards(g, r, V, ctx);
      this.setPiece(g, r, V, ctx);
      this.prompts(g, r, V, ctx);
      this.drawBanners(g, r);
      if (V.windy || V.wind && V.wind.s > 0) this.windsock(g, r, V);
      if (V.phase === 'half') this.halftime(g, r, V, ctx);
      if (ctx.waiting) UI.txt(g, 'WAITING FOR THE HOST...', r.W / 2, 56, '#ffe060', { align: 'center' });
    });
  }
  scoreBug(g, r, V, ctx) {
    const x = 4, y = 4, w = 150;
    UI.panel(g, x, y, w, 30, { bg: ['#141a2c', '#0a0e18'], border: '#e8c040', alpha: .9 });
    for (const t of [0, 1]) {
      const yy = y + 3 + t * 13, tm = V.teams[t];
      px.rect(g, x + 3, yy, 4, 10, V.kits[t].cloth); px.rect(g, x + 3, yy + 9, 4, 1, V.kits[t].trim);
      UI.txt(g, tm.short, x + 10, yy + 1, '#f4f0e0');
      UI.txt(g, String(V.score[t]), x + 50, yy + 1, '#ffe060', { align: 'right' });
      // hype: the bar, flashing SUPER when full
      const hv = V.hype[t] / 100, full = V.hype[t] >= 100;
      UI.bar(g, x + 54, yy + 3, 38, 5, hv, full ? (Math.floor(this.t * 6) % 2 ? '#ffe060' : '#ff8030') : '#c040e0');
      if (full) UI.prompt(g, '{b:tri}', x + 94, yy - 1, ctx.I, {});
      // sin-bin icons: a little green dumpster with the seconds
      let bx = x + 106 + (full ? 6 : 0);
      for (const p of V.players) if (p.team === t && p.st === 'bin') { px.rect(g, bx, yy + 2, 7, 6, '#3a7a3a'); px.rect(g, bx, yy + 1, 7, 1, '#1e4a1e'); UI.txt(g, String(Math.ceil(Math.max(0, p.binT))), bx + 8, yy + 1, '#a0e0a0', { font: 'tiny' }); bx += 20; }
    }
    // the clock: the half and sevens time (HOOTER flashing past it), or GOLDEN POINT
    const cl = V.sudden ? 'GOLDEN POINT' : (V.half === 1 ? '1ST ' : '2ND ') + TT.mmss(V.tvClock ? V.tvClock() : V.clockShown || 0);
    UI.panel(g, x, y + 31, 74, 13, { bg: '#0a0e18', border: '#3a4660', alpha: .9 });
    UI.txt(g, V.hooter && Math.floor(this.t * 3) % 2 ? 'HOOTER!' : cl, x + 37, y + 34, V.hooter ? '#ff8040' : V.sudden ? '#ffd040' : '#c8d8f0', { align: 'center' });
    if (V.adv) UI.txt(g, 'ADVANTAGE ' + V.teams[V.adv.team].short, x + 78, y + 34, '#a0d0ff');
    if (V.ref && V.ref.down > 0) UI.txt(g, 'REF DOWN ' + Math.ceil(V.ref.down), x + 78, y + 34, Math.floor(this.t * 4) % 2 ? '#ff6a3a' : '#ffe060');
  }
  radar(g, r, V, ctx) {
    const s = .07, w = Math.round((G.DX1 - G.DX0) * s), h = Math.round((G.Y1 - G.Y0) * s), ca = TT.game && TT.game.cornerArea && TT.game.cornerArea();
    const x0 = r.W - w - 6, y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : 6;
    UI.panel(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#1e4a26', border: '#6a9070', alpha: .75 });
    const X = x => Math.round(x0 + (x - G.DX0) * s), Y = y => Math.round(y0 + (y - G.Y0) * s);
    px.rect(g, X(G.X0), y0, 1, h, '#a8d0a8'); px.rect(g, X(G.X1), y0, 1, h, '#a8d0a8'); px.rect(g, X(G.CX), y0, 1, h, '#6a9a6a');
    for (const p of V.players) { if (p.st === 'bin' || p.st === 'off') continue; const c = V.kits[p.team].cloth; px.rect(g, X(p.x) - 1, Y(p.y) - 1, 3, 3, '#000000'); px.rect(g, X(p.x) - 1, Y(p.y) - 1, 2, 2, c); if (p.ctl >= 0) { const sc = ctx.seatColor(p.ctl); px.rect(g, X(p.x) - 2, Y(p.y) - 2, 4, 1, sc); px.rect(g, X(p.x) - 2, Y(p.y) + 2, 4, 1, sc); } }
    const b = V.ball; px.rect(g, X(b.x), Y(b.y), 2, 2, '#ffffff');
  }
  /** a card per human seat: the controlled player's live portrait, nickname, turbo, power-up */
  cards(g, r, V, ctx) {
    const seats = ctx.seats.filter(s => s.kind !== 'cpu' && s.kind !== 'remoteHidden');
    seats.forEach((s, k) => {
      const p = V.players[s.pid]; if (!p) return;
      const w = 104, h = 30, left = k % 2 === 0, row = Math.floor(k / 2), x = left ? 4 : r.W - w - 4, y = r.H - h - 4 - row * (h + 3) - (ctx.dialogUp ? 0 : 0);
      UI.panel(g, x, y, w, h, { bg: ['#141a2c', '#0a0e18'], border: s.color, alpha: .88 });
      const rig = ctx.pres && ctx.pres.rigs[p.id];
      if (rig && TT.cfg.present) rig.drawPortrait(g, x + 3, y + 3, 24, { zoom: 2.2, turn: .4, bg: E.shade(V.kits[p.team].cloth, -.5) });
      UI.txt(g, s.label, x + 30, y + 3, s.color);
      UI.txt(g, p.nick.toUpperCase().slice(0, 13), x + 30 + UI.w(s.label) + 4, y + 3, '#f0ecdc');
      const tank = clamp(p.turbo / TUNE.v.turboTank, 0, 1), inf = p.fire > 0 || (p.pu && p.pu.kind === 'pie');
      UI.txt(g, 'TURBO', x + 30, y + 14, '#8090b0', { font: 'tiny' });
      UI.bar(g, x + 52, y + 14, 48, 5, inf ? 1 : tank, inf ? (Math.floor(this.t * 8) % 2 ? '#ffe060' : '#ff8030') : tank < .25 ? '#e84a3a' : '#40d0ff');
      if (p.pu) { UI.txt(g, TT.POWERUPS[p.pu.kind].name.split(' ')[0] + ' ' + Math.ceil(p.pu.t), x + 30, y + 21, '#ffe08a', { font: 'tiny' }); }
      else if (p.fire > 0) UI.txt(g, 'ON FIRE ' + Math.ceil(p.fire), x + 30, y + 21, '#ff9030', { font: 'tiny' });
      else if (p.sup) UI.txt(g, p.sup.kind === 'thunder' ? 'THUNDER RUN' : 'HURRICANE', x + 30, y + 21, '#ffe060', { font: 'tiny' });
    });
  }
  /** the world-anchored bits: the seat chevrons and labels, the L1 / R1 badges over the two receivers, USE IT */
  world(g, r, V, ctx) {
    for (const p of V.players) {
      if (p.ctl < 0 || p.st === 'bin' || p.st === 'off') continue;
      const s = ctx.seats[p.ctl]; if (!s) continue;
      const [x, y] = r.w(p.x, p.y, p.z + 40 * p.size + 4), X = Math.round(x), Y = Math.round(y) + Math.round(Math.sin(this.t * 5) * 1.5);
      px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], '#000000'); px.poly(g, [[X - 3, Y - 5], [X + 3, Y - 5], [X, Y - 1]], s.color);
      UI.txt(g, s.label, X, Y - 14, s.color, { align: 'center' });
      if (p.charge >= 0) { UI.bar(g, X - 12, Y - 20, 24, 4, p.charge, p.chargeT > 1.2 ? '#ff3020' : p.charge >= 1 ? '#ffe060' : '#ff9030'); if (p.charge >= 1 && p.chargeT <= 1.2) UI.txt(g, 'MONSTER!', X, Y - 30, '#ffe060', { align: 'center', font: 'tiny' }); if (p.chargeT > 1.2) UI.txt(g, 'TOO HIGH!', X, Y - 30, '#ff4030', { align: 'center', font: 'tiny' }); }
      if (p.pk > 0) { UI.bar(g, X - 12, Y - 20, 24, 4, p.pk, p.pk > .9 ? '#80ff90' : '#ffe060', { mark: .9 }); UI.txt(g, (p.pkMode || 'punt').toUpperCase(), X, Y - 30, '#ffe060', { align: 'center', font: 'tiny' }); }
    }
    // the receivers for the human carrier: L1 above, R1 below (only legal ones), green; the mouse's hover shows red if forward
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    if (c && c.ctl >= 0 && V.phase === 'play' && V.legalReceivers) {
      const s = ctx.seats[c.ctl], I = s && s.input;
      for (const side of [-1, 1]) {
        const q = V.passTarget(c, side, false); if (!q || (q.y - c.y) * side <= 0) continue;
        const [x, y] = r.w(q.x, q.y, q.z + 40 * q.size + 6);
        UI.glyph(g, side < 0 ? 'l1' : 'r1', x - 6, y - 12, I, {});
      }
      if (ctx.hoverId >= 0 && V.players[ctx.hoverId]) {
        const q = V.players[ctx.hoverId];
        if (q.team === c.team && q.id !== c.id) { const fwd = (q.x - c.x) * V.dir[c.team] > 4, [x, y] = r.w(q.x, q.y, 0); px.rect(g, Math.round(x) - 8, Math.round(y) + 3, 16, 2, fwd ? '#ff3a3a' : '#40ff60'); UI.txt(g, fwd ? 'FORWARD' : 'PASS', Math.round(x), Math.round(y) + 6, fwd ? '#ff6a6a' : '#80ff90', { align: 'center', font: 'tiny' }); }
      }
    }
    // the referee's balloon
    const R = V.ref;
    if (R.callT > 0 && R.call) { const [x, y] = r.w(R.x, R.y, 46), w = UI.w(R.call) + 8; px.rect(g, Math.round(x - w / 2), Math.round(y - 12), w, 11, '#ffffff'); px.rect(g, Math.round(x - w / 2), Math.round(y - 12), w, 1, '#c8c8c8'); px.poly(g, [[x - 2, y - 2], [x + 3, y - 2], [x, y + 2]], '#ffffff'); UI.txt(g, R.call, x, y - 10, '#1a1a24', { align: 'center', shadow: false }); }
    // the scrum, ruck and lineout calls float over play as the ref says them
  }
  prompts(g, r, V, ctx) {
    const s = ctx.seats.find(q => q.kind === 'local'); if (!s || ctx.attract || ctx.drill) return;
    const I = s.input, p = V.players[s.pid]; if (!p) return;
    let txt = '';
    const b = V.ball, has = b.st === 'held' && b.holder === p.id, ph = V.phase;
    if (ph === 'play') {
      if (has) {
        if (V.inGoal(p.team, p.x)) txt = '{b:x} DIVE OVER!';
        else {
          const drop = V.adv1(p.team, p.x) > G.W / 2 - G.L22;
          txt = '{b:l1}{b:r1} PASS  {b:x} STEP  {b:sq} FEND  ' + (drop ? '{b:ci} HOLD: DROP GOAL' : '{b:ci} KICK');
          if (V.hype[p.team] >= 100) txt += '  {b:tri} THUNDER RUN';
        }
      } else if (b.st === 'held' && V.players[b.holder].team !== p.team) {
        txt = '{b:x} TACKLE (HOLD: BIG HIT)  {b:sq} DIVE  {b:ci} SWITCH';
        if (V.hype[p.team] >= 100) txt += '  {b:tri} HURRICANE';
      } else if (b.st === 'air' && b.kind === 'pass' && b.team !== p.team) txt = 'HOLD {b:x} NEAR THE PASS: INTERCEPT';
      else txt = '{b:turbo} TURBO  {b:ci} SWITCH  {b:l1}{b:r1} SWITCH UP/DOWN';
    } else if (ph === 'ruck' && V.setp) {
      const mine = p.st === 'ruck' || V.setp.tackled === p.id;
      txt = mine ? 'MASH {b:x}!' : (p.team !== V.setp.att ? 'RUN IN TO JOIN  {b:sq} JACKAL' : 'RUN IN TO JOIN THE RUCK');
    } else if (ph === 'scrum' && V.setp) {
      const S = V.setp;
      txt = S.sub === 'push' ? 'ALTERNATE {b:l1} {b:r1} {b:l1} {b:r1}!' : S.sub === 'setup' ? 'SCRUM: WAIT FOR "SET!"' : '{b:x} ON "SET!"';
    } else if (ph === 'lineout' && V.setp) {
      const S = V.setp, thr = S.team === p.team;
      txt = thr ? (S.sub === 'throw' ? '{b:x} STOP THE NEEDLE IN THE GREEN' : '{b:l1}{b:r1} CALL A POD  {b:x} THROW') : (S.sub === 'flight' ? '{b:x} JUMP NOW!' : '{b:l1}{b:r1} GUESS THEIR POD  {b:x} AS IT ARRIVES');
    } else if ((ph === 'kickoff' || ph === 'dropout') && V.setp && V.setp.kicker === p.id) txt = '{b:stick} AIM  HOLD {b:ci} POWER, LET GO';
    else if (ph === 'setkick' && V.setp && V.setp.kicker === p.id) txt = V.setp.sub === 'place' ? '{b:stick} TEE BACK OR FORWARD  {b:x} DONE' : V.setp.sub === 'flight' ? '' : '{b:stick} AIM  HOLD {b:ci} POWER, LET GO IN THE BAND';
    else if (ph === 'penalty' && V.setp && V.setp.team === p.team) txt = '{b:stick} CHOOSE  {b:x} OK';
    if (!txt) return;
    const sc = ctx.large ? 2 : 1, y = r.H - (ctx.dialogUp ? 70 : 40) - (sc - 1) * 10;
    const w = UI.promptWidth(txt, I, { scale: sc });
    if (w > r.W - 230 && sc === 1) { UI.prompt(g, txt, r.W / 2, y, I, { align: 'center', bg: 'rgba(0,0,0,.55)', scale: 1 }); return; }
    UI.prompt(g, txt, r.W / 2, y, I, { align: 'center', bg: 'rgba(0,0,0,.55)', scale: w * sc > r.W - 40 ? 1 : sc });
  }
  drawBanners(g, r) {
    this.banners.forEach((b, i) => {
      const u = b.t / b.life, pop = b.t < .15 ? E.ease.outBack(b.t / .15) : 1, sc = b.text.length > 12 ? 3 : 4;
      const y = 56 + i * 44 + (u > .85 ? (u - .85) * -200 : 0);
      if (u > .9 && Math.floor(b.t * 20) % 2) return;
      FONT.title(g, b.text, r.W / 2, y - (1 - pop) * 20, { align: 'center', scale: Math.max(1, Math.round(sc * pop)), colors: ['#ffffff', b.color, E.shade(b.color, -.35)], depth: 2 });
      if (b.sub) UI.txt(g, b.sub, r.W / 2, y + 8 * sc + 4, '#ffffff', { align: 'center' });
    });
  }
  windsock(g, r, V) {
    const x = 4, y = 54, a = V.wind.a, s = V.wind.s;
    UI.panel(g, x, y - 4, 52, 22, { bg: '#0a0e18', border: '#3a4660', alpha: .8 });
    px.rect(g, x + 8, y, 1, 14, '#c8c8c8');
    const len = 4 + s * 12, ex = x + 8 + Math.cos(a) * len, ey = y + 2 + Math.sin(a) * len * .6;
    px.line(g, x + 8, y + 1, Math.round(ex), Math.round(ey), '#ff7030', 2); px.line(g, x + 8, y + 2, Math.round(ex), Math.round(ey) + 1, '#ffffff', 1);
    UI.txt(g, 'WIND', x + 20, y - 1, '#c8d0e8', { font: 'tiny' }); UI.txt(g, Math.round(s * 30) + ' MPH', x + 20, y + 7, '#ffe060', { font: 'tiny' });
  }
  halftime(g, r, V, ctx) {
    const w = 260, h = 120, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2;
    UI.panel(g, x, y, w, h, { bg: ['#2a1a10', '#140c08'], border: '#e8c040' });
    FONT.title(g, 'HALF-TIME', r.W / 2, y + 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#e0662a'] });
    UI.txt(g, V.teams[0].short + '  ' + V.score[0] + ' - ' + V.score[1] + '  ' + V.teams[1].short, r.W / 2, y + 36, '#ffffff', { align: 'center', scale: 2 });
    if (ctx.halfLine) { const L = FONT.wrap(ctx.halfLine, w - 20); L.slice(0, 3).forEach((l, i) => UI.txt(g, l, r.W / 2, y + 60 + i * 10, '#ffe7a8', { align: 'center' })); }
    else { const st = V.stats; UI.txt(g, 'TACKLES ' + st[0].tackles + ' - ' + st[1].tackles + '    BIG HITS ' + st[0].bigHits + ' - ' + st[1].bigHits, r.W / 2, y + 62, '#c8d0e8', { align: 'center' }); }
    UI.prompt(g, '{b:x} SECOND HALF', r.W / 2, y + h - 18, ctx.I, { align: 'center' });
  }
  replayBars(g, r, ctx) {
    const bh = Math.round(r.H * .1);
    px.rect(g, 0, 0, r.W, bh, '#000000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000000');
    if (Math.floor(this.t * 2) % 2) px.disc(g, 14, bh / 2, 4, '#e83030');
    UI.txt(g, 'INSTANT REPLAY', 24, bh / 2 - 4, '#ffffff', { scale: 1 });
    UI.prompt(g, '{b:x} SKIP', r.W - 8, r.H - bh / 2 - 6, ctx.I, { align: 'right' });
  }
  /* ---- the set pieces' big widgets ---- */
  setPiece(g, r, V, ctx) {
    const S = V.setp; if (!S) return;
    const cx = r.W / 2, I = ctx.I;
    if (S.kind === 'ruck') {
      const w = 120, x = cx - w / 2, y = 8;
      UI.panel(g, x - 34, y - 4, w + 68, 18, { alpha: .82 });
      UI.txt(g, 'RUCK', x - 30, y, '#ffffff');
      const att = S.att, k = clamp((S.bar + 1) / 2, 0, 1);
      px.rect(g, x, y, w, 8, V.kits[1 - att].cloth); px.rect(g, x, y, Math.round(w * k), 8, V.kits[att].cloth); px.rect(g, x + w / 2, y - 2, 1, 12, '#ffffff');
      px.rect(g, x + Math.round(w * k) - 1, y - 2, 3, 12, '#ffe060');
      UI.txt(g, V.teams[att].short, x + w + 4, y, '#ffffff', { font: 'tiny' });
    }
    if (S.kind === 'scrum') {
      const w = 130, x = cx - w / 2, y = 6;
      UI.panel(g, x - 6, y - 3, w + 12, 34, { alpha: .82 });
      const call = S.sub === 'setup' ? 'SCRUM: ' + V.teams[S.team].short + ' FEED' : S.sub === 'crouch' ? 'CROUCH...' : S.sub === 'bind' ? 'BIND...' : S.sub === 'set' ? 'SET!' : 'PUSH!';
      UI.txt(g, call, x, y, S.sub === 'set' ? '#ffe060' : '#ffffff');
      // the ring closing on SET
      if (S.sub === 'bind' || S.sub === 'set') { const k = S.sub === 'bind' ? 1 - S.t / .6 : 0, rr = 3 + k * 8, rx = x + w - 10, ry = y + 9; for (let a = 0; a < 20; a++) { const an = a / 20 * TAU; px.dot(g, Math.round(rx + Math.cos(an) * rr), Math.round(ry + Math.sin(an) * rr), '#ffffff'); } px.disc(g, rx, ry, 3, S.sub === 'set' ? '#ffe060' : '#5a6a8a'); }
      for (const t of [0, 1]) if (S.tq[t]) UI.txt(g, V.teams[t].short + ' ' + S.tq[t], t ? x + w - 22 : x + 56, y + 1, S.tq[t] === 'PERFECT' ? '#80ff90' : S.tq[t] === 'GOOD' ? '#ffe060' : '#ff8080', { align: t ? 'right' : 'left', font: 'tiny' });
      const A = S.team, k = clamp((S.bar + 1) / 2, 0, 1), by = y + 20;
      px.rect(g, x, by, w, 7, V.kits[1 - A].cloth); px.rect(g, x, by, Math.round(w * k), 7, V.kits[A].cloth); px.rect(g, x + w / 2, by - 2, 1, 11, '#ffffff'); px.rect(g, x + Math.round(w * .075), by - 1, 1, 9, '#ff6060'); px.rect(g, x + Math.round(w * .925), by - 1, 1, 9, '#ff6060'); px.rect(g, x + Math.round(w * k) - 1, by - 2, 3, 11, '#ffe060');
    }
    if (S.kind === 'lineout') {
      const pw = 50, gap = 4, w = 3 * pw + 2 * gap, x = cx - w / 2, y = 6;
      UI.panel(g, x - 6, y - 3, w + 12, 36, { alpha: .82 });
      const mine = ctx.myTeam, rects = [];
      for (let k = 0; k < 3; k++) {
        const bx = x + k * (pw + gap), on = mine !== undefined && S.calls[mine] === k, theirs = ctx.shared && mine !== undefined && S.calls[1 - mine] === k && S.picked[1 - mine];
        px.rect(g, bx, y, pw, 12, on ? '#f0c040' : '#20283a'); if (on) px.rect(g, bx + 1, y + 1, pw - 2, 10, '#3a2a10');
        UI.txt(g, TT.POD_NAMES[k], bx + pw / 2, y + 2, on ? '#ffe060' : '#c8d0e8', { align: 'center', font: 'tiny' });
        if (theirs) px.rect(g, bx + 2, y + 10, pw - 4, 1, V.kits[1 - mine].cloth);
        rects.push([bx, y, pw, 12]);
      }
      ctx.podRects = rects;
      const ny = y + 16;
      if (S.sub === 'throw' || S.sub === 'flight') {
        px.rect(g, x, ny, w, 7, '#5a1a1a'); px.rect(g, x + Math.round(w * .15), ny, Math.round(w * .7), 7, '#8a7a1a'); px.rect(g, x + Math.round(w * .35), ny, Math.round(w * .3), 7, '#2a8a3a');
        px.rect(g, x + Math.round(w * S.needle) - 1, ny - 2, 3, 11, '#ffffff');
        if (S.qT) UI.txt(g, S.qT, cx, ny + 9, S.q >= 1 ? '#80ff90' : '#ffe060', { align: 'center', font: 'tiny' });
      } else UI.txt(g, V.teams[S.team].short + ' THROW: CALL A POD', cx, ny + 1, '#ffffff', { align: 'center', font: 'tiny' });
    }
    if ((S.kind === 'kickoff' || S.kind === 'dropout') && V.players[S.kicker] && V.players[S.kicker].ctl >= 0) this.meter(g, r.W - 40, r.H / 2 - 40, S.power, .85, 'POWER');
    if (S.kind === 'setkick') this.setKick(g, r, V, ctx);
    if (S.kind === 'penalty') this.penaltyCards(g, r, V, ctx);
  }
  meter(g, x, y, v, mark, label, band) {
    UI.panel(g, x - 6, y - 14, 24, 100, { alpha: .85 });
    UI.txt(g, label, x + 6, y - 11, '#ffffff', { align: 'center', font: 'tiny' });
    px.rect(g, x, y, 12, 80, '#0c0e14');
    if (band) px.rect(g, x + 1, y + 80 - Math.round(80 * band[1]), 10, Math.round(80 * (band[1] - band[0])), '#2a6a3a');
    const h = Math.round(78 * clamp(v, 0, 1)); px.rect(g, x + 1, y + 79 - h, 10, h, v > 1 ? '#ff4030' : '#ffd040');
    if (mark !== undefined) { const my = y + 80 - Math.round(80 * clamp(mark, 0, 1)); px.rect(g, x - 3, my, 18, 1, '#ffffff'); }
  }
  setKick(g, r, V, ctx) {
    const S = V.setp, tee = V.teePos(), line = V.oppLine(S.team), D = Math.hypot(line - tee.x, G.CY - tee.y);
    const k = V.players[S.kicker], human = k && k.ctl >= 0;
    UI.panel(g, r.W / 2 - 80, 46, 160, 22, { alpha: .85 });
    UI.txt(g, (S.purpose === 'conv' ? 'CONVERSION' : 'PENALTY GOAL') + '  ' + Math.round(metres(D)) + ' M', r.W / 2, 49, '#ffffff', { align: 'center' });
    UI.txt(g, 'SHOT CLOCK ' + Math.max(0, Math.ceil(S.clockT)), r.W / 2, 58, S.clockT < 6 ? '#ff7060' : '#a0b0c8', { align: 'center', font: 'tiny' });
    if (S.sub === 'place') UI.txt(g, 'TEE: ' + Math.round(metres(S.d)) + ' M OUT', r.W / 2, 72, '#ffe060', { align: 'center' });
    // the reticle on the posts' plane and the wind arrow
    if (S.sub !== 'flight' && S.sub !== 'result') {
      const [ax, ay] = r.w(line, G.CY + S.aim + S.sway, G.BAR + 18), X = Math.round(ax), Y = Math.round(ay);
      px.rect(g, X - 7, Y, 5, 1, '#ffe060'); px.rect(g, X + 3, Y, 5, 1, '#ffe060'); px.rect(g, X, Y - 7, 1, 5, '#ffe060'); px.rect(g, X, Y + 3, 1, 5, '#ffe060');
      px.rect(g, X - 1, Y - 1, 3, 3, '#ffffff');
    }
    if (human || S.sub === 'power') this.meter(g, r.W - 40, r.H / 2 - 40, S.power, V.setKickNeed ? V.setKickNeed() : S.need, 'POWER', [.82, .95]);
    if (S.result) FONT.title(g, S.result === 'good' ? 'GOOD!' : S.result === 'doink' ? 'DOINK!' : 'WIDE!', r.W / 2, r.H * .32, { align: 'center', scale: 4, colors: S.result === 'good' ? ['#ffffff', '#80ff90', '#2a8a3a'] : ['#ffffff', '#ff8080', '#8a2a2a'], depth: 2 });
  }
  penaltyCards(g, r, V, ctx) {
    const S = V.setp, names = { tap: ['TAP & GO', 'Play on now. They go back 10 m.'], goal: ['KICK AT GOAL', 'Three points from the tee.'], touch: ['KICK FOR TOUCH', 'Gain ground. Your lineout.'] };
    const w = 104, h = 60, gap = 8, total = 3 * w + 2 * gap, x0 = r.W / 2 - total / 2, y = r.H / 2 - 20;
    FONT.title(g, S.free ? 'FREE KICK' : 'PENALTY', r.W / 2, y - 40, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
    UI.txt(g, V.teams[S.team].name + ' TO CHOOSE', r.W / 2, y - 14, '#c8d0e8', { align: 'center' });
    const rects = [];
    S.opts.forEach((o, i) => {
      const x = x0 + i * (w + gap), on = S.sel === i;
      rects.push(o ? [x, y, w, h] : null);
      if (!o) { UI.panel(g, x, y, w, h, { alpha: .5, border: '#2a3040' }); UI.txt(g, 'OUT OF RANGE', x + w / 2, y + h / 2 - 3, '#5a6078', { align: 'center' }); return; }
      UI.panel(g, x - (on ? 2 : 0), y - (on ? 4 : 0), w + (on ? 4 : 0), h + (on ? 4 : 0), { focus: on, bg: on ? ['#3a2a10', '#241808'] : ['#1a2032', '#10141e'] });
      UI.txt(g, names[o][0], x + w / 2, y + 8, on ? '#ffe060' : '#ffffff', { align: 'center' });
      FONT.wrap(names[o][1], w - 10).forEach((l, k) => UI.txt(g, l, x + w / 2, y + 26 + k * 9, '#a8b0c8', { align: 'center', font: 'tiny' }));
    });
    ctx.cardRects = rects;
  }
}
TT.Hud = Hud;
TT.mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
