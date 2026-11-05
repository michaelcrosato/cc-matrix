// Story mode, THE FIASCO CUP: the bracket board (chapters, stars, the Fiasco Card collection and the loadout), the
// cutscene player (sets built in code, the cast's rigs, dialog with portraits and babble voices, hold to skip), chapter
// flow (intro, game, halftime adjustments, outro or THAT'S A FIASCO!, rewards, stars, autosave), the ending and credits.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, bus = FF.bus, D = () => FF.data.story;
const fresh = () => ({ done: {}, stars: {}, collection: D().startCollection.slice(), loadout: D().startCollection.slice(0, 2), seen: {}, playTime: 0, retryEasier: {}, cupTime: 0 });
let ST = fresh();
const story = FF.story = { active: false, chapter: null, returnToBoard: false };
story.state = () => ST;
story.wire = () => {
  game.saves.write = () => ({ data: { story: ST }, place: 'THE FIASCO CUP', level: story.next() ? story.next().n : 5 });
  game.saves.read = s => { ST = Object.assign(fresh(), s.data && s.data.story); return true; };
};
story.next = () => D().chapters.find(c => !ST.done[c.id]) || null;
story.newGame = () => { ST = fresh(); story.active = true; story.wire(); game.go('cutscene', { id: 'prologue', then: () => story.play('ch1') }); };
story.continue = () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot === undefined ? 'auto' : s.slot); story.active = true; game.go('story'); };
story.save = () => { try { game.saves.autosave(); } catch (e) { game.fail('autosave', e); } };
const DSTEP = ['rookie', 'pro-', 'pro', 'pro+', 'fiasco'];
story.diff = ch => { let i = DSTEP.indexOf(ch.diff); const s = game.settings.difficulty; if (s === 'rookie') i--; if (s === 'fiasco') i++; if (ST.retryEasier[ch.id]) i -= ST.retryEasier[ch.id]; return DSTEP[Math.max(0, Math.min(4, i))]; };
/** play a chapter: its intro, then its game or drills */
story.play = id => {
  const ch = D().chapters.find(c => c.id === id); story.chapter = ch; story.active = true;
  game.go('cutscene', { id: ch.intro, then: () => { if (ch.drills) game.go('drill', { tryouts: true, id: 'cones' }); else story.game(ch); } });
};
story.game = ch => {
  const sc = Object.assign({}, ch.scenario, { mode: 'story', humans: { 0: [], 1: [0] }, difficulty: story.diff(ch), cards: { 1: ST.loadout.slice(0, 3), 0: [] } });
  sc.cardPool = { 1: ST.collection.slice() };
  game.go('match', { spec: sc, story: ch.id,
    onStart: m => { m.cardPool = sc.cardPool; m.patNoTwo = false; },
    onHalftime: ch.halftime ? (m, done) => FF.matchScene && halftimeTalk(m, ch, done) : null,
    resultsButtons: m => [['CONTINUE', () => story.afterGame(ch, m)]] });
};
story.afterGame = (ch, m) => {
  const s = 1, won = m.winner === s;
  if (!won) { game.go('fiasco', { ch, m: { score: m.score.slice() } }); return; }
  let stars = 1;
  const b = ch.bonus; if (b.type === 'margin' && m.score[1] - m.score[0] >= b.value) stars++;
  if (b.type === 'forcedFumbles' && m.roster[1].reduce((n, a) => n + a.stats.ff, 0) >= b.value) stars++;
  if (b.type === 'holdTo' && m.score[0] <= b.value) stars++;
  if (b.type === 'scoreWithTime' && m.lastScoreClock !== undefined && m.lastScoreClock >= b.value) stars++;
  if (m.stats[1].turnovers === 0) stars++;
  story.complete(ch, Math.min(3, stars));
  game.go('cutscene', { id: ch.win, then: () => ch.id === 'ch5' ? game.go('credits', { ending: true }) : game.go('story') });
};
bus.on('td', d => { if (d.m && d.m.mode === 'story' && d.side === 1) d.m.lastScoreClock = d.m.clock; });
bus.on('fg', d => { if (d.m && d.m.mode === 'story' && d.side === 1 && d.good) d.m.lastScoreClock = d.m.clock; });
story.complete = (ch, stars) => {
  ST.done[ch.id] = true; ST.stars[ch.id] = Math.max(ST.stars[ch.id] || 0, stars);
  for (const r of ch.rewards) if (r !== 'TROPHY' && !ST.collection.includes(r)) ST.collection.push(r);
  if (ch.id === 'ch5') { ST.bigHeads = true; E.store.set('ff:bigHeads', true); if (!FF.records.get().fastestCup || ST.playTime < FF.records.get().fastestCup.v) FF.records.put('fastestCup', Math.round(ST.playTime), 'THE FIASCOS', 'fiascos', (a, b) => a < b); }
  story.save();
};
/* the third chapter's LIGHTS OUT: the radio */
bus.on('lightsOut', d => { if (d.m && d.m.mode === 'story' && story.chapter && story.chapter.id === 'ch3') { const L = D().cutscenes.ch3_lights.steps; let t = .2; for (const s of L) { const sp = FF.data.speakers[s[1]]; game.after(t, () => FF.talk.say(s[1] === 'chet' || s[1] === 'lou' ? s[1] : 'chet', s[2], 9, { force: true, name: sp.name, voice: sp.voice, portrait: (g, x, y, z) => speakerRig(s[1]).drawPortrait(g, x, y, z, { zoom: 3, bg: '#1c2040' }) })); t += 2.6; } } });

