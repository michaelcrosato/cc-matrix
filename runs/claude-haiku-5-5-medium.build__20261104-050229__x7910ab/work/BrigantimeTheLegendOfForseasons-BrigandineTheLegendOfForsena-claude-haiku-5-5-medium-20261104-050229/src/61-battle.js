// The battle scene. It turns the player's input into BattleSim commands for the unit whose turn it is, plays the CPU's turns
// through the same commands, and hands the finished sim back to whoever started the battle (the campaign, a skirmish, the
// hub round). Keys, stick and mouse all work: the stick or arrows move the cursor across the hexes, A or Enter picks, B or
// Escape backs out, Y or E ends the player's turns for the bell, and the mouse hovers and clicks hexes and menu entries.
(() => {
  const H = G;

  // what a battle event says, for the log
  const describe = (sim, e) => {
    const name = uid => { const u = sim.byId(uid); return u ? u.name : '?'; };
    if (e.type === 'attack') {
      if (!e.hit) return name(e.from) + ' misses ' + name(e.to) + '.';
      return name(e.from) + ' hits ' + name(e.to) + ' for ' + e.dmg + (e.killed ? ', and it falls.' : '.');
    }
    if (e.type === 'skill') return name(e.uid) + ' uses ' + H.get('skill', e.skill).name + '.';
    if (e.type === 'heal') return name(e.uid) + ' is mended for ' + e.amount + '.';
    if (e.type === 'bell') return 'Bell ' + e.n + ' of ' + sim.s.bellLimit + '.';
    if (e.type === 'burn') return name(e.uid) + ' is scorched.';
    if (e.type === 'captured') return name(e.uid) + ' is captured!';
    if (e.type === 'retreat') return name(e.uid) + ' sounds the retreat.';
    if (e.type === 'over') return e.reason === 'keep' ? 'The Keep is taken.' : e.reason === 'time' ? 'The bells run out.' : e.reason === 'leader' ? 'The commander has fallen.' : 'The field is clear.';
    return null;
  };
  const REASON = { keep: 'The Keep is taken', time: 'The bells ran out', leader: 'The commander fell', routed: 'The field is clear' };

  // the input map this game uses: the engine's defaults, with the battle's own keys added
  H.STRATEGY_INPUT = Object.assign({}, E.Input.DEFAULT, {
    skill: ['KeyL', 'Mouse2', 'Pad2'],
    endTurn: ['KeyE', 'Pad3'],
    info: ['KeyI', 'Tab', 'Pad8']
  });

  H.battleScene = {
    pausable: true,
    view: 'overhead',
    // o: { sim, playerSide, askDelegate, onDone(sim, { won, playerSide }), title }
    enter(o = {}) {
      const game = this.game;
      this.o = o;
      this.sim = o.sim;
      this.playerSide = o.playerSide ?? 0;
      this.humanSides = o.humanSides || [this.playerSide];   // hot-seat: each human side takes its turns on this device
      this.lastHumanSide = null;
      this.board = new H.Board(game, this.sim, o);
      this.board.enter();
      this.cursor = { q: 0, r: 0 };
      this.unitId = null; this.mode = 'move'; this.menuKey = null;
      this.reach = new Map(); this.cands = []; this.cand = 0;
      this.log = [this.sim.s.title + ' • ' + H.get('season', this.sim.s.season).name];
      this.aiWait = .3; this.stick = 0; this.lastHex = null;
      this.phase = o.askDelegate ? 'ask' : 'play';
      this.resultShown = false; this.resultWon = false; this.doneCalled = false;
      this.ask = new H.List([{ label: 'Fight it yourself' }, { label: 'Delegate the battle' }], {
        x: 150, y: 96, w: 140, title: 'The march is set',
        onPick: (i) => { if (i === 1) this.delegate(); else { this.phase = 'play'; H.sfx(game, 'confirm'); } } });
      this.menu = new H.List([], { x: 12, y: 86, w: 140, title: 'Command' });
      this.menu.onPick = (i, it) => this.command(it.key);
      this.menu.onCancel = () => this.backToMove();
      this.targets = new H.List([], { x: 12, y: 86, w: 150, title: 'Target' });
      this.targets.onPick = (i, it) => this.confirmTarget(it.key);
      this.targets.onCancel = () => { this.mode = 'menu'; };
      this.targets.onMove = i => { this.cand = i; };
      const key = o.song || (this.sim.s.map === 'clockwork-sanctum' ? 'boss' : 'battle_attack');
      this.songKey = key;
      game.audio.music(H.SONGS[key]);
      // in a hub round the standing is reported about once a second (the timer ends with the scene)
      if (o.hub && typeof AIHub !== 'undefined' && AIHub.active) {
        this.progressTimer = game.every(1, () => {
          const sc = H.hubScore(this.sim, this.playerSide);
          AIHub.progress({ score: sc.score, label: sc.alive + ' standing, ' + sc.foes + ' foes fallen' });
        });
      }
      this.board.push([{ type: 'bell', n: this.sim.s.bell, season: this.sim.s.season }]);
    },
    exit() { if (this.game.audio) this.game.audio.music(null); },
    // who takes a unit's turn by hand on this copy (hot-seat: the human sides; a hub round: the unit's own player)
    local(u) { return this.humanSides.includes(u.side); },
    // a turn that is not this copy's: true when this copy plays it (the CPU, or a player who is not here)
    remoteTurn(u, dt) { void u; void dt; return true; },

    // ---- the state of the turn ----
    cur() { return this.sim.current(); },
    apply(cmd) {
      const ev = this.sim.apply(cmd);
      this.board.push(ev);
      for (const e of ev) { const line = describe(this.sim, e); if (line) this.log.push(line); }
      while (this.log.length > 4) this.log.shift();
      return ev;
    },
    buildMenu() {
      const u = this.cur(), sim = this.sim;
      const strike = sim.strikeable(u.uid).length, skills = sim.usableSkills(u.uid);
      const items = [
        { label: 'Attack', key: 'attack', disabled: !strike, sub: strike ? '' : 'no foe' },
        { label: 'Skills', key: 'skills', disabled: !skills.length, sub: skills.length ? skills.length + ' ready' : 'none ready' },
        ...(u.leader && u.knight ? [{ label: 'Retreat', key: 'retreat', sub: 'loses' }] : []),
        { label: 'Wait', key: 'wait' }];
      this.menu.set(items, items.findIndex(i => !i.disabled));
    },
    backToMove() {
      const u = this.cur();
      if (!u || u.moved) return;
      this.mode = 'move'; this.reach = this.sim.reach(u.uid);
    },
    command(key) {
      const u = this.cur();
      if (!u || !this.local(u)) return;
      this.menuKey = key;
      if (key === 'wait') { this.apply({ t: 'wait', uid: u.uid }); return; }
      if (key === 'retreat') { this.apply({ t: 'retreat', uid: u.uid }); return; }
      if (key === 'skills') { this.openSkills(u); return; }
      this.setTargets(this.sim.strikeable(u.uid).map(t => H.key(t.q, t.r)), u, null);
    },
    // the skills the unit can use now, each with its reach
    openSkills(u) {
      const items = this.sim.usableSkills(u.uid).map(id => {
        const sk = H.get('skill', id);
        return { label: sk.name, sub: sk.area.indexOf('self') === 0 ? 'self' : 'range ' + sk.range[0] + '-' + sk.range[1], id };
      });
      this.skillList = new H.List(items, { x: 12, y: 86, w: 150, title: 'Skills', maxRows: 7 });
      this.skillList.onPick = (i, it) => this.setTargets(this.sim.skillCandidates(u.uid, it.id), u, it.id);
      this.skillList.onCancel = () => { this.mode = 'menu'; };
      this.mode = 'skills';
    },
    // the keys a command may be aimed at: each foe in reach for an attack, or the cells a skill can touch
    setTargets(keys, u, skillId) {
      this.cands = keys; this.targetSkill = skillId;
      this.targets.set(keys.map(k => {
        const p = H.parseKey(k), t = this.sim.unitAt(p.q, p.r);
        const sub = t && t.side !== u.side ? (() => { const f = this.sim.forecast(u, t); return f.hit + '% -' + f.dmg; })() : '';
        return { label: t ? t.name : 'Here', sub, key: k };
      }), 0);
      this.cand = 0; this.mode = 'target';
    },
    confirmTarget(key) {
      const u = this.cur();
      if (!u) return;
      if (this.targetSkill) this.apply({ t: 'skill', uid: u.uid, skill: this.targetSkill, key });
      else { const p = H.parseKey(key), t = this.sim.unitAt(p.q, p.r); if (t) this.apply({ t: 'attack', uid: u.uid, target: t.uid }); }
      this.mode = 'menu'; this.reach = new Map(); this.targetSkill = null;
    },
    unitKeyUnder(k) { const p = H.parseKey(k), t = this.sim.unitAt(p.q, p.r); return t ? t.uid : null; },
    // the player's bell: every unit of theirs waits out the rest of it
    endPlayerBell() {
      let guard = 0;
      while (!this.sim.s.over && this.cur() && this.local(this.cur()) && guard++ < 40) this.apply({ t: 'wait', uid: this.cur().uid });
    },
    // a battle the player gives up to the planner: it plays out at once
    delegate() {
      H.autoplayBattle(this.sim, 5000);
      this.doneCalled = true;
      if (this.o.onDone) this.o.onDone(this.sim, { won: this.sim.s.winner === this.playerSide, playerSide: this.playerSide });
    },

    update(dt) {
      const game = this.game, I = game.input, b = this.board, sim = this.sim;
      if (this.phase === 'ask') { b.update(dt); this.ask.update(game); return; }
      b.update(dt);
      if (sim.s.over) { this.finish(); return; }
      // the tutorial's tips, one a bell at the start
      if (sim.s.tutorial && sim.s.bell !== this.tipBell) {
        this.tipBell = sim.s.bell;
        const tips = { 1: 'Tip: choose a unit, then a hex it can reach, to move it there.', 2: 'Tip: a foe beside your unit can be struck from where it stands.', 3: 'Tip: Skills lists what your unit can do now; its reach shows as you aim.', 4: 'Tip: a knight on the Keep wins the battle for the attacker.' };
        if (tips[sim.s.bell]) this.log.push(tips[sim.s.bell]);
      }
      // the tension layer of the battle music comes in from bell nine
      if (!this.tension && sim.s.bell >= 9) { this.tension = true; game.audio.layer('tension', .8, 1); }
      if (b.busy > 0 || b.queue.length || b.walk) return;
      const u = this.cur();
      if (!u) return;
      if (!this.local(u)) {
        if (!this.remoteTurn(u, dt)) return;
        this.aiWait -= dt;
        if (this.aiWait > 0) return;
        const cmd = H.aiBattle.next(sim);
        if (cmd) this.apply(cmd);
        this.aiWait = .2;
        return;
      }
      if (this.unitId !== u.uid) {
        if (this.humanSides.length > 1 && this.lastHumanSide !== null && this.lastHumanSide !== u.side) this.board.say('Player ' + (this.humanSides.indexOf(u.side) + 1) + ' to move', 1.2, '#ffe9a8');
        this.lastHumanSide = u.side;
        this.unitId = u.uid; this.mode = 'move';
        this.reach = sim.reach(u.uid);
        this.cursor = { q: u.q, r: u.r };
        this.buildMenu();
        if (!this.reach.size) this.mode = 'menu';
      }
      if (I.pressed('endTurn')) { this.endPlayerBell(); return; }
      if (I.pressed('info')) this.showInfo = !this.showInfo;
      this.hover();
      if (this.mode === 'menu') { this.menu.update(game); return; }
      if (this.mode === 'skills') { this.skillList.update(game); return; }
      if (this.mode === 'target') {
        this.targets.update(game);
        this.cursorToTarget();
        return;
      }
      this.steer(dt, u);
    },
    // the pointer over a hex moves the cursor onto it
    hover() {
      const w = this.game.mouseGround && this.game.mouseGround();
      if (!w) return;
      const h = H.hexAtWorld(w[0], w[1], H.HEX), k = H.key(h.q, h.r);
      if (!this.sim.tile(k)) return;
      if (!this.lastHex || this.lastHex.q !== h.q || this.lastHex.r !== h.r) {
        this.lastHex = h;
        if (this.mode === 'move') this.setCursor(h);
        if (this.mode === 'target') { const i = this.cands.indexOf(H.key(h.q, h.r)); if (i >= 0) { this.cand = i; this.targets.i = i; } }
      }
    },
    // the stick or the arrows move the cursor one hex; A or Enter picks the cell under it
    steer(dt, u) {
      const game = this.game, I = game.input, v = I.move();
      const len = Math.hypot(v[0], v[1]);
      this.stick -= dt;
      if (len > .5 && this.stick <= 0) {
        const d = H.DIRS[H.dirFromVector(v[0], v[1])];
        this.setCursor({ q: this.cursor.q + d[0], r: this.cursor.r + d[1] });
        this.stick = .17;
      } else if (len <= .5) this.stick = 0;
      const clicked = I.clicked && I.clicked();
      if (I.pressed('confirm') || clicked) {
        const occupant = this.sim.unitAt(this.cursor.q, this.cursor.r), key = H.key(this.cursor.q, this.cursor.r);
        if (occupant && occupant.uid === u.uid) { this.mode = 'menu'; this.reach = new Map(); }
        else if (!occupant && this.reach.has(key)) {
          this.apply({ t: 'move', uid: u.uid, to: key });
          this.mode = 'menu'; this.reach = new Map();
        } else H.sfx(game, 'cancel');
        if (this.mode === 'menu') { this.buildMenu(); H.sfx(game, 'confirm'); }
      }
      if (I.pressed('cancel')) { this.backToMove(); }
    },
    setCursor(c) {
      if (!this.sim.tile(H.key(c.q, c.r))) return;
      if (this.cursor.q !== c.q || this.cursor.r !== c.r) H.sfx(this.game, 'cursor');
      this.cursor = { q: c.q, r: c.r };
    },
    cursorToTarget() {
      const k = this.cands.length ? this.cands[this.targets.i] : null;
      if (k) this.cursor = H.parseKey(k);
    },
    finish() {
      if (this.doneCalled || this.board.queue.length || this.board.busy > 0) return;
      if (!this.resultShown) {
        this.resultShown = true;
        this.resultWon = this.sim.s.winner === this.playerSide;
        this.game.audio.music(H.SONGS[this.resultWon ? 'victory' : 'defeat']);
        return;
      }
      if (this.game.input.pressed('confirm') || this.game.input.clicked()) {
        this.doneCalled = true;
        if (this.o.onDone) this.o.onDone(this.sim, { won: this.resultWon, playerSide: this.playerSide });
      }
    },

    // ---- drawing ----
    draw(r) {
      const sim = this.sim, b = this.board, game = this.game;
      r.sky(['#1a2a14', '#2e4a22']);
      const reach = this.phase === 'play' && this.mode === 'move' ? this.reach : new Map();
      const strike = new Map();
      if (this.mode === 'target') for (const k of this.cands) strike.set(k, 1);
      const cursor = this.phase === 'play' ? this.cursor : null;
      const focus = this.mode === 'target' && this.cands.length ? [this.unitKeyUnder(this.cands[this.targets.i])].filter(Boolean) : this.unitId ? [this.unitId] : [];
      b.draw(r, { reach, strike, cursor, focus });
      if (this.phase === 'ask') {
        r.overlay(g => E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#000000', '#000000'], alpha: .35 }));
        this.ask.draw(r);
        return;
      }
      this.drawHud(r);
      if (this.phase === 'play' && this.mode === 'menu' && this.cur() && this.local(this.cur())) this.menu.draw(r);
      if (this.phase === 'play' && this.mode === 'target') this.targets.draw(r);
      if (this.phase === 'play' && this.mode === 'skills' && this.skillList) this.skillList.draw(r);
      if (sim.s.over && this.resultShown) this.drawResult(r);
      void game;
    },
    drawHud(r) {
      const sim = this.sim, game = this.game;
      const focusU = this.mode === 'target' && this.cands.length ? this.sim.byId(this.unitKeyUnder(this.cands[this.targets.i])) || this.cur() : this.unitUnderCursor() || this.cur();
      const mine = sim.alive(this.playerSide).length, foe = sim.alive(1 - this.playerSide).length;
      r.overlay(g => {
        E.ui.box(g, 0, 0, r.W, 14, { bg: ['#14101e', '#0a0812'], alpha: .85 });
        E.font.text(g, 'BELL ' + sim.s.bell + '/' + sim.s.bellLimit, 6, 3, '#ffe9a8', { shadow: '#000' });
        E.font.text(g, H.get('season', sim.s.season).name, r.W / 2, 3, '#e8e0ff', { align: 'center', shadow: '#000' });
        E.font.text(g, 'YOU ' + mine + '   FOE ' + foe, r.W - 6, 3, '#e8e0ff', { align: 'right', shadow: '#000' });
      });
      if (focusU) this.drawCard(r, focusU);
      // the log, bottom right, newest last
      const rows = [];
      for (const line of this.log) for (const t of E.font.wrap(line, 150)) rows.push(t);
      const shown = rows.slice(-5), x = r.W - 158, y0 = r.H - 14 - shown.length * 9;
      r.overlay(g => {
        E.ui.box(g, x - 4, y0 - 4, 158, shown.length * 9 + 8, { bg: ['#14101e', '#0a0812'], alpha: .85 });
        shown.forEach((t, i) => E.font.text(g, t, x, y0 + i * 9, i === shown.length - 1 ? '#fff4c8' : '#cfc6ec', { shadow: '#000' }));
      });
      const verbs = this.mode === 'move' ? 'Move here' : this.mode === 'target' ? 'Strike' : 'Choose';
      H.promptRow(r, game, [['confirm', verbs], ['cancel', 'Back'], ['endTurn', 'End turn'], ['info', 'Details']], 6, r.H - 12);
    },
    unitUnderCursor() {
      const k = H.key(this.cursor.q, this.cursor.r);
      return this.sim.s.units.find(x => !x.dead && H.key(x.q, x.r) === k) || null;
    },
    drawCard(r, u) {
      const t = this.sim.tile(H.key(u.q, u.r)) || { name: '', def: 0 };
      const skills = (u.skills || []).map(id => H.get('skill', id).name);
      const x = 6, y = r.H - 100;
      const cls = u.knight ? H.get('class', H.get('knight', u.ref).cls).name : 'Monster';
      r.overlay(g => E.ui.box(g, x - 4, y - 4, 150, 84, { bg: ['#14101e', '#0a0812'], alpha: .9, border: '#8a7ab0' }));
      H.bar(r, x, y + 26, 128, u.hp / u.maxHp, u.hp > u.maxHp / 2 ? '#7ad06a' : '#e8b050', 'HP ' + u.hp + '/' + u.maxHp);
      r.overlay(g => {
        E.font.text(g, u.name, x, y, u.side === this.playerSide ? '#fff4c8' : '#ffb0a0', { shadow: '#000' });
        E.font.text(g, cls + ' • ' + H.get('element', u.element).name, x, y + 10, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, 'ATK ' + u.atk + '   DEF ' + u.def, x, y + 40, '#f0ecff', { shadow: '#000' });
        E.font.text(g, 'MOV ' + u.mov + '   RNG ' + u.rng + '   SIZE ' + u.size, x, y + 50, '#f0ecff', { shadow: '#000' });
        E.font.text(g, 'Ground: ' + t.name + (t.def ? ' (+' + t.def + ')' : ''), x, y + 60, '#bfe8a0', { shadow: '#000' });
        if (skills.length) E.font.text(g, skills.slice(0, 2).join(', '), x, y + 70, '#ffe9a8', { shadow: '#000' });
      });
    },
    drawResult(r) {
      const won = this.resultWon, reason = this.sim.s.reason;
      r.overlay(g => {
        E.ui.box(g, r.W / 2 - 110, r.H / 2 - 42, 220, 84, { bg: ['#1c1830', '#0e0b18'], border: '#8a7ab0' });
        E.font.title(g, won ? 'VICTORY' : 'DEFEAT', r.W / 2, r.H / 2 - 32, { scale: 2, colors: won ? ['#fff6c8', '#8af08a'] : ['#ffd0c0', '#e87060'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, REASON[reason] || 'The field is clear', r.W / 2, r.H / 2 + 2, '#f0ecff', { align: 'center', shadow: '#000' });
      });
      H.promptRow(r, this.game, [['confirm', 'Continue']], r.W / 2 - 24, r.H / 2 + 20);
    }
  };
})();
