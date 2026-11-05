/* STORY MODE: THE FIASCO CUP. The bracket board (chapter cards, the Fiasco Card collection and the loadout), the cutscene
 * player (sets: the field, a locker room, a press room; live portraits; Animalese voices typed letter by letter through
 * engine change E5; stage directions; choices), chapters (drills, matches from scenarios, halftime adjustments, stars,
 * rewards, loss and retry), saves through game.saves, and the ending's credits. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, UI = FF.ui, GL = FF.glyph, Y = 16, F = FF.FIELD;
const W = () => game.W, H = () => game.H, D = FF.data.story;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));

/* ---------------- STATE AND SAVES ---------------- */
const fresh = () => ({ done: {}, stars: {}, collection: ['BRICK_WALL', 'BUTTERFINGERS'], loadout: ['BRICK_WALL'], next: 0, playTime: 0, started: 0, diffShift: {}, drill: 0 });
let ST = fresh();
const SY = FF.story = {
  state: () => ST,
  newGame() { ST = fresh(); ST.started = game.time; },
  save() { if (FF.noSave) return; try { game.saves.autosave(); } catch (e) { game.fail('save', e); } },
  load() { const s = game.saves.latest && game.saves.latest(); if (s) { game.saves.load(s.slot); return true; } return false; },
  unlocked: n => n === 0 || !!ST.done[n - 1] || FF.store.get('unlockAll', false),
  /** play chapter n from its intro */
  play(n) {
    const ch = D.chapters[n]; ST.cur = n;
    if (ch.kind === 'drills') ST.drill = 0;
    game.go('cutscene', { id: ch.intro, then: () => SY.afterIntro(n) });
  },
  afterIntro(n) {
    const ch = D.chapters[n];
    if (ch.kind === 'cutscene') { SY.finish(n, 1); return; }
    if (ch.kind === 'drills') { FF.drills.start(FF.data.drills[ST.drill].id, { story: true }); return; }
    SY.match(n);
  },
  match(n, easier) {
    const ch = D.chapters[n], sc = ch.scenario, shift = (ST.diffShift[n] || 0) + (easier ? -1 : 0) + ({ rookie: -1, pro: 0, fiasco: 1 }[game.settings.difficulty] || 0);
    const L = ['rookie', 'pro', 'fiasco'], base = L.indexOf(sc.difficulty), diff = L[Math.max(0, Math.min(2, base + shift))];
    if (easier) ST.diffShift[n] = (ST.diffShift[n] || 0) - 1;
    const human = sc.home === 'fiascos' ? 0 : 1;
    const cards = [[], []]; cards[human] = ST.loadout.slice(0, 3); cards[1 - human] = ch.n >= 4 ? ['MEGA_HIT'] : [];
    const pool = [null, null]; pool[human] = ST.collection.slice();
    game.go('match', Object.assign({}, sc, FF.testStory ? { qLen: FF.testStory.qLen, clock: sc.clock ? Math.min(sc.clock, FF.testStory.qLen) : undefined, cheats: Object.assign({ team: human }, FF.testStory.cheats) } : {}, { mode: 'story', stadium: ch.stadium, humans: [{ input: game.input, team: human }], difficulty: diff, cards, cardPool: pool, noOT: false, chapter: n, seed: 100 + n * 17 + (ST.tries || 0),
      after: () => { if (ch.half) FF.sim.halftimeHook = () => SY.halftime(n); else FF.sim.halftimeHook = null; if (sc.lightsAt) FF.match.onLights = () => FF.cut.radio(D.cutscenes.ch3_lights.lines); },
      onEnd: r => SY.matchDone(r) }));
    ST.tries = (ST.tries || 0) + 1;
  },
  halftime(n) {
    const ch = D.chapters[n], S = FF.sim, human = FF.control.humans[0].team, sc = S.score[human] + '-' + S.score[1 - human];
    FF.match.overlay = g => FF.cut.draw(g);
    FF.cut.play(D.cutscenes[ch.half].lines, { vars: { score: sc }, onChoice: id => FF.ots.adjust(human, id), onDone: () => { FF.match.overlay = null; FF.sim.secondHalf(); } });
  },
  matchDone(r) {
    const n = ST.cur, ch = D.chapters[n]; if (!ch || ch.kind !== 'match') return;
    const human = FF.control.humans[0] ? FF.control.humans[0].team : 1, S = FF.sim;
    if (r.winner === human) {
      const facts = { forced: S.stats.team[human].fumblesForced, margin: r.score[human] - r.score[1 - human], oppScore: r.score[1 - human], scoredWithTime: SY.lastScoreClock || 0 };
      const stars = 1 + (ch.bonusFn && ch.bonusFn(facts) ? 1 : 0) + (S.stats.team[human].to === 0 ? 1 : 0);
      game.go('cutscene', { id: ch.outro, then: () => SY.finish(n, stars) });
    } else game.go('storyloss', { n });
    return 'handled';
  },
  finish(n, stars) {
    ST.done[n] = true; ST.stars[n] = Math.max(ST.stars[n] || 0, stars); ST.next = Math.min(5, n + 1);
    for (const id of D.chapters[n].rewards) if (FF.card(id) && !ST.collection.includes(id)) ST.collection.push(id);
    ST.playTime = game.saves ? game.saves.played : 0;
    SY.save();
    if (n === 5) { FF.store.set('bigHeadsUnlocked', true); FF.records.setCup(game.saves ? game.saves.played : game.time - ST.started); game.go('credits'); }
    else game.go('story');
  }
};
FF.bus.on('td', e => { if (FF.match.mode === 'story' && FF.control.humans[0] && e.team === FF.control.humans[0].team) SY.lastScoreClock = FF.sim.quarter >= 4 ? FF.sim.clock : 99; });
FF.bus.on('fg', e => { if (FF.match.mode === 'story' && e.good && FF.control.humans[0] && e.team === FF.control.humans[0].team) SY.lastScoreClock = FF.sim.quarter >= 4 ? FF.sim.clock : 99; });
game.saves.write = () => ({ data: { story: ST }, place: 'THE FIASCO CUP', level: 'CHAPTER ' + (ST.next || 0) });
game.saves.read = s => { ST = Object.assign(fresh(), s.data && s.data.story); };

