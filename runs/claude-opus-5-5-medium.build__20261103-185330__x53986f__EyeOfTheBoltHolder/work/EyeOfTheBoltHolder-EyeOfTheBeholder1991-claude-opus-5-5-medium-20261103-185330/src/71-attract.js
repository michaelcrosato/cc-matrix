/* ATTRACT MODE: after 10 s idle on the title, a loop of vignettes played by the walkthrough bot with cheats (god mode,
 * every spell), each time-boxed; any input returns to the title at once. It never writes saves, settings or dev storage
 * and never touches the player's party. */
B.VIGNETTES = [
  { name: 'The Drains', floor: 'f1', at: [2, 14, 0], seconds: 18, steps: [['grabAt', 2, 13], ['use', 2, 11, 'E'], ['wait', 1], ['go', 2, 8], ['clear'], ['use', 1, 6, 'W'], ['wait', 3]] },
  { name: 'Latchkins', floor: 'f1', at: [2, 4, 0], seconds: 16, steps: [['openDoor', 2, 4, 'N'], ['go', 2, 2], ['clear'], ['use', 5, 2, 'E'], ['wait', 8]] },
  { name: 'Stones and plates', floor: 'f1', at: [12, 6, 1], seconds: 14, hand: 'rock', clear: ['leech'], steps: [['go', 13, 6, 'E'], ['put'], ['wait', 1.5], ['go', 10, 8], ['go', 9, 10], ['wait', 3]] },
  { name: 'Spellcraft', floor: 'f2', at: [7, 1, 1], seconds: 14, steps: [['cast', 'sparkDart'], ['wait', 1.5], ['cast', 'blazingOrb'], ['wait', 1.5], ['cast', 'mend', 0], ['clear'], ['wait', 2]] },
  { name: 'The Party screen', floor: 'f1', at: [5, 13, 2], seconds: 12, ui: true, steps: [['ui', 'party'], ['focus', 'p0'], ['wait', .8], ['focus', 's_main'], ['wait', .8], ['focus', 'p1'], ['wait', .8], ['focus', 'tab1'], ['wait', .8], ['close'], ['ui', 'map'], ['wait', 2.5], ['close'], ['wait', 1]] },
  { name: 'Clockwork', floor: 'f2', at: [10, 6, 1], seconds: 14, open: ['M1'], steps: [['cast', 'forkedLightning'], ['wait', 1], ['clear'], ['wait', 2]] },
  { name: 'The Gauntlet', floor: 'f3', at: [6, 8, 1], seconds: 14, steps: [['go', 9, 8], ['go', 9, 7], ['wait', 1.5], ['go', 13, 8], ['go', 13, 7], ['wait', 1.5], ['go', 17, 8], ['clear'], ['wait', 2]] },
  { name: 'The Bolt-Holder', floor: 'f4', at: [6, 5, 0], seconds: 22, boss: true, steps: [['boss']] },
  { name: 'Title', title: true, seconds: 5 }
];
B.Attract = {
  i: 0, t: 0, v: null, stallT: 0, lastI: -1, saved: null,
  enter(d) {
    this.i = 0; this.t = 0; this.last = {}; this.savedCheats = Object.assign({}, B.CHEATS); this.savedT = Object.assign({}, B.T); this.savedS = B.S;
    this.from = d && d.from; this.since = 0; this.begin();
  },
  exit() { Object.assign(B.CHEATS, this.savedCheats); Object.assign(B.T, this.savedT); B.Bot.stop(); B.Play.screen = null; B.UI.screen = null; B.S = this.from === 'dev' ? this.savedS : null; B.game.timeScale = 1; },
  begin() {
    const v = this.v = B.VIGNETTES[this.i % B.VIGNETTES.length]; this.t = 0; this.stallT = 0; this.lastI = -1;
    if (v.title) { B.Music.play('title'); if (B.stage) B.stage.show('B'); return; }
    Object.assign(B.CHEATS, { god: true, infiniteSpells: true, noHunger: true, noclip: false, oneHit: false, freeze: false, noCooldowns: false, reveal: false, secrets: false });
    B.resetTune();
    B.newState(1000 + this.i, B.PREMADE, { mode: 'attract', floor: v.floor });
    const S = B.S; for (const id of ['tamsin', 'durgan']) B.joinNpc(id);
    for (const m of S.party.members) { while (m.lvl < 5) { m.xp = B.XP_LEVELS[m.lvl]; B.levelUp(m); } m.hp = m.max; if (m.cls === 'M') m.book = Object.keys(B.SPELLS).filter(s => B.SPELLS[s].arcane); }
    S.party.members[0].slots.main = B.item('wardensBlade');
    S.floor = v.floor; S.party.cx = v.at[0]; S.party.cy = v.at[1]; S.party.dir = v.at[2]; S.floors[v.floor].visited = 1;
    for (const id of v.open || []) { const d = S.floors[v.floor].doors[id]; d.locked = false; d.want = d.open = 1; }
    if (v.floor === 'f4') { const FS = S.floors.f4; FS.doors.G10.want = FS.doors.G10.open = 1; FS.mons = FS.mons.filter(m => m.type === 'boltholder'); }
    if (v.clear) S.floors[v.floor].mons = S.floors[v.floor].mons.filter(m => !v.clear.includes(m.type));
    if (v.hand) S.party.hand = B.item(v.hand);
    B.buildRuntime(); B.look(); B.drain(); S.log = [];
    B.Play.enter({ resume: true }); B.Music.play(v.boss ? 'boss' : B.F().music);
    if (v.boss) { B.bossWake(); B.S.talk = null; B.drain(); }
    if (!v.ui) B.Bot.start({ plan: v.steps.slice(), floorOnly: false });
    else B.Bot.stop();
    this.uiSteps = v.ui ? v.steps.slice() : null; this.uiI = 0; this.uiT = 0;
    // fill every spell slot for the casters
    for (const m of S.party.members) { const known = B.knownSpells(m); for (let l = 1; l <= 3; l++) { const ks = known.filter(s => B.SPELLS[s].lvl === l); let k = 0; while (ks.length && m.mem.filter(e => B.SPELLS[e.s].lvl === l).length < B.slotCount(m, l)) B.memAdd(m, ks[k++ % ks.length], true); } }
  },
  next() { this.i++; this.begin(); },
  update(dt) {
    const G = B.game, I = G.input; B.UI.t = G.real;
    this.since += dt; if (B.anyInput(G, this.last) && this.since > .3) { I.consumeAll(); I.clear && I.clear(); this.exit(); G.go(this.from === 'dev' ? 'play' : 'title', this.from === 'dev' ? { resume: true } : {}, { fade: .2 }); return; }
    this.t += dt;
    const v = this.v;
    if (this.t > v.seconds) return this.next();
    if (v.title) { if (B.stage) B.stage.update(dt, 'title'); return; }
    // the bot's commands, or the scripted UI walk; a stall of 4 s skips to the next vignette
    try {
      if (this.uiSteps) this.uiStep(dt);
      else if (B.Bot.active) {
        if (B.Bot.i !== this.lastI) { this.lastI = B.Bot.i; this.stallT = 0; } else if (!['wait', 'clear', 'boss'].includes((B.Bot.plan[B.Bot.i] || [])[0])) { this.stallT += dt; if (this.stallT > 4) { this.say('stall'); return this.next(); } }
        B.Play.extraCmds = B.Bot.step(dt);
      }
      B.Play.update(dt);
      if (B.S && B.S.floor !== v.floor) return this.next();
    } catch (e) { this.say(e.message); G.fail && G.fail('attract', e); this.next(); }
  },
  say(m) { if (B.DevMode) B.DevMode.lastEvents.push('attract: ' + this.v.name + ' ' + m); },
  uiStep(dt) {
    this.uiT += dt; const st = this.uiSteps[this.uiI]; if (!st) return;
    const P = B.Play;
    if (st[0] === 'ui') { P.openScreen(st[1], { m: 0 }); this.uiI++; this.uiT = 0; }
    else if (st[0] === 'focus') { if (P.screen) P.screen.focus = st[1]; if (st[1] === 's_main' && P.screen) { B.dispatch({ c: 'inv', m: 0, op: 'take', ref: { slot: 'main' } }); B.dispatch({ c: 'inv', m: 0, op: 'place', ref: { pack: 0 } }); if (B.S.party.hand) B.dispatch({ c: 'inv', m: 0, op: 'place', ref: { slot: 'main' } }); B.drain(); } this.uiI++; this.uiT = 0; }
    else if (st[0] === 'close') { P.closeScreen(); this.uiI++; this.uiT = 0; }
    else if (st[0] === 'wait') { if (this.uiT >= st[1]) { this.uiI++; this.uiT = 0; } }
  },
  draw(r) {
    const v = this.v;
    if (v && v.title) {
      if (B.stage) B.stage.draw(r);
      r.overlay(g => { B.logo(g, r.W, Math.round(r.H * .2)); B.text(g, 'A thousand locks. One eye.', r.W / 2, Math.round(r.H * .2) + 46, '#e8d8a8', { align: 'center' }); this.caption(g, r, B.game); });
      return;
    }
    if (B.S) B.Play.draw(r); else if (B.stage) B.stage.draw(r);
  },
  caption(g, r, G) {
    B.panel(g, 4, 4, 34, 13, { rivets: false, alpha: .9 }); B.text(g, 'DEMO', 9, 7, '#ff8a3a');
    if (this.v && !this.v.title) B.text(g, this.v.name, 42, 7, B.COL.dim);
    if (Math.floor(B.UI.t * 2) % 2) { const dev = B.device(G); B.glyphText(g, G, dev === 'gamepad' ? 'Press {confirm} to play' : 'Press any key', r.W / 2, r.H - 66, '#fff6d8', 'center'); }
  }
};
// the bot's cast step for vignettes
B.Bot._doStep = B.Bot.doStep;
B.Bot.doStep = function (st) {
  if (st[0] === 'cast') { const sp = this.spell([st[1]], st[2]); this.next(); return sp ? [sp] : null; }
  return this._doStep(st);
};
