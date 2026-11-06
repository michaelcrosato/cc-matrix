// Willy Fit — session scene: Card -> demo -> breathe -> play -> results, for every activity.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function roomColors(room) {
    return { deck: ['#8fd3f4', '#d8f3fb'], iron: ['#e8f2f4', '#ffffff'], pier: ['#8fd3f4', '#ffe9c9'], mount: ['#cfe8f7', '#ffffff'], park: ['#a8dcf0', '#eaf7e9'] }[room] || ['#8fd3f4', '#ffffff'];
  }
  function drawRoomBack(r, def, ctx) {
    r.sky(roomColors(def.room).concat(['#f6fafa']));
    // floor + mats in world space (brawler: y toward camera)
    r.groundDisc(0, 18, 90, def.room === 'mount' ? '#ffffff' : '#ecd9bd');
    r.groundDisc(0, 18, 60, def.room === 'mount' ? '#eef6fb' : '#e8d3ae');
    const n = ctx.contestants.length;
    ctx.contestants.forEach((c, i) => {
      const x = n === 1 ? 0 : (i - (n - 1) / 2) * 34;
      c._wx = x; c._wy = 6;
      r.groundDisc(x, 6, 13, i === 0 ? '#bfeee0' : '#ffe1d6');
      r.groundRing(x, 6, 13, '#2cc6e6');
    });
    if (ctx.instructorRig) r.groundDisc(30, -6, 12, '#f3e6cf');
    // simple props per room
    if (def.room === 'deck') { r.prop('plant', -52, -14, 0, { size: 1.4 }); r.prop('plant', 52, -14, 0, { size: 1.4 }); }
    if (def.room === 'iron') { r.prop('crate', -52, -10, 0, { size: 1.2 }); r.prop('lamp', 52, -12, 0, { size: 1.3, light: true }); }
    if (def.room === 'pier') { r.prop('bench', -54, -8, 0, { size: 1.3 }); r.prop('lamp', 54, -10, 0, { size: 1.3, light: true }); }
    if (def.room === 'park') { r.prop('tree', -56, -12, 0, { size: 1.6 }); r.prop('bush', 56, -10, 0, { size: 1.4 }); }
  }
  function drawRigs(r, def, ctx) {
    const t = ctx.time;
    ctx.contestants.forEach((c, i) => {
      const size = ctx.contestants.length > 1 ? 1.5 : ctx.contestants.length === 2 ? 1.9 : 2.1;
      // rig scale via update size? Humanoid size fixed at creation; draw normally.
      r.actor(c._wx || 0, c._wy || 6, 0, (g, ox, oy) => { try { c.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      c.rig.update(1 / 120, { x: c._wx || 0, y: c._wy || 6, z: 0, vx: 0, vy: 0, facing: c._face != null ? c._face : Math.PI / 2, expr: c.bal && c.bal.stumbleT > 0 ? 'wince' : 'smile' });
    });
    if (ctx.instructorRig) {
      r.actor(30, -6, 0, (g, ox, oy) => { try { ctx.instructorRig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      ctx.instructorRig.update(1 / 120, { x: 30, y: -6, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
    }
    // Tare at side
    r.actor(-38, 14, 0, (g, ox, oy) => G.drawTare(g, ox, oy, t, ctx.tareFace || 'neutral', 1), {});
    r.actor(42, 16, 0, (g, ox, oy) => G.drawGerald(g, ox, oy, t, 0.9), {});
    // family extras
    if (def.family === 'candle') {
      const c = ctx.contestants[0];
      r.actor(0, 16, 0, (g, ox, oy) => {
        const px = E.px, f = (c._flame != null ? c._flame : 1);
        px.rect(g, ox - 3, oy - 6, 6, 6, '#f6fafa'); px.rect(g, ox - 1, oy - 12 - f * 4, 2, 6 + f * 4, '#ffb040');
        px.dot(g, ox, oy - 10 - f * 4, '#fff2b0');
      }, { emissive: true });
      if (c.thought) r.textAt(14, 2, 26, c.thought.txt, '#20404c', {});
      if (ctx.duel) r.textAt(-30, -6, 30, 'Gertrude', '#7a5aa0', {});
    }
    if (def.family === 'hoop') {
      const c = ctx.contestants[0];
      r.textAt(0, 6, 34, (c._av ? c._av.toFixed(1) : '0') + ' rad/s ' + (c._inBand ? 'Just right' : (c._av || 0) < G.DEV.hoopLo ? 'Too slow' : 'Too eager'), '#20404c', {});
    }
    if (def.family === 'tray') {
      const c = ctx.contestants[0];
      r.overlay(g => {
        const px = E.px, cx = r.W / 2, cy = r.H / 2 - 6, w = 150, h = 92;
        px.rect(g, cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6, '#8a6a4a'); px.rect(g, cx - w / 2, cy - h / 2, w, h, '#e8dcc8');
        for (const gl of c.glasses || []) { px.disc(g, cx + gl[0], cy + gl[1], 6, '#bfe8f2'); px.disc(g, cx + gl[0], cy + gl[1], 3, '#eafcff'); }
        for (const b of c.bumpers || []) px.disc(g, cx + b[0], cy + b[1], 5, '#c9b18a');
        for (const o of c.olives || []) { if (o.done) continue; px.disc(g, cx + o.x, cy + o.y, 4, '#6a9a3a'); px.dot(g, cx + o.x - 1, cy + o.y - 1, '#cfe8a8'); }
        if (c.gecko) { px.disc(g, cx + c.gecko.x, cy + c.gecko.y, 4, '#7bc47f'); px.dot(g, cx + c.gecko.x + 3, cy + c.gecko.y, '#20404c'); }
        E.font.text(g, 'Tray ' + (c.trayI + 1) + ' · ' + c.inCount + '/' + c.total, cx, cy - h / 2 - 16, '#20404c', { align: 'center' });
      });
    }
    if (def.family === 'jog') {
      const c = ctx.contestants[0];
      r.overlay(g => {
        const px = E.px, W = r.W, H = r.H;
        px.rect(g, 0, H * 0.42, W, 3, '#49b6c9');
        E.font.text(g, 'Cadence ' + (c._cad ? c._cad.toFixed(1) : '0') + '/s · calm ' + G.DEV.jogLo + '–' + G.DEV.jogHi + (c.stitch > 0 ? ' · STITCH' : ''), W / 2, 26, '#20404c', { align: 'center' });
        for (const o of c.obst || []) { const rel = o.d - c.dist; if (rel < 0 || rel > 160) continue; const s = 1 - rel / 170, sx = W / 2 + o.x * (0.4 + s * 2), sy = H * 0.45 + s * H * 0.3; px.disc(g, sx, sy, 3 + s * 5, o.kind === 'cup' ? '#2cc6e6' : '#9aa5ad'); }
      });
    }
    if (def.family === 'slalom') {
      const c = ctx.contestants[0], course = ctx.course;
      r.overlay(g => {
        const px = E.px, W = r.W, H = r.H;
        for (let i = c.gate; i < Math.min(course.gates.length, c.gate + 4); i++) {
          const dz = (i + 1) * 38 - c.z; if (dz < 0) continue; const s = clamp(1 - dz / 160, 0.15, 1), gx = W / 2 + (course.gates[i] - c.x) * (0.5 + s * 2.2), gy = H * 0.35 + s * H * 0.4, gw = course.gateW * (0.4 + s);
          px.rect(g, gx - gw, gy - 22 * s, 3, 22 * s, '#e0553a'); px.rect(g, gx + gw, gy - 22 * s, 3, 22 * s, '#2cc6e6');
        }
        E.font.text(g, 'Gate ' + Math.min(c.gate + 1, course.gates.length) + '/' + course.gates.length + ' · missed ' + c.missed, W / 2, 26, '#20404c', { align: 'center' });
        if (ctx.tierDef.fog) E.font.text(g, 'Fog. Gently.', W / 2, 38, '#5f7f8a', { align: 'center' });
      });
    }
    if (def.family === 'laundry') {
      const c = ctx.contestants[0];
      r.overlay(g => {
        const px = E.px, W = r.W, H = r.H, base = H * 0.55;
        px.rect(g, 0, base, W, 2, '#8a6a4a');
        for (const p of c.pegs || []) { const sx = W / 2 + (p - c.x) * 1.4; if (sx < -10 || sx > W + 10) continue; px.rect(g, sx - 1, base - 6, 3, 6, '#e0553a'); }
        for (const pxSpan of [180, 360]) { const sx = W / 2 + (pxSpan - c.x) * 1.4; if (sx > 0 && sx < W) px.rect(g, sx, base - 40, 2, 40, '#5f7f8a'); }
        if (c.gustWarn > 0) E.font.text(g, 'Gust coming… (a sock has flown)', W / 2, 30, '#e0553a', { align: 'center' });
        E.font.text(g, 'Span ' + (c.span + 1) + '/3 · ' + Math.round(c.x) + 'm', W / 2, 42, '#20404c', { align: 'center' });
      });
    }
    if (def.family === 'step') {
      const c = ctx.contestants[0];
      r.overlay(g => {
        // note highway: upcoming notes fall toward a line
        const px = E.px, W = r.W, laneX = [W / 2 - 45, W / 2 - 15, W / 2 + 15, W / 2 + 45], lineY = r.H - 70;
        px.rect(g, laneX[0] - 12, lineY, 104, 2, '#2cc6e6');
        const names = ['◀', '▼', '▲', '▶'];
        for (let li = 0; li < 4; li++) E.font.text(g, names[li], laneX[li], lineY + 6, '#20404c', { align: 'center', scale: 2 });
        for (let i = 0; i < (c.notes || []).length; i++) { if (c.hit.has(i)) continue; const n = c.notes[i], dt2 = n.t - ctx.time; if (dt2 < -0.2 || dt2 > 2.4) continue; const y = lineY - dt2 * 55; E.font.text(g, names[n.lane], laneX[n.lane], y, '#ff7a59', { align: 'center', scale: 2 }); }
      });
    }
    if (def.family === 'rep') {
      const c = ctx.contestants[0];
      r.overlay(g => {
        const px = E.px, x = r.W - 44, y0 = 50, y1 = r.H - 70;
        px.rect(g, x, y0, 4, y1 - y0, '#c8dde2');
        const bead = c._bead || 0, dep = clamp(c._depth || 0, -1, 1);
        const by = def.horizontal ? (y0 + y1) / 2 : y1 - bead * (y1 - y0);
        const dy = def.horizontal ? (y0 + y1) / 2 : y1 - clamp(dep, 0, 1) * (y1 - y0);
        if (def.horizontal) { px.disc(g, x + 2 + bead * 0, by, 5, '#2cc6e6'); }
        else { px.disc(g, x + 2, by, 5, '#2cc6e6'); px.disc(g, x + 2, dy, 4, '#ff7a59'); }
        E.font.text(g, 'Rep ' + Math.min((c.rep || 0) + 1, c.totalReps || 1) + '/' + (c.totalReps || 1) + (c._lastJudge ? ' · ' + c._lastJudge : ''), x + 2, y1 + 8, '#20404c', { align: 'center' });
      });
    }
  }
  G.makeSessionScene = function () {
    return {
      pausable: true, view: 'brawler', camera: { zoom: false },
      enter(data) {
        this.data = data || {};
        this.def = G.byId[this.data.id || 'stork'];
        this.tier = this.data.tier || 1;
        const def = this.def, baseTier = def.tiers[this.tier - 1];
        const tierDef = this.data.durOverride ? Object.assign({}, baseTier, { dur: this.data.durOverride }) : baseTier;
        this.tierDef = tierDef; this.durEff = tierDef.dur;
        const seed = data.seed != null ? data.seed : G.seedFor(def.id + ':' + this.tier + ':' + Date.now() % 100000);
        const rng = G.rngFrom(seed);
        this.rng = rng;
        const mk = (input, bot, name, color, local, rigOpts) => G.makeContestant({ input: input, bot: bot, name: name, color: color, local: local, params: tierDef.params, rng: G.rngFrom(seed + name.length * 131), rigOpts: rigOpts });
        let contestants = [];
        if (data.contestants) contestants = data.contestants.map(cd => { const c = mk(cd.input || null, cd.bot || null, cd.name, cd.color, cd.local, cd.rigOpts); c.input = cd.input || null; if (cd.input && !cd.bot) c.device = new G.DeviceIntent(cd.input); return c; });
        else contestants = [mk(G.game.input, data.bot || null, 'You', '#ff7a59', true)];
        // rebind balances with activity params (makeContestant used tier params already)
        this.ctx = {
          def: def, tier: this.tier, tierDef: tierDef, rng: rng, time: 0, contestants: contestants,
          mode: data.mode || 'free', say: (n, l) => G.say(n, l), instructorName: G.member.instructor === 'alder' ? 'Alder' : 'Birch',
          duel: data.duel ? { t: 0, gerFlame: 1 } : null, duelWin: false, classMode: data.mode === 'class', done: false
        };
        this.ctx.instructorRig = G.makeRig(G.instructorOpts(G.member.instructor));
        this.phase = 'card';
        this.phaseT = 0;
        this.pills = new G.Pills(G.game, [{ label: 'Start' }, { label: 'Back' }], { title: def.name + (this.tier > 1 ? ' · Tier ' + this.tier : '') });
        this.result = null; this.starsShown = 0;
        G._restartSession = () => G.game.go('session', this.data);
        G.setSnap({ scene: 'session', activity: def.id, tier: this.tier, pct: 0 });
        if (def.song) G.playSong(def.song);
        G.sfx('boop');
      },
      exit() { G._restartSession = null; },
      update(dt) {
        const game = G.game, def = this.def, ctx = this.ctx;
        if (G.talk.update(dt)) { G.drawDevUpdate && G.updateDev(dt); return; }
        this.phaseT += dt;
        G.updateDev(dt);
        if (G.devOpen) return;
        if (this.phase === 'card') {
          const a = this.pills.update(dt);
          if (a === 'pick') { if (this.pills.i === 0) { this.phase = 'demo'; this.phaseT = 0; G.say(ctx.instructorName, def.id === 'stork' ? 'Watch. Lean into the ring. Then hold.' : 'Watch once. Then we breathe in.'); } else this.leave(); }
          if (a === 'cancel') this.leave();
          return;
        }
        if (this.phase === 'demo') {
          // instructor demonstrates with expert bot balance
          if (!this._demoBot) this._demoBot = G.makeBot('expert', 5);
          const c = ctx.contestants[0];
          const it = this._demoBot.intent(ctx.instructorBal || (ctx.instructorBal = new G.Balance(ctx.tierDef.params, G.rngFrom(3))), dt, { x: 0, y: 0 });
          ctx.instructorBal.step(dt, it.lean);
          if (this.phaseT > 3) { this.phase = 'breathe'; this.phaseT = 0; }
          return;
        }
        if (this.phase === 'breathe') {
          if (this.phaseT > 3) {
            this.phase = 'play'; this.phaseT = 0; ctx.time = 0;
            try { def.setup(ctx); } catch (e) { game.fail('activity setup', e); }
            for (const c of ctx.contestants) { c.bal.onStumble = () => { G.sfx('stumbleS'); try { game.input.rumble && game.input.rumble(0.4, 120); } catch (e) {} }; }
          }
          return;
        }
        if (this.phase === 'play') {
          ctx.time += dt;
          try { def.update(dt, ctx); } catch (e) { game.fail('activity update', e); this.phase = 'results'; this.finish(); return; }
          // ghost send handled by caller scenes via G.hubTick if present
          if (G.hubTick) G.hubTick(dt, ctx);
          let allDone = ctx.contestants.every(c => c.finished);
          if (ctx.duel) allDone = false;
          if (ctx.time >= ctx.tierDef.dur || allDone) { this.finish(); }
          G.setSnap({ scene: 'session', activity: def.id, tier: this.tier, pct: this.livePct() });
          return;
        }
        if (this.phase === 'results') {
          if (this.phaseT > 0.6 && this.starsShown < (this.result ? this.result.stars : 0)) { this.starsShown++; G.sfx('stamp'); G.sting(this.result.stars >= 3 ? 'star3' : this.result.stars === 2 ? 'star2' : 'star1'); }
          const a = this.resultPills.update(dt);
          if (a === 'pick') {
            if (this.resultPills.i === 0) G.game.go('session', Object.assign({}, this.data, { seed: (Date.now() % 100000) }));
            else this.leaveDone();
          }
          if (a === 'cancel') this.leaveDone();
          return;
        }
      },
      livePct() { try { return this.def.result(this.ctx).pct; } catch (e) { return 0; } },
      finish() {
        if (this.phase === 'results') return;
        this.phase = 'results'; this.phaseT = 0;
        let res = { pct: 0, detail: '' };
        try { res = this.def.result(this.ctx); } catch (e) { G.game.fail('activity result', e); }
        // per-contestant scores (Class / hub): evaluate result with each contestant first
        try {
          this.ctx.scores = this.ctx.contestants.map((cc, idx) => {
            if (idx === 0) return Math.round(res.pct * 1000);
            const sub = Object.assign({}, this.ctx, { contestants: [cc].concat(this.ctx.contestants.filter(x => x !== cc)) });
            try { return Math.round(this.def.result(sub).pct * 1000); } catch (e) { return 0; }
          });
          G._lastSessionCtx = this.ctx;
        } catch (e) {}
        const stars = G.starsFor(res.pct, this.def.stars);
        const mode = this.data.mode || 'free';
        let minutes = 0;
        if (mode === 'story' || mode === 'free' || mode === 'games') minutes = G.sessionMinutes(this.def.id, res.pct, stars);
        if (mode === 'story' || mode === 'free') G.recordResult(this.def.id, this.tier, res.pct, stars, minutes);
        else if (mode === 'class' || mode === 'hub') { /* scores only */ }
        else G.member.minutes += 0; // games/duel handled by caller
        if ((mode === 'story') && G.member.sessionsToday < 3) { /* counted in island leave */ }
        this.result = { pct: res.pct, detail: res.detail, stars: stars, minutes: minutes };
        if (mode === 'story' || mode === 'free') G.autosave();
        const line = G.pickLine(G.LINES.tareStars[stars] || G.LINES.tareStars[0]);
        this.tareLine = line;
        this.resultPills = new G.Pills(G.game, [{ label: 'Again' }, { label: 'Done' }], { title: this.def.name });
        G.setSnap({ scene: 'session', activity: this.def.id, tier: this.tier, pct: res.pct, stars: stars, minutes: G.member.minutes });
        if (this.data.onResult) { /* caller polls scene result */ }
      },
      leave() { const cb = this.data.onDone; if (cb) { cb(null); return; } G.game.go(this.data.from || 'island'); },
      leaveDone() {
        const cb = this.data.onDone;
        if (cb) { cb(this.result); return; }
        if ((this.data.mode || 'free') === 'story') {
          G.member.sessionsToday++;
          if (this.def.id === 'stork' && G.member.day === 1 && !G.member._guidedDone) G.member._guidedDone = true;
        }
        G.game.go(this.data.from || 'island');
      },
      draw(r) {
        const def = this.def, ctx = this.ctx, E2 = E;
        drawRoomBack(r, def, ctx);
        drawRigs(r, def, ctx);
        const c0 = ctx.contestants[0];
        // HUD
        r.overlay(g => {
          E.font.text(g, def.name + (this.tier > 1 ? ' T' + this.tier : ''), 8, 6, '#20404c', {});
          if (this.phase === 'play') E.font.text(g, Math.max(0, Math.ceil(ctx.tierDef.dur - ctx.time)) + 's', r.W - 8, 36, '#20404c', { align: 'right' });
          E.font.text(g, 'Day ' + G.member.day + ' · ' + '●'.repeat(G.member.sessionsToday) + '○'.repeat(Math.max(0, 3 - G.member.sessionsToday)), 8, 18, '#5f7f8a', {});
          E.font.text(g, 'Spine ' + G.spineAge().age + ' · ' + Math.round(G.member.minutes) + ' min', r.W - 8, 48, '#5f7f8a', { align: 'right' });
        });
        if (this.phase === 'card') {
          r.overlay(g => {
            E.ui.box(g, 18, 34, r.W - 36, 74, { bg: '#ffffff', border: '#2cc6e6' });
            E.font.text(g, def.card, 26, 42, '#20404c', { wrap: r.W - 52 });
            const best = G.member.best[def.id];
            E.font.text(g, 'Best: ' + (best ? '★'.repeat(best.stars) + ' ' + Math.round(best.pct * 100) + '%' : '—') + ' · Stars at ' + def.stars.map(s => Math.round(s * 100) + '%').join(' / '), 26, 78, '#5f7f8a', {});
            const src = c0 && c0.device ? 'Lean: stick / WASD / mouse' : 'Lean: stick / WASD / mouse';
            E.font.text(g, src + ' · Breath: hold Space / trigger', 26, 90, '#5f7f8a', {});
          });
          this.pills.draw(r);
          G.prompt(r, 'confirm', 'Start');
        } else if (this.phase === 'demo') {
          r.overlay(g => E.font.text(g, ctx.instructorName + ' demonstrates…', r.W / 2, 30, '#20404c', { align: 'center', scale: 2 }));
        } else if (this.phase === 'breathe') {
          const n = 3 - Math.floor(this.phaseT);
          r.overlay(g => { E.font.text(g, 'Breathe in', r.W / 2, r.H / 2 - 30, '#20404c', { align: 'center', scale: 2 }); E.font.title(g, String(Math.max(1, n)), r.W / 2, r.H / 2 - 10, { scale: 4, colors: ['#14a8c8', '#2cc6e6'], align: 'center' }); });
        } else if (this.phase === 'play') {
          // Plates
          if (ctx.contestants.length === 1) {
            if (!(this.tierDef.eyesClosed)) G.drawPlate(r, r.W / 2, r.H - 34, c0.bal, {});
            else {
              r.overlay(g => { E.font.text(g, 'Eyes closed. Listen. Feel the tilt.', r.W / 2, r.H - 44, '#20404c', { align: 'center' }); E.font.text(g, '◀ ' + c0.bal.p.x.toFixed(2) + ' · ' + c0.bal.p.y.toFixed(2) + ' ▶', r.W / 2, r.H - 30, '#5f7f8a', { align: 'center' }); });
              // balance tone
              if (!this._toneT || G.game.time - this._toneT > 0.1) { this._toneT = G.game.time; }
            }
            r.overlay(g => E.font.text(g, G.leanPromptText(c0._lastIntent || { source: 'keyboard' }), 8, r.H - 14, '#5f7f8a', {}));
            if (def.family === 'hold' && c0.bal) { /* ring spot shown via Plate */ }
            if (def.id === 'sunflow') r.overlay(g => { const pose = G.POSES[Math.min(4, Math.floor(ctx.time / 16))]; E.font.text(g, pose.name + ' · breathe ' + Math.round((c0._guide || 0) * 100) + '%', r.W / 2, 30, '#20404c', { align: 'center' }); E.ui.bar(g, r.W / 2 - 40, 42, 80, 6, c0._breathLvl || 0, '#2cc6e6'); });
            if (def.id === 'candle' && ctx.duel) r.overlay(g => { E.font.text(g, 'Your flame ' + Math.round((c0.flame || 0) * 100) + '% · Gertrude ' + Math.round(ctx.duel.gerFlame * 100) + '%', r.W / 2, 30, '#20404c', { align: 'center' }); });
          } else {
            ctx.contestants.forEach((c, i) => { const x = (i + 1) * r.W / (ctx.contestants.length + 1); G.drawPlate(r, x, r.H - 34, c.bal, { r: 16, small: true, label: c.name }); });
          }
          // store last intent source for prompt
          try { const it = c0._lastIntent; } catch (e) {}
        } else if (this.phase === 'results') {
          const res = this.result || { pct: 0, stars: 0, minutes: 0, detail: '' };
          r.overlay(g => {
            E.ui.box(g, r.W / 2 - 85, 36, 170, 86, { bg: '#ffffff', border: '#2cc6e6' });
            E.font.text(g, '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars), r.W / 2, 44, '#e8a020', { align: 'center', scale: 3 });
            E.font.text(g, Math.round(res.pct * 100) + '% · ' + res.detail, r.W / 2, 72, '#20404c', { align: 'center' });
            E.font.text(g, '+' + res.minutes + ' min into Gerald', r.W / 2, 86, '#5f7f8a', { align: 'center' });
            const wl = E.font.wrap('Tare: ' + (this.tareLine || ''), r.W - 60);
            wl.slice(0, 2).forEach((ln, i) => E.font.text(g, ln, r.W / 2, 100 + i * 10, '#20404c', { align: 'center' }));
          });
          this.resultPills.draw(r);
        }
        G.talk.draw(r);
        G.drawDev(r);
      }
    };
  };
})();
