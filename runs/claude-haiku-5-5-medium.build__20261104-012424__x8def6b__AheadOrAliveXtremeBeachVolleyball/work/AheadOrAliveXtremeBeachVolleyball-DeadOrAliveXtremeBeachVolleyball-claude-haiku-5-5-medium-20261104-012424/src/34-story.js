/* 34-story: the invitation and character select, and the story events as sequences of steps: lines, choices, flags, and
 * matches. Each event is played by the story scene; a match step returns to the story at the next step. */
G.STORY_ORDER = ['arrival', 'welcome', 'villa', 'rain', 'overheard', 'semi', 'final', 'party'];
G.storyPending = function (where) {
  const st = G.state; if (!st || where !== 'map') return null;
  const f = st.flags;
  if (!f.arrival) return 'arrival';
  if (!f.welcome && st.day === 1 && st.slot === 0) return 'welcome';
  if (st.day === 2 && st.slot === 2 && !f.villa && G.npcsAt('villa', 2).length) return null;
  if (st.day === 3 && st.slot === 1 && !f.rain) return 'rain';
  if (st.day === 4 && st.slot === 1 && !f.semi) return 'semi';
  if (st.day === 5 && st.slot === 1 && !f.final) return 'final';
  if (st.day === 5 && st.slot === 2 && f.final && !f.party) return 'party';
  return null;
};
G.STORY = {
  arrival: [
    { say: ['The seaplane drops onto the water, and six fighters step out onto the planks.'], name: 'ISLA FORTUNA' },
    { say: [G.LINES.sonny.arrival[0], G.LINES.sonny.arrival[1]], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.sonny.pepper[0], G.LINES.sonny.pepper[1]], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { say: ['Villa keys, sunscreen, a schedule. Five days. Three slots each. One Cup.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { fx: () => { G.state.flags.arrival = true; G.state.bag = G.state.bag || {}; G.state.bag.mango_smoothie = 1; } },
    { say: ['Your Morning ends when you leave a place. Sleep ends the day.'], name: 'PEPPER', prof: G.STAFF.pepper.voice, then: 'map' }
  ],
  welcome: [
    { say: ['Allow me to demonstrate! Your partner and you against the Fortuna Cup\'s own host.'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.pepper.tips[0]], name: 'PEPPER', prof: G.STAFF.pepper.voice, tip: 0 },
    { match: 'welcome' },
    { fx: () => { G.state.flags.welcome = true; G.earn(10000, 'tutorial'); } },
    { say: ['Five percent effort, champ. And you still lost. Ha!'], name: 'SONNY', prof: G.STAFF.sonny.voice, then: 'map' }
  ],
  rain: [
    { say: ['LIQUID SUNSHINE, PEOPLE! The sky is taking a shower. The courts are wet. The fun is not!'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { fx: () => { G.state.flags.rain = true; } , then: 'map' }
  ],
  overheard: [
    { say: ['...Yeah, I put the island on the Cup. What could go wrong?'], name: 'SONNY (phone)', prof: G.STAFF.sonny.voice },
    { say: ['Pepper sees you hear it. She says nothing, which is worse.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { choice: ['Your secret\'s safe.', 'Everyone\'s going to hear about this.'], effects: [() => { G.addAff('pepper', 0); G.state.flags.kind = true; G.toast('Pepper nods, once.'); }, () => { G.state.flags.kind = false; G.toast('Sonny goes pale.'); }] },
    { fx: () => { G.state.flags.overheard = true; } , then: 'map' }
  ],
  semi: [
    { say: ['The semifinal is on. The best record on the island is your challenge. SEMIFINAL, it says on the board.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { match: 'semi' },
    { fx: () => { G.state.flags.semi = true; }, then: 'map' }
  ],
  final: [
    { say: ['THE FORTUNA CUP FINAL! The beach in banners! The House has come out to play.'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.pepper.chance[0]], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { match: 'final' },
    { fx: () => { G.state.flags.final = G.state.flags.finalWon ? 'won' : 'lost'; }, then: 'map' }
  ],
  party: [
    { say: ['THE FAREWELL PARTY! Torches, fireworks, and everyone dancing on the sand!'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { fx: () => { G.state.flags.party = true; G.groupPhoto(); G.toast('The party photo is in the album.'); }, goto: 'ending' }
  ]
};
/* the story scene: runs the steps of one event; match steps go to the match and come back here */
G.storyScene = {
  enter(data) {
    this.ev = data.event || (G.storyRun && G.storyRun.ev);
    if (!G.storyRun || G.storyRun.ev !== this.ev || data.fresh) G.storyRun = { ev: this.ev, i: 0 };
    this.box = G.box; this.bg = new E.Backdrop('dusk');
    this.steps = G.STORY[this.ev] || [];
    this.pending = true;
    G.music('island');
    this.next();
  },
  next() {
    const run = G.storyRun;
    while (run.i < this.steps.length) {
      const s = this.steps[run.i++];
      if (s.fx) { s.fx(); continue; }
      if (s.choice) {
        this.box.say(['Your reply?'], { choices: s.choice, onChoice: i => { if (s.effects && s.effects[i]) s.effects[i](); this.next(); } });
        return;
      }
      if (s.say) {
        this.box.say(s.say, { name: s.name, prof: s.prof, onDone: () => this.next() });
        return;
      }
      if (s.match) { return this.playMatch(s.match); }
    }
    const last = this.steps[this.steps.length - 1];
    if (last && last.goto === 'ending') return G.game.go('ending', {});
    const then = last && last.then;
    if (then === 'map') return G.game.go('map', {});
    G.game.go('map', {});
  },
  playMatch(kind) {
    const opts = G.storyMatchOpts(kind);
    G.storyMatchPending = kind;
    G.game.go('match', { opts });
  },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, ''); this.box.draw(r); }
};
/* the matches of the story: the welcome tutorial, the semifinal, the final */
G.storyMatchOpts = function (kind) {
  const st = G.state, me = st.me;
  const chem = (a) => (1 - G.T.chemistry / 2) + G.T.chemistry * (st.aff[a] || 0) / 100;
  if (kind === 'welcome') {
    const pt = G.NPCS.filter(f => f !== me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0))[0];
    return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: .2 }, { id: pt, suit: st.npcWear[pt].suit, base: .4, chem: chem(pt) }],
      [{ id: 'sonny', base: .2 }, { id: 'pepper', base: .35 }]], pointsToWin: 5, setsToWin: 1, difficulty: 'easy', court: 'day', tutorial: true, serveSide: 0, story: kind, autoReceive: true };
  }
  if (kind === 'semi') {
    const best = st.teams.slice().sort((a, b) => ((st.record[b[0] + '+' + b[1]] || [0, 0])[0] - (st.record[b[0] + '+' + b[1]] || [0, 0])[1]) - ((st.record[a[0] + '+' + a[1]] || [0, 0])[0] - (st.record[a[0] + '+' + a[1]] || [0, 0])[1]))[0] || [G.NPCS[1], G.NPCS[2]];
    const pt = st.partner || G.NPCS.find(f => f !== me && !best.includes(f));
    return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: G.dayBase() }, { id: pt, suit: st.npcWear[pt].suit, base: G.dayBase(), chem: chem(pt), aff: st.aff[pt] || 0 }],
      [{ id: best[0], base: .74 }, { id: best[1], base: .74 }]], pointsToWin: 7, setsToWin: 1, difficulty: 'normal', court: 'sunset', serveSide: 0, story: kind };
  }
  // the final: first to 11 against Sonny and Pepper, "The House"
  const pt = st.partner || G.NPCS.find(f => f !== me);
  return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: .66 }, { id: pt, suit: st.npcWear[pt].suit, base: .66, chem: chem(pt), aff: st.aff[pt] || 0 }],
    [{ id: 'sonny', base: .7 }, { id: 'pepper', base: .85 }]], pointsToWin: 11, setsToWin: 1, difficulty: 'normal', court: 'sunset', serveSide: 0, story: kind };
};
/* the invitation: the letter, then the character select */
G.invitationScene = {
  enter() {
    this.bg = new E.Backdrop('dusk'); this.box = G.box; this.stage = 0;
    this.box.say(['You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna. Prize: everything.'], { name: 'S. FORTUNA, ESQ.', color: '#ffd36a', onDone: () => { this.stage = 1; this.box.say(['Who opened it?'], { name: 'SONNY', prof: G.STAFF.sonny.voice, onDone: () => { G.game.go('charselect', {}); } }); } });
  },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, 'THE INVITATION', 'A gold-sealed card'); this.box.draw(r); }
};
G.charselectScene = {
  enter() {
    this.bg = new E.Backdrop('dusk');
    this.items = G.FIGHTERS.map(id => ({ id, cast: G.CAST[id] }));
    this.grid = new G.Grid({ items: this.items, cols: 3, rows: 2, x: 20, y: 54, cw: 98, ch: 68, gap: 8 });
    this.box = G.box;
    this.rigs = {};
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go('invitation', {});
    const hit = this.grid.update(I, dt);
    if (hit && (hit.confirm || hit.click)) this.pick(hit.item.id);
  },
  pick(id) {
    G.newState({ me: id });
    G.game.go('story', { event: 'arrival', fresh: true });
  },
  draw(r) {
    this.bg.draw(r);
    G.screenTitle(r, 'CHOOSE YOUR FIGHTER', 'Stats are 1 to 10');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, it.cast.short, x + 4, y + 4, '#ffd36a', { scale: 1, shadow: '#000' });
      E.font.text(g, G.BRIEF[it.id], x + 4, y + 13, '#9fd3d6', { scale: 1, shadow: '#000' });
      const s = it.cast.stats; ['POW', 'TEC', 'SPD', 'JMP'].forEach((k, i) => { E.font.text(g, k, x + 4, y + 25 + i * 9, '#fff8e8', { scale: 1, shadow: '#000' }); E.ui.bar(g, x + 28, y + 27 + i * 9, 64, 4, s[k] / 10, '#ffd36a'); });
    });
    const it = this.grid.items[this.grid.i];
    if (it) r.overlay(g => { E.ui.box(g, 20, 186, 420 - 40 - 10, 40, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 }); E.font.text(g, it.cast.name + ' · ' + it.cast.epithet, 28, 190, '#ffd36a', { shadow: '#000' }); E.font.text(g, 'Likes: ' + it.cast.tastes.join(', '), 28, 204, '#fff8e8', { shadow: '#000' }); });
    G.promptBar(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};
