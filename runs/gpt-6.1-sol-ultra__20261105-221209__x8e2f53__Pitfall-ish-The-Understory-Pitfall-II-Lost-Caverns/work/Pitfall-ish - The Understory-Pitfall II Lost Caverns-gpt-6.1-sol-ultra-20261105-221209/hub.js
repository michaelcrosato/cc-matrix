/* CavernNet: authoritative two-player co-op over AI Hub, local tabs or WebRTC. */
(() => {
	"use strict";
	const events = new Map(),
		lastEvents = new Map();
	const colors = ["#edbd67", "#68ddd3"];
	let data = {
		active: false,
		transport: "solo",
		role: "host",
		isHost: true,
		me: 0,
		host: 0,
		players: [{ id: 0, name: "You", color: colors[0] }],
		connected: false,
		waiting: false,
		room: "",
		started: true,
		ended: false,
		server: false,
	};
	let hub = null,
		channel = null,
		connection = null,
		rtc = null,
		remoteToken = null,
		token = "",
		initPromise;
	let lastStateAt = -Infinity,
		lastInputAt = -Infinity,
		lastHeardAt = 0,
		lastPingAt = 0,
		sequence = 0,
		receivedSequence = -1;
	let finished = false,
		lastScore = 0,
		closed = false;
	const now = () => performance.now();
	const emit = (kind, ...args) => {
		if (["start", "end", "timeup"].includes(kind)) lastEvents.set(kind, args);
		for (const fn of events.get(kind) || []) fn(...args);
	};
	const listen = (kind, fn) => {
		if (!events.has(kind)) events.set(kind, new Set());
		events.get(kind).add(fn);
		if (lastEvents.has(kind)) queueMicrotask(() => fn(...lastEvents.get(kind)));
		return () => events.get(kind)?.delete(fn);
	};
	const status = () => ({
		...data,
		players: data.players.map((p) => ({ ...p })),
	});
	const changed = () => emit("change", status());
	const newToken = () =>
		globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
	const jsonCopy = (value) => {
		try {
			const text = JSON.stringify(value);
			return text.length <= 15000 ? JSON.parse(text) : null;
		} catch {
			return null;
		}
	};
	const send = (envelope) => {
		if (closed || data.ended) return false;
		if (data.transport === "hub")
			return hub.send(envelope, {
				to: data.isHost ? undefined : data.host,
				reliable: true,
			});
		if (data.transport === "local" && channel) {
			channel.postMessage({ ...envelope, token, to: remoteToken });
			return true;
		}
		if (data.transport === "webrtc" && rtc?.readyState === "open") {
			rtc.send(JSON.stringify(envelope));
			return true;
		}
		return false;
	};
	function receive(envelope, from) {
		if (closed || data.ended || !envelope || envelope.game !== "understory-v1")
			return;
		lastHeardAt = now();
		if (
			envelope.type === "input" &&
			data.isHost &&
			data.players.some((p) => p.id === from)
		)
			emit("input", envelope.value, from);
		if (
			envelope.type === "state" &&
			!data.isHost &&
			from === data.host &&
			envelope.sequence > receivedSequence
		) {
			receivedSequence = envelope.sequence;
			emit("state", envelope.value, from);
		}
		if (envelope.type === "finish" && !data.isHost)
			emit("finish", envelope.value);
	}
	function closeTransport() {
		if (channel && remoteToken)
			channel.postMessage({ type: "bye", token, to: remoteToken });
		channel?.close();
		channel = null;
		if (rtc) {
			rtc.onopen = null;
			rtc.onclose = null;
			rtc.onmessage = null;
			rtc.close();
			rtc = null;
		}
		if (connection) {
			connection.onconnectionstatechange = null;
			connection.ondatachannel = null;
			connection.close();
			connection = null;
		}
		remoteToken = null;
		receivedSequence = -1;
		sequence = 0;
		lastInputAt = -Infinity;
		lastStateAt = -Infinity;
	}
	function standalone(kind, isHost, room = "") {
		if (data.active) throw new Error("AI Hub owns the current session.");
		closeTransport();
		closed = false;
		finished = false;
		data = {
			active: false,
			transport: kind,
			role: isHost ? "host" : "guest",
			isHost,
			me: isHost ? 0 : 1,
			host: 0,
			players: [
				{ id: 0, name: isHost ? "You" : "Expedition leader", color: colors[0] },
			],
			connected: false,
			waiting: kind !== "solo",
			room,
			started: true,
			ended: false,
			server: false,
		};
		if (!isHost) data.players.push({ id: 1, name: "You", color: colors[1] });
		token = newToken();
		lastHeardAt = now();
		changed();
	}
	function linked() {
		data.connected = true;
		data.waiting = false;
		data.players = [
			{
				id: 0,
				name: data.isHost ? "You" : "Expedition leader",
				color: colors[0],
			},
			{
				id: 1,
				name: data.isHost ? "Cavern companion" : "You",
				color: colors[1],
			},
		];
		lastHeardAt = now();
		changed();
		emit("start", { in: 0, standalone: true });
	}
	function localMessage(event) {
		const m = event.data;
		if (!m || m.token === token || (m.to && m.to !== token)) return;
		if (m.type === "hello" && data.isHost) {
			if (remoteToken && remoteToken !== m.token) {
				channel.postMessage({ type: "full", token, to: m.token });
				return;
			}
			remoteToken = m.token;
			channel.postMessage({ type: "welcome", token, to: remoteToken });
			if (!data.connected) linked();
		} else if (m.type === "welcome" && !data.isHost) {
			remoteToken = m.token;
			if (!data.connected) linked();
		} else if (m.type === "full" && !data.isHost) {
			data.waiting = false;
			data.error = "This expedition already has a companion.";
			changed();
			emit("error", data.error);
		} else if (m.type === "bye" && m.token === remoteToken) {
			data.connected = false;
			data.waiting = true;
			remoteToken = null;
			if (data.isHost) data.players = data.players.filter((p) => p.id !== 1);
			changed();
			emit("leave", { id: data.isHost ? 1 : 0, reason: "disconnected" });
		} else if (m.token === remoteToken) receive(m, data.isHost ? 1 : 0);
	}
	async function init() {
		if (initPromise) return initPromise;
		initPromise = (async () => {
			if (!globalThis.AIHub?.active) return null;
			hub = globalThis.AIHub;
			const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
			if (!info) return null;
			data = {
				active: true,
				transport: "hub",
				role: info.isHost ? "host" : "guest",
				isHost: info.isHost,
				me: info.me,
				host: info.host,
				players: info.players,
				connected: true,
				waiting: false,
				room: "AI Hub",
				started: false,
				ended: false,
				server: !!info.server,
			};
			hub.on("start", (event) => {
				data.started = true;
				changed();
				emit("start", event);
			});
			hub.on("end", (event) => {
				data.ended = true;
				changed();
				emit("end", event);
			});
			hub.on("leave", (event) => {
				data.players = data.players.filter((p) => p.id !== event.id);
				changed();
				emit("leave", event);
			});
			hub.on("message", (value, from) => receive(value, from));
			hub.on("time-up", (event) => {
				emit("timeup", event);
				setTimeout(
					() => {
						if (!finished && data.isHost && !data.ended)
							finish({ won: false, score: lastScore });
					},
					Math.min(150, event.graceMs / 2),
				);
			});
			changed();
			return info;
		})();
		return initPromise;
	}
	function finish({ won = false, score = 0, stats } = {}) {
		if (finished || data.ended || !data.isHost) return;
		finished = true;
		lastScore = Number.isFinite(score) ? score : 0;
		const ids = data.players.map((p) => p.id),
			scores = Object.fromEntries(ids.map((id) => [id, lastScore]));
		if (data.active)
			hub.finish({
				standings: [ids],
				scores,
				won: !!won,
				...(stats ? { stats } : {}),
			});
		else
			send({
				game: "understory-v1",
				type: "finish",
				value: { won: !!won, score: lastScore },
			});
	}
	const roomCode = (value) =>
		String(value || "UNDERSTORY")
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9_-]/g, "")
			.slice(0, 28) || "UNDERSTORY";
	function local(isHost, room) {
		if (!globalThis.BroadcastChannel)
			throw new Error("Local rooms are unavailable in this browser.");
		standalone("local", isHost, roomCode(room));
		channel = new BroadcastChannel("understory-coop-" + data.room);
		channel.onmessage = localMessage;
		if (!isHost) channel.postMessage({ type: "hello", token });
		return status();
	}
	function setupRTC(isHost) {
		if (!globalThis.RTCPeerConnection)
			throw new Error("WebRTC is unavailable in this browser.");
		standalone("webrtc", isHost);
		connection = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		connection.onconnectionstatechange = () => {
			if (
				["failed", "closed", "disconnected"].includes(
					connection?.connectionState,
				)
			) {
				data.connected = false;
				data.waiting = true;
				changed();
				emit("leave", { id: isHost ? 1 : 0, reason: "disconnected" });
			}
		};
		const attach = (c) => {
			rtc = c;
			rtc.onopen = linked;
			rtc.onmessage = (event) => {
				try {
					receive(JSON.parse(event.data), isHost ? 1 : 0);
				} catch {}
			};
			rtc.onclose = () => {
				data.connected = false;
				data.waiting = true;
				changed();
			};
		};
		if (isHost)
			attach(
				connection.createDataChannel("understory-coop", { ordered: true }),
			);
		else connection.ondatachannel = (e) => attach(e.channel);
	}
	async function gather() {
		if (connection.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timeout = setTimeout(done, 8500);
			function done() {
				clearTimeout(timeout);
				connection?.removeEventListener("icegatheringstatechange", change);
				resolve();
			}
			function change() {
				if (connection?.iceGatheringState === "complete") done();
			}
			connection.addEventListener("icegatheringstatechange", change);
		});
	}
	const encode = (description) =>
		btoa(unescape(encodeURIComponent(JSON.stringify(description))));
	const decode = (text) => {
		try {
			const value = JSON.parse(
				decodeURIComponent(escape(atob(String(text).trim()))),
			);
			if (
				!["offer", "answer"].includes(value.type) ||
				typeof value.sdp !== "string"
			)
				throw 0;
			return value;
		} catch {
			throw new Error(
				"That expedition code is incomplete. Copy the entire code.",
			);
		}
	};
	const timer = setInterval(() => {
		if (data.active || closed) return;
		if (data.transport === "local" && !data.isHost && !data.connected)
			channel?.postMessage({ type: "hello", token });
		if (data.connected && now() - lastPingAt > 1000) {
			lastPingAt = now();
			send({ game: "understory-v1", type: "ping" });
		}
		if (
			data.transport === "local" &&
			data.connected &&
			now() - lastHeardAt > 7000
		) {
			data.connected = false;
			data.waiting = true;
			changed();
			emit("leave", { id: data.isHost ? 1 : 0, reason: "disconnected" });
			remoteToken = null;
		}
	}, 600);
	window.addEventListener("beforeunload", () => {
		if (channel) channel.postMessage({ type: "bye", token, to: remoteToken });
	});
	window.CavernNet = {
		init,
		status,
		ready() {
			if (data.active) hub.ready();
		},
		onStart: (fn) => listen("start", fn),
		onEnd: (fn) => listen("end", fn),
		onTimeUp: (fn) => listen("timeup", fn),
		onLeave: (fn) => listen("leave", fn),
		onChange: (fn) => listen("change", fn),
		onFinish: (fn) => listen("finish", fn),
		onError: (fn) => listen("error", fn),
		onState: (fn) => listen("state", fn),
		onInput: (fn) => listen("input", fn),
		sendState(value) {
			if (!data.isHost || !data.connected || now() - lastStateAt < 66)
				return false;
			const copy = jsonCopy(value);
			if (copy === null) return false;
			lastStateAt = now();
			if (Number.isFinite(copy.score)) lastScore = copy.score;
			return send({
				game: "understory-v1",
				type: "state",
				sequence: ++sequence,
				value: copy,
			});
		},
		sendInput(value) {
			if (data.isHost || !data.connected || now() - lastInputAt < 66)
				return false;
			const copy = jsonCopy(value);
			if (copy === null) return false;
			lastInputAt = now();
			return send({ game: "understory-v1", type: "input", value: copy });
		},
		beginRound() {
			if (data.active) return false;
			finished = false;
			lastScore = 0;
			data.started = true;
			data.ended = false;
			return true;
		},
		request(action) {
			if (
				data.active ||
				data.isHost ||
				!data.connected ||
				!["restart", "title"].includes(action)
			)
				return false;
			return send({
				game: "understory-v1",
				type: "input",
				value: { command: action },
			});
		},
		updatePresence(pos) {
			if (!data.isHost) return this.sendInput({ presence: pos });
			return false;
		},
		finish,
		hostLocal: (room) => local(true, room),
		joinLocal: (room) => local(false, room),
		solo() {
			if (data.active) return false;
			standalone("solo", true);
			return true;
		},
		async makeOffer() {
			setupRTC(true);
			await connection.setLocalDescription(await connection.createOffer());
			await gather();
			return encode(connection.localDescription);
		},
		async answerOffer(code) {
			const offer = decode(code);
			if (offer.type !== "offer") throw new Error("A host offer is needed.");
			setupRTC(false);
			await connection.setRemoteDescription(offer);
			await connection.setLocalDescription(await connection.createAnswer());
			await gather();
			return encode(connection.localDescription);
		},
		async acceptAnswer(code) {
			if (!connection || !data.isHost)
				throw new Error("Create an offer first.");
			const answer = decode(code);
			if (answer.type !== "answer")
				throw new Error("A companion answer is needed.");
			await connection.setRemoteDescription(answer);
		},
		time() {
			return data.active ? hub.time() : 0;
		},
		destroy() {
			closed = true;
			closeTransport();
			clearInterval(timer);
			events.clear();
			lastEvents.clear();
		},
	};
})();
