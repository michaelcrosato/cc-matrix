/* ---- THE STORY'S FLOW and its screens: the opening crawl, the briefing card, Pack the Bento, the results scroll with
 * its hanko stamp, the debriefs, the ending and the credits. Big, sparse, one decision per screen ---- */
const Flow = {};
Flow.newStory = char => { const d = Save.fresh(char); d.story = true; Save.data = d; Save.write(); game.go('crawl', { char }, { fade: 'dissolve' }); };
Flow.continue = () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot); const d = Save.get(); if (d.nextMission === 'ending') Flow.ending(d.character); else Flow.briefing(d.nextMission || 'training', d.character, 'story'); };
/** the briefing: its scene, then the objectives card */
Flow.briefing = (mid, char, mode = 'story') => {
  const mis = B.get('mission', mid); if (mode === 'story') { Save.get().nextMission = mid; Save.write(); }
  const card = () => game.go('brief', { mid, char, mode });
  if (mis.briefing && (mode === 'story' || mode === 'missions')) Cutscene.play(mis.briefing, char, card); else card();
};
Flow.bento = (mid, char, mode) => game.go('bento', { mid, char, mode }, { fade: 'dissolve' });
Flow.start = (mid, char, mode, loadout) => { const d = Save.get(); d.lastLoadout[mid] = Bento.copy(loadout); game.go('mission', { mission: mid, char, mode, loadout }, { fade: 'iris', seconds: .5 }); };
/** a mission was won: score it, record it, show the results */
Flow.missionDone = M => {
  const mis = B.get('mission', M.missionId) || { par: M.level.par || 600 }, sc = Score.story(M, mis.par || M.level.par);
  if (M.forceRank) { const rk = B.RANKS.find(q => q[1] === M.forceRank); sc.total = Math.max(rk[0], 0); sc.parts.push(['Dev mode', 0]); }
  const rank = Score.rank(sc.total);
  let unlocks = [];
  if ((M.mode === 'story' || M.mode === 'missions') && mis.title) { unlocks = Save.record(M.missionId, M.char, sc.total, rank[1]); const d = Save.get(); d.playSeconds += M.stats.time; if (M.mode === 'story') d.nextMission = mis.next || 'ending'; Save.write(); }
  if (M.mode === 'workshop') { game.go('results', { M, sc, rank, unlocks: [], mode: 'workshop' }); return; }
  game.go('results', { M, sc, rank, unlocks, mode: M.mode, mid: M.missionId, char: M.char });
};
Flow.after = (d) => {
  const mis = B.get('mission', d.mid);
  if (d.mode === 'story') {
    const dbf = d.mid === 'm1' && !(d.M.pickups.find(p => p.id === 'ledger') || {}).taken ? 'debrief1_noletter' : mis.debrief;
    if (d.mid === 'm3') { Flow.ending(d.char); return; }
    Cutscene.play(dbf, d.char, () => Flow.briefing(mis.next, d.char, 'story'));
  } else game.go('missions', { char: d.char });
};
Flow.ending = char => Cutscene.play('ending', char, () => Cutscene.play('ending2', char, () => game.go('credits', { char })));
B.Flow = Flow;

