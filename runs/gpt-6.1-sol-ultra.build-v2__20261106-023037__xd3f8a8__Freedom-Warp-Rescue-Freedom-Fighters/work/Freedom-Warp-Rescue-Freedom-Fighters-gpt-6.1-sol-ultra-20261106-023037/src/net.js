/* Freedom Warp Rescue: authenticated shared-world adapter, protocol 1. */
(function (root) {
  "use strict";
  const F = (root.FWR = root.FWR || {});
  const STEP = 1 / 120;
  const NEUTRAL = Object.freeze({ mx: 0, my: 0, ax: 0, ay: 0, fire: false, burst: false });
  const TAG = "fwr";
  const MAX_BYTES = 16000;
  const CHUNK_CHARS = 13800;
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const integer = (v) => Number.isSafeInteger(v) && v >= 0;
  const utf8 = (value) => new TextEncoder().encode(value);
  const byteSize = (value) => utf8(JSON.stringify(value)).length;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  // A small lossless LZW codec keeps complete snapshots below the Hub's
  // individual-message limit without removing enemies, ledgers, or events.
  // Oversized worlds are split into reliable pieces, never truncated.
  function encodeState(value) {
    const input = utf8(JSON.stringify(value));
    const dict = new Map();
    for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
    let next = 256,
      word = "";
    const codes = [];
    for (const byte of input) {
      const c = String.fromCharCode(byte),
        joined = word + c;
      if (dict.has(joined)) word = joined;
      else {
        codes.push(dict.get(word));
        if (next < 65536) dict.set(joined, next++);
        word = c;
      }
    }
    if (word) codes.push(dict.get(word));
    let binary = "";
    for (const code of codes) binary += String.fromCharCode(code >>> 8, code & 255);
    return root.btoa(binary);
  }

  function decodeState(encoded) {
    if (typeof encoded !== "string" || encoded.length > 1_000_000)
      throw new Error("Invalid snapshot encoding");
    const binary = root.atob(encoded);
    if (binary.length % 2) throw new Error("Invalid snapshot code stream");
    if (!binary.length) throw new Error("Empty snapshot");
    const dict = [];
    for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);
    const codeAt = (i) => (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
    let word = dict[codeAt(0)],
      next = 256;
    if (word === undefined) throw new Error("Invalid first snapshot code");
    const output = [word];
    let length = word.length;
    for (let i = 2; i < binary.length; i += 2) {
      const code = codeAt(i);
      const entry = dict[code] !== undefined ? dict[code] : code === next ? word + word[0] : null;
      if (entry === null) throw new Error("Invalid snapshot dictionary");
      output.push(entry);
      length += entry.length;
      if (length > 2_000_000) throw new Error("Snapshot expansion limit");
      if (next < 65536) dict[next++] = word + entry[0];
      word = entry;
    }
    const bytes = new Uint8Array(length);
    let at = 0;
    for (const entry of output)
      for (let i = 0; i < entry.length; i++) bytes[at++] = entry.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function cleanIntent(input) {
    if (!input || typeof input !== "object") return { ...NEUTRAL };
    const out = {};
    for (const k of ["mx", "my", "ax", "ay"])
      out[k] = finite(input[k]) ? Math.max(-1, Math.min(1, input[k])) : 0;
    for (const [x, y] of [
      ["mx", "my"],
      ["ax", "ay"],
    ]) {
      const n = Math.hypot(out[x], out[y]);
      if (n > 1) {
        out[x] /= n;
        out[y] /= n;
      }
    }
    out.fire = input.fire === true;
    out.burst = input.burst === true;
    return out;
  }

  class Net {
    constructor(options = {}) {
      this.options = options;
      this.hub = options.hub || root.AIHub;
      this.active = false;
      this.isHost = false;
      this.server = false;
      this.started = false;
      this.startReceived = false;
      this.ended = false;
      this.finished = false;
      this.info = null;
      this.world = null;
      this.runId = null;
      this.remainingIds = [];
      this._off = [];
      this._commands = new Map();
      this._burstFloors = new Map();
      this._sequenceFloors = new Map();
      this._sendTimes = [];
      this._seq = 0;
      this._snapshotSeq = 0;
      this._lastStateSeq = -1;
      this._lastStateTick = -1;
      this._localBurst = 0;
      this._localWasBurst = false;
      this._lastInputSend = -Infinity;
      this._lastSnapshotSend = -Infinity;
      this._pendingPackets = [];
      this._parts = null;
      this._accumulator = 0;
      this._finishAt = null;
      this._previousView = null;
      this._currentView = null;
      this._snapshotArrival = 0;
      this.metrics = {
        sent: 0,
        received: 0,
        bytes: 0,
        maxBytes: 0,
        dropped: 0,
        rejected: 0,
        snapshots: 0,
        finishCalls: 0,
        peakPerSecond: 0,
      };
    }

    async connect() {
      if (!this.hub || typeof this.hub.connect !== "function") return null;
      const info = await this.hub.connect({ mode: "shared-world", seats: [1, 2] });
      if (!info) return null;
      this.info = info;
      this.active = true;
      this.isHost = info.isHost === true;
      this.server = info.server === true;
      this.runId = `fwr:${info.round}:${info.seed >>> 0}`;
      this.remainingIds = (info.players || []).map((p) => p.id);
      if (!this.remainingIds.length || this.remainingIds.length > 2)
        throw new Error("Freedom Warp Rescue requires one or two Hub teammates");
      this.world = this.options.createWorld
        ? this.options.createWorld(info.seed >>> 0, {
            mode: "operation",
            online: true,
            runId: this.runId,
          })
        : new F.World(info.seed >>> 0, { mode: "operation", online: true, runId: this.runId });
      this.world.runId = this.runId;
      this.world.setSeats(this.remainingIds.slice());
      this._off.push(
        this.hub.on("start", () => {
          this.startReceived = true;
          this._clearCommands();
        }),
      );
      this._off.push(this.hub.on("message", (data, from) => this._receive(data, from)));
      this._off.push(this.hub.on("leave", (event) => this._leave(event)));
      this._off.push(this.hub.on("time-up", (event) => this._timeUp(event)));
      this._off.push(this.hub.on("end", (event) => this._end(event)));
      this.options.onWorld?.(this.world);
      this.options.onReady?.(info);
      // No title, local save, audio unlock, or user gesture gates readiness.
      this.hub.ready();
      return info;
    }

    _now() {
      const time = this.hub?.time?.();
      return finite(time) ? time / 1000 : -Infinity;
    }

    _clearCommands() {
      for (const [id, entry] of this._commands) {
        this._burstFloors.set(id, Math.max(this._burstFloors.get(id) || 0, entry.burstCount || 0));
        this._sequenceFloors.set(id, Math.max(this._sequenceFloors.get(id) || 0, entry.seq || 0));
      }
      if (this.info && !this.server) this._burstFloors.set(this.info.me, this._localBurst);
      this._commands.clear();
      this._localWasBurst = false;
      this.options.onClearInput?.();
    }

    _captureLocal(intent, now) {
      if (this.server || !this.remainingIds.includes(this.info.me)) return;
      const local = cleanIntent(intent);
      if (local.burst && !this._localWasBurst) this._localBurst++;
      this._localWasBurst = local.burst;
      if (this.isHost) {
        const old = this._commands.get(this.info.me);
        this._commands.set(this.info.me, {
          intent: local,
          seen: now,
          seq: this._seq,
          burstCount: this._localBurst,
          deliveredBurst: old?.deliveredBurst || this._burstFloors.get(this.info.me) || 0,
        });
      } else if (now - this._lastInputSend >= 1 / 12 - 1e-6) {
        const data = {
          g: TAG,
          v: 1,
          t: "i",
          r: this.runId,
          q: ++this._seq,
          k: Math.max(0, this.world.tick || 0),
          a: [local.mx, local.my, local.ax, local.ay, local.fire ? 1 : 0, this._localBurst],
        };
        if (this._send(data, { to: this.info.host, reliable: false }, now))
          this._lastInputSend = now;
      }
    }

    _seatIntents(now) {
      const intents = {};
      for (const id of this.remainingIds) {
        const entry = this._commands.get(id);
        if (!entry || now - entry.seen > 0.5) {
          intents[id] = { ...NEUTRAL };
          continue;
        }
        const pulse = entry.burstCount > entry.deliveredBurst;
        if (pulse) {
          entry.deliveredBurst = entry.burstCount;
          this._burstFloors.set(id, entry.burstCount);
        }
        intents[id] = { ...entry.intent, burst: pulse };
      }
      return intents;
    }

    update(dt, localIntent = NEUTRAL) {
      if (!this.active || this.ended) return;
      const now = this._now();
      if (!this.started) {
        if (!this.startReceived || now < 0 || !finite(now)) return;
        this.started = true;
        this._accumulator = 0;
        this._lastInputSend = -Infinity;
        this._lastSnapshotSend = -Infinity;
        this.options.onStart?.();
      }
      this._captureLocal(localIntent, now);
      if (this.isHost) {
        if (!this.world.outcome) {
          this._accumulator += Math.max(0, Math.min(finite(dt) ? dt : 0, 0.25));
          while (this._accumulator >= STEP - 1e-10 && !this.world.outcome) {
            this.world.step(this._seatIntents(now), STEP);
            this._accumulator -= STEP;
          }
        }
        if (this.world.outcome && this._finishAt === null) this._queueFinish(now, 0.35);
        if (now - this._lastSnapshotSend >= 0.1 - 1e-6) {
          if (!this._pendingPackets.length) this._makeSnapshot();
          if (
            this._pendingPackets.length &&
            this._send(this._pendingPackets[0], { reliable: true }, now)
          ) {
            this._pendingPackets.shift();
            this._lastSnapshotSend = now;
          }
        }
        if (this._finishAt !== null && now >= this._finishAt) this._finish();
      }
    }

    _send(data, options, now = this._now()) {
      if (this.ended || !finite(now) || now < 0) return false;
      const bytes = byteSize(data);
      if (bytes > MAX_BYTES) {
        this.metrics.dropped++;
        return false;
      }
      this._sendTimes = this._sendTimes.filter((time) => now - time < 1 - 1e-6);
      if (this._sendTimes.length >= 18) {
        this.metrics.dropped++;
        return false;
      }
      if (this.hub.send(data, options) === false) {
        this.metrics.dropped++;
        return false;
      }
      this._sendTimes.push(now);
      this.metrics.sent++;
      this.metrics.bytes += bytes;
      this.metrics.maxBytes = Math.max(this.metrics.maxBytes, bytes);
      this.metrics.peakPerSecond = Math.max(this.metrics.peakPerSecond, this._sendTimes.length);
      return true;
    }

    _makeSnapshot() {
      const state = this.world.snapshot();
      state.runId = this.runId;
      const encoded = encodeState(state);
      const total = Math.max(1, Math.ceil(encoded.length / CHUNK_CHARS));
      const q = ++this._snapshotSeq;
      for (let part = 0; part < total; part++)
        this._pendingPackets.push({
          g: TAG,
          v: 1,
          t: "s",
          r: this.runId,
          q,
          k: Math.max(0, this.world.tick || 0),
          p: part,
          n: total,
          d: encoded.slice(part * CHUNK_CHARS, (part + 1) * CHUNK_CHARS),
        });
    }

    _receive(data, from) {
      if (!this.active || this.ended) return;
      if (
        !data ||
        data.g !== TAG ||
        data.v !== 1 ||
        data.r !== this.runId ||
        !integer(data.q) ||
        !integer(data.k)
      ) {
        this.metrics.rejected++;
        return;
      }
      this.metrics.received++;
      if (this.isHost && data.t === "i") return this._receiveInput(data, from);
      if (!this.isHost && data.t === "s" && from === this.info.host)
        return this._receiveState(data);
      this.metrics.rejected++;
    }

    _receiveInput(data, from) {
      if (
        !this.remainingIds.includes(from) ||
        from === this.info.me ||
        !this.started ||
        this.world.outcome
      ) {
        this.metrics.rejected++;
        return;
      }
      const old = this._commands.get(from);
      const lastSequence = Math.max(old?.seq || 0, this._sequenceFloors.get(from) || 0);
      const a = data.a;
      if (
        data.q <= lastSequence ||
        !Array.isArray(a) ||
        a.length !== 6 ||
        !a.slice(0, 4).every((v) => finite(v) && Math.abs(v) <= 1.001) ||
        (a[4] !== 0 && a[4] !== 1) ||
        !integer(a[5]) ||
        a[5] > 1_000_000 ||
        a[5] < Math.max(old?.burstCount || 0, this._burstFloors.get(from) || 0) ||
        data.k > (this.world.tick || 0) + 240 ||
        data.k < (this.world.tick || 0) - 720
      ) {
        this.metrics.rejected++;
        return;
      }
      const intent = cleanIntent({ mx: a[0], my: a[1], ax: a[2], ay: a[3], fire: a[4] === 1 });
      this._commands.set(from, {
        intent,
        seen: this._now(),
        seq: data.q,
        burstCount: a[5],
        deliveredBurst: old?.deliveredBurst || this._burstFloors.get(from) || 0,
      });
      this._sequenceFloors.set(from, data.q);
    }

    _receiveState(data) {
      if (
        data.q <= this._lastStateSeq ||
        data.k < this._lastStateTick ||
        !integer(data.p) ||
        !integer(data.n) ||
        data.n < 1 ||
        data.n > 64 ||
        data.p >= data.n ||
        typeof data.d !== "string" ||
        data.d.length > CHUNK_CHARS
      ) {
        this.metrics.rejected++;
        return;
      }
      if (!this._parts || this._parts.q !== data.q)
        this._parts = { q: data.q, tick: data.k, n: data.n, parts: [] };
      if (this._parts.n !== data.n || this._parts.tick !== data.k) {
        this.metrics.rejected++;
        return;
      }
      this._parts.parts[data.p] = data.d;
      if (
        Array.from({ length: data.n }, (_, i) => this._parts.parts[i]).some(
          (p) => typeof p !== "string",
        )
      )
        return;
      try {
        const state = decodeState(this._parts.parts.join(""));
        if (
          !state ||
          state.runId !== this.runId ||
          !integer(state.tick) ||
          state.tick !== data.k ||
          !state.ship ||
          !finite(state.ship.x) ||
          !finite(state.ship.y) ||
          !Array.isArray(state.entities) ||
          state.entities.length > 2000
        )
          throw new Error("Invalid authoritative state");
        this._previousView = this._currentView;
        this._currentView = clone(state);
        this._snapshotArrival = this._now();
        this.world.loadSnapshot(state);
        this._lastStateSeq = data.q;
        this._lastStateTick = data.k;
        this.metrics.snapshots++;
        this._parts = null;
        this.options.onSnapshot?.(this.world);
      } catch (error) {
        this.metrics.rejected++;
        this.options.onError?.(error);
        this._parts = null;
      }
    }

    renderWorld() {
      if (this.isHost || !this._currentView || !this._previousView) return this.world;
      const current = this._currentView,
        previous = this._previousView;
      const interval = Math.max(0.05, ((current.tick || 0) - (previous.tick || 0)) * STEP);
      const t = Math.max(0, Math.min(1, (this._now() - this._snapshotArrival) / interval));
      const lerpObject = (a, b) => {
        const out = { ...b };
        if (a && b)
          for (const k of ["x", "y", "vx", "vy"])
            if (finite(a[k]) && finite(b[k])) out[k] = a[k] + (b[k] - a[k]) * t;
        return out;
      };
      const oldEntities = new Map((previous.entities || []).map((entity) => [entity.id, entity]));
      return Object.assign(Object.create(Object.getPrototypeOf(this.world)), this.world, {
        ship: lerpObject(previous.ship, current.ship),
        camera: lerpObject(previous.camera, current.camera),
        entities: (current.entities || []).map((entity) =>
          lerpObject(oldEntities.get(entity.id), entity),
        ),
      });
    }

    _leave({ id, reason }) {
      this.remainingIds = this.remainingIds.filter((seat) => seat !== id);
      this._clearCommands();
      this.world?.setSeats(this.remainingIds.slice());
      this.options.onRoster?.(this.remainingIds.slice(), { id, reason });
      // Host departure is voided by the Hub. There is no host migration.
      if (id === this.info.host) return;
      if (this.isHost && this.started && !this.finished) {
        this._pendingPackets.length = 0;
        this._makeSnapshot();
      }
    }

    _timeUp(event = {}) {
      if (!this.isHost || this.ended || this.finished) return;
      if (!this.world.outcome) {
        if (typeof this.world.resolveTimeUp === "function") this.world.resolveTimeUp();
        else if (typeof this.world.finish === "function") this.world.finish(false, "time-up");
        else
          this.world.outcome = {
            won: false,
            reason: "time-up",
            score: this.world.score || 0,
            rescued: this.world.rescued?.length || 0,
            lost: this.world.lost?.length || 0,
          };
      }
      const grace = finite(event.graceMs) ? Math.max(0, event.graceMs / 1000) : 1;
      this._queueFinish(this._now(), Math.min(0.35, grace * 0.4));
    }

    _queueFinish(now, delay) {
      if (this.finished || this.ended) return;
      this._clearCommands();
      this._pendingPackets.length = 0;
      this._makeSnapshot();
      // Reliable final state precedes the finish request. The small delay also
      // lets impaired-network clients display the last rescue and hull state.
      while (
        this._pendingPackets.length &&
        this._send(this._pendingPackets[0], { reliable: true }, now)
      )
        this._pendingPackets.shift();
      this._lastSnapshotSend = now;
      this._finishAt = Math.min(this._finishAt ?? Infinity, now + delay);
    }

    _finish() {
      if (this.finished || this.ended || !this.isHost) return;
      this.finished = true;
      this.metrics.finishCalls++;
      const ids = this.remainingIds.slice();
      const score = finite(this.world.score) ? this.world.score : 0;
      const rescued = Array.isArray(this.world.rescued)
        ? this.world.rescued.length
        : Number(this.world.outcome?.rescued) || 0;
      const lost = Array.isArray(this.world.lost)
        ? this.world.lost.length
        : Number(this.world.outcome?.lost) || 0;
      const scores = Object.fromEntries(ids.map((id) => [id, score]));
      const stats = Object.fromEntries(
        ids.map((id) => [id, { Rescued: rescued, Lost: lost, "Team score": score }]),
      );
      this.hub.finish({
        standings: ids.length ? [ids] : [],
        scores,
        won: this.world.outcome?.won === true,
        stats,
      });
    }

    _end(event = {}) {
      if (this.ended) return;
      this.ended = true;
      this.started = false;
      this._accumulator = 0;
      this._pendingPackets.length = 0;
      this._clearCommands();
      this.options.onEnd?.(event.reason || "unknown", event);
    }

    diagnostics() {
      return {
        active: this.active,
        isHost: this.isHost,
        server: this.server,
        started: this.started,
        ended: this.ended,
        finished: this.finished,
        runId: this.runId,
        round: this.info?.round ?? null,
        remainingIds: this.remainingIds.slice(),
        pilot: this.remainingIds[0] ?? null,
        navigator: this.remainingIds[1] ?? this.remainingIds[0] ?? null,
        ...this.metrics,
      };
    }

    dispose() {
      this._end({ reason: "disposed" });
      for (const off of this._off) off?.();
      this._off.length = 0;
    }
  }
  F.Net = Net;
  F.NetCodec = Object.freeze({
    encode: encodeState,
    decode: decodeState,
    byteSize,
    cleanIntent,
    neutral: NEUTRAL,
  });
})(typeof window === "undefined" ? globalThis : window);
