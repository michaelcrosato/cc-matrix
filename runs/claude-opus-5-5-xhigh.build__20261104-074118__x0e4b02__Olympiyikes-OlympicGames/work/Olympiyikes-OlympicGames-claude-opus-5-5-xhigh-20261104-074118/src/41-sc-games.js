// The Games: the flow (O.flow, the state machine over the scenes) and its scenes: setup, nation select (players drop
// in), the opening ceremony, day cards and story beats, the event card, results, initials, the medal ceremony, the
// medal table, torches and the continue, the closing ceremony with the ending, and the credits.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art;

// ---------------------------------------------------------------------------------------------------------------
// story beats (by day index: before the day card / after the medal table)
// ---------------------------------------------------------------------------------------------------------------
const BEATS = {
  maxWelcome: { title: 'IN THE CALL ROOM', lines: [['max', 'LANE FOUR? CUTE. I\'M IN LANE FIVE. LANE FIVE IS WHERE LEGENDS WARM UP.'], ['vera', 'MAX OVERDRIVE, EVERYONE. HE BROUGHT HIS OWN MIRROR.'], ['max', 'TWO MIRRORS. ONE FOR EACH SIDE OF GREATNESS.']] },
  mascot: { title: 'MASCOT INCIDENT', cut: 'mascot', lines: [['chip', 'THE MASCOT IS ON THE SKI JUMP! WHY IS THE MASCOT ON THE SKI JUMP?!'], ['yikesy', 'YIIIIKES!'], ['chip', 'THE MASCOT HAS... THE MASCOT HAS SET A PERSONAL BEST!'], ['vera', 'AND A PERSONAL WORST. SIMULTANEOUSLY.']] },
  curlchat: { title: 'CURLING CHAT', lines: [['MTP', 'BACK HOME WE CURL TO SETTLE ARGUMENTS. MOSTLY ABOUT CURLING.'], ['chip', 'AND WHO WINS?'], ['MTP', 'THE BROOM.']] },
  halftime: { title: 'HALFTIME REPORT', table: true, lines: [['chip', 'WE\'RE HALFWAY THROUGH THE GAMES, FOLKS! WHAT A FORTNIGHT!'], ['yikesy', 'BLUB BLUB!'], ['vera', 'YIKESY HAS JUST BEEN RESCUED FROM THE POOL FILTER. HE IS FINE. HE IS DAMP.'], ['max', '{halftime}']] },
  coco: { title: 'COCO\'S MOMENT', lines: [['BON', 'GRANDPA, THAT ONE WAS FOR YOU.'], ['vera', '...GIVE ME A SECOND, CHIP.'], ['chip', 'TAKE ALL THE TIME YOU NEED, VERA.']] },
  sled: { title: 'SLED SCANDAL', lines: [['vera', 'TURBONIA\'S SLED HAS A SPOILER. AND A CUP HOLDER.'], ['max', 'IT\'S CALLED AERODYNAMIC HOSPITALITY.'], ['chip', 'THE JUDGES HAVE ALLOWED IT. THEY WERE OFFERED A DRINK.']] },
  final: { title: 'THE FINAL', tease: true, lines: [['chip', 'IT ALL COMES DOWN TO THIS. THE ICE HOCKEY FINAL!'], ['max', 'TWO NATIONS. ONE PUCK. ZERO CHANCE. FOR YOU.'], ['vera', 'I\'VE SEEN BIGGER UPSETS. NOT MANY.']] },
  sportsmanship: { title: 'AFTER THE FINAL', lines: [['max', '{sport}'], ['vera', 'AND THAT, CHIP, IS WHY WE WATCH.']] }
};
const BEFORE = { 0: 'maxWelcome', 11: 'final' }, AFTER = { 1: 'mascot', 3: 'curlchat', 5: 'halftime', 7: 'coco', 9: 'sled', 11: 'sportsmanship' };
O.BEATS = BEATS;
const PLAYLISTS = { 'TRACK & POOL': ['sprint', 'javelin', 'swim', 'diving'], 'SNOW & ICE': ['skijump', 'downhill', 'bobsled', 'curling'], 'GREATEST HITS': ['sprint', 'skijump', 'diving', 'hockey'], 'RANDOM 4': null };

// ---------------------------------------------------------------------------------------------------------------
// the flow
// ---------------------------------------------------------------------------------------------------------------
const flow = O.flow = {
  newMeet(o) {
    const players = (o.players || []).map((p, i) => ({ input: p.input || game.players[i] || game.input, nation: p.nation, color: p.color || E.PLAYER_COLORS[i] }));
    return { mode: o.mode, seed: o.seed !== undefined ? o.seed : (Date.now() % 1e9), events: o.events, day: 0, players, difficulty: o.difficulty || game.settings.difficulty,
      qualifying: o.qualifying !== undefined ? o.qualifying : players.length === 1, torches: 3, medals: {}, party: {}, results: {}, yikes: {}, laurels: [], seen: {},
      rival: O.rivalFor(players.map(p => p.nation)), playlist: o.playlist || null, hypeBonus: 0 };
  },
  quickMeet(id) { return flow.newMeet({ mode: 'single', events: [id], players: [{ nation: 'SUN' }] }); },
  ev() { const m = O.meet; return m && O.EVENTS[m.events[m.day]]; },
  // setup -> nations -> (opening | first day)
  setup: null,
  startGames(o) { flow.setup = Object.assign({ mode: 'games' }, o); O.go('nations', { next: 'games' }); },
  startSingle(id) { flow.setup = { mode: 'single', events: [id] }; O.go('nations', { next: 'single' }); },
  nationsDone(players) {
    const S = flow.setup || { mode: 'single', events: ['sprint'] };
    if (S.mode === 'games') {
      let events = O.EVENT_ORDER.slice(), mode = 'games';
      if (S.length === 'QUICK 4') { mode = 'quick'; events = PLAYLISTS[S.playlist] || null; if (!events) { const rnd = E.rng(O.hash('random4:' + Date.now())); events = O.shuffle(O.SUMMER, rnd).slice(0, 2).concat(O.shuffle(O.WINTER, rnd).slice(0, 2)); events = [events[0], events[2], events[1], events[3]]; } }
      O.meet = flow.newMeet({ mode, events, players, difficulty: S.difficulty, qualifying: S.qualifying, playlist: S.playlist });
      O.go('opening', { quick: mode === 'quick' }, { fade: 'white', seconds: .4 });
    } else {
      O.meet = flow.newMeet({ mode: S.practice ? 'practice' : 'single', events: S.events, players });
      O.go('eventCard', {});
    }
  },
  // the days
  openingDone() { const m = O.meet; m.day = 0; flow.dayStart(); },
  dayStart() {
    const m = O.meet; if (m.mode === 'games' && BEFORE[m.day] && !m.seen['b' + m.day]) { m.seen['b' + m.day] = 1; O.go('beat', { id: BEFORE[m.day], then: 'day' }); return; }
    O.go('dayCard', {});
  },
  dayCardDone() { O.go('eventCard', {}); },
  eventCardDone(o = {}) {
    const m = O.meet, ev = flow.ev(); if (!ev) return O.go('menu');
    if (o.practice) { m.mode = 'practice'; }
    game.go('ev:' + ev.id, o.retry ? { retry: true, athletes: o.athletes } : {}, { fade: 'iris', seconds: .35 });
  },
  practiceDone(id) { O.meet.mode = 'single'; O.go('singleMenu', { id }); },
  // after an event
  eventDone(res) {
    const m = O.meet, ev = O.EVENTS[res.event]; flow.lastCtx = O.Run.ctx;
    m.results[res.event] = res;
    // qualifying: The Games, one player, qualifying on, not a match
    const h = res.rows.find(r => r.human);
    res.failed = false;
    if (m.mode === 'games' && m.qualifying && m.players.length === 1 && ev.format.type !== 'match' && ev.measure.qualify) {
      const q = ev.measure.qualify[m.difficulty] * (ev.measure.better === 'lower' ? 1 / O.G.qualifyScale : O.G.qualifyScale);
      res.qualify = q; res.qualified = !!h && h.perf != null && (ev.measure.better === 'lower' ? h.perf <= q : h.perf >= q);
      if (h) h.notes.push(res.qualified ? 'Q' : 'NQ');
      res.failed = !res.qualified;
    }
    // records: a WR by a CPU goes straight in; a human's top-5 mark asks for initials
    res.initials = [];
    if (m.mode !== 'attract' && m.mode !== 'practice' && m.mode !== 'hub' && ev.format.type !== 'match') {
      for (const r of res.rows) {
        if (r.perf == null || !O.Records.qualifies(ev.id, r.perf)) continue;
        if (r.human && !res.failed) res.initials.push(r);
        else if (!r.human && r.notes.includes('WR')) O.Records.insert(ev.id, { name: r.name, init: r.name.split(' ').map(w => w[0]).join('').slice(0, 3), nat: r.nation, perf: r.perf });
      }
    }
    if (!res.failed) flow.award(res);
    O.go('results', {}, { fade: 'wipe', seconds: .3 });
  },
  award(res) {
    const m = O.meet;
    for (const r of res.rows) {
      if (r.medal) { const t = m.medals[r.nation] || (m.medals[r.nation] = { g: 0, s: 0, b: 0 }); t[r.medal]++; if (r.human) O.Records.addMedal(r.nation, res.event, r.medal); }
      if (r.human) { const k = 'P' + (r.player + 1); m.party[k] = (m.party[k] || 0) + (O.PARTY[r.rank - 1] || 0); m.points = (m.points || 0) + r.points; }
    }
    res.awarded = true;
  },
  resultsDone() { const res = flow.res(); if (res.initials && res.initials.length) return O.go('initials', {}); flow.afterInitials(); },
  res() { const m = O.meet; return m.results[flow.ev().id]; },
  afterInitials() { const res = flow.res(); if (res.failed) return O.go('torch', {}); O.go('podium', {}, { fade: 'white', seconds: .3 }); },
  torchRetry() { const res = flow.res(); delete O.meet.results[res.event]; const keep = flow.lastCtx ? flow.lastCtx.athletes : null; flow.eventCardDone({ retry: true, athletes: keep }); },
  podiumDone() { const m = O.meet; if (m.mode === 'single') return O.go('singleMenu', { id: flow.ev().id }); O.go('medals', {}); },
  medalsDone() {
    const m = O.meet;
    if (m.mode === 'games') { flow.autosave(); if (AFTER[m.day] && !m.seen['a' + m.day]) { m.seen['a' + m.day] = 1; return O.go('beat', { id: AFTER[m.day], then: 'next' }); } }
    flow.nextDay();
  },
  beatDone(then) { if (then === 'day') return O.go('dayCard', {}); flow.nextDay(); },
  nextDay() {
    const m = O.meet; m.day++;
    if (m.day >= m.events.length) { if (m.mode === 'games') O.store.del('games'); return O.go('closing', {}, { fade: 'white', seconds: .5 }); }
    flow.dayStart();
  },
  autosave() {
    const m = O.meet; if (m.mode !== 'games') return;
    const save = { v: 1, seed: m.seed, events: m.events, day: m.day + 1, players: m.players.map(p => ({ nation: p.nation, color: p.color })), difficulty: m.difficulty, qualifying: m.qualifying, torches: m.torches, medals: m.medals, party: m.party, yikes: m.yikes, seen: m.seen, rival: m.rival, laurels: m.laurels, points: m.points || 0 };
    O.store.set('games', save);
  },
  continueGames() {
    const s = O.store.get('games', null); if (!s) return;
    const players = s.players.filter((p, i) => i === 0 || game.players[i]).map((p, i) => ({ nation: p.nation, color: p.color, input: game.players[i] || game.input }));
    O.meet = flow.newMeet({ mode: 'games', events: s.events, players, difficulty: s.difficulty, qualifying: s.qualifying, seed: s.seed });
    Object.assign(O.meet, { day: s.day, torches: s.torches, medals: s.medals || {}, party: s.party || {}, yikes: s.yikes || {}, seen: s.seen || {}, rival: s.rival, laurels: s.laurels || [], points: s.points || 0 });
    if (O.meet.day >= O.meet.events.length) return O.go('closing', {});
    flow.dayStart();
  },
  rankOf(nid) { return O.medalTable(O.meet.medals).findIndex(r => r.id === nid) + 1; },
  quit() { O.meet = null; O.go('title'); }
};

