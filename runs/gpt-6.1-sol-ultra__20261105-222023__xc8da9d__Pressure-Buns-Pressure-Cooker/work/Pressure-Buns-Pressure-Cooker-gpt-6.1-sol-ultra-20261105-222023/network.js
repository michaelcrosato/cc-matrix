/* Pressure Buns networking. AI Hub Session Protocol v1 / standalone two-chef co-op. */
let peerLoader;
function loadPeer() {
	if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
	if (!peerLoader)
		peerLoader = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = () => resolve(globalThis.Peer);
			script.onerror = () =>
				reject(
					new Error(
						"Internet room service unavailable. Same-device rooms still work.",
					),
				);
			document.head.append(script);
		});
	return peerLoader;
}
function token(n = 6) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const bytes = crypto.getRandomValues(new Uint8Array(n));
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
export function createNetwork({
	onInput = () => {},
	onState = () => {},
	onStatus = () => {},
	onJoin = () => {},
	onEvent = () => {},
	getState = () => null,
} = {}) {
	const hub = globalThis.AIHub;
	const self = token(12);
	let role = "solo",
		room = "",
		connected = false,
		peer = null,
		channel = null,
		link = null;
	let remote = "",
		transport = "",
		generation = 0,
		clock = 0,
		inputClock = 0,
		stateClock = 0;
	let latestInput = { x: 0, z: 0, action: false, reject: false, dash: false };
	let pendingAction = false,
		pendingReject = false,
		pendingDash = false;
	let info = null,
		ended = false,
		reported = false,
		hubStarted = false,
		timer = null,
		heartbeat = 0,
		lastRemote = 0;
	const unsubscribers = [];
	const status = (message) => onStatus(message, api);
	const emit = (name, data) => onEvent(name, data);
	const normalize = (input) => ({
		...input,
		x: Math.max(-1, Math.min(1, Number(input?.x) || 0)),
		z: Math.max(-1, Math.min(1, Number(input?.z) || 0)),
		action: !!input?.action,
		reject: !!input?.reject,
		dash: !!input?.dash,
	});
	function send(data) {
		if (ended || !connected) return false;
		if (role.startsWith("hub-"))
			return hub.send(
				data,
				role === "hub-guest"
					? { to: info.host, reliable: true }
					: { reliable: true },
			);
		const packet = {
			game: "pressure-buns-v1",
			from: self,
			to: remote,
			...data,
		};
		if (transport === "local" && channel) {
			channel.postMessage(packet);
			return true;
		}
		if (transport === "internet" && link?.open) {
			link.send(packet);
			return true;
		}
		return false;
	}
	function receive(data, source, connection = null) {
		if (
			!data ||
			data.game !== "pressure-buns-v1" ||
			data.from === self ||
			(data.to && data.to !== self) ||
			ended
		)
			return;
		if (data.type === "hello" && role === "host") {
			if (connected && remote !== data.from) {
				const busy = {
					game: "pressure-buns-v1",
					type: "busy",
					from: self,
					to: data.from,
				};
				if (source === "local") channel?.postMessage(busy);
				else connection?.send(busy);
				return;
			}
			if (!connected) {
				remote = data.from;
				transport = source;
				connected = true;
				lastRemote = clock;
				if (connection) link = connection;
				onJoin({ id: 1, seat: 1, localSeat: 0, transport });
				status("Sous-chef connected · room " + room);
				emit("connected", { role, transport, room });
			}
			send({ type: "welcome", room });
			const state = getState();
			if (state) send({ type: "state", state });
			return;
		}
		if (data.type === "busy" && role === "guest" && !connected) {
			status("This kitchen already has two chefs. Try another room.");
			return;
		}
		if (data.type === "welcome" && role === "guest") {
			if (connected && transport !== source) return;
			if (!connected) {
				remote = data.from;
				transport = source;
				connected = true;
				lastRemote = clock;
				if (connection) link = connection;
				if (timer) clearInterval(timer);
				timer = null;
				onJoin({ id: 1, seat: 1, localSeat: 1, transport });
				status("Joined kitchen " + room + " · you are the blue chef");
				emit("connected", { role, transport, room });
			}
			return;
		}
		if (data.from !== remote || transport !== source || !connected) return;
		lastRemote = clock;
		if (data.type === "input" && role === "host")
			onInput(normalize(data.input), 1);
		if (data.type === "state" && role === "guest") onState(data.state);
		if (data.type === "event") emit("remote-event", data.event);
		if (data.type === "leave") disconnected("The other chef left the kitchen.");
	}
	function disconnected(message) {
		connected = false;
		remote = "";
		transport = "";
		link?.close();
		link = null;
		onInput(normalize({}), 1);
		status(message);
		emit("disconnected", {});
	}
	function localChannel() {
		if (!("BroadcastChannel" in globalThis)) return;
		try {
			channel = new BroadcastChannel("pressure-buns-room-" + room);
			channel.onmessage = (e) => receive(e.data, "local");
		} catch {
			channel = null;
		}
	}
	async function internetHost(stamp) {
		try {
			const Peer = await loadPeer();
			if (stamp !== generation || hub?.active) return;
			peer = new Peer("pressure-buns-v1-" + room, { debug: 0 });
			peer.on("open", () => {
				if (!connected)
					status(
						"Room " + room + " open · share this code with your sous-chef",
					);
			});
			peer.on("connection", (connection) => {
				connection.on("data", (data) => receive(data, "internet", connection));
				connection.on("close", () => {
					if (link === connection && transport === "internet")
						disconnected("Sous-chef disconnected. Room remains open.");
				});
				connection.on("error", () => {});
			});
			peer.on("error", (e) => {
				if (!connected)
					status(
						e.type === "unavailable-id"
							? "Room code is busy. Create a new kitchen."
							: "Room " + room + " open locally. Internet service unavailable.",
					);
			});
		} catch (e) {
			if (stamp === generation && !connected) status(e.message);
		}
	}
	async function internetJoin(stamp) {
		try {
			const Peer = await loadPeer();
			if (
				stamp !== generation ||
				hub?.active ||
				(connected && transport === "local")
			)
				return;
			peer = new Peer(undefined, { debug: 0 });
			peer.on("open", () => {
				if (stamp !== generation || (connected && transport === "local"))
					return;
				const connection = peer.connect("pressure-buns-v1-" + room, {
					reliable: true,
					serialization: "json",
				});
				connection.on("open", () => {
					if (connected && transport === "local") {
						connection.close();
						return;
					}
					connection.send({
						game: "pressure-buns-v1",
						type: "hello",
						from: self,
					});
				});
				connection.on("data", (data) => receive(data, "internet", connection));
				connection.on("close", () => {
					if (link === connection && transport === "internet")
						disconnected("Kitchen connection closed.");
				});
				connection.on("error", () => {});
			});
			peer.on("error", (e) => {
				if (!connected)
					status(
						e.type === "peer-unavailable"
							? "Kitchen not found. Check the room code and try again."
							: "Searching locally; internet room service is unavailable.",
					);
			});
		} catch (e) {
			if (stamp === generation && !connected) status(e.message);
		}
	}
	const api = {
		get role() {
			return role;
		},
		get room() {
			return room;
		},
		get isHost() {
			return role !== "guest" && role !== "hub-guest";
		},
		get connected() {
			return connected;
		},
		get hubActive() {
			return !!hub?.active;
		},
		get hubInfo() {
			return info;
		},
		get localSeat() {
			return info ? (info.server ? -1 : info.me) : role === "guest" ? 1 : 0;
		},
		get playerIds() {
			return info ? info.players.map((p) => p.id) : connected ? [0, 1] : [0];
		},
		get server() {
			return !!info?.server;
		},
		get ended() {
			return ended;
		},
		get hubTime() {
			return hub?.active ? hub.time() : Infinity;
		},
		async connectHub() {
			if (!hub?.active) return null;
			info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) return null;
			role = info.isHost ? "hub-host" : "hub-guest";
			connected = true;
			unsubscribers.push(
				hub.on("message", (data, from) => {
					if (ended || !data || typeof data !== "object") return;
					if (
						data.type === "input" &&
						info.isHost &&
						info.players.some((p) => p.id === from)
					)
						onInput(normalize(data.input), from);
					if (data.type === "state" && !info.isHost && from === info.host)
						onState(data.state);
					if (data.type === "event" && from === info.host)
						emit("remote-event", data.event);
				}),
			);
			unsubscribers.push(
				hub.on("start", (data) => {
					hubStarted = true;
					emit("hub-start", data);
				}),
			);
			unsubscribers.push(
				hub.on("time-up", (data) => {
					emit("hub-time-up", data);
					if (info.isHost && !reported) {
						const state = getState() || {};
						api.finish(false, Number(state.score) || 0);
					}
				}),
			);
			unsubscribers.push(
				hub.on("leave", (data) => {
					onInput(normalize({}), data.id);
					emit("hub-leave", data);
				}),
			);
			unsubscribers.push(
				hub.on("end", (data) => {
					ended = true;
					connected = false;
					latestInput = normalize({});
					emit("hub-end", data);
				}),
			);
			status(
				info.server
					? "AI Hub · kitchen server"
					: "AI Hub · chef " + (info.me + 1),
			);
			return info;
		},
		ready() {
			if (info && !ended) hub.ready();
		},
		finish(won, score = 0) {
			if (typeof won === "object") {
				score = won.score || 0;
				won = won.won;
			}
			if (!info || !info.isHost || ended || reported) return;
			reported = true;
			const ids = info.players.map((p) => p.id);
			hub.finish({
				standings: [ids],
				scores: Object.fromEntries(ids.map((id) => [id, Number(score) || 0])),
				won: !!won,
			});
		},
		sendInput(input) {
			latestInput = normalize(input);
			pendingAction ||= latestInput.action;
			pendingReject ||= latestInput.reject;
			pendingDash ||= latestInput.dash;
		},
		broadcast(state) {
			if (api.isHost && connected && state)
				return send({ type: "state", state });
			return false;
		},
		sendEvent(event) {
			return send({ type: "event", event });
		},
		async host() {
			if (hub?.active) return "";
			api.leave();
			role = "host";
			room = token();
			localChannel();
			const stamp = generation;
			status("Room " + room + " open · connecting internet room service…");
			internetHost(stamp);
			return room;
		},
		async join(code) {
			if (hub?.active) return;
			api.leave();
			room = String(code || "")
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.slice(0, 12);
			if (room.length < 4) {
				status("Enter the six-character kitchen code.");
				return false;
			}
			role = "guest";
			localChannel();
			status("Looking for kitchen " + room + "…");
			const stamp = generation;
			const hello = () =>
				channel?.postMessage({
					game: "pressure-buns-v1",
					type: "hello",
					from: self,
				});
			hello();
			timer = setInterval(hello, 700);
			internetJoin(stamp);
			return true;
		},
		leave() {
			if (hub?.active) return;
			send({ type: "leave" });
			generation++;
			if (timer) clearInterval(timer);
			timer = null;
			channel?.close();
			channel = null;
			link?.close();
			link = null;
			peer?.destroy();
			peer = null;
			connected = false;
			role = "solo";
			room = "";
			remote = "";
			transport = "";
			ended = false;
			latestInput = normalize({});
			pendingAction = pendingReject = pendingDash = false;
			inputClock = stateClock = heartbeat = lastRemote = 0;
		},
		update(dt) {
			clock += dt;
			if (!connected || ended) return;
			inputClock += dt;
			stateClock += dt;
			heartbeat += dt;
			if (role.startsWith("hub-") && (!hubStarted || hub.time() < 0)) return;
			if (!api.isHost && inputClock >= 0.1) {
				inputClock %= 0.1;
				send({
					type: "input",
					input: {
						...latestInput,
						action: pendingAction || latestInput.action,
						reject: pendingReject || latestInput.reject,
						dash: pendingDash || latestInput.dash,
					},
				});
				pendingAction = pendingReject = pendingDash = false;
			}
			if (api.isHost && stateClock >= 0.1) {
				stateClock %= 0.1;
				const state = getState();
				if (state) send({ type: "state", state });
			}
			if (!role.startsWith("hub-") && heartbeat >= 1) {
				heartbeat %= 1;
				send({ type: "heartbeat" });
			}
			if (!role.startsWith("hub-") && clock - lastRemote > 12)
				disconnected(
					"Sous-chef connection lost. Rejoin the kitchen to continue.",
				);
		},
		dispose() {
			api.leave();
			unsubscribers.forEach((off) => {
				off();
			});
		},
	};
	return api;
}
