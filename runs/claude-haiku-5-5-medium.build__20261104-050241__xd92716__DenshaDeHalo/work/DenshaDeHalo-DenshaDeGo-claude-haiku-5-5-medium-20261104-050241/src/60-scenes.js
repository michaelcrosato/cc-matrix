/* Densha de Halo! • 60-scenes: the engine's scenes. The drive scene runs the sim and draws the railway, the cab and the HUD.
 * The title, the Halo Map, the briefings, the results, the game over, the Driver's Log, How to Drive, About & Credits,
 * Dev Mode and the attract loop are screens over the same pixels (section 4.26). Input is read in update(), drawing only
 * reads state. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

/* ---- the progress save (section 4.22): unlocks, ranks, the best of each stage, the stats; memory-only in a hub session ---- */
DH.Progress = {
  load() {
    const p = E.store.get('dh:progress', null) || {};
    return Object.assign({ unlocked: ['S0', 'S1'], ranks: {}, best: {}, stats: { km: 0, stops: 0, perfect: 0, calls: 0 }, postcards: [], done: {} }, p);
  },
  save(p) { E.store.set('dh:progress', p); },
  unlockNext(p, id) {
    const order = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
    const i = order.indexOf(id);
    if (i >= 0 && i + 1 < order.length && !p.unlocked.includes(order[i + 1])) p.unlocked.push(order[i + 1]);
  }
};

/* any input at all: a key, a button, a stick, a click or a tap (section 4.20) */
DH.anyInput = (I) => (I.anyPressed && I.anyPressed()) || ['confirm', 'cancel', 'start', 'power', 'brake', 'neutral', 'eb', 'ats', 'call', 'horn', 'view', 'up', 'down', 'left', 'right'].some(a => I.pressed(a));

/* the touch-only check: a phone or a tablet with no controller and no keyboard seen (section 4.15) */
DH.touchOnly = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine && !DH.seenPad && !DH.seenKey;
};

/* the lines of the stages' Hoshino and the others: every line is data (section 5.5) */
DH.lines = { S0: { short: 'Learn the lever, the stop and the brake.' } };

/* the scenes' shared text drawing */
DH.text = (r, str, x, y, col, o) => r.overlay(g => E.font.text(g, str, x, y, col, o));
DH.titleText = (r, str, x, y, scale, col) => r.overlay(g => E.font.title(g, str, x, y, { scale, colors: col || ['#fff6c8', '#f2c230', '#b8801a'], align: 'center', outline: '#1a1208', depth: 3, depthColor: '#5a3a10' }));
DH.card = (r, x, y, w, h, bg) => r.overlay(g => E.ui.box(g, x, y, w, h, { bg: bg || ['#1c1a2e', '#0e0c18'], border: '#6a6490' }));

/* the Halo Map: the ring with its 12 stations; the stages are arcs between them */
DH.haloStations = [['AKARI CENTRAL', 0], ['HANABATAKE', 1600], ['KUJIRA-BASHI', 3450], ['MINATO-MAE', 5100], ['TODAI-SHITA', 6950], ['OKIKU-DERA', 8700], ['YUHI-ZAKA', 10450], ['SHOTENGAI', 12100], ['DAIGAKU-MAE', 13700], ['SAKURA-KOEN', 15300], ['HOSHIMI-DAI', 17100], ['KAWASEMI', 18800]];
DH.stageArcs = { S0: [0, 1], S1: [0, 2], S2: [2, 6], S3: [5, 7], S4: [7, 9], S5: [9, 11], PR: [7, 9] };

/* ---- the progress helpers ---- */
DH.bestRank = (p, id) => (p.ranks[id] || null);
DH.rankFor = (sim) => (sim.finished ? sim.rankOf(sim.totals().total) : 'D');

/* the stage lists */
DH.stageIds = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];

