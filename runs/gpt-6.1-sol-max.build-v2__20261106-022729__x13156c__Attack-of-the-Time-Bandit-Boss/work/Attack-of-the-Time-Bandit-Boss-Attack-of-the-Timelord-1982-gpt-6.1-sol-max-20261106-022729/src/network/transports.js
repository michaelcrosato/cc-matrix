export class PacketMeter {
  constructor() {
    this.sent = 0;
    this.bytes = 0;
    this.maxBytes = 0;
    this.maxSecond = 0;
    this.bucket = [];
    this.rejected = 0;
  }
  record(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
    if (bytes > 16384) {
      this.rejected++;
      return false;
    }
    const now = performance.now();
    this.bucket = this.bucket.filter((t) => now - t < 1000);
    this.bucket.push(now);
    this.sent++;
    this.bytes += bytes;
    this.maxBytes = Math.max(bytes, this.maxBytes);
    this.maxSecond = Math.max(this.maxSecond, this.bucket.length);
    return true;
  }
  snapshot() {
    return {
      sent: this.sent,
      bytes: this.bytes,
      maxBytes: this.maxBytes,
      maxSecond: this.maxSecond,
      rejected: this.rejected,
    };
  }
}
export class HubTransport {
  constructor(hub, info, hooks) {
    this.hub = hub;
    this.info = info;
    this.hooks = hooks;
    this.kind = "hub";
    this.isHost = info.isHost;
    this.me = info.server ? null : info.me;
    this.server = !!info.server;
    this.roster = info.players.map((p) => ({ ...p, ready: true }));
    this.meter = new PacketMeter();
    this.ended = false;
    this.finished = false;
    this.off = [];
    this.off.push(
      hub.on("message", (data, from) => {
        if (this.ended) return;
        if (this.isHost) {
          if (data?.k === "a" && this.roster.some((p) => p.id === from))
            hooks.action(from, data);
        } else if (from === hub.host && data?.k === "w") hooks.world(data);
      }),
    );
    this.off.push(
      hub.on("leave", ({ id }) => {
        this.roster = this.roster.filter((p) => p.id !== id);
        hooks.leave(id);
      }),
    );
    this.off.push(
      hub.on("time-up", () => {
        if (this.isHost && !this.ended) hooks.timeUp();
      }),
    );
    this.off.push(
      hub.on("end", ({ reason }) => {
        if (this.ended) return;
        this.ended = true;
        hooks.end(reason);
      }),
    );
  }
  sendAction(data) {
    if (!this.ended && !this.isHost && this.meter.record(data))
      this.hub.send(data, { to: this.hub.host, reliable: false });
  }
  sendWorld(data) {
    if (!this.ended && this.isHost && this.meter.record(data))
      this.hub.send(data, { reliable: true });
  }
  finish(world) {
    if (this.finished || this.ended || !this.isHost) return;
    this.finished = true;
    const ids = this.roster.map((p) => p.id);
    this.hub.finish({
      standings: [ids],
      scores: Object.fromEntries(ids.map((id) => [id, world?.score || 0])),
      won: !!world?.outcome?.won,
      stats: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            Interceptions:
              world?.players.find((p) => p.id === id)?.intercepts || 0,
            Wave: Math.min(9, (world?.wave || 0) + 1),
          },
        ]),
      ),
    });
  }
  close() {
    for (const off of this.off) off();
    this.ended = true;
  }
}
export class RoomTransport {
  constructor(hooks) {
    this.hooks = hooks;
    this.kind = "peer";
    this.me = null;
    this.isHost = false;
    this.server = false;
    this.peer = null;
    this.links = new Map();
    this.roster = [];
    this.code = "";
    this.running = false;
    this.closed = false;
    this.run = 0;
    this.meter = new PacketMeter();
    this.timers = new Set();
    this.lastInput = new Map();
  }
  timer(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }
  cancelTimer(id) {
    clearTimeout(id);
    this.timers.delete(id);
  }
  async load() {
    if (globalThis.AIHub?.active)
      throw new Error(
        "Independent transport is unavailable during a Hub round.",
      );
    if (!globalThis.Peer) {
      await new Promise((resolve, reject) => {
        const blob = new Blob([PEER_SOURCE], { type: "text/javascript" }),
          url = URL.createObjectURL(blob),
          script = document.createElement("script");
        script.src = url;
        script.onload = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        script.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("The bundled online client could not load."));
        };
        document.head.append(script);
      });
    }
  }
  status(text) {
    if (!this.closed) this.hooks.status(text);
  }
  async create() {
    this.isHost = true;
    this.me = 0;
    this.code = this.randomCode();
    this.roster = [{ id: 0, name: "PILOT 1", ready: true }];
    await this.openPeer("TBB-" + this.code);
    if (this.closed) return;
    this.status("ROOM OPEN · Share the code with up to three pilots.");
    this.hooks.roster();
  }
  randomCode() {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(
      a,
      (v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
    ).join("");
  }
  async openPeer(id) {
    await this.load();
    if (this.closed) throw new Error("Connection cancelled.");
    await new Promise((resolve, reject) => {
      const peer = (this.peer = new globalThis.Peer(id, { debug: 0 }));
      let opened = false;
      const timeout = this.timer(() => {
        reject(
          new Error(
            "Signaling timed out. Check your connection, retry, or play solo.",
          ),
        );
        peer.destroy();
      }, 18000);
      peer.on("open", () => {
        opened = true;
        this.cancelTimer(timeout);
        resolve();
      });
      peer.on("error", (err) => {
        this.cancelTimer(timeout);
        const message =
          err.type === "peer-unavailable"
            ? "No room with that code. Check the code and try again."
            : err.type === "unavailable-id"
              ? "That room code is busy. Create a new room."
              : "Online link failed: " +
                String(err.type || err.message) +
                ". Retry or return to solo.";
        this.status(message);
        if (!opened) reject(new Error(message));
      });
      peer.on("disconnected", () => {
        if (!this.closed)
          this.status(
            "Signaling disconnected. Existing links may continue. Leave and retry if needed.",
          );
      });
      peer.on("connection", (conn) => this.incoming(conn));
    });
  }
  async join(code) {
    this.code = code.toUpperCase().replace(/[^A-Z2-9]/g, "");
    if (this.code.length !== 8)
      throw new Error("Enter the eight-character room code.");
    this.isHost = false;
    await this.openPeer(undefined);
    if (this.closed) return;
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect("TBB-" + this.code, {
        reliable: true,
        serialization: "json",
        metadata: { game: "time-bandit-boss", v: 1 },
      });
      this.hostLink = conn;
      const timeout = this.timer(() => {
        conn.close();
        reject(
          new Error(
            "The data link timed out. A firewall or NAT may block this room. Retry or play solo.",
          ),
        );
      }, 18000);
      conn.on("open", () => conn.send({ k: "hello", v: 1 }));
      conn.on("data", (data) => {
        if (this.closed) return;
        if (
          data?.k === "welcome" &&
          Number.isInteger(data.id) &&
          Array.isArray(data.roster)
        ) {
          this.cancelTimer(timeout);
          this.me = data.id;
          this.roster = data.roster;
          this.status("CONNECTED · Ready when you are.");
          this.hooks.roster();
          resolve();
        } else if (data?.k === "reject") {
          this.cancelTimer(timeout);
          conn.close();
          reject(new Error(data.reason));
        } else this.receiveHost(data);
      });
      conn.on("close", () => {
        if (!this.closed)
          this.hooks.end("The host left the room. Your run has ended.");
      });
      conn.on("error", () => {
        this.cancelTimer(timeout);
        reject(new Error("The data link failed. Retry or play solo."));
      });
    });
  }
  incoming(conn) {
    if (!this.isHost || this.closed) {
      conn.close();
      return;
    }
    let seat = null,
      handshake = false;
    const timeout = this.timer(() => {
      if (!handshake) conn.close();
    }, 8000);
    conn.on("data", (data) => {
      if (this.closed || !data || JSON.stringify(data).length > 16384) return;
      if (!handshake) {
        if (data.k !== "hello" || data.v !== 1) {
          conn.close();
          return;
        }
        if (this.running || this.roster.length >= 4) {
          conn.send({
            k: "reject",
            reason: this.running
              ? "This run is underway. Join when the host returns to the room."
              : "This room already has four pilots.",
          });
          this.timer(() => conn.close(), 300);
          return;
        }
        seat = [1, 2, 3].find((id) => !this.roster.some((p) => p.id === id));
        if (seat === undefined) {
          conn.close();
          return;
        }
        handshake = true;
        this.cancelTimer(timeout);
        this.links.set(seat, conn);
        this.roster.push({
          id: seat,
          name: "PILOT " + (seat + 1),
          ready: false,
        });
        conn.send({ k: "welcome", id: seat, roster: this.roster });
        this.broadcast({ k: "roster", roster: this.roster });
        this.hooks.roster();
      } else if (
        data.k === "ready" &&
        !this.running &&
        typeof data.value === "boolean"
      ) {
        this.roster.find((p) => p.id === seat).ready = data.value;
        this.broadcast({ k: "roster", roster: this.roster });
        this.hooks.roster();
      } else if (data.k === "a" && this.running) {
        const now = performance.now(),
          last = this.lastInput.get(seat) || [];
        const recent = last.filter((t) => now - t < 1000);
        if (recent.length >= 20) return;
        recent.push(now);
        this.lastInput.set(seat, recent);
        this.hooks.action(seat, data);
      }
    });
    conn.on("close", () => {
      this.cancelTimer(timeout);
      if (seat !== null && this.links.get(seat) === conn) {
        this.links.delete(seat);
        this.roster = this.roster.filter((p) => p.id !== seat);
        this.hooks.leave(seat);
        this.broadcast({ k: "roster", roster: this.roster });
        this.hooks.roster();
      }
    });
    conn.on("error", () => conn.close());
  }
  receiveHost(data) {
    if (!data || this.closed) return;
    if (data.k === "roster" && Array.isArray(data.roster)) {
      this.roster = data.roster;
      this.hooks.roster();
    } else if (
      data.k === "begin" &&
      Number.isInteger(data.run) &&
      data.run > this.run
    ) {
      this.run = data.run;
      this.running = true;
      this.roster = data.roster;
      this.hooks.begin(data.seed);
    } else if (data.k === "w" && this.running) this.hooks.world(data);
    else if (data.k === "lobby") {
      this.running = false;
      this.roster = data.roster;
      this.hooks.lobby();
    }
  }
  broadcast(data) {
    if (this.closed || !this.meter.record(data)) return;
    for (const conn of this.links.values()) if (conn.open) conn.send(data);
  }
  sendWorld(data) {
    if (this.isHost && this.running) this.broadcast(data);
  }
  sendAction(data) {
    if (
      !this.isHost &&
      !this.closed &&
      this.hostLink?.open &&
      this.meter.record(data)
    )
      this.hostLink.send(data);
  }
  ready() {
    const p = this.roster.find((p) => p.id === this.me);
    if (this.isHost || !p) return;
    this.hostLink?.send({ k: "ready", value: !p.ready });
  }
  start(seed) {
    if (
      !this.isHost ||
      this.closed ||
      this.running ||
      !this.roster.every((p) => p.ready)
    )
      return false;
    this.running = true;
    this.run++;
    this.broadcast({ k: "begin", run: this.run, seed, roster: this.roster });
    this.hooks.begin(seed);
    return true;
  }
  lobby() {
    if (!this.isHost) return;
    this.running = false;
    for (const p of this.roster) p.ready = p.id === 0;
    this.broadcast({ k: "lobby", roster: this.roster });
    this.hooks.lobby();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    for (const conn of this.links.values()) conn.close();
    this.links.clear();
    this.hostLink?.close();
    this.peer?.destroy();
  }
}
