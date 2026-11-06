/* Chopper Palooza networking: AI Hub Session Protocol v1 + standalone WebRTC. */
let peerLibrary;
const loadPeer = () => {
	if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
	if (peerLibrary) return peerLibrary;
	peerLibrary = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		const timeout = setTimeout(
			() => reject(new Error("Internet signaling timed out")),
			10000,
		);
		script.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
		script.onload = () => {
			clearTimeout(timeout);
			resolve(globalThis.Peer);
		};
		script.onerror = () => {
			clearTimeout(timeout);
			reject(new Error("Internet signaling unavailable"));
		};
		document.head.appendChild(script);
	});
	return peerLibrary;
};

export function createOnline(callbacks = {}) {
	const call = (name, ...args) => callbacks[name]?.(...args);
	const randomID = () =>
		Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) =>
			n.toString(16).padStart(2, "0"),
		).join("");
	const client = randomID();
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let role = "solo",
		room = "",
		connected = false,
		hub = false,
		server = false;
	let info = null,
		started = false,
		ended = false,
		reported = false;
	let channel = null,
		peer = null,
		connection = null,
		timer = null;
	let generation = 0,
		seq = 0,
		lastState = null,
		remoteClient = "",
		lastRemote = 0;
	let input = { x: 0, y: 0, fire: false, flare: false, rescue: false };
	let stateClock = 0,
		inputClock = 0,
		lastSeq = new Map();
	let pendingFlare = false,
		pendingRescue = false;
	let players = [];
	const status = (text) => call("onStatus", text);
	const cleanInput = (value) => ({
		x: Math.max(-1, Math.min(1, Number(value?.x) || 0)),
		y: Math.max(-1, Math.min(1, Number(value?.y) || 0)),
		fire: !!value?.fire,
		flare: !!value?.flare,
		rescue: !!value?.rescue,
		boost: !!value?.boost,
		aimX: Number.isFinite(value?.aimX) ? value.aimX : null,
		aimY: Number.isFinite(value?.aimY) ? value.aimY : null,
	});
	const send = (kind, data = {}) => {
		if (ended) return;
		const packet = { v: 1, kind, room, client, seq: ++seq, ...data };
		if (hub) {
			if (kind === "state") globalThis.AIHub.send(packet);
			else if (kind === "input")
				globalThis.AIHub.send(packet, { to: info.host });
			return;
		}
		if (channel) channel.postMessage(packet);
		if (connection?.open) connection.send(packet);
	};
	const begin = () => {
		if (started) return;
		started = true;
		call("onStart");
	};
	const disconnectRemote = (reason) => {
		if (!connected) return;
		connected = false;
		remoteClient = "";
		call("onInput", cleanInput(null), 1);
		call("onDisconnect", reason, 1);
		status(reason);
	};
	const receive = (packet, from = null) => {
		if (ended || !packet || packet.v !== 1 || (!hub && packet.room !== room))
			return;
		if (packet.client === client) return;
		if (packet.target && packet.target !== client) return;
		if (packet.seq <= (lastSeq.get(packet.client) || -1)) return;
		lastSeq.set(packet.client, packet.seq);
		if (hub) {
			if (role === "host" && packet.kind === "input") {
				const seat = info.players.findIndex((player) => player.id === from);
				if (seat >= 0) call("onInput", cleanInput(packet.input), seat);
			} else if (
				role === "guest" &&
				packet.kind === "state" &&
				from === info.host
			) {
				lastState = packet.state;
				call("onState", packet.state);
			}
			return;
		}
		if (role === "host" && packet.kind === "hello") {
			if (remoteClient && remoteClient !== packet.client) {
				send("full", { target: packet.client });
				return;
			}
			remoteClient = packet.client;
			lastRemote = performance.now();
			const first = !connected;
			connected = true;
			send("welcome", { target: remoteClient, seat: 1 });
			if (first) {
				status(`WINGMATE CONNECTED · ${room}`);
				begin();
			}
		} else if (role === "guest" && packet.kind === "welcome") {
			const first = !connected;
			connected = true;
			lastRemote = performance.now();
			if (first) {
				status(`FORMATION LINKED · ${room}`);
				begin();
			}
		} else if (
			role === "host" &&
			packet.kind === "input" &&
			packet.client === remoteClient
		) {
			lastRemote = performance.now();
			call("onInput", cleanInput(packet.input), 1);
		} else if (role === "guest" && packet.kind === "state") {
			lastRemote = performance.now();
			lastState = packet.state;
			call("onState", packet.state);
		} else if (packet.kind === "bye") {
			disconnectRemote("WINGMATE LEFT · continue solo or reconnect");
		} else if (packet.kind === "full") {
			status("THIS FLIGHT IS FULL · two pilots maximum");
		}
	};
	const setupLocal = () => {
		try {
			channel = new BroadcastChannel(`chopper-palooza-v1-${room}`);
			channel.onmessage = (event) => receive(event.data);
		} catch (_) {
			channel = null;
		}
		timer = setInterval(() => {
			if (role === "guest") send("hello");
			if (connected && performance.now() - lastRemote > 8000)
				disconnectRemote("LINK LOST · reconnect with the room code");
		}, 1000);
		if (role === "guest") send("hello");
	};
	const setupPeer = async (token) => {
		try {
			const Peer = await loadPeer();
			if (token !== generation || hub) return;
			const id = role === "host" ? `chopper-palooza-v1-${room}` : undefined;
			peer = new Peer(id, { debug: 0 });
			const wire = (conn) => {
				connection = conn;
				conn.on("open", () => {
					if (role === "guest") send("hello");
				});
				conn.on("data", (packet) => receive(packet));
				conn.on("error", () => {
					if (!channel) status("FORMATION LINK ERROR · retry the room");
				});
				conn.on("close", () => {
					if (!channel) disconnectRemote("WINGMATE DISCONNECTED");
				});
			};
			peer.on("open", () => {
				if (token !== generation) return;
				if (role === "guest")
					wire(peer.connect(`chopper-palooza-v1-${room}`, { reliable: true }));
				else {
					status(
						connected
							? `WINGMATE CONNECTED · ${room}`
							: `ROOM ${room} · awaiting wingmate`,
					);
					peer.on("connection", (conn) => {
						if (connection?.open) {
							conn.close();
							return;
						}
						wire(conn);
					});
				}
			});
			peer.on("error", (error) => {
				if (token !== generation || connected) return;
				const reason =
					error?.type === "peer-unavailable"
						? "Room not found. Check the code and retry."
						: "Internet relay unavailable; same-device link remains ready.";
				status(reason);
			});
		} catch (error) {
			if (token === generation && !connected)
				status(`${error.message}; same-device link ready · ${room}`);
		}
	};
	const leave = () => {
		if (hub) return;
		send("bye");
		generation++;
		if (timer) clearInterval(timer);
		timer = null;
		channel?.close();
		connection?.close();
		peer?.destroy();
		channel = connection = peer = null;
		role = "solo";
		room = "";
		connected = false;
		started = false;
		ended = false;
		remoteClient = "";
		lastSeq = new Map();
		lastState = null;
		stateClock = inputClock = 0;
		pendingFlare = pendingRescue = false;
	};
	const finish = (scoreOrObject = 0, won = false, stats = {}) => {
		if (!hub || role !== "host" || reported || ended) return;
		const result =
			typeof scoreOrObject === "object"
				? scoreOrObject
				: { score: scoreOrObject, won, stats };
		const score = Number(result.score) || 0;
		const ids = players.map((player) => player.id);
		globalThis.AIHub.finish({
			standings: [ids],
			scores: Object.fromEntries(ids.map((id) => [id, score])),
			won: !!result.won,
			stats: Object.fromEntries(ids.map((id) => [id, result.stats || {}])),
		});
		reported = true;
	};
	const api = {
		get role() {
			return role;
		},
		get room() {
			return room;
		},
		get connected() {
			return connected;
		},
		get isHost() {
			return role !== "guest";
		},
		get hub() {
			return hub;
		},
		get server() {
			return server;
		},
		get me() {
			return hub ? info?.me : role === "guest" ? 1 : 0;
		},
		get seat() {
			return hub
				? info.players.findIndex((player) => player.id === info?.me)
				: role === "guest"
					? 1
					: 0;
		},
		get players() {
			return players;
		},
		get canPlay() {
			return !ended && (!hub || (started && globalThis.AIHub.time() >= 0));
		},
		get ended() {
			return ended;
		},
		async host() {
			if (hub) return "";
			leave();
			room = Array.from(
				crypto.getRandomValues(new Uint8Array(6)),
				(n) => alphabet[n % alphabet.length],
			).join("");
			role = "host";
			setupLocal();
			status(`ROOM ${room} · share this code with your wingmate`);
			void setupPeer(generation);
			return room;
		},
		async join(code) {
			if (hub) return false;
			const cleaned = String(code || "")
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "");
			if (cleaned.length !== 6) {
				status("Enter the six-character room code.");
				return false;
			}
			leave();
			room = cleaned;
			role = "guest";
			setupLocal();
			status(`CALLING ROOM ${room}…`);
			void setupPeer(generation);
			return true;
		},
		leave,
		sendInput(value) {
			input = cleanInput(value);
			pendingFlare ||= input.flare;
			pendingRescue ||= input.rescue;
		},
		tick(dt, snapshot) {
			if (ended || role === "solo") return;
			stateClock += dt;
			inputClock += dt;
			if (role === "host" && snapshot) lastState = snapshot;
			if (role === "host" && stateClock >= 0.1 && (connected || hub)) {
				stateClock %= 0.1;
				if (lastState) send("state", { state: lastState });
			}
			if (role === "guest" && inputClock >= 1 / 15) {
				inputClock %= 1 / 15;
				send("input", {
					input: { ...input, flare: pendingFlare, rescue: pendingRescue },
				});
				pendingFlare = pendingRescue = false;
			}
		},
		finish,
		async initHub() {
			const hubClient = globalThis.AIHub;
			if (!hubClient?.active) return false;
			info = await hubClient.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) return false;
			hub = true;
			role = info.isHost ? "host" : "guest";
			room = `HUB-${info.round}`;
			server = !!info.server;
			players = info.players.slice();
			connected = players.length > 1;
			hubClient.on("message", (packet, from) => receive(packet, from));
			hubClient.on("start", () => {
				begin();
			});
			hubClient.on("leave", ({ id, reason }) => {
				const seat = info.players.findIndex((player) => player.id === id);
				if (seat >= 0) call("onInput", cleanInput(null), seat);
				players = players.filter((player) => player.id !== id);
				call("onDisconnect", reason, seat);
			});
			hubClient.on("time-up", (event) => {
				call("onTimeUp", event);
				if (!reported && role === "host")
					finish(Number(lastState?.score) || 0, false);
			});
			hubClient.on("end", (event) => {
				ended = true;
				call("onEnd", event);
			});
			status(
				server ? "AI HUB · flight server" : `AI HUB · ${players.length} PILOTS`,
			);
			call("onHub", info);
			hubClient.ready();
			return true;
		},
	};
	return api;
}
