/* ---- RESULTS, STORY, CUTSCENES ---- */
const Results = (() => {
  function compute(m) {
    const gk = m.gl.map(g => { const ga = m.stats.goals.filter(x => x.side !== g.side).length, sa = g.saves + ga; return { s: g, sc: .12 * g.saves + 2 * ((sa ? g.saves / sa : 1) - .85) * 10, line: g.saves + ' SAVES  ' + (sa ? Math.round(g.saves / sa * 100) : 100) + '%', goalie: true, side: g.side }; });
    const sk = m.sk.map(s => ({ s, sc: 3 * s.stats.goals + 2 * s.stats.assists + .5 * s.stats.bigHits + 1.5 * s.stats.fightsWon + .3 * s.stats.shots, line: s.stats.goals + 'G ' + s.stats.assists + 'A  ' + s.stats.bigHits + ' HITS', side: s.side }));
    const all = sk.concat(gk).sort((a, b) => b.sc - a.sc); const win = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    if (win >= 0) all.sort((a, b) => (b.sc + (b.side === win ? 1.2 : 0)) - (a.sc + (a.side === win ? 1.2 : 0)));
    m.res = { stars: all.slice(0, 3), win };
  }
  function record(m) {
    if (HUB) return; const r = Save.get().records; for (const s of m.sk) { if (s.ctrl.kind !== 'human') continue; r.hardest = Math.max(r.hardest, s.stats.topShot); r.mostGoals = Math.max(r.mostGoals, s.stats.goals); r.fights += s.stats.fightsWon; }
    r.biggestHit = Math.max(r.biggestHit, m.maxImp || 0); r.kabooms += m.stats.kabooms[0]; Save.write();
  }
  return { compute, record };
})();
Bus.on('big_hit', e => { const m = Match.cur(); if (m && e.a.ctrl.kind === 'human') m.maxImp = Math.max(m.maxImp || 0, e.imp); });