/* ---- the cast's rigs (portraits and actors) ---- */
const rigs = {};
function speakerRig(who) {
  if (rigs[who]) return rigs[who];
  const sp = FF.data.speakers[who] || {}, T = FF.data.teams;
  let r;
  if (sp.cast) r = FF.Rigs.cast(sp.cast);
  else if (sp.coach) r = FF.Rigs.coach(T[sp.coach]);
  else if (sp.player) { const t = T[sp.player[0]], p = t.bySlot[sp.player[1]]; r = FF.Rigs.athlete(p, t, true); r.o.hat = null; r.hatSave = null; if (p.extra && p.extra.size) r.o.size = Math.min(p.extra.size, 1.5); }
  else if (sp.mascot) r = FF.Rigs.mascot(T[sp.mascot]);
  else r = FF.Rigs.ref();
  if (['pearl', 'hap', 'wheels', 'brock', 'zap', 'lumen'].includes(who)) r.o.face = { eyes: 'big' };
  return (rigs[who] = r);
}
FF.speakerRig = speakerRig;

/* ---- halftime in the locker room (inside the match): the coach's line and the four adjustments ---- */
function halftimeTalk(m, ch, done) {
  const cs = D().cutscenes[ch.halftime], sc = m.score[1] + '-' + m.score[0], lines = cs.steps.filter(s => s[0] === 'say');
  const talk = new E.Dialog(game, { lines: 3, voice: (c) => FF.voice.letter(c, FF.data.speakers[talk._who] ? FF.data.speakers[talk._who].voice : 'bluster') });
  let i = 0;
  const say = () => {
    const s = lines[i], sp = FF.data.speakers[s[1]]; talk._who = s[1];
    const last = i === lines.length - 1;
    talk.say(FF.u.fill(s[2], { score: sc }), { name: sp.name, portrait: speakerRig(s[1]), portraitSize: 44, choices: last ? FF.data.adjustments.map(a => a.label) : null,
      onChoice: k => { applyAdjustment(m, FF.data.adjustments[k].id); FF.fx.say(FF.data.adjustments[k].label, { scale: 2, dur: 1.6 }); done(); },
      onDone: () => { if (!last) { i++; say(); } } });
  };
  say();
  FF.matchScene.halftimeDialog = talk;
}
function applyAdjustment(m, id) {
  const S = 1;
  if (id === 'ground') { bus.addMod('tackle.p', { add: -.05, test: x => x.carrier.side === S, tag: 'half', keep: true }); bus.addMod('shed.t', { mul: 1.1, test: x => x.blocker.side === S, tag: 'half', keep: true }); }
  if (id === 'air') { bus.addMod('catch.p', { add: .06, test: x => x.receiver.side === S, tag: 'half', keep: true }); bus.addMod('aim.err', { mul: .9, test: a => a.side === S, tag: 'half', keep: true }); }
  if (id === 'hit') { bus.addMod('tackle.p', { add: .05, test: x => x.tackler.side === S, tag: 'half', keep: true }); bus.addMod('fumble.p', { add: .05, test: x => x.tackler.side === S, tag: 'half', keep: true }); }
  if (id === 'trick' && m.cards[S].length < 3) { const c = FF.u.pick(ST.collection.length ? ST.collection : FF.data.cardList); m.cards[S].push(c); bus.emit('fiascoBreak', { side: S, card: c, team: m.teams[S], m }); }
}
FF.applyAdjustment = applyAdjustment;