// ---------------------------------------------------------------------------------------------------------------
// shared painters: a record table, a medal table, the results table
// ---------------------------------------------------------------------------------------------------------------
O.drawRecordTable = (g, id, x, y, w) => {
  const ev = O.EVENTS[id], t = O.Records.table(id);
  UI.panel(g, x, y, w, 26 + t.length * 22, { title: ev.name + ' · TOP 5', alpha: .85 });
  O.Art.picto(g, id, x + w - 30, y + 4, 22);
  t.forEach((e, i) => { const yy = y + 22 + i * 22; UI.text(g, String(i + 1), x + 10, yy + 2, '#f2b632', { scale: 2 }); O.Art.flag(g, x + 30, yy + 2, 21, 14, e.nat); UI.text(g, e.init || '???', x + 58, yy + 2, '#ffffff', { scale: 2 }); UI.text(g, e.name || '', x + 100, yy + 6, '#aab0d0'); const d = ev.measure.fmt(e.perf); UI.text(g, d, x + w - 10 - UI.tw(d, 2), yy + 2, i === 0 ? '#ffe066' : '#ffffff', { scale: 2 }); if (i === 0) UI.text(g, 'WR', x + w - 24 - UI.tw(d, 2) - 10, yy + 6, '#ffe066'); });
};
O.drawMedalTable = (g, medals, x, y, w, hl) => {
  const rows = O.medalTable(medals); UI.panel(g, x, y, w, 20 + rows.length * 19, { alpha: .9 });
  UI.text(g, 'NATION', x + 50, y + 5, '#aab0d0'); ['g', 's', 'b'].forEach((m, k) => O.Art.medal(g, x + w - 98 + k * 26, y + 11, m, 9, { ribbon: false })); UI.text(g, 'TOT', x + w - 28, y + 5, '#aab0d0');
  rows.forEach((r, i) => { const yy = y + 19 + i * 19, me = hl && hl.includes(r.id); if (me) px.blend(g, .5, 'normal', () => px.rect(g, x + 2, yy - 2, w - 4, 18, '#3a3a10')); UI.text(g, String(i + 1), x + 8, yy + 2, '#f2b632', { scale: 1 }); O.Art.flag(g, x + 20, yy, 21, 14, r.id, 1); UI.text(g, r.name, x + 50, yy + 3, me ? '#ffe066' : '#ffffff'); [r.g, r.s, r.b].forEach((v, k) => UI.text(g, String(v), x + w - 101 + k * 26, yy + 2, '#ffffff', { scale: 1 })); UI.text(g, String(r.total), x + w - 24, yy + 2, '#f2b632'); });
};

