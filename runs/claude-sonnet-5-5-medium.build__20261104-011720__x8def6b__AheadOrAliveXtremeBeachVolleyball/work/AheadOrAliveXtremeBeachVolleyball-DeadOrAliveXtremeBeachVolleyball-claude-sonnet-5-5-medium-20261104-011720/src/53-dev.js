/* 53-dev: dev mode, opened from the pause menu: tools, live tuning sliders with reset to defaults, and a state view. */
G.devRunning = false;
G.openDev = () => {
  const game = G.game; if (game.paused) game.resume();
  try { if (game.shell && game.shell.hide) game.shell.hide(); } catch (e) { /* none */ }
  if (G.overlay.has('dev')) return;
  G.overlay.push(G.makeDev());
};
G.devTools = () => {
  const game = G.game, s = () => G.state, sc = () => game.scene, m = () => sc() && sc().m;
  const need = () => { if (!G.state) { G.state = G.newState(1234); G.reseedWorld(); G.installSaves(game); } return G.state; };
  return [
    { label: 'Add S$5,000', run: () => { need(); G.earn(5000); G.toast('+S$5,000'); } },
    { label: 'Max friendship with all', run: () => { need(); for (const k in s().aff) s().aff[k] = 100; G.toast('Everyone adores you'); } },
    { label: 'Unlock every suit, hat and gift', run: () => { need(); s().owned.suits = G.SUITS.map(x => x.id); s().owned.hats = G.HATS.map(x => x.id); G.GIFTS.forEach(g => { s().bag[g.id] = 3; }); G.toast('Everything unlocked'); } },
    { label: 'Skip this time slot', run: () => { need(); if (G.state.day <= 5) { G.finishSlot(); G.overlay.pop(G.devOverlay); } } },
    { label: 'Jump to day 5 morning', run: () => { need(); s().day = 5; s().slot = 0; G.game.go('map'); G.overlay.pop(G.devOverlay); } },
    { label: 'Win the current match (score it)', run: () => { const mm = m(); if (mm && mm.phase !== 'end') { mm.score[0] = mm.to - 1; mm.score[1] = Math.min(mm.score[1], mm.to - 3); mm.pointTo(0, 'floor'); } else G.toast('Not in a match'); } },
    { label: 'Lose the current match', run: () => { const mm = m(); if (mm && mm.phase !== 'end') { mm.score[1] = mm.to - 1; mm.score[0] = Math.min(mm.score[0], mm.to - 3); mm.pointTo(1, 'floor'); } else G.toast('Not in a match'); } },
    { label: 'Spectate: all CPU match', run: () => { G.overlay.pop(G.devOverlay); game.go('match', { cfg: { teams: [['mika', 'hana'], ['ruby', 'tomo']], skillBonus: [.2, .2] }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0 }); } },
    { label: 'Quick match vs the House', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('match', { cfg: G.storyMatch('final'), humanTeam: 0 }); } },
    { label: 'Toggle slow motion (0.4x)', run: () => { G.T.timeScale = G.T.timeScale < 1 ? 1 : .4; } },
    { label: 'Toggle debug overlay', run: () => { G.devHud = !G.devHud; } },
    { label: 'Keep world running behind panel: ' + (G.devRunning ? 'on' : 'off'), run: () => { G.devRunning = !G.devRunning; G.toast('World running: ' + G.devRunning); } },
    { label: 'Go to: map', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('map'); } },
    { label: 'Go to: Pool Hop', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('poolhop', { done: () => game.go('map') }); } },
    { label: 'Go to: casino (slots)', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('casino', { game: 'slots', back: 'casino' }); } },
    { label: 'Go to: farewell party / ending', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('ending'); } },
    { label: 'Go to: title', run: () => { G.overlay.pop(G.devOverlay); G.state = null; game.go('title'); } }
  ];
};
G.makeDev = () => {
  const game = G.game;
  const ov = {
    name: 'dev', tab: 0, ti: 0, list: null,
    enter() { G.devOverlay = this; this.tools = new G.Menu(G.devTools().map(t => ({ label: t.label, onPick: () => { t.run(); this.refresh(); } })), { x: 10, y: 34, w: 220, gap: 11, onCancel: () => G.overlay.pop(this) }); this.tools.rows = 11;
      this.sl = new G.SliderList(G.TUNING, k => G.T[k], (k, v) => { G.T[k] = v; G.saveTuning(); }, { x: 10, y: 34, w: 300, rows: 10, gap: 13 }); },
    exit() { G.devRunning = false; G.devOverlay = null; },
    refresh() { this.tools.items.forEach((it, i) => { const t = G.devTools()[i]; it.label = t.label; }); },
    update(dt) {
      const I = game.input;
      if (I.pressed('tab') || I.pressed('tabNext')) { this.tab = (this.tab + 1) % 3; G.sfx('select'); }
      if (this.tab === 0) this.tools.update(dt); else if (this.tab === 1) { this.sl.update(dt); if (I.pressed('confirm') || I.pressed('call')) { G.resetTuning(); G.toast('Balance reset to defaults'); } }
      if (I.pressed('cancel') || I.pressed('pause')) G.overlay.pop(this);
      const c = I.clicked(); if (c && c[1] < 20) this.tab = clamp(Math.floor(c[0] / ((game.W - 62) / 3)), 0, 2);
      return true;
    },
    draw(r) {
      const W = r.W, H = r.H;
      r.overlay(g => {
        px.rect(g, 0, 0, W, H, '#050f16dd'); ['TOOLS', 'BALANCE', 'STATE'].forEach((n, i) => { const w = Math.round((W - 62) / 3); E.ui.box(g, i * w + 1, 1, w - 2, 15, this.tab === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, 'DEV  ' + n, i * w + w / 2, 5, '#fff', { align: 'center' }); });
        if (this.tab === 2) {
          const s = G.state, mm = game.scene && game.scene.m, lines = [];
          lines.push('scene: ' + game.sceneName + '  fps: ' + game.fps + '  errors: ' + game.errors.length);
          if (s) { lines.push('day ' + s.day + ' slot ' + s.slot + '  money ' + s.money + '  partner ' + s.partner); lines.push('aff ' + Object.keys(s.aff).map(k => k + ':' + s.aff[k]).join(' ')); lines.push('stats ' + JSON.stringify(s.stats)); } else lines.push('no vacation loaded');
          if (mm) { lines.push('match ' + mm.score.join('-') + ' phase ' + mm.phase + ' rally ' + mm.rallyN + ' ball ' + mm.ball.x.toFixed(0) + ',' + mm.ball.y.toFixed(0) + ',' + mm.ball.z.toFixed(0)); lines.push('stats ' + JSON.stringify(mm.stats)); }
          lines.forEach((ln, i) => G.wrap(ln, W - 20).forEach((l2, j) => G.text(g, l2, 10, 26 + i * 22 + j * 9, '#bfe9ee')));
        }
      });
      if (this.tab === 0) { const m = this.tools, all = m.items, idx = m.i, first = clamp(idx - 5, 0, Math.max(0, all.length - 11)); m.items = all.slice(first, first + 11); m.i = idx - first; m.draw(r); m.items = all; m.i = idx; G.drawPrompts(r, [['confirm', 'Run'], ['tab', 'Next tab'], ['cancel', 'Close']]); }
      else if (this.tab === 1) { this.sl.draw(r); r.overlay(g => G.text(g, 'Live: changes apply now. ' + G.label('confirm') + ' resets everything to defaults.', W / 2, H - 28, '#ffd24a', { align: 'center' })); G.drawPrompts(r, [['confirm', 'Reset to defaults'], ['dive', 'Hold: fast'], ['tab', 'Next tab'], ['cancel', 'Close']]); }
      else G.drawPrompts(r, [['tab', 'Next tab'], ['cancel', 'Close']]);
    }
  };
  return ov;
};
// the windowed Menu needs input to operate on the visible slice, as the shop does
(() => { const M = G.Menu.prototype; if (!M._winPatched) { M._winPatched = true; } })();
