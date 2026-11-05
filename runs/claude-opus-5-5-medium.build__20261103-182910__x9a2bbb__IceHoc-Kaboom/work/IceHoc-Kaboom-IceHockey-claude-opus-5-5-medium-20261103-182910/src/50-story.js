/* ---- Story: THE CUP RUN's flow. Map -> pre-game cutscene (a choice) -> [warm-up] -> card -> game -> results -> post-game -> map ---- */
const Story = (() => {
  let cur = null;   // { n, attempt, choice: {...} }
  const chapter = n => STORY.CHAPTERS[n - 1];
  function open(n) { cur = { n, attempt: (cur && cur.n === n ? cur.attempt + 1 : 1), choice: Object.assign({}, Save.data.story.choices[n] || {}) }; game.go('cutscene', { id: chapter(n).pre, next: 'pregame' }, { fade: 'wipe' }); }
  function choose(effect) { if (!cur) return; Object.assign(cur.choice, effect); Save.data.story.choices[cur.n] = cur.choice; Save.write(); }
  function config(n, extra = {}) {
    const ch = chapter(n), c = (cur && cur.choice) || {};
    return Object.assign({ home: 'muskrats', away: ch.rival, arena: ch.arena, periods: ch.periods, len: ch.len, ot: ch.ot, shootout: ch.shootout, showcase: ch.showcase, boss: ch.boss,
      chapter: n, diffStep: ch.diffStep || 0, tactic: c.tactic || null, louLoose: c.lou === 'loose', louIce: c.lou === 'ice', huntBear: c.bear === 'hunt', doris: c.doris || 'early',
      objectives: ch.objectives.filter(o => o.on), seed: n * 1000 + (cur ? cur.attempt : 1), humans: [{ input: game.input, team: 0 }], flood: true,
      onOver: m => game.go('results', { m, story: n }, { fade: 'iris' }) }, extra);
  }
  function play(n) { const cfg = config(n); game.go('match', cfg, { fade: 'iris' }); }
  /** after the game: stars, unlocks, then the post-game cutscene (a win) or Marge's pep talk (a loss) */
  function finish(m, n) {
    const ch = chapter(n), won = m.winner === 0, stars = ch.objectives.map(o => o.id === 'win' ? won : !!(m.objectives.find(x => x.id === o.id) || {}).done);
    const before = Save.stars(), old = Save.data.story.stars[n] || [false, false, false];
    if (won || stars.some(Boolean)) Save.data.story.stars[n] = old.map((v, i) => v || stars[i]);
    if (won) { Save.data.story.chapter = Math.max(Save.data.story.chapter, Math.min(5, n + 1)); if (n === 5) Save.data.story.done = true; }
    Save.write();
    const unlocks = STORY.UNLOCKS.filter(([k]) => before < k && Save.stars() >= k).map(u => u[2]);
    return { won, stars, unlocks };
  }
  return { open, choose, config, play, finish, chapter, get cur() { return cur; }, set cur(v) { cur = v; } };
})();

