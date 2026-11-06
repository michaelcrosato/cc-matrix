import {
  TITLE,
  DT,
  ARENA,
  STONES,
  DEFAULTS,
  TUNING,
  tuning,
  clamp,
  tickOf,
} from './config.js';
import {
  COURTS,
  RIVALS,
  MATERIAL,
  connected,
  exportCourt,
  validateCourt,
} from './content.js';
import {
  createWorld,
  command,
  cancel,
  step,
  finish,
  powerOf,
  health,
  readyAt,
  createAI,
  aiStep,
  planShot,
  applyTuning,
  predict,
} from './sim.js';
import { Battlefield, TEAM } from './view.js';
import { SiegeAudio, formant, lute } from './audio.js';
import { OnlineMatch } from './online.js';
import { loadTour, saveTour, eraseTour } from './persistence.js';
import { REPORT } from './metadata.js';
export function boot(E, options = {}) {
  const INPUT = {
    ...E.Input.DEFAULT,
    fire: ['Space', 'Mouse0', 'Pad0'],
    previous: ['KeyQ', 'Pad4'],
    next: ['KeyE', 'Pad5'],
    abort: ['KeyC', 'Mouse2', 'Pad1'],
    fire2: ['ShiftRight'],
    previous2: ['KeyU'],
    next2: ['KeyO'],
  };
  const game = new E.Game({
    canvas: 'screen',
    id: 'smithereens-under-siege-v1',
    view: 'side',
    views: ['siege'],
    res: [960, 540],
    expand: true,
    input: INPUT,
    headless: options.headless,
    draw: options.draw,
    loop: options.loop,
    fullscreen: false,
    corner: true,
    live: !!globalThis.AIHub?.active,
    menu: {
      quit: globalThis.AIHub?.active ? false : 'title',
      controls: {
        fire: 'Hold / release sling',
        previous: 'Previous stone',
        next: 'Next stone',
        abort: 'Cancel charge',
        fire2: 'P2 hold / release',
        previous2: 'P2 previous stone',
        next2: 'P2 next stone',
        attack: false,
        dash: false,
        skill: false,
        jump: false,
      },
      settings: [
        { key: 'music', value: 0.1 },
        { key: 'glyphs', value: 'playstation' },
        {
          key: 'voiceLevel',
          label: 'Voices',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.8,
          group: 'Sound',
          apply: (g, v) => {
            g.audio.voiceVolume = v;
            g.audio.applyVolume();
          },
        },
        {
          key: 'tension',
          label: 'Charge tension',
          type: 'select',
          options: ['Gentle', 'Sporting', 'Fierce'],
          value: 'Gentle',
        },
        {
          key: 'prediction',
          label: 'Show full trajectory',
          type: 'toggle',
          value: false,
        },
        {
          key: 'timingAssist',
          label: 'Timing assist',
          type: 'toggle',
          value: false,
        },
        {
          key: 'uiSize',
          label: 'TV text scale',
          type: 'slider',
          min: 0.85,
          max: 1.25,
          step: 0.05,
          value: 1,
        },
        {
          key: 'skipTeaching',
          label: 'Skip teaching',
          type: 'toggle',
          value: false,
        },
        {
          key: 'difficulty',
          label: 'Quick duel rival',
          type: 'select',
          options: ['Rookie', 'Sporting', 'Royal'],
          value: 'Sporting',
        },
        {
          key: 'courtChoice',
          label: 'Court',
          type: 'select',
          options: COURTS.map((c) => c.short),
          value: COURTS[0].short,
        },
        {
          key: 'localFormat',
          label: 'Local match',
          type: 'select',
          options: ['One bout', 'Ten-bout war'],
          value: 'One bout',
        },
        {
          key: 'seats',
          label: 'Local seats',
          type: 'select',
          options: ['Two keyboards', 'Keyboard + pad', 'Two pads'],
          value: 'Two keyboards',
        },
      ],
    },
  });
  const view = new Battlefield(game, E);
  game.setView('siege');
  const audio = new SiegeAudio(game);
  const shell = new E.Shell(game, {
    tv: true,
    theme: {
      ink: '#f5ead0',
      paper: '#182b39',
      accent: '#efd194',
      muted: '#b2c1bf',
      line: '#697d80',
      font: '"Trebuchet MS", system-ui, sans-serif',
      titleFont: 'Georgia, serif',
    },
    screens: {
      pause: {
        kicker: 'THE MARSHAL CALLS A HALT',
        actions: () => [
          ['Developer tools', () => app.developer()],
          ['Rules & lessons', () => app.rules()],
        ],
      },
      help: {
        title: 'The rules of rubble',
        text: 'Hold to wind; release to sling. Destroy every objective block, or lead on castle health at the bell. Castle / crew / launcher direct hits score 3 / 7 / 13. Protected returns cannot be interrupted.',
      },
    },
  });
  const app = {
    E,
    game,
    view,
    audio,
    shell,
    world: null,
    mode: 'title',
    tour: null,
    ais: [],
    online: null,
    ended: false,
    idleTicks: 0,
    attractTicks: 0,
    resultAt: 0,
    wasFire: [false, false],
    pointers: new Map(),
    blocked: [false, false],
    lesson: 0,
    lessonDone: false,
    lessonBaseline: 0,
    lessonShot: 0,
    caption: '',
    captionUntil: 0,
    customCourt: null,
    simSpeed: 1,
    stepOnly: false,
    stepRequested: false,
    devPage: 0,
    editorIndex: 8,
    storage: options.storage || safeStorage(),
    resultCount: 0,
    coverageLog: [],
    frontSaved: null,
    holdStart: [0, 0],
  };
  const tuneSpecs = TUNING.map(([key, label, min, max, step]) => ({
    key: `dev_${key}`,
    label,
    type: 'slider',
    min,
    max,
    step,
    value: DEFAULTS[key],
    group: 'Developer',
  }));
  for (const spec of tuneSpecs) game.settings.define(spec);
  for (const s of [
    {
      key: 'devCourt',
      label: 'Court',
      options: COURTS.map((c) => c.short),
      value: COURTS[0].short,
    },
    {
      key: 'devBout',
      label: 'Tour bout',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1,
      value: 1,
    },
    {
      key: 'devRival',
      label: 'Rival',
      options: RIVALS.map((r, i) => `${i + 1}. ${r.name}`),
      value: `1. ${RIVALS[0].name}`,
    },
    {
      key: 'devSpeed',
      label: 'Simulation speed',
      type: 'slider',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: 1,
    },
    {
      key: 'devInvuln',
      label: 'Invulnerable castles',
      type: 'toggle',
      value: false,
    },
    {
      key: 'devCollision',
      label: 'Collision / support graph',
      type: 'toggle',
      value: false,
    },
    {
      key: 'devArc',
      label: 'Developer trajectory',
      type: 'toggle',
      value: true,
    },
    {
      key: 'editorX',
      label: 'Block X',
      type: 'slider',
      min: 22,
      max: 184,
      step: 1,
      value: 42,
    },
    {
      key: 'editorZ',
      label: 'Block height',
      type: 'slider',
      min: 27,
      max: 160,
      step: 1,
      value: 36,
    },
    {
      key: 'editorMaterial',
      label: 'Material',
      options: ['timber', 'masonry', 'reinforced'],
      value: 'masonry',
    },
    {
      key: 'editorFoundation',
      label: 'Foundation role',
      type: 'toggle',
      value: false,
    },
  ])
    game.settings.define({ ...s, group: 'Developer' });
  game.settings.onChange = (key) => {
    if (key.startsWith('dev_') && app.world && !app.online) {
      const name = key.slice(4);
      applyTuning(app.world, { [name]: game.settings[key] });
    }
    if (key === 'devSpeed') app.simSpeed = game.settings.devSpeed;
    if (key === 'devInvuln' && app.world && !app.online) {
      app.world.invulnerable = game.settings.devInvuln;
      app.world.cheated = true;
    }
    if (key === 'devCollision') view.debug = game.settings.devCollision;
    if (key === 'devArc') view.arc = game.settings.devArc;
    if (key === 'uiSize') applyUIScale();
    if (
      (key === 'tension' || key === 'timingAssist') &&
      app.world &&
      !app.online
    )
      app.world.config.chargeTime = app.config().chargeTime;
  };
  function applyUIScale() {
    if (!shell.root || typeof innerWidth === 'undefined') return;
    const k =
      (Math.max(18, Math.min(30, innerWidth * 0.016)) / 14) *
      game.settings.uiSize;
    Object.assign(shell.root.style, {
      transform: `scale(${k})`,
      width: `${100 / k}vw`,
      height: `${100 / k}vh`,
    });
  }
  applyUIScale();
  if (typeof addEventListener !== 'undefined')
    addEventListener('resize', applyUIScale);
  function clearInputs() {
    for (const p of game.players) p.clear();
    app.wasFire = [false, false];
    app.blocked = [true, true];
    app.pointers.clear();
    app.touchPoint = null;
    app.holdStart = [0, 0];
  }
  app.cancelAll = () => {
    if (app.online) {
      app.online.intent('cancel');
    } else if (app.world)
      for (let i = 0; i < 2; i++) cancel(app.world, i, false);
    clearInputs();
  };
  app.intent = (seat, c) => {
    if (app.ended || app.mode === 'attract') return false;
    if (app.online) return app.online.intent(c.kind, c.stone);
    return command(app.world, seat, c);
  };
  app.choose = (seat, delta) => {
    if (!app.world || app.ended) return;
    const p = app.world.players[seat],
      allowed = app.world.allowed,
      idx = allowed.indexOf(p.stone);
    app.intent(seat, {
      kind: 'stone',
      stone: allowed[(idx + delta + allowed.length) % allowed.length],
    });
  };
  app.fresh = () => {
    app.cancelAll();
    audio.reset();
    game.particles.list.length = 0;
    game.timeScale = 1;
    app.simSpeed = 1;
    app.stepOnly = false;
    app.resultAt = 0;
    app.ended = false;
  };
  app.config = () => ({
    ...DEFAULTS,
    chargeTime:
      { Gentle: 1.4, Sporting: 1, Fierce: 0.7 }[game.settings.tension] *
      (game.settings.timingAssist ? 1.15 : 1),
  });
  app.prepare = (
    mode,
    { bout = 0, court = 0, seed = 71, duration = 90 } = {},
  ) => {
    app.fresh();
    app.mode = mode;
    app.lesson = 0;
    app.lessonDone = !!game.settings.skipTeaching || mode !== 'tour';
    const allowed =
      mode === 'tour' && !game.settings.skipTeaching
        ? bout < 2
          ? [0]
          : bout < 4
            ? [0, 1]
            : [0, 1, 2]
        : [0, 1, 2];
    app.world = createWorld({
      mode,
      bout,
      court,
      seed,
      duration,
      config: app.config(),
      allowed,
      customCourt: app.customCourt,
    });
    view.reset(app.world);
    view.arc = false;
    view.debug = false;
    app.ais =
      mode === 'local'
        ? [null, null]
        : [
            null,
            createAI(
              mode === 'tour'
                ? RIVALS[bout]
                : RIVALS[
                    { Rookie: 0, Sporting: 4, Royal: 9 }[
                      game.settings.difficulty
                    ]
                  ],
            ),
          ];
    app.lessonShot = app.world.coverage.launch[0];
    app.lessonBaseline = app.world.coverage.castle;
    app.setSeats(mode === 'local' ? game.settings.seats : 'Solo');
    app.caption =
      mode === 'local'
        ? 'Two players. One clock. No taking turns.'
        : mode === 'tour'
          ? RIVALS[bout].quote
          : app.world.courtDef.boast;
    app.captionUntil = game.real + 5;
    shell.hide();
    game.go('combat', null, { fade: 0 });
    audio.music(court);
    app.resultCount = 0;
    return app.world;
  };
  app.setSeats = (kind) => {
    if (game.players.length > 1) game.removePlayer(2);
    game.input.use(INPUT);
    game.input.pad = 'any';
    game.input.keysTo = null;
    if (kind === 'Solo') return;
    const p2 = game.addPlayer({
      pad: kind === 'Two pads' ? 1 : kind === 'Keyboard + pad' ? 0 : undefined,
    });
    p2.use({
      ...INPUT,
      fire: kind === 'Two keyboards' ? ['ShiftRight'] : ['Pad0'],
      previous: kind === 'Two keyboards' ? ['KeyU'] : ['Pad4'],
      next: kind === 'Two keyboards' ? ['KeyO'] : ['Pad5'],
      abort: kind === 'Two keyboards' ? ['KeyI'] : ['Pad1'],
      fire2: [],
      previous2: [],
      next2: [],
    });
    p2.pad = kind === 'Two keyboards' ? null : kind === 'Two pads' ? 1 : 0;
    game.input.pad = kind === 'Two pads' ? 0 : null;
    if (kind === 'Two pads')
      game.input.use({
        ...INPUT,
        fire: ['Pad0'],
        previous: ['Pad4'],
        next: ['Pad5'],
        abort: ['Pad1'],
      });
    game.input.keysTo = kind === 'Two keyboards' ? [p2] : null;
    p2.names = {
      fire: 'P2 hold / release',
      previous: 'P2 previous stone',
      next: 'P2 next stone',
      abort: 'P2 cancel',
      fire2: false,
      previous2: false,
      next2: false,
    };
    clearInputs();
  };
  app.title = () => {
    if (app.online) return;
    app.fresh();
    app.mode = 'title';
    app.tour = null;
    app.idleTicks = 0;
    app.setSeats('Solo');
    app.world = createWorld({ mode: 'title', court: 0 });
    view.reset(app.world);
    game.go('title', null, { fade: 0 });
    audio.music(0);
    app.showTitle();
  };
  app.showTitle = () => {
    const save = loadTour(app.storage);
    shell.hide();
    shell.show('title', {
      kicker: 'THE ROYAL DEMOLITION SOCIETY PRESENTS',
      name: 'SMITHEREENS\nUNDER SIEGE',
      subtitle: 'A right royal demolition derby',
      text: 'Hold. Watch the tension. Release havoc.',
      actions: [
        ...(save
          ? [
              [
                'Resume tour  ·  Bout ' + (save.next + 1),
                () => app.startTour(true),
              ],
            ]
          : []),
        ['Solo tour', () => app.startTour(false)],
        ['Quick duel', () => app.setup('quick')],
        ['Local versus', () => app.setup('local')],
        ['Settings', () => shell.show('settings')],
        ['About & credits', () => app.about(0)],
      ],
      meta: ['1–2 PLAYERS', 'SIMULTANEOUS ARTILLERY'],
      footer: 'Hosted online versus is available when launched by AI Hub.',
      back: () => app.showTitle(),
    });
  };
  app.startTour = (resume) => {
    const save = resume ? loadTour(app.storage) : null;
    app.tour = save
      ? { ...save }
      : {
          version: 1,
          next: 0,
          seed: (Date.now() >>> 0) % 1000000 || 71,
          totals: [0, 0],
          results: [],
        };
    if (!resume) eraseTour(app.storage);
    app.prepare('tour', {
      bout: app.tour.next,
      court: Math.floor(app.tour.next / 2),
      seed: app.tour.seed + app.tour.next,
    });
  };
  app.setup = (mode) =>
    shell.show('setup', {
      kicker:
        mode === 'local'
          ? 'TWO LAUNCHERS. TWO HUMANS.'
          : 'A FRIENDLY BIT OF VANDALISM',
      title: mode === 'local' ? 'Local versus' : 'Quick duel',
      text:
        mode === 'local'
          ? 'Teal: Space / mouse, Q/E. Coral: Right Shift, U/O. Choose pad seats explicitly below.'
          : 'Choose a court and rival. Every stone is available.',
      rows:
        mode === 'local'
          ? ['courtChoice', 'localFormat', 'seats', 'tension']
          : ['courtChoice', 'difficulty', 'tension'],
      actions: [
        [
          'To the battlements',
          () => {
            if (mode === 'local')
              app.tour =
                game.settings.localFormat === 'Ten-bout war'
                  ? { next: 0, seed: 71, totals: [0, 0], results: [] }
                  : null;
            app.prepare(mode, {
              court:
                mode === 'local' && app.tour
                  ? 0
                  : COURTS.findIndex(
                      (c) => c.short === game.settings.courtChoice,
                    ),
            });
          },
        ],
        ['Back', () => shell.back()],
      ],
    });
  app.rules = () =>
    shell.show('rules', {
      kicker: 'A GENTLE GUIDE TO GRIEVOUS MASONRY',
      title: 'Hold to wind. Release to fling.',
      sections: [
        [
          'The shot',
          'More tension throws farther. The diamond is the predicted first contact. Full power overshoots. X marks your previous hit, remembered separately for each stone.',
        ],
        [
          'The objective',
          'Remove every castle block. Break a support and disconnected sections fall. Timber is soft; iron-banded stone is reinforced. Foundations never count.',
        ],
        [
          'The opening',
          'Crew hits buy 1.8 seconds; launcher hits buy 2.6. Gold shields mean 1.25 seconds of protected return. Airborne stones keep flying.',
        ],
        [
          'The points',
          'Direct hits: castle 3, crew 7, launcher 13. Only the bout winner banks their direct score × bout number. Losing still advances the ten-bout tour. At 90 seconds: castle health %, then direct hits, then draw.',
        ],
        [
          'Controls',
          `${app.fireLabel()} hold / release • ${game.input.label('previous')} / ${game.input.label('next')} stone • ${game.input.label('abort')} cancel • Escape / Options pause. P2 keyboard: Right Shift, U/O, I cancel.`,
        ],
      ],
      actions: [
        [
          'Replay teaching',
          () => {
            if (app.online) {
              shell.toast('Hosted match', 'Lessons cannot stop the round.');
              return;
            }
            game.settings.set('skipTeaching', false);
            app.lessonDone = false;
            app.lesson = 0;
            app.lessonShot = app.world?.coverage.launch[0] || 0;
            app.lessonBaseline = app.world?.coverage.castle || 0;
            shell.hide();
          },
        ],
        ['Back', () => shell.back()],
      ],
    });
  app.fireLabel = () =>
    game.input.lastDevice === 'touch'
      ? 'Hold anywhere'
      : game.input.label('fire');
  app.about = (page) => {
    const pages = [
      [
        'Source information',
        Object.entries(REPORT.sourceInformation).map(([k, v]) => [
          k.replace(/([A-Z])/g, ' $1'),
          v,
        ]),
      ],
      [
        'Testing feedback',
        REPORT.testingFeedback.map((v, i) => [
          [
            'Issues found',
            'Critical issues',
            'Most helpful test',
            'Least helpful test',
          ][i],
          v,
        ]),
      ],
      [
        'Engine feedback',
        REPORT.engineFeedback.map((v, i) => [
          [
            'Best feature',
            'Wrong assumptions',
            'Built for this game',
            'Hardest engine task',
            'Engine changes',
            'Suggested improvement',
          ][i],
          v,
        ]),
      ],
      [
        'Prompt feedback',
        REPORT.promptFeedback.map((v, i) => [
          [
            'What worked',
            'What was confusing',
            'Hardest requirement',
            'Suggested change',
          ][i],
          v,
        ]),
      ],
      [
        'Credits & provenance',
        [
          [
            'Original game',
            'Smithereens Under Siege — code-defined tournament, characters, court layouts, music and synth patches created for this build.',
          ],
          [
            'Engine',
            'my-3D2dge by Michael Crosato. Native assets, material renderer, Humanoid animation, input, UI, synth, particles and terrain. Engine license retained in the delivered source.',
          ],
          [
            'Online',
            'AI Hub protocol 1 / released client 1.4.0 by Michael Crosato, embedded unchanged.',
          ],
          [
            'Source reference',
            'Stone Sling / Smithereens! by Robert L. Cheezem. Original manual: odyssey2.info/library/manuals/us_smithereens/smithereens.txt. No original art, music or dialogue copied.',
          ],
        ],
      ],
    ];
    const [title, sections] = pages[page];
    shell.show('about', {
      kicker: `THE TOURNAMENT RECORD · ${page + 1} / ${pages.length}`,
      title,
      sections,
      actions: [
        ['Next page', () => app.about((page + 1) % pages.length)],
        [
          'Previous page',
          () => app.about((page + pages.length - 1) % pages.length),
        ],
        ['Back', () => shell.back()],
      ],
    });
  };
  app.result = () => {
    const w = app.world;
    if (!w?.outcome || app.resultCount) return;
    app.resultCount++;
    app.coverageLog.push({ bout: w.bout, court: w.court, ...w.coverage });
    const o = w.outcome,
      win = o.winner,
      who =
        win < 0
          ? 'Honours even'
          : win === 0
            ? 'The Teal Troupe triumphs'
            : 'The Coral Court triumphs';
    if (app.tour) {
      app.tour.cheated = !!app.tour.cheated || w.cheated;
      app.tour.results.push({
        bout: w.bout,
        winner: win,
        direct: o.direct,
        banked: o.banked,
      });
      app.tour.totals = app.tour.totals.map((n, i) => n + o.banked[i]);
      app.tour.next = w.bout + 1;
      if (app.mode === 'tour') {
        if (app.tour.next < 10) saveTour(app.storage, app.tour);
        else eraseTour(app.storage);
      }
    }
    const complete = app.tour?.next === 10;
    const title = complete
      ? app.tour.totals[0] === app.tour.totals[1]
        ? 'A shared crown!'
        : app.tour.totals[0] > app.tour.totals[1]
          ? 'Champion of the rubble!'
          : 'A noble second place!'
      : who;
    const text = complete
      ? 'Ten bouts. Five courts. An alarming quantity of dust.'
      : win < 0
        ? 'A drawn bout banks zero for both sides.'
        : `Bout ${w.bout + 1}: ${o.direct[win]} direct points × ${w.bout + 1} = ${o.banked[win]} banked. The other side banks zero.`;
    shell.show('results', {
      kicker: complete
        ? 'THE GRAND TOURNAMENT CONCLUDES'
        : `${w.courtDef.short} · ${o.reason.toUpperCase()}${w.cheated || app.tour?.cheated ? ' · DEVELOPER RUN' : ''}`,
      title,
      emblem: complete ? '♜' : '⚑',
      text,
      stats: app.tour
        ? app.tour.totals.map((n, i) => [n, TEAM[i].name])
        : o.health.map((n, i) => [
            Math.round(n * 100) + '%',
            TEAM[i].name + ' CASTLE',
          ]),
      actions: complete
        ? [
            ['Play the tour again', () => app.startTour(false)],
            [
              'Quick duel',
              () => {
                app.title();
                app.setup('quick');
              },
            ],
            ['Credits', () => app.about(4)],
            ['Title', () => app.title()],
          ]
        : app.tour
          ? [
              [
                'Next bout',
                () =>
                  app.prepare(app.mode, {
                    bout: app.tour.next,
                    court: Math.floor(app.tour.next / 2),
                    seed: app.tour.seed + app.tour.next,
                  }),
              ],
              ['Title', () => app.title()],
            ]
          : [
              [
                'Rematch',
                () =>
                  app.prepare(app.mode, { court: w.court, seed: w.seed + 1 }),
              ],
              [
                'Change court',
                () => {
                  app.title();
                  app.setup('quick');
                },
              ],
              ['Title', () => app.title()],
            ],
      back: () => app.title(),
    });
  };
  app.beginAttract = () => {
    if (app.online || app.mode !== 'title') return;
    app.frontSaved = {
      stack: shell._stack.slice(),
      focus:
        typeof document !== 'undefined'
          ? [...shell._els.scr.querySelectorAll('button,input')].indexOf(
              document.activeElement,
            )
          : 0,
    };
    shell.hide();
    app.mode = 'attract';
    app.attractTicks = 0;
    app.attractCoverage = [];
    app.attractSegment = -1;
    app.attractNext();
  };
  app.attractNext = () => {
    if (app.mode === 'attract' && app.world?.mode === 'attract')
      app.attractCoverage.push(structuredClone(app.world.coverage));
    app.attractSegment = (app.attractSegment + 1) % 3;
    const court = [0, 2, 3][app.attractSegment];
    app.world = createWorld({
      mode: 'attract',
      court,
      seed: 17 + app.attractSegment,
      duration: 28,
      config: app.config(),
    });
    view.reset(app.world);
    app.ais = [
      createAI({ ...RIVALS[8], reaction: 0.45, error: 0, harass: 0.5 }),
      createAI({ ...RIVALS[8], reaction: 0.6, error: 0.01, harass: 0.5 }),
    ];
    app.attractSegmentTick = app.attractTicks;
    audio.reset();
    audio.music(court);
    app.resultAt = 0;
    clearInputs();
  };
  app.exitAttract = () => {
    if (app.mode !== 'attract') return;
    app.cancelAll();
    app.mode = 'title';
    app.idleTicks = 0;
    app.world = createWorld({ mode: 'title', court: 0 });
    view.reset(app.world);
    audio.reset();
    audio.music(0);
    game.particles.list.length = 0;
    const saved = app.frontSaved;
    app.frontSaved = null;
    if (saved) {
      shell._stack = saved.stack;
      const top = shell._stack.at(-1);
      if (top) top.focus = saved.focus;
      shell._render();
    } else app.showTitle();
  };
  app.developer = (page = 0) => {
    app.cancelAll();
    if (app.online) {
      shell.show('developer', {
        kicker: 'HOSTED MATCH · READ ONLY',
        title: 'Match diagnostics',
        text: () =>
          `Tick ${app.world.tick} • seed ${app.world.seed} • ${app.online.transport.metrics.sent} packets • ${app.online.transport.metrics.maxBytes} B largest • ACK ${app.online.ack}. World changes are unavailable in scored Hub play.`,
        actions: [
          ['Refresh', () => app.developer()],
          ['Back', () => shell.back()],
        ],
      });
      return;
    }
    const w = app.world,
      pages = 4;
    app.devPage = page;
    const rows =
      page === 0
        ? [
            'devCourt',
            'devBout',
            'devRival',
            'devSpeed',
            'devInvuln',
            'devCollision',
            'devArc',
          ]
        : TUNING.slice((page - 1) * 5, page * 5).map((a) => 'dev_' + a[0]);
    const summary = `Seed ${w.seed} · tick ${w.tick} · ${w.shots.length} flying · castles ${Math.round(health(w, 0) * 100)} / ${Math.round(health(w, 1) * 100)}%. Timing affects the next action; gravity affects new stones; health preserves each block's health fraction. Developer changes mark this run.`;
    shell.show('developer', {
      kicker: `THE MARSHAL'S TOOLBOX · ${page + 1} / ${pages}`,
      title: page === 0 ? 'Scenarios & diagnostics' : 'Live balance sliders',
      text: summary,
      rows,
      actions: [
        ...(page === 0
          ? [
              [
                'Restart this bout',
                () => {
                  const { mode, bout, court, seed } = w;
                  app.prepare(mode, { bout, court, seed });
                  app.world.cheated = true;
                },
              ],
              [
                'Load chosen scenario',
                () => {
                  app.prepare(app.mode === 'tour' ? 'tour' : 'quick', {
                    bout: game.settings.devBout - 1,
                    court: COURTS.findIndex(
                      (c) => c.short === game.settings.devCourt,
                    ),
                    seed: w.seed,
                  });
                  app.ais[1] = createAI(
                    RIVALS[Number(game.settings.devRival.split('.')[0]) - 1],
                  );
                  app.world.cheated = true;
                },
              ],
              ['More test tools', () => app.tools()],
              ['Court authoring', () => app.editor()],
            ]
          : []),
        ['Next page', () => app.developer((page + 1) % pages)],
        [
          'Reset balance defaults',
          () => {
            for (const [k] of TUNING)
              game.settings.set('dev_' + k, DEFAULTS[k]);
            applyTuning(w, DEFAULTS);
            app.developer(page);
          },
        ],
        ['Back', () => shell.back()],
      ],
    });
  };
  app.tools = () =>
    shell.show('tools', {
      kicker: 'LOCAL TOOLS · RESULTS ARE MARKED',
      title: 'The useful mischief',
      text: () =>
        `Tick ${app.world.tick} · ${app.stepOnly ? 'manual stepping' : 'normal simulation'} · AI seats ${app.ais.map((a) => (a ? 'AI' : 'human')).join(' / ')}`,
      actions: [
        [
          'Restore both castles',
          () => {
            app.world.castles = createWorld({
              court: app.world.court,
              customCourt: app.customCourt,
              config: app.world.config,
            }).castles;
            app.world.revision++;
            app.world.cheated = true;
            shell.toast('Castles restored');
          },
        ],
        [
          'Clear airborne stones',
          () => {
            app.world.shots = [];
            app.world.cheated = true;
          },
        ],
        [
          'Skip teaching',
          () => {
            app.lessonDone = true;
            shell.tutorial(null);
          },
        ],
        [
          'Toggle teal AI / human',
          () => {
            app.ais[0] = app.ais[0]
              ? null
              : createAI({ ...RIVALS[8], error: 0 });
            app.world.cheated = true;
            app.tools();
          },
        ],
        [
          'Toggle coral AI / human',
          () => {
            app.ais[1] = app.ais[1] ? null : createAI(RIVALS[8]);
            app.world.cheated = true;
            app.tools();
          },
        ],
        [
          'Pause / resume simulation',
          () => {
            app.stepOnly = !app.stepOnly;
            app.tools();
          },
        ],
        [
          'Step one fixed tick',
          () => {
            step(app.world);
            drain();
            view.update(DT);
            app.tools();
          },
        ],
        [
          'Force teal ceremony',
          () => {
            app.world.cheated = true;
            finish(app.world, 'developer inspection', 0);
            drain();
            shell.hide();
            app.resultAt = game.real - 2;
          },
        ],
        [
          'Force coral ceremony',
          () => {
            app.world.cheated = true;
            finish(app.world, 'developer inspection', 1);
            drain();
            shell.hide();
            app.resultAt = game.real - 2;
          },
        ],
        ['Back', () => shell.back()],
      ],
    });
  app.editorBlock = () => {
    const b = (app.customCourt || app.world.courtDef).blocks;
    app.editorIndex = clamp(app.editorIndex, 0, b.length - 1);
    return b[app.editorIndex];
  };
  app.editor = (page = 0) => {
    if (app.online) return;
    if (!app.customCourt)
      app.customCourt = JSON.parse(exportCourt(app.world.courtDef)).court;
    const c = app.customCourt,
      b = app.editorBlock();
    view.selection = b;
    for (const [k, v] of [
      ['editorX', b.x],
      ['editorZ', b.z],
      ['editorMaterial', MATERIAL[b.material].name],
      ['editorFoundation', b.foundation],
    ])
      game.settings.set(k, v);
    const change = (delta) => {
      app.applyEditor();
      app.editorIndex =
        (app.editorIndex + delta + c.blocks.length) % c.blocks.length;
      app.editor(page);
    };
    const support = c.blocks[(app.editorSupport || 0) % c.blocks.length];
    shell.show('editor', {
      kicker: `COURT WORKSHOP · BLOCK ${b.id} · ${page + 1} / 2`,
      title: page ? 'Supports & sharing' : 'Carve your own calamity',
      text: `${c.name}. Select with the buttons, edit with arrows or pointer, then Apply. Symmetry is automatic. ${b.foundation ? 'Foundation — not an objective.' : 'Objective — ' + b.support.length + ' support links.'}`,
      rows: page
        ? []
        : ['editorX', 'editorZ', 'editorMaterial', 'editorFoundation'],
      actions: page
        ? [
            [
              `Support target: block ${support.id}`,
              () => {
                app.editorSupport =
                  ((app.editorSupport || 0) + 1) % c.blocks.length;
                app.editor(1);
              },
            ],
            [
              b.support.includes(support.id)
                ? 'Unlink selected support'
                : 'Link selected support',
              () => {
                if (b.id !== support.id)
                  b.support = b.support.includes(support.id)
                    ? b.support.filter((id) => id !== support.id)
                    : [...b.support, support.id];
                app.editor(1);
              },
            ],
            ['Validate geometry & reachability', () => app.validateEditor()],
            [
              'Preview support collapse',
              () => {
                app.applyEditor();
                const found = app.world.castles[1].find((a) => a.id === b.id);
                if (found && !found.foundation) {
                  found.hp = 0;
                  app.world.revision++;
                  importCollapse();
                }
                shell.hide();
                app.world.cheated = true;
              },
            ],
            [
              'Export definition',
              () => {
                app.editorText = exportCourt(c);
                app.shareEditor();
              },
            ],
            ['Import definition', () => app.shareEditor()],
            ['Geometry page', () => app.editor(0)],
            [
              'Back',
              () => {
                view.selection = null;
                shell.back();
              },
            ],
          ]
        : [
            ['Previous block', () => change(-1)],
            ['Next block', () => change(1)],
            [
              'Apply geometry',
              () => {
                app.applyEditor();
                app.editor(0);
              },
            ],
            [
              'Add block',
              () => {
                app.applyEditor();
                const id = Math.max(...c.blocks.map((a) => a.id)) + 1;
                c.blocks.push({
                  id,
                  x: clamp(b.x + 20, 22, 180),
                  z: b.z,
                  w: 19,
                  h: 18,
                  material: 'S',
                  foundation: false,
                  support: [b.id],
                });
                app.editorIndex = c.blocks.length - 1;
                app.editor();
              },
            ],
            [
              'Remove block',
              () => {
                if (c.blocks.length > 2) {
                  c.blocks.splice(app.editorIndex, 1);
                  for (const a of c.blocks)
                    a.support = a.support.filter((id) => id !== b.id);
                  app.editorIndex = 0;
                  app.editor();
                }
              },
            ],
            [
              'Supports & sharing',
              () => {
                app.applyEditor();
                app.editor(1);
              },
            ],
            [
              'Reset authored court',
              () => {
                app.customCourt = structuredClone(COURTS[app.world.court]);
                view.selection = null;
                app.editorIndex = 8;
                app.editor();
              },
            ],
            [
              'Back',
              () => {
                view.selection = null;
                shell.back();
              },
            ],
          ],
    });
  };
  app.applyEditor = () => {
    const b = app.editorBlock();
    b.x = game.settings.editorX;
    b.z = game.settings.editorZ;
    b.material = Object.keys(MATERIAL).find(
      (k) => MATERIAL[k].name === game.settings.editorMaterial,
    );
    b.foundation = game.settings.editorFoundation;
    const valid = validateCourt({ version: 1, court: app.customCourt });
    if (valid.ok) {
      const fresh = createWorld({
        court: app.world.court,
        customCourt: app.customCourt,
        config: app.world.config,
      });
      app.world.castles = fresh.castles;
      app.world.courtDef = app.customCourt;
      app.world.revision++;
      app.world.cheated = true;
    }
    return valid;
  };
  function importCollapse() {
    const b = app.world.castles[1],
      seen = connected(b);
    for (const a of b)
      if (!a.foundation && a.hp > 0 && !seen.has(a.id)) {
        a.hp = 0;
        view.event({
          type: 'fall',
          seat: 1,
          id: a.id,
          x: a.x,
          z: a.z,
          w: a.w,
          h: a.h,
          material: a.material,
          tick: app.world.tick,
        });
      }
  }
  app.validateEditor = () => {
    const valid = app.applyEditor();
    let msg = valid.errors.join(' ');
    if (valid.ok) {
      const w = createWorld({ customCourt: app.customCourt });
      let seen = new Set();
      for (let p = 0.1; p < 1; p += 0.003)
        for (const h of predict(w, 0, 0, p).hits)
          if (h.kind === 'castle') seen.add(h.id);
      msg = `Support graph connected. ${seen.size} visible blocks directly targetable; hidden blocks open as walls fall. Last-fragment reachability checked in verification.`;
    }
    shell.toast(valid.ok ? 'Court is valid' : 'Court needs attention', msg, 10);
  };
  app.shareEditor = () => {
    shell.show('court-data', {
      kicker: 'VERSION 1 COURT DATA',
      title: 'Import / export',
      text: 'The text stays local. Export copies into this field; paste a definition and choose Import. No files or network required.',
      actions: [
        [
          'Import this definition',
          () => {
            try {
              const raw = JSON.parse(
                  document.getElementById('court-json').value,
                ),
                v = validateCourt(raw);
              if (!v.ok) throw Error(v.errors.join(' '));
              app.customCourt = v.court;
              app.editorIndex = 0;
              app.editorText = '';
              shell.back();
              app.editor();
              app.applyEditor();
            } catch (e) {
              shell.toast('Import rejected', String(e.message), 8);
            }
          },
        ],
        [
          'Copy to clipboard',
          () => {
            const el = document.getElementById('court-json');
            el.select();
            globalThis.navigator?.clipboard
              ?.writeText(el.value)
              ?.catch(() => {});
          },
        ],
        ['Back', () => shell.back()],
      ],
    });
    if (typeof document !== 'undefined') {
      const text = document.createElement('textarea');
      text.id = 'court-json';
      text.value = app.editorText || exportCourt(app.customCourt);
      text.setAttribute('aria-label', 'Court JSON definition');
      text.rows = 7;
      const box = shell._els.scr.querySelector('.esh-mod');
      box.insertBefore(text, box.querySelector('.esh-btns'));
      text.addEventListener('keydown', (e) => e.stopPropagation());
    }
  };
  function drain() {
    for (const e of app.world.events.splice(0)) {
      view.event(e);
      audio.event(e);
    }
  }
  function hands() {
    if (app.ended || app.online?.info?.server) return;
    const count = app.mode === 'local' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const seat = app.online ? app.online.seat : i;
      if (seat === null) continue;
      const I = game.players[i] || game.input;
      if (I.padLost) {
        app.cancelAll();
        if (app.online) {
          shell.toast(
            'Controller disconnected',
            'The shared clock continues. Reconnect or use the keyboard.',
          );
        } else game.pause('controller');
        continue;
      }
      if (app.ais[i] && !app.online) continue;
      const held = I.down('fire');
      if (app.blocked[i]) {
        if (!held) app.blocked[i] = false;
        else continue;
      }
      if (I.pressed('abort')) {
        app.intent(seat, { kind: 'cancel' });
        app.blocked[i] = true;
        app.wasFire[i] = false;
        continue;
      }
      if (held && !app.wasFire[i]) {
        app.intent(seat, { kind: 'begin' });
        app.holdStart[i] = game.real;
      }
      if (!held && app.wasFire[i]) app.intent(seat, { kind: 'release' });
      app.wasFire[i] = held;
      if (I.pressed('previous')) app.choose(seat, -1);
      if (I.pressed('next')) app.choose(seat, 1);
      if (I.down('left') || I.down('right'))
        view.guidance[seat] = clamp(
          view.guidance[seat] + (I.down('right') ? 1 : -1) * 2,
          25,
          935,
        );
    }
  }
  function teaching() {
    if (app.lessonDone || app.mode !== 'tour') return;
    const w = app.world,
      shot = w.coverage.launch.reduce((a, b) => a + b, 0),
      hit = w.players[0].score;
    if (app.lesson === 0 && w.players[0].launchTick >= 0) app.lesson = 1;
    if (app.lesson === 1 && hit > 0) app.lesson = 2;
    const p = game.input.label('fire'),
      prev = game.input.label('previous'),
      next = game.input.label('next');
    let title, text;
    if (app.lesson === 0) {
      title = 'Wind up, your lordship.';
      text = `Hold ${p}. The diamond shows the first contact. Release to fling.`;
    } else if (app.lesson === 1) {
      title = 'A little more. A little less.';
      text =
        'Aim for the far castle. Full tension overshoots; try about two-thirds.';
    } else {
      title =
        w.bout >= 4
          ? 'Split the difference.'
          : w.bout >= 2
            ? 'Mind the supports.'
            : 'A most respectable hit!';
      text =
        w.bout >= 4
          ? `${prev} / ${next}: split stone fans into three at the apex. Roundstone finishes small pieces.`
          : w.bout >= 2
            ? `${prev} / ${next}: masonry stone breaks reinforced blocks and their supports.`
            : 'Castle hits are permanent. Crew and launcher hits buy a brief opening.';
      if (shot > app.lessonShot + 3) {
        app.lessonDone = true;
      }
    }
    app.lessonText = { title, text };
  }
  function combatUpdate(dt) {
    if (app.online) {
      app.online.update();
      if (app.ended) return;
      if (!app.online.info?.server) {
        if (!shell.screen && !game.paused) hands();
        view.update(dt, {
          seat: app.online.seat ?? 0,
          assist: game.settings.prediction,
          reduced: game.reduceMotion,
        });
        updateHUD();
      }
      return;
    }
    if (!shell.screen && !game.paused) hands();
    if (!app.stepOnly) {
      app.simCarry = (app.simCarry || 0) + app.simSpeed;
      while (app.simCarry >= 1) {
        for (let s = 0; s < 2; s++)
          if (app.ais[s]) {
            // The opening opponent waits for a real first shot, giving the first lesson room to breathe.
            if (
              app.mode === 'tour' &&
              app.world.bout === 0 &&
              app.lesson === 0 &&
              !app.lessonDone
            )
              continue;
            aiStep(app.world, s, app.ais[s]);
          }
        step(app.world);
        app.simCarry--;
      }
    }
    drain();
    teaching();
    view.update(dt, {
      seat: 0,
      assist: game.settings.prediction,
      reduced: game.reduceMotion,
    });
    updateHUD();
    if (app.world.outcome && !app.resultCount) {
      if (!app.resultAt) app.resultAt = game.real;
      if (game.real - app.resultAt >= 1.8) app.result();
    }
  }
  const scenes = {
    title: {
      view: 'siege',
      camera: { zoom: false },
      update(dt) {
        view.update(dt, { title: true, reduced: game.reduceMotion });
        if (app.mode === 'attract') {
          app.attractTicks++;
          const elapsed = (app.attractTicks - app.attractSegmentTick) * DT;
          for (let s = 0; s < 2; s++) {
            app.ais[s].goal =
              elapsed < 6 ? 'launcher' : elapsed < 11 ? 'crew' : 'castle';
            app.ais[s].profile.stones = [
              elapsed < 11 ? 0 : elapsed < 20 ? 1 : 2,
            ];
            aiStep(app.world, s, app.ais[s]);
          }
          step(app.world);
          drain();
          if ((app.world.outcome && elapsed > 27) || elapsed >= 30)
            app.attractNext();
          updateHUD();
        } else {
          app.idleTicks++;
          if (app.idleTicks >= 1200) app.beginAttract();
        }
      },
      draw: (r) => view.draw(r),
    },
    combat: {
      view: 'siege',
      camera: { zoom: false },
      pausable: true,
      update: combatUpdate,
      draw: (r) => {
        if (!app.online?.info?.server) view.draw(r);
      },
      back() {
        app.cancelAll();
        return false;
      },
    },
  };
  game.hook('input', () => {
    const I = game.input;
    if (app.ended) {
      I.consumeAll();
      for (const p of game.players) p.clear();
      return;
    }
    if (I.anyPressed()) {
      app.idleTicks = 0;
      if (app.mode === 'attract') {
        app.exitAttract();
        I.consumeAll();
        I.clear();
        return;
      }
    }
    // Front screens always retain a way to start; Options must not close their root shell.
    if (app.mode === 'title') I.suppress('pause');
    if (I.pressed('pause') && game.sceneName === 'combat' && !shell.screen) {
      app.cancelAll();
      game.pause('player');
    } else if (game.paused && !app.lastPaused) {
      app.cancelAll();
    }
    app.lastPaused = game.paused;
    if (app.online && game.paused && app.online.intentStart !== null)
      app.online.intent('cancel');
  });
  // Native shell keeps device focus; pointer hover follows the same focus ring.
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerover', (e) => {
      if (e.target.matches('.esh button:not(:disabled)'))
        e.target.focus({ preventScroll: true });
    });
    document.addEventListener(
      'keydown',
      (e) => {
        if (app.ended) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        app.idleTicks = 0;
        if (app.mode === 'attract') {
          e.preventDefault();
          e.stopImmediatePropagation();
          app.exitAttract();
        }
      },
      true,
    );
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (app.ended) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        app.idleTicks = 0;
        if (app.mode === 'attract') {
          e.preventDefault();
          e.stopImmediatePropagation();
          app.exitAttract();
        }
      },
      true,
    );
    document.addEventListener('pointermove', (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) {
        app.idleTicks = 0;
        if (app.mode === 'attract') app.exitAttract();
      }
    });
    document.addEventListener(
      'wheel',
      (e) => {
        app.idleTicks = 0;
        if (app.mode === 'attract') {
          e.preventDefault();
          app.exitAttract();
        }
      },
      { capture: true, passive: false },
    );
    addEventListener('blur', () => app.cancelAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) app.cancelAll();
    });
    const canvas = document.getElementById('screen');
    game.input.touchEnabled = false;
    game.input.touchFilter = () => false;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (
        e.pointerType === 'mouse' ||
        app.mode === 'title' ||
        app.mode === 'attract' ||
        shell.screen ||
        app.ended
      )
        return;
      e.preventDefault();
      const seat = app.online
        ? app.online.seat
        : app.mode === 'local' && e.clientX > innerWidth / 2
          ? 1
          : 0;
      if (seat === null || [...app.pointers.values()].includes(seat)) return;
      canvas.setPointerCapture(e.pointerId);
      app.pointers.set(e.pointerId, seat);
      game.input.lastDevice = 'touch';
      app.intent(seat, { kind: 'begin' });
      app.touchPoint = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!app.pointers.has(e.pointerId)) return;
      e.preventDefault();
      const seat = app.pointers.get(e.pointerId);
      app.pointers.delete(e.pointerId);
      app.intent(seat, { kind: 'release' });
      app.touchPoint = null;
    });
    canvas.addEventListener('pointercancel', (e) => {
      if (app.pointers.has(e.pointerId)) {
        app.intent(app.pointers.get(e.pointerId), { kind: 'cancel' });
        app.pointers.delete(e.pointerId);
        app.touchPoint = null;
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (app.mode !== 'title' && !shell.screen) {
          e.preventDefault();
          app.choose(app.online?.seat ?? 0, e.deltaY > 0 ? 1 : -1);
        }
      },
      { passive: false },
    );
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && app.world) {
        const p = game.input.screenPoint(e.clientX, e.clientY);
        if (p) {
          const worldx = (p[0] + game.screen.ix) / game.view.ax;
          const worldz = (p[1] + game.screen.iy) / game.view.bz;
          view.guidance[app.online?.seat ?? 0] = worldx;
          app.hover =
            app.world.castles
              .flat()
              .find(
                (b) =>
                  b.hp > 0 &&
                  worldx >= b.x &&
                  worldx <= b.x + b.w &&
                  worldz >= b.z &&
                  worldz <= b.z + b.h,
              ) || null;
          view.hover = app.hover;
        }
      }
    });
    createHUD();
  }
  function createHUD() {
    const root = document.createElement('div');
    root.id = 'combat-hud';
    root.hidden = true;
    root.innerHTML =
      '<div class="court-clock"><span id="court-name"></span><strong id="clock"></strong><small id="bout-label"></small></div>' +
      [0, 1]
        .map(
          (s) =>
            `<section class="team-plate team-${s}"><div class="plate-name"><span id="seat-${s}"></span><b id="score-${s}"></b></div><div class="health-rail"><i id="health-${s}"></i></div><div class="power-rail"><i id="power-${s}"></i></div><div class="plate-foot"><span id="stone-${s}"></span><strong id="status-${s}"></strong></div></section>`,
        )
        .join('') +
      '<div id="lesson-card"><b></b><span></span><button id="skip-lesson">Skip lesson</button></div><div id="combat-caption"></div><div id="stone-tray"></div><div id="combat-hint"></div><div id="attract-label"><b>THE ROYAL EXHIBITION</b><span>Demonstration · any input returns to the menu</span></div><div id="touch-halo"></div><canvas id="target-inset" width="250" height="160" aria-label="Magnified opposing castle"></canvas>';
    document.body.appendChild(root);
    document.getElementById('skip-lesson').onclick = () => {
      app.lessonDone = true;
    };
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('button');
      b.dataset.stone = i;
      b.innerHTML = `<span class="stone-icon icon-${i}"></span><span>${STONES[i].short}</span>`;
      b.onclick = () => {
        if (!shell.screen)
          app.intent(app.online?.seat ?? 0, { kind: 'stone', stone: i });
      };
      document.getElementById('stone-tray').appendChild(b);
    }
    app.hud = root;
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  }
  function updateHUD() {
    if (!app.hud) return;
    const w = app.world,
      show =
        ['tour', 'quick', 'local', 'hub', 'attract'].includes(app.mode) &&
        !shell.screen &&
        !app.ended;
    app.hud.hidden = !show;
    document.body.dataset.mode = app.mode;
    if (!show) return;
    const online = app.online,
      info = online?.info;
    setText('court-name', w.courtDef.short);
    setText(
      'clock',
      online && !online.started
        ? 'READY'
        : online && online.hub.time() < 0
          ? Math.ceil(-online.hub.time() / 1000).toString()
          : `${Math.floor((Math.max(0, w.deadline - w.tick) * DT) / 60)}:${String(Math.ceil(Math.max(0, w.deadline - w.tick) * DT) % 60).padStart(2, '0')}`,
    );
    setText(
      'bout-label',
      app.tour
        ? `BOUT ${w.bout + 1} OF 10 · ×${w.bout + 1} POINTS`
        : online
          ? 'HUB DUEL'
          : 'EXHIBITION DUEL',
    );
    for (let s = 0; s < 2; s++) {
      const p = w.players[s],
        pow =
          online && s === online.seat && online.intentStart !== null
            ? clamp(
                (online.hub.time() / 1000 - online.intentStart) /
                  w.config.chargeTime,
                0,
                1,
              )
            : powerOf(w, p),
        end = Math.max(p.crewUntil, p.launcherUntil);
      setText(
        `seat-${s}`,
        info?.players[s]?.name ||
          (s === 1 && app.ais[1]
            ? app.mode === 'tour'
              ? RIVALS[w.bout].name
              : app.ais[1].profile.name
            : TEAM[s].name),
      );
      setText(`score-${s}`, `${p.score} PTS`);
      document.getElementById(`health-${s}`).style.width =
        health(w, s) * 100 + '%';
      document.getElementById(`power-${s}`).style.width = pow * 100 + '%';
      setText(`stone-${s}`, STONES[p.stone].short);
      setText(
        `status-${s}`,
        w.outcome
          ? 'BELL!'
          : w.tick < p.launcherUntil
            ? `⚒ REPAIR ${((p.launcherUntil - w.tick) * DT).toFixed(1)}`
            : w.tick < p.crewUntil
              ? `CREW AWAY ${((p.crewUntil - w.tick) * DT).toFixed(1)}`
              : w.tick < p.protectUntil && w.tick >= end
                ? '◇ PROTECTED'
                : p.charge >= 0
                  ? `${Math.round(pow * 100)}% TENSION`
                  : w.tick < p.ready
                    ? 'RELOADING'
                    : 'READY',
      );
    }
    const seat = online?.seat ?? 0;
    for (const b of document.querySelectorAll('[data-stone]')) {
      b.classList.toggle(
        'selected',
        Number(b.dataset.stone) === w.players[seat].stone,
      );
      b.disabled = !w.allowed.includes(Number(b.dataset.stone));
    }
    document.getElementById('attract-label').hidden = app.mode !== 'attract';
    document.getElementById('stone-tray').hidden = app.mode === 'attract';
    const lesson = document.getElementById('lesson-card');
    lesson.hidden = app.lessonDone || app.mode !== 'tour';
    if (!lesson.hidden && app.lessonText) {
      lesson.querySelector('b').textContent = app.lessonText.title;
      lesson.querySelector('span').textContent = app.lessonText.text;
    }
    const device = game.input.lastDevice,
      touch = device === 'touch';
    app.hud.classList.toggle('touch', touch);
    setText(
      'combat-hint',
      touch
        ? 'Hold to wind · release to sling'
        : `${app.fireLabel()}  HOLD / RELEASE     ${game.input.label('previous')} / ${game.input.label('next')}  STONE     ${game.input.label('abort')}  CANCEL`,
    );
    setText(
      'combat-caption',
      game.real < app.captionUntil
        ? app.caption
        : app.hover
          ? `${MATERIAL[app.hover.material].name} · ${Math.ceil(app.hover.hp)} health`
          : '',
    );
    const halo = document.getElementById('touch-halo');
    halo.hidden = !app.touchPoint;
    if (app.touchPoint) {
      halo.style.left = app.touchPoint.x + 'px';
      halo.style.top = app.touchPoint.y + 'px';
      halo.textContent = Math.round(powerOf(w, w.players[seat]) * 100) + '%';
    }
    const cv = document.getElementById('target-inset');
    cv.hidden = innerHeight < innerWidth || shell.screen !== null; // native pixel target enlarged, while the complete lane stays visible below.
  }
  app.snapshot = () => ({
    mode: app.mode,
    phase: app.world?.phase,
    tick: app.world?.tick,
    court: app.world?.court,
    bout: app.world?.bout,
    health: app.world ? [health(app.world, 0), health(app.world, 1)] : null,
    shots: app.world?.shots.length,
    coverage: app.world?.coverage,
    outcome: app.world?.outcome,
    tour: app.tour,
    menu: shell.screen,
    lesson: app.lesson,
    errors: game.errors,
  });
  game.debug = { snapshot: app.snapshot };
  game.fadeTime = 0;
  app.startOnline = async () => {
    app.online = new OnlineMatch(globalThis.AIHub, {
      onWorld: (w) => {
        app.world = w;
        app.mode = 'hub';
        app.ais = [null, null];
        view.reset(w);
        shell.hide();
        game.go('combat', null, { fade: 0 });
      },
      onEnd: (e) => {
        app.ended = true;
        app.cancelAll();
        audio.stop();
        game.input.clear();
        app.hud && (app.hud.hidden = true);
        shell.hide();
        app.caption = e.reason;
      },
      onEvent: (e) => {
        view.event(e);
        if (!app.online.info?.server) audio.event(e);
      },
    });
    const info = await app.online.connect();
    if (!info) {
      app.online = null;
      game.live = false;
      app.title();
    } else {
      game.o.menu.quit = false;
      game.live = true;
      if (!info.server) audio.music(4);
    }
  };
  game.start({ scene: 'title', scenes });
  if (globalThis.AIHub?.active)
    app.startOnline().catch((e) => game.fail('Hub connection', e));
  else app.title();
  if (typeof window !== 'undefined') {
    window.__SIEGE = {
      app,
      game,
      get world() {
        return app.world;
      },
      command,
      predict,
      planShot,
      createAI,
      aiStep,
      step,
      REPORT,
      audioTest: { formant, lute },
    };
    window.__game = { game };
    document.title = TITLE;
  }
  return app;
}
function safeStorage() {
  try {
    return (
      globalThis.localStorage || {
        getItem() {
          return null;
        },
        setItem() {},
        removeItem() {},
      }
    );
  } catch {
    return {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    };
  }
}