/* ---- THE CRAWL: white brush text on dark paper, Granny's voice ---- */
const crawlScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.i = 0; this.t = 0; B.Music.play('title'); this.say(); },
  say() { const l = Story.crawl[this.i]; if (l) B.Voice.say(l, 'granny', { vol: .7 }); },
  update(dt) {
    B.pollInput(); this.t += dt;
    if (game.input.pressed('confirm') || game.input.pressed('start') || this.t > 4.2) { this.i++; this.t = 0; if (this.i >= Story.crawl.length) { Cutscene.play('prologue', this.d.char, () => Flow.briefing('training', this.d.char, 'story')); return; } this.say(); }
    if (game.input.down('pause') && game.input.pressed('pause')) Cutscene.play('prologue', this.d.char, () => Flow.briefing('training', this.d.char, 'story'));
  },
  draw(r) {
    paper(r);
    r.overlay(g => {
      Art.moon(g, r.W - 50, 40, 14, '#e8dcc0');
      for (let k = 0; k <= this.i && k < Story.crawl.length; k++) { const a = k === this.i ? clamp(this.t * 1.5, 0, 1) : .55; px.blend(g, a, 'normal', () => E.font.text(g, Story.crawl[k], r.W / 2, Math.round(r.H * .25) + k * 18, '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 })); }
      Glyph.text(g, '{a:confirm} Next    Hold {a:pause} skip', r.W / 2, r.H - 14, '#8a7a6a', { align: 'center' });
    });
  }
});

/* ---- THE BRIEFING CARD: the mission, its chapter, its objectives in two or three lines ---- */
const briefScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.mis = B.get('mission', d.mid); this.t = 0; B.Music.play('shop'); this.menu = new E.Menu(game, ['Pack the bento', 'Back'], { y: 'center', box: false, onPick: i => { if (i === 0) Flow.bento(d.mid, d.char, d.mode); else game.go(d.mode === 'story' ? 'title' : 'missions', { char: d.char }); }, onCancel: () => game.go(d.mode === 'story' ? 'title' : 'missions', { char: d.char }) }); },
  update(dt) { B.pollInput(); this.t += dt; this.menu.update(dt); },
  draw(r) {
    B.BACKDROPS.shop.draw(r); B.paintRoom(r, 'shop');
    const m = this.mis;
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#140c0c'));
      const y = Math.round(r.H * .14);
      E.font.text(g, (m.chapter || '').toUpperCase(), r.W / 2, y, '#e8b04a', { align: 'center', outline: false });
      E.font.title(g, m.title, r.W / 2, y + 12, { align: 'center', scale: 2, colors: ['#ffffff', '#f4ead5', '#e8b04a'], depth: 2 });
      (m.objectivesCard || []).forEach((l, i) => { px.rect(g, r.W / 2 - 90, y + 44 + i * 16, 4, 4, '#d8402a'); E.font.text(g, l, r.W / 2 - 82, y + 42 + i * 16, '#f4ead5', { outline: false, shadow: '#000' }); });
      E.font.text(g, 'Par ' + fmtTime(m.par) + (Save.get().best[this.d.mid] && Save.get().best[this.d.mid][this.d.char] ? '    Best: ' + Save.get().best[this.d.mid][this.d.char].rank : ''), r.W / 2, y + 96, '#b8a890', { align: 'center', outline: false });
    });
    this.menu.y = Math.round(r.H * .66); this.menu.draw(r);
  }
});

