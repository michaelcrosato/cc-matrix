/* THE DRILLS: the tryouts of chapter 1 and the PRACTICE menu. Each drill is a match scenario (units filtered, plays
 * forced) plus a goal checked from the sim's events, an instruction card with chips, Coach Bluster's line, a progress
 * counter, success and retry (a skip after two failures), and a bot that completes it through intents (tests, attract). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, UI = FF.ui, GL = FF.glyph, Y = 16, F = FF.FIELD, bus = FF.bus;
const W = () => game.W, H = () => game.H;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
const call = id => () => ({ play: FF.play(id), flip: false });
const slowCpu = () => { bus.addMod('speed', a => a.team === 1 ? .7 : 1, { kind: 'mul', tag: 'drill' }); bus.addMod('tackle.p', x => x.d && x.d.team === 1 ? -.3 : 0, { tag: 'drill' }); };

const DEFS = {
  cones: { spec: { start: { possession: 0, los: 20, down: 1, toGo: 20 }, unitFilter: { 0: ['QB'], 1: [] }, forceCalls: { 0: call('qb_sneak') } },
    init(d) { const x0 = S.los, dd = S.dir[0]; d.cones = [0, 1, 2, 3, 4].map(i => ({ x: x0 + dd * (8 + i * 9) * Y, y: F.MID_Y + (i % 2 ? 7 : -7) * Y, hit: false })); d.gate = x0 + dd * (8 + 4 * 9 + 15) * Y; d.next = 0; },
    step(d) { const c = S.carrier(); if (!c || S.phase !== 'LIVE') return; const k = d.cones[d.next]; if (k && Math.hypot(c.b.x - k.x, c.b.y - k.y) < 1.8 * Y) { k.hit = true; d.next++; FF.sfx('menuSelect'); }
      d.progress = d.next + '/5 CONES  ' + Math.max(0, 9 - S.play.t).toFixed(1) + 's';
      if (d.next >= 5 && (c.b.x - d.gate) * S.dir[0] > 0) return 'win'; if (S.play.t > 9) return 'fail'; },
    dead() { return 'fail'; },
    bot(d, a) { const c = d.cones[d.next], tx = c ? c.x : d.gate + S.dir[0] * 40, ty = c ? c.y : F.MID_Y, dx = tx - a.b.x, dy = ty - a.b.y, l = Math.hypot(dx, dy) || 1; return { mx: dx / l, my: dy / l, turbo: true, press: S.phase === 'PRESNAP' ? 1 : 0, recv: -1 }; } },
  handoff: { spec: { start: { possession: 0, los: 30, down: 1, toGo: 20 }, unitFilter: { 1: ['DE1', 'NT', 'DE2'] }, forceCalls: { 0: call('hb_dive'), 1: call('cover2') } }, init: slowCpu,
    step(d) { const c = S.carrier(); d.progress = c ? Math.max(0, Math.round((c.b.x - S.play.startLos) * S.dir[0] / Y)) + ' / 10 YD' : ''; },
    dead(d, res) { const yd = res.type === 'td' ? 99 : res.x !== undefined ? (res.x - S.play.startLos) * S.dir[0] / Y : 0; return yd >= 10 ? 'win' : 'fail'; } },
  moves: { spec: { start: { possession: 0, los: 75, down: 1, toGo: 20 }, unitFilter: { 0: ['QB', 'RB', 'C'], 1: ['DE1', 'LB1', 'S'] }, forceCalls: { 0: call('hb_dive'), 1: call('cover2') } }, init: slowCpu,
    step(d) { d.progress = (d.moves || 0) + ' MOVES'; }, on: { evade: d => { d.moves = (d.moves || 0) + 1; }, brokenTackle: d => { d.moves = (d.moves || 0) + 1; } },
    dead(d, res) { return res.type === 'td' ? 'win' : 'fail'; } },
  passing: { spec: { start: { possession: 0, los: 30, down: 1, toGo: 20 }, unitFilter: { 1: ['CB', 'S'] }, forceCalls: { 0: call('slants'), 1: call('man') } }, init: slowCpu, need: 2,
    on: { catch: d => { d.count = (d.count || 0) + 1; } }, step(d) { d.progress = (d.count || 0) + ' / 2 CATCHES'; },
    dead(d) { return (d.count || 0) >= 2 ? 'win' : 'again'; } },
  catching: { spec: { start: { possession: 0, los: 30, down: 1, toGo: 20 }, unitFilter: { 0: ['QB', 'C', 'LG', 'RG', 'WR1'], 1: ['CB'] }, forceCalls: { 0: () => ({ play: Object.assign({}, FF.play('out_up'), { id: 'drill_lob', assign: Object.assign({}, FF.play('out_up').assign, { QB: { drop: [-6, 0], reads: ['WR1'], readT: 1.0, lob: true }, WR1: { route: [[6, -13], [18, -10]] } }) }), flip: false }), 1: call('man') }, control: 'WR1' }, init: slowCpu,
    on: { catch: d => { d.count = (d.count || 0) + 1; } }, step(d) { d.progress = (d.count || 0) + ' / 2 CATCHES  (TRY ' + Math.min(3, (d.tries || 0) + 1) + ' OF 3)'; },
    dead(d) { d.tries = (d.tries || 0) + 1; if ((d.count || 0) >= 2) return 'win'; return d.tries >= 3 ? 'fail' : 'again'; } },
  defense: { spec: { start: { possession: 1, los: 50, down: 1, toGo: 20 }, home: 'fiascos', away: 'scrubs', forceCalls: { 1: () => ({ play: FF.play(FF.r() < .5 ? 'hb_dive' : 'slants'), flip: FF.r() < .5 }) } }, init: slowCpu,
    on: { tackle: (d, e) => { if (e.team === 0) d.count = (d.count || 0) + 1; }, sack: (d, e) => { if (e.team === 0) d.count = (d.count || 0) + 1; }, int: (d, e) => { if (e.team === 0) d.count = (d.count || 0) + 2; } },
    step(d) { d.progress = (d.count || 0) + ' / 2 STOPS'; }, dead(d) { return (d.count || 0) >= 2 ? 'win' : 'again'; } },
  kicking: { spec: { start: { possession: 0, los: 80, down: 4, toGo: 20 }, forceCalls: { 0: call('field_goal') }, unitFilter: { 1: ['DE1', 'NT'] } },
    on: { fg: (d, e) => { d.fg = e.good; } }, step(d) { d.progress = 'MAKE THE 37-YARD FIELD GOAL'; }, dead(d) { return d.fg ? 'win' : 'fail'; } },
  playcall: { spec: { start: { possession: 0, los: 35, down: 1, toGo: 20 }, cards: [['HOT_SAUCE'], []], unitFilter: { 1: ['DE1', 'NT', 'DE2', 'CB', 'S'] } }, init: slowCpu,
    on: { cardUsed: (d, e) => { if (e.card === 'HOT_SAUCE') d.sauce = true; } },
    step(d) { const c = S.calls[0]; if (c && !d.checked) { d.checked = true; d.ok = c.play && c.play.tab === 'PASS' && c.flip && c.card === 'HOT_SAUCE'; } d.progress = d.checked ? (d.ok ? 'RUN IT BLAZING!' : 'PASS PLAY + FLIP + HOT SAUCE') : 'PASS PLAY + FLIP + HOT SAUCE'; },
    dead(d) { return d.ok ? 'win' : 'fail'; } },
  scrimmage: { spec: { start: { possession: 0, los: 30, down: 1, toGo: 20 }, difficulty: 'rookie' },
    step(d) { d.progress = ['1ST', '2ND', '3RD', '4TH'][S.down - 1] + ' DOWN: SCORE A TOUCHDOWN'; },
    dead(d, res) { if (res.type === 'td') return 'win'; if (S.play.turnover || (S.down >= 4 && res.type !== 'td' && (res.type === 'incomplete' || ((res.x - S.play.startLos) * S.dir[0] / Y) < S.toGo))) return 'fail'; return 'continue'; } }
};

const DR = FF.drills = {
  cur: null, bot: false, best: {},
  start(id, o = {}) { const i = FF.data.drills.findIndex(d => d.id === id); DR.cur = { id, i, data: FF.data.drills[i], def: DEFS[id], story: !!o.story, fails: o.fails || 0, state: 'intro', t: 0, d: {} }; game.go('drill', { id }); },
  restart() { const c = DR.cur; if (c) DR.start(c.id, { story: c.story, fails: c.fails }); },
  spec(id) {
    const def = DEFS[id];
    return Object.assign({ mode: 'practice', home: 'fiascos', away: 'scrubs', stadium: 'tumbleweed', qLen: 600, difficulty: 'rookie', noOT: true, cheats: { freezeClock: true }, humans: [{ input: game.input, team: 0, cpu: DR.bot }], seed: 7 + (DR.cur ? DR.cur.fails : 0), noSave: true }, def.spec);
  },
  update(dt) {
    const c = DR.cur; if (!c) return;
    c.t += dt;
    if (c.state === 'intro') { if (c.t > 1.4 && (game.input.pressed('confirm') || game.input.pressed('b1') || DR.bot || c.t > 6)) { c.state = 'play'; c.t = 0; game.input.consumeAll && game.input.consumeAll(); } return true; }
    if (c.state === 'win' || c.state === 'fail') {
      if (c.state === 'fail' && c.fails >= 2 && game.input.pressed('b3')) { c.state = 'win'; c.skipped = true; c.t = 2; }
      if (c.t > (c.state === 'win' ? 2.2 : 1.6)) { if (c.state === 'win') DR.next(); else { c.fails++; DR.restart(); } }
      return c.state === 'win' || c.t < 1.5;
    }
    const r = c.def.step && c.def.step(c.d);
    if (r === 'win' || r === 'fail') DR.result(r);
    if (DR.bot && c.def.bot) { const h = FF.control.humans[0]; if (h && h.a) { h.cpu = false; h.botIntent = c.def.bot(c.d, h.a); } }
    return false;
  },
  result(r) { const c = DR.cur; if (!c || c.state !== 'play') return; c.state = r; c.t = 0; if (r === 'win') { FF.sfx('menuSelect'); FF.music.sting('STING_WIN'); game.particles.glints(S.los, F.MID_Y, 30, 20, '#ffe060', 60); if (!c.story) { const b = FF.store.get('drillBest', {}); b[c.id] = Math.max(b[c.id] || 0, 3 - Math.min(2, c.fails)); FF.store.set('drillBest', b); } } else FF.sfx('menuBack'); },
  next() {
    const c = DR.cur;
    if (c.story) { const st = FF.story.state(); st.drill = c.i + 1; if (st.drill >= FF.data.drills.length) { DR.cur = null; game.go('cutscene', { id: 'ch1_outro', then: () => FF.story.finish(1, c.fails ? 2 : 3) }); } else DR.start(FF.data.drills[st.drill].id, { story: true }); }
    else { DR.cur = null; game.go('practice'); }
  },
  overlay(g) {
    const c = DR.cur; if (!c) return;
    const w = W(), h = H(), d = c.data;
    if (c.state === 'intro') {
      UI.panel(g, w / 2 - 150, h * .16, 300, 96, { alpha: .94, border: '#ffb02e' });
      T(g, 'DRILL ' + (c.i + 1) + ': ' + d.title, w / 2, h * .16 + 6, '#ffb02e', { align: 'center', scale: 2 });
      T(g, d.teach, w / 2, h * .16 + 28, '#f4f0e6', { align: 'center', wrap: 280 });
      GL.row(g, w / 2, h * .16 + 52, d.chips.map(([a, word]) => [a, word]), { align: 'center' });
      const R = FF.cut.rig('bluster'); if (R) R.drawPortrait(g, w / 2 - 146, h * .16 + 64, 28, { zoom: 3, frame: true, bg: '#3a2a1a' });
      T(g, '"' + d.coach + '"', w / 2 - 112, h * .16 + 68, '#ffe890', { wrap: 250, font: 'tiny' });
      GL.bar(g, [['confirm', 'GO!', { mouse: 'L' }]]);
      return;
    }
    UI.panel(g, w / 2 - 110, 4, 220, 22, { alpha: .85, border: '#ffb02e' });
    T(g, d.title + ': ' + (c.d.progress || ''), w / 2, 10, '#ffffff', { align: 'center' });
    if (c.state === 'win') E.font.title(g, c.skipped ? 'SKIPPED' : 'NICE!', w / 2, h * .3, { scale: 4, align: 'center', colors: ['#ffffff', '#c0ffb0', '#3ad04a'] });
    if (c.state === 'fail') { E.font.title(g, 'TRY AGAIN', w / 2, h * .3, { scale: 3, align: 'center', colors: ['#ffffff', '#ffc0b0', '#ff5a3a'] }); if (c.fails >= 2) GL.row(g, w / 2, h * .3 + 40, [['b3', 'SKIP DRILL']], { align: 'center', panel: true }); }
  }
};
// the drill's goal events
bus.on('*', e => { const c = DR.cur; if (!c || c.state !== 'play' || !c.def.on || !c.def.on[e.ev]) return; c.def.on[e.ev](c.d, e); });
bus.on('dead', e => {
  const c = DR.cur; if (!c || c.state !== 'play' || !c.def.dead) return;
  const r = c.def.dead(c.d, e.res);
  if (r === 'win' || r === 'fail') DR.result(r);
});
// a drill's ball carrier runs its bot's intent when the bot plays
const intent = FF.control.intent;
FF.control.intent = a => { const h = FF.control.humans[a.ctl]; if (h && h.botIntent && DR.cur && DR.bot) { const it = h.botIntent; h.botIntent = null; return Object.assign({ held: 0 }, it); } if (h && DR.bot && DR.cur) return FF.ai.intent(a, 1 / 120); return intent(a); };

/* ---- the drill scene: the match scene with the drill's overlay ---- */
const drill = {
  input: FF.KEYS, view: 'broadcast', pausable: true, camera: { zoom: [.7, 1.4] },
  enter() {
    const c = DR.cur; if (!c) { game.go('practice'); return; }
    const spec = DR.spec(c.id);
    FF.match.setup(Object.assign(spec, { after: () => { bus.clearMods('drill'); if (c.def.init) c.def.init(c.d); if (spec.control) { const h = FF.control.humans[0]; h.forceSlot = spec.control; } } }));
    FF.match.overlay = DR.overlay; FF.match.mode = 'practice';
    // a scrimmage keeps going after each play; the others reset to the same spot
    S.afterPlayHook = () => { const cc = DR.cur; if (cc && cc.state === 'play' && cc.id !== 'scrimmage') { S.los = S.xAt(cc.def.spec.start.los, cc.def.spec.start.possession); S.poss = cc.def.spec.start.possession; S.down = 1; S.toGo = 20; S.mode = 'normal'; } };
  },
  exit() { S.afterPlayHook = null; FF.match.overlay = null; },
  update(dt) {
    if (DR.update(dt)) { FF.cam.update(dt); FF.match.presentationOnly && FF.match.presentationOnly(dt); return; }
    FF.match.update(dt);
    const h = FF.control.humans[0]; if (h && h.forceSlot && S.phase === 'PRESNAP') { const a = S.bySlot(0, h.forceSlot); if (a && h.a !== a) FF.control.give(h, a); }
  },
  draw(r) { FF.match.draw(r); r.overlay(g => DR.overlay(g)); const c = DR.cur; if (c && c.d.cones) for (const k of c.d.cones) r.queue(k.x, k.y, 0, g => { const p = r.w(k.x, k.y, 0); px.poly(g, [[p[0] - 4, p[1]], [p[0] + 4, p[1]], [p[0], p[1] - 10]], k.hit ? '#5ae05a' : '#ff7a1a'); px.rect(g, p[0] - 2, p[1] - 5, 4, 1, '#ffffff'); }); if (c && c.d.gate) { const gx = c.d.gate; r.decal(g => { const a = r.w(gx, F.MID_Y - 8 * Y, 0), b = r.w(gx, F.MID_Y + 8 * Y, 0); px.line(g, a[0], a[1], b[0], b[1], '#ffe040', 2); }); } }
};

