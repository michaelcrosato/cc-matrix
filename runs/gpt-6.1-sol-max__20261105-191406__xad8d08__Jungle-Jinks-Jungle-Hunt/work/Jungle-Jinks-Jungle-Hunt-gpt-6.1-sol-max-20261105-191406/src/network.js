const encode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
export class PeerRace {
  constructor(onPacket, onStatus) {
    this.onPacket = onPacket;
    this.onStatus = onStatus;
    this.pc = null;
    this.channel = null;
    this.host = false;
    this.connected = false;
    this.received = 0;
    this.sent = 0;
  }
  create() {
    if (window.AIHub?.active) throw Error("Peer connections are unavailable during a Hub session.");
    this.close();
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc.oniceconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(this.pc?.iceConnectionState))
        this.onStatus("Connection lost. Your expedition can continue solo.");
    };
    this.pc.ondatachannel = (e) => this.attach(e.channel);
    return this.pc;
  }
  attach(channel) {
    this.channel = channel;
    channel.onopen = () => {
      this.connected = true;
      this.onStatus("Connected. The host can start the expedition.");
      this.send({ type: "hello", version: 1 });
    };
    channel.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        this.received++;
        this.onPacket(d);
      } catch {
        this.onStatus("An unreadable race packet was ignored.");
      }
    };
    channel.onclose = () => {
      this.connected = false;
      this.onStatus("Your rival disconnected. Keep exploring!");
    };
  }
  async gather() {
    if (this.pc.iceGatheringState === "complete") return;
    await new Promise((resolve) => {
      const timer = setTimeout(done, 4500);
      const pc = this.pc;
      function done() {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", change);
        resolve();
      }
      function change() {
        if (pc.iceGatheringState === "complete") done();
      }
      pc.addEventListener("icegatheringstatechange", change);
    });
  }
  async hostOffer() {
    const pc = this.create();
    this.host = true;
    this.attach(
      pc.createDataChannel("jungle-jinks", {
        ordered: true,
      }),
    );
    await pc.setLocalDescription(await pc.createOffer());
    await this.gather();
    return encode({ jinks: 1, type: "offer", sdp: pc.localDescription.sdp });
  }
  async joinOffer(code) {
    let offer;
    try {
      offer = decode(code);
    } catch {
      throw Error("That invitation is unreadable. Paste the complete invitation.");
    }
    if (offer.jinks !== 1 || offer.type !== "offer") throw Error("This box needs the host’s invitation.");
    const pc = this.create();
    this.host = false;
    await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await this.gather();
    return encode({ jinks: 1, type: "answer", sdp: pc.localDescription.sdp });
  }
  async acceptAnswer(code) {
    let a;
    try {
      a = decode(code);
    } catch {
      throw Error("That reply is unreadable. Paste the complete reply.");
    }
    if (a.jinks !== 1 || a.type !== "answer" || !this.pc || !this.host)
      throw Error("Create an invitation first, then paste your friend’s reply.");
    await this.pc.setRemoteDescription({ type: "answer", sdp: a.sdp });
  }
  send(data) {
    if (this.channel?.readyState !== "open") return false;
    if (this.channel.bufferedAmount > 64000) return false;
    this.channel.send(JSON.stringify(data));
    this.sent++;
    return true;
  }
  close() {
    this.channel?.close();
    this.pc?.close();
    this.pc = null;
    this.channel = null;
    this.connected = false;
  }
}
export class HubRace {
  constructor(game) {
    this.game = game;
    this.info = null;
    this.started = false;
    this.ended = false;
    this.resultSent = false;
  }
  async connect() {
    if (!window.AIHub.active) return false;
    const h = window.AIHub;
    h.on("start", () => {
      this.started = true;
      this.game.beginRun({ hub: true });
    });
    h.on("message", (d, from) => {
      if (!this.ended && d?.type === "ghost")
        this.game.receiveGhost(
          d,
          from,
          h.players.find((p) => p.id === from),
        );
    });
    h.on("leave", ({ id }) => this.game.removeGhost(id));
    h.on("time-up", () => this.result());
    h.on("end", () => {
      this.ended = true;
      this.game.hubEnd();
    });
    this.info = await h.connect({ mode: "ghost", seats: [1, 4] });
    if (!this.info) return false;
    this.game.hubInfo = this.info;
    this.game.showHubWait();
    h.ready();
    return true;
  }
  tick(runner) {
    if (!this.started || this.ended || !runner || window.AIHub.time() < 0) return;
    const p = runner.body.translation();
    window.AIHub.progress({
      score: runner.progressScore(),
      label: `${runner.stageIndex + 1}/4 · ${runner.score} treasure`,
    });
    window.AIHub.send(
      {
        type: "ghost",
        stage: runner.stageIndex,
        x: p.x,
        y: p.y,
        face: runner.face,
        anim: runner.avatar.anim,
        elapsed: runner.elapsed,
        score: runner.score,
        finished: runner.finished,
      },
      { reliable: false },
    );
  }
  result() {
    if (this.resultSent || this.ended) return;
    this.resultSent = true;
    const r = this.game.runners[0];
    const stats = {
      Relics: r?.relicCount || 0,
      Treasure: r?.score || 0,
      Rescues: r?.finished ? 1 : 0,
    };
    if (r?.finished)
      window.AIHub.result({
        time: Math.max(0, Math.round(window.AIHub.time())),
        stats,
      });
    else window.AIHub.result({ score: r?.progressScore() || 0, stats });
  }
}