/* ---- the cutscene runner: sets, staged characters, dialog with live portraits and babble, choices; hold cancel to skip ---- */
scenes.cutscene = (() => {
  let data = null, cut = null, i = 0, talk = null, cast = [], skipT = 0, waiting = false, cupT = -1, t = 0, choiceShown = false;
  const C = Rink.C;
  const SETS = {
    locker: { floor: ['#6a5a48', '#5a4a3a'], wall: '#7a5636', trim: '#4a3020', light: '#ffd8a0', amb: .55 },
    'locker-dark': { floor: ['#3a3a40', '#2e2e34'], wall: '#44484e', trim: '#2a2c30', light: '#c8ffd0', amb: .4 },
    rink: { ice: true, light: '#ffffff', amb: .7 }, pond: { snow: true, light: '#ff9a3a', amb: .45 }, mall: { floor: ['#e0d8ea', '#d0c8dc'], wall: '#3a3048', trim: '#e0389a', light: '#ffe0ff', amb: .7, neon: true },
    tunnel: { floor: ['#2a2420', '#221c18'], wall: '#141414', trim: '#d9a520', light: '#ffffff', amb: .5 }
  };
  function stage() {
    cast = cut.cast.map((id, k) => { const c = Rigs.cast(id), n = cut.cast.length, x = 160 + (k - (n - 1) / 2) * 34, y = 100 + (k % 2) * 10; return { id, c, x, y, facing: PI / 2, pose: null, expr: null, hidden: id === 'glitterman' && cut.steps.some(s => s.enter === 'glitterman') }; });
  }
  function next() {
    while (i < cut.steps.length) {
      const st = cut.steps[i++];
      if (Array.isArray(st)) { const [who, text, expr] = st; return say(who, text, expr); }
      if (st.pose) { const a = cast.find(c => c.id === st.pose[0]); if (a) a.pose = st.pose[1]; }
      if (st.enter) { const a = cast.find(c => c.id === st.enter); if (a) { a.hidden = false; a.x = 300; game.tween(a, { x: 230 }, .8); } }
      if (st.exit) { const a = cast.find(c => c.id === st.exit); if (a) game.tween(a, { x: 360 }, .8); }
      if (st.cup) { cupT = 0; A.sfx('kaboom'); A.sfx('horn'); }
      if (st.choice) return choice(st.choice);
    }
    done();
  }
  function say(who, text, expr) {
    const a = cast.find(c => c.id === who), c = (a && a.c) || Rigs.cast(who);
    for (const x of cast) x.expr = null; if (a) { a.expr = expr || 'smile'; a.c.rig._talk = true; }
    talk.voice = Synth.dialogVoice(c.voice); waiting = true;
    const vars = { tacticLine: (Story.cur && Story.cur.choice.line) || "skate like there's no tomorrow." };
    talk.say(text, { name: c.name, portrait: c.rig, portraitOpts: { zoom: 3.2, turn: .5 }, vars, onDone: () => { waiting = false; if (a) a.c.rig._talk = false; next(); } });
    Synth.babble(text.replace(/\{[^}]*\}/g, ''), c.voice, { maxSyl: 18, vol: .5 });
  }
  function choice(id) {
    const ch = STORY.CHOICES[id], c = Rigs.cast(ch.who); waiting = true; choiceShown = true;
    talk.voice = Synth.dialogVoice(c.voice);
    talk.say(ch.text, { name: c.name, portrait: c.rig, choices: ch.options.map(o => o[0]), onChoice: k => { Story.choose(ch.options[k][1]); A.sfx('pick'); }, onDone: () => { waiting = false; next(); } });
  }
  function done() {
    if (data.onDone) return data.onDone();
    if (data.next === 'pregame') return game.go('pregame', { n: Story.cur.n }, { fade: 'wipe' });
    if (data.next === 'ending') return game.go('credits', { ending: true }, { fade: 'white' });
    if (data.next) return game.go(data.next, data.nextData || null, { fade: 'wipe' });
    game.go('storymap', null, { fade: 'wipe' });
  }
  function skip() {
    // the default choice applies; any choice still ahead is taken as its first option
    for (let k = i; k < cut.steps.length; k++) if (cut.steps[k].choice && !choiceShown) Story.choose(STORY.CHOICES[cut.steps[k].choice].options[0][1]);
    talk.close(); done();
  }
  return {
    view: 'brawler', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) {
      data = d || { id: 'ch1-pre' }; cut = STORY.CUTS[data.id]; i = 0; skipT = 0; cupT = -1; t = 0; choiceShown = false;
      talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', nameColor: '#ffd36a' });
      stage(); Synth.music(cut.music || 'locker'); Cam.apply('brawler', 1.25); game.cam.smooth = 0; game.focus(160, 100, 18); L.enabled = true; L.ambient = (SETS[cut.set] || SETS.locker).amb;
      game.weather = cut.set === 'pond' ? { kind: 'snow', amount: .5 } : null;
      next();
    },
    exit() { game.weather = null; },
    update(dt) {
      t += dt; Glyphs.sync();
      if (UI.anyRepeat && game.players.some(p => p.down('cancel'))) { skipT += dt; if (skipT > 1) { skipT = 0; return skip(); } } else skipT = 0;
      talk.update(dt);
      for (const a of cast) a.c.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: a.facing, pose: cupT >= 0 && a.id === 'dunny' ? 'cheer' : a.pose, expr: a.expr });
      if (cupT >= 0) { cupT += dt; if (Math.floor(cupT * 4) !== Math.floor((cupT - dt) * 4) && cupT < 3) { P.explosion(160 + (RNG.fx() - .5) * 80, 90, 40, .8, { shake: 0 }); for (let k = 0; k < 6; k++) P.bits(160, 100, 40, 6, ['#ff3a3a', '#ffd040', '#3aff8a', '#5a8aff']); } }
      game.focus(160, 100, 18);
    },
    draw(r) {
      const set = SETS[cut.set] || SETS.locker, view = Draw.view(r);
      r.sky(['#05070c', '#0a0e18', '#101828']);
      // the set: a floor, a back wall, benches or snow, lights
      r.decal(g => {
        const P0 = (x, y, z) => r.w(x, y, z);
        const fl = [P0(20, 40, 0), P0(300, 40, 0), P0(300, 170, 0), P0(20, 170, 0)];
        px.poly(g, fl, set.ice ? '#dfeaf4' : set.snow ? '#e8f0fa' : set.floor[0]);
        if (!set.ice && !set.snow) for (let x = 20; x < 300; x += 16) { const a = P0(x, 40, 0), b = P0(x, 170, 0); px.line(g, a[0], a[1], b[0], b[1], set.floor[1], 1); }
        if (set.ice) { const a = P0(160, 40, 0), b = P0(160, 170, 0); px.line(g, a[0], a[1], b[0], b[1], '#c83a2a', 2); }
        const wl = [P0(20, 40, 0), P0(300, 40, 0), P0(300, 40, 80), P0(20, 40, 80)];
        px.poly(g, wl, set.ice ? '#6a4a2e' : set.snow ? '#1a2a4a' : set.wall);
        if (set.snow) { for (let k = 0; k < 9; k++) { const p = P0(30 + k * 32, 40, 0); px.poly(g, [[p[0], p[1] - 46 - (k % 3) * 8], [p[0] - 12, p[1]], [p[0] + 12, p[1]]], '#1a3a2a'); } }
        else if (!set.ice) {
          for (let k = 0; k < 8; k++) { const a = P0(34 + k * 34, 40, 30), b = P0(56 + k * 34, 40, 76); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], E.shade(set.wall, -.15)); px.rect(g, a[0], b[1], b[0] - a[0], 2, set.trim); }
          const bn = [P0(30, 50, 10), P0(290, 50, 10), P0(290, 62, 10), P0(30, 62, 10)]; px.poly(g, bn, set.trim);
          if (cut.set.startsWith('locker')) { const s = P0(160, 40, 60); E.font.text(g, cut.set === 'locker' ? 'MUKLUK FALLS MUSKRATS' : 'VISITORS', s[0], s[1], '#ffe08a', { align: 'center', outline: false }); }
          if (set.neon) for (let k = 0; k < 3; k++) { const s = P0(70 + k * 90, 40, 64); px.rect(g, s[0] - 20, s[1] - 4, 40, 10, '#1a1028'); E.font.text(g, ['MEGAMALL', 'FOOD', 'SALE!'][k], s[0], s[1] - 2, ['#ff5ab0', '#5affe0', '#ffe070'][k], { font: 'tiny', align: 'center', outline: false }); }
        } else { const s = P0(160, 40, 54); E.font.text(g, "THE OL' ICEBOX", s[0], s[1], '#ffe08a', { align: 'center', outline: false }); }
      });
      for (const a of cast) { if (a.hidden) continue; r.shadow(a.x, a.y, 7, .35); r.actor(a.x, a.y, 0, (g, ox, oy) => a.c.rig.draw(g, ox, oy, view)); }
      if (cupT >= 0) r.queue(cast[0].x, cast[0].y, 40, g => { const [x, y] = r.w(cast[0].x, cast[0].y, 38); px.rect(g, x - 3, y - 2, 6, 6, '#e8c040'); px.rect(g, x - 5, y - 6, 10, 4, '#ffe070'); px.rect(g, x - 1, y + 4, 2, 3, '#c8a030'); px.dot(g, x - 3, y - 5, '#ffffff'); }, { emissive: true });
      L.add(160, 90, 90, 220, 1, { color: set.light });
      talk.draw(r);
      r.overlay(g => {
        const sf = Hud.safe(r);
        if (skipT > 0) { const k = Math.min(1, skipT); for (let a = 0; a < k * TAU; a += .2) px.dot(g, sf.x1 - 20 + Math.cos(a - PI / 2) * 8, sf.y0 + 12 + Math.sin(a - PI / 2) * 8, UI.GOLD); }
        Glyphs.text(g, 'HOLD {cancel} SKIP', sf.x1 - 34, sf.y0 + 8, '#9fb0c8', { align: 'right' });
        if (Story.cur && data.id.endsWith('pre')) UI.text(g, 'CHAPTER ' + Story.cur.n + ': ' + Story.chapter(Story.cur.n).title.toUpperCase(), sf.x0, sf.y0 + 4, UI.GOLD);
      });
    }
  };
})();

