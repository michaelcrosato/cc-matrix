/* ---- THE SESSION SCENE (14.2): in an AI Hub round there is no title or menu. Our own card (the arena at night, each
 * player on their team's blue line with a nameplate in their seat color, how to win, this player's controls, ready
 * marks, the countdown; Enter / ✕ answers Ready, △ / T / a click on MORE TIME asks for more), then 3-2-1 and one
 * period. No pausing: Options / Esc opens a small overlay (Sound, Music, Voices, Button symbols, Camera) while the
 * skater coasts ---- */
scenes.session = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], camera: { zoom: false },
  enter() { this.t = 0; this.ov = false; this.oi = 0; L.enabled = true; L.ambient = .45; Synth.music('card'); if (!Net.active) Net.connect(); },
  update(dt) {
    this.t += dt; const st = Net.st, m = Match.m;
    if (!st.active || !m) return;
    if (st.ended) return;
    const I = game.input;
    if (!st.started) {
      // the card: ready, more time; it changes nothing in the round
      if (!st.info.server) {
        if (I.pressed('confirm') || I.pressed('pass')) { try { AIHub.answer('ready'); } catch (e) { game.fail('answer', e); } Synth.sfx('menuSel'); }
        if (I.pressed('lob') || (I.held && I.held.has('KeyT') && !this.tHeld)) { try { AIHub.answer('more'); } catch (e) { game.fail('answer', e); } Synth.sfx('menuMove'); }
        this.tHeld = !!(I.held && I.held.has('KeyT'));
        const ck = I.clicked(); if (ck && this.btn) { if (inBox(ck, this.btn.ready)) { AIHub.answer('ready'); Synth.sfx('menuSel'); } else if (inBox(ck, this.btn.more)) { AIHub.answer('more'); Synth.sfx('menuMove'); } }
      }
      const t = this.t; Cam.update(m, dt, { view: 'threequarter', zoom: 1 }); game.focus(Rink.C.x + Math.sin(t * .2) * 120, Rink.C.y, 8);
      for (const s of m.skaters) { const dir = m.attackDir(s.team); s.x = Rink.C.x - dir * 110; s.y = Rink.C.y - 70 + s.slot * 70; s.facing = PI / 2; Skater.pose(m, s, dt); }
      for (const g of m.goalies) Goalie.update(m, g, dt);
      return;
    }
    // the small overlay: Options or Esc
    if (I.pressed('pause') && !st.info.server) { this.ov = !this.ov; Synth.sfx(this.ov ? 'menuSel' : 'menuBack'); }
    if (this.ov) this.overlayStep(I);
    const hu = m.humans.find(h => h.kind === 'local');
    if (this.ov && hu) { I.consumeAll(); }
    Net.step(dt);
    if (!st.info.server) { Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt); }
  },
  rows: [['sound', 'Sound'], ['music', 'Music'], ['voices', 'Voices'], ['buttons', 'Button symbols'], ['camera', 'Camera'], ['back', 'Back']],
  overlayStep(I) {
    const R = this.rows; if (I.repeat('up', .3, .1)) this.oi = (this.oi + R.length - 1) % R.length; if (I.repeat('down', .3, .1)) this.oi = (this.oi + 1) % R.length;
    const k = R[this.oi][0], d = I.repeat('left', .3, .1) ? -1 : I.repeat('right', .3, .1) || I.pressed('confirm') ? 1 : 0; if (!d) return;
    if (k === 'back') { this.ov = false; return; }
    if (k === 'sound') game.settings.set('sound', !S('sound')); if (k === 'music') game.settings.set('music', clamp(+(S('music') + d * .1).toFixed(2), 0, 1)); if (k === 'voices') game.settings.set('voices', clamp(+(S('voices') + d * .1).toFixed(2), 0, 1));
    if (k === 'buttons') game.settings.set('buttons', S('buttons') === 'xbox' ? 'playstation' : 'xbox'); if (k === 'camera') Cam.cycle();
    Synth.sfx('menuMove');
  },
  draw(r) {
    const st = Net.st, m = Match.m;
    if (!st.active || !m) { r.sky(['#05070d', '#0a1020', '#101a30']); r.overlay(g => E.font.text(g, 'CONNECTING…', r.W / 2, r.H / 2, '#ffffff', { align: 'center', outline: false })); return; }
    if (st.info && st.info.server) { r.sky(['#05070d', '#0a1020', '#101a30']); r.overlay(g => { E.font.text(g, 'HOSTING  ' + m.teams[0].def.abbr + ' ' + m.teams[0].score + ' - ' + m.teams[1].score + ' ' + m.teams[1].def.abbr + '  ' + U.mmss(m.clock), r.W / 2, r.H / 2, '#9fb2cc', { align: 'center', outline: false }); }); return; }
    World.draw(r, m);
    if (!st.started) { this.card(r, m); return; }
    Hud.draw(r, m); Talk.draw(r);
    r.overlay(g => {
      if (st.ended) { UI.panel(g, r.W / 2 - 110, r.H / 2 - 30, 220, 50, {}); E.font.title(g, 'FINAL', r.W / 2, r.H / 2 - 24, { align: 'center', scale: 2 }); E.font.text(g, m.teams[0].def.abbr + ' ' + m.teams[0].score + ' - ' + m.teams[1].score + ' ' + m.teams[1].def.abbr, r.W / 2, r.H / 2 + 2, '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }
      if (this.ov) { UI.panel(g, r.W / 2 - 80, 50, 160, this.rows.length * 14 + 14, {}); this.rows.forEach(([k, lab], i) => { const v = k === 'sound' ? (S('sound') ? 'ON' : 'OFF') : k === 'music' ? Math.round(S('music') * 100) + '%' : k === 'voices' ? Math.round(S('voices') * 100) + '%' : k === 'buttons' ? (S('buttons') === 'xbox' ? 'XBOX' : 'PLAYSTATION') : k === 'camera' ? (S('camera') === 'overhead' ? 'OVERHEAD' : 'BROADCAST') : ''; E.font.text(g, lab, r.W / 2 - 72, 58 + i * 14, i === this.oi ? UI.GOLD : '#eef4ff', { outline: false }); E.font.text(g, v, r.W / 2 + 72, 58 + i * 14, '#cfe0f4', { align: 'right', outline: false }); }); }
    });
  },
  card(r, m) {
    const st = Net.st, c = st.card || {}, t = game.real;
    for (let i = 0; i < 3; i++) L.add(Rink.C.x + Math.sin(t * .6 + i * 2) * 200, Rink.C.y + Math.cos(t * .4 + i) * 100, 40, 100, 1, { color: '#ffffff' });
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#4a5a7a'));
      E.font.title(g, 'ICE HOC-KABOOM', r.W / 2, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#cfe8ff', '#ffb347', '#ff6a2a'] });
      E.font.text(g, m.teams[0].def.short + '  vs  ' + m.teams[1].def.short + '  ·  ' + m.arena.name, r.W / 2, 34, '#ffe8a0', { align: 'center', outline: '#000' });
      // the players on their teams' blue lines: nameplates in their seat colors, ready marks
      st.players.forEach((p, i) => { const hu = m.humans.find(h => h.pid === p.id), s = hu && hu.skater; if (!s) return; const q = World.map ? null : null; void q;
        const sx = s.team === 0 ? 60 : r.W - 60, sy = 54 + Math.floor(i / 2) * 16 + (s.team ? 0 : 0); const ready = (c.ready || []).includes(p.id), name = U.sanitize(p.name);
        UI.panel(g, sx - 50, sy, 100, 14, { border: hu.color, bg: ready ? ['#1c3a20', '#0a1a0c'] : undefined }); E.font.text(g, name + (p.id === st.me ? ' (YOU)' : ''), sx - 44, sy + 3, hu.color, { outline: false }); if (ready) E.font.text(g, 'READY', sx + 46, sy + 3, '#7ad87a', { align: 'right', font: 'tiny', outline: false }); });
      E.font.text(g, m.teams[0].def.abbr + ' (HOME)', 60, 46, m.teams[0].def.trim, { align: 'center', outline: '#000' }); E.font.text(g, m.teams[1].def.abbr + ' (AWAY)', r.W - 60, 46, m.teams[1].def.trim, { align: 'center', outline: '#000' });
      UI.panel(g, r.W / 2 - 150, r.H - 100, 300, 62, {});
      E.font.text(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, r.H - 95, '#ffffff', { align: 'center', outline: false });
      Glyphs.text(g, 'STICK SKATE  {pass} PASS  {shoot} SHOOT/CHECK  {deke} DEKE  {turbo} TURBO', r.W / 2, r.H - 82, { align: 'center', color: '#cfe0f4' });
      Glyphs.text(g, '{lob} SAUCER / GLOVES   {chirp} CHIRP   {switch} SWITCH', r.W / 2, r.H - 70, { align: 'center', color: '#cfe0f4' });
      const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING…' : c.paused ? 'PAUSED: MORE TIME' : '') : 'STARTS IN ' + Math.ceil(c.left / 1000);
      E.font.text(g, left, r.W / 2, r.H - 56, UI.GOLD, { align: 'center', outline: false });
      const me = (c.ready || []).includes(st.me);
      this.btn = { ready: [r.W / 2 - 110, r.H - 32, 100, 18], more: [r.W / 2 + 10, r.H - 32, 100, 18] };
      UI.panel(g, ...this.btn.ready, { focus: !me, bg: me ? ['#1c3a20', '#0a1a0c'] : undefined }); Glyphs.text(g, me ? 'READY ✓'.replace('✓', '') + ' OK' : '{confirm} READY', r.W / 2 - 60, r.H - 27, { align: 'center', color: me ? '#7ad87a' : UI.GOLD });
      UI.panel(g, ...this.btn.more, { focus: !!c.asked }); Glyphs.text(g, c.asked ? 'MORE TIME: ASKED' : '{lob} MORE TIME (T)', r.W / 2 + 60, r.H - 27, { align: 'center', color: c.asked ? '#ffb347' : '#cfe0f4' });
    });
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];
