/* ---- Dev: the dev panel (from the pause menu's Dev Mode). TUNING sliders with a reset, CHEATS, WARP, DEBUG with the sound
 * test. While open the match holds (unless Live is on: the panel docks right and play runs behind it) (PLAN 15.3) ---- */
const Dev = (() => {
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG'];
  let open = false, tab = 0, row = 0, scroll = 0, live = false, holdT = 0, hp = null, drag = false;
  const st = { overlays: false, fps: false, slow: 1, stepping: false, stepNow: false, freeCam: false, hideHud: false };
  const ch = (k, on) => { if (!M) return; M.cheats[k] = on === undefined ? !M.cheats[k] : on; };
  function rows() {
    if (tab === 0) {
      const out = [{ label: 'RESET ALL TO DEFAULTS', act: () => { T.resetAll(); A.sfx('pick'); } }, { label: 'LIVE (play runs behind the panel)', val: () => live ? 'ON' : 'OFF', act: () => { live = !live; } }, { label: 'LOG TUNING (console JSON)', act: () => { console.log('[Ice Hoc-Kaboom tuning]', JSON.stringify(T.changed())); UI.toast('TUNING LOGGED', Object.keys(T.changed()).length + ' changed'); } }];
      let grp = '';
      for (const [group, key] of T.ROWS) { if (group !== grp) { grp = group; out.push({ head: group.toUpperCase() }); } const m = T.META[key]; out.push({ key, label: m.label, slider: true, val: () => +T[key].toFixed(3), def: m.def }); }
      return out;
    }
    if (tab === 1) {
      const tg = (label, k) => ({ label, val: () => M && M.cheats[k] ? 'ON' : 'OFF', act: () => ch(k) });
      return [tg('Infinite turbo', 'turbo'), tg('God mode (no knockdowns)', 'god'), tg('Always KABOOM', 'alwaysKaboom'), tg('Puck magnet', 'magnet'), tg('Freeze AI', 'freezeAI'),
        { label: 'CPU goalies off', val: () => M && M.goalies.some(g => g.disabled) ? 'ON' : 'OFF', act: () => { if (!M) return; const on = !M.goalies.some(g => g.disabled); for (const g of M.goalies) if (!M.humans.some(h => h.team === g.team) || on === false) { g.disabled = on; if (on) g.x = -999; else { const og = Skater.ownGoal(g.team); g.x = og.x - Rink.outDir(og.side) * 8; g.y = Rink.C.y; } } } },
        { label: 'Big heads (next game)', val: () => Rigs.bigHeads ? 'ON' : 'OFF', act: () => { Rigs.bigHeads = !Rigs.bigHeads; } }, tg('Octopus rain', 'octorain'),
        { label: 'Glow puck', val: () => Rigs.glow ? 'ON' : 'OFF', act: () => { Rigs.glow = !Rigs.glow; } }, { label: 'Retro rigs (next game)', val: () => Rigs.retro ? 'ON' : 'OFF', act: () => { Rigs.retro = !Rigs.retro; } },
        { label: 'Instant BOOM full (your team)', act: () => M && Boom.start((M.humans[0] || { team: 0 }).team) }];
    }
    if (tab === 2) {
      const w = (label, fn) => ({ label, act: () => { fn(); close(); } });
      const out = [];
      for (let n = 1; n <= 5; n++) out.push(w('Story chapter ' + n + ': ' + STORY.CHAPTERS[n - 1].title, () => { Save.data.story.chapter = Math.max(Save.data.story.chapter, n); Story.open(n); }));
      for (const id of Object.keys(STORY.CUTS)) out.push(w('Cutscene ' + id, () => game.go('cutscene', { id, next: 'title' })));
      out.push(w('Period 2', () => warp('period', 2)), w('Period 3', () => warp('period', 3)), w('Overtime', () => warp('ot')), w('Shootout', () => warp('shootout')), w('Clock to 0:10', () => warp('clock')),
        w('Score +1 home', () => warp('score', 0)), w('Score +1 away', () => warp('score', 1)), w('Win this game now', () => warp('win')), w('Lose this game now', () => warp('lose')));
      for (const k of Object.keys(ITEMS).concat(['octopus', 'rat'])) out.push(w('Spawn ' + k + ' at center', () => warp('item', k)));
      out.push(w('Start a fight', () => warp('fight')), w('Start KABOOM', () => warp('kaboom')), w('Break the thin ice', () => warp('breakIce')), w('Shatter a panel', () => warp('glass')), w('Knock down the mascot', () => warp('mascot')),
        w('Flood Wagon', () => game.go('flood', { back: !!M, team: 0 })), w('Results', () => warp('results')), w('Attract mode', () => game.go('attract')), w('About', () => game.go('about')), w('Animation lab', () => game.go('lab')), w('Title', () => game.go('title')));
      return out;
    }
    const sfx = Object.keys(Synth.SFX).map(k => ({ label: 'SFX ' + k, act: () => A.sfx(k) }));
    const songs = Object.keys(Synth.SONGS).map(k => ({ label: 'SONG ' + k, act: () => Synth.music(k, { restart: true }) }));
    const layers = ['drive', 'kaboom', 'fight'].map(k => ({ label: 'LAYER ' + k, act: () => { Synth.layer(k, true); Synth.layer(k + '2', true); } }));
    const stings = Object.keys(Synth.STINGS).map(k => ({ label: 'ORGAN ' + k, act: () => Synth.sting(k) }));
    const voices = ['marge', 'dunny', 'snipes', 'lou', 'lemmy', 'glitter', 'chuck', 'moose', 'gus', 'doris', 'pete', 'ref', 'vault'].map(v => ({ label: 'VOICE ' + v, act: () => Synth.babble('Hello there, this is how I talk on the ice!', v) }));
    return [{ label: 'Debug overlays', val: () => st.overlays ? 'ON' : 'OFF', act: () => { st.overlays = !st.overlays; } }, { label: 'FPS readout', val: () => S().showFps ? 'ON' : 'OFF', act: () => S().set('showFps', !S().showFps) },
      { label: 'Slow motion', val: () => st.slow + 'x', act: () => { st.slow = st.slow === 1 ? .5 : st.slow === .5 ? .25 : 1; } }, { label: 'Frame step (confirm advances)', val: () => st.stepping ? 'ON' : 'OFF', act: () => { st.stepping = !st.stepping; } },
      { label: 'Free camera', val: () => Cam.free ? 'ON' : 'OFF', act: () => { Cam.free = Cam.free ? null : { x: M ? M.puck.x : 560, y: M ? M.puck.y : 400, mx: 0, my: 0 }; } },
      { label: 'Hide HUD (screenshots)', val: () => M && M.hideHud ? 'ON' : 'OFF', act: () => { if (M) M.hideHud = !M.hideHud; } }, { label: 'RNG seed', val: () => RNG.seed }, { head: 'SOUND TEST' }, ...sfx, ...songs, ...layers, ...stings, ...voices];
  }
  /** a warp: jump the match somewhere */
  function warp(what, arg) {
    if (!M) return false;
    const C = Rink.C;
    if (what === 'period') { M.period = arg; M.clock = M.cfg.len; M.flip = (arg - 1) % 2; Match.setupFaceoff([C.x, C.y]); }
    else if (what === 'ot') { M.period = M.cfg.periods; M.score[1] = M.score[0]; M.clock = 0; Match.setPhase('play'); }
    else if (what === 'shootout') { Shootout.start(false); }
    else if (what === 'clock') M.clock = 10;
    else if (what === 'score') M.score[arg]++;
    else if (what === 'win' || what === 'lose') { const t = (M.humans[0] || { team: 0 }).team, w = what === 'win' ? t : 1 - t; M.score[w] = M.score[1 - w] + 1; Match.setPhase('play'); Match.final(); }
    else if (what === 'item') { if (M.phase !== 'play') Match.setPhase('play'); Items.throwOne(arg, [C.x, C.y]); }
    else if (what === 'fight') { if (M.phase !== 'play') { Match.setPhase('play'); M.puck.held = false; } const h = (M.humans[0] && M.humans[0].s) || M.skaters[0], o = M.skaters.filter(s => s.team !== h.team && s.state !== 'bin').sort((a, b) => b.def.fgt - a.def.fgt)[0]; o.x = h.x + 20; o.y = h.y; M.lastFightClock = 1e9; M.fights = Math.min(M.fights, T.fightMax - 1); Fight.begin(h, o); }
    else if (what === 'kaboom') Boom.start((M.humans[0] || { team: 0 }).team);
    else if (what === 'breakIce') { if (!M.ice.length) M.ice = [{ i: 0, x: C.x - 200, y: C.y - 70, rx: 40, ry: 24, hp: 100, hole: false, t: 0 }]; Items.breakIce(0); }
    else if (what === 'glass') Hits.breakPanel(Rink.panels[5], 'shattered', M.skaters[0]);
    else if (what === 'mascot') { if (!M.mascot) { M.arena = Object.assign({}, M.arena, { hazards: M.arena.hazards.concat(['mascot']) }); Items.reset(M); } M.mascot.down = 3; Bus.emit('mascot_down', { by: M.skaters[0].id, team: M.skaters[0].team, name: M.skaters[0].name, x: M.mascot.x, y: M.mascot.y }); }
    else if (what === 'results') { Match.setPhase('play'); Match.final(); M.finished = true; }
    return true;
  }
  function openFromMenu() { if (HUB) return; if (game.resume) game.resume(); open = true; tab = 0; row = 0; scroll = 0; if (M) M.devPause = !live; game.input.consumeAll(); }
  function close() { open = false; if (M) M.devPause = false; game.input.consumeAll(); }
  /** the panel's input; returns true while it holds the match */
  function update(dt) {
    if (!open) return false;
    const I = game.input, R2 = rows(), sel = () => R2[row];
    if (M) M.devPause = !live;
    if (I.pressed('cancel') || I.pressed('pause')) { close(); return true; }
    if (UI.anyPressed('tabR')) { tab = (tab + 1) % 4; row = 0; scroll = 0; A.sfx('move'); }
    if (UI.anyPressed('tabL')) { tab = (tab + 3) % 4; row = 0; scroll = 0; A.sfx('move'); }
    const mv = d => { do { row = (row + d + R2.length) % R2.length; } while (R2[row].head); A.sfx('move'); };
    if (I.repeat('down', .3, .06)) mv(1); if (I.repeat('up', .3, .06)) mv(-1);
    const r = sel();
    if (r && r.slider) {
      const m = T.META[r.key], big = I.down('switch') || I.down('turbo') ? 10 : 1;
      const l = I.down('left'), rr = I.down('right');
      if (l || rr) { holdT += dt; const step = I.pressed('left') || I.pressed('right') || (holdT > .35 && Math.floor(holdT * 20) !== Math.floor((holdT - dt) * 20)); if (step) T.set(r.key, T[r.key] + (rr ? 1 : -1) * m.step * big * (holdT > 1.2 ? 5 : 1)); } else holdT = 0;
      if (I.pressed('reset')) { T.reset(r.key); A.sfx('back'); }
    } else if (r && r.act && (I.pressed('confirm') || I.pressed('pass'))) { r.act(); A.sfx('pick'); }
    // the mouse: hover focuses a row, a drag moves a slider, a click toggles
    const p = I.pointer(), c = I.clicked(), L2 = layout(game.r || { W: 427, H: 240 });
    if (p && (!hp || p[0] !== hp[0] || p[1] !== hp[1])) { const k = Math.floor((p[1] - L2.y0) / L2.rh) + scroll; if (p[0] > L2.x && k >= 0 && k < R2.length && !R2[k].head) row = k; }
    hp = p ? p.slice() : null;
    if (c) { if (c[1] < L2.y0 - 2 && c[1] > L2.y0 - 16) { const t2 = Math.floor((c[0] - L2.x) / (L2.w / 4)); if (t2 >= 0 && t2 < 4) { tab = t2; row = 0; scroll = 0; } } else { const k = Math.floor((c[1] - L2.y0) / L2.rh) + scroll; const rr2 = R2[k]; if (rr2 && rr2.act) rr2.act(); if (rr2 && rr2.slider) setFromX(rr2, c[0], L2); } }
    if (I.down('shoot') && p && sel() && sel().slider && I.lastDevice === 'mouse') setFromX(sel(), p[0], L2);
    const vis = L2.n; if (row < scroll) scroll = row; if (row >= scroll + vis) scroll = row - vis + 1;
    if (st.stepping) st.stepNow = I.pressed('confirm');
    I.consumeAll();
    return true;
  }
  function setFromX(r, x, L2) { const m = T.META[r.key], u = clamp((x - (L2.x + L2.w - 120)) / 80, 0, 1); T.set(r.key, m.min + (m.max - m.min) * u); }
  function layout(r) { const w = live ? Math.round(r.W * .45) : Math.min(r.W - 30, 360), x = live ? r.W - w - 4 : Math.round(r.W / 2 - w / 2), y0 = 40, rh = 11; return { x, w, y0, rh, n: Math.floor((r.H - y0 - 30) / rh) }; }
  function draw(r) {
    if (st.overlays && M) debugDraw(r);
    if (!open) return;
    r.overlay(g => {
      const L2 = layout(r), R2 = rows();
      UI.panel(g, L2.x - 4, 20, L2.w + 8, r.H - 28, { alpha: .95, border: '#5aff9a' });
      UI.text(g, 'DEV MODE', L2.x, 24, '#5aff9a');
      TABS.forEach((t, i) => { const tx = L2.x + i * L2.w / 4; px.rect(g, tx, L2.y0 - 14, L2.w / 4 - 2, 12, i === tab ? '#2a5a3a' : '#141c24'); UI.text(g, t, tx + L2.w / 8, L2.y0 - 12, i === tab ? '#ffffff' : '#7a8a9a', { align: 'center' }); });
      for (let k = 0; k < L2.n && k + scroll < R2.length; k++) {
        const rr = R2[k + scroll], y = L2.y0 + k * L2.rh, f = k + scroll === row;
        if (rr.head) { UI.text(g, rr.head, L2.x, y + 2, UI.GOLD); continue; }
        if (f) px.rect(g, L2.x - 2, y, L2.w + 4, L2.rh, '#24405a');
        UI.text(g, rr.label, L2.x + 2, y + 2, f ? '#ffffff' : '#c8d0e0');
        if (rr.slider) { const m = T.META[rr.key], u = (T[rr.key] - m.min) / (m.max - m.min), sx = L2.x + L2.w - 120; px.rect(g, sx, y + 4, 80, 3, '#2a3440'); px.rect(g, sx, y + 4, Math.round(80 * u), 3, T[rr.key] === m.def ? '#5a9aff' : '#ffb347'); E.font.text(g, String(rr.val()) + (T[rr.key] !== m.def ? ' (' + m.def + ')' : ''), sx + 84, y + 2, '#ffffff', { font: 'tiny', outline: false }); }
        else if (rr.val) UI.text(g, String(rr.val()), L2.x + L2.w - 4, y + 2, '#ffe08a', { align: 'right' });
      }
      Glyphs.text(g, '{tabL}{tabR} TAB  {left}{right} ADJUST  {reset} RESET ROW  {cancel} CLOSE', L2.x + L2.w / 2, r.H - 20, '#9fb0c8', { align: 'center' });
    });
  }
  function debugDraw(r) {
    for (const s of M.skaters) {
      r.decal(g => { r.groundRing && r.groundRing(s.x, s.y, 7, s.team ? '#ff5a5a' : '#5a9aff', .7); const [bx, by] = Skater.blade(s); const [X, Y] = r.w(bx, by, 0); px.rect(g, X - 1, Y - 1, 3, 3, '#ffff00'); });
      if (s.ai) r.queue(s.x, s.y, 60, g => { const [x, y] = r.w(s.x, s.y, 56); E.font.text(g, (s.ai.role || '').toUpperCase(), x, y, '#5aff9a', { font: 'tiny', align: 'center', outline: '#000' }); const gv = Object.values(s.grudge).filter(v => v > 1); if (gv.length) E.font.text(g, 'G' + Math.round(Math.max(...gv)), x, y + 6, '#ff9a5a', { font: 'tiny', align: 'center', outline: '#000' }); }, { emissive: true });
      if (s.ai && s.ctrl === 'cpu') r.decal(g => { const a = r.w(s.x, s.y, 0), b = r.w(s.ai.target[0], s.ai.target[1], 0); px.line(g, a[0], a[1], b[0], b[1], '#5aff9a', 1); });
      r.queue(s.x, s.y, 0, g => s.rig.debug && s.rig.debug(r));
    }
    const p = M.puck; r.decal(g => { let x = p.x, y = p.y, vx = p.vx, vy = p.vy; for (let i = 0; i < 20; i++) { const a = r.w(x, y, 0); x += vx * .05; y += vy * .05; const b = r.w(x, y, 0); px.line(g, a[0], a[1], b[0], b[1], '#ff5aff', 1); } });
    for (const gl of M.goalies) r.decal(g => { const w = Goalie.scale(gl); const a = r.w(gl.x, gl.y - 8 * w, 0), b = r.w(gl.x, gl.y + 8 * w, 0); px.line(g, a[0], a[1], b[0], b[1], '#ffff5a', 2); if (gl.track) { const c = r.w(gl.x, gl.track.y, 0); px.rect(g, c[0] - 1, c[1] - 1, 3, 3, '#ff5a5a'); } });
  }
  return { openFromMenu, update, draw, close, warp, rows, get isOpen() { return open; }, get live() { return live; }, set live(v) { live = v; }, get slow() { return st.slow; }, get stepping() { return st.stepping; }, get stepNow() { return st.stepNow; }, set tab(v) { tab = v; }, get tab() { return tab; }, set row(v) { row = v; }, st };
})();