/* ---- the story board: a corkboard of chapter cards, the collection and the loadout ---- */
const SB = { focus: new ui.Focus({ wrap: false }), t: 0 };
FF.scenes.story = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { story.active = true; SB.t = 0; FF.stage().enter(); FF.audioFx.music('ANTHEM'); if (d && d.chapter) { const ch = D().chapters.find(c => c.id === d.chapter); if (ch) { game.after(.1, () => story.play(ch.id)); } } },
  update(dt) {
    SB.t += dt; ST.playTime += dt; FF.stage().update(dt); if (game.shell.screen) return;
    if (game.players.some(p => p.pressed('cancel') || p.pressed('b2'))) { story.active = false; game.go('menu', { fromStory: true }); return; }
    SB.focus.set(boardItems({ W: game.W, H: game.H }));
    const it = SB.focus.update(); if (!it) return;
    if (it.kind === 'ch') { if (it.open) story.play(it.id); else game.audio.sfx('menuBack'); }
    if (it.kind === 'card') { const L = ST.loadout, k = L.indexOf(it.id); if (k >= 0) L.splice(k, 1); else if (L.length < 3) L.push(it.id); else { L.shift(); L.push(it.id); } game.audio.sfx('cardFlip'); }
    if (it.kind === 'go') { const n = story.next(); if (n) story.play(n.id); else game.go('credits', { ending: false }); }
  },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#2a1c10'); for (let y = 0; y < r.H; y += 4) for (let x = (y / 4) % 2 * 3; x < r.W; x += 7) px.dot(g, x, y, '#3a2814');   // cork
      E.font.title(g, 'THE FIASCO CUP', r.W / 2, 4, { scale: 2, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], outline: '#000', align: 'center', depth: 1 });
      const items = [], cw = Math.floor((r.W - 24) / 5) - 4, nx = story.next();
      D().chapters.forEach((c, k) => {
        const x = 12 + k * (cw + 4), y = 26, done = ST.done[c.id], open = done || (nx && nx.id === c.id), fi = SB.focus.item, f = fi && fi.kind === 'ch' && fi.id === c.id;
        E.ui.box(g, x, y, cw, 86, { bg: done ? ['#f4ecd0', '#d8c8a0'] : open ? ['#fff4c0', '#e8d090'] : ['#6a6050', '#4a4234'], border: f ? '#ffb02e' : '#2a1c10', alpha: 1 });
        px.disc(g, x + cw / 2, y + 3, 2, '#c83a2a');
        ui.T(g, String(c.n), x + 5, y + 6, '#2a1c10', { scale: 2, shadow: false });
        const opp = FF.data.teams[c.opponent]; ui.logo(g, opp, x + cw - 18, y + 6, 1);
        E.font.wrap(c.title, cw - 8).forEach((ln, i) => ui.T(g, ln, x + 4, y + 26 + i * 9, '#2a1c10', { shadow: false }));
        ui.T(g, FF.data.stadiums[c.stadium].name, x + 4, y + 50, '#5a4a30', { font: 'tiny', shadow: false });
        ui.T(g, done ? '★'.repeat(ST.stars[c.id]) + '☆'.repeat(3 - ST.stars[c.id]) : open ? 'NEXT UP' : 'LOCKED', x + 4, y + 62, done ? '#c89a1a' : open ? '#c83a2a' : '#2a1c10', { shadow: false });
        E.font.wrap(c.bonus.text, cw - 8, { font: 'tiny' }).slice(0, 2).forEach((ln, i) => ui.T(g, ln, x + 4, y + 72 + i * 7, '#5a4a30', { font: 'tiny', shadow: false }));
        items.push({ x, y, w: cw, h: 86, kind: 'ch', id: c.id, open: !!open });
      });
      ui.T(g, 'FIASCO CARD COLLECTION  (PICK UP TO 3 FOR THE NEXT GAME)', 12, 118, '#ffd84a', { font: 'tiny' });
      FF.data.cardList.forEach((id, k) => {
        const have = ST.collection.includes(id), on = ST.loadout.includes(id), x = 12 + k * 52, y = 128, fi = SB.focus.item, f = fi && fi.kind === 'card' && fi.id === id;
        E.ui.box(g, x, y, 48, 58, { bg: have ? (on ? ['#ffd84a', '#c89a1a'] : ['#5a1a8a', '#2a0a4a']) : ['#3a3428', '#2a241c'], border: f ? '#ffffff' : '#e8c040', alpha: 1 });
        if (have) { FF.cardArt(g, id, x + 8, y + 4, 32); E.font.wrap(FF.data.cards[id].name, 44).forEach((ln, i) => ui.T(g, ln, x + 24, y + 38 + i * 7, on ? '#1a0a00' : '#ffe8a0', { font: 'tiny', align: 'center', shadow: false })); }
        else ui.T(g, '?', x + 24, y + 22, '#6a6050', { align: 'center', scale: 2, shadow: false });
        if (have) items.push({ x, y, w: 48, h: 58, kind: 'card', id });
      });
      const cur = SB.focus.item; if (cur && cur.kind === 'card') ui.T(g, FF.data.cards[cur.id].text, 12, 190, '#f4e8c8');
      const gx = r.W - 150, gy = r.H - 40; ui.button(g, gx, gy, 138, 26, nx ? 'CONTINUE' : 'THE CREDITS', { focus: SB.focus.item && SB.focus.item.kind === 'go', scale: 2 }); items.push({ x: gx, y: gy, w: 138, h: 26, kind: 'go' });
      void items;
      ui.prompts(g, [['b1', 'SELECT'], ['b2', 'MAIN MENU']], 12, r.H - 14, { align: 'left' });
    });
  }
};

