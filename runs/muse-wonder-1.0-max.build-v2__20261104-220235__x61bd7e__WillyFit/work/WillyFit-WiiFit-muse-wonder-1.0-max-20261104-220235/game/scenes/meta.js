// Willy Fit — Dev Mode panel, Pose Viewer, Class lobby/podium, About, Attract. (Round + start in start.js)
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.scenes = G.scenes || {};
  // ---------------- DEV MODE ----------------
  const SLIDERS = [
    ['k', 'Lean responsiveness k', 4, 24, 0.5], ['c', 'Lean damping c', 2, 12, 0.5], ['s', 'Instability s', 0, 20, 0.5],
    ['A', 'Tremble A', 0, 6, 0.2], ['nf', 'Tremble speed nf', 0.4, 2.5, 0.1], ['ringScale', 'Ring scale', 0.6, 1.6, 0.05],
    ['push', 'Push strength', 0, 2, 0.1], ['stumbleAt', 'Stumble edge', 0.7, 1.3, 0.02], ['mouseReach', 'Mouse reach', 0.2, 0.5, 0.02],
    ['nudgeRate', 'Keyboard nudge /s', 1.2, 3.2, 0.1], ['repTol', 'Rep tolerance', 0.03, 0.2, 0.01], ['rhythmScale', 'Rhythm window', 0.5, 2, 0.1],
    ['fatigue', 'Fatigue amount', 0, 2, 0.1], ['hoopLo', 'Hoop band low', 4, 10, 0.5], ['hoopHi', 'Hoop band high', 8, 14, 0.5],
    ['jogLo', 'Jog band low', 2, 3.2, 0.1], ['jogHi', 'Jog band high', 3, 4, 0.1], ['jogSpeed', 'Jog speed', 0.5, 1.8, 0.1],
    ['slalomSpeed', 'Slalom speed', 120, 320, 10], ['slalomTurn', 'Slalom turn', 0.5, 1.8, 0.1], ['trayG', 'Tray gravity', 150, 700, 20],
    ['trayFriction', 'Tray friction', 0, 1, 0.05], ['ropeS', 'Rope instability', 8, 24, 1], ['gust', 'Gust strength', 3, 15, 1],
    ['timeScale', 'Time scale', 0, 2, 0.25], ['minutesMul', 'Minutes ×', 0.5, 3, 0.25]
  ];
  G.DEV_SLIDERS = SLIDERS;
  let devI = 0, devTools = [];
  function buildTools() {
    devTools = [
      { label: 'Jump: title', go: () => G.game.go('title') },
      { label: 'Jump: island', go: () => G.game.go('island') },
      { label: 'Jump: Body Check', go: () => G.game.go('bodycheck') },
      { label: 'Jump: Stork T1', go: () => G.game.go('session', { id: 'stork', tier: 1, mode: 'free', from: 'title' }) },
      { label: 'Jump: Stork T2 (Eyes Closed)', go: () => G.game.go('session', { id: 'stork', tier: 2, mode: 'free', from: 'title' }) },
      { label: 'Jump: Gentle Games', go: () => G.game.go('games') },
      { label: 'Jump: Ending', go: () => G.game.go('ending') },
      { label: 'Jump: Pose Viewer', go: () => { G.devOpen = false; G.game.go('poses'); } },
      { label: 'Jump: Day +1', go: () => { G.member.day = Math.min(6, G.member.day + 1); } },
      { label: 'Finish now (3 stars)', go: () => { const s = G.game.scene; if (s && s.finish) { s.ctx.time = s.ctx.tierDef.dur; s.finish(); } } },
      { label: 'Unlock all + Free Play', go: () => { G.member.freePlay = true; for (const a of G.activities) if (!G.member.best[a.id]) G.member.best[a.id] = { stars: 2, pct: 0.7, tier: 1 }; } },
      { label: '+10 minutes', go: () => { G.member.minutes += 10; } },
      { label: 'Set Spine Age 19 (3★ all)', go: () => { for (const a of G.activities) G.member.best[a.id] = { stars: 3, pct: 1, tier: 2 }; } },
      { label: 'Reset this member', go: () => { G.member = G.newMember(); } },
      { label: 'No stumbles: toggle', go: () => { G.DEV.noStumble = !G.DEV.noStumble; } },
      { label: 'Bot plays: cycle', go: () => { const order = ['off', 'poor', 'average', 'good', 'expert']; G.DEV.botSkill = order[(order.indexOf(G.DEV.botSkill || 'off') + 1) % order.length]; } },
      { label: 'Show Plate trace: toggle', go: () => { G.DEV.showTrace = !G.DEV.showTrace; } },
      { label: 'Force attract', go: () => { G.devOpen = false; G.game.go('attract'); } },
      { label: 'Snapshot to console', go: () => { try { console.log(JSON.stringify(G.game.debug.snapshot())); } catch (e) {} } },
      { label: 'Reset to defaults', go: () => G.resetDev() }
    ];
  }
  buildTools();
  G.updateDev = function (dt) {
    if (!G.devOpen || G.inSession) return;
    const game = G.game, inp = game.input;
    const total = SLIDERS.length + devTools.length;
    if (inp.repeat('up')) devI = (devI + total - 1) % total;
    if (inp.repeat('down')) devI = (devI + 1) % total;
    const row = SLIDERS[devI];
    if (row) {
      const step = row[4] * (inp.down('catchL') || inp.down('catchR') ? 5 : 1);
      if (inp.down('left')) G.DEV[row[0]] = clamp((G.DEV[row[0]] || 0) - step * dt * 4, row[2], row[3]);
      if (inp.down('right')) G.DEV[row[0]] = clamp((G.DEV[row[0]] || 0) + step * dt * 4, row[2], row[3]);
      if (row[0] === 'timeScale') game.timeScale = G.DEV.timeScale;
    }
    if (inp.pressed('confirm')) {
      if (devI >= SLIDERS.length) { const t = devTools[devI - SLIDERS.length]; if (t) t.go(); }
    }
    if (inp.pressed('cancel')) G.devOpen = false;
    // mouse drag on panel rows
    try {
      const pt = inp.pointer ? inp.pointer() : null;
      if (pt && inp.down && (inp.down('catchL') || (typeof inp.down.click !== 'undefined' ? false : false))) {}
      const cl = inp.clicked ? inp.clicked() : null;
      if (cl && cl[0] < (game.r ? game.r.W * 0.34 : 150)) {
        const idx = Math.floor((cl[1] - 30) / 11);
        if (idx >= 0 && idx < total) devI = idx;
      }
    } catch (e) {}
  };
  G.drawDev = function (r) {
    if (!G.devOpen || G.inSession) return;
    const game = G.game;
    r.overlay(g => {
      const px = E.px, w = Math.floor(r.W * 0.34), h = r.H - 16;
      px.rect(g, 6, 8, w, h, '#20404c'); px.rect(g, 8, 10, w - 4, h - 4, '#ffffff');
      E.font.text(g, 'DEV MODE · ○ close · ✕ tool', 14, 14, '#20404c', {});
      let y = 30;
      const total = SLIDERS.length + devTools.length;
      for (let i = 0; i < total && y < r.H - 20; i++, y += 11) {
        const foc = i === devI;
        if (foc) px.rect(g, 10, y - 1, w - 8, 10, '#bfeee0');
        if (i < SLIDERS.length) {
          const s = SLIDERS[i];
          E.font.text(g, s[1] + ' ' + (+G.DEV[s[0]]).toFixed(2) + ' (def ' + G.DEV_DEFAULTS[s[0]] + ')', 14, y, '#20404c', {});
        } else {
          const t = devTools[i - SLIDERS.length];
          let extra = '';
          if (t.label.includes('No stumbles')) extra = G.DEV.noStumble ? ' ON' : ' off';
          if (t.label.includes('Bot plays')) extra = ' ' + (G.DEV.botSkill || 'off');
          if (t.label.includes('Plate trace')) extra = G.DEV.showTrace ? ' ON' : ' off';
          E.font.text(g, '▸ ' + t.label + extra, 14, y, '#14a8c8', {});
        }
      }
      if (G.DEV.showTrace && G._snap) E.font.text(g, JSON.stringify(G.game.debug.snapshot()).slice(0, 60), 14, r.H - 24, '#e0553a', {});
    });
  };
  // ---------------- POSE VIEWER ----------------
  G.scenes.poses = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.names = (G.getLib() ? G.getLib().names : ['Idle_Subtle']);
      this.i = 0; this.t = 0; this.scrub = 0.3;
      this.rig = G.makeRig({ size: 1.8, build: 'heroic', colors: { skin: '#d9b68a', hair: '#c9a878', cloth: '#d9b68a', pants: '#c9a878', boot: '#a8885c' } });
      this.pills = new G.Pills(G.game, [{ label: '◀ Clip' }, { label: 'Clip ▶' }, { label: 'Print pose row' }, { label: 'Back' }], { horizontal: true, y: 190 });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      const game = G.game;
      if (game.input.repeat('left')) this.scrub = clamp(this.scrub - dt, 0, 1);
      if (game.input.repeat('right')) this.scrub = clamp(this.scrub + dt, 0, 1);
      const a = this.pills.update(dt);
      if (a === 'pick') {
        if (this.pills.i === 0) this.i = (this.i + this.names.length - 1) % this.names.length;
        if (this.pills.i === 1) this.i = (this.i + 1) % this.names.length;
        if (this.pills.i === 2) { const n = this.names[this.i]; const row = "{ name: '" + n + "', clip: '" + n + "', a: 0, b: 1, tgt: 1.57 },"; try { console.log(row); } catch (e) {} G.say('Tare', 'Pose row printed to the console. The console is very still about it.'); }
        if (this.pills.i === 3) game.go('title');
      }
      if (a === 'cancel') game.go('title');
    },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 80, '#ecd9bd');
      const name = this.names[this.i], clip = G.clip(name), L = G.getLib();
      if (clip && L) { try { this.rig.mocap = L.sample(clip, this.scrub * clip.dur); } catch (e) {} }
      r.actor(0, 8, 0, (g, ox, oy) => { try { this.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      this.rig.update(1 / 120, { x: 0, y: 8, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      r.overlay(g => {
        E.font.text(g, 'Pose Viewer · ' + name + ' · scrub ' + Math.round(this.scrub * 100) + '% (◀ ▶)', r.W / 2, 16, '#20404c', { align: 'center', scale: 2 });
        E.font.text(g, (this.i + 1) + ' / ' + this.names.length + ' clips', r.W / 2, 32, '#5f7f8a', { align: 'center' });
      });
      this.pills.draw(r);
      G.talk.draw(r); G.drawDev(r);
    }
  };
})();
