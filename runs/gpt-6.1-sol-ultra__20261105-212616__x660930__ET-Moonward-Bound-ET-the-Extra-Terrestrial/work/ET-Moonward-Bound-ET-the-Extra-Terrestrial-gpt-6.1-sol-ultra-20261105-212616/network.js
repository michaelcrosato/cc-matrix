/** Moonward Bound transport: AI Hub Session v1, standalone rooms and direct WebRTC. */
export function createNetwork(callbacks = {}) {
  const cb = (name, ...args) => callbacks[name]?.(...args);
  const hub = globalThis.AIHub;
  let mode = hub?.active ? "hub" : "solo";
  let role = "host";
  let room = "",
    me = 0,
    players = [{ id: 0, name: "You", color: "#f5b700" }];
  let channel = null,
    rtc = null,
    data = null,
    heartbeat = null;
  let ended = false,
    started = false,
    loaded = false,
    connected = false,
    roundFinished = false;
  let lastInput = 0,
    lastState = 0,
    hubInfo = null,
    status = "Playing solo";
  const off = [];
  function setStatus(message) {
    status = message;
    cb("onStatus", message, api.info);
  }
  function inform() {
    cb("onConnect", api.info);
  }
  function rawSend(payload, reliable = true) {
    if (ended) return false;
    if (mode === "hub")
      return !!hub?.send(payload, { to: role === "host" ? undefined : hub.host, reliable });
    if (channel) {
      channel.postMessage({ ...payload, from: me });
      return true;
    }
    if (data?.readyState === "open") {
      data.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }
  function receive(payload, from) {
    if (ended || !payload || typeof payload !== "object") return;
    if (
      payload.type === "moon-input" &&
      role === "host" &&
      from !== me &&
      players.some((p) => p.id === from)
    ) {
      cb("onInput", from, payload.input);
    }
    if (
      payload.type === "moon-action" &&
      role === "host" &&
      from !== me &&
      players.some((p) => p.id === from)
    )
      cb("onAction", from, payload.action);
    if (payload.type === "moon-state" && role !== "host" && (mode !== "hub" || from === hub.host))
      cb("onState", payload.state);
    if (payload.type === "moon-finish" && mode !== "hub") cb("onFinish", payload.won);
  }
  async function connect() {
    if (mode !== "hub") {
      inform();
      return null;
    }
    off.push(
      hub.on("start", (event) => {
        started = true;
        cb("onStart", event);
      }),
    );
    off.push(hub.on("message", (payload, from) => receive(payload, from)));
    off.push(
      hub.on("leave", (event) => {
        players = players.filter((p) => p.id !== event.id);
        cb("onPeerLeave", event.id);
        inform();
      }),
    );
    off.push(
      hub.on("time-up", (event) => {
        cb("onTimeUp", event);
        // A host always reports a valid cooperative result even if the game has not won.
        if (role === "host" && !roundFinished) api.finish(false);
      }),
    );
    off.push(
      hub.on("end", (event) => {
        ended = true;
        started = false;
        connected = false;
        cb("onEnd", event);
        setStatus("Round ended");
      }),
    );
    hubInfo = await hub.connect({ mode: "shared-world", seats: [1, 2] });
    if (!hubInfo) {
      mode = "solo";
      role = "host";
      inform();
      return null;
    }
    me = hubInfo.me;
    role = hubInfo.isHost ? "host" : "guest";
    players = [...hubInfo.players];
    connected = true;
    setStatus("AI Hub · cooperative adventure");
    inform();
    if (loaded) hub.ready();
    return hubInfo;
  }
  function stopStandalone() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    if (channel) {
      try {
        channel.postMessage({ type: "moon-leave", from: me });
      } catch {}
      channel.close();
    }
    if (data) data.close();
    if (rtc) rtc.close();
    channel = null;
    data = null;
    rtc = null;
    connected = false;
  }
  function openRoom(code, isHost) {
    stopStandalone();
    ended = false;
    roundFinished = false;
    mode = "room";
    role = isHost ? "host" : "guest";
    me = isHost ? 0 : 1;
    room = code;
    players = isHost ? [{ id: 0, name: "You", color: "#f5b700" }] : [];
    channel = new BroadcastChannel("moonward-bound-v1-" + code);
    channel.onmessage = (event) => {
      const packet = event.data;
      if (packet?.from === me) return;
      if (packet?.type === "moon-hello" && role === "host") {
        const fresh = !players.some((p) => p.id === 1);
        players = [
          { id: 0, name: "Friend one", color: "#f5b700" },
          { id: 1, name: "Friend two", color: "#6ad5e9" },
        ];
        connected = true;
        channel.postMessage({ type: "moon-welcome", from: 0, players });
        if (fresh) {
          setStatus("Friend connected · room " + code);
          inform();
          cb("onPeerJoin", 1);
        }
      } else if (packet?.type === "moon-welcome" && role === "guest") {
        players = packet.players;
        const fresh = !connected;
        connected = true;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        if (fresh) {
          setStatus("Connected · room " + code);
          inform();
          cb("onPeerJoin", 0);
        }
      } else if (packet?.type === "moon-leave") {
        connected = false;
        players = players.filter((p) => p.id !== packet.from);
        setStatus("Friend disconnected");
        cb("onPeerLeave", packet.from);
        inform();
      } else receive(packet, packet.from);
    };
    if (!isHost) {
      channel.postMessage({ type: "moon-hello", from: me });
      heartbeat = setInterval(() => channel?.postMessage({ type: "moon-hello", from: me }), 800);
    }
    setStatus(
      isHost ? "Room " + code + " · waiting for a friend" : "Looking for room " + code + "…",
    );
    inform();
    return code;
  }
  function attachData(dc) {
    data = dc;
    data.onopen = () => {
      connected = true;
      players = [
        { id: 0, name: "Friend one", color: "#f5b700" },
        { id: 1, name: "Friend two", color: "#6ad5e9" },
      ];
      setStatus("Direct co-op connected");
      inform();
      cb("onPeerJoin", me === 0 ? 1 : 0);
    };
    data.onmessage = (event) => {
      try {
        receive(JSON.parse(event.data), me === 0 ? 1 : 0);
      } catch {}
    };
    data.onclose = () => {
      connected = false;
      cb("onPeerLeave", me === 0 ? 1 : 0);
      setStatus("Friend disconnected");
    };
    data.onerror = () => setStatus("Direct connection interrupted; exchange a fresh invitation");
  }
  function createPeer(isHost) {
    if (hub?.active) throw new Error("AI Hub manages the connection during a session.");
    stopStandalone();
    ended = false;
    roundFinished = false;
    mode = "direct";
    role = isHost ? "host" : "guest";
    me = isHost ? 0 : 1;
    rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    rtc.ondatachannel = (event) => attachData(event.channel);
    rtc.onconnectionstatechange = () => {
      if (rtc?.connectionState === "failed")
        setStatus("Direct connection unavailable on this network. Try a same-browser room.");
    };
    if (isHost) attachData(rtc.createDataChannel("moonward-bound", { ordered: true }));
    inform();
    return rtc;
  }
  async function gather(peer) {
    if (peer.iceGatheringState !== "complete")
      await new Promise((resolve) => {
        const timer = setTimeout(done, 6500);
        function done() {
          clearTimeout(timer);
          peer.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
        function check() {
          if (peer.iceGatheringState === "complete") done();
        }
        peer.addEventListener("icegatheringstatechange", check);
      });
    return "MB1." + btoa(JSON.stringify(peer.localDescription));
  }
  function decode(code) {
    if (!String(code).trim().startsWith("MB1."))
      throw new Error("Paste the complete MB1 invitation code.");
    const description = JSON.parse(atob(String(code).trim().slice(4)));
    if (!["offer", "answer"].includes(description.type) || typeof description.sdp !== "string")
      throw new Error("That invitation is not valid.");
    return description;
  }
  const api = {
    connect,
    ready() {
      loaded = true;
      if (mode === "hub" && hubInfo && !ended) hub.ready();
    },
    host() {
      if (hub?.active) return null;
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return openRoom(
        "MB-" +
          Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
            .join("")
            .slice(0, 6)
            .toUpperCase(),
        true,
      );
    },
    join(code) {
      if (hub?.active) return false;
      const value = String(code).trim().toUpperCase();
      if (!/^MB-[A-F0-9]{6}$/.test(value))
        throw new Error(
          "Use a room code such as MB-12AB34. For remote play, use Direct invitation.",
        );
      return openRoom(value, false);
    },
    async createOffer() {
      const peer = createPeer(true);
      setStatus("Preparing a direct invitation…");
      await peer.setLocalDescription(await peer.createOffer());
      const code = await gather(peer);
      setStatus("Invitation ready · send it to a friend");
      return code;
    },
    async acceptOffer(code) {
      const offer = decode(code);
      if (offer.type !== "offer")
        throw new Error("This is an answer. The host should use Accept answer.");
      const peer = createPeer(false);
      setStatus("Preparing your answer…");
      await peer.setRemoteDescription(offer);
      await peer.setLocalDescription(await peer.createAnswer());
      const answer = await gather(peer);
      setStatus("Answer ready · send it to the host");
      return answer;
    },
    async acceptAnswer(code) {
      if (!rtc || role !== "host")
        throw new Error("Create an invitation before accepting an answer.");
      const answer = decode(code);
      if (answer.type !== "answer") throw new Error("Paste the friend’s answer code.");
      await rtc.setRemoteDescription(answer);
      setStatus("Connecting directly…");
      return true;
    },
    invitationType(code) {
      return decode(code).type;
    },
    sendAction(action) {
      if (ended || (mode === "hub" && (!started || hub.time() < 0)) || api.isServer) return false;
      if (role === "host") {
        cb("onAction", me, action);
        return true;
      }
      return rawSend({ type: "moon-action", action }, true);
    },
    sendInput(input) {
      if (ended || (mode === "hub" && (!started || hub.time() < 0)) || api.isServer) return false;
      if (role === "host") {
        cb("onInput", me, input);
        return true;
      }
      const edge = !!input?.interact || !!input?.pulse || Number.isInteger(input?.note);
      const now = performance.now();
      if (!edge && now - lastInput < 62) return false;
      lastInput = now;
      return rawSend({ type: "moon-input", input }, edge);
    },
    broadcast(state, force = false) {
      if (
        ended ||
        role !== "host" ||
        mode === "solo" ||
        (mode === "hub" && (!started || hub.time() < 0))
      )
        return false;
      const now = performance.now();
      if (!force && now - lastState < 75) return false;
      lastState = now;
      return rawSend({ type: "moon-state", state }, true);
    },
    finish(won = true, score = 0) {
      if (ended || roundFinished || role !== "host") return;
      roundFinished = true;
      if (mode === "hub")
        hub.finish({
          standings: [players.map((p) => p.id)],
          scores: Object.fromEntries(players.map((p) => [p.id, score])),
          won: !!won,
        });
      else rawSend({ type: "moon-finish", won: !!won });
    },
    close() {
      if (hub?.active) return;
      stopStandalone();
      mode = "solo";
      role = "host";
      room = "";
      me = 0;
      ended = false;
      roundFinished = false;
      players = [{ id: 0, name: "You", color: "#f5b700" }];
      setStatus("Playing solo");
      inform();
    },
    destroy() {
      stopStandalone();
      off.forEach((fn) => fn());
    },
    get info() {
      return {
        mode,
        role,
        room,
        me,
        players: [...players],
        connected,
        status,
        ended,
        isHost: role === "host",
        isServer: !!hubInfo?.server,
      };
    },
    get isHost() {
      return role === "host";
    },
    get isServer() {
      return !!hubInfo?.server;
    },
    get active() {
      return mode !== "solo";
    },
    get running() {
      return !ended && (mode !== "hub" || (started && hub.time() >= 0));
    },
    get hubActive() {
      return mode === "hub";
    },
    get me() {
      return me;
    },
    get players() {
      return [...players];
    },
    get status() {
      return status;
    },
    get time() {
      return mode === "hub" ? hub.time() : performance.now();
    },
  };
  return api;
}
