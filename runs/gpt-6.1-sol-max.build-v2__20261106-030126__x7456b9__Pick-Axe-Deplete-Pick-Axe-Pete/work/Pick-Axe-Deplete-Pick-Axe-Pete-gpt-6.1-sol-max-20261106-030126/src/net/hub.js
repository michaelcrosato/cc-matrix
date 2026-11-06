/* Session Protocol v1: one authority, authenticated intents, read-only views. */
(() => {
  const P = globalThis.PD,
    E = globalThis.My3D2dge;
  const STATS = [
    'chops',
    'redirects',
    'collisions',
    'picks',
    'keys',
    'evades',
    'rescues',
    'doors',
    'breaks',
    'damage',
    'high',
    'low',
  ];
  const WORLD = [
    'chamber',
    'route',
    'run',
    'time',
    'age',
    'status',
    'score',
    'bank',
    'bonus',
    'transition',
    'keyOwner',
    'work',
    'pressure',
    'relief',
    'chain',
    'chainT',
    'unarmedFor',
    'noKeyFor',
    'nextSpawn',
    'nextPair',
    'seed',
    'won',
    'reason',
  ];
  const PHASES = [null, 'wind', 'active', 'recover'];
  const KINDS = ['ore', 'hopper', 'heavy'];
  const SEND_INTERVAL = 0.1,
    SILENCE = 0.6,
    HARD_BYTES = 16384,
    SOFT_BYTES = 1200;
  const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const q = (n) => Math.round((Number(n) || 0) * 4);
  const milli = (n) => Math.round((Number(n) || 0) * 1000);
  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const counter = (n) => Number.isSafeInteger(n) && n >= 0 && n < 1e12;
  const byteSize = (value) => new TextEncoder().encode(JSON.stringify(value)).length;
  const bodyMask = (b, p) =>
    (b.air ? 1 : 0) |
    (b.climbing ? 2 : 0) |
    (b.crouching ? 4 : 0) |
    (b.onGround ? 8 : 0) |
    (p.down ? 16 : 0) |
    (b.jumped ? 32 : 0) |
    (b.landed ? 64 : 0);
  const holdMask = (i) =>
    (i.up ? 1 : 0) | (i.down ? 2 : 0) | (i.jump ? 4 : 0) | (i.chop ? 8 : 0) | (i.interact ? 16 : 0);
  const holdDecode = (h) => ({
    ...P.neutral(),
    x: h[0] / 100,
    up: !!(h[1] & 1),
    down: !!(h[1] & 2),
    jump: !!(h[1] & 4),
    chop: !!(h[1] & 8),
    interact: !!(h[1] & 16),
    aim: h[2] / 100,
    face: h[3] || 0,
  });
  const holdPack = (i) => [Math.round(i.x * 100), holdMask(i), Math.round(i.aim * 100), i.face || 0];
  const validHold = (h) =>
    Array.isArray(h) &&
    h.length === 4 &&
    h.every(finite) &&
    Math.abs(h[0]) <= 100 &&
    Math.abs(h[2]) <= 100 &&
    Number.isInteger(h[1]) &&
    h[1] >= 0 &&
    h[1] <= 31 &&
    [-1, 0, 1].includes(h[3]);

  const itemPack = (i) =>
    i
      ? [
          i.id,
          i.kind,
          round(i.x),
          round(i.z),
          round(i.baseX),
          round(i.age),
          round(i.life),
          !!i.recovered,
          i.reason || '',
        ]
      : null;
  const itemRead = (a) =>
    a
      ? {
          id: a[0],
          kind: a[1],
          x: a[2],
          z: a[3],
          baseX: a[4],
          age: a[5],
          life: a[6],
          recovered: a[7],
          reason: a[8],
          dead: false,
        }
      : null;
  const serial = (id) => Number(String(id).split(':').at(-1));

  const movementState = (b, p) => [
    milli(b.drop),
    milli(b.dashing),
    milli(b._coy),
    b._cut ? 1 : 0,
    b._airJ || 0,
    milli(b.stun),
    milli(p.jumpQueue),
  ];
  function packPlayer(p) {
    const b = p.body,
      a = p.action;
    return [
      p.id,
      round(b.x),
      round(b.z),
      round(b.vx),
      round(b.vz),
      b.facing,
      bodyMask(b, p),
      p.hp,
      p.tool,
      round(p.invuln),
      p.pose || null,
      round(p.poseT),
      p.actionKind,
      round(p.aim),
      round(p.collectT),
      round(p.jamT),
      round(p.rescueT),
      PHASES.indexOf(a.phase),
      round(a.t),
      [a.spec.wind, a.spec.active, a.spec.recover],
      [p.contribution.ore, p.contribution.redirects, p.contribution.rescues, p.contribution.key],
      b.h,
      round(b.stun),
      movementState(b, p),
    ];
  }
  function fullPacket(world, seq, acknowledgements) {
    return {
      v: 1,
      k: 'f',
      e: world.epoch,
      s: seq,
      t: world.tick,
      a: acknowledgements,
      w: WORLD.map((k) => (typeof world[k] === 'number' ? round(world[k]) : (world[k] ?? null))),
      f: [
        world.finale.wave,
        world.finale.active,
        world.finale.cleared,
        world.finale.startCollisions,
        round(world.finale.retry),
      ],
      p: world.players.map(packPlayer),
      r: world.rocks.map((r) => [
        r.id,
        r.kind,
        round(r.x),
        round(r.z),
        round(r.vx),
        round(r.vz),
        r.r,
        r.hp,
        round(r.life),
        round(r.spin),
        r.redirect,
        round(r.grace),
      ]),
      i: world.pickups.map(itemPack),
      key: itemPack(world.key),
      l: world.room.ladders.map((l) => [l.state, round(l.timer), round(l.grace), l.cycle]),
      d: world.room.doors.map((d) => [round(d.warning), round(d.pulse)]),
      n: world.warnings.map((w) => [
        w.id,
        w.type,
        w.reward || null,
        w.tier ?? null,
        round(w.x),
        round(w.z),
        round(w.t),
        round(w.original),
        w.door ?? null,
        w.kind || null,
      ]),
      g: STATS.map((k) => world.stats[k] || 0),
      b: { ...world.tuning },
      u: { ...world.tutorial },
      z: { ...world.features },
      ev: [],
    };
  }
  function motionPacket(world, seq, acknowledgements) {
    return {
      v: 1,
      k: 'm',
      e: world.epoch,
      s: seq,
      t: world.tick,
      a: acknowledgements,
      w: [
        world.status,
        world.score,
        world.work,
        round(world.pressure),
        round(world.relief),
        round(world.transition),
        world.keyOwner,
      ],
      p: world.players.map((p) => {
        const b = p.body;
        return [
          p.id,
          q(b.x),
          q(b.z),
          Math.round(b.vx),
          Math.round(b.vz),
          b.facing,
          bodyMask(b, p),
          p.hp,
          p.tool,
          milli(p.invuln),
          p.pose || null,
          milli(p.poseT),
          p.actionKind === 'redirect' ? 1 : 0,
          Math.round(p.aim * 100),
          milli(p.collectT),
          milli(p.jamT),
          milli(p.rescueT),
          PHASES.indexOf(p.action.phase),
          milli(p.action.t),
          movementState(b, p),
        ];
      }),
      r: world.rocks.map((r) => [
        serial(r.id),
        q(r.x),
        q(r.z),
        Math.round(r.vx),
        Math.round(r.vz),
        Math.round(r.spin * 100),
        KINDS.indexOf(r.kind),
        r.hp,
        r.redirect,
        milli(r.grace),
        Math.round(r.life * 10),
      ]),
      i: world.pickups.map((i) => [
        serial(i.id),
        q(i.x),
        q(i.z),
        Math.round(i.life * 10),
        Math.round(i.age * 10),
        q(i.baseX),
      ]),
      key: world.key
        ? [
            serial(world.key.id),
            q(world.key.x),
            q(world.key.z),
            Math.round(world.key.life * 10),
            Math.round(world.key.age * 10),
            q(world.key.baseX),
            !!world.key.recovered,
          ]
        : null,
    };
  }

  class HubLink {
    constructor(hub, worldOrNull, options = {}) {
      this.hub = hub;
      this.isHost = !!hub.isHost;
      this.server = !!hub.server;
      if (this.isHost && !worldOrNull) throw new Error('Hub authority needs its canonical Mine');
      this.world = this.isHost ? worldOrNull : null;
      this.view = this.world || new P.Mine({ seed: hub.seed, roster: hub.players });
      this.view.networkSession = true;
      if (!this.isHost) {
        this.view.networkReadOnly = true;
        this.view.events = [];
        this.view.history = [];
      }
      this.onView = options.onView || (() => {});
      this.onEvents = options.onEvents || (() => {});
      this.onEpoch = options.onEpoch || (() => {});
      this.members = new Set(hub.players.map((p) => p.id));
      this.gameplayRng = hub.rng('gameplay');
      this.presentationRng = hub.rng('presentation');
      this.clock = 0;
      this.ended = false;
      this.finished = false;
      this.epoch = this.view.epoch;
      this.seq = 0;
      this.inputSeq = 0;
      this.fullSeq = -1;
      this.motionSeq = -1;
      this.nextSend = 0;
      this.slot = 0;
      this.forceFull = true;
      this.remotes = new Map();
      this.outEdges = [0, 0, 0];
      this.edgeHistory = [];
      this.outAcks = [0, 0, 0];
      this.edgeLatch = [false, false, false];
      this.lastRaw = P.neutral();
      this.pendingEvents = [];
      this.eventIds = new Set();
      this.eventOrder = [];
      this.published = new Set();
      this.publishedOrder = [];
      this.targets = new Map();
      this.authoritative = {
        epoch: this.epoch,
        tick: 0,
        players: {},
        rocks: {},
      };
      this.lastMotion = null;
      this.localFrame = 0;
      this.ackFrame = 0;
      this.inputHistory = [];
      this.predictionAnchor = null;
      this.predictionCorrections = 0;
      this.predictionError = 0;
      this.epochFence = false;
      this.counts = {
        sent: 0,
        received: 0,
        dropped: 0,
        rejected: 0,
        maxBytes: 0,
        maxUnreliableBytes: 0,
        full: 0,
        motion: 0,
        inputs: 0,
        finishCalls: 0,
      };
      this.sendTimes = [];
      this.maxPerSecond = 0;
      this.unsubscribe = hub.on('message', (data, from) => this.receive(data, from));
    }

    _running() {
      return !this.ended && Number.isFinite(this.hub.time()) && this.hub.time() >= 0;
    }

    _changeEpoch(epoch) {
      if (epoch === this.epoch) return;
      this.epoch = epoch;
      this.remotes.clear();
      this.outEdges = [0, 0, 0];
      this.edgeHistory = [];
      this.outAcks = [0, 0, 0];
      this.edgeLatch = [!!this.lastRaw.jumpPressed, !!this.lastRaw.redirect, !!this.lastRaw.interactPressed];
      this.forceFull = true;
      this.fullSeq = -1;
      this.motionSeq = -1;
      this.lastMotion = null;
      this.targets.clear();
      this.localFrame = 0;
      this.ackFrame = 0;
      this.inputHistory = [];
      this.predictionAnchor = null;
      this.epochFence = true;
      this.onEpoch(epoch);
    }

    _acknowledgements() {
      return [...this.remotes].map(([id, r]) => [id, r.seq, ...r.edges, r.frame || 0]);
    }

    _readAck(rows) {
      if (!Array.isArray(rows)) return;
      const row = rows.find((a) => Array.isArray(a) && a[0] === this.hub.me);
      if (row?.length >= 6 && counter(row[5])) this.ackFrame = Math.max(this.ackFrame, row[5]);
      if (row?.length >= 5)
        this.outAcks = row
          .slice(2, 5)
          .map((n, i) => (counter(n) ? Math.max(this.outAcks[i], n) : this.outAcks[i]));
      this.edgeHistory = this.edgeHistory.filter((row) => row[1] > this.outAcks[row[0]]);
    }

    intents(localIntent) {
      if (!this.isHost || !this._running()) return {};
      this._changeEpoch(this.world.epoch);
      const output = {};
      if (!this.server && this.members.has(this.hub.me))
        output[this.hub.me] = this.epochFence ? P.neutral() : P.canonical(localIntent);
      this.epochFence = false;
      for (const id of this.members) {
        if (!this.server && id === this.hub.me) continue;
        const remote = this.remotes.get(id);
        if (!remote || this.clock - remote.at > SILENCE) {
          output[id] = P.neutral();
          continue;
        }
        const intent = { ...remote.intent };
        intent.jumpPressed = remote.pending[0] > 0;
        intent.redirect = remote.pending[1] > 0;
        intent.interactPressed = remote.pending[2] > 0;
        for (let i = 0; i < 3; i++)
          if (remote.pending[i] > 0) {
            remote.pending[i]--;
            const context = remote.pendingContexts[i].shift();
            if (context && i === 0) {
              intent.x = context.x;
              intent.up = context.up;
              intent.down = context.down;
              intent.jump = context.jump;
            }
            if (context && i === 1) {
              intent.aim = context.aim;
              intent.face = context.face || intent.face;
            }
          }
        output[id] = intent;
      }
      return output;
    }

    update(dt, localIntent = P.neutral()) {
      if (!this._running()) return;
      this.clock += Math.max(0, Math.min(Number(dt) || 0, 0.1));
      if (this.isHost) this._changeEpoch(this.world.epoch);
      else {
        const raw = P.canonical(localIntent);
        // A one-tick turn can occur between network slots. Carry the facing
        // selected by that movement with every attack hold, so the host does
        // not swing the opposite way after the local presentation turned.
        if (!raw.face && (raw.chop || raw.redirect))
          raw.face =
            Math.abs(raw.x) > 0.25
              ? Math.sign(raw.x)
              : this.view.players.find((p) => p.id === this.hub.me)?.body.facing || 1;
        const edges = [raw.jumpPressed, raw.redirect, raw.interactPressed];
        for (let i = 0; i < 3; i++)
          if (edges[i] && !this.edgeLatch[i]) {
            this.outEdges[i]++;
            this.edgeHistory.push([i, this.outEdges[i], ...holdPack(raw)]);
            const same = this.edgeHistory.filter((row) => row[0] === i);
            if (same.length > 8) this.edgeHistory.splice(this.edgeHistory.indexOf(same[0]), 1);
          }
        this.edgeLatch = edges;
        this.lastRaw = raw;
        if (this.epochFence) {
          this.lastRaw = P.neutral();
          this.epochFence = false;
        }
        this._predict(dt, this.lastRaw);
        this._interpolate(dt);
      }
      if (this.clock + 1e-8 < this.nextSend) return;
      this.nextSend = this.clock + SEND_INTERVAL;
      if (this.isHost) this._publishSlot();
      else
        this._send(
          {
            v: 1,
            k: 'i',
            e: this.epoch,
            s: ++this.inputSeq,
            h: [
              Math.round(this.lastRaw.x * 100),
              holdMask(this.lastRaw),
              Math.round(this.lastRaw.aim * 100),
              this.lastRaw.face || 0,
            ],
            c: [...this.outEdges],
            q: this.localFrame,
            b: this.edgeHistory.map((row) => [...row]),
          },
          false,
          this.hub.host,
        );
    }

    _send(packet, reliable, to) {
      if (this.ended) return false;
      const bytes = byteSize(packet);
      if (bytes > HARD_BYTES || (!reliable && bytes > SOFT_BYTES)) {
        this.counts.rejected++;
        return false;
      }
      const now = this.clock;
      this.sendTimes = this.sendTimes.filter((t) => now - t < 0.999);
      // One owner schedules all game messages; this additional guard protects against
      // callers advancing an unusual mixture of clock sizes.
      if (this.sendTimes.length >= 10) {
        this.counts.dropped++;
        return false;
      }
      const sent = this.hub.send(packet, to === undefined ? { reliable } : { reliable, to });
      if (sent === false) {
        this.counts.dropped++;
        return false;
      }
      this.sendTimes.push(now);
      this.maxPerSecond = Math.max(this.maxPerSecond, this.sendTimes.length);
      this.counts.sent++;
      this.counts.maxBytes = Math.max(this.counts.maxBytes, bytes);
      if (!reliable) this.counts.maxUnreliableBytes = Math.max(this.counts.maxUnreliableBytes, bytes);
      this.counts[packet.k === 'i' ? 'inputs' : packet.k === 'f' ? 'full' : 'motion']++;
      return true;
    }

    _publishSlot() {
      const acknowledgements = this._acknowledgements(),
        seq = ++this.seq;
      const full = this.forceFull || this.slot++ % 4 === 0;
      if (!full) {
        const packet = motionPacket(this.world, seq, acknowledgements);
        if (byteSize(packet) <= SOFT_BYTES) {
          this._send(packet, false);
          return;
        }
      }
      const packet = fullPacket(this.world, seq, acknowledgements);
      let take = 0;
      for (const event of this.pendingEvents) {
        packet.ev.push(event);
        if (byteSize(packet) > 15000) {
          packet.ev.pop();
          break;
        }
        take++;
      }
      if (this._send(packet, true)) {
        this.pendingEvents.splice(0, take);
        this.forceFull = false;
      }
    }

    publish(events) {
      if (this.ended || !this.isHost || !Array.isArray(events)) return;
      for (const event of events) {
        if (!event || typeof event.id !== 'string' || this.published.has(event.id)) continue;
        this.published.add(event.id);
        this.publishedOrder.push(event.id);
        if (this.publishedOrder.length > 2048) this.published.delete(this.publishedOrder.shift());
        this.pendingEvents.push({ ...event });
        if (
          ['door', 'key', 'pick', 'victory', 'failure', 'down', 'rescue', 'break', 'keyLost'].includes(
            event.type,
          )
        )
          this.forceFull = true;
      }
      // Only presentation events are queued. The full state is always canonical.
      // If a peer stalls, retain critical events before footsteps and swing noise.
      while (this.pendingEvents.length > 256) {
        const disposable = this.pendingEvents.findIndex((e) =>
          ['step', 'rung', 'land', 'rock', 'swing'].includes(e.type),
        );
        this.pendingEvents.splice(disposable >= 0 ? disposable : 0, 1);
      }
    }

    receive(data, from) {
      if (
        this.ended ||
        !data ||
        typeof data !== 'object' ||
        data.v !== 1 ||
        !counter(data.e) ||
        !counter(data.s)
      )
        return;
      if (this.isHost) {
        if (
          data.k !== 'i' ||
          !this.members.has(from) ||
          (!this.server && from === this.hub.me) ||
          data.e !== this.world.epoch ||
          !this._running()
        ) {
          this.counts.rejected++;
          return;
        }
        if (
          !Array.isArray(data.h) ||
          data.h.length !== 4 ||
          !data.h.every(finite) ||
          Math.abs(data.h[0]) > 100 ||
          Math.abs(data.h[2]) > 100 ||
          ![-1, 0, 1].includes(data.h[3]) ||
          !Number.isInteger(data.h[1]) ||
          data.h[1] < 0 ||
          data.h[1] > 31 ||
          !Array.isArray(data.c) ||
          data.c.length !== 3 ||
          !data.c.every(counter)
        ) {
          this.counts.rejected++;
          return;
        }
        if (
          data.b !== undefined &&
          (!Array.isArray(data.b) ||
            data.b.length > 24 ||
            data.b.some(
              (row) =>
                !Array.isArray(row) ||
                row.length !== 6 ||
                ![0, 1, 2].includes(row[0]) ||
                !counter(row[1]) ||
                !validHold(row.slice(2)),
            ))
        ) {
          this.counts.rejected++;
          return;
        }
        let remote = this.remotes.get(from);
        if (remote && data.s <= remote.seq) {
          this.counts.rejected++;
          return;
        }
        if (!remote)
          remote = {
            seq: -1,
            edges: [0, 0, 0],
            pending: [0, 0, 0],
            pendingContexts: [[], [], []],
            intent: P.neutral(),
            at: this.clock,
          };
        if (data.c.some((n, i) => n < remote.edges[i])) {
          this.counts.rejected++;
          return;
        }
        for (let i = 0; i < 3; i++) {
          for (let edge = remote.edges[i] + 1; edge <= Math.min(data.c[i], remote.edges[i] + 8); edge++) {
            if (remote.pending[i] >= 8) break;
            const row = data.b?.find((row) => row[0] === i && row[1] === edge);
            remote.pendingContexts[i].push(holdDecode(row ? row.slice(2) : data.h));
            remote.pending[i]++;
          }
          remote.edges[i] = data.c[i];
        }
        remote.intent = holdDecode(data.h);
        remote.seq = data.s;
        remote.frame = counter(data.q) ? data.q : 0;
        remote.at = this.clock;
        this.remotes.set(from, remote);
        this.counts.received++;
        return;
      }
      if (
        from !== this.hub.host ||
        !['f', 'm'].includes(data.k) ||
        data.e < this.epoch ||
        !Array.isArray(data.p) ||
        data.p.length > 2 ||
        !Array.isArray(data.r) ||
        data.r.length > 48 ||
        !counter(data.t)
      ) {
        this.counts.rejected++;
        return;
      }
      if (data.k === 'm' && (data.e !== this.epoch || data.s <= this.motionSeq)) {
        this.counts.rejected++;
        return;
      }
      if (data.k === 'f' && data.e === this.epoch && data.s <= this.fullSeq) {
        this.counts.rejected++;
        return;
      }
      try {
        if (data.k === 'f') this._applyFull(data);
        else this._applyMotion(data);
        this.counts.received++;
      } catch (_) {
        this.counts.rejected++;
      }
    }

    _applyBody(player, values, snap, extra) {
      const b = player.body,
        [x, z, vx, vz, facing, mask] = values;
      b.vx = vx;
      b.vz = vz;
      b.facing = facing;
      b.air = !!(mask & 1);
      b.climbing = !!(mask & 2);
      b.crouching = !!(mask & 4);
      b.onGround = !!(mask & 8);
      player.down = !!(mask & 16);
      b.jumped = !!(mask & 32);
      b.landed = !!(mask & 64);
      b.h = b.crouching ? 12 : 24;
      if (extra) {
        b.drop = extra[0] / 1000;
        b.dashing = extra[1] / 1000;
        b._coy = extra[2] / 1000;
        b._cut = !!extra[3];
        b._airJ = extra[4];
        b.stun = extra[5] / 1000;
        b._pdJumpQueue = extra[6] / 1000;
      }
      b._h0 = 24;
      if (player.id === this.hub.me && !this.isHost) {
        b.x = x;
        b.z = z;
        this.predictionAnchor = { ...b };
      } else this._goal(`p:${player.id}`, b, x, z, snap);
      this.authoritative.players[player.id] = {
        x,
        z,
        vx,
        vz,
        hp: player.hp,
        tool: player.tool,
        down: player.down,
      };
    }

    _action(player, kind, phase, time, timings) {
      if (player.actionKind !== kind || !player.action || timings) {
        const tun = this.view.tuning;
        const spec =
          kind === 'redirect'
            ? {
                wind: 0.045,
                active: tun.redirectWindow,
                recover: 0.19,
                reach: 29,
                blade: 0.8,
              }
            : {
                wind: 0.06,
                active: 0.11,
                recover: Math.max(0.03, tun.chopCycle - 0.17),
                reach: 29,
                blade: 1,
              };
        if (timings) [spec.wind, spec.active, spec.recover] = timings;
        player.action = new E.Attack(kind === 'redirect' ? 'rising' : 'overhead', spec);
      }
      player.actionKind = kind;
      player.action.phase = PHASES[phase] || null;
      player.action.t = time;
    }

    _applyFull(data) {
      if (
        !Array.isArray(data.w) ||
        data.w.length !== WORLD.length ||
        !Array.isArray(data.l) ||
        !Array.isArray(data.i) ||
        !Array.isArray(data.n)
      )
        throw new Error('Malformed full frame');
      const changed = data.e !== this.epoch,
        chamber = data.w[0],
        route = data.w[1];
      if (
        !Number.isInteger(chamber) ||
        chamber < 0 ||
        chamber >= P.ROOMS.length ||
        !Number.isInteger(route) ||
        route < 0 ||
        route > 2
      )
        throw new Error('Invalid room');
      if (changed) this._changeEpoch(data.e);
      const roster = this.hub.players.filter(
        (p) => this.members.has(p.id) && data.p.some((a) => a[0] === p.id),
      );
      if (changed || chamber !== this.view.chamber) {
        this.view = new P.Mine({ seed: data.w[20], roster, chamber, route });
        this.view.events = [];
        this.view.history = [];
        this.targets.clear();
      }
      const view = this.view;
      view.networkReadOnly = true;
      view.networkSession = true;
      view.roster = roster.map((p) => ({ ...p }));
      if (view.room.route !== route) view.room = P.buildRoom(chamber, route);
      WORLD.forEach((key, i) => {
        view[key] = data.w[i];
      });
      view.epoch = data.e;
      view.tick = data.t;
      this.authoritative.epoch = data.e;
      this.authoritative.tick = data.t;
      view.tuning = { ...P.defaults(), ...data.b };
      view.tutorial = { ...data.u };
      view.features = { ...data.z };
      view.finale = {
        wave: data.f[0],
        active: !!data.f[1],
        cleared: data.f[2],
        startCollisions: data.f[3],
        retry: data.f[4],
      };
      STATS.forEach((key, i) => {
        view.stats[key] = data.g[i];
      });
      const oldPlayers = new Map(view.players.map((p) => [p.id, p]));
      view.players = data.p.map((row, index) => {
        if (!this.members.has(row[0]) || row.length < 23) throw new Error('Invalid player row');
        const info = roster.find((p) => p.id === row[0]);
        if (!info) throw new Error('Unknown player');
        const p = oldPlayers.get(row[0]) || view.newMiner(info, index);
        p.hp = row[7];
        p.tool = row[8];
        p.invuln = row[9];
        p.pose = row[10];
        p.poseT = row[11];
        p.aim = row[13];
        p.collectT = row[14];
        p.jamT = row[15];
        p.rescueT = row[16];
        p.contribution = {
          ore: row[20][0],
          redirects: row[20][1],
          rescues: row[20][2],
          key: row[20][3],
        };
        p.intent = P.neutral();
        this._action(p, row[12], row[17], row[18], row[19]);
        p.body.h = row[21];
        p.body.stun = row[22];
        this._applyBody(p, row.slice(1, 7), changed || !oldPlayers.has(p.id), row[23]);
        return p;
      });
      view.rocks = data.r.map((row) => ({
        id: row[0],
        kind: row[1],
        x: row[2],
        z: row[3],
        vx: row[4],
        vz: row[5],
        r: row[6],
        hp: row[7],
        life: row[8],
        spin: row[9],
        redirect: row[10],
        grace: row[11],
        dead: false,
        evaded: [],
        near: {},
      }));
      for (const rock of view.rocks) this._goal(`r:${rock.id}`, rock, rock.x, rock.z, true);
      view.pickups = data.i.map(itemRead);
      view.key = itemRead(data.key);
      for (let i = 0; i < view.room.ladders.length; i++) {
        const ladder = view.room.ladders[i],
          row = data.l[i];
        if (!row) continue;
        [ladder.state, ladder.timer, ladder.grace, ladder.cycle] = row;
        for (const [cx, cz, under] of ladder.cells)
          view.room.level.set(cx, cz, ['usable', 'warning'].includes(ladder.state) ? 3 : under);
      }
      for (let i = 0; i < view.room.doors.length; i++) {
        const row = data.d[i];
        if (row) [view.room.doors[i].warning, view.room.doors[i].pulse] = row;
      }
      view.warnings = data.n.map((row) => ({
        id: row[0],
        type: row[1],
        reward: row[2],
        tier: row[3],
        x: row[4],
        z: row[5],
        t: row[6],
        original: row[7],
        door: row[8],
        kind: row[9],
      }));
      this.fullSeq = data.s;
      this._readAck(data.a);
      // An unreliable motion may overtake its preceding reliable keyframe.
      // Apply topology/events from that frame, then retain the newer poses.
      if (this.lastMotion && this.lastMotion.e === data.e && this.lastMotion.s > data.s)
        this._applyMotion(this.lastMotion, true);
      else this.motionSeq = Math.max(this.motionSeq, data.s);
      this._reconcile();
      const fresh = [];
      for (const event of data.ev || [])
        if (event && typeof event.id === 'string' && !this.eventIds.has(event.id)) {
          this.eventIds.add(event.id);
          this.eventOrder.push(event.id);
          fresh.push(event);
          if (this.eventOrder.length > 2048) this.eventIds.delete(this.eventOrder.shift());
        }
      if (fresh.length) {
        view.history.push(...fresh);
        if (view.history.length > 2000) view.history.splice(0, view.history.length - 2000);
        this.onEvents(fresh);
      }
      this.onView(view);
    }

    _applyMotion(data, replay = false) {
      const view = this.view;
      if (!Array.isArray(data.w) || data.w.length < 7 || !Array.isArray(data.i))
        throw new Error('Malformed motion');
      [view.status, view.score, view.work, view.pressure, view.relief, view.transition, view.keyOwner] =
        data.w;
      view.tick = data.t;
      this.authoritative.tick = data.t;
      for (const row of data.p) {
        const p = view.players.find((p) => p.id === row[0]);
        if (!p) continue;
        p.hp = row[7];
        p.tool = row[8];
        p.invuln = row[9] / 1000;
        p.pose = row[10];
        p.poseT = row[11] / 1000;
        p.aim = row[13] / 100;
        p.collectT = row[14] / 1000;
        p.jamT = row[15] / 1000;
        p.rescueT = row[16] / 1000;
        this._action(p, row[12] ? 'redirect' : 'chop', row[17], row[18] / 1000);
        this._applyBody(p, [row[1] / 4, row[2] / 4, row[3], row[4], row[5], row[6]], false, row[19]);
      }
      const old = new Map(view.rocks.map((r) => [r.id, r]));
      view.rocks = data.r.map((row) => {
        const id = `${data.e}:rock:${row[0]}`,
          r = old.get(id) || {
            id,
            x: row[1] / 4,
            z: row[2] / 4,
            dead: false,
            evaded: [],
            near: {},
          };
        r.vx = row[3];
        r.vz = row[4];
        r.spin = row[5] / 100;
        r.kind = KINDS[row[6]] || 'ore';
        r.r = r.kind === 'heavy' ? 10 : r.kind === 'hopper' ? 6 : 7;
        r.hp = row[7];
        r.redirect = row[8];
        r.grace = row[9] / 1000;
        r.life = row[10] / 10;
        this._goal(`r:${id}`, r, row[1] / 4, row[2] / 4, !old.has(id));
        this.authoritative.rocks[id] = {
          x: row[1] / 4,
          z: row[2] / 4,
          kind: r.kind,
        };
        return r;
      });
      view.pickups = data.i.map((row) => ({
        id: `${data.e}:pick:${row[0]}`,
        kind: 'pick',
        x: row[1] / 4,
        z: row[2] / 4,
        life: row[3] / 10,
        age: row[4] / 10,
        baseX: row[5] / 4,
        dead: false,
      }));
      const key = data.key;
      view.key = key
        ? {
            id: `${data.e}:key:${key[0]}`,
            kind: 'key',
            x: key[1] / 4,
            z: key[2] / 4,
            life: key[3] / 10,
            age: key[4] / 10,
            baseX: key[5] / 4,
            recovered: key[6],
            dead: false,
          }
        : null;
      this.motionSeq = Math.max(this.motionSeq, data.s);
      this._readAck(data.a);
      this._reconcile();
      if (!replay) {
        this.lastMotion = data;
        this.onView(view);
      }
    }

    // Only the owning client's traversal is predicted. The authoritative Mine,
    // actions, health, wear, pickups, director and rewards are never stepped here.
    _predictStep(body, input, dt) {
      const v = this.view,
        t = v.tuning;
      body.run = t.moveSpeed;
      body.climb = t.climbSpeed;
      body.jump = t.jumpSpeed;
      body.gravity = t.gravity;
      body.fallGravity = t.gravity * 1.35;
      body._pdJumpQueue = input.jumpPressed ? body.buffer : Math.max(0, (body._pdJumpQueue || 0) - dt);
      if (input.up && !body.climbing) {
        const l = v.room.ladders.find(
          (l) =>
            ['usable', 'warning'].includes(l.state) &&
            Math.abs(l.x - body.x) < 13 &&
            body.z >= l.from - 2 &&
            body.z < l.to - 1,
        );
        if (l && Math.abs(body.vx) < body.run * 0.9) body.x = l.x;
      }
      const descend =
        input.down &&
        !body.climbing &&
        body.onGround &&
        v.room.level.touching({ x: body.x, z: body.z - 3, w: 2, h: 3 }, 'ladder');
      if (descend) {
        body.crouch = false;
        body.crouching = false;
        body.h = 24;
      }
      const was = body.climbing;
      body.update(dt, v.room.level, {
        ...input,
        jumpPressed: body._pdJumpQueue > 0,
      });
      body.crouch = true;
      if (input.face && (input.chop || input.redirect)) body.facing = input.face;
      if (body.climbing && Math.abs(input.x) > 0.25) body.facing = Math.sign(input.x);
      if (body.jumped || body.drop > 0 || (was && !body.climbing)) body._pdJumpQueue = 0;
      body.x = Math.max(27, Math.min(389, body.x));
      if (body.z < -25) {
        body.x = 88;
        body.z = 16;
        body.vx = body.vz = 0;
      }
    }

    _predict(dt, input) {
      this.localFrame++;
      this.view.networkInputLead = Math.min(0.6, Math.max(0.1, (this.localFrame - this.ackFrame) * P.STEP));
      this.inputHistory.push({
        frame: this.localFrame,
        dt,
        input: { ...input },
      });
      if (this.inputHistory.length > 240) this.inputHistory.shift();
      const p = this.view.players.find((p) => p.id === this.hub.me);
      if (p && !p.down && this.view.status === 'playing') this._predictStep(p.body, input, dt);
    }

    _reconcile() {
      const p = this.view.players.find((p) => p.id === this.hub.me);
      if (!p || !this.predictionAnchor) return;
      const previous = { x: p.body.x, z: p.body.z };
      const body = Object.assign(new E.Platformer({ w: 10, h: 24, crouch: true }), this.predictionAnchor);
      this.inputHistory = this.inputHistory.filter((f) => f.frame > this.ackFrame);
      if (!p.down && this.view.status === 'playing')
        for (const frame of this.inputHistory) this._predictStep(body, frame.input, frame.dt);
      this.predictionError = Math.hypot(previous.x - body.x, previous.z - body.z);
      this.predictionCorrections++;
      p.body = body;
    }

    _goal(id, object, x, z, snap) {
      const prior = this.targets.get(id);
      if (snap || !prior || Math.hypot(object.x - x, object.z - z) > 80) {
        object.x = x;
        object.z = z;
      }
      this.targets.set(id, { object, x, z, at: this.clock });
    }

    _interpolate(dt) {
      const alpha = 1 - Math.exp(-Math.max(0, dt) / 0.055);
      for (const [id, goal] of this.targets) {
        if (this.clock - goal.at > 1) {
          this.targets.delete(id);
          continue;
        }
        goal.object.x += (goal.x - goal.object.x) * alpha;
        goal.object.z += (goal.z - goal.object.z) * alpha;
      }
    }

    leave(id) {
      if (this.ended || !this.members.has(id)) return;
      this.members.delete(id);
      this.remotes.delete(id);
      if (this.isHost) {
        this.world.leave(id);
        this.forceFull = true;
      } else {
        this.view.players = this.view.players.filter((p) => p.id !== id);
        this.view.roster = this.view.roster.filter((p) => p.id !== id);
      }
    }

    finish(won) {
      if (this.ended || this.finished || !this.isHost) return false;
      this.finished = true;
      this.counts.finishCalls++;
      const ids = [...this.members].filter((id) => this.hub.players.some((p) => p.id === id));
      const scores = Object.fromEntries(ids.map((id) => [id, this.world.score]));
      const stats = Object.fromEntries(
        ids.map((id) => {
          const p = this.world.players.find((p) => p.id === id);
          return [
            id,
            {
              'Ore broken': p?.contribution.ore || 0,
              Ricochets: p?.contribution.redirects || 0,
              Rescues: p?.contribution.rescues || 0,
              'Keys caught': p?.contribution.key || 0,
            },
          ];
        }),
      );
      this.hub.finish({
        standings: ids.length ? [ids] : [],
        scores,
        won: !!won,
        stats,
      });
      return true;
    }

    end() {
      if (this.ended) return;
      this.ended = true;
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.remotes.clear();
      this.pendingEvents.length = 0;
      this.targets.clear();
      this.sendTimes.length = 0;
      this.outEdges = [0, 0, 0];
      this.edgeHistory = [];
      this.lastRaw = P.neutral();
      this.lastMotion = null;
      this.inputHistory.length = 0;
      this.predictionAnchor = null;
    }

    diagnostics() {
      return {
        ...this.counts,
        maxPerSecond: this.maxPerSecond,
        clock: round(this.clock),
        epoch: this.epoch,
        host: this.isHost,
        server: this.server,
        ended: this.ended,
        finished: this.finished,
        members: [...this.members],
        peers: [...this.remotes.keys()],
        pendingEvents: this.pendingEvents.length,
        predictionFrames: this.inputHistory.length,
        predictionCorrections: this.predictionCorrections,
        predictionError: round(this.predictionError),
        inputEdges: [...this.outEdges],
        inputAcks: [...this.outAcks],
        fullSeq: this.fullSeq,
        motionSeq: this.motionSeq,
        authorityTick: this.isHost ? this.world.tick : this.authoritative.tick,
      };
    }
  }
  P.HubLink = HubLink;
})();