/* the portraits: a Humanoid rig per speaker, dressed for the character (section 5.4), made once */
DH.rigs = {};
DH.rigFor = (who) => {
  const key = String(who).toLowerCase();
  if (DH.rigs[key]) return DH.rigs[key];
  const E2 = window.My3D2dge;
  const look = {
    hoshino: { build: 'heroic', hat: { style: 'cap', color: '#1a2a4a' }, outfit: 'coat', hair: 'short', colors: { cloth: '#1a2a4a', coat: '#1a2a4a', skin: '#e8c8a8', hair: '#9a9aa0' } },
    mika: { outfit: 'tunic', hat: { style: 'cap', color: '#1f3a6a' }, hair: 'ponytail', colors: { cloth: '#1f3a6a', skin: '#f0d0b0', hair: '#2a1a14' } },
    ota: { outfit: 'coat', hat: { style: 'cap', color: '#3a3a40' }, hair: 'short', colors: { cloth: '#4a4a52', coat: '#4a4a52', skin: '#e0c0a0', hair: '#c0c0c0' } },
    kota: { size: .8, hat: { style: 'cap', color: '#f2c230' }, hair: 'spiky', colors: { cloth: '#3a6aa0', skin: '#f0d0b0' } },
    fuji: { hair: 'long', hunch: .3, colors: { cloth: '#8a3a4a', skin: '#e8c8a8', hair: '#d8d8d8' } },
    kenji: { outfit: 'coat', hair: 'short', colors: { cloth: '#2a2a32', coat: '#2a2a32', skin: '#e8c8a8', hair: '#2a1a14' } },
    ren: { outfit: 'coat', hat: { style: 'cap', color: '#6a3aa0' }, colors: { cloth: '#6a3aa0', coat: '#6a3aa0', skin: '#e8c8a8', hair: '#1a1420' } },
    sato: { build: 'heroic', hat: { style: 'cap', color: '#2a3a52' }, colors: { cloth: '#2a3a52', coat: '#2a3a52', skin: '#dcb898', hair: '#b8b8b8' } }
  };
  DH.rigs[key] = new E2.Humanoid(Object.assign({ size: 1.2, weapon: null, sleeves: 'long' }, look[key] || {}));
  return DH.rigs[key];
};