function boardItems(r) {
  const items = [], cw = Math.floor((r.W - 24) / 5) - 4, nx = story.next();
  D().chapters.forEach((c, k) => items.push({ x: 12 + k * (cw + 4), y: 26, w: cw, h: 86, kind: 'ch', id: c.id, open: !!(ST.done[c.id] || (nx && nx.id === c.id)) }));
  FF.data.cardList.forEach((id, k) => { if (ST.collection.includes(id)) items.push({ x: 12 + k * 52, y: 128, w: 48, h: 58, kind: 'card', id }); });
  items.push({ x: r.W - 150, y: r.H - 40, w: 138, h: 26, kind: 'go' });
  if (SB.t < .05) SB.focus.i = items.length - 1;
  return items;
}
/* ---- THAT'S A FIASCO! (a lost chapter): retry, retry easier, the story menu ---- */
const FS = { focus: new ui.Focus({ wrap: true }), d: null };
FF.scenes.fiasco = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { FS.d = d; FF.stage().enter(); FF.audioFx.sting('defeat'); FF.voice.say(D().lossLines[d.ch.id] || 'Again!', 'bluster'); },
  update(dt) { FF.stage().update(dt); FS.focus.set([0, 1, 2].map(k => ({ x: Math.round(game.W / 2 - 75), y: 128 + k * 30, w: 150, h: 24, k }))); const it = FS.focus.update(); if (!it) return; const ch = FS.d.ch; if (it.k === 0) story.game(ch); if (it.k === 1) { ST.retryEasier[ch.id] = (ST.retryEasier[ch.id] || 0) + 1; story.game(ch); } if (it.k === 2) game.go('story'); },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#140408'));
      E.font.title(g, 'THAT\'S A FIASCO!', r.W / 2, 22, { scale: 3, colors: ['#ffe0e0', '#ff8a7a', '#c8302a', '#6a1010'], outline: '#000', align: 'center', depth: 2 });
      speakerRig('bluster').drawPortrait(g, Math.round(r.W / 2 - 24), 58, 48, { zoom: 2.4, bg: '#3a1010' });
      ui.T(g, D().lossLines[FS.d.ch.id] || '', r.W / 2, 112, '#f4e8c8', { align: 'center' });
      const items = [], w = 150; ['RETRY', 'RETRY EASIER', 'STORY MENU'].forEach((t, k) => { const x = Math.round(r.W / 2 - w / 2), y = 128 + k * 30; items.push({ x, y, w, h: 24, k }); ui.button(g, x, y, w, 24, t, { focus: FS.focus.i === k, scale: 2 }); });
      FS.focus.set(items);
    });
  }
};

