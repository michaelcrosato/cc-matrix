/* Lost Fortune networking. AI Hub owns every connection while embedded. */
export function createOnline(callbacks = {}) {
	const cb = Object.assign(
		{
			onState() {},
			onInput() {},
			onStatus() {},
			onStart() {},
			onEnd() {},
			onLeave() {},
		},
		callbacks,
	);
	const client = window.AIHub;
	let hub = !!client?.active,
		role = "solo",
		room = "",
		me = 0,
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
	let connected = false,
		server = false,
		ended = false,
		started = !hub,
		loaded = false,
		reported = false;
	let initPromise,
		startTimer,
		heartbeat,
		joinTimer,
		channel,
		peer,
		connection,
		transport = "",
		instance = makeCode(12),
		partner = "",
		lastState;
	let terminalSent = false,
		stateAt = -Infinity,
		inputAt = -Infinity,
		lastSeen = 0,
		lastSequence = -1,
		sequence = 0,
		peerLoader;
	const cleanup = [],
		timers = new Set();
	const status = (message, extra = {}) =>
		cb.onStatus(message, {
			role,
			room,
			connected,
			me,
			players,
			hub,
			server,
			...extra,
		});
	function makeCode(n = 6) {
		const bytes = new Uint8Array(n);
		crypto.getRandomValues(bytes);
		return Array.from(
			bytes,
			(x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32],
		).join("");
	}
	function callStart() {
		if (ended || (started && hub)) return;
		started = true;
		cb.onStart({ role, room, me, players, server, hub });
	}
	function finitePayload(value) {
		try {
			const text = JSON.stringify(value);
			return text && text.length < 15000 ? JSON.parse(text) : null;
		} catch {
			return null;
		}
	}
	function receive(message, from) {
		if (ended || !message || message.protocol !== "lost-fortune-1") return;
		if (
			message.type === "input" &&
			role === "host" &&
			players.some((p) => p.id === from) &&
			from !== me
		) {
			cb.onInput(message.value, from);
		} else if (
			message.type === "state" &&
			role === "guest" &&
			from === (hub ? client.host : 0)
		) {
			if (typeof message.seq === "number" && message.seq <= lastSequence)
				return;
			lastSequence = message.seq;
			cb.onState(message.value, from);
		} else if (message.type === "finished" && !hub && role === "guest") {
			cb.onState(message.value, from);
		}
	}
	function send(type, value) {
		if (ended || !connected) return false;
		const clean = finitePayload(value);
		if (clean === null) return false;
		const message = {
			protocol: "lost-fortune-1",
			type,
			value: clean,
			seq: sequence++,
		};
		if (hub)
			return client.send(
				message,
				type === "input"
					? { to: client.host, reliable: true }
					: { reliable: true },
			);
		if (transport === "local") {
			channel?.postMessage({ kind: "data", instance, from: me, message });
			return true;
		}
		if (transport === "rtc" && connection?.open) {
			connection.send(message);
			return true;
		}
		return false;
	}
	async function init() {
		if (initPromise) return initPromise;
		initPromise = (async () => {
			if (!hub) return null;
			cleanup.push(client.on("message", receive));
			cleanup.push(
				client.on("start", (detail) => {
					started = false;
					const begin = () => {
						if (ended) return;
						if (client.time() >= 0) callStart();
						else
							startTimer = setTimeout(
								begin,
								Math.min(100, Math.max(1, -client.time())),
							);
					};
					status("The expedition starts in a moment.");
					begin();
				}),
			);
			cleanup.push(
				client.on("leave", ({ id }) => {
					players = players.filter((p) => p.id !== id);
					cb.onLeave(id);
					status("An explorer left the expedition.");
				}),
			);
			cleanup.push(
				client.on("time-up", () => {
					if (role !== "host" || ended || reported) return;
					let outcome;
					try {
						outcome = cb.onTimeUp?.() || cb.getResult?.();
					} catch {
						outcome = null;
					}
					finish(
						outcome || { won: false, score: Number(lastState?.score) || 0 },
					);
				}),
			);
			cleanup.push(
				client.on("end", ({ reason }) => {
					ended = true;
					started = false;
					clearTimeout(startTimer);
					cb.onEnd(reason);
					status("The expedition has ended.");
				}),
			);
			const info = await client.connect({
				mode: "shared-world",
				seats: [1, 2],
			});
			if (!info) {
				hub = false;
				started = true;
				return null;
			}
			role = info.isHost ? "host" : "guest";
			me = info.me;
			players = info.players;
			server = !!info.server;
			connected = true;
			status(server ? "The expedition host is ready." : "Connected to AI Hub.");
			if (loaded) client.ready();
			return info;
		})();
		return initPromise;
	}
	function ready() {
		loaded = true;
		if (hub && connected && !ended) client.ready();
	}
	function finish(outcome = {}) {
		if (ended || reported) return;
		reported = true;
		if (hub && role === "host") {
			const ids = players.map((p) => p.id),
				score = Number(outcome.score) || 0;
			const scores = Object.fromEntries(ids.map((id) => [id, score]));
			const stats = Object.fromEntries(
				ids.map((id) => [id, outcome.stats || { Fortune: score }]),
			);
			client.finish({ standings: [ids], scores, won: !!outcome.won, stats });
		}
	}
	function clearStandalone() {
		clearInterval(heartbeat);
		clearTimeout(joinTimer);
		heartbeat = null;
		joinTimer = null;
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
		channel?.close();
		channel = null;
		connection?.close();
		connection = null;
		peer?.destroy();
		peer = null;
		connected = false;
		transport = "";
		partner = "";
		lastSequence = -1;
		terminalSent = false;
		stateAt = inputAt = -Infinity;
	}
	function loadPeer() {
		if (window.Peer) return Promise.resolve(window.Peer);
		if (peerLoader) return peerLoader;
		peerLoader = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = () =>
				window.Peer
					? resolve(window.Peer)
					: reject(new Error("The room service could not start."));
			script.onerror = () =>
				reject(
					new Error(
						"The room service is unavailable. Same-browser rooms still work.",
					),
				);
			document.head.appendChild(script);
		});
		return peerLoader;
	}
	function acceptRemote(kind) {
		if (ended || connected) return;
		connected = true;
		transport = kind;
		started = true;
		lastSeen = performance.now();
		players = [
			{ id: 0, name: "Dr. Vale", color: "#e8b95f" },
			{ id: 1, name: "Kit Mercer", color: "#5fd7ca" },
		];
		clearTimeout(joinTimer);
		if (kind === "local") {
			connection?.close();
			connection = null;
			peer?.destroy();
			peer = null;
		}
		status("Partner connected. Two hats. One terrible idea.");
		cb.onStart({ role, room, me, players, server: false, hub: false });
	}
	function localMessage(event) {
		const data = event.data;
		if (!data || data.instance === instance || ended) return;
		if (partner && data.instance !== partner) return;
		if (data.kind === "hello" && role === "host") {
			if (connected && transport !== "local") return;
			partner = data.instance;
			channel.postMessage({ kind: "welcome", instance, to: data.instance });
			acceptRemote("local");
		} else if (
			data.kind === "welcome" &&
			role === "guest" &&
			data.to === instance
		) {
			partner = data.instance;
			acceptRemote("local");
		} else if (data.kind === "ping" && connected && transport === "local") {
			lastSeen = performance.now();
		} else if (data.kind === "data" && connected && transport === "local") {
			lastSeen = performance.now();
			receive(data.message, data.from);
		} else if (data.kind === "leave" && connected && transport === "local") {
			disconnectPartner();
		}
	}
	function disconnectPartner() {
		if (!connected || hub) return;
		connected = false;
		transport = "";
		partner = "";
		cb.onLeave(role === "host" ? 1 : 0);
		players = [
			{
				id: me,
				name: role === "host" ? "Dr. Vale" : "Kit Mercer",
				color: role === "host" ? "#e8b95f" : "#5fd7ca",
			},
		];
		status(
			role === "host"
				? "Your partner left. The expedition can continue solo."
				: "The host left. Return to the title to join another room.",
		);
	}
	function beginLocal() {
		try {
			channel = new BroadcastChannel("lost-fortune-room-" + room);
			channel.onmessage = localMessage;
		} catch {
			channel = null;
		}
		heartbeat = setInterval(() => {
			if (ended) return;
			if (connected && transport === "local") {
				channel?.postMessage({ kind: "ping", instance });
				if (performance.now() - lastSeen > 12000) disconnectPartner();
			} else if (!connected && role === "guest")
				channel?.postMessage({ kind: "hello", instance });
		}, 500);
		if (role === "guest") channel?.postMessage({ kind: "hello", instance });
	}
	function wireConnection(conn) {
		conn.on("open", () => {
			if (connected && transport !== "rtc") {
				conn.close();
				return;
			}
			connection = conn;
			acceptRemote("rtc");
		});
		conn.on("data", (message) => {
			if (transport === "rtc") receive(message, role === "host" ? 1 : 0);
		});
		conn.on("close", () => {
			if (transport === "rtc") disconnectPartner();
		});
		conn.on("error", () => {
			if (transport === "rtc") disconnectPartner();
		});
	}
	async function beginRTC(expectedRoom, expectedRole) {
		try {
			const Peer = await loadPeer();
			if (
				hub ||
				room !== expectedRoom ||
				role !== expectedRole ||
				connected ||
				ended
			)
				return;
			peer = role === "host" ? new Peer("lost-fortune-" + room) : new Peer();
			peer.on("open", () => {
				if (role === "guest" && !connected)
					wireConnection(
						peer.connect("lost-fortune-" + room, {
							reliable: true,
							serialization: "json",
						}),
					);
			});
			peer.on("connection", (conn) => {
				if (role !== "host" || connected) {
					conn.close();
					return;
				}
				wireConnection(conn);
			});
			peer.on("error", (error) => {
				if (!connected)
					status(
						error?.type === "unavailable-id"
							? "That room is already in use. Create a fresh room."
							: "Room service unavailable or room not found. Check the code and try again.",
					);
			});
		} catch (error) {
			if (!connected && room === expectedRoom) status(error.message);
		}
	}
	async function createRoom() {
		if (hub) return null;
		clearStandalone();
		role = "host";
		me = 0;
		room = makeCode();
		ended = false;
		reported = false;
		started = false;
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
		beginLocal();
		status("Room " + room + " — share this code with your partner.");
		beginRTC(room, role);
		return room;
	}
	async function joinRoom(value) {
		if (hub) return false;
		const code = String(value || "")
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "");
		if (code.length !== 6) {
			status("Enter the six-character room code.");
			return false;
		}
		clearStandalone();
		role = "guest";
		me = 1;
		room = code;
		ended = false;
		reported = false;
		started = false;
		players = [{ id: 1, name: "Kit Mercer", color: "#5fd7ca" }];
		beginLocal();
		status("Looking for room " + room + "…");
		const timer = setTimeout(() => {
			timers.delete(timer);
			beginRTC(room, role);
		}, 700);
		timers.add(timer);
		joinTimer = setTimeout(() => {
			if (!connected)
				status("No expedition found. Check the room code and try again.");
		}, 20000);
		return true;
	}
	function leave() {
		if (hub) return false;
		if (connected && transport === "local")
			channel?.postMessage({ kind: "leave", instance });
		clearStandalone();
		role = "solo";
		room = "";
		me = 0;
		server = false;
		ended = false;
		started = true;
		reported = false;
		players = [{ id: 0, name: "Dr. Vale", color: "#e8b95f" }];
		status("Solo expedition.");
		return true;
	}
	return {
		init,
		ready,
		createRoom,
		joinRoom,
		leave,
		finish,
		sendState(state) {
			lastState = state;
			const terminal = !!(
				state?.won ||
				state?.dead ||
				state?.state?.won ||
				state?.state?.dead
			);
			if (!terminal) terminalSent = false;
			if (
				role !== "host" ||
				(performance.now() - stateAt < 80 && !(terminal && !terminalSent))
			)
				return false;
			stateAt = performance.now();
			const sent = send("state", state);
			if (sent && terminal) terminalSent = true;
			return sent;
		},
		sendInput(input) {
			if (role !== "guest" || performance.now() - inputAt < 80) return false;
			inputAt = performance.now();
			return send("input", input);
		},
		get hub() {
			return hub;
		},
		get role() {
			return role;
		},
		get room() {
			return room;
		},
		get connected() {
			return connected;
		},
		get me() {
			return me;
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
		get canPlay() {
			return !ended && (hub ? connected && client.time() >= 0 : started);
		},
		destroy() {
			if (!hub) clearStandalone();
			clearTimeout(startTimer);
			for (const remove of cleanup) remove();
		},
	};
}