/* the scene factory: the scenes are made in 99-start with the game in hand */
DH.makeScenes = (game) => {
  const S = {};
  const prog = () => DH.Progress.load();
  const sfx = (n) => DH.Sound.play(n);

  /* ------------------------------------------------------------ title */
  let titleMenu = null, idle = 0;
  S.title = {
    enter() {
      if (DH.hub.on) return game.go('hubBoot', null, { fade: 0 });   // a session never shows the title (section 4.23)
      DH.Sound.attach(game);
      const items = DH.touchOnly() ? [{ label: 'SETTINGS', disabled: false }] : ['CAREER', 'FREE RUN', 'DUEL', "DRIVER'S LOG", 'HOW TO DRIVE', 'SETTINGS', 'ABOUT & CREDITS'];
      titleMenu = new E.Menu(game, items, {
        x: 'center', y: 'center', onPick: (i) => {
          const t = DH.touchOnly();
          if (t) return game.menu('settings');
          const pick = ['career', 'free', 'duel', 'log', 'help', 'settings', 'about'][i];
          sfx('confirm');
          if (pick === 'settings') return game.menu('settings');
          game.go(pick === 'career' ? 'map' : pick === 'free' ? 'free' : pick === 'duel' ? 'duelLobby' : pick === 'log' ? 'log' : pick === 'help' ? 'help' : 'about');
        }
      });
      idle = 0; game.lights && (game.lights.enabled = false);
    },
    update(dt) {
      game.input.glyphs = game.settings.buttons === 'Xbox' ? 'xbox' : 'playstation';
      if (DH.touchOnly()) { if (game.input.pressed('confirm')) game.menu('settings'); }
      titleMenu.update(dt);
      idle += dt;
      if (idle > 10) return game.go('attract', null, { fade: 'wipe' });
      if (DH.anyInput(game.input)) idle = 0;
    },
    draw(r) {
      DH.drawBackdrop(r, DH.TITLE_HOUR);
      DH.titleText(r, 'DENSHA DE HALO!', r.W / 2, Math.round(r.H * .14), 3);
      DH.text(r, 'THE HALO LINE • AKARI CITY', r.W / 2, Math.round(r.H * .14) + 30, '#e8e0ff', { align: 'center', scale: 1, shadow: '#000' });
      titleMenu.draw(r);
      if (DH.touchOnly()) DH.text(r, 'Controller or keyboard required', r.W / 2, Math.round(r.H * .62), '#ffb040', { align: 'center', scale: 2, shadow: '#000' });
      const pr = ('PRESS ' + game.input.label('confirm')).toUpperCase();
      DH.text(r, pr, r.W / 2, r.H - 26, '#ffffff', { align: 'center', shadow: '#000' });
      DH.text(r, 'v' + DH.VERSION + '  •  ' + (E.versionLabel ? E.versionLabel() : ''), 8, r.H - 12, '#7a7490', { scale: 1 });
    }
  };

  /* ------------------------------------------------------------ the Halo Map (career) */
  let mapSel = 0;
  S.map = {
    enter(data) {
      const p = prog(); mapSel = data && data.stage ? DH.stageIds.indexOf(data.stage) : Math.max(0, DH.stageIds.findIndex(id => !p.ranks[id] && p.unlocked.includes(id)));
      if (mapSel < 0) mapSel = 0; idle = 0;
    },
    update(dt) {
      const I = game.input, p = prog();
      if (I.pressed('left') || I.repeat && I.repeat('left', .25, .18)) { mapSel = (mapSel + DH.stageIds.length - 1) % DH.stageIds.length; sfx('select'); }
      if (I.pressed('right') || I.repeat && I.repeat('right', .25, .18)) { mapSel = (mapSel + 1) % DH.stageIds.length; sfx('select'); }
      if (I.pressed('confirm')) {
        const id = DH.stageIds[mapSel];
        if (p.unlocked.includes(id)) { sfx('confirm'); game.go('briefing', { stage: id }); } else sfx('cancel');
      }
      if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' });
      idle += dt; if (idle > 10) return game.go('attract', null, { fade: 'wipe' });
      if (DH.anyInput(I)) idle = 0;
    },
    draw(r) {
      const p = prog(), cx = r.W * .34, cy = r.H * .54, R = Math.min(r.W * .27, r.H * .30);
      DH.drawBackdrop(r, 6);
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#101024', '#07071a'], border: '#3a3660', alpha: .9 });
        E.font.text(g, 'HALO MAP', r.W / 2, 14, '#f2c230', { align: 'center', scale: 2 });
        for (let i = 0; i < 360; i++) { const a = i * Math.PI / 180; E.px.rect(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R * .9, 2, 2, '#f2c230'); }
        DH.haloStations.forEach(([name, s], i) => {
          const a = -Math.PI / 2 + i / 12 * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .9;
          E.px.disc(g, x, y, 4, '#ffffff'); E.font.text(g, name.slice(0, 12), x + Math.cos(a) * 12, y + Math.sin(a) * 8 - 3, '#e8e0ff', { align: Math.cos(a) > .2 ? 'left' : Math.cos(a) < -.2 ? 'right' : 'center', scale: 1, shadow: '#000' });
        });
        DH.stageIds.forEach((id, i) => {
          const [a0, a1] = DH.stageArcs[id], sel = i === mapSel, done = p.ranks[id], locked = !p.unlocked.includes(id);
          const ang0 = -Math.PI / 2 + a0 / 12 * Math.PI * 2, ang1 = -Math.PI / 2 + a1 / 12 * Math.PI * 2;
          const col = locked ? '#3a3850' : sel ? '#ffffff' : '#f2c230';
          for (let k = 0; k <= 30; k++) { const a = ang0 + (ang1 - ang0) * k / 30; E.px.disc(g, cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10) * .9, sel ? 3 : 2, col); }
          if (done) E.font.text(g, done, cx + Math.cos((ang0 + ang1) / 2) * (R + 22), cy + Math.sin((ang0 + ang1) / 2) * (R + 22) * .9, '#ff5a40', { align: 'center', scale: 2 });
        });
        DH.drawStageCard(g, r, DH.stageIds[mapSel], p);
        E.font.text(g, DH.promptText(game, 'confirm', 'GO') + '   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 16, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };

  /* ------------------------------------------------------------ the stage card (shared) */
  DH.drawStageCard = (g, r, id, p) => {
    const st = DH.stageById(id), w = Math.min(r.W * .40, 320), x = r.W - w - 12, y = 30, h = 104;
    E.ui.box(g, x, y, w, h, { bg: ['#1e1b34', '#0c0a18'], border: '#8a80b8', alpha: .95 });
    E.font.text(g, id + '  ' + st.name, x + 8, y + 7, '#f2c230', { scale: w > 260 ? 2 : 1 });
    const locked = !p.unlocked.includes(id);
    const lines = [st.time ? 'TIME ' + (st.time || st.startClock.slice(0, 5)) : '', 'WEATHER ' + st.weather.toUpperCase(), 'TRAIN ' + (DH.TRAINS[st.train].name), 'STOPS ' + (st.stops || []).length,
      'BEST ' + (p.ranks[id] || '-')];
    lines.forEach((t, i) => E.font.text(g, t, x + 8, y + 32 + i * 13, locked ? '#7a7490' : '#e8e0ff', { scale: 1 }));
    if (locked) E.font.text(g, 'LOCKED: FINISH THE STAGE BEFORE', x + 8, y + h - 12, '#ff8a6a', { scale: 1 });
  };
  DH.promptText = (game, action, word) => (game.input.label(action) + ' ' + word);

  /* ------------------------------------------------------------ the briefing (a Dialog, then the stage card, then START) */
  S.briefing = {
    enter(data) {
      this.stage = (data && data.stage) || DH.deepStage || 'S1'; this.step = 0;
      const st = DH.stageById(this.stage);
      this.talk = new E.Dialog(game);
      // each line is said by its speaker, with the speaker's live portrait (a Humanoid rig, section 5.4)
      const lines = st.briefing, sayAt = (i) => {
        if (i >= lines.length) { this.step = 1; return; }
        const [who, text] = lines[i];
        this.talk.say(text, { name: who.toUpperCase(), portrait: DH.rigFor(who), onDone: () => sayAt(i + 1) });
      };
      this.sayAt = sayAt; sayAt(0);
    },
    update(dt) {
      if (this.step === 0) { if (this.talk.update(dt)) return; this.step = 1; }
      if (this.step === 1 && game.input.pressed('confirm')) { sfx('confirm'); game.go('drive', { stage: this.stage }, { fade: 'wipe' }); }
      if (this.step === 1 && game.input.pressed('cancel')) game.go('map', { stage: this.stage });
    },
    draw(r) {
      DH.drawBackdrop(r, DH.stageById(this.stage).hour);
      r.overlay(g => { E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#0c0a18'], alpha: .35 }); });
      if (this.talk && this.talk.open) this.talk.draw(r);
      if (this.step === 1) r.overlay(g => { DH.drawStageCard(g, r, this.stage, prog()); E.font.text(g, DH.promptText(game, 'confirm', 'START'), r.W / 2, r.H - 16, '#ffffff', { align: 'center', scale: 1 }); });
    }
  };

  /* ------------------------------------------------------------ the drive */
  S.drive = DH.driveScene(game, prog, sfx);

  /* ------------------------------------------------------------ results, game over */
  S.results = {
    enter(data) { this.d = data; this.t0 = game.time; const p = prog(); if (data.rank && !data.attract) { const old = p.ranks[data.stage]; const order = 'SABCD'; if (!old || order.indexOf(data.rank) < order.indexOf(old)) p.ranks[data.stage] = data.rank; if (data.passed) DH.Progress.unlockNext(p, data.stage); DH.Progress.save(p); } this.menu = new E.Menu(game, [data.next ? 'NEXT STAGE' : 'CONTINUE', 'RETRY', 'HALO MAP'], { x: 'center', y: Math.round(game.H || 240) * .72 | 0, onPick: (i) => { sfx('confirm'); if (i === 0) game.go(data.next ? 'briefing' : 'map', data.next ? { stage: data.next } : { stage: data.stage }); else if (i === 1) game.go('briefing', { stage: data.stage }); else game.go('map', { stage: data.stage }); } }); sfx(data.rank === 'S' || data.rank === 'A' ? 'good' : 'confirm'); if (data.rank) sfx('stamp'); },
    update(dt) { this.menu.update(dt); if (game.input.pressed('cancel')) game.go('map'); },
    draw(r) {
      const d = this.d; DH.drawBackdrop(r, 20);
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .92 });
        E.font.text(g, 'RESULTS  ' + d.stage + ' ' + (DH.stageById(d.stage).name), 14, 14, '#f2c230', { scale: r.W > 380 ? 2 : 1 });
        const stampX = r.W - 70, stampY = 96, t = Math.min(1, (game.time - this.t0) * 3);
        const sz = 1 + (1 - t) * 1.5;
        E.ui.box(g, stampX - 30 * sz, stampY - 24 * sz, 60 * sz, 48 * sz, { bg: '#c0281a', border: '#ffd0c0', gradient: false });
        E.font.text(g, d.rank || '-', stampX, stampY - 12 * sz, '#ffffff', { align: 'center', scale: 3 * sz });
      });
      const rows = d.rows || [];
      rows.forEach((row, i) => { DH.text(r, row[0], 16, 52 + i * 16, '#e8e0ff', { scale: 1 }); DH.text(r, String(row[1]), Math.round(r.W * .42), 52 + i * 16, '#f2c230', { scale: 1 }); });
      DH.text(r, 'HALO TIME LEFT  ' + Math.max(0, Math.round(d.halo || 0)), 16, 52 + rows.length * 16 + 4, '#ffffff', { scale: 1 });
      if (d.line) DH.text(r, 'HOSHINO: "' + d.line + '"', 16, 52 + rows.length * 16 + 22, '#ffe0a0', { scale: 1 });
      this.menu.draw(r);
    }
  };
  S.gameover = {
    enter(data) { this.d = data; this.menu = new E.Menu(game, ['RETRY STAGE', 'CONTINUE FROM LAST STATION', 'HALO MAP'], { x: 'center', y: 150, onPick: (i) => { sfx('confirm'); if (i === 0) game.go('briefing', { stage: data.stage }); else if (i === 1) game.go('drive', { stage: data.stage, continueFrom: true }, { fade: 'wipe' }); else game.go('map', { stage: data.stage }); } }); sfx('hurt'); },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      DH.drawBackdrop(r, 20);
      r.overlay(g => { E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#1a0a0a', '#0a0404'], alpha: .9 }); });
      DH.titleText(r, 'GAME OVER', r.W / 2, 40, 2, ['#ffb0a0', '#e04030', '#601010']);
      DH.text(r, 'HOSHINO: "That\'s enough. Hand me the key."', r.W / 2, 80, '#ffe0a0', { align: 'center', scale: 1, shadow: '#000' });
      this.menu.draw(r);
    }
  };

  /* ------------------------------------------------------------ the Driver's Log, How to Drive, About & Credits */
  S.log = {
    enter() { this.page = 0; idle = 0; },
    update(dt) { const I = game.input; if (I.pressed('right') || I.pressed('confirm')) this.page = (this.page + 1) % 3; if (I.pressed('left')) this.page = (this.page + 1) % 3; if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' }); idle += dt; if (idle > 10) return game.go('attract', null, { fade: 'wipe' }); if (DH.anyInput(I)) idle = 0; },
    draw(r) {
      const p = prog(); DH.drawBackdrop(r, 20);
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .92 });
        E.font.text(g, "DRIVER'S LOG", 16, 14, '#f2c230', { scale: 2 });
        if (this.page === 0) {
          DH.stageIds.forEach((id, i) => E.font.text(g, id + '  ' + DH.stageById(id).name + '   BEST ' + (p.ranks[id] || '-'), 16, 48 + i * 18, '#e8e0ff', { scale: 2 }));
        } else if (this.page === 1) {
          const s = p.stats; const cards = [['KM DRIVEN', (s.km || 0).toFixed(1)], ['STOPS MADE', s.stops || 0], ['PERFECT STOPS', s.perfect || 0], ['CALLS MADE', s.calls || 0]];
          cards.forEach(([t, v], i) => { const x = 16 + (i % 2) * (r.W / 2 - 16), y = 48 + Math.floor(i / 2) * 70; E.ui.box(g, x, y, r.W / 2 - 40, 58, { bg: ['#1e1b34', '#0c0a18'] }); E.font.text(g, t, x + 8, y + 8, '#c8c4dc', { scale: 1 }); E.font.text(g, String(v), x + 8, y + 24, '#f2c230', { scale: 3 }); });
        } else {
          // the postcards: a 4 by 2 grid; a card is its picture's caption until it is unlocked, then its message
          const got = p.postcards || [];
          DH.POSTCARDS.forEach((c, i) => { const x = 16 + (i % 4) * Math.round((r.W - 32) / 4), y = 44 + Math.floor(i / 4) * 80, w = Math.round((r.W - 32) / 4) - 8; const ok = got.includes(c.id); E.ui.box(g, x, y, w, 70, { bg: ok ? ['#3a2e1e', '#1e160c'] : ['#1a1826', '#0c0a14'], border: ok ? '#f2c230' : '#3a3652' }); E.font.text(g, ok ? c.title : 'POSTCARD ' + c.id, x + 6, y + 6, ok ? '#f2c230' : '#6a6680', { scale: 1, wrap: w - 12 }); E.font.text(g, ok ? '"' + c.text + '"' : 'LOCKED', x + 6, y + 30, ok ? '#e8e0ff' : '#5a5670', { scale: 1, wrap: w - 12 }); if (ok) E.font.text(g, '- ' + c.from, x + 6, y + 56, '#c8c4dc', { scale: 1 }); });
        }
        E.font.text(g, '< > PAGES   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 18, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };
  S.help = {
    enter() { this.page = 0; idle = 0; this.pages = DH.HELP_PAGES; },
    update(dt) { const I = game.input; if (I.pressed('right') || I.pressed('confirm')) this.page = Math.min(this.pages.length - 1, this.page + 1); if (I.pressed('left')) this.page = Math.max(0, this.page - 1); if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' }); idle += dt; if (idle > 10) return game.go('attract', null, { fade: 'wipe' }); if (DH.anyInput(I)) idle = 0; },
    draw(r) {
      DH.drawBackdrop(r, 20);
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .92 });
        const pg = this.pages[this.page];
        E.font.text(g, 'HOW TO DRIVE • ' + pg.title, 16, 14, '#f2c230', { scale: 2 });
        E.font.wrap ? E.font.text(g, pg.body.join('\n'), 16, 46, '#e8e0ff', { scale: 1, wrap: r.W - 32 }) : E.font.text(g, pg.body.join(' '), 16, 46, '#e8e0ff', { scale: 1 });
        DH.controlsHelp(g, r);
        E.font.text(g, '< > PAGES   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 18, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };
  S.about = {
    enter() { this.page = 0; idle = 0; },
    update(dt) { const I = game.input; if (I.pressed('right') || I.pressed('confirm')) this.page = Math.min(DH.ABOUT.length - 1, this.page + 1); if (I.pressed('left')) this.page = Math.max(0, this.page - 1); if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' }); idle += dt; if (idle > 10) return game.go('attract', null, { fade: 'wipe' }); if (DH.anyInput(I)) idle = 0; },
    draw(r) {
      DH.drawBackdrop(r, 20);
      const pg = DH.ABOUT[this.page];
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .94 });
        E.font.text(g, 'ABOUT & CREDITS • ' + pg.title, 14, 12, '#f2c230', { scale: 2 });
        let y = 42;
        for (const line of pg.lines) { E.font.text(g, line, 14, y, '#e8e0ff', { scale: 1, wrap: r.W - 28 }); y += 9 * (1 + Math.floor(line.length / Math.max(20, Math.floor((r.W - 28) / 6)))); }
        E.font.text(g, (this.page + 1) + ' / ' + DH.ABOUT.length + '   < > PAGES   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 18, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };

  /* ------------------------------------------------------------ the ending (after S5) */
  S.ending = {
    enter() { this.t0 = game.time; },
    update() { if (game.time - this.t0 > 6 && game.input.pressed('confirm') || game.time - this.t0 > 60) game.go('title', null, { fade: 'wipe' }); },
    draw(r) {
      const t = game.time - this.t0;
      DH.drawBackdrop(r, 23.2);
      DH.titleText(r, 'EVENING HALO', r.W / 2, r.H * .28, 2);
      const lines = ['THANK YOU FOR RIDING THE HALO LINE', '', 'Hoshino-san, 38 years, one last train.', 'Every ending is the next departure.', '', 'Original homage to Densha de Go! (Taito). Not affiliated.'];
      lines.forEach((l, i) => { const y = r.H - (t * 22) + i * 16; if (y > 40 && y < r.H) DH.text(r, l, r.W / 2, y, '#ffffff', { align: 'center', scale: 1, shadow: '#000' }); });
    }
  };

  /* ------------------------------------------------------------ Free Run: any stage, any time, train and difficulty */
  S.free = {
    enter() { this.sel = 1; this.opts = { time: 0, weather: 0, train: 0, difficulty: 1 }; idle = 0; this.rows = [['STAGE', DH.stageIds.slice(1)], ['TIME', ['AS STAGE', 'DAWN', 'DAY', 'NIGHT']], ['WEATHER', ['AS STAGE', 'CLEAR', 'RAIN', 'FOG']], ['DIFFICULTY', ['Easy', 'Normal', 'Expert']]]; this.idx = [0, 0, 0, 1]; },
    update(dt) {
      const I = game.input;
      if (I.pressed('up')) this.sel = Math.max(0, this.sel - 1);
      if (I.pressed('down')) this.sel = Math.min(this.rows.length, this.sel + 1);
      if (I.pressed('left') && this.sel < this.rows.length) this.idx[this.sel] = (this.idx[this.sel] + this.rows[this.sel][1].length - 1) % this.rows[this.sel][1].length;
      if (I.pressed('right') && this.sel < this.rows.length) this.idx[this.sel] = (this.idx[this.sel] + 1) % this.rows[this.sel][1].length;
      if (I.pressed('confirm') && this.sel === this.rows.length) { const id = this.rows[0][1][this.idx[0]]; game.go('drive', { stage: id, free: { time: this.idx[1], weather: this.idx[2], difficulty: this.rows[3][1][this.idx[3]].toLowerCase() } }, { fade: 'wipe' }); }
      if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' });
      idle += dt; if (idle > 10) return game.go('attract', null, { fade: 'wipe' }); if (DH.anyInput(I)) idle = 0;
    },
    draw(r) {
      DH.drawBackdrop(r, 12);
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .9 });
        E.font.text(g, 'FREE RUN', 16, 14, '#f2c230', { scale: 2 });
        this.rows.forEach(([label, opts], i) => { const y = 48 + i * 22, hi = this.sel === i; if (hi) E.ui.box(g, 12, y - 3, r.W - 24, 18, { bg: ['#3a3450', '#2a2540'], gradient: true }); E.font.text(g, label, 18, y, '#c8c4dc', { scale: 2 }); E.font.text(g, '< ' + opts[this.idx[i]] + ' >', r.W * .55, y, hi ? '#ffffff' : '#e8e0ff', { scale: 2 }); });
        const y = 48 + this.rows.length * 22 + 10, hi = this.sel === this.rows.length;
        E.font.text(g, 'START', r.W / 2, y, hi ? '#f2c230' : '#ffffff', { align: 'center', scale: 3 });
        E.font.text(g, DH.promptText(game, 'confirm', 'SELECT') + '   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 18, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };

  /* ------------------------------------------------------------ Dev Mode (section 4.21): live sliders, tools, reset */
  S.dev = {
    enter(data) {
      this.back = (data && data.back) || 'title'; this.backData = (data && data.backData) || null; this.sel = 0; this.rows = DH.devRows(game, this);
    },
    update(dt) {
      const I = game.input, rows = this.rows;
      if (I.pressed('up')) this.sel = (this.sel + rows.length - 1) % rows.length;
      if (I.pressed('down')) this.sel = (this.sel + 1) % rows.length;
      const row = rows[this.sel];
      if (I.pressed('left') || I.repeat && I.repeat('left', .25, .12)) row.adj && row.adj(-1);
      if (I.pressed('right') || I.repeat && I.repeat('right', .25, .12)) row.adj && row.adj(1);
      if (I.pressed('confirm') && row.act) row.act();
      if (I.pressed('cancel')) game.go(this.back, this.backData || null, { fade: 'wipe' });
    },
    draw(r) {
      DH.drawBackdrop(r, 12);
      const rows = this.rows, top = 36, per = 12, start = Math.max(0, this.sel - 6);
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .94 });
        E.font.text(g, 'DEV MODE • BALANCE', 14, 12, '#f2c230', { scale: 2 });
        rows.slice(start, start + 14).forEach((row, i) => {
          const y = top + i * per, hi = start + i === this.sel;
          if (hi) px.rect(g, 10, y - 2, r.W - 20, per, '#3a3450');
          E.font.text(g, row.label, 14, y, hi ? '#ffffff' : '#c8c4dc', { scale: 1 });
          E.font.text(g, row.value(), r.W - 14, y, hi ? '#f2c230' : '#e8e0ff', { scale: 1, align: 'right' });
        });
        E.font.text(g, '^v SELECT   <> ADJUST   ' + DH.promptText(game, 'cancel', 'BACK'), r.W / 2, r.H - 14, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };
  const px = E.px;

  /* ------------------------------------------------------------ the attract loop (section 4.20) */
  S.attract = DH.attractScene(game, prog);
  return S;
};

/* the backdrop: a sky at the given hour, with the Halo line's rails across the bottom (the title's background) */
DH.TITLE_HOUR = 6.2;
DH.drawBackdrop = (r, hour) => {
  const gr = DH.todGrade(hour);
  r.overlay(gg => {
    const H = r.H, W = r.W;
    for (let b = 0; b < 16; b++) E.px.rect(gg, 0, Math.floor(b * H / 16), W, Math.ceil(H / 16) + 1, DH.mix(gr.top, gr.horizon, b / 15));
    // a horizon of hills, and the rails in front
    for (let x = 0; x < W; x += 4) E.px.rect(gg, x, Math.round(H * .58 + Math.sin(x * .02) * 6), 4, H, '#2a3a2a');
    for (let i = 0; i < 6; i++) E.px.rect(gg, 0, Math.round(H * .66 + i * 8), W, 1, DH.mix('#6a6058', '#1a1820', i / 6));
  });
};
})();
