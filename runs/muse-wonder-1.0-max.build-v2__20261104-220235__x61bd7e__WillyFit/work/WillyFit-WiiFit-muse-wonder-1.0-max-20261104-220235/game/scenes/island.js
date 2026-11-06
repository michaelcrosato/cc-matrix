// Willy Fit — island hub, body check, evening recap.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.scenes = G.scenes || {};
  const MATS = [
    { id: 'stork', label: 'Stork Stand', x: 120, y: 60, zone: 'Stillness Deck' },
    { id: 'sunflow', label: 'Sun Flow', x: 150, y: 60, zone: 'Stillness Deck' },
    { id: 'candle', label: 'Quiet Candle', x: 180, y: 60, zone: 'Stillness Deck' },
    { id: 'squat', label: 'Squat Rail', x: 330, y: 110, zone: 'Iron Room' },
    { id: 'pushup', label: 'Push-Up', x: 360, y: 110, zone: 'Iron Room' },
    { id: 'lunge', label: 'Side Lunge', x: 390, y: 110, zone: 'Iron Room' },
    { id: 'step', label: 'Step Class', x: 300, y: 300, zone: 'Aerobics Pier' },
    { id: 'hoop', label: 'Hoop Hips', x: 340, y: 300, zone: 'Aerobics Pier' },
    { id: 'jog', label: 'Coastal Jog', x: 430, y: 320, zone: 'Pier end' },
    { id: 'tray', label: 'Tray Service', x: 170, y: 260, zone: 'Balance Park' },
    { id: 'laundry', label: 'Laundry Line', x: 470, y: 190, zone: 'Laundry Posts' },
    { id: 'slalom', label: 'Slalom Sign', x: 210, y: 260, zone: 'Balance Park' }
  ];
  G.MATS = MATS;
  function buildMap() {
    const rows = [];
    const W = 44, H = 26;
    for (let y = 0; y < H; y++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        if (y < 2 || y >= H - 2 || x < 2 || x >= W - 2) row += '~';
        else if (y === 2 && x > 30) row += '^';
        else if (y > 20) row += '.';
        else row += ',';
      }
      rows.push(row);
    }
    return new E.TileMap({
      rows: rows,
      legend: { '~': 'sea', ',': 'grassT', '.': 'sandT', '^': 'snowT' },
      types: {},
      floorTex: (x, y, tag) => {
        const v = (((x >> 4) + (y >> 4)) % 2 === 0) ? 0 : 7, w = ((x * 7 + y * 13) % 11 === 0) ? 10 : 0;
        if (tag === 'sea') return [73, 182 - w, 201];
        if (tag === 'sandT') return [236 - v, 217 - v, 189 - v];
        if (tag === 'snowT') return [240, 248, 252];
        return [168 - v - w, 205 - v, 150 - v];
      },
      outside: [73, 182, 201]
    });
  }
  G.scenes.island = {
    view: 'threequarter', camera: { zoom: false },
    enter(data) {
      this.t = 0; this.map = buildMap();
      this.hero = new E.Body({ x: 200, y: 200, r: 6 });
      this.rig = G.makeRig(G.playerRigOpts());
      this.tarePos = { x: 185, y: 215 };
      this.walkTarget = null;
      this.near = null; this.hover = null;
      this.npcs = [
        { name: 'Gertrude', x: 140, y: 120, rig: G.makeRig({ size: 1.2, hair: 'long', hat: { style: 'cap', color: '#c9a8e8' }, outfit: 'shirt', colors: { skin: '#f2c9a4', hair: '#e8e0f0', cloth: '#c9a8e8', pants: '#8a7aa8', boot: '#5a4a6a' } }) },
        { name: 'Dennis', x: 280, y: 210, rig: G.makeRig({ size: 1.25, hair: 'short', colors: { skin: '#c98d64', hair: '#2a2a2a', cloth: '#f2e3a1', pants: '#4a6a8a', boot: '#3a2e2a' } }) },
        { name: 'Marisol', x: 320, y: 260, rig: G.makeRig({ size: 1.25, hair: 'ponytail', hat: { style: 'band', color: '#e0553a' }, colors: { skin: '#a06a42', hair: '#1a1a1a', cloth: '#e0553a', pants: '#2a2a3a', boot: '#222222' } }) },
        { name: 'Lou', x: 250, y: 290, rig: G.makeRig({ size: 1.25, hair: 'bald', colors: { skin: '#e8b48a', hair: '#888888', cloth: '#7fb3c8', pants: '#5a6a7a', boot: '#3a3a3a' } }) }
      ];
      // dawn autosave + day beats
      if (data && data.dawn) { G.autosave(); }
      if (G.member.day === 5 && !G.member._gamesPrompted) { /* Games mat glows */ }
      G.playSong(G.member.sessionsToday >= 2 ? 'islandPM' : 'islandAM');
      try { G.game.lights.enabled = true; G.game.lights.ambient = G.member.sessionsToday >= 2 ? 0.62 : 0.92; } catch (e) {}
      G.setSnap({ scene: 'island', day: G.member.day });
      if (data && data.tareLine) G.say('Tare', data.tareLine);
    },
    update(dt) {
      const game = G.game;
      this.t += dt;
      if (G.talk.update(dt)) { G.updateDev(dt); return; }
      G.updateDev(dt); if (G.devOpen) return;
      const inp = game.input;
      // voice volume apply
      try { game.audio.voiceVolume = game.settings.voice != null ? game.settings.voice : 0.8; game.audio.applyVolume && game.audio.applyVolume(); } catch (e) {}
      const m = inp.move ? inp.move() : [0, 0];
      const gd = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(m[0], m[1]) : m;
      let moving = Math.hypot(gd[0], gd[1]) > 0.1;
      if (moving) { this.walkTarget = null; this.hero.vx = gd[0] * 85; this.hero.vy = gd[1] * 85; this.hero.facing = Math.atan2(gd[1], gd[0]); }
      else if (this.walkTarget) {
        const dx = this.walkTarget[0] - this.hero.x, dy = this.walkTarget[1] - this.hero.y, d = Math.hypot(dx, dy);
        if (d < 5) { this.walkTarget = null; this.hero.vx = 0; this.hero.vy = 0; if (this._walkAct) { const a = this._walkAct; this._walkAct = null; a(); } }
        else { this.hero.vx = dx / d * 85; this.hero.vy = dy / d * 85; this.hero.facing = Math.atan2(dy, dx); moving = true; }
      } else { this.hero.vx = 0; this.hero.vy = 0; }
      this.hero.x = clamp(this.hero.x, 40, 660); this.hero.y = clamp(this.hero.y, 40, 380);
      try { this.hero.update(dt, this.map); } catch (e) { this.hero.x += this.hero.vx * dt; this.hero.y += this.hero.vy * dt; }
      game.focus(this.hero.x, this.hero.y, 8);
      // Tare hops behind
      const tdx = this.hero.x - 18 - this.tarePos.x, tdy = this.hero.y + 14 - this.tarePos.y;
      this.tarePos.x += tdx * Math.min(1, dt * 2); this.tarePos.y += tdy * Math.min(1, dt * 2);
      // near interactable
      const spots = this.spots();
      this.near = null;
      for (const s of spots) if (Math.hypot(this.hero.x - s.x, this.hero.y - s.y) < 22) this.near = s;
      // mouse hover + click
      try {
        const pt = inp.pointer ? inp.pointer() : null;
        if (pt) { const pick = game.r && game.r.pick ? game.r.pick(pt[0], pt[1]) : null; this.hover = pick; }
        const cl = inp.clicked ? inp.clicked() : null;
        if (cl) {
          const gnd = game.mouseGround ? game.mouseGround() : null;
          if (gnd) {
            let act = null;
            for (const s of spots) if (Math.hypot(gnd[0] - s.x, gnd[1] - s.y) < 24) act = s;
            if (act) { this.walkTarget = [act.x, act.y]; this._walkAct = () => this.activate(act); }
            else this.walkTarget = [gnd[0], gnd[1]];
          }
        }
      } catch (e) {}
      if (this.near && inp.pressed('interact')) this.activate(this.near);
      if (this.near && inp.pressed('confirm')) this.activate(this.near);
      // rigs
      const spd = Math.hypot(this.hero.vx, this.hero.vy);
      if (spd > 5) G.setClipPose(this.rig, 'CMU:Walk_Loop', this.t * 1.6);
      else G.setClipPose(this.rig, 'Idle_Subtle', this.t);
      // NPC idle lines on interact handled via spots; idle Tare quips rarely
      if (!this._idleT) this._idleT = 0; this._idleT += dt;
      if (this._idleT > 45) { this._idleT = 0; G.say('Tare', G.pickLine(G.LINES.tareIdle)); }
    },
    spots() {
      const unlock = G.unlockedActivities();
      const sug = G.suggestionOfDay();
      const list = [{ kind: 'bed', label: 'Bed (end day)', x: 90, y: 170 }, { kind: 'rail', label: 'Wardrobe rail', x: 110, y: 185 }, { kind: 'bodycheck', label: 'Body Check (step on Tare)', x: 230, y: 150 }, { kind: 'reception', label: 'Reception', x: 240, y: 130 }];
      if (G.member.day >= 5 || G.member.freePlay) list.push({ kind: 'games', label: 'The Gentle Games', x: 260, y: 240 });
      for (const mt of MATS) if (unlock[mt.id]) list.push({ kind: 'mat', id: mt.id, label: mt.label + (mt.id === sug ? ' ★ Suggestion' : ''), x: mt.x, y: mt.y });
      for (const n of this.npcs || []) list.push({ kind: 'npc', name: n.name, label: n.name, x: n.x, y: n.y });
      list.push({ kind: 'juice', label: 'Juice Bar (Dennis)', x: 285, y: 205 });
      return list;
    },
    activate(s) {
      const game = G.game;
      if (!s) return;
      if (s.kind === 'bed') { game.go('evening'); return; }
      if (s.kind === 'bodycheck') { game.go('bodycheck'); return; }
      if (s.kind === 'games') { game.go('games'); return; }
      if (s.kind === 'rail') { G.say('Tare', 'The rail holds your ' + (G.member.minutes >= 25 ? "Gertrude's Spare Hat" : G.member.minutes >= 15 ? 'Sunhat' : G.member.minutes >= 10 ? 'Headband' : G.member.minutes >= 5 ? 'Towel' : 'hopes') + '. Gerald holds the rest.'); return; }
      if (s.kind === 'reception') {
        if (G.member.day === 4 && !G.member._tareDayDone) { G.member._tareDayDone = true; G.say('Tare', ['This is my recalibration. Please press confirm to read the big scale.', G.LINES.tareDay]); return; }
        G.say('Tare', G.pickLine(G.LINES.tareIdle)); return;
      }
      if (s.kind === 'juice') { G.say('Dennis', G.pickLine(G.LINES.regulars.dennis)); return; }
      if (s.kind === 'npc') {
        const key = { Gertrude: 'gertrude', Dennis: 'dennis', Marisol: 'marisol', Lou: 'lou' }[s.name];
        if (key) G.say(s.name, G.pickLine(G.LINES.regulars[key]));
        return;
      }
      if (s.kind === 'mat') {
        if (G.member.sessionsToday >= 3 && !G.member.freePlay) { G.say('Tare', 'That is three sessions. The bed is feeling noticed. You may still visit, in Free Play spirit.'); }
        const tier = G.tierUnlocked(G.member, s.id, 2) && (G.member.best[s.id] && G.member.best[s.id].stars >= 2) ? 2 : 1;
        // tier choice: if tier2 unlocked, alternate by holding? Simple: tier 2 if best>=2 else 1; Dev can jump.
        game.go('session', { id: s.id, tier: tier, mode: G.member.freePlay ? 'free' : 'story', from: 'island' });
      }
    },
    draw(r) {
      try { this.map.drawFloor(r); } catch (e) { r.sky(['#8fd3f4', '#a8dcf0']); r.groundDisc(350, 200, 400, '#a8cda0'); }
      // signs & mats (labels only for the spot you are near; the prompt names it)
      for (const s of this.spots()) {
        const isMat = s.kind === 'mat', sug = s.label.includes('★');
        r.groundDisc(s.x, s.y, isMat ? 13 : 9, s.kind === 'bed' ? '#d9c8f0' : s.kind === 'games' ? '#ffd76a' : sug ? '#ffe9a8' : '#bfeee0');
        r.groundRing(s.x, s.y, isMat ? 13 : 9, this.near === s ? '#ff7a59' : '#2cc6e6');
        if (sug && isMat) r.textAt(s.x, s.y, 20, '★', '#e8a020', {});
      }
      r.textAt(350, 36, 10, 'Institute for Gentle Improvement · Gently, Or Not At All', '#20404c', {});
      r.textAt(120, 52, 10, 'Stillness Deck', '#5f7f8a', {});
      r.textAt(360, 92, 10, 'Iron Room', '#5f7f8a', {});
      r.textAt(320, 282, 10, 'Aerobics Pier', '#5f7f8a', {});
      r.textAt(190, 242, 10, 'Balance Park', '#5f7f8a', {});
      r.textAt(470, 175, 10, 'Laundry: 10:30 daily. Do not walk on it.', '#5f7f8a', {});
      // NPCs
      for (const n of this.npcs) {
        if (n.name === 'Lou') G.setClipPose(n.rig, 'Sleeping', 0);
        else G.setClipPose(n.rig, 'Idle_Subtle', this.t + n.x);
        r.shadow(n.x, n.y, 6);
        r.actor(n.x, n.y, 0, (g, ox, oy) => { try { n.rig.draw(g, ox, oy, r.view); } catch (e) {} }, { pick: n });
        n.rig.update(1 / 120, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      }
      r.shadow(this.hero.x, this.hero.y, 6);
      r.actor(this.hero.x, this.hero.y, 0, (g, ox, oy) => { try { this.rig.draw(g, ox, oy, r.view); } catch (e) {} }, { pick: this.hero });
      this.rig.update(1 / 120, { x: this.hero.x, y: this.hero.y, z: 0, vx: this.hero.vx, vy: this.hero.vy, facing: Math.PI / 2, expr: 'smile' });
      r.actor(this.tarePos.x, this.tarePos.y, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'neutral', 1), { pick: 'tare' });
      // HUD
      r.overlay(g => {
        E.font.text(g, 'Day ' + G.member.day + ' · ' + (G.member.freePlay ? 'Free Play' : ''), 8, 6, '#20404c', {});
        E.font.text(g, 'Sessions ' + '●'.repeat(G.member.sessionsToday) + '○'.repeat(Math.max(0, 3 - G.member.sessionsToday)), 8, 18, '#20404c', {});
        // right HUD sits below the corner buttons (game.cornerArea)
        E.font.text(g, 'Spine Age ' + G.spineAge().age, r.W - 8, 64, '#20404c', { align: 'right' });
        E.font.text(g, Math.round(G.member.minutes) + ' min · Gerald', r.W - 8, 76, '#20404c', { align: 'right' });
        if (this.near) E.font.text(g, this.near.label, r.W / 2, r.H - 28, '#20404c', { align: 'center', scale: 2 });
      });
      if (this.near) G.prompt(r, 'interact', this.near.label.split('(')[0]);
      G.talk.draw(r); G.drawDev(r);
    }
  };
  // ---------- BODY CHECK ----------
  G.scenes.bodycheck = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.phase = 'hop'; this.t = 0; this.phaseT = 0;
      this.bal = new G.Balance({ k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: 0.20 }, G.rngFrom(Date.now() % 100000));
      this.device = new G.DeviceIntent(G.game.input);
      this.rig = G.makeRig(G.playerRigOpts());
      this.dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; this.dirI = 0; this.holdT = 0; this.stillSum = 0; this.stillN = 0;
      const qi = (G.member.day + G.member.sessionsTotal) % G.LINES.questions.length;
      this.question = G.LINES.questions[qi];
      this.pills = null;
      G.playSong('studio');
      G.say('Tare', 'Body Check. Please step on me. Gently. With intent.');
      G.setSnap({ scene: 'bodycheck', day: G.member.day });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) { G.updateDev(dt); return; }
      G.updateDev(dt); if (G.devOpen) return;
      const game = G.game;
      const it = this.device.read(dt, game);
      this._it = it;
      if (this.phase === 'hop') {
        if (game.input.pressed('confirm')) { G.sfx('boop'); this.phase = 'still'; this.phaseT = 0; G.say('Tare', 'Please stand still. Stiller. That was the wrong way.'); }
        return;
      }
      this.phaseT += dt;
      if (this.phase === 'still') {
        this.bal.ring.x = 0; this.bal.ring.y = 0; this.bal.step(dt, it.lean);
        this.stillSum += (Math.hypot(this.bal.p.x, this.bal.p.y) <= this.bal.ringR() ? 1 : 0); this.stillN++;
        if (this.phaseT > 5) { this.phase = 'lean'; this.phaseT = 0; this.dirI = 0; this.holdT = 0; G.say('Tare', 'Now lean where I ask. Four directions. One second each.'); }
        return;
      }
      if (this.phase === 'lean') {
        const d = this.dirs[this.dirI];
        this.bal.ring.x = d[0] * 0.5; this.bal.ring.y = d[1] * 0.5;
        this.bal.step(dt, it.lean);
        const inR = Math.hypot(this.bal.p.x - this.bal.ring.x, this.bal.p.y - this.bal.ring.y) <= this.bal.ringR() + 0.08;
        this.holdT = inR ? this.holdT + dt : 0;
        if (this.holdT > 1) { this.dirI++; this.holdT = 0; G.sfx('chime'); if (this.dirI >= 4) { this.phase = 'question'; this.pills = new G.Pills(game, this.question.a.map(a => ({ label: a })), { title: this.question.q, y: 150 }); } }
        return;
      }
      if (this.phase === 'question') {
        const a = this.pills.update(dt);
        if (a === 'pick') { this.phase = 'reading'; this.phaseT = 0; this.finishReading(); }
        return;
      }
      if (this.phase === 'reading') {
        if (game.input.pressed('confirm')) game.go('island');
        return;
      }
    },
    finishReading() {
      const rng = G.rngFrom(G.seedFor(G.member.nickname + G.member.day));
      this.ducks = (8 + rng() * 6).toFixed(1);
      const sp = G.spineAge();
      // Day 3 plateau: hold yesterday's age (history not appended change)
      if (G.member.day === 3 && G.member.spineHistory.length) { this.shownAge = G.member.spineHistory[G.member.spineHistory.length - 1]; }
      else this.shownAge = sp.age;
      if (!G.member.spineHistory.length || G.member.spineHistory[G.member.spineHistory.length - 1] !== this.shownAge || G.member.day !== 3) {
        if (G.member._lastBcDay !== G.member.day) { G.member.spineHistory.push(sp.age); if (G.member.spineHistory.length > 8) G.member.spineHistory.shift(); G.member._lastBcDay = G.member.day; }
      }
      this.suggestion = G.suggestionOfDay();
      G.autosave();
    },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 90, '#ecd9bd');
      r.actor(0, 8, 0, (g, ox, oy) => { try { this.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      this.rig.wob = [this.bal.p.x, this.bal.p.y];
      G.setClipPose(this.rig, 'Idle_Subtle', this.t);
      this.rig.update(1 / 120, { x: 0, y: 8, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      r.actor(-30, 16, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'neutral', 1.4), {});
      r.overlay(g => {
        E.font.title(g, 'Body Check', r.W / 2, 18, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        if (this.phase === 'hop') E.font.text(g, 'Press confirm to step on Tare (hop, boop)', r.W / 2, 130, '#20404c', { align: 'center', scale: 2 });
        if (this.phase === 'still') E.font.text(g, 'Stillness Test · ' + Math.max(0, 5 - this.phaseT).toFixed(0) + 's', r.W / 2, 40, '#20404c', { align: 'center' });
        if (this.phase === 'lean') E.font.text(g, 'Lean: ' + ['Right', 'Forward', 'Left', 'Back'][this.dirI] + ' · hold ' + this.holdT.toFixed(1) + '/1s', r.W / 2, 40, '#20404c', { align: 'center' });
        if (this.phase === 'reading') {
          E.ui.box(g, 24, 44, r.W - 48, 92, { bg: '#ffffff', border: '#2cc6e6' });
          E.font.text(g, 'Today you weigh ' + this.ducks + ' ducks. That is a normal number of ducks.', 32, 54, '#20404c', { wrap: r.W - 64 });
          E.font.text(g, 'Spine Age ' + this.shownAge, r.W / 2, 78, '#20404c', { align: 'center', scale: 3 });
          const hist = G.member.spineHistory;
          hist.forEach((a, i) => { const x = r.W / 2 + (i - (hist.length - 1) / 2) * 16, y = 108 - (71 - a) * 0.5; E.px.disc(g, x, clamp(y, 96, 118), 2, '#2cc6e6'); });
          const sugName = (G.byId[this.suggestion] || {}).name || this.suggestion;
          E.font.text(g, "Tare's Suggestion today: " + sugName + ' (×1.5 minutes)', r.W / 2, 122, '#5f7f8a', { align: 'center' });
          if (G.member.day === 3) E.font.text(g, G.LINES.plateau, r.W / 2, 132, '#5f7f8a', { align: 'center' });
        }
      });
      if (this.phase === 'still' || this.phase === 'lean') G.drawPlate(r, r.W / 2, r.H - 34, this.bal, {});
      if (this.phase === 'question' && this.pills) this.pills.draw(r);
      if (this.phase === 'hop') G.prompt(r, 'confirm', 'Step on');
      if (this.phase === 'reading') G.prompt(r, 'confirm', 'To the island');
      G.talk.draw(r); G.drawDev(r);
    }
  };
  // ---------- EVENING ----------
  G.scenes.evening = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.t = 0;
      this.sp = G.spineAge();
      this.early = G.member.sessionsToday < 3;
      G.playSong('islandPM');
      if (this.early) G.say('Tare', 'Going to bed early? That is also a posture. I support it horizontally.');
      else G.say('Tare', G.pickLine(G.LINES.tareNight));
      this.pills = new G.Pills(G.game, [{ label: 'Sleep →' }], { y: 168 });
      G.setSnap({ scene: 'evening', day: G.member.day });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      const a = this.pills.update(dt);
      if (a === 'pick') {
        const m = G.member;
        if (m.day >= 5 && !m.freePlay) {
          // after Day 5 evening -> Free Play days continue
          m.freePlay = true; m.day = 6; m.sessionsToday = 0;
          G.autosave(); G.game.go('island', { dawn: true });
        } else {
          m.day++; m.sessionsToday = 0;
          G.autosave();
          if (m.day === 5) G.say('Tare', 'Tomorrow is the Gentle Games. Please hydrate your spine.');
          G.game.go('island', { dawn: true, tareLine: G.member.day === 4 ? 'Tare\'s Day. The big scale is ready when you are.' : null });
        }
      }
    },
    draw(r) {
      r.sky(['#f2b880', '#f7d9a8', '#f6fafa']); r.groundDisc(0, 18, 90, '#d9bd96');
      r.actor(30, 16, 0, (g, ox, oy) => G.drawGerald(g, ox, oy, this.t, 1.1), {});
      r.actor(-30, 16, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'asleep', 1.1), {});
      r.overlay(g => {
        E.font.title(g, 'Evening Recap', r.W / 2, 22, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        E.font.text(g, 'Day ' + G.member.day + ' complete · ' + G.member.sessionsToday + '/3 sessions', r.W / 2, 58, '#20404c', { align: 'center', scale: 2 });
        E.font.text(g, 'Spine Age ' + this.sp.age, r.W / 2, 78, '#20404c', { align: 'center', scale: 3 });
        const petals = this.sp.petals;
        E.font.text(g, 'Stillness ' + petals.Stillness + ' · Strength ' + petals.Strength + ' · Cardio ' + petals.Cardio + ' · Balance ' + petals.Balance, r.W / 2, 104, '#5f7f8a', { align: 'center' });
        E.font.text(g, Math.round(G.member.minutes) + ' minutes in Gerald' + (G.member.minutes >= 30 ? ' · Gerald has a friend now.' : ''), r.W / 2, 118, '#5f7f8a', { align: 'center' });
        if (G.game.settings.tips) E.font.text(g, G.pickLine(G.LINES.tips), r.W / 2, 132, '#5f7f8a', { align: 'center' });
        const hist = G.member.spineHistory;
        hist.forEach((a, i) => { const x = r.W / 2 + (i - (hist.length - 1) / 2) * 16, y = 152 - (71 - a) * 0.4; E.px.disc(g, x, clamp(y, 138, 158), 2, '#2cc6e6'); });
      });
      this.pills.draw(r);
      G.talk.draw(r); G.drawDev(r);
    }
  };
})();
