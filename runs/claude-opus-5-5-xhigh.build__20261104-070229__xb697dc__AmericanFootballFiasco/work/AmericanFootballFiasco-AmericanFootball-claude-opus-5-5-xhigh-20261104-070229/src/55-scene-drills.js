// The drills (the tryouts of chapter 1 and PRACTICE): each is a small match set up for one lesson, with an instruction
// card, a progress counter, success and failure (it restarts at once; after 2 failures it can be skipped), and a bot that
// completes it through intents (the tests and the attract mode use it). PRACTICE is a grid of all nine, best times kept.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, bus = FF.bus;
const { B1, B2, B3, B4 } = FF.BITS;
const DR = { mv: null, id: null, st: null, t: 0, fails: 0, card: 0, result: null, resultT: 0, botOn: false, offs: [] };
FF.drill = DR;
const human = () => DR.mv && DR.mv.m.on.concat(DR.mv.m.extra).find(a => a.ctl === 0);
const mod = (name, m) => bus.addMod(name, Object.assign({ tag: 'drill', keep: true }, m));
/** a live play with just these athletes on the field: [{ side, slot, x, y, facing, drill }], the holder's slot */
function freeLive(m, list, holder) {
  for (const a of m.all) { a.onField = false; a.ctl = null; a.carry = null; a.action = null; a.downT = 0; a.engaged = null; a.x = F.MID_X; a.y = F.SIDE_B + 70; }
  m.on = []; m.bySlot = [{}, {}]; m.extra = [];
  for (const e of list) { const a = m.roster[e.side].find(x => x.homeSlot === e.slot); Object.assign(a, { onField: true, slot: e.slot, x: e.x, y: e.y, z: 0, vx: 0, vy: 0, facing: e.facing || 0, pose: 'run', brain: { beh: e.beh || 'idle', drill: e.drill, react: .2 }, intent: FF.blankIntent(), hist: [], turbo: 1 }); m.on.push(a); m.bySlot[e.side][e.slot] = a; }
  m.unit = [m.on.filter(a => a.side === 0), m.on.filter(a => a.side === 1)];
  m.play = { off: { id: 'drill', name: 'DRILL', type: 'run', side: 'off', assign: {} }, def: { id: 'drill', name: 'DRILL', side: 'def' }, t: 0, snapped: true, losX: m.los, kind: 'scrimmage', passed: true, events: [], carrierStart: null, cards: [null, null] };
  m.phase = 'LIVE'; m.stopClock = true; m.blocks = [];
  if (holder) { const h = m.on.find(a => a.slot === holder); m.giveBall(h, 'drill'); m.play.carrier = h; m.play.carrierStart = h.x; }
}
/** a drill's match: the Fiascos (home, the human) against the Scrubs at Tumbleweed */
function newMatch(o = {}) {
  if (DR.mv) DR.mv.dispose();
  for (const f of DR.offs) f(); DR.offs = [];
  bus.clearMods('drill');
  const spec = Object.assign({ mode: 'drill', home: 'fiascos', away: 'scrubs', stadium: 'tumbleweed', humans: { 0: [0], 1: [] }, seed: 77 + DR.fails, start: { possession: 0, los: 25 } }, o);
  DR.mv = new FF.MatchView(spec); const m = DR.mv.m; m.fastCalls = true;
  return m;
}
/** call both sides' plays at once (the drill decides) */
function autoCall(m, off, def, card) { if (m.phase !== 'PLAYCALL') return; m.callPlay(m.poss, off, false, card || null); m.callPlay(1 - m.poss, def, false, null); }
const L = {
  cones: {
    setup() { const m = newMatch({ start: { possession: 0, los: 20 } }); const D = m.dir(0), x0 = m.xAt(0, 20); freeLive(m, [{ side: 0, slot: 'QB', x: x0, y: F.MID_Y, facing: D > 0 ? 0 : Math.PI }], 'QB'); human0(m, 'QB');
      DR.st = { cones: [0, 1, 2, 3, 4].map(k => ({ x: x0 + D * (6 + k * 6) * YD, y: F.MID_Y + (k % 2 ? 4 : -4) * YD })), gate: x0 + D * 45 * YD, next: 0, t: 0, started: false, D }; },
    update(dt) { const s = DR.st, a = human(); if (!a) return 'fail'; if (Math.hypot(a.vx, a.vy) > 20) s.started = true; if (s.started) s.t += dt;
      const c = s.cones[s.next]; if (c && Math.hypot(a.x - c.x, a.y - c.y) < 1.5 * YD) { s.next++; game.audio.sfx('menuSelect'); game.particles.glints(c.x, c.y, 10, 6, '#ffd84a'); }
      if (s.next >= 5 && (a.x - s.gate) * s.D > 0) return 'ok'; if (s.t > 9 || DR.mv.m.phase !== 'LIVE') return 'fail'; return null; },
    progress() { return DR.st.next + ' / 5 CONES   ' + DR.st.t.toFixed(1) + ' s'; },
    bot() { const s = DR.st, a = human(); if (!a) return; const c = s.cones[s.next] || { x: s.gate + s.D * 40, y: F.MID_Y }; steer(a, c.x, c.y); a.intent.turbo = true; },
    draw(r) { for (const c of DR.st.cones) r.shape('cone', c.x, c.y, 0, {}); for (const y of [F.MID_Y - 5 * YD, F.MID_Y + 5 * YD]) r.shape('cone', DR.st.gate, y, 0, {}); r.decal(g => { const [x0, y0] = r.w(DR.st.gate, F.MID_Y - 5 * YD, 0), [x1, y1] = r.w(DR.st.gate, F.MID_Y + 5 * YD, 0); px.line(g, x0, y0, x1, y1, '#ffd84a', 2); }); }
  },
  handoff: {
    setup() { const m = newMatch({ start: { possession: 0, los: 25 } }); m.onSetup = mm => { mm.on = mm.on.filter(a => a.side === 0); mm.unit[1] = []; mm.bySlot[1] = {}; }; DR.st = { gained: 0 }; },
    update() { const m = DR.mv.m; autoCall(m, 'hb_dive', 'cover2');
      if (m.phase === 'LIVE') { const h = m.ball.holder; if (h && h.slot === 'RB') { DR.st.gained = Math.max(DR.st.gained, (h.x - m.play.losX) * m.dir(0) / YD); if (DR.st.gained >= 10) return 'ok'; } }
      if (m.phase === 'DEAD' || m.phase === 'CELEBRATE') return DR.st.gained >= 10 ? 'ok' : 'fail'; return null; },
    progress() { return Math.max(0, Math.floor(DR.st.gained)) + ' / 10 YARDS'; },
    bot() { const m = DR.mv.m, a = human(); if (!a) return; if (m.phase === 'PRESNAP' && m.set) a.intent.press |= B1; if (m.phase === 'LIVE' && m.ball.holder === a && a.slot === 'RB') { a.intent.mx = m.dir(0); a.intent.my = 0; a.intent.turbo = true; } },
    draw(r) { const m = DR.mv.m; for (let k = 0; k < 3; k++) r.shape('dummy', m.los + m.dir(0) * (3 + k * 3) * YD, F.MID_Y + (k - 1) * 3 * YD, 0, {}); }
  },
  moves: {
    setup() { const m = newMatch({ start: { possession: 0, los: 75 } }); const D = m.dir(0), x0 = m.xAt(0, 75), y = F.MID_Y, fac = D > 0 ? Math.PI : 0;
      freeLive(m, [{ side: 0, slot: 'RB', x: x0, y, facing: D > 0 ? 0 : Math.PI }, { side: 1, slot: 'LB1', x: x0 + D * 6 * YD, y, facing: fac, drill: dStand }, { side: 1, slot: 'S', x: x0 + D * 12 * YD, y, facing: fac, drill: dCharge }, { side: 1, slot: 'LB2', x: x0 + D * 18 * YD, y, facing: fac, drill: dDive }], 'RB'); human0(m, 'RB');
      const need = { LB1: 'spin', S: 'stiffArm', LB2: 'hurdle' };
      mod('tackle.p', { set: c => { const n = need[c.tackler.slot], act = c.carrier.action; if (n === 'stiffArm' && act && act.id === 'stiffArm') return 0; return 1; }, test: c => c.carrier.side === 0 });
      DR.st = { passed: 0, D, x0 }; },
    update() { const m = DR.mv.m, a = human(), s = DR.st; if (!a) return 'fail';
      for (const [k, slot] of [[0, 'LB1'], [1, 'S'], [2, 'LB2']]) { const t = m.bySlot[1][slot]; if (t && s.passed === k && (a.x - t.x) * s.D > 1.2 * YD) { s.passed++; game.audio.sfx('menuSelect'); } }
      if (m.phase === 'CELEBRATE' || (m.result && m.result.why === 'td')) return 'ok'; if (m.phase === 'DEAD') return 'fail'; return null; },
    progress() { return ['SPIN', 'STIFF ARM', 'HURDLE', 'DIVE IN'][Math.min(3, DR.st.passed)]; },
    bot() { const m = DR.mv.m, a = human(); if (!a || m.ball.holder !== a) return; a.intent.mx = DR.st.D; a.intent.my = 0; a.intent.turbo = true;
      const st = DR.st; st.used = st.used || {}; const MV = { LB1: [B3, 1.3], S: [B2, 1.9], LB2: [B4, 2.7] };
      if (!a.action) for (const sl of ['LB1', 'S', 'LB2']) { const t = m.bySlot[1][sl]; if (!t || st.used[sl] || t.downT > 0) continue; const d = Math.hypot(t.x - a.x, t.y - a.y); if ((t.x - a.x) * st.D < -YD) continue; if (d < MV[sl][1] * YD) { a.intent.press |= MV[sl][0]; st.used[sl] = true; break; } }
      if (st.passed >= 3 && Math.abs(a.x - m.goalX(0)) < 3 * YD && !a.action) a.intent.press |= B1;
      const t = null;
      void t; }
  },
  passing: {
    setup() { newMatch({ start: { possession: 0, los: 30 } }); DR.mv.m.onSetup = mm => keepDef(mm, ['CB', 'S']); mod('speed', { mul: .72, test: a => a.side === 1 }); DR.st = { done: 0, rocket: false, startLos: 30 }; },
    update() { const m = DR.mv.m, s = DR.st; resetDrive(m, 0, s.startLos); autoCall(m, 'slants', 'man');
      if (m.phase === 'LIVE' && m.play.completed && !m.play.counted && m.ball.holder && m.ball.holder.side === 0) { m.play.counted = true; const c = m.ball.holder, cov = m.on.some(o => o.side === 1 && Math.hypot(o.x - c.x, o.y - c.y) < 3.5 * YD);
        if (s.done >= 2 && m.play.passType === 'bullet' && cov) s.rocket = true; s.done++; game.audio.sfx('menuSelect'); m.dead('tackle', { holder: c }); }
      if (s.rocket) return 'ok'; return null; },
    progress() { return DR.st.done < 2 ? DR.st.done + ' / 2 COMPLETIONS' : 'NOW: A ROCKET PASS TO A COVERED MAN'; },
    bot() { const m = DR.mv.m, a = human(); if (!a) return; if (m.phase === 'PRESNAP' && m.set) a.intent.press |= B1;
      if (m.phase === 'LIVE' && m.ball.holder === a && m.canPass(a) && m.play.t > .9) { const rc = m.receivers(0); let best = 0, bs = DR.st.done >= 2 ? 1e9 : -1; rc.forEach((r, k) => { const d = Math.min(...m.on.filter(o => o.side === 1).map(o => Math.hypot(o.x - r.x, o.y - r.y))); if (DR.st.done >= 2 ? d < bs : d > bs) { bs = d; best = k; } }); a.intent.recv = best; a.intent.turbo = DR.st.done >= 2; }
      if (m.phase === 'LIVE' && m.ball.holder === a && !m.canPass(a)) { a.intent.mx = m.dir(0); }
      const b = m.ball; if (m.phase === 'LIVE' && b.state === 'pass' && b.to && b.target === a) { steer(a, b.to.x, b.to.y); a.intent.turbo = true; } }
  },
  catching: {
    setup() { newMatch({ start: { possession: 0, los: 30 } }); const m = DR.mv.m;
      m.onSetup = mm => { mm.on = mm.on.filter(a => a.side === 0 && ['QB', 'C', 'LG', 'RG', 'WR1'].includes(a.slot)); mm.unit[1] = []; mm.bySlot[1] = {}; for (const a of mm.on) a.ctl = null; mm.bySlot[0].WR1.ctl = 0; mm.lockCtl = true; };
      mod('catch.p', { set: c => { const act = c.receiver.action; return act && act.id === 'jump' ? 1 : 0; }, test: c => c.receiver.side === 0 });
      mod('aim.err', { mul: 0, test: a => a.side === 0 });
      DR.st = { tries: 0, caught: 0 }; },
    update() { const m = DR.mv.m, s = DR.st; resetDrive(m, 0, 30); autoCall(m, 'curls', 'cover2');
      if (m.phase === 'PRESNAP' && m.set && !m.hikeNow) m.hikeNow = m.presnapT > 1.8;
      if (m.phase === 'LIVE') { const qb = m.bySlot[0].QB; if (qb) { qb.brain.q = { drop: [-6, 0], reads: ['WR1'], readT: 1.1 }; } if (m.play.completed && m.ball.holder) m.dead('tackle', { holder: m.ball.holder }); }
      if (m.phase === 'DEAD' && !m.play.counted) { m.play.counted = true; if (m.play.passer) { s.tries++; if (m.play.completed) s.caught++; } }
      if (s.caught >= 2) return 'ok'; if (s.tries >= 3) return 'fail'; return null; },
    progress() { return DR.st.caught + ' CAUGHT  ·  ' + (3 - DR.st.tries) + ' LEFT'; },
    bot() { const m = DR.mv.m, a = human(), b = m.ball; if (!a) return; if (b.state === 'pass' && b.to && (b.type === 'lob' || b.type === 'bullet') && b.thrower && b.thrower.side === 0) { steer(a, b.to.x, b.to.y); a.intent.turbo = true; const tl = b.T - b.t; if (tl < .32 && tl > .16 && !a.action) a.intent.press |= B4; } }
  },
  defense: {
    setup() { const m = newMatch({ start: { possession: 1, los: 50 }, humans: { 0: [0], 1: [] } }); m.onSetup = mm => { if (DR.st && DR.st.part === 2) { mm.on = mm.on.filter(a => !(a.side === 1 && ['C', 'LG', 'RG'].includes(a.slot))); mm.unit[1] = mm.on.filter(a => a.side === 1); mm.bySlot[1] = Object.fromEntries(mm.unit[1].map(a => [a.slot, a])); } for (const a of mm.on) if (a.side === 0) a.brain = { beh: 'idle', drill: dIdle }; }; mod('fumble.p', { set: c => c.tackler.ctl !== null && c.tackler.action && c.tackler.action.id === 'bigHit' && DR.st.part === 1 ? 1 : 0, test: () => true });
      mod('int.p', { set: c => c.defender.ctl !== null && c.defender.action && c.defender.action.id === 'jump' ? 1 : 0, test: () => DR.st.part === 2 }); mod('tackle.p', { add: .35, test: c => c.tackler.ctl !== null }); DR.st = { part: 0, switched: false }; },
    update() { const m = DR.mv.m, s = DR.st; resetDrive(m, 1, 50); autoCall(m, s.part === 2 ? 'slants' : 'hb_dive', 'cover2');
      if (m.phase === 'LIVE' && m.play.t < .05) for (const a of m.on) if (a.side === 0 && a.ctl === null) { a.brain.drill = dIdle; }
      if (m.phase === 'LIVE') for (const a of m.on) if (a.side === 0 && a.ctl === null && a.brain) a.brain.drill = dIdle;
      // the interception lesson: the scrub QB throws toward the receiver nearest you, a lob you can reach
      if (s.part === 2 && m.phase === 'LIVE' && m.play.t <= 1.1 && m.ball.holder && m.ball.holder.slot === 'QB' && m.ball.holder.brain) m.ball.holder.brain.readT2 = 1;
      if (s.part === 2 && m.phase === 'LIVE' && m.play.t > 1.1 && !m.play.passed) { const qb = m.ball.holder, me = human(); if (qb && qb.slot === 'QB' && me) { const rc = m.receivers(1); let k = 0, bd = 1e9; rc.forEach((r, i) => { const d = Math.hypot(r.x - me.x, r.y - me.y); if (d < bd) { bd = d; k = i; } }); m.startThrow(qb, k, false); } }
      if (m.phase === 'DEAD' && !m.play.counted) { m.play.counted = true; const r = m.result, ev = FF.bus.log.slice(-25);
        const ok = s.part === 0 ? ev.some(e => (e.ev === 'tackle' || e.ev === 'bigHit' || e.ev === 'megaHit') && e.tackler && e.tackler.ctl !== null && e.m === m) : s.part === 1 ? ev.some(e => (e.ev === 'recover' || e.ev === 'pileWon') && e.side === 0 && e.m === m) : ev.some(e => e.ev === 'int' && e.defender.side === 0 && e.m === m);
        if (ok) { s.part++; game.audio.sfx('menuSelect'); FF.fx.say(['NICE TACKLE!', 'FUMBLE RECOVERED!', 'PICKED OFF!'][s.part - 1], { scale: 2, dur: 1.2 }); if (s.part >= 3) return 'ok'; } else return 'fail'; void r; }
      return null; },
    progress() { return ['SWITCH AND TACKLE', 'BIG HIT, THEN RECOVER', 'JUMP TO INTERCEPT'][Math.min(2, DR.st.part)]; },
    bot() { const m = DR.mv.m, a = human(), b = m.ball, s = DR.st; if (!a || m.phase !== 'LIVE') return;
      if (s.part === 0 && !s.switched && m.play.t > .2) { a.intent.press |= B2; s.switched = true; return; }
      if (b.state === 'loose') { steer(a, b.x, b.y); a.intent.turbo = true; if (Math.hypot(b.x - a.x, b.y - a.y) < 2 * YD) a.intent.press |= B1; return; }
      if (b.state === 'pass' && b.to && (b.type === 'lob' || b.type === 'bullet')) { steer(a, b.to.x, b.to.y); a.intent.turbo = true; const tl = b.T - b.t; if (tl < .4 && tl > .1 && !a.action && Math.hypot(b.to.x - a.x, b.to.y - a.y) < 3 * YD) a.intent.press |= B4; return; }
      const h = b.holder; if (h && h.side === 1) { steer(a, h.x + h.vx * .3, h.y + h.vy * .3); a.intent.turbo = true; const d = Math.hypot(h.x - a.x, h.y - a.y); if (d < 1.4 * YD && !a.action && m.play.t > .5) { a.intent.press |= B1; if (s.part === 1) a.intent.turbo = true; } } }
  },
  kicking: {
    setup() { newMatch({ start: { possession: 0, los: 80, down: 4 } }); DR.mv.m.onSetup = mm => { if (DR.st && DR.st.part === 0) { mm.on = mm.on.filter(a => a.side === 0); mm.unit[1] = []; mm.bySlot[1] = {}; } }; DR.st = { part: 0, dist: 0 }; },
    update() { const m = DR.mv.m, s = DR.st;
      if (s.part === 0) { if (m.phase === 'PLAYCALL') { m.poss = 0; m.los = m.xAt(0, 80); m.down = 4; m.callKind = 'scrimmage'; autoCall(m, 'field_goal', 'fg_block'); }
        if (m.phase === 'CELEBRATE' || (m.phase === 'DEAD' && m.result && m.result.why === 'fg')) { const ok = FF.bus.log.slice(-8).some(e => e.ev === 'fg' && e.good && e.m === m); if (ok) { s.part = 1; FF.fx.say('IT\'S GOOD! NOW KICK OFF', { scale: 2 }); m.kickoffSide = 0; m.poss = 0; m.nextKickoffFrom = null; m.afterCeleb = null; m.toPlaycall('kickoff'); return null; } return 'fail'; } }
      else { if (m.phase === 'PLAYCALL') autoCall(m, 'ko_deep', 'ret_mid'); const b = m.ball; if (b.state === 'kickLoose' || (b.state === 'held' && m.play.kicked)) { const d = Math.abs((b.kickFrom ? b.kickFrom.x : m.los) - (b.state === 'held' ? (m.play.returner ? m.play.carrierStart : b.x) : b.x)) / YD; s.dist = Math.max(s.dist, d); }
        if (m.phase === 'DEAD' || m.phase === 'PLAYCALL' && m.playNo > 1 && m.play && m.play.kicked) return s.dist >= 50 || (m.result && m.result.why === 'touchback') ? 'ok' : 'fail'; }
      return null; },
    progress() { return DR.st.part === 0 ? '37-YARD FIELD GOAL' : 'KICK OFF 50+ YARDS' + (DR.st.dist ? '  (' + Math.round(DR.st.dist) + ')' : ''); },
    bot() { const m = DR.mv.m, K = m.meterK; if (!K || m.phase !== 'PRESNAP' || !m.set || K.done) return; if (K.stage === 0) m.meterPress = true; else if (K.stage === 1 && K.power > (DR.st.part ? .97 : .88) && K.dir > 0) m.meterPress = true; else if (K.stage === 2 && Math.abs(K.needle) < .04) m.meterPress = true; }
  },
  playcall: {
    setup() { newMatch({ start: { possession: 0, los: 35 }, cards: { 0: ['HOT_SAUCE'], 1: [] } }); DR.st = { pc: null, called: false, ok: null, blazing: false }; const m = DR.mv.m; DR.offs.push(bus.on('called', d => { if (d.m !== m || d.side !== 0 || DR.st.called) return; DR.st.called = true; const pl = FF.data.plays[d.id]; DR.st.ok = pl.tab === 'PASS' && m.flip[0] && m.cardsArmed[0] === 'HOT_SAUCE'; })); },
    update(dt) { const m = DR.mv.m, s = DR.st;
      if (m.phase === 'PLAYCALL' && !s.called) { if (!s.pc) s.pc = new FF.PlayCall(m, 0, [0]); if (!m.calls[1]) m.callPlay(1, 'cover2'); s.pc.update(dt, { W: game.W, H: game.H }, 0, game.W); }
      if (s.called && s.ok === false) return 'fail';
      if (m.phase === 'LIVE' && m.on.some(a => a.side === 0 && a.hot > 0)) s.blazing = true;
      if ((m.phase === 'DEAD' || m.phase === 'CELEBRATE') && s.called) return s.blazing ? 'ok' : 'fail'; return null; },
    progress() { return DR.st.called ? 'RUN IT BLAZING!' : 'PASS PLAY · FLIP · HOT SAUCE'; },
    bot() { const m = DR.mv.m, s = DR.st, a = human(); if (s.pc && !s.pc.done && m.phase === 'PLAYCALL') { s.pc.tab = s.pc.opt.tabs.indexOf('PASS'); s.pc.flip = true; s.pc.card = 'HOT_SAUCE'; s.pc.pick('slants'); }
      if (a && m.phase === 'PRESNAP' && m.set) a.intent.press |= B1; if (a && m.phase === 'LIVE' && m.ball.holder === a && m.canPass(a) && m.play.t > .8) a.intent.recv = 0; },
    draw(r) { if (DR.st.pc && !DR.st.pc.done && DR.mv.m.phase === 'PLAYCALL') r.overlay(g => DR.st.pc.draw(g, r, 0, r.W, false)); }
  },
  scrimmage: {
    setup() { newMatch({ start: { possession: 0, los: 30 } }); DR.st = { pc: null, pcNo: -1 }; if (DR.botOn) { DR.mv.m.cheats.godMode = true; DR.mv.m.cheats.forceCatch = true; } },
    update(dt) { const m = DR.mv.m, s = DR.st;
      if (m.phase === 'PLAYCALL' && m.callKind !== 'kickoff') { if (s.pcNo !== m.playNo + m.callKind) { s.pcNo = m.playNo + m.callKind; s.pc = new FF.PlayCall(m, 0, [0]); } if (!s.pc.done) s.pc.update(dt, { W: game.W, H: game.H }, 0, game.W); }
      if (m.result && (m.result.why === 'td') && m.score[0] > 0) return 'ok';
      if (m.poss !== 0 || (m.result && m.result.why === 'safety')) return 'fail'; return null; },
    progress() { const m = DR.mv.m; return FF.u.ord(m.down) + ' & ' + m.toGo + '  ' + m.spotText(); },
    bot() { const m = DR.mv.m, s = DR.st, a = human(); if (s.pc && !s.pc.done && m.phase === 'PLAYCALL') s.pc.pick(s.pc.suggest);
      if (!a) return; if (m.phase === 'PRESNAP' && m.set) a.intent.press |= B1;
      if (m.phase === 'LIVE' && m.ball.holder === a && m.canPass(a) && m.play.t > 1) a.intent.recv = 0;
      if (m.phase === 'LIVE' && m.ball.holder === a && !m.canPass(a)) { a.intent.mx = m.dir(0); a.intent.my = (F.MID_Y - a.y) / 400; a.intent.turbo = true; } },
    draw(r) { if (DR.st.pc && !DR.st.pc.done && DR.mv.m.phase === 'PLAYCALL') r.overlay(g => DR.st.pc.draw(g, r, 0, r.W, false)); }
  }
};
FF.drillLogic = L;
// the drill brains for the scrubs
function dStand(m, a, I) { const c = m.ball.holder; if (c) I.face = Math.atan2(c.y - a.y, c.x - a.x); }
function dCharge(m, a, I) { const c = m.ball.holder; if (!c) return; const t1 = m.bySlot[1].LB1, D = m.dir(0); if (t1 && (c.x - t1.x) * D < .5 * YD) { I.face = Math.atan2(c.y - a.y, c.x - a.x); return; } const d = Math.hypot(c.x - a.x, c.y - a.y); if (d < 9 * YD) { I.mx = (c.x - a.x) / d; I.my = (c.y - a.y) / d; I.turbo = d > 3 * YD; } }
function dDive(m, a, I) { const c = m.ball.holder; if (!c) return; const d = Math.hypot(c.x - a.x, c.y - a.y); if (d < 8 * YD) { I.mx = (c.x - a.x) / d; I.my = (c.y - a.y) / d; if (d < 1.9 * YD && !a.action) I.press |= B1; } }
function dIdle(m, a, I) { I.mx = 0; I.my = 0; }
function steer(a, x, y) { const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy) || 1; a.intent.mx = dx / d; a.intent.my = dy / d; }
function human0(m, slot) { const a = m.bySlot[0][slot]; for (const o of m.all) if (o.ctl === 0) o.ctl = null; if (a) a.ctl = 0; }
function keepDef(m, slots) { m.on = m.on.filter(a => a.side === 0 || slots.includes(a.slot)); m.unit[1] = m.on.filter(a => a.side === 1); m.bySlot[1] = Object.fromEntries(m.unit[1].map(a => [a.slot, a])); }
/** after each rep: the drill's side has the ball again at its spot */
function resetDrive(m, side, los) { if (m.phase === 'PLAYCALL' && (m.poss !== side || m.callKind !== 'scrimmage' || Math.abs(m.los - m.xAt(side, los)) > 1)) { m.poss = side; m.los = m.xAt(side, los); m.down = 1; m.toGo = 20; m.lineToGain = m.los + m.dir(side) * 20 * YD; m.ballY = F.MID_Y; m.callKind = 'scrimmage'; m.patPending = false; } }

