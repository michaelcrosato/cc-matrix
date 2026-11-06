/* Adapted from the full ARCADE kit's scene, fixed-step, grid and cabinet patterns.
   Simultaneous seats, campaign and encounter rules are original game systems. */
(function (root) {
  'use strict';
  const E = root.My3D2dge,
    I = root.IW,
    online = !!root.AIHub?.active;
  const game = new E.Game({
    id: 'the-incurable-wizard',
    canvas: 'screen',
    res: [640, 360],
    portrait: { res: [400, 640] },
    expand: true,
    view: 'topdown',
    views: ['topdown'],
    input: I.PRESET,
    bg: '#100e1c',
    fullscreen: 'button',
    autoPause: !online,
    live: online,
    menu: {
      quit: online ? false : 'title',
      controls: {
        moveUp: 'Move north',
        moveDown: 'Move south',
        moveLeft: 'Move west',
        moveRight: 'Move east',
        aimUp: 'Aim north',
        aimDown: 'Aim south',
        aimLeft: 'Aim west',
        aimRight: 'Aim east',
        fire: 'Lantern rifle',
        up: false,
        down: false,
        left: false,
        right: false,
      },
      settings: [
        { key: 'music', value: 0.1 },
        { key: 'glyphs', value: 'playstation' },
        {
          key: 'voices',
          group: 'Sound',
          label: 'Wizard gibberish',
          type: 'slider',
          value: 0.7,
          apply: (g, v) => {
            g.audio.voiceVolume = v;
            g.audio.applyVolume();
          },
        },
        {
          key: 'assistance',
          group: 'Game',
          label: 'Touch auto-fire',
          type: 'toggle',
          value: true,
          help: 'Only fires at a visible target in a clear cardinal lane. Separate score category.',
        },
        {
          key: 'contrast',
          group: 'Comfort',
          label: 'Radar contrast',
          type: 'toggle',
          value: true,
        },
      ],
    },
  });
  let storage;
  try {
    storage = root.localStorage;
  } catch {}
  const vault = new I.Vault(storage);
  const app = (I.app = {
    game,
    world: null,
    vault,
    controls: new I.Controls(game),
    stage: new I.Stage(game),
    audio: new I.Sound(game),
    demo: false,
    idle: 0,
    creditsPage: 0,
    devPage: 0,
    lastSaved: -1,
    recorded: false,
    debugGrid: false,
    resetting: false,
    coopMode: 'keyboard-pad',
  });
  app.network = new I.Network(app, root.AIHub);
  const ui = new E.Shell(game, {
    tv: true,
    theme: {
      ink: '#f0dcbb',
      paper: '#211c2d',
      accent: '#e9bf83',
      muted: '#b8a4bb',
      line: '#705c79',
      font: 'Georgia, serif',
      titleFont: 'Georgia, serif',
    },
    screens: {
      pause: {
        kicker: online
          ? 'ONLINE — THE DUNGEON CONTINUES'
          : 'A MOMENT OF PROFESSIONAL DOUBT',
        actions: [
          ['Developer', () => showDev()],
          ['How to play', () => help(0)],
          ['About / Credits', () => credits(0)],
        ],
      },
    },
  });
  app.ui = ui;
  function clearInputs() {
    app.controls.clear();
    game.input.consumeAll();
  }
  function showTitle() {
    const wasDemo = app.demo;
    app.demo = false;
    app.world = null;
    app.recorded = false;
    app.idle = 0;
    app.audio.resume();
    app.audio.lastEvent = 0;
    app.stage.seenEvent = 0;
    app.stage.pulses = [];
    if (!wasDemo) resetDev();
    while (game.players.length > 1) game.removePlayer(2);
    game.input.pad = 'any';
    game.paused = false;
    ui.hide();
    game.go('title', null, { fade: 0 });
  }
  app.title = showTitle;
  function titleMenu() {
    ui.show('title', {
      kicker: 'A MENAGERIE OF BAD DECISIONS',
      name: I.TITLE,
      subtitle: I.TAGLINE,
      meta: ['6 chambers', '1–2 wardens', 'Arcade dungeon'],
      actions: [
        ['Play', () => setup(false)],
        ['Couch co-op', () => coop()],
        ['Settings', () => game.menu('settings')],
        ['How to play', () => help(0)],
        ['About / Credits', () => credits(0)],
      ],
      footer: () =>
        game.input.lastDevice === 'gamepad'
          ? game.input.label('confirm') +
            ' Choose   ' +
            game.input.label('cancel') +
            ' Back'
          : 'Enter Choose  •  Arrows Navigate',
    });
  }
  function setup(coop) {
    app.seats = coop ? [0, 1] : [0];
    ui.show('setup', {
      kicker: coop
        ? 'TWO RIFLES. ONE DUNGEON.'
        : 'PLEASE SELECT YOUR DISCOMFORT',
      title: 'Make an appointment',
      text: 'Every bolt stays yours until it hits.\nChoose the pressure. All six floors await.',
      actions: [
        [
          'Gentle — 5 lives, longer warnings',
          () => app.begin('Gentle', app.seats),
        ],
        [
          'Normal — 3 lives, intended pressure',
          () => app.begin('Normal', app.seats),
        ],
        [
          'Fierce — 3 lives, sharper company',
          () => app.begin('Fierce', app.seats),
        ],
        ...(vault.data.checkpoint
          ? [['Continue saved descent', () => app.continue()]]
          : []),
        ['Back', () => ui.back()],
      ],
    });
  }
  function coop() {
    ui.show('coop', {
      kicker: 'SIMULTANEOUS CO-OP',
      title: 'Bring a second opinion',
      text: 'Wardens pass through each other. Bolts do too.\nScore and radar belong to the team.\nOnline play starts through an AI Hub session.',
      actions: [
        [
          'Keyboard + controller',
          () => {
            app.coopMode = 'keyboard-pad';
            setup(true);
          },
        ],
        [
          'Two controllers',
          () => {
            app.coopMode = 'pads';
            setup(true);
          },
        ],
        [
          'Shared keyboard',
          () => {
            app.coopMode = 'keys';
            setup(true);
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function configureSeats(seats, context) {
    while (game.players.length > 1) game.removePlayer(2);
    game.input.pad = 'any';
    game.input.use(I.PRESET);
    if (seats.length > 1 && context !== 'hub' && context !== 'attract') {
      if (app.coopMode === 'keys') {
        const q = game.addPlayer({ keys: 'right' });
        game.input.use(I.PRESET);
        q.use({
          ...I.PRESET,
          moveUp: ['KeyI'],
          moveDown: ['KeyK'],
          moveLeft: ['KeyJ'],
          moveRight: ['KeyL'],
          aimUp: ['Numpad8'],
          aimDown: ['Numpad2'],
          aimLeft: ['Numpad4'],
          aimRight: ['Numpad6'],
          fire: ['ShiftRight'],
          up: ['KeyI', 'ArrowUp'],
          down: ['KeyK', 'ArrowDown'],
          left: ['KeyJ', 'ArrowLeft'],
          right: ['KeyL', 'ArrowRight'],
        });
        game.input.pad = null;
      } else if (app.coopMode === 'pads') {
        game.input.pad = 0;
        game.addPlayer({ pad: 1 });
      } else {
        game.input.pad = null;
        game.addPlayer({ pad: 0 });
      }
    }
    game.input.padIndex = null;
    game.input.padId = '';
    game.input.padPrev = [];
    clearInputs();
  }
  app.begin = (
    difficulty = 'Normal',
    seats = [0],
    context = 'campaign',
    seed,
  ) => {
    if (app.network.active && context !== 'hub') return;
    if (context !== 'attract') resetDev();
    ui.hide();
    game.resume();
    configureSeats(seats, context);
    app.world = new I.World({
      difficulty,
      seats,
      context,
      seed: seed || (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0 || 1,
      assistance: game.input.lastDevice === 'touch' && game.settings.assistance,
    });
    app.demo = context === 'attract';
    app.recorded = false;
    app.lastSaved = -1;
    app.audio.resume();
    app.audio.lastEvent = 0;
    app.stage.seenEvent = 0;
    app.stage.rigs.clear();
    app.stage.pulses = [];
    game.go('play', null, { fade: 0 });
  };
  app.continue = () => {
    if (app.network.active || !vault.data.checkpoint) return;
    try {
      const w = new I.World(vault.data.checkpoint.config);
      w.restore(vault.data.checkpoint);
      configureSeats(w.config.seats, 'campaign');
      app.world = w;
      ui.hide();
      game.resume();
      app.audio.resume();
      app.audio.lastEvent = w.eventSeq;
      app.stage.seenEvent = w.eventSeq;
      game.go('play', null, { fade: 0 });
    } catch {
      vault.clear();
      ui.toast('The old seal is broken', 'Start a new descent.');
    }
  };
  const HELP = [
    [
      'One bolt is a commitment',
      'Move with the left stick or WASD. Aim with the right stick, arrows, or mouse. Fire with R2 / Cross, Space, or left click. A pale mark shows the selected cardinal lane. The rifle lights again only when your bolt resolves. A nearby wall returns it sooner.',
    ],
    [
      'Trust the radar',
      'Knobbles hop in plain sight. Broad-jawed Hushjaws and angular Needlekin vanish behind corners. Sharing a clear row or column with either warden reveals them, whichever way you face. The radar always shows their location. It never shows the Wizard.',
    ],
    [
      'Make a useful noise',
      'Shoot an illuminated brass bell. It consumes your bolt, reveals hunters within 3 cells for 1.25 seconds and lures nearby hunters along legal paths for up to 1.5 seconds. The bell needs 5 seconds to recover. It does nothing to the Wizard.',
    ],
    [
      'Doors, moths, and multipliers',
      'Wardens and hunters wrap through the paired side gates. Bolts stop there. After the hunt, the winged Ledger Moth flees toward the announced gate. Catch it to double the next chamber. Banish that floor’s Wizard to double again, up to 4x. Final-floor bonuses multiply the 5,000 exit bounty.',
    ],
    [
      'Your colleague has perished',
      'Each hit costs a life. A returning warden glows safely for 1.25 seconds. An exhausted partner watches, then returns with one life at descent. The third and fourth descents restore a capped life. Retry restores the complete chamber-entry checkpoint and marks the run Practice.',
    ],
    [
      'Other ways to be brave',
      'Shared keyboard: P1 WASD + arrows + Space; P2 IJKL + numpad 8/4/2/6 + right Shift. Keyboard + controller assigns the pad only to P2. Two controllers use their own seats. Touch: invisible left thumb movement, right thumb aim and fire; tap an aligned bell or visible hunter to fire. Visible-target auto-fire is optional in Settings.',
    ],
    [
      'Online co-operation',
      'AI Hub provides online sessions for 1–2 players. It loads this game directly and owns the round, restart, and results. The host simulates one shared world. Local menus neutralize your controls while the dungeon continues. Create + Options belongs to the Hub. Standalone co-op shares one screen.',
    ],
  ];
  function help(page) {
    const p = (page + HELP.length) % HELP.length;
    ui.show('help', {
      kicker: `FIELD NOTES ${p + 1} / ${HELP.length}`,
      title: HELP[p][0],
      text: HELP[p][1],
      actions: [
        ['Next note', () => help(p + 1)],
        ['Previous', () => help(p - 1)],
        ['Back', () => ui.back()],
      ],
    });
  }
  function credits(page) {
    const data = root.INCURABLE_INTERVIEW || {},
      s = data.sourceInformation || {},
      pages = [
        [
          'Source Information',
          Object.entries(s)
            .slice(0, 7)
            .map(([k, v]) => k + ': ' + v)
            .join('\n\n'),
        ],
        [
          'Source Information · continued',
          Object.entries(s)
            .slice(7)
            .map(([k, v]) => k + ': ' + v)
            .join('\n\n'),
        ],
        [
          'Original work & research',
          'Inspired by The Incredible Wizard (Astrocade, 1982), a licensed Wizard of Wor adaptation. Original title, wardens, hunters, Ledger Moth, bells, maps, score economy, compositions, gibberish and finale made for this game. Native Humanoid / Blob rigs and core candle prop: my-3D2dge.\n\nManual: ballyalley.com/cart_manuals/text_manuals/incredible_wizard.txt\nScan: ballyalley.com/cart_manuals/pdf_manuals/Incredible_Wizard,_The.pdf\nContemporary feature: vgpavilion.com/mags/1982/12/vi/conquering-the-incredible-wizard/\nHardware footage: archive.org/details/IncredibleWizardBallyArcadeAstrocade1982\n\nRead and cross-checked manual scan; article has discrepancies, manual wins. Inspected hardware video frames. No human listening check. Historical AI and exact sound synthesis: unknown.',
        ],
        [
          'Testing Feedback',
          (data.testingFeedback || [])
            .map((v, i) => i + 1 + '. ' + v)
            .join('\n\n'),
        ],
        [
          'Engine Feedback',
          (data.engineFeedback || [])
            .slice(0, 3)
            .map((v, i) => i + 1 + '. ' + v)
            .join('\n\n'),
        ],
        [
          'Engine Feedback · continued',
          (data.engineFeedback || [])
            .slice(3)
            .map((v, i) => i + 4 + '. ' + v)
            .join('\n\n'),
        ],
        [
          'Prompt Feedback',
          (data.promptFeedback || [])
            .map((v, i) => i + 1 + '. ' + v)
            .join('\n\n'),
        ],
      ];
    const p = (page + pages.length) % pages.length;
    ui.show('credits', {
      kicker: `THE INCURABLE WIZARD · ${p + 1} / ${pages.length}`,
      title: pages[p][0],
      text: pages[p][1],
      actions: [
        ['Next page', () => credits(p + 1)],
        ['Previous', () => credits(p - 1)],
        ['Back', () => ui.back()],
      ],
    });
  }
  app.credits = credits;
  const ranges = {
    playerSpeed: [2, 7, 0.1],
    boltSpeed: [5, 30, 0.5],
    fireInterval: [0.08, 1.2, 0.01],
    hopperSpeed: [0.5, 3, 0.1],
    stalkerSpeed: [0.5, 4, 0.1],
    skitterSpeed: [1, 5, 0.1],
    pressureRate: [0, 0.02, 0.001],
    pressureCap: [1, 2, 0.05],
    spawnSpacing: [0.5, 8, 0.1],
    familiarSpeed: [1, 6, 0.1],
    wizardInterval: [1.5, 6, 0.1],
    wizardAttack: [0.3, 2, 0.05],
    wizardWarning: [0.5, 3, 0.05],
    protection: [0.5, 3, 0.05],
    bellRevealRadius: [1, 6, 0.1],
    bellRevealTime: [0.5, 3, 0.05],
    bellLureRadius: [1, 8, 0.1],
    bellLureTime: [0.3, 3, 0.05],
    bellCooldown: [2, 10, 0.1],
    touchAssist: [0, 1, 0.1],
  };
  for (const [k, [min, max, step]] of Object.entries(ranges))
    game.settings.define({
      key: 'dev_' + k,
      group: 'Controls',
      label:
        k === 'pressureRate'
          ? 'Pressure growth per second'
          : k.replace(/([A-Z])/g, ' $1'),
      unit: /Time|Interval|Attack|Warning|Spacing|Cooldown|protection/.test(k)
        ? ' s'
        : /Speed/.test(k)
          ? ' cells/s'
          : /Radius/.test(k)
            ? ' cells'
            : '',
      type: 'slider',
      value: I.DEFAULTS[k],
      min,
      max,
      step,
    });
  for (const spec of [
    {
      key: 'dev_timeScale',
      label: 'Slow motion',
      type: 'slider',
      value: 1,
      min: 0.1,
      max: 1,
      step: 0.1,
    },
    {
      key: 'dev_invulnerable',
      label: 'Invulnerable',
      type: 'toggle',
      value: false,
    },
    {
      key: 'dev_lives',
      label: 'Lives per warden',
      type: 'slider',
      value: 3,
      min: 1,
      max: 9,
      step: 1,
    },
    {
      key: 'dev_grid',
      label: 'Grid / collision / radar diagnostics',
      type: 'toggle',
      value: false,
    },
  ])
    game.settings.define({ ...spec, group: 'Controls' });
  game.settings.onChange = (k) => {
    if (
      k === 'assistance' &&
      app.world &&
      game.input.lastDevice === 'touch' &&
      game.settings.assistance
    )
      app.world.config.assistance = true;
    if (!k.startsWith('dev_') || app.resetting) return;
    if (k === 'dev_grid') {
      app.debugGrid = game.settings[k];
      if (app.debugGrid && app.world && !app.network.active)
        app.world.practice = true;
      return;
    }
    if (app.network.active) return;
    const w = app.world;
    if (!w) return;
    w.practice = true;
    const key = k.slice(4),
      v = game.settings[k];
    if (key === 'timeScale') game.timeScale = v;
    else if (key === 'invulnerable') w.invulnerable = v;
    else if (key === 'lives') {
      for (const p of w.players) {
        p.lives = v;
        if (!p.alive) w.respawn(p);
      }
    } else w.tuning[key] = v;
  };
  function resetDev() {
    app.resetting = true;
    for (const [k, v] of Object.entries(I.DEFAULTS))
      game.settings.set('dev_' + k, v);
    game.settings.set('dev_timeScale', 1);
    game.settings.set('dev_invulnerable', false);
    game.settings.set('dev_lives', 3);
    game.settings.set('dev_grid', false);
    game.timeScale = 1;
    app.debugGrid = false;
    if (app.world) {
      app.world.tuning = { ...I.DEFAULTS };
      app.world.invulnerable = false;
    }
    app.resetting = false;
  }
  function mutate(fn) {
    if (app.network.active || !app.world) return;
    app.world.practice = true;
    fn(app.world);
    clearInputs();
    if (ui.screen === 'devencounters') devEncounters();
    else showDev(app.devPage);
  }
  const devPages = [
    ['Movement & fire', ['playerSpeed', 'boltSpeed', 'fireInterval']],
    [
      'Hunter pressure',
      [
        'hopperSpeed',
        'stalkerSpeed',
        'skitterSpeed',
        'pressureRate',
        'pressureCap',
        'spawnSpacing',
      ],
    ],
    [
      'Familiar & Wizard',
      ['familiarSpeed', 'wizardInterval', 'wizardAttack', 'wizardWarning'],
    ],
    [
      'Bell & respawn',
      [
        'protection',
        'bellRevealRadius',
        'bellRevealTime',
        'bellLureRadius',
        'bellLureTime',
        'bellCooldown',
      ],
    ],
    [
      'Clock & assistance',
      ['timeScale', 'invulnerable', 'lives', 'touchAssist', 'grid'],
    ],
  ];
  function showDev(p = 0) {
    app.devPage = (p + devPages.length) % devPages.length;
    const w = app.world;
    if (!w) return;
    const [title, keys] = devPages[app.devPage];
    ui.show('dev', {
      kicker: app.network.active
        ? 'ONLINE · DIAGNOSTICS ONLY'
        : `DEVELOPER · ${w.practice ? 'PRACTICE' : 'CHANGES MARK PRACTICE'}`,
      title,
      text: `Seed ${w.config.seed}  ·  Tick ${w.tick}\n${w.room.name} / ${w.phase} · ${w.enemies.length} live / ${w.queue.filter((s) => !s.done).length} queued\nSliders affect living actors immediately. Spawn spacing retimes queued warnings.`,
      rows: (app.network.active ? ['grid'] : keys).map((k) => 'dev_' + k),
      actions: [
        ['Next tuning page', () => showDev(app.devPage + 1)],
        ...(!app.network.active
          ? [
              ['Encounter tools', () => devEncounters()],
              [
                'Step one simulation tick',
                () =>
                  mutate((w) => {
                    w.step(1 / 120, {});
                    app.stage.update(w, 1 / 120);
                  }),
              ],
              [
                'Reset to defaults',
                () => {
                  resetDev();
                  showDev(app.devPage);
                },
              ],
              ['Restart chamber', () => mutate((w) => w.retry())],
              [
                'Restart run',
                () => app.begin(w.config.difficulty, w.config.seats),
              ],
            ]
          : []),
        [
          'Resume',
          () => {
            ui.hide();
            game.resume();
            clearInputs();
          },
        ],
      ],
    });
  }
  function devEncounters() {
    const action = (label, fn) => [
      label,
      () => {
        mutate(fn);
      },
    ];
    ui.show('devencounters', {
      kicker: 'PRACTICE TOOLS',
      title: 'Rearrange the appointment',
      text: 'Room selection preserves team score. All world changes exclude records.',
      actions: [
        action('Next chamber', (w) => w.loadRoom((w.roomIndex + 1) % 6)),
        action('Previous chamber', (w) => w.loadRoom((w.roomIndex + 5) % 6)),
        action('Force hunt', (w) => w.loadRoom(w.roomIndex)),
        action('Force familiar chase', (w) => {
          w.enemies = [];
          w.queue.forEach((s) => (s.done = true));
          w.beginFamiliar();
        }),
        action('Force Wizard intrusion', (w) => {
          w.enemies = [];
          w.familiar = null;
          w.setPhase('Intrusion');
          w.manifest = 0;
          w.nextWizard(0.1);
        }),
        action('Force final manifestations', (w) => {
          w.loadRoom(5);
          w.queue.forEach((s) => (s.done = true));
          w.setPhase('Intrusion');
          w.nextWizard(0.1);
        }),
        ...Object.entries(I.FAMILIES).map(([k, v]) =>
          action('Spawn ' + v.name, (w) => w.spawn(k, [10, 1])),
        ),
        action('Remove all hunters', (w) => {
          w.enemies = [];
        }),
        action('Clear chamber', (w) => {
          w.enemies = [];
          w.queue.forEach((s) => (s.done = true));
          w.familiar = null;
          w.wizard = null;
          w.clearRoom();
        }),
        ['Back', () => ui.back()],
      ],
    });
  }
  function results(w) {
    if (app.network.active) return;
    if (!app.recorded) {
      vault.record(w);
      app.recorded = true;
    }
    ui.show('results', {
      kicker:
        w.status === 'victory'
          ? 'THE MENAGERIE IS OPEN. HE REMAINS INCURABLE.'
          : 'THE MANAGEMENT SENDS ITS REGARDS.',
      title: w.status === 'victory' ? 'Discharged!' : 'A difficult diagnosis',
      emblem: w.status === 'victory' ? 'VI' : '×',
      text: w.practice
        ? 'Practice run · excluded from local records'
        : w.config.difficulty +
          (w.config.assistance ? ' · assisted' : ' · standard') +
          ' · team score',
      stats: [
        [w.score.toLocaleString(), 'POINTS'],
        [`${w.roomIndex + (w.status === 'victory' ? 1 : 0)} / 6`, 'CHAMBERS'],
        [
          `${Math.floor(w.elapsed / 60)}:${String(Math.floor(w.elapsed % 60)).padStart(2, '0')}`,
          'TIME',
        ],
      ],
      medals: [
        ['Familiar intercepted', w.familiars > 0],
        ['Wizard banished', w.banishments > 0],
        ['Bell keeper', w.bells > 0],
      ],
      sections: w.players.map((p, i) => [
        `Warden ${i + 1}`,
        `${p.kills} contributions · ${p.shots} bolts committed`,
      ]),
      actions: [
        ...(w.status === 'defeat'
          ? [
              [
                'Retry chamber · Practice',
                () => {
                  w.retry();
                  ui.hide();
                  game.resume();
                  app.recorded = false;
                  app.audio.resume();
                },
              ],
            ]
          : []),
        ['New run', () => app.begin(w.config.difficulty, w.config.seats)],
        ['Credits', () => credits(0)],
        ['Title', showTitle],
      ],
    });
  }
  function beginAttract() {
    if (app.network.active) return;
    ui.hide();
    game.resume();
    app.begin('Normal', [0, 1], 'attract', 1953);
    app.demo = true;
    app.demoTime = 0;
    app.demoSegment = -1;
  }
  function demoStep(dt) {
    app.demoTime += dt;
    const seg = Math.floor(app.demoTime / 18) % 6,
      w = app.world;
    if (seg !== app.demoSegment) {
      app.demoSegment = seg;
      w.loadRoom(seg);
      w.phase = 'Hunt';
      w.phaseTime = 0;
      w.enemies = [];
      w.queue.forEach((s) => (s.done = true));
      w.spawn('hopper', [15, 5]);
      w.spawn(seg === 1 ? 'stalker' : 'skitter', [12, 9]);
      if (seg === 2) {
        w.players[0].m.place(10, 5);
        w.players[0].aim = 3;
        w.spawn('stalker', [9, 2]);
      }
      if (seg === 3) w.players[0].m.place(1, 6);
    }
    const t = app.demoTime % 18,
      cmd = {};
    for (const p of w.players) cmd[p.seat] = I.bot(w, p);
    if (seg === 2 && t < 2) cmd[0] = { move: -1, aim: 3, fire: true };
    if (seg === 3 && t < 0.6) cmd[0] = { move: 2, aim: 2, fire: false };
    if (t > 8 && t < 8 + dt) {
      w.enemies = [];
      w.beginFamiliar();
    }
    if (t > 12 && t < 12 + dt && seg !== 0) {
      w.familiar = null;
      w.setPhase('Intrusion');
      w.nextWizard(0.1);
    }
    w.step(dt, cmd);
    if (w.status !== 'playing') w.status = 'playing';
  }
  const intentional = (e) => {
    app.idle = 0;
    if (!app.demo) return false;
    showTitle();
    clearInputs();
    e?.preventDefault?.();
    e?.stopImmediatePropagation?.();
    return true;
  };
  app.controls.intent = intentional;
  if (ui.root)
    ui.root.addEventListener('pointermove', (e) => {
      const b = e.target.closest('button,input');
      if (b && Math.hypot(e.movementX || 0, e.movementY || 0) > 1)
        b.focus({ preventScroll: true });
    });
  game.hook('input', (dt) => {
    if (app.network.ended) {
      game.input.clear();
      return;
    }
    const pad =
      game.input.lastDevice === 'gamepad' &&
      (game.input.anyPressed() ||
        Math.hypot(...(game.input.padMove || [0, 0])) > 0.3 ||
        Math.hypot(...(game.input.padAim || [0, 0])) > 0.3);
    if (pad) {
      if (app.demo) {
        intentional();
        game.input.consumeAll();
        return;
      }
      app.idle = 0;
    }
    if (!app.network.active && game.sceneName === 'title') {
      app.idle += dt;
      if (app.idle >= 10) beginAttract();
    }
  });
  const scenes = {
    title: {
      camera: { zoom: false, wheel: false },
      enter() {
        titleMenu();
        app.idle = 0;
        game.cam.offset = [game.W * 0.24, game.H * 0.14];
        game.cam.smooth = 0;
        game.focus(220, 110, 0);
        app.audio.music('title');
      },
      update(dt) {
        game.cam.offset = [game.W * 0.24, game.H * 0.14];
        game.focus(220, 110, 0);
        app.stage.titleWizard.update(dt, {
          x: 220,
          y: 110,
          pose: 'cast',
          facing: Math.PI / 2,
          expr: 'angry',
        });
        app.audio.update(null, dt);
      },
      draw(r) {
        app.stage.drawTitle(r, game.real);
      },
    },
    play: {
      pausable: true,
      input: I.PRESET,
      touch: [],
      camera: { zoom: false, wheel: false },
      enter() {
        clearInputs();
        app.stage.layout();
      },
      update(dt) {
        const w = app.world;
        if (!w) return;
        app.stage.layout();
        if (app.network.ended) return;
        if (app.demo) demoStep(dt);
        else if (app.network.active) {
          const p = w.players.find((p) => p.seat === app.network.hub.me),
            c = app.controls.sample(w, p);
          app.network.step(dt, c);
        } else if (!ui.screen) {
          const commands = {};
          for (let i = 0; i < w.players.length; i++)
            commands[w.players[i].seat] = app.controls.sample(
              w,
              w.players[i],
              game.players[i] || game.input,
            );
          w.step(dt, commands);
        }
        app.stage.update(w, dt);
        app.audio.update(w, dt, app.demo);
        if (!app.demo && !app.network.active) {
          if (w.roomIndex !== app.lastSaved && w.status === 'playing') {
            vault.save(w);
            app.lastSaved = w.roomIndex;
          }
          if (w.status !== 'playing' && !ui.screen) results(w);
        }
      },
      draw(r) {
        app.stage.draw(r, app.world, { demo: app.demo, grid: app.debugGrid });
      },
    },
  };
  game.fadeTime = 0;
  game.start({ scenes, scene: online ? 'play' : 'title' });
  game.debug = {
    snapshot: () => ({
      title: I.TITLE,
      scene: game.sceneName,
      screen: ui.screen,
      demo: app.demo,
      paused: game.paused,
      network: {
        active: app.network.active,
        started: app.network.started,
        ended: app.network.ended,
        finished: app.network.finished,
        sent: app.network.sent,
        maxBytes: app.network.maxBytes,
      },
      world: app.world?.snapshot() || null,
      settings: { music: game.settings.music, glyphs: game.settings.glyphs },
      errors: game.errors,
    }),
    command: (cmds, seconds = 1 / 120) => {
      if (app.network.active) return;
      const w = app.world;
      if (!w) return;
      for (let t = 0; t < seconds; t += 1 / 120) w.step(1 / 120, cmds);
      app.stage.update(w, seconds);
    },
    setup: (fn) => {
      if (app.network.active) return;
      app.world.practice = true;
      fn(app.world);
    },
    begin: app.begin,
    credits,
    dev: showDev,
    help,
    results: () => app.world && results(app.world),
    attract: beginAttract,
  };
  root.__game = game;
  if (root.AIHub) app.network.connect();
})(globalThis);
