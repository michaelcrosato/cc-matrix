// Willy Fit — hub round scene (Morning Class), scene assembly, deep links, start.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  G.scenes = G.scenes || {};
  G.scenes.session = G.makeSessionScene();
  // ---------- HUB ROUND: Morning Class ----------
  G.scenes.round = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.phase = 'card'; this.card = null; this.info = null; this.started = false;
      this.events = ['stork', 'step', 'slalom']; this.evI = 0; this.evTime = 0; this.evPhase = 'intro';
      this.total = 0; this.ghosts = {}; this.reported = false; this.over = false;
      this.localRig = G.makeRig(G.playerRigOpts());
      this._sendT = 0; this._progT = 0;
      G.setSnap({ scene: 'round' });
      if (window.AIHub && window.AIHub.active) {
        // hub wiring installed in boot wrapper below; scene reads G.hubInfo
        this.info = G.hubInfo || null;
      }
    },
    startEvent(i) {
      const id = this.events[i], def = G.byId[id], tierDef = def.tiers[0];
      let rng = G.rngFrom(1234 + i);
      try { if (window.AIHub && window.AIHub.rng) { const rr = window.AIHub.rng('e' + i); /* seeded fn if provided */ if (typeof rr === 'function') rng = rr; } } catch (e) {}
      const c = G.makeContestant({ input: G.game.input, name: 'You', params: tierDef.params, rng: G.rngFrom(77 + i), local: true });
      this.def = def; this.ctx = { def: def, tier: 1, tierDef: tierDef, rng: rng, time: 0, contestants: [c], mode: 'hub', say: () => {}, instructorName: 'Birch', classMode: false };
      this.ctx.instructorRig = G.makeRig(G.instructorOpts('birch'));
      try { def.setup(this.ctx); } catch (e) {}
      this.evPhase = 'intro'; this.evTime = 0;
    },
    hubTime() { try { return window.AIHub && window.AIHub.time ? window.AIHub.time() : 0; } catch (e) { return 0; } },
    update(dt) {
      const game = G.game;
      if (G.talk.update(dt)) return;
      // card phase: until hub start (time finite)
      if (this.phase === 'card') {
        const ht = this.hubTime();
        if (window.AIHub && window.AIHub.active) {
          if (game.input.pressed('confirm') || game.input.pressed('start')) { try { window.AIHub.answer('ready'); } catch (e) {} }
          if (game.input.pressed('more')) { try { window.AIHub.answer('more'); } catch (e) {} }
          try { const cl = game.input.clicked ? game.input.clicked() : null; if (cl) { if (cl[1] > (game.r ? game.r.H - 40 : 200)) { if (cl[0] < (game.r ? game.r.W / 2 : 160)) window.AIHub.answer('ready'); else window.AIHub.answer('more'); } } } catch (e) {}
          if (ht !== -Infinity && ht !== null && isFinite(ht)) { this.phase = 'play'; this.startEvent(0); }
        } else {
          // offline preview of the round (deep link): start on confirm
          if (game.input.pressed('confirm')) { this.phase = 'play'; this.startEvent(0); this._offlineT = 0; }
        }
        return;
      }
      if (this.phase !== 'play' || this.over) return;
      // progress ~1/s in every round phase (intro, play, scores)
      this._progT -= dt;
      if (this._progT <= 0 && window.AIHub && window.AIHub.progress) { this._progT = 1; try { window.AIHub.progress({ score: this.total, label: this.total + ' pts' }); } catch (e) {} }
      // event timing from hub clock when in session, else local clock
      let elapsed;
      if (window.AIHub && window.AIHub.active) elapsed = Math.max(0, this.hubTime() / 1000);
      else { this._offlineT = (this._offlineT || 0) + dt; elapsed = this._offlineT; }
      // events: each 50s block (5 intro + 40 play + 5 scores) mapped from round elapsed
      const block = 50, idx = Math.min(2, Math.floor(elapsed / block)), within = elapsed - idx * block;
      if (idx !== this.evI) { this.evI = idx; this.startEvent(idx); }
      // ghost send ~10/s in every event phase (intro included)
      this._sendT -= dt;
      if (this._sendT <= 0 && window.AIHub && window.AIHub.send && this.ctx) {
        this._sendT = 0.1;
        try { const c = this.ctx.contestants[0]; const gh = this.def.ghost ? this.def.ghost(this.ctx) : { l: [c.bal.p.x, c.bal.p.y], s: 0 }; window.AIHub.send({ t: 'g', a: this.evI, l: gh.l, p: 0, w: [c.bal.p.x, c.bal.p.y], s: gh.s }, { reliable: false }); } catch (e) {}
      }
      if (within < 5) { this.evPhase = 'intro'; return; }
      if (within >= 45) {
        if (this.evPhase !== 'scores') {
          this.evPhase = 'scores';
          try { const res = this.def.result(this.ctx); this.total += Math.round(res.pct * 1000 / 3); this._lastRes = res; } catch (e) {}
          if (idx >= 2) this.report();
        }
        return;
      }
      this.evPhase = 'play';
      this.ctx.time += dt;
      try { this.def.update(dt, this.ctx); } catch (e) { game.fail('round event', e); }
      G.setSnap({ scene: 'round', activity: this.def.id, pct: this._lastRes ? this._lastRes.pct : 0 });
    },
    report() {
      if (this.reported) return; this.reported = true;
      // include the current event's partial score when time runs out mid-round
      let total = this.total;
      try { if (this.def && this.ctx && this.evPhase === 'play') total += Math.round(this.def.result(this.ctx).pct * 1000 / 3); } catch (e) {}
      this.total = total;
      try {
        if (window.AIHub && window.AIHub.result) window.AIHub.result({ score: total, stats: { Steadiness: Math.round((this._lastRes ? this._lastRes.pct : 0) * 100) + '%' }, awards: [{ title: 'Most Still', detail: 'Morning Class · ' + total + ' pts' }] });
      } catch (e) {}
    },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 90, '#ecd9bd');
      const game = G.game;
      if (this.phase === 'card') {
        const players = (G.hubInfo && G.hubInfo.players) || (window.AIHub && window.AIHub.players) || [{ id: 0, name: 'You', color: '#e8443a' }];
        players.forEach((p, i) => {
          const x = (i - (players.length - 1) / 2) * 34;
          r.groundDisc(x, 6, 12, '#bfeee0');
          r.actor(x, 6, 0, (g, ox, oy) => { const rg = G.makeRig({ size: 1.4, colors: { skin: '#f2c9a4', hair: '#4a3423', cloth: p.color || '#ff7a59', pants: '#3a4a6a', boot: '#3a2e2a' } }); try { rg.draw(g, ox, oy, r.view); rg.update(1 / 120, { x: x, y: 6, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); } catch (e) {} }, {});
          r.textAt(x, 6, 30, (p.name || 'Player') + '', p.color || '#20404c', {});
        });
        r.actor(-40, 16, 0, (g, ox, oy) => G.drawTare(g, ox, oy, game.time, 'happy', 1), {});
        r.overlay(g => {
          E.font.title(g, G.TITLE + ' — Morning Class', r.W / 2, 16, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
          E.font.text(g, 'Stay steadiest over 3 exercises; most points wins', r.W / 2, 48, '#20404c', { align: 'center' });
          E.font.text(g, 'Lean: left stick, WASD or mouse · Breathe: R2, Space or click', r.W / 2, 62, '#5f7f8a', { align: 'center' });
          const cd = this.card;
          if (cd) E.font.text(g, cd.paused ? 'More time asked…' : (cd.left != null ? 'Starts in ' + Math.ceil(cd.left / 1000) + 's' : 'Waiting…'), r.W / 2, 76, '#20404c', { align: 'center' });
          E.ui.box(g, 18, r.H - 34, 120, 20, { bg: '#ffffff', border: '#2cc6e6' }); E.font.text(g, 'Ready (Enter / ✕)', 78, r.H - 28, '#20404c', { align: 'center' });
          E.ui.box(g, r.W - 138, r.H - 34, 120, 20, { bg: '#ffffff', border: '#2cc6e6' }); E.font.text(g, 'More time (△)', r.W - 78, r.H - 28, '#20404c', { align: 'center' });
        });
        return;
      }
      // play: draw current event simply (studio + plate + ghosts)
      const ctx = this.ctx, c = ctx ? ctx.contestants[0] : null;
      if (ctx && c) {
        r.groundDisc(0, 6, 13, '#bfeee0');
        r.actor(0, 6, 0, (g, ox, oy) => { try { c.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
        c.rig.update(1 / 120, { x: 0, y: 6, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
        // ghosts
        for (const id in this.ghosts || {}) {
          const gh = this.ghosts[id];
          if (!gh || gh.a !== this.evI) continue;
          const p = (G.hubInfo && G.hubInfo.players || []).find(pp => String(pp.id) === String(id));
          r.actor(30, 6, 0, (g, ox, oy) => { try { c.rig.draw(g, ox, oy, r.view); } catch (e) {} }, { alpha: 0.5 });
          if (p) r.textAt(30, 6, 32, p.name, p.color || '#20404c', {});
        }
        if (!(this.tierDef && this.tierDef.eyesClosed)) G.drawPlate(r, r.W / 2, r.H - 34, c.bal, {});
        r.overlay(g => {
          E.font.text(g, 'Morning Class · Event ' + (this.evI + 1) + '/3 · ' + this.def.name + ' · ' + this.evPhase, 8, 6, '#20404c', {});
          E.font.text(g, this.total + ' pts', r.W - 8, 6, '#20404c', { align: 'right' });
          if (this.evPhase === 'intro') E.font.text(g, this.def.card, r.W / 2, 40, '#20404c', { align: 'center', wrap: r.W - 40 });
          if (this.evPhase === 'scores' && this._lastRes) E.font.text(g, Math.round(this._lastRes.pct * 100) + '% · ' + this._lastRes.detail, r.W / 2, 40, '#20404c', { align: 'center', scale: 2 });
        });
      }
    }
  };
  // ---------- ASSEMBLY & START ----------
  const scenes = {
    title: G.scenes.title, member: G.scenes.member, arrival: G.scenes.arrival, island: G.scenes.island,
    bodycheck: G.scenes.bodycheck, evening: G.scenes.evening, session: G.scenes.session, games: G.scenes.games,
    ending: G.scenes.ending, credits: G.scenes.credits, about: G.scenes.about, class: G.scenes.class,
    classrun: G.scenes.classrun, classpodium: G.scenes.classpodium, round: G.scenes.round,
    attract: G.scenes.attract, poses: G.scenes.poses
  };
  G.scenesAll = scenes;
  let startScene = 'title';
  try {
    const h = (typeof location !== 'undefined' && location.hash) || '';
    if (G.inSession) startScene = 'round';
    else if (h.startsWith('#act/')) { const parts = h.slice(5).split('/'); G._deepAct = { id: parts[0], tier: parseInt(parts[1] || '1', 10) || 1 }; startScene = 'session'; }
    else if (h.startsWith('#day/')) { G.member.day = clampDay(parseInt(h.slice(5), 10)); startScene = 'island'; }
    else if (h === '#hub') startScene = 'round';
    else if (h === '#ending') startScene = 'ending';
    else if (h === '#island') startScene = 'island';
    else if (h === '#class') startScene = 'class';
  } catch (e) {}
  function clampDay(n) { return Math.max(1, Math.min(6, n || 1)); }
  const bootSteps = G.LINES.boot.map((label, i) => [label, () => { G['boot_' + i] = true; }]);
  G.game.start({ scenes: scenes, scene: startScene, boot: { title: G.TITLE, steps: bootSteps } });
  if (G._deepAct) G.game.go('session', { id: G._deepAct.id, tier: G._deepAct.tier, mode: 'free', from: 'title' });
  // hub wrapper (no-op outside a session)
  if (G.inSession) {
    (async () => {
      try {
        const info = await window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
        if (!info) { G.game.go('title'); return; }
        G.hubInfo = info;
        window.AIHub.on('card', c => { const sc = G.game.scene; if (G.scenes.round) G.scenes.round.cardState = c; const rs = findRound(); if (rs) rs.card = c; });
        window.AIHub.on('start', () => {});
        window.AIHub.on('message', (d, from) => { const rs = findRound(); if (rs && d && d.t === 'g') rs.ghosts[from] = d; });
        window.AIHub.on('leave', (o) => { const rs = findRound(); if (rs && o) delete rs.ghosts[o.id]; });
        window.AIHub.on('time-up', () => { const rs = findRound(); if (rs) rs.report(); });
        window.AIHub.on('end', () => { const rs = findRound(); if (rs) rs.over = true; try { G.game.audio.stopMusic(); G.game.audio.mute(true); G.game.input.clear(); } catch (e) {} });
        await G.game.booted;
        window.AIHub.ready();
      } catch (e) {}
      function findRound() { return G.scenes.round; }
    })();
  }
})();
