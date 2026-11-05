// The menu scenes: the title (with its idle timer), the attract reel, campaign and skirmish setup, how to play, dev mode,
// the story dialog, the endings, and the About and credits screen.
(() => {
  const H = G, px = E.px;
  const ses = H.session = H.session || { cs: null, human: 'verdance', battle: null, hub: null };
  const SKIRMISH = {
    player: [{ kind: 'knight', ref: 'oren', leader: true, items: ['sun-rune'] }, { kind: 'knight', ref: 'bryony' }, { kind: 'knight', ref: 'dunstan' },
      { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }],
    foe: [{ kind: 'knight', ref: 'tamsin', leader: true }, { kind: 'knight', ref: 'ysolde' }, { kind: 'knight', ref: 'ferrin' },
      { kind: 'monster', ref: 'storm-pixie', form: 0 }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 1 }]
  };
  H.SKIRMISH = SKIRMISH;
  // the attract reel's battles: a different map, season and seed each time
  const reel = (seed) => {
    const rng = new H.Rng(seed);
    return H.BattleSim.create({ map: rng.pick(H.ids('map')), season: rng.pick(H.SEASON_ORDER), seed,
      sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
  };

  // ---- the title: the menu, the four seasons on the backdrop, and the touch-only notice ----
  H.titleScene = {
    enter() {
      const game = this.game;
      this.idle = 0; this.t = 0; this.touchOnly = H.touchOnly(game);
      this.lastPointer = null;
      this.saved = game.saves.latest ? game.saves.latest() : null;
      const items = [];
      if (!this.touchOnly) {
        items.push({ label: 'New campaign', key: 'campaign' });
        if (this.saved) items.push({ label: 'Continue', key: 'continue' });
        items.push({ label: 'Skirmish', key: 'skirmish' });
        items.push({ label: 'Tutorial: Border Meadow', key: 'tutorial' });
        items.push({ label: 'How to play', key: 'help' });
      }
      items.push({ label: 'Options', key: 'options' });
      items.push({ label: 'About and credits', key: 'about' });
      this.menu = new H.List(items, { x: 40, y: 0, w: 150, rowH: 14, maxRows: 9, onPick: (i, it) => this.pick(it.key) });
      game.audio.music(H.SONGS.title);
      game.input.touchEnabled = false;
    },
    pick(key) {
      const game = this.game;
      if (key === 'campaign') game.go('setup');
      else if (key === 'continue') { if (this.saved) game.saves.load(this.saved.slot ?? 'auto'); }
      else if (key === 'skirmish') game.go('skirmish');
      else if (key === 'tutorial') game.go('event', { lines: H.TUTORIAL_LINES, next: { scene: 'battle', data: H.tutorialBattle(game) } });
      else if (key === 'help') game.go('help');
      else if (key === 'options') game.menu('settings');
      else if (key === 'about') game.go('about');
    },
    update(dt) {
      const game = this.game, I = game.input;
      this.t += dt;
      const moved = I.pointer && I.pointer();
      const acted = I.anyPressed() || I.clicked() || (moved && (!this.lastPointer || Math.abs(moved[0] - this.lastPointer[0]) + Math.abs(moved[1] - this.lastPointer[1]) > 2));
      this.lastPointer = moved || this.lastPointer;
      if (acted) this.idle = 0; else this.idle += dt;
      if (this.idle > 10) { game.go('attract'); return; }
      this.menu.update(game);
    },
    draw(r) {
      const game = this.game, t = this.t;
      // the four seasons: a band of each around a clock tower, a day that turns
      r.sky(['#101838', '#3a2a60']);
      r.overlay(g => {
        const seasons = [['#2e6a3a', '#7ad06a'], ['#8a4a20', '#ffb060'], ['#6a4a20', '#e8a040'], ['#2a4a6a', '#9ad8ff']];
        seasons.forEach(([dark, light], i) => {
          const x0 = i * r.W / 4;
          for (let y = r.H * .72; y < r.H; y++) px.rect(g, x0, Math.round(y), r.W / 4 + 1, 1, y < r.H * .8 ? light : dark);
        });
        // the clock tower in the middle, its hands going round
        const cx = Math.round(r.W * .72), cy = Math.round(r.H * .42);
        px.rect(g, cx - 14, cy - 8, 28, 60, '#2a2238');
        px.rect(g, cx - 10, cy - 4, 20, 56, '#3a3050');
        px.disc(g, cx, cy - 8, 12, '#e8dcc0'); px.disc(g, cx, cy - 8, 10, '#fff8e0');
        const ang = t * .6;
        px.line(g, cx, cy - 8, Math.round(cx + Math.cos(ang) * 8), Math.round(cy - 8 + Math.sin(ang) * 8), '#2a2030', 1);
        px.line(g, cx, cy - 8, Math.round(cx + Math.cos(ang * .08) * 5), Math.round(cy - 8 + Math.sin(ang * .08) * 5), '#2a2030', 1);
      });
      r.overlay(g => {
        E.font.title(g, 'BRIGANTIME', r.W / 2 - 60, 16, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a', align: 'center' });
        E.font.text(g, 'THE LEGEND OF FORSEASONS', 40, 52, '#e8e0ff', { shadow: '#000' });
      });
      this.menu.y = Math.round(r.H * .3);
      this.menu.x = 40;
      this.menu.draw(r);
      if (this.touchOnly) {
        r.overlay(g => {
          E.ui.box(g, 30, r.H * .62, r.W - 60, 40, { bg: ['#1c1830', '#0e0b18'], alpha: .92 });
          E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H * .62 + 8, '#fff4c8', { align: 'center', shadow: '#000' });
          E.font.text(g, 'Options and About are still here.', r.W / 2, r.H * .62 + 22, '#cfc6ec', { align: 'center', shadow: '#000' });
        });
      }
      H.promptRow(r, game, [['confirm', 'Select']], 6, r.H - 12);
    }
  };

  // ---- attract: the reel of battles, the AI playing, every hit healed (the reel is for the view, not the balance) ----
  H.attractScene = {
    enter() {
      this.seed = 11; this.wait = 0; this.start();
      this.game.audio.music(H.SONGS.title);
    },
    start() {
      this.sim = reel(this.seed++);
      this.board = new H.Board(this.game, this.sim, {});
      this.board.enter();
      this.aiWait = .6; this.done = false; this.log = [];
      this.board.push([{ type: 'bell', n: this.sim.s.bell, season: this.sim.s.season }]);
    },
    update(dt) {
      const game = this.game, I = game.input;
      if (I.anyPressed() || I.clicked()) { game.go('title'); return; }
      const b = this.board;
      b.update(dt);
      if (this.sim.s.over) {
        if (!this.done) { this.done = true; this.wait = 2.5; }
        this.wait -= dt;
        if (this.wait <= 0) this.start();
        return;
      }
      if (b.busy > 0 || b.queue.length || b.walk) return;
      this.aiWait -= dt;
      if (this.aiWait > 0) return;
      const cmd = H.aiBattle.next(this.sim);
      if (cmd) {
        const ev = this.sim.apply(cmd);
        b.push(ev);
        // the cheat: no unit can fall in the reel, so the view stays full
        for (const u of this.sim.s.units) { if (u.dead) { u.dead = false; u.hp = 1; } }
      }
      this.aiWait = .25;
    },
    draw(r) {
      const b = this.board;
      r.sky(['#101838', '#3a2a60']);
      b.draw(r, { focus: [] });
      r.overlay(g => {
        E.font.title(g, 'BRIGANTIME', r.W / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, 'ATTRACT • PRESS ANY BUTTON', r.W / 2, r.H - 12, '#ffe9a8', { align: 'center', shadow: '#000' });
      });
    }
  };

  // ---- setup: the players (1 to 4 on one device), the realm of the first, and the start ----
  H.setupScene = {
    enter() {
      this.players = 1; this.realmI = Math.max(0, H.PLAYABLE_REALMS.indexOf(ses.human));
      this.menu = new H.List([], { x: 40, y: 70, w: 200, rowH: 14, title: 'New campaign', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    rebuild() {
      const i = this.menu.i || 0;
      this.menu.set([
        { label: 'Players', sub: this.players > 1 ? this.players + ' hot-seat' : '1', key: 'players' },
        { label: 'Your realm', sub: H.get('realm', H.PLAYABLE_REALMS[this.realmI]).name, key: 'realm' },
        { label: 'Begin', key: 'begin' }], i);
    },
    pick(key) {
      if (key === 'players') { this.players = this.players % 4 + 1; this.rebuild(); }
      if (key === 'realm') { this.realmI = (this.realmI + 1) % H.PLAYABLE_REALMS.length; this.rebuild(); }
      if (key === 'begin') {
        // the first player takes the chosen realm; the others take the next realms round the list
        const first = H.PLAYABLE_REALMS[this.realmI];
        const humans = [first].concat(H.PLAYABLE_REALMS.filter(x => x !== first)).slice(0, this.players);
        ses.human = first;
        this.game.go('campaign', { start: true, humans });
      }
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      const id = H.PLAYABLE_REALMS[this.realmI];
      const rl = H.get('realm', id), ruler = H.get('knight', rl.ruler);
      r.overlay(g => {
        E.font.title(g, rl.name.toUpperCase(), r.W / 2 + 60, 14, { scale: 2, colors: ['#fff6c8', rl.accent], outline: '#1a0c10', align: 'center' });
        E.ui.box(g, r.W / 2 - 6, 62, r.W / 2 - 30, r.H - 92, { bg: ['#1c1830', '#0e0b18'], border: rl.color, alpha: .92 });
        E.font.text(g, ruler.name + ', ' + ruler.title, r.W / 2 + 4, 72, '#fff4c8', { shadow: '#000' });
        E.font.text(g, '"' + rl.motto + '"', r.W / 2 + 4, 84, '#cfc6ec', { shadow: '#000' });
        H.say(r, ruler.quote, r.W / 2 + 4, 100, r.W / 2 - 46, '#f0ecff');
        H.say(r, 'Your capital is ' + H.get('castle', rl.capital).name + '. With more than one player, each ruler musters in turn, and the device is passed between them.', r.W / 2 + 4, 136, r.W / 2 - 46, '#cfc6ec');
      });
      this.menu.draw(r);
      H.promptRow(r, this.game, [['confirm', 'Choose'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };

  // ---- skirmish: one battle, a Verdance troop against a Solmark troop, chosen map and season ----
  H.skirmishScene = {
    enter() {
      this.map = 0; this.season = 0; this.hot = false;
      this.menu = new H.List([], { x: 60, y: 90, w: 220, rowH: 14, title: 'Skirmish', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    rebuild() {
      const maps = H.ids('map');
      this.menu.set([
        { label: 'Ground', sub: H.get('map', maps[this.map]).name, key: 'map' },
        { label: 'Season', sub: H.get('season', H.SEASON_ORDER[this.season]).name, key: 'season' },
        { label: 'Players', sub: this.hot ? '2 hot-seat' : '1 vs CPU', key: 'hot' },
        { label: 'Begin the battle', key: 'begin' }], this.menu.i || 0);
    },
    pick(key) {
      if (key === 'map') { this.map = (this.map + 1) % H.ids('map').length; this.rebuild(); }
      if (key === 'season') { this.season = (this.season + 1) % 4; this.rebuild(); }
      if (key === 'hot') { this.hot = !this.hot; this.rebuild(); }
      if (key === 'begin') {
        const seed = ((Math.random() * 1e6) | 0) + 1;
        const sim = H.BattleSim.create({ map: H.ids('map')[this.map], season: H.SEASON_ORDER[this.season], seed,
          sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
        this.game.go('battle', { sim, playerSide: 0, humanSides: this.hot ? [0, 1] : [0], askDelegate: false, onDone: () => this.game.go('skirmish') });
      }
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'SKIRMISH', r.W / 2, 22, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      this.menu.draw(r);
      r.overlay(g => {
        const m = H.get('map', H.ids('map')[this.map]);
        E.font.text(g, m.name, r.W / 2 + 60, 110, '#fff4c8', { shadow: '#000' });
        E.font.text(g, 'You hold the west edge: Oren, Bryony, Dunstan.', r.W / 2 + 60, 124, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, 'Tamsin and her Solmark troop hold the keep.', r.W / 2 + 60, 136, '#cfc6ec', { shadow: '#000' });
      });
      H.promptRow(r, this.game, [['confirm', 'Choose'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };

  // ---- help: the pages, with the player's own buttons ----
  H.helpScene = {
    enter() { this.page = 0; this.pages = H.HELP_PAGES; },
    update() {
      const I = this.game.input;
      if (I.pressed('right') || I.pressed('confirm')) this.page = (this.page + 1) % this.pages.length;
      if (I.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
      if (I.pressed('cancel')) this.game.go('title');
    },
    draw(r) {
      const p = this.pages[this.page], game = this.game;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, p.title.toUpperCase(), r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, 14, 46, r.W - 28, r.H - 80);
      const lines = p.lines(game);
      let y = 54;
      for (const line of lines) { const n = H.say(r, line, 24, y, r.W - 48, '#f0ecff'); y += n * 9 + 5; }
      H.promptRow(r, game, [['left', 'Previous'], ['right', 'Next'], ['cancel', 'Title']], 6, r.H - 12);
      r.overlay(g => E.font.text(g, (this.page + 1) + ' / ' + this.pages.length, r.W - 6, r.H - 11, '#8a84a0', { align: 'right' }));
    }
  };
  H.HELP_PAGES = [
    { title: 'Controls', lines: g => {
      const I = g.input, dev = I.lastDevice || 'keyboard';
      return ['Move the cursor: ' + [I.label('up'), I.label('left'), I.label('down'), I.label('right')].join(' ') + (dev === 'mouse' ? ' or hover' : ''),
        'Choose: ' + I.label('confirm') + '.   Back: ' + I.label('cancel') + '.   End your bell: ' + I.label('endTurn') + '.',
        'Details of a unit: ' + I.label('info') + '.   Pause: ' + I.label('pause') + '.',
        'Buttons show PlayStation symbols; Options turns on Xbox letters.'];
    } },
    { title: 'The season', lines: () => ['Four seasons, each with tidings to read, a muster to make and marches to fight.',
      'The Hour-Candle counts the seasons you have. Let it burn out and the Gray Knight stops the clock.',
      'Win by taking Meridian, the Calendar City, held by the Hourless Dominion.'] },
    { title: 'Muster', lines: () => ['Summon a monster for mana at a castle you hold. One summon per castle each season.',
      'Bind a free monster to a ready knight. A knight\'s bond limits how many it can hold.',
      'Move a knight along a road, send it on a quest, equip it from the treasury, or march it on a castle next door.'] },
    { title: 'Battle', lines: () => ['Battles run bell by bell. Each unit acts once a bell, fastest first.',
      'Move your unit across the hexes, then attack, use its skill or wait. Forest and hill protect; rivers stop you.',
      'Attackers win by a knight on the Keep, or by routing the defenders. Defenders hold until the bells run out.',
      'A monster more than three hexes from every knight of its side is in no one\'s ward: it hits and guards a fifth less.',
      'The target list shows each strike\'s chance to hit and its damage. A fallen commander loses the battle for its side.'] },
    { title: 'Seasons in battle', lines: () => ['Spring floods the ground beside rivers. Summer burns the forests. Autumn gales spoil ranged shots.',
      'Winter freezes the rivers. Each season also favours its own element: Verdant, Solar, Ambered or Rime.',
      'Opposed elements hit harder: Verdant against Ambered, Solar against Rime.'] }
  ];

  // ---- dev mode: the tunables as live sliders, a reset to the defaults, and a few shortcuts ----
  H.devScene = {
    enter() {
      this.menu = new H.List([], { x: 40, y: 30, w: 240, rowH: 12, maxRows: 12, title: 'Dev mode', onPick: (i, it) => this.pick(it.key), onCancel: () => this.game.go('title') });
      this.rebuild();
      this.game.audio.music(H.SONGS.title);
    },
    keys() { return Object.keys(H.TUNE_RANGES); },
    rebuild() {
      const items = this.keys().map(k => ({ label: H.TUNE_LABELS[k], key: k, sub: String(+(H.tune[k].toFixed(2))) }));
      items.push({ label: 'Gallery of monsters', key: 'gallery' });
      items.push({ label: 'Give 10 mana (this campaign)', key: 'mana' });
      items.push({ label: 'Reset to defaults', key: 'reset' });
      items.push({ label: 'Test battle: Border Meadow', key: 'battle' });
      items.push({ label: 'Back', key: 'back' });
      const i = this.menu ? this.menu.i : 0;
      this.menu.set(items, i);
    },
    adjust(d) {
      const k = this.menu.item && this.menu.item.key;
      if (!k || !H.TUNE_RANGES[k]) return;
      const [lo, hi, step] = H.TUNE_RANGES[k];
      H.tune[k] = H.clamp(Math.round((H.tune[k] + d * step) / step) * step, lo, hi);
      E.store.set('brigantime:tune', H.tune);
      this.rebuild();
      H.sfx(this.game, 'cursor');
    },
    pick(key) {
      if (key === 'reset') { H.resetTune(); E.store.set('brigantime:tune', H.tune); this.rebuild(); }
      if (key === 'gallery') this.game.go('gallery');
      if (key === 'mana') { if (H.session.cs) H.session.cs.s.realms[H.session.human].mana += 10; H.sfx(this.game, 'confirm'); }
      if (key === 'battle') {
        const sim = H.BattleSim.create({ map: 'meadow', season: 'spring', seed: 7, sides: [{ troops: SKIRMISH.player }, { troops: SKIRMISH.foe }] });
        this.game.go('battle', { sim, playerSide: 0, onDone: () => this.game.go('dev') });
      }
      if (key === 'back') this.game.go('title');
    },
    update() {
      const I = this.game.input;
      if (I.pressed('left')) this.adjust(-1);
      if (I.pressed('right')) this.adjust(1);
      if (I.repeat('left', .4, .1) && !I.pressed('left')) this.adjust(-1);
      if (I.repeat('right', .4, .1) && !I.pressed('right')) this.adjust(1);
      this.menu.update(this.game);
    },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      this.menu.x = 40; this.menu.draw(r);
      r.overlay(g => {
        E.font.text(g, 'Left and right change a value. Every change is kept for this browser.', 40, r.H - 26, '#cfc6ec', { shadow: '#000' });
        const k = this.menu.item && this.menu.item.key;
        if (k && H.TUNE_RANGES[k]) {
          const [lo, hi] = H.TUNE_RANGES[k], f = (H.tune[k] - lo) / (hi - lo);
          E.font.text(g, H.TUNE_LABELS[k], 300, 30, '#fff4c8', { shadow: '#000' });
          E.ui.bar(g, 300, 46, 110, 6, H.clamp(f, 0, 1), '#ffd36a');
          E.font.text(g, 'default ' + H.TUNE_DEFAULTS[k], 300, 58, '#8a84a0', { shadow: '#000' });
        }
      });
      H.promptRow(r, this.game, [['left', 'Less'], ['right', 'More'], ['confirm', 'Choose'], ['cancel', 'Title']], 6, r.H - 12);
    }
  };

  // ---- the story: a line at a time, the speaker's babble, the portrait beside it ----
  const portraits = {};
  H.portrait = id => { if (!portraits[id]) { const k = H.get('knight', id); portraits[id] = { rig: H.rigFor({ kind: 'knight', ref: id, knight: true }).rig, pool: H.babble(k.voice.pitch, k.voice.lilt) }; } return portraits[id]; };
  H.eventScene = {
    pausable: false,
    enter(data = {}) {
      this.data = data; this.i = 0; this.talk = new E.Dialog(this.game);
      if (data.event) this.data = Object.assign({}, data, { lines: H.get('event', data.event).lines });
      this.ended = false; this.speaker = null;
      this.game.audio.music(H.SONGS.event);
      this.next();
    },
    // each line opens the dialog; when its box closes, the next line opens
    next() {
      const L = this.data.lines || [];
      if (this.i >= L.length) { this.finish(); return; }
      const line = L[this.i++];
      const who = line.who ? H.get('knight', line.who) : null;
      const pf = line.who ? H.portrait(line.who) : null;
      this.speaker = pf;
      this.lineText = line.text;
      this.profile = line.who ? H.voice.profileFor(line.who) : { base: 170, range: 6, wave: 'pulse', formant: 1, double: 0 };
      // a line with choices offers them on its last page; the choice's effects go to the campaign
      const choices = line.choices ? line.choices.map(c => c.text) : undefined;
      const onChoice = line.choices ? (idx) => { if (ses.cs) ses.cs.applyEffects(line.choices[idx].effects, ses.human); } : undefined;
      this.talk.say(line.text, { name: who ? who.name.toUpperCase() : (line.name || ''), portrait: pf ? pf.rig : undefined, portraitSize: 40, choices, onChoice, onDone: () => this.next() });
    },
    finish() {
      if (this.ended) return;
      this.ended = true;
      const nx = this.data.next;
      if (nx && nx.scene) this.game.go(nx.scene, nx.data || {});
      else this.game.go(this.data.then || 'title');
    },
    update(dt) {
      // the character about to be typed decides the sound it makes (no sound while the box is closed or between lines)
      if (this.talk.open && this.lineText) this.talk.voice = H.voice.letter(this.profile, this.lineText[Math.floor(this.talk.shown || 0)]);
      this.talk.update(dt);
    },
    draw(r) {
      r.sky(this.data.sky || ['#101838', '#3a2a60']);
      this.talk.draw(r);
    }
  };

  // ---- endings: the outcome, what the campaign came to, and the way out ----
  H.endingScene = {
    enter(data = {}) {
      this.outcome = data.outcome || 'ruler';
      this.menu = new H.List([{ label: 'Credits', key: 'about' }, { label: 'Title', key: 'title' }], { x: 150, y: 150, w: 120, rowH: 14, onPick: (i, it) => this.game.go(it.key) });
      this.game.audio.music(H.SONGS.ending);
    },
    update() { this.menu.update(this.game); },
    draw(r) {
      const text = H.ENDINGS[this.outcome] || H.ENDINGS.ruler;
      const won = this.outcome.startsWith('won');
      r.sky(won ? ['#103020', '#2a6a48'] : ['#301010', '#6a2a2a']);
      r.overlay(g => {
        E.font.title(g, text.title, r.W / 2, 22, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        H.panel(r, 24, 56, r.W - 48, 80);
      });
      H.say(r, text.body, 34, 66, r.W - 68, '#f4f0ff');
      const cs = ses.cs;
      if (cs) H.say(r, 'Seasons played: ' + cs.s.seasonsPlayed + ' • Year ' + cs.s.year + ' • Castles you hold: ' + Object.keys(cs.s.castles).filter(c => cs.s.castles[c].owner === ses.human).length, 34, 146, r.W - 68, '#cfc6ec');
      this.menu.draw(r);
      H.promptRow(r, this.game, [['confirm', 'Choose']], 6, r.H - 12);
    }
  };

  // ---- about and credits: the text the game was made with, scrolling ----
  H.aboutScene = {
    enter() { this.y = 0; this.game.audio.music(H.SONGS.title); },
    update(dt) {
      const I = this.game.input;
      if (I.down('down')) this.y += 90 * dt;
      if (I.down('up')) this.y -= 90 * dt;
      if (I.pressed('cancel') || I.pressed('confirm')) this.game.go('title');
      this.y = Math.max(0, this.y);
    },
    draw(r) {
      r.sky(['#101838', '#2a2050']);
      let y = 12 - this.y;
      r.overlay(g => E.font.title(g, 'ABOUT AND CREDITS', r.W / 2, 4, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      y += 26;
      for (const sec of H.ABOUT) {
        r.overlay(g => E.font.text(g, sec.heading.toUpperCase(), 14, y, '#ffd36a', { shadow: '#000' }));
        y += 11;
        for (const line of sec.lines) { const n = E.font.wrap(line, r.W - 36).length; H.say(r, line, 18, y, r.W - 36, '#f0ecff'); y += n * 9 + 4; }
        y += 6;
      }
      this.maxY = y;
      H.promptRow(r, this.game, [['up', 'Scroll'], ['cancel', 'Title']], 6, r.H - 12);
    }
  };
})();
