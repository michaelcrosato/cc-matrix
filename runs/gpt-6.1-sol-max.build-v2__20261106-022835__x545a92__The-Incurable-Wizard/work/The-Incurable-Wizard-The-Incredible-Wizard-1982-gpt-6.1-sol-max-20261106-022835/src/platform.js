(function (root) {
  'use strict';
  const I = root.IW;
  I.PRESET = {
    up: ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'],
    down: ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'],
    left: ['KeyA', 'ArrowLeft', 'Pad14', 'PadAxisLeft'],
    right: ['KeyD', 'ArrowRight', 'Pad15', 'PadAxisRight'],
    moveUp: ['KeyW', 'Pad12', 'PadAxisUp'],
    moveDown: ['KeyS', 'Pad13', 'PadAxisDown'],
    moveLeft: ['KeyA', 'Pad14', 'PadAxisLeft'],
    moveRight: ['KeyD', 'Pad15', 'PadAxisRight'],
    aimUp: ['ArrowUp', 'PadRAxisUp'],
    aimDown: ['ArrowDown', 'PadRAxisDown'],
    aimLeft: ['ArrowLeft', 'PadRAxisLeft'],
    aimRight: ['ArrowRight', 'PadRAxisRight'],
    fire: ['Space', 'Mouse0', 'Pad7', 'Pad0'],
    confirm: ['Enter', 'Space', 'Pad0'],
    cancel: ['Escape', 'Backspace', 'Pad1'],
    start: ['Enter', 'Pad9'],
    pause: ['Escape', 'KeyP', 'Pad9'],
  };
  class Vault {
    constructor(storage) {
      this.storage = storage;
      this.memory = {};
      this.key = 'incurable:v1';
      this.data = { v: 1, records: {}, checkpoint: null };
      try {
        const s = storage?.getItem(this.key);
        if (s) {
          const d = JSON.parse(s);
          if (d.v === 1 && d.records && typeof d.records === 'object')
            this.data = d;
        }
      } catch {}
    }
    commit() {
      try {
        this.storage?.setItem(this.key, JSON.stringify(this.data));
      } catch {}
    }
    save(world) {
      if (world.config.context !== 'campaign' || world.practice) return;
      this.data.checkpoint = world.export();
      this.commit();
    }
    clear() {
      this.data.checkpoint = null;
      this.commit();
    }
    record(world) {
      if (
        world.config.context !== 'campaign' ||
        world.practice ||
        world.status !== 'victory'
      )
        return false;
      const k =
        world.config.difficulty +
        (world.config.assistance ? ':assisted' : ':standard');
      this.data.records[k] = Math.max(this.data.records[k] || 0, world.score);
      this.data.checkpoint = null;
      this.commit();
      return true;
    }
  }
  I.Vault = Vault;
  class Controls {
    constructor(game) {
      this.game = game;
      this.contacts = new Map();
      this.touchMove = [0, 0];
      this.touchAim = [0, 0];
      this.mouseActive = false;
      this.lastMouse = [-100, -100];
      this.aims = {};
      this.enabled = true;
      this.intent = () => {};
      const cv = game.screen.canvas;
      if (!cv) return;
      const wake = (e) => {
        const deliberate =
          e.type !== 'pointermove' ||
          (e.pointerType === 'mouse' &&
            Math.hypot(
              e.clientX - this.lastMouse[0],
              e.clientY - this.lastMouse[1],
            ) > 6);
        if (deliberate) this.intent(e);
      };
      addEventListener('keydown', wake, { capture: true });
      addEventListener('pointerdown', wake, { capture: true });
      cv.addEventListener('pointermove', (e) => {
        if (
          e.pointerType === 'mouse' &&
          Math.hypot(
            e.clientX - this.lastMouse[0],
            e.clientY - this.lastMouse[1],
          ) > 5
        ) {
          this.mouseActive = true;
          this.lastMouse = [e.clientX, e.clientY];
          this.intent(e);
        }
        const p = this.contacts.get(e.pointerId);
        if (p) {
          p.dx = e.clientX - p.x;
          p.dy = e.clientY - p.y;
          this.syncTouch();
        }
      });
      cv.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        this.mouseActive = false;
        game.input.lastDevice = 'touch';
        if (game.shell?.screen) return;
        this.contextTap(e);
        const p = {
          x: e.clientX,
          y: e.clientY,
          dx: 0,
          dy: 0,
          side:
            e.clientX < cv.getBoundingClientRect().width / 2 ? 'move' : 'aim',
        };
        this.contacts.set(e.pointerId, p);
        try {
          cv.setPointerCapture?.(e.pointerId);
        } catch {}
        e.preventDefault();
        this.syncTouch();
      });
      const end = (e) => {
        this.contacts.delete(e.pointerId);
        this.syncTouch();
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      addEventListener('blur', () => this.clear());
      // The native stick renderer stays hidden. Gameplay uses the two anchored, invisible contacts above.
      game.input.touchEnabled = false;
      game.input.touchButtons([]);
      game.input.touchFilter = () => false;
    }
    contextTap(e) {
      const app = I.app,
        w = app?.world;
      if (!w) return;
      const p = app.network.active
        ? w.players.find((p) => p.seat === app.network.hub.me)
        : w.players[0];
      if (!p?.alive || p.bolt) return;
      const screen = this.game.input.screenPoint(e.clientX, e.clientY);
      const at =
        screen &&
        this.game.view.toGround(
          this.game.cam.x + screen[0],
          this.game.cam.y + screen[1],
        );
      if (!at) return;
      const candidates = [
        ...w.posts
          .filter((b) => b.cool <= 0)
          .map((b) => ({ x: b.x, y: b.y, bell: true })),
        ...w.enemies
          .filter((b) => b.warning <= 0 && w.visible(b))
          .map((b) => ({ x: b.m.x, y: b.m.y })),
        ...(w.familiar ? [{ x: w.familiar.m.x, y: w.familiar.m.y }] : []),
      ];
      for (const t of candidates) {
        if (Math.hypot(at[0] - I.world(t.x), at[1] - I.world(t.y)) > 13)
          continue;
        const aim = I.cardinal(t.x - p.m.x, t.y - p.m.y);
        if (aim < 0) continue;
        const d = I.DIRS[aim];
        const end = t.bell ? { x: t.x - d[0], y: t.y - d[1] } : t;
        if (!w.los(p, end)) continue;
        this.tapAction = { aim, until: this.game.real + 0.13 };
        this.tapCue = {
          x: I.world(t.x),
          y: I.world(t.y),
          label: t.bell ? 'RING!' : 'FIRE!',
          until: this.game.real + 0.45,
        };
        break;
      }
    }
    syncTouch() {
      this.touchMove = [0, 0];
      this.touchAim = [0, 0];
      for (const p of this.contacts.values()) {
        const v = [p.dx / 40, p.dy / 40];
        if (p.side === 'move') this.touchMove = v;
        else this.touchAim = v;
      }
    }
    clear() {
      this.contacts.clear();
      this.syncTouch();
      this.mouseActive = false;
      this.tapAction = null;
      this.tapCue = null;
      for (const i of this.game.players) i.clear();
    }
    sample(world, p, input = this.game.input) {
      if (!p || !p.alive || !this.enabled || this.game.shell?.screen)
        return { move: -1, aim: -1, fire: false };
      const val = (a) => input.value(a) || 0;
      let mx = val('moveRight') - val('moveLeft'),
        my = val('moveDown') - val('moveUp');
      let ax = val('aimRight') - val('aimLeft'),
        ay = val('aimDown') - val('aimUp');
      if (input.padMove?.some((n) => Math.abs(n) > 0.1)) {
        [mx, my] = input.padMove;
        this.mouseActive = false;
      }
      if (input.padAim) {
        [ax, ay] = input.padAim;
        this.mouseActive = false;
      }
      const touch =
        input === this.game.input &&
        (input.lastDevice === 'touch' || this.contacts.size > 0);
      if (touch) {
        [mx, my] = this.touchMove;
        [ax, ay] = this.touchAim;
      }
      let aim = I.cardinal(ax, ay, this.aims[p.id] ?? -1);
      if (aim >= 0) this.aims[p.id] = aim;
      if (
        input === this.game.input &&
        this.mouseActive &&
        !touch &&
        input.lastDevice !== 'gamepad'
      ) {
        const m = this.game.mouseGround();
        if (m)
          aim = I.cardinal(
            m[0] - I.world(p.m.x),
            m[1] - I.world(p.m.y),
            this.aims[p.id] ?? -1,
            5,
          );
        if (aim >= 0) this.aims[p.id] = aim;
      }
      const move = I.cardinal(mx, my, p.face, 0.25);
      if (input.pressed('fire') && p.bolt) {
        this.game.audio.sfx(I.FX.blocked);
      }
      let fire = input.down('fire') || (touch && Math.hypot(ax, ay) > 0.5);
      if (touch && this.tapAction?.until > this.game.real) {
        aim = this.tapAction.aim;
        fire = true;
      }
      if (touch && this.game.settings.assistance) {
        world.config.assistance = true;
        const targets = [
          ...world.enemies
            .filter((e) => world.visible(e) && e.warning <= 0)
            .map((e) => ({ x: e.m.x, y: e.m.y })),
          ...(world.familiar
            ? [{ x: world.familiar.m.x, y: world.familiar.m.y }]
            : []),
          ...(world.wizard?.state === 'active' ? [world.wizard] : []),
        ];
        const t = targets.find(
          (t) =>
            world.los(p, t) &&
            Math.hypot(t.x - p.m.x, t.y - p.m.y) <=
              4 + 16 * world.tuning.touchAssist,
        );
        if (
          t &&
          world.tuning.touchAssist &&
          Math.hypot(ax, ay) < 0.25 &&
          !(this.tapAction?.until > this.game.real)
        ) {
          aim = I.cardinal(t.x - p.m.x, t.y - p.m.y);
          fire = true;
        }
      }
      return { move, aim, fire };
    }
  }
  I.Controls = Controls;
  class Network {
    constructor(app, hub) {
      this.app = app;
      this.hub = hub;
      this.active = !!hub?.active;
      this.started = false;
      this.ended = false;
      this.finished = false;
      this.seq = 0;
      this.lastSnap = -1;
      this.pending = {};
      this.recvSeq = {};
      this.lastInput = {};
      this.acks = {};
      this.terminal = null;
      this.sendClock = 0;
      this.inputClock = 0;
      this.maxBytes = 0;
      this.sent = 0;
      this.rng = null;
    }
    async connect() {
      const h = this.hub;
      if (!h) return null;
      h.on('start', () => {
        this.started = true;
      });
      h.on('message', (d, from) => this.receive(d, from));
      h.on('leave', ({ id }) => {
        if (this.ended) return;
        delete this.pending[id];
        this.seats = this.seats?.filter((s) => s !== id);
        if (h.isHost) this.app.world?.removeSeat(id);
      });
      h.on('time-up', () => {
        if (h.isHost) this.finish(false);
      });
      h.on('end', () => {
        this.ended = true;
        this.started = false;
        this.pending = {};
        this.app.controls.clear();
        this.app.audio.stop();
        this.app.game.input.clear();
      });
      const info = await h.connect({ mode: 'shared-world', seats: [1, 2] });
      if (!info) {
        this.active = false;
        return null;
      }
      this.active = true;
      this.info = info;
      this.seats = info.players.map((p) => p.id);
      this.rng = h.rng('simulation');
      this.app.begin(
        'Normal',
        this.seats,
        'hub',
        Math.floor(this.rng() * 4294967295) || 1,
      );
      if (h.isHost) this.app.world.externalRng = this.rng;
      this.app.game.live = true;
      this.app.game.o.autoPause = false;
      this.app.game.o.menu.quit = false;
      h.ready();
      return info;
    }
    valid(c) {
      return (
        c &&
        Number.isInteger(c.move) &&
        c.move >= -1 &&
        c.move <= 3 &&
        Number.isInteger(c.aim) &&
        c.aim >= -1 &&
        c.aim <= 3 &&
        typeof c.fire === 'boolean'
      );
    }
    receive(d, from) {
      if (!this.active || this.ended || !d || d.v !== 1) return;
      const h = this.hub;
      if (h.isHost) {
        if (
          d.type !== 'input' ||
          !this.seats.includes(from) ||
          from === h.host ||
          !Number.isSafeInteger(d.seq) ||
          d.seq < 0 ||
          d.seq <= (this.recvSeq[from] ?? -1) ||
          !this.valid(d.cmd)
        )
          return;
        this.recvSeq[from] = d.seq;
        this.pending[from] = d.cmd;
        this.lastInput[from] = this.app.game.real;
        if (Number.isSafeInteger(d.ack) && d.ack <= this.app.world.tick)
          this.acks[from] = Math.max(this.acks[from] ?? -1, d.ack);
      } else if (
        from === h.host &&
        d.type === 'world' &&
        Number.isSafeInteger(d.tick) &&
        d.tick > this.lastSnap &&
        d.state?.v === 1
      ) {
        try {
          this.app.world.restore(d.state);
          this.lastSnap = d.tick;
        } catch {}
      }
    }
    send(d, to) {
      const n = JSON.stringify(d).length;
      this.maxBytes = Math.max(this.maxBytes, n);
      if (n > 16384) return false;
      const ok = this.hub.send(d, { to, reliable: true });
      if (ok) this.sent++;
      return ok;
    }
    step(dt, local) {
      if (!this.active || this.ended || !this.started || this.hub.time() < 0)
        return;
      const h = this.hub;
      this.sendClock += dt;
      this.inputClock += dt;
      if (h.isHost) {
        const cmds = {};
        for (const seat of this.seats)
          cmds[seat] =
            seat === h.me
              ? local
              : this.app.game.real - (this.lastInput[seat] ?? -100) < 0.65
                ? this.pending[seat]
                : { move: -1, aim: -1, fire: false };
        this.app.world.step(dt, cmds);
        if (this.sendClock >= 0.1) {
          this.sendClock %= 0.1;
          const s = this.app.world.export(false);
          delete s.ledger;
          s.events = s.events.slice(-12);
          this.send({
            v: 1,
            type: 'world',
            tick: this.app.world.tick,
            ack: this.recvSeq,
            state: s,
          });
        }
        if (['victory', 'defeat'].includes(this.app.world.status)) {
          if (!this.terminal) {
            this.terminal = {
              tick: this.app.world.tick,
              at: this.app.game.real,
              won: this.app.world.status === 'victory',
            };
            this.broadcast();
          }
          const peers = this.seats.filter((s) => s !== h.me);
          if (
            peers.every((s) => (this.acks[s] ?? -1) >= this.terminal.tick) ||
            this.app.game.real - this.terminal.at > 1
          )
            this.finish(this.terminal.won);
        }
      } else if (this.inputClock >= 1 / 15) {
        this.inputClock %= 1 / 15;
        this.send(
          {
            v: 1,
            type: 'input',
            seq: ++this.seq,
            ack: this.lastSnap,
            cmd: local,
          },
          h.host,
        );
      }
    }
    broadcast() {
      const s = this.app.world.export(false);
      delete s.ledger;
      s.events = s.events.slice(-12);
      return this.send({
        v: 1,
        type: 'world',
        tick: this.app.world.tick,
        ack: this.recvSeq,
        state: s,
      });
    }
    finish(won) {
      if (this.finished || this.ended || !this.hub.isHost) return;
      this.broadcast();
      this.finished = true;
      const w = this.app.world,
        ids = this.seats,
        scores = {},
        stats = {};
      for (const id of ids) {
        scores[id] = w.score;
        stats[id] = {
          Chambers: w.roomIndex + (w.status === 'victory' ? 1 : 0),
          Hunters: w.totalKills,
          Banishments: w.banishments,
        };
      }
      this.hub.finish({ standings: [ids], scores, won: !!won, stats });
    }
  }
  I.Network = Network;
})(globalThis);
