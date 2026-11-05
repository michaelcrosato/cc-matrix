/* HUB + RACE: the Rat Run, solo against your best ghost, or an AI Hub ghost race for 1 to 4 players. */
B.ghosts = {}; B.hub = { sent: 0, progT: 0, posT: 0, sentResult: false, started: false, card: null, ended: null, over: null, seatInfo: [] };
B.RR_KEY = 'boltholder.ratrun';
B.rrLoad = () => { try { return JSON.parse(localStorage.getItem(B.RR_KEY) || 'null'); } catch (e) { return null; } };
B.rrSave = (o) => { try { localStorage.setItem(B.RR_KEY, JSON.stringify(o)); } catch (e) { } };
(() => {
  const V = B.View, E = My3D2dge, A = () => (typeof AIHub !== 'undefined' ? AIHub : null);
  const race = { trail: [], tAcc: 0, best: null, ghost: null, phase: 'count', countT: 3.99, results: null, F: new UI.Focus(), tick: 0 };
  B.race = race;
  const fmt = t => { const m = Math.floor(t / 60), s = (t % 60).toFixed(1).padStart(4, '0'); return String(m).padStart(2, '0') + ':' + s; };
  UI.fmtTime = fmt;
  B.raceTick = (dt) => {
    const S = B.S, r = S.race; if (!r) return; const hub = B.inSession(), p = S.party;
    race.tick += dt;
    if (race.phase === 'count') { if (hub) { const t = A().time(); if (t >= 0) { race.phase = 'run'; r.go = true; } else race.countLeft = isFinite(t) ? -t / 1000 : null; } else { race.countT -= dt; if (race.countT <= 0) { race.phase = 'run'; r.go = true; B.log('GO!', 'good'); } } }
    if (race.phase === 'run' && r.go) {
      if (!hub) { race.tAcc += dt; if (race.tAcc >= .1) { race.tAcc = 0; race.trail.push({ t: +r.t.toFixed(1), cx: p.cx, cy: p.cy, dir: p.dir }); } if (race.ghost) { const tr = race.ghost.trail; let g = tr[0]; for (const q of tr) if (q.t <= r.t) g = q; if (g) B.ghosts.gold = { cx: g.cx, cy: g.cy, dir: g.dir, name: 'BEST', color: '#ffd36a', gold: true }; } }
      else B.hubTick(dt, r);
      if (r.done) { race.phase = 'done'; B.raceDone(); }
      if (S.over && !race.wiped) { race.wiped = true; race.phase = 'done'; B.raceDone(true); }
    }
  };
  B.raceFinishCheck = () => { const S = B.S; if (S.race && !S.race.done) { B.raceFinish(); } };
  B.raceDone = (wipe) => {
    const S = B.S, r = S.race, hub = B.inSession(); race.results = { time: r.t, crowns: r.crowns, kills: S.stats.kills, wipe: !!wipe, best: null, newBest: false };
    if (!hub) { const old = B.rrLoad(); const ok = !wipe; if (ok && (!old || r.t < old.best)) { B.rrSave({ best: r.t, trail: race.trail }); race.results.newBest = true; race.results.best = r.t; } else race.results.best = old ? old.best : null; B.Music.stop(); B.Music.sting(wipe ? 'gameOver' : 'victory'); }
    else if (!B.hub.sentResult) { B.hub.sentResult = true; if (wipe) A().result({ score: B.score() }); else { A().result({ time: Math.round(A().time()), stats: { Kills: S.stats.kills, Crowns: r.crowns } }); A().send({ t: 'done', time: Math.round(A().time()) }); } }
  };
  B.hubTick = (dt, r) => {
    const S = B.S, p = S.party, h = B.hub; if (h.ended) return; const now = performance.now();
    if (!h.lastPos || now - h.lastPos >= 100) { h.lastPos = now; const cam = B.View.camPos || { x: p.cx * 32 + 16, y: p.cy * 32 + 16, yaw: 0 }; A().send({ t: 'g', area: 'race', cx: p.cx, cy: p.cy, dir: p.dir, x: cam.x, y: cam.y, yaw: cam.yaw, cp: r.cp, hp: p.members.reduce((a, m) => a + m.hp, 0) }, { reliable: false }); }
    if (!h.lastProg || now - h.lastProg >= 1000) { h.lastProg = now; A().progress({ score: B.score(), label: 'CP ' + r.cp + '/' + B.FLOORS.rr.cps.length }); }
  };
  /** attach hub handlers once */
  B.hubInit = () => {
    const a = A(); if (!a || !a.active || !B.hubInfo) return; const info = B.hubInfo; B.hub.seatInfo = info.players || [];
    a.on('card', c => { B.hub.card = c; }); a.on('start', () => { B.hub.started = true; });
    a.on('message', (d, from) => { if (!d) return; if (d.t === 'g' && d.area === 'race') { const pl = (info.players || []).find(q => q.id === from) || { name: 'P' + from, color: '#fff' }; B.ghosts['p' + from] = { cx: d.cx, cy: d.cy, dir: d.dir, x: d.x, y: d.y, yaw: d.yaw, name: pl.name, color: pl.color }; } });
    a.on('leave', (d) => { delete B.ghosts['p' + d.id]; });
    a.on('time-up', () => { if (!B.hub.sentResult && B.S) { B.hub.sentResult = true; a.result({ score: B.score() }); } });
    a.on('end', (d) => { B.hub.ended = d || { reason: 'finished' }; B.Music.stop(); try { UI.game.audio.mute(true); } catch (e) { } });
  };
  /* ---- scenes ---- */
  const scenes = B.scenes;
  scenes.race = {
    view: 'iso', input: UI.INPUT(), pausable: true,
    enter(d) {
      UI.attract = false; UI.screen = null; UI.logs = []; UI.pops = []; UI.chev = []; UI.cardHurt = {}; game.timeScale = 1; B.ghosts = {}; B.hub.sentResult = false; B.hub.posT = B.hub.progT = 0; race.phase = 'count'; race.countT = 3.99; race.trail = []; race.tAcc = 0; race.wiped = false; race.results = null; race.F = new UI.Focus();
      const hub = B.inSession(); if (hub) { B.hubInit(); } else { race.ghost = B.rrLoad(); if (!B.S.race) B.startRace(Date.now() % 100000); }
      for (const m of B.S.party.members) m.rig = null; V.enter('rr'); B.Music.cur = null; B.Music.play('race'); B.S.events.length = 0; UI.floorToast = { text: 'The Rat Run', t: 3 };
      UI.hook = UI.hook;
    },
    update(dt) {
      const S = B.S, r = S.race, hub = B.inSession(); UI.updateHud(dt); const inp = game.input;
      if (hub && B.hub.ended) { B.update(0); V.update(dt); return; }
      if (race.phase === 'done') { const F = race.F, rr = game.r; F.begin(); if (!hub) { F.add('again', Math.round(rr.W / 2) - 62, 150, 124, 15); F.add('title', Math.round(rr.W / 2) - 62, 168, 124, 15); const res = F.run(); if (res && (res.act === 'confirm' || res.act === 'click') && res.item) { if (res.item.id === 'again') { B.startRace(Date.now() % 100000); game.go('race'); } else { B.quit(); } } } B.update(dt); UI.pump(); V.update(dt); return; }
      if (race.phase === 'run' || !hub) { if (UI.screen) UI.screen.update(dt); else if (race.phase === 'run') UI.controls(dt); }
      if (hub && race.phase === 'count' && !(A().time() >= 0)) { if (inp.pressed('confirm') || inp.pressed('use')) A().answer('ready'); if (inp.pressed('alt') || inp.pressed('party')) A().answer('more'); }
      if (hub && inp.held && inp.held.has('Pad8') && inp.pressed('pause')) { inp.consume('pause'); }
      B.update(race.phase === 'count' ? 0 : dt); B.raceTick(dt); UI.pump(); B.Music.update(dt, UI.engaged()); V.update(dt);
      if (B.S.race && B.S.party && !B.S.race.done) { const [x, y] = [B.S.party.cx, B.S.party.cy]; }
    },
    draw(r) {
      if (V.cur) V.cur.draw(r); const S = B.S, hub = B.inSession();
      r.overlay(g => {
        UI.hud(g, r); if (UI.screen) UI.screen.draw(g, r); const cx = Math.round(r.W / 2), P2 = UI.PAL;
        // ghost name tags
        if (V.cur) for (const id in B.ghosts) { const gh = V.ghostPos && V.ghostPos[id]; if (!gh) continue; const sp = V.cur.project(gh.x, gh.y, 40); if (sp) UI.text(g, gh.name || '', sp[0], sp[1], gh.color, { align: 'center', font: 'tiny' }); }
        if (race.phase === 'count') {
          if (hub) { UI.veil(g, r, .55); UI.panel(g, cx - 130, 18, 260, r.H - 60); UI.title(g, B.TITLE, cx, 24, { scale: 2 }); UI.text(g, 'THE RAT RUN', cx, 46, P2.focus, { align: 'center' }); UI.text(g, 'Fastest party out of the Rat Run wins.', cx, 58, P2.text, { align: 'center' });
            UI.prompts(g, [['fwd', 'Step'], ['turnL', 'Turn'], ['use', 'Use'], ['strike', 'Strike']], cx, 74, { center: true });
            const ps = B.hub.seatInfo; const ready = (B.hub.card && B.hub.card.ready) || []; ps.forEach((pl, i) => { const y = 92 + i * 13; g.fillStyle = pl.color; g.fillRect(cx - 80, y + 1, 8, 8); UI.text(g, String(pl.name).slice(0, 14), cx - 68, y, P2.text); UI.text(g, ready.includes(pl.id) ? 'READY' : '...', cx + 76, y, ready.includes(pl.id) ? P2.good : P2.dim, { align: 'right' }); });
            const left = B.hub.card && B.hub.card.left; UI.prompts(g, [['confirm', 'Ready'], ['alt', 'More time']], cx, r.H - 56, { center: true }); const t = A().time(); if (isFinite(t)) { const c = Math.ceil(-t / 1000); UI.title(g, c > 0 ? String(c) : 'GO', cx, r.H / 2 - 20, { scale: 5 }); } else if (left != null) UI.text(g, 'Starts in ' + Math.ceil(left / 1000) + 's', cx, r.H - 70, P2.dim, { align: 'center' }); }
          else { const c = Math.ceil(race.countT); UI.title(g, c > 0 ? String(c) : 'GO', cx, r.H / 2 - 30, { scale: 5 }); UI.text(g, 'Get out before the clock does. Your golden ghost is your best run.', cx, r.H / 2 + 20, P2.text, { align: 'center' }); }
        }
        if (race.phase === 'done' && race.results) { const R = race.results; UI.veil(g, r, .6); UI.panel(g, cx - 100, 30, 200, 110, { focus: true }); UI.title(g, R.wipe ? 'THE PARTY FELL' : 'OUT OF THE RUN', cx, 36, { scale: 2 }); if (hub) UI.text(g, R.wipe ? 'Your party fell. The others run on.' : 'Escaped in ' + fmt(R.time) + '. Waiting for the others.', cx, 70, P2.text, { align: 'center' }); else { UI.text(g, 'Time ' + fmt(R.time), cx, 62, P2.focus, { align: 'center' }); UI.text(g, 'Best ' + (R.best != null ? fmt(R.best) : '--') + (R.newBest ? '  NEW!' : ''), cx, 74, R.newBest ? P2.good : P2.text, { align: 'center' }); UI.text(g, 'Crowns ' + R.crowns + '   Kills ' + R.kills, cx, 86, P2.text, { align: 'center' }); } if (!hub) for (const [id, lab] of [['again', 'Run again'], ['title', 'Title']]) { const q = race.F.items[race.F.index(id)]; if (q) { const sl = race.F.id === id || race.F.items[race.F.cur] === q; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + 4, sl ? P2.focus : P2.text, { align: 'center' }); } } }
        if (hub && B.hub.ended) { UI.veil(g, r, .7); UI.text(g, 'The round is over: ' + (B.hub.ended.reason || 'finished'), cx, r.H / 2, UI.PAL.text, { align: 'center' }); }
      });
    }
  };
  /* ghosts in the world: cloaked rigs lerped to what was reported */
  V.syncGhosts = (dt) => {
    const w = V.cur; if (!w || V.curId !== 'rr') return; V.gh = V.gh || {}; V.ghostPos = V.ghostPos || {};
    if (V.ghWorld !== w) { V.gh = {}; V.ghWorld = w; }
    for (const id in V.gh) if (!B.ghosts[id]) { w.remove(V.gh[id].e); delete V.gh[id]; delete V.ghostPos[id]; }
    for (const id in B.ghosts) { const g = B.ghosts[id]; let o = V.gh[id]; if (!o) { const rig = new E.Humanoid({ size: 1.2, hood: true, hat: undefined, colors: { cloth: g.color, hair: g.color, skin: g.gold ? '#ffe090' : '#c8c8d8', pants: '#2a2a3a' }, speedRef: 60 }); const e = w.mob({ x: g.cx * 32 + 16, y: g.cy * 32 + 16, r: 3, half: 6, mass: 0.1, rig }); e.fade = g.gold ? .55 : .45; e.setSolid(false); o = V.gh[id] = { e }; }
      const tx = g.x != null ? g.x : g.cx * 32 + 16, ty = g.y != null ? g.y : g.cy * 32 + 16; o.e.vx = B.clamp((tx - o.e.x) * 8, -120, 120); o.e.vy = B.clamp((ty - o.e.y) * 8, -120, 120); o.e.facing = Math.atan2(B.DY[g.dir || 0], B.DX[g.dir || 0]); o.e.anim = { expr: 'smile' }; V.ghostPos[id] = { x: o.e.x, y: o.e.y, name: g.name, color: g.color }; }
  };
  const ou = V.update; V.update = (dt) => { ou(dt); try { V.syncGhosts(dt); } catch (e) { } };
})();
