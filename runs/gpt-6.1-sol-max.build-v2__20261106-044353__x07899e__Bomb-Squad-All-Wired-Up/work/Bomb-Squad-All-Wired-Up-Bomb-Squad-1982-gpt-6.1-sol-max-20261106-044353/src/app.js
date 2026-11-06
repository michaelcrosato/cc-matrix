/* Adapted from the pointclick kit's Game/scenes/shell structure. No starter slices remain. */
(() => {
  'use strict';
  const W = globalThis.Wired,
    E = globalThis.My3D2dge;
  const INPUT = {
    up: ['KeyW', 'ArrowUp', 'Pad12'],
    down: ['KeyS', 'ArrowDown', 'Pad13'],
    left: ['KeyA', 'ArrowLeft', 'Pad14'],
    right: ['KeyD', 'ArrowRight', 'Pad15'],
    confirm: ['Enter', 'Space', 'Pad0'],
    cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
    pause: ['Escape', 'Pad9'],
    start: ['Enter', 'Pad9'],
    apply: ['Space', 'Enter', 'Mouse0', 'Pad0'],
    previous: ['KeyQ', 'WheelUp', 'Pad4'],
    next: ['KeyF', 'WheelDown', 'Pad5'],
    inspect: ['KeyE', 'Mouse1', 'Pad2'],
    repeat: ['KeyR', 'Pad3'],
    evidence: ['Tab', 'Pad7', 'Pad17'],
    precision: ['ShiftLeft', 'ShiftRight', 'Pad6'],
    tool0: ['Digit1'],
    tool1: ['Digit2'],
    tool2: ['Digit3'],
    tool3: ['Digit4'],
  };
  W.createApp = (options = {}) => {
    let app;
    const game = new E.Game({
      canvas: 'screen',
      id: 'wired-v1',
      headless: !!options.headless,
      draw: !!options.draw,
      loop: options.loop !== false,
      res: [640, 360],
      expand: true,
      view: 'topdown',
      views: ['topdown'],
      input: INPUT,
      bg: '#142d36',
      live: !!globalThis.AIHub?.active,
      autoPause: !globalThis.AIHub?.active,
      fullscreen: 'manual',
      menu: {
        quit: 'title',
        controls: {
          apply: 'Apply tool / hold solder',
          previous: 'Previous tool',
          next: 'Next tool',
          inspect: 'Inspect / continuity test',
          repeat: 'Repeat work order',
          evidence: 'Evidence ledger',
          precision: 'Precision',
          tool0: 'Cutters',
          tool1: 'Pliers',
          tool2: 'Solder iron',
          tool3: 'Extinguisher',
        },
        items: () => [
          ['Developer tools', () => app.dev()],
          ['About & credits', () => app.about(0)],
        ],
      },
    });
    if (globalThis.AIHub?.active) game.o.menu.quit = false;
    game.fadeTime = 0.12;
    game.cam.smooth = 0;
    game.lights.enabled = true;
    game.lights.ambient = 0.72;
    const settings = game.settings;
    settings.define({ ...settings.spec('music'), key: 'music', value: 0.1 });
    settings.define({ ...settings.spec('glyphs'), key: 'glyphs', value: 'playstation' });
    settings.define({
      key: 'voice',
      label: 'Radio voices',
      group: 'Sound',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.8,
      apply: (g, v) => {
        g.audio.voiceVolume = v;
        g.audio.applyVolume();
      },
    });
    settings.define({
      key: 'candidates',
      label: 'Candidate assistance',
      group: 'Game',
      value: false,
      help: 'Show compatible digits under the stencil. Results are labeled assisted.',
    });
    settings.define({
      key: 'touchAssist',
      label: 'Touch solder assistance',
      group: 'Game',
      value: true,
    });
    settings.define({
      key: 'textScale',
      label: 'Readable text scale',
      group: 'Game',
      type: 'slider',
      min: 0.8,
      max: 1.3,
      step: 0.1,
      value: 1,
      apply: (_, v) => {
        if (globalThis.document) document.documentElement.style.setProperty('--read-scale', v);
      },
    });
    settings.define({
      key: 'toolTravel',
      label: 'Tool travel speed',
      group: 'Game',
      type: 'slider',
      min: 3,
      max: 16,
      step: 1,
      value: 8,
    });
    const ui = new E.Shell(game, {
      tv: true,
      theme: {
        paper: '#102a31',
        ink: '#f1ecd8',
        accent: '#efc66d',
        muted: '#b4c8be',
        danger: '#f18b72',
        line: '#4c6e69',
        font: '"Trebuchet MS", Arial, sans-serif',
        titleFont: 'Impact, "Arial Narrow", sans-serif',
      },
      screens: {
        pause: {
          kicker: () => (app?.net.mode === 'solo' ? 'BENCH PAUSED' : 'ONLINE · FUSE CONTINUES'),
          text: () =>
            app?.net.mode === 'solo'
              ? 'Breathe. The fuse waits here.'
              : 'Menus are local. Your crew and the fuse keep working.',
        },
        help: {
          kicker: 'FIELD MANUAL',
          title: 'Good joints. Clear thinking.',
          sections: [
            [
              '1 · Repair',
              'Cut BOTH terminal pads. Pliers lift the freed component. Pliers pick a spare, then place it in the empty socket. Hold solder on each pad; release in the green band.',
            ],
            [
              '2 · Diagnose',
              'A board uses one replacement rule: shape or color pattern. With a spare in pliers, Inspect tests continuity for two seconds of fuse. A failed installation can be lifted and replaced. Stock is reusable.',
            ],
            [
              '3 · Recover',
              'Wrong lead? Solder the glowing joint within eight seconds. Fire? Extinguisher, then hold anywhere on the board. Heat cools while away; fire does not go out by itself.',
            ],
            [
              '4 · Deduce',
              'Repairs reveal LIT and DARK stencil cells. Unknown cells prove nothing. Compare against the exact ten glyphs in the reference. Two boards unlock code entry. Selecting a digit does not transmit it.',
            ],
            [
              '5 · Cooperate',
              'Claim separate sectors. Every board shares its evidence. A confirmed proposal opens a five-second crew vote. Any veto cancels it; a strict majority may submit. The fuse runs during the vote.',
            ],
          ],
          actions: [
            ['Controls & rebinding', () => ui.show('controls')],
            ['Digit reference', () => app.reference()],
            ['Back', () => ui.back()],
          ],
        },
      },
    });
    const net = new W.Session({
      onBegin: (s) => {
        if (app && net.mode !== 'solo') {
          app.enterField();
          app.lastOutcome = null;
          app.lastEvent = 0;
          app.sound.reset();
        }
      },
      onState: () => app?.refresh(),
      onStatus: () => app?.refreshLobby(),
      onLobby: () => app?.refreshLobby(),
      onEnd: (reason) => app?.networkEnded(reason),
      onReject: (why) => app?.notice(why),
      onCommand: (c, result) => {
        if (app && c && !result.ok) app.notice(result.why);
      },
    });
    app = {
      g: game,
      ui,
      net,
      art: new W.Art(game),
      sound: new W.Audio(game),
      focus: 0,
      tool: 0,
      boardId: null,
      observing: false,
      hold: null,
      lastEvent: 0,
      lastOutcome: null,
      radio: 'NELL · Technical partner',
      caption: 'Keep your nerve. Save the city.',
      captionUntil: 0,
      menuPage: 'title',
      seed: null,
      runCampaign: false,
      attract: false,
      attractIndex: 0,
      attractWait: 0,
      attractPhase: 0,
      editorPreview: null,
      checkpoint: null,
      joinCode: '',
      joinChar: 0,
      pointerTime: -1,
      voiceTime: 0,
    };
    W.app = app;
    app.editor = new W.Editor(app);
    app.progress = E.store.get('wired-progress-v1', null);
    if (
      !app.progress ||
      app.progress.version !== 1 ||
      !Array.isArray(app.progress.finished) ||
      !app.progress.best ||
      typeof app.progress.best !== 'object' ||
      !app.progress.seeds ||
      typeof app.progress.seeds !== 'object'
    )
      app.progress = { version: 1, finished: [], best: {}, seeds: {}, training: false };
    app.cabinet = new E.Arcade(game, { id: 'wired-attract', idle: 10, demo: 9999, scores: 0 });
    app.state = () => (app.attract ? app.demo.s : net.state);
    app.sim = () => (app.attract ? app.demo : net.sim);
    app.currentBoard = () => app.state()?.boards.find((b) => b.id === app.boardId);
    app.perform = (op, args = {}) => {
      app.hintAt = game.real;
      const result = app.attract
        ? app.demo.command('demo', {
            id: 'demo-' + ++app.demoSerial,
            caseId: app.demo.s.id,
            op,
            ...args,
          })
        : net.command(op, args);
      if (!result.ok) app.notice(result.why);
      return result;
    };
    app.notice = (text, who = 'NELL', priority = 2) => {
      app.caption = text;
      app.radio = who === 'VEX' ? 'VEX · Uninvited frequency' : 'NELL · Technical partner';
      app.captionUntil = game.real + 6;
      if (!app.attract || game.audio.ready) app.sound.say(text, who.toLowerCase(), priority);
      app.refreshHUD();
    };
    app.setLayout = (name) => {
      app.menuPage = name;
      if (ui.root) ui.root.dataset.mode = name;
      if (globalThis.document) document.body.dataset.view = name;
    };
    app.popPage = () => {
      const top = ui._stack[ui._stack.length - 1];
      if (top) top.s.back = null;
      ui.back();
      app.setLayout(ui.screen || (app.boardId ? 'board' : 'evidence'));
    };
    app.title = () => {
      if (net.mode === 'hub' && !net.ended) return;
      net.cleanup();
      net.mode = 'solo';
      net.me = 'solo';
      net.authority = true;
      game.live = false;
      game.o.autoPause = true;
      game.paused = false;
      app.attract = false;
      app.boardId = null;
      app.editorPreview = null;
      app.hold = null;
      app.lastOutcome = null;
      ui.hide();
      app.refreshHUD();
      app.setLayout('title');
      game.go('title', null, { fade: 0 });
      ui.show('title', {
        name: 'BOMB SQUAD\nALL WIRED UP',
        kicker: 'BRASSWATER MUNICIPAL RESPONSE',
        subtitle: W.TAGLINE,
        text: 'A steady hand. A suspicious circuit.\nA city counting on you.',
        actions: [
          {
            label: app.progress.finished.length ? 'Continue dispatch' : 'Begin dispatch',
            primary: true,
            fn: () => {
              app.runCampaign = true;
              app.brief(app.progress.training ? 'waterfront' : 'training');
            },
          },
          ['Case files', () => app.cases()],
          ['Co-op dispatch', () => app.online()],
          ['Field manual', () => ui.show('help')],
          ['Settings', () => ui.show('settings')],
          ['About & credits', () => app.about(0)],
        ],
        meta: ['1–4 TECHNICIANS', 'REPAIR · REASON · DISARM'],
        footer: 'Inspired by Bomb Squad (1982) · Original city, crew & cases',
      });
      app.cabinet.wake();
      app.lastInputReal = game.real;
      app.sound.reset();
    };
    app.cases = () => {
      app.setLayout('cases');
      ui.hide();
      ui.show('cases', {
        kicker: 'DISPATCH FILES',
        title: 'Choose your next call',
        text: 'Training plus three complete cases. Replay a case with its previous seed or take a fresh device.',
        actions: W.CASES.map((c) => [
          `${c.number} · ${c.name}${app.progress.finished.includes(c.id) ? ' ✓' : ''}`,
          () => {
            app.runCampaign = false;
            app.brief(c.id);
          },
        ]).concat([
          [
            'Replay last seed',
            () => {
              const id = app.lastCase || 'waterfront';
              app.brief(id, app.progress.seeds[id] || app.seed);
            },
          ],
          ['Back to title', () => app.title()],
        ]),
        back: () => app.title(),
      });
    };
    app.brief = (id, seed = null) => {
      const d = W.CASES.find((c) => c.id === id);
      app.lastCase = id;
      app.seed = seed || W.roomCode();
      app.briefCase = id;
      app.setLayout('brief');
      ui.hide();
      game.go('brief', null, { fade: 0 });
      ui.show('brief', {
        kicker: `CASE ${d.number} · ${d.site}`,
        title: d.name,
        text: d.brief,
        sections: [['FIELD NOTE', d.lesson]],
        actions: [
          {
            label: id === 'training' ? 'Start guided repair' : 'Open the device',
            primary: true,
            fn: () => app.start(id, app.seed),
          },
          ...(id === 'training'
            ? [
                [
                  'Skip training',
                  () => {
                    app.progress.training = true;
                    app.brief('waterfront');
                  },
                ],
              ]
            : []),
          ['Back to case files', () => app.cases()],
        ],
        back: () => app.cases(),
      });
    };
    app.start = (id, seed) => {
      app.lastOutcome = null;
      app.lastEvent = 0;
      app.boardId = null;
      app.hold = null;
      app.sound.reset();
      net.solo(id, seed);
      net.state.assisted = settings.candidates;
      app.voiceTime = 0;
      const tuning = { ...W.DEFAULTS };
      for (const [key] of app.knobs || [])
        if (settings['dev_' + key] !== undefined) tuning[key] = settings['dev_' + key];
      if (Object.keys(tuning).some((k) => tuning[k] !== W.DEFAULTS[k])) {
        net.state.tuning = tuning;
        net.state.modified = true;
        net.state.duration *= tuning.fuseScale;
        net.state.remaining = net.state.duration;
      }
      app.enterField();
      app.openEvidence();
      app.notice(W.CASES.find((c) => c.id === id).lesson);
    };
    app.enterField = () => {
      game.live = net.mode !== 'solo';
      game.o.autoPause = net.mode === 'solo';
      game.paused = false;
      game.go('field', null, { fade: 0 });
      ui.hide();
      app.setLayout('evidence');
      app.boardId = null;
      app.tool = 0;
      app.focus = 0;
      app.lastOutcome = null;
      app.lastEvent = 0;
      app.hold = null;
      app.assistReported = null;
    };
    app.evidenceKey = (s) =>
      JSON.stringify([
        s.completed,
        s.boards.map((b) => [b.id, b.owner, b.done, b.fire, !!b.fault]),
      ]);
    app.refreshEvidence = () => {
      const s = app.state();
      if (
        s &&
        ui.screen === 'evidence' &&
        app.menuPage === 'evidence' &&
        app.evidenceSignature !== app.evidenceKey(s)
      )
        app.openEvidence(true);
    };
    app.openEvidence = (refresh = false) => {
      app.releaseHold(true);
      if (app.benchCamera) app.benchCamera();
      app.editorPreview = null;
      const s = app.state();
      if (!s || net.syncing) return;
      if (!refresh) ui.hide();
      app.setLayout('evidence');
      app.boardId = null;
      app.evidenceSignature = app.evidenceKey(s);
      const actions = s.boards.map((b) => ({
        label: `${b.done ? '✓' : b.fire ? 'FIRE' : b.fault ? '!' : b.owner !== null ? '●' : '○'} ${b.name}${b.owner !== null ? ' · claimed' : ''}`,
        disabled: b.done,
        fn: () => app.openBoard(b.id),
      }));
      actions.push({
        label:
          s.completed < (s.caseId === 'training' ? 1 : 2)
            ? 'Code locked · repair two boards'
            : 'Dial disarm code',
        disabled: s.completed < (s.caseId === 'training' ? 1 : 2),
        fn: () => app.dial(),
      });
      actions.push(
        ['Digit reference', () => app.reference()],
        ['Inspect the city', () => app.cityView()],
        [
          'Back to work',
          () => {
            const b = s.boards.find((b) => b.owner === net.me && !b.done);
            if (b) app.openBoard(b.id);
            else {
              const b = s.boards.find((b) => !b.done);
              if (b) app.openBoard(b.id);
            }
          },
        ],
      );
      ui.show('evidence', {
        kicker: `${W.CASES.find((c) => c.id === s.caseId)?.site || 'SCRATCH DEVICE'} · ${s.completed}/${s.boards.length} SECURED`,
        title: 'Read between the wires',
        text: net.syncing
          ? 'Synchronizing…'
          : 'Choose a sector. Its gold cells show the evidence it will reveal. Dark evidence is as useful as light.',
        actions,
        back: () => {
          const b = s.boards.find((b) => !b.done);
          if (b) app.openBoard(b.id);
        },
      });
    };
    app.benchCamera = () => {
      game.setView('topdown');
      game.view.set(0, 72, 1.28, 1);
      game.focus(140, 65, 0);
      game.cam.offset = [0, 8];
    };
    app.cityView = () => {
      app.releaseHold(true);
      app.setLayout('city');
      game.setView('threequarter');
      game.focus(160, 140, 25);
      game.cam.offset = [0, 0];
      ui.hide();
      const s = app.state(),
        d = W.CASES.find((c) => c.id === s.caseId);
      ui.show('city', {
        kicker: 'LIVE CITY VIEW · THE FUSE CONTINUES',
        title: d.site,
        text:
          d.subtitle +
          ' The response crew is holding the perimeter. Your partial repairs and hazards remain live.',
        actions: [['Return to evidence', () => app.openEvidence()]],
        back: () => app.openEvidence(),
      });
    };
    app.openBoard = (id) => {
      app.benchCamera();
      const b = app.state()?.boards.find((b) => b.id === id);
      if (!b || b.done) return;
      app.releaseHold(true);
      app.boardId = id;
      app.observing = b.owner !== null && b.owner !== (app.attract ? 'demo' : net.me);
      if (!app.observing) {
        const r = app.perform('claim', { board: id });
        if (!r.ok) return;
      }
      ui.hide();
      app.setLayout('board');
      app.tool = 0;
      app.focus = 0;
      app.pointerTime = game.input.mouse.t;
      app.notice(
        app.observing
          ? 'Observation mode. This sector belongs to a teammate.'
          : new W.Simulation(app.state()).instruction(b),
      );
    };
    app.reference = () => {
      app.releaseHold(true);
      app.setLayout('reference');
      ui.show('reference', {
        kicker: 'EXACT 4 × 5 STENCIL ALPHABET',
        title: 'The ten possibilities',
        text: 'The reference and code dial use the same cells as the device. Confirmed dark cells must remain dark; confirmed lit cells must remain lit. Unknown cells can be either.',
        actions: [
          [
            'Return',
            () => {
              ui.back();
              app.setLayout(
                ui.screen === 'evidence' ? 'evidence' : app.boardId ? 'board' : 'cases',
              );
            },
          ],
        ],
        back: () => {
          ui._stack.pop();
          ui._render();
          app.setLayout(ui.screen === 'evidence' ? 'evidence' : app.boardId ? 'board' : 'cases');
        },
      });
    };
    app.dial = (keep = false) => {
      app.releaseHold(true);
      const s = app.state();
      if (!s) return;
      if (!keep) {
        app.digits = Array(s.evidence.length).fill(0);
        app.dialDigit = 0;
      }
      ui.hide();
      app.setLayout('dial');
      ui.show('dial', {
        kicker: 'SELECTING DIGITS DOES NOT TRANSMIT',
        title: 'Your call, technician',
        text: () =>
          `Digit ${app.dialDigit + 1} of ${app.digits.length}. Selected code: ${app.digits.join(' ')}. Compare the preview to your evidence before confirming.`,
        actions: [
          [
            'Increase digit',
            () => {
              app.digits[app.dialDigit] = (app.digits[app.dialDigit] + 1) % 10;
              app.dial(true);
            },
          ],
          [
            'Decrease digit',
            () => {
              app.digits[app.dialDigit] = (app.digits[app.dialDigit] + 9) % 10;
              app.dial(true);
            },
          ],
          [
            'Next digit',
            () => {
              app.dialDigit = (app.dialDigit + 1) % app.digits.length;
              app.dial(true);
            },
          ],
          { label: 'Prepare transmission', primary: true, fn: () => app.confirmCode() },
          ['Back to evidence', () => app.openEvidence()],
        ],
        back: () => app.openEvidence(),
      });
    };
    app.confirmCode = () => {
      ui.show('confirmCode', {
        kicker: 'FINAL CHECK · THE FUSE IS RUNNING',
        title: `Transmit ${app.digits.join(' ')}?`,
        text:
          net.mode === 'solo'
            ? 'A confirmed wrong code ends the case. You can return to the evidence and keep repairing.'
            : 'This confirms your YES vote. The crew has five seconds to accept or veto. The fuse continues.',
        actions: [
          { label: 'Return to evidence', primary: true, fn: () => app.openEvidence() },
          [
            'Transmit code ' + app.digits.join(''),
            () => {
              app.perform('propose', { digits: app.digits });
              ui.hide();
              app.setLayout('board');
              if (!app.state().outcome) app.votePage();
            },
          ],
        ],
        back: () => app.openEvidence(),
      });
    };
    app.votePage = () => {
      if (!app.state()?.proposal) return;
      ui.hide();
      app.setLayout('vote');
      ui.show('vote', {
        kicker: 'CREW CONFIRMATION · FIVE SECONDS',
        title: 'A code is on the line',
        text: () =>
          `Proposed code ${app.state().proposal?.digits.join(' ') || ''}. Every veto cancels. A strict majority without veto may transmit.`,
        actions: [
          {
            label: 'Veto · keep repairing',
            primary: true,
            fn: () => {
              app.perform('vote', { yes: false });
              app.openEvidence();
            },
          },
          [
            'Accept transmission',
            () => {
              app.perform('vote', { yes: true });
              ui.hide();
              app.setLayout('evidence');
            },
          ],
        ],
        back: () => {
          app.perform('vote', { yes: false });
          app.openEvidence();
        },
      });
    };
    app.targets = () => {
      const b = app.currentBoard();
      if (!b) return [];
      const targets = [];
      for (const c of b.components) {
        for (let side = 0; side < 2; side++)
          targets.push({
            id: c.id + ':' + side,
            kind: 'terminal',
            target: c.id,
            terminal: side,
            x: c.x + c.anchors[side][0],
            y: c.y + c.anchors[side][1],
            z: 18,
          });
        targets.push({ id: c.id, kind: 'component', target: c.id, x: c.x, y: c.y, z: 24 });
      }
      b.stock.forEach((s, i) =>
        targets.push({ id: s.id, kind: 'spare', spare: s.id, x: 35 + i * 60, y: -27, z: 23 }),
      );
      targets.push({ id: 'test', kind: 'test', x: 270, y: 144, z: 22 });
      if (b.fire) targets.unshift({ id: 'fire', kind: 'fire', x: 140, y: 85, z: 20 });
      return targets;
    };
    app.legal = (t, b) => {
      const p = b.components.find((c) => c.id === t.target),
        current = b.order[b.job],
        tool = W.TOOLS[app.tool];
      if (t.kind === 'test') return !!b.held;
      if (tool === 'foam') return b.fire;
      if (b.fire) return false;
      if (tool === 'solder')
        return (
          !!p &&
          ((b.fault?.component === p.id && b.fault.terminal === (t.terminal || 0)) ||
            (p.phase === 'placed' && p.leads[t.terminal || 0] !== 2))
        );
      if (b.fault) return false;
      if (tool === 'cut')
        return !!p && p.id === current && p.phase === 'attached' && p.leads[t.terminal || 0] !== 1;
      if (tool === 'grip') {
        if (t.kind === 'spare') {
          const sp = b.stock.find((s) => s.id === t.spare);
          return (
            !!sp &&
            b.components.filter((c) => c.spare === sp.id && ['placed', 'stable'].includes(c.phase))
              .length < (sp.qty || 1)
          );
        }
        return (
          !!p &&
          p.id === current &&
          ((p.phase === 'attached' && p.leads.every((v) => v === 1)) ||
            (p.phase === 'empty' && !!b.held) ||
            p.phase === 'wrong' ||
            p.phase === 'placed')
        );
      }
      return false;
    };
    app.target = () => {
      const ts = app.targets();
      app.focus = Math.min(Math.max(0, app.focus), Math.max(0, ts.length - 1));
      return ts[app.focus];
    };
    app.project = (t) => {
      const p = game.view.p(t.x, t.y, t.z || 0);
      return [p[0] - game.cam.x, p[1] - game.cam.y];
    };
    app.hover = (p) => {
      if (!p) return null;
      const ts = app.targets();
      let best = -1,
        distance = 28;
      ts.forEach((t, i) => {
        const q = app.project(t),
          d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < distance) {
          distance = d;
          best = i;
        }
      });
      if (best >= 0) app.focus = best;
      return best >= 0 ? ts[best] : null;
    };
    app.moveFocus = (dx, dy) => {
      const ts = app.targets(),
        t = ts[app.focus];
      if (!t) return;
      const p = app.project(t);
      let best = -1,
        score = Infinity;
      ts.forEach((a, i) => {
        if (i === app.focus) return;
        const q = app.project(a),
          x = q[0] - p[0],
          y = q[1] - p[1],
          along = x * dx + y * dy,
          side = Math.abs(x * dy - y * dx);
        if (along <= 1) return;
        const n = along + side * 2.6;
        if (n < score) {
          score = n;
          best = i;
        }
      });
      if (best >= 0) {
        app.focus = best;
        app.sound.cue('grip');
      }
    };
    app.releaseHold = (cancel) => {
      if (!app.hold) return;
      const h = app.hold;
      app.hold = null;
      app.perform(cancel ? 'cancel' : 'end', { board: h.board });
    };
    app.use = (t, assist = false) => {
      const b = app.currentBoard();
      if (!b || !t) return;
      if (app.observing) {
        app.notice('Observation only. Choose an unclaimed sector to work.');
        return;
      }
      if (t.kind === 'test') {
        app.perform('test', { board: b.id });
        return;
      }
      const c = b.components.find((c) => c.id === t.target);
      if (assist) {
        if (b.fire) app.tool = 3;
        else if (b.fault && c?.id === b.fault.component) app.tool = 2;
        else if (
          t.kind === 'spare' ||
          (t.kind === 'component' && (c?.phase !== 'attached' || c?.leads.every((v) => v === 1)))
        )
          app.tool = 1;
        else if (c?.phase === 'placed') app.tool = 2;
        else app.tool = 0;
      }
      const tool = W.TOOLS[app.tool];
      if (tool === 'solder' || tool === 'foam') {
        const result = app.perform('begin', {
          board: b.id,
          tool,
          target: t.target,
          terminal: t.terminal || 0,
        });
        if (result.ok)
          app.hold = {
            board: b.id,
            tool,
            target: t.target,
            terminal: t.terminal || 0,
            auto: assist,
            started: app.state().time,
          };
      } else {
        app.perform('act', {
          board: b.id,
          tool,
          target: t.target,
          terminal: t.terminal || 0,
          spare: t.spare,
        });
        app.art.action(tool, t);
      }
      app.refreshHUD();
    };
    app.boardInput = () => {
      const I = game.input,
        b = app.currentBoard();
      if (!b) return;
      if (I.mouse.t !== app.pointerTime) {
        app.pointerTime = I.mouse.t;
        app.hover(I.pointer());
      }
      for (const [dir, dx, dy] of [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ])
        if (I.repeat(dir, 0.28, 0.12)) app.moveFocus(dx, dy);
      let next = app.tool;
      if (I.pressed('previous')) next = (next + 3) % 4;
      if (I.pressed('next')) next = (next + 1) % 4;
      for (let i = 0; i < 4; i++) if (I.pressed('tool' + i)) next = i;
      if (next !== app.tool) {
        app.releaseHold(true);
        app.tool = next;
        app.sound.cue('grip');
      }
      if (I.pressed('repeat')) app.notice(new W.Simulation(app.state()).instruction(b));
      if (I.pressed('inspect')) {
        if (b.held) app.perform('test', { board: b.id });
        else {
          const t = app.target(),
            c = b.components.find((c) => c.id === t?.target);
          app.notice(
            c
              ? `${c.id}: ${c.shape.toUpperCase()} · ${W.PALETTE.find((p) => p.id === c.color)?.label}. ${b.ruleKnown ? 'Rule: ' + b.rule.toUpperCase() : 'Rule unknown. Pick a spare and test for 2s.'}`
              : b.ruleKnown
                ? 'Rule: ' + b.rule.toUpperCase()
                : 'Pick a spare, then Inspect for a continuity test.',
          );
        }
      }
      if (I.pressed('evidence')) {
        app.openEvidence();
        return;
      }
      if (I.pressed('cancel') && !I.pressed('pause')) {
        app.releaseHold(true);
        if (b.held) app.perform('drop', { board: b.id });
        else app.openEvidence();
        return;
      }
      if (I.lastDevice === 'touch') {
        const p = I.clicked();
        if (p && !app.hold) {
          const t = app.hover(p);
          if (t) {
            app.use(t, settings.touchAssist);
            if (!app.state().assisted) app.perform('assist');
          }
        }
      } else if (I.pressed('apply')) {
        const t = I.lastDevice === 'mouse' ? app.hover(I.pointer()) : app.target();
        if (t) app.use(t);
      }
      if (app.hold) {
        const h = b.hold;
        if (h?.tool === 'foam' && app.hold.tool === 'foam') {
        } else if (
          app.hold.auto &&
          h &&
          app.state().time - h.start >= app.state().tuning.safeMin + 0.14
        )
          app.releaseHold(false);
        else if (!app.hold.auto && !I.down('apply')) app.releaseHold(false);
        if (app.hold?.tool === 'foam' && !b.fire) app.hold = null;
      }
    };
    app.results = () => {
      const s = app.state(),
        o = s?.outcome;
      if (!o) return;
      app.releaseHold(true);
      app.lastOutcome = o;
      app.setLayout('results');
      game.go('result', null, { fade: 0 });
      ui.hide();
      const d = W.CASES.find((c) => c.id === s.caseId) || W.CASES[0];
      if (net.mode === 'solo' && !app.attract) {
        app.progress.seeds[s.caseId] = s.seed;
        if (o.won && !s.modified) {
          if (!app.progress.finished.includes(s.caseId)) app.progress.finished.push(s.caseId);
          if (s.caseId === 'training') app.progress.training = true;
          if (!s.assisted)
            app.progress.best[s.caseId] = Math.max(o.score, app.progress.best[s.caseId] || 0);
        }
        E.store.set('wired-progress-v1', app.progress);
      }
      const actions = [];
      if (o.won && net.mode === 'solo') {
        const next = W.CASES[W.CASES.indexOf(d) + 1];
        actions.push({
          label: next ? 'Next dispatch · ' + next.name : 'Watch the ending',
          primary: true,
          fn: () => (next ? app.brief(next.id) : app.ending()),
        });
      }
      if (net.mode === 'peer' && net.authority) {
        const next = W.CASES[W.CASES.indexOf(d) + 1];
        actions.push(
          [
            'Retry with crew',
            () => {
              net.begin(s.caseId, s.seed);
              app.openEvidence();
            },
          ],
          [
            'Fresh device with crew',
            () => {
              net.begin(s.caseId, W.roomCode());
              app.openEvidence();
            },
          ],
          ...(o.won && next
            ? [
                [
                  'Next crew dispatch · ' + next.name,
                  () => {
                    net.begin(next.id, W.roomCode());
                    app.openEvidence();
                  },
                ],
              ]
            : []),
          ['Close room', () => app.title()],
        );
      } else if (net.mode === 'peer') {
        actions.push({ label: 'Waiting for host dispatch', disabled: true }, [
          'Leave room',
          () => app.title(),
        ]);
      } else if (net.mode !== 'hub') {
        actions.push(
          ['Retry same seed', () => app.start(s.caseId, s.seed)],
          ['Fresh device', () => app.start(s.caseId, W.roomCode())],
          ['Case files', () => app.cases()],
          ['Title', () => app.title()],
        );
      }
      ui.show('results', {
        kicker: (s.modified ? 'DEVELOPER MODIFIED · ' : s.assisted ? 'ASSISTED · ' : '') + d.site,
        title: o.won ? 'All clear.' : 'One more chance.',
        emblem: o.won ? '✓' : '!',
        text: o.won ? d.success : d.failure + '\nCause: ' + o.cause,
        stats: [
          [String(o.score), 'TOTAL SCORE'],
          [Math.ceil(s.remaining) + 's', 'FUSE SAVED'],
          [String(s.completed), 'BOARDS SECURED'],
        ],
        sections: [
          [
            'SCORE BREAKDOWN',
            `Disposal ${o.cards.disposal} · Fuse ${o.cards.fuse} · Clean work ${o.cards.clean} · Informed early call ${o.cards.inference} · Repairs ${o.cards.repairs}`,
          ],
        ],
        actions,
        back: () => {
          if (net.mode !== 'hub') app.cases();
        },
      });
      app.notice(o.won ? d.success : d.failure);
    };
    app.ending = () => {
      app.setLayout('ending');
      ui.hide();
      game.go('ending', null, { fade: 0 });
      const beats = [
        'The clock strikes midnight. Nothing else does.',
        'Nell puts the iron away. The crew’s kettle clicks off. Vex’s final radio goes very, very quiet.',
        'BRASSWATER IS SAFE. Thanks for keeping your nerve.',
      ];
      let i = 0;
      const show = () =>
        ui.show('ending', {
          kicker: 'THREE CALLS · ONE VERY LONG NIGHT',
          title: i === 2 ? 'All wired up. All clear.' : 'A city exhales.',
          text: beats[i],
          actions: [
            [
              i < 2 ? 'Continue' : 'Acknowledgments',
              () => {
                if (i < 2) {
                  i++;
                  show();
                } else app.about(0);
              },
            ],
            ['Case files', () => app.cases()],
          ],
          back: () => app.cases(),
        });
      show();
    };
    app.about = (page = 0) => {
      app.releaseHold(true);
      const report = W.REPORT,
        groups = report
          ? [
              ...[
                [0, 4],
                [4, 8],
                [8, 10],
                [10, 12],
                [12, 15],
              ].map(([start, end], i) => [
                i === 0 ? 'Source Information' : 'Source Information · continued',
                Object.entries(report.sourceInformation)
                  .slice(start, end)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n\n'),
              ]),
              [
                'Testing Feedback',
                report.testingFeedback.map((v, i) => `${i + 1}. ${v}`).join('\n\n'),
              ],
              [
                'Engine Feedback',
                report.engineFeedback
                  .slice(0, 3)
                  .map((v, i) => `${i + 1}. ${v}`)
                  .join('\n\n'),
              ],
              [
                'Engine Feedback · continued',
                report.engineFeedback
                  .slice(3)
                  .map((v, i) => `${i + 4}. ${v}`)
                  .join('\n\n'),
              ],
              [
                'Prompt Feedback',
                report.promptFeedback.map((v, i) => `${i + 1}. ${v}`).join('\n\n'),
              ],
              [
                'Acknowledgments',
                'Original game: Bomb Squad (1982), Mattel Electronics. Design/program: Gene Smith and Shatao Lin; graphics: Kai Tran; sound: Russ Lieblich; voices: Phil Proctor and Peter Bergman. Source research: Blue Sky Rangers manual and creator-maintained history.\n\nOriginal game here: Brasswater, Nell, Vex, campaign, art, voices, score, puzzles and cooperative rules. my-3D2dge 0.89.1 by Michael Crosato (MIT); PeerJS 1.5.5 (MIT); AI Hub protocol 1/client 1.4.0. Full dependency notices are embedded in this HTML and preserved in vendor/. No original game assets or recorded audio are shipped.',
              ],
            ]
          : [
              [
                'Build information',
                'Source: Bomb Squad (1982). Plan: PLAN.md. Usage: added on import.',
              ],
            ];
      page = (page + groups.length) % groups.length;
      app.setLayout('about');
      ui.show('about', {
        kicker: `ABOUT & CREDITS · ${page + 1}/${groups.length}`,
        title: groups[page][0],
        text: groups[page][1],
        actions: [
          ['Next page', () => app.about(page + 1)],
          ['Previous page', () => app.about(page - 1)],
          [
            'Back',
            () => {
              ui.hide();
              if (app.state()?.outcome) app.results();
              else if (app.boardId) app.setLayout('board');
              else app.title();
            },
          ],
        ],
        back: () => {
          ui.hide();
          if (app.state()?.outcome) app.results();
          else if (app.boardId) app.setLayout('board');
          else app.title();
        },
      });
    };
    app.online = () => {
      app.setLayout('online');
      ui.hide();
      ui.show('online', {
        kicker: 'CO-OP DISPATCH · 1–4 TECHNICIANS',
        title: 'A crew beats a clock',
        text: 'Work separate sectors of the same device. Evidence is shared. One deliberate code proposal, then the crew votes. Host authority fixes workload and fuse at case start.',
        actions: [
          {
            label: 'Host a room',
            primary: true,
            fn: async () => {
              try {
                await net.hostRoom();
                app.lobby();
              } catch (e) {
                app.notice(e.message);
              }
            },
          },
          ['Join a room', () => app.joinPage()],
          ['Back to title', () => app.title()],
        ],
        back: () => app.title(),
      });
    };
    app.lobby = () => {
      app.setLayout('lobby');
      ui.hide();
      ui.show('lobby', {
        kicker: 'STANDALONE WEBRTC · PEERJS 1.5.5',
        title: 'Room ' + (net.room || '…'),
        text: () =>
          `${net.status}\n${net.seats.length}/4 connected · ${net.lobby?.ready?.length || 1} ready\nShare the six-character code. The workload and fuse lock at dispatch.`,
        actions: net.authority
          ? [
              [
                'Dispatch: waterfront',
                () => {
                  net.begin('waterfront', W.roomCode());
                  app.openEvidence();
                },
              ],
              [
                'Dispatch: power relay',
                () => {
                  net.begin('relay', W.roomCode());
                  app.openEvidence();
                },
              ],
              [
                'Dispatch: civic spire',
                () => {
                  net.begin('central', W.roomCode());
                  app.openEvidence();
                },
              ],
              [
                'Retry signaling',
                async () => {
                  await net.hostRoom();
                  app.lobby();
                },
              ],
              ['Close room', () => app.title()],
            ]
          : [
              ['Ready', () => net.send({ kind: 'ready', ready: true })],
              [
                'Reconnect',
                async () => {
                  await net.joinRoom(net.room);
                  app.lobby();
                },
              ],
              ['Leave room', () => app.title()],
            ],
        back: () => app.title(),
      });
    };
    app.refreshLobby = () => {
      if (app.menuPage === 'lobby' && ui.screen === 'lobby') app.lobby();
    };
    app.joinPage = () => {
      app.setLayout('join');
      ui.hide();
      settings.define({
        key: 'roomChar',
        label: 'Code character',
        type: 'select',
        value: 'A',
        options: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''),
        group: 'Connection',
      });
      const show = () => {
        ui.show('join', {
          kicker: 'JOIN A RESPONSE CREW',
          title: app.joinCode.padEnd(6, '·'),
          text: net.status.startsWith('Network:')
            ? net.status
            : 'Type or paste the room code, or choose characters with the controller.',
          rows: ['roomChar'],
          actions: [
            [
              'Append character',
              () => {
                if (app.joinCode.length < 6) app.joinCode += settings.roomChar;
                show();
              },
            ],
            [
              'Delete character',
              () => {
                app.joinCode = app.joinCode.slice(0, -1);
                show();
              },
            ],
            {
              label: 'Connect to room',
              primary: true,
              disabled: app.joinCode.length !== 6,
              fn: async () => {
                try {
                  await net.joinRoom(app.joinCode);
                  app.lobby();
                } catch (e) {
                  app.notice(e.message);
                }
              },
            },
            ['Back', () => app.online()],
          ],
          back: () => app.online(),
        });
        if (ui.root) {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'room-input';
          input.maxLength = 6;
          input.placeholder = 'Six-character room code';
          input.value = app.joinCode;
          input.setAttribute('aria-label', 'Room code');
          input.oninput = () => {
            app.joinCode = input.value
              .toUpperCase()
              .replace(/[^A-Z2-9]/g, '')
              .slice(0, 6);
            const b = [...ui.root.querySelectorAll('.esh-btns button')].find((b) =>
              b.textContent.includes('Connect to room'),
            );
            if (b) b.disabled = app.joinCode.length !== 6;
          };
          ui.root.querySelector('.esh-mod')?.prepend(input);
        }
      };
      show();
    };
    app.networkEnded = (reason) => {
      app.releaseHold(true);
      app.sound.stop();
      if (net.mode === 'hub') {
        game.scene.pausable = false;
        game.input.clear();
        ui.hide();
        app.setLayout('ended');
        return;
      }
      ui.hide();
      app.setLayout('networkEnd');
      ui.show('networkEnd', {
        kicker: 'CONNECTION CLOSED',
        title: 'The link went quiet',
        text: net.status,
        actions: [
          [
            'Rejoin room',
            async () => {
              const room = net.room;
              await net.joinRoom(room);
              app.lobby();
            },
          ],
          ['Return to title', () => app.title()],
        ],
        back: () => app.title(),
      });
    };
    app.tune = (key, v) => {
      if (!app || net.mode === 'hub' || !net.authority || !net.sim) return;
      for (const b of net.sim.s.boards) b.hold = null;
      app.hold = null;
      net.sim.s.tuning[key] = v;
      if (key === 'safeMin' && v >= net.sim.s.tuning.safeMax) net.sim.s.tuning.safeMax = v + 0.2;
      if (key === 'safeMax' && v <= net.sim.s.tuning.safeMin)
        net.sim.s.tuning.safeMin = Math.max(0.1, v - 0.2);
      net.sim.s.modified = true;
      net.queueAll();
    };
    const knobs = [
      ['timeScale', 'Simulation speed', 0.25, 3, 0.25],
      ['fuseScale', 'New-case fuse multiplier', 0.5, 2, 0.1],
      ['safeMin', 'Solder band start (s)', 0.2, 0.8, 0.05],
      ['safeMax', 'Solder band end (s)', 0.85, 1.8, 0.05],
      ['heatGain', 'Iron heat per second', 5, 65, 5],
      ['cooling', 'Cooling per second', 1, 25, 1],
      ['recovery', 'Recovery window (s)', 3, 20, 1],
      ['penalty', 'Missed recovery cost (s)', 2, 30, 1],
      ['fireIntensity', 'Fire fuse drain', 0, 2, 0.1],
      ['extinguish', 'Extinguisher hold (s)', 0.3, 2, 0.1],
      ['precision', 'Precision assistance', 0.2, 1, 0.1],
      ['hintDelay', 'Hint delay (s)', 3, 30, 1],
    ];
    app.knobs = knobs;
    for (const [key, label, min, max, step] of knobs)
      settings.define({
        key: 'dev_' + key,
        label,
        type: 'slider',
        min,
        max,
        step,
        value: W.DEFAULTS[key],
        group: 'Workbench tuning',
        apply: (_, v) => app?.tune(key, v),
      });
    app.dev = () => {
      app.releaseHold(true);
      app.setLayout('dev');
      const s = app.state(),
        blocked = net.mode === 'hub' || !net.authority;
      ui.show('dev', {
        kicker:
          'DEVELOPER TOOLS · ' +
          (blocked ? 'INSPECTION ONLY' : 'MODIFIED RUNS EXCLUDED FROM RECORDS'),
        title: 'Inside the workbench',
        text: () =>
          `Input: ${game.input.lastDevice} · focus ${app.target()?.id || 'none'} · tool ${W.TOOLNAMES[app.tool]}\nNetwork: ${net.status} · ${net.mode} · authority ${net.authority}\nCase: ${s?.id || 'none'} · revision ${s?.revision || 0}\n${app.currentBoard() ? JSON.stringify({ board: app.boardId, heat: Math.round(app.currentBoard().heat), owner: app.currentBoard().owner, job: app.currentBoard().job, hold: app.currentBoard().hold }) : 'Choose a board for component inspection.'}`,
        actions: [
          ['Live tuning sliders', () => app.tuning()],
          {
            label: 'Add 60 seconds',
            disabled: blocked || !s,
            fn: () => {
              s.remaining += 60;
              s.modified = true;
              app.dev();
            },
          },
          {
            label: 'Single-step 1/120s',
            disabled: blocked || !s,
            fn: () => {
              net.sim.advance(1 / 120);
              s.modified = true;
              app.dev();
            },
          },
          {
            label: 'Save checkpoint',
            disabled: blocked || !s,
            fn: () => {
              app.checkpoint = W.clone(s);
              ui.toast('Checkpoint saved', 'Scratch copy in memory.');
            },
          },
          {
            label: 'Restore checkpoint',
            disabled: blocked || !app.checkpoint,
            fn: () => {
              net.sim = new W.Simulation(W.clone(app.checkpoint));
              net.state = net.sim.s;
              net.state.modified = true;
              net.epoch++;
              net.queueAll();
              app.dev();
            },
          },
          {
            label: 'Inject fire',
            disabled: blocked || !s,
            fn: () => {
              const b = app.currentBoard() || s.boards.find((b) => !b.done);
              if (b) {
                b.fire = true;
                b.heat = 105;
                b.revision++;
                s.modified = true;
                net.queueAll();
              }
              ui.hide();
              app.setLayout('board');
              if (!app.boardId && b) app.openBoard(b.id);
            },
          },
          {
            label: 'Inject wrong lead',
            disabled: blocked || !s,
            fn: () => {
              const b = app.currentBoard() || s.boards.find((b) => !b.done),
                p = b?.components.find((c) => !b.order.includes(c.id));
              if (p) {
                p.leads[0] = 1;
                b.fault = { component: p.id, terminal: 0, deadline: s.time + s.tuning.recovery };
                b.revision++;
                s.modified = true;
              }
              ui.hide();
              if (!app.boardId && b) app.openBoard(b.id);
              else app.setLayout('board');
            },
          },
          {
            label: 'Reveal all evidence',
            disabled: blocked || !s,
            fn: () => {
              s.evidence = s.code.map((d) => W.GLYPHS[d].slice());
              s.modified = true;
              net.queueAll();
              ui.hide();
              app.openEvidence();
            },
          },
          {
            label: 'Solve current case',
            disabled: blocked || !s,
            fn: () => {
              s.modified = true;
              net.sim.finish(true, 'Developer disposal');
              ui.hide();
              game.resume();
            },
          },
          { label: 'Case / seed / restart', disabled: blocked, fn: () => app.devCase() },
          { label: 'Board / case authoring', disabled: blocked, fn: () => app.editor.open() },
          ['Back', () => ui.back()],
        ],
        back: () => app.popPage(),
      });
    };
    app.tuning = () => {
      ui.show('tuning', {
        kicker: 'LIVE · HELD ACTIONS CANCEL WHEN VALUES CHANGE',
        title: 'Tune the pressure',
        text:
          net.mode === 'hub'
            ? 'Gameplay tuning is disabled in Hub sessions.'
            : 'Changes apply immediately and label results modified. Fuse multiplier applies to new cases; all other values apply now.',
        rows: net.mode === 'hub' ? [] : knobs.map(([k]) => 'dev_' + k),
        actions:
          net.mode === 'hub'
            ? [['Back', () => ui.back()]]
            : [
                [
                  'Reset authored defaults',
                  () => {
                    settings.reset('Workbench tuning');
                    if (net.sim) net.sim.s.tuning = { ...W.DEFAULTS };
                    app.tuning();
                  },
                ],
                ['Back', () => ui.back()],
              ],
        back: () => app.popPage(),
      });
    };
    app.devCase = () => {
      ui.show('devCase', {
        kicker: 'DEVELOPER CASE CONTROL',
        title: 'Jump to a dispatch',
        text: 'These starts are marked developer modified. Use ordinary case files for a normal run.',
        actions: W.CASES.map((c) => [
          c.name,
          () => {
            app.start(c.id, app.seed || 'dev');
            net.sim.s.modified = true;
            net.sim.s.remaining *= settings.dev_fuseScale;
            net.sim.s.duration = net.sim.s.remaining;
          },
        ]).concat([
          [
            'Restart current seed',
            () => {
              if (app.state()) {
                const s = app.state();
                app.start(s.caseId, s.seed);
                net.sim.s.modified = true;
              }
            },
          ],
          ['Back', () => ui.back()],
        ]),
        back: () => app.popPage(),
      });
      if (ui.root) {
        const field = document.createElement('input');
        field.type = 'text';
        field.className = 'room-input';
        field.setAttribute('aria-label', 'Developer seed');
        field.value = app.seed || 'dev';
        field.oninput = () => {
          app.seed = field.value.slice(0, 40) || 'dev';
        };
        ui.root.querySelector('.esh-mod')?.prepend(field);
      }
    };
    app.download = (name, text) => {
      if (!globalThis.document) return;
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    app.startAttract = () => {
      if (net.mode !== 'solo' || game.sceneName !== 'title' || ui.screen !== 'title') return;
      app.attract = true;
      app.attractMouse = game.input.mouse.t;
      app.demoSerial = 0;
      app.attractPhase = 0;
      app.attractWait = 0;
      app.demo = new W.Simulation(
        W.makeCase(app.attractIndex % 2 ? 'relay' : 'training', 'attract-' + app.attractIndex, [
          'demo',
        ]),
      );
      app.demo.s.remaining = 999;
      app.demo.s.duration = 999;
      app.boardId = 'B1';
      app.demo.command('demo', { id: 'claim', caseId: app.demo.s.id, op: 'claim', board: 'B1' });
      app.setLayout('board');
      ui.hide();
      game.go('attract', null, { fade: 0 });
      app.tool = 0;
      app.lastEvent = 0;
      app.sound.reset();
    };
    app.wake = () => {
      if (!app.attract) return;
      app.attract = false;
      app.demo = null;
      game.input.clear();
      game.input.consumeAll();
      app.sound.reset();
      app.attractIndex++;
      app.title();
      app.wakeUntil = game.real + 0.2;
    };
    app.attractUpdate = (dt) => {
      const s = app.demo.s;
      app.demo.advance(dt);
      if (s.outcome) {
        if (app.menuPage !== 'demoPayoff') {
          app.setLayout('demoPayoff');
          game.setView('threequarter');
          game.focus(160, 140, 25);
          game.cam.offset = [0, 0];
          app.attractWait = 4;
          app.notice(W.CASES.find((c) => c.id === s.caseId).success);
        }
        app.attractWait -= dt;
        if (app.attractWait <= 0) {
          app.attractIndex++;
          app.startAttractRound();
        }
        return;
      }
      app.attractWait -= dt;
      if (app.attractWait > 0) return;
      app.attractWait = 0.45;
      const b = s.boards.find((b) => !b.done);
      if (!b) {
        if (!s.outcome) {
          app.demo.s.completed = Math.max(2, s.completed);
          app.perform('propose', { digits: s.code });
        }
        if (app.attractPhase++ > 6) {
          app.attractIndex++;
          app.startAttractRound();
        }
        return;
      }
      if (app.boardId !== b.id) {
        app.boardId = b.id;
        app.perform('claim', { board: b.id });
      }
      let t, op, args;
      const c = b.components.find((c) => c.id === b.order[b.job]);
      if (b.fire) {
        app.tool = 3;
        if (!b.hold) {
          op = 'begin';
          args = { tool: 'foam' };
        } else {
          app.attractWait = 0.85;
          return;
        }
      } else if (b.hold) {
        app.tool = 2;
        if (s.time - b.hold.start < s.tuning.safeMin + 0.14) {
          app.attractWait = 0.15;
          return;
        }
        op = 'end';
        args = {};
      } else if (c?.phase === 'attached') {
        if (c.leads.every((v) => v === 1)) {
          app.tool = 1;
          op = 'act';
          args = { tool: 'grip', target: c.id };
          t = c;
        } else {
          app.tool = 0;
          const side = c.leads[0] === 1 ? 1 : 0;
          op = 'act';
          args = { tool: 'cut', target: c.id, terminal: side };
          t = { x: c.x + c.anchors[side][0], y: c.y };
        }
      } else if (c?.phase === 'empty') {
        app.tool = 1;
        if (!b.held) {
          const sp = b.stock.find((p) => W.matches(c, p, b.rule));
          op = 'act';
          args = { tool: 'grip', spare: sp.id };
          t = { x: 35 + b.stock.indexOf(sp) * 60, y: -27 };
        } else if (!b.ruleKnown) {
          op = 'test';
          args = {};
        } else {
          op = 'act';
          args = { tool: 'grip', target: c.id };
          t = c;
        }
      } else if (c?.phase === 'placed') {
        app.tool = 2;
        const side = c.leads[0] === 2 ? 1 : 0;
        op = 'begin';
        args = { tool: 'solder', target: c.id, terminal: side };
        t = { x: c.x + c.anchors[side][0], y: c.y };
      }
      if (op) {
        app.perform(op, { board: b.id, ...args });
        if (t) {
          const ts = app.targets();
          const i = ts.findIndex((a) => Math.abs(a.x - t.x) < 2 && Math.abs(a.y - t.y) < 2);
          if (i >= 0) app.focus = i;
          app.art.action(args?.tool || op, t);
        }
      }
      if (b.done && s.completed === 2 && s.code.length === 2) {
        for (const bb of s.boards.slice(2)) {
          app.perform('claim', { board: bb.id });
        }
      }
      if (s.completed >= 2 && s.evidence.every((e) => W.candidates(e).length === 1)) {
        app.perform('propose', { digits: s.evidence.map((e) => W.candidates(e)[0]) });
      }
    };
    app.startAttractRound = () => {
      app.demo = null;
      app.attract = false;
      app.title();
      app.lastInputReal = game.real - 10;
      app.cabinet._idle = 10;
    };
    app.refresh = () => {
      app.refreshHUD();
    };
    app.refreshHUD = () => {};
    if (ui.root) {
      const hud = document.createElement('div');
      hud.className = 'wired-hud';
      hud.hidden = true;
      hud.innerHTML =
        '<div class="dispatch-label"></div><button class="evidence-access" aria-label="Evidence ledger"><span>CODE EVIDENCE</span><span class="mini-stencils"></span></button><div class="fuse"><small>FUSE REMAINING</small><strong>00:00</strong><span class="party"></span></div><div class="order"><small>CURRENT WORK ORDER</small><strong></strong><span></span><div class="heat-bar"><i></i><b>HEAT 0%</b></div></div><div class="tool-strip"></div><div class="control-hint"></div><button class="touch-context">Return spare to tray</button><div class="radio-caption"><b></b><span></span></div><div class="joint-meter"><span></span><b>HOLD → RELEASE IN GREEN</b></div><div class="attract-banner">DEMONSTRATION · ANY INPUT TO PLAY</div>';
      hud.querySelector('.joint-meter').hidden = true;
      ui.root.appendChild(hud);
      hud.querySelector('.evidence-access').onclick = () => {
        if (!app.attract) app.openEvidence();
      };
      hud.querySelector('.order').onclick = () => {
        if (app.currentBoard())
          app.notice(new W.Simulation(app.state()).instruction(app.currentBoard()));
      };
      hud.querySelector('.touch-context').onclick = () =>
        app.perform('drop', { board: app.boardId });
      const tools = hud.querySelector('.tool-strip');
      W.TOOLNAMES.forEach((n, i) => {
        const b = document.createElement('button');
        b.onclick = () => {
          app.releaseHold(true);
          app.tool = i;
        };
        b.textContent = n;
        tools.appendChild(b);
      });
      app.refreshHUD = () => {
        const s = app.state(),
          b = app.currentBoard(),
          show =
            !!s &&
            (app.attract ||
              ['board', 'evidence', 'dial', 'reference', 'vote', 'city'].includes(app.menuPage)) &&
            (!ui.screen ||
              ['evidence', 'dial', 'reference', 'vote', 'city', 'confirmCode'].includes(ui.screen));
        hud.hidden = !show;
        if (!show) return;
        hud.dataset.page = app.menuPage;
        hud
          .querySelector('.evidence-access')
          .classList.toggle('revealed', game.real < (app.revealUntil || 0));
        hud.dataset.device = game.input.lastDevice;
        hud.classList.toggle('demo', app.attract);
        hud.classList.toggle('observing', app.observing);
        hud.querySelector('.dispatch-label').textContent =
          (app.attract ? 'DEMO · ' : app.observing ? 'OBSERVING · ' : '') +
          (W.CASES.find((d) => d.id === s.caseId)?.site || 'SCRATCH DEVICE');
        const time = Math.max(0, Math.ceil(s.remaining));
        hud.querySelector('.fuse strong').textContent =
          String(Math.floor(time / 60)).padStart(2, '0') + ':' + String(time % 60).padStart(2, '0');
        hud.querySelector('.fuse').classList.toggle('urgent', time < 60);
        hud.querySelector('.party').textContent =
          net.mode === 'solo' ? s.seed : `${s.seats.length} crew · fuse continues`;
        const instruction = b
          ? new W.Simulation(s).instruction(b)
          : 'Repair circuits. Read the cells. Make the call.';
        hud.querySelector('.order strong').textContent = instruction;
        hud.querySelector('.order span').textContent = b
          ? `${b.name} · ${b.job}/${b.order.length} jobs · ${b.ruleKnown ? (b.components[0].mode === 'jumper' ? 'JUMPER' : b.rule.toUpperCase() + ' MATCH') : 'Rule unknown · Inspect a held spare to test'}`
          : '';
        const heat = hud.querySelector('.heat-bar');
        if (heat) {
          heat.hidden = !b;
          heat.querySelector('i').style.width = Math.min(100, b?.heat || 0) + '%';
          heat.querySelector('b').textContent = 'IRON HEAT ' + Math.round(b?.heat || 0) + '%';
          heat.classList.toggle('hot', (b?.heat || 0) > 70);
        }
        const activeHazards = s.boards
          .filter((b) => b.fire || b.fault)
          .map(
            (b) =>
              `${b.name}: ${b.fire ? 'FIRE' : b.fault.deadline !== null ? Math.max(0, Math.ceil(b.fault.deadline - s.time)) + 's RECOVERY' : 'RESTORE JOINT'}`,
          )
          .join(' · ');
        if (activeHazards) hud.querySelector('.dispatch-label').textContent = '! ' + activeHazards;
        hud.querySelector('.radio-caption b').textContent = app.radio;
        hud.querySelector('.radio-caption span').textContent = app.caption;
        [...tools.children].forEach((el, i) => {
          el.classList.toggle('selected', i === app.tool);
          el.textContent = `${game.input.lastDevice === 'touch' ? '' : game.input.lastDevice === 'gamepad' ? (i === app.tool ? game.input.label('apply') + ' · ' : '') : game.input.label('tool' + i) + ' · '}${W.TOOLNAMES[i]}`;
        });
        hud.querySelector('.control-hint').textContent =
          game.input.label('previous') +
          ' / ' +
          game.input.label('next') +
          ' tools · ' +
          game.input.label('inspect') +
          ' test · ' +
          game.input.label('repeat') +
          ' repeat · ' +
          game.input.label('evidence') +
          ' evidence';
        hud.querySelector('.touch-context').hidden = !(
          game.input.lastDevice === 'touch' && b?.held
        );
        const mini = hud.querySelector('.mini-stencils'),
          key = JSON.stringify(s.evidence);
        if (mini.dataset.key !== key) {
          mini.dataset.key = key;
          mini.replaceChildren();
          for (const cells of s.evidence) {
            const grid = document.createElement('i');
            for (const v of cells) {
              const d = document.createElement('em');
              d.className = v === 1 ? 'lit' : v === 0 ? 'dark' : 'unknown';
              grid.appendChild(d);
            }
            mini.appendChild(grid);
          }
        }
        const joint = hud.querySelector('.joint-meter');
        joint.hidden = !b?.hold;
        const h = b?.hold;
        if (h) {
          const duration = s.time - h.start;
          joint
            .querySelector('span')
            .style.setProperty('--joint', Math.min(1, duration / 1.5) * 100 + '%');
          joint
            .querySelector('span')
            .style.setProperty('--safe-start', (s.tuning.safeMin / 1.5) * 100 + '%');
          joint
            .querySelector('span')
            .style.setProperty('--safe-end', (s.tuning.safeMax / 1.5) * 100 + '%');
          joint.querySelector('b').textContent =
            h.tool === 'foam'
              ? 'HOLD TO EXTINGUISH'
              : duration < s.tuning.safeMin
                ? 'WARMING JOINT…'
                : duration <= s.tuning.safeMax
                  ? 'RELEASE · GOOD JOINT'
                  : 'TOO HOT · RELEASE & COOL';
        }
      };
    }
    app.update = (dt) => {
      const s = app.state();
      app.art.update(dt, s?.outcome);
      if (net.mode === 'hub' && net.ended) {
        app.refreshHUD();
        return;
      }
      if (app.attract) {
        app.attractUpdate(dt);
        if (app.demo) app.sound.update(app.demo.s);
        app.refreshHUD();
        return;
      }
      net.update(dt, game.headless ? game.real * 1000 : performance.now());
      const current = app.state();
      if (
        !ui.screen &&
        !['board', 'evidence', 'demoPayoff'].includes(app.menuPage) &&
        game.sceneName === 'field'
      )
        app.setLayout(app.boardId ? 'board' : 'evidence');
      if (current && net.mode === 'solo' && game.sceneName === 'field' && !current.outcome) {
        net.sim.advance(dt * current.tuning.timeScale);
        if (settings.candidates) current.assisted = true;
      }
      if (current && game.sceneName === 'field') {
        if (settings.candidates && !current.assisted && app.assistReported !== current.id) {
          app.assistReported = current.id;
          app.perform('assist');
        }
        if (!net.syncing && ui.screen === null && app.menuPage === 'evidence' && !app.boardId)
          app.openEvidence();
        if (!current.outcome && !net.syncing && ui.screen === null && app.boardId) app.boardInput();
        const b = app.currentBoard();
        if (b?.done && ui.screen === null) {
          app.boardId = null;
          app.openEvidence();
        }
        for (const e of current.events)
          if (e.id > app.lastEvent) {
            app.lastEvent = e.id;
            if (e.type === 'board') app.revealUntil = game.real + 1;
            if (
              e.text &&
              [
                'board',
                'fire',
                'fault',
                'recover',
                'wrong',
                'test',
                'penalty',
                'stable',
                'proposal',
                'veto',
              ].includes(e.type)
            )
              app.notice(e.text);
          }
        if (
          current.proposal &&
          !['vote', 'confirmCode'].includes(app.menuPage) &&
          ui.screen !== 'vote'
        )
          app.votePage();
        if (!current.proposal && ui.screen === 'vote' && !current.outcome) app.openEvidence();
        if (app.boardId && !ui.screen && game.real - (app.hintAt || 0) > current.tuning.hintDelay) {
          app.hintAt = game.real;
          app.notice(new W.Simulation(current).instruction(app.currentBoard()), 'NELL', 1);
        }
        app.sound.update(current);
        if (current.outcome && app.lastOutcome !== current.outcome) {
          app.results();
        }
        if (current.time > 18 && app.voiceTime === 0) {
          app.voiceTime = 1;
          app.notice(
            W.CASES.find((c) => c.id === current.caseId)?.taunt || 'VEX: Such careful hands.',
            'VEX',
            0,
          );
        }
      }
      const target = app.target();
      app.art.precision = current?.tuning.precision || 0.55;
      if (target) app.art.point(target.x, target.y, target.z + 12, game.input.down('precision'));
      app.refreshHUD();
    };
    app.draw = (r) => {
      const s = app.state();
      if ((app.menuPage === 'demoPayoff' || app.menuPage === 'city') && s) {
        app.art.world(r, s.theme, s.outcome);
      } else if ((game.sceneName === 'field' || game.sceneName === 'attract') && s) {
        const b = app.currentBoard();
        if (app.editorPreview && ['editor', 'editorIO'].includes(ui.screen)) {
          const selected = app.editor.part();
          app.art.board(
            r,
            app.editorPreview,
            { x: selected.x, y: selected.y, kind: 'component' },
            app.tool,
          );
          r.overlay((g) => {
            const x = Math.round(r.W * 0.77),
              y = Math.round(r.H * 0.48);
            E.font.text(g, 'REVEAL MASK', x, y - 17, '#f0d08c', { outline: false });
            app.art.stencil(
              g,
              Array.from({ length: 20 }, (_, i) => (app.editorPreview.mask.includes(i) ? 1 : 0)),
              x,
              y,
              9,
              [app.editor.cell],
            );
            E.font.text(g, 'CELL ' + app.editor.cell, x, y + 53, '#dce7ca', { outline: false });
          });
          return;
        }
        if (['evidence', 'dial', 'reference', 'vote'].includes(app.menuPage) || !b) {
          const n = ui.root
            ? Math.max(
                0,
                [...ui.root.querySelectorAll('.esh-btns button')].indexOf(document.activeElement),
              )
            : 0;
          app.art.evidence(
            r,
            s,
            n,
            app.menuPage === 'reference',
            app.menuPage === 'dial' ? app.digits : null,
          );
        } else {
          const target = app.target();
          if (target) target.legal = app.legal(target, b);
          app.art.board(r, b, target, app.tool, app.observing);
        }
      } else
        app.art.world(
          r,
          s?.theme || W.CASES.find((c) => c.id === app.briefCase)?.theme || 'quay',
          s?.outcome,
          game.sceneName === 'title',
        );
      if (s && app.menuPage === 'board')
        r.overlay((g) => {
          const rig = app.radio.startsWith('VEX') ? app.art.vex : app.art.nell;
          rig.drawPortrait(g, 10, r.H - 35, 26, {
            zoom: 2,
            bg: '#173238',
            frame: true,
            weapon: false,
          });
        });
      if (app.editorPreview && ui.screen === 'editor' && game.sceneName !== 'field') {
        app.art.evidence(
          r,
          { evidence: [Array(20).fill(-1)], boards: [app.editorPreview] },
          0,
          false,
          null,
        );
      }
    };
    const scenes = {
      title: {
        view: 'threequarter',
        pausable: false,
        enter() {
          if (app.menuPage !== 'title' && net.mode !== 'hub') {
            app.title();
            return;
          }
          game.setView('threequarter');
          game.focus(160, 140, 25);
        },
        update(dt) {
          app.art.update(dt);
          app.refreshHUD();
          app.lastInputReal ??= game.real;
          if (ui.screen === 'title' && net.mode === 'solo') {
            const phase = app.cabinet.attract(dt);
            if (phase === 'demo') app.startAttract();
          } else app.cabinet.wake();
        },
        draw: (r) => app.draw(r),
      },
      brief: {
        view: 'threequarter',
        enter() {
          game.focus(160, 140, 25);
        },
        update: (dt) => app.art.update(dt),
        draw: (r) => app.draw(r),
      },
      field: {
        view: 'topdown',
        pausable: true,
        camera: { zoom: false },
        enter() {
          game.view.set(0, 72, 1.28, 1);
          game.focus(140, 65, 0);
          game.cam.offset = [0, 8];
        },
        update: (dt) => app.update(dt),
        draw: (r) => app.draw(r),
      },
      attract: {
        view: 'topdown',
        pausable: false,
        enter() {
          game.view.set(0, 72, 1.28, 1);
          game.focus(140, 65, 0);
          game.cam.offset = [0, 8];
        },
        update: (dt) => app.update(dt),
        draw: (r) => app.draw(r),
      },
      result: {
        view: 'threequarter',
        enter() {
          game.focus(160, 140, 25);
          game.cam.offset = [0, 0];
        },
        update: (dt) => {
          app.art.update(dt, app.state()?.outcome);
          net.update(dt, game.headless ? game.real * 1000 : performance.now());
        },
        draw: (r) => app.draw(r),
      },
      ending: {
        view: 'threequarter',
        enter() {
          game.focus(160, 140, 25);
        },
        update: (dt) => app.art.update(dt, { won: true }),
        draw: (r) => app.draw(r),
      },
    };
    game.hook('input', () => {
      const I = game.input;
      if (!ui.screen) app.editorPreview = null;
      if (I.anyPressed() && !app.attract) app.sound.activate();
      app.refreshEvidence();
      app.refreshHUD();
      if (app.attract) {
        const moved = I.mouse.t !== app.attractMouse;
        app.attractMouse = I.mouse.t;
        if (I.anyPressed() || I.clicked() || (moved && I.mouse.t > 0)) app.wake();
      }
      if (!app.attract && game.sceneName === 'title' && I.mouse.t !== app.lastIdleMouse) {
        app.lastIdleMouse = I.mouse.t;
        app.cabinet.wake();
      }
      if (app.hold && (game.paused || ui.screen || I.padLost)) app.releaseHold(true);
      if (app.wakeUntil && game.real < app.wakeUntil) {
        I.clear();
        I.consumeAll();
      }
    });
    if (!options.headless) {
      for (const type of ['pointerdown', 'keydown', 'touchstart'])
        addEventListener(
          type,
          (e) => {
            if (app.attract) {
              e.preventDefault();
              e.stopImmediatePropagation();
              app.wake();
              return;
            }
            app.sound.activate();
          },
          { capture: true, signal: game._abort.signal },
        );
      addEventListener('blur', () => app.releaseHold(true), { signal: game._abort.signal });
      addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) app.releaseHold(true);
        },
        { signal: game._abort.signal },
      );
    }
    game.debug = {
      snapshot: () => ({
        title: W.TITLE,
        scene: game.sceneName,
        page: app.menuPage,
        tool: app.tool,
        focus: app.target()?.id,
        board: app.boardId,
        attract: app.attract,
        net: {
          mode: net.mode,
          authority: net.authority,
          me: net.me,
          status: net.status,
          syncing: net.syncing,
          ended: net.ended,
          bytesMax: net.bytesMax,
        },
        state: app.sim()?.publicState() || net.state,
        settings: { music: settings.music, voice: settings.voice, glyphs: settings.glyphs },
        errors: game.errors,
      }),
    };
    app.dispose = () => {
      net.cleanup();
      app.sound.stop();
      game.dispose();
    };
    game.start({ scene: 'title', scenes });
    app.title();
    if (!options.headless)
      net
        .connectHub()
        .then((active) => {
          if (active) {
            ui.hide();
            app.setLayout('evidence');
            game.live = true;
            game.o.autoPause = false;
            game.go('field', null, { fade: 0 });
          } else app.title();
        })
        .catch((e) => {
          app.notice('Hub connection failed: ' + e.message);
        });
    globalThis.__game = game;
    globalThis.__wired = app;
    return app;
  };
  if (typeof document !== 'undefined' && !globalThis.WIRED_NO_AUTO) W.createApp();
})();