/* ---- the pre-game card: matchup, barn, objectives with star slots, the tactic; warm-up drills in chapter 1 ---- */
scenes.pregame = (() => {
  let n = 1, menu = null;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      n = (d && d.n) || 1;
      const items = [{ label: 'FACE OFF!', sub: 'Play the game', pick: () => Story.play(n) }];
      if (n === 1) items.push({ label: 'WARM UP', sub: "Coach Marge's drills 1-3", pick: () => Drills.warmup(n) });
      items.push({ label: 'BACK TO MAP', sub: '', pick: () => game.go('storymap') });
      menu = new UI.Tiles(items, { layout: (r, its) => UI.grid(its.length, its.length, r.W / 2, r.H - 78, 112, 40, 10), cancel: () => game.go('storymap') });
      Synth.music('locker');
    },
    update(dt) { Glyphs.sync(); menu.update(dt); },
    draw(r) {
      const ch = Story.chapter(n), home = TEAMS.muskrats, away = TEAMS[ch.rival], c = Story.cur ? Story.cur.choice : {};
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        UI.title(g, 'CHAPTER ' + n, r.W / 2, 10, 2); UI.title(g, ch.title.toUpperCase(), r.W / 2, 28, 3);
        for (const [t, x] of [[home, r.W / 2 - 100], [away, r.W / 2 + 100]]) { const spr = LOGOS.sprite(t.logo); px.sprite(g, spr, x - 24, 62, { scale: 2 }); UI.text(g, t.short, x, 114, '#ffffff', { align: 'center' }); }
        UI.title(g, 'VS', r.W / 2, 80, 2);
        UI.text(g, ARENAS[ch.arena].name.toUpperCase() + '  ·  '.replace('·', '-') + ch.periods + ' x ' + U.mmss(ch.len), r.W / 2, 128, UI.MUTED, { align: 'center' });
        const stars = Save.data.story.stars[n] || [];
        ch.objectives.forEach((o, k) => UI.text(g, (stars[k] ? '★ ' : '- ') + o.text, r.W / 2 - 90, 142 + k * 11, stars[k] ? UI.GOLD : '#ffffff'));
        const tac = c.tactic ? (c.tactic === 'finesse' ? 'TACTIC: CLEAN AND FAST' : 'TACTIC: MEAN AND LOUD') : c.lou ? (c.lou === 'loose' ? 'LOU IS LOOSE' : 'LOU KEEPS IT ON THE ICE') : c.bear ? (c.bear === 'hunt' ? 'HUNT THE BEAR' : 'IGNORE THE BEAR') : c.doris ? 'DORIS PLAYS ' + c.doris.toUpperCase() : '';
        if (tac) UI.text(g, tac, r.W / 2, 178, '#c8a0ff', { align: 'center' });
        menu.draw(g, r);
        UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      });
    }
  };
})();