/* ---- the scene ---- */
FF.drillRestart = () => startDrill(DR.id);
function startDrill(id) {
  DR.id = id; DR.d = FF.data.drillById[id]; DR.result = null; DR.resultT = 0; DR.t = 0; DR.card = 2.2;
  L[id].setup(); FF.cam.reset(DR.mv.m.los, DR.mv.m.ballY);
  if (!DR.botOn) FF.talk.say('chet', '', 0); FF.talk.cur = null;
  if (DR.card > 0 && !FF.fast) { FF.voice.say(DR.d.coach, 'bluster'); }
}
const ORDER = FF.data.drills.map(d => d.id);
FF.scenes.drill = {
  pausable: true, view: FF.views.broadcast.id, input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { DR.data = d || {}; DR.tryouts = !!DR.data.tryouts; DR.fails = 0; DR.botOn = !!DR.data.bot; DR.skipped = DR.skipped || {}; startDrill(DR.data.id || 'cones'); FF.audioFx.music('DUST_DEVIL'); },
  exit() { if (DR.mv) DR.mv.dispose(); DR.mv = null; bus.clearMods('drill'); for (const f of DR.offs) f(); DR.offs = []; },
  update(dt) {
    const mv = DR.mv; if (!mv) return;
    const rdt = game.timeScale > 0 ? dt / game.timeScale : 1 / 120;
    DR.t += rdt;
    if (DR.card > 0) { DR.card -= rdt; if (game.players.some(p => p.pressed('b1') || p.pressed('confirm')) && DR.card < 1.8) DR.card = 0; mv.update(dt, rdt, { frozen: true }); return; }
    if (DR.result) {
      DR.resultT += rdt; mv.update(dt, rdt, { frozen: DR.result === 'ok' ? false : true, noControl: true });
      if (DR.resultT > (DR.result === 'ok' ? 2 : .9)) { if (DR.result === 'ok') nextDrill(); else { DR.fails++; startDrill(DR.id); } }
      return;
    }
    // ○ restarts; after 2 failures □ skips
    if (game.input.pressed('b2') && DR.mv.m.phase !== 'LIVE' && !DR.botOn && DR.id !== 'defense') { DR.fails++; startDrill(DR.id); return; }
    if (DR.fails >= 2 && game.input.pressed('b3') && DR.mv.m.phase !== 'LIVE' && DR.mv.m.phase !== 'PLAYCALL') { DR.skipped[DR.id] = true; nextDrill(); return; }
    const lg = L[DR.id];
    mv.update(dt, rdt, { beforeStep: () => { if (DR.botOn) lg.bot(); } });
    const res = lg.update(rdt);
    if (res) { DR.result = res; DR.resultT = 0; if (res === 'ok') { game.audio.sfx('menuSelect'); FF.audioFx.sting('fg'); const best = E.store.get('ff:drills', {}) || {}; if (!best[DR.id] || DR.t < best[DR.id]) { best[DR.id] = Math.round(DR.t * 10) / 10; E.store.set('ff:drills', best); } } else game.audio.sfx('menuBack'); }
  },
  draw(r) {
    const mv = DR.mv; if (!mv) return;
    mv.draw(r);
    if (L[DR.id].draw) L[DR.id].draw(r);
    r.overlay(g => {
      FF.hud.overlay(g, r, mv.m, mv);
      const d = DR.d;
      const dx = Math.round(r.W / 2 - 90); ui.panel(g, dx, 8, 180, 30, { alpha: .9 }); ui.T(g, 'DRILL ' + d.n + ': ' + d.title, dx + 6, 12, '#ffd84a'); ui.T(g, L[DR.id].progress(), dx + 6, 24, '#f4f0e6', { font: 'tiny' });
      if (DR.fails >= 2 && !DR.result) ui.prompts(g, [['b3', 'SKIP DRILL'], ['b2', 'RESTART']], r.W / 2, 50, { align: 'center' });
      if (DR.card > 0) {
        const w = Math.min(r.W - 40, 330), x = Math.round(r.W / 2 - w / 2), y = 40;
        ui.panel(g, x, y, w, 26 + d.steps.length * 18 + 30, { alpha: .95 });
        E.font.title(g, d.title, r.W / 2, y + 6, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' });
        d.steps.forEach((s, k) => { let cx = x + 12; for (const c of s.chips) cx += ui.chips(g, cx, y + 36 + k * 18, c, game.input, 1) + 4; ui.T(g, s.text, cx + 4, y + 33 + k * 18, '#f4f0e6'); });
        FF.speakerRig('bluster').drawPortrait(g, x + w - 34, y + 4, 28, { zoom: 3, bg: '#3a1c1c' });
        ui.T(g, '"' + d.coach + '"', r.W / 2, y + 30 + d.steps.length * 18 + 4, '#ffb02e', { align: 'center', font: 'tiny', wrap: w - 20 });
      }
      if (DR.result) E.font.title(g, DR.result === 'ok' ? 'NICE!' : 'AGAIN!', r.W / 2, r.H * .3, { scale: 4, colors: DR.result === 'ok' ? ['#ffffff', '#a0ffb0', '#3ac85a'] : ['#ffe0e0', '#ff8a7a', '#c8302a'], align: 'center', outline: '#000', depth: 2 });
    });
  }
};
function nextDrill() {
  if (DR.tryouts) {
    const k = ORDER.indexOf(DR.id);
    if (k < ORDER.length - 1) { const nx = ORDER[k + 1]; DR.fails = 0; startDrill(nx); FF.talk.say('chet', '', 0); return; }
    const ch = FF.data.story.chapters[0], clean = !Object.keys(DR.skipped).length;
    FF.story.complete(ch, clean ? 3 : 2); DR.skipped = {};
    game.go('cutscene', { id: ch.win, then: () => game.go('story') });
    return;
  }
  game.go('practice');
}
/* ---- PRACTICE: the nine drills in a grid, best times kept ---- */
const PR = { focus: new ui.Focus({ wrap: false }) };
FF.scenes.practice = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter() { FF.stage().enter(); FF.audioFx.music('LOCKER'); },
  update(dt) { FF.stage().update(dt); if (game.shell.screen) return; if (game.players.some(p => p.pressed('cancel') || p.pressed('b2')) || ui.backClicked(PR.back)) { game.go('menu'); return; } const cw = Math.floor((game.W - 36) / 3); PR.focus.set(FF.data.drills.map((d, k) => ({ x: 12 + (k % 3) * (cw + 6), y: 36 + Math.floor(k / 3) * 58, w: cw, h: 52, id: d.id }))); const it = PR.focus.update(); if (it) game.go('drill', { id: it.id }); },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
      E.font.title(g, 'PRACTICE', r.W / 2, 6, { scale: 3, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], align: 'center', outline: '#000', depth: 1 });
      const best = E.store.get('ff:drills', {}) || {}, items = [], cw = Math.floor((r.W - 36) / 3), ch = 52;
      FF.data.drills.forEach((d, k) => { const x = 12 + (k % 3) * (cw + 6), y = 36 + Math.floor(k / 3) * (ch + 6), f = PR.focus.i === k; items.push({ x, y, w: cw, h: ch, id: d.id });
        E.ui.box(g, x, y, cw, ch, { bg: f ? ['#3a2a5a', '#1c1430'] : ['#22223e', '#141428'], border: f ? '#ffb02e' : '#4a4868', alpha: .95 });
        ui.T(g, d.n + '. ' + d.title, x + 6, y + 5, f ? '#fff4d8' : '#e8e4f0'); ui.T(g, d.teaches, x + 6, y + 18, '#a9a6c0', { font: 'tiny' }); ui.T(g, best[d.id] ? 'BEST ' + best[d.id].toFixed(1) + ' S' : 'NOT DONE', x + 6, y + 38, best[d.id] ? '#ffd84a' : '#6a6878', { font: 'tiny' }); });
      PR.focus.set(items); PR.back = ui.backButton(g, r);
      ui.prompts(g, [['b1', 'PLAY'], ['b2', 'BACK']], r.W - 8, r.H - 14, { align: 'right' });
    });
  }
};
})();