/* ---- the cutscene player ---- */
const CS = { d: null, cs: null, i: 0, actors: {}, talk: null, wait: 0, t: 0, card: null, skipT: 0, set: null, props: [], fx: [] };
function buildSet(cs) {
  if (cs.set === 'field' || !cs.set) {
    const st = new FF.Stadium(cs.stadium || 'tumbleweed', { night: cs.night, full: cs.ceremony });
    st.enter({ weather: cs.stadium === 'frostbite' ? 'snow' : cs.stadium === 'hogwallow' ? 'rain' : 'clear' });
    return { st, crowd: new FF.Crowd(st, [FF.data.teams[FF.data.stadiums[st.id].home], FF.data.teams.fiascos], { full: cs.ceremony || cs.id === 'ch5_win' }), cx: F.MID_X, cy: F.MID_Y + 80, draw(r, t) { this.st.draw(r, t); this.crowd.update(1 / 60, null); this.crowd.draw(r); } };
  }
  // a small room: a floor, a back wall, the props of its kind
  const team = FF.data.teams[cs.team || 'fiascos'], w = 26, h = 14, rows = [];
  for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += y === 0 || x === 0 || x === w - 1 ? '1' : '.'; rows.push(s); }
  const flo = cs.set === 'press' ? ['#2a3a6a', '#24345e'] : cs.set === 'locker' ? ['#5a5a64', '#50505a'] : ['#6a4a2a', '#5a3e22'];
  const map = new E.TileMap({ rows, legend: { 1: 1, '.': { floor: 'floor' } }, types: { 1: { h: 64, cut: true, cutH: 6, face: cs.set === 'office' ? 'plank' : 'plaster', side: cs.set === 'press' ? '#2a2a44' : '#8a8a94', top: '#4a4a54' } },
    floorTex: (x, y) => { const n = E.hash2(x | 0, y | 0) * 10, k = (Math.floor(x / 16) + Math.floor(y / 16)) % 2, c = FF.hex3(flo[k]); return [c[0] + n, c[1] + n, c[2] + n]; } });
  const props = [], P = (id, tx, ty, o = {}) => props.push({ id, x: tx * 16 + 8, y: ty * 16 + 8, o });
  if (cs.set === 'locker') { for (let k = 2; k < w - 2; k += 2) P('locker', k, 1.4); P('teamBench', 13, 6, { params: { len: 160 } }); P('chalkboard', 4, 4); P('cooler', 22, 3); P('banner', 13, 1.2, { prop: true, color: team.colors.primary }); }
  if (cs.set === 'press') { P('podium', 13, 5); P('micStand', 12, 4.5); P('micStand', 14, 4.5); for (let k = 3; k < w - 3; k += 3) P('chair', k, 10); P('tvCamera', 3, 11); P('tvCamera', 22, 11); }
  if (cs.set === 'office') { P('barrel', 3, 3); P('barrel', 4, 4); P('table', 13, 5); P('lamp', 18, 3, { prop: true }); }
  return { map, props, team, cx: 13 * 16, cy: 8 * 16, room: true, draw(r, t) {
    map.drawFloor(r); map.queueWalls(r);
    if (cs.set === 'press') r.queue(13 * 16, 18, 30, g => { for (let k = 0; k < 6; k++) { const [x, y] = r.w(4 * 16 + k * 56, 18, 46); ui.logo(g, k % 2 ? this.team : FF.data.teams.fiascos, Math.round(x) - 6, Math.round(y) - 6, 1); } }, { bias: 1 });
    for (const p of props) { if (p.o.prop) r.prop(p.id, p.x, p.y, p.id === 'banner' ? 40 : 0, { color: p.o.color, light: true }); else r.shape(p.id, p.x, p.y, 0, { facing: Math.PI / 2, params: p.o.params }); }
    game.lights.add(13 * 16, 6 * 16, 60, 260, .9, { color: '#fff0d0' });
    if (cs.flashes && Math.random() < .08) game.flash('#ffffff', .05, .12);
    void t;
  } };
}
FF.scenes.cutscene = {
  view: FF.views.field.id, input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) {
    CS.d = d; CS.cs = D().cutscenes[d.id]; CS.i = 0; CS.t = 0; CS.wait = 0; CS.card = null; CS.skipT = 0; CS.actors = {}; CS.fx = []; CS.extraProps = [];
    if (!CS.cs || !CS.cs.set) { CS.cs = Object.assign({ set: 'field', stadium: 'tumbleweed' }, CS.cs); }
    CS.set = buildSet(CS.cs);
    game.lights.enabled = true; game.lights.ambient = CS.cs.night ? .4 : .62;
    for (const [who, dx, dy] of CS.cs.cast || []) addActor(who, dx, dy);
    if (CS.cs.team && CS.set.st) { const t = FF.data.teams.fiascos; ['C', 'LG', 'RG', 'RB', 'WR2', 'DE1', 'NT', 'LB1', 'S'].forEach((sl, k) => { const p = t.bySlot[sl]; CS.actors['tm' + k] = { rig: FF.Rigs.athlete(p, t, true), x: CS.set.cx - 140 + k * 32, y: CS.set.cy - 70 - (k % 2) * 16, pose: CS.cs.id === 'prologue' ? 'dejected' : 'cheer', facing: Math.PI / 2, dejK: k }; }); }
    CS.talk = new E.Dialog(game, { lines: 3, voice: (c) => FF.voice.letter(c, CS.voice || 'bluster') });
    game.setView(FF.views.field.id); FF.cam.applyZoom(CS.set.room ? 1.4 : 1.2, true); game.cam.bounds = null; game.cam.smooth = .4;
    game.focus(CS.set.cx, CS.set.cy, 0);
    FF.audioFx.music(d.id === 'ch5_win' ? 'ANTHEM' : d.id === 'prologue' ? 'FOREVER' : 'LOCKER');
  },
  exit() { game.weather = null; },
  update(dt) {
    CS.t += dt; if (story.active) ST.playTime += dt;
    for (const k in CS.actors) { const a = CS.actors[k]; if (a.move) { a.move.t += dt; const u = Math.min(1, a.move.t / a.move.d); a.x = E.lerp(a.move.x0, a.move.x1, u); a.y = E.lerp(a.move.y0, a.move.y1, u); if (u >= 1) a.move = null; } FF.Rigs.drive(a.rig, { x: a.x, y: a.y, z: 0, vx: a.move ? 40 : 0, vy: 0, facing: a.facing, pose: a.move ? 'run' : a.pose || 'idle', expr: a.expr, poseT: CS.t, dejK: a.dejK, dance: 0 }, dt); }
    for (const f of CS.fx) f.t += dt; CS.fx = CS.fx.filter(f => f.t < 4);
    // hold ○ or Esc (or the right mouse) for a second to skip
    const held = game.players.some(p => p.down('cancel') || p.down('b2'));
    CS.skipT = held ? CS.skipT + dt : 0;
    if (CS.skipT > 1) { finish(true); return; }
    if (CS.talk.open) { if (CS.talk.update(dt)) return; }
    if (CS.card) { CS.card.t += dt; if (CS.card.t > 2.6 || (CS.card.t > .4 && game.players.some(p => p.pressed('b1') || p.pressed('confirm')))) CS.card = null; else return; }
    if (CS.wait > 0) { CS.wait -= dt; return; }
    if (CS.i >= CS.cs.steps.length) { finish(false); return; }
    runStep(CS.cs.steps[CS.i++]);
  },
  draw(r) {
    CS.set.draw(r, CS.t);
    const view = E.charView(r.view);
    for (const k in CS.actors) { const a = CS.actors[k]; r.shadow(a.x, a.y, 6, .35); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, view)); if (a.spot) game.lights.add(a.x, a.y, 80, 70, 1.2, { color: '#ffffe0' }); }
    for (const p of CS.extraProps) r.shape(p.id, p.x, p.y, 0, { facing: Math.PI });
    for (const f of CS.fx) if (f.kind === 'bucket') { const a = CS.actors.bluster; if (a && f.t < 1.2) for (let k = 0; k < 3; k++) game.particles.bits(a.x, a.y, 40, 2, ['#ff9a2a', '#ffb02e', '#ffd84a']); }
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, 12, '#000'); px.rect(g, 0, r.H - 6, r.W, 6, '#000');
      if (CS.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000')); const L = E.font.wrap(CS.card.text, r.W - 60, { scale: 2 }); L.forEach((ln, i) => E.font.title(g, ln, r.W / 2, r.H / 2 - L.length * 9 + i * 18, { scale: 2, colors: ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' })); }
      CS.talk.draw(r);
      if (CS.skipT > 0) { const k = Math.min(1, CS.skipT); for (let a = 0; a < 24 * k; a++) { const t = a / 24 * Math.PI * 2 - Math.PI / 2; px.dot(g, r.W - 20 + Math.cos(t) * 8, 22 + Math.sin(t) * 8, '#ffd84a'); } ui.T(g, 'SKIP', r.W - 20, 32, '#ffd84a', { align: 'center', font: 'tiny' }); }
      else ui.prompts(g, [['b2', 'HOLD TO SKIP']], r.W - 8, 20, { align: 'right', bg: false });
    });
  }
};
function addActor(who, dx, dy) { const rig = speakerRig(who); CS.actors[who] = { rig, x: CS.set.cx + dx, y: CS.set.cy + dy, facing: Math.PI / 2 + (dx > 0 ? .5 : -.5), pose: 'idle' }; }
function runStep(s) {
  const k = s[0];
  if (k === 'say') {
    const sp = FF.data.speakers[s[1]] || { name: s[1].toUpperCase(), voice: 'ref' }, opt = s[3] || {}, a = CS.actors[s[1]];
    if (a && opt.expr) a.expr = opt.expr; CS.voice = sp.voice;
    for (const kk in CS.actors) if (kk !== s[1] && CS.actors[kk].expr === 'shout') CS.actors[kk].expr = null;
    if (a) game.focus((a.x + CS.set.cx) / 2, a.y, 0);
    CS.talk.say(s[2], { name: sp.name + (sp.radio ? ' (RADIO)' : ''), portrait: speakerRig(s[1]), portraitSize: 44 });
    if (s[1] === 'avalanche') FF.voice.say('GRRR', 'avalanche');
  }
  else if (k === 'card') CS.card = { text: s[1], t: 0 };
  else if (k === 'pose') { const a = CS.actors[s[1]]; if (a) a.pose = s[2]; }
  else if (k === 'move') { const a = CS.actors[s[1]]; if (a) a.move = { x0: a.x, y0: a.y, x1: CS.set.cx + s[2], y1: CS.set.cy + s[3], d: s[4] || 1, t: 0 }; }
  else if (k === 'enter') { addActor(s[1], s[2] + 120, s[3]); const a = CS.actors[s[1]]; a.move = { x0: a.x, y0: a.y, x1: CS.set.cx + s[2], y1: CS.set.cy + s[3], d: 1.2, t: 0 }; CS.wait = .6; }
  else if (k === 'spot') { const a = CS.actors[s[1]]; if (a) { a.spot = true; FF.audioFx.sfx('lightsOn'); } }
  else if (k === 'prop') CS.extraProps.push({ id: s[1], x: CS.set.cx + s[2], y: CS.set.cy + s[3] });
  else if (k === 'sfx') FF.audioFx.sfx(s[1]);
  else if (k === 'wait') CS.wait = s[1];
  else if (k === 'fx') { CS.fx.push({ kind: s[1], t: 0 }); if (s[1] === 'shake') game.shake(5); if (s[1] === 'confetti') { for (let i = 0; i < 6; i++) game.after(i * .3, () => game.particles.bits(CS.set.cx + (Math.random() - .5) * 200, CS.set.cy, 140, 14, ['#e8742a', '#4a2a6a', '#f4e8c8', '#ffd84a'])); FF.audioFx.sfx('cannon'); } if (s[1] === 'cake') { const a = CS.actors.sterling; if (a) { a.move = { x0: a.x, y0: a.y, x1: a.x + 30, y1: a.y - 20, d: .6, t: 0 }; game.after(.6, () => { a.pose = 'down'; game.particles.bits(a.x, a.y, 10, 16, ['#f8e8d8', '#f0a8c8']); }); } } if (s[1] === 'chant') FF.crowdAudio.chant(FF.data.teams.fiascos); if (s[1] === 'bucket') FF.audioFx.sfx('confettiPop'); }
  else if (k === 'reward') { const id = s[1]; CS.card = { text: id === 'TROPHY' ? 'THE FIASCO CUP IS YOURS!' : 'NEW FIASCO CARD: ' + FF.data.cards[id].name, t: 0 }; FF.audioFx.sfx('cardFlip'); }
  else if (k === 'exit') delete CS.actors[s[1]];
}
function finish(skipped) {
  const d = CS.d; ST.seen[d.id] = true; void skipped;
  // rewards still land when a cutscene is skipped
  if (d.then) d.then(); else game.go('story');
}