/* ---- the animation lab: one skater, one goalie, one referee on a small sheet of ice; every motion, three views ---- */
scenes.lab = (() => {
  const MOTIONS = ['stride', 'turbo', 'glide', 'crossover', 'hockey stop', 'backward', 'stick-handle', 'pass', 'saucer', 'wrist shot', 'slapshot', 'check', 'poke', 'deke spin', 'stun', 'big-hit fall', 'getup', 'slip', 'celebrate pump', 'celebrate rifle', 'celebrate guitar', 'fight guard', 'jab', 'haymaker', 'goalie ready', 'goalie butterfly', 'goalie glove', 'goalie blocker', 'goalie stack', 'goalie poke', 'goalie blasted', 'referee wave'];
  let sk = null, gl = null, rf = null, i = 0, t = 0, speed = 1, views = ['threequarter', 'brawler', 'topdown'], vi = 0, phase = 0;
  return {
    view: 'brawler', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [], pausable: true,
    enter() { sk = Rigs.skater(TEAMS.muskrats.skaters[1], 'muskrats', true); gl = Rigs.goalie(TEAMS.muskrats.goalie, 'muskrats', true); rf = Rigs.referee(false); t = 0; Cam.apply('brawler', 2); game.focus(0, 0, 14); L.enabled = false; },
    update(dt) {
      Glyphs.sync(); t += dt * speed;
      if (UI.anyRepeat('down')) i = (i + 1) % MOTIONS.length; if (UI.anyRepeat('up')) i = (i + MOTIONS.length - 1) % MOTIONS.length;
      if (UI.anyRepeat('right')) speed = Math.min(2, speed + .25); if (UI.anyRepeat('left')) speed = Math.max(0, speed - .25);
      if (UI.anyPressed('camera') || UI.anyPressed('confirm')) { vi = (vi + 1) % 3; Cam.apply(views[vi], 2); }
      if (UI.anyPressed('cancel')) return game.go('title', { menu: true });
      const m = MOTIONS[i], u = (t % 1.2) / 1.2, hk = sk.hk || (sk.hk = { mode: 'skate' });
      Object.assign(hk, { mode: 'skate', phase: t * 7, speed: 0, turbo: false, stop: 0, back: false, cross: 0, hand: 1, stick: 'idle', t: u * .45, charge: u, carry: false });
      const st = { x: -16, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
      if (m === 'stride') hk.speed = .8; if (m === 'turbo') { hk.speed = 1; hk.turbo = true; } if (m === 'glide') hk.speed = .3; if (m === 'crossover') { hk.speed = .8; hk.cross = 1; }
      if (m === 'hockey stop') { hk.stop = 1; hk.stopSide = 1; } if (m === 'backward') { hk.speed = .6; hk.back = true; } if (m === 'stick-handle') { hk.carry = true; hk.speed = .4; }
      if (m === 'pass') hk.stick = 'pass'; if (m === 'saucer') { hk.stick = 'pass'; hk.saucer = true; } if (m === 'wrist shot') hk.stick = 'follow'; if (m === 'slapshot') hk.stick = u < .7 ? 'wind' : 'follow';
      if (m === 'check') { hk.stick = 'check'; st.lean = .3; } if (m === 'poke') hk.stick = 'poke'; if (m === 'deke spin') sk.spin = u * TAU; else sk.spin = 0;
      if (m === 'stun') st.hurt = true; if (m === 'big-hit fall') st.down = Math.min(1, u * 3); if (m === 'getup') st.down = Math.max(0, 1 - u * 2); if (m === 'slip') { st.down = Math.min(1, u * 5); st.flip = Math.min(.3, u); }
      if (m === 'celebrate pump') { st.pose = 'cheer'; hk.stick = 'raised'; } if (m === 'celebrate rifle') hk.stick = 'rifle'; if (m === 'celebrate guitar') hk.stick = 'guitar';
      if (m === 'fight guard' || m === 'jab' || m === 'haymaker') { hk.mode = 'none'; sk.noStick = true; st.stance = 'guard'; if (m !== 'fight guard') st.attack = E.move(m, u); } else sk.noStick = false;
      sk.update(dt, st);
      const gs = m.startsWith('goalie') ? m.slice(7) : 'ready'; gl.hk = { mode: 'goalie', state: gs, dy: 6 }; gl.update(dt, { x: 16, y: 0, z: 0, vx: 0, vy: 0, facing: PI, down: gs === 'blasted' ? Math.min(1, u * 3) : 0 });
      rf.update(dt, { x: 0, y: -24, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: m === 'referee wave' ? 'wave' : null });
      phase = u; game.focus(0, 0, 14);
    },
    draw(r) {
      r.sky(['#1a2a48', '#2a4a78', '#c8d8f0']);
      r.decal(g => { const pts = [r.w(-60, -40, 0), r.w(60, -40, 0), r.w(60, 40, 0), r.w(-60, 40, 0)]; px.poly(g, pts, '#e8f2fa'); const a = r.w(0, -40, 0), b = r.w(0, 40, 0); px.line(g, a[0], a[1], b[0], b[1], '#c83a2a', 2); });
      const view = Draw.view(r);
      for (const [rig, x, y] of [[sk, -16, 0], [gl, 16, 0], [rf, 0, -24]]) { r.shadow(x, y, 7, .3); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, view)); }
      r.overlay(g => {
        UI.panel(g, 6, 6, 128, r.H - 30);
        UI.text(g, 'ANIMATION LAB', 12, 10, UI.GOLD);
        const top = Math.max(0, i - 8); MOTIONS.slice(top, top + 18).forEach((m, k) => UI.text(g, m.toUpperCase(), 12, 24 + k * 10, top + k === i ? UI.GOLD : '#c8d0e0'));
        UI.text(g, 'SPEED ' + speed.toFixed(2) + 'x   PHASE ' + phase.toFixed(2) + '   VIEW ' + views[vi].toUpperCase(), r.W / 2 + 60, r.H - 30, '#ffffff', { align: 'center' });
        E.ui.bar(g, r.W / 2 + 10, r.H - 20, 100, 3, phase, UI.GOLD);
        UI.legend(g, r, [['up', 'MOTION'], ['left', 'SPEED'], ['confirm', 'VIEW'], ['cancel', 'BACK']]);
      });
    }
  };
})();
