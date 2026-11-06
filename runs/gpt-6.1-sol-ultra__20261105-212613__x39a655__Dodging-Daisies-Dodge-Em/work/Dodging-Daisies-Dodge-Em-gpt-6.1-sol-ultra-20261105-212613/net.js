/* Dodging Daisies: AI Hub Protocol v1 plus direct WebRTC outside sessions. */
export function createNetwork(callbacks = {}) {
	const hub = globalThis.AIHub;
	const localPlayers = [
		{ id: 0, name: "Driver 1", color: "#f6bf3c" },
		{ id: 1, name: "Driver 2", color: "#5eb8b3" },
	];
	let kind = hub?.active ? "hub" : "none";
	let active = !!hub?.active;
	let connected = false;
	let isHost = true;
	let playerIndex = 0;
	let players = localPlayers.slice(0, 1);
	let server = false;
	let ended = false;
	let finished = false;
	let readyAsked = false;
	let readySent = false;
	let initialized = false;
	let peer = null;
	let channel = null;
	let broadcast = null;
	let started = false;
	let lastInputSent = -Infinity;
	let lastStateSent = -Infinity;
	let lastState = null;
	let lastError = "";
	let sent = 0;
	let received = 0;
	let signalGeneration = 0;
	const uid =
		globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
	const removers = [];
	const status = (s) => callbacks.onStatus?.(s);
	const now = () => performance.now();
	const api = {
		get kind() {
			return kind;
		},
		get active() {
			return active;
		},
		get connected() {
			return connected;
		},
		get isHost() {
			return isHost;
		},
		get playerIndex() {
			return playerIndex;
		},
		get players() {
			return players;
		},
		get server() {
			return server;
		},
		get ended() {
			return ended;
		},
		get roundTime() {
			return kind === "hub" ? hub.time() : Infinity;
		},
		get debug() {
			return {
				kind,
				active,
				connected,
				isHost,
				playerIndex,
				players,
				server,
				ended,
				readyAsked,
				readySent,
				started,
				sent,
				received,
				lastError,
			};
		},
		async init() {
			if (initialized)
				return active ? { players, isHost, me: playerIndex, server } : null;
			initialized = true;
			if (!active) return null;
			removers.push(
				hub.on("start", (event) => {
					if (ended) return;
					started = true;
					callbacks.onStart?.({
						players,
						hub: true,
						countdownMs: event.in ?? 3000,
						server,
						isHost,
						playerIndex,
					});
				}),
			);
			removers.push(
				hub.on("message", (data, from) => {
					if (ended || !data || data.game !== "dodging-daisies") return;
					received++;
					if (
						data.type === "input" &&
						isHost &&
						players.some((p) => p.id === from)
					)
						callbacks.onInput?.(data.input, from);
					else if (data.type === "state" && !isHost && from === hub.host)
						callbacks.onState?.(data.state);
				}),
			);
			removers.push(
				hub.on("leave", (event) => {
					players = players.filter((p) => p.id !== event.id);
					callbacks.onLeave?.(event);
				}),
			);
			removers.push(
				hub.on("time-up", (event) => {
					callbacks.onTimeUp?.(event);
					if (isHost && !finished)
						api.finish({ score: lastState?.score ?? 0, won: false });
				}),
			);
			removers.push(
				hub.on("end", (event) => {
					ended = true;
					connected = false;
					callbacks.onEnd?.(event);
					status("Round complete");
				}),
			);
			const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) {
				active = false;
				kind = "none";
				for (const remove of removers.splice(0)) remove();
				return null;
			}
			connected = true;
			isHost = info.isHost;
			playerIndex = info.me;
			players = info.players;
			server = !!info.server;
			status(
				server
					? "AI Hub · dedicated host"
					: `AI Hub · ${isHost ? "hosting" : "connected"}`,
			);
			if (readyAsked) api.ready();
			return info;
		},
		ready() {
			readyAsked = true;
			if (kind === "hub" && connected && !readySent) {
				readySent = true;
				hub.ready();
			}
		},
		sendInput(input) {
			if (ended || !connected || !started) return false;
			if (isHost) {
				callbacks.onInput?.(input, playerIndex);
				return true;
			}
			if (now() - lastInputSent < 80) return false;
			lastInputSent = now();
			return send(
				{ type: "input", input },
				kind === "hub" ? hub.host : undefined,
			);
		},
		sendState(state) {
			if (ended || !connected || !started || !isHost) return false;
			lastState = state;
			if (now() - lastStateSent < 85) return false;
			lastStateSent = now();
			return send({ type: "state", state });
		},
		finish({ score = 0, won = false, stats = {} } = {}) {
			if (kind !== "hub" || !isHost || finished || ended) return false;
			finished = true;
			const ids = players.map((p) => p.id);
			hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, score])),
				won: !!won,
				stats: Object.fromEntries(ids.map((id) => [id, stats])),
			});
			return true;
		},
		async host() {
			ensureStandalone();
			cleanupTransport();
			kind = "webrtc";
			active = true;
			isHost = true;
			playerIndex = 0;
			players = localPlayers.slice();
			status("Creating invitation…");
			createPeer();
			installChannel(
				peer.createDataChannel("dodging-daisies", { ordered: true }),
			);
			const offer = await peer.createOffer();
			await peer.setLocalDescription(offer);
			await iceGathered(peer);
			status("Send the invitation to your friend, then paste their reply.");
			return encodeSignal(peer.localDescription);
		},
		async acceptOffer(code) {
			ensureStandalone();
			const offer = decodeSignal(code, "offer");
			cleanupTransport();
			kind = "webrtc";
			active = true;
			isHost = false;
			playerIndex = 1;
			players = localPlayers.slice();
			status("Preparing reply…");
			createPeer();
			peer.ondatachannel = (e) => installChannel(e.channel);
			await peer.setRemoteDescription(offer);
			const answer = await peer.createAnswer();
			await peer.setLocalDescription(answer);
			await iceGathered(peer);
			status("Send this reply to the host. Keep this screen open.");
			return encodeSignal(peer.localDescription);
		},
		async acceptAnswer(code) {
			ensureStandalone();
			if (!peer || !isHost) throw new Error("Create an invitation first.");
			await peer.setRemoteDescription(decodeSignal(code, "answer"));
			status("Connecting the two cars…");
		},
		connectLocal(room, host = false) {
			ensureStandalone();
			if (!globalThis.BroadcastChannel)
				throw new Error("This browser does not support the same-device link.");
			cleanupTransport();
			kind = "local-link";
			active = true;
			isHost = !!host;
			playerIndex = host ? 0 : 1;
			players = localPlayers.slice();
			const key = String(room || "daisies")
				.trim()
				.slice(0, 48)
				.toLowerCase();
			broadcast = new BroadcastChannel(`dodging-daisies:${key}`);
			broadcast.onmessage = ({ data }) => {
				if (data?.uid === uid || data?.game !== "dodging-daisies") return;
				if (data.type === "join" && isHost) {
					send({ type: "welcome" });
					transportStarted();
				} else if (data.type === "welcome" && !isHost) transportStarted();
				else receive(data);
			};
			status(
				host
					? `Room “${key}” is waiting for another tab.`
					: `Joining room “${key}”…`,
			);
			if (!host) send({ type: "join" });
		},
		leave() {
			if (hub?.active) return false;
			if (connected) send({ type: "leave" });
			cleanupTransport();
			kind = "none";
			active = false;
			players = localPlayers.slice(0, 1);
			isHost = true;
			playerIndex = 0;
			status("Offline");
			return true;
		},
	};
	function ensureStandalone() {
		if (hub?.active) throw new Error("AI Hub manages this round’s network.");
	}
	function send(payload, to) {
		if (ended) return false;
		const packet = { game: "dodging-daisies", ...payload };
		try {
			if (kind === "hub") {
				const okay = hub.send(
					packet,
					to === undefined ? { reliable: true } : { to, reliable: true },
				);
				if (okay) sent++;
				return okay;
			}
			if (broadcast) {
				broadcast.postMessage({ ...packet, uid });
				sent++;
				return true;
			}
			if (
				channel?.readyState === "open" &&
				channel.bufferedAmount < 128 * 1024
			) {
				channel.send(JSON.stringify(packet));
				sent++;
				return true;
			}
		} catch (e) {
			lastError = e.message;
		}
		return false;
	}
	function receive(data) {
		if (ended || !data || data.game !== "dodging-daisies") return;
		received++;
		if (data.type === "input" && isHost) callbacks.onInput?.(data.input, 1);
		else if (data.type === "state" && !isHost) callbacks.onState?.(data.state);
		else if (data.type === "leave") {
			connected = false;
			started = false;
			status("The other driver disconnected.");
			callbacks.onLeave?.({ id: isHost ? 1 : 0, reason: "disconnected" });
		}
	}
	function transportStarted() {
		if (started) return;
		connected = true;
		started = true;
		ended = false;
		finished = false;
		status("Two drivers connected");
		callbacks.onStart?.({
			players,
			hub: false,
			countdownMs: 3000,
			server: false,
			isHost,
			playerIndex,
		});
	}
	function createPeer() {
		if (!globalThis.RTCPeerConnection)
			throw new Error("Direct online play needs a browser with WebRTC.");
		peer = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		const generation = signalGeneration;
		peer.onconnectionstatechange = () => {
			if (generation !== signalGeneration) return;
			if (peer.connectionState === "connected") status("Connected");
			if (
				["failed", "disconnected", "closed"].includes(peer.connectionState) &&
				connected
			) {
				connected = false;
				started = false;
				const reason =
					peer.connectionState === "failed"
						? "Direct connection failed. Try the same-device link, or play through AI Hub."
						: "The other driver disconnected.";
				status(reason);
				callbacks.onLeave?.({ id: isHost ? 1 : 0, reason: "disconnected" });
			}
		};
	}
	function installChannel(c) {
		channel = c;
		c.onopen = transportStarted;
		c.onmessage = ({ data }) => {
			try {
				receive(JSON.parse(data));
			} catch {
				/* Foreign packets do not enter the simulation. */
			}
		};
		c.onclose = () => {
			if (!connected) return;
			connected = false;
			started = false;
			callbacks.onLeave?.({ id: isHost ? 1 : 0, reason: "disconnected" });
			status("The other driver disconnected.");
		};
	}
	function cleanupTransport() {
		signalGeneration++;
		connected = false;
		started = false;
		ended = false;
		finished = false;
		lastInputSent = -Infinity;
		lastStateSent = -Infinity;
		if (broadcast) {
			broadcast.close();
			broadcast = null;
		}
		if (channel) {
			channel.onclose = null;
			channel.close();
			channel = null;
		}
		if (peer) {
			peer.onconnectionstatechange = null;
			peer.close();
			peer = null;
		}
	}
	function iceGathered(connection) {
		if (connection.iceGatheringState === "complete") return Promise.resolve();
		return new Promise((resolve) => {
			const timer = setTimeout(done, 7000);
			function done() {
				clearTimeout(timer);
				connection.removeEventListener("icegatheringstatechange", change);
				resolve();
			}
			function change() {
				if (connection.iceGatheringState === "complete") done();
			}
			connection.addEventListener("icegatheringstatechange", change);
		});
	}
	function encodeSignal(description) {
		return `DAISY1.${btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))}`;
	}
	function decodeSignal(code, expected) {
		try {
			const text = String(code).trim();
			if (!text.startsWith("DAISY1.")) throw new Error();
			const data = JSON.parse(atob(text.slice(7)));
			if (
				data.type !== expected ||
				typeof data.sdp !== "string" ||
				data.sdp.length > 60000
			)
				throw new Error();
			return data;
		} catch {
			throw new Error(
				`Paste a complete Dodging Daisies ${expected === "offer" ? "invitation" : "reply"}.`,
			);
		}
	}
	return api;
}
