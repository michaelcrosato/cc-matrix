/* OLYMPIYIKES! — the flow (§10): The Games, Quick Games, Single Event; setup, nations + join, day cards, event cards, results,
 * initials, medal ceremonies, the medal table, story beats, torches and continues, autosave. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, P = O.PAL;
const DAYS = ['sprint', 'skijump', 'swim', 'curling', 'javelin', 'downhill', 'archery', 'figure', 'weights', 'bobsled', 'diving', 'hockey'];
O.DAYS = DAYS;
O.PLAYLISTS = { track: ['TRACK & POOL', ['sprint', 'javelin', 'swim', 'diving']], snow: ['SNOW & ICE', ['skijump', 'downhill', 'bobsled', 'curling']], hits: ['GREATEST HITS', ['sprint', 'skijump', 'diving', 'hockey']], random: ['RANDOM 4', null] };
const BEATS = {
  before1: { title: 'THE CALL ROOM', who: ['max'], lines: ['M:Lane four? Cute. I\'m in lane five. Lane five is where legends warm up.'] },
  after2: { title: 'BREAKING: MASCOT INCIDENT', who: ['yikesy'], cut: 'mascotJump', lines: ['C:The mascot has... the mascot has set a personal best! || V:And a personal worst. Simultaneously.'] },
  after4: { title: 'AROUND THE VILLAGE', nat: 'MTP', lines: ['K:Back home we curl to settle arguments. Mostly about curling.'] },
  after6: { title: 'HALFTIME REPORT', who: ['yikesy'], halftime: true, lines: ['C:Halfway through the Games, folks! Let\'s check that medal table! || V:And our mascot is back. Dripping. Rescued from the pool filter.'] },
  after8: { title: 'UP CLOSE & PERSONAL', nat: 'BON', lines: ['K:Grandpa, that one was for you. || V:...Give me a second, Chip.'] },
  after10: { title: 'SLED SCANDAL', who: ['max'], lines: ['V:Turbonia\'s sled has a spoiler. And a cup holder. || M:It\'s called aerodynamic hospitality.'] },
  before12: { title: 'THE FINAL', who: ['max'], final: true, lines: ['M:Two nations. One puck. Zero chance. For you.'] },
  after12: { title: 'SPORTSMANSHIP', who: ['max'], sports: true, lines: [] }
};

/* ---- the meet ---- */
O.flow = {
  newMeet(mode, o = {}) {
    const m = { mode, seed: o.seed || ((Date.now() % 1e9) | 0), events: o.events || DAYS.slice(), day: 0, players: o.players || [], difficulty: o.difficulty || game.settings.difficulty || 'Normal',
      qualifying: o.qualifying !== undefined ? o.qualifying : (o.players || []).length <= 1, torches: 3, medals: {}, party: {}, results: {}, yikes: {}, rival: 'TRB', beats: {}, quick: !!o.quick, coop: !!o.coop, practice: !!o.practice, retries: 0 };
    for (const n of O.NATIONS) m.medals[n.id] = { g: 0, s: 0, b: 0 };
    return m;
  },
  quickMeet(id) { const m = this.newMeet('single', { events: [id], players: [{ nat: 'SUN', input: 0, color: E.PLAYER_COLORS[0] }] }); m.rival = O.rivalFor(['SUN']); return m; },
  begin(meet) { O.meet = meet; meet.rival = O.rivalFor(meet.players.map(p => p.nat)); },
  /** the runner calls this when an event is over */
  eventDone(ctx) {
    const meet = ctx.meet, res = ctx.results;
    if (meet.mode === 'attract') { O.Attract && O.Attract.segmentDone(); return; }
    if (meet.mode === 'hub') { O.Hub && O.Hub.eventDone(ctx); return; }
    meet.lastResults = res; meet.lastEvent = ctx.def.id;
    O.go('results', { ctx }, 'wipe');
  },
  /** after the results screen (and initials): qualifying, then the ceremony */
  afterResults() {
    const meet = O.meet, res = meet.lastResults, def = O.EVENTS[meet.lastEvent];
    if (meet.practice) return O.go('singleAfter', {});
    // qualifying (The Games, one human, qualifying on)
    if ((meet.mode === 'games') && meet.qualifying && meet.players.length === 1 && def.measure.qualify) {
      const row = res.rows.find(r => r.a.human), q = def.measure.qualify[meet.difficulty] * (def.measure.better === 'lower' ? 1 / O.G.qualifyScale : O.G.qualifyScale);
      const ok = row && row.v != null && (def.measure.better === 'lower' ? row.v <= q : row.v >= q);
      if (!ok) { meet.torches--; O.store.set('games', null); return O.go('torch', { over: meet.torches <= 0 }); }
    }
    this.commit(meet, res, def);
    O.go('podium', { res, def }, 'white');
  },
  /** medals, party points, cabinet, the results kept */
  commit(meet, res, def) {
    if (meet.results[def.id] && meet.results[def.id].committed) return;
    res.committed = true; meet.results[def.id] = { rows: res.rows.map(r => ({ nat: r.a.nat.id, v: r.v, display: r.display, rank: r.rank, medal: r.medal, notes: r.notes, points: r.points, human: r.a.human })), committed: true };
    for (const r of res.rows) { if (r.medal) { const m = meet.medals[r.a.nat.id]; m[['g', 's', 'b'][r.medal - 1]]++; } if (r.a.human) { const pi = r.a.player; meet.party[pi] = (meet.party[pi] || 0) + (O.PARTY[r.rank - 1] || 0); O.Cabinet.add(r.a.nat.id, def.id, r.medal || 9); } }
  },
  afterPodium() { const meet = O.meet; if (meet.mode === 'single') return O.go('singleAfter', {}); O.go('medals', {}); },
  afterMedals() {
    const meet = O.meet; meet.day++;
    const key = 'after' + meet.day;
    if (!meet.quick && BEATS[key] && !meet.beats[key]) { meet.beats[key] = 1; return O.go('beat', { key }); }
    this.next();
  },
  next() {
    const meet = O.meet; O.flow.save();
    if (meet.day >= meet.events.length) { O.store.set('games', null); return O.go('closing', {}, 'white'); }
    const key = 'before' + (meet.day + 1);
    if (!meet.quick && BEATS[key] && !meet.beats[key]) { meet.beats[key] = 1; return O.go('beat', { key }); }
    O.go('dayCard', {});
  },
  save() { const m = O.meet; if (!m || m.mode !== 'games' || m.practice) return; const keep = Object.assign({}, m, { lastResults: null }); O.store.set('games', JSON.parse(JSON.stringify(keep))); },
  load() { const m = O.store.get('games', null); return m && typeof m === 'object' && Array.isArray(m.events) ? m : null; },
  startEvent(id, data) { O.go('ev:' + id, data || {}, 'iris'); }
};
O.BEATS = BEATS;