/* ---- the story map: a snowy highway, the bus, five town stops with their stars ---- */
scenes.storymap = (() => {
  let menu = null, bus = 0;
  const STOPS = [[.12, .62], [.3, .38], [.5, .6], [.7, .36], [.88, .55]];
  const mapBg = new E.Backdrop({ sky: ['#0e1a34', '#2a4a7a', '#8ab0d8'], moon: { x: .82, y: .16, r: 10, color: '#f0f4ff' }, stars: 70, starsY: .5,
    layers: [{ kind: 'mountains', color: '#5a7aaa', y: .48, height: .26, parallax: 0 }, { kind: 'hills', color: '#7a9ac8', y: .55, height: .12, parallax: 0 }, { kind: 'forest', color: '#24443a', y: .6, height: .1, parallax: 0 }] });
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() {
      const open = Save.data.story.chapter;
      menu = new UI.Tiles(STORY.CHAPTERS.map((ch, k) => ({ label: String(k + 1), ch, disabled: k + 1 > open, pick: () => Story.open(k + 1), draw: (g, x, y, w, h, f) => stopDraw(g, x, y, w, h, f, k) })),
        { start: Math.min(4, open - 1), layout: r => STOPS.map(([u, v]) => ({ x: Math.round(r.W * u - 22), y: Math.round(r.H * v - 22), w: 44, h: 44 })), cancel: () => game.go('title', { menu: true }) });
      bus = menu.i; Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); bus += (menu.i - bus) * Math.min(1, dt * 3); if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) {
      mapBg.draw(r);
      r.overlay(g => {
        // snowy hills, the highway between the stops
        for (let i = 0; i < 60; i++) px.dot(g, (i * 97) % r.W, (i * 53) % Math.round(r.H * .45), i % 3 ? '#8aa8d8' : '#ffffff');   // stars over the highway
        for (let k = 0; k < 3; k++) { const y0 = r.H * (.6 + k * .1), cols = [['#c8d8ec', '#b8cce4'], ['#dde8f6', '#ccdcee'], ['#eef4fc', '#e0eaf6']][k], t2 = E.tones(cols[0]); px.poly(g, [[0, r.H], [0, y0], ...Array.from({ length: 9 }, (_, i) => [r.W * i / 8, y0 + Math.sin(i * 1.7 + k) * 10]), [r.W, r.H]], cols[0]);
          for (let x = 0; x < r.W; x += 2) for (let y = Math.round(y0 + 8); y < r.H; y += 2) { const h = E.hash2(x + k * 7, y); if (h > .7) px.dot(g, x + (y % 2), y, h > .95 ? t2.hi : cols[1]); } }
        for (let i = 0; i < STOPS.length - 1; i++) { const [a, b] = [STOPS[i], STOPS[i + 1]]; px.line(g, r.W * a[0], r.H * a[1], r.W * b[0], r.H * b[1], '#5a5a6a', 5); px.line(g, r.W * a[0], r.H * a[1], r.W * b[0], r.H * b[1], '#ffe070', 1); }
        for (let i = 0; i < 14; i++) { const x = (i * 53) % r.W, y = r.H * .5 + (i * 29) % (r.H * .4); px.poly(g, [[x, y - 14], [x - 6, y], [x + 6, y]], '#2a5a3a'); }
        menu.draw(g, r);
        const k = Math.floor(bus), u = bus - k, a = STOPS[k], b = STOPS[Math.min(4, k + 1)], bx = r.W * lerp(a[0], b[0], u), by = r.H * lerp(a[1], b[1], u) - 30;
        px.rect(g, bx - 12, by - 6, 24, 11, '#e8b43a'); px.rect(g, bx - 10, by - 4, 6, 4, '#bfe8ff'); px.rect(g, bx - 2, by - 4, 6, 4, '#bfe8ff'); px.rect(g, bx + 6, by - 4, 4, 4, '#bfe8ff'); px.disc(g, bx - 7, by + 5, 2.5, '#141418'); px.disc(g, bx + 7, by + 5, 2.5, '#141418');
        const ch = STORY.CHAPTERS[menu.i], sf = Hud.safe(r);
        UI.title(g, 'THE CUP RUN', r.W / 2, sf.y0, 3);
        UI.panel(g, r.W / 2 - 150, sf.y0 + 30, 300, 50);
        UI.text(g, 'CHAPTER ' + ch.n + ': ' + ch.title.toUpperCase(), r.W / 2, sf.y0 + 35, UI.GOLD, { align: 'center' });
        UI.text(g, ARENAS[ch.arena].name + ' vs ' + TEAMS[ch.rival].name, r.W / 2, sf.y0 + 47, '#ffffff', { align: 'center' });
        UI.text(g, ch.n > Save.data.story.chapter ? 'LOCKED: win chapter ' + (ch.n - 1) + ' first' : ch.mech, r.W / 2, sf.y0 + 59, UI.MUTED, { align: 'center' });
        UI.text(g, 'STARS ' + Save.stars() + '/15', sf.x1, sf.y0 + 4, UI.GOLD, { align: 'right' });
        UI.legend(g, r, [['confirm', 'PLAY'], ['cancel', 'BACK']]);
      });
    }
  };
  function stopDraw(g, x, y, w, h, f, k) {
    const ch = STORY.CHAPTERS[k], locked = k + 1 > Save.data.story.chapter, t = TEAMS[ch.rival], stars = Save.data.story.stars[k + 1] || [];
    UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : '#5a6a8a', bg: locked ? ['#2a2a34', '#1a1a20'] : ['#1a2a48', '#0e1830'] });
    if (!locked) px.sprite(g, LOGOS.sprite(t.logo), x + w / 2 - 12, y + 3, { scale: 1 }); else UI.text(g, 'LOCKED', x + w / 2, y + 12, '#6a6a7a', { align: 'center', font: { font: 'tiny' } });
    for (let i = 0; i < 3; i++) E.font.text(g, '★', x + w / 2 - 12 + i * 9, y + 31, stars[i] ? UI.GOLD : '#3a4458', { outline: false });
    UI.text(g, String(k + 1), x + 4, y + 2, f ? UI.GOLD : '#ffffff');
  }
})();
