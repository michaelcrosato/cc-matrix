/* Story, profile, saves, class, hub round, attract, and about. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  const D = E.Input.DEFAULT;
  G.INPUT = {
    up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
    confirm: D.confirm, cancel: D.cancel,
    breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'],
    jump: ['Space', 'Pad0'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
    paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
    stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
    stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown']
  };
  /* Class keeps the menu actions, then breath, catchL, catchR so half a keyboard lands on F G H and . / , */
  G.CLASS_INPUT = {
    up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
    confirm: D.confirm, cancel: D.cancel,
    breath: ['KeyF', 'Pad6', 'Pad7'], catchL: ['KeyG', 'Pad4'], catchR: ['KeyH', 'Pad5'],
    more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2']
  };

  G.seen = {};
  G.phase = 'menu';
  G.left = 0;
  G.subtitle = '';
  G.driver = null;
  G.attracting = false;
  G.inSession = false;
  G.idleSteps = 0;
  G.queue = null;
  G.chainAfter = null;
  G.hubOver = false;
  G.hubReported = false;
  G.ghosts = [];
  G.ABOUT = /*ABOUT*/null;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  G.freshProfile = function (slot) {
    return {
      slot: slot || 0,
      name: G.NICKS[0],
      nickIndex: 0,
      look: { hair: 0, skin: 1, top: 0, bottom: 0 },
      instructor: 'Birch',
      day: 1,
      sessions: 0,
      played: {},
      bestPct: {},
      minutes: 0,
      unlocks: [],
      spine: 71,
      spineDays: [71],
      holdSpine: 71,
      plateau: false,
      suggestion: 'stork',
      freePlay: false,
      ending: false,
      duelWon: false,
      flags: { arrival: false, tareDay: false, games: false },
      pauses: 0,
      forceAge: 0
    };
  };
  G.profile = G.freshProfile(0);

  G.lookColors = function (p) {
    p = p || G.profile;
    const L = G.LOOKS, k = p.look || {};
    return {
      hair: L.hair[k.hair] || L.hair[0],
      skin: L.skin[k.skin] || L.skin[0],
      top: L.top[k.top] || L.top[0],
      bottom: L.bottom[k.bottom] || L.bottom[0]
    };
  };

  G.bestText = function (id, tier) {
    const row = G.profile && G.profile.played[id];
    const s = row && row[tier];
    return s ? ('Best ' + s + ' star' + (s > 1 ? 's' : '')) : '';
  };

  function discMean() {
    const names = Object.keys(G.DISC);
    let o = 0;
    names.forEach(function (n) {
      const ids = G.DISC[n];
      let s = 0;
      ids.forEach(function (id) {
        const row = G.profile.played[id] || {};
        s += Math.max(row[1] || 0, row[2] || 0) * 33.3;
      });
      o += s / ids.length;
    });
    return o / names.length;
  }
  G.rawAge = function () {
    const p = G.profile;
    if (p.forceAge) return p.forceAge;
    let age = Math.min(71, Math.round(78 - 0.58 * discMean()));
    if (p.duelWon) age -= 1;
    return age;
  };
  G.spineAge = function () {
    const p = G.profile;
    if (p.day === 3 && p.plateau) return p.holdSpine;
    return G.rawAge();
  };

  G.refreshUnlocks = function () {
    const p = G.profile;
    G.UNLOCKS.forEach(function (u) {
      if (p.minutes >= u.at && p.unlocks.indexOf(u.id) < 0) {
        p.unlocks.push(u.id);
        try { G.sting('unlock'); } catch (e) { /* quiet */ }
      }
    });
  };
  G.hasUnlock = function (id) { return !!(G.profile && G.profile.unlocks && G.profile.unlocks.indexOf(id) >= 0); };
  G.grantAll = function () {
    G.profile.minutes = Math.max(G.profile.minutes, 40);
    G.UNLOCKS.forEach(function (u) { if (G.profile.unlocks.indexOf(u.id) < 0) G.profile.unlocks.push(u.id); });
  };

  G.tierFor = function (id) {
    const p = G.profile;
    const t1 = (p.played[id] && p.played[id][1]) || 0;
    if (p.freePlay || p.day >= 4 || t1 >= 2) return 2;
    return 1;
  };
  G.unlocked = function (id) {
    if (G.profile.freePlay) return true;
    const day = Math.min(3, G.profile.day || 1);
    const list = G.UNLOCK_DAY[day] || G.UNLOCK_DAY[3];
    return list.indexOf(id) >= 0;
  };

  G.award = function (id, tier, stars, pct) {
    if (G.attracting || G.inSession) return;
    const p = G.profile;
    if (!p.played[id]) p.played[id] = {};
    p.played[id][tier] = Math.max(p.played[id][tier] || 0, stars);
    if (!p.bestPct[id]) p.bestPct[id] = {};
    p.bestPct[id][tier] = Math.max(p.bestPct[id][tier] || 0, pct || 0);
    const mul = (G.dev && G.dev.v && G.dev.v.minutesMul) || 1;
    const bonus = p.suggestion === id ? 1.5 : 1;
    const pay = 2 * (1 + 0.25 * stars) * bonus * mul;
    p.minutes += pay;
    p.spine = G.rawAge();
    G.refreshUnlocks();
    if (G.game && !G.attracting && !G.inSession) {
      try { G.game.saves.autosave(); } catch (e) { /* a visit with no slot yet */ }
    }
  };

  G.setDriver = function (name) { G.driver = name || null; };

  G.finishNow = function (stars) {
    const s = G.session;
    if (!s || !s.act) return;
    const gates = s.act.stars || [.35, .65, .9];
    s.pct = stars >= 3 ? gates[2] : stars >= 2 ? gates[1] : stars >= 1 ? gates[0] : 0;
    if (s.fam) s.fam.done = true;
    s.finish();
  };

  G.deal = function (rng) {
    const a = ['stork', 'candle', 'squat', 'push'];
    const b = ['step', 'hoop'];
    const c = ['slalom', 'jog'];
    const pick = function (list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; };
    return [pick(a), pick(b), pick(c)];
  };

  function go(name, data) { if (G.game) G.game.go(name, data || {}); }

  function ensureTalk() {
    if (G.talk || !G.game) return G.talk;
    const t = new E.Dialog(G.game, {
      speed: 1e6, lines: 3, place: 'bottom', color: '#20404c', nameColor: '#14a8c8',
      bg: ['#ffffff', '#eaf6f8'], border: '#2cc6e6', voice: null
    });
    t.shadow = null;
    G.talk = t;
    return t;
  }
  function say(name, text, o) {
    o = o || {};
    const t = ensureTalk();
    if (!t) return;
    t.speed = 1e6;
    t.shadow = null;
    t.say(text, {
      name: name || 'Tare',
      voice: function (ch, i, box) { try { G.babble(box && box.name, ch); } catch (e) { /* no voice bus */ } },
      choices: o.choices || null,
      onChoice: o.onChoice || null,
      onDone: o.onDone || null,
      auto: o.auto || 0
    });
    G.phase = 'talk';
  }

  function songFor(scene) {
    if (scene === 'island' || scene === 'free') return 'island';
    if (scene === 'evening' || scene === 'duel' || scene === 'ending') return 'dusk';
    if (scene === 'games') return 'festival';
    if (scene === 'bed') return 'yoga';
    return 'studio';
  }

  function base(extra) {
    return Object.assign({
      pausable: true,
      camera: { zoom: false },
      input: G.INPUT,
      view: 'brawler'
    }, extra);
  }

  function hudName(r, title, sub) {
    r.overlay(function (g) {
      E.font.title(g, title, r.W / 2, 18, { scale: 2, align: 'center', colors: ['#ffffff', '#8fd3f4', '#14a8c8'] });
      if (sub) G.text(g, sub, r.W / 2, 48, '#20404c', 1, 'center');
    });
  }

  /* ---------- screens ---------- */
  const scenes = {};

  scenes.title = base({
    enter() {
      G.phase = 'menu';
      G.idleSteps = 0;
      try { G.playSong('studio'); } catch (e) { /* quiet */ }
      const cont = !!(G.game && G.game.saves && G.game.saves.any);
      scenes.title._pills = new G.Pills([
        { label: 'New Member', id: 'new' },
        { label: 'Continue', id: 'cont', disabled: !cont },
        { label: 'Local Class', id: 'class' },
        { label: 'About', id: 'about' }
      ], { i: 0 });
    },
    update(dt) {
      G.phase = 'menu'; G.left = 0;
      const it = scenes.title._pills.update(G.game.input);
      if (!it) return;
      if (it.id === 'new') go('slots');
      else if (it.id === 'cont') {
        const latest = G.game.saves.latest();
        if (latest) { G.game.saves.load(latest.slot); go(G.profile.freePlay ? 'free' : 'bungalow'); }
      } else if (it.id === 'class') go('class');
      else if (it.id === 'about') go('about');
      void dt;
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, 'Spine Wee', 'A five-day stay');
      r.overlay(function (g) {
        try { G.drawTare(g, r.W / 2, r.H / 2 - 10, 1.4, 'happy', G.game.time * 3); } catch (e) { /* scale still */ }
        G.text(g, 'Institute for Gentle Improvement', r.W / 2, 64, '#20404c', 1, 'center');
      });
      scenes.title._pills.draw(r);
      G.prompt(null, r, 'confirm', 'Choose');
    }
  });

  scenes.slots = base({
    enter() {
      G.phase = 'menu';
      const list = G.game.saves.list().filter(function (s) { return s.slot !== 'auto'; });
      scenes.slots._rows = list;
      scenes.slots._pills = new G.Pills(list.map(function (s) {
        const label = s.empty ? ('Slot ' + (s.slot + 1) + '  Empty') : ('Slot ' + (s.slot + 1) + '  ' + (s.place || 'Saved'));
        return { label: label, id: s.slot, damaged: !!s.damaged, empty: !!s.empty };
      }), { i: 0 });
    },
    update() {
      G.phase = 'menu';
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(1 / 120); return; }
      const it = scenes.slots._pills.update(G.game.input);
      if (!it) return;
      if (it.damaged) {
        say('Tare', 'This save looks tired. I will not open it. We can start clean.', { onDone: function () { G.game.saves.erase(it.id); go('slots'); } });
        return;
      }
      if (it.empty) { G.profile = G.freshProfile(it.id); go('member'); }
      else { G.game.saves.load(it.id); go(G.profile.freePlay ? 'free' : 'bungalow'); }
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, 'Member card', 'Three cards. I do not mix them.');
      scenes.slots._pills.draw(r);
      if (G.talk) G.talk.draw(r);
    }
  });

  scenes.member = base({
    enter() {
      G.phase = 'menu';
      const L = G.LOOKS;
      scenes.member._pills = new G.Pills([
        { label: 'Hair', id: 'hair', n: L.hair.length },
        { label: 'Skin', id: 'skin', n: L.skin.length },
        { label: 'Top', id: 'top', n: L.top.length },
        { label: 'Bottom', id: 'bottom', n: L.bottom.length },
        { label: 'Name', id: 'name', n: G.NICKS.length },
        { label: 'This is me', id: 'ok' }
      ], { i: 5 });
    },
    update() {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(1 / 120); return; }
      G.phase = 'menu';
      const pills = scenes.member._pills;
      const I = G.game.input;
      const it0 = pills.items[pills.i];
      if (it0 && it0.id !== 'ok' && (I.pressed('left') || I.pressed('right'))) {
        const dir = I.pressed('right') ? 1 : -1;
        const p = G.profile;
        if (it0.id === 'name') {
          p.nickIndex = (p.nickIndex + dir + G.NICKS.length) % G.NICKS.length;
          p.name = G.NICKS[p.nickIndex];
        } else {
          p.look[it0.id] = (p.look[it0.id] + dir + it0.n) % it0.n;
        }
      }
      const it = pills.update(I);
      if (it && it.id === 'ok') {
        G.profile.flags.arrival = false;
        go('arrival');
      }
    },
    draw(r) {
      G.paintRoom(r, 'day');
      const p = G.profile;
      hudName(r, p.name, 'The card is you.');
      const pills = scenes.member._pills;
      pills.items[0].label = 'Hair  ' + G.LOOKS.hair[p.look.hair];
      pills.items[4].label = 'Name  ' + p.name;
      pills.draw(r);
    }
  });

  scenes.arrival = base({
    enter() {
      G.profile.flags.arrival = true;
      say('Tare', [
        'You have been gifted a five-day stay at the Institute for Gentle Improvement.',
        "The card isn't signed. It only says: 'You know why.'"
      ], {
        onDone: function () {
          say('Tare', 'Birch is very tall. Alder was a tree more recently. Both are nice.', {
            choices: ['Birch', 'Alder'],
            onChoice: function (i) {
              G.profile.instructor = i === 1 ? 'Alder' : 'Birch';
              go('bungalow');
            }
          });
        }
      });
    },
    update(dt) {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(dt); return; }
      G.phase = 'menu';
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, 'Arrival', '');
      r.overlay(function (g) { try { G.drawTare(g, 70, r.H / 2, 1.6, 'shocked', G.game.time * 2); } catch (e) { /* quiet */ } });
      if (G.talk) G.talk.draw(r);
    }
  });

  scenes.bungalow = base({
    enter() {
      G.phase = 'menu';
      G.profile.sessions = G.profile.sessions || 0;
      const day = G.profile.day;
      if (G.GUIDE[day]) G.profile.suggestion = G.GUIDE[day][0];
      scenes.bungalow._pills = new G.Pills([{ label: 'Begin the day', id: 'go' }], { i: 0 });
      try { G.playSong('studio'); G.sting('day'); } catch (e) { /* quiet */ }
      if (!G.attracting && !G.inSession && G.game) {
        try { G.game.saves.autosave(); } catch (e) { /* quiet */ }
      }
    },
    update() {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(1 / 120); return; }
      G.phase = 'menu';
      const it = scenes.bungalow._pills.update(G.game.input);
      if (!it) return;
      if (G.profile.day === 4 && !G.profile.flags.tareDay) go('tare');
      else go('body');
    },
    draw(r) {
      G.paintRoom(r, 'day');
      const day = G.profile.day;
      hudName(r, 'Day ' + day, (G.LINES.days[day - 1] || '').slice(0, 42));
      r.overlay(function (g) {
        G.text(g, 'Spine Age ' + G.spineAge(), 12, 70, '#14a8c8', 1);
        G.text(g, G.profile.instructor + ' is outside.', 12, 84, '#20404c', 1);
        try { G.drawGerald(g, r.W - 40, r.H / 2, 1.2, G.hasUnlock('friend')); } catch (e) { /* quiet */ }
      });
      scenes.bungalow._pills.draw(r);
    }
  });

  scenes.tare = base({
    enter() {
      G.profile.flags.tareDay = true;
      G.phase = 'menu';
      scenes.tare._pills = new G.Pills([{ label: 'Read the scale', id: 'read' }], { i: 0 });
    },
    update() {
      G.phase = 'menu';
      const it = scenes.tare._pills.update(G.game.input);
      if (!it) return;
      say('Tare', "Three grams. It's the feelings. They're dense.", { onDone: function () { go('body'); } });
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, "Tare's Day", 'Press to read me.');
      r.overlay(function (g) { try { G.drawTare(g, r.W / 2, r.H / 2, 2, 'judging', 0); } catch (e) { /* quiet */ } });
      if (!(G.talk && G.talk.open)) scenes.tare._pills.draw(r);
      if (G.talk) G.talk.draw(r);
    }
  });

  scenes.body = base({
    enter(d) {
      scenes.body.t = 0;
      scenes.body.step = 'still';
      scenes.body.q = (d && d.q) || (G.profile.day - 1) % G.LINES.questions.length;
      scenes.body._pills = null;
      G.phase = 'auto';
      G.left = 9;
      try { G.playSong('yoga'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(dt); return; }
      const b = scenes.body;
      if (b.step === 'ask') {
        G.phase = 'menu'; G.left = 0;
        const it = b._pills.update(G.game.input);
        if (!it) return;
        const q = G.LINES.questions[b.q];
        const ducks = 'Today you weigh 11.4 ducks. That is a normal number of ducks.';
        const remark = G.LINES.remarks[b.q % G.LINES.remarks.length];
        const sug = G.profile.suggestion && G.ACTS[G.profile.suggestion];
        say('Tare', [q.q, ducks, remark, sug ? ("Today's suggestion: " + sug.name) : 'The reading is ready.'], {
          onDone: function () {
            if (G.profile.day >= 5 && !G.profile.flags.games) go('games');
            else go('island');
          }
        });
        b.step = 'talk';
        return;
      }
      b.t += dt;
      G.phase = 'auto';
      const need = b.step === 'still' ? 5 : 4;
      G.left = Math.max(0, need - b.t);
      if (b.step === 'talk') return;
      if (b.step === 'still' && b.t >= 5) { b.step = 'lean'; b.t = 0; }
      else if (b.step === 'lean' && b.t >= 4) {
        b.step = 'ask';
        const q = G.LINES.questions[b.q];
        b._pills = new G.Pills(q.a.map(function (label, i) { return { label: label, id: i }; }), { i: 0 });
        G.phase = 'menu';
      }
    },
    draw(r) {
      G.paintRoom(r, 'day');
      const b = scenes.body;
      hudName(r, 'Body check', b.step === 'ask' ? G.LINES.questions[b.q].q : 'Please stand still.');
      r.overlay(function (g) {
        try { G.drawTare(g, r.W / 2, 70, 1.3, 'neutral', 0); } catch (e) { /* quiet */ }
        G.text(g, 'Ducks, not pounds.', r.W / 2, 100, '#5f7f8a', 1, 'center');
      });
      if (b._pills && b.step === 'ask') b._pills.draw(r);
      if (G.talk) G.talk.draw(r);
    }
  });

  function islandPills() {
    const items = [];
    G.ACT_IDS.forEach(function (id) {
      if (!G.unlocked(id)) return;
      const act = G.ACTS[id];
      const tier = (G.profile.day < 4 && !G.profile.freePlay) ? 1 : G.tierFor(id);
      items.push({ label: act.name, id: id, tier: tier });
    });
    if (!G.profile.freePlay) items.push({ label: 'Bed', id: 'bed' });
    let focus = 0;
    if (!G.profile.freePlay && G.profile.sessions >= 3) focus = items.length - 1;
    else if (G.GUIDE[G.profile.day] && G.profile.sessions < 3) {
      const want = G.GUIDE[G.profile.day][G.profile.sessions];
      const at = items.findIndex(function (it) { return it.id === want; });
      if (at >= 0) focus = at;
    }
    return new G.Pills(items, { i: focus });
  }

  function openPlay(it, extra) {
    const tier = it.tier || 1;
    go('play', Object.assign({
      id: it.id, tier: tier, trial: false, driver: G.driver, seed: (G.profile.day * 100 + G.profile.sessions * 7 + tier) >>> 0
    }, extra || {}));
  }

  scenes.island = base({
    view: 'threequarter',
    enter() {
      G.phase = 'menu';
      scenes.island._pills = islandPills();
      try { G.playSong('island'); } catch (e) { /* quiet */ }
    },
    update() {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(1 / 120); return; }
      G.phase = 'menu';
      const it = scenes.island._pills.update(G.game.input);
      if (!it) return;
      if (it.id === 'bed') go('evening');
      else openPlay(it);
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, 'The island', 'Day ' + G.profile.day + '   ' + G.profile.sessions + ' of 3');
      r.overlay(function (g) {
        G.text(g, 'Spine Age ' + G.spineAge(), 8, 64, '#14a8c8', 1);
        G.text(g, Math.floor(G.profile.minutes) + ' min', r.W - 70, 64, '#5f7f8a', 1);
      });
      scenes.island._pills.draw(r);
    }
  });

  scenes.free = base({
    view: 'threequarter',
    enter() {
      G.profile.freePlay = true;
      G.phase = 'menu';
      scenes.free._pills = islandPills();
      scenes.free._pills.items.push({ label: 'Title', id: 'title' });
      try { G.playSong('island'); } catch (e) { /* quiet */ }
    },
    update() {
      G.phase = 'menu';
      const it = scenes.free._pills.update(G.game.input);
      if (!it) return;
      if (it.id === 'title') go('title');
      else if (it.id !== 'bed') openPlay(it);
    },
    draw(r) {
      G.paintRoom(r, 'day');
      hudName(r, 'Free Play', 'I stop counting days.');
      scenes.free._pills.draw(r);
    }
  });

  function doneSession() {
    const s = G.session;
    if (!s) { go('island'); return; }
    if (!s.trial && !G.attracting && !G.inSession) G.profile.sessions = (G.profile.sessions || 0) + 1;
    if (G.queue && G.queue.length) { const id = G.queue.shift(); go('play', { id: id, tier: G.profile.day >= 4 ? 2 : 1, limit: 20, skipToPlay: true, autoNext: true, driver: G.driver || 'good', trial: !!G.attracting }); return; }
    if (G.chainAfter) { const fn = G.chainAfter; G.chainAfter = null; fn(); return; }
    if (G.profile.freePlay) go('free');
    else go('island');
  }

  scenes.play = base({
    enter(d) {
      d = d || {};
      const id = d.id || 'stork';
      const act = G.ACTS[id] || G.ACTS.stork;
      if (act && act.view && G.game) { try { G.game.setView(act.view); } catch (e) { /* keep the studio */ } }
      if (d.driver) G.driver = d.driver;
      G.session = new G.Session({
        id: id,
        tier: d.tier || 1,
        trial: !!d.trial || !!G.attracting,
        cheat: !!d.cheat || !!G.attracting,
        driver: d.driver || G.driver,
        seed: d.seed || 1,
        limit: d.limit,
        skipToPlay: !!d.skipToPlay,
        autoNext: !!d.autoNext,
        classMode: !!d.classMode,
        seats: d.seats
      });
      scenes.play._hold = 0.4;
      scenes.play._pills = new G.Pills([{ label: 'Begin', id: 'begin' }], { i: 0 });
      scenes.play._done = new G.Pills([{ label: 'Done', id: 'done' }, { label: 'Again', id: 'again' }], { i: 0 });
      try { G.playSong(act.family === 'step' ? 'stepA' : act.family === 'jog' ? 'jog' : act.family === 'slalom' ? 'ski' : act.family === 'laundry' ? 'laundry' : act.family === 'tray' ? 'tray' : 'yoga'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      const s = G.session;
      if (!s) return;
      if (G.driver && s.phase !== 'results') s.driver = G.driver;
      s.update(dt);
      if (s.phase === 'card') {
        G.phase = 'menu';
        const it = scenes.play._pills.update(G.game.input);
        if (it && it.id === 'begin') s.begin();
        return;
      }
      if (s.phase === 'results') {
        if (s.autoNext || G.attracting) {
          scenes.play._hold -= dt;
          G.phase = 'auto';
          G.left = Math.max(0, scenes.play._hold);
          if (scenes.play._hold <= 0) {
            scenes.play._hold = 0.4;
            doneSession();
          }
          return;
        }
        G.phase = 'menu';
        const it = scenes.play._done.update(G.game.input);
        if (!it) return;
        if (it.id === 'again') { s.again(); scenes.play._pills.i = 0; }
        else doneSession();
        return;
      }
      G.phase = s.phase === 'play' ? 'play' : 'auto';
    },
    draw(r) {
      const s = G.session;
      if (s && s.act && s.act.view) { /* view already applied on enter */ }
      try { G.drawActivity(r, s); } catch (e) { G.paintRoom(r, 'day'); }
      if (s && s.phase === 'card') scenes.play._pills.draw(r);
      if (s && s.phase === 'results' && !s.autoNext && !G.attracting) scenes.play._done.draw(r);
      if (G.dev && G.dev.panel) G.dev.draw(r);
    }
  });

  scenes.evening = base({
    enter() {
      G.phase = 'menu';
      scenes.evening._pills = new G.Pills([{ label: 'Good night', id: 'bed' }], { i: 0 });
      try { G.playSong('dusk'); } catch (e) { /* quiet */ }
    },
    update() {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(1 / 120); return; }
      G.phase = 'menu';
      const it = scenes.evening._pills.update(G.game.input);
      if (it) go('bed');
    },
    draw(r) {
      G.paintRoom(r, 'dusk');
      hudName(r, 'Evening', 'The lamps admit they were nervous.');
      scenes.evening._pills.draw(r);
    }
  });

  scenes.bed = base({
    enter() {
      scenes.bed.t = 0;
      G.phase = 'auto';
      G.left = 2;
      try { G.playSong('yoga'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      scenes.bed.t += dt;
      G.phase = 'auto';
      G.left = Math.max(0, 2 - scenes.bed.t);
      if (scenes.bed.t < 2) return;
      const p = G.profile;
      if (p.day === 2) { p.holdSpine = G.rawAge(); p.plateau = true; }
      if (p.day === 3) p.plateau = false;
      p.spine = G.spineAge();
      if (p.spineDays.length < 8) p.spineDays.push(p.spine);
      if (p.day < 5) {
        p.day += 1;
        p.sessions = 0;
        if (G.GUIDE[p.day]) p.suggestion = G.GUIDE[p.day][0];
        go('bungalow');
      } else go('games');
    },
    draw(r) {
      G.paintRoom(r, 'dusk');
      hudName(r, 'Bed', 'Sleep well.');
    }
  });

  scenes.games = base({
    enter() {
      G.profile.flags.games = true;
      G.queue = ['stork', 'step', 'slalom'];
      G.chainAfter = function () { go('duel'); };
      G.driver = G.driver || 'good';
      const id = G.queue.shift();
      go('play', { id: id, tier: 1, limit: 20, skipToPlay: true, autoNext: true, driver: G.driver, trial: false, seed: 11 });
    },
    update() { G.phase = 'auto'; },
    draw(r) { G.paintRoom(r, 'day'); hudName(r, 'Gentle Games', 'Bunting is a mood.'); }
  });

  scenes.duel = base({
    enter() {
      G.driver = G.driver || 'good';
      scenes.duel.gert = 1;
      scenes.duel.done = false;
      G.session = new G.Session({ id: 'candle', tier: 2, limit: 90, skipToPlay: true, driver: G.driver, seed: 19, trial: false });
      try { G.playSong('dusk'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      const s = G.session;
      if (!s) return;
      s.driver = G.driver;
      s.update(dt);
      const flame = (s.fam && s.fam.flame) || 0;
      if (s.playTime > 75 && flame > 0.5) scenes.duel.gert = Math.max(0.3, scenes.duel.gert - dt * 0.35);
      G.phase = s.phase === 'play' ? 'play' : (s.phase === 'results' ? 'auto' : 'auto');
      G.left = Math.max(0, (s.limit || 90) - (s.playTime || 0));
      if (s.phase === 'results' && !scenes.duel.done) {
        scenes.duel.done = true;
        const win = flame >= scenes.duel.gert;
        G.profile.duelWon = !!win;
        G.profile.ending = true;
        G.profile.spine = G.rawAge();
        go('ending');
      }
    },
    draw(r) {
      G.paintRoom(r, 'dusk');
      try { G.drawActivity(r, G.session); } catch (e) { /* room stands */ }
      r.overlay(function (g) {
        G.text(g, 'Grand Stillness', 8, 6, '#20404c', 1);
        G.text(g, 'Gertrude ' + Math.round(scenes.duel.gert * 100), r.W - 90, 6, '#5f7f8a', 1);
      });
    }
  });

  scenes.ending = base({
    enter() {
      G.profile.ending = true;
      const age = G.spineAge();
      const band = age <= 24 ? G.LINES.endingAge.young : age <= 45 ? G.LINES.endingAge.mid : G.LINES.endingAge.late;
      const pages = [band].concat(G.LINES.ending);
      say('Tare', pages, {
        onDone: function () {
          G.profile.freePlay = true;
          go('free');
        }
      });
      try { G.playSong('ending'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      if (G.talk && G.talk.open) { G.phase = 'talk'; G.talk.update(dt); return; }
      G.phase = 'menu';
      if (G.profile.freePlay) go('free');
    },
    draw(r) {
      G.paintRoom(r, 'dusk');
      hudName(r, 'Spine Age ' + G.spineAge(), '');
      if (G.talk) G.talk.draw(r);
    }
  });

  const ATTRACT = ['island', 'body', 'stork', 'sun', 'candle', 'squat', 'push', 'lunge', 'step', 'hoop', 'jog', 'slalom', 'tray', 'laundry', 'class', 'duel'];

  G.startAttract = function () {
    if (G.inSession || G.attracting) return;
    G.attracting = true;
    G.attractI = 0;
    G.driver = 'expert';
    if (G.game && G.game.input) G._attractMouse = G.game.input.mouse.t;
    go('attract');
  };

  scenes.attract = base({
    enter() {
      G.attracting = true;
      G.driver = 'expert';
      scenes.attract.t = 0;
      scenes.attract.kind = ATTRACT[G.attractI % ATTRACT.length];
      const id = scenes.attract.kind;
      if (G.ACTS[id]) {
        G.session = new G.Session({ id: id, tier: id === 'stork' ? 2 : 1, limit: 12, skipToPlay: true, trial: true, cheat: true, driver: 'expert', autoNext: true, seed: 3 + G.attractI });
      } else G.session = null;
      try { G.playSong('island'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      G.phase = 'auto';
      const s = G.session;
      if (s) {
        s.update(dt);
        G.left = Math.max(0, (s.limit || 12) - (s.playTime || 0));
        if (s.phase === 'results') scenes.attract.t += dt;
      } else {
        scenes.attract.t += dt;
        G.left = Math.max(0, 8 - scenes.attract.t);
      }
      if ((s && s.phase === 'results' && scenes.attract.t > 1.2) || (!s && scenes.attract.t > 8)) {
        G.attractI = (G.attractI + 1) % ATTRACT.length;
        go('attract');
      }
    },
    draw(r) {
      if (G.session) { try { G.drawActivity(r, G.session); } catch (e) { G.paintRoom(r, 'day'); } }
      else G.paintRoom(r, 'day');
      r.overlay(function (g) {
        G.text(g, 'DEMO', 8, 8, '#e0553a', 1);
        G.text(g, 'Spine Wee', r.W - 78, 8, '#14a8c8', 1);
        G.text(g, G.LINES.attract[G.attractI % G.LINES.attract.length], 8, r.H - 28, '#20404c', 1);
      });
    }
  });

  scenes.class = base({
    input: G.CLASS_INPUT,
    enter(d) {
      d = d || {};
      G.phase = 'menu';
      G.driver = null;
      G.podium = null;
      const g = G.game;
      if (g.headless && g.players.length < 2) { try { g.addPlayer({ keys: 'right' }); } catch (e) { /* one mat */ } }
      try { g.allowJoin({ max: 4 }); } catch (e) { /* already open */ }
      const acts = ['stork', 'candle', 'squat', 'step', 'hoop'];
      const items = acts.map(function (id) { return { label: G.ACTS[id].name, id: id }; });
      items.push({ label: 'Surprise me', id: 'surprise' });
      scenes.class._pills = new G.Pills(items, { i: 0 });
      scenes.class._podium = null;
      if (d.id) scenes.class.begin(d.id);
    },
    begin(id) {
      const seats = [];
      const players = G.game.players || [G.game.input];
      const n = Math.max(players.length, 2);
      for (let i = 0; i < n && i < 4; i++) {
        const local = i < players.length;
        seats.push({
          name: local ? ('P' + (i + 1)) : 'Regular',
          color: (E.PLAYER_COLORS && E.PLAYER_COLORS[i]) || '#4a8aff',
          local: local,
          human: !!local,
          skill: local ? null : 'average',
          scoring: !!local,
          botFill: !local,
          pi: local ? i : -1
        });
      }
      scenes.class._seats = seats;
      G.session = new G.Session({
        id: id, tier: 1, limit: 35, skipToPlay: true, classMode: true, trial: true,
        seats: seats, seed: 8
      });
      scenes.class._podium = null;
      G.phase = 'auto';
    },
    exit() {
      const g = G.game;
      if (!g) return;
      try { g.allowJoin(false); } catch (e) { /* quiet */ }
      while (g.players.length > 1) { try { g.removePlayer(g.players[g.players.length - 1]); } catch (e) { break; } }
    },
    update(dt) {
      const s = G.session;
      if (!s) {
        G.phase = 'menu';
        if (scenes.class._podium) {
          if (G.game.input.pressed('confirm') || G.game.input.pressed('cancel')) go('title');
          return;
        }
        const it = scenes.class._pills.update(G.game.input);
        if (!it) return;
        if (it.id === 'surprise') {
          G.queue = ['candle', 'hoop'];
          G.chainAfter = function () { scenes.class._podium = true; G.session = null; };
          scenes.class.begin('stork');
        } else scenes.class.begin(it.id);
        return;
      }
      s.update(dt);
      if (s.phase === 'results') {
        G.phase = 'menu';
        if (!scenes.class._shown) {
          scenes.class._shown = true;
          scenes.class._scores = s.seats.map(function (q) { return q.score || 0; });
        }
        if (G.game.input.pressed('confirm')) {
          scenes.class._shown = false;
          if (G.queue && G.queue.length) { const id = G.queue.shift(); scenes.class.begin(id); }
          else {
            const seats = s.seats.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
            G.podium = seats.map(function (q, i) {
              return { title: G.LINES.podium[Math.min(i, G.LINES.podium.length - 1)], name: q.name, score: q.score || 0 };
            });
            G.session = null;
            scenes.class._podium = true;
          }
        }
      } else G.phase = s.phase === 'play' ? 'play' : 'auto';
    },
    draw(r) {
      G.paintRoom(r, 'day');
      if (!G.session) {
        if (scenes.class._podium && G.podium) {
          hudName(r, 'Podium', 'Tare reads the polite titles.');
          r.overlay(function (g) {
            G.podium.forEach(function (q, i) {
              G.text(g, q.title + '  ' + q.name + '  ' + q.score, 16, 78 + i * 16, '#20404c', 1);
            });
          });
          return;
        }
        hudName(r, 'Local Class', 'Mats for whoever came.');
        scenes.class._pills.draw(r);
        return;
      }
      try { G.drawActivity(r, G.session); } catch (e) { /* room */ }
      if (G.session.phase === 'results') {
        r.overlay(function (g) {
          const seats = G.session.seats.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
          seats.forEach(function (q, i) {
            const title = G.LINES.podium[Math.min(i, G.LINES.podium.length - 1)];
            G.text(g, title + '  ' + q.name + '  ' + (q.score || 0), 16, 78 + i * 16, '#20404c', 1);
          });
        });
      }
    }
  });

  G.hubSendAcc = 0;
  G.hubProgAcc = 0;
  G.morningEvents = null;
  G.morningScores = [0, 0, 0];

  function hubApi() { return (typeof AIHub !== 'undefined') ? AIHub : null; }

  G.hubTimeUp = function () {
    if (G.hubReported) return;
    G.hubReported = true;
    const api = hubApi();
    if (!api || !api.result) return;
    const total = Math.round(G.morningScores.reduce(function (a, b) { return a + b; }, 0));
    try {
      api.result({
        score: total,
        stats: { Steadiness: Math.round((G.morningScores[0] || 0) / 10) + '%' },
        awards: [{ title: 'Most Still', detail: 'A quiet morning.' }]
      });
    } catch (e) { /* the hub already closed */ }
  };
  G.hubEnd = function () {
    G.hubOver = true;
    try { if (G.game) { G.game.audio.stopMusic(); G.game.audio.mute(true); G.game.input.clear(); } } catch (e) { /* quiet */ }
  };

  /* A hub ghost is a translucent rig posed from the lean and the extra wobble it sent. */
  function drawGhostRigs(r) {
    if (!r || !r.actor || !G.ghosts || !G.makeRig) return;
    const ev = scenes.round.ei;
    G.ghosts.forEach(function (gh, i) {
      if (!gh || gh.a !== ev) return;
      const l = gh.l || [0, 0];
      const w = gh.w || [0, 0];
      const wob = [(l[1] || 0) + (w[1] || 0), (l[0] || 0) + (w[0] || 0)];
      try {
        if (!gh.rig) gh.rig = G.makeRig(G.playerOpts(null, 1.7));
        const rig = gh.rig;
        G.poseRig(rig, 'idle', (G.game && G.game.time) || 0, wob);
        rig.wob = wob.slice();
        G.stepRig(rig, 1 / 60, 0, 0);
        r.actor(-8 + i * 4.5, 8, 0, function (g, ox, oy) { rig.draw(g, ox, oy, r.view); }, { alpha: 0.5, outline: false });
      } catch (e) { /* the name still shows */ }
    });
  }

  scenes.round = base({
    enter() {
      G.hubOver = false;
      G.hubReported = false;
      G.ghosts = [];
      G.morningScores = [0, 0, 0];
      G.hubSendAcc = 0;
      G.hubProgAcc = 1;
      G.session = null;
      scenes.round.dealt = false;
      scenes.round.ei = -1;
      try { G.playSong('studio'); } catch (e) { /* quiet */ }
    },
    update(dt) {
      if (G.hubOver) { G.phase = 'auto'; return; }
      const api = hubApi();
      const live = !!(api && G.inSession && api.time);
      const tms = live ? api.time() : (scenes.round.local = (scenes.round.local || 0) + dt * 1000);
      if (live && tms === -Infinity) {
        G.phase = 'menu';
        const I = G.game.input;
        if (I.pressed('confirm') || I.pressed('start')) { try { api.answer('ready'); } catch (e) { /* early */ } }
        if (I.pressed('more')) { try { api.answer('more'); } catch (e) { /* early */ } }
        return;
      }
      if (tms < 0) { G.phase = 'auto'; G.left = Math.max(0, -tms / 1000); return; }
      if (!scenes.round.dealt) {
        let rng = E.rng(7);
        try { if (live && api.rng) rng = api.rng('deal'); } catch (e) { rng = E.rng(7); }
        G.morningEvents = G.deal(rng);
        scenes.round.dealt = true;
      }
      const span = 50;
      const ev = Math.min(2, Math.floor(tms / 1000 / span));
      const local = (tms / 1000) - ev * span;
      if (ev !== scenes.round.ei) {
        scenes.round.ei = ev;
        const id = G.morningEvents[ev];
        try {
          G.session = new G.Session({ id: id, tier: 1, limit: 40, skipToPlay: true, trial: true, seed: 20 + ev });
          if (!G.attracting) G.driver = null;
        } catch (e) { G.session = null; }
      }
      const s = G.session;
      if (s && local < 45 && s.phase !== 'results') {
        try { s.update(Math.min(dt, 0.05)); } catch (e) { /* keep the clock */ }
        if (s.phase === 'results') G.morningScores[ev] = Math.round((s.pct || 0) * 1000);
        else G.morningScores[ev] = Math.round((s.pct || 0) * 1000);
      }
      G.phase = 'play';
      G.left = Math.max(0, span - local);
      if (live) {
        G.hubSendAcc += dt;
        G.hubProgAcc += dt;
        if (G.hubSendAcc >= 0.1) {
          G.hubSendAcc = 0;
          const b = s && s.seats && s.seats[0] && s.seats[0].bal;
          try {
            api.send({ t: 'g', a: ev, l: [b ? b.px : 0, b ? b.py : 0], p: s ? s.phase : 'play', w: [0, 0], s: G.morningScores[ev] || 0 }, { reliable: false });
          } catch (e) { /* rate */ }
        }
        if (G.hubProgAcc >= 1) {
          G.hubProgAcc = 0;
          const total = Math.round(G.morningScores.reduce(function (a, b) { return a + b; }, 0));
          try { api.progress({ score: total, label: total + ' pts' }); } catch (e) { /* rate */ }
        }
      }
    },
    draw(r) {
      G.paintRoom(r, 'day');
      const api = hubApi();
      const waiting = api && G.inSession && api.time && api.time() === -Infinity;
      if (waiting) {
        hudName(r, 'Spine Wee', 'Morning Class');
        r.overlay(function (g) {
          G.text(g, 'Lean. Stay steady. Most points wins.', 12, 70, '#20404c', 1);
          const ps = (G.hubInfo && G.hubInfo.players) || [];
          ps.forEach(function (p, i) { G.text(g, (p.name || ('Seat ' + (i + 1))), 12, 90 + i * 14, p.color || '#14a8c8', 1); });
          G.text(g, 'Ready', r.W / 2 - 40, r.H - 36, '#14a8c8', 2);
        });
        return;
      }
      if (G.session) { try { G.drawActivity(r, G.session); } catch (e) { /* room */ } }
      drawGhostRigs(r);
      r.overlay(function (g) {
        const names = (G.morningEvents || []).join('  ');
        G.text(g, names, 8, r.H - 24, '#5f7f8a', 1);
        G.ghosts.forEach(function (gh, i) {
          if (!gh || gh.a !== scenes.round.ei) return;
          G.text(g, gh.name || 'ghost', 20 + i * 40, 60, gh.color || '#ffffff', 1);
        });
      });
    }
  });

  function aboutPages() {
    const A = G.ABOUT;
    const pages = [];
    if (A && A.sourceInformation) {
      const order = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      order.forEach(function (k) { pages.push({ h: 'Source', t: k + ': ' + A.sourceInformation[k] }); });
    } else pages.push({ h: 'Source', t: 'Source information is bound when the page is built.' });
    const blocks = [
      ['Testing Feedback', A && A.testingFeedback],
      ['Engine Feedback', A && A.engineFeedback],
      ['Prompt Feedback', A && A.promptFeedback]
    ];
    blocks.forEach(function (b) {
      const arr = b[1] || ['unknown'];
      arr.forEach(function (line) { pages.push({ h: b[0], t: String(line) }); });
    });
    pages.push({ h: 'Credits', t: 'my-3D2dge. Mesh2Motion and Quaternius, CC0. CMU Graphics Lab Motion Capture Database.' });
    pages.push({ h: 'Credits', t: 'No extra asset-store packs. Voices are synthesized. Music is synthesized.' });
    return pages;
  }

  scenes.about = base({
    enter() {
      scenes.about.pages = aboutPages();
      scenes.about.i = 0;
      G.phase = 'menu';
    },
    update() {
      G.phase = 'menu';
      const I = G.game.input;
      const pages = scenes.about.pages;
      if (I.pressed('confirm') || I.pressed('right')) {
        if (scenes.about.i < pages.length - 1) scenes.about.i++;
        else go('title');
      } else if (I.pressed('cancel') || I.pressed('left')) {
        if (scenes.about.i > 0) scenes.about.i--;
        else go('title');
      }
    },
    draw(r) {
      G.paintRoom(r, 'day');
      const p = scenes.about.pages[scenes.about.i];
      hudName(r, p.h, '');
      r.overlay(function (g) {
        const words = String(p.t).split(' ');
        let line = '', y = 70;
        words.forEach(function (w) {
          const next = line ? line + ' ' + w : w;
          if (next.length > 32) { G.text(g, line, 12, y, '#20404c', 1); y += 14; line = w; }
          else line = next;
        });
        if (line) G.text(g, line, 12, y, '#20404c', 1);
        G.text(g, (scenes.about.i + 1) + ' / ' + scenes.about.pages.length, r.W / 2, r.H - 20, '#5f7f8a', 1, 'center');
      });
    }
  });

  G.scenes = scenes;

  G.capture = function () {
    const g = G.game, s = G.session, p = G.profile;
    const snap = {
      scene: g ? g.sceneName : '',
      activity: s && s.act ? s.act.id : '',
      tier: s ? s.tier : 0,
      day: p ? p.day : 1,
      session: p ? p.sessions : 0,
      pct: s ? s.pct : 0,
      stars: s ? s.stars : 0,
      minutes: p ? p.minutes : 0,
      spineAge: p ? G.spineAge() : 71,
      lean: { x: G.lean.ux, y: G.lean.uy },
      source: G.lean.source || 'keys',
      phase: G.phase,
      freePlay: !!(p && p.freePlay),
      unlocks: p ? p.unlocks.slice() : [],
      saves: g && g.saves ? g.saves.list().length : 0,
      attract: !!G.attracting,
      dev: !!(G.dev && G.dev.panel),
      plateau: !!(p && p.plateau),
      title: 'Spine Wee',
      ending: !!(p && p.ending) || (g && g.sceneName === 'ending'),
      duelWon: !!(p && p.duelWon),
      left: G.left || 0
    };
    if (g) g.debug = g.debug || {};
    if (g) g.debug.snapshot = function () { return snap; };
    G._snap = snap;
    return snap;
  };

  G.wireScenes = function (game) {
    const out = {};
    Object.keys(scenes).forEach(function (name) {
      const s = scenes[name];
      const update = s.update, draw = s.draw, enter = s.enter;
      out[name] = Object.assign({}, s, {
        enter: function (data) {
          G.seen[name] = true;
          try { if (enter) enter.call(s, data); } catch (e) { game.fail('enter ' + name, e); }
        },
        update: function (dt) {
          if (G.dev && G.dev.panel) { try { G.dev.update(game.input, dt); } catch (e2) { /* panel */ } }
          if (G.talk && G.talk.open) {
            G.phase = 'talk';
            try { G.talk.update(dt); } catch (e) { game.fail('talk', e); }
            if (G.talk.open) { G.capture(); return; }
          }
          try { if (update) update.call(s, dt); } catch (e) { game.fail('update ' + name, e); }
          G.capture();
        },
        draw: function (r) {
          try { if (draw) draw.call(s, r); }
          catch (e) {
            game.fail('draw ' + name, e);
            try { G.paintRoom(r, 'day'); } catch (e2) { /* blank is worse */ }
          }
          if (G.dev && G.dev.panel) { try { G.dev.draw(r); } catch (e3) { /* panel */ } }
        }
      });
    });
    return out;
  };

  void songFor;
})();
