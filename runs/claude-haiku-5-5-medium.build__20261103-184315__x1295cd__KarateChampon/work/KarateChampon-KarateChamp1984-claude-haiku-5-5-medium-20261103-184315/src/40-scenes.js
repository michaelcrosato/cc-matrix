// ---------------------------------------------------------------- the save, the records and the story state
// the engine's store keeps the save in the browser; where it has no storage (Node tests) a memory copy keeps the run going
KC.mem = {};
KC.store = {
  get(k, fb) { const v = E.store.get(k, null); if (v !== null && v !== undefined) return v; return Object.prototype.hasOwnProperty.call(KC.mem, k) ? KC.mem[k] : fb; },
  set(k, v) { KC.mem[k] = JSON.parse(JSON.stringify(v)); E.store.set(k, v); return true; },
  remove(k) { delete KC.mem[k]; E.store.remove(k); }
};
KC.save = {
  load() { return KC.store.get('kc:save', null); },
  write(d) { KC.store.set('kc:save', d); },
  clear() { KC.store.remove('kc:save'); }
};
KC.records = {
  get() { return KC.store.get('kc:records', null) || { story: [], boards: [], pots: [], bull: [] }; },
  add(table, name, score, rank) {
    const r = this.get(); const list = r[table] || (r[table] = []);
    list.push({ name: name || 'TARO', score: Math.round(score), rank: rank || '' });
    list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, 10);
    KC.store.set('kc:records', r);
  },
  qualifies(table, score) { const l = this.get()[table] || []; return l.length < 10 || score > l[l.length - 1].score; }
};
KC.unlocked = (id) => {
  if (KC.TOGGLES.unlockAll) return true;
  if (id === 'kyabetsu') return KC.records && (KC.save.load() || {}).node >= KC.DATA.ladder.findIndex(n => n.id === 'kyabetsu');
  if (id === 'mei') return (KC.save.load() || {}).finished === true;
  return true;
};