/* ---------------- THE CUTSCENE PLAYER (dialog box, portraits, voices, stage directions, choices) ---------------- */
const CUT = FF.cut = {
  lines: null, i: 0, shown: 0, card: null, choice: null, opts: {}, rigs: {}, holdT: 0, radioQ: null,
  play(lines, o = {}) { CUT.lines = lines; CUT.i = -1; CUT.opts = o; CUT.choice = null; CUT.card = null; CUT.next(); },
  rig(id) { if (!CUT.rigs[id]) CUT.rigs[id] = id === 'chet' || id === 'lou' ? FF.talk.portraits()[id === 'chet' ? 'C' : 'L'] : FF.Rigs.castRig(id); return CUT.rigs[id]; },
  next() {
    CUT.i++; CUT.shown = 0; CUT.card = null;
    if (!CUT.lines || CUT.i >= CUT.lines.length) { const d = CUT.opts.onDone; CUT.lines = null; if (d) d(); return; }
    const ln = CUT.lines[CUT.i];
    if (ln[0] === '@') return CUT.stage(ln[1], ln[2]);
  },
  stage(ev, arg) {
    if (ev === 'title') { CUT.card = { text: arg, t: 0 }; return; }
    if (ev === 'choice') { CUT.choice = new UI.Menu({ items: D.halfChoices.map(c => ({ id: c.id, label: c.label, sub: c.sub })), layout: UI.listLayout(w => w / 2 - 120, h => h * .3, 240, 26, 4), onPick: it => { CUT.choice = null; if (CUT.opts.onChoice) CUT.opts.onChoice(it.id); CUT.next(); } }); return; }
    if (ev === 'reward') { CUT.card = { text: arg === 'BIGHEADS' ? 'UNLOCKED: BIG HEADS' : 'NEW FIASCO CARDS: ' + arg.split(',').map(c => FF.card(c) ? FF.card(c).name : c).join(' & '), t: 0, reward: arg }; FF.sfx('cardFlip'); return; }
    if (ev === 'sfx') { if (arg === 'crickets') FF.sfx('meterTick'); else FF.sfx(arg); }
    if (ev === 'confetti' || ev === 'bucket' || ev === 'cake') { const c = CUT.scene; if (c && c.fx) c.fx(ev, arg); }
    if (ev === 'flash' && game.settings.flashes !== 0) game.flash('#ffffff', .1, .1);
    if (ev === 'spot' || ev === 'enter') { const c = CUT.scene; if (c && c.spot) c.spot(arg); }
    CUT.next();
  },
  /** non-modal radio lines during play (chapter 3's lights out) */
  radio(lines) { CUT.radioQ = lines.slice(); CUT.radioT = 0; },
  update(dt) {
    if (CUT.radioQ && CUT.radioQ.length) { CUT.radioT -= dt; if (CUT.radioT <= 0) { const [who, text] = CUT.radioQ.shift(); if (who === 'chet' || who === 'lou') FF.talk.show(who === 'chet' ? 'C' : 'L', text, 9); else { FF.talk.show('C', (FF.data.cast[who] || {}).name + ': ' + text, 9); FF.voice.say(text, FF.data.cast[who] ? FF.data.cast[who].voice : 'ref'); } CUT.radioT = 3.2; } }
    if (!CUT.lines) return false;
    const I = game.input, adv = I.pressed('confirm') || I.pressed('b1') || (I.clicked && I.clicked() && !CUT.choice);
    if (CUT.choice) { CUT.choice.update(); return true; }
    if (CUT.card) { CUT.card.t += dt; if ((adv && CUT.card.t > .4) || CUT.card.t > 3.5) CUT.next(); return true; }
    const ln = CUT.lines[CUT.i]; if (!ln) return true;
    const text = fill(ln[1], CUT.opts.vars), prev = Math.floor(CUT.shown);
    CUT.shown = Math.min(text.length, CUT.shown + dt * 40);
    const who = ln[0], cast = FF.data.cast[who], voice = cast ? cast.voice : 'ref';
    for (let k = prev; k < Math.floor(CUT.shown); k++) FF.voice.letter(text[k], voice);
    if (adv) { if (CUT.shown < text.length) CUT.shown = text.length; else CUT.next(); }
    return true;
  },
  draw(g) {
    if (!CUT.lines) return;
    const w = W(), h = H();
    if (CUT.card) { px.blend(g, .75, 'normal', () => px.rect(g, 0, h * .38, w, 60, '#05050c')); UI.title(g, CUT.card.text, w / 2, h * .38 + 18, CUT.card.text.length > 30 ? 1 : 2); if (CUT.card.reward && CUT.card.reward !== 'BIGHEADS') CUT.card.reward.split(',').forEach((id, k, arr) => { const c = FF.card(id); if (!c) return; const x = w / 2 - arr.length * 22 + k * 44; E.ui.box(g, x, h * .38 - 34, 40, 30, { bg: ['#5a2a8a', '#2a0a4a'], border: '#ffe060', alpha: 1 }); FF.cardArt(g, c.art, x + 20, h * .38 - 22); }); return; }
    if (CUT.choice) { UI.panel(g, w / 2 - 130, h * .3 - 26, 260, 150, { alpha: .9 }); T(g, 'HALFTIME ADJUSTMENT', w / 2, h * .3 - 20, '#ffb02e', { align: 'center' }); CUT.choice.draw(g, { style: { scale: 1 } }); GL.bar(g, [['confirm', 'CHOOSE', { mouse: 'L' }], ['up', 'MOVE']]); return; }
    const ln = CUT.lines[CUT.i]; if (!ln) return;
    const who = ln[0], cast = FF.data.cast[who] || { name: who.toUpperCase() }, text = fill(ln[1], CUT.opts.vars);
    const bx = 8, bw = w - 16, bh = 58, by = h - bh - 8;
    E.ui.box(g, bx, by, bw, bh, { bg: ['#1a1430', '#0c0a1c'], border: '#ffb02e', alpha: .94 });
    const R = CUT.rig(who); if (R) R.drawPortrait(g, bx + 4, by + 4, 50, { zoom: 3, turn: .55, frame: true, bg: '#2a2050' });
    T(g, cast.name, bx + 60, by + 4, '#ffb02e');
    T(g, text.slice(0, Math.floor(CUT.shown)), bx + 60, by + 16, '#f4f0e6', { wrap: bw - 70, scale: 1 });
    if (CUT.shown >= text.length && Math.floor(game.real * 2) % 2) T(g, '▸', bx + bw - 12, by + bh - 12, '#ffb02e');
    GL.row(g, w - 12, by - 16, [['confirm', 'NEXT', { mouse: 'L' }], ['cancel', 'HOLD TO SKIP']], { align: 'right', panel: true });
  }
};
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v && v[k] !== undefined ? v[k] : m);

