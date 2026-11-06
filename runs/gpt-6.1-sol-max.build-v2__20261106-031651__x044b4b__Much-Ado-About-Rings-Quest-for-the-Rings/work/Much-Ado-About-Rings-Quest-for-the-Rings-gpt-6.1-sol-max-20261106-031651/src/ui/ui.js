(function (G) {
  'use strict';
  const M = G.MA,
    E = G.My3D2dge;
  class UI {
    constructor(app) {
      this.app = app;
      this.game = app.game;
      this.lastMode = '';
      this.lastEpoch = -1;
      this.lastEvent = '';
      this.portraits = [];
      this.shell = new E.Shell(this.game, {
        tv: true,
        theme: {
          scale: () => (innerWidth < 900 ? 1 : Math.min(30, Math.max(18, innerWidth * 0.016)) / 14),
          ink: '#f1e9d8',
          paper: '#182332',
          accent: '#dfbd7b',
          muted: '#aeb9bd',
          line: '#66717455',
          font: 'Trebuchet MS, sans-serif',
          titleFont: 'Georgia, serif',
        },
        screens: {
          pause: {
            kicker: 'Between breaths',
            title: 'The road waits',
            text: () =>
              app.net.active
                ? 'Local menu · the shared expedition continues. Your hero stands still.'
                : 'The expedition is paused. Your checkpoint is safe.',
            actions: () => [
              ['Dev Mode', () => this.dev()],
              ['About & Credits', () => this.about()],
              {
                label: 'Return to the board',
                disabled:
                  !['room', 'failure'].includes(app.world.mode) ||
                  app.world.roomId === 'court' ||
                  (app.net.active && app.net.info.me !== app.world.chooser()),
                fn: () =>
                  this.show('abandon', {
                    title: 'Leave this threshold?',
                    text: 'Unfinished room progress returns to its beginning. Secured rings and Dread are kept.',
                    actions: [
                      ['Keep walking', () => this.shell.back()],
                      [
                        'Return to the board',
                        () => {
                          app.intent('abandon');
                          this.shell.hide();
                          this.game.resume();
                        },
                      ],
                    ],
                  }),
              },
              ...(!app.net.active ? [['Quit to Title', () => this.title()]] : []),
            ],
          },
          help: { title: 'How to Play' },
        },
      });
      this.game.o.menu.items = [];
      this.game.settings.define({
        key: 'outlines',
        group: 'Comfort',
        label: 'High contrast hero outlines',
        value: true,
      });
      this.game.settings.define({
        key: 'wallOutlines',
        group: 'Comfort',
        label: 'Persistent crystal outlines',
        value: false,
      });
      this.game.settings.define({ key: 'aimAssist', group: 'Game', label: 'Aim assistance', value: true });
      this.game.settings.define({
        key: 'subtitleSize',
        group: 'Comfort',
        label: 'Subtitle size',
        options: ['Standard', 'Large'],
        value: 'Standard',
        apply: (g, value) => {
          if (g.shell?.root) g.shell.root.dataset.subtitles = value;
        },
      });
      this.game.settings.define({
        key: 'voice',
        group: 'Sound',
        label: 'Gibberish voices',
        value: 0.7,
        min: 0,
        max: 1,
        apply: (g, v) => {
          g.audio.voiceVolume = v;
          g.audio.applyVolume();
        },
      });
      for (const [k, spec] of Object.entries(M.TUNING))
        this.game.settings.define({
          key: `dev_${k}`,
          group: 'Development',
          ...spec,
          apply: (_g, value) => {
            const w = app.world;
            if (w && w.tuning[k] !== value && (!app.net.active || app.net.isHost()))
              w.debug('tune', { key: k, value });
          },
        });
      if (this.shell.root) {
        this.pointerScreens = new Map();
        document.addEventListener(
          'pointerdown',
          (e) => {
            if (this.pointerScreens.size > 32) this.pointerScreens.clear();
            this.pointerScreens.set(
              e.pointerId,
              this.shell.root.contains(e.target) ? this.shell._stack.at(-1) : null,
            );
          },
          { capture: true, signal: this.game._abort?.signal },
        );
        this.shell.root.addEventListener(
          'click',
          (e) => {
            if (e.detail > 0 && this.pointerScreens.get(e.pointerId) !== this.shell._stack.at(-1)) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
            this.pointerScreens.delete(e.pointerId);
          },
          true,
        );
        this.shell.root.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          const b = e.target.closest('button');
          if (b && !b.disabled) b.focus({ preventScroll: true });
        });
        this.shell.root.addEventListener('click', () => this.consume());
      }
    }
    consume() {
      this.game.players.forEach((i) => i.clear());
      this.app.touch?.clear();
      this.app.consumeUntil = this.game.real + 0.18;
    }
    label(action) {
      return this.game.input.label(action);
    }
    show(name, spec) {
      this.shell.show(name, spec);
      if (this.shell.root) this.shell.root.dataset.screen = name;
      this.consume();
    }
    title() {
      if (this.app.net.active) return;
      this.app.stage = 'title';
      this.shell.tutorial(null);
      this.app.demo = null;
      this.app.audio.music('title');
      this.shell.hide();
      if (this.game.sceneName !== 'title') this.game.go('title', null, { fade: 0 });
      const saved = this.app.readSave();
      this.show('title', {
        name: M.TITLE,
        kicker: 'A COOPERATIVE FANTASY EXPEDITION',
        subtitle: 'Two heroes. Four rings. One way out.',
        text: 'The Ringmaster has kept what was never his.\nVenture below. Bring one another home.',
        meta: ['1–2 HEROES', 'FOUR LABYRINTHS'],
        footer: 'Standalone: solo + companion or couch co-op. Online co-op runs inside AI Hub.',
        back: () => {},
        actions: [
          ['New Expedition', () => this.select(0, ['warrior', 'wizard'])],
          { label: 'Continue Expedition', disabled: !saved, fn: () => this.app.continueRun() },
          ['How to Play', () => this.help()],
          ['Settings', () => this.show('settings', {})],
          ['About & Credits', () => this.about()],
        ],
      });
      this.app.lastInput = this.game.real;
    }
    select(seat, choices, board = false) {
      this.localMenuSeat = board && !this.app.net.active ? seat : 0;
      const role = seat === 0 ? 'your hero' : this.app.localJoined ? 'the second hero' : 'your companion';
      this.portraits = [];
      this.show('selection', {
        kicker: board ? 'The waystone remembers' : `Choose ${role}`,
        title: board
          ? 'Change your path'
          : seat === 0
            ? 'Who shall take the road?'
            : 'Who shall walk beside you?',
        text: 'Every pairing can finish the expedition. Two of the same hero are welcome.',
        actions: M.HEROES.map((h) => [
          h.name,
          () => {
            const pair = [...choices];
            pair[seat] = h.id;
            if (board) {
              if (!this.app.net.active && seat === 1 && !this.app.world.heroes[1].ai)
                this.app.world.intent(1, 'hero', h.id);
              else
                this.app.intent(
                  !this.app.net.active && seat === 1 && this.app.world.heroes[1].ai
                    ? 'companion-hero'
                    : 'hero',
                  h.id,
                );
              this.localMenuSeat = 0;
              this.shell.hide();
              this.board();
            } else if (seat === 0) this.select(1, pair);
            else this.app.startRun(pair);
          },
        ]),
        back: () => (board ? (this.shell.hide(), this.board()) : this.title()),
      });
      const root = this.shell.root;
      if (!root) return;
      const buttons = root.querySelectorAll('.esh-btns button');
      M.HEROES.forEach((h, i) => {
        const button = buttons[i];
        if (!button) return;
        button.style.setProperty('--hero', h.color);
        const cv = document.createElement('canvas');
        cv.width = 100;
        cv.height = 95;
        cv.className = 'hero-portrait';
        const name = document.createElement('strong');
        name.textContent = h.name;
        const subtitle = document.createElement('span');
        subtitle.className = 'hero-epithet';
        subtitle.textContent = h.epithet;
        const desc = document.createElement('span');
        desc.className = 'hero-description';
        desc.textContent = h.desc;
        const kit = document.createElement('small');
        kit.textContent = `${h.primary} · ${h.power}`;
        button.replaceChildren(cv, name, subtitle, desc, kit);
        button.setAttribute('aria-label', `${h.name}. ${h.desc} ${h.constraint}`);
        const rig = M.heroRig(h.id, 1.5);
        rig.update(0, { x: 0, y: 0, z: 0, facing: 1.2 });
        rig.drawPortrait(cv.getContext('2d'), 6, 3, 88, { zoom: 2.4, frame: false, bg: false });
        this.portraits.push({ cv, rig });
      });
    }
    board() {
      const w = this.app.world;
      if (w.mode !== 'board') return;
      this.shell.tutorial(null);
      this.app.stage = 'expedition';
      this.app.audio.music('board');
      this.shell.hide();
      const seat = this.app.net.active ? this.app.net.info.me : 0,
        canChoose = w.chooser() === seat;
      const choices = M.SITES.filter((s) => w.reachable(s.id));
      const actions = choices.map((s) => ({
        label: `${s.name}${s.id.startsWith('cache') ? ' · optional' : ''}`,
        disabled: !canChoose,
        fn: () => this.destination(s),
      }));
      actions.push([
        'Change your hero',
        () => {
          const i = w.owners.indexOf(seat);
          if (i >= 0) this.select(i, w.classes, true);
        },
      ]);
      if (!this.app.net.active && !this.app.localJoined)
        actions.push(['Change companion', () => this.select(1, w.classes, true)]);
      if (!this.app.net.active && this.app.localJoined)
        actions.push(['Change Hero 2 · P2 Square', () => this.select(1, w.classes, true)]);
      if (!this.app.net.active) actions.push(['Pause / Settings', () => this.game.menu()]);
      const name = this.app.net.active
        ? this.app.net.info.players.find((p) => p.id === w.chooser())?.name || 'Party leader'
        : 'Hero 1';
      this.show('route', {
        kicker: `THE ENCHANTED TABLE · ${w.rings.length}/4 RINGS`,
        title: 'Choose the next threshold',
        text: `${name} chooses the route.\nDread ${w.dread}/6 · Entering a site adds one step.\n${w.rings.length ? `${w.shortcut.length} golden shortcut${w.shortcut.length === 1 ? '' : 's'} now cross the map.` : 'The Hollow Keep is your first road.'}`,
        actions,
        back: () => {
          if (!this.app.net.active) this.game.menu();
        },
      });
    }
    destination(s) {
      const w = this.app.world;
      const shortcut = M.SITES.find((source) => w.rings.includes(source.id) && source.shortcutTo === s.id);
      this.show('destination', {
        kicker: `${s.family} · DREAD ${w.dread} → ${Math.min(6, w.dread + 1)}`,
        title: s.name,
        text: `${s.lore}\n\n${s.rule}\n\n${s.danger}${shortcut ? `\nVia ${shortcut.shortcut}: the inner entry waystone is open.` : ''}${s.shortcut ? `\nRecovered seal opens ${s.shortcut}.` : ''}`,
        actions: [
          [
            'Cross the threshold',
            () => {
              this.app.intent('travel', s.id);
              this.shell.hide();
            },
          ],
          ['Choose another road', () => this.shell.back()],
        ],
      });
    }
    help() {
      this.show('help', {
        kicker: 'A promise, not a conquest',
        title: 'Bring one another home',
        sections: [
          [
            'The expedition',
            'Cross each castle’s first room, steal its ring in the second, then carry it to the lit arch. You need not kill every guard. Four rings open the dragon sanctum.',
          ],
          [
            'A fallen friend',
            'Hold Interact nearby to revive. Revive has priority over passing: the ring stays with you. A standing carrier can extract a fallen partner. Both fallen means retry; secured rings remain safe.',
          ],
          [
            'The changing labyrinth',
            'Crystal ribs fade; watch their periodic shimmer and nearby outlines. Hatched lanes warn before fire. Wait on pale safe stone. Floor arrows announce moving walls. Every hero pair has an ordinary route.',
          ],
          [
            'Solo, couch & online',
            'Solo has a full companion. Press Ping to request the objective or follow. Press Options on a spare standard controller to claim the companion at a safe transition. Standalone couch supports two pads or keyboard + pad. Shared-world online co-op runs through AI Hub; this file has no standalone matchmaking.',
          ],
          [
            'Touch',
            'Drag anywhere on the left to move; use the right to aim. Primary attacks assist automatically. Temporary Power, Evade and Interact controls appear when useful. Hold Interact to revive, bind or extract.',
          ],
          [
            'Checkpoints & Dread',
            'Dread rises once on entry and once on retry, capped at six. Room two checkpoints separately. Continue never charges entry again. Abandon returns to the board and discards the unfinished castle’s temporary progress.',
          ],
        ],
        keys: [
          [`${this.label('left')} / WASD`, 'Move'],
          ['Mouse / right stick', 'Aim'],
          [this.label('attack'), 'Primary'],
          [this.label('skill'), 'Class power'],
          [this.label('dodge'), 'Evade'],
          [this.label('interact'), 'Pick up / pass / hold to revive'],
          [this.label('ping'), 'Companion objective / follow'],
          [this.label('map'), 'Objective map'],
          [this.label('pause'), 'Pause / local menu'],
        ],
        actions: [['Back', () => this.shell.back()]],
      });
    }
    objectiveMap() {
      const w = this.app.world,
        h = w.heroes[this.app.net.active ? Math.max(0, this.app.net.seat()) : 0];
      this.game.menu('map', { pause: !this.app.net.active });
      this.show('map', {
        kicker: w.room.name,
        title: 'The road through',
        map: w.map,
        at: h,
        markers: [
          ...w.heroes.map((p) => ({ ...p, color: p.id === 0 ? '#e9c683' : '#a1d6e4' })),
          { ...w.objectivePoint(h), kind: 'diamond', color: '#f3d58e' },
        ],
        text: 'Stone is solid even when hidden. The diamond marks your current objective.',
        actions: [['Return to the road', () => this.shell.hide()]],
      });
    }
    dev() {
      const host = !this.app.net.active || this.app.net.isHost();
      this.show('dev', {
        kicker: host
          ? 'Developer’s waystone · changes mark this run assisted'
          : 'Client inspection · only the host changes the world',
        title: 'Dev Mode',
        text: () => {
          const w = this.app.world;
          return `Room ${w.roomId} · Tick ${w.tick} · Epoch ${w.epoch}\n${w.heroes.map((h) => `${h.id + 1}: ${h.classId} · ${h.ai ? `AI: ${h.aiReason}` : 'human'} · HP ${h.hp}`).join('\n')}\nRingmaster: ${w.director.last || 'waiting'} (${w.director.used}/${w.director.budget})\n${w.director.reason}\n${w.assisted ? 'ASSISTED RUN' : 'Normal run'}`;
        },
        actions: [
          { label: 'Jump to an authored room', disabled: !host, fn: () => this.roomJump() },
          {
            label: 'Restart checkpoint',
            disabled: !host,
            fn: () => {
              this.app.world.debug('restart');
              this.shell.hide();
            },
          },
          { label: 'Heal & revive party', disabled: !host, fn: () => this.app.world.debug('heal') },
          {
            label: `Invulnerability: ${this.app.world.invulnerable ? 'on' : 'off'}`,
            disabled: !host,
            fn: () => {
              this.app.world.debug('invulnerable');
              this.dev();
            },
          },
          {
            label: 'Spawn a sentry on safe ground',
            disabled: !host,
            fn: () => this.app.world.debug('spawn', 'fighter'),
          },
          { label: 'Add a telegraphed hazard', disabled: !host, fn: () => this.app.world.debug('hazard') },
          [
            'Collision / navigation / telegraphs',
            () => {
              this.app.view.overlay = !this.app.view.overlay;
              this.shell.hide();
            },
          ],
          ['Live balance sliders', () => this.tuning()],
          ['Refresh inspector', () => this.dev()],
          ['Back', () => this.shell.back()],
        ],
      });
    }
    roomJump() {
      this.show('roomjump', {
        title: 'Authored rooms',
        text: 'A room jump marks the run assisted.',
        actions: Object.values(M.ROOMS).map((r) => [
          r.name,
          () => {
            this.app.world.debug('jump', r.id);
            this.shell.hide();
          },
        ]),
      });
    }
    tuning() {
      const host = !this.app.net.active || this.app.net.isHost();
      this.show('balance', {
        title: 'Live balance',
        text: host
          ? 'Changes apply immediately and mark this run assisted.'
          : 'Local inspection only. The host owns these values.',
        rows: Object.keys(M.TUNING).map((k) => `dev_${k}`),
        actions: [
          {
            label: 'Reset to Defaults',
            primary: false,
            disabled: !host,
            fn: () => {
              this.app.world.debug('defaults');
              this.game.settings.reset('Development');
              this.tuning();
            },
          },
          ['Back', () => this.shell.back()],
        ],
      });
      if (!host && this.shell.root)
        this.shell.root.querySelectorAll('input').forEach((el) => {
          el.disabled = true;
        });
      if (host && this.shell.root) {
        const input = this.shell.root.querySelector('input');
        if (input) {
          input.focus();
          input.closest('.esh-mod').scrollTop = 0;
        }
      }
    }
    about(page = 0) {
      const data = M.INTERVIEW,
        sections = ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback'];
      const source = data
        ? Object.entries(data.sourceInformation).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1'), v])
        : [
            ['Source', 'Quest for the Rings (1981)'],
            ['Plan', 'PLAN.md'],
            ['Usage', 'added on import'],
          ];
      const questions = [
        [],
        ['Issues caught', 'Critical / game breaking', 'Most helpful test', 'Least helpful test'],
        [
          'What worked best',
          'Stuck or guessed wrong',
          'Most important custom system',
          'Hardest engine integration',
          'Engine changes',
          'One engine improvement',
        ],
        ['What worked best', 'What was confusing', 'Hardest part', 'Suggested change'],
      ];
      const feedback = data
        ? [[], data.testingFeedback, data.engineFeedback, data.promptFeedback]
        : [
            [],
            ['Evidence is recorded in the development folder.'],
            ['Native engine version 0.89.1.'],
            ['Complete authored expedition specification.'],
          ];
      const entries =
        page === 0 ? source : feedback[page].map((v, i) => [questions[page][i] || 'Feedback', v]);
      this.show('about', {
        kicker: `CREDITS · ${page + 1}/4`,
        title: sections[page],
        sections:
          page === 0
            ? [
                [
                  'Original game',
                  'Inspired by Quest for the Rings (Magnavox / Philips, 1981). This is an original adaptation, with new fiction, code art and music.',
                ],
                [
                  'Built with',
                  'my-3D2dge by Michael Crosato; AI Hub Session Protocol v1. All distinctive heroes, dragon, seals, castle tokens and music were authored for this game.',
                ],
                ...entries,
              ]
            : entries,
        actions: [
          [page === 3 ? 'Source Information' : 'Next page', () => this.about((page + 1) % 4)],
          ...(page ? [['Previous page', () => this.about(page - 1)]] : []),
          [
            'Back',
            () => {
              while (
                this.shell._stack.length > 1 &&
                this.shell._stack[this.shell._stack.length - 2].name === 'about'
              )
                this.shell._stack.splice(-2, 1);
              this.shell.back();
            },
          ],
        ],
      });
    }
    enterHub() {
      this.app.stage = 'expedition';
      this.shell.hide();
      this.lastMode = '';
    }
    sessionEnd(reason) {
      this.shell.hide();
      this.show('ended', {
        kicker: 'AI HUB SESSION',
        title: reason === 'host-left' ? 'The host has departed' : 'The expedition is ended',
        text: 'The Hub will show the party’s result. Gameplay and sound have stopped.',
        actions: [],
      });
    }
    failure() {
      const w = this.app.world,
        chooser = !this.app.net.active || this.app.net.info.me === w.chooser();
      this.show('failure', {
        kicker: 'No oath is lost to one fall',
        title: 'The dark has taken this room',
        text: `Your ${w.rings.length} secured ring${w.rings.length === 1 ? '' : 's'} remain safe. Retry ${w.room.name} at Dread ${Math.min(6, w.dread + 1)}/6.\n${w.roomId === 'final' ? 'The four rings return to their unbound stations.' : 'The room’s ring returns to its resting place.'}`,
        actions: [
          {
            label: 'Retry this checkpoint',
            disabled: !chooser,
            fn: () => {
              this.app.intent('retry');
              this.shell.hide();
            },
          },
          {
            label: 'Return to the board',
            disabled: !chooser,
            fn: () => {
              this.app.intent('abandon');
              this.shell.hide();
            },
          },
          ...(!this.app.net.active ? [['Quit to Title', () => this.title()]] : []),
        ],
        back: () => {},
      });
    }
    victory() {
      const w = this.app.world;
      this.shell.tutorial(null);
      this.app.audio.music('victory');
      this.shell.hide();
      this.show('results', {
        kicker: w.assisted ? 'ASSISTED EXPEDITION' : 'THE LAST SEAL SINGS',
        emblem: '✧',
        title: 'The dream is broken',
        text: 'Four rings burn upon the stone. The dragon bows beneath their light.\nBeyond the threshold, two shadows step into morning.\n\nYou did not bring a kingdom home. You brought one another.',
        stats: [
          [4, 'RINGS RECOVERED'],
          [w.stats.revives, 'FRIENDS RAISED'],
          [w.dread, 'FINAL DREAD'],
          [
            `${Math.floor(w.time / 60)}:${String(Math.floor(w.time % 60)).padStart(2, '0')}`,
            'TIME ON THE ROAD',
          ],
        ],
        actions: [
          ['Credits', () => this.about()],
          ...(!this.app.net.active
            ? [
                ['Another Expedition', () => this.select(0, ['warrior', 'wizard'])],
                ['Return to Title', () => this.title()],
              ]
            : []),
        ],
      });
    }
    update(w, dt) {
      if (this.shell.root) this.shell.root.dataset.screen = this.shell.screen || 'play';
      if (this.shell.root && this.app.net.active && !this.app.net.isHost() && this.shell.screen)
        for (const [k, spec] of Object.entries(M.TUNING)) {
          const input = this.shell.root.querySelector(`input[aria-label="${spec.label}"]`);
          if (input) {
            input.disabled = true;
            input.value = w.tuning[k];
            const out = input.parentElement.querySelector('output');
            if (out) out.textContent = String(w.tuning[k]);
          }
        }
      for (const p of this.shell.screen === 'selection' ? this.portraits : []) {
        p.rig.update(dt, {
          x: 0,
          y: 0,
          z: 0,
          facing: 1.2,
          pose: Math.sin(this.game.time * 0.7) > 0.85 ? 'guard' : null,
        });
        const ctx = p.cv.getContext('2d');
        ctx.clearRect(0, 0, 100, 95);
        p.rig.drawPortrait(ctx, 6, 3, 88, {
          zoom: 2.4,
          bg: false,
          frame: false,
          turn: 0.7,
          cape: true,
          weapon: true,
        });
      }
      if (this.app.stage === 'title' || this.app.demo || this.app.net.ended) {
        if (this.app.stage === 'title' && !this.app.demo && !this.shell.screen) this.title();
        return;
      }
      if (this.lastMode !== w.mode) {
        this.lastMode = w.mode;
        if (w.mode === 'board') this.board();
        else if (w.mode === 'failure') this.failure();
        else if (w.mode === 'victory') this.victory();
        else this.shell.hide();
      }
      if (w.mode === 'board' && !this.shell.screen) this.board();
      if (this.lastEpoch !== w.epoch) {
        this.lastEpoch = w.epoch;
        this.lastMode = w.mode;
        if (['room', 'court'].includes(w.mode)) {
          const teaching =
            w.roomId === 'court'
              ? ` ${this.game.input.lastDevice === 'gamepad' ? 'Left stick moves; right stick aims.' : 'WASD moves; mouse aims.'} ${this.label('attack')} primary · ${this.label('skill')} power · ${this.label('dodge')} evade · ${this.label('interact')} take / hold to extract.`
              : '';
          this.shell.tutorial(w.room.name, w.room.text + teaching, w.roomId === 'court' ? 22 : 14);
          this.app.audio.music(w.room.family === 'final' ? 'final' : 'explore');
        }
      }
      const eventIndex = this.lastEvent
        ? w.events.findIndex((e) => e.id === this.lastEvent)
        : w.events.length - 1;
      for (const last of w.events.slice(Math.max(0, eventIndex + 1))) {
        this.lastEvent = last.id;
        if (last.type === 'ring-secured')
          this.shell.toast(
            'A ring for both heroes',
            `${M.SITES.find((s) => s.id === last.site).shortcut} opens across the map.`,
            6,
          );
        if (last.type === 'director')
          this.shell.tutorial(
            'The Ringmaster',
            last.event === 'possession'
              ? '“A borrowed shape shall haunt your road.” A violet echo copies a hero; it never takes your controls.'
              : '“The stone has heard you.” Read the next warning.',
            7,
          );
        if (last.type === 'pickup')
          this.shell.toast('The ring wakes', 'Its light draws pursuit. Carry it to the golden arch.');
        if (last.type === 'power') {
          this.powerTaught = this.powerTaught || new Set();
          if (!this.powerTaught.has(last.classId)) {
            this.powerTaught.add(last.classId);
            const hero = M.HEROES.find((h) => h.id === last.classId);
            this.shell.tutorial(
              hero.power,
              {
                warrior: 'Face the threat. Your brace opens a crossing for your companion.',
                wizard: 'The ward interrupts fire and missiles. Your rune bolts stun; they do not kill.',
                phantom:
                  'Interior stone opens. The pale circle marks safe re-entry. Outer walls, seals and lava remain closed.',
                changeling:
                  'Your pace slows and pursuit looks elsewhere. Contact still wounds you. A carried ring remains visible.',
              }[last.classId],
              7,
            );
          }
        }
        if (last.type === 'seals-open')
          this.shell.toast(
            'Four stations stand exposed',
            'Hold Interact at each station. The dragon has no mortal wound.',
          );
        if (last.type === 'dragon-bound')
          this.shell.toast(
            'The binding is complete',
            'Reach the golden arch. A standing hero can bring a fallen friend home.',
            8,
          );
        if (last.type === 'companion-return' || last.type === 'phase-return' || last.type === 'ring-return')
          this.shell.toast('A waystone answers', 'A safe remembered foothold draws the lost shadow home.');
        if (last.type === 'ping')
          this.shell.toast(
            'Companion command',
            last.mode === 'objective' ? 'Help with the objective.' : 'Follow closely.',
          );
      }
      if (this.shell.screen || !['court', 'room'].includes(w.mode)) return;
      if (this.game.real - (this.hudAt || -1) < 0.1) return;
      this.hudAt = this.game.real;
      const seat = this.app.net.active ? Math.max(0, this.app.net.seat()) : 0,
        hero = w.heroes[seat];
      const goal =
        w.roomId === 'final'
          ? w.finalBeat === 'escape'
            ? 'Escape the bound dragon'
            : w.finalBeat === 'learn'
              ? 'Read the dragon’s breath'
              : `Bind the four seals · ${w.bound.filter(Boolean).length}/4`
          : w.ring
            ? w.ring.carrier == null
              ? 'Find and take the ring'
              : 'Carry the ring to the lit arch'
            : w.room.cache
              ? w.cacheClaimed
                ? 'Return to the arch'
                : w.room.rescue
                  ? 'Rescue the fallen keeper'
                  : 'Wake the moonwell'
              : 'Reach the far arch';
      const c = hero.context;
      this.shell.hud({
        objective: {
          step: `${w.rings.length}/4 RINGS · DREAD ${w.dread}/6${w.assisted ? ' · ASSISTED' : ''}`,
          title: goal,
        },
        place: w.room.name,
        status: this.app.net.active
          ? { text: 'AI HUB · SHARED WORLD', color: '#adcbd5' }
          : w.heroes[1].ai
            ? 'SOLO + COMPANION'
            : 'COUCH CO-OP',
        bars: w.heroes.map((h) => ({
          label: `${h.id + 1} ${M.HEROES.find((v) => v.id === h.classId).name}${h.down ? ' · FALLEN' : h.ai ? ' · AI' : ''}`,
          value: h.hp,
          max: 5,
          kind: 'pips',
          color: h.id === 0 ? '#e5bd7b' : '#9ed4e2',
        })),
        prompt: c
          ? {
              key: this.game.input.lastDevice === 'touch' ? 'HOLD' : this.label('interact'),
              label: c.text,
              progress: c.progress,
              hint: 'Context · revive takes priority',
            }
          : null,
        keys:
          this.game.input.lastDevice === 'touch'
            ? []
            : [
                [this.label('attack'), 'Primary'],
                [
                  this.label('skill'),
                  `${M.HEROES.find((h) => h.id === hero.classId).power}${hero.powerCd > 0 ? ` ${Math.ceil(hero.powerCd)}s` : ''}`,
                ],
                [this.label('dodge'), 'Evade'],
                [this.label('ping'), 'Help'],
                [this.label('map'), 'Map'],
              ],
        buttons: [],
      });
    }
  }
  M.UI = UI;
})(globalThis);