const Story = (() => {
  const chap = id => STORY.chapters[id - 1];
  const SETS = {
    locker: { floor: [120, 100, 80], wall: ['#4a5a6a', '#2a3a4a'], props: [['bench', 3, 6], ['bench', 8, 6]], bg: '#1a2230', amb: .7 },
    bonfire: { floor: [220, 232, 245], wall: ['#2a3a4a', '#1a2a3a'], props: [['campfire', 8, 6], ['pine', 1, 3], ['pine', 14, 3]], bg: '#0e1430', amb: .5, snow: true },
    dim: { floor: [70, 72, 78], wall: ['#3a3e44', '#26292e'], props: [['barrel', 2, 4], ['crate', 14, 4]], bg: '#0c1210', amb: .45 },
    neon: { floor: [210, 200, 220], wall: ['#e0389a', '#18b5b0'], props: [['sign', 4, 3], ['sign', 12, 3]], bg: '#2a1a3a', amb: .75 },
    tunnel: { floor: [50, 48, 60], wall: ['#2a2a3a', '#ffd36a'], props: [['torch', 3, 3], ['torch', 13, 3]], bg: '#080810', amb: .5 }
  };
  const maps = {};
  function setMap(id) {
    if (maps[id]) return maps[id]; const S_ = SETS[id], rows = []; for (let r = 0; r < 12; r++) { let s = ''; for (let c = 0; c < 18; c++) s += r < 3 || c === 0 || c === 17 ? '#' : '.'; rows.push(s); }
    return (maps[id] = new E.TileMap({ rows, legend: { '#': 1, '.': { floor: 'x' } }, types: { 1: { h: 40, face: 'plaster', side: S_.wall[0], top: S_.wall[1] } }, floorTex: (x, y) => { const n = E.hash2(x | 0, y | 0) * 8; const f = S_.floor; return [f[0] + n, f[1] + n, f[2] + n]; }, outside: S_.bg }));
  }
  const rigs = {};
  const rigFor = (name) => rigs[name] || (rigs[name] = Rigs.portrait(name));
  sc_cut();
  function sc_cut() {
    Scenes.sc.cutscene = { view: 'brawler', input: HOCKEY_KEYS, touch: [], expand: true, res: 'ps1',
      enter(d) {
        this.d = d; const ch = chap(d.id), lines = (d.kind === 'pre' ? ch.pre : ch.post).slice(); this.ch = ch; this.set = SETS[d.kind === 'pre' ? ch.set : 'locker'];
        if (d.kind === 'post' && ch.id === 5) this.set = SETS.tunnel; this.map = setMap(d.kind === 'pre' ? ch.set : (ch.id === 5 ? 'tunnel' : (ch.set)));
        this.set = SETS[d.kind === 'pre' ? ch.set : ch.set]; this.lines = lines; this.i = 0; this.speaker = null; this.skip = 0; this.cast = []; this.tl = 0; this.done = false; Synth.music(ch.set === 'bonfire' ? 'pond' : ch.set === 'tunnel' ? 'final' : ch.set === 'neon' ? 'mall' : ch.set === 'dim' ? 'grind' : 'locker'); game.weather = this.set.snow ? { kind: 'snow', amount: .4 } : null;
        for (const [n] of lines) if (!this.cast.includes(n)) this.cast.push(n); this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', speed: 38 }); game.cam.bounds = null; game.setZoom(1.5); game.focus(144, 150, 20); game.lights.enabled = true; game.lights.ambient = this.set.amb;
        this.next(); },
      exit() { game.weather = null; game.setZoom(1); },
      next() {
        if (this.i >= this.lines.length) { if (this.d.kind === 'pre' && !this.chosen) return this.choose(); return this.finish(); }
        const [who, text] = this.lines[this.i++]; this.speaker = who; const vk = Rigs.VOICE_OF[who] || 'gen'; this.talk.voice = Synth.dialogVoice(vk); const isLast = this.d.kind === 'pre' && this.i === this.lines.length;
        this.talk.say(text.replace(/\{\$tacticLine\}/, '').replace(/\s+$/, ''), { name: who, portrait: rigFor(who), onDone: () => this.next(), color: '#fff' });
      },
      choose() {
        this.chosen = true; const ch = this.ch; this.speaker = 'DUNNY'; this.talk.voice = Synth.dialogVoice('marge');
        this.talk.say(['Pick the plan, Captain.'], { name: 'MARGE', portrait: rigFor('MARGE'), choices: ch.tactic.map(s => s.toUpperCase()), onChoice: (i) => { Save.get().choices[ch.id] = i; Save.write(); this.pick = i; this.talk.voice = Synth.dialogVoice('dunny'); this.speaker = 'DUNNY'; this.talk.say(['We keep it simple, Coach. We ' + ch.tacticLine[i]], { name: 'DUNNY', portrait: rigFor('DUNNY'), onDone: () => { this.talk.voice = Synth.dialogVoice('marge'); this.speaker = 'MARGE'; this.talk.say([ch.id === 1 ? "Warm-up's on. Then we drill the Drillers." : 'Good. Now go win it.'], { name: 'MARGE', portrait: rigFor('MARGE'), onDone: () => this.finish() }); } }); } });
      },
      finish() { if (this.done) return; this.done = true; const d = this.d, ch = this.ch; if (d.kind === 'pre') game.go('pregame', { id: ch.id, choice: Save.get().choices[ch.id] || 0 }, { fade: 'wipe' }); else Story.afterPost(ch.id); },
      update(dt) {
        this.tl += dt; this.talk.update(dt); const I = game.input; if (I.down('cancel')) { this.skip += dt; if (this.skip >= 1) { this.talk.close(); this.i = this.lines.length; this.chosen = true; if (this.d.kind === 'pre' && Save.get().choices[this.ch.id] == null) Save.get().choices[this.ch.id] = 0; this.finish(); } } else this.skip = Math.max(0, this.skip - dt * 2);
        if (this.set.snow) {} },
      draw(r) {
        const map = this.map; r.sky([this.set.bg, this.set.bg]); map.drawFloor(r); map.queueWalls(r); this.cast.forEach((n, i) => { const x = 40 + (i + .5) * (208 / Math.max(1, this.cast.length)) , y = 130 + (i % 2) * 10, rig = rigFor(n); const hot = n === this.speaker; rig.update(1 / 60, { x, y, z: 0, vx: 0, vy: 0, facing: PI / 2 + (x < 144 ? -.3 : .3), pose: hot ? 'hips' : undefined, expr: hot ? 'shout' : undefined }); r.shadow(x, y, 7, .35); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy - (hot ? Math.abs(Math.sin(this.tl * 8)) * 1.5 : 0), E.charView(r.view))); });
        for (const [name, cx, cy] of this.set.props) { try { r.prop(name, cx * 16, cy * 16, 0, { light: true, size: 1.4 }); } catch (e) {} }
        game.lights.add(144, 100, 60, 240, .8, { color: this.set.snow ? '#ff9a3a' : '#ffe8c0' });
        this.talk.draw(r); r.overlay(g => { UI.txt(g, this.ch.title.toUpperCase() + (this.d.kind === 'post' ? ' - AFTER' : ''), 8, 8, UI.GOLD, { scale: 1 }); if (this.skip > 0) { UI.txt(g, 'SKIPPING', r.W - 8, 8, '#ccc', { align: 'right' }); px.rect(g, r.W - 60, 18, 52, 4, '#05070f'); px.rect(g, r.W - 60, 18, Math.round(52 * this.skip), 4, UI.GOLD); } else Glyphs.text(g, 'HOLD {deke} SKIP', r.W - 8, 12, { align: 'right', color: '#9ab' }); if (this.d.kind === 'pre' && this.chosen === undefined) {} }); }
    };
  }
  function afterPost(id) { const ch = chap(id); if (id === 5) { game.go('credits', null, { fade: 'white' }); } else game.go('storymap', null, { fade: 'wipe' }); }
  function begin(id) { game.go('cutscene', { id, kind: 'pre' }, { fade: 'wipe' }); }
  function startMatch(id, choice) {
    const ch = chap(id), diff = ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(S('difficulty'));
    const cfg = { home: 'muskrats', away: ch.rival, arena: ch.arena, periods: ch.id === 5 ? 3 : 3, periodLen: ch.len, ot: ch.ot, shootout: true, intros: true, humans: [{ side: 0, input: game.input, seat: 0 }], story: ch, storyChoice: choice, seed: id * 1000 + (Save.get().attempts && Save.get().attempts[id] || 0), showcase: id === 4, tactic: [null, null] };
    Save.get().attempts = Save.get().attempts || {}; Save.get().attempts[id] = (Save.get().attempts[id] || 0) + 1; Save.write();
    game.go('match', { cfg, ret: 'storymap', kind: 'story', story: ch }, { fade: 'iris' });
  }
  function complete(m, ch) {
    const sv = Save.get(); const st = Objectives.stars(); sv.stars[ch.id] = Math.max(sv.stars[ch.id] || 0, st); sv.unlocked = Math.max(sv.unlocked, Math.min(5, ch.id + 1)); sv.chapter = Math.max(sv.chapter, Math.min(5, ch.id + 1)); if (ch.id === 5) sv.cups = true; Save.write(); return st;
  }
  // ---- scenes: storymap, pregame ----
  Scenes.sc.storymap = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.kill(); this.t = 0; this.i = clamp(Save.get().unlocked - 1, 0, 4); Synth.music('menu'); Idle.reset(); this.bus = 0; this.targetBus = this.i; },
    update(dt) {
      this.t += dt; const I = game.input; if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const sv = Save.get(), n = 5; if (I.pressed('left')) { this.i = (this.i + n - 1) % n; Synth.sfx('mv'); } if (I.pressed('right')) { this.i = (this.i + 1) % n; Synth.sfx('mv'); }
      this.bus += (this.i - this.bus) * Math.min(1, dt * 4); const c = I.clicked && I.clicked(); if (c) this.stops.forEach((s, k) => { if (Math.abs(c[0] - s[0]) < 20 && Math.abs(c[1] - s[1]) < 26) { this.i = k; this.pick(); } });
      const p = UI.pointer(); if (p && this.stops && (Math.abs(p[0] - (this.lp || [0, 0])[0]) > 1)) { this.lp = [p[0], p[1]]; this.stops.forEach((s, k) => { if (Math.abs(p[0] - s[0]) < 20 && Math.abs(p[1] - s[1]) < 26 && this.i !== k) { this.i = k; Synth.sfx('mv'); } }); }
      if (I.pressed('confirm')) this.pick(); if (I.pressed('cancel')) game.go('title');
    },
    pick() { if (this.i + 1 > Save.get().unlocked) { Synth.sfx('bonk'); return; } Synth.sfx('fanfare'); Story.begin(this.i + 1); },
    draw(r) {
      r.sky(['#0e1838', '#3a5a8a', '#c8d8f0']); r.overlay(g => {
        px.rect(g, 0, 140, r.W, r.H - 140, '#e8f0f8'); for (let i = 0; i < 40; i++) px.dot(g, (i * 53) % r.W, 142 + (i * 17) % (r.H - 142), '#c8d8e8'); px.rect(g, 0, 168, r.W, 22, '#4a4e58'); for (let x = 0; x < r.W; x += 20) px.rect(g, x + ((game.time * 20) | 0) % 20, 178, 10, 2, '#f0d860');
        UI.title(g, 'THE CUP RUN', r.W / 2, 8, 3); const sv = Save.get(); this.stops = [];
        for (let k = 0; k < 5; k++) { const ch = STORY.chapters[k], x = 40 + k * ((r.W - 80) / 4), y = 120, locked = k + 1 > sv.unlocked, foc = k === this.i;
          px.rect(g, x - 1, y, 2, 30, '#5a4a3a'); UI.box(g, x - 22, y - 28, 44, 28, { border: foc ? UI.GOLD : '#6a7aaa', bg: locked ? ['#222', '#111'] : ['#2a3a6a', '#141c3c'] }); if (!locked) Logo.draw(g, ch.rival, x, y - 14, 18); else UI.txt(g, '?', x, y - 18, '#667', { align: 'center', scale: 2 });
          for (let s = 0; s < 3; s++) UI.txt(g, '★', x - 10 + s * 10, y + 2, (sv.stars[ch.id] || 0) > s ? '#ffd36a' : '#334', { align: 'center' }); UI.txt(g, ch.id + '', x, y - 38, foc ? UI.GOLD : '#9ab', { align: 'center' }); this.stops.push([x, y - 12]); }
        const bx = 40 + this.bus * ((r.W - 80) / 4); px.rect(g, bx - 14, 160, 28, 12, '#e8b43a'); px.rect(g, bx - 12, 156, 20, 6, '#8ac8f0'); px.disc(g, bx - 8, 173, 3, '#222'); px.disc(g, bx + 8, 173, 3, '#222'); UI.txt(g, 'MUK', bx, 162, '#5a3a22', { align: 'center', font: 'tiny' });
        const ch = STORY.chapters[this.i]; UI.box(g, 20, 190, r.W - 40, 36, { border: UI.GOLD, alpha: .95 }); UI.txt(g, ch.id + '. ' + ch.title.toUpperCase() + '  -  ' + ARENAS[ch.arena].name + ' vs ' + TEAM[ch.rival].name, r.W / 2, 194, UI.GOLD, { align: 'center' }); UI.txt(g, ch.blurb, r.W / 2, 205, '#cfe', { align: 'center' }); UI.txt(g, ch.objectives.map(o => (sv.stars[ch.id] || 0) > 0 ? '★ ' + o.text : '- ' + o.text).join('   '), r.W / 2, 215, '#9ab', { align: 'center', font: 'tiny' });
        UI.legend(g, r, ['← ▸ CHOOSE', '{pass} PLAY', '{deke} BACK']); });
    }
  };
  Scenes.sc.pregame = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter(d) { this.d = d; this.ch = chap(d.id); this.i = 0; this.t = 0; const opts = [{ label: 'FACE OFF', sub: 'PLAY BALL', onPick: () => Story.startMatch(d.id, d.choice) }]; if (d.id === 1 && !d.warm) opts.unshift({ label: 'WARM-UP', sub: 'DRILLS 1-3', onPick: () => game.go('practice', { warm: true, ret: 'pregame', id: d.id, choice: d.choice }) }); this.tiles = new UI.Tiles(opts, { cols: opts.length, w: 100, h: 40, y: 168, onCancel: () => game.go('storymap') }); this.tiles.i = opts.length - 1; Backdrop.ensure(this.ch.arena, 'muskrats', this.ch.rival); },
    update(dt) { this.t += dt; Backdrop.step(dt); this.tiles.update(dt); },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.7)'); const ch = this.ch; UI.title(g, 'CHAPTER ' + ch.id, r.W / 2, 10, 2); UI.txt(g, ch.title.toUpperCase(), r.W / 2, 32, UI.GOLD, { align: 'center', scale: 2 }); Logo.draw(g, 'muskrats', r.W / 2 - 60, 80, 36); UI.txt(g, 'VS', r.W / 2, 74, '#fff', { align: 'center', scale: 2 }); Logo.draw(g, ch.rival, r.W / 2 + 60, 80, 36); UI.txt(g, ARENAS[ch.arena].name, r.W / 2, 108, '#cfe', { align: 'center' });
      ch.objectives.forEach((o, i) => UI.txt(g, '- ' + o.text, r.W / 2, 124 + i * 11, '#ffe8a0', { align: 'center' })); UI.txt(g, 'PLAN: ' + ch.tactic[Save.get().choices[ch.id] || 0].toUpperCase(), r.W / 2, 160, '#9ab', { align: 'center', font: 'tiny' }); this.tiles.draw(g, r); UI.legend(g, r, ['{pass} SELECT', '{deke} BACK']); }); }
  };
  return { begin, startMatch, complete, afterPost, chap, SETS };
})();