/* ---------------- SETS: the field, a locker room, a press room ---------------- */
function roomMap(kind, team) {
  const rows = [], C = 18, R = 10; if (kind === 'office') team = { colors: { primary: '#7a5a3a', secondary: '#5a4028', trim: '#c8a040' } };
  for (let r = 0; r < R; r++) { let s = ''; for (let c = 0; c < C; c++) s += r < 2 ? '1' : c === 0 || c === C - 1 ? '2' : '.'; rows.push(s); }
  const col = team ? team.colors : { primary: '#6a5a4a', secondary: '#3a3030', trim: '#c8b080' };
  return new E.TileMap({ rows, legend: { '.': { floor: kind }, 1: 1, 2: 2 }, types: { 1: { h: 60, side: kind === 'press' ? E.shade(col.primary, -.35) : '#5a5a6a', top: '#3a3a44', face: kind === 'press' ? 'plaster' : 'brick', roof: 'slab', cut: true, cutH: 10 }, 2: { h: 50, side: '#4a4a56', top: '#3a3a44', face: 'brick', cut: true, cutH: 8 } },
    floorTex: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) * 14; if (kind === 'press') { const c = E.hex(col.secondary); return [c[0] * .5 + n, c[1] * .5 + n, c[2] * .5 + n]; } const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2; return tile ? [120 + n, 116 + n, 108 + n] : [100 + n, 96 + n, 92 + n]; } });
}
const cutscene = {
  input: FF.KEYS, view: 'field', camera: { zoom: false }, pausable: false,
  enter(d) {
    const cs = D.cutscenes[d.id]; cutscene.d = d; cutscene.cs = cs; cutscene.t = 0; cutscene.hold = 0; CUT.rigs = {}; CUT.scene = cutscene;
    const team = cs.team ? FF.team(cs.team) : null;
    if (cs.set === 'field') { FF.Stadium.build(cs.stadium, FF.team('fiascos'), FF.team(FF.stadium(cs.stadium).home === 'fiascos' ? 'mudhogs' : FF.stadium(cs.stadium).home), { night: cs.night, density: cs.night ? .1 : undefined }); cutscene.map = FF.Stadium.map; FF.Stadium.applyLights(game, { weather: FF.stadium(cs.stadium).weather }); if (cs.night) game.lights.ambient = .3; }
    else { cutscene.map = roomMap(cs.set, team); game.lights.enabled = true; game.lights.ambient = .55; game.weather = null; }
    game.cam.bounds = v => cutscene.map.bounds(v);
    const cx = cs.set === 'field' ? 1024 : 9 * Y, cy = cs.set === 'field' ? F.MID_Y : 6 * Y;
    cutscene.cx = cx; cutscene.cy = cy;
    cutscene.actors = (cs.cast || []).map((id, i, arr) => ({ id, rig: CUT.rig(id), x: cx + (i - (arr.length - 1) / 2) * 30, y: cy + (i % 2) * 10, facing: Math.PI / 2, pose: 'IDLE', t: 0, hidden: id === 'sterling' && d.id === 'prologue' }));
    cutscene.fxs = [];
    FF.music.play(d.id === 'prologue' ? 'FOREVER' : cs.set === 'locker' ? 'LOCKER' : 'ANTHEM');
    CUT.play(cs.lines, { onDone: () => { const t = cutscene.d.then; if (t) t(); else game.go('story'); } });
  },
  spot(id) { const a = cutscene.actors.find(x => x.id === id); if (a) { a.hidden = false; a.spot = 2; } },
  fx(ev, arg) {
    const P = game.particles, a = cutscene.actors.find(x => x.id === arg) || cutscene.actors[0];
    if (ev === 'confetti') for (let k = 0; k < 6; k++) game.after(k * .3, () => P.bits(cutscene.cx + (Math.random() - .5) * 200, cutscene.cy, 160, 30, ['#e8742a', '#4a2a6a', '#ffd84a', '#ffffff']));
    if (ev === 'bucket' && a) { for (let k = 0; k < 12; k++) game.after(k * .04, () => P.add({ kind: 'bit', x: a.x, y: a.y, z: 50, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 40, vz: -20, g: 300, max: 1, size: 2, color: '#ff9a2a' })); a.pose = 'DEJECTED'; FF.sfx('drop'); }
    if (ev === 'cake' && a) { a.y += 14; a.pose = 'DOWN'; FF.sfx('padsCrunch'); P.bits(a.x, a.y, 10, 20, ['#ffffff', '#ffd0e0', '#f4e0a0']); }
  },
  update(dt) {
    cutscene.t += dt;
    const I = game.input;
    if (I.down('cancel') || I.down('b2')) { cutscene.hold += dt; if (cutscene.hold > 1) { cutscene.hold = 0; // skip to the end, keeping its rewards and choices
      const ls = CUT.lines || []; const ch = ls.find(l => l[0] === '@' && l[1] === 'choice'); if (ch && CUT.opts.onChoice) CUT.opts.onChoice('ground'); CUT.lines = ls.filter(l => l[0] === '@' && l[1] === 'reward'); CUT.i = -1; if (CUT.lines.length) CUT.next(); else { CUT.lines = null; const t = cutscene.d.then; if (t) t(); else game.go('story'); } return; } } else cutscene.hold = 0;
    CUT.update(dt);
    const ln = CUT.lines && CUT.lines[CUT.i];
    for (const a of cutscene.actors) {
      a.t += dt; const speaking = ln && ln[0] === a.id;
      a.pose = a.pose === 'DOWN' || a.pose === 'DEJECTED' ? a.pose : speaking ? 'COACH_YELL' : (cutscene.cs.set === 'field' && cutscene.d.id === 'ch5_win' && a.id !== 'sterling') ? 'CHEER' : 'IDLE';
      FF.Rigs.driveRig(a.rig, { b: { x: a.x, y: a.y, z: 0, vx: 0, vy: 0 }, facing: a.facing, pose: a.pose, poseU: 0, id: a.x | 0 }, dt);
    }
    game.setZoom(1.5); game.focus(cutscene.cx, cutscene.cy, 16);
    FF.Stadium.update(dt);
  },
  draw(r) {
    const cs = cutscene.cs;
    if (cs.set === 'field') FF.Stadium.draw(r); else { r.sky(['#141018', '#1a1420', '#201828']); cutscene.map.drawFloor(r); cutscene.map.queueWalls(r); roomProps(r, cs.set, cs.team ? FF.team(cs.team) : null); }
    const view = E.charView(r.view);
    for (const a of cutscene.actors) { if (a.hidden) continue; r.shadow(a.x, a.y, 6, .35); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, view)); }
    if (cs.night) game.lights.add(cutscene.cx, cutscene.cy - 40, 120, 160, .9 * (Math.sin(game.time * 13) > -.8 ? 1 : .2), { color: '#fff0c0' });
    r.overlay(g => { CUT.draw(g); if (cutscene.hold > 0) { px.rect(g, W() / 2 - 40, 8, 80, 4, '#2a2a3a'); px.rect(g, W() / 2 - 40, 8, 80 * cutscene.hold, 4, '#ffb02e'); } });
  }
};
function roomProps(r, set, team) {
  const c = team ? team.colors : { primary: '#8a6a4a', secondary: '#4a3a2a', trim: '#e0c080' };
  if (set === 'office') {   // Mama Pearl's Pickle Barn: pickle barrels, a desk, the framed 1974 team photo, a lamp
    for (let i = 0; i < 6; i++) r.prop('barrel', (2 + (i % 3) * 1.2) * Y, (3 + Math.floor(i / 3) * 1.2) * Y, 0, { color: '#4a7a2a' });
    r.shape('table', 11 * Y, 6 * Y, 0, { facing: Math.PI / 2 });
    r.queue(9 * Y, 2.05 * Y, 30, g => { const p = r.w(9 * Y, 2.05 * Y, 30); E.ui.box(g, Math.round(p[0]) - 14, Math.round(p[1]) - 10, 28, 18, { bg: ['#5a3a1a', '#3a2410'], border: '#c8a040', alpha: 1 }); for (let k = 0; k < 5; k++) px.rect(g, Math.round(p[0]) - 10 + k * 5, Math.round(p[1]) - 4, 3, 7, '#e8742a'); E.font.text(g, '1974', Math.round(p[0]), Math.round(p[1]) + 4, '#f4e8c8', { font: 'tiny', align: 'center', outline: false }); });
    r.queue(14 * Y, 2.05 * Y, 30, g => { const p = r.w(14 * Y, 2.05 * Y, 30); E.ui.box(g, Math.round(p[0]) - 20, Math.round(p[1]) - 8, 40, 12, { bg: ['#2a5a1a', '#1a3a10'], border: '#f4e8c8', alpha: 1 }); E.font.text(g, 'PICKLES', Math.round(p[0]), Math.round(p[1]) - 5, '#f4e8c8', { font: 'tiny', align: 'center', outline: false }); });
    r.prop('lamp', 12 * Y, 5 * Y, 30, { light: true });
  } else if (set === 'locker') {
    for (let i = 0; i < 9; i++) { const x = (2 + i * 1.6) * Y, y = 2.2 * Y; r.queue(x, y, 0, g => { const p = r.w(x, y, 0), q = r.w(x, y, 30); E.ui.box(g, Math.round(p[0]) - 9, Math.round(q[1]), 18, Math.round(p[1] - q[1]), { bg: [E.shade(c.primary, -.1), E.shade(c.primary, -.45)], border: '#2a2a30', alpha: 1, gradient: true }); for (let k = 0; k < 3; k++) px.rect(g, Math.round(p[0]) - 5, Math.round(q[1]) + 4 + k * 2, 10, 1, '#1a1a20'); }); }
    r.shape('bench', 6 * Y, 7.5 * Y, 0, { facing: 0 }); r.shape('bench', 12 * Y, 7.5 * Y, 0, { facing: 0 });
    r.queue(15 * Y, 3 * Y, 0, g => { const p = r.w(15 * Y, 3 * Y, 0), q = r.w(15 * Y, 3 * Y, 34); px.rect(g, Math.round(p[0]) - 14, Math.round(q[1]), 28, 20, '#1e3a2a'); px.rect(g, Math.round(p[0]) - 15, Math.round(q[1]) - 1, 30, 1, '#8a6a3a'); E.font.text(g, 'X O X', Math.round(p[0]), Math.round(q[1]) + 6, '#f4f0e6', { font: 'tiny', align: 'center', outline: false }); });
    r.prop('lamp', 9 * Y, 2.5 * Y, 40, { light: true });
    r.prop('banner', 4 * Y, 2.1 * Y, 20, { color: c.primary });
  } else if (set === 'press') {
    r.queue(9 * Y, 4 * Y, 0, g => { const p = r.w(9 * Y, 4 * Y, 0); E.ui.box(g, Math.round(p[0]) - 14, Math.round(p[1]) - 22, 28, 22, { bg: ['#3a3a44', '#1a1a20'], border: '#c8a040', alpha: 1 }); px.line(g, p[0] - 4, p[1] - 22, p[0] - 2, p[1] - 30, '#2a2a2a'); px.line(g, p[0] + 4, p[1] - 22, p[0] + 2, p[1] - 30, '#2a2a2a'); });
    for (let i = 0; i < 6; i++) { const x = (2 + i * 2.8) * Y; r.queue(x, 2.05 * Y, 30, g => { const p = r.w(x, 2.05 * Y, 30); FF.hud.logo(g, team || FF.team('fiascos'), Math.round(p[0]) - 6, Math.round(p[1]) - 6, 1); }); }
    r.prop('streetlamp', 3 * Y, 8 * Y, 0, { light: true }); r.prop('streetlamp', 15 * Y, 8 * Y, 0, { light: true });
    if (Math.random() < .04 && game.settings.flashes !== 0) game.flash('#ffffff', .05, .08);
  }
}