// ---------------------------------------------------------------------------------------------------------------
// the Games setup
// ---------------------------------------------------------------------------------------------------------------
O.scene('gamesSetup', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .2,
  enter() {
    const dif = ['Easy', 'Normal', 'Hard'];
    this.items = [
      { label: 'LENGTH', options: ['FULL 12', 'QUICK 4'], value: 0 },
      { label: 'PLAYLIST', options: Object.keys(PLAYLISTS), value: 0 },
      { label: 'DIFFICULTY', options: dif.map(s => s.toUpperCase()), value: Math.max(0, dif.indexOf(game.settings.difficulty)) },
      { label: 'QUALIFYING', options: ['ON', 'OFF'], value: 0 },
      { label: 'START', onPick: () => { const it = this.items; O.flow.startGames({ length: it[0].options[it[0].value], playlist: it[1].options[it[1].value], difficulty: dif[it[2].value], qualifying: it[3].value === 0 }); } }
    ];
    this.list = new UI.List(this.items, { x: 24, y: 50, w: 300, row: 26, scale: 2, onCancel: () => O.go('menu') });
  },
  update() { this.items[1].disabled = this.items[0].value === 0; this.items[3].disabled = this.items[0].value === 1; this.list.update(); },
  draw(r) {
    const W = r.W, H = r.H; UI.backdrop(r.ctx, r.bw, r.bh, '#2a1650', '#07081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'THE GAMES', { right: 'SETUP' });
      this.list.draw(g);
      const full = this.items[0].value === 0, txt = full ? 'TWELVE DAYS. SUMMER AND WINTER, TURN AND TURN ABOUT. OPENING AND CLOSING CEREMONIES, A RIVAL, AND THREE TORCHES: MISS A QUALIFYING MARK AND YOU LOSE ONE.' : 'FOUR EVENTS FROM A PLAYLIST, A MINI CEREMONY AND PARTY POINTS. PERFECT WITH FRIENDS.';
      UI.wrap(txt, W - 60, 1).forEach((l, i) => UI.text(g, l, 24, 196 + i * 11, '#c8ccec'));
      const evs = full ? O.EVENT_ORDER : (PLAYLISTS[this.items[1].options[this.items[1].value]] || ['sprint', 'skijump', 'javelin', 'curling']);
      evs.forEach((e, i) => Art.picto(g, e, 340 + (i % 4) * 22, 54 + Math.floor(i / 4) * 22, 18, { dim: !full && !PLAYLISTS[this.items[1].options[this.items[1].value]] }));
      O.Prompt.strip(g, [['confirm', 'SELECT'], ['moveH', 'CHANGE'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// nation select: a 4 x 2 grid of flags; each player's cursor in its colour; P2-P4 drop in
// ---------------------------------------------------------------------------------------------------------------
O.scene('nations', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .3,
  enter(d) {
    this.next = d.next || 'single'; this.cur = game.players.map((p, i) => ({ i: [0, 2, 4, 6][i] || 0, locked: false }));
    this.rigs = {}; this.t = 0; this.joinT = 0;
    game.allowJoin({ max: 4, onJoin: (inp, n) => { inp.glyphs = game.input.glyphs; this.cur[n - 1] = { i: this.freeIndex([0, 2, 4, 6][n - 1] || 0), locked: false }; } });
    if (O.Music.current !== 'menu') O.Music.play('menu');
  },
  exit() { game.allowJoin(false); },
  freeIndex(i) { for (let k = 0; k < 8; k++) { const j = (i + k) % 8; if (!this.cur.some(c => c && c.locked && c.i === j)) return j; } return i; },
  rig(id) { return this.rigs[id] || (this.rigs[id] = O.makeRig(id, 'ceremony')); },
  rect(i, W) { const cols = 4, w = 52, h = 40, gap = 8, x0 = 18, y0 = 44; return [x0 + (i % cols) * (w + gap), y0 + Math.floor(i / cols) * (h + 22), w, h]; },
  update(dt, rdt) {
    this.t += rdt;
    const P = game.players;
    P.forEach((inp, n) => {
      const c = this.cur[n] || (this.cur[n] = { i: this.freeIndex(n * 2), locked: false });
      if (!c.locked) {
        let i = c.i;
        if (inp.repeat('left', .3, .1)) i = (i % 4 === 0) ? i + 3 : i - 1; else if (inp.repeat('right', .3, .1)) i = (i % 4 === 3) ? i - 3 : i + 1; else if (inp.repeat('up', .3, .1) || inp.repeat('down', .3, .1)) i = (i + 4) % 8;
        if (i !== c.i) { c.i = i; UI.sfx('select'); }
        if (n === 0) { const p = UI.pointer(); if (p) for (let k = 0; k < 8; k++) if (UI.hit(p, ...this.rect(k))) c.i = k; const cl = UI.clicked(); if (cl) for (let k = 0; k < 8; k++) if (UI.hit(cl, ...this.rect(k))) { c.i = k; this.lock(n); } }
        if (inp.pressed('confirm')) this.lock(n);
        if (inp.pressed('cancel')) { if (n === 0) { UI.sfx('cancel'); return O.go(this.next === 'games' ? 'gamesSetup' : 'single'); } UI.sfx('cancel'); game.removePlayer(inp); this.cur.splice(n, 1); }
      } else if (inp.pressed('cancel')) { c.locked = false; UI.sfx('cancel'); }
    });
    const all = P.length && P.every((p, n) => this.cur[n] && this.cur[n].locked);
    if (all) { this.joinT += rdt; if (this.joinT > .6 || P[0].pressed('start')) { const players = P.map((inp, n) => ({ input: inp, nation: O.NATION_IDS[this.cur[n].i], color: inp.color || E.PLAYER_COLORS[n] })); O.flow.nationsDone(players); } }
    else this.joinT = 0;
  },
  lock(n) { const c = this.cur[n]; if (this.cur.some((o, k) => k !== n && o && o.locked && o.i === c.i)) { UI.sfx('cancel'); game.note('TAKEN BY ANOTHER PLAYER'); return; } c.locked = true; UI.sfx('confirm'); const nat = O.nation(O.NATION_IDS[c.i]); O.Voice.speak(nat.name + '!', O.voiceOf(nat)); },
  draw(r) {
    const W = r.W, H = r.H, t = game.real;
    UI.backdrop(r.ctx, r.bw, r.bh, '#16204a', '#06081a');
    const focus = O.nation(O.NATION_IDS[(this.cur[0] || { i: 0 }).i]);
    // the focused athlete, cheering on the right
    const rig = this.rig(focus.id); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: (this.cur[0] || {}).locked ? 'cheer' : 'wave' });
    r.overlay(g => {
      UI.screenTitle(g, W, 'CHOOSE YOUR NATION', { right: game.players.length + ' PLAYER' + (game.players.length > 1 ? 'S' : '') });
      for (let i = 0; i < 8; i++) {
        const [x, y, w, h] = this.rect(i), n = O.NATIONS[i], here = this.cur.map((c, k) => c && c.i === i ? k : -1).filter(k => k >= 0);
        px.rect(g, x - 2, y - 2, w + 4, h + 4, '#05060e');
        Art.flag(g, x, y, w, h - 8, n.id, here.length ? 2 : 0, t + i);
        UI.text(g, n.id, x + w / 2 - UI.tw(n.id, 1) / 2, y + h - 6, here.length ? '#ffffff' : '#aab0d0');
        here.forEach((k, j) => { const c = game.players[k] ? game.players[k].color : '#ffffff', lk = this.cur[k].locked, pulse = lk ? 0 : Math.round(UI.pulse(3)); px.rect(g, x - 3 - pulse, y - 3 - pulse, w + 6 + pulse * 2, 2, c); px.rect(g, x - 3 - pulse, y + h + 1 + pulse, w + 6 + pulse * 2, 2, c); px.rect(g, x - 3 - pulse, y - 3 - pulse, 2, h + 6 + pulse * 2, c); px.rect(g, x + w + 1 + pulse, y - 3 - pulse, 2, h + 6 + pulse * 2, c); px.rect(g, x + j * 16, y - 12, 15, 9, c); UI.text(g, 'P' + (k + 1), x + j * 16 + 2, y - 11, '#000000', { shadow: false }); if (lk) UI.text(g, 'READY', x + w / 2 - UI.tw('READY', 1) / 2, y + h / 2 - 8, c); });
      }
      // the right panel: the focused nation's star
      const px0 = 268, pw = W - px0 - 12; UI.panel(g, px0, 40, pw, 150, { alpha: .8, trim: focus.colors.a === '#f4f8ff' ? '#2fa8d8' : focus.colors.a });
      rig.drawPortrait(g, px0 + 8, 50, 52, { bg: '#1a2050', zoom: 2.4 });
      UI.text(g, focus.name, px0 + 68, 50, '#f2b632', { scale: 1 }); UI.text(g, focus.athlete.name, px0 + 68, 62, '#ffffff', { scale: 1 });
      const best = Object.entries(focus.skills).sort((a, b) => b[1] - a[1]).slice(0, 3);
      best.forEach(([e], k) => Art.picto(g, e, px0 + 68 + k * 22, 76, 18));
      UI.wrap(focus.athlete.bio.toUpperCase(), pw - 16, 1).slice(0, 6).forEach((l, i) => UI.text(g, l, px0 + 8, 108 + i * 11, '#d6dbf5'));
      const jl = game.players.length < 4 ? 'P2–P4: PRESS START ON ANOTHER CONTROLLER, OR 2 ON THE KEYBOARD' : 'FOUR PLAYERS!';
      UI.text(g, jl, W / 2 - UI.tw(jl, 1) / 2, H - 46, '#ffe066');
      O.Prompt.strip(g, [['move', 'CHOOSE'], ['confirm', 'READY'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// a cinematic helper: a script of timed beats, hold ✕ (or Enter) 1 s to skip
// ---------------------------------------------------------------------------------------------------------------
const holdSkip = (st, rdt) => { const held = game.players.some(p => p.down('confirm') || p.down('start')); st.hold = held ? (st.hold || 0) + rdt : 0; return st.hold >= 1; };
const drawHold = (g, W, H, st) => { O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'HOLD TO SKIP', align: 'right' }); if (st.hold > 0) UI.bar(g, W - 110, H - 8, 96, 3, st.hold, '#f2b632'); };

// ---------------------------------------------------------------------------------------------------------------
// the opening ceremony (Glory Stadium at night): fireworks, welcome, parade of nations, the flame (playable), Max
// ---------------------------------------------------------------------------------------------------------------
const PARADE = { SUN: 'WHERE THE SUN NEVER SETS AND THE SUNSCREEN BUDGET IS CLASSIFIED.', FRM: 'THEIR FLAG BEARER IS CARRYING THE FLAG AND A SMALL SAUNA.', TRB: 'LED BY DEFENDING CHAMPION MAX OVERDRIVE, WHO HAS ASKED US TO CALL HIM \'THE DEFENDING CHAMPION\', EVEN WHILE HE SLEEPS.', BON: 'THEIR UNIFORMS ARE, LEGALLY, DESSERT.', VOL: 'PLEASE DON\'T STAND TOO CLOSE. THEY\'RE VERY WARM PEOPLE.', WAV: 'THEY ARRIVED BY BOAT. THEY PREFER IT.', MTP: 'THEY TRAIN AT ALTITUDE, WITH LESS OXYGEN AND MORE YODELING.', NEO: 'THEIR UNIFORMS COME WITH A FIRMWARE UPDATE.' };
O.scene('opening', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .3, pausable: true,
  enter(d) {
    this.quick = !!d.quick; this.st = { t: 0, hold: 0 }; this.stage = this.quick ? 'flame' : 'fireworks'; this.stageT = 0; this.lines = 0;
    const m = O.meet, mine = m.players.map(p => p.nation);
    this.order = O.NATION_IDS.filter(n => !mine.includes(n)).concat(mine);
    this.marchers = this.order.map((id, i) => ({ id, rig: O.makeRig(id, 'ceremony'), mate: O.makeRig(id, 'ceremony', { mate: 0 }), x: -120 - i * 70 }));
    this.bar = null; this.throw = null; this.cauldron = false; this.scoreboardFire = false; this.paradeI = -1;
    game.lights.enabled = true; game.lights.ambient = .45; O.Music.play('parade'); O.CrowdAudio.set(true); O.Crowd.set(.7);
    O.Comms.reset();
    if (!this.quick) O.Comms.say('pa', 'LADIES AND GENTLEMEN... WELCOME TO THE GAMES OF MOUNT GLORY AND SUNNY BAY!');
  },
  update(dt, rdt) {
    const st = this.st; st.t += rdt; this.stageT += rdt;
    if (this.stage !== 'flame' && holdSkip(st, rdt)) { this.stage = 'flame'; this.stageT = 0; O.Comms.reset(); }
    if (this.stage === 'fireworks') {
      if (Math.floor(this.stageT * 2) !== this.fw) { this.fw = Math.floor(this.stageT * 2); Art.firework(400 + (this.fw * 97) % 300, -30, 90 + (this.fw * 31) % 40, ['#ff6a1a', '#3fa8e8', '#f2b632', '#ff7fb8']); }
      if (this.stageT > 3.5 && !this.l2) { this.l2 = 1; O.Comms.say('chip', 'GOOD EVENING, EVERYBODY! FOR THE FIRST TIME IN HISTORY, THE SUMMER AND WINTER GAMES ARE HAPPENING AT THE SAME TIME, IN THE SAME PLACE!'); O.Comms.say('vera', 'SOME CALLED IT IMPOSSIBLE. OTHERS CALLED IT A SCHEDULING ERROR. TONIGHT WE CALL IT... OLYMPIYIKES!'); }
      if (this.stageT > 12) { this.stage = 'parade'; this.stageT = 0; }
    } else if (this.stage === 'parade') {
      const sp = 70; for (const m of this.marchers) m.x += sp * dt;
      const front = this.marchers.findIndex(m => m.x > 380 && m.x < 400 + sp * dt * 2);
      const i = this.marchers.findIndex(m => m.x >= 380 && m.x - sp * dt < 380);
      if (i >= 0 && i !== this.paradeI) { this.paradeI = i; const id = this.marchers[i].id, mine = O.meet.players.some(p => p.nation === id), n = O.nation(id); O.Comms.reset(); O.Comms.say('chip', mine ? 'AND FINALLY... THE NATION EVERYONE CAME TO SEE! ' + n.name + '!' : n.name + '! ' + PARADE[id]); O.Crowd.bump(.9); O.CrowdAudio.cheer(); }
      void front;
      if (this.marchers[this.marchers.length - 1].x > 760 || this.stageT > 40) { this.stage = 'flame'; this.stageT = 0; O.Comms.reset(); }
    } else if (this.stage === 'flame') {
      if (!this.bar) { this.bar = new O.Widgets.TimingBar({ hz: 1.1, zones: [{ from: .44, to: .56, name: 'BULLSEYE', q: 1, color: '#4fe0a8' }, { from: .3, to: .7, name: 'CLOSE', q: .5, color: '#f2b632' }] }); O.Comms.say('pa', 'THE FINAL TORCHBEARER IS... YOU!'); O.Music.play('title'); }
      if (!this.throw) {
        this.bar.update(rdt);
        const press = game.input.pressed('action') || game.input.pressed('confirm') || (O.autoAll && this.stageT > 1.2 && Math.abs(this.bar.v - .5) < .04) || (O.Attract.on && this.stageT > 2);
        if (press && this.stageT > .6) { const res = this.bar.press(); this.throw = { t: 0, hit: res.q >= 1 }; game.audio.sfx('whoosh'); }
      } else {
        this.throw.t += rdt;
        if (this.throw.t > 1.2 && !this.cauldron) {
          this.cauldron = true; Art.firework(560, -10, 110, ['#ff6a1a', '#ffd23a']); game.audio.sfx('fire'); O.CrowdAudio.cheer(); O.Crowd.startWave();
          if (this.throw.hit) { O.Comms.say('chip', 'BULLSEYE! THE CAULDRON IS LIT!'); O.meet.hypeBonus = .25; }
          else { this.scoreboardFire = true; O.Comms.say('chip', '...AND THE SCOREBOARD IS NOW THE CAULDRON. OLYMPIYIKES!'); }
          if (!this.quick) O.Comms.say('max', 'NICE THROW. ENJOY IT. IT\'S THE CLOSEST YOU\'LL GET TO GOLD.');
          O.Comms.say('vera', 'LET THE GAMES... BEGIN!');
        }
        if (this.cauldron && Math.floor(this.throw.t * 3) !== this.fw2) { this.fw2 = Math.floor(this.throw.t * 3); Art.firework(420 + (this.fw2 * 131) % 300, -30, 100 + (this.fw2 * 17) % 30, ['#ff6a1a', '#3fa8e8', '#f2b632', '#ffffff', '#ff7fb8']); }
        if (this.throw.t > (this.quick ? 5 : 9) || (this.throw.t > 2.5 && (game.input.pressed('confirm')))) O.flow.openingDone();
      }
    }
    game.focus(this.stage === 'flame' ? 520 : 470, 70, 34);
  },
  draw(r) {
    const t = game.real;
    O.Venue.stadium(r, { night: true, marks: false, jumbo: this.stage === 'parade' && this.paradeI >= 0 ? [O.nation(this.marchers[this.paradeI].id).name, 'WELCOME!'] : ['THE GAMES', 'OPENING'] });
    for (let k = 0; k < 4; k++) game.lights.add(380 + k * 90, 40, 80, 160, .8, { color: '#fff2c8' });
    // the cauldron tower
    const cx = 600, cy = 6;
    r.queue(cx, cy, 0, g => { const b = r.w(cx, cy, 0), top = r.w(cx, cy, 78); px.rect(g, b[0] - 5, top[1], 10, b[1] - top[1], '#5a4a3a'); px.poly(g, [[top[0] - 16, top[1] - 12], [top[0] + 16, top[1] - 12], [top[0] + 8, top[1]], [top[0] - 8, top[1]]], '#c8901a'); px.rect(g, top[0] - 18, top[1] - 14, 36, 3, '#f2c94c'); if (this.cauldron && !this.scoreboardFire || this.cauldron) { for (let i = 0; i < 7; i++) { const f = Math.sin(t * 9 + i) * 3; px.poly(g, [[top[0] - 14 + i * 4, top[1] - 13], [top[0] - 8 + i * 4, top[1] - 13], [top[0] - 11 + i * 4 + f, top[1] - 34 - (i % 3) * 6]], i % 2 ? '#ff7a1a' : '#ffd23a'); } } }, { emissive: true });
    if (this.cauldron) game.lights.add(cx, cy, 90, 200, 1, { color: '#ffb060' });
    if (this.scoreboardFire) game.particles.fire(705, -40, 110, 1, { size: 6 });
    // marchers
    if (this.stage === 'parade') for (const m of this.marchers) {
      if (m.x < 300 || m.x > 760) continue;
      const y = 90; m.rig.update(1 / 60, { x: m.x, y, z: 0, vx: 70, vy: 0, facing: 0 }); O.Pose.set(m.rig, 'flagCarry'); m.mate.update(1 / 60, { x: m.x - 18, y: y + 16, z: 0, vx: 70, vy: 0, facing: 0, pose: 'wave' });
      r.shadow(m.x, y, 6, .4); r.actor(m.x, y, 0, (g, ox, oy) => { m.rig.draw(g, ox, oy, r.view); O.Gear.flag(g, m.rig, r.view, ox, oy, m.id); });
      r.shadow(m.x - 18, y + 16, 6, .4); r.actor(m.x - 18, y + 16, 0, (g, ox, oy) => m.mate.draw(g, ox, oy, r.view));
    }
    // the torchbearer and the flaming javelin
    if (this.stage === 'flame') {
      const p = this.torchRig || (this.torchRig = O.makeRig(O.meet.players[0] ? O.meet.players[0].nation : 'SUN', 'track'));
      const thr = this.throw, u = thr ? Math.min(1, thr.t / 1.2) : 0;
      if (!thr) { O.Pose.set(p, 'javCarry'); } else O.Pose.set(p, 'javThrow', { u: Math.min(1, thr.t * 4) });
      p.update(1 / 60, { x: 470, y: 100, z: 0, facing: 0, vx: 0 }); r.shadow(470, 100, 6, .4);
      r.actor(470, 100, 0, (g, ox, oy) => { p.draw(g, ox, oy, r.view); if (!thr) O.Gear.javelin(g, p, r.view, ox, oy, { grip: '#ff7a1a' }); });
      if (thr && u < 1) { const tx = thr.hit ? 600 : 705, tz = thr.hit ? 92 : 112, ty = thr.hit ? 6 : -40, x = lerp(476, tx, u), y = lerp(100, ty, u), z = 34 + (tz - 34) * u + Math.sin(u * Math.PI) * 60; game.particles.fire(x, y, z, 2, { size: 4 }); r.queue(x, y, z, g => { const q = r.w(x, y, z); px.line(g, q[0] - 8, q[1] + 3, q[0] + 8, q[1] - 3, '#e8e0c8', 1); }); }
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.stage !== 'flame') drawHold(g, W, H, this.st);
      UI.text(g, 'OPENING CEREMONY', 12, 12, '#f2b632', { scale: 2 });
      if (this.stage === 'flame' && this.bar && !this.throw) { UI.text(g, 'THROW THE FLAME INTO THE CAULDRON!', W / 2 - UI.tw('THROW THE FLAME INTO THE CAULDRON!', 2) / 2, 40, '#ffffff', { scale: 2 }); this.bar.draw(g, W / 2 - 100, 66, 200, 12); O.Prompt.draw(g, W / 2, 86, 'action', { label: 'THROW', size: 2, align: 'center' }); }
      O.Comms.draw(g, W, H, { y: H - 2 });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the day card ("broadcast bumper"): DAY 3 · 50m FREESTYLE, venue, weather; UP CLOSE & PERSONAL
// ---------------------------------------------------------------------------------------------------------------
const WEATHER = { summer: ['SUNNY, 27°C', 'CLEAR SKIES, 25°C', 'WARM, LIGHT BREEZE'], winter: ['CRISP, -4°C', 'LIGHT SNOW, -6°C', 'FROSTY AND CLEAR, -9°C'] };
O.scene('dayCard', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .4, pausable: true,
  enter() {
    const m = O.meet, ev = O.flow.ev(); this.t = 0;
    const order = m.mode === 'games' ? O.NATION_IDS : O.NATION_IDS;
    const subject = m.day === 0 ? m.players[0].nation : order[(m.day + 3) % 8];
    this.subject = O.nation(subject); this.rig = O.makeRig(subject, ev.id);
    this.wx = WEATHER[ev.season][(m.day) % 3];
    O.Music.play('table'); O.Comms.reset();
    O.Comms.say('chip', 'DAY ' + (m.day + 1) + ' OF THE GAMES! TODAY: THE ' + ev.name + '.');
    if (m.rival && m.day > 0 && m.day % 3 === 0) O.Comms.say('max', ['STILL HERE? ADORABLE.', 'I WARMED UP BY WINNING A STARING CONTEST WITH THE SUN.', 'TODAY I WILL BE GRACIOUS IN VICTORY. AGAIN.'][m.day % 3]);
  },
  update(dt, rdt) { this.t += rdt; game.focus(0, 0, 0); if ((this.t > 1 && game.players.some(p => p.pressed('confirm'))) || this.t > 14 || (O.autoAll && this.t > 1.2)) { UI.sfx('confirm'); O.flow.dayCardDone(); } },
  draw(r) {
    const W = r.W, H = r.H, m = O.meet, ev = O.flow.ev(), t = game.real;
    UI.backdrop(r.ctx, r.bw, r.bh, ev.season === 'winter' ? '#14305a' : '#5a2a1a', '#07081a');
    this.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'wave', expr: 'smile' });
    r.overlay(g => {
      const k = Math.min(1, this.t / .3);
      px.rect(g, 0, 30, Math.round(W * k), 52, ev.season === 'winter' ? '#3fa8e8' : '#ff6b4a'); px.rect(g, 0, 82, Math.round(W * k), 2, '#ffffff');
      Art.picto(g, ev.id, 16, 36, 40, { plain: true });
      UI.text(g, 'DAY ' + (m.day + 1) + (m.mode === 'games' ? ' OF 12' : ' OF ' + m.events.length), 64, 38, '#ffffff', { scale: 1 });
      E.font.text(g, ev.name, 64, 50, '#ffffff', { scale: 3, shadow: '#000', outline: false });
      UI.text(g, (ev.venueName || '') + ' · ' + this.wx, 18, 92, '#e6e9ff', { scale: 1 });
      if (m.mode === 'games' && m.qualifying && m.players.length === 1) { let s = ''; for (let i = 0; i < 3; i++) s += i < m.torches ? '●' : '○'; UI.text(g, 'TORCHES', W - 110, 92, '#f2b632'); for (let i = 0; i < 3; i++) Art.torch(g, W - 50 + i * 12, 104, 8, i < m.torches); }
      // up close & personal
      const y = 118; UI.panel(g, 14, y, W - 28, 84, { title: 'UP CLOSE & PERSONAL', alpha: .85 });
      this.rig.drawPortrait(g, 22, y + 18, 56, { bg: '#1a2050', zoom: 2.6 });
      UI.text(g, this.subject.athlete.name + ' · ' + this.subject.name, 86, y + 18, '#f2b632');
      UI.wrap(this.subject.athlete.bio.toUpperCase(), W - 120, 1).slice(0, 5).forEach((l, i) => UI.text(g, l, 86, y + 32 + i * 10, '#ffffff'));
      O.Comms.draw(g, W, H, { y: H - 30 });
      O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'CONTINUE', align: 'right' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// story beats: a broadcast segment with portraits (and the mascot's ski jump)
// ---------------------------------------------------------------------------------------------------------------
O.scene('beat', {
  view: 'side', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .4, pausable: true,
  enter(d) {
    this.id = d.id; this.then = d.then; this.b = BEATS[d.id]; this.i = -1; this.t = 0; this.lt = 0; this.blob = Art.makeYikesy(9);
    const m = O.meet, mine = m.players[0] ? m.players[0].nation : 'SUN';
    const rank = O.flow.rankOf(mine), maxRank = O.flow.rankOf(m.rival || 'TRB');
    const hockey = m.results.hockey, won = hockey && hockey.rows[0] && hockey.rows[0].human;
    this.vars = { halftime: maxRank < rank ? 'HALFTIME MEANS NOTHING. OH WAIT, I\'M WINNING. CARRY ON.' : 'HALFTIME MEANS NOTHING. I\'M A SECOND-HALF ATHLETE.', sport: won ? '...GOOD GAME. NEXT GAMES I\'M BRINGING TWO HELMETS. ONE FOR MY EGO.' : 'GOOD GAME. YOU WERE ALMOST ME.' };
    O.Music.play(this.b.tease ? 'table' : 'menu'); if (this.b.tease) { O.Music.sting('tease'); }
    O.Comms.reset(); this.nextLine();
  },
  nextLine() { this.i++; this.lt = 0; const L = this.b.lines[this.i]; if (!L) return false; const text = L[1].replace(/\{(\w+)\}/g, (m, k) => this.vars[k] || m); O.Comms.reset(); O.Comms.say(L[0] === 'max' ? 'max' : L[0], text); return true; },
  update(dt, rdt) {
    this.t += rdt; this.lt += rdt; game.focus(120, 0, 60);
    const c = O.Comms.current, dur = c ? c.dur : 1;
    if ((this.lt > .5 && game.players.some(p => p.pressed('confirm'))) || this.lt > dur + .6 || (O.autoAll && this.lt > 1)) { if (!this.nextLine()) O.flow.beatDone(this.then); }
    if (this.b.cut === 'mascot') { const u = clamp(this.t / 6, 0, 1); this.mx = lerp(-40, 320, u); this.mz = u < .4 ? lerp(120, 70, u / .4) : 70 + Math.sin((u - .4) / .6 * Math.PI) * 50 - (u > .85 ? (u - .85) * 400 : 0); this.blob.update(rdt, { squash: Math.sin(this.t * 10) * .2, look: [1, 0] }); }
  },
  draw(r) {
    const W = r.W, H = r.H, b = this.b, t = game.real;
    if (b.cut === 'mascot') {
      const g = r.ctx; Art.sky(g, r.bw, r.bh, ['#0a1030', '#2a3a7a', '#8aa0d8']);
      r.queue(0, 0, 0, gg => { const a = r.w(-60, 0, 130), bb = r.w(60, 0, 60), c = r.w(140, 0, 50), d = r.w(400, 0, 0); px.poly(gg, [[a[0], a[1]], [bb[0], bb[1]], [bb[0], r.bh], [a[0], r.bh]], '#d8e4f4'); px.poly(gg, [[c[0], c[1]], [d[0], d[1]], [d[0], r.bh], [c[0], r.bh]], '#e8f0fb'); const sb = r.w(330, 0, 0); px.ell(gg, sb[0], sb[1] - 4, 22, 10, '#ffffff'); }, { bias: -100 });
      const x = this.mx || 0, z = Math.max(0, this.mz || 0);
      r.actor(x, 0, z, (g2, ox, oy) => { this.blob.draw(g2, ox, oy, r.view); }, {});
      if (this.t > 5.1 && this.t < 5.4) game.particles.bits(330, 0, 4, 8, ['#ffffff', '#e8f0ff']);
    } else UI.backdrop(r.ctx, r.bw, r.bh, '#2a1a4a', '#07081a');
    r.overlay(g => {
      px.rect(g, 0, 28, W, 30, '#e23b2e'); px.rect(g, 0, 58, W, 2, '#ffffff');
      UI.text(g, b.title, 14, 36, '#ffffff', { scale: 2 }); Art.emblem(g, W - 26, 43, 11, t);
      if (b.table) O.drawMedalTable(g, O.meet.medals, W / 2 - 140, 66, 280, O.meet.players.map(p => p.nation));
      O.Comms.draw(g, W, H, { y: H - 34 });
      O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'NEXT', align: 'right' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the event card: goal, controls (glyph icons), qualifying mark, world record
// ---------------------------------------------------------------------------------------------------------------
O.scene('eventCard', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5, pausable: false, menu: false,
  enter() { this.ready = new Set(); this.t = 0; const ev = O.flow.ev(); if (O.Music.current !== 'table') O.Music.play('table'); O.Comms.reset(); this.ev = ev; },
  update(dt, rdt) {
    this.t += rdt; const m = O.meet;
    game.players.forEach((p, i) => { if (i < m.players.length && p.pressed('confirm')) { this.ready.add(i); UI.sfx('confirm'); } });
    if (m.mode === 'single' && game.input.pressed('turbo')) { UI.sfx('confirm'); return O.flow.eventCardDone({ practice: true }); }
    if (game.players.some(p => p.pressed('cancel'))) { UI.sfx('cancel'); if (m.mode === 'single' || m.mode === 'practice') return O.go('single'); }
    if (this.ready.size >= m.players.length || game.input.pressed('start') || (O.autoAll && this.t > 1)) O.flow.eventCardDone({});
  },
  draw(r) { O.drawEventCard(r, this.ev, { ready: this.ready, meet: O.meet, t: this.t }); }
});
O.drawEventCard = (r, ev, o = {}) => {
  const W = r.W, H = r.H, m = o.meet;
  UI.backdrop(r.ctx, r.bw, r.bh, ev.season === 'winter' ? '#16305a' : '#5a2216', '#07081a');
  r.overlay(g => {
    UI.panel(g, 14, 12, W - 28, H - 46, { alpha: .9, trim: ev.season === 'winter' ? '#3fa8e8' : '#ff6b4a' });
    Art.picto(g, ev.id, 24, 22, 48);
    E.font.text(g, ev.name, 82, 24, '#ffffff', { scale: 3, shadow: '#000', outline: false });
    UI.text(g, (ev.season === 'winter' ? 'WINTER' : 'SUMMER') + ' · ' + (ev.venueName || ''), 82, 50, ev.season === 'winter' ? '#7fd0ff' : '#ffb08a');
    const goal = ev.howto.goal.toUpperCase(), gw = Math.max(W - 60 - 200, 170); const gl = UI.wrap(goal, gw, 1).slice(0, 4); gl.forEach((l, i) => UI.text(g, l, 26, 68 + i * 10, '#ffe066'));
    const rows = ev.howto.rows, top = 74 + gl.length * 10, avail = H - 46 - top, sp = Math.min(26, Math.floor(avail / rows.length)), big = sp >= 22 && rows.every(([, l]) => UI.tw(l, 2) < W - 160);
    rows.forEach(([acts, label], i) => { const y = top + i * sp; const w = O.Prompt.draw(g, 26, y, acts, { size: sp >= 22 ? 2 : 1 }); UI.text(g, label, 34 + Math.max(w, sp >= 22 ? 70 : 40), y + (sp >= 22 ? 5 : 2), '#ffffff', { scale: big ? 2 : 1 }); });
    const wr = O.Records.wrEntry(ev.id), xb = Math.max(W - 190, 300), yb = 52;
    if (wr) { UI.text(g, 'WORLD RECORD', xb, yb, '#aab0d0'); UI.text(g, ev.measure.fmt(wr.perf) + ' ' + O.shortName(wr.name) + ' (' + wr.nat + ')', xb, yb + 10, '#ffffff'); }
    if (m && m.mode === 'games' && m.qualifying && m.players.length === 1 && ev.measure.qualify) { UI.text(g, 'QUALIFYING MARK', xb, yb + 22, '#aab0d0'); UI.text(g, ev.measure.fmt(ev.measure.qualify[m.difficulty]), xb, yb + 32, '#ffe066'); }
    if (ev.format.type === 'match') UI.text(g, 'FINAL VS ' + O.nation(O.matchOpponent(ev.id, m)).name, xb, yb + 22, '#ffe066');
    if (m && o.ready) m.players.forEach((p, i) => { const x = W - 30 - (m.players.length - i) * 44; px.rect(g, x, 20, 40, 14, o.ready.has(i) ? p.color : '#2a2f55'); UI.text(g, 'P' + (i + 1) + (o.ready.has(i) ? ' ✓' : ''), x + 6, 23, o.ready.has(i) ? '#000' : '#aab0d0', { shadow: false }); });
    const items = [['confirm', m && m.players.length > 1 ? 'READY' : 'START']]; if (m && m.mode === 'single') items.push(['turbo', 'PRACTICE']); if (m && (m.mode === 'single' || m.mode === 'practice')) items.push(['cancel', 'BACK']);
    if (o.items !== false) O.Prompt.strip(g, o.items || items, W / 2, H - 22);
  });
};
O.matchOpponent = (id, m) => { const mine = (m && m.players || []).map(p => p.nation); const pref = id === 'curling' ? 'MTP' : (m && m.rival) || 'TRB'; if (!mine.includes(pref)) return pref; return O.NATION_IDS.filter(n => !mine.includes(n)).sort((a, b) => O.nation(b).skills[id] - O.nation(a).skills[id])[0]; };

// ---------------------------------------------------------------------------------------------------------------
// results
// ---------------------------------------------------------------------------------------------------------------
O.scene('results', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .6, pausable: false,
  enter() {
    this.t = 0; const res = this.res = O.flow.res(), ev = O.EVENTS[res.event]; this.ev = ev;
    O.Music.play('table'); O.Comms.reset(); O.Comms.event = ev.id;
    const w = res.rows[0]; if (w) O.Comms.cue('win', { name: w.name, nation: O.nation(w.nation).name }, { force: true });
    if (res.records.length) { O.recordBurst('WORLD RECORD!', res.records[0].row.name); O.Comms.cue('wr', {}, { force: true }); }
    const h = res.rows.find(r => r.human), riv = res.rows.find(r => r.nation === O.meet.rival);
    if (h && riv && h.rank <= 4 && riv.rank <= 4 && O.meet.mode !== 'attract') O.Comms.cue(h.rank < riv.rank ? 'rivalBeat' : 'rivalWins', {}, { force: true });
    if (res.failed) O.Music.sting('fail');
  },
  update(dt, rdt) { this.t += rdt; if ((this.t > .8 && game.players.some(p => p.pressed('confirm'))) || (O.autoAll && this.t > 1)) { UI.sfx('confirm'); O.flow.resultsDone(); } },
  draw(r) {
    const W = r.W, H = r.H, res = this.res, ev = this.ev;
    UI.backdrop(r.ctx, r.bw, r.bh, '#141a40', '#07081a');
    r.overlay(g => {
      UI.screenTitle(g, W, ev.name + ' · RESULTS', { right: O.meet.mode === 'games' ? 'DAY ' + (O.meet.day + 1) : '' });
      const x = 14, w = W - 28, rh = 19;
      res.rows.slice(0, 8).forEach((row, i) => {
        const y = 34 + i * rh, k = Math.min(1, Math.max(0, (this.t - i * .06) / .2)); if (k <= 0) return;
        const xx = Math.round(x + (1 - k) * 40);
        if (row.human) px.blend(g, .6, 'normal', () => px.rect(g, xx, y - 2, w, rh - 2, E.shade(row.color, -.5)));
        UI.text(g, String(row.rank), xx + 6, y + 1, '#f2b632', { scale: 2 });
        if (row.medal) Art.medal(g, xx + 30, y + 7, row.medal, 12, { ribbon: false });
        Art.flag(g, xx + 42, y, 21, 14, row.nation);
        UI.text(g, row.name + (row.human ? '  P' + (row.player + 1) : ''), xx + 68, y + 3, row.human ? '#ffffff' : '#d6dbf5');
        const d = row.display; UI.text(g, d, xx + w - 130 - UI.tw(d, 2), y + 1, row.human ? '#ffe066' : '#ffffff', { scale: 2 });
        const notes = row.notes.filter(n => ['WR', 'Q', 'NQ', 'DNF', 'DQ', 'PB'].includes(n)).join(' ');
        UI.text(g, notes, xx + w - 120, y + 4, notes.includes('WR') ? '#ffe066' : notes.includes('NQ') || notes.includes('DQ') ? '#ff6b6b' : '#4fe0a8');
        UI.text(g, row.points ? row.points + ' PTS' : '', xx + w - 50, y + 4, '#8a90b8');
      });
      if (res.qualify != null) { const s = 'QUALIFYING MARK ' + ev.measure.fmt(res.qualify) + (res.qualified ? '  ·  QUALIFIED!' : '  ·  NOT QUALIFIED'); UI.text(g, s, W / 2 - UI.tw(s, 1) / 2, H - 50, res.qualified ? '#4fe0a8' : '#ff6b6b'); }
      O.Comms.draw(g, W, H, { y: H - 30 });
      O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'CONTINUE', align: 'right' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// initials (a letter wheel for each human who made the top 5)
// ---------------------------------------------------------------------------------------------------------------
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! ';
O.scene('initials', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .6,
  enter() { this.res = O.flow.res(); this.k = 0; this.begin(); O.Music.play('menu'); },
  begin() { const row = this.res.initials[this.k]; this.row = row; this.letters = [0, 0, 0]; this.pos = 0; this.inp = game.players[row.player] || game.input; const n = row.name.split(' '); this.letters = [LETTERS.indexOf(n[0][0]), LETTERS.indexOf((n[1] || 'X')[0]), LETTERS.indexOf('!')]; this.rects = {}; },
  update(dt, rdt) {
    const p = this.inp; let d = 0;
    if (p.repeat('up', .3, .09)) d = 1; else if (p.repeat('down', .3, .09)) d = -1;
    if (d) { this.letters[this.pos] = (this.letters[this.pos] + d + LETTERS.length) % LETTERS.length; UI.sfx('select'); }
    if (p.pressed('left')) this.pos = Math.max(0, this.pos - 1); if (p.pressed('right')) this.pos = Math.min(2, this.pos + 1);
    const c = UI.clicked(); if (c) { for (const [key, r] of Object.entries(this.rects)) if (UI.hit(c, ...r)) { const [kind, i] = key.split(':'); if (kind === 'up') this.letters[+i] = (this.letters[+i] + 1) % LETTERS.length; else if (kind === 'dn') this.letters[+i] = (this.letters[+i] - 1 + LETTERS.length) % LETTERS.length; else if (kind === 'ok') this.pos = 3; UI.sfx('select'); } }
    if (p.pressed('confirm') || this.pos === 3 || (O.autoAll && O.cur.t > 1)) { if (this.pos < 2 && this.pos !== 3 && !O.autoAll) { this.pos++; UI.sfx('confirm'); } else this.done(); }
  },
  done() {
    const init = this.letters.map(i => LETTERS[i]).join(''), row = this.row;
    O.Records.insert(this.res.event, { name: row.name, init, nat: row.nation, perf: row.perf }); UI.sfx('confirm'); O.Music.sting('laurel');
    this.k++; if (this.k < this.res.initials.length) this.begin(); else O.flow.afterInitials();
  },
  draw(r) {
    const W = r.W, H = r.H, row = this.row, ev = O.EVENTS[this.res.event];
    UI.backdrop(r.ctx, r.bw, r.bh, '#3a2a10', '#07081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'NEW TOP-5 MARK!', { right: ev.name });
      UI.text(g, row.name + ' · ' + ev.measure.fmt(row.perf), W / 2 - UI.tw(row.name + ' · ' + ev.measure.fmt(row.perf), 2) / 2, 40, '#ffe066', { scale: 2 });
      UI.text(g, 'ENTER YOUR INITIALS', W / 2 - UI.tw('ENTER YOUR INITIALS', 1) / 2, 62, '#ffffff');
      for (let i = 0; i < 3; i++) {
        const x = Math.round(W / 2 - 75 + i * 50), y = 90, on = i === this.pos;
        this.rects['up:' + i] = [x, y - 18, 40, 14]; this.rects['dn:' + i] = [x, y + 52, 40, 14];
        px.poly(g, [[x + 20, y - 16], [x + 30, y - 6], [x + 10, y - 6]], on ? '#f2b632' : '#5a6080'); px.poly(g, [[x + 20, y + 64], [x + 30, y + 54], [x + 10, y + 54]], on ? '#f2b632' : '#5a6080');
        UI.panel(g, x, y, 40, 46, { trim: on ? '#f2b632' : '#3a3f66' });
        E.font.text(g, LETTERS[this.letters[i]], x + 20 - E.font.width(LETTERS[this.letters[i]], { scale: 4 }) / 2, y + 9, on ? '#ffe066' : '#ffffff', { scale: 4, shadow: '#000', outline: false });
      }
      const okx = Math.round(W / 2 + 85), oky = 104; this.rects.ok = [okx, oky, 40, 20]; px.rect(g, okx, oky, 40, 20, this.pos === 3 ? '#ffe066' : '#f2b632'); UI.text(g, 'OK', okx + 13, oky + 6, '#1a1206', { shadow: false });
      O.drawRecordTable(g, this.res.event, W / 2 - 150, 172, 300);
      O.Prompt.strip(g, [['moveV', 'LETTER'], ['moveH', 'MOVE'], ['confirm', 'ACCEPT']], W / 2, H - 22, { inp: this.inp });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the medal ceremony: podium 2-1-3, medals, three flags rising, the winner's anthem, confetti, camera flashes
// ---------------------------------------------------------------------------------------------------------------
O.scene('podium', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5, pausable: true,
  enter() {
    this.t = 0; const res = this.res = O.flow.res(), ev = O.EVENTS[res.event]; this.ev = ev;
    this.top = res.rows.filter(r => r.medal).slice(0, 3).map((row, i) => ({ row, rig: O.makeRig(row.nation, ev.id === 'hockey' || ev.id === 'curling' ? 'ceremony' : ev.id), x: [0, -34, 34][i], z: [26, 18, 12][i] }));
    game.lights.enabled = true; game.lights.ambient = .55; O.CrowdAudio.set(true); O.Crowd.set(.8);
    O.Music.stop(.3); this.anthem = false; O.Comms.reset();
    if (this.top[0]) O.Comms.say('pa', 'PLEASE RISE FOR THE ANTHEM OF ' + O.nation(this.top[0].row.nation).name + '.');
  },
  update(dt, rdt) {
    this.t += rdt; game.focus(0, 60, 40);
    if (this.t > 1.2 && !this.anthem && this.top[0]) { this.anthem = true; O.Anthem.play(this.top[0].row.nation); }
    if (Math.floor(this.t * 1.5) !== this.cf && this.t > 1.5) { this.cf = Math.floor(this.t * 1.5); const n = this.top[0] ? O.nation(this.top[0].row.nation) : O.NATIONS[0]; Art.confetti((this.cf * 37) % 120 - 60, 50, 80, [n.colors.a, n.colors.b, n.colors.c, '#ffffff'], 18); game.audio.sfx('camera', { vol: .4 }); }
    const short = O.meet.mode === 'single' ? 7 : 12;
    if ((this.t > 2 && game.players.some(p => p.pressed('confirm'))) || this.t > short || (O.autoAll && this.t > 1.5)) { O.flow.podiumDone(); }
  },
  draw(r) {
    const t = game.real, ev = this.ev;
    O.Venue.stadium(r, { night: true, marks: false, blimp: false, jumbo: [ev.name, 'MEDALS'] });
    game.lights.add(0, 60, 90, 180, 1.1, { color: '#fff2d0' }); game.lights.add(-60, 80, 60, 120, .6, { color: '#ffb0d0' }); game.lights.add(60, 80, 60, 120, .6, { color: '#a0d0ff' });
    // podium blocks
    for (const [x, h, n] of [[-34, 18, '2'], [0, 26, '1'], [34, 12, '3']]) r.queue(x, 70, 0, g => { r.box(g, x - 15, 62, 0, x + 15, 78, h, '#e8ecf8', '#a8b0c8'); const p = r.w(x, 78, h * .5); E.font.text(g, n, p[0] - 4, p[1] - 4, '#3a3f5a', { scale: 2, outline: false }); }, { bias: -10 });
    // flag poles behind, flags rising
    this.top.forEach((m, i) => { const fx = m.x, rise = clamp((this.t - 1.2) / 8, 0, 1) * [1, .8, .7][i]; r.queue(fx, 20, 0, g => { const b = r.w(fx, 20, 0), top = r.w(fx, 20, 100); px.rect(g, b[0], top[1], 2, b[1] - top[1], '#c8ccd8'); const fy = lerp(b[1] - 20, top[1] + 4, rise); Art.flag(g, b[0] + 2, fy, 24, 16, m.row.nation, 2, t + i); }, { bias: -30 }); });
    // the athletes on the blocks
    this.top.forEach((m, i) => {
      const st = { x: m.x, y: 70, z: m.z, facing: Math.PI / 2 };
      if (i === 0 && this.t > 4) { if (Math.floor(this.t / 3) % 2) O.Pose.set(m.rig, 'medalBite'); else O.Pose.clear(m.rig); st.pose = Math.floor(this.t / 3) % 2 ? undefined : 'cheer'; }
      else if (this.t > 2.5) st.pose = 'wave'; else O.Pose.set(m.rig, 'bowHead');
      if (this.t > 2.5 && i > 0) O.Pose.clear(m.rig);
      m.rig.update(1 / 60, st);
      r.actor(m.x, 70, m.z, (g, ox, oy) => { m.rig.draw(g, ox, oy, r.view); if (this.t > 1) O.Gear.medal(g, m.rig, r.view, ox, oy, 'gsb'[i]); });
    });
    r.overlay(g => {
      const W = r.W, H = r.H;
      UI.text(g, ev.name + ' · MEDAL CEREMONY', 12, 12, '#f2b632', { scale: 2 });
      this.top.forEach((m, i) => { const x = Math.round(W / 2 + [-1, 0, 1][[1, 0, 2].indexOf(i) === -1 ? 0 : 0] * 0); void x; });
      const names = this.top.map((m, i) => ['GOLD', 'SILVER', 'BRONZE'][i] + ' · ' + m.row.name + ' (' + m.row.nation + ') ' + m.row.display);
      names.forEach((s, i) => { Art.medal(g, 18, 40 + i * 14, 'gsb'[i], 9, { ribbon: false }); UI.text(g, s, 28, 37 + i * 14, '#ffffff'); });
      O.Comms.draw(g, W, H, { y: H - 2 });
      if (this.t > 2) O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'CONTINUE', align: 'right' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the medal table, with a ticker of the day's highlights
// ---------------------------------------------------------------------------------------------------------------
O.scene('medals', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5, pausable: true,
  enter() { this.t = 0; O.Music.play('table'); const res = O.flow.res(), ev = O.EVENTS[res.event]; const w = res.rows[0]; this.ticker = (w ? w.name + ' WINS THE ' + ev.name + ' FOR ' + O.nation(w.nation).name + '  ·  ' : '') + res.rows.filter(r => r.human).map(r => r.name + ' FINISHES ' + O.ordinal(r.rank).toUpperCase()).join('  ·  ') + '  ·  ' + (res.records.length ? 'A NEW WORLD RECORD!  ·  ' : '') + 'YIKES REEL: ' + Object.values(O.meet.yikes).reduce((a, b) => a + b, 0) + ' WIPEOUTS SO FAR  ·  '; },
  update(dt, rdt) { this.t += rdt; if ((this.t > .8 && game.players.some(p => p.pressed('confirm'))) || this.t > 12 || (O.autoAll && this.t > 1)) { UI.sfx('confirm'); O.flow.medalsDone(); } },
  draw(r) {
    const W = r.W, H = r.H, m = O.meet;
    UI.backdrop(r.ctx, r.bw, r.bh, '#16204a', '#06081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'MEDAL TABLE', { right: m.mode === 'games' ? 'AFTER DAY ' + (m.day + 1) + ' OF 12' : 'AFTER EVENT ' + (m.day + 1) + ' OF ' + m.events.length });
      O.drawMedalTable(g, m.medals, 14, 34, Math.min(300, W - 150), m.players.map(p => p.nation));
      const px0 = Math.min(300, W - 150) + 24, pw = W - px0 - 12;
      if (m.players.length > 1 || m.mode === 'quick') { UI.panel(g, px0, 34, pw, 20 + m.players.length * 16, { title: 'PARTY POINTS', alpha: .85 }); m.players.forEach((p, i) => { UI.text(g, 'P' + (i + 1) + ' ' + O.nation(p.nation).id, px0 + 8, 52 + i * 16, p.color); UI.text(g, String(m.party['P' + (i + 1)] || 0), px0 + pw - 30, 52 + i * 16, '#ffffff'); }); }
      if (m.mode === 'games' && m.qualifying && m.players.length === 1) { UI.text(g, 'TORCHES', px0, 130, '#f2b632'); for (let i = 0; i < 3; i++) Art.torch(g, px0 + 10 + i * 14, 156, 10, i < m.torches); }
      const tx = W - ((this.t * 50) % (UI.tw(this.ticker, 1) + W)); px.rect(g, 0, H - 44, W, 14, '#e23b2e'); UI.text(g, this.ticker, tx, H - 41, '#ffffff');
      O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'CONTINUE', align: 'right' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// torches: no qualifying mark -> lose a torch and retry; at 0: GAMES OVER -> CONTINUE? (10 s)
// ---------------------------------------------------------------------------------------------------------------
O.scene('torch', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .6,
  enter() { const m = O.meet; this.t = 0; m.torches = Math.max(0, m.torches - 1); this.over = m.torches <= 0; this.count = 10; this.sel = 0; O.Music.stop(.2); O.Music.sting(this.over ? 'gameover' : 'fail'); O.Comms.reset(); O.Comms.cue('noqualify', {}, { force: true }); },
  update(dt, rdt) {
    this.t += rdt; const m = O.meet;
    if (!this.over) { if ((this.t > 1 && game.players.some(p => p.pressed('confirm'))) || (O.autoAll && this.t > 1.2)) { UI.sfx('confirm'); O.flow.torchRetry(); } return; }
    this.count = Math.max(0, 10 - this.t);
    if (game.input.pressed('left') || game.input.pressed('right') || game.input.pressed('up') || game.input.pressed('down')) { this.sel = 1 - this.sel; UI.sfx('select'); }
    const yes = (this.sel === 0 && game.players.some(p => p.pressed('confirm'))) || (O.autoAll && this.t > 1.2 && O.autoContinue !== false);
    if (yes) { m.torches = 3; m.continues = (m.continues || 0) + 1; UI.sfx('confirm'); return O.flow.torchRetry(); }
    if ((this.sel === 1 && game.players.some(p => p.pressed('confirm'))) || this.count <= 0 || (O.autoAll && O.autoContinue === false && this.t > 1.2)) { UI.sfx('cancel'); O.store.del('games'); O.flow.quit(); }
  },
  draw(r) {
    const W = r.W, H = r.H, m = O.meet, t = game.real;
    UI.backdrop(r.ctx, r.bw, r.bh, '#3a0a10', '#07081a');
    r.overlay(g => {
      if (!this.over) {
        O.UI.stamp(g, W, H, 'YIKES!', this.t, { scale: 5, y: 40 });
        UI.text(g, 'NO QUALIFYING MARK', W / 2 - UI.tw('NO QUALIFYING MARK', 2) / 2, 96, '#ffffff', { scale: 2 });
        for (let i = 0; i < 3; i++) Art.torch(g, W / 2 - 30 + i * 30, 160, 20, i < m.torches || (i === m.torches && Math.floor(t * 6) % 2 && this.t < 1.5));
        UI.text(g, m.torches + (m.torches === 1 ? ' TORCH' : ' TORCHES') + ' LEFT', W / 2 - UI.tw(m.torches + ' TORCHES LEFT', 2) / 2, 174, '#f2b632', { scale: 2 });
        O.Prompt.draw(g, W / 2, H - 30, 'confirm', { label: 'TRY AGAIN', size: 2, align: 'center' });
      } else {
        O.UI.stamp(g, W, H, 'GAMES OVER', this.t, { scale: 4, y: 40 });
        UI.text(g, 'CONTINUE?', W / 2 - UI.tw('CONTINUE?', 3) / 2, 100, '#ffffff', { scale: 3 });
        E.font.text(g, String(Math.ceil(this.count)), W / 2 - E.font.width(String(Math.ceil(this.count)), { scale: 5 }) / 2, 128, '#ffe066', { scale: 5, shadow: '#000', outline: false });
        ['YES', 'NO'].forEach((s, i) => UI.text(g, (this.sel === i ? '▸ ' : '  ') + s, W / 2 - 70 + i * 90, 184, this.sel === i ? '#f2b632' : '#ffffff', { scale: 2 }));
        UI.text(g, 'RECORDS AND LAURELS ARE KEPT EITHER WAY', W / 2 - UI.tw('RECORDS AND LAURELS ARE KEPT EITHER WAY', 1) / 2, 206, '#aab0d0');
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the closing ceremony, the ending (by rank), the party champion, and the credits
// ---------------------------------------------------------------------------------------------------------------
const ENDINGS = ['YOUR NATION TOPS THE MEDAL TABLE! BACK HOME THEY\'RE RENAMING A MOUNTAIN AFTER YOU. IT\'S A SMALL MOUNTAIN. IT\'S A HILL. BUT IT\'S YOUR HILL.', 'A PODIUM NATION! RESPECT. MAX SENDS A FRUIT BASKET. IT\'S MOSTLY LEMONS.', 'THE MEDALS DIDN\'T COME, BUT THE HIGHLIGHTS DID. YOUR YIKES REEL HAS FOUR MILLION VIEWS. NEXT GAMES, CHAMP.'];
O.scene('closing', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5, pausable: true,
  enter() {
    const m = O.meet; this.st = { t: 0, hold: 0 }; this.stage = 'dance'; this.stageT = 0;
    this.dancers = O.NATIONS.map((n, i) => ({ id: n.id, rig: O.makeRig(n.id, 'ceremony'), x: 380 + (i % 4) * 40, y: 70 + Math.floor(i / 4) * 30, ph: i }));
    this.cauldron = 'lit'; game.lights.enabled = true; game.lights.ambient = .45; O.Music.play('closing'); O.CrowdAudio.set(true); O.Crowd.set(.8); O.Comms.reset();
    const mine = m.players[0] ? m.players[0].nation : 'SUN'; this.rank = O.flow.rankOf(mine); this.endText = this.rank === 1 ? ENDINGS[0] : this.rank <= 3 ? ENDINGS[1] : ENDINGS[2];
    O.Comms.say('chip', 'WHAT A FORTNIGHT, FOLKS! THE CLOSING CEREMONY OF THE GAMES!');
    const yk = m.yikes[mine] || 0; if (yk >= 5) O.Comms.say('vera', 'STATISTICALLY, THE MOST ENTERTAINING ATHLETE IN GAMES HISTORY.');
    if (m.players.length > 1) { this.party = m.players.map((p, i) => ({ i, p, pts: m.party['P' + (i + 1)] || 0 })).sort((a, b) => b.pts - a.pts); }
    if (m.mode === 'games') { m.done = true; }
  },
  update(dt, rdt) {
    const st = this.st; st.t += rdt; this.stageT += rdt;
    if (this.stage !== 'ending' && holdSkip(st, rdt)) { this.stage = 'ending'; this.stageT = 0; O.Comms.reset(); }
    if (this.stage === 'dance') { if (this.stageT > 7) { this.stage = 'cannon'; this.stageT = 0; O.Comms.say('chip', 'AND HERE COMES THE SNOW CANNON FOR THE GRAND FINALE...'); } }
    else if (this.stage === 'cannon') {
      if (this.stageT > 1.5 && this.cauldron === 'lit') { this.cauldron = 'out'; game.particles.smoke(600, 6, 90, 14, { size: 8, color: '#e8f0ff' }); O.Stamps.add('OLYMPIYIKES!', { dur: 1.8 }); O.Music.sting('yikes'); O.Comms.say('chip', 'IT PUT OUT THE CAULDRON! IT PUT OUT THE CAULDRON!'); O.Comms.say('vera', 'WAIT. LOOK. ALL EIGHT OF THEM...'); }
      if (this.stageT > 5 && this.cauldron === 'out') { this.cauldron = 'lit'; Art.firework(600, 6, 110, ['#ff6a1a', '#3fa8e8', '#ffd23a']); O.CrowdAudio.cheer(); O.Crowd.startWave(); O.Comms.say('chip', 'THEY\'VE RELIT IT TOGETHER! FASTER! HIGHER! YIKES!'); }
      if (this.stageT > 9) { this.stage = 'motto'; this.stageT = 0; }
    } else if (this.stage === 'motto') {
      if (Math.floor(this.stageT * 2) !== this.fw) { this.fw = Math.floor(this.stageT * 2); Art.firework(420 + (this.fw * 113) % 320, -30, 100 + (this.fw * 23) % 30, ['#ff6a1a', '#3fa8e8', '#f2b632', '#ff7fb8', '#ffffff']); }
      if (this.stageT > 5) { this.stage = 'ending'; this.stageT = 0; }
    } else if (this.stage === 'ending') {
      if ((this.stageT > 1.5 && game.players.some(p => p.pressed('confirm'))) || this.stageT > 16 || (O.autoAll && this.stageT > 1.5)) { UI.sfx('confirm'); O.go('credits', {}); }
    }
    game.focus(500, 70, 34);
  },
  draw(r) {
    const t = game.real, m = O.meet;
    O.Venue.stadium(r, { night: true, marks: false, jumbo: (() => { const rows = O.medalTable(m.medals); return ['FINAL TABLE', '1 ' + rows[0].id + ' ' + rows[0].g + 'G', '2 ' + rows[1].id + ' ' + rows[1].g + 'G']; })() });
    for (let k = 0; k < 4; k++) game.lights.add(380 + k * 70, 60, 80, 140, .8, { color: ['#ffd0a0', '#a0d0ff', '#ffb0e0', '#c0ffb0'][k] });
    const cx = 600, cy = 6;
    r.queue(cx, cy, 0, g => { const b = r.w(cx, cy, 0), top = r.w(cx, cy, 78); px.rect(g, b[0] - 5, top[1], 10, b[1] - top[1], '#5a4a3a'); px.poly(g, [[top[0] - 16, top[1] - 12], [top[0] + 16, top[1] - 12], [top[0] + 8, top[1]], [top[0] - 8, top[1]]], '#c8901a'); if (this.cauldron === 'lit') for (let i = 0; i < 7; i++) { const f = Math.sin(t * 9 + i) * 3; px.poly(g, [[top[0] - 14 + i * 4, top[1] - 13], [top[0] - 8 + i * 4, top[1] - 13], [top[0] - 11 + i * 4 + f, top[1] - 34 - (i % 3) * 6]], i % 2 ? '#ff7a1a' : '#ffd23a'); } }, { emissive: true });
    if (this.cauldron === 'lit') game.lights.add(cx, cy, 90, 200, 1, { color: '#ffb060' });
    if (this.stage === 'cannon' && this.stageT < 1.6) { for (let i = 0; i < 3; i++) game.particles.add({ kind: 'dust', x: 470 + this.stageT * 80, y: 40, z: 40 + this.stageT * 30, vx: 90, vy: 0, vz: 40, g: 20, max: .8, size: 3, color: '#ffffff' }); }
    this.dancers.forEach((d, i) => {
      const relight = this.stage === 'cannon' && this.stageT > 3 && this.stageT < 5.5, x = relight ? lerp(d.x, 590 + (i % 4) * 6, clamp((this.stageT - 3) / 1.5, 0, 1)) : d.x, y = relight ? 30 + Math.floor(i / 4) * 8 : d.y;
      const st = { x, y, z: 0, facing: relight ? 0 : Math.PI / 2 };
      if (relight) O.Pose.set(d.rig, 'torchRaise'); else { O.Pose.clear(d.rig); st.pose = ['cheer', 'wave', 'hips', 'cheer'][(i + Math.floor(t)) % 4]; st.run = (i + Math.floor(t * 2)) % 3 === 0 ? .4 : 0; }
      d.rig.update(1 / 60, st); r.shadow(x, y, 6, .4);
      r.actor(x, y, 0, (g, ox, oy) => { d.rig.draw(g, ox, oy, r.view); if (relight) O.Gear.torch(g, d.rig, r.view, ox, oy); });
    });
    r.overlay(g => {
      const W = r.W, H = r.H;
      UI.text(g, 'CLOSING CEREMONY', 12, 12, '#f2b632', { scale: 2 });
      if (this.stage === 'dance') { UI.panel(g, 12, 34, 150, 20 + 8 * 11, { title: 'YIKES REEL', alpha: .8 }); O.NATIONS.forEach((n, i) => { UI.text(g, n.id, 20, 52 + i * 11, '#ffffff'); UI.text(g, String(m.yikes[n.id] || 0), 140, 52 + i * 11, '#ff9a6a'); }); }
      if (this.stage === 'motto') E.font.title(g, 'FASTER. HIGHER. YIKES.', W / 2, 60, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e0461a'], outline: '#3a0a10', depth: 2, align: 'center' });
      if (this.stage === 'ending') {
        UI.panel(g, 20, 34, W - 40, H - 90, { alpha: .9 });
        const mine = m.players[0] ? m.players[0].nation : 'SUN', n = O.nation(mine);
        Art.flag(g, 32, 44, 42, 28, mine, 2);
        UI.text(g, n.name + ' FINISHES ' + O.ordinal(this.rank).toUpperCase() + ' ON THE MEDAL TABLE', 84, 48, '#f2b632', { scale: 1 });
        const med = m.medals[mine] || { g: 0, s: 0, b: 0 }; UI.text(g, med.g + ' GOLD · ' + med.s + ' SILVER · ' + med.b + ' BRONZE', 84, 62, '#ffffff');
        UI.wrap(this.endText, W - 80, 2).forEach((l, i) => UI.text(g, l, 34, 84 + i * 20, '#ffffff', { scale: 2 }));
        if (this.party) { UI.text(g, 'PARTY CHAMPION', 34, H - 86, '#ffe066'); this.party.forEach((p, i) => UI.text(g, (i + 1) + '. P' + (p.i + 1) + ' (' + p.p.nation + ') ' + p.pts + ' PTS', 34 + i * 110, H - 74, p.p.color)); }
        O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'CREDITS', align: 'right' });
      } else drawHold(g, W, H, this.st);
      O.Comms.draw(g, W, H, { y: H - 2 });
    });
  }
});
O.scene('credits', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5,
  enter() { this.t = 0; this.page = 0; this.pages = O.CREDITS_PAGES ? O.CREDITS_PAGES() : [['THANK YOU FOR PLAYING']]; O.Music.play('closing'); },
  update(dt, rdt) {
    this.t += rdt; const n = this.pages.length;
    if (game.players.some(p => p.pressed('confirm') || p.pressed('right')) || this.t > 5 || (O.autoAll && this.t > .6)) { this.t = 0; this.page++; if (this.page >= n) { O.meet = null; return O.go('title'); } }
    if (game.players.some(p => p.pressed('left')) && this.page > 0) { this.page--; this.t = 0; }
    if (game.players.some(p => p.pressed('cancel'))) { O.meet = null; O.go('title'); }
  },
  draw(r) {
    const W = r.W, H = r.H, p = this.pages[this.page] || [];
    UI.backdrop(r.ctx, r.bw, r.bh, '#1a1650', '#07081a');
    r.overlay(g => {
      Art.emblem(g, W / 2, 40, 18);
      p.forEach((l, i) => { const big = i === 0; UI.text(g, l, W / 2 - UI.tw(l, big ? 2 : 1) / 2, 70 + (big ? 0 : 14 + i * 13), big ? '#f2b632' : '#ffffff', { scale: big ? 2 : 1 }); });
      UI.dots(g, this.pages.length, this.page, W / 2, H - 40);
      O.Prompt.strip(g, [['confirm', 'NEXT'], ['cancel', 'SKIP']], W / 2, H - 24);
    });
  }
});
})();
