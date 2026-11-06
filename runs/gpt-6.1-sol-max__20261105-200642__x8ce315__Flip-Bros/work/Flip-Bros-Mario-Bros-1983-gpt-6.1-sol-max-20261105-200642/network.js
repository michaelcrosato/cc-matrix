const net = {
	kind: "none",
	host: true,
	me: 0,
	members: [],
	inputs: new Map(),
	channels: new Map(),
	started: false,
	finished: false,
	ended: false,
	clock: 0,
	peer: null,
	bc: null,
	code: "",
	token: "",
	notice: "",
	joinTimer: null,
};
function isNetworked() {
	return net.kind !== "none";
}
function isAuthority() {
	return !isNetworked() || net.host;
}
function cleanInput(a) {
	return {
		x: clamp(Number(a?.x) || 0, -1, 1),
		jump: !!a?.jump,
		dash: !!a?.dash,
		bell: !!a?.bell,
	};
}
function roomSend(data, to = null) {
	if (net.kind !== "room" || net.ended) return;
	if (net.bc) {
		net.bc.postMessage({ sender: net.token, to, data });
	}
	if (net.host) {
		for (const [token, c] of net.channels)
			if (c.peer && c.peer.open && (!to || to === token)) c.peer.send(data);
	} else if (net.connection?.open) net.connection.send(data);
}
function broadcastMembers() {
	roomSend({ t: "roster", players: net.members });
	if (screenMode === "lobby") showLobby();
}
function acceptRoom(token, peer = null) {
	if (!net.host || net.kind !== "room") return;
	let c = net.channels.get(token);
	if (!c) {
		const free = [1, 2, 3].find((id) => !net.members.some((p) => p.id === id));
		if (free === undefined) {
			if (peer?.open) peer.send({ t: "full" });
			else roomSend({ t: "full" }, token);
			return;
		}
		c = { id: free, peer };
		net.channels.set(token, c);
		net.members.push({
			id: free,
			name: ["Axle", "Rivet", "Socket", "Pip"][free],
		});
		if (net.started)
			game.addPlayer(
				free,
				["Axle", "Rivet", "Socket", "Pip"][free],
				-3 + free * 2,
			);
	}
	if (peer) c.peer = peer;
	const data = {
		t: "welcome",
		id: c.id,
		code: net.code,
		players: net.members,
		started: net.started,
	};
	if (peer?.open) peer.send(data);
	else roomSend(data, token);
	broadcastMembers();
	if (net.started) roomSend(game.snapshot(), token);
}
function receiveRoom(data, fromToken = null) {
	if (net.kind !== "room" || net.ended || !data || typeof data !== "object")
		return;
	if (net.host) {
		if (data.t === "hello") acceptRoom(fromToken);
		if (data.t === "input") {
			const c = net.channels.get(fromToken);
			if (c)
				net.inputs.set(c.id, {
					input: cleanInput(data.input),
					time: performance.now(),
				});
		}
		if (data.t === "leave") dropRoomPlayer(fromToken);
		return;
	}
	switch (data.t) {
		case "welcome":
			clearTimeout(net.joinTimer);
			net.me = data.id;
			net.members = data.players;
			net.notice = "Connected. Waiting for the host.";
			if (data.started) {
				net.started = true;
				paused = false;
				hideScreen();
			} else showLobby();
			break;
		case "roster":
			net.members = data.players;
			if (screenMode === "lobby") showLobby();
			break;
		case "begin":
			net.started = true;
			net.finished = false;
			net.members = data.players;
			paused = false;
			game.reset(net.members);
			hideScreen();
			notify("CREW CONNECTED · Clocking in!", 2);
			break;
		case "world":
			if (!net.started) break;
			game.receive(data);
			if (["won", "lost"].includes(game.status) && screenMode !== "result")
				showResult(game.status === "won");
			break;
		case "full":
			clearTimeout(net.joinTimer);
			closeNetwork();
			showOnline();
			$("network-status").textContent = "That room is full. Try another crew.";
			break;
		case "closed":
			closeNetwork();
			showOnline();
			$("network-status").textContent = "The host closed the room.";
			break;
	}
}
function dropRoomPlayer(token) {
	const c = net.channels.get(token);
	if (!c) return;
	net.members = net.members.filter((p) => p.id !== c.id);
	net.inputs.delete(c.id);
	game.removePlayer(c.id);
	net.channels.delete(token);
	broadcastMembers();
	notify("A crew member clocked out.");
}
async function loadPeer() {
	if (window.Peer) return window.Peer;
	if (window.__peerLoading) return window.__peerLoading;
	window.__peerLoading = new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
		s.onload = () => resolve(window.Peer);
		s.onerror = () => {
			window.__peerLoading = null;
			reject(new Error("Peer networking library could not load."));
		};
		document.head.appendChild(s);
	});
	return window.__peerLoading;
}
function randomCode() {
	const a = new Uint8Array(6);
	crypto.getRandomValues(a);
	return [...a].map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ"[n % 24]).join("");
}
function channelFor(code) {
	try {
		net.bc = new BroadcastChannel("flipbros-v1-" + code);
		net.bc.onmessage = (e) => {
			if (e.data.sender === net.token || (e.data.to && e.data.to !== net.token))
				return;
			receiveRoom(e.data.data, e.data.sender);
		};
	} catch {
		net.bc = null;
	}
}
async function hostRoom() {
	closeNetwork();
	Object.assign(net, {
		kind: "room",
		host: true,
		me: 0,
		code: randomCode(),
		token: crypto.randomUUID(),
		members: [{ id: 0, name: "Axle" }],
		notice: "Opening the internet connection…",
		started: false,
		finished: false,
		ended: false,
	});
	channelFor(net.code);
	showLobby();
	const code = net.code;
	try {
		const Peer = await loadPeer();
		if (net.kind !== "room" || net.code !== code) return;
		const peer = (net.peer = new Peer("flipbros-v1-" + code, { debug: 0 }));
		peer.on("open", () => {
			if (net.peer !== peer) return;
			net.notice = "Room is online. Share the code with your crew.";
			if (screenMode === "lobby") showLobby();
		});
		peer.on("connection", (c) => {
			const token = c.peer;
			c.on("open", () => acceptRoom(token, c));
			c.on("data", (data) => receiveRoom(data, token));
			c.on("close", () => dropRoomPlayer(token));
			c.on("error", () => dropRoomPlayer(token));
		});
		peer.on("error", (e) => {
			net.notice =
				"Internet connection unavailable (" +
				e.type +
				"). Nearby tabs can still join.";
			if (screenMode === "lobby") showLobby();
		});
	} catch (e) {
		net.notice = e.message + " Nearby tabs can still join.";
		if (screenMode === "lobby") showLobby();
	}
}
async function joinRoom(raw) {
	const code = raw.toUpperCase().replace(/[^A-Z]/g, "");
	if (code.length !== 6) {
		$("network-status").textContent =
			"Enter the six-letter code from your host.";
		return;
	}
	closeNetwork();
	Object.assign(net, {
		kind: "room",
		host: false,
		me: -1,
		code,
		token: crypto.randomUUID(),
		members: [],
		notice: "Finding your crew…",
		started: false,
		finished: false,
		ended: false,
	});
	channelFor(code);
	$("network-status").textContent = "Finding room " + code + "…";
	roomSend({ t: "hello" });
	net.joinTimer = setTimeout(() => {
		if (net.kind === "room" && net.me < 0) {
			closeNetwork();
			showOnline();
			$("network-status").textContent =
				"Could not reach that room. Check the code and keep the host’s page open.";
		}
	}, 14000);
	setTimeout(async () => {
		if (net.kind !== "room" || net.code !== code || net.me >= 0) return;
		try {
			const Peer = await loadPeer();
			if (net.kind !== "room" || net.code !== code || net.me >= 0) return;
			const peer = (net.peer = new Peer(undefined, { debug: 0 }));
			peer.on("open", () => {
				if (net.kind !== "room" || net.me >= 0) return;
				const c = (net.connection = peer.connect("flipbros-v1-" + code, {
					reliable: true,
					serialization: "json",
				}));
				c.on("open", () => c.send({ t: "hello" }));
				c.on("data", (d) => receiveRoom(d));
				c.on("close", () => {
					if (net.kind === "room") {
						closeNetwork();
						showOnline();
						$("network-status").textContent =
							"The connection to the host closed.";
					}
				});
				c.on("error", () => {
					if ($("network-status"))
						$("network-status").textContent =
							"Connection interrupted. Check the code or try again.";
				});
			});
			peer.on("error", (e) => {
				if ($("network-status"))
					$("network-status").textContent =
						"Could not reach the host (" + e.type + "). Check the room code.";
			});
		} catch (e) {
			if ($("network-status")) $("network-status").textContent = e.message;
		}
	}, 450);
}
function startRoom() {
	if (net.kind !== "room" || !net.host) return;
	net.started = true;
	net.finished = false;
	paused = false;
	roomSend({ t: "begin", players: net.members });
	game.reset(net.members);
	hideScreen();
	notify("CREW CONNECTED · Clocking in!", 2.5);
}
function closeNetwork() {
	if (net.kind === "hub") return;
	if (net.kind === "room") {
		roomSend({ t: net.host ? "closed" : "leave" });
		net.bc?.close();
		net.peer?.destroy();
	}
	clearTimeout(net.joinTimer);
	net.inputs.clear();
	net.channels.clear();
	Object.assign(net, {
		kind: "none",
		host: true,
		me: 0,
		members: [],
		started: false,
		finished: false,
		ended: false,
		peer: null,
		bc: null,
		connection: null,
		code: "",
		clock: 0,
	});
}
function finishOnline(won) {
	if (!isNetworked() || net.finished || net.ended || !net.host) return;
	net.finished = true;
	if (net.kind === "hub") {
		const ids = net.members.map((p) => p.id);
		const scores = {},
			stats = {};
		for (const id of ids) {
			const p = game.players.find((p) => p.id === id);
			scores[id] = p?.points || 0;
			stats[id] = {
				"Crew score": game.score,
				"Pests kicked": game.metrics.kicks,
				"Best combo": game.bestCombo,
				Coins: game.metrics.coins,
			};
		}
		AIHub.finish({ standings: [ids], scores, won, stats });
	} else roomSend(game.snapshot());
}
async function setupHub() {
	if (!AIHub.active) return false;
	const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
	if (!info) return false;
	Object.assign(net, {
		kind: "hub",
		host: info.isHost,
		me: info.server ? -1 : info.me,
		members: info.players.map((p) => ({ id: p.id, name: p.name })),
		started: false,
		finished: false,
		ended: false,
		clock: 0,
	});
	paused = false;
	game.reset(net.members);
	game.status = "waiting";
	hideScreen();
	$("hint").textContent = "Crew ready. Waiting for the hub’s starting bell…";
	AIHub.on("start", () => {
		net.startReceived = true;
	});
	AIHub.on("message", (d, from) => {
		if (net.ended || !d || typeof d !== "object") return;
		if (net.host && d.t === "input" && net.members.some((p) => p.id === from))
			net.inputs.set(from, {
				input: cleanInput(d.input),
				time: performance.now(),
			});
		else if (!net.host && from === AIHub.host && d.t === "world") {
			game.receive(d);
		}
	});
	AIHub.on("time-up", () => {
		if (net.host) finishOnline(game.status === "won");
	});
	AIHub.on("leave", ({ id }) => {
		net.members = net.members.filter((p) => p.id !== id);
		game.removePlayer(id);
		net.inputs.delete(id);
	});
	AIHub.on("end", () => {
		net.ended = true;
		paused = true;
		game.status = "ended";
		audio.stop();
		$("toast").classList.add("hidden");
		$("screen").classList.add("hidden");
		screenMode = "hub-ended";
	});
	await renderer.renderAsync(scene, camera);
	AIHub.ready();
	return true;
}
function networkTick(dt, local) {
	if (!isNetworked() || net.ended) return;
	if (
		net.kind === "hub" &&
		!net.started &&
		net.startReceived &&
		AIHub.time() >= 0
	) {
		net.started = true;
		game.status = "playing";
		notify("CREW READY · GO!", 1.5);
	}
	if (!net.started) return;
	net.clock += dt;
	if (net.clock < 1 / 14) return;
	net.clock = 0;
	if (net.host) {
		const s = game.snapshot();
		if (net.kind === "hub") AIHub.send(s);
		else roomSend(s);
	} else {
		const d = {
			t: "input",
			input: cleanInput(screenMode === "playing" ? local : EMPTY_INPUT()),
		};
		if (net.kind === "hub") AIHub.send(d, { to: AIHub.host, reliable: false });
		else roomSend(d);
	}
}
function onlineInputs(local) {
	const out = {};
	if (!isNetworked()) return out;
	if (net.me >= 0)
		out[net.me] = screenMode === "playing" ? local : EMPTY_INPUT();
	for (const [id, r] of net.inputs)
		out[id] = performance.now() - r.time < 650 ? r.input : EMPTY_INPUT();
	return out;
}
addEventListener("beforeunload", () => {
	if (net.kind === "room") {
		roomSend({ t: net.host ? "closed" : "leave" });
		net.bc?.close();
		net.peer?.destroy();
	}
});