/* ---------------- THE STORY BOARD ---------------- */
const story = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() {
    if (!ST.started && !SY.load()) SY.newGame();
    story.menu = new UI.Menu({ grid: true, items: () => story.items(), layout: (w, h, it) => it.map((x, i) => i < 6 ? { x: 10 + i * ((w - 20) / 6), y: 44, w: (w - 20) / 6 - 4, h: 70 } : i < 6 + ST.collection.length ? { x: 10 + (i - 6) * 34, y: 140, w: 30, h: 30 } : { x: w / 2 - 150 + (i - 6 - ST.collection.length) * 102, y: h - 46, w: 98, h: 24 }), onPick: it => it.fn(), onBack: () => game.go('menu') });
    story.menu.i = Math.min(5, ST.next || 0); FF.music.play('ANTHEM');
  },
  items() {
    const it = D.chapters.map(ch => ({ id: 'ch' + ch.n, label: String(ch.n), ch, disabled: !SY.unlocked(ch.n), fn: () => SY.play(ch.n) }));
    for (const id of ST.collection) it.push({ id: 'card:' + id, label: '', card: id, fn: () => { const i = ST.loadout.indexOf(id); if (i >= 0) ST.loadout.splice(i, 1); else if (ST.loadout.length < 3) ST.loadout.push(id); FF.sfx('cardFlip'); } });
    it.push({ id: 'cont', label: 'CONTINUE', fn: () => SY.play(Math.min(5, ST.next || 0)) }, { id: 'new', label: 'NEW GAME', fn: () => { SY.newGame(); story.menu.i = 0; } }, { id: 'back', label: 'BACK', fn: () => game.go('menu') });
    return it;
  },
  update(dt) { story.menu.update(); FF.idle.reset(); void dt; },
  draw(r) {
    r.sky(['#2a1a10', '#3a2414', '#4a2e18']);
    r.overlay(g => {
      // the corkboard
      px.rect(g, 4, 4, W() - 8, H() - 8, '#8a6a3a'); for (let k = 0; k < 400; k++) { const x = (k * 37) % (W() - 10) + 5, y = (k * 53) % (H() - 10) + 5; px.dot(g, x, y, k % 3 ? '#7a5a2a' : '#9a7a4a'); }
      UI.title(g, 'THE FIASCO CUP', W() / 2, 10, 2);
      story.menu.draw(g, { drawItem: (gg, rr, label, focus, o, it) => storyItem(gg, rr, focus, it) });
      const it = story.items()[story.menu.i];
      if (it && it.ch) { const ch = it.ch; T(g, 'CHAPTER ' + ch.n + ': ' + ch.title + (it.disabled ? ' (LOCKED)' : ''), W() / 2, 120, '#ffe890', { align: 'center' }); if (ch.bonus) T(g, 'BONUS STAR: ' + ch.bonus.toUpperCase(), W() / 2, 130, '#f4f0e6', { align: 'center', font: 'tiny' }); }
      if (it && it.card) { const c = FF.card(it.card); T(g, c.name + ': ' + c.text, 10, 176, '#ffe890', { font: 'tiny' }); }
      T(g, 'FIASCO CARDS (LOADOUT ' + ST.loadout.length + '/3)', 10, 130, '#ffffff', { font: 'tiny' });
      GL.bar(g, [['confirm', 'SELECT', { mouse: 'L' }], ['left', 'MOVE'], ['cancel', 'BACK']]);
    });
  }
};
function storyItem(g, r, focus, it) {
  if (it.ch) {
    const ch = it.ch, done = ST.done[ch.n], locked = it.disabled;
    E.ui.box(g, r.x, r.y + (focus ? -2 : 0), r.w, r.h, { bg: locked ? ['#4a4a4a', '#2a2a2a'] : done ? ['#f4ecd0', '#d8cca0'] : ['#f8f0d8', '#e0d4b0'], border: focus ? '#ffb02e' : '#5a4a2a', alpha: 1 });
    px.disc(g, r.x + r.w / 2, r.y + 3, 3, '#d03a2a');
    const op = ch.opponent ? FF.team(ch.opponent) : null; if (op) FF.hud.logo(g, op, r.x + r.w / 2 - 6, r.y + 10, 1); else FF.hud.logo(g, FF.team('fiascos'), r.x + r.w / 2 - 6, r.y + 10, 1);
    T(g, ch.n ? 'CH ' + ch.n : 'PROLOGUE', r.x + r.w / 2, r.y + 26, '#3a2a1a', { align: 'center', font: 'tiny', shadow: false });
    T(g, ch.title, r.x + r.w / 2, r.y + 36, '#5a1a1a', { align: 'center', font: 'tiny', shadow: false, wrap: r.w - 4 });
    for (let k = 0; k < 3; k++) T(g, '★', r.x + r.w / 2 - 10 + k * 8, r.y + r.h - 12, k < (ST.stars[ch.n] || 0) ? '#e0a020' : '#b0a080', { shadow: false });
    if (locked) T(g, 'LOCKED', r.x + r.w / 2, r.y + r.h / 2, '#ffffff', { align: 'center', font: 'tiny' });
  } else if (it.card) {
    const c = FF.card(it.card), on = ST.loadout.includes(it.card);
    E.ui.box(g, r.x, r.y, r.w, r.h, { bg: ['#5a2a8a', '#2a0a4a'], border: focus ? '#ffffff' : on ? '#ffe060' : '#8a6a3a', alpha: 1 });
    FF.cardArt(g, c.art, r.x + r.w / 2, r.y + r.h / 2 - 2); if (on) T(g, '✓', r.x + r.w - 7, r.y + 1, '#ffe060', { font: 'tiny' });
  } else UI.button(g, r, it.label, focus, { scale: 1 });
}

