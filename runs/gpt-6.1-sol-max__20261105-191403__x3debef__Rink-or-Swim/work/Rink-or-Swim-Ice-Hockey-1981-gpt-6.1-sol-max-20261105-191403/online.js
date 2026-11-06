import Peer from "peerjs";
export class Online {
  constructor(onData, onStatus) {
    this.onData = onData;
    this.onStatus = onStatus;
    this.kind = "none";
    this.host = false;
    this.connected = false;
    this.remote = {};
    this.conn = null;
    this.peer = null;
    this.channel = null;
    this.code = "";
    this.stamp = 0;
    window.addEventListener("pagehide", () => this.close());
  }
  async open(host, code = "") {
    this.close();
    this.kind = "standalone";
    this.host = host;
    this.code = host ? this.makeCode() : code.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(this.code)) throw new Error("Enter the six-letter room code.");
    this.onStatus("Connecting to the rink…");
    // A same-origin channel allows two local windows to use the same room without a broker.
    try {
      this.channel = new BroadcastChannel(`rink-or-swim-${this.code}`);
      this.channel.onmessage = (e) => {
        this.lastHeard = performance.now();
        if (e.data.kind === "join" && this.host && !this.connected) {
          this.channel.postMessage({ kind: "welcome" });
          this.accept("local");
        } else if (e.data.kind === "welcome" && !this.host) this.accept("local");
        else if (e.data.kind === "packet" && this.transport === "local") this.onData(e.data.data);
        else if (e.data.kind === "bye") {
          this.connected = false;
          this.onStatus("Your opponent left the rink.");
          this.onData({ t: "disconnect" });
        }
      };
    } catch {
      this.channel = null;
    }
    if (!host) {
      this.channel?.postMessage({ kind: "join" });
      this.joinTimer = setInterval(() => {
        if (!this.connected) this.channel?.postMessage({ kind: "join" });
      }, 500);
    }
    try {
      const id = host ? `rinkorswim-${this.code}` : undefined;
      this.peer = new Peer(id, {
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
          ],
        },
      });
      this.peer.on("open", () => {
        if (this.connected) return;
        if (host) this.onStatus("Room open. Share the code with a friend.");
        else
          this.attach(
            this.peer.connect(`rinkorswim-${this.code}`, { reliable: true, serialization: "json" }),
          );
      });
      this.peer.on("connection", (c) => {
        if (host && !this.connected) this.attach(c);
        else c.close();
      });
      this.peer.on("error", (e) => {
        if (!this.connected)
          this.onStatus(
            e.type === "peer-unavailable"
              ? "No rink found. Check the code and try again."
              : "Relay unavailable. Same-browser rooms still work; try again for remote play.",
          );
      });
    } catch (e) {
      this.onStatus(`Relay unavailable: ${e.message}`);
    }
    return this.code;
  }
  makeCode() {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
      data = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(data, (x) => a[x % a.length]).join("");
  }
  attach(c) {
    this.conn = c;
    c.on("open", () => {
      if (this.transport === "local") {
        c.close();
        return;
      }
      this.accept("webrtc");
    });
    c.on("data", (d) => {
      if (this.transport === "webrtc") this.onData(d);
    });
    c.on("close", () => {
      if (this.transport === "webrtc" && this.connected) {
        this.connected = false;
        this.onStatus("Opponent disconnected.");
        this.onData({ t: "disconnect" });
      }
    });
    c.on("error", () => this.onStatus("Connection interrupted. Return to the lobby to reconnect."));
  }
  accept(transport) {
    if (this.connected) return;
    this.transport = transport;
    this.connected = true;
    this.lastHeard = performance.now();
    clearInterval(this.joinTimer);
    this.heartbeat = setInterval(() => {
      if (this.transport !== "local") return;
      if (performance.now() - this.lastHeard > 2600) {
        this.connected = false;
        clearInterval(this.heartbeat);
        this.onData({ t: "disconnect" });
        return;
      }
      this.channel?.postMessage({ kind: "ping" });
    }, 500);
    this.onStatus("Opponent connected. Let’s make waves.");
    this.onData({ t: "connected", host: this.host, transport });
  }
  send(data) {
    if (!this.connected) return;
    if (this.transport === "local") this.channel?.postMessage({ kind: "packet", data });
    else if (this.conn?.open) this.conn.send(data);
  }
  close() {
    clearInterval(this.joinTimer);
    clearInterval(this.heartbeat);
    if (this.channel) {
      this.channel.postMessage({ kind: "bye" });
      this.channel.close();
    }
    this.channel = null;
    this.connected = false;
    this.transport = null;
    this.conn?.close();
    this.conn = null;
    this.peer?.destroy();
    this.peer = null;
    this.kind = "none";
  }
}
