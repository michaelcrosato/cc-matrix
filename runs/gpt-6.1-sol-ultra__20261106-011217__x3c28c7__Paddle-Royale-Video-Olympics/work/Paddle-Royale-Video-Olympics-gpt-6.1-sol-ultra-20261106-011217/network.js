/** Paddle Royale: AI Hub shared-world adapter and standalone peer rooms. */
export function createNetwork(callbacks = {}) {
	const cb = Object.assign(
		{
			onRole() {},
			onInput() {},
			onSnapshot() {},
			onStatus() {},
			onStart() {},
			onEnd() {},
			onTimeUp() {},
			onLeave() {},
		},
		callbacks,
	);
	const uniqueId = () =>
		Array.from(crypto.getRandomValues(new Uint8Array(8)), (v) =>
			v.toString(16).padStart(2, "0"),
		).join("");
	const tabId = uniqueId();
	let state = {
		active: false,
		mode: "offline",
		role: "host",
		isHost: true,
		me: 0,
		localSeat: 0,
		server: false,
		players: [],
		code: "",
		connected: false,
		transport: "none",
	};
	let channel = null,
		peer = null,
		connection = null,
		remoteId = null,
		remoteTab = null,
		heartbeat = null,
		joinTimer = null,
		peerTimer = null,
		joinDeadline = null,
		lastSeen = 0,
		generation = 0,
		hubFinished = false,
		hubEnded = false,
		lastScores = [0, 0],
		lastInput = 0,
		lastSnapshot = 0;
	const publish = () => cb.onRole({ ...state });
	const status = (text) => cb.onStatus(text, { ...state });
	const peerId = (code) => "paddle-royale-v1-" + code.toLowerCase();
	const clearTimers = () => {
		clearInterval(heartbeat);
		clearInterval(joinTimer);
		clearTimeout(peerTimer);
		clearTimeout(joinDeadline);
		heartbeat = joinTimer = peerTimer = joinDeadline = null;
	};
	const cleanStandalone = () => {
		generation++;
		clearTimers();
		if (channel) {
			channel.close();
			channel = null;
		}
		if (connection) {
			connection.close();
			connection = null;
		}
		if (peer) {
			peer.destroy();
			peer = null;
		}
		remoteId = remoteTab = null;
	};
	const notifyLeft = () => {
		if (!state.connected) return;
		state.connected = false;
		remoteId = remoteTab = null;
		publish();
		status(
			state.isHost
				? "Guest disconnected. Room remains open."
				: "Host disconnected. Return to the lobby to reconnect.",
		);
		cb.onLeave(state.isHost ? 1 : 0);
	};
	const deliver = (kind, data) => {
		lastSeen = performance.now();
		if (kind === "input" && state.isHost) cb.onInput(data, 1);
		else if (kind === "snapshot" && !state.isHost) cb.onSnapshot(data);
		else if (kind === "start" && !state.isHost)
			cb.onStart(data, { hub: false, countdownMs: 0 });
		else if (kind === "leave") notifyLeft();
	};
	const send = (kind, data) => {
		if (!state.connected) return false;
		if (state.transport === "local" && channel) {
			channel.postMessage({ kind, from: tabId, target: remoteTab, data });
			return true;
		}
		if (connection?.open) {
			connection.send({ kind, data });
			return true;
		}
		return false;
	};
	const connected = (transport) => {
		if (state.connected) return;
		state.connected = true;
		state.transport = transport;
		lastSeen = performance.now();
		clearInterval(joinTimer);
		clearTimeout(joinDeadline);
		publish();
		status(
			state.isHost
				? "Guest connected. Ready for a friendly rivalry."
				: "Connected. Host chooses when to play.",
		);
	};
	function openChannel(code) {
		if (!("BroadcastChannel" in window)) return;
		channel = new BroadcastChannel("paddle-royale-room-" + code);
		channel.onmessage = (event) => {
			const packet = event.data;
			if (
				!packet ||
				packet.from === tabId ||
				(packet.target && packet.target !== tabId)
			)
				return;
			if (packet.kind === "join" && state.isHost) {
				if (state.connected && packet.from !== remoteTab) {
					channel.postMessage({
						kind: "full",
						from: tabId,
						target: packet.from,
					});
					return;
				}
				remoteTab = packet.from;
				connected("local");
				channel.postMessage({ kind: "joined", from: tabId, target: remoteTab });
			} else if (
				packet.kind === "joined" &&
				!state.isHost &&
				(!state.connected || state.transport === "local")
			) {
				remoteTab = packet.from;
				connected("local");
				if (connection) {
					connection.close();
					connection = null;
				}
				if (peer) {
					peer.destroy();
					peer = null;
				}
			} else if (packet.kind === "full" && !state.isHost) {
				status("This room already has two players.");
			} else if (
				state.connected &&
				state.transport === "local" &&
				packet.from === remoteTab
			)
				deliver(packet.kind, packet.data);
		};
		heartbeat = setInterval(() => {
			if (state.connected) {
				send("ping", null);
				if (performance.now() - lastSeen > 8500) notifyLeft();
			}
		}, 1500);
	}
	let loadingPeer = null;
	const loadPeer = () => {
		if (window.Peer) return Promise.resolve(window.Peer);
		if (loadingPeer) return loadingPeer;
		loadingPeer = new Promise((resolve, reject) => {
			const tag = document.createElement("script");
			tag.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
			tag.crossOrigin = "anonymous";
			tag.onload = () =>
				window.Peer
					? resolve(window.Peer)
					: reject(new Error("Peer library did not initialize"));
			tag.onerror = () =>
				reject(new Error("The internet room service could not be reached"));
			document.head.appendChild(tag);
		}).catch((error) => {
			loadingPeer = null;
			throw error;
		});
		return loadingPeer;
	};
	const configureConnection = (conn, token) => {
		conn.on("open", () => {
			if (
				token !== generation ||
				(state.connected && state.transport === "local")
			) {
				conn.close();
				return;
			}
			if (state.connected && connection !== conn) {
				conn.send({ kind: "full" });
				conn.close();
				return;
			}
			connection = conn;
			remoteId = conn.peer;
			connected("internet");
		});
		conn.on("data", (packet) => {
			if (token !== generation || !packet || state.transport === "local")
				return;
			if (packet.kind === "full") {
				status("This room already has two players.");
				return;
			}
			deliver(packet.kind, packet.data);
		});
		conn.on("close", () => {
			if (
				token === generation &&
				state.transport === "internet" &&
				connection === conn
			) {
				connection = null;
				notifyLeft();
			}
		});
		conn.on("error", () => {
			if (token === generation && !state.connected)
				status("Connection could not be made. Try the room code again.");
		});
	};
	const openPeer = async (hosting, token) => {
		try {
			const Peer = await loadPeer();
			if (
				token !== generation ||
				(state.connected && state.transport === "local")
			)
				return;
			peer = new Peer(hosting ? peerId(state.code) : undefined, { debug: 0 });
			peer.on("open", () => {
				if (token !== generation) return;
				if (hosting)
					status(
						state.connected
							? "Guest connected. Ready for a friendly rivalry."
							: "Room " + state.code + " is open. Share its code.",
					);
				else if (!state.connected) {
					const conn = peer.connect(peerId(state.code), {
						reliable: true,
						serialization: "json",
					});
					configureConnection(conn, token);
				}
			});
			peer.on("connection", (conn) => configureConnection(conn, token));
			peer.on("error", (error) => {
				if (token !== generation) return;
				if (state.connected && state.transport === "local") return;
				if (error.type === "peer-unavailable")
					status(
						"Room not found. Check its code and that the host is still here.",
					);
				else if (error.type === "unavailable-id")
					status("That code is busy. Create another room.");
				else
					status(
						hosting
							? "Internet rooms unavailable. This code still works between tabs on this device."
							: "Internet connection unavailable. Check the code or try again.",
					);
			});
		} catch (error) {
			if (token === generation && !state.connected)
				status(error.message + ". Same-device rooms still work.");
		}
	};
	const roomCode = () => {
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		const bytes = crypto.getRandomValues(new Uint8Array(6));
		return Array.from(bytes, (v) => alphabet[v % alphabet.length]).join("");
	};
	const api = {
		get info() {
			return { ...state };
		},
		async connectHub() {
			if (!window.AIHub?.active) return null;
			const hub = await AIHub.connect({ mode: "shared-world", seats: [2, 2] });
			if (!hub) return null;
			state = {
				active: true,
				mode: "hub",
				role: hub.isHost ? "host" : "guest",
				isHost: hub.isHost,
				me: hub.me,
				localSeat: hub.server
					? null
					: hub.players.findIndex((p) => p.id === hub.me),
				server: !!hub.server,
				players: hub.players,
				code: "",
				connected: true,
				transport: "hub",
			};
			hubFinished = hubEnded = false;
			publish();
			status("Waiting for the AI Hub round.");
			AIHub.on("start", (event) => {
				if (hubEnded) return;
				cb.onStart(
					{ mode: "versus", court: 0 },
					{ hub: true, countdownMs: Number(event?.in) || 3000 },
				);
			});
			AIHub.on("message", (packet, from) => {
				if (hubEnded || !packet || typeof packet !== "object") return;
				if (state.isHost && packet.kind === "input") {
					const seat = state.players.findIndex((p) => p.id === from);
					if (seat >= 0) cb.onInput(packet.data, seat);
				} else if (
					!state.isHost &&
					from === AIHub.host &&
					packet.kind === "snapshot"
				)
					cb.onSnapshot(packet.data);
			});
			AIHub.on("leave", (event) => {
				const seat = state.players.findIndex((p) => p.id === event.id);
				if (seat >= 0) cb.onLeave(seat);
			});
			AIHub.on("time-up", () => {
				if (hubEnded) return;
				cb.onTimeUp();
				if (state.isHost && !hubFinished) api.finish(lastScores);
			});
			AIHub.on("end", (event) => {
				hubEnded = true;
				cb.onEnd(event?.reason || "finished");
				status("AI Hub round complete.");
			});
			return { ...state };
		},
		ready() {
			if (state.mode === "hub") AIHub.ready();
		},
		host() {
			if (window.AIHub?.active) return "";
			cleanStandalone();
			state = {
				active: true,
				mode: "standalone",
				role: "host",
				isHost: true,
				me: 0,
				localSeat: 0,
				server: false,
				players: [
					{ id: 0, name: "CORAL" },
					{ id: 1, name: "MINT" },
				],
				code: roomCode(),
				connected: false,
				transport: "none",
			};
			openChannel(state.code);
			publish();
			status("Room " + state.code + " created. Opening internet connection…");
			openPeer(true, generation);
			return state.code;
		},
		join(code) {
			if (window.AIHub?.active) return false;
			code = String(code || "")
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "");
			if (code.length !== 6) {
				status("Room codes have six letters and numbers.");
				return false;
			}
			cleanStandalone();
			state = {
				active: true,
				mode: "standalone",
				role: "guest",
				isHost: false,
				me: 1,
				localSeat: 1,
				server: false,
				players: [
					{ id: 0, name: "CORAL" },
					{ id: 1, name: "MINT" },
				],
				code,
				connected: false,
				transport: "none",
			};
			openChannel(code);
			publish();
			status("Looking for room " + code + "…");
			const knock = () => channel?.postMessage({ kind: "join", from: tabId });
			knock();
			joinTimer = setInterval(knock, 250);
			const token = generation;
			peerTimer = setTimeout(() => openPeer(false, token), 650);
			joinDeadline = setTimeout(() => {
				if (token === generation && !state.connected)
					status("Could not connect. Check the room code and try again.");
				clearInterval(joinTimer);
			}, 22000);
			return true;
		},
		start(config) {
			if (state.mode === "hub" || !state.isHost || !state.connected)
				return false;
			send("start", config);
			cb.onStart(config, { hub: false, countdownMs: 0 });
			return true;
		},
		sendInput(input) {
			if (hubEnded) return false;
			if (state.mode === "hub") {
				if (state.isHost || state.localSeat === null) return false;
				const now = performance.now();
				if (now - lastInput < 65) return false;
				lastInput = now;
				return AIHub.send(
					{ kind: "input", data: input },
					{ to: AIHub.host, reliable: false },
				);
			}
			return send("input", input);
		},
		sendSnapshot(snapshot) {
			if (hubEnded || !state.isHost) return false;
			if (snapshot?.scores) lastScores = snapshot.scores;
			if (state.mode === "hub") {
				const now = performance.now();
				if (now - lastSnapshot < 65) return false;
				lastSnapshot = now;
				return AIHub.send(
					{ kind: "snapshot", data: snapshot },
					{ reliable: false },
				);
			}
			return send("snapshot", snapshot);
		},
		finish(scores = [0, 0]) {
			if (state.mode !== "hub" || !state.isHost || hubFinished || hubEnded)
				return false;
			const entries = state.players
				.map((p, i) => ({ id: p.id, score: Number(scores[i]) || 0 }))
				.sort((a, b) => b.score - a.score);
			const standings = [];
			for (const entry of entries) {
				const prev = standings.at(-1);
				if (prev && entries.find((v) => v.id === prev[0]).score === entry.score)
					prev.push(entry.id);
				else standings.push([entry.id]);
			}
			hubFinished = true;
			AIHub.finish({
				standings,
				scores: Object.fromEntries(entries.map((e) => [e.id, e.score])),
			});
			return true;
		},
		disconnect() {
			if (state.mode === "hub") return false;
			send("leave", null);
			cleanStandalone();
			state = {
				active: false,
				mode: "offline",
				role: "host",
				isHost: true,
				me: 0,
				localSeat: 0,
				server: false,
				players: [],
				code: "",
				connected: false,
				transport: "none",
			};
			publish();
			return true;
		},
	};
	window.addEventListener("pagehide", () => {
		if (state.mode === "standalone") {
			send("leave", null);
			cleanStandalone();
		}
	});
	return api;
}