/* ---------------- LOSS: THAT'S A FIASCO! ---------------- */
const storyloss = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter(d) { storyloss.n = d.n; storyloss.menu = new UI.Menu({ items: [{ id: 'r', label: 'RETRY' }, { id: 'e', label: 'RETRY EASIER' }, { id: 's', label: 'STORY MENU' }], layout: UI.listLayout(w => w / 2 - 90, h => h * .5, 180, 26, 4), onPick: it => it.id === 's' ? game.go('story') : SY.match(storyloss.n, it.id === 'e') }); FF.music.sting('STING_LOSE'); },
  update() { storyloss.menu.update(); },
  draw(r) { r.sky(['#1a0a0a', '#2a1010', '#3a1414']); r.overlay(g => { UI.title(g, "THAT'S A FIASCO!", W() / 2, H() * .14, 3, ['#ffffff', '#ffc0b0', '#ff5a3a', '#a01a0a']); const R = CUT.rig('bluster'); if (R) R.drawPortrait(g, W() / 2 - 25, H() * .26, 50, { zoom: 3, frame: true, bg: '#3a1a1a' }); T(g, '"' + (D.loss[storyloss.n] || 'Again!') + '"', W() / 2, H() * .26 + 56, '#ffe890', { align: 'center' }); storyloss.menu.draw(g); GL.bar(g, [['confirm', 'SELECT', { mouse: 'L' }]]); }); }
};