// ---------------------------------------------------------------- the factories that need the game (set in 90-start)
KC.makeScenes = (game) => {
  const S = {};
  const talk = new E.Dialog(game);
  KC.talk = talk;
  const INPUT = KC.INPUT;
  const dt = () => 1 / 120;
  const fightState = { cur: null };
  let cutQueue = null, cutDone = null;
  const pickedW = { id: 'taro' };
  const cfg = { p2: 'cpu', stage: 'dojo', rounds: 2 };
  const touchOnly = () => {
    const mq = game.window && game.window.matchMedia;
    const coarse = mq ? mq('(any-pointer: fine)').matches === false : false;
    return coarse && (navigator.maxTouchPoints > 0) && !game.input.anyPressed && false;
  };
  const sayRig = (k, side) => (KC.rigs && KC.rigs[k]) || (KC.rigs = KC.rigs || {}, KC.rigs[k] = V_rig(k, side));
  const V_rig = (k, side) => KC.View.rigFor(k, side);
  S.talk = talk;

  // ------------------------------------------------ title and main menu
  const menuItems = () => {
    const save = KC.save.load();
    return [
      save && ['CONTINUE', () => game.go('road', { resume: true })],
      ['CHAMPON ROAD', () => { KC.save.write(Object.assign({ node: 0, rank: 0, score: 0, finished: false }, save && save.finished ? { finished: true } : {})); game.go('road', { fresh: true }); }],
      ['VERSUS', () => game.go('versus')],
      ['DOJO', () => game.go('dojo')],
      ['BONUS GAMES', () => game.go('bonusMenu')],
      ['RECORDS', () => game.go('records')],
      ['OPTIONS', () => game.menu('settings')],
      ['ABOUT', () => game.go('about')]
    ].filter(Boolean);
  };
  S.title = {
    pausable: false,
    enter() { this.idle = 0; this.blink = 0; this.menu = new E.Menu(game, menuItems().map(i => i[0]), { x: 'center', y: 118, onPick: (i) => menuItems()[i][1](), onCancel() { } }); KC.A.music(game, 'title'); this.rigs = { t: KC.View.rigFor('taro', 'w'), m: KC.View.rigFor('mei', 'r') }; this.bg = V_bg(); this.phase = 0; },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.anyPressed() && game.input.lastDevice !== 'touch') KC.inputSeen = true;
      KC.updateTouchGate();
      this.phase += d;
      const any = game.input.anyPressed() || game.input.pointer() && game.input.clicked();
      if (any) this.idle = 0; else this.idle += d;
      if (this.idle > 10) return game.go('attract');
      if (KC.touchGate) return;
      this.menu.update(d);
      this.menu.y = 118;
      const n = this.menu.items ? this.menu.items.length : 0;
      // the items are rebuilt on enter; keep the list in step with the save
    },
    draw(r) {
      this.bg.draw(r);
      const floor = Math.round(r.w(0, 0, 0)[1]);
      r.overlay(g => E.px.rect(g, 0, floor, r.W, r.H - floor, '#2a1a10'));
      this.rigs.t.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0, pose: 'kneel' });
      r.actor(-30, 0, 0, (g, ox, oy) => this.rigs.t.draw(g, ox, oy, r.view));
      r.actor(430, 0, 0, (g, ox, oy) => this.rigs.m.draw(g, ox, oy, r.view));
      r.overlay(g => {
        E.font.title(g, 'KARATE', r.W / 2, 22, { scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 3, depthColor: '#6a2a1a', align: 'center', outline: '#1a0c10' });
        E.font.title(g, 'CHAMPON', r.W / 2, 54, { scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3, depthColor: '#6a2a1a', align: 'center', outline: '#1a0c10' });
        if (KC.touchGate) E.font.text(g, KC.TEXT.touchGate, r.W / 2, r.H / 2, '#ffe08a', { align: 'center', outline: '#0b0814', scale: 2 });
        if (!KC.touchGate && Math.floor(this.phase * 2) % 2 === 0) E.font.text(g, 'PRESS START', r.W / 2, r.H - 60, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'v' + KC.VERSION + ' - ENGINE ' + (E.version || ''), 6, r.H - 10, '#8a84a0', { outline: false });
      });
      if (!KC.touchGate) r.overlay(g => { this.menu.draw(r); });
    }
  };
  const V_bg = () => new E.Backdrop({ sky: ['#120b1e', '#3a1a2a', '#8a3a24'], moon: { x: 0.7, y: 0.25, r: 12, color: '#f8e0c0' }, stars: 24, starsY: 0.6 });
  S.title.menuRefresh = () => { };

  // ------------------------------------------------ the attract loop: cheating, showcase bouts, a how-to card, the scores (13)
  // the attract loop (13): an exhibition bout (CPUs, cheating allowed), a bonus reel, a how-to card and the scores, then the title
  S.attract = {
    pausable: false,
    enter() { this.loop = 0; this.phase = 'bout'; this.t = 0; KC.A.music(game, 'dojo'); this.startBout(); },
    startBout() {
      const ids = KC.DATA.playableIds;
      const seed = 1000 + this.loop * 17;
      const R = E.rng(seed);
      const a = ids[Math.floor(R() * ids.length)];
      const b = ids.filter(x => x !== a)[Math.floor(R() * (ids.length - 1))];
      const stageIds = Object.keys(KC.DATA.stages);
      this.stage = KC.DATA.stages[stageIds[Math.floor(R() * stageIds.length)]];
      this.w = new KC.Karateka({ id: a, side: 'w' }); this.r = new KC.Karateka({ id: b, side: 'r' });
      this.rigs = { w: KC.View.rigFor(a, 'w'), r: KC.View.rigFor(b, 'r') };
      this.aiW = new KC.KarateAI(this.w, seed + 1, { level: 6, noOverride: true }); this.aiR = new KC.KarateAI(this.r, seed + 2, { level: 6, noOverride: true });
      this.bout = new KC.Bout({ white: this.w, red: this.r, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
      this.boutT = 0;
    },
    next(to) { this.phase = to; this.t = 0; },
    update(d) {
      if (game.input.anyPressed()) return game.go('title');
      game.focus(200, 0, 30);
      this.t += d;
      if (this.phase === 'bout') {
        this.boutT += d;
        const iA = this.aiW.intent(this.r, d), iB = this.aiR.intent(this.w, d);
        this.bout.step(d, { a: () => iA, b: () => iB });
        KC.stepPoses({ w: this.w, r: this.r, rigs: this.rigs }, d);
        if ((this.bout.phase === 'matchEnd' && this.bout.phaseT > this.bout.phaseLen) || this.boutT > 45) this.next('reel');
      } else if (this.phase === 'reel') {
        if (this.t > 8) this.next('howto');
      } else if (this.phase === 'howto') {
        if (this.t > 8) this.next('scores');
      } else if (this.phase === 'scores') {
        if (this.t > 6) { this.loop++; return game.go('title', { attract: true }); }
      }
    },
    draw(r) {
      if (this.phase === 'bout') {
        const st = this.stage || KC.DATA.stages.dojo;
        V_stage(r, st, game.time);
        KC.View.drawFighters(r, [this.w, this.r], { w: this.rigs.w, r: this.rigs.r });
        KC.View.hud(r, this.bout, { bottom: 'DEMO · PRESS START' });
        return;
      }
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      r.overlay(g => {
        if (this.phase === 'reel') {
          E.font.title(g, 'BONUS STAGE! BREAK THE BOARDS!', r.W / 2, r.H * 0.3, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          for (let k = 0; k < 5; k++) E.px.rect(g, r.W / 2 - 40 + k * 10, r.H * 0.5 - 30, 8, 40, k < 4 ? '#8a6038' : '#d8b080');
          E.font.text(g, 'PERFECT! 3000', r.W / 2, r.H * 0.75, '#ffe08a', { align: 'center', outline: '#0b0814' });
        } else if (this.phase === 'howto') {
          E.font.title(g, 'HOW TO FIGHT', r.W / 2, 30, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          E.font.text(g, 'LEFT STICK: MOVE AND POSTURE', r.W / 2, r.H * 0.35, '#fff6d0', { align: 'center', outline: '#0b0814' });
          E.font.text(g, 'RIGHT STICK: THE TECHNIQUE', r.W / 2, r.H * 0.35 + 22, '#fff6d0', { align: 'center', outline: '#0b0814' });
          E.font.text(g, 'FIRST TO 2 POINTS WINS THE ROUND', r.W / 2, r.H * 0.35 + 44, '#ffe08a', { align: 'center', outline: '#0b0814' });
        } else if (this.phase === 'scores') {
          E.font.title(g, 'HIGH SCORES', r.W / 2, 30, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          const top = (KC.records.get().story || []).slice(0, 3);
          if (!top.length) E.font.text(g, 'NO SCORES YET', r.W / 2, r.H * 0.5, '#fff6d0', { align: 'center', outline: '#0b0814' });
          top.forEach((e, i) => E.font.text(g, (i + 1) + '. ' + e.name + '  ' + String(e.score).padStart(7, '0'), r.W / 2, r.H * 0.4 + i * 18, '#fff6d0', { align: 'center', outline: '#0b0814' }));
        }
        E.font.text(g, 'DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 16, '#a9a1c8', { align: 'center', outline: '#0b0814', font: 'tiny' });
      });
    }
  };

  // ------------------------------------------------ the fight (story, versus, attract, drills' free spar)
  S.fight = {
    pausable: true,
    enter(data) {
      const F = fightState.cur = fightState.cur && data && data.resume ? fightState.cur : KC.startFight(data || {});
      this.F = F;
      // the camera setting: the arcade side view, or the tatami 2.5D view (the engine's brawler view)
      game.setView(game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
      KC.A.music(game, F.stage.music);
    },
    update(d) {
      const F = this.F;
      if (!F || !F.bout) return;
      if (talk.update(d)) return;
      if (F.stopped) return;
      // a human plays the fighter it controls; a CPU plays the other
      const dirA = F.w.x < F.r.x ? 1 : -1;
      const iA = F.cpuW ? F.aiW.intent(F.r, d) : KC.readControl(game.input, dirA, F.prevW);
      const dirB = F.r.x < F.w.x ? 1 : -1;
      const iB = F.cpuR ? F.aiR.intent(F.w, d) : KC.readControl(F.p2Input || game.input, dirB, F.prevR);
      if (game.paused) return;
      F.bout.step(d, { a: () => iA, b: () => iB });
      KC.stepPoses(F, d);
      F.t += d;
      if (F.popup && F.popup.t > 0) F.popup.t -= d;
      if (F.bout.matchOver !== null && F.bout.phase === 'matchEnd' && F.bout.phaseT > F.bout.phaseLen - 0.01) {
        F.stopped = true; KC.endFight(F);
      }
      if (F.mode === 'attract' && game.input.anyPressed()) return game.go('title');
    },
    draw(r) {
      const F = this.F; if (!F) return;
      V_stage(r, F.stage, game.time);
      r.actor(200, 14, 0, (g, ox, oy) => F.judge.draw(g, ox, oy, r.view));
      KC.View.drawFighters(r, [F.w, F.r], { w: F.rigs.w, r: F.rigs.r });
      const hint = KC.TUNE.gameSpeed !== 1 ? 'SPEED ' + KC.TUNE.gameSpeed.toFixed(2) : null;
      KC.View.hud(r, F.bout, { popup: F.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, F.popup) : null, bottom: F.hint || hint });
      talk.draw(r);
    }
  };

  // ------------------------------------------------ the Champon Road: the ladder, with its stops and the next one (8.3)
  S.road = {
    pausable: false,
    enter(data) {
      if (data && data.advance) KC.advanceNode();
      const save = KC.save.load() || { node: 0, rank: 0, score: 0 };
      this.save = save; this.sel = Math.min(save.node || 0, KC.DATA.ladder.length - 1);
      KC.A.music(game, 'select');
      this.menu = null;
    },
    update(d) {
      if (talk.update(d)) return;
      const L = KC.DATA.ladder, save = this.save;
      if (game.input.pressed('left') || game.input.pressed('up')) { this.sel = Math.max(0, this.sel - 1); KC.A.sfx(game, 'menuMove'); }
      if (game.input.pressed('right') || game.input.pressed('down')) { this.sel = Math.min(save.node, this.sel + 1); KC.A.sfx(game, 'menuMove'); }
      if (game.input.pressed('confirm') || game.input.clicked()) {
        const node = L[save.node];
        if (!node) return game.go('ending');
        KC.A.sfx(game, 'menuOk');
        KC.startNode(save.node);
      }
      if (game.input.pressed('cancel')) game.go('title');
    },
    draw(r) {
      const L = KC.DATA.ladder, save = this.save || { node: 0 };
      r.sky(['#1a0c10', '#3a1820', '#6a2a1e']);
      r.overlay(g => {
        E.font.title(g, 'CHAMPON ROAD', r.W / 2, 14, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        // the road: one row of stops
        const x0 = 14, x1 = r.W - 14, step = (x1 - x0) / (L.length - 1), y = r.H / 2 - 8;
        E.px.rect(g, x0, y, x1 - x0, 3, '#8a6a4a');
        L.forEach((n, i) => {
          const x = Math.round(x0 + i * step);
          const done = i < save.node, cur = i === save.node;
          const col = done ? '#ffd060' : (cur ? '#ffffff' : '#4a3a4a');
          E.px.disc(g, x, y + 1, cur ? 6 : 4, '#15121e'); E.px.disc(g, x, y + 1, cur ? 5 : 3, col);
          if (cur && Math.floor(game.time * 3) % 2) E.px.disc(g, x, y + 1, 9, '#ffffff33');
          if (i === this.sel) E.px.rect(g, x - 1, y - 10, 3, 3, '#ffe08a');
        });
        const node = L[save.node];
        const label = node ? node.title : 'THE END';
        E.ui.box(g, r.W / 2 - 150, r.H - 84, 300, 50, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'NEXT: ' + label, r.W / 2, r.H - 76, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(save.score || 0).padStart(7, '0') + '   ' + KC.DATA.belts[KC.DATA.beltOrder[Math.min(9, save.rank || 0)]].name, r.W / 2, r.H - 50, '#e8e0c8', { align: 'center', outline: '#0b0814' });
        KC.prompt(g, r.W / 2 - 60, r.H - 18, [['cross', 'GO'], ['circle', 'TITLE']]);
      });
    }
  };

  // ------------------------------------------------ cutscenes: each [speaker, text] line is a page of the dialog (7.7)
  const playLines = (lines, done) => {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { return done && done(); }
      const [who, text] = lines[i++];
      if (who === 'CARD' || (text === null && who)) { KC.card(game, who, text, next); return; }
      const k = who === 'TARO' ? 'taro' : who === 'NEGI' ? 'negi' : who === 'MEI' ? 'mei' : who === 'GENKOTSU' ? 'genkotsu' : null;
      const rig = k ? KC.View.rigFor(k, k === 'mei' ? 'r' : 'w') : null;
      const text2 = text === null ? (who || '') : text;
      talk.say(text2, { name: who && text !== null ? who : undefined, portrait: rig || undefined, onDone: next });
    };
    next();
  };
  KC.playLines = playLines;
  S.cutscene = {
    pausable: false,
    enter(data) {
      this.script = data.script; this.node = data.node;
      KC.A.music(game, 'dojo');
      const lines = KC.TEXT[this.script] || [];
      playLines(lines, () => game.go('road', { resume: true, advance: true }));
    },
    update(d) { talk.update(d); },
    draw(r) { r.sky(['#101828', '#2a2a40', '#4a3a40']); talk.draw(r); }
  };

  // ------------------------------------------------ the continue, the game over and the initials (8.7)
  S.continue = {
    pausable: false,
    enter(data) { this.left = 10; this.data = data; KC.A.music(game, 'continue'); },
    update(d) {
      this.left -= d;
      if (game.input.pressed('confirm')) { KC.A.sfx(game, 'menuOk'); return KC.startNode(this.data.node, { retry: true }); }
      if (game.input.pressed('cancel') || this.left <= 0) return game.go('gameover', this.data);
    },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'CONTINUE?', r.W / 2, r.H / 2 - 60, { scale: 3, colors: ['#fffbe8', '#ff8a6a'], depth: 3, depthColor: '#5a1a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, String(Math.ceil(Math.max(0, this.left))), r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center', scale: 4, outline: '#0b0814' });
        E.font.text(g, KC.TEXT.continueLine, r.W / 2, r.H / 2 + 46, '#ffe08a', { align: 'center', outline: '#0b0814', scale: 2 });
        KC.prompt(g, r.W / 2 - 60, r.H - 18, [['cross', 'CONTINUE'], ['circle', 'GIVE UP']]);
      });
    }
  };
  S.gameover = {
    pausable: false,
    enter(data) { this.data = data; this.t = 0; KC.A.music(game, 'gameover', { loop: false }); },
    update(d) {
      this.t += d;
      if (this.t > 2.2 && (game.input.pressed('confirm') || this.t > 6)) {
        const sc = this.data.score || 0;
        if (KC.records.qualifies('story', sc)) return game.go('initials', { table: 'story', score: sc, rank: KC.DATA.beltOrder[this.data.rank || 0] });
        return game.go('title');
      }
    },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 3, depthColor: '#3a0810', align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.gameOverLine, r.W / 2, r.H / 2 + 22, '#e8e0c8', { align: 'center', outline: '#0b0814', scale: 2 });
      });
    }
  };
  // the initials: a letter wheel per slot, three slots (E.Arcade's rules, simplified)
  S.initials = {
    pausable: false,
    enter(data) { this.data = data; this.letters = [0, 0, 0]; this.slot = 0; KC.A.music(game, 'title'); },
    update(d) {
      const L = this.letters;
      if (game.input.pressed('up')) L[this.slot] = (L[this.slot] + 25) % 26;
      if (game.input.pressed('down')) L[this.slot] = (L[this.slot] + 1) % 26;
      if (game.input.pressed('confirm')) { if (this.slot < 2) this.slot++; else { KC.records.add(this.data.table, this.name(), this.data.score, this.data.rank); return game.go('title'); } }
      if (game.input.pressed('cancel') && this.slot > 0) this.slot--;
    },
    name() { return this.letters.map(i => String.fromCharCode(65 + i)).join(''); },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'NEW RECORD!', r.W / 2, 40, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(this.data.score).padStart(7, '0'), r.W / 2, 96, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        for (let k = 0; k < 3; k++) {
          const x = r.W / 2 - 40 + k * 40, y = r.H / 2;
          E.ui.box(g, x - 14, y - 22, 26, 36, { bg: k === this.slot ? ['#4a3a1a', '#2a1a0a'] : ['#1a1428', '#0e0a18'], border: k === this.slot ? '#ffd060' : '#4a3a5a' });
          E.font.text(g, String.fromCharCode(65 + this.letters[k]), x, y - 10, '#ffffff', { align: 'center', scale: 3, outline: '#0b0814' });
        }
        E.font.text(g, 'UP/DOWN LETTER · CROSS NEXT', r.W / 2, r.H - 26, '#a9a1c8', { align: 'center', outline: '#0b0814' });
      });
    }
  };

  // ------------------------------------------------ the versus setup (9): fighters, a second player on the keyboard, the stage, Kachinuki
  S.versus = {
    pausable: false,
    enter() {
      this.stageIds = Object.keys(KC.DATA.stages); this.stageI = 0;
      this.p1 = 0; this.p2 = 1; this.mode = 'cpu'; this.seats = 2;
      this.menu = new E.Menu(game, [], { x: 'center', y: 96, onPick: (i) => this.pick(i), onCancel: () => game.go('title') });
      this.rebuild();
      KC.A.music(game, 'select');
    },
    rebuild() {
      const ids = KC.DATA.playableIds.filter(id => KC.unlocked(id));
      const pick = (idx) => KC.DATA.roster[ids[idx % ids.length]].name;
      this.ids = ids;
      this.menu.items = [
        'P1: ' + pick(this.p1), 'P2: ' + (this.mode === 'keys' ? 'KEYBOARD' : (this.mode === 'pad' ? 'PAD 1' : 'CPU ' + pick(this.p2))),
        'MODE: ' + (this.mode === 'kach' ? 'KACHINUKI ' + this.seats : (this.mode === 'keys' ? 'VERSUS 2P KEYBOARD' : (this.mode === 'pad' ? 'VERSUS 2P PAD' : 'VERSUS 1P'))),
        'STAGE: ' + KC.DATA.stages[this.stageIds[this.stageI]].name, 'START', 'BACK'
      ];
    },
    pick(i) {
      const ids = this.ids;
      if (i === 0) { this.p1 = (this.p1 + 1) % ids.length; }
      if (i === 1) { if (this.mode === 'keys') { this.mode = 'cpu'; } else { this.p2 = (this.p2 + 1) % ids.length; if (this.p2 === this.p1) this.p2 = (this.p2 + 1) % ids.length; } }
      if (i === 2) { const order = ['cpu', 'keys', 'pad', 'kach']; this.mode = order[(order.indexOf(this.mode) + 1) % 3]; this.seats = this.seats === 4 ? 3 : 4; if (this.mode !== 'kach') this.seats = 2; }
      if (i === 3) this.stageI = (this.stageI + 1) % this.stageIds.length;
      if (i === 4) {
        KC.A.sfx(game, 'menuOk');
        const st = KC.DATA.stages[this.stageIds[this.stageI]].id;
        if (this.mode === 'kach') return game.go('kach', { seats: this.seats, stage: st, roster: [ids[this.p1]].concat(this.others()) });
        return game.go('fight', Object.assign(KC.versusData(ids[this.p1], ids[this.p2], KC.DATA.stages[st], this.mode === 'keys' ? 'keys' : (this.mode === 'pad' ? 'pad' : 'cpu')), {}));
      }
      if (i === 5) return game.go('title');
      this.rebuild();
    },
    others() { const ids = this.ids; const out = []; for (let k = 1; k < this.seats; k++) out.push(ids[(this.p2 + k - 1) % ids.length]); return out; },
    update(d) { this.menu.update(d); },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      r.overlay(g => {
        E.font.title(g, 'VERSUS', r.W / 2, 14, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        this.ids.forEach((id, i) => {
          const x = 20 + (i % 5) * 62, y = 230 + Math.floor(i / 5) * 36;
          const on = i === this.p1 || i === this.p2;
          E.ui.box(g, x, y, 56, 30, { bg: ['#3a2a4a', '#1a1028'], border: on ? '#ffd060' : '#4a3a5a' });
          E.font.text(g, KC.DATA.roster[id].short, x + 28, y + 10, '#fff6d0', { align: 'center', outline: '#0b0814', font: 'tiny' });
        });
      });
      this.menu.draw(r);
    }
  };
  KC.versusData = (w, r, st, p2) => ({ mode: 'versus', w, r, stage: st.id, roundsToWin: 2, pointsToWin: KC.TUNE.pointsToWin, cpuW: false, cpuR: (p2 || 'cpu') === 'cpu', p2: p2 || 'cpu' });

  // ------------------------------------------------ the dojo: lessons and free spar (7.5), and the move list (8.6)
  S.dojo = {
    pausable: false,
    enter() {
      this.menu = new E.Menu(game, ['LESSON I', 'LESSON II', 'LESSON III', 'ALL TECHNIQUES', 'FREE SPAR', 'MOVE LIST', 'BACK'], {
        x: 'center', y: 90, onPick: (i) => {
          if (i < 4) return KC.startPractice(['I', 'II', 'III', 'ALL'][i]);
          if (i === 4) return game.go('fight', { mode: 'freeSpar', w: 'taro', r: 'kamaboko', stage: 'dojo', cpuR: true, cpuW: false, dummy: true });
          if (i === 5) return game.go('moveList', { back: 'dojo' });
          return game.go('title');
        }, onCancel: () => game.go('title')
      });
      KC.A.music(game, 'practice');
    },
    update(d) { this.menu.update(d); },
    draw(r) { r.sky(['#2a1a10', '#4a2a18', '#7a4a28']); r.overlay(g => E.font.title(g, 'DOJO', r.W / 2, 30, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' })); this.menu.draw(r); }
  };
  S.moveList = {
    pausable: false,
    enter(data) { this.back = data && data.back || 'title'; this.posture = 0; this.stick = 0; this.postures = ['n', 't', 'a', 'u', 'd']; this.sticks = ['u', 't', 'd', 'a']; this.prev = null; this.t = 0; },
    update(d) {
      if (game.input.pressed('cancel')) return game.go(this.back);
      if (game.input.pressed('up')) this.posture = (this.posture + 4) % 5;
      if (game.input.pressed('down')) this.posture = (this.posture + 1) % 5;
      if (game.input.pressed('left')) this.stick = (this.stick + 3) % 4;
      if (game.input.pressed('right')) this.stick = (this.stick + 1) % 4;
      this.t += d;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const p = this.postures[this.posture], s = this.sticks[this.stick];
      const id = KC.DATA.matrix[p] && KC.DATA.matrix[p][s] || null;
      const T = id && KC.DATA.techniques[id];
      r.overlay(g => {
        E.font.title(g, 'MOVE LIST', r.W / 2, 12, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const names = { n: 'STAND', t: 'WALK IN', a: 'WALK BACK', u: 'JUMP', d: 'CROUCH' };
        E.font.text(g, 'LEFT STICK: ' + names[p], r.W / 2, 56, '#ffe08a', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, 'UP/DOWN: POSTURE   LEFT/RIGHT: TECHNIQUE', r.W / 2, 82, '#a9a1c8', { align: 'center', outline: '#0b0814' });
        const cx = r.W / 2, cy = r.H / 2 + 40;
        ['u', 't', 'd', 'a'].forEach((k, i) => {
          const on = k === s, ox = [0, 56, 0, -56][i], oy = [-40, 0, 40, 0][i];
          E.ui.box(g, cx + ox - 46, cy + oy - 12, 92, 24, { bg: on ? ['#5a3a1a', '#2a1a0a'] : ['#1a1428', '#0e0a18'], border: on ? '#ffd060' : '#4a3a5a' });
          const id2 = KC.DATA.matrix[p] && KC.DATA.matrix[p][k];
          E.font.text(g, id2 ? KC.DATA.techniques[id2].name.slice(0, 16) : '-', cx + ox, cy + oy - 4, '#fff6d0', { align: 'center', outline: '#0b0814', font: 'tiny' });
        });
        if (T) {
          E.font.text(g, T.name, r.W / 2, r.H - 52, '#fffbe8', { align: 'center', scale: 2, outline: '#0b0814' });
          E.font.text(g, T.pts ? (T.pts[0] + '-' + T.pts[1] + (T.pts[1] >= 600 ? '  · FULL POINT' : '  · HALF POINT')) : 'DEFENCE', r.W / 2, r.H - 30, '#a9a1c8', { align: 'center', outline: '#0b0814' });
        }
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['circle', 'BACK']]);
      });
    }
  };

  // ------------------------------------------------ records and the about screen (8.8, 8.11)
  S.records = {
    pausable: false,
    enter() { this.tab = 0; this.tabs = ['story', 'boards', 'pots', 'bull']; },
    update(d) {
      if (game.input.pressed('cancel')) return game.go('title');
      if (game.input.pressed('right')) this.tab = (this.tab + 1) % 4;
      if (game.input.pressed('left')) this.tab = (this.tab + 3) % 4;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const list = KC.records.get()[this.tabs[this.tab]] || [];
      r.overlay(g => {
        E.font.title(g, 'RECORDS', r.W / 2, 12, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, this.tabs[this.tab].toUpperCase() + '  ← →', r.W / 2, 46, '#ffe08a', { align: 'center', outline: '#0b0814' });
        for (let i = 0; i < 10; i++) {
          const e = list[i], y = 66 + i * 14;
          E.font.text(g, (i + 1) + '.', r.W / 2 - 110, y, '#a9a1c8', { outline: false, scale: 1 });
          E.font.text(g, e ? e.name : '---', r.W / 2 - 90, y, '#fff6d0', { outline: false });
          E.font.text(g, e ? String(e.score).padStart(7, '0') : '0000000', r.W / 2 + 10, y, '#fff6d0', { outline: false });
          if (e && e.rank) E.font.text(g, e.rank, r.W / 2 + 80, y, '#ffb8a8', { outline: false, font: 'tiny' });
        }
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['circle', 'BACK']]);
      });
    }
  };
  S.about = {
    pausable: false,
    enter() { this.page = 0; this.pages = KC.aboutPages(); },
    update(d) {
      if (game.input.pressed('cancel')) return game.go('title');
      if (game.input.pressed('confirm') || game.input.pressed('right')) { this.page = (this.page + 1) % this.pages.length; }
      if (game.input.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const P = this.pages[this.page];
      r.overlay(g => {
        E.font.title(g, P.title, r.W / 2, 10, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        // every line wrapped to the screen, then set down in order (no overlap), up to the bottom bar
        let y = 40;
        for (const ln of P.lines) for (const part of E.font.wrap(ln, r.W - 24, {})) { if (y < r.H - 40) E.font.text(g, part, 12, y, '#fff6d0', { outline: false }); y += 13; }
        E.font.text(g, (this.page + 1) + '/' + this.pages.length, r.W - 10, r.H - 12, '#a9a1c8', { align: 'right', outline: false });
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['cross', 'NEXT'], ['circle', 'BACK']]);
      });
    }
  };
  S.ending = {
    pausable: false,
    enter() { this.t = 0; KC.A.music(game, 'ending'); playLines(KC.TEXT.ending, () => { this.credits = true; }); },
    update(d) { this.t += d; talk.update(d); if (this.credits && (game.input.pressed('confirm') || this.t > 60)) return game.go('title'); },
    draw(r) { r.sky(['#101828', '#2a2a40', '#4a3a40']); talk.draw(r); if (this.credits) r.overlay(g => { E.font.title(g, 'CREDITS', r.W / 2, 30, { scale: 3, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' }); E.font.text(g, 'CHAMPON, FIGHTERS AND CREW', r.W / 2, 80, '#fff6d0', { align: 'center', outline: '#0b0814' }); }); }
  };

  return S;
};

// ---------------------------------------------------------------- what the scenes share
KC.stepPoses = (F, d) => {
  const w = F.w || F.a, r = F.r || F.b;
  const rw = F.rigs.w || F.rigsW, rr = F.rigs.r || F.rigsR;
  if (rw) KC.View.applyPose(rw, w.poseState(), d);
  if (rr) KC.View.applyPose(rr, r.poseState(), d);
};
KC.prompt = (g, x, y, items) => {
  let cx = x;
  const XB = { cross: 'A', circle: 'B', square: 'X', triangle: 'Y' };
  for (const [icon, label] of items) {
    const dev = KC.device();
    const xbox = dev === 'gamepad' && KC.game.input.padStyle && KC.game.input.padStyle() === 'xbox';
    const ic = dev === 'keyboard' || dev === 'mouse' ? { cross: 'Enter', circle: 'Esc', square: 'Q', triangle: 'E' }[icon] : (xbox ? XB[icon] : icon);
    if (xbox) { KC.glyph(g, cx + 5, y, ic, 9); E.font.text(g, label, cx + 14, y - 3, '#fff6d0', { outline: '#0b0814' }); cx += 14 + E.font.width(label, {}) + 12; continue; }
    const kw = dev === 'keyboard' ? Math.max(9, E.font.width(ic, { font: 'tiny' }) + 4) : 9;
    KC.glyph(g, cx + kw / 2, y, dev === 'keyboard' ? 'key:' + ic : ic, 9);
    E.font.text(g, label, cx + kw + 4, y - 3, '#fff6d0', { outline: '#0b0814' });
    cx += kw + 4 + E.font.width(label, {}) + 12;
  }
};
KC.device = () => (KC.game && KC.game.input && KC.game.input.lastDevice) || 'keyboard';
KC.card = (game, title, text, next) => { KC.cardText = text; KC.cardNext = next; game.after(2.2, () => next()); };
// the about pages: the Source Information, the feedback and the credits (from data/about.json)
KC.aboutPages = () => {
  const A = KC.ABOUT || {};
  const pagesFrom = (title, obj) => ({ title, lines: Object.keys(obj || {}).map(k => k.toUpperCase() + ': ' + String(obj[k])) });
  const pages = [];
  if (A.sourceInformation) pages.push(pagesFrom('SOURCE INFORMATION', A.sourceInformation));
  if (A.testingFeedback) pages.push({ title: 'TESTING FEEDBACK', lines: A.testingFeedback });
  if (A.engineFeedback) pages.push({ title: 'ENGINE FEEDBACK', lines: A.engineFeedback });
  if (A.promptFeedback) pages.push({ title: 'PROMPT FEEDBACK', lines: A.promptFeedback });
  pages.push({ title: 'CREDITS', lines: A.credits || ['KARATE CHAMPON', 'ENGINE: MY-3D2DGE 0.85.2', 'KENNEY AND KAYKIT ASSETS: CC0'] });
  return pages;
};
// the stage paint from the view module
const V_stage = (r, st, t) => KC.View.drawStage(r, st, t);
KC.StagePaint = V_stage;

// the fight: build a bout from the scene data (story, versus, attract, the free spar)
KC.startFight = (d) => {
  const wId = d.w || 'taro', rId = d.r || 'kamaboko';
  const w = new KC.Karateka({ id: wId, side: 'w' }), r = new KC.Karateka({ id: rId, side: 'r' });
  const seed = d.seed || (Math.floor(Math.random() * 1e6) + 1);
  const cpuW = !!d.cpuW, cpuR = d.cpuR !== false;
  const lvl = (k) => KC.TUNE.cpuLevel > 0 ? KC.TUNE.cpuLevel : (d.level || (KC.DATA.roster[k].ai ? KC.DATA.roster[k].ai.level : 3));
  const F = {
    mode: d.mode || 'story', w, r, stage: KC.DATA.stages[d.stage || 'dojo'], cpuW, cpuR, t: 0, seed,
    rigs: { w: KC.View.rigFor(wId, 'w'), r: KC.View.rigFor(rId, 'r') },
    judge: KC.View.rigFor('genkotsu', 'w', '#1d2b52'),
    aiW: new KC.KarateAI(w, seed + 11, { level: lvl(wId) }), aiR: new KC.KarateAI(r, seed + 23, { level: lvl(rId) }),
    prevW: {}, prevR: {}, popup: null, hint: null, p2Input: null, p2: d.p2 || 'cpu', node: d.node, onEnd: d.onEnd || null
  };
  F.bout = new KC.Bout({ white: w, red: r, seed, roundsToWin: d.roundsToWin || KC.TUNE.roundsToWin, pointsToWin: d.pointsToWin || KC.TUNE.pointsToWin, intro: d.intro !== false });
  F.bout.on('point', (p) => { F.popup = { t: 1.2, text: (p.full ? 'FULL' : 'HALF') + (p.counter ? ' COUNTER' : '') + ' · ' + KC.DATA.techniques[p.tech].name + ' ' + p.pts, color: p.full ? '#ffe070' : '#ffffff' }; KC.A.sfx(KC.game, p.full ? 'thwackFull' : 'thwackHalf'); if (p.full) KC.game.flash('#ffffff', 0.08); KC.game.shake(p.full ? 4 : 2); });
  F.bout.on('block', () => KC.A.sfx(KC.game, 'clack'));
  F.bout.on('call', (c) => { KC.A.sfx(KC.game, 'flagSnap'); if (c.text) KC.A.speak(KC.game, c.text, 'genkotsu'); });
  F.bout.on('fight', () => KC.A.sfx(KC.game, 'whistle'));
  F.bout.on('matchEnd', () => KC.A.sfx(KC.game, 'gong'));
  F.bout.on('roundEnd', () => KC.A.sfx(KC.game, 'gong'));
  F.bout.on('aiuchi', () => { F.popup = { t: 1, text: 'AIUCHI! NO POINT', color: '#ffffff' }; });
  F.bout.on('time', () => KC.A.sfx(KC.game, 'whistle'));
  F.bout.on('hantei', () => KC.A.sfx(KC.game, 'whistle'));
  F.hint = d.hint || null;
  return F;
};
// the match's end: the story goes to its next step; versus and attract go to their results
KC.endFight = (F) => {
  const win = F.bout.matchOver;
  if (F.onEnd) return F.onEnd(win, F);
  if (F.mode === 'story') return KC.storyMatchEnd(F, win);
  if (F.mode === 'versus') return KC.game.go('results', { winner: win, F: { points: F.bout.points, rounds: F.bout.rounds, stats: F.bout.stats } });
  if (F.mode === 'attract') return KC.game.go('title');
  return KC.game.go('dojo');
};
KC.storyMatchEnd = (F, win) => {
  const game = KC.game;
  const save = KC.save.load() || { node: 0, rank: 0, score: 0 };
  const node = KC.DATA.ladder[save.node];
  if (win === 0) {
    save.score = (save.score || 0) + F.w.score + (F.bout.stats[0].full * 100);
    if (F.bout.points[0] === F.bout.pointsToWin && F.bout.stats[1].full + F.bout.stats[1].half === 0) save.score += 5000;
    if (node && node.promote) { const bi = KC.DATA.beltOrder.indexOf(node.promote); save.rank = Math.max(save.rank || 0, bi); }
    save.node = Math.min(save.node + 1, KC.DATA.ladder.length);
    save.score += 1000 * (save.rank || 0);
    KC.save.write(save);
    return game.go('promotion', { node: save.node - 1, promote: node && node.promote, rank: save.rank });
  }
  KC.save.write(save);
  return game.go('continue', { node: save.node, score: save.score, rank: save.rank });
};
KC.startNode = (idx, o = {}) => {
  const game = KC.game, node = KC.DATA.ladder[idx];
  if (!node) return game.go('ending');
  if (node.kind === 'cutscene') return game.go('cutscene', { script: node.script, node: idx });
  if (node.kind === 'practice') return KC.startPractice(node.lesson, { story: true, node: idx });
  if (node.kind === 'bonus') return game.go('bonus', { kind: node.bonus, stage: node.stage, node: idx });
  if (node.kind === 'match') {
    const save = KC.save.load() || {};
    const data = { mode: 'story', w: 'taro', r: node.opponent, stage: node.stage, cpuR: true, cpuW: false, hint: node.hints ? KC.TEXT.hints[0] : null, node: idx, roundsToWin: 2 };
    return game.go('vs', { data, title: node.title });
  }
  return game.go('road');
};
// the story match after the VS card
KC.startMatchNode = (data) => game.go('fight', data);
KC.startPractice = (lessonId, o = {}) => game.go('practice', { lesson: lessonId, story: !!o.story, node: o.node });
