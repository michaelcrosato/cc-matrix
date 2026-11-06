/* Pick Axe Deplete — bootstrap and presentation lifecycle. */
(async () => {
  const P = globalThis.PD,
    E = globalThis.My3D2dge,
    hub = globalThis.AIHub;
  const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
  const online = !!info,
    server = online && !!hub.server;
  const $ = (id) => document.getElementById(id),
    node = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    };
  const app = {
    state: online ? 'play' : 'title',
    mine: null,
    online,
    server,
    started: false,
    ended: false,
    idleAt: 0,
    captionUntil: 0,
    scenario: false,
    slow: 1,
    accumulator: 0,
    allowTuning: false,
    nextHud: 0,
    selectedRoute: 0,
    injected: null,
    testing: false,
  };
  const game = new E.Game({
    id: 'pick-axe-deplete-v1',
    canvas: 'screen',
    view: 'side',
    views: ['side'],
    res: [800, 500],
    expand: true,
    headless: server,
    loop: !online,
    input: P.INPUT,
    autoPause: !online,
    live: online,
    fullscreen: false,
    corner: false,
    menu: {
      quit: false,
      controls: {
        jump: 'Jump',
        attack: 'Chop',
        redirect: 'Redirect',
        duck: 'Duck',
        interact: 'Door / rescue',
      },
      settings: [
        { key: 'music', value: 0.1 },
        { key: 'effects', value: 0.7 },
        { key: 'volume', value: 1 },
        { key: 'glyphs', value: 'playstation' },
        {
          key: 'voice',
          label: 'Gibberish voice',
          value: 0.4,
          group: 'Sound',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.05,
        },
        { key: 'reducedFlashes', label: 'Reduce flashes', value: false, group: 'Comfort' },
        { key: 'hints', label: 'Tutorial prompts', value: true },
        { key: 'touch', value: 'off' },
        { key: 'shake', value: 0.5 },
      ],
    },
  });
  const S = game.settings;
  let audio = server ? null : new P.MineAudio(game),
    view = server ? null : new P.MineView(game),
    ui = null,
    controls = null,
    link = null,
    interval = null,
    renderRequest = null;
  let pilot = new P.Pilot(),
    demoAge = 0,
    lastAxes = [0, 0],
    hudStamp = '',
    titleMine = null;
  const abort = new AbortController(),
    unsubscribes = [];
  const comfort = () => ({
    reduceMotion: S.motion,
    reduceFlashes: S.reducedFlashes || S.flashes < 0.2,
    shake: S.shake,
  });
  const syncAudio = () => audio?.set({ music: S.music, sfx: S.effects, voice: S.voice, mute: !S.sound });
  syncAudio();
  const clearInput = () => {
    controls?.clear();
    for (const i of game.players) i.clear();
    game.particles.list.length = 0;
    game.timeScale = 1;
    app.accumulator = 0;
  };
  const wakeAudio = () => {
    if (!app.ended) audio?.wake();
  };
  function caption(text, duration = 3) {
    if (server || !text) return;
    $('caption').textContent = text;
    $('caption').hidden = false;
    app.captionUntil = game.real + duration;
  }
  function receiveEvents(events) {
    for (const e of events) {
      audio?.event(e);
      view?.event(e, comfort());
      if (e.text) caption(e.text, ['key', 'break', 'entry', 'door', 'wave'].includes(e.type) ? 4 : 2.7);
      if (e.type === 'entry') {
        app.accumulator = 0;
        controls?.clear();
      }
    }
  }
  function makeTitleMine() {
    const m = new P.Mine({ seed: 73082 });
    m.players[0].body.x = 242;
    m.players[0].body.z = P.floorZ(1);
    m.players[0].pose = 'boast';
    m.players[0].poseT = 99;
    m.spawnRock('ore', 304, P.floorZ(2) + 8, 0);
    m.spawnRock('heavy', 132, P.floorZ(3) + 10, 0);
    m.takeEvents();
    return m;
  }
  function title() {
    if (online || app.ended) return;
    app.state = 'title';
    app.scenario = false;
    app.slow = 1;
    app.idleAt = game.real;
    app.captionUntil = 0;
    app.allowTuning = false;
    audio?.stop();
    clearInput();
    game.resume();
    while (game.players.length > 1) game.removePlayer(game.players[1]);
    game.input.pad = 'any';
    game.allowJoin(false);
    titleMine = makeTitleMine();
    app.mine = titleMine;
    ui.hide();
    ui.show('title', {
      name: P.TITLE,
      subtitle: P.TAGLINE,
      kicker: '',
      text: 'Three chambers. One last payday.\nTurn a very bad mine into a very good idea.',
      meta: ['SOLO + CO-OP', 'AN ARCADE EXPEDITION'],
      footer: `Inspired by Pick Axe Pete · Best payday ${E.store.get('PD:completed-best', 0)}`,
      actions: [
        { label: 'Start expedition', primary: true, fn: () => start() },
        ['Local co-op', localCoop],
        ['Chamber practice', practice],
        ['Options & About', options],
      ],
      back: () => {},
    });
    $('attract-banner').hidden = true;
    $('caption').hidden = true;
    $('hint').hidden = true;
    $('hud').hidden = true;
    hudStamp = '';
  }
  function activity(device, event) {
    if (app.ended) return;
    if (app.state === 'attract') {
      if (event?.type?.startsWith('pointer')) {
        app.wakePointerId = event.pointerId;
        app.wakeClickExpires = performance.now() + 750;
      }
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
      title();
      app.consumeUntil = game.real + 0.1;
      return;
    }
    app.idleAt = game.real;
    if (device === 'mouse' || device === 'touch' || device === 'keyboard') game.input.lastDevice = device;
    if (device === 'touch' && controls) {
      controls.touchUsed = true;
      controls.lastTouch = game.real;
    }
    if (device !== 'touchmove') wakeAudio();
  }
  function configureJoin() {
    if (online) {
      game.allowJoin(false);
      return;
    }
    game.allowJoin({
      max: 2,
      keys: true,
      onJoin: (input, number) => {
        if (app.state !== 'play' || (app.mine.age > 6 && !app.reassigning)) {
          game.removePlayer(input);
          caption('Join at the next chamber entry · press Options on a second pad.', 4);
          return;
        }
        if (
          !app.mine.players.some((p) => p.id === number - 1) &&
          !app.mine.join({ id: number - 1, name: 'Partner', color: '#7bded7' })
        ) {
          game.removePlayer(input);
          return;
        }
        clearInput();
        caption('Partner on the payroll. Share the key. Rescue each other.', 4);
      },
    });
  }
  function resetDevRows() {
    app.allowTuning = false;
    for (const [key, spec] of Object.entries(P.TUNING)) S.set('dev_' + key, spec.value);
  }
  function start({
    chamber = 0,
    practice: isPractice = false,
    coop = false,
    developer = false,
    scenario = false,
  } = {}) {
    if (online || app.ended) return;
    clearInput();
    game.resume();
    ui.hide();
    audio?.stop();
    wakeAudio();
    app.state = 'play';
    app.scenario = scenario;
    app.slow = 1;
    app.allowTuning = false;
    app.resultAt = 0;
    resetDevRows();
    const roster = [{ id: 0, name: 'Pete', color: '#ffbf57' }];
    if (!coop) {
      while (game.players.length > 1) game.removePlayer(game.players[1]);
      game.input.pad = 'any';
    }
    S.set('devCollision', false);
    S.set('devNavigation', false);
    S.set('devGod', false);
    S.set('devSlow', 1);
    if (coop) roster.push({ id: 1, name: 'Partner', color: '#7bded7' });
    app.mine = new P.Mine({ chamber, practice: isPractice, roster, developer });
    app.started = true;
    pilot = new P.Pilot(app.selectedRoute);
    configureJoin();
    if (coop && game.players.length < 2) {
      const pads = [...(navigator.getGamepads?.() || [])].filter((p) => p?.connected);
      if (pads.length >= 2) {
        game.input.pad = pads[0].index;
        game.addPlayer({ pad: pads[1].index });
      } else if (pads.length === 1 && game.input.lastDevice !== 'gamepad') {
        game.input.pad = null;
        game.addPlayer({ pad: pads[0].index });
      } else game.addPlayer({ keys: 'right' });
    }
    $('attract-banner').hidden = true;
    hudStamp = '';
    receiveEvents(app.mine.takeEvents());
    syncAudio();
    game.particles.ground = (x, _y, z) => app.mine.room.level.groundBelow(x, z + 1) || 0;
  }
  function localCoop() {
    ui.show('coop', {
      kicker: 'A shared payday',
      title: 'Two picks. One key.',
      text: 'Play together on two pads, or keyboard + pad. A second pad may also join during the calm chamber entry.\n\nNo pads? The keyboard splits into two native sets; pause → Controls shows both. Hold Interact beside a fallen partner to rescue them.',
      actions: [
        { label: 'Start local co-op', primary: true, fn: () => start({ coop: true }) },
        ['Back', () => ui.back()],
      ],
    });
  }
  function practice() {
    ui.show('practice', {
      kicker: 'A little prospecting',
      title: 'Chamber practice',
      text: 'Start with a fresh helmet and pick. Practice paydays stay off your expedition record.',
      actions: P.ROOMS.map((r, i) => [
        `0${i + 1} · ${r.name}`,
        () => start({ chamber: i, practice: true }),
      ]).concat([['Back', () => ui.back()]]),
    });
  }
  function options() {
    ui.show('options', {
      kicker: 'Make yourself comfortable',
      title: 'Options & About',
      actions: [
        ['Settings', () => settings(0)],
        ['Controls & rebinding', () => ui.show('controls')],
        !online && app.state === 'play' && ['Controller ownership', ownership],
        ['About / Credits', () => about(0)],
        ['Back', () => ui.back()],
      ],
    });
  }
  function ownership() {
    const choose = (layout) => {
      const pads = [...(navigator.getGamepads?.() || [])].filter((p) => p?.connected);
      if (layout !== 'keys' && !pads.length) {
        caption('Connect a controller, then choose this layout.');
        return;
      }
      if (layout === 'pads' && pads.length < app.mine.players.length) {
        caption('Connect one controller for each miner.');
        return;
      }
      app.reassigning = true;
      while (game.players.length > 1) game.removePlayer(game.players[1]);
      game.input.pad = layout === 'keys' ? null : layout === 'mixed' ? null : (pads[0]?.index ?? 'any');
      if (app.mine.players.length > 1)
        game.addPlayer(
          layout === 'pads'
            ? { pad: pads[1].index }
            : layout === 'mixed'
              ? { pad: pads[0].index }
              : { keys: 'right' },
        );
      app.reassigning = false;
      clearInput();
      caption('Controller ownership updated.');
      ui.back();
    };
    ui.show('ownership', {
      kicker: 'Recover a disconnected controller',
      title: 'Who holds the pick?',
      text: 'Assign connected devices without changing miners, health, tools or the shared key.',
      actions: [
        ['Keyboard / split keyboard', () => choose('keys')],
        ['P1 keyboard · P2 controller', () => choose('mixed')],
        ['Connected controller(s)', () => choose('pads')],
        ['Back', () => ui.back()],
      ],
    });
  }
  function settings(page = 0) {
    const pages = [
      {
        title: 'Sound',
        rows: ['music', 'effects', 'voice', 'sound'],
        text: 'Original coded chip music, clanging ore, and a miner with a lot to say. Music starts at 10%.',
      },
      {
        title: 'Comfort',
        rows: ['motion', 'reducedFlashes', 'shake', 'hints'],
        text: 'Shapes, motion and captions carry the cues. Color and pitch are extra help.',
      },
      {
        title: 'Controller',
        rows: ['glyphs', 'deadzone', 'rumble', 'scale'],
        text: 'PlayStation symbols are the default. Your bindings and device ownership are kept by the native input system.',
      },
    ];
    const p = pages[page];
    ui.show('preferences', {
      kicker: `Settings ${page + 1} / ${pages.length}`,
      title: p.title,
      text: p.text,
      rows: p.rows,
      actions: [
        [`Next · ${pages[(page + 1) % pages.length].title}`, () => settings((page + 1) % pages.length)],
        ['Controls & rebinding', () => ui.show('controls')],
        [
          'Restore comfort & sound',
          () => {
            for (const k of [
              'music',
              'effects',
              'voice',
              'sound',
              'motion',
              'reducedFlashes',
              'shake',
              'hints',
              'glyphs',
              'deadzone',
              'rumble',
              'scale',
            ])
              S.set(k, S.default(k));
            settings(page);
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function about(page = 0) {
    const f = P.FEEDBACK,
      entries = Object.entries(f.sourceInformation),
      pages = [];
    const label = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    for (let i = 0; i < entries.length; i += 4)
      pages.push({
        title: 'Source Information',
        sections: entries.slice(i, i + 4).map(([k, v]) => [label(k), String(v)]),
      });
    pages.push({ title: 'Testing Feedback', sections: f.testingFeedback.map((t, i) => [`0${i + 1}`, t]) });
    for (let i = 0; i < f.engineFeedback.length; i += 3)
      pages.push({
        title: 'Engine Feedback',
        sections: f.engineFeedback.slice(i, i + 3).map((t, j) => [`0${i + j + 1}`, t]),
      });
    pages.push({ title: 'Prompt Feedback', sections: f.promptFeedback.map((t, i) => [`0${i + 1}`, t]) });
    const p = pages[page];
    ui.show('about', {
      kicker: `Pick Axe Deplete · Credits ${page + 1} / ${pages.length}`,
      title: p.title,
      text: '',
      rows: [],
      sections: p.sections,
      actions: [
        [
          page === pages.length - 1 ? 'Back to first page' : 'Next page',
          () => about((page + 1) % pages.length),
        ],
        page > 0 && ['Previous page', () => about(page - 1)],
        ['Back', () => ui.back()],
      ],
    });
  }
  function help() {
    const k = (a) => game.input.label(a);
    ui.show('help', {
      kicker: 'A practical guide to overconfidence',
      title: 'Work the mine',
      sections: [
        [
          'Make a payday',
          'Chop ore to prime the lift. Redirect a rock into another for richer crashes. Heavy bands take three chops—or one crash. Duck high spring ore.',
        ],
        [
          'A small warranty',
          'Your pick lasts six successful contacts. Misses are free. A broken pick leaves your jump, duck and ladders intact. Crashes reveal fresh picks drifting to the bottom.',
        ],
        [
          'A way out',
          'The key rises by the left ladder. Catch it before it escapes, then deliberately unlock any marked door. If a key escapes, the mine guarantees another opportunity.',
        ],
        [
          'A shared shift',
          'One key serves both miners. Hold Interact beside a fallen partner. Cross a doorway with a downed partner to haul them through for 15 gold.',
        ],
      ],
      keys: [
        [k('jump'), 'Jump · hold for height'],
        [k('attack'), 'Chop · hold to repeat'],
        [k('redirect'), 'Redirect · up/down chooses arc'],
        [k('interact'), 'Door / hold to rescue'],
      ],
      actions: [['Back', () => ui.back()]],
    });
  }
  function pause() {
    if (app.ended || app.state !== 'play') return;
    game.pause('player');
    controls?.clear();
    ui.show('pause');
  }
  function checkpointMenu() {
    ui.show('checkpoint', {
      kicker: 'The foreman will understand',
      title: 'Take it from the top?',
      text: 'Retry restores this chamber’s entry and forfeits its unbanked bonus.',
      actions: [
        [
          'Retry chamber',
          () => {
            app.mine.retry();
            ui.hide();
            game.resume();
            clearInput();
            receiveEvents(app.mine.takeEvents());
          },
        ],
        app.mine.players.length > 1 && [
          'Partner leaves the shift',
          () => {
            app.mine.leave(1);
            if (game.players[1]) game.removePlayer(game.players[1]);
            clearInput();
            ui.hide();
            game.resume();
          },
        ],
        ['Return to title', title],
        ['Back', () => ui.back()],
      ],
    });
  }
  function developer() {
    if (online) {
      const m = app.mine,
        d = link?.diagnostics();
      ui.show('developer', {
        kicker: 'Live Hub session · observation only',
        title: 'Mine instruments',
        text: `Authority ${hub.host} · epoch ${m.epoch} · tick ${m.tick}\nSeed ${m.seed} · work ${m.work}/${m.room.def.quota}\nRocks ${m.rocks.length} · key ${m.keyOwner ?? (m.key ? 'rising' : 'waiting')}\nPackets ${d?.sent || 0} · world and Hub clock continue in menus.`,
        actions: [
          ['Refresh', developer],
          ['Back', () => ui.back()],
        ],
      });
      return;
    }
    app.mine.developer = true;
    app.allowTuning = true;
    ui.show('developer', {
      kicker: 'Developer · records disabled',
      title: 'The foreman’s desk',
      text: `Seed ${app.mine.seed} · epoch ${app.mine.epoch} · tick ${app.mine.tick}\nWork ${app.mine.work}/${app.mine.room.def.quota} · rocks ${app.mine.rocks.length} · unarmed wait ${app.mine.unarmedFor.toFixed(1)}s`,
      actions: [
        ['Chamber, route & replay', devChamber],
        ['Live balance sliders', () => balance(0)],
        ['Tools & supplies', devTools],
        ['Hazards & instruments', devHazards],
        ['Back', () => ui.back()],
      ],
    });
  }
  function devChamber() {
    ui.show('devChamber', {
      kicker: 'Developer · content launcher',
      title: 'Choose your hole',
      rows: ['devChamber', 'devRoute', 'devSeed'],
      actions: [
        [
          'Load chamber',
          () => {
            app.mine.route = S.devRoute;
            app.mine.debug('chamber', S.devChamber);
            clearInput();
            ui.hide();
            game.resume();
          },
        ],
        [
          'Replay this seed',
          () => {
            app.mine.debug('seed', S.devSeed);
            clearInput();
            ui.hide();
            game.resume();
          },
        ],
        [
          'Canonical scenario replay',
          () => {
            app.selectedRoute = S.devRoute;
            start({ developer: true, scenario: true });
          },
        ],
        [
          'Restart checkpoint',
          () => {
            app.mine.retry();
            clearInput();
            ui.hide();
            game.resume();
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function balance(page) {
    const keys = Object.keys(P.TUNING),
      count = Math.ceil(keys.length / 4);
    ui.show('balance', {
      kicker: `Developer · balance ${page + 1} / ${count}`,
      title: 'Tune the trouble',
      text: 'Every rule has one validated default. Each slider says when its change applies.',
      rows: keys.slice(page * 4, page * 4 + 4).map((k) => 'dev_' + k),
      actions: [
        ['Next page', () => balance((page + 1) % count)],
        [
          'Reset ALL defaults',
          () => {
            app.mine.resetTuning();
            resetDevRows();
            app.allowTuning = true;
            balance(page);
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function devTools() {
    ui.show('devTools', {
      kicker: 'Developer · supplies',
      title: 'A little assistance',
      rows: ['devGod'],
      actions: [
        [
          'Grant fresh pick',
          () => {
            app.mine.debug('tool');
            caption('Fresh pick granted');
          },
        ],
        [
          'Grant team key',
          () => {
            app.mine.debug('key');
            caption('Team key granted');
          },
        ],
        [
          'Release falling pick',
          () => {
            app.mine.debug('supply');
            caption('Pick released into the shaft');
          },
        ],
        [
          'Make a supply crash',
          () => {
            app.mine.debug('pair');
            caption('Supply crash queued');
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function devHazards() {
    ui.show('devHazards', {
      kicker: 'Developer · scenario instruments',
      title: 'Handle with optimism',
      rows: ['devCollision', 'devNavigation', 'devSlow'],
      actions: [
        [
          'Spawn next ore family',
          () => {
            const kinds = ['ore', 'hopper', 'heavy'];
            app.spawnKind = (app.spawnKind || 0) + 1;
            app.mine.debug('rock', kinds[(app.spawnKind - 1) % 3]);
            caption(kinds[(app.spawnKind - 1) % 3] + ' spawned');
          },
        ],
        [
          'Purge rocks & supplies',
          () => {
            app.mine.debug('purge');
            caption('Shaft cleared');
          },
        ],
        [
          'Step one tick',
          () => {
            app.mine.step({}, P.STEP);
            receiveEvents(app.mine.takeEvents());
            view.update(P.STEP, app.mine);
            game.advance(0, { draw: true });
            hud();
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function results() {
    const m = app.mine;
    app.state = 'results';
    app.scenario = false;
    app.allowTuning = false;
    if (online) {
      link.finish(m.status === 'victory');
      return;
    }
    const won = m.status === 'victory';
    if (won && !m.practice && !m.developer && !m.attract)
      E.store.set('PD:completed-best', Math.max(m.score, E.store.get('PD:completed-best', 0)));
    ui.hide();
    clearInput();
    ui.show('results', {
      kicker: m.developer
        ? 'Developer shift · score not recorded'
        : m.practice
          ? 'Practice shift · score not recorded'
          : won
            ? 'Misty Mountain Mining Co. · shift complete'
            : 'A temporary career interruption',
      title: won ? 'Gloriously depleted.' : 'A minor setback.',
      emblem: won ? '✦' : '⛑',
      text: won
        ? '“I told you the warranty was optional!”\nThe helmets are dented. The payday is spectacular.'
        : m.reason,
      stats: [
        [m.score, 'Gold'],
        [m.stats.collisions, 'Crashes'],
        [Math.floor(m.time / 60) + ':' + String(Math.floor(m.time % 60)).padStart(2, '0'), 'Shift time'],
      ],
      sections: m.players.map((p) => [
        p.name,
        `${p.contribution.ore} ore · ${p.contribution.redirects} ricochets · ${p.contribution.rescues} rescues`,
      ]),
      medals: [
        ['Warranty void', m.stats.breaks > 0],
        ['Rock whisperer', m.stats.redirects > 0],
        ['Good company', m.stats.rescues > 0],
      ],
      actions: won
        ? [
            {
              label: 'Another spectacular payday',
              primary: true,
              fn: () => start({ coop: m.players.length > 1 }),
            },
            ['Chamber practice', practice],
            ['Title', title],
          ]
        : [
            {
              label: 'Retry chamber checkpoint',
              primary: true,
              fn: () => {
                m.retry();
                app.state = 'play';
                ui.hide();
                game.resume();
                clearInput();
                receiveEvents(m.takeEvents());
              },
            },
            ['Chamber practice', practice],
            ['Title', title],
          ],
      back: title,
    });
    hudStamp = '';
  }
  function beginAttract() {
    if (online || app.state !== 'title') return;
    const soundAllowed = audio?.awakened && audio.native.ctx?.state === 'running';
    ui.hide();
    clearInput();
    audio?.stop();
    if (soundAllowed) wakeAudio();
    app.state = 'attract';
    app.mine = new P.Mine({ seed: 73082, attract: true });
    pilot = new P.Pilot(2);
    demoAge = 0;
    $('attract-banner').hidden = false;
    $('attract-banner').textContent = 'LIVE DEMONSTRATION · Any input to take the shift';
  }
  function tutorial(m) {
    if (!S.hints || m.chamber !== 0 || app.state !== 'play') return '';
    const t = m.tutorial,
      k = (a) => game.input.label(a);
    if (controls.touchUsed && game.input.lastDevice === 'touch' && m.age < 14)
      return 'Left thumb moves / climbs. Tap right to jump. Chop is assisted. Use the glowing action bubble.';
    if (!t.move)
      return `${game.input.lastDevice === 'gamepad' ? 'Left stick / D-pad' : k('left') + '/' + k('right')} · Move. The mine rewards confidence. Mostly.`;
    if (!t.jump) return `${k('jump')} · Jump. Hold for height; a short tap makes a small hop.`;
    if (!t.duck) return `Down or ${k('duck')} · Duck under a high spring-rock pass.`;
    if (!t.chop) return `Hold ${k('attack')} · Chop ore. Six contacts, then your pick breaks.`;
    if (!t.redirect) return `${k('redirect')} · Redirect! Up/down chooses a high/low rock lane.`;
    if (!t.broken) return 'The last contact glows red. When the tool snaps, keep your feet moving.';
    if (!t.pick) return 'Crashes reveal fresh picks. Follow their blue downward arrows to the lower ledge.';
    if (!t.key) return 'Prime the lift, then chase the rising key by the LEFT ladder.';
    return `${k('interact')} at a marked door · Choose your next mine.`;
  }
  function hud() {
    if (server) return;
    const m = app.mine,
      active = (app.state === 'play' || app.state === 'attract') && !ui.screen && !app.ended;
    $('hud').hidden = !active;
    $('dev-flag').hidden = !m?.developer;
    $('menu-button').hidden = !!ui.screen || app.ended || app.state === 'attract';
    $('attract-banner').hidden = app.state !== 'attract';
    controls.updateBubble(m, !active || app.state === 'attract' || m.status !== 'playing');
    if (!active) return;
    const myId = online ? hub.me : 0,
      p = m.players.find((p) => p.id === myId) || m.players[0];
    let objective = `${Math.min(m.work, m.room.def.quota)}/${m.room.def.quota} ore work · prime the lift`;
    if (m.room.def.extraction)
      objective = `${m.finale.cleared}/3 machines primed · ${Math.min(m.work, m.room.def.quota)}/${m.room.def.quota} work`;
    if (m.key) objective = 'Key rising at the left ladder · catch the light!';
    if (m.keyOwner !== null)
      objective = `Key: ${m.players.find((q) => q.id === m.keyOwner)?.name || 'team'} · unlock any marked door`;
    if (m.status === 'transition') objective = `Entering ${P.ROUTES[m.route].name} · safe passage`;
    if (m.status === 'victory') objective = 'Extraction complete · a spectacular payday';
    if (online && (!app.started || hub.time() < 0))
      objective = app.started
        ? `Shift starts in ${Math.ceil(-hub.time() / 1000)}`
        : 'Ready for the Hub’s starting whistle';
    $('room-number').textContent = '0' + (m.chamber + 1);
    $('room-name').textContent = m.room.def.name;
    $('chapter-label').textContent =
      app.state === 'attract'
        ? 'Live demonstration'
        : m.practice
          ? 'Practice chamber'
          : online
            ? 'Shared Hub expedition'
            : 'Expedition · 3 chambers';
    $('objective').textContent = objective;
    $('score').textContent = String(m.score).padStart(4, '0');
    $('work-fill').style.width = Math.min(100, (m.work / m.room.def.quota) * 100) + '%';
    document.body.classList.toggle('touch-mode', game.input.lastDevice === 'touch');
    const owner = m.players.find((q) => q.id === m.keyOwner);
    $('key-status').hidden = m.status !== 'playing';
    $('key-status').textContent = owner
      ? `⚿ KEY · ${owner.name}\nAny marked door`
      : m.key
        ? '⚿ KEY RISING ↑\nLeft ladder route'
        : m.relief > 0
          ? 'DUST SETTLING\nSafe entry'
          : m.work >= m.room.def.quota && (!m.room.def.extraction || m.finale.cleared === P.EXTRACTION.length)
            ? '⚿ KEY CRASH SOON\nWatch the left shaft'
            : '▲ FORGE  ◆ SPRING  ✳ CRUSHER';
    const stamp = m.players.map((p) => [p.id, p.hp, p.tool, p.down, m.keyOwner, p.name].join(':')).join('|');
    if (stamp !== hudStamp) {
      hudStamp = stamp;
      $('miners').replaceChildren(
        ...m.players.map((q, i) => {
          const card = node('div', 'miner-card'),
            name = node('div', 'miner-name', `${m.players.length > 1 ? 'P' + (i + 1) + ' · ' : ''}${q.name}`),
            health = node('div', 'health');
          card.style.setProperty('--player', q.color);
          health.setAttribute('aria-label', `${q.hp} of 3 helmet marks`);
          for (let n = 0; n < 3; n++) health.append(node('i', 'helmet' + (q.hp <= n ? ' off' : '')));
          const tool = node('div', 'tool-status' + (q.tool === 0 ? ' empty' : q.tool === 1 ? ' last' : ''));
          if (q.down) tool.textContent = 'DOWN · hold to rescue';
          else if (!q.tool) tool.textContent = 'PICK BROKEN · evade & recover';
          else {
            const wear = node('span', 'wear');
            for (let n = 0; n < Math.min(8, m.tuning.durability); n++)
              wear.append(node('i', q.tool <= n ? 'off' : ''));
            tool.append(wear, `${q.tool} contacts`);
          }
          card.append(name, health, tool);
          return card;
        }),
      );
    }
    const nearbyDoor = p && m.nearDoor(p);
    const hint =
      nearbyDoor && m.age > 5
        ? `${nearbyDoor.symbol} ${nearbyDoor.name} · ${nearbyDoor.benefit} · +${nearbyDoor.bonus} route bonus`
        : tutorial(m);
    $('hint').textContent = hint;
    $('hint').hidden = !hint || app.state === 'attract' || m.status !== 'playing';
    const context = p && !p.down && m.status === 'playing' ? m.context(p) : null;
    $('action-prompt').hidden = !context || game.input.lastDevice === 'touch' || app.state === 'attract';
    if (context) {
      $('action-prompt').replaceChildren(
        node('kbd', '', game.input.label(context.type === 'redirect' ? 'redirect' : 'interact')),
        document.createTextNode(context.label),
      );
    }
    $('controls-ribbon').textContent =
      `${game.input.label('jump')} Jump     ${game.input.label('attack')} Chop     ${game.input.label('redirect')} Redirect     ${game.input.label('interact')} Door / Rescue`;
    $('caption').hidden = game.real > app.captionUntil || app.state === 'attract';
  }
  if (!server) {
    ui = new E.Shell(game, {
      standard: false,
      theme: {
        font: "'Trebuchet MS', system-ui, sans-serif",
        titleFont: 'Georgia, serif',
        accent: '#edbe7a',
        ink: '#fff0d2',
        paper: '#111925f5',
        scale: () =>
          innerWidth < 950 && matchMedia('(pointer:coarse)').matches
            ? 1
            : Math.max(0.85, Math.min(1.8, innerWidth / 1066)),
      },
      screens: {
        pause: {
          kicker: () => (online ? 'Online · the world and Hub clock keep running' : 'Tools down. Helmet on.'),
          title: 'Take a breather.',
          actions: () => [
            ['Settings & controls', options],
            ['How to work the mine', help],
            ['Developer', developer],
            ['About / Credits', () => about(0)],
            !online && ['Checkpoint & title', checkpointMenu],
          ],
        },
      },
    });
    controls = new P.Controls(
      game,
      () => app.mine,
      () =>
        !!ui.screen ||
        app.ended ||
        (online && (!app.started || hub.time() < 0)) ||
        game.real < (app.consumeUntil || 0),
      activity,
    );
    document.addEventListener(
      'click',
      (e) => {
        if (
          performance.now() < (app.wakeClickExpires || 0) &&
          (e.pointerId === undefined || e.pointerId === app.wakePointerId)
        ) {
          app.wakeClickExpires = 0;
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true, signal: abort.signal },
    );
    if (online) controls.localId = hub.me;
    const nativeClose = ui._close.bind(ui);
    ui._close = () => {
      if (!online && app.state === 'results') title();
      else nativeClose();
    };
    $('menu-button').onclick = () => {
      activity('mouse');
      pause();
    };
    ui.root.addEventListener(
      'pointermove',
      (e) => {
        const b = e.target.closest('button');
        if (
          e.pointerType === 'mouse' &&
          (e.movementX || e.movementY) &&
          b &&
          ui.root.contains(b) &&
          b !== document.activeElement
        ) {
          app.idleAt = game.real;
          game.input.lastDevice = 'mouse';
          b.focus({ preventScroll: true });
        }
      },
      { signal: abort.signal },
    );
    ui.root.addEventListener(
      'focusin',
      () => {
        audio?.event({ id: 'ui:' + game.real, type: 'ui' });
      },
      { signal: abort.signal },
    );
    // Native settings retain rebinding/dead zones; all developer rows share the typed tuning definition.
    for (const [key, spec] of Object.entries(P.TUNING))
      S.define({
        key: 'dev_' + key,
        label: spec.label,
        type: 'slider',
        value: spec.value,
        min: spec.min,
        max: spec.max,
        step: spec.step,
        help: 'Applies ' + spec.apply,
        group: 'Developer',
        apply: (_g, v) => {
          if (!online && app.allowTuning) app.mine?.setTuning(key, v);
        },
      });
    S.define({
      key: 'devChamber',
      label: 'Chamber',
      value: 0,
      options: P.ROOMS.map((r, i) => [i, r.name]),
      group: 'Developer',
    });
    S.define({
      key: 'devRoute',
      label: 'Encounter route',
      value: 0,
      options: P.ROUTES.map((r, i) => [i, r.name]),
      group: 'Developer',
    });
    S.define({
      key: 'devSeed',
      label: 'Replay seed',
      value: 73082,
      options: [
        [73082, '73082 · expedition'],
        [1, '1 · alternate'],
        [12345, '12345 · test'],
      ],
      group: 'Developer',
    });
    S.define({
      key: 'devGod',
      label: 'Invulnerability',
      value: false,
      group: 'Developer',
      apply: (_g, v) => {
        if (!online && app.mine && app.allowTuning) app.mine.god = v;
      },
    });
    S.define({
      key: 'devCollision',
      label: 'Collision overlay',
      value: false,
      group: 'Developer',
      apply: (_g, v) => {
        if (view && !online) view.collision = v;
      },
    });
    S.define({
      key: 'devNavigation',
      label: 'Navigation overlay',
      value: false,
      group: 'Developer',
      apply: (_g, v) => {
        if (view && !online) view.navigation = v;
      },
    });
    S.define({
      key: 'devSlow',
      label: 'Simulation speed',
      value: 1,
      options: [
        [1, 'Normal'],
        [0.5, 'Half'],
        [0.25, 'Quarter'],
        [0, 'Step only'],
      ],
      group: 'Developer',
      apply: (_g, v) => {
        if (!online && app.allowTuning) app.slow = v;
      },
    });
    S.onChange = () => syncAudio();
    game.hook('input', () => {
      if (app.ended) return;
      const I = game.input;
      if (online && I.held.has('Pad8')) I.suppress('pause');
      if (
        !online &&
        (app.state === 'title' || app.state === 'results') &&
        I.pressed('pause') &&
        !I.pressed('cancel')
      ) {
        // Options closes nested title panels to their root; it must never hide
        // the only title/results navigation and leave a static mine behind.
        I.suppress('pause');
        if (app.state === 'results') title();
        else ui._close();
        I.consumeAll();
        app.idleAt = game.real;
      }
      const axes = I.move();
      const meaningfulAxis =
        Math.max(Math.abs(axes[0] - lastAxes[0]), Math.abs(axes[1] - lastAxes[1])) > 0.35 &&
        Math.hypot(...axes) > 0.55;
      if (I.anyPressed() || meaningfulAxis) {
        if (app.state === 'attract') {
          activity('gamepad');
          I.clear();
          I.consumeAll();
        } else app.idleAt = game.real;
      }
      lastAxes = axes;
      if (!online && app.state === 'title' && game.real - app.idleAt >= 10 - 1e-8) beginAttract();
      if (game.real > app.nextHud && !app.testing) {
        app.nextHud = game.real + 0.1;
        hud();
      }
    });
  }
  if (online) {
    app.mine = new P.Mine({ seed: hub.seed, roster: hub.players });
    app.started = false;
    link = new P.HubLink(hub, hub.isHost ? app.mine : null, {
      onView: (m) => {
        app.mine = m;
      },
      onEvents: receiveEvents,
      onEpoch: () => {
        clearInput();
        hudStamp = '';
      },
    });
    app.mine = link.view;
    game.allowJoin(false);
    unsubscribes.push(
      hub.on('start', () => {
        app.started = true;
        clearInput();
      }),
      hub.on('leave', ({ id }) => {
        link.leave(id);
        if (hub.isHost) receiveEvents(app.mine.takeEvents());
      }),
      hub.on('time-up', () => {
        if (hub.isHost && !app.ended) {
          const won = app.mine.status === 'victory';
          if (!won) app.mine.finish(false, 'The shift whistle blew.');
          link.finish(won);
        }
      }),
      hub.on('end', () => end()),
    );
  } else if (!server) title();
  function update(dt) {
    if (app.ended || !app.mine || dt <= 0) return;
    const m = app.mine;
    if (online) {
      const local = server ? P.neutral() : controls.read();
      if (app.started && hub.time() >= 0) {
        if (hub.isHost && !link.finished) {
          m.step(link.intents(local), dt);
          const events = m.takeEvents();
          receiveEvents(events);
          link.publish(events);
        }
        link.update(dt, local);
        app.mine = link.view;
        if (hub.isHost && ['victory', 'failure'].includes(m.status)) {
          if (m.status === 'failure') link.finish(false);
          else {
            app.resultAt ||= game.real + 1.8;
            if (game.real >= app.resultAt) link.finish(true);
          }
        }
      }
    } else if (app.state === 'play' || app.state === 'attract') {
      const speed = app.state === 'attract' ? 2.5 : app.slow;
      app.accumulator += dt * speed;
      while (app.accumulator >= P.STEP - 1e-8) {
        app.accumulator -= P.STEP;
        let intents = app.injected || {};
        if (app.state === 'attract' || app.scenario)
          intents = Object.fromEntries(m.players.map((p) => [p.id, pilot.intent(m, p)]));
        else if (!app.injected)
          intents = Object.fromEntries(game.players.map((i, n) => [n, controls.read(i, n)]));
        m.step(intents, P.STEP);
        receiveEvents(m.takeEvents());
        if (['victory', 'failure'].includes(m.status)) {
          if (app.state === 'attract') {
            demoAge++;
            app.mine = new P.Mine({ seed: 73082 + demoAge, attract: true });
            pilot = new P.Pilot(demoAge % 3);
            app.accumulator = 0;
          } else if (m.status === 'victory') {
            app.resultAt ||= game.real + 1.8;
            if (game.real >= app.resultAt) results();
          } else results();
          break;
        }
      }
    }
    if (!server) {
      view.update(dt, app.mine, app.state === 'title');
      audio.update(dt, {
        chamber: app.mine.chamber,
        pressure: app.mine.pressure,
        relief: app.mine.relief,
        status: app.mine.status,
        finale: app.mine.finale,
        attract: app.state === 'attract',
      });
    }
  }
  function draw(r) {
    if (app.mine && view) view.draw(r, app.mine, { ...comfort(), title: app.state === 'title' });
  }
  function end() {
    if (app.ended) return;
    app.ended = true;
    app.state = 'ended';
    link?.end();
    audio?.stop();
    controls?.dispose();
    abort.abort();
    for (const off of unsubscribes) off();
    if (interval !== null) clearInterval(interval);
    if (renderRequest !== null) cancelAnimationFrame(renderRequest);
    game.dispose();
    if (!server) {
      ui?.hide();
      $('hud').hidden = true;
      $('menu-button').hidden = true;
      $('context').hidden = true;
      $('attract-banner').hidden = true;
    }
    document.body.dataset.ended = 'true';
  }
  game.start({ update, draw, pausable: true, camera: { zoom: false } });
  if (online) {
    let previous = performance.now();
    interval = setInterval(() => {
      const now = performance.now();
      game.advance(Math.min(0.1, (now - previous) / 1000));
      previous = now;
    }, 8);
    if (server) document.body.dataset.server = 'true';
    else {
      const present = () => {
        if (app.ended) return;
        game.advance(0, { draw: true });
        renderRequest = requestAnimationFrame(present);
      };
      renderRequest = requestAnimationFrame(present);
    }
  }
  if (online) hub.ready();
  $('boot').hidden = true;
  document.body.dataset.ready = 'true';
  document.title = P.TITLE;
  const api = (globalThis.__pd = {
    game,
    app,
    get mine() {
      return app.mine;
    },
    ui,
    controls,
    view,
    audio,
    link,
    start,
    title,
    pause,
    settings,
    about,
    developer,
    practice,
    end,
    advance(seconds, intents = null, render = false) {
      app.injected = intents;
      game.advance(seconds, { draw: render });
      app.injected = null;
      hud();
    },
    snapshot() {
      return {
        state: app.state,
        screen: ui?.screen || null,
        paused: game.paused,
        online,
        server,
        ended: app.ended,
        music: S.music,
        best: E.store.get('PD:completed-best', 0),
        mine: app.mine.snapshot(),
        network: link?.diagnostics() || null,
      };
    },
    script(route = 0, maxSeconds = 900) {
      if (online) throw new Error('Script driver is standalone only');
      const b = new P.Pilot(route);
      app.testing = true;
      const steps = Math.ceil(maxSeconds / P.STEP);
      for (let n = 0; n < steps && app.state === 'play'; n++) {
        app.injected = Object.fromEntries(app.mine.players.map((p) => [p.id, b.intent(app.mine, p)]));
        game.advance(P.STEP);
      }
      app.injected = null;
      app.testing = false;
      hud();
      return {
        status: app.mine.status,
        time: app.mine.time,
        stats: app.mine.stats,
        features: app.mine.features,
      };
    },
  });
  game.debug = { snapshot: api.snapshot };
  game.stateHash = () => [app.mine.tick, app.mine.score, app.mine.chamber, app.mine.rng.state];
  window.addEventListener(
    'pagehide',
    () => {
      audio?.stop();
      if (!online) game.stop();
    },
    { once: true },
  );
})().catch((error) => {
  console.error(error);
  document.getElementById('boot').textContent = 'The mine could not open: ' + error.message;
  document.body.dataset.failed = 'true';
});
