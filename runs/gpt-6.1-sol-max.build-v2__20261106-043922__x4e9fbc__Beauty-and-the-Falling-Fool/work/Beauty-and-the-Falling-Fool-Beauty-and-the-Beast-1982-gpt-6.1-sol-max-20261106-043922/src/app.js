/* Runtime, input adapters and native Shell screens. */
(() => {
  'use strict';
  const E = My3D2dge,
    F = FF;
  let active = !!AIHub.active;
  let world = new F.World(),
    net = null,
    mode = active ? 'hub' : 'title',
    idle = 0,
    wakeGuard = 0,
    botOn = false,
    overlayLast = null,
    lastSave = -1,
    resultShown = false,
    lastPointer = null,
    mouseWindow = null,
    localWanted = false;
  const dev = {
    invulnerable: false,
    hitboxes: false,
    anchors: false,
    slow: false,
  };
  const options = [
    { key: 'music', value: 0.1 },
    { key: 'glyphs', value: 'playstation' },
    {
      key: 'voice',
      label: 'Gibberish voices',
      group: 'Sound',
      type: 'slider',
      value: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
      apply: (g, v) => {
        g.audio.voiceVolume = v;
        g.audio.applyVolume();
      },
    },
    {
      key: 'contrast',
      label: 'Strong hazard outlines',
      group: 'Comfort',
      value: true,
    },
    {
      key: 'assist',
      label: 'Automatic short hazard jumps',
      group: 'Game',
      value: false,
      help: 'Optional assistance. Windows and gravity keep their normal rules.',
    },
    ...(active
      ? []
      : F.TUNING.map(([key, label, min, max, step]) => ({
          key: 'ff_' + key,
          label,
          group: 'Balance',
          type: 'slider',
          min,
          max,
          step,
          value: F.DEFAULTS[key],
        }))),
  ];
  const game = new E.Game({
    canvas: 'screen',
    id: 'falling-fool-v1',
    view: 'side',
    input: 'PLATFORMER',
    res: [640, 480],
    portrait: { res: [520, 480] },
    expand: true,
    bg: '#24334c',
    autoPause: !active,
    live: active,
    fullscreen: 'button',
    menu: {
      quit: active ? false : 'title',
      settings: options,
      controls: { attack: false, dash: false, skill: false },
      items: () => [],
    },
  });
  const visual = new F.Presentation(game),
    sound = new F.Sound(game);
  const ui = new E.Shell(game, {
    tv: true,
    theme: {
      ink: '#fff0d3',
      paper: '#21314b',
      accent: '#a5eddb',
      muted: '#b7cbd3',
      line: '#677787',
      danger: '#f1a3ad',
      font: 'Trebuchet MS, sans-serif',
      titleFont: 'Georgia, serif',
    },
    settings: {
      onChange(s, k) {
        if (k === 'hand' || k === 'touch') syncTouchPolicy();
        if (k.startsWith('ff_') && !active && mode !== 'title') {
          world.cfg[k.slice(3)] = s[k];
          world.unranked = true;
        }
      },
    },
    screens: {
      pause: {
        kicker: active ? 'WORLD KEEPS CLIMBING' : 'TAKE A BREATHER',
        actions: () => [
          !active && ['Retry checkpoint', () => retry()],
          ['About & credits', () => about()],
          ['Dev Mode', () => showDev()],
        ],
      },
      help: {
        title: 'Small feet. Big heart.',
        sections: [
          [
            'CLIMB',
            'Move with the stick or WASD/arrows. Cross/Space jumps. Up climbs an open shutter; release holds; down reverses. Closed shutters cause a fall.',
          ],
          [
            'HEART RUSH',
            'Catch Mabel’s heart for six seconds of shared protection and hazard smashing. Windows and gravity still apply.',
          ],
          [
            'THE RESCUE',
            'Three sections and three rooftop retreats. Reach Hank during the final heart rush. A missed heart returns.',
          ],
          [
            'POINTS',
            '50 per heart or unique powered clear; 100 pursuit; 500 rescue; 75 clean section; 50 teamwork.',
          ],
        ],
      },
    },
  });
  ui.root?.addEventListener(
    'pointerover',
    (e) => {
      if (e.pointerType === 'mouse') {
        const b = e.target.closest('button');
        if (b && !b.disabled) b.focus({ preventScroll: true });
      }
    },
    { signal: game._abort.signal },
  );
  const checkpointKey = 'falling-fool:checkpoint:v1',
    recordsKey = 'falling-fool:records:v1';
  const records = () => {
    const r = E.store.get(recordsKey, {});
    return r && typeof r === 'object' && !Array.isArray(r) ? r : {};
  };
  const saved = () => {
    const cp = E.store.get(checkpointKey, null);
    return F.validCheckpoint(cp) ? cp : null;
  };
  const clearInput = () => {
    game.players.forEach((i) => i.clear());
    mouseWindow = null;
  };
  function title() {
    if (active) return;
    mode = 'title';
    idle = 0;
    wakeGuard = 0.15;
    resultShown = false;
    botOn = false;
    world = new F.World();
    visual.reset();
    sound.stop();
    game.timeScale = 1;
    clearInput();
    while (game.players.length > 1) game.removePlayer(2);
    game.input.pad = 'any';
    game.input._claimed = new Set();
    ui.hide();
    ui.show('title', {
      kicker: 'A LAMBVILLE FALLS LOVE STORY',
      name: F.TITLE,
      subtitle: 'Love is a long way up.',
      text: 'Hank took Mabel to the roof.\nHe should have picked a shorter building.',
      actions: [
        { label: 'Start climbing', primary: true, fn: () => begin(false) },
        saved() && ['Continue ascent', () => begin(false, saved())],
        ['Local co-op', () => lobby()],
        records().hard && ['Harder encore', () => begin(false, null, true)],
        ['How to play', () => help()],
        ['Settings', () => ui.show('settings')],
        ['About & credits', () => about()],
      ],
      meta: ['12 FLOORS + A ROOFTOP', '1–2 CLIMBERS'],
      footer: 'Inspired by Beauty and the Beast · Imagic, 1982',
    });
  }
  function lobby() {
    localWanted = true;
    const pads = [...navigator.getGamepads()].filter((p) => p && p.connected);
    ui.show('lobby', {
      kicker: 'TWO SMALL HEROES. ONE BIG BULLY.',
      title: 'Bring a climbing buddy',
      text: pads.length
        ? 'Keyboard + one controller, or two controllers. Each pad has one climber. Hearts and spare chances are shared.'
        : 'Connect one controller for keyboard + pad, or two controllers. The game will detect them when you press a button.',
      actions: [
        {
          label: 'Climb together',
          primary: true,
          fn: () => {
            const pads = [...navigator.getGamepads()].filter(
              (p) => p && p.connected,
            );
            if (!pads.length) {
              ui.toast(
                'A buddy needs a controller',
                'Connect a standard gamepad and press a button.',
              );
              return;
            }
            begin(true);
          },
        },
        [
          'Refresh controllers',
          () => {
            ui.back();
            lobby();
          },
        ],
        ['Back', () => ui.back()],
      ],
    });
  }
  function begin(coop = false, cp = null, hard = false) {
    if (active) return;
    mode = 'playing';
    wakeGuard = 0.1;
    clearInput();
    ui.hide();
    game.timeScale = 1;
    dev.invulnerable = false;
    dev.slow = false;
    botOn = false;
    resultShown = false;
    lastSave = -1;
    while (game.players.length > 1) game.removePlayer(2);
    const pads = [...navigator.getGamepads()].filter((p) => p && p.connected);
    if (coop && !pads.length) {
      coop = false;
      ui.toast('Climbing solo', 'No partner controller is connected.');
    }
    game.input.pad = coop ? (pads.length >= 2 ? pads[0].index : -1) : 'any';
    game.input.clear();
    game.input.padIndex = null;
    game.input.padId = '';
    game.input.lastDevice =
      coop && pads.length < 2 ? 'keyboard' : game.input.lastDevice;
    if (coop)
      game.addPlayer({ pad: pads.length >= 2 ? pads[1].index : pads[0].index });
    world = new F.World({
      mode: coop ? 'local' : 'solo',
      players: coop
        ? [
            { id: 0, name: 'Buford', color: '#63e0d8' },
            { id: 1, name: 'Pip', color: '#ffc47a' },
          ]
        : undefined,
      hard,
      seed: 1729,
    });
    for (const [key] of F.TUNING) {
      world.cfg[key] = game.settings['ff_' + key];
      if (world.cfg[key] !== F.DEFAULTS[key]) world.unranked = true;
    }
    if (cp) {
      world.restore(cp);
      world.hard = cp.hard;
    }
    visual.reset();
    sound.last = 0;
    sound.activate();
    game.go('play', null, { fade: 0 });
  }
  function retry() {
    if (active) return;
    world.restore();
    mode = 'playing';
    resultShown = false;
    clearInput();
    visual.reset();
    sound.last = 0;
    ui.hide();
    game.resume();
  }
  function help() {
    ui.show('help', {
      kicker: 'THE GENTLE ART OF OUTSMARTING A LUMMOX',
      title: 'Small feet. Big heart.',
      keys: [
        [
          game.input.label('left') + ' / ' + game.input.label('right'),
          'Run along the ledge',
        ],
        ['↑ / ↓', 'Climb an open window. Release to hold; down reverses.'],
        [game.input.label('jump'), 'Jump over stones and rats'],
        [game.input.label('pause'), 'Pause / settings'],
      ],
      sections: [
        [
          'READ THE SHUTTERS',
          '↑ means open. ! means closing soon. A closed shutter drops you. Jumping cannot reach the next floor.',
        ],
        [
          'CATCH MABEL’S HEART',
          'Six seconds to smash rocks, rats, birds and bats. Both climbers share it. Gravity and shutters still count.',
        ],
        [
          'A LITTLE SECOND CHANCE',
          'Three shared spare chances. A hit tumbles you back to this section’s start. A section clear earns one spare. Retry restores checkpoint score.',
        ],
        [
          'POINTS',
          '50 per heart or unique powered clear; 100 per pursuit; 500 for rescue; 75 for a clean section; 50 for finishing together. Repeated pressure hazards never farm points.',
        ],
        [
          'TOUCH',
          'Drag your left thumb to move and climb. Tap or hold the right half to jump. A nearby window gets a contextual climb button. Optional auto-jumps are in Settings.',
        ],
        [
          'THE ROOFTOP',
          'Follow Hank through three retreats. Catch the final heart and reach him. A missed heart returns. No attack button needed.',
        ],
      ],
      actions: [['Got it', () => ui.back()]],
    });
  }
  function results() {
    if (active || resultShown) return;
    resultShown = true;
    const won = world.rescued,
      record = world.unranked
        ? 'UNRANKED'
        : world.continued
          ? 'CONTINUED RUN'
          : won
            ? 'CLEAN RUN'
            : 'FRESH ATTEMPT';
    if (won && !world.attract && !world.unranked) {
      const r = records();
      const key =
        (world.hard ? 'hard-' : '') + (world.continued ? 'continued' : 'clean');
      r[key] = Math.max(Number(r[key]) || 0, world.score);
      r.hard = true;
      E.store.set(recordsKey, r);
      E.store.remove(checkpointKey);
    }
    ui.show('results', {
      kicker: won
        ? 'LAMBVILLE FALLS CAN STOP GOSSIPING.'
        : 'EVEN HEROES HAVE OFF DAYS.',
      title: won ? 'Love cleared for takeoff.' : 'A minor setback.',
      emblem: won ? '♥' : '↗',
      text: won
        ? 'Mabel is safe. Hank landed in the laundry.\nThe town will be talking about that for weeks.'
        : 'The latest section checkpoint is waiting. Score and awarded pickups return to that checkpoint’s baseline.',
      sections: won
        ? [
            [
              'THE SCORECARD',
              Object.entries(world.totals)
                .map(([k, v]) => k.toUpperCase() + ' ' + v)
                .join('  ·  '),
            ],
          ]
        : [],
      stats: [
        [world.score, 'SCORE'],
        [world.metrics.hearts, 'HEARTS'],
        [
          `${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`,
          'ASCENT',
        ],
      ],
      medals: [
        [record, true],
        ['WINDOW WIZARD', world.metrics.climbs >= 15],
        ['BRICK BUSTER', world.metrics.smashes > 0],
      ],
      actions: won
        ? [
            {
              label: 'Harder encore',
              primary: true,
              fn: () => begin(game.players.length > 1, null, true),
            },
            ['Climb again', () => begin(game.players.length > 1)],
            ['About & credits', () => about()],
            ['Title', () => game.go('title', null, { fade: 0 })],
          ]
        : [
            { label: 'Retry checkpoint', primary: true, fn: () => retry() },
            ['Fresh run', () => begin(game.players.length > 1)],
            ['Title', () => game.go('title', null, { fade: 0 })],
          ],
    });
  }
  const questionNames = {
    testingFeedback: [
      'How many issues did testing catch?',
      'How many would be considered critical issues / game breaking?',
      'What was the most helpful test you ran?',
      'What was the least helpful test you ran?',
    ],
    engineFeedback: [
      'What did you like most about the engine?',
      'Did you get stuck or guess wrong?',
      'What was the most important thing you had to build yourself?',
      'What was the hardest part about using the engine?',
      'What did you change in the engine, and why?',
      'If you could change one thing about the engine, what would it be?',
    ],
    promptFeedback: [
      'What did you like most about this prompt?',
      'What was confusing?',
      'What was the hardest thing to do?',
      'What would you change in this prompt?',
    ],
  };
  function about(page = 0) {
    const interview = F.INTERVIEW,
      pages = [];
    const info = Object.entries(interview.sourceInformation);
    for (let i = 0; i < info.length; i += 4)
      pages.push({
        title: 'Source Information',
        sections: info
          .slice(i, i + 6)
          .map(([k, v]) => [
            k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
            v,
          ]),
      });
    for (const key of ['testingFeedback', 'engineFeedback', 'promptFeedback'])
      for (let i = 0; i < interview[key].length; i += 3)
        pages.push({
          title: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase()),
          sections: interview[key]
            .slice(i, i + 3)
            .map((a, j) => [questionNames[key][i + j], a]),
        });
    pages.push({
      title: 'Credits & research',
      sections: [
        [
          'THE ORIGINAL',
          'Beauty and the Beast · Imagic, 1982. Design/program: Wendell Brown. Original sound: Dave Durran. This independent interpretation adds authored checkpoints, co-op and a rooftop encounter.',
        ],
        [
          'THE TOOLS',
          'my-3D2dge v0.89.1 · Michael Crosato · MIT. AI Hub protocol 1 / session client 1.4.0, unmodified. Custom procedural cast, facade, creatures, boulders and plane. No image or audio dependencies.',
        ],
        [
          'RESEARCH',
          'Original manual transcription: manuals.plus. Illustrated archive: INTV Funhouse. Release: MobyGames. Original audio listening: unknown. All music here is newly composed.',
        ],
        [
          'LICENSE',
          'Engine and Hub notices are retained in this HTML. Copyright 2026 Michael Crosato. MIT permission and warranty notice included in source. Usage: added on import.',
        ],
      ],
    });
    const p = pages[page];
    ui.show('about', {
      kicker: `ABOUT & CREDITS  ${page + 1} / ${pages.length}`,
      title: p.title,
      sections: p.sections,
      actions: [
        page > 0 && ['Previous page', () => about(page - 1)],
        page < pages.length - 1 && ['Next page', () => about(page + 1)],
        ['Back', () => ui.back()],
      ],
    });
  }
  const mark = () => {
    world.unranked = true;
  };
  function warp(section) {
    if (active) return;
    mark();
    world.enter(section);
    world.checkpoint = world.saveCheckpoint();
    visual.reset();
    sound.last = 0;
    resultShown = false;
    clearInput();
    ui.hide();
    game.resume();
  }
  function showDev(balance = false) {
    if (balance) {
      ui.show('balance', {
        kicker: active
          ? 'INSPECTION ONLY IN HUB'
          : 'CHANGING BALANCE MARKS THIS RUN UNRANKED',
        title: 'Tune the climb',
        text: 'Changes apply immediately. Window timing changes take effect in the shared section clock. Reset updates every live value.',
        rows: active ? [] : F.TUNING.map(([key]) => 'ff_' + key),
        actions: [
          !active && [
            'Reset balance defaults',
            () => {
              game.settings.reset('Balance');
              world.cfg = { ...F.DEFAULTS };
              ui.show('balance');
            },
          ],
          ['Back', () => ui.back()],
        ],
      });
      return;
    }
    const toggle = (key) => {
      if (active) return;
      dev[key] = !dev[key];
      mark();
      world.invulnerable = dev.invulnerable;
      game.timeScale = dev.slow ? 0.25 : 1;
      showDev();
    };
    ui.show('dev', {
      kicker: active
        ? 'HUB WORLD CONTROLS ARE READ ONLY'
        : 'THE BUILDING SUPERINTENDENT’S CUPBOARD',
      title: 'Dev Mode',
      text: () =>
        `Seed ${world.seed} · tick ${world.tick} · ${world.data.name}\n${world.unranked ? 'Unranked inspection run' : 'Default rules'}`,
      actions: [
        ['Live balance sliders', () => showDev(true)],
        {
          label: 'Invulnerability: ' + (dev.invulnerable ? 'on' : 'off'),
          fn: () => toggle('invulnerable'),
          disabled: active,
        },
        [
          'Hitboxes: ' + (dev.hitboxes ? 'on' : 'off'),
          () => {
            dev.hitboxes = !dev.hitboxes;
            showDev();
          },
        ],
        [
          'Window anchors & paths: ' + (dev.anchors ? 'on' : 'off'),
          () => {
            dev.anchors = !dev.anchors;
            showDev();
          },
        ],
        {
          label: 'Bot play: ' + (botOn ? 'on' : 'off'),
          fn: () => {
            botOn = !botOn;
            mark();
            showDev();
          },
          disabled: active,
        },
        {
          label: 'Slow motion: ' + (dev.slow ? 'on' : 'off'),
          fn: () => toggle('slow'),
          disabled: active,
        },
        {
          label: 'Single step (1/120 s)',
          fn: () => {
            mark();
            world.step({});
            visual.update(world, F.DT);
            showDev();
          },
          disabled: active,
        },
        ...F.SECTIONS.map((s, i) => ({
          label: 'Warp: ' + s.name,
          fn: () => warp(i),
          disabled: active,
        })),
        {
          label: 'Restart section',
          fn: () => warp(world.section),
          disabled: active,
        },
        {
          label: 'Restart run',
          fn: () => {
            begin(game.players.length > 1);
            mark();
          },
          disabled: active,
        },
        ...['rolling', 'bumper', 'split', 'rat', 'bird', 'bat'].map((kind) => ({
          label: 'Spawn ' + kind,
          disabled: active,
          fn: () => {
            mark();
            const p = world.actors.find((p) => !p.gone);
            world.spawn({
              id: 'dev-' + kind + '-' + world.tick,
              kind,
              floor: Math.min(world.floor(p), world.data.lanes.length - 1),
              dir: -1,
              speed: 55,
              breakX: 190,
            });
            ui.hide();
            game.resume();
          },
        })),
        {
          label: 'Clear hazards',
          disabled: active,
          fn: () => {
            mark();
            world.hazards = [];
            showDev();
          },
        },
        ['Back', () => ui.back()],
      ],
    });
  }
  function activity(e) {
    if (net?.ended) return;
    if (e?.type === 'pointermove') {
      if (
        lastPointer &&
        Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) < 3
      )
        return;
      lastPointer = { x: e.clientX, y: e.clientY };
    }
    idle = 0;
    if (e?.type !== 'pointermove' && !active) sound.activate();
    else if (active && !AIHub.server && e?.type !== 'pointermove')
      sound.activate();
    if (mode === 'attract') {
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      game.go('title', null, { fade: 0 });
      title();
      wakeGuard = 0.25;
    }
  }
  for (const event of ['keydown', 'pointerdown', 'pointermove', 'touchstart'])
    addEventListener(event, activity, {
      capture: true,
      passive: false,
      signal: game._abort.signal,
    });
  let padWas = [];
  game.hook('input', (dt) => {
    if (net?.ended) {
      clearInput();
      game.input.consumeAll();
      return;
    }
    wakeGuard = Math.max(0, wakeGuard - dt);
    const pads = [...navigator.getGamepads()].filter(Boolean),
      state = pads.map((p) => ({
        b: p.buttons.map((b) => b.pressed),
        a: p.axes.slice(0, 2),
      }));
    if (
      state.some(
        (p, i) =>
          p.b.some((b, j) => b && !padWas[i]?.b[j]) ||
          p.a.some(
            (a, j) =>
              Math.abs(a) > 0.35 && Math.abs(a - (padWas[i]?.a[j] || 0)) > 0.15,
          ),
      )
    )
      activity();
    padWas = state;
    if (mode === 'title' && ui.screen === 'title') {
      idle += dt;
      if (idle >= 10) {
        mode = 'attract';
        ui.hide();
        clearInput();
        world = new F.World({ attract: true, mode: 'attract' });
        visual.reset();
        sound.stop();
        game.go('play', null, { fade: 0 });
      }
    }
    if (wakeGuard > 0) game.players.forEach((i) => i.consumeAll());
    if (active && ui.screen === 'dev') {
      /* The native inspection overlay has no world mutations. */
    }
  });
  const nativeStickDraw = game.input._stickDraw.bind(game.input);
  game.input._stickDraw = function () {
    nativeStickDraw();
    if (this._stickEl)
      this._stickEl.style.opacity = this._knobEl.style.opacity = '0';
  };
  game.input.touchButtons([]);
  function syncTouchPolicy() {
    const left = game.settings.hand === 'left';
    game.input.zones =
      game.settings.touch === 'off'
        ? []
        : [
            {
              x0: left ? 0 : 0.52,
              y0: 0.14,
              x1: left ? 0.48 : 1,
              y1: 1,
              act: 'jump',
            },
          ];
  }
  syncTouchPolicy();
  const contextButton = document.getElementById('window-action');
  game.input.bindButtons(document.getElementById('context-controls'));
  function intention(input, p) {
    if (ui.screen || wakeGuard > 0 || !p) return F.neutral();
    const m = input.move(),
      a = {
        x: m[0],
        up: input.down('up'),
        down: input.down('down'),
        jump: input.down('jump'),
        jumpPressed: input.pressed('jump'),
      };
    if (input === game.input) {
      const click = input.clicked();
      if (click) {
        const candidates = world.windows().filter((w) => {
          const pt = game.r.w(w.x, 0, w.z0 + 17);
          return (
            Math.abs(pt[0] - click[0]) < 22 && Math.abs(pt[1] - click[1]) < 33
          );
        });
        if (candidates.length) {
          const w = candidates[0];
          if (
            w.usable &&
            Math.abs(p.body.x - w.x) < 35 &&
            Math.abs(p.body.z - w.z0) < 3
          )
            mouseWindow = w.id;
          else
            ui.toast(
              w.usable
                ? 'A little closer, climber.'
                : 'Shutters shut. Wait for the arrow.',
              'Window clicks use your normal reach and climb.',
            );
        }
      }
      const requested =
        mouseWindow && world.windows().find((w) => w.id === mouseWindow);
      if (requested) {
        if (
          !requested.usable ||
          p.tumble ||
          Math.abs(p.body.z - requested.z0) > 49
        )
          mouseWindow = null;
        else {
          a.x =
            Math.abs(p.body.x - requested.x) > 8
              ? Math.sign(requested.x - p.body.x) * 0.5
              : 0;
          a.up = true;
          if (!p.traversal && Math.abs(p.body.z - requested.z1) < 2)
            mouseWindow = null;
        }
      }
    }
    if (input.lastDevice === 'touch' && a.up && !p.traversal) {
      const near = world.usable(p).find((w) => Math.abs(w.x - p.body.x) < 28);
      if (near && Math.abs(near.x - p.body.x) > 10)
        a.x = Math.sign(near.x - p.body.x) * 0.45;
    }
    if (game.settings.assist && !p.traversal) {
      const assist = F.bot(world, p, { collect: false });
      if (assist.jumpPressed) {
        a.jumpPressed = true;
        a.jump = true;
      }
      if (!p.body.onGround && p.body.vz > 0) a.jump = true;
    }
    return a;
  }
  function update(dt) {
    game.cam.smooth = 0;
    game.focus(200, 0, 126);
    game.lights.enabled = true;
    game.lights.ambient = 0.78;
    if (net?.ended) {
      sound.stop();
      contextButton.hidden = true;
      return;
    }
    if (mode === 'attract') {
      world.step(
        Object.fromEntries(world.actors.map((p) => [p.id, F.bot(world, p)])),
        dt,
      );
      if (world.phase === 'results' || world.time > 180) {
        world = new F.World({
          attract: true,
          mode: 'attract',
          hard: world.hard ? false : true,
        });
        visual.reset();
      }
    } else if (active) {
      if (net)
        net.update(
          intention(
            game.input,
            world.actors.find((p) => p.id === AIHub.me),
          ),
          dt,
        );
    } else if (mode === 'playing') {
      const inputs = Object.fromEntries(
        world.actors.map((p, i) => [
          p.id,
          botOn ? F.bot(world, p) : intention(game.players[i] || game.input, p),
        ]),
      );
      world.invulnerable = dev.invulnerable;
      world.step(inputs, dt);
      if (world.checkpoint?.section !== lastSave && !world.unranked) {
        lastSave = world.checkpoint.section;
        E.store.set(checkpointKey, world.checkpoint);
      }
      if (world.phase === 'failed' || world.phase === 'results') results();
    }
    visual.update(world, dt);
    sound.update(world, {
      silent:
        mode === 'attract' ||
        (active && (!net?.started || AIHub.server || net.ended)),
    });
    const p = world.actors.find((p) => p.id === (active ? AIHub.me : 0)),
      near = p && world.usable(p).some((w) => Math.abs(w.x - p.body.x) < 28);
    contextButton.hidden =
      ui.screen ||
      mode === 'attract' ||
      game.input.lastDevice !== 'touch' ||
      !near;
    contextButton.textContent = p?.traversal ? 'Keep climbing ↑' : 'Climb ↑';
    if (ui.screen && !overlayLast) clearInput();
    overlayLast = ui.screen;
  }
  const scenes = {
    title: {
      view: 'side',
      input: 'PLATFORMER',
      touch: [],
      camera: { zoom: false },
      enter: title,
      update(dt) {
        game.cam.smooth = 0;
        game.focus(200 - (game.W * 0.22) / game.view.scale, 0, 116);
        visual.update(world, dt);
      },
      draw(r) {
        visual.draw(r, world, { title: true });
        visual.plane(r, 230, 240, { banner: 'LOVE IS A LONG WAY UP.' });
      },
    },
    play: {
      view: 'side',
      input: 'PLATFORMER',
      pausable: true,
      touch: [],
      camera: { zoom: false },
      update,
      draw(r) {
        if (!AIHub.server) {
          visual.draw(r, world, {
            hitboxes: dev.hitboxes,
            anchors: dev.anchors,
          });
          if (mode === 'attract') {
            r.text('A CLIMBER’S DAYDREAM', r.W / 2, 42, '#fff0c9', {
              align: 'center',
              scale: 2,
            });
            r.text('DEMO  •  ANY INPUT TO PLAY', r.W / 2, r.H - 42, '#fff0c9', {
              align: 'center',
              scale: 2,
            });
          }
          if (active && !net?.started)
            r.text('WAITING FOR THE HUB', r.W / 2, 45, '#fff0c9', {
              align: 'center',
              scale: 2,
            });
        }
      },
    },
  };
  const standaloneDebug = {
    start: (o = {}) => begin(!!o.coop, null, !!o.hard),
    advance: (n = 1) => game.advance(n),
    reset: () => begin(false),
    bot: (on = true) => {
      botOn = on;
      mark();
    },
    warp,
    dev: showDev,
    showAbout: about,
    showHelp: help,
    world: () => world,
  };
  game.debug = {
    snapshot: () => ({
      ...world.snapshot(),
      runtime: mode,
      menu: ui.screen,
      audio: {
        active: sound.active,
        music: game.audio.musicVolume,
        phrase: sound.phrase,
      },
      network: net?.stats,
    }),
    ...(!active ? standaloneDebug : {}),
  };
  globalThis.__game = { game, debug: game.debug };
  game.start({ scenes, scene: active ? 'play' : 'title' });
  if (active) {
    AIHub.connect({ mode: 'shared-world', seats: [1, 2] })
      .then((info) => {
        if (!info) {
          active = false;
          game.o.menu.quit = 'title';
          for (const [key, label, min, max, step] of F.TUNING)
            game.settings.define({
              key: 'ff_' + key,
              label,
              group: 'Balance',
              type: 'slider',
              min,
              max,
              step,
              value: F.DEFAULTS[key],
            });
          Object.assign(game.debug, standaloneDebug);
          game.o.autoPause = true;
          game.live = false;
          game.go('title', null, { fade: 0 });
          return;
        }
        world = new F.World({
          seed: AIHub.seed,
          rng: AIHub.rng('world'),
          mode: 'hub',
          players: AIHub.players,
        });
        visual.reset();
        net = new F.Network(AIHub, world);
        net.onEnd = () => {
          clearInput();
          sound.stop();
          game.audio.mute(true);
          contextButton.hidden = true;
          ui.hide();
        };
        AIHub.ready();
      })
      .catch((e) => AIHub.fail(e.message));
  }
  addEventListener(
    'pagehide',
    () => {
      net?.dispose();
      sound.stop();
      game.dispose();
    },
    { once: true, signal: game._abort.signal },
  );
})();