/* ---------------- CREDITS ---------------- */
const credits = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { credits.y = 0; credits.hold = 0; FF.music.play('FOREVER'); FF.titleStage.reset(); },
  update(dt) {
    const I = game.input, fast = I.down('confirm') || I.down('b1');
    credits.y += dt * (fast ? 80 : 20);
    if (I.down('cancel') || I.down('b2')) { credits.hold += dt; if (credits.hold > 1) game.go('menu'); } else credits.hold = 0;
    if (credits.y > credits.len + H()) game.go('menu');
  },
  draw(r) {
    FF.titleStage.draw(r, 1 / 60, { zoom: 1 });
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c'));
      let y = H() - credits.y; const cx = W() / 2;
      UI.title(g, 'FIASCO CUP CHAMPIONS', cx, y, 2); y += 40;
      for (const p of FF.aboutPages()) { if (y > -20 && y < H()) T(g, p.title, cx, y, '#ffb02e', { align: 'center', scale: 2 }); y += 22; for (const [k, v] of p.rows) { for (const ln of [k].concat(E.font.wrap ? E.font.wrap(String(v), W() - 60) : [String(v)])) { if (y > -10 && y < H()) T(g, ln, cx, y, ln === k ? '#ffe890' : '#f4f0e6', { align: 'center' }); y += 10; } y += 4; } y += 16; }
      credits.len = y + credits.y - H();
      GL.bar(g, [['confirm', 'FASTER'], ['cancel', 'HOLD TO SKIP']]);
    });
  }
};
FF.scenes = Object.assign(FF.scenes || {}, { story, cutscene, storyloss, credits });
})();