/* ---- the credits: the anthem as a ballad, the About pages rolling over the field, the crowd chanting ---- */
const CR = { t: 0, speed: 1 };
FF.scenes.credits = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { CR.t = 0; CR.d = d || {}; FF.stage().enter(); FF.audioFx.music('FOREVER'); FF.stage().crowd.E = .9; },
  update(dt) {
    const fast = game.players.some(p => p.down('b1') || p.down('confirm')); CR.t += dt * (fast ? 4 : 1); FF.stage().update(dt); FF.stage().crowd.excite(.8);
    const held = game.players.some(p => p.down('cancel') || p.down('b2')); CR.skip = held ? (CR.skip || 0) + dt : 0;
    if (CR.skip > 1 || CR.t > CR.len + 3) { game.go(story.active ? 'story' : 'menu'); }
  },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
      const lines = [['AMERICAN FOOTBALL FIASCO', 3], ['', 1]].concat(CR.d.ending ? [['TUMBLEWEED FIELD, ONE YEAR LATER', 2], ['ATTENDANCE: SOLD OUT', 2], ['FI - AS - CO!', 2], ['', 1]] : []);
      for (const p of FF.aboutPages()) { lines.push([p.title, 2]); for (const [k, v] of p.lines) { lines.push([k, 1, '#ffb02e']); for (const ln of E.font.wrap(String(v), r.W - 80)) lines.push([ln, 1]); } lines.push(['', 1]); }
      lines.push(['THANKS FOR PLAYING', 3]);
      let y = r.H - CR.t * 28; CR.len = 0;
      for (const [t, s, c] of lines) { if (y > -30 && y < r.H + 20) { if (s >= 2) E.font.title(g, t, r.W / 2, Math.round(y), { scale: s, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], align: 'center', outline: '#000' }); else ui.T(g, t, r.W / 2, Math.round(y), c || '#f4f0e6', { align: 'center' }); } y += s * 9 + 3; CR.len += (s * 9 + 3) / 28; }
      ui.prompts(g, [['b1', 'FASTER'], ['b2', 'HOLD TO SKIP']], r.W - 8, r.H - 14, { align: 'right' });
    });
  }
};
})();
