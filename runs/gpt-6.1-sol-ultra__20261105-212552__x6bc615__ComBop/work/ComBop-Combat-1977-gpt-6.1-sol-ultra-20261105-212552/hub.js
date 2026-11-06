/* ComBop multiplayer adapter. AI Hub Session Protocol v1 + direct WebRTC. */
export function createOnline(callbacks = {}) {
	const cb = {
		onStatus() {},
		onInput() {},
		onSnapshot() {},
		onPeer() {},
		onStart() {},
		onEnd() {},
		onTimeUp() {},
		...callbacks,
	};
	const state = {
		active: false,
		inHub: false,
		isHost: false,
		isServer: false,
		seat: -1,
		players: [],
		connected: false,
		started: false,
		ended: false,
		transport: "none",
		sent: 0,
		received: 0,
	};
	let pc = null;
	let channel = null;
	let generation = 0;
	let startedAt = 0;
	let resultSent = false;
	let lastInput = -Infinity;
	let lastSnapshot = -Infinity;
	let currentStatus = "Offline";
	let hubInfo = null;
	const liveIds = new Set();
	const subscriptions = [];

	const status = (text) => {
		currentStatus = text;
		cb.onStatus(text);
	};
	const info = () => ({
		...state,
		players: state.players.map((p) => ({ ...p })),
		delay: state.inHub ? Math.max(0, -globalThis.AIHub.time()) : 0,
	});
	const cleanInput = (input) => {
		if (!input || typeof input !== "object" || Array.isArray(input))
			return null;
		// The game owns its compact input schema; JSON size and finite numbers
		// are checked here so a malformed remote input cannot poison physics.
		const serialized = JSON.stringify(input);
		if (serialized.length > 1024) return null;
		const valid = (value, depth = 0) => {
			if (depth > 3) return false;
			if (typeof value === "number")
				return Number.isFinite(value) && Math.abs(value) <= 1e6;
			if (
				value === null ||
				typeof value === "boolean" ||
				typeof value === "string"
			)
				return typeof value !== "string" || value.length < 80;
			if (Array.isArray(value))
				return value.length <= 8 && value.every((v) => valid(v, depth + 1));
			return (
				typeof value === "object" &&
				Object.keys(value).length <= 16 &&
				Object.values(value).every((v) => valid(v, depth + 1))
			);
		};
		return valid(input) ? input : null;
	};

	function receive(data, from) {
		if (state.ended || !data || data.game !== "combop-1") return;
		state.received++;
		if (data.type === "input" && state.isHost) {
			const seat = state.inHub
				? state.players.findIndex((p) => p.id === from)
				: 1;
			const input = cleanInput(data.input);
			if (seat >= 0 && input && (!state.inHub || liveIds.has(from)))
				cb.onInput(input, seat);
		} else if (
			data.type === "snapshot" &&
			!state.isHost &&
			(!state.inHub || from === hubInfo.host)
		) {
			if (data.state && typeof data.state === "object")
				cb.onSnapshot(data.state);
		} else if (!state.inHub && data.type === "finish" && !state.isHost) {
			resultSent = true;
			cb.onEnd({ reason: "finished", scores: data.scores, standalone: true });
		}
	}

	function send(data, reliable = false) {
		if (!state.connected || state.ended || !state.started) return false;
		const packet = { game: "combop-1", ...data };
		let sent = false;
		if (state.inHub) {
			sent = globalThis.AIHub.send(packet, {
				...(state.isHost ? {} : { to: hubInfo.host }),
				reliable,
			});
		} else if (
			channel?.readyState === "open" &&
			channel.bufferedAmount < 128 * 1024
		) {
			const text = JSON.stringify(packet);
			if (text.length <= 16000) {
				channel.send(text);
				sent = true;
			}
		}
		if (sent) state.sent++;
		return sent;
	}

	function disconnect(reason = "disconnected") {
		if (state.ended || !state.active) return;
		const wasConnected = state.connected;
		state.connected = false;
		state.ended = true;
		status(reason === "left" ? "Connection closed" : "Opponent disconnected");
		if (wasConnected)
			cb.onPeer({
				joined: false,
				seat: state.isHost ? 1 : 0,
				name: state.isHost ? "Coral" : "Mint",
				reason,
			});
		cb.onEnd({ reason, standalone: !state.inHub });
	}

	async function connectHub() {
		const hub = globalThis.AIHub;
		if (!hub?.active) return null;
		state.active = state.inHub = true;
		state.transport = "ai-hub";
		subscriptions.push(hub.on("message", receive));
		subscriptions.push(
			hub.on("start", (event) => {
				state.started = state.connected = true;
				state.ended = false;
				startedAt = performance.now() + (event?.in || 0);
				status("AI Hub • connected");
				cb.onStart({ ...info(), delay: event?.in || 0 });
			}),
		);
		subscriptions.push(
			hub.on("leave", (event) => {
				liveIds.delete(event.id);
				const seat = state.players.findIndex((p) => p.id === event.id);
				cb.onPeer({
					joined: false,
					seat,
					name: state.players[seat]?.name || "Player",
					reason: event.reason,
				});
				status("AI Hub • player left");
			}),
		);
		subscriptions.push(hub.on("time-up", (event) => cb.onTimeUp(event)));
		subscriptions.push(
			hub.on("end", (event) => {
				state.ended = true;
				state.connected = false;
				status("AI Hub • round ended");
				cb.onEnd(event);
			}),
		);
		hubInfo = await hub.connect({ mode: "shared-world", seats: [2, 2] });
		if (!hubInfo) {
			state.active = state.inHub = false;
			state.transport = "none";
			subscriptions.splice(0).forEach((off) => {
				off();
			});
			return null;
		}
		state.isHost = hubInfo.isHost;
		state.isServer = !!hubInfo.server;
		state.players = hubInfo.players.map((p) => ({ ...p }));
		state.seat = state.players.findIndex((p) => p.id === hubInfo.me);
		state.players.forEach((p) => {
			liveIds.add(p.id);
		});
		status("AI Hub • waiting for the round");
		return { ...hubInfo, seat: state.seat };
	}

	function ready() {
		if (state.inHub && !state.ended) globalThis.AIHub.ready();
	}

	// Direct connections use one reliable ordered data channel. No game server
	// sees match data. A public STUN service discovers public addresses; no TURN
	// relay is available, so restrictive networks may need AI Hub instead.
	function newPeer(host) {
		if (globalThis.AIHub?.active)
			throw new Error("AI Hub owns network connections during sessions.");
		if (!globalThis.RTCPeerConnection)
			throw new Error("This browser does not support direct online play.");
		closePeer();
		generation++;
		const token = generation;
		resultSent = false;
		Object.assign(state, {
			active: true,
			inHub: false,
			isHost: host,
			isServer: false,
			seat: host ? 0 : 1,
			players: [
				{ id: 0, name: "Mint", color: "#84e6bf" },
				{ id: 1, name: "Coral", color: "#ff805b" },
			],
			connected: false,
			started: false,
			ended: false,
			transport: "webrtc",
			sent: 0,
			received: 0,
		});
		lastInput = lastSnapshot = -Infinity;
		pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
			iceCandidatePoolSize: 0,
		});
		pc.onconnectionstatechange = () => {
			if (generation !== token || !pc) return;
			if (["failed", "closed"].includes(pc.connectionState))
				disconnect("disconnected");
			if (pc.connectionState === "disconnected")
				status("Connection interrupted • attempting to reconnect");
			if (pc.connectionState === "connected" && state.connected)
				status("Direct online • connected");
		};
		const bind = (dc) => {
			channel = dc;
			channel.onopen = () => {
				if (generation !== token) return;
				state.connected = state.started = true;
				state.ended = false;
				startedAt = performance.now();
				status("Direct online • connected");
				cb.onPeer({
					joined: true,
					seat: host ? 1 : 0,
					name: host ? "Coral" : "Mint",
				});
				cb.onStart({ ...info(), delay: 0 });
			};
			channel.onmessage = (event) => {
				if (
					generation !== token ||
					typeof event.data !== "string" ||
					event.data.length > 16000
				)
					return;
				try {
					receive(JSON.parse(event.data), host ? 1 : 0);
				} catch {
					/* Ignore malformed packets. */
				}
			};
			channel.onclose = () => {
				if (generation === token) disconnect("disconnected");
			};
			channel.onerror = () => {
				if (generation === token)
					status("Connection error • create a new invitation");
			};
		};
		if (host) bind(pc.createDataChannel("combop", { ordered: true }));
		else pc.ondatachannel = (event) => bind(event.channel);
		return pc;
	}

	async function iceComplete(peer) {
		if (peer.iceGatheringState === "complete") return;
		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				peer.removeEventListener("icegatheringstatechange", done);
				// Local candidates are usable even if a STUN response timed out.
				resolve();
			}, 6000);
			function done() {
				if (peer.signalingState === "closed") {
					clearTimeout(timeout);
					peer.removeEventListener("icegatheringstatechange", done);
					reject(
						new Error("Connection was closed. Create another invitation."),
					);
				} else if (peer.iceGatheringState === "complete") {
					clearTimeout(timeout);
					peer.removeEventListener("icegatheringstatechange", done);
					resolve();
				}
			}
			peer.addEventListener("icegatheringstatechange", done);
		});
	}

	async function encode(description) {
		const raw = new TextEncoder().encode(
			JSON.stringify({ type: description.type, sdp: description.sdp }),
		);
		let data = raw;
		let prefix = "CB1";
		if (globalThis.CompressionStream) {
			data = new Uint8Array(
				await new Response(
					new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
				).arrayBuffer(),
			);
			prefix = "CBZ1";
		}
		return (
			prefix +
			"." +
			btoa(String.fromCharCode(...data))
				.replaceAll("+", "-")
				.replaceAll("/", "_")
				.replace(/=+$/, "")
		);
	}

	async function decode(code, expected) {
		const clean = String(code).trim().replace(/\s/g, "");
		if (clean.length > 20000)
			throw new Error("That code is too long. Paste only the ComBop code.");
		const match = /^(CBZ?1)\.([A-Za-z0-9_-]+)$/.exec(clean);
		if (!match)
			throw new Error("Paste a complete ComBop invitation or return code.");
		try {
			let bytes = Uint8Array.from(
				atob(match[2].replaceAll("-", "+").replaceAll("_", "/")),
				(c) => c.charCodeAt(0),
			);
			if (match[1] === "CBZ1") {
				if (!globalThis.DecompressionStream)
					throw new Error("Compression is unavailable.");
				bytes = new Uint8Array(
					await new Response(
						new Blob([bytes])
							.stream()
							.pipeThrough(new DecompressionStream("gzip")),
					).arrayBuffer(),
				);
			}
			if (bytes.length > 40000) throw new Error("Code too large.");
			const result = JSON.parse(new TextDecoder().decode(bytes));
			if (
				result.type !== expected ||
				typeof result.sdp !== "string" ||
				!result.sdp.startsWith("v=0")
			)
				throw new Error("Unexpected code type.");
			return result;
		} catch {
			throw new Error(
				expected === "offer"
					? "That is not an invitation code. Ask the host for a new one."
					: "That is not a return code. Paste the code your opponent sent back.",
			);
		}
	}

	async function host() {
		const peer = newPeer(true);
		status("Creating invitation…");
		await peer.setLocalDescription(await peer.createOffer());
		await iceComplete(peer);
		const code = await encode(peer.localDescription);
		status("Invitation ready • send it to your opponent");
		return code;
	}

	async function join(invite) {
		const offer = await decode(invite, "offer");
		const peer = newPeer(false);
		status("Creating return code…");
		await peer.setRemoteDescription(offer);
		await peer.setLocalDescription(await peer.createAnswer());
		await iceComplete(peer);
		const code = await encode(peer.localDescription);
		status("Return code ready • send it back to the host");
		return code;
	}

	async function accept(answer) {
		if (!pc || !state.isHost || pc.signalingState !== "have-local-offer")
			throw new Error("Create an invitation first.");
		const description = await decode(answer, "answer");
		status("Connecting to your opponent…");
		await pc.setRemoteDescription(description);
		// The data channel's open event starts the match on both peers.
	}

	function sendInput(input) {
		if (state.isHost) return false;
		const now = performance.now();
		if (now - lastInput < 55) return false;
		const cleaned = cleanInput(input);
		if (!cleaned) return false;
		lastInput = now;
		return send({ type: "input", input: cleaned });
	}

	function sendSnapshot(snapshot) {
		if (!state.isHost) return false;
		const now = performance.now();
		if (now - lastSnapshot < 55) return false;
		lastSnapshot = now;
		return send({ type: "snapshot", state: snapshot });
	}

	function finish(scores, stats) {
		if (!state.isHost || state.ended || resultSent) return false;
		const values = state.players.map((_p, i) =>
			Number.isFinite(Number(scores?.[i])) ? Number(scores[i]) : 0,
		);
		if (state.inHub) {
			const players = state.players.filter((p) => liveIds.has(p.id));
			players.sort(
				(a, b) =>
					values[state.players.indexOf(b)] - values[state.players.indexOf(a)],
			);
			const standings = [];
			for (const player of players) {
				const value = values[state.players.indexOf(player)];
				const previous = standings.at(-1);
				if (
					previous &&
					values[state.players.findIndex((p) => p.id === previous[0])] === value
				)
					previous.push(player.id);
				else standings.push([player.id]);
			}
			const byId = Object.fromEntries(
				state.players
					.filter((p) => liveIds.has(p.id))
					.map((p) => [p.id, values[state.players.indexOf(p)]]),
			);
			globalThis.AIHub.finish({
				standings,
				scores: byId,
				...(stats ? { stats } : {}),
			});
		} else send({ type: "finish", scores: values }, true);
		resultSent = true;
		return true;
	}

	function closePeer() {
		generation++;
		if (channel) {
			channel.onclose = null;
			channel.onerror = null;
			channel.onmessage = null;
			channel.onopen = null;
			channel.close();
		}
		if (pc) {
			pc.onconnectionstatechange = null;
			pc.ondatachannel = null;
			pc.close();
		}
		pc = channel = null;
	}

	function leave() {
		// A hub round controls its own lifetime; an in-game Quit never leaves it.
		if (state.inHub) return false;
		const wasActive = state.active;
		if (wasActive) disconnect("left");
		closePeer();
		Object.assign(state, {
			active: false,
			connected: false,
			started: false,
			transport: "none",
		});
		status("Offline");
		return true;
	}

	const api = {
		connectHub,
		ready,
		host,
		join,
		accept,
		sendInput,
		sendSnapshot,
		finish,
		leave,
		time: () =>
			state.inHub
				? globalThis.AIHub.time()
				: state.started
					? performance.now() - startedAt
					: -Infinity,
		inspect: () => ({
			...info(),
			status: currentStatus,
			resultSent,
			peerState: pc?.connectionState || "none",
			channelState: channel?.readyState || "none",
		}),
	};
	for (const key of [
		"active",
		"inHub",
		"isHost",
		"isServer",
		"seat",
		"players",
		"connected",
		"started",
		"ended",
	])
		Object.defineProperty(api, key, { get: () => state[key] });
	return api;
}