/* ---- PACK THE BENTO: a black-lacquer box of two tiers, four compartments each; the tool shelf on the left ---- */
const bentoScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; const save = Save.get(), mis = B.get('mission', d.mid) || {};
    this.shelf = TOOL_ORDER.filter(id => Bento.unlocked(id, save) || (B.Dev && B.Dev.unlockAll));
    this.slots = Bento.copy(save.lastLoadout[d.mid] && save.lastLoadout[d.mid].length === 8 ? save.lastLoadout[d.mid] : Bento.fromHint(mis.loadoutHint, save));
    this.slots = this.slots.map(s => s && this.shelf.includes(s.tool) ? s : null);
    this.focus = { area: 'shelf', i: 0 }; this.sel = this.shelf[0]; this.t = 0; this.rects = [];
    B.Music.play('shop');
  },
  fill(i, tool) { const t = B.get('tool', tool); this.slots[i] = { tool, n: t.stack }; Au.sfx('uiConfirm'); },
  empty(i) { if (this.slots[i]) { this.slots[i] = null; Au.sfx('uiBack'); } },
  restore() { this.slots = Bento.fromHint((B.get('mission', this.d.mid) || {}).loadoutHint, Save.get()); Au.sfx('fusuma'); },
  go() { Flow.start(this.d.mid, this.d.char, this.d.mode, this.slots); },
  update(dt) {
    B.pollInput(); this.t += dt;
    const I = game.input, f = this.focus, mv = (a) => I.repeat(a, .3, .1);
    if (f.area === 'shelf') { if (mv('up')) { f.i = (f.i + this.shelf.length - 1) % this.shelf.length; Au.sfx('uiMove'); } if (mv('down')) { f.i = (f.i + 1) % this.shelf.length; Au.sfx('uiMove'); } if (mv('right')) { f.area = 'box'; f.i = 0; Au.sfx('uiMove'); } this.sel = this.shelf[f.i]; }
    else if (f.area === 'box') { const c = f.i % 4, row = Math.floor(f.i / 4); if (mv('left')) { if (c === 0) { f.area = 'shelf'; f.i = Math.max(0, this.shelf.indexOf(this.sel)); } else f.i--; Au.sfx('uiMove'); } if (mv('right') && c < 3) { f.i++; Au.sfx('uiMove'); } if (mv('up') && row > 0) { f.i -= 4; Au.sfx('uiMove'); } if (mv('down')) { if (row < 1) f.i += 4; else { f.area = 'go'; } Au.sfx('uiMove'); } }
    else if (f.area === 'go') { if (mv('up')) { f.area = 'box'; f.i = 4; Au.sfx('uiMove'); } if (mv('left')) { f.area = 'shelf'; f.i = 0; } }
    // the mouse: hover focuses, click places, right click empties
    const p = I.pointer(), cl = I.clicked();
    if (p && B.mouseMode()) for (const rc of this.rects) if (p[0] >= rc.x && p[0] < rc.x + rc.w && p[1] >= rc.y && p[1] < rc.y + rc.h) { if (rc.area !== f.area || rc.i !== f.i) { f.area = rc.area; f.i = rc.i; if (rc.area === 'shelf') this.sel = this.shelf[rc.i]; } }
    if (cl) for (const rc of this.rects) if (cl[0] >= rc.x && cl[0] < rc.x + rc.w && cl[1] >= rc.y && cl[1] < rc.y + rc.h) { if (rc.area === 'box') this.fill(rc.i, this.sel); else if (rc.area === 'shelf') { this.sel = this.shelf[rc.i]; const e = this.slots.findIndex(s => !s); if (e >= 0) this.fill(e, this.sel); } else if (rc.area === 'go') this.go(); else if (rc.area === 'back') game.go('brief', this.d); return; }
    if (I.pressed('block') && I.held.has('Mouse2') && f.area === 'box') this.empty(f.i);
    if (I.pressed('confirm')) { if (f.area === 'box') this.fill(f.i, this.sel); else if (f.area === 'shelf') { const e = this.slots.findIndex(s => !s); if (e >= 0) this.fill(e, this.sel); else { f.area = 'box'; f.i = 0; } } else this.go(); }
    if (I.pressed('cancel') && !I.held.has('Escape')) { if (f.area === 'box' && this.slots[f.i]) this.empty(f.i); else game.go('brief', this.d); }
    if (I.pressed('cancel') && I.held.has('Escape')) game.go('brief', this.d);
    if (I.pressed('interact')) this.restore();
    if (I.pressed('start') && !I.held.has('Enter') && !I.held.has('NumpadEnter')) this.go();
  },
  draw(r) {
    B.BACKDROPS.shop.draw(r); B.paintRoom(r, 'shop');
    const W = r.W, H = r.H, f = this.focus; this.rects = [];
    r.overlay(g => {
      px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#140c0c'));
      E.font.title(g, 'PACK THE BENTO', W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      // the shelf
      const sx = Math.round(W * .04), sy = 30, rowH = Math.max(14, Math.min(19, Math.floor((H - 70) / this.shelf.length)));
      this.shelf.forEach((id, i) => { const t = B.get('tool', id), y = sy + i * rowH, on = f.area === 'shelf' && f.i === i, sel = this.sel === id;
        this.rects.push({ area: 'shelf', i, x: sx, y, w: Math.round(W * .36), h: rowH - 1 });
        px.rect(g, sx, y, Math.round(W * .36), rowH - 1, on ? '#4a2418' : sel ? '#2e1810' : '#1e1010'); if (on) px.rect(g, sx, y, 2, rowH - 1, '#e8b04a');
        px.sprite(g, Art.icon[t.icon], sx + 4, y + Math.max(0, (rowH - 13) >> 1)); E.font.text(g, t.name, sx + 20, y + 2, on ? '#ffe08a' : '#f4ead5', { outline: false }); if (rowH >= 17) E.font.text(g, '×' + t.stack, sx + Math.round(W * .36) - 4, y + 2, '#b8a890', { align: 'right', outline: false }); });
      const t = B.get('tool', this.sel); if (t) E.font.text(g, t.desc, sx, sy + this.shelf.length * rowH + 4, '#e8dcc0', { outline: false, wrap: Math.round(W * .36) });
      // the box: two tiers side by side, 2 x 2 compartments each (black lacquer, a red rim, gold corners)
      const bx = Math.round(W * .45), by = 34, cs = Math.max(30, Math.min(44, Math.floor((W - bx - 20) / 4.4))), gap = 4;
      for (const tier of [0, 1]) { const tx = bx + tier * (cs * 2 + gap * 3 + 8); px.rect(g, tx - 4, by - 4, cs * 2 + gap + 8, cs * 2 + gap + 8, '#8a1c1c'); px.rect(g, tx - 2, by - 2, cs * 2 + gap + 4, cs * 2 + gap + 4, '#1e1616'); for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px.rect(g, tx - 4 + cx * (cs * 2 + gap + 5), by - 4 + cy * (cs * 2 + gap + 5), 3, 3, '#e8b04a'); E.font.text(g, tier ? 'Steel tier' : 'Food tier', tx + cs + gap / 2, by + cs * 2 + gap + 8, '#b8a890', { align: 'center', outline: false }); }
      for (let i = 0; i < 8; i++) {
        const tier = i % 4 >= 2 ? 1 : 0, c = i % 2, row = Math.floor(i / 4), tx = bx + tier * (cs * 2 + gap * 3 + 8) + c * (cs + gap), ty = by + row * (cs + gap), s = this.slots[i], on = f.area === 'box' && f.i === i;
        this.rects.push({ area: 'box', i, x: tx, y: ty, w: cs, h: cs });
        px.rect(g, tx, ty, cs, cs, on ? '#3a1a14' : '#2a1414'); px.rect(g, tx, ty, cs, 1, '#3a2a2a');
        if (on) { px.rect(g, tx, ty, cs, 2, '#e8b04a'); px.rect(g, tx, ty + cs - 2, cs, 2, '#e8b04a'); px.rect(g, tx, ty, 2, cs, '#e8b04a'); px.rect(g, tx + cs - 2, ty, 2, cs, '#e8b04a'); }
        if (s) { px.sprite(g, Art.icon[B.get('tool', s.tool).icon], tx + (cs - 24) / 2, ty + (cs - 24) / 2 - 3, { scale: 2 }); E.font.text(g, '×' + s.n, tx + cs - 3, ty + cs - 10, '#f4ead5', { align: 'right', shadow: '#000', outline: false }); }
        else E.font.text(g, '--', tx + cs / 2, ty + cs / 2 - 3, '#4a3a3a', { align: 'center', outline: false });
      }
      const gy = by + cs * 2 + gap + 24, on = f.area === 'go', gw = 130;
      this.rects.push({ area: 'go', i: 0, x: Math.round(bx + (cs * 4 + gap * 4 + 8 - gw) / 2), y: gy, w: gw, h: 16 });
      px.rect(g, Math.round(bx + (cs * 4 + gap * 4 + 8 - gw) / 2), gy, gw, 16, on ? '#e8b04a' : '#4a2418'); E.font.text(g, 'Set out into the night', Math.round(bx + (cs * 4 + gap * 4 + 8) / 2), gy + 4, on ? '#1a1418' : '#f4ead5', { align: 'center', outline: false });
      Glyph.text(g, '{a:confirm} Place   {a:cancel} Empty   {a:interact} Suggested   {a:start} Start', W / 2, H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- RESULTS: a scroll unrolls, one line at a time; the score counts up; the hanko slams down; Granny's word ---- */
const resultsScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; this.t = 0; this.stamped = false; this.menu = null; const s = d.M.stats;
    this.lines = [['Time', fmtTime(s.time)], ['Silent Cuts', s.silentCuts], ['Kills', s.kills], ['Times detected', s.detections], ['Civilians harmed', s.civiliansHarmed], ['Optional tasks', s.optionalDone], ['Tools used', s.toolsUsed], ['Retries', s.retries]];
    this.rig = Rigs.make(d.char === 'kaede' ? 'kaede' : 'sojiro'); B.Music.play('results');
  },
  update(dt) {
    B.pollInput(); this.t += dt;
    if ((game.input.pressed('confirm') || game.input.pressed('start')) && this.t < 4.4) this.t = 4.4;
    if (this.t > 4.2 && !this.stamped) { this.stamped = true; Au.sfx('stamp'); game.shake(4); if (this.d.unlocks.length) Au.sfx('stingTool'); }
    if (this.t > 4.6 && !this.menu) {
      const d = this.d, items = d.mode === 'workshop' ? ['Back to the Workshop', 'Play again'] : d.mode === 'story' ? ['Continue', 'Retry'] : ['Missions', 'Retry'];
      this.menu = new E.Menu(game, items, { box: false, onPick: (i, it) => { if (it === 'Continue' || it === 'Missions') Flow.after(d); else if (it === 'Retry') Flow.bento(d.mid, d.char, d.mode); else if (it === 'Back to the Workshop') game.go('workshop', { resume: true }); else if (it === 'Play again') game.go('mission', { M: Mission.restore(d.M, null) }); } });
    }
    if (this.menu && this.t > 4.7) this.menu.update(dt);
    this.rig._post = Rigs.bow(clamp((this.t - 4.4) * 2, 0, 1) * (this.t < 7 ? 1 : 0));
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    paper(r);
    const W = r.W, H = r.H, d = this.d, k = clamp(this.t / .8, 0, 1), sw = Math.min(260, W - 120), sx = Math.round((W - sw) / 2) + 30, sy = 14, sh = Math.round((H - 40) * k);
    r.overlay(g => {
      px.rect(g, sx - 6, sy - 4, sw + 12, 6, '#5a3a20'); px.rect(g, sx, sy, sw, sh, '#e8dcc0'); px.rect(g, sx, sy, 3, sh, '#c8b898'); px.rect(g, sx + sw - 3, sy, 3, sh, '#c8b898'); if (k >= 1) px.rect(g, sx - 6, sy + sh - 2, sw + 12, 6, '#5a3a20');
      const title = d.mode === 'workshop' ? 'Workshop test' : (B.get('mission', d.mid) || {}).title || d.M.level.name;
      if (k > .3) E.font.text(g, title, sx + sw / 2, sy + 8, '#1a1418', { align: 'center', outline: false });
      this.lines.forEach((l, i) => { const at = .9 + i * .3; if (this.t < at) return; const y = sy + 24 + i * 13, a = clamp((this.t - at) * 4, 0, 1); E.font.text(g, l[0], sx + 14, y, '#3a2a20', { outline: false }); E.font.text(g, String(l[1]), sx + sw - 70, y, '#1a1418', { align: 'right', outline: false }); px.rect(g, sx + 12, y + 9, Math.round((sw - 80) * a), 1, '#8a1c1c'); });
      if (this.t > 3.4) { const sc = Math.round(d.sc.total * clamp((this.t - 3.4) / .8, 0, 1)); E.font.text(g, 'Score', sx + 14, sy + 24 + 8 * 13 + 4, '#3a2a20', { outline: false }); E.font.title(g, String(sc), sx + sw - 70, sy + 24 + 8 * 13, { align: 'right', scale: 2, colors: ['#3a2a20', '#1a1418'], depth: 0 }); }
      if (this.stamped) {
        const s = clamp((this.t - 4.2) * 6, 0, 1), sz = Math.round(lerp(40, 22, s)), hx = sx + sw - 34, hy = sy + 40;
        Art.hanko(g, hx, hy, sz, d.rank[2], s); E.font.text(g, d.rank[1], hx, hy + sz + 4, '#8a1c1c', { align: 'center', outline: false });
        E.font.text(g, '"' + Story.results[d.rank[1]] + '"', sx + sw / 2, sy + 24 + 9 * 13 + 10, '#3a2a20', { align: 'center', outline: false, wrap: sw - 20 });
        E.font.text(g, '-- Granny Oshima', sx + sw - 14, sy + 24 + 9 * 13 + 22, '#5a4a3a', { align: 'right', outline: false });
        d.unlocks.forEach((id, i) => { const t = B.get('tool', id), y = sy + sh - 22 - i * 20; px.rect(g, sx + 10, y, sw - 20, 18, '#2a1414'); px.sprite(g, Art.icon[t.icon], sx + 14, y + 3); E.font.text(g, 'New tool: ' + t.name, sx + 30, y + 5, '#ffe08a', { outline: false }); });
      }
    });
    r.actor(-150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    game.focus(-100, 0, 30 + (game.H / 2 - 52) / -game.view.bz);
    if (this.menu) { this.menu.y = r.H - 34; this.menu.draw(r); }
  }
});

/* ---- CREDITS: a roll over the moon; any input speeds it; then the post-credits scene and the title ---- */
const creditsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.y = 0; B.Music.play('ending'); this.lines = B.About.creditLines(); },
  update(dt) { B.pollInput(); const fast = game.input.down('confirm') || game.input.down('start') || game.input.down('attack'); this.y += dt * (fast ? 90 : 22); if (this.y > this.lines.length * 14 + game.H + 20 && !this.out) { this.out = true; Cutscene.play('postcredits', this.d.char, () => game.go('title')); } },
  draw(r) {
    B.BACKDROPS.roof.draw(r);
    r.overlay(g => { this.lines.forEach((l, i) => { const y = Math.round(r.H + i * 14 - this.y); if (y < -10 || y > r.H + 10) return; const head = l.startsWith('# '); E.font.text(g, head ? l.slice(2) : l, r.W / 2, y, head ? '#e8b04a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false }); }); Glyph.text(g, 'Hold {a:confirm} to hurry', r.W - 6, r.H - 12, '#8a7a6a', { align: 'right' }); });
  }
});
B.storyScenes = { crawl: crawlScene, brief: briefScene, bento: bentoScene, results: resultsScene, credits: creditsScene };
