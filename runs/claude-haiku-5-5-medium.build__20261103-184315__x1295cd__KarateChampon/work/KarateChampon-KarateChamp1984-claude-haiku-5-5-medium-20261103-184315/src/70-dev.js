// ---------------------------------------------------------------- dev mode (14): live sliders over KC.TUNE, toggles, warps, reset
KC.DEV_SLIDERS = [
  ['gameSpeed', 'Game speed', 0.25, 2, 0.05], ['techSpeed', 'Technique speed', 0.5, 1.5, 0.05], ['walk', 'Walk speed', 40, 120, 2],
  ['jump', 'Jump speed', 250, 450, 5], ['gravity', 'Gravity', 700, 1400, 10], ['hitstop', 'Hit-stop (s)', 0, 0.3, 0.01],
  ['fullAt', 'Full point at', 300, 1000, 50], ['counterMul', 'Counter multiplier', 1, 3, 0.1], ['reachScale', 'Reach scale', 0.7, 1.4, 0.02],
  ['blockWindow', 'Block window (frames)', 6, 30, 1], ['clock', 'Round clock (s)', 10, 99, 1], ['pointsToWin', 'Points to win', 1, 5, 0.5],
  ['roundsToWin', 'Rounds to win', 1, 3, 1], ['cpuLevel', 'CPU level (0 = per opponent)', 0, 10, 1], ['cpuReact', 'CPU reaction', 0.5, 2, 0.05],
  ['cpuAggression', 'CPU aggression (-1 = per opponent)', -1, 1, 0.05], ['refPace', 'Referee pace', 0.5, 2, 0.05], ['potSpeed', 'Pot speed', 0.5, 2, 0.05],
  ['bullSpeed', 'Bull speed', 0.5, 2, 0.05], ['kiSpeed', 'Ki speed', 0.5, 2, 0.05], ['sessionTarget', 'Session target (bout wins)', 1, 10, 1]
];
KC.DEV_TOGGLES = [['hitBoxes', 'Hit and push boxes'], ['frameData', 'Frame data'], ['inputDisplay', 'Input display'], ['aiThoughts', 'AI thoughts'],
  ['p1Invincible', 'P1 invincible'], ['infiniteTime', 'Infinite time'], ['freezeCpu', 'Freeze CPU'], ['slowMo', 'Slow motion 0.25x'], ['mute', 'Mute voices and sound'], ['unlockAll', 'Unlock all']];
KC.DEV_WARPS = [['Title', 'title'], ['Attract mode', 'attract'], ['Champon Road', 'road'], ['Dojo', 'dojo'], ['Bonus games', 'bonusMenu'], ['Technique Lab', 'lab'], ['Kachinuki (3 seats)', { kach: 3 }], ['Records', 'records'], ['Ending', 'ending'],
  ['Stage: Harbor', { stage: 'harbor' }], ['Stage: Stadium', { stage: 'stadium' }], ['Stage: Fuji', { stage: 'fuji' }], ['Stage: Market', { stage: 'market' }], ['Stage: Ship', { stage: 'ship' }], ['Stage: Log', { stage: 'log' }]];