/* ---- PRACTICE: a grid of the 9 drills ---- */
const practice = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { practice.menu = new UI.Menu({ grid: true, items: () => FF.data.drills.map((d, i) => ({ id: d.id, label: (i + 1) + '. ' + d.title, sub: '★'.repeat(FF.store.get('drillBest', {})[d.id] || 0) || 'NOT DONE YET' })).concat([{ id: 'back', label: 'BACK' }]), layout: (w, h, it) => it.map((x, i) => i < 9 ? { x: w / 2 - 204 + (i % 3) * 136, y: 44 + Math.floor(i / 3) * 44, w: 132, h: 40 } : { x: w / 2 - 60, y: h - 52, w: 120, h: 24 }), onPick: it => it.id === 'back' ? game.go('menu') : (DR.bot = false, DR.start(it.id)), onBack: () => game.go('menu') }); FF.music.play('LOCKER'); },
  update() { practice.menu.update(); FF.idle.reset(); },
  draw(r) { FF.titleStage.draw(r, 1 / 60, { zoom: 1.5 }); r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c')); UI.title(g, 'PRACTICE', W() / 2, 8, 3); practice.menu.draw(g, { style: { scale: 1 } }); GL.bar(g, [['confirm', 'START', { mouse: 'L' }], ['cancel', 'BACK']]); }); }
};
FF.scenes = Object.assign(FF.scenes || {}, { drill, practice });
})();
