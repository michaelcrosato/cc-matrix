// Willy Fit — Gentle Games chain, Ending/Credits, About, Class, Attract.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  G.scenes = G.scenes || {};
  // ---------- GENTLE GAMES ----------
  G.scenes.games = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      const step = G._gamesStep || 0;
      const steps = [
        { id: 'stork', tier: 1, dur: 20, label: 'Stork Stand (short)' },
        { id: 'step', tier: 1, dur: 20, label: 'Step Class (short)' },
        { id: 'slalom', tier: 1, dur: 40, label: 'Slalom (short)' }
      ];
      if (step < steps.length) {
        const s = steps[step];
        G.say('Tare', 'The Gentle Games. ' + s.label + '. The bunting is up. So are expectations. Gently.');
        G.game.go('session', { id: s.id, tier: s.tier, mode: 'games', durOverride: s.dur, from: 'games', onDone: () => { G._gamesStep = step + 1; G.game.go('games'); } });
      } else if (step === steps.length) {
        G.say('Tare', 'The Grand Stillness. Ninety seconds. Gertrude is on the raft. The goose is a professional.');
        G.game.go('session', { id: 'candle', tier: 1, mode: 'games', durOverride: 90, duel: true, from: 'games', onDone: (res) => {
          const sc = G.game.scene;
          G.member.grandWin = !!(sc && sc.ctx && sc.ctx.duelWin);
          G._gamesStep = step + 1;
          G.game.go('games');
        } });
      } else {
        G._gamesStep = 0;
        G.game.go('ending');
      }
    },
    update(dt) { if (G.talk.update(dt)) return; },
    draw(r) { r.sky(['#f7d9a8', '#f6fafa']); r.overlay(g => E.font.text(g, 'The Gentle Games…', r.W / 2, r.H / 2, '#20404c', { align: 'center', scale: 2 })); G.talk.draw(r); }
  };
  // ---------- ENDING + CREDITS ----------
  G.scenes.ending = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.t = 0; this.stage = 0;
      this.age = G.spineAge().age;
      G.playSong('ending');
      G.say('Tare', G.LINES.endingReveal.slice());
      this.pills = new G.Pills(G.game, [{ label: 'Credits →' }], { y: 170 });
      G.setSnap({ scene: 'ending', spineAge: this.age });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      if (this.stage === 0 && !G.talk.open) {
        this.stage = 1;
        let extra = 'Come back. Please. I mean that in a wellness way.';
        if (this.age <= 24) extra = "Gertrude gives you the hat. It fits. Everything fits, at Spine Age " + this.age + '.';
        else if (this.age <= 45) extra = 'Your spine has stopped asking questions.';
        G.say('Tare', extra);
        return;
      }
      if (this.stage === 1 && !G.talk.open) this.stage = 2;
      if (this.stage === 2) {
        const a = this.pills.update(dt);
        if (a === 'pick') { G.member.freePlay = true; G.autosave(); G.game.go('credits'); }
      }
    },
    draw(r) {
      r.sky(['#f2b880', '#f7d9a8', '#f6fafa']); r.groundDisc(0, 18, 90, '#d9bd96');
      r.actor(0, 14, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'happy', 1.5), {});
      r.overlay(g => {
        E.font.title(g, 'Thank You For Standing', r.W / 2, 24, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        E.font.text(g, 'Final Spine Age ' + this.age + ' · Gertrude is 19. She waved.', r.W / 2, 60, '#20404c', { align: 'center', scale: 2 });
        E.font.text(g, 'Free Play is open. The island keeps its hours.', r.W / 2, 78, '#5f7f8a', { align: 'center' });
      });
      if (this.stage === 2) this.pills.draw(r);
      G.talk.draw(r); G.drawDev(r);
    }
  };
  G.scenes.credits = {
    view: 'brawler', camera: { zoom: false },
    enter() { this.pills = new G.Pills(G.game, [{ label: 'To Title' }, { label: 'To Island (Free Play)' }], { y: 180 }); G.sting('daydone'); },
    update(dt) { if (G.talk.update(dt)) return; G.updateDev(dt); const a = this.pills.update(dt); if (a === 'pick') G.game.go(this.pills.i === 0 ? 'title' : 'island'); },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']);
      r.overlay(g => {
        E.font.title(g, 'Credits', r.W / 2, 20, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        const lines = ['Willy Fit — a gentle comedy in five days', 'Engine: my-3D2dge (handoff build)', 'Motion: Mesh2Motion and Quaternius (CC0)', 'CMU Graphics Lab Motion Capture Database', 'All music, sounds and voices written in code', 'Tare was played by a scale. Gerald by ceramic.', 'No bodies were made fun of. Several postures were.'];
        lines.forEach((ln, i) => E.font.text(g, ln, r.W / 2, 52 + i * 12, '#20404c', { align: 'center' }));
      });
      this.pills.draw(r); G.drawDev(r);
    }
  };
  // ---------- ABOUT ----------
  function aboutPages() {
    const A = G.ABOUT || null;
    const si = A ? A.sourceInformation : { date: '2026-11-04 22:02:35', source: 'Wii Fit', plan: 'PLAN.md', genre: 'Sports', perspective: 'Brawler / three-quarter / Mode 7-style / pseudo-3D / side by activity', tech: 'my-3D2dge handoff engine, Mocap FITCLIPS, AI Hub session client 1.4.0', artDirection: 'Engine-native pixel 3D puppets in bright daylight', animation: 'Mocap clips on Humanoid rigs plus hand-posed bodies', audio: 'All code: songs, sfx, Animalese babble; music 10%', online: 'AI Hub ghost sessions 1-4 plus local Class 2-4', testing: 'Headless rules + browser + hub harness', research: 'Plan recipes only', environment: 'Muse Code CLI (headless); Linux', model: 'Meta, muse-wonder-1.0, reasoning effort max', usage: 'added on import' };
    const tf = A ? A.testingFeedback : ['See exit-interview.json', 'unknown', 'unknown', 'unknown'];
    const ef = A ? A.engineFeedback : ['See exit-interview.json', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'];
    const pf = A ? A.promptFeedback : ['See exit-interview.json', 'unknown', 'unknown', 'unknown'];
    const order = [['Date', 'date'], ['Source', 'source'], ['Plan', 'plan'], ['Genre and Perspective', 'genre'], ['Tech', 'tech'], ['Art Direction', 'artDirection'], ['Animation', 'animation'], ['Audio', 'audio'], ['Online', 'online'], ['Testing', 'testing'], ['Research', 'research'], ['Environment', 'environment'], ['Model', 'model'], ['Usage', 'usage']];
    const pages = [];
    pages.push({ title: 'Source Information', lines: order.map(([label, k]) => label + ': ' + (k === 'genre' ? (si.genre + ' · ' + (si.perspective || '')) : (si[k] || 'unknown'))) });
    const qT = ['Issues caught?', 'Critical?', 'Most helpful test?', 'Least helpful test?'];
    pages.push({ title: 'Testing Feedback', lines: tf.map((v, i) => (qT[i] || '') + ' ' + v) });
    const qE = ['Liked most?', 'Stuck / guessed wrong?', 'Built yourself?', 'Hardest part?', 'Engine changed?', 'One change?'];
    pages.push({ title: 'Engine Feedback', lines: ef.map((v, i) => (qE[i] || '') + ' ' + v) });
    const qP = ['Liked most?', 'Confusing?', 'Hardest?', 'Change?'];
    pages.push({ title: 'Prompt Feedback', lines: pf.map((v, i) => (qP[i] || '') + ' ' + v) });
    pages.push({ title: 'Credits', lines: ['Engine: my-3D2dge', 'Mesh2Motion and Quaternius, CC0', 'CMU Graphics Lab Motion Capture Database', 'Asset store sources via engine library', 'Voices: code gibberish. Music: code, at 10%.'] });
    return pages;
  }
  G.scenes.about = {
    view: 'brawler', camera: { zoom: false },
    enter() { this.pages = aboutPages(); this.i = 0; this.pills = new G.Pills(G.game, [{ label: '◀ Prev' }, { label: 'Next ▶' }, { label: 'Done' }], { horizontal: true, y: 200 }); },
    update(dt) {
      if (G.talk.update(dt)) return; G.updateDev(dt); if (G.devOpen) return;
      const a = this.pills.update(dt);
      if (a === 'pick') { if (this.pills.i === 0) this.i = Math.max(0, this.i - 1); if (this.pills.i === 1) this.i = Math.min(this.pages.length - 1, this.i + 1); if (this.pills.i === 2) G.game.go('title'); }
      if (a === 'cancel') G.game.go('title');
    },
    draw(r) {
      r.sky(['#f6fafa', '#eaf6f8']);
      const p = this.pages[this.i];
      r.overlay(g => {
        E.ui.box(g, 14, 14, r.W - 28, 168, { bg: '#ffffff', border: '#2cc6e6' });
        E.font.text(g, p.title + '  (' + (this.i + 1) + '/' + this.pages.length + ')', 22, 22, '#20404c', { scale: 2 });
        let y = 42;
        for (const ln of p.lines) { const wrapped = E.font.wrap(ln, r.W - 52); for (const w of wrapped.slice(0, 2)) { E.font.text(g, w, 22, y, '#20404c', {}); y += 10; } y += 2; if (y > 168) break; }
      });
      this.pills.draw(r); G.drawDev(r);
    }
  };
  // ---------- CLASS ----------
  G.scenes.class = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.t = 0;
      try { G.game.allowJoin({ max: 4, onJoin: (inp, n) => { try { G.game.input; } catch (e) {} } }); } catch (e) {}
      this.acts = ['stork', 'candle', 'squat', 'step', 'hoop'];
      this.ai = 0; this.rounds = 1;
      this.pills = new G.Pills(G.game, [{ label: 'Activity: Stork Stand' }, { label: 'Rounds: 1' }, { label: 'Start Class →' }, { label: 'Back' }], { y: 120, title: 'Class — join with Start (pad) or 2 (keys)' });
      G.setSnap({ scene: 'class' });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return; G.updateDev(dt); if (G.devOpen) return;
      const a = this.pills.update(dt);
      if (a === 'pick') {
        if (this.pills.i === 0) { this.ai = (this.ai + 1) % (this.acts.length + 1); this.pills.items[0].label = 'Activity: ' + (this.ai >= this.acts.length ? 'Surprise me (3 rounds)' : G.byId[this.acts[this.ai]].name); }
        else if (this.pills.i === 1) { this.rounds = this.rounds === 1 ? 3 : 1; this.pills.items[1].label = 'Rounds: ' + this.rounds; }
        else if (this.pills.i === 2) { this.startClass(); return; }
        else if (this.pills.i === 3) { G.game.go('title'); return; }
      }
      if (a === 'cancel') G.game.go('title');
    },
    startClass() {
      const players = G.game.players || [G.game.input];
      const names = ['You (P1)', 'P2', 'P3', 'P4'];
      const defs = [];
      for (let i = 0; i < 4; i++) {
        if (players[i]) defs.push({ input: players[i], name: names[i] || ('P' + (i + 1)), color: E.PLAYER_COLORS[i], local: i === 0 });
        else defs.push({ bot: ['average', 'good', 'poor', 'expert'][i % 4], name: ['Gertrude', 'Marisol', 'Mr. Okafor', 'Young Kevin'][i % 4] + ' (Regular)', color: E.PLAYER_COLORS[i], local: false });
      }
      G._classQueue = [];
      const surprise = this.ai >= this.acts.length;
      const nRounds = surprise ? 3 : this.rounds;
      for (let rI = 0; rI < nRounds; rI++) G._classQueue.push(surprise ? this.acts[Math.floor(Math.random() * this.acts.length)] : this.acts[this.ai]);
      G._classDefs = defs; G._classScores = [0, 0, 0, 0]; G._classRound = 0;
      G.game.go('classrun');
    },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 90, '#ecd9bd');
      r.overlay(g => {
        E.font.title(g, 'Class', r.W / 2, 20, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        E.font.text(g, 'Players joined: ' + ((G.game.players || []).length) + ' / 4 · empty mats get Regulars', r.W / 2, 52, '#20404c', { align: 'center' });
        E.font.text(g, 'One screen. Small Plates. Polite titles.', r.W / 2, 66, '#5f7f8a', { align: 'center' });
      });
      this.pills.draw(r); G.talk.draw(r); G.drawDev(r);
    }
  };
  G.scenes.classrun = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      const id = G._classQueue[G._classRound || 0];
      G.game.go('session', { id: id, tier: 1, mode: 'class', durOverride: 35, from: 'classpodium', contestants: G._classDefs, onDone: () => G.game.go('classpodium') });
    },
    update() {}, draw(r) { r.sky(['#ffffff']); }
  };
  G.scenes.classpodium = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      const sc = G._lastSessionCtx;
      // scores from last session ctx if captured
      this.scores = (G._classScores || [0, 0, 0, 0]).slice();
      if (sc && sc.scores) sc.scores.forEach((s, i) => { this.scores[i] = (this.scores[i] || 0) + s; });
      const titles = ['Most Still', 'Best Wobble', 'Participated', 'Also Present'];
      this.order = this.scores.map((s, i) => i).sort((a, b) => this.scores[b] - this.scores[a]);
      this.titles = titles;
      this.pills = new G.Pills(G.game, [{ label: ((G._classRound || 0) + 1 < (G._classQueue || []).length) ? 'Next round →' : 'Finish' }, { label: 'To Title' }], { y: 180 });
      G.say('Tare', 'The results. I read them with feeling and accuracy.');
    },
    update(dt) {
      if (G.talk.update(dt)) return; G.updateDev(dt);
      const a = this.pills.update(dt);
      if (a === 'pick') {
        if (this.pills.i === 1) { G.game.go('title'); return; }
        G._classRound = (G._classRound || 0) + 1;
        if (G._classRound < (G._classQueue || []).length) G.game.go('classrun');
        else G.game.go('title');
      }
    },
    draw(r) {
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 90, '#ecd9bd');
      const names = (G._classDefs || []).map(d => d.name);
      r.overlay(g => {
        E.font.title(g, 'Class Results', r.W / 2, 20, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' });
        this.order.forEach((pi, rank) => {
          E.font.text(g, (rank + 1) + '. ' + (names[pi] || 'P' + (pi + 1)) + ' — ' + this.scores[pi] + ' pts · ' + this.titles[rank], r.W / 2, 60 + rank * 16, '#20404c', { align: 'center', scale: 2 });
        });
      });
      this.pills.draw(r); G.talk.draw(r); G.drawDev(r);
    }
  };
  // ---------- ATTRACT ----------
  G.scenes.attract = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.list = ['stork', 'sunflow', 'candle', 'squat', 'pushup', 'lunge', 'step', 'hoop', 'jog', 'slalom', 'tray', 'laundry'];
      this.i = 0; this.t = 0; this.segT = 0;
      this.def = G.byId['stork'];
      this.mkCtx(this.def);
      G.playSong('studio');
      G.lastInputT = G.game.real;
    },
    mkCtx(def) {
      const tierDef = def.tiers[0];
      const c = G.makeContestant({ bot: 'expert', name: 'Gertrude', params: tierDef.params, rng: G.rngFrom(9), rigOpts: { size: 1.3, hair: 'long', hat: { style: 'cap', color: '#c9a8e8' }, colors: { skin: '#f2c9a4', hair: '#e8e0f0', cloth: '#c9a8e8', pants: '#8a7aa8', boot: '#5a4a6a' } } });
      this.ctx = { def: def, tier: 1, tierDef: tierDef, rng: G.rngFrom(11), time: 0, contestants: [c], mode: 'attract', say: () => {}, instructorName: 'Birch', classMode: false };
      this.ctx.instructorRig = G.makeRig(G.instructorOpts('birch'));
      try { def.setup(this.ctx); } catch (e) {}
      c.bal.onStumble = () => {};
      // cheat: no stumbles in attract
      c.bal.step = c.bal.step.bind(c.bal);
    },
    update(dt) {
      this.t += dt; this.segT += dt;
      // any input exits (hook already tracked; check pressed)
      const game = G.game;
      let any = false;
      try { any = game.input.anyPressed && game.input.anyPressed(); } catch (e) {}
      if (this.t > 1 && any) { try { game.input.consumeAll(); } catch (e) {} G.say('Tare', G.LINES.attract[1]); game.go('title'); return; }
      if (this.segT > 15) {
        this.segT = 0; this.i = (this.i + 1) % this.list.length;
        this.def = G.byId[this.list[this.i]];
        this.mkCtx(this.def);
        if (this.def.song) G.playSong(this.def.song);
      }
      this.ctx.time += dt;
      const old = G.DEV.noStumble; G.DEV.noStumble = true;
      try { this.def.update(dt, this.ctx); } catch (e) {}
      G.DEV.noStumble = old;
    },
    draw(r) {
      const def = this.def, ctx = this.ctx;
      r.sky(['#8fd3f4', '#d8f3fb', '#f6fafa']); r.groundDisc(0, 18, 90, '#ecd9bd');
      const c = ctx.contestants[0];
      r.groundDisc(0, 6, 13, '#bfeee0');
      r.actor(0, 6, 0, (g, ox, oy) => { try { c.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      c.rig.update(1 / 120, { x: 0, y: 6, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      r.actor(-38, 14, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'neutral', 1), {});
      G.drawPlate(r, r.W / 2, r.H - 34, c.bal, {});
      r.overlay(g => {
        E.ui.box(g, 8, 8, 52, 14, { bg: '#e0553a', border: '#ffffff' });
        E.font.text(g, 'DEMO', 34, 11, '#ffffff', { align: 'center' });
        E.font.text(g, G.TITLE + ' · ' + def.name, 8, r.H - 52, '#20404c', {});
        E.font.text(g, 'Press any button', r.W / 2, 14, '#20404c', { align: 'center', scale: 2 });
        E.font.text(g, G.LINES.attract[0], r.W / 2, r.H - 64, '#5f7f8a', { align: 'center' });
      });
    }
  };
})();