KC.makeDev = (game, S) => {
  S.dev = {
    pausable: false,
    enter(data) { this.tab = 0; this.sel = 0; this.back = (data && data.back) || 'title'; this.msg = ''; KC.A.music(game, 'practice'); },
    rows() {
      const R = [{ kind: 'reset', label: 'RESET ALL TO DEFAULTS' }];
      if (this.tab === 0) for (const [k, label, min, max, step] of KC.DEV_SLIDERS) R.push({ kind: 'slider', k, label, min, max, step });
      if (this.tab === 1) for (const [k, label] of KC.DEV_TOGGLES) R.push({ kind: 'toggle', k, label });
      if (this.tab === 2) for (const [label, dest] of KC.DEV_WARPS) R.push({ kind: 'warp', label, dest });
      if (this.tab === 3) { R.push({ kind: 'info', label: 'VERSION ' + KC.VERSION + ' · ' + E.version }); R.push({ kind: 'info', label: 'SCENE ' + game.sceneName }); R.push({ kind: 'info', label: 'TUNING CHANGED: ' + (KC.tuneChanged() ? 'YES' : 'NO') }); R.push({ kind: 'copy', label: 'COPY TUNING JSON' }); }
      return R;
    },
    update(d) {
      const R = this.rows();
      if (game.input.pressed('cancel')) { KC.devOff = false; return game.go(this.back, { resume: true }); }
      if (game.input.pressed('left') || game.input.pressed('right')) {
        const row = R[this.sel], dir = game.input.pressed('left') ? -1 : 1;
        if (row && row.kind === 'slider') { KC.TUNE[row.k] = KC.clamp(+(KC.TUNE[row.k] + dir * row.step).toFixed(3), row.min, row.max); }
      }
      if (game.input.pressed('up')) this.sel = (this.sel + R.length - 1) % R.length;
      if (game.input.pressed('down')) this.sel = (this.sel + 1) % R.length;
      if (game.input.pressed('confirm') && R[this.sel]) this.act(R[this.sel]);
      if (game.input.pressed('triangle') || game.input.pressed('start') && false) { if (R[this.sel] && R[this.sel].kind === 'slider') KC.TUNE[R[this.sel].k] = KC.TUNE_DEFAULTS[R[this.sel].k]; }
      if (game.input.pressed('tUp')) { this.tab = (this.tab + 3) % 4; this.sel = 0; }
      if (game.input.pressed('tRight') || game.input.pressed('tLeft') && false) { this.tab = (this.tab + 1) % 4; this.sel = 0; }
      if (game.input.clicked && game.input.clicked()) { /* the rows are picked with the keyboard or a pad here */ }
      if (KC.TOGGLES.slowMo) game.timeScale = 0.25; else game.timeScale = KC.TUNE.gameSpeed;
      KC.TOGGLES.mute ? game.audio.mute(true) : game.audio.mute(false);
    },
    act(row) {
      if (row.kind === 'reset') { KC.resetTune(); this.msg = 'DEFAULTS RESTORED'; }
      if (row.kind === 'toggle') { KC.TOGGLES[row.k] = !KC.TOGGLES[row.k]; }
      if (row.kind === 'warp') {
        const d = row.dest;
        if (typeof d === 'string') return game.go(d, d === 'road' ? { resume: true } : undefined);
        if (d.kach) return game.go('kach', { seats: d.kach, stage: 'dojo', roster: ['taro', 'kamaboko', 'negi', 'ebi'] });
        if (d.stage) return game.go('fight', { mode: 'versus', w: 'taro', r: 'mei', stage: d.stage, cpuR: true, cpuW: true });
      }
      if (row.kind === 'copy') { this.msg = JSON.stringify(KC.TUNE).slice(0, 60); }
    },
    draw(r) {
      r.sky(['#0a0a18', '#14142a', '#1e1e3a']);
      const R = this.rows();
      r.overlay(g => {
        E.font.title(g, 'DEV MODE', r.W / 2, 8, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'];
        E.font.text(g, tabs.map((t, i) => (i === this.tab ? '[' + t + ']' : t)).join('  '), r.W / 2, 34, '#ffe08a', { align: 'center', outline: '#0b0814', font: 'tiny' });
        const top = 50, rowH = 12, max = Math.floor((r.H - 74) / rowH), start = Math.max(0, this.sel - max + 2);
        for (let i = 0; i < max && start + i < R.length; i++) {
          const row = R[start + i], y = top + i * rowH, on = start + i === this.sel;
          if (on) E.px.rect(g, 8, y - 2, r.W - 16, rowH, '#3a2a4a');
          let text = row.label, val = '';
          if (row.kind === 'slider') { val = String(KC.TUNE[row.k]); if (KC.TUNE[row.k] !== KC.TUNE_DEFAULTS[row.k]) val += ' *'; }
          if (row.kind === 'toggle') val = KC.TOGGLES[row.k] ? 'ON' : 'OFF';
          E.font.text(g, text, 14, y, on ? '#fffbe8' : '#c8c0e0', { outline: false });
          if (val) E.font.text(g, val, r.W - 14, y, '#ffe08a', { align: 'right', outline: false });
        }
        E.font.text(g, this.msg || 'UP/DOWN · LEFT/RIGHT · CROSS · CIRCLE BACK', 8, r.H - 14, '#a9a1c8', { outline: false, font: 'tiny' });
      });
    }
  };
  return S;
};
