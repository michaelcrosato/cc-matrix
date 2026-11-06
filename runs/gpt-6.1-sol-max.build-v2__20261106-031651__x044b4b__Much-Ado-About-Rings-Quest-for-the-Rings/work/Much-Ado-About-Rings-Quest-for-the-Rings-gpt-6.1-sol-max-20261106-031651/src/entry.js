(function (G) {
  'use strict';
  const M = G.MA,
    E = G.My3D2dge;
  const KEYS = {
    up: ['KeyW', 'ArrowUp', 'Pad12'],
    down: ['KeyS', 'ArrowDown', 'Pad13'],
    left: ['KeyA', 'ArrowLeft', 'Pad14'],
    right: ['KeyD', 'ArrowRight', 'Pad15'],
    attack: ['Mouse0', 'KeyJ', 'Pad7'],
    skill: ['Mouse2', 'KeyK', 'Pad6'],
    dodge: ['Space', 'Pad0'],
    interact: ['KeyE', 'Pad3'],
    ping: ['KeyQ', 'Pad5'],
    map: ['Tab', 'Pad2', 'Pad17'],
    pause: ['Escape', 'KeyP', 'Pad9'],
    start: ['Enter', 'Pad9'],
    confirm: ['Enter', 'Space', 'Pad0'],
    cancel: ['Escape', 'Backspace', 'Pad1'],
  };
  class Touch {
    constructor(app) {
      this.app = app;
      this.points = new Map();
      this.move = [0, 0];
      this.aim = [0, 0];
      this.actions = new Set();
      this.used = false;
      if (typeof document === 'undefined') return;
      const canvas = app.game.screen.canvas;
      app.game.input.touchFilter = () => false;
      const point = (e) => ({ x: e.clientX, y: e.clientY });
      canvas.addEventListener(
        'pointerdown',
        (e) => {
          if (e.pointerType !== 'touch' || app.ui.shell.screen || app.stage === 'title') return;
          e.preventDefault();
          this.used = true;
          app.game.input.lastDevice = 'touch';
          this.points.set(e.pointerId, {
            start: point(e),
            pos: point(e),
            side: e.clientX < innerWidth * 0.58 ? 'move' : 'aim',
          });
          canvas.setPointerCapture(e.pointerId);
        },
        { passive: false },
      );
      canvas.addEventListener(
        'pointermove',
        (e) => {
          const p = this.points.get(e.pointerId);
          if (!p) return;
          e.preventDefault();
          p.pos = point(e);
          this.recompute();
        },
        { passive: false },
      );
      const end = (e) => {
        this.points.delete(e.pointerId);
        this.recompute();
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('lostpointercapture', end);
      const root = (this.root = document.createElement('div'));
      root.id = 'touch-actions';
      root.hidden = true;
      for (const [action, text] of [
        ['power', 'Power'],
        ['dodge', 'Evade'],
        ['interact', 'Interact'],
      ]) {
        const b = document.createElement('button');
        b.textContent = text;
        b.dataset.action = action;
        b.setAttribute('aria-label', text);
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.actions.add(action);
          b.setPointerCapture(e.pointerId);
        });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
          b.addEventListener(event, () => this.actions.delete(action));
        root.appendChild(b);
      }
      document.body.appendChild(root);
    }
    recompute() {
      this.move = [0, 0];
      this.aim = [0, 0];
      for (const p of this.points.values()) {
        const x = (p.pos.x - p.start.x) / 65,
          y = (p.pos.y - p.start.y) / 65,
          n = Math.max(1, Math.hypot(x, y));
        this[p.side] = [x / n, y / n];
      }
    }
    clear() {
      this.points.clear();
      this.actions.clear();
      this.recompute();
    }
    command(w, hero) {
      const d = this.app.game.view.screenDirToGround(...this.move),
        aim = this.app.game.view.screenDirToGround(...this.aim),
        c = { ...M.neutral(), mx: d[0], my: d[1], ax: aim[0], ay: aim[1] };
      const enemy = w.enemies
        .filter((e) => !e.dead)
        .sort((a, b) => M.distance(hero, a) - M.distance(hero, b))[0];
      if (enemy && M.distance(hero, enemy) < (hero.classId === 'wizard' ? 125 : 48)) {
        if (Math.hypot(...this.aim) < 0.2) {
          const n = M.distance(hero, enemy) || 1;
          c.ax = (enemy.x - hero.x) / n;
          c.ay = (enemy.y - hero.y) / n;
        }
        c.primary = true;
      }
      for (const action of this.actions) c[action] = true;
      return c;
    }
    update(w) {
      if (!this.root) return;
      const app = this.app,
        enabled =
          this.used &&
          app.stage !== 'title' &&
          !app.demo &&
          !app.ui.shell.screen &&
          ['court', 'room'].includes(w.mode);
      this.root.hidden = !enabled;
      if (!enabled) return;
      const h = w.heroes[app.net.active ? Math.max(0, app.net.seat()) : 0],
        enemy = w.enemies.some((e) => !e.dead && M.distance(e, h) < 150);
      const aiming = [...this.points.values()].some((p) => p.side === 'aim');
      for (const b of this.root.children) {
        b.hidden =
          b.dataset.action === 'interact'
            ? !h.context
            : b.dataset.action === 'power'
              ? h.powerCd > 0 ||
                (!aiming && !enemy && !['crystal', 'inferno', 'shifting'].includes(w.room.family))
              : Math.hypot(...this.move) < 0.1 && !enemy;
        if (b.dataset.action === 'interact' && h.context)
          b.textContent =
            h.context.type === 'pickup'
              ? 'Take ring'
              : h.context.type === 'revive'
                ? 'Revive'
                : h.context.type === 'bind'
                  ? 'Bind'
                  : h.context.type === 'exit'
                    ? 'Exit'
                    : 'Interact';
      }
    }
  }
  class App {
    constructor() {
      this.stage = 'title';
      this.demo = null;
      this.lastInput = 0;
      this.consumeUntil = 0;
      this.localJoined = false;
      this.pendingJoin = null;
      this.game = new E.Game({
        id: 'much-ado-about-rings-v1',
        canvas: 'screen',
        res: 'ps1',
        expand: true,
        view: 'threequarter',
        views: ['threequarter'],
        input: KEYS,
        bg: '#131c2a',
        autoPause: false,
        corner: true,
        fullscreen: 'button',
        menu: {
          quit: false,
          controls: {
            attack: 'Primary action',
            skill: 'Class power',
            dodge: 'Dodge',
            interact: 'Interact / revive',
            ping: 'Companion ping',
            map: 'Objective map',
          },
          settings: [
            { key: 'music', value: 0.1 },
            { key: 'glyphs', value: 'playstation' },
          ],
        },
      });
      this.audio = new M.Audio(this.game);
      this.view = new M.View(this.game);
      this.net = new M.Hub(this);
      this.newWorld();
      this.ui = new M.UI(this);
      this.touch = new Touch(this);
      if (typeof document !== 'undefined') {
        const style = document.getElementById('game-css');
        if (style) document.head.appendChild(style);
      }
      this.game.allowJoin({
        max: 2,
        onJoin: (input, n) => {
          if (this.net.active) {
            this.game.removePlayer(n);
            return;
          }
          this.pendingJoin = { input, n };
          this.ui.shell.toast(
            'A second oath is heard',
            'Player 2 will claim the companion at the next safe transition.',
          );
        },
      });
      this.game.debug = {
        snapshot: () => ({
          ...this.world.snapshot(),
          stage: this.stage,
          screen: this.ui.shell.screen,
          demo: !!this.demo,
          input: this.game.input.lastDevice,
          prompt: this.game.input.label('interact'),
          errorCount: this.game.errors.length,
          net: {
            active: this.net.active,
            host: this.net.isHost(),
            started: this.net.started,
            ended: this.net.ended,
            ...this.net.metrics,
          },
        }),
        world: () => this.world,
        action: (action, value) => {
          if (!this.net.active || this.net.isHost()) this.world.debug(action, value);
        },
        input: (seat, cmd) => {
          this.scriptCommands = this.scriptCommands || [];
          this.scriptCommands[seat] = M.cleanInput(cmd);
        },
        clearInput: () => {
          this.scriptCommands = null;
        },
        new: (classes) => this.startRun(classes || ['warrior', 'wizard']),
      };
      this.game.start({
        scenes: {
          title: { pausable: false, update: (dt) => this.update(dt), draw: (r) => this.draw(r) },
          play: { pausable: true, update: (dt) => this.update(dt), draw: (r) => this.draw(r) },
        },
        scene: 'title',
      });
      if (typeof document !== 'undefined') this.installEvents();
      this.ui.title();
      this.net
        .connect()
        .then((info) => {
          if (info) {
            this.game.live = true;
            this.game.o.autoPause = false;
            this.game.go('play', null, { fade: 0 });
            this.ui.lastMode = '';
          } else this.game.o.autoPause = true;
        })
        .catch((e) => {
          this.game.fail('Hub connection', e);
          if (G.AIHub?.active) G.AIHub.fail('The expedition could not connect.');
        });
      G.__game = this.game;
      G.__rings = this;
    }
    newWorld(opts = {}, session = false) {
      const save = (s) => {
        if (!session && !this.net?.active) this.writeSave(s);
      };
      this.world = new M.World({ ...opts, onCheckpoint: save });
      this.view.epoch = -1;
      if (this.ui && !session) this.game.settings.reset('Development');
      return this.world;
    }
    readSave() {
      try {
        const data =
          typeof localStorage !== 'undefined'
            ? JSON.parse(localStorage.getItem('ma-rings-checkpoint-v2') || 'null')
            : null;
        return M.World.validSave(data) ? data : null;
      } catch (_) {
        return null;
      }
    }
    writeSave(save) {
      if (this.net?.active || this.demo) return;
      try {
        if (typeof localStorage !== 'undefined')
          localStorage.setItem('ma-rings-checkpoint-v2', JSON.stringify(save));
        this.storageFailed = false;
      } catch (_) {
        this.storageFailed = true;
      }
    }
    startRun(classes) {
      if (this.net.active) return;
      this.touch?.clear();
      this.ui.portraits = [];
      this.newWorld({ classes, owners: [0, this.localJoined ? 1 : null] });
      this.stage = 'expedition';
      this.ui.shell.hide();
      this.ui.lastMode = '';
      this.ui.lastEpoch = -1;
      this.game.go('play', null, { fade: 0 });
      this.world.checkpoint();
      this.ui.consume();
    }
    continueRun() {
      const save = this.readSave();
      if (!save || this.net.active) return;
      this.world = M.World.restore(save, {
        owners: [0, this.localJoined ? 1 : null],
        onCheckpoint: (s) => this.writeSave(s),
      });
      this.stage = 'expedition';
      this.ui.shell.hide();
      this.ui.lastMode = '';
      this.ui.lastEpoch = -1;
      this.game.go('play', null, { fade: 0 });
      this.ui.consume();
    }
    intent(action, value) {
      const sender = this.net.active ? this.net.info.me : 0;
      return this.net.active
        ? this.net.command(sender, action, value)
        : this.world.intent(sender, action, value);
    }
    installEvents() {
      const signal = this.game._abort?.signal;
      let lastPointer = [0, 0];
      const meaningful = (e) => {
        if (e.type === 'pointermove') {
          const d = Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]);
          lastPointer = [e.clientX, e.clientY];
          if (d < 4) return;
        }
        if (e.pointerType === 'mouse' && e.type === 'pointermove') this.game.input.lastDevice = 'mouse';
        this.lastInput = this.game.real;
        if (this.demo) {
          this.exitAttract();
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      for (const type of ['keydown', 'pointerdown', 'pointermove', 'wheel'])
        addEventListener(type, meaningful, { capture: true, passive: false, signal });
      this.game.hook('input', () => {
        const p2 = this.game.players[1];
        if (p2 && !this.net.active && this.world.mode === 'board') {
          if (p2.pressed('map') && this.ui.shell.screen === 'route') {
            this.ui.select(1, this.world.classes, true);
            p2.consumeAll();
          } else if (this.ui.localMenuSeat === 1 && this.ui.shell.screen === 'selection') {
            for (const dir of ['up', 'down', 'left', 'right'])
              if (p2.repeat(dir, 0.35, 0.12)) this.ui.shell._nav(dir);
            if (p2.pressed('confirm')) {
              const el = document.activeElement;
              if (el?.tagName === 'BUTTON' && this.ui.shell.root.contains(el)) el.click();
            }
            if (p2.pressed('cancel')) {
              this.ui.localMenuSeat = 0;
              this.ui.shell.back();
            }
            p2.consumeAll();
          }
        }
        if (this.game.input.padLost || this.game.players.some((i) => i.padLost)) {
          if (this.net.active) return;
          this.game.pause('controller');
          this.ui.show('reconnect', {
            title: 'A controller has gone quiet',
            text: 'Reconnect and press a button, or let the companion take the second hero.',
            actions: [
              [
                'Reconnect / resume',
                () => {
                  this.ui.shell.hide();
                  this.game.resume();
                },
              ],
              [
                'Continue with AI companion',
                () => {
                  this.localJoined = false;
                  this.world.setOwner(1, null);
                  if (this.game.players.length > 1) this.game.removePlayer(1);
                  this.ui.shell.hide();
                  this.game.resume();
                },
              ],
            ],
          });
        }
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
        let used = false;
        for (const pad of pads || [])
          if (
            pad &&
            (pad.buttons.some((b) => b.pressed || b.value > 0.4) || pad.axes.some((a) => Math.abs(a) > 0.25))
          )
            used = true;
        if (used) {
          this.lastInput = this.game.real;
          if (this.demo) this.exitAttract();
        }
      });
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) {
            this.touch.clear();
            this.audio.stop();
          } else if (!this.net.ended) {
            this.audio.theme = null;
            this.audio.music(
              this.stage === 'title'
                ? 'title'
                : this.world.mode === 'board'
                  ? 'board'
                  : this.world.roomId === 'final'
                    ? 'final'
                    : 'explore',
            );
          }
        },
        { signal },
      );
      this.game.screen.canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    }
    inputFor(i, h) {
      if (!i || !h || this.ui.shell.screen || this.game.real < this.consumeUntil || this.net.ended)
        return M.neutral();
      if (this.touch.used && i.lastDevice === 'touch') return this.touch.command(this.world, h);
      const m = i.move(),
        d = this.game.view.screenDirToGround(m[0], m[1]);
      const c = {
        ...M.neutral(),
        mx: d[0],
        my: d[1],
        primary: i.down('attack'),
        power: i.pressed('skill'),
        dodge: i.pressed('dodge'),
        interact: i.down('interact'),
        ping: i.pressed('ping'),
      };
      if (i.padAim && Math.hypot(...i.padAim) > 0.2) {
        const a = this.game.view.screenDirToGround(...i.padAim);
        c.ax = a[0];
        c.ay = a[1];
      } else if (['mouse', 'keyboard'].includes(i.lastDevice) && i.mouse.active) {
        const p = this.game.mouseGround();
        if (p) {
          const dx = p[0] - h.x,
            dy = p[1] - h.y,
            n = Math.hypot(dx, dy) || 1;
          c.ax = dx / n;
          c.ay = dy / n;
        }
      } else if (this.game.settings.aimAssist) {
        const enemy = this.world.enemies
          .filter((e) => !e.dead && M.distance(h, e) < (h.classId === 'wizard' ? 100 : 42))
          .sort((a, b) => M.distance(h, a) - M.distance(h, b))[0];
        if (enemy) {
          const n = M.distance(h, enemy) || 1;
          c.ax = (enemy.x - h.x) / n;
          c.ay = (enemy.y - h.y) / n;
        }
      }
      return M.cleanInput(c);
    }
    startAttract() {
      if (this.net.active || this.stage !== 'title' || this.ui.shell.screen !== 'title') return;
      this.demo = {
        world: new M.World({ seed: 1981, demo: true, owners: [null, null] }),
        age: 0,
        segment: -1,
        seen: [],
      };
      this.ui.shell.hide();
      this.view.epoch = -1;
      const el = typeof document !== 'undefined' && document.getElementById('demo-label');
      if (el) el.hidden = false;
    }
    exitAttract() {
      if (!this.demo) return;
      this.demo = null;
      this.audio.stop();
      this.view.epoch = -1;
      this.lastInput = this.game.real;
      const el = typeof document !== 'undefined' && document.getElementById('demo-label');
      if (el) el.hidden = true;
      this.ui.title();
      this.game.players.forEach((i) => i.clear());
      this.consumeUntil = this.game.real + 0.3;
    }
    updateAttract(dt) {
      const d = this.demo;
      d.age += dt;
      const sequence = ['d2', 'c2', 'i2', 's2', 'final'];
      const segment = Math.floor(d.age / 18) % sequence.length;
      if (segment !== d.segment) {
        d.segment = segment;
        const w = d.world;
        w.site = M.ROOMS[sequence[segment]].site;
        w.classes = [M.HEROES[segment % 4].id, M.HEROES[(segment + 1) % 4].id];
        w.rings = sequence[segment] === 'final' ? ['dungeon', 'crystal', 'inferno', 'shifting'] : [];
        w.loadRoom(sequence[segment], false);
        d.seen.push(w.roomId);
        if (w.ring) {
          const p = w.nearestSafe({ x: w.ring.x - 16, y: w.ring.y });
          Object.assign(w.heroes[0], p);
          Object.assign(w.heroes[1], w.nearestSafe({ x: p.x - 16, y: p.y }));
        }
      }
      const w = d.world;
      if (w.mode === 'board') w.loadRoom(sequence[segment], false);
      w.step(dt);
      if (w.ring?.carrier != null && d.age % 18 > 8) {
        const h = w.heroes[w.ring.carrier];
        Object.assign(h, w.nearestSafe(w.room.exit));
      }
      if (w.roomId === 'final' && w.finalBeat === 'bind') {
        const i = w.bound.findIndex((b) => !b);
        if (i >= 0) Object.assign(w.heroes[0], w.room.stations[i]);
      }
      this.view.remote = this.net.active && !this.net.isHost();
      this.view.update(w, dt);
      this.view.camera(w);
      this.audio.update(w, !this.game.audio.ready);
    }
    update(dt) {
      const w = this.world;
      if (this.stage === 'title' && !this.net.active) {
        if (!this.demo && this.ui.shell.screen === 'title' && this.game.real - this.lastInput >= 10)
          this.startAttract();
        if (this.demo) this.updateAttract(dt);
        else this.view.update(w, dt, true);
        this.ui.update(w, dt);
        return;
      }
      if (this.net.ended) return;
      if (this.pendingJoin && (w.mode === 'board' || w.roomTime < 0.5 || this.stage === 'title')) {
        this.localJoined = true;
        w.setOwner(1, 1);
        this.pendingJoin = null;
        this.ui.shell.toast('Two heroes, two hands', 'Player 2 now commands the second hero.');
      }
      if (this.game.input.pressed('map') && !this.ui.shell.screen) {
        this.ui.objectiveMap();
      }
      const localSeat = this.net.active ? Math.max(0, this.net.seat()) : 0,
        local = this.inputFor(this.game.input, w.heroes[localSeat]);
      if (this.net.active) this.net.update(dt, local);
      else if (!this.ui.shell.screen || w.mode === 'board') {
        const commands = this.scriptCommands || [local, this.inputFor(this.game.players[1], w.heroes[1])];
        w.step(dt, commands);
      }
      this.view.remote = this.net.active && !this.net.isHost();
      this.view.update(w, dt);
      if (['room', 'court'].includes(w.mode)) this.view.camera(w);
      this.ui.update(w, dt);
      this.touch.update(w);
      this.audio.update(w);
      if (this.storageFailed && !this.storageNoted) {
        this.storageNoted = true;
        this.ui.shell.toast(
          'Checkpoint storage is unavailable',
          'The expedition remains playable for this visit.',
        );
      }
    }
    draw(r) {
      if (this.demo) this.view.draw(this.demo.world, r, this.game.settings);
      else if (this.stage === 'title') this.view.title(r, this.game.time);
      else if (this.world.mode === 'victory') this.view.victory(r);
      else if (this.world.mode === 'board') this.view.board(this.world, r);
      else this.view.draw(this.world, r, this.game.settings);
    }
  }
  M.App = App;
  if (!G.MA_NO_BOOT) M.app = new App();
})(globalThis);
