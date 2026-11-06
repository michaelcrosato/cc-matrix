/* GAME START — native ARCADE kit shell adapted for simultaneous lane combat. */
(() => {
  'use strict';
  const E = My3D2dge,
    { px } = E,
    { Sim, ROOMS, DEFAULTS } = WizardSim;
  const neutral = () => ({ move: -1, aim: -1, fire: false });
  const TITLE = 'The Inconspicuous Wizard';
  const MENU = {
    up: ['KeyW', 'ArrowUp', 'Pad12'],
    down: ['KeyS', 'ArrowDown', 'Pad13'],
    left: ['KeyA', 'ArrowLeft', 'Pad14'],
    right: ['KeyD', 'ArrowRight', 'Pad15'],
    start: ['Enter', 'Pad9'],
    pause: ['Escape', 'KeyP', 'Pad9'],
    confirm: ['Enter', 'Space', 'Pad0'],
    cancel: ['Escape', 'Backspace', 'Pad1'],
    fire: ['Space', 'Mouse0', 'Pad7', 'Pad0'],
    aimUp: ['ArrowUp', 'PadRAxisUp'],
    aimDown: ['ArrowDown', 'PadRAxisDown'],
    aimLeft: ['ArrowLeft', 'PadRAxisLeft'],
    aimRight: ['ArrowRight', 'PadRAxisRight'],
  };
  const PLAY = {
    ...MENU,
    up: ['KeyW', 'Pad12'],
    down: ['KeyS', 'Pad13'],
    left: ['KeyA', 'Pad14'],
    right: ['KeyD', 'Pad15'],
  };
  let app,
    ui,
    renderer,
    audio,
    sim,
    net,
    demo = null,
    demoAge = 0,
    demoPart = -1,
    lastInput = 0,
    inputMode = '',
    resultFor = null,
    checkpointRoom = -1,
    devPause = false,
    devStep = false,
    slow = 1,
    pointerMoved = false,
    wakeUntil = 0,
    wakeClickUntil = 0,
    selectedSeats = 1,
    creditPage = 0;
  const wakingPointers = new Set();
  const touch = {
    contacts: new Map(),
    move: [0, 0],
    aim: [0, 0],
    fire: false,
    active: false,
  };
  const readStorage = (key, fallback) => {
    try {
      const d = JSON.parse(localStorage.getItem('inconspicuous:v1:' + key));
      return d?.v === 1 ? d.data : fallback;
    } catch {
      return fallback;
    }
  };
  const writeStorage = (key, data) => {
    try {
      localStorage.setItem(
        'inconspicuous:v1:' + key,
        JSON.stringify({ v: 1, data }),
      );
      return true;
    } catch {
      return false;
    }
  };
  let saved = readStorage('campaign', null),
    records = readStorage('records', {});
  if (
    !saved?.state ||
    saved.state.version !== 1 ||
    !Number.isInteger(saved.state.roomIndex) ||
    saved.state.roomIndex < 0 ||
    saved.state.roomIndex > 5 ||
    !Array.isArray(saved.state.players) ||
    !saved.state.players.length ||
    !Array.isArray(saved.state.enemies) ||
    !saved.state.tuning
  )
    saved = null;
  if (!records || typeof records !== 'object' || Array.isArray(records))
    records = {};
  const settings = [
    { key: 'music', value: 0.1 },
    { key: 'glyphs', value: 'playstation' },
    {
      key: 'voices',
      label: 'Wizard voice',
      type: 'slider',
      value: 0.65,
      min: 0,
      max: 1,
      step: 0.05,
      group: 'Sound',
      apply: (g, v) => {
        g.audio.voiceVolume = v;
        g.audio.applyVolume();
      },
    },
    {
      key: 'contrast',
      label: 'High contrast radar',
      type: 'toggle',
      value: false,
      group: 'Comfort',
    },
    {
      key: 'radarAssist',
      label: 'Stronger radar warnings',
      type: 'toggle',
      value: false,
      group: 'Game',
      help: 'Brighter blips and more frequent radar tones. Recorded in a separate assistance category.',
    },
    {
      key: 'touchAssist',
      label: 'Touch lane assistance',
      type: 'toggle',
      value: true,
      group: 'Game',
      help: 'Auto-fire only at a visible target in a clear cardinal lane. One bolt still applies.',
    },
  ];
  const game = new E.Game({
    id: 'inconspicuous-wizard-v1',
    canvas: 'screen',
    res: [640, 360],
    portrait: { res: [360, 640] },
    expand: true,
    view: 'topdown',
    views: ['topdown'],
    input: MENU,
    bg: '#100d17',
    fullscreen: 'button',
    autoPause: true,
    menu: {
      items: [['Developer', () => showDeveloper()]],
      settings,
      controls: {
        fire: 'Lantern rifle',
        aimUp: 'Aim up',
        aimDown: 'Aim down',
        aimLeft: 'Aim left',
        aimRight: 'Aim right',
      },
      quit: 'title',
    },
  });
  game.fadeTime = 0.16;
  audio = new WizardAudio(game);
  renderer = new WizardRenderer(game);
  const helpPages = [
    {
      title: 'One lantern. One bolt.',
      text: 'Your rifle holds a single bolt in flight. A long miss leaves you empty until it strikes something. A nearby wall gives your shot back sooner.',
      sections: [
        [
          'THE WARDENS',
          'WASD / left stick to move. Mouse, arrows / right stick to aim. Left click, Space / R2 or ✕ to fire. Hold to fire again when ready.',
        ],
        [
          'KEEP YOUR BACK COVERED',
          'You can turn your aim while standing still. Partners pass through each other and never hurt one another.',
        ],
      ],
    },
    {
      title: 'Trust the little machine.',
      text: 'Mawlers and Needlewicks vanish around corners. Share an open row or column with either warden to see them. Radar always knows where the ordinary hunters are.',
      sections: [
        [
          'BELL POSTS',
          'Shoot a brass bell to reveal nearby hunters and briefly draw them toward its sound. Your bolt is spent. The bell needs time to ring again.',
        ],
        [
          'TWO DOORS. ONE DUNGEON.',
          'Blue side gates carry wardens and hunters across the board. Bolts stop at the gate. Arrivals cannot immediately bounce back.',
        ],
      ],
    },
    {
      title: 'Do not let the wings escape.',
      text: 'After the hunt, a Gildwing makes for a glowing side gate. Intercept it to double the NEXT chamber’s points. Letting it escape still opens the next floor.',
      sections: [
        [
          'THE OWNER OBJECTS',
          'The Wizard warns you with a rune, then appears and fires cardinal lightning. One hit banishes a manifestation. He never appears on radar. A bell will not fool him.',
        ],
        [
          'BONUS ON THE NEXT FLOOR',
          'Gildwing: next ×2. Banish the Wizard too: next ×4. On the last floor, this bonus multiplies the announced 1,000-point exit bounty.',
        ],
      ],
    },
    {
      title: 'Bring a second lantern.',
      text: 'Couch co-op is simultaneous. Choose keyboard + controller, two controllers, or two keyboard seats. Your score and revealed lanes are shared.',
      sections: [
        [
          'KEYBOARD PARTNER',
          'Seat 1: WASD, Space, mouse or IJKL aim. Seat 2: arrows, right Shift, numpad 8/4/5/6 aim. A controller is assigned exclusively to its seat.',
        ],
        [
          'ONLINE CO-OP',
          'Launch this game through an AI Hub shared-world session for 1–2 online wardens. Hub supplies the session and starts the round. Local menus leave the online dungeon running.',
        ],
        [
          'TOUCH',
          'Drag an invisible left-thumb stick to move. Drag on the right to aim. With lane assistance, a ready rifle fires at visible aligned enemies. Tap a visible aligned hunter or bell to fire.',
        ],
      ],
    },
  ];
  function help(page = 0) {
    const h = helpPages[page];
    ui.show('help', {
      kicker: `FIELD MANUAL · ${page + 1} / ${helpPages.length}`,
      title: h.title,
      text: h.text,
      sections: h.sections,
      actions: [
        [
          page < 3 ? 'Next page' : 'Back',
          () => (page < 3 ? help(page + 1) : ui.back()),
        ],
        ['Close manual', () => ui.back()],
      ],
    });
  }
  ui = new E.Shell(game, {
    tv: true,
    theme: {
      ink: '#f3ecd7',
      paper: 'rgba(22,18,29,.97)',
      accent: '#e6b46f',
      muted: '#aea8b5',
      danger: '#f18583',
      line: '#66516b',
      font: '"Trebuchet MS", sans-serif',
      titleFont: 'Georgia, serif',
    },
    screens: {
      pause: {
        kicker: 'LANTERNS AT REST',
        title: 'Take a breath.',
        text: () =>
          net?.active
            ? 'Online: the shared dungeon continues. Your warden waits while this menu is open.'
            : 'The dungeon will wait. Your unfinished chamber is held here.',
      },
      help: {
        title: 'Field manual',
        actions: [['Read the manual', () => help(0)]],
      },
    },
  });
  // Native Shell owns every screen, focus, slider, rebinding and controller path.
  ui.root?.addEventListener('pointermove', (ev) => {
    const b = ev.target.closest('button,input');
    if (b && document.activeElement !== b) b.focus({ preventScroll: true });
  });
  function clearInput() {
    game.players.forEach((i) => i.clear());
    touch.contacts.clear();
    touch.move = [0, 0];
    touch.aim = [0, 0];
    touch.fire = false;
    pointerMoved = false;
  }
  function replaceScreen(name, spec) {
    ui.hide();
    ui.show(name, spec);
  }
  function title() {
    if (net?.active) return;
    demo = null;
    sim = null;
    resultFor = null;
    devPause = false;
    slow = 1;
    game.timeScale = 1;
    audio.silence();
    audio.music('title');
    clearInput();
    lastInput = game.real;
    while (game.players.length > 1) game.removePlayer(2);
    game.input.pad = 'any';
    game.o.autoPause = true;
    game.live = false;
    replaceScreen('title', {
      kicker: 'A LANTERN-WARDEN ARCADE ADVENTURE',
      name: 'The\nInconspicuous\nWizard',
      subtitle: 'He would prefer you hadn’t noticed.',
      text: 'Six chambers. One shot at a time.',
      actions: [
        ['Play', () => setup(1)],
        ['Co-op', () => coop()],
        ['Settings', () => game.menu('settings')],
        ['How to play', () => help()],
        ['About / Credits', () => credits(0)],
      ],
      meta: ['1–2 WARDENS', 'SIX CHAMBERS', 'ONE BOLT'],
      footer: 'Inspired by The Incredible Wizard · 1982',
    });
    document.body.dataset.mode = 'title';
  }
  function setup(seats) {
    selectedSeats = seats;
    ui.show('setup', {
      kicker:
        seats === 2 ? 'TWO LANTERNS · ONE SHARED SCORE' : 'ENTER THE MENAGERIE',
      title: 'How bold is your lantern?',
      text: 'Every difficulty contains the complete six-chamber descent.',
      actions: [
        ['Gentle · five lives, patient hunters', () => begin('gentle', seats)],
        ['Normal · three lives, a fair warning', () => begin('normal', seats)],
        [
          'Fierce · three lives, impatient company',
          () => begin('fierce', seats),
        ],
        ...(saved && seats === 1
          ? [
              [
                `Continue · chamber ${(saved.state?.roomIndex || 0) + 1}`,
                () => continueRun(),
              ],
            ]
          : []),
        ['Back', () => ui.back()],
      ],
    });
  }
  function coop() {
    ui.show('coop', {
      kicker: 'COUCH CO-OP',
      title: 'Who holds the other lantern?',
      text: 'Two wardens share the maze and score. Each keeps their own bolt and lives.',
      actions: [
        [
          'Keyboard + controller',
          () => {
            assignSeats('mixed');
            setup(2);
          },
        ],
        [
          'Two controllers',
          () => {
            assignSeats('pads');
            setup(2);
          },
        ],
        [
          'Two keyboard seats',
          () => {
            assignSeats('keys');
            setup(2);
          },
        ],
        [
          'Online · AI Hub instructions',
          () =>
            ui.show('online-help', {
              kicker: 'AI HUB SHARED-WORLD',
              title: 'Enter together through AI Hub.',
              text: 'Open this HTML in AI Hub and invite a partner to the session. Hub assigns your seats, synchronizes the start, and presents the results. This standalone file also plays solo or couch co-op.',
              actions: [['Back', () => ui.back()]],
            }),
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  let seatMode = 'solo';
  function assignSeats(mode) {
    seatMode = mode;
    while (game.players.length > 1) game.removePlayer(2);
    game.input.pad = mode === 'pads' ? 0 : null;
    if (mode === 'mixed' || mode === 'pads')
      game.addPlayer({ pad: mode === 'pads' ? 1 : 0 });
    else if (mode === 'keys') game.addPlayer({ keys: 'right' });
    clearInput();
  }
  function begin(difficulty = 'normal', seats = 1) {
    if (net?.active) return;
    if (seats === 1) {
      while (game.players.length > 1) game.removePlayer(2);
      game.input.pad = 'any';
      seatMode = 'solo';
    }
    sim = new Sim({
      difficulty,
      seats,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    });
    sim.s.assisted =
      !!game.settings.radarAssist ||
      (touch.active && game.settings.touchAssist);
    game.timeScale = 1;
    slow = 1;
    devPause = false;
    resultFor = null;
    checkpointRoom = -1;
    demo = null;
    audio.lastEvent = 0;
    ui.hide();
    clearInput();
    game.go('play');
    document.body.dataset.mode = 'play';
  }
  function continueRun() {
    try {
      sim = new Sim({
        difficulty: saved.state.difficulty || 'normal',
        seats: 1,
      });
      sim.load(saved);
      resultFor = null;
      checkpointRoom = -1;
      ui.hide();
      clearInput();
      game.go('play');
      document.body.dataset.mode = 'play';
    } catch {
      saved = null;
      writeStorage('campaign', null);
      setup(1);
    }
  }
  function record() {
    if (!sim || net?.active || demo || sim.s.practice) return;
    const s = sim.s,
      key =
        s.difficulty +
        ':' +
        (s.assisted ? 'assisted' : 'standard') +
        ':' +
        s.seats;
    records[key] = Math.max(records[key] || 0, s.score);
    writeStorage('records', records);
    writeStorage('campaign', null);
    saved = null;
  }
  function results() {
    const s = sim.s;
    if (resultFor === s.phase) return;
    resultFor = s.phase;
    audio.music(s.phase);
    clearInput();
    if (s.phase === 'victory') record();
    const victory = s.phase === 'victory';
    replaceScreen('results', {
      kicker: victory
        ? 'THE MENAGERIE IS OPEN'
        : 'THE MENAGERIE KEEPS ITS SECRETS',
      title: victory
        ? 'Well. That was conspicuous.'
        : 'Your lantern goes quiet.',
      text: victory
        ? 'The gates settle. The creatures scatter into harmless sparks. Somewhere upstairs, a very small voice insists this was all intended.'
        : 'The owner is delighted. You needn’t give him the last word.',
      emblem: victory ? '✦' : '◇',
      stats: [
        [String(s.score).padStart(6, '0'), 'TEAM SCORE'],
        [`${s.roomIndex + 1} / 6`, 'CHAMBERS'],
        [
          `${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}`,
          'DESCENT',
        ],
        [
          s.practice ? 'PRACTICE' : (s.difficulty || 'normal').toUpperCase(),
          'RECORD CATEGORY',
        ],
      ],
      sections: s.players.map((p, i) => [
        `WARDEN ${i + 1}`,
        `${p.stats?.kills || p.kills || 0} hunter catches · ${p.stats?.shots || p.shots || 0} bolts committed`,
      ]),
      actions: [
        ...(!victory
          ? [
              [
                'Retry chamber · Practice',
                () => {
                  sim.retry();
                  resultFor = null;
                  ui.hide();
                  clearInput();
                  game.resume();
                },
              ],
            ]
          : []),
        [
          'New run',
          () => {
            title();
            setup(s.seats || 1);
          },
        ],
        ['Credits', () => credits(0)],
        ['Title', () => game.go('title')],
      ],
    });
    document.body.dataset.mode = s.phase;
  }
  function credits(page = 0) {
    creditPage = page;
    const info = globalThis.WIZARD_INTERVIEW;
    let pages;
    if (info) {
      const s = info.sourceInformation;
      pages = [
        {
          title: 'An original menagerie.',
          kicker: 'ABOUT · 1 / 5',
          sections: [
            [
              'CREATED FOR THIS GAME',
              'Wardens, lantern rifles, Bramblehops, Mawlers, Needlewicks, Gildwings, bell posts, portals, room layouts, writing and compositions are original code-native work. Generic lantern props and humanoid/blob primitives come from my-3D2dge.',
            ],
            [
              'INSPIRED BY',
              'The Incredible Wizard (Astrocade, 1982), created by Tom McHugh, Scot Norris and Julie Malan; licensed from Bally/Midway’s Wizard of Wor. No original graphics, audio, code or room layouts are copied.',
            ],
            ['ART & ANIMATION', s.artDirection + ' ' + s.animation],
            ['AUDIO & ONLINE', s.audio + ' ' + s.online],
          ],
        },
        {
          title: 'Source Information',
          kicker: 'BUILD PROVENANCE · 2 / 5',
          sections: Object.entries(s).map(([k, v]) => [
            k.replace(/([A-Z])/g, ' $1').toUpperCase(),
            String(v),
          ]),
        },
        {
          title: 'Testing Feedback',
          kicker: 'VERIFICATION · 3 / 5',
          sections: info.testingFeedback.map((a, i) => [
            [
              'ISSUES CAUGHT',
              'CRITICAL ISSUES',
              'MOST HELPFUL TEST',
              'LEAST HELPFUL TEST',
            ][i],
            a,
          ]),
        },
        {
          title: 'Engine Feedback',
          kicker: 'CRAFT NOTES · 4 / 5',
          sections: info.engineFeedback.map((a, i) => [
            [
              'LIKED MOST',
              'GUESSES & BLOCKERS',
              'BUILT FOR THIS GAME',
              'HARDEST PART',
              'ENGINE CHANGES',
              'ONE REQUEST',
            ][i],
            a,
          ]),
        },
        {
          title: 'Prompt Feedback',
          kicker: 'BUILD NOTES · 5 / 5',
          sections: info.promptFeedback.map((a, i) => [
            ['LIKED MOST', 'CONFUSING', 'HARDEST TASK', 'ONE CHANGE'][i],
            a,
          ]),
        },
      ];
    } else
      pages = [
        {
          title: TITLE,
          kicker: 'ABOUT',
          sections: [
            [
              'SOURCE',
              'The Incredible Wizard (Astrocade, 1982). Original game, assets and music inspired by its one-shot maze combat.',
            ],
            [
              'TECH',
              'my-3D2dge 0.89.1 · AI Hub client 1.4.0 · JavaScript / Web Audio.',
            ],
            ['USAGE', 'added on import'],
          ],
        },
      ];
    // Keep provenance readable across a room: short native pages, in field order.
    const shortPages = [];
    for (const original of pages) {
      let sections = [],
        characters = 0;
      for (const section of original.sections || []) {
        const count = section[0].length + section[1].length;
        if (
          sections.length &&
          (sections.length === 2 || characters + count > 650)
        ) {
          shortPages.push({ ...original, sections });
          sections = [];
          characters = 0;
        }
        sections.push(section);
        characters += count;
      }
      if (sections.length) shortPages.push({ ...original, sections });
    }
    pages = shortPages;
    const c = pages[page % pages.length];
    c.kicker =
      c.kicker.split('·')[0].trim() + ` · ${page + 1} / ${pages.length}`;
    ui.show('credits', {
      ...c,
      actions: [
        [
          page < pages.length - 1 ? 'Next page' : 'Back',
          () => (page < pages.length - 1 ? credits(page + 1) : ui.back()),
        ],
        ['Return', () => ui.back()],
      ],
    });
  }
  const tuningSpecs = {
    playerSpeed: [2, 7, 0.1, 'Warden speed'],
    boltSpeed: [5, 25, 0.5, 'Bolt speed'],
    fireInterval: [0.05, 0.6, 0.01, 'Minimum shot interval'],
    hopperSpeed: [0.3, 3, 0.1, 'Bramblehop speed'],
    stalkerSpeed: [0.4, 4, 0.1, 'Mawler speed'],
    skitterSpeed: [0.6, 5, 0.1, 'Needlewick speed'],
    pressureGrowth: [0, 0.02, 0.001, 'Pressure growth'],
    pressureCap: [1, 2, 0.05, 'Pressure cap'],
    spawnSpacing: [0.3, 8, 0.1, 'Spawn spacing'],
    familiarSpeed: [1, 8, 0.1, 'Gildwing speed'],
    wizardTeleport: [1, 12, 0.1, 'Wizard relocation'],
    wizardAttack: [0.4, 5, 0.1, 'Lightning interval'],
    wizardWarning: [0.5, 3, 0.05, 'Wizard warning'],
    respawnProtection: [0.5, 3, 0.05, 'Respawn protection'],
    revealRadius: [1, 6, 0.25, 'Bell reveal radius'],
    revealDuration: [0.25, 3, 0.05, 'Reveal duration'],
    lureRadius: [1, 8, 0.25, 'Lure path radius'],
    lureDuration: [0.25, 3, 0.05, 'Lure duration'],
    postCooldown: [2, 12, 0.25, 'Bell cooldown'],
  };
  for (const [k, [min, max, step, label]] of Object.entries(tuningSpecs))
    game.settings.define({
      key: 'dev_' + k,
      label,
      type: 'slider',
      group: 'Controls',
      min,
      max,
      step,
      value: DEFAULTS[k] ?? min,
      apply: (g, v) => {
        if (sim && !net?.active) {
          sim.s.tuning[k] = v;
          sim.s.practice = true;
        }
      },
    });
  function mutate(action, value) {
    if (!sim || net?.active) return;
    sim.dev(action, value);
    sim.s.practice = true;
    resultFor = null;
  }
  function showDeveloper(page = 0) {
    const online = net?.active;
    const s = sim?.s;
    const pages = [
      [
        'MOVEMENT & WEAPON',
        ['playerSpeed', 'boltSpeed', 'fireInterval', 'respawnProtection'],
      ],
      [
        'HUNTERS & PRESSURE',
        [
          'hopperSpeed',
          'stalkerSpeed',
          'skitterSpeed',
          'pressureGrowth',
          'pressureCap',
          'spawnSpacing',
        ],
      ],
      [
        'THE OWNER & HIS WINGS',
        ['familiarSpeed', 'wizardTeleport', 'wizardAttack', 'wizardWarning'],
      ],
      [
        'BELL POSTS',
        [
          'revealRadius',
          'revealDuration',
          'lureRadius',
          'lureDuration',
          'postCooldown',
        ],
      ],
    ];
    if (page > 0) {
      const [label, keys] = pages[page - 1];
      ui.show('dev-tuning', {
        kicker: label,
        title: 'Balance bench',
        text: online
          ? 'Online diagnostics only. World changes are disabled.'
          : 'Live values affect current actors immediately. Any change marks this run Practice.',
        rows: online ? [] : keys.map((k) => 'dev_' + k),
        actions: [['Back', () => ui.back()]],
      });
      return;
    }
    ui.show('developer', {
      kicker: online
        ? 'ONLINE · READ-ONLY DIAGNOSTICS'
        : 'DEVELOPER · PRACTICE RUN',
      title: 'The bellkeeper’s bench.',
      text: `Seed ${s?.seed ?? 'unknown'} · Chamber ${(s?.roomIndex || 0) + 1} · ${s?.phase || 'title'}\nQueued ${s?.pending?.filter((q) => q.status === 'waiting').length ?? 0} · Living ${s?.enemies?.length || 0}\n${online ? 'The shared world continues. Hub owns round restart.' : 'World changes invalidate ranked records.'}`,
      actions: [
        [
          'Show grid / collision / sight',
          () => {
            app.debugDraw = !app.debugDraw;
            ui.toast(
              'Diagnostic overlay',
              app.debugDraw
                ? 'Grid, collision centers and revealed sight lanes.'
                : 'Overlay off.',
            );
          },
        ],
        ...(!online
          ? [
              [
                'Next chamber',
                () => {
                  mutate('room', ((sim.s.roomIndex || 0) + 1) % 6);
                  ui.hide();
                  game.resume();
                },
              ],
              [
                'Restart chamber',
                () => {
                  mutate('restart');
                  ui.hide();
                  game.resume();
                },
              ],
              [
                'Restart run · Practice',
                () => {
                  const d = sim.s.difficulty,
                    n = sim.s.seats;
                  begin(d, n);
                  sim.s.practice = true;
                },
              ],
              [
                'Pause / resume simulation',
                () => {
                  devPause = !devPause;
                  ui.toast(
                    'Simulation',
                    devPause ? 'Single-step enabled.' : 'Running.',
                  );
                },
              ],
              [
                'Single step',
                () => {
                  devPause = true;
                  sim.s.practice = true;
                  sim.step(
                    1 / 120,
                    sim.s.players.map(() => neutral()),
                  );
                },
              ],
              [
                'Slow motion · ' + (slow === 1 ? 'off' : 'on'),
                () => {
                  slow = slow === 1 ? 0.3 : 1;
                  sim.s.practice = true;
                },
              ],
              [
                'Invulnerability · ' + (sim?.s.invulnerable ? 'on' : 'off'),
                () => mutate('invulnerable', !sim.s.invulnerable),
              ],
              ['Give five lives', () => mutate('lives', 5)],
              ...['hopper', 'stalker', 'skitter'].map((k, i) => [
                ['Spawn Bramblehop', 'Spawn Mawler', 'Spawn Needlewick'][i],
                () => mutate('spawn', k),
              ]),
              ...['hopper', 'stalker', 'skitter'].map((k, i) => [
                ['Remove Bramblehops', 'Remove Mawlers', 'Remove Needlewicks'][
                  i
                ],
                () => mutate('remove', k),
              ]),
              ['Remove ordinary hunters', () => mutate('clearEnemies')],
              [
                'Force familiar chase',
                () => {
                  mutate('phase', 'familiar');
                  ui.hide();
                  game.resume();
                },
              ],
              [
                'Force Wizard intrusion',
                () => {
                  mutate('phase', 'intrusion');
                  ui.hide();
                  game.resume();
                },
              ],
              [
                'Force finale',
                () => {
                  mutate('room', 5);
                  mutate('phase', 'intrusion');
                  ui.hide();
                  game.resume();
                },
              ],
              ...pages.map(([name], i) => [name, () => showDeveloper(i + 1)]),
              [
                'Reset to defaults',
                () => {
                  sim.dev('reset');
                  game.timeScale = 1;
                  slow = 1;
                  devPause = false;
                  app.debugDraw = false;
                  for (const k of Object.keys(tuningSpecs))
                    game.settings.set('dev_' + k, DEFAULTS[k]);
                  ui.toast(
                    'Defaults restored',
                    'Every override and simulation speed has been reset.',
                  );
                },
              ],
            ]
          : []),
        ['Back', () => ui.back()],
      ],
    });
  }
  function quantize(x, y, previous = -1, dead = 0.2) {
    if (Math.hypot(x, y) < dead) return -1;
    if (previous >= 0) {
      const v = [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ][previous],
        along = x * v[0] + y * v[1],
        cross = Math.abs(x * v[1] - y * v[0]);
      if (along > 0 && cross < along * 1.25) return previous;
    }
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 0 : 2) : y > 0 ? 1 : 3;
  }
  const aimMemory = [-1, -1],
    moveMemory = [-1, -1];
  function commands(seat = 0) {
    if (wakeUntil > game.real || ui.screen || game.paused || net?.ended)
      return neutral();
    const I = game.players[seat] || game.input,
      p =
        sim?.s.players?.find((p) => p.seat === seat) || sim?.s.players?.[seat];
    if (!p) return neutral();
    let [mx, my] = I.move(),
      ax = 0,
      ay = 0,
      fire = I.down('fire');
    if (seatMode === 'keys') {
      const held = game.input.held;
      if (seat === 0) {
        mx = Number(held.has('KeyD')) - Number(held.has('KeyA'));
        my = Number(held.has('KeyS')) - Number(held.has('KeyW'));
        ax = Number(held.has('KeyL')) - Number(held.has('KeyJ'));
        ay = Number(held.has('KeyK')) - Number(held.has('KeyI'));
        fire = held.has('Space');
      } else {
        mx = Number(I.held.has('ArrowRight')) - Number(I.held.has('ArrowLeft'));
        my = Number(I.held.has('ArrowDown')) - Number(I.held.has('ArrowUp'));
        ax = Number(I.held.has('Numpad6')) - Number(I.held.has('Numpad4'));
        ay = Number(I.held.has('Numpad5')) - Number(I.held.has('Numpad8'));
        fire = I.held.has('ShiftRight') || I.held.has('Period');
      }
    } else {
      ax = I.value('aimRight') - I.value('aimLeft');
      ay = I.value('aimDown') - I.value('aimUp');
      if (I.padAim && I.lastDevice === 'gamepad') [ax, ay] = I.padAim;
    }
    const ownsPointer = net?.active ? seat === net.localSeat : seat === 0;
    if (ownsPointer && I.lastDevice === 'mouse' && pointerMoved) {
      const g = game.mouseGround();
      if (g) {
        ax = g[0] / 16 - 0.5 - p.x;
        ay = g[1] / 16 - 0.5 - p.y;
      }
    }
    if (ownsPointer && touch.active) {
      if (game.settings.touchAssist) {
        sim.s.assisted = true;
        sim.s.assistance = true;
      }
      [mx, my] = touch.move;
      [ax, ay] = touch.aim;
      fire = touch.fire;
      if (game.settings.touchAssist) {
        const targets = [
          ...(sim.s.enemies || []).filter((e) => e.visible && !(e.warning > 0)),
          ...(sim.s.familiar ? [sim.s.familiar] : []),
          ...(sim.s.wizard && sim.s.wizard.state !== 'warning'
            ? [sim.s.wizard]
            : []),
        ];
        let target = null,
          dist = Infinity;
        for (const e of targets) {
          const dx = e.x - p.x,
            dy = e.y - p.y;
          if (
            (Math.abs(dx) < 0.2 || Math.abs(dy) < 0.2) &&
            Math.hypot(dx, dy) < dist &&
            laneClear(p, e)
          ) {
            target = e;
            dist = Math.hypot(dx, dy);
          }
        }
        if (target && Math.hypot(ax, ay) < 0.2) {
          ax = target.x - p.x;
          ay = target.y - p.y;
          fire = true;
        }
      }
    }
    const move = quantize(mx, my, moveMemory[seat]);
    moveMemory[seat] = move;
    const aim = quantize(ax, ay, aimMemory[seat], 0.18);
    if (aim >= 0) aimMemory[seat] = aim;
    return { move, aim, fire: !!fire };
  }
  function laneClear(a, b) {
    const rows = ROOMS[sim.s.roomIndex].rows;
    const dx = Math.sign(b.x - a.x),
      dy = Math.sign(b.y - a.y);
    for (let d = 0.5; d < Math.hypot(b.x - a.x, b.y - a.y); d += 0.25) {
      const x = Math.round(a.x + dx * d),
        y = Math.round(a.y + dy * d);
      if (rows[y]?.[x] === '#') return false;
    }
    return true;
  }
  function intentional(ev) {
    if (ev.type === 'pointermove') {
      if (ev.pointerType !== 'mouse' || (!ev.movementX && !ev.movementY))
        return;
      if (Math.abs(ev.movementX) + Math.abs(ev.movementY) < 3) return;
      pointerMoved = true;
      game.input.lastDevice = 'mouse';
    }
    lastInput = game.real;
    if (demo) {
      wakeUntil = game.real + 0.2;
      wakeClickUntil = performance.now() + 600;
      if (ev.pointerId !== undefined) wakingPointers.add(ev.pointerId);
      demo = null;
      demoPart = -1;
      title();
      clearInput();
      ev.preventDefault?.();
      ev.stopImmediatePropagation?.();
      return;
    }
    if (ev.type === 'keydown' || ev.type === 'pointerdown') audio.unlock();
  }
  for (const kind of ['pointerup', 'pointercancel'])
    addEventListener(
      kind,
      (e) => {
        if (wakingPointers.delete(e.pointerId)) {
          wakeClickUntil = performance.now() + 600;
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  addEventListener(
    'click',
    (e) => {
      if (performance.now() < wakeClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  for (const type of [
    'keydown',
    'pointerdown',
    'pointermove',
    'touchstart',
    'wheel',
  ])
    addEventListener(type, intentional, { capture: true, passive: false });
  function setupTouch() {
    const canvas = game.screen.canvas;
    game.input.touchEnabled = false;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || ui.screen || demo) return;
      touch.active = true;
      game.input.lastDevice = 'touch';
      const side = e.clientX < innerWidth * 0.5 ? 'move' : 'aim';
      touch.contacts.set(e.pointerId, { side, x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (side === 'aim') {
        const p = sim?.s.players.find(
            (p) => p.seat === (net?.active ? net.localSeat : 0),
          ),
          sp = game.screen.clientToScreen(e.clientX, e.clientY),
          g = sp ? game.view.toGround(...sp) : null;
        touch.fire = true;
        if (p && g) touch.aim = [g[0] / 16 - 0.5 - p.x, g[1] / 16 - 0.5 - p.y];
      }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      const c = touch.contacts.get(e.pointerId);
      if (!c) return;
      touch[c.side] = [(e.clientX - c.x) / 48, (e.clientY - c.y) / 48];
      e.preventDefault();
    });
    const release = (e) => {
      const c = touch.contacts.get(e.pointerId);
      if (!c) return;
      touch[c.side] = [0, 0];
      if (c.side === 'aim') touch.fire = false;
      touch.contacts.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
  }
  function attract(dt) {
    if (!demo) {
      demo = new Sim({ difficulty: 'gentle', seats: 2, seed: 1982 });
      demo.s.practice = true;
      demo.s.invulnerable = true;
      demoAge = 0;
      demoPart = -1;
      ui.hide();
      document.body.dataset.mode = 'attract';
    }
    demoAge += dt;
    const part = Math.floor(demoAge / 14) % 6;
    if (part !== demoPart) {
      demoPart = part;
      demo.dev('room', part);
      demo.s.invulnerable = true;
      if (part === 1) demo.dev('phase', 'intrusion');
      if (part === 4) demo.dev('phase', 'familiar');
      if (part === 5) demo.dev('phase', 'intrusion');
    }
    demo.step(dt, [WizardSim.bot(demo, 0), WizardSim.bot(demo, 1)]);
    renderer.update(demo.s, dt);
    renderer.frame(demo.s);
    audio.events(demo.s);
  }
  function titleUpdate(dt) {
    if (!ui.screen && !demo && game.real - lastInput < 10) title();
    if (demo || game.real - lastInput >= 10) {
      attract(dt);
      return;
    }
    if (!app.titleSim) {
      app.titleSim = new Sim({ difficulty: 'gentle', seats: 2, seed: 1982 });
      app.titleSim.dev('room', 2);
      app.titleSim.s.invulnerable = true;
    }
    const s = app.titleSim;
    s.step(dt, [WizardSim.bot(s, 0), WizardSim.bot(s, 1)]);
    if (['clear', 'victory', 'defeat'].includes(s.s.phase)) s.dev('room', 2);
    renderer.update(s.s, dt);
    renderer.frame(s.s, { title: true });
  }
  function playUpdate(dt) {
    if (!sim) return;
    if (!net?.active && !ui.screen && !devPause) {
      sim.step(
        dt * slow,
        sim.s.players.map((p, i) => commands(i)),
      );
    }
    renderer.update(sim.s, dt, { remote: !!(net?.active && !net.isHost) });
    renderer.frame(sim.s);
    if (game.settings.radarAssist) sim.s.assisted = true;
    if (!net?.ended) audio.events(sim.s);
    if (net?.active) return;
    if (!demo && !sim.s.practice && sim.s.roomIndex !== checkpointRoom) {
      checkpointRoom = sim.s.roomIndex;
      saved = sim.save ? sim.save() : { version: 1, state: sim.snapshot() };
      writeStorage('campaign', saved);
    }
    if (['victory', 'defeat'].includes(sim.s.phase)) results();
  }
  function drawPortraitHUD(s, r) {
    const { W, H } = r,
      arena = renderer.layout.arena,
      room = ROOMS[s.roomIndex];
    r.overlay((g) => {
      const txt = (t, x, y, c = '#efe4cd', scale = 2, align = 'left') =>
        E.font.text(g, String(t), x, y, c, {
          scale,
          align,
          outline: false,
          shadow: '#0b101a',
        });
      px.rect(g, 12, 12, W - 24, 67, '#18131f');
      px.line(g, 12, 79, W - 12, 79, '#66516b');
      txt('INCONSPICUOUS', 20, 20, '#e6b46f', 2);
      txt('CHAMBER ' + (s.roomIndex + 1) + ' / 6', 20, 43, '#b7acc7', 1);
      txt(String(s.score).padStart(7, '0'), W - 20, 61, '#eee6ce', 2, 'right');
      txt(
        s.practice ? 'PRACTICE' : s.difficulty.toUpperCase(),
        20,
        63,
        s.practice ? '#f094aa' : '#8d9fa8',
        1,
      );
      const ry = arena.y + arena.h + 48,
        x = 24,
        y = ry,
        w = W - 48,
        h = 112;
      txt(
        {
          hunt: 'HUNT',
          familiar: 'CATCH THE WINGS',
          intrusion: 'THE OWNER OBJECTS',
          clear: 'CHAMBER OPEN',
          entry: 'READY',
          victory: 'RELEASED',
          defeat: 'LANTERNS LOST',
        }[s.phase] || s.phase,
        24,
        ry - 34,
        '#d9bd93',
        2,
      );
      px.rect(g, x - 5, y - 5, w + 10, h + 10, '#253841');
      px.rect(g, x, y, w, h, game.settings.contrast ? '#02070d' : '#0c1b24');
      for (let i = 1; i < 4; i++) {
        px.line(g, x + (i * w) / 4, y, x + (i * w) / 4, y + h, '#21404b');
        px.line(g, x, y + (i * h) / 4, x + w, y + (i * h) / 4, '#21404b');
      }
      px.line(
        g,
        x,
        y + ((s.time * 0.25) % 1) * h,
        x + w,
        y + ((s.time * 0.25) % 1) * h,
        '#4b807d',
      );
      for (const e of s.enemies) {
        const ex = x + (e.x / 18) * w,
          ey = y + (e.y / 12) * h,
          c =
            e.type === 'hopper'
              ? '#e6b46f'
              : e.type === 'stalker'
                ? '#a6e3d6'
                : '#f290a7';
        if (game.settings.radarAssist && !e.visible)
          px.disc(g, ex, ey, 7, '#34637b');
        if (e.type === 'stalker')
          px.poly(
            g,
            [
              [ex, ey - 4],
              [ex + 4, ey],
              [ex, ey + 4],
              [ex - 4, ey],
            ],
            c,
          );
        else if (e.type === 'skitter') {
          px.line(g, ex - 4, ey - 4, ex + 4, ey + 4, c, 2);
          px.line(g, ex - 4, ey + 4, ex + 4, ey - 4, c, 2);
        } else px.disc(g, ex, ey, 3, c);
      }
      for (const p of s.players)
        if (p.alive)
          px.rect(
            g,
            x + (p.x / 18) * w - 3,
            y + (p.y / 12) * h - 3,
            6,
            6,
            p.seat === 0 ? '#fff2b1' : '#d3b7ff',
          );
      txt(
        'ECHO RADAR · NO WIZARD SIGNAL',
        W / 2,
        y + h + 12,
        '#99c4c3',
        1,
        'center',
      );
      const sy = y + h + 38;
      s.players.forEach((p, i) => {
        const yy = sy + i * 29;
        txt(
          'P' + (p.seat + 1) + ' ' + (p.alive ? '♥'.repeat(p.lives) : 'FALLEN'),
          24,
          yy,
          p.seat === 0 ? '#efd09a' : '#cdb0ef',
        );
        txt(
          p.boltId ? 'IN FLIGHT' : 'READY',
          W - 24,
          yy,
          p.boltId ? '#c7919c' : '#b1e0be',
          2,
          'right',
        );
      });
      const by = sy + s.players.length * 29 + 8;
      px.line(g, 24, by - 8, W - 24, by - 8, '#514659');
      txt('THIS ×' + s.currentMultiplier, 24, by, '#e2c69a');
      txt('NEXT ×' + s.earnedNextMultiplier, W - 24, by, '#9ddaca', 2, 'right');
      txt(room.name, W / 2, H - 32, '#d4b482', 1, 'center');
      if (s.phase === 'entry' || s.phase === 'clear') {
        E.ui.box(g, 24, arena.y + arena.h / 2 - 35, W - 48, 70, {
          bg: '#181424',
          border: '#be9c75',
          alpha: 0.98,
        });
        txt(
          s.phase === 'clear'
            ? 'NEXT ×' + s.earnedNextMultiplier
            : 'READY, WARDEN.',
          W / 2,
          arena.y + arena.h / 2 - 15,
          '#ead2aa',
          2,
          'center',
        );
        txt(
          s.phase === 'clear'
            ? 'Your lantern remembers.'
            : 'Choose a lane. Commit a bolt.',
          W / 2,
          arena.y + arena.h / 2 + 11,
          '#baaaca',
          1,
          'center',
        );
      }
      if (demo)
        txt('DEMO · TOUCH TO RETURN', W / 2, H - 57, '#f1d398', 1, 'center');
      if (net?.active && !net.running)
        txt(
          'HUB · WAITING FOR START',
          W / 2,
          arena.y + arena.h / 2,
          '#eed6b1',
          1,
          'center',
        );
      if (touch.fire && touch.contacts.size) {
        px.disc(g, W - 40, H - 87, 13, '#243a3c');
        txt('✦', W - 40, H - 94, '#b6ebd6', 2, 'center');
      }
    });
  }
  function drawHUD(s, r) {
    if (renderer.layout?.portrait) {
      drawPortraitHUD(s, r);
      return;
    }
    const { W, H } = r,
      room = ROOMS[s.roomIndex],
      L = renderer.layout || {},
      rad = L.radar || { x: W - 142, y: 75, w: 120, h: 96 };
    r.overlay((g) => {
      const text = (t, x, y, c = '#f1e8d6', scale = 1, align = 'left') =>
        E.font.text(g, String(t), x, y, c, {
          scale,
          align,
          outline: false,
          shadow: '#080710',
        });
      px.rect(g, 14, 12, W - 28, 25, '#18131f');
      px.line(g, 14, 38, W - 14, 38, '#65516b');
      text('THE INCONSPICUOUS WIZARD', 23, 19, '#e9bd7a');
      text(
        `${String(s.roomIndex + 1).padStart(2, '0')} / 06`,
        W / 2,
        19,
        '#b5a8c4',
      );
      text(String(s.score).padStart(7, '0'), W - 88, 18, '#f1e8d6', 1, 'right');
      const x = rad.x,
        y = rad.y,
        w = rad.w || 120,
        h = rad.h || 82;
      px.rect(g, x - 4, y - 21, w + 8, h + 29, '#171b25');
      px.line(g, x - 4, y - 21, x + w + 4, y - 21, '#57727c');
      text('ECHO RADAR', x + 1, y - 14, '#a3d8d0');
      px.rect(g, x, y, w, h, game.settings.contrast ? '#02070d' : '#0b1820');
      for (let k = 1; k < 4; k++) {
        px.line(g, x + (k * w) / 4, y, x + (k * w) / 4, y + h, '#1b343e');
        px.line(g, x, y + (k * h) / 4, x + w, y + (k * h) / 4, '#1b343e');
      }
      const scan = (s.time * 0.24) % 1;
      px.line(g, x, y + scan * h, x + w, y + scan * h, '#446c6b');
      const plot = (e) => [x + (e.x / 18) * w, y + (e.y / 12) * h];
      for (const e of s.enemies || []) {
        if (e.alive === false) continue;
        const [ex, ey] = plot(e),
          c =
            e.type === 'hopper'
              ? '#efb76f'
              : e.type === 'stalker'
                ? '#a5e7db'
                : '#ef90a2';
        const a = e.type === 'skitter' ? 2 + Math.sin(s.time * 9) : 2;
        if (game.settings.radarAssist && !e.visible)
          px.disc(g, ex, ey, 5, '#34637b');
        if (e.type === 'stalker')
          px.poly(
            g,
            [
              [ex, ey - 3],
              [ex + 3, ey],
              [ex, ey + 3],
              [ex - 3, ey],
            ],
            c,
          );
        else if (e.type === 'skitter') {
          px.line(g, ex - a, ey - a, ex + a, ey + a, c);
          px.line(g, ex - a, ey + a, ex + a, ey - a, c);
        } else px.disc(g, ex, ey, a, c);
      }
      for (const p of s.players || []) {
        if (!p.alive) continue;
        const [ex, ey] = plot(p);
        px.rect(g, ex - 2, ey - 2, 4, 4, p.seat === 0 ? '#fff0b0' : '#cdb3ff');
      }
      text('N', x + w / 2, y - 2, '#5d8c95', 1, 'center');
      text('W', x - 6, y + h / 2, '#5d8c95');
      text('E', x + w + 1, y + h / 2, '#5d8c95');
      const infoY = y + h + 23;
      text('RIFLES', x, infoY, '#8f869e');
      s.players.forEach((p, i) => {
        const yy = infoY + 15 + i * 36;
        const ready = !(s.bolts || []).some(
          (b) => b.owner === p.id || b.ownerId === p.id || b.seat === p.seat,
        );
        px.disc(g, x + 3, yy + 3, 3, ready ? '#c7efac' : '#7b515c');
        text(
          `P${i + 1}  ${p.alive ? '♥'.repeat(Math.max(0, p.lives)) : 'FALLEN'}`,
          x + 13,
          yy,
          p.seat === 0 ? '#eed59d' : '#c8b2e9',
        );
        text(
          ready ? 'READY' : 'BOLT IN FLIGHT',
          x + 13,
          yy + 12,
          ready ? '#acc5aa' : '#b78d92',
        );
      });
      const yy = infoY + 15 + s.players.length * 36 + 4;
      text('THIS FLOOR', x, yy, '#8f869e');
      text(`×${s.currentMultiplier} POINTS`, x, yy + 13, '#eed59d');
      text(`NEXT  ×${s.earnedNextMultiplier}`, x, yy + 30, '#b1dfd2');
      px.rect(g, 14, H - 38, W - 28, 27, '#18131f');
      px.line(g, 14, H - 39, W - 14, H - 39, '#65516b');
      text(room.name, 23, H - 30, '#e9bd7a');
      const phaseLabel =
        {
          entry: 'READY YOUR LANTERN',
          hunt: 'HUNT',
          familiar: 'INTERCEPT THE GILDWING',
          intrusion: 'THE OWNER OBJECTS',
          clear: 'CHAMBER OPEN',
          victory: 'DUNGEON RELEASED',
          defeat: 'LANTERNS LOST',
        }[s.phase] || s.phase;
      text(phaseLabel, W - 25, H - 30, '#b9a8cc', 1, 'right');
      if (s.phase === 'entry' || s.phase === 'clear') {
        E.ui.box(g, W / 2 - 151, H / 2 - 32, 302, 64, {
          bg: '#1a1524',
          border: '#bd9365',
          alpha: 0.96,
        });
        text(
          s.phase === 'clear'
            ? `NEXT CHAMBER  ×${s.earnedNextMultiplier}`
            : room.name,
          W / 2,
          H / 2 - 19,
          '#f2d9ab',
          2,
          'center',
        );
        text(
          s.phase === 'clear'
            ? 'The lantern remembers your bonus.'
            : room.subtitle || 'Enter, warden. Mind the corners.',
          W / 2,
          H / 2 + 10,
          '#c4b6cf',
          1,
          'center',
        );
      }
      if (demo) {
        E.ui.box(g, W / 2 - 160, H - 74, 320, 28, {
          bg: '#151724',
          border: '#a8b68b',
        });
        text(
          'DEMONSTRATION · ANY INPUT TO RETURN',
          W / 2,
          H - 64,
          '#f0d796',
          1,
          'center',
        );
      } else if (s.practice)
        text('PRACTICE', W / 2, H - 48, '#ef94a5', 1, 'center');
      else if (s.phase === 'hunt' && s.roomIndex === 0) {
        const p = s.players[0],
          device = game.input.lastDevice;
        let hint = '';
        if (
          Math.abs(p.x - 1) < 0.2 &&
          Math.abs(p.y - 11) < 0.2 &&
          !p.stats.shots
        )
          hint =
            device === 'gamepad'
              ? 'LEFT STICK · move    RIGHT STICK · aim    R2 / ' +
                game.input.label('confirm') +
                ' · fire'
              : device === 'touch'
                ? 'LEFT THUMB · move    RIGHT THUMB · aim    aligned targets auto-fire'
                : 'WASD · move    MOUSE / ARROWS · aim    CLICK / SPACE · fire';
        else if (!p.stats.shots)
          hint =
            'Choose a lane and hold ' + game.input.label('fire') + ' to fire.';
        else if (p.stats.shots < 3)
          hint = p.boltId
            ? 'One bolt in flight. Reposition while it travels.'
            : 'Muzzle lit. Your bolt has returned.';
        if (hint) text(hint, W / 2, H - 49, '#d2c7df', 1, 'center');
      } else if (s.hint && s.roomTime < 10 && s.phase === 'hunt') {
        text(
          String(s.hint).slice(0, 78),
          W / 2,
          H - 49,
          '#d2c7df',
          1,
          'center',
        );
      }
      if (net?.active && !net.running)
        text(
          'AI HUB · WAITING FOR THE SHARED START',
          W / 2,
          H / 2,
          '#f8dfba',
          2,
          'center',
        );
      if (app.debugDraw)
        text(
          `SEED ${s.seed} · TICK ${s.tick} · ${s.enemies.length} HUNTERS`,
          23,
          45,
          '#a4f0c3',
        );
    });
  }
  game.hook('input', (dt) => {
    const menu = !!ui.screen,
      mode = (menu ? 'menu' : 'play') + ':' + seatMode;
    if (mode !== inputMode) {
      inputMode = mode;
      for (const I of game.players) {
        I.use(menu ? MENU : PLAY);
        I.touchEnabled = false;
      }
      if (seatMode === 'keys' && !menu) {
        game.input.use({
          ...PLAY,
          aimUp: ['KeyI'],
          aimDown: ['KeyK'],
          aimLeft: ['KeyJ'],
          aimRight: ['KeyL'],
        });
        const I = game.players[1];
        if (I)
          I.use({
            ...PLAY,
            up: ['ArrowUp'],
            down: ['ArrowDown'],
            left: ['ArrowLeft'],
            right: ['ArrowRight'],
            fire: ['ShiftRight', 'Period'],
            aimUp: ['Numpad8'],
            aimDown: ['Numpad5'],
            aimLeft: ['Numpad4'],
            aimRight: ['Numpad6'],
          });
      }
    }
    if (
      game.input.lastDevice === 'gamepad' &&
      (game.input.anyPressed() ||
        Math.hypot(...game.input.padMove) > 0.25 ||
        game.input.padAim)
    ) {
      lastInput = game.real;
      if (demo) {
        wakeUntil = game.real + 0.2;
        title();
        clearInput();
        game.input.consumeAll();
      } else audio.unlock();
    }
    if (net?.active) {
      game.live = true;
      game.o.autoPause = false;
      app.onlineCommand =
        app.forcedCommand || commands(net.localSeat >= 0 ? net.localSeat : 0);
      if (net.ended) clearInput();
    }
    if (demo && ui.screen) ui.hide();
    if (game.paused && !net?.active) audio.silence();
  });
  app = globalThis.__wizard = {
    game,
    ui,
    renderer,
    audio,
    get sim() {
      return sim || demo || app.titleSim;
    },
    get net() {
      return net;
    },
    debugDraw: false,
    onlineCommand: neutral(),
    start: begin,
    title,
    showDeveloper,
    help,
    credits,
    quantize,
    readStorage,
    writeStorage,
    snapshot: () => ({
      mode: document.body.dataset.mode,
      screen: ui.screen,
      paused: game.paused,
      sim: (sim || demo)?.snapshot(),
      network: net
        ? {
            active: net.active,
            running: net.running,
            ended: net.ended,
            server: net.server,
            isHost: net.isHost,
            localSeat: net.localSeat,
            metrics: net.metrics,
          }
        : null,
    }),
    test: {
      command: commands,
      assignSeats,
      neutral,
      feedCommand: (c) => {
        app.forcedCommand = c;
        app.onlineCommand = c || neutral();
      },
      advance: (seconds) => game.advance(seconds),
      state: () => sim?.snapshot(),
      load: (s) => {
        if (sim) sim.load(s);
      },
      botTick: (seconds) => {
        if (!sim) return;
        for (let i = 0; i < seconds * 120; i++)
          sim.step(
            1 / 120,
            sim.s.players.map((p, i) => WizardSim.bot(sim, i)),
          );
      },
      setCommand: (c) => {
        app.onlineCommand = c;
      },
      stop: () => {
        net?.dispose();
        audio.stop();
        game.stop();
      },
    },
  };
  game.debug = { snapshot: app.snapshot };
  globalThis.__game = game;
  game.start({
    scene: 'title',
    scenes: {
      title: {
        view: 'topdown',
        views: ['topdown'],
        camera: { zoom: false },
        enter: title,
        update: titleUpdate,
        draw: (r) => {
          const s = (demo || app.titleSim)?.s;
          if (s) {
            renderer.draw(s, r, { title: !demo, debug: app.debugDraw });
            if (demo) drawHUD(s, r);
          }
        },
      },
      play: {
        pausable: true,
        view: 'topdown',
        views: ['topdown'],
        camera: { zoom: false },
        update: playUpdate,
        draw: (r) => {
          if (sim) {
            renderer.draw(sim.s, r, { debug: app.debugDraw });
            drawHUD(sim.s, r);
          }
        },
        back() {
          game.menu();
          return true;
        },
      },
    },
  });
  setupTouch();
  net = new WizardNetwork({
    createSim: (o) => new Sim(o),
    onSession: (world, info) => {
      sim = world;
      demo = null;
      ui.hide();
      game.o.autoPause = false;
      game.o.menu.quit = false;
      game.live = true;
      game.go('play', null, { fade: 0 });
      document.body.dataset.mode = 'online';
      clearInput();
    },
    onStart: () => {
      clearInput();
    },
    onSnapshot: (world) => {
      sim = world;
    },
    onEnd: () => {
      audio.stop();
      clearInput();
      ui.hide();
      game.o.autoPause = false;
      game.live = false;
      game.pause('hub-end');
      document.body.dataset.mode = 'hub-end';
    },
    onLeave: () =>
      ui.toast('A lantern departs', 'The remaining warden continues.'),
    onError: (m) => ui.toast('Session information', m),
  });
  net
    .connect()
    .then((info) => {
      if (info)
        net.startPump(() =>
          ui.screen || game.paused || document.hidden
            ? neutral()
            : app.onlineCommand,
        );
    })
    .catch((e) => game.fail('Hub connection', e));
})();
/* GAME END */