/* ---- shared drawing for the card screens ---- */
const bg = (r, season) => { r.sky(season === 'winter' ? ['#0a1440', '#1a3a7a', '#3a6ab0'] : season === 'summer' ? ['#3a0e30', '#8a2a3a', '#e86a3a'] : ['#0b0f24', '#18204a', '#2a3070']); };
O.bgCard = bg;
const stripeBg = (g, r, t) => { for (let k = 0; k < 14; k++) { const x = ((k * 60 + t * 20) % (r.W + 120)) - 60; px.blend(g, .05, 'add', () => px.poly(g, [[x, 0], [x + 24, 0], [x - 40, r.H], [x - 64, r.H]], '#ffffff')); } };
O.stripeBg = stripeBg;
const portraitRigs = {};
O.portrait = (nat, sport) => { const k = nat.id + (sport || 'ceremony'); if (!portraitRigs[k]) { const rg = O.makeRig(nat, sport || 'ceremony'); rg.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); portraitRigs[k] = rg; } return portraitRigs[k]; };

/* ---- games setup ---- */
O.scene('gamesSetup', {
  menu: true,
  enter() {
    this.opts = { len: 'full', list: 'track', diff: game.settings.difficulty, qual: true, coop: false };
    const o = this.opts;
    this.m = new O.Menu10([
      O.optionItem('Length', [['full', 'Full · 12 days'], ['quick', 'Quick · 4 events']], () => o.len, v => { o.len = v; }),
      O.optionItem('Playlist', Object.entries(O.PLAYLISTS).map(([k, v]) => [k, v[0]]), () => o.list, v => { o.list = v; }),
      O.optionItem('Difficulty', [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']], () => o.diff, v => { o.diff = v; }),
      O.optionItem('Qualifying', [[true, 'On'], [false, 'Off']], () => o.qual, v => { o.qual = v; }),
      O.optionItem('Team events', [[false, 'Versus'], [true, 'Co-op']], () => o.coop, v => { o.coop = v; }),
      { label: 'START' }]);
    this.m.i = 5; O.music('menu');
  },
  update(dt) {
    const k = this.m.update(dt); this.m.items[1].disabled = this.opts.len !== 'quick';
    if (k === 'cancel') return O.go('menu', {});
    if (k === 5) {
      const o = this.opts; let events = DAYS.slice();
      if (o.len === 'quick') { const pl = O.PLAYLISTS[o.list]; if (pl[1]) events = pl[1].slice(); else { const r = E.rng(Date.now() % 1e6), S = DAYS.filter(d => O.EVENTS[d].season === 'summer'), W = DAYS.filter(d => O.EVENTS[d].season === 'winter'); const pick = (L, n) => { const c = L.slice(), out = []; while (out.length < n) out.push(c.splice(Math.floor(r() * c.length), 1)[0]); return out; }; events = DAYS.filter(d => pick(S, 2).concat(pick(W, 2)).includes(d)); events = events.length === 4 ? events : DAYS.slice(0, 4); } }
      O.go('nations', { next: 'games', setup: { events, quick: o.len === 'quick', difficulty: o.diff, qualifying: o.qual, coop: o.coop } });
    }
  },
  draw(r) {
    bg(r); r.overlay(g => { stripeBg(g, r, O.sceneT); O.title(g, 'THE GAMES', r.W / 2, 14, 3);
      const w = Math.min(380, r.W - 40), x = r.W / 2 - w / 2; O.panel(g, x - 8, 50, w + 16, 6 * 22 + 16); this.m.draw(g, x, 58, w);
      const o = this.opts; O.text(g, o.len === 'full' ? 'Opening ceremony · 12 days · story · closing ceremony' : O.PLAYLISTS[o.list][0] + ': 4 events, a flame-lighting, party points', r.W / 2, 58 + 6 * 22 + 18, '#c8d0f0', { align: 'center' });
      O.Prompt.strip(g, r, [['move', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]); });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- nation select + join (§3.2 #6) ---- */
O.scene('nations', {
  menu: true,
  enter(d) {
    this.d = d; this.cur = [{ i: 0, locked: false }]; this.rects = []; this.t = 0;
    game.allowJoin({ max: 4, onJoin: (inp, n) => { this.cur[n - 1] = { i: (n * 2) % 8, locked: false }; O.sfx('powerup'); } });
    for (let k = 1; k < game.players.length; k++) this.cur[k] = this.cur[k] || { i: (k * 2) % 8, locked: false };
    this.rig = null; this.rigNat = null; O.music('menu');
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    this.t += dt;
    const ps = game.players;
    ps.forEach((inp, k) => {
      const c = this.cur[k] || (this.cur[k] = { i: (k * 2) % 8, locked: false });
      if (!c.locked) {
        let moved = false;
        if (inp.repeat('right', .3, .12)) { c.i = (c.i + 1) % 8; moved = true; } if (inp.repeat('left', .3, .12)) { c.i = (c.i + 7) % 8; moved = true; }
        if (inp.repeat('down', .3, .12) || inp.repeat('up', .3, .12)) { c.i = (c.i + 4) % 8; moved = true; }
        if (k === 0) { const hp = O.hover(inp); if (hp) this.rects.forEach((R, j) => { if (O.hit(hp, R) && c.i !== j) { c.i = j; moved = true; } }); }
        if (moved) O.sfx('select', { vol: .4 });
        const cl = k === 0 && inp.clicked && inp.clicked(); let pick = inp.pressed('confirm') || inp.pressed('action');
        if (cl) { const j = this.rects.findIndex(R => O.hit(cl, R)); if (j >= 0) { c.i = j; pick = true; } }
        if (pick) { if (this.cur.some((o, j) => j !== k && o.locked && o.i === c.i)) O.sfx('bump'); else { c.locked = true; O.sfx('confirm'); O.Voice.speak(O.NATIONS[c.i].name + '!', O.voiceOf(O.NATIONS[c.i])); } }
        if (inp.pressed('cancel')) { if (k === 0) { O.go(this.d.next === 'single' ? 'single' : 'gamesSetup', {}); return; } game.removePlayer(inp); this.cur.splice(k, 1); }
      } else if (inp.pressed('cancel')) { c.locked = false; O.sfx('cancel'); }
    });
    const all = this.cur.slice(0, ps.length);
    if (all.length && all.every(c => c.locked) && (game.input.pressed('start') || (all.length === 1) || game.input.pressed('confirm') && this.t > .2 && all.every(c => c.locked) && this.allLockedT > .3)) {
      this.go(all);
    }
    this.allLockedT = all.every(c => c.locked) ? (this.allLockedT || 0) + dt : 0;
    const focus = O.NATIONS[(this.cur[0] || { i: 0 }).i];
    if (this.rigNat !== focus.id) { this.rigNat = focus.id; this.rig = O.makeRig(focus, 'ceremony'); }
    if (this.rig) this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer' });
  },
  go(all) {
    const players = all.map((c, k) => ({ nat: O.NATIONS[c.i].id, input: k, color: E.PLAYER_COLORS[k] }));
    const d = this.d;
    if (d.next === 'single') { const meet = O.flow.newMeet(d.practice ? 'single' : 'single', { events: [d.event], players, practice: !!d.practice, coop: !!d.coop }); O.flow.begin(meet); return O.go('eventCard', { single: true }); }
    const meet = O.flow.newMeet('games', Object.assign({ players }, d.setup)); O.flow.begin(meet);
    O.go('opening', {}, 'white');
  },
  draw(r) {
    bg(r); const t = this.t;
    r.overlay(g => {
      stripeBg(g, r, t); O.title(g, 'CHOOSE YOUR NATION', r.W / 2, 10, 2);
      const fw = 48, fh = 32, gap = 12, gx = Math.round(Math.max(14, r.W * .06)), gy = 48; this.rects = [];
      O.NATIONS.forEach((n, j) => {
        const x = gx + (j % 4) * (fw + gap), y = gy + Math.floor(j / 4) * (fh + 26); this.rects.push([x - 2, y - 2, fw + 4, fh + 16]);
        const taken = this.cur.findIndex(c => c.locked && c.i === j);
        O.Art.flag(g, x, y, fw, fh, n, true); O.text(g, n.id, x + fw / 2, y + fh + 3, taken >= 0 ? E.PLAYER_COLORS[taken] : '#ffffff', { align: 'center' });
        this.cur.forEach((c, k) => { if (c.i !== j) return; const col = E.PLAYER_COLORS[k], o = k * 2; px.rect(g, x - 3 - o, y - 3 - o, fw + 6 + 2 * o, 2, col); px.rect(g, x - 3 - o, y + fh + 1 + o, fw + 6 + 2 * o, 2, col); px.rect(g, x - 3 - o, y - 3 - o, 2, fh + 6 + 2 * o, col); px.rect(g, x + fw + 1 + o, y - 3 - o, 2, fh + 6 + 2 * o, col); O.HUD.tag(g, x + k * 14 - 2, y - 14, { tag: 'P' + (k + 1) + (c.locked ? '✓' : ''), color: col }); });
      });
      // the focused nation's athlete
      const n = O.NATIONS[(this.cur[0] || { i: 0 }).i], px0 = gx + 4 * (fw + gap) + 10, pw = r.W - px0 - 14;
      if (pw > 120) {
        O.panel(g, px0, gy - 6, pw, 160);
        if (this.rig) { this.rig.draw(g, px0 + 36, gy + 92, O.REAR ? E.VIEWS.brawler : E.VIEWS.brawler); }
        O.text(g, n.athlete, px0 + 70, gy + 2, '#f2b632'); O.text(g, n.name, px0 + 70, gy + 13, '#ffffff');
        const top = Object.entries(n.skills).sort((a, b) => b[1] - a[1]).slice(0, 3); top.forEach(([ev], k) => O.Art.picto(g, px0 + 70 + k * 22, gy + 26, ev, 1, O.EVENTS[ev] && O.EVENTS[ev].season));
        O.wrap(n.bio, pw - 80, 1).slice(0, 7).forEach((ln, k) => O.text(g, ln, px0 + 70, gy + 50 + k * 10, '#c8d0f0'));
      }
      O.text(g, 'P2–P4: press ' + O.Prompt.label('start', game.input) + ' on another controller, or 2 on the keyboard', r.W / 2, r.H - 42, '#9aa2c8', { align: 'center' });
      O.Prompt.strip(g, r, [['move', 'Choose'], ['confirm', 'Pick'], ['cancel', 'Back']].concat(game.players.length > 1 ? [['start', 'Go!']] : []));
    });
  },
  back() { O.go('menu', {}); return true; }
});

/* ---- day card ("broadcast bumper") ---- */
O.scene('dayCard', {
  enter() { const m = O.meet; this.id = m.events[m.day]; this.def = O.EVENTS[this.id]; this.t = 0;
    const humNat = m.players.length ? O.NAT[m.players[0].nat] : O.NATIONS[0];
    const order = m.day === 0 ? humNat : O.NATIONS[(m.day + 3) % 8]; this.nat = order; this.rig = O.portrait(order, 'ceremony');
    O.music('table'); O.Comms.reset(); O.Comms.say('P:Day ' + (m.day + 1) + '. ' + this.def.name + '. At ' + this.def.venue + '.', null, 5); },
  update(dt) { this.t += dt; this.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); if (this.t > .8 && (game.input.pressed('confirm') || game.input.clicked())) O.go('eventCard', {}); if (this.t > 9) O.go('eventCard', {}); },
  draw(r) {
    const d = this.def, m = O.meet; bg(r, d.season);
    r.overlay(g => {
      stripeBg(g, r, this.t);
      O.text(g, 'DAY ' + (m.day + 1) + ' OF ' + m.events.length, r.W / 2, 16, '#ffd060', { align: 'center', scale: 2 });
      O.Art.picto(g, r.W / 2 - 24, 40, d.pictogram, 3, d.season);
      O.title(g, d.name, r.W / 2, 94, 3);
      O.text(g, d.venue + (d.season === 'winter' ? ' · Mount Glory' : ' · Sunny Bay'), r.W / 2, 124, '#c8d0f0', { align: 'center' });
      // lower third: up close & personal
      const y = r.H - 92, w = Math.min(r.W - 30, 440), x = r.W / 2 - w / 2; O.panel(g, x, y, w, 64);
      this.rig.drawPortrait(g, x + 6, y + 6, 52, { zoom: 3 });
      O.text(g, 'UP CLOSE & PERSONAL · ' + this.nat.athlete, x + 64, y + 6, '#f2b632');
      O.wrap(this.nat.bio, w - 74, 1).slice(0, 4).forEach((ln, k) => O.text(g, ln, x + 64, y + 18 + k * 10, '#ffffff'));
      O.Prompt.strip(g, r, [['confirm', 'Continue']]);
    });
  }
});

/* ---- event card: the goal and controls on one screen ---- */
O.scene('eventCard', {
  enter(d) { const m = O.meet; this.id = d.id || m.events[m.day] || m.events[0]; this.def = O.EVENTS[this.id]; this.single = !!d.single || m.mode === 'single'; this.ready = {}; this.t = 0; O.music('menu'); },
  update(dt) {
    this.t += dt; const m = O.meet, ps = game.players.slice(0, Math.max(1, m.players.length));
    ps.forEach((inp, k) => { if (inp.pressed('confirm') || inp.pressed('action')) { this.ready[k] = true; O.sfx('select'); } });
    const cl = game.input.clicked(); if (cl && this.startR && O.hit(cl, this.startR)) this.ready[0] = true;
    if (game.input.pressed('cancel')) { if (this.single) return O.go('single', {}); }
    if (this.single && game.input.pressed('turbo') && !m.practice) { m.practice = true; O.toast('PRACTICE', 'No CPU rivals, no records'); }
    if (ps.every((_, k) => this.ready[k]) || game.input.pressed('start')) O.flow.startEvent(this.id, {});
  },
  draw(r) {
    const d = this.def, m = O.meet; bg(r, d.season);
    r.overlay(g => {
      stripeBg(g, r, this.t);
      const w = Math.min(r.W - 30, 460), x = r.W / 2 - w / 2, y = 14; O.panel(g, x, y, w, r.H - 50);
      O.Art.picto(g, x + 12, y + 12, d.pictogram, 2, d.season); O.title(g, d.name, x + 52, y + 14, 2, { align: 'left' });
      O.text(g, 'GOAL: ' + d.howto.goal, x + 52, y + 36, '#ffd060');
      d.howto.rows.forEach((row, k) => { const yy = y + 58 + k * 24; let xx = x + 20; const [acts, verb] = row;
        if (acts === 'pair') xx += O.Prompt.pair(g, xx, yy, { size: 2 }) + 8;
        else if (acts) for (const a of acts) xx += O.Prompt.draw(g, xx, yy, a, { size: 2 }) + 6; else xx += 4;
        O.text(g, verb, Math.max(xx, x + 110), yy + 4, '#ffffff', { scale: 1 }); });
      const yb = y + 58 + d.howto.rows.length * 24 + 6;
      if (d.measure.qualify) O.text(g, 'QUALIFYING (' + m.difficulty + '): ' + d.measure.fmt(d.measure.qualify[m.difficulty]), x + 20, yb, '#c8d0f0');
      const wr = O.Records.wr(d); if (wr) O.text(g, (d.matchEvent ? 'RECORD: ' : 'WORLD RECORD: ') + d.measure.fmt(wr.v) + ' · ' + wr.name + ' (' + wr.nat + ')', x + 20, yb + 12, '#c8d0f0');
      if (d.turbo) O.text(g, 'TURBO: ' + d.turbo, x + 20, yb + 24, '#ff8a3a');
      // readiness per player
      game.players.slice(0, Math.max(1, m.players.length)).forEach((inp, k) => O.HUD.tag(g, x + w - 60 - k * 0, y + 14 + k * 14, { tag: 'P' + (k + 1) + (this.ready[k] ? ' READY' : ''), color: this.ready[k] ? E.PLAYER_COLORS[k] : '#5a6290' }));
      if (m.practice) O.text(g, 'PRACTICE MODE', x + w - 14, y + r.H - 70, '#4fe0a8', { align: 'right' });
      this.startR = [r.W / 2 - 80, r.H - 30, 160, 26];
      O.Prompt.strip(g, r, [['confirm', 'Start']].concat(this.single ? [['cancel', 'Back']].concat(m.practice ? [] : [['turbo', 'Practice']]) : []));
    });
  }
});
O.showEventHelp = () => { if (O.ctx && game.sceneName && game.sceneName.startsWith('ev:')) { game.resume(); O.helpOverlay = 5; } else game.note('Not in an event'); };
O.restartEvent = () => { if (O.ctx && game.sceneName && game.sceneName.startsWith('ev:')) { game.resume(); const id = O.ctx.def.id; for (const a of O.ctx.athletes) { a.attempts = []; a.notes = []; a.best = null; } O.go('ev:' + id, { retry: (O.ctx.retry || 0) + 1, noIntro: true }, 0); } else game.note('Not in an event'); };

/* ---- results (§3.2 #12) ---- */
O.scene('results', {
  lock: .6,
  enter(d) {
    const ctx = d.ctx, def = ctx.def, res = ctx.results, meet = ctx.meet; this.ctx = ctx; this.def = def; this.res = res; this.t = 0; this.burst = 0;
    O.music('table');
    // records: WR, games record, personal bests; top-5 tables (initials later)
    const wr = O.Records.wr(def), top = res.rows[0];
    if (!meet.practice && top && top.v != null && wr && O.better(def, top.v, wr.v) && !def.matchEvent) { res.records.push('WR'); this.burst = 1; O.sting('wr'); O.Comms.say(top.a.human ? 'V:I held a world record once. For eleven minutes. Cherish this.' : 'C:A NEW WORLD RECORD! Somebody call the record books!', null, 9); }
    else { const h = res.rows.find(r => r.a.human); if (h && h.rank === 1) O.Comms.cue('win', { nation: h.a.nat.name, name: h.a.short }); else if (h) O.Comms.cue(h.rank <= 3 ? 'win' : 'lose', { nation: h.a.nat.name, name: h.a.short }); }
    // the rival
    const hum = res.rows.filter(r => r.a.human), rv = res.rows.find(r => r.a.id === meet.rival);
    if (hum.length && rv && rv.rank <= 4 && !meet.practice) game.after(3.2, () => O.Comms.say(O.COMM_BANK[hum[0].rank < rv.rank ? 'rivalBeat' : 'rivalWins'][Math.floor(E.hash2(meet.day, 3) * 3)], null, 8));
    // the initials queue: humans who made a top-5 table
    this.initials = meet.practice ? [] : res.rows.filter(r => r.a.human && r.v != null && O.Records.qualifies(def, r.v));
    const ps = res.rows.filter(r => r.a.human && r.v != null); for (const r of ps) { const pb = O.store.get('pb', {}) || {}; const k = r.a.nat.id + ':' + def.id; if (!pb[k] || O.better(def, r.v, pb[k])) { pb[k] = r.v; O.store.set('pb', pb); r.notes.push('PB'); } }
    if (meet.mode === 'games' && meet.qualifying && meet.players.length === 1 && def.measure.qualify) { const q = def.measure.qualify[meet.difficulty]; for (const r of res.rows) if (r.a.human && r.v != null && (def.measure.better === 'lower' ? r.v <= q : r.v >= q)) r.notes.push('Q'); }
    for (const a of ctx.athletes) if (a.yikes >= 1 && a.human) meet.yikesTotal = (meet.yikesTotal || 0) + a.yikes;
    if ((meet.yikesTotal || 0) >= 5 && !meet.yikesLine) { meet.yikesLine = true; game.after(6.5, () => O.Comms.say('V:Statistically, the most entertaining athlete in Games history.', null, 7)); }
  },
  update(dt) {
    this.t += dt;
    if (this.burst && this.t < 3 && Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) O.sfx('firework', { vol: .5 });
    if (this.t > .6 && (game.input.pressed('confirm') || game.input.clicked())) this.next();
  },
  next() {
    O.pendingInitials = this.initials.map(r => ({ row: { v: r.v, nat: r.a.nat.id, name: r.a.name, player: r.a.player, display: r.display }, def: this.def.id }));
    const nx = O.pendingInitials.shift(); if (nx) return O.go('initials', nx);
    O.flow.afterResults();
  },
  draw(r) {
    const def = this.def; bg(r, def.season);
    r.overlay(g => {
      stripeBg(g, r, this.t);
      O.Art.picto(g, 14, 10, def.pictogram, 2, def.season); O.title(g, def.name + ' · RESULTS', 54, 16, 2, { align: 'left' });
      const w = Math.min(r.W - 24, 470), x = r.W / 2 - w / 2, y = 50, rh = Math.min(20, (r.H - 92) / 8);
      O.panel(g, x, y - 4, w, rh * this.res.rows.length + 10);
      this.res.rows.slice(0, 8).forEach((row, i) => {
        const yy = y + i * rh, k = Math.min(1, Math.max(0, (this.t - i * .12) * 4)); if (k <= 0) return;
        if (row.a.human) px.blend(g, .2, 'normal', () => px.rect(g, x + 2, yy, w - 4, rh - 2, '#f2b632'));
        O.text(g, String(row.rank), x + 12, yy + 4, '#ffffff', { scale: 1 });
        if (row.medal) O.Art.medal(g, x + 32, yy + 5, row.medal);
        O.Art.flag(g, x + 44, yy + 3, 18, 12, row.a.nat);
        O.text(g, row.a.name, x + 68, yy + 4, row.a.human ? (row.a.color || '#ffd060') : '#ffffff');
        if (row.a.human) O.HUD.tag(g, x + 68 + E.font.width(row.a.name) + 6, yy + 3, row.a);
        O.text(g, row.display, x + w - 80, yy + 4, '#ffffff', { align: 'right' });
        O.text(g, row.notes.join(' ') + (row.a.notes.includes('DQ') && row.v == null ? '' : ''), x + w - 10, yy + 4, row.notes.includes('WR') ? '#ff6a3a' : '#4fe0a8', { align: 'right' });
      });
      if (this.res.records.includes('WR')) { const k = Math.sin(this.t * 6) > 0; O.title(g, 'WORLD RECORD!', r.W / 2, r.H - 56, 2, { colors: k ? ['#ffffff', '#ffd060', '#ff5a1a'] : ['#fff6d0', '#ffd060', '#f08a2a'] }); }
      O.Prompt.strip(g, r, [['confirm', 'Continue']]);
    });
  }
});

/* ---- initials (§3.2 #13): a letter wheel ---- */
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
O.scene('initials', {
  lock: .5,
  enter(d) { this.d = d; this.def = O.EVENTS[d.def]; this.L = [0, 0, 0]; this.i = 0; this.t = 0; this.inp = game.players[d.row.player || 0] || game.input; },
  update(dt) {
    this.t += dt; const I = this.inp;
    if (I.repeat('up', .3, .1)) this.L[this.i] = (this.L[this.i] + 1) % ABC.length; if (I.repeat('down', .3, .1)) this.L[this.i] = (this.L[this.i] + ABC.length - 1) % ABC.length;
    if (I.pressed('right')) this.i = Math.min(2, this.i + 1); if (I.pressed('left')) this.i = Math.max(0, this.i - 1);
    if (I.pressed('confirm') || I.pressed('action')) { O.sfx('select'); if (this.i < 2) this.i++; else this.done(); }
    if (I.pressed('cancel') && this.i > 0) this.i--;
    const cl = I.clicked && I.clicked(); if (cl && this.okR && O.hit(cl, this.okR)) this.done();
  },
  done() { const ini = this.L.map(k => ABC[k]).join('').trim() || '???'; const pos = O.Records.insert(this.def, Object.assign({}, this.d.row, { ini })); O.toast('TOP 5!', this.def.name + ' · #' + (pos + 1) + ' ' + ini); O.sfx('medal'); const nx = (O.pendingInitials || []).shift(); if (nx) return O.go('initials', nx); O.flow.afterResults(); },
  draw(r) {
    bg(r, this.def.season);
    r.overlay(g => {
      stripeBg(g, r, this.t); O.title(g, 'NEW TOP 5!', r.W / 2, 20, 3);
      O.text(g, this.def.name + ' · ' + this.d.row.display + ' · ' + this.d.row.name, r.W / 2, 60, '#ffffff', { align: 'center' });
      for (let k = 0; k < 3; k++) { const x = r.W / 2 - 60 + k * 44, y = 90, f = k === this.i; O.panel(g, x, y, 32, 40, { border: f ? '#f2b632' : '#3a4070' }); O.text(g, ABC[this.L[k]], x + 16, y + 10, f ? '#ffd060' : '#ffffff', { align: 'center', scale: 3 }); if (f) { O.text(g, '↑', x + 16, y - 12, '#ffd060', { align: 'center' }); O.text(g, '↓', x + 16, y + 44, '#ffd060', { align: 'center' }); } }
      this.okR = [r.W / 2 + 80, 100, 40, 20]; O.panel(g, this.okR[0], this.okR[1], 40, 20); O.text(g, 'OK', this.okR[0] + 20, this.okR[1] + 6, '#ffffff', { align: 'center' });
      O.Prompt.strip(g, r, [['move', 'Letter'], ['confirm', 'Next'], ['cancel', 'Back']], { input: this.inp });
    });
  }
});

/* ---- the medal ceremony (§7.4) ---- */
O.scene('podium', {
  view: 'brawler', lock: .4,
  enter(d) {
    this.res = d.res || (O.meet && O.meet.lastResults); this.def = d.def || O.EVENTS[O.meet.lastEvent]; this.t = 0; this.short = O.meet && O.meet.mode === 'single';
    const top = this.res.rows.filter(r => r.medal).slice(0, 3);
    this.top = top.map((r, i) => ({ row: r, rig: O.makeRig(r.a.nat, 'ceremony'), x: [0, -28, 28][i], h: [24, 16, 10][i], flagZ: 0 }));
    game.lights.enabled = true; game.lights.ambient = .55; O.Comms.reset();
    if (top[0]) { O.Anthem.play(top[0].a.nat); O.Comms.say('P:Please rise for the anthem of ' + top[0].a.nat.name + '.', null, 6); }
    for (const tp of this.top) O.Pose.set(tp.rig, null);
  },
  update(dt) {
    this.t += dt;
    for (const [i, tp] of this.top.entries()) { tp.flagZ = Math.min(60, Math.max(0, (this.t - 2 - i * .3) * 14)); tp.rig.update(dt, { x: tp.x, y: 40, z: tp.h, vx: 0, vy: 0, facing: Math.PI / 2, pose: this.t < 1.5 ? 'wave' : i === 0 ? (this.t > 5 ? 'cheer' : null) : null }); O.Pose.set(tp.rig, this.t > 1.5 && this.t < 3 ? 'bowHead' : this.t > 6 ? 'podiumWave' : null, { t: this.t }); }
    if (this.t > 2 && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) { const c = this.top[0] ? [this.top[0].row.a.nat.colors.a, this.top[0].row.a.nat.colors.b, '#ffffff'] : ['#ffffff']; O.Art.firework(-60 + E.hash2(Math.floor(this.t * 2), 1) * 120, 80, 120 + E.hash2(Math.floor(this.t * 2), 2) * 40, c); O.sfx('firework', { vol: .4 }); }
    if (this.t > 1 && this.t < 1.1) for (const tp of this.top) { O.Art.confetti(tp.x, 40, tp.h + 40, [tp.row.a.nat.colors.a, tp.row.a.nat.colors.b], 20); O.sfx('medal'); O.sfx('camera'); }
    const skip = this.t > 2 && (game.input.pressed('confirm') || game.input.clicked());
    if (skip || this.t > (this.short ? 8 : 13)) { O.music('table'); O.flow.afterPodium(); }
  },
  draw(r) {
    game.focus(0, 40, 30); game.setZoom(2.2);
    O.Stadium.drawVenue(r, { night: this.def.season === 'winter' });
    for (const [i, tp] of this.top.entries()) {
      r.queue(tp.x, 40, 0, g => { const a = r.w(tp.x - 12, 40, tp.h), b = r.w(tp.x + 12, 40, 0); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#e8ecf4'); px.rect(g, a[0], a[1], b[0] - a[0], 2, '#ffffff'); E.font.text(g, String(i + 1), (a[0] + b[0]) / 2, a[1] + 3, '#1a1d2e', { align: 'center', outline: false }); }, { bias: -10 });
      r.actor(tp.x, 40, tp.h, (g, ox, oy) => { tp.rig.draw(g, ox, oy, r.view); if (this.t > 1) O.Art.medal(g, ox, oy - 34 * (tp.rig.o.size || 1.25) + 8, i + 1); });
      const fx = tp.x, fz = tp.flagZ; r.queue(fx, 6, 0, g => { const p = r.w(fx, 6, 0), q = r.w(fx, 6, 70); px.rect(g, p[0], q[1], 1, p[1] - q[1], '#c8ccd8'); const f = r.w(fx, 6, fz); O.Art.flag(g, f[0] + 1, f[1] - 14, 20, 13, tp.row.a.nat, true); });
    }
    game.lights.add(0, 40, 80, 120, 1, { color: '#fff0c8' });
    r.overlay(g => { O.title(g, this.def.name, r.W / 2, 10, 2); if (this.top[0]) O.text(g, 'GOLD · ' + this.top[0].row.a.name + ' · ' + this.top[0].row.display, r.W / 2, 34, '#f2c94c', { align: 'center' }); if (this.t > 2) O.Prompt.strip(g, r, [['confirm', 'Continue']]); });
  }
});

/* ---- the medal table (§3.2 #15) ---- */
O.scene('medals', {
  lock: .5,
  enter() { this.t = 0; O.music('table'); const m = O.meet; this.rows = O.medalTable(m.medals); O.flow.save(); },
  update(dt) { this.t += dt; if (this.t > .5 && (game.input.pressed('confirm') || game.input.clicked())) O.flow.afterMedals(); },
  draw(r) {
    bg(r); const m = O.meet;
    r.overlay(g => {
      stripeBg(g, r, this.t); O.title(g, 'MEDAL TABLE', r.W / 2, 10, 3);
      O.text(g, 'AFTER DAY ' + Math.min(m.day + 1, m.events.length) + ' OF ' + m.events.length, r.W / 2, 42, '#c8d0f0', { align: 'center' });
      const w = Math.min(r.W - 30, 400), x = r.W / 2 - w / 2, y = 54, rh = 15; O.panel(g, x, y - 4, w, rh * 8 + 24);
      [['G', 1], ['S', 2], ['B', 3]].forEach(([l, k], i) => O.Art.medal(g, x + w - 150 + i * 36, y + 4, k));
      O.text(g, 'TOTAL', x + w - 14, y + 2, '#c8d0f0', { align: 'right' });
      this.rows.forEach((row, i) => { const yy = y + 18 + i * rh, mine = m.players.findIndex(p => p.nat === row.nat.id); if (mine >= 0) px.blend(g, .2, 'normal', () => px.rect(g, x + 2, yy - 2, w - 4, rh - 2, '#f2b632'));
        O.text(g, String(i + 1), x + 12, yy + 2, '#ffffff'); O.Art.flag(g, x + 26, yy, 18, 12, row.nat); O.text(g, row.nat.name, x + 50, yy + 2, mine >= 0 ? E.PLAYER_COLORS[mine] : '#ffffff');
        [row.g, row.s, row.b].forEach((v, k) => O.text(g, String(v), x + w - 150 + k * 36, yy + 2, '#ffffff', { align: 'center' })); O.text(g, String(row.t), x + w - 14, yy + 2, '#ffd060', { align: 'right' }); });
      if (m.players.length > 1) { const ys = y + rh * 8 + 26; O.text(g, 'PARTY POINTS: ' + m.players.map((p, k) => 'P' + (k + 1) + ' ' + (m.party[k] || 0)).join('   '), r.W / 2, ys, '#4fe0a8', { align: 'center' }); }
      const tick = (m.lastResults && m.lastResults.rows[0]) ? 'TODAY: ' + O.EVENTS[m.lastEvent].name + ' — GOLD TO ' + m.lastResults.rows[0].a.name + ' (' + m.lastResults.rows[0].a.nat.name + ')   ·   ' : '';
      const tx = r.W - ((this.t * 50) % (E.font.width(tick + tick) + r.W)); O.text(g, tick + tick, tx, r.H - 38, '#ffd060');
      O.Prompt.strip(g, r, [['confirm', 'Continue']]);
    });
  }
});

/* ---- story beats (§7.3) ---- */
O.scene('beat', {
  lock: .5,
  enter(d) {
    this.key = d.key; this.b = BEATS[d.key]; this.t = 0; this.blob = O.Art.mascot(); O.Comms.reset(); O.music('table');
    const m = O.meet, b = this.b;
    let lines = b.lines.slice();
    if (b.halftime) { const tb = O.medalTable(m.medals), mine = tb.findIndex(q => m.players.some(p => p.nat === q.nat.id)), rv = tb.findIndex(q => q.nat.id === m.rival); lines.push(mine >= 0 && mine < rv ? 'M:' + O.COMM_BANK.halftimeTrail[0] : 'M:' + O.COMM_BANK.halftimeLead[0]); }
    if (b.sports) { const res = m.results.hockey, h = res && res.rows.find(q => q.human); lines = [h && h.rank === 1 ? 'M:...Good game. Next Games I\'m bringing two helmets. One for my ego.' : 'M:Good game. You were almost me.']; }
    this.lines = lines; this.li = -1; this.lt = 0;
    this.rigs = (b.who || []).filter(w => w === 'max').map(() => O.portrait(O.NAT.TRB, 'ceremony'));
    if (b.nat) this.rigs = [O.portrait(O.NAT[b.nat], 'ceremony')];
    if (b.final) { O.music(O.Anthem.song(O.NAT[m.rival]), { loop: false }); }
  },
  update(dt) {
    this.t += dt; this.lt -= dt;
    if (this.lt <= 0 && this.li < this.lines.length - 1) { this.li++; O.Comms.say(this.lines[this.li], null, 9); this.lt = this.lines[this.li].length * .07 + 2.4; }
    this.blob.update(dt, { squash: Math.sin(this.t * 6) * .1, look: [1, 0], walk: 0 });
    if (this.t > 1 && (game.input.pressed('confirm') || game.input.clicked())) { if (this.li < this.lines.length - 1) { this.lt = 0; } else this.done(); }
    if (this.li >= this.lines.length - 1 && this.lt < -1.5) this.done();
  },
  done() { if (this.key.startsWith('before')) O.go('dayCard', {}); else O.flow.next(); },
  draw(r) {
    const b = this.b; bg(r, b.final ? 'winter' : null);
    r.overlay(g => {
      stripeBg(g, r, this.t); O.title(g, b.title, r.W / 2, 14, 2);
      if (b.cut === 'mascotJump') { const u = Math.min(1, this.t / 3), x = 40 + u * (r.W - 120), y = 140 - Math.sin(u * Math.PI) * 90 + (u >= 1 ? 10 : 0); px.poly(g, [[20, 150], [r.W * .35, 150], [r.W, 200], [r.W, r.H], [0, r.H]], '#e8f0fb'); g.save(); g.translate(Math.round(x), Math.round(y)); this.blob.draw(g, 0, 0, E.VIEWS.side); g.restore(); if (u >= 1) { px.ell(g, x, y + 2, 16, 6, '#ffffff'); O.text(g, 'FWUMP', x, y - 28, '#3fa8e8', { align: 'center', scale: 2 }); } }
      else if (b.halftime) { const rows = O.medalTable(O.meet.medals).slice(0, 4), x = r.W / 2 - 120; O.panel(g, x, 40, 240, 86); rows.forEach((q, i) => { O.Art.flag(g, x + 10, 48 + i * 18, 18, 12, q.nat); O.text(g, q.nat.name, x + 34, 50 + i * 18, '#ffffff'); O.text(g, q.g + ' / ' + q.s + ' / ' + q.b, x + 230, 50 + i * 18, '#ffd060', { align: 'right' }); }); g.save(); g.translate(r.W - 60, 120); this.blob.draw(g, 0, 0, E.VIEWS.side); g.restore(); for (let i = 0; i < 4; i++) px.disc(g, r.W - 60 + Math.sin(this.t * 3 + i) * 8, 120 + ((this.t * 30 + i * 9) % 30), 1, '#7fd8ff'); }
      else this.rigs.forEach((rg, i) => rg.drawPortrait(g, r.W / 2 - 50 + i * 60, 46, 90, { zoom: 2.5 }));
      if (b.final) { O.Art.flag(g, r.W / 2 - 110, 60, 60, 40, O.NAT[O.meet.players[0] ? O.meet.players[0].nat : 'SUN'], true); O.Art.flag(g, r.W / 2 + 50, 60, 60, 40, O.NAT[O.meet.rival], true); O.title(g, 'VS', r.W / 2, 70, 3); }
      O.Prompt.strip(g, r, [['confirm', 'Continue']]);
    });
  }
});

/* ---- torches and continues (§5.7) ---- */
O.scene('torch', {
  lock: .6,
  enter(d) { this.over = !!d.over; this.t = 0; this.count = 9.99; O.sting(this.over ? 'gameover' : 'fail'); O.Comms.reset(); O.Comms.cue('noqualify', {}, { prio: 9 }); this.m = new O.Menu10([{ label: 'CONTINUE' }, { label: 'GIVE UP' }]); },
  update(dt) {
    this.t += dt; const m = O.meet;
    if (!this.over) { if (this.t > .8 && (game.input.pressed('confirm') || game.input.clicked())) O.flow.startEvent(m.lastEvent, { retry: ++m.retries }); return; }
    this.count -= dt; const k = this.m.update(dt);
    if (k === 0) { m.torches = 3; O.flow.startEvent(m.lastEvent, { retry: ++m.retries }); }
    else if (k === 1 || k === 'cancel' || this.count <= 0) { O.store.set('games', null); O.go('title', {}); }
  },
  draw(r) {
    bg(r); const m = O.meet;
    r.overlay(g => {
      stripeBg(g, r, this.t);
      if (!this.over) { O.title(g, 'YIKES!', r.W / 2, 30, 4); O.text(g, 'NO QUALIFYING MARK', r.W / 2, 80, '#ffffff', { align: 'center', scale: 2 }); const def = O.EVENTS[m.lastEvent]; O.text(g, 'You needed ' + def.measure.fmt(def.measure.qualify[m.difficulty]) + ' (' + m.difficulty + ')', r.W / 2, 104, '#c8d0f0', { align: 'center' });
        O.text(g, 'TORCHES', r.W / 2, 128, '#ffd060', { align: 'center' }); for (let k = 0; k < 3; k++) { const x = r.W / 2 - 30 + k * 30, on = k < m.torches; px.rect(g, x - 2, 150, 5, 16, '#8a6a3a'); if (on) for (let i = 0; i < 3; i++) px.disc(g, x + Math.sin(game.real * 9 + k + i) * 1.5, 146 - i * 3, 4 - i, ['#ff6a1a', '#ffb03a', '#fff0a0'][i]); else px.disc(g, x, 146, 3, '#3a3a44'); }
        O.Prompt.strip(g, r, [['confirm', 'Try again']]); }
      else { O.title(g, 'GAMES OVER', r.W / 2, 30, 4); O.text(g, 'CONTINUE?', r.W / 2, 84, '#ffffff', { align: 'center', scale: 2 }); O.title(g, String(Math.max(0, Math.floor(this.count))), r.W / 2, 104, 5); this.m.draw(g, r.W / 2 - 80, 160, 160); O.Prompt.strip(g, r, [['confirm', 'Select']]); }
    });
  }
});

/* ---- after a single event ---- */
O.scene('singleAfter', {
  menu: true, lock: .5,
  enter() { this.m = new O.Menu10([{ label: 'RETRY' }, { label: 'CHANGE EVENT' }, { label: 'MAIN MENU' }]); this.t = 0; O.music('menu'); },
  update(dt) { this.t += dt; const k = this.m.update(dt); const m = O.meet;
    if (k === 0) { const nm = O.flow.newMeet('single', { events: m.events, players: m.players, practice: m.practice, coop: m.coop }); O.flow.begin(nm); O.go('eventCard', { single: true }); }
    if (k === 1) O.go('single', {}); if (k === 2 || k === 'cancel') O.go('menu', {}); },
  draw(r) { bg(r); r.overlay(g => { stripeBg(g, r, this.t); O.title(g, O.EVENTS[O.meet.events[0]].name, r.W / 2, 20, 2); const w = 240; O.panel(g, r.W / 2 - w / 2 - 8, 70, w + 16, 82); this.m.draw(g, r.W / 2 - w / 2, 78, w); O.Prompt.strip(g, r, [['confirm', 'Select'], ['cancel', 'Back']]); }); },
  back() { O.go('menu', {}); return true; }
});
})();
