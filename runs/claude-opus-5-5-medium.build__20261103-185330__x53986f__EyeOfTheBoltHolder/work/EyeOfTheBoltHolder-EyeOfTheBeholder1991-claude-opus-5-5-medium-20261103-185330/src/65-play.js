/* PLAY: the dungeon scene. Each step: the open screen or dialogue takes the input, else the controls make commands;
 * the sim steps; its events go to the 3D view, the sound and the HUD. Overlays are states of this scene, so the view
 * keeps drawing behind them; Party, Cast and the map slow the world by Settings, Time in menus. */
B.Play = {
  queue: [], screen: null, card: null, overT: 0, endT: 0, lastP: {},
  cmd(c) { const r = B.dispatch(c); this.consume(B.drain()); return r; },
  openScreen(name, o = {}) {
    const S = B.S; if (S.over) return;
    if (name === 'camp' && !S.camp) { if (!B.dispatch({ c: 'camp', op: 'open' })) { this.consume(B.drain()); return; } }
    this.screen = Object.assign({ name, focus: null, m: S.party.selected, lvl: 1, tab: 0 }, o); B.UI.screen = this.screen; B.game.audio.sfx('uiConfirm');
    this.consume(B.drain());
  },
  closeScreen() {
    const s = this.screen; this.screen = null; B.UI.screen = null; B.game.timeScale = 1; B.game.audio.sfx('uiBack');
    if (s && s.name === 'camp' && B.S.camp) { if (B.S.camp.rest) B.dispatch({ c: 'camp', op: 'stopRest' }); B.dispatch({ c: 'camp', op: 'close' }); this.consume(B.drain()); }
    if (B.S.party.hand && s && s.name === 'party') { /* the Hand keeps what it carries */ }
  },
  openFromKey(a) {
    if (a === 'party') this.openScreen('party', { m: B.S.party.selected });
    else if (a === 'camp') this.openScreen('camp', {});
    else if (a === 'map') this.openScreen('map', { fid: B.S.floor });
    else if (a === 'journal') this.openScreen('journal', { tab: 0 });
  },
  quickSave() { if (B.game.saves) B.game.saves.save(0); B.msg('Game saved.'); },
  /** the sim's events: sound, the 3D view's effects, the HUD's, the screens they open, the scene they end */
  consume(evs) {
    const G = B.game, A = G.audio, S = B.S;
    for (const e of evs) {
      switch (e.t) {
        case 'sfx': { let pan = e.pan; if (pan === undefined && e.at && B.view && B.view.pose) { const P = S.party, side = B.sideOf(P.cx, P.cy, P.dir, Math.round(e.at[0]), Math.round(e.at[1])); pan = side === 'left' ? -.6 : side === 'right' ? .6 : 0; } A.sfx(e.name, { pan, vol: e.vol }); break; }
        case 'sting': B.Music.sting(e.name); break;
        case 'music': if (e.cue === 'boss') B.Music.play('boss'); else if (e.cue === 'none') B.Music.play(null); else if (e.cue === 'gate') B.Music.sting('wardFound'); break;
        case 'hint': if (G.settings.hints !== false && S.mode === 'campaign') B.UI.hints.push({ id: e.id, t: B.UI.t }); break;
        case 'castMenu': if (S.mode !== 'attract') this.openScreen('cast', { m: e.m, lvl: 1 }); break;
        case 'reader': if (S.mode !== 'attract') this.openScreen('reader', { note: 'note:' + e.note }); break;
        case 'floor': this.card = { fid: e.to, t: 0, how: e.how }; if (B.view) B.view.enter(e.to); B.UI.toast = { text: B.FLOORS[e.to].name, t: B.UI.t }; if (S.mode === 'campaign') { B.Music.play(B.FLOORS[e.to].music); G.saves && G.saves.autosave(); } if (e.how === 'fall') G.shake(8); break;
        case 'over': this.overT = 1.6; break;
        case 'ending': this.endT = .8; break;
        case 'autosave': if (S.mode === 'campaign' && G.saves) G.saves.autosave(); break;
        case 'levelUp': { const m = S.party.members.find(x => x.id === e.m); if (m) m.lvlFlash = S.time; break; }
        case 'camp': if (!e.open && this.screen && this.screen.name === 'camp') { this.screen = null; B.UI.screen = null; } break;
        case 'bark': { const st = B.STORIES[e.id]; if (st) B.Talk.barkPlan = { plan: B.babble.plan(st.lines[0][1], B.VOICES[B.SPEAKERS[st.lines[0][0]].voice]), t: 0, i: 0, v: B.VOICES[B.SPEAKERS[st.lines[0][0]].voice] }; break; }
        case 'raceDone': case 'raceWiped': if (B.Race) B.Race.finished(e); break;
        case 'hurt': if (e.dmg > 0) G.input.rumble(.4, .12); break;
        case 'crit': G.input.rumble(.7, .15); break;
        default: break;
      }
    }
    if (B.view) B.view.pending = (B.view.pending || []).concat(evs);
  },
  enter(d = {}) {
    const G = B.game;
    if (d.state) { B.S = d.state; B.buildRuntime(); B.look(); }
    else if (!d.resume && !B.S) B.newState(1);
    this.screen = null; B.UI.screen = null; this.card = null; this.overT = 0; this.endT = 0; G.timeScale = 1;
    B.UI.hints = []; B.UI.toast = { text: B.F().name, t: B.UI.t };
    if (B.view) B.view.enter(B.S.floor);
    if (B.S.mode === 'campaign') B.Music.play(B.F().music);
    if (d.fresh) { B.msg('The grate above is bolted fast. There is no way back.'); B.hint('move'); }
  },
  /** the Party screen's drag and drop: mouse-down on a slot carries its item, mouse-up on another slot places it */
  dragDrop(G, ws) {
    const I = G.input, s = this.screen, down = I.held.has('Mouse0'), p = I.pointer();
    const at = () => p && ws.find(w => w.kind === 'slot' && p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h);
    if (down && !s.mouseWas) { const w = at(); if (w && !B.S.party.hand) { const m = B.S.party.members[s.m], it = w.ref.slot ? m.slots[w.ref.slot] : m.pack[w.ref.pack]; if (it) { this.cmd({ c: 'inv', m: s.m, op: 'take', ref: w.ref }); s.drag = w.id; s.dragRef = w.ref; s.focus = w.id; } } }
    if (!down && s.mouseWas && s.drag) {
      const w = at();
      if (w && w.id !== s.drag && B.S.party.hand) {
        this.cmd({ c: 'inv', m: s.m, op: 'place', ref: w.ref });
        // a swap: what was there goes back to the slot the drag began in, when it may
        if (B.S.party.hand) { const m = B.S.party.members[s.m], r = s.dragRef, empty = r.slot ? !m.slots[r.slot] : !m.pack[r.pack]; if (empty && !(r.slot && B.canEquip(m, B.S.party.hand, r.slot))) this.cmd({ c: 'inv', m: s.m, op: 'place', ref: r }); }
      }
      s.drag = null; s.skipClick = 2;
    }
    s.mouseWas = down;
  },
  /** the pause key closes an open screen instead of pausing (and Options is ignored while Create is held, in a hub session) */
  get pausable() { return !this.screen && !(B.S && B.S.talk) && !this.card && !(B.Hub && B.Hub.active && B.game.input.held.has('Pad8')); },
  update(dt) {
    const G = B.game, I = G.input, S = B.S; if (!S) return;
    B.UI.t = G.real;
    // a finished game: the over and ending scenes after a beat
    if (this.overT > 0 && (this.overT -= dt) <= 0) { if (S.race) return; G.go('over', {}); return; }
    if (this.endT > 0 && (this.endT -= dt) <= 0) { G.go('ending', {}); return; }
    // the floor card: the name of the floor, any button skips
    if (this.card) { this.card.t += dt; if (this.card.t > 2.2 || (this.card.t > .5 && I.anyPressed())) { this.card = null; I.consumeAll(); } this.sync(0); return; }
    let cmds = [];
    if (S.talk) { B.Talk.update(dt, G, S.mode === 'attract'); }
    else if (this.screen) {
      const scr = B.SCREENS[this.screen.name];
      G.timeScale = scr.menuTime ? (G.settings.menuTime === undefined ? B.T.menuTime : +G.settings.menuTime) : 1;
      if (I.pressed('pause')) { I.consumeAll(); this.closeScreen(); }
      else {
        const ws = scr.layout(B.UI.W, B.UI.H, this.screen);
        if (scr.edge) this.screen.edge = d => scr.edge(this.screen, d);
        if (this.screen.name === 'party') this.dragDrop(G, ws);
        const res = this.screen && B.Focus.update(G, ws, this.screen);
        if (res && res.act !== 'miss') scr.act(res, this.screen, G);
        else if (res && res.act === 'miss' && this.screen && this.screen.name !== 'cast') { /* a click outside: nothing */ }
        if (this.screen && this.screen.name === 'camp' && this.screen.sub === 'rest' && !(S.camp && S.camp.rest)) { /* rest finished: the panel says so */ }
      }
    } else if (S.mode !== 'attract') {
      if (!this.slowFilm) G.timeScale = 1;
      if (I.pressed('party')) this.openFromKey('party');
      else if (I.pressed('camp')) this.openFromKey('camp');
      else if (I.released('map') && !(B.Hub && B.Hub.createOptions)) this.openFromKey('map');
      else if (I.pressed('journal')) this.openFromKey('journal');
      if (!this.screen) {
        cmds = B.Controls.read(G);
        const cl = I.clicked();
        if (cl && B.device(G) === 'mouse') cmds = cmds.concat(B.HUD.click(G, cl, 0));
        if (I.pressed('strike') && B.device(G) === 'mouse') { const p = I.pointer(); if (p && p[1] > B.UI.H - 52) { const c = B.HUD.cards(B.UI.W, B.UI.H).find(c => p[0] >= c.x && p[0] < c.x + c.w); cmds = cmds.filter(x => x.c !== 'strike'); if (c) this.openScreen('party', { m: c.mi }); } }
        const p = I.pointer(); B.UI.hover = B.device(G) === 'mouse' && p && B.view ? B.view.pick(p[0], p[1]) : null;
        B.UI.hoverHelper = null; if (p && B.device(G) === 'mouse') for (const hb of B.HUD.helpers(B.UI.W, B.UI.H, G)) if (p[0] >= hb.x && p[0] < hb.x + hb.w && p[1] >= hb.y && p[1] < hb.y + hb.h) B.UI.hoverHelper = hb.a;
      }
    }
    if (this.extraCmds) { cmds = cmds.concat(this.extraCmds); this.extraCmds = null; }
    if (G.saves) G.saves.canSave = S.mode === 'campaign' && !B.enemiesNear() && !S.over;
    B.update(dt, cmds);
    this.consume(B.drain());
    this.sync(dt);
    if (B.Talk.barkPlan) { const bp = B.Talk.barkPlan; bp.t += dt; while (bp.i < bp.plan.length && bp.plan[bp.i].t <= bp.t) { B.babble.syl(G, bp.plan[bp.i], bp.v); bp.i++; } if (bp.i >= bp.plan.length) B.Talk.barkPlan = null; }
    B.Music.update(dt);
  },
  sync(dt) { if (B.view) { const evs = B.view.pending || []; B.view.pending = []; B.view.sync(dt, evs); } },
  draw(r) {
    const G = B.game; B.UI.W = r.W; B.UI.H = r.H; if (!B.S) return;
    if (B.view) B.view.draw(r);
    r.overlay(g => {
      if (!B.S) return;
      const scrName = this.screen && this.screen.name;
      if (!scrName || scrName === 'cast' || scrName === 'confirm') B.HUD.draw(g, r, G);
      if (this.screen) { const scr = B.SCREENS[this.screen.name]; scr.draw(g, r, G, scr.layout(r.W, r.H, this.screen), this.screen); }
      B.Talk.draw(g, r, G);
      if (this.card) B.drawFloorCard(g, r, this.card);
      if (B.DevMode) B.DevMode.overlay(g, r, G);
      if (B.S.mode === 'attract' && B.Attract) B.Attract.caption(g, r, G);
      if (B.S.race && B.Race) B.Race.drawOver(g, r, G);
    });
  }
};
B.drawFloorCard = (g, r, c) => {
  const W = r.W, H = r.H, t = c.t, a = t < .4 ? t / .4 : t > 1.8 ? Math.max(0, 1 - (t - 1.8) / .4) : 1;
  g.save(); g.globalAlpha = a; px.rect(g, 0, 0, W, H, '#000');
  const [name, line] = B.FLOOR_CARDS[c.fid] || [B.FLOORS[c.fid].name.toUpperCase(), ''];
  E.font.title(g, name, W / 2, H / 2 - 24, { align: 'center', scale: 2, colors: B.TITLE_COLORS, depthColor: '#2a1a08' });
  B.text(g, line, W / 2, H / 2 + 6, '#c8b890', { align: 'center' });
  g.restore();
};
